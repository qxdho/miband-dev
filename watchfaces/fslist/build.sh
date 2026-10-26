#!/bin/sh
# 构建 10 Pro（p67）Lua 表盘容器，并做结构校验。
set -e
cd "$(dirname "$0")"
node tools/p67build.cjs build spec.json dist/fslist.bin
node tools/p67build.cjs verify dist/fslist.bin
