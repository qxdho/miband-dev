---
title: Canopus 地址手册
models: [band10pro]
firmware: "3.101.043"
verified: 2026-10-25
status: sourced
source: "https://github.com/qxdho/miband-dev/blob/main/research/12-Canopus-地址手册.md"
contributors: [miband-dev]
---

# Canopus 地址手册

<StatusBadge status="sourced" verified="2026-10-25" />

Canopus 地址手册是固件 `3.101.043` 的函数地址清单，259 条符号记录逐条给出名称、入口地址、可调用地址与 C 原型。模块能调用的固件函数全部来自这份清单。

固件符号表已被剥离，模块加载器禁止导入符号（`symbol_imports = none`），调用只能依靠硬编码地址。259 条记录中有 55 条已封装为贴片函数。贴片函数的生成方式见[内核模块系统](/native/modules)。

## 表的范围

| 项 | 值 |
| --- | --- |
| 目标 | `xiaomi-band-10-pro-3.101.043` |
| 固件 sha256 | `519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec` |
| 固件构建 | `CONBINE_LTALM078_T3.101.043_08041658` |
| 架构 | ARMv8-M.main / Cortex-M33 / Thumb-2 / 软浮点 |
| 符号总数 | 259 |
| 封装为贴片函数 | 55 |
| 已证实 | 22 |
| 推断 | 212 |
| 已推翻 | 8 |
| 禁止调用 | 17 |

地址只对同一个 `firmware_sha256` 有效。更换固件版本后需要重新恢复整套地址，target pack 按 `firmware_sha256` 分目录存放即为此。

## 状态与调用约定

| 原始状态 | 表中用词 | 数量 | 含义 |
| --- | --- | ---: | --- |
| `STATIC_CONFIRMED` | 已证实 | 22 | 静态证据与交叉验证同时成立 |
| `STATIC_RECOVERED` | 推断 | 212 | 静态恢复出地址，未经真机调用 |
| `WITHDRAWN` | 已推翻 | 8 | 曾经收录，后因证据不足或地址被证伪而撤回 |
| `FORBIDDEN` | 禁止调用 | 17 | target pack 明确禁止调用 |

「禁止调用」是调用策略，不表示地址没有恢复。表中保留这些条目，用于说明哪些入口不可使用。

| 字段 | 含义 |
| --- | --- |
| `entry_address` | 函数真实入口，末位为 0 |
| `callable_address` | 实际写入函数指针的地址，等于 `entry_address` 按位或 1 |
| `prototype` | 从 IDA 恢复的 C 原型，参数为 `void *` 者多为未细究的句柄 |
| `policy` | `native-full-trust`、`restricted`、`forbidden` 等调用策略 |

`callable_address` 末位为 1 是 Thumb 位。`netdev_register` 的入口为 `0xc1fc214`，表中记录 `0xc1fc215`。Cortex-M33 只执行 Thumb 指令，函数指针最低位为 1 时按 Thumb 解码，漏掉这一位会以 ARM 模式跳转并触发 HardFault。详细原理见[内核模块系统](/native/modules)。

符号名前缀是 Canopus 的分类：`nuttx.` 为内核自带函数，`private_abi.` 为小米私有实现，`ui.` 为界面封装层。

## 符号表

259 条记录按 target pack 的 13 个分组列出。地址列使用 `callable_address`，原型照 `prototype` 原样抄录。状态为「已推翻」的条目地址记为 `—`，原型记为 `withdrawn`，与 target pack 保持一致。

### 01 内存 · 锁 · 时间（9 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xc201fe1` | `clock_gettime` | 读系统时钟 | `int(uint32_t, stock_timespec_t *)` | 推断 |
| `0xc1e45bd` | `errno_location` | 取 errno 变量的地址 | `int *(void)` | 推断 |
| `0xc1f8ff9` | `heap_free` | 堆释放 | `int(void *)` | 已证实 |
| `0xc1f900d` | `heap_mallinfo` | 查询堆使用统计 | `void *(void *)` | 已证实 |
| `0xc1f903d` | `heap_malloc` | 堆分配 | `void *(uint32_t)` | 已证实 |
| `0xc1f90bd` | `heap_zalloc` | 堆分配并清零 | `void *(uint32_t)` | 已证实 |
| `0xc2070d1` | `sem_post` | 释放信号量 | `int(void *)` | 已证实 |
| `0xc206bfd` | `sem_trywait` | 尝试获取信号量（不等） | `int(void *)` | 已证实 |
| `0xc206945` | `sem_wait` | 等待信号量 | `int(void *)` | 已证实 |

### 02 文件 · 设备 · 驱动注册（17 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xc1b9d81` | `close` | 关闭句柄 | `int(int)` | 推断 |
| `0xc1cec09` | `driver_close_dispatch` | 驱动的 close 分发（地址已撤） | `int(file *)` | 推断 |
| `0xc1cff89` | `driver_ioctl_dispatch` | 驱动的 ioctl 分发 | `int(file *, uint32_t, ...)` | 已证实 |
| `—` | `driver_open_dispatch` | 驱动的 open 分发（地址已撤） | `withdrawn` | 已推翻 |
| `—` | `driver_read_dispatch` | 驱动的 read 分发（地址已撤） | `withdrawn` | 已推翻 |
| `—` | `driver_write_dispatch` | 驱动的 write 分发（地址已撤） | `withdrawn` | 已推翻 |
| `0xc1d01a5` | `ioctl` | 设备控制命令 | `int32_t(int32_t, uint32_t, ...)` | 推断 |
| `0xc1d0525` | `lseek` | 移动文件读写位置 | `int64_t(int, int64_t, int)` | 推断 |
| `0xc1d0a29` | `open` | 打开文件或设备 | `int(const char *, int, ...)` | 推断 |
| `0xc1d129d` | `read` | 读文件或设备 | `int32(int, void *, uint32_t)` | 推断 |
| `0xc1affd9` | `register_blockdriver` | 注册块设备 | `int(const char *, const void *, uint32_t, void *)` | 已证实 |
| `0xc1aff61` | `register_driver` | 注册字符设备（造一个 /dev 节点） | `int(const char *, const void *, uint32_t, void *)` | 推断 |
| `0xc1d12e9` | `rename` | 重命名文件 | `int(const char *, const char *)` | 推断 |
| `0xc1d2355` | `unlink` | 删除文件 | `int(const char *)` | 推断 |
| `0xc1b009d` | `unregister_blockdriver` | 注销块设备 | `int(const char *)` | 已证实 |
| `0xc1b002d` | `unregister_driver` | 注销字符设备 | `int(const char *)` | 推断 |
| `0xc1d2641` | `write` | 写文件或设备 | `int32(int, const void *, uint32_t)` | 推断 |

