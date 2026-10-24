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

「米环开发手册」是一个面向开发者的中文资料站，内容覆盖小米手环与小米手表的快应用、表盘、固件研究与原生应用四层，另有 BLE 协议与工具索引两个横向板块。

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
