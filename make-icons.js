/* Makes the three app icons (PNG) without any library. Run once: node make-icons.js */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const table = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function render(size, maskable) {
  const S = size * 2, big = new Uint8Array(S * S * 3);
  const inset = maskable ? 0 : S * 0.06, rr = maskable ? 0 : S * 0.12;
  const gi = maskable ? S * 0.18 : inset;
  const lo = gi + (S - 2 * gi) * 0.14, hi = S - lo, step = (hi - lo) / 4, lw = Math.max(2, S / 170), rad = step * 0.46;
  const stones = [[1, 1, 1], [2, 2, 0], [3, 1, 0], [2, 3, 1], [1, 3, 0]].map(([i, j, b]) => ({ x: lo + i * step, y: lo + j * step, b }));
  const inBoard = (x, y) => {
    if (maskable) return true;
    const cx = Math.min(Math.max(x, inset + rr), S - inset - rr), cy = Math.min(Math.max(y, inset + rr), S - inset - rr);
    return x >= inset && x <= S - inset && y >= inset && y <= S - inset && Math.hypot(x - cx, y - cy) <= rr;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let c = [28, 39, 38];
    if (inBoard(x, y)) {
      c = [217, 169, 90];
      for (let k = 0; k < 5; k++) {
        const g = lo + k * step;
        if ((Math.abs(y - g) < lw / 2 && x >= lo - lw / 2 && x <= hi + lw / 2) || (Math.abs(x - g) < lw / 2 && y >= lo - lw / 2 && y <= hi + lw / 2)) c = [51, 34, 12];
      }
    }
    for (const s of stones) {
      const dx = x - s.x, dy = y - s.y, d = Math.hypot(dx, dy);
      if (d > rad) continue;
      if (s.b) { const h = Math.max(0, 1 - Math.hypot(dx + rad * .35, dy + rad * .35) / (rad * .9)); c = [16 + h * 75, 20 + h * 75, 20 + h * 75]; }
      else { const t = (d / rad) ** 2; c = [244 - t * 34, 241 - t * 34, 232 - t * 38]; }
    }
    const o = (y * S + x) * 3; big[o] = c[0]; big[o + 1] = c[1]; big[o + 2] = c[2];
  }
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    for (let ch = 0; ch < 3; ch++) {
      let sum = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) sum += big[((y * 2 + j) * S + x * 2 + i) * 3 + ch];
      out[(y * size + x) * 4 + ch] = Math.round(sum / 4);
    }
    out[(y * size + x) * 4 + 3] = 255;
  }
  return png(size, size, out);
}

for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
  fs.writeFileSync(path.join(__dirname, name), render(size, maskable));
  console.log('wrote ' + name);
}
