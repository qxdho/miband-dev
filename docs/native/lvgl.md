---
title: LVGL 与界面
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/09-LVGL-与界面.md"
contributors: [miband-dev]
---

# LVGL 与界面

<StatusBadge status="sourced" verified="2026-10-25" />

Canopus 管理器的界面在快速点击时会错乱与重叠，成因是四个独立缺陷叠加，并非单一 bug。两个主因分别是在按钮自身的事件回调里销毁 msgbox，以及就地复用控件并留下五处提前返回；另外两个缺陷放大了触发频率，即分派不区分页面、查找不保证唯一。

## 界面结构

管理器界面由固定槽位的 backend 与页面栈组成，控件复用而不重建。

代码位于 `manager/target/lvgl_v9/canopus_manager_target_lvgl_v9.c`，1451 行；另有 `lvgl_v8` 版 1174 行，逻辑同构。

容量按槽位写死：

```c
#define CANOPUS_TARGET_UI_MAX_ROWS     25u
#define CANOPUS_TARGET_UI_MAX_LABELS    6u
#define CANOPUS_TARGET_UI_MAX_IMAGES    2u
#define CANOPUS_TARGET_UI_MAX_PROGRESS  4u
```

页面上下文：

```c
struct canopus_target_page_context {
    int active;         // 页面在栈上
    int interactive;    // 可接受输入
    struct canopus_target_ui_backend backend;
};
static struct canopus_target_page_context manager_pages[CANOPUS_TARGET_PAGE_COUNT];
```

`backend` 按槽位保存句柄与绑定：

| 字段 | 数量 | 内容 |
| --- | ---: | --- |
| `rows[25]` | 25 | 行控件句柄 |
| `labels[6]` | 6 | 标签句柄 |
| `images[2]` | 2 | 图片句柄 |
| `progress[4]` | 4 | 进度条句柄 |
| `row_kinds[25]` | 25 | 行类型 |
| `bindings[25]` | 25 | `{ event_id, generation, key }` |

`bindings[row_index].generation` 是设计者预留的「代」，用于判断绑定是否过期。该字段在 1012 行附近赋值，但缺陷三的分派逻辑没有使用它。

## 控件类

固件注册了 38 个 LVGL 控件类，基类 `lv_obj_class` 位于 `0x2CCE0308`。`constructor` 为 `0x0` 表示该类没有独立构造函数，实例由组合控件或父类路径创建。类表来自 `research/lvgl-map.md`，对应 p67 的 `vela_ap.bin`。

