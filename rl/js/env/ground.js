import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
import {
ARENA, RAMP, APPROACH, KICKER, CROSS_LINES, ZONES, LINEUP, LIGHT_ROW, LIGHT_PLAN, XING, PROPS, RUNWAY, STAGE,
CROWD, HALL, VENUE, fromRampLocal,
} from "@rl/js/config.js";
import { MASK_ORIGIN, MASK_SIZE } from "@rl/js/env/textures.js";
import { GLSL_NOISE } from "@rl/js/env/glsl.js";
import { RAIL_LIGHT, LINEUP_HEADLIGHT_POOLS, ENV_INTENSITY } from "@rl/js/env/layout.js";
import { LANE_SHOW } from "@rl/js/env/runway.js";
import { getPoolMap } from "@rl/js/env/fog.js";
import { CANVAS_LEGEND, onCanvasFonts } from "@rl/js/rui/canvas-type.js";
import * as CFG from "@rl/js/config.js";
const f = (x) => Number(x).toFixed(4);
const v2 = (x, y) => `vec2( ${f(x)}, ${f(y)} )`;
export const HEADLIGHT_SLOTS = 5;
export const GROUND_LOOK = { KEY_POW: 6.0, KEY_FLOOR: 0.06, POOL_PEAK: 5.5, OUT_K: 0.3, ALBEDO: 1.5, GLOW_COMP: 0.373, STREAK: 0.7, SHEEN: 1.2, SPOT: 0.16  , HEADLIGHT: 0, MOON: 0.06,
SHEEN_MASK: [0.12, 0.45], SHEEN_F: [0.45, 0.85], TINT: [0.99, 1.0, 1.01], KEY_NEUTRAL: [1.08, 1.0, 0.84],
FG: { K: 0.62, D: [1.5, 10.0], H: [3.0, 8.0], LO: [0.85, 1.3] },
FLOOR_AMB: { E: 0.1, TINT: [0.86, 0.98, 1.2] },
JOINT: { JX: 7.5, JZ: 15.0, HW: 0.045, K: 0.3, W_POOL: 0.5, ON: [0.42, 0.58] }, PAD_K: 1.05, MARKS_FAR: 0.35,
MAST_WASH: { R: 3.4, K: 0.85 },
RUNUP_ALB: 0.04, RUNUP: { EDGE: 0.55, GRAIN: 0.12, RUBBER: 0.45, TOE_D: 1.2, TOE_ALB: 0.11, TOE_I: 2.2, TOE_FALL: 0.5 },
GAP: { POLISH: 1.1, BAND: 1.9, RUBBER: 0.3, ARC_CELL: 26, ARC_P: 0.38, ARC_K: 0.5, PATCH: 0.6, W_POOL: 0.15 },
WARM: [1.138, 0.981, 0.785],
SKIRT: 0.075, ASPH_VAR: 0.15, MARKS_K: 0.4, GRAIN: 0.26,
PAINT: { ALB: 0.22, DIRT: 0.3, ERODE: 0.012 },
PAINT2: { ALB: 0.55, HW: 0.07, EDGE: 0.004, SPECK: 0.1, FADE: 0.25, ROUGH: 0.55 },
AGG: { K: 0.5, CHIP: 0.35, N: 0.22 }, SCUFF: { K: 0.42, TRACK: 0.82, X_R: 9.0 }, PATCH: { CELL: 7.0, P: 0.32, K: 0.85, SEAM: 0.35 },
ROUGH: [0.8, 0.95], TUBE_REFL: 0.15, WET_K: 0.45,
SPRINT: { X: 82, HW: 4.0, STRIP_K: 0.62, DIRT: [0.16, 0.115, 0.075], Z_DIRT: [26, 36], EDGE: 1.6, TICK: [0.28, 0.45, 0.95] },
RED_WASH_I: 2.1,
DESERT: { AMB: 0.0026, TINT: [1.0, 0.98, 0.97], GRAIN: 0.3 },
DIR_ROUGH: 1.0, DIR_F90: 0.3,
SPEC_NV: [0.05, 0.35], SPEC_CUT: 1 };
const ENV_I = ENV_INTENSITY;
export const RUNOFF_LOOK = (() => {
const G = LIGHT_PLAN.GRAVEL || {};
return {
FILL: G.FILL ?? 0.12, FILL_TINT: G.FILL_TINT || [1.0, 0.96, 0.9],
GRAIN: Object.assign({ PEB: 0.045, K: 0.5, CLUMP: 0.2, RAKE: 0.1, PATCH: 0.14 }, G.GRAIN),
KERB: Object.assign({ W: 1.4, BLOCK: 2.0, RED: [0.4, 0.03, 0.025], WHITE: 0.5 }, G.KERB),
TEXT: Object.assign({ STR: 'RUN-OFF', W: 8.4, L: 4.4, GAP: 2.6, SPACING: 34, EDGE_MIN: 5 }, G.TEXT),
};
})();
function makeRunText(str) {
const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128;
const t = new THREE.CanvasTexture(cv);
t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
const draw = () => {
const g = cv.getContext('2d'); if (!g) return;
g.clearRect(0, 0, cv.width, cv.height);
let fs = 100;
g.font = `400 ${fs}px ${CANVAS_LEGEND}`;
if ('letterSpacing' in g) g.letterSpacing = `${(fs * 0.06).toFixed(1)}px`;
let m = g.measureText(str);
const hh = (m.actualBoundingBoxAscent || fs * 0.72) + (m.actualBoundingBoxDescent || 0);
fs = Math.floor(fs * Math.min((cv.width * 0.94) / Math.max(m.width, 1), (cv.height * 0.8) / Math.max(hh, 1)));
g.font = `400 ${fs}px ${CANVAS_LEGEND}`;
if ('letterSpacing' in g) g.letterSpacing = `${(fs * 0.06).toFixed(1)}px`;
m = g.measureText(str);
const asc = m.actualBoundingBoxAscent || fs * 0.72, desc = m.actualBoundingBoxDescent || 0;
g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
g.fillText(str, cv.width / 2, cv.height / 2 + (asc - desc) / 2);
t.needsUpdate = true;
};
draw();
try { onCanvasFonts(draw); } catch (e) {   }
return t;
}
export function runoffMarkings() {
const T = RUNOFF_LOOK.TEXT, KW = RUNOFF_LOOK.KERB.W, out = [];
const beds = [ZONES.ARRESTOR, ZONES.SPRINT_TRAP, ZONES.GAP_RUNOFF]
.filter((z) => z && [z.x0, z.x1, z.z0, z.z1].every(Number.isFinite) && z.x1 - z.x0 > 2 && z.z1 - z.z0 > 2);
for (const z of beds) {
const cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2;
const zEdge = Math.abs(cz) >= Math.abs(cx);
const e = zEdge ? (cz > 0 ? z.z0 : z.z1) : (cx > 0 ? z.x0 : z.x1);
const fd = zEdge ? (cz > 0 ? 1 : -1) : (cx > 0 ? 1 : -1);
const a0 = zEdge ? z.x0 : z.z0, a1 = zEdge ? z.x1 : z.z1, len = a1 - a0;
const lo = a0 + T.EDGE_MIN + T.W / 2, hi = a1 - T.EDGE_MIN - T.W / 2;
const n = hi > lo ? Math.max(1, Math.round(len / T.SPACING)) : 1;
const pos = [];
for (let i = 0; i < n; i++) pos.push(hi > lo ? Math.min(hi, Math.max(lo, a0 + (i + 0.5) * len / n)) : (a0 + a1) / 2);
const lanes = [];
if (zEdge) {
lanes.push(CROSS_LINES[0][0][0], GROUND_LOOK.SPRINT.X);
for (const J of (CFG.JUMPS || [])) {
if (!J.axisS || Math.abs(J.axisS[2]) < 0.9 || Math.sign(J.axisS[2]) !== fd) continue;
lanes.push(J.origin[0] + J.axisS[0] * (e - J.origin[2]) / J.axisS[2]);
}
}
const used = new Set();
for (const l of lanes) {
if (!(l >= lo && l <= hi)) continue;
let bi = -1, bd = Infinity;
pos.forEach((q, i) => { const d = Math.abs(q - l); if (!used.has(i) && d < bd) { bd = d; bi = i; } });
if (bi >= 0 && bd < len / n / 2) { pos[bi] = l; used.add(bi); }
}
const back = e - fd * (KW + T.GAP + T.L / 2);
for (const a of pos) out.push(zEdge ? [a, back, 0, fd] : [back, a, fd, 0]);
}
return out;
}
export const GROUND_RED_WASHES = (() => {
const out = [];
const add = (c, r, ang, k, fix) => out.push({ c, r, ang, k, fix });
const xw = STAGE.DECK.X0 - 1, zN = CROWD.Z1 + 4;
for (const [z, k] of [[STAGE.DECK.Z0 - 4, 0.9], [(STAGE.DECK.Z0 + STAGE.DECK.Z1) / 2, 1.0], [STAGE.DECK.Z1 + 8, 0.85]]) add([xw - 6, z], [5.5, 10], 0, k, [xw - 0.6, z]);
for (const [x, k] of [[STAGE.DECK.X1 - 4, 0.9], [CROWD.X0 - 6, 0.8]]) add([x, zN + 5.5], [9, 5], 0, k, [x, zN + 0.6]);
const rp = (s, w) => { const q = fromRampLocal(s, w); return [q[0], q[2]]; };
const rAng = Math.atan2(RAMP.AXIS_S[2], RAMP.AXIS_S[0]);
for (const sg of [-1, 1]) add(rp(-14, sg * 12.5), [8, 3], rAng, 0.85, rp(-14, sg * 15));
for (const J of (CFG.JUMPS || [])) {
const ang = Math.atan2(J.axisS[2], J.axisS[0]), hw = J.halfWidth || 3;
for (const sg of [-1, 1]) {
const c = [J.origin[0] + J.axisS[0] * 2 + J.axisW[0] * sg * (hw + 3.5), J.origin[2] + J.axisS[2] * 2 + J.axisW[2] * sg * (hw + 3.5)];
add(c, [7, 3.2], ang, 0.75, [J.origin[0] + J.axisW[0] * sg * (hw + 6), J.origin[2] + J.axisW[2] * sg * (hw + 6)]);
}
}
const MW = GROUND_LOOK.MAST_WASH;
for (const fl of (CFG.FLOODLIGHTS || [])) {
if (fl.kind !== 'tower' || !fl.pos) continue;
const hsh = Math.abs(Math.sin(fl.pos[0] * 12.9898 + fl.pos[2] * 78.233) * 43758.5453) % 1;
add([fl.pos[0], fl.pos[2]], [MW.R * (1.05 + 0.35 * hsh), MW.R * (0.8 + 0.2 * hsh)], hsh * 3.1416, MW.K * (0.8 + 0.4 * hsh), [fl.pos[0], fl.pos[2]]);
}
return out;
})();
export function createGround({ q, tex, streakCount }) {
const N = streakCount;
const LP = LIGHT_PLAN, HL = LP.HEADLIGHT, A = LP.ASPHALT, WET = LP.WET;
const uniforms = {
tAlb: { value: tex.asphalt.albedo },
tSurf: { value: tex.asphalt.surface },
tNrm: { value: tex.asphalt.normal },
tMask: { value: tex.mask },
tMarks: { value: tex.marks },
tFloor: { value: getPoolMap().floorTexture },
uStreakPos: { value: Array.from({ length: N }, () => new THREE.Vector4(0, -1000, 0, 0)) },
uStreakCol: { value: Array.from({ length: N }, () => new THREE.Color(0, 0, 0)) },
uRedGlow: { value: 1 },
uRailGlow: { value: 1 },
uLaneT: { value: new Float32Array(LANE_SHOW.PAIRS * 2).fill(1) },
uLaneWash: { value: 0 },
uHeadGlow: { value: 1 },
uKeyI: { value: LP.KEY_INTENSITY },
uXing: { value: 0.12 },
uYard: { value: 0 },
uStage: { value: new THREE.Color(1, 0.06, 0.04) },
uHL: { value: Array.from({ length: HEADLIGHT_SLOTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
uHLB: { value: Array.from({ length: HEADLIGHT_SLOTS }, () => new THREE.Vector4(0, 1, 1, 0)) },
uTime: { value: 0 },
uToe: { value: 1 },
uRedWash: { value: 1 },
uSkirt: { value: GROUND_LOOK.SKIRT },
uFloorAmb: { value: new THREE.Color(...GROUND_LOOK.FLOOR_AMB.TINT.map((t) => t * GROUND_LOOK.FLOOR_AMB.E)) },
uGround: { value: new THREE.Vector4(GROUND_LOOK.KEY_POW, GROUND_LOOK.ALBEDO, GROUND_LOOK.STREAK, GROUND_LOOK.SHEEN) },
uGround2: { value: new THREE.Vector4(GROUND_LOOK.SPOT, GROUND_LOOK.HEADLIGHT, GROUND_LOOK.KEY_FLOOR, GROUND_LOOK.MOON) },
uGround3: { value: new THREE.Vector4(GROUND_LOOK.DIR_ROUGH, GROUND_LOOK.DIR_F90, GROUND_LOOK.POOL_PEAK, GROUND_LOOK.SPEC_CUT) },
uDesert: { value: new THREE.Color(GROUND_LOOK.DESERT.AMB * GROUND_LOOK.DESERT.TINT[0], GROUND_LOOK.DESERT.AMB * GROUND_LOOK.DESERT.TINT[1], GROUND_LOOK.DESERT.AMB * GROUND_LOOK.DESERT.TINT[2]) },
uGravAlb: { value: (() => { const c = new THREE.Color(LP.GRAVEL.COLOR || '#d8cfbe'), l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b || 1, a = LP.GRAVEL.ALBEDO ?? 0.2; return new THREE.Color(c.r * a / l, c.g * a / l, c.b * a / l); })() },
uGravFill: { value: new THREE.Color(...RUNOFF_LOOK.FILL_TINT.map((t) => t * RUNOFF_LOOK.FILL)) },
tRunTxt: { value: makeRunText(RUNOFF_LOOK.TEXT.STR) },
};
const POLY = ARENA.POLY;
const polyGLSL = `const vec2 ENV_POLY[ ${POLY.length} ] = vec2[ ${POLY.length} ]( ${POLY.map((p) => v2(p[0], p[1])).join(', ')} );`;
const [K, R] = CROSS_LINES;
const AR = ZONES.ARRESTOR, TR = ZONES.SPRINT_TRAP, BAY = ZONES.RAMP_BAY, FS = ZONES.FREESTYLE, SP = ZONES.SPRINT;
const rect = (z) => ({ c: [(z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2], h: [(z.x1 - z.x0) / 2, (z.z1 - z.z0) / 2] });
const rAR = rect(AR), rTR = rect(TR);
const GR = ZONES.GAP_RUNOFF, rGR = GR && [GR.x0, GR.x1, GR.z0, GR.z1].every(Number.isFinite) ? rect(GR) : null;
const hasBay = !!(BAY && BAY.s1 > BAY.s0 && BAY.w1 > BAY.w0);
const bayC = hasBay ? [(BAY.s0 + BAY.s1) / 2, (BAY.w0 + BAY.w1) / 2] : [0, 0], bayH = hasBay ? [(BAY.s1 - BAY.s0) / 2, (BAY.w1 - BAY.w0) / 2] : [0, 0];
const PAD = RAMP.RUNUP_PAD;
const kz0 = KICKER.ORIGIN[2], kz1 = KICKER.ORIGIN[2] + KICKER.PROFILE[KICKER.PROFILE.length - 1][0];
const strips = LINEUP.LED_STRIPS;
const SPUR = LIGHT_ROW.SPUR;
const lrA = fromRampLocal(LIGHT_ROW.S0, LIGHT_ROW.W + 0.4), lrB = fromRampLocal(LIGHT_ROW.S1, LIGHT_ROW.W + 0.4);
const swW = RAMP.HALF_WIDTH - 0.04;
const swA = [fromRampLocal(0, -swW), fromRampLocal(3.0, -swW)], swB = [fromRampLocal(0, swW), fromRampLocal(3.0, swW)];
const RT = PROPS.SPRINT.RED_TUBES;
const LS = LANE_SHOW;
const GL = PROPS.GROUND_LAMPS;
const portal = PROPS.SPRINT.PORTAL;
const RY = XING.RETURN_YIELD;
const yD = (() => {
const pth = ZONES.RETURN.path; let best = 0, bd = Infinity;
for (let i = 0; i < pth.length - 1; i++) { const m = [(pth[i][0] + pth[i + 1][0]) / 2, (pth[i][1] + pth[i + 1][1]) / 2]; const d = Math.hypot(m[0] - RY.at[0], m[1] - RY.at[1]); if (d < bd) { bd = d; best = i; } }
const a = pth[best], b = pth[best + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
})();
const yC = [RY.at[0] - yD[0] * 12, RY.at[1] - yD[1] * 12];
const SA = { x0: STAGE.DECK.X0 - 4, x1: CROWD.X1 + 8, z0: CROWD.Z0 - 34, z1: CROWD.Z1 + 20 };
const hallA = HALL.CORNERS[3], hallB = HALL.CORNERS[0];
const hallF0 = HALL.CORNERS[0], hallF1 = HALL.CORNERS[1];
const headGLSL = LINEUP_HEADLIGHT_POOLS.map((h) =>
`  { vec2 d = p - ${v2(h.x, h.z)}; vec2 e = vec2( dot( d, ${v2(h.fx, h.fz)} ) / ${f(h.len)}, dot( d, ${v2(-h.fz, h.fx)} ) / ${f(h.half)} ); g += ${f(h.semi ? 1.3 : 1.0)} * exp( - dot( e, e ) ); }`).join('\n');
const DL = [];
{ const [Kl, Rl] = CROSS_LINES; DL.push([Kl[0][0], Math.max(Kl[0][1], APPROACH.Z1 + 6), Kl[1][0], Kl[1][1]]);
const rl = Math.hypot(Rl[1][0] - Rl[0][0], Rl[1][1] - Rl[0][1]) || 1, rk = Math.max(0, 1 - 30 / rl);
DL.push([Rl[0][0], Rl[0][1], Rl[0][0] + (Rl[1][0] - Rl[0][0]) * rk, Rl[0][1] + (Rl[1][1] - Rl[0][1]) * rk]);
DL.push([(SP.x0 + SP.x1) / 2 - 4, SP.z0 - 10, (SP.x0 + SP.x1) / 2 - 4, SP.z1], [(SP.x0 + SP.x1) / 2 + 6, SP.z0 - 10, (SP.x0 + SP.x1) / 2 + 6, SP.z1]);
const rp = ZONES.RETURN.path; for (let i = 0; i < rp.length - 1; i++) DL.push([rp[i][0], rp[i][1], rp[i + 1][0], rp[i + 1][1]]);
for (const J of (CFG.JUMPS || [])) { const s0 = (J.RUNUP ? J.RUNUP[0] : -40) * 0.8, s1 = J.landing ? J.landing.s1 : 60;
DL.push([J.origin[0] + J.axisS[0] * s0, J.origin[2] + J.axisS[2] * s0, J.origin[0] + J.axisS[0] * s1, J.origin[2] + J.axisS[2] * s1]); } }
const dlGLSL = DL.map((d) => `  d = min( d, sdSg( p, ${v2(d[0], d[1])}, ${v2(d[2], d[3])} ) );`).join('\n');
const GP = GROUND_LOOK.GAP;
const RW = GROUND_RED_WASHES;
const washGLSL = RW.map((w) => {
const c = Math.cos(w.ang || 0), sn = Math.sin(w.ang || 0);
return `  { vec2 d = p - ${v2(w.c[0], w.c[1])}; vec2 e = vec2( dot( d, ${v2(c, sn)} ) / ${f(w.r[0])}, dot( d, ${v2(-sn, c)} ) / ${f(w.r[1])} ); float q = dot( e, e ); rw += ${f(w.k ?? 1)} * ( exp( - q * q ) + 0.18 * exp( - q * 0.25 ) ); }`;
}).join('\n');
const PADW = PAD.halfWidth, RU = GROUND_LOOK.RUNUP;
const RL_ = RUNOFF_LOOK, GG = RL_.GRAIN, GK = RL_.KERB, GT = RL_.TEXT;
const bedRects = [rAR, rTR].concat(rGR ? [rGR] : []);
const alongGLSL = bedRects.map((r) => `  { vec2 d = abs( p - ${v2(r.c[0], r.c[1])} ) - ${v2(r.h[0], r.h[1])}; float s = length( max( d, 0.0 ) ) + min( max( d.x, d.y ), 0.0 ); if ( s < best ) { best = s; al = d.x > d.y ? p.y : p.x; } }`)
.concat(hasBay ? [`  { vec2 d = abs( rl - ${v2(bayC[0], bayC[1])} ) - ${v2(bayH[0], bayH[1])}; float s = length( max( d, 0.0 ) ) + min( max( d.x, d.y ), 0.0 ); if ( s < best ) { best = s; al = d.x > d.y ? rl.y : rl.x; } }`] : []).join('\n');
const RM = runoffMarkings(), RMN = Math.max(1, RM.length);
const rmGLSL = `const vec4 ENV_RUNM[ ${RMN} ] = vec4[ ${RMN} ]( ${(RM.length ? RM : [[0, -1e4, 0, 1]]).map((m) => `vec4( ${f(m[0])}, ${f(m[1])}, ${f(m[2])}, ${f(m[3])} )`).join(', ')} );`;
const P2 = GROUND_LOOK.PAINT2, AG = GROUND_LOOK.AGG, SC = GROUND_LOOK.SCUFF, PT = GROUND_LOOK.PATCH, GS = GROUND_LOOK.SPRINT;
const spHalf = Math.max(GS.X - SP.x0, SP.x1 - GS.X), sx0 = GS.X - GS.HW, sx1 = GS.X + GS.HW;
const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.6 });
mat.name = 'env.ground';
mat.onBeforeCompile = (shader) => {
Object.assign(shader.uniforms, uniforms);
shader.vertexShader = shader.vertexShader
.replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
const pars =  `
varying vec3 vGW;
uniform sampler2D tAlb, tSurf, tNrm, tMask, tMarks, tFloor;
uniform vec4 uStreakPos[ ${N} ];
uniform vec3 uStreakCol[ ${N} ];
uniform vec4 uHL[ ${HEADLIGHT_SLOTS} ];
uniform vec4 uHLB[ ${HEADLIGHT_SLOTS} ];
uniform vec3 uStage;
uniform float uRedGlow, uRailGlow, uHeadGlow, uTime, uKeyI, uXing, uYard, uToe, uRedWash, uSkirt;
uniform vec4 uGround, uGround2, uGround3;
uniform vec3 uDesert, uFloorAmb, uGravAlb, uGravFill;
uniform sampler2D tRunTxt;
uniform vec2 uLaneT[ ${LS.PAIRS} ];
uniform float uLaneWash;

const float ENV_LANE_RANK[ ${LS.NK} ] = float[ ${LS.NK} ]( ${LS.RANK_OF_K.map((r) => r.toFixed(1)).join(', ')} );
vec2 envLaneT( float zk ) {
  int k = clamp( int( floor( ( zk - ${f(RAIL_LIGHT.Z0)} ) / ${f(RAIL_LIGHT.STEP)} + 0.5 ) ), 0, ${LS.NK - 1} );
  float r = ENV_LANE_RANK[ k ];
  return r < 0.0 ? vec2( 0.0 ) : uLaneT[ int( r + 0.5 ) ];
}
float gWet, gDamp, gTarmac, gPaint, gHeight, gRough, gGravel, gKeyMask, gOut, gPxs, gPoolF, gScrub, gRunup, gBoostM;
vec3 gKeyTint;
vec2 gRL;




float envFloorKey( vec4 fm, float inside ) {
  float base = uGround2.z * mix( ${f(GROUND_LOOK.OUT_K)}, 1.0, inside );
  float peak = uGround3.z * fm.z;
  return base + max( peak - base, 0.0 ) * pow( fm.x, uGround.x ) + uSkirt * uGround3.z * fm.w;
}


vec3 envGroundMask( float r ) { return gKeyMask * gKeyTint; }
vec3 gWN, gDiffKey, gInlay;
${polyGLSL}
float sdBx( vec2 p, vec2 b ) { vec2 d = abs( p ) - b; return length( max( d, 0.0 ) ) + min( max( d.x, d.y ), 0.0 ); }
float sdSg( vec2 p, vec2 a, vec2 b ) { vec2 pa = p - a, ba = b - a; float h = clamp( dot( pa, ba ) / dot( ba, ba ), 0.0, 1.0 ); return length( pa - ba * h ); }

float envDriveD( vec2 p ) {
  float d = 1e4;
${dlGLSL}
  return d;
}
${GLSL_NOISE}

float envPolySD( vec2 p ) {
  float d = 1e9; bool inside = false;
  for ( int i = 0; i < ${POLY.length}; i ++ ) {
    vec2 a = ENV_POLY[ i ], b = ENV_POLY[ i == ${POLY.length - 1} ? 0 : i + 1 ];
    d = min( d, sdSg( p, a, b ) );
    if ( ( a.y > p.y ) != ( b.y > p.y ) ) {
      float xi = a.x + ( p.y - a.y ) / ( b.y - a.y ) * ( b.x - a.x );
      if ( p.x < xi ) inside = ! inside;
    }
  }
  return inside ? d : - d;
}
vec2 envRampLocal( vec2 p ) {
  vec2 d = p - ${v2(RAMP.ORIGIN[0], RAMP.ORIGIN[2])};
  return vec2( dot( d, ${v2(RAMP.AXIS_S[0], RAMP.AXIS_S[2])} ), dot( d, ${v2(RAMP.AXIS_W[0], RAMP.AXIS_W[2])} ) );
}

float envGravelSD( vec2 p, vec2 rl ) {
  float a = sdBx( p - ${v2(rAR.c[0], rAR.c[1])}, ${v2(rAR.h[0], rAR.h[1])} );
  float t = sdBx( p - ${v2(rTR.c[0], rTR.c[1])}, ${v2(rTR.h[0], rTR.h[1])} );
  float b = ${hasBay ? `max( max( sdBx( rl - ${v2(bayC[0], bayC[1])}, ${v2(bayH[0], bayH[1])} ), p.x - ${f(BAY.x1)} ), p.y - ${f(BAY.z1)} )` : '1e4'};
  float g = ${rGR ? `sdBx( p - ${v2(rGR.c[0], rGR.c[1])}, ${v2(rGR.h[0], rGR.h[1])} )` : '1e4'};
  return - min( min( min( a, t ), b ), g );
}

float envGravelAlong( vec2 p, vec2 rl ) {
  float best = 1e9, al = 0.0;
${alongGLSL}
  return al;
}

${rmGLSL}
float envRunText( vec2 p ) {
  float best = 1e9; vec2 uv = vec2( 0.0 );
  for ( int i = 0; i < ${RMN}; i ++ ) {
    vec4 m = ENV_RUNM[ i ];
    vec2 d = p - m.xy;
    vec2 q = vec2( dot( d, vec2( - m.w, m.z ) ) / ${f(GT.W)} + 0.5, dot( d, m.zw ) / ${f(GT.L)} + 0.5 );
    float b = max( abs( q.x - 0.5 ), abs( q.y - 0.5 ) );
    if ( b < best ) { best = b; uv = q; }
  }
  return texture2D( tRunTxt, clamp( uv, 0.0, 1.0 ) ).a * step( best, 0.5 );
}
float lineAA( float d, float hw ) {
  float w = fwidth( d ) * 0.85 + 1e-4;
  return clamp( ( hw - d ) / w + 0.5, 0.0, 1.0 ) * min( 1.0, hw * 2.0 / w );
}

float envMarkings( vec2 p, float gsd ) {
  float m = 0.0;
  m = max( m, lineAA( sdSg( p, ${v2(K[0][0], K[0][1])}, ${v2(K[1][0], K[1][1])} ), ${f(P2.HW)} ) );
  m = max( m, lineAA( sdSg( p, ${v2(R[0][0], R[0][1])}, ${v2(R[1][0], R[1][1])} ), ${f(P2.HW)} ) );

  m = max( m, lineAA( abs( p.y - ${f(APPROACH.STOP_BAR_Z)} ), 0.15 ) * step( abs( p.x ), 5.5 ) );

  float inZ = step( ${f(SP.z0)}, p.y ) * step( p.y, ${f(SP.z1)} );
  // (VENUE fix2, 16.23) the dark strip's two edge lines (x ${f(sx0)} / ${f(sx1)}) with dense ruler ticks pointing in: every

  float tz = p.y - ${f(SP.z0)};
  float dH = abs( tz * 2.0 - floor( tz * 2.0 + 0.5 ) ) * 0.5;
  float is1 = step( abs( tz - floor( tz + 0.5 ) ), 0.1 ), is5 = step( abs( tz / 5.0 - floor( tz / 5.0 + 0.5 ) ) * 5.0, 0.1 );
  float tl = mix( mix( ${f(GS.TICK[0])}, ${f(GS.TICK[1])}, is1 ), ${f(GS.TICK[2])}, is5 );
  float inL = p.x - ${f(sx0 + 0.1)}, inR = ${f(sx1 - 0.1)} - p.x;
  float tick = mix( lineAA( dH, 0.022 ), 0.09, smoothstep( 0.06, 0.18, fwidth( tz ) ) );
  m = max( m, tick * inZ * ( step( 0.0, inL ) * step( inL, tl ) + step( 0.0, inR ) * step( inR, tl ) ) );
  m = max( m, lineAA( min( abs( p.x - ${f(sx0 + 0.05)} ), abs( p.x - ${f(sx1 - 0.05)} ) ), 0.06 ) * inZ );
  m = max( m, lineAA( abs( p.y - ${f(SP.z0)} ), 0.15 ) * step( ${f(sx0)}, p.x ) * step( p.x, ${f(sx1)} ) );

  return m;
}

float envChevrons( vec2 p ) {
  vec2 d = p - ${v2(yC[0], yC[1])};
  vec2 q = vec2( dot( d, ${v2(yD[0], yD[1])} ), dot( d, ${v2(-yD[1], yD[0])} ) );
  float m = 0.0;
  for ( int k = 0; k < 3; k ++ ) {
    vec2 c = q - vec2( float( k ) * 2.4 - 2.4, 0.0 );
    float s = min( sdSg( c, vec2( -0.9, -1.3 ), vec2( 0.0, 0.0 ) ), sdSg( c, vec2( -0.9, 1.3 ), vec2( 0.0, 0.0 ) ) );
    m = max( m, lineAA( s, 0.14 ) );
  }
  return m;
}

float envInlays( vec2 p ) {
  float hl = ${f(XING.INLAY.len / 2)};
  float kk = lineAA( abs( abs( p.x ) - 0.16 ), 0.025 ) * step( abs( p.y ), hl );
  vec2 rd = ${v2(VENUE.R_DIR[0], VENUE.R_DIR[2])};
  float s = dot( p, rd ), o = dot( p, vec2( - rd.y, rd.x ) );
  float rr = lineAA( abs( abs( o ) - 0.16 ), 0.025 ) * step( abs( s ), hl );
  return max( kk, rr );
}





float envTubeW( float dz, float dy, float up, float t ) {
  float sh = 0.05 + t * 0.022, sv = 0.12 + t * 0.16;
  return exp( - dz * dz / ( sh * sh ) ) * exp( - dy * dy / ( sv * sv ) ) * up * min( 1.0, 0.12 / sh );
}
float tubeRefl( vec3 p, vec3 R, float X, float Z0, float Z1, float STEP, float Y0, float Y1 ) {
  float dx = X - p.x;
  if ( R.x * dx <= 0.0 ) return 0.0;
  float t = dx / R.x;
  vec3 h = p + R * t;
  float zk = clamp( floor( ( h.z - Z0 ) / STEP + 0.5 ) * STEP + Z0, Z0, Z1 );
  float dz = h.z - zk;
  float dy = max( Y0 - h.y, 0.0 ) + max( h.y - Y1, 0.0 );
  float up = exp( - max( h.y - Y0, 0.0 ) * ${f(1 / WET.REFL_FADE_H)} );
  float z2 = zk + ( dz > 0.0 ? STEP : - STEP );
  float w2 = ( z2 >= Z0 - 0.01 && z2 <= Z1 + 0.01 ) ? 1.0 : 0.0;
  return envTubeW( dz, dy, up, t ) + w2 * envTubeW( h.z - z2, dy, up, t );
}

float envLaneRefl( vec3 p, vec3 R, float X ) {
  float dx = X - p.x;
  if ( R.x * dx <= 0.0 ) return 0.0;
  float t = dx / R.x;
  vec3 h = p + R * t;
  float zk = clamp( floor( ( h.z - ${f(RAIL_LIGHT.Z0)} ) / ${f(RAIL_LIGHT.STEP)} + 0.5 ) * ${f(RAIL_LIGHT.STEP)} + ${f(RAIL_LIGHT.Z0)}, ${f(RAIL_LIGHT.Z0)}, ${f(RAIL_LIGHT.Z1)} );
  vec2 lt = envLaneT( zk );
  float y1 = lt.y >= 1.0 ? ${f(RAIL_LIGHT.Y1)} : ${f(RAIL_LIGHT.Y0)} + ${f(RAIL_LIGHT.Y1 - RAIL_LIGHT.Y0)} * lt.y;
  float dz = h.z - zk;
  float dy = max( ${f(RAIL_LIGHT.Y0)} - h.y, 0.0 ) + max( h.y - y1, 0.0 );
  float up = exp( - max( h.y - ${f(RAIL_LIGHT.Y0)}, 0.0 ) * ${f(1 / WET.REFL_FADE_H)} );
  float z2 = zk + ( dz > 0.0 ? ${f(RAIL_LIGHT.STEP)} : ${f(-RAIL_LIGHT.STEP)} );
  vec2 lt2 = ( z2 >= ${f(RAIL_LIGHT.Z0 - 0.01)} && z2 <= ${f(RAIL_LIGHT.Z1 + 0.01)} ) ? envLaneT( z2 ) : vec2( 0.0 );
  float dy2 = max( ${f(RAIL_LIGHT.Y0)} - h.y, 0.0 ) + max( h.y - ( lt2.y >= 1.0 ? ${f(RAIL_LIGHT.Y1)} : ${f(RAIL_LIGHT.Y0)} + ${f(RAIL_LIGHT.Y1 - RAIL_LIGHT.Y0)} * lt2.y ), 0.0 );
  return lt.x * envTubeW( dz, dy, up, t ) + lt2.x * envTubeW( h.z - z2, dy2, up, t );
}
`;
const mapFrag =  `
{
  vec2 p = vGW.xz;
  gScrub = 0.0;
  vec2 rl = envRampLocal( p );

  float sd = envPolySD( p );
  gTarmac = smoothstep( -0.04, 0.04, sd );
  float gsd = envGravelSD( p, rl );
  gGravel = smoothstep( -0.03, 0.03, gsd ) * gTarmac;
  float stageA = 1.0 - smoothstep( 0.0, 2.0, sdBx( p - ${v2((SA.x0 + SA.x1) / 2, (SA.z0 + SA.z1) / 2)}, ${v2((SA.x1 - SA.x0) / 2, (SA.z1 - SA.z0) / 2)} ) );
  float rwM = ( 1.0 - smoothstep( ${f(RUNWAY.HALF_WIDTH)}, ${f(RUNWAY.HALF_WIDTH + 0.6)}, abs( p.y - ${f(RUNWAY.Z)} ) ) ) * ( 1.0 - smoothstep( ${f(RUNWAY.HALF_LENGTH)}, ${f(RUNWAY.HALF_LENGTH + 4)}, abs( p.x ) ) );
  float paved = max( gTarmac, max( stageA * 0.9, rwM * 0.85 ) );

  float pad = ( 1.0 - smoothstep( -6.0, 1.0, length( p - ${v2(FS.center[0], FS.center[2])} ) - ${f(FS.r)} + ( envVNoise2( p / 9.0 + 3.3 ) - 0.5 ) * 9.0 ) ) * gTarmac;

  float padSD = sdBx( rl - ${v2((PAD.s0 + PAD.s1) / 2, 0)}, ${v2((PAD.s1 - PAD.s0) / 2, PAD.halfWidth)} ) + ( envVNoise2( p / 0.7 + 4.1 ) - 0.5 ) * ${f(RU.EDGE * 0.9)};
  float runup = ( 1.0 - smoothstep( ${f(-RU.EDGE / 2)}, ${f(RU.EDGE / 2)}, padSD ) ) * gTarmac;
  gRunup = runup; gRL = rl;
  vec4 gFM = texture2D( tFloor, envPoolUV( vGW ) );


  vec2 uv1 = p / ${f(A.TILE_M)};
  vec2 uv2 = mat2( 0.8, -0.6, 0.6, 0.8 ) * p / 13.7 + 0.37;
  vec3 a1 = texture2D( tAlb, uv1 ).rgb, a2 = texture2D( tAlb, uv2 ).rgb;
  vec4 s1 = texture2D( tSurf, uv1 ), s2 = texture2D( tSurf, uv2 );
  vec3 n1 = texture2D( tNrm, uv1 ).xyz * 2.0 - 1.0, n2 = texture2D( tNrm, uv2 ).xyz * 2.0 - 1.0;
  vec3 alb = mix( a1, a2, 0.4 );
  float rough = mix( s1.g, s2.g, 0.4 );
  gHeight = mix( s1.b, s2.b, 0.4 );
  vec2 nxy = mix( n1.xy, n2.xy, 0.4 );

  float pxs = length( fwidth( p ) );
  nxy *= 0.4 * clamp( 1.0 - pxs * 0.9, 0.15, 1.0 );
  // (VENUE fix2) dry matte asphalt: roughness ${GROUND_LOOK.ROUGH[0]}–${GROUND_LOOK.ROUGH[1]} on a low-frequency field (the texture's own range read polished)
  rough = mix( ${f(GROUND_LOOK.ROUGH[0])}, ${f(GROUND_LOOK.ROUGH[1])}, envVNoise2( p / 2.9 + 6.1 ) * 0.7 + envVNoise2( p / 0.7 - 1.3 ) * 0.3 );


  vec2 muv = ( p - ${v2(MASK_ORIGIN[0], MASK_ORIGIN[1])} ) / ${f(MASK_SIZE)};
  float inM = step( 0.0, muv.x ) * step( muv.x, 1.0 ) * step( 0.0, muv.y ) * step( muv.y, 1.0 );
  vec4 mk = texture2D( tMask, clamp( muv, 0.0, 1.0 ) );


  float tone = ( 0.84 + 0.32 * mk.b ) * ( 0.92 + 0.16 * envVNoise2( p / 31.0 + 7.3 ) ) * ${f(A.TONE)};
  alb *= tone * vec3( ${f(A.WARM[0] * GROUND_LOOK.TINT[0])}, ${f(A.WARM[1] * GROUND_LOOK.TINT[1])}, ${f(A.WARM[2] * GROUND_LOOK.TINT[2])} );

  float av = envVNoise2( p / 4.3 + 1.9 ) * 0.55 + envVNoise2( p / 9.7 - 6.2 ) * 0.45;
  alb *= 1.0 + ${f(GROUND_LOOK.ASPH_VAR)} * ( av - 0.5 ) * 2.0 * mix( 1.0, 0.4, smoothstep( 1.0, 4.0, pxs ) );
  rough *= 1.0 + 0.1 * ( av - 0.5 );

  float lodG = 1.0 - smoothstep( 0.012, 0.05, pxs ), lodK = 1.0 - smoothstep( 0.1, 0.45, pxs );
  float grn = ( envVNoise2( p / 0.05 + 3.3 ) - 0.5 ) * 2.0 * lodG * 0.55 + ( envVNoise2( p / 0.4 - 8.1 ) - 0.5 ) * 2.0 * lodK * 0.45;
  alb *= 1.0 + ${f(GROUND_LOOK.GRAIN)} * grn;

  {
    float lodA = 1.0 - smoothstep( 0.004, 0.02, pxs ), lodA2 = 1.0 - smoothstep( 0.01, 0.06, pxs );
    float agg = ( ( envVNoise2( p / 0.021 + 1.7 ) - 0.5 ) * 0.6 * lodA + ( envVNoise2( p / 0.055 - 4.2 ) - 0.5 ) * 0.4 * lodA2 ) * 2.0;
    float chip = smoothstep( 0.8, 0.88, envVNoise2( p / 0.03 + 7.7 ) ) * lodA;
    alb *= mix( 1.0, ( 1.0 + ${f(AG.K)} * agg ) * ( 1.0 + ${f(AG.CHIP * 2)} * chip ), gTarmac );
    nxy += ( vec2( envVNoise2( p / 0.018 + 3.1 ), envVNoise2( p / 0.018 - 8.6 ) ) - 0.5 ) * ${f(AG.N)} * lodA * gTarmac;
    rough += 0.04 * ( agg * 0.5 ) * lodA;
  }

  {
    vec2 cell = floor( p / ${f(PT.CELL)} ), hh = envHash22( cell + 41.3 );
    float on = step( envHash12( cell + 17.9 ), ${f(PT.P)} );
    vec2 c = ( cell + 0.5 ) * ${f(PT.CELL)} + ( hh - 0.5 ) * ${f(PT.CELL * 0.22)};
    float sdp = sdBx( p - c, vec2( 0.5 + hh.x, 0.5 + hh.y ) );
    float wq = max( fwidth( sdp ), 0.004 );
    float pin = on * ( 1.0 - smoothstep( -wq, wq, sdp ) );
    float seam = on * ( 1.0 - smoothstep( 0.015, 0.015 + wq * 1.5, abs( sdp ) ) ) * ( 1.0 - smoothstep( 0.03, 0.09, pxs ) );
    float pk = mix( ${f(PT.K)}, 1.1, step( 0.72, envHash12( cell + 3.3 ) ) );
    float pm = gTarmac * ( 1.0 - gRunup );
    alb *= mix( 1.0, pk, pin * pm ) * ( 1.0 - ${f(PT.SEAM)} * seam * pm );
    rough = mix( rough, rough - 0.05, pin * pm );
  }

  {
    float off = abs( p.x - ${f(K[0][0])} ), inK = step( ${f(Math.min(K[0][1], K[1][1]))}, p.y ) * step( p.y, ${f(Math.max(K[0][1], K[1][1]))} );
    float tq = ( off - ${f(SC.TRACK)} - 0.12 * ( envVNoise2( vec2( p.y / 9.0, 3.1 ) ) - 0.5 ) ) / 0.16;
    float strk = envVNoise2( vec2( p.y / 2.3, p.x / 0.05 ) ) * 0.6 + envVNoise2( vec2( p.y / 0.6, p.x / 0.11 ) + 5.0 ) * 0.4;
    float trk = exp( - tq * tq ) * smoothstep( 0.35, 0.75, strk ) * ( 0.5 + 0.5 * envVNoise2( vec2( p.y / 17.0, 1.7 ) ) ) * inK;
    float rr = length( p ), ring = fract( rr / 1.7 + envVNoise2( p / 5.0 ) * 0.4 ) - 0.5;
    float arcs = exp( - ring * ring / 0.012 ) * smoothstep( 0.45, 0.7, envVNoise2( p / 3.1 + 2.0 ) ) * ( 1.0 - smoothstep( ${f(SC.X_R * 0.55)}, ${f(SC.X_R)}, rr ) );
    float rub = max( trk, arcs * 0.8 ) * mix( 1.0, 0.45, smoothstep( 0.03, 0.15, pxs ) ) * gTarmac;
    alb *= 1.0 - ${f(SC.K)} * rub;
    rough -= 0.06 * rub;
  }

  {
    float gapW = mix( 1.0, ${f(GP.W_POOL)}, smoothstep( 0.3, 0.75, gFM.x ) ) * gTarmac;
    float dd = envDriveD( p );
    float lodB = 1.0 - smoothstep( 0.08, 0.35, pxs );
    float bq = dd / ${f(GP.BAND)}, tq = ( dd - 0.82 ) / 0.3;
    float band = exp( - bq * bq ) * ( 0.75 + 0.5 * envVNoise2( p / 9.0 + 2.6 ) );
    float trk = exp( - tq * tq ) * lodB;
    float arc = 0.0;
    {
      vec2 cell = floor( p / ${f(GP.ARC_CELL)} ), cc = ( cell + 0.5 ) * ${f(GP.ARC_CELL)};
      vec2 hh = envHash22( cell + 31.7 );
      float on = step( envHash12( cell + 5.3 ), ${f(GP.ARC_P)} );
      vec2 c = cc + ( hh - 0.5 ) * ${f(GP.ARC_CELL * 0.3)};
      float R = 5.0 + 6.0 * envHash12( cell + 9.1 ), wA = 0.35 + 0.35 * envHash12( cell + 2.2 );
      vec2 dv = p - c; float ang = atan( dv.y, dv.x ), a0 = 6.2832 * hh.x, span = 1.2 + 2.0 * hh.y;
      float da = abs( mod( ang - a0 + 3.1416, 6.2832 ) - 3.1416 );
      float wEff = wA + pxs * 1.5;
      float aq = ( length( dv ) - R ) / wEff;
      arc = on * exp( - aq * aq ) * ( 1.0 - smoothstep( span * 0.35, span * 0.5, da ) ) * min( 1.0, wA / wEff * 1.6 )
        * ( 0.55 + 0.45 * envVNoise2( p / 1.3 + hh * 7.0 ) );
    }
    float pt = envVNoise2( p / 23.0 + 11.3 ) * 0.6 + envVNoise2( p / 41.0 - 3.9 ) * 0.4;
    float st = ( 1.0 + ${f(GP.POLISH)} * band * ( 1.0 - ${f(GP.RUBBER)} * trk / max( band, 0.2 ) ) ) * ( 1.0 - ${f(GP.ARC_K)} * arc ) * ( 1.0 + ${f(GP.PATCH)} * ( pt - 0.5 ) * 2.0 );
    alb *= mix( 1.0, st, gapW );


    vec2 jw = p + ( vec2( envVNoise2( p.yx / 11.0 + 4.0 ), envVNoise2( p.yx / 11.0 - 2.0 ) ) - 0.5 ) * 0.6;
    vec2 jf = abs( fract( jw / vec2( ${f(GROUND_LOOK.JOINT.JX)}, ${f(GROUND_LOOK.JOINT.JZ)} ) ) - 0.5 );
    float dj = min( ( 0.5 - jf.x ) * ${f(GROUND_LOOK.JOINT.JX)}, ( 0.5 - jf.y ) * ${f(GROUND_LOOK.JOINT.JZ)} );
    float jon = smoothstep( ${f(GROUND_LOOK.JOINT.ON[0])}, ${f(GROUND_LOOK.JOINT.ON[1])}, envVNoise2( p / 5.3 + 8.8 ) );
    alb *= 1.0 - ${f(GROUND_LOOK.JOINT.K)} * lineAA( dj, ${f(GROUND_LOOK.JOINT.HW)} ) * jon * mix( 1.0, ${f(GROUND_LOOK.JOINT.W_POOL)}, smoothstep( 0.3, 0.75, gFM.x ) ) * gTarmac * ( 1.0 - gRunup );
  }
  float patchM = step( 0.05, mk.g ) * inM;
  alb *= mix( 1.0, 1.0 + ( mk.g - 0.5 ) / 2.5, patchM );
  rough = mix( rough, rough * 0.92, patchM );
  float marks = mix( 1.0, texture2D( tMarks, clamp( muv, 0.0, 1.0 ) ).r, inM );

  marks = 1.0 - ( 1.0 - marks ) * ( 0.4 + 0.85 * envVNoise2( p / 23.0 + 2.2 ) ) * ( 0.75 + 0.5 * envVNoise2( p / 6.1 - 4.7 ) );

  marks = 1.0 - ( 1.0 - marks ) * ${f(GROUND_LOOK.MARKS_K)} * mix( 1.0, ${f(GROUND_LOOK.MARKS_FAR)}, smoothstep( 0.06, 0.3, pxs ) );
  alb *= marks;

  rough -= ( 1.0 - marks ) * 0.04;


  alb = mix( alb, alb * ${f(GROUND_LOOK.PAD_K)} + vec3( 0.001 ), pad );
  rough = mix( rough, rough * 0.85, pad );



  float lodC = 1.0 - smoothstep( 0.015, 0.06, pxs ), lodM = 1.0 - smoothstep( 0.15, 0.6, pxs );
  float cg = 1.0 + ${f(RU.GRAIN)} * ( ( envVNoise2( p / 0.06 + 1.3 ) - 0.5 ) * 2.0 * lodC * 0.5 + ( envVNoise2( p / 0.6 - 2.7 ) - 0.5 ) * 2.0 * lodM * 0.5 + ( envVNoise2( p / 2.3 + 5.5 ) - 0.5 ) );
  float smear = envVNoise2( vec2( rl.x / 2.4, rl.y / 0.11 ) + 7.7 );
  float trk = exp( - pow( ( abs( rl.y ) - 0.85 ) / 0.24, 2.0 ) );
  float rub = trk * ( 0.3 + 0.7 * smear ) * ( 1.0 - smoothstep( -3.5, 0.0, rl.x ) ) * mix( 1.0, 0.5, lodM * ( 1.0 - lodM ) );
  float toeM = smoothstep( ${f(-RU.TOE_D - 0.2)}, ${f(-RU.TOE_D + 0.2)}, rl.x );
  vec3 conc = vec3( 0.97, 0.99, 1.0 ) * mix( ${f(GROUND_LOOK.RUNUP_ALB)}, ${f(RU.TOE_ALB)}, toeM ) * cg * ( 0.9 + 0.2 * smear ) * ( 1.0 - ${f(RU.RUBBER)} * rub );
  alb = mix( alb, conc, runup );
  rough = mix( rough, 0.78 + 0.12 * ( smear - 0.5 ) - 0.1 * rub, runup );


  vec3 grav = uGravAlb;
  vec3 gN = vec3( 0.0 );
  {
    float lodP = 1.0 - smoothstep( ${f(GG.PEB * 0.3)}, ${f(GG.PEB * 1.3)}, pxs ), lodQ = 1.0 - smoothstep( ${f(GG.PEB * 0.6)}, ${f(GG.PEB * 2.6)}, pxs );
    vec2 pc = p / ${f(GG.PEB)}, ci = floor( pc ), cf = fract( pc ) - 0.5, of = ( envHash22( ci ) - 0.5 ) * 0.36;
    float rr = length( cf - of ), st = 1.0 - smoothstep( 0.3, 0.48, rr );
    float pb = mix( 0.42, 0.62 + 0.76 * envHash12( ci + 3.1 ), st ) / 0.86;
    vec2 pc2 = mat2( 0.8, -0.6, 0.6, 0.8 ) * p / ${f(GG.PEB * 2.3)} + 0.31, ci2 = floor( pc2 ), cf2 = fract( pc2 ) - 0.5;
    float st2 = 1.0 - smoothstep( 0.28, 0.46, length( cf2 - ( envHash22( ci2 + 7.7 ) - 0.5 ) * 0.36 ) );
    float pb2 = mix( 0.55, 0.7 + 0.6 * envHash12( ci2 + 1.3 ), st2 ) / 0.86;
    float peb = mix( 1.0, 1.0 + ${f(GG.K)} * ( pb - 1.0 ), lodP ) * mix( 1.0, 1.0 + ${f(GG.K * 0.7)} * ( pb2 - 1.0 ), lodQ );
    float lodC = 1.0 - smoothstep( 0.08, 0.45, pxs );
    float clump = 1.0 + ${f(GG.CLUMP)} * ( envVNoise2( p / 0.3 + 2.9 ) - 0.5 ) * 2.0 * lodC;
    float rake = 1.0 + ${f(GG.RAKE)} * ( envVNoise2( vec2( p.x / 0.45, p.y / 3.2 ) + 6.6 ) - 0.5 ) * 2.0 * ( 1.0 - smoothstep( 0.2, 1.2, pxs ) );
    float mot = 1.0 + ${f(GG.PATCH)} * ( envVNoise2( p / 4.3 - 3.7 ) * 0.6 + envVNoise2( p / 9.1 + 5.2 ) * 0.4 - 0.5 ) * 2.0;
    grav *= peb * clump * rake * mot;

    grav *= mix( vec3( 1.0 ), mix( vec3( 0.92, 0.95, 1.02 ), vec3( 1.05, 1.0, 0.92 ), envHash12( ci + 9.4 ) ), st * lodP );
    gN = vec3( ( cf - of ) * 1.4 * st * lodP + ( cf2 * 0.8 * st2 ) * lodQ * 0.6, 0.0 );
  }
  alb = mix( alb, grav, gGravel );
  rough = mix( rough, ${f(LP.GRAVEL.ROUGHNESS)}, gGravel );
  nxy = mix( nxy, nxy * 0.6 + gN.xy, gGravel );





  vec2 pe = p + ( vec2( envVNoise2( p / 0.3 + 2.7 ), envVNoise2( p / 0.3 - 5.3 ) ) - 0.5 ) * ${f(P2.EDGE * 2)};
  gPaint = envMarkings( pe, gsd ) * gTarmac * ( 1.0 - gGravel );

  gPaint *= ( 1.0 - ${f(P2.FADE)} * smoothstep( 0.4, 0.85, envVNoise2( p / 1.9 + 4.4 ) ) ) * ( 1.0 - 0.6 * smoothstep( 0.8, 0.9, envVNoise2( p / 0.028 + 9.1 ) ) * ( 1.0 - smoothstep( 0.006, 0.02, pxs ) ) );
  float pdirt = envVNoise2( p / 1.7 - 3.3 ) * 0.6 + envVNoise2( p / 0.35 + 1.1 ) * 0.4 * lodM;
  vec3 paintAlb = vec3( 1.0, 1.0, 0.975 ) * ${f(P2.ALB)} * ( 1.0 + ${f(P2.SPECK)} * ( envVNoise2( p / 0.012 + 0.7 ) - 0.5 ) * 2.0 * ( 1.0 - smoothstep( 0.003, 0.012, pxs ) ) ) * ( 1.0 - 0.22 * pdirt );
  float chev = envChevrons( p ) * gTarmac;
  alb = mix( alb, vec3( 0.62, 0.36, 0.04 ), chev );
  gInlay = vec3( 1.0, 0.045, 0.03 ) * envInlays( p ) * gTarmac;


  float wetOK = gTarmac * ( 1.0 - gGravel ) * ( 1.0 - runup );
  gDamp = ${f(WET.DAMP)};
  float lvl = ${f(WET.PUDDLE.weights[0])} * mk.r + ${f(WET.PUDDLE.weights[1])} * envVNoise2( p / ${f(WET.PUDDLE.noiseM[0])} ) + ${f(WET.PUDDLE.weights[2])} * envVNoise2( p / ${f(WET.PUDDLE.noiseM[1])} );
  gWet = smoothstep( ${f(WET.PUDDLE.edge[0])}, ${f(WET.PUDDLE.edge[1])}, lvl ) * wetOK * inM * ${f(GROUND_LOOK.WET_K)};
  alb *= mix( 1.0, 0.88 * uGround.y, wetOK );
  alb *= mix( 1.0, 0.82, gWet );
  rough = mix( rough, rough * 0.97, wetOK );
  rough = mix( rough, ${f(WET.PUDDLE.rough)}, gWet );
  rough = max( rough, clamp( pxs * 1.5, 0.0, 0.62 ) );
  nxy *= mix( 1.0, 0.08, gWet );
  gBoostM = wetOK;


  {
    float sxd = abs( p.x - ${f(GS.X)} );
    float zin = smoothstep( ${f(GS.Z_DIRT[0])}, ${f(GS.Z_DIRT[1])}, p.y ) * ( 1.0 - smoothstep( ${f(SP.z1 - 4)}, ${f(SP.z1 + 2)}, p.y ) );
    float zoneM = smoothstep( -0.5, 0.5, ${f(spHalf)} - sxd + ( envVNoise2( p / 1.3 + 2.2 ) - 0.5 ) * ${f(GS.EDGE)} ) * zin * gTarmac * ( 1.0 - gGravel );
    float wq = max( fwidth( sxd ), 0.003 );
    float stripM = ( 1.0 - smoothstep( ${f(GS.HW)} - wq, ${f(GS.HW)} + wq, sxd ) ) * step( ${f(SP.z0 - 0.3)}, p.y ) * step( p.y, ${f(SP.z1)} ) * gTarmac;
    float dirtM = zoneM * ( 1.0 - stripM );
    float lodD = 1.0 - smoothstep( 0.01, 0.05, pxs );
    float peb = smoothstep( 0.7, 0.8, envVNoise2( p / 0.04 + 1.9 ) ) * lodD;
    vec3 dAlb = vec3( ${f(GS.DIRT[0])}, ${f(GS.DIRT[1])}, ${f(GS.DIRT[2])} ) * ( 0.78 + 0.44 * envVNoise2( p / 2.7 + 9.9 ) ) * ( 0.85 + 0.3 * envVNoise2( p / 0.45 - 3.0 ) )
      * ( 1.0 + 0.3 * ( envVNoise2( p / 0.05 + 4.4 ) - 0.5 ) * 2.0 * lodD ) * ( 1.0 + 0.5 * peb )
      * ( 1.0 - 0.35 * exp( - pow( ( sxd - ${f(GS.HW + 0.5)} ) / 0.6, 2.0 ) ) );
    alb = mix( alb, dAlb, dirtM );
    alb *= mix( 1.0, ${f(GS.STRIP_K)}, stripM );
    rough = mix( rough, 0.97, dirtM );
    nxy = mix( nxy, nxy * 1.8 + ( vec2( envVNoise2( p / 0.06 ), envVNoise2( p / 0.06 + 5.1 ) ) - 0.5 ) * 0.5 * lodD, dirtM );
    gBoostM *= 1.0 - dirtM;
  }

  alb = mix( alb, paintAlb, gPaint );
  rough = mix( rough, ${f(P2.ROUGH)}, gPaint );
  nxy *= 1.0 - 0.6 * gPaint;
  gBoostM *= 1.0 - gPaint;

  {
    float kd = - gsd, kw = fwidth( kd ) * 0.85 + 1e-4;
    float kerb = clamp( kd / kw + 0.5, 0.0, 1.0 ) * clamp( ( ${f(GK.W)} - kd ) / kw + 0.5, 0.0, 1.0 ) * gTarmac * ( 1.0 - gGravel );
    float bt = envGravelAlong( p, rl ) / ${f(2 * GK.BLOCK)}, bw = fwidth( bt ) + 1e-4;
    float isW = clamp( ( 0.25 - abs( fract( bt ) - 0.5 ) ) / bw + 0.5, 0.0, 1.0 );
    isW = mix( isW, 0.5, smoothstep( 0.3, 0.6, bw ) );
    vec3 kAlb = mix( vec3( ${f(GK.RED[0])}, ${f(GK.RED[1])}, ${f(GK.RED[2])} ), vec3( ${f(GK.WHITE)} ), isW ) * ( 1.0 - 0.2 * pdirt );
    alb = mix( alb, kAlb, kerb );

    float rt = envRunText( p ) * gTarmac * ( 1.0 - gGravel ) * ( 1.0 - kerb );
    rt *= 1.0 - 0.18 * smoothstep( 0.45, 0.9, envVNoise2( p / 1.9 + 4.4 ) );
    alb = mix( alb, paintAlb, rt );
    float km = max( kerb, rt );
    rough = mix( rough, ${f(P2.ROUGH)}, km );
    nxy *= 1.0 - 0.6 * km;
    gBoostM *= 1.0 - km;
  }
  rough = max( rough, clamp( pxs * 1.5, 0.0, 0.62 ) );


  float dOut = max( - sd, 0.0 );






  float lodT = 1.0 - smoothstep( 0.25, 1.2, pxs );



  float n310 = mix( 0.5, envVNoise2( p / 310.0 + 3.1 ), 1.0 - smoothstep( 30.0, 90.0, pxs ) );
  float n71 = mix( 0.5, envVNoise2( p / 71.0 - 8.4 ), 1.0 - smoothstep( 8.0, 24.0, pxs ) );


  float dTone = ( 0.8 + 0.4 * n310 ) * ( 0.9 + 0.2 * n71 );
  dTone *= mix( 1.0, 0.93 + 0.14 * envVNoise2( p / 45.0 + 1.7 ), 1.0 - smoothstep( 3.0, 10.0, pxs ) );

  vec2 wq = p / 140.0 + vec2( envVNoise2( p / 260.0 ), envVNoise2( p / 260.0 + 9.3 ) ) * 1.6;
  float wash = 1.0 - smoothstep( 0.012, 0.035, abs( envVNoise2( wq ) - 0.5 ) );
  wash *= 1.0 - smoothstep( 2.0, 8.0, pxs );
  vec3 dirt = vec3( 0.040, 0.037, 0.033 ) * dTone * mix( 1.0, 0.82 + 0.5 * a2.r * 3.0, lodT ) * ( 1.0 + 0.55 * wash );


  {
    vec2 cell = floor( p / 3.2 ), cp = ( cell + 0.2 + 0.6 * envHash22( cell ) ) * 3.2;
    float hb = envHash12( cell + 11.7 );
    float dens = 0.08 + 0.34 * smoothstep( 0.3, 0.8, mix( 0.55, envVNoise2( p / 90.0 + 4.4 ), 1.0 - smoothstep( 10.0, 30.0, pxs ) ) );
    float rb = 0.35 + 0.75 * envHash12( cell + 3.9 );
    float on = step( hb, dens );
    float bush = on * ( 1.0 - smoothstep( rb * 0.55, rb, length( p - cp ) ) );
    float skirt = on * ( 1.0 - smoothstep( rb, rb * 1.7, length( p - cp ) ) ) * 0.35;
    float lodS = 1.0 - smoothstep( 0.12, 0.5, pxs );
    float near = max( bush, skirt * ( 1.0 - bush ) );
    float avgC = dens * 0.17;
    dirt *= 1.0 - 0.45 * mix( avgC, near, lodS );
    gScrub = bush * lodS;
  }

  {
    vec2 cell = floor( p / 1.1 ), cp = ( cell + 0.15 + 0.7 * envHash22( cell + 5.1 ) ) * 1.1;
    float on = step( envHash12( cell + 21.3 ), 0.1 );
    float rr = 0.08 + 0.17 * envHash12( cell + 8.8 );
    float rock = on * ( 1.0 - smoothstep( rr * 0.6, rr, length( p - cp ) ) );
    float lodR = 1.0 - smoothstep( 0.02, 0.08, pxs );
    dirt *= 1.0 + 0.9 * mix( 0.1 * 0.04, rock, lodR );
  }
  vec3 verge = vec3( 0.0742, 0.0666, 0.0561 ) * mix( 1.0, 0.75 + 0.5 * clamp( a1.r * 5.0, 0.0, 1.0 ), lodT );
  vec3 offAlb = mix( verge, dirt, smoothstep( ${f(ARENA.OUTSIDE.VERGE_W - 0.5)}, ${f(ARENA.OUTSIDE.VERGE_W + 1.0)}, dOut + mk.r * 1.5 * inM ) );
  vec3 pavedOut = vec3( 0.040, 0.039, 0.037 ) * ( 0.8 + 0.4 * a2.r * 3.0 );
  offAlb = mix( offAlb, pavedOut, max( stageA, rwM ) );
  alb = mix( offAlb, alb, gTarmac );
  rough = mix( mix( 0.96, 0.8, max( stageA, rwM ) ), rough, gTarmac );
  nxy *= mix( 1.6, 1.0, gTarmac );

  gOut = ( 1.0 - gTarmac ) * ( 1.0 - max( stageA, rwM ) );
  gPxs = pxs;
  if ( gOut > 0.0 ) {
    float fc = 1.0 - smoothstep( 0.08, 0.4, pxs ), ff = 1.0 - smoothstep( 0.01, 0.05, pxs );
    vec2 gc = vec2( envVNoise2( p / 0.4 ), envVNoise2( p / 0.4 + 17.3 ) ) - 0.5;
    vec2 gf = vec2( envHash12( floor( p / 0.05 ) ), envHash12( floor( p / 0.05 ) + 7.1 ) ) - 0.5;


    nxy *= mix( 1.0, 1.0 - smoothstep( 0.3, 1.5, pxs ), gOut );
    nxy += ( gc * 0.6 * fc + gf * 0.5 * ff ) * gOut;
  }

  diffuseColor.rgb *= alb;
  gWN = normalize( vec3( nxy.x, 1.0, nxy.y ) );
  gWN.y = max( gWN.y, 0.2 );
  gWN = normalize( gWN );
  gRough = clamp( rough, 0.03, 1.0 );

  {
    gPoolF = gFM.x;
    gKeyMask = envFloorKey( gFM, clamp( 1.0 + sd / ${f(LP.POOL_MAP.MARGIN)}, 0.0, 1.0 ) );
    gKeyTint = mix( vec3( 1.0 ), vec3( ${f(GROUND_LOOK.WARM[0])}, ${f(GROUND_LOOK.WARM[1])}, ${f(GROUND_LOOK.WARM[2])} ), gFM.y * gTarmac )
      * mix( vec3( 1.0 ), vec3( ${f(GROUND_LOOK.KEY_NEUTRAL[0])}, ${f(GROUND_LOOK.KEY_NEUTRAL[1])}, ${f(GROUND_LOOK.KEY_NEUTRAL[2])} ), gTarmac );
  }
  gDiffKey = uKeyI * gKeyMask * gKeyTint * 0.9 * diffuseColor.rgb * RECIPROCAL_PI;
}
`;
const emisFrag =  `
#include <emissivemap_fragment>
{
  vec2 p = vGW.xz;
  vec3 I = normalize( vGW - cameraPosition );




  vec3 nS = vec3( 0.0, 1.0, 0.0 );
  vec3 R = reflect( I, nS );
  vec2 rh = normalize( R.xz + vec2( 1e-5 ) );
  float wBrk = mix( 0.4 + 0.6 * smoothstep( 0.25, 0.75, envVNoise2( p / 2.7 + 5.3 ) * 0.65 + envVNoise2( p / 7.9 - 2.1 ) * 0.35 ), 1.0, gWet );
  float wetAll = gTarmac * ( ${f(WET.WET_ALL[0])} + ${f(WET.WET_ALL[1])} * gWet ) * ( 1.0 - gGravel ) * wBrk;
  vec3 acc = vec3( 0.0 );
  for ( int i = 0; i < ${N}; i ++ ) {
    vec4 sp = uStreakPos[ i ];
    vec3 L = sp.xyz - vGW;
    float dist = length( L );
    vec3 D = L / dist;
    float dxz = length( L.xz );

    float len = exp( - dxz / ( ${f(WET.LEN_H)} * clamp( L.y, 1.0, 25.0 ) ) );

    float kz = 2600.0 / ( 1.0 + 0.12 * dxz );
    float az = dot( rh, normalize( D.xz + vec2( 1e-5 ) ) );
    float aw = exp( ( az - 1.0 ) * kz ) + 0.06 * exp( ( az - 1.0 ) * kz * 0.2 );
    float el = R.y - D.y;
    float ew = exp( - el * el * 30.0 );
    acc += uStreakCol[ i ] * ( sp.w * aw * ew * len );
  }
  vec3 red = vec3( 1.0, 0.045, 0.03 );
  ${q.railStreaks ? `acc += red * ${f(4 * GROUND_LOOK.TUBE_REFL)} * uRailGlow * ( envLaneRefl( vGW, R, ${f(RAIL_LIGHT.X)} ) + envLaneRefl( vGW, R, ${f(-RAIL_LIGHT.X)} ) );
  acc += red * ${f(4 * GROUND_LOOK.TUBE_REFL)} * uRailGlow * ( tubeRefl( vGW, R, ${f(RT.xs[0])}, ${f(RT.z0)}, ${f(RT.z1)}, ${f(RT.spacing)}, 0.3, ${f(RT.h)} ) + tubeRefl( vGW, R, ${f(RT.xs[1])}, ${f(RT.z0)}, ${f(RT.z1)}, ${f(RT.spacing)}, 0.3, ${f(RT.h)} ) );` : ''}
  float fres = 0.05 + 0.95 * pow( 1.0 - max( dot( - I, nS ), 0.0 ), 5.0 );
  vec3 streakRad = ${f(WET.STREAK_GAIN)} * uGround.z * acc * fres * wetAll;


  vec3 glow = vec3( 0.0 ), glowW = vec3( 0.0 );

  {
    float d = min( sdSg( p, ${v2(strips[0].a[0], strips[0].a[2])}, ${v2(strips[0].b[0], strips[0].b[2])} ), sdSg( p, ${v2(strips[1].a[0], strips[1].a[2])}, ${v2(strips[1].b[0], strips[1].b[2])} ) );
    glow += red * ( 5.0 * exp( - d * 1.6 ) + 0.12 / ( 1.0 + d * d * 0.4 ) ) * uRedGlow;
  }

  {
    float zk = clamp( floor( ( p.y - ${f(RAIL_LIGHT.Z0)} ) / ${f(RAIL_LIGHT.STEP)} + 0.5 ) * ${f(RAIL_LIGHT.STEP)} + ${f(RAIL_LIGHT.Z0)}, ${f(RAIL_LIGHT.Z0)}, ${f(RAIL_LIGHT.Z1)} );
    float d = length( vec2( abs( p.x ) - ${f(RAIL_LIGHT.X + 0.05)}, p.y - zk ) );
    ${(APPROACH.GAPS || []).map((g) => `if ( zk > ${f(g[0] + 0.05)} && zk < ${f(g[1] - 0.05)} ) d = 1e3;`).join(' ')}
    float lw = envLaneT( zk ).x;
    float zr = clamp( floor( ( p.y - ${f(RT.z0)} ) / ${f(RT.spacing)} + 0.5 ) * ${f(RT.spacing)} + ${f(RT.z0)}, ${f(RT.z0)}, ${f(RT.z1)} );
    float dr = length( vec2( min( abs( p.x - ${f(RT.xs[0])} ), abs( p.x - ${f(RT.xs[1])} ) ), p.y - zr ) );
    glow += red * ( ( 1.1 * exp( - d * 1.6 ) + 0.08 / ( 1.0 + d * d * 0.25 ) ) * lw + 1.1 * exp( - dr * 1.6 ) + 0.08 / ( 1.0 + dr * dr * 0.25 ) ) * uRailGlow;
  }

  if ( uLaneWash > 0.0 ) {
${LS.WASHES.map((w) => `    { vec2 e = ( p - ${v2(w.cx, w.cz)} ) / ${v2(w.rx, w.rz)}; float dc = length( p - ${v2(w.x, w.z)} ); glow += red * uLaneWash * ( 3.4 * exp( - dot( e, e ) ) + 3.0 * exp( - dc * 1.4 ) ); }`).join('\n')}
  }

  {
    float d = sdSg( p, ${v2(lrA[0], lrA[2])}, ${v2(lrB[0], lrB[2])} );
    float ds = ${SPUR ? `sdSg( p, ${v2(SPUR.a[0], SPUR.a[1])}, ${v2(SPUR.b[0], SPUR.b[1])} )` : '1e4'};
    glow += red * ( 2.2 * exp( - d * 0.9 ) + 0.4 / ( 1.0 + d * d * 0.02 ) + 1.6 * exp( - ds * 1.1 ) + 0.25 / ( 1.0 + ds * ds * 0.04 ) ) * uRedGlow;
  }

  {
    float d = min( sdSg( p, ${v2(swA[0][0], swA[0][2])}, ${v2(swA[1][0], swA[1][2])} ), sdSg( p, ${v2(swB[0][0], swB[0][2])}, ${v2(swB[1][0], swB[1][2])} ) );
    glow += red * ( 3.0 * exp( - d * 1.4 ) + 0.2 / ( 1.0 + d * d * 0.08 ) ) * uRedGlow;
    float dK = min( sdSg( p, ${v2(-KICKER.HALF_WIDTH - 0.06, kz0 + 0.3)}, ${v2(-KICKER.HALF_WIDTH - 0.06, kz1)} ), sdSg( p, ${v2(KICKER.HALF_WIDTH + 0.06, kz0 + 0.3)}, ${v2(KICKER.HALF_WIDTH + 0.06, kz1)} ) );
    glow += red * 2.4 * exp( - dK * 2.0 ) * uRedGlow;
  }

  {
    float g = 0.0;
${headGLSL}
    glow += vec3( 0.66, 0.62, 0.55 ) * g * 0.5 * uHeadGlow;
  }

  {
    float d = abs( p.y - ${f(portal.z)} );
    float inx = step( ${f(portal.x0 - 1)}, p.x ) * step( p.x, ${f(portal.x1 + 1)} );
    glow += vec3( 0.7, 0.75, 0.85 ) * 0.5 * exp( - d * 0.35 ) * inx;
  }

  {
    float d = sdSg( p, ${v2(GL.from[0], GL.from[2])}, ${v2(GL.to[0], GL.to[2])} );
    glow += vec3( 1.0, 0.45, 0.05 ) * uYard * ( 2.0 * exp( - d * 1.2 ) + 0.1 / ( 1.0 + d * d * 0.1 ) );
  }

  {
    float lat = 1.0 - smoothstep( ${f(PADW - 0.4)}, ${f(PADW + 0.5)}, abs( gRL.y ) );
    float tl = exp( min( gRL.x, 0.0 ) / ${f(RU.TOE_FALL)} ) * ( 1.0 - smoothstep( 0.2, 0.6, gRL.x ) ) * lat;
    glowW += vec3( 0.95, 0.97, 1.0 ) * ${f(RU.TOE_I)} * uToe * tl;
  }

  {
    float rw = 0.0;
${washGLSL}
    glow += red * ${f(GROUND_LOOK.RED_WASH_I)} * uRedWash * rw;
  }

  {
    vec2 qs = ( p - ${v2(STAGE.DECK.X1 + 12, (STAGE.DECK.Z0 + STAGE.DECK.Z1) / 2)} ) / vec2( 30.0, 34.0 );
    glow += uStage * 1.2 * exp( - dot( qs, qs ) * 1.5 ) * ( 1.0 - gTarmac );
    float dh = min( sdSg( p, ${v2(hallF0[0], hallF0[2])}, ${v2(hallF1[0], hallF1[2])} ), sdSg( p, ${v2(hallA[0], hallA[2])}, ${v2(hallB[0], hallB[2])} ) );
    glow += vec3( 1.0, 0.16, 0.05 ) * ( 1.6 * exp( - dh * 0.35 ) ) * ( 1.0 - gTarmac );
  }

  for ( int i = 0; i < ${HEADLIGHT_SLOTS}; i ++ ) {
    vec4 h = uHL[ i ], hb = uHLB[ i ];
    if ( h.w <= 0.0 ) continue;
    vec2 rel = p - h.xy;
    float d = dot( rel, hb.xy ), lat = dot( rel, vec2( hb.y, - hb.x ) );
    float wd = ${f(HL.W0)} + ${f(HL.SPREAD)} * max( d, 0.0 );
    float att = smoothstep( ${f(HL.H_FADE[0])}, ${f(HL.H_FADE[1])}, h.z ) * smoothstep( ${f(HL.UP_FADE[0])}, ${f(HL.UP_FADE[1])}, hb.z ) * ( 1.0 - smoothstep( ${f(HL.PITCH_FADE[0])}, ${f(HL.PITCH_FADE[1])}, abs( hb.w ) ) );
    float I = ${f(HL.E)} * uGround2.y * h.w * att * smoothstep( ${f(HL.NEAR[0])}, ${f(HL.NEAR[1])}, d ) * ( 1.0 - smoothstep( ${f(HL.FAR[0])}, ${f(HL.FAR[1])}, d ) ) * exp( - lat * lat / ( wd * wd ) );
    totalEmissiveRadiance += vec3( 1.0, 0.92, 0.8 ) * I * diffuseColor.rgb * RECIPROCAL_PI;
  }

  glow = glow * mix( 1.0, ${f(GROUND_LOOK.GLOW_COMP)}, gBoostM ) + glowW;
  totalEmissiveRadiance += glow * ( diffuseColor.rgb * 0.9 + 0.02 * wetAll );


  {
    vec3 lw = vec3( 0.2126, 0.7152, 0.0722 );
    float lF = dot( gDiffKey + glow * diffuseColor.rgb * 0.9, lw ), lS = dot( streakRad, lw );
    totalEmissiveRadiance += streakRad * min( 1.0, ( ${f(WET.STREAK_CAP)} * lF + 0.0015 ) / max( lS, 1e-6 ) );
  }


  if ( gOut > 0.0 ) {
    float fc = 1.0 - smoothstep( 0.08, 0.4, gPxs );
    float grain = 1.0 + ${f(GROUND_LOOK.DESERT.GRAIN)} * fc * ( envVNoise2( p / 0.4 + 3.7 ) - 0.5 ) * 2.0;
    float albK = clamp( dot( diffuseColor.rgb, vec3( 0.3333 ) ) / 0.037, 0.3, 1.9 );
    totalEmissiveRadiance += uDesert * gOut * grain * albK;
  }

  totalEmissiveRadiance += uFloorAmb * diffuseColor.rgb * RECIPROCAL_PI * max( gTarmac, 1.0 - gOut );

  totalEmissiveRadiance += uGravFill * diffuseColor.rgb * RECIPROCAL_PI * gGravel;

  totalEmissiveRadiance += gInlay * ${f(XING.INLAY.hdr)} * uXing;
}
`;
shader.fragmentShader = '#define ENV_GROUND\n' + shader.fragmentShader
.replace('#include <common>', '#include <common>\n' + pars)
.replace('#include <map_fragment>', mapFrag)
.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
.replace('#include <normal_fragment_maps>', 'normal = normalize( ( viewMatrix * vec4( gWN, 0.0 ) ).xyz );')
.replace('#include <emissivemap_fragment>', emisFrag)
.replace('#include <opaque_fragment>', `{
  float fgH = cameraPosition.y - vGW.y;
  float fgLow = smoothstep( ${f(GROUND_LOOK.FG.LO[0])}, ${f(GROUND_LOOK.FG.LO[1])}, fgH ) * ( 1.0 - smoothstep( ${f(GROUND_LOOK.FG.H[0])}, ${f(GROUND_LOOK.FG.H[1])}, fgH ) );
  float fgD = length( vGW.xz - cameraPosition.xz );
  outgoingLight *= mix( 1.0, mix( ${f(GROUND_LOOK.FG.K)}, 1.0, smoothstep( ${f(GROUND_LOOK.FG.D[0])}, ${f(GROUND_LOOK.FG.D[1])}, fgD ) ), fgLow * gTarmac );
}
#include <opaque_fragment>`)
.replace('#include <lights_fragment_begin>', `PhysicalMaterial gMatD = material;
gMatD.roughness = max( material.roughness, uGround3.x );
gMatD.specularF90 = min( material.specularF90, uGround3.y );
` + THREE.ShaderChunk.lights_fragment_begin.split('geometryClearcoatNormal, material, reflectedLight').join('geometryClearcoatNormal, gMatD, reflectedLight').replace(
'IncidentLight directLight;',
`IncidentLight directLight;
{
	float gSpecNV = mix( 1.0, smoothstep( ${f(GROUND_LOOK.SPEC_NV[0])}, ${f(GROUND_LOOK.SPEC_NV[1])}, saturate( dot( geometryNormal, geometryViewDir ) ) ), uGround3.w );
	gMatD.specularColor *= gSpecNV;
	gMatD.specularF90 *= gSpecNV;
}`).replace(
'getSpotLightInfo( spotLight, geometryPosition, directLight );',
'getSpotLightInfo( spotLight, geometryPosition, directLight );\n\t\tdirectLight.color *= uGround2.x;')
.replace('getDirectionalLightInfo( directionalLight, directLight );',
'getDirectionalLightInfo( directionalLight, directLight );\n\t\t#if ! ( ( NUM_DIR_LIGHT_SHADOWS > 0 ) && ( UNROLLED_LOOP_INDEX == 0 ) )\n\t\tdirectLight.color *= uGround2.w;\n\t\t#endif'))
.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>

	iblIrradiance *= 0.1 / ${f(ENV_I)};
	radiance *= ( 0.1 + 0.15 * gWet ) * mix( 1.0, uGround.w, gTarmac * ( 1.0 - gGravel ) ) / ${f(ENV_I)} * smoothstep( 0.03, 0.35, ( vec4( reflect( - geometryViewDir, geometryNormal ), 0.0 ) * viewMatrix ).y );
	{
		float lS = dot( radiance, vec3( 0.2126, 0.7152, 0.0722 ) ), lD = dot( gDiffKey, vec3( 0.2126, 0.7152, 0.0722 ) );
		radiance *= mix( 1.0, min( 1.0, ${f(WET.STREAK_CAP)} * lD / max( lS, 1e-4 ) ), gWet );
	}

	radiance *= mix( 1.0, smoothstep( ${f(GROUND_LOOK.SHEEN_F[0])}, ${f(GROUND_LOOK.SHEEN_F[1])}, gPoolF ), gTarmac * uGround3.w );`);
};
mat.customProgramCacheKey = () => 'env.ground.v21.' + N + (q.railStreaks ? 'r' : '');
mat.userData.uniforms = uniforms;
const geo = new THREE.PlaneGeometry(9000, 9000, 8, 8);
geo.rotateX(-Math.PI / 2);
const mesh = new THREE.Mesh(geo, mat);
mesh.name = 'env.ground';
mesh.receiveShadow = true;
mesh.renderOrder = -10;
return { mesh, material: mat, uniforms };
}
