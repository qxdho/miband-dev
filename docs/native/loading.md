---
title: 原生应用加载方式
models: [band10pro]
firmware: "3.101.043"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/installer"
contributors: [miband-dev]
---

# 原生应用加载方式

<StatusBadge status="sourced" verified="2026-11-01" />

原生应用没有独立的安装入口，必须配合 Lua 表盘进行安装。`.ko` 文件作为表盘资源被打入容器，由表盘脚本在设备上解包并执行 `insmod`，随后写入开机自启配置。

::: danger 关键前提
安装原生应用的过程实际上是安装一个携带 `.ko` 的 Lua 表盘。若没有表盘，就没有执行 `insmod` 的入口；若设备缺少 `modlib`，表盘也无法加载模块。
:::

## 完整链路

```text
hello.ko
  → 作为表盘资源（type=5）打进容器
  → 安装 Lua 表盘
  → 表盘脚本解包到 SCRIPT_PATH
  → os.execute('insmod /data/.../hello.ko')
  → 检查 /proc/modules
  → 写入 /data/rc.d 实现开机自启
```

## 安装器的处理流程

仓库中的 `installer/` 是一套可供参考的完整实现，其流程如下：

1. 检查固件版本与目标机型；
2. 将模块部署到 `/data/<token>/<name>/<file>`；
3. 读回文件，确认写入完整；
4. 执行 `insmod`；
5. 检查 `/proc/modules` 中是否出现模块；
6. 写入 `/data/rc.d`，使模块在重启后自动加载；
7. 不执行 `rmmod`；加载失败时由 rc.d 脚本自行删除；
8. 写入操作具有幂等性，重复安装不会叠加。

`build.mjs` 会校验模块是否为 32 位小端 `ET_REL` ARM ELF；`pack67.mjs` 负责生成 p67 容器（`0x1234A55A`、版本 `0x00010003`、`_lua/xiaomi-band-10-pro/` 路径、336×480 预览图）。

## 手工验证步骤

1. 首先使用[最小模块](/native/develop/hello)确认 `insmod` 能够成功；
2. 通过 `lsmod` 或 `/proc/modules` 确认模块已加载；
3. 再验证模块注册的界面或设备节点；
4. 确认上述步骤无误后，再写入 `/data/rc.d`。

首次测试时不应写入自启配置。若模块加载失败且同时启用了自启，设备可能进入重启循环。

## 失败与回滚

| 阶段 | 失败表现 | 处理方式 |
| --- | --- | --- |
| 打包 | 容器被拒绝 | 核对容器版本、设备标识与预览图 |
| 解包 | 文件缺失 | 检查容器内路径前缀与资源类型 |
| `insmod` | 返回错误 | 检查 ELF 架构、重定位与固件 `modlib` |
| 注册 | 模块已加载但无界面 | 检查 `miwear_app_t` 与页面注册 |
| 自启 | 重启循环 | 删除 `/data/rc.d` 中对应脚本，换回默认表盘 |

## 相关页面

- [支持的设备](/native/devices)
- [能力](/native/capabilities)
- [最小模块](/native/develop/hello)
- [Lua 表盘打包方式](/watchface/lua/package)
- [原生示例](/native/examples)