### 03 模块加载（5 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xc203a51` | `insmod` | 载入一个内核模块 | `void *(const char *, const char *)` | 推断 |
| `0xc203a69` | `modhandle` | 取当前模块的句柄 | `void *(const char *)` | 推断 |
| `—` | `module_symtab_count` | 模块符号表条目数（地址已撤） | `uint32_t` | 已推翻 |
| `—` | `module_symtab_pointer` | 模块符号表指针（地址已撤） | `void *` | 已推翻 |
| `0xc203a5d` | `rmmod` | 卸载内核模块 | `int(void *)` | 推断 |

### 04 日志 · 版本（3 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0x0C0C0850` | `firmware_build_string` | 固件构建号字符串 | `const char[]` | 推断 |
| `0xc1f0d21` | `firmware_log` | 写一条系统日志 | `int(int, const char *, ...)` | 已证实 |
| `0x0C0C0810` | `firmware_version_string` | 固件版本号字符串 | `const char[]` | 推断 |

### 05 网络（17 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xc71132d` | `app_net.connect_state_update` | 通知上层：网络隧道连接状态变了 | `int(int, int)` | 推断 |
| `0xc2e8759` | `interconnect_close` | 关闭跨设备连接 | `int(void *)` | 推断 |
| `0xc2e85f5` | `interconnect_connect` | 建立跨设备连接（官方消息通道） | `int(void *, void *, const char *, canopus_interconnect_recv_cb)` | 推断 |
| `—` | `interconnect_loop` | 跨设备事件循环（地址已撤） | `void *` | 已推翻 |
| `0xc2e8685` | `interconnect_send` | 发一条跨设备消息 | `int(void *, const char *, const canopus_interconnect_message *, canopus_interconnect_send_done, void *)` | 推断 |
| `0xc1f9689` | `nuttx.devif_poll` | 轮询网卡发送队列（NuttX 网络层） | `int(void *, void *)` | 推断 |
| `0xc1e8e65` | `nuttx.gethostbyname_r` | DNS 域名解析（可重入版） | `int(const char *, void *, char *, size_t, int *, int)` | 推断 |
| `0xc1f95c9` | `nuttx.ipv4_input` | 往 TCP/IP 栈里投一个 IPv4 包（收方向） | `int(void *)` | 推断 |
| `0xc201b41` | `nuttx.net_lock` | 加网络栈全局锁 | `int(void)` | 推断 |
| `0xc201b51` | `nuttx.net_unlock` | 解网络栈全局锁 | `void(int)` | 推断 |
| `0xc1fc9f5` | `nuttx.netdev_input` | 往网卡投一个收到的包 | `int(void *, void *, int)` | 推断 |
| `0xc1fc215` | `nuttx.netdev_register` | 注册一个网卡（网络设备） | `int(void *, int)` | 推断 |
| `0xc1d0b45` | `nuttx.poll_notify` | 唤醒正在 poll 等待的线程 | `void(void *, int, unsigned int)` | 推断 |
| `0xc1fd571` | `nuttx.recvfrom` | 收 UDP 包 / 读 socket 数据 | `int32_t(int, void *, uint32_t, int, void *, uint32_t *)` | 推断 |
| `0xc1fd665` | `nuttx.sendto` | 发 UDP 包 / 写 socket 数据 | `int32_t(int, const void *, uint32_t, int, const void *, uint32_t)` | 推断 |
| `0xc1fdab5` | `nuttx.setsockopt` | 设置 socket 选项 | `int(int, int, int, const void *, uint32_t)` | 推断 |
| `0xc1cad35` | `nuttx.socket` | 创建一个 socket | `int(int, int, int)` | 推断 |

