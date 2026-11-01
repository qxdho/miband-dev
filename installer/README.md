# 原生模块安装器（Lua 表盘）

把随包携带的 NuttX 模块写到 `/data`，用 `insmod` 加载，并可注册开机自启。
不需要 Canopus 框架、不需要签名；代价是没有回滚和隔离——**模块崩了手环就重启**。

机制与界面模仿 [Chaos-Module](https://github.com/WenHuaYiYang/Chaos-Module) 的安装器：
分层灰阶界面、一步一拍的流水线、`/data/rc.d` 自启脚本、绝不 `rmmod`。
区别在于 Chaos 的模块走自己的 `/dev` 协议，这里的安装器只装裸 NuttX 模块。

## 为什么能这么做

小米手环的 Lua 表盘运行在完整的 Lua 5.4 环境里，`io.open`、`os.execute`、
`os.remove` 都可用。表盘包里的文件会被解包到 `SCRIPT_PATH` 指向的目录，
所以载荷可以和 `main.lua` 放在一起随表盘下发。

## 安装流程

```
打开表盘 → 1 检查固件（版本 + 构建串）
        → 2 部署模块（写 /data/<token>/<name>/<file>，回读比对）
        → 3 加载模块（未加载才 insmod）
        → 4 检查设备（/proc/modules，可选 /dev 节点）
        → 5 开机自启（按设置写或删 /data/rc.d/<token>.sh）
```

每一步之间隔 1 秒，让 LVGL 事件循环有机会重绘，屏幕上的 `RUN 1 检查固件`
这类状态才看得见。

几个刻意的设计：

- **不 `rmmod`**：模块把回调挂进固件链之后，卸载会留下悬空指针。已经加载过时
  再按“运行”只会更新磁盘上的文件，提示重启后生效。
- **开机脚本自禁用**：`rc.d` 脚本里 `insmod` 失败会删除自己，避免坏模块把机器
  拖进重启循环。
- **写文件幂等 + 回读**：内容相同就跳过；写完读回来比对，不靠 `os.execute`
  的返回值猜。
- **两段式清除**：先删自启脚本再删数据目录，第二次点击才真正执行。

## 界面

三档灰阶（页底 / 卡片 / 按钮）+ 1px 边框 + `align` 居中，和 Chaos 安装器一致：

| 界面 | 按钮 |
| --- | --- |
| 主界面 | 运行（安装/更新）、重启（3 秒倒计时）、开机自启（设置页）、清除重置 |
| 开机自启页 | 脚本：安装/删除、下次运行是否注册、返回 |

- 每次开机只能运行一次安装（更新不受限），防止反复 `insmod`。
- “下次运行是否注册自启”会持久化到 `/data/<token>/settings.cfg`。

## 目录

```
installer/
├── main.lua      安装器表盘（不要手改 BEGIN/END PAYLOADS 之间的部分）
├── build.mjs     扫描 payloads/ 生成载荷清单
├── pack67.mjs    把 main.lua + 载荷打成可直接安装的 p67 容器
├── assets/       p67 预览块（336×480）
├── payloads/     放你的模块：*.elf / *.ko / *.bin
├── dist/         打好的 p67 容器（*.bin）
└── README.md
```

## 使用

1. 把模块放进 `installer/payloads/`。文件名去掉扩展名就是模块名
   （必须与模块内部名一致，安装器用它查 `/proc/modules`）。
2. 生成清单并校验 ELF：

   ```sh
   node build.mjs
   ```

   要求 32 位小端、`ET_REL`、`e_machine=ARM(40)`；不满足直接报错。

3. 打包。两种方式：

   - **p67 容器（推荐，可直接安装）**：见下一节，一条命令出 `.bin`。
   - 手动：把 `main.lua` 和 `payloads/` 里的文件一起放进表盘项目
     （AIoT IDE 里作为脚本与资源）。**载荷必须和 `main.lua` 同目录**，
     否则运行时会读不到。

4. 装表盘，打开它，按“运行”。屏幕逐条显示每一步的结果。
5. 安装完成即生效；若要重启后仍生效，到“开机自启”页注册脚本，或安装时保持
   “下次运行：注册自启”。

## 打包成 p67 容器

`pack67.mjs` 按 Canopus 官方安装包的格式（主头 `0x1234A55A` / 版本
`0x00010003`，资源名 `_lua/xiaomi-band-10-pro/<文件>`）打包，产物和
[Chaos-Module](https://github.com/WenHuaYiYang/Chaos-Module) 的
`dist/chaos-installer-p67.bin` 同构：

```sh
node pack67.mjs --out dist/hello-p67.bin --payload ../probe/native/hello.bin
```

参数：

| 参数 | 说明 |
| --- | --- |
| `--payload <文件>` | 要随包的模块，可重复；文件名即模块名 |
| `--out <路径>` | 输出容器，默认 `dist/installer-p67.bin` |
| `--name` / `--style` | 容器名 / 风格名，默认「原生应用安装器」 |
| `--id` | 12 字节安装包 ID，默认 `979820261027` |

打包时会：校验每个载荷是 32 位小端 `ET_REL` ARM ELF → 重写 `main.lua`
的载荷表（不落盘）→ 生成 112/64 图标 → 复用 `assets/p67-preview.block`
预览块 → 输出后自检文件清单与预览尺寸。

安装：把 `.bin` 交给手环的安装器即可（Canopus 管理器 / AIoT IDE 的安装入口），
无需签名。容器内的资源目录由运行时挂到 `SCRIPT_PATH`，安装器靠它读载荷。

## 固件匹配

`main.lua` 顶部的 `targets` 表：

```lua
targets = {
    ["3.101.043"] = { build = "CONBINE_LTALM078_T3.101.043_08041658" },
}
```

- 键是 `ro.build.version`，值里的 `build` 是 `ro.build.customer_version`。
- 只填 `targets = { ["3.101.043"] = {} }` 也可以，就只校验版本号。
- 固件升级后模块 ABI 通常就变了，必须重新编译并更新这里，否则加载后可能直接崩溃。

## 调试

- 安装日志：`/data/miband-installer/install.log`
- 开机加载日志：`/data/miband-installer/boot.log`
- 失败时屏幕显示当前步骤与原因（如 `失败: insmod 失败（xxx）`）。
- 手动确认：`lsmod` 或读 `/proc/modules`。

## 限制

- **无签名**：任何能改表盘包的人都能装任意模块，自己用没问题，别分发。
- **无回滚**：模块挂死只能重启；内核态模块没有崩溃隔离。
- **单次安装**：一次开机只跑一遍安装；更新文件可以重复。
- **不校验哈希**：只校验大小与 ELF 头，防半包不防篡改。
- 与 Canopus 的 `inbox`/`CPC2` 机制不兼容——那条路需要签名后的 CMI 包。

## 回滚

优先用安装器里的“清除重置”删脚本与数据；如果开机脚本已经写坏、机器起不来，
进 fastboot 重刷固件。
