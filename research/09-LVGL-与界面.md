# 09 · LVGL 与界面

## 本文讲什么

Canopus 管理器的 UI 有一个可复现的缺陷：**点击时界面会错乱、重叠**。本文给出根因、四个具体缺陷、以及每个缺陷的修法。同时也解释为什么另一个框架 Chaos 没有同样的问题。

**结论**：不是一个 bug，是四个。其中两个是主因——

- **缺陷一**：在按钮自己的事件回调里销毁 msgbox 对象 → `use-after-free`
- **缺陷二**：就地复用控件而不是重建 → `align_to` 读到脏几何 + 提前返回导致"隐藏循环"被跳过 → 半渲染

另外两个是放大器：分派不看页面、查找不看唯一性。

## 背景：管理器 UI 的结构

文件：`manager/target/lvgl_v9/canopus_manager_target_lvgl_v9.c`（1451 行，另有 `lvgl_v8` 版 1174 行，逻辑同构）

### 容量常量

```c
#define CANOPUS_TARGET_UI_MAX_ROWS     25u
#define CANOPUS_TARGET_UI_MAX_LABELS    6u
#define CANOPUS_TARGET_UI_MAX_IMAGES    2u
#define CANOPUS_TARGET_UI_MAX_PROGRESS  4u
```

### 页面模型

```c
struct canopus_target_page_context {
    int active;         // 页面在栈上
    int interactive;    // 可接受输入
    struct canopus_target_ui_backend backend;
};
static struct canopus_target_page_context manager_pages[CANOPUS_TARGET_PAGE_COUNT];
```

`backend` 里按槽位存控件句柄和绑定：

```c
rows[25]        labels[6]        images[2]        progress[4]
row_kinds[25]   bindings[25]     // binding: { event_id, generation, key }
```

注意 `bindings[row_index].generation`——设计者本来就有"代"的概念，用来判断绑定是否已经过期。

### 页面生命周期

| 回调 | 行号 | 行为 |
|---|---:|---|
| `on_create` | 1199 | 置 `active` / `interactive` |
| `on_resume` | 1275 | 恢复 |
| `on_pause` | 1292 | 清 `interactive` |
| `on_destroy` | 1305 | 清 `active`，`memset` 整个 backend |

**关键点**：`active` 和 `interactive` 是两个独立标志。`on_pause` 只清 `interactive`——所以**可以有多个页面同时 `active`**（管理器里还有一个 `manager_active_pages` 计数器，印证了这一点）。

## 缺陷一：在自己的回调里销毁自己

### 代码

```c
// 601
static void target_dialog_dismiss(struct canopus_target_ui_backend *backend)
{
    typedef void (*delete_fn)(void *);
    delete_fn delete_object = (delete_fn)(uintptr_t)FW_LVX_OBJECT_DELETE;
    void *box;
    if (backend == NULL || !backend->dialog.active) return;
    box = backend->dialog.native_box;
    backend->dialog.active = 0u;
    backend->dialog.native_box = NULL;
    if (box != NULL) delete_object(box);     // ← 摧毁整个 msgbox
}

// 613
static void target_dialog_event(void *event)
{
    ...
    /* The callback stores the page index in the binding key's high byte and
     * the semantic key in its low 24 bits. */
```

`target_dialog_event` 是 msgbox 上按钮的事件回调。用户点"确定"时，回调里调用 `target_dialog_dismiss`，而 `dismiss` 直接对这个 msgbox 调 `FW_LVX_OBJECT_DELETE`。

### 为什么错

LVGL 的事件派发是**遍历式**的：

```
lv_event_send(msgbox, LV_EVENT_CLICKED)
  → 遍历 msgbox 的事件链表
    → 找到按钮的回调
      → 调用 target_dialog_event
        → delete_object(msgbox)      ← 把正在遍历的对象删了
      → 回调返回
    → 继续访问链表里的下一个节点      ← 悬空指针
```

后果取决于被释放的内存有没有被复用：

| 内存状态 | 表现 |
|---|---|
| 还没被复用 | 看起来正常 |
| 已被复用 | 花屏、内容错位、控件叠在一起 |
| 结构被改 | 死机 |

**这就是"有时候"错乱的原因**——取决于内存分配的时机。

### 修法

不在回调里删，改成延迟删除：

