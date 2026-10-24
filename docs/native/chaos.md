---
title: Chaos
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/08-Chaos.md"
contributors: [miband-dev]
---

# Chaos

<StatusBadge status="sourced" verified="2026-10-25" />

Chaos 的功能面比 Canopus 窄，但在界面重建上做对了四件事，四条规定可直接照搬到 Canopus 的界面修复。

结论：Chaos 没有模块加载与 target pack 体系，supervisor 本身是一个 native 应用，以硬编码地址直接调用固件中的 LVGL 函数。渲染安全的设计完整，地址来源不可追溯。

## 概况

| 项 | 值 |
| --- | --- |
| 仓库 | `github.com/WenHuaYiYang/Chaos-Module` |
| 许可 | AGPL-3.0 |
| 语言 | Rust，`supervisor/src` 约 13,944 行，36 个 `.rs` 文件 |
| 本地路径 | `/dsh/workspace/chaos/projects/chaos/` |
| 目录 | `supervisor/`、`module/`、`installer/`、`tools/` |
| 目标固件 | `3.101.043` |

## 架构

```
installer（快应用，负责安装）
    ↓
supervisor（native app，常驻，管理页面与模块）
    ↓  直接调用固件函数（硬编码地址）
    ↓
LVGL / lvx 控件层
```

与 Canopus 的差异在于，Chaos 的 supervisor 本身就是 native 应用，不经过模块加载，固件中的 LVGL 函数地址硬编码在代码里直接调用。

## 四个结构性设计

### 不在事件回调里销毁对象

`supervisor/src/ui.rs:108` 的 `render_req`：

```rust
/// 点击回调里不能直接销毁自身对象树(事件派发中 → use-after-free),
/// 交给常驻 lv_timer(UI线程, 不在事件派发上下文)真正重建
pub(crate) unsafe fn render_req(pid: usize) { ... }
```

事件回调执行时，LVGL 正在遍历控件树。此刻删除当前控件，遍历器持有的是悬空指针，属于 use-after-free，表现为花屏、重叠或直接死机。

对策是在回调里只置一个「待重画」标记，真正的重建交给常驻 `lv_timer`。定时器回调不在事件派发上下文中，此时删除对象是安全的。

### 重建而不是刷新

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

错位、空白、重叠的根因在于就地刷新：旧对象尚未重新布局，`align_to` 读到的坐标、尺寸、父容器内边距仍是上一轮的几何信息，对齐计算随之出错。

对策是不刷新，整体删除后重建，让每个对象走与首次建页完全相同的路径。代价是性能，收益是正确性。

### 槽位必须清满

`supervisor/src/ui.rs:245`：

```rust
// 必须清满全部槽位: 少清会留下悬空句柄 → 重建时复用已删对象 = UAF
// 上限引用 fw_api::MAX_ROWS_PER_PAGE(单一事实来源, 避免"改了容量忘了改循环")
let rws = page_rows_ptr(pid);
let mut q = 0usize;
while q < fw_api::MAX_ROWS_PER_PAGE { write_volatile(rws.add(q), 0); q += 1; }
```

页面用固定容量的槽位数组缓存控件句柄。删除对象时若只清理本次用到的槽位，其余旧句柄悬空，下次重建复用即访问已释放对象。

对策是每次清理都写满整个数组，不论实际使用几个槽位，容量上限统一引用 `fw_api::MAX_ROWS_PER_PAGE`。

### 用 `FG_PAGE` 做前台页判定

`supervisor/src/state.rs:227` 定义全局前台页变量：

```rust
pub static mut FG_PAGE: u32 = 0;   // 前台 page_id(on_resume 设, dispatch 分流)
```

`supervisor/src/ui.rs:315` 的分派路径读取该变量：

```rust
let pid = st_rd!(FG_PAGE) as usize;
```

`supervisor/src/ui.rs:375-379` 在 `on_resume` 时更新：

```rust
let mut pid = if page == 0 { FG_PAGE as usize } else { ... };
if pid > MAX_PID { pid = st_rd!(FG_PAGE) as usize; }
st_wr!(FG_PAGE, pid as u32);
```

同一个事件回调可能被多个页面共用，因为回调按槽位编号生成，不区分页面。回调中不判断当前页面，就会操作到其他页面的控件。

对策是维护一个全局前台页变量，分派时用它把事件路由到正确的页面。这一层是 Canopus 缺失的部分。

