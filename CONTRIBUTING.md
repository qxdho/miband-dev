# 贡献指南

感谢你愿意补一格矩阵或修一个坑。这个站的价值全在「诚实 + 可追溯」，请先读完下面四条。

## 0. 新页面放在哪里

分类只有一条主轴：**读者要做什么**。不按机型分，也不按「教程/参考/博客」这类文件类型分。

| 目录 | 回答的问题 | 读者画像 |
| --- | --- | --- |
| `docs/start/` | 哪台机器支持什么？名词什么意思？ | 刚进来，还不知道从哪下手 |
| `docs/quickapp/` | 怎么写出 `.rpk` 并装上去？ | 会 JS，想做应用 |
| `docs/watchface/` | 表盘是什么格式、怎么打包替换？ | 想做/换表盘 |
| `docs/firmware/` | 怎么备份、读分区、解包、刷写？ | 敢动底层 |
| `docs/native/` | 怎么在 NuttX 上跑自己编译的 C？ | 能写 C、能承受变砖 |
| `docs/protocol/` | 手环和手机之间在传什么？ | 要对接 BLE |
| `docs/tools/` | 有哪些现成工具，边界在哪？ | 所有层 |
| `docs/examples/` | 能直接跑的代码在哪？ | 所有层 |
| `docs/community/` | 本站是什么、怎么贡献 | — |

放之前过一遍这个顺序：

1. **它教的是某一层的操作或概念吗？** 是 → 放那一层。
2. **它跨了两层以上？**（例：「用手机 App 给手环装快应用」）→ 放**目的层**（这里是 `quickapp/`），另一层只链接过去，不复制内容。
3. **它只是「某台机器有什么不同」？** → 不改目录，改 `docs/.vitepress/data/models.json`，或在页面里加一段机型差异表。
4. **它是某个工具/示例的说明？** → `tools/` 或 `examples/`，正文留在原仓库，页面只做导读。

### 命名规则

- 目录与文件名一律**小写英文 + 短横线**：`api-health.md`、`module-hello.md`；
- 文件名就是 URL（`cleanUrls: true`），不要用中文、空格、下划线；
- **不要加数字前缀**（`01-xxx.md`）。顺序由 `config.mts` 的 sidebar 控制，加前缀以后插入新页就得批量改名。

### 每个板块内部固定这个顺序

新增页面时按下面五段找位置，读者换板块时不用重新学导航：

1. `index.md` —— 导读：这一层能做什么、不能做什么、前置条件、内容地图；
2. 入门/前置 —— 装环境、最小例子；
3. 操作/教程 —— 一步步做；
4. 参考 —— API、格式、字段、参数表；
5. 排错 —— 坑、报错、失败案例。

### 过期内容不删

页面过时了：把 `verified` 更新为你复核的日期，正文顶部加一句「本节对应固件 X，新版本可能已变化」，并把 `status` 降级。**不要直接删页** —— 站内和站外都可能有人链过来，删了就是死链。

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
