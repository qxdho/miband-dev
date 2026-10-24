# 08 · Chaos

## 本文讲什么

Chaos 是另一个第三方手环框架，Rust 写的。和 Canopus 相比，它最大的特点是**作者在 UI 渲染上踩过同一批坑，并把对策写进了代码注释**。这一篇记录它的架构和那几个结构性设计——这些设计后来直接成了修 Canopus UI bug 的依据（见 [09 篇](09-LVGL-与界面.md)）。

**结论**：Chaos 的功能面比 Canopus 窄（没有模块加载、没有 target pack 体系），但在"如何安全地重建界面"这一点上做对了四件事，值得照搬。

## 基本情况

| 项 | 值 |
|---|---|
| 仓库 | `github.com/WenHuaYiYang/Chaos-Module` |
| 许可 | AGPL-3.0 |
| 语言 | Rust（`supervisor/src` 约 13,944 行），36 个 `.rs` 文件 |
| 本地路径 | `/work/chaos/projects/chaos/` |
| 目录 | `supervisor/`、`module/`、`installer/`、`tools/` |
| 目标固件 | `3.101.043`（同一版本） |

## 架构

```
installer（快应用，负责安装）
    ↓
supervisor（native app，常驻，管理页面与模块）
    ↓  直接调用固件函数（硬编码地址）
    ↓
LVGL / lvx 控件层
```

和 Canopus 的区别在于：**Chaos 的 supervisor 本身就是一个 native 应用，不走模块加载**。它把固件里的 LVGL 函数地址硬编码在代码里直接调用。

## 四个结构性设计

### 一、不在事件回调里销毁对象

`supervisor/src/ui.rs:108` 的 `render_req`：

```rust
/// 点击回调里不能直接销毁自身对象树(事件派发中 → use-after-free),
/// 交给常驻 lv_timer(UI线程, 不在事件派发上下文)真正重建
pub(crate) unsafe fn render_req(pid: usize) { ... }
```

事件回调执行时，LVGL 正在遍历控件树。此刻 `delete` 掉当前控件，遍历器手里就是悬空指针——这是 `use-after-free`，表现为花屏、重叠、或者直接死机。

**对策**：回调里只置一个"待重画"标记，真正的重建交给一个常驻的 `lv_timer` 去做。定时器回调不在事件派发上下文里，此时删对象是安全的。

### 二、重建而不是刷新

`supervisor/src/ui.rs:220` 的 `render_page`：

```rust
// 重建式渲染: 先销毁上次的 content(行/label 是其子对象, 一并销毁) → 再走与首次
// 完全相同的 build 路径。刷新旧对象会让 align_to 读到脏几何(错位/空白/重叠的根源)。
if PAGES[pid].built != 0 {
    let oc = PAGES[pid].content;
    if oc != 0 { fw_api::obj_delete(oc); }
    let ot = PAGES[pid].title;
    if ot != 0 { fw_api::obj_delete(ot); }
    ...
}
```

这段话点出了**"错位/空白/重叠"的根因**：就地刷新旧对象时，`align_to` 读到的是**上一轮的几何信息**（"脏几何"）。控件还没重新布局，它的坐标、尺寸、父容器内边距都还是旧值，于是对齐计算全错。

**对策**：不刷新，整个删掉重建，让每个对象都走和"首次建页"完全相同的路径。代价是性能，收益是正确性。

### 三、槽位必须清满

`supervisor/src/ui.rs:245`：

```rust
// 必须清满全部槽位: 少清会留下悬空句柄 → 重建时复用已删对象 = UAF
// 上限引用 fw_api::MAX_ROWS_PER_PAGE(单一事实来源, 避免"改了容量忘了改循环")
let rws = page_rows_ptr(pid);
let mut q = 0usize;
while q < fw_api::MAX_ROWS_PER_PAGE { write_volatile(rws.add(q), 0); q += 1; }
```

页面用了固定容量的槽位数组缓存控件句柄。删对象时如果只清了"这次用到的"槽位，剩下的老句柄就悬空了；下次重建时如果复用，就是访问已释放对象。

**对策**：每次清理都清满整个数组，不管实际用了几个。

### 四、用 `FG_PAGE` 做前台页判定

`supervisor/src/state.rs:227`：

```rust
pub static mut FG_PAGE: u32 = 0;   // 前台 page_id(on_resume 设, dispatch 分流)
```

`ui.rs:315` 的分派路径：

```rust
let pid = st_rd!(FG_PAGE) as usize;
```

`ui.rs:375-379`（`on_resume` 时更新）：

```rust
let mut pid = if page == 0 { FG_PAGE as usize } else { ... };
if pid > MAX_PID { pid = st_rd!(FG_PAGE) as usize; }
st_wr!(FG_PAGE, pid as u32);
```

