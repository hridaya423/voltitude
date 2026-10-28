import { Rng, clamp, clamp01, voiceLead, bassMidi, subMidi, arpTones, noteName, chordSpec, mtof, pcAbove, nearestPc, tonicSpec, degMidi } from "@rl/js/music/theory.js";
import {
makeSong, sectionBase, chordAt, chordSpan, describeSong, BASS_HALF, menuArp, DEFAULT_PATCH, fitLine, LEAD_MAX,
hypeInPlace, cutCalm, shortenDrop, barsBefore, planSection, leadFrom, TOM_RUNS, dropArc, landDrop, VERSE_VEL,
activeBreak, refitBar,
} from "@rl/js/music/song.js";
import { HEAD, leadTonic } from "@rl/js/music/motif.js";
import { TRACKS, listing, keyLabel, createBag, drawCover as paintCoverInto, RING_BARS, ALBUM } from "@rl/js/music/playlist.js";
import { getKit } from "@rl/js/music/kit.js";
import { createMix } from "@rl/js/music/mix.js";
import { createVoices, createVoicesSteps, createFx } from "@rl/js/music/voices.js";
export { TRACKS, ALBUM } from "@rl/js/music/playlist.js";
export const MUSIC_BPM = 124;
export const MUSIC_STATES = ['menu', 'roam', 'replay'];
export const MUSIC_STINGERS = ['bank', 'bail', 'lineup', 'ramp', 'rampEnd', 'start', 'air'];
export const MUSIC_MODES = ['adaptive', 'listen', 'radio'];
export const REPEAT_MODES = ['off', 'all', 'one'];
export const drawCover = paintCoverInto;
const AIR_MENU = 0.02;
const DRUM_SCALE = { intro: 0.65, groove: 0.82, halftime: 0.8, drop: 1.12 };
const SECTION_GAIN = { intro: 0.78, groove: 0.8, halftime: 0.82, outro: 0.8, breakdown: 0.66, drop: 1.0 };
const BUILD_GAIN = 0.6;
const BUILD_START = 0.85;
const FINAL_MUSIC = 1.2;
const PAD_UNDER_LEAD = 0.95;
const PRE_FINAL_GAIN = 0.8;
const DROP_GAME = 0.95;
const SWING_DEFAULT = 0.545;
const CRUISE_BELOW = 0.22;
const CRUISE_BASE = 0.75;
const CRUISE = { pad: 0.58, drums: 1.0, bed: 0.94, buildCalm: 0, buildHot: 0.08 };
const ARP_UNDER_MAX = 79, ARP_UNDER_MIN = 67;
const ARP_OVER_LO = 84, ARP_OVER_HI = 88, ARP_OVER_GAIN = 1.0, ARP_OVER_HP = 1500;
const DROP_CRASH = 0.6;
const HANG_MAX_BARS = 8;
const MOTIF_PER_MIN = 3;
const AIR_CAP = 4;
const BRAAM_K = 0.20;
const BRAAM_GAP = 90;
const VICTORY_GAP = 120;
const FORCED_DROP_BARS = 96;
const LEIT_BELL = 0.55;
const MENU_DRONE_LP = 1.0;
const MENU_LEVEL = 1.25;
const MENU_DRONE = 0.17;
const MENU_STRINGS = 0.9;
const HALL = { menu: 0.5, breakdown: 0.35, replay: 0.3 };
const SEGUE_BPM = 8;
const REENTRY_SEC = 300;
const MENU_STATEMENT_EVERY = 32, MENU_TRACK_BARS = 96;
const LISTEN_I = 0.62;
const DROP_RUN_MAX = 32;
const POST_DROP_BARS = 32;
const HEAD_GAP_BARS = 24;
const CALL_LEVEL = 0.36;
const DROP_ACCENT = 1.26;
const GAP_LEVEL = 0.25;
const riserMidi = (c) => 58 + ((c.rootPc - 58) % 12 + 12) % 12;
const braamMidi = (pc) => 36 + ((pc - 36) % 12 + 12) % 12;
const pcOf = (m) => ((m % 12) + 12) % 12;
const droneMidi = (pc) => { let m = 31 + ((pc - 31) % 12 + 12) % 12; if (m > 36) m -= 12; return m; };
const TOM_RUN = 'h.h.hmm.m.mlmlLL';
export function landOnset(kit) {
if (kit._landOnset != null) return kit._landOnset;
let on = 0.012;
try {
const a = kit.impact.getChannelData(0), b = kit.subDrop.getChannelData(0), sr = kit.impact.sampleRate;
const n = Math.min(a.length, Math.floor(0.35 * sr));
let x = new Float32Array(n);
for (let i = 0; i < n; i++) x[i] = 0.75 * a[i] + (i < b.length ? 0.8 * b[i] : 0);
const lp = (src) => {
const w = 2 * Math.PI * 150 / sr, c = Math.cos(w), al = Math.sin(w) / (2 * 0.707), a0 = 1 + al;
const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
const y = new Float32Array(src.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
for (let i = 0; i < src.length; i++) { const v = b0 * src[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = src[i]; y2 = y1; y1 = v; y[i] = v; }
return y;
};
x = lp(lp(x));
let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(x[i]));
for (let i = 0; i < n; i++) if (Math.abs(x[i]) >= 0.5 * mx) { on = i / sr; break; }
} catch (e) {   }
kit._landOnset = on;
return on;
}
export function createMusic(ctx, destination, opts = {}) {
const it = createMusicSteps(ctx, destination, opts);
let r;
while (!(r = it.next()).done) {   }
return r.value;
}
export function* createMusicSteps(ctx, destination, opts = {}) {
let BPM = MUSIC_BPM, SPB = 60 / BPM, STEP = SPB / 4, BAR = SPB * 4;
const setTempo = (b) => { BPM = b; SPB = 60 / b; STEP = SPB / 4; BAR = SPB * 4; };
const LOOKAHEAD = opts.lookahead ?? 0.25;
const HIDDEN_LOOKAHEAD = Math.max(LOOKAHEAD, opts.hiddenLookahead ?? 2.0);
const QUICK_LOOKAHEAD = opts.manual ? LOOKAHEAD : Math.min(LOOKAHEAD, opts.quickLookahead ?? 0.12);
const INTERVAL = opts.interval ?? 25;
const manual = !!opts.manual;
const seed = (opts.seed ?? Math.floor(Math.random() * 4294967296)) >>> 0;
const rng = new Rng(seed);
const songRng = rng.fork();
const perf = rng.fork();
const rnd = () => perf.float();
const kit = getKit(ctx);
yield 'music.kit';
const CR = { ...CRUISE, ...(opts.cruise || {}) };
let volume = clamp(opts.volume ?? 0.8, 0, 1);
const mix = createMix(ctx, destination, kit, { debug: !!opts.debug, volume, bpm: BPM, clipOversample: opts.clipOversample, stingerDest: opts.stingerDest });
yield 'music.mix';
const fx = createFx(ctx, mix, kit);
yield 'music.fx';
const log = opts.log ? [] : null;
const TR = opts.tracks || TRACKS;
let mode = MUSIC_MODES.includes(opts.mode) ? opts.mode : 'adaptive';
let repeat = REPEAT_MODES.includes(opts.repeat) ? opts.repeat : 'all';
let shuffle = !!opts.shuffle;
const bag = createBag(TR.length, seed ^ 0x5bd1e995);
let trackIdx = (() => {
if (opts.track != null) { const i = TR.findIndex((t) => t.id === opts.track); if (i >= 0) return i; }
if (opts.form) { const i = TR.findIndex((t) => t.form === opts.form); if (i >= 0) return i; }
if (opts.seed == null && !opts.manual && opts.track == null && !opts.form && TR.length > 1 && opts.randomFirst !== false) {
const KEY = 'roadster.music.firstTrack';
const memo = typeof globalThis !== 'undefined' ? globalThis.__roadsterFirstTrack : null;
const mi = memo ? TR.findIndex((t) => t.id === memo) : -1;
if (mi >= 0) return mi;
let last = null;
try { last = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null; } catch { last = null; }
const pool = TR.map((t, i) => i).filter((i) => TR[i].id !== last);
const i = pool[Math.floor(Math.random() * pool.length)] ?? 0;
try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, TR[i].id); } catch {   }
if (typeof globalThis !== 'undefined') globalThis.__roadsterFirstTrack = TR[i].id;
return i;
}
return 0;
})();
const history = [];
const listeners = new Set();
const notifyQ = [];
const plays = new Map();
let voices = null, preVoices = null;
let running = false, disposed = false, timer = null, stopAt = 0, paused = false;
let t0 = 0, nextStep = 0;
const anchors = [];
let state = MUSIC_STATES.includes(opts.state) ? opts.state : 'menu';
let pending = null;
let roll = null;
let trackSwitch = null;
let immediate = null;
let iTarget = 0, iSm = 0, energy = 0.12;
let muted = false, mutedAt = 0;
let quiet = false;
let songIdx = 0;
let song = newSong(trackIdx, 0, null);
played(song);
yield 'music.song';
let upcoming = null;
let K = null;
let bassTimbreNow = null, pendingLead = null;
let rampH = null, rampSwell = null;
let secIdx = 0, secBar = -1;
let sec = song.sections[0];
let chord = chordAt(sec, 0), voicing = null, chordEnd = 0;
let arpPos = 0, menuBar = -1, replayBar = -1, replayAt = -1, replayEnd = Infinity;
let menuSet = 0, mArp = null, menuLine = null, menuPivot = false;
let fill = null, approach = null, leadOn = false, leadHeld = false, leadHoldEnd = 0, choirBed = 0;
let bdHoldEnd = 0, kickOut = false;
let highBars = 0, busyBars = 0, idleBars = 0, activeBars = 0, hypeCooldown = 0, jumpTo = -1;
let thin = 0;
let blackout = null;
let pivotOn = false;
let ended = false;
let airIn = 0, airSince = -1, airOn = false, padAir = 0;
const layers = { arp: false, clap: false, hats16: false, openHat: false, shaker: false, gate: false, ghost: false };
let menuListen = false;
let ring = null;
let hang = null;
const ovr = [];
let leadMuteUntil = 0;
let memory = null;
let pressed = false;
let resumeBar = 0, entryKind = null, dropsSinceEntry = 0;
let tomCount = 0, fillRun = null;
const impacts = [];
let featureUntil = 0;
let arpDipOn = false, choirDipOn = false;
let offGrid = 0;
const lastStinger = Object.create(null);
const marks = [];
const motifTimes = [];
let figureAt = -Infinity;
let bankRot = 0;
const leadHist = [];
let airRiser = null;
let barT = 0;
const heard = [];
let lastBraam = -Infinity, firstDropDone = false, dropSigN = 0, plainLands = 0;
let lastVictory = -Infinity, victories = 0;
let pendingLand = null;
let landing = null;
let forcedDropBars = 0;
const landTimes = [];
let iFloorUntil = 0;
let hypeReq = false;
let flightT0 = -1;
let leadResumeAt = -1;
let segue = null;
let phaseJump = null;
let callHP = false;
let iRaw = 0;
let gapPrev = false;
let dropRun = 0, postDrop = 999;
let roamBars = 0, lastHeadAt = -999;
let featCall = null;
let arpLPOn = false, choirLiftNow = false, choirLDOn = false, lastDownOct = false, lastDownChord = null;
let airTrimOn = false, padHiDipOn = false;
const LAND_ONSET = opts.landOnset ?? landOnset(kit);
const TAIKO_ONSET = opts.taikoOnset ?? 0.008;
let secRiser = null;
let airAccent = null;
let arpOverOn = 550;
const gameBag = createBag(TR.length, (seed ^ 0x2545f491) >>> 0);
let sessionOrder = false;
const gameOrder = () => ((mode === 'adaptive' && !menuListen) || (sessionOrder && mode === 'listen')) && TR.length > 2;
const listenRules = () => mode !== 'adaptive' || menuListen;
const trk = () => (song && song.track) || {};
function newSong(idx, index, prevKey) {
if (idx < 0) return makeSong(songRng.fork(), index, prevKey, { form: index === 0 ? opts.form : undefined });
return makeSong(null, index, prevKey, { track: TR[idx], play: plays.get(TR[idx].id) || 0 });
}
function played(s) { if (s && s.track) plays.set(s.track.id, (plays.get(s.track.id) || 0) + 1); }
const hit = (buf, t, o) => (quiet ? null : fx.hit(buf, t, o));
const listenNow = () => mode === 'listen' || menuListen;
const subOf = (root) => (song.sub ? (root - 12 >= (song.sub.lo ?? 28) ? root - 12 : root) : subMidi(root));
const shufDup = (sib, third) => song.feel === 'shuffle' && (sib & 3) === 3 && !!third;
const stepT = (k) => (song.feel === 'shuffle' ? Math.floor(k / 4) * SPB + [0, SPB / 3, 2 * SPB / 3, 2 * SPB / 3][k & 3] : k * STEP);
function og(at) {
if (song.feel === 'shuffle' && state === 'roam') {
const x = (at - t0) / (SPB / 3);
if (Math.abs(x - Math.round(x)) > 1e-6) offGrid++;
}
return at;
}
function impactOK(t) {
while (impacts.length && impacts[0] < t - 4) impacts.shift();
if (impacts.some((x) => Math.abs(x - t) < 0.06)) return false;
impacts.push(t); impacts.sort((a, b) => a - b);
return true;
}
const inHang = (t) => hang && t >= hang.a - 1e-4 && t < hang.b - 1e-4;
const hangBarAt = (t) => Math.max(0, Math.floor((t - hang.a) / BAR + 1e-3)) + 1;
function motifOK(t, prio = 'call') {
if (listenNow() || state !== 'roam') return true;
while (motifTimes.length && motifTimes[0] < t - 60) motifTimes.shift();
return motifTimes.length < (prio === 'lineup' ? MOTIF_PER_MIN : MOTIF_PER_MIN - 1);
}
function logTheme(t, motif, via, o = {}, budget = true) {
if (motif && budget && state === 'roam' && !listenNow()) { motifTimes.push(t); if (motifTimes.length > 16) motifTimes.shift(); }
lg({ t, ev: motif ? 'motif' : 'hook', via, ...o, ...(motif && !budget ? { free: 1 } : {}) });
}
const leadAt = (t) => { for (let i = leadHist.length - 1; i >= 0; i--) { const n = leadHist[i]; if (t >= n.t - 1e-3 && t < n.end) return n.midi; } return null; };
function leadIdx() {
const L = leadLine();
const ik = L === sec.leadNotesL ? 'leadIndexL' : 'leadIndex';
return sec[ik] || (sec[ik] = new Map(L.map((n, i) => [n.step, i])));
}
function leadNow(t, step) {
if (state !== 'roam' || !sec || secBar < 0) return leadAt(t);
if (!leadOn || t < leadMuteUntil - 1e-4) return leadAt(t);
const L = leadLine(), idx = leadIdx();
for (let k = step; k >= 0 && k > step - 48; k--) {
const i = idx.get(k);
if (i != null) { const n = L[i]; return k + n.len > step ? pic(n.midi, t) : leadAt(t); }
}
return leadAt(t);
}
const clashIc = (a, b) => b != null && [1, 6, 11].includes(((a - b) % 12 + 12) % 12);
function dropRole(s2 = sec, b = secBar) {
if (state !== 'roam' || !s2 || s2.type !== 'drop' || s2.cruise || b < 0) return null;
if (s2.bars >= 32) { const ph = (b >> 3) & 3; if (ph === 2) return 'dbk'; if (ph === 3) return 'peak'; return ph === 1 ? 'lift' : null; }
return s2.bars >= 16 && b % 16 >= 8 ? 'lift' : null;
}
function dropDownbeats() {
const out = [];
if (state !== 'roam' || !sec || secBar < 0) return out;
if (sec.type === 'drop') out.push(barT - secBar * BAR);
const nx = song.sections[jumpTo >= 0 ? jumpTo : secIdx + 1];
if (nx && nx.type === 'drop') out.push(barT + (sec.bars - secBar) * BAR);
return out;
}
function cancelAirRiser(t) {
if (!airRiser) return;
const a = airRiser; airRiser = null;
const tc = Math.max(t, ctx.currentTime);
if (a.riser) a.riser.cancel(tc);
if (a.choir) a.choir.release(tc);
mix.airUndip(tc);
if (a.crash && a.crash._gn) { const g = a.crash._gn.gain; if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(tc); else g.cancelScheduledValues(tc); g.setTargetAtTime(0, tc, 0.015); try { a.crash.stop(tc + 0.12); } catch (e) {   } }
lg({ t: tc, ev: 'airCancel' });
}
function override(t, until, c) {
for (const o of ovr) if (o.until > t) o.until = t;
const o = { t, until, chord: c, applied: false };
ovr.push(o);
if (ovr.length > 8) ovr.shift();
if (voices && t < horizonT() + 1e-6) applyOverride(o);
return o;
}
function applyOverride(o) {
o.applied = true;
if (pivotOn) return;
setChord(o.chord, o.t, Math.max(0.25, (o.until - o.t) / BAR), leadOn);
syncChoir(o.t, true);
lg({ t: o.t, ev: 'bar', sec: 'override', chord: chord.label, pcs: chord.pcs, sc: chord.scale, h: chord.harmonic, key: chord.keyPc, st: STEP, until: o.until, ov: o });
}
const ovrAt = (t) => { for (let i = ovr.length - 1; i >= 0; i--) { const o = ovr[i]; if (t >= o.t - 1e-4 && t < o.until - 1e-4) return o; } return null; };
function muteLead(t, until) {
if (voices) voices.lead.cut(t);
leadHeld = false;
if (leadOn) { leadOn = false; mix.leadDip(t, false); }
leadMuteUntil = Math.max(leadMuteUntil, until);
for (const n of leadHist) if (n.end > t) { n.end = Math.max(n.t, t); if (n.log) n.log.d = +Math.max(0, t - n.t).toFixed(4); }
for (const c of counterLive) if (c.end > t) { if (c.h) c.h.stop(t); c.end = Math.max(c.t, t); if (c.log) c.log.d = +Math.max(0, t - c.t).toFixed(4); }
if (sec && sec.activeCall) sec.activeCall = null;
}
const counterLive = [];
function pic(m, t) {
const o = ovrAt(t);
if (!o || !o.major) return m;
return pcOf(m - o.chord.rootPc) === 3 ? m + 1 : m;
}
function leitmotif(notes, level, o = {}) {
if (!notes.length || quiet) return [];
const hs = [];
hs.push(fx.figure(notes, level, { oct: true, rel: o.rel ?? 0.25, dest: o.dest, dly: o.dly }));
for (const n of notes) hs.push(fx.bell(n.t, n.m, Math.max(STEP, n.dur), level * LEIT_BELL * (n.v ?? 1), { rev: 0.4, dly: 0.22, dest: o.bellDest || (o.dest ? o.dest : undefined) }));
return hs.filter(Boolean);
}
function segueFor(ok, om, ns) {
const d = ((ns.keyPc - ok) % 12 + 12) % 12;
if (d === 6) return { kind: 'bridge', chord: null };
if (d === 5 || d === 9) return { kind: 'common', chord: chordSpec(ok, tonicSpec(om), om), tone: ok };
if (d === 4) return { kind: 'mediant', chord: chordSpec(ns.keyPc, 'bVI', 'aeolian') };
if (d === 8) return { kind: 'relative', chord: chordSpec(ok, 'III', 'aeolian') };
return { kind: 'V', chord: chordSpec(ns.keyPc, 'V', ns.mode) };
}
function segueExtras(sg, t, len, ns) {
if (quiet || muted) return;
if (sg.kind === 'common') fx.choir(t, [pcAbove(sg.tone, 62), pcAbove(sg.tone, 62) + 12], len + 0.6 * BAR, 0.2, 'oo', 0.5, 1.1, mix.choirIn);
else if (sg.kind === 'bridge') {
segue.riser = fx.riser(t, len, 0.22, { f0: 250, f1: 5000, midi: riserMidi(chordSpec(ns.keyPc, 'V', ns.mode)), pitched: 0.25 });
const rd = Math.min(len, kit.crashRev.duration);
fx.hit(kit.crashRev, t + len - rd, { bus: 'cym', gain: 0.3, offset: kit.crashRev.duration - rd });
}
}
function dropSig(s2, t) {
if ((!firstDropDone || s2.final) && braamOK(t)) { firstDropDone = true; lastBraam = t; return 'braam'; }
firstDropDone = true;
return (dropSigN++ & 1) ? 'slam' : 'taiko';
}
function playSig(t, sig, ig, bm, dest) {
if (quiet) return [];
const out = [];
if (sig === 'braam') { out.push(fx.braam(t, bm, BRAAM_K * ig, 2.5, dest)); lastBraam = t; lg({ t, ev: 'braam', m: bm }); }
else if (sig === 'taiko') {
out.push(fx.hit(kit.tomL, t, { bus: dest === fx.buses.st ? 'st' : 'fx', gain: 1.2 * Math.min(1, ig / 0.42), rate: 0.62, priority: true }));
out.push(fx.hit(kit.tomM, t + 0.004, { bus: dest === fx.buses.st ? 'st' : 'fx', gain: 0.45 * Math.min(1, ig / 0.42), rate: 0.55 }));
} else if (sig === 'slam') {
out.push(fx.hit(K.sv.snareGated, t, { bus: 'snare', gain: 0.9, rate: song.snareRate * 0.96, priority: true }));
out.push(fx.hit(kit.crash, t, { bus: 'cym', gain: 0.28, rate: 0.94 }));
}
lg({ t, ev: 'dropSig', sig });
return out.filter(Boolean);
}
const braamOK = (t) => t - lastBraam >= BRAAM_GAP;
const patchOf = (s) => s.patch || DEFAULT_PATCH;
const kick = () => { const p = patchOf(song); return kit.kick(song.kickHz, p.kickBody, p.kickDrop); };
const inBlackout = (t, kind) => blackout && t >= blackout.a - 1e-4 && t < blackout.b - 1e-4 && (!kind || !blackout.kinds || blackout.kinds.includes(kind));
function kickAt(t, gain, depth, rel = 0.075, bassPump = null, subHold = null) {
if (quiet || inBlackout(t, 'kick')) return;
const kb = kick();
fx.hit(kb, og(t), { bus: 'kick', gain: gain * (song.kickTrim ? Math.pow(10, song.kickTrim / 20) : 1), priority: true });
mix.pump(t, depth, rel, bassPump);
if (song.choir >= 1 && state === 'roam' && sec.type === 'drop' && choirOn > 0) mix.choirPump(t, 0.3);
mix.subDuck(t, 0.85, subHold ?? (state === 'roam' && sec.type === 'drop' ? 0.085 : 0.07), 0.035, bassPump && bassPump.subPre ? bassPump.pre : 0);
if (state === 'roam' && sec.type === 'intro') mix.bassDip(t, 3, 0.08);
voices.bass.kickSync(t, kb);
}
function songKit() {
const sv = kit.snareV(song.kit.snare), hv = kit.hatV(song.kit.hat);
K = { snare: sv.snare, snareClap: sv.snareClap, clap: kit.clap, hatC: hv.hatC, hatShk: hv.hatShk, backbeat: song.kit.backbeat, sv };
}
songKit();
function bassTimbre(t, name, tau = 0.04) {
if (!voices || name === bassTimbreNow) return;
bassTimbreNow = name;
voices.bass.timbre(t, name, tau);
}
const roamBassTimbre = () => ((sec.type === 'breakdown' && song.breakReese) || sec.type === 'halftime' ? 'reese' : song.bassTimbre);
function songVoices(t) {
bassTimbre(t, state === 'menu' ? 'drone' : song.bassTimbre);
voices.arp.patch(t, patchOf(song)); voices.pad.patch(t, patchOf(song));
pendingLead = { name: song.leadTimbre, at: t };
songMix(t);
}
function songMix(t) {
const T = trk();
mix.trackEQ(t, { air: sectionAir(), lowShelf: song.lowShelf || 0, lowShelfHz: song.lowShelfHz || 50, body: song.body ?? 2.5, presence: song.presence || 0, top: song.top || 0, padLow: song.padLow || 0,
leadMid: T.leadMid || 0, leadPres: T.leadPres || 0, padMid: T.padMid || 0, choirPres: song.choir >= 1 ? 2 : 0,
lowMid450: T.lowMid450 ?? 1.5 });
if (voices) { voices.bass.subTrim(song.sub ? song.sub.db || 0 : 0); voices.bass.sub2(song.sub2 ?? 0.5); voices.lead.setRelease(song.leadRel || 0.055); voices.lead.trim(t, song.leadTrim || 0); }
}
const choirNotes = () => (voicing || [57, 61, 64, 69]).map((m) => (m < 57 ? m + 12 : m));
function sectionAir() {
const a = song.air || 0;
if (a <= 0) return a;
const ty = state === 'roam' && sec ? sec.type : 'menu';
return ty === 'groove' || ty === 'drop' || ty === 'halftime' ? Math.min(AIR_CAP, a) : 0;
}
const audible = () => ctx.currentTime - (ctx.outputLatency || 0) - mix.latency;
const nextGrid = (time, grid) => t0 + Math.ceil((time - t0) / grid - 1e-6) * grid;
const horizonT = () => t0 + nextStep * STEP;
const trackOf = (s) => s.track || null;
const trimDb = (s) => (s.track ? (s.track.gainDb ?? 0) - (s.track.sub40 ? 0.3 : 0) - (mode === 'listen' ? 0 : TR[0].gainDb ?? 0) : 0);
function swingT(sib) {
if (song.feel === 'shuffle') return [0, SPB / 12, SPB / 6, -SPB / 12][sib & 3];
return (sib & 1) ? ((song.swing ?? SWING_DEFAULT) - 0.5) * 2 * STEP : 0;
}
function anchorAt(t, bpm) {
const prev = anchors[anchors.length - 1];
const bar0 = prev ? prev.bar0 + Math.max(0, Math.ceil((t - prev.t) / prev.BAR - 1e-6)) : 0;
setTempo(bpm);
t0 = t; nextStep = 0;
anchors.push({ t, bar0, BAR, SPB, bpm });
if (anchors.length > 24) anchors.shift();
}
function clockAt(a) {
let an = anchors[0];
for (let i = anchors.length - 1; i >= 0; i--) if (anchors[i].t <= a + 1e-9) { an = anchors[i]; break; }
return an;
}
function mark(t, o) { marks.push({ t, ...o }); if (marks.length > 64) marks.shift(); }
function notify(at, info) {
const ev = { at, info };
if (!manual && typeof setTimeout === 'function') {
const ms = Math.max(0, (at + (ctx.outputLatency || 0) + mix.latency - ctx.currentTime) * 1000);
setTimeout(() => { heardNow(info); for (const cb of listeners) { try { cb(info); } catch (e) {   } } }, ms);
} else notifyQ.push(ev);
}
function trackInfo(s = song) {
const t = trackOf(s);
if (!t) return { id: 'radio-' + s.index, title: 'Night Session ' + (s.index + 1), artist: 'Launch Night Radio', album: ALBUM, accent: '#ffffff', bpm: s.bpm, key: s.keyName, durationSec: null, index: -1 };
return { id: t.id, title: t.title, artist: t.artist, album: ALBUM, accent: t.accent || '#ffffff', bpm: t.bpm, key: keyLabel(t), durationSec: mode === 'radio' ? null : +(s.totalBars * 240 / s.bpm).toFixed(2), index: TR.indexOf(t) };
}
const brief = (i) => (i == null || i < 0 || !TR[i] ? null : { id: TR[i].id, title: TR[i].title, artist: TR[i].artist });
function heardNow(info) {
if (!info || info.index == null || info.index < 0) return;
const playedAt = typeof Date !== 'undefined' ? Date.now() : 0;
if (heard.length && heard[0].id === info.id) { heard[0].playedAt = playedAt; return; }
heard.unshift({ id: info.id, title: info.title, artist: info.artist, playedAt });
if (heard.length > 50) heard.pop();
}
function peekNext() {
if (upcoming) return upcoming.idx;
if (mode === 'radio') return -1;
if (gameOrder() && trackIdx >= 0) return gameBag.peek(trackIdx);
if (repeat === 'one') return trackIdx;
if (shuffle) return bag.peek(trackIdx);
const n = trackIdx + 1;
return n >= TR.length ? (repeat === 'off' ? null : 0) : n;
}
function queueIdx(k) {
const out = [];
let cur = trackSwitch && trackSwitch.idx != null ? trackSwitch.idx : trackIdx;
if (mode === 'radio') return out;
if (upcoming && !trackSwitch) { if (upcoming.idx == null) return out; out.push(upcoming.idx); cur = upcoming.idx; }
while (out.length < k) {
if (gameOrder() && cur >= 0) { out.push(...gameBag.queue(cur, k - out.length).slice(out.length ? 0 : 0)); break; }
if (repeat === 'one') { out.push(cur); continue; }
if (shuffle) { out.push(...bag.queue(cur, k - out.length)); break; }
const n = cur + 1;
if (n >= TR.length) { if (repeat === 'off') break; cur = 0; } else cur = n;
out.push(cur);
}
return out.slice(0, k);
}
function ringFor(s = song) {
if (!s || !s.track || mode === 'radio') return false;
if (s.activeExit) return false;
if (listenNow()) return true;
const nx = peekNext();
if (nx == null || nx < 0) return nx == null;
return Math.abs(TR[nx].bpm - s.bpm) > SEGUE_BPM;
}
const refreshRing = () => { if (song) song.ringOut = ringFor(song); };
function nextIndex(cur, reason) {
if (mode === 'radio' && reason === 'end') return -1;
if (gameOrder() && cur >= 0 && !(sessionOrder && reason === 'end' && repeat === 'one')) return gameBag.next(cur);
if (reason === 'end' && repeat === 'one' && cur >= 0) return cur;
if (shuffle) return bag.next(cur);
const n = cur < 0 ? 0 : cur + 1;
if (n >= TR.length) return repeat === 'off' && reason === 'end' && listenRules() ? null : 0;
return n;
}
function loadTrack(idx, t, o = {}) {
if (song && o.reason !== 'prev' && o.reason !== 'restart') history.push(trackIdx);
if (history.length > 64) history.shift();
songIdx++;
const prevKey = song ? song.endKeyPc : null;
song = o.song || newSong(idx, songIdx, prevKey);
played(song);
trackIdx = idx;
upcoming = null; menuPivot = false; pivotOn = false; jumpTo = -1; ring = null; ovr.length = 0; hang = null; leadMuteUntil = 0;
mix.hpReset(t, 0.06); mix.undip(t, 0.06); mix.subBoost(t, 0);
if (secRiser) { secRiser.cancel(Math.max(ctx.currentTime, t - 0.06)); secRiser = null; }
cancelAirRiser(Math.max(ctx.currentTime, t - 0.06));
anchorAt(t, song.bpm);
mix.setBpm(t, song.bpm);
mix.setTrackGain(t, trimDb(song), o.cold || o.now ? 0.05 : BAR * 2 / 3);
songKit();
if (voices) songVoices(t);
secIdx = 0; secBar = -1; sec = song.sections[0];
if (state === 'roam' && o.entry != null) secIdx = o.entry === 'auto' ? entrySection() : o.entry;
menuBar = -1; menuLine = null;
refreshRing();
if (o.hits && !quiet) {
if (impactOK(t)) hit(kit.impact, t, { bus: 'fx', gain: 0.38, priority: true });
hit(kit.crash, t, { bus: 'cym', gain: 0.4, priority: true });
}
const from = state === 'roam' ? barsBefore(song, secIdx) : 0;
lg({ t, ev: 'song', desc: describeSong(song), track: song.id || null, reason: o.reason || 'end', key: song.keyPc, bpm: song.bpm, dur: (song.totalBars - from) * 240 / song.bpm, entry: secIdx || undefined });
if (!o.notified) notify(t, { ...trackInfo(song), reason: o.reason || 'end' });
segue = null; phaseJump = null; pendingLand = null; landing = null;
}
function songEnded(t) {
const nx = upcoming ? upcoming.idx : nextIndex(trackIdx, 'end');
if (nx === null) {
lg({ t, ev: 'end' });
ended = true;
api.stop(2);
upcoming = null;
secIdx = 0; secBar = -1; sec = song.sections[0];
return false;
}
const active = song.activeExit && state === 'roam' && mode === 'adaptive';
loadTrack(nx, t, { song: upcoming ? upcoming.song : null, reason: 'end', entry: active ? 'auto' : null, hits: active, notified: ringNotified });
ringNotified = false;
return true;
}
function prepareNext() {
const idx = nextIndex(trackIdx, 'end');
if (idx === null) { upcoming = { idx: null, song: null }; return; }
upcoming = { idx, song: newSong(idx, songIdx + 1, song.endKeyPc) };
const s = upcoming.song;
kit.snareV(s.kit.snare); kit.hatV(s.kit.hat);
const p = patchOf(s); kit.kick(s.kickHz, p.kickBody, p.kickDrop);
}
function requestTrack(idx, reason) {
if (!running) {
trackIdx = idx; songIdx++; song = newSong(idx, songIdx, song ? song.endKeyPc : null); played(song); secIdx = 0; secBar = -1; sec = song.sections[0]; jumpTo = -1;
setTempo(song.bpm); songKit(); menuBar = -1; menuLine = null; upcoming = null; ring = null; refreshRing();
notify(ctx.currentTime, { ...trackInfo(song), reason });
return;
}
if (state === 'replay') { trackSwitch = { idx, reason }; return; }
const h = horizonT();
const quick = mode === 'listen' || menuListen || state === 'menu';
if (quick && opts.immediateSwitch !== false) {
const ns = newSong(idx, songIdx + 1, song.endKeyPc);
trackSwitch = { idx, reason, t: h, song: ns, listen: state === 'menu' && !menuListen, beat: true, now: true };
immediate = { song: ns, until: h };
mix.setTrackGain(ctx.currentTime, -40, 0.03);
lg({ t: ctx.currentTime, ev: 'switchNow', to: idx, at: h });
return;
}
let barT = quick ? nextGrid(h + 0.02, SPB) : nextGrid(h + 0.02, BAR);
if (quick && barT - h < SPB / 3) barT += SPB;
const ns = newSong(idx, songIdx + 1, song.endKeyPc);
trackSwitch = { idx, reason, t: barT, song: ns, listen: state === 'menu' && !menuListen, beat: quick };
if (!quiet && !muted) {
const rd = Math.min(quick ? SPB : 2 * SPB, barT - h);
if (rd > 0.08) hit(kit.crashRev, barT - rd, { bus: 'cym', gain: 0.3, offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6, priority: true });
const beatT = nextGrid(h + 0.01, SPB);
if (!quick && barT - beatT >= SPB - 1e-3) {
const sg = ns.keyPc === song.endKeyPc || ns.keyPc === (sec.keyPc ?? song.keyPc) ? { kind: 'V', chord: chordSpec(ns.keyPc, 'V', ns.mode) } : segueFor(sec.keyPc ?? song.keyPc, sec.mode || song.mode, ns);
trackSwitch.pivot = { t: beatT, chord: sg.chord, kind: sg.kind, tone: sg.tone, from: sec.keyPc ?? song.keyPc };
}
}
}
function setChord(c, t, chordBars, lead = leadOn) {
chordEnd = t + chordBars * BAR;
const verse = lead && state === 'roam' && sec && (sec.type === 'groove' || sec.type === 'halftime');
const hi = verse ? Math.max(57, Math.min(69, (sec.leadLow ?? 72) - 3)) : lead ? Math.max(62, Math.min(69, (sec.leadLow ?? 72) - 3)) : 76;
if (c === chord && voicing && voicing[3] <= hi) return false;
chord = c;
voicing = voiceLead(voicing, c, lead ? Math.min(52, hi - 14) : 52, hi);
const ambient = state === 'menu' || (state === 'roam' && sec.type === 'breakdown');
voices.pad.chord(t, voicing, ambient ? 0.012 : 0.003);
voices.organ.chord(t, voicing);
return true;
}
let choirOn = 0;
function syncChoir(t, chordChanged) {
if (!voices) return;
const lvl = choirBed > 0.15 && !quiet ? choirBed : 0;
const c = voices.choir;
if (lvl > 0) {
if (chordChanged || !choirOn) c.chord(t, choirNotes(), choirOn ? 0.025 : 0.001);
c.vowel(t, energy > 0.3 ? 'ah' : 'oo');
c.drift(t, rnd);
if (!choirOn) c.level(t, lvl, 0.05); else if (Math.abs(lvl - choirOn) > 0.01) c.level(t, lvl, 0.2);
} else if (choirOn) c.level(t, 0, 0.2);
choirOn = lvl;
}
const logNotes = opts.log !== 'events';
let loggedNotes = 0;
function lg(o) {
if (!log) return;
if (o.v) { if (logNotes && loggedNotes < 40000) { loggedNotes++; log.push(o); } }
else if (log.length < 100000) log.push(o);
}
const entrySection = () => { const i = song.sections.findIndex((s) => s.type === 'groove' || s.type === 'halftime' || s.type === 'build'); return i < 0 ? 0 : i; };
function applyState(name, t, o = {}) {
const from = state;
if (from === 'roam' && name === 'menu' && secBar >= 0) memory = { song, secIdx, secBar, at: t };
state = name;
pending = null;
if (ring && name !== 'roam') ring = null;
hang = null; ovr.length = 0; leadMuteUntil = 0;
if (blackout && blackout.b > t) { blackout = null; mix.unblackout(t); }
if (leadHeld) { voices.lead.release(t); leadHeld = false; }
if (leadOn) { leadOn = false; mix.leadDip(t, false); }
voices.lead.octave(t, false);
if (name !== 'menu') { voices.drone.level(t, 0, 0.6); voices.strings.level(t, 0, 0.5); }
cancelAirRiser(t);
if (airOn) { airOn = false; mix.air(t, false); padAir = 0; }
bassTimbre(t, name === 'menu' ? 'drone' : roamBassTimbre(), 0.3);
mix.hpReset(t); mix.subBoost(t, 0);
if (from === 'replay') replayEnd = t;
if (name === 'replay') {
replayBar = -1; replayAt = t; replayEnd = Infinity;
mix.space(t, 1.7);
hit(kit.crash, t, { bus: 'cym', gain: 0.5, priority: true });
if (!o.crashOnly) hit(kit.impact, t, { bus: 'fx', gain: 0.42, priority: true });
} else if (name === 'menu') {
mix.space(t, 1.35);
menuBar = -1; menuLine = null;
mix.setTrackGain(t, trimDb(song), 0.6);
} else {
mix.space(t, 1);
if (from === 'menu' && o.listen) {
secIdx = 0; secBar = -1; sec = song.sections[0];
} else if (from === 'menu') {
const m = memory; memory = null;
resumeBar = 0;
if (pressed && m && m.song === song && t - m.at <= REENTRY_SEC) {
let si = m.secIdx, sb = m.secBar < 4 ? 0 : Math.ceil((m.secBar + 1) / 4) * 4;
if (sb >= song.sections[si].bars) { si = Math.min(si + 1, song.sections.length - 1); sb = 0; }
secIdx = si; resumeBar = sb;
entryKind = 'resume';
} else {
secIdx = entrySection(); entryKind = pressed ? 'reentry' : 'first';
const es = song.sections[secIdx];
if (entryKind === 'first' && (es.type === 'groove' || es.type === 'halftime') && es.bars >= 16) resumeBar = 12;
}
secBar = -1; sec = song.sections[secIdx];
pressed = true; dropsSinceEntry = 0;
o.fromMenu = true;
} else if (from === 'replay') {
hit(kit.crash, t, { bus: 'cym', gain: 0.35, priority: true });
}
}
if (name !== 'roam') { choirBed = 0; syncChoir(t, false); }
if (name === 'menu') voices.lead.park(t + 0.5);
enterFromMenu = !!o.fromMenu;
refreshRing();
lg({ t, ev: 'state', from, to: name, kind: o.fromMenu ? entryKind : o.listen ? 'listen' : undefined });
}
let enterFromMenu = false;
const gSteps = { hats16: false, arp: false, shaker: false };
let groove2 = 0, groove3 = 0, drumTopF = 20000;
function onBeat(t, sib) {
iSm += (iTarget - iSm) * (iTarget > iSm ? 0.7 : 0.17);
iRaw += (iTarget - iRaw) * (iTarget > iRaw ? 0.7 : 0.17);
if (t < iFloorUntil && state === 'roam') iSm = Math.max(iSm, 0.6);
const listen = listenNow();
const I = listen ? LISTEN_I : iSm;
const cruise = state === 'roam' && sec.type === 'drop' && !!sec.cruise;
if (state === 'roam' && secBar >= 0) {
const base = cruise ? CRUISE_BASE : sectionBase(sec.type, (secBar + sib / 16) / sec.bars);
energy = clamp01(base * 0.7 + I * 0.5);
} else if (state === 'replay') energy = clamp01(0.55 + iSm * 0.45);
else energy = 0.12;
const hy = (k, on, off) => { layers[k] = layers[k] ? energy >= off : energy >= on; };
hy('clap', 0.3, 0.25); hy('arp', 0.36, 0.3); hy('hats16', 0.5, 0.44); hy('gate', cruise ? 0.85 : 0.6, cruise ? 0.78 : 0.53);
hy('openHat', 0.63, 0.56); hy('ghost', 0.4, 0.35); hy('shaker', 0.8, 0.72);
groove2 = 0; groove3 = 0;
if (state === 'roam' && !listen && (sec.type === 'groove' || sec.type === 'halftime') && secBar >= 0) {
const st = (k, on, off) => { gSteps[k] = gSteps[k] ? I >= off : I >= on; if (gSteps[k]) layers[k] = true; return gSteps[k]; };
st('hats16', 0.13, 0.1);
if (st('arp', 0.23, 0.19)) groove2 = 1;
if (st('shaker', 0.28, 0.24)) groove3 = 1;
}
if (state === 'roam' && sec.type === 'drop' && sec.final && !sec.cruise && secBar >= sec.bars - 4) layers.hats16 = true;
const role = dropRole();
if (role === 'dbk') { layers.hats16 = false; layers.shaker = false; layers.openHat = false; layers.arp = false; layers.gate = true; }
if (state === 'roam' && sec && sec.active) { layers.arp = false; layers.gate = false; layers.shaker = false; layers.openHat = false; }
if (state === 'roam' && secBar >= 0 && role !== 'dbk') {
const b16 = secBar % 16;
if (sec.type === 'drop' && !sec.cruise) {
if (secBar === 0) { layers.gate = true; layers.openHat = true; layers.hats16 = true; layers.shaker = true; }
else if (sec.bars >= 16 && b16 < 8 && !(sec.final && secBar >= sec.bars - 4)) { layers.hats16 = false; layers.shaker = false; }
if (sec.bars >= 16 && b16 >= 8) {
if (b16 < 12) layers.gate = false;
layers.hats16 = true;
if (b16 >= 12) layers.shaker = true;
}
} else if ((sec.type === 'groove' || sec.type === 'halftime') && sec.bars >= 16 && secBar < 8) {
if (listen) { layers.hats16 = false; layers.shaker = false; }
if (listen || iSm < 0.45) layers.arp = false;
} else if ((sec.type === 'groove' || sec.type === 'halftime') && sec.bars >= 16 && listen) {
layers.hats16 = true; layers.shaker = true;
}
}
const v = voices;
v.pad.drift(t);
const atrim = state === 'roam' && (layers.hats16 || layers.shaker);
if (atrim !== airTrimOn) { airTrimOn = atrim; mix.drumAirTrim(t, atrim ? -1.5 : 0); }
if (ring) {
const end = t >= ring.t + BAR - 1e-4;
v.pad.level(t, end ? 0 : 0.62, end ? 0.12 : 0.3);
v.bass.upper(t, 0); v.air(t, 0); v.organ.level(t, 0, 0.2);
mix.sectionLevel(t, SECTION_GAIN.outro, 0.3); mix.musicLevel(t, 1, 0.3); mix.hall(t, 0.3);
if (arpDipOn) { arpDipOn = false; mix.arpDip(t, false); }
if (padHiDipOn) { padHiDipOn = false; mix.padHiDip(t, 0); }
return;
}
if (state === 'menu') {
const ph = 2 * Math.PI * (Math.max(0, menuBar) + sib / 16) / 32;
v.pad.level(t, 0.62, 0.6); v.pad.cutoff(t, 1450 + 0.8 * (patchOf(song).padLP - 650), 0.8); v.pad.width(t, 0.5, 0.6); v.pad.chorus(t, 0.3);
v.arp.sends(t, 0.3, 0.42); v.pad.sends(t, 0.3);
v.arp.shimmer(t, 0.08 * (1 + 0.3 * Math.sin(ph + 2.2))); v.air(t, AIR_MENU * (1 + 0.3 * Math.sin(ph)));
v.bass.upper(t, 0); v.organ.level(t, 0, 0.3);
const m8 = ((Math.max(0, menuBar) % 8) + sib / 16) / 8, s8 = Math.pow(Math.sin(Math.PI * m8), 2);
mix.sectionLevel(t, MENU_LEVEL * (0.78 + 0.22 * s8), 0.5); mix.musicLevel(t, 1, 0.5);
mix.hall(t, HALL.menu);
const mb = (Math.max(0, menuBar) % MENU_STATEMENT_EVERY) + sib / 16;
const sw = mb < 1 ? mb : mb < 9 ? 1 : mb < 15 ? 1 - (mb - 9) / 6 : 0;
v.drone.level(t, MENU_DRONE * (0.5 + 0.5 * sw), 1.2);
v.strings.level(t, MENU_STRINGS * (0.25 + 0.75 * s8), 0.9);
} else if (state === 'replay') {
v.pad.level(t, 0.9, 0.3); v.pad.cutoff(t, 1700 + 2600 * energy, 0.3); v.pad.width(t, 0.75); v.pad.chorus(t, 0.4);
v.arp.sends(t, 0.28, 0.42); v.pad.sends(t, 0.32);
v.arp.shimmer(t, 0.04); v.air(t, 0);
v.bass.upper(t, 0); v.organ.level(t, 0, 0.3);
mix.drumLevel(t, 1);
mix.sectionLevel(t, 1); mix.musicLevel(t, 1);
mix.hall(t, HALL.replay);
} else {
const ty = sec.type, p = clamp01((secBar + sib / 16) / sec.bars);
let lvl = ty === 'breakdown' ? (choirBed > 0 ? 0.6 : 0.68) : ty === 'intro' ? 0.38 + 0.12 * p : ty === 'build' ? (sec.lift ? 0.86 : 0.5 + 0.3 * p)
: ty === 'outro' ? 0.6 : ty === 'groove' ? 0.46 : ty === 'halftime' ? 0.5 : cruise ? CR.pad : leadOn ? PAD_UNDER_LEAD : 0.6;
const role = dropRole();
if (sec.active) lvl = 0;
if (role === 'dbk') lvl *= 0.708;
const fc = featCall && t >= featCall.a - 1e-4 && t < featCall.b;
if (fc) lvl *= 0.708;
if (ty === 'drop' && !cruise && song.padTrim) lvl *= Math.pow(10, song.padTrim / 20);
if ((ty === 'groove' || ty === 'halftime') && groove3) lvl *= 1.26;
const gLean = (ty === 'groove' || ty === 'halftime') && sec.bars >= 16 && secBar < 8;
if (gLean) lvl *= 0.944;
if (segue && segue.kind === 'bridge' && t >= segue.t - 1e-4 && t < segue.until) lvl = 0;
const lpOff = patchOf(song).padLP - 650;
let cut = ty === 'breakdown' ? 1750 + 0.5 * lpOff + 1800 * energy : ty === 'build' ? 750 + lpOff + 3000 * p * p + 1000 * energy
: ty === 'drop' ? 650 + lpOff + 3300 * Math.pow(energy, 1.3) : ty === 'intro' ? Math.max(450, 600 + 1200 * p + 0.5 * lpOff)
: 1350 + lpOff + 3300 * Math.pow(energy, 1.3);
cut += padAir;
let drums = (0.86 + 0.16 * energy) * (DRUM_SCALE[ty] ?? 1) * (cruise ? CR.drums : 1);
if ((ty === 'groove' || ty === 'halftime') && state === 'roam' && !listenNow()) drums *= groove3 ? 1.19 : gSteps.hats16 ? 1.09 : 1;
if (gLean) drums *= 0.933;
thin = 0;
if (ty === 'outro') {
const q = clamp01((p - 0.5) * 2);
thin = q;
drums += (0.55 - drums) * q;
if (p >= 0.5) layers.hats16 = layers.gate = layers.openHat = layers.shaker = layers.ghost = false;
const barsLeft = sec.bars - (secBar + sib / 16);
if (barsLeft < 4) { const a = Math.max(0, barsLeft) / 4; cut = Math.pow(cut, a) * Math.pow(900, 1 - a); }
}
const org = trk().organ && (ty === 'build' || (ty === 'breakdown' && !sec.active));
v.organ.level(t, org ? 0.9 * lvl : 0, 0.3);
if (org) lvl *= 0.15;
v.pad.level(t, lvl, 0.3); v.pad.cutoff(t, cut, SPB * 0.6);
v.pad.width(t, ty === 'drop' ? 0.5 : ty === 'breakdown' ? 0.85 : 0.72, 0.7);
const W = song.width || 0;
v.pad.chorus(t, (ty === 'drop' ? 0.25 : 0.3) + 0.2 * W);
v.pad.gateCutoff(t, ty === 'drop' ? 6000 + 2000 * energy : 1600 + 4600 * energy);
const gUp = (ty === 'groove' || ty === 'halftime') && (groove2 ? (groove3 ? 0.6 : 0.45) : listen && sec.bars >= 16 && secBar >= 8 ? 0.45 : 0);
v.bass.upper(t, ty === 'drop' ? (cruise ? (layers.gate ? 0.5 + 0.3 * energy : 0) : role === 'peak' ? 0.95 : 0.62 + 0.33 * energy) : gUp || 0);
v.arp.sends(t, ty === 'breakdown' ? 0.26 : 0.18, (ty === 'breakdown' ? 0.46 : 0.3) + 0.12 * W);
const dt = ty === 'build' ? (secBar === sec.bars - 1 ? 9000 : 8000) : 20000;
if (dt !== drumTopF) { drumTopF = dt; mix.drumTop(t, dt); }
v.arp.shimmer(t, ty === 'breakdown' ? 0.05 : 0); v.air(t, 0);
v.pad.sends(t, ty === 'breakdown' ? 0.28 : 0.2);
v.lead.sends(t, ty === 'breakdown' ? 0.36 : 0.3, ty === 'breakdown' ? 0.18 : 0.12);
v.lead.width(t, 0.6 * W);
mix.drumLevel(t, drums);
mix.space(t, ty === 'drop' ? 0.89 : 1);
mix.hall(t, ty === 'breakdown' ? (sec.active ? 0.15 : HALL.breakdown) : 0);
const swell = CR.buildCalm + (CR.buildHot - CR.buildCalm) * clamp01((I - 0.1) / 0.4);
const preFinal = ty === 'drop' && !cruise && !sec.final && listenNow() && song.sections.some((x, i) => i > secIdx && x.final);
const finalLift = ty === 'drop' && !cruise && sec.final && song.sections.some((x, i) => i < secIdx && x.type === 'drop');
const T = trk(), dB = (x) => Math.pow(10, (x || 0) / 20);
const qb = clamp01((secBar + sib / 16) / Math.max(1, sec.bars - 2));
let secLvl = ty === 'build' ? BUILD_GAIN * (BUILD_START + (1 - BUILD_START) * qb) + swell * p * p
: cruise ? CR.bed : (sec.active ? 0.8 : SECTION_GAIN[ty] ?? 1) * (preFinal ? PRE_FINAL_GAIN * dB(T.preFinalDb) : 1) * (ty === 'drop' && !listenNow() ? DROP_GAME : 1);
if (ty === 'drop' && !cruise) secLvl *= dB(T.dropDb) * (sec.final ? dB(T.finalDb) : 1) * (listenNow() ? 1 : dB(T.dropGameDb));
if ((ty === 'groove' || ty === 'halftime') && T.grooveDb) secLvl *= dB(T.grooveDb);
if (ty === 'intro') secLvl *= 1.0 + 0.22 * p;
const qs = (secBar + sib / 16) / Math.max(1, sec.bars);
const nx0 = song.sections[1];
if (secIdx === 0 && T.introDb) secLvl *= dB(T.introDb * (nx0 && (nx0.type === 'groove' || nx0.type === 'halftime') ? clamp01(2 - 2 * qs) : 1));
if (T.outroDb && secIdx === song.sections.length - 1 && ty === 'outro') secLvl *= dB(T.outroDb * clamp01(2 * qs));
const gapBeat = ty === 'build' && sec.gapEnd && secBar === sec.bars - 1 && sib >= 12;
const fromGap = gapPrev && !gapBeat; gapPrev = gapBeat;
const lvT = fromGap ? t - 0.012 : t, lvTau = gapBeat ? 0.008 : fromGap ? 0.003 : sib === 0 && secBar === 0 ? 0.05 : 0.2;
mix.sectionLevel(lvT, secLvl * (gapBeat ? GAP_LEVEL : 1), lvTau);
let arc = ty === 'drop' && !cruise ? dropArc(sec, leadLine(), secBar, sib / 16) : 1;
const ph0 = ty === 'drop' && !cruise && sec.final && sec.bars >= 32 && secBar < 8;
if (ph0) arc *= 0.92; else if (role === 'lift' && sec.bars >= 32) arc *= 1.03; else if (role === 'dbk') arc *= 0.56; else if (role === 'peak') arc *= 1.16;
const mLv = gapBeat ? GAP_LEVEL : (finalLift ? (song.finalMusic || FINAL_MUSIC) : 1) * arc;
const accent = fromGap && ty === 'drop' && !cruise && secBar === 0 && sib === 0 ? DROP_ACCENT : 1;
mix.musicLevel(lvT, mLv * accent, lvTau);
if (accent > 1) mix.musicLevel(t + 0.5 * SPB, mLv, 0.08);
const ad = leadOn && layers.arp && ty !== 'breakdown';
if (ad !== arpDipOn) { arpDipOn = ad; mix.arpDip(t, ad, 1.5); }
const cd = song.choir >= 1 && choirOn > 0.2;
if (cd !== choirDipOn) { choirDipOn = cd; mix.choirDip(t, cd, 3); }
const lift = ty === 'drop' && !cruise && (sec.final || (sec.bars >= 16 && secBar % 16 >= 12) || role === 'peak');
if (lift !== choirLiftNow) { choirLiftNow = lift; mix.choirLift(t, lift); }
const cld = T.choirLeadDip && leadOn;
if (!!cld !== choirLDOn) { choirLDOn = !!cld; mix.choirLeadDip(t, cld ? T.choirLeadDip.db : 0, T.choirLeadDip ? T.choirLeadDip.f : 2500, T.choirLeadDip ? T.choirLeadDip.q : 1); }
mix.bedMid(t, fc ? 3 : 0);
const ao = leadOn && (layers.arp || ty === 'breakdown');
const hpw = callHP ? 180 : ao ? ARP_OVER_HP : 550;
if (hpw !== arpOverOn) { arpOverOn = hpw; mix.arpHP(t, hpw); }
if (ao !== arpLPOn) { arpLPOn = ao; mix.arpLP(t, ao ? 7000 : 20000); }
const hd = ao && layers.arp && ty !== 'breakdown';
if (hd !== padHiDipOn) { padHiDipOn = hd; mix.padHiDip(t, hd ? 2 : 0); }
}
}
function sectionStart(t, first, mid = false) {
const ty = sec.type;
arpPos = 0;
const all = (sec.leadNotes || []).concat(sec.leadNotesL || []);
sec.leadLow = all.length ? Math.min(...all.map((n) => n.midi)) : 72;
sec.leadHigh = all.length ? Math.max(...all.map((n) => n.midi)) : 79;
mix.subBoost(t, ty === 'drop' && !mid && trk().sub40 ? 2 : 0);
if (ty === 'drop') {
if (listenNow() || sec.inserted || dropsSinceEntry === 0) sec.cruise = false;
else if (sec.full != null) sec.cruise = !sec.full;
else sec.cruise = Math.max(iSm, iTarget) < CRUISE_BELOW;
dropsSinceEntry++;
}
lg({ t, ev: 'section', type: ty, bars: sec.bars, song: songIdx, key: song.keyName, kv: sec.kickVar || undefined, ins: sec.inserted || undefined, cr: sec.cruise ? 1 : undefined, pos: barsBefore(song, secIdx) });
bassTimbre(t, roamBassTimbre(), ty === 'breakdown' ? 0.3 : 0.04);
mix.trackEQ(t, { air: sectionAir() });
const fromMenu = first && enterFromMenu;
enterFromMenu = false;
voices.lead.octave(t, false);
if (mid) {
} else if (ty === 'drop') {
const full = !sec.cruise;
const landed = sec.landedAt != null && Math.abs(sec.landedAt - t) < 0.05, soft = !!sec.landedSoft;
sec.landedAt = null; sec.landedSoft = false;
if (!landed) hit(kit.crash, t, { bus: 'cym', gain: soft ? 0.32 : full ? DROP_CRASH : 0.38, priority: true });
const ig = full ? 0.42 : 0.32;
if (!landed && !soft && impactOK(t)) hit(kit.impact, t, { bus: 'fx', gain: full ? 0.52 : ig, priority: true });
if (full && !sec.inserted && !quiet && !landed && !soft) {
let sig = sec.sig || dropSig(sec, t);
if (sig === 'braam' && Math.abs(lastBraam - t) > 1e-6 && !braamOK(t)) sig = 'taiko';
sec.sig = null;
playSig(t, sig, ig, braamMidi(chordAt(sec, 0).rootPc));
if (sig !== 'slam') hit(kit.subDrop, t, { bus: 'fx', gain: ig, priority: true });
}
const ck = trk().choirK ?? 1;
choirBed = full && (energy >= 0.45 || iSm > 0.3 || listenNow() || song.choir >= 1) ? (song.choir >= 1 ? 0.95 * ck : 0.26) : 0;
sec.choirUntil = song.choir >= 1 ? 4 : 2;
if (sec.final && full) { choirBed = Math.max(choirBed, song.choir >= 1 ? 0.95 * ck : 0.3); sec.choirUntil = 8; }
} else if (ty === 'breakdown') {
hit(kit.crash, t, { bus: 'cym', gain: 0.32, priority: true });
if (impactOK(t)) hit(kit.impact, t, { bus: 'fx', gain: 0.3, priority: true });
choirBed = song.choir >= 1 || perf.chance(0.6) ? 0.16 : 0;
sec.choirUntil = 4;
if (sec.active) { choirBed = 0.2; sec.choirUntil = sec.bars; lg({ t, ev: 'activeBreak', bars: sec.bars }); }
} else if (ty === 'groove' || ty === 'outro' || ty === 'halftime') {
hit(kit.crash, t, { bus: 'cym', gain: 0.4, priority: true });
choirBed = 0;
} else if (ty === 'intro') {
if (!first) { hit(kit.crash, t, { bus: 'cym', gain: 0.32, priority: true }); hit(kit.impact, t, { bus: 'fx', gain: 0.25, priority: true }); }
choirBed = 0;
if (!quiet && sec.bars >= 4) secRiser = fx.riser(t + (sec.bars - 2) * BAR, 2 * BAR, 0.12, { ...(song.riser || {}), midi: riserMidi(chordAt(sec, sec.bars - 1)) });
} else if (ty === 'build') {
choirBed = 0;
if (sec.coldOpen && !first) hit(kit.impact, t, { bus: 'fx', gain: 0.25, priority: true });
const hb = Math.min(2, Math.max(1, Math.floor(sec.bars / 2)));
mix.hpSweep(t + (sec.bars - hb) * BAR, t + sec.bars * BAR - SPB, sec.bars <= 2 ? 260 : 300);
const rb = sec.bars >= 8 ? sec.bars : Math.min(sec.bars, 4);
if (!quiet) secRiser = fx.riser(t + (sec.bars - rb) * BAR, rb * BAR, sec.lift ? 0.3 : sec.bars >= 8 ? 0.3 : 0.12 + 0.04 * rb, { ...(song.riser || {}), f1: Math.min((song.riser && song.riser.f1) || 7500, 5000), midi: riserMidi(chordAt(sec, sec.bars - 1)), stage: sec.bars >= 8 });
}
if (fromMenu && !quiet) {
if (entryKind === 'first') {
hit(kit.crash, t, { bus: 'st', gain: 0.45, priority: true });
if (impactOK(t)) hit(kit.impact, t, { bus: 'st', gain: 0.35, priority: true });
fx.braam(t, braamMidi(chordAt(sec, 0).rootPc), BRAAM_K * 0.35, 2.5, fx.buses.st);
lg({ t, ev: 'braam', m: braamMidi(chordAt(sec, 0).rootPc), enter: 1 });
} else hit(kit.crash, t, { bus: 'cym', gain: 0.3, priority: true });
}
if (fromMenu) lg({ t, ev: 'enter', type: ty, kind: entryKind, bar: secBar });
}
function nextSection(t) {
if (sec && sec.type === 'build') mix.hpReset(t);
secRiser = null;
voices.lead.octave(t, false);
if (jumpTo >= 0) { secIdx = jumpTo; jumpTo = -1; } else secIdx++;
sec = song.sections[secIdx];
secBar = 0;
bdHoldEnd = 0;
if (leadHeld) { voices.lead.release(t); leadHeld = false; }
sectionStart(t, false);
}
function adapt(t) {
if (listenNow() || sec.inserted && sec.type === 'build') return;
const ty = sec.type;
highBars = iRaw >= 0.8 ? highBars + 1 : 0;
busyBars = iRaw >= 0.45 ? busyBars + 1 : 0;
idleBars = iSm < 0.15 ? idleBars + 1 : 0;
activeBars = iRaw >= 0.4 ? activeBars + 1 : 0;
const calm = ty === 'intro' || ty === 'groove' || ty === 'breakdown' || ty === 'halftime';
if (ty === 'drop' && sec.cruise && secBar % 2 === 0 && secBar < sec.bars - 1 && iTarget >= 0.6 && hypeCooldown === 0) {
sec.cruise = false;
hypeCooldown = 64;
leadFrom(song, sec, secBar); lastHeadAt = roamBars;
sec.leadLow = sec.leadNotes.length ? Math.min(...sec.leadNotes.map((n) => n.midi)) : 72;
hit(kit.crash, t, { bus: 'cym', gain: 0.42, priority: true });
if (impactOK(t)) hit(kit.impact, t, { bus: 'fx', gain: 0.3, priority: true });
lg({ t, ev: 'upgrade' });
}
const upS = upcoming && upcoming.song, upE = upS ? upS.sections.find((x) => x.type === 'groove' || x.type === 'halftime' || x.type === 'build') : null;
if (ty === 'outro' && mode === 'adaptive' && state === 'roam' && secIdx === song.sections.length - 1 && secBar >= 1 && secBar < sec.bars - 2 && activeBars >= 2 && !(upE && upE.type === 'build')) {
lg({ t, ev: 'outroCut', from: secBar, bars: sec.bars });
secBar = sec.bars - 2;
song.activeExit = true; song.ringOut = false;
return;
}
if (ty === 'drop' && mode === 'adaptive' && state === 'roam' && dropRun >= DROP_RUN_MAX && secBar % 4 === 0 && secBar < sec.bars) {
const nb = activeBreak(song, secIdx, secBar);
if (nb) { lg({ t, ev: 'formBreak', at: secBar, run: dropRun, bars: nb.bars, rest: nb.rest }); jumpTo = secIdx + 1; return; }
}
if (calm && !sec.active && postDrop >= (highBars >= 3 ? 16 : POST_DROP_BARS) && (highBars >= 3 || hypeReq > t) && hypeCooldown === 0 && secBar < sec.bars && hypeInPlace(song, secIdx, secBar)) {
hypeCooldown = 64;
lg({ t, ev: 'hype', req: hypeReq > t ? 1 : undefined });
hypeReq = 0;
return;
}
if ((ty === 'breakdown' || ty === 'intro') && !sec.active && busyBars >= 4 && secBar % 4 === 0 && secBar >= (ty === 'breakdown' ? 8 : 4) && secBar < sec.bars && cutCalm(song, secIdx, secBar)) {
lg({ t, ev: 'cut', type: ty });
return;
}
if (ty === 'drop' && !sec.inserted && !sec.cruise && idleBars >= 8 && secBar % 8 === 0 && secBar >= 8 && secBar < sec.bars && shortenDrop(song, secIdx, secBar)) {
lg({ t, ev: 'shorten' });
}
}
function roamBar(t) {
barT = t;
if (secBar < 0) {
if (jumpTo >= 0) { secIdx = jumpTo; jumpTo = -1; }
sec = song.sections[secIdx];
secBar = Math.min(resumeBar, sec.bars - 1); resumeBar = 0;
sectionStart(t, true, secBar > 0);
} else {
secBar++;
if (hypeCooldown > 0) hypeCooldown--;
if (forcedDropBars > 0) forcedDropBars--;
if (secBar < sec.bars) adapt(t);
if (jumpTo >= 0 || secBar >= sec.bars) nextSection(t);
}
roamBars++;
if (sec.type === 'drop') { dropRun++; postDrop = 0; } else { postDrop++; if (sec.type !== 'build' || (sec.bars >= 4 && !sec.mini)) dropRun = 0; }
const ty = sec.type, pb = secBar % 8, last = secBar === sec.bars - 1;
const songLast = secIdx === song.sections.length - 1;
mark(t, { pos: barsBefore(song, secIdx) + secBar, BAR, song, section: ty, kind: 'roam' });
if (choirBed > 0 && secBar >= (sec.choirUntil ?? 0)) choirBed = 0;
if ((ty === 'drop' || ty === 'groove') && energy >= 0.9 && pb < 2) choirBed = Math.max(choirBed, 0.22);
if (song.choir >= 1 && ty === 'drop' && !sec.cruise && pb < 4) choirBed = Math.max(choirBed, 0.76 * (trk().choirK ?? 1));
if (ty === 'build' && last) {
const nx = song.sections[secIdx + 1];
const full = listenNow() || (nx && nx.inserted) || dropsSinceEntry === 0 || Math.max(iSm, iTarget) >= CRUISE_BELOW;
if (nx && nx.type === 'drop') nx.full = full;
sec.gapEnd = sec.bars >= 8 || !!sec.lift || (full && nx && nx.type === 'drop');
if (sec.gapEnd && secRiser && !sec.lift) secRiser.cancel(t + 3 * SPB, 0.12);
if (nx && nx.type === 'drop' && full && !nx.inserted && !quiet) {
nx.sig = dropSig(nx, t + BAR);
if (nx.sig === 'taiko') {
const c0 = chordAt(nx, 0);
fx.choir(t + BAR - 2 * SPB, c0.pcs.map((pc) => pcAbove(pc, 57)), 2 * SPB, 0.34, 'ah', 2 * SPB - 0.012, 0.05, mix.choirFx);
lg({ t: t + BAR - 2 * SPB, ev: 'revChoir' });
}
}
}
const resume = leadResumeAt > 0 && Math.abs(t - leadResumeAt) < 1e-3;
if (resume) leadResumeAt = -1;
if (secBar % 2 === 0 || resume) {
const L = leadLine();
const has = L && L.some((n) => n.step >= secBar * 16 && n.step < (secBar + 2) * 16);
const verse = ty === 'groove' || ty === 'halftime';
const want = has && !sec.cruise && t >= leadMuteUntil - 1e-4 && dropRole() !== 'dbk' && (listenNow() || ty === 'breakdown' || verse || energy >= (leadOn ? 0.48 : 0.55));
if (!want && leadHeld) { voices.lead.release(t); leadHeld = false; }
if (want !== leadOn) mix.leadDip(t, want, trk().padLeadDb ?? 3);
leadOn = want;
if (!want && !sec.counterNotes && !voices.lead.parked) voices.lead.park(t + 0.6);
}
if (ty === 'drop' && sec.final && secBar % 8 === 0) {
const ph = secBar >> 3, nPh = Math.ceil(sec.bars / 8);
voices.lead.octave(t, !sec.cruise && (sec.finalThemes ? sec.finalThemes[ph % sec.finalThemes.length] === 'A' : (ph === 0 || ph === nPh - 1)));
}
if (ty === 'drop' && !sec.final && !sec.cruise && secBar % 16 === 0) voices.lead.octave(t, false);
if (ty === 'drop' && !sec.cruise && secBar % 8 === 0 && dropRole() === 'peak') voices.lead.octave(t, true);
if (songLast && !upcoming) prepareNext();
let c = chordAt(sec, secBar), cb = chordSpan(sec, secBar);
if (secBar === 0) for (const o of ovr) if (o.until > t && o.chord.keyPc !== (sec.keyPc ?? song.keyPc)) o.until = t;
const oc = ovrAt(t);
if (oc) { c = oc.chord; cb = Math.max(0.25, (oc.until - t) / BAR); oc.applied = true; }
pivotOn = false;
if (segue && t >= segue.until - 1e-4) segue = null;
if (songLast && last && upcoming && upcoming.song && upcoming.song.keyPc !== song.endKeyPc && !song.ringOut) {
const sg = segueFor(song.endKeyPc, sec.mode || song.mode, upcoming.song);
segue = { ...sg, t, until: t + BAR };
if (sg.chord) c = sg.chord;
cb = 1; pivotOn = true;
segueExtras(segue, t, BAR, upcoming.song);
lg({ t, ev: 'segue', kind: sg.kind, from: song.endKeyPc, to: upcoming.song.keyPc });
}
const changed = setChord(c, t, cb);
syncChoir(t, changed);
approach = null;
const nb = secBar + 1 < sec.bars ? sec.plan[secBar + 1] : null;
const curBass = sec.plan[secBar] && sec.plan[secBar].bass != null ? sec.plan[secBar].bass : chord.rootPc;
if (nb && !pivotOn && !oc && perf.chance(0.5)) {
const tgtPc = nb.bass != null ? nb.bass : nb.chord.rootPc;
if (tgtPc !== curBass) {
const tgt = bassMidi({ rootPc: tgtPc });
const chrom = perf.chance(0.5), up = perf.chance(0.5);
let m;
if (chrom) m = tgt + (up ? 1 : -1);
else { const sc = nb.chord.scale; m = tgt + (up ? 1 : -1); while (!sc.includes(pcOf(m))) m += up ? 1 : -1; }
approach = { step: song.feel === 'shuffle' || perf.chance(0.5) ? 14 : 15, m };
}
}
if (secBar > 0 && secBar % 16 === 0 && (ty === 'drop' || (ty === 'groove' && energy > 0.45))) hit(kit.crash, t, { bus: 'cym', gain: sec.cruise ? 0.24 : 0.32 });
else if (secBar > 0 && pb === 0 && ty === 'drop' && !sec.cruise) hit(kit.crash, t, { bus: 'cym', gain: 0.2 });
else if (secBar > 0 && secBar % 4 === 0 && ty === 'drop' && sec.final && !sec.cruise) hit(kit.crash, t, { bus: 'cym', gain: 0.2 });
else if (secBar > 0 && secBar % 2 === 0 && ty === 'drop' && dropRole() === 'peak') hit(kit.crash, t, { bus: 'cym', gain: 0.2 });
fill = null; kickOut = false; fillRun = null;
const next = song.sections[secIdx + 1];
if (ty === 'halftime') {
fill = last && next && next.type === 'build' ? 'roll' : secBar % 16 === 15 ? 'tomrun' : pb === 7 || last ? 'toms' : null;
} else if (ty === 'drop' && last && sec.final && !sec.cruise && song.feel === 'half') {
fill = 'stopHit';
} else if (ty === 'groove' || ty === 'drop' || ty === 'outro' || (ty === 'intro' && secBar >= sec.bars / 2)) {
if (last && ty === 'drop' && sec.final && !sec.cruise) fill = 'stopHit';
else if (ty === 'drop' && sec.final && !sec.cruise && secBar === sec.bars - 2) fill = 'roll16';
else if (last && next && next.type === 'breakdown') fill = 'gap';
else if (last && next && next.type === 'build') fill = 'roll';
else if (secBar % 16 === 15 || (last && sec.bars >= 8)) fill = ty === 'intro' ? 'roll' : ((secBar >> 4) & 1) && song.stopFill && ty !== 'outro' ? 'stop' : 'tomrun';
else if (pb === 7) {
const w = song.fillW;
fill = perf.weighted(['roll', 'small', 'gap', 'kicks'], [w.roll * 0.6, 1.4, w.gap * (energy > 0.5 ? 0.6 : 0.25), w.kicks * (energy > 0.6 ? 1 : 0.2)]);
} else if (pb === 3 && perf.chance(0.45)) fill = 'small';
if (ty === 'drop' && sec.bars >= 16 && secBar % 16 === 15 && !last && (fill === 'stop' || fill === 'tomrun') && !(sec.final && secBar >= sec.bars - 8)) kickOut = true;
}
if (fill === 'tomrun') { const runs = song.tomRuns && song.tomRuns.length ? song.tomRuns : TOM_RUNS.slice(0, 3); fillRun = runs[tomCount++ % runs.length]; }
if (last && (ty === 'build' || ty === 'intro' || (next && next.type === 'breakdown') || (!next && !songLast))) {
const rd = ty === 'build' || ty === 'intro' ? 2 * SPB : SPB * 1.5;
const gapX = ty === 'build' && sec.gapEnd;
hit(kit.crashRev, t + BAR - rd, { bus: gapX ? 'fx' : 'cym', gain: gapX ? 0.14 : ty === 'build' ? 0.18 : ty === 'intro' ? 0.26 : 0.24, offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6, priority: true });
}
if (songLast && last) {
const rd = SPB * 1.5;
hit(kit.crashRev, t + BAR - rd, { bus: 'cym', gain: 0.24, offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6, priority: true });
}
const LL = listenNow() && sec.leadNotesL;
let call = sec.calls && sec.calls.find((c2) => c2.bar === secBar && (ty !== 'drop' || sec.cruise) && !(LL && LL.some((n) => n.step >= c2.bar * 16 && n.step < (c2.bar + 2) * 16)) && t >= figureAt + 2 * BAR - 1e-3);
const featTy = ty === 'groove' || ty === 'halftime';
if (call && call.motif && !featTy && !motifOK(t, 'call')) call = call.hookNotes ? { ...call, motif: false, notes: call.hookNotes } : null;
if (call) {
const featured = !!(call.motif && featTy);
sec.activeCall = featured ? { ...call, featured: true } : call;
logTheme(t, call.motif, 'call', { sec: ty, feat: featured ? 1 : undefined }, !featured);
if (call.motif && !quiet) {
const ns = call.notes.map((n) => { const k = n.step - secBar * 16; return { t: og(t + Math.floor(k / 16) * BAR + (k % 16) * STEP + swingT(k % 16)), m: n.midi, dur: n.len * STEP * 0.92 }; });
leitmotif(ns, featured ? CALL_LEVEL : 0.2, { rel: 0.22 });
callHP = !featured;
if (featured) {
featCall = { a: t, b: t + 2 * BAR };
const ln = ns[ns.length - 1];
if (ln && ln.dur >= 8 * STEP) fx.choir(ln.t, [ln.m - 12], ln.dur, 0.14, 'ah', 0.08, 0.6, mix.choirIn);
}
}
} else if (sec.activeCall && secBar >= sec.activeCall.bar + 2) sec.activeCall = null;
if (!sec.activeCall && callHP) callHP = false;
if (leadOn && leadLine().some((n) => n.role === 'head' && n.step === secBar * 16)) {
const th = sec.phraseThemes ? sec.phraseThemes[secBar >> 3] : 'A';
logTheme(t, song.headIsMotif && (ty === 'breakdown' || th === 'A'), ty === 'breakdown' ? 'augmented' : 'lead', { sec: ty });
}
if (sec.bassHead && sec.bassHead.some((n) => n.step === secBar * 16)) logTheme(t, false, 'bass', { sec: ty });
if (sec.bellNotes && sec.bellNotes.some((n) => n.step === secBar * 16)) logTheme(t, false, 'bell', { sec: ty });
if (sec.active) { if (sec.carrierNotes && sec.carrierNotes.some((n) => n.step === secBar * 16)) logTheme(t, true, 'activeBreak', { sec: ty, on: song.bdCarrier }, false); }
else if (sec.carrierNotes && sec.carrierNotes.length && sec.carrierNotes[0].step === secBar * 16) logTheme(t, false, 'carrier', { sec: ty, on: song.bdCarrier });
if (dropRole() === 'dbk' && sec.dbkBell && sec.dbkBell.some((n) => n.step === secBar * 16)) logTheme(t, true, 'dbk', { sec: ty }, false);
if (hang) hangBar(t);
lg({ t, ev: 'bar', st: STEP, sec: ty, secBar, chord: chord.label, pcs: chord.pcs, sc: chord.scale, h: chord.harmonic, key: chord.keyPc, e: +energy.toFixed(2), fill, vc: voicing && voicing.slice(), lead: leadOn, cr: sec.cruise ? 1 : undefined, fin: sec.final && secBar >= sec.bars - 8 ? 1 : undefined, bass: oc ? undefined : sec.plan[secBar] ? sec.plan[secBar].bass : undefined, ko: kickOut ? 1 : undefined, bars: sec.bars, final: sec.final ? 1 : undefined, ph: sec.phraseThemes ? sec.phraseThemes[secBar >> 3] || undefined : undefined });
}
const leadLine = () => (listenNow() && sec.leadNotesL ? sec.leadNotesL : sec.leadNotes) || [];
function hats(sib, t, scale = 1) {
if (inBlackout(t, 'hat')) return;
const hh = inHang(t), h16 = hh && hangBarAt(t) >= 3, h8 = hh && !h16;
if (h8 && (sib & 1)) return;
const off = (sib & 3) === 2;
const acc = song.hatAcc ? song.hatAcc[sib] : 1;
const tt = t + swingT(sib) + perf.float() * 0.002;
const v = scale * acc * (0.92 + perf.float() * 0.16);
const side = (((sib >> 2) ^ (sib >> 1)) & 1) ? 'hatR' : 'hatL';
if (song.feel === 'shuffle') {
if ((sib & 3) === 0) {
hit(K.hatC, tt, { bus: 'hatL', gain: 0.1 * v, rate: song.hatRate * 1.02 });
if (layers.hats16 && !h8) hit(K.hatC, t + SPB / 3 + perf.float() * 0.002, { bus: 'hatL', gain: 0.055 * v, rate: song.hatRate * 1.02 });
hit(layers.openHat ? kit.hatO : K.hatC, t + 2 * SPB / 3 + perf.float() * 0.002, { bus: 'hatR', gain: (layers.openHat ? 0.13 : 0.16) * v, rate: song.hatRate });
}
return;
}
const fin4 = state === 'roam' && sec.type === 'drop' && sec.final && !sec.cruise && secBar >= sec.bars - 4;
const open4 = sib === 14 && state === 'roam' && (secBar % 4 === 3 || (fin4 && secBar % 2 === 1)) && !h8;
if (off && (layers.openHat || open4)) hit(kit.hatO, tt, { bus: side, gain: 0.135 * v, rate: song.hatRate });
else if (off) hit(K.hatC, tt, { bus: side, gain: 0.16 * v, rate: song.hatRate });
else if (h8) hit(K.hatC, tt, { bus: side, gain: 0.085 * v, rate: song.hatRate * 1.02 });
else if (h16) hit(K.hatC, tt, { bus: side, gain: ((sib & 1) ? 0.07 : 0.09) * v, rate: song.hatRate * 1.02 });
else if (layers.hats16) hit(layers.shaker ? K.hatShk : K.hatC, tt, { bus: side, gain: ((sib & 1) ? 0.063 : 0.085) * v * (layers.shaker ? 1.2 : 1), rate: song.hatRate * 1.02 });
}
function buildArpNote(p) {
const T = leadTonic(sec.keyPc ?? song.keyPc) - 12;
const H = song.hookA && song.hookA.length >= 5 ? song.hookA : HEAD;
const d = H[arpPos % 5].d;
const deg = [0, 2, 3, 5, 7, 8, 10];
let m = T + 12 * Math.floor(d / 7) + deg[((d % 7) + 7) % 7];
let best = m, bd = 99;
for (const pc of chord.pcs) { const c2 = nearestPc(pc, m); if (Math.abs(c2 - m) < bd) { bd = Math.abs(c2 - m); best = c2; } }
return best + (p > 0.75 ? 12 : 0);
}
function arpStep(sib, t, A, lvl, cut, decay, spread, under = false, up = 0, dense = false) {
if ((A.rate === 2 || (under && !dense)) && (sib & 1)) return;
const slot = A.rate === 2 ? sib >> 1 : sib;
if (!under && !A.mask[slot % A.mask.length]) return;
if (A.rate !== 2 && !under && shufDup(sib, A.mask[(slot - 1 + A.mask.length) % A.mask.length])) return;
if (under && state === 'roam' && sec && secBar >= 0) { const cl = leadLine().climax; if (cl && cl.some((c) => c.bar === secBar)) return; }
const tones = arpTones(chord, A.base);
const oi = A.order[arpPos % A.order.length];
let m = tones[oi % tones.length];
arpPos++;
if (under) {
const lo = Math.max(ARP_OVER_LO, Math.min(ARP_OVER_HI, (sec && sec.leadHigh != null ? sec.leadHigh : 83) + 1)), hi = lo + 11;
const reg = (x) => { while (x > hi) x -= 12; while (x < lo) x += 12; return x; };
m = reg(m);
lvl *= ARP_OVER_GAIN; spread = 0.6;
if (state === 'roam' && sec && secBar >= 0) {
const lm = leadNow(t + swingT(sib), secBar * 16 + sib);
if (clashIc(m, lm)) {
let ok = null;
for (let k = 1; k < tones.length && ok == null; k++) { const c2 = reg(tones[(oi + k) % tones.length]); if (!clashIc(c2, lm)) ok = c2; }
if (ok == null) return;
m = ok;
}
}
}
else if (energy > 0.86 && state === 'roam' && (slot & 7) === 7) m += 12;
m += up;
const acc = sib % 4 === 0 ? 1 : sib % 2 === 0 ? 0.8 : 0.66;
const dur = A.rate === 2 ? STEP * 1.7 : STEP * 0.85;
voices.arp.note(og(t + swingT(sib)), m, dur, lvl * acc, cut, decay, ((under ? arpPos : slot) & 1) ? spread : -spread);
lg({ t, v: 'arp', m, up: up || undefined });
}
function callStep(sib, t, lvl, cut) {
const c = sec.activeCall;
const step = secBar * 16 + sib;
const n = c.notes.find((x) => x.step === step);
if (!n) return;
const at = og(t + swingT(sib)), m = pic(n.midi, at);
voices.arp.note(at, m, n.len * STEP * 0.92, lvl * (c.motif ? 1.41 : 1), cut, 0.18 + 0.02 * n.len, 0);
lg({ t, v: 'arp', m, call: 1, motif: c.motif ? 1 : undefined });
}
function leadStep(sib, t) {
const step = secBar * 16 + sib;
if (leadOn && sec.counterNotes && sec.counterNotes.length && !quiet && t >= leadMuteUntil - 1e-4) {
const cn = sec.counterIndex || (sec.counterIndex = new Map(sec.counterNotes.map((n) => [n.step, n])));
const c = cn.get(step);
if (c) {
const at = og(t + swingT(sib)), m = pic(c.midi, at), d = c.len * STEP;
const h = fx.bell(at, m, d, 0.13 * c.vel, { rev: 0.35, dly: 0.25 });
const e = { t, v: 'counter', m, d: +d.toFixed(4) };
lg(e);
counterLive.push({ t: at, end: at + d, h, log: e });
if (counterLive.length > 8) counterLive.shift();
}
}
if (!leadOn || t < leadMuteUntil - 1e-4) return;
const L = leadLine();
const ik = L === sec.leadNotesL ? 'leadIndexL' : 'leadIndex';
const idx = sec[ik] || (sec[ik] = new Map(L.map((n, i) => [n.step, i])));
const i = idx.get(step);
if (i == null) return;
const n = L[i];
const nx = L[i + 1];
const hold = !!(n.hold && nx && nx.glide && nx.step === n.step + n.len && (nx.step >> 5) === (n.step >> 5));
const glide = n.glide && leadHeld;
const rank = n.rank ?? 0.5;
const cut = (1700 + 1900 * energy) * (0.85 + 0.3 * rank);
const phraseEnd = !hold && (!nx || (nx.step >> 5) !== (n.step >> 5));
const vk = n.role === 'verse' ? VERSE_VEL : 1, acc = (n.vel ?? 1) / vk < 0.99 ? 0.96 : 1;
const vel = vk * acc * (0.84 + 0.16 * rank) * (sec.type === 'breakdown' ? 0.62 : 0.9) / 0.92, dur = n.len * STEP, thr = phraseEnd ? 0.45 : 0;
const at = og(t + swingT(sib));
const m = pic(n.midi, at);
if (song.hook === 'choir' && sec.type === 'breakdown') {
if (!quiet) fx.choir(at, [m - 12, m], Math.max(SPB * 0.5, dur - 0.02), 0.28 * n.vel, 'ah', 0.08, 0.6);
leadHeld = false;
lg({ t, v: 'lead', m, choir: 1 });
return;
}
const role = dropRole();
if (sec.type === 'drop' && !sec.final && !sec.cruise) voices.lead.octave(at, role === 'peak' || (n.len >= 6 && (!!n.climax || (sec.bars >= 16 && secBar % 16 >= 8))));
voices.lead.note(at, m, dur, vel, cut, glide, hold, thr);
if (layers.arp || sec.type === 'breakdown') mix.arpDuck(at, dur, n.len >= 2 ? 6 : 4);
if (sec.type === 'drop' && !sec.final && !sec.cruise && n.alt === 'A' && n.len >= 6 && song.hook !== 'choir' && !quiet) { fx.choir(at, [m - 12, m], dur, 0.1 * n.vel, 'ah', 0.06, 0.4, mix.choirIn); lg({ t, ev: 'choirA2', m }); }
else if (sec.type === 'drop' && !sec.final && !sec.cruise && (role === 'peak' || (sec.bars >= 16 && secBar % 16 >= 12)) && n.len >= 4 && song.hook !== 'choir' && !quiet) { fx.choir(at, [m - 12, m], dur, 0.09 * n.vel, 'ah', 0.05, 0.4, mix.choirIn); lg({ t, ev: 'choirPair', m }); }
leadHeld = hold;
leadHoldEnd = t + dur;
const e = { t, v: 'lead', m, d: +dur.toFixed(4), glide: glide || undefined, res: n.res || undefined, app: n.app || undefined, verse: n.role === 'verse' ? 1 : undefined, cl: n.climax ? 1 : undefined, rk: +rank.toFixed(2) };
leadHist.push({ t: at, end: at + dur, midi: m, log: e });
if (leadHist.length > 12) leadHist.shift();
if (sec.type === 'drop' && sec.final && !sec.cruise && sec.finalThemes && song.hook !== 'choir' && n.len >= 6 && !quiet
&& sec.finalThemes[(n.step >> 7) % sec.finalThemes.length] === 'A') { fx.choir(at, [m - 12, m], dur, 0.11 * n.vel, 'ah', 0.05, 0.4, mix.choirIn); lg({ t, ev: 'choirDbl', m }); }
if (song.choir >= 1 && sec.type === 'drop' && voices) {
voices.choir.duck(at, 0.5, 0.04);
if (!hold) voices.choir.duck(at + dur - 0.02, 1, 0.12);
if (song.hook === 'choir' && sec.final && n.len >= 6 && !quiet) fx.choir(at, [m - 12, m], dur, 0.13 * n.vel, 'ah', 0.05, 0.4, mix.choirIn);
}
lg(e);
}
function bassNote(sym, rootM) {
switch (sym) {
case 'o': return rootM + 12;
case 'f': return rootM + 7;
case 'q': return rootM - 5;
case 't': { let m = pcAbove(chord.pcs[1], rootM + 1); if (m > rootM + 12) m -= 12; return m; }
case 's': { let m = rootM + 1; while (!chord.scale.includes(pcOf(m))) m++; return m; }
case 'b': { let m = rootM - 1; while (!chord.scale.includes(pcOf(m))) m--; return m; }
default: return rootM;
}
}
function roamStep(sib, t) {
const ty = sec.type, last = secBar === sec.bars - 1;
const half = ty === 'halftime' || (song.feel === 'half' && (ty === 'drop' || ty === 'groove' || ty === 'outro')) || !!sec.active;
if (half) { halfStep(sib, t, false); return; }
const prog = clamp01((secBar + sib / 16) / sec.bars);
const stopHit = fill === 'stopHit' && sib >= 8, stopF = fill === 'stop' && sib >= 8;
const gap = (fill === 'gap' && sib >= 12) || (ty === 'build' && last && sec.gapEnd && sib >= 12) || (stopHit && sib > 8) || stopF;
const kv = ty === 'drop' && sec.kickVar && song.feel === 'four' && ((secBar >> 3) & 1) === 0 ? sec.kickVar : null;
const feel = song.feel;
if (stopHit && sib === 8) { stopTimeHit(t); leadStep(sib, t); return; }
let k = 0;
if (!gap && !(kickOut && ty === 'drop' && sib >= 8)) {
const quarter = sib % 4 === 0;
const broken = feel === 'broken' && (ty === 'drop' || ty === 'groove' || ty === 'outro');
if (ty === 'breakdown') k = energy >= 0.5 && quarter ? 0.85 : 0;
else if (ty === 'intro') k = secBar >= sec.bars / 2 && quarter ? 1 : 0;
else if (ty === 'build') k = sec.lift ? 0 : quarter || (last && sec.bars >= 4 && sib % 2 === 0) ? 0.95 : 0;
else if (broken || kv === 'broken') k = sib === 0 ? 1 : sib === 6 ? 0.8 : sib === 8 ? 0.95 : sib === 14 && broken ? 0.7 : 0;
else if (kv === 'half') k = sib === 0 ? 1 : sib === 10 ? 0.85 : 0;
else k = quarter ? 1 : 0;
if (!k && ty !== 'build' && ty !== 'breakdown' && kv !== 'half') {
if (fill === 'kicks' && sib >= 13) k = 0.7;
else if (layers.ghost && song.kickExtra.includes(sib) && (secBar % 4 === 3)) k = 0.6;
else if (broken && sib === 15 && secBar % 8 === 7 && !last) k = 0.5;
}
}
if (k) {
const depth = ty === 'drop' ? 0.5 : ty === 'build' ? 0.5 + 0.2 * prog : ty === 'breakdown' ? 0.35 : ty === 'intro' ? 0.45 : 0.6;
const rel = ty === 'drop' ? (kv === 'half' ? 0.13 : 0.085) : 0.075;
const eP = ty === 'groove' || ty === 'halftime' ? Math.min(energy, 0.3) : energy;
const d = depth * (0.72 + 0.28 * eP) * k * (kv === 'half' ? 1.15 : 1);
const gk = ty === 'groove' || ty === 'halftime';
const bD = trk().bassDuck ?? 1;
kickAt(t + (feel === 'shuffle' ? swingT(sib) : 0), (gk ? 1.1 : 0.92) * k, d, rel, ty === 'drop' ? { d: Math.min(0.85, 0.5 * k * (0.72 + 0.28 * energy) * bD), rel: 0.07, pre: k >= 0.9 ? (trk().kickPre ?? 0.05) : 0 } : gk ? { d: Math.min(0.85, 0.45 * k * bD), rel: 0.07, pre: k >= 0.9 ? 0.04 : 0 } : null);
}
if (ty === 'build') {
let div = prog < 0.5 ? 4 : prog < 0.75 ? 2 : 1;
if (sec.bars <= 2) div = prog < 0.5 ? 2 : 1;
if (!gap) {
const rate = song.snareRate * (1 + 0.3 * prog), vel = 0.08 + 0.42 * prog;
if (feel === 'shuffle') {
const per = div === 4 ? 1 : div === 2 ? 3 : 6;
if ((sib & 3) === 0) for (let k2 = 0; k2 < per; k2++) { const tk = t + k2 * SPB / per; if (per !== 6 || (k2 & 1) === 0) og(tk); hit(K.snare, tk, { bus: 'snare', gain: vel * (k2 ? 0.85 : 1), rate }); }
} else {
if (sib % div === 0) hit(K.snare, t, { bus: 'snare', gain: vel, rate });
if (last && !sec.gapEnd && sib >= 8) hit(K.snare, t + STEP / 2, { bus: 'snare', gain: vel * 0.85, rate });
}
}
} else if (stopF) {
const c = song.stopFill[sib];
if (c !== '.' && !shufDup(sib, song.stopFill[sib - 1] !== '.')) hit(K.snare, og(t + swingT(sib)), { bus: 'snare', gain: c === 'S' ? 0.42 : 0.24, rate: song.snareRate });
} else if (!gap) {
const back = kv === 'half' ? sib === 8 : (sib === 4 || sib === 12);
const introQuiet = ty === 'intro' && secBar < sec.bars / 2 && energy < 0.45;
const bdOK = ty !== 'breakdown' || energy >= 0.55;
if (back && bdOK && !introQuiet && (layers.clap || ty === 'drop' || ty === 'groove')) {
const bb = K.backbeat;
const big = energy > 0.55;
const buf = bb === 'clap' ? K.clap : bb === 'gated' ? (big || ty === 'drop' ? K.sv.snareGated : K.snare) : (bb === 'layered' || big) ? K.snareClap : K.snare;
og(t);
hit(buf, t + 0.005, { bus: 'snare', gain: 0.5 * (0.85 + 0.2 * energy) * (ty === 'drop' ? 1.1 : 1) * (kv === 'half' ? 1.1 : 1) * perf.range(0.94, 1.06), rate: song.snareRate });
} else if (layers.ghost && song.ghosts.includes(sib) && ty !== 'breakdown') {
hit(K.snare, og(t + swingT(sib)), { bus: 'snare', gain: perf.range(0.06, 0.09), rate: song.snareRate * 1.05 });
}
if (fill === 'roll' && sib >= 8) rollStep(sib, t, 8);
else if (fill === 'roll16') rollStep(sib, t, 0);
else if (fill === 'tomrun') {
const run = fillRun || TOM_RUN, c = run[sib];
const tom = (x) => (x === 'h' ? kit.tomH : x === 'm' ? kit.tomM : x === 'l' || x === 'L' ? kit.tomL : null);
if (c !== '.' && !shufDup(sib, run[sib - 1] !== '.')) {
const b = tom(c);
if (b) hit(b, og(t + swingT(sib)), { bus: sib & 2 ? 'tomR' : 'tomL', gain: c === 'L' ? 0.46 : 0.36 });
else hit(K.snare, og(t + swingT(sib)), { bus: 'snare', gain: c === 'S' ? 0.4 : 0.26, rate: song.snareRate });
}
if (sib === 15 && feel !== 'shuffle') hit(K.snare, t + STEP / 2, { bus: 'snare', gain: 0.3, rate: song.snareRate });
} else if (fill === 'small') {
if (sib === 14) hit(kit.hatO, t, { bus: 'hatL', gain: 0.12, rate: song.hatRate });
if (sib === 15) hit(K.snare, t, { bus: 'snare', gain: 0.13, rate: song.snareRate * 1.06 });
}
}
if (hang && inHang(t)) {
const k = Math.max(0, Math.floor((barT - hang.a) / BAR + 1e-3)) + 1;
const div = k <= 1 ? 0 : k === 2 ? 4 : k === 3 ? 2 : 1;
if (div && sib % div === 0 && !shufDup(sib, true)) hit(K.snare, og(t + swingT(sib)), { bus: 'snare', gain: Math.min(0.34, 0.1 + 0.035 * k) * (sib % 4 === 0 ? 1 : 0.8), rate: song.snareRate * (1 + 0.01 * k) });
}
if (!gap && !(ty === 'breakdown' && energy < 0.38) && !(ty === 'intro' && secBar < sec.bars / 2 && (sib & 3) !== 2)) {
if (!(ty === 'build' && last && sec.bars >= 4)) hats(sib, t, ty === 'build' ? 0.65 + 0.35 * prog : 1);
if (ty === 'build' && prog > 0.5 && !layers.hats16 && (sib & 3) !== 2 && !shufDup(sib, (sib & 3) === 3)) hit(K.hatC, og(t + swingT(sib)), { bus: 'hatL', gain: 0.05 + 0.06 * prog, rate: song.hatRate });
}
if (segue && segue.kind === 'bridge' && t >= segue.t - 1e-4 && t < segue.until) return;
const P = sec.plan[secBar];
const ovNow = ovrAt(t);
const rootPc = !pivotOn && !ovNow && P && P.bass != null ? P.bass : chord.rootPc;
if (pivotOn || ovNow) approach = null;
if (ty === 'build' && sec.lift) {
} else if (ty === 'breakdown' && energy < 0.5) {
const dur = chordEnd - t - 0.08;
if ((sib === 0 && (secBar === 0 || chordAt(sec, secBar - 1) !== chord)) || (sib % 4 === 0 && t >= bdHoldEnd - 0.01 && dur > SPB * 0.9)) {
const bm = bassMidi({ rootPc });
voices.bass.note(t, bm, dur, 0.28, mtof(bm) * 1.6, 90, { atk: 0.09, dec: 0.6, sus: 0.85, rel: 0.25, sub: 0.45, subMidi: subOf(bm) });
bdHoldEnd = t + dur;
lg({ t, v: 'bass', m: bm });
}
} else if (!gap && !inBlackout(t, 'low')) {
if (bdHoldEnd > t) { voices.bass.cancelFrom(t); bdHoldEnd = 0; }
let pat;
if (ty === 'build') pat = prog < 0.7 ? 'R-r-R-r-R-r-R-r-' : song.bass.main;
else if (kv === 'half') pat = song.bass.half;
else if (ty === 'breakdown' || energy < 0.4 || (ty === 'groove' && !groove3 && state === 'roam' && !listenNow())) pat = song.bass.low;
else if (song.highPhrase2 && ty === 'drop' && ((secBar >> 3) & 1)) pat = song.bass.high;
else if (energy < 0.8) pat = (secBar & 4) ? song.bass.main2 : song.bass.main;
else pat = song.bass.high;
let sym = pat[sib];
const ap = approach && sib >= approach.step;
if (approach && sib === approach.step) sym = 'A';
else if (ap) sym = '.';
if (shufDup(sib, pat[sib - 1] !== '.')) sym = '.';
if (sym !== '.' && sym !== '-') {
let len = 1;
if (sym !== 'A') while (sib + len < 16 && pat[sib + len] === '-') len++;
else len = 16 - sib;
const dur = len === 1 ? STEP * 0.72 : STEP * (len - 0.3);
const root = bassMidi({ rootPc });
const lc = sym.toLowerCase();
let m = sym === 'A' ? approach.m : bassNote(lc, root);
if (sym !== 'A') m = outerVoice(m, lc, root, t + swingT(sib), secBar * 16 + sib, sib);
const acc = sym !== lc;
const vel = (acc ? 1 : 0.8) * (0.86 + 0.14 * energy) * (0.84 + 0.16 * energy) * (1 - 0.3 * thin) * (ty === 'groove' && groove3 && pat !== song.bass.low ? 1.12 : 1);
const cut = mtof(m) * 1.8 + 1650 * Math.pow(energy, 1.4) + (ty === 'build' ? 700 * prog : 0);
voices.bass.note(og(t + swingT(sib)), m, dur, vel, cut, (450 + 2500 * energy) * (acc ? 1.35 : 1), { subMidi: subOf(root) });
lg({ t, v: 'bass', m, ap: sym === 'A' || undefined });
}
}
const u = leadOn;
const calm = ty === 'groove' || ty === 'intro';
const W = song.width || 0;
if (sec.activeCall && secBar < sec.activeCall.bar + 2) { if (!sec.activeCall.featured) callStep(sib, t, 0.5, 1900 + 1600 * energy); }
else if (ty === 'breakdown') {
const b16 = sec.bars >= 16 && secBar >= 12 && !u;
const A = b16 ? (sec.arp16 || (sec.arp16 = { ...song.arpBreak, rate: 1 })) : song.arpBreak;
arpStep(sib, t, A, 0.4 * (u ? 0.8 : 1) * (b16 ? 0.8 + 0.1 * (secBar - 12) : 1), (1200 + 1500 * energy) * (u ? 0.6 : 1) * (b16 ? 1.3 : 1), 0.2, (u ? 0.6 : 0.45) + 0.2 * W, u);
}
else if (ty === 'build' && prog > 0.4 && !(last && sec.gapEnd && sib >= 12)) {
const m = buildArpNote(prog); arpPos++;
voices.arp.note(t + swingT(sib), m, STEP * 0.85, (0.4 + 0.25 * prog) * (sib % 4 === 0 ? 1 : 0.72), 900 + 3200 * prog * prog, 0.08, (sib & 1) ? 0.32 : -0.32);
lg({ t, v: 'arp', m, motif: 1 });
} else if (layers.arp && !stopHit && !stopF) {
const A = (ty === 'drop' || ty === 'groove') && ((secBar >> 4) & 1) && song.arp2 ? song.arp2 : song.arp;
const lv = (0.42 + 0.22 * energy) * (calm ? 1.3 : 1) * (1 - 0.5 * thin) * (u ? 0.9 : 1) * (ty === 'drop' && trk().arpDb ? Math.pow(10, trk().arpDb / 20) : 1);
const cf = ((calm ? 1600 : 700) + 3600 * energy) * (u ? 0.85 : 1);
const fin8 = ty === 'drop' && sec.final && !sec.cruise && secBar >= sec.bars - 8;
const l4 = ty === 'drop' && !sec.cruise && sec.bars >= 16 && secBar % 16 >= 12;
const pk = dropRole() === 'peak';
arpStep(sib, t, A, lv, cf * (fin8 || l4 || pk ? 1.25 : 1), 0.07 + 0.06 * energy, (u ? 0.4 : 0.32) + 0.25 * W, u, (fin8 || l4) && !u ? 12 : 0, u ? pk : (l4 || fin8 || pk));
}
if (layers.gate && !gap && (ty === 'drop' || ty === 'groove' || ty === 'build')) {
const mask = (secBar & 8) ? song.gate2 : song.gate;
const gt = ty === 'drop' && !sec.cruise && song.padTrim ? Math.pow(10, song.padTrim / 20) : 1;
if (mask[sib] && !shufDup(sib, mask[sib - 1])) voices.pad.gate(og(t + swingT(sib)), STEP * 0.55, (0.62 + 0.3 * energy) * (ty === 'drop' ? 1.15 : 1) * (leadOn ? 1.3 : 1) * gt);
}
carrierStep(sib, t);
answerStep(sib, t);
extraStep(sib, t, gap);
leadStep(sib, t);
}
function outerVoice(m, lc, root, at, step, sib) {
if (state !== 'roam' || !sec || secBar < 0) return m;
const lm = leadNow(at, step);
if ('sbtof'.includes(lc) && clashIc(m, lm)) { lg({ t: at, ev: 'bassRoot', m, lead: lm }); m = root; }
if (sib === 0) {
const chg = chord !== lastDownChord;
lastDownChord = chord;
if (chg && lm != null) {
const oct = pcOf(m) === pcOf(lm);
if (oct && lastDownOct) { m = bassNote('t', root); lastDownOct = false; lg({ t: at, ev: 'bassThird', m }); } else lastDownOct = oct;
}
}
return m;
}
function extraStep(sib, t, gap = false) {
if (quiet || state !== 'roam' || !sec || secBar < 0) return;
const ty = sec.type, role = dropRole(), T = trk();
if (role === 'dbk' && sec.dbkBell) {
const bi = sec.dbkIdx || (sec.dbkIdx = new Map(sec.dbkBell.map((n) => [n.step, n])));
const n = bi.get(secBar * 16 + sib);
if (n) { const at = og(t + swingT(sib)); fx.bell(at, pic(n.midi, at), n.len * STEP, 0.26 * (n.vel ?? 1), { rev: 0.4, dly: 0.25 }); lg({ t, v: 'bell', m: n.midi, dbk: 1 }); }
}
const nv = ty === 'drop' && !sec.cruise && (role === 'lift' || role === 'peak') && !gap;
const P = T.perc;
if (nv && P && !inBlackout(t, 'hat')) {
if (P.kind === 'machine') {
const c = (P.pat || 'mmMmmmMmmmMmmmMm')[sib];
if (c !== '.' && !shufDup(sib, true)) hit(kit.tomH, og(t + swingT(sib)), { bus: sib & 2 ? 'tomR' : 'tomL', gain: c === 'M' ? 0.08 : 0.055, rate: 1.45 });
} else if (P.kind === 'ride') {
if ((sib & 3) === 2) hit(kit.rideBell, og(t + swingT(sib)), { bus: 'hatR', gain: 0.12 });
} else if (P.kind === 'taiko' && (!P.finalOnly || sec.theme === 'B' || sec.final)) {
if (sib === 0 || sib === 10) hit(kit.tomL, og(t + swingT(sib)), { bus: 'tomL', gain: sib === 0 ? 0.5 : 0.4, rate: 0.62 });
}
}
if (nv && T.spic) {
const c = T.spic.pat[sib];
if (c && c !== '.' && !shufDup(sib, true)) {
const r = 48 + ((chord.rootPc - 48) % 12 + 12) % 12;
const m = c === 'o' ? r + 12 : c === 'f' ? r + 7 : r;
fx.spic(og(t + swingT(sib)), m, 0.5 * (T.spic.acc && T.spic.acc[sib] === '1' ? 1 : 0.7) * (c === 'R' ? 1.15 : 1), (sib & 1) ? 0.25 : -0.25);
}
}
if (T.keys && voicing && (sib & 3) === 2 && !gap && (ty === 'groove' || nv)) {
const at = og(t + swingT(sib)), lm = leadNow(at, secBar * 16 + sib);
const ns = voicing.slice(1).map((m) => (m < 60 ? m + 12 : m)).filter((m) => !clashIc(m, lm));
if (ns.length) fx.keys(at, ns, STEP * 1.6, ty === 'groove' ? 0.2 : 0.16, (sib & 4) ? 0.25 : -0.25);
}
}
function answerStep(sib, t) {
if (!sec.verseAnswer || !sec.verseAnswer.length || quiet || !leadOn || t < leadMuteUntil - 1e-4) return;
const ai = sec.answerIdx || (sec.answerIdx = new Map(sec.verseAnswer.map((n) => [n.step, n])));
const n = ai.get(secBar * 16 + sib);
if (!n) return;
const at = og(t + swingT(sib));
fx.bell(at, pic(n.midi, at), n.len * STEP, 0.15 * (n.vel ?? 1), { rev: 0.42, dly: 0.3 });
lg({ t, v: 'answer', m: n.midi });
}
function carrierStep(sib, t) {
if (sec.type !== 'breakdown' || !sec.carrierNotes || !sec.carrierNotes.length || quiet) return;
const ci = sec.carrierIdx || (sec.carrierIdx = new Map(sec.carrierNotes.map((n) => [n.step, n])));
const n = ci.get(secBar * 16 + sib);
if (!n) return;
const at = og(t + swingT(sib)), dur = n.len * STEP;
if (song.bdCarrier === 'bell') fx.bell(at, n.midi, dur, 0.22 * n.vel, { rev: 0.5, dly: 0.3 });
else fx.choir(at, [n.midi - 12, n.midi], Math.max(SPB * 0.5, dur - 0.02), 0.26 * n.vel, 'ah', 0.12, 0.7);
lg({ t, v: 'carrier', m: n.midi, on: song.bdCarrier });
}
function rollStep(sib, t, from) {
const p = (sib - from) / (16 - from);
const v = 0.1 + 0.32 * p * p, rate = song.snareRate * (1.02 + 0.05 * p);
if (song.feel === 'shuffle') {
if ((sib & 3) !== 0) return;
const per = sib >= 12 ? 6 : 3;
for (let k = 0; k < per; k++) { const tk = t + k * SPB / per; if (per === 3 || (k & 1) === 0) og(tk); hit(K.snare, tk, { bus: 'snare', gain: v * (1 + 0.08 * k / per), rate }); }
return;
}
hit(K.snare, t, { bus: 'snare', gain: v, rate });
if (sib >= 12) hit(K.snare, t + STEP / 2, { bus: 'snare', gain: v * 0.9, rate: rate * 1.02 });
}
function stopTimeHit(t) {
kickAt(t, 1, 0.6, 0.11);
hit(kit.crash, t, { bus: 'cym', gain: 0.36, priority: true });
if (impactOK(t)) hit(kit.impact, t, { bus: 'fx', gain: 0.32, priority: true });
const K2 = K.backbeat === 'clap' ? K.clap : K.snareClap;
hit(K2, t, { bus: 'snare', gain: 0.5, rate: song.snareRate });
const bm = bassMidi({ rootPc: chord.rootPc });
voices.bass.note(t, bm, SPB * 0.9, 1, mtof(bm) * 2 + 1600, 2600, { subMidi: subOf(bm) });
lg({ t, ev: 'stopHit' });
}
function halfStep(rs, t, isReplay) {
const ty = isReplay ? 'replay' : sec.type;
const stopHit = !isReplay && fill === 'stopHit' && rs >= 8;
if (stopHit && rs === 8) { stopTimeHit(t); leadStep(rs, t); return; }
const gap = !isReplay && ((fill === 'gap' && rs >= 12) || stopHit);
const big = !isReplay && ty === 'drop';
const k = rs === 0 ? 1 : rs === 10 ? 0.85 : (rs === 7 && energy > 0.75) ? 0.68 : (big && rs === 14 && energy > 0.85) ? 0.62 : 0;
const kg = isReplay ? 1.3 : big ? 0.95 : 1.1;
if (k && !gap && !(kickOut && big && rs >= 8)) kickAt(t, kg * k, (isReplay ? 0.9 : big ? 0.5 : 0.5) * k * (isReplay ? 1 : 1.1), isReplay ? 0.17 : big ? 0.1 : 0.13, isReplay ? { d: 0.8 * k, rel: 0.12, pre: 0.06 } : { d: Math.max(0.75 * k, 0.7), rel: 0.12, pre: 0.07, subPre: true }, isReplay ? null : 0.085);
if (rs === 8 && !gap) {
const bb = K.backbeat;
hit(bb === 'clap' ? K.clap : bb === 'gated' ? K.sv.snareGated : K.snareClap, t + (isReplay ? 0 : 0.005), { bus: 'snare', gain: (isReplay ? 0.66 : big ? 0.66 : 0.6) * (isReplay ? 1 : perf.range(0.94, 1.06)), rate: song.snareRate * 0.9 });
} else if (!isReplay && layers.ghost && song.ghosts.includes(rs)) {
hit(K.snare, t, { bus: 'snare', gain: perf.range(0.06, 0.09), rate: song.snareRate * 1.05 });
}
if (!gap && !inBlackout(t, 'hat')) {
const acc = song.hatAcc ? song.hatAcc[rs] : 1;
if (rs % 2 === 0) hit(K.hatC, t + perf.float() * 0.002, { bus: rs % 4 ? 'hatR' : 'hatL', gain: (rs % 4 ? 0.11 : 0.065) * acc, rate: song.hatRate * 0.97 });
else if (!isReplay && layers.hats16) hit(K.hatC, t + swingT(rs) + perf.float() * 0.002, { bus: 'hatL', gain: 0.045 * acc, rate: song.hatRate });
if (rs === 14) hit(kit.hatO, t, { bus: 'hatR', gain: 0.09, rate: song.hatRate });
if (big && energy > 0.8 && (rs === 6 || rs === 7)) hit(K.hatC, t + STEP / 2, { bus: 'hatL', gain: 0.05 * acc, rate: song.hatRate * 1.04 });
}
if (isReplay) {
if (fill === 'toms' && rs >= 12) hit([kit.tomH, kit.tomM, kit.tomM, kit.tomL][rs - 12], t, { bus: rs & 1 ? 'tomR' : 'tomL', gain: 0.4 });
} else if (fill === 'roll' && rs >= 8) {
rollStep(rs, t, 8);
} else if (fill === 'roll16') {
rollStep(rs, t, 0);
} else if (fill === 'tomrun') {
const run = fillRun || TOM_RUN, c = run[rs];
if (c === 's' || c === 'S') hit(K.snare, t, { bus: 'snare', gain: c === 'S' ? 0.4 : 0.26, rate: song.snareRate });
else if (c !== '.') hit(c === 'h' ? kit.tomH : c === 'm' ? kit.tomM : kit.tomL, t, { bus: rs & 2 ? 'tomR' : 'tomL', gain: c === 'L' ? 0.46 : 0.36 });
} else if (fill === 'toms' && rs >= 12) {
hit([kit.tomH, kit.tomH, kit.tomM, kit.tomL][rs - 12], t, { bus: rs & 1 ? 'tomR' : 'tomL', gain: 0.4 });
} else if (sec.toms && ty === 'halftime') {
const c = sec.toms[rs];
if (c !== '.') hit(c === 'h' ? kit.tomH : c === 'm' ? kit.tomM : kit.tomL, t, { bus: rs & 2 ? 'tomR' : 'tomL', gain: (rs >= 12 ? 0.34 : 0.27) * (0.85 + 0.3 * energy) });
}
const step = isReplay ? -1 : secBar * 16 + rs;
const bh = !isReplay && sec.bassHead && sec.bassHead.length ? (sec.bhIndex || (sec.bhIndex = { m: new Map(sec.bassHead.map((n) => [n.step, n])), bars: new Set(sec.bassHead.map((n) => n.step >> 4)) })) : null;
if (bh && bh.bars.has(secBar)) {
const n = bh.m.get(step);
if (n && !gap && !inBlackout(t, 'low')) {
const root = bassMidi({ rootPc: chord.rootPc });
voices.bass.note(t, n.midi, n.len * STEP * 0.95, 0.95, mtof(n.midi) * 2.2 + 900 * energy, 2200, { dec: 0.3, sus: 0.75, sub: 0.4, subMidi: subOf(root) });
lg({ t, v: 'bass', m: n.midi, head: 1 });
if (trk().reeseLead && !quiet) { fx.reeseLead(t, n.midi + 12, n.len * STEP * 0.95, 0.2); lg({ t, v: 'reese', m: n.midi + 12 }); }
}
} else if (!gap && !inBlackout(t, 'low')) {
const pat = isReplay ? BASS_HALF : song.bass.half;
const sym = pat[rs];
if (sym !== '.' && sym !== '-') {
let len = 1;
while (rs + len < 16 && pat[rs + len] === '-') len++;
if (big && energy > 0.75 && rs < 7 && rs + len > 7) len = 7 - rs;
if (big && energy > 0.85 && rs < 14 && rs + len > 14) len = 14 - rs;
const P = !isReplay && !pivotOn && sec.plan ? sec.plan[secBar] : null;
const root = bassMidi({ rootPc: P && P.bass != null ? P.bass : chord.rootPc });
let m = bassNote(sym.toLowerCase(), root);
if (!isReplay) m = outerVoice(m, sym.toLowerCase(), root, t, secBar * 16 + rs, rs);
const acc = sym === sym.toUpperCase();
voices.bass.note(t, m, STEP * (len - 0.3), (acc ? 1 : 0.8) * (0.84 + 0.16 * energy), mtof(m) * 1.8 + 1300 * energy, 1800, { dec: 0.25, sus: 0.7, sub: 0.4, subMidi: subOf(root) });
lg({ t, v: 'bass', m });
}
}
if (isReplay) arpStep(rs, t, song.arpBreak, 0.4, 1600 + 1600 * energy, 0.22, 0.6);
else {
if (sec.activeCall && secBar < sec.activeCall.bar + 2) { if (!sec.activeCall.featured) callStep(rs, t, 0.5, 1900 + 1600 * energy); }
else if (layers.arp) {
const u = leadOn, l4 = ty === 'drop' && !sec.cruise && sec.bars >= 16 && secBar % 16 >= 12, pk = dropRole() === 'peak';
const ad = ty === 'drop' && trk().arpDb ? Math.pow(10, trk().arpDb / 20) : 1;
arpStep(rs, t, song.arpBreak, 0.34 * ad, (1300 + 1500 * energy) * (u ? 0.85 : 1), 0.2, 0.5 + 0.2 * (song.width || 0), u, l4 && !u ? 12 : 0, u ? pk : (l4 || pk));
}
const gt = ty === 'drop' && !sec.cruise && song.padTrim ? Math.pow(10, song.padTrim / 20) : 1;
if (layers.gate && ty === 'drop' && !gap) { const mask = (secBar & 8) ? song.gate2 : song.gate; if (mask[rs] && rs % 2 === 0) voices.pad.gate(t, STEP * 0.9, (0.7 + 0.3 * energy) * gt); }
if (sec.bellNotes && sec.bellNotes.length && !quiet) {
const bi = sec.bellIdx || (sec.bellIdx = new Map(sec.bellNotes.map((n) => [n.step, n])));
const n = bi.get(step);
if (n) { fx.bell(t, n.midi, n.len * STEP, 0.2 * n.vel, { rev: 0.4, dly: 0.3 }); lg({ t, v: 'bell', m: n.midi }); }
}
carrierStep(rs, t);
answerStep(rs, t);
extraStep(rs, t, gap);
leadStep(rs, t);
}
}
function menuChord(bar) {
const set = song.menu[Math.floor(bar / 16) % song.menu.length];
return set[bar % set.length];
}
function menuBarFn(t) {
menuBar++;
mark(t, { pos: menuBar, BAR, song, section: 'menu', kind: 'menu' });
if (menuBar % 16 === 0) {
menuSet = Math.floor(menuBar / 16) % song.menu.length;
mArp = menuArp(perf, clamp(song.arpMenu.base + perf.pick([0, 0, -3, 2, 4]), 63, 73));
}
if (menuBar % MENU_TRACK_BARS === MENU_TRACK_BARS - 16 && !upcoming) prepareNext();
if (menuBar % MENU_STATEMENT_EVERY === 1) {
const plan = []; for (let b = 0; b < 8; b++) plan.push({ chord: menuChord(menuBar + b) });
const T = leadTonic(song.keyPc) - 12;
const second = Math.floor(menuBar / MENU_STATEMENT_EVERY) % 2 === 1 && song.statement2;
menuLine = { bar0: menuBar, notes: fitLine(second ? song.statement2 : (song.menuStatement || song.statement), plan, { tonic: T, key: song.keyPc, mode: song.mode, max: T + (second ? 15 : 12) }) };
lg({ t, ev: 'motif', via: 'menu', second: second ? 1 : undefined });
}
if (menuBar % 16 === 0) voices.drone.note(t, droneMidi(song.keyPc));
let c = menuChord(menuBar);
const cyc = menuBar % MENU_TRACK_BARS;
if (cyc === MENU_TRACK_BARS - 1 && upcoming && upcoming.song && upcoming.song.keyPc !== song.keyPc) {
const sg = segueFor(song.keyPc, song.mode, upcoming.song);
c = sg.chord || chordSpec(upcoming.song.keyPc, 'V', upcoming.song.mode); menuPivot = true;
if (sg.kind === 'common') segueExtras(sg, t, BAR, upcoming.song);
lg({ t, ev: 'segue', kind: sg.chord ? sg.kind : 'V', menu: 1, from: song.keyPc, to: upcoming.song.keyPc });
}
const changed = setChord(c, t, 1, false);
if (changed || menuBar === 0) { const r2 = 43 + ((c.rootPc - 43) % 12 + 12) % 12; voices.strings.chord(t, [r2, r2 + 7]); }
if (changed || menuBar % 2 === 0) {
const bm = bassMidi(c);
const span = changed ? 1 : 2;
voices.bass.note(t, bm, span * BAR - 0.1, 0.16, mtof(bm) * MENU_DRONE_LP, 40, { atk: 0.35, dec: 1.2, sus: 0.9, rel: 0.5, sub: 0.4, subMidi: subOf(bm) });
}
if (menuBar % 8 === 4 && !quiet) fx.choir(t, choirNotes(), 2 * BAR - 0.1, 0.16, 'oo', 1.6, 1.4);
lg({ t, ev: 'bar', sec: 'menu', chord: chord.label, pcs: chord.pcs, sc: chord.scale, h: chord.harmonic, key: chord.keyPc, set: menuSet });
}
function menuStep(sib, t) {
arpStep(sib, t, mArp || song.arpMenu, 0.38, 2100, 0.3, 0.38);
if (menuLine && !quiet) {
const step = (menuBar - menuLine.bar0) * 16 + sib;
if (step >= 128) { menuLine = null; return; }
const i = menuLine.notes.findIndex((n) => n.step === step);
if (i >= 0) {
const n = menuLine.notes[i], dur = n.len * STEP;
fx.bell(t, n.midi, dur, 0.2 * n.vel, { dest: mix.menuBellIn });
if (n.role === 'head') fx.figure([{ t, m: n.midi, dur: Math.min(dur, 2 * SPB) * 0.95 }], 0.13 * n.vel, { oct: true, rel: 0.35, dest: fx.buses.fx, dly: 0.2 });
if (i === menuLine.notes.length - 1 || n.len >= 24) fx.choir(t, [n.midi - 12, n.midi], dur, 0.14, 'oo', 0.5, 1.4);
lg({ t, v: 'bell', m: n.midi });
}
}
}
function replayBarFn(t) {
replayBar++;
const c = song.chReplay[replayBar % song.chReplay.length];
setChord(c, t, 1, false);
if (state === 'replay') mark(t, { pos: (marks.length ? marks[marks.length - 1].pos : 0), BAR, song, section: 'replay', kind: 'replay', frozen: true });
if (replayBar === 0 && energy >= 0.45 && !quiet) fx.choir(t, choirNotes(), BAR - 0.05, 0.28, 'ah', 0.3, 1.2);
fill = replayBar % 4 === 3 ? 'toms' : null;
lg({ t, ev: 'bar', sec: 'replay', chord: chord.label, pcs: chord.pcs, sc: chord.scale, h: chord.harmonic, key: chord.keyPc });
}
function preStep(ts) {
const sib = nextStep & 15;
if (ring && ts >= ring.end - 1e-6 && state === 'roam') {
ring = null;
if (songEnded(ts)) return t0;
return ts;
}
if (roll && ts >= roll.at - 1e-6) {
const at = roll.at; roll = null;
anchorAt(at, BPM);
applyState('roam', at);
return t0;
}
if (phaseJump && state === 'roam' && ts >= phaseJump.at - 1e-6) {
const pj = phaseJump; phaseJump = null;
if (sec === pj.from && secBar >= 0) {
anchorAt(pj.at, BPM);
secBar = sec.bars - 1;
return t0;
}
}
if (trackSwitch && trackSwitch.pivot && ts >= trackSwitch.pivot.t - 1e-6 && state !== 'replay') {
const pv = trackSwitch.pivot; trackSwitch.pivot = null;
if (leadHeld) { voices.lead.release(pv.t); leadHeld = false; }
if (leadOn) { leadOn = false; mix.leadDip(pv.t, false); }
segue = { kind: pv.kind || 'V', chord: pv.chord, t: pv.t, until: trackSwitch.t, tone: pv.tone };
lg({ t: pv.t, ev: 'segue', kind: segue.kind, from: pv.from, to: trackSwitch.song && trackSwitch.song.keyPc, skip: 1 });
if (pv.chord) setChord(pv.chord, pv.t, 1, false);
if (pv.kind && pv.kind !== 'V') segueExtras(segue, pv.t, trackSwitch.t - pv.t, trackSwitch.song);
pivotOn = true;
if (state === 'menu') { const bm = bassMidi(pv.chord); voices.bass.note(pv.t, bm, trackSwitch.t - pv.t - 0.05, 0.16, mtof(bm) * MENU_DRONE_LP, 40, { atk: 0.2, dec: 1.2, sus: 0.9, rel: 0.3, sub: 0.4, subMidi: subMidi(bm) }); }
lg({ t: pv.t, ev: 'bar', sec: 'pivot', chord: pv.chord ? chord.label : '–', pcs: pv.chord ? chord.pcs : [], sc: chord.scale, h: chord.harmonic, key: chord.keyPc, segue: segue.kind });
}
if (pending && (sib === 0 || (sib === 8 && pending.grid === 'half'))) {
if (pending.name === 'replay') { anchorAt(ts, BPM); applyState('replay', ts, { crashOnly: !!pending.crashOnly }); return t0; }
applyState(pending.name, ts);
}
if ((sib === 0 || (trackSwitch && trackSwitch.beat)) && state !== 'replay') {
if (trackSwitch && (!trackSwitch.t || ts >= trackSwitch.t - 1e-6)) {
const ts2 = trackSwitch; trackSwitch = null;
if (ts2.listen && state === 'menu') { menuListen = true; voices.drone.level(ts, 0, 0.3); applyState('roam', ts, { listen: true }); }
ring = null;
loadTrack(ts2.idx, ts, { song: ts2.song, reason: ts2.reason, hits: true, entry: state === 'roam' ? 0 : null, now: !!ts2.now });
return t0;
}
if (sib !== 0) return ts;
if (state === 'roam' && !ring && secBar >= 0 && jumpTo < 0 && secIdx === song.sections.length - 1 && secBar + 1 >= sec.bars) {
if (song.ringOut) startRing(ts);
else if (songEnded(ts)) return t0;
}
if (state === 'menu' && !roll && menuBar >= 0 && (menuBar + 1) % MENU_TRACK_BARS === 0 && upcoming && upcoming.idx !== null) {
const up = upcoming;
loadTrack(up.idx, ts, { song: up.song, reason: 'menu' });
return t0;
}
}
return ts;
}
let ringNotified = false;
function startRing(t) {
ring = { t, end: t + RING_BARS * BAR };
if (!upcoming) prepareNext();
const nx = upcoming && upcoming.song;
if (nx) {
mark(t, { pos: 0, BAR, song: nx, section: 'lead-in', kind: 'roam', frozen: true });
notify(t, { ...trackInfo(nx), reason: 'end' });
ringNotified = true;
} else mark(t, { pos: song.totalBars, BAR, song, section: 'ending', kind: 'roam', frozen: true });
if (leadHeld) { voices.lead.release(t + BAR * 0.75); leadHeld = false; }
if (leadOn) { leadOn = false; mix.leadDip(t, false); }
voices.lead.octave(t, false);
choirBed = 0; syncChoir(t, false);
if (!quiet && !muted) {
hit(kit.crash, t, { bus: 'cym', gain: 0.3, priority: true });
kickAt(t, 0.85, 0.3, 0.2);
const bm = bassMidi({ rootPc: chord.rootPc });
voices.bass.note(t, bm, BAR * 0.95, 0.7, mtof(bm) * 1.6, 300, { atk: 0.004, dec: 0.5, sus: 0.6, rel: 0.3, sub: 0.45, subMidi: subOf(bm) });
}
lg({ t, ev: 'ring', end: ring.end, chord: chord.label });
}
function scheduleStep(n, t) {
if (ended) return;
const sib = n & 15;
if (leadHeld && t > leadHoldEnd + STEP * 0.5) { voices.lead.release(t); leadHeld = false; }
for (const o of ovr) if (!o.applied && o.t < t + STEP - 1e-6 && o.until > t) applyOverride(o);
if (hang && t >= hang.b - 1e-6) hang = null;
if (ring) { if ((sib & 3) === 0) onBeat(t, sib); return; }
if (state === 'replay') {
if (sib === 0) replayBarFn(t);
if ((sib & 3) === 0) onBeat(t, sib);
if (!quiet) halfStep(sib, t, true);
return;
}
if (sib === 0) { if (state === 'roam') roamBar(t); else menuBarFn(t); }
if ((sib & 3) === 0) onBeat(t, sib);
if (quiet) return;
if (state === 'roam') roamStep(sib, t); else menuStep(sib, t);
}
function airTick(now) {
const want = airIn >= 0.5 && state === 'roam';
if (want) {
if (airSince < 0) airSince = now;
if (!airOn && now - airSince >= 0.25) { airOn = true; flightT0 = airSince; mix.air(now + 0.005, true); padAir = 600; lg({ t: now, ev: 'air', on: 1 }); }
if (airOn && hang) hang.air = true;
} else {
airSince = -1;
if (airOn) {
airOn = false; padAir = 0;
if (flightT0 >= 0 && now - flightT0 >= 2 && Math.max(iSm, iTarget) >= 0.65 && state === 'roam' && postDrop >= POST_DROP_BARS) { hypeReq = now + 4 * BAR; lg({ t: now, ev: 'hypeReq', why: 'flight', sec: +(now - flightT0).toFixed(2) }); }
flightT0 = -1;
const tn = nextGrid(now + 0.02, STEP);
mix.air(tn, false);
cancelAirRiser(tn);
if (hang && hang.air && hang.land == null && state === 'roam' && !muted) {
land(now, nextGrid(now + 0.02, SPB / 2), hang.sf || 1, 'touchdown');
} else if (state === 'roam' && !quiet && !muted && Math.abs(tn - lastLandAt) >= 0.25) {
const onKick = Math.round((tn - t0) / STEP) % 4 === 0 && song.feel !== 'half';
const srcs = [];
if (!onKick) { const kb = kick(); srcs.push(fx.hit(kb, tn, { bus: 'kick', gain: 0.9, priority: true })); mix.subDuck(tn); voices.bass.kickSync(tn, kb); }
mix.pump(tn, 0.5);
srcs.push(hit(kit.subDrop, tn, { bus: 'fx', gain: 0.32, priority: true }));
airAccent = { t: tn, srcs: srcs.filter(Boolean) };
lg({ t: tn, ev: 'airAccent' });
}
lg({ t: tn, ev: 'air', on: 0 });
}
}
}
function tick() {
if (disposed || !running) return;
const now = ctx.currentTime;
if (notifyQ.length) {
const a = now - (ctx.outputLatency || 0) - mix.latency;
while (notifyQ.length && notifyQ[0].at <= a + 1e-6) { const e = notifyQ.shift(); heardNow(e.info); for (const cb of listeners) { try { cb(e.info); } catch (er) {   } } }
}
if (stopAt && now >= stopAt) { halt(); return; }
const hidden = typeof document !== 'undefined' && document.hidden;
const horizon = now + (hidden ? HIDDEN_LOOKAHEAD : mode === 'listen' || menuListen || state === 'menu' ? QUICK_LOOKAHEAD : LOOKAHEAD);
if (pendingLead && voices && now >= pendingLead.at) { voices.lead.timbre(pendingLead.name, now); pendingLead = null; }
if (voices) airTick(now);
let ts = t0 + nextStep * STEP;
if (ts < now - 0.03) {
const target = now + 0.01;
quiet = true;
let guard = 0;
while (ts < target && guard++ < 20000) { ts = preStep(ts); scheduleStep(nextStep, ts); nextStep++; ts = t0 + nextStep * STEP; }
}
if (voices) voices.idle(now);
pollLanding();
let guard = 0;
while (ts < horizon && guard++ < 256 && running) {
quiet = muted && ts > mutedAt + 0.25;
ts = preStep(ts);
if (!running) break;
scheduleStep(nextStep, ts);
nextStep++;
ts = t0 + nextStep * STEP;
}
quiet = false;
}
function halt() {
running = false; stopAt = 0;
if (timer) { clearInterval(timer); timer = null; }
fx.cut(ctx.currentTime);
if (voices) { voices.dispose(); voices = null; }
leadHeld = false; rampH = null; rampSwell = null; bassTimbreNow = null; pendingLead = null; airOn = false; padAir = 0;
}
function nowPlaying() {
const a = running ? audible() : (marks.length ? marks[marks.length - 1].t : 0);
let mk = null;
for (let i = marks.length - 1; i >= 0; i--) if (marks[i].t <= a + 1e-6) { mk = marks[i]; break; }
if (!running && mk && mk.song !== song) mk = null;
if (immediate && (!running || a >= immediate.until - 1e-6)) immediate = null;
if (immediate) mk = null;
const s = immediate ? immediate.song : mk ? mk.song : song;
const info = trackInfo(s);
let pos = 0, section = state === 'roam' ? (sec ? sec.type : 'intro') : state;
if (mk) {
section = mk.section;
const frac = mk.frozen ? 0 : clamp((a - mk.t) / mk.BAR, 0, 1);
pos = (mk.pos + frac) * mk.BAR;
}
const menu = mk ? mk.kind === 'menu' : state === 'menu';
let durationSec = info.durationSec;
if (menu) { durationSec = +(MENU_TRACK_BARS * 240 / (s.bpm || BPM)).toFixed(2); pos = mk ? ((mk.pos % MENU_TRACK_BARS) + clamp((a - mk.t) / mk.BAR, 0, 1)) * mk.BAR : 0; }
if (durationSec != null) pos = Math.min(pos, durationSec);
const q = queueIdx(2), up = s !== song && q[0] === info.index ? q[1] : q[0];
return {
id: info.id, title: info.title, artist: info.artist, album: info.album, accent: info.accent, bpm: info.bpm, key: info.key, index: info.index,
positionSec: +pos.toFixed(3), durationSec, section, playing: running && !stopAt && !paused, state: pending ? pending.name : menuListen ? 'menu' : state,
progress: durationSec ? clamp(pos / durationSec, 0, 1) : null, mode, shuffle, repeat, menuListen,
upNext: brief(up), order: gameOrder() ? 'session' : shuffle ? 'shuffle' : repeat === 'one' ? 'repeat-one' : 'album',
};
}
const hotNow = () => state === 'roam' && !menuListen && energy >= 0.7 && (sec.type === 'drop' || sec.type === 'build');
const harmonyOK = () => state === 'roam' && !ring && !menuListen && !pivotOn && !trackSwitch
&& !(secIdx === song.sections.length - 1 && secBar >= sec.bars - 2 && !song.ringOut);
function featureClaim(tq, len, kind) {
if (tq < featureUntil - 1e-4 || ((kind === 'bank' || kind === 'lineup') && inHang(tq))) return false;
featureUntil = tq + len;
return true;
}
function stHit(buf, t, gain, isImpact = false) {
if (isImpact && !impactOK(t)) return null;
return fx.hit(buf, t, { bus: 'st', priority: true, gain });
}
function demoted(t, kind, gi, gc) {
stHit(kit.impact, t, gi * 0.6, true);
fx.hit(kit.crash, t, { bus: 'st', priority: true, gain: gc * 0.6 });
lg({ t, ev: 'demoted', kind });
}
function hookNotes(fig, tq, T, cmode) {
return fig.map((f) => {
const t = tq + stepT(f.k);
const ov = ovrAt(t), c = ov ? ov.chord : chord;
let m = degMidi(f.d, T, cmode);
if (!c.scale.includes(pcOf(m))) {
let up = m, dn = m;
while (!c.scale.includes(pcOf(up))) up++;
while (!c.scale.includes(pcOf(dn))) dn--;
m = up - m <= m - dn ? up : dn;
}
const lm = leadAt(t);
const clash = (x) => lm != null && [1, 6, 11].includes(((x - lm) % 12 + 12) % 12);
if (clash(m)) {
let best = null;
for (let d2 = 1; d2 <= 7 && best == null; d2++) for (const x of [m - d2, m + d2]) if (c.pcs.includes(pcOf(x)) && !clash(x)) { best = x; break; }
if (best != null) { m = best; lg({ t, ev: 'declash', lead: lm, m }); }
}
return { t, m, dur: f.l * STEP * 0.9, v: f.k >= 3 ? 1.1 : 1 };
});
}
function airStinger(tq, s, o) {
const now = ctx.currentTime;
if (o.extend && airRiser && airRiser.riser && now < airRiser.hold) {
const ne = Math.max(now + 0.1, now + clamp(Number(o.eta) || 0, 0, 3));
if (ne <= airRiser.end + 0.02) return;
airRiser.riser.extend(ne + 0.5); if (airRiser.choir) airRiser.choir.extend(ne);
airRiser.end = ne; airRiser.hold = ne + 0.5;
mix.airDip(now, ne);
const rd = Math.min(ne - now - 0.02, kit.crashRev.duration, 2 * SPB);
if (rd > 0.25) {
if (airRiser.crash && airRiser.crash._gn) { const g = airRiser.crash._gn.gain; if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now + 0.02); else g.cancelScheduledValues(now + 0.02); g.setTargetAtTime(0, now + 0.02, 0.05); }
airRiser.crash = fx.hit(kit.crashRev, ne - rd, { bus: 'st', priority: true, gain: 0.3 * Math.min(1, s), offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6 });
}
lg({ t: now, ev: 'airExtend', end: ne });
return;
}
const dur = clamp(Number(o.eta) || 1.6, 0.4, 4.0);
cancelAirRiser(tq);
const ty = state === 'roam' && sec ? sec.type : 'menu';
const full = (ty === 'drop' && !sec.cruise) || ((ty === 'groove' || ty === 'halftime') && (energy >= 0.5 || listenNow()));
let lv = state !== 'roam' || ty === 'intro' || ty === 'breakdown' || menuListen ? 0.45 : full ? (ty === 'drop' ? 1.25 : 0.55) : 0.5;
if (full && ty === 'drop' && trk().dropLufs != null) lv *= 1 + 0.12 * (trk().dropLufs + 13);
const sf = Math.min(1, s);
const r = fx.riser(tq, dur, lv * sf, { f0: 400, f1: 9000, midi: riserMidi(chord), pitched: 0.4, dest: fx.buses.st, hover: true });
const hold = tq + Math.min(5, dur + 0.8);
if (r) r.extend(hold);
const rd = Math.min(dur, kit.crashRev.duration);
const c = fx.hit(kit.crashRev, tq + dur - rd, { bus: 'st', priority: true, gain: 0.3 * sf, offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6 });
let ch = null;
if (!quiet && dur >= 0.6 && state === 'roam') {
const root = pcAbove(chord.rootPc, 52);
ch = fx.choir(tq, [root, root + 7, root + 12], dur, 0.2 * sf, 'oo', dur, 0.5, mix.choirFx, { from: 0.5 });
}
mix.airDip(tq, tq + dur);
airRiser = { riser: r, crash: c, choir: ch, t: tq, end: tq + dur, hold };
iFloorUntil = Math.max(iFloorUntil, tq + dur + 4 * BAR);
lg({ t: tq, ev: 'airRiser', dur, lv: +lv.toFixed(3) });
}
let lastLandAt = -Infinity;
function picardyNext(s2, b) {
if (!s2 || !s2.plan || b < 0 || b >= s2.plan.length) return false;
const c = s2.plan[b].chord, k = s2.keyPc ?? song.keyPc, md = s2.mode || song.mode;
if (c.rootPc !== k || !c.pcs.includes((k + 3) % 12)) return false;
s2.plan[b] = { chord: chordSpec(k, md === 'dorian' ? 'IV' : 'bVI', md), bass: null };
lg({ t: barT, ev: 'picardyNext', bar: b, chord: s2.plan[b].chord.label });
return true;
}
const barOf = (t) => secBar + Math.floor((t - barT) / BAR + 1e-6);
function leadAfter(first, nb, landBar, changed, longMute = false) {
if (!(state === 'roam' && sec && sec.type === 'drop' && sec.theme && !sec.cruise && !listenNow() && nb < sec.bars)) return null;
const muted = longMute || barT + (nb - secBar) * BAR - first >= BAR - 1e-3;
const late = (landBar & 7) >= 6;
const nb2 = nb + (nb & 1);
if ((late || muted) && roamBars + (nb2 - secBar) - lastHeadAt >= HEAD_GAP_BARS && nb2 < sec.bars) {
leadFrom(song, sec, nb2);
lastHeadAt = roamBars + (nb2 - secBar);
sec.leadLow = sec.leadNotes.length ? Math.min(...sec.leadNotes.map((n) => n.midi)) : 72;
lg({ t: barT + (nb2 - secBar) * BAR, ev: 'leadFrom', bar: nb2, why: muted ? 'muted' : 'late' });
return 'head';
}
if (changed) { const k = refitBar(song, sec, nb); if (k) lg({ t: barT + (nb - secBar) * BAR, ev: 'refit', bar: nb, notes: k }); }
lg({ t: barT + (nb - secBar) * BAR, ev: 'leadResume', bar: nb });
return 'resume';
}
function landingDrop(L, barEnd) {
if (state !== 'roam' || listenNow() || mode !== 'adaptive' || forcedDropBars > 0 || hang || !harmonyOK() || secBar < 0) return null;
const ty = sec.type, bL = barOf(L);
if (ty === 'drop') {
if (!sec.cruise || !sec.theme) return null;
sec.cruise = false; hypeCooldown = Math.max(hypeCooldown, 16); lastHeadAt = roamBars;
forcedDropBars = FORCED_DROP_BARS;
lg({ t: L, ev: 'landingDrop', kind: 'upgrade' });
return { upgrade: true };
}
if (postDrop < POST_DROP_BARS || sec.active) return null;
const late = (ty === 'build' && !sec.lift && bL >= sec.bars - 4) || ((ty === 'groove' || ty === 'halftime' || ty === 'breakdown') && bL >= 8);
if (!late || bL >= sec.bars || bL < secBar) return null;
const anchorOK = L - horizonT() >= 0.05;
const atBar = anchorOK ? bL + 1 : barOf(barEnd);
if (atBar >= sec.bars) return null;
const di = landDrop(song, secIdx, atBar);
if (di < 0) return null;
const drop = song.sections[di];
forcedDropBars = FORCED_DROP_BARS;
if (anchorOK) { phaseJump = { at: L, from: sec }; drop.landedAt = L; }
else drop.landedSoft = true;
if (secRiser && secRiser.cancel) secRiser.cancel(anchorOK ? L : barT + (atBar - secBar) * BAR);
drop.inserted = false; drop.full = true;
lg({ t: L, ev: 'landingDrop', kind: anchorOK ? 'anchor' : 'barLine', from: ty, bar: bL, drop: di, bars: drop.bars });
return { drop, anchor: anchorOK };
}
function land(tq, L, s, how, o = {}) {
lastLandAt = L;
const H = { L, at: o.at ?? null, how, s, o, srcs: [], ovr: [], first: Math.min(tq, L), victory: false, prevVictory: lastVictory, prevVictories: victories, tq };
const keep = (x) => { if (Array.isArray(x)) { for (const y of x) if (y) H.srcs.push(y); } else if (x) H.srcs.push(x); return x; };
const Lh = o.hitT ?? L + mix.latency - mix.stLatency, Li = o.impT ?? Math.max(ctx.currentTime + 0.005, Lh - LAND_ONSET);
if (airAccent && Math.abs(airAccent.t - L) < 0.25) { for (const x of airAccent.srcs) { try { x.stop(Math.max(ctx.currentTime, airAccent.t)); } catch (e) {   } } lg({ t: airAccent.t, ev: 'airAccentDrop', land: L }); airAccent = null; }
const inDrop = state === 'roam' && sec && sec.type === 'drop' && !sec.cruise;
const sf = Math.min(1, s), sh = inDrop ? Math.max(0.8, Math.min(1.15, s)) : Math.min(1.15, s), hot = hotNow(), K16 = hot ? 1.6 : 1;
const key = chord ? chord.keyPc : song.keyPc, cmode = (chord && chord.mode) || song.mode;
const live = rampH && tq < rampH.end + 0.3;
const r = rampH && rampH.root ? rampH.root : (key + 48 > 59 ? key + 36 : key + 48);
if (rampH) { rampH.release(Math.max(tq + 0.02, L - 2 * STEP)); rampH = null; }
if (rampSwell) { try { rampSwell.stop(L); } catch (e) {   } rampSwell = null; }
if (live) mix.undip(Math.max(tq, L - 0.15), 0.15);
const wasHang = !!hang;
if (hang) { hang.b = Math.min(hang.b, L); hang.land = L; for (const ov of ovr) if (ov.until > L) ov.until = L; leadMuteUntil = Math.min(leadMuteUntil, L); }
if (blackout && blackout.b > L) { blackout.b = L; mix.unblackout(L); }
cancelAirRiser(L);
if (!featureClaim(tq, L - tq + SPB, 'rampEnd')) { demoted(L, how, 0.65 * sh, 0.6 * sh); return H; }
let victory = s >= 1.2;
if (victory && !(o.pb || victories === 0 || L - lastVictory >= VICTORY_GAP)) { victory = false; lg({ t: tq, ev: 'victoryHeld', since: +(L - lastVictory).toFixed(2) }); }
if (victory) { lastVictory = L; victories++; }
H.victory = victory;
const barEnd = Math.max(nextGrid(L + SPB - 1e-3, BAR), L + SPB);
const ld = !wasHang && how !== 'auto' && o.drop !== false ? landingDrop(L, barEnd) : null;
const anchorDrop = !!(ld && ld.anchor);
H.ld = ld;
const ni = anchorDrop && !victory ? chordAt(ld.drop, 0) : chordSpec(key, victory ? 'I' : tonicSpec(cmode), cmode);
const motif = true;
const notes = [];
const E = SPB / 2, pa = Math.max(tq, Lh - 2 * E), pm = Lh - pa >= 2 * E - 1e-3 ? Lh - E : pa + (Lh - pa) / 2;
const third = r + ((ni.pcs[1] - key + 12) % 12);
const kind = victory ? -1 : plainLands++ % 3;
H.kind = kind;
const PICK = { '-1': [r + 20, r + 22, r + 24], 0: [r + 20, r + 19, r + 24], 1: [r + 17, third, r + 12], 2: [r + 31, r + 24, r + 12] }[kind];
if (motif && Lh - pa >= 2 * STEP - 1e-3) {
notes.push({ t: pa, m: PICK[0], dur: Math.max(STEP * 0.9, pm - pa - 0.01), v: 0.9 });
notes.push({ t: pm, m: PICK[1], dur: Math.max(STEP * 0.9, Lh - pm - 0.01) });
}
notes.push({ t: Lh, m: PICK[2], dur: SPB * 3, v: 1.1 });
H.first = Math.min(H.first, notes[0].t);
keep(leitmotif(notes, 0.32 * sf * K16, { rel: 0.3, dest: fx.buses.st }));
keep(stHit(kit.impact, Li, 0.75 * sh * (hot ? 1.4 : 1) * (victory ? 1.58 : 1), true));
keep(fx.hit(kit.crash, Lh, { bus: 'st', priority: true, gain: 0.7 * sh }));
keep(fx.hit(kit.subDrop, Li, { bus: 'st', priority: true, gain: 0.8 * sh }));
keep(fx.choir(Lh, ni.pcs.map((pc) => pcAbove(pc, 57)), SPB * 2, 0.55 * sf * K16 * (victory ? 1.41 : 1), 'ah', 0.04, 0.8, mix.choirFx));
mix.bedDuck(L, victory ? 1.5 : 3 + 2 * Math.min(1, s), SPB - 0.05, 0.12);
const third3 = !victory && kind === 2;
if ((victory || third3) && !quiet) {
if (braamOK(Li)) { keep(fx.braam(Li, braamMidi(ni.rootPc), BRAAM_K * (victory ? 1.2 : 0.75) * sf, 2.5, fx.buses.st)); lastBraam = Li; lg({ t: L, ev: 'braam', m: braamMidi(ni.rootPc), victory: victory ? 1 : undefined, landing: 1 }); }
else keep(playSig(Lh - TAIKO_ONSET, 'taiko', 0.42, 0, fx.buses.st));
}
const barEnd2 = anchorDrop ? L + BAR : barEnd;
if (harmonyOK()) {
let first = L;
const tri = song.feel === 'shuffle';
const g8 = nextGrid(L - 0.03, tri ? SPB / 3 : SPB / 2), g16 = nextGrid(L - 0.03, tri ? SPB / 6 : STEP);
const oT = anchorDrop || o.short ? L : (g8 - (L - 0.03) <= (tri ? SPB / 6 : STEP) + 1e-6 ? g8 : g16);
H.oT = oT;
if (victory) {
const nVI = chordSpec(key, 'bVI', cmode), nVII = chordSpec(key, 'bVII', cmode);
const a0 = Math.max(tq, L - 2 * SPB);
const tVII = L - SPB > a0 + 0.05 ? L - SPB : pm;
if (tVII > a0 + 0.02) H.ovr.push(override(a0, tVII, nVI));
H.ovr.push(override(Math.max(a0, tVII), oT, nVII));
first = Math.min(a0, tVII);
lg({ t: L, ev: 'victory', land: L });
}
const oi = override(oT, Math.max(barEnd2, oT + STEP), ni);
if (victory) oi.major = true;
H.ovr.push(oi);
H.first = Math.min(H.first, first);
muteLead(first, anchorDrop ? L : barEnd);
leadResumeAt = -1;
if (anchorDrop) {
if (victory && picardyNext(ld.drop, 1)) refitBar(song, ld.drop, 1);
lastHeadAt = roamBars;
} else if (state === 'roam' && sec) {
const nb = barOf(barEnd);
const ch = victory && nb < sec.bars ? picardyNext(sec, nb) : false;
H.lead = leadAfter(first, nb, barOf(L), ch, wasHang);
}
}
lg({ t: tq, ev: 'hook', via: 'rampEnd', pickup: 1, land: L, at: o.at, how, victory: victory || undefined, pick: kind, drop: ld ? (ld.anchor ? 'anchor' : ld.upgrade ? 'upgrade' : 'barLine') : undefined });
lg({ t: tq, ev: 'landing', how, land: L, at: o.at, victory: victory || undefined, pick: kind, drop: ld ? (ld.anchor ? 'anchor' : ld.upgrade ? 'upgrade' : 'barLine') : undefined });
figureAt = L;
while (landTimes.length && landTimes[0] < L - 8 * BAR) landTimes.shift();
landTimes.push(L);
if (landTimes.length >= 2 && !ld && postDrop >= POST_DROP_BARS) { hypeReq = L + 4 * BAR; lg({ t: L, ev: 'hypeReq', why: 'landings' }); }
if (s >= 1) iFloorUntil = Math.max(iFloorUntil, L + 4 * BAR);
landing = H;
return H;
}
function unland(H, t) {
for (const x of H.srcs) { try { if (x.stop) x.stop(t); } catch (e) {   } }
let reset = false;
for (const ov of H.ovr) {
const i = ovr.indexOf(ov);
if (ov.applied && ov.t > t && state === 'roam' && sec && !reset) { chord = null; setChord(chordAt(sec, clamp(barOf(ov.t), 0, sec.bars - 1)), ov.t, 1); reset = true; }
if (i >= 0) ovr.splice(i, 1);
}
mix.bedRestore(t);
if (H.victory) { lastVictory = H.prevVictory; victories = H.prevVictories; } else if (H.kind != null && H.kind >= 0) plainLands--;
if (H.ld) {
if (H.ld.drop) { H.ld.drop.landedAt = null; H.ld.drop.landedSoft = false; }
if (phaseJump) phaseJump = null;
forcedDropBars = 0;
}
leadMuteUntil = Math.min(leadMuteUntil, t); leadResumeAt = nextGrid(t + 1e-3, BAR);
lastLandAt = -Infinity; featureUntil = Math.min(featureUntil, t);
lg({ t, ev: 'landingUndone', land: H.L });
}
function queueLanding(at, s, how, o = {}) {
const p = { at, s, how, o: { ...o, at, short: at - ctx.currentTime < 0.15 } };
retimeP(p, at);
pendingLand = p;
lastLandAt = p.L;
pollLanding();
}
function retimeP(p, at) {
p.at = at; p.L = at - mix.latency;
p.o.at = at; p.o.hitT = at - mix.stLatency; p.o.impT = at - mix.stLatency - LAND_ONSET;
}
function pollLanding() {
if (!pendingLand || !running) return;
const hidden = typeof document !== 'undefined' && document.hidden;
const reach = ctx.currentTime + (hidden ? HIDDEN_LOOKAHEAD : LOOKAHEAD) + 0.15;
if (reach >= pendingLand.L - 2 * SPB - 0.05) execLanding(pendingLand);
}
function execLanding(p) {
pendingLand = null;
const now = ctx.currentTime, tq = Math.max(nextGrid(now + 0.025, STEP), p.L - 2 * SPB);
land(Math.min(tq, p.L), p.L, p.s, p.how, p.o);
}
function hangBar(t) {
if (!hang || hang.land != null || t < hang.a - 1e-4) return;
if (t >= hang.b - 1e-4) { hang = null; return; }
if (hang.b > t + BAR + 1e-3) return;
if (hang.b + BAR <= hang.max + 1e-3) {
hang.b += BAR;
if (hang.ovr) hang.ovr.until = hang.b;
leadMuteUntil = Math.max(leadMuteUntil, hang.b);
if (blackout && blackout.kinds) { blackout.b = hang.b - SPB / 2; mix.blackout(t, blackout.b - t, ['kick', 'low']); }
if (rampSwell) { try { rampSwell.stop(t); } catch (e) {   } }
const rd = SPB * 2;
rampSwell = fx.hit(kit.crashRev, hang.b - rd, { bus: 'st', priority: true, gain: 0.4 * hang.sf, offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6 });
const xb = Math.round((hang.b - hang.a) / BAR);
if (rampH && rampH.swell) rampH.swell(t, Math.pow(10, Math.min(4.5, 1.5 * Math.max(0, xb - 2)) / 20));
lg({ t, ev: 'hangExtend', end: hang.b, bars: xb });
} else if (hang.dropCap) {
hang.land = hang.b;
if (rampH) { rampH.release(hang.b); rampH = null; }
rampSwell = null;
lg({ t, ev: 'hangEnd', why: 'drop', at: hang.b });
} else land(t, hang.b, hang.sf, 'auto');
}
const api = {
start(so) {
if (disposed) return;
const now = ctx.currentTime;
const fadeTau = so && so.resume ? 0.12 : 0.02;
paused = false;
if (running && ended) halt();
ended = false;
if (running) {
if (stopAt) { stopAt = 0; mix.fadeTo(now, 1, so && so.resume ? 0.12 : 0.08); }
return;
}
running = true; stopAt = 0;
voices = preVoices || createVoices(ctx, mix, kit);
preVoices = null;
voicing = null; leadHeld = false; leadOn = false; choirOn = 0;
bassTimbre(now, state === 'menu' ? 'drone' : roamBassTimbre(), 0.001);
voices.arp.patch(now, patchOf(song)); voices.pad.patch(now, patchOf(song));
voices.lead.timbre(song.leadTimbre, now);
anchors.length = 0;
anchorAt(now + 0.06, song.bpm);
mix.setBpm(now, song.bpm);
mix.setTrackGain(now, trimDb(song), 0.02);
songMix(now);
refreshRing();
replayAt = -1; replayEnd = Infinity;
if (state === 'roam' && secBar >= 0) secBar = Math.max(-1, secBar - 1);
if (state === 'menu') { menuBar = -1; menuLine = null; }
if (state === 'replay') { replayBar = -1; replayAt = t0; }
mix.fadeTo(now, 1, fadeTau);
mix.hpReset(now);
if (!manual) timer = setInterval(tick, INTERVAL);
if (!marks.length) notify(t0, { ...trackInfo(song), reason: 'start' });
tick();
},
*prepare() {
if (disposed || running || voices || preVoices) return;
const v = yield* createVoicesSteps(ctx, mix, kit);
if (disposed || running || preVoices) { try { v.dispose(); } catch (e) {   } return; }
preVoices = v;
if (typeof kit.hallSteps === 'function') { yield* kit.hallSteps(); yield 'music.hallIR'; }
if (!disposed && typeof mix.prewarmHall === 'function') { mix.prewarmHall(); yield 'music.hall'; }
},
stop(fadeSec = 1) {
if (!running || disposed) return;
const now = ctx.currentTime, f = Math.max(0.02, Number(fadeSec) || 0);
mix.fadeTo(now, 0, f / 6);
stopAt = now + f + 0.05;
},
pause() { if (!running || paused) return; api.stop(0.15); paused = true; },
resume() { if (!paused && running) return; paused = false; api.start({ resume: true }); },
setState(name, o) {
if (!MUSIC_STATES.includes(name)) return;
if (name === 'roam' && (state === 'menu' || menuListen) && mode === 'listen' && !(o && o.keepMode)) { mode = 'adaptive'; refreshRing(); if (running) mix.setTrackGain(ctx.currentTime, trimDb(song), 0.5); lg({ t: ctx.currentTime, ev: 'mode', to: 'adaptive', why: 'roam' }); }
if (!running) { state = name; pending = null; roll = null; menuListen = false; if (name === 'roam' && secBar < 0) secIdx = entrySection(); return; }
if (menuListen) {
if (name === 'menu') return;
menuListen = false; pressed = true; dropsSinceEntry = 1;
refreshRing();
lg({ t: horizonT(), ev: 'state', from: 'menu', to: name, kind: 'inPlace' });
if (name === 'roam') return;
}
if (name === state && !roll) { pending = null; return; }
if (state === 'menu' && name === 'roam') {
if (roll) return;
const h = horizonT();
let at;
if (o && Number.isFinite(o.at) && o.at - ctx.currentTime >= 0.3) at = Math.max(o.at, h + 0.02);
else at = nextGrid(h + 0.005, SPB) + 2 * SPB;
roll = { at };
pending = null;
const long = !!(o && Number.isFinite(o.at)) && at - ctx.currentTime >= 1.5;
const mid = !long && !!(o && Number.isFinite(o.at)) && at - ctx.currentTime >= 0.5;
if (!muted) {
if (mid) {
const rd = Math.max(0.1, at - h - 0.01), rc = Math.min(rd, kit.crashRev.duration);
fx.hit(kit.crashRev, at - rc, { bus: 'cym', gain: 0.28, offset: kit.crashRev.duration - rc, dur: rc, fadeIn: rc * 0.6, priority: true });
fx.riser(at - rd, rd, 0.2, { ...(song.riser || {}), midi: riserMidi(chord), f0: 400, f1: 9000 });
const r0 = at - SPB / 2;
for (let k = 0; k < 8; k++) {
const tk = r0 + k * SPB / 16;
if (tk < h + 0.005) continue;
const p = k / 7;
fx.hit(K.snare, tk, { bus: 'snare', gain: 0.1 + 0.26 * p * p, rate: song.snareRate * (1 + 0.05 * p), priority: true });
}
} else if (long) {
const rd = Math.min(BAR, at - h - 0.01);
fx.hit(kit.crashRev, at - Math.min(rd, 2 * SPB), { bus: 'cym', gain: 0.28, offset: kit.crashRev.duration - Math.min(rd, 2 * SPB), dur: Math.min(rd, 2 * SPB), fadeIn: Math.min(rd, 2 * SPB) * 0.6, priority: true });
fx.riser(at - rd, rd, 0.2, { ...(song.riser || {}), midi: riserMidi(chord), f0: 400, f1: 9000 });
for (let k = 0; k < 16; k++) {
const tk = at - BAR + k * STEP;
if (tk < h + 0.005) continue;
const p = k / 15, v = 0.08 + 0.3 * p * p;
fx.hit(K.snare, tk, { bus: 'snare', gain: v, rate: song.snareRate * (1 + 0.05 * p), priority: true });
if (k >= 12) fx.hit(K.snare, tk + STEP / 2, { bus: 'snare', gain: v * 0.9, rate: song.snareRate * 1.06, priority: true });
}
} else {
const rd = Math.min(2 * SPB, at - h - 0.01);
if (rd > 0.1) {
fx.hit(kit.crashRev, at - rd, { bus: 'cym', gain: 0.25, offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6, priority: true });
fx.riser(at - rd, rd, 0.25 * 0.6, { midi: riserMidi(chord), f0: 600, f1: 9000 });
}
}
}
lg({ t: at, ev: 'preroll', long: long || undefined, mid: mid || undefined });
return;
}
if (roll && name === 'menu') { roll = null; return; }
pending = { name, grid: name === 'replay' ? 'half' : 'bar', crashOnly: !!(o && o.crashOnly) };
},
setIntensity(x) { iTarget = clamp01(Number(x) || 0); },
setAir(x) {
const was = airIn;
airIn = clamp01(Number(x) || 0);
if (was >= 0.5 && airIn < 0.5 && airRiser && running) cancelAirRiser(nextGrid(ctx.currentTime + 0.01, STEP));
},
setMode(m) {
if (!MUSIC_MODES.includes(m) || m === mode) return;
sessionOrder = m === 'listen' && mode === 'adaptive' && !menuListen;
mode = m;
refreshRing();
if (running) mix.setTrackGain(ctx.currentTime, trimDb(song), 0.5);
},
get mode() { return mode; },
stinger(kind, strength = 1, o = {}) {
if (!running || disposed || !voices || !MUSIC_STINGERS.includes(kind)) return;
o = o || {};
const s = clamp(Number(strength) || 0, 0, 1.5);
if (s <= 0.01 && !(kind === 'rampEnd' && o.cancel)) return;
const now = ctx.currentTime;
const cd = { bank: 0.45, bail: 0.35, lineup: 1.2, ramp: 2.5, rampEnd: 0.5, start: 1, air: 0.8 }[kind];
const upd = (kind === 'air' && !!o.extend && !!airRiser) || (kind === 'rampEnd' && !!(o.update || o.cancel));
if (!upd && lastStinger[kind] != null && now - lastStinger[kind] < cd) return;
if (!upd) lastStinger[kind] = now;
const tri = song.feel === 'shuffle';
const tq = nextGrid(now + 0.025, kind === 'bail' ? (tri ? SPB / 6 : STEP) : kind === 'start' ? SPB : (tri ? SPB / 3 : SPB / 2));
const sf = Math.min(1, s);
const sh = Math.min(1.15, s);
const hot = hotNow();
const K16 = hot ? 1.6 : 1;
lg({ t: tq, ev: 'stinger', kind, s, riser: o.riser ? 1 : undefined });
if (muted) return;
if (airRiser && (kind === 'bank' || kind === 'lineup' || kind === 'bail')) cancelAirRiser(nextGrid(now + 0.01, STEP));
const key = chord ? chord.keyPc : song.keyPc;
const cmode = (chord && chord.mode) || song.mode;
const T = leadTonic(key) - 12;
const harmony = harmonyOK();
switch (kind) {
case 'bank': {
const big = state === 'roam' && energy >= 0.7 && s >= 0.6 && (sec.type === 'drop' || sec.type === 'build');
if (!featureClaim(tq, big ? SPB : (s >= 0.75 ? SPB : 0), kind)) { demoted(tq, kind, 0.7 * sh, 0.26 * sh); break; }
const hk = big ? 1.4 : 1, hs = big ? 1.7 : 1;
const motif = s >= 1.2 && motifOK(tq, 'bank');
if (motif) {
const r = pcAbove(chord.rootPc, T - 2), fifth = r - 5, third = pcAbove(chord.pcs[1], r + 1);
leitmotif([{ t: tq, m: fifth, dur: STEP * 0.85 }, { t: tq + stepT(1), m: r, dur: STEP * 1.8 }, { t: tq + stepT(3), m: third, dur: SPB * 1.4, v: 1.1 }], 0.3 * sf * hs, { dest: fx.buses.st });
logTheme(tq, true, 'bank');
figureAt = tq;
} else if (s >= 0.75 || big) {
const fig = song.hookFigures && song.hookFigures.length ? song.hookFigures[bankRot++ % song.hookFigures.length] : null;
if (fig) {
const fn = hookNotes(fig, tq, T, cmode);
fx.figure(fn, 0.3 * sf * hs, { dest: fx.buses.st });
logTheme(tq, false, 'bank', { fig: (bankRot - 1) % song.hookFigures.length, notes: fn.map((x) => [+x.t.toFixed(4), x.m, +x.dur.toFixed(4)]) });
figureAt = tq;
}
}
stHit(kit.impact, tq, 1.0 * sh * hk * (big && SPB >= 0.55 ? 1.26 : 1), true);
fx.hit(kit.subDrop, tq, { bus: 'st', priority: true, gain: 0.8 * sh });
fx.hit(kit.crash, tq, { bus: 'st', priority: true, gain: 0.34 * sh * hk });
fx.stab(tq, (voicing || [57, 61, 64, 69]).map((m) => m + 12), 0.7 * sh * hs, big ? 0.45 : 0.32, fx.buses.st);
fx.riser(tq + 0.04, SPB * 2, 0.1 * s, { fadeOut: true, f0: 900, f1: 9500, midi: 69, pitched: 0.45, dest: fx.buses.st });
if (motif) fx.choir(tq, choirNotes(), Math.max(SPB, Math.min(BAR, chordEnd - tq)), 0.32 * sf * hs, 'ah', 0.06, 0.9, mix.choirFx);
if (big) {
const bo = SPB >= 0.55 ? SPB / 2 : SPB;
blackout = { a: tq, b: tq + bo };
mix.blackout(tq, bo);
mix.bedDuck(tq, 6, bo - 0.05, 0.05);
fx.hit(kit.crash, tq + bo, { bus: 'cym', gain: 0.35, priority: true });
} else {
mix.bedDuck(tq, 5 * sf, 0.3);
mix.pump(tq, 0.45 * sf);
}
break;
}
case 'bail': {
if (hang && tq < hang.b) {
hang = null;
for (const ov of ovr) if (ov.until > tq) ov.until = tq;
if (blackout && blackout.b > tq) { blackout = null; mix.unblackout(tq); }
if (rampH) { rampH.release(tq); rampH = null; }
if (rampSwell) { try { rampSwell.stop(tq); } catch (e) {   } rampSwell = null; }
mix.undip(tq, 0.15);
leadMuteUntil = Math.min(leadMuteUntil, tq);
lg({ t: tq, ev: 'hangEnd', why: 'bail' });
}
const ok = featureClaim(tq, SPB, kind);
fx.hit(kit.thud, tq, { bus: 'st', priority: true, gain: 0.7 * sh * (ok ? 1 : 0.6) });
if (!ok) { lg({ t: tq, ev: 'demoted', kind }); break; }
const r = pcAbove(chord.rootPc, 40);
fx.figure([{ t: tq, m: r + 1, dur: STEP * 1.6 }, { t: tq + stepT(2), m: r, dur: SPB * 1.5 }], 0.45 * sf * K16, { low: true, rel: 0.12, dly: 0.05, dest: fx.buses.st });
mix.dip(tq, 340 + (1 - sf) * 900, 0.07, SPB * 0.6, BAR * 0.9);
if (hot) mix.bedDuck(tq, 6, 0.3, 0.12); else mix.bedDuck(tq, 4, 0.25, 0.1);
break;
}
case 'lineup': {
let victory = s >= 1.2;
if (victory && !(o.pb || victories === 0 || now - lastVictory >= VICTORY_GAP)) { victory = false; lg({ t: tq, ev: 'victoryHeld', since: +(now - lastVictory).toFixed(2) }); }
const ni = chordSpec(key, victory ? 'I' : tonicSpec(cmode), cmode);
const nVI = chordSpec(key, 'bVI', cmode), niv = chordSpec(key, 'iv', cmode), nVII = chordSpec(key, 'bVII', cmode);
const dd = Math.min(((chord.rootPc - nVI.rootPc) % 12 + 12) % 12, ((nVI.rootPc - chord.rootPc) % 12 + 12) % 12);
const first = !victory && dd >= 1 && dd <= 2 ? niv : nVI;
const tI = tq + stepT(8);
const tEnd = Math.max(nextGrid(tI + SPB - 1e-3, BAR), tI + SPB);
if (!featureClaim(tq, tEnd - tq, kind)) { demoted(tq, kind, 0.8 * sh, 0.24 * sh); break; }
if (victory) { lastVictory = now; victories++; }
if (harmony) {
muteLead(tq, tEnd);
leadResumeAt = tEnd;
if (victory) { const tm = tq + stepT(4); override(tq, tm, nVI); override(tm, tI, nVII); override(tI, tEnd, ni).major = true; }
else { override(tq, tI, first); override(tI, tEnd, ni); }
if (victory && state === 'roam' && sec) {
const nb = barOf(tEnd);
if (nb < sec.bars) leadAfter(tq, nb, barOf(tq), picardyNext(sec, nb));
}
}
const motif = motifOK(tq, 'lineup');
if (motif) {
const rh = [[0, 2], [2, 2], [4, 1], [5, 1], [6, 2], [8, 8]];
const ms = [-5, 0, 3, 0, 8, 7].map((iv) => T + iv);
leitmotif(rh.map(([a, l], i) => ({ t: tq + stepT(a), m: ms[i], dur: l * STEP * 0.95, v: i === rh.length - 1 ? 1.1 : 1 })), 0.46 * sf * K16, { rel: 0.25, dest: fx.buses.st });
} else {
const fig = song.hookFigures && song.hookFigures[0];
if (fig) fx.figure(hookNotes(fig, tq, T, cmode).concat([{ t: tI, m: pcAbove(ni.rootPc, T - 2), dur: SPB * 1.5, v: 1.1 }]), 0.46 * sf * K16, { oct: true, rel: 0.25, dest: fx.buses.st });
}
logTheme(tq, motif, 'lineup', { victory: victory ? 1 : undefined });
figureAt = tq;
if (victory && braamOK(tI)) { fx.braam(tI, braamMidi(ni.rootPc), BRAAM_K * 0.9 * sf, 2.5, fx.buses.st); lastBraam = tI; lg({ t: tI, ev: 'braam', m: braamMidi(ni.rootPc), lineup: 1, victory: 1 }); }
fx.choir(tI, ni.pcs.map((pc) => pcAbove(pc, 57)), Math.max(SPB * 1.5, BAR - 7 * STEP), 0.62 * sf * Math.min(1.3, K16), 'ah', 0.08, 1.3, mix.choirFx);
stHit(kit.impact, tq, 1.0 * sh, true);
fx.hit(kit.subDrop, tq, { bus: 'st', priority: true, gain: 0.6 * sh });
fx.hit(kit.crash, tq, { bus: 'st', priority: true, gain: 0.28 * sh });
if (hot) mix.bedDuck(tq, 6, SPB, 0.12); else mix.bedDuck(tq, 5 * sf, 0.35);
break;
}
case 'ramp': {
if (o.riser) { airStinger(tq, s, o); break; }
let r = (chord ? key : 6) + 48;
if (r > 59) r -= 12;
let hb = null;
if (harmony) {
const dd = dropDownbeats();
const near = dd.some((d) => tq > d - BAR - 1e-3 && tq < d + BAR);
let max = tq + HANG_MAX_BARS * BAR;
for (const d of dd) if (d > tq) max = Math.min(max, d - BAR);
max = t0 + Math.floor((max - t0) / BAR + 1e-6) * BAR;
let b = nextGrid(tq + 2 * BAR - SPB, BAR);
if (b > max) b = max;
if (!near && b - tq >= BAR - 1e-3) hb = { b, max, dropCap: dd.some((d) => d > tq && d - BAR <= tq + HANG_MAX_BARS * BAR) };
else lg({ t: tq, ev: 'hangSkipped', why: near ? 'drop' : 'short' });
}
const dur = hb ? HANG_MAX_BARS * BAR : BAR * 2, rd = SPB * 2;
if (rampH) rampH.release(tq);
rampH = fx.suspense(tq, r, dur, 1.4 * sf, SPB, fx.buses.st);
if (rampH) rampH.root = r;
const end = hb ? hb.b : tq + dur;
rampSwell = fx.hit(kit.crashRev, end - rd, { bus: 'st', priority: true, gain: 0.4 * sf, offset: kit.crashRev.duration - rd, dur: rd, fadeIn: rd * 0.6 });
mix.dip(tq, 1700, SPB, BAR, BAR * 0.8);
if (hb) {
hang = { a: tq, b: hb.b, max: hb.max, dropCap: hb.dropCap, air: false, sf };
muteLead(tq, hb.b);
const pc = song.rampChord && song.rampChord !== 'i' ? song.rampChord : tonicSpec(cmode);
hang.ovr = override(tq, hb.b, chordSpec(key, pc, cmode));
blackout = { a: tq, b: hb.b - SPB / 2, kinds: ['kick', 'low'] };
mix.blackout(tq, hb.b - SPB / 2 - tq, ['kick', 'low']);
lg({ t: tq, ev: 'hang', end: hb.b, max: hb.max });
}
break;
}
case 'rampEnd': {
if (o.cancel) {
if (pendingLand) { lg({ t: now, ev: 'landingCancel', pending: 1 }); pendingLand = null; lastLandAt = -Infinity; }
else if (landing && now < landing.first - 0.005) { lg({ t: now, ev: 'landingCancel', scheduled: 1 }); unland(landing, now); landing = null; }
break;
}
const atOK = Number.isFinite(o.at) && o.at - now >= 0.05 && o.at - now <= 4;
if (o.update) {
if (!atOK) break;
if (pendingLand) {
if (Math.abs(o.at - pendingLand.at) > 0.08) { lg({ t: now, ev: 'landingRetime', from: pendingLand.at, to: o.at }); retimeP(pendingLand, o.at); lastLandAt = pendingLand.L; pollLanding(); }
break;
}
if (landing && landing.at != null && now < landing.first - 0.005 && Math.abs(o.at - landing.at) > 0.08) {
const H = landing; unland(H, now); landing = null;
lg({ t: now, ev: 'landingRetime', from: H.at, to: o.at, scheduled: 1 });
queueLanding(o.at, H.s, H.how, { pb: H.o.pb, drop: H.o.drop });
break;
}
if (landing || now < lastLandAt + 0.6) break;
}
if (now < lastLandAt + 0.6 || pendingLand) { lg({ t: tq, ev: 'dupLanding' }); break; }
if (atOK) queueLanding(o.at, s, 'rampEndAt', { pb: !!o.pb, drop: o.drop });
else {
const L = nextGrid(now + 0.025, tri ? SPB / 3 : STEP), hitT = L + mix.latency - mix.stLatency;
land(Math.min(nextGrid(now + 0.025, STEP), L), L, s, 'rampEnd', { pb: !!o.pb, drop: o.drop, hitT, impT: Math.max(now + 0.005, hitT - LAND_ONSET) });
}
break;
}
case 'air': {
airStinger(tq, s, o);
break;
}
case 'start': {
stHit(kit.impact, tq, 0.35 * sh, true);
fx.hit(kit.crash, tq, { bus: 'st', priority: true, gain: 0.25 * sh });
break;
}
}
},
duck(amount = 0.5, sec2 = 0.5) {
if (disposed) return;
const a = clamp01(Number(amount) || 0);
mix.duck(ctx.currentTime, state === 'menu' ? Math.min(a, 0.3) : a, Math.max(0, Number(sec2) || 0));
},
setVolume(v) { volume = clamp(Number(v) || 0, 0, 1); mix.setVolume(ctx.currentTime, volume); },
setMuted(on) { muted = !!on; mutedAt = ctx.currentTime; mix.setMuted(ctx.currentTime, muted); },
get tracks() { return listing(TR, mode === 'radio'); },
nowPlaying,
next() {
if (disposed) return;
if (paused && mode === 'adaptive') { sessionOrder = !menuListen; mode = 'listen'; refreshRing(); lg({ t: ctx.currentTime, ev: 'mode', to: 'listen', why: 'pausedNext' }); }
const cur = trackSwitch && trackSwitch.idx != null ? trackSwitch.idx : trackIdx;
const i = gameOrder() && cur >= 0 ? gameBag.next(cur) : shuffle ? bag.next(cur) : ((cur < 0 ? -1 : cur) + 1) % TR.length;
requestTrack(i < 0 ? 0 : i, 'next');
},
prev() {
if (disposed) return;
if (paused && mode === 'adaptive') { sessionOrder = !menuListen; mode = 'listen'; refreshRing(); lg({ t: ctx.currentTime, ev: 'mode', to: 'listen', why: 'pausedPrev' }); }
const pend = trackSwitch && trackSwitch.idx != null ? trackSwitch : null;
const cur = pend ? pend.idx : trackIdx;
if (!pend && nowPlaying().positionSec > 3 && trackIdx >= 0) { requestTrack(trackIdx, 'restart'); return; }
let i;
if ((shuffle || gameOrder()) && history.length) { i = history.pop(); if (i === cur && history.length) i = history.pop(); }
else i = ((cur < 0 ? 0 : cur) - 1 + TR.length) % TR.length;
requestTrack(i < 0 ? 0 : i, 'prev');
},
playTrack(id) {
const i = TR.findIndex((t) => t.id === id);
if (i < 0 || disposed) return false;
requestTrack(i, 'play');
return true;
},
seek(secs) {
if (disposed || !running || state !== 'roam' || !song || !Number.isFinite(+secs) || trackSwitch || ring) return false;
let b = Math.max(0, Math.floor(+secs / BAR)), si = 0;
while (si < song.sections.length - 1 && b >= song.sections[si].bars) { b -= song.sections[si].bars; si++; }
b = Math.max(0, Math.min(b, song.sections[si].bars - 1));
jumpTo = -1; secIdx = si; resumeBar = b; secBar = -1; sec = song.sections[si];
if (opts.immediateSwitch !== false && (nextStep & 15) !== 0) {
const h = horizonT();
mix.setTrackGain(ctx.currentTime, -40, 0.03);
mix.setTrackGain(h, trimDb(song), 0.05);
anchorAt(h, BPM);
}
lg({ t: ctx.currentTime, ev: 'seek', to: +secs, sec: si, bar: b });
return true;
},
setShuffle(on) { const was = shuffle; shuffle = !!on; if (shuffle !== was) sessionOrder = false; if (shuffle && !was) bag.reset(trackIdx); if (listenRules()) upcoming = null; refreshRing(); },
setRepeat(m) { if (REPEAT_MODES.includes(m)) { if (m !== repeat) sessionOrder = false; repeat = m; if (listenRules()) upcoming = null; refreshRing(); } },
get shuffle() { return shuffle; },
get repeat() { return repeat; },
get history() { return heard.map((h) => ({ ...h })); },
queue(n = 5) { return queueIdx(Math.max(0, Math.min(32, n | 0))).map(brief).filter(Boolean); },
get album() { return ALBUM; },
onTrackChange(cb) { if (typeof cb === 'function') listeners.add(cb); return () => listeners.delete(cb); },
drawCover(ctx2d, id, size, theme = 'white', o = {}) { return paintCoverInto(ctx2d, id, size, theme, { ...o, tracks: TR }); },
get bpm() { if (!running || !anchors.length) return BPM; return clockAt(audible()).bpm; },
get bar() { if (!running || !anchors.length) return 0; const a = audible(), an = clockAt(a), tt = a - an.t; return tt < 0 ? an.bar0 : an.bar0 + Math.floor(tt / an.BAR); },
get beat() { if (!running || !anchors.length) return 0; const a = audible(), an = clockAt(a), tt = a - an.t; return tt < 0 ? 0 : (tt / an.SPB) % 4; },
get state() { return roll ? 'roam' : pending ? pending.name : menuListen ? 'menu' : state; },
get stingerOutput() { return mix.stOut; },
get intensity() { return iSm; },
get section() { return state === 'roam' ? sec.type : state; },
get running() { return running; },
get seed() { return seed; },
tick,
dispose() {
if (disposed) return;
halt();
disposed = true;
if (preVoices) { try { preVoices.dispose(); } catch (e) {   } preVoices = null; }
listeners.clear();
fx.dispose();
mix.dispose();
},
debug: {
mix, kit, fx, log,
get voices() { return voices; },
get song() { return song; },
get sectionIndex() { return secIdx; },
get secBar() { return secBar; },
get energy() { return energy; },
get layers() { return { ...layers }; },
get chord() { return chord ? chord.label + ' ' + (voicing || []).map(noteName).join(' ') : '–'; },
get nextSong() { return upcoming && upcoming.song; },
get kitVariant() { return K; },
get t0() { return t0; },
get anchors() { return anchors.slice(); },
get replayOrigin() { return replayAt; },
get leadOn() { return leadOn; },
get menuBar() { return menuBar; },
get trackIndex() { return trackIdx; },
get air() { return airOn; },
get marks() { return marks.slice(); },
get offGrid() { return offGrid; },
get ring() { return ring; },
get hang() { return hang; },
get airRiser() { return airRiser; },
get motifTimes() { return motifTimes.slice(); },
get figureAt() { return figureAt; },
get menuListen() { return menuListen; },
get plays() { return new Map(plays); },
get landing() { return landing; },
get pendingLanding() { return pendingLand; },
get landOnset() { return LAND_ONSET; },
get lastBraam() { return lastBraam; },
get segue() { return segue; },
get victories() { return victories; },
get iFloorUntil() { return iFloorUntil; },
get dropRun() { return dropRun; },
get postDrop() { return postDrop; },
get iRaw() { return iRaw; },
get sessionOrder() { return sessionOrder; },
forceSection(type) {
for (let i = secIdx + 1; i < song.sections.length; i++) if (song.sections[i].type === type) { jumpTo = i; return true; }
for (let i = 0; i <= secIdx; i++) if (song.sections[i].type === type) { jumpTo = i; return true; }
return false;
},
describe() { return describeSong(song); },
replan() { for (const s2 of song.sections) planSection(song, s2); },
},
};
refreshRing();
return api;
}
