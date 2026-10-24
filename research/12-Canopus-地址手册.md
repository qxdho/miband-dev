# 12 · Canopus 3.101.043 地址手册

> 本文的表格由 `tools/canopus_symbols.js` 从 Canopus target pack 的 259 个符号 JSON 直接生成，
> 不是手抄。原始数据在 `projects/canopus/targets/xiaomi-band-10-pro-3.101.043/symbols/`。
> 平铺版本见 [`地址表.csv`](地址表.csv)。

## 这是什么

Canopus 为固件 `3.101.043` 整理的一张**函数地址表**：名字、入口地址、可调用地址、C 原型。
内核模块只能调用表里列出的函数——模块本身不带符号解析能力（`symbol_imports = "none"`），
所以这张表就是“能调用的全部东西”。

| 项 | 值 |
|---|---|
| 目标 | `xiaomi-band-10-pro-3.101.043` |
| 固件 sha256 | `519307675665e4866d722a8119a98589c397b614ac3294cb87bfc86de45756ec` |
| 固件构建 | `CONBINE_LTALM078_T3.101.043_08041658` |
| 架构 | ARMv8-M.main / Cortex-M33 / Thumb-2 / 软浮点 |
| 符号总数 | 259 |

### 状态含义

| 状态 | 中文 | 数量 | 含义 |
|---|---|---:|---|
| `STATIC_RECOVERED` | 静态恢复 | 212 | 静态恢复出地址，未经真机验证 |
| `FORBIDDEN` | 禁止调用 | 17 | 明确禁止调用（会破坏系统或已证明不可用） |
| `WITHDRAWN` | 已撤回 | 8 | 曾经收录、后因证据不足撤回 |
| `STATIC_CONFIRMED` | 已确认 | 22 | 既有静态证据又有交叉验证 |

### 调用约定

| 字段 | 含义 |
|---|---|
| `entry_address` | 函数真实入口（低位为 0） |
| `callable_address` | **实际用来调用的地址**（Thumb 位已置 1，即 `entry \| 1`） |
| `prototype` | 从 IDA 复原的 C 原型，参数名为 `void *` 者多为未细究的句柄 |
| `policy` | `native-full-trust` 等，表示该符号允许被模块直接使用 |

### 一行怎么读

取一条实际的：

> `nuttx.netdev_register` | **注册一个网卡（网络设备）** | `0xc1fc215` | `int(void *, int)` | 🟡 静态恢复

- 第二列是中文用途——这是“这个地址能干什么”。
- 地址 `0xc1fc215` 就是内存里那个函数的位置，把它转成函数指针即可调用（最低位 1 是 Thumb 标记，不是地址的一部分）。
- `int(void *, int)` 是它的参数表：传两个参数，返回 int。`void *` 表示“某个结构体指针”，具体是什么需要看同组的其他符号或 `types/` 里的结构定义。
- 状态 `🟡 静态恢复` 表示地址是从固件里静态分析出来的，**还没有人在真机上调用过**。

> 名字里的前缀只是 Canopus 的分类：`nuttx.` = 内核自带函数，`private_abi.` = 小米私有实现，`ui.` = 界面封装层。

## 全表（按类别）

### 01 内存 · 锁 · 时间（9）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `clock_gettime` | 读系统时钟 | `0xc201fe1` | `int(uint32_t, stock_timespec_t *)` | 🟡 静态恢复 |
| 2 | `errno_location` | 取 errno 变量的地址 | `0xc1e45bd` | `int *(void)` | 🟡 静态恢复 |
| 3 | `heap_free` | 堆释放 | `0xc1f8ff9` | `int(void *)` | 🟢 已确认 |
| 4 | `heap_mallinfo` | 查询堆使用统计 | `0xc1f900d` | `void *(void *)` | 🟢 已确认 |
| 5 | `heap_malloc` | 堆分配 | `0xc1f903d` | `void *(uint32_t)` | 🟢 已确认 |
| 6 | `heap_zalloc` | 堆分配并清零 | `0xc1f90bd` | `void *(uint32_t)` | 🟢 已确认 |
| 7 | `sem_post` | 释放信号量 | `0xc2070d1` | `int(void *)` | 🟢 已确认 |
| 8 | `sem_trywait` | 尝试获取信号量（不等） | `0xc206bfd` | `int(void *)` | 🟢 已确认 |
| 9 | `sem_wait` | 等待信号量 | `0xc206945` | `int(void *)` | 🟢 已确认 |

### 02 文件 · 设备 · 驱动注册（17）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `close` | 关闭句柄 | `0xc1b9d81` | `int(int)` | 🟡 静态恢复 |
| 2 | `driver_close_dispatch` | 驱动的 close 分发（地址已撤） | `0xc1cec09` | `int(file *)` | 🟡 静态恢复 |
| 3 | `driver_ioctl_dispatch` | 驱动的 ioctl 分发 | `0xc1cff89` | `int(file *, uint32_t, ...)` | 🟢 已确认 |
| 4 | `driver_open_dispatch` | 驱动的 open 分发（地址已撤） | `—` | `withdrawn` | ⚪ 已撤回 |
| 5 | `driver_read_dispatch` | 驱动的 read 分发（地址已撤） | `—` | `withdrawn` | ⚪ 已撤回 |
| 6 | `driver_write_dispatch` | 驱动的 write 分发（地址已撤） | `—` | `withdrawn` | ⚪ 已撤回 |
| 7 | `ioctl` | 设备控制命令 | `0xc1d01a5` | `int32_t(int32_t, uint32_t, ...)` | 🟡 静态恢复 |
| 8 | `lseek` | 移动文件读写位置 | `0xc1d0525` | `int64_t(int, int64_t, int)` | 🟡 静态恢复 |
| 9 | `open` | 打开文件或设备 | `0xc1d0a29` | `int(const char *, int, ...)` | 🟡 静态恢复 |
| 10 | `read` | 读文件或设备 | `0xc1d129d` | `int32(int, void *, uint32_t)` | 🟡 静态恢复 |
| 11 | `register_blockdriver` | 注册块设备 | `0xc1affd9` | `int(const char *, const void *, uint32_t, void *)` | 🟢 已确认 |
| 12 | `register_driver` | 注册字符设备（造一个 /dev 节点） | `0xc1aff61` | `int(const char *, const void *, uint32_t, void *)` | 🟡 静态恢复 |
| 13 | `rename` | 重命名文件 | `0xc1d12e9` | `int(const char *, const char *)` | 🟡 静态恢复 |
| 14 | `unlink` | 删除文件 | `0xc1d2355` | `int(const char *)` | 🟡 静态恢复 |
| 15 | `unregister_blockdriver` | 注销块设备 | `0xc1b009d` | `int(const char *)` | 🟢 已确认 |
| 16 | `unregister_driver` | 注销字符设备 | `0xc1b002d` | `int(const char *)` | 🟡 静态恢复 |
| 17 | `write` | 写文件或设备 | `0xc1d2641` | `int32(int, const void *, uint32_t)` | 🟡 静态恢复 |