### 06 LVGL 基础（24 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xc0c21d9` | `lv_bar_create` | 创建进度条控件 | `void *(void *)` | 已证实 |
| `0xc5883d9` | `lv_bar_set_range` | 设置进度条范围 | `void(void *, int32_t, int32_t)` | 已证实 |
| `0xc5890a9` | `lv_bar_set_value` | 设置进度条当前值 | `void(void *, int32_t, uint32_t)` | 已证实 |
| `0x0c1667dd` | `lv_cache_drop` | 丢弃缓存对象 | `void(uint32_t cache, const void *key, void *user_data)` | 推断 |
| `0x0c1666ed` | `lv_cache_release` | 释放缓存引用 | `void(uint32_t cache, void *entry, void *user_data)` | 推断 |
| `0x0c13cd55` | `lv_display_get_horizontal_resolution` | 取屏幕宽度 | `int32_t(uint32_t disp)` | 推断 |
| `0x0c13cd75` | `lv_display_get_vertical_resolution` | 取屏幕高度 | `int32_t(uint32_t disp)` | 推断 |
| `0x0c105165` | `lv_display_invalidate_area` | 标记某区域需要重绘 | `void(uint32_t disp, const void *area)` | 推断 |
| `0xc588211` | `lv_event_get_code` | 取事件类型码 | `uint32_t(void *event)` | 推断 |
| `0xc588311` | `lv_event_get_user_data` | 取事件上绑的用户数据 | `void *(void *)` | 推断 |
| `0xc179f01` | `lv_image_create` | 创建图片控件 | `void *(void *)` | 已证实 |
| `0x0c143799` | `lv_image_decoder_get_info` | 取图片解码信息（宽高/格式） | `int(const void *src, void *header)` | 推断 |
| `0xc17a2f5` | `lv_image_set_src` | 设置图片源 | `void(void *, const void *)` | 已证实 |
| `0xc5883f1` | `lv_obj_add_event_cb` | 给控件绑事件回调 | `void(void *, canopus_lvx_event_cb, uint32_t, void *)` | 推断 |
| `0xc588ef1` | `lv_obj_align_to` | 相对另一个控件对齐 | `void(void *, void *, uint32_t, int32_t, int32_t)` | 推断 |
| `0x0c1068a9` | `lv_obj_get_style_prop` | 读控件的样式属性 | `uint32_t(void *obj, uint32_t part, uint32_t prop)` | 推断 |
| `0xc589551` | `lv_obj_move_to_index` | 调整控件在父级里的层序 | `void (void *, int32_t)` | 已证实 |
| `0x0c1070ad` | `lv_obj_refresh_style` | 刷新控件样式 | `void(void *obj, uint32_t selector, uint32_t prop)` | 推断 |
| `0xc588519` | `lv_obj_set_hidden` | 显示 / 隐藏控件 | `void(void *, uint32_t)` | 推断 |
| `0xc107791` | `lv_obj_set_local_style_prop` | 设置控件的局部样式属性 | `void (void *, uint32_t, uint32_t, uint32_t)` | 推断 |
| `0xc108375` | `lv_obj_set_style_bg_opa` | 设置背景不透明度 | `void (void *, uint32_t, uint32_t)` | 已证实 |
| `0x0c13c691` | `lv_obj_tree_walk` | 遍历控件树 | `void(void *obj, int (*cb)(void *, void *), void *user_data)` | 推断 |
| `0xc587ed1` | `lv_timer_create` | 创建 LVGL 定时器 | `void *(canopus_lvx_event_cb, uint32_t, void *)` | 推断 |
| `0xc588129` | `lv_timer_del` | 删除 LVGL 定时器 | `void(void *)` | 推断 |

### 07 启动器 · 应用 · 通知 · 表盘（22 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xca6a30d` | `app_install` | 安装一个原生应用到应用列表 | `int(const launcher_app_descriptor *, const firmware_page_descriptor *const *, uint32_t)` | 推断 |
| `0xc513a45` | `app_launcher_add` | 往桌面（启动器）添加一个图标 | `int(uint16_t app_id)` | 推断 |
| `0xc513e91` | `app_launcher_data_init` | 初始化启动器的数据表 | `int(void)` | 推断 |
| `0xc513b2d` | `app_launcher_del` | 从桌面移除一个图标 | `int(uint16_t)` | 推断 |
| `0xca69935` | `app_lookup` | 按名字查找已安装的应用对象 | `void *(uint16_t app_id)` | 推断 |
| `0xca69aa1` | `calendar_app_dispatch` | 把事件派发给日历应用 | `void(void *, uint32_t)` | 推断 |
| `0xca69935` | `calendar_app_lookup` | 查找日历应用对象 | `void *(uint16_t)` | 推断 |
| `0xca69e81` | `calendar_app_lookup_name` | 按名字查日历应用里的对象 | `void *(const char *)` | 推断 |
| `0xca69e55` | `calendar_app_lookup_name_other` | 按名字查日历里另一类对象 | `void *(const char *)` | 推断 |
| `0xca6996d` | `calendar_app_lookup_other` | 查日历里另一类对象 | `void *(uint16_t)` | 推断 |
| `0xc4efde9` | `calendar_app_signal` | 给日历应用发一个信号 | `void(void *, uint32_t)` | 推断 |
| `0xc5141f1` | `hidden_and_show_app_cb` | 隐藏 / 显示应用的切换回调 | `int(launcher_msg_t *)` | 推断 |
| `0xca9a899` | `lvx_notification_insert_message` | 插入一条系统通知 | `int(const firmware_notification_message *message)` | 推断 |
| `0x0c589579` | `private_abi.launcher_parent` | 启动器的父对象 | `void *(void *object)` | 推断 |
| `0x0c588269` | `private_abi.launcher_rect_init` | 初始化启动器的矩形布局 | `void(void *descriptor)` | 推断 |
| `0x0c517d9d` | `private_abi.launcher_scroll` | 启动器滚动 | `void(void *event)` | 推断 |
| `0x0c5166f1` | `private_abi.launcher_scroll_prepare` | 准备启动器滚动 | `void(void *list, int mode, int enabled)` | 推断 |
| `0xc513529` | `protobuf_set_ordered_app_list` | 用 protobuf 一次性设置桌面图标顺序 | `int(ordered_app_list_t *)` | 推断 |
| `0xc549679` | `quickapp_register_app` | 注册一个快应用 | `int(uint16_t, const canopus_interconnect_app_info *)` | 推断 |
| `0xcaa5205` | `thirdparty_submit_message_content` | 提交一条第三方消息内容 | `int(const void *, uint32_t, uint32_t)` | 推断 |
| `0xca95c69` | `watchface_manager_delete_watchface` | 删除一个表盘 | `int(const char *)` | 推断 |
| `0xc5f36c1` | `watchface_reset_watchface` | 重置当前表盘 | `int(int)` | 推断 |

