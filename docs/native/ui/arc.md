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

Chaos 主页与调试页的圆环均建立在固件自带的 `lv_arc` 之上。灰色轨道与彩色进度分别由两组角度字段承载，`value` 仅驱动 INDICATOR；颜色保存在按 part 挂接的样式中，并不位于 arc 对象内部。本固件没有可靠的 obj 级样式入口，因此可用的实现手段只有直接写入角度字段。

## 证据来源与边界

证据分为两级：由固件字节与指令直接推导得出的结论记为「已证实」；依赖上游 LVGL v9.1 约定、结构相似性或未解析运行时跳板的结论记为「推断」。

| 来源 | 覆盖范围 | 说明 |
| --- | --- | --- |
| 运行时 dump | `0x1C060000–0x1C0804FF` | 有效区间，`0x1C080500` 起全 0。VA = 文件偏移 + `0x1BFB2BC0` |
| `analysis/arc-disasm.zh.md` | `lv_arc` 模块 `0x1C063D0C–0x1C0655C0` | capstone 逐指令，arc 语义的权威依据 |
| `analysis/ap-arc-theme.zh.md` | 主题初始化 `0x1C061694`、arc 构建器 | 默认配色，同固件内原生 arc 用法样本 |
| Ghidra 全量反编译 | `analysis/fw-decompiled.jsonl`，14,550 个函数 | 可查旁证；构造函数 `0x1C064068` 与绘制函数 `0x1C064642` 未被识别成独立函数 |

`lv_draw_arc`、`lv_obj_init_draw_arc_dsc`、`lv_map`、`lv_obj_invalidate` 等核心库函数位于基址以下，dump 中只有 4 字节 veneer，其行为依据上游 v9.1 源码描述，属推断级。

该固件属于 LVGL v9.1 时代：绘制分发入口为事件码 24（`LV_EVENT_DRAW_MAIN`），v9.2 中为 26。

## 对象布局

`lv_arc` 对象在对象头之后，自 `+0x34` 起为 arc 的私有字段。

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

灰色主轨迹为 MAIN，对应 `+0x40` 与 `+0x44`；彩色进度为 INDICATOR，对应 `+0x38` 与 `+0x3C`。`value` 仅驱动 INDICATOR，始终不会修改 MAIN。

## 绘制顺序

`lv_arc_draw`（`0x1C064642`）由事件码 24 触发，依次执行以下四个步骤。

1. 计算圆心与半径，调用 `get_center_radius`（`0x1C063D7C`）。
2. MAIN：`dsc->start = +0x40 + rotation`、`dsc->end = +0x44 + rotation`，`radius = arc_r`，调用 `lv_draw_arc`。
3. INDICATOR：先将半径按 part 的四条 pad 收缩到 `arc_r - max(pad)`，结果 ≤0 时整段跳过；再取 `dsc->start = +0x38 + rotation`、`dsc->end = +0x3C + rotation`。
4. KNOB：`get_knob_area`（`0x1C063EE0`）按 type 选角，NORMAL 读 `+0x3C`，REVERSE 读 `+0x38`，SYMMETRICAL 取背景与指示两条角的中点，再按 KNOB part 的样式属性外扩，绘制一个矩形。

关键推论：

- draw 不进行角度归一化，数值原样传入 `lv_draw_arc`；渲染器对每个角度最多减去一次 360，并将 `end == start + 360` 特判为完整圆环。
- `+0x34` 的 rotation 非 0 会使两条弧整体平移，Chaos 侧需保持该字段为 0。
- 绘制由事件驱动：写入字段仅修改数据，若不调用 invalidate 则不会重绘。
- 将整数写入 f32 字段（例如将 90 按 i32 写入）只会得到约 1e-43 的非规格化浮点数，弧将缩为一点或完全不可见。

## 角度 setter

