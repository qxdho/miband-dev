---
title: 表盘打包格式
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/13-表盘打包格式.md"
contributors: [miband-dev]
---

# 表盘打包格式

<StatusBadge status="sourced" verified="2026-10-25" />

表盘文件是自定义二进制容器，魔数 `5A A5 34 12`，不是 zip。格式的验收标准是能否逐字节复现官方产物：`tools/p67build.js` 对 `ref/canopus-mgr-10p-v65539.bin`（217,346 B）执行 `build` 后 `cmp` 无差异，格式不含猜测成分。

结论：10 Pro（p67）与 8 Pro 使用两代不同布局。早期 `.face` 与 Chaos 文件容器只作格式研究存档，用它们打出的包能被 AstroBox 读取，手环会拒装并返回 `InstallFailed`。

## 容器与扩展名

`.face` 与 `.bin` 魔数相同，仅扩展名不同，内部存在两代布局。

| 项 | 8 Pro 样本 `Accelerometer.face` | 10 Pro 容器（Chaos 实测） |
| --- | --- | --- |
| 记录表位置 | `0x148` 之后按自定义规则排 | 固定 `0x148` |
| 槽位上限 | 4 | 255 |
| 资源路径 | 必须带 `lua/` 前缀 | 任意 ASCII 路径 |
| 块间对齐 | 4 字节填充 | 无填充 |
| 预览块 tag | `0x400` | `0x410` |

Chaos 采用 4 槽布局，与槽位上限 255 不冲突：槽号只受一个字节限制，实际只用前 4 个。它装的是 `chaos_sup.ko`、安装器 Lua、应用图标与字体占位文件，内容不是表盘，因此使用 `.bin` 扩展名，避免被当作表盘直接渲染。

## 8 Pro `.face` 布局

```
0x000  文件头 0xA8 字节
0x0A8  face header 0x58 字节 = 11 组 (u32 count, u32 offset)
0x100  基础元素定义表        1 项 × 16 字节
0x110  脚本资源定义表        N 项 × 16 字节
...    基础元素属性（props） 32 字节
...    脚本资源块            每块 4 字节对齐
...    预览图块
```

各区实际位置由 face header 的 `offset` 字段给出，不写死，上表数字是样本取值。

### 文件头（0x00 至 0xA7）

| 偏移 | 类型 | 含义 | 样本值 |
| --- | --- | --- | --- |
| 0x00 | u32 | 魔数 | `5A A5 34 12` |
| 0x10 | u32 | 设备/类型标志 | `0x800` |
| 0x1C | u16 | 表盘数量 | 1 |
| 0x1E | u16 | 样式数量 | 0 |
| 0x20 | u32 | 预览图块偏移 | `0x11E50` |
| 0x28 | 9 B | 数字 ID（ASCII） | `"167210065"` |
| 0x68 | 60 B | 表盘名（ASCII，`\0` 补齐） | `"Accelerometer"` |

### face header（0xA8 起，11 组）

| 组 | 相对偏移 | 含义 |
| --- | --- | --- |
| 0 | +0x00 | 预览（count 恒 0，offset = 预览块） |
| 1 | +0x08 | 基础元素定义表 |
| 6 | +0x30 | 脚本资源定义表 |
| 其余 | 无 | 样本中 count 全为 0 |

### 定义项（16 字节）

```
+0   u16  index
+3   u8   type     0 = 基础元素，5 = 脚本/资源
+8   u32  offset   指向数据
+12  u32  length   未对齐的原始长度
```

### 资源块

```
+0    u32  低 24 位 = 内容长度，高 8 位 = 文件名长度
+4    16 B 全 0
+20  文件名 ASCII，形如 "lua/main.lua"（带 lua/ 前缀）
+..  内容原文
```

块与块之间按 4 字节对齐，填充 0；定义项的 `length` 记的是对齐前的长度。

`type=5` 表示「`lua/` 目录下的一个文件」，不限于 `.lua`。样本中的图片 `cat.bin` 同样是 `type=5`、名为 `lua/cat.bin` 的资源块，因此 `.ko` 模块可以作为兄弟资源一起塞进容器。

### 根元素绑定

基础元素 props 的前 4 字节 = `{ u16 defIndex, u16 defType }`，指向作为根的资源。样本值为 `02 00 00 05`，即第 2 项 `lua/main.lua`，类型 5。打包器默认把 `main.lua` 放在 index 0 并写入 `00 00 00 05`。

### 预览图块

