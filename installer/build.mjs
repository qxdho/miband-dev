#!/usr/bin/env node
// 扫描 installer/payloads/ 下的模块文件，重新生成 main.lua 里的载荷清单。
//
// 用法：
//   node build.mjs            # 校验载荷并重写 main.lua
//   node build.mjs --check    # 只校验，不写文件
//
// 载荷要求：32 位小端 ARM 可重定位 ELF（ET_REL, e_machine=40），
// 与固件 ABI 匹配。文件名去掉扩展名即为模块名（insmod/rmmod 用）。

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { basename, extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const payloadDir = join(here, "payloads");
const mainPath = join(here, "main.lua");
const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error("✗ " + message);
  process.exit(1);
}

function inspect(path) {
  const data = readFileSync(path);
  if (data.length < 52) fail(`${basename(path)} 太小，不是 ELF`);
  if (data.readUInt32BE(0) !== 0x7f454c46) fail(`${basename(path)} 不是 ELF`);
  if (data[4] !== 1 || data[5] !== 1) fail(`${basename(path)} 需要 32 位小端 ELF`);
  const type = data.readUInt16LE(16);
  const machine = data.readUInt16LE(18);
  if (type !== 1) fail(`${basename(path)} 的 e_type=${type}，需要 ET_REL(1)`);
  if (machine !== 40) fail(`${basename(path)} 的 e_machine=${machine}，需要 ARM(40)`);
  return { size: data.length };
}

if (!existsSync(payloadDir)) fail(`缺少目录 ${payloadDir}`);
const files = readdirSync(payloadDir)
  .filter((name) => [".elf", ".ko", ".bin"].includes(extname(name).toLowerCase()))
  .filter((name) => statSync(join(payloadDir, name)).isFile())
  .sort();

const seen = new Map();
const payloads = [];
for (const file of files) {
  const path = join(payloadDir, file);
  const { size } = inspect(path);
  const raw = basename(file, extname(file));
  const name = raw.replace(/[^A-Za-z0-9_-]/g, "_");
  if (!name) fail(`${file} 无法推导模块名`);
  if (seen.has(name)) fail(`模块名重复：${name}（${seen.get(name)} 与 ${file}）`);
  seen.set(name, file);
  payloads.push({ file, name, size });
}

if (payloads.length === 0) {
  console.error("⚠ payloads/ 为空：安装器将无法安装任何模块");
}

const lines = payloads.map(
  (p) => `        { file = ${JSON.stringify(p.file)}, name = ${JSON.stringify(p.name)}, size = ${p.size} },`,
);
const block = [
  "    -- BEGIN PAYLOADS",
  "    payloads = {",
  ...lines,
  "    },",
  "    -- END PAYLOADS",
].join("\n");

let source = readFileSync(mainPath, "utf8");
if (!source.includes("-- BEGIN PAYLOADS")) fail("main.lua 缺少 -- BEGIN PAYLOADS 标记");
source = source.replace(
  /    -- BEGIN PAYLOADS[\s\S]*?-- END PAYLOADS/,
  block,
);

if (!checkOnly) writeFileSync(mainPath, source);

console.log(`✓ ${payloads.length} 个载荷`);
for (const p of payloads) {
  console.log(`  ${p.file}  →  /data/miband-installer/${p.name}/${p.file}  (${p.size} B)`);
}
if (!checkOnly) console.log("✓ 已更新 main.lua");
