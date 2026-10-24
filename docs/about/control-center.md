---
title: 控制中心与地址视图
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/16-逆向交接-控制中心与LVGL地址.md"
contributors: [miband-dev]
---

# 控制中心与地址视图

<StatusBadge status="sourced" verified="2026-10-25" />

控制中心注入线已封存：磁贴点击已定位到条目级，但 Chaos 只有资源替换能力，46 个磁贴各自持有独立回调，接管成本高于收益。

地址视图的纠正独立于该结论。主代码段、rodata、arc 段分别使用 `0x0C0C0000`、`0x2C0C0000`、`0x1BFB2BC0` 三套基址，16 号记录里的 `0x0C000000` 少了 `0xC0000`，这一偏差直接造成 LVGL 样式调用在真机上 HardFault。

## 结论

| 事项 | 结论 | 状态 |
| --- | --- | --- |
| 磁贴集合由 `control_center.settings` 决定 | 不成立，该键全镜像仅 1 处引用，属设置项注册 | 已推翻 |
| 磁贴集合与顺序 | 来自 `/data/app/ctrl/ctrl.db` 的 `orderlist_v001` 表 | 已证实 |
| 磁贴类型 | C 内枚举固定为 type 0..8，不能新增 | 已证实 |
| 磁贴点击位置 | 已定位到每个磁贴的注册点 | 已证实 |
| 用 Chaos 现有能力接管 | 不可行，受四条硬约束限制 | 已证实 |
| 方案 D 接管应用启动 | 只对二键磁贴有效，拦不住状态切换磁贴 | 推断 |
| 主代码段 A 视图基址 `0x0C000000` | 少了 `0xC0000`，应为 `0x0C0C0000` | 已推翻 |
| `0x1C07A258` 起 316 条跳板与 LVGL 9.1 导出符号的对应关系 | 未验证，成功率低于 50% | 待定 |

## 固件与三套地址视图

固件为 `firmware/10pro/fwx/vela_ap.bin`，13,795,728 字节。同一份字节在运行时有多套虚拟地址视图，按用途分开。

| 基址 | 用途 | 证据 | 判定 |
| --- | --- | --- | --- |
| `0x0C0C0000` | 主代码段，LVGL、应用、框架 UI | 全镜像 1,539,774 个奇数字中，`(W & ~1) - base` 落在 `analysis/fw-functions.csv` 函数起点的计数为 18894 | 采用 |
| `0x2C0C0000` | rodata、字符串 | 控制中心字符串簇 `file 0xAD6000–0xAD7000` 的 144 个字中，141 个 `W - 0x2C0C0000` 落在串起点 | 采用 |
| `0x1BFB2BC0` | arc 段及部分 LVGL 段 | `0x1C064068`（arc 构造函数，`off 0xB14A8`）在文件中确有 1 处字面量 `0x1C064069`；换成 `0x0C0C0000 + 0xB14A8` 则 0 处 | 采用，仅限 arc |
| `0x0C000000` | 16 号记录的原 A 视图 | 函数起点计数仅 375 | 已推翻 |
| `0x1C000000` | 无 | 函数起点计数 29 | 巧合量级 |
| `0x2C100000` | 无 | 串起点口径只剩个位数，统计峰值在 `0x2C0C0000` | 已推翻 |

换算关系：

```
VA_A      = 0x0C0C0000 + off
VA_rodata = 0x2C0C0000 + off
VA_arc    = 0x1BFB2BC0 + off = VA_A + 0x0FEF2BC0
```

16 号记录的 `VA_A = VA_B - 0xFB2BC0` 建立在 `0x0C000000` 上，基址修正后不再成立。`0x0C000000` 与 `0x1BFB2BC0` 的差值为 `0xFB2BC0`，正是漏掉 `0xC0000` 的来源。

### 换算的交叉验证