| 地址 | 函数 | 行为 |
| --- | --- | --- |
| `0x1C0641EC` | `set_start_angle` | 归一化，计算新旧跨度，invalidate 旧与新 knob 区，写 `+0x38` |
| `0x1C064334` | `set_end_angle` | 同上，写 `+0x3C` |
| `0x1C064F0C` | `set_bg_angles` | 写 `+0x40` 与 `+0x44`，第 4 参是 part selector，dump 内唯一调用者传 0 |
| `0x1C0650A0` | `set_rotation` | 写 `+0x34` 并调用 `lv_obj_invalidate` |
| `0x1C065154` | `set_value` | clamp 到 `[min,max]`，`-32768` 视为未设置，按 mode 重算 INDICATOR 角 |
| `0x1C0652D4` | `set_range` | 写 `+0x4C` 与 `+0x50`，重算 |

旧资料将 `0x1C0650A0` 称为 `set_value`，并将 `+0x48` 视为 int16；上述判断均已被推翻。`set_value` 会覆盖 `+0x38` 与 `+0x3C`，`+0x40` 与 `+0x44` 不受其影响。

## value 到角度

映射公式为 `w = lv_map(value, min, max, bg_start, bg_end + (bg_end < bg_start ? 360 : 0))`，再按 mode 分支：

- NORMAL：`indic_start = bg_start`，`indic_end = w`；
- REVERSE：`indic_start = w`，`indic_end = bg_end`；
- SYMMETRICAL：两条 indicator 角先置为背景弧中点，再围绕中点重映射。

仅写入 `value` 不会改变 MAIN。反之，只要不调用 `set_value`、`set_range` 与 `set_mode`，手写的 `+0x38` 与 `+0x3C` 就不会被覆盖。

## 颜色与样式

颜色保存在按 part 挂接的 `lv_style_t` 中，不位于 arc 对象内部。

| 属性 id | 含义 |
| --- | --- |
| `0x1D`（29） | BG_OPA，矩形填充不透明度；KNOB 是圆角矩形，靠它决定是否可见 |
| `0x50` | ARC_WIDTH |
| `0x51` | ARC_ROUNDED |
| `0x52` | ARC_COLOR |
| `0x53` | ARC_OPA |
| `0x54` | ARC_IMAGE_SRC |

2026-10-22 更正：`0x0C107791` 并非样式派发器，不应调用。

`docs/地址表.csv` 将 `0xC107790` 标记为 `lv_obj_set_local_style_prop`（Canopus 3.101.043，`STATIC_RECOVERED`），但本固件自 `0xC107780` 起的实际代码如下：

```
c107780  push {r7, lr}
c107784  cbz  r0, err          ; obj 判空
c107786  cbz  r1, err          ; 参数判空
c107788  ldr  r3, [r1, #0x10]
c10778e  ldr  r3, [r3, #4]
c107790  ldr  r3, [r3, #0x1c]  ; 把第 4 个参数 selector 当指针解引用
c107794  blx  r3               ; 再跳过去
```

按 4 参数原型调用时，`selector`（MAIN 为 0）会落入 `r3`，程序随即在地址 `0x1C` 上取指，触发 HardFault 并导致黑屏重启。该现象已在 p67 实机上复现。同理，`lv_obj_set_style_bg_opa = 0xC108374` 落在函数中间的 `beq` 指令上，同样不可用。

本固件没有可靠的 obj 级样式入口，Chaos 侧统一只写入 arc 对象内的角度字段。

如需非灰色弧，唯一可行途径是使用 INDICATOR。其主题主色为蓝色 `#2196F3`，写入 `+0x38` 与 `+0x3C` 即可。代价是 KNOB 仍会绘制在 INDICATOR 末端；消除 KNOB 必须写入样式，而该途径当前不可用。

本固件 stock 主题（`0x1C061694`，暗色）的构成如下：

