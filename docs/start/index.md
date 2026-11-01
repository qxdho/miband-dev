---
title: 从这里开始
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: unverified
source: "https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/"
contributors: [miband-dev]
---

# 从这里开始

<StatusBadge status="unverified" verified="2026-11-01" />

本站按应用形态组织内容，分为表盘、快应用与原生应用三类。平台资料（固件、协议、工具与参考）单独成层，供上述三条路径共用。

## 路径与入口

| 需求 | 入口 | 所需条件 | 安装方式 |
| --- | --- | --- | --- |
| 更换或制作表盘 | [表盘](/watchface/) | Lua 或官方表盘制作工具 | 表盘市场 / 第三方工具 |
| 开发带界面的应用 | [快应用](/quickapp/) | JS，了解 Vue 单文件组件 | `.rpk`，AIoT IDE 或应用商店 |
| 开发 C 模块、修改系统行为 | [原生应用](/native/) | C、交叉编译、ELF | 没有独立入口，须配合 Lua 表盘安装 |
| 研究固件、协议与工具 | [平台与工具](/platform/) | Linux、逆向基础 | 不涉及安装 |

无法确定路径时，可先参阅[三条路怎么选](/start/choose-path)。

## 三条路径的关系

```text
表盘      普通表盘 / Lua 表盘，常驻显示
快应用    JS + AiotJS 运行时，有官方文档
原生应用  C + ET_REL 模块，借助 Lua 表盘加载
```

三条路径的风险依次升高：表盘与快应用在沙箱内运行；原生应用进入内核态，没有调试器与沙箱。上层能够解决的问题，不需要下沉到下层。

## frontmatter 字段

每个内容页顶部标注以下字段，用于判断内容可信度。

| 字段 | 含义 |
| --- | --- |
| `status` | `tested` 真机复现；`sourced` 有公开来源；`unverified` 仅见提及，未核实 |
| `verified` | 最后核对来源的日期，非实测日期 |
| `models` | 适用机型，缩写见[机型能力矩阵](/start/models) |
| `firmware` | 适用固件版本；`unknown` 表示尚未确认 |

`verified` 表示最后核对来源的日期，不代表经过真机验证；判断可信度以 `status` 为准。

## 目录

| 板块 | 内容 |
| --- | --- |
| [开始](/start/) | 三条路径的分工、机型支持情况、术语 |
| [表盘](/watchface/) | 普通表盘与 Lua 表盘：介绍、能力、打包、安装 |
| [快应用](/quickapp/) | 工程结构、能力边界、运行时、打包 |
| [原生应用](/native/) | 支持设备、加载方式、能力、模块开发 |
| [平台与工具](/platform/) | 固件、BLE 协议、工具与参考资料 |
| [关于](/about/) | 站点说明、研究历程与误判 |

## 安全提示

固件与原生应用操作可能导致变砖、数据丢失与保修失效。操作前应完成备份，并确认设备在[机型能力矩阵](/start/models)中的支持情况。

## 相关页面

- 术语释义：[术语表](/start/glossary)
- 机型支持情况：[机型能力矩阵](/start/models)
- 内容贡献方式：[关于本站](/about/)与仓库根目录 `CONTRIBUTING.md`
