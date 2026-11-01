#!/usr/bin/env node
// 把 Lua 安装器 + 载荷模块打成一个可直接安装的 p67 容器（.bin）。
//
// 容器格式与 Canopus 官方安装包一致（0x1234A55A / 0x00010003）：
//   0x000 主头 0xA8
//   0x0A8 11 x (u32 count, u32 offset)
//   0x100 风格名 72B
//   0x148 基础定义表 16B
//   0x158 资源定义表 N*16B
//   之后  根属性 16B
//   之后  预览块
//   之后  资源块（u32 dataLen|nameLen<<24 + 16B 0 + 名字 + 数据）
//
// 资源名用 `_lua/xiaomi-band-10-pro/<文件名>`，这样运行时 SCRIPT_PATH
// 指向该目录，安装器就能用 SCRIPT_PATH .. "xxx.bin" 读到载荷。
//
// 用法：
//   node pack67.mjs --out dist/hello-p67.bin --payload ../probe/native/hello.bin
//   node pack67.mjs --out dist/probe-p67.bin  --payload ../probe/native/lra_probe.bin \
//                   --name "LRA 探针" --id 979820261027

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DEVICE_DIR = "xiaomi-band-10-pro";
const MAGIC = 0x1234a55a;
const VERSION = 0x00010003;
const HDR = 0xa8;
const PAIR_OFF = 0xa8;
const PAIRS = 11;
const BASE_OFF = 0x148;
const SCRIPT_OFF = 0x158;
const DEF_SIZE = 16;

function fail(message) {
  console.error("✗ " + message);
  process.exit(1);
}

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function u32(v) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(v >>> 0);
  return b;
}

function u16(v) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v & 0xffff);
  return b;
}

function pad(buf, n) {
  const out = Buffer.alloc(n);
  buf.copy(out, 0, 0, Math.min(buf.length, n));
  return out;
}

function def(index, type, offset, length) {
  const b = Buffer.alloc(DEF_SIZE);
  b.writeUInt16LE(index & 0xffff, 0);
  b[3] = type;
  b.writeUInt32LE(offset >>> 0, 8);
  b.writeUInt32LE(length >>> 0, 12);
  return b;
}

// ---- 图标：12 字节头 + BGRA 像素（与固件内置图标同规格）----
function makeIcon(size) {
  const w = size;
  const h = size;
  const stride = w * 4;
  const head = Buffer.alloc(12);
  head[0] = 0x19;
  head[1] = 0x10;
  head.writeUInt16LE(w, 4);
  head.writeUInt16LE(h, 6);
  head.writeUInt32LE(stride, 8);
  const px = Buffer.alloc(w * h * 4);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const r = (w * 100) / 112 / 2;
  const rIn = r * 0.72;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      let b = 0, g = 0, r0 = 0, a = 0;
      if (d <= rIn) {
        // 内圆：深蓝 → 亮蓝的纵向渐变
        const t = y / h;
        r0 = Math.round(0x12 + t * 0x20);
        g = Math.round(0x3a + t * 0x50);
        b = Math.round(0x8a + t * 0x70);
        a = 255;
      } else if (d <= r) {
        // 外环：亮蓝
        r0 = 0x4f;
        g = 0x9d;
        b = 0xf5;
        a = 255;
      }
      // 中心画一个白色 "≡"（三横），提示这是安装器
      if (a && Math.abs(dx) < r * 0.42 && Math.abs(dy) < r * 0.36) {
        const band = (k) => Math.abs(dy - (k - 1) * r * 0.24) < r * 0.07;
        if (band(0) || band(1) || band(2)) {
          r0 = 0xf5;
          g = 0xf7;
          b = 0xfb;
        }
      }
      const o = (y * w + x) * 4;
      px[o] = b; // BGRA
      px[o + 1] = g;
      px[o + 2] = r0;
      px[o + 3] = a;
    }
  }
  return Buffer.concat([head, px]);
}

// ---- 主逻辑 ----
const outPath = resolve(arg("--out", join(here, "dist", "installer-p67.bin")));
const payloadPaths = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--payload") payloadPaths.push(resolve(process.argv[i + 1]));
}
if (payloadPaths.length === 0) fail("至少需要一个 --payload <模块文件>");

const name = arg("--name", "原生应用安装器");
const style = arg("--style", name);
const id = arg("--id", "979820261027");
if (Buffer.byteLength(id) > 12) fail("--id 最长 12 字节");

const mainLuaPath = join(here, "main.lua");
let mainLua = readFileSync(mainLuaPath, "utf8");
if (!mainLua.includes("-- BEGIN PAYLOADS")) fail("main.lua 缺少 -- BEGIN PAYLOADS 标记");

// 生成载荷表（与 build.mjs 相同格式）
const payloadEntries = payloadPaths.map((p) => {
  const file = basename(p);
  const modName = file.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]/g, "_");
  const data = readFileSync(p);
  if (data.length < 52 || data.readUInt32BE(0) !== 0x7f454c46) fail(`${file} 不是 ELF`);
  if (data[4] !== 1 || data[5] !== 1) fail(`${file} 需要 32 位小端 ELF`);
  if (data.readUInt16LE(16) !== 1) fail(`${file} 需要 ET_REL`);
  if (data.readUInt16LE(18) !== 40) fail(`${file} 需要 ARM`);
  return { file, modName, data };
});

