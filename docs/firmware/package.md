---
title: 固件包格式
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/01-固件研究-10Pro.md"
contributors: [miband-dev]
---

# 固件包格式

<StatusBadge status="sourced" verified="2026-10-25" />

结论：10 Pro 的 `firmware/10pro/fw.bin` 是带签名的标准 ZIP，系统本体在 `vela_ap.bin` 中，格式为 12 字节自定义头加裸 ARM 镜像；9 Pro 的包没有中央目录，只有局部文件头，仍然可以逐条解出。

两台设备的镜像共用同一套 BES 打包器与地址体系，容器层完全不同。下面的顺序是先给 10 Pro 的容器、分区与地址换算，再单列 9 Pro 的容器和两者的差异。

## 设备标识

| 项 | 值 | 来源 |
| --- | --- | --- |
| 商品名 | 小米手环 10 Pro（陶瓷版同型号） | 无 |
| 代号 | `p67cn` / `miwear.watch.p67cn` | 手机日志 `did=2239055857` |
| 型号 | `M2551B1` | 系统属性 |
| 固件版本 | `3.101.043` | `vela_ap.bin` 内版本串 |
| 构建号 | `CONBINE_LTALM078_T3.101.043_08041658` | Canopus target pack `target.toml` |
| 系统 | NuttX + Vela 应用框架 | 固件结构 |

## 10 Pro 的外层容器

`firmware/10pro/fw.bin` 是标准 ZIP，结构为 `PK\x03\x04` 加中央目录与 EOCD。

| 项 | 值 |
| --- | --- |
| 大小 | 90,739,541 字节 |
| SHA-256 | `a4ce8564778624f8287ea91015867dc1725b649fbc10f2c4fa4b6813af7bc4d9` |
| 容器 | 标准 ZIP（`PK\x03\x04` + 中央目录 + EOCD） |
| 成员数 | 8 |

### 成员清单

| 成员 | 解压后大小 | 作用 |
| --- | ---: | --- |
| `ota.sh` | 937 | 安装脚本，分区布局的权威来源 |
| `vela_ap.bin` | 13,795,728 | 应用处理器镜像：NuttX 与快应用运行时 |
| `vela_bl2.bin` | 451,468 | 二级引导（BL2） |
| `vela_ota.bin` | 655,360 | OTA 升级器本体 |
| `vela_resource.bin` | 171,755,520 | 资源分区：字体、位图、表盘、语言包 |
| `META-INF/MANIFEST.MF` | 348 | 成员 SHA-1 摘要 |
| `META-INF/CERT.SF` | 464 | 签名文件 |
| `META-INF/CERT.RSA` | 1,570 | 签名证书 |

解压后合计 186,661,395 字节，压缩率约 2:1，`vela_resource.bin` 中的位图压缩效果较好。

`MANIFEST.MF` 记录逐成员 `SHA1-Digest`，包带签名校验。重新打包的固件无法刷入，这是改动只能发生在运行时、不能改固件重刷的根本原因。

## 分区布局：`ota.sh`

`ota.sh` 只有 937 字节，是包内信息密度最高的文件，分区布局由它明文写死。以下为去掉重复进度设置后的原文：

```sh
setprop ota.progress.current 30
setprop ota.progress.next 95
setprop ota.progress.status 1
setprop ota.progress.size 171755520
dd if=/ota/vela_resource.bin of=/dev/resource bs=32768 verify

setprop ota.progress.size 451468
dd if=/ota/vela_bl2.bin of=/dev/bl2 bs=32768 verify

setprop ota.progress.size 13795728
dd if=/ota/vela_ap.bin of=/dev/ap bs=32768 verify
```

### 脚本读出的安装规则

| 读出的信息 | 依据 |
| --- | --- |
| 分区设备节点是 `/dev/ap`、`/dev/bl2`、`/dev/resource` | `of=` 参数 |
| 安装包位于 `/ota/` 目录 | `if=/ota/...` |
| 块大小 32 KiB 且带读回校验 | `bs=32768 verify` |
| 任何一步失败即 `reboot`，回滚到旧固件 | `if [ $? -ne 0 ]; then reboot` |
| 进度通过 `ota.progress.*` 属性上报给 UI | `setprop` 序列 |
| `vela_ota.bin` 不由 `ota.sh` 写入 | 脚本中没有对应的 `dd` |

