# 米环开发文档 · 分类重构计划

> 目标：把「按技术层次平铺」的旧站，改成「按应用形态分流」的新站。
> 一级入口只回答一个问题：**你要做表盘、快应用，还是原生应用？**
> 状态：计划稿，尚未改动任何文档。确认后按第 11 节分阶段执行。

---

## 0. 摘要

1. **一级导航从 5 项改为 6 项**：开始 / 表盘 / 快应用 / 原生应用 / 平台与工具 / 关于（「开始」是否保留见 §14）。
2. **表盘拆成两条产品线**：普通表盘（介绍 + 打包）、Lua 表盘（介绍 + 能力 + 打包 + 开发 + 示例），另设「表盘格式」与「安装表盘」两个共用页。
3. **快应用补齐三件套**：介绍、能力、打包；环境搭建与工程结构拆开，避免 setup 页变成大杂烩。
4. **原生应用升为一级板块**，固定四页：介绍（含与快应用的区别）、支持的设备、加载方式（明确写「配合 Lua 表盘安装」）、能力；其下再分开发 / 界面 / 框架 / 进阶 / 示例。
5. **把固件、协议、工具、参考资料收进「平台与工具」**，让应用开发者不被底层资料干扰，也让底层资料不再寄居在「原生应用」下面。
6. **站点改名**：`米环开发文档`；标语已定 `探索 Vela 的每一分潜力`。
7. **内容不删只搬**：39 个现有内容页全部有落点，最终约 52 页（净增 13 页；新建 16 个文件，部分旧页拆分后不再单独保留）；旧 URL 做 404 映射。
8. **两个必须先补的坑**：`installer/` 与 `probe/` 目前未入库，文档一链接就 404；「普通表盘」没有一手格式资料，不能凭空写字节结构。
9. **快应用优先链官方文档**：教程、组件、JS 接口、工具、示例直接给官方入口，站内只补机型适配、打包与踩坑；表盘没有公开官方开发文档，给官方工具入口，正文以站内实测为主。

---

## 1. 站名与标语

### 1.1 站名

| 位置 | 现在 | 改为 |
| --- | --- | --- |
| `docs/.vitepress/config.ts:14` title | MiBand开发手册 | 米环开发文档 |
| `docs/.vitepress/config.ts:156` siteTitle | MiBand开发手册 | 米环开发文档 |
| `docs/.vitepress/config.ts:312` footer | 米环开发手册 | 米环开发文档 |
| `docs/index.md` hero name | 米环开发手册 | 米环开发文档 |
| `README.md` | 米环开发手册 | 米环开发文档 |
| `docs/about/index.md` | 米环开发手册 | 米环开发文档 |
| 英文站 | Mi Band Developer Handbook | Mi Band Developer Docs（可选） |

「文档」比「手册」更准确：这个站的主体是可检索的参考页，不是线性教程。英文站可先保留 Handbook，等英文内容补齐再统一。

### 1.2 标语

原句「探索vela的最大潜力」的问题：`vela` 应大写为 `Vela`；「最大潜力」略空，且和站点内容没有直接关系。

| 方案 | 文案 | 评价 |
| --- | --- | --- |
| **A（推荐）** | **探索 Vela 的每一分潜力** | 保留原意，「每一分」比「最大」具体，和「把设备用到底」的站内气质一致 |
| B | 从表盘到内核，探索 Vela 的边界 | 信息量大，但偏长，适合做副标题 |
| C | 把 Vela 的潜力用到底 | 口语、有劲，适合社区，但正式感弱 |
| D | 面向开发者的 Vela 实践文档 | 清楚但平淡，不像标语 |

**已定：方案 A。** 其余方案保留在这里作为决策记录，不再讨论。

```yaml
# docs/index.md
name: 米环开发文档
text: 探索 Vela 的每一分潜力
tagline: 表盘 · 快应用 · 原生应用 · 平台资料
```

`description` 同步改为：`小米手环 / 小米手表 Vela 开发文档：表盘、快应用、原生应用与平台资料。`（利于搜索与分享卡片。）

---

## 2. 现状诊断

### 2.1 旧结构

```
开始          /start/
应用与表盘    /apps/        quickapp/ + watchface/
固件与原生    /system/      firmware/ + native/
协议与工具    /refs/
关于与研究    /about/       history + control-center + code-review
```

### 2.2 五个结构性问题

| # | 问题 | 具体表现 | 后果 |
| --- | --- | --- | --- |
| 1 | **分类轴混用** | 「应用与表盘」按应用形态分，「固件与原生」按技术层次分，「协议与工具」按资料类型分 | 读者不知道一个页面该去哪个大类找；新增页面也没有唯一归属 |
| 2 | **表盘只有「打包格式」** | `apps/watchface/` 只有 index + package；没有「普通表盘 vs Lua 表盘」的分流，没有能力页、安装页 | 想做表盘的人先撞上一堆容器字节，不知道从哪开始 |
| 3 | **快应用缺能力与打包** | `quickapp/` 有 setup/runtime/pitfalls，能力散在 index，打包只在「计划中」 | 三件套不齐，无法支撑「看完就能做」 |
| 4 | **原生应用被埋在固件下面** | `/system/native/*` 与 firmware 平级；没有「支持的设备」「加载方式」独立页 | 最需要前置警告和安装路径的板块，反而最难被发现 |
| 5 | **横向资料没有家** | 协议、工具、参考、研究档案散落在 refs 与 about | 平台资料和应用文档互相污染；about 里塞了 control-center 和 code-review |

### 2.3 旧站没有被明确安放的内容

- `refs/patterns.md`（原生开发模式、三条渲染路径）—— 其实是原生 UI 文档。
- `about/control-center.md`（控制中心磁贴）—— 其实是原生能力。
- `about/code-review.md`（Chaos 代码审计）—— 其实是原生框架资料。
- `refs/examples.md`（外部示例索引）—— 与第一方 `probe/`、`watchfaces/` 示例不是一回事，需要分开。
- `installer/`、`probe/`、`watchfaces/fslist/` —— 代码资产，尚未在文档中形成入口。

### 2.4 判断

旧站不是「内容少」，而是**入口按实现层次切，而读者按产出目标找**。重构的核心不是换目录名，而是把「读者意图」变成第一分类轴，把「技术层次」降为第二分类轴。

---

## 3. 目标信息架构

### 3.1 一级导航

| 导航 | 路径 | 回答的问题 | 典型读者 |
| --- | --- | --- | --- |
| 开始 | `/start/` | 我该做哪种？需要什么设备？ | 第一次来的人 |
| 表盘 | `/watchface/` | 怎么做一个表盘并装上去？ | 表盘作者 |
| 快应用 | `/quickapp/` | 怎么做一个 `.rpk` 并装上去？ | JS / AIoT 开发者 |
| 原生应用 | `/native/` | 怎么让 `.ko` 跑在手环上？ | 嵌入式 / 逆向开发者 |
| 平台与工具 | `/platform/` | 固件、协议、工具链在哪？ | 需要底层资料的人 |
| 关于 | `/about/` | 这个站是谁做的？可信吗？ | 所有人 |

**为什么不是只有三个板块？**
表盘 / 快应用 / 原生应用是「做东西」的三条路，必须是一级；但固件、BLE 协议、模拟器、逆向工具不属于任何一条应用路线，硬塞进去会重复旧站「分类轴混用」的毛病。所以给它们一个明确的「平台与工具」横向层，并在文案上说明：**做应用不必先读平台层**。