| 实例 | 文件偏移与字节 | 运行时地址 | 校验 |
| --- | --- | --- | --- |
| `obj_clear_state` | `file 0x4C8518`，8 字节跳板 `5ff800f0` 加目标 `0x1C028D39` | Chaos 使用 `0x0C58_8519`，`fw_addr 0x004C8518` | `0x4C8518 + 0x0C0C0000 = 0x0C588518`，加 Thumb 位得 `0x0C588519` |
| `obj_add_event_cb` | `file 0x4C83F0` | Chaos 使用 `0x0C58_83F1` | 控制中心应用段有 46 处 `bl 0x4c83f0` |
| arc 构造函数 | `off 0xB14A8`，字节 `f5b8…` 即 `push {r3-r7,lr}` | `0x1C064068` | 文件中 1 处字面量 `0x1C064069` |
| 样式派发尾段 | `off 0x107790`，字节 `69db 0bb1 9847 80bd`，即 `ldr r3,[r3,#0x1c]; cbz r3; blx r3; pop {r7,pc}` | `0x0C1C7790` | 16 号记录的 `0xc107790` 少了 `0xC0000` |

`fw.bin`（90MB）是加密或压缩的，`vela_resource.bin`（171MB）是纯资源，两者都不含可读代码。

## 已确认的 arc 地址

以下地址由 Chaos 在真机实测，使用 arc 段基址。

| 地址 | 用途 |
| --- | --- |
| `0x1C064068` | `lv_arc` 构造 |
| `0x1C064642` | `lv_arc` 绘制 |
| `0x1C0641EC` | `set_start` |
| `0x1C064334` | `set_end` |
| `0x1C064F0C` | `set_bg_angles`，写 `+0x40/+0x44` MAIN |
| `0x1C0650A0` | `set_rotation`，写 `+0x34` |
| `0x1C065154` | `set_value`，写 `+0x48` |
| `0x1C0652D4` | `set_range`，写 `+0x4C/+0x50` |
| `0xC028C85` | `obj_clear_flag` |

arc 字段布局：

| 偏移 | 类型 | 含义 |
| --- | --- | --- |
| `+0x34` | i32 | rotation |
| `+0x38/+0x3C` | f32 | INDICATOR 角 |
| `+0x40/+0x44` | f32 | MAIN 角 |
| `+0x48` | i32 | value |
| `+0x4C/+0x50` | i32 | min/max |
| `+0x54` | 未知 | mode |
| `+0x60` | 未知 | last_angle |

## 地址表与 LVGL 样式 API

`docs/地址表.csv` 中样式相关只有两条，两条都错。符号 JSON 的 `firmware_sha256` 与 `vela_ap.bin` 实测一致（`5193076756…56ec`），不是版本错配；其 notes 自述 `Address refreshed by trusted-036 caller-neighborhood ensemble v2`，地址被跨版本邻域推断刷新过。

| 表项 | 声明地址 | 实际位置 | 状态 |
| --- | --- | --- | --- |
| `lv_obj_set_local_style_prop` | `0xc107790` | 对应 `file 0x107790`，落在函数 `0x107780`（48 B）的 `+0x10`，是一条 16 字节的 `ldr r3,[r3,#0x1c]; cbz; blx r3; pop` 尾巴，真机应为 `0x0C1C7790` | 已证实 |
| `lv_obj_set_style_bg_opa` | `0xc108374` | 对应 `file 0x108374`，落在函数 `0x108354`（434 B）的 `+0x20`，位于 `beq #0xc1083da` 指令中间，`file_off` 本身就错 | 已证实 |

第一条声明地址实为虚方法派发器，把第 4 参数当对象解引用，selector 为 0 时从 `0x1C` 取指，真机 HardFault 并重启，已复现。第二条无法只靠基址修正救回。

若要复活样式线，先把 CSV 全表按 `+0xC0000` 重算候选 VA，再逐条用「落在函数起点」与「指令边界」筛选，剩下的才是真错表项。

## 跳板表

`0x1C07A258` 起有 316 条连续跳板，每条 8 字节：`5ff800f0`（`ldr.w pc,[pc,#0]`）加目标字。

