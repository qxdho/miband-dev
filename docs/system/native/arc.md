---
title: 圆环与 ARC 控件
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/15-圆环与ARC控件.md"
contributors: [miband-dev]
---

# 圆环与 ARC 控件

<StatusBadge status="sourced" verified="2026-10-25" />

Chaos 主页与调试页的圆环都建立在固件自带的 `lv_arc` 上。灰色轨道与彩色进度由两组角度字段分别承载，`value` 只驱动 INDICATOR；颜色不在 arc 对象内，而在按 part 挂接的样式里，本固件没有可靠的 obj 级样式入口，因此落地手段只有直接写角度字段。

## 证据来源与边界

证据分两级：由固件字节与指令直接推出的记为「已证实」，依赖上游 LVGL v9.1 约定、结构相似性或未解析运行时跳板的记为「推断」。

| 来源 | 覆盖范围 | 说明 |
| --- | --- | --- |
| 运行时 dump | `0x1C060000–0x1C0804FF` | 有效区间，`0x1C080500` 起全 0。VA = 文件偏移 + `0x1BFB2BC0` |
| `analysis/arc-disasm.zh.md` | `lv_arc` 模块 `0x1C063D0C–0x1C0655C0` | capstone 逐指令，arc 语义的权威依据 |
| `analysis/ap-arc-theme.zh.md` | 主题初始化 `0x1C061694`、arc 构建器 | 默认配色，同固件内原生 arc 用法样本 |
| Ghidra 全量反编译 | `analysis/fw-decompiled.jsonl`，14,550 个函数 | 可查旁证；构造函数 `0x1C064068` 与绘制函数 `0x1C064642` 未被识别成独立函数 |

`lv_draw_arc`、`lv_obj_init_draw_arc_dsc`、`lv_map`、`lv_obj_invalidate` 等核心库函数位于基址以下，dump 中只有 4 字节 veneer，其行为按上游 v9.1 源码陈述，属推断级。

固件属于 LVGL v9.1 时代：绘制分发入口是事件码 24（`LV_EVENT_DRAW_MAIN`），v9.2 为 26。

## 对象布局

`lv_arc` 对象在对象头之后从 `+0x34` 起是 arc 私有字段。

| 偏移 | 类型 | 名称 | 写入者 | 绘制或逻辑读取者 |
| --- | --- | --- | --- | --- |
| `+0x34` | i32 | `rotation` | ctor（=0）、`set_rotation` | draw（加到每一条弧的角度上）、knob area |
| `+0x38` | f32 | `indic_angle_start` | ctor、`set_start_angle` | draw（INDICATOR 起点） |
| `+0x3C` | f32 | `indic_angle_end` | ctor、`set_end_angle` | draw（INDICATOR 终点）、get_knob_area |
| `+0x40` | f32 | `bg_angle_start` | ctor、`set_bg_angles` | draw（MAIN 起点） |
| `+0x44` | f32 | `bg_angle_end` | ctor、`set_bg_angles` | draw（MAIN 终点） |
| `+0x48` | i32 | `value` | ctor（-32768）、`set_value` | value 到角度的映射 |
| `+0x4C` | i32 | `min` | ctor、`set_range` | 映射区间 |
| `+0x50` | i32 | `max` | ctor、`set_range` | 映射区间 |
| `+0x54` | u32 | `type/mode` 与交互位 | ctor（0x08）、`set_mode` | knob area、value 映射分支 |
| `+0x60` | f32 | `last_angle` | ctor、`set_value` 或 `value_update` | knob 与动画 |
| `+0x64` | i16 | `knob_offset` | dump 内无写入 | get_knob_area |

结论：灰色主轨迹是 MAIN，对应 `+0x40` 与 `+0x44`；彩色进度是 INDICATOR，对应 `+0x38` 与 `+0x3C`。`value` 只驱动 INDICATOR，永远不改 MAIN。

## 绘制顺序

`lv_arc_draw`（`0x1C064642`）由事件码 24 触发，依次执行四步。

