---
title: 快应用工程结构
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://iot.mi.com/vela/quickapp/zh/guide/"
contributors: [miband-dev]
---

# 快应用工程结构

<StatusBadge status="sourced" verified="2026-11-01" />

快应用工程的最小结构由 `manifest.json`、应用入口与页面目录组成。具体字段以官方教程为准，本页只记录与机型适配相关的部分。

## 最小结构

```text
my-app/
├── manifest.json      # 应用标识、版本、权限、屏幕配置
└── src/
    ├── app.ux         # 应用入口
    └── pages/
        └── index/
            └── index.ux
```

## `manifest.json`

需要重点核对的字段如下。

| 字段 | 作用 | 常见问题 |
| --- | --- | --- |
| 应用标识 / 版本 | 安装与升级识别 | 重复标识导致覆盖安装 |
| 权限声明 | 健康、传感器、通知等 | 未声明时 API 直接失败 |
| 屏幕配置 | 分辨率、圆角、安全区 | 与目标机型不符导致布局错位 |
| 路由 / 页面 | 入口页与页面栈 | 路径大小写不一致 |

不同机型的屏幕参数见[机型能力矩阵](/start/models)。

## 页面与组件

页面使用 `template` / `style` / `script` 三段结构。组件、路由与动画的完整列表见官方[组件文档](https://iot.mi.com/vela/quickapp/zh/components/)。

## 适配要点

- 像素宽度不应写死，应按屏幕宽度与安全区计算；
- 圆角区域会裁切内容，关键文字应避开边缘；
- 不同固件版本的 API 可用性不同，调用前应做存在性判断；
- 真机与模拟器的表现可能不同，最终以真机为准。

## 相关页面

- [快应用介绍](/quickapp/)
- [环境搭建](/quickapp/setup)
- [能力](/quickapp/capabilities)
- [打包方式](/quickapp/package)
