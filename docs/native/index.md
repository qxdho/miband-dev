---
title: 原生应用
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/06-内核模块系统.md"
contributors: [miband-dev]
---

# 原生应用

<StatusBadge status="sourced" verified="2026-10-25" />

原生应用绕过 JS 运行时，直接在 NuttX 上加载自编译的 C 代码：把模块编译成 `ET_REL` 格式的 ELF，通过 `insmod` 装入内核。

目前只有 10 Pro（`p67cn` / `M2551B1` / 固件 `3.101.043`）具备可加载模块的 `modlib` 子系统，9 Pro 的固件里没有这个子系统。

## 原理

以下流程来自社区逆向与固件分析，没有官方文档支撑，`status: sourced`，可能随固件版本变化。

1. 系统为 NuttX 加 LVGL，应用层另有 AiotJS 运行快应用、Lua 驱动表盘；
2. 从 Lua 表盘调用 `os.execute()` 可获得 shell；
3. 执行 `insmod /data/xxx.ko` 将 `ET_REL` 可重定位目标文件作为内核模块加载；
4. 模块通过 `miwear_app_t`、`miwear_page_t` 结构体注册界面，通过 `packagemanager_api_s`（`install`、`recover`、`uninstall`、`unregister`、`set_hidden`、`is_hidden`）接入应用管理。

模块不能导入符号，调用固件函数需要把地址硬编码进贴片函数，细节见[内核模块系统](/native/modules)。

## 能力与代价

- 可直接调用 LVGL 绘制界面、访问设备节点，完成快应用做不到的操作；
- 没有调试器与沙箱，内核态错误可能导致死机；模块位于 RAM，重启可恢复；
- 地址与固件版本强绑定，换版本需要重新恢复整套符号；
- `persistent_autoload = false`，重启后需要重新加载。

## 前置条件

| 项 | 说明 |
| --- | --- |
| C 与交叉编译 | 熟悉 C、交叉编译、ELF 格式与链接器 |
| 恢复能力 | 已在[固件](/firmware/)层完成备份，掌握恢复方法 |
| 目标机型 | 目前只有 band10pro 有公开可行的记录，见矩阵 `native` 字段 |

## 本章页面

| 页面 | 内容 | 证据等级 |
| --- | --- | --- |
| [内核模块系统](/native/modules) | modlib 能力、`ET_REL` 格式、重定位、贴片函数、最小验证模块 | 固件字节 |
| [Canopus](/native/canopus) | 安装器、target pack、已恢复符号、Lua 表盘驱动 | 固件字节 |
| [Chaos](/native/chaos) | 架构、四个结构性设计、与 Canopus 的差异 | 上游源码 |
| [LVGL 与界面](/native/lvgl) | 控件树、布局、事件派发、四个 UI 缺陷的成因 | 固件字节 |
| [圆环与 ARC 控件](/native/arc) | `lv_arc` 字段布局、绘制顺序、角度 setter、配色来源 | 固件字节 |
| [应用隐藏与免重启](/native/app-hiding) | 隐藏状态的三层结构、重启行为、两种模式取舍 | 固件字节 |
| [控制中心与地址视图](/native/control-center) | 双映射换算、跳板表、46 个磁贴回调、已封存的结论 | 固件字节 |
| [Chaos 代码审查](/native/code-review) | 审查范围、问题清单、影响与修复建议 | 上游源码 |

尚未整理：注册界面的最小结构、包管理接口各函数语义、部署与回滚步骤。

## 相邻板块

- 只需呈现界面：[快应用](/quickapp/)或[表盘](/watchface/)
- 修改系统行为而非新增模块：[固件](/firmware/)层
- 与手机通信：[协议](/protocol/)层
