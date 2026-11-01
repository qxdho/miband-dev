#!/bin/sh
# 构建 LRA 探针模块。需要 arm-none-eabi-gcc（Arm GNU Toolchain）。
#
#   ./build.sh                    # 用 PATH 里的 arm-none-eabi-
#   ./build.sh /opt/arm/bin       # 指定工具链 bin 目录
#
set -e

BIN="${1:-}"
if [ -n "$BIN" ]; then
    GCC="$BIN/arm-none-eabi-gcc"
    LD="$BIN/arm-none-eabi-ld"
else
    GCC="${CROSS_COMPILE:-arm-none-eabi-}gcc"
    LD="${CROSS_COMPILE:-arm-none-eabi-}ld"
fi

CFLAGS="-c -Os -g -mthumb -mcpu=cortex-m33 -mfloat-abi=soft \
        -fno-pic -fno-common -ffreestanding -Wall -Wextra"

# 内核函数地址来自 docs/system/native/addresses.md（固件 3.101.043）。
# 这些是「推断」地址：调错会崩机，所以 hello.ko 不引用它们。
DEFSYMS="--defsym open=0xc1d0a29 --defsym close=0xc1b9d81
         --defsym ioctl=0xc1d01a5 --defsym write=0xc1d2641"

cd "$(dirname "$0")"

echo "== hello.ko（不调用内核，只验证加载） =="
$GCC $CFLAGS -DHELLO_ONLY -o hello.o lra_probe.c
$LD -r -o hello.ko hello.o
node fix_relocs.mjs hello.ko

echo "== lra_probe.ko（open/ioctl/close 写日志） =="
$GCC $CFLAGS -o lra_probe.o lra_probe.c
$LD -r -o lra_probe.ko lra_probe.o $DEFSYMS
node fix_relocs.mjs lra_probe.ko

rm -f hello.o lra_probe.o
ls -l hello.ko lra_probe.ko