| 控件 | 类 VA | 构造函数 | event_cb | instance_size |
| --- | --- | --- | --- | --- |
| arc | `0x2CCE5F0C` | `0x1C064069` | `0x1C064EED` | `0x681` |
| bar | `0x2CCE5F30` | `0x1C065D4D` | `0x1C065C25` | `0x7c0` |
| btn | `0x2CCE5F54` | `0x1C0660B5` | `0x0` | `0x344` |
| btnmatrix | `0x2CCE5F78` | `0x1C066B29` | `0x1C066C95` | `0x505` |
| calendar | `0x2CCE5FB8` | `0x1C067B19` | `0x0` | `0x1d04` |
| calendar-header-arrow | `0x2CCE6034` | `0x1C067DF1` | `0x0` | `0x0` |
| calendar-header-dropdown | `0x2CCE6058` | `0x1C067EF9` | `0x0` | `0x0` |
| chart | `0x2CCE611C` | `0x1C069F39` | `0x1C06AAF1` | `0xc80` |
| checkbox | `0x2CCE6140` | `0x1C06B26D` | `0x1C06B2AD` | `0x3c4` |
| dropdown-list | `0x2CCE6184` | `0x1C06B8E1` | `0x1C06B9F1` | `0x380` |
| dropdown | `0x2CCE61A8` | `0x1C06B93D` | `0x1C06C679` | `0x585` |
| image | `0x2CCE61EC` | `0x1C06C8D9` | `0x1C06D0C5` | `0x640` |
| imagebutton | `0x2CCE6210` | `0x1C06D92D` | `0x1C06DA69` | `0x1540` |
| label | `0x2CCE6880` | `0x1C06F619` | `0x1C06F1E9` | `0x700` |
| led | `0x2CCE68A4` | `0x1C06FA21` | `0x1C06FA49` | `0x380` |
| line | `0x2CCE68C8` | `0x1C06FFD5` | `0x1C06FFF5` | `0x400` |
| list | `0x2CCE6934` | `0x0` | `0x0` | `0x0` |
| menu-separator | `0x2CCE69E8` | `0x0` | `0x0` | `0x0` |
| menu-section | `0x2CCE6A0C` | `0x1C070481` | `0x0` | `0x0` |
| menu-cont | `0x2CCE6A30` | `0x1C070499` | `0x0` | `0x0` |
| menu-page | `0x2CCE6A54` | `0x1C070671` | `0x0` | `0x3c0` |
| menu | `0x2CCE6A78` | `0x1C070529` | `0x0` | `0x740` |
| msgbox-backdrop | `0x2CCE6A9C` | `0x0` | `0x0` | `0x340` |
| msgbox-header-button | `0x2CCE6AC0` | `0x0` | `0x0` | `0x344` |
| msgbox-footer-button | `0x2CCE6AE4` | `0x0` | `0x0` | `0x344` |
| msgbox-footer | `0x2CCE6B08` | `0x0` | `0x0` | `0x340` |
| msgbox-header | `0x2CCE6B2C` | `0x0` | `0x0` | `0x340` |
| msgbox | `0x2CCE6B50` | `0x0` | `0x0` | `0x440` |
| roller | `0x2CCE6BB4` | `0x1C070DAD` | `0x1C071025` | `0x485` |
| scale | `0x2CCE6BD8` | `0x1C0724D1` | `0x1C072E01` | `0x681` |
| span | `0x2CCE6C54` | `0x1C0738C5` | `0x1C0744F9` | `0x640` |
| switch | `0x2CCE6CC0` | `0x1C075EE5` | `0x1C075F0D` | `0x384` |
| table | `0x2CCE6CE4` | `0x1C076C09` | `0x1C076D41` | `0x505` |
| tabview | `0x2CCE6D08` | `0x1C0773FD` | `0x1C0771A1` | `0x3c0` |
| textarea | `0x2CCE6D70` | `0x1C077B85` | `0x1C078569` | `0x7c4` |
| tile | `0x2CCE6D94` | `0x1C078A8D` | `0x0` | `0x380` |
| tileview | `0x2CCE6DB8` | `0x1C07898D` | `0x0` | `0x380` |
| win | `0x2CCE6DDC` | `0x1C078AA9` | `0x0` | `0x340` |

## 页面生命周期

`active` 与 `interactive` 是两个独立标志。`on_pause` 只清 `interactive`，因此可以有多个页面同时 `active`，管理器内的 `manager_active_pages` 计数器与此一致。

| 回调 | 行号 | 行为 |
| --- | ---: | --- |
| `on_create` | 1199 | 置 `active` 与 `interactive` |
| `on_resume` | 1275 | 恢复 |
| `on_pause` | 1292 | 清 `interactive` |
| `on_destroy` | 1305 | 清 `active`，`memset` 整个 backend |

## 事件派发顺序

LVGL 的事件派发是遍历式的，回调执行期间被删除的对象仍留在链表中。

```
lv_event_send(msgbox, LV_EVENT_CLICKED)
  → 遍历 msgbox 的事件链表
    → 找到按钮的回调
      → 调用 target_dialog_event
        → delete_object(msgbox)      ← 把正在遍历的对象删了
      → 回调返回
    → 继续访问链表里的下一个节点      ← 悬空指针
```

派发期间删除对象会让链表节点悬空，后果取决于被释放的内存有没有被复用。这就是错乱表现为「有时候」的原因。

