---
title: Chaos 代码审查
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/18-代码审查报告.md"
contributors: [miband-dev]
---

# Chaos 代码审查

<StatusBadge status="sourced" verified="2026-10-25" />

Chaos 工程的逆向功底与防御性写法高于平均水平，问题集中在三处系统性缺口：发布闸门不拦坏构建、安装与写盘不原子、没有固件指纹门。三者叠加后，一次坏构建或一次断电即可让设备进入重启循环，而构建日志保持全绿。

## 审查范围

| 项 | 内容 |
| --- | --- |
| 审查对象 | `/dsh/workspace/chaos/projects/chaos`，commit `94eb407`，工作区干净 |
| 代码量 | Rust 16,794 行、39 个文件；Lua 3 个共约 1,300 行；`module/` 57 行 |
| 类型检查 | `cargo check --target thumbv8m.main-none-eabi`，离线、vendored nightly、去除 `build.rs`，通过，24 条 warning |
| 未做 | 真机运行、动态插桩、CI 实跑、`.ko` 重链接；宿主无 `cc` 与 libc |
| 覆盖 | 5 个并行只读审查（页面生命周期、FFI 边界、字体与表盘解析、应用注册表、背景与构建）加主审通读 |

严重度按后果划分。高：破坏既有用户数据、让设备进不了系统，或让坏构建静默发布。中：特定条件下触发越界、悬空、卡死。低：整洁性与可维护性。

状态描述结论强度。已证实指代码路径与行号可直接复核。推断指后果由代码路径与注释中的先例推得，未在真机复现。待定指需要真机或动态测试才能确认。

## 结论摘要

| 严重度 | 数量 | 主题 |
| --- | --- | --- |
| 高 | 14 | P0 1 条加 P1 13 条：注册表截断丢条目、坏 `.ko` 过闸门、安装写盘非原子、无固件指纹门、panic 即死机、字体包不校验且能覆盖在用槽、注册表写路径 3 条、行显隐从未生效、`APP_FG` 门反向、栈缓冲当行文本、日期页跑目录分支、resume 不查存活 |
| 中 | 17 | 卸载不拆回调、IPC 非对齐与非原子、链表遍历 fail-open、地址表形同虚设、确认标志跨页存活、越界读写若干、清单被抹、CI 不可复现、背景状态机卡死 |
| 低 | 13 | catch-all 分发、单文件过大、无测试、缺 `safe_ptr` 若干、重名导出、日志尾部边界、文档与代码重复 |

合计 44 条独立问题（C01 至 C44）：高 14 条、中 17 条、低 13 条。

优先修复的三项：

1. `tools/verify_chaos_ko.py` 改成会失败，半天，零风险。没有这一条，后续修复可能被一次坏构建抵消。
2. 安装器主模块与注册表写盘改成 `temp` 到回读再到 `rename`，一天。
3. 固件指纹门，模块启动先校验镜像，不符则什么都不做，一天。这是变砖与重启循环的唯一出口。

## 高严重度（14 条）

### C01 注册表在解析截断时仍回写，静默丢条目

`supervisor/src/appmgr.rs:1776-1785`（`move_vis_to_hide`）、`:1761`（`remove_all_pkg`）

**证据**：`write_blocked()` 检查的是上一次 `reload()` 时的状态，之后 `capture()` 到 `parse_registry()` 会重新读盘。`scan_object` 在第 41 个对象或包名非法时置 `TRUNC`，`parse_registry()` 仍返回 0，`capture()` 返回 true，`serialize()` 只序列化已登记的条目，未登记对象被静默丢弃，随后 `write_file()` 落盘。

**影响**：直接违反 `appmgr.rs:29-32` 的红线「解析被截断时绝不回写」。触发条件是上次 reload 之后固件装了新应用，或上次写盘被中断留下无 `package` 的残项，用户再隐藏或显示任一应用。