1. 计算圆心与半径，调用 `get_center_radius`（`0x1C063D7C`）。
2. MAIN：`dsc->start = +0x40 + rotation`、`dsc->end = +0x44 + rotation`，`radius = arc_r`，调用 `lv_draw_arc`。
3. INDICATOR：先按 part 的四条 pad 把半径收到 `arc_r - max(pad)`，结果 ≤0 时整段跳过；再取 `dsc->start = +0x38 + rotation`、`dsc->end = +0x3C + rotation`。
4. KNOB：`get_knob_area`（`0x1C063EE0`）按 type 选角，NORMAL 读 `+0x3C`，REVERSE 读 `+0x38`，SYMMETRICAL 取背景与指示两条角的中点，再按 KNOB part 的样式属性外扩，画一个矩形。

关键推论：

- draw 不做角度归一化，数值原样进入 `lv_draw_arc`；渲染器对每个角最多减一次 360，并特判 `end == start + 360` 为完整圆环。
- `+0x34` 的 rotation 非 0 会让两条弧整体平移，Chaos 侧必须保持 0。
- 绘制是事件驱动的：写字段只改数据，不 invalidate 就不会重绘。
- 把整数写进 f32 字段，例如把 90 当 i32 写入，只会得到约 1e-43 的非规格化浮点数，弧缩成一点或不可见。

## 角度 setter

| 地址 | 函数 | 行为 |
| --- | --- | --- |
| `0x1C0641EC` | `set_start_angle` | 归一化，计算新旧跨度，invalidate 旧与新 knob 区，写 `+0x38` |
| `0x1C064334` | `set_end_angle` | 同上，写 `+0x3C` |
| `0x1C064F0C` | `set_bg_angles` | 写 `+0x40` 与 `+0x44`，第 4 参是 part selector，dump 内唯一调用者传 0 |
| `0x1C0650A0` | `set_rotation` | 写 `+0x34` 并调用 `lv_obj_invalidate` |
| `0x1C065154` | `set_value` | clamp 到 `[min,max]`，`-32768` 视为未设置，按 mode 重算 INDICATOR 角 |
| `0x1C0652D4` | `set_range` | 写 `+0x4C` 与 `+0x50`，重算 |

旧资料把 `0x1C0650A0` 叫 `set_value`、把 `+0x48` 当 int16，均已推翻。`set_value` 会覆盖 `+0x38` 与 `+0x3C`，`+0x40` 与 `+0x44` 不受它影响。

## value 到角度

映射公式为 `w = lv_map(value, min, max, bg_start, bg_end + (bg_end < bg_start ? 360 : 0))`，再按 mode 分支：

- NORMAL：`indic_start = bg_start`，`indic_end = w`；
- REVERSE：`indic_start = w`，`indic_end = bg_end`；
- SYMMETRICAL：两条 indicator 角先置为背景弧中点，再围绕中点重映射。

只写 `value` 永远动不了 MAIN。反过来，只要不调用 `set_value`、`set_range`、`set_mode`，手写的 `+0x38` 与 `+0x3C` 就不会被覆盖。

## 颜色与样式

颜色不在 arc 对象里，在按 part 挂接的 `lv_style_t` 中。

| 属性 id | 含义 |
| --- | --- |
| `0x1D`（29） | BG_OPA，矩形填充不透明度；KNOB 是圆角矩形，靠它决定是否可见 |
| `0x50` | ARC_WIDTH |
| `0x51` | ARC_ROUNDED |
| `0x52` | ARC_COLOR |
| `0x53` | ARC_OPA |
| `0x54` | ARC_IMAGE_SRC |

2026-10-22 更正：`0x0C107791` 不是样式派发器，禁止调用。

`docs/地址表.csv` 把 `0xC107790` 标成 `lv_obj_set_local_style_prop`（Canopus 3.101.043，`STATIC_RECOVERED`），但本固件从 `0xC107780` 起的真实代码是：

```
c107780  push {r7, lr}
c107784  cbz  r0, err          ; obj 判空
c107786  cbz  r1, err          ; 参数判空
c107788  ldr  r3, [r1, #0x10]
c10778e  ldr  r3, [r3, #4]
c107790  ldr  r3, [r3, #0x1c]  ; 把第 4 个参数 selector 当指针解引用
c107794  blx  r3               ; 再跳过去
```