### 08 lvx 组件（17 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xc5893c1` | `lvx_content_pad_bottom` | 设置内容区底部留白 | `void(void *object, int32_t value, uint32_t selector)` | 推断 |
| `0xc588f31` | `lvx_label_create` | 创建文字标签 | `void *(void *parent)` | 推断 |
| `0xc588bf9` | `lvx_label_set_long_mode` | 设置长文本模式（省略 / 换行 / 滚动） | `void(void *label, uint32_t mode)` | 推断 |
| `0xc589491` | `lvx_label_set_text` | 设置标签文字 | `void(void *label, const char *text)` | 推断 |
| `0xc4c8905` | `lvx_list_item_update` | 更新一个列表项的内容 | `int(void *, const char *, const char *, const char *, int32_t, uint8_t)` | 推断 |
| `0xc54ca3d` | `lvx_list_row_create` | 创建一行列表项 | `void *(void *parent, const char *primary, const char *secondary, uint8_t trailing)` | 推断 |
| `0xc4c8c61` | `lvx_list_row_trailing` | 设置列表行右侧的尾巴（箭头 / 图标 / 开关） | `void *(void *row)` | 推断 |
| `0xc4ca0d9` | `lvx_msgbox_create` | 创建弹框 | `void *(void *parent, void *extra)` | 推断 |
| `0xc4ca131` | `lvx_msgbox_set_content` | 设置弹框内容 | `void(void *box, uint32_t mode, const char *title, const char *body, const char *aux, const void *buttons, uint32_t count)` | 推断 |
| `0xc589189` | `lvx_object_align` | 按规则对齐控件 | `void(void *object, uint32_t align, int32_t x, int32_t y)` | 推断 |
| `0xc588de9` | `lvx_object_delete` | 删除控件 | `void(void *object)` | 推断 |
| `0xc588629` | `lvx_object_set_size` | 设置控件尺寸 | `void(void *object, int32_t width, int32_t height)` | 推断 |
| `0xca67245` | `lvx_page_content_create` | 创建页面的内容区 | `void *(void *)` | 推断 |
| `0xc4ca6c5` | `lvx_page_title_create` | 创建页面标题栏 | `void *(void *, const char *, uint32_t, canopus_lvx_event_cb, void *)` | 推断 |
| `0xc4bf899` | `lvx_style_apply` | 给控件套一套样式 | `int(void *, const void *, uint32_t, uint32_t)` | 推断 |
| `0xc179db1` | `ui.lvx_image_set_scale` | 设置图片缩放比例 | `void(void *, int32_t, int32_t)` | 推断 |
| `0xcac00c1` | `ui.lvx_object_add_flag` | 给控件加标志位 | `void(void *, uint32_t)` | 推断 |

### 09 页面 · 导航（6 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xca6b9e9` | `page_finish` | 结束当前页面、返回上一级 | `int32_t(void *page_descriptor)` | 推断 |
| `0xca6c359` | `page_goto` | 跳转到指定页面 | `int32_t(uint32_t page_key, uint32_t start_data, uint32_t param, uint32_t callbacks)` | 推断 |
| `0xc8fd12d` | `page_navigator_open_page` | 打开页面（框架内部，禁止直接调） | `function` | 禁止调用 |
| `0xc8790ed` | `system_router_app_wrapper` | 应用包装器（框架内部，禁止） | `function` | 禁止调用 |
| `0xc879285` | `system_router_get_pages_wrapper` | 取页面列表的包装器（框架内部，禁止） | `function` | 禁止调用 |
| `—` | `system_router_page_record_wrapper` | 页面记录的包装器（框架内部，禁止） | `function` | 禁止调用 |