**修复**：`capture()` 与 `parse_registry()` 返回后重新执行 `write_blocked()`；或让 `capture()` 在 `TRUNC`、`OVERSIZE` 时失败，`serialize()` 也拒绝截断态。`remove_all_pkg` 缺这道检查，需一并补上。

**状态**：已证实。

### C02 坏 `.ko` 能通过构建闸门

`tools/verify_chaos_ko.py:46-59`

**证据**：脚本把未定义符号、`.init_array` 缺失、重定位类型只打印不判定，文件到第 59 行直接结束，没有 `sys.exit(1)`。`build_ko.sh:14-15` 明确警告过「`.text` 为 0 的镜像加载器会一声不吭地装成功」，校验脚本连 `.text` 大小都不检查。CI 只跑 `build_ko.sh`（`.github/workflows/build.yml`），坏包会一路进入 release。

**影响**：构建日志全绿，坏 `.ko` 仍随发布产物分发。

**修复**：未定义符号非空、`.text` 或 `.init_array` 缺失或为 0、`e_entry` 非预期、总大小达到 256KB 及以上，一律 `raise SystemExit(1)`；把 256KB 的 insmod 上限纳入检查。

**状态**：已证实。

### C03 主模块部署是原地截断，不看返回值，无回读

`installer/chaos_installer.lua:202-210`（`stage_resource`），用于 `:479` 流水线第一步部署 `sup.ko`

**证据**：`io.open(dest, "wb")` 先毁掉旧模块；`pcall(f.write, f, c)` 只判断有没有抛错，不判断返回 nil，ENOSPC 与短写都会漏过；同一文件的 `write_file()`（`:253-262`）已做回读比对，却没有被这条流水线使用。

**影响**：断电或写失败留下半截 `sup.ko`，下次开机 `/data/rc.d/chaos.sh` 无条件 `insmod` 这半截模块，可能进不了系统。

**修复**：写 `dest.tmp`，`close`，回读比对长度并加哈希，再 `rename` 覆盖；该步改走 `write_file()`。

**状态**：已证实。

### C04 没有固件指纹或版本门，开机脚本无条件 insmod

`installer/chaos_installer.lua:283-297`（`build_chaos_sh`）、`supervisor/src/lib.rs:198-230`（`chaos_ctor` 直接调固化地址）

**证据**：安装器全程没有设备固件版本校验，`grep version` 只命中模块自报的 `STATUS_VERSION`。生成的 `/data/rc.d/chaos.sh` 是 `set +e` 加 `insmod /data/chaos/chaos_sup.ko` 加两次 dd，没有任何前置条件。模块 `ctor` 一进来就调 `0x0C1AFF61` 等固化地址。

**影响**：把 3.101.043 专用包安装到别的固件上，开机即 HardFault，进入重启循环。README 只用文字警告，代码里没有任何拦截。

**修复**：分两层。模块侧在 `ctor` 第一步校验一段已知镜像字节，例如 `0x0C1AFF61` 处指令或其前后 8 字节魔数，不符则直接返回，不注册驱动、不建定时器。安装器与 rc 侧在 insmod 前用 `getprop` 读取固件版本属性（安装器已有这条通路，见 `:127-160` 的语言检测），不符则跳过并写 `autostart.log`。

**状态**：已证实。

### C05 `panic=abort` 加 `loop{}` 的 panic handler 让设备永久死机

`supervisor/src/lib.rs:253-254`

```rust
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }
```

**证据**：`Cargo.toml` 中 `panic = "abort"`。编译期断言之外，运行期 panic 面仍在，包括切片越界与除零。

**影响**：一旦触发，设备不重启、不留痕迹，用户只看到手表卡死，只能强制重启。

**修复**：panic handler 先尽力把 `PanicInfo` 写进 `/data/chaos/panic.txt`，再触发系统复位（`0xE000ED0C = 0x05FA0004`，或 `fw_api` 中已有的复位路径），把死机降级为重启。

**状态**：已证实。

### C06 字体包不校验内容，且能覆盖正在使用的槽

`installer/font_pack.lua:237-262`、`:315`；`supervisor/src/ipc.rs:371-381`、`:99-108`