- MAIN 与 INDICATOR 均挂载 style A：`arc_color = #2F3237`（`theme+0x39..0x3B` = `37 32 2F`），动态宽度，`rounded = 1`；
- INDICATOR 额外挂载 style B：`arc_color = 主题主色`，即 `#2196F3`，`lv_palette_main(LV_PALETTE_BLUE)`，推断级，来自上游调色板约定；
- KNOB 挂载 style C（`theme+0x1B4`）。KNOB 每帧都会被绘制，这是圆环末端出现圆点的结构性来源，除非该 part 的样式将尺寸或不透明度设为不可见。

整个 dump 中仅有三处调用 `lv_style_set_arc_color`，不存在应用级 arc 配色，因此默认外观为灰色轨道配合主色进度。

颜色曾通过固件 `0x0C5882E1(obj, rgb, part)` 设置，经核查该地址落在 `0xC588224` 函数中间，并非颜色 setter。此前关于「真机可以改色」的判断并不可靠，观察到的蓝色很可能始终是 INDICATOR 的主题蓝。

## Chaos 侧实现

实现位于 `projects/chaos/supervisor/src/fw_api/gfx.rs`，仅写入角度字段与点击位。

| 函数 | 作用 |
| --- | --- |
| `arc_create(parent)` | 调用固件 `lv_arc_create`（`0x1C0641D1`） |
| `arc_set_main_angles(arc, start, end)` | 写入 `+0x34=0`、`+0x40=start`、`+0x44=end`，再调用 `lv_obj_invalidate` |
| `arc_set_indic_angles(arc, start, end)` | 写入 `+0x34=0`、`+0x38=start`、`+0x3C=end`，再调用 `lv_obj_invalidate` |
| `arc_set_progress(arc, pct)` | 清除 MAIN，INDICATOR 自 90° 起绘制 `pct%`；`pct=100` 时为 `90..450`，命中整圈特例 |
| `arc_set_bg_full(arc)` | 清除 INDICATOR，MAIN `0..360`，主题默认灰色，用作底环 |
| `arc_clear_main(arc)` | MAIN `0..0`，start 等于 end 时 draw 直接返回 |
| `arc_clear_indicator(arc)` | INDICATOR `0..0`，消除构造函数默认的蓝色弧 `135..270` |
| `arc_make_full(arc)` | 清除 INDICATOR，MAIN `90..450` 整圈 |
| `arc_disable_input(arc)` | 清除 `CLICKABLE`，避免手势改变环的尺寸 |

已删除 `style_set`、`arc_set_color`、`arc_set_width` 与 `arc_hide_knob`，四者均依赖 `0x0C107791`，调用会导致崩溃。颜色改用主题默认值：MAIN 为灰色 `#2F3237`，INDICATOR 为蓝色 `#2196F3`。KNOB 目前无法消除。

调试页入口为「在关于页连续点击版本号 5 次」，当前包含 4 个环，构成 2×2 验证矩阵：

| 环 | 配置 | 验证目的 |
| --- | --- | --- |
| A | 灰底环（独立 arc，MAIN `0..360`）加另一 arc 的 INDICATOR `90..180` | 双层叠放，INDICATOR 是否确实为蓝色 |
| B | 灰底环加 INDICATOR `90..360`（75%） | 跨度超过 180° 的补角路径 |
| C | 仅写 INDICATOR `90..450`，不叠加底环 | `end == start+360` 整圈特例 |
| D | 不写入任何字段，使用构造函数默认值 | 对照组：默认 MAIN 灰 `135..45`，INDICATOR 蓝 `135..270` |
| 全部 | 仅调用 `arc_disable_input` | 无样式调用，确认不再重启 |

上一版调试页（`aa5d381`）的配置为 A 25%、B 75%、C 100%、D 主题默认；四个环均未设置底环，且均被绘制 KNOB，实机表现见验证记录。

## 症状对照

