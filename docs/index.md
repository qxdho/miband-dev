---
layout: home

hero:
  name: 米环开发手册
  text: 小米手环 / 手表开发者资料库
  tagline: 入门 · 应用与表盘 · 固件与原生 · 协议工具 · 关于研究。只收录国行设备，内容标注来源与核对日期。
  image:
    src: /logo.svg
    alt: 米环开发手册
  actions:
    - theme: brand
      text: 机型能力矩阵
      link: /start/models
    - theme: alt
      text: 快应用环境搭建
      link: /apps/quickapp/setup

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

按用途划分五个板块，越往下越靠近硬件，风险越高。

| 板块 | 内容 | 入口 |
| --- | --- | --- |
| 开始 | 机型支持情况、术语 | [从这里开始](/start/) · [机型矩阵](/start/models) · [术语表](/start/glossary) |
| 应用与表盘 | 用 JS 编写 `.rpk`，用 Lua 与资源包制作表盘 | [应用与表盘](/apps/) · [快应用](/apps/quickapp/) · [表盘](/apps/watchface/) |
| 固件与原生 | 固件解包、刷写，以及在 NuttX 上加载 C 模块 | [固件与原生](/system/) · [固件](/system/firmware/) · [原生](/system/native/) |
| 协议、工具与参考 | BLE 通信、逆向工具、外部资料、示例代码 | [协议、工具与参考](/refs/) · [网络通路](/refs/network) · [逆向与复现](/refs/reversing) · [参考资料](/refs/references) · [示例代码](/refs/examples) |
| 关于与研究 | 站点说明、研究历程、封存的地址视图与代码审查 | [关于本站](/about/) · [研究历程与误判](/about/history) |

研究过程与被推翻的结论集中记录在[研究历程与误判](/about/history)，封存的地址视图与代码审查见[控制中心与地址视图](/about/control-center)和[Chaos 代码审查](/about/code-review)。原始笔记存放在仓库的 `research/` 目录。


## 声明

本站为社区资料汇编，非官方项目，与小米公司无关联。不提供官方固件或资源包下载，不提供一键刷机工具。文档按 CC BY-SA 4.0 授权，代码按 MIT 授权。详见[关于本站](/about/)。
