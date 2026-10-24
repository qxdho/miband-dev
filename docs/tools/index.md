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

本页只做索引：记录工具用途、适用层与来源。本站不托管二进制文件，不提供网盘链接，不代发安装包。

## 官方工具

| 工具 | 用途 | 适用层 | 说明 |
| --- | --- | --- | --- |
| [AIoT IDE](https://iot.mi.com/vela/quickapp/) | 快应用开发、模拟器、打包 | 快应用 | 官方工具，主要面向 Windows |
| VelaOS 系统更新 | 固件升级 | 固件 | 只通过官方 App 升级，本站不提供安装包 |

## 社区工具

| 工具 | 用途 | 适用层 | 备注 |
| --- | --- | --- | --- |
| 表盘自定义工具 | 表盘替换与制作 | 表盘 | 来源见[米坛知识库](https://wiki.bandbbs.cn/) |
| AstroBox / OronBox / BandBurg | 第三方应用安装与管理 | 快应用 | 兼容性随固件版本变化 |
| [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool) | 表盘 `.bin` 打包与解包 | 表盘 | 第 8 代工具，9/10 兼容性需核实 |
| [atc1441 工具集](https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking) | 固件与 SoC 研究 | 固件 | 英文资料，面向 Band 10 Pro |
| QEMU 模拟器 | 在 PC 上运行手环系统 | 固件、原生 | 仅见于论坛讨论，可行性未核实 |

## 本站自带的工具页

| 页面 | 内容 |
| --- | --- |
| [逆向与复现](/tools/reversing) | capstone、字符串与指针扫描、Thumb 字面量池、脚本清单与命令 |
| [地址手册](/tools/addresses) | 固件 `3.101.043` 的 259 条符号地址与可做性分析 |
| [参考资料](/tools/references) | 开源项目、官方文档、社区证据，按机型标注可信度 |

## 收录规则

- 可追溯到原始出处（GitHub 仓库、官方站点或论坛原帖），不收录转载站与网盘；
- 注明最后核对日期与对应固件版本；
- 涉及刷机或解锁的工具必须附带风险提示，不收录一键封装工具。

## 新增工具

在表格中增加一行，并在 frontmatter 中更新 `verified`。页面中不直接提供下载链接，链接到工具的原始发布页。