| 症状 | 原因 | 对应条目 |
| --- | --- | --- |
| 写入角度后画面无变化 | 未调用 invalidate | 绘制顺序 |
| 弧缩为一点或消失 | 整数写入 f32 字段 | 绘制顺序 |
| 修改 `+0x38` 与 `+0x3C` 不影响可见的弧 | 可见的弧为 MAIN，即 `+0x40` 与 `+0x44` | 对象布局 |
| 角度正确但完全不可见 | INDICATOR 半径被 pad 收缩至 ≤0，或 width 与 opa 为 0 | 绘制顺序 |
| 修改后经过一帧即恢复原状 | `set_value`、`set_range`、`set_mode` 重新计算了 INDICATOR | value 到角度 |
| 满蓝环且圆点位置异常 | INDICATOR 被写为 `0..360` 整圈，KNOB 随 `+0x3C` 移动至 0° | 绘制顺序、颜色与样式 |
| 起点偏移，超过 75% 时形态异常 | rotation 非 0；或结束角超过 360，进入绕 0° 的补角路径 | 绘制顺序 |
| 仅绘制进度时缺少灰色底轨道 | 一个 arc 只有一条 MAIN 弧，进度与 track 必须拆分为两个对象叠放 | Chaos 侧实现 |
| 四个环末端正上方各有一个圆点 | KNOB 绘制在 INDICATOR 末端，默认 `+0x3C = 270°` 即正上方 | 颜色与样式、真机验证记录 |
| 未设置任何字段时，环为 75% 且缺口朝下 | 构造函数默认 MAIN `135..45`，跨度 270°，缺口正对 6 点钟 | 对象布局、真机验证记录 |
| 25% 的进度显示为半环 | MAIN `90..180` 与构造函数默认 INDICATOR `135..270` 同为蓝色，并集为 180° | value 到角度、真机验证记录 |

## 真机验证记录

以下记录按时间顺序排列，全部来自 p67 与 3.101.043 的实机肉眼观察，作为语义的最终裁决依据。

### 2026-10-22 · 第一版（`aa5d381`）

配置为 A 25%、B 75%、C 100%、D 不设置角度。现场观察结果如下：

- A：蓝色半环，底环不可见；
- B：75% 蓝色环，底环不可见；
- C：整环；
- D：灰环占 3/4，即 270°，缺口朝下，正对 6 点钟；
- 四个环的末端或顶部均有圆点，且均位于正上方。

由此得出四条判断：

1. `end == start + 360` 的整圈特例成立，C 为完整圆环。
2. 四个环的圆点位置一致且位于正上方，说明 KNOB 绘制在 INDICATOR 末端。默认 `+0x3C = 270°`，LVGL 的 0° 位于 3 点钟方向并沿顺时针递增，270° 即 12 点钟位置；四个环都未改动 INDICATOR，因此圆点始终位于同一处。
3. D 的「75% 且缺口朝下」现象反过来证实了构造函数默认值：MAIN `135..45` 跨度为 270°，缺口为 `45..135`，中心正对 90°，即 6 点钟。
4. A 与 B 没有底环属于设计结果，并非缺陷：一个 arc 只有一条 MAIN 弧，进度弧会占用整条 MAIN，要实现灰色轨道必须再增加一个整圈 arc 叠放在下层。

据此进行的改动为：新增 `style_set`、`arc_set_width` 与 `arc_hide_knob`，并将调试页改为 track 与 progress 两层结构。

### 2026-10-22 · 第二版（`5b2cd35` 之前）：A 的半环实为 180°

A 的蓝色弧实际为 50%，即 180°，而 25% 对应 90°。该现象在几何上成立：

- 代码仅写入 MAIN `90..180`，未改动 INDICATOR；
- 构造函数将 INDICATOR 初始化为 `135..270`，其颜色为主题主色蓝；
- 两段蓝色相互叠加，`90..180 ∪ 135..270 = 90..270`，跨度恰为 180°，自 6 点钟沿顺时针经 9 点钟至 12 点钟，即观察到的蓝色半环；
- B 的 75%（`90..360`）完全包含默认 INDICATOR，因此观察不到多余段；C 为整圈，情况相同；
- D 未设置角度时，MAIN 的灰色 `135..45` 与 INDICATOR 的蓝色 `135..270` 同时存在，只是在描述中被整体视为灰色底环。

