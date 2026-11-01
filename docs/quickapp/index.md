---
title: 快应用
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://iot.mi.com/vela/quickapp/zh/guide/"
contributors: [miband-dev]
---

# 快应用

<StatusBadge status="sourced" verified="2026-11-01" />

快应用使用类 Vue 的 JS 语法编写界面，由 VelaOS 中的 AiotJS 运行时执行，打包为 `.rpk` 安装到设备。在应用层中，快应用是唯一具备公开官方文档的形式，上手成本也最低。

## 可用能力

- 页面、组件、路由与动画，源码文件为 `template` / `style` / `script` 三段结构；
- 调用系统能力：健康数据、传感器、通知、存储、振动，是否可用取决于权限声明与固件版本；
- 接入 AI 能力接口，可用性与机型相关。

## 不可用能力

- 访问文件系统、加载原生库、修改系统行为，这些属于[固件](/platform/firmware/)与[原生](/native/)层；
- 绕过应用商店或付费机制；
- 忽略屏幕适配。各机型分辨率、圆角与安全区差异较大，需按[机型能力矩阵](/start/models)适配。

## 前置条件

| 项 | 说明 |
| --- | --- |
| AIoT IDE | 官方 IDE，含模拟器，主要面向 Windows |
| 一台真机 | 可选。没有真机时相关内容只能标 `sourced` |
| 基础 | JS，能读懂 Vue 单文件组件 |

## 本章页面

| 页面 | 内容 | 状态 |
| --- | --- | --- |
| [环境搭建](/quickapp/setup) | AIoT IDE 安装、最小工程、模拟器、打包 | 已上线 |
| [工程结构](/quickapp/structure) | `manifest.json`、`src/app.ux`、页面与权限字段 | 骨架 |
| [能力](/quickapp/capabilities) | 健康、传感器、通知、存储、AI 的可用性 | 骨架 |
| [运行时与 fetch](/quickapp/runtime) | JIDL、模块注册、feature 裁剪、`fetch` 的故障模式 | 已上线 |
| [打包方式](/quickapp/package) | `.rpk` 生成、签名与安装 | 骨架 |
| [常见问题](/quickapp/pitfalls) | 社区记录到的失败案例与判断方法 | 已上线 |

## 与官方文档的关系

从 Hello World 到打包 `.rpk` 的完整流程已有官方文档，本站不再重复编写教程，仅补充机型差异、可检索索引与社区记录到的失败案例。

官方入口：

- [开发教程](https://iot.mi.com/vela/quickapp/zh/guide/)
- [组件](https://iot.mi.com/vela/quickapp/zh/components/)
- [JS 接口](https://iot.mi.com/vela/quickapp/zh/features/)
- [工具](https://iot.mi.com/vela/quickapp/zh/tools/)
- [示例](https://iot.mi.com/vela/quickapp/zh/samples/)
- [澎湃 OS 快应用平台](https://dev.mi.com/xiaomihyperos/quickapp-develop)

## 相邻板块

- 表盘（普通表盘 / Lua 表盘）：[表盘](/watchface/)
- 自编译 C 代码：[原生应用](/native/)
- 手机侧作为中心设备连接手环：[BLE 协议](/platform/protocol/ble)
