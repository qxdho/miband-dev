---
title: 系统架构
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/03-系统架构.md"
contributors: [miband-dev]
---

# 系统架构

<StatusBadge status="sourced" verified="2026-10-25" />

结论：10 Pro 运行 NuttX 加 Vela 应用框架，内核的网络用户态工具与 TCP/IP 协议栈完整，缺的是创建 `/dev/tun` 并注册为网卡的驱动代码与 DNS 解析器；`modlib` 模块子系统的存在是相对 9 Pro 最大的架构差异。

判断某项能力是缺代码还是缺配置，需要先看这一层。很多结论只有放在内核与框架的分界上才成立。

## 分层

```text
┌─────────────────────────────────────────────┐
│  快应用 (QuickJS)  ← JSLab / 计算器 / 日程…  │
├─────────────────────────────────────────────┤
│  Vela 应用框架（feature 框架 + JIDL 绑定）   │
├─────────────────────────────────────────────┤
│  系统服务：lvgl / libuv / miwear / app_net   │
├─────────────────────────────────────────────┤
│  NuttX 内核：调度、VFS、TCP/IP、modlib       │
├─────────────────────────────────────────────┤
│  BES 芯片：BL → BL2 → AP                     │
└─────────────────────────────────────────────┘
```

自上而下共五层：JS 运行时、Vela 应用框架、系统服务、NuttX 内核、BES 引导与芯片。各层之间通过 JIDL 绑定与 VFS 接口衔接。

## `vela_ap.bin` 的构成

`vela_ap.bin` 是 13,795,728 字节的单体镜像，上面四层软件全部装在其中。

| 层 | 代表组件 | 固件内证据 |
| --- | --- | --- |
| JS 运行时 | QuickJS 与 Lua 基础库 | 完整运行时字符串表：`collectgarbage`、`dofile`、`getmetatable` |
| 应用框架 | Vela feature 框架、JIDL 绑定 | `jidl_feature` 21 处、`fetch_impl` 11 处 |
| 系统服务 | lvgl、libuv、miwear、app_net | `uv_networkcache.c`、`uv_netstatus`、`uv_miwear.c` |
| 内核 | NuttX 调度、VFS、TCP/IP、modlib、NSH | `nuttx/libs/libc/modlib/*`、`nuttx/net/tcp/*`、NSH 命令表 |
| 引导 | BL、BL2 | `ZZ~` 容器、`vela_bl.bin`、`vela_bl2.bin`、`vela_ap.bin` 三段式 |

镜像不是 ELF，没有节表与符号表，上述构成由字符串与指针引用反推得出。容器结构与地址换算见[固件包格式](/firmware/package)。

## 内核

固件中的 `NuttX` 只出现 2 次，`nuttx-` 出现 0 次，版本串为 `NuttX 0.0.0`，发行版把版本号抹成了占位符。无法直接对照上游版本，只能按固件中存在的源文件路径反推配置。

### 内存布局

| 区域 | 地址 | 说明 |
| --- | --- | --- |
| 代码别名 | `0x0C000000` | 镜像映射，指令取指 |
| 数据别名 | `0x2C0C0000` | 同一份字节的第二个映射 |
| 初始栈顶 | `0x28DE8024` | 向量表第 0 项 |
| 内核堆 | 由 NuttX 管理 | 模块加载也从这里分配 |

双映射的推导与验证见[固件包格式](/firmware/package)的地址换算一节。

## 启动链

BES 芯片的上电流程分三段：BL 加载 BL2，BL2 加载 AP。三段对应三个分区与三个镜像。

| 阶段 | 分区 | 镜像 | 写入者 |
| --- | --- | --- | --- |
| 一级引导 | `/dev/bl` | `vela_bl.bin`，9 Pro 包内为 63,712 字节 | 工厂 |
| 二级引导 | `/dev/bl2` | `vela_bl2.bin`，10 Pro 为 451,468 字节 | `ota.sh` |
| 应用处理器 | `/dev/ap` | `vela_ap.bin`，10 Pro 为 13,795,728 字节 | `ota.sh` |

10 Pro 的 `ota.sh` 只写 `/dev/bl2`、`/dev/ap` 与 `/dev/resource` 三个分区，一级引导不由固件包更新。AP 镜像自带 12 字节头与裸 ARM 向量表，复位向量位于偏移 `0x10`，入口代码从向量表开始执行。

`vela_ap.bin` 内含 `/dev/flash_ap`、`boot2 update`、`update app:%s` 等字符串，说明 AP 侧保留了更新 BL2 与自身的调用路径。

## modlib 的位置

