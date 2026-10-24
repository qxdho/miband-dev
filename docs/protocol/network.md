---
title: 网络通路
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/05-网络通路.md"
contributors: [miband-dev]
---

# 网络通路

<StatusBadge status="sourced" verified="2026-10-25" />

结论：通路在设计上是完整的，手机侧代理已经成功启动，断点在手环侧的一个设备节点。`/dev/tun` 不存在，隧道客户端 `net_tun_open()` 以 `errno 2`（`ENOENT`）失败。这不是配置问题，是驱动没有编进固件。

## 完整链路

```
┌─ 手环 ───────────────────────────────────────────────┐
│  快应用 JS                                            │
│    ↓  fetch.fetch({url})                              │
│  Vela 绑定层 / fetch_impl                             │
│    ↓                                                  │
│  libuv  (uv_miwear.c, uv_netstatus)                   │
│    ↓                                                  │
│  NuttX TCP/IP 栈 (net/tcp/*, net/socket/*)            │
│    ↓  查路由表 → 找出口网卡                            │
│  ┌─────────────────────────────────┐                  │
│  │  没有已注册的网卡  ← 断点        │                  │
│  └─────────────────────────────────┘                  │
│    ↓  本该是 /dev/tun                                  │
│  app_net.c 隧道客户端                                 │
│    ↓  BLE GATT                                        │
└───────────────────────────────────────────────────────┘
     ↓
┌─ 手机 ────────────────────────────────────────────────┐
│  小米运动健康                                          │
│  NetProxyManager → NetProxyComponent                  │
│    ↓  (JNI)                                           │
│  Android 网络 → 互联网                                 │
└───────────────────────────────────────────────────────┘
```

链路两端都有代码，中间的网卡注册在 10 Pro 上不存在。

## 逐层证据

### 应用层到 libuv

固件中有 libuv 的网络状态实现：

```
../../frameworks/system/utils/uv/src/uv_miwear.c
../../frameworks/system/utils/uv/src/uv_networkcache.c
```

对应的日志格式串：

```
["uv_netstatus":%d]uv_ifstatus_isup: name: %s, flags: %d
["uv_netstatus":%d]uv_netstatus_gettype: name: %s, status :%s
```

`uv_miwear.c` 的存在说明 libuv 在这一层接的是小米自己的传输栈，而不是通用 socket 抽象。

### TCP/IP 栈

完整 NuttX 网络栈已随固件存在。实测 `connect()` 到裸 IP 在 59 ms 内失败，说明协议栈在运行，只是没有出口设备。

### `/dev/tun`

| 证据 | 10 Pro | 9 Pro |
| --- | ---: | ---: |
| `/dev/tun` 字符串 | 2（均为 `app_net.c` 的日志串） | 2（一个 bring-up 注册，一个日志串） |
| `TUNSETIFF` | 1 | 1 |
| `tun%d` | 0 | 1 |
| `netdev_register` | 0 | 1 |

10 Pro 的 `app_net.c` 会打开 `/dev/tun`，但固件中没有任何代码创建该节点。

### `app_net.c` 隧道客户端

固件保留了完整的格式串，足以还原模块功能：

```
netif %s %s
Miwear NET Connected
Miwear NET Disconnected
[Miwear NET][%s] %s: failed to open /dev/tun: %d
[Miwear NET][%s] %s: ioctl TUNSETIFF failed: %d
[Miwear NET][%s] %s: Created Tun: %s
ioctl SIOCGIFMTU failed: %d
poll events:%d status:%d
poll disconnected
invalid tun fd
write fail:%d errno:%d
Can't open socket: %d
```

函数名同样以字符串形式存在：

| 函数 | 职责 |
| --- | --- |
| `net_tun_open` | 打开 `/dev/tun`，`ioctl(TUNSETIFF)` 建接口 |
| `net_tun_close` | 关闭 |
| `net_tun_poll_data` | 轮询收包 |
| `net_get_tun_packet_size` | 取包长 |
| `net_uv_poll_start` | 把 fd 挂到 libuv 事件循环 |
| `netif_switch` | 切换接口 up/down |
| `net_trans` | 传输 |
| `net_sockif` | socket 接口 |
| `net_reconnect` | 重连 |
| `app_net_receive` | BLE 收到数据后写入 tun |
| `app_net_connect_state_update` | 连接状态回调 |
| `remote_net_state_switch` | 手机侧下发的开关，10 Pro 独有 |

