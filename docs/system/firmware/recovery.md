---
title: 启动链、恢复模式与救砖
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://habr.com/ru/articles/1066280/"
contributors: [miband-dev]
---

# 启动链、恢复模式与救砖

<StatusBadge status="sourced" verified="2026-10-25" />

::: danger 风险提示
拆机读取、改写引导分区与刷写镜像都可能导致设备永久损坏。以下内容整理自公开研究，作者未在真机上复现全部步骤。任何操作前先完成整片备份，并确认自己能够恢复。
:::

结论：10 Pro 的启动分三级引导（BL → BL2 → AP），BL2 里的 `rcS` 脚本决定进系统、恢复模式还是工厂模式。官方恢复机制只提供「格式化数据分区」这一个动作，遇到 AP 自身崩溃时会陷入重启循环；社区的做法是往资源分区塞一个最小恢复 OTA，再改写 BL2 的启动脚本。彻底救砖的最后手段是拆下 SPI NAND 读整片镜像。

## 硬件底子

| 项 | 10 Pro |
| --- | --- |
| SoC | BES2700iMP（内部标识 BEST1503 系列），Cortex-M33 |
| 片内 flash | 16 Mb |
| PSRAM | 约 16 Mb |
| 外挂存储 | SPI NAND，Pro 512 Mb，普通版 256 Mb |
| 系统 | VelaOS（NuttX + 应用框架） |

以上来自 Habr 的拆解分析。外挂 NAND 的具体型号由另一份拆机实录确认：Dosilicon **DS35M4GB-IB**，4 Gbit、1.8V、WSON-8 封装。它的参数决定了读取方式：

| 参数 | 值 |
| --- | --- |
| 组织 | 512M×8 bit 主区 + 32M×8 bit spare，合计 544 MiB |
| 页 / 块 | (2048+128) B/页，64 页/块，4096 块 |
| ECC | 片内 8-bit ECC，默认开启 |
| 接口 | 标准 / Dual / Quad SPI，1.8V 域 |
| 常用命令 | `9Fh` READ ID、`13h` PAGE READ、`03h` READ FROM CACHE、`D8h` BLOCK ERASE |

## 分区布局

| 节点 | 挂载点 | 文件系统 | 内容 |
| --- | --- | --- | --- |
| `/dev/bl` | — | — | 一级引导，工厂写入，一般不由 OTA 更新 |
| `/dev/bl2` | — | — | 二级引导，`ota.sh` 写入 |
| `/dev/ap` | — | — | 应用处理器镜像，`ota.sh` 写入 |
| `/dev/resource` | `/resource` | ROMFS | 系统资源，10 Pro 约 171 MB |
| `/dev/nand_data` | `/data` | YAFFS2 | 用户数据：应用、表盘、健康记录、日志 |
| `/dev/nand_nv` | `/wasted_nv` | YAFFS2 | BL2 挂载的持久区 |
| `/dev/nv` | `/misc` | littlefs | NOR 分区，设备配置 |
| `/dev/mode` | `/mode` | littlefs | NOR 分区，模式数据 |

`/dev/nv` 与 `/dev/mode` 位于片内 NOR，拆 NAND 读不到；`/data` 才是 YAFFS2 的主战场。分区结构在[固件包格式](/system/firmware/package)中有另一份来自固件字节的对照。

## 三级启动

上电后 BL 做基础初始化、读启动标志并设置 `setprop` 参数，然后交给 BL2；BL2 根据复位原因选择加载 AP、恢复模式或工厂模式。

复位原因（`resetcause`）对应 `reboot <param>` 的参数：

| resetcause | 触发 | BL2 行为 |
| --- | --- | --- |
| `normal` | 正常开机 | 启动 AP |
| `cpu_soft_reset(bootloader)` | `reboot bootloader` | 擦除 `vela_*` 分区后重启，用于重刷 |
| `cpu_soft_reset(restore)` | `reboot restore` | 执行 `recovery_reset.sh` 格式化 `/data`，再启动 AP |
| `cpu_soft_reset(factory)` | `reboot factory` / 未完成工厂流程 | 启动工厂模式 |
| `cpu_soft_reset(recovery)` | 带 OTA 包启动 | 校验并安装 `/data/ota.zip` |

BL2 的 `rcS` 是整条链路的决策中心，逻辑可概括为：

```sh
resetcause=$(resetcause)
# restore / factory：清数据
[ "$resetcause" = "cpu_soft_reset(restore)" ] && sh /etc/recovery_reset.sh
[ "$resetcause" = "cpu_soft_reset(factory)" ] && sh /etc/recovery_reset.sh

# 有 OTA 包就装
if [ -e /data/ota.zip ]; then
  mount -t zipfs -o /data/ota.zip /ota
  # 连续失败超过 5 次则放弃并删除
  if [ "$resetcause" = "cpu_soft_reset(recovery)" ] || [ "$ota_in_progress" = "1" ]; then
    avb_verify /ota/vela_ota.bin /etc/key.avb || { rm /data/ota.zip; reboot; }
    cp -f /ota/vela_ota.bin /data/vela_ota.bin
    boot /data/vela_ota.bin
  fi
fi

# 启动失败后进入恢复 ELF
if [ "$boot_reset" = "1" ]; then
  mount -t romfs /dev/resource /resource
  boot /resource/prebuild/vela_recovery.bin
fi

# 工厂流程未完成则进工厂模式
[ "$factory_finished" != "1" ] && boot /resource/prebuild/vela_factory.bin

# 默认启动 AP
boot
```

