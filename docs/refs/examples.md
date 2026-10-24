---
title: 示例代码
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-25
status: sourced
source: "https://github.com/cciccicu/JSLab"
contributors: [miband-dev]
---

# 示例代码

<StatusBadge status="sourced" verified="2026-10-25" />

每个示例是一个可构建的最小工程，目标是跑通并可见效果，不追求功能完整。

## 计划中的示例

| 目录 | 层 | 内容 | 状态 |
| --- | --- | --- | --- |
| `examples/quickapp-hello/` | 快应用 | 最小 `.rpk`：单页面、一个按钮、一次传感器调用 | 规划中 |
| `examples/watchface-min/` | 表盘 | 最小表盘：时间与步数，含打包脚本 | 规划中 |
| `examples/native-module-hello/` | 原生 | 最小可加载模块：编译为 ET_REL，`insmod` 后输出一行日志 | 规划中 |

## 社区可复用的工程

以下项目都公开发布了源码，可直接读实现。本站不托管它们的二进制产物。

| 项目 | 方向 | 说明 | 来源 |
| --- | --- | --- | --- |
| [JSLab](https://github.com/cciccicu/JSLab) | 快应用 | 在手环上编写并运行 JavaScript 的 Vela 快应用，适合验证运行时能力 | GitHub |
| [Schedule-Vela](https://github.com/Jursin/Schedule-Vela) | 快应用 | 面向 VelaOS 的课程表快应用，含完整工程结构与界面 | GitHub |
| [Miband-qemu-simulator](https://github.com/DDlhy/Miband-qemu-simulator) | 固件、模拟 | 10 Pro / 11 NFC 的 QEMU 模拟器，可跑原厂固件 | [使用说明](/refs/emulator) |
| [Miband10pro-firmware-extraction](https://github.com/DDlhy/Miband10pro-firmware-extraction) | 固件 | 10 Pro SPI NAND 整片读取与 YAFFS2/ROMFS 还原脚本 | [救砖路径](/system/firmware/recovery) |
| [atc1441 工具集](https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking) | 固件、SoC | BES2700iMP/BEST1503 的研究资料 | GitHub |

JSLab 的价值在于把「快应用能调用哪些接口」变成可交互的试验台；Schedule-Vela 则展示了页面路由、本地存储与打包发布的完整写法。两者的目录规范与[快应用养成](/apps/quickapp/)一致。

## 约定

- 每个示例自带 `README.md`，写明依赖、目标机型、已知限制与验证状态；
- 代码使用 MIT 许可，文档使用 CC BY-SA 4.0，与站点一致；
- 示例不包含二进制文件与固件，只保留源码与构建脚本；
- 只在已跑通的机型上标注可用；未跑通的标为 `unverified`。

## 与文档的关系

示例不替代教程。教程页面链接到对应示例，示例的 `README.md` 链接回教程页面。两者不一致时，以文档页面的 `status` 字段为准。
