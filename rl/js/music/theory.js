export function mulberry32(seed) {
let a = seed >>> 0;
return function next() {
a = (a + 0x6D2B79F5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
export class Rng {
constructor(seed) { this.seed = seed >>> 0; this._f = mulberry32(this.seed); }
float() { return this._f(); }
range(a, b) { return a + (b - a) * this._f(); }
int(a, b) { return a + Math.floor(this._f() * (b - a + 1)); }
chance(p) { return this._f() < p; }
pick(arr) { return arr[Math.floor(this._f() * arr.length) % arr.length]; }
weighted(items, weights) {
let sum = 0;
for (let i = 0; i < weights.length; i++) sum += weights[i];
let r = this._f() * sum;
for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
return items[items.length - 1];
}
fork() { return new Rng((this._f() * 4294967296) >>> 0); }
jitter() { return this._f() - this._f(); }
}
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
export const MINOR = [0, 2, 3, 5, 7, 8, 10];
export const MODES = {
aeolian: MINOR,
phrygian: [0, 1, 3, 5, 7, 8, 10],
dorian: [0, 2, 3, 5, 7, 9, 10],
harmonic: [0, 2, 3, 5, 7, 8, 11],
ionian: [0, 2, 4, 5, 7, 9, 11],
lydian: [0, 2, 4, 6, 7, 9, 11],
};
export const isMajorMode = (mode) => mode === 'ionian' || mode === 'lydian';
export const tonicSpec = (mode) => (isMajorMode(mode) ? 'I' : 'i');
export function modeScale(keyPc, mode = 'aeolian') { return (MODES[mode] || MINOR).map((iv) => (keyPc + iv) % 12); }
export function degMidi(deg, tonic, mode = 'aeolian') {
const sc = MODES[mode] || MINOR;
const o = Math.floor(deg / 7), k = ((deg % 7) + 7) % 7;
return tonic + 12 * o + sc[k];
}
export const KEYS = [6, 9, 7, 4, 8, 2, 5, 11];
export function kickHzForKey(keyPc) {
for (const pc of [keyPc, (keyPc + 7) % 12, (keyPc + 3) % 12]) {
for (let m = 24; m < 40; m++) if (m % 12 === pc) { const f = mtof(m); if (f >= 45 && f <= 58) return f; }
}
return 49;
}
const pcAt = (keyPc, deg) => (keyPc + MINOR[((deg % 7) + 7) % 7]) % 12;
const ROMAN = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
export function chordFor(keyPc, degree, ext = '', harmonic = false) {
const root = pcAt(keyPc, degree);
let third = pcAt(keyPc, degree + 2);
const fifth = pcAt(keyPc, degree + 4);
if (harmonic && degree === 4) third = (third + 1) % 12;
const pcs = [root, third, fifth];
if (ext === 'add9') pcs.push(pcAt(keyPc, degree + 1));
else if (ext === '7') pcs.push(pcAt(keyPc, degree + 6));
else if (ext === 'sus2') pcs[1] = pcAt(keyPc, degree + 1);
else if (ext === 'sus4') pcs[1] = pcAt(keyPc, degree + 3);
const label = (harmonic && degree === 4 ? 'V' : ROMAN[degree]) + (ext ? ext : '');
const c = { degree, rootPc: root, pcs, ext, harmonic: !!(harmonic && degree === 4), label, keyPc, mode: 'aeolian' };
c.scale = chordScale(keyPc, 'aeolian', pcs);
return c;
}
export function chordScale(keyPc, mode, pcs, own = false) {
if (own) {
const major = ((pcs[1] - pcs[0] + 12) % 12) === 4;
return (major ? [0, 2, 4, 5, 7, 9, 11] : MINOR).map((iv) => (pcs[0] + iv) % 12);
}
const s = modeScale(keyPc, mode);
const adj = (arr) => { const v = arr.slice().sort((a, b) => a - b); let n = 0; for (let i = 0; i < v.length; i++) if (((v[(i + 1) % v.length] - v[i] + 12) % 12) === 1) n++; return n; };
for (const pc of pcs) {
if (s.includes(pc)) continue;
let best = -1, bestAdj = 99;
for (let i = 0; i < s.length; i++) {
const d = Math.min((s[i] - pc + 12) % 12, (pc - s[i] + 12) % 12);
if (d !== 1 || s[i] === keyPc || pcs.includes(s[i])) continue;
const trial = s.slice(); trial[i] = pc;
const a = adj(trial);
if (a < bestAdj) { bestAdj = a; best = i; }
}
if (best >= 0) s[best] = pc; else s.push(pc);
}
return s;
}
const NUMERALS = ['vii', 'iii', 'iv', 'vi', 'ii', 'v', 'i'];
const MAJOR_DEG = { i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11 };
const DEG_IDX = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
const specCache = new Map();
export function chordSpec(keyPc, spec, mode = 'aeolian') {
const key = keyPc + '|' + mode + '|' + spec;
let c = specCache.get(key);
if (c) return c;
let s = spec, own = false;
if (s.endsWith('!')) { own = true; s = s.slice(0, -1); }
let acc = 0;
if (s[0] === 'b') { acc = -1; s = s.slice(1); } else if (s[0] === '#') { acc = 1; s = s.slice(1); }
const low = s.toLowerCase();
const num = NUMERALS.find((n) => low.startsWith(n));
if (!num) throw new Error('bad chord spec ' + spec);
const upper = s[0] === s[0].toUpperCase();
let rest = s.slice(num.length);
let dim = false;
if (rest[0] === 'o') { dim = true; rest = rest.slice(1); }
const sc = MODES[mode] || MINOR;
const deg = DEG_IDX[num];
const rootIv = acc ? (MAJOR_DEG[num] + acc + 12) % 12 : sc[deg];
const root = (keyPc + rootIv) % 12;
const third = (root + (dim || !upper ? 3 : 4)) % 12, fifth = (root + (dim ? 6 : 7)) % 12;
const pcs = [root, third, fifth];
const scale0 = modeScale(keyPc, mode);
const scaleTone = (iv) => { for (const d of [0, -1, 1]) { const pc = (root + iv + d + 12) % 12; if (scale0.includes(pc)) return pc; } return (root + iv) % 12; };
const seventh = () => {
if (upper && rootIv === 7) return 10;
const m7 = scale0.includes((root + 10) % 12), M7 = scale0.includes((root + 11) % 12);
if (m7 !== M7) return m7 ? 10 : 11;
return upper ? 11 : 10;
};
if (rest === '7') pcs.push((root + seventh()) % 12);
else if (rest === 'add9' || rest === '9') pcs.push(scaleTone(2));
else if (rest === 'sus2') pcs[1] = scaleTone(2);
else if (rest === 'sus4') pcs[1] = (root + 5) % 12;
else if (rest === 'b6') pcs.push((root + 8) % 12);
else if (rest === '6') pcs.push((root + 9) % 12);
else if (rest) throw new Error('bad chord extension ' + spec);
const harmonic = upper && rootIv === 7;
c = { degree: deg, rootPc: root, pcs, ext: rest, harmonic, label: spec.replace('!', ''), keyPc, mode, own };
c.scale = chordScale(keyPc, mode, pcs, own);
specCache.set(key, c);
return c;
}
export function progBars(keyPc, str, mode = 'aeolian') { return str.trim().split(/\s+/).map((t) => chordSpec(keyPc, t, mode)); }
export function scaleFor(chord) {
if (chord.scale) return chord.scale;
const k = chord.keyPc;
const s = MINOR.map((iv) => (k + iv) % 12);
if (chord.harmonic) s[6] = (s[6] + 1) % 12;
return s;
}
export function pcAbove(pc, lo) { let m = lo; while (((m % 12) + 12) % 12 !== pc) m++; return m; }
export function nearestPc(pc, target) {
const base = target - (((target - pc) % 12) + 12) % 12;
return (target - base) <= (base + 12 - target) ? base : base + 12;
}
const PERMS4 = (() => {
const out = [];
const rec = (arr, rest) => {
if (!rest.length) { out.push(arr); return; }
for (let i = 0; i < rest.length; i++) rec(arr.concat(rest[i]), rest.slice(0, i).concat(rest.slice(i + 1)));
};
rec([], [0, 1, 2, 3]);
return out;
})();
export function voiceLead(prev, chord, lo = 50, hi = 76) {
const pcs = chord.pcs.length >= 4 ? chord.pcs.slice(0, 4) : [chord.pcs[0], chord.pcs[1], chord.pcs[2], chord.pcs[0]];
if (!prev || prev.length !== 4) prev = [lo + 4, lo + 9, lo + 14, lo + 19];
let best = null, bestCost = Infinity;
const cand = [0, 0], notes = [0, 0, 0, 0];
for (const perm of PERMS4) {
for (let oct = 0; oct < 16; oct++) {
let cost = 0, okRange = true;
for (let v = 0; v < 4; v++) {
const n = nearestPc(pcs[perm[v]], prev[v]);
cand[0] = n; cand[1] = n >= prev[v] ? n - 12 : n + 12;
let m = cand[(oct >> v) & 1];
if (m < lo || m > hi) { okRange = false; break; }
notes[v] = m;
cost += Math.abs(m - prev[v]);
}
if (!okRange) continue;
evalVoicing(notes, cost);
}
}
if (!best) {
best = pcs.map((pc, v) => { let m = nearestPc(pc, prev[v]); while (m < lo) m += 12; while (m > hi) m -= 12; return m; }).sort((a, b) => a - b);
}
return best;
function evalVoicing(notesIn, cost) {
const s = notesIn.slice().sort((a, b) => a - b);
for (let i = 1; i < 4; i++) {
const gap = s[i] - s[i - 1];
if (gap === 0) cost += 24;
else if (gap < 3 && s[i - 1] < 60) cost += 6;
else if (gap < 2) cost += 2;
}
const span = s[3] - s[0];
if (span > 19) cost += (span - 19) * 1.5;
if (span < 7) cost += 4;
const lowPc = ((s[0] % 12) + 12) % 12;
if (lowPc !== chord.pcs[0] && lowPc !== chord.pcs[2]) cost += 2.5;
if (cost < bestCost) { bestCost = cost; best = s; }
}
}
export const BASS_LO = 40;
export function bassMidi(chord) {
let m = pcAbove(chord.rootPc, BASS_LO);
if (m > BASS_LO + 11) m -= 12;
return m;
}
export function subMidi(rootMidi) { return rootMidi - 12 >= 28 ? rootMidi - 12 : rootMidi; }
export function arpTones(chord, base) {
const one = chord.pcs.map((pc) => pcAbove(pc, base)).sort((a, b) => a - b);
const out = one.slice();
for (const m of one) out.push(m + 12);
return out;
}
export const PROG_DRIVE = [
[[0, 'add9'], [5, ''], [2, ''], [6, '']],
[[0, ''], [3, '7'], [5, ''], [4, '', 1]],
[[0, ''], [6, ''], [5, ''], [6, '']],
[[0, 'add9'], [2, ''], [6, ''], [3, '7']],
[[0, ''], [5, '7'], [3, '7'], [4, '', 1]],
[[0, ''], [0, 'sus2'], [5, ''], [6, '']],
[[0, 'add9'], [5, '7'], [6, ''], [0, '']],
[[0, ''], [3, ''], [6, ''], [2, '']],
[[0, ''], [6, ''], [3, '7'], [5, '']],
[[0, 'add9'], [5, ''], [3, '7'], [6, 'sus4']],
];
export const PROG_EMO = [
[[5, '7'], [6, ''], [2, 'add9'], [0, 'add9']],
[[0, 'add9'], [5, '7'], [2, 'add9'], [6, 'sus2']],
[[3, '7'], [5, '7'], [0, 'add9'], [6, '']],
[[5, '7'], [2, ''], [6, ''], [0, '7']],
[[0, '7'], [3, '7'], [5, '7'], [6, 'sus4']],
[[5, '7'], [3, '7'], [0, 'add9'], [0, 'sus2']],
];
export const PROG_BUILD = [
[[5, '7'], [6, ''], [5, '7'], [4, '', 1]],
[[3, '7'], [5, ''], [6, ''], [4, '', 1]],
[[5, ''], [6, ''], [3, '7'], [6, 'sus4']],
[[3, ''], [3, '7'], [5, ''], [4, '', 1]],
];
export function progChords(keyPc, prog) {
return prog.map(([d, ext, h]) => chordFor(keyPc, d, ext || '', !!h));
}
export function progVariant(rng, prog) {
const p = prog.map((c) => c.slice());
const r = rng.float();
if (r < 0.4) {
const last = p[3][0];
p[3] = last === 4 ? [6, ''] : [4, '', 1];
} else if (r < 0.7) {
for (const c of p) if (!c[1] && rng.chance(0.5)) c[1] = c[0] === 4 ? '' : rng.pick(['add9', '7', 'sus2']);
} else {
const t = p[1]; p[1] = p[2]; p[2] = t;
}
return p;
}
