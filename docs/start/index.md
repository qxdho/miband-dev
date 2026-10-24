---
title: 从这里开始
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: unverified
source: "https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/"
contributors: [miband-dev]
---

# 从这里开始

<StatusBadge status="unverified" verified="2026-10-24" />

> 本站按「你想做什么」分成六层，不是按文件类型、也不是按机型。先选一条路，别从目录第一页开始啃。

## 三条典型路线

| 你想做的事 | 走这条 | 门槛 |
| --- | --- | --- |
| 写个能装到手环上的应用 | [快应用](/quickapp/) | 会 JS / 类 Vue 即可 |
| 换个表盘，或自己做一套 | [表盘](/watchface/) | 会写 Lua、能接受打包格式 |
| 看底层：刷机、改固件、跑 C 代码 | [固件](/firmware/) → [原生](/native/) | 有 Linux 基础、能承受变砖风险 |

另外两层是横向的：[协议](/protocol/)（连手机、认证、同步）和[工具与示例](/tools/)（各层都会用到）。

## 先认识「六层」

```text
快应用  ← 最浅：JS 运行时，官方支持
  ↓
表盘    ← Lua + 资源包，独立格式
  ↓
固件    ← 分区、dump、解包、刷写
  ↓
原生    ← NuttX 可加载模块，自己编译的 C 代码
```

越往下越接近硬件，资料越少，风险越大。**上层能解决的事，不要往下层走。**

## 怎么读一个页面

每个内容页顶部都有徽章和 frontmatter，先看这三个字段再决定信多少：

| 字段 | 含义 |
| --- | --- |
| `status` | `tested` 真机复现过 / `sourced` 有公开来源 / `unverified` 仅见提及、未核实 |
| `verified` | 最后**核对来源**的日期，不是实测日期 |
| `models` | 适用机型，缩写见[机型能力矩阵](/start/models) |

本站是资料仓库，**大部分页面是 `sourced` 或 `unverified`**，`tested` 会很少。这不是缺陷，是诚实。

## 目录地图

| 板块 | 回答什么问题 |
| --- | --- |
| [开始](/start/) | 哪台机器支持什么？名词什么意思？ |
| [快应用](/quickapp/) | 怎么写出一个 `.rpk` 并装上去？ |
| [表盘](/watchface/) | 表盘长什么样、怎么打包、怎么替换？ |
| [固件](/firmware/) | 怎么备份、怎么读分区、怎么解包？ |
| [原生](/native/) | 怎么在 NuttX 上跑自己写的 C 模块？ |
| [协议](/protocol/) | 手环和手机之间到底在传什么？ |
| [工具](/tools/) | 有哪些现成工具，各自的边界在哪？ |
| [示例](/examples/) | 能直接跑的代码在哪？ |

## 没找到你要的

- 术语不认识 → [术语表](/start/glossary)
- 想知道某台机器行不行 → [机型能力矩阵](/start/models)
- 想补内容 → [贡献指南](/community/about)（仓库根目录 `CONTRIBUTING.md`）
