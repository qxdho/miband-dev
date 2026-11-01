---
title: 快应用能力
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://iot.mi.com/vela/quickapp/zh/features/"
contributors: [miband-dev]
---

# 快应用能力

<StatusBadge status="sourced" verified="2026-11-01" />

快应用的能力由 AiotJS 运行时与固件暴露的模块决定。官方文档列出的接口为通用接口，其能否在具体设备上使用取决于机型、固件版本与权限声明。

## 能力分类

| 类别 | 典型接口 | 可用性 |
| --- | --- | --- |
| 界面 | 页面、组件、路由、动画 | 官方支持，注意屏幕适配 |
| 健康 | 心率、步数、睡眠 | 取决于权限与固件 |
| 传感器 | 加速度计、陀螺仪等 | 取决于机型与权限 |
| 通知 | 本地通知、消息展示 | 取决于系统版本 |
| 存储 | 键值存储、文件（受限） | 以官方接口为准 |
| 振动 | 马达控制 | 多数机型可用 |
| 网络 | `fetch` / HTTP | 需要手机侧通路，见[网络通路](/platform/protocol/network) |
| AI | 语音 / 模型接口 | 机型相关，未系统验证 |

完整接口列表见官方 [JS 接口文档](https://iot.mi.com/vela/quickapp/zh/features/)。

## 不可用能力

- 直接访问文件系统、加载 `.so` / `.ko`；
- 修改系统行为、绕过权限；
- 在后台长期常驻（以系统策略为准）。

这些属于[原生应用](/native/)或[平台](/platform/)层。

## 实测注意事项

- 接口存在并不等于可用，应先做存在性判断，再以 `try/catch` 包裹调用；
- 权限未声明时，失败可能没有明确错误码；
- `fetch` 的失败模式与手机侧代理强相关，见[运行时与 fetch](/quickapp/runtime)；
- 社区失败案例汇总在[常见问题](/quickapp/pitfalls)。

## 相关页面

- [工程结构](/quickapp/structure)
- [打包方式](/quickapp/package)
- [快应用介绍](/quickapp/)
