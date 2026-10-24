---
title: 应用与表盘
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-10-25
status: sourced
source: "https://iot.mi.com/vela/quickapp/"
contributors: [miband-dev]
---

# 应用与表盘

<StatusBadge status="sourced" verified="2026-10-25" />

在设备上呈现界面与交互的两条路径：快应用使用 JS 编写，表盘使用 Lua 脚本与资源包。两者都不需要接触固件，是风险最低的入口。

## 两条路径的分工

| 路径 | 运行时 | 适合做 | 不适合做 |
| --- | --- | --- | --- |
| [快应用](/apps/quickapp/) | AiotJS | 应用界面、健康数据、网络请求、传感器 | 访问文件系统、加载原生库 |
| [表盘](/apps/watchface/) | Lua + 资源包 | 常驻显示、时间步数、自定义外观 | 长时间运行的后台逻辑、系统接口 |

两条路径都在沙箱内运行，不能修改系统行为。需要修改系统时进入[固件与原生](/system/)层。

## 本章页面

| 页面 | 内容 |
| --- | --- |
| [快应用导读](/apps/quickapp/) | 能力边界、前置条件、页面清单 |
| [环境搭建](/apps/quickapp/setup) | AIoT IDE 安装、最小工程、模拟器、打包 |
| [运行时与 fetch](/apps/quickapp/runtime) | JIDL、模块注册、feature 裁剪、`fetch` 的故障模式 |
| [常见问题](/apps/quickapp/pitfalls) | 社区记录到的失败案例与判断方法 |
| [表盘导读](/apps/watchface/) | 表盘格式与替换方式 |
| [打包格式](/apps/watchface/package) | `.face` 二进制结构与字段 |