按 4 参数原型调用时，`selector`（MAIN 为 0）落进 `r3`，于是在地址 `0x1C` 上取指，HardFault 后黑屏重启。p67 实机已复现。同理 `lv_obj_set_style_bg_opa = 0xC108374` 落在函数中间的 `beq` 指令上，不可用。

结论：本固件没有可靠的 obj 级样式入口，Chaos 侧一律只写 arc 对象内的角度字段。

想要非灰色弧只剩一条路，即使用 INDICATOR。其主题主色为蓝 `#2196F3`，写 `+0x38` 与 `+0x3C` 即可。代价是 KNOB 仍会画在 INDICATOR 末端，消除它必须写样式，当前不可用。

本固件 stock 主题（`0x1C061694`，暗色）：

- MAIN 与 INDICATOR 都挂 style A：`arc_color = #2F3237`（`theme+0x39..0x3B` = `37 32 2F`），动态宽度，`rounded = 1`；
- INDICATOR 额外挂 style B：`arc_color = 主题主色`，即 `#2196F3`，`lv_palette_main(LV_PALETTE_BLUE)`，推断级，来自上游调色板约定；
- KNOB 挂 style C（`theme+0x1B4`）。KNOB 每帧都会被绘制，这是圆环末端出现圆点的结构性来源，除非该 part 的样式把尺寸或不透明度做成不可见。

全 dump 只有三处调用 `lv_style_set_arc_color`，没有应用级 arc 配色，因此默认观感是灰轨道加主色进度。

颜色曾走固件 `0x0C5882E1(obj, rgb, part)`，该地址经查落在 `0xC588224` 函数中间，并非颜色 setter。此前「真机能改色」的判断不可靠，看到的蓝很可能一直是 INDICATOR 的主题蓝。

## Chaos 侧实现

实现位于 `projects/chaos/supervisor/src/fw_api/gfx.rs`，只写角度字段与点击位。

| 函数 | 作用 |
| --- | --- |
| `arc_create(parent)` | 调固件 `lv_arc_create`（`0x1C0641D1`） |
| `arc_set_main_angles(arc, start, end)` | 写 `+0x34=0`、`+0x40=start`、`+0x44=end`，再 `lv_obj_invalidate` |
| `arc_set_indic_angles(arc, start, end)` | 写 `+0x34=0`、`+0x38=start`、`+0x3C=end`，再 `lv_obj_invalidate` |
| `arc_set_progress(arc, pct)` | 清 MAIN，INDICATOR 从 90° 起画 `pct%`；`pct=100` 时为 `90..450`，命中整圈特例 |
| `arc_set_bg_full(arc)` | 清 INDICATOR，MAIN `0..360`，主题默认灰，作底环 |
| `arc_clear_main(arc)` | MAIN `0..0`，start 等于 end 时 draw 直接返回 |
| `arc_clear_indicator(arc)` | INDICATOR `0..0`，消掉构造函数默认的蓝弧 `135..270` |
| `arc_make_full(arc)` | 清 INDICATOR，MAIN `90..450` 整圈 |
| `arc_disable_input(arc)` | 清 `CLICKABLE`，避免手势把环拖大拖小 |

已删除 `style_set`、`arc_set_color`、`arc_set_width`、`arc_hide_knob`，四者全部依赖 `0x0C107791`，会崩。颜色改为使用主题默认值：MAIN 灰 `#2F3237`，INDICATOR 蓝 `#2196F3`。KNOB 暂时无法消除。

调试页入口为「关于页连点 5 下版本号」，当前 4 个环，构成 2×2 验证矩阵：

| 环 | 配置 | 验证目的 |
| --- | --- | --- |
| A | 灰底环（独立 arc，MAIN `0..360`）加另一 arc 的 INDICATOR `90..180` | 双层叠放，INDICATOR 是否真的是蓝色 |
| B | 灰底环加 INDICATOR `90..360`（75%） | 跨度超过 180° 的补角路径 |
| C | 只写 INDICATOR `90..450`，不叠底环 | `end == start+360` 整圈特例 |
| D | 一个字段都不写，使用构造函数默认值 | 对照组：默认 MAIN 灰 `135..45`，INDICATOR 蓝 `135..270` |
| 全部 | 只调用 `arc_disable_input` | 无样式调用，确认不再重启 |

