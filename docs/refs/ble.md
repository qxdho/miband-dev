---
title: BLE 协议与配对鉴权
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-25
status: sourced
source: "https://codeberg.org/argrento/huami-token"
contributors: [miband-dev]
---

# BLE 协议与配对鉴权

<StatusBadge status="sourced" verified="2026-10-25" />

结论：手环与手机之间走 BLE GATT，但第三方接入的第一道门槛不是协议解析，而是配对密钥。每台设备在出厂配对时由官方 App 生成并上传到小米服务器，第三方客户端必须先取回这把 16 字节的 key 才能建立受信任连接。协议本身的公开资料零散，Gadgetbridge 的实现是目前最系统的参考。

## 为什么需要 key

早期小米手环（1 至 6 代）的 BLE 通道不加密，配对即连接。从 VelaOS 一代开始，设备与官方 App 之间使用服务端托管的配对密钥：手机 App 登录账号后从云端取 key，再用 key 完成与手环的鉴权；换一台手机重新配对时同样从云端取。

这意味着：

- 同一账号下，key 与设备 MAC 绑定，换账号或解绑后旧 key 失效；
- 第三方客户端如果拿不到 key，能扫描到设备、能连上 GATT，但读写受保护的特征会失败；
- key 保存在小米/Zepp 服务器上，只能通过账号登录获取，不能从手环本地导出。

官方说明见 Gadgetbridge 的 [Huami/Xiaomi server pairing](https://gadgetbridge.org/basics/pairing/huami-xiaomi-server/) 页面，该页面同时列出了需要服务端配对的设备清单。

## 用 huami-token 取 key

[huami-token](https://codeberg.org/argrento/huami-token)（原 GitHub 仓库已迁至 Codeberg）是社区维护的取 key 脚本，支持 Amazfit/Zepp 与小米两种账号体系。

```bash
# 小米账号
huami-token --method xiaomi --email your_email@example.com --password your_password --bt_keys

# Amazfit / Zepp 账号
huami-token --method amazfit --email your_email@example.com --password your_password --bt_keys
```

输出形如：

```text
Device 0: Amazfit Band 7
  MAC: AB:CD:EF:12:34:56
  Key: 0xa3c10e34e5c14637eea6b9efc06106
```

`Key` 即配对密钥，Gadgetbridge 在配对流程中要求手工填入这串十六进制值。使用前提：

1. 账号必须能用邮箱与密码登录（不支持仅手机号或第三方登录的账号）；
2. 设备必须已经用官方 App 配对并同步过，key 才会存在于服务器；
3. 脚本会登录账号，存在账号风控风险，建议使用独立账号或事后改密。

`--gps` 参数可顺带下载 AGPS 辅助定位文件（`AGPS_ALM`、`AGPSZIP`、`LLE`、`AGPS`、`EPO`、`LTO`），小米账号暂不支持该功能。脚本依赖 Python 3.10+、`requests`、`loguru`、`pycryptodome`，以 MIT 许可发布。

## Gadgetbridge 的配对路径

Gadgetbridge 文档给出四条取 key 的途径，按难度排序：

| 途径 | 适用 | 说明 |
| --- | --- | --- |
| 电脑上运行 huami-token | 通用 | 最简单，需要账号密码 |
| Root 手机读取官方 App 数据库 | 已 root | 从 App 私有目录直接读已保存的 key |
| 非 root 手机 + huami-token | 通用 | 与电脑方案相同，在 Termux 等环境执行 |
| Xiaomi Cloud Tokens Extractor | 小米账号 | 从云端令牌导出，适合无法直接登录的场景 |

拿到 key 后在 Gadgetbridge 中添加设备、选择对应型号并填入 key 即可。VelaOS 手环在 Gadgetbridge 中的支持程度随版本变化，功能完整度需以对应版本的支持列表为准。

## 协议层现状

公开资料能确认的部分：

- 链路是标准 BLE GATT，官方 App 通过它下发通知、同步健康数据、传输表盘与固件、代理网络（见[网络通路](/refs/network)）；
- 手环侧 `app_net.c` 通过 BLE 承载 TUN 流量，说明存在一条可传输任意 IP 包的通道；
- VelaOS 的 `miwear` 服务负责应用层消息分发，`interconnect` 负责跨设备互联，两者共用同一条 BLE 链路。

尚缺系统整理的部分：

| 项 | 状态 |
| --- | --- |
| GATT 服务与特征的 UUID 清单 | 待定，公开资料未系统整理；Gadgetbridge 源码是事实标准 |
| 各特征的操作权限与加密要求 | 待定，与 key 绑定 |
| 消息帧格式（包头、长度、校验、分片） | 待定，散见于逆向项目 |
| 固件与表盘传输的握手流程 | 待定 |

这一页只记录已能追溯来源的结论。需要抓包或读 Gadgetbridge 源码才能补齐的字段，保持「待定」，不凭印象填写。

## 安全研究背景

学术与安全会议层面对小米穿戴生态的完整分析可参考 BreakMi（Hardwear.io USA 2023），该工作逆向分析了小米与 Fitbit 的健身追踪生态，涉及配对、认证与数据同步链路。它是理解「为什么 key 由服务端托管」的背景材料，不提供可直接复用的攻击代码。

## 风险与边界

- 取 key 需要向第三方脚本提供账号密码，脚本本身可信度需自行评估；
- 绕过官方 App 配对可能触发账号风控或设备锁；
- 本站不提供 key、不提供账号，也不提供自动化配对工具；
- 修改 BLE 层行为可能影响保修与设备安全，操作前先读[固件研究](/system/firmware/)的风险提示。

## 相关页面

- 手环与手机之间的网络代理：[网络通路](/refs/network)
- 可参考的开源实现：[示例代码](/refs/examples)
- 外部资料索引：[参考资料](/refs/references)
