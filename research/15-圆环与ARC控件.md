# 15 · 圆环与 ARC 控件

## 本文讲什么

Chaos 主页与调试页的圆环都建立在固件自带的 `lv_arc` 上。这篇文章把**反汇编已经证实的**字段语义、绘制顺序、角度 setter、配色来源整理成一份可直接对照代码的参考，并给出 Chaos 侧当前实现、已知坑和调试页验证矩阵。

证据分两级，全文按级别标注：

- **已证实**：由固件字节 + 指令直接推出（`analysis/arc-disasm.zh.md`、`analysis/ap-arc-theme.zh.md`）。
- **推断**：依赖上游 LVGL v9.1 约定、结构相似性或未解析的运行时跳板。

两份原始分析（逐指令级）保留在 `analysis/`，本文只做汇总与落地，细节以原文为准。

---

## 1. 证据来源与边界

| 来源 | 覆盖范围 | 说明 |
|---|---|---|
| 运行时 dump | `0x1C060000–0x1C0804FF` | 有效区间；`0x1C080500` 起全 0。VA = 文件偏移 + `0x1BFB2BC0` |
| `analysis/arc-disasm.zh.md` | `lv_arc` 模块 `0x1C063D0C–0x1C0655C0` | capstone 逐指令，**arc 语义的权威依据** |
| `analysis/ap-arc-theme.zh.md` | 主题初始化 `0x1C061694`、arc 构建器 | 默认配色、同固件内原生 arc 用法样本 |
| Ghidra 全量反编译 | `analysis/fw-decompiled.jsonl`（14,550 函数） | 可用于快速查旁证函数；**arc 构造函数 `0x1C064068` 与绘制函数 `0x1C064642` 没被识别成独立函数**，查不到不等于不存在 |

> 注意：`lv_draw_arc`、`lv_obj_init_draw_arc_dsc`、`lv_map`、`lv_obj_invalidate` 等核心库函数在基址以下，dump 里只有 4 字节 veneer，其行为按上游 v9.1 源码陈述，属**推断**级。

固件是 LVGL **v9.1 时代**：绘制分发入口是事件码 24（`LV_EVENT_DRAW_MAIN`），与 v9.2（26）不符。

---

## 2. 对象布局

`lv_arc` 对象在对象头之后从 `+0x34` 起是 arc 私有字段：

| 偏移 | 类型 | 名称 | 写入者 | 绘制/逻辑读取者 |
|---|---|---|---|---|
| `+0x34` | i32 | `rotation` | ctor(=0)、`set_rotation` | draw（加到**每一条**弧的角度上）、knob area |
| `+0x38` | f32 | `indic_angle_start` | ctor、`set_start_angle` | draw（INDICATOR 起点） |
| `+0x3C` | f32 | `indic_angle_end` | ctor、`set_end_angle` | draw（INDICATOR 终点）、get_knob_area |
| `+0x40` | f32 | `bg_angle_start` | ctor、`set_bg_angles` | draw（**MAIN** 起点） |
| `+0x44` | f32 | `bg_angle_end` | ctor、`set_bg_angles` | draw（**MAIN** 终点） |
| `+0x48` | i32 | `value` | ctor(-32768)、`set_value` | value→角度映射 |
| `+0x4C` | i32 | `min` | ctor、`set_range` | 映射区间 |
| `+0x50` | i32 | `max` | ctor、`set_range` | 映射区间 |
| `+0x54` | u32 | `type/mode` + 交互位 | ctor(0x08)、`set_mode` | knob area、value 映射分支 |
| `+0x60` | f32 | `last_angle` | ctor、`set_value`/`value_update` | knob/动画 |
| `+0x64` | i16 | `knob_offset` | dump 内无写入 | get_knob_area |

**一句话**：灰色/主色轨迹是 **MAIN = `+0x40/+0x44`**，彩色进度是 **INDICATOR = `+0x38/+0x3C`**；`value` 只驱动 INDICATOR，永远不改 MAIN。

---

## 3. 绘制顺序（`lv_arc_draw` `0x1C064642`）

