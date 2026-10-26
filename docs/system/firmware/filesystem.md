---
title: 设备文件系统
models: [band10pro]
firmware: "unknown"
verified: 2026-10-26
status: tested
contributors: [miband-dev]
---

# 设备文件系统

<StatusBadge status="tested" verified="2026-10-26" />

这一页来自一台小米手环 10 Pro 的完整目录清单：2026-10-26 在设备上递归列出全部挂载点与文件，共 **1,053 个目录、9,562 个文件**。清单只记录路径与类型，没有读取文件内容。设备序列号等可识别信息在本文中已替换为占位符。

它回答一个此前只能靠固件推断的问题：**设备真正运行时，哪些目录存在、各放什么、和文档里的模型差多少**。

## 总览

顶层只有 11 个目录，没有 `/bin`、`/lib`、`/usr`、`/system`、`/ota`、`/factory`，也没有独立的根文件系统分区，属于典型的 NuttX 扁平文件系统。

| 路径 | 文件数 | 子目录数 | 角色 |
| --- | ---: | ---: | --- |
| `/resource` | 5,814 | 241 | 只读资源分区：内置应用、表盘、字体、马达波形、固件 |
| `/data` | 3,069 | 699 | 可写用户数据：快应用、配置、日志、自定义模块 |
| `/proc` | 417 | 91 | 进程与内核状态（58 个 PID 快照） |
| `/dev` | 156 | 3 | 设备节点，含 114 个 uORB 主题 |
| `/var` | 49 | 4 | 运行时 socket 与消息队列 |
| `/tmp` | 40 | 2 | 运行时属性库与临时字体 |
| `/etc` | 8 | 3 | 系统配置、启动脚本、DFX |
| `/misc` | 4 | 1 | `factory.prop` 与备份 |
| `/mode` | 4 | 1 | `app_nv.prop` 与备份 |
| `/canopus` | 1 | 1 | 仅一个 `install` 文件 |
| `/log` | 0 | 2 | 空目录（`/log/gps`） |

文件类型分布能说明资源形态：

| 扩展名 | 数量 | 典型位置 |
| --- | ---: | --- |
| `.bin` | 4,915 | `/resource/app`、`/resource/watchface`、马达波形、固件 |
| `.png` | 1,741 | 表盘预览、工厂测试图、应用资源 |
| 无扩展名 | 1,309 | 配置、脚本、`/proc`、`/dev` 节点 |
| `.jpg` | 772 | 表盘与运动资源 |
| `.jsc` | 285 | 快应用编译产物 |
| `.json` | 202 | 快应用清单、资源索引 |
| `.txt` | 78 | 版本说明、校准文本 |
| `.db` | 59 | 快应用与系统数据库 |

## `/resource`：只读资源分区

`/resource` 与固件包里的资源分区对应，挂载为只读。48 个内置应用的资源都在这里，每个应用一个目录，内容是 LVGL 可直接加载的二进制图片/字体，而不是 PNG。资源最多的几组：

| 目录 | 文件数 | 内容 |
| --- | ---: | --- |
| `app/sports` | 1,614 | 运动类型图标与逐帧动画 |
| `app/breath` | 797 | 呼吸训练动画帧 |
| `system/whatsapp` | 719 | WhatsApp 表情位图，按表情编号命名 |
| `misc/zoneinfo` | 604 | 时区数据库 |
| `app/weather` | 321 | 天气图标与背景 |
| `app/settings` | 143 | 设置页图标与开关 |
| `app/activities` | 104 | 活动圆环与表盘小组件 |
| `app/common` | 91 | 通用按钮、阴影、确认/取消 |
| `app/nfccard` | 88 | 公交卡与门禁卡面（北京、重庆、大连等） |
| `app/launcher` | 52 | 应用列表图标 |

其余关键子目录：

