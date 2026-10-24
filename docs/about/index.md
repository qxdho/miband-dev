---
title: 关于本站
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-25
status: sourced
source: "https://github.com/"
contributors: [miband-dev]
---

# 关于本站

<StatusBadge status="sourced" verified="2026-10-25" />

「米环开发手册」是一个面向开发者的中文资料站，按用途分为五个板块：入门、应用与表盘、固件与原生、协议工具与参考、关于与研究。

## 板块入口

| 板块 | 内容 | 入口 |
| --- | --- | --- |
| 开始 | 机型支持情况、术语 | [从这里开始](/start/) |
| 应用与表盘 | 快应用与表盘 | [应用与表盘](/apps/) |
| 固件与原生 | 固件解包、刷写与 C 模块 | [固件与原生](/system/) |
| 协议、工具与参考 | BLE 通信、逆向工具、外部资料、示例 | [协议、工具与参考](/refs/) |
| 关于与研究 | 站点说明、研究记录与误判 | 本页 |

## 研究记录

研究过程、被推翻的结论与封存的地址视图集中在本板块，正文只保留当前成立的结论：

- [研究历程与误判](/about/history)
- [控制中心与地址视图](/about/control-center)
- [Chaos 代码审查](/about/code-review)

原始笔记与地址表存放在仓库的 `research/` 目录，每页 frontmatter 的 `source` 指向对应笔记。

## 定位

本站为资料汇编与索引，不进行真机实测：

- 内容来自官方文档、公开长文与社区帖子；
- 每页标注 `status`（`tested` / `sourced` / `unverified`）与 `verified`（最后核对日期）；
- 矩阵中无法确认的项填 `unknown`；
- 转载或翻译须取得授权，并在页面注明来源。

`verified` 表示最后核对来源的日期，不代表在真机上验证过。判断内容可信度以 `status` 为准。

## 不包含的内容

- 官方固件与资源包的下载，只记录版本号、校验和与获取途径；
- 一键刷机工具，以及绕过付费或 DRM 的方法；
- 手机 App（Mi Fitness 替代品）的开发教程；
- 与其他穿戴平台的横向对比；
- 国际版设备，只收录国行。

## 免责声明

本站为社区项目，非官方，与小米公司无关联，不使用小米商标作为站名或标志。

固件研究与刷机操作存在变砖、数据丢失与保修失效的风险，后果自负。本站只提供资料索引，不提供一键工具，不对结果负责。

## 许可证

- 文档：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- 代码：[MIT](https://opensource.org/licenses/MIT)

## 贡献

具体流程见仓库根目录的 `CONTRIBUTING.md`。基本要求：

1. 页面具备完整 frontmatter（`title` / `models` / `status` / `verified` / `contributors`，`status` 非 `tested` 时补充 `source`）；
2. 不搬运未授权内容；
3. 矩阵数据修改 `docs/.vitepress/data/models.json`，不直接修改渲染结果；
4. 无法确认的内容标为 `unknown` 或 `unverified`。

## 更新日志

- **2026-10-24**：站点上线；机型矩阵（band9 / band10 / band10pro）；术语表；快应用环境搭建与常见问题。
- **2026-10-25**：合并为五大板块；隐私信息脱敏（昵称、域名、IP、本地路径）；删除重复目录与原始对话记录。
- **2026-10-25**：补充外部资料页：BLE 协议与配对鉴权、QEMU 模拟器、启动链与救砖；更新参考资料与示例工程索引；补全 10 Pro 屏幕与 SPI NAND 型号。