`vela_ota.bin` 在包内但不被安装脚本写入。OTA 升级器由另一条路径（bootloader 或 BL2）处理，或仅作为从更老版本升级的跳板，用途待定。

### 分区表（推导）

| 分区节点 | 镜像 | 大小 | 内容 |
| --- | --- | ---: | --- |
| `/dev/bl2` | `vela_bl2.bin` | 451,468 | 二级引导 |
| `/dev/ap` | `vela_ap.bin` | 13,795,728 | 应用处理器固件 |
| `/dev/resource` | `vela_resource.bin` | 171,755,520 | 资源 |

`/dev/ota`、`/dev/ota_data`、`/dev/factory`、`/dev/efuse`、`/dev/otp` 等节点在手环运行时的日志与挂载表中可见，但不由这个包写入。

分区布局决定了第三方内容的落点：固件包有签名，且只能整体替换这三个分区，任何改动都要走 `/data` 分区与运行时模块加载。

## `vela_ap.bin` 的镜像格式

### 不是 ELF

`readelf` 与 `objdump` 都无法识别该文件：

```bash
$ readelf -h vela_ap.bin
（无输出）
```

文件头：

```text
000000  ff ff ff ff  00 00 05 00  00 00 00 00  24 80 de 28
000010  14 48 00 47  01 f0 6e fd  13 48 80 f3  08 88 13 48
000020  80 f3 0a 88  00 20 80 f3  14 88 bf f3  6f 8f 00 f0
```

| 偏移 | 内容 | 解释 |
| --- | --- | --- |
| `0x00` | `ff ff ff ff` | 头部魔数或未初始化标记 |
| `0x04` | `00 00 05 00` | 版本或块数 |
| `0x08` | `00 00 00 00` | 保留 |
| `0x0c` | `24 80 de 28`，即 `0x28de8024` | ARM 向量表第 0 项：初始栈指针，约 685 MB |
| `0x10` | `14 48 00 47` | Thumb 指令 `ldr r0,[pc,#0x50]` 与 `bx r0`，复位向量 |

`vela_ap.bin` 的结构是 12 字节自定义头加从 `0x0c` 开始的裸 ARM 向量表。文件中没有程序头、节表与符号表，全部分析只能依靠字符串与指针反推。

## 地址换算规则

镜像被映射到两个虚拟地址，两者都相对文件偏移线性：

```text
代码地址 = 0x0C000000 + 文件偏移
数据地址 = 0x2C0C0000 + 文件偏移
```

在 `vela_ap.bin` 中搜索字符串地址的 32 位小端引用，验证结果如下：

| 字符串 | 文件偏移 | 按 `0x0C000000` 查找 | 按 `0x2C0C0000` 查找 |
| --- | ---: | --- | --- |
| `/dev/tun` | `0xb55f00` | 0 处 | 1 处，位于 `0x6515ac` |
| `app_net_receive` | `0xc8b650` | 0 处 | 1 处，位于 `0x6516b4` |

代码引用字符串时使用数据别名，代码本身在代码别名中执行。这是 XIP 双映射的典型形态：代码区走指令缓存，数据区走数据缓存或非缓存，`ldr r0, =字符串` 才能取到正确地址。

`0x2C0C0000` 的非整基数提示数据段从文件偏移 `0xC0000` 起被加载到 `0x2C000000`，两种说法等价。双映射属于 MMU 配置还是加载器行为，当前标为推断，推断为 MMU 别名。

### 定位函数的步骤

1. 找到字符串的文件偏移 `off`；
2. 计算数据地址 `0x2C0C0000 + off`；
3. 在文件中搜索该 32 位值，得到引用位置 `ref_off`；
4. 计算代码地址 `0x0C000000 + ref_off`；
5. 用 capstone 按 Thumb 反汇编对应区段。

