# 小米手环开发者文档站 · 项目交接文档

> **给接手的 AI：先读完本文再动手。**
> 本文是唯一权威的交接说明。`miband-docs-plan.md` 是早期方案稿，其中「定位」「竞品」「国际版」三处已被本文修正，**冲突时以本文为准**。
> 你不需要重新做方案。用户已经拍板了技术栈、仓库名和范围，直接进入执行。

- 文档版本：v1.0
- 交接时间：2026-10-24
- 项目状态：**只有文档，零行代码**。仓库尚未创建。

---

## 1. 项目是什么

做一个**中文的、面向开发者的**小米手环 / 小米手表文档站，托管在 GitHub Pages。

覆盖四层，从浅到深：**快应用 → 表盘 → 固件研究 → 原生应用**，外加 BLE 协议与工具索引。

用户原话：「我想给小米手环搞一个文档大全站，托管到 github 上，包括快应用开发、固件研究，甚至现在最前沿的原生应用开发，以及各种方便开发研究的文档。」

**"最前沿的原生应用开发"指什么**：通过 NuttX 的可加载内核模块（`insmod` 加载 ET_REL ELF）在手表上跑自己编译的 C 代码，绕开快应用那套 JS 运行时。这是 2026 年才被社区走通的路子，中文资料几乎为零 —— **这是本站最核心的差异化内容**。

---

## 2. 已定决策（不要重新讨论）

| 项 | 决定 | 理由 |
|---|---|---|
| 仓库名 | **`miband-dev`** | 短、可口述、`miband dev` 是真实搜索词、带 `dev` 表明面向开发者 |
| 站点中文名 | **米环开发手册** | 「米环」是手环圈自称，一眼知道受众 |
| URL | `https://<username>.github.io/miband-dev/` | — |
| 技术栈 | **VitePress + pnpm + GitHub Actions → Pages** | 内置本地搜索、构建快、可在 md 里直接写 Vue 组件（机型矩阵要用）。米坛知识库也用 VitePress，选型已被验证 |
| 搜索 | 先用 VitePress 内置 minisearch，150 篇后再考虑 Algolia DocSearch | 别一开始就上外部服务 |
| 语言 | **只做中文**，`/en/` 留空占位 | 英文市场已被 atc1441 覆盖 |
| 范围 | **只做国行**。国际版（global）一句话带过，不展开 | 用户明确表示「国际版我不管」 |
| 许可证 | 文档 CC BY-SA 4.0，代码 MIT | — |
| 版本化 | 不做多版本插件，用 `docs/v10/` 目录 + 顶部固件版本提示条 | VitePress 无内建版本化，硬上插件是坑 |

**没定的**：自定义域名（先用 github.io）、是否拆 `examples/` 为独立仓（建议先同仓）。

---

## 3. 竞品格局（这决定了内容策略，必读）

研究结论：**同类站点存在，但都在别的赛道上。**

