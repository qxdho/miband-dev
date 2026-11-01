---
title: 最小模块
models: [band10pro]
firmware: "3.101.043"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/probe"
contributors: [miband-dev]
---

# 最小模块

<StatusBadge status="sourced" verified="2026-11-01" />

`probe/native/hello.ko` 是仓库中的最小验证模块，用于确认设备能否通过 `insmod` 加载自编译的 `ET_REL` 模块。

## 构建

```bash
cd probe/native
./build.sh
```

产物应为 32 位小端 ARM `ET_REL`，可通过以下命令检查：

```bash
file hello.ko
readelf -h hello.ko   # Type: REL
```

`installer/build.mjs` 会执行同样的校验，并拒绝架构或类型不符的文件。

## 加载验证

1. 将 `hello.ko` 打入一个 Lua 表盘（参考 `installer/pack67.mjs`）；
2. 安装表盘；
3. 在表盘脚本中执行 `insmod`；
4. 读取 `/proc/modules`，确认模块出现；
5. 查看内核日志，确认 `init` 已执行。

若该步骤失败，不应继续编写业务模块，应先检查固件是否包含 `modlib`。

## 最小模块的边界

- 不注册界面、不注册设备节点；
- 只验证加载、重定位与 `init` 执行；
- 不写入 `/data/rc.d`，避免加载失败后触发自启；
- 加载后不执行 `rmmod`，仓库约定为永不卸载。

## 后续步骤

- 需要注册界面时，参见[内核模块系统](/native/develop/modules)与[LVGL 与界面](/native/ui/lvgl)；
- 需要设备节点时，参见[能力](/native/capabilities)；
- 需要完整安装器时，参见[加载方式](/native/loading)。

## 相关页面

- [支持的设备](/native/devices)
- [原生示例](/native/examples)