第 3 步通常落在字面量池中，即一长串紧邻的 32 位地址，前后夹着其他字符串指针，这是 Thumb-2 代码 `ldr rX, =imm` 的实现方式。字面量池本身不是调度表，只是常量仓库。

## `vela_resource.bin`

171,755,520 字节，占整个固件包 92%。内容包括：

- 字体，多语言点阵；
- 表盘资源 `/system/watchface/<id>/resource.bin`；
- UI 位图与图标；
- 语言字符串表。

该文件中的字符串绝大多数是位图噪声。曾在此文件中搜索到 `bnep`，一度被当作蓝牙 PAN 的证据，实际是字体位图中碰巧排列出的 4 个字节。在 `vela_resource.bin` 中搜到的内容默认不可信，除非同一字符串在 `vela_ap.bin` 中也能命中。

## `vela_bl2.bin` 与 `vela_ota.bin`

| 镜像 | 大小 | 已知信息 |
| --- | ---: | --- |
| `vela_bl2.bin` | 451,468 | 二级引导；`vela_ap.bin` 中能找到引用它的文件名与 `/dev/flash_ap`、`boot2 update`、`update app:%s` 等字符串 |
| `vela_ota.bin` | 655,360 | OTA 升级器；不被 `ota.sh` 写入，用途待定 |

`vela_ap.bin` 内部还嵌有 `ZZ~3.1.190` 子容器，偏移 `0x8c9a5`，内容为 `hyn_wxn_firmware.bin`，即触摸控制器固件。9 Pro 的包同样以 `60 5A 5A 7E` 开头，两者由同一套 BES 打包器产出，10 Pro 只是把它整个放进了 ZIP。

## 提取与复现

```bash
# 解包
cd /dsh/workspace/chaos
unzip -o firmware/10pro/fw.bin -d firmware/10pro/fwx/

# 核对完整性
sha256sum firmware/10pro/fw.bin firmware/10pro/fwx/vela_ap.bin
# a4ce8564778624f8287ea91015867dc1725b649fbc10f2c4fa4b6813af7bc4d9  firmware/10pro/fw.bin
# 519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec  firmware/10pro/fwx/vela_ap.bin

# 验证地址换算（node，无需额外依赖）
node -e '
const fs=require("fs"),b=fs.readFileSync("firmware/10pro/fwx/vela_ap.bin");
const off=b.indexOf(Buffer.from("/dev/tun","latin1"));
const p=Buffer.alloc(4);p.writeUInt32LE((0x2C0C0000+off)>>>0);
console.log("string@0x"+off.toString(16)+" ref@"+b.indexOf(p).toString(16));
'
```

第二个哈希 `519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec` 与 Canopus target pack 中的 `firmware_sha256` 完全一致，是 Canopus 支持该机型该版本的直接证据。

## 9 Pro 的另一种容器

9 Pro（`n67cn`）的固件包不是 ZIP 布局，没有 EOCD 与中央目录，也没有可用的 `unzip -l`。局部文件头完整，条目仍可逐条解出。

### 包来源

| 项 | 值 |
| --- | --- |
| 文件名 | `miwear.watch.n67cn_v3.1.190_full_77174e6a.bin` |
| 来源 | `github.com/hrk666666/firmware-archives-public` 的 release `firmware-miwear.watch.n67cn-v3.1.190-5a75fc0d` |
| 大小 | 50,330,500 字节 |
| 本地路径 | `/dsh/workspace/chaos/firmware/9pro/fw9pro.bin` |
| 解出物 | `/dsh/workspace/chaos/firmware/9pro/fwx9/`，258 个文件 |

该仓库只有 4 个 `n67cn` 发布版本：`v3.1.171`、`v3.1.175`、`v3.1.187`、`v3.1.190`，全部约 50.3 MB，全部是 `full` 包。用 HTTP Range 只读前 16 字节确认，四个版本的文件头完全同构，不存在某个版本碰巧是 ZIP 的情况。

### 文件头