`modlib` 位于 NuttX 的 libc 子系统，源码路径为 `nuttx/libs/libc/modlib/`，通过 NSH 的 `insmod`、`rmmod`、`lsmod` 暴露给用户。10 Pro 与 9 Pro 的差异如下：

| 证据 | 10 Pro | 9 Pro |
| --- | ---: | ---: |
| `nuttx/libs/libc/modlib/` 源文件路径 | 多个 | 0 |
| `modlib` 字符串 | 16 | 0 |
| `modlib_symtab` | 1 | 0 |
| `insmod` | 1 | 0 |
| `rmmod` / `lsmod` | 各 1 | 0 |

这是整个研究中最重要的一个差异。9 Pro 的一切都静态编入 `vela_ap.bin`，增加功能只能改固件重刷，而固件带签名；10 Pro 保留了运行时加载模块的入口。

模块格式、符号解析与加载流程见[内核模块系统](/native/modules)。

## NSH 命令行

10 Pro 编入了一张完整的 NSH 命令表，位于 `vela_ap.bin` 偏移 `0xa6d800` 至 `0xa6da00` 附近。每个条目由命令名与帮助串紧邻排列：

```text
... mv\0\0<old-path> <new-path>\0\0\0mw\0\0<hex-address>[=<hex-value>]...
... nslookup\0\0\0\0<host-name>\0pidof\0\0\0pmconfig\0\0\0\0[stay|relax]...
... hexdump\0<file or device>\0\0\0\0ifconfig\0\0\0\0[interface [mtu <len>]|
    [address_family] [[add|del] <ip-address>|dhcp]] [dr|gw|gateway ...
    ... <net-mask>|prefixlen <len>] [dns <dns-address>] [hw <hw-mac>]\0\0\0ifdown\0\0<interface>\0
    ifup\0\0\0\0insmod\0\0<file-path> <module-name>\0\0\0kill\0\0\0\0[-<signal>] <pid>\0\0
    pkill\0\0\0[-<signal>] <name>\0\0lose...
```

从命令表本身可以读出以下能力：

| 命令 | 帮助串 | 意义 |
| --- | --- | --- |
| `ifconfig` | `[interface [mtu <len>]\|[address_family] [[add\|del] <ip-address>\|dhcp]] [dr\|gw\|gateway <net-mask>\|prefixlen <len>] [dns <dns-address>] [hw <hw-mac>]` | 完整版，可配 IP、掩码、网关、DNS、MAC 与 DHCP |
| `ifup` / `ifdown` | `<interface>` | 接口启停 |
| `insmod` | `<file-path> <module-name>` | 模块加载可用 |
| `rmmod` / `lsmod` | 无 | 模块卸载与列表 |
| `nslookup` | `<host-name>` | DNS 查询客户端存在 |
| `netstat` / `route` / `arp` | 无 | 网络诊断套件存在 |
| `losetup` | 无 | 回环设备，可从文件挂载镜像 |
| `ps` / `free` / `df` / `mount` / `md5` | 无 | 常规运维 |

这张表是网络用户态齐备的直接证据。一旦有了网卡驱动，`ifconfig tun0 ...` 配合 `ifup tun0` 即可拉起接口，不需要补充任何用户态代码。

`wget` 在固件中只出现 1 次，位置在 Lua 基础库的字符串表里，与 `collectgarbage`、`dofile`、`getmetatable` 相邻，不是 NSH 命令条目。

## TCP/IP 协议栈

协议栈主体完整，固件内嵌的调试串覆盖了连接、收包与发包路径：

| 文件路径 | 状态 |
| --- | --- |
| `nuttx/net/tcp/tcp_connect.c` | 在 |
| `nuttx/net/tcp/tcp_input.c` | 在 |
| `nuttx/net/tcp/tcp_send_unbuffered.c` | 在 |
| `nuttx/net/socket/connect.c` | 在 |
| `nuttx/net/socket/sendmsg.c` | 在 |
| `nuttx/net/socket/recvmsg.c` | 在 |

`socket()`、`connect()`、`send()`、`recv()` 全部可用。实测 `connect()` 到裸 IP 返回 `code:7`（`Couldn't connect to server`，约 59 ms），而不是 `ENETUNREACH` 长时间阻塞，说明失败来自缺少路由表项，协议栈本身在工作。

### 网络层缺失项