| 路径 | 内容 |
| --- | --- |
| `resource/watchface/` | 11 个已安装表盘（数字 ID，每个一个 `resource.bin`）+ `aod/` 下 6 套息屏资源 |
| `resource/font/` | 13 个字体：MiSans 系列（含 `-All` 全字库与 SportVF 可变字重）、BaiJamjuree |
| `resource/motor/` | 20 个马达波形：`incoming`、`alarm`、`clock`、`find`、`breath1`、雨声/风声类通知等 |
| `resource/system/startup/` | 24 帧开机动画（`0.bin`–`22.bin` + `hyperos.bin`） |
| `resource/system/ota/` | 升级提示图：`updating_check.bin`、`fail.bin`、`reminder.bin` |
| `resource/nfc/` | 5 个 NFC 固件/脚本：`sn100_6A.bin`、`NXP_01_10_6E.bin`、`THN31_FW_D1_1C_00.bin`、`install_alipay.bin`、`delete_alipay.bin` |
| `resource/gps/` | 两套 GNSS 芯片固件：`ag3335m_firmware/`（8 个文件，含 bootloader 与分区表）与 `cc0257b_firmware/`（4 个 `.pkg`） |
| `resource/tp/` | 8 套触摸固件：汇顶、敦泰 TMA525 多个版本、GTW631/GTW623、Zinitix |
| `resource/factory/` | 11 张工厂测试图：纯色、灰阶、十字、渐变、色条 |
| `resource/prebuild/` | `vela_factory.bin` 与 `vela_recovery.bin`，与[启动链与救砖](/system/firmware/recovery)中的描述一致 |
| `resource/recovery/recovery/` | 28 个恢复模式进度图与文案（中/英/繁）及 `recovery.conf` |
| `resource/i18n/` | `en_US`、`zh_CN`、`zh_TW`，各一个 `LC_MESSAGES/messages.mo` |
| `resource/misc/` | `ssl/curl/ca-certificates.crt`、`spec_config.json`、跑步课程与热身 CSV、`game_mode/` |
| `resource/version/` | 空目录 |

**多套触摸与 GNSS 固件**说明同一份系统镜像要覆盖多个硬件批次：屏幕总成、触控 IC、GPS 芯片都可能不同。刷机或移植时不能假定只有一种外设。

## `/data`：可写数据

`/data` 共 79 个顶层条目，其中大量是第三方游戏的存档：`minecraft03-*`、`minecraft04-worlds-*.bin`、`doom_save.txt`、`doom_act.txt`、`mcm3-*.bin`、`minecraft10-*.elf`。文件名的 `s<数字>` 是设备序列号，已脱敏。

### 快应用

`/data/app/` 下有 **18 个第三方快应用**，形态统一：

```text
/data/app/<包名>/
├─ manifest.json         # 应用清单
├─ manifest-watch.json   # 手表侧清单
├─ config-watch.json     # 手表侧配置
├─ app.jsc               # 编译后的 JS 字节码
├─ pages/                # 页面
├─ common/               # 公共资源
├─ i18n/                 # 文案
└─ META-INF/             # 签名/元数据
```

已安装的包名包括 `icu.ccicc.jslab`（JSLab）、`com.bandbbs.ebook.plus`（阅读）、`com.hazenotea.cardbox.watch`、`com.hazenotea.chessbox.watch`、`com.hazenotea.pvz.watch`、`com.openblack.mahjong-next`、`com.arknights.spoor.gacha`、`com.stocktycoon.bluebridge`、`me.cjack.b2048n`、`moye.vela.calculator`、`com.yzf.daymatter`、`com.xsli.wallpaperlooper`、`com.ygame.dwct`、`com.Dreamqiu.9way`、`com.SkillMan.Xiaomi-Vela.watch.happy-match`、`com.lafs.diudie.dlyccc`、`com.lst.bandtotp`、`com.shell.liangyi`。

辅助目录：

| 路径 | 内容 |
| --- | --- |
| `/data/app/system/` | `system.db`、`install_info_v1.db`、`uninstall_app.db`——安装/卸载记录 |
| `/data/app/watchface/` | `watchface.db`、`watchface_list.json`（含 `.bak`）、`market/` 19 个表盘目录、`builtin/aod/` 6 套 |
| `/data/quickapp/system/` | 37 个包名目录，其中 35 个各有一个 `usr.db`（快应用键值存储），2 个为空；包含已卸载应用留下的库 |
| `/data/files/` | 8 个包名目录，130 个文件——应用沙箱文件 |
| `/data/mass/` | 9 个包名目录，基本为空，另有 `tmp/`——大文件/批量存储区 |
| `/data/cache/` | 4 个包名目录 |

`/data/apps.json` 与 `/data/apps.json_hide` 是应用注册表与隐藏列表，对应[应用隐藏与免重启](/system/native/app-hiding)里的机制。

### 自定义原生层