**证据**：`io.open(FONT_RESOURCE)` 直接搬到 `/data/chaos/font/st<N>.ttf`，没有魔数、长度、sfnt 解析；ko 侧 `font_slot_file_ok` 也只 open 与 close。`index_read()` 在 `index.txt` 缺失时返回空表，`index_alloc()` 可能分配出当前在用的槽，`io.open(..., "wb")` 在校验之前就把活着的字体文件截断。这违反该文件头注释（`:6-10`）明令禁止的「让还活着的老脸读到别人的字节」。

**影响**：全 UI 字体异常，最坏是 LVGL 拿损坏字体建脸时崩溃。

**修复**：写入前校验 sfnt 头（`0x00010000`、`OTTO`、`true`、`ttcf`）与最小长度；拒绝 `job.slot == cur`，覆盖自己那份除外；写 `st<N>.ttf.tmp`，等 `0x30` 收到 ACK 再 rename；ko 侧 `commit` 之前做同一套头校验，现在只 open 与 close 就 `commit` 加 `remember_font` 持久化，坏文件会跨重启生效。

**状态**：已证实。

### C07 注册表原地改写，无 temp、无备份，短写回滚出「两边都没有」

`supervisor/src/appmgr.rs:1692-1704`（`write_file`）

**证据**：删除条目时内容左移，部分写入会留下旧尾巴；尾部空格填充只能救成功的短序列化，救不了写失败。下一轮启动见 `PARSE_BAD` 就转只读，没有恢复路径，`close()` 返回值也未检查。`move_vis_to_hide` 第二步失败会触发回滚删除，条目可能两个文件里都没有。

**影响**：注册表条目丢失，应用从桌面消失，且无法从备份恢复。

**修复**：`<path>.new` 写入后回读校验，再 rename；保留 `<path>.bak` 直到校验通过；任何短写或负返回视为整体失败，不做半截回滚。

**状态**：已证实。

### C08 `remove_all_pkg` 把「读不到或解析失败」当成「已删干净」

`supervisor/src/appmgr.rs:1765`

**证据**：`capture()` 对文件不存在、打不开、解析失败统一返回 false，调用方 `if !capture(...) { return true; }` 一律视为删除完成。若第一次写成功后回读失败，刚追加进 `apps.json_hide` 的副本会留下，可见副本却没删，同一包名同时出现在两个文件。

**影响**：产生 `E_DUP`，按代码自己的注释（`:1759-1760`），固件会建两个桌面记录、退出时二次释放，表现为黑屏。

**修复**：`capture` 区分 `Found`、`NotFound`、`Err`，只有 `NotFound` 算完成，`Err` 向上传播并让调用方回滚追加。C07、C08 与 C01 同属注册表写路径，建议用同一套 `temp`、`verify`、`rename` 助手一起改。

**状态**：已证实。

### C28 删除正在使用的字体时，回退未成功前清单与文件已不可逆

`supervisor/src/font_apply.rs:632-636`、`:708-710`；`supervisor/src/font_list.rs:563`、`:587`

**证据**：建脸失败的样式会被跳过，只把 `FA_C_FACE0` 加一，没有任何地方用它当门；`apply_finish()` 无条件清 `FA_REVERT`；删除流程的状态 11 只等 `revert_busy()`（即 `FA_REVERT`）就进状态 2 执行 `fw_api::fs_remove(p)`。

**影响**：个别样式回退失败时，字体文件被删，那些样式仍持有按需回读该文件的脸。一次 `mfont_create` 的瞬时失败（内存紧张或管理器预热）就够触发。

**修复**：`FA_REVERT` 只在 `FA_C_FACE0 == 0 && FA_C_WR == FA_JOB_N` 时清；把回退失败暴露给删除流程，状态 11 遇到失败必须中止删除并给出可见提示。

**状态**：已证实。

### C32 所有隐藏行的调用都是空操作

`supervisor/src/fw_api/gfx.rs:70-73`；调用点 `supervisor/src/ui.rs:119`、`:280`、`supervisor/src/page.rs:1143`

