---
title: Lua 表盘示例
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: tested
source: "https://github.com/qxdho/miband-dev/tree/main/watchfaces/fslist"
contributors: [miband-dev]
---

# Lua 表盘示例

<StatusBadge status="tested" verified="2026-11-01" />

仓库中有三个可直接对照的 Lua 表盘工程，分别覆盖只读探测、文件系统遍历与原生模块安装。

## 文件清单（`watchfaces/fslist/`）

- 目标：10 Pro；
- 行为：仅在按键时执行 `ls -R /`，结果写入 `/data/fslist.txt`；
- 安全设计：加载阶段零动作、`pcall` 包裹、busy 门控；
- 构建：`p67build.cjs`，支持 `build` / `verify`；
- 离线测试：`tools/smoke.lua`。

该工程可作为「最小可安装表盘 + 一次危险操作」的模板。

## LRA 探测（`probe/`）

- `lua/main.lua`：只读读取 `/proc/version`，尝试打开 `/dev/lra0`，执行 `ls /dev`、查看 `/proc/modules` 与 `/data/rc.d`，结果写 `/tmp/lra_probe.txt`；
- `native/hello.ko` 与 `lra_probe.ko`：用于验证模块加载链路；
- `build.sh`：交叉编译脚本。

适用于在加载模块之前，先验证表盘能否读取设备与执行 shell。

## 原生模块安装器（`installer/`）

- 一个完整的 Lua 表盘安装器：检查固件、部署模块、读回校验、`insmod`、检查 `/proc/modules`、写入 `/data/rc.d`；
- 使用完整 Lua 5.4 的 `io.open`、`os.execute`、`os.remove`；
- `build.mjs` 校验 32 位小端 `ET_REL` ARM ELF；
- `pack67.mjs` 生成 p67 容器；
- 不执行 `rmmod`；加载失败时由 rc.d 脚本自删；写入操作幂等。

这是「原生应用随 Lua 表盘安装」的参考实现，说明见[加载方式](/native/loading)。

## 使用建议

1. 先安装 `fslist` 确认表盘安装链路；
2. 再用 `probe` 确认设备节点与 shell；
3. 最后用 `installer` 部署自己的 `.ko`；
4. 每一步均保留回退路径，不应在同一表盘内同时进行探测与写入。

## 相关页面

- [Lua 表盘开发与调试](/watchface/lua/develop)
- [Lua 表盘打包方式](/watchface/lua/package)
- [原生示例](/native/examples)