| 项 | 值 |
| --- | --- |
| 起始地址 | `0x1C07A258` |
| 条目数 | 316 |
| 条目大小 | 8 字节 |
| 表内地址 `0x1C07AA40` | 源记录记为第 257 条；按 `(0x1C07AA40-0x1C07A258)/8` 计为 253 个槽位，序号口径待定 |
| 目标分布 | 多数在 `0x2Bxxxx`，该镜像不在 `fwx` 目录、`fw.bin`、`vela_resource.bin` 中；少数在 `0xC1F…`、`0xC3…`，可读 |

剩余两条做法：

1. 把 316 条跳板按顺序与 LVGL 9.1 导出符号顺序对齐，未验证，成功率低于 50%，状态为推断；
2. 本地编译 LVGL 9.1.0 做调用序列指纹。源码 `tools/dl/lvgl-9.1.0.tar.gz` 已解出 `src/`，工具链 `tools/dl/xpack-arm-none-eabi-gcc-15.2.1-1.1`，参数 `-O2 -mcpu=cortex-m33 -mthumb -mfloat-abi=hard -mfpu=fpv5-sp-d16 -DLV_CONF_SKIP`，已验证可编译 `lv_obj_style.c`。

## 已排除的错路

| 错路 | 结论 | 状态 |
| --- | --- | --- |
| 名字串表 `0x1CBD2EEC` 起（`lv_obj_set_prop` 等） | 死数据，全镜像无指针指向，ADR 扫描仅 1 处自引用 | 已推翻 |
| 「表少写 `0x10000000`」的别名假说 | 换算后是别的函数，假说不成立 | 已推翻 |
| `b.w` 目标直方图（2439 条） | 最高仅 22 入边，无「几十个包装共享尾跳转」族，包装已内联 | 已证实 |
| `movs r1,#imm + bl` 组合 | 头名 `0xC688864` 是堆分配器，纯噪声 | 已证实 |
| 「字符串无引用」 | 被错误基址误导：`control_center.settings`、`orderlist_v001` 在 `0x0C000000`、`0x1BFB2BC0`、`0x2C100000` 下均 0 命中，换 `0x2C0C0000` 立即有 1 至 5 处 | 已推翻 |
| 地址投票判据 | 必须允许后缀合并，指针可指向长串中间，例如 `"false"` 在 `"...true -> false"` 里 | 已证实 |
| 单点命中 | 指令字节巧合会造出大量假指针，必须做全集统计并比较多个基址的量级，18894 与 1252 的差距即判据 | 已证实 |
| `0x2C100000` | 个别 word 落在串起点，但统计峰值在 `0x2C0C0000` | 已推翻 |
| `dis.js` 参数 | 必须是带 `0x` 的十六进制串，十进制会被 `parseInt(x,16)` 误读，报 `RangeError: offset is out of bounds`（`HEAP8.set` / `writeArrayToMemory`） | 已证实 |
| 线性反汇编 | 遇函数内字面量池会跑飞，例如 `0x55BEEC`、`0x55D704`；看到解出的指令把 `0x2cxxxxxx`、`0x0cxxxxxx` 常量当操作数时，从 `b`、`bl` 目标续 | 已证实 |
| `analysis/*.csv` 的 `va` 列 | 伪基址 `0x1BFB2BC0 + off`，只有 `file_off` 列可信 | 已证实 |

## 控制中心的两段代码

| 区域 | 文件偏移 | 身份 | 关键引用 |
| --- | --- | --- | --- |
| 框架控制中心页 | `0x442000–0x455000` | framework 的 CC 页，Canopus 记的 `0x0c504c20` 等于 `file 0x444C20`，同一基址体系 | `/data/app/ctrl/ctrl.db`、`orderlist_v001`、`add.bin`/`delete.bin`、`control_edit.ctl_center`、`com.xiaomi.miwear.control_center` |
| miwear 控制中心应用 | `0x55B8F0–0x564000` | 原生 C 应用，日志串 `" %s: page_main create"` 在 `file 0xAD6EF0`，引用点 `0x55EEEC` | `raise_open.bin`、`raise_bright_open.ctrl`、`wristlift.settings`、`flashlight.appname`、`name.find_phone` |

两段代码引用同一个字符串池 `file 0xAD6000–0xAD6F00`，磁贴清单的持久化只在前者。

