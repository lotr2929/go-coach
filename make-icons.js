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

/* The Go Coach logo (Boon, 25 Nov 2026): a black and a white stone, overlapping, with shine and shadow, resting on one
   point of a grid on the app's light grey. Worked out on a 512 square; drawn 4x larger and averaged for smooth edges. The
   stones lie inside the maskable safe circle, so the same picture serves all three icons. docs/logo.svg is the same design. */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const ramp = (stops, t) => {
  t = Math.min(1, Math.max(0, t));
  for (let k = 1; k < stops.length; k++) if (t <= stops[k][0]) {
    const [t0, a] = stops[k - 1], [t1, b] = stops[k], f = (t - t0) / (t1 - t0 || 1);
    return a.map((v, i) => v + (b[i] - v) * f);
  }
  return stops[stops.length - 1][1];
};
const mix = (c, d, a) => c.map((v, i) => v + (d[i] - v) * a);
const erfc = x => { const t = 1 / (1 + .5 * Math.abs(x)), r = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (.37409196 + t * (.09678418 + t * (-.18628806 + t * (.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-.82215223 + t * .17087277))))))))); return x >= 0 ? r : 2 - r; };
const R = 118, BLACK = { x: 197, y: 211, stops: [[0, hex('#6b6f72')], [.18, hex('#34383b')], [.55, hex('#141618')], [1, hex('#050506')]], spread: .70 };
const WHITE = { x: 315, y: 301, stops: [[0, hex('#ffffff')], [.45, hex('#f3f1ec')], [.8, hex('#d9d5cc')], [1, hex('#b9b3a7')]], spread: .72 };
function stone(c, s, u, v) {
  const sd = Math.hypot(u - s.x - 8, v - s.y - 14);                       /* soft shadow, down and to the right */
  c = mix(c, [0, 0, 0], .45 * .5 * erfc((sd - R) / (9 * Math.SQRT2)));
  if (Math.hypot(u - s.x, v - s.y) > R) return c;
  const fx = s.x - R + .38 * 2 * R, fy = s.y - R + .32 * 2 * R;           /* light from the upper left */
  return ramp(s.stops, Math.hypot(u - fx, v - fy) / (s.spread * 2 * R));
}
function render(size) {
  const SS = 4, S = size * SS, k = 512 / S, acc = new Float64Array(size * size * 3);
  const grey = hex('#e9e8e5'), line = hex('#a9a6a0'), rot = Math.PI / 6;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x + .5) * k, v = (y + .5) * k;
    let c = (Math.abs(u - 256) < 2.5 || Math.abs(v - 256) < 2.5) ? line : grey;
    c = stone(c, BLACK, u, v);
    const gu = u - 157, gv = v - 161, eu = (gu * Math.cos(rot) - gv * Math.sin(rot)) / 38, ev = (gu * Math.sin(rot) + gv * Math.cos(rot)) / 24, e = Math.hypot(eu, ev);
    if (e < 1) c = mix(c, [255, 255, 255], .55 * .7 * (1 - e));            /* shine on the black stone */
    c = stone(c, WHITE, u, v);
    const o = (Math.floor(y / SS) * size + Math.floor(x / SS)) * 3;
    acc[o] += c[0]; acc[o + 1] += c[1]; acc[o + 2] += c[2];
  }
  const out = new Uint8Array(size * size * 4);
  for (let p = 0; p < size * size; p++) {
    for (let ch = 0; ch < 3; ch++) out[p * 4 + ch] = Math.round(acc[p * 3 + ch] / (SS * SS));
    out[p * 4 + 3] = 255;
  }
  return png(size, size, out);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]]) {
  fs.writeFileSync(path.join(__dirname, name), render(size)); /* one design: the stones sit inside the maskable safe area */
  console.log('wrote ' + name);
}
