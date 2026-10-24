---
title: Canopus
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/07-Canopus.md"
contributors: [miband-dev]
---

# Canopus

<StatusBadge status="sourced" verified="2026-10-25" />

Canopus 的目标包记录的固件哈希与手环 10 Pro 的 `vela_ap.bin` 逐字节一致，包内地址因此可直接用于本机镜像。

结论：Canopus 支持 `3.101.043`，加载器参数、259 条符号记录、55 个 veneer 都是现成的。证据质量不均，模块加载链路扎实，网络符号缺少证据文件，依赖前需要自行验证。

## 概况

| 项 | 值 |
| --- | --- |
| 仓库 | `github.com/AstralSightStudios/Canopus` |
| 许可 | AGPL-3.0 |
| 规模 | 约 2646 个文件 / 25 MB |
| 语言 | Rust（管理器、运行时）、C（模块）、Lua（安装器） |
| 定位 | 模块加载器与应用运行时，可运行 Lua 表盘 |

官方文档（`abox.run/docs/usage/canopus`）写明，Vela 基于 NuttX，通过 Lua 表盘调用 NuttX Shell，再由 `insmod` 载入内核模块；模块加载是一次性的，重启后失效。这两点与[内核模块系统](/native/modules)中 `persistent_autoload = false` 的结论一致。

## 仓库结构

| 目录 | 大小 | 作用 |
| --- | ---: | --- |
| `targets/` | 20 MB | 各机型各固件版本的 target pack |
| `sdk/` | 1.2 MB | 模块开发 SDK，Rust 42 个文件、C 4 个文件 |
| `manager/` | 652 KB | 管理器应用，48 个文件 |
| `tools/` | 660 KB | 工具链，56 个文件 |
| `scripts/` | 468 KB | 构建脚本 |
| `watchfaces/` | 420 KB | Lua 表盘，含安装器 |
| `docs/` | 296 KB | 架构、符号证据、目标包编写指南 |
| `runtime/` | 未标注 | `control`、`diagnostics`、`lifecycle`、`loader`、`module`、`resources` |
| `modules/examples/` | 未标注 | `hello.c`、`hello_platform.h`、`build.sh`、`package.json` |
| `abi/schema` | 未标注 | ABI 描述 |

`modules/examples/hello.c` 是框架自带的可编译最小模块，对应[内核模块系统](/native/modules)中的最小验证模块。

## target pack 与固件匹配

`targets/` 下有 8 个目标包：

```
xiaomi-band-10-pro-3.101.036      xiaomi-band-9-3.1.32
xiaomi-band-10-pro-3.101.043      xiaomi-band-9-pro-3.1.175
xiaomi-band-11-4.100.139          xiaomi-p65-3.100.043
xiaomi-band-11-4.100.155
xiaomi-band-11-4.100.177
```

`xiaomi-band-10-pro-3.101.043/target.toml` 记录的固件信息：

```toml
firmware_sha256  = "519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec"
firmware_version = "3.101.043"
firmware_build   = "CONBINE_LTALM078_T3.101.043_08041658"
```

本机 `firmware/10pro/fwx/vela_ap.bin` 的哈希为同一串 `519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec`，逐字节一致，target pack 中的地址直接适用。

地址按固件哈希分组，换版本换一整套符号，不假设地址跨版本稳定。

## target pack 的内容

| 内容 | 数量 | 说明 |
| --- | ---: | --- |
| `symbols/*.json` | 259 | 每条含名字、类型、原型、地址、证据 ID、状态 |
| `generated/canopus_veneer.h` | 660 行 / 55 个 veneer | 硬编码地址的 `static inline` 函数 |
| `types/` | 未标注 | 结构体布局描述 |
| `evidence/*.json` | 36 | 证据记录，另有 `fw-match/`、`failure-feedback/` 两个目录 |
| `target.toml` | 未标注 | 加载器参数、能力清单、重定位表 |

### 能力清单

`capabilities` 中列出的条目：

```toml
capabilities = [
  "identity-guard", "clock.gettime",
  "char-device.register", "char-device.unregister",
  "control-abi", "classic.adapter", "classic.l2cap", "classic.sdp",
  "bt.timer", "native-app.register", "launcher.entry", "ui.dispatch",
]
```

`char-device.register`、`char-device.unregister` 正是创建 `/dev/tun` 所需的能力，框架将其作为一等能力单列。

## 安装器

`watchfaces/canopus-installer-prod/xiaomi-band-10-pro/main.lua` 共 400 行，是整套机制的入口。关键常量与流程：

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

### 从安装器确认的事实

| 事实 | 意义 |
| --- | --- |
| `os.execute` 可用 | Lua 能执行 shell 命令，这是整条链路的支点 |
| `getprop` 可读固件版本 | 安装器能按版本选择模块 |
| 模块带 `CPS1` 魔数头 | 模块不是裸 ELF，外层还有一层容器 |
| 尺寸范围 512 B 至 256 KB | 驱动 10 至 20 KB 落在范围内 |
| `insmod <path> <name>` | 与 `target.toml` 的 `load_command` 一致 |
| 写入 `/dev/canopus` | 自定义字符设备，由 supervisor 模块提供 |