```rust
pub unsafe extern "C" fn obj_set_hidden(obj: Obj, hidden: u32) -> Obj {
    let f: unsafe extern "C" fn(Obj, u32) -> Obj = transmute(0x0C58_8519usize);
    f(obj, hidden)
}
```

**证据**：`gfx.rs:65-69` 自己写着「同一个入口的真身是 `lv_obj_clear_state`，它不隐藏任何东西，页 7、8、9 的行显隐实际没有发生隐藏」。LVGL v9 已删除 `lv_obj_set_hidden`，正解是 `lv_obj_add_flag(obj, 1)`。

**影响**：表盘页 8、9 上超出窗口的行、应用管理页超窗口的行都不会隐藏。

**修复**：`obj_set_hidden(0/1)` 改实现为 `obj_add_flag(obj, LV_OBJ_FLAG_HIDDEN)` 与 `obj_clear_flag(...)`，现有壳 `0x1C028BD9`、`0x1C028C85` 在 `gfx.rs:605-615`；`obj_clear_state` 只留给 `page.rs:533` 的 FOCUSED 清除。

**状态**：已证实。

### C39 `APP_FG` 在 pause 清、在 resume 不恢复，字体跑批的安全门反向

`supervisor/src/ui.rs:417`（清）、`:48`（唯一置 1 处）、`:362-411`（resume 未置）；`supervisor/src/font_apply.rs:540`

**证据**：`chaos_on_pause` 写 `APP_FG=0`，`chaos_on_create` 写 1，`chaos_on_resume` 不写。`state.rs:369` 的注释明确要求 resume 置、pause 与 destroy 清。息屏唤醒若没有重建页面实例，模块一直认为自己在后台。字体逐对象改写在 `font_apply.rs:540` 使用 `if st_rd!(APP_FG) != 0 { return; }`，即「页在前台就跳过」，注释写着这种情况 commit 仍然崩。`beautify_restore.rs:128` 也只在 `APP_FG==0` 时动作，前台页面活着时也会重挂背景。

**影响**：字体提交在错误的前后台判断下执行，可能崩溃；背景被重复挂载。

**修复**：`chaos_on_resume` 里设 `FG_PAGE` 之后立刻 `st_wr!(APP_FG, 1)`，并在 `chaos_on_destroy` 里清零。

**状态**：已证实。

### C40 `WfMgmtPage` 把栈上缓冲当行文本传下去

`supervisor/src/page.rs:1176-1189`

```rust
let mut tbuf: [u8; 88] = [0; 88];
shake_toggle_text(tbuf.as_mut_ptr());
let text = core::slice::from_raw_parts(tbuf.as_ptr(), tlen + 1);
... RowSpec::switch(text)
```

**证据**：本仓库的硬规则是行控件的文本指针必须一直有效（`icon_apply.rs:163`、`appmgr.rs:131`），其它页都用 `WATCH_LINES`、`FL_LINES`、`IC_LINES` 静态缓冲，只有这里传局部数组。`render` 返回后指针失效，重绘读到被复用的栈帧；若复用区没有 NUL，LVGL 的 `strlen` 越界读并崩溃。下方 `row_update(s0, ..., tbuf.as_ptr(), ...)` 也在同一帧内使用它。

**影响**：行文本乱码，或重绘时崩溃。当前可能因栈帧尚未复用而侥幸通过。

**修复**：改成文件级 `static mut WFMGMT_ROW0: [u8; 88]`，与其它页保持一致。

**状态**：已证实。

### C41 日期设置页仍在跑目录页的 resume 分支

`supervisor/src/ui.rs:377-387`

**证据**：`if pid == 3 { DIR_DEPTH = pid-1; load_dir(); }`，但 `PAGE_TABLE[3]` 现在是 `&PAGE_DATE_MD`（`page.rs:2253`，`DATE_MD_PID=3`）。`PATH_STACK` 只有退役的文件管理页会填，`load_dir()` 拿着全零路径去 `opendir`，还覆盖 `DIR_DEPTH`、`DIR_WIN`、`DIR_COUNT`、`DIR_ERR`。紧邻的注释已记录同类误用：「点『时间设置』立即崩」。

