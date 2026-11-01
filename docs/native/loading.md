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

原生应用**没有独立的安装入口**。它必须配合一个 Lua 表盘安装：`.ko` 作为表盘资源被打进容器，表盘脚本在设备上解包、执行 `insmod`，再写入开机自启。

::: danger 关键前提
“安装原生应用”实际是“安装一个携带 `.ko` 的 Lua 表盘”。没有表盘，就没有执行 `insmod` 的入口；没有 `modlib`，表盘也加载不了模块。
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

## 安装器做了什么

仓库的 `installer/` 是一个可参考的完整实现：

1. 检查固件版本与目标机型；
2. 把模块部署到 `/data/<token>/<name>/<file>`；
3. 读回文件，确认写入完整；
4. 执行 `insmod`；
5. 检查 `/proc/modules` 中是否出现模块；
6. 写入 `/data/rc.d`，让模块在重启后自动加载；
7. 永不 `rmmod`；加载失败时让 rc.d 脚本自删；
8. 写入幂等，重复安装不会叠加。

`build.mjs` 会校验模块是 32 位小端 `ET_REL` ARM ELF；`pack67.mjs` 负责生成 p67 容器（`0x1234A55A`、版本 `0x00010003`、`_lua/xiaomi-band-10-pro/` 路径、336×480 预览图）。

## 手工验证顺序

1. 先用[最小模块](/native/develop/hello)确认 `insmod` 能成功；
2. 用 `lsmod` 或 `/proc/modules` 确认模块已加载；
3. 再验证模块注册的界面或设备节点；
4. 最后才写入 `/data/rc.d`。

不要在第一次测试就写自启；加载失败又自启，会把设备拖进重启循环。

## 失败与回滚

| 阶段 | 失败表现 | 处理 |
| --- | --- | --- |
| 打包 | 容器被拒 | 核对容器版本、设备标识、预览图 |
| 解包 | 文件缺失 | 检查容器内路径前缀与资源类型 |
| `insmod` | 返回错误 | 检查 ELF 架构、重定位、固件 `modlib` |
| 注册 | 模块已加载但无界面 | 检查 `miwear_app_t` / 页面注册 |
| 自启 | 重启循环 | 删除 `/data/rc.d` 中对应脚本，换回默认表盘 |

## 相关页面

- [支持的设备](/native/devices)
- [能力](/native/capabilities)
- [最小模块](/native/develop/hello)
- [Lua 表盘打包方式](/watchface/lua/package)
- [原生示例](/native/examples)
