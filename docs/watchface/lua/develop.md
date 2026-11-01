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

Lua 表盘的开发流程比快应用更为原始：没有官方 IDE 与断点调试，主要依靠日志、离线冒烟测试与逐步缩小操作范围。

## 入口与解包

表盘包内的文件会被安装器解包到脚本目录，入口脚本通常为 `main.lua`。安装器使用的 Lua 具备 `io.open`、`os.execute`、`os.remove` 等完整能力，并非裁剪过的沙箱。

具体影响如下：

- 可以读写 `/data`、`/tmp` 与 `/proc`；
- 可以执行 shell，进而执行 `insmod`；
- 脚本在加载阶段出错时，表盘可能直接白屏，来不及写日志。

## 开发顺序

1. 离线验证：在 PC 上使用 `lua` 或仓库的 `tools/smoke.lua` 执行入口脚本，先验证纯逻辑；
2. 只读探测：上机后先读取 `/proc/version`、列出 `/dev`、写入 `/tmp`，确认路径与权限；
3. 写操作：确认只读操作无误后，再写入 `/data`；
4. 危险操作：`os.execute`、`insmod`、`/data/rc.d` 应置于按键触发的路径中，不置于加载阶段；
5. 回滚：为每个写操作准备清理分支，失败时删除半成品。

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

- 所有 IO 与 `os.execute` 调用均包在 `pcall` 中；
- 使用 busy 标志防止按键重复触发；
- 日志先写入 `/tmp`，再考虑 `/data`；
- 不应假设 `os.execute` 的返回值一定为数字，应先打印其类型；
- 加载阶段不应执行 `ls -R /` 这类重负载操作。

## 调试手段

- 屏幕绘制文字（如果表盘 API 可用）；
- 写 `/tmp/*.txt`，重启前用 shell 读回；
- 通过 `os.execute('dmesg | tail')` 观察内核日志；
- 用 `probe/` 中的最小模块验证 `insmod` 链路，再接入业务模块。

## 相关页面

- [Lua 表盘能力](/watchface/lua/capabilities)
- [打包方式](/watchface/lua/package)
- [示例](/watchface/lua/examples)
- [原生加载方式](/native/loading)