上一版调试页（`aa5d381`）是 A 25%、B 75%、C 100%、D 主题默认，四环都没有底环，都被画上 KNOB，真机表现见验证记录。

## 症状对照

| 症状 | 原因 | 对应条目 |
| --- | --- | --- |
| 写了角度，画面完全不变 | 没有 invalidate | 绘制顺序 |
| 弧缩成一点或消失 | 整数写进 f32 字段 | 绘制顺序 |
| 改 `+0x38` 与 `+0x3C` 动不了看到的那条弧 | 看到的是 MAIN，即 `+0x40` 与 `+0x44` | 对象布局 |
| 角度对但完全看不见 | INDICATOR 半径被 pad 收成 ≤0，或 width 与 opa 为 0 | 绘制顺序 |
| 改完过一帧又变回去 | `set_value`、`set_range`、`set_mode` 重算了 INDICATOR | value 到角度 |
| 满蓝环加圆点乱跑 | 把 INDICATOR 写成 `0..360` 整圈，KNOB 跟着 `+0x3C` 跑到 0° | 绘制顺序、颜色与样式 |
| 起点偏，超过 75% 形态异常 | rotation 非 0；或结束角超过 360 走了绕 0° 补角路径 | 绘制顺序 |
| 只想画进度，底下却没有灰轨道 | 一个 arc 只有一条 MAIN 弧，进度与 track 必须拆成两个对象叠放 | Chaos 侧实现 |
| 四个环末端在正上方各有一个圆点 | KNOB 画在 INDICATOR 末端，默认 `+0x3C = 270°` 即正上方 | 颜色与样式、真机验证记录 |
| 什么都不设，环是 75% 且缺口朝下 | 构造函数默认 MAIN `135..45`，跨度 270°，缺口正对 6 点钟 | 对象布局、真机验证记录 |
| 25% 的进度看起来是半环 | MAIN `90..180` 与构造函数默认 INDICATOR `135..270` 同为蓝色，并集为 180° | value 到角度、真机验证记录 |

## 真机验证记录

以下按时间顺序，全部为 p67 与 3.101.043 的实机肉眼观察，用作语义的最终裁决。

### 2026-10-22 · 第一版（`aa5d381`）

配置为 A 25%、B 75%、C 100%、D 不设角度。现场观察：

- A：蓝色半环，看不到底环；
- B：75% 蓝环，看不到底环；
- C：整环；
- D：灰环占 3/4，即 270°，缺口朝下，正对 6 点钟；
- 四个环的末端或顶部都有圆点，且都在正上方。

判定四条：

1. `end == start + 360` 整圈特例成立，C 是完整圆环。
2. 四环圆点位置一致且在正上方，说明 KNOB 画在 INDICATOR 末端。默认 `+0x3C = 270°`，LVGL 的 0° 在 3 点钟方向、顺时针，270° 即 12 点钟；四环都没有碰 INDICATOR，所以圆点永远在同一处。
3. D 的「75% 加缺口朝下」反过来证实构造函数默认值：MAIN `135..45` 跨度 270°，缺口是 `45..135`，中心正对 90°，即 6 点钟。
4. A 与 B 没有底环属于设计结果，不是 bug：一个 arc 只有一条 MAIN 弧，进度弧会把整条 MAIN 占掉，要灰轨道必须再加一个整圈 arc 叠在下面。

据此的改动是加 `style_set`、`arc_set_width`、`arc_hide_knob`，调试页改成 track 与 progress 两层结构。

### 2026-10-22 · 第二版（`5b2cd35` 之前）：A 的「半环」是 180°

A 那条蓝弧实际是 50%，即 180°，不是 25% 的 90°。几何上成立：

