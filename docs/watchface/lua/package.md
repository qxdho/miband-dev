---
title: Lua 表盘打包方式
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/tools"
contributors: [miband-dev]
---

# Lua 表盘打包方式

<StatusBadge status="sourced" verified="2026-11-01" />

Lua 表盘不是 zip，而是一个带记录表的容器。仓库里有针对 p67（10 Pro）与 8 Pro `.face` 的两套打包器，均提供构建与校验。

## 两种容器

| 容器 | 目标 | 路径前缀 | 对齐 | 预览图 | 验证 |
| --- | --- | --- | --- | --- | --- |
| p67 | 10 Pro | `_lua/xiaomi-band-10-pro/` | 无 | 336×480 | 与官方包逐字节一致 |
| 8 Pro `.face` | 8 Pro | `lua/` | 4 字节 | 230×328（样本） | 往返 0 字节差异 |

两者共享魔数 `5A A5 34 12`，但记录表位置、槽位数量与路径规则不同。字段细节见[表盘包格式](/watchface/format)。

## 打包步骤

1. **准备工程**：入口脚本（通常 `main.lua`）+ 资源 + `spec.json`；
2. **填 `spec.json`**：名称、ID、预览图、设备标识、文件列表；
3. **选打包器**：
   - p67：`tools/p67build.js`；
   - 8 Pro：`tools/facebuild.js` / `tools/containerbuild.js`；
4. **构建**：生成 `.bin` 或 `.face`；
5. **校验**：用同一工具的 `inspect` / `verify` 检查记录表、版本、预览图与文件偏移；
6. **安装**：按[安装表盘](/watchface/install)走对应渠道。

不要用文本编辑器直接改容器；任何长度变化都会破坏记录表偏移。

## 常见失败

| 现象 | 可能原因 |
| --- | --- |
| `InstallFailed` | 容器版本、设备标识或预览图与目标机型不匹配 |
| 安装后白屏 | 入口脚本报错、资源缺失、路径前缀不对 |
| 重启循环 | 加载阶段执行了危险操作，或脚本阻塞 |
| 缩略图不显示 | 预览图尺寸 / 格式不符合该容器要求 |
| 8 Pro 容器装到 p67 失败 | 两套容器不通用，必须按机型重打 |

## 相关页面

- [表盘包格式](/watchface/format)
- [开发与调试](/watchface/lua/develop)
- [安装表盘](/watchface/install)
- [普通表盘打包方式](/watchface/normal/package)
