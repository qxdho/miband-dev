---
title: Lua 表盘能力
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/installer"
contributors: [miband-dev]
---

# Lua 表盘能力

<StatusBadge status="sourced" verified="2026-11-01" />

本页将「已在仓库中复现」与「仅见提及」两类情况分列。Lua 表盘并非完整的应用运行时，其能力取决于固件暴露的 Lua 库与设备节点。

## 已证实

| 能力 | 证据 | 说明 |
| --- | --- | --- |
| 执行 shell | `installer/`、`probe/lua/main.lua` | `os.execute()` 可调用系统命令 |
| 读写文件 | `installer/`、`watchfaces/fslist/` | `io.open` / `io.write`，可写 `/data` 与 `/tmp` |
| 删除文件 | `installer/` | `os.remove` 用于清理旧模块 |
| 读取 `/proc` | `probe/lua/main.lua` | `/proc/version`、`/proc/modules` |
| 访问 `/dev` | `probe/lua/main.lua` | 打开 `/dev/lra0` 做只读探测 |
| 加载内核模块 | `installer/` | 解包 `.ko` 后 `insmod`，并检查 `/proc/modules` |
| 配置开机自启 | `installer/` | 写入 `/data/rc.d`，加载失败时脚本自删 |
| 遍历文件系统 | `watchfaces/fslist/` | 按键触发 `ls -R /`，结果写入 `/data/fslist.txt` |

上述能力来自 10 Pro 的实测脚本与社区容器，其他机型需要另行验证。

## 未证实

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| 表盘 UI 专用 API | 未整理 | 布局、指针、数据字段的接口尚未系统记录 |
| 网络请求 | 未证实 | 没有在表盘脚本中复现 `fetch` 或 socket |
| 传感器订阅 | 未证实 | 心率、加速度计的脚本接口未验证 |
| 常驻后台 | 未证实 | 表盘生命周期是否允许长期任务尚不明确 |
| 跨表盘通信 | 未证实 | 没有可复现的 IPC 机制 |

## 限制与风险

- 脚本在表盘进程内运行，错误可能导致白屏、重启循环或表盘被系统回退；
- 不同固件版本的库与路径可能变化，脚本需针对 `models` / `firmware` 标注；
- 执行 shell 与加载模块会突破沙箱，因此必须自带失败回滚；
- 表盘包没有签名校验，但安装器仍会校验容器版本、设备标识与缩略图。

## 写法建议

1. 加载阶段不执行任何危险操作，将动作延迟至按键事件或明确时机；
2. 所有 IO 与 `os.execute` 调用均包在 `pcall` 中；
3. 使用 busy 标志防止重复触发；
4. 先写日志到 `/tmp`，确认路径与权限后再写 `/data`；
5. 提供「清除 / 回滚」入口，不应使设备处于只能重刷的状态。

## 相关页面

- [Lua 表盘介绍](/watchface/lua/)
- [开发与调试](/watchface/lua/develop)
- [示例](/watchface/lua/examples)
- [原生加载方式](/native/loading)
