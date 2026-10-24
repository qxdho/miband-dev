---
title: 固件与原生
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/03-系统架构.md"
contributors: [miband-dev]
---

# 固件与原生

<StatusBadge status="sourced" verified="2026-10-25" />

系统层分为两件事：理解并操作固件本身，以及在 NuttX 上加载自编译的 C 模块。两者都直接作用于设备，操作前需要具备备份与恢复能力。

## 固件

备份、读取分区、解包、理解启动链与刷写。固件包格式与系统架构见[固件导读](/system/firmware/)。

## 原生

把 C 代码编译成 `ET_REL` 格式的 ELF，通过 `insmod` 装入内核，绕过 JS 运行时直接调用 LVGL 与设备节点。原理、模块系统与已恢复的符号见[原生导读](/system/native/)。

## 本章页面

| 页面 | 内容 | 证据等级 |
| --- | --- | --- |
| [固件导读](/system/firmware/) | 适用机型、风险、前置条件 | — |
| [固件包格式](/system/firmware/package) | 包结构、分区、镜像格式 | 固件字节 |
| [系统架构](/system/firmware/architecture) | NuttX、启动链、文件系统布局 | 固件字节 |
| [原生导读](/system/native/) | 原理、能力与代价、前置条件 | 固件字节 |
| [内核模块系统](/system/native/modules) | modlib、重定位、贴片函数 | 固件字节 |
| [Canopus](/system/native/canopus) | 安装器、target pack、Lua 表盘驱动 | 固件字节 |
| [Chaos](/system/native/chaos) | 架构、四个结构性设计 | 上游源码 |
| [LVGL 与界面](/system/native/lvgl) | 控件树、布局、事件派发 | 固件字节 |
| [圆环与 ARC 控件](/system/native/arc) | `lv_arc` 字段布局与绘制 | 固件字节 |
| [应用隐藏与免重启](/system/native/app-hiding) | 隐藏状态的三层结构 | 固件字节 |
| [Canopus 地址手册](/system/native/addresses) | 259 条符号地址与可做性分析 | 固件字节 |

## 风险提示

固件操作可能导致变砖、数据丢失与保修失效。备份与恢复方法排在刷写之前，不确定的操作先在[机型能力矩阵](/start/models)确认设备是否支持。

## 相邻板块

- 只做界面与应用：[应用与表盘](/apps/)
- 与手机通信：[协议、工具与参考](/refs/)
