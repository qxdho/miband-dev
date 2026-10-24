---
title: 工具索引
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://wiki.bandbbs.cn/"
contributors: [miband-dev]
---

# 工具索引

<StatusBadge status="sourced" verified="2026-10-24" />

> 只做**索引**：这个工具是什么、能干什么、边界在哪、去哪拿。本站不托管任何二进制、不提供网盘、不代发安装包。

## 官方

| 工具 | 用途 | 适用层 | 说明 |
| --- | --- | --- | --- |
| [AIoT IDE](https://iot.mi.com/vela/quickapp/) | 快应用开发、模拟器、打包 | 快应用 | 官方，主要面向 Windows，版本随官方更新 |
| VelaOS 系统更新 | 固件升级 | 固件 | 只通过官方 App 走，本站不给包 |

## 社区

| 工具 | 用途 | 适用层 | 备注 |
| --- | --- | --- | --- |
| 表盘自定义工具 | 表盘替换/制作 | 表盘 | 来源见[米坛知识库](https://wiki.bandbbs.cn/) |
| AstroBox / OronBox / BandBurg | 第三方应用安装与管理 | 快应用 | 具体兼容性随固件版本变化 |
| [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool) | 表盘 `.bin` 打包/解包 | 表盘 | 第 8 代工具，9/10 是否兼容需核实 |
| [atc1441 工具集](https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking) | 固件/SoC 研究 | 固件 | 英文，面向 Band 10 Pro |
| QEMU 模拟器 | 在 PC 上跑手环系统 | 固件/原生 | 仅见论坛讨论，可行性未核实 |

## 收录规则

- 必须能**追溯到原始出处**（GitHub 仓库 / 官方站 / 论坛原帖），不收录转载站与网盘；
- 写清楚**最后核对日期**与**对应固件版本**；
- 涉及刷机、解锁的工具，必须在页面上带风险提示，且不提供「一键」封装。

## 想补充工具

提 PR 时在表格里加一行，并在 frontmatter 里更新 `verified`。不要在页面里直接贴下载链接，链接到**原始发布页**。
