---
title: 逆向工具与复现
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/10-工具链与复现.md"
contributors: [miband-dev]
---

# 逆向工具与复现

<StatusBadge status="sourced" verified="2026-10-25" />

结论：固件里的符号恢复只依赖一条地址规则，`vaddr = 文件偏移 + 基址`。代码段基址为 `0x0C000000`，数据段基址为 `0x2C0C0000`，所有脚本都是这条规则的变体。10 Pro 的 `vela_ap.bin` 不是标准 ELF，`readelf` 无输出，地址只能通过字符串引用、字面量池和反汇编交叉验证。

## 环境

| 项 | 值 |
| --- | --- |
| 运行时 | Node.js |
| 反汇编 | `capstone-wasm` |
| 脚本目录 | `/dsh/workspace/chaos/tools/` |
| 固件目录 | `/dsh/workspace/chaos/firmware/10pro/fwx/`（10 Pro）、`firmware/9pro/fwx9/`（9 Pro） |

## 地址映射

同一份 `vela_ap.bin` 被映射两次，代码与数据各有一套基址。

| 段 | 基址 | 范围 | 内容 |
| --- | --- | --- | --- |
| 代码 | `0x0C000000` | 文件 `0x0` 至 `0xCE0000` | ARM Thumb-2 指令与字面量池 |
| 数据 | `0x2C0C0000` | 文件 `0x0` 至结尾 | 字符串、只读数据、资源索引 |

验证方法：对字符串 `S`（文件偏移 `F`）寻找引用，若某个 32 位字面量 `L` 满足 `L = F + BASE`，则 `BASE` 即该段的基址。已有两处交叉验证：

| 字符串 | 文件偏移 | 计算 vaddr | 实测引用位置 |
| --- | ---: | --- | --- |
| `/dev/tun` | `0xB55F00` | `0x2CC15F00` | 文件 `0x6515AC`，位于正文的字面量池 |
| `app_net_receive` | `0xC8B650` | `0x2CD4B650` | 文件 `0x6516B4` |

代码段结束地址是经验值。`0xCE0000` 未经过精确验证，是否存在第三个映射段同样未排查。

## capstone 与反汇编

`dis.js` 是 `capstone-wasm` 的封装，读取 `vela_ap.bin`，按 Thumb 模式解码给定地址区间，并标出 PC 相对引用。基本用法是传入起止地址：

```bash
node tools/dis.js 0xc651500 0xc651600
```

只关心特定指令时使用 `thumb.js`。它是自写的极简 Thumb/Thumb-2 解码器，仅处理 `LDR literal`、`ADR`、`MOVW/MOVT`，输出量比 capstone 小，适合在大量候选地址中快速筛选。

| 脚本 | 作用 | 输入 |
| --- | --- | --- |
| `dis.js` | capstone 反汇编与 PC 相对引用查找 | 起止地址 |
| `thumb.js` | 精简 Thumb/Thumb-2 解码 | 待扫描区域 |
| `region.js` | 导出地址区间，附指针、字符串与 Thumb 标注 | 起止地址 |

`region.js` 用于人工判读：

```bash
node tools/region.js 0xc651700 0xc651770
```

## 字符串与指针扫描

`table2.js` 扫描字符串表区域，按地址排序输出。输出格式为 `vaddr  string`，地址已经按数据段基址换算。

```bash
node tools/table2.js | grep -i "关键词"
```

查找某个字符串是否被代码引用，使用 PC 相对字面量加载扫描：

```bash
node tools/litload2.js firmware/10pro/fwx/vela_ap.bin | grep -i "2cc15f00"
```

`litload2.js` 在 `litload.js` 的基础上增加了三类指令的处理，覆盖 Thumb 代码中常见的取址方式：

| 指令或编码 | 识别值 | 用途 |
| --- | --- | --- |
| `LDR literal` | PC 相对加载 | 读取代码附近的常量 |
| `LDRD` | `0xE9DF` | 一次加载两个 32 位字面量 |
| `ADR` / `ADD PC` | `0xA000`、`0xA800`、`0xF20F` | 计算附近地址，常用于取字符串或函数指针 |

定位基址和引用点的辅助脚本：

| 脚本 | 作用 |
| --- | --- |
| `base.js` | 暴力求解基址，遍历所有字符串，找出能解释最多引用的 `BASE` |
| `base2.js` | `base.js` 的变体，处理多基址 |
| `testbase.js` | 验证某个候选基址 |
| `findref.js` | 查找引用某个字符串的代码位置 |
| `refs.js` | 定点检查一组已知地址的引用 |