**备选（若坚持 5 项）**：把「开始」并入首页，导航变成 表盘 / 快应用 / 原生应用 / 平台与工具 / 关于。不推荐：新读者仍需要一个「三条路怎么选」的落点，首页 hero 下方放不下完整决策表。

### 3.2 完整目录树

`[保留]` 原样迁移；`[迁移]` 换路径；`[拆分]` 一页变多页；`[重写]` 保留路径但内容重做；`[新建]` 新页。

```
docs/
├── index.md                                   [重写] 首页：三条路 + 平台入口 + 机型矩阵
├── start/
│   ├── index.md                               [重写] 5 分钟导读：Vela 是什么、三条路、安全须知
│   ├── choose-path.md                         [迁移] ← apps/index.md，改成三选一决策表
│   ├── models.md                              [保留] 机型矩阵
│   └── glossary.md                            [保留] 术语表
├── watchface/
│   ├── index.md                               [重写] 表盘总览：普通 vs Lua、共同前置、页面地图
│   ├── normal/
│   │   ├── index.md                           [新建] 普通表盘：概念、能力、与 Lua 的区别
│   │   └── package.md                         [新建] 普通表盘：打包与安装
│   ├── lua/
│   │   ├── index.md                           [新建] Lua 表盘：概念、运行环境、最小示例
│   │   ├── capabilities.md                    [新建] Lua 表盘能力与边界
│   │   ├── package.md                         [新建] Lua 表盘：打包（p67 / 8 Pro）
│   │   ├── develop.md                         [新建] 开发工作流、调试、错误处理
│   │   └── examples.md                        [新建] 第一方示例（fslist、LRA probe）
│   ├── format.md                              [迁移] ← watchface/package.md，纯格式参考
│   └── install.md                             [新建] 表盘安装、卸载、失败排查
├── quickapp/
│   ├── index.md                               [迁移] ← quickapp/index.md，介绍 + 边界
│   ├── setup.md                               [迁移] 环境搭建 + 第一个工程
│   ├── structure.md                           [新建] 工程结构与 manifest 详解（从 setup 拆）
│   ├── capabilities.md                        [新建] 能力清单、权限、机型差异
│   ├── runtime.md                             [迁移] JIDL / 模块注册 / 裁剪
│   ├── package.md                             [新建] 打包、签名、安装
│   └── pitfalls.md                            [迁移] 社区故障案例
├── native/
│   ├── index.md                               [重写] 原生应用：概念 + 与快应用的区别 + 风险
│   ├── devices.md                             [新建] 支持的设备与固件
│   ├── loading.md                             [新建] 加载方式：配合 Lua 表盘安装
│   ├── capabilities.md                        [新建] 能力地图（UI / 设备 / 应用管理 / 系统）
│   ├── develop/
│   │   ├── modules.md                         [迁移] ← native/modules.md
│   │   └── hello.md                           [新建] 最小模块 + 交叉编译 + 入库
│   ├── ui/
│   │   ├── lvgl.md                            [迁移]
│   │   ├── arc.md                             [迁移]
│   │   └── patterns.md                        [迁移] ← refs/patterns.md
│   ├── frameworks/
│   │   ├── canopus.md                         [迁移]
│   │   ├── chaos.md                           [迁移]
│   │   └── chaos-review.md                    [迁移] ← about/code-review.md
│   ├── advanced/
│   │   ├── addresses.md                       [迁移]
│   │   ├── app-hiding.md                      [迁移]
│   │   └── control-center.md                  [迁移] ← about/control-center.md
│   └── examples.md                            [新建] 第一方示例索引（probe / installer / fslist）
├── platform/
│   ├── index.md                               [拆分] ← system/index.md，改为「平台与工具」总览
│   ├── firmware/
│   │   ├── index.md                           [迁移]
│   │   ├── package.md                         [迁移]
│   │   ├── architecture.md                    [迁移]
│   │   ├── filesystem.md                      [迁移]
│   │   └── recovery.md                        [迁移]
│   ├── protocol/
│   │   ├── ble.md                             [迁移] ← refs/ble.md
│   │   └── network.md                         [迁移] ← refs/network.md
│   ├── tools/
│   │   ├── index.md                           [迁移] ← refs/index.md
│   │   ├── emulator.md                        [迁移]
│   │   └── reversing.md                       [迁移]
│   └── reference/
│       ├── references.md                      [迁移] ← refs/references.md
│       └── examples.md                        [迁移] ← refs/examples.md（外部示例索引）
├── about/
│   ├── index.md                               [重写] 定位、非官方声明、许可、贡献
│   └── history.md                             [保留] 研究历程与误判记录
└── en/                                        [保留] 先不扩译，只修链接与站名
    ├── index.md
    └── start/{index,models,glossary}.md
```

最终约 **52 个中文内容页**（现有 39，新增 13，另有拆分产生的重写页）。目录名全部小写英文短横线，无数字前缀，符合 `CONTRIBUTING.md`。

### 3.3 四条设计原则

1. **一个意图一个入口**：同一个页面只服务一个「我要做什么」，其他入口用链接和「前置阅读」解决。
2. **介绍页回答五个问题**：是什么 / 能做什么 / 不能做什么 / 怎么开始 / 下一步读哪。
3. **格式与流程分离**：`watchface/format.md` 只讲字节；`normal/package.md` 与 `lua/package.md` 只讲「怎么产出这个字节」。避免同一张表在三个页面各抄一遍。
4. **风险前置**：原生应用、刷机、Lua 表盘执行 shell，必须在页面第一屏出现警告，而不是文末。

---

## 4. 三大板块设计

### 4.1 表盘 `/watchface/`

#### 4.1.1 板块结构

```
表盘总览（index）
├── 普通表盘（normal/）
│   ├── 介绍
│   └── 打包方式
├── Lua 表盘（lua/）
│   ├── 介绍
│   ├── 能力
│   ├── 打包方式
│   ├── 开发与调试
│   └── 示例
├── 表盘格式（format）        ← 两种表盘共用的容器参考
└── 安装表盘（install）       ← 两种表盘共用的安装/卸载/排查
```

`index` 必须先给一张对照表，让读者在 30 秒内决定走哪条：

| 维度 | 普通表盘 | Lua 表盘 |
| --- | --- | --- |
| 一句话 | 以资源与布局为主，不含可执行脚本（定义待核实，见 §13） | 以 Lua 脚本驱动界面与逻辑 |
| 能改什么 | 图、字、布局、数据位 | 图、字、布局 + 任意 Lua 逻辑 + shell |
| 能否装原生模块 | 否 | 能（`os.execute` + `insmod`） |
| 开发门槛 | 低 | 中（Lua + 容器打包） |
| 官方工具 | 官方表盘制作工具 / Mi8WfBinTool（待核实） | 社区工具链 + 手写 spec |
| 风险 | 低 | 中高（加载即执行，可能白屏/重启循环） |
| 典型产物 | `.bin` / `.face`（待核实） | p67 `.bin`、8 Pro `.face` |
| 详细 | `/watchface/normal/` | `/watchface/lua/` |

> **不要把「普通表盘」写成「简单表盘」**。它可能同样复杂，只是不走 Lua。定义必须由样本验证后再落笔。

#### 4.1.2 普通表盘两页

`normal/index.md` 必须包含：

