# 研究笔记

这里保存站点内容的原始出处。站点上的每一页都从这些笔记改写而来，改写只调整结构与表述，不改动数据。

保留原件的理由：

- **可核对**：正文里的地址、偏移、哈希、日志原文，都能在对应的笔记里找到出处。
- **可追溯**：笔记里有推导过程、实验记录和被推翻的结论，站点正文只保留结论。
- **可续写**：新增内容先写笔记，再改写成站点页面，避免直接改正文时丢失依据。

## 编号与站点页面的对应

| 文件 | 内容 | 站点页面 |
| --- | --- | --- |
| `01-固件研究-10Pro.md`、`02-固件研究-9Pro.md` | 固件包结构、分区、镜像格式 | `/firmware/package` |
| `03-系统架构.md` | NuttX、启动链、文件系统布局 | `/firmware/architecture` |
| `04-快应用运行时与-fetch.md` | quickapp 框架、JIDL、fetch 故障模式 | `/quickapp/runtime` |
| `05-网络通路.md` | TCP/IP、TUN over BLE、手机侧代理 | `/protocol/network` |
| `06-内核模块系统.md` | modlib、重定位、贴片函数 | `/native/modules` |
| `07-Canopus.md` | 安装器、target pack | `/native/canopus` |
| `08-Chaos.md` | 架构与结构性设计 | `/native/chaos` |
| `09-LVGL-与界面.md` | 控件树、事件派发、UI 缺陷 | `/native/lvgl` |
| `10-工具链与复现.md` | capstone、扫描脚本、复现命令 | `/tools/reversing` |
| `11-参考资料.md` | 开源项目、官方文档、社区证据 | `/tools/references` |
| `12-Canopus-地址手册.md` | 259 条符号地址 | `/tools/addresses` |
| `13-表盘打包格式.md` | `.face` 二进制结构 | `/watchface/package` |
| `14-应用隐藏与免重启模式.md` | 隐藏状态与重启行为 | `/native/app-hiding` |
| `15-圆环与ARC控件.md` | `lv_arc` 字段与绘制 | `/native/arc` |
| `16-逆向交接-控制中心与LVGL地址.md`、`17-控制中心磁贴点击-逆向进展.md` | 地址视图、磁贴回调 | `/native/control-center` |
| `18-代码审查报告.md` | Chaos 代码审查 | `/native/code-review` |
| `附录-研究历程与误判.md` | 时间线与九条误判 | `/community/history` |
| `地址表.csv` | 259 条符号的机器可读版本 | `/tools/addresses` |
| `原文索引.md` | 笔记作者写的总索引，含结论速查表与术语表 | |

## `_archive/`

早期原始记录，未经整理，只作取证用，不参与站点构建：`notes_b10.md`（140 KB）、`小米手环10-fetch-固件研究.md`（112 KB）、`notes_b9.md`（35 KB）、`Chaos-Module-分析.md`（34 KB）。

## 证据等级

| 等级 | 含义 |
| --- | --- |
| 真机实测 | 手环或手机日志里的一手输出 |
| 固件字节 | 从 `vela_ap.bin` 直接读出的字符串、指针、指令 |
| 上游源码 | NuttX、LVGL、开源项目的公开代码 |
| 社区说法 | 论坛与 issue，按机型单独标注，不作为单独依据 |

站点 frontmatter 的 `status` 只有 `sourced` 与 `unverified` 两个取值，因为本仓库不做真机验证。`sourced` 表示有上述任一等级的证据支持，具体等级写在正文里。