控制中心是原生 C 应用，源文件为 `../../vendor/xiaomi/miwear/apps/applications/control_center/page_main.c`，包名 `com.xiaomi.miwear.control_center` 位于偏移 `0xAD6AD0`。应用带编辑模式，标识为 `control_center_edit`，图标为 `add.bin` 与 `delete.bin`，用户可以增删磁贴。

Chaos 已能替换其图标，实现位于 `supervisor/src/res_hook.rs:79-91`。Canopus 记录了 `private_abi.control_center_scroll = 0x0c5036c5`，对应列表滚动。

## 磁贴清单来自 DB

| 字符串 | `file` 偏移 | 引用点 |
| --- | --- | --- |
| `/data/app/ctrl/ctrl.db` | `0xAD696C` | `0x443368`、`0x4433C0`、`0x4433FC` |
| `orderlist_v001` | `0xAD695C` | `0x44336C`、`0x4433C4`、`0x4433F8`、`0x45342C`、`0x454154` |
| `control_edit.ctl_center` | `0xAD6C68` | `0x4449CC`、`0x444FD8` |
| `control_center.settings` | `0xAEA38C` | 仅 1 处：`0x4918C4`，属函数 `0x4918CC` 的字面量池，同池有 `0xAEA3A4` 附近的 lable 键 |

`0x44338A` 执行 `bl 0x9fe7ac("…/ctrl.db", "orderlist_v001")` 读表，同函数 `0x4433A8` 写回，`0x443404` 重置默认顺序。磁贴「有哪几个」由 DB 的 `orderlist_v001` 决定，`control_center.settings` 只是一个设置项 KV 键。16 号记录的旧结论已推翻。

## 磁贴描述结构

`file 0x4424C0` 是描述初始化函数，442 字节，序言 `push {r4,r5,r7,lr}`，入口执行 `memset(desc, 0, 0x28)`。

```c
void tile_desc_init(struct tile_desc *d /*r0*/, int type /*r1*/);   // type 0..8，>8 直接返回
```

结构 `sizeof = 0x28`：

| 偏移 | 内容 | 写入方式 |
| --- | --- | --- |
| `+0x00` | 8 字节「标签/名字」二元组 | `bl 0x3FED68(id, buf8)` 后经 `ldrd`/`stm` 搬入；`id`：game_mode 为 `0x16`、disturb 为 `9`、alarm 为 `4`、raise 为 `5`、bright 为 `6` |
| `+0x08`、`+0x0C` | 图标路径两枚，初始同值 | `strd r3, r3, [d, #8]`，`r3` 是字符串字面量 |
| `+0x10` | open 键 | `0x125C38(keystr)` 的返回值，`str r3,[d,#0x10]` |
| `+0x14` | close 键 | 同上 |
| `+0x18` | 第三键，settings、appname 或 sport | 同上；二键磁贴止于此 |
| `+0x24` | 可选 handler | 仅 disturb 写入 `0x0C502695`，等于 `file 0x442694` |

## 九类磁贴

| # | 图标 | 键 1 | 键 2 | 键 3 |
| --- | --- | --- | --- | --- |
| 0 | `0x44260C` `.../game_mode.bin` | `game_mode_open.ctrl` | `game_mode_close.ctrl` | `game_mode.sport` |
| 1 | `0x44261C` `.../disturb_open.bin` | `not_disturb_open.ctrl` | `not_disturb_close.ctrl` | `disturb.settings` |
| 2 | `0x442630` `.../alarm_all.bin` | `alarm.appname` | 无 | 无 |
| 3 | `0x442638` `.../raise_open.bin` | `raise_bright_open.ctrl` | `raise_bright_close.ctrl` | `wristlift.settings` |
| 4 | `0x442648` `.../flashlight_all.bin` | `flashlight.appname` | 无 | 无 |
| 5 | `0x442650` `.../findphone_all.bin` | `name.find_phone` | 无 | 无 |
| 6 | `0x442658` `.../setting_all.bin` | `settings.appname` | 无 | 无 |
| 7 | `0x442660` `.../battery_all.bin` | `longlife.ctrl` | 无 | 无 |
| 8 | `0x442668` `.../bright_open.bin` | `always_bright_open.ctrl` | `always_bright_close.ctrl` | `display_on.sport` |

