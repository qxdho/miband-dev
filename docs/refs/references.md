---
title: 参考资料
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/11-参考资料.md"
contributors: [miband-dev]
---

# 参考资料

<StatusBadge status="sourced" verified="2026-10-25" />

结论：外部资料的可信度并不一致。固件哈希、本地目录与解包结果可以直接复核，第三方框架的能力声明、固件归档链接与网络符号地址需要独立验证。以下保留原始分组与列，并在每组末尾增加「可信度」列，取值统一为「已证实」「推断」「待定」。

## 可信度口径

| 标记 | 含义 |
| --- | --- |
| 已证实 | 本机实测、代码直读或文件哈希可复核 |
| 推断 | 第三方声明，未独立验证；或仅有单一来源 |
| 待定 | 未知、缺失或尚未排查 |

## 机型与证据范围

| 机型 | 相关材料 | 已证实项 | 推断项 | 待定项 |
| --- | --- | --- | --- | --- |
| 10 Pro | `firmware/10pro/fw.bin`、`vela_ap.bin`、Canopus target pack | 固件与 AP 哈希、target 名匹配、target pack 文件结构 | 网络符号地址、Canopus 模块加载可行性 | 3.101.043 真机加载 |
| 9 Pro | `firmware/9pro/fw9pro.bin`、`fwx9/`、固件归档 | 包哈希、解包得到 258 个文件 | 归档站其他版本的完整性 | 与 10 Pro 的完整差异清单 |

## 第三方框架

### Canopus

| 项 | 值 | 可信度 |
| --- | --- | --- |
| 仓库 | https://github.com/AstralSightStudios/Canopus | 已证实 |
| 许可 | AGPL-3.0 | 已证实 |
| 规模 | 2646 文件 / ~17 MB | 已证实 |
| 本地 | `研究环境/canopus/`（`--depth 1`） | 已证实 |
| 官方文档 | https://abox.run/docs/usage/canopus | 已证实 |

文档站的表述可归纳为：Canopus 是面向 Xiaomi Vela 穿戴设备的内核模块开发框架，通过 Lua 表盘调用 NuttX Shell，再用 `insmod` 载入编译好的内核模块。系统接口依赖每台设备、每个固件版本内的不同函数地址，同一模块与加载器都需要按设备和版本适配。以上属于第三方声明，可信度为推断，未在本机复现。

### Canopus 模块示例

| 模块 | 仓库 | 说明 | 可信度 |
| --- | --- | --- | --- |
| 蓝牙音频 | https://github.com/Searchstars/Canopus-Module-BluetoothAudio | 为不支持连接蓝牙耳机的 Vela 设备补全 A2DP + AVDTP | 推断 |

该模块是「模块能补全缺失的内核能力」的直接先例。补全效果与设备兼容范围没有在本机验证，引用时应保留这一限制。

### Chaos

| 项 | 值 | 可信度 |
| --- | --- | --- |
| 仓库 | https://github.com/WenHuaYiYang/Chaos-Module | 已证实 |
| 许可 | AGPL-3.0 | 已证实 |
| 规模 | 36 个 `.rs`，`supervisor/src` 约 13,944 行 | 已证实 |
| 本地 | `研究环境/projects/chaos/` | 已证实 |

### 固件归档

| 项 | 值 | 可信度 |
| --- | --- | --- |
| 仓库 | https://github.com/hrk666666/firmware-archives-public | 推断 |
| 内容 | 小米手环 9 Pro（`miwear.watch.n67cn`）全量包，v3.1.171 / 175 / 187 / 190 | 推断 |
| 9 Pro 3.1.190 直链 | https://github.com/hrk666666/firmware-archives-public/releases/download/firmware-miwear.watch.n67cn-v3.1.190-5a75fc0d/miwear.watch.n67cn_v3.1.190_full_77174e6a.bin | 推断 |

3.1.190 包的哈希前缀 `77174e6a` 与本地 `fw9pro.bin` 的 sha256 前缀一致，说明归档链接与本地文件可以对应。归档站其他版本没有逐个下载核对，仓库与链接的长期可用性仍属推断。

## 固件实体

