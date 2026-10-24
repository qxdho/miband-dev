---
title: BLE 协议
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: unverified
source: "https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/"
contributors: [miband-dev]
---

# BLE 协议

<StatusBadge status="unverified" verified="2026-10-24" />

手环与手机之间通过 BLE 通信，流程为配对认证在前、数据同步在后。本章属于横向内容，快应用、表盘、固件与原生各层都会涉及。

## 本章范围

- 第三方程序连接手环：GATT 服务、特征值、MTU；
- 认证：小米的加密握手流程与凭证来源；
- 同步：通知、健康数据、运动记录、表盘与应用安装包。

## 本章页面

| 页面 | 内容 | 状态 |
| --- | --- | --- |
| GATT 结构 | 服务与特征值的划分、读写与通知的关系 | 规划中 |
| 认证与加密 | 握手流程、密钥来源、常见失败原因 | 规划中 |
| 数据同步 | 通知、健康、运动数据的帧格式与分片 | 规划中 |
| 调试工具 | 抓包、模拟外设、协议复现的常用手段 | 规划中 |

## 相邻板块

- 编写替代手机 App：属于本章范围，但本站不涉及 Mi Fitness 替代品的开发教程；
- 通过手机安装快应用：[快应用](/quickapp/)，协议只是手段；
- 读取手环本地存储：[固件](/firmware/)层。

## 版本依赖

协议由逆向得出，且随固件版本变化。每个页面必须写明适用的固件版本区间；无法对应时标为 `unverified`。
