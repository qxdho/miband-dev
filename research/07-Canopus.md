# 07 · Canopus

## 本文讲什么

Canopus 是一个第三方的手环模块加载框架。它对这个项目的价值只有一句话：**它已经把"怎么把一段自己写的代码塞进 10 Pro 并让内核执行"这件事做完了**，而且它的目标包里记录的固件哈希和本机镜像**完全一致**。

**结论**：Canopus 支持 `3.101.043`，加载器参数、259 条符号、55 个 veneer 都是现成的。它的证据质量参差不齐（模块加载链路证据扎实，网络符号证据是空的），但作为"加载机制"的参照物已经足够。

## 它是什么

| 项 | 值 |
|---|---|
| 仓库 | `github.com/AstralSightStudios/Canopus` |
| 许可 | AGPL-3.0 |
| 规模 | 约 2646 个文件 / 25 MB |
| 语言 | Rust（管理器、运行时）+ C（模块）+ Lua（安装器） |
| 定位 | 手环上的模块加载器 + 应用运行时（可跑 Lua 表盘） |

官方文档（`abox.run/docs/usage/canopus`）里的原话：

> Vela 基于 NuttX，通过 Lua 表盘调用 NuttX Shell，通过 `insmod` 载入内核模块。

> 模块加载是一次性的，重启后失效。

这两句和 [06 篇](06-内核模块系统.md)的结论完全对得上，也确认了 `persistent_autoload = false` 不是我读错。

## 仓库结构

| 目录 | 大小 | 作用 |
|---|---:|---|
| `targets/` | 20 MB | **各机型各固件版本的 target pack（关键）** |
| `sdk/` | 1.2 MB | 模块开发 SDK（Rust 42 文件 + C 4 文件） |
| `manager/` | 652 KB | 管理器应用（48 个文件） |
| `tools/` | 660 KB | 工具链（56 个文件） |
| `scripts/` | 468 KB | 构建脚本 |
| `watchfaces/` | 420 KB | Lua 表盘，含安装器 |
| `docs/` | 296 KB | 架构、符号证据、目标包编写指南 |
| `runtime/` | — | `control` / `diagnostics` / `lifecycle` / `loader` / `module` / `resources` |
| `modules/refs/examples` | — | `hello.c` + `hello_platform.h` + `build.sh` + `package.json` |
| `abi/schema` | — | ABI 描述 |

`modules/refs/exampleshello.c` 就是 [06 篇](06-内核模块系统.md)里"最小验证模块"的现实版本——框架自带了一个可编译的 hello 模块。

## 与本机固件的精确匹配

`targets/` 下有 8 个目标包：

```
xiaomi-band-10-pro-3.101.036      xiaomi-band-9-3.1.32
xiaomi-band-10-pro-3.101.043      xiaomi-band-9-pro-3.1.175
xiaomi-band-11-4.100.139          xiaomi-p65-3.100.043
xiaomi-band-11-4.100.155
xiaomi-band-11-4.100.177
```

`xiaomi-band-10-pro-3.101.043/target.toml` 里：

```toml
firmware_sha256  = "519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec"
firmware_version = "3.101.043"
firmware_build   = "CONBINE_LTALM078_T3.101.043_08041658"
```

我们手上的 `firmware/10pro/fwx/vela_ap.bin` 哈希正是

```
519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec
```

**逐字节一致。** 这不是"大概是这个版本"，是"就是这一份镜像"。所有 target pack 里的地址都直接适用于本机。

> 这也说明 Canopus 的做法是对的：地址按固件哈希分组，换版本换一整套符号，而不是指望地址稳定。

## target pack 里有什么

| 内容 | 数量 | 说明 |
|---|---:|---|
| `symbols/*.json` | **259** | 每条含名字、类型、原型、地址、证据 ID、状态 |
| `generated/canopus_veneer.h` | 660 行 / **55 个** veneer | 硬编码地址的 `static inline` 函数 |
| `types/` | — | 结构体布局描述 |
| `evidence/*.json` | **36** | 证据记录（另有 `fw-match/`、`failure-feedback/` 两个目录） |
| `target.toml` | — | 加载器参数、能力清单、重定位表 |

### 能力清单

`capabilities` 里明确列了：

```toml
capabilities = [
  "identity-guard", "clock.gettime",
  "char-device.register", "char-device.unregister",   # ← 建 /dev 节点
  "control-abi", "classic.adapter", "classic.l2cap", "classic.sdp",
  "bt.timer", "native-app.register", "launcher.entry", "ui.dispatch",
]
```

`char-device.register` / `char-device.unregister` 正是创建 `/dev/tun` 需要的那一项——框架自己就把这条能力当成一等公民列了出来。

## 安装器怎么工作

`watchfaces/canopus-installer-prod/xiaomi-band-10-pro/main.lua`（400 行）是整套机制的入口。关键片段：

```lua
local DEVICE_PATH     = "/dev/canopus"
local MODULE_MIN_SIZE = 512
local MODULE_MAX_SIZE = 262144
local EXPECTED_MAGIC  = 0x43505331 -- "CPS1"

local function run(cmd) return os.execute(cmd) end

-- 1. 读版本
local command = string.format("getprop %s > %s", PROP, FIRMWARE_VERSION_OUTPUT)
-- 2. 按版本选模块路径
local firmware_version = detect_firmware_version()
if firmware_version then MODULE_PATH = module_path_for(firmware_version) end
-- 3. 校验尺寸与魔数
local size = ...  if size < MODULE_MIN_SIZE or size > MODULE_MAX_SIZE then ... end
local words = ... if not words or words[1] ~= EXPECTED_MAGIC then ... end
-- 4. 写入 /dev/canopus 并加载
local inserted = run(string.format("insmod %s %s", shell_quote(MODULE_PATH), MODULE_NAME))
```