| 符号或字符串 | 存在 | 后果 |
| --- | --- | --- |
| `netdev_register` | 0 次，仅名字串 | 函数本体存在，地址 `0xc1fc214`，由 IDA 精确恢复 |
| `tun%d` | 0 次 | 没有 TUN 设备的命名与创建 |
| `lib_getaddrinfo.c` | 不在 `netdb/` 的 6 个源文件中 | 域名解析不可用 |
| `nuttx/net/dns/` | 0 | DNS 客户端库未编入 |
| `dns_add_nameserver` / `resolv.conf` / `ipv4_dns` | 0 | 无域名服务器配置机制 |
| `SIOCGIFCONF` | 0 | 无法枚举接口 |

`/nuttx/libs/libc/netdb/` 只列出 6 个源文件路径，`lib_getaddrinfo.c` 不在其中，这是域名解析未编入的直接证据，也解释了实测中所有域名请求以 `Couldn't resolve host name` 失败。

NSH 命令表中有 `nslookup`，但 DNS 客户端库看起来没有编入。可能是 applet 保留了名字而实现被裁掉，也可能 DNS 代码在 `netutils` 等位置而没有留下源文件路径串。该矛盾没有闭环，走补 DNS 的路线前需要先验证 `nslookup` 能否执行，状态待定。

## 分区与文件系统

### 存储分区

| 节点 | 内容 | 写入者 |
| --- | --- | --- |
| `/dev/bl` | 一级引导 | 工厂 |
| `/dev/bl2` | 二级引导 | `ota.sh` |
| `/dev/ap` | 应用处理器镜像 | `ota.sh` |
| `/dev/resource` | 资源分区，171 MB | `ota.sh` |
| `/dev/ota` | OTA 暂存 | 升级时 |
| `/dev/ota_data` | OTA 元数据 | 升级时 |
| `/dev/factory` | 工厂数据 | 工厂 |
| `/dev/efuse` / `/dev/otp` | 一次性可编程区 | 工厂 |

### 运行时文件系统

| 路径 | 内容 |
| --- | --- |
| `/data/` | 用户数据：`apps.json`、已装快应用、日志 |
| `/data/offlinelog/` | 离线日志 `log1.gz` 至 `log6.gz`，每个解压后 2 MB |
| `/data/dfx/note/` | 诊断事件 `*.ev.gz` |
| `/system/` | 系统资源：`watchface/<id>/resource.bin` |
| `/ota/` | 升级包暂存 |
| `/dev/` | 设备节点 |

`/data/apps.json` 是快应用的注册表，字段包括 `names`、`minAPILevel`、`minPlatformVersion`、`standalone`、`needNetwork`、`installedTimestamp`，序列化代码在 `package.cpp`。

### `/dev` 节点

9 Pro 的 bring-up 列表如下，10 Pro 结构相同：

```text
/dev/urandom  /dev/loop   /dev/ptmx     /dev/utouch
/dev/ubutton  /dev/ukeyboard             /dev/usensor
```

列表中缺少 `/dev/tun` 的创建代码。9 Pro 的 `/dev/tun` 在 `nx_bringup` 中与 `eth%d`、`tun%d` 一起注册，10 Pro 对应的注册语句被裁掉，设备节点开机不存在。

## 与 9 Pro 的架构对比

| 维度 | 10 Pro | 9 Pro |
| --- | --- | --- |
| 应用框架 | 新一代 feature 框架，`jidl_feature` 21 处 | 上一代，0 处 |
| fetch 实现 | `fetch_impl` 独立模块，11 处 | 内联在 AIOTJS 绑定中 |
| 模块加载 | `modlib` 加 `insmod` | 无 |
| TUN 驱动 | 未编入 | 静态编入 |
| 网络用户态 | 完整 NSH 套件 | 完整 |
| 资源组织 | 单个 171 MB `vela_resource.bin` | 按功能拆成多个 `.res` |
| 固件签名 | ZIP 加 CERT | 未验证 |

9 Pro 是一切都编好，10 Pro 是框架留了口子但驱动没有安装。这恰好是 10 Pro 反而有改造空间的原因：只要能把驱动塞进去。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| NuttX 具体版本 | 待定，版本串被抹成 `0.0.0` |
| `nslookup` 是否真能执行 | 待定，与 DNS 库未编入矛盾 |
| 10 Pro 的 `/dev/tun` 是否从未注册 | 已证实，手环日志 26 次 `ENOENT` 反证 |
| `netdev_register` 是未编入还是被裁成静态符号 | 推断为前者，符号串完全不存在 |

## 相关页面

- 容器结构、分区与地址换算：[固件包格式](/firmware/package)
- 模块格式与加载流程：[内核模块系统](/native/modules)
- 打通网络的完整链路：[网络通路](/protocol/network)
- 备份、读取与恢复路径：[固件研究](/firmware/)