`CPS1` 头说明模块文件由 `CPS1` 容器与 ELF32 ET_REL 两部分组成。自行编写驱动时需要按该格式打包，不能直接放入 `.ko`。

## 证据质量

`target.toml` 开头注明 `# Static exact-IDB recovery; device gates remain pending.`，即所有结论均来自静态逆向，没有真机验证记录。

### 扎实的部分

`evidence/EVID-MODLIB-1043-001.json` 直接定位了 `insmod` 的实现：

| 结论 | 证据 |
| --- | --- |
| `0x0C203A50` 是两参数插入 veneer | `PUSH {R7,LR}; ADD R7,SP,#0; BL sub_C1E8650; POP {R7,PC}`，原样透传两个 AAPCS 参数 |
| `0x0C1E8650` 是 `modlib_insert` | 内嵌源文件名 `../../nuttx/libs/libc/modlib/modlib_insert.c` |
| 该函数执行完整加载流程 | 校验参数、分配镜像、应用重定位、调用构造函数、返回句柄 |
| 调用点 | `sub_C23EC54` 取 path 与 name，失败时用 errno 格式化 `insmod` 诊断 |
| 推翻旧候选 | `sub_C1C5F34` 实际是 `fs_munmap` 的包装，与模块加载无关 |

这条证据同时确认了 modlib 存在于固件、`insmod` 入口位置、重定位与构造函数确实被执行。

### 断裂的部分

网络相关符号（`netdev_register`、`netdev_input`、`ipv4_input`、`socket` 等）全部引用同一个证据 ID：

```
"evidence_ids": ["EVID-NET-001"]
```

`evidence/` 目录的 36 个文件中没有 `EVID-NET-001.json`，该批符号的证据链断裂，推测由同版本 NuttX 源码加调用邻域比对批量恢复，没有逐条审计。

| 符号组 | 证据状态 |
| --- | --- |
| 模块加载（`insmod`、modlib） | 已证实，有独立证据、反汇编与源码串 |
| 蓝牙（`EVID-BT-1043-*`，11 条） | 已证实，有专门证据，并纠正过错误候选 |
| UI / LVGL（`EVID-UI-*`，6 条） | 已证实，有专门证据 |
| 网络（`EVID-NET-001`） | 待定，证据文件缺失 |

加载机制可以直接使用；网络符号必须先反汇编函数体，确认出现预期的系统调用或数据结构访问后再依赖。

## 可直接使用的产物

| 产物 | 用途 |
| --- | --- |
| `targets/xiaomi-band-10-pro-3.101.043/target.toml` | 加载器参数与重定位表，是编写模块的规格书 |
| `generated/canopus_veneer.h` | 55 个硬编码 veneer，含 `register_driver`、`netdev_register` |
| `symbols/*.json` | 259 条符号记录 |
| `modules/examples/hello.c`、`build.sh` | 最小模块模板 |
| `watchfaces/canopus-installer-prod/*/main.lua` | 交付与加载的现成脚本 |
| `manager/` 源码 | 管理器界面实现 |

## 约束与风险

| 风险 | 说明 | 严重度 |
| --- | --- | --- |
| AGPL-3.0 | 派生作品需要开源，直接链接其运行时库可能具有传染性 | 中 |
| 纯静态恢复 | 一个地址错误即触发 HardFault，作者标注 `device gates remain pending` | 高 |
| 模块格式私有 | `CPS1` 容器格式需按安装器代码复刻 | 中 |
| 版本强绑定 | 升级固件后整套地址失效 | 中 |
| 来源可信度 | 第三方逆向成果，不构成官方 ABI 保证 | 中 |
| 网络符号证据缺失 | `EVID-NET-001` 无对应文件 | 高 |

AGPL 的边界在于使用方式：参考 `target.toml` 与地址、独立编写驱动，通常不构成派生；直接链接其运行时库则需要按 AGPL-3.0 处理。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| Canopus 在 `3.101.043` 真机上是否成功运行过 | 待定，文档声明支持，但 `device gates remain pending` |
| `CPS1` 容器的完整格式 | 待定，只从安装器看到魔数与尺寸范围 |
| `/dev/canopus` 由谁创建 | 推断由 supervisor 模块创建 |
| 网络符号地址是否可信 | 待定，必须自行验证 |
| Canopus 是否自带 tun 驱动 | 待定，未见网络类模块 |

## 相关页面

- 模块格式、重定位与加载流程：[内核模块系统](/native/modules)
- 同一固件版本上的另一套框架：[Chaos](/native/chaos)
- 镜像版本、分区与文件系统：[固件研究](/firmware/)
- 地址恢复与反汇编方法：[工具索引](/tools/)
