---
title: Lua 表盘
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://wiki.bandbbs.cn/"
contributors: [miband-dev]
---

# Lua 表盘

<StatusBadge status="sourced" verified="2026-11-01" />

Lua 表盘由一段 Lua 脚本与一组资源文件组成，打包成系统可识别的容器后安装。它是目前本站证据最完整的表盘类型：容器字段、打包器与逐字节验证都在仓库中。

## 与普通表盘的区别

| 维度 | 普通表盘 | Lua 表盘 |
| --- | --- | --- |
| 制作 | 官方表盘制作工具 | 手写 Lua + 资源 |
| 可编程 | 以工具能力为限 | 脚本可执行，能读文件、调用 shell |
| 格式 | 未公开 | 已有 p67 / 8 Pro 容器证据 |
| 风险 | 较低 | 脚本可执行，错误可导致白屏或重启循环 |

## 组成

- **入口脚本**：通常为 `main.lua`，由表盘运行时加载；
- **资源文件**：图片、字体、布局数据等；
- **容器**：把脚本与资源按记录表打包，带缩略图、设备标识与版本字段。字段见[表盘包格式](/watchface/format)。

容器内的路径前缀随打包器与机型变化，例如 p67 使用 `_lua/<device>/`，8 Pro 使用 `lua/`。不要手工拼接路径，交给打包器生成。

## 能做什么

- 替换表盘布局、字体、指针与数据字段；
- 用 Lua 实现动态效果与简单交互；
- 读取 `/proc`、`/dev` 等节点，执行 shell 命令；
- 作为原生模块的载体：把 `.ko` 打进表盘，安装时解包并 `insmod`。

最后一条是[原生应用](/native/)唯一的安装方式，见[加载方式](/native/loading)。

## 前置条件

| 项 | 说明 |
| --- | --- |
| Lua | 基础语法、`pcall`、文件 IO |
| 屏幕参数 | 目标机型的分辨率与圆角，见[机型能力矩阵](/start/models) |
| 打包工具 | 仓库内的 `tools/p67build.js` 或 `tools/facebuild.js` |
| 恢复能力 | 能处理白屏、重启循环与表盘回退 |

## 本章页面

| 页面 | 内容 |
| --- | --- |
| [能力](/watchface/lua/capabilities) | 已证实与未证实的能力清单 |
| [打包方式](/watchface/lua/package) | 容器选择、构建与验证 |
| [开发与调试](/watchface/lua/develop) | 入口脚本、离线冒烟、错误处理 |
| [示例](/watchface/lua/examples) | 文件清单、LRA 探测、原生模块安装器 |

## 相邻板块

- 需要复杂交互与官方 API：[快应用](/quickapp/)
- 需要在表盘里执行 C 代码：[原生应用](/native/)
- 修改表盘加载逻辑：[固件](/platform/firmware/)层
