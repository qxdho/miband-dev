---
title: 内核模块系统
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/06-内核模块系统.md"
contributors: [miband-dev]
---

# 内核模块系统

<StatusBadge status="sourced" verified="2026-10-25" />

手环 10 Pro 在运行时加载自编译内核代码的能力，决定了补 `/dev/tun` 是否需要重刷固件。固件带签名，改固件重刷的路线不可行，因此模块加载是唯一可用路径。

结论：模块系统齐备，`modlib`、`insmod` 都在固件里，创建 `/dev/tun` 所需的内核函数已精确定位。风险不在能力有无，而在这套 ABI 从未在真机上执行过。

## NuttX 的 modlib

`modlib` 是 NuttX 的可加载模块子系统，作用对应 Linux 的 `.ko`。

| 能力 | 命令 |
| --- | --- |
| 加载 ELF 可重定位目标文件 | `insmod <path> <name>` |
| 执行重定位 | 加载时由 modlib 完成 |
| 调用模块构造函数 | 扫描 `.init_array` |
| 卸载 | `rmmod <name>` |
| 查看已加载 | `lsmod` |

### 固件里的证据

在 `vela_ap.bin` 中统计字符串出现次数：

| 字符串 | 10 Pro | 9 Pro |
| --- | ---: | ---: |
| `nuttx/libs/libc/modlib/` 源文件路径 | 多个 | 0 |
| `modlib` | 16 | 0 |
| `modlib_symtab` | 1 | 0 |
| `insmod` / `rmmod` / `lsmod`（NSH 命令表） | 各 1 | 0 |

这是 10 Pro 相对 9 Pro 唯一明确多出的能力，也是本案的立足点。

## 模块文件格式

Canopus 的 target pack 在 `target.toml` 的 `[loader_profile]` 中记录了加载器参数，是这套格式最可靠的一手资料。

| 字段 | 值 | 含义 |
| --- | --- | --- |
| `elf_class` | `32` | ELF32 |
| `elf_machine` | `ARM` | `EM_ARM` |
| `elf_type` | `ET_REL` | 可重定位目标文件，不是可执行文件 |
| `endianness` | `little` | 小端 |
| `constructor_discovery` | `init_array` | 构造函数从 `.init_array` 段查找 |
| `symbol_imports` | `none` | 不允许导入符号 |
| `max_size` | `0` | 无大小上限 |
| `alignment` | `4` | 4 字节对齐 |
| `module_name_rules` | `^[a-zA-Z0-9_]+$` | 模块名只能使用字母、数字、下划线 |
| `load_command` | `insmod <path> <name>` | |
| `unload_command` | `rmmod <name>` | |
| `persistent_autoload` | `false` | 重启后不自动加载 |

目标平台参数：

| 项 | 值 |
| --- | --- |
| `architecture` | `armv8-m.main` |
| `cpu` | `cortex-m33` |
| `instruction_set` | `thumb2` |
| `float_abi` | `soft` |
| `module_abi` | `1` |
| `relocation_profile` | `best1503-v1` |

编译目标是 Cortex-M33、Thumb2 指令集、软浮点，使用 `arm-none-eabi-gcc -mthumb -mcpu=cortex-m33 -mfloat-abi=soft -fPIC -c` 一类的参数即可产出。

## 加载流程

```
insmod /data/xxx.ko tun0
   │
   ├─ 1. 读 ELF 头，校验 ET_REL / EM_ARM / ELF32
   ├─ 2. 分配内存，把各 SHF_ALLOC 段拷贝进去
   ├─ 3. 处理重定位表
   ├─ 4. 解析外部符号（本平台 symbol_imports = none，此步为空操作）
   ├─ 5. 遍历 .init_array，逐个调用构造函数
   └─ 6. 登记到已加载列表，lsmod 可见
```

模块构造函数即入口。TUN 驱动在构造函数中完成两件事：

```c
static void tun_init(void) {
    register_driver("/dev/tun", &g_tun_fops, 0666, NULL);  // 创建节点
    netdev_register(&g_tun_dev, NET_LL_ETHERNET);          // 注册网卡
}
```

`persistent_autoload = false` 意味着每次重启都需要重新 `insmod`。研究阶段不受影响，日常使用需要 Canopus 或 Chaos 这类加载器在开机时执行一次。

## 重定位支持

`[loader_profile.relocations]` 列出 modlib 接受的重定位类型：