事件 `LV_EVENT_DRAW_MAIN`（码 24）触发，依次：

1. 算圆心/半径（`get_center_radius` `0x1C063D7C`）；
2. **MAIN**：`dsc->start = +0x40 + rotation`、`dsc->end = +0x44 + rotation`，`radius = arc_r`，`lv_draw_arc`；
3. **INDICATOR**：先按 part 的四条 pad 把半径收到 `arc_r - max(pad)`，**≤0 就整段跳过**；`dsc->start = +0x38 + rotation`、`dsc->end = +0x3C + rotation`；
4. **KNOB**：`get_knob_area`（`0x1C063EE0`）按 type 选角（NORMAL 读 `+0x3C`、REVERSE 读 `+0x38`、SYMMETRICAL 取背景/指示两条角的中点），再按 KNOB part 的 style 属性外扩，画一个矩形。

关键推论：

- draw **不做角度归一化**，数值原样进 `lv_draw_arc`；渲染器对每个角最多减一次 360，并特判 `end == start + 360` → **完整圆环**。
- `+0x34` rotation 非 0 会让两条弧整体平移，Chaos 必须保持 0。
- 绘制是**事件驱动**的：写字段只是改数据，**不 invalidate 就不会重绘**。
- 把整数写进 f32 字段（例如把 90 当 i32 写）只会得到 ≈1e-43 的非规格化浮点数，弧缩成一点或不可见。

---

## 4. 角度 setter

| 地址 | 函数 | 行为 |
|---|---|---|
| `0x1C0641EC` | `set_start_angle` | 归一化、算新旧跨度、invalidate 旧/新 knob 区、写 `+0x38` |
| `0x1C064334` | `set_end_angle` | 同上，写 `+0x3C` |
| `0x1C064F0C` | `set_bg_angles` | 写 `+0x40/+0x44`，第 4 参是 part selector（dump 内唯一调用者传 0） |
| `0x1C0650A0` | `set_rotation` | 写 `+0x34` + `lv_obj_invalidate` |
| `0x1C065154` | `set_value` | clamp 到 `[min,max]`，`-32768` 视为“未设置”，按 mode 重算 INDICATOR 角 |
| `0x1C0652D4` | `set_range` | 写 `+0x4C/+0x50`，重算 |

> 旧资料里把 `0x1C0650A0` 叫 `set_value`、把 `+0x48` 当 int16，均已推翻。`set_value` 会**覆盖** `+0x38/+0x3C`；而 `+0x40/+0x44`（MAIN）不受它影响。

---

## 5. value → 角度（只动 INDICATOR）

`w = lv_map(value, min, max, bg_start, bg_end + (bg_end < bg_start ? 360 : 0))`，然后按 mode：

- NORMAL：`indic_start = bg_start`，`indic_end = w`
- REVERSE：`indic_start = w`，`indic_end = bg_end`
- SYMMETRICAL：两条 indicator 角先置为背景弧中点，再围绕中点重映射

所以只写 `value` 永远动不了 MAIN；反过来，只要不调用 `set_value/set_range/set_mode`，手写的 `+0x38/+0x3C` 就不会被覆盖。

---

## 6. 颜色与样式

颜色**不在 arc 对象里**，在按 part 挂接的 `lv_style_t` 中：

| 属性 id | 含义 |
|---|---|
| `0x1D` (29) | **BG_OPA**（矩形填充不透明度；KNOB 是圆角矩形，靠它决定看不看得见） |
| `0x50` | ARC_WIDTH |
| `0x51` | ARC_ROUNDED |
| `0x52` | **ARC_COLOR** |
| `0x53` | ARC_OPA |
| `0x54` | ARC_IMAGE_SRC |

**⚠️ 2026-10-22 更正：`0x0C107791` 不是样式派发器，禁止调用。**

`docs/地址表.csv` 把 `0xC107790` 标成 `lv_obj_set_local_style_prop`（Canopus 3.101.043，STATIC_RECOVERED），
但本固件从 `0xC107780` 起的真实代码是：