```c
// 回调里只置标记
backend->dialog.dismiss_pending = 1u;

// 在渲染定时器 / 下一次 apply 的开头统一处理
static void target_dialog_reap(struct canopus_target_ui_backend *backend)
{
    if (!backend->dialog.dismiss_pending) return;
    backend->dialog.dismiss_pending = 0u;
    target_dialog_dismiss(backend);     // 此时不在事件上下文中
}
```

Chaos 的做法正是这一条（`ui.rs:108` 的 `render_req`）。

## 缺陷二：就地复用 + 提前返回

### 代码

`target_ui_apply`（695–1056）是一段**增量协调**（reconciliation）逻辑：页面数据变了，它不重建控件，而是尽量复用已有的行、标签、图片，只改内容。

末尾 1036–1052 有一段"隐藏多余控件"的循环——把这次没用到的槽位设成隐藏：

```c
for (i = row_count; i < CANOPUS_TARGET_UI_MAX_ROWS; i++) {
    if (backend->rows[i] != NULL) hide(backend->rows[i]);
}
```

**问题在于：这段代码之前有五个提前返回**——913、940、990、997、1004。任何一条命中，函数直接 `return -1` 或 `return 0`，后面的隐藏循环根本没跑。

| 提前返回位置 | 触发的典型情况 |
|---|---|
| 913 | 数据源不可用 |
| 940 | 页面状态不匹配 |
| 990 | 行数超上限 |
| 997 | 控件创建失败 |
| 1004 | 布局失败 |

### 为什么错

两个独立的坏结果：

**（1）脏几何。** 复用旧控件时，`align_to` 读到的是**上一轮的坐标和尺寸**。新内容的宽度还没算出来，对齐就基于旧值——于是错位、重叠。这正是 Chaos 注释里那句"错位/空白/重叠的根源"。

**（2）半渲染。** 提前返回跳过了隐藏循环，上一帧可见、这一帧该隐藏的行仍然显示。视觉上就是"新旧内容叠在一起"。

而且 1019 行还有一处细节：

```c
update_row(object, NULL, primary, secondary, 0, selected);
```

第二个参数是 `NULL`——**尾随控件（trailing）在创建时就固定了，后续更新不改它**。如果一行的 `kind` 从"有开关"变成"无开关"（或反过来），尾随部分不会跟着变，直接造成视觉重叠。

### 修法

两个选择：

**方案 A（保守）**：所有提前返回之前，先跑一遍完整的隐藏循环。

```c
#define APPLY_EARLY_RETURN(rc) do { \
    target_hide_unused(backend);    \
    return (rc);                    \
} while (0)
```

**方案 B（彻底）**：放弃增量复用，改成"全删 + 重建"，让每个控件都走首次建页的路径。

方案 B 是 Chaos 的选择（`ui.rs:220` 的 `render_page`），代价是性能，收益是彻底消除脏几何。对 25 行的列表，重建开销可以接受。

## 缺陷三：分派不看页面

### 代码

```c
// 463
static void target_dispatch_row(uint32_t row_index, void *event)
{
    ...
    code = get_code(event);
    for (page_index = 0; page_index < CANOPUS_TARGET_PAGE_COUNT; page_index++) {
        struct canopus_target_page_context *context = &manager_pages[page_index];
        ...
        if (!context->active || !context->interactive ||
            context->backend.rows[row_index] == NULL) {
            continue;
        }
        if (context->backend.row_kinds[row_index] == CANOPUS_TARGET_ROW_SWITCH) {
            if (code != CANOPUS_TARGET_EVENT_VALUE_CHANGED) {
                return;              // ← 注意是 return，不是 continue
            }
        } else if (code != CANOPUS_TARGET_EVENT_CLICKED) {
            return;                  // ← 同上
        }
        ...
    }
}
```

而回调本身是宏生成的（513–543），**只带槽位编号，不带页面编号**：

```c
#define ROW_EVENT(n) \
    static void target_row_event_##n(void *event) { target_dispatch_row(n, event); }
```

`user_data` 在 `add_event` 时传的是 `NULL`（1012 行）。

### 为什么错

1. **多页可同时 active**（见上文）。`rows[3]` 在两个页面里都可能是非空，循环会**依次命中所有页面**，把同一个点击当成多个页面的事件处理。
2. **`return` 而不是 `continue`**：第一个命中的页面如果事件码不匹配，直接退出整个函数——导致本该处理的页面被跳过。
3. **没有"当前前台页"的概念**：`interactive` 只区分"能不能输入"，不区分"是不是最上面那层"。