| 设备 | 文件 | 大小 | sha256 | 可信度 |
| --- | --- | ---: | --- | --- |
| 10 Pro | `firmware/10pro/fw.bin` | 90,739,541 | `a4ce8564778624f8287ea91015867dc1725b649fbc10f2c4fa4b6813af7bc4d9` | 已证实 |
| 10 Pro | `firmware/10pro/fwx/vela_ap.bin` | 13,795,728 | `519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec` | 已证实 |
| 9 Pro | `firmware/9pro/fw9pro.bin` | 50,330,500 | `77174e6a39987ba6820796c3a20987c02fd3853fda0b85560bd5bddfad22deb4` | 已证实 |

10 Pro 的 target 名为 `miwear.watch.p67cn_v3.101.043_full_a4ce8564`，与 Canopus target pack 的 `firmware_sha256` 完全一致。这一对应关系已证实，可作为跨来源核对固件版本的依据。

## Canopus 3.101.043 target pack

| 项 | 值 | 可信度 |
| --- | --- | --- |
| 路径 | `projects/canopus/targets/xiaomi-band-10-pro-3.101.043/` | 已证实 |
| `firmware_build` | `CONBINE_LTALM078_T3.101.043_08041658` | 已证实 |
| loader | `nuttx-modlib-elf32-rel` | 已证实 |
| `symbol_imports` | `"none"` | 已证实 |
| 符号数 | 259（含 240+ 可导入符号） | 已证实 |
| veneer | 55 条 | 已证实 |
| 证据文件 | 36 份（`evidence/`） | 已证实 |
| 生成物 | `generated/canopus_target_config.h`、`canopus_veneer.h` | 已证实 |

### 与本项目直接相关的符号

| 符号 | 地址（Thumb） | 原型 | 可信度 |
| --- | --- | --- | --- |
| `netdev_register` | `0xC1FC215` | `int(void *, int)` | 推断 |
| `ipv4_input` | `0xC1F95C9` | `int(void *)` | 推断 |
| `netdev_input` | `0xC1FC9F5` | `int(void *, void *, int)` | 推断 |
| `register_driver` | `0xC1AFF61` | `int(const char *, const void *, uint32_t, void *)` | 推断 |

四个网络符号标注的证据 ID 都是 `EVID-NET-001`，但 `evidence/` 下不存在这个文件。蓝牙相关的 `EVID-BT-1043-*` 证据齐全。网络符号的出处因此弱于蓝牙符号，使用前应独立验址。地址末位为奇数，符合 Thumb 函数指针的编码规则，但这一形式检查不能替代对函数序言的反汇编确认。

## 日志材料

| 来源 | 路径 | 说明 | 可信度 |
| --- | --- | --- | --- |
| 手机日志 | `logs/mifitlog/` | 小米运动健康 3.59.1，含 `XiaomiFit.main.log` 等 6 个文件，8 KB 轮转 | 已证实 |
| 手环日志 | `logs/bandlog/` | `log1.gz` 至 `log6.gz`（各约 2 MB 解压）加 `tmp.log`，来自 `/data/offlinelog/` | 已证实 |
| 原始包 | `log-archive.zip`（用户提供的日志归档） | 2,795,808 字节 | 已证实 |

时区差异已证实：手机日志使用 UTC+8，手环日志使用 UTC。对照两侧时间戳时需要把手机日志减 8 小时，否则同一事件会错位。

## 本机材料

| 路径 | 内容 | 可信度 |
| --- | --- | --- |
| `firmware/10pro/fwx/` | 10 Pro 解包结果，含 `vela_ap.bin`、`vela_bl2.bin`、`vela_ota.bin`、`vela_resource.bin`、`ota.sh` | 已证实 |
| `firmware/9pro/fwx9/` | 9 Pro 解包结果，258 个文件 | 已证实 |
| `firmware/10pro/` | 10 Pro 原始包 `fw.bin` 与解包结果 `fwx/` | 已证实 |
| `firmware/9pro/` | 9 Pro 原始包 `fw9pro.bin` 与解包结果 `fwx9/` | 已证实 |
| `logs/` | 手机日志、手环日志、固件档案馆抓取页 | 已证实 |
| `vendor/` | 小米开源代码，含 `oss_feature`、`oss_quickapp` | 已证实 |
| `projects/` | 第三方项目，含 `canopus`、`chaos` | 已证实 |
| `probe/` | 快应用探针工程 | 已证实 |
| `tools/` | 23 个分析脚本与 `cs/`（capstone） | 已证实 |
| `docs/` | 文档集 | 已证实 |
| `research/_archive/` | 早期单文件笔记，内容已拆分并入正文 | 已证实 |