`dnd_0.bin`（`0x442690`）与 `dnd_%d.bin`（`0x442758`）是勿扰动画图标，不在 9 类表里。

相邻两个小函数：

- `file 0x44267A`，26 字节：从 `*(u32*)r0` 取对象，写全局 `0x2010FE0C` 的字节，执行 `bl 0x443C78(obj, "dnd_0.bin")`，强制复位勿扰图标；
- `file 0x442694`，128 字节：勿扰动画 `(obj, ev)`，按全局 `0x2010FE0C`（dnd 进行中标志）与 `ev` 在 `add_state`、`0x443C78`、定时器 `0x4C7CE0` 之间切换。

## 46 个点击回调

`obj_add_event(obj, cb, filter, udata)` 即 `lv_obj_add_event_cb`，跳板 `file 0x4C83F0`，VA `0x0C5883F0`；`filter = 7` 对应 `LV_EVENT_CLICKED`。

控制中心应用段共有 46 处注册点，源记录列出其中 40 处：

| 注册点 | 注册点 | 注册点 | 注册点 |
| --- | --- | --- | --- |
| `0x551D14` | `0x551DE8` | `0x551FA8` | `0x5520BC` |
| `0x552398` | `0x5527AC` | `0x5532AC` | `0x5534D8` |
| `0x553BC0` | `0x5542F4` | `0x5585D4` | `0x558A58` |
| `0x559D94` | `0x55A2B8` | `0x55A2C4` | `0x55A810` |
| `0x55B374` | `0x55B380` | `0x55B778` | `0x55BA70` |
| `0x55BF44` | `0x5602D8` | `0x5604AC` | `0x560D04` |
| `0x562614` | `0x562628` | `0x562634` | `0x5627AC` |
| `0x5627C0` | `0x5627CC` | `0x562874` | `0x562888` |
| `0x562894` | `0x563BBC` | `0x5643E8` | `0x564A24` |
| `0x566694` | `0x566A08` | `0x5674D4` | `0x567DF8` |

注册形态见 `0x55B36C`：`r3 = udata`、`r2 = 7`、`r0 = obj`、`r1 = cb|1`，随后 `bl 0x4C83F0`。回调是同一字面量池里的常量，例如 `0xC61ACC` 对应 `file 0x55ACCC`。

完整例子为 `file 0x55ACCC`（计时器磁贴，184 字节）：`push{r4,r5,r7,lr}`，`bl 0x4C8210` 取 `lv_event_get_code`，`cmp r0,#7` 后非点击即返回；点击后调用 `0x31AE94(0x2CB87D88, 1)`、`0x5580E8()`（取计时器会话，全镜像仅 2 个调用者：本函数与 `0x55BDF4`）、`0x5581D4(r5)`、`0x557448()`，失败分支打印 `" %s: run page create"`、`" enter state:%d"`、`"session create failed"`。

## 注入切入点

| 路线 | 要改什么 | Chaos 现状 | 风险与范围 |
| --- | --- | --- | --- |
| A 换单个磁贴回调 | 该磁贴注册处 `r1` 的字面量池 word，`0xC61xxxx` 型 | 不可，需要写 rodata | 最局部，但需要可写映射 |
| B 接管 `desc->handler`（`+0x24`） | `0x4424C0` 的 disturb 分支 | 不可，同上 | 只对勿扰有效，价值低 |
| C 换 `type` 到建磁贴函数的表 | 待找，即 `0x4424C0` 的调用链 | 不可，位置未知 | 效果最大，定位不了 |
| D 接管 app 启动 | `app_launcher_*`（`0x0C513A44`、`0x0C513B2C`）与 `/data/apps.json` 注册表 | 部分可用，`appmgr.rs` 已有注册表链与 `app_launcher_add/del` | 只对二键磁贴 alarm、findphone、settings、flashlight 有效，拦不住状态切换磁贴 |

