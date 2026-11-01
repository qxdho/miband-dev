---
title: 普通表盘打包方式
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: unverified
source: "https://github.com/qxdho/miband-dev"
contributors: [miband-dev]
---

# 普通表盘打包方式

<StatusBadge status="unverified" verified="2026-11-01" />

本页记录普通表盘的打包入口与待验证问题。由于缺少可复现样本，**不提供未经证实的命令与字段说明**。

## 已知流程（待验证）

1. 在官方表盘制作工具中新建表盘工程；
2. 按目标机型设置分辨率、圆角与预览图；
3. 使用工具导出表盘包；
4. 通过表盘市场或第三方工具安装到设备。

以上步骤来自官方工具的一般使用方式，具体菜单、导出格式与版本限制尚未在本仓库核实。

## 与 Lua 表盘打包的差异

- Lua 表盘使用社区逆向出的容器格式，可用 `tools/p67build.js` 等脚本构建，并有逐字节验证；
- 普通表盘的导出由官方工具完成，仓库内没有对应的开源打包器；
- 不要把 Lua 表盘的 `_lua/` 路径、`0x1234A55A` 魔数等结论套用到普通表盘。

## 待验证清单

- 导出文件的扩展名与魔数；
- 是否包含缩略图、设备标识与版本字段；
- 安装失败时的错误码与回退行为；
- 工具版本与固件版本的对应关系。

## 相关页面

- [普通表盘介绍](/watchface/normal/)
- [Lua 表盘打包方式](/watchface/lua/package)
- [表盘包格式](/watchface/format)
- [安装表盘](/watchface/install)
