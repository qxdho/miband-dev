---
title: 原生应用导读
models: [band10pro]
firmware: "unknown"
verified: 2026-10-24
status: unverified
source: "https://habr.com/en/articles/1079066/"
contributors: [miband-dev]
---

# 原生应用

<StatusBadge status="unverified" verified="2026-10-24" />

> 绕开 JS 运行时，直接在 NuttX 上加载**自己编译的 C 代码**：把模块编成 ET_REL 格式的 ELF，用 `insmod` 塞进内核。这是 2026 年才被社区走通的路子，也是本站最核心的差异化内容。

## 原理（目前公开的说法）

1. 系统是 **NuttX + LVGL**，应用层另有 AiotJS 跑快应用、Lua 跑表盘；
2. 从 Lua 表盘里调用 `os.execute()` 可以拿到 shell；
3. 用 `insmod /data/xxx.elf` 加载 **ET_REL 可重定位目标文件**作为内核模块；
4. 模块通过 `miwear_app_t` / `miwear_page_t` 结构体注册界面，通过 `packagemanager_api_s`（install / recover / uninstall / unregister / set_hidden / is_hidden）接入应用管理。

> 以上全部来自社区逆向，**没有官方文档**，`status: unverified`。不同固件版本可能变化。

## 能做什么 / 代价

- 能：任意 C 代码、直接调 LVGL 画界面、访问设备节点、做快应用做不到的事；
- 代价：**极不稳定**，一个野指针就能让手环起不来；没有调试器，出问题只能重刷；没有签名与沙箱保护。

## 前置条件

- 熟悉 C、交叉编译、ELF 与链接器；
- 已经在[固件](/firmware/)层做过备份，知道怎么恢复；
- 目标机型目前只有 **band10pro** 有公开可行的记录（见矩阵 `native` 字段）。

## 内容地图

| 页面 | 讲什么 | 状态 |
| --- | --- | --- |
| 总体思路 | 从 Lua 到 shell 到 `insmod` 的完整链路 | 规划中 |
| 工具链 | 交叉编译器、链接脚本、ET_REL 的生成参数 | 规划中 |
| Hello 模块 | 最小的可加载模块：打印日志、不碰界面 | 规划中 |
| 注册界面 | `miwear_app_t` / `miwear_page_t` 的最小可用结构 | 规划中 |
| 包管理接口 | `packagemanager_api_s` 各函数的语义与坑 | 规划中 |
| 用 LVGL 画界面 | 在模块里创建控件、刷新、处理事件 | 规划中 |
| 部署与回滚 | 怎么放上去、怎么在崩溃后救回来 | 规划中 |

## 与相邻板块的边界

- 只是想**做个界面** → 用[快应用](/quickapp/)或[表盘](/watchface/)，别碰这里；
- 想改**系统行为**而不是加模块 → 属于[固件](/firmware/)层；
- 需要和手机通信 → 配合[协议](/protocol/)层。