### 10 蓝牙（46 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0x2013DBE4` | `bluetooth.miwear_bt_adapter_instance` | Miwear 层的蓝牙适配器实例 | `void *` | 推断 |
| `0x2013DBE0` | `bluetooth.miwear_bt_cpevent_registration_handle` | Miwear 层蓝牙事件注册句柄 | `uint32_t` | 推断 |
| `0xca40f69` | `bt_adapter_get_instance` | 取蓝牙适配器单例 | `void *()` | 推断 |
| `0xc3b5699` | `bt_adapter_get_scan_mode` | 读当前可发现 / 可连接模式 | `int32()` | 推断 |
| `0xc3af4f5` | `bt_adapter_get_state` | 读蓝牙开关状态 | `int32(void *)` | 推断 |
| `0xc3af3e9` | `bt_adapter_register` | 注册蓝牙适配器事件回调 | `int32(void *, const uint32_t *)` | 推断 |
| `0xc3af281` | `bt_adapter_register_a2dp_callbacks` | 注册 A2DP（音乐）回调（禁止） | `int(void *, const void *)` | 禁止调用 |
| `0xc3b0ce1` | `bt_adapter_register_hfp_ag_callbacks` | 注册 HFP-AG（通话）回调（禁止） | `int(void *, const void *)` | 禁止调用 |
| `0xc3af451` | `bt_adapter_unregister` | 注销蓝牙适配器 | `int32(void *, uint32_t)` | 推断 |
| `0xc3b60a1` | `bt_get_pairing_state` | 查当前配对流程的状态 | `uint32(const uint8_t *, uint32_t)` | 推断 |
| `0xc805b0d` | `bt_l2cap_connect` | 建立 L2CAP 通道 | `uint32_t(const void *)` | 推断 |
| `0xc3aff65` | `bt_pair_display_reply` | 回复配对时的“显示码一致”确认 | `int32(void *, const uint8_t *, int32_t, int32_t)` | 推断 |
| `0xc3b0051` | `bt_pair_request_reply` | 回复配对请求（同意 / 拒绝） | `int32(void *, const uint8_t *, int32_t)` | 推断 |
| `0xc3aeb09` | `bt_socket_server_receive` | 蓝牙 socket 事件循环收包（内部，禁止） | `internal event-source/revents/server-state callback` | 禁止调用 |
| `—` | `btsnoop_avdtp_recognizer` | 识别 btsnoop 日志里的 AVDTP 包（地址已撤） | `withdrawn` | 已推翻 |
| `0x20126738` | `core_bt_adapter_instance` | 底层蓝牙适配器实例指针 | `void *` | 推断 |
| `—` | `core_bt_callback_table` | 底层蓝牙回调表（地址已撤） | `const uint32_t[16]` | 已推翻 |
| `0xc709e91` | `core_bt_pair_request_callback` | 底层配对请求回调 | `int(void *, const uint8_t *)` | 推断 |
| `0x20126734` | `core_bt_registration_handle` | 底层蓝牙注册句柄 | `uint32_t` | 推断 |
| `0xc3b0db1` | `hfp_ag_connect` | HFP-AG 连接（禁止） | `int(void *, const void *)` | 禁止调用 |
| `0xc3b0de9` | `hfp_ag_disconnect` | HFP-AG 断开（禁止） | `int(void *, const void *)` | 禁止调用 |
| `0xc3b7599` | `offload_property_apply` | 应用蓝牙 offload 属性（禁止） | `int(void *)` | 禁止调用 |
| `0xc3b56a9` | `private_abi.bt_adapter_set_scan_mode` | 设置可发现 / 可连接模式 | `int(int, int)` | 推断 |
| `0xc840c55` | `private_abi.bt_alloc` | 蓝牙协议栈的堆分配 | `void *(uint32_t)` | 推断 |
| `0xc7eafbd` | `private_abi.bt_buffer_new` | 创建一个蓝牙数据缓冲 | `void *(uint16_t, uint16_t)` | 推断 |
| `0xc3b6899` | `private_abi.bt_create_bond_private` | 与指定地址建立配对（内部接口） | `int(const uint8_t *, uint32_t)` | 推断 |
| `0xc3af525` | `private_abi.bt_discovery_start` | 开始扫描附近蓝牙设备 | `int(void *, int)` | 推断 |
| `0xc3af551` | `private_abi.bt_discovery_stop` | 停止扫描 | `int(void *)` | 推断 |
| `0xc840c61` | `private_abi.bt_free` | 蓝牙协议栈的堆释放 | `int(void *)` | 推断 |
| `0xc3b5a61` | `private_abi.bt_get_bond_state` | 查某个地址的配对状态 | `uint32_t(const uint8_t *)` | 推断 |
| `0xc805b39` | `private_abi.bt_l2cap_disconnect` | 断开 L2CAP 通道 | `int(const void *)` | 推断 |
| `0x2013BDBC` | `private_abi.bt_l2cap_owner` | 取当前 L2CAP 的拥有者句柄 | `void *` | 推断 |
| `0xc805be9` | `private_abi.bt_l2cap_submit_cid` | 注册一个 L2CAP CID 的处理入口 | `int(void *, uint16_t)` | 推断 |
| `0xc7eb9cd` | `private_abi.bt_queue_external` | 把外部数据排进蓝牙发送队列 | `int(void *, void *, void *, void *, uint8_t)` | 推断 |
| `0xc6b9cf1` | `private_abi.bt_queue_free` | 释放蓝牙发送队列 | `int(void *)` | 推断 |
| `0xc3b697d` | `private_abi.bt_remove_bond_private` | 删除某个地址的配对记录 | `int(const uint8_t *, uint32_t)` | 推断 |
| `0xc7eb271` | `private_abi.bt_timer_add` | 给蓝牙协议栈加定时器 | `uint32_t(void *, uint32_t, uint8_t, void *, void *, const uint8_t *, uint32_t)` | 推断 |
| `0xc7eb33d` | `private_abi.bt_timer_cancel` | 取消蓝牙定时器 | `int(uint32_t *)` | 推断 |
| `0x2013C144` | `private_abi.gap_host_receive_slot` | HCI 收包回调的函数指针槽（可挂钩） | `int (*)(void *state, uint8_t *packet, int packet_length)` | 推断 |
| `0xc7ec47d` | `private_abi.gap_host_stock_receive` | 系统默认的 HCI 收包处理 | `int(void *, uint8_t *, int)` | 推断 |
| `0xc80a685` | `private_abi.sdp_builder_create` | 创建 SDP 记录构造器 | `void *(uint32_t, uint16_t, uint16_t, uint8_t, const uint8_t *)` | 推断 |
| `0xc808649` | `private_abi.sdp_commit` | 提交 SDP 记录（= 注册一个蓝牙服务） | `uint32_t(void *)` | 推断 |
| `0xc808245` | `private_abi.sdp_set_raw_attribute` | 给 SDP 记录设一条原始属性 | `uint8_t *(void *, uint16_t, uint16_t, uint16_t, const void *)` | 推断 |
| `0xc80a735` | `private_abi.sdp_unregister` | 注销 SDP 记录 | `int(uint32_t)` | 推断 |
| `0x2CD4A744` | `private_abi.stock_bt_callback_descriptor` | 系统自带蓝牙回调描述符（只读 17 字） | `const uint32_t[17]` | 推断 |
| `0xc19f105` | `vendor_hci_transport_register` | 注册厂商 HCI 传输层（禁止） | `int(int, char)` | 禁止调用 |

