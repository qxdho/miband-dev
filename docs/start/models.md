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

本站不进行真机实测。矩阵中每一项均来自公开资料或社区记录，`✓` 表示有来源称该项可用，不代表作者在设备上复现过。无法确认的项填 `unknown`。

## 矩阵

<ModelMatrix />

数据源为 `docs/.vitepress/data/models.json`，修改该文件会同步更新首页与本页的矩阵。

## 字段含义

| 字段 | 含义 | 备注 |
| --- | --- | --- |
| `screen` | 屏幕分辨率，宽×高，单位 px | 影响快应用适配 |
| `radius` | 屏幕圆角半径，单位 px；`999` 表示接近胶囊或圆形 | 影响安全区与布局 |
| `os` | 操作系统 | 目前国行手环均为 VelaOS |
| `soc` | 主控芯片 | 未核实的填 `unknown` |
| `quickapp` | 能否安装与运行快应用 | 取决于是否存在应用引擎 |
| `watchface` | 能否安装自定义表盘 | 与表盘 bin 格式相关 |
| `native` | 能否通过 NuttX `insmod` 加载自定义 ELF 模块 | 资料最少 |
| `flash` | 能否备份与刷写固件 | 高风险，见[固件研究](/firmware/) |

能力字段取值为 `true`、`false`、`"partial"`、`"unknown"` 之一。

## 已知事实与来源

| 事实 | 可信度 | 来源 |
| --- | --- | --- |
| VelaOS 自 2023-08 起用于小米手环 8 Pro，此后手环 9、9 Pro、红米手表 4/5、手环 10 均搭载 | 高 | 路明笔记 |
| 红米手环 3 搭载 Vela 但无快应用引擎，无法安装快应用 | 高 | 路明笔记 |
| 分辨率：手环 8 Pro 480×336；手环 9 192×490；手环 9 Pro 480×336；手环 10 212×520；红米手表 4 390×450；红米手表 5 432×514 | 中，单篇博客，待复核 | 路明笔记 |
| 圆角半径：手环 9 999px；手环 9 Pro 48px；手环 10 999px；红米手表 5 90px | 中 | 路明笔记 |
| Mi Band 10 Pro 硬件：BES2700iMP Cortex-M33、16Mb 片内 SPI flash、约 2.5MB SRAM、16Mb PSRAM、外挂 SPI NAND 512/256Mb | 中高 | Habr |
| Mi Band 10 Pro 软件：NuttX + LVGL v9；表盘由 Lua 脚本驱动，应用由 AiotJS（quickjs 衍生）执行 | 中高 | Habr |
| 原生应用路径：Lua 表盘内通过 `os.execute()` 获得 shell，再用 `insmod /data/xxx.elf` 加载 ET_REL 模块 | 中高 | Habr |
| 应用注册接口：`miwear_app_t`、`miwear_page_t` 与 `packagemanager_api_s`（install / recover / uninstall / unregister / set_hidden / is_hidden） | 中高 | Habr |

## 国行与国际版

本站只收录国行设备。国际版在应用商店与部分系统能力上与国行不同，本站不展开。

## 修订方式

修改 `docs/.vitepress/data/models.json` 中对应字段，在 PR 描述中附证据（截图、日志或来源链接），并同步更新上方「已知事实与来源」表。无法确认的字段保持 `unknown`。
