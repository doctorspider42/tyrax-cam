// Generates assets/icon.png - the app icon, drawn rather than hand-authored so
// it stays reproducible and tweakable. A viewfinder bracket around a record dot,
// in the app's own palette; opaque, because iOS icons must not be transparent.
//
// Usage: node scripts/make-icon.mjs
//
// Deliberately dependency-free: zlib is built into Node, and a PNG is a short
// enough format to emit by hand. Replace it with real artwork whenever someone
// wants to - nothing depends on this script at build time.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SIZE = 1024;
const BG = [0x14, 0x16, 0x1a];      // the app's background
const FRAME = [0xe6, 0xe6, 0xe6];   // its foreground text colour
const DOT = [0xff, 0x30, 0x40];     // the REC badge red

const px = Buffer.alloc(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; ++i) {
  px[i * 3] = BG[0];
  px[i * 3 + 1] = BG[1];
  px[i * 3 + 2] = BG[2];
}

const set = (x, y, c) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const o = (y * SIZE + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
};
const fillRect = (x0, y0, w, h, c) => {
  for (let y = y0; y < y0 + h; ++y) for (let x = x0; x < x0 + w; ++x) set(x, y, c);
};

// Viewfinder brackets: two arms per corner.
const INSET = 168;
const ARM = 250;
const T = 40;
for (const [cx, sx] of [[INSET, 1], [SIZE - INSET, -1]]) {
  for (const [cy, sy] of [[INSET, 1], [SIZE - INSET, -1]]) {
    const x = sx > 0 ? cx : cx - ARM;
    const y = sy > 0 ? cy : cy - T;
    fillRect(x, y, ARM, T, FRAME);                                  // horizontal arm
    fillRect(sx > 0 ? cx : cx - T, sy > 0 ? cy : cy - ARM, T, ARM, FRAME);  // vertical
  }
}

// Record dot, antialiased so it does not look like a cog at small sizes.
const R = 132;
const C = SIZE / 2;
for (let y = C - R - 2; y <= C + R + 2; ++y) {
  for (let x = C - R - 2; x <= C + R + 2; ++x) {
    const d = Math.hypot(x + 0.5 - C, y + 0.5 - C);
    const a = Math.max(0, Math.min(1, R + 0.5 - d));
    if (a <= 0) continue;
    const o = (y * SIZE + x) * 3;
    for (let ch = 0; ch < 3; ++ch)
      px[o + ch] = Math.round(px[o + ch] * (1 - a) + DOT[ch] * a);
  }
}

// --- minimal PNG writer ---
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; ++n) {
    let c = n;
    for (let k = 0; k < 8; ++k) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 2;   // truecolour RGB
// Each scanline is prefixed with its filter type (0 = none).
const raw = Buffer.alloc(SIZE * (SIZE * 3 + 1));
for (let y = 0; y < SIZE; ++y) {
  raw[y * (SIZE * 3 + 1)] = 0;
  px.copy(raw, y * (SIZE * 3 + 1) + 1, y * SIZE * 3, (y + 1) * SIZE * 3);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
const out = new URL('../assets/icon.png', import.meta.url);
writeFileSync(out, png);
console.log(`assets/icon.png: ${SIZE}x${SIZE}, ${png.length} bytes`);
