---
title: 示例代码
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: unverified
source: "https://github.com/open-vela/docs"
contributors: [miband-dev]
---

# 示例代码

<StatusBadge status="unverified" verified="2026-10-24" />

> 每个示例都是**能构建的最小工程**，不追求功能完整，只追求「跑起来、看得见、改得动」。

## 计划中的三个模板

| 目录 | 层 | 内容 | 状态 |
| --- | --- | --- | --- |
| `examples/quickapp-hello/` | 快应用 | 最小 `.rpk`：一页、一个按钮、一次传感器调用 | 规划中 |
| `examples/watchface-min/` | 表盘 | 最小表盘：时间 + 步数 + 打包脚本 | 规划中 |
| `examples/native-module-hello/` | 原生 | 最小可加载模块：编译成 ET_REL、`insmod` 后打印一行日志 | 规划中 |

## 约定

- 每个示例自带 `README.md`：**依赖、目标机型、已知限制、验证状态**；
- 示例里的代码用 MIT，文档用 CC BY-SA 4.0（与站点一致）；
- 示例**不放二进制、不放固件**，只放源码与构建脚本；
- 能跑通哪个机型就写哪个，跑不通的标 `unverified`，不要写「理论可用」。

## 与文档的关系

示例不是教程的替代品。每篇教程会链到对应示例，示例的 `README.md` 也会链回教程页 —— 两边都对不上时，以文档的 `status` 为准。