**影响**：每次进入日期设置都走这条路径，存在立即崩溃的条件。

**修复**：删掉这段 `if pid == 3`，已无目录页可达；或改成显式的「当前页确实是目录页」判据。

**状态**：已证实。

### C42 `chaos_on_resume` 不校验页面存活就 `render_page`

`supervisor/src/ui.rs:411`；对比 `supervisor/src/ui.rs:61-70`（`page_is_live`）

**证据**：`render_page(pid)` 内部只查 `PAGES[pid].root != 0`（`ui.rs:220-221`），其它所有渲染路径（行分发、tick、`render_req`、表盘自愈）都以 `page_is_live`（读描述符 `+0x30`）为门。唤醒时若固件已拆掉对象树却没回调可选的 `ui_destroy`，就会对着已释放的 LVGL 内存建标题与内容。resume 开头自己就承认「描述符可能不是本页的，唤醒时固件换了编码」。

**影响**：对已释放内存写入，可能 HardFault 或界面错乱。

**修复**：`render_page(pid)` 之前加 `if !page_is_live(pid) { return 0; }`。

**状态**：推断。

## 中严重度（17 条）

| ID | 位置 | 证据与影响 | 修复建议 | 状态 |
| --- | --- | --- | --- | --- |
| C09 | `supervisor/src/lib.rs:232-246` | `chaos_dtor` 只调用 `unregister_driver`；全仓无 `timer_delete`，行回调也不注销。手动 `rmmod` 后 LVGL 定时器与回调指向已释放代码，安装器注释记录过崩溃先例。 | dtor 里删除定时器、注销回调；或在文档与 `insmod` 封装里硬性禁止 rmmod。 | 已证实 |
| C10 | `supervisor/src/ipc.rs:28-72`、`:439-467` | `buf` 直接 `as *mut u32`、`as *const u32` 后 `write_volatile`、`read_volatile`，未校验 4 字节对齐。Rust UB，M33 一般容忍。 | 用 `from_le_bytes` 逐字拷贝，或先断言对齐。 | 已证实 |
| C11 | `supervisor/src/ipc.rs:445-448`、`:393-411` | `WRITE_BUSY`、`DQ_*` 等 `static mut` 由定时器与 syscall 两个上下文共享，读改写不是原子操作，依赖「不在中断里进 write」的隐含假设。 | 注释写清假设；能加临界区就加，Vela 有 `irqsave` 等价物时优先使用。 | 已证实 |
| C12 | `supervisor/src/ui.rs:356` | `_ => chaos_row_ev51` 的 catch-all 与 `lib.rs:117-118` 的禁令相反；当前 12 到 51 恰好对应 40 行，属「今天不可达、明天静默错位」。 | 显式列出 `12..=51`，其余 `unreachable` 并记日志。 | 已证实 |
| C13 | `.github/workflows/build.yml:17` | `dtolnay/rust-toolchain@nightly` 未钉版本，配合 `-Z build-std`，产物不可复现，同 commit 两次构建可能不同。 | 钉 `nightly-YYYY-MM-DD`，CI 里把 `rustc -vV` 入库。 | 已证实 |
| C14 | `tools/build_ko.sh:46` | `lib=$(ls .../lib*.a \| head -n 1)` 会挑错库，`set -e` 抓不到 glob 失败。 | 用确定文件名加 `[ -f ]` 检查。 | 已证实 |
| C15 | `supervisor/src/appmgr.rs:1366-1367`、`:1384-1385` | `keep_add`、`keep_del` 先改内存再存盘，`keep_save()` 失败不回滚，行显示与盘上不一致，重启回退。 | 存盘失败时恢复 `KEEP_N` 与槽位，`excl_toggle` 已有正确写法。 | 已证实 |
| C16 | `supervisor/src/appmgr.rs:1023`、`:1077` | 排除表校验和用 `*const u32`、`*mut u32` 访问 `[u8; N]` 静态，该静态 1 字节对齐，属未对齐的类型化 volatile 访问。 | 用 `u32::from_le_bytes` 或 `#[repr(align(4))]`。 | 已证实 |
| C17 | `supervisor/src/cacheclean.rs:91-98` | 长文件名被静默截断进 176 字节的 `CC_WORK`，随后按截断后的路径 unlink 与递归，会删错兄弟项，真项永远清不掉。 | 放不进就跳过并计数，不递归。 | 已证实 |
| C18 | `supervisor/src/explorer.rs:59-70` | 文件查看循环只查 `used < 2047` 就写 512 字节，短读且非 EOF 时可越过 2052 的 `FILE_VIEW`。 | 请求 `min(512, 2051-used)`，`got > request` 直接停。 | 已证实 |
| C19 | `supervisor/src/background_scene.rs:177-189` | `detach()` 在图已不是父对象子节点时静默跳过，`images[]` 不清零，父透明度已置 0，导致 `unmount()` 永远失败、`release()` 拒绝释放、mode-0 分支每拍重试。 | else 分支恢复透明度并清账本，至少强制清零并记日志。 | 已证实 |
| C20 | `supervisor/src/background_assets.rs:26-31`、`:62` | `battery_mask` 校验了宽高与 stride，没校验 `+12` 的数据长度字，最长越界读约 474KB，且发生在 tick 回调里，可能 HardFault。 | 要求 `rd32(+12) >= 1008*480`。 | 已证实 |
| C29 | `supervisor/src/font_hot.rs:286-292`、`:333-340` | 遍历包装链时只守卫链体、没守卫下一跳：`wp` 过不了 `safe_ptr` 仍执行 `wp = rd32(wp+44)`，在 50ms 定时器里读任意地址，与文件自称的 fail-closed 相反。 | `if !safe_ptr(wp) { break; }`，下一跳也要校验。 | 已证实 |
| C30 | `supervisor/src/watchface.rs:19-27`、`:139`、`:159` | 表盘节点只用 `(node & 0xE0000000) != 0x20000000` 判段，不查对齐与是否映射；`name_translation` 的 `arr`、`tp` 指针完全不校验就做 32 与 63 字节读。 | 节点与下一跳用 `safe_ptr`，`arr`、`tp` 用 `plausible_ptr`。 | 推断 |
| C31 | `supervisor/src/font_list.rs:139-143`、`:568` | `fl_load` 先置 `FL_LOADED=1` 再 open，失败静默返回，使「读不到」等同于「空清单」；随后删除流程把 `index.txt` 写成 8 行空白，永久抹掉清单，字体文件仍在。 | 只有解析成功才置加载位；`fl_load`、`fl_drop` 失败时中止删除。 | 已证实 |
| C33 | `supervisor/src/fw_api/gfx.rs:430-432` 等约 40 处 | 地址表形同虚设：`MFONT_CREATE_NAMED` 已入库却仍写 `transmute(0x0C86_03B1)`；`fwaddr.rs:141-143` 的 `compile_error!` 只在 `fw-p65` 下触发，删掉它就等于让 RW6 跑 043 的地址。 | 调用点接回表名；用机械检查替代人工判断，例如 `fwaddr` 之外禁止 `transmute(0x0C..)`。 | 已证实 |
| C43 | `supervisor/src/page.rs:924`、`:1030`、`:1042`；`cacheclean.rs:192` | 二次确认标志位跨页销毁存活：`LOG_CLEAR_ARMED`、`CC_ARM` 只在确认或执行完才清，`chaos_on_create` 与 `on_ui_destroy` 都不重置。退出再进入，一行仍显示「再点一次确认清空」，单击就真清空。 | 在 `on_create`、`on_ui_destroy` 里一并重置。 | 已证实 |

