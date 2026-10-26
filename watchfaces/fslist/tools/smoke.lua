-- 离线冒烟测试：用假的 lvgl / 假的 shell 运行 main.lua，验证：
--   1) 加载期不执行任何 shell 命令；
--   2) 按钮回调会执行 `ls -R /` 并写入输出文件；
--   3) 成功时状态栏显示统计结果；
--   4) 扫描失败（但已有内容）时显示「部分完成」；
--   5) ls 什么都没写时显示「没有扫到任何目录」；
--   6) 可以再次点击重新扫描。
-- 用法: lua tools/smoke.lua   （在工程根目录执行）

local OUTPUT = "/data/fslist.txt"

local FIXTURE = table.concat({
    "/:",
    "data/",
    "dev/",
    "proc/",
    "system/",
    "/data:",
    "offlinelog/",
    "fslist.txt",
    "/data/offlinelog:",
    "device.log",
    "/dev:",
    "console",
    "/proc:",
    "1/",
    "/proc/1:",
    "cmdline",
    "/system:",
    "watchface/",
    "/system/watchface:",
    "1001/",
    "/system/watchface/1001:",
    "resource.bin",
    "",
}, "\n")

local calls = {}
local labels = {}
local button_cb = nil
local memfs = {}
local ls_status = true
local ls_body = FIXTURE
local load_phase_done = false

local real_print = print
local function fake_print(...) end
print = fake_print

-- ---- fake lvgl ------------------------------------------------------------
local lvgl = {}
lvgl.HOR_RES = function() return 336 end
lvgl.VER_RES = function() return 480 end
lvgl.OPA = function(v) return v end
lvgl.FLAG = { SCROLLABLE = "scrollable", CLICKABLE = "clickable" }
lvgl.ALIGN = { CENTER = "center", TOP_MID = "top_mid", BOTTOM_MID = "bottom_mid" }

local function label_new(_, opts)
    local o = {
        text = opts and opts.text or "",
        set = function(self, value)
            if type(value) == "table" and value.text then self.text = value.text end
        end,
    }
    labels[#labels + 1] = o
    return o
end

local function object_new(_, opts)
    local o = {}
    function o:clear_flag() end
    function o:add_flag() end
    function o:onClicked(fn)
        button_cb = fn
    end
    return o
end

lvgl.Object = object_new
lvgl.Label = label_new
package.preload["lvgl"] = function() return lvgl end

-- ---- fake os.execute ------------------------------------------------------
local real_execute = os.execute
local function lua_quote(s) return "'" .. s:gsub("'", "'\\''") .. "'" end

os.execute = function(command)
    calls[#calls + 1] = command
    if command:find("^rm %-f ") then
        memfs[OUTPUT] = nil
        return true
    end
    if command:find("^date > ") then
        memfs[OUTPUT] = "Tue Oct 26 17:20:00 2026\n"
        return true
    end
    if command:find("^ls %-R / >> ") then
        local body = (memfs[OUTPUT] or "")
        memfs[OUTPUT] = body .. ls_body
        return ls_status
    end
    return false
end

-- ---- fake io.open ---------------------------------------------------------
local real_open = io.open
io.open = function(path, mode)
    if path ~= OUTPUT then return nil end
    if mode and mode:find("r") and memfs[OUTPUT] == nil then return nil end
    local cursor = 0
    local file = {}
    function file:read(n)
        local data = memfs[OUTPUT] or ""
        if cursor >= #data then return nil end
        local chunk
        if n == "*a" then
            chunk = data:sub(cursor + 1)
            cursor = #data
        else
            chunk = data:sub(cursor + 1, cursor + n)
            cursor = cursor + #chunk
        end
        return chunk
    end
    function file:seek(whence, offset)
        local data = memfs[OUTPUT] or ""
        if whence == "end" then
            cursor = #data + (offset or 0)
        else
            cursor = offset or 0
        end
        return cursor
    end
    function file:close() return true end
    return file
end

-- ---- load watchface -------------------------------------------------------
dofile("main.lua")
load_phase_done = true

local function fail(message)
    print = real_print
    io.open = real_open
    os.execute = real_execute
    io.stderr:write("FAIL: " .. message .. "\n")
    os.exit(1)
end

local function check(condition, message)
    if not condition then fail(message) end
end

check(#calls == 0, "加载期执行了 shell 命令: " .. tostring(calls[1]))
check(button_cb ~= nil, "没有注册按钮回调")
check(#labels >= 2, "状态标签没有创建")
local status = labels[2]
check(status.text:find("尚未扫描", 1, true) ~= nil, "初始状态文案不对: " .. status.text)

-- ---- first click: success ------------------------------------------------
button_cb()
check(#calls == 3, "第一次点击应执行 3 条命令，实际 " .. #calls)
check(calls[3] == "ls -R / >> /data/fslist.txt", "ls 命令不对: " .. tostring(calls[3]))
check(memfs[OUTPUT] ~= nil, "输出文件没有写入")
check(status.text:find("完成", 1, true) ~= nil, "成功文案不对: " .. status.text)
check(status.text:find("目录 9 个", 1, true) ~= nil, "目录数统计不对: " .. status.text)
check(status.text:find("大小", 1, true) ~= nil, "缺少字节数")

-- ---- second click: partial failure --------------------------------------
ls_status = false
button_cb()
check(#calls == 6, "第二次点击应再执行 3 条命令，实际 " .. #calls)
check(status.text:find("部分完成", 1, true) ~= nil, "部分失败文案不对: " .. status.text)
check(status.text:find("目录 9 个", 1, true) ~= nil, "部分失败时统计丢失")

-- ---- third click: ls writes nothing but the date line ----------------------
ls_status = true
ls_body = ""
button_cb()
check(#calls == 9, "第三次点击应再执行 3 条命令，实际 " .. #calls)
check(status.text:find("没有扫到任何目录", 1, true) ~= nil,
    "空结果文案不对: " .. status.text)

print = real_print
io.open = real_open
os.execute = real_execute
print("PASS: 加载期零执行、成功路径、部分失败路径、空结果、重复扫描均符合预期")
