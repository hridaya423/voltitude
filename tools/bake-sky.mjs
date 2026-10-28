import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [src, name, gainArg = '1'] = process.argv.slice(2);
const gain = Number(gainArg);
const buf = readFileSync(src);

let p = 0, W = 0, H = 0;
for (;;) {
  const e = buf.indexOf(10, p);
  const line = buf.toString('latin1', p, e);
  p = e + 1;
  const m = line.match(/^-Y (\d+) \+X (\d+)/);
  if (m) { H = +m[1]; W = +m[2]; break; }
}

function scanline(out) {
  const a = buf[p], b = buf[p + 1];
  if (a !== 2 || b !== 2) throw new Error('flat rgbe unsupported');
  p += 4;
  for (let c = 0; c < 4; c++) {
    let x = 0;
    while (x < W) {
      let n = buf[p++];
      if (n > 128) { n -= 128; const v = buf[p++]; while (n--) out[(x++) * 4 + c] = v; }
      else while (n--) out[(x++) * 4 + c] = buf[p++];
    }
  }
}

const rows = H / 2;
const lin = new Float32Array(W * rows * 3);
const line = new Uint8Array(W * 4);
let maxL = 0, sx = 0, sy = 0, sz = 0, sw = 0;
for (let y = 0; y < H; y++) {
  scanline(line);
  if (y >= rows) continue;
  const el = (1 - (y + 0.5) / H * 2) * Math.PI / 2;
  const ce = Math.cos(el), se = Math.sin(el);
  for (let x = 0; x < W; x++) {
    const e = line[x * 4 + 3];
    const k = e ? Math.pow(2, e - 136) : 0;
    const o = (y * W + x) * 3;
    const r = line[x * 4] * k, g = line[x * 4 + 1] * k, b = line[x * 4 + 2] * k;
    lin[o] = r; lin[o + 1] = g; lin[o + 2] = b;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l > maxL) maxL = l;
  }
}
const thresh = maxL * 0.25;
for (let y = 0; y < rows; y++) {
  const el = (1 - (y + 0.5) / H * 2) * Math.PI / 2;
  const ce = Math.cos(el), se = Math.sin(el);
  for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 3;
    const l = 0.2126 * lin[o] + 0.7152 * lin[o + 1] + 0.0722 * lin[o + 2];
    if (l < thresh) continue;
    const phi = ((x + 0.5) / W - 0.5) * Math.PI * 2;
    sx += l * ce * Math.cos(phi); sy += l * se; sz += l * ce * Math.sin(phi); sw += l;
  }
}
const len = Math.hypot(sx, sy, sz);
const dir = [sx / len, sy / len, sz / len];
const sunEl = Math.asin(dir[1]) * 180 / Math.PI;
const sunPhi = Math.atan2(dir[2], dir[0]);

const enc = (c) => {
  const t = (c * gain) / (1 + c * gain);
  return t <= 0.0031308 ? t * 12.92 : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
};
const px = Buffer.alloc(W * rows * 3);
for (let i = 0; i < px.length; i++) px[i] = Math.max(0, Math.min(255, Math.round(enc(lin[i]) * 255 + Math.random() - Math.random())));
const sample = [];
for (let i = 0; i < lin.length; i += 3 * 997) sample.push(0.2126 * lin[i] + 0.7152 * lin[i + 1] + 0.0722 * lin[i + 2]);
sample.sort((a, b) => a - b);
const pct = (q) => +sample[Math.floor(sample.length * q)].toFixed(4);

const out = new URL(`../assets/sky/${name}`, import.meta.url).pathname;
await sharp(px, { raw: { width: W, height: rows, channels: 3 } }).webp({ quality: 95, effort: 5 }).toFile(`${out}_sky.webp`);
await sharp(px, { raw: { width: W, height: rows, channels: 3 } }).resize(256, 64, { kernel: 'cubic' }).blur(1.2).png().toFile(`${out}_fog.png`);
const info = { width: W, height: rows, gain, maxLuminance: +maxL.toFixed(1), p10: pct(0.1), p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), sunElevationDeg: +sunEl.toFixed(2), sunPhi: +sunPhi.toFixed(4) };
writeFileSync(`${out}_sky.json`, JSON.stringify(info));
console.log(JSON.stringify(info));
