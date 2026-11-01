/*
 * lra_probe.c — 线性马达（/dev/lra0）探针，NuttX 可加载模块
 *
 * 状态：未编译、未上机。本环境没有 ARM 工具链，且固件要求
 *       symbol_imports = none（见 docs/system/native/modules.md），
 *       所以内核函数只能按 addresses.md 里的绝对地址链接进去。
 *       这些地址多数标注为「推断」，调用错误地址会直接崩机。
 *
 * 构建（在装有 arm-none-eabi-gcc 的机器上）：
 *   arm-none-eabi-gcc -c -Os -g -mthumb -mcpu=cortex-m33 \
 *       -mfloat-abi=soft -fno-pic -fno-common -ffreestanding \
 *       -o lra_probe.o lra_probe.c
 *   arm-none-eabi-ld -r -o lra_probe.ko lra_probe.o \
 *       --defsym open=0xc1d0a29 --defsym close=0xc1b9d81 \
 *       --defsym ioctl=0xc1d01a5 --defsym write=0xc1d2641
 *
 * 加载：insmod /data/lra_probe.ko lra_probe
 * 输出：/data/lra_probe.log
 *
 * 建议先只装 HELLO_ONLY 版本，确认能加载再换成完整探针。
 */

#include <stdint.h>

/* ---- 内核函数（绝对地址，由 --defsym 提供） ---- */
extern int open(const char *path, int flags, ...);
extern int close(int fd);
extern int ioctl(int fd, unsigned long req, ...);
extern int write(int fd, const void *buf, unsigned int n);

/* ---- 文件标志（NuttX 与 Linux 不同：NuttX 定义） ---- */
#define O_RDONLY 0x0001
#define O_WRONLY 0x0002
#define O_RDWR   0x0003
#define O_CREAT  0x0200
#define O_TRUNC  0x0400

/* ---- ioctl 编码（与 Linux/NuttX 的 _IOC 一致） ---- */
#define _IOC_NRBITS   8
#define _IOC_TYPEBITS 8
#define _IOC_SIZEBITS 14
#define _IOC_NRSHIFT  0
#define _IOC_TYPESHIFT (_IOC_NRSHIFT + _IOC_NRBITS)
#define _IOC_SIZESHIFT (_IOC_TYPESHIFT + _IOC_TYPEBITS)
#define _IOC_DIRSHIFT  (_IOC_SIZESHIFT + _IOC_SIZEBITS)
#define _IOC_NONE  0U
#define _IOC_WRITE 1U
#define _IOC_READ  2U
#define _IOC(dir, type, nr, size) \
    (((dir) << _IOC_DIRSHIFT) | ((type) << _IOC_TYPESHIFT) | \
     ((nr) << _IOC_NRSHIFT) | ((size) << _IOC_SIZESHIFT))

#define EV_MAX 0x1f
#define EV_FF  0x15

#define EVIOCGBIT(ev, len) _IOC(_IOC_READ, 'E', 0x20 + (ev), (len))
#define FF_GAIN            _IOC(_IOC_WRITE, 'E', 0x60, sizeof(uint16_t))

#define LRA_DEV  "/dev/lra0"
#define LOG_PATH "/data/lra_probe.log"

static char g_log[1024];
static int  g_len;

static void log_str(const char *s)
{
    while (*s && g_len < (int)sizeof(g_log) - 1) g_log[g_len++] = *s++;
}

static void log_int(int v)
{
    char b[12];
    int i = 0, neg = 0;
    if (v < 0) { neg = 1; v = -v; }
    if (v == 0) { log_str("0"); return; }
    while (v) { b[i++] = '0' + v % 10; v /= 10; }
    if (neg) log_str("-");
    while (i--) {
        char c = b[i];
        char s[2] = { c, 0 };
        log_str(s);
    }
}

static void flush_log(void)
{
    int fd = open(LOG_PATH, O_WRONLY | O_CREAT | O_TRUNC);
    if (fd >= 0) {
        write(fd, g_log, (unsigned int)g_len);
        close(fd);
    }
}

__attribute__((constructor)) static void lra_probe_init(void)
{
    int fd, ret;
    uint16_t gain;
    uint8_t bits[8];
    int i;

    log_str("lra_probe: start\n");

#ifdef HELLO_ONLY
    /* 什么都不做：只验证 modlib 能加载 .init_array 里的构造函数 */
    return;
#endif

    fd = open(LRA_DEV, O_RDWR);
    log_str("open(" LRA_DEV ") = ");
    log_int(fd);
    log_str("\n");
    if (fd < 0) {
        flush_log();
        return;
    }

    /* 1. 查询支持的事件类型 */
    for (i = 0; i < 8; i++) bits[i] = 0;
    ret = ioctl(fd, EVIOCGBIT(0, sizeof(bits)), bits);
    log_str("EVIOCGBIT(0) = ");
    log_int(ret);
    log_str(" bits=");
    for (i = 0; i < 8; i++) {
        uint8_t v = bits[i];
        char h[3];
        const char *d = "0123456789abcdef";
        h[0] = d[v >> 4]; h[1] = d[v & 0xf]; h[2] = 0;
        log_str(h);
    }
    log_str("\n");

    /* 2. 查询 FF 能力位 */
    for (i = 0; i < 8; i++) bits[i] = 0;
    ret = ioctl(fd, EVIOCGBIT(EV_FF, sizeof(bits)), bits);
    log_str("EVIOCGBIT(FF) = ");
    log_int(ret);
    log_str(" bits=");
    for (i = 0; i < 8; i++) {
        uint8_t v = bits[i];
        char h[3];
        const char *d = "0123456789abcdef";
        h[0] = d[v >> 4]; h[1] = d[v & 0xf]; h[2] = 0;
        log_str(h);
    }
    log_str("\n");

    /* 3. 设一次增益（不震动，只是设置幅度上限） */
    gain = 0x4000;
    ret = ioctl(fd, FF_GAIN, &gain);
    log_str("FF_GAIN(0x4000) = ");
    log_int(ret);
    log_str("\n");

    close(fd);
    log_str("lra_probe: done\n");
    flush_log();
}