## 低严重度（13 条）

| ID | 位置 | 证据与影响 | 修复建议 | 状态 |
| --- | --- | --- | --- | --- |
| C21 | `supervisor/src/text.rs:357-446` | `W::end()` 在 `cap == 0` 时执行 `cap-1` 下溢。当前没有调用点传 0。 | 对 `cap == 0` 提前返回。 | 已证实 |
| C22 | 全仓 | 24 条编译 warning，其中 23 条是死代码（`ContentFailed`、`ring_fill`、`dbg_fields`、`RING_PREV`、若干 state 常量等），1 条 `unused mut`，1 条 `#![feature(arm_target_feature)]` 未使用。 | 删除死代码，清理 `unused_mut` 与未使用 feature。 | 已证实 |
| C23 | 全仓 | 0 个 `#[test]`、无 clippy 配置、无 `#[deny(unsafe_op_in_unsafe_fn)]`，且全局 `#![allow(static_mut_refs)]`。 | 增加最小测试与 lint 配置。 | 已证实 |
| C24 | `supervisor/src/page.rs` | 单文件 2,271 行，页面抽象、布局、交互、表驱动混在一起；新增页面只需改 `PAGE_TABLE`（`:2251`，19 项），改布局要读 2 千行。 | 按职责拆分文件。 | 已证实 |
| C25 | `dist/stage/main.lua`、`installer/chaos_installer.lua` | 两份内容重复，容器壳产物入库，改一处要同步三处。 | 由构建生成，避免手工同步。 | 已证实 |
| C26 | `module/chaos_mod.ko`、`dist/` | `chaos_mod.ko`（1,672 B）提交入库且 CI 不重建；`dist/` 里的 `.ko` 与安装器镜像不参与构建校验，交付二进制无法从源码复现。 | 入库改为构建产物，并在 CI 校验。 | 已证实 |
| C27 | `installer/icon_pack.lua:173-300` | 解包本身很稳（魔数 `CIPK`、张数 1..256、单张不超过 512KB、名字白名单挡路径穿越、逐块 pcall、落盘回读），但没有总量预算，256 张乘 512KB 可写满 `/data`；索引 128 字节改写非原子，失败会留下新前缀加旧尾巴，注释里「旧文件仍完整」的说法不成立。 | 增加总量预算；索引改写走临时文件与 rename。 | 已证实 |
| C34 | `supervisor/src/fw_api/home.rs:93-94` | `background_notification_cache_refresh` 直接 `rd32((image + 0x34))`，缺同级函数在 `:149-150` 使用的 `safe_ptr` 门。 | 补 `safe_ptr`。 | 已证实 |
| C35 | `supervisor/src/fw_api/picker.rs:118-127` | `zoom_picker_value` 扫数字没有长度上限，只在非数字处停，标签无终结符就越界读。 | 加长度上限。 | 已证实 |
| C36 | `supervisor/src/fw_api/event.rs:46-48` | `timer_period_of` 只判 `t == 0` 就解引用，缺 `plausible_ptr` 门。 | 补 `plausible_ptr`。 | 已证实 |
| C37 | `supervisor/src/fw_api.rs:49-52` | `MAX_PAGE_ID = 9` 已过期，实际 `MAX_PID = 18`，今天无引用；文档却要求所有 pid 边界向它看齐，照做会静默拒掉 10 到 18。 | 改为 `MAX_PID` 或删除。 | 已证实 |
| C38 | `supervisor/src/fw_api.rs:167`、`supervisor/src/fw_api/sys.rs:221` | `KEY_SWITCH_GUESTRE` 重复定义且都被 glob 重导出，第一次引用即 `E0659`。 | 保留一处定义。 | 已证实 |
| C44 | `supervisor/src/log.rs:92-101` | `tail()` 在窗口正好从 `\n` 开始（`i==0`）时不做位移，首行空；整个尾部没有换行时把 `n` 清零，页面显示空白，有内容却看不到。 | 处理 `i==0` 与无换行分支。 | 已证实 |

