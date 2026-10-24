---
title: 应用隐藏与免重启模式
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/14-应用隐藏与免重启模式.md"
contributors: [miband-dev]
---

# 应用隐藏与免重启模式

<StatusBadge status="sourced" verified="2026-10-25" />

隐藏与显示快应用必须重启，根因是固件按 `/data/apps.json` 在开机时重建内存注册表：条目被移出该文件后，重启后不会为对应应用建节点，之后的显示操作找不到节点，只能再重启一次。

结论：固件没有可安全调用的运行时重新注册入口。免重启显示只能保留 `apps.json` 条目，用注册表隐藏位加开机补偿维持隐藏状态。两种模式各有代价，默认仍是重启模式。

## 现象

- 隐藏应用后桌面图标立刻消失，`app_launcher_del` 返回成功。
- 重启后写回 `/data/apps.json` 并点显示，图标不出现，必须再重启一次。
- 开机日志出现一批 `[launcher] app_launcher_del: app_launcher_del app`，没有 `add icon`。

## 固件维护三层状态

| 层 | 位置 | 作用 |
| --- | --- | --- |
| 持久化名单 | `/data/apps.json`、`/data/apps.json_hide` | 开机时决定哪些应用已安装 |
| 内存注册表 | `APP_REGISTRY`（`0x200E_B640`）链表 | 运行时按包名或 app_id 查找应用；节点 `+0x08` 包名、`+0x0C` 图标路径、`+0x10` app_id |
| 桌面图标 | `LAUNCHER_DESKTOP_LIST` 加 LVGL 对象 | 用户看到的图标；`app_launcher_del/add` 只改这一层 |

常规隐藏做法是把条目从 `apps.json` 搬到 `apps.json_hide`。条目一旦不在 `apps.json`，下次开机固件即认为该应用未安装，不会为它创建注册表节点。

## 清隐藏位对未注册节点无效

`app_launcher_add`（`0x0C51_3A44`）先按 app_id 查注册表节点，节点不存在直接返回 0。节点存在时进入建记录回调 `FUN_0C513700`：

```text
ldrb.w r2, [r0, #0x3c]
lsls   r1, r2, #31        ; bit0 = “应隐藏”
bmi    0x0C5137A4         ; 打 “The app need hidden”，返回 0
```

由此有两条结论：

- 对仍在注册表里的节点，清掉 `+0x3C` 的 bit0 后 `add` 能成功；
- 对重启后根本没注册的应用，`find_node` 返回 0，清位代码执行不到，`add` 不可能成功。

第二条是「必须再重启」的直接原因。

## 运行时注册入口

固件与公开实现中都不存在可安全调用的通用入口：

| 入口 | 结论 |
| --- | --- |
| `quickapp_register_app`（`0x0C54_9679`） | 能建节点并调用 `app_launcher_add`，但传入空 `extra` 会在 `strdup(NULL)` 处崩溃，已真机触发 busfault；该函数是 interconnect 内部路径，不保证本地快应用可启动 |
| `quickapp_install_locally` | native handler 最终仍走 `quickapp_register_app`，参数来自 proxyquickapp 内部，Lua 与模块无法直接构造 |
| `launcher_data_init` | 只在开机总初始化时运行一次，没有对外 reload API |
| 社区实现 | Shellpp-II 的应用管理文档同样写明 hide/show 需重启生效，未提供免重启注册 |

因此运行时补注册在现有固件上没有可靠实现。

## 两种模式

Chaos 应用管理页 1 顶部提供「免重启显示」开关，状态保存在 `/data/chaos/appmgr_apply.cfg`。

| 项 | 模式 A：重启生效（默认，开关关） | 模式 B：免重启显示（开关开，保留条目） |
| --- | --- | --- |
| 隐藏 | 条目从 `apps.json` 移入 `apps.json_hide`，同时置节点 `+0x3C` bit0、删除图标 | 不动 `apps.json`，只把包名记入 `/data/chaos/appmgr_keep.bin`，置 bit0、删除图标 |
| 显示 | 写回 `apps.json`，重启后由固件重新注册；本机仍能找到节点时立即 `add` | 从名单摘除，清 bit0、`add` 图标，立即生效 |
| 生效时机 | 重启后 | 立即 |
| 配置语义 | 与其它工具读写同一份配置一致 | 与 `apps.json` 的实际可见性不一致 |

