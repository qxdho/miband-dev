-- 原生应用安装器（Lua 表盘，Chaos 风格）
--
-- 模仿 Chaos-Module 安装器的机制与界面：
--   * 分层界面：页底 / 卡片 / 按钮三级灰阶，1px 边框，只用 align 居中；
--   * 安装是流水线，一步一拍，给 LVGL 事件循环留出重绘时间；
--   * 支持写 /data/rc.d 开机脚本，装一次即开机自载；
--   * 绝不 rmmod —— 模块把回调挂进固件链后，卸载会留下悬空指针；
--   * 已加载时再次运行 = 更新文件，提示重启后生效。
--
-- 与 Chaos 的差异：Chaos 的模块有 /dev 协议（192 字节状态块、注册链命令），
-- 这里装的是裸 NuttX 模块，安装器只负责部署、insmod 去重与验证。

local lvgl = require("lvgl")

-- ===== 视觉：分层的深灰界面 =====
local V_DEEP  = 0x1C1C1E  -- #1c1c1e 最深：页面底
local V_MID   = 0x2C2C2E  -- #2c2c2e 中间：卡片
local V_LINE2 = 0x2A2A2C  -- 页面底上的 1px 边框
local V_TXT   = 0xF2F2F2  -- 主文字
local V_TXT2  = 0xB3B3B3  -- 次文字
local V_ACC_BG = 0x2563EB -- 主按钮
local V_OK    = 0x30D158  -- 成功（仅文字）
local V_WARN  = 0xFFD60A  -- 提醒（仅文字）
local V_ERR   = 0xFF453A  -- 失败（仅文字）
local V_R     = 24
local F_BODY  = "MiSans-Regular"
local OFF_Y   = 3000

-- ===== 配置（载荷清单由 build.mjs 生成，不要手改成块） =====
local CONFIG = {
    token = "miband-installer",
    title = "原生应用安装器",
    -- 允许安装的固件版本 -> 期望构建串（nil 表示只校验版本号）
    targets = {
        ["3.101.043"] = { build = "CONBINE_LTALM078_T3.101.043_08041658" },
    },
    -- 模块加载后应出现的设备节点；留空则用 /proc/modules 判断
    device = "",
    -- BEGIN PAYLOADS
    payloads = {},
    -- END PAYLOADS
}

local DATA_DIR = "/data/" .. CONFIG.token
local RC_DIR = "/data/rc.d"
local RC_SH = RC_DIR .. "/" .. CONFIG.token .. ".sh"
local SETTINGS = DATA_DIR .. "/settings.cfg"
local BOOT_LOG = DATA_DIR .. "/boot.log"
local INSTALL_LOG = DATA_DIR .. "/install.log"

local package_dir = SCRIPT_PATH or ""
if package_dir ~= "" and package_dir:sub(-1) ~= "/" then package_dir = package_dir .. "/" end

local status_label
local runner
local step_index = 1
local started_once = false
local wipe_armed = false
local autostart_enabled = true

-- ===== 基础工具 =====

-- 状态行单行居中（卡片 304 宽 / 22px）：中文按 2 个单位，ASCII 按 1，上限 26。
local function fit_status(text)
    local s = tostring(text)
    local units, i = 0, 1
    while i <= #s do
        local b = s:byte(i)
        local len = (b >= 0xF0 and 4) or (b >= 0xE0 and 3) or (b >= 0xC0 and 2) or 1
        local w = (len >= 3) and 2 or 1
        if units + w > 26 then return s:sub(1, i - 1) .. "…" end
        units = units + w
        i = i + len
    end
    return s
end

local function set_status(text, color)
    status_label:set { text = fit_status(text), text_color = color or V_TXT2 }
end

