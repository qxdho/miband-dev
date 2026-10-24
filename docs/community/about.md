---
title: 关于本站
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://github.com/"
contributors: [miband-dev]
---

# 关于本站

<StatusBadge status="sourced" verified="2026-10-24" />

## 这是什么

「米环开发手册」是一个**中文、面向开发者**的小米手环 / 小米手表资料站，覆盖四层：

**快应用 → 表盘 → 固件研究 → 原生应用**，外加 BLE 协议与工具索引。

## 定位：资料仓库，不做实测

本站明确定位为**资料汇编与索引**，不承诺真机实测：

- 内容主要来自官方文档、公开长文、社区帖子；
- 每页标注 `status`（`tested` / `sourced` / `unverified`）与 `verified`（最后核对日期）；
- 矩阵中拿不准的格子填 `❓`，**不猜**；
- 转载/翻译必须取得授权，页脚注明来源。

> `verified` 表示「最后核对来源的日期」，**不代表**作者在真机上验证过。判断内容可信度请以 `status` 为准。

## 不做什么

- 不分发官方固件 / 资源包，只给版本号、校验和、获取途径；
- 不做一键刷机工具，不提供绕过付费/DRM 的方法；
- 不做手机 App（Mi Fitness 替代品）开发教程；
- 不做 Zepp OS / 华为手表的横向对比长文；
- **只做国行**，国际版一句话带过。

## 免责声明

本站是社区项目，**非官方，与小米公司无关联**，不使用小米商标作为站名或 logo。

固件研究、刷机、解锁等操作有**变砖、丢数据、失去保修**的风险，后果自负。本站只提供资料索引，不提供任何形式的「一键工具」或结果担保。

## 许可证

- 文档：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- 代码：[MIT](https://opensource.org/licenses/MIT)

## 如何贡献

见仓库根目录的 `CONTRIBUTING.md`。最小要求：

1. 每个页面必须有完整 frontmatter（`title` / `models` / `status` / `verified` / `contributors`，`status != tested` 时补 `source`）；
2. 不搬运未授权内容；
3. 矩阵数据改 `docs/.vitepress/data/models.json`，不要手改渲染结果；
4. 拿不准就标 `unknown` / `unverified`，诚实比完整重要。

## 更新日志

- **2026-10-24**：站点骨架上线；机型矩阵（band9 / band10 / band10pro）；术语表；快应用环境搭建与十大坑。
