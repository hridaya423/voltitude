import { mtof, subMidi } from "@rl/js/music/theory.js";
const kr = (p) => { try { p.automationRate = 'k-rate'; } catch (e) {   } };
const glottalCache = new WeakMap();
export function glottalWave(ctx) {
let w = glottalCache.get(ctx);
if (!w) {
const n = 40, real = new Float32Array(n + 1), imag = new Float32Array(n + 1);
for (let k = 1; k <= n; k++) imag[k] = Math.pow(k, -1.8);
imag[1] = imag[2] * GLOT_H1;
w = ctx.createPeriodicWave(real, imag);
glottalCache.set(ctx, w);
}
return w;
}
function warmSaw(ctx) {
const n = 56, real = new Float32Array(n + 1), imag = new Float32Array(n + 1);
for (let k = 1; k <= n; k++) imag[k] = Math.pow(k, -1.12) * (k > 22 ? Math.exp(-(k - 22) / 9) : 1);
return ctx.createPeriodicWave(real, imag);
}
function graph(ctx) {
const nodes = [], sources = [];
return {
nodes, sources,
G(v = 1) { const g = ctx.createGain(); g.gain.value = v; nodes.push(g); return g; },
F(type, f, Q = 0.707) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; nodes.push(b); return b; },
O(type, detune = 0, wave = null, freq = 0) {
const o = ctx.createOscillator();
if (wave) o.setPeriodicWave(wave); else o.type = type;
o.frequency.value = freq; o.detune.value = detune;
kr(o.frequency); kr(o.detune);
nodes.push(o); sources.push(o); return o;
},
CS(v) { const c = ctx.createConstantSource(); c.offset.value = v; nodes.push(c); sources.push(c); return c; },
P(v = 0) { const p = ctx.createStereoPanner(); p.pan.value = v; nodes.push(p); return p; },
M() { const m = ctx.createChannelMerger(2); nodes.push(m); return m; },
D(max, v) { const d = ctx.createDelay(max); d.delayTime.value = v; nodes.push(d); return d; },
};
}
function outlet(node, dests) {
let on = false, lastEnd = -1;
const o = {
wake(tEnd) {
if (tEnd > lastEnd) lastEnd = tEnd;
if (!on) { for (const d of dests) node.connect(d); on = true; }
},
until(tEnd) {
lastEnd = tEnd;
if (!on) { for (const d of dests) node.connect(d); on = true; }
},
idle(now, tail = 0.6) {
if (on && now > lastEnd + tail) { try { node.disconnect(); } catch (e) {   } on = false; }
},
get on() { return on; },
};
return o;
}
const BW = 1.8, BW1 = 2.6;
const VOWELS = {
ah: [[800, 80 * BW1, 1], [1150, 90 * BW, 0.55], [2900, 120 * BW, 0.3]],
oh: [[450, 70 * BW1, 1], [800, 80 * BW, 0.5], [2830, 100 * BW, 0.17]],
oo: [[325, 50 * BW1, 1], [700, 60 * BW, 0.32], [2530, 170 * BW, 0.09]],
};
const FGAIN = 2.4 / Math.sqrt(BW);
const GLOT_COMP = [0.58, 0.86, 1.55];
const GLOT_H1 = 2.2;
const BREATH = 0.08;
const CH_VG_FX = 1;
export const BASS_TIMBRES = ['roll', 'pulse', 'reese'];
export const LEAD_TIMBRES = ['duo', 'super', 'pwm', 'vox', 'bellsaw'];
const LEAD_TRIM = { duo: 1, super: 1, pwm: 0.89, vox: 1.25, bellsaw: 1 };
const BASS_TIMBRE = { roll: [0.5, 0.25, 0, 9], pulse: [0.2, 0.38, 0, 5], reese: [0.42, 0.06, 0.55, 3], drone: [0.5, 0, 0, 1] };
export const ARP_PATCHES = { sawsq: [0.42, 0.1176, 0], square: [0.138, 0.276, 0], sawoct: [0.47, 0, -0.137] };
const REESE_HP = 2.6;
const SUB_GAIN = 1.18;
export function createVoices(ctx, mix, kit) {
const it = createVoicesSteps(ctx, mix, kit);
let r;
while (!(r = it.next()).done) {   }
return r.value;
}
export function* createVoicesSteps(ctx, mix, kit) {
const g = graph(ctx);
const { G, F, O, CS, P, M, D } = g;
const wave = warmSaw(ctx);
const bassF = CS(92.5), subF = CS(46.25);
const b1 = O('sawtooth'), b2 = O('square'), b3 = O('sawtooth', 13);
bassF.connect(b1.frequency); bassF.connect(b2.frequency); bassF.connect(b3.frequency);
let bSub = O('sine'); subF.connect(bSub.frequency);
const subOld = new Set();
const b1g = G(0.5), b2g = G(0.25), b3g = G(0), b3HP = F('highpass', 210, 0), b3HP2 = F('highpass', 210, 0);
kr(b3HP.frequency); kr(b3HP2.frequency);
b1.connect(b1g); b2.connect(b2g); b3.connect(b3HP); b3HP.connect(b3HP2); b3HP2.connect(b3g);
const bLP = F('lowpass', 400, 9); kr(bLP.frequency);
b1g.connect(bLP); b2g.connect(bLP);
const b3Outlet = outlet(b3g, [bLP]);
const bEnv = CS(0);
const bVca = G(0); bEnv.connect(bVca.gain);
const bShape = ctx.createWaveShaper(); bShape.curve = kit.curves.bass; bShape.oversample = '2x'; g.nodes.push(bShape);
const bPost = G(0.75);
bLP.connect(bVca); bVca.connect(bShape); bShape.connect(bPost); bPost.connect(mix.bassIn);
const bSubVca = G(0); bSub.connect(bSubVca); bSubVca.connect(mix.subIn || mix.bassIn);
let subSyncAt = -1;
const sub2F = G(0.5); subF.connect(sub2F);
const bSub2 = O('sine'); sub2F.connect(bSub2.frequency);
const sub2G = G(0), sub2LP = F('lowpass', 55, 0.707);
bSub2.connect(sub2G); sub2G.connect(sub2LP); sub2LP.connect(bSubVca);
const upF = G(2); bassF.connect(upF);
const u1 = O('sawtooth', -9), u2 = O('sawtooth', 9);
upF.connect(u1.frequency); upF.connect(u2.frequency);
const upM = G(1), upPL = P(-0.2), upPR = P(0.2); u1.connect(upPL); u2.connect(upPR); upPL.connect(upM); upPR.connect(upM);
const upLP = F('lowpass', 2400, 0.9); kr(upLP.frequency);
const upAmt = G(0), upVca = G(0); bEnv.connect(upAmt); upAmt.connect(upVca.gain);
upM.connect(upLP); upLP.connect(upVca);
const upOutlet = outlet(upVca, [mix.bassUpIn]);
let upLevel = 0, bassHz = 92.5, subK = SUB_GAIN, sub2K = 0.5;
const bass = {
note(t, midi, dur, vel, cut, env, o = {}) {
const a = o.atk ?? 0.002, rel = o.rel ?? 0.01;
const f = mtof(midi);
bassHz = f;
bassF.offset.setValueAtTime(f, t);
const sf = mtof(o.subMidi ?? subMidi(midi));
subF.offset.setValueAtTime(sf, t);
sub2G.gain.setTargetAtTime(sf > 44 ? sub2K : 0, t, 0.004);
if (b3Outlet.on) { b3HP.frequency.setValueAtTime(f * REESE_HP, t); b3HP2.frequency.setValueAtTime(f * REESE_HP, t); }
const e = bEnv.offset;
e.setTargetAtTime(vel * 0.55, t, a);
e.setTargetAtTime(vel * 0.55 * (o.sus ?? 0.55), t + a * 5, o.dec ?? 0.08);
e.setTargetAtTime(0, t + dur, rel);
bSubVca.gain.setTargetAtTime(vel * (o.sub ?? 0.3) * subK, t, Math.max(a, 0.004));
bSubVca.gain.setTargetAtTime(0, t + dur, rel * 1.6);
const peak = Math.min(15000, cut + env * vel);
bLP.frequency.setTargetAtTime(peak, t, 0.0015);
bLP.frequency.setTargetAtTime(cut, t + 0.004, o.fdec ?? 0.055);
if (upLevel > 0.001) {
upOutlet.wake(t + dur + 0.3);
upLP.frequency.setTargetAtTime(Math.min(14000, peak * 2.2), t, 0.002);
upLP.frequency.setTargetAtTime(Math.max(800, cut * 2.6), t + 0.005, 0.09);
}
},
kickSync(tk, kb) {
if (!kb || kb.tailPhase == null || tk <= subSyncAt + 0.05) return;
const per = 1 / kb.tailHz;
let d = (-kb.tailPhase / (2 * Math.PI * kb.tailHz)) % per;
if (d < 0) d += per;
while (d < 0.003) d += per;
const ts = tk + d;
subSyncAt = tk;
const o = ctx.createOscillator();
o.type = 'sine'; o.frequency.value = 0; kr(o.frequency);
subF.connect(o.frequency); o.connect(bSubVca);
o.start(ts);
const prev = bSub;
try { prev.stop(ts); } catch (e) {   }
subOld.add(prev);
prev.onended = () => {
try { prev.disconnect(); } catch (e) {   }
try { subF.disconnect(prev.frequency); } catch (e) {   }
subOld.delete(prev);
};
bSub = o;
},
cancelFrom(t) { bEnv.offset.cancelScheduledValues(t); bSubVca.gain.cancelScheduledValues(t); },
timbre(t, name, tau = 0.04) {
const v = BASS_TIMBRE[name] || BASS_TIMBRE.roll;
b1g.gain.setTargetAtTime(v[0], t, tau); b2g.gain.setTargetAtTime(v[1], t, tau); b3g.gain.setTargetAtTime(v[2], t, tau);
bLP.Q.setTargetAtTime(v[3], t, tau);
if (v[2] > 0) { b3HP.frequency.setValueAtTime(bassHz * REESE_HP, t); b3HP2.frequency.setValueAtTime(bassHz * REESE_HP, t); }
b3Outlet.until(v[2] > 0 ? Infinity : t + tau * 8);
},
subTrim(db = 0) { subK = SUB_GAIN * Math.pow(10, (Number(db) || 0) / 20); },
sub2(k = 0.5) { sub2K = Math.max(0, Math.min(1, Number(k) || 0)); },
upper(t, level) {
if (Math.abs(level - upLevel) < 0.005) return;
upLevel = level;
upAmt.gain.setTargetAtTime(level, t, 0.06);
if (level > 0.001) upOutlet.wake(t + 0.3);
},
};
yield 'voices.arp';
const arpF = CS(440);
const a1 = O('sawtooth'), a2 = O('square');
arpF.connect(a1.frequency); arpF.connect(a2.frequency);
const aMix = G(1);
const a1g = G(ARP_PATCHES.sawsq[0]); a1.connect(a1g); a1g.connect(aMix);
const a2g = G(ARP_PATCHES.sawsq[1]); a2.connect(a2g); a2g.connect(aMix);
const aLP = F('lowpass', 2000, 7); kr(aLP.frequency);
let arpDecayK = 1, aOct = null, aOctG = null, arpPatchName = 'sawsq';
const aEnv = CS(0);
const aVca = G(0); aEnv.connect(aVca.gain);
const aPan = P(0); kr(aPan.pan);
aMix.connect(aLP); aLP.connect(aVca); aVca.connect(aPan);
const aRev = G(0.22), aDly = G(0.34);
aRev.connect(mix.revIn); aDly.connect(mix.dlyIn);
const aOutlet = outlet(aPan, [mix.arpIn, aRev, aDly]);
const sh2 = G(2), sh4 = G(4); arpF.connect(sh2); arpF.connect(sh4);
const s1 = O('sine'), s2 = O('sine'); sh2.connect(s1.frequency); sh4.connect(s2.frequency);
const shMix = G(1); s1.connect(shMix); const s2g = G(0.55); s2.connect(s2g); s2g.connect(shMix);
const shAmt = G(0), shVca = G(0); aEnv.connect(shAmt); shAmt.connect(shVca.gain);
shMix.connect(shVca);
const shDly = G(0.35);
shDly.connect(mix.dlyIn);
const shOutlet = outlet(shVca, [mix.revIn, shDly]);
let shLevel = 0;
const arp = {
note(t, midi, dur, vel, cut, decay, pan) {
decay *= arpDecayK;
aOutlet.wake(t + dur + decay * 4);
if (shLevel > 0.001) shOutlet.wake(t + dur + decay * 4);
arpF.offset.setValueAtTime(mtof(midi), t);
const e = aEnv.offset;
e.setTargetAtTime(vel, t, 0.0015);
e.setTargetAtTime(vel * 0.12, t + 0.006, decay);
e.setTargetAtTime(0, t + dur, 0.012);
aLP.frequency.setTargetAtTime(Math.min(15000, cut * 3.2), t, 0.001);
aLP.frequency.setTargetAtTime(cut, t + 0.004, decay * 0.7);
aPan.pan.setValueAtTime(pan, t);
},
sends(t, rev, dly) { aRev.gain.setTargetAtTime(rev, t, 0.3); aDly.gain.setTargetAtTime(dly, t, 0.3); },
shimmer(t, level) {
if (Math.abs(level - shLevel) < 0.002) return;
shLevel = level; shAmt.gain.setTargetAtTime(level, t, 0.4);
},
patch(t, p) {
const v = ARP_PATCHES[p.arp] || ARP_PATCHES.sawsq;
arpPatchName = p.arp in ARP_PATCHES ? p.arp : 'sawsq';
a1g.gain.setTargetAtTime(v[0], t, 0.02); a2g.gain.setTargetAtTime(v[1], t, 0.02);
aLP.Q.setTargetAtTime(p.arpQ ?? 7, t, 0.02);
arpDecayK = p.arpDecay ?? 1;
if (v[2] && !aOct) {
aOct = ctx.createOscillator(); aOct.type = 'square'; aOct.frequency.value = 0; kr(aOct.frequency);
aOctG = ctx.createGain(); aOctG.gain.value = v[2];
sh2.connect(aOct.frequency); aOct.connect(aOctG); aOctG.connect(aMix);
aOct.start(t);
} else if (!v[2] && aOct) {
const o = aOct, og = aOctG;
og.gain.setTargetAtTime(0, t, 0.02);
o.stop(t + 0.15);
o.onended = () => { try { o.disconnect(); og.disconnect(); sh2.disconnect(o.frequency); } catch (e) {   } };
aOct = aOctG = null;
} else if (aOct) aOctG.gain.setTargetAtTime(v[2], t, 0.02);
},
get patchName() { return arpPatchName; },
};
yield 'voices.pads';
const PSIDE = 0.095;
const pL = G(PSIDE), pR = G(PSIDE);
const pMerge = M();
pL.connect(pMerge, 0, 0); pR.connect(pMerge, 0, 1);
const xToR = G(0), xToL = G(0), xLPR = F('lowpass', 520, 0.6), xLPL = F('lowpass', 520, 0.6);
pL.connect(xToR); xToR.connect(xLPR); xLPR.connect(pMerge, 0, 1); pR.connect(xToL); xToL.connect(xLPL); xLPL.connect(pMerge, 0, 0);
const xAllR = G(0), xAllL = G(0);
pL.connect(xAllR); xAllR.connect(pMerge, 0, 1); pR.connect(xAllL); xAllL.connect(pMerge, 0, 0);
const pLP = F('lowpass', 1200, 0.8); kr(pLP.frequency);
const pAmp = G(0);
const pRev = G(0.2);
pMerge.connect(pLP); pLP.connect(pAmp); pAmp.connect(mix.padIn); pAmp.connect(pRev); pRev.connect(mix.revIn);
const cSplit = ctx.createChannelSplitter(2); g.nodes.push(cSplit);
const cdL = D(0.03, 0.009), cdR = D(0.03, 0.013);
const cLfo = O('sine', 0, null, 0.23), cLfoL = G(0.0012), cLfoR = G(-0.0012);
cLfo.connect(cLfoL); cLfo.connect(cLfoR); cLfoL.connect(cdL.delayTime); cLfoR.connect(cdR.delayTime);
const cWet = M(), cWetG = G(0.4);
pAmp.connect(cSplit); cSplit.connect(cdL, 0); cSplit.connect(cdR, 1);
cdL.connect(cWet, 0, 0); cdR.connect(cWet, 0, 1); cWet.connect(cWetG); cWetG.connect(mix.padIn);
const padF = [], padO = [];
const padDet = (v, right, D) => (right ? D - v * 1.2 * D / 12 : -D + v * 1.4 * D / 12);
for (let v = 0; v < 4; v++) {
const f = CS(220);
const ol = O(null, padDet(v, false, 12), wave), or = O(null, padDet(v, true, 12), wave);
f.connect(ol.frequency); f.connect(or.frequency);
ol.connect(pL); or.connect(pR);
padF.push(f); padO.push([ol, padDet(v, false, 12)], [or, padDet(v, true, 12)]);
}
const gLP = F('lowpass', 3200, 4); kr(gLP.frequency);
const gAmp = G(0);
const gDly = G(0.26), gRev = G(0.12);
pMerge.connect(gLP); gLP.connect(gAmp);
gDly.connect(mix.dlyIn); gRev.connect(mix.revIn);
const gOutlet = outlet(gAmp, [mix.gateIn, gDly, gRev]);
let padLevel = 0, padWidth = 1, padWidthAll = 1;
const pad = {
chord(t, midis, glide = 0.003, rearticulate = true) {
for (let v = 0; v < 4; v++) padF[v].offset.setTargetAtTime(mtof(midis[v]), t, Math.max(0.001, glide));
if (rearticulate && padLevel > 0.01) {
pAmp.gain.setTargetAtTime(padLevel * 0.8, t - 0.012, 0.012);
pAmp.gain.setTargetAtTime(padLevel, t + 0.03, 0.14);
}
},
level(t, v, tau = 0.25) { padLevel = v; pAmp.gain.setTargetAtTime(v, t, tau); },
cutoff(t, f, tau = 0.2) { pLP.frequency.setTargetAtTime(Math.max(120, f + 240 * Math.sin(2 * Math.PI * 0.047 * t)), t, tau); },
drift(t) {
const d = 4 * Math.sin(2 * Math.PI * 0.097 * t);
for (let i = 0; i < padO.length; i++) { const [o, base] = padO[i]; o.detune.setTargetAtTime(base + (i & 1 ? -d : d), t, 0.4); }
},
width(t, w, wAll = 1) {
w = Math.max(0, Math.min(1, w)); wAll = Math.max(0, Math.min(1, wAll));
if (w === padWidth && wAll === padWidthAll) return;
padWidth = w; padWidthAll = wAll;
const r = (1 - w) / (1 + w), ra = (1 - wAll) / (1 + wAll), n = PSIDE / Math.sqrt(1 + Math.max(r, ra) ** 2);
pL.gain.setTargetAtTime(n, t, 0.3); pR.gain.setTargetAtTime(n, t, 0.3);
const rl = Math.max(0, r - ra);
xToR.gain.setTargetAtTime(rl, t, 0.3); xToL.gain.setTargetAtTime(rl, t, 0.3);
xAllR.gain.setTargetAtTime(ra, t, 0.3); xAllL.gain.setTargetAtTime(ra, t, 0.3);
},
chorus(t, wet) { cWetG.gain.setTargetAtTime(wet, t, 0.3); },
gate(t, dur, vel) {
gOutlet.wake(t + dur + 0.05);
gAmp.gain.setTargetAtTime(vel, t, 0.0018);
gAmp.gain.setTargetAtTime(0, t + dur, 0.009);
},
gateCutoff(t, f) { gLP.frequency.setTargetAtTime(f, t, 0.08); },
sends(t, rev) { pRev.gain.setTargetAtTime(rev, t, 0.4); },
patch(t, p) {
const D = p.padDetune ?? 12;
for (let i = 0; i < padO.length; i++) {
const base = padDet(i >> 1, (i & 1) === 1, D);
padO[i][1] = base;
padO[i][0].detune.setTargetAtTime(base, t, 0.5);
}
cLfo.frequency.setTargetAtTime(p.chorusHz ?? 0.23, t, 0.5);
},
};
yield 'voices.lead';
const leadF = CS(440);
const vib = O('sine', 0, null, 5.3), vibG = G(0);
vib.connect(vibG);
const lLP = F('lowpass', 2600, 4); kr(lLP.frequency);
const leadLive = new Set();
function buildLeadPatch(name, t) {
const P = { name, nodes: [], srcs: [], osc: [] };
const g = (v) => { const n = ctx.createGain(); n.gain.value = v; P.nodes.push(n); return n; };
const lo = (type, det) => {
const o = ctx.createOscillator(); o.type = type; o.frequency.value = 0; o.detune.value = det;
kr(o.frequency); kr(o.detune);
leadF.connect(o.frequency); vibG.connect(o.detune);
P.nodes.push(o); P.srcs.push(o); P.osc.push(o);
return o;
};
const out = g(LEAD_TRIM[name] ?? 1);
if (name === 'vox') {
const src = g(1); lo('sawtooth', -5).connect(src); lo('sawtooth', 5).connect(src);
for (const [f, q, a] of [[650, 4, 0.9], [1080, 6, 0.55], [2650, 9, 0.28]]) {
const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; P.nodes.push(b);
const a2 = g(a * 0.9); src.connect(b); b.connect(a2); a2.connect(out);
}
const dry = g(0.07); src.connect(dry); dry.connect(out);
} else if (name === 'bellsaw') {
const m = g(0.3); lo('sawtooth', -5).connect(m); lo('sawtooth', 5).connect(m); m.connect(out);
const bell = g(0);
const p3 = g(0.42), p4 = g(0.25);
lo('sine', 1902).connect(p3); lo('sine', 2400).connect(p4);
p3.connect(bell); p4.connect(bell); bell.connect(out);
P.bellG = bell;
} else if (name === 'super') {
[-12, 12].forEach((d) => {
const gg = g(0.27), pp = ctx.createStereoPanner(); pp.pan.value = d < 0 ? -0.55 : 0.55; P.nodes.push(pp);
lo('sawtooth', d).connect(gg); gg.connect(pp); pp.connect(out);
});
[-4, 4].forEach((d) => {
const gg = g(0.34), pp = ctx.createStereoPanner(); pp.pan.value = d < 0 ? -0.2 : 0.2; P.nodes.push(pp);
lo('sawtooth', d).connect(gg); gg.connect(pp); pp.connect(out);
});
} else if (name === 'pwm') {
const pwD = ctx.createDelay(0.02); pwD.delayTime.value = 0.0011; P.nodes.push(pwD);
const pwLfo = ctx.createOscillator(); pwLfo.frequency.value = 0.31; P.nodes.push(pwLfo); P.srcs.push(pwLfo);
const pwDepth = g(0);
pwLfo.connect(pwDepth); pwDepth.connect(pwD.delayTime);
const ps = lo('sawtooth', 0);
const pa = g(0.4), pb = g(-0.4);
ps.connect(pa); ps.connect(pwD); pwD.connect(pb); pa.connect(out); pb.connect(out);
const sq = g(0.05); lo('square', -1200).connect(sq); sq.connect(out);
P.pwD = pwD; P.pwDepth = pwDepth;
} else {
const m = g(0.36); lo('sawtooth', -7).connect(m); lo('sawtooth', 7).connect(m); m.connect(out);
const sq = g(0.058); lo('square', -1200).connect(sq); sq.connect(out);
}
out.connect(lLP);
for (const s of P.srcs) s.start(t);
leadLive.add(P);
return P;
}
function dropLeadPatch(P, t) {
if (!P) return;
const unhook = () => {
for (const o of P.osc) { try { leadF.disconnect(o.frequency); } catch (e) {   } try { vibG.disconnect(o.detune); } catch (e) {   } }
for (const n of P.nodes) { try { n.disconnect(); } catch (e) {   } }
leadLive.delete(P);
};
let stopped = false;
for (const s of P.srcs) { try { s.stop(t); stopped = true; } catch (e) {   } }
if (stopped) P.srcs[0].onended = unhook; else unhook();
}
let leadP = null, leadTimbre = null, wantTimbre = 'super';
const lVca = G(0), lTrim = G(1);
const lRev = G(0.3), lDly = G(0.12), lPre = D(0.1, 0.03);
lLP.connect(lTrim); lTrim.connect(lVca);
lRev.connect(lPre); lPre.connect(mix.revIn); lDly.connect(mix.dlyIn);
const wIn = G(1), wHP = F('highpass', 450, 0.7), wD = D(0.03, 0.011), wG = G(0), wN = G(-1), wM = M();
wIn.connect(wHP); wHP.connect(wD); wD.connect(wG); wG.connect(wM, 0, 0); wG.connect(wN); wN.connect(wM, 0, 1); wM.connect(mix.leadIn);
const lOutlet = outlet(lVca, [mix.leadIn, lRev, lDly, wIn]);
const octG = G(0), octLP = F('lowpass', 3500, 0);
octG.connect(octLP);
const octOutlet = outlet(octLP, [lVca]);
let octOn = false, octO = null;
let dlyBase = 0.12, throwUntil = -1, relTau = 0.055;
const lead = {
note(t, midi, dur, vel, cut, glide, hold, thr = 0) {
if (!leadP) { leadP = buildLeadPatch(wantTimbre, Math.max(ctx.currentTime, t - 0.02)); leadTimbre = wantTimbre; }
lOutlet.wake(t + dur + (hold ? 2 : 0.4) + (thr ? 2.5 : 0));
const f = mtof(midi);
const pw = leadP && leadP.pwD ? leadP : null;
if (glide) {
leadF.offset.setTargetAtTime(f, t, 0.03);
if (pw) pw.pwD.delayTime.setTargetAtTime(0.5 / f, t, 0.03);
} else {
leadF.offset.setValueAtTime(f, t);
if (pw) { pw.pwD.delayTime.setValueAtTime(0.5 / f, t); pw.pwDepth.gain.setValueAtTime(0.16 / f, t); }
lVca.gain.setTargetAtTime(vel, t, 0.01);
lVca.gain.setTargetAtTime(vel * 0.78, t + 0.05, 0.3);
vibG.gain.setTargetAtTime(0, t, 0.02);
lLP.frequency.setTargetAtTime(Math.min(14000, cut * 2.1), t, 0.008);
lLP.frequency.setTargetAtTime(cut, t + 0.03, 0.22);
if (leadP && leadP.bellG) { const bg = leadP.bellG.gain; bg.setValueAtTime(0.55, t); bg.setTargetAtTime(0.08, t + 0.01, 0.16); }
}
if (dur > 0.35) vibG.gain.setTargetAtTime(11, t + 0.28, 0.18);
if (!hold) lVca.gain.setTargetAtTime(0, t + dur - 0.012, relTau);
if (thr > 0) {
lDly.gain.setTargetAtTime(thr, t, 0.01);
lDly.gain.setTargetAtTime(dlyBase, t + dur, 0.05);
throwUntil = t + dur + 0.3;
}
},
release(t) { lOutlet.wake(t + 0.4); lVca.gain.setTargetAtTime(0, t, 0.05); },
cut(t) { lOutlet.wake(t + 0.4); const p = lVca.gain; if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t); p.setTargetAtTime(0, t, 0.04); },
setRelease(tau) { relTau = Math.max(0.01, Number(tau) || 0.055); },
octave(t, on) {
on = !!on;
if (on === octOn) return;
octOn = on;
octG.gain.setTargetAtTime(on ? ({ duo: 0.21, super: 0.16, pwm: 0.3, vox: 0.22, bellsaw: 0.2 }[leadTimbre || wantTimbre] ?? 0.2) : 0, t, 0.03);
octOutlet.until(on ? Infinity : t + 0.4);
if (on && !octO) {
const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 0; o.detune.value = 1200;
kr(o.frequency); kr(o.detune);
leadF.connect(o.frequency); vibG.connect(o.detune); o.connect(octG);
o.start(t);
octO = o;
} else if (!on && octO) {
const o = octO; octO = null;
o.stop(t + 0.35);
o.onended = () => { try { leadF.disconnect(o.frequency); vibG.disconnect(o.detune); o.disconnect(); } catch (e) {   } };
}
},
trim(t, db = 0) { lTrim.gain.setTargetAtTime(Math.pow(10, (Number(db) || 0) / 20), t, 0.05); },
width(t, side) { wG.gain.setTargetAtTime(Math.max(0, Math.min(0.6, side)), t, 0.3); },
sends(t, rev, dly) {
lRev.gain.setTargetAtTime(rev, t, 0.3);
dlyBase = dly;
if (t > throwUntil) lDly.gain.setTargetAtTime(dly, t, 0.3);
},
timbre(name, t = ctx.currentTime) {
if (!LEAD_TIMBRES.includes(name)) name = 'duo';
wantTimbre = name;
if (!leadP) return;
if (name === leadTimbre) return;
dropLeadPatch(leadP, t);
leadP = buildLeadPatch(name, t);
leadTimbre = name;
},
get timbreName() { return leadTimbre || wantTimbre; },
park(t = ctx.currentTime) { if (!leadP) return; dropLeadPatch(leadP, t); leadP = null; leadTimbre = null; },
get parked() { return !leadP; },
get oscCount() { let n = 1; for (const P of leadLive) n += P.srcs.length; return n + (octO ? 1 : 0); },
};
yield 'voices.choir';
const CH_VG = 0.2165;
const chSum = G(1), chEnv = G(0), chRev = G(0.38), chDuck = G(1);
const chLP = F('lowpass', 4500, -6);
chLP.connect(chEnv);
const formants = [];
for (let k = 0; k < 3; k++) {
const [f, bw, amp] = VOWELS.ah[k];
const b = F('bandpass', f, f / bw); kr(b.frequency); kr(b.Q);
const a = G(amp * FGAIN * CH_VG * GLOT_COMP[k]);
chSum.connect(b); b.connect(a); a.connect(chLP);
formants.push({ b, a, k });
}
const CH_DET = [-5, 4, -3, 6], CH_PAN = [-0.5, 0.5, -0.45, 0.55];
const glot = glottalWave(ctx);
const chBrBP = F('bandpass', 2450, 1);
const chBrG = G(BREATH); chBrBP.connect(chBrG); chBrG.connect(chLP);
chRev.connect(mix.revIn);
chEnv.connect(chDuck);
const chOutlet = outlet(chDuck, [mix.choirIn, chRev]);
let chLevel = 0, chVowel = 'ah', chMidis = [57, 61, 64, 69], chV = null, chOffAt = Infinity, driftAt = -1;
function buildBed(t) {
const nodes = [], srcs = [], chF = [], chO = [];
const n = (x) => { nodes.push(x); return x; };
const gn = (v) => { const x = n(ctx.createGain()); x.gain.value = v; return x; };
const vibs = [[4.6, 8], [5.2, 6.5], [5.9, 9.5]].map(([hz, c]) => {
const o = n(ctx.createOscillator()); o.frequency.value = hz; srcs.push(o);
const gp = gn(c); o.connect(gp); return gp;
});
const vibN = gn(-6.5 / 6.5); vibs[1].connect(vibN);
for (let v = 0; v < 4; v++) {
const f = n(ctx.createConstantSource()); f.offset.value = mtof(chMidis[v % chMidis.length]); srcs.push(f); chF.push(f);
const o = n(ctx.createOscillator()); o.setPeriodicWave(glot); o.frequency.value = 0; o.detune.value = CH_DET[v];
kr(o.frequency); kr(o.detune); srcs.push(o); chO.push(o);
f.connect(o.frequency);
(v === 3 ? vibN : vibs[v]).connect(o.detune);
const p = n(ctx.createStereoPanner()); p.pan.value = CH_PAN[v];
o.connect(p); p.connect(chSum);
}
const br = n(ctx.createBufferSource()); br.buffer = kit.noise; br.loop = true; srcs.push(br);
br.connect(chBrBP);
for (const x of srcs) x.start(t);
driftAt = -1;
return { nodes, srcs, chF, chO };
}
function dropBed(t) {
const V = chV; chV = null;
for (const x of V.srcs) { try { x.stop(t); } catch (e) {   } }
V.srcs[0].onended = () => { for (const x of V.nodes) { try { x.disconnect(); } catch (e) {   } } };
}
const choir = {
chord(t, midis, glide = 0.025) {
chMidis = midis.slice();
if (chV) for (let v = 0; v < 4; v++) chV.chF[v].offset.setTargetAtTime(mtof(midis[v % midis.length]), t, Math.max(0.001, glide));
if (chLevel > 0.001) {
chEnv.gain.setTargetAtTime(chLevel * 0.72, t - 0.01, 0.02);
chEnv.gain.setTargetAtTime(chLevel, t + 0.03, 0.12);
}
},
level(t, v, tau = 0.15) {
chLevel = v;
if (v > 0.001) { if (!chV) chV = buildBed(t); chOffAt = Infinity; } else chOffAt = t + tau * 7 + 0.3;
chEnv.gain.setTargetAtTime(v, t, tau);
chOutlet.until(v > 0.001 ? Infinity : t + tau * 7);
},
get running() { return !!chV; },
duck(t, v, tau = 0.05) { chDuck.gain.setTargetAtTime(v, t, tau); },
vowel(t, name, tau = 0.2) {
if (name === chVowel || !VOWELS[name]) return;
chVowel = name;
for (const { b, a, k } of formants) {
const [f, bw, amp] = VOWELS[name][k];
b.frequency.setTargetAtTime(f, t, tau); b.Q.setTargetAtTime(f / bw, t, tau);
a.gain.setTargetAtTime(amp * FGAIN * CH_VG * GLOT_COMP[k], t, tau);
}
},
drift(t, rnd) {
if (!chV || t < driftAt + 1.2) return;
driftAt = t;
for (let v = 0; v < 4; v++) chV.chO[v].detune.setTargetAtTime(CH_DET[v] + (rnd() * 2 - 1) * 7, t, 0.5 + rnd() * 0.8);
},
};
yield 'voices.drone';
const drG = G(0);
const drOutlet = outlet(drG, [mix.droneIn || mix.subIn || mix.bassIn]);
let drO = null, drLevel = 0, drOffAt = Infinity, drHz = 46;
const drone = {
note(t, midi) { drHz = mtof(midi); if (drO) drO.frequency.setTargetAtTime(drHz, t, 0.4); },
level(t, v, tau = 1.5) {
if (Math.abs(v - drLevel) < 1e-4) return;
drLevel = v;
if (v > 0.001 && !drO) { drO = ctx.createOscillator(); drO.type = 'sine'; drO.frequency.value = drHz; kr(drO.frequency); drO.connect(drG); drO.start(t); }
drG.gain.setTargetAtTime(v, t, tau);
if (v > 0.001) { drOutlet.until(Infinity); drOffAt = Infinity; } else { drOutlet.until(t + tau * 6); drOffAt = t + tau * 6 + 0.5; }
},
get running() { return !!drO; },
};
const stG = G(0), stLP = F('lowpass', 420, 0.7), stRev = G(0.3);
stLP.connect(stG); stRev.connect(mix.revIn);
const stOutlet = outlet(stG, [mix.stringsIn || mix.padIn, stRev]);
let stV = null, stLevel = 0, stOffAt = Infinity, stMidis = [42, 49];
function buildStrings(t) {
const nodes = [], srcs = [], fr = [];
stMidis.forEach((m, i) => {
const f = ctx.createConstantSource(); f.offset.value = mtof(m); nodes.push(f); srcs.push(f); fr.push(f);
for (const det of [-7, 7]) {
const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 0; o.detune.value = det; kr(o.frequency);
const og = ctx.createGain(); og.gain.value = i === 0 ? 0.32 : 0.22;
const pn = ctx.createStereoPanner(); pn.pan.value = det < 0 ? -0.3 : 0.3;
f.connect(o.frequency); o.connect(og); og.connect(pn); pn.connect(stLP);
nodes.push(o, og, pn); srcs.push(o);
}
});
for (const x of srcs) x.start(t);
return { nodes, srcs, fr };
}
const strings = {
chord(t, midis) { stMidis = midis.slice(0, 2); if (stV) stV.fr.forEach((f, i) => f.offset.setTargetAtTime(mtof(stMidis[i] ?? stMidis[0]), t, 0.3)); },
level(t, v, tau = 1.5) {
if (Math.abs(v - stLevel) < 1e-4) return;
stLevel = v;
if (v > 0.001 && !stV) stV = buildStrings(t);
stG.gain.setTargetAtTime(v, t, tau);
if (v > 0.001) { stOutlet.until(Infinity); stOffAt = Infinity; } else { stOutlet.until(t + tau * 6); stOffAt = t + tau * 6 + 0.5; }
},
get running() { return !!stV; },
};
const orgWave = (() => { const n = 8, re = new Float32Array(n), im = new Float32Array(n); im[1] = 0.5; im[2] = 1; im[4] = 0.55; im[6] = 0.35; return ctx.createPeriodicWave(re, im); })();
const orgSum = G(0.16), orgL = G(0.78), orgR = G(0.78), orgM = M(), orgLP = F('lowpass', 3600, 0.6), orgAmp = G(0), orgRev = G(0.25);
orgSum.connect(orgL); orgSum.connect(orgR); orgL.connect(orgM, 0, 0); orgR.connect(orgM, 0, 1); orgM.connect(orgLP); orgLP.connect(orgAmp);
orgRev.connect(mix.revIn);
const orgOutlet = outlet(orgAmp, [mix.padIn, orgRev]);
let orgV = null, orgLevel = 0, orgOffAt = Infinity, orgMidis = [55, 58, 62, 67];
function buildOrgan(t) {
const nodes = [], srcs = [], fr = [];
const lfo = ctx.createOscillator(); lfo.frequency.value = 0.8; nodes.push(lfo); srcs.push(lfo);
const lDet = ctx.createGain(); lDet.gain.value = 6; const lL = ctx.createGain(); lL.gain.value = 0.22; const lR = ctx.createGain(); lR.gain.value = -0.22;
lfo.connect(lDet); lfo.connect(lL); lfo.connect(lR); lL.connect(orgL.gain); lR.connect(orgR.gain); nodes.push(lDet, lL, lR);
for (let v = 0; v < 4; v++) {
const o = ctx.createOscillator(); o.setPeriodicWave(orgWave); o.frequency.value = mtof(orgMidis[v % orgMidis.length]) / 2; kr(o.frequency); kr(o.detune);
o.detune.value = (v - 1.5) * 2; lDet.connect(o.detune); o.connect(orgSum);
nodes.push(o); srcs.push(o); fr.push(o);
}
for (const x of srcs) x.start(t);
return { nodes, srcs, fr };
}
const organ = {
chord(t, midis) {
orgMidis = midis.slice(0, 4);
if (orgV) orgV.fr.forEach((o, i) => o.frequency.setTargetAtTime(mtof(orgMidis[i % orgMidis.length]) / 2, t, 0.008));
if (orgLevel > 0.01) { orgAmp.gain.setTargetAtTime(orgLevel * 0.7, t - 0.01, 0.01); orgAmp.gain.setTargetAtTime(orgLevel, t + 0.02, 0.05); }
},
level(t, v, tau = 0.3) {
if (Math.abs(v - orgLevel) < 1e-4) return;
orgLevel = v;
if (v > 0.001 && !orgV) orgV = buildOrgan(t);
orgAmp.gain.setTargetAtTime(v, t, tau);
if (v > 0.001) { orgOutlet.until(Infinity); orgOffAt = Infinity; } else { orgOutlet.until(t + tau * 6); orgOffAt = t + tau * 6 + 0.5; }
},
get running() { return !!orgV; },
};
yield 'voices.air';
const airSrc = ctx.createBufferSource(); airSrc.buffer = kit.noise; airSrc.loop = true; airSrc.playbackRate.value = 0.93;
g.nodes.push(airSrc); g.sources.push(airSrc);
const airHP = F('highpass', 6200, 0.6);
const airAmp = G(0), airLfo = O('sine', 0, null, 0.071), airLfoG = G(0);
airLfo.connect(airLfoG); airLfoG.connect(airAmp.gain);
airSrc.connect(airHP); airHP.connect(airAmp);
const airOutlet = outlet(airAmp, [mix.padIn]);
let airLevel = 0;
const air = (t, level) => {
if (Math.abs(level - airLevel) < 0.0005) return;
airLevel = level;
airAmp.gain.setTargetAtTime(level, t, 1.2); airLfoG.gain.setTargetAtTime(level * 0.45, t, 1.2);
airOutlet.until(level > 0 ? Infinity : t + 6);
};
yield 'voices.start';
for (const s of g.sources) s.start();
return {
bass, arp, pad, lead, choir, air, drone, strings, organ,
idle(now) {
aOutlet.idle(now); shOutlet.idle(now); gOutlet.idle(now); lOutlet.idle(now, 1.2); upOutlet.idle(now);
airOutlet.idle(now); chOutlet.idle(now, 0.2); b3Outlet.idle(now, 0.1);
if (chV && chLevel <= 0.001 && now > chOffAt) dropBed(now);
drOutlet.idle(now, 0.2); stOutlet.idle(now, 0.2); orgOutlet.idle(now, 0.2);
if (orgV && orgLevel <= 0.001 && now > orgOffAt) { const V = orgV; orgV = null; for (const x of V.srcs) { try { x.stop(now + 0.05); } catch (e) {   } } V.srcs[0].onended = () => { for (const x of V.nodes) { try { x.disconnect(); } catch (e) {   } } }; }
if (stV && stLevel <= 0.001 && now > stOffAt) { const V = stV; stV = null; for (const x of V.srcs) { try { x.stop(now + 0.05); } catch (e) {   } } V.srcs[0].onended = () => { for (const x of V.nodes) { try { x.disconnect(); } catch (e) {   } } }; }
if (drO && drLevel <= 0.001 && now > drOffAt) { const o = drO; drO = null; try { o.stop(now + 0.05); } catch (e) {   } o.onended = () => { try { o.disconnect(); } catch (e) {   } }; }
},
silence(t) {
for (const p of [bEnv.offset, bSubVca.gain, aEnv.offset, pAmp.gain, gAmp.gain, lVca.gain, airAmp.gain, chEnv.gain, drG.gain, stG.gain, orgAmp.gain]) {
p.cancelScheduledValues(t); p.setTargetAtTime(0, t, 0.03);
}
},
dispose() {
const extra = [];
for (const P of leadLive) extra.push(...P.nodes);
if (octO) extra.push(octO);
if (aOct) extra.push(aOct, aOctG);
if (chV) extra.push(...chV.nodes);
if (drO) extra.push(drO);
if (stV) extra.push(...stV.nodes);
if (orgV) extra.push(...orgV.nodes);
for (const s of [...g.sources, bSub, ...subOld, ...extra]) { if (s.stop) { try { s.stop(); } catch (e) {   } } }
for (const n of [...g.nodes, bSub, ...subOld, ...extra]) { try { n.disconnect(); } catch (e) {   } }
subOld.clear(); leadLive.clear();
},
nodeCount: g.nodes.length,
};
}
export function createFx(ctx, mix, kit, opts = {}) {
const MAX = opts.maxOneShots ?? 40;
const SRC_CAP = opts.maxSources ?? 64;
const caps = { choir: 3, stab: 3, riser: 2, suspense: 1, braam: 2, bell: 8, figure: 3, keys: 3, spic: 4, reese: 2 };
const kinds = { choir: 0, stab: 0, riser: 0, suspense: 0, braam: 0, bell: 0, figure: 0, keys: 0, spic: 0, reese: 0 };
const glot = glottalWave(ctx);
let active = 0;
const persistent = [];
const live = new Set();
const track = (srcs) => { for (const x of srcs) live.add(x); };
const untrack = (srcs) => { for (const x of srcs) live.delete(x); };
const pg = (v, dest) => { const n = ctx.createGain(); n.gain.value = v; if (dest) n.connect(dest); persistent.push(n); return n; };
const snareBus = pg(1, mix.drums); const snareRev = pg(0.3, mix.revIn); snareBus.connect(snareRev);
const percBus = pg(1, mix.drums); const percRev = pg(0.18, mix.revIn); percBus.connect(percRev);
const cymBus = pg(1, mix.cymIn || mix.drums); const cymRev = pg(0.12, null);
{
const sp = ctx.createChannelSplitter ? ctx.createChannelSplitter(2) : null;
if (sp) {
const mg = ctx.createChannelMerger(2), dR = ctx.createDelay(0.05); dR.delayTime.value = 0.011;
cymRev.disconnect(); cymRev.connect(sp); sp.connect(mg, 0, 0); sp.connect(dR, 1); dR.connect(mg, 0, 1); mg.connect(mix.revIn);
persistent.push(sp, mg, dR);
} else cymRev.connect(mix.revIn);
}
cymBus.connect(cymRev);
const mkPan = (v, dest) => { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(dest); persistent.push(p); return p; };
const hatL = mkPan(-0.3, mix.hatsIn || mix.drums), hatR = mkPan(0.3, mix.hatsIn || mix.drums);
const tomL = mkPan(-0.12, percBus), tomR = mkPan(0.12, percBus);
const fxBus = pg(1, mix.fxIn); const fxRev = pg(0.32, mix.revIn); fxBus.connect(fxRev);
const stBus = pg(1, mix.stFx || mix.fxIn); stBus.connect(fxRev);
const buses = { kick: mix.kickIn, snare: snareBus, perc: percBus, cym: cymBus, hatL, hatR, tomL, tomR, fx: fxBus, st: stBus };
const spicLP = ctx.createBiquadFilter(); spicLP.type = 'lowpass'; spicLP.frequency.value = 3200; spicLP.Q.value = 0.6; persistent.push(spicLP);
const spicHP = ctx.createBiquadFilter(); spicHP.type = 'highpass'; spicHP.frequency.value = 190; spicHP.Q.value = 0.6; persistent.push(spicHP);
const spicBus = pg(1, null); spicBus.connect(spicHP); spicHP.connect(spicLP); spicLP.connect(mix.gateIn || mix.padIn); const spicRev = pg(0.15, mix.revIn); spicLP.connect(spicRev);
const keysBus = pg(1, mix.bellIn || mix.leadIn); const keysRev = pg(0.3, mix.revIn); keysBus.connect(keysRev); const keysDly = pg(0.12, mix.dlyIn); keysBus.connect(keysDly);
function done(list) { for (const n of list) { try { n.disconnect(); } catch (e) {   } } }
function steal() {
for (const x of live) if (x._hit && !x._prio) { try { x.stop(); } catch (e) {   } live.delete(x); return true; }
return false;
}
function hit(buffer, t, o = {}) {
if (!o.priority && (active >= MAX || live.size >= SRC_CAP)) return null;
if (o.priority && live.size >= SRC_CAP && !steal()) return null;
const gn = ctx.createGain();
if (o.fadeIn) { gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(o.gain ?? 1, t + o.fadeIn); }
else gn.gain.value = o.gain ?? 1;
const s = ctx.createBufferSource();
s.buffer = buffer;
if (o.rate && o.rate !== 1) s.playbackRate.value = o.rate;
s.connect(gn); gn.connect(buses[o.bus || 'kick']);
active++;
s._gn = gn; s._prio = !!o.priority; s._hit = true;
live.add(s);
s.onended = () => { active--; live.delete(s); done([s, gn]); };
if (o.dur != null) s.start(t, o.offset || 0, o.dur); else s.start(t, o.offset || 0);
return s;
}
function stopper(srcs, p, t0) {
return {
stop(t2) {
const now = ctx.currentTime;
t2 = Math.max(now, t2);
if (t2 > t0 + 1e-4 && p) { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t2); else p.cancelScheduledValues(t2); p.setTargetAtTime(0, t2, 0.02); }
for (const x of srcs) { try { x.stop(t2 <= t0 + 1e-4 ? t2 : t2 + 0.15); } catch (e) {   } }
},
};
}
const SRCS = { choir: 13, stab: 9, riser: 4, suspense: 11, braam: 3, bell: 2, figure: 5, keys: 9, spic: 2, reese: 3 };
function begin(kind) {
if (kinds[kind] >= caps[kind]) return false;
if (live.size + (SRCS[kind] || 4) > SRC_CAP) return false;
kinds[kind]++; active++;
return true;
}
function end(kind, list) { kinds[kind]--; active--; done(list); }
function choir(t, midis, dur, level, vowel = 'ah', atk = 0.35, rel = 0.9, dest = mix.choirIn, o = {}) {
if (!begin('choir')) return null;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const env = N(ctx.createGain()); env.gain.value = 0;
const out = N(ctx.createGain()); out.gain.value = 1;
const rev = N(ctx.createGain()); rev.gain.value = 0.38;
env.connect(out); out.connect(dest); out.connect(rev); rev.connect(mix.revIn);
const merge = N(ctx.createChannelMerger(2));
const bankIn = N(ctx.createGain()); bankIn.gain.value = 1;
const wid = o.width ?? (dest === mix.choirFx ? 0.7 : 1);
if (wid < 0.999) {
const r = (1 - wid) / (1 + wid), n0 = 1 / Math.sqrt(1 + r * r);
const sp = N(ctx.createChannelSplitter(2)), xm = N(ctx.createChannelMerger(2)), dg = N(ctx.createGain()), xL = N(ctx.createGain()), xR = N(ctx.createGain());
dg.gain.value = n0; xL.gain.value = r * n0; xR.gain.value = r * n0;
merge.connect(dg); dg.connect(bankIn);
merge.connect(sp); sp.connect(xR, 0); sp.connect(xL, 1); xR.connect(xm, 0, 1); xL.connect(xm, 0, 0); xm.connect(bankIn);
} else merge.connect(bankIn);
const lp = N(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = 4500; lp.Q.value = -6;
lp.connect(env);
(VOWELS[vowel] || VOWELS.ah).forEach(([f, bw, amp], k) => {
const b = N(ctx.createBiquadFilter()); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = f / bw;
const a = N(ctx.createGain()); a.gain.value = amp * FGAIN * GLOT_COMP[k];
bankIn.connect(b); b.connect(a); a.connect(lp);
});
const vibs = [[4.7, 8.5], [5.7, 7]].map(([hz, c]) => {
const l = N(ctx.createOscillator()); l.frequency.value = hz; srcs.push(l);
const lg = N(ctx.createGain()); lg.gain.value = c; l.connect(lg);
return lg;
});
const hold = Math.max(atk, dur) + rel;
midis.forEach((m, i) => {
for (let k = 0; k < 2; k++) {
const o = N(ctx.createOscillator()); o.setPeriodicWave(glot);
o.frequency.value = mtof(m);
const d0 = (k ? 1 : -1) * (6 + ((i * 7 + k * 3) % 5));
o.detune.setValueAtTime(d0, t);
o.detune.linearRampToValueAtTime(d0 + (((i * 5 + k * 11 + Math.round(t * 7)) % 15) - 7), t + hold);
vibs[(i + k) & 1].connect(o.detune);
const og = N(ctx.createGain()); og.gain.value = 0.32 / Math.sqrt(midis.length);
o.connect(og); og.connect(merge, 0, (i + k) % 2);
srcs.push(o);
}
});
const br = N(ctx.createBufferSource()); br.buffer = kit.noise; br.loop = true; srcs.push(br);
const brBP = N(ctx.createBiquadFilter()); brBP.type = 'bandpass'; brBP.frequency.value = 2450; brBP.Q.value = 1;
const brG = N(ctx.createGain()); brG.gain.value = BREATH * CH_VG_FX; br.connect(brBP); brBP.connect(brG); brG.connect(lp);
const p = env.gain;
p.setValueAtTime(0, t);
if (o.from > 0 && atk > 0.15) { p.linearRampToValueAtTime(level * o.from, t + 0.12); p.linearRampToValueAtTime(level, t + atk); }
else p.linearRampToValueAtTime(level, t + atk);
let holdEnd = t + Math.max(atk, dur);
p.setValueAtTime(level, holdEnd);
p.setTargetAtTime(0, holdEnd, rel / 3);
let stopAt = holdEnd + rel * 1.6 + 0.05;
for (const s of srcs) { s.start(t); s.stop(stopAt); }
track(srcs);
srcs[srcs.length - 1].onended = () => { untrack(srcs); end('choir', list); };
const restop = () => { for (const x of srcs) { try { x.stop(stopAt); } catch (e) {   } } };
return {
get end() { return holdEnd; },
extend(t2) {
if (t2 <= holdEnd + 1e-3 || ctx.currentTime >= holdEnd) return;
p.cancelScheduledValues(holdEnd);
if (t + atk >= holdEnd - 1e-6) p.linearRampToValueAtTime(level, holdEnd); else p.setValueAtTime(level, holdEnd);
p.setValueAtTime(level, t2); p.setTargetAtTime(0, t2, rel / 3);
holdEnd = t2; stopAt = t2 + rel * 1.6 + 0.05; restop();
},
release(t2) {
if (t2 >= holdEnd) return;
if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t2); else p.cancelScheduledValues(t2);
p.setTargetAtTime(0, t2, Math.min(0.1, rel / 3));
holdEnd = t2; stopAt = t2 + 0.5; restop();
},
stop(t2) { stopper(srcs, p, t).stop(t2); holdEnd = Math.min(holdEnd, t2); },
};
}
function stab(t, midis, level, decay = 0.35, dest = buses.fx) {
if (!begin('stab')) return;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const merge = N(ctx.createChannelMerger(2));
const lp = N(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 1.2;
const amp = N(ctx.createGain()); amp.gain.value = 0;
const dly = N(ctx.createGain()); dly.gain.value = 0.25;
merge.connect(lp); lp.connect(amp); amp.connect(dest); amp.connect(dly); dly.connect(mix.dlyIn);
midis.forEach((m, i) => {
for (let k = 0; k < 2; k++) {
const o = N(ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = k ? 9 : -9;
const og = N(ctx.createGain()); og.gain.value = 0.22 / Math.sqrt(midis.length);
o.connect(og); og.connect(merge, 0, (i + k) % 2);
srcs.push(o);
}
});
const sub = N(ctx.createOscillator()); sub.type = 'square'; sub.frequency.value = mtof(midis[0] - 12);
const sg = N(ctx.createGain()); sg.gain.value = 0.1; sub.connect(sg); sg.connect(merge, 0, 0); sg.connect(merge, 0, 1); srcs.push(sub);
lp.frequency.setValueAtTime(9000, t);
lp.frequency.setTargetAtTime(1300, t + 0.005, 0.16);
amp.gain.setValueAtTime(0, t);
amp.gain.linearRampToValueAtTime(level, t + 0.004);
amp.gain.setTargetAtTime(0, t + 0.01, decay);
const stopAt = t + decay * 6 + 0.05;
for (const s of srcs) { s.start(t); s.stop(stopAt); }
track(srcs);
srcs[0].onended = () => { untrack(srcs); end('stab', list); };
}
function braam(t, rootMidi, level, dur = 2.5, dest = buses.fx) {
if (!begin('braam')) return;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const lp = N(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 4;
const sh = N(ctx.createWaveShaper()); sh.curve = kit.curves.braam;
const amp = N(ctx.createGain()); amp.gain.value = 0;
lp.connect(sh); sh.connect(amp); amp.connect(dest);
[[0, -7, 0.42], [7, 3, 0.3], [12, 7, 0.3]].forEach(([iv, det, lv], k) => {
const o = N(ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = mtof(rootMidi + iv); o.detune.value = det;
if (k === 0) o.connect(lp);
else { const gg = N(ctx.createGain()); gg.gain.value = lv / 0.42; o.connect(gg); gg.connect(lp); }
srcs.push(o);
});
lp.frequency.setValueAtTime(180, t);
lp.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
lp.frequency.setTargetAtTime(800, t + 0.35, 0.6);
const p = amp.gain;
p.setValueAtTime(0, t);
p.linearRampToValueAtTime(level, t + 0.03);
p.setTargetAtTime(0, t + 0.05, 0.9);
p.setTargetAtTime(0, t + dur - 0.25, 0.06);
for (const s of srcs) { s.start(t); s.stop(t + dur); }
track(srcs);
srcs[0].onended = () => { untrack(srcs); end('braam', list); };
return stopper(srcs, p, t);
}
function riser(t, dur, level, o = {}) {
if (!begin('riser')) return null;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const nz = N(ctx.createBufferSource()); nz.buffer = kit.noise; nz.loop = true; srcs.push(nz);
const bp = N(ctx.createBiquadFilter()); bp.type = 'bandpass'; bp.Q.value = 1.8;
const hp = N(ctx.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 180;
const top = N(ctx.createBiquadFilter()); top.type = 'lowpass'; top.frequency.value = 12000; top.Q.value = 0.5;
const amp = N(ctx.createGain()); amp.gain.value = 0;
nz.connect(bp); bp.connect(hp); hp.connect(top); top.connect(amp);
amp.connect(o.dest || buses.fx);
const f0 = o.f0 ?? 280, f1 = o.f1 ?? 7500;
bp.frequency.setValueAtTime(f0, t);
bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
const plp = N(ctx.createBiquadFilter()); plp.type = 'lowpass'; plp.Q.value = 2;
plp.frequency.setValueAtTime(600, t); plp.frequency.exponentialRampToValueAtTime(6000, t + dur);
const pg2 = N(ctx.createGain()); pg2.gain.value = o.pitched ?? 0.35;
plp.connect(pg2); pg2.connect(amp);
const m0 = o.midi ?? 57, iv = o.int ?? 7, span = o.span ?? 12;
for (let k = 0; k < 3; k++) {
const s = N(ctx.createOscillator()); s.type = 'sawtooth';
s.detune.value = (k - 1) * 14;
s.frequency.setValueAtTime(mtof(m0 + (k === 2 ? iv : 0)), t);
s.frequency.exponentialRampToValueAtTime(mtof(m0 + span + (k === 2 ? iv : 0)), t + dur);
const sg = N(ctx.createGain()); sg.gain.value = 0.18;
s.connect(sg); sg.connect(plp);
srcs.push(s);
}
const p = amp.gain;
let hov = null;
if (o.hover) {
const lfo = N(ctx.createOscillator()); lfo.frequency.value = 0.25; srcs.push(lfo);
const dep = N(ctx.createGain()); dep.gain.value = 0;
const sw = N(ctx.createGain()); sw.gain.value = 1;
amp.disconnect(); amp.connect(sw); sw.connect(o.dest || buses.fx);
lfo.connect(dep); dep.connect(sw.gain);
hov = { dep, sw, gain: 1 };
}
p.setValueAtTime(0.0001, t);
if (o.fadeOut) {
p.exponentialRampToValueAtTime(level, t + dur * 0.35);
p.exponentialRampToValueAtTime(0.0001, t + dur);
} else {
if (o.stage && dur > 1.5) p.exponentialRampToValueAtTime(level * 0.2, t + 0.6);
p.exponentialRampToValueAtTime(level, t + dur);
p.setTargetAtTime(0, t + dur, 0.03);
}
let stopAt = t + dur + 0.2, endT = t + dur;
nz.start(t, Math.random() * 1.5); nz.stop(stopAt);
for (let i = 1; i < srcs.length; i++) { srcs[i].start(t); srcs[i].stop(stopAt); }
track(srcs);
nz.onended = () => { untrack(srcs); end('riser', list); };
return {
get end() { return endT; },
extend(t2) {
if (o.fadeOut || t2 <= endT + 1e-3 || ctx.currentTime >= endT) return;
p.cancelScheduledValues(endT);
if (endT <= t + dur + 1e-6) p.exponentialRampToValueAtTime(level, endT); else p.setValueAtTime(level, endT);
if (hov) {
const h0 = t + dur, now = ctx.currentTime, a = Math.max(h0, now + 0.01);
if (!hov.started) {
hov.started = true;
hov.dep.gain.setValueAtTime(0, h0); hov.dep.gain.linearRampToValueAtTime(0.3, h0 + 0.4);
pg2.gain.setTargetAtTime((o.pitched ?? 0.35) * 0.5, h0, 0.4);
} else hov.gain = Math.min(1.26, hov.gain * 1.122);
const g = hov.sw.gain; g.cancelScheduledValues(a); g.setTargetAtTime(Math.min(1.26, hov.gain), a, 0.2);
if (t2 > h0 + 2) g.setTargetAtTime(Math.min(1.26, hov.gain) * 0.63, Math.max(a + 0.25, h0 + 2), 0.5);
const bf = bp.frequency; bf.cancelScheduledValues(a);
let k = Math.max(a, h0), lo = 4000;
bf.setValueAtTime(lo, k);
while (k < t2 - 0.05) { const e = Math.min(t2, k + 3); bf.exponentialRampToValueAtTime(8000, e); if (e < t2 - 0.05) bf.setValueAtTime(lo, e + 0.001); k = e + 0.001; }
}
p.setValueAtTime(level, t2); p.setTargetAtTime(0, t2, 0.03);
endT = t2; stopAt = t2 + 0.2;
for (const x of srcs) { try { x.stop(stopAt); } catch (e) {   } }
},
cancel(t2, tau = 0.02) {
if (t2 >= stopAt - 0.05) return;
if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t2); else p.cancelScheduledValues(t2);
p.setTargetAtTime(0, t2, tau);
stopAt = Math.max(t2, t) + 0.15 + 6 * tau;
for (const x of srcs) { try { x.stop(stopAt); } catch (e) {   } }
},
};
}
function suspense(t, rootMidi, dur, level, spb, dest = buses.fx) {
if (!begin('suspense')) return null;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const merge = N(ctx.createChannelMerger(2));
const bp = N(ctx.createBiquadFilter()); bp.type = 'lowpass'; bp.frequency.value = 2800; bp.Q.value = 0.9;
const trem = N(ctx.createGain()); trem.gain.value = 0.55;
const tremL = N(ctx.createOscillator()); tremL.type = 'triangle'; tremL.frequency.value = 4 / spb; srcs.push(tremL);
const tremD = N(ctx.createGain()); tremD.gain.value = 0.45; tremL.connect(tremD); tremD.connect(trem.gain);
const amp = N(ctx.createGain()); amp.gain.value = 0;
const rev = N(ctx.createGain()); rev.gain.value = 0.55;
merge.connect(bp); bp.connect(trem); trem.connect(amp); amp.connect(dest); amp.connect(rev); rev.connect(mix.revIn);
const notes = [rootMidi + 12, rootMidi + 19, rootMidi + 20, rootMidi + 24];
notes.forEach((m, i) => {
for (let k = 0; k < 2; k++) {
const o = N(ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = k ? 8 : -8;
const og = N(ctx.createGain()); og.gain.value = 0.12;
o.connect(og); og.connect(merge, 0, (i + k) % 2);
srcs.push(o);
}
});
const dLP = N(ctx.createBiquadFilter()); dLP.type = 'lowpass'; dLP.frequency.value = 480; dLP.Q.value = 0.8;
const dG = N(ctx.createGain()); dG.gain.value = 0.3;
dLP.connect(dG); dG.connect(amp);
for (const m of [rootMidi - 12, rootMidi - 5]) {
const o = N(ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = mtof(m);
const og = N(ctx.createGain()); og.gain.value = 0.32;
o.connect(og); og.connect(dLP); srcs.push(o);
}
const p = amp.gain;
const tRel = t + dur;
p.setValueAtTime(0, t);
p.setTargetAtTime(level, t, 0.28);
p.setTargetAtTime(level * 1.25, t + dur * 0.45, dur * 0.25);
p.setTargetAtTime(0, tRel, 0.22);
bp.frequency.setValueAtTime(2200, t);
bp.frequency.exponentialRampToValueAtTime(4200, tRel);
let stopAt = tRel + 1.4;
for (const s of srcs) { s.start(t); s.stop(stopAt); }
track(srcs);
srcs[0].onended = () => { untrack(srcs); end('suspense', list); };
return {
end: tRel,
swell(t2, mul) {
if (t2 >= tRel - 0.05) return;
if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t2); else p.cancelScheduledValues(t2);
p.setTargetAtTime(level * mul, t2, 0.4);
p.setTargetAtTime(0, tRel, 0.22);
},
release(t2) {
if (t2 >= stopAt - 0.1) return;
if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t2); else p.cancelScheduledValues(t2);
p.setTargetAtTime(0, t2, 0.07);
stopAt = t2 + 0.6;
for (const s of srcs) { try { s.stop(stopAt); } catch (e) {   } }
},
};
}
function bell(t, midi, dur, level, o = {}) {
if (!begin('bell')) return;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const f = mtof(midi);
const car = N(ctx.createOscillator()); car.type = 'sine'; car.frequency.value = f;
const mod = N(ctx.createOscillator()); mod.type = 'sine'; mod.frequency.value = 2 * f;
const mg = N(ctx.createGain()); mg.gain.value = 0;
mod.connect(mg); mg.connect(car.frequency);
const lp = N(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = Math.max(1800, f * 1.5); lp.Q.value = 0.5;
const amp = N(ctx.createGain()); amp.gain.value = 0;
const rev = N(ctx.createGain()); rev.gain.value = o.rev ?? 0.45;
const dly = N(ctx.createGain()); dly.gain.value = o.dly ?? 0.3;
car.connect(lp); lp.connect(amp); amp.connect(o.dest || mix.bellIn || mix.leadIn); amp.connect(rev); rev.connect(mix.revIn); amp.connect(dly); dly.connect(mix.dlyIn);
const dec = Math.min(1.4, Math.max(0.25, dur * 0.45));
mg.gain.setValueAtTime(2.4 * 2 * f, t); mg.gain.setTargetAtTime(0.3 * 2 * f, t + 0.01, 0.12);
amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(level, t + 0.004);
amp.gain.setTargetAtTime(0, t + 0.006, dec);
const stopAt = t + dur + dec * 3 + 0.05;
amp.gain.setTargetAtTime(0, t + dur, 0.12);
srcs.push(car, mod);
for (const x of srcs) { x.start(t); x.stop(stopAt); }
track(srcs);
car.onended = () => { untrack(srcs); end('bell', list); };
return stopper(srcs, amp.gain, t);
}
function figure(notes, level, o = {}) {
if (!notes.length || !begin('figure')) return;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const t0 = notes[0].t;
const fr = N(ctx.createConstantSource()); fr.offset.value = mtof(notes[0].m); srcs.push(fr);
const sum = N(ctx.createGain()); sum.gain.value = 1;
const voicesDef = [['sawtooth', -8, 0.3], ['sawtooth', 8, 0.3], ['square', -1200, o.low ? 0.24 : 0.14]];
if (o.oct) voicesDef.push(['sawtooth', 1200, 0.17]);
for (const [type, det, lv] of voicesDef) {
const os = N(ctx.createOscillator()); os.type = type; os.frequency.value = 0; os.detune.value = det;
fr.connect(os.frequency);
const gg = N(ctx.createGain()); gg.gain.value = lv; os.connect(gg); gg.connect(sum);
srcs.push(os);
}
const lp = N(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = o.low ? 3 : 2.2;
const sh = N(ctx.createWaveShaper()); sh.curve = kit.curves.warm;
const amp = N(ctx.createGain()); amp.gain.value = 0;
const dly = N(ctx.createGain()); dly.gain.value = o.dly ?? 0.16;
sum.connect(lp); lp.connect(sh); sh.connect(amp); amp.connect(o.dest || buses.fx); amp.connect(dly); dly.connect(mix.dlyIn);
const base = o.low ? 420 : 1100, peak = o.low ? 1500 : 5200;
lp.frequency.setValueAtTime(base, t0);
let tEnd = t0;
for (const n of notes) {
const v = (n.v ?? 1) * level;
fr.offset.setValueAtTime(mtof(n.m), n.t);
amp.gain.setTargetAtTime(v, n.t, 0.004);
amp.gain.setTargetAtTime(v * 0.6, n.t + 0.04, 0.14);
amp.gain.setTargetAtTime(0, n.t + n.dur, o.rel ?? 0.06);
lp.frequency.setTargetAtTime(peak, n.t, 0.006);
lp.frequency.setTargetAtTime(base, n.t + 0.03, 0.12);
tEnd = Math.max(tEnd, n.t + n.dur);
}
const stopAt = tEnd + (o.rel ?? 0.06) * 6 + 0.05;
for (const x of srcs) { x.start(t0); x.stop(stopAt); }
track(srcs);
fr.onended = () => { untrack(srcs); end('figure', list); };
return stopper(srcs, amp.gain, t0);
}
function keys(t, midis, dur, level, pan = 0) {
if (!midis.length || !begin('keys')) return null;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const amp = N(ctx.createGain()); amp.gain.value = 0;
const pn = N(ctx.createStereoPanner()); pn.pan.value = pan;
amp.connect(pn); pn.connect(keysBus);
const ns = midis.slice(0, 3);
for (const m of ns) {
const f = mtof(m);
const car = N(ctx.createOscillator()); car.frequency.value = f;
const m1 = N(ctx.createOscillator()); m1.frequency.value = f;
const m2 = N(ctx.createOscillator()); m2.frequency.value = 14 * f;
const g1 = N(ctx.createGain()), g2 = N(ctx.createGain()), cg = N(ctx.createGain());
g1.gain.setValueAtTime(1.8 * f, t); g1.gain.setTargetAtTime(0.25 * f, t + 0.002, 0.35);
g2.gain.setValueAtTime(0.9 * f, t); g2.gain.setTargetAtTime(0, t + 0.002, 0.025);
m1.connect(g1); g1.connect(car.frequency); m2.connect(g2); g2.connect(car.frequency);
cg.gain.value = 0.5 / Math.sqrt(ns.length); car.connect(cg); cg.connect(amp);
srcs.push(car, m1, m2);
}
const p = amp.gain;
p.setValueAtTime(0, t); p.linearRampToValueAtTime(level, t + 0.003); p.setTargetAtTime(0, t + 0.004, 0.6);
p.setTargetAtTime(0, t + dur, 0.08);
const stopAt = t + dur + 0.5;
for (const x of srcs) { x.start(t); x.stop(stopAt); }
track(srcs);
srcs[0].onended = () => { untrack(srcs); end('keys', list); };
return stopper(srcs, p, t);
}
function spic(t, midi, level, pan = 0) {
if (!begin('spic')) return null;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const amp = N(ctx.createGain()); amp.gain.value = 0;
const pn = N(ctx.createStereoPanner()); pn.pan.value = pan;
amp.connect(pn); pn.connect(spicBus);
for (const det of [-7, 7]) { const o = N(ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = det; o.connect(amp); srcs.push(o); }
const p = amp.gain;
p.setValueAtTime(0, t); p.linearRampToValueAtTime(level * 0.3, t + 0.02); p.setTargetAtTime(0, t + 0.02, 0.09);
const stopAt = t + 0.5;
for (const x of srcs) { x.start(t); x.stop(stopAt); }
track(srcs);
srcs[0].onended = () => { untrack(srcs); end('spic', list); };
return null;
}
function reeseLead(t, midi, dur, level) {
if (!begin('reese')) return null;
const list = [], srcs = [];
const N = (n) => { list.push(n); return n; };
const lp = N(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.Q.value = 2;
const sh = N(ctx.createWaveShaper()); sh.curve = kit.curves.braam;
const hp = N(ctx.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 170; hp.Q.value = 0.7;
const amp = N(ctx.createGain()); amp.gain.value = 0;
lp.connect(sh); sh.connect(hp); hp.connect(amp); amp.connect(mix.leadIn);
for (const [type, det, lv] of [['sawtooth', -16, 0.45], ['sawtooth', 16, 0.45], ['square', -1200, 0.25]]) {
const o = N(ctx.createOscillator()); o.type = type; o.frequency.value = mtof(midi); o.detune.value = det;
const og = N(ctx.createGain()); og.gain.value = lv; o.connect(og); og.connect(lp); srcs.push(o);
}
lp.frequency.setValueAtTime(3200, t); lp.frequency.setTargetAtTime(1600, t + 0.01, 0.12);
const p = amp.gain;
p.setValueAtTime(0, t); p.linearRampToValueAtTime(level, t + 0.006); p.setValueAtTime(level, t + Math.max(0.01, dur)); p.setTargetAtTime(0, t + Math.max(0.01, dur), 0.06);
const stopAt = t + dur + 0.45;
for (const x of srcs) { x.start(t); x.stop(stopAt); }
track(srcs);
srcs[0].onended = () => { untrack(srcs); end('reese', list); };
return stopper(srcs, p, t);
}
function cut(t) { for (const x of live) { try { x.stop(t); } catch (e) {   } } }
return {
hit, choir, stab, riser, suspense, braam, bell, figure, keys, spic, reeseLead, cut, buses,
get active() { return active; },
get scheduled() { return live.size; },
dispose() { done(persistent); },
};
}