local function quote_arg(value)
    local pieces = { "'" }
    for ch in tostring(value):gmatch(".") do
        if ch == "'" then pieces[#pieces + 1] = "'\\''" else pieces[#pieces + 1] = ch end
    end
    pieces[#pieces + 1] = "'"
    return table.concat(pieces)
end

local function exec(cmd)
    if type(os.execute) ~= "function" then return false end
    print("[" .. CONFIG.token .. "] " .. cmd)
    local ok, _, code = os.execute(cmd)
    return ok == true or ok == 0 or tonumber(code) == 0
end

local function read_all(path, mode)
    if type(io) ~= "table" then return nil end
    local fh = io.open(path, mode or "rb")
    if not fh then return nil end
    local ok, body = pcall(fh.read, fh, "*a")
    pcall(fh.close, fh)
    if not ok then return nil end
    return body
end

-- 幂等写入：内容相同就跳过；写完回读核对。
local function write_file(path, body)
    if read_all(path) == body then return true end
    local fh = io.open(path, "wb")
    if not fh then return false, "无法写入 " .. path end
    local ok, value = pcall(fh.write, fh, body)
    local closed = pcall(fh.close, fh)
    if not ok or value == false or not closed then return false, "写入失败 " .. path end
    if read_all(path) ~= body then return false, "回读失败 " .. path end
    return true
end

local function remove_file(path)
    if read_all(path) == nil then return true end
    exec("rm -f " .. quote_arg(path))
    return read_all(path) == nil
end

local function last_log_line()
    local text = read_all(INSTALL_LOG)
    if not text then return "" end
    local line = ""
    for l in text:gmatch("[^\n]+") do line = l end
    if #line > 60 then line = line:sub(-60) end
    return line
end

local function append_log(text)
    local fh = io.open(INSTALL_LOG, "a")
    if not fh then return end
    pcall(fh.write, fh, text .. "\n")
    pcall(fh.close, fh)
end

local function read_properties()
    local text = read_all("/etc/build.prop")
    local props = {}
    if not text then return props end
    for line in (text .. "\n"):gmatch("([^\n]*)\n") do
        local k, v = line:gsub("\r$", ""):match("^([^=]+)=(.*)$")
        if k then props[k] = v end
    end
    return props
end

local function getprop(key)
    local tmp = DATA_DIR .. "/prop.tmp"
    if not exec("getprop " .. key .. " > " .. quote_arg(tmp)) then return nil end
    local value = read_all(tmp)
    remove_file(tmp)
    if type(value) ~= "string" then return nil end
    value = value:match("^%s*(.-)%s*$")
    return value ~= "" and value or nil
end

local function device_identity()
    local props = read_properties()
    local version = props["ro.build.version"]
    local build = props["ro.build.customer_version"]
    if not version then version = getprop("ro.build.version") end
    if not build then build = getprop("ro.build.customer_version") end
    return version, build
end

local function module_loaded(name)
    local data = read_all("/proc/modules")
    if not data then
        local tmp = DATA_DIR .. "/modules.tmp"
        exec("lsmod > " .. quote_arg(tmp))
        data = read_all(tmp)
        remove_file(tmp)
        if not data then return nil end
    end
    for line in (data .. "\n"):gmatch("([^\n]*)\n") do
        if line:match("^(%S+)") == name then return true end
    end
    return false
end

local function device_present()
    if CONFIG.device == "" then return nil end
    local fh = io.open(CONFIG.device, "rb")
    if not fh then return false end
    fh:close()
    return true
end

local function u16(data, off)
    return string.unpack("<I2", data, off + 1)
end

local function check_elf(data, name)
    if type(data) ~= "string" then return false, "读不到载荷：" .. name end
    if #data < 52 then return false, "文件过小：" .. name end
    if data:sub(1, 4) ~= "\127ELF" then return false, "不是 ELF：" .. name end
    if data:byte(5) ~= 1 or data:byte(6) ~= 1 then return false, "需要 32 位小端：" .. name end
    if u16(data, 16) ~= 1 then return false, "需要 ET_REL：" .. name end
    if u16(data, 18) ~= 40 then return false, "需要 ARM：" .. name end
    return true
end

-- ===== 部署与加载 =====

local function stage_payloads()
    if #CONFIG.payloads == 0 then return false, "安装器里没有载荷" end
    exec("mkdir -p " .. quote_arg(DATA_DIR))
    for _, item in ipairs(CONFIG.payloads) do
        local data = read_all(package_dir .. item.file)
        local ok, err = check_elf(data, item.file)
        if not ok then return false, err end
        if item.size and #data ~= item.size then
            return false, item.file .. " 大小不符"
        end
        local dir = DATA_DIR .. "/" .. item.name
        exec("mkdir -p " .. quote_arg(dir))
        local okw, errw = write_file(dir .. "/" .. item.file, data)
        if not okw then return false, errw end
    end
    return true
end

local function load_payloads(already)
    for _, item in ipairs(CONFIG.payloads) do
        if module_loaded(item.name) then
            already.value = true
        else
            local path = DATA_DIR .. "/" .. item.name .. "/" .. item.file
            local rc = exec("insmod " .. quote_arg(path) .. " " .. quote_arg(item.name)
                .. " >> " .. INSTALL_LOG .. " 2>&1")
            if not rc then
                append_log("insmod " .. path .. " " .. item.name .. " failed")
                exec("lsmod >> " .. INSTALL_LOG .. " 2>&1")
                local tail = last_log_line()
                return false, "insmod 失败（" .. item.name .. "）" .. (tail ~= "" and ("：" .. tail) or "")
            end
            append_log("insmod " .. path .. " " .. item.name .. " ok")
        end
    end
    return true
end

local function verify_payloads()
    for _, item in ipairs(CONFIG.payloads) do
        local present = device_present()
        if present == nil then present = module_loaded(item.name) end
        if present == false then return false, "模块未生效（" .. item.name .. "）" end
    end
    return true
end

-- ===== 开机自启 =====

local function build_boot_script()
    local L = {}
    local function w(s) L[#L + 1] = s end
    w("set +e")
    w("echo start > " .. BOOT_LOG)
    for _, item in ipairs(CONFIG.payloads) do
        local path = DATA_DIR .. "/" .. item.name .. "/" .. item.file
        w("insmod " .. path .. " " .. item.name .. " >> " .. BOOT_LOG .. " 2>&1")
        w("RC=$?")
        w("echo " .. item.name .. " rc=$RC >> " .. BOOT_LOG)
        -- 加载失败就自我禁用，避免坏模块把机器拖进重启循环
        w("if [ $RC -ne 0 ]; then rm -f " .. RC_SH .. "; fi")
    end
    w("echo done >> " .. BOOT_LOG)
    return table.concat(L, "\n") .. "\n"
end

local function autostart_install()
    exec("mkdir -p " .. quote_arg(RC_DIR))
    local ok, err = write_file(RC_SH, build_boot_script())
    if not ok then return false, err end
    return true
end

local function autostart_remove()
    return remove_file(RC_SH)
end

local function autostart_registered()
    return read_all(RC_SH) == build_boot_script()
end

local function autostart_state_text()
    return autostart_registered() and "开机自启：已注册" or "开机自启：未注册"
end

-- ===== 流水线 =====


local function build_pipeline(already)
    return {
        { name = "1 检查固件", body = function()
            local version, build = device_identity()
            local target = version and CONFIG.targets[version]
            if not target then return false, "不支持的固件：" .. tostring(version or "未知") end
            if target.build and target.build ~= build then return false, "固件构建不匹配" end
            return true
        end },
        { name = "2 部署模块", body = stage_payloads },
        { name = "3 加载模块", body = function() return load_payloads(already) end },
        { name = "4 检查设备", body = verify_payloads },
        { name = "5 开机自启", body = function()
            if autostart_enabled then
                return autostart_install()
            end
            if not autostart_remove() then return false, "删除开机脚本失败" end
            return true
        end },
    }
end

local function stop_runner(timer, ok, message)
    timer:delete()
    if runner == timer then runner = nil end
    set_status(message, ok and V_OK or V_ERR)
end

local function run_next_step(timer, steps, already)
    if step_index > #steps then
        if already.value then
            stop_runner(timer, true, "已更新，重启后生效")
        else
            stop_runner(timer, true, "安装完成")
        end
        return
    end
    local item = steps[step_index]
    set_status("RUN " .. item.name)
    local ok, ret, err = pcall(item.body)
    if not ok then
        stop_runner(timer, false, "失败: " .. tostring(ret))
        return
    end
    if ret == false then
        stop_runner(timer, false, "失败: " .. tostring(err))
        return
    end
    step_index = step_index + 1
    timer:ready()
end

local function start_runner(update_only)
    step_index = 1
    local already = { value = false }
    if update_only then
        local timer = lvgl.Timer {
            period = 1000, repeat_count = -1, paused = true,
            cb = function(t)
                local called, ok, err = pcall(stage_payloads)
                if not called then stop_runner(t, false, "更新失败: " .. tostring(ok)); return end
                if ok == false then stop_runner(t, false, "更新失败: " .. tostring(err)); return end
                if autostart_enabled then
                    local installed, msg = autostart_install()
                    if not installed then stop_runner(t, false, "自启失败: " .. tostring(msg)); return end
                else
                    autostart_remove()
                end
                stop_runner(t, true, "已更新，重启后生效")
            end,
        }
        if not timer then return false, "定时器创建失败" end
        runner = timer
        timer:resume()
        timer:ready()
        return true
    end
    local steps = build_pipeline(already)
    local timer = lvgl.Timer {
        period = 1000, repeat_count = -1, paused = true,
        cb = function(t)
            local ok, message = pcall(run_next_step, t, steps, already)
            if not ok then stop_runner(t, false, "运行失败: " .. tostring(message)) end
        end,
    }
    if not timer then return false, "定时器创建失败" end
    runner = timer
    timer:resume()
    timer:ready()
    return true
end

-- ===== 界面（页底 / 卡片 / 按钮 三级层次） =====
-- 定位与居中一律用 align 表；Label 不设 w/x/y，让它按文字宽度自适应再整体居中。

local SCR_W, SCR_H = lvgl.HOR_RES(), lvgl.VER_RES()

local root = lvgl.Object(nil, {
    w = SCR_W, h = SCR_H, outline_width = 0, border_width = 0, pad_all = 0,
    bg_opa = lvgl.OPA(100), bg_color = V_DEEP,
})
root:clear_flag(lvgl.FLAG.SCROLLABLE)
root:add_flag(lvgl.FLAG.CLICKABLE)
root:add_flag(lvgl.FLAG.EVENT_BUBBLE)

local main_view = lvgl.Object(root, {
    w = SCR_W, h = SCR_H, outline_width = 0, border_width = 0, pad_all = 0,
    bg_opa = lvgl.OPA(100), bg_color = V_DEEP,
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = 0 },
})
local as_view = lvgl.Object(root, {
    w = SCR_W, h = SCR_H, outline_width = 0, border_width = 0, pad_all = 0,
    bg_opa = lvgl.OPA(100), bg_color = V_DEEP,
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = OFF_Y },
})
for _, view in ipairs({ main_view, as_view }) do
    view:clear_flag(lvgl.FLAG.SCROLLABLE)
    view:add_flag(lvgl.FLAG.CLICKABLE)
    view:add_flag(lvgl.FLAG.EVENT_BUBBLE)
end
local function view_show(name)
    local top = name == "as" and as_view or main_view
    local off = name == "as" and main_view or as_view
    top:set { align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = 0 } }
    off:set { align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = OFF_Y } }
