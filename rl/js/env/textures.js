import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
import { rng, dataTexture, makeCanvas, canvasTexture, smoothstep } from "@rl/js/env/util.js";
import { ARENA, LIGHT_PLAN, ZONES, APPROACH, KICKER, LINEUP, fromRampLocal, insideArena } from "@rl/js/config.js";
import { GROUND_MAP } from "@rl/js/env/layout.js";
const ASPHALT = LIGHT_PLAN.ASPHALT;
const LAT = 256;
function lattice(seed) {
const r = rng(seed); const a = new Float32Array(LAT * LAT);
for (let i = 0; i < a.length; i++) a[i] = r();
return a;
}
function vnoise(L, x, y, per, ox, oy) {
const xi = Math.floor(x), yi = Math.floor(y);
let fx = x - xi, fy = y - yi;
fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
const x0 = ((xi % per) + per) % per, y0 = ((yi % per) + per) % per;
const x1 = (x0 + 1) % per, y1 = (y0 + 1) % per;
const r0 = ((y0 + oy) & 255) * LAT, r1 = ((y1 + oy) & 255) * LAT;
const c0 = (x0 + ox) & 255, c1 = (x1 + ox) & 255;
const a = L[r0 + c0], b = L[r0 + c1], c = L[r1 + c0], d = L[r1 + c1];
return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbmField(N, L, freqs, amps, salt = 0) {
const out = new Float32Array(N * N);
let norm = 0; for (const a of amps) norm += a;
for (let o = 0; o < freqs.length; o++) {
const per = freqs[o], amp = amps[o] / norm, s = per / N;
const ox = (o * 37 + salt * 11) & 255, oy = (o * 71 + salt * 29) & 255;
for (let y = 0; y < N; y++) {
const yy = y * s; const row = y * N;
for (let x = 0; x < N; x++) out[row + x] += amp * vnoise(L, x * s, yy, per, ox, oy);
}
}
return out;
}
function stamp(field, N, cx, cy, rad, val) {
const r = Math.ceil(rad + 1);
for (let dy = -r; dy <= r; dy++) {
for (let dx = -r; dx <= r; dx++) {
const d = Math.hypot(dx + (cx - Math.round(cx)), dy + (cy - Math.round(cy)));
if (d > rad + 0.8) continue;
const w = Math.min(1, rad + 0.8 - d);
const x = ((Math.round(cx) + dx) % N + N) % N, y = ((Math.round(cy) + dy) % N + N) % N;
const i = y * N + x;
if (field[i] < w * val) field[i] = w * val;
}
}
}
function crackField(N, r, count, scale) {
const f = new Float32Array(N * N);
const walk = (x, y, ang, len, width, depth) => {
for (let s = 0; s < len; s++) {
ang += (r() - 0.5) * 0.7;
x += Math.cos(ang) * 1.2 * scale; y += Math.sin(ang) * 1.2 * scale;
stamp(f, N, x, y, width * (1 - s / len * 0.6), 1);
if (depth < 2 && r() < 0.012) walk(x, y, ang + (r() < 0.5 ? 1 : -1) * (0.6 + r()), len * 0.4 * r(), width * 0.7, depth + 1);
}
};
for (let i = 0; i < count; i++) walk(r() * N, r() * N, r() * Math.PI * 2, (40 + r() * 160) * (N / 1024) / scale, (0.5 + r() * 0.7) * scale, 0);
return f;
}
function normalFromHeight(H, N, strength) {
const out = new Uint8Array(N * N * 4);
for (let y = 0; y < N; y++) {
const ym = ((y - 1 + N) % N) * N, yp = ((y + 1) % N) * N, row = y * N;
for (let x = 0; x < N; x++) {
const xm = (x - 1 + N) % N, xp = (x + 1) % N;
const dx = (H[row + xp] - H[row + xm]) * strength;
const dy = (H[yp + x] - H[ym + x]) * strength;
const il = 1 / Math.sqrt(dx * dx + dy * dy + 1);
const i = (row + x) * 4;
out[i] = (-dx * il * 0.5 + 0.5) * 255;
out[i + 1] = (-dy * il * 0.5 + 0.5) * 255;
out[i + 2] = (il * 0.5 + 0.5) * 255;
out[i + 3] = 255;
}
}
return out;
}
export function makeAsphaltSet(N, anisotropy) {
const L = lattice(1337), r = rng(4242);
const k = N / 1024;
const D = ASPHALT.DETAIL;
const broad = fbmField(N, L, [4, 8, 16, 32], [1, 0.8, 0.6, 0.4], 1);
const mid = fbmField(N, L, [64, 128], [1, 0.6], 2);
const stoneA = fbmField(N, L, [Math.min(256, 256 * k | 0 || 64)], [1], 3);
const stoneB = fbmField(N, L, [Math.min(256, 128 * k | 0 || 32)], [1], 4);
const cracks = crackField(N, r, 10, Math.max(0.6, k));
const H = new Float32Array(N * N);
const alb = new Uint8Array(N * N * 4), surf = new Uint8Array(N * N * 4);
for (let i = 0; i < N * N; i++) {
const sa = smoothstep(0.6, 0.78, stoneA[i]);
const sb = smoothstep(0.66, 0.84, stoneB[i]);
const pit = smoothstep(0.22, 0.08, stoneA[i]) * 0.8;
const cr = cracks[i];
const speck = r() < 0.02 ? r() : 0;
const h = 0.35 * broad[i] + 0.25 * mid[i] + 0.3 * sa + 0.2 * sb - 0.3 * pit - 0.7 * cr;
H[i] = h;
let v = D.base + broad[i] * D.broad + mid[i] * D.mid + sa * D.stoneA + sb * D.stoneB - pit * D.pit + speck * D.speck;
v *= 1 - 0.45 * cr;
const tint = (sa > 0.5 ? (stoneA[i] - 0.6) * 8 : 0);
const j = i * 4;
alb[j] = Math.max(0, Math.min(255, v + tint * 0.6));
alb[j + 1] = Math.max(0, Math.min(255, v + tint * 0.3));
alb[j + 2] = Math.max(0, Math.min(255, v - tint * 0.2));
alb[j + 3] = 255;
const rough = 0.84 + 0.06 * mid[i] + ASPHALT.STONE_ROUGH * sa - 0.03 * speck + 0.08 * cr;
surf[j] = Math.max(0, Math.min(255, (1 - pit * 0.6 - cr * 0.8) * 255));
surf[j + 1] = Math.max(0, Math.min(255, rough * 255));
surf[j + 2] = Math.max(0, Math.min(255, (h * 0.8 + 0.25) * 255));
surf[j + 3] = 255;
}
const nrm = normalFromHeight(H, N, 1.1 * k + 0.3);
return {
albedo: dataTexture(alb, N, N, { srgb: true, anisotropy }),
surface: dataTexture(surf, N, N, { anisotropy }),
normal: dataTexture(nrm, N, N, { anisotropy }),
};
}
export const MASK_ORIGIN = [GROUND_MAP.X0, GROUND_MAP.Z0];
export const MASK_SIZE = Math.max(GROUND_MAP.W, GROUND_MAP.H);
export function makeApronMask(N) {
const L = lattice(777), r = rng(99);
const puddle = fbmField(N, L, [8, 16, 32, 64], [1, 0.7, 0.45, 0.25], 5);
const tone = fbmField(N, L, [4, 8, 16], [1, 0.6, 0.3], 6);
const patch = new Float32Array(N * N);
const mpp = MASK_SIZE / N;
const B = ARENA.BOUNDS, MS = ASPHALT.MIDSCALE;
for (let p = 0; p < MS.patches; p++) {
const cx = B.MIN_X + r() * (B.MAX_X - B.MIN_X), cz = B.MIN_Z + r() * (B.MAX_Z - B.MIN_Z);
const w = 3 + r() * 14, h = 2 + r() * 7, a = r() < 0.6 ? Math.round(r() * 2) * Math.PI / 2 : r() * Math.PI;
const ca = Math.cos(a), sa = Math.sin(a);
const rad = Math.hypot(w, h) / mpp;
const px = (cx - MASK_ORIGIN[0]) / mpp, pz = (cz - MASK_ORIGIN[1]) / mpp;
const t = MS.patchTone[0] + r() * (MS.patchTone[1] - MS.patchTone[0]);
for (let y = Math.max(0, pz - rad | 0); y < Math.min(N, pz + rad + 1); y++) {
for (let x = Math.max(0, px - rad | 0); x < Math.min(N, px + rad + 1); x++) {
const dx = (x - px) * mpp, dz = (y - pz) * mpp;
const u = dx * ca + dz * sa, v = -dx * sa + dz * ca;
if (Math.abs(u) < w / 2 && Math.abs(v) < h / 2) patch[y * N + x] = Math.max(0.02, 0.5 + (t - 1) * 2.5);
}
}
}
const d = new Uint8Array(N * N * 4);
for (let i = 0; i < N * N; i++) {
const j = i * 4;
d[j] = puddle[i] * 255; d[j + 1] = patch[i] * 255; d[j + 2] = tone[i] * 255; d[j + 3] = 255;
}
const t = dataTexture(d, N, N, { repeat: false, anisotropy: 2 });
return t;
}
export function makeMarksTexture(N, anisotropy) {
const c = makeCanvas(N, N);
const ctx = c && c.getContext ? c.getContext('2d') : null;
if (!ctx) {
const d = new Uint8Array(4 * 4 * 4).fill(255);
return dataTexture(d, 4, 4, { repeat: false, mips: false });
}
const r = rng(2026);
const S = N / MASK_SIZE;
const P = (x, z) => [(x - MASK_ORIGIN[0]) * S, (z - MASK_ORIGIN[1]) * S];
ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, N, N);
ctx.lineCap = 'round'; ctx.lineJoin = 'round';
const bez = (p, t) => {
const u = 1 - t;
const x = u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6];
const z = u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7];
const dx = 3 * u * u * (p[2] - p[0]) + 6 * u * t * (p[4] - p[2]) + 3 * t * t * (p[6] - p[4]);
const dz = 3 * u * u * (p[3] - p[1]) + 6 * u * t * (p[5] - p[3]) + 3 * t * t * (p[7] - p[5]);
const l = Math.hypot(dx, dz) || 1;
return [x, z, -dz / l, dx / l];
};
const tracks = (pts, alpha, gauge = 1.66, wid = 0.3) => {
for (const side of [-1, 1]) {
ctx.beginPath();
for (let i = 0; i <= 40; i++) {
const [x, z, nx, nz] = bez(pts, i / 40);
const [px, pz] = P(x + nx * side * gauge * 0.5, z + nz * side * gauge * 0.5);
if (i === 0) ctx.moveTo(px, pz); else ctx.lineTo(px, pz);
}
ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
ctx.lineWidth = Math.max(1, wid * S);
ctx.stroke();
}
};
const ring = (cx, cz, rad, a, w = 0.32) => {
ctx.beginPath(); const [px, pz] = P(cx, cz);
ctx.arc(px, pz, rad * S, 0, Math.PI * 2);
ctx.strokeStyle = `rgba(0,0,0,${a})`; ctx.lineWidth = Math.max(1, w * S); ctx.stroke();
};
const B = ARENA.BOUNDS;
for (let i = 0; i < 70; i++) {
const x0 = B.MIN_X + 20 + r() * (B.MAX_X - B.MIN_X - 40), z0 = B.MIN_Z + 20 + r() * (B.MAX_Z - B.MIN_Z - 40);
if (!insideArena(x0, z0, 6)) continue;
const a = r() * Math.PI * 2, l = 12 + r() * 40, b = a + (r() - 0.5) * 2.2;
tracks([x0, z0, x0 + Math.cos(a) * l * 0.4, z0 + Math.sin(a) * l * 0.4,
x0 + Math.cos(b) * l * 0.8, z0 + Math.sin(b) * l * 0.8, x0 + Math.cos(b) * l, z0 + Math.sin(b) * l], 0.04 + r() * 0.08);
}
const FS = ZONES.FREESTYLE;
const donut = (cx, cz, rad, turns, a0, drift, ell, alpha, dir) => {
const n = Math.max(24, Math.round(turns * 64)), rot = r() * Math.PI, ca = Math.cos(rot), sa = Math.sin(rot);
const wob = r() * 6.28, w = 0.3 + r() * 0.14;
const pt = (t, off) => {
const ang = a0 + dir * t * turns * Math.PI * 2;
const rr = rad * (1 + 0.08 * Math.sin(ang * 3 + wob)) + off;
const ex = Math.cos(ang) * rr * ell, ez = Math.sin(ang) * rr;
return P(cx + drift[0] * t + ex * ca - ez * sa, cz + drift[1] * t + ex * sa + ez * ca);
};
ctx.lineCap = 'butt'; ctx.lineWidth = Math.max(1, w * S);
for (const off of [-0.8, 0.8]) {
for (let i0 = 0; i0 < n; i0 += 8) {
const i1 = Math.min(n, i0 + 8), tm = (i0 + i1) / 2 / n;
const env = Math.min(1, tm * 5) * Math.min(1, (1 - tm) * 3);
ctx.strokeStyle = `rgba(0,0,0,${(alpha * (0.35 + 0.65 * env)).toFixed(3)})`;
ctx.beginPath();
for (let i = i0; i <= i1; i++) { const [px, pz] = pt(i / n, off); if (i === i0) ctx.moveTo(px, pz); else ctx.lineTo(px, pz); }
ctx.stroke();
}
}
ctx.lineCap = 'round';
};
for (let i = 0; i < 22; i++) {
const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * (FS.r - 4);
const cx = FS.center[0] + Math.cos(a) * d, cz = FS.center[2] + Math.sin(a) * d;
const rad = 2.2 + r() * 3.2, turns = 1 + r() * 2.5, da = r() * Math.PI * 2, dl = 0.5 + r() * 3.5;
donut(cx, cz, rad, turns, r() * 6.28, [Math.cos(da) * dl, Math.sin(da) * dl], 0.82 + r() * 0.3, 0.1 + r() * 0.16, r() < 0.5 ? -1 : 1);
}
for (let i = 0; i < 5; i++) {
const a = r() * Math.PI * 2, d = r() * (FS.r - 3);
donut(FS.center[0] + Math.cos(a) * d, FS.center[2] + Math.sin(a) * d, 4 + r() * 5, 0.3 + r() * 0.45, r() * 6.28, [0, 0], 0.9 + r() * 0.3, 0.08 + r() * 0.1, r() < 0.5 ? -1 : 1);
}
for (let i = 0; i < 4; i++) {
const p = fromRampLocal(-20 - r() * 14, -6 - r() * 4);
for (let k = 0; k < 3; k++) ring(p[0], p[2], 3 + k * 0.4 + r(), 0.06 + r() * 0.06);
}
for (let i = 0; i < 26; i++) {
const x = (r() - 0.5) * 3.0;
tracks([x, APPROACH.Z1 - 10 - r() * 20, x * 0.7, -10, x * 0.4, 10, x * 0.2, KICKER.ORIGIN[2] - 0.5], 0.06 + r() * 0.08);
const w = (r() - 0.5) * 2.4, a0 = fromRampLocal(-44, w), a1 = fromRampLocal(-30, w * 0.7), a2 = fromRampLocal(-15, w * 0.4), a3 = fromRampLocal(-8.6, w * 0.2);
tracks([a0[0], a0[2], a1[0], a1[2], a2[0], a2[2], a3[0], a3[2]], 0.06 + r() * 0.07);
}
for (let i = 0; i < 30; i++) {
const x = (r() - 0.5) * 22, z = 80 + r() * 90, l = 10 + r() * 35;
tracks([x, z, x + (r() - 0.5) * 2, z + l * 0.33, x + (r() - 0.5) * 4, z + l * 0.66, x + (r() - 0.5) * 6, z + l], 0.05 + r() * 0.1);
}
for (let i = 0; i < 14; i++) {
const w = (r() - 0.5) * 10, s0 = -40 - r() * 15;
const a0 = fromRampLocal(s0, w), a1 = fromRampLocal(s0 - 10, w + (r() - 0.5) * 4), a2 = fromRampLocal(s0 - 20, w + (r() - 0.5) * 6), a3 = fromRampLocal(s0 - 32, w + (r() - 0.5) * 8);
tracks([a0[0], a0[2], a1[0], a1[2], a2[0], a2[2], a3[0], a3[2]], 0.05 + r() * 0.07);
}
for (let i = 0; i < 12; i++) {
const x = 70 + Math.floor(r() * 4) * 8 + (r() - 0.5) * 0.6, z = ZONES.SPRINT.z0 + 1;
tracks([x, z, x, z + 4, x, z + 9, x + (r() - 0.5) * 0.4, z + 14 + r() * 10], 0.12 + r() * 0.12);
}
const SE = ASPHALT.MIDSCALE.sealant;
ctx.strokeStyle = `rgba(0,0,0,${1 - SE.tone})`;
for (let i = 0; i < 420; i++) {
let x = B.MIN_X + r() * (B.MAX_X - B.MIN_X), z = B.MIN_Z + r() * (B.MAX_Z - B.MIN_Z), a = r() < 0.5 ? Math.round(r() * 4) * Math.PI / 2 : r() * Math.PI * 2;
if (!insideArena(x, z, 2)) continue;
ctx.lineWidth = Math.max(0.6, SE.w * S * (1 + r()));
ctx.beginPath(); let [px, pz] = P(x, z); ctx.moveTo(px, pz);
const n = (SE.len[0] + r() * (SE.len[1] - SE.len[0])) / 1.0 | 0;
for (let s = 0; s < n; s++) {
a += (r() - 0.5) * 0.5; x += Math.cos(a) * 1.0; z += Math.sin(a) * 1.0;
[px, pz] = P(x, z); ctx.lineTo(px, pz);
}
ctx.stroke();
}
const blot = (x, z, rad, a) => {
const [px, pz] = P(x, z);
const g = ctx.createRadialGradient(px, pz, 0, px, pz, rad * S);
g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, pz, rad * S, 0, Math.PI * 2); ctx.fill();
};
for (let i = 0; i < 30; i++) blot((r() - 0.5) * 14, LINEUP.DECK.Z0 - 4 + r() * 32, 0.5 + r() * 1.8, 0.1 + r() * 0.15);
for (let i = 0; i < 25; i++) { const p = fromRampLocal(-r() * 14, (r() - 0.5) * 6); blot(p[0], p[2], 0.6 + r() * 2.2, 0.08 + r() * 0.12); }
for (let i = 0; i < 20; i++) blot((r() - 0.5) * 12, APPROACH.Z0 - 8 - r() * 8, 0.4 + r() * 1.4, 0.1 + r() * 0.14);
for (let i = 0; i < 160; i++) {
const x = B.MIN_X + r() * (B.MAX_X - B.MIN_X), z = B.MIN_Z + r() * (B.MAX_Z - B.MIN_Z);
if (insideArena(x, z, 1)) blot(x, z, 0.4 + r() * 3.0, 0.04 + r() * 0.08);
}
const t = canvasTexture(c, { anisotropy });
t.flipY = false;
return t;
}
export function makeConcreteSet(N, anisotropy) {
const L = lattice(555), r = rng(808);
const broad = fbmField(N, L, [4, 8, 16], [1, 0.7, 0.4], 7);
const fine = fbmField(N, L, [64, 128, 256], [1, 0.7, 0.5], 8);
const H = new Float32Array(N * N);
const alb = new Uint8Array(N * N * 4), surf = new Uint8Array(N * N * 4);
const seamEvery = N / 2;
for (let y = 0; y < N; y++) {
const sy = Math.min(y % seamEvery, seamEvery - (y % seamEvery));
const seam = sy < 1.5 ? 1 - sy / 1.5 : 0;
for (let x = 0; x < N; x++) {
const i = y * N + x, j = i * 4;
const pore = r() < 0.02 ? r() : 0;
const h = 0.4 * broad[i] + 0.35 * fine[i] - 0.5 * seam - 0.3 * pore;
H[i] = h;
let v = 140 + broad[i] * 34 + fine[i] * 20 - seam * 40 - pore * 50;
const stain = smoothstep(0.55, 0.85, broad[i]) * 18;
v -= stain;
alb[j] = v; alb[j + 1] = v; alb[j + 2] = v + 3; alb[j + 3] = 255;
surf[j] = 255 - seam * 120; surf[j + 1] = (0.72 + 0.12 * fine[i] + 0.1 * seam) * 255; surf[j + 2] = 0; surf[j + 3] = 255;
}
}
const nrm = normalFromHeight(H, N, 1.4);
return {
albedo: dataTexture(alb, N, N, { srgb: true, anisotropy }),
surface: dataTexture(surf, N, N, { anisotropy }),
normal: dataTexture(nrm, N, N, { anisotropy }),
};
}
export function makeLedPanelTexture(dotsX = 6, dotsY = 4, px = 16) {
const W = dotsX * px, Hh = dotsY * px;
const d = new Uint8Array(W * Hh * 4);
for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
const cx = (x % px) - px / 2 + 0.5, cy = (y % px) - px / 2 + 0.5;
const rr = Math.hypot(cx, cy) / (px * 0.42);
const v = rr < 1 ? Math.pow(1 - rr * rr, 0.6) : 0;
const i = (y * W + x) * 4;
d[i] = d[i + 1] = d[i + 2] = v * 255; d[i + 3] = 255;
}
const t = dataTexture(d, W, Hh, { srgb: true, anisotropy: 4 });
return t;
}
export function makeNoiseTexture(N = 128) {
const L = lattice(31337);
const ch = [0, 1, 2, 3].map((k) => fbmField(N, L, [4, 8, 16, 32], [1, 0.6, 0.35, 0.2], 20 + k));
const d = new Uint8Array(N * N * 4);
for (let i = 0; i < N * N; i++) for (let k = 0; k < 4; k++) d[i * 4 + k] = ch[k][i] * 255;
return dataTexture(d, N, N, { anisotropy: 1 });
}
export { THREE };
