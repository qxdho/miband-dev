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

本站内容按用途分为六层，不按文件类型或机型划分。

## 典型路线

| 目标 | 入口 | 前置 |
| --- | --- | --- |
| 编写并安装应用 | [快应用](/apps/quickapp/) | JS，了解 Vue 单文件组件 |
| 制作表盘 | [表盘](/apps/watchface/) | Lua，了解资源打包格式 |
| 修改系统与固件 | [固件](/system/firmware/) → [原生](/system/native/) | Linux 基础，能承担变砖风险 |

横向的两层是[协议](/refs/)与[工具与示例](/refs/)。

## 分层

```text
快应用   JS 运行时，官方支持
  ↓
表盘     Lua 脚本 + 资源包
  ↓
固件     分区、dump、解包、刷写
  ↓
原生     NuttX 可加载模块
```

越往下越接近硬件，公开资料越少，操作风险越大。上层能解决的问题不必下沉到下层。

## frontmatter 字段

每个内容页顶部标注以下字段，据此判断内容可信度。

| 字段 | 含义 |
| --- | --- |
| `status` | `tested` 真机复现；`sourced` 有公开来源；`unverified` 仅见提及，未核实 |
| `verified` | 最后核对来源的日期，非实测日期 |
| `models` | 适用机型，缩写见[机型能力矩阵](/start/models) |

本站定位为资料汇编，不进行真机实测，因此多数页面为 `sourced` 或 `unverified`。

## 目录

| 板块 | 内容 |
| --- | --- |
| [开始](/start/) | 机型支持情况、术语释义 |
| [快应用](/apps/quickapp/) | 编写 `.rpk` 并安装到设备 |
| [表盘](/apps/watchface/) | 表盘格式、打包与替换 |
| [固件](/system/firmware/) | 备份、读取分区、解包 |
| [原生](/system/native/) | 在 NuttX 上运行自编译 C 模块 |
| [协议](/refs/) | 手环与手机之间的 BLE 通信 |
| [工具](/refs/) | 现有工具及其适用范围 |
| [示例](/refs/examples) | 可直接构建的示例工程 |

## 相关页面

- 术语释义：[术语表](/start/glossary)
- 机型支持情况：[机型能力矩阵](/start/models)
- 内容贡献方式：[关于本站](/about/)与仓库根目录 `CONTRIBUTING.md`