**问题背景**：同一个事件回调可能被**多个页面**共用（因为回调是按槽位编号生成的，不区分页面）。如果回调里不判断"我现在是哪个页面"，就会去操作别的页面的控件。

**对策**：维护一个全局"当前前台页"变量，分派时用它把事件路由到正确的页面。这是 Canopus 缺的那一层（见 [09 篇](09-LVGL-与界面.md#缺陷三分派不看页面)）。

## 代价：硬编码地址

`supervisor/src/gfx.rs` 里全是这样的常量：

```rust
const LV_OBJ_DELETE: usize = 0x0C58_xxxx;
const LV_OBJ_ALIGN_TO: usize = 0x0C58_xxxx;
```

和 Canopus 的 veneer 是同一个思路，只是 Chaos 没有 target pack 体系——地址直接写在代码里。

| 后果 | 说明 |
|---|---|
| 只能支持一个固件版本 | 换版本要改源码重编译 |
| 没有证据链 | 地址怎么来的不可追溯 |
| 无法自动化验证 | 没有符号表就没有校验手段 |

这是 Chaos 相对 Canopus 的结构性劣势。

## 与 Canopus 的对比

| 维度 | Chaos | Canopus |
|---|---|---|
| 语言 | Rust | Rust + C + Lua |
| 模块加载 | ❌ 无 | ✅ `insmod` + `CPS1` |
| 多固件版本支持 | ❌ 硬编码 | ✅ target pack 按哈希分组 |
| 符号证据体系 | ❌ 无 | ✅ 259 条记录 + 36 份证据 |
| 安装方式 | 快应用 | Lua 表盘 + `/dev/canopus` |
| **渲染安全** | ✅ **四项设计到位** | ❌ 四个缺陷 |
| UI 规模 | 中等 | 更大（管理器 + 模块页） |
| 许可 | AGPL-3.0 | AGPL-3.0 |

一句话：**Canopus 的"基础设施"更强，Chaos 的"界面代码"更稳。**

## 可以直接借用的规则

如果目标是修 Canopus 的 UI bug，下面四条可以逐条对照实施：

| # | 规则 | 在 Canopus 里对应的问题 |
|---|---|---|
| 1 | 事件回调里禁止 `delete` 对象 | `target_dialog_event` 在按钮回调里删 msgbox |
| 2 | 渲染走"全删 + 重建"，不做就地刷新 | `target_ui_apply` 是增量复用 |
| 3 | 槽位数组每次清满 | `rows[]`/`labels[]` 只在部分路径清 |
| 4 | 分派前用前台页 id 过滤 | `target_dispatch_row` 遍历所有活跃页 |

细节与补丁见 [09 篇](09-LVGL-与界面.md)。

## 风险

| 风险 | 说明 |
|---|---|
| **AGPL-3.0** | 同 Canopus |
| **地址无出处** | 无法验证，也无法迁移 |
| **单版本** | 固件一升级就废 |
| **Rust + `static mut`** | 大量 `unsafe`，注释里也承认有 UAF 历史 |

最后一点值得注意：Chaos 用 `static mut` + 裸指针直接操作 LVGL 对象，安全性完全靠人工纪律。它的注释之所以写得那么细，正是因为踩过这些坑。

## 应用管理的隐藏/显示（2026-10 新增）

Chaos 的页 1 原先只做“搬 `apps.json` / `apps.json_hide` + 调 `app_launcher_del/add`”。这条路径在“重启后显示”上有一个固件层根因：条目被搬走后，开机不会再为它建注册表节点，`app_launcher_add` 找不到节点必然失败。

现在页 1 顶部有一个 **“免重启显示”** 开关，提供两种模式：

| 模式 | 隐藏 | 显示 | 代价 |
|---|---|---|---|
| 重启生效（默认） | 搬条目 + 置隐藏位 + 删图标 | 写回条目，重启后注册 | 显示必须重启一次 |
| 免重启（保留条目） | 条目留在 `apps.json`，名单记到 `/data/chaos/appmgr_keep.bin`，置隐藏位 + 删图标 | 摘名单 + 清隐藏位 + `add` 图标，立即生效 | 开机瞬间可能闪图标；其它工具会认为应用仍可见；切换前已隐藏的项首次显示仍需重启 |

机制、固件证据与验证清单见 [14 篇](14-应用隐藏与免重启模式.md)。

## 未决问题

| 问题 | 状态 |
|---|---|
| Chaos 的功能集是否覆盖 Canopus | ❓ 未逐一对比 |
| 它的 supervisor 如何被安装和启动 | ❓ `installer/` 未展开分析 |
| 硬编码地址来自哪里 | ❓ 无文档 |
