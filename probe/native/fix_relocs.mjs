#!/usr/bin/env node
// 把 .rel* 段里的 R_ARM_TARGET1(38) 改写成 R_ARM_ABS32(2)。
//
// GNU ld 对 .init_array 里的函数指针会生成 R_ARM_TARGET1，而设备的 modlib
// 已知能接受的是 R_ARM_ABS32（Chaos-Module 的 chaos_mod.ko 就是 ABS32）。
// 两者语义等价（TARGET1 在静态链接里按 ABS32 处理），改写是安全的。
//
// 用法: node fix_relocs.mjs <file.ko> [more.ko ...]

import { readFileSync, writeFileSync } from "node:fs";

const SHT_REL = 9;

for (const path of process.argv.slice(2)) {
  const buf = readFileSync(path);
  if (buf.length < 52 || buf.readUInt32BE(0) !== 0x7f454c46) {
    console.error(`✗ ${path} 不是 ELF`);
    process.exit(1);
  }
  const shoff = buf.readUInt32LE(0x20);
  const shentsize = buf.readUInt16LE(0x2e);
  const shnum = buf.readUInt16LE(0x30);

  let patched = 0;
  for (let i = 0; i < shnum; i++) {
    const base = shoff + i * shentsize;
    const type = buf.readUInt32LE(base + 4);
    if (type !== SHT_REL) continue;
    const off = buf.readUInt32LE(base + 0x10);
    const size = buf.readUInt32LE(base + 0x14);
    const entsize = buf.readUInt32LE(base + 0x24) || 8;
    for (let p = off; p + 8 <= off + size; p += entsize) {
      const info = buf.readUInt32LE(p + 4);
      if ((info & 0xff) === 38) {
        buf.writeUInt32LE((info & 0xffffff00) | 2, p + 4);
        patched++;
      }
    }
  }
  writeFileSync(path, buf);
  console.log(`✓ ${path}: ${patched} 个 R_ARM_TARGET1 → R_ARM_ABS32`);
}
