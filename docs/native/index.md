---
title: 原生应用
models: [band10pro]
firmware: "3.101.043"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/installer"
contributors: [miband-dev]
---

# 原生应用

<StatusBadge status="sourced" verified="2026-11-01" />

原生应用绕过 JS 运行时，直接在 NuttX 上加载自编译的 C 代码：模块被编译为 `ET_REL` 格式的 ELF，并通过 `insmod` 装入内核。

目前仅 10 Pro（`p67cn` / `M2551B1` / 固件 `3.101.043`）具备可加载模块的 `modlib` 子系统，9 Pro 的固件中不含该子系统。

::: danger 没有独立安装入口
原生应用没有独立安装入口，也没有应用商店入口。安装过程必须配合一个 Lua 表盘：`.ko` 作为表盘资源打包，由表盘脚本在设备上解包并执行 `insmod`。完整流程见[加载方式](/native/loading)。
:::

## 与快应用的区别

| 维度 | 快应用 | 原生应用 |
| --- | --- | --- |
| 运行位置 | AiotJS 运行时，用户态 | NuttX 内核模块 |
| 代码 | JS / 类 Vue 组件 | C，编译为 `ET_REL` ELF |
| 安装 | `.rpk` 独立安装 | 随 Lua 表盘安装，无独立入口 |
| 能力 | 官方 API 与权限模型 | 可直接调用 LVGL、设备节点、应用管理接口 |
| 安全边界 | 沙箱与权限 | 无沙箱、无调试器，错误可致死机 |
| 机型 | 多款 | 目前仅 10 Pro 有公开可行记录 |

## 原理

以下流程源自社区逆向与固件分析，无官方文档支撑，标记为 `status: sourced`，并可能随固件版本变化。

1. 系统由 NuttX 与 LVGL 构成，应用层另有 AiotJS 运行快应用、Lua 驱动表盘；
2. 从 Lua 表盘调用 `os.execute()` 可获得 shell；
3. 执行 `insmod /data/xxx.ko`，将 `ET_REL` 可重定位目标文件作为内核模块加载；
4. 模块通过 `miwear_app_t`、`miwear_page_t` 结构体注册界面，通过 `packagemanager_api_s`（`install`、`recover`、`uninstall`、`unregister`、`set_hidden`、`is_hidden`）接入应用管理。

模块不能导入符号，调用固件函数需要将地址硬编码进贴片函数，细节见[内核模块系统](/native/develop/modules)。

## 能力与代价

- 可直接调用 LVGL 绘制界面并访问设备节点，完成快应用无法实现的操作；
- 没有调试器与沙箱，内核态错误可能导致死机；模块位于 RAM，重启后即可恢复；
- 地址与固件版本强绑定，更换版本需要重新恢复整套符号；
- `persistent_autoload = false`，重启后需重新加载。

## 前置条件

| 项 | 说明 |
| --- | --- |
| C 与交叉编译 | 熟悉 C、交叉编译、ELF 格式与链接器 |
| 恢复能力 | 已在[固件](/platform/firmware/)层完成备份，掌握恢复方法 |
| 目标机型 | 目前只有 band10pro 有公开可行的记录，见[支持的设备](/native/devices) |

## 本章页面

| 页面 | 内容 |
| --- | --- |
| [支持的设备](/native/devices) | 已证实与未证实的机型、固件与模块子系统 |
| [加载方式](/native/loading) | 为什么必须配合 Lua 表盘，以及完整安装链路 |
| [能力](/native/capabilities) | 可调用的接口、限制与代价 |
| [内核模块系统](/native/develop/modules) | modlib 能力、`ET_REL` 格式、重定位、贴片函数 |
| [最小模块](/native/develop/hello) | 从 `hello.ko` 到加载验证 |
| [Canopus](/native/frameworks/canopus) | 安装器、target pack、已恢复符号、Lua 表盘驱动 |
| [Chaos](/native/frameworks/chaos) | 架构、四个结构性设计、与 Canopus 的差异 |
| [LVGL 与界面](/native/ui/lvgl) | 控件树、布局、事件派发、四个 UI 缺陷的成因 |
| [圆环与 ARC 控件](/native/ui/arc) | `lv_arc` 字段布局、绘制顺序、角度 setter、配色来源 |
| [原生开发模式](/native/ui/patterns) | 三条渲染路径、控件树生命周期、硬编码地址风险 |
| [应用隐藏与免重启](/native/advanced/app-hiding) | 隐藏状态的三层结构、重启行为、两种模式取舍 |
| [控制中心与地址视图](/native/advanced/control-center) | 双映射换算、跳板表、46 个磁贴回调、已封存的结论 |
| [Canopus 地址手册](/native/advanced/addresses) | 259 条符号地址与可做性分析 |
| [Chaos 代码审查](/native/frameworks/chaos-review) | 审查范围、问题清单、影响与修复建议 |
| [示例](/native/examples) | 安装器、探测模块与可构建示例 |

尚未整理的内容包括：注册界面的最小结构、包管理接口各函数的语义、部署与回滚步骤。

## 相邻板块

- 仅需呈现界面：[快应用](/quickapp/)或[表盘](/watchface/)
- 需要修改系统行为而非新增模块：[固件](/platform/firmware/)层
- 需要与手机通信：[BLE 协议](/platform/protocol/ble)