判定顺序是先确认字符串的文件偏移，再用 `table2.js` 得到 vaddr，用 `litload2.js` 找引用，最后用 `dis.js` 或 `region.js` 查看引用点是否落在函数体内。缺少任何一步，结论都只能算推断。

## 三个必须记住的坑

### 坑一：无中央目录不等于不是 zip

zip 解析器通常从文件尾查找 `EOCD`（`PK\x05\x06`）。部分打包器只写本地文件头，不写中央目录，此时 `unzip` 与 Python `zipfile` 都会报错，但数据完好。9 Pro 的 `fw9pro.bin` 属于这种情况，顺序扫描 `PK\x03\x04` 并逐条 inflate，可以解出 258 个文件。

判定方法是直接扫描本地文件头，检查每一条的 `compression method` 与 `compressed size` 是否合理，以及 inflate 是否成功。不能用是否存在 `EOCD` 判断包是否完整。

```bash
node tools/zip_no_cd.js firmware/9pro/fw9pro.bin firmware/9pro/fwx9/
```

### 坑二：字面量池不是分派表

`0x651730` 附近连续排列着 `"up"`、`"bt"`、`"remote_net_state_switch"`、`"bt-net"`，形式上接近一张主题订阅表。实际它是指令流中间的字面量池，编译器把相邻代码要用的常量集中放在这里。

判据是同一片地址里是否混有可执行指令：

```bash
node tools/dis.js 0xc651500 0xc651600
```

| 观察 | 判定 |
| --- | --- |
| 混有 `bl`、`ldr`、`cmp`，尤其出现到日志函数的 `bl` | 代码与字面量池，不是表 |
| 连续 32 位字面量，值等于字符串偏移加基址 | 字面量池，不是分派表 |
| 只有字符串数据，没有有效指令序言 | 字符串表区域，引用点需另找 |

分派表与字面量池都可能保存字符串指针。区别在于分派表会被一段稳定的代码按索引读取，字面量池只服务于紧邻的指令。确认后者需要反汇编读取点，不能只看数据排列。

### 坑三：字符串计数不能代替符号存在性

`netdev_register` 在 10 Pro 的 AP 中字符串计数为 0，据此曾判定驱动注册接口不存在。该结论已被推翻。Canopus 的 3.101.043 target pack 明确记录：

```
netdev_register   entry 0xc1fc214   callable 0xc1fc215   int(void *, int)
```

函数存在，地址存在，只是名字字符串被裁掉。固件为节省空间剥离符号名，仅保留地址表。

| 证据 | 能证明 | 不能证明 |
| --- | --- | --- |
| 字符串计数大于 0 | 相关名称曾被编译进固件 | 存在活跃调用路径 |
| 字符串计数等于 0 | 没有保留该名称 | 函数或能力不存在 |
| 有效函数序言 | 目标地址是函数入口 | 该函数被业务代码调用 |
| 重定位表或恢复符号表 | 符号存在且可调用 | 运行时调用成功 |

否定性结论需要覆盖所有可能位置的检索。字符串计数只能证明存在，不能证明不存在。要证明不存在，需要查符号表、重定位表，或反汇编目标地址确认是否有 `push {..., lr}` 一类的函数序言。

## 脚本清单

### 定位与引用

| 脚本 | 作用 |
| --- | --- |
| `base.js` | 暴力求解基址：遍历所有字符串，找能解释最多引用的那个 `BASE` |
| `base2.js` | `base.js` 的变体，处理多基址 |
| `testbase.js` | 验证某个候选基址 |
| `findref.js` | 找引用某个字符串的代码位置 |
| `refs.js` | 定点检查一组已知地址的引用 |
| `litload.js` | 扫描 PC 相对字面量加载（`LDR literal`） |
| `litload2.js` | 增强版：额外处理 `LDRD`（`0xE9DF`）、`ADR`/`ADD PC`（`0xA000`/`0xA800`/`0xF20F`） |

### 解码与分析

| 脚本 | 作用 |
| --- | --- |
| `dis.js` | 基于 capstone 的反汇编器与 PC 相对引用查找器 |
| `thumb.js` | 自写的极简 Thumb/Thumb-2 解码器，只关心 `LDR literal`、`ADR`、`MOVW/MOVT` |
| `region.js` | 导出某个地址区间，附指针、字符串与 Thumb 标注 |
| `table.js` / `table2.js` | 扫描字符串表区域，按地址排序输出，用于查找名字表 |

### 专项