```
c107780  push {r7, lr}
c107784  cbz  r0, err          ; obj 判空
c107786  cbz  r1, err          ; 参数判空
c107788  ldr  r3, [r1, #0x10]
c10778e  ldr  r3, [r3, #4]
c107790  ldr  r3, [r3, #0x1c]  ; ← 把第 4 个参数(selector)当指针解引用
c107794  blx  r3               ; 再跳过去
```

按 4 参数原型调用时，`selector`（MAIN=0）落进 `r3`，于是在地址 `0x1C` 上取指 → **HardFault → 黑屏重启**。
p67 实机已复现（§11 第三版）。同理 `lv_obj_set_style_bg_opa = 0xC108374` 也落在函数中间（`beq` 指令上），不可用。
结论：**本固件没有可靠的 obj 级样式入口**，Chaos 侧一律只写 arc 对象内的角度字段。

想要“非灰色弧”只剩一条路：**用 INDICATOR**——它的主题主色就是蓝 `#2196F3`，写 `+0x38/+0x3C` 即可。
代价是 KNOB 仍会画在 INDICATOR 末端（消掉必须写样式，当前不可用）。

本固件 stock 主题（`0x1C061694`，暗色）：

- MAIN / INDICATOR 都挂 style A：`arc_color = #2F3237`（`theme+0x39..0x3B` = `37 32 2F`）、动态宽度、`rounded = 1`；
- INDICATOR 额外挂 style B：`arc_color = 主题主色`（`#2196F3`，`lv_palette_main(LV_PALETTE_BLUE)`，**推断**级，来自上游调色板约定）；
- KNOB 挂 style C（`theme+0x1B4`）。**KNOB 每帧都会被绘制**，这就是圆环末端出现“圆点”的结构性来源——除非该 part 的样式把尺寸/不透明度做成不可见。

全 dump 只有三处调用 `lv_style_set_arc_color`，没有应用级 arc 配色。因此默认观感是**灰轨道 + 主色进度**。

---

## 7. Chaos 侧实现

代码：`projects/chaos/supervisor/src/fw_api/gfx.rs`。

| 函数 | 作用 |
|---|---|
| `arc_create(parent)` | 调固件 `lv_arc_create`（`0x1C0641D1`） |
| `arc_set_main_angles(arc, start, end)` | 写 `+0x34=0`、`+0x40=start`、`+0x44=end`，再 `lv_obj_invalidate` |
| `arc_set_indic_angles(arc, start, end)` | 写 `+0x34=0`、`+0x38=start`、`+0x3C=end`，再 `lv_obj_invalidate` |
| `arc_set_progress(arc, pct)` | **清 MAIN** + INDICATOR 从 90° 起画 `pct%`；`pct=100` → `90..450` 命中整圈特例 |
| `arc_set_bg_full(arc)` | 清 INDICATOR + MAIN `0..360`（主题默认灰），作底环用 |
| `arc_clear_main(arc)` | MAIN `0..0`（start==end 时 draw 直接返回） |
| `arc_clear_indicator(arc)` | INDICATOR `0..0`，消掉构造函数默认的蓝弧 `135..270` |
| `arc_make_full(arc)` | 清 INDICATOR + MAIN `90..450` 整圈 |
| `arc_disable_input(arc)` | 清 `CLICKABLE`，避免手势把环拖大拖小 |

> 已删除：`style_set` / `arc_set_color` / `arc_set_width` / `arc_hide_knob`（全部依赖 `0x0C107791`，会崩）。
> 颜色改为吃主题默认值：MAIN 灰 `#2F3237`、INDICATOR 蓝 `#2196F3`。KNOB 暂时无法消除。

调试页（关于页连点 5 下版本号）当前 4 个环，2×2 验证矩阵：

| 环 | 配置 | 验证目的 |
|---|---|---|
| A | 灰底环（独立 arc，MAIN `0..360`）+ 另一 arc 的 INDICATOR `90..180` | 双层叠放 + INDICATOR 是否真的是蓝的 |
| B | 灰底环 + INDICATOR `90..360`（75%） | 跨度 >180° 的补角路径 |
| C | 只 INDICATOR `90..450`，不叠底环 | `end == start+360` 整圈特例 |
| D | **一个字段都不写**（构造函数默认值） | 对照组：默认 MAIN 灰 `135..45` + INDICATOR 蓝 `135..270` |
| 全部 | 只 `arc_disable_input` | 无样式调用，确认不再重启 |

