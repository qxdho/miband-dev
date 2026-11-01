---
title: 关于本站
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev"
contributors: [miband-dev]
---

# 关于本站

<StatusBadge status="sourced" verified="2026-11-01" />

「米环开发文档」是一个面向开发者的中文资料站。站点按应用形态分为表盘、快应用、原生应用三大板块，平台资料单独成层，共六块：

## 板块入口

| 板块 | 内容 | 入口 |
| --- | --- | --- |
| 开始 | 三条路的分工、机型支持情况、术语 | [从这里开始](/start/) |
| 表盘 | 普通表盘与 Lua 表盘：介绍、能力、打包、安装 | [表盘总览](/watchface/) |
| 快应用 | 工程结构、能力边界、运行时、打包 | [快应用](/quickapp/) |
| 原生应用 | 支持设备、加载方式、能力、模块开发 | [原生应用](/native/) |
| 平台与工具 | 固件、BLE 协议、工具与参考资料 | [平台与工具](/platform/) |
| 关于 | 站点说明、研究历程与误判 | 本页 |

## 研究记录

研究过程与被推翻的结论集中在[研究历程与误判](/about/history)。原先放在「关于」下的两篇长文已迁入原生应用板块：

- [控制中心与地址视图](/native/advanced/control-center)
- [Chaos 代码审查](/native/frameworks/chaos-review)

原始笔记与地址表存放在仓库的 `research/` 目录，每页 frontmatter 的 `source` 指向对应笔记。

## 定位

本站为资料汇编与索引，不进行大规模真机实测：

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
- **2026-10-26**：新增《设备文件系统》，基于 10 Pro 实机目录清单，修正 `/system`、`/ota` 与离线日志份数等与实机不符的描述。
- **2026-10-26**：新增《原生开发模式》，归纳三种渲染路径、控件树生命周期与固件接口绑定要点。
- **2026-11-01**：重构为「表盘 / 快应用 / 原生应用 + 平台与工具」结构；更名「米环开发文档」；补入普通表盘、Lua 表盘能力与原生加载方式入口。