| 脚本 | 作用 |
| --- | --- |
| `kw.js` / `kw2.js` | 关键词字符串导出，用于查找能力表或黑名单 |
| `devfilter.js` | 查找设备过滤与白名单逻辑 |
| `permhunt.js` | 查找权限相关代码 |
| `romfs.js` | 解析 `vela_resource.bin` 的 romfs（`-rom1fs-`） |
| `cmp.js` | 对比两组 JIDL feature 描述符 |
| `probe2.js` | 从日志提取探测结果 |
| `split_report.js` | 拆分长报告 |

### 解包

| 脚本 | 作用 |
| --- | --- |
| `zip_no_cd.js` | 解没有中央目录的 zip：顺序扫描 `PK\x03\x04`，逐条 inflate |

## 标准流程

### 第一步：解包

10 Pro 的 `firmware/10pro/fw.bin` 是标准 zip，直接展开：

```bash
cd /dsh/workspace/chaos
unzip -o firmware/10pro/fw.bin -d firmware/10pro/fwx/
```

9 Pro 的包没有中央目录，`unzip` 会失败，必须使用本地文件头扫描：

```bash
node tools/zip_no_cd.js firmware/9pro/fw9pro.bin firmware/9pro/fwx9/
```

### 第二步：找字符串

```bash
node tools/table2.js | grep -i "关键词"
```

输出中的 vaddr 已按数据段基址算好，可以直接作为后续查找引用与反汇编的输入。

### 第三步：找引用

```bash
node tools/litload2.js firmware/10pro/fwx/vela_ap.bin | grep -i "2cc15f00"
```

这一步回答的是代码是否真的使用该字符串。命中只能说明存在引用，引用点是否属于有效函数仍需下一步确认。

### 第四步：反汇编确认

```bash
node tools/dis.js 0xc651500 0xc651600
node tools/region.js 0xc651700 0xc651770
```

查看目标地址是代码、字面量池还是分派表。三条判据见上一节的坑二。

### 第五步：判定

| 观察 | 结论 | 状态 |
| --- | --- | --- |
| 字符串存在，有代码引用，引用点是函数入口 | 功能存在 | 已证实 |
| 字符串存在，只在日志格式串中出现 | 只有埋点，逻辑可能在别处 | 推断 |
| 字符串存在，无任何引用 | 可能是死代码，也可能地址算错 | 待定 |
| 字符串计数为 0 | 不能直接判定功能缺失，符号名可能已被裁掉 | 已推翻 |

## 复现清单

从零复现全部结论所需的命令：

```bash
cd /dsh/workspace/chaos

# 1. 校验固件
sha256sum firmware/10pro/fw.bin firmware/10pro/fwx/vela_ap.bin
# firmware/10pro/fw.bin        a4ce8564778624f8287ea91015867dc1725b649fbc10f2c4fa4b6813af7bc4d9
# vela_ap.bin   519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec

# 2. 解包
unzip -o firmware/10pro/fw.bin -d firmware/10pro/fwx/
node tools/zip_no_cd.js firmware/9pro/fw9pro.bin firmware/9pro/fwx9/

# 3. 找关键字符串
node tools/table2.js | grep -E "tun|netdev|Miwear"

# 4. 找引用
node tools/litload2.js firmware/10pro/fwx/vela_ap.bin

# 5. 反汇编
node tools/dis.js 0xc651500 0xc651600

# 6. 对照 Canopus 符号表
grep -r "netdev_register" projects/canopus/targets/xiaomi-band-10-pro-3.101.043/symbols/
```

`grep -r` 的目标目录属于 Canopus 项目，不在 `tools/` 下。执行前需要确认该目录已按 target pack 的布局展开。

## 环境限制

| 限制 | 影响 |
| --- | --- |
| `readelf` 对 `vela_ap.bin` 无输出 | 不是标准 ELF，只能用自写解析 |
| 无 BES SDK | 无法编译原生模块，除非使用 Canopus 的 SDK |
| 无真机调试通道 | 只能靠日志推断 |
| 固件已剥符号名 | 函数定位只能靠字符串邻近推断与交叉验证 |

## 未决问题

| 问题 | 状态 |
| --- | --- |
| 代码段的确切结束地址 | 待定，`0xCE0000` 只是经验边界 |
| 是否存在第三个映射段 | 待定，未排查 |
| `zip_no_cd.js` 的覆盖范围 | 已证实，在 9 Pro 包上解出 258 个文件（含去重） |

## 相关页面

- 工具用途与来源索引：[工具索引](/tools/)
- 已恢复符号的地址与原型：[地址手册](/tools/addresses)
- 误判三的完整推理过程：[研究历程与误判](/community/history)
- `/dev/tun` 在通信链路中的位置：[网络通路](/protocol/network)