这是一份写完整的 TUN-over-BLE 客户端。唯一前提是 `/dev/tun` 存在。

### 手机侧代理已启动

小米运动健康日志 `XiaomiFit.device.log`（UTC+8）：

```
NetProxyComponent|onConnectSuccess() called with: net proxy did = 2239055857
NetProxyComponent|onConnectSuccess: support net proxy = true
NetProxyManager|start() called, jniContext = 503260182864, started = true
DeviceBasicStatusDataHandler|addHandler ... NetProxyComponent$upstreamHandleData$1
```

| 日志 | 含义 |
| --- | --- |
| `support net proxy = true` | 手机认为这台手环支持网络代理 |
| `started = true` 与非零 `jniContext` | 代理对象真的建起来了 |
| `net proxy did = 2239055857` | 只对 10 Pro 建立，对 9 Pro 从未建立 |
| `upstreamHandleData` | 上行数据通道已注册 |

手机侧没有发现问题。

#### 第一次 `start()` 是空转

```
19:08:58.492  NetProxyManager|start() called, jniContext = 0, started = false
19:09:27      ← 探针在此时间点执行，代理尚未真正启动
19:09:46.021  NetProxyManager|start() called, jniContext = 503260182864, started = true
19:09:53.938  onDeviceLost
```

第一次 `start()` 携带 `jniContext = 0`，为空转；第二次才拿到真实上下文。探针恰好执行在两次之间，那一轮实测的失败不能完全归因于驱动缺失。代理启动后的探针仍返回 `code 7`，结论不变。

真实代理启动后 7.9 秒，BLE 连接断开。重连时 `errorCode = 2011/2012`。该现象在整份日志中反复出现，属另一个独立问题。

### 手环侧的决定性日志

`/data/offlinelog/log*.gz` 中，从 10/16 15:36 到 10/17 11:44 共 26 次，无一例外：

```
[10/17 11:19:05] [30] [ ERROR] [ap] [bt] net_tun_open: failed to open /dev/tun: 2
[10/17 11:19:05] [30] [ ERROR] [ap] [bt] app_net_connect_state_update: tun open fail
```

`errno 2` 对应 `ENOENT`，即文件不存在。其余可能的错误码与实际表现不符：

| 可能原因 | 对应错误 | 实际 |
| --- | --- | --- |
| 权限不足 | `EACCES = 13` | 不是 |
| 设备忙 | `EBUSY = 16` | 不是 |
| ioctl 失败 | `ioctl TUNSETIFF failed` | 不是 |
| 节点不存在 | `ENOENT = 2` | 是 |

失败发生在 `app_net_connect_state_update` 中，即连接状态更新回调。时序为手机连上、手环收到通知、手环尝试打开 tun、失败。链路前半段是通的。

日志时间戳为 UTC，手机日志为 UTC+8，对齐时需减 8 小时。

## `remote_net_state_switch` 的归属

该符号 10 Pro 有、9 Pro 没有。字符串位于文件偏移 `0xc8b638`，对应数据地址 `0x2cd4b638`。

按地址换算规则搜索引用：

| 搜索基准 | 命中 |
| --- | --- |
| 代码别名 `0x0C000000` | 0 处 |
| 数据别名 `0x2C0C0000` | 1 处，位于文件 `0x651730` |

反汇编 `0x0c651730` 附近，该地址落在一个字面量池中，周围的 32 位字为：

```
0x20126c88, 0x20126c8a, 0x20126c89,
"up", "bt-net", "remote_net_state_switch", "bt",
0x2cc15e84, "down"
```

同一段代码的另一处字面量池（`0x6515ac` 附近）：

```
"app_net_connect_state_update", "bt", "/dev/tun", "up",
"netif_switch", "net_tun_open", "bt-net", "net_get_tun_packet_size"
```

### 推论

1. 两个池中的字符串只是日志元数据，用作模块名与函数名标签，不是调度表。
2. 整个固件中没有任何代码通过 `remote_net_state_switch` 做分派，没有 PC 相对的加载器，也没有跳转表。
3. 真正的 topic id 在别处，可能是数字常量，字符串仅用于打日志。

开关的决定权在手机侧，手环侧没有找到本地触发点。这与协议设计一致：手环不判断自己该不该上网，由手机下发。该结论为推断，实际 message handler 未定位到。若要自行发送该 topic，需先在手机 App 中抓包确认 topic id 与 payload 格式，payload 形态推断为 `"up"` 与 `"down"`。