- 概念：不使用 Lua 脚本、由资源与声明式布局构成的表盘（暂定，待样本确认）。
- 与 Lua 表盘的区别：可执行性、能力上限、打包工具、安装兼容性。
- 能做什么：时间/日期/步数/心率/电量等数据位，样式与动效边界（按官方工具实际能力写）。
- 不能做什么：不能执行任意代码、不能 `insmod`、不能读写任意文件。
- 前置：官方制作工具、机型与分辨率、表盘 ID 规范。
- 页面地图：打包 → 安装 → 格式参考。

`normal/package.md` 必须包含：

- 工具链与版本（官方工具 / Mi8WfBinTool，按实际验证结果写）。
- 从工程到产物的完整步骤，附目录示例。
- 分辨率、预览图、ID、名称、版本字段。
- 产物校验：文件头、大小、可安装性。
- 常见失败：装不上、预览错、白屏、重启循环。
- **证据状态标注**：若没有一手样本，整页标 `status: unverified`，只写「工具入口 + 待补」，不写字节偏移。

#### 4.1.3 Lua 表盘五页

`lua/index.md`：

- 定义：Lua 脚本 + 资源，打包成表盘容器，由系统表盘运行时加载。
- 运行环境：Lua 5.4；`io.open` / `os.execute` / `os.remove` 可用；包内文件解包到 `SCRIPT_PATH`（证据：`installer/README.md`）。
- 最小结构：`main.lua` + 资源 + `spec.json`（指向 `watchfaces/fslist/`）。
- 加载即执行的风险：顶层代码报错可能导致白屏/重启循环；建议 `pcall` + 延迟动作。
- 与快应用、原生应用的关系：表盘是「载体」，原生模块是「乘客」。
- 页面地图。

`lua/capabilities.md`：

| 能力 | 说明 | 证据 |
| --- | --- | --- |
| 绘制 UI | LVGL 对象树、图片、文本、按钮 | `watchfaces/fslist/`、`apps/watchface/package.md` |
| 文件读写 | `io.open`，可写 `/data`、`/tmp` | `installer/README.md`、`probe/lua/main.lua` |
| 执行 shell | `os.execute`，可读 `/proc`、列 `/dev` | `installer/README.md`、`probe/lua/main.lua` |
| 加载内核模块 | shell 调 `insmod`，把 `.ko` 送进内核 | `installer/README.md` |
| 自启动 | 写 `/data/rc.d` 脚本 | `installer/README.md` |
| 读取系统信息 | `/proc/version`、`/proc/modules`、`/dev/*` | `probe/lua/main.lua` |
| 不能做的 | 无 ioctl 绑定、无提权、无持久后台、无调试器；网络能力未见证据 | 待补 |

必须有一节「能力边界与安全」：Lua 表盘不是沙箱，`os.execute` 等于把 shell 交给表盘作者；安装来源不可信的表盘 = 把设备交给对方。

`lua/package.md`：

- 两种容器：p67 / 10 Pro（`_lua/<device>/` 前缀、无对齐、336×480 预览、version `0x00010003`、deviceFlag `0x800`）；8 Pro `.face`（`lua/` 前缀、4 字节对齐、4 槽记录表、预览 tag `0x400`）。
- 工具：`p67build.cjs` / `tools/p67build.js`、`tools/facebuild.js`、`tools/containerbuild.js`；`inspect` / `build` / `verify` 三个子命令。
- `spec.json` 字段逐项解释：name、id、version、device、preview、entry、resources。
- 构建后校验：字节级 `cmp`、大小、magic、槽位、缩略图尺寸。
- 安装通道：AstroBox / Canopus / AIoT IDE。
- 故障表：`InstallFailed`（8 Pro 容器装到 p67）、缩略图不匹配、缺 `_lua/` 前缀、`ALIGN` token nil、白屏/重启循环、重复动作要用 `run_attempted` 门闩。
- 只在这里写「怎么打包」；字节布局一律链到 `format.md`。

`lua/develop.md`：

- 工作流：改 `main.lua` → 本地 smoke → 打包 → 安装 → 看日志/文件。
- 离线测试：`tools/smoke.lua` 的用法与边界。
- 错误处理：`pcall`、`xpcall`、加载期零副作用、按钮触发、busy 门闩。
- 文件落点：`/data`、`/tmp`、`SCRIPT_PATH` 的区别。
- 调试手段：写文件、`os.execute` 读 `/proc`、最小复现表盘。
- 发布前检查清单。

`lua/examples.md`：

- `watchfaces/fslist/`：文件清单表盘，按下才 `ls -R /`，写 `/data/fslist.txt`；讲「为什么加载期什么也不做」。
- `probe/lua/main.lua`：LRA 探针，读 `/proc/version`、开 `/dev/lra0`、列 `/dev`、查 `/proc/modules`、看 `/data/rc.d`；讲「只读探针」的写法。
- `installer/`：把 `.ko` 装进 `/data` 并 `insmod` 的完整表盘；讲「表盘即安装器」。
- 每个例子给：目录、构建命令、预期输出、风险。

#### 4.1.4 共用两页

`format.md`（由现 `watchface/package.md` 迁移）：

- 保留现有全部字节级细节：magic `5A A5 34 12`、`0x148` 头、记录表、槽位、对齐、前缀、预览、`type=5` 的 `.ko` 资源。
- 增加一张「两种布局差异」总表，作为唯一事实源。
- 顶部声明：本文只讲格式，动手打包去 `normal/package` 或 `lua/package`。

`install.md`：

- 安装通道对比：AstroBox / OronBox / BandBurg / Canopus / AIoT IDE。
- 安装前检查：机型、固件、分辨率、容器类型、预览尺寸。
- 安装步骤（截图位预留）。
- 卸载与恢复：删除表盘、清 `/data`、重启、救砖链到 `platform/firmware/recovery`。
- 失败排查表：装不上 / 装上不显示 / 白屏 / 重启循环 / 缩略图错。
- 安全提示：第三方表盘可执行 shell。

#### 4.1.5 官方文档与站内分工

表盘目前**没有检索到公开的官方开发文档**。官方侧能确认的是「表盘制作工具 / 小米运动健康 / 表盘市场」这条用户向链路；如果后续拿到官方文档或工具说明，统一登记到 `platform/reference/references.md`，页面里只链站内入口。

| 内容 | 优先来源 | 站内页面 |
| --- | --- | --- |
| 普通表盘概念 / 制作 | 官方表盘制作工具（入口待补） | `normal/index` |
| 普通表盘打包 | 官方工具导出流程（待核实） | `normal/package` |
| Lua 表盘运行时 / 能力 | 无公开官方文档，以站内实测为准 | `lua/index`、`lua/capabilities` |
| 容器格式 | 站内逆向 | `format` |
| 安装 | 官方表盘市场 + 社区工具 | `install` |

写作规则：官方工具能回答的，页面顶部给入口；正文只写「官方没说的部分」——机型适配、容器差异、失败案例。**不要把官方教程整段搬进站内**，否则官方一更新就过期。

### 4.2 快应用 `/quickapp/`

```
快应用
├── 介绍（index）       是什么、与表盘/原生的区别、能力边界
├── 环境搭建（setup）   工具、账号、设备、第一个工程
├── 工程结构（structure）manifest、目录、页面、路由
├── 能力（capabilities）API 清单、权限、机型差异
├── 运行时（runtime）   JIDL、模块注册、裁剪、fetch
├── 打包（package）     .rpk、签名、安装、版本
└── 踩坑（pitfalls）    社区故障案例
```

