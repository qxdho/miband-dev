# LRA 探针

目标：确认 `/dev/lra0` 能否从用户态打开、FF 能力如何、增益能否设置。
分两层，先跑安全的那层。

## 1. Lua 探针（现在就能跑，零风险）

`lua/main.lua` 是一个 Lua 表盘，只做只读检查：

- `/proc/version`（固件版本）
- `io.open("/dev/lra0", "rb"/"wb")` 能不能打开
- `os.execute` 是否可用
- `ls -l /dev` 的设备节点
- `cat /proc/modules`（已加载模块）
- `/data/rc.d` 内容

结果直接显示在表盘上，同时写 `/tmp/lra_probe.txt`。

用法：在 AIoT IDE 里建一个 Lua 表盘工程，把 `main.lua` 贴进去（或替换现有
`main.lua`），装到表盘上打开即可。不需要编译、不需要模块。

它回答的是：“Lua 沙箱有没有权限碰这个设备、系统里有哪些命令”。
它不能回答“马达能不能震”，因为 Lua 没有 ioctl。

## 2. 原生模块

| 文件 | 作用 |
| --- | --- |
| `hello.ko` | 构造函数什么都不做，只验证 modlib 能加载 `.init_array` 里的代码 |
| `lra_probe.ko` | 打开 `/dev/lra0`、查 `EVIOCGBIT`、设一次 `FF_GAIN`，写 `/data/lra_probe.log` |

```
insmod /data/hello.ko hello
lsmod                      # 看到 hello 说明 modlib 这条路通了

insmod /data/lra_probe.ko lra_probe
cat /data/lra_probe.log
```

重新构建：

```sh
./build.sh /path/to/arm-none-eabi/bin
```

## 风险

模块系统要求 `symbol_imports = none`，内核函数只能按绝对地址链接进去，
地址来自 [addresses.md](../docs/native/advanced/addresses.md)。那张表里
`open`、`ioctl`、`close`、`write` 都标着**推断**：

- 地址对：日志正常写出；
- 地址错：`insmod` 时直接崩机，手环重启。

所以先装 `hello.ko`，确认「能加载、能 lsmod」，再试 `lra_probe.ko`。
`lra_probe.ko` 不要写进开机自启，避免崩机循环。

## 已确认/待确认

已确认：

- 固件有 modlib（字符串证据见 modules.md）；
- 模块格式：ELF32、ET_REL、ARM、`.init_array`、`symbol_imports = none`；
- 本仓库用 Arm GNU Toolchain 13.2 能编出符合格式的 `.ko`（已实测生成，
  `readelf` 显示 ET_REL/ARM/init_array 正确）。

待确认（必须上机）：

- 加载后 `.init_array` 是否被调用；
- `open`/`ioctl` 地址是否可用；
- `/dev/lra0` 是否存在、FF 能力位；
- 电压/幅度写入是否真的驱动马达。
