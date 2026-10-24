# 米环开发手册

面向开发者的中文小米手环与小米手表资料库，覆盖快应用、表盘、固件研究与原生应用四层，另有 BLE 协议与工具索引两个横向板块。

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
│  └─ theme/
├─ index.md                 # 首页：矩阵、板块入口
├─ start/                   # 机型矩阵、术语表
├─ quickapp/                # 环境搭建、常见问题
├─ watchface/  firmware/  native/  protocol/
├─ tools/  examples/
└─ community/               # 关于本站
scripts/check-frontmatter.ts
.github/workflows/          # build / deploy / link-check
```

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