关键点：

- 每个阶段都是独立的 NuttX 构建，各自内嵌一份 `/etc` ROMFS，包含 `init.d/rcS` 与 `rc.sysinit`；
- OTA 包内的 `vela_ota.bin` 需要 `/etc/key.avb` 做 AVB 签名校验，校验不过会删除升级包并重启；
- `ota.sh` 只写 BL2、AP 与资源分区，一级引导不在升级范围内；
- 恢复模式本身是一个 ELF 程序（`vela_recovery.bin`），从资源分区加载。

## 官方恢复的缺陷

AP 启动失败时，BL2 会加载 `vela_recovery.bin`，屏幕上只有一个「重置数据」按钮。按下后执行 `reboot restore`，`recovery_reset.sh` 强制格式化 `/data`，然后重新启动 AP。

如果崩溃的原因是 AP 本身（固件损坏、资源不匹配），格式化数据不会修复问题：系统再次崩溃，再次进入恢复页，再次重置，形成循环重启。社区把这一现象称为「恢复死循环」。

## 社区修复思路

官方 OTA 包里其实带了一个最小恢复包 `fac_to_user.zip`，它只含让系统跑起来的最小 AP 与资源。修复分两步（来源为 Habr 文章的实践）：

1. 把 `fac_to_user.zip` 打进资源分区的 ROMFS（`vela_resource.bin`），使其在 `/resource/prebuild/` 下可见；
2. 改写 `vela_bl2.bin` 里的 `rcS`：在 `restore` 分支中先把 `fac_to_user.zip` 复制到 `/data/ota.zip`，再走标准 OTA 流程安装。

改写后的 `restore` 分支大致为：

```sh
if [ "$resetcause" = "cpu_soft_reset(restore)" ]; then
  mount -t romfs /dev/resource /resource
  cp /resource/prebuild/fac_to_user.zip /data/ota.zip
  sh /etc/recovery_reset.sh
  # 后续由标准 OTA 分支接管：校验 → 复制 → boot vela_ota.bin
fi
```

这样「重置数据」会变成「重置并安装最小系统」，设备能恢复可用状态。BL2 镜像也在官方 OTA 包内，提取不需要额外手段。

::: warning
改写引导脚本相当于自制固件，校验和、签名与分区布局任一处不匹配都会变砖。该方案为第三方研究结论，本站未复现。
:::

## 拆机读取整片镜像

设备彻底无法启动时的最后手段：拆下 SPI NAND，用外部 SPI 主机读整片 raw 镜像，再离线还原文件系统。公开实录（2026-10）完整记录了 10 Pro 的一次操作：

- 样本是一台 AP 刷写失败变砖的 10 Pro（代号 p67）；
- 读取平台为 Radxa Zero 3W（RK3566）的 SPI3，1.8V 供电，SI/SO 各串 2.2 kΩ 做 1.8V/3.3V 适配；
- 读取结果 570,425,344 字节（544 MiB），与数据手册容量一致；
- 用 spare 区的 BCH ECC 纠正位错误后，解析出四个镜像与完整离线 rootfs。

还原出的镜像与版本：

| 镜像 | 构建版本 | 说明 |
| --- | --- | --- |
| `vela_ap.bin` | 3.101.036 | AP 固件，含内嵌 `/etc` ROMFS |
| `vela_ota.bin` | 3.101.043 | OTA 升级包 |
| `vela_factory.bin` | 3.101.043 | 工厂模式 |
| `vela_recovery.bin` | — | 恢复模式 |

最终 rootfs 共 5959 个文件、219,512,486 字节，其中 `/resource` 5814 个、`/data` 139 个；`/dev/nv`、`/dev/mode`（NOR）与 BL2 完整镜像未取得。原始镜像与还原产物在 [DDlhy/Miband10pro-firmware-extraction](https://github.com/DDlhy/Miband10pro-firmware-extraction) 以 MIT 许可发布，固件内容版权仍归厂商。

::: warning
WSON-8 焊盘间距小，拆焊与飞线需要热风枪与显微设备；1.8V 域直接接 3.3V GPIO 会损坏芯片。没有把握时不要动硬件。
:::

## 路径选择

| 症状 | 优先路径 |
| --- | --- |
| 系统可启动，只是数据异常 | `reboot restore` 格式化 `/data` |
| 系统可启动，需要重刷 | 官方 App 升级，或 `reboot bootloader` 后经 OTA 重刷 |
| 卡在恢复页循环重启 | 社区方案：替换 BL2 脚本 + 最小恢复 OTA |
| 完全无反应、无法进任何模式 | 拆机读 SPI NAND，离线修复或换片 |

## 未决问题

| 问题 | 状态 |
| --- | --- |
| 改写 BL2 后的 AVB 校验如何处理 | 待定，原文未展开 |
| 普通版（非 Pro）的 NAND 型号与容量 | 待定，仅知 256 Mb |
| `fac_to_user.zip` 是否适用于其他固件版本 | 待定，需按版本核对 |
| NOR 分区（`/dev/nv`、`/dev/mode`）的读取方法 | 待定，公开实录未取得 |

## 相关页面

- 镜像容器与地址换算：[固件包格式](/system/firmware/package)
- 启动链在系统层的对应位置：[系统架构](/system/firmware/architecture)
- 在 PC 上运行原厂固件：[QEMU 模拟器](/refs/emulator)
- BLE 配对与鉴权：[BLE 协议](/refs/ble)