### 11 字体（44 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0x0c86037d` | `font_manager_add_path` | 往字体管理器注册一个字体文件路径 | `void *(const char *name, const char *path)` | 推断 |
| `0x0c860399` | `font_manager_remove_path` | 移除已注册的字体路径 | `void(uint32_t node)` | 推断 |
| `0x1c057c51` | `lvgl_posix_open` | LVGL 内部的文件打开（走 POSIX） | `function` | 推断 |
| `0x0c1666d1` | `private_abi.font_reload_cache_acquire` | 取一份字体缓存 | `void *(void *cache, const void *key, void *user_data)` | 推断 |
| `0x0c166741` | `private_abi.font_reload_cache_acquire_or_create` | 取字体缓存，没有就新建 | `void *(void *cache, const void *key, void *user_data)` | 推断 |
| `0x2cce571c` | `private_abi.font_reload_count_cache_class` | 字体“字符数缓存”的控件类 | `data` | 推断 |
| `0x0c272d39` | `private_abi.font_reload_count_cache_init` | 初始化字符数缓存 | `int(void *cache)` | 推断 |
| `0x2010317c` | `private_abi.font_reload_display_list` | 把字体列表显示出来 | `global` | 推断 |
| `0x201032a4` | `private_abi.font_reload_draw_unit_slot` | 字体绘制单元的函数槽 | `global` | 推断 |
| `0x0c163be9` | `private_abi.font_reload_drop_face_id` | 丢弃某个 face id 的字体 | `void(void *context, const char *path)` | 推断 |
| `0x1c05682d` | `private_abi.font_reload_face_compare` | 比较两个字体 face 是否相同 | `function` | 推断 |
| `0x1c056719` | `private_abi.font_reload_face_create` | 创建字体 face（一个字号+样式） | `function` | 推断 |
| `0x1c0566ed` | `private_abi.font_reload_face_destroy` | 销毁字体 face | `function` | 推断 |
| `0x20103374` | `private_abi.font_reload_freetype_context_slot` | FreeType 上下文的函数槽 | `global` | 推断 |
| `0x0c33d8bd` | `private_abi.font_reload_ft_mul_fix` | FreeType 定点数乘法 | `int32_t(int32_t value, int32_t scale)` | 推断 |
| `0x0c33ef59` | `private_abi.font_reload_ft_set_pixel_size` | 设置 FreeType 的像素大小 | `int(void *face, uint32_t size)` | 推断 |
| `0x1c056e15` | `private_abi.font_reload_glyph_metrics` | 取字形的度量（宽高/步进） | `function` | 推断 |
| `0x1c046cfd` | `private_abi.font_reload_glyph_pending_release` | 延迟释放字形 | `function` | 推断 |
| `0x1c0493bd` | `private_abi.font_reload_gradient_pending_release` | 延迟释放渐变 | `function` | 推断 |
| `0x1c04d259` | `private_abi.font_reload_image_pending_release` | 延迟释放图像 | `function` | 推断 |
| `0x0c169ce9` | `private_abi.font_reload_list_remove` | 从字体链表里摘掉一项 | `void(void *list, void *node)` | 推断 |
| `0x0c16dae5` | `private_abi.font_reload_lv_free` | 字体模块用的 LVGL free | `void(void *memory)` | 推断 |
| `0x20103178` | `private_abi.font_reload_lv_initialized` | 查询 LVGL 是否已初始化 | `global` | 推断 |
| `0x0c16daa9` | `private_abi.font_reload_lv_malloc` | 字体模块用的 LVGL malloc | `void *(uint32_t size)` | 推断 |
| `0x1c056f05` | `private_abi.font_reload_metrics_compare` | 比较两份字体度量 | `function` | 推断 |
| `0x1c056d25` | `private_abi.font_reload_metrics_create` | 创建字体度量 | `function` | 推断 |
| `0x1c056d19` | `private_abi.font_reload_metrics_destroy` | 销毁字体度量 | `function` | 推断 |
| `0x1c0572a5` | `private_abi.font_reload_outline_acquire` | 取一份矢量轮廓 | `function` | 推断 |
| `0x1c057259` | `private_abi.font_reload_outline_compare` | 比较两份矢量轮廓 | `function` | 推断 |
| `0x1c057635` | `private_abi.font_reload_outline_create` | 创建矢量轮廓 | `function` | 推断 |
| `0x1c057331` | `private_abi.font_reload_outline_destroy` | 销毁矢量轮廓 | `function` | 推断 |
| `0x1c046d09` | `private_abi.font_reload_outline_event` | 矢量轮廓的事件回调 | `function` | 推断 |
| `0x1c057289` | `private_abi.font_reload_outline_release` | 释放矢量轮廓 | `function` | 推断 |
| `0x2cce56f4` | `private_abi.font_reload_size_cache_class` | 字体“尺寸缓存”的控件类 | `data` | 推断 |
| `0x2010319c` | `private_abi.font_reload_style_refresh_enabled` | 查询样式刷新是否开着 | `global` | 推断 |
| `0x1c03debd` | `private_abi.font_reload_sw_dispatch` | 软件渲染分发 | `function` | 推断 |
| `0x20103174` | `private_abi.font_reload_uikit_slot` | UIKit 的函数槽 | `global` | 推断 |
| `0x2013eae0` | `private_abi.font_reload_vector_cache_slot` | 矢量缓存的函数槽 | `global` | 推断 |
| `0x0ca657ed` | `private_abi.font_reload_vector_compare` | 比较两份矢量缓存 | `function` | 推断 |
| `0x0ca6581d` | `private_abi.font_reload_vector_destroy` | 销毁矢量缓存 | `function` | 推断 |
| `0x2013eadc` | `private_abi.font_reload_vector_draw_unit_slot` | 矢量绘制单元的函数槽 | `global` | 推断 |
| `0x0ca65c25` | `private_abi.font_reload_vector_drop` | 丢弃矢量缓存 | `void(uint32_t unused, void *object, uint32_t unused2)` | 推断 |
| `0x2cdba868` | `private_abi.font_reload_vector_label_class` | 矢量文字控件的类 | `data` | 推断 |
| `0x1c045361` | `private_abi.font_reload_vg_dispatch` | 矢量图形（VG）绘制分发 | `function` | 推断 |