end

lvgl.Label(main_view, {
    text = CONFIG.title, text_color = V_TXT,
    text_font = lvgl.Font(F_BODY, 32),
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = -212 },
})

local card = lvgl.Object(main_view, {
    w = SCR_W - 32, h = 68,
    bg_opa = lvgl.OPA(100), bg_color = V_MID,
    border_width = 1, border_color = V_LINE2,
    radius = V_R, pad_all = 0,
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = -150 },
})
card:clear_flag(lvgl.FLAG.SCROLLABLE)
card:add_flag(lvgl.FLAG.EVENT_BUBBLE)
status_label = lvgl.Label(card, {
    text = "准备就绪", text_color = V_TXT2,
    text_font = lvgl.Font(F_BODY, 22),
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = 0 },
})

local BUTTON_STYLES = {
    primary = { bg = V_ACC_BG, line = V_ACC_BG, fg = V_TXT, opa = 100, bw = 1 },
    danger  = { bg = V_ERR, line = V_ERR, fg = V_ERR, opa = 15, bw = 0 },
    ghost   = { bg = V_DEEP, line = V_LINE2, fg = V_TXT2, opa = 100, bw = 1 },
}

local function make_button(parent, text, y_ofs, kind, on_clicked)
    local style = BUTTON_STYLES[kind] or BUTTON_STYLES.ghost
    local b = lvgl.Object(parent, {
        w = SCR_W - 32, h = 64,
        bg_opa = lvgl.OPA(style.opa), bg_color = style.bg,
        border_width = style.bw, border_color = style.line,
        radius = V_R, pad_all = 0,
        align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = y_ofs },
    })
    b:clear_flag(lvgl.FLAG.SCROLLABLE)
    b:add_flag(lvgl.FLAG.CLICKABLE)
    b:add_flag(lvgl.FLAG.EVENT_BUBBLE)
    local label = lvgl.Label(b, {
        text = text, text_color = style.fg,
        text_font = lvgl.Font(F_BODY, 24),
        align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = 0 },
    })
    b:onClicked(function()
        local ok, msg = pcall(on_clicked)
        if not ok then set_status("错误: " .. tostring(msg), V_ERR) end
    end)
    return b, label
