---
layout: home

hero:
  name: 米环开发文档
  text: 小米手环 / 手表 Vela 开发文档
  tagline: 探索 Vela 的每一分潜力。表盘、快应用、原生应用与平台资料，只收录国行设备，内容标注来源与核对日期。
  image:
    src: /logo.svg
    alt: 米环开发文档
  actions:
    - theme: brand
      text: 三条路怎么选
      link: /start/choose-path
    - theme: alt
      text: 机型能力矩阵
      link: /start/models

features:
  - title: 表盘
    details: 普通表盘与 Lua 表盘两条路线：介绍、能力、打包方式与安装。
  - title: 快应用
    details: 用 JS 编写 .rpk：工程结构、能力边界、运行时与打包。
  - title: 原生应用
    details: 在 NuttX 上加载 ET_REL 模块：支持设备、加载方式与能力。
---

## 机型能力矩阵

<ModelMatrix />

数据来源与字段说明见[机型能力矩阵](/start/models)。无法确认的项目以 `unknown` 表示。

## 板块划分

站点按应用形态划分为三个主要板块，平台资料单独设为一层。

| 板块 | 内容 | 入口 |
| --- | --- | --- |
| 开始 | 三条路的分工、机型支持情况、术语 | [从这里开始](/start/) · [三条路怎么选](/start/choose-path) · [机型矩阵](/start/models) · [术语表](/start/glossary) |
| 表盘 | 普通表盘与 Lua 表盘：介绍、能力、打包、安装 | [表盘总览](/watchface/) · [普通表盘](/watchface/normal/) · [Lua 表盘](/watchface/lua/) · [表盘包格式](/watchface/format) |
| 快应用 | 用 JS 编写 `.rpk` 并安装到设备 | [快应用](/quickapp/) · [环境搭建](/quickapp/setup) · [能力](/quickapp/capabilities) · [打包方式](/quickapp/package) |
| 原生应用 | 在 NuttX 上加载自编译 C 模块，需配合 Lua 表盘安装 | [原生应用](/native/) · [支持的设备](/native/devices) · [加载方式](/native/loading) · [能力](/native/capabilities) |
| 平台与工具 | 固件、BLE 协议、逆向工具、外部资料与示例 | [平台与工具](/platform/) · [固件](/platform/firmware/) · [BLE](/platform/protocol/ble) · [工具索引](/platform/tools/) |
| 关于 | 站点说明、研究历程与误判 | [关于本站](/about/) · [研究历程与误判](/about/history) |

研究过程与被推翻的结论集中记录于[研究历程与误判](/about/history)。封存的地址视图与代码审查已迁入原生应用板块，见[控制中心与地址视图](/native/advanced/control-center)和[Chaos 代码审查](/native/frameworks/chaos-review)。

## 声明

本站为社区资料汇编，非官方项目，与小米公司无关联。不提供官方固件或资源包下载，不提供一键刷机工具。文档按 CC BY-SA 4.0 授权，代码按 MIT 授权。详见[关于本站](/about/)。
