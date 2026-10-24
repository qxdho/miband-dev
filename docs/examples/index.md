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

每个示例是一个可构建的最小工程，目标是跑通并可见效果，不追求功能完整。

## 计划中的示例

| 目录 | 层 | 内容 | 状态 |
| --- | --- | --- | --- |
| `examples/quickapp-hello/` | 快应用 | 最小 `.rpk`：单页面、一个按钮、一次传感器调用 | 规划中 |
| `examples/watchface-min/` | 表盘 | 最小表盘：时间与步数，含打包脚本 | 规划中 |
| `examples/native-module-hello/` | 原生 | 最小可加载模块：编译为 ET_REL，`insmod` 后输出一行日志 | 规划中 |

## 约定

- 每个示例自带 `README.md`，写明依赖、目标机型、已知限制与验证状态；
- 代码使用 MIT 许可，文档使用 CC BY-SA 4.0，与站点一致；
- 示例不包含二进制文件与固件，只保留源码与构建脚本；
- 只在已跑通的机型上标注可用；未跑通的标为 `unverified`。

## 与文档的关系

示例不替代教程。教程页面链接到对应示例，示例的 `README.md` 链接回教程页面。两者不一致时，以文档页面的 `status` 字段为准。