- 代码只写了 MAIN `90..180`，没有动 INDICATOR；
- 构造函数把 INDICATOR 初始化为 `135..270`，颜色是主题主色蓝；
- 两段蓝色叠在一起，`90..180 ∪ 135..270 = 90..270`，正好 180°，从 6 点钟顺时针经 9 点钟到 12 点钟，即看到的蓝色半环；
- B 的 75%（`90..360`）把默认 INDICATOR 完全包住，所以看不出多余段；C 整圈同理；
- D 不设角度时，MAIN 灰 `135..45` 与 INDICATOR 蓝 `135..270` 同时存在，只是整条环被当成灰色底环描述。

结论：只写 MAIN 时，INDICATOR 必须显式清掉，否则它会与任意短进度拼成一段更长的弧。清法是 `arc_clear_indicator`，start 等于 end 时 `lv_draw_arc` 立即返回。

### 2026-10-22 · 第三版（`920e5e3`）：进调试页直接黑屏重启

打开调试页后黑屏，随后手表重启。定位结果是这一版新增的 `style_set` 调用 `0x0C107791`。

反汇编 `0xC107780` 显示它会把第 4 个参数当指针解引用，`selector` 在 MAIN 时为 0，于是从地址 `0x1C` 取指，HardFault 后复位。`docs/地址表.csv` 中那条 `STATIC_RECOVERED` 的地址对本固件是错的。第二版（`5b2cd35`）也含同样调用，只是当时没有进入调试页。

### 2026-10-22 · 第四版：只用角度字段

删掉 `style_set`、`arc_set_color`、`arc_set_width`、`arc_hide_knob`；进度改用 INDICATOR，即主题蓝 `#2196F3`；底环用 MAIN 整圈，即主题灰 `#2F3237`；调试页 A 与 B 为灰底环加蓝 INDICATOR 进度，C 为 INDICATOR 整圈，D 为不写任何字段的对照组。

待验证四点：

1. 进入调试页不再重启；
2. A 与 B 出现蓝色进度弧，证明 INDICATOR 一直被绘制，此前「25% 看成半环」的并集解释成立；
3. 若 A 与 B 根本没有蓝弧、只有灰环，说明 INDICATOR 未被绘制，需要另找 `ARC_OPA` 或 `pad` 的成因；
4. KNOB 圆点仍在，无样式入口，暂时无解。

## 未解问题

| 问题 | 状态 | 说明 |
| --- | --- | --- |
| KNOB 隐藏是否真的生效 | 待定 | 配方为 `BG_OPA(KNOB)=0` 加 `ARC_WIDTH(KNOB)=0`，已被 `aa5d381` 之后一版真机验证覆盖，结论待回填 |
| 官方电池页参数 | 待定 | 页面由数据或脚本层构建，字符串与资源里都没找到，暂不可复刻为官方值 |
| `0x0C5882E1` 的准确符号 | 待定 | 影响颜色函数是否真的写 ARC_COLOR；新代码已改走 `0x0C107791`，该地址只作历史参考。「该地址能改色」的判断已推翻 |
| Ghidra 结果缺口 | 待定 | `0x1C064068` 与 `0x1C064642` 缺失，两者在 chunk 边界附近；重新反编译应先修正函数识别 |
| 底环与进度用几个对象 | 待定 | 当前是 track 一个 arc 加进度一个 arc；若 MAIN 与 INDICATOR 可分别承载，即 `lv_arc_set_bg_angles` 加手写 `+0x38` 与 `+0x3C`，可省一半对象 |

## 复现

- 逐指令分析：`analysis/arc-disasm.zh.md`
- 主题与配色：`analysis/ap-arc-theme.zh.md`
- 全量伪代码查询：`analysis/fw-decompiled.jsonl`，每行含 `va/name/size/c`
- 函数索引：`analysis/fw-decompiled-index.csv`

## 相关页面

- 页面结构与事件派发：[LVGL 与界面](/system/native/lvgl)
- 圆环所在的应用框架：[Chaos](/system/native/chaos)
- 固件地址与符号恢复：[逆向工具](/refs/reversing)
- 已恢复符号的地址表：[地址表](/system/native/addresses)
