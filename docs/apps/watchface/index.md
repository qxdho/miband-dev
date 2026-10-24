---
title: 表盘
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://wiki.bandbbs.cn/"
contributors: [miband-dev]
---

# 表盘

<StatusBadge status="sourced" verified="2026-10-24" />

表盘由一段 Lua 脚本与一组资源文件组成，打包为 `.bin` 后由系统加载渲染。表盘与快应用相互独立：表盘不运行 AiotJS，也不提供快应用 API。

## 可用的能力

- 替换表盘的布局、字体、指针与数据字段（时间、步数、心率等）；
- 自定义界面，使用 Lua 实现动态效果；
- 打包为系统可识别的文件，通过官方或第三方工具安装。

## 前置条件

| 项 | 说明 |
| --- | --- |
| Lua | 需掌握基础语法 |
| 屏幕参数 | 需已知目标机型的分辨率与圆角半径，见[机型能力矩阵](/start/models) |
| 打包工具 | 例如 [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool)，为第 8 代工具，是否兼容 9/10 需自行核实 |

## 本章页面

| 页面 | 内容 | 状态 |
| --- | --- | --- |
| [打包格式](/apps/watchface/package) | `.face` 二进制结构、自研打包器、逐字节验证 | 已上线 |
| Lua 脚本基础 | 脚本入口、生命周期与可用 API | 规划中 |
| 移植与适配 | 将表盘适配到另一分辨率 | 规划中 |

## 相邻板块

- 需要交互、网络与系统 API：[快应用](/apps/quickapp/)
- 修改表盘加载逻辑：属于[固件](/system/firmware/)层，风险更高

## 格式兼容性

表盘的 `.bin` 格式没有公开规范，社区工具多由逆向得出。不同代数与固件版本之间可能不兼容，因此每个页面都要求标注 `models` 与 `firmware`。