`index.md` 要求：

- 定义：AiotJS + `.rpk`，跑在快应用运行时里，有权限沙箱。
- 与表盘的区别：表盘是「设备外观 + Lua」，快应用是「带 UI 的应用」；表盘不能上架应用商店，快应用可以。
- 与原生应用的区别：见 §4.3.1 的对照表，这里只放一句 + 链接，避免两处维护。
- 能做什么 / 不能做什么（不能直接文件系统、不能加载 `.ko`、不能改系统）。
- 适合谁：会 JS、想快速做功能页的人。
- 页面地图。

`capabilities.md` 要求：

| 类别 | 能力 | 备注 |
| --- | --- | --- |
| UI | 页面、组件、路由、动画 | 机型分辨率适配 |
| 健康 | 心率、步数、睡眠等 | 权限与采样频率 |
| 传感器 | 加速度、陀螺仪等 | 按机型 |
| 通知 | 通知读写 | 权限 |
| 存储 | 键值存储 | 非任意文件 |
| 交互 | 振动、亮屏 | — |
| 网络 | `fetch` | 失败模式见 runtime |
| AI | 小爱/语音能力 | 按机型与版本 |
| 不能 | 文件系统、`.ko`、系统调用 | 需原生应用 |

每一项标「已验证机型」与「来源」，无证据的标 `unverified`。

`package.md` 要求：

- 构建产物 `.rpk` 的目录结构。
- 签名/证书（官方 IDE 流程）。
- 安装：IDE 直装、应用商店、扫码/推送。
- 版本号与更新。
- 常见打包错误。
- 与表盘安装的区别：快应用有独立安装通道，表盘没有。

`setup.md` 瘦身：只留环境、账号、设备连接、第一个工程跑通；工程结构、manifest 字段移到 `structure.md`。

#### 4.2.1 官方文档与站内分工

快应用有公开的官方文档，本站**不重复造轮子**：

| 官方入口 | 链接 | 站内对应 |
| --- | --- | --- |
| 教程 / 快速开始 | <https://iot.mi.com/vela/quickapp/zh/guide/> | `setup`、`structure` |
| 组件 | <https://iot.mi.com/vela/quickapp/zh/components/> | `capabilities` 只写手环适配差异 |
| JS 接口 | <https://iot.mi.com/vela/quickapp/zh/features/> | `capabilities` 只写权限与机型差异 |
| 工具（模拟器 / 调试） | <https://iot.mi.com/vela/quickapp/zh/tools/> | `setup`、`platform/tools/emulator` |
| 编程示例 | <https://iot.mi.com/vela/quickapp/zh/samples/> | `index` 的「下一步」 |
| 澎湃OS 开发者平台 | <https://dev.mi.com/xiaomihyperos/quickapp-develop> | `index` 的「官方入口」 |

站内**不抄三样**：组件属性表、JS API 参数表、IDE 安装步骤。这三类官方更新快，抄过来必过期。

站内**保留四样**：手环/手表的机型与分辨率适配、权限在真机上的实际表现、`.rpk` 打包与安装的坑、社区故障案例。

### 4.3 原生应用 `/native/`

这是本次重构的重点。用户明确要求四件事：介绍（含与快应用的区别）、支持的设备、加载方式（配合 Lua 表盘安装）、能力。

#### 4.3.1 `index.md`：介绍

必须包含：

1. **概念**：原生应用 = 以 `ET_REL` ARM ELF（`.ko`）形式，通过 `insmod` 加载进 NuttX 内核的模块；不是 `.rpk`，不是独立 App，没有应用商店入口。
2. **与快应用的区别**（核心表）：

| 维度 | 快应用 | 原生应用 |
| --- | --- | --- |
| 形态 | `.rpk` 包 | `.ko` 内核模块（ET_REL） |
| 运行位置 | AiotJS 运行时（用户态沙箱） | NuttX 内核态 |
| 语言 | JavaScript | C / Rust / C++（交叉编译） |
| 权限 | 受 API 与权限约束 | 无沙箱，可碰内核符号与设备节点 |
| 安装 | 独立安装（IDE/商店） | **没有独立通道，必须配合 Lua 表盘安装** |
| 生命周期 | 应用生命周期管理 | 加载即驻留 RAM，重启失效；可靠 `/data/rc.d` 自启 |
| 调试 | 日志/IDE | 无调试器，靠 `/proc`、写文件、最小复现 |
| 机型 | 较广 | 目前仅 10 Pro 有公开可行证据 |
| 风险 | 应用崩溃 | 内核崩溃、白屏、重启循环、变砖 |
| 适合 | 功能页、健康、通知 | UI 框架、设备驱动、系统钩子、深度定制 |

3. **与 Lua 表盘的关系**：表盘是安装器与载体；`.ko` 是乘客。没有表盘，`.ko` 进不了设备。
4. **能做什么 / 代价**：能力上限高，但绑定固件、地址、机型；升级固件可能全部失效。
5. **前置阅读**：Lua 表盘能力 → 表盘安装 → 原生加载方式 → 最小模块。
6. **第一屏警告**：内核态、无沙箱、可能变砖；先看 recovery。

#### 4.3.2 `devices.md`：支持的设备

必须把「有证据」与「仅有目标包」分开，禁止把 Canopus target pack 当成可加载证明。

| 机型 | 固件 | modlib / 可加载 `.ko` | Canopus target pack | 结论 |
| --- | --- | --- | --- | --- |
| 10 Pro（p67 / M2551B1） | 3.101.043 | **已证实** | 有（036 / 043） | 唯一有公开可行记录的机型；`models.json` 中 `native: true` |
| 9 | 3.1.32 | 未证实 | 有 `xiaomi-band-9-3.1.32` | 仅有目标包，不能推断可加载 |
| 9 Pro | 3.1.175 | 未证实（现有资料称无 modlib） | 有 `xiaomi-band-9-pro-3.1.175` | 待复核 |
| 11 / 11 NFC | 4.100.139 / 155 / 177 | 未证实 | 有 | 矩阵尚未收录该机型 |
| p65（机型对应关系待核实） | 3.100.043 | 未证实 | 有 | 待核实 |

页面还要写：

- 判断一台设备是否支持的检查清单：固件版本、`/proc/modules`、modlib 是否存在、能否 `insmod` 一个最小模块。
- 为什么不建议跨机型复用 `.ko`：地址硬编码、ABI、内核配置。
- 固件升级后的失效风险与回退。
- 每条结论的来源与日期。

#### 4.3.3 `loading.md`：加载方式（配合 Lua 表盘安装）

**这是全站最重要的一页。** 开头必须是加粗结论 + warning：

> **原生应用没有独立安装入口。必须配合一个 Lua 表盘安装：表盘负责把 `.ko` 写到 `/data`，再调用 `insmod` 把它送进内核。**

页面结构：

1. **为什么必须借助表盘**：设备侧唯一可携带任意文件并获得 shell 的用户入口是 Lua 表盘；快应用有沙箱，装不了 `.ko`。
2. **安装链路图**：

```
.ko 源码
  → 交叉编译（32-bit ARM, ET_REL）
  → installer/payloads/
  → build.mjs 校验 ELF
  → pack67.mjs 打成 p67 表盘 .bin
  → AstroBox / Canopus / AIoT IDE 安装表盘
  → 打开表盘，触发安装
  → 写 /data/<token>/<name>/<file>（回读校验）
  → insmod
  → 检查 /proc/modules
  → 可选：写 /data/rc.d 自启
```