```text
000000  60 5a 5a 7e  33 2e 31 2e 31 39 30  00 00 00 00
         `  Z  Z  ~   3  .  1  .  1  9  0
000010  00 00 00 00 ...（补零到 0x40）
```

| 偏移 | 内容 | 解释 |
| --- | --- | --- |
| `0x00` | `60 5A 5A 7E` | BES 打包器魔数，ASCII 为 `` `ZZ~ `` |
| `0x04` | `33 2e 31 2e 31 39 30` | ASCII 版本号 `3.1.190`，NUL 结尾 |
| `0x0c` 至 `0x3f` | 全零 | 头部填充 |

这是 BES 芯片厂的标准固件容器。10 Pro 的 `vela_ap.bin` 内嵌的同格式子容器（`ZZ~3.1.190`，含 `hyn_wxn_firmware.bin`，偏移 `0x8c9a5`）说明两台机器使用同一套打包工具，区别只在 10 Pro 外层多了一层带签名的 ZIP。

### 只有局部文件头，没有中央目录

标准 ZIP 的解析依赖文件末尾的 EOCD（End Of Central Directory），再由它定位中央目录，最后读取局部文件头。这个包只有局部文件头，末尾没有 EOCD，直接按 ZIP 解析会失败：

```bash
$ unzip -l firmware/9pro/fw9pro.bin
（失败：找不到 EOCD）
```

局部文件头的布局是：

```text
PK\x03\x04  + 版本(2) + 标志(2) + 压缩方法(2) + 时间(2) + 日期(2)
            + CRC32(4) + 压缩后大小(4) + 原始大小(4) + 文件名长度(2) + 扩展长度(2)
            + 文件名 + 扩展 + 压缩数据
```

判据是局部文件头，不是文件末尾的目录结构。中央目录可能被裁掉以减小体积或阻止解包，局部条目仍然完整可解。扫描全文件中的 `PK\x03\x04`，逐个解析头部取出压缩后大小，即可顺着链表解出每个条目。

提取流程：

1. 从偏移 0 开始顺序查找下一个 `PK\x03\x04`；
2. 读取本地文件头：压缩方法（0 为存储，8 为 deflate）、标志位、压缩后大小、原始大小、文件名长度、扩展长度；
3. 解压，调用 `inflateRaw`；
4. 用实际消耗的输入字节数跳到下一条记录，而不是使用头中的压缩大小，因为可能使用 data descriptor；
5. 写入 `firmware/9pro/fwx9/`。

顺序扫描得到 258 条记录，落盘 258 个文件。

有 16 条记录的文件名字面为 `resource.bin`，另有重复的 `messages.mo`，大小各不相同，大概率是不同表盘的资源，本地头中没有携带路径。解包时按 `resource~2.bin` 的方式加序号，否则条目互相覆盖，会丢失约 13 MB 数据。

早期按先找 EOCD、再读中央目录的思路处理时，259 个候选中只有 237 个通过校验，其余 22 个是数据区中碰巧出现的 `PK` 字节，例如偏移 `0x280112` 处，周围是压缩资源，`inflate` 立即失败。改为顺序扫描并按实际消耗字节跳转后，误报与漏报都消失。早期统计的 237 条与顺序扫描的 258 条是两次不同的统计口径，以 258 条记录为准。

## 9 Pro 成员清单（节选）

按大小排序：

| 成员 | 大小 | 作用 |
| --- | ---: | --- |
| `vela_ap.bin` | 7,775,288 | 应用处理器镜像 |
| `weather.res` | 7,705,090 | 天气资源 |
| `breath.res` | 7,277,447 | 呼吸训练资源 |
| `sport_course.res` | 6,740,297 | 运动课程资源 |
| `sports.res` | 5,894,529 | 运动资源 |
| `resource.bin` | 2,610,825 | 通用资源 |
| `nfccard.res` | 2,231,428 | NFC 卡资源 |
| `vela_factory.bin` | 2,196,112 | 工厂测试镜像 |
| `pressure.res` | 1,272,760 | 气压资源 |
| `heartrate.res` | 1,256,458 | 心率资源 |
| `activities.res` | 1,074,799 | 活动资源 |
| `settings.res` | 1,027,419 | 设置资源 |
| `watchface.res` | 987,904 | 表盘资源 |
| `oxygen.res` | 970,233 | 血氧资源 |
| `launcher.res` | 413,671 | 桌面资源 |
| `vela_bl2.bin` | 299,516 | 二级引导 |
| `vela_bl.bin` | 63,712 | 一级引导 |
| `interconnect.res` | 16,976 | 互联框架资源 |

