---
layout: home

hero:
  name: 米环开发手册
  text: 小米手环 / 手表开发者资料库
  tagline: 快应用 · 表盘 · 固件研究 · 原生应用。只收录国行设备，内容标注来源与核对日期。
  image:
    src: /logo.svg
    alt: 米环开发手册
  actions:
    - theme: brand
      text: 机型能力矩阵
      link: /start/models
    - theme: alt
      text: 快应用环境搭建
      link: /quickapp/setup

features:
  - title: 机型 × 能力矩阵
    details: 十项字段列出每款手环支持快应用、表盘、原生模块与刷固件的情况，未知项标注为 unknown。
  - title: 标注来源与核对日期
    details: 每页 frontmatter 记录适用机型、固件版本、可信度等级和最后核对来源的日期。
  - title: 索引优先
    details: 快应用入门已有官方文档，本站收录机型差异、工具索引与社区记录到的失败案例。
---

## 机型能力矩阵

<ModelMatrix />

数据来源与字段说明见[机型能力矩阵](/start/models)。本站未做真机实测，矩阵中每一项均为 `sourced` 或 `unverified`。

## 板块划分

按用途划分六层，越往下越靠近硬件，风险越高。

| 板块 | 内容 | 入口 |
| --- | --- | --- |
| 开始 | 机型支持情况、术语 | [从这里开始](/start/) · [机型矩阵](/start/models) · [术语表](/start/glossary) |
| 快应用 | 用 JS 编写应用并打包为 `.rpk` | [导读](/quickapp/) · [环境搭建](/quickapp/setup) · [常见问题](/quickapp/pitfalls) |
| 表盘 | Lua 脚本与资源包 | [导读](/watchface/) |
| 固件 | 备份、读分区、解包、刷写 | [导读](/firmware/) |
| 原生 | 在 NuttX 上加载 C 模块 | [导读](/native/) |
| 协议 | 手环与手机之间的 BLE 通信 | [导读](/protocol/) |

横向板块：[工具索引](/tools/)、[示例代码](/examples/)。

## 声明

本站为社区资料汇编，非官方项目，与小米公司无关联。不提供官方固件或资源包下载，不提供一键刷机工具。文档按 CC BY-SA 4.0 授权，代码按 MIT 授权。详见[关于本站](/community/about)。