3. **两种投递方式**：
   - 方式 A（主线，按 `installer/README.md`）：表盘内 `os.execute` 调 `insmod`。
   - 方式 B（底层）：Canopus 的 `/dev/canopus` + CPS1 包 + `native-app.register`；细节链到 `frameworks/canopus.md`，不混进安装步骤。
4. **分步操作**：编译 → 放入 payloads → 构建 → 安装表盘 → 触发 → 验证。每步给命令与预期输出。
5. **生命周期**：加载后驻留 RAM；重启失效；`/data/rc.d` 自启；**不要 `rmmod`**；安装器写入是幂等的，失败时 rc.d 脚本会自删。
6. **回滚与救砖**：删 rc.d 脚本 → 重启；删模块文件；表盘安装失败不会自动加载；严重情况链到 `platform/firmware/recovery`。
7. **安全与风险**：内核态、无沙箱、地址绑定、来源不可信 = 最高权限。
8. **常见失败**：`insmod` 返回错误、`/proc/modules` 看不到、重启循环、固件不匹配、地址失效。
9. **不要做的事**：不要给普通用户发裸 `.ko`；不要承诺「双击安装」；不要把 Canopus 目标包当成安装包。

#### 4.3.4 `capabilities.md`：能力

按「能碰什么」组织，而不是按源码目录：

| 能力域 | 能做什么 | 入口 |
| --- | --- | --- |
| UI | LVGL 对象树、Arc、三条渲染路径、借还缓冲 | `ui/lvgl`、`ui/arc`、`ui/patterns` |
| 设备 | 字符设备注册、`/dev/lra0` 等节点、ioctl | `advanced/addresses`、`frameworks/canopus` |
| 应用管理 | `packagemanager_api_s`、隐藏应用、启动器入口 | `advanced/app-hiding`、`advanced/control-center` |
| 系统 | 控制中心磁贴、`/data/rc.d`、shell | `advanced/control-center`、`loading` |
| 框架 | Canopus 加载器、Chaos 运行时 | `frameworks/*` |
| 限制 | 无符号导入、地址硬编码、无调试器、RAM only、固件绑定 | 本页表格 |

每个能力给：一句话、证据页、已验证机型、风险。

#### 4.3.5 其余原生页

- `develop/modules.md`：现有模块机制全文，补「先读 loading」。
- `develop/hello.md`：从 `probe/native/hello.ko` 出发，讲交叉编译、`ET_REL`、无未定义符号、入库、加载、验证。给完整命令。
- `ui/*`：现有 LVGL / Arc / patterns 迁移；`patterns` 从 refs 移入，补「三条渲染路径怎么选」。
- `frameworks/*`：Canopus、Chaos、Chaos 审计；审计页从 about 移入，标题改「Chaos 代码审计」。
- `advanced/*`：地址表、应用隐藏、控制中心；控制中心从 about 移入。
- `examples.md`：第一方示例索引（`probe/`、`installer/`、`watchfaces/fslist/`），与 `platform/reference/examples.md`（外部链接）明确区分。

---

## 5. 支撑板块

### 5.1 开始 `/start/`

- `index.md`：Vela 是什么、设备矩阵入口、三条路、文档怎么读（frontmatter 图例：status / models / verified）、安全须知。
- `choose-path.md`：三张卡片 + 决策树。

| 你想做 | 选 | 产出 | 安装方式 | 门槛 |
| --- | --- | --- | --- | --- |
| 换外观、加数据位 | 普通表盘 | 表盘包 | 表盘安装器 | 低 |
| 用脚本做交互界面 | Lua 表盘 | 表盘包 | 表盘安装器 | 中 |
| 做功能页、接健康/通知 | 快应用 | `.rpk` | 独立安装 | 中 |
| 碰内核、驱动、深度定制 | 原生应用 | `.ko` + Lua 表盘 | **随表盘安装** | 高 |

- `models.md`：保留矩阵，补「native 支持」列与「仅目标包」标注。
- `glossary.md`：保留；补「原生应用 / 原生模块」「表盘 / 表盘包」「普通表盘 / Lua 表盘」的区分。

### 5.2 平台与工具 `/platform/`

- `index.md`：说明这是横向资料层，做应用不必先读；四张卡：固件、协议、工具、参考。保留刷机风险警告。
- `firmware/*`：5 页原样迁移，只改链接。
- `protocol/*`：BLE、网络（TUN 缺失、TUN over BLE、手机代理）。
- `tools/*`：工具索引（从 refs/index 迁移）、模拟器、逆向。
- `reference/*`：外部参考、外部示例索引。

### 5.3 关于 `/about/`

- `index.md`：定位、非官方声明、许可、贡献方式、更新日志；移除 control-center 与 code-review 卡片（已移入原生）。
- `history.md`：保留「9 个误判」研究历程。

---

## 6. 全量迁移映射

> 所有移动用 `git mv`，保留历史。`[删]` 仅指删除空壳目录，不删内容。

