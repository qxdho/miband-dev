---
title: 支持的设备
models: [band10pro]
firmware: "3.101.043"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/research"
contributors: [miband-dev]
---

# 支持的设备

<StatusBadge status="sourced" verified="2026-11-01" />

原生应用依赖固件里的 `modlib` 子系统。不是所有 Vela 设备都带这个子系统，机型矩阵里的 `native` 字段就是用来标记这一点的。

## 当前结论

| 机型 | 代号 / 型号 | 固件 | `modlib` | 本站证据 |
| --- | --- | --- | --- | --- |
| 10 Pro | `p67cn` / `M2551B1` | `3.101.043` | 有 | 模块加载、安装器与地址恢复均已复现 |
| 9 Pro | — | — | 未发现 | 固件分析中未见该子系统 |
| 9 / 10 | — | — | 未知 | 没有公开可行记录 |

Canopus 的 target pack 覆盖了 band10pro、band9、band9pro、band11、p65 等多个目标，但**目标包存在不等于设备具备 `modlib`**。判断一台设备是否支持，以固件中的实际子系统与加载结果为准。

## 怎么确认

1. 查[机型能力矩阵](/start/models)的 `native` 字段；
2. 在设备上确认 `/dev/canopus` 是否存在；
3. 查看 `/proc/modules` 是否已有可加载模块；
4. 用最小模块做一次加载测试，见[最小模块](/native/develop/hello)。

任何一步失败都不要继续部署业务模块。

## 固件版本绑定

模块调用固件函数依赖硬编码地址。固件升级后地址可能变化，模块需要按新版本重新恢复符号；这也是原生应用难以跨版本分发的原因。

## 相关页面

- [原生应用介绍](/native/)
- [加载方式](/native/loading)
- [能力](/native/capabilities)
- [Canopus 地址手册](/native/advanced/addresses)