end

-- ===== 主界面按钮 =====

local as_label
local function as_set(text, color)
    if as_label then as_label:set { text = fit_status(text), text_color = color or V_TXT2 } end
end

make_button(main_view, "运行", -76, "primary", function()
    if runner then set_status("正在运行") return end
    if module_loaded(CONFIG.payloads[1] and CONFIG.payloads[1].name or "") then
        set_status("正在更新模块")
        local started, err = start_runner(true)
        if not started then set_status("更新失败: " .. tostring(err), V_ERR) end
        return
    end
    if started_once then set_status("每次开机只能运行一次", V_WARN) return end
    started_once = true
    local started, err = start_runner(false)
    if not started then set_status("运行失败: " .. tostring(err), V_ERR); started_once = false end
end)

local reboot_btn, reboot_lbl
local reboot_timer = nil
reboot_btn, reboot_lbl = make_button(main_view, "重启", 80, "ghost", function()
    if reboot_timer then return end
    if runner then set_status("运行中, 请等待", V_WARN) return end
    local left = 3
    reboot_btn:clear_flag(lvgl.FLAG.CLICKABLE)
    reboot_lbl:set { text = "重启 " .. left }
    set_status("3 秒后重启", V_WARN)
    reboot_timer = lvgl.Timer {
        period = 1000, repeat_count = -1, paused = true,
        cb = function(t)
            left = left - 1
            if left > 0 then
                reboot_lbl:set { text = "重启 " .. left }
                set_status(left .. " 秒后重启", V_WARN)
                return
            end
            t:delete()
            reboot_timer = nil
            if not exec("reboot") then
                reboot_btn:add_flag(lvgl.FLAG.CLICKABLE)
                reboot_lbl:set { text = "重启" }
                set_status("重启失败, 请手动重启", V_ERR)
            end
        end,
    }
    if not reboot_timer then
        reboot_btn:add_flag(lvgl.FLAG.CLICKABLE)
        reboot_lbl:set { text = "重启" }
        set_status("定时器创建失败", V_ERR)
        return
    end
    reboot_timer:resume()
end)