### 修法

```c
// 1. 加一个前台页游标，on_resume 时更新
static uint32_t manager_fg_page = 0xFFFFFFFFu;

// 2. 分派时先按它过滤
if (page_index != manager_fg_page) continue;

// 3. return 改成 continue，让循环能把所有页面都试一遍
if (code != CANOPUS_TARGET_EVENT_CLICKED) continue;

// 4. 用 generation 做二次校验，防止过期绑定
if (binding->generation != context->backend.current_generation) continue;
```

`binding->generation` 字段本来就存在（1012 行附近赋值），只是没被用来做这个校验。

Chaos 的对应做法见 [08 篇](08-Chaos.md#四用-fg_page-做前台页判定)：维护 `FG_PAGE`，分派时用它。

## 缺陷四：查找不唯一

```c
// 559
static int target_find_row(struct canopus_target_ui_backend *backend, ...)
```

`target_find_row` **只按 `kind` 匹配**。如果一页里有两行同为 `CANOPUS_TARGET_ROW_SWITCH`，查找返回第一个——更新数据时就会把第二行的内容写到第一行上。

### 修法

用 `bindings[i].key`（语义 key）代替 `kind` 做匹配，或者要求调用方传入槽位号。

## 四个缺陷的关系

```
缺陷一（回调内销毁）──→ 直接的 use-after-free，偶发花屏/死机
缺陷二（增量复用）  ──→ 脏几何 + 半渲染，稳定的错位/重叠
缺陷三（分派不看页）──→ 把 A 页的点击当成 B 页的，触发错误的 apply
缺陷四（查找不唯一）──→ 数据写错行，内容与控件错配
```

缺陷三、四本身不一定立刻可见，但它们会让缺陷一、二**被更频繁地触发**——错的页面收到不该有的更新，从而走更多次 apply、更多次提前返回。

## 最小补丁清单

按性价比排序：

| 优先级 | 改动 | 行数 | 风险 |
|---|---|---:|---|
| 🔴 P0 | 对话框改成延迟删除 | ~15 | 低 |
| 🔴 P0 | `return` 改 `continue` | 2 | 极低 |
| 🟡 P1 | 提前返回前补隐藏循环 | ~10 | 低 |
| 🟡 P1 | 加前台页游标过滤 | ~10 | 低 |
| 🟢 P2 | 查找改用 key | ~15 | 中 |
| 🟢 P2 | apply 改全删重建 | ~100 | 中高（性能） |

P0 两条加起来不到 20 行，就能消掉绝大多数"点击错乱"。

## 验证方法

| 场景 | 预期（修复前） | 预期（修复后） |
|---|---|---|
| 连续快速点击模块行 | 偶发内容重叠 | 正常 |
| 弹出确认框后点确定 | 偶发花屏 | 正常 |
| 在详情页点击后按返回 | 列表残留旧内容 | 正常 |
| 页面栈两层时点击 | 上层页面响应，下层也可能响应 | 只有上层响应 |

复现要点：**快速点击**和**弹窗操作**最容易触发。慢速、单次点击往往看不出来——因为内存还没来得及被复用。

## 为什么 Chaos 没这个问题

| Canopus 的做法 | Chaos 的做法 | 差异 |
|---|---|---|
| 回调里 `delete_object(box)` | 置标记，交给 `lv_timer` 删 | 避开 UAF |
| 增量复用控件 | 全删 + 重建 | 避开脏几何 |
| 槽位按需清理 | 每次清满整个数组 | 避开悬空句柄 |
| 遍历所有 active 页 | 按 `FG_PAGE` 过滤 | 避开跨页误触发 |

四条一一对应，正好就是 [08 篇](08-Chaos.md#四个结构性设计)里的四个设计。**这不是巧合**——Chaos 的作者显然踩过同一批坑，并在注释里写下了原因。

## 未决问题

| 问题 | 状态 |
|---|---|
| 缺陷一是否真的能在真机复现 | ⚠️ 代码层面确凿，未做真机崩溃捕获 |
| 多页同时 `active` 的实际场景 | ⚠️ 由 `manager_active_pages` 计数器推断 |
| `lvgl_v8` 版是否有同样缺陷 | ⚠️ 逻辑同构，未逐行核对 |
| 改成全删重建后的性能 | ❓ 未测（25 行列表应该无感） |
