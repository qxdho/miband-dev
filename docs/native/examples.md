---
title: 原生示例
models: [band10pro]
firmware: "3.101.043"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main"
contributors: [miband-dev]
---

# 原生示例

<StatusBadge status="sourced" verified="2026-11-01" />

仓库里有三个与原生加载相关的工程，分别覆盖安装器、探测模块与表盘载体。

## 安装器（`installer/`）

- 完整的 Lua 表盘安装器：部署 `.ko`、读回校验、`insmod`、检查 `/proc/modules`、写 `/data/rc.d`；
- `build.mjs`：校验 32 位小端 `ET_REL` ARM ELF；
- `pack67.mjs`：生成 p67 容器；
- 设计约束：永不 `rmmod`、写入幂等、失败自删自启脚本。

适合作为「原生应用随表盘分发」的参考实现，见[加载方式](/native/loading)。

## 探测工程（`probe/`）

- `native/hello.ko`：最小加载验证；
- `native/lra_probe.ko`：LRA 设备探测；
- `lua/main.lua`：只读读取 `/proc/version`、尝试 `/dev/lra0`、列出 `/dev`、查看 `/proc/modules` 与 `/data/rc.d`；
- 结果写入 `/tmp/lra_probe.txt`，不修改系统状态。

适合先确认「能不能读设备、能不能跑 shell」。

## 表盘载体（`watchfaces/fslist/`）

- 只做文件系统遍历的 Lua 表盘；
- 按键触发 `ls -R /`，结果写 `/data/fslist.txt`；
- 可作为携带 `.ko` 的最小表盘骨架。

## 建议顺序

1. `fslist`：确认表盘安装与脚本执行；
2. `probe`：确认设备节点与 shell；
3. `hello.ko`：确认模块加载；
4. `installer`：部署自己的模块并配置自启。

## 相关页面

- [最小模块](/native/develop/hello)
- [加载方式](/native/loading)
- [Lua 表盘示例](/watchface/lua/examples)