| # | 现路径 | 新路径 | 动作 |
| --- | --- | --- | --- |
| 1 | `docs/index.md` | `docs/index.md` | 重写 |
| 2 | `docs/start/index.md` | `docs/start/index.md` | 重写 |
| 3 | `docs/start/models.md` | `docs/start/models.md` | 保留 |
| 4 | `docs/start/glossary.md` | `docs/start/glossary.md` | 保留 |
| 5 | `docs/apps/index.md` | `docs/start/choose-path.md` | 迁移 + 改写 |
| 6 | `docs/apps/quickapp/index.md` | `docs/quickapp/index.md` | 迁移 + 改写 |
| 7 | `docs/apps/quickapp/setup.md` | `docs/quickapp/setup.md` | 迁移 + 瘦身 |
| 8 | — | `docs/quickapp/structure.md` | 新建（从 setup 拆） |
| 9 | — | `docs/quickapp/capabilities.md` | 新建 |
| 10 | `docs/apps/quickapp/runtime.md` | `docs/quickapp/runtime.md` | 迁移 |
| 11 | — | `docs/quickapp/package.md` | 新建 |
| 12 | `docs/apps/quickapp/pitfalls.md` | `docs/quickapp/pitfalls.md` | 迁移 |
| 13 | `docs/apps/watchface/index.md` | `docs/watchface/index.md` | 重写 |
| 14 | — | `docs/watchface/normal/index.md` | 新建 |
| 15 | — | `docs/watchface/normal/package.md` | 新建 |
| 16 | — | `docs/watchface/lua/index.md` | 新建（吸收旧 index 的 Lua 部分） |
| 17 | — | `docs/watchface/lua/capabilities.md` | 新建 |
| 18 | — | `docs/watchface/lua/package.md` | 新建 |
| 19 | — | `docs/watchface/lua/develop.md` | 新建 |
| 20 | — | `docs/watchface/lua/examples.md` | 新建 |
| 21 | `docs/apps/watchface/package.md` | `docs/watchface/format.md` | 迁移 + 改写 |
| 22 | — | `docs/watchface/install.md` | 新建 |
| 23 | `docs/system/index.md` | `docs/platform/index.md` + `docs/native/index.md` | 拆分重写 |
| 24 | `docs/system/firmware/index.md` | `docs/platform/firmware/index.md` | 迁移 |
| 25 | `docs/system/firmware/package.md` | `docs/platform/firmware/package.md` | 迁移 |
| 26 | `docs/system/firmware/architecture.md` | `docs/platform/firmware/architecture.md` | 迁移 |
| 27 | `docs/system/firmware/filesystem.md` | `docs/platform/firmware/filesystem.md` | 迁移 |
| 28 | `docs/system/firmware/recovery.md` | `docs/platform/firmware/recovery.md` | 迁移 |
| 29 | `docs/system/native/index.md` | `docs/native/index.md` + `devices.md` + `loading.md` + `capabilities.md` | 拆分重写 |
| 30 | `docs/system/native/modules.md` | `docs/native/develop/modules.md` | 迁移 |
| 31 | — | `docs/native/develop/hello.md` | 新建（`probe/native`） |
| 32 | `docs/system/native/lvgl.md` | `docs/native/ui/lvgl.md` | 迁移 |
| 33 | `docs/system/native/arc.md` | `docs/native/ui/arc.md` | 迁移 |
| 34 | `docs/refs/patterns.md` | `docs/native/ui/patterns.md` | 迁移 |
| 35 | `docs/system/native/canopus.md` | `docs/native/frameworks/canopus.md` | 迁移 |
| 36 | `docs/system/native/chaos.md` | `docs/native/frameworks/chaos.md` | 迁移 |
| 37 | `docs/about/code-review.md` | `docs/native/frameworks/chaos-review.md` | 迁移 |
| 38 | `docs/system/native/app-hiding.md` | `docs/native/advanced/app-hiding.md` | 迁移 |
| 39 | `docs/system/native/addresses.md` | `docs/native/advanced/addresses.md` | 迁移 |
| 40 | `docs/about/control-center.md` | `docs/native/advanced/control-center.md` | 迁移 |
| 41 | — | `docs/native/examples.md` | 新建 |
| 42 | `docs/refs/index.md` | `docs/platform/tools/index.md` | 迁移 + 改写 |
| 43 | `docs/refs/ble.md` | `docs/platform/protocol/ble.md` | 迁移 |
| 44 | `docs/refs/network.md` | `docs/platform/protocol/network.md` | 迁移 |
| 45 | `docs/refs/emulator.md` | `docs/platform/tools/emulator.md` | 迁移 |
| 46 | `docs/refs/reversing.md` | `docs/platform/tools/reversing.md` | 迁移 |
| 47 | `docs/refs/references.md` | `docs/platform/reference/references.md` | 迁移 |
| 48 | `docs/refs/examples.md` | `docs/platform/reference/examples.md` | 迁移 |
| 49 | `docs/about/index.md` | `docs/about/index.md` | 重写 |
| 50 | `docs/about/history.md` | `docs/about/history.md` | 保留 |
| 51 | `docs/en/index.md` | `docs/en/index.md` | 更新链接与站名 |
| 52-55 | `docs/en/start/*` | 同路径 | 保留，只修链接 |

搬迁后删除空目录：`docs/apps/quickapp/`、`docs/apps/watchface/`、`docs/apps/`、`docs/system/firmware/`、`docs/system/native/`、`docs/system/`、`docs/refs/`。不要删除 `docs/en/start/`。

---

## 7. 新增/重写页面清单（含素材与证据状态）

| 页面 | 必须回答 | 主要素材 | 证据状态 |
| --- | --- | --- | --- |
| `start/choose-path.md` | 三条路怎么选 | 旧 `apps/index.md` | tested（结构） |
| `watchface/index.md` | 表盘是什么、两条线怎么选 | 旧 watchface index | tested |
| `watchface/normal/index.md` | 普通表盘概念、能力、与 Lua 区别 | **待补样本** | unverified |
| `watchface/normal/package.md` | 普通表盘怎么打包 | 官方工具 / Mi8WfBinTool | unverified |
| `watchface/lua/index.md` | Lua 表盘是什么、最小结构 | `installer/`、`watchfaces/fslist/` | tested |
| `watchface/lua/capabilities.md` | 能做什么、不能做什么 | `installer/README`、`probe/lua` | tested（部分待补） |
| `watchface/lua/package.md` | 怎么打出可安装包 | 旧 `package.md`、`p67build.cjs` | tested |
| `watchface/lua/develop.md` | 怎么开发调试 | `fslist/README`、`tools/smoke.lua` | tested |
| `watchface/lua/examples.md` | 有哪些例子 | `fslist`、`probe/lua`、`installer` | tested |
| `watchface/format.md` | 容器字节长什么样 | 旧 `package.md` | tested |
| `watchface/install.md` | 怎么装、怎么救 | 社区工具、recovery | sourced |
| `quickapp/index.md` | 快应用是什么、边界 | 旧 index | tested |
| `quickapp/structure.md` | 工程怎么组织 | 旧 setup | tested |
| `quickapp/capabilities.md` | API 能做什么 | 旧 index、官方文档 | sourced |
| `quickapp/package.md` | 怎么打包安装 | 官方 IDE | sourced |
| `native/index.md` | 原生是什么、与快应用区别 | 旧 native index + installer | tested |
| `native/devices.md` | 哪些设备能跑 | modlib 证据 + Canopus 包 | tested（10 Pro）/ unverified（其余） |
| `native/loading.md` | **配合 Lua 表盘安装** | `installer/README` | tested（10 Pro） |
| `native/capabilities.md` | 能碰什么 | 旧 native 各页 | tested |
| `native/develop/hello.md` | 最小模块怎么跑通 | `probe/native` | tested |
| `native/examples.md` | 第一方示例在哪 | `probe/`、`installer/`、`watchfaces/` | tested |
| `platform/index.md` | 平台层是什么 | 旧 system index | tested |
| `platform/tools/index.md` | 工具有哪些 | 旧 refs index | tested |

新增页 frontmatter 全部按 `scripts/check-frontmatter.ts` 补齐：`title`、`models`、`firmware`、`verified`、`status`、`source`（非 tested 必填）、`contributors`。

---

## 8. 内容与写作规则

1. **不虚构**：没有样本的格式、没有验证的机型、没有证据的 API，一律 `status: unverified`，正文写「待核实」，不写猜测的偏移量。
2. **一个事实只写一处**：容器格式只在 `format.md`；设备支持只在 `devices.md`；加载步骤只在 `loading.md`；其他页链接过去。
3. **每个板块 index 固定五段**：一句话定义 / 能做什么 / 不能做什么 / 页面地图 / 前置与风险。
4. **风险页首屏警告**：原生应用、刷机、Lua shell 能力，用 `::: warning` 放在第一屏。
5. **术语统一**：
   - 「原生应用」= 用户可感知的 `.ko` 应用；「原生模块」= 技术形态；标题用前者，技术细节可用后者。
   - 「表盘」= 用户看到的东西；「表盘包」= 安装文件。
   - 「普通表盘」与「Lua 表盘」并列；不要用「简单表盘」。
6. **状态徽章**：沿用 `StatusBadge`；页面顶部显示 tested / sourced / unverified，读者一眼知道可信度。
7. **链接优先内链**：外部链接集中登记在 `platform/reference/references.md`；正文只允许链「官方文档」和「一手来源」，并且同一 URL 只出现一次。
8. **保留研究痕迹**：`about/history.md` 的误判记录不删；它是这个站可信度的一部分。
9. **中文标点**：正文用全角标点；代码、路径、命令用半角。
10. **官方优先**：快应用的教程、组件、JS 接口、工具步骤直接链官方；表盘没有公开官方文档，站内资料为主，但官方工具入口必须给。官方能回答的，不抄；官方没回答的，才展开写。