### 03 模块加载（5）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `insmod` | 载入一个内核模块 | `0xc203a51` | `void *(const char *, const char *)` | 🟡 静态恢复 |
| 2 | `modhandle` | 取当前模块的句柄 | `0xc203a69` | `void *(const char *)` | 🟡 静态恢复 |
| 3 | `module_symtab_count` | 模块符号表条目数（地址已撤） | `—` | `uint32_t` | ⚪ 已撤回 |
| 4 | `module_symtab_pointer` | 模块符号表指针（地址已撤） | `—` | `void *` | ⚪ 已撤回 |
| 5 | `rmmod` | 卸载内核模块 | `0xc203a5d` | `int(void *)` | 🟡 静态恢复 |

### 04 日志 · 版本（3）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `firmware_build_string` | 固件构建号字符串 | `0x0C0C0850` | `const char[]` | 🟡 静态恢复 |
| 2 | `firmware_log` | 写一条系统日志 | `0xc1f0d21` | `int(int, const char *, ...)` | 🟢 已确认 |
| 3 | `firmware_version_string` | 固件版本号字符串 | `0x0C0C0810` | `const char[]` | 🟡 静态恢复 |

### 05 网络（17）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `app_net.connect_state_update` | 通知上层：网络隧道连接状态变了 | `0xc71132d` | `int(int, int)` | 🟡 静态恢复 |
| 2 | `interconnect_close` | 关闭跨设备连接 | `0xc2e8759` | `int(void *)` | 🟡 静态恢复 |
| 3 | `interconnect_connect` | 建立跨设备连接（官方消息通道） | `0xc2e85f5` | `int(void *, void *, const char *, canopus_interconnect_recv_cb)` | 🟡 静态恢复 |
| 4 | `interconnect_loop` | 跨设备事件循环（地址已撤） | `—` | `void *` | ⚪ 已撤回 |
| 5 | `interconnect_send` | 发一条跨设备消息 | `0xc2e8685` | `int(void *, const char *, const canopus_interconnect_message *, canopus_interconnect_send_done, void *)` | 🟡 静态恢复 |
| 6 | `nuttx.devif_poll` | 轮询网卡发送队列（NuttX 网络层） | `0xc1f9689` | `int(void *, void *)` | 🟡 静态恢复 |
| 7 | `nuttx.gethostbyname_r` | DNS 域名解析（可重入版） | `0xc1e8e65` | `int(const char *, void *, char *, size_t, int *, int)` | 🟡 静态恢复 |
| 8 | `nuttx.ipv4_input` | 往 TCP/IP 栈里投一个 IPv4 包（收方向） | `0xc1f95c9` | `int(void *)` | 🟡 静态恢复 |
| 9 | `nuttx.net_lock` | 加网络栈全局锁 | `0xc201b41` | `int(void)` | 🟡 静态恢复 |
| 10 | `nuttx.net_unlock` | 解网络栈全局锁 | `0xc201b51` | `void(int)` | 🟡 静态恢复 |
| 11 | `nuttx.netdev_input` | 往网卡投一个收到的包 | `0xc1fc9f5` | `int(void *, void *, int)` | 🟡 静态恢复 |
| 12 | `nuttx.netdev_register` | 注册一个网卡（网络设备） | `0xc1fc215` | `int(void *, int)` | 🟡 静态恢复 |
| 13 | `nuttx.poll_notify` | 唤醒正在 poll 等待的线程 | `0xc1d0b45` | `void(void *, int, unsigned int)` | 🟡 静态恢复 |
| 14 | `nuttx.recvfrom` | 收 UDP 包 / 读 socket 数据 | `0xc1fd571` | `int32_t(int, void *, uint32_t, int, void *, uint32_t *)` | 🟡 静态恢复 |
| 15 | `nuttx.sendto` | 发 UDP 包 / 写 socket 数据 | `0xc1fd665` | `int32_t(int, const void *, uint32_t, int, const void *, uint32_t)` | 🟡 静态恢复 |
| 16 | `nuttx.setsockopt` | 设置 socket 选项 | `0xc1fdab5` | `int(int, int, int, const void *, uint32_t)` | 🟡 静态恢复 |
| 17 | `nuttx.socket` | 创建一个 socket | `0xc1cad35` | `int(int, int, int)` | 🟡 静态恢复 |

