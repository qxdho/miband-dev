---
layout: home

hero:
  name: 米环开发手册
  text: 小米手环 / 手表开发者资料库
  tagline: 快应用 · 表盘 · 固件研究 · 原生应用 —— 只做国行，只做可检索、可追溯的资料
  image:
    src: /logo.svg
    alt: 米环开发手册
  actions:
    - theme: brand
      text: 看机型矩阵
      link: /start/models
    - theme: alt
      text: 快应用上手
      link: /quickapp/setup

features:
  - title: 机型 × 能力矩阵
    details: 一屏看清哪款手环能做快应用、表盘、原生模块、刷固件。每格标注可信度，不知道就写「待验证」。
  - title: 可追溯，不腐烂
    details: 每页都带适用机型、固件版本、验证状态和最后核对日期。过期内容一眼可见。
  - title: 只补没人写的部分
    details: 快应用入门已有官方文档和优质长文，这里做机型差异、索引和踩坑记录，不重复造轮子。
---

## 机型能力矩阵

<ModelMatrix />

> 本页所有格子均为「据来源」或「待验证」，**没有亲测**。本站是资料仓库，不代替你自己的真机验证。字段与来源见 [机型矩阵说明](/start/models)。

## 按「你想做什么」找

本站不按文件类型、也不按机型分类，而是按**你要做的事**分成六层，越往下越接近硬件、风险越大：

| 板块 | 一句话 | 入口 |
| --- | --- | --- |
| **开始** | 哪台机器支持什么、名词什么意思 | [从这里开始](/start/) · [机型矩阵](/start/models) · [术语表](/start/glossary) |
| **快应用** | 用 JS 写个能装上去的应用 | [导读](/quickapp/) · [环境搭建](/quickapp/setup) · [十大坑](/quickapp/pitfalls) |
| **表盘** | Lua + 资源包，换一套界面 | [导读](/watchface/) |
| **固件** | 备份、读分区、解包、刷写 | [导读](/firmware/) |
| **原生** | NuttX 上加载自己编译的 C 模块 | [导读](/native/) |
| **协议** | 手环与手机之间的 BLE 通信 | [导读](/protocol/) |

横向的两个：[工具索引](/tools/) 与 [示例代码](/examples/)。

## 声明

本站是社区资料汇编，**非官方，与小米公司无关联**。不提供官方固件或资源包下载，不提供一键刷机工具。按 CC BY-SA 4.0 授权，代码部分为 MIT。详见 [关于本站](/community/about)。