`tools/` 下脚本的用途与调用方式见[逆向工具与复现](/refs/reversing)。该页列出的主要入口覆盖定位、反汇编、专项扫描与 zip 解包四类。

## 相关标准与上游

| 项 | 说明 | 可信度 |
| --- | --- | --- |
| NuttX | Vela 的内核基础；`drivers/net/tun.c` 上游 1338 行 | 已证实 |
| LVGL v8 / v9 | 界面库，Canopus 两个版本各有一套 target 实现 | 已证实 |
| QuickJS / AIOTJS | 快应用运行时（两代） | 已证实 |

## 外部公开资料（2026-10 增补）

以下来源用于补全 BLE 鉴权、启动链、模拟器与拆机读取，均已在正文标注出处。可信度按本站口径标注。

| 资料 | 链接 | 涉及页面 | 可信度 |
| --- | --- | --- | --- |
| huami-token | https://codeberg.org/argrento/huami-token | [BLE 协议与配对鉴权](/refs/ble) | 已证实（源码与文档可复核） |
| Gadgetbridge 配对文档 | https://gadgetbridge.org/basics/pairing/huami-xiaomi-server/ | [BLE 协议与配对鉴权](/refs/ble) | 已证实 |
| BreakMi（Hardwear.io USA 2023） | https://hardwear.io/usa-2023/presentation/breakmi-reversing-exploiting-and-fixing-xiaomi-and-fitbit-fitness-tracking-ecosystems.pdf | [BLE 协议与配对鉴权](/refs/ble) | 推断（会议材料，未逐条复核） |
| Habr：为 10 Pro 添加可靠 recovery | https://habr.com/ru/articles/1066280/ | [启动链与救砖](/system/firmware/recovery) | 推断（第三方实践，未复现） |
| 米坛：10 Pro SPI NAND 原始镜像读取 | https://www.bandbbs.cn/threads/29808/ | [启动链与救砖](/system/firmware/recovery) | 推断（含哈希与文件清单） |
| DDlhy/Miband10pro-firmware-extraction | https://github.com/DDlhy/Miband10pro-firmware-extraction | [启动链与救砖](/system/firmware/recovery) | 推断（MIT，未复现） |
| DDlhy/Miband-qemu-simulator | https://github.com/DDlhy/Miband-qemu-simulator | [QEMU 模拟器](/refs/emulator) | 已证实（仓库与构建文档可复核） |
| 米坛：11 NFC / 10 Pro QEMU 模拟器 | https://www.bandbbs.cn/threads/29834/ | [QEMU 模拟器](/refs/emulator) | 已证实 |
| JSLab | https://github.com/cciccicu/JSLab | [示例代码](/refs/examples) | 推断（源码可读，未构建） |
| Schedule-Vela | https://github.com/Jursin/Schedule-Vela | [示例代码](/refs/examples) | 推断（源码可读，未构建） |
| 路明笔记：Vela 快应用入门 | https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/ | [机型能力矩阵](/start/models)、[环境搭建](/apps/quickapp/setup) | 推断（单篇博客，分辨率与圆角待复核） |

## 引用规范

原始资料使用符号标记来源强度，页面统一改写为文字：

| 表述 | 含义 |
| --- | --- |
| 已证实 | 本机实测或代码直读 |
| 推断 | 第三方声明，未独立验证 |
| 待定 | 未知或待查 |

写作时不使用符号或颜色表示可信度。无法确认的结论写「待定」，仅有第三方声明写「推断」，能够用哈希、路径或反汇编复核的结论写「已证实」。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| 9 Pro `firmware/9pro/fw9pro.bin` 的 sha256 | 已证实，`77174e6a…22deb4`，与 release tag 后缀一致 |
| `EVID-NET-001` 缺失是否影响符号可信度 | 推断，建议独立验址 |
| Chaos 是否有官方文档站 | 待定，未见 |

## 相关页面

- 全部分析脚本与复现命令：[逆向工具与复现](/refs/reversing)
- 已恢复符号的地址与原型：[地址手册](/system/native/addresses)
- 工具用途与来源索引：[工具索引](/refs/)
- 误判与证据强度的形成过程：[研究历程与误判](/about/history)