### 06 LVGL 基础（24）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `lv_bar_create` | 创建进度条控件 | `0xc0c21d9` | `void *(void *)` | 🟢 已确认 |
| 2 | `lv_bar_set_range` | 设置进度条范围 | `0xc5883d9` | `void(void *, int32_t, int32_t)` | 🟢 已确认 |
| 3 | `lv_bar_set_value` | 设置进度条当前值 | `0xc5890a9` | `void(void *, int32_t, uint32_t)` | 🟢 已确认 |
| 4 | `lv_cache_drop` | 丢弃缓存对象 | `0x0c1667dd` | `void(uint32_t cache, const void *key, void *user_data)` | 🟡 静态恢复 |
| 5 | `lv_cache_release` | 释放缓存引用 | `0x0c1666ed` | `void(uint32_t cache, void *entry, void *user_data)` | 🟡 静态恢复 |
| 6 | `lv_display_get_horizontal_resolution` | 取屏幕宽度 | `0x0c13cd55` | `int32_t(uint32_t disp)` | 🟡 静态恢复 |
| 7 | `lv_display_get_vertical_resolution` | 取屏幕高度 | `0x0c13cd75` | `int32_t(uint32_t disp)` | 🟡 静态恢复 |
| 8 | `lv_display_invalidate_area` | 标记某区域需要重绘 | `0x0c105165` | `void(uint32_t disp, const void *area)` | 🟡 静态恢复 |
| 9 | `lv_event_get_code` | 取事件类型码 | `0xc588211` | `uint32_t(void *event)` | 🟡 静态恢复 |
| 10 | `lv_event_get_user_data` | 取事件上绑的用户数据 | `0xc588311` | `void *(void *)` | 🟡 静态恢复 |
| 11 | `lv_image_create` | 创建图片控件 | `0xc179f01` | `void *(void *)` | 🟢 已确认 |
| 12 | `lv_image_decoder_get_info` | 取图片解码信息（宽高/格式） | `0x0c143799` | `int(const void *src, void *header)` | 🟡 静态恢复 |
| 13 | `lv_image_set_src` | 设置图片源 | `0xc17a2f5` | `void(void *, const void *)` | 🟢 已确认 |
| 14 | `lv_obj_add_event_cb` | 给控件绑事件回调 | `0xc5883f1` | `void(void *, canopus_lvx_event_cb, uint32_t, void *)` | 🟡 静态恢复 |
| 15 | `lv_obj_align_to` | 相对另一个控件对齐 | `0xc588ef1` | `void(void *, void *, uint32_t, int32_t, int32_t)` | 🟡 静态恢复 |
| 16 | `lv_obj_get_style_prop` | 读控件的样式属性 | `0x0c1068a9` | `uint32_t(void *obj, uint32_t part, uint32_t prop)` | 🟡 静态恢复 |
| 17 | `lv_obj_move_to_index` | 调整控件在父级里的层序 | `0xc589551` | `void (void *, int32_t)` | 🟢 已确认 |
| 18 | `lv_obj_refresh_style` | 刷新控件样式 | `0x0c1070ad` | `void(void *obj, uint32_t selector, uint32_t prop)` | 🟡 静态恢复 |
| 19 | `lv_obj_set_hidden` | 显示 / 隐藏控件 | `0xc588519` | `void(void *, uint32_t)` | 🟡 静态恢复 |
| 20 | `lv_obj_set_local_style_prop` | 设置控件的局部样式属性 | `0xc107791` | `void (void *, uint32_t, uint32_t, uint32_t)` | 🟡 静态恢复 |
| 21 | `lv_obj_set_style_bg_opa` | 设置背景不透明度 | `0xc108375` | `void (void *, uint32_t, uint32_t)` | 🟢 已确认 |
| 22 | `lv_obj_tree_walk` | 遍历控件树 | `0x0c13c691` | `void(void *obj, int (*cb)(void *, void *), void *user_data)` | 🟡 静态恢复 |
| 23 | `lv_timer_create` | 创建 LVGL 定时器 | `0xc587ed1` | `void *(canopus_lvx_event_cb, uint32_t, void *)` | 🟡 静态恢复 |
| 24 | `lv_timer_del` | 删除 LVGL 定时器 | `0xc588129` | `void(void *)` | 🟡 静态恢复 |

### 07 启动器 · 应用 · 通知 · 表盘（22）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `app_install` | 安装一个原生应用到应用列表 | `0xca6a30d` | `int(const launcher_app_descriptor *, const firmware_page_descriptor *const *, uint32_t)` | 🟡 静态恢复 |
| 2 | `app_launcher_add` | 往桌面（启动器）添加一个图标 | `0xc513a45` | `int(uint16_t app_id)` | 🟡 静态恢复 |
| 3 | `app_launcher_data_init` | 初始化启动器的数据表 | `0xc513e91` | `int(void)` | 🟡 静态恢复 |
| 4 | `app_launcher_del` | 从桌面移除一个图标 | `0xc513b2d` | `int(uint16_t)` | 🟡 静态恢复 |
| 5 | `app_lookup` | 按名字查找已安装的应用对象 | `0xca69935` | `void *(uint16_t app_id)` | 🟡 静态恢复 |
| 6 | `calendar_app_dispatch` | 把事件派发给日历应用 | `0xca69aa1` | `void(void *, uint32_t)` | 🟡 静态恢复 |
| 7 | `calendar_app_lookup` | 查找日历应用对象 | `0xca69935` | `void *(uint16_t)` | 🟡 静态恢复 |
| 8 | `calendar_app_lookup_name` | 按名字查日历应用里的对象 | `0xca69e81` | `void *(const char *)` | 🟡 静态恢复 |
| 9 | `calendar_app_lookup_name_other` | 按名字查日历里另一类对象 | `0xca69e55` | `void *(const char *)` | 🟡 静态恢复 |
| 10 | `calendar_app_lookup_other` | 查日历里另一类对象 | `0xca6996d` | `void *(uint16_t)` | 🟡 静态恢复 |
| 11 | `calendar_app_signal` | 给日历应用发一个信号 | `0xc4efde9` | `void(void *, uint32_t)` | 🟡 静态恢复 |
| 12 | `hidden_and_show_app_cb` | 隐藏 / 显示应用的切换回调 | `0xc5141f1` | `int(launcher_msg_t *)` | 🟡 静态恢复 |
| 13 | `lvx_notification_insert_message` | 插入一条系统通知 | `0xca9a899` | `int(const firmware_notification_message *message)` | 🟡 静态恢复 |
| 14 | `private_abi.launcher_parent` | 启动器的父对象 | `0x0c589579` | `void *(void *object)` | 🟡 静态恢复 |
| 15 | `private_abi.launcher_rect_init` | 初始化启动器的矩形布局 | `0x0c588269` | `void(void *descriptor)` | 🟡 静态恢复 |
| 16 | `private_abi.launcher_scroll` | 启动器滚动 | `0x0c517d9d` | `void(void *event)` | 🟡 静态恢复 |
| 17 | `private_abi.launcher_scroll_prepare` | 准备启动器滚动 | `0x0c5166f1` | `void(void *list, int mode, int enabled)` | 🟡 静态恢复 |
| 18 | `protobuf_set_ordered_app_list` | 用 protobuf 一次性设置桌面图标顺序 | `0xc513529` | `int(ordered_app_list_t *)` | 🟡 静态恢复 |
| 19 | `quickapp_register_app` | 注册一个快应用 | `0xc549679` | `int(uint16_t, const canopus_interconnect_app_info *)` | 🟡 静态恢复 |
| 20 | `thirdparty_submit_message_content` | 提交一条第三方消息内容 | `0xcaa5205` | `int(const void *, uint32_t, uint32_t)` | 🟡 静态恢复 |
| 21 | `watchface_manager_delete_watchface` | 删除一个表盘 | `0xca95c69` | `int(const char *)` | 🟡 静态恢复 |
| 22 | `watchface_reset_watchface` | 重置当前表盘 | `0xc5f36c1` | `int(int)` | 🟡 静态恢复 |

