---
title: 安装表盘
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/installer"
contributors: [miband-dev]
---

# 安装表盘

<StatusBadge status="sourced" verified="2026-11-01" />

表盘安装没有统一的应用商店 API。普通表盘、Lua 表盘与第三方工具各有自己的入口，失败表现也不一样。

## 安装渠道

| 渠道 | 适用 | 说明 |
| --- | --- | --- |
| 表盘市场 / 小米运动健康 | 普通表盘 | 官方分发，格式由官方工具保证 |
| AstroBox / OronBox / BandBurg | Lua 表盘 | 第三方安装器，需匹配机型与容器 |
| Canopus | Lua 表盘 | 社区工具链，带 target pack |
| AIoT IDE | 快应用与部分表盘 | 主要用于 `.rpk`，表盘支持需核实 |

表盘包没有签名校验，但安装器仍会检查容器版本、设备标识与缩略图。兼容性判断以[表盘包格式](/watchface/format)与目标机型为准。

## 安装前检查

1. 容器类型与机型匹配（p67 ≠ 8 Pro `.face`）；
2. 预览图尺寸与格式符合该容器要求；
3. 入口脚本路径与容器前缀一致；
4. 脚本在加载阶段不执行危险操作；
5. 已准备回退表盘或恢复方式。

## 安装后验证

- 表盘能正常显示，无白屏、无重启循环；
- 按键触发的动作只执行一次；
- 需要原生模块时，检查 `/proc/modules` 与 `/data/rc.d`；
- 记录安装的容器版本、固件版本与日期。

## 失败与恢复

| 现象 | 处理 |
| --- | --- |
| `InstallFailed` | 核对容器版本、设备标识、预览图；换用对应机型的打包器 |
| 白屏 | 换回默认表盘，检查入口脚本与资源路径 |
| 重启循环 | 进入恢复模式或重刷；不要继续安装同一包 |
| 模块加载失败 | 检查 `.ko` 是否为 32 位小端 `ET_REL` ARM ELF；确认固件有 `modlib` |

## 相关页面

- [表盘总览](/watchface/)
- [普通表盘](/watchface/normal/)
- [Lua 表盘打包方式](/watchface/lua/package)
- [原生加载方式](/native/loading)