| 内存状态 | 表现 |
| --- | --- |
| 还没被复用 | 看起来正常 |
| 已被复用 | 花屏、内容错位、控件叠在一起 |
| 结构被改 | 死机 |

## 缺陷一：在自己的回调里销毁 msgbox

`target_dialog_event`（613 行）是 msgbox 上按钮的事件回调。点击「确定」时，回调调用 `target_dialog_dismiss`（601 行），后者直接对同一个 msgbox 调 `FW_LVX_OBJECT_DELETE`。

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
    if (box != NULL) delete_object(box);     // 摧毁整个 msgbox
}
```

`target_dialog_event` 把页面编号存在 binding key 的高字节，语义 key 存在低 24 位。

### 修法

回调里只置标记，把删除推迟到事件上下文之外：

```c
// 回调里只置标记
backend->dialog.dismiss_pending = 1u;

// 在渲染定时器或下一次 apply 的开头统一处理
static void target_dialog_reap(struct canopus_target_ui_backend *backend)
{
    if (!backend->dialog.dismiss_pending) return;
    backend->dialog.dismiss_pending = 0u;
    target_dialog_dismiss(backend);     // 此时不在事件上下文中
}
```

Chaos 采用同一做法，见 `ui.rs:108` 的 `render_req`。

## 缺陷二：就地复用与提前返回

`target_ui_apply`（695–1056）是增量协调逻辑：页面数据变化时不重建控件，尽量复用已有的行、标签与图片。末尾 1036–1052 有一段隐藏多余控件的循环，把本次未使用的槽位设为隐藏。这段循环之前有五处提前返回，任何一条命中都会跳过隐藏。

```c
for (i = row_count; i < CANOPUS_TARGET_UI_MAX_ROWS; i++) {
    if (backend->rows[i] != NULL) hide(backend->rows[i]);
}
```

| 提前返回位置 | 触发的典型情况 |
| ---: | --- |
| 913 | 数据源不可用 |
| 940 | 页面状态不匹配 |
| 990 | 行数超上限 |
| 997 | 控件创建失败 |
| 1004 | 布局失败 |

由此产生两个独立的坏结果。

1. 脏几何：复用旧控件时，`align_to` 读到上一轮的坐标与尺寸，新内容的宽度尚未算出，对齐基于旧值，于是错位与重叠。
2. 半渲染：提前返回跳过隐藏循环，上一帧可见、这一帧该隐藏的行仍然显示，视觉上新旧内容叠在一起。

1019 行另有一处细节：

```c
update_row(object, NULL, primary, secondary, 0, selected);
```

第二个参数是 `NULL`，尾随控件（trailing）在创建时固定，后续更新不改它。一行的 `kind` 在「有开关」与「无开关」之间变化时，尾随部分不跟随，直接造成视觉重叠。

### 修法

方案 A（保守）：所有提前返回之前先跑一遍完整的隐藏循环。

```c
#define APPLY_EARLY_RETURN(rc) do { \
    target_hide_unused(backend);    \
    return (rc);                    \
} while (0)
```

方案 B（彻底）：放弃增量复用，改为全删重建，让每个控件都走首次建页的路径。Chaos 选择方案 B（`ui.rs:220` 的 `render_page`），代价是性能，收益是彻底消除脏几何。25 行列表的重建开销可以接受。

## 缺陷三：分派不看页面

`target_dispatch_row`（463 行）遍历所有 `active` 页面，事件码不匹配时用 `return` 退出整个函数。回调由宏生成，只带槽位编号，不带页面编号。

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
                return;              // 注意是 return，不是 continue
            }
        } else if (code != CANOPUS_TARGET_EVENT_CLICKED) {
            return;                  // 同上
        }
        ...
    }
}
```

```c
// 513–543
#define ROW_EVENT(n) \
    static void target_row_event_##n(void *event) { target_dispatch_row(n, event); }
```

`user_data` 在 `add_event` 时传的是 `NULL`（1012 行）。

三个原因叠加：