### 08 lvx 组件（17）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `lvx_content_pad_bottom` | 设置内容区底部留白 | `0xc5893c1` | `void(void *object, int32_t value, uint32_t selector)` | 🟡 静态恢复 |
| 2 | `lvx_label_create` | 创建文字标签 | `0xc588f31` | `void *(void *parent)` | 🟡 静态恢复 |
| 3 | `lvx_label_set_long_mode` | 设置长文本模式（省略 / 换行 / 滚动） | `0xc588bf9` | `void(void *label, uint32_t mode)` | 🟡 静态恢复 |
| 4 | `lvx_label_set_text` | 设置标签文字 | `0xc589491` | `void(void *label, const char *text)` | 🟡 静态恢复 |
| 5 | `lvx_list_item_update` | 更新一个列表项的内容 | `0xc4c8905` | `int(void *, const char *, const char *, const char *, int32_t, uint8_t)` | 🟡 静态恢复 |
| 6 | `lvx_list_row_create` | 创建一行列表项 | `0xc54ca3d` | `void *(void *parent, const char *primary, const char *secondary, uint8_t trailing)` | 🟡 静态恢复 |
| 7 | `lvx_list_row_trailing` | 设置列表行右侧的尾巴（箭头 / 图标 / 开关） | `0xc4c8c61` | `void *(void *row)` | 🟡 静态恢复 |
| 8 | `lvx_msgbox_create` | 创建弹框 | `0xc4ca0d9` | `void *(void *parent, void *extra)` | 🟡 静态恢复 |
| 9 | `lvx_msgbox_set_content` | 设置弹框内容 | `0xc4ca131` | `void(void *box, uint32_t mode, const char *title, const char *body, const char *aux, const void *buttons, uint32_t count)` | 🟡 静态恢复 |
| 10 | `lvx_object_align` | 按规则对齐控件 | `0xc589189` | `void(void *object, uint32_t align, int32_t x, int32_t y)` | 🟡 静态恢复 |
| 11 | `lvx_object_delete` | 删除控件 | `0xc588de9` | `void(void *object)` | 🟡 静态恢复 |
| 12 | `lvx_object_set_size` | 设置控件尺寸 | `0xc588629` | `void(void *object, int32_t width, int32_t height)` | 🟡 静态恢复 |
| 13 | `lvx_page_content_create` | 创建页面的内容区 | `0xca67245` | `void *(void *)` | 🟡 静态恢复 |
| 14 | `lvx_page_title_create` | 创建页面标题栏 | `0xc4ca6c5` | `void *(void *, const char *, uint32_t, canopus_lvx_event_cb, void *)` | 🟡 静态恢复 |
| 15 | `lvx_style_apply` | 给控件套一套样式 | `0xc4bf899` | `int(void *, const void *, uint32_t, uint32_t)` | 🟡 静态恢复 |
| 16 | `ui.lvx_image_set_scale` | 设置图片缩放比例 | `0xc179db1` | `void(void *, int32_t, int32_t)` | 🟡 静态恢复 |
| 17 | `ui.lvx_object_add_flag` | 给控件加标志位 | `0xcac00c1` | `void(void *, uint32_t)` | 🟡 静态恢复 |

### 09 页面 · 导航（6）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `page_finish` | 结束当前页面、返回上一级 | `0xca6b9e9` | `int32_t(void *page_descriptor)` | 🟡 静态恢复 |
| 2 | `page_goto` | 跳转到指定页面 | `0xca6c359` | `int32_t(uint32_t page_key, uint32_t start_data, uint32_t param, uint32_t callbacks)` | 🟡 静态恢复 |
| 3 | `page_navigator_open_page` | 打开页面（框架内部，禁止直接调） | `0xc8fd12d` | `function` | ⛔ 禁止调用 |
| 4 | `system_router_app_wrapper` | 应用包装器（框架内部，禁止） | `0xc8790ed` | `function` | ⛔ 禁止调用 |
| 5 | `system_router_get_pages_wrapper` | 取页面列表的包装器（框架内部，禁止） | `0xc879285` | `function` | ⛔ 禁止调用 |
| 6 | `system_router_page_record_wrapper` | 页面记录的包装器（框架内部，禁止） | `—` | `function` | ⛔ 禁止调用 |