### 从这段代码能确认的事

| 事实 | 意义 |
|---|---|
| `os.execute` 可用 | **Lua 能执行 shell 命令**，这是整条链路的支点 |
| `getprop` 可读固件版本 | 安装器能按版本选模块 |
| 模块有 `CPS1` 魔数头 | 模块不是裸 ELF，外面包了一层容器 |
| 尺寸 512 B – 256 KB | 驱动 10–20 KB 完全够 |
| `insmod <path> <name>` | 与 `target.toml` 的 `load_command` 一致 |
| 写入 `/dev/canopus` | 一个自定义字符设备，由 supervisor 模块提供 |

`CPS1` 头说明**模块文件 = `CPS1` 容器 + ELF32 ET_REL**。自己写驱动时要按这个格式打包，不能直接塞 `.ko`。

## 证据质量评估

target pack 的 `target.toml` 开头自己写着：

```toml
# Static exact-IDB recovery; device gates remain pending.
```

即：**所有结论都来自静态逆向，没有一条在真机上验证过。**

### 扎实的部分

`evidence/EVID-MODLIB-1043-001.json` 这一条质量很高，直接定位了 `insmod` 的实现：

| 结论 | 证据 |
|---|---|
| `0x0C203A50` 是两参数插入 veneer | `PUSH {R7,LR}; ADD R7,SP,#0; BL sub_C1E8650; POP {R7,PC}`，原样透传两个 AAPCS 参数 |
| `0x0C1E8650` 是 `modlib_insert` | 内嵌源文件名 `../../nuttx/libs/libc/modlib/modlib_insert.c` |
| 它做了完整的加载流程 | 校验参数 → 分配镜像 → **应用重定位 → 调用构造函数** → 返回句柄 |
| 调用点 | `sub_C23EC54` 取 path + name，失败时用 errno 格式化 `insmod` 诊断 |
| 推翻了一个旧候选 | `sub_C1C5F34` 实际是 `fs_munmap` 的包装，与模块加载无关 |

这条证据的价值在于：它**同时确认了 modlib 在固件里、insmod 的入口在哪、重定位和构造函数确实被执行**。这是 [06 篇](06-内核模块系统.md)最担心的一环。

### 虚的部分

网络相关的符号（`netdev_register`、`netdev_input`、`ipv4_input`、`socket`…）全部引用同一个证据 ID：

```
"evidence_ids": ["EVID-NET-001"]
```

但是 `evidence/` 目录里**没有 `EVID-NET-001.json`**（36 个文件里没有它）。也就是说这批符号的证据链是**断裂**的——它们大概是靠"同版本 NuttX 源码 + 调用邻域比对"批量恢复的，没有逐条审计。

| 符号组 | 证据状态 |
|---|---|
| 模块加载（insmod / modlib） | ✅ 扎实，有独立证据、有反汇编、有源码串 |
| 蓝牙（`EVID-BT-1043-*`，11 条） | ✅ 有专门证据，还纠正过错误候选 |
| UI / LVGL（`EVID-UI-*`，6 条） | ✅ 有 |
| **网络（`EVID-NET-001`）** | ❌ **证据文件缺失** |

**实操含义**：用 Canopus 的加载机制是安全的；用它恢复的网络符号**必须先自己验证一遍**再依赖。验证方法见 [10 篇](10-工具链与复现.md)：反汇编函数体，看是否出现预期的系统调用或数据结构访问。

## 能直接拿来用的东西

| 产物 | 用途 |
|---|---|
| `targets/xiaomi-band-10-pro-3.101.043/target.toml` | 加载器参数、重定位表 —— **写模块的规格书** |
| `generated/canopus_veneer.h` | 55 个硬编码 veneer，含 `register_driver`、`netdev_register` |
| `symbols/*.json` | 259 条符号记录 |
| `modules/refs/exampleshello.c` + `build.sh` | 最小模块模板 |
| `watchfaces/canopus-installer-prod/*/main.lua` | 交付与加载的现成脚本 |
| `manager/` 源码 | 管理器 UI（也是 [09 篇](09-LVGL-与界面.md)分析的对象） |

## 风险

| 风险 | 说明 |
|---|---|
| **AGPL-3.0** | 派生作品要开源；自己写的驱动如果链接了 Canopus 的运行时，可能有传染性 |
| **纯静态恢复** | 一个地址错就是 HardFault，作者自己也标注 `device gates remain pending` |
| **模块格式私有** | `CPS1` 容器格式需要按安装器代码复刻 |
| **版本强绑定** | 升级固件后整套地址失效 |
| **来源可信度** | 第三方逆向成果，不能当作官方 ABI 保证 |

关于 AGPL：如果只是**参考**它的 `target.toml` 和地址，自己独立写驱动，通常不构成派生；但如果直接链接它的运行时库，就要按 AGPL 处理。这一点在动手前应该想清楚。

## 未决问题

| 问题 | 状态 |
|---|---|
| Canopus 在 `3.101.043` 真机上是否真的成功跑过 | ❓ 文档说支持，但 `device gates remain pending` |
| `CPS1` 容器的完整格式 | ❓ 只从安装器看到魔数、尺寸范围 |
| `/dev/canopus` 由谁创建 | ⚠️ 推断由 supervisor 模块创建 |
| 网络符号（`netdev_register` 等）的地址是否可信 | ❓ **必须自行验证** |
| Canopus 自己的 tun 驱动是否已存在 | ❓ 未见网络类模块 |
