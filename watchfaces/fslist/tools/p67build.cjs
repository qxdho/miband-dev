#!/usr/bin/env node
// Xiaomi Band 10 Pro (p67) Lua watchface container builder.
//
// Format derived from the official Canopus manager installer
// (ref/canopus-mgr-10p-v65539.bin) and cross-checked against the 8 Pro
// .face sample. Layout for a single-style p67 watchface:
//
//   0x000  main header (0xA8)
//   0x0A8  11 x (u32 count, u32 offset) face pairs
//   0x148  base definition table      (pair[1])
//   ...    script definition table    (pair[6], 16 B each)
//   ...    root props record          (pair[7], 16 B: u16 index, u16 type=5)
//   ...    preview block              (pair[0].offset, 12 B header + data)
//   ...    resource blocks, back to back, NO alignment
//
// Resource block: 20-byte header = u32 (dataLen | nameLen << 24) + 16 zero
// bytes, then the ASCII name, then the data. The definition's length field is
// the whole block: 20 + nameLen + dataLen.
'use strict';
const fs = require('fs');
const path = require('path');

const MAGIC = 0x1234a55a;
const VERSION = 0x00010003;
const HDR_SIZE = 0xa8;
const PAIR_COUNT = 11;
const PAIR_OFF = HDR_SIZE;
const BASE_DEF_OFF = 0x148;
const SCR_DEF_OFF = 0x158;
const DEF_SIZE = 16;

function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff); return b; }
function padRight(buf, n) { const o = Buffer.alloc(n); buf.copy(o, 0, 0, Math.min(buf.length, n)); return o; }

function readDef(buf, off) {
  return {
    index: buf.readUInt16LE(off),
    type: buf[off + 3],
    offset: buf.readUInt32LE(off + 8),
    length: buf.readUInt32LE(off + 12),
  };
}

function readBlock(buf, off) {
  const packed = buf.readUInt32LE(off);
  const dataLen = packed & 0xffffff;
  const nameLen = packed >>> 24;
  const name = buf.toString('latin1', off + 20, off + 20 + nameLen);
  const dataOff = off + 20 + nameLen;
  return { dataLen, nameLen, name, dataOff, data: buf.slice(dataOff, dataOff + dataLen), total: 20 + nameLen + dataLen };
}

function inspect(file) {
  const buf = fs.readFileSync(file);
  const info = {
    file, size: buf.length,
    magic: '0x' + buf.readUInt32LE(0).toString(16),
    version: '0x' + buf.readUInt32LE(4).toString(16),
    deviceFlag: '0x' + buf.readUInt32LE(0x10).toString(16),
    faceCount: buf.readUInt16LE(0x1c),
    styleCount: buf.readUInt16LE(0x1e),
    previewOffset: buf.readUInt32LE(0x20),
    id: buf.toString('latin1', 0x28, 0x34),
    name: buf.toString('utf8', 0x68, 0xa4).replace(/\0+$/, ''),
    pairs: [], baseDefs: [], scriptDefs: [], blocks: [], preview: null,
  };
  for (let i = 0; i < PAIR_COUNT; i++) {
    info.pairs.push([buf.readUInt32LE(PAIR_OFF + i * 8), buf.readUInt32LE(PAIR_OFF + i * 8 + 4)]);
  }
  const baseCount = info.pairs[1][0], baseOff = info.pairs[1][1];
  for (let i = 0; i < baseCount; i++) info.baseDefs.push(readDef(buf, baseOff + i * DEF_SIZE));
  const scrCount = info.pairs[6][0], scrOff = info.pairs[6][1];
  for (let i = 0; i < scrCount; i++) {
    const d = readDef(buf, scrOff + i * DEF_SIZE);
    const blk = readBlock(buf, d.offset);
    info.scriptDefs.push(d);
    info.blocks.push({ index: d.index, offset: d.offset, length: d.length, ...blk, data: undefined, dataLen: blk.dataLen, name: blk.name });
  }
  const p = info.previewOffset;
  info.preview = {
    sign: buf[p], flags: buf[p + 1], compress: buf[p + 2], reserved: buf[p + 3],
    width: buf.readUInt16LE(p + 4), height: buf.readUInt16LE(p + 6),
    length: buf.readUInt32LE(p + 8),
  };
  return info;
}