12 字节头加负载，字段依次为 `sign(u8) flags(u8) compress(u8) ?(u8) width(u16) height(u16) length(u32)`。样本尺寸 `230×328`，`length=25813`。当前打包器原样复用样本的预览块，缩略图仍是 Accelerometer 的截图，不影响运行。

## p67 布局（10 Pro）

p67 格式以官方 Canopus 管理器安装包为基准反推：

| 项 | 值 |
| --- | --- |
| 基准文件 | `ref/canopus-mgr-10p-v65539.bin`（217,346 B） |
| 来源 | `Searchstars/Canopus-Manager-AstroBox-Release` 的 `manifest_v2.json`，`downloads.xmb10p` 指向该文件，`restype` 为 `canopus` |
| 生成器 | `tools/p67build.js`，提供 `inspect` / `build` / `verify` |
| 验收标准 | `build` 逐字节复现官方包 |

| 偏移 | 内容 |
| --- | --- |
| `0x000` | 主头 0xA8：magic `0x1234A55A`，`0x04` 版本 `0x00010003`，`0x10` 设备标记 `0x800`，`0x14` `0x00010000`，`0x1C` u16 表盘数，`0x1E` u16 风格数，`0x20` 预览图偏移，`0x28` 12 字节 ID，`0x68` 60 字节名称 |
| `0x0A8` | 11 × (u32 count, u32 offset) 面孔指针对 |
| `0x100` | 72 字节风格名，官方为 `样式1` |
| `0x148` | 基础定义表（pair[1]），16 B/条 |
| `0x158` | 脚本/资源定义表（pair[6]），16 B/条 |
| 表后 | 根属性记录 16 B，与定义同构：u16 index、u8 保留、u8 类型（5 = Lua） |
| 其后 | 预览图块：12 B 头（`0x10`、`0x04`、宽 u16、高 u16、长度 u32）加数据 |
| 其后 | 资源块首尾相接，无对齐 |

单风格表盘的指针对取值：

```
pair[0]  = [0x80000000, 预览图偏移]
pair[1]  = [1, 0x148]          基础定义表
pair[2..5] = [0, 脚本定义表偏移]
pair[6]  = [N, 脚本定义表偏移]
pair[7..10] = [0, 根属性偏移]
```

与 8 Pro `.face` 的关键差异：

| 项 | 8 Pro `.face` | p67 |
| --- | --- | --- |
| `pair[0].count` | `0` | `0x80000000` |
| 版本字段 | 无 | `0x00010003` |
| 预览图尺寸 | `230×328` | `336×480`，`230×328` 会被拒 |
| 资源名前缀 | `lua/` | `_lua/<设备目录>/` |

### p67 资源块

20 字节头：`u32 = dataLen | (nameLen << 24)`，随后 16 个零字节，然后 ASCII 名，然后数据。定义中的 `length` 是整块长度 `20 + nameLen + dataLen`。

官方包的四个块可直接对照：

```
_lua/xiaomi-band-10-pro/main.lua                                            14,174 B
_lua/xiaomi-band-10-pro/canopus_supervisor-xiaomi-band-10-pro-3.101.036.bin 71,880 B
_lua/xiaomi-band-10-pro/canopus_supervisor-xiaomi-band-10-pro-3.101.043.bin 71,864 B
_lua/xiaomi-band-10-pro/manager_icon.bin                                    54,768 B
```

官方 `main.lua` 用 `SCRIPT_PATH .. "manager_icon.bin"` 读取同目录资源，并用 `os.execute` 执行 shell。自带的 `.ko` 按 `_lua/<设备目录>/tunprobe.ko` 放入资源块后，脚本中 `SCRIPT_PATH .. "tunprobe.ko"` 即可读到。

## 打包器

8 Pro 样本的打包器为 `tools/facebuild.js`：

```
node tools/facebuild.js inspect   <file.face>          # 打印全部结构
node tools/facebuild.js roundtrip                       # 自检：必须 0 字节差异
node tools/facebuild.js build <spec.json> <out.face>
```

`spec.json` 的字段：

```json
{
  "template": "../../../../../ref/lua-wf/Accelerometer.face",
  "name": "TUN Probe",
  "id": "167210065",
  "deviceFlag": 2048,
  "entryIndex": 0,
  "scripts": [
    { "name": "lua/main.lua", "path": "main.lua" },
    { "name": "lua/tunprobe.ko.bin", "path": "tunprobe.ko.bin" }
  ]
}
```

产物为 `projects/canopus/watchfaces/tunprobe-installer/xiaomi-band-10-pro/tunprobe.face`（31,372 B）。

Chaos 容器使用 `tools/containerbuild.js`：

