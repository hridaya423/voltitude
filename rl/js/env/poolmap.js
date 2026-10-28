import { KEY_POOLS, LIGHT_PLAN, FLOODLIGHTS, ACCENT_LIGHTS, arenaWallDistance } from "@rl/js/config.js";
import { GROUND_MAP } from "@rl/js/env/layout.js";
import * as CFG from "@rl/js/config.js";
export const POOL_RES = 512;
const LP = LIGHT_PLAN;
const EP = (LP.POOL && LP.POOL.EDGE_POW) || 1;
const FB = (() => {
const d = LP.KEY_DIR.FALLBACK, l = Math.hypot(d[0], d[1], d[2]), h = Math.hypot(d[0], d[2]) || 1;
return { hx: d[0] / h, hz: d[2] / h, se: Math.abs(d[1]) / l };
})();
export function bakePoolMap(res = POOL_RES) {
const W = res | 0, H = res | 0, N = W * H;
const G = GROUND_MAP, dxT = G.W / W, dzT = G.H / H;
const S = new Float32Array(N), SX = new Float32Array(N), SZ = new Float32Array(N), SE = new Float32Array(N);
for (let k = 0; k < KEY_POOLS.length; k++) {
const p = KEY_POOLS[k];
const ax = p.aim[0], az = p.aim[2], dx = p.dir[0], dz = p.dir[2], ira = 1 / p.ra, irc = 1 / p.rc, w = p.w;
const sel = Math.sin(p.elevDeg * Math.PI / 180);
const R = 3.2 * Math.max(p.ra, p.rc);
const i0 = Math.max(0, Math.floor((ax - R - G.X0) / dxT)), i1 = Math.min(W - 1, Math.ceil((ax + R - G.X0) / dxT));
const j0 = Math.max(0, Math.floor((az - R - G.Z0) / dzT)), j1 = Math.min(H - 1, Math.ceil((az + R - G.Z0) / dzT));
for (let j = j0; j <= j1; j++) {
const z = G.Z0 + (j + 0.5) * dzT - az;
for (let i = i0; i <= i1; i++) {
const x = G.X0 + (i + 0.5) * dxT - ax;
const a = (x * dx + z * dz) * ira, c = (x * dz - z * dx) * irc;
const q = EP === 1 ? a * a + c * c : Math.pow(a * a + c * c, EP);
if (q > 10.5) continue;
const g = w * Math.exp(-q);
const t = j * W + i;
S[t] += g; SX[t] += g * dx; SZ[t] += g * dz; SE[t] += g * sel;
}
}
}
const data = new Uint8Array(N * 4), mask = new Float32Array(N);
const KF = LP.KEY_FLOOR, OF = LP.OUTSIDE_FLOOR, MARGIN = LP.POOL_MAP.MARGIN, GAIN = LP.POOL_GAIN;
for (let j = 0; j < H; j++) {
const z = G.Z0 + (j + 0.5) * dzT;
for (let i = 0; i < W; i++) {
const t = j * W + i, x = G.X0 + (i + 0.5) * dxT;
let m, hx = FB.hx, hz = FB.hz, se = FB.se;
if (i === 0 || j === 0 || i === W - 1 || j === H - 1) {
m = OF; hx = 0; hz = 0; se = 1;
} else {
const d = arenaWallDistance(x, z);
const L = 1 - Math.exp(-GAIN * S[t]);
const tt = d >= 0 ? 1 : Math.max(0, 1 + d / MARGIN);
const floor = OF + (KF - OF) * tt;
m = floor + (1 - floor) * L * tt;
const sw = S[t];
if (sw > 1e-6) {
const wgt = 1 - Math.exp(-3 * sw);
const l = Math.hypot(SX[t], SZ[t]);
const px = l > 1e-9 ? SX[t] / l : FB.hx, pz = l > 1e-9 ? SZ[t] / l : FB.hz;
hx = FB.hx + (px - FB.hx) * wgt; hz = FB.hz + (pz - FB.hz) * wgt;
const hl = Math.hypot(hx, hz);
if (hl > 1e-4) { hx /= hl; hz /= hl; } else { hx = FB.hx; hz = FB.hz; }
se = FB.se + (SE[t] / sw - FB.se) * wgt;
}
}
mask[t] = m;
const o = t * 4;
data[o] = Math.round(Math.min(1, Math.max(0, m)) * 255);
data[o + 1] = Math.round((0.5 + 0.5 * hx) * 255);
data[o + 2] = Math.round((0.5 + 0.5 * hz) * 255);
data[o + 3] = Math.round(Math.min(1, Math.max(0, se)) * 255);
}
}
const sample = (arr, x, z, ch) => {
const fx = (x - G.X0) / dxT - 0.5, fz = (z - G.Z0) / dzT - 0.5;
const i = Math.max(0, Math.min(W - 2, Math.floor(fx))), j = Math.max(0, Math.min(H - 2, Math.floor(fz)));
const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j));
const s = ch < 0 ? (a) => arr[a] : (a) => arr[a * 4 + ch] / 255;
const a = j * W + i;
return (s(a) * (1 - u) + s(a + 1) * u) * (1 - v) + (s(a + W) * (1 - u) + s(a + W + 1) * u) * v;
};
return {
data, mask, W, H,
maskAt: (x, z) => sample(mask, x, z, -1),
meanMaskAt(x, z, r) {
let s = 0;
for (let k = 0; k < 9; k++) { const a = k * 2.399963, rr = r * Math.sqrt((k + 0.5) / 9); s += sample(mask, x + Math.cos(a) * rr, z + Math.sin(a) * rr, -1); }
return s / 9;
},
dirAt(x, z, out) {
const hx = sample(data, x, z, 1) * 2 - 1, hz = sample(data, x, z, 2) * 2 - 1, l = Math.hypot(hx, hz) || 1;
out[0] = hx / l; out[1] = hz / l; out[2] = sample(data, x, z, 3);
return out;
},
};
}
export const FLOOR_POOL = { SHRINK: 0.6, NORM: 0.7, GAIN: 1.6, EDGE_POW: 2, R3_CAP: 2.4, K_RANGE: [0.35, 1.3],
SIZE_VAR: [0.65, 1.4], LEVEL_VAR: [0.45, 0.9], ASPECT: [1.8, 3.4], SKIRT_R: 2.8, SKIRT_NORM: 1.4,
FREE: { SIZE: 1.3, LEVEL: 0.75 }, SKW: { PIN: 0.05, PROT: 0.15, FREE: 1.0 },
THROW: { NEAR: 0.55, FAR: 1.9, KEYSTONE: 0.35, HOT: 0.3, HOT_AT: -0.45, HOT_S: [0.42, 0.5] },
SPILL: { K: 1.4, TAU: 4.0, W: 1.4 },
DROP_FRAC: 0.33, DROP_EFF: 0.75, PROTECT_R: 9, WARM_FRAC: 0.38,
LEVEL_PIN: { 'E1:0': 0.4, 'RW:1': 0.4, 'IM1:0': 1.0, 'IM1:1': 0.95, 'SW:0': 0.95, 'S2:0': 0.9, 'GANTRY:0': 0.35, 'RW:0': 0.2, 'IM3:1': 0.25 } };
function hash01(str, salt) {
let h = 2166136261 ^ salt;
for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
return (h >>> 0) / 4294967296;
}
export function floorHeads() {
const FP = FLOOR_POOL, out = [];
for (const f of [...FLOODLIGHTS, ...ACCENT_LIGHTS]) {
const hy = f.height ?? f.pos[1];
for (let hi = 0; hi < f.heads.length; hi++) {
const h = f.heads[hi], key = f.id + ':' + hi;
const ax = [h.aim[0] - f.pos[0], -hy, h.aim[2] - f.pos[2]];
const D = Math.hypot(ax[0], ax[1], ax[2]) || 1;
ax[0] /= D; ax[1] /= D; ax[2] /= D;
const se = Math.sin(h.elevDeg * Math.PI / 180);
const cr = [h.dir[2], 0, -h.dir[0]];
const up = [ax[1] * cr[2] - ax[2] * cr[1], ax[2] * cr[0] - ax[0] * cr[2], ax[0] * cr[1] - ax[1] * cr[0]];
const pin = FP.LEVEL_PIN[key] !== undefined;
const prot = pin || f.kind === 'lamp' || f.kind === 'gantry' || protectedAim(h.aim[0], h.aim[2]);
const sz = (FP.SIZE_VAR[0] + (FP.SIZE_VAR[1] - FP.SIZE_VAR[0]) * hash01(key, 17)) * (prot ? 1 : FP.FREE.SIZE);
const lv = FP.LEVEL_PIN[key] ?? ((FP.LEVEL_VAR[0] + (FP.LEVEL_VAR[1] - FP.LEVEL_VAR[0]) * hash01(key, 91)) * (prot ? 1 : FP.FREE.LEVEL));
const skw = pin ? FP.SKW.PIN : prot ? FP.SKW.PROT : FP.SKW.FREE;
const asp = h.ra / h.rc, aspK = Math.min(FP.ASPECT[1], Math.max(FP.ASPECT[0], asp)) / asp;
const ra = h.ra * aspK;
const warm = FP.LEVEL_PIN[key] !== undefined ? 0 : hash01(key, 53) < FP.WARM_FRAC ? 1 : 0.18 * hash01(key, 7);
out.push({ id: f.id, key, hp: [f.pos[0], hy, f.pos[2]], aim: h.aim, ax, cr, up, D, sz, lv, warm, prot, skw,
sc: h.rc * sz / D * FP.SHRINK, sa: ra * sz * se / D * FP.SHRINK, flux: h.w * se / (h.r * h.r),
rad: (3.2 * Math.max(ra, h.rc) * FP.SHRINK * sz) * Math.max(1, FP.SKIRT_R * 0.8) * FP.THROW.FAR + 4, spillR: D * 0.9 });
}
}
const fl = out.map((h) => h.flux).sort((a, b) => a - b), med = fl[fl.length >> 1] || 1;
for (const h of out) h.k = Math.min(FP.K_RANGE[1], Math.max(FP.K_RANGE[0], h.flux / med));
const cand = out.filter((h) => !h.prot && h.k * h.lv < FP.DROP_EFF).sort((a, b) => a.k * a.lv - b.k * b.lv);
const nDrop = Math.min(cand.length, Math.round(FP.DROP_FRAC * out.length));
for (let i = 0; i < nDrop; i++) cand[i].drop = true;
return out;
}
function protectedAim(ax, az) {
const R = FLOOR_POOL.PROTECT_R;
if (Math.abs(ax) < R + 1) return true;
if (ax > 58 && ax < 104 && az > -10 && az < 255) return true;
const seg = (a, b) => { const vx = b[0] - a[0], vz = b[2] - a[2], l2 = vx * vx + vz * vz || 1;
const t = Math.max(0, Math.min(1, ((ax - a[0]) * vx + (az - a[2]) * vz) / l2));
return Math.hypot(ax - a[0] - vx * t, az - a[2] - vz * t); };
const RP = CFG.RAMP;
if (RP && CFG.fromRampLocal && seg(CFG.fromRampLocal(-40), CFG.fromRampLocal(12)) < R + 4) return true;
for (const J of (CFG.JUMPS || [])) {
const p = (s) => [J.origin[0] + J.axisS[0] * s, 0, J.origin[2] + J.axisS[2] * s];
const ls = J.landing ? J.landing.s0 : (J.LIP || 10) + 20;
if (seg(p(-15), p((J.LIP || 10) + 4)) < R || seg(p(ls - 4), p(ls + 22)) < R) return true;
}
return false;
}
export function bakeFloorMap(res = POOL_RES) {
const FP = FLOOR_POOL, W = res | 0, H = res | 0, N = W * H;
const G = GROUND_MAP, dxT = G.W / W, dzT = G.H / H, EPF = FP.EDGE_POW;
const S = new Float32Array(N), SKW = new Float32Array(N), SKL = new Float32Array(N);
const WW = new Float32Array(N), WS = new Float32Array(N);
const iSK2 = 1 / (FP.SKIRT_R * FP.SKIRT_R), QMAX = 4 * FP.SKIRT_R * FP.SKIRT_R, TH = FP.THROW, SPL = FP.SPILL;
const iNear = 1 / TH.NEAR, iFar = 1 / TH.FAR, iHc = 1 / TH.HOT_S[0], iHa = 1 / TH.HOT_S[1];
for (const h of floorHeads()) {
if (h.drop) continue;
const sx = h.hp[0] + (h.aim[0] - h.hp[0]) * 0.3, sz = h.hp[2] + (h.aim[2] - h.hp[2]) * 0.3;
const bx0 = Math.min(h.aim[0] - h.rad, sx), bx1 = Math.max(h.aim[0] + h.rad, sx);
const bz0 = Math.min(h.aim[2] - h.rad, sz), bz1 = Math.max(h.aim[2] + h.rad, sz);
const i0 = Math.max(0, Math.floor((bx0 - G.X0) / dxT)), i1 = Math.min(W - 1, Math.ceil((bx1 - G.X0) / dxT));
const j0 = Math.max(0, Math.floor((bz0 - G.Z0) / dzT)), j1 = Math.min(H - 1, Math.ceil((bz1 - G.Z0) / dzT));
const isc = 1 / h.sc, isa = 1 / h.sa, hy = h.hp[1];
for (let j = j0; j <= j1; j++) {
const vz = G.Z0 + (j + 0.5) * dzT - h.hp[2];
for (let i = i0; i <= i1; i++) {
const vx = G.X0 + (i + 0.5) * dxT - h.hp[0];
const R = Math.sqrt(vx * vx + hy * hy + vz * vz);
const d = vx * h.ax[0] - hy * h.ax[1] + vz * h.ax[2];
if (d <= 0) continue;
const pc0 = (vx * h.cr[0] + vz * h.cr[2]) / d * isc, pa = (vx * h.up[0] - hy * h.up[1] + vz * h.up[2]) / d * isa;
const pc = pc0 / (1 + TH.KEYSTONE * Math.max(-1.5, Math.min(2.5, pa)));
const pan = pa < 0 ? pa * iNear : pa * iFar;
const q = pc * pc + pan * pan;
const r3 = h.D / R, fo = h.k * Math.min(FP.R3_CAP, r3 * r3 * r3), t = j * W + i;
let lit = 0;
if (q <= 4) {
const qh = (pa - TH.HOT_AT) * iHa * (pa - TH.HOT_AT) * iHa + pc0 * iHc * pc0 * iHc;
lit = fo * (Math.exp(-(EPF === 1 ? q : EPF === 2 ? q * q : Math.pow(q, EPF))) + TH.HOT * Math.exp(-qh * qh));
S[t] += lit;
}
let sk = q <= QMAX ? fo * h.skw * Math.exp(-q * iSK2) : 0;
if (pa < -1 && SPL.K > 0) {
const pw = pc0 * (1 / SPL.W);
sk += SPL.K * fo * h.skw * Math.exp(-pw * pw) * Math.exp((pa + 1) / SPL.TAU) * Math.min(1, Math.hypot(vx, vz) / (0.35 * h.spillR));
}
if (sk > 1e-6) { SKW[t] += sk; SKL[t] += sk * h.lv; }
const lw = lit + 0.25 * sk;
if (lw > 1e-6) { WW[t] += lw * h.warm; WS[t] += lw; }
}
}
}
const data = new Uint8Array(N * 4), MARGIN = LP.POOL_MAP.MARGIN;
const Fv = new Float32Array(N), Iv = new Float32Array(N);
for (let j = 0; j < H; j++) {
const z = G.Z0 + (j + 0.5) * dzT;
for (let i = 0; i < W; i++) {
const t = j * W + i, x = G.X0 + (i + 0.5) * dxT;
let fv = 0, tt = 0, lv = 1, sk = 0;
if (!(i === 0 || j === 0 || i === W - 1 || j === H - 1)) {
const dw = arenaWallDistance(x, z);
tt = dw >= 0 ? 1 : Math.max(0, 1 + dw / MARGIN);
fv = (1 - Math.exp(-FP.GAIN * FP.NORM * S[t])) * tt;
lv = SKW[t] > 1e-5 ? SKL[t] / SKW[t] : 1;
sk = (1 - Math.exp(-FP.SKIRT_NORM * SKL[t])) * tt;
}
Fv[t] = fv; Iv[t] = tt;
const o = t * 4;
const wm = WS[t] > 1e-5 ? WW[t] / WS[t] : 0;
data[o] = Math.round(Math.min(1, fv) * 255); data[o + 1] = Math.round(Math.min(1, wm) * 255);
data[o + 2] = Math.round(Math.min(1, Math.max(0, lv)) * 255); data[o + 3] = Math.round(Math.min(1, sk) * 255);
}
}
const sample = (arr, x, z) => {
const fx = (x - G.X0) / dxT - 0.5, fz = (z - G.Z0) / dzT - 0.5;
const i = Math.max(0, Math.min(W - 2, Math.floor(fx))), j = Math.max(0, Math.min(H - 2, Math.floor(fz)));
const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j)), a = j * W + i;
return (arr[a] * (1 - u) + arr[a + 1] * u) * (1 - v) + (arr[a + W] * (1 - u) + arr[a + W + 1] * u) * v;
};
return { data, W, H, floorAt: (x, z) => sample(Fv, x, z), insideAt: (x, z) => sample(Iv, x, z) };
}
