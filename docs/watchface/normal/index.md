---
title: 普通表盘
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: unverified
source: "https://github.com/qxdho/miband-dev"
contributors: [miband-dev]
---

# 普通表盘

<StatusBadge status="unverified" verified="2026-11-01" />

普通表盘指通过官方表盘制作工具产出、面向表盘市场的表盘。这类表盘不使用本站记录的 Lua 表盘容器格式，其运行时与包结构也没有公开规范。

::: warning 证据缺口
仓库中现有的可复现样本全部是 Lua 表盘容器。普通表盘目前没有可复现样本，本页只登记已知入口与待验证问题，不编造二进制字段。
:::

## 与 Lua 表盘的区别

| 维度 | 普通表盘 | Lua 表盘 |
| --- | --- | --- |
| 制作方式 | 官方表盘制作工具 | 手写 Lua + 资源，社区工具打包 |
| 可编程能力 | 以工具提供的能力为限 | 脚本可执行，可读文件、调用 `os.execute` |
| 包格式 | 未公开，待验证 | 已有 p67 / 8 Pro 容器证据，见[表盘包格式](/watchface/format) |
| 本站证据 | `unverified` | `sourced` / `tested` |

## 已知入口

- 官方表盘制作工具（具体下载地址与版本要求待补）；
- 小米运动健康 / 表盘市场，用于分发与安装；
- 第三方表盘工具，可能同时支持普通表盘与 Lua 表盘，需逐项核实。

## 待验证问题

- 普通表盘的容器魔数、记录表与资源类型；
- 是否包含可执行脚本，若有，使用哪种运行时；
- 与 Lua 表盘容器是否共用安装器与校验逻辑；
- 不同代数（9 / 10 / 10 Pro）之间是否兼容。

若有可公开的普通表盘样本与可复现步骤，可按 `CONTRIBUTING.md` 提交。

## 相关页面

- [普通表盘打包方式](/watchface/normal/package)
- [Lua 表盘](/watchface/lua/)
- [安装表盘](/watchface/install)