---

## 9. 导航、URL 与旧链接

### 9.1 `config.ts` 改造

```ts
themeConfig: {
  nav: [
    { text: '开始', link: '/start/', activeMatch: '^/start/' },
    { text: '表盘', link: '/watchface/', activeMatch: '^/watchface/' },
    { text: '快应用', link: '/quickapp/', activeMatch: '^/quickapp/' },
    { text: '原生应用', link: '/native/', activeMatch: '^/native/' },
    { text: '平台与工具', link: '/platform/', activeMatch: '^/platform/' },
    { text: '关于', link: '/about/', activeMatch: '^/about/' },
  ],
  sidebar: {
    '/start/': [/* ... */],
    '/watchface/': [/* ... */],
    '/quickapp/': [/* ... */],
    '/native/': [/* 分组：入门 / 开发 / 界面 / 框架 / 进阶 / 示例 */],
    '/platform/': [/* 分组：固件 / 协议 / 工具 / 参考 */],
    '/about/': [/* ... */],
  },
}
```

要点：

- 用**多 sidebar 对象**替代单一全局数组；每个板块只看到自己的目录，侧栏长度从 30+ 项降到 8-15 项。
- `nav` 的 `activeMatch` 必须写，否则子页高亮会丢。
- 首页 `features` 用三张主卡（表盘 / 快应用 / 原生应用），下面再用自定义区块放「平台与工具」四张卡。
- 保留 local search、`outline: [2,3]`、footer 免责声明。

### 9.2 旧 URL 映射

VitePress 的 `cleanUrls: true` 下旧地址会 404。建议在主题层做客户端跳转（不引入服务端）：

| 旧 URL | 新 URL |
| --- | --- |
| `/apps/` | `/start/choose-path` |
| `/apps/quickapp/` | `/quickapp/` |
| `/apps/quickapp/setup` | `/quickapp/setup` |
| `/apps/quickapp/runtime` | `/quickapp/runtime` |
| `/apps/quickapp/pitfalls` | `/quickapp/pitfalls` |
| `/apps/watchface/` | `/watchface/` |
| `/apps/watchface/package` | `/watchface/format` |
| `/system/` | `/platform/` |
| `/system/firmware/` | `/platform/firmware/` |
| `/system/firmware/package` | `/platform/firmware/package` |
| `/system/firmware/architecture` | `/platform/firmware/architecture` |
| `/system/firmware/filesystem` | `/platform/firmware/filesystem` |
| `/system/firmware/recovery` | `/platform/firmware/recovery` |
| `/system/native/` | `/native/` |
| `/system/native/modules` | `/native/develop/modules` |
| `/system/native/canopus` | `/native/frameworks/canopus` |
| `/system/native/chaos` | `/native/frameworks/chaos` |
| `/system/native/lvgl` | `/native/ui/lvgl` |
| `/system/native/arc` | `/native/ui/arc` |
| `/system/native/app-hiding` | `/native/advanced/app-hiding` |
| `/system/native/addresses` | `/native/advanced/addresses` |
| `/refs/` | `/platform/tools/` |
| `/refs/ble` | `/platform/protocol/ble` |
| `/refs/network` | `/platform/protocol/network` |
| `/refs/emulator` | `/platform/tools/emulator` |
| `/refs/reversing` | `/platform/tools/reversing` |
| `/refs/patterns` | `/native/ui/patterns` |
| `/refs/references` | `/platform/reference/references` |
| `/refs/examples` | `/platform/reference/examples` |
| `/about/control-center` | `/native/advanced/control-center` |
| `/about/code-review` | `/native/frameworks/chaos-review` |

实现方式二选一，执行前用最小 demo 验证：

- **A（推荐）**：主题 `Layout` 覆盖 `not-found` 插槽，读 `location.pathname`，命中映射则 `location.replace`；未命中显示正常 404。
- **B**：为每个旧路径生成一个极简 md 存根，frontmatter 齐全，正文只放跳转说明 + 链接。缺点：页面数膨胀，且 `check-frontmatter` 要过。

无论哪种，都要在 `docs/.vitepress/theme/index.ts` 的 `Layout` 里接入，并确认 404 在 base `/miband-dev/` 下取路径时去掉 base 前缀。

### 9.3 站内链接大扫除

搬迁后全站搜索并替换：

- `](/apps/`、`](/system/`、`](/refs/`、`](/about/control-center`、`](/about/code-review`
- 相对链接 `../quickapp/`、`../../system/` 等
- `research/README.md` 的 18 条旧路径映射
- `probe/README.md` 的 `../../docs/system/native/addresses.md`
- `installer/README.md` 与 `watchfaces/fslist/README.md` 中的 docs 链接
- `README.md`、`CONTRIBUTING.md` 的目录树与分类表
- `docs/en/**` 指向中文旧路径的链接
- `.github/workflows/link-check.yml`（lychee 会查本地链接）

建议写一个一次性脚本 `scripts/check-links.mjs`：扫描 `docs/**/*.md` 的站内绝对链接，按 `cleanUrls` 规则映射到文件，输出断链清单。CI 里可以先 warn，稳定后转 error。

### 9.4 英文站

- 本次不扩译，保留 `docs/en/` 现有 4 页。
- 更新 `docs/en/index.md` 的站名与三大板块链接；暂时链到中文对应页并在页首标注「English translation in progress」。
- `config.ts` 的 `locales.en` 只保留 Start 侧栏，避免出现空侧栏。

---

## 10. 代码资产与仓库调整

### 10.1 先入库

`installer/` 与 `probe/` 目前是 untracked，CI 构建与线上文档链接都会缺文件。执行重构前先：

```bash
git add installer probe
git commit -m "chore: track native installer and probe examples"
```

否则 `native/loading.md`、`native/develop/hello.md`、`native/examples.md` 的链接在 GitHub 上全是 404。

### 10.2 资产与文档的对应

| 资产 | 用途 | 文档入口 |
| --- | --- | --- |
| `installer/` | Lua 表盘安装器，部署 `.ko` | `native/loading`、`watchface/lua/examples` |
| `probe/native/` | 最小 `.ko` + LRA 探针 | `native/develop/hello`、`native/examples` |
| `probe/lua/` | 只读 Lua 探针 | `watchface/lua/examples` |
| `watchfaces/fslist/` | 文件清单表盘 | `watchface/lua/examples` |

### 10.3 是否移动代码目录

建议**本次不动**：`installer/`、`probe/`、`watchfaces/` 的构建脚本里有相对路径，移动会牵连 README、CI 和文档链接。等文档稳定后，再考虑统一到 `examples/`。本次只做「入库 + 文档链接 + README 路径修正」。

### 10.4 站点元数据

- `docs/.vitepress/config.ts`：title / siteTitle / description / nav / sidebar / footer / social links。
- `docs/.vitepress/data/models.json`：可选补 `band11`、`band9pro`、`p65`；若补，需同步 `check-frontmatter.ts` 的 enum 与 `ModelMatrix` 组件。**非必需**，可在设备页正文用表格表达。
- `docs/platform/reference/references.md`：新增「官方文档」分组，登记快应用 6 个官方入口（教程 / 组件 / JS 接口 / 工具 / 示例 / 澎湃OS 平台）+ 官方表盘工具入口（待补）；站内页面只引用这里，避免 URL 散落。
- `README.md`：站名、五段式介绍改为六段、目录树、部署说明。
- `CONTRIBUTING.md`：分类轴从「用途」细化为「应用形态优先、平台资料其次」；更新目录表与新增页面清单。
- `research/README.md`：18 条映射全部改新路径。