| 名称 | `r_type` | 用途 | 验证状态 |
| --- | ---: | --- | --- |
| `R_ARM_NONE` | 0 | 空操作 | 接受 |
| `R_ARM_ABS32` | 2 | 32 位绝对地址 | profile 已确认，设备级未验证 |
| `R_ARM_REL32` | 23 | 相对地址 | profile 已确认，设备级未验证 |
| `R_ARM_TARGET1` | 38 | 按 ABS32 处理 | 接受 |
| `R_ARM_PREL31` | 42 | `.ARM.exidx` 使用 | 已确认 |
| `R_ARM_THM_MOVW_ABS_NC` | 47 | Thumb `movw` 立即数低半 | 已确认 |
| `R_ARM_THM_MOVT_ABS` | 48 | Thumb `movt` 立即数高半 | 已确认 |
| `R_ARM_THM_CALL` | 10 | 模块内 `BL` | 设备级未验证 |
| `R_ARM_THM_JUMP24` | 30 | 模块内条件跳转 | 设备级未验证 |

target pack 自己对 3.101.043 标注了 `device gate pending`。这是本案最大的技术风险：第一次 `insmod` 可能直接崩溃。

## 符号导入被禁用

`symbol_imports = none` 决定模块的写法。

通常情况下，模块调用固件函数时由编译器生成 `R_ARM_THM_CALL` 和符号引用，加载器在固件符号表中查出地址后回填。这台设备的固件符号表已被剥离，不允许导入符号。

替代做法是把地址硬编码。Canopus 为此生成了一层贴片函数：

```c
// generated/canopus_veneer.h:292
typedef int (*canopus_fw_netdev_register_fn)(void *, int);
static inline int canopus_fw_netdev_register(void * a0, int a1) {
    return ((canopus_fw_netdev_register_fn)(uintptr_t)0xc1fc215)(a0, a1);
}

// generated/canopus_veneer.h:318
typedef int (*canopus_fw_register_driver_fn)(const char *, const void *, uint32_t, void *);
static inline int canopus_fw_register_driver(const char * a0, const void * a1, uint32_t a2, void * a3) {
    return ((canopus_fw_register_driver_fn)(uintptr_t)0xc1aff61)(a0, a1, a2, a3);
}

// generated/canopus_veneer.h:463
typedef int (*canopus_fw_unregister_driver_fn)(const char *);
static inline int canopus_fw_unregister_driver(const char * a0) {
    return ((canopus_fw_unregister_driver_fn)(uintptr_t)0xc1b002d)(a0);
}
```

`static inline` 加常量地址会被编译成 `movw`、`movt`、`blx`，不产生任何外部符号引用，绕开 `symbol_imports = none` 的限制。

地址末位为奇数（`0xc1fc215` 而非 `0xc1fc214`）是 Thumb 位。Cortex-M 只支持 Thumb 指令，函数指针最低位为 1 表示按 Thumb 解码。贴片函数漏掉这一位会以 ARM 模式跳转，直接触发 HardFault。

代价是地址与固件版本强绑定。更换固件版本需要重新恢复整套地址，target pack 按 `firmware_sha256` 分目录存放正是为此。

## 字符串计数不能证明函数存在

早期判断某项能力是否存在的方法是在固件中统计字符串：

```bash
node -e '...b.indexOf("netdev_register")...'   # → 0
```

`netdev_register` 出现 0 次，当时的结论是 10 Pro 没有网络设备注册入口。该结论已被推翻。

字符串在固件中的来源有三类：

| 来源 | 编译后是否保留 |
| --- | --- |
| 日志格式串 `printf("...")` | 保留 |
| 断言表达式文本 `ASSERT(cond)` | 关闭 `NDEBUG` 后消失 |
| 符号名（调试信息） | 被 strip 移除 |

函数存在而函数名不存在是正常现象，尤其在函数只在断言中被提及时。Canopus 用 IDA 对同一个 `firmware_sha256`（`51930767…56ec`）做了精确恢复，得到：

```
netdev_register  @ 0xc1fc214   int(void *, int)   STATIC_RECOVERED / APPROVED
```

字符串计数可以否定「某功能存在活跃调用路径」，不能否定「某函数存在」。证明函数存在需要反汇编或恢复后的符号表。

## 已恢复的网络相关符号

target pack 共 259 条符号记录，其中 55 条被封装为贴片函数。与网络驱动直接相关的一组：

| 符号 | 地址 | 原型 | 用途 |
| --- | --- | --- | --- |
| `register_driver` | `0xc1aff60` | `int(const char*, const void*, uint32_t, void*)` | 创建 `/dev/tun` 节点 |
| `unregister_driver` | `0xc1b002c` | `int(const char*)` | 删除节点 |
| `netdev_register` | `0xc1fc214` | `int(void*, int)` | 注册网卡 |
| `netdev_input` | `0xc1fc9f4` | `int(void*, void*, int)` | 收包注入协议栈 |
| `ipv4_input` | `0xc1f95c8` | `int(void*)` | 把 IPv4 包直接交给协议栈 |
| `net_lock` / `net_unlock` | 未公开 | | 网络栈加解锁 |
| `devif_poll` | 未公开 | | 轮询发送 |
| `socket` / `sendto` / `setsockopt` / `read` / `write` / `close` | 未公开 | POSIX 语义 | 模块内直接使用 |
| `heap_malloc` / `heap_zalloc` / `heap_free` / `heap_mallinfo` | 未公开 | | 堆分配 |