## 系统性风险

| 指标 | 数值 | 含义 |
| --- | --- | --- |
| `unsafe fn` | 545 | API 面几乎全是 unsafe，调用点自行负责不变量 |
| `static mut` | 439 | 全局可变状态是主要设计范式，跨上下文共享（定时器与 syscall）无类型级约束 |
| `transmute` | 156 | 多为地址到函数指针的转换，一旦基址漂移即跳野指针 |
| `as *mut`、`as *const` | 149、447 | 指针算术密集 |
| `.unwrap()`、`.expect()`、`panic!` | 0 | panic 面被压到只剩编译期断言 |
| 测试 | 0 | 所有行为保证都靠真机试错与注释 |

`unsafe` 密度由逆向任务本身决定，需要与固件的裸地址、链表、LVGL 对象打交道。防御写法也在，包括 `safe_ptr` 白名单、`guard<512` 链表上限、`is_child_of` 校验、失败回退原图标、A/B 槽世代计数。

真正缺的是错误发生时谁兜底。unsafe 代码无法证明正确，因此需要三样东西：会失败的闸门、可恢复的写盘、能自愈的启动（指纹门加 panic 重启）。

## 修复顺序

| 轮次 | 条目 | 内容 |
| --- | --- | --- |
| 第 0 轮，半天，零风险 | C02、C03、C05、C06 | 只动工具与安装器：校验脚本失败化、主模块 `temp` 加 `rename` 加回读、panic 改成复位、字体头校验并禁止覆盖在用槽。这一轮不碰 supervisor 运行逻辑，改完可先发一版验证构建闸门真的会拦。 |
| 第 1 轮，一天 | C04、C01、C07、C08、C41、C39、C42、C40、C28、C31 | 动 supervisor 但改动都很小：固件指纹门放 `ctor` 首步；注册表写路径统一成 `temp`、`verify`、`rename` 并禁止截断态回写；删掉日期页的目录分支；恢复 `APP_FG`；resume 前查 `page_is_live`；行文本改静态；处理字体删除顺序与清单加载失败。 |
| 第 2 轮，按需 | C09、C13、C14、C12、C43、C44、C18、C17、C20、C29、C30、C32 | 卸载拆除、构建可复现、去掉 catch-all、确认标志重置、日志尾部、越界与 fail-open、行显隐真修。行显隐需要真机回归。 |
| 暂缓 | C10、C11、C16、C21 | 全面临界区改造与需要重新验证真机行为的改动，收益低于风险。等前三轮稳定后，以每次一改加真机回归的方式做。 |