---

## 11. 执行阶段

> 预估 3.5–4 人日；单人执行建议分 6 个 PR，保证每步可构建、可回滚。

### Phase 0 · 基线与资产（0.25 天）

- 拉分支 `refactor/docs-ia`。
- 记录基线：`pnpm check:frontmatter`、`pnpm docs:build` 通过；保存当前页面清单。
- 提交 `installer/`、`probe/`。
- 产出旧 URL → 新 URL 映射表（本文 §9.2）。
- 运行一次全站链接扫描，记录现有断链。

### Phase 1 · 目录骨架（0.5 天）

- 按 §3.2 建目录，`git mv` 所有可迁移页面。
- 新页先放最小骨架（frontmatter + 标题 + TODO），保证构建通过。
- 删除空目录。
- 此阶段不改内容，只改路径与链接，PR 尽量小。

### Phase 2 · 三大板块内容（1.5 天）

1. 表盘：`index`、`normal/*`、`lua/*`、`format`、`install`。
2. 快应用：`index`、`structure`、`capabilities`、`package`，`setup` 瘦身。
3. 原生：`index`、`devices`、`loading`、`capabilities`，`hello`、`examples`。

先写「原生加载方式」和「普通表盘定义」这两块硬骨头；它们决定其余页面怎么链接。

### Phase 3 · 支撑板块（0.5 天）

- `start/*`：导读、choose-path、models 补列、glossary 补词。
- `platform/*`：index、tools index、firmware 链接。
- `about/*`：重写 index，移除已迁走的卡片。

### Phase 4 · 品牌与导航（0.25 天）

- 改站名、标语、description、footer。
- 重写首页 hero、三张主卡、平台入口、机型矩阵。
- `config.ts` 多 sidebar + nav activeMatch。
- 更新 README、CONTRIBUTING、research/README。

### Phase 5 · 兼容与 QA（0.5 天）

- 接入 404 映射并逐条手测。
- 全站链接扫描；修 `probe/`、`installer/`、`watchfaces/` 的旧路径。
- `pnpm check:frontmatter`、`pnpm docs:build`。
- 本地 `pnpm docs:preview` 走查：桌面 + 移动、搜索、侧栏、上一页/下一页、英文站。
- 检查首页在 base `/miband-dev/` 下的资源路径。
- 抽查 10 个页面的 frontmatter 与状态徽章。

### Phase 6 · 发布（0.25 天）

- PR 描述附「旧 URL → 新 URL」表与截图。
- 合并到 main，等 deploy workflow。
- 线上抽查 10 条旧 URL 跳转、搜索关键词（表盘、Lua、insmod、快应用、10 Pro）。
- 在 about/changelog 记录本次重构。

---

## 12. 验收标准

- [ ] `pnpm check:frontmatter` 通过，所有新页 frontmatter 完整。
- [ ] `pnpm docs:build` 零错误，无死链警告。
- [ ] 一级导航 6 项，每项都有独立 sidebar，移动端可展开。
- [ ] 表盘板块具备：介绍、普通表盘介绍/打包、Lua 表盘介绍/能力/打包。
- [ ] 快应用板块具备：介绍、能力、打包。
- [ ] 原生应用板块具备：介绍（含与快应用区别）、支持的设备、加载方式（首屏写明「配合 Lua 表盘安装」）、能力。
- [ ] `native/loading` 的安装链路与 `installer/README.md` 一致，命令可复现。
- [ ] `native/devices` 明确区分「已证实」与「仅有目标包」，不误导。
- [ ] 普通表盘页不出现无来源的字节偏移；无资料处标 `unverified`。
- [ ] 旧 URL 至少覆盖 §9.2 全部条目，跳转正确。
- [ ] 全站无 `/apps/`、`/system/`、`/refs/` 残留链接。
- [ ] 首页、README、CONTRIBUTING、research/README 的站名与目录树一致。
- [ ] 英文站可访问，链接不指向已删除路径。
- [ ] `installer/`、`probe/` 已在仓库中，文档链接在 GitHub 上可点开。

---

## 13. 风险与待确认

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| **普通表盘无一手资料** | 可能写不出可信的「介绍 + 打包」 | 先找官方工具产出的样本，用 `tools/facebuild.js inspect` 验证；无样本则页面标 `unverified`，只写概念与工具入口，不编字节结构 |
| **原生支持机型被高估** | 读者按文档操作变砖 | `devices.md` 严格分「已证实 / 仅有目标包 / 未知」；10 Pro 之外一律写「未验证」 |
| **加载方式细节不足** | 「配合 Lua 表盘安装」写不实 | 以 `installer/README.md` 为准，逐命令复现；Canopus 内部机制单独放框架页 |
| **旧 URL 断链** | 外部引用与搜索引擎失效 | 404 映射 + 全站链接扫描 + 线上抽查 |
| **内容搬迁工作量大** | 重构拖长 | 先搬后改；Phase 1 只动路径，内容在 Phase 2/3 分板块重写 |
| **frontmatter 校验挡住新页** | 构建失败 | 新页模板统一带 7 个字段；CI 先跑 `check:frontmatter` |
| **英文站与中文站分叉** | 维护成本 | 本次只修链接，不扩译；在 en 首页标注翻译进度 |
| **站点名/标语反复** | 返工 | 先拍板 §1，再进 Phase 4 |

### 关于「普通表盘」的定义（必须先解决）

现有仓库只证明了两种 **Lua** 容器（p67 与 8 Pro `.face`），没有任何「不含 Lua 的普通表盘」样本。动笔前需要确认：

1. 「普通表盘」是否指官方表盘制作工具产出的、不含 `lua/` 条目的表盘？
2. 它和 Lua 表盘是否共用同一容器，只是资源类型不同？
3. 官方工具能否导出可分析的样本？

**建议**：先按「不使用 Lua 脚本、以资源与布局为主」写概念页；找到样本后再补格式与打包细节。找不到就保持 `unverified`，并在页面顶部说明「本节等待一手样本」。这比编造偏移量诚实，也更符合这个站现有的「误判记录」气质。

---

## 14. 需要你拍板

**已定**：标语 `探索 Vela 的每一分潜力`；快应用优先链官方文档，表盘给官方工具入口、正文以站内实测为主。

1. **一级导航**：保留「开始」做 6 项，还是去掉「开始」做 5 项（表盘 / 快应用 / 原生应用 / 平台与工具 / 关于）？去掉的话，首页承担三选一，机型矩阵与术语表移到「平台与工具」。
2. **「普通表盘」**：先建「概念 + 待核实」占位页，还是等你提供官方工具样本后再建？
3. **旧 URL**：用客户端 404 映射（推荐，页面不膨胀），还是保留 md 跳转存根？
4. **官方表盘文档**：你有公开链接吗？我只检索到官方工具/表盘市场入口，没找到公开的官方表盘开发文档；有的话我加进 `platform/reference/references.md`。

确认后我从 Phase 0 开始执行，先交「目录骨架 + 导航」这个可构建的最小 PR。