> 上一版调试页（`aa5d381`）是 A 25% / B 75% / C 100% / D 主题默认，四环都没有底环、都被画上 KNOB，
> 真机表现见 §11。

> 颜色曾走固件 `0x0C5882E1(obj, rgb, part)`；该地址经查落在 `0xC588224` 函数中间，**并非**颜色 setter，
> 此前“真机能改色”的判断不可靠——看到的蓝很可能一直是 INDICATOR 的主题蓝。


---

## 8. 症状对照表

| 症状 | 原因 | 对应条目 |
|---|---|---|
| 写了角度，画面完全不变 | 没 invalidate | §3 |
| 弧缩成一点/消失 | 整数写进 f32 字段 | §3 |
| 改 `+0x38/+0x3C` 动不了看到的那条弧 | 看到的是 MAIN（`+0x40/+0x44`） | §2 |
| 角度对但完全看不见 | INDICATOR 半径被 pad 收成 ≤0，或 width/opa 为 0 | §3 |
| 改完过一帧又变回去 | `set_value/set_range/set_mode` 重算了 INDICATOR | §5 |
| 满蓝环 + 圆点乱跑 | 把 INDICATOR 写成 `0..360`（整圈），KNOB 跟着 `+0x3C` 跑到 0° | §3、§6 |
| 起点偏、超过 75% 形态异常 | rotation 非 0；或结束角 >360 走了绕 0° 补角路径 | §3 |
| 只想画进度，底下却没有灰轨道 | 一个 arc 只有一条 MAIN 弧，进度和 track 必须拆成两个对象叠放 | §7 |
| 四个环末端在正上方各有一个圆点 | KNOB 画在 INDICATOR 末端；默认 `+0x3C = 270°` = 正上方 | §6、§11 |
| 什么都不设，环是 75% 且缺口朝下 | 构造函数默认 MAIN `135..45`（270° 跨度），缺口正对 6 点钟 | §2、§11 |
| 25% 的进度看起来是半环（180°） | MAIN `90..180` 与构造函数默认 INDICATOR `135..270`（同样是蓝色）拼在一起 | §5、§11 |

---

## 9. 未解问题

1. **KNOB 隐藏是否真的生效**：配方（`BG_OPA(KNOB)=0` + `ARC_WIDTH(KNOB)=0`）已被本机 `aa5d381` 之后的一版真机验证覆盖，结论待回填。
2. **官方电池页参数**：页面由数据/脚本层构建，字符串与资源里都没找到，暂不可复刻为“官方值”。
3. **`0x0C5882E1` 的准确符号**：影响颜色函数是否真的写 ARC_COLOR；新代码已改走 `0x0C107791`，该地址只作历史参考。
4. **Ghidra 结果缺口**：`0x1C064068` / `0x1C064642` 缺失；如需重新反编译，应先修正函数识别（这两个函数在 chunk 边界附近）。
5. **底环/进度用几个对象**：当前是「track 一个 arc + 进度一个 arc」；若后续发现 arc 的 MAIN 与 INDICATOR 可分别承载（`lv_arc_set_bg_angles` + 手写 `+0x38/+0x3C`），可省一半对象。未验证。

---

## 10. 复现

- 逐指令分析：`analysis/arc-disasm.zh.md`
- 主题与配色：`analysis/ap-arc-theme.zh.md`
- 全量伪代码查询：`analysis/fw-decompiled.jsonl`（每行 `va/name/size/c`）
- 函数索引：`analysis/fw-decompiled-index.csv`

---

## 11. 真机验证记录

按时间顺序，全部为 p67 / 3.101.043 实机肉眼观察，用作语义的最终裁决。

### 2026-10-22 · 第一版（`aa5d381`）：A 25% / B 75% / C 100% / D 不设角度

用户观察：