| 路径 | 内容 |
| --- | --- |
| `/data/canopus/` | `registry.bin`、`boot.bin`、`stage1.bin`、`stage2.bin`、`canopus_supervisor.bin`、`manager_icon.bin`、Lyra 播放控制 5 个 `.bin`、`autostart.log` |
| `/data/chaos/` | `stage1.bin`、`stage3.bin`、`boot.bin`、`sup.ko`、`settings.cfg`、`appmgr_*.bin/cfg`、`lvgl_dump.bin`、图标与字体、`chaos.log` |
| `/data/shellpp-ii/` | `shellpp_ii.bin`、`cmds.bin`、图标与设置图标 |
| `/data/bluenlink/` | `startup.bin`、`session.bin`、`icon.bin` |
| `/data/rc.d/` | `autorun.json`、`.autorun.on`、`.autorun.log`、`canopus.sh`、`chaos.sh` |
| `/data/10pro.autorun/` | `manager.log`、`apblk.bin` |

这条链解释了第三方模块的开机自启：`/data/rc.d/autorun.json` 决定要启动什么，`.autorun.on` 是开关，`canopus.sh` / `chaos.sh` 是入口，`/data/10pro.autorun/manager.log` 记录执行结果。`/canopus/install` 则像是一个一次性安装标记。

### 数据、日志与 OTA

| 路径 | 内容 |
| --- | --- |
| `/data/offlinelog/` | `log1.gz`–`log8.gz`（8 份，不是文档早先写的 6 份）、`power/tdp0.log` |
| `/data/dfx/note/` | 8 个诊断事件，`.ev` / `.ev.gz` |
| `/data/vela_ota.bin` | OTA 暂存镜像 |
| `/data/recovery/recovery/` | 28 个恢复进度图与文案 |
| `/data/fitness/` | 睡眠 `hrv/`、`daily/p0`、`p16`、`p32`、`sport/p0`、`p16`、`p32`、`highlvl`、`view/`、`research/` |
| `/data/gps/` | `airoha/` 下 3 个 EPO 星历文件；`c2t/`、`log/` 为空 |
| `/data/tmp.log`、`sc5.log`、`shellpp-ii-supervisor.log` | 运行日志 |
| `/data/persist.db`、`/data/system/framework.db` | 持久化与框架数据库 |

### 表盘市场里的原生载荷

`/data/app/watchface/market/` 下 19 个目录，大多只有一个 `resource.bin`；但 `minecraft-native/` 里有：

```text
/data/app/watchface/market/minecraft-native/
├─ resource.bin
├─ preview.bin
├─ small.bin
├─ config.json
└─ lua/
   ├─ main.lua
   ├─ game.elf
   └─ grass.png
```

表盘目录里出现 `game.elf` 说明**表盘市场目录不是纯资源目录**：Lua 脚本可以拉起原生 ELF。这与 `/data/minecraft10-*.elf` 的存在互相印证——设备允许在数据区运行自带 ELF 的第三方程序。

## 系统配置：`/etc`、`/misc`、`/mode`

| 路径 | 内容 |
| --- | --- |
| `/etc/build.prop` | 构建属性 |
| `/etc/miwear_product.json` | 产品定义 |
| `/etc/font_config.json` | 字体映射 |
| `/etc/md5test.txt` | 校验清单 |
| `/etc/init.d/rc.sysinit`、`/etc/init.d/rcS` | 启动脚本 |
| `/etc/dfx/` | `dfxd_setup.cfg`、`instance_MiWearDFX.cfg` |
| `/misc/factory.prop`、`factory.prop.bkup` | 出厂配置，含设备身份 |
| `/mode/app_nv.prop`、`app_nv.prop.bkup` | 应用 NV 配置 |

`/misc` 与 `/mode` 都带 `.bkup` 副本，说明写入前会先备份。这与 QEMU 模拟器需要导入 `factory.prop` 才能完成账号绑定的机制一致：设备身份不在应用里，而在这些属性文件中。

`/tmp/db/` 是 36 个运行时键值文件，键名分三类：

- `product.*`：`pid`、`model`、`device_model`、`device_name`；
- `ro.factory.*`：`finished`、`sku`、`psn`、`bsn`、`did`、`key`、`mac_bt`、`alipay_install`、`nfc_cplc`、各类传感器校准、`gnss.chip`；
- `ro.build.*` / `ro.sf.*` / `ro.product.device.*`：构建版本、屏幕密度、设备类型与屏幕形状。

