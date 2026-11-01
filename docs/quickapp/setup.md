---
title: 快应用环境搭建
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-24
status: sourced
source: "https://iot.mi.com/vela/quickapp/"
contributors: [miband-dev]
---

# 快应用环境搭建

<StatusBadge status="sourced" verified="2026-10-24" />

本章从安装开发工具开始，到生成可安装的 `.rpk` 结束。机型差异、索引与失败案例是本页的补充内容；从 Hello World 到打包的基础流程以官方文档为准。

## 环境要求

| 项 | 说明 |
| --- | --- |
| 操作系统 | Windows。AIoT IDE 官方主要面向 Windows，macOS 与 Linux 需自行配置，不受官方支持 |
| AIoT IDE | 小米官方快应用 IDE，含模拟器。下载地址：<https://iot.mi.com/vela/quickapp/> |
| 真机 | 可选，建议准备。没有真机时相关结论只能标为 `sourced` |
| 安卓手机 | 安装与调试第三方快应用通常需要手机端工具，具体方式随固件版本变化 |

## 操作步骤

1. **安装 AIoT IDE**：从 <https://iot.mi.com/vela/quickapp/> 下载并安装，自带模拟器。
2. **新建工程**：选择快应用模板，填写包名，采用反向域名格式。
3. **编写页面**：在 `manifest.json` 中配置路由与权限，页面使用 `template` / `style` / `script` 结构。
4. **模拟器预览**：在 IDE 自带模拟器中调通布局。模拟器分辨率不一定等于目标机型分辨率。
5. **打包**：生成 `.rpk`。
6. **安装到真机**：安装方式随机型与固件版本变化，后续单独成页。

## 工程结构

```text
my-quickapp/
├─ manifest.json      # 应用名、包名、版本、路由、权限、屏幕配置
├─ src/
│  ├─ app.ux          # 应用入口与全局生命周期
│  └─ pages/
│     └─ index/
│        └─ index.ux  # 页面：template + style + script
└─ package.json
```

`manifest.json` 中常用的字段：

| 字段 | 作用 |
| --- | --- |
| `package` | 包名，全局唯一，反向域名写法 |
| `versionName` / `versionCode` | 版本号，安装时校验 |
| `router.pages` | 页面路径与入口页 |
| `display` | 屏幕适配相关配置，各机型分辨率不同，见[机型能力矩阵](/start/models) |
| `permissions` / `features` | 使用 `@service.health` 等能力时必须声明 |

## 屏幕适配

各机型屏幕参数差异明显：192×490、212×520、480×336，圆角从 48px 到接近胶囊形。布局使用相对单位并预留安全区，避免写死像素；适配目标以[机型能力矩阵](/start/models)中的 `screen` 与 `radius` 字段为准。

## 参考资料

- 官方 API 参考：<https://iot.mi.com/vela/quickapp/>
- openvela 文档（Vela 通用部分、模拟器）：<https://github.com/open-vela/docs>
- 从零编写 Vela 快应用，含分辨率与圆角表：<https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/>

## 相关页面

- 安装或运行失败：[常见问题](/quickapp/pitfalls)
- 机型支持情况：[机型能力矩阵](/start/models)
