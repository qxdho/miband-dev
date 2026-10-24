# 小米手环开发者文档站 · 建设方案

> 目标：在 GitHub Pages 上做一个**中文为主**的小米手环 / 小米手表开发者文档站，覆盖快应用、表盘、固件研究、原生应用、协议与工具链。
> 本文档是施工图，含信息架构、页面清单、工程化方案、12 周路线图和风险清单。

---

## 0. 一句话结论

不要做「教程合集」，要做**「机型能力矩阵 + 可复现的工程模板 + 一手实测记录」**。
教程网上已经有人写（Habr、B站、openvela 官方），真正稀缺的是：**哪个机型、哪个固件版本、到底能不能做、怎么做成的**。

---

## 1. 定位与差异化

### 现状（2026-10）

| 内容源 | 覆盖 | 缺口 |
|---|---|---|
| [openvela 官方文档](https://github.com/open-vela/docs) | 快应用通用开发、模拟器、VelaJS MCP、`@service.health` | 只讲通用 Vela，不讲具体手环机型差异；不讲固件/原生 |
| [atc1441 / MiBand10-BES2700iMP-BEST1503-Hacking](https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking) | Band 9/10 固件研究、自定义固件、Doom 移植 | 英文、分散在 README 和视频里、无体系 |
| [Habr: 在 Mi Band 10 Pro 上写原生应用](https://habr.com/en/articles/1079066/) | NuttX 可加载模块、`miwear_app_t`、应用管理器 | 俄文、单篇、无代码仓 |
| B站 / 酷安 / QQ 群 | 快应用速通、踩坑 | 不可检索、不可引用、会失效 |
| 零散 GitHub 仓（JSLab、Mi8WfBinTool 等） | 单点工具 | 没有索引 |

### 1.1 已经有人在做了（重要）

| 谁 | 形态 | 覆盖 | 缺口 |
|---|---|---|---|
| **[米坛知识库 wiki.bandbbs.cn](https://wiki.bandbbs.cn/)** | VitePress 文档站，米坛社区官方维护，10+ 贡献者，最近 1 天前还在更新 | 快速开始、工具安装（表盘自定义工具/AstroBox/OronBox/BandBurg）、付费资源激活、第三方应用使用（弦电子书/Azki Music/腕上漫画）、降级平刷 | **纯用户向**。开发向只有「怎么发布付费资源」。没有 SDK、没有代码、没有固件、没有原生 |
| [米坛社区 bandbbs.cn](https://www.bandbbs.cn/) | 论坛（XenForo） | 手环分版 14.6K 主题 / 110 万回复 | 硬核内容全沉在帖子里，不可检索、会失效。例如「手环 10 Pro SPI NAND 镜像读取与文件系统还原」「手环 11 NFC / 10 Pro QEMU 模拟器」 |
| [iot.mi.com/vela/quickapp](https://iot.mi.com/vela/quickapp/) | 官方 API 参考 | 接口、组件、工具（AIoT IDE） | 参考手册不是教程；不覆盖机型差异、不覆盖固件/原生 |
| [open-vela/docs](https://github.com/open-vela/docs) | 官方开源文档 | 快应用通用开发、模拟器、VelaJS MCP、health、velaclaw | 讲通用 Vela，不讲小米手环具体机型；2026 大赛导向 |
| [路明笔记：从零开始写 Vela 快应用](https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/) | 单篇长文（2025-08） | AIoT IDE 装到打包 rpk 全流程，含分辨率/圆角表 | 一篇就完了，无后续、无固件、无原生 |
| [atc1441](https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking) / [Habr](https://habr.com/en/articles/1079066/) | 英文/俄文 | 固件研究、NuttX 原生模块 | 无中文体系、无索引 |

**结论：有，但没有一个「开发者向 + 跨层 + 带机型矩阵 + 可复现模板」的站。**
米坛是「怎么用别人做的东西」，官方是「API 字典」，个人博客是「一篇就完了」。你要做的是「怎么自己做东西」，且把四层串起来。

三点现实影响：

1. **快应用入门这块已经有免费的好内容**（官方 + 路明笔记 + openvela）。纯做入门会重复劳动，价值在「更新、更全、可检索、带机型差异」。
2. **真正的空档是索引**。米坛论坛里那些 SPI NAND 读取、QEMU 模拟器的帖子没有入口，做「导读 + 索引 + 复现」比再写一遍教程有用十倍。
3. **米坛是潜在合作方，不是纯竞品**。它有流量和作者群，你走「开发者向深度」，互补大于冲突；冷启动阶段去米坛发帖是最快的获客路径。

> 顺带验证了一件事：米坛知识库也是 VitePress 建的——技术选型没错。

### 本站的三个不可替代点

1. **机型 × 能力矩阵**——首页就是一张表：Band 8/9/10、9 Pro/10 Pro、Redmi Watch 4/5，逐格标注「快应用 / 表盘 / 原生模块 / 刷固件 / 已实测」。公开资料里**没有**这样一张覆盖四层能力的表（米坛知识库的「产品百科」入口当前 404，未能核实其内容），做出来就是事实上的唯一入口。
   > 范围约定：**只做国行**。国际版（global）不在范围内，遇到时一句话带过即可。
2. **每条内容带可信度标签**——`亲测` / `据来源` / `未验证`，加 `适用固件版本` + `最后验证日期`。手环文档最大的问题是腐烂，这个机制是护城河。
3. **可跑的模板仓**——不是贴代码片段，而是 `examples/quickapp-hello`、`examples/watchface-min`、`examples/native-module-hello` 三个能直接 `pnpm build` / `make` 的仓库，文档只解释「为什么这样改」。

### 不做什么（防止摊大饼）

- 不做在线刷机工具、不做固件下载站（版权 + 法律风险）
- 不做手机 App 端（Mi Fitness 替代品）开发教程
- 不做 Zepp OS / 华为手表的横向对比长文（最多一节指路）

---

## 2. 技术选型

**推荐：VitePress + GitHub Pages + 本地全文搜索**

| 候选 | 结论 | 理由 |
|---|---|---|
| **VitePress** ✅ | 采用 | Markdown 原生、构建快（几百页秒级）、内置本地搜索（minisearch，无需 Algolia）、Vue 组件可直接写进 md——机型矩阵这种交互表用它最省事 |
| Astro Starlight | 备选 | i18n 与 content collections 更规范，但交互组件要写 Astro 岛，学习成本高一点 |
| Docusaurus | 不推荐 | 重，React 生态对这个项目没额外收益 |
| MkDocs Material | 不推荐 | Python 工具链，做自定义组件（矩阵/版本提示条）很别扭 |

配套：

- **部署**：GitHub Actions → Pages，`main` 推送即发布；PR 走 preview（可用 `actions/deploy-pages` + 分支预览，或简单点只做构建校验）
- **搜索**：先用 VitePress 本地搜索；页面过 150 篇再考虑 [Algolia DocSearch](https://docsearch.algolia.com/)（开源项目免费）
- **版本化**：VitePress 无内建版本化 → 用 `docs/v10/`、`docs/v9/` 目录 + 顶部「当前文档对应固件 x.y.z」提示条，别硬上多版本插件
- **域名**：先 `username.github.io/miband-docs`，稳定后再绑自定义域名（`miband.dev` 类）
- **双语**：一期只做中文，英文只留 `/en/` 占位。理由：这个领域的中文一手资料反而更多（B站/酷安），英文读者已被 atc1441 覆盖

---

## 3. 信息架构（含页面清单）

```
/                          首页：机型矩阵 + 三条入口（我会写应用 / 我要研究固件 / 我要做表盘）
/start/                    新手全景
  ├─ models               机型矩阵（核心页，数据驱动）
  ├─ capability           能力对照：快应用/表盘/原生/刷机 逐机型
  ├─ glossary             术语表（Vela / NuttX / AiotJS / miwear / LVGL …）
  └─ faq                  新手 20 问
/quickapp/                 快应用开发（受众最大，主线）
  ├─ setup                环境：Aiot-IDE / openvela 模拟器 / VelaJS MCP
  ├─ project              工程结构与 manifest 逐字段
  ├─ ui                   类 Vue 语法、组件、布局、屏幕适配
  ├─ api/system           @system.* 能力清单与实测可用性
  ├─ api/health           @service.health 心率/血氧/压力
  ├─ api/ai               @system.velaclaw 端侧 AI
  ├─ build                打包、签名、体积限制
  ├─ deploy               装到真机（含国行/国际版差异）
  └─ pitfalls             十大坑（含"国际版没有应用引擎"）
/watchface/                表盘
  ├─ format               bin 结构、资源规范、分辨率清单
  ├─ lua                  用 Lua 写表盘
  ├─ build                打包/解包（Mi8WfBinTool 等）
  └─ porting              移植与适配
/firmware/                 固件研究（风险最高，独立免责声明）
  ├─ hardware             SoC/内存/Flash：BES2700iMP、Cortex-M33、NuttX、LVGL9
  ├─ partitions           分区布局与地址
  ├─ dump                 备份与校验（先备份再动手）
  ├─ unpack               解包/重打包
  ├─ flash                刷写与救砖
  ├─ debug                UART / 日志 / 调试器
  └─ custom              自定义固件案例（Doom 移植拆解）
/native/                   原生应用（最前沿）
  ├─ overview             为什么能跑：NuttX 可加载模块机制
  ├─ toolchain            arm-none-eabi、链接脚本、避免 __aeabi_* 依赖
  ├─ module-hello         第一个 insmod 模块（完整代码）
  ├─ miwear-app           miwear_app_t / miwear_page_t 逐字段
  ├─ packagemanager       install/recover/uninstall/hidden 接口
  ├─ lvgl                 LVGL9 绘制与事件
  └─ deploy               用 Lua 表盘 os.execute 部署的技巧
/protocol/                 BLE 与数据
  ├─ auth                 auth key 提取
  ├─ sync                 步数/心率/睡眠同步包解析
  └─ tools                抓包与调试方法
/tools/                    工具索引（表格式，标"维护状态"）
/examples/                 三个模板仓的说明与链接
/community/                如何投稿、致谢、更新日志
```

**首页矩阵的实现**：机型数据放 `docs/.vitepress/data/models.json`，用一个 Vue 组件渲染，每格是 `✅亲测 / 🟡据来源 / ❌不可用 / ❓待验证`。改 JSON 即改全站。

---

## 4. 内容生产流水线（决定这个站会不会是空壳）

按「性价比」排序，每周产出 2–4 篇：

1. **先复现，再写**（最高价值）：自己跑通一遍，截图 + 日志 + 报错原文。这是唯一别人抄不走的。
2. **结构化导读 + 翻译**：Habr 那篇原生应用长文，联系作者拿授权后做中文精译 + 代码仓（CC 协议需看清）；atc1441 的仓库做「导读 + 索引」，**不做全文搬运**。
3. **官方文档二次组织**：openvela docs 只做「指路 + 机型差异补丁」，链接回原文，避免许可纠纷。
4. **视频转图文**：B站「速通小米手环快应用」这类，先联系 UP 主，转成可检索文本。
5. **社区投稿**：给模板 + 必填字段，降低投稿门槛。

**每条内容的 frontmatter（CI 强校验）：**

```yaml
---
title: 第一个快应用
models: [band10, band10pro]        # 适用机型
firmware: ">=3.2.0"                # 适用固件
verified: 2026-10-20               # 最后实测日期
status: tested                     # tested | sourced | unverified
source: "https://github.com/open-vela/docs"
contributors: [yourname]
---
```

渲染成页面顶部的彩色徽章条。**没有 `verified` 和 `models` 的 PR 直接 CI 挂掉**——这是防腐机制。

---

## 5. 仓库结构与工程化

```
miband-docs/
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.ts            # 侧边栏、导航、i18n、搜索
│  │  ├─ data/models.json     # 机型矩阵数据源
│  │  ├─ components/          # ModelMatrix.vue / StatusBadge.vue / FirmwareNote.vue
│  │  └─ theme/
│  ├─ public/
│  └─ **/*.md
├─ examples/                  # 或拆成独立仓，用 submodule / 链接
│  ├─ quickapp-hello/
│  ├─ watchface-min/
│  └─ native-module-hello/
├─ scripts/
│  └─ check-frontmatter.ts    # zod 校验
├─ .github/
│  ├─ workflows/{build,deploy,link-check}.yml
│  ├─ ISSUE_TEMPLATE/{model-info,doc-fix,request}.md
│  └─ PULL_REQUEST_TEMPLATE.md
├─ CONTRIBUTING.md
├─ LICENSE                    # 文档 CC BY-SA 4.0
└─ LICENSE-CODE               # 代码 MIT
```

CI 三件事：

1. `pnpm docs:build` —— 构建必须过
2. `check-frontmatter` —— 字段齐全、`verified` 不超 12 个月（过期给 warning，不挂）
3. `lychee` 链接检查 —— 外链失效是文档站头号死因，每周定时跑

---

## 6. 路线图（单人，每周 8–10h）

| 阶段 | 周次 | 目标 | 交付物 / 验收 |
|---|---|---|---|
| **P0 骨架** | W0（3–5 天） | 站能上线 | VitePress 跑通、Pages 自动部署、首页矩阵雏形（先填 3 个机型、大部分 ❓）、`/start/glossary`、`/community` |
| **P1 快应用主线** | W1–W2 | 打通最高频需求 | `quickapp/` 全 10 页 + `examples/quickapp-hello` 可跑；至少 1 篇 `status: tested` |
| **P2 表盘 + 工具索引** | W3–W4 | 覆盖第二大人群 | `watchface/` 4 页 + `/tools` 索引 30 条（带维护状态） |
| **P3 固件研究** | W5–W7 | 建立硬核口碑 | `firmware/` 7 页；**必须先把「备份与救砖」写完再写刷写**；免责声明上线 |
| **P4 原生应用** | W8–W10 | 差异化王牌 | `native/` 7 页 + `examples/native-module-hello`；复现 Habr 的 hello module 并给中文注解 |
| **P5 协议 + 首发** | W11–W12 | 收口 + 推广 | `protocol/` 3 页；发酷安/B站/Reddit r/miband/XDA；开放投稿 |

### MVP 定义（什么时候可以对外发）

**12 篇**，且满足：

- 首页矩阵 ≥ 4 个机型、≥ 60% 格子有结论
- `quickapp/setup` + `quickapp/deploy` + `quickapp/pitfalls` 三篇 `tested`
- 三个示例仓里至少一个能 clone 后 5 分钟内跑起来
- 全站无死链、有免责声明

按每周 2 篇算，MVP ≈ **5–6 周**。全职做 2–3 周。

---

## 7. 风险与合规（别跳过）

| 风险 | 处理 |
|---|---|
| **变砖** | 所有固件页顶部红色警告；`firmware/dump` 与「备份」先于「刷写」；明确「不提供一键工具，后果自负」 |
| **固件版权** | 不分发官方固件/资源包，只给版本号、校验和、获取途径 |
| **法律** | 逆向研究在多数司法辖区属灰色但一般可讨论；不做绕过付费/DRM 的功能；站名与 logo 不使用小米商标，注明「非官方，与小米无关联」 |
| **国行/国际版混淆** | 范围只做国行；国际版一句话说明即可，不展开 |
| **保修** | 单独一节说明解锁/刷机会影响保修 |
| **内容腐烂** | `verified` 日期 + 每季度 review；外链交给 lychee |
| **单人维护崩盘** | 从第一天就写 `CONTRIBUTING.md` + issue 模板；把矩阵做成「谁都能改 JSON」 |

许可证：文档 **CC BY-SA 4.0**，代码 **MIT**。转载 Habr / B站内容**必须**先拿授权，页脚留来源。

---

## 8. 冷启动

- 首发三处：**酷安**（手环圈主战场）、**B站**（做个「从零写第一个手环快应用」视频，导流到站）、**Reddit r/miband + XDA**（英文一句简介 + 链接）
- 蹭官方热度：openvela 2026 AI 硬件开发者大赛正在跑，把「手环快应用上手指南」写成参赛友好版，容易被官方仓库/群转发
- 给 atc1441 提 PR 补一条「中文文档」链接——他的仓库 star 高，是最精准的流量入口

---

## 9. 第一周 checklist

- [ ] 定名 + 建仓（`miband-docs`），License 两份
- [ ] `pnpm create vitepress` 起站，配好 `base` 和 Pages workflow
- [ ] 写 `models.json`（先 3 个机型，诚实填 ❓）
- [ ] 写 `ModelMatrix.vue` + `StatusBadge.vue`
- [ ] 写 frontmatter 校验脚本并接进 CI
- [ ] 落地 4 篇：`/start/models`、`/start/glossary`、`/quickapp/setup`、`/quickapp/pitfalls`
- [ ] 免责声明 + `CONTRIBUTING.md`
- [ ] 拿一台真机，把 `quickapp/setup` 亲手跑一遍，截图存档

---

## 附录：核心参考资料

- openvela 官方文档（快应用 / 模拟器 / VelaJS MCP / health / velaclaw）：<https://github.com/open-vela/docs>
- 快应用教程导航（2026 AI 硬件大赛版）：<https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_guide_index.md>
- Mi Band 9/10 固件与 SoC 研究：<https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking>
- 在 Mi Band 10 Pro 上写原生应用（NuttX 模块、`miwear_app_t`）：<https://habr.com/en/articles/1079066/>
- 表盘 bin 解包/打包工具：<https://github.com/zhy8388608/Mi8WfBinTool>
- 手环上跑 JS 的快应用示例：<https://github.com/cciccicu/JSLab>
- GitHub `miband` topic：<https://github.com/topics/miband>
