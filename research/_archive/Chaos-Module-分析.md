# Chaos-Module 项目分析

> 研究日期：2026-10-16（仓库已跟进至 `d3343dc`）
> 研究对象：[WenHuaYiYang/Chaos-Module](https://github.com/WenHuaYiYang/Chaos-Module)（本地克隆 `/work/chaos/repo`）
> 许可：AGPL-3.0
> 环境限制：本环境**无 cargo / rustc / python3**，所有结论均来自**静态源码阅读**，**未经编译或真机验证**。
>
> **本文是拆分文档之一。** 固件侧 `fetch` 研究见《[小米手环 10 Pro fetch 固件研究](小米手环10-fetch-固件研究.md)》。

---

## 目录

- [摘要](#摘要)
- [第一部分：Chaos-Module 项目分析](#第一部分chaos-module-项目分析)
  - [1.1 定位](#11-定位)
  - [1.2 架构与代码规模](#12-架构与代码规模)
  - [1.3 原理：四道关卡](#13-原理四道关卡)
  - [1.4 技术亮点](#14-技术亮点)
  - [1.5 深入：不重启即生效的原理（以隐藏/显示应用为例）](#15-深入不重启即生效的原理以隐藏显示应用为例)
  - [1.6 缺陷与风险](#16-缺陷与风险)
  - [1.7 质量评价](#17-质量评价)
  - [1.8 合规与生态](#18-合规与生态)
- [附录 A：关键地址速查表](#附录-a关键地址速查表chaos-module-部分)

---

## 摘要

**Chaos-Module** 是一个工程成熟度显著高于其"手环玩具"外观的项目。它用 `no_std` Rust 内核模块 + Lua 安装器，把手环表盘容器的**未校验路径字段**当作投递通道，把 `.ko` 写进 `/data` 并加载，从而在小米手环 10 Pro 的固件启动器里注册出一个**和系统应用平级的原生 App**。它的核心哲学是「不改造固件，而是让固件用它的既有机制做我们想做的事」，因此完全可逆。主要短板是**并发假设从未被断言**（`static mut` + "单线程 lv_timer" 纯靠注释约定）；初版分析中确认的 `MAX_PID` off-by-one **已在 `d3343dc` 修复**（`PAGE_COUNT` 15→17 并同步 `DESC`），但 `DESC` 容量仍是手写数字、缺静态断言。

**本文覆盖：** 项目定位、整体架构、四道技术关卡、"不重启即生效"的两条代表性实现（换字体 / 换图标 / 隐藏显示应用）、已确认的缺陷清单、质量评价与合规说明。

---

# 第一部分：Chaos-Module 项目分析

## 1.1 定位

**小米手环 10 Pro 的原生应用"自研平台"**——不是表盘，不是快应用，而是用 `no_std` Rust 写内核模块，把自己注册进固件的启动器（launcher），获得一个和系统应用平级的原生 App。目标固件锁死 `3.101.043`（README 明确声明）。

大多数手环第三方开发止步于**表盘容器**（一种被官方支持的资源包格式）。这个项目跨过了那条线：

| 层 | 手段 | 性质 |
|---|---|---|
| 安装载体 | 表盘容器（魔数 `0x1234A55A`） | 走官方合法格式，无需漏洞 |
| 代码注入 | 容器文件路径遍历 → 写入 `/data` | 利用安装器的路径处理缺陷 |
| 执行 | `insmod` 一个 `.ko` | 固件内核未做模块签名校验 |
| 界面 | 直接调用固件内的 LVGL | 手写 Thumb 函数指针 |

关键在于**它不覆盖、不刷写任何固件分区**，全部落在 `/data`，所以可以完全卸载。

## 1.2 架构与代码规模

```
installer/chaos_installer.lua   757 行  安装器（表盘包内的 Lua，借容器路径遍历落地文件）
module/src/lib.rs                57 行  最小探针 .ko，只验证"能加载"
supervisor/src/*.rs          13,944 行  主模块：UI / 字体 / 图标 / 表盘 / 背景 / 震动 / IPC
tools/*.py                      560 行  容器生成、校验、打包
（全仓 .rs 合计 14,001 行；统计于 d3343dc）
```

`supervisor` 的分层相当克制：

- **`fw_api/`** — 固件 API 的"镜像面"（`gfx` / `fs` / `sys` / `glass` / `home` / `page` / `event`）。所有 `transmute(地址)` 只允许出现在这一层，业务代码禁止手写裸地址。头注释（`supervisor/src/fw_api.rs:1-27`）列了四类历史事故，每条都对应一个真实 bug：
  1. **空串指针 ≠ NULL** —— `lvx_list_item_update` 判空看的是指针是否为 NULL；传 `b"\0".as_ptr()` 会触发副标签惰性创建，凭空多出一行空白
  2. **槽号 → 回调的 catch-all 映射** —— 布局一改就静默错配（"返回"被派发成"更多"）
  3. **容量变更漏改清理循环** —— 槽数组 10→12 而清理仍写 `< 10` → 悬空句柄 → UAF
  4. **新增页面漏改某个 pid 上界** —— `on_create`/`on_resume`/`on_destroy`/`dispatch` 都要同步
- **`mem.rs` + `st_rd!`/`st_wr!`** — 带类型的 volatile 访问器（地址写死，不传指针，消灭一整类错误）。`plausible_ptr` 做非空 + 对齐 + 地址窗口检查。
- **`ui.rs` / `page.rs` / `state.rs`** — **17 页**、每页 12 行槽的界面框架。`state.rs` 的 `DESC: [u32; 493]` = 17 页 × 29 word（116 字节/页）的固件描述符缓冲。

### 1.2.1 本次跟进（`94527e9` → `d3343dc`，4 个提交）

| 提交 | 内容 |
|---|---|
| `63871c6` | **新增模糊区域控制** — 新文件 `supervisor/src/blur_zone.rs`（61 行），页15 `PAGE_ZONE = b"blurzone\0"` |
| `aa0482c` | 新增自动替换背景图、调整按钮排版及文本 — `background_home.rs` +205 行、`page.rs` +141 行、`text.rs` +107 行 |
| `875dae9` | 新增震动功能 — `fw_api/sys.rs` 新增 `vibrate(type)`，页16 `PAGE_VIB = b"vibtest\0"` |
| `d3343dc` | 优化震动 |

合计 10 个文件、+500/−60；`state.rs`/`ipc.rs` 的页数从 15 扩到 17。

**`blur_zone.rs` — 分区域门控（设计得挺干净）**

背景 hook 有四个目标面（`fw_api::background_home_targets`，槽位顺序固定）：
`0 = 启动器(桌面列表)`、`1 = 控制中心`、`2 = 小部件`、`3 = 通知中心`。
位图语义 **`1 = 正常替换(默认)` / `0 = 不替换（该区域保持官方模糊画面）`**，持久化在
`/data/chaos/blur_regions.cfg`（1 字节位图，**文件缺失 = 全开 `0x0F`**）。

值得注意的一条设计声明（`blur_zone.rs:12-13`）：

> 改位不直接动对象树 —— 只写文件，然后由 `background_home::remount()` 置 `REQUEST`，
> `background_home::tick` 的拆/装流程按新掩码统一重建（**与档位切换同一套路径**）。

即：**新功能复用了既有的"重建"路径，而没有新增一条并行的修改路径**。这与 1.5 的哲学一致——
能用既有动作就不要发明新动作。

**`vibrate(type)` 的取证（`fw_api/sys.rs`）**

| 项 | 值 |
|---|---|
| 入口 | `0x0C4C56CC` |
| 全固件唯一 BL 调用点 | launcher 翻页动画完成回调 `0x0C500668` 尾部 `movs r0,#0xD; bl 0x0C4C56CC`（`0xD` = "滑动翻页"官方效果） |
| 读取系统震动开关 | `bl 0x0C5EAF84` → 全局 `0x2011942E`（**非 0 = 直接返回**，即自动跟随用户的"震动"设置） |
| 读取模式 | `bl 0x0CAA0BC4` → `0x200EB921`（`==2` 用 2，否则 1） |
| 分发 | `bl 0x0C3DB948(type, mode, 0)` → LRA 驱动链（`/dev/lra0`） |

结论（写在注释里）：**固件自己的震动也是定时器上下文驱动的（"Vibration timeout timer created"），
与 chaos tick 同上下文，因此不属于"回调禁区"**——这是它敢在新功能里调震动的依据。

**顺带修掉的一处**：初版分析确认的 `MAX_PID` off-by-one 在 `d3343dc` 被修复（详见 1.6）。

**构建工具链要求**（`tools/build_ko.sh`）：依赖 `cargo`/`rustc`。本环境不可用，故**未能编译验证**。

## 1.3 原理：四道关卡

### 关卡一：怎么把文件写进 `/data`

手环不让你随便传文件，但它接受**表盘包**。安装器（`chaos_installer.lua`，跑在固件的 Lua 运行时里）负责解析这个包。

原理是：**容器里每条文件记录带一个"路径"字段，而安装器信任这个字段。**

`tools/container_shell.py:57-64` 的 `blob_for()` 揭示了格式：

```python
head = struct.pack('<I', (len(data) & 0xFFFFFF) | (len(pb) << 24))
return head + b'\x00' * 16 + pb + data
```

每条记录 = `20 字节头` + `路径 ASCII` + `数据`，长度和路径长度打包进同一个 u32。正常表盘只会写 `watchface/xxx/...` 这类路径，但**格式本身不限制路径内容**。于是构造一条路径为 `../../data/chaos/chaos.ko` 的记录，数据就是内核模块二进制。这就是全部原理：**容器是合法载体，路径字段是未校验的输入**。不需要漏洞利用，只需要格式理解。README 把它描述为"路径遍历"，准确。

**容器完整格式**（`tools/container_shell.py:9-23` 逐条对多来源核过）：

```
容器 = [头部 0x00..0x27][包名 0x28..0x33][填充 0x34..0x67][显示名 0x68..0xA7]
       [主题表 0xA8..0x147][记录表 0x148..rec_end][预览块 rec_end..file_region]
       [文件数据区 file_region..]
```

- 头部魔数 `0x1234A55A`；`0x04` 表盘版本（`0x10000` = 1.0）；`0x10=0x800`；`0x14=0x10000`；`0x1C` 主题数；`0x20` 与 `0xAC` 都等于记录表结束地址
- 记录表首条 = `(0, 0, 尾标记记录地址, 0x10)`；每条文件记录 = `(0x05000000|槽号, 0, 偏移, 长度)`；尾标记 = `(0x05000000, 0, 0, 0)`
- 显示名只许写 `0x68..0xA7` 这 64 字节。**越界踩到 `0xA8` 的主题表会让整包解析失败（真机事故）**
- 预览块 = 12 字节头（u32 恒 `0x410`，u16 宽，u16 高，u32 数据长）+ 数据

### 关卡二：为什么 `.ko` 能被加载

固件是 **NuttX**（不是 Linux，但借鉴了其模块机制），它**没有对模块做签名校验**——`tools/build_ko.sh` 产出的普通 `.ko` 直接可加载。

`module/src/lib.rs` 是个只有 58 行的探针，存在的唯一意义是**证明这一步可行**。

值得注意的细节：模块的入口不是靠 `module_init` 宏，而是靠 **`.init_array` 段**。`state.rs:133` 的注释露了马脚：

```rust
pub static mut CTOR_DONE: u32 = 0; // ctor 幂等守卫(.init_array + module_main 可能双触发)
```

即构造器可能被触发两次，所以要有幂等守卫。这说明作者是逆向了加载器的实际行为，而不是照着 Linux 惯例写。

### 关卡三：怎么长出一个界面

模块加载后**不自己画图**——它调用固件里已有的 **LVGL v9**。

```rust
transmute(0x0C588629usize)  // obj_set_size
transmute(0x0C54CA3Dusize)  // row_create
```

**关键细节是 bit0=1。** `fw_api.rs:23-25`：

> 函数指针地址必须 bit0=1（Thumb）：符号查找与反汇编给出的都是偶数入口地址……直接当函数指针调用会硬 fault。

ARM Thumb 模式下，函数指针的最低位表示指令集状态。反汇编器给你的 `0x0C588628` 是"看的地址"，而能当指针用的必须是 `0x0C588629`。搞错的表现是**硬 fault 而非报错**——非常难查。

还有一层：**LVGL 的对象句柄在固件里就是指针**（`fw_api.rs:35`：`pub type Obj = u32;`）。所以 Rust 侧操作界面 = 手工管理裸指针生命周期，这也解释了为什么需要 `page_is_live()` 这样的存活门。

然后是**注册进启动器**：把自己描述成一个页面（`DESC` 是 14 页 × 29 word 的固件描述符结构，尺寸是逆向出来的），让启动器把你当成一个系统应用来调度。

### 关卡四：怎么和固件状态不打架

前三步是"能做"，这一步是"能稳"。原理是**认清固件的缓存和快照语义**。

**字体缓存的例子最典型。** 固件按 `(name, size)` 缓存字体 face（`0x0C85F9BC`）。即使你把新字体数据写进去，只要名字还叫 `MiSans-Regular`，固件就返回旧 face——表现就是"点了没反应"。解法是每次提交都换名字（`font_apply.rs` 的 `commit()`）：`ChaosSans-R<generation>`。**用名字作为缓存失效机制**——整个项目里最巧妙的一处。

**样式快照：** 改 `lv_style_t` 的 `text_font`（prop `0x5A`）只能影响之后新建的行，因为 `row_init`（`0x0C4C8560`）会把样式**拷贝快照**到每个对象里（快照点在 `0x0C4C86BC`）。已经在屏幕上的行必须靠 `font_hot.rs` 原地改写 wrapper 结构体——两条路径都要走，缺一不可。

**图标重定向：** 挂钩固件的 LVGL 驱动 **open 回调**（槽位 `0x2010_334C`，原值 `FS_OPEN_ORIG=0x1C057C51`）。固件自己加载任何资源都要过这个回调，所以只要判断路径、命中就换成 `/data/chaos/icons/...`，未命中就调原回调——对固件**完全透明**。

### 统一起来的原理

> **不改造固件，而是让固件用它的既有机制，做我们想做的事。**

- 不改分区 → 借合法容器格式落地文件
- 不写引导 → 借无签名校验的 `insmod`
- 不自绘 UI → 借固件内的 LVGL，只补一个 Thumb 地址
- 不改固件逻辑 → 借缓存的键、借回调的槽

所以它**完全可逆**：所有产物都在 `/data`，卸载就是删文件 + 让出 hook 槽位。

## 1.4 技术亮点

### 1. 不重启换字体（`font_apply.rs` + `font_hot.rs`）

机制分两步：`apply_start()`（`font_apply.rs:552-613`）把目标样式排队——132 个 `BOOT_FONT_TABLE` 条目（跳过 `flag==0`）、33 个 `EXTRA_STYLES`、9 个 `LOCAL_STYLES`、23 个 `DERIVED_STYLE_PAIRS`——然后 `apply_step()`（616-651）按 50ms tick 推进：阶段 1 每 tick 写 ≤16 个样式（`FA_JOB_CAP`）、建 ≤2 个新 face（`FA_FACE_CAP`，每个新 face = FreeType 从 flash 读 3.4MB TTF）；阶段 2 跑 `learn_from_cache()`；阶段 3 收尾。

`live_get()/commit()/busy()` 协议：
- `live_get()` = `st_rd!(FA_LIVE)`，当前使用的槽号
- `commit(slot)`：写 `FA_LIVE=slot`，递增 `FA_GEN`，改写注册的 face 名缓冲 `C_REG` 为 `b"ChaosSans-R"+gen`，清空以**名字指针**为键的 ledger `FA_CCH_N=0`，并调 `beautify_restore::remember_font(slot)`
- `busy()` = `FA_STAGE!=0`；`quiet()` = stage/req/queued 全零
- `pending_tick()`（529-544）拒绝在 `busy() || FA_REQ!=0 || !manager_ready() || !screen_is_on() || APP_FG!=0` 时落地选择。理由写在文件里：**在 LVGL 事件派发链里做 `commit` 会崩溃**

`FONT_PATHS[9]` 索引 0 = 安装器的 `ChaosWenKai.ttf`，1..8 = `st1..st8.ttf`；**"槽号必须等于文件名编号"**——三处（ko 表 / `ipc.rs` 的 `font_slot_file_ok()` / 投递 Lua）必须始终一致；早期 st0..st3 off-by-one 弄坏了一切。

### 2. 图标热替换（`res_hook.rs` + `icon_apply.rs`）

`chaos_fs_open`（`res_hook.rs:372`，`#[no_mangle]`）把传入路径与 106 条 `RULES` 表匹配，要求**目录前缀和文件名同时匹配**，然后重定向；未命中/失败就调原回调（`RH_FALLBACK`）。`live_orig()`（604）每次调用都重读槽位，所以能跟随在我们之后链上的其他模块。

恢复系统图标 = `yield_slot()`（672）：重装原回调（node 方法恢复链表节点；field 方法重写槽位）并**读回校验**。`hand_off_if_needed`/`field_should_wait` 还会在 Corona（另一个模块）出现时主动让出槽位——**做了模块间共存的礼仪**。

节点安装（`install_by_node`，564）复制 80 字节固件驱动到 `RH_COPY`，把入口指向副本，**固件结构体本身不动**，这样 Corona 的 `-2009` 检查能通过。这是处理"只读结构"的标准手法：不原地改，而是复制+改指针。

`icon_apply.rs` 有一条硬约束：改启动器路径时写的必须是 `fw_str_dup` 的**堆指针**，写 `.rodata`/`.bss` 会在之后被 free 掉 → 堆破坏。且换之前必须先 `fw_img_free_by_path`（图像缓存按路径存，38 × ~50KB）。

日历是特例：固件 043 的信号-6 回调 `0x0C4EFDE8` 往 `node+0x0C` 写的是**光栅化的 112×112 RAM 图像描述符指针**（magic `0x19`），不是路径——所以它按 app_id 69 在 `icon_apply` 里处理，不走路径钩子。

### 3. 容器格式的完整逆向（`container_shell.py`）

从多个独立来源的容器逆向出完整布局，做到**解析→重建→逐字节比对完全一致**（`roundtrip()`）。注释里记录了事故：显示名越界踩到 `0xA8` 的主题表会让整包解析失败。

## 1.5 深入：不重启即生效的原理（以隐藏/显示应用为例）

前面 1.4 的两条是"换外观"，这一节是**结构性改动**——把一个应用从桌面上拿掉/加回来。
这是最能说明"不重启"本质的例子，因为它有一个**明确的传统做法**可以对照。

### 1.5.1 桌面上有什么：两份文件 + 一份内存记录

固件（`p67tc` 3.101.043，与 Shell++ 的 043 target 一致）用两份 JSON 描述应用：

| 文件 | 含义 |
|---|---|
| `/data/apps.json` | **可见**应用注册表 |
| `/data/apps.json_hide` | **隐藏**应用注册表（可选，不存在 = 从没隐藏过） |

结构是顶层 object，键 `"InstalledApps"` → 数组；条目字段：
`"package"`（包名，身份字段）、`"names"`（`[{"lang":"defaults","value":"Corona"}, …]`）、
兼容字段 `"name"`/`"appName"`/`"label"`/`"title"`、以及 `"hideFlag"` / `"locked"`。

**这两份文件只是持久化描述。桌面此刻显示什么，取决于内存里的三样东西：**

1. **应用注册表**（`APP_REGISTRY`，`fw_api/sys.rs:256` = `0x200E_B640`）——一根带哨兵的**循环链表**，
   节点 `+0x04` 链表指针 / `+0x08` 包名（堆串）/ `+0x0C` 图标路径（堆串）/ `+0x10` u16 `app_id` / `+0x14` 其它串。
   取证自 `app_lookup`（`0x0CA69934`）：`ldr r1,[r3]` 取哨兵 → `ldr r3,[r1,#4]` 取首节点 → `cmp/beq` 判回环 → `ldrh r2,[r3,#0x10]` 取 app_id。
2. **桌面记录链表**（`LAUNCHER_DESKTOP_LIST`，`0x200D_0CBC`）——**当前页**的实际记录。
   注意它是"当前页"的，所以 `fw_list_head(LAUNCHER_DESKTOP_LIST) == 0` 时说明**此刻没有桌面记录**
   （比如正待在自己的应用里）——这正是"恢复原图标有时点了没反应"的原因：`launcher_refresh_app`
   在 `0x0C513BD0` 处 `cmp r0,#0 / beq` 直接早退。
3. **LVGL 图标对象**——记录里挂着的图像对象。

### 1.5.2 Chaos 的做法：**文件搬移 + 直接调固件自己的 launcher 接口**

`appmgr.rs` 把流程拆成"先落盘、再改内存"：

**第一步：注册表搬移（持久化）**

`op_hide_pkg()`（`appmgr.rs:848`）：
```
1) 隐藏注册表: load_file(apps.json_hide) → parse_registry(1) → serialize(…, 2) 追加并写 hideFlag:true
2) 可见注册表: capture(pkg, 0) → serialize(SKIP_OFF, SKIP_LEN, 0) 删掉该对象 → 写回 apps.json
```
`op_show_pkg()`（`appmgr.rs:867`）是**反向**：先往可见注册表追加（并**摘掉** `hideFlag`），再从隐藏注册表删除。

`serialize()` 的 `append` 参数是 `0=不追加 / 1=追加原样(摘 hideFlag) / 2=追加并写 "hideFlag":true`；
其余字段**原样保留**，未知顶层键**原样复制**。

**第二步：即时生效（调固件的桌面接口）**

`apply_immediate(hide)`（`appmgr.rs:182`）：

```rust
unsafe fn apply_immediate(hide: bool) {
    let id = find_app_id(core::ptr::addr_of!(REQ_PKG) as *const u8);
    if id == 0 { return; }                      // 找不到节点就只写文件, 不猜
    if hide { fw_api::app_launcher_del(id); } else { fw_api::app_launcher_add(id); }
}
```

`find_app_id()`（`appmgr.rs:164`）沿 `APP_REGISTRY` 链按包名找节点，读 `+0x10` 的 u16 app_id；
**找不到就返回 0 并静默跳过**——注释写得很清楚："找不到注册表节点（应用此刻不在册）时只写文件，不调固件调用 —— 不猜"。
这是很克制的取舍：此时文件改动仍会在下次重启生效，与旧行为一致。

两个固件函数（取证见 `fw_api/sys.rs:320-345`）：

| 函数 | 地址 | 行为 |
|---|---|---|
| `app_launcher_del(app_id)` | `0x0C513B2C` | 在桌面记录链按 `ldrh [rec]==app_id` 找记录 → 删图标对象 → 链上摘记录 → 顺序表摘目 → `free` → relayout。**只删桌面记录+图标对象，不卸载、不碰注册表** |
| `app_launcher_add(app_id)` | `0x0C513A44` | 经 `FUN_0c513700` 按**注册表节点**建记录（应用不在册时拒绝返回 0），插入顺序表后 relayout |

两者的身份都靠函数尾字面量确立：`app_launcher_del` / `"[%s] %s: app_launcher_del app"`
与 `app_launcher_add` / `"add icon: %s"`。

### 1.5.3 关键：这正是**固件自己**"隐藏应用"用的那条路

`fw_api/sys.rs:327` 的取证结论：

> 固件自己的"隐藏应用"命令（`hidden_and_show` cmd `0x1a`，日志 `"hidden appid %lu"`，`0x0C5141F0`）
> **就是这一条 del**；没有任何持久化——重启后是否再现完全由注册表（`/data/apps.json`）决定。

而 `data_init`（`0x0C513E90`，从 `launcher.db` 重建记录）**只在开机总初始化时跑一次**，
进桌面不会撤销 `del`。

**所以 Chaos 并没有发明什么新机制，它做的是：**
1. 先用**应用管理页的 UI** 帮用户编辑那两份 JSON（这是固件自己不提供的部分——固件只给了一条 `del` 命令）；
2. 编辑成功后，**调固件自己那条已经在用的 `del`/`add`**，于是桌面立刻响应。

### 1.5.4 和"传统重启生效"的本质差别

社区过去的做法（以及 Chaos 早期版本）是：**只改 `/data/apps.json`，然后重启**。

| | 传统做法 | Chaos 的做法 |
|---|---|---|
| 改了什么 | 只有**磁盘上的 JSON 文件** | 磁盘 JSON **+ 内存中的桌面上三样结构** |
| 靠什么生效 | 靠**开机时**固件重新读文件、重建注册表与桌面记录 | 靠**当场调用固件的 launcher 接口**，不必等重建 |
| 生效时机 | 下一次开机 | 立刻（下一个 50ms tick） |
| 失败模式 | 改坏了要重启才发现 | 文件写回失败就**根本不调**固件接口，界面保持原样 |

**本质：**
- "重启生效"是因为**内存态的唯一权威来源是开机时从文件构建的那一次**。
  运行时文件变了，内存不会自己知道——没有 watcher，也没有重读命令。
- Chaos 的突破口是：**内存态虽然不监听文件，但它**有接口**。**
  `app_launcher_del` / `app_launcher_add` 是固件自己已经在用的两个"改内存态"的函数，
  只要先拿到 `app_id`，就能直接驱动它们。
  于是"持久化"和"生效"这两件事被**解耦**了：前者写文件，后者调函数。

这和 1.4 的换字体/换图标是**同一个套路**——**不去改状态，而是找到固件自己用来改状态的那个动作，替它按下去**。
换字体是找 `fw_style_set_font` + 让 face 名字唯一化来绕开缓存；换图标是找 `launcher_refresh_app` 重读路径；
隐藏应用是找 `app_launcher_del`。三者都是"借用固件既有机制"，正是 1.3 那句核心哲学的具体化。

### 1.5.5 这条路上踩到的三个坑（都在注释里留了记录）

1. **`+0x0C` 图标路径必须是自己 `str_dup` 出来的堆指针。** 注册表注销路径会对
   `+0x08`/`+0x0C`/`+0x14` 逐个 `free`；若塞进 `.rodata` 地址，固件注销时就会 free 一个非堆指针 = **堆损坏**。
   所以 `fw_str_dup`（`0x0C1F06B5`）必须用**同一个分配器**。
2. **`img_free_by_path` 必须在改指针之前调。** 图像缓存以**路径**为键（38 个 × ~50KB），
   改了指针再释放就找不到旧对象了。照抄固件自己那处（`hidden_and_show` `0x0C51421E` 读当前路径 → `0x0C514222` 释放）。
3. **写回策略不能用 `truncate`/`rename`。** 内存重组后按原偏移 `open(WRONLY|CREAT)` 原位写回；
   新内容更短时**用空格填充到原长度**（尾部空白是合法 JSON）。
   理由写在 `appmgr.rs:22-24`：固件侧没有拿到 `truncate`/`rename` 的实证地址，
   **"这里只允许已真机验证过的 open/read/write/close/remove"**。
   另外：列表被截断/对象溢出/解析失败时**拒绝一切改写**（`write_blocked()`），因为改写只保留有记录的对象，未记录的会被丢掉。

### 1.5.6 小结：一句话

> **"要不要重启"不是由改动的大小决定的，而是由"你有没有固件自己的那个动作"决定的。**
> 没有那个动作，就只能改文件、等开机重读；找到了那个动作，就能当场生效。
> Chaos 的价值不在于它想改什么，而在于它**总能找到固件自己已经在按的那个按钮**。

## 1.6 缺陷与风险

### `MAX_PID` off-by-one —— ✅ **已于本次更新（`d3343dc`）修复**

**修复前**（`state.rs:127-129`，本文初版分析时）：

```rust
pub const PAGE_COUNT: usize = 15;          // 注册页数(页0..页13)
pub const MAX_PID: usize = PAGE_COUNT - 1; // 页号上界
pub static mut DESC: [u32; 435] = [0; 435];  // 注释: 14 页 × 29 word
```

注释写"页0..页13"（14 页）但常量是 15 → `MAX_PID = 14`，而实际只注册 0–13。
所有 `pid <= MAX_PID` 检查（`ui.rs:28/68/101/221/316/377/441`、`watchface.rs:397/411`）都会放 pid 14 通过。
数组长 15 所以不越界，属潜伏缺陷。

**修复后**（当前 `HEAD = d3343dc`）：

```rust
pub const PAGE_COUNT: usize = 17;          // 注册页数(页0..页16)
pub const MAX_PID: usize = PAGE_COUNT - 1; // 页号上界, 所有 pid 校验统一引用它
pub static mut DESC: [u32; 493] = [0; 493]; // 17 页 × 29 word(116B/页)
```

`PAGE_COUNT` 与注释、与 `DESC` 容量（17×29 = 493）**三者现已自洽**，`MAX_PID = 16` 正确。
新增两页：`PAGE_ZONE = b"blurzone\0"`（页15，系统模糊→模糊区域）、`PAGE_VIB = b"vibtest\0"`（页16，主页→震动）。
`ipc.rs:135` 的 `pnames: [u32; PAGE_COUNT]` 也随 `PAGE_COUNT` 自动扩展，注册循环 `while pg < PAGE_COUNT` 覆盖 0..16。

**教训**：这条修复印证了原报告的建议是对的方向——**"注册页数"这类数字必须与容量常量、与注释三者同源**，
而当时唯一能发现矛盾的手段是人工比对三个数字。项目里已经用 `MAX_PID = PAGE_COUNT - 1` 让代码侧同源了，
但 `DESC` 的容量仍是手写的 `493`，**没有 `const _: () = assert!(DESC.len() == PAGE_COUNT * 29);`** 这类静态断言——
下次加页时同样的矛盾会以"数组越界"的形式重现。

### 指针保护是"防垃圾"而非"防 UAF"

`plausible_ptr` 只查非空/对齐/地址窗口，窗口内的**失效指针（已释放的 LVGL 对象、被复用的堆块）照样通过**。真正的 UAF 防线是 `page_is_live()`（`ui.rs:67`）+ `built` 这个**双门约定**——靠注释和调用者自觉（`icon_apply.rs:925`、`watchface.rs:267` 记载该约定，所有观察到的调用点都遵守），类型系统不保证。

### 其他具体风险（来自代码审查）

| 位置 | 问题 |
|---|---|
| `font_hot.rs` `sweep()`（269-296） | 判定 `pm` 异常（写 `FH_ERR=12`）后**不返回**，继续拿未校验的 `pm` 走 `rd32(pm+16)` 链表 → 任意地址遍历（`n > 4096` 只限迭代次数，不限地址有效性） |
| `font_hot.rs` `revert_all()`（310-348） | O(n²)：≤224 项 × ≤4096 节点，最坏 ~91.7 万次节点访问，且跑在 50ms UI tick 上 |
| `font_hot.rs:23` | `SW_CAP=224` 是硬失败：表中一旦填满"交换后又换回"的记录，`swap_one` 返回 0 而**记录仍保持已交换**，无淘汰/压缩 |
| `font_apply.rs` `apply_start()` push 闭包 | 队列满（`n>=FA_JOB_MAX`）时**静默丢任务**，无计数器。`FA_JOB_MAX=176` 而实际表项和 173（108+33+9+23）——未来任何扩容都会静默失效 |
| `font_apply.rs` `EXTRA_ACTIVE=33` | 而 `EXTRA_STYLES` 有 41 项（后 8 项被跳过）。对非 style 对象调 `style_set_font` 会让固件把普通数据当属性数组解析 → 野指针写 → 崩溃（**实测于队列索引 110**）。排除方式是对 `0x2010C180`/`0x2010C16C`/`0x2010C31C`/`0x2010C4E8`/`0x2010C4D8` 的**地址黑名单**，无运行时类型检查 |
| `font_apply.rs` `fa_face_of` | 命中的 `f==0` 会"break 并原地重建"，永久失败的字体名会反复进入 `fw_mfont_create_named`（昂贵的 FreeType 读取） |
| `font_apply.rs` | `FA_TRY_MAX=3`，3 次失败后自动应用**本会话永久停止**，无 UI 提示 |
| `res_hook.rs` `scan_node_step`（535） | 在 `0x2000_0000..0x2016_0000` 按 32KB 步长扫 `word==FS_DRV`，**多于 1 个候选就完全放弃**（`RH_SCAN=2`）。启发式指针猜测 |
| `res_hook.rs` | `RH_PATH_CAP=128` 与 `RH_CACHE_PATH[96]` 两个路径缓冲容量不同，无静态断言保证规则目录+文件名同时装得下 |
| `font_list.rs` `fl_write()`（194-229） | 写 `off+3+k`（`k < FL_NAME_CAP-1 = 15`），即写到 `off+17`——**越过 16 字节行边界**进入下一行的槽号字节。当前靠"下一行稍后被写"侥幸无害，但对**最后一行**（`n == FL_N-1`）脏字节留在缓冲里。循环上界应是 `FL_LINE-3-1` 而非 `FL_NAME_CAP-1` |
| `font_list.rs` `delete_tick()` 阶段 11（583-597） | 删文件后要等**下一个 tick** 才检查并 `clear_live()`；`request_revert()` 是 fire-and-forget，若 revert 队列被丢弃（如 `manager_ready()` 为 false）则 `revert_busy()` 可能永不非零，**阶段 11 无超时永久空转** |
| `icon_apply` 点击回调 | 仍在 LVGL 事件派发上下文里直接 `refresh_rows()`，而 `font_list.rs:471-472` 明确记载这个模式对字体行是崩溃轴——`font_list::click_feedback`（516-522）特意通过 `window_is_quiet()` 延迟。**已知危险模式仍有存活副本** |
| 跨模块 | 三处独立权威（`font_apply::live_get()`、`icon_apply::IC_STATE`、`res_hook::RH_ON`）靠**轮询而非排序**，依赖关系**全无超时** |
| 全局 | `static mut` 遍地（`PAGES`/`DESC`/`APP_META`/`NOTIF`/`THUNKS_BUF`/`CHAOS_DATA_MAGIC`），**无临界区**，正确性完全依赖"单线程 lv_timer"这一**从未被断言**的假设。`font_hot` 的两处 body 写是最明显的承重点 |
| `watchface.rs:372-377` | `tick_adapt` 在第一次周期不匹配后**永久放弃**自适应（写 `TICK_ADAPT=0`），退化到固定 50ms 节拍。自适应逻辑在第一次不匹配后即成死代码 |

## 1.7 质量评价

**明显强于同类逆向项目的部分：**

- 注释记录 **why** 而非 what，且每条红线都附**症状 + 反汇编地址**（如"实测崩溃于队列索引 110"、"`row_set_trailing` 跳转表 @`0x0C4C8220`"，表字节 `4a4e 600d 0d77 8e97 9c0d 0da5 0724`）。这类注释让回归变得可见。
- **单一事实来源**做得认真：`MAX_ROWS_PER_PAGE` 被 `fw_api.rs:53` 再导出，清理循环一律引用它并附注释说明为何不能写死（历史上槽位 10→12 而清理仍写 `<10` → 悬空句柄 → UAF）。
- **失败关闭**：`FH_ERR` 10–27、`FL_MSG` 3–6 等错误码带屏上读数。
- **可逆性被当作一等公民**：不碰固件分区、让出 hook 槽位、恢复系统字体后才删字体文件。
- 幂等守卫（`CTOR_DONE` state.rs:133、`DRIVER_ON` state.rs:135）防止双构造。
- 自愈路径（`watchface.rs:395-407`）在句柄存在但树已丢（`built == 0`）时重建页面，且**用 `screen_is_on()` 作为门**（黑屏时重建只是白耗电），并有 3 次尝试预算。推理正确、注释充分。

**弱点：**

- 魔数密集（`0x2010C180`、`0x2CCE1734`、224 / 176 / 128 / 4096 / 1200 / 512），且关键推导（173 vs 176）**没有任何断言**
- 索引格式在字体/图标层**刻意重复**（`font_list.rs:9-10` 注明"刻意不抽公共模块"），三处必须字节一致却无编译期校验
- 裸页面 id 整数绕过 `*_PID` 常量（如 `beautify_restore.rs:136` 的 `page_is_live(13)`）
- 错误处理是布尔/`0` 哨兵，无法区分失败原因
- 命名混合英文标识符与中文注释
- 硬编码中文 UI 字符串内联在逻辑里而非表中
- 我**无法编译验证**，所有结论基于静态阅读

## 1.8 合规与生态

README 的「许可与合规」一节诚实得少见，明确区分了三件事：

1. **代码**：AGPL-3.0 全文已落盘（34,523 字节，sha256 `0d96a4ff…`，实测一致）
2. **逆向事实**（固件地址、结构偏移、协议字节）：作者主张不受版权保护——法律上可争辩，但属合理主张
3. **发布前必须剔除的授权问题**：`assets/fluent_lvgl/` 是 GPL-3.0（需附许可文本 + 上游出处，且微信/亚马逊 logo 商标权独立）；`assets/licenses/` 那套第三方声明**尚未完成**（`fonts/OFL.txt` 与安卓 App 的声明列为未做）

**Git 历史**：28 commits，2026-10-01 → 2026-10-16，2 位作者（YiYang 20，IKUN_CXKPRO 8）。约 15.7K 行。

**最优先的修改建议（已部分完成）**：原建议是把 `PAGE_COUNT` 改成真实页数——作者在 `d3343dc` 里正是这么做的
（改成 17 并同步 `DESC`）。**剩下的一步是加静态断言**让三者再也不会各说各话：

```rust
const _: () = assert!(DESC.len() == PAGE_COUNT * 29);
```

---
# 附录 A：关键地址速查表（Chaos-Module 部分）

## Chaos-Module 项目

| 项 | 值 |
|---|---|
| 仓库 | `https://github.com/WenHuaYiYang/Chaos-Module` |
| 许可 | AGPL-3.0（34,523 字节，sha256 `0d96a4ff…`） |
| 目标固件 | 小米手环 10 Pro `3.101.043` |
| 提交 | 28 commits，2026-10-01 → 2026-10-16 |
| 作者 | YiYang (20), IKUN_CXKPRO (8) |
| 代码规模 | ~15.7K 行 |
| 容器魔数 | `0x1234A55A` |
| 预览块标签 | `0x410` |
| 记录 uid 基 | `0x05000000` |
| 记录表偏移 | `0x148` |
| 包名 | `0x28`，12 字节 |
| 显示名 | `0x68`，64 字节 |
| 主题表 | `0xA8..0x147`；文件数在 `0xD8`；主题名 `0x100` |

### Chaos 用到的固件地址

| 符号 | 地址 | 说明 |
|---|---|---|
| `obj_set_size` | `0x0C588629` | Thumb 指针 |
| `row_create` | `0x0C54CA3D` | Thumb 指针 |
| `row_init` | `0x0C4C8560` | 样式快照点 `0x0C4C86BC` |
| `row_set_trailing` | `0x0C4C8208` | tbb 跳转表 @`0x0C4C8220` |
| `launcher_refresh_app` | `0x0C513BC0` | |
| 字体缓存 | `0x0C85F9BC` | 键 = (name, size) |
| 信号-6 日历回调 | `0x0C4EFDE8` | 写 112×112 RAM 图像描述符（magic `0x19`） |
| LVGL 驱动 open 槽 | `0x2010_334C` | 原值 `FS_OPEN_ORIG=0x1C057C51` |
| 驱动结构体 | `0x2010_3340` | |
| 字体默认回退 | `0x2CCE1734` | `LV_FONT_DEFAULT` |
| 表盘管理全局 | `0x2013_FE6C` | `WF_MGR_PTR` |
| 引擎当前面 | `0x2011_9770` | `WF_ENGINE_CUR` |
| 权限测试串 | `0xbc5bc0` | `permissions_test`（文件偏移） |
