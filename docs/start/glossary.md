---
title: 术语表
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://github.com/open-vela/docs"
contributors: [miband-dev]
---

# 术语表

<StatusBadge status="sourced" verified="2026-10-24" />

## 系统与运行时

| 术语 | 解释 |
| --- | --- |
| **VelaOS** | 小米基于 NuttX 的穿戴与物联网操作系统。2023-08 发布的小米手环 8 Pro 起用于手环产品线。 |
| **NuttX** | Apache 基金会旗下的实时操作系统（RTOS），VelaOS 的内核基础。 |
| **快应用（Quick App）** | 小米等手机厂商的 JS 应用形态，使用类 Vue 语法编写，打包为 `.rpk`，在 VelaOS 的应用引擎中运行。 |
| **AiotJS** | 手环上运行快应用的 JS 运行时，由 quickjs 衍生，不提供完整浏览器环境。 |
| **rpk** | 快应用的打包产物格式，作用类似 Android 的 apk、iOS 的 ipa。 |
| **AIoT IDE** | 小米官方的快应用开发工具，含模拟器。 |

## 原生应用

| 术语 | 解释 |
| --- | --- |
| **ET_REL** | ELF 的一种类型，即可重定位目标文件。NuttX 的 `insmod` 加载的是该类型，作用类似内核模块。 |
| **insmod** | 将 `.elf` 模块加载进内核的命令。手环上的入口是 Lua 表盘的 `os.execute()`。 |
| **miwear_app_t / miwear_page_t** | 手环应用与页面的注册结构体，定义应用元信息与页面生命周期。 |
| **packagemanager_api_s** | 应用管理接口，含 `install`、`recover`、`uninstall`、`unregister`、`set_hidden`、`is_hidden`。 |
| **LVGL** | 轻量级嵌入式 GUI 库，手环 UI 的绘制层。小米手环 10 Pro 上为 v9。 |

## 硬件

| 术语 | 解释 |
| --- | --- |
| **BES2700iMP** | 恒玄科技（Bestechnic）的穿戴 SoC，Cortex-M33 核心，用于小米手环 10 Pro。 |
| **Cortex-M33** | Arm 的嵌入式 CPU 核，支持 TrustZone。 |
| **SPI NAND** | 通过 SPI 接口外挂的 NAND Flash，手环上用于存放资源与数据，是固件研究的主要目标。 |
| **PSRAM** | 伪静态随机存储器，常作为 MCU 的外部扩展内存。 |
| **QEMU** | 开源模拟器，社区有在 PC 上模拟手环的尝试，资料较少。 |

## 表盘与协议

| 术语 | 解释 |
| --- | --- |
| **表盘 bin** | 手环表盘的打包格式，可解包与重打包，社区有 `Mi8WfBinTool` 等工具。 |
| **auth key** | BLE 配对认证所用的密钥，是协议研究的第一步。 |
| **米坛（bandbbs）** | 国内的小米手环社区。 |

## 易混淆项

- **VelaOS 与快应用框架**：前者是操作系统，后者是运行于其上的应用形态。
- **有 Vela 与有快应用引擎**：红米手环 3 搭载 Vela 但无快应用引擎。
- **模拟器可运行与真机可运行**：分辨率、权限、系统版本均可能不同。
