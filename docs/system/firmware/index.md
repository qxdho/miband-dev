---
title: 固件研究
models: [band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://habr.com/en/articles/1079066/"
contributors: [miband-dev]
---

# 固件研究

<StatusBadge status="sourced" verified="2026-10-24" />

::: danger 风险提示
固件层操作可能导致设备变砖、数据丢失与保修失效。本站只做资料索引，不提供固件下载、不提供一键工具，不对任何结果负责。任何刷写操作之前必须先完成备份。
:::

## 本章范围

手环存储中包含分区表、bootloader、系统镜像、资源分区与用户数据。本章记录这些内容的公开信息、读取方式与恢复路径。

## 阅读顺序

1. **备份与救砖**：先确认存在可恢复路径；
2. 硬件与分区：芯片、Flash 与分区布局的公开信息；
3. 读取镜像：SPI NAND 与存储的读取方法；
4. 解包与文件系统：镜像格式、挂载与文件提取；
5. 修改与刷写：最后一步，且必须能够回到第 1 步。

「备份与救砖」在章节顺序上始终排在「刷写」之前。

## 本章页面

| 页面 | 内容 | 证据等级 |
| --- | --- | --- |
| [固件包格式](/system/firmware/package) | 10 Pro 与 9 Pro 的容器结构、分区布局、镜像格式、地址换算 | 固件字节 |
| [系统架构](/system/firmware/architecture) | NuttX 内核、启动链、`modlib` 位置、NSH、文件系统布局 | 固件字节 |
| [设备文件系统](/system/firmware/filesystem) | 10 Pro 实机目录清单：1,053 个目录、9,562 个文件的实际布局 | 实机清单 |
| [启动链与救砖](/system/firmware/recovery) | BL/BL2/AP 三级启动、恢复模式、恢复死循环、SPI NAND 拆机读取 | 社区实录 + 拆机实录 |

## 已知硬件信息

- 小米手环 10 Pro：BES2700iMP（Cortex-M33）、16Mb 片内 SPI flash、约 2.5MB SRAM、16Mb PSRAM、外挂 SPI NAND 512/256Mb。来源为 Habr 长文，可信度 `sourced`。
- 10 Pro 的外挂 SPI NAND 型号为 Dosilicon DS35M4GB-IB：4 Gbit、1.8V、WSON-8，544 MiB raw，片内 8-bit ECC。来源为 2026-10 的拆机实录，可信度 `sourced`。
- 手环 9 与手环 10 的存储方案没有可靠的公开资料，矩阵中 `flash` 字段为 `unknown`。

以上信息在编写具体页面前需要复核。

## 收录边界

- 不提供官方固件与资源包的下载，只记录版本号、校验和与获取途径；
- 不提供一键刷机工具，不提供绕过付费或 DRM 的方法；
- 转载论坛内容或外文资料前须取得授权，本站只做导读与链接。
