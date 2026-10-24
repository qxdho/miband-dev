# 小米手环 10 Pro `fetch` 固件研究

> 研究日期：2026-10-16
> 研究对象：小米手环 10 Pro 官方 OTA 固件包（`fw.bin`，90,739,541 字节；解包后 `vela_ap.bin`，13,795,728 = `0xd28190` 字节）
> 目标设备：小米手环 **10 Pro**，代号 `p67cn`，型号 `M2551B1`，固件 `v3.101.043`
> 环境限制：本环境**无 objdump / readelf / arm-none-eabi-\***，已自建 `capstone-wasm` 反汇编工具链；所有结论均来自**静态分析**，**未经真机验证**。
>
> **本文是拆分文档之一。** Chaos-Module 项目分析见《[Chaos-Module 项目分析](Chaos-Module-分析.md)》。
>
> ⚠️ **型号边界**：小米手环 9、9 Pro、10、10 Pro 是**四个不同设备**。本文所有结论**仅针对 10 Pro（p67cn）**，不得套用到其他型号。

---

## 目录

- [摘要](#摘要)
- [第一部分：fetch 问题——从需求到固件](#第一部分fetch-问题从需求到固件)
  - [1.1 目标澄清](#11-目标澄清)
  - [1.2 社区证据的矛盾](#12-社区证据的矛盾)
  - [1.3 分层归因](#13-分层归因)
  - [1.4 固件结构](#14-固件结构)
  - [1.5 字符串证据：fetch 实现完整存在](#15-字符串证据fetch-实现完整存在)
  - [1.6 关键突破：镜像双段映射与 JIDL 注册表](#16-关键突破镜像双段映射与-jidl-注册表)
  - [1.7 权限与黑名单机制](#17-权限与黑名单机制)
    - [1.7.1 `canIUse` 与设备身份](#171-关键补充canIuse-与设备身份)
    - [1.7.2 反汇编器已就位 + 描述符对照](#172-反汇编器已就位--描述符对照新的确定结论)
    - [1.7.3 决定性证据：`fetch` 的 JIDL 方法确实被注册](#173-决定性证据fetch-的-jidl-方法确实被注册新工具--反汇编)
    - [1.7.4 开源源码给出的最终答案](#174-开源源码给出的最终答案open-velaframeworks_runtimes_feature)
    - [1.7.5 社区资料调研（逐机型，绝不混用）](#175-社区资料调研逐机型绝不混用)
    - [1.7.6 「按机型裁剪」的真正开关 + 权限链路在本机其实不生效（**决定性反转**）](#176-按机型裁剪的真正开关--权限链路在本机其实不生效决定性反转)
    - [1.7.7 真机实测：`fetch` 确实未被权限拦截（探针日志）](#177-真机实测fetch-确实未被权限拦截探针日志2026-10-17)
    - [1.7.8 9 Pro 对照与网络通路的最终判定](#178-9-pro-对照与网络通路的最终判定2026-10-17)
  - [1.8 结论](#18-结论)
- [第二部分：方法与工具](#第二部分方法与工具)
- [第三部分：未决问题与下一步](#第三部分未决问题与下一步)
- [附录 A：关键地址速查表](#附录-a关键地址速查表固件部分)
- [附录 B：复现步骤](#附录-b复现步骤)
- [附录 C：开源证据索引](#附录-c开源证据索引open-vela)
- [附录 D：真机探针（JSLab 版）](#附录-d真机探针jslab-版)

---

## 摘要

**fetch 问题**在固件层面得到了**决定性的结论**——它与社区流传的说法**部分相反、部分一致**，必须分开讲：

> **框架层：小米手环 10 Pro 的固件里，`fetch` 的实现是完整存在的、是正式注册的、JS 名字表里是可见的。**
> （这一点与"10 Pro 没有 fetch"的说法**相反**。）
>
> **设备裁剪层：机型差异是编译期 Kconfig（`CONFIG_FEATURE_SYSTEM_FETCH`）决定的——模块根本不参与编译时，
> JS 里就是 `undefined`。本机固件**没有**裁掉它（§1.7.6 A）。
>
> **权限层（§1.7.6，最重要的反转）：本机的快应用运行时**没有接入权限系统**，
> `HasPermissionCb()` 为假 ⇒ `FeatureRequestPermissions` 恒返回 `false` ⇒
> JIDL 生成的桩函数**直接执行真正的 API**——权限检查形同虚设，反而**不是**拦路虎。**

> **真机实测（§1.7.7，2026-10-17）：上面这条已经拿到设备证据。**
> 探针在 10 Pro 上跑通：`canIUse('@system.fetch')` 返回 **`true`**（带 `@` 前缀才行，
> 不带前缀返回 `false`），`fetch()` 的失败是 DNS `Couldn't resolve host name`
> （promise 风格给出 **`code:6`** = libcurl `CURLE_COULDNT_RESOLVE_HOST`），
> **而不是 `permissions denied`**。⇒ 权限层确实没有拦；当时唯一的失败原因是
> 手环**没有网络**（`network.getType = {type:"none"}`）。

证据链：完整的 `fetch_impl.cpp` 实现字符串（含 UV 异步请求、上传、错误码、取消）、三个生命周期钩子 `system_fetch_onCreate/onDetached/onDestroy`、JS 可见名字 `fetch` 与注册名 `system.fetch`，以及**在 `0xce3a34` 处找到的指向 `system.fetch` 的真实描述符表项**（与 `system.prompt`、`system.uploadtask` 等**已确认可用**的功能并列）。

**归因链路（1.7.4 源码 + 1.7.6 反转）：** 拦住 fetch 的**不是黑名单**（`isBlackListed()` 只拦 `system.device.getDeviceId` 一个 API）。权限链路本身是完整的——`fetch` 声明了 `[permissions="hapjs.permission.INTERNET"]`，运行时改写为 `vela.permission.INTERNET` 后向平台申请，是否授予由厂商闭源产品层（`PermissionManager::Client` 纯虚实现）决定。**但这条链只有在"有人注册了权限回调"时才会被走上**；而 JIDL 桩函数在 `FeatureRequestPermissions` 返回 `false` 时会**落下来直接执行真 API**（`tools/jidl/json_ast_source.mt:686-694`）。本机固件里权限胶水（`PermissionManager` 及其 **INFO 级**日志格式串 `"permission(%s) api(%s)..."`）**全部 0 命中**，⇒ **本机不走权限链路，权限层不设防**。这同时也彻底解释了为什么「在 manifest 里声明权限」无效——**在没接权限系统的设备上，声明与不声明结果完全一样**。

**社区调研（1.7.5）的诚实结论：** 用户说"官方支持表不准、以社区为准"——**这条对小米手环 9 Pro 成立**（官方说不支持，社区实测可用）；**但对 10 Pro 不成立**：截至本文档**没有任何一条 10 Pro 上 fetch 实测成功的记录**，社区口径与官方一致。社区在 10/10 Pro 上的事实标准方案是 **interconnect 手机桥接**（SimpleFetch 等），把 HTTP 请求交给手机 App 代发。

**新增固件证据（1.7.5）：** 资源分区 `vela_resource.bin` 里有完整的**权限资源清单**，包括 **`per_name_internet.cta`** 与 `permission_management.cta` / `permission_privacy.cta` / `permission_records.cta` / `permission_state_*.cta`。也就是说设备端**认识 internet 权限、且有权限管理界面**——这给出一条此前没考虑过的、成本最低的路：**先查设备/手机侧的应用权限设置里，快应用的"网络"权限是不是一个默认为关、但可以打开的开关。**

**本报告同时记录了方法论教训：** 镜像的加载基址不是单一的——代码段在 `0x0c000000`，数据/字符串段的指针引用只有在基址 `0x2c0c0000` 下才成立。用单一基址搜索会得出「零引用」的**错误否定**结论。

---

# 第一部分：fetch 问题——从需求到固件

## 1.1 目标澄清

原始需求（早期对话）是"**利用这个项目实现恢复小米手环 10 Pro 的 fetch 功能**"。

经网络检索确认：这里的 `fetch` 是 **快应用（QuickApp）的网络请求 API**，即 [Zepp OS 文档里的 FetchAPI](https://docs.huami.com/zh-cn/docs/v2/samples/app/fetchAPI/)。它是一个 JS 全局函数，用于发起 HTTP 请求并返回 Promise。

**关键判断：`fetch` 属于快应用运行时层，而 Chaos-Module 是原生 UI 注入工具——两者不在同一层。** 在仓库里搜 `fetch`，**0 处命中**；Chaos-Module 连一行网络代码都没有。

## 1.2 社区证据的矛盾

| 来源 | 说法 |
|---|---|
| 米坛社区某帖 | "10，9，8p，8，rw4 这几个设备不支持 fetch" ——把 **10** 和 **9 Pro** 并列 |
| 米坛 24134 帖（9 Pro 蓝牙借网教程） | "小米手环 9PRO 官网虽然标明不支持 fetch，但是……**其实小米 9Pro 是支持 fetch 的**，只不过官网标明错误" |
| 同帖 | "fetch **仅支持 http 协议，不支持 https**" ——所以社区要自搭 Flask 中转站 |

同一个社区的两种说法互相矛盾。**这本身就是重要线索**：说明这不是硬件缺失，而是**运行时/策略层的判定**。

## 1.3 分层归因

```
┌──────────────────────────────────────────┐
│  快应用 (QuickApp / 小程序)               │  ← fetch 在这一层
├──────────────────────────────────────────┤
│  快应用运行时 (Vela + QuickJS + FEATURE)  │  ← 注册表 / 权限 / 黑名单在这一层
├──────────────────────────────────────────┤
│  原生固件服务 (LVGL / 文件 / 传感器)      │  ← Chaos-Module 在这一层
├──────────────────────────────────────────┤
│  NuttX 内核 (+ Chaos 的 .ko)              │
└──────────────────────────────────────────┘
                     ↓
        蓝牙 PAN (BNEP) → 手机 → 互联网
```

**用户已确认（对话中明确）：manifest 声明权限这条路"试了不可行"。** 这排除了"应用自己能满足的声明"这一类，把嫌疑集中到**运行时策略层**。

## 1.4 固件结构

用户提供的 `.bin` 实际是一个 **ZIP**（`PK\x03\x04`，90,739,541 字节）。

`ota.sh` 揭示了刷写方式：

```sh
dd if=/ota/vela_resource.bin of=/dev/resource bs=32768 verify
dd if=/ota/vela_bl2.bin      of=/dev/bl2      bs=32768 verify
dd if=/ota/vela_ap.bin       of=/dev/ap       bs=32768 verify
```

| 成员 | 大小 | 作用 |
|---|---|---|
| `vela_ap.bin` | 13,795,728（`0xd28190`） | **应用处理器镜像 ← JS 运行时在这里** |
| `vela_resource.bin` | 171,755,520 | 资源 |
| `vela_bl2.bin` | 451,468 | 二级引导 |
| `vela_ota.bin` | 655 KB | OTA 载体 |
| `META-INF/MANIFEST.MF` | — | 各成员 SHA1-Digest |

**`vela_ap.bin` 是分析目标。** 其开头是裸的 Thumb 复位桩：`0x10: 0x4814`（`LDR r0,[PC,#0x50]`）`0x12: 0x4700`（`BX r0`），`0x64` 处的字面量 = `0x0c0c0015` → Thumb 目标 `0x0c0c0014`。

**Vela 是小米的 NuttX 衍生系统**，快应用跑在它上面。

## 1.5 字符串证据：fetch 实现完整存在

在 `vela_ap.bin` 里搜到了完整的 `fetch_impl` 实现痕迹：

```
0xbccd10  get_post_data_cb
0xbccd24  [FEATURE] [%s:%d] [fetch_impl] Unsupported %d type!
0xbccd5c  arraybuffer
0xbccd68  urlencoded
0xbccd74  fetch_request_cb
0xbccdec  Content-Length: 
0xbcce00  Content-Encoding: 
0xbcce58  content-type
0xbcce68  /frameworks/runtimes/feature/modules/fetch_impl.cpp      ← 源文件路径
0xbcced8  responseType dosen't match response data
0xbccf38  [fetch_impl] UV_REQUEST ERROR: request failed, state=%d, response code=%d, body=%s
0xbccfa0  system_fetch_onCreate
0xbccfb8  [fetch_impl] malloc err!
0xbcd018  system_fetch_onDetached
0xbcd030  system_fetch_onDestroy
0xbcd048  create content_t err
0xbcd060  invalid url
0xbcd06c  create request err
0xbcd080  invalid headers
0xbcd090  create native fetch err
0xbcd0a8  text/plain; charset=utf-8
0xbcd0c4  %Y%m%d %H%M%S
0xbcd0d4  fetch_create
0xbcd0e4  [fetch_impl] No memory!
0xbcd110  DELETE
0xbcd118  TRACE
```

**读法：**

- `UV_REQUEST` 说明走 **libuv 异步 IO**；`Content-Length` / `Content-Encoding` / `content-type` 说明实现了完整的 HTTP 头处理；`arraybuffer` / `urlencoded` 说明支持多种响应/请求体类型；`DELETE` / `TRACE` 说明 HTTP 方法齐全
- **`system_fetch_onCreate` / `onDetached` / `onDestroy` 三个生命周期钩子齐全**——这不是"残留字符串"，而是**正式注册过的 FEATURE 模块**
- 无任何"条件编译"或 stub 占位的迹象

### JS 可见名字表（`0xbd4e9c` 起）

一张连续的 API 名字表：

```
0xbd4e9c  fetch                    ← JS 侧方法名
0xbd4ea4  system.fetch             ← FEATURE 注册名
0xbd4eb4  system.prompt
0xbd4ec4  showToast
0xbd4ed0  showDialog
0xbd4edc  autocancel
0xbd4ee8  uploadFile
0xbd4ef4  system.uploadtask
0xbd4f08  filePath
0xbd4f14  UploadTask
0xbd4f1c  UploadTask description
0xbd4f38  onProgressUpdate
0xbd4f4c  offProgressUpdate
0xbd4f60  totalBytesSent
0xbd4f70  totalBytesExpectedToSend
0xbd4f8c  statusCode
0xbd4f98  system.interconnect
```

`fetch`、`system.fetch`、`uploadFile`、`statusCode`、`onProgressUpdate` 全在。

### 完整 FEATURE 模块清单（16 个 `system_*_onCreate` 描述符）

```
0xbc4068  system_internal_messagecenter_onCreate
0xbccfa0  system_fetch_onCreate          ← fetch
0xbcd23c  system_prompt_onCreate
0xbcde74  system_interconnect_onCreate
0xbcea50  system_router_onCreate
0xbcf240  system_storage_onCreate
0xbcfab8  system_exchange_onCreate
0xbd149c  system_configuration_onCreate
0xbd1f80  system_sensor_onCreate
0xbd2334  system_geolocation_onCreate
0xbd2478  system_internal_power_onCreate
0xbd25e4  system_vibrator_onCreate
0xbd36d4  system_request_onCreate
0xbd3d64  system_file_onCreate
0xbd489c  system_event_onCreate
0xbe82d8  system_device_onCreate
```

fetch 与 `system_prompt`（showToast，显然可用）、`system_vibrator`、`system_sensor` **并列同一张表**。

### 运行时框架（QuickJS + FEATURE）

```
/frameworks/runtimes/feature/src/feature_manager_qjs.cpp      ← QuickJS 绑定层
/frameworks/runtimes/feature/src/feature_instance_qjs.cpp
/frameworks/runtimes/feature/src/feature_common.cpp
/frameworks/runtimes/feature/src/feature_ffi.cpp
/frameworks/runtimes/feature/modules/fetch_impl.cpp
0xbc89cc  [FEATURE] Failed to get FeatureRegistry instance!
0xbc8ac8  [FEATURE] ptr: %p already exist !
```

**JS 引擎是 QuickJS。**

## 1.6 关键突破：镜像双段映射与 JIDL 注册表

### 方法论教训

起初我用**单一基址**搜索指向 `"system.fetch"` 的 4 字节指针：

- 以 `0x0c000000` 为基址（由复位桩的字面量 `0x0c0c0015` 推出）：**0 引用**
- 试了 8 个常见基址：**0 引用**

这会产生**错误的否定结论**（"字符串存在但无人引用 → 可能是死表"）。

**真正的映射是分段的：**

| 段 | 基址 | 证据 |
|---|---|---|
| 代码 | `0x0c000000` | 复位桩字面量 `0x0c0c0015` → `0x0c0c0014`；表中函数指针形如 `0x0c873045`（bit0=1） |
| 数据/字符串 | `0x2c0c0000` | 指向 `"system.fetch"` 的指针值为 `0x2cc94ea4` = `0x2c0c0000 + 0xbd4ea4` |

**基址的独立佐证**（`tools/base.js`，方法与本段不同：遍历 **3,166,519** 个候选指针字，对元数据区的 **4,731** 个字符串投票，要求 64K 对齐）：

```
BASE 0x2c0c0000   votes=7974    ← 本报告采用的基址
BASE 0xbe440000   votes=3270
BASE 0x46b20000   votes=2898
BASE 0x45450000   votes=2359
BASE 0xae410000   votes=2173
BASE 0x1f540000   votes=1983
BASE 0x45ff0000   votes=1897
BASE 0x2bfb0000   votes=1776
BASE 0xbe410000   votes=1485
BASE 0x2bf90000   votes=1389
BASE 0x2c020000   votes=1262
BASE 0x2bfe0000   votes=1226
BASE 0x2c000000   votes=1216
```

`0x2c0c0000` 以 **7974 票居首，是第二名（3270）的 2.4 倍**——一个清晰、无争议的峰值，而非噪声簇里的偶然胜出。注意 `0x2bfb0000` 一簇（`2bf6`/`2bf8`/`2bf9`/`2bfa`/`2bfb`/`2bfe`/`2c00`/`2c02`）也出现在榜上，但它们与 `0x2c0c0000` 在**子族关系上不冲突**：它们是同一 PSRAM 窗口的邻近对齐候选，命中数低一个量级，说明真正的映射起点是 `0x2c0c0000`。

**在基址 `0x2c0c0000` 下，指针引用大量出现：**

```
"system.fetch"        -> 引用点 0xce3a34, 0xce3a38, 0xce8e10
"fetch"               -> 引用点 0x7d2dc4, 0xce3a68
"system.uploadtask"   -> 引用点 0xce3bf8, 0xce3bfc, 0xce8e1c
"fetch_impl.cpp"      -> 4 处
"system_fetch_onCreate" -> 0x7b30ac
```

注意 `0xce3a34` 与 `0xce3a38` **相隔 4 字节**——这是**描述符表**的特征，不是巧合。

### 找到的真实描述符（`0xce3a00` 窗口）

```
+0x008  0x2cc94e90  "strerror"
+0x034  0x2cc94ea4  "system.fetch"      ← FEATURE 名
+0x038  0x2cc94ea4  "system.fetch"      ← 再次出现
+0x068  0x2cc94e9c  "fetch"             ← JS 方法名
+0x04c  0x0c873045  CODE
+0x050  0x0c873051  CODE
+0x054  0x0c8730b9  CODE
+0x058  0x0c8730c5  CODE
+0x05c  0x0c8730e1  CODE
```

这是一条**完整的 JIDL FEATURE 描述符**：包含名称、方法名，以及**真实的方法函数指针表**（全部 bit0=1，即合法 Thumb 函数指针）。

### 第二张表：网络/权限相关功能集合（`0xce8e10`）

```
0xce8df8  0x2cb4fde4  "files"
0xce8dfc  0x2cb37850  "cache"
0xce8e00  0x2cb5ad5c  "mass"
0xce8e04  0x2cb744e4  "tmp"
0xce8e08  0x2cbae980  "system"
0xce8e10  0x2cc94ea4  "system.fetch"
0xce8e14  0x2cc9553c  "system.request"
0xce8e18  0x2cca24b0  "system.network"
0xce8e1c  0x2cc94ef4  "system.uploadtask"
0xce8e20  0x2cca2490  "system.audio"
0xce8e24  0x2cc9553c  "system.request"
0xce8e28  0x2cc9531c  "system.geolocation"
0xce8e2c  0x2cca24a0  "system.record"
```

**这张表把 fetch 与 `system.request` / `system.network` / `system.uploadtask` / `system.audio` / `system.geolocation` / `system.record` 归为一组。** 除文件系统挂载点（`files`/`cache`/`mass`/`tmp`/`system`）外，其余全是**需要运行时权限的功能**（网络、麦克风、定位）。这强烈暗示这是一张 **权限↔功能映射表**——即 `requestPermissions` / `isBlackListed` 判定所依据的数据。

**副产品：发现了三个此前未在名字表中列出的功能名**——`system.network`、`system.audio`、`system.record`。

### 描述符表全貌（`0xce3800..0xce4000` 扫描）

同一区域还包含其他 FEATURE 描述符，可确认表的组织方式：

```
0xce3804  "BAROMETER"              0xce3834  "PROXIMITY"
0xce3814  "ACCELEROMETER"          0xce3844  "LIGHT"
0xce3824  "COMPASS"                0xce3854  "STEP_COUNTER"
0xce3864  "AMBIENT_TEMPERATURE"    0xce3874  "HUMIDITY"
0xce3884  "WRIST_LIFT"
0xce3934  "USER_EVENT"             0xce393c  "user_event_meta"
0xce3950  "usual.event.BATTERY_CHANGED"
0xce3958  "usual.event.CHARGING"
0xce3960  "usual.event.DISCHARGING"
0xce396c  "locale"                 0xce39d4  "Error"
0xce3a08  "strerror"
0xce3a34  "system.fetch"   0xce3a68  "fetch"
0xce3b04  "system.prompt"  0xce3b38  "showToast"   0xce3b44  "showDialog"
0xce3bf8  "system.uploadtask"  0xce3c2c  "uploadFile"
0xce3ccc  "UploadTask"     0xce3cd0  "UploadTask description"
0xce3ce8  "abort"          0xce3cf4  "onProgressUpdate"  0xce3d00  "offProgressUpdate"
0xce3db0  "system.interconnect"  0xce3de4  "instance"  0xce3e5c  "InterConn"
```

**fetch 的描述符与 `system.prompt`、`system.uploadtask`、`system.interconnect` 的形状完全一致，且同处一张连续表。**

## 1.7 权限与黑名单机制

FEATURE 框架里有明确的权限与黑名单函数：

```
0xbc8dcc  bool feature_framework::FeatureInstance::requestPermissions(FeaturePermissionsRequestInfo*)
0xbc8e28  /frameworks/runtimes/feature/src/feature_instance.cpp:118
0xbc8e88  bool feature_framework::FeatureInstance::isBlackListed(FeaturePermissionsRequestInfo*)
0xbc8ee0  /frameworks/runtimes/feature/src/feature_instance.cpp:134
0xbcc5b8  PermissionsInfo
0xbcc5c8  feature_framework::PermissionsInfo::PermissionsInfo(feature_framework::FeatureInstance*, FeaturePermissionsRequestInfo*)
0xbcc644  /frameworks/runtimes/feature/src/permissions_manager.cpp:64
0xbcc680  unknown reason
0xbc5bc0  permissions_test
```

**`feature_instance.cpp:118` 与 `:134` 是相邻的两个函数**——**权限检查紧挨着黑名单检查**，这是同一个决策点。

推测的调用链：

```
快应用 JS:  @system.fetch.fetch(...)
              ↓
        FeatureManager 查注册表 → 命中 "system.fetch"（已确认存在）
              ↓
        FeatureInstance::requestPermissions()   ← 要权限（feature_instance.cpp:118）
        FeatureInstance::isBlackListed()        ← 查黑名单（feature_instance.cpp:134）
              ↓
        通过 → fetch_impl.cpp 执行（UV 异步请求）
        拒绝 → JS 侧报错 / 不可用
```

**注意 `isBlackListed` 是个函数指针调用点**——如果它读一张设备/应用黑名单表，那么改表或挂钩使它返回 false，就是最符合 Chaos"借机制"哲学的手法。

**诚实说明边界：机制已定位，黑名单数据本身尚未定位。** 黑名单不太可能是明文表（太易改），更可能是：
- 从配置区 / eFuse 读的设备能力位
- 从云端下发的配置（多个 `getcloud:name=...` 字符串暗示存在云端配置机制）
- 编译进代码的设备代号判断

> **已由 1.7.1 证实**：`vela_ap.bin` 与 `vela_resource.bin` 中都**没有明文名单**（唯一的 blacklist 字符串是符号名），且 `isBlackListed` 的字面量池与 `system.device`/`getDeviceId` **同处一个函数范围**。所以"编译进代码的设备代号判断"或"数值能力位"这两条可能性最大。

**要确定必须反汇编** `feature_instance.cpp:118` 与 `:134` 两处，而本环境无 ARM 反汇编器（`objdump`/`readelf`/`arm-none-eabi-*`/`capstone` 均不可用；npm 安装 capstone 因无编译环境失败）。

## 1.7.1 关键补充：`canIUse` 与设备身份

### `canIUse` 是一个真实存在的全局 API

- 名字表位置 `0xbd5070`，夹在 `getInfo`（`0xbd5068`，属 `system.app`）与 `LoadLibrary`（`0xbd5078`）、`logLevel`（`0xbd5084`）之间
- 全局 API 描述符表自 `0xce4264` 起：`system.app`(`0xce4264`) / `getInfo`(`0xce4298`) / `terminate`(`0xce42a4`) / **`canIUse`(`0xce42b0`)** / `loadLibrary`(`0xce42bc`)；其后是 `system.mqttmessage`(`0xce4360`，含 `verify`/`decode`/`encode`)
- 表项形如 `[名字指针][描述符指针][计数]`，描述符内是 Thumb 指针：`loadLibrary`→`0xc893269`、**`canIUse`→`0xc893285`**、`terminate`→`0xc8932a1`、`getInfo`→`0xc8932ad`

**为什么这条很关键：** 一个规范编写的快应用会先 `if (!canIUse('system.fetch')) { ...降级... }` 再决定是否调用 fetch。
所以**"装了用 fetch 的快应用就报错"完全可能是 `canIUse` 返回 false 触发了应用自己的降级分支**，而不是 fetch 调用本身报错。这两者的修法是不同的。

### 但 `canIUse` 的函数体无法可靠提取（明确阻塞点）

按"文件偏移 = 虚址 − `0x0c000000`"换算，上表那些 Thumb 指针**落在函数中段**——没有 `PUSH {...lr}` 序言，却在使用 r4/r6/r7 等被调用者保存寄存器。
说明二者必有一错：
1. JIDL/FFI 描述符的字段布局与我的假设不同，或
2. 该段的代码基址不是 `0x0c000000`

**在拿到反汇编器之前这是一条死路。** 本环境无 `objdump`/`readelf`/`arm-none-eabi-*`/`capstone`，自写的 Thumb 解码器（`tools/thumb.js`）只覆盖 PC 相对取字面量。

### 设备身份表（将来做白/黑名单匹配的候选键）

`0xc059f4` 处出现字符串 `miwear_product.json`，其后是 `product_info` JSON，列出 10 Pro 的 **5 个主板变体**：

| board_id | device_model | miwear_model | miwear_pid |
|---|---|---|---|
| 20 | M2551B1 | miwear.watch.p67cn | 29598 |
| 21 | M2552B1 | miwear.watch.p67gl | 29601 |
| 22 | M2558B1 | miwear.watch.p67gln | 33343 |
| 23 | M2553B1 | miwear.watch.p67tc | 29599 |
| 24 | M2559B1 | miwear.watch.p67glt | 29600 |

**注意两处更正**：字段名是 `miwear_model`（不是 `miwear_device`）；正确的型号是 `M2551B1`，`M255112` 在全镜像中出现 **0 次**。
**这仍只是设备"识别"信息，不是能力声明**——没有迹象表明它带 fetch 开关。

### `isBlackListed` 与 `getDeviceId` 的字面量池共处一处（新证据）

`0x7a3318`–`0x7a3348`（代码段内的字面量池）依次含：

```
0x7a3318  THUMB 0xc863049
0x7a331c  "system.device"
0x7a3320  "getDeviceId"
0x7a3324  "(info) != (nullptr)"
0x7a332c  "bool feature_framework::FeatureInstance::isBlackListed(FeaturePermissionsRequestInfo*)"
0x7a3330  "/frameworks/runtimes/feature/src/feature_instance.cpp:134"
0x7a3334  "isBlackListed"
0x7a333c  "(manager) != (nullptr)"
0x7a3340  requestPermissions 符号
0x7a3344  feature_instance.cpp:118
0x7a3348  "requestPermissions"
```

`0x7a339c`–`0x7a33b4` 有第二份相同池子。

> ### ⚠️ 更正：本节原先的推断已被反汇编推翻
>
> 本节早先写过"`isBlackListed` 的字面量池与 `system.device`/`getDeviceId` 绑定在同一函数范围内，强烈暗示黑名单判定要读设备 ID"。
> **这个推断作废。** 用 `tools/dis.js` 反汇编 `0xc7a32dc`–`0xc7a3316` 后可见，这些字面量是 **assert 宏的参数**，不是被读取的判定数据：
>
> ```
> 0xc7a32dc  ldr r2,[pc,#0x44]  ; lit@0xc7a3324 = "(info) != (nullptr)"
> 0xc7a32e0  ldr r0,[pc,#0x48]  ; lit@0xc7a332c = "bool feature_framework::FeatureInstance::isBlackListed(...)"
> 0xc7a32e2  ldr r1,[pc,#0x4c]  ; lit@0xc7a3330 = ".../feature_instance.cpp:134"
> 0xc7a32ec  movs r3, #0x86      ; 0x86 = 134   ← 行号
> 0xc7a32ee  movs r0, #3         ; 日志等级
> 0xc7a32f0  ldr r2,[pc,#0x40]  ; lit@0xc7a3334 = "isBlackListed"
> 0xc7a32f4  bl   #0xc7a3078    ; assert/log 输出函数
> 0xc7a32f8  b    #0xc7a32b0
> ...
> 0xc7a3306  movs r3, #0x76      ; 0x76 = 118   ← requestPermissions 的行号
> 0xc7a3312  bl   #0xc7a3078
> ```
>
> `0x86`=134、`0x76`=118 与 `feature_instance.cpp:134` / `:118` 完全吻合，证明这是一段**断言失败时的冷块（out-of-line assert block）**。
> `"system.device"` / `"getDeviceId"` 只是**同一字面量池中相邻另一处断言的参数**（`(info) != (nullptr)` 这类断言表达式就在旁边）。
>
> **教训：字面量池是"同一编译单元内多处断言共享"的，不能凭相邻推断归属。** 本节其余部分（"黑名单数据不存在于明文"）仍然成立。

### 黑名单数据不存在于明文（反向证据，很重要）

- `vela_ap.bin` 的整个 FEATURE 区域（`0xbc0000`–`0xbe9000`）里，**唯一的 blacklist 字符串就是上面那两个符号名**——**没有任何黑名单数据表**。
- `system.fetch` 全镜像**只出现 1 次**（`0xbd4ea4`，即名字表项本身）。
- `vela_resource.bin`（171,755,520 字节）中 **`canIUse` 出现 0 次**，没有 `feature_list`/`support_list`/能力清单；其 `Capabilit` 命中全是 `[bttool] IO Capability:%d`（蓝牙工具），`fetch` 命中落在一张 JS 操作码名表（`4EACH_INIT` 等）里——**全部是无关命中**。

**推论**：设备级开关**不是**一张明文名单。更可能是：注册表项里编译进去的**整数能力位/设备掩码**；从配置分区 / eFuse / 云端下发的**数值配置**；或位于 `vela_ap.bin` 之外的分区（`vela_bl2.bin` / `vela_ota.bin` 尚未细查）。

## 1.7.2 反汇编器已就位 + 描述符对照（新的确定结论）

### 工具链阻塞已解除

`capstone-wasm@1.0.3`（**纯 WASM，不需要 node-gyp**）已装到 `tools/cs/package/`——用 `npm pack` 下载 tarball 再 `tar xzf` 解包，绕开了 `npm install` 的权限报错（`npm error The operation was rejected by your operating system`）。封装成 `tools/dis.js`：

```bash
node tools/dis.js <startHex> <endHex>          # 反汇编（代码基址 0x0c000000）
node tools/dis.js <startHex> <endHex> <baseHex># 自定义基址
node tools/dis.js pc <目标虚址Hex>              # 找出所有 PC 相对取该字面量的代码位置
```

注意 API 细节：常量带 `CS_` 前缀（`Const.CS_ARCH_ARM` / `Const.CS_MODE_THUMB`），且必须先 `await loadCapstone()`。用错常量（如 `Const.MODE_THUMB`）会静默退化成 ARM 模式并输出 `blvs` / `ldmibvs` 这类无意义指令。

**这解决了 2.7 与第四部分原先记为"阻塞项"的问题。**

### `system.fetch` 的注册与确认可用的功能完全同构

| 字段 | `system.fetch`（`0xce3a34`） | `system.prompt`（`0xce3b04`，确认可用） |
|---|---|---|
| 模块名 | `"system.fetch"`（`0xce3a34` / `0xce3a38`） | `"system.prompt"`（`0xce3b04` / `0xce3b08`） |
| 标志位 | **`0`**（`0xce3a3c`） | **`0`**（`0xce3b0c`） |
| 方法表 | `0xce3a40`→`0xce3a4c`，**6 个** Thumb 指针 | `0xce3b10`→`0xce3b1c`，**6 个** Thumb 指针 |
| 计数 | `1`（`0xce3a44`） | `2`（`0xce3b14`，prompt 有 2 个导出） |
| 导出名 | `"fetch"`（`0xce3a68`） | `"showToast"`（`0xce3b38`）+ `"showDialog"`（`0xce3b44`） |
| 后继指针 | `0xc892d75`（`0xce3a80`） | `0xc892e05`（`0xce3b50`） |

**结论：在注册表层面，fetch 与"确认可用"的功能没有任何结构差异，标志位也都是 `0`——注册表里没有"禁用"标志。**
这也支持 2.7 的判断：限制不在注册表。

**附带确认 JS 用法**：模块名 `system.fetch`，导出函数名 `fetch`（`0xce3a68`）。所以快应用里是
`import fetch from '@system.fetch'` 然后 `fetch.fetch({...})`——**不是** `system.fetch.fetch(...)`。

### 仍未解决的坑：描述符里的指针不是函数入口

反汇编 `0xc892d74`（fetch 的"后继指针"）与 `0xc893284`（canIUse 的）后可见，二者都**落在函数中段**，且是哈希表/链表的通用操作代码：

```
0xc892d74  str.w r4, [r3, r0, lsl #2]
0xc892d78  ldr   r6, [r1]
0xc892d7c  cbnz  r6, #0xc892dae
0xc892d7e  b.w   #0xc89230e
0xc892d86  ldr.w r5, [r4, r3, lsl #2]
0xc892d8a  cbz   r5, #0xc892dbc
```

没有 `PUSH {...,lr}` 序言，不是独立的 JIDL 包装函数。

**说明 JIDL/FFI 描述符的字段布局仍未解析**——`[名字][描述符指针][计数]` 只是从 `system.app` 反推的**假设**。**这些指针不能当函数地址用**，任何基于它们的"函数入口"结论都不可信（这正是 1.7.1 里 canIUse 提取失败的原因）。

**下一步应改为**：用 `tools/dis.js pc <名字串虚址>` 找**真正的代码引用点**（而不是读描述符字段）。

> ### 已执行该实验，结果为负（附一处地址换算错误的自查）
>
> **先说我自己犯的错**：第一次跑这个实验时我把虚址算错了——`0x2c0c0000 + 0xbd4ea4`，我写成了 `0x2ccd4ea4`。
> 正确算法：`0xc0000 + 0xbd4ea4 = 0xc94ea4`，所以虚址是 `0x2cc94ea4`。
> **两个地址差 `0x40000`，导致那一轮搜索全部落空。** 教训：数据段基址 `0x2c0c0000` 与文件偏移相加时只影响低 24 位，别把 `0xbd` 看成 `0xcd`。
>
> **用正确虚址重跑 `tools/dis.js pc`：**
>
> | 目标串 | 文件偏移 | 正确虚址 | PC 相对代码引用数 |
> |---|---|---|---|
> | `"canIUse"` | `0xbd5070` | `0x2cc95070` | **0** |
> | `"system.fetch"` | `0xbd4ea4` | `0x2cc94ea4` | **0** |
> | `"fetch"`（导出名） | `0xbd4e9c` | `0x2cc94e9c` | **0** |
>
> **这些字符串没有任何 PC 相对引用。** 这与 2.6 的结论一致：它们只被**描述符表**（数据段 `0xce3a34` / `0xce3a68` 等）引用；
> 而描述符表本身的起始地址（`0x2cda3a34` / `0x2cda3b04`）**也不被任何 4 字节指针引用**（refs 计数为 0）。
>
> **所以"从名字串反查代码"这条路走不通**：注册表是靠**偏移/基址索引**而不是指针数组访问的。
> 想找判定代码，只能从**调用方**（`requestPermissions` / `isBlackListed` 的调用点）或符号/日志字符串入手。
>
> **附一处真实代码引用（目前最有价值的线索）**：`"fetch"` 的描述符字段在代码段字面量池里出现，
> 池槽 `0x7d2dc4 = 0x2cc94e9c`，邻近槽位 `0x7d2dc8 = 0x2cda3a80`、`0x7d2dcc = 0x2cda3a70`、`0x7d2dd0 = 0x0c892dd5`。
> 使用这些槽位的函数在 `0xc7d2d74`–`0xc7d2dc0`：
>
> ```
> 0xc7d2d74  push.w {r4,r5,r6,r7,r8,lr}
> ...
> 0xc7d2d80  ldr  r4,[pc,#0x44]  ; lit@0xc7d2dc8 = 0x2cda3a80
> 0xc7d2d8a  ldr  r3,[pc,#0x40]  ; lit@0xc7d2dcc = 0x2cda3a70
> 0xc7d2d90  ldr  r3,[pc,#0x3c]  ; lit@0xc7d2dd0 = 0xc892dd5
> 0xc7d2d9e  str  r3,[r7,#0x1c]
> 0xc7d2da0  bl   #0xc7a2b08
> 0xc7d2da4  cbnz r0,#0xc7d2dbc
> 0xc7d2db8  bl   #0xc7b3550
> 0xc7d2dc0  pop.w {r4,r5,r6,r7,r8,pc}
> ```
>
> 形态（栈上拼结构体 + 两次 bl + 传入一段代码地址 `0xc892dd5`）很像 **JIDL 生成的包装函数**。
>
> ~~但定向 grep 显示没有任何 `ldr` 指向池槽 `0x7d2dc4`（该窗口命中 0 条），所以 `"fetch"` 指针很可能是相邻函数共享字面量池里的未使用槽位。~~
>
> **⚠️ 上面这条已被 1.7.3 推翻。** 那次 grep 用了错误的地址键（传了带基址的虚址而非文件偏移），
> 才得到「没有 ldr 指向 `0x7d2dc4`」的假否定。实际上 `0xc7d2d78` 的 `ldr r4,[pc,#0x48]`
> 正是取自池槽 `0x7d2dc4 = 0x2cc94e9c`（即字符串 `"fetch"`），
> 所以 **`0xc7d2d74` 确实是 `fetch` 的注册函数**，详见 1.7.3。
> **保留下来的教训：一个「0 命中」的否定结论，在当作证据之前必须先自查地址换算。**

## 1.7.3 决定性证据：`fetch` 的 JIDL 方法确实被注册（新工具 + 反汇编）

### 新工具：字面量加载映射 `tools/litload.js` / `tools/litload2.js`

之前的 `tools/dis.js pc` 只能线性扫描，遇到字面量池就失步。新工具改成**全段枚举**：扫描代码段每个 2 字节对齐位置，识别所有 PC 相对取址指令，建立 `池槽文件偏移 → [加载它的代码地址]` 映射。

支持的编码：16 位 `LDR Rt,[PC,#imm8*4]`（`01001`）、32 位 `LDR.W`（`F8DF`）、`LDRD`（`E9DF`）、`ADR`/`ADD PC`（`A000`/`F800`/`F20F`）。

```bash
node tools/litload2.js fwx/vela_ap.bin 7d2e00 830aec 831c44
# → 0x7d2e00 -> 0xc7d2df6
```

**踩过的坑（写下来免得再犯）**：工具用**文件偏移**做键，我却传了带基址的虚址（`c7d2e00` 而不是 `7d2e00`），于是得到一片假的 "(no loader)"。同理早先 `0xbd4ea4 + 0x2c0c0000` 被我算成 `0x2ccd4ea4`（正确是 `0x2cc94ea4`）。**凡"查不到引用"的负面结论，先自查地址换算。**

### 关键发现一：`fetch` 的注册函数（`0xc7d2d74`）

`0xc7d2d74` 是货真价实的 JIDL 绑定/注册函数，反汇编如下（已用 capstone 校正，非手工解码）：

```
0xc7d2d74  push.w  {r4,r5,r6,r7,r8,lr}
0xc7d2d78  ldr     r4,[pc,#0x48]  ; lit@0xc7d2dc4 = 0x2cc94e9c   ← 指向字符串 "fetch"
0xc7d2d7a  sub     sp,#0x28
0xc7d2d7c  add     r7,sp,#8
0xc7d2d7e  str     r4,[r7,#8]     ; 栈上描述符 [r7+8] = "fetch"       ← 方法名
0xc7d2d80  ldr     r4,[pc,#0x44]  ; lit@0xc7d2dc8 = 0x2cda3a80
0xc7d2d82  ldrd    r6,r1,[r7,#0x38]
0xc7d2d86  str     r4,[r7,#0x14]  ; [r7+0x14] = 0x2cda3a80
0xc7d2d8a  ldr     r3,[pc,#0x40]  ; lit@0xc7d2dcc = 0x2cda3a70
0xc7d2d8e  str     r3,[r7,#0x18]  ; [r7+0x18] = 0x2cda3a70
0xc7d2d90  ldr     r3,[pc,#0x3c]  ; lit@0xc7d2dd0 = 0x0c892dd5
0xc7d2d92  mov     r1,r7
0xc7d2d98  strd    r2,r4,[r7]
0xc7d2d9c  str     r6,[r7,#0xc]
0xc7d2d9e  str     r3,[r7,#0x1c]  ; [r7+0x1c] = 0xc892dd5  ← 绑定的代码指针
0xc7d2da0  bl      #0xc7a2b08
0xc7d2da4  cbnz    r0,#0xc7d2dbc
0xc7d2da6  ldrd    r3,r2,[r6]
0xc7d2dac  mov     r0,r8
0xc7d2db0  ldr     r1,[r3]
0xc7d2db2  mov     r2,r5
0xc7d2db4  mov     r3,r4
0xc7d2db8  bl      #0xc7b3550     ; ← 注册/绑定调用
0xc7d2dc0  pop.w   {r4,r5,r6,r7,r8,pc}
```

它在栈上拼出一个 JIDL 方法描述符（名字 `"fetch"`、类型描述符 `0x2cda3a70` / `0x2cda3a80`、代码指针 `0xc892dd5`），
然后调用 `0xc7b3550` 完成注册。最后一块立即数池 `0x7d2dc4`–`0x7d2dd0` 就是它的。

### 关键发现二：方法描述符访问器（`0xc7d2df4`）

```
0xc7d2df4  push   {r7,lr}
0xc7d2df6  ldr    r1,[pc,#8]   ; lit@0xc7d2e00 = 0x2cda3a30   ← fetch 描述符结构体起始
0xc7d2df8  add    r7,sp,#0
0xc7d2dfa  bl     #0xc7a2898
0xc7d2dfe  pop    {r7,pc}
```

`0xc7a2898` 我在同一轮里也反汇编出来了：

```
0xc7a2898  push {r7,lr}
0xc7a289c  cbz  r1,#0xc7a28b8   ; assert(info != nullptr)        行号 0x1dc = 476
0xc7a289e  cbz  r0,#0xc7a28a6   ; assert(reg  != nullptr)        行号 0x1df = 479
0xc7a28a0  bl   #0xc7ae7c4      ; → 按名字在 map 里查找
```

而 `0xc7ae7c4` 是一个**字符串 map 查找函数**：它以 `memcmp`（`bl 0xc130b48`）逐项比较长度与内容，
用的是 libstdc++ `std::string` 的 SSO 布局（容量字节在 `+0`，`lsr #1` 取长度，`and #1` 判断是否堆分配）。

**结论：`FeatureRegistry` 是一张以功能名为键的 map；`fetch` 的描述符在 `0xce3a30`，且存在一个把它注册进去的 JIDL 函数。**

### 关键发现三：一张明确列出 `system.fetch` 的功能表（`0xce8e10`）

数据段 `0xce8df8`–`0xce8e2c` 是两张连续的名字表：

| 偏移 | 内容 |
|---|---|
| `0xce8df8` | `"files"`, `"cache"`, `"mass"`, `"tmp"`, `"system"`, `0` ← **存储区（storage area）白名单** |
| `0xce8e10` | `"system.fetch"`, `"system.request"`, `"system.network"`, `"system.uploadtask"`, `"system.audio"`, `"system.request"`, `"system.geolocation"`, `"system.record"`, `0` ← **需要权限的功能组** |

两张表都有代码在消费它：
- `0xce8df8` 由 `0xc830948` 处的指令加载
- `0xce8e10` 由 `0xc831b1c` 处的指令加载，紧随其后的代码是：

```
0xc831b1c  ldr  r3,[pc,#0x124]   ; lit@0xc831c44 = 0x2cda8e10   ← 上面那张功能表
0xc831b1e  add.w sl,r7,#0x20
0xc831b28  ldm  r3,{r0,r1,r2,r3}      ; 取 4 个名字指针
0xc831b2a  stm.w sl,{r0,r1,r2,r3}
0xc831b30  ldr.w r2,[sl,r6,lsl #2]    ; 取第 r6 个名字（r6=0 → "system.fetch"）
0xc831b34  str  r2,[r7,#0x18]
0xc831b38  ldrb.w r2,[r8]             ; strlen(name)
0xc831b3c  adds r3,#1
0xc831b3e  cmp  r2,#0
0xc831b40  bne  #0xc831b36
0xc831b44  sub.w r8,r8,fp             ; r8 = 名字长度
0xc831b50  ldrh r3,[r4,#0xe]          ; std::map 红黑树节点标志
0xc831b5c  ldrb r3,[r4,#0xd]          ; 节点内字符串长度
```

**这就是"拿 `system.fetch` 当键去查一张 map"的代码。** `system.fetch` 在表里是**第 0 项**，
即它是这套权限/能力检查的固定成员之一，不是被排除项。

### 对 1.7 结论的修正

原先 2.7 怀疑的"注册表里有禁用标志"**可以否定了**：

1. `fetch` 有完整的实现（`fetch_impl.cpp` 的日志、libuv、方法名、生命周期钩子齐全）。
2. `fetch` 在功能注册表里有条目，**标志位 `0`，方法数 6，与确认可用的 `system.prompt` 结构完全一致**。
3. 存在一个**明确以 `"fetch"` 为方法名做 JIDL 绑定注册**的函数（`0xc7d2d74`），把它绑到代码 `0xc892dd5`。
4. 存在一个返回其描述符的访问器（`0xc7d2df4`）。
5. 固件里还有一张把 `system.fetch` 放在**第 0 位**的功能/权限表（`0xce8e10`），并有代码消费它。

**因此：`fetch` 在固件层面是"已实现、已注册、被预期使用"的。** 官方文档说"手环 10 不支持"，
在这个固件版本上**不成立于代码层面**——它至多是产品策略/权限申请层面的事。

**仍然无法静态确定的是**：`isBlackListed` / `requestPermissions` 判定的**输入数据**在哪
（明文里没有名单，见 1.7.1）。这一步需要动态观测或对照另一台设备的固件。

### 由这批发现得到的最高性价比实验

与其继续静态逆向，**先花 5 行 JS 把分支收敛**：写一个最小快应用，依次打印

```js
console.log('canIUse:', canIUse && canIUse('system.fetch'));
console.log('canIUse2:', canIUse && canIUse('system.request'));
try { require('@system.fetch').fetch({url:'http://<你自己的中转>/ping',
      success:r=>console.log('ok', r.data), fail:(d,e)=>console.log('fail', JSON.stringify(d), e)}); }
catch (err) { console.log('throw', err && err.message); }
```

这三种返回立刻区分四条分支：
- `canIUse` 为 false → **注册表/能力位**拒绝（`isBlackListed` 或注册表标志）
- `canIUse` 为 true 但报"权限" → **`requestPermissions`**（feature_instance.cpp:118）
- `canIUse` 为 true、`fail` 带 `UV_REQUEST ERROR ... state=..., response code=...` → **网络层**（fetch 已放行，问题在链路）
- `throw` 且信息为模块不存在 → **打包/注册名**问题

**这一步比继续盲扫固件信息量高一个数量级**，而且用户手上就有设备。

## 1.7.4 开源源码给出的最终答案（`open-vela/frameworks_runtimes_feature`）

### 重大发现：Vela 的 feature 框架是开源的

**`https://github.com/open-vela/frameworks_runtimes_feature`**（分支 `dev`，Apache-2.0）
就是固件里的 `feature_framework`。固件中的源文件路径 `/frameworks/runtimes/feature/src/feature_instance.cpp`
与之完全对应。**不需要再逆向猜逻辑了——直接读源码。**

### 源码原文：`isBlackListed` 只拦一个 API

`src/feature_instance.cpp`（共 154 行；固件里的行号 118/134 对应本地版本的 128/145）：

```cpp
bool FeatureInstance::requestPermissions(FeaturePermissionsRequestInfo* info)
{
    auto manager = featureManager();
    FEATURE_CHECK_NE(manager, nullptr);
    if (manager->permissionsManager().HasPermissionCb()) {
        PermissionsInfo* perms_info = new PermissionsInfo(this, info);
        uint64_t pid = manager->permissionsManager().AddPermissions(perms_info);
        manager->addTaskExt((FeatureInstanceHandle)this, permission_request_task, pid);
        if (isBlackListed(info)) {
            return false;
        }
        return true;
    }
    FEATURE_LOG_DEBUG("no permissions cb!");
    return false;
}

bool FeatureInstance::isBlackListed(FeaturePermissionsRequestInfo* info)
{
    FEATURE_CHECK_NE(info, nullptr);
    if (strcmp(description_->name, "system.device") == 0
        && strcmp(info->api_name, "getDeviceId") == 0) {
        return true;
    }
    return false;
}
```

**结论：所谓"黑名单"与 `fetch` 毫无关系。**
它只有一个硬编码特例：**禁止 `system.device.getDeviceId`**。仅此一条。

> ⚠️ **此处必须更正我在 1.7.2 之后做过的一次"撤回"，那次撤回本身是错的。**
> 我曾根据字符串池中 `isBlackListed` 邻近 `"system.device"` / `"getDeviceId"` 推断"黑名单依赖设备 ID"，
> 随后又因为"池归属是启发式"而撤回该推断。**现在源码证明：最初的推断是对的。**
> 教训：启发式推断被源码证实/证伪之前，既不该当成结论，也不该急着撤回——**记录为待验证假设**才是正确做法。

### 真正的门：`fetch` 需要运行时权限

`modules/jidl/fetch.jidl`：

```
module system.fetch@1.0

struct FetchPara{
  string url;
  object data;
  object header;
  string method = "";        //MethodType
  string responseType = "";  //ResponseType
  int timeout = 20000;
}

[permissions="hapjs.permission.INTERNET"]
promise<object> fetch(FetchPara obj);
```

注意 **`timeout` 默认 20000ms** 与 **返回 `promise<object>`**（不是回调式 success/fail）。

`include/feature_permission.h` 定义全部 5 个权限：

```c
#define FEATURE_PERMISSION_LIST(V)                                     \
    V(HAPJS_PERMISSION_INTERNET, 0, "hapjs.permission.INTERNET")       \
    V(HAPJS_PERMISSION_LOCATION, 1, "hapjs.permission.LOCATION")       \
    V(HAPJS_PERMISSION_RECORD, 2, "hapjs.permission.RECORD")           \
    V(HAPJS_PERMISSION_DEVICE_INFO, 3, "hapjs.permission.DEVICE_INFO") \
    V(HAPJS_PERMISSION_READ_HEALTH_DATA, 4, "hapjs.permission.READ_HEALTH_DATA")
```

**这正好解释了固件里那张表 `0xce8e10`**：
`system.fetch` / `system.request` / `system.network` / `system.uploadtask` → INTERNET；
`system.audio` / `system.record` → RECORD；`system.geolocation` → LOCATION。
**它就是"功能 → 权限"的映射表。**

### 完整的失败链路

`frameworks_runtimes_quickapp` 的 `shell/common/permission/permission_manager_impl.cpp`：

```cpp
void PermissionManagerImpl::verifyAuth(FeaturePermissionId permid, const char* permission, ...)
{
    char permission_buf[QAPP_PERM_NAME_LEN];
    bool ret = validatePermissionName(permission, permission_buf, sizeof(permission_buf) - 1);
    if (!ret) { FeatureRejectPermissions(feature_manager_, handle, FEATURE_PERMS_DENIED); return; }
    requirePermission(package_name_, permid, permission_buf, api_name, need_block,
        [this, handle](int result) { doPermissionResult(result, handle); });
}
```

而 `validatePermissionName` 做**权限名前缀改写**：

```cpp
#define QAPP_JS_PERM_NAME_PREFIX "hapjs.permission."
#define QAPP_SYS_PERM_NAME_PREFIX "vela.permission."
```

即：`hapjs.permission.INTERNET` → **`vela.permission.INTERNET`**。然后：

```cpp
void PermissionManagerImpl::doPermissionResult(int result, FeaturePermissionsHandle handle)
{
    if (result == PermissionManager::GRANTED) {
        FeatureGrantPermissions(feature_manager_, handle);
    } else {
        FeatureRejectPermissions(feature_manager_, handle, FEATURE_PERMS_DENIED);
    }
}
```

失败时 `PermissionsInfo::RejectPermissions()` 把 **`"permissions denied"`** 作为错误信息抛回 JS。

**所以完整链路是：**

```
JS: fetch.fetch(...)
  → FeatureInstance::requestPermissions()
     → permissionsManager.RequestPermissions()
        → 回调 _feature_permission_query()          ← 由快速应用框架注册
           → verifyAuth() → validatePermissionName()  "hapjs." → "vela."
              → requirePermission(pkg, INTERNET, "vela.permission.INTERNET", api, cb)
                 ← 由 PermissionManager::Client 实现，**这是厂商（闭源）实现**
                    GRANTED → FeatureGrantPermissions() → 真正执行 fetch
                    DENIED  → FeatureRejectPermissions(FEATURE_PERMS_DENIED)
                                → JS 收到 "permissions denied"
```

`permission_manager.h` 里的 `Client` 是**纯虚接口**：

```cpp
virtual void requirePermission(const std::string& package_name, FeaturePermissionId permid,
    const std::string& permission, const std::string& api_name,
    std::function<void(int)> result_cb) = 0;
```

**这就是"产品策略"所在的位置。** 权限数据库、是否弹确认框（`showPermissionConfirmDialog` 明确写着"由外部实现"）、
每一台设备允许哪些权限——全在这个 Client 里，而它在小米的闭源产品层。

### 官方"不支持"表的真正含义

官方文档那张表（手环 10 = 不支持）**不是**说 fetch 没实现，也**不是**说 fetch 被黑名单。
它说的是：**这台设备的权限提供方（Client）不会授予 `vela.permission.INTERNET`。**

### 由此得到的关键结论

| 问题 | 答案 |
|---|---|
| fetch 实现存在吗？ | **存在**，且完整 |
| fetch 被注册了吗？ | **注册了**，有专门的 JIDL 注册函数 |
| fetch 被黑名单拦了吗？ | **没有**。黑名单只拦 `system.device.getDeviceId` |
| 那卡在哪？ | **权限授予**：`vela.permission.INTERNET` 的运行时授予，由闭源产品层决定 |
| 报错会是什么？ | 极可能是 **`permissions denied`**（或 `permissions error` / `permissions no background` / `unknown reason`，来自 `get_perms_reject_message`） |
| manifest 里声明权限够吗？ | **不够**。声明只让应用"有权申请"，是否授予由 Client 决定——**这解释了用户"第一条路试了不可行"** |

### 代码级对策（两条）

**对策 A —— 强制授予（推荐，单点）**
`PermissionsManager::RequestPermissions()` 是关键窄点。把它改成直接
`info->GrantPermissions()` 而不去问 `p_cb_`，则所有权限自动通过。
在固件里的定位方式：用 `tools/litload2.js` 找引用字符串 `/frameworks/runtimes/feature/src/permissions_manager.cpp:64`
（文件偏移 `0xbcc644`）的代码，其所在函数即该编译单元，再顺藤摸到 `RequestPermissions`。
**注意**：这是运行时 hook，需用 Chaos 的"复制+改指针"范式，不要原地改。

**对策 B —— 改 Client 的返回值**
`doPermissionResult(int result, ...)` 是 `if (result == GRANTED)` 的单点判断。
找到它并把判断反转/短路，等价于"永远授予"。
但它在 quickapp shell 里（`permission_manager_impl.cpp`），不在 feature 库里。

**两条都不便宜，但都只在**一个**函数上动手，风险远小于改注册表。**

### 一个仍未解开的矛盾（必须诚实记录）

固件里**没有** `hapjs.permission.*`、`INTERNET`、`vela.permission.*`、`permissions denied` 这些字符串
（`vela_ap.bin` 与 `vela_resource.bin` 均为 0 命中），
**但** `permissions_manager.cpp:64` 的断言行号**精确匹配** OSS 源码第 64 行
（`FEATURE_CHECK_NE(has_rest_params && opt_argc, true);`），
且 `PermissionsInfo` 构造函数全名、`"unknown reason"` 都在。

同时固件里也**没有** `PermissionManager` / `verifyAuth` / `requirePermission` / `FeatureGrantPermissions` /
`FeatureSetPermissionsCallback` 这些符号名。

**两种解释，尚未区分：**
1. 该固件的快速应用 shell **没有接权限系统** → `HasPermissionCb()` 恒为 false → `requestPermissions` 直接返回 false
   → **所有带权限的 API 一律失败**（不只是 fetch）。
2. 权限名以**纯 ID** 形式编译进描述符，名字表被裁剪；符号名因为 release 构建无调试串而缺失。

**倾向解释 2**：`permissions_test` 模块（14 处符号）在固件里是完整的，而它的 JIDL 明确带 5 种权限注解；
若注解被裁剪，该测试模块就失去意义。

**这条矛盾的解决方式**：在同一固件的快速应用 shell 段里找 `FeatureSetPermissionsCallback` 的调用点
（它接受函数指针，不依赖字符串），有调用 → 解释 1 错，无调用 → 解释 1 对。

---

## 1.7.5 社区资料调研（逐机型，**绝不混用**）

> 依据用户要求「手环型号分级很严格，9 / 9 Pro / 10 / 10 Pro 不要混为一谈；
> 官方说的不支持不一定准确，以社区为准」。本节所有网页内容按**资料**看待。

### 型号与代号对照（社区整理，权威度较高）

| 机型 | 代号 | 屏幕 | 固件版本段 |
|---|---|---|---|
| 小米手环 9 | `n66`（n66cn / n66nfc / n66tc / n66gl） | 192×490，圆角 96 | 3.1.x |
| 小米手环 9 Pro | `n67`（n67cn / n67gl） | 336×480，圆角 48 | 3.1.x |
| 小米手环 10 | `o66`（o66cn / o66nfc / o66tc / o66lj / o66o / o66gl） | 212×520，圆角 104 | 3.1.x |
| **小米手环 10 Pro** | **`p67cn`**（陶瓷 `p67tc` / 海外 `p67gl` / 海外NFC `p67gln` / `p67glt`） | 336×480，圆角 48 | **3.101.x** |

**这条对照表独立证实了本研究的对象**：用户给的固件
`miwear.watch.p67cn_v3.101.043` 中的 `3.101.x` **只属于 10 Pro**
（`p65`=REDMI Watch 6 是 `3.100.x`，极易与 `3.101.x` 混淆；手环 10 是 `3.1.x`）。
固件里那个 `miwear_product.json` 表（§1.7.1）也自证了同一件事。

### 官方 vs 社区（fetch）——**逐机型**

| 机型 | 官方 | 社区实测 | 关键证据 |
|---|---|---|---|
| 小米手环 9 Pro `n67` | 不支持 | **实测可用（与官方相反）** | bandbbs 24134、Searchstars/HyperBilibili |
| 小米手环 9 `n66` | 不支持 | **证据不足**，未见明确实测 | bandbbs 16889（正文未完整取得） |
| 小米手环 10 `o66` | 不支持 | **社区一致判不支持** | bandbbs 21085 |
| **小米手环 10 Pro `p67`** | 不支持 | **未找到任何 fetch 可用的实测**；社区/知识库一致判不支持 | bandbbs 29315、bandbbs 25977 |

**结论要诚实说清楚**：用户说「官方不支持表不准、以社区为准」——
**这条对 9 Pro 成立**（官方说不支持，社区实测可用）。
**但对 10 Pro 不成立**：目前**没有任何**社区实测证明 10 Pro 上 fetch 可用，
社区口径与官方一致。米坛知识库 AI 助手在 bandbbs 29315 的原话是：

> 手环 10 Pro 运行 Vela 5.0，**不支持 fetch**，请不要安装标注支持 fetch 的小米手环 9 Pro 资源。

这与 §1.7.3 的固件结论（**fetch 实现在固件里完整存在且已注册**）并不矛盾，
反而互相印证：**框架里有，产品层不给**（见 §1.7.4 的权限门）。

### 9 Pro 实测可用的**附加条件**（不可直接搬到 10 Pro）

1. **必须先连接「小米运动健康」**——手环自己不出网，HTTP 请求由手机侧代发出网；
   未连接时 fetch 失败。
2. **协议限制有争议**：9 Pro 用户实测「只支持 http，不支持 https」，需要 Flask + PythonAnywhere
   之类的 **http 中转**（bandbbs 24134）；但同一机型上的开源项目用 https 地址并称实证成立
   ——**两说并存，需真机复测**。
3. HTTPS 有实测 SSL 报错（`code: 35, SSL connect error`，且**模拟器不出现、真机才出现**）
   （bandbbs 20596）。

### 10 / 10 Pro 目前事实上的联网方案：interconnect 手机桥接

社区通用方案不是 fetch，而是 `@system.interconnect` 把 HTTP 请求交给手机 App 代发：

- **SimpleFetch**（docs.b4qaq.cn）——文档原文点名「不少设备（如小米手环 8/9/10 Pro、
  Redmi Watch 4 等）不支持 `@system.fetch`，通过 interconnect 在手机与手表间建桥」。
- SimpleFetch-Android-Bridge、ResonaUI、Searchstars 的 FetchBridge 插件。
- **静默失败陷阱**：interconnect 要求**手机 APK 与手环 RPK 的包名+签名完全一致**，
  否则 `addListener/sendMessage` 会**静默失败、收不到任何消息**——这正是"看不到报错"的常见原因。

### 排错用得到的两条

- **错误码**（社区整理）：`203` = **设备不支持**；`201`/`207` = **权限**。
  手环上 fetch 失败若拿到 `203`，说明是**机型能力**判定，不是权限。
- **真机日志**：小米运动健康 → 我的 → 关于 → **Debug** → 拉取固件日志，
  文件在 `/sdcard/Android/data/com.mi.health/files/log`。
  用户说"报什么错不知道"，**这条路径可以直接拿到报错**（成本最低的一步）。

### 新固件证据：设备端**确实带有 internet 权限的资源**

调研过程中顺手在 **`vela_resource.bin`（171,755,520 字节）**里发现了权限资源清单
（文件内偏移 `0x4745933` 附近，均为 `.cta` 本地化资源键）：

```
per_is_allowed%s%s.cta
per_name_activity_motion.cta   per_name_bluetooth.cta        per_name_call_phone.cta
per_name_device_info.cta       per_name_gesture_detection.cta per_name_internet.cta  ←
per_name_location.cta          per_name_media_data.cta       per_name_nfc.cta
per_name_read_calendar.cta     per_name_read_call_log.cta    per_name_read_contacts.cta
per_name_read_health_data.cta  per_name_read_phone_state.cta per_name_read_sms.cta
per_name_receive_sms.cta       per_name_record_audio.cta     per_name_send_sms.cta
per_name_step_counter.cta      per_name_write_calendar.cta   per_name_write_call_log.cta
per_name_write_contacts.cta
permission_management.cta      permission_privacy.cta        permission_privacy.settings
permission_records.cta         permission_state_all.cta      permission_state_not.cta
permission_state_ok.cta
```

**含义（新结论）**：

1. 设备上**存在完整的权限管理机制**，包括一个名为 **`internet`** 的权限资源条目，
   以及权限管理 / 隐私 / 记录界面（`permission_management.cta` 等）。
   → **「10 Pro 完全不懂 INTERNET 权限」这个假设可以排除。**
2. 这解释了为什么 `hapjs.permission.*` 在 `vela_ap.bin` 里查不到（§1.7.4）：
   **面向用户的权限资源在资源分区里齐全**，运行时名字符串则可能以 ID 形式编译。
3. 也就是说：**权限的"名字与界面"在设备上；权限的"授予决定"在手机侧/产品层。**
4. 这给出一条**此前没考虑过的路**：既然设备端有 `permission_management` 界面与
   `per_name_internet` 条目，那么**10 Pro 的权限授予可能是用户/手机可配置的**——
   应当去查「手环设置 / 应用管理 → 权限」里，快应用的"网络"权限是否是一个
   **默认为关、但可以打开**的开关。这比改固件优先级高得多（可逆、无需 hook）。

## 1.7.6 「按机型裁剪」的真正开关 + 权限链路在本机其实不生效（**决定性反转**）

本节推翻了 1.7.4 / 1.8 原有的"拦住它的是运行时权限授予"这一结论。所有依据都来自
`https://github.com/open-vela/frameworks_runtimes_feature`（`dev` 分支，已 `git clone` 到
`/dsh/workspace/chaos/oss_feature`）。

### A. `fetch` 的"支持/不支持"是**编译期** Kconfig，不是运行期数据表

```make
# modules/Kconfig:98
config FEATURE_SYSTEM_FETCH
	bool "system.fetch"
	default y
```

```make
# modules/Makefile:293-297
ifeq ($(CONFIG_FEATURE_SYSTEM_FETCH),y)
	CXXSRCS   := $(CXXSRCS) $(APPDIR)/frameworks/runtimes/feature/modules/fetch_impl.cpp
	JIDL_PATH := $(JIDL_PATH) $(APPDIR)/frameworks/runtimes/feature/modules/jidl/fetch.jidl
	FEATURELIST += system_fetch
endif
```

（`modules/CMakeLists.txt:287` 是同一开关的 CMake 版本。）

而**快应用能看到的模块清单就是由 `FEATURELIST` 生成的**——
`modules/ajs_features_registry.cpp:15-22`：

```c
FeatureRegistryTable g_ajs_features_registry_table = {
    .count = 0,
    .data = {
#include "features_registry_table.h"   // 由 FEATURELIST 生成
        nullptr
    }
};
```

> **所以"某机型不支持 fetch"的机器语义是：该机型的 defconfig 把 `CONFIG_FEATURE_SYSTEM_FETCH` 关掉，
> `fetch_impl.cpp` 与 `fetch.jidl` 根本不参与编译，JS 里连模块都不存在（`undefined`）。**
> 这与"模块存在但被权限拒绝"是**完全不同的两种失败**，报错也不同。

**本例固件的实测结果**：`fetch_impl.cpp` 的字符串（`0xbcce68` 路径、`system_fetch_onCreate` `0xbccfa0`）、
`system.fetch` 注册名（`0xbd4ea4`）、真实描述符表项（`0xce3a34`）**全部存在**
⇒ **本机编译进来了，模块是可见的。**

### B. JIDL 代码生成模板的真实语义（**最关键的一处反转**）

`tools/jidl/json_ast_source.mt:655-702` 是**所有带权限标注的接口**的代码生成模板。它生成的桩函数是：

```c
static void ${func_id}_stub(FeatureInterfaceHandle handle, AppendData adata, void** argv, int argc, void* ret)
{
    static const FeaturePermissions ${func_id}_permissions = { ${low_bits}, ${high_bits} };
    FeaturePermissionsRequestInfo request_info = {
      .adata = adata, .api_name = "${identifier}", .argv = argv, .argc = argc,
      .method = &${func_id}_member_method,
      .permissions = &${func_id}_permissions,
      .cb = ${func_id}_permissions_cb,
    };
    if (FeatureRequestPermissions(handle, &request_info))
        return;                       // ← true：提前返回，真正的 API 延后到权限回调里跑
    ${func_call}(handle, adata ...);   // ← false：**落下来立刻执行真正的 API**
}
```

> **`FeatureRequestPermissions` 返回 `false` 时，权限检查等于不存在——接口照常执行。**
> 只有返回 `true` 时，真正的 API 才会被推迟到 `PermissionsInfo::GrantPermissions()` 里执行；
> 若平台随后 `RejectPermissions`，JS 侧才会收到 `"permissions denied"` 这类错误。

### C. `requestPermissions` 何时返回 `false`

`src/feature_instance.cpp:128-143`（开源 `dev` 分支，与固件行号 118/134 为邻近版本）：

```cpp
bool FeatureInstance::requestPermissions(FeaturePermissionsRequestInfo* info)
{
    auto manager = featureManager();
    FEATURE_CHECK_NE(manager, nullptr);
    if (manager->permissionsManager().HasPermissionCb()) {   // ← 关键分支
        PermissionsInfo* perms_info = new PermissionsInfo(this, info);
        uint64_t pid = manager->permissionsManager().AddPermissions(perms_info);
        manager->addTaskExt((FeatureInstanceHandle)this, permission_request_task, pid);
        if (isBlackListed(info)) { return false; }
        return true;
    }
    FEATURE_LOG_DEBUG("no permissions cb!");
    return false;                                            // ← 放行
}
```

三种情形：

| 情形 | 返回值 | 结果 |
|---|---|---|
| **没人注册权限回调**（`HasPermissionCb()==false`） | `false` | **直接执行 API，不检查权限** |
| 有回调 + 命中黑名单 | `false` | **直接执行**（黑名单只含 `system.device.getDeviceId`，且 `PermissionsInfo` 构造会把首参清零） |
| 有回调 + 未命中黑名单 | `true` | 延后，交给平台 `PermissionManager::Client` 决定授予 / 拒绝 |

`isBlackListed()`（`feature_instance.cpp:145-153`）全文只有一条判定：

```cpp
if (strcmp(description_->name, "system.device") == 0
    && strcmp(info->api_name, "getDeviceId") == 0) {
    return true;
}
```

> **`fetch` 不在黑名单里。黑名单与 fetch 无关。**

### D. 本机到底有没有注册权限回调？——新证据指向「没有」

开源 quickapp 侧的权限胶水是
`oss_quickapp/shell/common/permission/permission_manager_impl.cpp`（已 clone 到
`/dsh/workspace/chaos/oss_quickapp`）。它**必然**会把自己的日志格式串带进二进制，
且这些是 **INFO / WARN 级，不是可被 release 删掉的 DEBUG 级**：

```cpp
SHELL_LOG_INFO("permission(%s) api(%s) handle(%p) block(%d)", permission, api_name, handle, need_block);
SHELL_LOG_INFO("permission: back to feature res(%d) handle(%p)", result, handle);
```

在本机固件 `vela_ap.bin` 里的命中数：

| 字符串 | 命中 |
|---|---|
| `permission(%s) api(%s)` | **0** |
| `back to feature res` | **0** |
| `hapjs.permission.` | **0** |
| `vela.permission.` | **0** |
| `validatePermissionName` | **0** |
| `requirePermission` | **0** |
| `PermissionManager` | **0** |
| `PermissionManagerImpl` | **0** |
| （对照）`INTERNET` | **0** |
| （对照）`no permissions cb`（DEBUG 级） | 0（符合"release 删 DEBUG"预期） |

两条独立指标（类名/符号 + 运行期格式串）**同时为空**
⇒ **本固件的 quickapp 运行时没有接入权限系统。**

### E. 由此得到的修正结论

1. **1.7.4 的链条仍然正确，但本机根本不走那条链。** `HasPermissionCb()` 为假，
   `FeatureRequestPermissions` 恒返回 `false`，JIDL 桩函数**直接执行**真正的 API。
   ⇒ **在本机，权限层不是拦路虎。**
2. **"官方支持表说不支持"≠"固件里被拦"。** 按 A 节的机制，官方那句"不支持"最可能对应
   产品 defconfig 关掉 `CONFIG_FEATURE_SYSTEM_FETCH` 的**其他**型号；
   本机固件**并没有关掉它**。
3. **因此本机 fetch 报错的原因应当在别处**，候选（需真机日志或 canIUse 才能区分）：
   - `canIUse('system.fetch')` 返回假 → 应用走了自己的降级分支（应用"报错"其实是它自己抛的）；
   - 模块可见但 **网络栈不可用**（无 WiFi、未连手机）→ `fetch_impl` 的 `UV_REQUEST` 失败；
   - 9 Pro 的应用调用了本机缺失的**其他** `system.*` 接口；
   - 应用自身的业务错误。

### F. 必须诚实记录的边界

- "日志串缺失 ⇒ 代码未编译"仍是**反证式推断**，不是直接证据。
  最终确认只有两条路：反汇编确认 `PermissionsManager::SetPermissionsCallback`
  是否被调用；或取真机日志。
- 但它比 1.7.4 的"权限表说 10 Pro 不授予"**强得多**：那是把官方文档当结论，
  这里是两个独立二进制指标同时为空。
- 社区侧仍**没有任何一条 10 Pro 上 fetch 实测成功的记录**（§1.7.5）——
  静态分析能证明"没有禁用标志"，不能证明"一定能用"。

---

## 1.7.7 真机实测：`fetch` 确实未被权限拦截（探针日志，2026-10-17）

### 探针是怎么跑的

用 [JSLab](https://github.com/cciccicu/JSLab)（Vela 上的 JS 运行器）跑纯 JS 探针。
它的运行时把 `system.http.request(options)` 定义成 `fetch.fetch(options)` 的直通包装
（`vela-quickapp/src/utils/runtime/scriptRuntimeApi.js:52`：`http: { request: options => fetch.fetch(options) }`），
所以探针测的就是固件里那个 `fetch_impl` 本体。

日志落盘到 `internal://files/js/fplog.js` —— JSLab 自身日志只在内存里
（`consoleBuffer.js` 的上限是 64 条 / 6144 字符 / 单条 1024 字符，不落盘、不上云）。

### 实测结果（27 行快照的关键行）

| 观测 | 结果 |
|---|---|
| `script.canUse('@system.fetch')` | **true** |
| `script.canUse('@system.fetch.fetch')` | **true** |
| `@system.request` / `@system.request.download` / `@system.uploadtask` / `@system.prompt` / `@system.network` / `@system.interconnect` / `@system.file` | 全 **true** |
| 不带 `@` 的同名 8 项（`system.fetch` 等） | 全 **false** |
| `system.network.getType()` | `{type:"none"}` ← **手环当前无网络** |
| `fetch({url:'http://qxdho.top/'})` 回调风格 `fail` | `"Couldn't resolve host name"`（**字符串**） |
| `fetch({url:'https://qxdho.top/'})` 同上 | `"Couldn't resolve host name"` |
| `fetch({...})` promise 风格 `.catch` | `{code:6, data:"Couldn't resolve host name"}`（**对象**） |
| `fetch({url:'ftp://x/y'})` 的 `fail` | `"invalid url"` |
| `fetch({})` 缺 `url` 的 `fail` | `"invalid url"` |
| `system.download.start()` | `success {token:"1792234832-195598830-2"}`（只回 token，须再 `download.wait`） |

### 三条被实测钉死的结论

**1. 权限层没有拦。** 若 `requestPermissions` 返回假，JS 侧只会看到
`permissions denied`（`get_perms_reject_message` 的 `FEATURE_PERMS_DENIED` 分支）。
实测每次调用都深入到了 **URL 校验层**（`ftp://` → `invalid url`）与 **DNS 解析层**
（`Couldn't resolve host name`）——这两层都排在权限之后。
⇒ **§1.7.6 E 节的结论（`FeatureRequestPermissions` 恒为假、JIDL 桩函数直接执行真 API）拿到了真机证据。**

**2. `code:6` 是 libcurl 的 `CURLE_COULDNT_RESOLVE_HOST`。**
⇒ `fetch_impl` 背后是 libcurl 语义的错误码空间，与固件里 `UV_REQUEST`、
`Content-Length` / `Content-Encoding` 的字符串证据吻合。
社区在 9 Pro 上看到的 `SSL connect error` = **code 35**（`CURLE_SSL_CONNECT_ERROR`）
在同一张码表里，两者互证。

**3. 本次失败的唯一原因是手环当前没有网络**（`network.getType = none`），
与 fetch 本身无关；也因此**无法据此判断 https 是否可用**（E2 与 E 同为 DNS 失败）。

### 两个写代码必须知道的 API 事实

- **`canIUse` 必须带 `@` 前缀**：`canIUse('@system.fetch')` 为真，
  `canIUse('system.fetch')` 为假。不带前缀会让应用**误判为不支持**而走降级分支——
  这本身就足以解释"应用报错"，且与固件无关。
  ⚠️ 未验证：`@` 前缀是真实查表还是仅前缀校验（所有 `@` 名前缀项全真、
  所有裸名全假，相关性 100%，样本有偏）。判别方法：查一个不存在的
  `@system.definitely.not.real`，返回假才是真实查表。
- **回调风格与 promise 风格返回不同形状**：回调 `fail(v)` 收到**字符串**（错误文案）；
  promise `.catch(e)` 收到**对象** `{code, data}`。要拿错误码必须用 promise 风格。

### 下一步只剩一件事

在手环获得网络通路之后重跑同一份探针：

- 不再出现 `invalid url` / `permissions denied` ⇒ 通路可用；
- 出现 **`code:35`** ⇒ TLS 不被支持（与社区 9 Pro 结论一致），只能走 http 中转；
- 出现 **`code:7`**（连不上）/ **`code:28`**（超时）⇒ 是网络通路问题，不是 fetch。

---

## 1.7.8 9 Pro 对照与网络通路的最终判定（2026-10-17）

### 为什么要对照 9 Pro

社区口径是「9 Pro 支持 fetch，10 Pro 不支持」。要判断这属于**代码差异**还是
**网络差异**，唯一可靠的办法是把 9 Pro 的固件拿来逐项对比。本节记录这次对照的
结果，以及它给出的一个否定结论。

### 9 Pro 镜像的获取与解包

- 代号 `n67cn`，最新版 **v3.1.190**（2026-07-15），来源
  `firmware-archives-public` 的 `firmware-miwear.watch.n67cn-v3.1.190`。
- 文件结构与 10 Pro 的包**不同**：它同样是「本地文件头 + deflate」的 zip 布局，
  但**没有中央目录（EOCD）**，所以 `unzip` 和标准 zip 解析器都会直接失败。
  逐个扫描本地头后共解出 **237 个条目**，全部解压成功。
- 其中 `vela_ap.bin` = **7,775,288 字节**（10 Pro 是 13,795,728，只有它的 56%）。
- 同包内还有 `vela_bl2.bin`、`vela_bl.bin`、`vela_factory.bin`、`interconnect.res`、
  `weather.res`、`sports.res`、`launcher.res` 等，说明它是一个完整刷机包。

> ⚠️ 教训：「这个 bin 不是 zip」这个判断是错的。**缺中央目录 ≠ 不是 zip**，
> 判断压缩包要看本地文件头（`PK\x03\x04` 后紧跟压缩方法 8），不要只看 EOCD。

### 逐项对照

| 项目 | 10 Pro (`vela_ap.bin`) | 9 Pro (`vela_ap.bin`) |
|---|---|---|
| `jidl_feature`（新框架） | **21** | 0 |
| `fetch_impl`（新 fetch 实现） | **11** | 0 |
| `invalid url` | 1 | **1** |
| `responseType` | 2 | **2** |
| `arraybuffer` | 1 | **1** |
| `urlencoded` | 3 | **2** |
| `Content-Length: ` | 10 | **4** |
| `fetch_create` / `system_fetch_onCreate` | 1 / 1 | 0 / 0 |
| `uv_miwear.c` | 1 | **1** |
| `miwear-server` | 1 | **1** |
| `Start quickapp proxy server` | 1 | **1** |
| libuv 接口类型表 | `wlan0/wlan1/wifi/cellsurf/cellular/bt-pan/bt-net/tun0/tun/eth0/ethernet` | 同名集合 |

**两条结论：**

1. **10 Pro 的框架反而更新**：它跑的是 Vela 新 feature 框架（`jidl_feature` +
   `fetch_impl`），9 Pro 还是旧版实现。但 **9 Pro 同样有完整 fetch**
   （`invalid url` / `responseType` / `arraybuffer` / `Content-Length` 都在），
   只是没有 `[fetch_impl]` 那套日志前缀。
2. **两边网络抽象完全一致**：同一套 libuv、同一个 `uv_miwear.c`、
   同一个「快应用代理服务器」（`Start quickapp proxy server`）。

⇒ 「9 Pro 能、10 Pro 不能」**不是有没有代码的问题**。

### 关键否证：两个镜像都没有蓝牙 PAN

10 Pro 的 AP 里蓝牙 SAL 是完整的（**89 个 `bt_sal_*` 函数**），但 profile 只有三类：

- GATT：`bt_sal_gatt_client_*` / `bt_sal_gatt_server_*`
- HID device：`bt_sal_hid_device_*`
- SPP：`bt_sal_spp_connect/disconnect/server_start/write/...`

**没有 `bt_sal_pan`、没有 `bnep`、没有 `panu`、没有 NAP 角色**。
9 Pro 的 AP 里连 `bt_sal` 都没有（蓝牙协议栈不在 AP 这一侧），但同样没有
`bnep` / `panu`。

补充核查：

- `bnep` 在整个工作区里只命中过一次，出现在 10 Pro 的 `vela_resource.bin`，
  是一段点阵数据里的随机字节（上下文全是 `veee` / `nvbe` 这类噪声），**不是代码**。
- 没有任何 PPP / DUN 拨号实现：`pppd`=0、`ppp_`=0。
- `tun%d` 设备名格式串只在 **9 Pro** 里有 1 处，10 Pro 只有 `tun0` 字面量。
  这一条**不足以**证明 9 Pro 有可用 tun 接口，只作线索记录。

### ⚠️ 重大更正：蓝牙 PAN 不是那条路 —— 真正的通路是 TUN over BLE

上面关于 PAN 的核查结论**推不出"10 Pro 没有网络通路"**。这一步我判断错了，
在此更正。真正的通路叫 **Miwear NET**，两个镜像里都有，而且 **10 Pro 的实现更新**。

| 证据 | 10 Pro | 9 Pro |
|---|---|---|
| `/dev/tun` | **2** | 2 |
| `ioctl TUNSETIFF` | **1** | 1 |
| `Created Tun: %s` | **1** | 1 |
| `[Miwear NET Connected]` / `Disconnected` | **1 / 1** | 1 / 1 |
| `net_tun_open` / `net_tun_close` / `net_tun_poll_data` | **1 / 1 / 1** | 1 / 1 / 1 |
| `net_get_tun_packet_size` | **1** | 1 |
| `net_uv_poll_start` | **1** | 1 |
| `net_trans` / `net_sockif` | **1 / 1** | 1 / 1 |
| `app_net_receive` | **1** | 1 |
| `app_net_connect_state_update` | **1** | 1 |
| **`remote_net_state_switch`** | **1** | **0** |
| **`app_net.c` 源路径** | **1** | **0** |
| `lyra` 服务总线 | **74** | 0 |

10 Pro 的日志串把整条链路写得很清楚（`../../vendor/xiaomi/miwear/bluetooth/app/app_net.c`）：

```
[Miwear NET Connected]             ← 手机把网络通道打开了
/dev/tun                           ← 打开 TUN 设备
ioctl TUNSETIFF failed: %d         ← 建 tun 接口
Created Tun: %s                    ← 接口建好
ioctl SIOCGIFMTU failed: %d        ← 取 MTU
netif %s %s                        ← 网络接口状态变化
poll events:%d status:%d
[Miwear NET Disconnected]
```

配套函数：`net_tun_open` → `net_tun_poll_data` → `app_net_receive`（收手机来的包）
→ `net_trans` / `net_sockif`（报文转运输）；`remote_net_state_switch` 是**手机发来的开/关命令**。

**所以架构是：**

```
快应用 fetch  →  libuv  →  TCP/IP 栈  →  /dev/tun  →  app_net.c
            →  BLE  →  小米运动健康  →  手机的互联网
```

**这就是 9 Pro「要连官方 App 才能上网」的实现，10 Pro 同样具备，而且是更新版。**

### 那 §1.7.7 的实测结果为什么不成立？

因为**我把 `getType()` 当成了"有没有网络"的证据，这是错的**。

- `uv_netstatus` 只会报告 `wifi` / `wlan0` / `cellular` / `bt-pan` 这类**物理接口**；
- 而 Miwear NET 是一条 **TUN 接口**，**不在这个类型表里**；
- ⇒ `network.getType() === "none"` **在隧道正常工作时也会返回 none**，它证明不了任何事。

同理，`http://154.9.24.61/` 的 `code:7` 也不能单独作为"没有网络"的证据：
它同样可能是"隧道通了，但手机侧连不上/被拒"。

**因此 §1.7.7 的结论要降级**：已经确证的只有「**权限层没拦**」（这是真的，DNS 错误发生在权限判定之后）；
"手环没有出网能力"这一条**撤回**。

### 真正的问题变成了：隧道为什么没起来

隧道由**手机侧**通过 `remote_net_state_switch` 打开，判断权不在手环。
所以下一步要查的是：小米运动健康在 p67cn（10 Pro）上到底会不会发这条命令，
以及它是不是对**第三方快应用**单独做了限制。

### 9 Pro 为什么「支持」——已由本节解释

9 Pro 走的就是 Miwear NET（同一套 `/dev/tun` + `net_tun_*` + `app_net_receive`），
**它从来不是手环自己出网**，这正是用户所说的"9 Pro 也要用官方 App 才能访问网络"。
10 Pro 具备同一套机制，差别只在于**手机侧有没有把它打开**。

---

---

## 1.8 结论

### 最终结论（一句话）

> **`fetch` 在小米手环 10 Pro 的固件里完整存在、已注册、未被黑名单拦截，
> 而且本机的权限系统没有接入——权限检查形同虚设。
> 「不支持」这句话在产品层面的真实机制是编译期 Kconfig 裁剪，而本机并没有裁剪掉 fetch。**

**这一条已在 2026-10-17 用真机探针实测确认（§1.7.7）**：`canIUse('@system.fetch')` 返回 `true`；
`fetch()` 的失败是 DNS `Couldn't resolve host name`（promise 风格 `code:6` = libcurl
`CURLE_COULDNT_RESOLVE_HOST`），**不是 `permissions denied`**；当时手环 `network.getType = none`。
⇒ **权限层没拦，唯一障碍是没有网络。**

早前写的"拦住它的是运行时权限授予（`vela.permission.INTERNET` 由厂商闭源产品层决定）"
**只在"权限系统已接入"的机型上成立，在本机不成立**（见 §1.7.6）。

也就是说：**问题不在"有没有"，也不在"让不让"，而在"谁批"**。而"谁批"的代码在小米闭源产品层，
不在开源 Vela 里，也不在固件的明文数据里。

### 四条已经被源码证实的事实

1. **`isBlackListed()` 只拦 `system.device.getDeviceId`**，与 fetch 无关（`feature_instance.cpp:145-153`）。
2. **`fetch` 声明了 `[permissions="hapjs.permission.INTERNET"]`**，走标准权限链路，
   运行时被改写为 `vela.permission.INTERNET` 后向平台申请（`fetch.jidl` + `permission_manager_impl.cpp`）。
3. **权限判定委托给纯虚接口 `PermissionManager::Client`**，即产品层实现；
   拒绝时抛回 JS 的错误是 `"permissions denied"`（或 `permissions error` / `permissions no background` / `unknown reason`）。
4. **（§1.7.6 新增，最关键）JIDL 桩函数在 `FeatureRequestPermissions` 返回 `false` 时会"落下来直接执行 API"。**
   而 `requestPermissions` 在"没人注册权限回调"时**恒返回 `false`**；本机固件的权限胶水
   （`PermissionManager` 及其 INFO 级日志串）**全部缺失** ⇒ 本机权限检查不生效。

**这同时解释了用户"在 manifest 里加权限声明不可行"**：声明只决定应用"有权申请"，
是否授予完全由 Client 决定。**在没接权限系统的设备上，声明与不声明结果完全一样**——
本机就是这种设备。

### 遗留矛盾（→ 已在 §1.7.6 区分）

固件里查不到任何权限名字符串（`hapjs.permission.*` / `INTERNET` / `vela.permission.*` 全部 0 命中），
也查不到 `PermissionManager` / `verifyAuth` / `requirePermission` 等符号，
**但** `permissions_manager.cpp:64` 的断言行号与开源版第 64 行**精确吻合**。

§1.7.6 用 **INFO/WARN 级日志格式串**这第二条独立指标做了区分：开源 quickapp 权限胶水的
`"permission(%s) api(%s) handle(%p) block(%d)"` 与 `"permission: back to feature res(%d) handle(%p)"`
在固件里**均为 0 命中**（这类串不会被 release 删除，与 DEBUG 级的 `"no permissions cb!"` 不同）。
**倾向结论：本机 shell 未接入权限系统**，`HasPermissionCb()` 为假，权限检查不生效。
保留的残余可能：权限以纯 ID 编译且相关工作在另一个未检视的镜像/分区里。

> **✅ 该矛盾已由真机实测消解（§1.7.7）**：若权限系统真的接入并拒绝，JS 侧必然收到
> `permissions denied`。实测拿到的是 DNS 错误（`Couldn't resolve host name` / `code:6`），
> 而 DNS 解析发生在权限判定**之后**。⇒ **静态推断（未接入）与运行行为一致**，
> 残余可能（权限以纯 ID 编译到别处）不影响结论——因为无论如何它**没有生效**。


### 与"10 Pro 不支持 fetch"这句话的关系（需要精确区分）

> **10 Pro 的固件里，`fetch` 的实现是完整存在的、是正式注册的、JS 名字表里是可见的。**

五条独立证据互相印证：
1. **实现层**：完整的 `fetch_impl.cpp` 字符串（UV 异步、上传、HTTP 头、错误码、取消、多种编码）
2. **框架层**：三个生命周期钩子 `system_fetch_onCreate/onDetached/onDestroy` + `"system.fetch"` 注册名
3. **数据层**：在 `0xce3a34` 找到的**真实描述符表项**，含名称、方法名和合法 Thumb 函数指针，且与已确认可用的功能并列
4. **注册层（1.7.3 新增）**：`0xc7d2d74` 是一个**以 `"fetch"` 为方法名、以 `0xc892dd5` 为代码指针做 JIDL 绑定注册**的函数；`0xc7d2df4` 是返回其描述符（`0xce3a30`）的访问器。**即 `fetch` 不只是"有数据"，还有主动注册它的代码。**
5. **权限表（1.7.3 新增）**：`0xce8e10` 是一张功能/权限表，**`"system.fetch"` 位列第 0 项**，且 `0xc831b1c` 处有代码把它当键去查 map。

**因此"10 Pro 不支持 fetch"这句话的正确读法是：**

- ✅ **框架层支持**（代码、注册、名字表都在）——这一点与官方/社区的说法**不符**；
- ❌ **产品层不授予 `INTERNET` 权限**——这一点与官方/社区的说法**相符**；
- 所以它不是"支持/不支持"的二元问题，而是**同一套运行时在不同设备/地区/应用上权限判定结果不同**。

**同时必须说清楚静态分析的边界**：以上证明的是"**代码层面没有禁用标志**"，
不能证明"**运行时一定放行**"。`isBlackListed` / `requestPermissions` 的判定输入在明文里找不到（1.7.1），
所以"到底哪一步拦住了这个 9 Pro 应用"**仍未确定**。

**而且诚实地讲**：截至本文档，**社区没有任何一条 10 Pro 上 fetch 实测成功的记录**。
所以"1.7.3 证明框架里有 fetch"≠"10 Pro 能用 fetch"。两者是两个层次的事实。

### 因此"用户自己实现 fetch"是不必要的

别人已经实现好了，且实现是完整的。**要做的是让它被允许**，而不是重写。

### 三条可能路径（按优先级）

| 路径 | 原理 | 需要什么 | 现状 |
|---|---|---|---|
| **① 查设备端"权限管理"开关** | 资源分区里有 `permission_management.cta` + `per_name_internet.cta`（§1.7.5） | 一台设备，手动翻设置 | **已不必做**：§1.7.7 实测权限层本来就不拦，没有"开关"可开 |
| **② 分支收敛实验** | 打印 `canIUse('@system.fetch')` + `fetch.fetch()` 的失败原因 | 一台设备、一个最小脚本 | **✅ 已完成（§1.7.7）**：`canIUse('@system.fetch')=true`；失败是 DNS `code:6`，非权限 |
| **③ 取真机日志看报错** | 小米运动健康 → Debug → 拉取固件日志 | 手机 + 已配对设备 | **部分完成**：探针日志已落盘（§1.7.7）；系统日志仍未取 |
| ~~④ 挂钩 `requestPermissions` / `PermissionsManager::RequestPermissions`~~ | ~~让权限查询直接返回已授予~~ | — | **§1.7.6 后此路作废**：本机 `HasPermissionCb()` 为假，权限检查本就不生效，无需挂钩 |
| ~~⑤ 挂钩 `isBlackListed` 返回 false~~ | ~~绕过运行时黑名单判定~~ | — | **对 fetch 无用**：该函数只拦 `getDeviceId` |
| ~~⑥ 改权限/能力数据表~~ | ~~改 `0xce8e10` 那张表~~ | — | **方向错了**：`0xce8e10` 是"功能→权限"分组表，不是开关；真正的开关是编译期 Kconfig（§1.7.6） |
| **⑦ 走 interconnect 手机桥接** | 社区在 10/10 Pro 上的**事实标准方案**：`@system.interconnect` 把 HTTP 交给手机 App 代发（SimpleFetch 等） | 手机端配套 App，**包名+签名必须与 RPK 完全一致** | **社区已验证可行**；不需要 fetch；但与用户"用 fetch"的目标不同 |
| **⑧ 用官方小米运动健康供网（Miwear NET）** | 10 Pro 有完整实现：`/dev/tun` + `TUNSETIFF` + `app_net.c` + `remote_net_state_switch`，比 9 Pro 还新（§1.7.8） | 手机侧要发 `remote_net_state_switch` 打开隧道 | **通路存在，未确认手机侧是否对 p67cn / 第三方快应用放开** ← 当前主攻方向 |
| ~~manifest 声明权限~~ | ~~应用侧满足~~ | — | **用户已试，不可行** |

### 网络通路问题

即使 fetch 被放行，仍需网络。手环 10 Pro **没有 WiFi**。

> **§1.7.7 实测已直接印证这一点**：探针调用时 `system.network.getType()` 返回 `{type:"none"}`，
> 随后 fetch 报 DNS 失败。**在没有网络通路的前提下，无论 fetch 是否可用，结果都只会是 DNS 错误**——
> 这也是为什么此前一直无法从"应用报错"反推原因。

**社区实证的通路是「经手机代理出网」而不是手环自己出网**：
9 Pro 上 fetch 可用有一个硬前提——**必须先连接「小米运动健康」**；未连接时 fetch 失败。
社区 9 Pro 教程的做法是让 fetch 请求一个 **http 中转服务器**（Flask + PythonAnywhere），
由中转服务器代发真正的 API 请求（因为 9 Pro 用户实测 fetch 仅支持明文 http）。

**顺带纠正一个之前写错的说法**：本文档早前写的"唯一通路是蓝牙 PAN/BNEP"**未找到任何社区依据**；
社区手环联网要么走**手机代理/interconnect**，要么（更边缘地）用 ESP32 供网。
用户此前表示「网络通路我有办法」，故此环节不在本报告范围。

### ★ 最终判定：通路存在，卡在"手机侧开不开"（§1.7.8 更正后）

**先撤回一条错误结论**：早前据此节写的"10 Pro 固件里没有把手机链路变成 IP 接口的代码"是**错的**。
蓝牙 PAN 确实没有，但**那不是这条路**。真正的通路叫 **Miwear NET**，链路是：

```
快应用 fetch → libuv → TCP/IP 栈 → /dev/tun → app_net.c → BLE → 小米运动健康 → 互联网
```

10 Pro 里这条链路**完整存在**（`/dev/tun`、`TUNSETIFF`、`Created Tun: %s`、
`net_tun_open/poll_data`、`app_net_receive`、`net_trans`、`net_sockif`、
`[Miwear NET Connected]`），甚至比 9 Pro 更新（多了 `remote_net_state_switch` 与 `app_net.c`）。

**同时撤回 §1.7.7 的一条推论**：`network.getType()` 只报告 wifi/cellular/bt-pan 这类物理接口，
**TUN 接口不在其中**，所以 `getType()==="none"` 在隧道正常时也会出现，**不能作为"没有网络"的证据**；
裸 IP 的 `code:7` 也同理。§1.7.7 中**仍然成立**的只有"权限层没拦"这一条。

⇒ 目标**没有**被证伪。现在的关键问题是：**小米运动健康在 p67cn 上会不会发
`remote_net_state_switch`**，以及是否对第三方快应用单独限制。这需要在手机侧/协议层查。

**仍需提醒**：`fetch_impl` 用 **UV（libuv）** 异步 IO，意味着网络栈必须已初始化。
用户既有网络通路方案，则 `fetch_impl` 自身应能跑通。

### 与 Chaos-Module 哲学的关系

- **若走"挂钩 `isBlackListed`"或"改注册表"** — 仍符合 Chaos 的「借机制」哲学：注册表和黑名单都是运行时的**扩展/判定点**，改它与改 `lv_style_t` 是同一类操作
- **若走"自己实现 fetch"** — 那是**改造固件内部**：需要逆向 QuickJS 的 Promise 对象模型、resolve 函数签名、微任务队列，并处理异步回调的线程安全问题——而 Chaos 的全部代码建立在"单线程 lv_timer"这一从未被断言的假设上。**幸好这条路不需要走。**

### 一个必须提醒的风险

**快应用运行时是共享的。** 往注册表或黑名单里写数据如果破坏了表布局（对齐错误、终止符未挪对、或写到只读段），**所有快应用都会挂**——这比改图标危险得多（图标挂了只是图标不对）。若要落地，`res_hook.rs` 的"复制+改指针，不动原结构"手法（`install_by_node` 复制 80 字节驱动到 `RH_COPY`）是可借鉴的标准范式。

---

# 第二部分：方法与工具

本环境无标准逆向工具链，因此自建了最小可用工具集，位于 `/dsh/workspace/chaos/tools/`：

| 文件 | 作用 |
|---|---|
| `tools/thumb.js` | **自写 ARM Thumb/Thumb-2 解码器**。专注解码能引用 PC 的指令：16 位 `LDR Rd,[PC,#imm]`（`01001`）、`ADR`（`10100`/`10101`）；32 位 `LDR.W`（`F8DF`）、`ADR.W`（`F20F`）、`MOVW`（`F240`）、`MOVT`（`F2C0`），含 `is32bit()` 判定 |
| `tools/findref.js` | 用解码器找 PC 相对字面量加载，并投票推算基址 |
| `tools/base.js` / `tools/base2.js` | 基址投票：`BASE = 指针字 - 字符串文件偏移`，要求 64K 对齐 |
| `tools/refs.js` | 给定基址，统计指向目标字符串的 4 字节指针引用数 |
| `tools/testbase.js` | 对比多个候选基址在名字表上的命中数（**正是这步发现了 `0x2c0c0000`**） |
| `tools/table.js` / `tools/table2.js` | 转储并注解描述符表区域，把指针解析回字符串 |
| `tools/kw.js` / `tools/kw2.js` | 全镜像 / FEATURE 区域的关键字字符串导出（分别得 127,125 / 4,737 条） |
| `tools/cmp.js` | 对比多个功能描述符：找到名字串、列出其全部 4 字节对齐指针引用、注解引用点窗口 |
| `tools/region.js` | 区域转储器，把可打印字节标注为 `STR`、把落在 Thumb 范围的指针标注为 `THUMB` |
| `tools/devfilter.js` | 指定窗口的字符串转储（用于排除假线索） |
| `tools/dis.js` | **ARM/Thumb 反汇编封装**。`node tools/dis.js <start> <end> [base]` 反汇编一段；`node tools/dis.js pc <虚址>` 反查 PC 相对引用点。底层是 `capstone-wasm@1.0.3`（纯 WASM，装在 `tools/cs/package/`） |
| `tools/litload.js` / `tools/litload2.js` | **字面量加载映射**：扫描代码段每个 2 字节对齐位置，识别所有 PC 相对取址指令，输出 `池槽 → [加载它的代码地址]`。`litload2.js` 比 `litload.js` 多支持 `LDRD`（`E9DF`）与 `ADR`/`ADD PC`（`A000`/`F20F`）。**它把"某常量被谁引用"从单向查找变成了可查询映射**——正是它定位到了 `0xc7d2d74`（`fetch` 的注册函数） |

**写工具时踩过的两个坑（务必记住）**：
- `litload*.js` 的键是**文件偏移**。若传了带基址的虚址（`c7d2e00` 而非 `7d2e00`），会得到一片假的「(no loader)」。
- `0xbd4ea4 + 0x2c0c0000` 应等于 `0x2cc94ea4`，我一度写成 `0x2ccd4ea4`。**凡「查不到引用」的否定结论，先自查地址换算。**

**有效的方法论：**

1. **不要相信单一基址。** 分段映射（代码 `0x0c000000` / 数据 `0x2c0c0000`）是常见设计。零引用应先怀疑基址错误，而非结论为"死表"。
2. **投票法要用严格过滤，且必须交叉验证。** 最初的宽松投票（任意字 vs 任意字符串）产生 9166 票的噪声簇 `0x2c0c0000`——**碰巧它是正确答案**，但当时的推理过程不成立。独立重跑 `tools/base.js`（限制在元数据区的 4731 个字符串、316 万个候选字、要求 64K 对齐）后，`0x2c0c0000` 以 **7974 票居首、为第二名的 2.4 倍**，峰值清晰分离——**这才使该基址成为可信结论**。教训：单一启发式给出的答案，无论数字多好看，都不算证据；要换一种方法重算并看是否收敛到同一处。
3. **相邻引用是有力信号。** `0xce3a34` 与 `0xce3a38` 相隔 4 字节指向同一字符串 → 描述符表而非偶然数据。
4. **用已确认可用的同类功能做对照。** `system.prompt`/`showToast` 显然可用；fetch 与它们形状一致，这是"fetch 可用性被策略层挡住"的旁证。
5. **注意 Thumb bit0。** 表中函数指针全部奇数值（`0x0c873045` 等）——与 Chaos-Module `fw_api.rs:23-25` 记载的规则一致，可交叉验证基址判断正确。
6. **排除假线索要写下来。** 关键字搜索必然命中大量同名词（`Capabilit`→蓝牙 `IO Capability`；`fetch`→JS 操作码表）。**把已排除的线索连同理由记录成表**（见附录 A「已排除的假线索」），否则同一片噪声会被反复重新发现。
7. **"字符串不存在"也是证据。** `vela_resource.bin` 中 `canIUse` 命中 0 次、`vela_ap.bin` 中黑名单只有符号名没有数据表——这些**否定结果**共同支持"设备开关不是明文数据"这一结论，价值不低于正面命中。
8. **区分"描述符字段"的假设与事实。** `[名字][描述符][计数]` 的布局是从 `system.app` 反推的**假设**；用它推 `canIUse` 时得到落在函数中段的指针，说明**假设未被验证**。参见下方"未能完成的"。
9. **线性扫描会失步，但"字面量加载映射"不会。** `tools/dis.js` 是线性反汇编，跨字面量池即失效；`tools/litload2.js` 改为**全段枚举取址指令**，不依赖从函数头开始，因此在字面量池包围的代码里依然可靠。**这是本轮最关键的方法转向。**

**反汇编能力（曾阻塞，已解决）：** 环境无 `objdump`/`readelf`/`arm-none-eabi-*`，
`npm install capstone` 因无 node-gyp 编译环境而失败。
解法：`capstone-wasm@1.0.3` 是**纯 WASM 包**，不需要编译——`npm pack` 后解包到 `tools/cs/package/`，
用 `tools/dis.js` 封装（`Const.CS_ARCH_ARM` / `CS_MODE_THUMB`；**注意**用错 mode 常量会得到 ARM 模式的乱码输出）。

**仍未能完成的：** `isBlackListed` / `requestPermissions` 的**函数正常入口**与**所查 map 的数据来源**仍未定位。
已定位的是它们的断言冷块（`0xc7a32dc`–`0xc7a3316`）与字符串池（`0x7a3318`–`0x7a3348`）。
**另需撤回一条早先的推论**：该字符串池邻近 `"system.device"` / `"getDeviceId"`，我曾据此推断黑名单依赖设备 ID——
但那个池是 assert 冷块，四条功能（`isBlackListed`/`requestPermissions`/`getDeviceId`/`system.device`）的字符串
被链接器挤在一起，**不能由此得出"isBlackListed 读设备 ID"的结论**。字符串池的归属是启发式，不是证据。

---

# 第三部分：未决问题与下一步

## 未决问题

1. ~~**`isBlackListed` 的依据是什么？**~~ —— **✅ 已解决（§1.7.6）**：它只判定 `system.device` 与 `getDeviceId` 这一对字符串，**与 fetch 无关**。真正的问题是「本机是否注册了权限回调」；§1.7.6 用两条独立二进制指标（符号 + INFO 级日志格式串）给出倾向结论：**没有注册**。
2. **`0xce8e10` 那张表的语义是什么？** —— **已基本确认（1.7.3）**：是一张"功能/权限分组表"，`"system.fetch"` 位列**第 0 项**，`0xc831b1c` 处有代码把它当键去查一张 `std::map`。**但这张表本身只是只读字符串数据，改它不能改变判定结果**——真正决定放行与否的是被查的那张 map，其数据来源仍未定位。
3. **那张表在 RAM 还是只读段？** 决定用"原地改"还是"复制+改指针"。
4. **镜像的精确段映射。** 代码段 `0x0c000000` 与数据段 `0x2c0c0000` 的边界在哪？为什么同一文件的偏移能同时满足两个基址？（可能是 XIP + PSRAM 运行时拷贝，未证实）
   **新增反证（见 1.7.1）**：`canIUse`/`loadLibrary`/`terminate`/`getInfo` 描述符里的 Thumb 指针按此换算会落在**函数中段**，说明该换算对**代码段**至少不是普适的。**这条必须先解决**，否则所有"找代码引用点"的结论都不可靠。
5. **用户遇到的具体现象是什么？** —— **✅ 已基本解决（§1.7.7）**。真机探针给出：`canIUse('@system.fetch')=true`、`fetch()` 报 DNS `code:6`、`network.getType=none`。⇒ **不是注册表拒绝，也不是权限拒绝，是网络不可达。** 剩余不确定：那个 9 Pro 应用具体是在"检查 canIUse 的写法不带 `@`"还是"网络失败"上崩的——但只要网络通了就能直接区分。
6. **`fetch` 是否被注册？** —— **已解决（1.7.3）**：`0xc7d2d74` 是 JIDL 注册函数，以 `"fetch"` 为方法名、`0xc892dd5` 为代码指针，把方法绑进 `FeatureRegistry`；`0xc7d2df4` 是返回描述符 `0x2cda3a30` 的访问器。**`fetch` 是"主动注册"的，不是"仅存在数据"。** 剩下的未知量只剩「哪张 map 决定放行」。
   （`canIUse` 的函数体仍未知，但已不关键——它只是一个查询接口，不再是问题入口。）
7. ~~**设备级开关是数值能力位还是设备代号判断？**~~ —— **✅ 已解决（§1.7.6）**：都不是。设备级差异是**编译期 Kconfig**（`CONFIG_FEATURE_SYSTEM_FETCH`）决定模块是否参与编译；运行期没有"设备名单"这层判断。明文名单之所以查不到，是因为它根本不存在。`vela_bl2.bin` / `vela_ota.bin` 因此不再是排查重点。
8. **Chaos-Module 是否可编译？** 本环境无工具链，未验证。

## 建议的下一步（按"每步可证伪"排序）

**第 0 步（最优先，成本最低）：分支收敛实验 —— ✅ 已完成（2026-10-17，详见 §1.7.7）**
用 JSLab 在 10 Pro 上跑通探针，一次运行把四条分支收敛成一条：
`canIUse('@system.fetch')` = **true**（注意必须带 `@` 前缀）；
`fetch()` 失败为 DNS `Couldn't resolve host name`（promise 风格 `code:6` = libcurl
`CURLE_COULDNT_RESOLVE_HOST`）；`network.getType()` = `{type:"none"}`；
`ftp://` 与缺 `url` 返回 `invalid url`。
⇒ **不是注册表拒绝、不是权限拒绝、不是打包问题，就是网络不可达。**

**第 1 步：取得 ARM 反汇编能力 —— ✅ 已完成**
`capstone-wasm@1.0.3`（纯 WASM，无需 node-gyp）已装到 `tools/cs/package/`，封装为 `tools/dis.js`。
用法：`node tools/dis.js <startHex> <endHex> [baseHex]` 反汇编；`node tools/dis.js pc <目标虚址Hex>` 反查 PC 相对引用点。
（失败路径备忘：`apt-cache policy binutils-arm-none-eabi` 返回空，无可用的 apt 源；`npm install capstone` 会要求 node-gyp 编译并被系统权限拒绝——改装 `capstone-wasm` 即可绕开。）
**注意：线性扫描会在字面量池处失步。** 必须从已确认对齐的函数入口开始反汇编；跨越字面量池的大 window 输出不可信（这一点已实际踩到）。

**第 1.5 步：JIDL 字段布局 —— ✅ 已解决（1.7.3）**
先前"描述符里的 Thumb 指针落在函数中段"的困惑已解开：那不是函数入口，而是 **JIDL 生成的包装/跳板**。
真正的方法注册函数是 `0xc7d2d74`（名字 `"fetch"`、类型描述符 `0x2cda3a70`/`0x2cda3a80`、代码 `0xc892dd5`），
访问器是 `0xc7d2df4`（返回 `0x2cda3a30`）。`FeatureRegistry` 是一张**以功能名为键的 `std::map`**，
查找函数 `0xc7ae7c4`（用 `memcmp` 比长度和内容，libstdc++ SSO 布局）。
**因此"由描述符字段硬推函数入口"这条弯路可以放弃了。**

**第 2 步：确认本机是否注册了权限回调（§1.7.6 后已不再关键，但值得钉死）**
两种做法：
- 静态：反汇编 `PermissionsManager::SetPermissionsCallback`（开源 `feature_exports.cpp:957` 的 C 包装
  `FeatureSetPermissionsCallback`）的调用点。注意它传的是**函数指针**，所以**不会有字符串**——
  这也解释了为什么按字符串找它必然失败。
- 动态（更省事）：真机日志里若出现 `permission(...) api(...) handle(...) block(...)` 或
  `permissions denied`，说明权限系统接了；**一条都没有**则印证 §1.7.6。
- 注意：**即便接了也拦不住 fetch 的"存在性"**——§1.7.6 B 节的桩函数在返回 `false` 时会直接执行。

**第 3 步：转向"为什么应用报错"的其余三个分支 —— ✅ 已完成（§1.7.7）**
实测结果：`canIUse('@system.fetch')` 为 **true**（应用若用不带 `@` 的写法才会误判为假）；
`fetch()` 已进入网络栈并报 DNS 错误（说明权限层与注册层都已通过）；
未观察到"用了本机缺失的其它接口"的直接证据。
⇒ **剩余唯一变量是网络通路。**

**第 4 步：网络栈可用性核查 —— 已成为当前唯一阻塞项**
`fetch_impl.cpp` 依赖 libuv 异步 IO（`UV_REQUEST`），实际错误码 `code:6` 证明 libcurl 语义栈
已经跑到了 DNS 解析阶段。手环 10 Pro 无 WiFi，§1.7.5 的社区结论是"经手机代理 / interconnect 出网"。
**要验证 fetch 是否真能拿到数据，必须先让 `network.getType()` 不再是 `none`。**

**第 5 步：最小验证**
不要直接上 fetch。先用 Chaos 的手法**改一个无副作用的表项**（或加一个返回常量的假 API），验证：表改动能生效、JS 侧能看到新名字、调用不崩溃。**这一步通过，说明整条链路机制是通的。**

**第 6 步（可选）：确认用户的具体现象**
若现象是"调用通过但连不出去"，则整件事不在权限层，而应转向网络通路——那是用户说自己有办法的部分。

## 需要向用户确认的信息

- ~~**目标设备固件版本**~~ **已确认**：`v3.101.043`（用户于 m00139 提供固件 URL，正是 Chaos-Module 硬编码地址对应的版本）。
- ~~**具体现象**~~ **已确认**（§1.7.7 真机探针）：`canIUse('@system.fetch')=true`、`fetch()` 报 DNS `code:6`、`network.getType=none`。**唯一阻塞=没有网络。**
- ~~**最有价值的一个请求**~~ **已完成**：探针已在设备上运行，日志落盘到 `internal://files/js/fplog.js`。
- ~~**"第一条路试了不可行"的具体表现**~~ **已由 §1.7.6 解释**：本机未接入权限系统，声明与不声明结果完全一样。
- **现在唯一需要的信息**：手环获得网络通路后（`network.getType()` 不再是 `none`）重跑同一份探针，
  把新的 `fplog.js` 发回。届时若出现 `code:35` ⇒ https 不可用，只能走 http 中转。

---
# 附录 A：关键地址速查表（固件部分）

## 固件（`vela_ap.bin`，13,795,728 = `0xd28190` 字节）

| 项 | 值 |
|---|---|
| 复位桩 | 文件 `0x10`：`0x4814`（`LDR r0,[PC,#0x50]`）/ `0x4700`（`BX r0`） |
| 桩字面量 | 文件 `0x64` = `0x0c0c0015` → Thumb 目标 `0x0c0c0014` |
| **代码段基址** | **`0x0c000000`** |
| **数据段基址** | **`0x2c0c0000`** |
| JS 引擎 | QuickJS（`feature_manager_qjs.cpp` / `feature_instance_qjs.cpp`） |
| 同步 IO | libuv（`UV_REQUEST ERROR`） |

### 字符串（文件偏移）

| 偏移 | 内容 |
|---|---|
| `0xbc89cc` | `[FEATURE] Failed to get FeatureRegistry instance!` |
| `0xbc8ac8` | `[FEATURE] ptr: %p already exist !` |
| `0xbc8dcc` | `bool feature_framework::FeatureInstance::requestPermissions(FeaturePermissionsRequestInfo*)` |
| `0xbc8e28` | `/frameworks/runtimes/feature/src/feature_instance.cpp:118` |
| `0xbc8e88` | `bool feature_framework::FeatureInstance::isBlackListed(FeaturePermissionsRequestInfo*)` |
| `0xbc8ee0` | `/frameworks/runtimes/feature/src/feature_instance.cpp:134` |
| `0xbcce68` | `/frameworks/runtimes/feature/modules/fetch_impl.cpp` |
| `0xbccfa0` | `system_fetch_onCreate` |
| `0xbcd018` | `system_fetch_onDetached` |
| `0xbcd030` | `system_fetch_onDestroy` |
| `0xbcd0d4` | `fetch_create` |
| `0xbd4e9c` | `fetch`（JS 方法名） |
| `0xbd4ea4` | `system.fetch`（注册名）→ vaddr `0x2cc94ea4` |
| `0xbd4ef4` | `system.uploadtask` |

### 描述符表（文件偏移）

| 偏移 | 内容 |
|---|---|
| `0xce3a34`, `0xce3a38` | 指向 `"system.fetch"`（`0x2cc94ea4`）的两处相邻引用 |
| `0xce3a68` | 指向 `"fetch"`（`0x2cc94e9c`） |
| `0xce3b04`, `0xce3b08` | 指向 `"system.prompt"` |
| `0xce3c2c` | 指向 `"uploadFile"` |
| `0xce3db0`, `0xce3db4` | 指向 `"system.interconnect"` |
| `0xce8e10` | 指向 `"system.fetch"`（网络/权限功能组） |
| `0xce8e14` | 指向 `"system.request"`（`0x2cc9553c`） |
| `0xce8e18` | 指向 `"system.network"`（`0x2cca24b0`）**新发现** |
| `0xce8e1c` | 指向 `"system.uploadtask"` |
| `0xce8e20` | 指向 `"system.audio"`（`0x2cca2490`）**新发现** |
| `0xce8e28` | 指向 `"system.geolocation"` |
| `0xce8e2c` | 指向 `"system.record"`（`0x2cca24a0`）**新发现** |

### 全局 API 与 `canIUse`（文件偏移）

| 偏移 | 内容 |
|---|---|
| `0xbd5070` | 字符串 `"canIUse"`（全局 API 名） |
| `0xbe3b2d` | 字符串 `"canIUse"`（另一处，未定性） |
| `0xce4264` | `system.app` 描述符（方法表 `0xce4270`→`0xce427c`，6 个 Thumb 指针 `0xc87de09`..`0xc87de59`） |
| `0xce4298` | `getInfo` 表项 → 描述符 `0xce4328` = Thumb `0xc8932ad` |
| `0xce42a4` | `terminate` 表项 → 描述符 `0xce4308` = Thumb `0xc8932a1` |
| `0xce42b0` | **`canIUse` 表项** → 描述符 `0xce42e8` = Thumb `0xc893285` |
| `0xce42bc` | `loadLibrary` 表项 → 描述符 `0xce42c8` = Thumb `0xc893269` |
| `0xce4360` | `system.mqttmessage`（含 `verify`/`decode`/`encode`） |

> **警告**：上表这些 Thumb 指针按"文件偏移 = 虚址 − `0x0c000000`"换算会落在**函数中段**（见 1.7.1），**不可直接用于反汇编**。

### 设备身份与黑名单（文件偏移）

| 偏移 | 内容 |
|---|---|
| `0xbd4ea4` | 字符串 `"system.fetch"`（全镜像**唯一**一处） |
| `0xc059f4` | 字符串 `"miwear_product.json"` |
| `0xc05a16` | `"product_info": [` 起始 |
| `0xc05a89` / `0xc05ab0` / `0xc05ae2` | `M2551B1` / `miwear.watch.p67cn` / `29598`（board 20） |
| `0xc05b6c` / `0xc05b93` / `0xc05bc5` | `M2552B1` / `miwear.watch.p67gl` / `29601`（board 21） |
| `0xc05c4f` / `0xc05c76` / `0xc05ca9` | `M2558B1` / `miwear.watch.p67gln` / `33343`（board 22） |
| `0xc05d33` / `0xc05d5a` / `0xc05d8c` | `M2553B1` / `miwear.watch.p67tc` / `29599`（board 23） |
| `0xc05e16` / `0xc05e3d` / `0xc05e70` | `M2559B1` / `miwear.watch.p67glt` / `29600`（board 24） |
| `0x7a3318`–`0x7a3348` | 字面量池：`system.device` / `getDeviceId` / `isBlackListed` / `feature_instance.cpp:134` / `requestPermissions` / `feature_instance.cpp:118` |
| `0x7a339c`–`0x7a33b4` | 第二份相同池子 |
| `0xbc8dcc` / `0xbc8e88` | `requestPermissions` / `isBlackListed` 符号串 |
| `0xbc8e28` / `0xbc8ee0` | `feature_instance.cpp:118` / `:134` |

### 已排除的假线索（避免重复劳动）

| 位置 | 看到什么 | 为什么是假的 |
|---|---|---|
| `0xbc45cc`–`0xbc4620` | `devicefilter`/`dstdevicelist`/`trustlevel`/`dispatchtype`/`sendtypes`/`basedata`/`extenddata` | message-center（`system.internal.messagecenter`）的**消息发布选项键**，不是功能开关 |
| `vela_resource.bin` `0x3f56b85` 等 | `Capabilit` | 实为 `[bttool] IO Capability:%d`（蓝牙工具） |
| `vela_resource.bin` `0x3f3003c` 等 | `fetch` | 落在一张 JS 操作码名表（`4EACH_INIT`/`CVT_JSON` 等）里 |
| `vela_resource.bin` 全文件 | `canIUse` | **0 次命中** |

---

# 附录 B：复现步骤

```bash
cd /dsh/workspace/chaos

# 1. 解包固件 ZIP（fw.bin 是 ZIP 格式）
#    成员：ota.sh / vela_ap.bin / vela_bl2.bin / vela_ota.bin / vela_resource.bin / META-INF/

# 2. 确认 fetch 实现字符串存在
node -e '
const b=require("fs").readFileSync("fwx/vela_ap.bin");
for(const s of ["fetch_impl.cpp","system_fetch_onCreate","system.fetch","fetch_create"]){
  console.log(s, "->", b.indexOf(Buffer.from(s))>0 ? "0x"+b.indexOf(Buffer.from(s)).toString(16) : "NOT FOUND");
}'

# 3. 在正确基址下查找指针引用（关键步骤）
cd /dsh/workspace/chaos && node tools/testbase.js

# 4. 转储描述符表
node tools/table.js

# 5. 转储网络/权限功能表区域
node tools/table2.js
```

**注意：** 第 3 步必须使用基址 `0x2c0c0000`（数据段），而非 `0x0c000000`（代码段）。用错基址会得到"零引用"的错误否定结论。

# 附录 C：开源证据索引（open-vela）

小米已开源 Vela，**固件用的就是这套代码的某个版本**。本地已 clone：

| 仓库 | 本地路径 | 用途 |
|---|---|---|
| `open-vela/frameworks_runtimes_feature`（`dev`） | `/dsh/workspace/chaos/oss_feature` | 固件里的 `feature_framework`（JIDL / 权限 / fetch 实现） |
| `open-vela/frameworks_runtimes_quickapp`（`dev`） | `/dsh/workspace/chaos/oss_quickapp` | 快应用外壳；权限胶水在这里 |

```bash
git clone --depth 1 -b dev https://github.com/open-vela/frameworks_runtimes_feature.git oss_feature
git clone --depth 1 -b dev https://github.com/open-vela/frameworks_runtimes_quickapp.git oss_quickapp
```

**本报告 §1.7.4 / §1.7.6 结论对应的具体位置：**

| 结论 | 文件:行 |
|---|---|
| fetch 是 Kconfig 编译开关（默认 y），编译 `fetch_impl.cpp` + `fetch.jidl`，并加入 `FEATURELIST` | `oss_feature/modules/Kconfig:98`、`modules/Makefile:293-297`、`modules/CMakeLists.txt:287` |
| 快应用可见的模块清单由 `FEATURELIST` 生成 | `oss_feature/modules/ajs_features_registry.cpp:15-22` |
| 权限标注 → 生成"申请权限"桩；**返回 `false` 时直接执行真 API** | `oss_feature/tools/jidl/json_ast_source.mt:655-702`（关键在 `if (FeatureRequestPermissions(handle, &request_info)) return;` 之后**没有 return**） |
| `requestPermissions` 在无权限回调时返回 `false` | `oss_feature/src/feature_instance.cpp:128-143` |
| `isBlackListed` 只拦 `system.device.getDeviceId` | `oss_feature/src/feature_instance.cpp:145-153` |
| `fetch` 需要 `hapjs.permission.INTERNET` | `oss_feature/modules/jidl/fetch.jidl`、`oss_feature/include/feature_permission.h` |
| 权限判定被委托给产品层的纯虚接口 | `oss_quickapp/shell/common/permission/permission_manager.h`、`permission_manager_impl.cpp` |
| 拒绝原因 → JS 可见错误串 | `oss_feature/src/permissions_manager.cpp`（`get_perms_reject_message`：`permissions denied` / `permissions error` / `permissions no background` / `unknown reason`） |
| C-API 声明位置（`FeatureRequestPermissions` 在 `feature_description.h`；`FeatureSetPermissionsCallback`/`Grant`/`Reject` 在 `feature_main_exports.h`） | `oss_feature/include/feature_description.h:289`、`include/feature_main_exports.h:219-246` |

**用反证式检查区分"权限系统是否接入"**（§1.7.6 D 节）：

```bash
cd /dsh/workspace/chaos/fwx
for s in "permission(%s) api(%s)" "back to feature res" "hapjs.permission." "PermissionManager" "validatePermissionName"; do
  printf '%-30s %s\n' "$s" "$(grep -aoc -- "$s" vela_ap.bin)"
done
# 全部为 0 ⇒ 本机快应用壳没有接入权限系统
# 注意：请用 INFO/WARN 级日志格式串作指标；DEBUG 级串（如 "no permissions cb"）会被 release 删除，不可作依据。
```

# 附录 D：真机探针（JSLab 版）

运行环境为 [JSLab](https://github.com/cciccicu/JSLab) —— 一个跑在 Vela 手环上的 JS 运行器。
它的运行时契约与本报告的假设有**四个必须知道的差异**：

| 项目 | 快应用里是 | JSLab 里是 |
|---|---|---|
| 能力查询 | `canIUse('@system.fetch')` | `script.canUse('@system.fetch')`（**必须带 `@`**） |
| fetch 调用 | `import fetch from '@system.fetch'` → `fetch.fetch(o)` | `system.http.request(o)`（源码里就是 `options => fetch.fetch(options)` 的直通包装） |
| 模块引入 | `require('@system.x')` | **没有 `require`**，全部挂在 `system.*` 上 |
| 日志 | console | console **只在内存**（64 条 / 6144 字符 / 单条 1024），退出即丢 |

完整脚本见 `/dsh/workspace/chaos/fetchprobe/`（`probe-snippet.js` 与 `src/pages/index/index.ux`），
2026-10-17 实际在设备上跑出结果的那一版核心如下：

```js
var FP_URL_HTTP  = 'http://qxdho.top/';
var FP_URL_HTTPS = 'https://qxdho.top/';
var FP_LOG = [];
var LOG_URI = 'internal://files/js/fplog.js';   // 必须 .js —— JSLab 只列 .js 文件

function say(s) {
  FP_LOG.push(s);
  try { console.log('[FP] ' + s); } catch (e) {}
  scheduleFlush();                              // 1s 防抖落盘，中途退出也不丢
}
function flushLog() {
  system.files.writeText({
    uri: LOG_URI,
    text: '// [FP] 日志\n' + FP_LOG.map(function (x) { return '// ' + x; }).join('\n') + '\n'
  });
}

// 能力查询（注意 @ 前缀）
['@system.fetch', '@system.fetch.fetch', '@system.request', '@system.uploadtask',
 '@system.prompt', '@system.network', '@system.interconnect', '@system.file']
  .forEach(function (c) { say('canUse ' + c + ' = ' + script.canUse(c)); });

// 最关键的一行：手环此刻到底有没有网
system.network.getType({
  success: function (v) { say('network.getType = ' + JSON.stringify(v)); }
});

// callback 风格：fail 收到的是【字符串】
system.http.request({
  url: FP_URL_HTTP, method: 'GET', responseType: 'text',
  success: function (v) { say('success = ' + JSON.stringify(v)); },
  fail:    function (v) { say('fail = ' + JSON.stringify(v)); }
});

// promise 风格：catch 收到的是【对象 {code,data}】—— 要错误码必须用这种
var p = system.http.request({ url: FP_URL_HTTP, method: 'GET', responseType: 'text' });
if (p && p.then) p.then(function (v) { say('then = ' + JSON.stringify(v)); })
                   .catch(function (e) { say('catch = ' + JSON.stringify(e)); });

// 对照组：验证参数校验层是活的（应当返回 invalid url）
system.http.request({ url: 'ftp://x/y', fail: function (v) { say('ftp fail = ' + v); } });
```

把 `fplog.js` 从手环上复制出来的方法：它在 JSLab 的脚本目录里，
因为 `jsManager.js` 的 `listScripts()` 用 `/\.js$/i` 过滤文件，所以写 `.js` 才能被列表看到。

---

*本报告固件部分的字符串/指针结论来自静态扫描，关键结论（`fetch` 注册函数、JIDL map 查找、权限表）已由 `capstone-wasm` 反汇编交叉验证（见 1.7.3）；§1.7.6 的"按机型裁剪"与"权限桩落穿"结论来自 open-vela 开源源码 + 二进制反证式检查，并已由 §1.7.7 的**真机探针实测确认**。Chaos-Module 部分的所有代码结论来自静态阅读，**未经编译验证**（本环境无 Rust 工具链）。*
