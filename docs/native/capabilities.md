---
title: 原生应用能力
models: [band10pro]
firmware: "3.101.043"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/research"
contributors: [miband-dev]
---

# 原生应用能力

<StatusBadge status="sourced" verified="2026-11-01" />

原生模块运行在内核态，能直接调用固件里的函数与设备节点。能力很强，但接口没有稳定 ABI，全部依赖硬编码地址。

## 可调用

| 能力 | 入口 | 说明 |
| --- | --- | --- |
| 绘制界面 | `miwear_app_t` / `miwear_page_t` / LVGL | 注册应用与页面，直接使用 LVGL 控件 |
| 应用管理 | `packagemanager_api_s` | `install`、`recover`、`uninstall`、`unregister`、`set_hidden`、`is_hidden` |
| 字符设备 | `char-device.register` | 注册自定义设备节点，供 Lua 侧访问 |
| 启动器入口 | `launcher.entry` | 在启动器里增加入口 |
| 原生应用注册 | `native-app.register` | 把模块注册为系统应用 |
| 开机自启 | `/data/rc.d` | 由 Lua 表盘写入，重启后加载模块 |

具体符号与地址见[Canopus 地址手册](/native/advanced/addresses)，框架差异见[Canopus](/native/frameworks/canopus)与[Chaos](/native/frameworks/chaos)。

## 限制

- **不能导入符号**：调用固件函数要把地址写进贴片函数；
- **没有调试器与沙箱**：内核态错误可导致死机；
- **RAM 常驻**：模块不在磁盘上长期存在，重启后需重新加载；
- **`persistent_autoload = false`**：系统不会自动保留模块；
- **固件绑定**：换固件版本通常要重新恢复整套符号；
- **机型极窄**：目前只有 10 Pro 有公开可行记录。

## 适合与不适合

适合：

- 需要访问 `/dev`、`/proc` 或内核接口的实验；
- 需要绕过 AiotJS 限制的界面与设备控制；
- 对固定固件版本做深度定制。

不适合：

- 需要跨机型、跨版本分发的通用应用；
- 需要稳定 API 与长期维护的产品；
- 无法承担死机与变砖风险的场景。

## 相关页面

- [原生应用介绍](/native/)
- [支持的设备](/native/devices)
- [加载方式](/native/loading)
- [内核模块系统](/native/develop/modules)
