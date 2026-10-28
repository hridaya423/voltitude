import { degMidi } from "@rl/js/music/theory.js";
export const MOTIF_DEGS = [-3, 0, 2, 0, 5, 4];
export const MOTIF_RHYTHM = [[0, 3], [3, 3], [6, 2], [8, 2], [10, 6], [16, 16]];
export const HEAD = MOTIF_DEGS.map((d, i) => ({ s: MOTIF_RHYTHM[i][0], l: MOTIF_RHYTHM[i][1], d }));
export const HEAD_INV = HEAD.map((n) => ({ ...n, d: -n.d }));
export const CELLS = [
[[0, 3], [3, 3], [6, 2], [8, 4], [12, 4], [16, 6], [22, 2], [24, 8]],
[[-2, 2], [0, 3], [3, 3], [6, 2], [8, 4], [12, 4], [16, 4], [20, 4], [24, 8]],
[[-4, 2], [-2, 2], [0, 6], [6, 2], [8, 4], [12, 4], [16, 3], [19, 3], [22, 2], [24, 8]],
[[0, 4], [4, 4], [8, 2], [10, 2], [12, 4], [16, 6], [22, 2], [24, 8]],
[[0, 2], [2, 2], [4, 4], [8, 6], [14, 2], [16, 4], [20, 4], [24, 8]],
[[0, 6], [6, 2], [8, 6], [14, 2], [16, 6], [22, 2], [24, 8]],
[[0, 3], [3, 3], [6, 4], [10, 2], [12, 4], [16, 3], [19, 3], [22, 10]],
[[2, 2], [4, 2], [6, 2], [8, 4], [12, 4], [16, 8], [24, 8]],
[[0, 4], [4, 2], [6, 2], [8, 8], [16, 3], [19, 3], [22, 2], [24, 8]],
[[-2, 2], [0, 4], [4, 4], [8, 3], [11, 3], [14, 2], [16, 8], [24, 8]],
[[0, 2], [2, 4], [6, 2], [8, 2], [10, 4], [14, 2], [16, 6], [22, 10]],
[[0, 3], [3, 5], [8, 3], [11, 5], [16, 3], [19, 5], [24, 8]],
[[0, 8], [8, 4], [12, 4], [16, 8], [24, 8]],
[[0, 6], [6, 6], [12, 4], [16, 16]],
[[0, 4], [4, 4], [8, 8], [16, 16]],
[[0, 3], [3, 3], [6, 2], [8, 24]],
[[-4, 2], [-2, 2], [0, 4], [4, 4], [8, 4], [12, 20]],
[[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 20]],
[[0, 4], [4, 2], [6, 2], [8, 4], [12, 2], [14, 2], [16, 16]],
[[-2, 2], [0, 6], [6, 6], [12, 4], [16, 16]],
[[-2, 2], [0, 8], [8, 2], [10, 2], [12, 4], [16, 6], [22, 2], [24, 8]],
[[-4, 4], [0, 6], [6, 2], [8, 6], [14, 2], [16, 4], [20, 4], [24, 8]],
[[-2, 2], [0, 4], [4, 2], [6, 2], [8, 8], [16, 3], [19, 3], [22, 10]],
[[-4, 2], [-2, 2], [0, 10], [10, 2], [12, 4], [16, 8], [24, 8]],
[[-2, 2], [0, 6], [6, 6], [12, 4], [16, 4], [20, 2], [22, 2], [24, 8]],
[[-4, 4], [0, 12], [12, 4], [16, 6], [22, 2], [24, 8]],
];
export const ANSWER_CELLS = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11];
export const DEV_CELLS = [0, 3, 4, 5, 6, 7, 8, 10, 11, 12];
export const LEAP_CELLS = [20, 21, 22, 23, 24, 25];
export const CADENCE_CELLS = [13, 14, 15, 16, 17, 18, 19];
export function path(wp, n, cap = Infinity) {
if (n <= 1) return [wp[wp.length - 1]];
const segs = [];
for (let i = 0; i + 1 < wp.length; i++) segs.push(wp[i + 1] - wp[i]);
const dist = segs.map(Math.abs), tot = dist.reduce((a, b) => a + b, 0) || 1;
const moves = n - 1;
const alloc = dist.map((d) => (d ? Math.max(1, Math.round(moves * d / tot)) : 0));
let diff = moves - alloc.reduce((a, b) => a + b, 0);
for (let k = 0; diff !== 0 && k < 64; k++) {
let j = 0;
for (let i = 1; i < alloc.length; i++) if (diff > 0 ? dist[i] - alloc[i] > dist[j] - alloc[j] : alloc[i] - dist[i] > alloc[j] - dist[j]) j = i;
if (diff < 0 && alloc[j] <= 1) { const i2 = alloc.findIndex((a) => a > 1); if (i2 < 0) break; j = i2; }
alloc[j] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1;
}
const out = [wp[0]];
let cur = wp[0];
segs.forEach((s, i) => {
const m = alloc[i], dir = Math.sign(s) || 1, d = Math.abs(s);
if (!m) return;
const sizes = [];
if (m >= d) {
const spare = m - d;
let a = spare >> 1;
if (dir < 0) a = Math.max(0, Math.min(a, cap - cur));
const turns = (spare >> 1) - a;
for (let k = 0; k < a; k++) sizes.push(-dir);
for (let k = 0; k < d + a; k++) sizes.push(dir);
for (let k = 0; k < turns; k++) sizes.splice(Math.min(a + 1 + 2 * k, sizes.length), 0, -dir, dir);
if (spare & 1) sizes.splice(Math.min(a + 2, sizes.length), 0, 0);
} else {
let left = d;
for (let k = 0; k < m; k++) { const st = Math.min(3, Math.ceil(left / (m - k))); sizes.push(dir * st); left -= st; }
}
for (const st of sizes) { cur += st; out.push(cur); }
});
while (out.length > n) out.splice(out.length - 2, 1);
while (out.length < n) out.splice(out.length - 1, 0, out[out.length - 2]);
out[out.length - 1] = wp[wp.length - 1];
return out;
}
const place = (cell, degs, off, role) => cell.map(([s, l], i) => ({ s: s + off, l, d: degs[i], role }));
function hooked(cell, wp, cap, hook) {
let dist = 0; for (let i = 0; i + 1 < wp.length; i++) dist += Math.abs(wp[i + 1] - wp[i]);
const hk = hook === false ? -1 : cell.findIndex(([st, l], i) => st >= 0 && st % 4 === 0 && i + 2 < cell.length && cell[i + 1][1] === l);
if (hk < 0 || cell.length - 1 <= dist + 1) return path(wp, cell.length, cap);
const d = path(wp, cell.length - 1, cap);
d.splice(hk + 1, 0, d[hk]);
return d;
}
export const HEAD_AUG = HEAD.map((n) => ({ s: n.s * 2, l: n.l * 2, d: n.d }));
const isWritten = (x) => Array.isArray(x) && x.length > 0 && Array.isArray(x[0]);
const writtenBlock = (list, role) => list.map(([s, l, d, r]) => ({ s, l, d, role: r === 'l' ? 'leap' : role }));
function buildWritten(o) {
const H = o.high, aug = o.head === 'aug';
const head = aug ? HEAD_AUG : o.head === 'inv' ? HEAD_INV : HEAD;
const notes = isWritten(o.head) ? writtenBlock(o.head, 'head') : head.map((n) => ({ ...n, role: 'head' }));
const fill = (cell, list, cap) => (list.length === cell.length ? list.slice() : hooked(cell, list, cap, o.hook));
if (isWritten(o.answer)) notes.push(...writtenBlock(o.answer, 'answer'));
else {
const ac = CELLS[o.answerCell ?? 0];
notes.push(...place(ac, fill(ac, o.answer, o.answerCap ?? H), aug ? 64 : 32, 'answer'));
}
if (isWritten(o.dev)) notes.push(...writtenBlock(o.dev, 'dev'));
else {
const dc = CELLS[o.devCell ?? 20];
const pick = dc.filter(([s]) => s < 0).length;
const degs = [];
for (let k = 0; k < pick; k++) degs.push(o.leap + (pick - 1 - k));
if (!pick) degs.push(o.leap);
const rest = dc.length - degs.length;
const fall = o.dev.length === rest - 1 ? [H, ...o.dev] : path([H, ...o.dev], rest, H);
const dn = place(dc, degs.concat(fall), aug ? 96 : 64, 'dev');
for (let k = 0; k < pick; k++) dn[k].role = 'leap';
notes.push(...dn);
}
if (isWritten(o.cad)) notes.push(...writtenBlock(o.cad, 'cad'));
else if (!aug && o.cad) {
const cc = CELLS[o.cadCell ?? 14];
notes.push(...place(cc, fill(cc, o.cad, H - 1), 96, 'cad'));
}
return finishLine(notes);
}
export function buildTheme(o) {
if (o.answer) return buildWritten(o);
const H = o.high;
const notes = HEAD.map((n) => ({ ...n, role: 'head' }));
const ac = CELLS[o.answerCell];
const aw = o.answerEnd > 0 ? [o.answerStart ?? 2, o.answerLow ?? -1, o.answerEnd] : [Math.min(2, H - 1), 0, 1, o.answerEnd];
notes.push(...place(ac, hooked(ac, aw, H - 1, o.hook), 32, 'answer'));
let dev;
if (o.dev === 'seq3' || o.dev === 'seq2') {
const k = o.dev === 'seq3' ? 3 : 2;
dev = HEAD.map((n) => ({ s: n.s + 64, l: n.l, d: n.d + k, role: 'dev' }));
const z = dev[dev.length - 1]; z.l = Math.max(2, 64 + 24 - z.s); dev.push({ s: 64 + 24, l: 8, d: z.d - 1, role: 'dev' });
} else if (o.dev === 'inv') {
const k = H - 3;
dev = HEAD.map((n) => ({ s: n.s + 64, l: n.l, d: -n.d + k, role: 'dev' }));
const z = dev[dev.length - 1]; z.l = Math.max(2, 64 + 24 - z.s); dev.push({ s: 64 + 24, l: 8, d: z.d + 1, role: 'dev' });
} else {
const dc = CELLS[o.devCell];
const peakAt = Math.max(1, Math.min(dc.length - 2, Math.round(dc.length * 0.4)));
let degs;
if (o.dev === 'leap') {
degs = [H - 5].concat(path([H, H - Math.max(2, dc.length - 3)], dc.length - 1, H));
} else {
degs = path([o.riseFrom ?? 1, H], peakAt + 1, H).concat(path([H, H - 3], dc.length - peakAt, H).slice(1));
}
dev = place(dc, degs, 64, 'dev');
}
notes.push(...dev);
const cc = CELLS[o.cadCell];
const lastDev = dev[dev.length - 1].d;
const cadStart = Math.max(o.cadEnd + 2, Math.min(lastDev + 1, o.cadEnd + cc.length - 1, H - 1));
const cadDegs = hooked(cc, [cadStart, o.cadEnd], H - 1, o.hook);
if (cc.length >= 2) cadDegs[cc.length - 2] = o.cadEnd + 1;
notes.push(...place(cc, cadDegs, 96, 'cad'));
return finishLine(notes);
}
export function finishLine(notes) {
notes.sort((a, b) => a.s - b.s);
for (let i = 1; i < notes.length; i++) {
const a = notes[i - 1], b = notes[i];
if (a.s + a.l > b.s) a.l = Math.max(1, b.s - a.s);
}
const hi = Math.max(...notes.map((n) => n.d));
for (const n of notes) { n.v = n.s % 4 === 0 || n.d === hi ? 1 : 0.84; n.glide = false; }
return notes.filter((n) => n.s >= 0);
}
export function buildVerse(spec) {
const notes = [], answer = [];
const cell = spec.cell, end = Math.max(...cell.map(([s, l]) => s + l));
spec.degs.forEach((dg, c) => {
const off = c * 32, k = Math.min(dg.length, cell.length);
for (let i = 0; i < k; i++) notes.push({ s: off + cell[i][0], l: cell[i][1], d: dg[i], role: 'verse' });
const gap = 32 - end;
if (gap < 4) return;
const last = dg[k - 1];
const a = off + end + (gap >= 8 ? 2 : 0), room = off + 32 - a;
if (room >= 6) answer.push({ s: a, l: 2, d: last + 2, role: 'answer' }, { s: a + 2, l: room - 2, d: last + 1, role: 'answer' });
else answer.push({ s: a, l: room, d: last + 2, role: 'answer' });
});
return { notes: finishLine(notes), answer };
}
export function augment(notes, k = 2, off = 0) { return notes.map((n) => ({ ...n, s: n.s * k + off, l: n.l * k })); }
export function themeStats(notes) {
const pcs = new Set(notes.map((n) => ((n.d % 7) + 7) % 7));
const hi = Math.max(...notes.map((n) => n.d));
const hiNotes = notes.filter((n) => n.d === hi);
let reps = 0, run = 0, maxRun = 0;
for (let i = 1; i < notes.length; i++) {
if (notes[i].d === notes[i - 1].d) { reps++; run++; maxRun = Math.max(maxRun, run); } else run = 0;
}
const last = notes[notes.length - 1], pen = notes[notes.length - 2];
const climax = hiNotes.reduce((a, n) => (n.l > a.l ? n : a), hiNotes[0]);
const ci = notes.indexOf(climax);
return {
degrees: pcs.size, high: hi, highInDev: climax.s >= 64 && climax.s < 128 && hiNotes.every((n) => n === climax || n.l <= 3 || n.role === 'head' || (n.s >= 64 && n.s < 128)),
highCount: hiNotes.length, climaxAt: climax.s, leapInto: ci > 0 ? hi - notes[ci - 1].d : 0,
repeats: reps, maxRepeatRun: maxRun + (maxRun ? 1 : 0), cadenceByStep: Math.abs(last.d - pen.d) === 1,
};
}
export function makeTheme(rng, reg, want = {}) {
if (want.answer) { const notes = buildWritten(want); return { notes, opts: want, stats: themeStats(notes) }; }
const hiDeg = (() => { let d = 3; while (degMidi(d + 1, reg.tonic, reg.mode) <= reg.max) d++; return d; })();
const fifthAbove = degMidi(4, reg.tonic, reg.mode) < degMidi(hiDeg, reg.tonic, reg.mode);
for (let tries = 0; tries < 40; tries++) {
const o = {
answerCell: tries === 0 && want.answerCell != null ? want.answerCell : rng.pick(ANSWER_CELLS),
answerEnd: fifthAbove ? 4 : -3,
dev: tries === 0 && want.dev ? want.dev : rng.pick(['seq3', 'seq2', 'inv', 'leap', 'rise']),
devCell: tries === 0 && want.devCell != null ? want.devCell : rng.pick(DEV_CELLS),
cadCell: tries === 0 && want.cadCell != null ? want.cadCell : rng.pick(CADENCE_CELLS),
cadEnd: tries === 0 && want.cadEnd != null ? want.cadEnd : rng.chance(0.7) ? 0 : 2,
};
o.high = Math.min(hiDeg, want.high ?? (fifthAbove ? 5 : hiDeg));
if (o.answerEnd > 0 && o.high <= 4) o.answerEnd = -3;
if (o.dev === 'seq3' && 2 + 3 !== o.high) o.dev = 2 + 2 === o.high ? 'seq2' : 'rise';
if (o.dev === 'seq2' && 2 + 2 !== o.high) o.dev = 'rise';
const notes = buildTheme(o);
const st = themeStats(notes);
if (st.degrees >= 5 && st.highInDev && st.highCount <= 2 && st.cadenceByStep && st.maxRepeatRun <= 2) return { notes, opts: o, stats: st };
}
const o = { answerCell: 0, answerEnd: -3, dev: 'rise', devCell: 3, cadCell: 14, cadEnd: 0, high: hiDeg };
const notes = buildTheme(o);
return { notes, opts: o, stats: themeStats(notes) };
}
export const leadTonic = (keyPc) => 72 + (((keyPc - 72) % 12) + 12) % 12;
export function contourOf(notes) {
const out = [];
for (let h = 0; h < 16; h++) {
const a = h * 8, z = a + 8;
let w = 0, sum = 0;
for (const n of notes) { const o = Math.min(z, n.s + n.l) - Math.max(a, n.s); if (o > 0) { w += o; sum += o * n.d; } }
out.push(w ? sum / w : (out.length ? out[out.length - 1] : 0));
}
return out;
}
export function contourSim(a, b) {
const x = contourOf(a), y = contourOf(b), n = x.length;
const mx = x.reduce((p, q) => p + q, 0) / n, my = y.reduce((p, q) => p + q, 0) / n;
let sxy = 0, sx = 0, sy = 0;
for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
return sx && sy ? sxy / Math.sqrt(sx * sy) : 0;
}
export function climaxOf(notes) {
const hi = Math.max(...notes.map((n) => n.d));
return notes.filter((n) => n.d === hi).reduce((a, n) => (n.l > a.l ? n : a));
}
export function hookFigures(head) {
const h = head.filter((n) => n.s < 32);
const pick = (from) => h.slice(from, from + 3);
const sets = [pick(0), pick(Math.min(1, Math.max(0, h.length - 3))), pick(Math.max(0, h.length - 3))];
return sets.map((ns) => {
const ds = ns.map((n) => n.d);
while (ds.length < 3) ds.push(ds[ds.length - 1] ?? 0);
return [{ k: 0, d: ds[0], l: 1 }, { k: 1, d: ds[1], l: 2 }, { k: 3, d: ds[2], l: 5 }];
});
}