## `getType` 不能当判据

`system.network.getType()` 实测返回 `"none"`，容易被误读为设备没有网络。

实现对应的日志串：

```
["uv_netstatus":%d]uv_netstatus_gettype: name: %s, status :%s
```

类型名表在固件中连续存放：

```
wifi  wlan0  wlan1  cellsurf  cellular  bt-pan  bt-net  tun0  tun  eth0  ethernet
```

`getType()` 的行为是遍历已注册的网络设备，把名字映射到表中的类型，一个都没有匹配上时返回 `none`。

| 观察值 | 真实含义 |
| --- | --- |
| `getType() === 'none'` | 内核里没有已注册的网络设备 |
| 存在 tun 设备时的返回值 | 表中有 `tun0` 与 `tun`，返回 `"tun"`，此条为推断 |

`tun` 就在这张表里。早期「TUN 不在类型表中，所以 `getType` 永远为 `none`」的说法不准确已被推翻。真正的原因是设备根本没有注册，表里有什么都不影响结果。

`getType` 不是独立证据，它只是「设备未注册」的投影，只能说明没有网卡，不能说明没有网络。

## 裸 IP 也连不上的原因

实测 `http://154.9.24.61/` 返回 `code 7`，耗时 59 ms。

`connect()` 的流程是查路由表、找出口设备、发包。没有已注册设备时路由表为空，`connect()` 立即返回 `ENETUNREACH` 或 `EHOSTUNREACH`，由绑定层翻译成 `code 7`。

- 59 ms 说明没有发生真实网络交互，不是超时；
- 加 `Host: qxdho.top` 头不改变结果，P1 与 P1+H 完全一致，请求没有出网卡。

用 JS shim 把域名换成 IP 的方案不成立，换成 IP 同样连不上。该方案在早期被提出，后被 P1 探针否掉。

## interconnect 的位置

`interconnect` 是小米的跨设备互联框架。在 9 Pro 的固件包中为 17 KB（`interconnect.res`），在 10 Pro 的 `vela_ap.bin` 中可见 `miwear-server`、`Start quickapp proxy server` 等串。

| 项 | interconnect | Miwear NET |
| --- | --- | --- |
| 用途 | 通用设备间消息 | 专门传 IP 包 |
| 传输 | BLE | BLE |
| 手环侧接收者 | interconnect 服务 | `app_net.c` |
| 前置条件 | 无需驱动 | 需要 `/dev/tun` |

两者共用同一条 BLE 链路，上层协议不同。Miwear NET 由官方 App 自带，形态符合需求，缺的是驱动。

## 一次失败连接的完整时间线

```
T+0.000  手机 BLE 连上手环
T+0.5    NetProxyComponent onConnectSuccess, support = true
T+1.0    NetProxyManager.start()  ← 第一次 jniContext = 0，空转
T+2.0    sync Phone NetWorkState to Device（约 30 次）
T+48     第二次 start()，jniContext 非零，started = true
T+48.1   手环收到连接状态更新
T+48.1   app_net_connect_state_update → net_tun_open → open("/dev/tun") → ENOENT
T+48.2   日志：tun open fail
T+56     BLE 掉线，errorCode 2011/2012
```

断点在 `T+48.1`。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| 真实代理启动后 7 至 8 秒 BLE 必掉的原因 | 待定，可能为功耗策略或协议不兼容，补驱动后需重测 |
| `remote_net_state_switch` 的 topic id 与 payload 格式 | 推断，payload 为 `"up"` 与 `"down"`，id 未知 |
| 补上 `/dev/tun` 后手机是否自动开闸 | 待定，决定项目成败的关键项 |
| `errorCode 2011/2012` 的确切含义 | 待定，未在小米文档中找到 |
| 26 次 ENOENT 是否全部发生在代理启动之后 | 待定，未逐条对齐时间戳，两侧时区不同 |
| 10 Pro 固件中不存在创建 `/dev/tun` 的代码 | 已证实 |

## 相关页面

- `fetch` 的三类失败模式：[快应用运行时](/quickapp/runtime)
- 补 `/dev/tun` 的模块实现路径：[内核模块系统](/native/modules)
- 手环与手机之间的 BLE 通信：[BLE 协议](/protocol/)
