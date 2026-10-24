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
| **modlib** | NuttX 的可加载模块子系统，作用对应 Linux 的 `.ko`，通过 `insmod` 载入。只有 10 Pro 的固件里存在。 |
| **贴片函数（veneer）** | 把固件函数地址硬编码进去的 `static inline` 包装。固件符号表被剥离后，模块只能这样调用固件函数。 |
| **target pack** | Canopus 按 `firmware_sha256` 划分的目录，内含该固件版本恢复出的符号与地址。 |
| **Canopus** | 第三方模块加载器与应用运行时，用 Lua 表盘驱动。 |
| **Chaos** | 第三方模块框架，Rust 编写，自带渲染引擎。 |

## 逆向与固件

| 术语 | 解释 |
| --- | --- |
| **vela_ap.bin** | 手环应用处理器镜像，即整个 NuttX 与快应用运行时。大部分固件分析的対象。 |
| **JIDL** | 快应用 JS API 的接口描述层，决定哪些模块被注册进运行时。 |
| **feature 裁剪** | 编译期由 `Kconfig` 与 Makefile 决定把哪些子系统打进 `vela_ap.bin`。 |
| **Miwear NET** | 小米私有协议，把手机的网络通过 BLE 以 TUN 设备形式延伸到手表。 |
| **TUN** | 虚拟网络设备，内核把 IP 包交给用户态程序，再由它转发出去。 |
| **interconnect** | 小米的跨设备互联框架，是把手机网络延伸到手表的那条官方通路。 |
| **Thumb 位** | Cortex-M 函数指针最低位为 1 表示按 Thumb 解码。写贴片函数时漏掉它会在跳转时触发 HardFault。 |
| **双映射（`0x0C000000` / `0x2C000000`）** | 同一段固件在两组虚拟地址下的视图，换算时必须在同一视图内取地址。 |
| **`.face`** | 表盘的二进制打包格式，结构与 `.bin` 不同，见[表盘打包格式](/apps/watchface/package)。 |

## 易混淆项

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
