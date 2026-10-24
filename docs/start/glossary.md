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

看手环资料最劝退的不是难度，是一堆没人解释的缩写。这里按「你会先遇到谁」排序。

## 系统与运行时

| 术语 | 解释 |
| --- | --- |
| **VelaOS** | 小米基于 NuttX 的穿戴/物联网操作系统。2023-08 的小米手环 8 Pro 起用于手环产品线。 |
| **NuttX** | Apache 基金会下的实时操作系统（RTOS），VelaOS 的内核基础。原生应用研究全建立在这上面。 |
| **快应用（Quick App）** | 小米/主流手机厂商的 JS 应用形态，用类 Vue 语法写，打包成 `.rpk`。手环上的快应用跑在 VelaOS 的应用引擎里。 |
| **AiotJS** | 手环上跑快应用的 JS 运行时，quickjs 衍生，语法接近 Vue，但**不是**完整浏览器环境。 |
| **rpk** | 快应用的打包产物（类似 apk / ipa）。 |
| **AIoT IDE** | 小米官方的快应用开发工具，含模拟器。当前版本约 v1.7.0。 |

## 原生应用

| 术语 | 解释 |
| --- | --- |
| **ET_REL** | ELF 的一种类型，可重定位目标文件。NuttX 的 `insmod` 加载的就是它，相当于「内核模块」。 |
| **insmod** | 把 `.elf` 模块加载进内核的命令。手环上的入口是 Lua 表盘里的 `os.execute()`。 |
| **miwear_app_t / miwear_page_t** | 手环应用与页面注册用的结构体，定义应用元信息、页面生命周期。 |
| **packagemanager_api_s** | 应用管理接口：`install` / `recover` / `uninstall` / `unregister` / `set_hidden` / `is_hidden`。 |
| **LVGL** | 轻量级嵌入式 GUI 库，手环 UI 的绘制层，10 Pro 上是 v9。 |

## 硬件

| 术语 | 解释 |
| --- | --- |
| **BES2700iMP** | 恒玄（Bestechnic）的穿戴 SoC，Cortex-M33 核心，小米手环 10 Pro 使用。 |
| **Cortex-M33** | Arm 的嵌入式 CPU 核，带 TrustZone。 |
| **SPI NAND** | 外挂的 SPI 接口 NAND Flash，手环上用于存资源/数据，是固件研究的关键目标。 |
| **PSRAM** | 伪静态随机存储器，常作为 MCU 的外部扩展内存。 |
| **QEMU** | 开源模拟器，社区有人尝试模拟手环（资料少，谨慎对待）。 |

## 表盘与协议

| 术语 | 解释 |
| --- | --- |
| **表盘 bin** | 手环表盘的打包格式，可解包/重打包，社区有 `Mi8WfBinTool` 等工具。 |
| **auth key** | BLE 配对认证用的密钥，协议研究的第一步。 |
| **米坛（bandbbs）** | 国内最大的手环社区，硬核内容多但沉在论坛帖子里。本站与其定位互补。 |

## 容易混淆的

- **VelaOS ≠ Vela 快应用框架**：前者是系统，后者是跑在系统上的应用形态。
- **有 Vela ≠ 有快应用引擎**：红米手环 3 就是反例。
- **模拟器能跑 ≠ 真机能跑**：分辨率、权限、系统版本都可能不一样。
