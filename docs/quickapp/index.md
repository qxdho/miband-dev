---
title: 快应用导读
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://iot.mi.com/vela/quickapp/"
contributors: [miband-dev]
---

# 快应用

<StatusBadge status="sourced" verified="2026-10-24" />

> 用类 Vue 的 JS 写界面，由 VelaOS 里的 AiotJS 运行时执行，打包成 `.rpk` 装到手环。**这是四层里唯一官方支持、门槛最低的一层。**

## 能做什么

- 页面、组件、路由、动画（`template` / `style` / `script`）；
- 调用系统能力：健康数据、传感器、通知、存储、振动等（受权限与固件版本限制）；
- 接入 AI 能力接口（具体可用性随固件版本变化，需按机型核实）。

## 不能做什么

- 不能直接访问文件系统、不能加载原生库、不能改系统行为 —— 这些属于[固件](/firmware/)和[原生](/native/)层的范围；
- 不能绕过应用商店/付费机制；
- 不同机型的分辨率、圆角、安全区差异很大，必须做适配（见[机型能力矩阵](/start/models)）。

## 前置条件

| 项 | 说明 |
| --- | --- |
| AIoT IDE | 官方 IDE，含模拟器，主要面向 **Windows** |
| 一台真机 | 可选；没有真机时本站内容只能标 `sourced` |
| 基础 | 会写 JS，看得懂 Vue 单文件组件 |

## 内容地图

| 页面 | 讲什么 | 状态 |
| --- | --- | --- |
| [环境搭建](/quickapp/setup) | AIoT IDE 安装、最小工程、模拟器、打包 | 已上线 |
| [十大坑](/quickapp/pitfalls) | 新手最容易卡住的地方 | 已上线 |
| 工程结构与 manifest | 路由、权限、屏幕配置字段的含义 | 规划中 |
| UI 与适配 | 分辨率/圆角/安全区在不同机型上的处理 | 规划中 |
| 健康与传感器 API | 心率、步数、睡眠等接口的可用性与限制 | 规划中 |
| 打包与安装 | `.rpk` 生成、签名、装真机 | 规划中 |

## 与相邻板块的边界

- 想做**表盘**（Lua + 资源包）→ [表盘](/watchface/)
- 想跑**自己编译的 C 代码** → [原生](/native/)
- 想知道**手机怎么把手环当外设连** → [协议](/protocol/)

## 说明

官方文档与社区长文已经把「Hello World → 打包 rpk」讲透了，本站**不重写**那条线，只补三样：机型差异、可检索的索引、别人没写的坑。
