-- =====================================================================
-- LRA 探针（纯 Lua 版）
-- 只做只读检查，不写 /dev/lra0，不会触发马达，也不会改任何系统状态。
-- 目的：在真机上确认 Lua 环境能否看见/打开马达节点，以及系统里有哪些
--       shell 命令可用。结果直接显示在表盘上，同时写到 /tmp/lra_probe.txt。
--
-- 放到 AIoT IDE 的 Lua 表盘工程里直接运行即可，不需要打包模块。
-- =====================================================================

local REPORT = "/tmp/lra_probe.txt"
local SH_OUT = "/tmp/lra_probe_sh.txt"

local F_BODY = "MiSans-Regular"
local V_BG   = 0x1C1C1E
local V_CARD = 0x2C2C2E
local V_LINE = 0x3A3A3C
local V_TXT  = 0xF2F2F2
local V_DIM  = 0xB3B3B3
local V_OK   = 0x30D158
local V_ERR  = 0xFF453A
local V_WARN = 0xFFD60A

local SCR_W, SCR_H = lvgl.HOR_RES(), lvgl.VER_RES()

local function read_all(path)
    local f = io.open(path, "rb")
    if not f then return nil end
    local data = f:read("*a")
    f:close()
    return data
end

local function trim(s)
    if not s then return "" end
    s = s:gsub("\r", "")
    s = s:gsub("^%s+", ""):gsub("%s+$", "")
    return s
end

-- 跑一条 shell 命令，返回输出；os.execute 不可用时返回 nil
local function sh(cmd)
    if type(os.execute) ~= "function" then return nil end
    os.remove(SH_OUT)
    local ok = pcall(os.execute, cmd .. " > " .. SH_OUT .. " 2>&1")
    if not ok then return nil end
    return read_all(SH_OUT)
end

-- 探测项：每项返回 { ok, text }
local function try_open(path, mode)
    local f, err = io.open(path, mode)
    if f then
        f:close()
        return true, "可打开（" .. mode .. "）"
    end
    return false, "打不开：" .. tostring(err)
end

local function build_report()
    local lines = {}

    local fw = trim(read_all("/proc/version") or "")
    if fw == "" then fw = "(读不到 /proc/version)" end
    table.insert(lines, "固件：" .. fw)

    local ok_r, msg_r = try_open("/dev/lra0", "rb")
    table.insert(lines, "/dev/lra0 读：" .. msg_r)

    local ok_w, msg_w = try_open("/dev/lra0", "wb")
    table.insert(lines, "/dev/lra0 写：" .. msg_w)

    table.insert(lines, "os.execute：" .. (type(os.execute) == "function" and "有" or "无"))

    local dev = trim(sh("ls -l /dev"))
    if dev and dev ~= "" then
        table.insert(lines, "---- /dev ----")
        for line in dev:gmatch("[^\n]+") do
            table.insert(lines, trim(line))
        end
    else
        table.insert(lines, "---- /dev ----")
        table.insert(lines, "(ls 不可用或目录为空)")
    end

    local mods = trim(sh("cat /proc/modules"))
    if mods and mods ~= "" then
        table.insert(lines, "---- /proc/modules ----")
        local n = 0
        for line in mods:gmatch("[^\n]+") do
            n = n + 1
            if n <= 12 then table.insert(lines, trim(line)) end
        end
    end

    local rc = trim(sh("ls /data/rc.d"))
    table.insert(lines, "/data/rc.d：" .. (rc ~= "" and rc:gsub("\n", " ") or "(空或不存在)"))

    return table.concat(lines, "\n"), ok_r, ok_w
end

-- ===== 界面 =====

local root = lvgl.Object(nil, {
    w = SCR_W, h = SCR_H, outline_width = 0, border_width = 0, pad_all = 0,
    bg_opa = lvgl.OPA(100), bg_color = V_BG,
})
root:clear_flag(lvgl.FLAG.SCROLLABLE)
root:add_flag(lvgl.FLAG.CLICKABLE)
root:add_flag(lvgl.FLAG.EVENT_BUBBLE)

lvgl.Label(root, {
    text = "LRA 探针（只读）",
    text_color = V_TXT,
    text_font = lvgl.Font(F_BODY, 26),
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = -208 },
})

local card = lvgl.Object(root, {
    w = SCR_W - 24, h = 280,
    bg_opa = lvgl.OPA(100), bg_color = V_CARD,
    border_width = 1, border_color = V_LINE,
    radius = 20, pad_all = 10,
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = 10 },
})
card:add_flag(lvgl.FLAG.SCROLLABLE)
card:add_flag(lvgl.FLAG.EVENT_BUBBLE)

local status = lvgl.Label(root, {
    text = "",
    text_color = V_DIM,
    text_font = lvgl.Font(F_BODY, 18),
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = -170 },
})

local report_label = lvgl.Label(card, {
    text = "",
    text_color = V_TXT,
    text_font = lvgl.Font(F_BODY, 18),
    w = SCR_W - 64,
    align = { type = lvgl.ALIGN.TOP_LEFT, x_ofs = 0, y_ofs = 0 },
})

local function refresh()
    local text, ok_r, ok_w = build_report()
    report_label:set { text = text }
    local f = io.open(REPORT, "wb")
    if f then f:write(text) f:close() end

    if ok_r and ok_w then
        status:set { text = "节点可读写", text_color = V_OK }
    elseif ok_r then
        status:set { text = "节点只读", text_color = V_WARN }
    else
        status:set { text = "节点不可打开", text_color = V_ERR }
    end
end

local buf_btn = lvgl.Object(root, {
    w = SCR_W - 24, h = 56,
    bg_opa = lvgl.OPA(100), bg_color = 0x2563EB,
    border_width = 0, radius = 20, pad_all = 0,
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = 180 },
})
buf_btn:clear_flag(lvgl.FLAG.SCROLLABLE)
buf_btn:add_flag(lvgl.FLAG.CLICKABLE)
buf_btn:add_flag(lvgl.FLAG.EVENT_BUBBLE)
lvgl.Label(buf_btn, {
    text = "重新检测",
    text_color = V_TXT,
    text_font = lvgl.Font(F_BODY, 22),
    align = { type = lvgl.ALIGN.CENTER, x_ofs = 0, y_ofs = 0 },
})
buf_btn:onClicked(function()
    local ok, err = pcall(refresh)
    if not ok then status:set { text = "检测出错：" .. tostring(err), text_color = V_ERR } end
end)

local ok, err = pcall(refresh)
if not ok then
    status:set { text = "检测出错：" .. tostring(err), text_color = V_ERR }
end