9 Pro 把每个功能模块拆成独立的 `.res` 包，10 Pro 合并为一个 171 MB 的 `vela_resource.bin`，这是产品形态差异，不影响镜像层面的分析。

`interconnect.res` 只有 16,976 字节，说明互联框架在这台机器上是一层薄壳，真正的协议在 `vela_ap.bin` 内。

## 两代容器的差异

| 项 | 10 Pro | 9 Pro |
| --- | --- | --- |
| 外层容器 | 标准 ZIP 加签名 | `60 5A 5A 7E` 加版本号，无中央目录 |
| 成员数 | 8 | 258 条局部头记录，早期按候选校验统计为 237 |
| `vela_ap.bin` 大小 | 13,795,728 | 7,775,288 |
| 代码基址 | `0x0C000000` | 同，同一套 BES 工具链 |
| 资源组织 | 单个 `vela_resource.bin` | 按功能拆分多个 `.res` |

容器完全不同，镜像格式相同。9 Pro 的 `vela_ap.bin` 同样是 12 字节头加裸 ARM 镜像，地址换算规则与 10 Pro 一致。

## 复现 9 Pro

```bash
cd /dsh/workspace/chaos
node tools/unpack9.js firmware/9pro/fw9pro.bin firmware/9pro/fwx9/     # 局部文件头扫描 + inflateRaw
ls fwx9 | wc -l                            # 223
```

`tools/unpack9.js` 的核心逻辑：

```js
const b = fs.readFileSync(input);
let i = 0;
while ((i = b.indexOf(Buffer.from('PK\x03\x04', 'latin1'), i)) !== -1) {
  const method  = b.readUInt16LE(i + 8);
  const csize   = b.readUInt32LE(i + 18);
  const usize   = b.readUInt32LE(i + 22);
  const nlen    = b.readUInt16LE(i + 26);
  const elen    = b.readUInt16LE(i + 28);
  const name    = b.slice(i + 30, i + 30 + nlen).toString('latin1');
  const dataOff = i + 30 + nlen + elen;
  try {
    const out = method === 0 ? b.slice(dataOff, dataOff + csize)
                             : zlib.inflateRawSync(b.slice(dataOff, dataOff + csize));
    if (out.length === usize && /^[\w.\-/]+$/.test(name)) fs.writeFileSync(path.join(dir, name), out);
  } catch (e) { /* 候选是数据区噪声，跳过 */ }
  i += 4;
}
```

命令注释中的 223 与 258 条记录不一致，差异未核实，标为待定。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| `vela_ota.bin` 由谁写入 | 待定 |
| 头部 `00 00 05 00` 的确切含义 | 待定，可能是块数或版本 |
| 双映射是 MMU 配置还是加载器行为 | 推断为 MMU 别名 |
| `vela_resource.bin` 内部结构 | 待定，只确认了表盘路径格式 |
| `vela_bl.bin` 与 `vela_bl2.bin` 的职责划分 | 待定 |
| 9 Pro 蓝牙栈所在的分区或芯片 | 待定 |
| 22 个被丢弃的 `PK` 候选中是否有真条目 | 已抽查 3 个，均为压缩数据噪声 |
| 9 Pro 复现命令注释中的 223 | 待定，与 258 条记录不一致 |

## 相关页面

- 系统启动链与文件系统布局：[系统架构](/firmware/architecture)
- 模块格式、重定位与加载流程：[内核模块系统](/native/modules)
- 分区读取与恢复路径：[固件研究](/firmware/)
- 符号地址与版本对应关系：[地址手册](/tools/addresses)