四条硬约束：

| 约束 | 证据 |
| --- | --- |
| 能力边界是资源替换，不是代码补丁 | `supervisor/src/res_hook.rs` 的 106 条 `Rule { dir, name, stem }` 只替换 `/resource/...` 下的图；页面能力在 `fw_api`，用于注册 page/row 回调；全仓没有写 `.text` 或改字面量池的设施，而接管点击的第一步就是替换只读字面量池里的回调指针 |
| 没有统一分发器 | 应用侧 46 处 `lv_obj_add_event_cb(obj, cb, 7, udata)`，每个磁贴一个专属回调，回调地址是各自函数的字面量池常量，没有按 `app_id` 查表的总开关 |
| 入口函数在文件中断链 | `file 0x4424C0` 无 `bl` 调用者，也无字面量指向它，`0x0C4424C1`、`0x1C3F5081`、`0x2C5025C1` 全 0 命中，绑定在运行期或 RAM 中建立 |
| 写 flash 有事故先例 | 真机改固件代码需要内核模块级写权限，`920e5e3`（清 arc INDICATOR）已导致真机重启，收益与风险不成比例 |

## 封存结论

结论是封存。除非具备运行期修改固件 `.text` 或字面量池的能力，或改用注册同名应用的旁路，否则不重启这条线。磁贴结构保留给后续有兴趣的逆向工作。

若重启，最小验证清单为三项：

1. 静态查找 `0x4424C0` 的调用者。它没有 `bl` 也没有字面量，需从 RAM 里的函数指针表入手，或在真机对 `0x0C4424C0` 下断点、插桩，观察 `r1`（type）的来源与 `r0`（desc）的存放位置，拿到这一步才有 `type` 到磁贴对象的映射；
2. 确认二键磁贴 alarm、flashlight、findphone、settings 的点击是否走 `app_launcher_*`。若走，方案 D 可用，且不需要写 flash；
3. 只读打点：在 Chaos 中 dump 磁贴对象与 `desc`，不改任何数据，确认地址对得上，再评估写入风险。

## 同批的 arc 线

| 提交 | 内容 | 结果 |
| --- | --- | --- |
| `aa5d381` | MAIN/INDICATOR 写入纠正、`arc_set_progress` 等 | 保留 |
| `5b2cd35` | 底环加进度双层 | 依赖了错误的 `style_set` |
| `920e5e3` | 清 INDICATOR | 导致真机重启 |
| `94eb407` | 当前可用版，删除所有依赖 `0xC107791` 的调用；调试页 A 为 25%、B 为 75%、C 为 INDICATOR 整圈、D 为不写字段 | 可用 |

产物：`dist/chaos-installer-p67.bin` 的 sha256 为 `2750ab3e1fd6…633d`，`dist/chaos_sup.ko` 的 sha256 为 `da72f22a…bb91`。

未解项是 KNOB 圆点，位于 INDICATOR 末端正上方，样式挂在 style C（`theme+0x1B4`）。要隐藏必须能改样式，即回到 LVGL 样式 API 的地址恢复问题。藏圆点失败已封存。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| `file 0x4424C0` 的运行时调用者与 `type` 来源 | 待定，需真机断点或 RAM 函数指针表 |
| 二键磁贴是否走 `app_launcher_*`，决定方案 D 是否可用 | 待定 |
| `desc+0x24` 的 handler 只有 disturb 一类 | 已证实，价值低 |
| LVGL 样式地址能否按 `+0xC0000` 重算并筛出真错表项 | 待定 |
| 316 条跳板与 LVGL 9.1 导出符号的顺序对应 | 推断，成功率低于 50% |
| KNOB 圆点隐藏 | 待定，依赖样式写入能力 |

## 相关页面

- LVGL 控件与样式调用：[LVGL](/system/native/lvgl)
- 模块加载器与资源替换：[Chaos](/system/native/chaos)
- 地址表与反汇编工具：[地址表](/system/native/addresses)
- 内核模块的加载与 ABI：[内核模块系统](/system/native/modules)
