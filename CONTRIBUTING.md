# 贡献指南

本站的定位是资料汇编，内容价值取决于是否可追溯。提交前请阅读以下约定。

## 0. 新页面放在哪里

分类的唯一主轴是**用途**，不按机型划分，也不按教程、参考、博客这类文件类型划分。

| 目录 | 内容 | 适用读者 |
| --- | --- | --- |
| `docs/start/` | 机型支持情况、术语释义 | 刚接触本站的读者 |
| `docs/quickapp/` | 编写 `.rpk` 并安装到设备 | 具备 JS 基础，需要开发应用 |
| `docs/watchface/` | 表盘格式、打包与替换 | 需要制作或替换表盘 |
| `docs/firmware/` | 备份、读取分区、解包、刷写 | 具备底层操作经验 |
| `docs/native/` | 在 NuttX 上运行自编译的 C 模块 | 具备 C 与交叉编译经验 |
| `docs/protocol/` | 手环与手机之间的 BLE 通信 | 需要对接 BLE |
| `docs/tools/` | 现有工具及其适用范围 | 所有层 |
| `docs/examples/` | 可直接构建的示例工程 | 所有层 |
| `docs/community/` | 站点说明与贡献流程 | — |

内容归属的判断顺序：

1. 内容属于某一层的操作或概念时，放入该层目录。
2. 内容跨越两层以上时（例如「通过手机 App 给手环安装快应用」），放入目的层（此例为 `quickapp/`），其他层只做链接，不复制正文。
3. 内容只是某机型与其他机型的差异时，不新增目录，修改 `docs/.vitepress/data/models.json`，或在页面中增加机型差异表。
4. 内容是对某个工具或示例的说明时，放入 `tools/` 或 `examples/`，正文保留在工具或示例仓库，页面只做导读。

### 命名规则

- 目录与文件名使用小写英文与短横线：`api-health.md`、`module-hello.md`；
- 文件名即 URL（`cleanUrls: true`），不使用中文、空格或下划线；
- 不加数字前缀（`01-xxx.md`）。页面顺序由 `config.mts` 的 sidebar 控制，加前缀后插入新页需要批量改名。

### 板块内部顺序

新增页面按以下五类定位，读者切换板块时导航结构保持一致：

1. `index.md`：导读，说明该层可做与不可做的事、前置条件、页面清单；
2. 入门与前置：环境准备、最小示例；
3. 操作与教程：分步骤流程；
4. 参考：API、格式、字段、参数表；
5. 排错：报错、失败案例与判断方法。

### 过期内容不删除

页面内容过时时，将 `verified` 更新为复核日期，在正文顶部注明「本节对应固件 X，新版本可能已变化」，并将 `status` 降级。不删除页面，站内与站外链接会因此失效。

## 1. 页面必须带完整 frontmatter

```yaml
---
title: 页面标题
models: [band9, band10, band10pro]   # 枚举，取值见 docs/.vitepress/data/models.json
firmware: ">=3.2.0"                  # 未知时写 "unknown"
verified: 2026-10-24                 # 最后核对来源的日期（YYYY-MM-DD）
status: sourced                      # tested | sourced | unverified
source: "https://..."                # status 非 tested 时必填
contributors: [yourname]
---
```

CI 执行 `pnpm check:frontmatter`，缺字段直接失败。

- `status: tested` 仅在真机复现后使用，并在 PR 中附截图或日志。
- 本站定位为资料汇编，多数内容应为 `sourced` 或 `unverified`。
- `verified` 表示最后核对来源的日期，不是实测日期。

## 2. 不搬运未授权内容

- 转载 Habr、B 站、论坛帖子或公众号文章前须取得授权；
- 只做导读、关键步骤复现与原文链接，正文保留在原文处；
- 翻译同样需要授权，并在页脚注明作者与来源。

## 3. 矩阵只改 JSON

机型数据的唯一来源是 `docs/.vitepress/data/models.json`，不直接修改渲染结果。

能力字段取值为：

- `true` / `false`
- `"partial"`：部分可用或存在条件
- `"unknown"`：未知，不做推测

修改后执行：

```bash
pnpm check:frontmatter
pnpm docs:build
```

## 4. 写作约定

本站内容参照官方文档的写法，具体要求：

- 直接陈述，不描述站点定位或自我评价；
- 省略第二人称，不出现「你可以」「你必须」这类表述；
- 不用破折号补充说明，不用反问句；
- 结论附具体参数、字段名、错误码或版本号。

## 5. 红线

- 不提供官方固件与资源包的下载，只记录版本号、校验和与获取途径；
- 不提供一键刷机工具，不提供绕过付费或 DRM 的方法；
- 固件页面必须有风险警告，「备份与救砖」排在「刷写」之前；
- 站名与标志不使用小米商标，页脚保留「非官方，与小米无关联」。

## 提交前自查

- [ ] `pnpm check:frontmatter` 通过
- [ ] `pnpm docs:build` 通过
- [ ] 新页面包含 title / models / status / verified / contributors
- [ ] `status` 非 `tested` 时包含 `source`
- [ ] 无未授权转载
- [ ] 无法确认的结论标为 `unverified` 或 `unknown`