写一个 TUN 驱动需要的要素全部在这张表里：

1. `register_driver` 让 `/dev/tun` 存在，解决 `ENOENT`；
2. `netdev_register` 给 TCP/IP 栈一个出口设备，解决「无路由」；
3. `netdev_input`、`ipv4_input` 把 BLE 收到的包注入协议栈；
4. `read`、`write` 对应的 `file_operations` 让 `app_net.c` 能 `open("/dev/tun")` 并读写；
5. `heap_*` 用于缓冲分配。

`app_net.c` 不需要修改。

## 写一个模块

### 最小验证模块

在写完整驱动之前，先验证加载链路。

```c
// hello.c：只证明模块被加载、构造函数被调用
#include <stdint.h>

typedef int (*log_fn)(const char *);
static int klog(const char *s) {
    return ((log_fn)(uintptr_t)0xc130d21)(s);   // 固件日志函数
}

__attribute__((constructor))
static void hello_init(void) {
    klog("[hello] module loaded\n");
}
```

编译：

```bash
arm-none-eabi-gcc -mthumb -mcpu=cortex-m33 -mfloat-abi=soft \
  -Os -fPIC -fno-plt -nostdlib -c hello.c -o hello.o
arm-none-eabi-ld -r -Ttext=0 hello.o -o hello.ko
```

预期结果：执行 `insmod /data/hello.ko hello` 后日志出现 `[hello] module loaded`。

这一步同时验证模块格式、重定位、构造函数发现，以及 `symbol_imports = none` 下的硬编码调用。四者任一失败，后续工作都不会成立。

### TUN 驱动

| 组成 | 内容 | 规模 |
| --- | --- | --- |
| `file_operations` | `open`、`close`、`read`、`write`、`ioctl`、`poll` | 约 150 行 |
| 收发环形缓冲 | 读走 `app_net.c` 写入的包，写回 BLE 收到的包 | 约 150 行 |
| `netdev` 注册 | 填充 `struct netdev_ops` 的 `rmmac` 发送回调 | 约 100 行 |
| `ioctl` 处理 | `TUNSETIFF`、`SIOCGIFMTU`、`SIOCGIFHWADDR` | 约 80 行 |
| 初始化 | `register_driver` 加 `netdev_register` | 约 40 行 |
| 合计 | 精简版，仅支持 TUN 用法 | 500 至 700 行 C |

估算代码体积 3 至 6 KB，运行内存 2 至 6 KB，`.ko` 文件 10 至 20 KB。

## 风险

| 风险 | 说明 | 严重度 |
| --- | --- | --- |
| ABI 未在真机验证 | target pack 标注 `exact 3.101.043 device gate pending` | 高 |
| 地址与版本绑定 | 换固件版本后全部失效 | 中（可重新恢复） |
| `struct netdev` 布局未知 | 无头文件，字段偏移需反汇编推断 | 高 |
| `file_operations` 布局未知 | 同上 | 高 |
| 重启失效 | `persistent_autoload = false` | 中 |
| 模块名规则严格 | 仅允许 `[a-zA-Z0-9_]+` | 低 |
| 崩溃风险 | 内核态错误可能导致死机，模块位于 RAM，重启可恢复 | 中 |
| `netdev_register` 第二参数语义 | 可能是链路层类型，也可能是设备号 | 中 |

`netdev_register(void *dev, int type)` 的 `int` 在 NuttX 不同版本中含义不同，可能是 `lltype`（链路层类型，例如 `NET_LL_ETHERNET`）。传错会注册成功但收发包异常，这类故障最难定位。

## 未决问题

| 问题 | 状态 |
| --- | --- |
| modlib 重定位在 3.101.043 真机能否执行 | 最关键未验证项 |
| `struct netdev` 完整字段布局 | 需反汇编 `netdev_register` 内部 |
| `struct file_operations` 字段顺序 | 需反汇编 `register_driver` 或对照 NuttX 版本 |
| `netdev_register` 第二参数的确切含义 | 未确认 |
| 模块内能否安全创建线程（`pthread_create_internal` 已恢复） | 有符号，未验证 |
| 谁来触发 `insmod` | [Canopus](/native/canopus) 安装器的 Lua 表盘可以 |

## 相关页面

- 模块加载器的具体实现：[Canopus](/native/canopus)、[Chaos](/native/chaos)
- 固件分区与镜像格式：[固件包格式](/firmware/package)
- 系统启动链与文件系统布局：[系统架构](/firmware/architecture)
- 打通网络的完整链路：[网络通路](/protocol/network)
