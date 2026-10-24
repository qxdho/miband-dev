# 16 · 逆向交接：控制中心注入与 LVGL 地址定位

> 写于 2026-10-22，用于换会话/换人接手。前一份进度记录见 `docs/15-圆环与ARC控件.md`。

## 1. 结论先行

| 线 | 状态 |
| --- | --- |
| 圆环（底环+进度、藏圆点） | 已出可用版本 `94eb407`，**藏圆点失败已封存**（见 §6） |
| LVGL 样式 API 地址 | **未解决**，地址表错误已确认，跳板表已切出（见 §4） |
| 控制中心注入 | **已封存**：磁贴点击结构已摸清，但 Chaos 没有改固件代码的能力、且每磁贴一个独立回调 → 不划算，结论与证据见 [`docs/17`](17-控制中心磁贴点击-逆向进展.md) |

## 2. 固件与双映射（关键前提）

固件 `firmware/10pro/fwx/vela_ap.bin`，13,795,728 字节。**同一份字节在运行时有两套虚拟地址视图**：

| 视图 | 基址 | 说明 |
| --- | --- | --- |
| A | `0x0C000000` | 地址表多数条目使用 |
| B | `0x1BFB2BC0` | arc 相关地址使用 |

换算：`VA_A = VA_B - 0xFB2BC0`。文件偏移 `off` → `VA_A = 0x0C000000 + off`，`VA_B = 0x1BFB2BC0 + off`。

> ⚠ **2026-10-22 更正（见 `docs/17` §1）**：主代码段的 A 视图基址实为 **`0x0C0C0000`**（本文漏了 `0xC0000`），rodata/字符串是 `0x2C0C0000`。统计证据：奇数字指针落在函数起点上的计数 `0x0C0C0000` → 18894、`0x0C000000` → 375、`0x1BFB2BC0` → 1252。下文 §4「`0xc107790` 跑飞」正是这个偏差造成的（真实地址 `0x0C1C7790`）。

已验证实例：
- 偏移 `0xB14A8`（`0x1C064068`）= `f5b8…`（`push {r3-r7,lr}`）= arc 构造函数；
- 偏移 `0x107790`（`0xC107790`）= `69db 0bb1 9847 80bd`（`ldr r3,[r3,#0x1c]; cbz r3; blx r3; pop {r7,pc}`）。

> `fw.bin`（90MB）是加密/压缩的，`vela_resource.bin`（171MB）是纯资源，两者都不含可读代码。

## 3. 已确认可用的地址（Chaos 实测）

| 地址 | 用途 |
| --- | --- |
| `0x1C064068` | `lv_arc` 构造 |
| `0x1C064642` | `lv_arc` 绘制 |
| `0x1C0641EC` | set_start |
| `0x1C064334` | set_end |
| `0x1C064F0C` | set_bg_angles（写 `+0x40/+0x44` MAIN） |
| `0x1C0650A0` | set_rotation（`+0x34`） |
| `0x1C065154` | set_value（`+0x48`） |
| `0x1C0652D4` | set_range（`+0x4C/+0x50`） |
| `0xC028C85` | `obj_clear_flag` |

arc 字段：`+0x34` rotation(i32)、`+0x38/+0x3C` INDICATOR 角(f32)、`+0x40/+0x44` MAIN 角(f32)、`+0x48` value(i32)、`+0x4C/+0x50` min/max、`+0x54` mode、`+0x60` last_angle。

## 4. LVGL 样式 API：为什么卡住

### 4.1 地址表不可信

> ⚠ 先看 §2 的更正：A 视图基址实为 `0x0C0C0000`（相差 `0xC0000`）。下面的 「HardFault」正是这个偏差的直接后果——CSV 里的 `0xc107790` 按 `0x0C000000 + off` 换算，真机应该用 `0x0C1C7790`。另外抽查发现 `0xc108374` 对应的 `file 0x108374` 不在指令边界上（落在函数 `0x108354` 的 `+0x20`），这条连基址修正都救不回。详见 `docs/17` §3。

`docs/地址表.csv` 里样式相关只有两条，且都错：

- `lv_obj_set_local_style_prop = 0xc107790` —— 实为虚方法派发器，把第 4 参数当对象解引用，selector=0 时从 `0x1C` 取指 → **HardFault，真机重启**（已复现）；
- `lv_obj_set_style_bg_opa = 0xc108374` —— 落在 `beq #0xc1083da` 指令中间。

符号 JSON 的 `firmware_sha256` 与 `vela_ap.bin` 实测一致（`5193076756…56ec`），**不是版本错配**；其 notes 自述「Address refreshed by trusted-036 caller-neighborhood ensemble v2」，即地址被跨版本邻域推断刷新过。

### 4.2 跳板表（veneer table）

- `0x1C07A258` 起 **316 条**连续跳板，每条 8 字节：`5ff800f0`（`ldr.w pc,[pc,#0]`）+ 目标字；
- `0x1C07AA40` 是第 257 条（`(0x1C07AA40-0x1C07A258)/8`），此前误认为 `lv_obj_add_style`；
- 目标分布：多数在 `0x2Bxxxx`（**该镜像不在 fwx 目录，也不在 fw.bin/vela_resource.bin**），少数在 `0xC1F…/0xC3…`（可读）。

### 4.3 已排除的错路（不要重走）