1. 多页可同时 `active`，`rows[3]` 在两个页面里都可能非空，循环依次命中所有页面，把同一个点击当成多个页面的事件处理。
2. `return` 而非 `continue`，第一个命中的页面事件码不匹配时直接退出，本该处理的页面被跳过。
3. 没有「当前前台页」的概念，`interactive` 只区分能否输入，不区分是否最上层。

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

`binding->generation` 字段本来就存在，只是没有用于该校验。Chaos 的对应做法是维护 `FG_PAGE` 前台页游标，分派时先按它过滤。

## 缺陷四：查找不唯一

`target_find_row`（559 行）只按 `kind` 匹配。一页里有两行同为 `CANOPUS_TARGET_ROW_SWITCH` 时，查找返回第一个，更新数据会把第二行的内容写到第一行上。

修法：用 `bindings[i].key`（语义 key）代替 `kind` 做匹配，或要求调用方传入槽位号。

## 四个缺陷的关系

```
缺陷一（回调内销毁）  → 直接的 use-after-free，偶发花屏与死机
缺陷二（增量复用）    → 脏几何与半渲染，稳定的错位与重叠
缺陷三（分派不看页）  → 把 A 页的点击当成 B 页的，触发错误的 apply
缺陷四（查找不唯一）  → 数据写错行，内容与控件错配
```

缺陷三、四本身不一定立刻可见，但会让缺陷一、二被更频繁地触发：错误的页面收到不该有的更新，从而走更多次 apply、更多次提前返回。

## 补丁清单

| 优先级 | 改动 | 行数 | 严重度 | 风险 |
| --- | --- | ---: | --- | --- |
| P0 | 对话框改成延迟删除 | 约 15 | 高 | 低 |
| P0 | `return` 改 `continue` | 2 | 高 | 极低 |
| P1 | 提前返回前补隐藏循环 | 约 10 | 中 | 低 |
| P1 | 加前台页游标过滤 | 约 10 | 中 | 低 |
| P2 | 查找改用 key | 约 15 | 中 | 中 |
| P2 | apply 改全删重建 | 约 100 | 低 | 中高（性能） |

P0 两条合计不到 20 行，可以消掉绝大多数点击错乱。

## 验证方法

| 场景 | 修复前 | 修复后 |
| --- | --- | --- |
| 连续快速点击模块行 | 偶发内容重叠 | 正常 |
| 弹出确认框后点确定 | 偶发花屏 | 正常 |
| 在详情页点击后按返回 | 列表残留旧内容 | 正常 |
| 页面栈两层时点击 | 上层响应，下层也可能响应 | 只有上层响应 |

复现要点是快速点击与弹窗操作。慢速单击往往看不出来，因为内存还没来得及被复用。

## 与 Chaos 的对照

| Canopus 的做法 | Chaos 的做法 | 差异 |
| --- | --- | --- |
| 回调里 `delete_object(box)` | 置标记，交给 `lv_timer` 删 | 避开释放后使用 |
| 增量复用控件 | 全删加重建 | 避开脏几何 |
| 槽位按需清理 | 每次清满整个数组 | 避开悬空句柄 |
| 遍历所有 `active` 页 | 按 `FG_PAGE` 过滤 | 避开跨页误触发 |

四条一一对应，与 Chaos 的四个结构性设计重合。

## 未决问题

| 问题 | 状态 | 依据 |
| --- | --- | --- |
| 缺陷一能否在真机复现 | 待定 | 代码层已证实，未做真机崩溃捕获 |
| 多页同时 `active` 的实际场景 | 推断 | 由 `manager_active_pages` 计数器推断 |
| `lvgl_v8` 版是否有同样缺陷 | 推断 | 逻辑同构，未逐行核对 |
| 全删重建后的性能 | 待定 | 未测，25 行列表应无感 |

## 相关页面

- 管理器与加载器实现：[Canopus](/native/canopus)
- 另一套 UI 框架的对照：[Chaos](/native/chaos)
- 圆环控件的字段与绘制：[圆环与 ARC 控件](/native/arc)
- 固件符号恢复方法：[逆向工具](/tools/reversing)