这些文件是只读属性的持久化缓存，`ro.factory.key`、`ro.factory.did` 一类内容属于设备密钥，不应外传。

## 运行时：`/dev`、`/proc`、`/var`、`/tmp`

`/dev` 有 42 个节点，与存储和调试相关的：

```text
/dev/bes_nand   /dev/bes_flash  /dev/nand_data  /dev/nand_nv
/dev/bl2        /dev/ap         /dev/resource   /dev/nv
/dev/mode       /dev/canopus    /dev/chaos      /dev/coredump
/dev/ttyS0      /dev/ttyS1      /dev/ttyBT0     /dev/ttyGNSS0
/dev/watchdog0  /dev/rtc0       /dev/lra0       /dev/fb0
/dev/nfc_sn100  /dev/i2c0/2/3/5/6
```

注意清单里**没有** `/dev/bl`、`/dev/ota`、`/dev/factory`、`/dev/efuse`、`/dev/otp`，而[系统架构](/system/firmware/architecture)的分区表按 9 Pro 的 bring-up 列出了它们。10 Pro 实际暴露的是 `bes_nand`、`nand_data`、`nand_nv` 与 `bl2`、`ap`、`resource`。

`/dev/uorb/` 有 114 个主题，可按前缀归类：

- `algo_*`：心率、血氧、HRV、睡眠、压力、计步、活动识别、佩戴角度等算法输出；
- `sensor_*`：加速度、陀螺仪、地磁、气压、光感、PPG、GNSS 原始数据；
- `sport_*`：运动状态、轨迹、跑步位置、滑雪、训练负荷；
- `daily_*`、`event_*`、`gnss_*`、`bt_*`、`screen_status`、`battery_state` 等系统事件。

`/var/run/` 有 30 个 socket 命名端点：`bt:bluetooth*`、`btserver*`、`btspp-srv-*`、`kvdbd*`、`socket_server*`、`socketpair*`；`/var/mqueue/` 有 19 个消息队列：`c2s_queue_*` / `s2c_queue_*`（apps、algo、capture、miconnect）、`nfc_task_msg`、`touch_msg_mq`、`ui_data_msg`、`sih6889_mq` 等。

`/tmp` 只有 4 个 MiSans 字体与 `db/`。字体同时出现在 `/resource/font` 与 `/tmp`，说明运行时会先把字体复制到可写区再加载。

## 与现有文档的差异

| 文档原表述 | 实机情况 |
| --- | --- |
| 系统资源在 `/system/watchface/<id>/resource.bin` | 实际在 `/resource/watchface/<id>/resource.bin`，另有 `/data/app/watchface/` 管理数据库与市场 |
| `/ota/` 是升级包暂存 | 根下无 `/ota`，OTA 镜像在 `/data/vela_ota.bin`，进度图在 `/resource/system/ota/` |
| `/data/offlinelog/` 有 `log1.gz`–`log6.gz` | 实机有 `log1.gz`–`log8.gz` |
| `/dev` 含 `bl`、`ota`、`factory`、`efuse` | 实机没有这些节点，改为 `bes_nand`、`nand_data`、`nand_nv` |

这些差异来自 9 Pro 与 10 Pro 的 bring-up 不同，不能直接套用；页面后续应以 10 Pro 实机为准，9 Pro 结论单独标注。

## 安全与隐私提示

- 清单中的设备序列号出现在游戏存档文件名里，公开文档时应替换为占位符；`/tmp/db/ro.factory.*` 包含 DID、MAC 与 key，属于设备密钥，不要导出内容。
- 表盘市场目录允许 `game.elf` 与 Lua 脚本，意味着**安装一个表盘就可能执行原生代码**；从第三方来源安装表盘前应确认其目录结构。
- `/data/rc.d` 与 `/data/10pro.autorun` 是开机自启入口，清理第三方模块时要同时检查这两处，否则重启后仍会加载。

## 相关页面

- 分区与存储结构：[系统架构](/system/firmware/architecture)
- 固件容器格式：[固件包格式](/system/firmware/package)
- 恢复模式与 SPI NAND：[启动链与救砖](/system/firmware/recovery)
- 快应用安装形态：[快应用运行时](/apps/quickapp/runtime)
- 应用隐藏机制：[应用隐藏与免重启](/system/native/app-hiding)