### 10 蓝牙（46）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `bluetooth.miwear_bt_adapter_instance` | Miwear 层的蓝牙适配器实例 | `0x2013DBE4` | `void *` | 🟡 静态恢复 |
| 2 | `bluetooth.miwear_bt_cpevent_registration_handle` | Miwear 层蓝牙事件注册句柄 | `0x2013DBE0` | `uint32_t` | 🟡 静态恢复 |
| 3 | `bt_adapter_get_instance` | 取蓝牙适配器单例 | `0xca40f69` | `void *()` | 🟡 静态恢复 |
| 4 | `bt_adapter_get_scan_mode` | 读当前可发现 / 可连接模式 | `0xc3b5699` | `int32()` | 🟡 静态恢复 |
| 5 | `bt_adapter_get_state` | 读蓝牙开关状态 | `0xc3af4f5` | `int32(void *)` | 🟡 静态恢复 |
| 6 | `bt_adapter_register` | 注册蓝牙适配器事件回调 | `0xc3af3e9` | `int32(void *, const uint32_t *)` | 🟡 静态恢复 |
| 7 | `bt_adapter_register_a2dp_callbacks` | 注册 A2DP（音乐）回调（禁止） | `0xc3af281` | `int(void *, const void *)` | ⛔ 禁止调用 |
| 8 | `bt_adapter_register_hfp_ag_callbacks` | 注册 HFP-AG（通话）回调（禁止） | `0xc3b0ce1` | `int(void *, const void *)` | ⛔ 禁止调用 |
| 9 | `bt_adapter_unregister` | 注销蓝牙适配器 | `0xc3af451` | `int32(void *, uint32_t)` | 🟡 静态恢复 |
| 10 | `bt_get_pairing_state` | 查当前配对流程的状态 | `0xc3b60a1` | `uint32(const uint8_t *, uint32_t)` | 🟡 静态恢复 |
| 11 | `bt_l2cap_connect` | 建立 L2CAP 通道 | `0xc805b0d` | `uint32_t(const void *)` | 🟡 静态恢复 |
| 12 | `bt_pair_display_reply` | 回复配对时的“显示码一致”确认 | `0xc3aff65` | `int32(void *, const uint8_t *, int32_t, int32_t)` | 🟡 静态恢复 |
| 13 | `bt_pair_request_reply` | 回复配对请求（同意 / 拒绝） | `0xc3b0051` | `int32(void *, const uint8_t *, int32_t)` | 🟡 静态恢复 |
| 14 | `bt_socket_server_receive` | 蓝牙 socket 事件循环收包（内部，禁止） | `0xc3aeb09` | `internal event-source/revents/server-state callback` | ⛔ 禁止调用 |
| 15 | `btsnoop_avdtp_recognizer` | 识别 btsnoop 日志里的 AVDTP 包（地址已撤） | `—` | `withdrawn` | ⚪ 已撤回 |
| 16 | `core_bt_adapter_instance` | 底层蓝牙适配器实例指针 | `0x20126738` | `void *` | 🟡 静态恢复 |
| 17 | `core_bt_callback_table` | 底层蓝牙回调表（地址已撤） | `—` | `const uint32_t[16]` | ⚪ 已撤回 |
| 18 | `core_bt_pair_request_callback` | 底层配对请求回调 | `0xc709e91` | `int(void *, const uint8_t *)` | 🟡 静态恢复 |
| 19 | `core_bt_registration_handle` | 底层蓝牙注册句柄 | `0x20126734` | `uint32_t` | 🟡 静态恢复 |
| 20 | `hfp_ag_connect` | HFP-AG 连接（禁止） | `0xc3b0db1` | `int(void *, const void *)` | ⛔ 禁止调用 |
| 21 | `hfp_ag_disconnect` | HFP-AG 断开（禁止） | `0xc3b0de9` | `int(void *, const void *)` | ⛔ 禁止调用 |
| 22 | `offload_property_apply` | 应用蓝牙 offload 属性（禁止） | `0xc3b7599` | `int(void *)` | ⛔ 禁止调用 |
| 23 | `private_abi.bt_adapter_set_scan_mode` | 设置可发现 / 可连接模式 | `0xc3b56a9` | `int(int, int)` | 🟡 静态恢复 |
| 24 | `private_abi.bt_alloc` | 蓝牙协议栈的堆分配 | `0xc840c55` | `void *(uint32_t)` | 🟡 静态恢复 |
| 25 | `private_abi.bt_buffer_new` | 创建一个蓝牙数据缓冲 | `0xc7eafbd` | `void *(uint16_t, uint16_t)` | 🟡 静态恢复 |
| 26 | `private_abi.bt_create_bond_private` | 与指定地址建立配对（内部接口） | `0xc3b6899` | `int(const uint8_t *, uint32_t)` | 🟡 静态恢复 |
| 27 | `private_abi.bt_discovery_start` | 开始扫描附近蓝牙设备 | `0xc3af525` | `int(void *, int)` | 🟡 静态恢复 |
| 28 | `private_abi.bt_discovery_stop` | 停止扫描 | `0xc3af551` | `int(void *)` | 🟡 静态恢复 |
| 29 | `private_abi.bt_free` | 蓝牙协议栈的堆释放 | `0xc840c61` | `int(void *)` | 🟡 静态恢复 |
| 30 | `private_abi.bt_get_bond_state` | 查某个地址的配对状态 | `0xc3b5a61` | `uint32_t(const uint8_t *)` | 🟡 静态恢复 |
| 31 | `private_abi.bt_l2cap_disconnect` | 断开 L2CAP 通道 | `0xc805b39` | `int(const void *)` | 🟡 静态恢复 |
| 32 | `private_abi.bt_l2cap_owner` | 取当前 L2CAP 的拥有者句柄 | `0x2013BDBC` | `void *` | 🟡 静态恢复 |
| 33 | `private_abi.bt_l2cap_submit_cid` | 注册一个 L2CAP CID 的处理入口 | `0xc805be9` | `int(void *, uint16_t)` | 🟡 静态恢复 |
| 34 | `private_abi.bt_queue_external` | 把外部数据排进蓝牙发送队列 | `0xc7eb9cd` | `int(void *, void *, void *, void *, uint8_t)` | 🟡 静态恢复 |
| 35 | `private_abi.bt_queue_free` | 释放蓝牙发送队列 | `0xc6b9cf1` | `int(void *)` | 🟡 静态恢复 |
| 36 | `private_abi.bt_remove_bond_private` | 删除某个地址的配对记录 | `0xc3b697d` | `int(const uint8_t *, uint32_t)` | 🟡 静态恢复 |
| 37 | `private_abi.bt_timer_add` | 给蓝牙协议栈加定时器 | `0xc7eb271` | `uint32_t(void *, uint32_t, uint8_t, void *, void *, const uint8_t *, uint32_t)` | 🟡 静态恢复 |
| 38 | `private_abi.bt_timer_cancel` | 取消蓝牙定时器 | `0xc7eb33d` | `int(uint32_t *)` | 🟡 静态恢复 |
| 39 | `private_abi.gap_host_receive_slot` | HCI 收包回调的函数指针槽（可挂钩） | `0x2013C144` | `int (*)(void *state, uint8_t *packet, int packet_length)` | 🟡 静态恢复 |
| 40 | `private_abi.gap_host_stock_receive` | 系统默认的 HCI 收包处理 | `0xc7ec47d` | `int(void *, uint8_t *, int)` | 🟡 静态恢复 |
| 41 | `private_abi.sdp_builder_create` | 创建 SDP 记录构造器 | `0xc80a685` | `void *(uint32_t, uint16_t, uint16_t, uint8_t, const uint8_t *)` | 🟡 静态恢复 |
| 42 | `private_abi.sdp_commit` | 提交 SDP 记录（= 注册一个蓝牙服务） | `0xc808649` | `uint32_t(void *)` | 🟡 静态恢复 |
| 43 | `private_abi.sdp_set_raw_attribute` | 给 SDP 记录设一条原始属性 | `0xc808245` | `uint8_t *(void *, uint16_t, uint16_t, uint16_t, const void *)` | 🟡 静态恢复 |
| 44 | `private_abi.sdp_unregister` | 注销 SDP 记录 | `0xc80a735` | `int(uint32_t)` | 🟡 静态恢复 |
| 45 | `private_abi.stock_bt_callback_descriptor` | 系统自带蓝牙回调描述符（只读 17 字） | `0x2CD4A744` | `const uint32_t[17]` | 🟡 静态恢复 |
| 46 | `vendor_hci_transport_register` | 注册厂商 HCI 传输层（禁止） | `0xc19f105` | `int(int, char)` | ⛔ 禁止调用 |