### 模式 A：重启生效

- 隐藏与显示都以 `apps.json` 与 `apps.json_hide` 之间的搬迁为准，重启后固件重新注册；
- 本机仍能找到节点时，`add` 可立即执行，但重启后仍以名单为准；
- 与其它工具共用同一份配置，语义最一致，是默认模式。

### 模式 B：免重启显示

- 隐藏时保留 `apps.json` 条目，只记录包名并置 bit0、删除图标；
- 显示时从名单摘除、清 bit0、`add` 图标，不重启即生效；
- 开机补偿由模块的定时器在启动窗口结束后读名单，逐个置 bit0、删图标，避免图标留在桌面。

模式 B 的代价：

| 代价 | 说明 |
| --- | --- |
| 开机瞬间图标闪现 | 取决于 `rc.d` 与桌面初始化的先后 |
| 其它工具误判 | 读 `apps.json` 会认为该应用仍可见、已安装 |
| 首次显示仍需重启 | 切换模式前已在 `apps.json_hide` 中的应用，节点要等下次开机才注册 |
| 切回模式 A 需重启 | Chaos 会把名单条目搬进 `apps.json_hide`，随后仍需重启 |

两种模式都只改应用名单与图标，不删除应用数据。

## 操作步骤

### 模式 A

1. 打开 Chaos 应用管理页 1，确认「免重启显示」开关处于关闭状态。
2. 在列表中选择应用执行隐藏，条目由 `apps.json` 移入 `apps.json_hide`，图标随即消失。
3. 重启设备，固件按新名单重建注册表，应用不再出现。
4. 需要恢复时执行显示，条目写回 `apps.json`，界面提示「重启后显示」。
5. 再次重启，固件重新注册节点并建立图标。

### 模式 B

1. 在页 1 打开「免重启显示」开关，配置写入 `/data/chaos/appmgr_apply.cfg`。
2. 执行隐藏，包名写入 `/data/chaos/appmgr_keep.bin`，图标立即消失。
3. 执行显示，包名从名单摘除，图标立即恢复，无需重启。
4. 隐藏后重启设备时，模块在启动窗口结束后执行补偿，重新置 bit0 并删图标。

## 排除项

`/data/chaos/appmgr_excl.bin` 记录不参与一键隐藏或显示的应用，格式为 `EX01` 加 40×44 字节包名。被排除的应用不出现在页 1 列表，可在页 7 逐项取消。排除项只影响一键操作，不影响单点隐藏与显示。

## 验证清单

| 场景 | 预期 | 状态 |
| --- | --- | --- |
| 模式 A：隐藏后重启 | 可见列表为隐藏态 | 已证实 |
| 模式 A：点显示后重启 | 提示「重启后显示」，重启后图标回来 | 已证实 |
| 模式 B：隐藏 | 图标立即消失 | 已证实 |
| 模式 B：显示 | 图标立即回来，不重启 | 已证实 |
| 模式 B：隐藏后重启 | 图标不回来，允许开机瞬间闪现 | 已证实 |
| 模式 B 切回 A：已有隐藏项 | 条目进入 `apps.json_hide`，重启后仍隐藏 | 已证实 |
| 排除项 | 一键操作跳过，页 1 不显示，页 7 可取消 | 已证实 |

## 未决问题

| 问题 | 状态 |
| --- | --- |
| 开机补偿的实际时间窗与图标闪现时长 | 待定，需真机录像确认 |
| 模式 B 下米环管理、SmartHome 读到「可见」后的行为 | 待定，未做交叉验证 |
| 未来固件是否暴露可靠的本地安装或重注册 API | 待定，若提供可去掉模式开关，统一为免重启 |

## 相关页面

- 快应用的安装与卸载流程：[快应用](/apps/quickapp/)
- 应用管理功能的实现方：[Chaos](/system/native/chaos)
- 快应用在系统中的注册与启动路径：[运行机制](/apps/quickapp/runtime)
- 安装与显示的常见故障：[常见问题](/apps/quickapp/pitfalls)