## 未覆盖范围

1. 没有上真机。所有会崩、会黑屏的判断来自代码路径与注释里的先例记录，不是本次复现。
2. 没有重链接 `.ko`。宿主无 `cc` 与 libc，`build.rs` 的宿主链接无法完成，`cargo check` 只覆盖类型层。
3. `fw_api/*.rs` 的表驱动地址（`gfx.rs` 616 行、44 处 `transmute`）只做抽样核对，没有逐条对齐固件反汇编。
4. 没有二进制解析器。字体、图标、表盘的「文件」都是定长文本清单加固件 RAM 结构，因此不包含文件格式 fuzz 类结论。`icon_pack.lua` 的解包（`CIPK` 加位图）是唯一真正处理二进制的地方，已单独审过，见 C27。
5. LVGL 版本耦合。页面与样式代码依赖 9.1 的布局行为，固件更新即可能失效，版本漂移风险未评估。
6. 安装器的容器入口（`dist/stage/main.lua` 与 `.bin` 打包）未做端到端验证。
7. 未覆盖文件：`res_hook.rs`、`icon_apply.rs`、`beautify_restore.rs` 只做针对性抽查，`background_surfaces.rs`、`background_home.rs` 的布局常数正确性未逐条核对。

## 相关页面

- 模块加载器与运行方式：[Chaos](/native/chaos)
- 模块格式与加载 ABI：[内核模块系统](/native/modules)
- 界面绘制与事件回调：[LVGL](/native/lvgl)
- 地址表与反汇编工具：[地址表](/tools/addresses)
