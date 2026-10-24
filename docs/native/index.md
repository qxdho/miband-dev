---
title: 原生应用
models: [band10pro]
firmware: "unknown"
verified: 2026-10-24
status: unverified
source: "https://habr.com/en/articles/1079066/"
contributors: [miband-dev]
---

# 原生应用

<StatusBadge status="unverified" verified="2026-10-24" />

原生应用绕过 JS 运行时，直接在 NuttX 上加载自编译的 C 代码：将模块编译为 ET_REL 格式的 ELF，通过 `insmod` 加载到内核。

## 原理

以下流程来自社区逆向，没有官方文档支撑，`status: unverified`，可能随固件版本变化。

1. 系统为 NuttX + LVGL，应用层另有 AiotJS 运行快应用、Lua 驱动表盘；
2. 从 Lua 表盘调用 `os.execute()` 可获得 shell；
3. 执行 `insmod /data/xxx.elf` 将 ET_REL 可重定位目标文件作为内核模块加载；
4. 模块通过 `miwear_app_t` / `miwear_page_t` 结构体注册界面，通过 `packagemanager_api_s`（install / recover / uninstall / unregister / set_hidden / is_hidden）接入应用管理。

## 能力与代价

- 可用 C 代码直接调用 LVGL 绘制界面、访问设备节点，执行快应用无法完成的操作；
- 没有调试器与沙箱保护，内存错误可能导致设备无法启动，出现问题只能重新刷写。

## 前置条件

| 项 | 说明 |
| --- | --- |
| C 与交叉编译 | 熟悉 C、交叉编译、ELF 格式与链接器 |
| 恢复能力 | 已在[固件](/firmware/)层完成备份，掌握恢复方法 |
| 目标机型 | 目前只有 band10pro 有公开可行的记录，见矩阵 `native` 字段 |

## 本章页面

| 页面 | 内容 | 状态 |
| --- | --- | --- |
| 总体思路 | 从 Lua 到 shell 再到 `insmod` 的完整链路 | 规划中 |
| 工具链 | 交叉编译器、链接脚本、ET_REL 生成参数 | 规划中 |
| 最小模块 | 打印日志、不涉及界面的可加载模块 | 规划中 |
| 注册界面 | `miwear_app_t` / `miwear_page_t` 的最小可用结构 | 规划中 |
| 包管理接口 | `packagemanager_api_s` 各函数的语义 | 规划中 |
| 使用 LVGL 绘制界面 | 在模块中创建控件、刷新与事件处理 | 规划中 |
| 部署与回滚 | 安装方法，以及崩溃后的恢复步骤 | 规划中 |

## 相邻板块

- 只需呈现界面：[快应用](/quickapp/)或[表盘](/watchface/)
- 修改系统行为而非新增模块：[固件](/firmware/)层
- 与手机通信：[协议](/protocol/)层