### 11 字体（44）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `font_manager_add_path` | 往字体管理器注册一个字体文件路径 | `0x0c86037d` | `void *(const char *name, const char *path)` | 🟡 静态恢复 |
| 2 | `font_manager_remove_path` | 移除已注册的字体路径 | `0x0c860399` | `void(uint32_t node)` | 🟡 静态恢复 |
| 3 | `lvgl_posix_open` | LVGL 内部的文件打开（走 POSIX） | `0x1c057c51` | `function` | 🟡 静态恢复 |
| 4 | `private_abi.font_reload_cache_acquire` | 取一份字体缓存 | `0x0c1666d1` | `void *(void *cache, const void *key, void *user_data)` | 🟡 静态恢复 |
| 5 | `private_abi.font_reload_cache_acquire_or_create` | 取字体缓存，没有就新建 | `0x0c166741` | `void *(void *cache, const void *key, void *user_data)` | 🟡 静态恢复 |
| 6 | `private_abi.font_reload_count_cache_class` | 字体“字符数缓存”的控件类 | `0x2cce571c` | `data` | 🟡 静态恢复 |
| 7 | `private_abi.font_reload_count_cache_init` | 初始化字符数缓存 | `0x0c272d39` | `int(void *cache)` | 🟡 静态恢复 |
| 8 | `private_abi.font_reload_display_list` | 把字体列表显示出来 | `0x2010317c` | `global` | 🟡 静态恢复 |
| 9 | `private_abi.font_reload_draw_unit_slot` | 字体绘制单元的函数槽 | `0x201032a4` | `global` | 🟡 静态恢复 |
| 10 | `private_abi.font_reload_drop_face_id` | 丢弃某个 face id 的字体 | `0x0c163be9` | `void(void *context, const char *path)` | 🟡 静态恢复 |
| 11 | `private_abi.font_reload_face_compare` | 比较两个字体 face 是否相同 | `0x1c05682d` | `function` | 🟡 静态恢复 |
| 12 | `private_abi.font_reload_face_create` | 创建字体 face（一个字号+样式） | `0x1c056719` | `function` | 🟡 静态恢复 |
| 13 | `private_abi.font_reload_face_destroy` | 销毁字体 face | `0x1c0566ed` | `function` | 🟡 静态恢复 |
| 14 | `private_abi.font_reload_freetype_context_slot` | FreeType 上下文的函数槽 | `0x20103374` | `global` | 🟡 静态恢复 |
| 15 | `private_abi.font_reload_ft_mul_fix` | FreeType 定点数乘法 | `0x0c33d8bd` | `int32_t(int32_t value, int32_t scale)` | 🟡 静态恢复 |
| 16 | `private_abi.font_reload_ft_set_pixel_size` | 设置 FreeType 的像素大小 | `0x0c33ef59` | `int(void *face, uint32_t size)` | 🟡 静态恢复 |
| 17 | `private_abi.font_reload_glyph_metrics` | 取字形的度量（宽高/步进） | `0x1c056e15` | `function` | 🟡 静态恢复 |
| 18 | `private_abi.font_reload_glyph_pending_release` | 延迟释放字形 | `0x1c046cfd` | `function` | 🟡 静态恢复 |
| 19 | `private_abi.font_reload_gradient_pending_release` | 延迟释放渐变 | `0x1c0493bd` | `function` | 🟡 静态恢复 |
| 20 | `private_abi.font_reload_image_pending_release` | 延迟释放图像 | `0x1c04d259` | `function` | 🟡 静态恢复 |
| 21 | `private_abi.font_reload_list_remove` | 从字体链表里摘掉一项 | `0x0c169ce9` | `void(void *list, void *node)` | 🟡 静态恢复 |
| 22 | `private_abi.font_reload_lv_free` | 字体模块用的 LVGL free | `0x0c16dae5` | `void(void *memory)` | 🟡 静态恢复 |
| 23 | `private_abi.font_reload_lv_initialized` | 查询 LVGL 是否已初始化 | `0x20103178` | `global` | 🟡 静态恢复 |
| 24 | `private_abi.font_reload_lv_malloc` | 字体模块用的 LVGL malloc | `0x0c16daa9` | `void *(uint32_t size)` | 🟡 静态恢复 |
| 25 | `private_abi.font_reload_metrics_compare` | 比较两份字体度量 | `0x1c056f05` | `function` | 🟡 静态恢复 |
| 26 | `private_abi.font_reload_metrics_create` | 创建字体度量 | `0x1c056d25` | `function` | 🟡 静态恢复 |
| 27 | `private_abi.font_reload_metrics_destroy` | 销毁字体度量 | `0x1c056d19` | `function` | 🟡 静态恢复 |
| 28 | `private_abi.font_reload_outline_acquire` | 取一份矢量轮廓 | `0x1c0572a5` | `function` | 🟡 静态恢复 |
| 29 | `private_abi.font_reload_outline_compare` | 比较两份矢量轮廓 | `0x1c057259` | `function` | 🟡 静态恢复 |
| 30 | `private_abi.font_reload_outline_create` | 创建矢量轮廓 | `0x1c057635` | `function` | 🟡 静态恢复 |
| 31 | `private_abi.font_reload_outline_destroy` | 销毁矢量轮廓 | `0x1c057331` | `function` | 🟡 静态恢复 |
| 32 | `private_abi.font_reload_outline_event` | 矢量轮廓的事件回调 | `0x1c046d09` | `function` | 🟡 静态恢复 |
| 33 | `private_abi.font_reload_outline_release` | 释放矢量轮廓 | `0x1c057289` | `function` | 🟡 静态恢复 |
| 34 | `private_abi.font_reload_size_cache_class` | 字体“尺寸缓存”的控件类 | `0x2cce56f4` | `data` | 🟡 静态恢复 |
| 35 | `private_abi.font_reload_style_refresh_enabled` | 查询样式刷新是否开着 | `0x2010319c` | `global` | 🟡 静态恢复 |
| 36 | `private_abi.font_reload_sw_dispatch` | 软件渲染分发 | `0x1c03debd` | `function` | 🟡 静态恢复 |
| 37 | `private_abi.font_reload_uikit_slot` | UIKit 的函数槽 | `0x20103174` | `global` | 🟡 静态恢复 |
| 38 | `private_abi.font_reload_vector_cache_slot` | 矢量缓存的函数槽 | `0x2013eae0` | `global` | 🟡 静态恢复 |
| 39 | `private_abi.font_reload_vector_compare` | 比较两份矢量缓存 | `0x0ca657ed` | `function` | 🟡 静态恢复 |
| 40 | `private_abi.font_reload_vector_destroy` | 销毁矢量缓存 | `0x0ca6581d` | `function` | 🟡 静态恢复 |
| 41 | `private_abi.font_reload_vector_draw_unit_slot` | 矢量绘制单元的函数槽 | `0x2013eadc` | `global` | 🟡 静态恢复 |
| 42 | `private_abi.font_reload_vector_drop` | 丢弃矢量缓存 | `0x0ca65c25` | `void(uint32_t unused, void *object, uint32_t unused2)` | 🟡 静态恢复 |
| 43 | `private_abi.font_reload_vector_label_class` | 矢量文字控件的类 | `0x2cdba868` | `data` | 🟡 静态恢复 |
| 44 | `private_abi.font_reload_vg_dispatch` | 矢量图形（VG）绘制分发 | `0x1c045361` | `function` | 🟡 静态恢复 |