make_button(main_view, "开机自启", 2, "ghost", function()
    as_set(autostart_state_text(), V_TXT2)
    view_show("as")
end)

make_button(main_view, "清除重置", 158, "danger", function()
    if runner then set_status("运行中, 请等待", V_WARN) return end
    if not wipe_armed then
        wipe_armed = true
        set_status("再按一次以确认清除", V_WARN)
        return
    end
    wipe_armed = false
    local ok = autostart_remove()
    if not ok then set_status("删除开机脚本失败", V_ERR) return end
    exec("rm -rf " .. quote_arg(DATA_DIR))
    set_status("已清除, 重启后重新安装", V_OK)
end)

-- ===== 设置页 =====

lvgl.Label(as_view, {
    text = "开机自启", text_color = V_TXT,
    text_font = lvgl.Font(F_BODY, 32),
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = -198 },
})
as_label = lvgl.Label(as_view, {
    text = "", text_color = V_TXT2,
    text_font = lvgl.Font(F_BODY, 22),
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = -152 },
})

local autostart_lbl, register_lbl
local function settings_refresh()
    if autostart_lbl then
        autostart_lbl:set { text = autostart_registered() and "脚本：已安装" or "脚本：未安装" }
    end
    if register_lbl then
        register_lbl:set { text = autostart_enabled and "下次运行：注册自启" or "下次运行：跳过自启" }
    end
end

local _, as_btn_lbl = make_button(as_view, "脚本：未安装", -70, "ghost", function()
    if runner then as_set("正在运行, 请等待", V_WARN) return end
    if autostart_registered() then
        if not autostart_remove() then as_set("删除失败", V_ERR) return end
        as_set("已删除自启脚本", V_WARN)
    else
        local ok, err = autostart_install()
        if not ok then as_set("安装失败: " .. tostring(err), V_ERR) return end
        as_set("已注册，重启后自载", V_OK)
    end
    settings_refresh()
end)
autostart_lbl = as_btn_lbl

local _, register_btn_lbl = make_button(as_view, "下次运行：注册自启", 4, "ghost", function()
    if runner or started_once then as_set("请在运行前选择", V_WARN) return end
    autostart_enabled = not autostart_enabled
    if not write_file(SETTINGS, string.char(autostart_enabled and 1 or 0)) then
        as_set("保存失败", V_ERR)
        return
    end
    settings_refresh()
    as_set(autostart_enabled and "运行时写入自启脚本" or "运行时跳过自启", V_TXT2)
end)
register_lbl = register_btn_lbl

make_button(as_view, "< 返回", 78, "ghost", function()
    as_set(autostart_state_text(), V_TXT2)
    view_show("main")
end)

if lvgl.EVENT.DELETE then
    root:onevent(lvgl.EVENT.DELETE, function()
        if runner then runner:delete(); runner = nil end
        if reboot_timer then reboot_timer:delete(); reboot_timer = nil end
    end)
end

-- ===== 启动时刷新 =====

if #CONFIG.payloads == 0 then
    set_status("安装器里没有载荷", V_ERR)
end
if type(os.execute) ~= "function" then
    set_status("固件未开放 os.execute", V_ERR)
end
-- 上次选择的"是否注册自启"：settings.cfg 空 = 默认开启
local saved_settings = read_all(SETTINGS)
if saved_settings == string.char(0) then autostart_enabled = false end
settings_refresh()
