import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
import * as CFG from "@rl/js/config.js";
import { APPROACH, approachInGap } from "@rl/js/config.js";
import { RAIL_LIGHT, railLightZs } from "@rl/js/env/layout.js";
import { GeoBucket, mat } from "@rl/js/env/util.js";
import { GLOW_CH, GLOW_SHAPE } from "@rl/js/env/glows.js";
const RS = CFG.RUNWAY_START || {};
export const RUNWAY_T = Object.freeze({ TUBES0: 1.3, PAIR_DT: 0.1, RISE: 0.42, HEAD_DECAY: 0.35, FLOOD_T: 2.9, END: 3.9, ...(RS.T || {}) });
export const RUNWAY_DARK = Object.freeze({ KEY: 0.03, AMBIENT: 0.06, FILL: 0.05, FLOOD: 0.06, SPOT: 0.35, TUBE_EMBER: 0.03, SKY: 1, MOON: 1, POOL: 0.22, ...(RS.DARK || {}) });
const FIX = { X: 6.92, LENS_HDR: 3.4, REST: 0.25, WASH_REST: 0.06, WASH_GAIN: 0.6, SHOW_LOW: 0.1, GLOW: 0.3, ...(RS.FIXTURES || {}) };
const TUBE_DIP = RS.TUBE_DIP ?? 0.78;
const REDUCED_S = 0.4;
const SKIP_SETTLE_S = 0.5;
const PRIME_FADE_S = 0.8;
const HIDDEN_S = 0.4;
const GUARD_S = 2.5;
export const LANE_SHOW = (() => {
const A = APPROACH, zs = railLightZs();
const nK = Math.round((A.Z1 - A.Z0) / A.LIGHT_SPACING) + 1;
const rankOfK = [];
for (let k = 0, r = 0; k < nK; k++) rankOfK.push(approachInGap(A.Z0 + k * A.LIGHT_SPACING) ? -1 : r++);
const fixtures = [];
for (let k = 0; k + 1 < nK; k++) {
if (rankOfK[k] < 0 || rankOfK[k + 1] < 0) continue;
for (const s of [1, -1]) fixtures.push({ side: s, x: s * FIX.X, z: A.Z0 + (k + 0.5) * A.LIGHT_SPACING, rank: rankOfK[k] + 0.5 });
}
const washes = (RS.WASHES || [{ x: 6.5, z: -89 }, { x: -6.5, z: -94.2 }]).map((w) => {
const s = Math.sign(w.x) || 1;
return { side: s, x: w.x, z: w.z, cx: w.x - s * 1.5, cz: w.z + 1.6, rx: 1.7, rz: 3.0 };
});
return { PAIRS: zs.length, ZS: zs, NK: nK, RANK_OF_K: rankOfK, FIXTURES: fixtures, WASHES: washes };
})();
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const easeOut3 = (u) => 1 - (1 - u) * (1 - u) * (1 - u);
const lerp = (a, b, u) => a + (b - a) * u;
const glide = (u) => { u = clamp01(u); return u * u * u * (u * (u * 6 - 15) + 10); };
function bang(t, t0, d, peak, atk, tau) {
if (t <= t0) return d;
const u = t - t0;
return u < atk ? d + (peak - d) * easeOut3(u / atk) : 1 + (peak - 1) * Math.exp(-(u - atk) / tau);
}
function bangC(t, t0, d, peak, atk) {
if (t <= t0) return d;
const u = t - t0, x = u / (0.9 * atk);
return d + (1 - d) * glide(u / atk) + (peak - 1) * x * x * Math.exp(2 * (1 - x));
}
export function createRunway({ q = {}, materials, glows, props = null, floods = null, ground = null } = {}) {
const T = RUNWAY_T, D = RUNWAY_DARK, L = LANE_SHOW, N = L.PAIRS;
const group = new THREE.Group();
group.name = 'env.runwayStart';
const body = new GeoBucket({ colors: true });
const lens = new GeoBucket({ colors: true });
const lensVerts = [];
let lensN = 0;
const washLens = new GeoBucket();
const fixGlows = [];
const washGlows = [];
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _d = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
const Z_FWD = new THREE.Vector3(0, 0, 1);
const lensCol = [FIX.LENS_HDR * 0.94, FIX.LENS_HDR * 0.98, FIX.LENS_HDR * 1.06];
for (const fx of L.FIXTURES) {
const s = fx.side, x = fx.x, z = fx.z, y0 = 0.8;
body.add(new THREE.BoxGeometry(0.42, 0.11, 0.44), mat(x, y0 + 0.055, z), 0x1a1b1e);
body.add(new THREE.BoxGeometry(0.46, 0.06, 0.12), mat(x, y0 + 0.14, z), 0x2a2c30);
for (const a of [-1, 1]) body.add(new THREE.BoxGeometry(0.045, 0.36, 0.1), mat(x + a * 0.21, y0 + 0.32, z), 0x2a2c30);
_d.set(-s * 0.32, 0.3, -1).normalize();
_q.setFromUnitVectors(Z_FWD, _d);
_p.set(x, y0 + 0.41, z);
const at = (lm) => new THREE.Matrix4().multiplyMatrices(_m.compose(_p, _q, _one), lm);
body.add(new THREE.BoxGeometry(0.36, 0.34, 0.38), at(mat(0, 0, -0.02)), 0x141518);
body.add(new THREE.CylinderGeometry(0.155, 0.155, 0.03, 24).rotateX(Math.PI / 2), at(mat(0, 0, 0.178)), 0x0c0c0d);
const lg = new THREE.CircleGeometry(0.128, 28), nv = lg.index ? lg.index.count : lg.attributes.position.count;
lens.add(lg, at(mat(0, 0, 0.195)), 0xffffff);
lensVerts.push([lensN, nv]); lensN += nv;
const g = new THREE.Vector3(0, 0, 0.25).applyMatrix4(at(new THREE.Matrix4()));
const col = [2.1, 2.2, 2.45];
const i = glows.add(g.x, g.y, g.z, FIX.GLOW, col[0] * FIX.REST, col[1] * FIX.REST, col[2] * FIX.REST,
{ dir: _d.toArray(), directional: 0.7, channel: GLOW_CH.GENERAL, shape: GLOW_SHAPE.SOFT, push: 0.2 });
fixGlows.push({ i, rank: fx.rank, col });
}
for (const w of L.WASHES) {
const s = w.side, x = w.x, z = w.z;
_d.set(-s, -0.32, 0.55).normalize();
_q.setFromUnitVectors(Z_FWD, _d);
_p.set(x, 0.3, z);
const at = (lm) => new THREE.Matrix4().multiplyMatrices(_m.compose(_p, _q, _one), lm);
body.add(new THREE.BoxGeometry(0.42, 0.04, 0.3), mat(x, 0.02, z), 0x1a1b1e);
for (const a of [-1, 1]) body.add(new THREE.BoxGeometry(0.03, 0.3, 0.05), mat(x, 0.17, z + a * 0.17), 0x2a2c30);
body.add(new THREE.CylinderGeometry(0.14, 0.12, 0.3, 18).rotateX(Math.PI / 2), at(mat(0, 0, -0.05)), 0x141518);
washLens.add(new THREE.CircleGeometry(0.12, 24), at(mat(0, 0, 0.102)));
const g = new THREE.Vector3(0, 0, 0.16).applyMatrix4(at(new THREE.Matrix4()));
const col = [4.2, 0.17, 0.1];
const i = glows.add(g.x, g.y, g.z, 0.75, col[0] * FIX.WASH_REST, col[1] * FIX.WASH_REST, col[2] * FIX.WASH_REST,
{ dir: _d.toArray(), directional: 0.6, channel: GLOW_CH.GENERAL, shape: GLOW_SHAPE.SOFT, push: 0.15 });
if (i >= 0) washGlows.push({ i, col });
}
const bodyMesh = new THREE.Mesh(body.build(), materials.steelVC);
bodyMesh.name = 'env.runwayStart.fixtures';
bodyMesh.receiveShadow = true;
group.add(bodyMesh);
const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...lensCol), vertexColors: true, fog: true });
lensMat.name = 'env.runwayStart.lens';
const lensMesh = new THREE.Mesh(lens.build(), lensMat);
const lensColor = lensMesh.geometry.attributes.color;
lensMesh.name = 'env.runwayStart.lens';
group.add(lensMesh);
const washCol = [7.5, 0.28, 0.17];
const washMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...washCol).multiplyScalar(FIX.WASH_REST), fog: true });
washMat.name = 'env.runwayStart.washLens';
const washMesh = new THREE.Mesh(washLens.build(), washMat);
washMesh.name = 'env.runwayStart.washLens';
group.add(washMesh);
const laneLed = materials.laneLed && materials.laneLed.userData.uLane ? materials.laneLed : null;
const uLane = laneLed ? laneLed.userData.uLane.value : null;
if (laneLed && laneLed.userData.uLaneY) laneLed.userData.uLaneY.value.z = D.TUBE_EMBER;
const gU = ground && ground.uniforms;
const uLaneT = gU && gU.uLaneT ? gU.uLaneT.value : null;
const uWash = gU && gU.uLaneWash ? gU.uLaneWash : null;
const uRedWash = gU && gU.uRedWash ? gU.uRedWash : null;
const tubeGlows = (props && props.laneGlows) || [];
const leadRange = floods && floods.mastGlows && floods.mastGlows.M1 ? floods.mastGlows.M1 : null;
const Y0 = RAIL_LIGHT.Y0, Y1 = RAIL_LIGHT.Y1, LEN = Y1 - Y0;
const colRuns = [], posRuns = [];
{
const runs = (idx) => {
const s = [...new Set(idx.filter((i) => i >= 0))].sort((a, b) => a - b), out = [];
for (const i of s) { const r = out[out.length - 1]; if (r && r[1] === i) r[1] = i + 1; else out.push([i, i + 1]); }
return out;
};
const all = [...tubeGlows.map((g) => g.i), ...fixGlows.map((g) => g.i), ...washGlows.map((g) => g.i)];
if (leadRange) for (let i = leadRange[0]; i < leadRange[1]; i++) all.push(i);
colRuns.push(...runs(all));
const pos = tubeGlows.map((g) => g.i);
if (leadRange) for (let i = leadRange[0]; i < leadRange[1]; i++) pos.push(i);
posRuns.push(...runs(pos));
}
const M = { key: 1, ambient: 1, fill: 1, flood: 1, venue: 1, spot: 1, lead: 1, sky: 1, moon: 1, beam: 1, pool: 1, on: false };
let leadSize = 1;
const fills = new Float32Array(N), heads = new Float32Array(N), gains = new Float32Array(N).fill(1);
const fixLvl = new Float32Array(fixGlows.length);
let phase = 'idle';
let active = false, flushOnce = false;
let playing = false, reduced = false, hold = false;
let t = 0, speed = 1, skips = 0;
let syncT = null;
let w = 0, wTarget = 0;
let washLvl = 0;
let guardT = 0;
let heldW = -1, glowsSeen = false;
const cues = [];
let cueAt = 0;
const listeners = [];
function emit(name, d) {
for (let k = 0; k < listeners.length; k++) { try { listeners[k](name, d); } catch (e) { console.warn('[env] runway cue', e); } }
}
function buildCues() {
cues.length = 0; cueAt = 0;
if (reduced) { cues.push({ t: 0, name: 'floodHit', d: { pos: null, gain: 0.8 } }); return; }
const span = (N - 1) * T.PAIR_DT + T.RISE + 0.5;
cues.push({ t: T.TUBES0 - 0.04, name: 'laneHum', d: { pos: [0, 1.6, (APPROACH.Z0 + APPROACH.Z1) / 2], gain: 0.8, duration: span } });
for (let k = 0; k < N; k++) {
cues.push({ t: T.TUBES0 + k * T.PAIR_DT, name: 'laneRelay', d: { pos: [0, 1.8, L.ZS[k]], gain: 0.6 + 0.4 * (N > 1 ? k / (N - 1) : 1), pair: k } });
}
cues.push({ t: T.FLOOD_T, name: 'floodHit', d: { pos: null, gain: 1 } });
cues.sort((a, b) => a.t - b.t);
}
function evalHeld() {
const E = D.TUBE_EMBER, ws = w * w * (3 - 2 * w);
for (let k = 0; k < N; k++) { fills[k] = 1; heads[k] = 0; gains[k] = 1 - (1 - E) * ws; }
for (let j = 0; j < fixGlows.length; j++) fixLvl[j] = FIX.REST + (1 - FIX.REST) * ws;
washLvl = ws;
M.key = lerp(1, D.KEY, ws); M.ambient = lerp(1, D.AMBIENT, ws); M.fill = lerp(1, D.FILL, ws);
M.flood = lerp(1, D.FLOOD, ws); M.spot = lerp(1, D.SPOT, ws); M.lead = M.flood; M.venue = M.flood;
M.sky = lerp(1, D.SKY, ws); M.moon = lerp(1, D.MOON, ws); M.beam = 1;
M.pool = lerp(1, D.POOL, ws);
leadSize = 1;
}
function evalPlay(tt) {
const E = D.TUBE_EMBER;
if (reduced) {
const u = sstep(0, REDUCED_S, tt);
for (let k = 0; k < N; k++) { fills[k] = 1; heads[k] = 0; gains[k] = E + (1 - E) * u; }
for (let j = 0; j < fixGlows.length; j++) fixLvl[j] = FIX.REST + (1 - FIX.REST) * (1 - u);
washLvl = 1 - u;
M.key = lerp(D.KEY, 1, u); M.ambient = lerp(D.AMBIENT, 1, u); M.fill = lerp(D.FILL, 1, u);
M.flood = lerp(D.FLOOD, 1, u); M.spot = lerp(D.SPOT, 1, u); M.lead = M.flood; M.venue = M.flood;
M.sky = lerp(D.SKY, 1, u); M.moon = lerp(D.MOON, 1, u); M.beam = 1;
M.pool = lerp(D.POOL, 1, u);
leadSize = 1;
return;
}
const dip = 1 - TUBE_DIP * (sstep(T.FLOOD_T + 0.02, T.FLOOD_T + 0.14, tt) - sstep(T.FLOOD_T + 0.4, T.END - 0.15, tt));
for (let k = 0; k < N; k++) {
const s0 = T.TUBES0 + k * T.PAIR_DT, u = (tt - s0) / T.RISE;
gains[k] = dip;
if (u <= 0) { fills[k] = 0; heads[k] = 0; continue; }
fills[k] = u >= 1 ? 1 : 0.7 * u + 0.3 * u * u * (3 - 2 * u);
heads[k] = u < 1 ? Math.min(1, (tt - s0) / 0.03) : 1 - sstep(0, T.HEAD_DECAY, tt - s0 - T.RISE);
}
const ft = T.FLOOD_T;
const fixBack = sstep(ft + 0.35, T.END - 0.15, tt);
for (let j = 0; j < fixGlows.length; j++) {
const th = T.TUBES0 + fixGlows[j].rank * T.PAIR_DT + 0.1;
fixLvl[j] = lerp(lerp(1, FIX.SHOW_LOW, sstep(th, th + 0.3, tt)), FIX.REST, fixBack);
}
washLvl = 1 - sstep(ft - 0.15, ft + 0.7, tt);
const win = 1 - sstep(T.END - 0.5, T.END, tt);
const W = (v) => 1 + (v - 1) * win;
const tEnd = T.TUBES0 + (N - 1) * T.PAIR_DT;
const pre = lerp(D.FLOOD, 0.5, sstep(tEnd - 0.15, tEnd + 0.3, tt));
M.lead = W(bang(tt, ft, pre, 2.6, 0.05, 0.22));
leadSize = 1 + (1.0 * sstep(tEnd - 0.15, tEnd + 0.3, tt) + 4.0 * clamp01((M.lead - 1) / 1.6)) * (1 - sstep(ft + 0.3, T.END - 0.1, tt));
M.key = W(bangC(tt, ft + 0.04, D.KEY, 1.7, 0.18));
M.fill = W(bangC(tt, ft + 0.06, D.FILL, 1.4, 0.18));
M.flood = W(bangC(tt, ft + 0.1, D.FLOOD, 1.8, 0.2));
M.beam = W(bangC(tt, ft + 0.02, 1, 2.6, 0.12));
M.ambient = W(lerp(D.AMBIENT, 1, sstep(ft + 0.1, ft + 0.6, tt)));
M.spot = W(lerp(D.SPOT, 1, sstep(ft, ft + 0.7, tt)));
M.sky = W(lerp(D.SKY, 1, sstep(ft + 0.05, ft + 0.75, tt)));
M.moon = W(lerp(D.MOON, 1, sstep(ft + 0.1, ft + 0.6, tt)));
M.venue = M.flood;
M.pool = W(lerp(D.POOL, 1, sstep(ft + 0.04, ft + 0.75, tt)));
}
const washBase = new THREE.Color(...washCol);
let gc = null, oc = null;
const setC = (i, k) => { const j = i * 4; gc[j] = oc[j] * k; gc[j + 1] = oc[j + 1] * k; gc[j + 2] = oc[j + 2] * k; };
const setRGB = (i, col, k) => { const j = i * 4; gc[j] = col[0] * k; gc[j + 1] = col[1] * k; gc[j + 2] = col[2] * k; };
function writeState(rest) {
const E = D.TUBE_EMBER;
if (uLane) for (let k = 0; k < N; k++) {
uLane[k * 3] = rest ? 1 : fills[k]; uLane[k * 3 + 1] = rest ? 0 : heads[k]; uLane[k * 3 + 2] = rest ? 1 : gains[k];
}
if (uLaneT) for (let k = 0; k < N; k++) {
const f = fills[k];
uLaneT[k * 2] = rest ? 1 : gains[k] * (E + (1 - E) * Math.min(1, f * 1.6)) * (1 + 0.5 * heads[k]) * M.pool;
uLaneT[k * 2 + 1] = rest ? 1 : f;
}
if (uWash) uWash.value = rest ? 0 : washLvl * FIX.WASH_GAIN * D.POOL;
if (uRedWash) uRedWash.value = rest ? 1 : M.pool;
group.userData.pool = rest ? 1 : M.pool;
if (lensColor) {
const a = lensColor.array;
for (let j = 0; j < lensVerts.length; j++) {
const v = rest || j >= fixLvl.length ? FIX.REST : fixLvl[j], lv = lensVerts[j];
a.fill(v, lv[0] * 3, (lv[0] + lv[1]) * 3);
}
lensColor.needsUpdate = true;
}
washMat.color.copy(washBase).multiplyScalar(rest ? FIX.WASH_REST : FIX.WASH_REST + (1 - FIX.WASH_REST) * washLvl);
const gm = glows.mesh;
if (!gm) return;
const iCol = gm.geometry.attributes.iCol, iPos = gm.geometry.attributes.iPos;
const p = iPos.array, op = glows.aPos;
gc = iCol.array; oc = glows.aCol;
for (let n = 0; n < tubeGlows.length; n++) {
const g = tubeGlows[n], k = g.pair, j = g.i * 4;
if (rest) { setC(g.i, 1); p[j + 1] = op[j + 1]; continue; }
const f = fills[k];
setC(g.i, gains[k] * (f + (1 - f) * E) * (1 + 0.7 * heads[k]));
p[j + 1] = Y0 + LEN * Math.max(0.04, 0.5 * f);
}
if (leadRange) {
const r = rest ? 1 : (M.flood > 1e-4 ? M.lead / M.flood : 1), sz = rest ? 1 : leadSize;
for (let i = leadRange[0]; i < leadRange[1]; i++) { setC(i, r); p[i * 4 + 3] = op[i * 4 + 3] * sz; }
}
for (let j = 0; j < fixGlows.length; j++) { const g = fixGlows[j]; if (g.i < 0) continue; if (rest) setC(g.i, 1); else setRGB(g.i, g.col, fixLvl[j]); }
for (let j = 0; j < washGlows.length; j++) { if (rest) setC(washGlows[j].i, 1); else setRGB(washGlows[j].i, washGlows[j].col, FIX.WASH_REST + (1 - FIX.WASH_REST) * washLvl); }
for (let r = 0; r < colRuns.length; r++) iCol.addUpdateRange(colRuns[r][0] * 4, (colRuns[r][1] - colRuns[r][0]) * 4);
iCol.needsUpdate = true;
if (posRuns.length) { for (let r = 0; r < posRuns.length; r++) iPos.addUpdateRange(posRuns[r][0] * 4, (posRuns[r][1] - posRuns[r][0]) * 4); iPos.needsUpdate = true; }
}
function restM() { M.key = M.ambient = M.fill = M.flood = M.venue = M.spot = M.lead = M.sky = M.moon = M.beam = M.pool = 1; }
function reset() {
const was = active;
active = false; playing = false; hold = false; reduced = false;
phase = 'idle'; t = 0; speed = 1; skips = 0; w = 0; wTarget = 0; guardT = 0; syncT = null;
cues.length = 0; cueAt = 0;
fills.fill(1); heads.fill(0); gains.fill(1);
restM();
writeState(true);
if (was) flushOnce = true;
}
function prime({ instant = true } = {}) {
if (playing) { playing = false; hold = false; cues.length = 0; cueAt = 0; }
active = true; phase = 'primed'; skips = 0; guardT = 0; wTarget = 1;
if (instant) w = 1;
heldW = w; glowsSeen = !!glows.mesh;
evalHeld();
writeState(false);
}
function play({ delay = 0, reduced: red = null, speed: sp = 1 } = {}) {
if (!active || phase !== 'primed' || w < 1) { active = true; w = 1; }
reduced = red == null ? !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) : !!red;
playing = true; hold = false; skips = 0; wTarget = 1;
speed = Number.isFinite(sp) && sp > 0 ? sp : 1;
t = -Math.max(0, +delay || 0); syncT = null;
buildCues();
phase = 'tubes';
evalPlay(t);
writeState(false);
return reduced ? REDUCED_S : T.END;
}
function skip() {
if (!active) return;
if (!playing || skips > 0 || reduced) { reset(); return; }
skips = 1;
if (t < T.FLOOD_T) {
t = T.FLOOD_T;
while (cueAt < cues.length && cues[cueAt].t < T.FLOOD_T) cueAt++;
}
hold = false; syncT = null;
speed = Math.max(speed, (T.END - t) / SKIP_SETTLE_S);
}
function sync(tt) {
if (!active || !playing || hold || reduced || !Number.isFinite(tt)) return;
syncT = syncT == null ? tt : Math.max(syncT, tt);
}
function seek(tt, { hold: h = false } = {}) {
if (!playing) play({ reduced: false });
t = +tt || 0;
while (cueAt < cues.length && cues[cueAt].t < t) cueAt++;
hold = !!h;
evalPlay(t);
writeState(false);
}
function update(dt, menu) {
if (!active) {
if (flushOnce) { flushOnce = false; restM(); M.on = true; return M; }
M.on = false;
return M;
}
dt = Math.min(Math.max(+dt || 0, 0), 0.1);
M.on = true;
if (!playing) {
if (menu === false && phase === 'primed') { guardT += dt; if (guardT > GUARD_S) { phase = 'release'; wTarget = 0; } } else guardT = 0;
if (w !== wTarget) w = wTarget > w ? Math.min(wTarget, w + dt / PRIME_FADE_S) : Math.max(wTarget, w - dt / PRIME_FADE_S);
if (phase === 'release' && w <= 0) { reset(); flushOnce = false; restM(); M.on = true; return M; }
if (w !== heldW || !glowsSeen) { heldW = w; glowsSeen = !!glows.mesh; evalHeld(); writeState(false); }
return M;
}
if (!hold) {
if (syncT != null) { if (syncT > t) t = syncT; syncT = null; }
else t += dt * speed;
}
const la = hold ? 0 : Math.min(0.034, Math.max(dt, 1 / 120)) * speed;
while (cueAt < cues.length && cues[cueAt].t <= t + la) { const c = cues[cueAt++]; c.d.delay = Math.max(0, (c.t - t) / speed); emit(c.name, c.d); }
const end = reduced ? REDUCED_S : T.END;
if (t >= end) { reset(); flushOnce = false; restM(); M.on = true; return M; }
phase = reduced ? 'settle' : t < T.FLOOD_T ? 'tubes' : t < T.FLOOD_T + 0.5 ? 'floods' : 'settle';
evalPlay(t);
writeState(false);
return M;
}
function onCue(fn) {
if (typeof fn !== 'function') return () => {};
listeners.push(fn);
return () => { const k = listeners.indexOf(fn); if (k >= 0) listeners.splice(k, 1); };
}
const doc = typeof document !== 'undefined' && document && typeof document.addEventListener === 'function' ? document : null;
let hidAt = -1;
const onVis = () => {
const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
if (doc.hidden) { hidAt = now; return; }
if (hidAt >= 0 && now - hidAt > HIDDEN_S * 1000 && active && playing) reset();
hidAt = -1;
};
if (doc) doc.addEventListener('visibilitychange', onVis);
function dispose() {
if (doc) doc.removeEventListener('visibilitychange', onVis);
reset();
listeners.length = 0;
lensMat.dispose(); washMat.dispose();
}
writeState(true);
return {
group, prime, play, update, sync, skip, reset, onCue, seek, dispose,
get active() { return active; },
get phase() { return phase; },
get t() { return t; },
T, DARK: D, fills, heads,
_debug: { tubeGlows, fixGlows, washGlows, leadRange, colRuns, M, uLane, uLaneT },
};
}