| 谁 | 覆盖 | 缺口 |
|---|---|---|
| **[米坛知识库 wiki.bandbbs.cn](https://wiki.bandbbs.cn/)** | VitePress，社区官方维护，10+ 贡献者，活跃更新。工具安装（表盘自定义工具/AstroBox/OronBox/BandBurg）、付费资源激活、第三方应用使用、降级平刷 | **纯用户向，全站零代码**。开发向只有「怎么发布付费资源」 |
| [米坛社区 bandbbs.cn](https://www.bandbbs.cn/) | 论坛，手环分版 14.6K 主题 / 110 万回复 | 硬核内容全沉在帖子里，不可检索、会失效。例如 [SPI NAND 镜像读取与文件系统还原](https://www.bandbbs.cn/threads/29808/)、[手环 11 NFC / 10 Pro QEMU 模拟器](https://www.bandbbs.cn/threads/29834/) |
| [iot.mi.com/vela/quickapp](https://iot.mi.com/vela/quickapp/) | 官方 API 参考、AIoT IDE | 参考手册，不是教程 |
| [open-vela/docs](https://github.com/open-vela/docs) | 通用 Vela、模拟器、VelaJS MCP、health、velaclaw | 不讲小米手环具体机型 |
| [路明笔记](https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/) | 单篇长文，AIoT IDE → rpk 全流程 | 一篇就完了 |
| [atc1441](https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking) / [Habr](https://habr.com/en/articles/1079066/) | 固件研究、NuttX 原生模块 | 外文，无中文体系 |

**因此：本站定位 = 能力矩阵 + 硬核内容索引 + 只补没人写的部分。**
不做「又一个快应用入门教程」——那块已被官方文档、路明笔记、openvela 三方覆盖。

> 米坛是**合作方**，不是竞品。冷启动首选去米坛发帖。

---

## 4. 内容策略：三条铁律

1. **不要重写已有教程。** 官方 + 路明已讲完「Hello World 到打包 rpk」。快应用章节只做三件事：机型差异、可检索的索引、别人没写的坑。
2. **每个页面必须标「适用机型 + 固件版本 + 验证状态 + 最后验证日期」。** 这是本站唯一的护城河。手环文档全都在腐烂，因为没人标版本。
3. **不搬运，只导读。** 转载 Habr / B站 / 论坛内容必须取得授权，页脚注明来源。论坛神帖做成「导读 + 关键步骤复现」，正文留在原处并链接过去。

**优先级**（内容价值从高到低）：自己实测复现 > 授权翻译/精编 > 官方文档导读 > 二手汇总。

---

## 5. 技术规格

- Node ≥ 20，pnpm ≥ 9，VitePress 1.x
- `config.mts` 里 **`base: '/miband-dev/'`** —— 漏了这行，Pages 上样式和图片全 404，这是本项目第一号事故源
- 构建命令 `pnpm docs:build`，产物 `docs/.vitepress/dist`
- GitHub Actions：`main` 推送 → build → deploy-pages

### 目标目录结构

```
miband-dev/
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.mts          # base、nav、sidebar、search、i18n 占位
│  │  ├─ data/models.json    # 机型矩阵唯一数据源
│  │  ├─ components/
│  │  │  ├─ ModelMatrix.vue  # 渲染矩阵，读 models.json
│  │  │  └─ StatusBadge.vue  # 亲测/据来源/未验证 徽章
│  │  └─ theme/index.ts
│  ├─ index.md               # 首页：矩阵 + 三条入口
│  ├─ start/                 # models.md capability.md glossary.md faq.md
│  ├─ quickapp/              # setup project ui api-health api-ai build deploy pitfalls
│  ├─ watchface/             # format lua build porting
│  ├─ firmware/              # hardware partitions dump unpack flash debug custom
│  ├─ native/                # overview toolchain module-hello miwear-app packagemanager lvgl deploy
│  ├─ protocol/              # auth sync tools
│  ├─ tools/index.md
│  ├─ examples/index.md
│  └─ community/             # contribute changelog
├─ examples/                 # quickapp-hello / watchface-min / native-module-hello
├─ scripts/check-frontmatter.ts
├─ .github/workflows/{build,deploy,link-check}.yml
├─ CONTRIBUTING.md
├─ LICENSE  LICENSE-CODE
└─ README.md
```

### frontmatter 规范（CI 强校验，缺字段直接 fail）

```yaml
---
title: 第一个快应用
models: [band10, band10pro]      # 枚举，见 models.json 的 id
firmware: ">=3.2.0"             # 字符串
verified: 2026-10-20            # 最后实测日期
status: tested                  # tested | sourced | unverified
source: "https://..."           # status != tested 时必填
contributors: [name]
---
```

校验用 zod，跑在 CI 里；`verified` 超过 12 个月降级为 warning（不要 fail，否则贡献者会被劝退）。

### models.json 最小字段

```json
{ "id": "band10", "name": "小米手环 10", "screen": [212, 520], "radius": 999,
  "os": "VelaOS", "soc": "BES2700",
  "quickapp": true, "watchface": true, "native": "unknown", "flash": "unknown" }
```

能力字段取值只允许：`true` / `false` / `"unknown"` / `"partial"`。**不知道就填 unknown，不要猜。**

---

## 6. 事实库（可直接用，但注意可信度）

| 事实 | 可信度 | 来源 |
|---|---|---|
| VelaOS 始于 2023-08 的小米手环 8 Pro；此后 手环9、9 Pro、红米手表 4/5、手环 10 均搭载 | 高 | 路明笔记 |
| 红米手环 3 有 Vela 但**无快应用引擎**，装不了快应用 | 高 | 路明笔记 |
| 屏幕分辨率：手环8 Pro 480×336；手环9 192×490；手环9 Pro 480×336；手环10 212×520；红米手表4 390×450；红米手表5 432×514 | 中（单篇博客，需抽 1–2 个机型核实） | 路明笔记 |
| 圆角半径：手环9 999px；手环9 Pro 48px；手环10 999px；红米手表5 90px | 中 | 路明笔记 |
| Mi Band 10 Pro 硬件：BES2700iMP Cortex-M33、16Mb 片内 SPI flash、约 2.5MB SRAM、16Mb PSRAM、外挂 SPI NAND 512/256Mb | 中高 | Habr |
| Mi Band 10 Pro 软件：NuttX + LVGL v9；Lua 跑表盘，AiotJS（quickjs 衍生，类 Vue）跑应用 | 中高 | Habr |
| 原生应用路径：Lua 表盘里 `os.execute()` 出 shell → `insmod /data/xxx.elf` 加载 ET_REL 模块 | 中高 | Habr |
| 应用注册接口：`miwear_app_t` / `miwear_page_t` 结构体 + `packagemanager_api_s`（install/recover/uninstall/unregister/set_hidden/is_hidden） | 中高 | Habr |
| 官方快应用文档 + AIoT IDE v1.7.0（含模拟器） | 高 | iot.mi.com/vela/quickapp |
| 存在「小米手环 11 NFC」相关讨论与 QEMU 模拟器项目 | 低（仅见论坛标题，未验证） | bandbbs |

**核实规则**：`低` 和 `中` 可信度的事实，写进文档前必须二次验证，或标 `status: unverified`。

---

## 7. P0 交付清单（第一步只做这些）

按顺序执行，每项都要能验证：

1. `pnpm create vitepress` 起站，配好 `base` 和 nav/sidebar → **验收：`pnpm docs:build` 成功，`dist/index.html` 存在**
2. GitHub Actions 构建 + 部署 → **验收：推送到 main 后 Pages URL 能打开**
3. `models.json` 填 3 个机型（band9 / band10 / band10pro），能力字段诚实填 `unknown` → **验收：JSON 通过 schema**
4. `ModelMatrix.vue` + `StatusBadge.vue` → **验收：首页矩阵能渲染，unknown 显示为 ❓**
5. `scripts/check-frontmatter.ts` 接进 CI → **验收：故意漏 `verified` 字段，CI 变红**
6. 落地 4 篇：`/start/models`、`/start/glossary`、`/quickapp/setup`、`/quickapp/pitfalls`
7. `CONTRIBUTING.md` + 免责声明 + 两份 LICENSE
8. 仓库根 README 说明项目定位与本地启动方式

**P0 完成 = 站能上线、矩阵是活的、校验是硬的、有 4 篇真内容。**

后续 P1–P5（快应用全量 → 表盘+工具索引 → 固件 → 原生 → 协议+推广）见 `miband-docs-plan.md` 第 6 节，MVP 目标 12 篇。

---

## 8. 红线（违反会毁掉项目）

- **不分发官方固件 / 资源包**，只给版本号、校验和、获取途径
- 不做一键刷机工具，不提供绕过付费/DRM 的方法
- 站名、logo 不使用小米商标；页脚必须有「非官方，与小米无关联」声明
- 固件页顶部必须有红色警告；**「备份与救砖」必须排在「刷写」之前**
- 不搬运他人内容（含论坛帖子、B站视频、Habr 文章），除非拿到授权
- 不用 `xiaomi-band-*` 这类像官方的命名

---

## 9. 需要用户拍板的问题（先问，别自己决定）

1. 站点正式中文名用「米环开发手册」还是别的？
2. 是否有真机可实测？（没有真机 → 所有内容只能标 `sourced`，矩阵可信度大打折扣，整个项目价值腰斩。**这个是关键前提，务必确认**）
3. `examples/` 放同仓还是独立仓？
4. 是否愿意去米坛发帖做冷启动？

---

## 10. 接手后的第一步

先问上面第 9 节的问题，特别是**第 2 条（有没有真机）**——它决定整个内容策略是否成立。

然后按第 7 节 P0 清单执行。不要重新做方案，不要重写 `miband-docs-plan.md`。

---

## 11. 参考资料

- 米坛知识库：<https://wiki.bandbbs.cn/>
- 米坛社区：<https://www.bandbbs.cn/>
- 官方快应用文档：<https://iot.mi.com/vela/quickapp/>
- openvela 文档：<https://github.com/open-vela/docs>
- 快应用教程导航（2026 大赛版）：<https://github.com/open-vela/docs/blob/dev-ai-contest-2026/zh-cn/contest_2026/quickapp/quickapp_guide_index.md>
- 固件/SoC 研究：<https://github.com/atc1441/MiBand10-BES2700iMP-BEST1503-Hacking>
- 原生应用长文（俄文）：<https://habr.com/en/articles/1079066/>
- 快应用长文（中文）：<https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/>
- 表盘 bin 工具：<https://github.com/zhy8388608/Mi8WfBinTool>
- 手环跑 JS 示例：<https://github.com/cciccicu/JSLab>