```
node tools/containerbuild.js inspect <file>
node tools/containerbuild.js build <spec.json> <out.bin>
```

产物 `tunprobe.bin`（31,422 B）：`recEnd=0x188`，2 条记录，预览块 `230×328`。

p67 的打包器为 `tools/p67build.js`，提供 `inspect`、`build`、`verify` 三个子命令。

## 逐字节验证

验证方式是把官方样本作为输入，重新打包后用 `cmp` 比对，差异必须为 0 字节。8 Pro 样本的期望输出：

```
roundtrip OK: 99124 B, 0 byte diff
```

复现命令：

```bash
cd <研究环境>
node tools/facebuild.js roundtrip                     # 期望: roundtrip OK: 99124 B, 0 byte diff
node tools/facebuild.js build \
  projects/canopus/watchfaces/tunprobe-installer/xiaomi-band-10-pro/spec.json \
  projects/canopus/watchfaces/tunprobe-installer/xiaomi-band-10-pro/tunprobe.face
node tools/facebuild.js inspect \
  projects/canopus/watchfaces/tunprobe-installer/xiaomi-band-10-pro/tunprobe.face
```

p67 的验收同样以 `cmp` 为准，输出 217,346 B 完全一致即通过。

结构自检由 `containerbuild.js` 的 `verify` 子命令完成：

```
node tools/containerbuild.js verify <file.bin>...
```

校验项包括：魔数、`0xAC == recEnd`、记录表首条形状、尾记录位置、槽号连续、每条记录与前一块首尾相接、记录长度与 blob 内嵌长度自洽、预览块不越界、文件尾部无多余字节。三个包的结果：

```
OK probe-a.bin   27250 B  1 条
OK probe-b.bin   32559 B  2 条
OK tunprobe.bin  32850 B  2 条
```

## 校验项与状态

| 项 | 结论 | 状态 |
| --- | --- | --- |
| 容器布局、定义表、资源块、对齐规则 | 样本逐字节重现 | 已证实 |
| `type=5` 可放非 `.lua` 文件 | 样本含 `cat.bin` | 已证实 |
| `lua/` 前缀必需 | 样本全部带前缀 | 已证实 |
| p67 布局 | 官方包 `cmp` 无差异 | 已证实 |
| 10 Pro 接受 `deviceFlag=0x800` | 567 无法编码成位，该字段疑似与机型无关 | 推断 |
| 预览图尺寸必须匹配屏幕 | 当前复用 336×480 机型的 230×328 缩略图 | 待定 |
| 未签名表盘可直接安装 | 取决于 AstroBox 是否做签名校验 | 待定 |
| 预览块 tag `0x400` 与 `0x410` 的差异 | tag 不符最多导致缩略图不显示 | 推断 |

## 常见错误

| 现象 | 原因 | 处理 | 严重度 |
| --- | --- | --- | --- |
| AstroBox 可读，手环拒装并返回 `InstallFailed` | 用 8 Pro `.face` 或 Chaos 容器投给 p67 | 改用 `tools/p67build.js` 出包 | 高 |
| 缩略图不显示 | 预览块 tag 或尺寸不符，p67 要求 `336×480` | 按 p67 布局写 12 字节头 | 低 |
| 装上后不显示 | 资源名缺 `_lua/<设备目录>/` 前缀 | 补全资源路径 | 中 |
| 桌面控件位置未定义 | `lvgl.ALIGN.TOP_MID` 一类取值无独立 token，取到 `nil` | 改为绝对坐标 `x`、`y`，仅保留 `ALIGN.CENTER` | 中 |
| 开机白屏或无限重启 | 表盘开机即加载，脚本在加载期抛错 | 加载期不执行任何动作，动作放在按钮回调内并用 `pcall` 包裹 | 高 |
| 反复触发同一动作 | 按钮状态未做闸门 | 用 `run_attempted` 限制每次开机只触发一次 | 中 |

`lvgl.ALIGN.TOP_MID`、`BOTTOM_MID`、`BOTTOM_LEFT`、`LEFT_MID` 在固件字符串表中没有独立 token，取值可能为 `nil`；`CENTER`、`OUT_TOP_MID`、`OUT_TOP_LEFT`、`OUT_BOTTOM_MID` 存在。

## 相关页面

- 表盘的能力与安装前提：[表盘](/watchface/)
- 通过官方安装通道投递容器：[Canopus](/native/canopus)
- 固件包与分区布局：[固件包格式](/firmware/package)
- 逆向取得格式依据的方法：[逆向工具](/tools/reversing)
