---
title: QEMU 模拟器
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/DDlhy/Miband-qemu-simulator"
contributors: [miband-dev]
---

# QEMU 模拟器

<StatusBadge status="sourced" verified="2026-10-25" />

本节的核心结论是：社区已经可以在 PC 上通过 QEMU 运行 10 Pro 与 11 NFC 的原厂 AP 固件，显示原厂界面，并接入触摸、传感器与原始 HCI 蓝牙。该模拟器将「修改固件、测试应用」的反馈周期从刷机缩短为重启模拟器，但图形与 NFC 支持仍不完整，账号绑定仍依赖真实的出厂配置。

## 项目

[DDlhy/Miband-qemu-simulator](https://github.com/DDlhy/Miband-qemu-simulator) 为手环的 SoC 与外设补充 QEMU 硬件模型，同一份源码同时支持两个型号。参考固件随仓库以分卷形式提供（单卷小于 25 MB，组装脚本自动校验 SHA256 并合并）。

| 型号 | 参考固件 | 屏幕 |
| --- | --- | --- |
| 小米手环 11 NFC | 4.100.139 | 212 × 520 |
| 小米手环 10 Pro | 3.101.043 | 336 × 480 |

10 Pro 的 336 × 480 这一分辨率此前在机型矩阵中是空值，此处首次有可追溯来源。

## 支持的模拟能力

- 原厂界面：可启动原厂固件，并显示开机动画、语言选择与连接页；
- 触摸：鼠标点击对应触摸操作，拖动对应滑动操作，熄屏后双击可唤醒；
- 传感器：支持电池、温度、充电、加速度、陀螺仪与磁场输入，并提供可拖动的 3D 姿态显示；
- 环境光：两个型号均支持；10 Pro 使用独立光感通道，需先开启自动亮度；
- GNSS（10 Pro）：可调整经纬度、海拔、速度、航向、卫星数与定位有效性；
- 屏幕旋转（10 Pro）：支持 0°、90°、180°、270° 切换，画面与触摸坐标同步；
- 串口与设备工具：支持 BES UART 收发，并提供 DID 与序列号工具页；
- 独立存档：两个型号分别保存运行状态，可从固件与配置重新生成 Flash 镜像。

## 蓝牙与账号绑定

模拟器使用原始 HCI 直连，通过 WinUSB 将 Windows 的蓝牙控制器交给 QEMU 独占。目前验证的控制器为 Intel `8087:0026`；运行期间 Windows 无法同时使用该控制器，其他适配器的兼容性尚未确认。

仓库中的两份 `factory.prop` 为合成演示配置，只能用于离线启动。真实账号绑定需要导入自己的出厂配置，DID、SN 与设备密钥必须匹配；单独改 DID 或序列号不会生成有效身份。这与[BLE 配对鉴权](/platform/protocol/ble)中「密钥由服务端托管」的机制一致：设备身份是绑定的一部分。

## 构建流程

环境为 Windows 10/11 x64，依赖 Git、Python 3.11+、MSYS2 UCRT64 及开发依赖。示例流程如下：

```powershell
# 编译两个型号
.\build.cmd -Toolchain C:\msys64 -Model all

# 组装运行目录
python -B tools/assemble_runtime.py --toolchain C:/msys64 `
  --python-embed C:/inputs/python-3.11.9-embed-amd64.zip `
  --littlefs-wheel C:/inputs/littlefs_python-0.19.0-cp311-cp311-win_amd64.whl `
  --output C:/build/miband-runtime
```

完成构建后，运行输出目录中的 `Launch.cmd` 并选择型号启动。首次使用空存储启动时，需要等待初始化。私有出厂配置可通过 `--factory-band11`、`--factory-band10pro` 导入。

仓库包含三份说明文档：

- `docs/BUILD.md`：完整依赖、参数与镜像生成；
- `docs/MODELS.md`：型号与传感器能力；
- `docs/IDENTITY.md`：设备身份与存档。

## 已知限制

- 图形硬件模型不完整，部分应用、页面与特效会显示异常；
- 传感器模拟针对硬件输入：修改电压不会立即改变电量百分比，PD 输入不等于已计算的心率或血氧，指南针受原厂校准影响；
- 完整 NFC 射频与 eSE 尚未实现；10 Pro 录音功能尚未验收；
- OTA、恢复出厂与长期蓝牙同步仍需验证；
- 当前仅适配已验证的 Intel 控制器。

## 与其他工具的关系

模拟器不能替代真机。它适合验证界面与交互逻辑；涉及传感器融合、功耗、NFC 与固件升级的行为仍需在真机上确认。固件来源与刷写风险见[启动链与救砖](/platform/firmware/recovery)。

## 相关页面

- 手环系统分层：[系统架构](/platform/firmware/architecture)
- 快应用的开发与调试：[开发环境](/quickapp/setup)
- 其他可参考的开源项目：[示例代码](/platform/reference/examples)
