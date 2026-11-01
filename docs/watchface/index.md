---
title: 表盘
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://wiki.bandbbs.cn/"
contributors: [miband-dev]
---

# 表盘

<StatusBadge status="sourced" verified="2026-11-01" />

表盘是常驻于设备上的显示层。按制作方式，本站将其分为普通表盘与 Lua 表盘两类。二者均通过表盘安装入口替换系统表盘，但产物格式、可编程能力与证据完整度存在差异。

## 两类表盘

| 类型 | 是什么 | 可编程能力 | 本站在线内容 |
| --- | --- | --- | --- |
| [普通表盘](/watchface/normal/) | 用官方表盘制作工具产出的表盘 | 以工具提供的能力为限，运行时与包格式未公开 | 介绍、打包方式（证据待补） |
| [Lua 表盘](/watchface/lua/) | Lua 脚本 + 资源文件，打包成容器 | 脚本可执行、可读文件、可调用 `os.execute` | 介绍、能力、打包、开发、示例 |

::: warning 证据边界
仓库中可复现的二进制样本全部是 Lua 表盘容器（p67 / 8 Pro `.face`）。普通表盘目前没有可复现样本，本站不编造其字段与打包命令，相关页面标记为 `unverified`。
:::

## 共同点

- 两类表盘均以替换系统表盘为目标，安装后通常需要重新选择表盘；
- 两者均与快应用相互独立，不运行 AiotJS，也不提供快应用 API；
- 两者均需匹配目标机型的屏幕分辨率与圆角参数，见[机型能力矩阵](/start/models)；
- 两者均可能因固件版本、容器版本或缩略图不匹配而安装失败。

## 本章页面

| 页面 | 内容 |
| --- | --- |
| [普通表盘介绍](/watchface/normal/) | 定义、与 Lua 表盘的区别、已知入口与证据缺口 |
| [普通表盘打包方式](/watchface/normal/package) | 官方工具链与待验证问题 |
| [Lua 表盘介绍](/watchface/lua/) | 组成、运行方式、最小工程 |
| [Lua 表盘能力](/watchface/lua/capabilities) | 已证实与未证实的能力清单 |
| [Lua 表盘打包方式](/watchface/lua/package) | 容器、工具与打包步骤 |
| [开发与调试](/watchface/lua/develop) | 入口脚本、离线冒烟、错误处理 |
| [示例](/watchface/lua/examples) | 文件清单、LRA 探测、原生模块安装器 |
| [表盘包格式](/watchface/format) | p67 与 8 Pro 容器的字段与逐字节验证 |
| [安装表盘](/watchface/install) | 安装渠道、兼容性检查与失败恢复 |

## 相邻板块

- 需要交互、网络与系统 API：[快应用](/quickapp/)
- 需要执行原生代码：[原生应用](/native/)，通过 Lua 表盘携带模块
- 修改表盘加载逻辑：属于[固件](/platform/firmware/)层，风险更高

## 格式兼容性

表盘容器没有公开规范，社区工具多由逆向得出。不同代数与固件版本之间可能不兼容，因此每个页面均要求标注 `models` 与 `firmware`。安装失败时，应先核对容器版本、设备标识与缩略图尺寸，再检查脚本。