- **A**：蓝色半环（25% 弧只有 90°，正视看像“半环”是描述习惯），**看不到底环**；
- **B**：75% 蓝环，**看不到底环**；
- **C**：整环；
- **D**：灰环占 3/4（270°），**缺口朝下（正 6 点钟）**；
- 四个环**末端/顶部都有圆点**，且都在**正上方**。

判定：

1. `end == start + 360` 整圈特例**成立**（C 是完整圆环）。
2. 四环圆点位置一致且在正上方 = **KNOB 画在 INDICATOR 末端**，默认 `+0x3C = 270°`（LVGL 0° 在 3 点钟、顺时针，270° 即 12 点钟）；四环都没碰 INDICATOR，所以点永远在同一个地方。
3. D 的“75% + 缺口朝下”反过来**证实了构造函数默认值**：MAIN `135..45`（跨度 270°），缺口是 `45..135`，中心正对 90° = 6 点钟。与 `analysis/arc-disasm.zh.md` §3 吻合。
4. A/B 没有底环是**设计如此**，不是 bug：一个 arc 只有一条 MAIN 弧，进度弧会把整条 MAIN 占掉；要灰轨道就得再加一个整圈 arc 叠在下面。

据此的改动：加 `style_set`/`arc_set_width`/`arc_hide_knob`，调试页改成 track + progress 两层结构（§7）。

### 2026-10-22 · 第二版（`5b2cd35` 之前）补充：A 的“半环”其实是 180°

用户补充：A 那条蓝弧是 **50%（180°）**，不是 25% 的 90°。按几何算得通：

- 我们只写了 MAIN = `90..180`（25%），**没有动 INDICATOR**；
- 构造函数把 INDICATOR 初始化成 `135..270`，颜色是主题主色（蓝）；
- 两段蓝色叠在一起：`90..180 ∪ 135..270 = 90..270`，正好 **180°**，且从 6 点钟顺时针经 9 点钟到 12 点钟——就是用户看到的“蓝色半环”。
- B 的 75%（`90..360`）把默认 INDICATOR 完全包住，所以看不出多余段；C 整圈同理。
- D 不设角度时，MAIN（灰 `135..45`）与 INDICATOR（蓝 `135..270`）同时存在，只是用户把整条环当作灰色底环描述。

结论：**只写 MAIN 时，INDICATOR 必须显式清掉**，否则它会和任意短进度拼成一段更长的弧。
清法见 `arc_clear_indicator`（`start == end` 时 `lv_draw_arc` 立即返回）。

### 2026-10-22 · 第三版（`920e5e3`）：进调试页直接黑屏重启

用户报告：打开调试页 → 黑屏 → 手表重启。

定位：这一版新增的 `style_set` 调 `0x0C107791`。反汇编 `0xC107780` 显示它会把第 4 个参数（`selector`，
MAIN 时为 `0`）当指针解引用（`ldr r3,[r3,#0x1c]`），于是从地址 `0x1C` 取指 → HardFault → 复位。
`docs/地址表.csv` 里那条 `STATIC_RECOVERED` 的地址对本固件是错的（详见 §6 更正）。
第二版（`5b2cd35`）也含同样调用，只是当时没进调试页。

### 2026-10-22 · 第四版：只用角度字段，颜色吃主题默认

改动：删掉 `style_set`/`arc_set_color`/`arc_set_width`/`arc_hide_knob`；进度改用 **INDICATOR**
（主题蓝 `#2196F3`），底环用 MAIN 整圈（主题灰 `#2F3237`）；调试页 A/B = 灰底环 + 蓝 INDICATOR 进度，
C = INDICATOR 整圈，D = 一个字段都不写的对照组。

待验证：
1. 进调试页不再重启；
2. A/B 出现**蓝色**进度弧 → 证明 INDICATOR 一直被绘制，此前“25% 看成半环”的并集解释成立；
3. 若 A/B 根本没有蓝弧、只有灰环 → INDICATOR 未被绘制，需要另找 `ARC_OPA`/`pad` 的成因；
4. KNOB 圆点仍在（无样式入口，暂时无解）。
