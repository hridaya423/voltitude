import {
KEYS, PROG_DRIVE, PROG_EMO, PROG_BUILD, progChords, progVariant, kickHzForKey, scaleFor, nearestPc, noteName, clamp,
chordSpec, degMidi, modeScale, progBars, Rng, tonicSpec,
} from "@rl/js/music/theory.js";
import { HEAD, makeTheme, augment, finishLine, leadTonic, hookFigures, buildVerse } from "@rl/js/music/motif.js";
export function sectionBase(type, progress) {
switch (type) {
case 'intro': return 0.26 + 0.14 * progress;
case 'groove': return 0.55;
case 'build': return 0.45 + 0.45 * progress;
case 'drop': return 0.9;
case 'breakdown': return 0.14;
case 'outro': return 0.5 - 0.22 * progress;
case 'halftime': return 0.5 + 0.08 * progress;
default: return 0.4;
}
}
export const BASS_LOW = ['..R-..r-..R-..r-', 'R-r-R-r-R-r-R-o-', 'R--r--R-r--R--o-', '..R-..R-..R-.oR-'];
export const BASS_MAIN = ['.rrr.rrr.rrr.rrR', '.rro.rro.rro.rOr', 'R.rrR.rrR.rrR.ro', '.ror.ror.ror.rOr', '.rrR.rrf.rrR.rro'];
export const BASS_HALF = 'R-----r-R-----o-';
export const BASS_HALFS = ['R-----r-R-----o-', 'R--r--R-..R-r-o-', 'R---r-r-R---..O-', 'R-----R-..r-R-o-'];
const TOMS = ['..l..m.....l.mh.', '...m..l...l...mm', '.l....m...l..m.l', '...l.l....m..hm.'];
export const TOM_RUNS = [
'h.h.hmm.m.mlmlLL', 's.hhs.mms.lls.LL', '..h.h.m.m.l.lLLL', 'hmlhmlhmlhmlsLsL', 'ssh.ssm.ssl.LLLL',
'....hhmm..mmllLL', 'h..hm..ml..lLsLs', 'hhh.mmm.lll.L.L.', '.hm.hm.ml.mlLLLL',
];
const GATES = ['1011011010110110', '1101110111011101', '1010101110101011', '1001001010010010', '1111011011110110', '1011101110111010'];
const ARP_MASKS = ['1111111111111111', '1101101101101101', '1011101110111011', '1110111011101110', '1111111011111110'];
export const ARP_ORDERS = [
[0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 5], [0, 2, 4, 1, 3, 5],
[0, 3, 1, 3, 2, 3], [5, 3, 4, 2, 3, 1], [0, 1, 2, 4, 2, 1], [0, 2, 3, 5, 3, 2, 1],
];
export const MENU_MASKS = ['10101101', '10110101', '11010110', '10011010', '10111011', '11011010'];
export function menuArp(rng, base) {
return { order: rng.pick(ARP_ORDERS).slice(), mask: bits(rng.pick(MENU_MASKS)), base, rate: 2 };
}
const bits = (s) => s.split('').map((c) => c === '1');
export const accents = (s) => s.split('').map((c) => 0.55 + 0.05 * (+c || 0));
function mutate(rng, pat, n) {
const a = pat.split('');
for (let k = 0; k < n; k++) {
const i = rng.int(0, 15);
if (i % 4 === 0 && a[i] === '.') continue;
const c = a[i];
if (c === '-') continue;
if (c === '.') a[i] = 'r';
else if (c.toLowerCase() === 'r') a[i] = rng.chance(0.5) ? 'o' : (rng.chance(0.5) ? 'f' : '.');
else a[i] = 'r';
}
return a.join('');
}
function hype(rng, pat) {
const a = pat.split('');
for (const i of [7, 11, 14, 15]) if (a[i] !== '.' && a[i] !== '-' && rng.chance(0.55)) a[i] = rng.chance(0.6) ? 'O' : 'R';
for (let i = 1; i < 16; i += 4) if (a[i] === 'r' && rng.chance(0.3)) a[i] = 'R';
return a.join('');
}
export const LEAD_MAX = 88;
const pcOf = (m) => ((m % 12) + 12) % 12;
export const isStrong = (step, len) => step % 8 === 0 || len >= 4;
export function isAvoid(m, chord) {
const pc = pcOf(m);
return !chord.pcs.includes(pc) && chord.pcs.includes((pc + 11) % 12);
}
export function resolveInto(m, chord) { return isAvoid(m, chord) ? (chord.pcs.includes(pcOf(m - 1)) ? m - 1 : nearestChordTone(m, chord, -1)) : m; }
const inScale = (m, sc) => sc.includes(pcOf(m));
function snapScale(m, sc, dir = 0) {
if (inScale(m, sc)) return m;
for (let d = 1; d < 7; d++) {
const order = dir > 0 ? [m + d, m - d] : [m - d, m + d];
for (const x of order) if (inScale(x, sc)) return x;
}
return m;
}
function nearestChordTone(m, chord, dir = 0) {
if (dir) { for (let k = 1; k < 13; k++) { const x = m + dir * k; if (chord.pcs.includes(pcOf(x))) return x; } return m; }
let best = m, bd = 99;
for (const pc of chord.pcs) { const c = nearestPc(pc, m); const d = Math.abs(c - m); if (d < bd) { bd = d; best = c; } }
return best;
}
function chordToneAtOrBelow(m, chord) { while (!chord.pcs.includes(pcOf(m))) m--; return m; }
function stepTone(m, chord, dir) { const sc = scaleFor(chord); for (let k = 1; k < 13; k++) { const x = m + dir * k; if (inScale(x, sc)) return x; } return m + dir; }
export function fitNote(midi, chord, strong) {
const m = snapScale(midi, scaleFor(chord));
return strong ? nearestChordTone(m, chord) : m;
}
export function leadPitch(n, chord, shift = 0) {
const strong = isStrong(n.step, n.len);
let m = fitNote(n.midi + shift, chord, strong);
if (!strong && n.len >= 3 && isAvoid(m, chord)) m -= 1;
if (m > LEAD_MAX) m = chordToneAtOrBelow(LEAD_MAX, chord);
return m;
}
export function fitLine(notes, plan, reg, rng = null) {
const out = [];
let prevM = null, prevC = null, run = 0;
const comp = (x) => (x ? degMidi(x.d, reg.tonic, reg.mode) + (x.oct || 0) : null);
const hiM = notes.length ? Math.max(...notes.map(comp)) : 0;
for (let i = 0; i < notes.length; i++) {
let n = notes[i];
const bar = Math.floor(n.s / 16);
if (bar >= plan.length) break;
const chord = plan[bar].chord;
const m0 = comp(n);
const dir = prevC == null ? 0 : Math.sign(m0 - prevC);
let m = m0;
if (!inScale(m, scaleFor(chord))) m = snapScale(m, scaleFor(chord), dir || -1);
const tonicPc = (reg.key ?? reg.tonic) % 12;
const headOverI = n.role === 'head' && chord.rootPc === tonicPc && (chord.pcs.includes((tonicPc + 3) % 12) || n.l <= 2);
const passing = !isStrong(n.s % 16, n.l) && n.l <= 3;
const climax = n.role === 'dev' && m0 === hiM && m === m0 && m <= reg.max && isStrong(n.s % 16, n.l) && !headOverI && isAvoid(m, chord);
if (climax) {
const len = Math.min(n.l, plan.length * 16 - n.s);
if (len >= 3 && (n.s % 16) + 2 < 16) {
const r = resolveInto(m, chord), vel = n.v ?? 1;
out.push({ step: n.s, len: 2, midi: m, vel, glide: false, hold: true, role: n.role, app: true, alt: n.alt, ph: n.ph, th: n.th });
out.push({ step: n.s + 2, len: len - 2, midi: r, vel, glide: true, res: true, role: n.role, alt: n.alt, ph: n.ph, th: n.th });
prevM = r; prevC = m0; run = 0;
continue;
}
} else if (n.role === 'dev' && m0 === hiM && m === m0 && chord.pcs.includes(pcOf(m)) && n.l < 6) {
const nx = notes[i + 1], room = (nx ? nx.s : plan.length * 16) - n.s;
if (room >= 6) n = { ...n, l: Math.min(room, 6) };
} else if (!headOverI && n.role !== 'leap' && isAvoid(m, chord)) {
const nx = notes[i + 1], nm = comp(nx);
const resolves = nx && nx.s === n.s + n.l && m - nm >= 1 && m - nm <= 2;
if (n.l >= 4 || (n.l >= 3 && !passing) || (n.s % 16 === 0 && !resolves)) m = nearestChordTone(m, chord, dir || -1);
}
if (prevM != null && m === prevM && n.role !== 'leap') {
let fix = m;
if (dir !== 0) fix = isStrong(n.s % 16, n.l) ? nearestChordTone(m, chord, dir) : stepTone(m, chord, dir);
else if (run >= 1) fix = nearestChordTone(m, chord, -1);
if (fix !== m && (run >= 1 || (fix !== comp(notes[i + 1]) && Math.abs(fix - m) < 4))) m = fix;
}
if (m > reg.max) m = chordToneAtOrBelow(reg.max, chord);
run = prevM != null && m === prevM ? run + 1 : 0;
const len = Math.min(n.l, plan.length * 16 - n.s);
const vel = n.v ?? 1;
const inBar = 16 - (n.s % 16);
if (len > inBar && bar + 1 < plan.length) {
const nc = plan[bar + 1].chord;
const r = nc === chord ? m : resolveInto(m, nc);
if (r !== m) {
out.push({ step: n.s, len: inBar, midi: m, vel, glide: false, hold: true, role: n.role, alt: n.alt, ph: n.ph, th: n.th });
out.push({ step: n.s + inBar, len: len - inBar, midi: r, vel, glide: true, res: true, role: n.role, alt: n.alt, ph: n.ph, th: n.th });
prevM = r; prevC = m0;
continue;
}
}
out.push({ step: n.s, len, midi: m, vel, glide: false, role: n.role, alt: n.alt, ph: n.ph, th: n.th });
prevM = m; prevC = m0;
}
for (let i = 1; i < out.length; i++) {
const a = out[i - 1], b = out[i];
if (a.role !== 'leap' || b.role !== 'dev' || b.midi <= a.midi) continue;
const iv = b.midi - a.midi;
if (iv === 8 || iv === 12) continue;
const sc = scaleFor(plan[Math.min(plan.length - 1, a.step >> 4)].chord);
const opts = (iv > 10 ? [12, 8] : [8, 12]).map((k) => b.midi - k).filter((m) => inScale(m, sc));
if (opts.length) a.midi = opts[0];
}
if (rng) {
for (let i = 1; i < out.length; i++) {
const a = out[i - 1], b = out[i];
if (!b.glide && b.role !== 'head' && a.step + a.len === b.step && Math.abs(b.midi - a.midi) <= 2 && b.midi !== a.midi && b.len >= 4 && rng.chance(0.2)) b.glide = true;
}
}
for (let i = 0; i + 1 < out.length; i++) { const a = out[i], b = out[i + 1]; if (b.glide && a.step + a.len === b.step) a.hold = true; }
return out;
}
function setAt(sec, b) {
const half = sec.setBars || (sec.bars >= 32 ? 16 : 8);
return sec.chords[Math.floor(b / half) % sec.chords.length];
}
export const pedalFits = (pc, chord) => chord.pcs.every((x) => { const d = ((x - pc) % 12 + 12) % 12; return d !== 1 && d !== 6 && d !== 11; });
function shuffleMerge(notes) {
const out = [];
for (const x of notes) {
const p = out[out.length - 1];
if (p && (x.s & 3) === 3 && (p.s & 3) === 2 && (x.s >> 2) === (p.s >> 2)) { p.l = x.s + x.l - p.s; continue; }
out.push(x);
}
return out;
}
export function phraseTheme(sec, ph, phrases = sec.leadPhrases || [1]) {
if (sec.finalThemes) return sec.finalThemes[ph % sec.finalThemes.length] || null;
if (!phrases[ph % phrases.length]) return null;
return sec.themeOrder ? sec.themeOrder[ph % sec.themeOrder.length] : sec.theme;
}
function themeLine(song, sec, phrases, n) {
const line = [];
const on = { A: 0, B: 0 };
for (let ph = 0; ph * 8 < n; ph++) {
const k = phraseTheme(sec, ph, phrases);
if (!k) continue;
const th = k === 'B' ? song.themeB : song.themeA, alt = k === 'B' ? song.themeB2 : song.themeA2;
const src = (on[k]++ % 2 === 0) !== !!song.swapThemes ? th : alt;
for (const x of src) if (ph * 128 + x.s < n * 16) line.push({ ...x, s: ph * 128 + x.s, ph, th: k, alt: src === alt ? k : undefined });
}
return finalCadence(song, sec, line, n);
}
function finalCadence(song, sec, line, n) {
const cf = song.cadFinal;
if (!cf || sec.type !== 'drop' || !sec.final || n < 8) return line;
const s0 = (n - 2) * 16, base = (n - 8) * 16;
const keep = line.filter((x) => x.s < s0);
if (keep.length === line.length && !line.some((x) => x.s >= base)) return line;
for (let i = keep.length - 1; i >= 0; i--) {
const x = keep[i];
if (x.s + x.l <= s0) continue;
x.l = s0 - x.s;
if (x.l < 6 && i > 0) { const pv = keep[i - 1]; keep.splice(i, 1); if (pv.s + pv.l >= x.s - 1) pv.l = s0 - pv.s; }
}
const last = keep[keep.length - 1] || line[line.length - 1] || {};
for (const [st, l, d] of cf.notes) keep.push({ s: base + st, l, d, role: 'cad', v: 1, glide: false, ph: last.ph, th: last.th, fin: true });
const ph = keep.filter((x) => x.s >= base);
const longMax = Math.max(...ph.filter((x) => x.l >= 6).map((x) => x.d));
if (Number.isFinite(longMax)) for (const x of ph) if (x.role !== 'cad' && x.s >= s0 - 16 && x.l < 6 && x.d > longMax) x.d = longMax;
return keep;
}
export const VERSE_VEL = 0.75, VERSE_FLOOR = 60;
function verseLine(song) {
if (song.verse) return song.verse.notes.map((n) => ({ ...n, s: 128 + n.s, v: (n.v ?? 1) * VERSE_VEL }));
const out = [];
let at = 128;
for (const th of [song.themeA, song.themeA2]) for (const role of ['answer', 'cad']) {
const blk = th.filter((n) => n.role === role);
if (!blk.length || at >= 256) continue;
const s0 = blk[0].s & ~15, end = Math.max(...blk.map((n) => n.s + n.l));
for (const n of blk) { const st = at + n.s - s0; if (st < 256) out.push({ ...n, s: st, l: Math.min(n.l, 256 - st), v: (n.v ?? 1) * VERSE_VEL, role: 'verse' }); }
at += Math.ceil((end - s0) / 16) * 16;
}
return out;
}
const CTR_LO = 64, CTR_HI = 91;
const ICS_GOOD = [3, 4, 8, 9];
export function counterLine(song, sec, plan, lead) {
const out = [];
const pc = (m) => ((m % 12) + 12) % 12;
const icOf = (a, b) => pc(a - b);
const over = (a, b) => lead.filter((n) => n.step < b && n.step + n.len > a);
const chordAtStep = (st) => plan[Math.min(plan.length - 1, st >> 4)].chord;
const end = sec.bars * 16;
const thB = (n) => (n.th ? n.th === 'B' : phraseTheme(sec, n.step >> 7) === 'B');
for (let ph = 0; ph * 8 < sec.bars; ph++) {
for (let w = 0; w < 4 && ph * 8 + w * 2 < sec.bars; w++) {
const w0 = ph * 128 + w * 32, w1 = Math.min(w0 + 32, end);
const ln = lead.filter((n) => n.step < w1 && n.step + n.len > w0);
if (!ln.length || ln.filter(thB).length * 2 < ln.length) continue;
let best = null;
for (let st = w0 + 2; st <= w1 - 4; st += 2) {
const sn = ln.find((n) => n.step <= st && n.step + n.len > st);
if (sn && st - sn.step < 2) continue;
const nx = lead.find((n) => n.step > st);
const room = Math.min(nx ? nx.step : w1 + 2, w1 + 2) - st;
if (!best || room > best.room) best = { st, room };
}
if (!best) continue;
const e = best.st, R = best.room;
const rh = R >= 12 ? [2, 2, 4, 4] : R >= 10 ? [2, 2, 4, 2] : R >= 8 ? [2, 4, 2] : R >= 6 ? [2, 2, 2] : [2, 2];
const steps = []; { let st = e; for (const l of rh) { if (st + l > end) break; steps.push([st, l]); st += l; } }
if (steps.length < 2) continue;
const ref = lead.filter((n) => n.step <= e).pop() || ln[0];
const after = lead.filter((n) => n.step > ref.step).slice(0, 3);
const ld = after.length ? Math.sign(after[after.length - 1].midi - ref.midi) : 0;
const pref = ld > 0 ? -1 : ld < 0 ? 1 : (w & 1 ? 1 : -1);
const K = steps.length;
const cands = steps.map(([st, l], k) => {
const c = chordAtStep(st), sc = scaleFor(c), ov = over(st, st + l), r = [];
const lo = Math.max(CTR_LO - 4, ref.midi - 14), hi = Math.min(CTR_HI, ref.midi + 10);
for (let m = lo; m <= hi; m++) {
if (!sc.includes(pc(m))) continue;
const ics = ov.map((n) => icOf(n.midi, m));
if (ics.some((x) => x === 0 || x === 1 || x === 6 || x === 11)) continue;
if ((k === 0 || k === K - 1) && ics.some((x) => x === 2 || x === 10)) continue;
if ((k === 0 || k === K - 1 || l >= 4) && !c.pcs.includes(pc(m)) && (isAvoid(m, c) || k === K - 1 || k === 0)) continue;
r.push(m);
}
return r;
});
if (cands.some((x) => !x.length)) continue;
const leadAt = (st) => (lead.filter((n) => n.step <= st && n.step + n.len > st).pop() || lead.filter((n) => n.step <= st).pop() || ref);
let bestP = null, bestS = -Infinity, visits = 0;
const path = [];
const go = (k, score) => {
if (++visits > 4000) return;
if (k === K) {
let sc2 = score;
if (K >= 3 && steps[K - 2][1] >= 4) {
const a2 = path[K - 2], b2 = path[K - 1], la = leadAt(steps[K - 2][0]).midi, lb = leadAt(steps[K - 1][0]).midi;
const ia = icOf(la, a2), ib = icOf(lb, b2);
if ((ia === 5 || ia === 10) && a2 - b2 >= 1 && a2 - b2 <= 2 && ICS_GOOD.includes(ib)) sc2 += 3;
}
if (sc2 > bestS) { bestS = sc2; bestP = path.slice(); }
return;
}
for (const m of cands[k]) {
let sc = score;
const ln2 = leadAt(steps[k][0]), ic = icOf(ln2.midi, m);
if (ICS_GOOD.includes(ic)) sc += 2; else if (ic === 5 || ic === 7) sc += 0.3;
if (k === 0) {
if (m < ref.midi) sc += 0.6;
} else {
const pm = path[k - 1], mv = m - pm;
if (mv === 0) { sc -= 2; } else if (Math.abs(mv) > 5) continue;
else if (Math.abs(mv) > 2) sc -= 0.8;
if (Math.sign(mv) === pref) sc += 0.6;
const lp = leadAt(steps[k - 1][0]).midi, lm = ln2.midi;
if (lm !== lp && Math.sign(mv) === -Math.sign(lm - lp)) sc += 1.2;
const icp = icOf(lp, pm);
if ((ic === 0 || ic === 7) && ic === icp && lm !== lp && mv !== 0) continue;
}
path.push(m);
go(k + 1, sc);
path.pop();
}
};
go(0, 0);
if (!bestP) continue;
for (let k = 0; k < K; k++) out.push({ step: steps[k][0], len: steps[k][1], midi: bestP[k], vel: 1, glide: false, role: 'counter' });
}
}
return out;
}
export function planSection(song, sec) {
const n = sec.bars, plan = [];
const key = sec.keyPc ?? song.keyPc, mode = sec.mode || song.mode;
const bp = song.buildPedal || 'dom';
for (let b = 0; b < n; b++) {
let chord, bass = null;
if (sec.type === 'build') {
const set = sec.chords[0];
chord = set[(set.length - n + b + set.length * 4) % set.length];
if (sec.toKey != null && b >= n - 2) chord = song.liftBars(sec.toKey)[b - (n - 2)];
const domBars = Math.min(4, Math.max(1, n >> 1));
if (!sec.lift && bp !== 'none') {
if (b < n >> 1) bass = key;
else if (bp === 'dom' && b >= n - domBars) bass = sec.toKey != null && b >= n - 2 ? (sec.toKey + 7) % 12 : (key + 7) % 12;
if (bass != null && !pedalFits(bass, chord)) bass = null;
}
} else {
const set = setAt(sec, b);
chord = set[b % set.length];
if (sec.type === 'drop' && song.dropPedal && n >= 16 && ((b >> 3) & 1) === 1 && (b & 7) < 4) {
bass = pedalFits(key, chord) ? key : null;
}
if (sec.picardy && b >= n - 2) chord = chordSpec(key, 'I', mode);
}
plan.push({ chord, bass });
}
if (sec.type === 'breakdown' && n >= 16 && song.bdEnd) {
const e = progBars(key, song.bdEnd, mode);
plan[n - 2] = { chord: e[0], bass: null }; plan[n - 1] = { chord: e[1], bass: null };
}
if (n >= 2 && !sec.picardy && (sec.endProg || (sec.ending && song.endChords))) {
const e = sec.endProg ? progBars(key, sec.endProg, mode) : song.endChords(key);
plan[n - 2] = { chord: e[0], bass: null }; plan[n - 1] = { chord: e[1], bass: null };
}
if (sec.type === 'drop' && sec.final && song.cadFinal && n >= 8) {
const e = progBars(key, song.cadFinal.prog, mode);
plan[n - 2] = { chord: e[e.length - 2], bass: null }; plan[n - 1] = { chord: e[e.length - 1], bass: null };
if (e.length >= 3) { const o = plan[n - 3].chord; if (e[0].pcs.filter((pc) => o.pcs.includes(pc)).length >= 2) plan[n - 3] = { chord: e[0], bass: null }; }
}
sec.plan = plan;
const reg = { tonic: leadTonic(key) + (song.leadOct || 0), key, mode, max: song.leadMax ?? LEAD_MAX };
const prng = new Rng((song.seed ^ (sec.uid * 2654435761)) >>> 0);
const shuf = song.feel === 'shuffle' ? shuffleMerge : (x) => x;
let line = [], lineL = null, verse = false;
sec.carrierNotes = null;
if (sec.type === 'drop' && sec.theme) {
line = themeLine(song, sec, sec.leadPhrases, n);
if (sec.listenPhrases) lineL = themeLine(song, sec, sec.listenPhrases, n);
} else if (sec.type === 'breakdown' && sec.theme !== false) {
for (const x of song.statement) if (x.s < n * 16) line.push({ ...x });
if (n >= 16 && song.bdDev && song.bdDev.length) {
const cl = song.bdDev.filter((x) => 128 + x.s < n * 16).map((x) => ({ ...x, s: 128 + x.s }));
sec.carrierNotes = fitLine(shuf(cl), plan, reg);
}
} else if ((sec.type === 'groove' || sec.type === 'halftime') && n >= 16 && song.themeA2) {
line = verseLine(song); verse = true;
}
line = shuf(line);
sec.verseAnswer = null;
if (verse) {
let T = reg.tonic - 12;
const low = (tt) => Math.min(...line.map((x) => degMidi(x.d, tt, mode)));
if (line.length && low(T) < VERSE_FLOOR) T += 12;
sec.leadNotes = fitLine(line, plan, { tonic: T, key, mode, max: T + 7 }, prng);
if (song.verse && song.verse.answer.length) {
const an = shuf(song.verse.answer.map((x) => ({ ...x, s: 128 + x.s, v: 1 })).filter((x) => x.s < n * 16));
sec.verseAnswer = fitLine(an, plan, { tonic: T + 12, key, mode, max: T + 21 });
}
} else sec.leadNotes = fitLine(line, plan, reg, prng);
sec.leadNotesL = lineL ? fitLine(shuf(lineL), plan, reg, new Rng((song.seed ^ (sec.uid * 2246822519)) >>> 0)) : null;
markPhrases(sec.leadNotes); if (sec.leadNotesL) markPhrases(sec.leadNotesL);
sec.phraseThemes = sec.type === 'drop' && sec.theme ? Array.from({ length: Math.ceil(n / 8) }, (_, ph) => phraseTheme(sec, ph)) : null;
sec.counterNotes = [];
if (sec.type === 'drop' && song.counter !== false && sec.leadNotes.some((x) => x.th === 'B')) sec.counterNotes = counterLine(song, sec, plan, sec.leadNotes);
sec.bassHead = null; sec.bellNotes = null;
if (song.hook === 'reeseHead' && sec.type === 'drop' && sec.phraseThemes && (sec.theme === 'B' || sec.final)) {
const bl = [];
for (let ph = 0; ph * 8 < n; ph++) {
const k = sec.phraseThemes[ph];
if (k && !(sec.final && ph === 0)) continue;
const th = (k || sec.theme) === 'B' ? song.themeB : song.themeA;
for (const x of th) if (x.role === 'head') bl.push({ ...x, s: ph * 128 + x.s, v: 1 });
}
const bt = 40 + ((key - 40) % 12 + 12) % 12;
sec.bassHead = fitLine(bl, plan, { tonic: bt + 12 > 51 ? bt : bt + 12, key, mode, max: 60 });
}
if (song.hook === 'bellInv' && sec.type === 'halftime' && n >= 4) {
const bl = song.hookA.map((x) => ({ ...x, s: 32 + x.s, v: 1 }));
sec.bellNotes = fitLine(bl, plan, { tonic: reg.tonic, key, mode, max: reg.tonic + 10 });
}
sec.dbkBell = null;
if (sec.active) {
const T = leadTonic(key) + (song.leadOct || 0);
const hl = [];
for (const b0 of [0, 4]) if (b0 + 2 <= n) for (const x of HEAD) hl.push({ ...x, s: b0 * 16 + x.s, v: 1, role: 'head' });
sec.carrierNotes = fitLine(shuf(hl), plan, { tonic: T, key, mode, max: T + 12 });
}
if (sec.type === 'drop' && n >= 32) {
const T = leadTonic(key) + (song.leadOct || 0);
const hl = [];
for (let ph = 2; ph * 8 < n; ph += 4) for (const b0 of [0, 4]) if (ph * 8 + b0 + 2 <= n) for (const x of HEAD) hl.push({ ...x, s: (ph * 8 + b0) * 16 + x.s, v: 1, role: 'head' });
sec.dbkBell = hl.length ? fitLine(shuf(hl), plan, { tonic: T, key, mode, max: T + 12 }) : null;
}
const callBars = sec.type === 'drop' ? [0, 8, 16, 24].filter((b) => b + 2 <= n)
: sec.type === 'groove' || sec.type === 'halftime' ? (n >= 12 && !song.headIsMotif ? [4] : [])
: sec.type === 'outro' ? [0] : [];
const ct = leadTonic(key) - 12;
sec.calls = callBars.map((b) => {
const motif = sec.type === 'groove' || sec.type === 'halftime' || song.headIsMotif;
const fit = (src, T) => fitLine(shuf(src.map((x) => ({ ...x, s: b * 16 + x.s, v: 1, role: 'head' }))), plan, { tonic: T, key, mode, max: T + 12 });
return { bar: b, motif, notes: fit(motif ? HEAD : song.hookA, motif ? ct + 12 : ct), hookNotes: motif && !song.headIsMotif ? fit(song.hookA, ct) : null };
});
sec.leadIndex = null; sec.leadIndexL = null; sec.counterIndex = null; sec.bhIndex = null; sec.bellIdx = null; sec.carrierIdx = null; sec.dbkIdx = null;
return sec;
}
export function refitBar(song, sec, bar) {
if (!sec || !sec.plan || bar < 0 || bar >= sec.plan.length) return 0;
const c = sec.plan[bar].chord, a = bar * 16, z = a + 16;
let moved = 0;
const fix = (line) => {
if (!line) return;
for (const nt of line) {
if (nt.step < a || nt.step >= z) continue;
const pc = ((nt.midi % 12) + 12) % 12;
const strong = nt.step % 4 === 0 && nt.len >= 2;
const ok = strong ? c.pcs.includes(pc) : c.scale.includes(pc);
if (ok) continue;
const want = strong ? c.pcs : c.scale;
let best = nt.midi, bd = 99;
for (let d = 1; d <= 6 && bd === 99; d++) for (const m of [nt.midi - d, nt.midi + d]) if (want.includes(((m % 12) + 12) % 12)) { best = m; bd = d; break; }
if (best !== nt.midi) { nt.midi = best; moved++; }
}
};
fix(sec.leadNotes); fix(sec.leadNotesL); fix(sec.counterNotes);
return moved;
}
export const ACTIVE_BREAK = 'bVI bVI bVII bVII iv iv V V';
export function activeBreak(song, i, atBar) {
const sec = song.sections[i];
if (!sec || sec.type !== 'drop' || sec.final || atBar <= 0 || atBar >= sec.bars) return null;
const freed = sec.bars - atBar;
if (freed < 8) return null;
let bk = 8, rest = freed - 8;
if (rest > 0 && rest < 4) { bk += rest; rest = 0; }
const key = sec.keyPc ?? song.keyPc, mode = sec.mode || song.mode;
const br = mk(song, 'breakdown', bk, { chords: [progBars(key, ACTIVE_BREAK, mode)], active: true, theme: false, keyPc: sec.keyPc, mode: sec.mode });
const add = [br];
if (rest > 0) {
add.push(mk(song, 'drop', rest, { chords: sec.chords, theme: sec.theme || 'A', leadPhrases: sec.leadPhrases || [1, 0], themeOrder: sec.themeOrder, chordOrder: sec.chordOrder, setBars: sec.setBars, keyPc: sec.keyPc, mode: sec.mode, kickVar: sec.kickVar, resumed: true, full: true }));
}
sec.bars = atBar;
song.sections.splice(i + 1, 0, ...add);
for (const x of add) planSection(song, x);
return { bars: bk, rest };
}
export function leadFrom(song, sec, bar) {
const key = sec.keyPc ?? song.keyPc, mode = sec.mode || song.mode;
const reg = { tonic: leadTonic(key) + (song.leadOct || 0), key, mode, max: song.leadMax ?? LEAD_MAX };
const line = [], n = sec.bars, lp = sec.leadPhrases || [1];
const on = { A: 0, B: 0 };
for (let ph = 0; bar * 16 + ph * 128 < n * 16; ph++) {
const P = (bar >> 3) + ph;
const k = sec.finalThemes ? phraseTheme(sec, P) : (ph > 0 && !lp[ph % lp.length] ? null : sec.themeOrder ? sec.themeOrder[P % sec.themeOrder.length] : sec.theme);
if (!k) continue;
const th = k === 'B' ? song.themeB : song.themeA, alt = k === 'B' ? song.themeB2 : song.themeA2;
const src = (on[k]++ % 2 === 0) !== !!song.swapThemes ? th : alt;
for (const x of src) { const st = bar * 16 + ph * 128 + x.s; if (st >= bar * 16 && st < n * 16) line.push({ ...x, s: st, ph, th: k }); }
}
const shuf = song.feel === 'shuffle' ? shuffleMerge : (x) => x;
sec.leadNotes = fitLine(shuf(finalCadence(song, sec, line, n)), sec.plan, reg, new Rng((song.seed ^ (sec.uid * 2654435761) ^ bar) >>> 0));
markPhrases(sec.leadNotes);
sec.counterNotes = song.counter !== false && sec.leadNotes.some((x) => x.th === 'B') ? counterLine(song, sec, sec.plan, sec.leadNotes).filter((c) => c.step >= bar * 16) : [];
sec.leadIndex = null; sec.counterIndex = null;
return sec.leadNotes;
}
export function markPhrases(line) {
if (!line) return line;
const groups = new Map();
for (const n of line) { const k = n.ph != null ? 'p' + n.ph : 'w' + (n.step >> 7); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); }
line.climax = [];
for (const g of groups.values()) {
const ps = [...new Set(g.map((n) => n.midi))].sort((a, b) => a - b);
for (const n of g) { n.rank = ps.length > 1 ? ps.indexOf(n.midi) / (ps.length - 1) : 0.5; n.climax = false; }
if (g.length < 3) continue;
const c = g.reduce((a, n) => (n.midi > a.midi || (n.midi === a.midi && n.len > a.len) ? n : a));
c.climax = true;
line.climax.push({ bar: c.step >> 4, step: c.step, len: c.len, midi: c.midi });
}
return line;
}
export function dropArc(sec, line, secBar, frac = 0) {
if (!sec || sec.type !== 'drop' || sec.final || sec.cruise || sec.bars < 16) return 1;
const a = (secBar >> 3) * 128, z = a + 128;
if (!line || !line.some((n) => n.step >= a && n.step < z)) { const b16 = secBar % 16; return b16 >= 4 && b16 < 8 ? 0.78 : b16 >= 12 ? 1.06 : 1; }
let c = null;
for (const x of line.climax || []) if (Math.abs(x.bar - secBar) <= 1 && (c == null || Math.abs(x.bar - secBar) < Math.abs(c - secBar))) c = x.bar;
if (c != null) return secBar < c ? 1 + 0.06 * frac : secBar === c ? 1.06 : 1.06 - 0.06 * frac;
const b8 = secBar & 7;
return b8 === 2 || b8 === 3 ? 0.84 : 1;
}
export const barsBefore = (song, i) => { let b = 0; for (let k = 0; k < i && k < song.sections.length; k++) b += song.sections[k].bars; return b; };
export const totalBars = (song) => song.sections.reduce((a, s) => a + s.bars, 0);
let uidSeq = 1;
export const DROP_MAX = 32;
function runFrom(song, j) {
let n = 0;
for (let k = j; k < song.sections.length; k++) {
const x = song.sections[k];
if (x.type === 'drop') n += x.bars;
else if (!(x.type === 'build' && (x.bars < 4 || x.mini))) break;
}
return n;
}
function mk(song, type, bars, extra = {}) { return { type, bars, uid: (song.seed + 97 * uidSeq++) >>> 0, ...extra }; }
export function hypeInPlace(song, i, atBar) {
const sec = song.sections[i], next = song.sections[i + 1];
const rest = sec.bars - atBar;
const take = next && next.type !== 'outro' && next.type !== 'drop' ? next.bars : 0;
const room = rest + take;
if (room < 6 || !next || next.type === 'outro') return false;
if (sec.type === 'breakdown' && atBar < 8) return false;
const after = song.sections[i + 2];
if (next.type === 'build' && !next.lift && after && after.type === 'drop' && (after.keyPc ?? song.keyPc) === (sec.keyPc ?? song.keyPc)) {
if (runFrom(song, i + 2) + room - 2 > DROP_MAX) return false;
sec.bars = atBar;
next.bars = 2; next.mini = true;
after.bars += room - 2;
planSection(song, sec); planSection(song, next); planSection(song, after);
return true;
}
const drop0 = song.sections.find((s) => s.type === 'drop' && s.theme === 'A') || song.sections.find((s) => s.type === 'drop');
if (room - 2 > 24) return false;
const build = mk(song, 'build', 2, { chords: [song.chBuild], mini: true, keyPc: sec.keyPc });
const drop = mk(song, 'drop', room - 2, { chords: drop0.chords, theme: 'A', leadPhrases: [1, 0], inserted: true, keyPc: drop0.keyPc });
sec.bars = atBar;
song.sections.splice(i + 1, take ? 1 : 0, build, drop);
planSection(song, sec); planSection(song, build); planSection(song, drop);
return true;
}
export function cutCalm(song, i, atBar) {
const sec = song.sections[i];
const freed = sec.bars - atBar;
if (freed <= 0) return false;
if (sec.type === 'breakdown' && (atBar < 8 || sec.active)) return false;
let j = i + 1;
if (sec.type === 'breakdown') while (j < song.sections.length && song.sections[j].type !== 'drop') j++;
if (j >= song.sections.length) j = i + 1;
if (j >= song.sections.length) return false;
if (sec.type === 'breakdown' && song.sections[j].type === 'drop' && runFrom(song, j) + freed > DROP_MAX) return false;
let toDrop = freed, cut = freed;
const bj = j - 1 > i && song.sections[j - 1].type === 'build' && !song.sections[j - 1].lift ? song.sections[j - 1] : null;
const fin = sec.type === 'breakdown' && song.sections[j].type === 'drop' && song.sections[j].final;
if (fin) {
const k = bj ? Math.min(8 - bj.bars, freed) : 0;
if (k < 4) return false;
cut = k; toDrop = 0;
bj.bars += k; planSection(song, bj);
} else if (sec.type === 'breakdown' && bj && bj.bars < 8) { const k = Math.min(8 - bj.bars, freed >> 1); bj.bars += k; toDrop -= k; planSection(song, bj); }
sec.bars -= cut;
song.sections[j].bars += toDrop;
planSection(song, sec); planSection(song, song.sections[j]);
return true;
}
export function landDrop(song, i, atBar) {
const sec = song.sections[i];
let j = i + 1;
while (j < song.sections.length && song.sections[j].type !== 'drop') j++;
if (j >= song.sections.length || atBar <= 0 || atBar > sec.bars) return -1;
let freed = sec.bars - atBar;
for (let k = i + 1; k < j; k++) freed += song.sections[k].bars;
const drop = song.sections[j];
if (runFrom(song, j) + freed > DROP_MAX) return -1;
song.sections.splice(i + 1, j - i - 1);
sec.bars = atBar;
drop.bars += freed;
planSection(song, drop);
return i + 1;
}
export function shortenDrop(song, i, atBar) {
const sec = song.sections[i], next = song.sections[i + 1];
const freed = sec.bars - atBar;
if (freed <= 0) return false;
sec.bars = atBar;
planSection(song, sec);
if (next && (next.type === 'breakdown' || next.type === 'groove' || next.type === 'outro')) { next.bars += freed; planSection(song, next); }
else {
const g = mk(song, 'groove', freed, { chords: song.grooveChords, keyPc: sec.keyPc });
song.sections.splice(i + 1, 0, g); planSection(song, g);
}
return true;
}
export function hypeSections(rng, song) {
const drop = song.sections.find((s) => s.type === 'drop' && s.leadNotes && s.leadNotes.length);
return [
mk(song, 'build', 2, { chords: [song.chBuild], mini: true }),
mk(song, 'drop', 16, { chords: drop ? drop.chords : [song.chA], theme: 'A', leadPhrases: [1, 0], inserted: true }),
];
}
export function chordAt(sec, secBar) {
if (sec.plan && sec.plan.length) return sec.plan[Math.max(0, Math.min(sec.plan.length - 1, secBar))].chord;
const set = setAt(sec, secBar);
return set[Math.floor(secBar / (sec.chordBars || 1)) % set.length];
}
export function chordSpan(sec, secBar) {
const c = chordAt(sec, secBar); let k = 1;
while (secBar + k < sec.bars && chordAt(sec, secBar + k) === c) k++;
return k;
}
export const FORMS = ['classic', 'coldOpen', 'halftime', 'doubleDrop', 'ballad'];
const KEY_NAMES = { aeolian: 'minor', phrygian: 'phrygian', dorian: 'dorian', harmonic: 'harmonic minor' };
const PEDAL = 'i bVI bVII i';
function nextKey(rng, prevPc) {
if (prevPc == null) return 6;
const cands = KEYS.filter((k) => k !== prevPc);
const w = cands.map((k) => { const d = Math.min((k - prevPc + 12) % 12, (prevPc - k + 12) % 12); return d === 5 ? 3 : d <= 2 ? 2.5 : d === 3 ? 2 : 1; });
return rng.weighted(cands, w);
}
function makeArp(rng, base) { return { order: rng.pick(ARP_ORDERS).slice(), mask: bits(rng.pick(ARP_MASKS)), base, rate: 1 }; }
function arpVariant(rng, a) {
let order = a.order, mask = a.mask, guard = 0;
while (order === a.order || order.join() === a.order.join()) { order = rng.pick(ARP_ORDERS).slice(); if (++guard > 8) break; }
guard = 0;
while (mask === a.mask || mask.join() === a.mask.join()) { mask = bits(rng.pick(ARP_MASKS)); if (++guard > 8) break; }
return { order, mask, base: a.base, rate: a.rate };
}
const perBar = (chords, cb = 1) => { const out = []; for (const c of chords) for (let k = 0; k < cb; k++) out.push(c); return out; };
export const DEFAULT_PATCH = { arp: 'sawsq', arpQ: 7, arpDecay: 1, padDetune: 12, chorusHz: 0.23, padLP: 650, kickBody: 0.08, kickDrop: 0.03 };
export function makeSong(rng, index, prevKeyPc = null, opts = {}) {
return opts.track ? trackSong(opts.track, index, opts.play | 0) : radioSong(rng, index, prevKeyPc, opts);
}
function finishSong(song, rng, want = {}) {
const reg = { tonic: leadTonic(song.keyPc) + (song.leadOct || 0), mode: song.mode, max: song.leadMax ?? LEAD_MAX };
const tr = new Rng((song.seed ^ 0x51ed) >>> 0);
const A = makeTheme(tr, reg, want.themeA || {});
const written = !!A.opts.answer;
const A2 = makeTheme(tr, reg, written ? { ...A.opts, ...(want.themeA2 || {}) } : { ...A.opts, cadCell: undefined, cadEnd: A.opts.cadEnd === 0 ? 2 : 0, ...(want.themeA2 || {}) });
const B = makeTheme(tr, reg, want.themeB || { dev: A.opts.dev === 'inv' ? 'rise' : 'inv' });
const B2 = makeTheme(tr, reg, B.opts.answer ? { ...B.opts, ...(want.themeB2 || {}) } : { ...B.opts, cadCell: undefined, cadEnd: 0 });
song.themeA = A.notes; song.themeA2 = A2.notes; song.themeB = B.notes; song.themeB2 = B2.notes;
song.themeOpts = { A: A.opts, A2: A2.opts, B: B.opts, B2: B2.opts };
const hd = A.notes.filter((x) => x.role === 'head'), an = A.notes.filter((x) => x.role === 'answer');
song.hookA = hd;
song.headIsMotif = !Array.isArray(A.opts.head);
song.hookFigures = hookFigures(hd);
const tidy = (line) => {
for (let i = 0; i + 1 < line.length; i++) { const a = line[i], b = line[i + 1]; if (a.s + a.l > b.s) a.l = b.s - a.s; }
const last = line[line.length - 1]; if (last && last.s + last.l > 128) last.l = 128 - last.s;
return line;
};
const aug2 = (list, at) => { if (!list.length) return []; const s0 = list[0].s; return list.map((x) => ({ ...x, s: at + (x.s - s0) * 2, l: x.l * 2 })); };
song.statement = tidy(A.opts.head === 'aug'
? hd.concat(an.map((x) => ({ ...x, s: 64 + (x.s - 64) * 2, l: x.l * 2 }))).filter((x) => x.s < 128)
: aug2(hd, 0).concat(aug2(an, 64)).filter((x) => x.s < 128));
const dv = A.notes.filter((x) => x.role === 'dev' || x.role === 'leap');
song.bdDev = dv.length ? aug2(dv, 0).filter((x) => x.s < 64) : [];
const mh = augment(HEAD.map((x) => ({ ...x, role: 'head' })), 2).filter((x) => x.s < 64);
song.menuStatement = tidy(mh.concat(aug2(an, 64)).filter((x) => x.s < 128));
if (dv.length) {
song.statement2 = tidy(mh.concat(aug2(dv, 64)).filter((x) => x.s < 128));
}
song.leapType = A.opts.high != null && A.opts.leap != null && A.opts.high - A.opts.leap === 7 ? 'oct' : 'm6';
song.pedalChords = (key, mode = song.mode) => progBars(key, song.pedalProg || PEDAL, mode);
song.verse = want.verse ? buildVerse(want.verse) : null;
song.cadFinal = A.opts.cadFinal || null;
song.uidBase = song.seed;
for (const s of song.sections) planSection(song, s);
song.totalBars = totalBars(song);
const last = song.sections[song.sections.length - 1];
song.endKeyPc = last.keyPc ?? song.keyPc;
return song;
}
export const PLAY_VARIANTS = 4;
function trackSong(t, index, play = 0) {
const rng = new Rng(t.seed >>> 0);
const key = t.keyPc, mode = t.scale || t.mode || 'aeolian';
const P = (s, k = key) => progBars(k, s, mode);
const v = ((play % PLAY_VARIANTS) + PLAY_VARIANTS) % PLAY_VARIANTS;
const odd = v === 1 || v === 3, progSwap = v === 2 || v === 3;
const swapDrop = (x) => (progSwap && x.drop2 ? { ...x, drop: x.drop2, drop2: x.drop } : x);
const pr = t.prog;
const ch = {
intro: P(pr.intro), groove: P(pr.groove), groove2: P(pr.groove2 || pr.groove), drop: P(pr.drop), drop2: P(pr.drop2 || pr.drop),
dropB: P(pr.dropB || pr.drop), breakdown: P(pr.breakdown), build: P(pr.build), outro: P(pr.outro || pr.groove),
halftime: P(pr.halftime || pr.groove),
};
const song = {
index, seed: t.seed >>> 0, track: t, id: t.id, form: t.form, keyPc: key, mode, bpm: t.bpm, feel: t.feel || 'four',
swing: t.swing ?? 0.545, keyName: noteName(key + 60).replace(/\d+$/, '') + ' ' + KEY_NAMES[mode],
kickHz: t.kickTail || kickHzForKey(key), pedalProg: pr.pedal, dropPedal: t.dropPedal !== false, buildPedal: t.buildPedal || pr.buildPedal || 'dom',
chBuild: ch.build, chA: ch.drop, grooveChords: [ch.groove, ch.groove2],
menu: (pr.menu || [pr.breakdown]).map((s) => P(s)), chReplay: P(pr.replay || pr.drop),
liftBars: (k) => P(pr.lift || 'bII V', k), endChords: (k) => P(pr.end || 'V i', k),
leadOct: t.leadOct || 0, leadMax: t.leadMax ?? LEAD_MAX, leadRel: t.leadRel ?? null, hook: t.hook || null, choirB9: !!t.choirB9,
play, variant: v, swapThemes: odd, counter: t.counter !== false,
air: t.air || 0, sub: t.sub || null, lowShelf: t.lowShelf || 0, lowShelfHz: t.lowShelfHz || 50, finalMusic: t.finalMusic || null, rampChord: t.rampChord || 'i',
padTrim: t.padTrim || 0, kickTrim: t.kickTrim || 0, width: t.width || 0, bdEnd: t.bdEnd || null,
bdCarrier: v === 3 ? ((t.bdCarrier || 'choir') === 'choir' ? 'bell' : 'choir') : (t.bdCarrier || 'choir'),
sub2: t.sub2 ?? 0.5, body: t.body ?? 2.5, presence: t.presence || 0, top: t.top || 0, padLow: t.padLow || 0, leadTrim: t.leadTrim || 0,
};
let uid = 0;
const S = [];
const lp = t.leadPhrases || {};
for (const [type, bars, tag, extra = {}] of t.sections) {
const s = { type, bars, uid: (t.seed + 7919 * ++uid) >>> 0, ...extra };
if (type === 'intro') s.chords = [ch.intro];
else if (type === 'groove') s.chords = [ch.groove, ch.groove2];
else if (type === 'halftime') { s.chords = [ch.halftime, ch.groove2]; s.toms = t.toms || TOMS[rng.int(0, 3)]; }
else if (type === 'breakdown') s.chords = [ch.breakdown];
else if (type === 'outro') { s.chords = [ch.outro]; if (tag === 'picardy') s.picardy = true; }
else if (type === 'build') { s.chords = [ch.build]; if (tag === 'lift2') s.lift = true; if (tag === 'coldOpen') s.coldOpen = true; }
else if (type === 'drop') {
s.theme = tag === 'B' ? 'B' : 'A';
s.leadPhrases = s.theme === 'B' ? (lp.B || [0, 1, 0, 1]) : (lp.A || [1, 0, 1, 1]);
s.kickVar = t.kickVar && rng.chance(t.kickVar) ? rng.pick(['broken', 'half']) : null;
if (!extra.final && s.theme === 'A' && bars <= 16) s.listenPhrases = [1, 1];
}
S.push(s);
}
S[S.length - 1].ending = true;
if (!S.some((x) => x.final)) {
for (let j = S.length - 1; j >= 0; j--) if (S[j].type === 'drop') { S[j].final = true; break; }
}
const dropChords = (s, prog, k, md) => {
const Q = (x) => progBars(k, x, md);
if (!s.final) prog = swapDrop(prog);
if (s.finalThemes && s.bars >= 32) return [Q(prog.drop), Q(prog.dropB || prog.drop), Q(prog.drop2 || prog.drop), Q(prog.drop)];
if (s.chordOrder) { s.setBars = 8; return s.chordOrder.map((nm) => Q(prog[nm] || prog.drop)); }
if (s.themeOrder) return s.bars >= 32 ? [Q(prog.dropB || prog.drop), Q(prog.drop), Q(prog.drop2 || prog.drop), Q(prog.drop)] : [Q(prog.dropB || prog.drop), Q(prog.drop)];
return s.theme === 'B' ? [Q(prog.dropB || prog.drop), Q(prog.drop)] : [Q(prog.drop), Q(prog.drop2 || prog.drop)];
};
if (v === 3) {
const d = S.find((x) => x.type === 'drop' && x.theme === 'A' && !x.final);
if (d) { d.themeOrder = ['B', 'A', 'A', 'A']; if (d.bars >= 32) d.setBars = 8; if (d.chordOrder) d.chordOrder = ['dropB', 'drop2', 'drop', 'drop2']; }
}
for (const s of S) {
if (s.type !== 'drop') continue;
if (s.final) {
s.leadPhrases = lp.final || [1, 1, 0, 1];
delete s.listenPhrases;
if (s.theme === 'B') {
if (s.bars >= 32) { s.finalThemes = ['A', 'B', null, 'A']; s.setBars = 8; s.leadPhrases = [1, 1, 0, 1]; } else { s.finalThemes = ['B', 'A']; s.leadPhrases = [1, 1]; }
}
}
s.chords = dropChords(s, pr, key, mode);
}
const liftAt = S.findIndex((s) => s.lift === 2 || s.liftBy);
if (liftAt >= 0) {
const by = S[liftAt].liftBy || 2, nk = (key + by) % 12;
const lm = t.liftMode || mode, lpr = { ...t.prog, ...(t.liftProg || {}) };
const PL = (x) => progBars(nk, x, lm);
for (let j = liftAt; j < S.length; j++) {
const s = S[j];
s.keyPc = nk;
if (t.liftMode) { s.mode = lm; s.pedalProg = lpr.pedal; }
if (s.type === 'drop') s.chords = dropChords(s, lpr, nk, lm);
if (s.type === 'outro') s.chords = [PL(lpr.outro || lpr.groove)];
if (s.type === 'breakdown') s.chords = [PL(lpr.breakdown)];
if (s.type === 'groove') s.chords = [PL(lpr.groove), PL(lpr.groove2 || lpr.groove)];
if (s.ending && t.liftProg && t.liftProg.end) s.endProg = t.liftProg.end;
}
for (let j = liftAt - 1; j >= 0; j--) if (S[j].type === 'build') { S[j].toKey = nk; break; }
}
song.sections = S;
const b = t.bass || {};
song.bass = { low: b.low || BASS_LOW[0], main: b.main, main2: b.main2 || b.main, high: b.high || hype(rng, b.main), half: b.half || BASS_HALFS[0] };
if (v === 2) { song.bass = { ...song.bass, main: song.bass.main2, main2: song.bass.main }; song.highPhrase2 = true; }
const A = t.arp || {};
song.arp = { order: A.order || rng.pick(ARP_ORDERS).slice(), mask: bits(A.mask || rng.pick(ARP_MASKS)), base: A.base ?? 64, rate: 1 };
song.arp2 = arpVariant(rng, song.arp);
song.arpBreak = { order: rng.pick(ARP_ORDERS).slice(), mask: bits('1111111111111111'), base: A.breakBase ?? 68, rate: 2 };
song.arpMenu = { order: rng.pick(ARP_ORDERS).slice(), mask: bits(rng.pick(MENU_MASKS)), base: A.menuBase ?? 68, rate: 2 };
song.gate = bits(t.gate || rng.pick(GATES)); song.gate2 = bits(t.gate2 || rng.pick(GATES));
song.hatRate = t.hatRate ?? 1; song.snareRate = t.snareRate ?? 1;
song.hatAcc = accents(t.hats || '9595959595959595');
song.ghosts = t.ghosts || [7, 14]; song.kickExtra = t.kickExtra || [14];
song.fillW = t.fillW || { roll: 2, toms: 1.5, gap: 1, kicks: 0.8 };
song.riser = t.riser || null;
const F = t.fills || {};
song.tomRuns = (F.toms || [0, 1, 2]).map((i) => TOM_RUNS[i % TOM_RUNS.length]);
song.stopFill = F.stop || '........s.s.SsSS';
song.bassTimbre = t.bassTimbre || 'roll'; song.breakReese = !!t.breakReese; song.leadTimbre = t.leadTimbre || 'super';
song.kit = { snare: 0, hat: 0, backbeat: 'snare', ...(t.kit || {}) };
if (v === 2) song.kit = { ...song.kit, snare: (song.kit.snare + 1) % 3, hat: (song.kit.hat + 1) % 3 };
song.patch = { ...DEFAULT_PATCH, ...(t.patch || {}) };
song.choir = t.choir ?? 0.5;
if (odd) { const x = song.arp; song.arp = song.arp2; song.arp2 = x; const g = song.gate; song.gate = song.gate2; song.gate2 = g; }
if (v === 1 && t.leadAlt) song.leadTimbre = t.leadAlt;
if (v === 2 && t.leadThird) song.leadTimbre = t.leadThird;
if (v === 3) {
const r3 = new Rng((t.seed ^ 0x3a3c0de) >>> 0), used = [song.arp.order.join(), song.arp2.order.join()];
const pick = () => { let o = r3.pick(ARP_ORDERS); for (let k = 0; k < 16 && used.includes(o.join()); k++) o = r3.pick(ARP_ORDERS); used.push(o.join()); return o.slice(); };
song.arp = { ...song.arp, order: pick() }; song.arp2 = { ...song.arp2, order: pick() };
}
const rot = v >= 2 ? 2 : 0;
if (rot) { song.gate = song.gate.slice(rot).concat(song.gate.slice(0, rot)); song.gate2 = song.gate2.slice(rot).concat(song.gate2.slice(0, rot)); }
return finishSong(song, rng, { themeA: t.theme, themeA2: t.themeA2, themeB: t.themeB, themeB2: t.themeB2, verse: t.verse });
}
function radioSong(rng, index, prevKeyPc, opts) {
const keyPc = nextKey(rng, prevKeyPc);
const first = index === 0;
const progA = rng.pick(PROG_DRIVE);
const progB = rng.chance(0.5) ? progVariant(rng, progA) : rng.pick(PROG_DRIVE);
const progEmo = rng.pick(PROG_EMO);
const progBuild = rng.pick(PROG_BUILD);
const chA = perBar(progChords(keyPc, progA)), chA2 = perBar(progChords(keyPc, progVariant(rng, progA)));
const chB = perBar(progChords(keyPc, progB)), chEmo = perBar(progChords(keyPc, progEmo), 2);
const chBuild = perBar(progChords(keyPc, progBuild));
const chIntro = rng.chance(0.5) ? chA : chEmo;
const bassMain = rng.pick(BASS_MAIN);
const liftProg = rng.chance(0.5) ? 'bII V' : 'iv V';
const song = {
index, seed: rng.seed >>> 0, keyPc, mode: 'aeolian', bpm: 124, feel: 'four', swing: 0.545,
keyName: noteName(keyPc + 60).replace(/\d+$/, '') + ' minor', kickHz: kickHzForKey(keyPc), dropPedal: rng.chance(0.6),
chBuild, chA, grooveChords: [chA, chA2], chReplay: chA,
menu: [chEmo, perBar(progChords(keyPc, progVariant(rng, progEmo)), 2), perBar(progChords(keyPc, progA), 2)],
liftBars: (k) => progBars(k, liftProg, 'aeolian'),
};
song.bass = { low: rng.pick(BASS_LOW), main: bassMain, main2: mutate(rng, bassMain, 2), high: hype(rng, bassMain), half: rng.pick(BASS_HALFS) };
const ghostPool = [3, 7, 10, 11, 14, 15], ghosts = [];
const nG = rng.int(1, 2);
while (ghosts.length < nG) { const g = rng.pick(ghostPool); if (!ghosts.includes(g)) ghosts.push(g); }
song.ghosts = ghosts;
song.kickExtra = rng.pick([[14], [10], [11, 14], [7], [15]]);
song.fillW = { roll: rng.range(1, 3), toms: rng.range(0.5, 2.5), gap: rng.range(0.6, 1.6), kicks: rng.range(0.4, 1.5) };
const form = opts.form && FORMS.includes(opts.form) ? opts.form : first ? 'classic' : rng.weighted(FORMS.slice(0, 4), [3, 2, 2, 2]);
song.form = form;
const kickVar = () => (rng.chance(0.3) ? rng.pick(['broken', 'half']) : null);
let uid = 0;
const S = [];
const sec = (type, bars, extra = {}) => S.push({ type, bars, uid: (song.seed + 7919 * ++uid) >>> 0, ...extra });
const dropA = (bars) => sec('drop', bars, { chords: [chA, chA2], theme: 'A', leadPhrases: rng.pick([[1, 0, 1, 1], [1, 1, 0, 1]]), kickVar: kickVar() });
const dropB = (bars, extra = {}) => sec('drop', bars, { chords: [chB, chA], theme: 'B', leadPhrases: rng.pick([[0, 1, 0, 1], [0, 1, 1, 0]]), kickVar: kickVar(), ...extra });
const breakdown = (bars) => sec('breakdown', bars, { chords: [chEmo] });
const build = (bars, extra = {}) => sec('build', bars, { chords: [chBuild], ...extra });
const outro = () => sec('outro', rng.pick([8, 16]), { chords: [chA] });
if (form === 'coldOpen') {
build(4, { coldOpen: true }); dropA(rng.pick([16, 32])); sec('groove', 16, { chords: [chB, chA] });
breakdown(rng.pick([8, 16])); build(rng.pick([4, 8])); dropB(rng.pick([16, 32])); outro();
} else if (form === 'halftime') {
sec('intro', rng.pick([8, 8, 16]), { chords: [chIntro] });
sec('halftime', 16, { chords: [chA, chA2], toms: rng.pick(TOMS) });
build(rng.pick([4, 8, 8])); dropA(rng.pick([16, 16, 32])); breakdown(rng.pick([8, 16])); build(rng.pick([4, 8])); dropB(rng.pick([16, 32])); outro();
} else if (form === 'doubleDrop') {
const lift = progChords(keyPc, rng.pick([[[5, '7'], [4, '', 1]], [[3, '7'], [4, '', 1]], [[5, ''], [6, 'sus4']]]));
sec('intro', rng.pick([8, 16]), { chords: [chIntro] }); sec('groove', 16, { chords: [chA, chA2] });
build(8); dropA(16); sec('build', 2, { chords: [lift], lift: true }); dropB(16); breakdown(16); build(4);
sec('drop', 16, { chords: [chA, chB], theme: 'A', leadPhrases: [1, 1, 0, 1], kickVar: kickVar(), final: true }); outro();
} else {
sec('intro', first ? 8 : rng.pick([8, 8, 16]), { chords: [chIntro] }); sec('groove', rng.pick([16, 16, 24]), { chords: [chA, chA2] });
build(rng.pick([4, 8, 8])); dropA(rng.pick([16, 16, 32])); breakdown(rng.pick([8, 16, 16])); build(rng.pick([4, 8]));
dropB(rng.pick([16, 32]), { final: true });
if (rng.chance(0.45)) sec('groove', 16, { chords: [chB] });
outro();
}
if (form === 'classic' || form === 'doubleDrop') {
const fi = S.findIndex((s) => s.final), nk = (keyPc + 2) % 12;
const tr = (set) => set.map((c) => chordSpec(nk, c.label, 'aeolian'));
for (let j = fi; j < S.length; j++) { S[j].keyPc = nk; S[j].chords = S[j].chords.map(tr); }
for (let j = fi - 1; j >= 0; j--) if (S[j].type === 'build' && !S[j].lift) { S[j].toKey = nk; break; }
}
song.sections = S;
song.arp = makeArp(rng, rng.int(63, 67));
song.arpBreak = { order: rng.pick(ARP_ORDERS).slice(), mask: bits('1111111111111111'), base: rng.int(66, 70), rate: 2 };
song.arpMenu = { order: rng.pick(ARP_ORDERS).slice(), mask: bits(rng.pick(MENU_MASKS)), base: rng.int(66, 71), rate: 2 };
song.gate = bits(rng.pick(GATES)); song.gate2 = bits(rng.pick(GATES));
song.hatRate = rng.range(0.94, 1.08); song.snareRate = rng.range(0.95, 1.05);
song.hatAcc = accents(rng.pick(['9595959595959595', '9585958595859585', '9686968696869686', '9575957595759575']));
song.bassTimbre = first ? 'roll' : rng.weighted(['roll', 'pulse', 'reese'], [3, 2, 1.6]);
song.breakReese = rng.chance(0.5);
song.leadTimbre = first ? 'super' : rng.weighted(['duo', 'super', 'pwm'], [2, 2.2, 1.5]);
song.kit = { snare: first ? 0 : rng.int(0, 2), hat: first ? 0 : rng.int(0, 2), backbeat: first ? 'gated' : rng.weighted(['snare', 'layered', 'clap', 'gated'], [1.5, 2, 1.2, 2]) };
song.arp2 = arpVariant(rng, song.arp);
song.patch = first ? { ...DEFAULT_PATCH } : {
arp: rng.weighted(['sawsq', 'square', 'sawoct'], [2, 1.6, 1.6]), arpQ: rng.range(4, 9), arpDecay: rng.range(0.7, 1.4),
padDetune: rng.range(8, 18), chorusHz: rng.range(0.15, 0.4), padLP: rng.range(500, 900), kickBody: rng.range(0.07, 0.1), kickDrop: rng.range(0.025, 0.04),
};
song.choir = 0.5;
return finishSong(song, rng);
}
export function describeSong(song) {
return `#${song.index} ${song.keyName} [${song.form || 'classic'}${song.track ? ' · ' + song.track.id : ''} ${song.bpm} BPM ${song.feel}] ` +
song.sections.map((s) => `${s.type}:${s.bars}` + (s.kickVar ? '/' + s.kickVar : '') + (s.lift ? '/lift' : '') + (s.keyPc != null && s.keyPc !== song.keyPc ? '/+' + ((s.keyPc - song.keyPc + 12) % 12) : '')).join(' ') +
` · bass ${song.bassTimbre} · lead ${song.leadTimbre} · kit ${song.kit.snare}${song.kit.hat}${song.kit.backbeat[0]}` +
(song.patch ? ` · arp ${song.patch.arp} · pad ±${song.patch.padDetune.toFixed(0)}c/${song.patch.padLP.toFixed(0)} Hz · kick ${(song.patch.kickBody * 1000).toFixed(0)}/${(song.patch.kickDrop * 1000).toFixed(0)} ms` : '');
}
export { clamp, modeScale };
