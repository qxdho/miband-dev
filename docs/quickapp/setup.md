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

> **先读这段**：从 Hello World 到打包 `.rpk` 的完整流程，官方文档和[路明笔记](https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/)已经写得很好了。本站**不重复造轮子**，只补三件事：机型差异、可检索的索引、别人没写的坑。

## 你需要什么

| 项 | 说明 |
| --- | --- |
| 操作系统 | **Windows** 最省事（AIoT IDE 官方主要面向 Windows）。macOS/Linux 需要自己折腾，非官方支持。 |
| AIoT IDE | 小米官方快应用 IDE，含模拟器。官网：<https://iot.mi.com/vela/quickapp/> |
| 一台真机 | 可选但强烈建议。没有真机，所有结论只能标「据来源」。 |
| 一台安卓手机 | 安装/调试第三方快应用通常会用到手机端工具，具体方式随固件版本变化。 |

## 最短路径

1. **装 AIoT IDE**：从 <https://iot.mi.com/vela/quickapp/> 下载安装。当前版本约 v1.7.0，自带模拟器。
2. **新建工程**：选快应用模板，填包名（注意反向域名格式）。
3. **写页面**：`manifest.json` 配路由和权限，页面用类 Vue 的 `template` / `style` / `script`。
4. **模拟器预览**：先在 IDE 自带模拟器里把布局跑通。**注意**模拟器分辨率不一定等于你的手环。
5. **打包**：生成 `.rpk`。
6. **装真机**：按机型/固件版本的方式安装。具体步骤随固件版本变化，后续单独成页。

## 工程结构（最小认知）

```text
my-quickapp/
├─ manifest.json      # 应用名、包名、版本、路由、权限、屏幕配置
├─ src/
│  ├─ app.ux          # 应用入口、全局生命周期
│  └─ pages/
│     └─ index/
│        └─ index.ux  # 页面：template + style + script
└─ package.json
```

`manifest.json` 里最常改的几项：

- `package`：包名，全局唯一，反向域名写法。
- `versionName` / `versionCode`：版本号，安装时会校验。
- `router.pages`：页面路径与入口页。
- `display`：屏幕适配相关（不同机型分辨率不同，见[矩阵](/start/models)）。
- `permissions` / `features`：要用 `@service.health` 等能力时必须声明。

## 屏幕适配先看矩阵

手环屏幕差异极大：192×490、212×520、480×336……圆角从 48px 到接近胶囊形都有。**不要写死像素**，先用相对单位和安全区把布局撑住，再去真机上调。

见 [机型能力矩阵](/start/models)。

## 官方与社区资料

- 官方 API 参考：<https://iot.mi.com/vela/quickapp/>
- openvela 文档（通用 Vela、模拟器、VelaJS MCP）：<https://github.com/open-vela/docs>
- 路明笔记：从零写一个 Vela 快应用（含分辨率/圆角表）：<https://www.luming.cool/posts/2025/08/build-a-quick-app-for-vela-devices/>

## 下一步

- 装不上、跑不起来？看 [快应用十大坑](/quickapp/pitfalls)。
- 不确定你的机型支不支持？看 [机型能力矩阵](/start/models)。
