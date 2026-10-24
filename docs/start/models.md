---
title: 机型能力矩阵
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/"
contributors: [miband-dev]
---

# 机型能力矩阵

<StatusBadge status="sourced" verified="2026-10-24" />

> 本站是**资料仓库，不做真机实测**。矩阵里每一格都来自公开资料或社区记录，`✓` 只代表「有来源说可用」，不代表作者亲手跑通过。拿不准的格子一律填 `❓`，不猜。

## 矩阵

<ModelMatrix />

数据源：[`docs/.vitepress/data/models.json`](https://github.com/)（改 JSON 即改全站，欢迎提 PR）。

## 字段含义

| 字段 | 含义 | 备注 |
| --- | --- | --- |
| `screen` | 屏幕分辨率（宽×高，px） | 与快应用适配强相关 |
| `radius` | 屏幕圆角半径（px），`999` 表示接近胶囊/圆形 | 影响安全区与布局 |
| `os` | 系统 | 目前国行手环均为 VelaOS |
| `soc` | 主控 | 未核实的填 `unknown` |
| `quickapp` | 能否安装 / 运行快应用 | 取决于是否有应用引擎 |
| `watchface` | 能否安装自定义表盘 | 与表盘 bin 格式相关 |
| `native` | 能否通过 NuttX `insmod` 加载自定义 ELF 模块 | 最前沿、资料最少 |
| `flash` | 能否备份 / 刷写固件 | **高风险**，见固件章节 |

能力字段只允许 `true` / `false` / `"partial"` / `"unknown"` 四种取值。

## 已知事实与可信度

| 事实 | 可信度 | 来源 |
| --- | --- | --- |
| VelaOS 始于 2023-08 的小米手环 8 Pro；此后手环 9、9 Pro、红米手表 4/5、手环 10 均搭载 | 高 | 路明笔记 |
| 红米手环 3 有 Vela 但**无快应用引擎**，装不了快应用 | 高 | 路明笔记 |
| 屏幕分辨率：手环 8 Pro 480×336；手环 9 192×490；手环 9 Pro 480×336；手环 10 212×520；红米手表 4 390×450；红米手表 5 432×514 | 中（单篇博客，待抽检） | 路明笔记 |
| 圆角半径：手环 9 999px；手环 9 Pro 48px；手环 10 999px；红米手表 5 90px | 中 | 路明笔记 |
| Mi Band 10 Pro 硬件：BES2700iMP Cortex-M33、16Mb 片内 SPI flash、约 2.5MB SRAM、16Mb PSRAM、外挂 SPI NAND 512/256Mb | 中高 | Habr |
| Mi Band 10 Pro 软件：NuttX + LVGL v9；Lua 跑表盘，AiotJS（quickjs 衍生）跑应用 | 中高 | Habr |
| 原生应用路径：Lua 表盘里 `os.execute()` 出 shell → `insmod /data/xxx.elf` 加载 ET_REL 模块 | 中高 | Habr |
| 应用注册接口：`miwear_app_t` / `miwear_page_t` + `packagemanager_api_s`（install/recover/uninstall/unregister/set_hidden/is_hidden） | 中高 | Habr |

## 国行 / 国际版

**本站只做国行。** 国际版（global）在应用商店、部分系统能力上与国行不同，遇到时一句话带过，不展开。

## 发现错误？

矩阵的价值全在「诚实」。如果你有真机、能证实或证伪某一格：

1. 改 `docs/.vitepress/data/models.json` 对应字段；
2. 在 PR 描述里贴证据（截图 / 日志 / 来源链接）；
3. 同步更新本页的「已知事实」表。

不知道就保持 `unknown`，这比填一个错的好。
