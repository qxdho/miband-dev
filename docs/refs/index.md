---
title: 协议、工具与参考
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-25
status: sourced
source: "https://wiki.bandbbs.cn/"contributors: [miband-dev]
---

# 协议、工具与参考

<StatusBadge status="sourced" verified="2026-10-25" />

横向资料层：手环与手机之间的 BLE 通信、逆向与复现用的工具链、可追溯的外部资料，以及示例工程。这一层不针对具体设备，而是各层共用的方法与索引。

## 页面

| 页面 | 内容 |
| --- | --- |
| [BLE 协议与配对鉴权](/refs/ble) | GATT 链路、服务端托管 key、huami-token 与 Gadgetbridge 配对 |
| [网络通路](/refs/network) | TCP/IP over BLE、TUN、手机侧代理与 `fetch` 的实测故障模式 |
| [QEMU 模拟器](/refs/emulator) | 在 PC 上运行 10 Pro / 11 NFC 原厂固件 |
| [逆向与复现](/refs/reversing) | capstone、字符串与指针扫描、Thumb 字面量池、脚本清单与命令 |
| [参考资料](/refs/references) | 开源项目、官方文档、社区证据，按机型标注可信度 |
| [示例代码](/refs/examples) | 可构建的最小工程、社区项目与约定 |

## 工具索引

本站只记录工具用途、适用层与来源，不托管二进制文件，不提供网盘链接，不代发安装包。

| 工具 | 用途 | 适用层 | 说明 |
| --- | --- | --- | --- |
| [AIoT IDE](https://iot.mi.com/vela/quickapp/) | 快应用开发、模拟器、打包 | 应用 | 官方工具，主要面向 Windows |
| VelaOS 系统更新 | 固件升级 | 固件 | 只通过官方 App 升级，本站不提供安装包 |
| 表盘自定义工具 | 表盘替换与制作 | 表盘 | 来源见[米坛知识库](https://wiki.bandbbs.cn/) |
| AstroBox / OronBox / BandBurg | 第三方应用安装与管理 | 应用 | 兼容性随固件版本变化 |
| [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool) | 表盘 `.bin` 打包与解包 | 表盘 | 第 8 代工具，9/10 兼容性需核实 |
| [atc1441 工具集](https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking) | 固件与 SoC 研究 | 固件 | 英文资料，面向 Band 10 Pro |
| [huami-token](https://codeberg.org/argrento/huami-token) | 从小米/Zepp 服务器取 BLE 配对 key | 协议 | 需要账号密码，MIT 许可 |
| [Gadgetbridge](https://gadgetbridge.org/) | 开源替代客户端，含配对与同步实现 | 协议、应用 | 支持的型号与功能随版本变化 |
| [QEMU 模拟器](https://github.com/DDlhy/Miband-qemu-simulator) | 在 PC 上运行手环原厂固件 | 固件、原生 | 10 Pro / 11 NFC，图形与 NFC 不完整 |

## 收录规则

- 可追溯到原始出处（GitHub 仓库、官方站点或论坛原帖），不收录转载站与网盘；
- 注明最后核对日期与对应固件版本；
- 涉及刷机或解锁的工具必须附带风险提示，不收录一键封装工具；
- 新增工具时在表格中增加一行，并更新 frontmatter 的 `verified`。