const block = [
  "    -- BEGIN PAYLOADS",
  "    payloads = {",
  ...payloadEntries.map(
    (p) => `        { file = ${JSON.stringify(p.file)}, name = ${JSON.stringify(p.modName)}, size = ${p.data.length} },`,
  ),
  "    },",
  "    -- END PAYLOADS",
].join("\n");
mainLua = mainLua.replace(/    -- BEGIN PAYLOADS[\s\S]*?-- END PAYLOADS/, block);

const preview = readFileSync(join(here, "assets", "p67-preview.block"));
if (preview.readUInt16LE(4) !== 336 || preview.readUInt16LE(6) !== 480) fail("预览块不是 336x480");

const icon112 = makeIcon(112);
const icon64 = makeIcon(64);
const fontSlot = Buffer.from("字体占位：安装器不使用字体资源。\n", "utf8");

const resources = [
  ["main.lua", Buffer.from(mainLua, "utf8")],
  ...payloadEntries.map((p) => [p.file, p.data]),
  ["icon.bin", icon112],
  ["icon_settings.bin", icon64],
  ["font.ttf", fontSlot],
];

const entries = resources.map(([file, data]) => {
  const name = Buffer.from(`_lua/${DEVICE_DIR}/${file}`, "latin1");
  if (name.length > 0xff) fail(`资源名太长: ${file}`);
  if (data.length > 0xffffff) fail(`资源太大: ${file}`);
  return { name, data };
});

const n = entries.length;
const propsOff = SCRIPT_OFF + n * DEF_SIZE;
const previewOff = propsOff + DEF_SIZE;
let cursor = previewOff + preview.length;

const blocks = [];
for (const e of entries) {
  const head = Buffer.concat([u32(e.data.length | (e.name.length << 24)), Buffer.alloc(16), e.name]);
  const blk = Buffer.concat([head, e.data]);
  blocks.push({ off: cursor, blk });
  cursor += blk.length;
}

const buf = Buffer.alloc(cursor);
buf.writeUInt32LE(MAGIC, 0);
buf.writeUInt32LE(VERSION, 4);
buf.writeUInt32LE(0x00000800, 0x10);
buf.writeUInt32LE(0x00010000, 0x14);
buf.writeUInt16LE(1, 0x1c);
buf.writeUInt16LE(0, 0x1e);
buf.writeUInt32LE(previewOff, 0x20);
pad(Buffer.from(id, "latin1"), 12).copy(buf, 0x28);
pad(Buffer.from(name, "utf8"), 60).copy(buf, 0x68);
pad(Buffer.from(style, "utf8"), 72).copy(buf, 0x100);

const pairs = [
  [0x80000000, previewOff],
  [1, BASE_OFF],
  [0, SCRIPT_OFF],
  [0, SCRIPT_OFF],
  [0, SCRIPT_OFF],
  [0, SCRIPT_OFF],
  [n, SCRIPT_OFF],
  [0, propsOff],
  [0, propsOff],
  [0, propsOff],
  [0, propsOff],
];
pairs.forEach(([cnt, off], i) => {
  buf.writeUInt32LE(cnt >>> 0, PAIR_OFF + i * 8);
  buf.writeUInt32LE(off >>> 0, PAIR_OFF + i * 8 + 4);
});

def(0, 0, propsOff, DEF_SIZE).copy(buf, BASE_OFF);
blocks.forEach((b, i) => {
  def(i, 5, b.off, b.blk.length).copy(buf, SCRIPT_OFF + i * DEF_SIZE);
});

buf.writeUInt16LE(0, propsOff);
buf[propsOff + 2] = 0;
buf[propsOff + 3] = 5;

preview.copy(buf, previewOff);
blocks.forEach((b) => b.blk.copy(buf, b.off));

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buf);

// 自检：解析回读
const chk = readFileSync(outPath);
if (chk.readUInt32LE(0) !== MAGIC || chk.readUInt32LE(4) !== VERSION) fail("容器头校验失败");
const cnt = chk.readUInt32LE(PAIR_OFF + 6 * 8);
const soff = chk.readUInt32LE(PAIR_OFF + 6 * 8 + 4);
const names = [];
for (let i = 0; i < cnt; i++) {
  const off = chk.readUInt32LE(soff + i * DEF_SIZE + 8);
  const packed = chk.readUInt32LE(off);
  const dataLen = packed & 0xffffff;
  const nameLen = packed >>> 24;
  names.push(`${chk.slice(off + 20, off + 20 + nameLen).toString("latin1")} (${dataLen} B)`);
}
console.log(`✓ ${outPath}  ${buf.length} B  预览 ${preview.readUInt16LE(4)}x${preview.readUInt16LE(6)}`);
for (const line of names) console.log("  " + line);
