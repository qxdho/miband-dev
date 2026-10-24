# 贡献指南

感谢你愿意补一格矩阵或修一个坑。这个站的价值全在「诚实 + 可追溯」，请先读完下面四条。

## 1. 页面必须带完整 frontmatter

```yaml
---
title: 页面标题
models: [band9, band10, band10pro]   # 枚举，取值见 docs/.vitepress/data/models.json
firmware: ">=3.2.0"                  # 不知道就写 "unknown"
verified: 2026-10-24                 # 最后核对来源的日期（YYYY-MM-DD）
status: sourced                      # tested | sourced | unverified
source: "https://..."                # status != tested 时必填
contributors: [yourname]
---
```

CI 会跑 `pnpm check:frontmatter`，缺字段直接 fail。

- `status: tested` 只在你**亲手于真机复现**后使用，并在 PR 里附截图/日志。
- 本站默认定位是资料仓库，大多数内容应是 `sourced` 或 `unverified`。
- `verified` 表示「最后核对来源的日期」，不是实测日期。

## 2. 不搬运未授权内容

- 转载 Habr、B站、论坛帖子、公众号文章，**必须先取得授权**；
- 只做「导读 + 关键步骤复现 + 链接回原文」，正文留在原处；
- 翻译同样需要授权，页脚注明作者与来源。

## 3. 矩阵只改 JSON

机型数据唯一数据源是 `docs/.vitepress/data/models.json`。不要手改渲染结果。

能力字段只允许：

- `true` / `false`
- `"partial"`（部分可用/有条件）
- `"unknown"`（不知道，**不要猜**）

改完跑：

```bash
pnpm check:frontmatter
pnpm docs:build
```

## 4. 红线

- 不分发官方固件 / 资源包，只给版本号、校验和、获取途径；
- 不做一键刷机工具，不提供绕过付费/DRM 的方法；
- 固件页必须有红色警告，「备份与救砖」排在「刷写」之前；
- 站名、logo 不使用小米商标，页脚保留「非官方，与小米无关联」。

## 提 PR 前自查

- [ ] `pnpm check:frontmatter` 通过
- [ ] `pnpm docs:build` 通过
- [ ] 新页面有 title / models / status / verified / contributors
- [ ] `status != tested` 时有 `source`
- [ ] 没有未授权转载
- [ ] 不确定的结论标了「待验证」