### 12 日历 · 私有界面 ABI（37）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `calendar_icon_notify` | 取日历的通知图标 | `0xca6a005` | `void(const char *)` | 🟡 静态恢复 |
| 2 | `private_abi.background_object_has_flag` | 查后台对象有没有某个标志位 | `0x0c5881c1` | `int(void *object, unsigned int flags)` | 🟡 静态恢复 |
| 3 | `private_abi.background_object_hide` | 隐藏后台对象 | `0x0c588961` | `void(void *object, unsigned int flags)` | 🟡 静态恢复 |
| 4 | `private_abi.background_object_show` | 显示后台对象 | `0x0c5891b1` | `void(void *object, unsigned int flags)` | 🟡 静态恢复 |
| 5 | `private_abi.calendar_eventbus_send` | 往日历事件总线投一个事件 | `0x0ca41585` | `int (uint32_t code, void *payload, uint32_t sync)` | 🟡 静态恢复 |
| 6 | `private_abi.calendar_font_day` | 取日历“日”数字用的字体 | `0x0c4bf87d` | `uint32_t (void *font_desc)` | 🟡 静态恢复 |
| 7 | `private_abi.calendar_localized_text` | 取日历的本地化文案 | `0x0c1e5c39` | `const char *(const char *key)` | 🟡 静态恢复 |
| 8 | `private_abi.calendar_localtime` | 取本地时间（日历用） | `0x0c4e35ad` | `void (int64_t seconds, void *tm_out)` | 🟡 静态恢复 |
| 9 | `private_abi.calendar_snapshot` | 抓取日历某个对象的渲染快照 | `0x0ca5fb41` | `int (uint32_t obj, uint32_t format, uint32_t draw_buf)` | 🟡 静态恢复 |
| 10 | `private_abi.calendar_text_color` | 取日历的文字颜色 | `0x0c588a71` | `void (uint32_t obj, uint32_t color, uint32_t selector)` | 🟡 静态恢复 |
| 11 | `private_abi.control_center_scroll` | 控制中心列表的滚动 | `0x0c5036c5` | `void(void *event)` | 🟡 静态恢复 |
| 12 | `private_abi.notifications_scroll` | 通知列表的滚动 | `0x0c527bbd` | `void(void *event)` | 🟡 静态恢复 |
| 13 | `private_abi.p67_battery_child_count` | 电量控件的子对象数量 | `0x0c5881d9` | `uint32_t (void *object)` | 🟡 静态恢复 |
| 14 | `private_abi.p67_battery_child_get` | 取电量控件第 N 个子对象 | `0x0c5886e1` | `void * (void *object, int32_t index)` | 🟡 静态恢复 |
| 15 | `private_abi.p67_battery_class` | 电量控件的控件类 | `0x2cd198dc` | `global` | 🟡 静态恢复 |
| 16 | `private_abi.p67_battery_extra_draw_size` | 电量控件的额外绘制尺寸 | `0x0c587e71` | `uint32_t (void *object)` | 🟡 静态恢复 |
| 17 | `private_abi.p67_battery_image_draw` | 电量控件的图片绘制 | `0x0c5882a1` | `void (void *layer, const void *descriptor, const int32_t *area)` | 🟡 静态恢复 |
| 18 | `private_abi.p67_battery_image_dsc_init` | 初始化电量图片描述符 | `0x0c5882b9` | `void (void *descriptor)` | 🟡 静态恢复 |
| 19 | `private_abi.p67_battery_native_event` | 电量控件的原生事件处理 | `0x0c4c22cd` | `void (const void *class_p, void *event)` | 🟡 静态恢复 |
| 20 | `private_abi.p67_battery_status_slot` | 电量状态数据的函数槽 | `0x2010fe60` | `global` | 🟡 静态恢复 |
| 21 | `private_abi.p67_blur_cache_clean` | 清空模糊缓存 | `0x0c588f89` | `int(uint32_t id, void *address, uint32_t length)` | 🟡 静态恢复 |
| 22 | `private_abi.p67_blur_cache_invalidate` | 让模糊缓存失效 | `0x0c588449` | `int(uint32_t id, void *address, uint32_t length)` | 🟡 静态恢复 |
| 23 | `private_abi.p67_blur_crossview_callback` | 跨视图模糊的回调 | `0x0c50b9f1` | `void(void *event)` | 🟡 静态恢复 |
| 24 | `private_abi.p67_blur_draw_buf_create` | 创建一块绘图缓冲 | `0x0c587f39` | `void *(uint32_t width, uint32_t height, uint32_t format, uint32_t stride)` | 🟡 静态恢复 |
| 25 | `private_abi.p67_blur_draw_buf_destroy` | 销毁绘图缓冲 | `0x0cac0db9` | `void(void *buf)` | 🟡 静态恢复 |
| 26 | `private_abi.p67_blur_event_list_add` | 往模糊事件链表加一项 | `0x1c07a3e9` | `uint32_t (uint32_t list, uint32_t cb, uint32_t filter, uint32_t userdata)` | 🟡 静态恢复 |
| 27 | `private_abi.p67_blur_event_list_count` | 模糊事件链表的长度 | `0x1c07ab49` | `uint32_t (uint32_t list)` | 🟡 静态恢复 |
| 28 | `private_abi.p67_blur_event_list_get` | 取模糊事件链表第 N 项 | `0x1c07a4b1` | `uint32_t (uint32_t list, uint32_t index)` | 🟡 静态恢复 |
| 29 | `private_abi.p67_blur_event_list_remove` | 从模糊事件链表移除一项 | `0x1c07a6f9` | `int (uint32_t list, uint32_t index)` | 🟡 静态恢复 |
| 30 | `private_abi.p67_blur_gpu_finish` | 等 GPU 把画面画完 | `0x0c187bb1` | `int(void)` | 🟡 静态恢复 |
| 31 | `private_abi.p67_blur_pm_lock` | 电源管理锁的状态 | `0x200eb538` | `global` | 🟡 静态恢复 |
| 32 | `private_abi.p67_blur_pm_relax` | 释放电源管理锁 | `0xc1a79b5` | `int (uint32_t lock)` | 🟡 静态恢复 |
| 33 | `private_abi.p67_blur_pm_stay` | 保持电源管理锁不释放 | `0xc1a78f1` | `int (uint32_t lock)` | 🟡 静态恢复 |
| 34 | `private_abi.p67_blur_snapshot_to_buffer` | 把控件树渲染成位图写进内存（= 截屏） | `0x0cac0879` | `int (uint32_t root, uint32_t format, uint32_t owned_drawbuf)` | 🟡 静态恢复 |
| 35 | `private_abi.p67_blur_style_get` | 读模糊相关的样式属性 | `0x0c589449` | `uint32_t(void *obj, uint32_t selector, uint32_t prop)` | 🟡 静态恢复 |
| 36 | `private_abi.p67_blur_watchface_root_class` | 表盘根控件的控件类 | `0x2cd1f640` | `global` | 🟡 静态恢复 |
| 37 | `private_abi.widgets_scroll` | 控件页的滚动 | `0x0c50abb5` | `void(void *event)` | 🟡 静态恢复 |

