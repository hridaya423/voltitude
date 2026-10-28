import { Rng } from "@rl/js/music/theory.js";
const cache = new WeakMap();
function drain(it) { let r; while (!(r = it.next()).done) {   } return r.value; }
function bq(type, f, Q, sr, db = 0) {
const w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * Q);
const A = Math.pow(10, db / 40);
let b0, b1, b2, a0, a1, a2;
switch (type) {
case 'lowpass': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
case 'highpass': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
case 'bandpass': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; break;
case 'peaking': b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; break;
default: return [1, 0, 0, 0, 0];
}
return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, c) {
let z1 = 0, z2 = 0;
const b0 = c[0], b1 = c[1], b2 = c[2], a1 = c[3], a2 = c[4];
for (let i = 0; i < x.length; i++) {
const xi = x[i], y = b0 * xi + z1;
z1 = b1 * xi - a1 * y + z2;
z2 = b2 * xi - a2 * y;
x[i] = y;
}
return x;
}
function lp1(x, fc, sr) {
const a = 1 - Math.exp(-2 * Math.PI * fc / sr);
let y = 0;
for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; }
return x;
}
function white(n, rng) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = rng.float() * 2 - 1; return x; }
function normalize(chans, peak) {
let m = 0;
for (const d of chans) for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > m) m = a; }
if (m > 0) { const g = peak / m; for (const d of chans) for (let i = 0; i < d.length; i++) d[i] *= g; }
}
function fadeOut(d, sec, sr) {
const n = Math.min(d.length, Math.floor(sec * sr));
for (let i = 0; i < n; i++) d[d.length - 1 - i] *= i / n;
}
const sq = (ph) => (Math.sin(ph) >= 0 ? 1 : -1);
const METAL = [1, 1.4827, 1.8003, 2.546, 2.6303, 3.8967];
function metal(n, sr, base, rng) {
const x = new Float32Array(n);
const ph = METAL.map(() => rng.float() * 6.283);
const inc = METAL.map((r) => 2 * Math.PI * base * r / sr);
for (let i = 0; i < n; i++) {
let s = 0;
for (let k = 0; k < 6; k++) { ph[k] += inc[k]; s += sq(ph[k]); }
x[i] = s / 6;
}
return x;
}
let KICK_BEATER = 2.1, KICK_BLIP = 0.55, KICK_KNOCK = 0.25;
export function setKickTransient(o) { KICK_BEATER = o.beater ?? KICK_BEATER; KICK_BLIP = o.blip ?? KICK_BLIP; KICK_KNOCK = o.knock ?? KICK_KNOCK; }
function makeKick(ctx, hz, body = 0.08, drop = 0.03) {
const sr = ctx.sampleRate, len = Math.floor(0.32 * sr);
const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
const rng = new Rng(9001 + Math.round(hz * 10));
const body2 = body * 1.625;
const clickN = Math.floor(0.03 * sr);
const beater = filt(filt(filt(white(clickN, rng), bq('highpass', 1800, 0.7, sr)), bq('peaking', 3500, 1.1, sr, 6)), bq('lowpass', 6500, 0.7, sr));
normalize([beater], 1);
const f0 = hz * 3.7;
let ph = 0, phk = 0;
const drive = 1.9, dn = Math.tanh(drive);
for (let i = 0; i < len; i++) {
const t = i / sr;
const f = hz + (f0 - hz) * Math.exp(-t / drop) + 240 * Math.exp(-t / 0.0035);
ph += 2 * Math.PI * f / sr;
phk += 2 * Math.PI * (112 + 48 * Math.exp(-t / 0.018)) / sr;
const atk = 1 - Math.exp(-t / 0.0006);
const amp = atk * (0.72 * Math.exp(-t / body) + 0.28 * Math.exp(-t / body2));
let x = Math.sin(ph) * amp + Math.sin(phk) * atk * KICK_KNOCK * Math.exp(-t / 0.025);
if (i < clickN) {
x += beater[i] * KICK_BEATER * Math.exp(-t / 0.004);
x += Math.sin(2 * Math.PI * 3200 * t) * KICK_BLIP * Math.exp(-t / 0.003);
}
d[i] = Math.tanh(drive * x) / dn;
}
fadeOut(d, 0.04, sr);
normalize([d], 0.98);
let I = 0, Qs = 0;
for (let i = Math.floor(0.11 * sr); i < Math.floor(0.27 * sr); i++) { const w = 2 * Math.PI * hz * i / sr; I += d[i] * Math.cos(w); Qs += d[i] * Math.sin(w); }
buf.tailPhase = Math.atan2(I, Qs);
buf.tailHz = hz;
return buf;
}
function makeSnare(ctx, rng, clapOnly, bodyHz = 182, tail = 0.16) { return drain(makeSnareSteps(ctx, rng, clapOnly, bodyHz, tail)); }
function* makeSnareSteps(ctx, rng, clapOnly, bodyHz = 182, tail = 0.16) {
const sr = ctx.sampleRate, len = Math.floor((clapOnly ? 0.42 : 0.6) * sr);
const buf = ctx.createBuffer(2, len, sr);
const chans = [buf.getChannelData(0), buf.getChannelData(1)];
const bursts = [0, 0.0085, 0.017, 0.0265];
const shared = white(len, rng), sharedC = white(len, rng);
const mixN = (a) => { for (let i = 0; i < len; i++) a[i] = shared[i] * 0.85 + a[i] * 0.45; return a; };
const mixC = (a) => { for (let i = 0; i < len; i++) a[i] = sharedC[i] * 0.85 + a[i] * 0.45; return a; };
for (let c = 0; c < 2; c++) {
const d = chans[c];
const nz = filt(filt(mixN(white(len, rng)), bq('highpass', 1700, 0.7, sr)), bq('peaking', 5200, 0.9, sr, 3));
const cl = filt(filt(mixC(white(len, rng)), bq('bandpass', clapOnly ? 1150 : 1350, 1.15, sr)), bq('highpass', 600, 0.7, sr));
yield 'kit.snare';
let ph = 0;
for (let i = 0; i < len; i++) {
const t = i / sr;
let clapEnv = 0;
for (const tk of bursts) if (t >= tk) clapEnv = Math.max(clapEnv, Math.exp(-(t - tk) / 0.0032));
if (t >= 0.0265) clapEnv += 0.42 * Math.exp(-(t - 0.0265) / (clapOnly ? 0.13 : 0.1));
let x = cl[i] * clapEnv * (clapOnly ? 2.2 : 1.3);
if (!clapOnly) {
const f = bodyHz + 70 * Math.exp(-t / 0.012);
ph += 2 * Math.PI * f / sr;
const body = Math.sin(ph) * Math.exp(-t / 0.05) * 0.62 + Math.sin(2 * Math.PI * bodyHz * 1.84 * t) * Math.exp(-t / 0.028) * 0.2;
const ne = (1 - Math.exp(-t / 0.0007)) * (0.8 * Math.exp(-t / 0.045) + 0.38 * Math.exp(-t / tail));
x += body + nz[i] * ne * 0.95;
}
d[i] = Math.tanh(1.5 * x);
}
fadeOut(d, 0.05, sr);
yield 'kit.snare';
}
normalize(chans, 0.95);
return buf;
}
function makeHat(ctx, rng, open, decay = 0.021) {
const sr = ctx.sampleRate, len = Math.floor((open ? 0.4 : 0.14) * sr);
const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
const m = metal(len, sr, 400, rng), n = white(len, rng);
for (let i = 0; i < len; i++) d[i] = m[i] * 0.75 + n[i] * 0.3;
filt(d, bq('bandpass', 9800, 0.8, sr));
filt(d, bq('highpass', 6800, 0.7, sr));
filt(d, bq('highpass', 6800, 0.7, sr));
for (let i = 0; i < len; i++) {
const t = i / sr;
const env = (1 - Math.exp(-t / 0.0004)) * (open ? 0.3 * Math.exp(-t / 0.012) + 0.75 * Math.exp(-t / 0.09) : Math.exp(-t / decay));
d[i] *= env;
}
fadeOut(d, open ? 0.08 : 0.02, sr);
normalize([d], 0.9);
return buf;
}
function makeShaker(ctx, rng) {
const sr = ctx.sampleRate, len = Math.floor(0.13 * sr);
const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
d.set(white(len, rng));
filt(d, bq('bandpass', 6800, 1.1, sr));
filt(d, bq('highpass', 3500, 0.7, sr));
for (let i = 0; i < len; i++) { const t = i / sr; d[i] *= (1 - Math.exp(-t / 0.007)) * Math.exp(-t / 0.038); }
fadeOut(d, 0.02, sr);
normalize([d], 0.85);
return buf;
}
function makeCrash(ctx, rng) { return drain(makeCrashSteps(ctx, rng)); }
function* makeCrashSteps(ctx, rng) {
const sr = ctx.sampleRate, len = Math.floor(2.8 * sr);
const buf = ctx.createBuffer(2, len, sr);
const chans = [buf.getChannelData(0), buf.getChannelData(1)];
const nShared = white(len, rng);
yield 'kit.crash';
for (let c = 0; c < 2; c++) {
const d = chans[c];
const m1 = metal(len, sr, 330 + c * 7, rng);
yield 'kit.crash';
const m2 = metal(len, sr, 471 - c * 5, rng);
yield 'kit.crash';
const n = white(len, rng);
for (let i = 0; i < len; i++) d[i] = m1[i] * 0.45 + m2[i] * 0.35 + (nShared[i] * 0.8 + n[i] * 0.5) * 0.4;
yield 'kit.crash';
filt(d, bq('highpass', 3600, 0.7, sr));
filt(d, bq('highpass', 3600, 0.7, sr));
yield 'kit.crash';
filt(d, bq('peaking', 8200, 0.8, sr, 3));
filt(d, bq('lowpass', 15000, 0.7, sr));
yield 'kit.crash';
for (let i = 0; i < len; i++) {
const t = i / sr;
d[i] *= (1 - Math.exp(-t / 0.0008)) * (0.55 * Math.exp(-t / 0.05) + 0.62 * Math.exp(-t / 0.8));
}
fadeOut(d, 0.4, sr);
yield 'kit.crash';
}
normalize(chans, 0.9);
return buf;
}
function reversed(ctx, src) {
const buf = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
for (let c = 0; c < src.numberOfChannels; c++) {
const a = src.getChannelData(c), b = buf.getChannelData(c), n = a.length;
for (let i = 0; i < n; i++) b[i] = a[n - 1 - i];
}
return buf;
}
function makeTom(ctx, rng, f0, f1, dec) {
const sr = ctx.sampleRate, len = Math.floor(0.62 * sr);
const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
const n = lp1(white(len, rng), 3500, sr);
let ph = 0;
for (let i = 0; i < len; i++) {
const t = i / sr;
const f = f1 + (f0 - f1) * Math.exp(-t / 0.06);
ph += 2 * Math.PI * f / sr;
const x = Math.sin(ph) * (1 - Math.exp(-t / 0.0008)) * Math.exp(-t / dec) + n[i] * 0.35 * Math.exp(-t / 0.007);
d[i] = Math.tanh(1.7 * x);
}
fadeOut(d, 0.06, sr);
normalize([d], 0.92);
return buf;
}
function makeImpact(ctx, rng) { return drain(makeImpactSteps(ctx, rng)); }
function* makeImpactSteps(ctx, rng) {
const sr = ctx.sampleRate, len = Math.floor(3.0 * sr);
const buf = ctx.createBuffer(2, len, sr);
const chans = [buf.getChannelData(0), buf.getChannelData(1)];
const boom = new Float32Array(len);
let ph = 0, phb = 0;
for (let i = 0; i < len; i++) {
const t = i / sr;
const f = 42 + 78 * Math.exp(-t / 0.085);
ph += 2 * Math.PI * f / sr;
phb += 2 * Math.PI * (125 + 105 * Math.exp(-t / 0.04)) / sr;
const a = 1 - Math.exp(-t / 0.001);
boom[i] = Math.tanh(1.7 * Math.sin(ph) * a * (0.6 * Math.exp(-t / 0.3) + 0.4 * Math.exp(-t / 0.9)))
+ Math.sin(phb) * a * 0.55 * Math.exp(-t / 0.09);
}
filt(boom, bq('highpass', 35, 0.7, sr));
yield 'kit.impact';
const rumShared = white(len, rng);
for (let c = 0; c < 2; c++) {
const d = chans[c];
const own = white(len, rng);
for (let i = 0; i < len; i++) own[i] = rumShared[i] * 0.9 + own[i] * 0.3;
const rum = lp1(lp1(own, 420, sr), 420, sr);
yield 'kit.impact';
const bodyN = filt(white(len, rng), bq('bandpass', 180, 0.9, sr));
yield 'kit.impact';
const crack = filt(filt(white(len, rng), bq('highpass', 1400, 0.7, sr)), bq('peaking', 3000, 0.9, sr, 7));
yield 'kit.impact';
for (let i = 0; i < len; i++) {
const t = i / sr;
d[i] = boom[i] * 0.85 + rum[i] * 2.0 * Math.exp(-t / 0.28) + bodyN[i] * 0.9 * Math.exp(-t / 0.07)
+ crack[i] * 0.6 * (Math.exp(-t / 0.018) + 0.25 * Math.exp(-t / 0.12));
}
fadeOut(d, 0.5, sr);
yield 'kit.impact';
}
normalize(chans, 0.95);
return buf;
}
function makeThud(ctx, rng) {
const sr = ctx.sampleRate, len = Math.floor(0.9 * sr);
const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
const n = lp1(lp1(white(len, rng), 380, sr), 380, sr);
let ph = 0;
for (let i = 0; i < len; i++) {
const t = i / sr;
const f = 40 + 62 * Math.exp(-t / 0.045);
ph += 2 * Math.PI * f / sr;
d[i] = Math.tanh(1.9 * (Math.sin(ph) * (1 - Math.exp(-t / 0.001)) * Math.exp(-t / 0.19) + n[i] * 2.5 * Math.exp(-t / 0.06)));
}
fadeOut(d, 0.1, sr);
normalize([d], 0.95);
return buf;
}
function makeRide(ctx, rng) {
const sr = ctx.sampleRate, len = Math.floor(0.5 * sr);
const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
const m = metal(len, sr, 540, rng), n = white(len, rng);
filt(m, bq('bandpass', 3200, 1.1, sr)); filt(n, bq('highpass', 7000, 0.7, sr));
let p1 = 0, p2 = 0;
for (let i = 0; i < len; i++) {
const t = i / sr;
p1 += 2 * Math.PI * 2900 / sr; p2 += 2 * Math.PI * 4420 / sr;
d[i] = (m[i] * 0.55 + n[i] * 0.12 * Math.exp(-t / 0.02)) * Math.exp(-t / 0.16) + (Math.sin(p1) * 0.3 + Math.sin(p2) * 0.16) * Math.exp(-t / 0.22);
}
fadeOut(d, 0.05, sr);
normalize([d], 0.9);
return buf;
}
function makeNoise(ctx, rng) { return drain(makeNoiseSteps(ctx, rng)); }
function* makeNoiseSteps(ctx, rng) {
const sr = ctx.sampleRate, len = Math.floor(2 * sr);
const buf = ctx.createBuffer(2, len, sr);
buf.getChannelData(0).set(white(len, rng));
yield 'kit.noise';
buf.getChannelData(1).set(white(len, rng));
return buf;
}
function makeIR(ctx, rng, seconds = 1.4, rt = [1.1, 1.2, 0.55], pre = 0.012, fade = 0.2, hp = 260) { return drain(makeIRSteps(ctx, rng, seconds, rt, pre, fade, hp)); }
function* makeIRSteps(ctx, rng, seconds = 1.4, rt = [1.1, 1.2, 0.55], pre = 0.012, fade = 0.2, hp = 260) {
const sr = ctx.sampleRate, len = Math.floor(seconds * sr), p = Math.floor(pre * sr);
const buf = ctx.createBuffer(2, len, sr);
const tau = rt.map((r) => r / 6.9078);
const band = (lo, hi) => {
const x = white(len, rng);
for (let k = 0; k < 4; k++) {
if (lo) filt(x, bq('highpass', lo, 0.707, sr));
if (hi) filt(x, bq('lowpass', hi, 0.707, sr));
}
return x;
};
const sh = [];
for (const [lo, hi] of [[0, 450], [450, 3000], [3000, 0]]) { sh.push(band(lo, hi)); yield 'kit.ir'; }
for (let c = 0; c < 2; c++) {
const d = buf.getChannelData(c);
const lo = band(0, 450);
yield 'kit.ir';
const mid = band(450, 3000);
yield 'kit.ir';
const hi = band(3000, 0);
yield 'kit.ir';
for (const [x, y] of [[lo, sh[0]], [mid, sh[1]], [hi, sh[2]]]) for (let i = 0; i < len; i++) x[i] = 0.82 * x[i] + 0.57 * y[i];
for (let i = p; i < len; i++) {
const t = (i - p) / sr;
const fi = 1 - Math.exp(-t / 0.004);
d[i] = fi * (lo[i] * 1.1 * Math.exp(-t / tau[0]) + mid[i] * Math.exp(-t / tau[1]) + hi[i] * 0.9 * Math.exp(-t / tau[2]));
}
fadeOut(d, fade, sr);
yield 'kit.ir';
}
let pu = 0, pf = 0;
for (let c = 0; c < 2; c++) {
const d = buf.getChannelData(c);
for (let i = 0; i < len; i++) pu += d[i] * d[i];
filt(d, bq('highpass', hp, 0.7, sr)); filt(d, bq('lowpass', 8000, 0.7, sr));
for (let i = 0; i < len; i++) pf += d[i] * d[i];
yield 'kit.ir';
}
buf.irComp = Math.sqrt(pf / pu);
normalize([buf.getChannelData(0), buf.getChannelData(1)], 0.9);
return buf;
}
function makeGatedSnare(ctx, rng, snare, bodyHz = 182) {
const sr = ctx.sampleRate, len = snare.length;
const buf = ctx.createBuffer(2, len, sr);
const shared = white(len, rng);
for (let c = 0; c < 2; c++) {
const own = white(len, rng);
const room = new Float32Array(len);
for (let i = 0; i < len; i++) room[i] = shared[i] * 0.6 + own[i] * 0.8;
filt(room, bq('highpass', 300, 0.7, sr)); filt(room, bq('lowpass', 7000, 0.7, sr)); filt(room, bq('peaking', bodyHz * 1.1, 1.4, sr, 6));
let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(room[i]));
const src = snare.getChannelData(Math.min(c, snare.numberOfChannels - 1)), d = buf.getChannelData(c);
for (let i = 0; i < len; i++) {
const t = i / sr;
const atk = 1 - Math.exp(-t / 0.004);
const hold = Math.exp(-t / 1.0);
const gate = t < 0.18 ? 1 : t < 0.195 ? Math.pow(10, -12 / 20 * (t - 0.18) / 0.015) : 0.25 * Math.exp(-(t - 0.195) / 0.03);
d[i] = src[i] + room[i] / pk * 0.36 * atk * hold * gate;
}
fadeOut(d, 0.05, sr);
}
normalize([buf.getChannelData(0), buf.getChannelData(1)], 0.95);
return buf;
}
function makeSubDrop(ctx, impact) {
const sr = ctx.sampleRate, len = Math.floor(0.6 * sr);
const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
let ph = 0;
for (let i = 0; i < len; i++) {
const t = i / sr, f = 38 * Math.pow(30 / 38, t / 0.6);
ph += 2 * Math.PI * f / sr;
d[i] = Math.sin(ph) * (1 - Math.exp(-t / 0.008)) * Math.exp(-t / 0.25);
}
fadeOut(d, 0.08, sr);
const rms = (x) => { let s2 = 0; for (let i = 0; i < Math.min(len, x.length); i++) s2 += x[i] * x[i]; return Math.sqrt(s2 / len); };
const g = rms(impact.getChannelData(0)) * Math.pow(10, -8 / 20) / Math.max(1e-9, rms(d));
for (let i = 0; i < len; i++) d[i] *= g;
return buf;
}
function premix(ctx, parts) {
const sr = ctx.sampleRate;
let len = 0;
for (const [b, , off = 0] of parts) len = Math.max(len, b.length + Math.floor(off * sr));
const out = ctx.createBuffer(2, len, sr);
for (let c = 0; c < 2; c++) {
const d = out.getChannelData(c);
for (const [b, gain, off = 0] of parts) {
const src = b.getChannelData(Math.min(c, b.numberOfChannels - 1)), o = Math.floor(off * sr);
for (let i = 0; i < src.length; i++) d[i + o] += src[i] * gain;
}
}
normalize([out.getChannelData(0), out.getChannelData(1)], 0.95);
return out;
}
export function softClipCurve(ceiling = 0.87, knee = 0.68, n = 8192) {
const c = new Float32Array(n), w = ceiling - knee;
for (let i = 0; i < n; i++) {
const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
const y = a <= knee ? a : knee + w * Math.tanh((a - knee) / w);
c[i] = Math.sign(x) * y;
}
return c;
}
export function tanhCurve(drive = 2, n = 2048) {
const c = new Float32Array(n), dn = Math.tanh(drive);
for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(drive * x) / dn; }
return c;
}
function buildKit(ctx) {
const it = buildKitSteps(ctx);
let r;
while (!(r = it.next()).done) {   }
return r.value;
}
function* buildKitSteps(ctx) {
const rng = new Rng(0x5eed);
const now = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : 0);
let ms = 0, ts = now();
const step = function* (label) { ms += now() - ts; yield label; ts = now(); };
const timed = function* (it) { let r; while (!(r = it.next()).done) { ms += now() - ts; yield r.value; ts = now(); } return r.value; };
const kicks = new Map();
const crash = yield* timed(makeCrashSteps(ctx, rng));
yield* step('kit.crash');
const snare = yield* timed(makeSnareSteps(ctx, rng, false));
yield* step('kit.snare');
const clap = yield* timed(makeSnareSteps(ctx, rng, true));
yield* step('kit.clap');
const hatO = makeHat(ctx, rng, true);
const shaker = makeShaker(ctx, rng);
const crashRev = reversed(ctx, crash);
yield* step('kit.hatO');
const tomH = makeTom(ctx, rng, 230, 150, 0.2);
const tomM = makeTom(ctx, rng, 165, 104, 0.24);
const tomL = makeTom(ctx, rng, 118, 70, 0.3);
yield* step('kit.toms');
const impact = yield* timed(makeImpactSteps(ctx, rng));
yield* step('kit.impact');
const thud = makeThud(ctx, rng);
const noise = yield* timed(makeNoiseSteps(ctx, rng));
yield* step('kit.noise');
const ir = yield* timed(makeIRSteps(ctx, rng));
yield* step('kit.ir');
const curves = { clip: softClipCurve(), bass: tanhCurve(2.4), warm: tanhCurve(1.3), braam: tanhCurve(2) };
const kit = {
kick(hz, body = 0.08, drop = 0.03) {
const fh = Math.round(hz * 4) / 4, fb = Math.round(body * 1000) / 1000, fd = Math.round(drop * 2000) / 2000;
const key = fh + '/' + fb + '/' + fd;
let b = kicks.get(key);
if (!b) { b = makeKick(ctx, fh, fb, fd); kicks.set(key, b); }
return b;
},
snare,
clap,
hatC: null,
hatO,
shaker,
crash,
crashRev,
tomH,
tomM,
tomL,
impact,
thud,
noise,
ir,
irComp: 1,
curves,
buildMs: 0,
};
kit.irComp = kit.ir.irComp;
let hall = null;
Object.defineProperty(kit, 'hallIR', { get: () => (hall ||= makeIR(ctx, new Rng(0x4a11), 2.6, [2.2, 2.6, 1.2], 0.02, 0.28, 320)) });
kit.hallSteps = function* () {
if (hall) return;
const h = yield* makeIRSteps(ctx, new Rng(0x4a11), 2.6, [2.2, 2.6, 1.2], 0.02, 0.28, 320);
hall ||= h;
};
let ride = null;
Object.defineProperty(kit, 'rideBell', { get: () => (ride ||= makeRide(ctx, new Rng(0x41de))) });
yield* step('kit.curves');
kit.subDrop = makeSubDrop(ctx, kit.impact);
yield* step('kit.subDrop');
kit.hatC = makeHat(ctx, rng, false);
kit.snareClap = premix(ctx, [[kit.snare, 1], [kit.clap, 0.42, 0.004]]);
kit.hatShk = premix(ctx, [[kit.hatC, 0.85], [kit.shaker, 0.55, 0.002]]);
const snareVars = [], hatVars = [];
const SNARES = [[182, 0.16], [160, 0.2], [210, 0.1]];
const HATS = [0.021, 0.015, 0.03];
kit.snareV = (i) => {
i = ((i | 0) % SNARES.length + SNARES.length) % SNARES.length;
if (!snareVars[i]) {
const sn = i === 0 ? kit.snare : makeSnare(ctx, new Rng(0x5a1e + i), false, SNARES[i][0], SNARES[i][1]);
const v = i === 0 ? { snare: kit.snare, snareClap: kit.snareClap } : { snare: sn, snareClap: premix(ctx, [[sn, 1], [kit.clap, 0.42, 0.004]]) };
let gated = null;
Object.defineProperty(v, 'snareGated', { get: () => (gated ||= makeGatedSnare(ctx, new Rng(0x6a7e + i), sn, SNARES[i][0])) });
snareVars[i] = v;
}
return snareVars[i];
};
kit.hatV = (i) => {
i = ((i | 0) % HATS.length + HATS.length) % HATS.length;
if (!hatVars[i]) {
if (i === 0) hatVars[i] = { hatC: kit.hatC, hatShk: kit.hatShk };
else {
const h = makeHat(ctx, new Rng(0x4a7 + i), false, HATS[i]);
hatVars[i] = { hatC: h, hatShk: premix(ctx, [[h, 0.85], [kit.shaker, 0.55, 0.002]]) };
}
}
return hatVars[i];
};
kit.buildMs = ms + now() - ts;
return kit;
}
export function getKit(ctx) {
let k = cache.get(ctx);
if (!k) { k = buildKit(ctx); cache.set(ctx, k); }
return k;
}
export function* kitSteps(ctx) {
if (cache.get(ctx)) return;
const k = yield* buildKitSteps(ctx);
if (!cache.get(ctx)) cache.set(ctx, k);
}
