export const COMP_DELAY = 0.006;
const CLIP_DELAY = { '4x': 0.004, '2x': 0.00267, none: 0 };
export const MIX_LATENCY = 2 * COMP_DELAY + CLIP_DELAY['2x'];
export function createMix(ctx, destination, kit, opts = {}) {
const nodes = [];
const G = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; nodes.push(g); return g; };
const F = (type, f, Q = 0.707, gain = 0) => {
const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; b.gain.value = gain; nodes.push(b); return b;
};
const C = (thr, ratio, knee, atk, rel) => {
const c = ctx.createDynamicsCompressor();
c.threshold.value = thr; c.ratio.value = ratio; c.knee.value = knee; c.attack.value = atk; c.release.value = rel;
nodes.push(c); return c;
};
const chain = (...ns) => { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); return ns[ns.length - 1]; };
const sum = G(1);
const fxFilter = F('lowpass', 20000, 0.75);
try { fxFilter.frequency.automationRate = 'k-rate'; } catch (e) {   }
const post = G(1);
const topShelf = F('highshelf', 10500, 0.7, -2.5), presence = F('peaking', 4000, 0.8, -1.5), lowMid = F('peaking', 500, 1.0, 1.5);
const trackG = G(1);
const mk = (thr, ratio) => Math.pow(10, -0.6 * -thr * (1 - 1 / ratio) / 20);
const glue = C(-16, 2, 10, 0.02, 0.25);
const trim = G(mk(-16, 2) * (opts.trim ?? 1.45));
const limiter = C(-3, 20, 0, 0.001, 0.06);
const limTrim = G(mk(-3, 20));
const clip = ctx.createWaveShaper(); clip.curve = kit.curves.clip; clip.oversample = opts.clipOversample ?? '2x'; nodes.push(clip);
const duckG = G(1), fade = G(0), vol = G(opts.volume ?? 0.8), mute = G(1);
chain(sum, fxFilter, post, presence, lowMid, topShelf, trackG, glue, trim, limiter, limTrim, clip, duckG, fade, vol, mute);
mute.connect(destination);
const LV = { kick: 0.37, drums: 0.56, bass: 1.2, bassUp: 1.19, pad: 2.2, gate: 2.0, arp: 2.88, lead: 1.3, choir: 5.0, choirFx: 2.0, fx: 0.56, rev: 1.8, hall: 1.5, dly: 0.84, bell: 1.0, st: 0.56, strings: 1.0, ...(opts.levels || {}) };
const solo = {};
const S = (name) => (solo[name] = G(LV[name] ?? 1));
const bed = G(1), secGain = G(1), airDipF = F('peaking', 3500, 0.6, 0), bedMidF = F('peaking', 650, 1, 0);
try { airDipF.gain.automationRate = 'k-rate'; bedMidF.gain.automationRate = 'k-rate'; } catch (e) {   }
bed.connect(airDipF); airDipF.connect(bedMidF); bedMidF.connect(secGain); secGain.connect(sum);
function widen(src, dest, sAmt, d) {
const hp = F('highpass', 6000, 0.6), dl = ctx.createDelay(0.05); dl.delayTime.value = d; nodes.push(dl);
const gL = G(sAmt), gR = G(-sAmt), mg = ctx.createChannelMerger(2); nodes.push(mg);
src.connect(hp); hp.connect(dl); dl.connect(gL); dl.connect(gR); gL.connect(mg, 0, 0); gR.connect(mg, 0, 1); mg.connect(dest);
}
const lp17 = (n = 2) => { const a = []; for (let i = 0; i < n; i++) a.push(F('lowpass', 17000, 0.707)); return a; };
const drumBus = G(1), drumAir = F('highshelf', 8000, 0.7, 0), drumTop = F('lowpass', 20000, 0.5);
try { drumTop.frequency.automationRate = 'k-rate'; } catch (e) {   }
drumBus.connect(drumAir); drumAir.connect(drumTop); drumTop.connect(bed);
const airHPk = F('highpass', 12, 0.6), airHPb = F('highpass', 12, 0.6);
const buildHPk = F('highpass', 16, 0.6), buildHPb = F('highpass', 16, 0.6);
for (const f of [airHPk, airHPb, buildHPk, buildHPb]) { try { f.frequency.automationRate = 'k-rate'; } catch (e) {   } }
const kickGate = G(1), lowGate = G(1), hatGate = G(1);
const kickIn = S('kick'); chain(kickIn, airHPk, buildHPk, kickGate, drumBus);
const drumsLP = lp17(2);
const drums = S('drums'); chain(drums, F('highshelf', 10000, 0.7, -6.5), ...drumsLP, drumBus);
widen(drumsLP[1], drumBus, 0.45, 0.009);
const hatsIn = G(1); chain(hatsIn, hatGate, F('highshelf', 9000, 0.7, -7), drums);
const cymIn = G(1); chain(cymIn, F('highshelf', 9000, 0.7, -7), drums);
const scHeavy = G(1), scLight = G(1), scRev = G(1), scBass = G(1);
const MUSIC_GAIN = opts.musicGain ?? 0.27;
const musicOut = G(MUSIC_GAIN);
scHeavy.connect(musicOut); scLight.connect(musicOut); scBass.connect(musicOut); musicOut.connect(bed);
const bassShelf = F('lowshelf', 50, 0.7, -1), bassBody = F('peaking', 160, 0.8, 2.5), upBody = F('peaking', 160, 0.8, 2.5);
const bassIn = S('bass'); chain(bassIn, bassShelf, bassBody, airHPb, buildHPb, lowGate, scBass);
const subPk = F('peaking', 40, 0.9, 0);
const subLow = F('lowshelf', 35, 0.7, 2.5);
const subIn = G(1); subIn.connect(subPk); subPk.connect(subLow); subLow.connect(bassIn);
const droneIn = G(1); { const sh = F('lowshelf', 120, 0.7, 4); droneIn.connect(sh); sh.connect(subIn); }
const upMid = F('peaking', 450, 1, 0), padLM = F('peaking', 450, 1, 0);
const bassUpIn = S('bassUp'); chain(bassUpIn, upBody, upMid, airHPb);
const padEQ = F('lowshelf', 200, 0.707, -4);
const padHiF = F('peaking', 3500, 0.9, 0);
const leadDipF = F('peaking', 2600, 1, 0), leadDipLo = F('peaking', 650, 1, 0);
const arpDipF = F('peaking', 560, 1.2, 0), choirDipF = F('peaking', 700, 1, 0);
const padChoirF = F('peaking', 700, 0.7, 0);
for (const f of [leadDipF, leadDipLo, arpDipF, choirDipF, padHiF, padChoirF]) { try { f.gain.automationRate = 'k-rate'; } catch (e) {   } }
chain(padEQ, padLM, leadDipF, leadDipLo, arpDipF, choirDipF, padHiF, padChoirF, scHeavy);
const padIn = S('pad'); padIn.connect(padEQ);
const gateIn = S('gate'); gateIn.connect(padEQ);
const arpHP = F('highpass', 550, -3), arpLP = F('lowpass', 20000, 0.5), arpDuckG = G(1);
try { arpHP.frequency.automationRate = 'k-rate'; arpLP.frequency.automationRate = 'k-rate'; } catch (e) {   }
const arpIn = S('arp'); chain(arpIn, arpHP, arpLP, arpDuckG, scLight);
const leadMid = F('peaking', 650, 1, 0), leadPres = F('peaking', 3000, 1, 0);
const leadIn = S('lead'); chain(leadIn, leadMid, leadPres, scLight);
const stringsIn = S('strings'); { const sh = F('lowshelf', 120, 0.7, 4); stringsIn.connect(sh); sh.connect(scLight); }
const choirPumpG = G(1), choirPres = F('peaking', 2500, 1, 0);
const choirLD = F('peaking', 2500, 1, 0), choirLiftG = G(1);
try { choirLD.gain.automationRate = 'k-rate'; } catch (e) {   }
const choirIn = S('choir'); chain(choirIn, choirPumpG, choirPres, choirLD, choirLiftG, scLight);
const bellIn = S('bell'); bellIn.connect(scLight);
const menuBellIn = G(1); { const pk = F('peaking', 3000, 0.9, 2); menuBellIn.connect(pk); pk.connect(bellIn); }
const revIn = G(1);
const conv = ctx.createConvolver(); conv.normalize = true; conv.buffer = kit.ir; nodes.push(conv);
const REV = 0.5 * 1.3 * (kit.irComp ?? 1);
const revRet = G(REV);
chain(revIn, conv, revRet, S('rev'), scRev, sum);
widen(solo.rev, scRev, 0.55, 0.007);
const hallSend = G(0), hallRet = G(1);
let hallConv = null, hallAmt = 0, hallLinked = false, hallZeroAt = -1;
hallRet.connect(S('hall')); solo.hall.connect(scRev);
function linkHall(on) {
if (on === hallLinked) return;
hallLinked = on;
if (on) revIn.connect(hallSend); else { try { revIn.disconnect(hallSend); } catch (e) {   } }
}
function ensureHall() {
if (hallConv) { linkHall(true); return; }
hallConv = ctx.createConvolver(); hallConv.normalize = true; hallConv.buffer = kit.hallIR; nodes.push(hallConv);
hallRet.gain.value = 0.5 * (kit.hallIR.irComp ?? 1);
hallSend.connect(hallConv); hallConv.connect(hallRet);
linkHall(true);
}
let spb = 60 / (opts.bpm || 124);
const dlyIn = G(1);
const dL = ctx.createDelay(2), dR = ctx.createDelay(2); nodes.push(dL, dR);
dL.delayTime.value = spb * 0.75; dR.delayTime.value = spb * 0.75;
const fb = G(0.4);
const fbLP = F('lowpass', 3200, 0.6);
chain(dlyIn, F('bandpass', 1420, 0.35), dL);
dL.connect(dR); dR.connect(fb); fb.connect(fbLP); fbLP.connect(dL);
const merger = ctx.createChannelMerger(2); nodes.push(merger);
dL.connect(merger, 0, 0); dR.connect(merger, 0, 1);
merger.connect(S('dly')); solo.dly.connect(scLight);
const stIn = G(1), stOut = G(1);
const fxIn = S('fx'); { const l = F('lowpass', 17000, 0.707); fxIn.connect(l); l.connect(post); }
const stFx = S('st'); { const l = F('lowpass', 17000, 0.707); stFx.connect(l); l.connect(stIn); }
const choirFx = S('choirFx'); choirFx.connect(stIn);
if (opts.stingerDest) {
const stLim = C(-1, 20, 0, 0.001, 0.08);
chain(stIn, stLim, G(mk(-1, 20)), stOut);
stOut.connect(opts.stingerDest);
} else {
const STC = opts.stingerCeil ?? -4;
const stPk = C(STC, 20, 0, 0.001, 0.05);
chain(stIn, stPk, G(mk(STC, 20)), stOut); stOut.connect(post);
}
let probe = null, probeSrc = null, probeOut = null, probeSub = null, probeSubOut = null;
if (opts.debug) {
probeSrc = ctx.createConstantSource(); probeSrc.offset.value = 1;
probe = G(1); probeSub = G(1);
probeOut = ctx.createDelay(0.05); probeOut.delayTime.value = MIX_LATENCY; nodes.push(probeOut);
probeSubOut = ctx.createDelay(0.05); probeSubOut.delayTime.value = MIX_LATENCY; nodes.push(probeSubOut);
probeSrc.connect(probe); probe.connect(probeOut);
probeSrc.connect(probeSub); probeSub.connect(probeSubOut);
probeSrc.start();
}
const hold = (p, t) => { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t); };
let hpEv = [{ t: 0, v: 16, k: 'set' }];
function hpAt(t) {
let v = 16, pt = 0;
for (const e of hpEv) {
if (t < e.t) return e.k === 'exp' && t > pt ? v * Math.pow(e.v / v, (t - pt) / Math.max(1e-9, e.t - pt)) : v;
v = e.v; pt = e.t;
}
return v;
}
const hpHold = (t) => { const v = hpAt(t); hpEv = hpEv.filter((e) => e.t < t && e.t > t - 20); hpEv.push({ t, v, k: 'set' }); };
const HPS = [buildHPk.frequency, buildHPb.frequency];
const pumps = new Map();
function pump(t, depth, rel = 0.075, bass = null) {
if (depth <= 0.001) return;
const d = Math.min(0.9, depth);
const key = Math.round(t * 2000);
const prev = pumps.get(key);
if (prev) {
if (prev.d >= d) return;
t = prev.t;
}
pumps.set(key, { d, t });
if (pumps.size > 48) { const old = key - 4000; for (const k of pumps.keys()) if (k < old) pumps.delete(k); }
const set = (p, dd, r) => { p.setTargetAtTime(1 - dd, t - 0.004, 0.002); p.setTargetAtTime(1, t + 0.03, r); };
set(scHeavy.gain, d, rel); set(scLight.gain, d * 0.55, 0.075); set(scRev.gain, d * 0.6, 0.075);
const bd = Math.min(0.9, bass ? bass.d : d * (0.4 / 0.6));
if (bass && bass.pre) { scBass.gain.setTargetAtTime(1 - bd, Math.max(0, t - bass.pre), bass.pre / 4); scBass.gain.setTargetAtTime(1, t + 0.03, bass.rel); }
else set(scBass.gain, bd, bass ? bass.rel : 0.07);
if (probe) set(probe.gain, d, rel);
}
function subDuck(t, depth = 0.85, holdSec = 0.07, rel = 0.035, pre = 0) {
for (const p of probeSub ? [subIn.gain, probeSub.gain] : [subIn.gain]) {
if (pre > 0.004) p.setTargetAtTime(1 - depth, Math.max(0, t - pre), pre / 4);
else p.setTargetAtTime(1 - depth, t - 0.004, 0.002);
p.setTargetAtTime(1, t + holdSec, rel);
}
}
let padMid = 0, leadDipOn = false, leadDipLoDb = 1.5, airBase = 0, airTrim = 0, choirPresBase = 0, choirLiftOn = false;
let dipEnd = 0;
function dip(t, freq, down, holdSec, up) {
const p = fxFilter.frequency;
down = Math.max(0.01, down);
if (t >= dipEnd) {
p.cancelScheduledValues(t);
p.setValueAtTime(20000, t);
} else {
hold(p, t);
}
p.exponentialRampToValueAtTime(freq, t + down);
p.setValueAtTime(freq, t + down + holdSec);
p.exponentialRampToValueAtTime(20000, t + down + holdSec + up);
dipEnd = t + down + holdSec + up;
}
function undip(t, up = 0.15) {
if (t >= dipEnd) return;
const p = fxFilter.frequency;
hold(p, t);
p.exponentialRampToValueAtTime(20000, t + Math.max(0.01, up));
dipEnd = t + up;
}
return {
nodes,
drums, kickIn, bassIn, subIn, bassUpIn, padIn, gateIn, arpIn, leadIn, choirIn, choirFx, fxIn, stIn, stFx, stOut, revIn, dlyIn, hatsIn, cymIn, bellIn, stringsIn, droneIn, menuBellIn,
scHeavy, scLight, scBass, bed, preMaster: post, preLimiter: trim, preClip: limTrim, limiter, glue, out: mute, probe: probeOut, probeSub: probeSubOut,
pump, subDuck, dip, undip,
latency: 2 * COMP_DELAY + (CLIP_DELAY[clip.oversample] || 0),
stLatency: COMP_DELAY + (opts.stingerDest ? 0 : 2 * COMP_DELAY + (CLIP_DELAY[clip.oversample] || 0)),
bedDuck(t, db, sec, release = 0.12) {
const p = bed.gain, g = Math.pow(10, -Math.abs(db) / 20);
hold(p, t);
p.setTargetAtTime(g, t, 0.006);
p.setTargetAtTime(1, t + Math.max(0.03, sec), release);
},
bedRestore(t) { const p = bed.gain; hold(p, t); p.setTargetAtTime(1, t, 0.01); },
drumAirTrim(t, db) { airTrim = db; drumAir.gain.setTargetAtTime(airBase + airTrim, t, 0.15); },
padHiDip(t, db) { padHiF.gain.setTargetAtTime(-Math.abs(db), t, 0.12); },
solo(list) { for (const k in solo) solo[k].gain.value = !list || list.includes(k) ? (LV[k] ?? 1) : 0; },
levels: LV,
stemNames: () => Object.keys(solo),
hpSweep(t0, t1, f) {
const now = Math.max(0, ctx.currentTime), tr = now + 0.06, ts = Math.max(t0, tr + 0.001), te = Math.max(t1, ts + 0.01);
for (const p of HPS) {
if (p.cancelAndHoldAtTime) { p.cancelAndHoldAtTime(now); p.exponentialRampToValueAtTime(16, tr); }
else { p.cancelScheduledValues(now); p.setTargetAtTime(16, now, 0.015); }
p.setValueAtTime(16, ts); p.exponentialRampToValueAtTime(f, te);
}
hpHold(now); hpEv.push({ t: tr, v: 16, k: 'exp' }, { t: ts, v: 16, k: 'set' }, { t: te, v: f, k: 'exp' });
},
hpReset(t, ramp = 0.06) {
const now = Math.max(0, ctx.currentTime), t0 = Math.max(now, t - ramp), t1 = Math.max(t, t0 + 0.01);
for (const p of HPS) { hold(p, t0); p.exponentialRampToValueAtTime(16, t1); }
hpHold(t0); hpEv.push({ t: t1, v: 16, k: 'exp' });
},
hpAt,
space(t, amount) { revRet.gain.setTargetAtTime(REV * amount, t, 0.6); },
hall(t, amount) {
if (amount > 0) { ensureHall(); hallZeroAt = -1; }
if (!hallConv) return;
if (amount <= 0 && hallLinked) {
if (hallZeroAt < 0) hallZeroAt = t;
else if (t - hallZeroAt >= 4) linkHall(false);
}
if (Math.abs(amount - hallAmt) < 1e-3) return;
hallAmt = amount;
hallSend.gain.setTargetAtTime(amount, t, 0.35);
},
prewarmHall() {
if (hallConv) return;
hallConv = ctx.createConvolver(); hallConv.normalize = true; hallConv.buffer = kit.hallIR; nodes.push(hallConv);
hallRet.gain.value = 0.5 * (kit.hallIR.irComp ?? 1);
hallSend.connect(hallConv); hallConv.connect(hallRet);
},
get hallAmount() { return hallAmt; },
get hallLinked() { return hallLinked; },
trackEQ(t, o = {}) {
if (o.air != null) { airBase = o.air || 0; drumAir.gain.setTargetAtTime(airBase + airTrim, t, 0.3); }
if (o.lowMid450 != null) { upMid.gain.setTargetAtTime(o.lowMid450, t, 0.3); padLM.gain.setTargetAtTime(o.lowMid450, t, 0.3); }
if (o.body != null) { bassBody.gain.setTargetAtTime(o.body, t, 0.3); upBody.gain.setTargetAtTime(o.body, t, 0.3); }
if (o.presence != null) presence.gain.setTargetAtTime(-1.5 + o.presence, t, 0.3);
if (o.top != null) topShelf.gain.setTargetAtTime(-2.5 + o.top, t, 0.3);
if (o.padLow != null) padEQ.gain.setTargetAtTime(-4 + o.padLow, t, 0.3);
if (o.lowShelf != null) bassShelf.gain.setTargetAtTime((o.lowShelf || 0) - 1, t, 0.3);
if (o.lowShelfHz != null) bassShelf.frequency.setTargetAtTime(o.lowShelfHz || 50, t, 0.3);
if (o.leadMid != null) leadMid.gain.setTargetAtTime(o.leadMid, t, 0.3);
if (o.leadPres != null) leadPres.gain.setTargetAtTime(o.leadPres, t, 0.3);
if (o.choirPres != null) { choirPresBase = o.choirPres; choirPres.gain.setTargetAtTime(choirPresBase + (choirLiftOn ? 2 : 0), t, 0.3); }
if (o.padMid != null) { padMid = o.padMid; leadDipLo.gain.setTargetAtTime(padMid - (leadDipOn ? leadDipLoDb : 0), t, 0.3); }
},
drumTop(t, f) { drumTop.frequency.setTargetAtTime(f, t, 0.2); },
arpDip(t, on, db = 6) { arpDipF.gain.setTargetAtTime(on ? -Math.abs(db) : 0, t, 0.1); },
arpHP(t, hz) { arpHP.frequency.setTargetAtTime(hz, t, 0.05); },
arpLP(t, hz) { arpLP.frequency.setTargetAtTime(hz, t, 0.05); },
choirLeadDip(t, db, f = 2500, q = 1) { choirLD.frequency.setValueAtTime(f, t); choirLD.Q.setValueAtTime(q, t); choirLD.gain.setTargetAtTime(-Math.abs(db || 0), t, 0.08); },
choirLift(t, on) {
on = !!on; if (on === choirLiftOn) return;
choirLiftOn = on;
choirLiftG.gain.setTargetAtTime(on ? 1.778 : 1, t, 0.12);
choirPres.gain.setTargetAtTime(choirPresBase + (on ? 2 : 0), t, 0.12);
padChoirF.gain.setTargetAtTime(on ? -1.5 : 0, t, 0.12);
},
bedMid(t, db) { bedMidF.gain.setTargetAtTime(-Math.abs(db || 0), t, 0.05); },
arpDuck(t, dur, db = 4) { const g = arpDuckG.gain; g.setTargetAtTime(Math.pow(10, -db / 20), t, 0.01); g.setTargetAtTime(1, t + Math.max(0.02, dur), 0.06); },
choirPump(t, depth = 0.3) { const g = choirPumpG.gain; g.setTargetAtTime(1 - depth, t - 0.004, 0.003); g.setTargetAtTime(1, t + 0.04, 0.09); },
subBoost(t, db) { subPk.gain.setTargetAtTime(db, t, 0.05); },
airDip(t, end, db = 6) {
const p = airDipF.gain, a = Math.max(t, end - 0.6, ctx.currentTime);
hold(p, a); p.linearRampToValueAtTime(-Math.abs(db), Math.max(a + 0.02, end)); p.setTargetAtTime(0, Math.max(a + 0.02, end), 0.08);
},
airUndip(t) { const p = airDipF.gain; hold(p, t); p.setTargetAtTime(0, t, 0.05); },
choirDip(t, on, db = 3) { choirDipF.gain.setTargetAtTime(on ? -Math.abs(db) : 0, t, 0.15); },
drumLevel(t, v) { drumBus.gain.setTargetAtTime(v, t, 0.12); },
leadDip(t, on, db = 3, dbLo = 1.5) {
leadDipOn = on; leadDipLoDb = Math.abs(dbLo);
leadDipF.gain.setTargetAtTime(on ? -Math.abs(db) : 0, t, 0.1); leadDipLo.gain.setTargetAtTime(padMid - (on ? leadDipLoDb : 0), t, 0.1);
},
setBpm(t, bpm) {
spb = 60 / bpm;
for (const d of [dL, dR]) { d.delayTime.cancelScheduledValues(t); d.delayTime.setTargetAtTime(spb * 0.75, t, 0.02); }
},
get delayTime() { return spb * 0.75; },
setTrackGain(t, db, tau = 0.5) { trackG.gain.setTargetAtTime(Math.pow(10, db / 20), t, Math.max(0.001, tau)); },
air(t, on) {
for (const f of [airHPk, airHPb]) { f.frequency.cancelScheduledValues(t); f.frequency.setTargetAtTime(on ? 120 : 12, t, on ? 0.12 : 0.004); }
for (const g of [revIn.gain, dlyIn.gain]) { g.cancelScheduledValues(t); g.setTargetAtTime(on ? 1.41 : 1, t, on ? 0.12 : 0.03); }
},
blackout(t, dur, kinds = ['kick', 'low', 'hat']) {
const G2 = { kick: kickGate.gain, low: lowGate.gain, hat: hatGate.gain };
for (const k of kinds) {
const g = G2[k];
hold(g, t - 0.004);
g.setTargetAtTime(0, t - 0.003, 0.0015);
g.setTargetAtTime(1, t + dur - 0.004, 0.003);
}
},
unblackout(t) {
for (const g of [kickGate.gain, lowGate.gain, hatGate.gain]) { hold(g, t - 0.004); g.setTargetAtTime(1, t - 0.004, 0.003); }
},
bassDip(t, db = 3, holdSec = 0.08) {
const g = lowGate.gain;
g.setTargetAtTime(Math.pow(10, -db / 20), t, 0.003);
g.setTargetAtTime(1, t + holdSec, 0.02);
},
sectionLevel(t, v, tau = 0.15) { secGain.gain.setTargetAtTime(v, t, tau); },
musicLevel(t, v, tau = 0.15) { musicOut.gain.setTargetAtTime(MUSIC_GAIN * v, t, tau); },
duck(t, amount, sec) {
const p = duckG.gain;
hold(p, t);
p.setTargetAtTime(1 - Math.min(0.95, Math.max(0, amount)), t, 0.025);
p.setTargetAtTime(1, t + Math.max(0.05, sec), 0.22);
},
fadeTo(t, v, tau) { const p = fade.gain; hold(p, t); p.setTargetAtTime(v, t, tau); },
setVolume(t, v) { vol.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), t, 0.05); },
setMuted(t, on) { mute.gain.setTargetAtTime(on ? 0 : 1, t, 0.06); },
dispose() {
try { probeSrc && probeSrc.stop(); } catch (e) {   }
for (const n of nodes) { try { n.disconnect(); } catch (e) {   } }
try { probeSrc && probeSrc.disconnect(); } catch (e) {   }
},
};
}
