---
title: Lua 表盘开发与调试
models: [band9, band10, band10pro]
firmware: "unknown"
verified: 2026-11-01
status: sourced
source: "https://github.com/qxdho/miband-dev/tree/main/installer"
contributors: [miband-dev]
---

# Lua 表盘开发与调试

<StatusBadge status="sourced" verified="2026-11-01" />

Lua 表盘的开发循环比快应用更原始：没有官方 IDE、没有断点调试，主要靠日志、离线冒烟与逐步缩小操作范围。

## 入口与解包

表盘包里的文件会被安装器解包到脚本目录，入口脚本通常是 `main.lua`。安装器使用的 Lua 具备 `io.open`、`os.execute`、`os.remove` 等完整能力，不是裁剪过的沙箱。

这意味着：

- 可以读写 `/data`、`/tmp` 与 `/proc`；
- 可以执行 shell，进而 `insmod`；
- 一旦脚本在加载阶段出错，表盘可能直接白屏，来不及写日志。

## 开发顺序

1. **离线跑通**：在 PC 上用 `lua` 或仓库的 `tools/smoke.lua` 跑入口脚本，先验证纯逻辑；
2. **只读探测**：上机后先读 `/proc/version`、列 `/dev`、写 `/tmp`，确认路径与权限；
3. **写操作**：确认只读没问题后，再写 `/data`；
4. **危险操作**：`os.execute`、`insmod`、`/data/rc.d` 放到按键触发，不放在加载阶段；
5. **回滚**：为每个写操作准备清理分支，失败时删除半成品。

## 错误处理

```lua
local ok, err = pcall(function()
  local f = assert(io.open('/tmp/probe.txt', 'w'))
  f:write('hello\n')
  f:close()
end)
if not ok then
  -- 记录到屏幕或已知可写路径
end
```

要点：

- 所有 IO 与 `os.execute` 包 `pcall`；
- 用 busy 标志防止按键重复触发；
- 日志先写 `/tmp`，再考虑 `/data`；
- 不要假设 `os.execute` 的返回值一定是数字，先打印类型；
- 不要在加载阶段执行 `ls -R /` 这类重操作。

## 调试手段

- 屏幕绘制文字（如果表盘 API 可用）；
- 写 `/tmp/*.txt`，重启前用 shell 读回；
- 通过 `os.execute('dmesg | tail')` 观察内核日志；
- 用 `probe/` 里的最小模块验证 `insmod` 链路，再接入业务模块。

## 相关页面

- [Lua 表盘能力](/watchface/lua/capabilities)
- [打包方式](/watchface/lua/package)
- [示例](/watchface/lua/examples)
- [原生加载方式](/native/loading)