### 12 日历 · 私有界面 ABI（37 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xca6a005` | `calendar_icon_notify` | 取日历的通知图标 | `void(const char *)` | 推断 |
| `0x0c5881c1` | `private_abi.background_object_has_flag` | 查后台对象有没有某个标志位 | `int(void *object, unsigned int flags)` | 推断 |
| `0x0c588961` | `private_abi.background_object_hide` | 隐藏后台对象 | `void(void *object, unsigned int flags)` | 推断 |
| `0x0c5891b1` | `private_abi.background_object_show` | 显示后台对象 | `void(void *object, unsigned int flags)` | 推断 |
| `0x0ca41585` | `private_abi.calendar_eventbus_send` | 往日历事件总线投一个事件 | `int (uint32_t code, void *payload, uint32_t sync)` | 推断 |
| `0x0c4bf87d` | `private_abi.calendar_font_day` | 取日历“日”数字用的字体 | `uint32_t (void *font_desc)` | 推断 |
| `0x0c1e5c39` | `private_abi.calendar_localized_text` | 取日历的本地化文案 | `const char *(const char *key)` | 推断 |
| `0x0c4e35ad` | `private_abi.calendar_localtime` | 取本地时间（日历用） | `void (int64_t seconds, void *tm_out)` | 推断 |
| `0x0ca5fb41` | `private_abi.calendar_snapshot` | 抓取日历某个对象的渲染快照 | `int (uint32_t obj, uint32_t format, uint32_t draw_buf)` | 推断 |
| `0x0c588a71` | `private_abi.calendar_text_color` | 取日历的文字颜色 | `void (uint32_t obj, uint32_t color, uint32_t selector)` | 推断 |
| `0x0c5036c5` | `private_abi.control_center_scroll` | 控制中心列表的滚动 | `void(void *event)` | 推断 |
| `0x0c527bbd` | `private_abi.notifications_scroll` | 通知列表的滚动 | `void(void *event)` | 推断 |
| `0x0c5881d9` | `private_abi.p67_battery_child_count` | 电量控件的子对象数量 | `uint32_t (void *object)` | 推断 |
| `0x0c5886e1` | `private_abi.p67_battery_child_get` | 取电量控件第 N 个子对象 | `void * (void *object, int32_t index)` | 推断 |
| `0x2cd198dc` | `private_abi.p67_battery_class` | 电量控件的控件类 | `global` | 推断 |
| `0x0c587e71` | `private_abi.p67_battery_extra_draw_size` | 电量控件的额外绘制尺寸 | `uint32_t (void *object)` | 推断 |
| `0x0c5882a1` | `private_abi.p67_battery_image_draw` | 电量控件的图片绘制 | `void (void *layer, const void *descriptor, const int32_t *area)` | 推断 |
| `0x0c5882b9` | `private_abi.p67_battery_image_dsc_init` | 初始化电量图片描述符 | `void (void *descriptor)` | 推断 |
| `0x0c4c22cd` | `private_abi.p67_battery_native_event` | 电量控件的原生事件处理 | `void (const void *class_p, void *event)` | 推断 |
| `0x2010fe60` | `private_abi.p67_battery_status_slot` | 电量状态数据的函数槽 | `global` | 推断 |
| `0x0c588f89` | `private_abi.p67_blur_cache_clean` | 清空模糊缓存 | `int(uint32_t id, void *address, uint32_t length)` | 推断 |
| `0x0c588449` | `private_abi.p67_blur_cache_invalidate` | 让模糊缓存失效 | `int(uint32_t id, void *address, uint32_t length)` | 推断 |
| `0x0c50b9f1` | `private_abi.p67_blur_crossview_callback` | 跨视图模糊的回调 | `void(void *event)` | 推断 |
| `0x0c587f39` | `private_abi.p67_blur_draw_buf_create` | 创建一块绘图缓冲 | `void *(uint32_t width, uint32_t height, uint32_t format, uint32_t stride)` | 推断 |
| `0x0cac0db9` | `private_abi.p67_blur_draw_buf_destroy` | 销毁绘图缓冲 | `void(void *buf)` | 推断 |
| `0x1c07a3e9` | `private_abi.p67_blur_event_list_add` | 往模糊事件链表加一项 | `uint32_t (uint32_t list, uint32_t cb, uint32_t filter, uint32_t userdata)` | 推断 |
| `0x1c07ab49` | `private_abi.p67_blur_event_list_count` | 模糊事件链表的长度 | `uint32_t (uint32_t list)` | 推断 |
| `0x1c07a4b1` | `private_abi.p67_blur_event_list_get` | 取模糊事件链表第 N 项 | `uint32_t (uint32_t list, uint32_t index)` | 推断 |
| `0x1c07a6f9` | `private_abi.p67_blur_event_list_remove` | 从模糊事件链表移除一项 | `int (uint32_t list, uint32_t index)` | 推断 |
| `0x0c187bb1` | `private_abi.p67_blur_gpu_finish` | 等 GPU 把画面画完 | `int(void)` | 推断 |
| `0x200eb538` | `private_abi.p67_blur_pm_lock` | 电源管理锁的状态 | `global` | 推断 |
| `0xc1a79b5` | `private_abi.p67_blur_pm_relax` | 释放电源管理锁 | `int (uint32_t lock)` | 推断 |
| `0xc1a78f1` | `private_abi.p67_blur_pm_stay` | 保持电源管理锁不释放 | `int (uint32_t lock)` | 推断 |
| `0x0cac0879` | `private_abi.p67_blur_snapshot_to_buffer` | 把控件树渲染成位图写进内存（= 截屏） | `int (uint32_t root, uint32_t format, uint32_t owned_drawbuf)` | 推断 |
| `0x0c589449` | `private_abi.p67_blur_style_get` | 读模糊相关的样式属性 | `uint32_t(void *obj, uint32_t selector, uint32_t prop)` | 推断 |
| `0x2cd1f640` | `private_abi.p67_blur_watchface_root_class` | 表盘根控件的控件类 | `global` | 推断 |
| `0x0c50abb5` | `private_abi.widgets_scroll` | 控件页的滚动 | `void(void *event)` | 推断 |

### 13 服务 · 线程 · 探针（12 条）

| 地址 | 符号 | 作用 | 原型 | 状态 |
| --- | --- | --- | --- | --- |
| `0xc229f29` | `controller_crash_dump` | 主动触发控制器崩溃转储（禁止） | `int(void)` | 禁止调用 |
| `0x2010D054` | `probe.style_misans_demibold_32` | MiSans Demibold 32 字体对象（常量） | `void *` | 推断 |
| `0x2010CE44` | `probe.style_misans_regular_24` | MiSans Regular 24 字体对象（常量） | `void *` | 推断 |
| `0xc204a79` | `pthread_create_internal` | 创建线程（框架内部，禁止） | `function` | 禁止调用 |
| `—` | `public_work_queue` | 系统公共工作队列（禁止） | `function` | 禁止调用 |
| `0xc3bde45` | `service_manager_cleanup` | 清理系统服务（禁止） | `int(int)` | 禁止调用 |
| `0xc3bdd89` | `service_manager_get_profile` | 按 id 取系统服务的 profile 指针 | `void *(uint32_t)` | 已证实 |
| `0xc3bdbad` | `service_manager_register` | 注册一个系统服务 | `int(void *)` | 已证实 |
| `0xc3bdce9` | `service_manager_shutdown` | 关闭系统服务 | `int(int)` | 已证实 |
| `0xc3bdc25` | `service_manager_startup` | 启动系统服务 | `int(int)` | 已证实 |
| `0xc599671` | `sport_titlebar_dispatch` | 运动标题栏的事件分发（禁止） | `function` | 禁止调用 |
| `—` | `sport_titlebar_lifecycle_reset` | 运动标题栏的生命周期重置（禁止） | `function` | 禁止调用 |

