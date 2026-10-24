# 米环开发手册

中文的小米手环 / 小米手表**开发者资料库**，覆盖四层：

**快应用 → 表盘 → 固件研究 → 原生应用**，外加 BLE 协议与工具索引。

- 站点：<https://miband-dev.github.io/>（用户/组织主页，根路径发布）
- 定位：**资料仓库，不做真机实测**。每页标注来源与最后核对日期，拿不准就写「待验证」。
- 范围：**只做国行**。国际版一句话带过。
- 非官方，与小米公司无关联。

## 技术栈

VitePress 1.x + pnpm + GitHub Actions → GitHub Pages。

## 本地开发

要求 Node ≥ 20、pnpm ≥ 9。

```bash
pnpm install
pnpm docs:dev        # http://localhost:5173/
pnpm docs:build      # 产物在 docs/.vitepress/dist
pnpm docs:preview
pnpm check:frontmatter
```

> 注意：本站发布在 `miband-dev.github.io` 的**根路径**，所以 `config.mts` 里 `base: '/'`。
> 如果以后改成项目页（`<user>.github.io/miband-dev/`），`base` 必须同步改成 `/miband-dev/`，否则样式和图片会全部 404。

## 发布

目标地址是 <https://miband-dev.github.io/>，这属于 GitHub 的**用户/组织主页**，有两个硬性前提：

1. GitHub 账号（或组织）的用户名必须是 `miband-dev`；
2. 仓库名必须是 `miband-dev.github.io`（精确匹配，这是 GitHub 的特殊仓库名，每个账号只能有一个）。

推送后到仓库 **Settings → Pages → Source** 选 **GitHub Actions** 即可。之后每次 push 到 `main`，`.github/workflows/deploy.yml` 自动构建并发布。

> 仓库需要是 **public**（免费账户的 Pages 只对公开仓库开放）。

## 目录

```text
docs/
├─ .vitepress/
│  ├─ config.mts            # base、nav、sidebar、搜索
│  ├─ data/models.json      # 机型矩阵唯一数据源
│  ├─ components/           # ModelMatrix.vue / StatusBadge.vue
│  └─ theme/
├─ index.md                 # 首页：矩阵 + 入口
├─ start/                   # 机型矩阵、术语表
├─ quickapp/                # 环境搭建、十大坑
└─ community/               # 关于本站
scripts/check-frontmatter.ts
.github/workflows/          # build / deploy / link-check
```

## 内容规则（CI 强校验）

每个内容页必须有 frontmatter：

```yaml
---
title: 页面标题
models: [band9, band10, band10pro]   # 取值见 models.json
firmware: ">=3.2.0"                  # 不知道就写 "unknown"
verified: 2026-10-24                 # 最后核对来源的日期
status: sourced                      # tested | sourced | unverified
source: "https://..."                # status != tested 时必填
contributors: [yourname]
---
```

- `status: tested` 才表示真机验证过；本站默认不产生 `tested`。
- `verified` 超过 12 个月会在 CI 里给 warning，但不阻断。
- 不搬运未授权内容；转载/翻译必须拿到授权并注明来源。

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

- 文档：[CC BY-SA 4.0](./LICENSE)
- 代码：[MIT](./LICENSE-CODE)

## 免责声明

固件研究、刷机、解锁有变砖、丢数据、失去保修的风险，后果自负。本站只做资料索引，不提供官方固件/资源包下载，不提供一键刷机工具。