### 13 服务 · 线程 · 探针（12）

| # | 符号 | 作用 | 可调用地址 | 原型 | 状态 |
|---:|---|---|---|---|---|
| 1 | `controller_crash_dump` | 主动触发控制器崩溃转储（禁止） | `0xc229f29` | `int(void)` | ⛔ 禁止调用 |
| 2 | `probe.style_misans_demibold_32` | MiSans Demibold 32 字体对象（常量） | `0x2010D054` | `void *` | 🟡 静态恢复 |
| 3 | `probe.style_misans_regular_24` | MiSans Regular 24 字体对象（常量） | `0x2010CE44` | `void *` | 🟡 静态恢复 |
| 4 | `pthread_create_internal` | 创建线程（框架内部，禁止） | `0xc204a79` | `function` | ⛔ 禁止调用 |
| 5 | `public_work_queue` | 系统公共工作队列（禁止） | `—` | `function` | ⛔ 禁止调用 |
| 6 | `service_manager_cleanup` | 清理系统服务（禁止） | `0xc3bde45` | `int(int)` | ⛔ 禁止调用 |
| 7 | `service_manager_get_profile` | 按 id 取系统服务的 profile 指针 | `0xc3bdd89` | `void *(uint32_t)` | 🟢 已确认 |
| 8 | `service_manager_register` | 注册一个系统服务 | `0xc3bdbad` | `int(void *)` | 🟢 已确认 |
| 9 | `service_manager_shutdown` | 关闭系统服务 | `0xc3bdce9` | `int(int)` | 🟢 已确认 |
| 10 | `service_manager_startup` | 启动系统服务 | `0xc3bdc25` | `int(int)` | 🟢 已确认 |
| 11 | `sport_titlebar_dispatch` | 运动标题栏的事件分发（禁止） | `0xc599671` | `function` | ⛔ 禁止调用 |
| 12 | `sport_titlebar_lifecycle_reset` | 运动标题栏的生命周期重置（禁止） | `—` | `function` | ⛔ 禁止调用 |

## 这些地址能拿来做些什么（按可行性排序）

> 前提：`callable_address` 直接当函数指针用，原型照 `prototype` 抄，Thumb 位已置 1。
> 212 个是 `STATIC_RECOVERED`——地址对，但没人在真机上调用过，第一次调用必须有兜底。

### 已经被别的模块验证过的路

| 想做的事 | 需要的符号 | 先例 |
|---|---|---|
| 往桌面塞一个原生应用图标 | `app_install`、`app_launcher_add`、`protobuf_set_ordered_app_list` | Chaos |
| 完全接管界面（自绘页面） | `lvx_page_create`、`lv_*` 全套、`lvx_list_row_create` | Canopus |
| 换字体（中文/emoji/思源） | `font_manager_add_path(name, path)` | 未见 |
| 弹一条系统通知 | `lvx_notification_insert_message(msg)` + `types/firmware_notification_message.json` | 未见 |
| 跨设备收发消息 | `interconnect_connect/send/close` | 官方通道，本项目要绕开的那条 |

### 没人做过、值得试的

**A. 手环截屏**
`p67_blur_snapshot_to_buffer(root, format, ...)` 把屏幕抓进内存，`p67_blur_draw_buf_create(w,h)` 开缓冲，
再用 `write()` 落盘到 `/data`。手环本身没有截屏功能——这是纯增量能力。
配套：`p67_blur_draw_buf_destroy`、`p67_blur_gpu_finish`（等 GPU 画完再抓）。

**B. 蓝牙自定义服务 / HID**
`bt_adapter_register(adapter, callbacks)` 注册自己的适配器回调；`gap_host_receive_slot`
是一个**全局函数指针槽**（`0x2013C144`，类型 `int (*)(void *state, uint8_t *packet, ...)`），
可以直接挂钩收 HCI 包；`sdp_builder_create` + `sdp_commit` 能注册自定义 SDP 记录。
取向：把手环做成蓝牙键盘/媒体遥控器，或自定义 BLE 服务（比 interconnect 更底层）。

**C. 伪造通知 / 日程**
`calendar_eventbus_send(code, payload)` 往日历事件总线投事件；
`calendar_app_lookup_name` 能拿到日历应用对象。可以做“定时提醒”“日程注入”。

**D. 摸系统服务对象**
`service_manager_get_profile(id)` / `service_manager_register` 是 22 个 `STATIC_CONFIRMED` 里的两个，
比 `STATIC_RECOVERED` 可信。拿到 profile 指针就有机会读到更多内部状态。

**E. 自造 `/dev` 节点**
`register_driver("/dev/xxx", &file_operations, 0, priv)`，`file_operations` 结构在 `types/file_operations.json`。
这正是 tun 驱动要做的第一步——先证明能注册一个自己的字符设备，再谈网卡。

**F. 直接读写文件系统**
`open/read/write/lseek/rename/unlink` + `errno_location`。读 `/data/offlinelog/*.gz`、写配置，都不需要 root shell。

**G. 精确时间**
`clock_gettime` + `types/stock_timespec.json`。做计时器、性能测量。

### 明确不要碰

| 符号 | 为什么 |
|---|---|
| `page_navigator_open_page`、`system_router_*` | `FORBIDDEN`，换页会打乱框架的页面栈 |
| `controller_crash_dump` | `FORBIDDEN`，会主动触发崩溃转储 |
| `pthread_create_internal`、`public_work_queue` | `FORBIDDEN`，线程/工作队列契约没复原，硬调会挂 |
| `bt_adapter_register_a2dp_callbacks`、`*_hfp_ag_*`、`offload_property_apply` | `FORBIDDEN`，回调结构体没复原 |
| `vendor_hci_transport_register` | `FORBIDDEN`，抢 HCI 传输层会把蓝牙搞死 |
| 8 个 `WITHDRAWN` | 地址已被证伪，别用 |

### 和“给 10 Pro 补上网络”的关系

网络那 17 个符号已经把链条凑齐了：`netdev_register`（注册网卡）→ `ipv4_input` / `netdev_input`
（收包）→ `devif_poll` / `poll_notify` → `socket` / `sendto` / `recvfrom` → `gethostbyname_r`（DNS），
外加 `net_lock` / `net_unlock` 和 `heap_*`。**缺的只是 tun 驱动本体**。
上表里 E 就是它的第一步。

> ⚠️ 注意：网络组全部标注引用 `EVID-NET-001`，但 `evidence/` 里没有这个文件（38 个证据文件里
> 只有 BT/UI/IO/FONT/MODLIB 系列）。这条证据链比其他组薄，`netdev_register = 0xc1fc214`
> 需要独立复核后再用于生产。