## CSV 获取

平铺数据位于仓库的 `research/地址表.csv`，一行一条符号，共 259 行数据。文件可直接下载：[地址表.csv](https://github.com/qxdho/miband-dev/blob/main/research/地址表.csv)。

| 列 | 内容 |
| --- | --- |
| `symbol_id` | 目标名加符号名的完整标识 |
| `name` | 符号名 |
| `zh` | 中文用途 |
| `kind` | 记录类型，如 `function`、`data`、`global` |
| `entry_address` | 函数入口 |
| `callable_address` | 带 Thumb 位的调用地址 |
| `prototype` | C 原型 |
| `status` | `STATIC_CONFIRMED` 等原始状态 |
| `approval_state` | `APPROVED`、`REJECTED`、`PENDING` 等审核状态 |
| `policy` | 调用策略 |
| `notes` | 恢复来源与备注 |

CSV 由 `tools/canopus_symbols.js` 从 target pack 的 259 个符号 JSON 直接生成，不是手抄。

## 可做性分析

前提是 `callable_address` 直接作为函数指针使用，原型照 `prototype` 抄录，Thumb 位已经置 1。212 条「推断」地址没有在真机调用过，第一次调用需要兜底。

### 已验证的路径

| 能力 | 需要的符号 | 先例 |
| --- | --- | --- |
| 往桌面添加原生应用图标 | `app_install`、`app_launcher_add`、`protobuf_set_ordered_app_list` | Chaos |
| 接管界面并自绘页面 | `lvx_page_content_create`、`lvx_page_title_create`、`lv_*` 系列、`lvx_list_row_create` | Canopus |
| 更换字体 | `font_manager_add_path` | 未见 |
| 弹出系统通知 | `lvx_notification_insert_message`，配合 `types/firmware_notification_message.json` | 未见 |
| 跨设备收发消息 | `interconnect_connect`、`interconnect_send`、`interconnect_close` | 官方消息通道 |

### 尚未验证的方向

| 方向 | 函数组合 | 能力 |
| --- | --- | --- |
| 手环截屏 | `p67_blur_snapshot_to_buffer`、`p67_blur_draw_buf_create`、`p67_blur_gpu_finish`、`p67_blur_draw_buf_destroy`、`write` | 把控件树渲染为位图写入 `/data`，手环本身没有截屏功能 |
| 蓝牙自定义服务与 HID | `bt_adapter_register`、`gap_host_receive_slot`、`sdp_builder_create`、`sdp_commit`、`sdp_set_raw_attribute`、`sdp_unregister` | 挂钩 HCI 收包并注册自定义 SDP 记录，可做蓝牙键盘、媒体遥控器或自定义 BLE 服务 |
| 通知与日程注入 | `calendar_eventbus_send`、`calendar_app_lookup_name` | 往日历事件总线投递事件，取得日历应用对象 |
| 系统服务对象 | `service_manager_get_profile`、`service_manager_register` | 读取服务 profile 指针，两者都属「已证实」 |
| 自造 `/dev` 节点 | `register_driver`、`unregister_driver` | 注册字符设备，结构定义在 `types/file_operations.json` |
| 文件系统读写 | `open`、`read`、`write`、`lseek`、`rename`、`unlink`、`errno_location` | 读写 `/data` 下的文件，不依赖 root shell |
| 精确计时 | `clock_gettime` | 读取系统时钟，配合 `types/stock_timespec.json` |

`gap_host_receive_slot` 位于 `0x2013C144`，是全局函数指针槽，类型为 `int (*)(void *state, uint8_t *packet, int packet_length)`，可以直接挂钩收 HCI 包。

截屏按三步执行：`p67_blur_draw_buf_create` 开绘图缓冲，`p67_blur_snapshot_to_buffer` 抓取控件树，`p67_blur_gpu_finish` 等待 GPU 绘制完成后用 `write` 落盘。

### 禁止调用的符号

| 符号 | 原因 |
| --- | --- |
| `page_navigator_open_page`、`system_router_app_wrapper`、`system_router_get_pages_wrapper`、`system_router_page_record_wrapper` | 换页会打乱框架的页面栈 |
| `controller_crash_dump` | 主动触发控制器崩溃转储 |
| `pthread_create_internal`、`public_work_queue` | 线程与工作队列契约未恢复 |
| `bt_adapter_register_a2dp_callbacks`、`bt_adapter_register_hfp_ag_callbacks`、`hfp_ag_connect`、`hfp_ag_disconnect`、`offload_property_apply` | 回调结构体未恢复 |
| `vendor_hci_transport_register` | 抢占 HCI 传输层会使蓝牙失效 |
| 8 条「已推翻」记录 | 地址已被证伪，不可用于生产 |

### 网络链路

网络组 17 条符号已经覆盖完整链路：`netdev_register` 注册网卡，`ipv4_input` 与 `netdev_input` 注入收包，`devif_poll` 与 `poll_notify` 驱动轮询，`socket`、`sendto`、`recvfrom` 提供套接字接口，`gethostbyname_r` 提供 DNS 解析，`net_lock` 与 `net_unlock` 保护网络栈，外加 `heap_malloc`、`heap_zalloc`、`heap_free` 负责缓冲分配。缺的部分是 TUN 驱动本体，第一步是用 `register_driver` 注册一个自定义字符设备。

网络组全部标注引用 `EVID-NET-001`，`evidence/` 目录中没有这个文件，38 个证据文件只覆盖 BT、UI、IO、FONT、MODLIB 系列。这条证据链比其他组薄，`netdev_register` 的地址需要独立复核后才能用于生产。

## 相关页面

- 加载器与安装流程：[Canopus](/native/canopus)
- 贴片函数、重定位与 Thumb 位：[内核模块系统](/native/modules)
- 模块的部署与运行：[Chaos](/native/chaos)
- 固件符号恢复流程：[逆向工程](/tools/reversing)
- 固件分区与镜像格式：[固件包格式](/firmware/package)