仅写入 MAIN 时，必须显式清除 INDICATOR，否则它会与任意短进度拼接成一段更长的弧。清除方法为调用 `arc_clear_indicator`；当 start 等于 end 时，`lv_draw_arc` 立即返回。

### 2026-10-22 · 第三版（`920e5e3`）：进入调试页即黑屏重启

打开调试页后屏幕变黑，随后手表重启。定位结果为这一版新增的 `style_set` 调用 `0x0C107791`。

对 `0xC107780` 的反汇编显示，该函数会将第 4 个参数作为指针解引用；`selector` 在 MAIN 情形下为 0，于是程序从地址 `0x1C` 取指，HardFault 后复位。`docs/地址表.csv` 中该条 `STATIC_RECOVERED` 记录的地址对本固件而言是错误的。第二版（`5b2cd35`）也包含相同调用，只是当时未进入调试页。

### 2026-10-22 · 第四版：仅使用角度字段

删除 `style_set`、`arc_set_color`、`arc_set_width` 与 `arc_hide_knob`；进度改用 INDICATOR，即主题蓝色 `#2196F3`；底环使用 MAIN 整圈，即主题灰色 `#2F3237`；调试页 A 与 B 为灰底环加蓝色 INDICATOR 进度，C 为 INDICATOR 整圈，D 为不写入任何字段的对照组。

待验证的四点如下：

1. 进入调试页不再重启；
2. A 与 B 出现蓝色进度弧，由此证实 INDICATOR 始终参与绘制，此前关于「25% 被看成半环」的并集解释成立；
3. 若 A 与 B 完全没有蓝色弧、仅有灰环，则说明 INDICATOR 未被绘制，需要另寻 `ARC_OPA` 或 `pad` 方面的成因；
4. KNOB 圆点仍然存在，目前无样式入口，暂时无法解决。

## 未解问题

| 问题 | 状态 | 说明 |
| --- | --- | --- |
| KNOB 隐藏是否真的生效 | 待定 | 配方为 `BG_OPA(KNOB)=0` 加 `ARC_WIDTH(KNOB)=0`，已被 `aa5d381` 之后一版真机验证覆盖，结论待回填 |
| 官方电池页参数 | 待定 | 页面由数据或脚本层构建，字符串与资源里都没找到，暂不可复刻为官方值 |
| `0x0C5882E1` 的准确符号 | 待定 | 影响颜色函数是否真的写 ARC_COLOR；新代码已改走 `0x0C107791`，该地址仅作历史参考。「该地址可改色」的判断已被推翻 |
| Ghidra 结果缺口 | 待定 | `0x1C064068` 与 `0x1C064642` 缺失，两者在 chunk 边界附近；重新反编译应先修正函数识别 |
| 底环与进度用几个对象 | 待定 | 当前是 track 一个 arc 加进度一个 arc；若 MAIN 与 INDICATOR 可分别承载，即 `lv_arc_set_bg_angles` 加手写 `+0x38` 与 `+0x3C`，可省一半对象 |

## 复现

- 逐指令分析：`analysis/arc-disasm.zh.md`
- 主题与配色：`analysis/ap-arc-theme.zh.md`
- 全量伪代码查询：`analysis/fw-decompiled.jsonl`，每行含 `va/name/size/c`
- 函数索引：`analysis/fw-decompiled-index.csv`

## 相关页面

- 页面结构与事件派发：[LVGL 与界面](/native/ui/lvgl)
- 圆环所在的应用框架：[Chaos](/native/frameworks/chaos)
- 固件地址与符号恢复：[逆向工具](/platform/tools/reversing)
- 已恢复符号的地址表：[地址表](/native/advanced/addresses)