1. 名字串表 `0x1CBD2EEC` 起（`lv_obj_set_prop` 等）：**死数据**，全镜像无指针指向，ADR 扫描仅 1 处自引用；
2. 「表少写 `0x10000000`」的别名假说：换算后是别的函数，假说不成立；
3. `b.w` 目标直方图（2439 条）：最高仅 22 入边，**无「几十个包装共享尾跳转」族**，说明包装被内联；
4. `movs r1,#imm + bl` 组合：头名 `0xC688864` 是堆分配器，纯噪声。

### 4.4 剩余可试路线

- 316 条跳板按顺序与 LVGL 9.1 导出符号顺序对齐（未验证假设，成功率 <50%）；
- 本地编 LVGL 9.1.0 做调用序列指纹（源码已下：`tools/dl/lvgl-9.1.0.tar.gz`，已解出 `src/`；用 `toolchain/xpack-arm-none-eabi-gcc-15.2.1-1.1`，参数 `-O2 -mcpu=cortex-m33 -mthumb -mfloat-abi=hard -mfpu=fpv5-sp-d16 -DLV_CONF_SKIP`，已验证可编译 `lv_obj_style.c`）。

## 5. 控制中心（已封存，详见 `docs/17`）

### 5.1 事实

- 是**原生 C 应用**：`../../vendor/xiaomi/miwear/apps/applications/control_center/page_main.c`，包名 `com.xiaomi.miwear.control_center`（偏移 `0xAD6AD0`）；
- 磁贴清单**持久化在 DB**：`/data/app/ctrl/ctrl.db` 的 `orderlist_v001` 表（引用点 `0x443368` 等）；键 `control_center.settings`（偏移 `0xAEA38C`）只是设置页的一个注册项，全镜像仅 1 处引用（`0x4918C4`）；文案键 `control_center_lable.settings`；
- 有**编辑模式**：`control_center_edit`、图标 `add.bin`/`delete.bin` → 用户可增删磁贴；
- Chaos 已能替换其图标：`supervisor/src/res_hook.rs:79-91`；
- Canopus 有 `private_abi.control_center_scroll = 0x0c5036c5`（列表滚动）。

### 5.2 关键判断（部分已被 `docs/17` 推翻）

- ~~磁贴「有哪几个」由 `control_center.settings` 决定~~ → **错**：磁贴集合/顺序来自 `/data/app/ctrl/ctrl.db` 的 `orderlist_v001` 表（引用点 `0x443368/0x4433C0/0x4433FC`）；`control_center.settings` 全镜像只有 1 处字面量引用（`0x4918C4`，属设置项注册），见 `docs/17` §3；
- 磁贴「是什么」由 C 内枚举决定 → 不能新增类型（这条成立）；
- 因此**唯一有价值的注入方式 = 接管某个已有磁贴的点击行为**（方案 A）。

### 5.3 当前卡点（已推进，详见 `docs/17`）

已完成：
- 地址视图纠正（`0x0C0C0000` / `0x2C0C0000`，见 `docs/17` §1）；
- 定位两段代码：框架 CC 页 `file 0x442000–0x455000`、miwear 应用 `file 0x55B8F0–0x564000`；
- 找出磁贴描述初始化 `file 0x4424C0`（9 种 type，结构 `sizeof 0x28`，`+0x24` 是可选 handler）与九类磁贴的图标/键字面量表（`docs/17` §4）；
- 找出应用侧 46 个 `lv_obj_add_event_cb(filter=7)` 注册点与「每磁贴一个回调」的形态（`docs/17` §5）。

未决：
1. `file 0x4424C0` 在文件里没有静态调用者（无 `bl`、无字面量）→ 只能经函数指针表/RAM 调用，需在真机或 RAM 数据段确认；
2. 二键磁贴（alarm/flashlight/findphone/settings）点击是否最终走 `app_launcher_*`（决定方案 D 是否可用）；
3. `desc+0x24` 的 handler 目前只有 disturb 一类，价值低。

## 6. 圆环：已完成部分与封存点

已提交：

- `aa5d381`：MAIN/INDICATOR 写入纠正、`arc_set_progress` 等；
- `5b2cd35`：底环+进度双层（依赖了错误的 `style_set`）；
- `920e5e3`：清 INDICATOR —— **此版导致真机重启**；
- `94eb407`：**当前可用版**，删除所有依赖 `0xC107791` 的调用；调试页 A=25%、B=75%、C=INDICATOR 整圈、D=不写字段。

产物：`dist/chaos-installer-p67.bin` sha256 `2750ab3e1fd6…633d`；`dist/chaos_sup.ko` sha256 `da72f22a…bb91`。

未解：KNOB 圆点在 INDICATOR 末端（正上方），其样式挂在 style C（`theme+0x1B4`），**要藏掉必须能改样式，即回到 §4**。

## 7. 环境备忘

- 无 `python3`、无宿主 `cc`。可用：`tools/dl/python/bin/python3`、`tools/dl/bin/cc`（zig 包装，需设 `ZIG_GLOBAL_CACHE_DIR`/`ZIG_LOCAL_CACHE_DIR`）；
- 打包：`node tools/package_chaos.js <ko> dist/chaos-installer-p67.bin`；
- 反汇编：`node tools/dis.js <start> <end> [base]`，默认基址 `0x0c000000`；查字面引用：`node tools/dis.js pc <vaddr>`；
- Ghidra/JDK 已删（省磁盘），需要时按 `tools/dl/ghidra.url`、`tools/dl/jdk.url` 重下。