// spec: { name, id, preview (path to a preview block file), files: [{ name, path }] }
function build(spec, outFile) {
  const preview = fs.readFileSync(spec.preview);
  const files = spec.files.map((f) => ({ name: f.name, data: fs.readFileSync(f.path) }));

  const scriptDefOff = SCR_DEF_OFF;
  const propsOff = scriptDefOff + files.length * DEF_SIZE;
  const previewOff = propsOff + DEF_SIZE;

  // Resource blocks start immediately after the preview block.
  let cursor = previewOff + preview.length;
  const placed = files.map((f) => {
    const nameBuf = Buffer.from(f.name, 'latin1');
    if (nameBuf.length > 255) throw new Error('resource name too long: ' + f.name);
    if (f.data.length > 0xffffff) throw new Error('resource too large: ' + f.name);
    const header = Buffer.alloc(20);
    header.writeUInt32LE((f.data.length & 0xffffff) | (nameBuf.length << 24), 0);
    const block = Buffer.concat([header, nameBuf, f.data]);
    const rec = { ...f, nameBuf, block, offset: cursor };
    cursor += block.length;
    return rec;
  });

  const buf = Buffer.alloc(cursor);

  // ---- main header -------------------------------------------------------
  buf.writeUInt32LE(MAGIC, 0);
  buf.writeUInt32LE(VERSION, 4);
  buf.writeUInt32LE(0x00000800, 0x10);   // device flag, identical on p67
  buf.writeUInt32LE(0x00010000, 0x14);
  buf.writeUInt16LE(1, 0x1c);            // face count
  buf.writeUInt16LE(0, 0x1e);            // style count
  buf.writeUInt32LE(previewOff, 0x20);   // preview start (= record table end)
  padRight(Buffer.from(spec.id, 'latin1'), 12).copy(buf, 0x28);
  padRight(Buffer.from(spec.name, 'utf8'), 60).copy(buf, 0x68);

  // ---- style name block (0x100..0x148, 72 bytes) -------------------------
  padRight(Buffer.from(spec.styleName || '\u6837\u5f0f1', 'utf8'), 72).copy(buf, 0x100);

  // ---- face pairs --------------------------------------------------------
  const pairs = [
    [0x80000000, previewOff],   // [0] preview
    [1, BASE_DEF_OFF],          // [1] base definitions
    [0, scriptDefOff],          // [2]
    [0, scriptDefOff],          // [3]
    [0, scriptDefOff],          // [4]
    [0, scriptDefOff],          // [5]
    [files.length, scriptDefOff], // [6] script/resource definitions
    [0, propsOff],              // [7]
    [0, propsOff],              // [8]
    [0, propsOff],              // [9]
    [0, propsOff],              // [10]
  ];
  pairs.forEach((p, i) => {
    buf.writeUInt32LE(p[0], PAIR_OFF + i * 8);
    buf.writeUInt32LE(p[1], PAIR_OFF + i * 8 + 4);
  });

  // ---- base definition: one element of type 0 pointing at the props record
  buf.writeUInt16LE(0, BASE_DEF_OFF);
  buf[BASE_DEF_OFF + 3] = 0;
  buf.writeUInt32LE(propsOff, BASE_DEF_OFF + 8);
  buf.writeUInt32LE(DEF_SIZE, BASE_DEF_OFF + 12);

  // ---- script definitions -----------------------------------------------
  placed.forEach((f, i) => {
    const o = scriptDefOff + i * DEF_SIZE;
    buf.writeUInt16LE(i, o);
    buf[o + 3] = 5;
    buf.writeUInt32LE(f.offset, o + 8);
    buf.writeUInt32LE(f.block.length, o + 12);
  });

  // ---- root props record: same 4-byte header as a definition -------------
  buf.writeUInt16LE(spec.entryIndex || 0, propsOff);
  buf[propsOff + 2] = 0;
  buf[propsOff + 3] = 5;   // type 5 = Lua script

  // ---- preview + blocks --------------------------------------------------
  preview.copy(buf, previewOff);
  placed.forEach((f) => f.block.copy(buf, f.offset));

  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, buf);
  return { size: buf.length, previewOff, previewLen: preview.length, blocks: placed.map((f) => ({ name: f.name, offset: f.offset, length: f.block.length })) };
}

function verify(file) {
  const buf = fs.readFileSync(file);
  const info = inspect(file);
  const errors = [];
  if (info.magic !== '0x1234a55a') errors.push('magic ' + info.magic);
  if (info.pairs[0][0] !== 0x80000000) errors.push('pair0 marker');
  if (info.pairs[0][1] !== info.previewOffset) errors.push('pair0 offset != preview offset');
  if (info.previewOffset !== 0x148 + DEF_SIZE + info.scriptDefs.length * DEF_SIZE + DEF_SIZE + 0) {
    // preview may be separated, but must at least follow the tables
    if (info.previewOffset < propsExpected(info)) errors.push('preview overlaps tables');
  }
  if (info.preview.width !== 336 || info.preview.height !== 480) errors.push('preview not 336x480');
  if (buf.length !== info.previewOffset + 12 + info.preview.length + info.blocks.reduce((a, b) => a + b.length, 0)) {
    errors.push('size mismatch (preview + blocks != file)');
  }
  info.blocks.forEach((b, i) => {
    const expect = info.previewOffset + 12 + info.preview.length + info.blocks.slice(0, i).reduce((a, x) => a + x.length, 0);
    if (b.offset !== expect) errors.push('block ' + i + ' not contiguous');
    if (20 + b.nameLen + b.dataLen !== b.length) errors.push('block ' + i + ' length field');
  });
  return { ok: errors.length === 0, errors, info };
}

function propsExpected(info) {
  return 0x158 + info.scriptDefs.length * DEF_SIZE + DEF_SIZE;
}

module.exports = { build, inspect, verify, readBlock };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  const usage = 'usage: p67build.js inspect <file> | build <spec.json> <out> | verify <file>';
  if (cmd === 'inspect') {
    const info = inspect(rest[0]);
    console.log(JSON.stringify(info, (k, v) => (v && v.type === 'Buffer' ? '<buffer>' : v), 2));
  } else if (cmd === 'build') {
    const spec = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
    const res = build(spec, rest[1]);
    console.log('built ' + rest[1] + ' (' + res.size + ' B) preview@0x' + res.previewOff.toString(16));
    res.blocks.forEach((b) => console.log('  ' + b.name + ' @0x' + b.offset.toString(16) + ' len ' + b.length));
    const v = verify(rest[1]);
    console.log(v.ok ? 'verify OK' : 'verify FAILED: ' + v.errors.join('; '));
    if (!v.ok) process.exit(1);
  } else if (cmd === 'verify') {
    let bad = 0;
    for (const f of rest) {
      const v = verify(f);
      console.log((v.ok ? 'OK   ' : 'FAIL ') + f + (v.ok ? '' : '  -> ' + v.errors.join('; ')));
      if (!v.ok) bad++;
    }
    process.exit(bad ? 1 : 0);
  } else {
    console.log(usage);
    process.exit(1);
  }
}
