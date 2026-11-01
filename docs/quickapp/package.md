---
title: 快应用打包方式
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://iot.mi.com/vela/quickapp/zh/tools/"
contributors: [miband-dev]
---

# 快应用打包方式

<StatusBadge status="sourced" verified="2026-11-01" />

快应用最终产物是 `.rpk`。官方工具链负责编译、打包与安装；本站只补充容易出错的检查点。

## 打包流程

1. 在 AIoT IDE 中打开工程，确认 `manifest.json` 的应用标识与版本；
2. 选择目标设备或模拟器；
3. 执行构建，生成 `.rpk`；
4. 通过 IDE 或应用商店安装到设备；
5. 在真机上验证权限、网络与屏幕适配。

具体菜单与命令以官方[工具文档](https://iot.mi.com/vela/quickapp/zh/tools/)为准。

## 打包前检查

- 应用标识是否与已安装版本冲突；
- 版本号是否递增；
- 权限是否与代码实际调用一致；
- 是否误把调试日志、测试 key 打进包；
- 屏幕配置是否覆盖目标机型。

## 安装失败排查

| 现象 | 可能原因 |
| --- | --- |
| 安装被拒绝 | 标识冲突、签名 / 来源限制、系统版本不匹配 |
| 安装成功但打不开 | 入口页路径错误、运行时异常 |
| 权限相关 API 失败 | 未声明权限或固件不支持 |
| 网络请求失败 | 手机侧代理 / TUN 未就绪，见[网络通路](/platform/protocol/network) |

## 相关页面

- [快应用介绍](/quickapp/)
- [工程结构](/quickapp/structure)
- [能力](/quickapp/capabilities)
- [常见问题](/quickapp/pitfalls)
