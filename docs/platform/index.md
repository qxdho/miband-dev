---
title: 平台与工具
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/research"
contributors: [miband-dev]
---

# 平台与工具

<StatusBadge status="sourced" verified="2026-11-01" />

平台层汇集三条应用路线共用的资料，包括固件、BLE 协议、逆向与模拟工具，以及外部参考和示例。该层不针对某一种应用形态，而是说明设备本身的工作方式、连接方式与研究方法。

## 四个部分

| 部分 | 内容 | 入口 |
| --- | --- | --- |
| 固件 | 设备组成、备份与解包方法、变砖后的恢复流程 | [固件研究](/platform/firmware/) |
| 协议 | 手环与手机的配对方式与通信链路 | [BLE 协议](/platform/protocol/ble) · [网络通路](/platform/protocol/network) |
| 工具 | 读取固件、运行模拟器与逆向分析所需的工具 | [工具索引](/platform/tools/) |
| 参考 | 外部资料、社区项目与可构建示例 | [参考资料](/platform/reference/references) · [示例代码](/platform/reference/examples) |

## 本章页面

| 页面 | 内容 | 证据等级 |
| --- | --- | --- |
| [固件研究](/platform/firmware/) | 适用机型、风险、阅读顺序 | — |
| [固件包格式](/platform/firmware/package) | 包结构、分区、镜像格式 | 固件字节 |
| [系统架构](/platform/firmware/architecture) | NuttX、启动链、文件系统布局 | 固件字节 |
| [设备文件系统](/platform/firmware/filesystem) | 10 Pro 实机目录清单与差异 | 实机清单 |
| [启动链与救砖](/platform/firmware/recovery) | BL / BL2 / AP、恢复回路 | 固件字节 |
| [BLE 协议与鉴权](/platform/protocol/ble) | GATT 链路、服务端托管 key、配对 | 协议抓包 |
| [网络通路](/platform/protocol/network) | TUN、BLE 代理与 `fetch` 故障 | 实机测试 |
| [工具索引](/platform/tools/) | AIoT IDE、表盘工具、刷机与逆向工具 | — |
| [QEMU 模拟器](/platform/tools/emulator) | 在 PC 上运行原厂固件 | 社区记录 |
| [逆向与复现](/platform/tools/reversing) | capstone、字符串扫描、Thumb 字面量池 | 方法 |
| [参考资料](/platform/reference/references) | 官方文档、开源项目、社区证据 | 索引 |
| [示例代码](/platform/reference/examples) | 可构建的最小工程与约定 | 索引 |

## 风险提示

固件操作可能导致变砖、数据丢失与保修失效。备份与恢复方法应先于刷写执行；对于不确定的操作，应先通过[机型能力矩阵](/start/models)确认设备是否支持。

## 相邻板块

- 只做界面与应用：[三条路怎么选](/start/choose-path)
- 在 NuttX 上加载 C 模块：[原生应用](/native/)