## 硬编码绝对地址与版本绑定

`supervisor/src/gfx.rs` 内的常量形如：

```rust
const LV_OBJ_DELETE: usize = 0x0C58_xxxx;
const LV_OBJ_ALIGN_TO: usize = 0x0C58_xxxx;
```

与 Canopus 的 veneer 思路相同，区别是 Chaos 没有 target pack 体系，地址直接写在源码里。

| 后果 | 说明 |
| --- | --- |
| 只能支持一个固件版本 | 换版本需要改源码重新编译 |
| 没有证据链 | 地址的来源不可追溯 |
| 无法自动化验证 | 没有符号表就没有校验手段 |

地址与 `3.101.043` 强绑定。固件升级后，源码中的每个常量都需要重新恢复，且没有可供核对的证据记录。这是 Chaos 相对 Canopus 的结构性劣势。

## 与 Canopus 的对比

| 维度 | Chaos | Canopus |
| --- | --- | --- |
| 语言 | Rust | Rust、C、Lua |
| 模块加载 | 无 | `insmod` 加 `CPS1` |
| 多固件版本支持 | 硬编码地址 | target pack 按哈希分组 |
| 符号证据体系 | 无 | 259 条记录、36 份证据 |
| 安装方式 | 快应用 | Lua 表盘加 `/dev/canopus` |
| 渲染安全 | 四项设计到位 | 四个缺陷 |
| 界面规模 | 中等 | 更大，含管理器与模块页 |
| 许可 | AGPL-3.0 | AGPL-3.0 |

Canopus 的基础设施更强，Chaos 的界面代码更稳。

## 可直接借用的规则

| 序号 | 规则 | 在 Canopus 中对应的问题 |
| ---: | --- | --- |
| 1 | 事件回调里禁止 `delete` 对象 | `target_dialog_event` 在按钮回调里删除 msgbox |
| 2 | 渲染走全删加重建，不做就地刷新 | `target_ui_apply` 为增量复用 |
| 3 | 槽位数组每次清满 | `rows[]`、`labels[]` 只在部分路径清理 |
| 4 | 分派前用前台页 id 过滤 | `target_dispatch_row` 遍历所有活跃页 |

## 应用管理：免重启显示

页 1 原先只做搬运 `apps.json` 与 `apps.json_hide`，再调用 `app_launcher_del` 与 `app_launcher_add`。该路径在「重启后显示」上存在固件层根因：条目被搬走后，开机不再为其建立注册表节点，`app_launcher_add` 找不到节点必然失败。

页 1 顶部现有「免重启显示」开关，提供两种模式：

| 模式 | 隐藏 | 显示 | 代价 |
| --- | --- | --- | --- |
| 重启生效（默认） | 搬条目、置隐藏位、删图标 | 写回条目，重启后注册 | 显示必须重启一次 |
| 免重启（保留条目） | 条目留在 `apps.json`，名单记到 `/data/chaos/appmgr_keep.bin`，置隐藏位、删图标 | 摘名单、清隐藏位、`add` 图标，立即生效 | 开机瞬间可能闪图标；其他工具会认为应用仍可见；切换前已隐藏的项首次显示仍需重启 |

## 风险

| 风险 | 说明 | 严重度 |
| --- | --- | --- |
| AGPL-3.0 | 与 Canopus 相同，派生作品需要开源 | 中 |
| 地址无出处 | 无法验证，也无法迁移 | 高 |
| 单版本绑定 | 固件升级后地址全部失效 | 高 |
| Rust 加 `static mut` | 大量 `unsafe`，注释中承认存在 UAF 历史 | 中 |
| 安装与启动链未分析 | `installer/` 未展开 | 低 |

Chaos 用 `static mut` 与裸指针直接操作 LVGL 对象，安全性依赖人工纪律。注释详细的原因是这些问题曾经实际发生。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| Chaos 的功能集是否覆盖 Canopus | 待定，未逐一对比 |
| supervisor 如何被安装和启动 | 待定，`installer/` 未展开分析 |
| 硬编码地址的来源 | 待定，无文档 |

## 相关页面

- 模块加载、符号体系与 target pack：[Canopus](/native/canopus)
- 界面缺陷的成因与补丁：[LVGL 界面](/native/lvgl)
- 框架实现的审查记录：[代码审查](/native/code-review)
- 模块格式与加载流程：[内核模块系统](/native/modules)
