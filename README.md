# 米环开发手册

面向开发者的中文小米手环与小米手表资料库，按用途分为五个板块：入门、应用与表盘、固件与原生、协议工具与参考、关于与研究。

- 站点：<https://qxdho.github.io/miband-dev/>（GitHub Pages 项目页）
- 定位：资料汇编，不进行真机实测。每页标注来源与最后核对日期，未知内容标为 `unknown` 或 `unverified`。
- 范围：只收录国行设备，国际版不展开。
- 非官方项目，与小米公司无关联。

## 技术栈

VitePress 1.x + pnpm + GitHub Actions → GitHub Pages。

## 本地开发

要求 Node ≥ 20、pnpm ≥ 9。

```bash
pnpm install
pnpm docs:dev        # http://localhost:5173/miband-dev/
pnpm docs:build      # 产物在 docs/.vitepress/dist
pnpm docs:preview
pnpm check:frontmatter
```

站点发布在项目页 `https://qxdho.github.io/miband-dev/`，因此 `config.ts` 中 `base: '/miband-dev/'`。若迁移到 `<账号>.github.io` 根路径，`base` 需同步改为 `'/'`，否则静态资源与图片会返回 404。

## 发布

目标地址 <https://qxdho.github.io/miband-dev/> 属于 GitHub Pages 的项目页，不是 `<账号>.github.io` 根路径用户主页。

1. 账号为 `qxdho`，仓库名 `miband-dev`，不要求仓库名为 `qxdho.github.io`；
2. 仓库须为 **public**，免费账户的 Pages 只对公开仓库开放；
3. 在仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**。此后每次推送到 `main`，由 `.github/workflows/deploy.yml` 自动构建并发布。

`base` 必须为 `/miband-dev/`，修改仓库名时需同步修改。

## 目录

```text
docs/
├─ .vitepress/
│  ├─ config.ts            # base、nav、sidebar、搜索
│  ├─ data/models.json      # 机型矩阵唯一数据源
│  ├─ components/           # ModelMatrix.vue / StatusBadge.vue
│  └─ theme/                # 配色变量、配色选择器
├─ index.md                 # 首页：矩阵、板块入口
├─ start/                   # 机型矩阵、术语表
├─ apps/                    # 应用与表盘：quickapp/、watchface/
├─ system/                  # 固件与原生：firmware/、native/
├─ refs/                    # 协议与工具：BLE 协议、网络通路、QEMU、逆向、资料、示例
├─ about/                   # 关于本站、研究历程、控制中心与代码审查
└─ en/                      # 英文站，目录结构与上面一致，目前只翻了 start/
research/                     # 站点内容的原始笔记与地址表 CSV，页面的 source 指向这里
scripts/check-frontmatter.ts   # 校验 models.json 与全部页面 frontmatter
.github/workflows/          # build / deploy / link-check
```

## 内容来源

多数内容页从 `research/` 下对应编号的笔记改写而来，改写只调整结构与表述，数据以笔记为准；`research/README.md` 有编号与页面的对照表。直接整理自外部公开资料的页面（BLE 鉴权、启动链与救砖、QEMU 模拟器）以原始 URL 作为 frontmatter 的 `source`，并在[参考资料](/refs/references)页统一列出。

新增或修改内容的顺序是：先改笔记，再改站点页面，最后更新 frontmatter 的 `verified`。这样正文里的地址、偏移、哈希始终能追溯到原始记录。

## 多语言

站点有两门语言：

| 语言 | 目录 | 首页 | 状态 |
| --- | --- | --- | --- |
| 简体中文（默认） | `docs/` | `/miband-dev/` | 全站 |
| English | `docs/en/` | `/miband-dev/en/` | 仅 `start/` |

VitePress 只提供语言切换界面，**不翻译内容**——`docs/en/` 下的每一页都要有人写。增删语言在 `docs/.vitepress/config.ts` 的 `locales` 里改，导航和侧边栏也要在该 locale 的 `themeConfig` 里另写一份，链接必须带 `/en/` 前缀。

英文页面的 frontmatter 字段与中文页完全一样，`source` 指向同一来源。

## 配色

读者可以在右上角的圆点里换主题色，选择存在浏览器的 `localStorage`（键名 `miband-hue`），只影响自己。

配色定义在 `docs/.vitepress/theme/custom.css` 顶部，每种配色两组变量（浅色 + 暗色）：

```css
html[data-hue='blue'] {
  --vp-c-brand-1: #1d4ed8;   /* 链接、强调 */
  --vp-c-brand-2: #1e40af;   /* hover */
  --vp-c-brand-3: #1e3a8a;   /* 实心按钮底色，上面压白字 */
}
html.dark[data-hue='blue'] { /* 同样四项，整体提亮 */ }
```

加一种配色：`theme/hues.ts` 的 `HUES` 里加一项，再到 `custom.css` 补两组变量。色板的圆点直接读 `HUES`，不用改组件。

取值必须满足：浅色链接对白底 ≥4.5:1，按钮白字对 `brand-3` ≥4.5:1，暗色链接对 `#1b1b1f` ≥4.5:1。

## 内容规则

每个内容页必须有 frontmatter：

```yaml
---
title: 页面标题
models: [band9, band10, band10pro]   # 取值见 models.json
firmware: ">=3.2.0"                  # 未知时写 "unknown"
verified: 2026-10-24                 # 最后核对来源的日期
status: sourced                      # tested | sourced | unverified
source: "https://..."                # status 非 tested 时必填
contributors: [yourname]
---
```

- `status: tested` 表示已在真机验证；本站默认不产生 `tested`。
- `verified` 超过 12 个月时 CI 输出 warning，不阻断构建。
- 不搬运未授权内容，转载与翻译须取得授权并注明来源。

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

- 文档：[CC BY-SA 4.0](./LICENSE)
- 代码：[MIT](./LICENSE-CODE)

## 免责声明

固件研究与刷机存在变砖、数据丢失与保修失效的风险，后果自负。本站只做资料索引，不提供官方固件或资源包下载，不提供一键刷机工具。
