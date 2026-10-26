-- FS List —— 列出整台设备的所有目录与文件（不限深度），写入 /data/fslist.txt
--
-- 安全设计:
--   打开这个表盘 **什么都不做**，只有按下「扫描并写入」按钮才会执行命令。
--   即使扫描过程中设备重启，重启后本表盘也只是静静显示，不会再次触发，
--   从结构上排除「开机就崩 → 无限重启」的可能。
--
-- 扫描方式:
--   固件 NSH 自带 `ls -R`（与 GNU ls 不同，没有 find/busybox）。
--   `ls -R /` 会先打印 `目录:` 再逐条列出目录内容，子目录带结尾 `/`，
--   然后递归进入每个子目录，深度不受限。
--   输出第一行是 `date` 的时间戳，方便判断这份清单是什么时候生成的。
--
-- 结果:
--   成功时屏幕显示目录数、行数、字节数；失败时显示原因。
--   文件始终留在 /data/fslist.txt，可用其他工具取走。

local lvgl = require("lvgl")

local OUTPUT = "/data/fslist.txt"

local rootbase = lvgl.Object(nil, {
    w = lvgl.HOR_RES(), h = lvgl.VER_RES(), bg_color = 0x07111F,
    bg_opa = lvgl.OPA(100), border_width = 0,
})
rootbase:clear_flag(lvgl.FLAG.SCROLLABLE)
local root = lvgl.Object(rootbase, {
    w = 336, h = 480, bg_color = 0x07111F, bg_opa = lvgl.OPA(100),
    border_width = 0, pad_all = 0, align = lvgl.ALIGN.CENTER,
})
root:clear_flag(lvgl.FLAG.SCROLLABLE)

lvgl.Label(root, {
    text = "文件系统清单",
    text_color = 0xFFFFFF,
    x = 18, y = 30,
})

local status = lvgl.Label(root, {
    text = "尚未扫描。\n\n打开本页不会执行任何命令。\n按下按钮后，将递归列出\n整个设备的目录和文件，\n并写入：\n/data/fslist.txt",
    text_color = 0xBFD9FF,
    w = 304, h = 300,
    x = 16, y = 78,
})

local function set_status(text, color)
    status:set { text = text, text_color = color or 0xBFD9FF }
end

local function exec(command)
    print("[fslist] exec: " .. command)
    local ok, how, code = os.execute(command)
    print(string.format("[fslist] result: %s %s %s",
        tostring(ok), tostring(how), tostring(code)))
    return ok == true or ok == 0, code
end

-- 统计输出文件的行数、目录头数量（以 `:` 结尾的行）和字节数。
-- 分块读取，避免把整个清单一次性塞进内存。
local function analyze(path)
    local file = io.open(path, "rb")
    if not file then return nil end
    local bytes, lines, dirs = 0, 0, 0
    local carry = ""
    while true do
        local chunk = file:read(8192)
        if not chunk then break end
        bytes = bytes + #chunk
        local buffer = carry .. chunk
        local start = 1
        while true do
            local nl = buffer:find("\n", start, true)
            if not nl then break end
            local line = buffer:sub(start, nl - 1)
            lines = lines + 1
            if line:sub(-1) == ":" then dirs = dirs + 1 end
            start = nl + 1
        end
        carry = buffer:sub(start)
    end
    if #carry > 0 then lines = lines + 1 end
    file:close()
    return { bytes = bytes, lines = lines, dirs = dirs }
end

local busy = false

local function do_run()
    -- 清理旧清单；重定向本身也会截断，但先删掉可以保证不会残留旧内容。
    exec("rm -f " .. OUTPUT)
    -- 第一行写生成时间。即使 date 失败也不影响后面的扫描。
    exec("date > " .. OUTPUT)
    -- 全盘递归列举。追加写入，保留上面的时间戳。
    local listed, code = exec("ls -R / >> " .. OUTPUT)

    local stats = analyze(OUTPUT)
    if not stats or stats.bytes == 0 then
        set_status("失败: 没有生成 " .. OUTPUT
            .. "\n\n请把固件日志发给我\n(找 [fslist] 开头的行)", 0xFF9A9A)
        return
    end
    if stats.dirs == 0 then
        -- 只剩 date 那一行，说明 ls 没有正常工作（例如固件不支持 -R）。
        set_status("失败: 没有扫到任何目录。\n\n可能 ls -R 不可用，\n请把固件日志发给我。", 0xFF9A9A)
        return
    end

    local summary = string.format(
        "目录 %d 个\n行 %d 行\n大小 %d 字节\n\n已写入:\n%s",
        stats.dirs, stats.lines, stats.bytes, OUTPUT)
    if listed then
        set_status("完成。\n\n" .. summary, 0x9AFFB0)
    else
        set_status("部分完成(ls 退出码 " .. tostring(code) .. ")。\n\n"
            .. summary .. "\n\n可能有目录无权限，\n清单仍可用。", 0xFFD08A)
    end
end

local button = lvgl.Object(root, {
    w = 304, h = 56, bg_color = 0x14508A, bg_opa = lvgl.OPA(100),
    radius = 14,
    x = 16, y = 392,
})
button:clear_flag(lvgl.FLAG.SCROLLABLE)
button:add_flag(lvgl.FLAG.CLICKABLE)
lvgl.Label(button, {
    text = "扫描并写入",
    text_color = 0xFFFFFF,
    align = lvgl.ALIGN.CENTER,
})
button:onClicked(function()
    if busy then return end
    busy = true
    set_status("扫描中，请稍候…\n\nls -R /\n\n设备越大耗时越长，\n期间界面无响应属正常。", 0xFFD08A)
    local ok, message = pcall(do_run)
    if not ok then
        set_status("出错: " .. tostring(message), 0xFF9A9A)
    end
    busy = false
end)

lvgl.Label(root, {
    text = "输出: /data/fslist.txt  ·  可重复扫描",
    text_color = 0x6B7C93,
    x = 16, y = 458,
})
