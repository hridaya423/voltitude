export const VERSION = '2.0.0';
export const GAME_TITLE = 'ROADSTER: LAUNCH NIGHT';
export const DISCLAIMER = '';
export const WORLD = {
GRAVITY: 9.81,
FIXED_DT: 1 / 120,
MAX_FRAME_DT: 0.1,
};
export const CAR = {
LENGTH: 4.55,
WIDTH: 1.99,
HEIGHT: 1.222,
WHEELBASE: 2.94,
TRACK_F: 1.67,
TRACK_R: 1.65,
WHEEL_RADIUS: [0.347, 0.347, 0.364, 0.364],
TIRE_WIDTH: [0.265, 0.265, 0.325, 0.325],
REST_HEIGHT: 0.60,
GROUND_CLEARANCE: 0.11,
HITBOX_HALF: [0.99, 0.47, 2.27],
MASS: 1850,
WHEELS: [
[ 0.835, -0.253,  1.408],
[-0.835, -0.253,  1.408],
[ 0.825, -0.236, -1.536],
[-0.825, -0.236, -1.536],
],
SUSPENSION_TRAVEL: 0.16,
NOZZLES: {
rear: [
{ pos: [ 0.350, -0.092, -2.23], dir: [0, 0, -1] },
{ pos: [ 0.115, -0.092, -2.23], dir: [0, 0, -1] },
{ pos: [-0.115, -0.092, -2.23], dir: [0, 0, -1] },
{ pos: [-0.350, -0.092, -2.23], dir: [0, 0, -1] },
],
down: [
{ pos: [ 0.72, -0.45,  0.97], dir: [0, -1, 0] },
{ pos: [-0.72, -0.45,  0.97], dir: [0, -1, 0] },
{ pos: [ 0.74, -0.45, -2.07], dir: [0, -1, 0] },
{ pos: [-0.74, -0.45, -2.07], dir: [0, -1, 0] },
],
lateral: [
{ pos: [ 0.95, -0.12,  1.55], dir: [ 0.951, -0.174, -0.255], fdir: [ 1, 0, 0] },
{ pos: [-0.95, -0.12,  1.55], dir: [-0.951, -0.174, -0.255], fdir: [-1, 0, 0] },
],
attitude: [
{ pos: [0,  0.30,  2.02], dir: [0, -0.30,  0.95] },
{ pos: [0, -0.42, -2.20], dir: [0,  0.30, -0.95] },
{ pos: [0,  0.30,  1.90], dir: [0,  1,    0] },
{ pos: [ 0.62, -0.36, -2.12], dir: [ 0.8, -0.6, 0] },
{ pos: [-0.62, -0.36, -2.12], dir: [-0.8, -0.6, 0] },
{ pos: [0, -0.18, -2.26], dir: [0, 0, -1] },
{ pos: [0, -0.18,  2.12], dir: [0, 0,  1] },
{ pos: [ 0.97, -0.16, -0.95], dir: [ 0.7,  0.71, 0] },
{ pos: [ 0.97, -0.16, -0.95], dir: [ 0.7, -0.71, 0] },
{ pos: [-0.97, -0.16, -0.95], dir: [-0.7,  0.71, 0] },
{ pos: [-0.97, -0.16, -0.95], dir: [-0.7, -0.71, 0] },
],
},
FANS: [
{ pos: [ 0.45, -0.27, -2.15], dir: [0, 0, -1] },
{ pos: [ 0.15, -0.27, -2.15], dir: [0, 0, -1] },
{ pos: [-0.15, -0.27, -2.15], dir: [0, 0, -1] },
{ pos: [-0.45, -0.27, -2.15], dir: [0, 0, -1] },
],
HEADLIGHTS: [[0.70, 0.02, 2.07], [-0.70, 0.02, 2.07]],
TAILLIGHT_Y: 0.28,
};
export const COLORS = {
ANO_WHITE: '#e7e6e1',
GOLD_GLASS: '#7a5a36',
TITANIUM: '#8d8a84',
CARBON: '#121315',
TESLA_RED: '#e31937',
TAIL_RED: '#ff1d25',
COLD_GAS: '#bfefff',
ULTRAWHITE: '#f2f1ee',
};
export const PLAYER_COLORS = [
{ id: 0, name: 'Red', color: '#ff2b2b', glow: '#ff1d25' },
{ id: 1, name: 'Ice', color: '#7fe3ff', glow: '#9feaff' },
{ id: 2, name: 'Gold', color: '#ffc457', glow: '#ffb733' },
{ id: 3, name: 'Violet', color: '#b98bff', glow: '#a873ff' },
{ id: 4, name: 'Lime', color: '#a6ff6a', glow: '#8cff4d' },
{ id: 5, name: 'Rose', color: '#ff7ab8', glow: '#ff5fa8' },
{ id: 6, name: 'Orange', color: '#ff8a3d', glow: '#ff7a1f' },
{ id: 7, name: 'White', color: '#f4f4f4', glow: '#ffffff' },
];
export const TEAMS = PLAYER_COLORS;
export const HANDLING = {
MAX_SPEED_GROUND: 75,
MAX_SPEED: 95,
SUPERSONIC: 80,
DRIVE_ACCEL: 15.2,
THRUST_ACCEL: 14.7,
BRAKE_ACCEL: 20,
COAST_DECEL: 2.0,
REVERSE_MAX: 16,
STEER_MAX: 0.55,
STEER_MIN: 0.10,
SUCTION_G: 2.54,
JUMP_DV: 9.2,
LIFT_ACCEL: 36,
DODGE_DV: 0,
DODGE_SPIN: 6.0,
DODGE_COOLDOWN: 0.9,
AIR_PITCH: 24.0,
AIR_PITCH_DOWN: 30.5,
AIR_YAW: 5.9,
AIR_ROLL: 48.8,
AIR_DAMP: 2.6,
MAX_ANG_VEL: 6.0,
};
export const AIR = {
MAX: 100,
START: 100,
TANK_LITERS: 600,
PRESSURE_PSI: 5500,
GAS_KG: 250,
USABLE_KG: 235,
EXHAUST_V: 650,
THRUST_DRAIN: 17.8,
LIFT_DRAIN: 43.6,
DOWN_BANK_DRAIN: 44.6,
HOVER_DRAIN: 11.9,
JUMP_COST: 11.2,
DODGE_COST: 7,
REGEN: 12,
REGEN_DELAY: 0.8,
};
export const BALL = { RADIUS: 3.0, MASS: 260, MAX_SPEED: 70, RESTITUTION: 0.6, FRICTION: 0.35, DRAG: 0.03, ANG_DAMP: 0.08, KICKOFF_POS: [0, 3.0, 0] };
export const NET = {
SEND_HZ: 20,
SEND_HZ_MQTT: 15,
INTERP_DELAY_MS: 110,
TIMEOUT_MS: 4000,
ROOM_PREFIX: 'roadster-launch-night-v1',
};
export const STUNTS = {
COMBO_WINDOW: 1.0,
CLEAN_LAND_DOT: 0.6,
POINTS: {
KICKFLIP: 500,
FLIP: 400,
SPIN_360: 300,
OVER_THE_LINEUP: 2500,
OVER_THE_SEMI: 1500,
RAMP_INVERT: 800,
RAMP_LAUNCH: 1200,
BIG_AIR: 600,
SKY_HIGH: 900,
CAR_HOP: 1000,
NEAR_MISS: 300,
VAPOR_LANDING: 400,
DONUT: 250,
WALL_RIDE: 300,
},
};
const D2R = Math.PI / 180;
const _RS = Math.sin(55 * D2R), _RC = Math.cos(55 * D2R);
const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 10000) / 10000;
const _warned = new Set();
const _DEBUG = (() => { try { return typeof location !== 'undefined' && /[?&]debug(?:[=&]|$)/.test(location.search); } catch (e) { return false; } })();
function _deprecate(obj, key, value, hint) {
Object.defineProperty(obj, key, {
enumerable: true, configurable: false,
get() {
if (!_warned.has(hint)) {
_warned.add(hint);
if (_DEBUG) { try { if (typeof console !== 'undefined' && console.warn) console.warn('[config] deprecated v3 alias: ' + hint); } catch (e) {   } }
}
return value;
},
});
}
export const VENUE = {
STRETCH: 1.25,
LINE_ANGLE_DEG: 55,
R_DIR: [r4(-_RS), 0, r4(-_RC)],
R_NORMAL: [r4(_RC), 0, r4(-_RS)],
};
export function alongR(s, off = 0) {
return [r2(s * VENUE.R_DIR[0] + off * VENUE.R_NORMAL[0]), 0, r2(s * VENUE.R_DIR[2] + off * VENUE.R_NORMAL[2])];
}
export function toLineR(x, z, out) {
out[0] = x * VENUE.R_DIR[0] + z * VENUE.R_DIR[2];
out[1] = x * VENUE.R_NORMAL[0] + z * VENUE.R_NORMAL[2];
return out;
}
export const SKY = {
NORTH: [-0.934, 0, 0.358],
MOON_DIR: [0.91, 0.32, 0.26],
MOON_PHASE: 0.26,
WIND_TO: [-0.33, 0, 0.95],
WIND_MS: 2,
DUSK_DIR: [0.41, 0, 0.91],
CLOCK: '8:10 pm CDT',
};
const RAMP_TURN = 55 * D2R;
const RAMP_D = 90.3;
const _SX = VENUE.R_DIR[0] * Math.cos(RAMP_TURN) + VENUE.R_NORMAL[0] * Math.sin(RAMP_TURN);
const _SZ = VENUE.R_DIR[2] * Math.cos(RAMP_TURN) + VENUE.R_NORMAL[2] * Math.sin(RAMP_TURN);
export const RAMP = {
ORIGIN: alongR(RAMP_D, 8.5 * Math.sin(RAMP_TURN)),
AXIS_S: [r4(_SX), 0, r4(_SZ)],
AXIS_W: [r4(-_SZ), 0, r4(_SX)],
TURN_DEG: 55,
HALF_WIDTH: 1.7,
THICKNESS: 0.5,
R1: 6.0,
VERTICAL: 4.0,
R2: 11.9,
CURL_DEG: 90,
RUNOUT: 9.0,
SURFACE: { color: '#a3a29d', roughness: 0.85, mottle: 0.12, line: { w: 0.12, color: '#e9e9e4' } },
FASCIA: { color: '#5c0b0e', roughness: 0.55, trim: { w: 0.03, color: '#d8d8d4' }, stiffenerEvery: 1.9 },
EDGE_LED: { color: '#ff1d25', hdr: 6.0, w: 0.045, runLow: { color: '#d6e6ff', belowY: 11 } },
GUARD_TUBE: { r: 0.05, offset: 0.25, fromDeg: 30 },
FOOT_BEVEL: { s1: 3.0, step: 0.25 },
SIDE_PLATE: { color: '#5c0b0e', t: 0.012 },
UNDER_FILL: { s1: 8.0, steps: [] },
TRUSS: { s0: 6.6, s1: 15.1, halfWidth: 2.3, height: 24.1, rakeTopS0: 1.5, color: '#b9bcbf' },
GANTRY: { s0: -16.3, s1: 7.5, halfWidth: 2.3, y0: 23.2, y1: 24.1 },
CURL_TOP_FILL: { rGap: 0.05, steps: [] },
RUNUP_PAD: { s0: -8.5, s1: 0, halfWidth: 2.2 },
CURTAINS: { s: 4.5, w0: 1.85, w1: 3.1, side: { '-1': [1.85, 3.1], '1': [2.9, 4.3] }, height: 5.0, thick: 0.2, pleat: 0.06, color: '#2a0406',
uplight: { color: '#ff3a24', fadeTop: 3.5 }, collider: true },
PLINTHS: { s0: 0, s1: 1.8, w0: 3.4, w1: 4.3, h: 0.3, chamfer: 0.3, color: '#0b0b0c', ledSide: 1 },
ASSIST: { S0: -36, S1: 2, LOOK: 12, YAW_GAIN: 2.5, FADE_DEG: [8, 26], MIN_SPEED: 8 },
ENTRY: { S0: -8.5, S1: 0, HALF_W: 2.7, MAX: 35, AIM_MAX_DEG: 6 },
GUIDE: {
FUNNEL: { S0: -24, S1: 0.5, HEAD_DEG: 25, MIN_VS: 4, K_W: 7, K_V: 4.5, A_MAX: 12 },
RAIL: { FREE: 0.35, HARD: 0.70, K_W: 30, K_V: 8, A_MAX: 25, YAW_GAIN: 3.0, STEER_FREE_DEG: 10, LOOK: 4 },
CAPTURE: { S0: -1, S1: 1.5, W_MAX: 2.2, HEAD_DEG: 30 },
},
HANG_DEG: [0, 133.3],
LIGHT_STATES: { rest: { faceRed: 1.0, gantryWhite: 0.0 }, run: { faceRed: 0.1, gantryWhite: 1.0 } },
YARD_SIGNAL: { color: '#ffb020', hdr: 5, hz: 1.5, zones: ['RAMP_DROP'], onRamp: true, crossing: true, hudRadius: 12 },
};
export function rampProfile(seg1 = 24, seg2 = 4, seg3 = 28, seg4 = 6) {
const { R1, VERTICAL, R2, CURL_DEG } = RAMP, RO = RAMP.RUNOUT || 0;
const pts = [];
for (let i = 0; i <= seg1; i++) {
const th = (i / seg1) * Math.PI / 2;
pts.push([R1 * Math.sin(th), R1 * (1 - Math.cos(th))]);
}
for (let i = 1; i <= seg2; i++) pts.push([R1, R1 + (i / seg2) * VERTICAL]);
const top = R1 + VERTICAL;
for (let i = 1; i <= seg3; i++) {
const ph = (i / seg3) * CURL_DEG * Math.PI / 180;
pts.push([R1 - R2 + R2 * Math.cos(ph), top + R2 * Math.sin(ph)]);
}
if (RO > 0) {
const c = CURL_DEG * Math.PI / 180, [s0, y0] = pts[pts.length - 1], n4 = Math.max(1, seg4);
for (let i = 1; i <= n4; i++) pts.push([s0 - Math.sin(c) * RO * i / n4, y0 + Math.cos(c) * RO * i / n4]);
}
return pts;
}
export function rampProfileOffset(d, seg1, seg2, seg3, seg4) {
const p = rampProfile(seg1, seg2, seg3, seg4), n = p.length, o = [];
for (let i = 0; i < n; i++) {
const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
const ts = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(ts, ty) || 1;
o.push([p[i][0] - ty / l * d, p[i][1] + ts / l * d]);
}
return o;
}
{
const R = RAMP.R1, ro = R + RAMP.THICKNESS, sG = Math.sqrt(ro * ro - R * R), a = sG + 0.35, b = ro - 0.05, n = 10;
RAMP.UNDER_FILL.s1 = r4(ro);
RAMP.UNDER_FILL.steps = [];
for (let i = 0; i < n; i++) {
const sx = a + (b - a) * i / (n - 1), yu = R - Math.sqrt(Math.max(0, ro * ro - sx * sx));
RAMP.UNDER_FILL.steps.push([r2(sx), r2(Math.max(0.02, yu - 0.03))]);
}
}
{
const a = RAMP.GANTRY.s0, b = RAMP.TRUSS.s0, n = Math.max(1, Math.round(b - a));
RAMP.CURL_TOP_FILL.steps = [];
for (let i = 0; i < n; i++) RAMP.CURL_TOP_FILL.steps.push([r2(a + (b - a) * i / n), r2(a + (b - a) * (i + 1) / n)]);
}
export function rampAtTh(thDeg, out) {
const o = out || {}, R2 = RAMP.R2, c = RAMP.CURL_DEG * D2R, cS = RAMP.R1 - R2, cY = RAMP.R1 + RAMP.VERTICAL;
const th = Math.max(0, thDeg * D2R), a = Math.min(th, c), x = Math.max(0, th - c) * R2;
o.s = cS + R2 * Math.cos(a) - Math.sin(a) * x; o.y = cY + R2 * Math.sin(a) + Math.cos(a) * x;
o.ns = -Math.cos(a); o.ny = -Math.sin(a); o.ts = -Math.sin(a); o.ty = Math.cos(a);
return o;
}
export const RAMP_U = (() => {
const a = RAMP.R1 * Math.PI / 2, v = a + RAMP.VERTICAL, curl = v + RAMP.R2 * RAMP.CURL_DEG * D2R, lip = curl + (RAMP.RUNOUT || 0);
const top = RAMP.CURL_DEG >= 90 ? v + RAMP.R2 * Math.PI / 2 : lip;
return { arc: a, vert: v, curl, lip, top };
})();
export const RAMP_LIP = (() => {
const th = RAMP.CURL_DEG + (RAMP.RUNOUT || 0) / RAMP.R2 / D2R, p = rampAtTh(th);
return { s: r4(p.s), y: r4(p.y), u: r4(RAMP_U.lip), deg: RAMP.CURL_DEG, th: r4(th) };
})();
RAMP.HANG_DEG[1] = RAMP_LIP.th;
export const RAMP_TOP_Y = r4(Math.max(RAMP_LIP.y, RAMP.CURL_DEG >= 90 ? RAMP.R1 + RAMP.VERTICAL + RAMP.R2 : 0));
export function rampNearest(s, y, out) {
const o = out || {};
const R1 = RAMP.R1, V = RAMP.VERTICAL, R2 = RAMP.R2, CU = RAMP.CURL_DEG * D2R, cS = R1 - R2, cY = R1 + V;
let best = Infinity;
{ const qs = Math.min(s, 0), e = Math.hypot(s - qs, y); if (e < best) { best = e; o.sec = 0; o.u = qs; o.d = y; o.th = -1; o.ns = 0; o.ny = 1; } }
{ const ph = Math.min(Math.PI / 2, Math.max(0, Math.atan2(s, R1 - y))), qs = R1 * Math.sin(ph), qy = R1 * (1 - Math.cos(ph));
const e = Math.hypot(s - qs, y - qy);
if (e < best) { best = e; o.sec = 1; o.u = R1 * ph; o.ns = -Math.sin(ph); o.ny = Math.cos(ph); o.d = (s - qs) * o.ns + (y - qy) * o.ny; o.th = -1; } }
{ const qy = Math.min(R1 + V, Math.max(R1, y)), e = Math.hypot(s - R1, y - qy);
if (e < best) { best = e; o.sec = 2; o.u = RAMP_U.arc + (qy - R1); o.ns = -1; o.ny = 0; o.d = R1 - s; o.th = -1; } }
{ let th = Math.atan2(y - cY, s - cS); if (th < -Math.PI / 2) th += 2 * Math.PI;
th = Math.min(CU, Math.max(0, th));
const qs = cS + R2 * Math.cos(th), qy = cY + R2 * Math.sin(th), e = Math.hypot(s - qs, y - qy);
if (e < best) { best = e; o.sec = 3; o.u = RAMP_U.vert + R2 * th; o.ns = -Math.cos(th); o.ny = -Math.sin(th); o.d = (s - qs) * o.ns + (y - qy) * o.ny; o.th = th / D2R; } }
const RO = RAMP.RUNOUT || 0;
if (RO > 0) {
const s0 = cS + R2 * Math.cos(CU), y0 = cY + R2 * Math.sin(CU), ts = -Math.sin(CU), ty = Math.cos(CU);
const x = Math.min(RO, Math.max(0, (s - s0) * ts + (y - y0) * ty)), qs = s0 + ts * x, qy = y0 + ty * x, e = Math.hypot(s - qs, y - qy);
if (e < best) { best = e; o.sec = 4; o.u = RAMP_U.curl + x; o.ns = -Math.cos(CU); o.ny = -Math.sin(CU); o.d = (s - qs) * o.ns + (y - qy) * o.ny; o.th = (CU + x / R2) / D2R; }
}
o.onProper = o.sec >= 1 && o.u > 0.5 && Math.abs(o.d) < 1.5;
return o;
}
export function toRampLocal(x, z, out) {
const dx = x - RAMP.ORIGIN[0], dz = z - RAMP.ORIGIN[2];
out[0] = dx * RAMP.AXIS_S[0] + dz * RAMP.AXIS_S[2];
out[1] = dx * RAMP.AXIS_W[0] + dz * RAMP.AXIS_W[2];
return out;
}
export function fromRampLocal(s, w = 0) {
return [r2(RAMP.ORIGIN[0] + RAMP.AXIS_S[0] * s + RAMP.AXIS_W[0] * w), 0, r2(RAMP.ORIGIN[2] + RAMP.AXIS_S[2] * s + RAMP.AXIS_W[2] * w)];
}
const YAW_RAMP = Math.atan2(RAMP.AXIS_S[0], RAMP.AXIS_S[2]);
const YAW_RAMP_OUT = Math.atan2(-RAMP.AXIS_S[0], -RAMP.AXIS_S[2]);
export const KICKER = {
ORIGIN: [0, 0, 30.3],
AXIS_S: [0, 0, 1],
AXIS_W: [1, 0, 0],
HALF_WIDTH: 3.0,
THICKNESS: 3.0,
PROFILE: [[0, 0], [2, 0.18], [4, 0.6], [6, 1.25], [7.6, 2.0]],
COLOR: '#c4161c',
INVENTED: true,
LAUNCH_MAX: 25,
AIM_MAX_DEG: 10,
};
export const APPROACH = { X_HALF: 7, Z0: -95, Z1: -44, RAIL_H: 0.8, LIGHT_SPACING: 3.4, TUBE_H: 4.2  , TUBE_HDR: 2.4  , STOP_BAR_Z: -92,
GAPS: [[-84.8, -74.6], [-64.4, -54.2]] };
export const RUNWAY_START = { FIXTURES: { REST: 0.8, WASH_REST: 0.6, X: 6.92 }, T: { TUBES0: 0.3, PAIR_DT: 0.07, RISE: 0.34, FLOOD_T: 1.46, END: 2.46 } };
export function approachInGap(z) {
for (const g of APPROACH.GAPS || []) if (z > g[0] + 0.05 && z < g[1] - 0.05) return true;
return false;
}
export function approachRailSegs() {
const out = []; let z = APPROACH.Z0;
for (const g of [...(APPROACH.GAPS || [])].sort((a, b) => a[0] - b[0])) { if (g[0] > z) out.push([z, g[0]]); z = Math.max(z, g[1]); }
if (APPROACH.Z1 > z) out.push([z, APPROACH.Z1]);
return out;
}
const DECK = { X0: -4.5, X1: 4.5, Z0: 37.9, Z1: 62.4, H: 0.3, BEVEL: 1.2 };
const NOSE_X = Math.PI / 2;
export const LINEUP = {
DECK,
Z: r2((DECK.Z0 + DECK.Z1) / 2),
YAW: NOSE_X,
FACING: [1, 0, 0],
LED_STRIPS: [
{ a: [4.6, 0.02, 33.6], b: [4.6, 0.02, 66.7] },
{ a: [-4.6, 0.02, 33.6], b: [-4.6, 0.02, 66.7] },
],
LED_HDR: 6.0,
VEHICLES: [
{ model: 'cybercab', x: 1.5, z: 41.0, yaw: NOSE_X, color: '#b8975a' },
{ model: 'cybertruck', x: 0.9, z: 45.3, yaw: NOSE_X, color: '#a9acb0' },
{ model: 'semi', x: -0.3, z: 50.2, yaw: NOSE_X, color: '#eef0f2' },
{ model: 'modelY', x: 1.3, z: 55.1, yaw: NOSE_X, color: '#8a131b' },
{ model: 'model3', x: 1.3, z: 59.4, yaw: NOSE_X, color: '#1b2a4a' },
],
OPEN_SLOT: { x: -0.6, z: 52.5 },
HALF: {
model3: [0.925, 0.72, 2.36],
modelY: [0.96, 0.812, 2.395],
cybercab: [0.877, 0.704, 2.2225],
semi: [1.295, 2.062, 3.965],
cybertruck: [1.016, 0.897, 2.8415],
},
CENTER_Z: { model3: -0.0545, modelY: -0.061, cybercab: -0.0925, semi: 0.07, cybertruck: -0.1457 },
BOXES: {
model3: [[-2.41, -1.81, 1.194], [-1.81, 1.15, 1.436], [1.15, 2.31, 0.897]],
modelY: [[-2.46, -1.74, 1.413], [-1.74, 1.10, 1.625], [1.10, 2.33, 1.111]],
cybercab: [[-2.31, -1.43, 1.19], [-1.43, 1.01, 1.408], [1.01, 2.13, 0.951]],
cybertruck: [[-2.99, -1.51, 1.56], [-1.51, 1.53, 1.794], [1.53, 2.70, 1.43]],
semi: [[-3.90, -0.90, 1.27], [-0.90, 2.55, 4.124], [2.55, 3.35, 3.083], [3.35, 4.04, 2.104]],
},
HEADLIGHT_POOL: { ahead: 2.6, len: 2.6, widthMul: 1.1 },
LIGHTS_ON: true,
LANDING: { X_HALF: 22, Z0: 66, Z1: 140 },
RUNOFF_Z1: 375,
};
_deprecate(LINEUP, 'LED_Z', LINEUP.Z, 'LINEUP.LED_Z (v3 strip across X) → LINEUP.LED_STRIPS (two strips along K)');
_deprecate(LINEUP, 'LED_HALF_X', 4.6, 'LINEUP.LED_HALF_X → LINEUP.LED_STRIPS / LINEUP.DECK');
export const LIGHT_ROW = {
A: fromRampLocal(-56, -24),
B: fromRampLocal(10, -24),
FRAME: 'ramp-local', W: -24, S0: -56, S1: 10,
FACING: RAMP.AXIS_W,
HEIGHT: 1.5, DEPTH: 1.6,
FIXTURE_PITCH: 2.0, FIXTURES: 33,
FIXTURE: { type: 'LED wash/beam (moving-head body)', size: [0.42, 0.55, 0.38], beamLen: 18, beamHalfAngleDeg: 3.5, tiltDeg: 62, hdr: [2.6, 0.027, 0.011] },
EDGE_LED_HDR: [2.6, 0.027, 0.011],
WHITE_HEADS_S: [-44, -14],
SPUR: null,
SPECTATORS: { ENABLED: true, S0: -50, S1: 6, W0: -27, W1: -32, STEPS: 3, STEP_H: 0.45, COUNT: { low: 120, medium: 220, high: 360, ultra: 520 }, PHONE_FRACTION: 0.35 },
};
export const STAGE = {
FACING: [1, 0, 0],
DECK: { X0: 121, X1: 135, Z0: -104, Z1: -76, H: 1.4 },
THRUST: { X0: 135, X1: 145, Z0: -94, Z1: -86, R: 4 },
RISER: { X0: 121.2, X1: 123.6, Z0: -102, Z1: -78, H: 0.8, HEADS: 14 },
TOWERS: [[128, 0, -64], [130, 0, -116]], TOWER_H: 17,
SCREENS: [
{ pos: [126, 4.9, -71], w: 12, h: 6, yaw: Math.PI / 2 + 0.26 },
{ pos: [126, 4.9, -109], w: 12, h: 6, yaw: Math.PI / 2 - 0.26 },
],
REAR_SCREENS: true,
SIGNS: [{ pos: [122, 4.5, -102], yaw: Math.PI / 2, text: 'ROADSTER' }],
EDGE_DEFAULT: 'red', EDGE_FEATURED: 'blue',
};
export const CROWD = {
X0: 147, X1: 170, Z0: -118, Z1: -64,
FACING: [-1, 0, 0],
COUNT: { low: 300, medium: 600, high: 1000, ultra: 1500 },
PHONE_FRACTION: 0.35,
BARRIER_X: 146,
};
export const FOH = { pos: [172, 0, -91], height: 9 };
export const HALL = {
CORNERS: [[139, 0, -143], [165, 0, -214], [122.7, 0, -229.5], [96.7, 0, -158.5]],
HEIGHT: 14,
LETTERING: 'ROADSTER',
};
export const ARRIVALS = { X0: 148, X1: 176, Z0: -150, Z1: -124 };
export const GRANDSTAND = {};
{
const g = { FRONT_X: CROWD.X1, CENTER_Z: (CROWD.Z0 + CROWD.Z1) / 2, HALF_Z: (CROWD.Z1 - CROWD.Z0) / 2,
DEPTH: CROWD.X1 - CROWD.X0, HEIGHT: 2.2, TIERS: 2, FACING: -1, DEPRECATED: true };
for (const k of Object.keys(g)) _deprecate(GRANDSTAND, k, g[k], 'GRANDSTAND (v3 west stand) → LIGHT_ROW (+ SPECTATORS) / CROWD / STAGE');
}
const TRUSS_BACK_S = RAMP.TRUSS.s1 + 1.6;
const _TBp = fromRampLocal(TRUSS_BACK_S, 5), _TBm = fromRampLocal(TRUSS_BACK_S, -5);
const WEST_X = LIGHT_ROW.A[0];
const PERIM = [
{ id: 'north', kind: 'fence', skin: 'mesh', windscreen: true, a: [WEST_X, 375], dressing: [{ at: 80, w: 7, show: 'generator' }, { at: 160, w: 9, show: 'trucks' }] },
{ id: 'northeast', kind: 'fence', skin: 'mesh', windscreen: true, a: [130, 375] },
{ id: 'east', kind: 'fence', skin: 'mesh', windscreen: true, a: [150, 355], dressing: [{ at: 160, w: 11, show: 'tents' }, { at: 285, w: 8, show: 'containers' }, { at: 378, w: 9, show: 'obvan' }] },
{ id: 'crowdFlank', kind: 'crowd', a: [150, -60] },
{ id: 'stageBack', kind: 'stage', a: [120, -60] },
{ id: 'stageSouth', kind: 'fence', skin: 'scrim', a: [120, -112], gaps: [{ at: 22, w: 6, show: 'cases' }] },
{ id: 'south', kind: 'fence', skin: 'mesh', a: [95, -136], dressing: [{ at: 30, w: 8, show: 'cases' }, { at: 92, w: 8, show: 'generator' }] },
{ id: 'gapRunoffE', kind: 'fence', skin: 'mesh', a: [-18, -136] },
{ id: 'gapRunoffS', kind: 'fence', skin: 'mesh', a: [-18, -216] },
{ id: 'gapRunoffW', kind: 'fence', skin: 'mesh', a: [-46, -216] },
{ id: 'southwest', kind: 'fence', skin: 'scrim', a: [-46, -113.33], gaps: [{ at: 1, w: 9, show: 'containers' }] },
{ id: 'trussBack', kind: 'truss', skin: 'scrim', a: [_TBp[0], _TBp[2]] },
{ id: 'rampWest', kind: 'fence', skin: 'scrim', a: [_TBm[0], _TBm[2]], gaps: [{ at: 14, w: 6, show: 'generator' }] },
{ id: 'lightRow', kind: 'lightrow', a: [LIGHT_ROW.B[0], LIGHT_ROW.B[2]] },
{ id: 'west', kind: 'fence', skin: 'mesh', a: [LIGHT_ROW.A[0], LIGHT_ROW.A[2]], dressing: [{ at: 40, w: 9, show: 'trucks' }, { at: 165, w: 8, show: 'containers' }] },
];
for (let i = 0; i < PERIM.length; i++) {
const s = PERIM[i], b = PERIM[(i + 1) % PERIM.length].a;
s.b = b;
s.length = r2(Math.hypot(b[0] - s.a[0], b[1] - s.a[1]));
if (!s.gaps) s.gaps = [];
if (!s.dressing) s.dressing = [];
if (!s.skin) s.skin = s.kind === 'fence' ? 'mesh' : 'none';
s.windscreen = !!s.windscreen;
}
export const PERIMETER = PERIM;
const _N = PERIM.length;
const _AX = new Float64Array(_N), _AZ = new Float64Array(_N), _DX = new Float64Array(_N), _DZ = new Float64Array(_N);
const _L2 = new Float64Array(_N), _NX = new Float64Array(_N), _NZ = new Float64Array(_N), _CONVEX = new Uint8Array(_N);
{
let area2 = 0;
for (let i = 0; i < _N; i++) {
const a = PERIM[i].a, b = PERIM[i].b;
_AX[i] = a[0]; _AZ[i] = a[1]; _DX[i] = b[0] - a[0]; _DZ[i] = b[1] - a[1];
_L2[i] = _DX[i] * _DX[i] + _DZ[i] * _DZ[i];
area2 += a[0] * b[1] - b[0] * a[1];
}
const sgn = area2 > 0 ? 1 : -1;
for (let i = 0; i < _N; i++) {
const l = Math.sqrt(_L2[i]) || 1;
_NX[i] = -sgn * _DZ[i] / l; _NZ[i] = sgn * _DX[i] / l;
const j = (i + 1) % _N;
const cross = _DX[i] * _DZ[j] - _DZ[i] * _DX[j];
_CONVEX[j] = cross * sgn > 0 ? 1 : 0;
}
for (let i = 0; i < _N; i++) { PERIM[i].inward = [r2(_NX[i]), 0, r2(_NZ[i])]; PERIM[i].convexStart = !!_CONVEX[i]; }
}
function _pointInPoly(x, z) {
let c = false;
for (let i = 0; i < _N; i++) {
const az = _AZ[i], bz = az + _DZ[i];
if ((az > z) !== (bz > z)) {
const xi = _AX[i] + (z - az) / (bz - az) * _DX[i];
if (x < xi) c = !c;
}
}
return c;
}
export function arenaWallDistance(x, z, out) {
let best = Infinity, bi = 0, bt = 0;
for (let i = 0; i < _N; i++) {
let t = ((x - _AX[i]) * _DX[i] + (z - _AZ[i]) * _DZ[i]) / _L2[i];
t = t < 0 ? 0 : t > 1 ? 1 : t;
const ex = x - (_AX[i] + _DX[i] * t), ez = z - (_AZ[i] + _DZ[i] * t);
const d2 = ex * ex + ez * ez;
if (d2 < best) { best = d2; bi = i; bt = t; }
}
const d = Math.sqrt(best);
const inside = _pointInPoly(x, z);
if (out) {
if (bt > 0 && bt < 1) { out[0] = _NX[bi]; out[1] = _NZ[bi]; }
else {
const px = _AX[bi] + _DX[bi] * bt, pz = _AZ[bi] + _DZ[bi] * bt;
let vx = inside ? x - px : px - x, vz = inside ? z - pz : pz - z;
const l = Math.hypot(vx, vz);
if (l > 1e-6) { out[0] = vx / l; out[1] = vz / l; } else { out[0] = _NX[bi]; out[1] = _NZ[bi]; }
}
if (out.length > 2) out[2] = bi;
}
return inside ? d : -d;
}
export function insideArena(x, z, margin = 0) {
if (margin < 0) return arenaWallDistance(x, z) >= margin;
if (!_pointInPoly(x, z)) return false;
return margin === 0 || arenaWallDistance(x, z) >= margin;
}
export function segmentInsideArena(ax, az, bx, bz, margin = 0, step = 1) {
const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / step));
for (let i = 0; i <= n; i++) { const t = i / n; if (!insideArena(ax + (bx - ax) * t, az + (bz - az) * t, margin)) return false; }
return true;
}
export const ARENA = {
POLY: PERIM.map((s) => s.a),
BOUNDS: (() => {
let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
for (const s of PERIM) { x0 = Math.min(x0, s.a[0]); x1 = Math.max(x1, s.a[0]); z0 = Math.min(z0, s.a[1]); z1 = Math.max(z1, s.a[1]); }
return { MIN_X: x0, MAX_X: x1, MIN_Z: z0, MAX_Z: z1 };
})(),
AREA_M2: (() => { let a = 0; for (const s of PERIM) a += s.a[0] * s.b[1] - s.b[0] * s.a[1]; return Math.round(Math.abs(a) / 2); })(),
PERIMETER_M: Math.round(PERIM.reduce((t, s) => t + s.length, 0)),
REFLEX: PERIM.filter((s) => !s.convexStart).map((s) => s.a),
WALL: {
THICKNESS: 0.8,
RAIL_H: 0.81, RAIL_BASE: 0.61, RAIL_SEG: 6.1,
RAIL_COLOR: '#8d8a84',
FENCE_H: 2.4, PANEL_W: 3.5, PANEL_H: 1.6,
MESH: { cell: [0.075, 0.2], wire: 0.0045, frameTube: 0.04, color: '#9aa0a6', metalness: 0.6, roughness: 0.5,
coverage: r4(1 - (1 - 0.0045 / 0.075) * (1 - 0.0045 / 0.2)), filter: 'fwidth box filter → coverage' },
WINDSCREEN: { h: 1.0, color: '#303337', weave: 0.03, roughness: 0.9 },
SCRIM: { color: '#0d0e10', roughness: 0.92 },
BARRICADE_H: 1.2,
LIGHTROW_H: 1.5,
TOP: 1000,
MARKER_SPACING: 12,
EDGE_CUE: { reflectorBand: { y: 0.55, h: 0.1, color: '#d9d4c3', retro: 6 }, topRope: { hdr: 0.8, color: '#ff2a1c', bloom: false } },
INNER_LIGHT: { SPILL_E: 1.8, STRIP_M: 10, RIM_E: 0.25 },
},
CEILING: { SOFT_Y: 50, HARD_Y: 75, ACCEL: 34 },
CATCH: { RANGE: 60, STOP_GAP: 4, MAX_ACCEL: 120, GROUND_ZONES: ['ARRESTOR', 'RAMP_BAY', 'SPRINT_TRAP', 'RAMP_YARD'], INTERIOR: true, FEEDBACK_MIN: 8 },
OUTSIDE: { VERGE_W: 3, GRAVEL: '#4d4943', DIRT: '#3b3026' },
};
const POLY_WALL_H = { fence: ARENA.WALL.FENCE_H, truss: ARENA.WALL.FENCE_H, crowd: ARENA.WALL.BARRICADE_H, stage: ARENA.WALL.RAIL_H, lightrow: ARENA.WALL.LIGHTROW_H };
for (const s of PERIM) s.wallH = POLY_WALL_H[s.kind] || ARENA.WALL.FENCE_H;
export const INTERIOR_WALLS = [];
export const XING = {
GAP: { x0: -7, x1: 7, z0: -8, z1: 8 },
LIVE: { zone: 'K_RUN', zMax: 8, minSpeed: 6 },
INLAY: { color: '#ff1d25', hdr: 6, hz: 3, len: 22 },
BEACONS: [],
HUD_RADIUS: 30,
RETURN_YIELD: { at: [56, 0], look: 16, radius: 22, color: '#ffb020' },
WAIT: [[-14, 0], [14, 0]],
};
export const ZONES = {
LANE: { x0: -APPROACH.X_HALF, x1: APPROACH.X_HALF, z0: APPROACH.Z0, z1: APPROACH.Z1 },
K_RUN: { x0: -7, x1: 7, z0: APPROACH.Z0 - 11, z1: DECK.Z0 },
XING: { center: [0, 0, 0], r: 18, gap: XING.GAP },
DECK: { x0: DECK.X0, x1: DECK.X1, z0: DECK.Z0, z1: DECK.Z1 },
LANDING: { x0: -28, x1: 28, z0: 66, z1: 200 },
RUNOFF: { x0: WEST_X + 2, x1: 48, z0: 140, z1: 222 },
ARRESTOR: { x0: WEST_X + 2, x1: 48, z0: 222, z1: 375, DECEL: 7, DRIVE_MUL: 0.15, SCRUB_V: 8, surface: 'gravel', albedo: 0.09 },
RAMP_RUNUP: { frame: 'ramp', s0: -44, s1: 0, w0: -4, w1: 4 },
RAMP_DROP: { frame: 'ramp', s0: -64, s1: 0, w0: -8, w1: 8 },
RAMP_BAY: { frame: 'ramp', s0: -116, s1: -66, w0: -24, w1: -24, x1: -58, z1: 66, DECEL: 7, DRIVE_MUL: 0.15, surface: 'gravel', albedo: 0.09, catchWalls: [] },
RAMP_YARD: { x1: -58, x1North: -58, zSplit: 0, z0: -77, z1: 10, catchWalls: [] },
PADDOCK: { frame: 'ramp', s0: -68, s1: -46, w0: -19.5, w1: -15.5 },
RAMP_RETURN: { frame: 'ramp', w: -20.8 },
SERVICE: { x0: -36, x1: 62, z0: -135, z1: -110, surface: 'asphalt', LANES: { west: -124, east: -131 } },
SPRINT: { x0: 66, x1: 98, z0: 14, z1: 205, PORTAL_Z: 110, TICK: [1, 5] },
GAP_RUNOFF: { x0: -45, x1: -19, z0: -215, z1: -137, DECEL: 7, DRIVE_MUL: 0.15, SCRUB_V: 8, surface: 'gravel', albedo: 0.09 },
SPRINT_TRAP: { x0: 58, x1: 150, z0: 205, z1: 375, DECEL: 7, DRIVE_MUL: 0.15, SCRUB_V: 8, surface: 'gravel', albedo: 0.09 },
FREESTYLE: { center: [60, 0, -90], r: 28, surface: 'sealed-asphalt' },
STAGE_VIEW: { x0: 100, x1: 118, z0: -112, z1: -46 },
RETURN: { path: [[44, 228], [58, 212], [58, 150], [58, 90], [58, 40], [56, 0], [52, -50], [30, -95], [14, -100]], markerSpacing: 10 },
};
export const JUMPS_ENABLED = true;
const _cosDown = (s0, s1, h, n = 8) => Array.from({ length: n }, (_, k) => [r2(s0 + (s1 - s0) * (k + 1) / n), r2(h * (1 + Math.cos(Math.PI * (k + 1) / n)) / 2)]);
const TESLA_KICK = [[0, 0], [3, 0.2], [6, 0.78], [8.4, 1.32]];
const TESLA_BACK = [[9.0, 1.02], [13.2, 0.8], [13.45, 0]];
const TESLA_KICK_BACK = [...TESLA_KICK, ...TESLA_BACK];
const _JUMPS = [
{
id: 'MESA', label: 'MESA', say: 'the MESA', enabled: true, origin: [-73, 0, 96], axisS: [0, 0, 1], axisW: [1, 0, 0],
pieces: [{ type: 'extrude', tag: 'jump', s0: 0, halfWidth: 7, thickness: 4.2, role: 'mesa',
profile: [[0, 0], [3, 0.1], [6, 0.45], [9, 1.15], [12, 2.15], [15, 3.2], [16.5, 3.7], [17.5, 3.98], [18.5, 4.15], [19.5, 4.2], [38, 4.2], ..._cosDown(38, 88, 4.2, 12)] }],
LIP: 16.5, RUNUP: [-110, 16.5], CAP: 28, AIM_MAX_DEG: 8, MIN_V: 18,
FUNNEL: { S0: -34, S1: 0, LOOK: 14, YAW_GAIN: 3, FADE_DEG: [6, 14], STEER_FADE: 0.3, MIN_SPEED: 6, W_PAD: 4 },
start: { pos: [-73, 0, 40], yaw: 0 },
clear: [[20.5, 38, 4.2]], landing: { s0: 38, s1: 125, hw: 12 },
runout: { path: [[-73, 190], [-74, 206], [-79, 216], [-86, 214], [-88.5, 202], [-88, 180], [-87, 150], [-87, 120], [-87, 90]], board: { at: [-73, 374], arrow: -1 } },
},
{
id: 'GAP', label: 'THE GAP', say: 'THE GAP', enabled: true, origin: [-32, 0, 22], axisS: [0, 0, -1], axisW: [-1, 0, 0],
pieces: [
{ type: 'extrude', tag: 'kicker', s0: 0, halfWidth: 4.5, thickness: 2.8, role: 'takeoff', profile: [[0, 0], [3, 0.3], [6, 1.0], [9, 2.0], [11, 2.8]] },
{ type: 'box', tag: 'prop', kind: 'container', s0: 12.6, s1: 15.04, w0: -6.1, w1: 6.1, y0: 0, y1: 2.59, color: '#5d7a8f' },
{ type: 'box', tag: 'prop', kind: 'container', s0: 15.8, s1: 18.24, w0: -6.1, w1: 6.1, y0: 0, y1: 2.59, color: '#8a3b2a' },
{ type: 'box', tag: 'prop', kind: 'container', s0: 19.0, s1: 21.44, w0: -6.1, w1: 6.1, y0: 0, y1: 2.59, color: '#5d7a8f' },
{ type: 'extrude', tag: 'jump', s0: 21.6, halfWidth: 6.5, thickness: 2.6, role: 'landing', profile: [[0, 0], [0.15, 2.59], [2, 2.59], [6, 2.5], [42, 0.6], [46, 0.1], [48, 0]] },
],
LIP: 11, RUNUP: [-70, 11], CAP: 19.5, AIM_MAX_DEG: 4, MIN_V: 18,
FUNNEL: { S0: -30, S1: 0, LOOK: 14, YAW_GAIN: 3, FADE_DEG: [6, 14], STEER_FADE: 0.3, MIN_SPEED: 6, W_PAD: 3 },
start: { pos: [-32, 0, 52], yaw: Math.PI },
clear: [[12.6, 21.44, 2.59]], landing: { s0: 23.6, s1: 85, hw: 8 },
runout: { path: [[-32, -56], [-31.5, -70], [-28, -84], [-21, -96], [-12, -104], [-3, -106], [2.5, -101]], board: { at: [-31, -135], arrow: -1 },
CATCH: { S0: 44, HW: 12 } },
},
{
id: 'ARCH', label: 'THE ARCH', say: 'THE ARCH', enabled: true, origin: [44, 0, -24], axisS: [0, 0, 1], axisW: [1, 0, 0],
pieces: [
{ type: 'extrude', tag: 'kicker', s0: 0, halfWidth: 4.5, thickness: 3, role: 'takeoff', profile: [[0, 0], [2, 0.18], [4, 0.6], [6, 1.25], [7.6, 2.0]] },
{ type: 'box', tag: 'prop', kind: 'archTower', s0: 32, s1: 33.2, w0: -7.6, w1: -6.4, y0: 0, y1: 14 },
{ type: 'box', tag: 'prop', kind: 'archTower', s0: 32, s1: 33.2, w0: 6.4, w1: 7.6, y0: 0, y1: 14 },
{ type: 'box', tag: 'prop', kind: 'archHeader', s0: 32, s1: 33.2, w0: -7.6, w1: 7.6, y0: 12.5, y1: 14, header: true },
],
LIP: 7.6, RUNUP: [-60, 7.6], CAP: 24, AIM_MAX_DEG: 5, MIN_V: 14,
FUNNEL: { S0: -32, S1: 0, LOOK: 14, YAW_GAIN: 3, FADE_DEG: [6, 14], STEER_FADE: 0.3, MIN_SPEED: 6, W_PAD: 3 },
start: { pos: [44, 0, -56], yaw: 0 },
clear: [], through: { s0: 32, s1: 33.2, w: 6.4, y0: 1.5, y1: 12.5 }, landing: { s0: 45, s1: 95, hw: 8 },
},
{
id: 'TRUCK', label: 'TRUCK JUMP', say: 'TRUCK JUMP', enabled: true, origin: [44, 0, 96], axisS: [0, 0, 1], axisW: [1, 0, 0],
pieces: [
{ type: 'extrude', tag: 'kicker', s0: 0, halfWidth: 4.5, thickness: 3, role: 'takeoff', profile: [[0, 0], [2, 0.18], [4, 0.6], [6, 1.25], [7.6, 2.0]] },
{ type: 'vehicle', model: 'cybertruck', s: 14.59, yaw: 0, color: '#a9acb0' },
{ type: 'vehicle', model: 'cybertruck', s: 21.69, yaw: 0, color: '#8d8f91' },
],
LIP: 7.6, RUNUP: [-80, 7.6], CAP: 24, AIM_MAX_DEG: 5, MIN_V: 15,
FUNNEL: { S0: -40, S1: 0, LOOK: 14, YAW_GAIN: 3, FADE_DEG: [6, 14], STEER_FADE: 0.3, MIN_SPEED: 6, W_PAD: 4, LONG: { S0: -75, AIR_T: 2 } },
start: { pos: [44, 0, 58], yaw: 0 },
clear: [[11.6, 24.4, 1.79]], landing: { s0: 40, s1: 110, hw: 9 },
runout: { path: [[44, 196], [44.5, 210], [48, 219], [54, 219], [58, 212], [58, 198], [58, 180]], board: { at: [44, 374], arrow: 1 } },
},
{ id: 'TESLA_N', label: 'TESLA JUMP N', say: 'the TESLA JUMP', enabled: true, pair: 'TESLA_S',
origin: [-50, 0, 125.25], axisS: [0, 0, 1], axisW: [1, 0, 0],
pieces: [
{ type: 'extrude', tag: 'kicker', s0: 0, halfWidth: 4.5, thickness: 3, role: 'takeoff', profile: TESLA_KICK_BACK },
{ type: 'vehicle', model: 'model3', s: 14.75, yaw: Math.PI / 2, color: '#e9e9e6' },
],
LIP: 8.4, RUNUP: [-80, 8.4], CAP: 20, AIM_MAX_DEG: 5, MIN_V: 20,
FUNNEL: { S0: -40, S1: 0, LOOK: 14, YAW_GAIN: 3, FADE_DEG: [6, 14], STEER_FADE: 0.3, MIN_SPEED: 6, W_PAD: 4 },
start: { pos: [-50, 0, 104.4], yaw: 0 },
clear: [[13.8, 15.7, 1.44], [19.85, 20.35, 1.4]], landing: { s0: 27.6, s1: 95, hw: 9 },
runout: { path: [[-50, 192], [-50, 204], [-47, 213], [-41, 215], [-36.5, 209], [-34, 198], [-33, 180], [-32.5, 150], [-32, 120]] },
},
{ id: 'TESLA_S', label: 'TESLA JUMP S', say: 'the TESLA JUMP', enabled: true, pair: 'TESLA_N',
origin: [-50, 0, 154.75], axisS: [0, 0, -1], axisW: [-1, 0, 0],
pieces: [
{ type: 'extrude', tag: 'kicker', s0: 0, halfWidth: 4.5, thickness: 3, role: 'takeoff', profile: TESLA_KICK_BACK },
],
LIP: 8.4, RUNUP: [-70, 8.4], CAP: 20, AIM_MAX_DEG: 5, MIN_V: 20,
FUNNEL: { S0: -40, S1: 0, LOOK: 14, YAW_GAIN: 3, FADE_DEG: [6, 14], STEER_FADE: 0.3, MIN_SPEED: 6, W_PAD: 4 },
start: { pos: [-50, 0, 175.6], yaw: Math.PI },
clear: [[13.8, 15.7, 1.44], [19.85, 20.35, 1.4]], landing: { s0: 27.6, s1: 95, hw: 9 },
runout: { path: [[-50, 100], [-49.5, 90], [-47.5, 81], [-44, 73], [-39.5, 65], [-35, 57], [-32.5, 50]] },
},
];
for (const J of _JUMPS) {
J.YAW = Math.atan2(J.axisS[0], J.axisS[2]);
const ex = J.pieces.find((p) => p.type === 'extrude');
J.halfWidth = J.halfWidth ?? (ex ? ex.halfWidth : 3);
J.start.pos = [J.start.pos[0], 0, J.start.pos[2]];
}
export const JUMPS = JUMPS_ENABLED ? _JUMPS.filter((j) => j.enabled !== false) : [];
export function jumpPoint(J, s, w = 0) {
return [r2(J.origin[0] + J.axisS[0] * s + J.axisW[0] * w), 0, r2(J.origin[2] + J.axisS[2] * s + J.axisW[2] * w)];
}
export function toJumpLocal(J, x, z, out) {
const dx = x - J.origin[0], dz = z - J.origin[2];
out[0] = dx * J.axisS[0] + dz * J.axisS[2]; out[1] = dx * J.axisW[0] + dz * J.axisW[2];
return out;
}
export function jumpColliders(J) {
const C = [];
for (const p of J.pieces) {
if (p.type === 'extrude') {
const o = jumpPoint(J, p.s0);
C.push({ type: 'extrude', tag: p.tag, origin: [o[0], 0, o[2]], axisS: J.axisS, axisW: J.axisW, halfWidth: p.halfWidth,
profile: p.profile, thickness: p.thickness, jump: J.id });
const kb = kickerBack(p);
if (kb) {
const c = jumpPoint(J, p.s0 + (kb.s0 + kb.s1) / 2, 0);
C.push({ type: 'box', tag: 'prop', center: [c[0], kb.y1 / 2, c[2]], half: [p.halfWidth, r4(kb.y1 / 2), r4((kb.s1 - kb.s0) / 2)], yaw: J.YAW, jump: J.id, kind: 'kickerBack' });
}
} else if (p.type === 'box') {
const c = jumpPoint(J, (p.s0 + p.s1) / 2, (p.w0 + p.w1) / 2);
C.push({ type: 'box', tag: p.tag, center: [c[0], (p.y0 + p.y1) / 2, c[2]], half: [r4((p.w1 - p.w0) / 2), r4((p.y1 - p.y0) / 2), r4((p.s1 - p.s0) / 2)],
yaw: J.YAW, jump: J.id, kind: p.kind, header: !!p.header, noSuction: p.kind === 'archTower' || p.kind === 'archHeader' });
} else if (p.type === 'vehicle') {
const B = LINEUP.BOXES[p.model], hw = LINEUP.HALF[p.model][0], yaw = J.YAW + (p.yaw || 0), fx = Math.sin(yaw), fz = Math.cos(yaw);
const root = jumpPoint(J, p.s);
for (const [z0, z1, top] of B) {
const oz = (z0 + z1) / 2;
C.push({ type: 'box', tag: 'vehicle:' + p.model, center: [r4(root[0] + fx * oz), top / 2, r4(root[2] + fz * oz)], half: [hw, top / 2, (z1 - z0) / 2], yaw, jump: J.id });
}
}
}
return C;
}
export function kickerBack(p) {
if (!p || p.type !== 'extrude' || p.tag !== 'kicker' || p.profile.length < 2) return null;
const q = p.profile, a = q[q.length - 2], b = q[q.length - 1], ds = b[0] - a[0], dy = b[1] - a[1];
if (!(b[1] > 0.5) || !(ds > 1e-3) || !(dy > 0)) return null;
return { s0: r4(b[0] - 0.05), s1: r4(b[0] + b[1] * dy / ds + 0.06), y1: r4(b[1] - 0.1) };
}
export const FLOODLIGHTS = [
{ id: 'IM1', kind: 'mast', island: true, pos: [36, 0, -40], height: 20, heads: [
{ aim: [0, 0, -2], r: 11, w: 1, panels: 4, beam: true }, { aim: [0, 0, -66], r: 10, w: 1, panels: 4 }, { aim: [62, 0, -30], r: 11, w: 0.85, panels: 4 },
{ aim: [44, 0, -22], r: 8, w: 0.9, panels: 4 }] },
{ id: 'M1', kind: 'mast', pos: [0, 0, 386], height: 20, heads: [
{ aim: [0, 0, 40], r: 7, w: 1, panels: 4, beam: true }, { aim: [4, 0, 236], r: 11, w: 0.75, panels: 4 }, { aim: [-2, 0, 160], r: 11, w: 0.9, panels: 4 },
{ aim: [0, 0, -50], r: 14, w: 9, panels: 4 }, { aim: [0, 0, -92], r: 12, w: 2, panels: 4 }] },
{ id: 'RW', kind: 'tower', pos: fromRampLocal(-22, -31), height: 20, heads: [
{ aim: fromRampLocal(-24, 2), r: 10, w: 1, panels: 6, beam: true }, { aim: fromRampLocal(-50, -15), r: 10, w: 0.8, panels: 6 }] },
{ id: 'W1', kind: 'tower', pos: [-98, 0, 84], height: 20, heads: [
{ aim: [-73, 0, 104], r: 9, w: 1, panels: 6 }, { aim: [-70, 0, 36], r: 10, w: 0.7, panels: 6 }, { aim: [-26, 0, 96], r: 10, w: 0.6, panels: 6 },
{ aim: [-73, 0, 122], r: 8, w: 0.9, panels: 6 }] },
{ id: 'IM2', kind: 'mast', island: true, pos: [142, 0, 100], height: 20, heads: [
{ aim: [118, 0, 70], r: 11, w: 0.9, panels: 4 }, { aim: [84, 0, 100], r: 11, w: 0.85, panels: 4 }, { aim: [126, 0, 150], r: 11, w: 0.8, panels: 4 }] },
{ id: 'S2', kind: 'tower', pos: [-6, 0, -140], height: 20, heads: [
{ aim: [0, 0, -122], r: 7, w: 1, panels: 6 }, { aim: [-24, 0, -118], r: 9, w: 0.7, panels: 6 }] },
{ id: 'W2', kind: 'tower', pos: [-98, 0, 150], height: 20, heads: [
{ aim: [-4, 0, 128], r: 11, w: 1, panels: 6 }, { aim: [-70, 0, 158], r: 10, w: 0.9, panels: 6 }, { aim: [-34, 0, 178], r: 11, w: 0.7, panels: 6 },
{ aim: [-50, 0, 140], r: 9, w: 0.95, panels: 6 }] },
{ id: 'E2', kind: 'tower', pos: [154, 0, -30], height: 20, heads: [
{ aim: [122, 0, -20], r: 12.5, w: 1, panels: 6 }, { aim: [92, 0, -40], r: 10, w: 0.8, panels: 6 }] },
{ id: 'SW', kind: 'tower', pos: [-58, 0, -104], height: 20, heads: [
{ aim: [0, 0, -79], r: 6, w: 0.9, panels: 6 }, { aim: [-32, 0, -62], r: 10, w: 0.65, panels: 6 }] },
{ id: 'NW', kind: 'tower', pos: [-98, 0, 225], height: 20, heads: [
{ aim: [-24, 0, 206], r: 11, w: 0.85, panels: 8 }, { aim: [-70, 0, 210], r: 11, w: 0.6, panels: 4 }, { aim: [-46, 0, 244], r: 9, w: 0.5, panels: 4 }] },
{ id: 'N2', kind: 'tower', pos: [40, 0, 379], height: 20, heads: [
{ aim: [32, 0, 200], r: 11, w: 0.9, panels: 8 }, { aim: [54, 0, 240], r: 9, w: 0.6, panels: 4 }, { aim: [44, 0, 164], r: 10, w: 0.8, panels: 6 }] },
{ id: 'N3', kind: 'tower', pos: [96, 0, 379], height: 20, heads: [
{ aim: [86, 0, 196], r: 11, w: 0.9, panels: 8 }, { aim: [112, 0, 236], r: 9, w: 0.6, panels: 4 }] },
{ id: 'NE1', kind: 'tower', pos: [142.8, 0, 367.8], height: 20, heads: [
{ aim: [124, 0, 200], r: 11, w: 0.85, panels: 6 }, { aim: [88, 0, 160], r: 10, w: 0.85, panels: 6, beam: true }] },
{ id: 'M2', kind: 'mast', pos: alongR(-190), height: 20, heads: [
{ aim: [44, 0, 114], r: 9, w: 0.9, panels: 6 }, { aim: [84, 0, 60], r: 10, w: 0.9, panels: 6 }, { aim: [44, 0, 42], r: 10, w: 0.8, panels: 6 }] },
{ id: 'E3', kind: 'tower', pos: [154, 0, 168], height: 20, heads: [
{ aim: [120, 0, 120], r: 11, w: 0.8, panels: 6 }, { aim: [136, 0, 186], r: 9, w: 0.6, panels: 6 }] },
{ id: 'E1', kind: 'tower', pos: [154, 0, 34], height: 20, heads: [
{ aim: [86, 0, 16], r: 11, w: 1, panels: 6 }, { aim: [122, 0, 14], r: 11, w: 0.9, panels: 6 }] },
{ id: 'S1', kind: 'tower', pos: [58, 0, -140], height: 20, heads: [
{ aim: [58, 0, -94], r: 12.5, w: 1, panels: 8 }, { aim: [22, 0, -116], r: 9, w: 0.7, panels: 4 }] },
{ id: 'IM3', kind: 'mast', island: true, pos: [-51.5, 0, -50], height: 20, heads: [
{ aim: [-32, 0, -22], r: 9, w: 0.9, panels: 4 }, { aim: [-70, 0, -24], r: 10, w: 0.8, panels: 4, beam: true }, { aim: [-32, 0, 8], r: 8, w: 0.85, panels: 4 }] },
{ id: 'SB', kind: 'tower', pos: [100, 0, -141], height: 20, heads: [
{ aim: [108, 0, -96], r: 11, w: 0.9, panels: 8 }, { aim: [36, 0, -60], r: 10, w: 0.6, panels: 4 }] },
];
export const ACCENT_LIGHTS = [
{ id: 'LRA', kind: 'lamp', pos: [fromRampLocal(LIGHT_ROW.WHITE_HEADS_S[0], -25)[0], 3.2, fromRampLocal(LIGHT_ROW.WHITE_HEADS_S[0], -25)[2]], height: 3.2, heads: [{ aim: fromRampLocal(-50, -14), r: 8, w: 0.6 }] },
{ id: 'LRB', kind: 'lamp', pos: [fromRampLocal(LIGHT_ROW.WHITE_HEADS_S[1], -25)[0], 3.2, fromRampLocal(LIGHT_ROW.WHITE_HEADS_S[1], -25)[2]], height: 3.2, heads: [{ aim: fromRampLocal(-10, -12), r: 8, w: 0.8 }] },
{ id: 'GANTRY', kind: 'gantry', pos: [fromRampLocal(3)[0], 25.5, fromRampLocal(3)[2]], height: 25.5, heads: [{ aim: fromRampLocal(-5.5), r: 6.2, w: 1.1 }] },
];
const POOL_ELONG_MAX = 2.2;
const POOL_EDGE_POW = 2;
for (const f of [...FLOODLIGHTS, ...ACCENT_LIGHTS]) {
const hy = f.height ?? f.pos[1];
for (const h of f.heads) {
const dx = h.aim[0] - f.pos[0], dz = h.aim[2] - f.pos[2], d = Math.hypot(dx, dz) || 1;
const el = Math.atan2(hy, d);
h.dir = [r4(dx / d), 0, r4(dz / d)];
h.throw = r2(d); h.elevDeg = r2(el / D2R);
h.ra = r2(h.r * Math.min(POOL_ELONG_MAX, 1 / Math.sin(el)));
h.rc = h.r;
}
}
for (const f of FLOODLIGHTS) f.aim = f.heads[0].aim;
export const KEY_POOLS = [...FLOODLIGHTS, ...ACCENT_LIGHTS].flatMap((f) => f.heads.map((h) => ({ aim: h.aim, dir: h.dir, ra: h.ra, rc: h.rc, r: h.r, w: h.w, elevDeg: h.elevDeg, src: f.id })));
export function poolLevel(x, z) {
let s = 0;
for (let i = 0; i < KEY_POOLS.length; i++) {
const p = KEY_POOLS[i], dx = x - p.aim[0], dz = z - p.aim[2];
const a = (dx * p.dir[0] + dz * p.dir[2]) / p.ra, c = (dx * p.dir[2] - dz * p.dir[0]) / p.rc;
s += p.w * Math.exp(-Math.pow(a * a + c * c, POOL_EDGE_POW));
}
return 1 - Math.exp(-LIGHT_PLAN.POOL_GAIN * s);
}
export function keyMask(x, z) {
const LP = LIGHT_PLAN, d = arenaWallDistance(x, z);
const t = d >= 0 ? 1 : Math.max(0, 1 + d / LP.POOL_MAP.MARGIN);
const floor = LP.OUTSIDE_FLOOR + (LP.KEY_FLOOR - LP.OUTSIDE_FLOOR) * t;
return floor + (1 - floor) * poolLevel(x, z) * (d >= 0 ? 1 : t);
}
export function poolDir(x, z, out) {
let sx = 0, sz = 0, se = 0, sw = 0;
for (let i = 0; i < KEY_POOLS.length; i++) {
const p = KEY_POOLS[i], dx = x - p.aim[0], dz = z - p.aim[2];
const a = (dx * p.dir[0] + dz * p.dir[2]) / p.ra, c = (dx * p.dir[2] - dz * p.dir[0]) / p.rc;
const g = p.w * Math.exp(-Math.pow(a * a + c * c, POOL_EDGE_POW));
sx += g * p.dir[0]; sz += g * p.dir[2]; se += g * Math.sin(p.elevDeg * D2R); sw += g;
}
const l = Math.hypot(sx, sz);
if (l > 1e-9) { out[0] = sx / l; out[1] = sz / l; } else { out[0] = 0; out[1] = -1; }
out[2] = sw > 1e-9 ? se / sw : 0.5; out[3] = sw;
return out;
}
export const FILL_LIGHTS = [
{ id: 'lineupFill', from: [36, 21, -40], to: [0, 1.6, 50], E: 1.3, angle: 0.15, penumbra: 0.5, minQuality: 'low' },
{ id: 'rampFaceFill', from: [0, 21, 386], to: [fromRampLocal(5)[0], 14, fromRampLocal(5)[2]]  , E: 1.6, angle: 0.03, penumbra: 0.4, minQuality: 'low', color: '#dfe8ff', state: 'run' },
{ id: 'rampRedL', from: [fromRampLocal(-5, -3.1)[0], 0.6, fromRampLocal(-5, -3.1)[2]], to: [fromRampLocal(7.5, 0)[0], 8, fromRampLocal(7.5, 0)[2]]  , E: 3.6, angle: 0.4, penumbra: 1.0, minQuality: 'low', color: '#ff2414', state: 'rest' },
{ id: 'rampRedR', from: [fromRampLocal(-5, 3.1)[0], 0.6, fromRampLocal(-5, 3.1)[2]], to: [fromRampLocal(7.5, 0)[0], 8, fromRampLocal(7.5, 0)[2]]  , E: 3.6, angle: 0.4, penumbra: 1.0, minQuality: 'medium', color: '#ff2414', state: 'rest' },
{ id: 'lineupTop', from: [(DECK.X0 + DECK.X1) / 2 + 5, 26, (DECK.Z0 + DECK.Z1) / 2], to: [(DECK.X0 + DECK.X1) / 2, DECK.H, (DECK.Z0 + DECK.Z1) / 2], E: 8, angle: 0.36, penumbra: 0.7, minQuality: 'medium', color: '#f2f5ff' },
];
export const LIGHT_PLAN = {
KEY_INTENSITY: 7.4,
KEY_COLOR: '#dfe8ff',
KEY_DIR: { mode: 'dominant', TAU: 1.5, ELEV_DEG: [50, 72], FALLBACK: [-0.22, -1.0, -0.42] },
KEY_FLOOR: 0.05,
OUTSIDE_FLOOR: 0.015,
KEY_SHADOW: 0.75,
POOL_GAIN: 3.3,
POOL: { ELONG_MAX: POOL_ELONG_MAX, EDGE_POW: POOL_EDGE_POW },
POOL_MAP: { RES: { low: 256, medium: 256, high: 512, ultra: 512 }, MARGIN: 24, FORMAT: 'RGBA8 (R mask, GB dominant dir, A sin elev); clamp-to-edge + OUTSIDE_FLOOR edge ring' },
EXPOSURE: 1.12,
STUNT_HOUSE: { KEY: 0.95, FILL: 0.95, HEMI: 1.0, FOLLOW: 0.2, HAZE: 0.75, ENV: 0.85, BEAM: 0.55, SKY: 0.9, HEAD: 0.7 },
MENU_KEY_MUL: 0.25,
ASPHALT: {
ALBEDO: 0.048,
TONE: 1.145,
WARM: [1.03, 1.0, 0.96],
DETAIL: { base: 52, broad: 10, mid: 5, stoneA: 8, stoneB: 4, pit: 5, speck: 5 },
STONE_ROUGH: -0.06,
TILE_M: 5,
MIDSCALE: { patches: 40, patchTone: [0.9, 1.1], sealant: { w: 0.08, len: [6, 20], tone: 0.45 }, tyreMarks: ['FREESTYLE', 'LANE', 'LANDING', 'RAMP_RUNUP'] },
},
GRAVEL: { ALBEDO: 0.2, COLOR: '#d8cfbe', ROUGHNESS: 0.95, EDGE_LINE: 0.3, FILL: 0.12, ZONES: ['ARRESTOR', 'RAMP_BAY', 'SPRINT_TRAP', 'GAP_RUNOFF'] },
WET: { DAMP: 0.6, WET_ALL: [0.3, 0.45], STREAK_GAIN: 1.0, STREAK_CAP: 2.0, LEN_H: 0.4, REFL_FADE_H: 1.1, PUDDLE: { noiseM: [9.0, 4.5], weights: [0.55, 0.30, 0.15], edge: [0.60, 0.75], rough: 0.12 } },
HEMI: { sky: '#2c3854', ground: '#1a1714', intensity: 0.35 },
MOON: { dir: SKY.MOON_DIR, light: true, color: '#c8d4ec', intensity: 0.2, castShadow: false },
ENV_DIFFUSE: 0.12,
FOLLOW_SPOT: { E: 8.5, POOL_R: 3.2, PENUMBRA: 0.6, SHADOW: 0.8, TOTAL_RATIO: 1.8 },
FEATURED_SPOT: { E: 4.2, POOL_R: 5.2, TOTAL_RATIO: 1.6 },
SEARCHLIGHTS: {
STAGE: { LEAN_DEG: 15, LEAN_S: 24, RIPPLE_DEG: 8, RIPPLE_S: 10, RIPPLE_PHASE: 0.42, NOD_DEG: 6, NOD_S: 17, TINT: [0.204, 0.358, 0.438] },
RAMP_FANS: { SCISSOR_DEG: 32, SCISSOR_S: 8.5, SWAY_DEG: 8, SWAY_S: 13, NOD_DEG: 12, NOD_S: 5.7, GAIN: 0.75,
SHAPE: { LEN_M: 11, R1_MUL: 0.3, R0_M: 0.07, CORE: 4.5, SPREAD_DEG: 30, OUT_DEG: 4, LEAN_S_MUL: 1.6, PHASE_B: 0.5, EXTRA: [1, 4], EXTRA_DEG: -34 } },
LIGHT_ROW: { PAN_DEG: 18, PAN_S: 18, RIPPLE_DEG: 5, RIPPLE_S: 7, NOD_DEG: 7, NOD_S: 13 },
},
HEADLIGHT: { E: 1.6, NEAR: [9, 20], FAR: [35, 60], W0: 0.9, SPREAD: 0.22, COLOR: '#dbe6ff', REMOTE_MAX: 4, H_FADE: [4, 1], UP_FADE: [0.5, 0.8], PITCH_FADE: [0.3, 0.6] },
HAZE: { DENSITY: 0.0030, FALLOFF: 0.07, LIT_FROM_POOL_MAP: true, LIT_POW: 2, BASE: [0.004, 0.0045, 0.006], STAGE_DENSITY_MUL: 4, RAMP_DENSITY_MUL: 2 },
TOWER: { LAMP_FACE_HDR: 6.0  ,
HALO_SPRITE_M: 9.5, HALO_LEVEL: 0.34, PANEL: [0.5, 0.45], GRID: { 4: [2, 2], 6: [3, 2], 8: [4, 2], 12: [4, 3] }, FRAME_MARGIN: 0.08, FRAME_DEPTH: 0.5, MAST_SECTION_M: 0.45 },
SKY: { ZENITH_SRGB: [3, 6], HORIZON_SRGB: [12, 20], DUSK_GLOW: { dir: SKY.DUSK_DIR, srgb: [35, 55], hex: '#4B3835', halfWidthDeg: 50 }, SITE_LIGHTS: 24 },
TARGETS_SRGB: {
POOL_CENTRE: [65, 85], BETWEEN_POOLS: [10, 20], WORST_MIN: 6, POOL_TO_GAP_MIN: 2.0,
FOLLOW_SPOT_ON_POOL: [80, 95], FOLLOW_SPOT_IN_GAP: [70, 90], HEADLIGHT_20M_MIN_RATIO: 1.5,
STREAK_OVER_FLOOR_MIN: 25, PUDDLE_P95_DELTA_MAX: 18, PAINT_MIN: 60,
GRAVEL_MAX: 115,
CAR_REAR_GAP_30_60M_MIN: 60,
LINEUP_FLANK_FROM_LANE_MIN: 70,
KRAIL_30M_MIN: 35, WINDSCREEN_30M: [12, 28],
SKY_ZENITH: [3, 6], HORIZON_BAND: [12, 20], HORIZON_GLOW_LOBE: [35, 55], OUTSIDE_30M_MAX: 14, OUTSIDE_100M_MAX: 9,
},
MASK_TO_SRGB: [[0.05, 12.5], [0.14, 33.0], [0.19, 41.6], [0.25, 50.3], [0.35, 62.1], [0.5, 76.0], [0.7, 90.1], [0.9, 101.2], [1.0, 105.9]],
MASK_TO_SRGB_STATUS: 'predicted (model fitted to the v5 renderer grid + Lambert fills); not measured at these values',
};
for (const s of PERIM) {
const mx = (s.a[0] + s.b[0]) / 2, mz = (s.a[1] + s.b[1]) / 2;
let best = null, bv = 0;
for (const f of FLOODLIGHTS) for (const h of f.heads) {
const lx = f.pos[0] - mx, ly = f.height - 1.5, lz = f.pos[2] - mz, d = Math.hypot(lx, ly, lz);
const nl = (s.inward[0] * lx + s.inward[2] * lz) / d;
const v = nl > 0 ? h.w * h.panels * nl / (d * d) : 0;
if (v > bv) { bv = v; best = { id: f.id, from: [f.pos[0], f.height, f.pos[2]], nl: r2(nl), dist: r2(d) }; }
}
s.rim = best;
}
export const CROSS_LINES = [
[[0, APPROACH.Z0 - 7], [0, ZONES.ARRESTOR.z0 - 2]],
[[alongR(-140)[0], alongR(-140)[2]], [alongR(RAMP_D - 8.5 * Math.cos(RAMP_TURN))[0], alongR(RAMP_D - 8.5 * Math.cos(RAMP_TURN))[2]]],
];
export const POWERLINE = {
Z: -330, X0: -950, X1: 950, SPACING: 55, POLE_H: 12,
LINES: [
{ a: [-125, 0, -230], b: [-125, 0, 340], spacing: 55, poleH: 11.5, wires: 3 },
{ a: [-950, 0, -330], b: [950, 0, -330], spacing: 55, poleH: 12, wires: 3 },
],
};
export const RUNWAY = { ENABLED: false, BACKGROUND: true, Z: -360, HALF_WIDTH: 22.5, HALF_LENGTH: 900, EDGE_LIGHT_SPACING: 120, EDGE_LIGHT_HDR: 1.5 };
export const APRON = { RADIUS: Math.ceil(Math.max(...PERIM.map((s) => Math.hypot(s.a[0], s.a[1])))) + 2, POLY: ARENA.POLY };
const BACKSTAGE_KINDS = {
trucks: { depth: 9, parts: '2 × 53\' box trailers 16.2 × 2.6 × 4.1 #c9ccd0 (side by side, 3.5 m apart) + one tractor 6.8 × 2.6 × 3.6 #2b2e33; marker lamps amber HDR 3' },
containers: { depth: 7, parts: '3 × 40\' containers 12.2 × 2.44 × 2.59, #5d7a8f / #8a3b2a / #5d7a8f, two stacked + one beside; corrugated normal' },
generator: { depth: 7, parts: 'generator set 4.4 × 2.4 × 2.5 #c9b26a + fuel cube 1.2 m + cable ramps; exhaust stack 0.2 × 1.2 m' },
tents: { depth: 11, parts: '2 pop-up tents 6 × 6 × 3.2 m, white roof #e8e8e4, black sides half-open, 2 folding tables + road cases inside, warm LED string HDR 2' },
obvan: { depth: 9, parts: 'outside-broadcast van 13 × 2.6 × 4.0 #e9eaec with a 2.4 m dish and side awning; status lamps green/red HDR 3' },
cases: { depth: 6, parts: 'road-case stacks 4 × 5 m footprint, 1.8 m high, black #18191b with alu edges #b9bcc0; 2 forklift pallets' },
};
function _backstage() {
const out = [];
for (const s of PERIM) {
const L = s.length, dx = (s.b[0] - s.a[0]) / L, dz = (s.b[1] - s.a[1]) / L;
const ox = -s.inward[0], oz = -s.inward[2];
for (const g of [...s.gaps.map((x) => ({ ...x, gap: true })), ...s.dressing.map((x) => ({ ...x, gap: false }))]) {
const cx = s.a[0] + dx * g.at, cz = s.a[1] + dz * g.at;
const depth = (BACKSTAGE_KINDS[g.show] || { depth: 7 }).depth;
const wl = [r2(cx + ox * 2.5 + dx * (g.w / 2 + 1.5)), 4.5, r2(cz + oz * 2.5 + dz * (g.w / 2 + 1.5))];
out.push({ kind: g.show, seg: s.id, gap: g.gap, pos: [r2(cx + ox * depth), 0, r2(cz + oz * depth)], yaw: r2(Math.atan2(dx, dz)), at: [r2(cx), 0, r2(cz)], w: g.w,
workLight: { pos: wl, aim: [r2(cx + ox * depth), 1.5, r2(cz + oz * depth)], E: 1.2 } });
}
}
return out;
}
export const PROPS = {
SMOKE_CANNONS: [[124, 0, -80], [124, 0, -100], fromRampLocal(8, -36), fromRampLocal(-52, -36)],
CAMERA_CRANE: fromRampLocal(-58, -31.5),
CAMERA_CRANE_AIM: [fromRampLocal(-22)[0], 3, fromRampLocal(-22)[2]],
PAR_CARTS: [],
BEAM_FANS: [fromRampLocal(-3.5, 5.6), fromRampLocal(-3.5, -5.6)],
BEAM_FAN_STAND: { half: [0.6, 0.8, 0.6] },
GROUND_LAMPS: { from: fromRampLocal(-12, -3.5), to: fromRampLocal(-12, 3.5), count: 5, flush: true },
SPRINT: {
PORTAL: { z: 110, x0: 76, x1: 88, clearH: 5.5, headerH: 1.5, towerW: 1.6, depth: 1.8, ledHdr: 5, timer: true },
RED_TUBES: { xs: [64.5, 99.5], z0: 118, z1: 152, spacing: 3.4, h: 4.2  , hdr: 5 },
PAR_RACKS: [{ pos: [64.5, 0, 104], yaw: 0, len: 6 }, { pos: [99.5, 0, 104], yaw: 0, len: 6 }],
CRANE: [49, 0, -1],
CRANE_POST: { half: [0.3, 1.45, 0.3] },
CRANE_DOLLY: { half: [0.75, 0.28, 1.2] },
},
DRESSING: [
{ kind: 'lightcart', pos: [154.5, 0, 40], yaw: 0, half: [0.9, 1.4, 1.8] },
{ kind: 'cableRamp', pos: [0, 0, -118], yaw: Math.PI / 2, flush: true },
],
BACKSTAGE_KINDS,
BACKSTAGE: _backstage(),
};
export const LAUNCH = {
BOX: { x: 82, z: 96.4, yaw: 0, halfW: 2.8, z0: 93.0, z1: 99.0 },
APPROACH: { halfW: 7, z0: 78, z1: 101, maxYawDeg: 40 },
STAGE: { maxSpeed: 0.6, holdS: 0.25, leaveSpeed: 1.6, maxYawDeg: 15, tolX: 2.6, tolZ: [-3.5, 2.0], minWheels: 3, assistSpeed: 3.0,
creep: { maxV: 1.5, decel: 1.6, doneZ: 0.2, maxS: 3.5 } },
LEAD: { z0: 40, halfW: 7, maxYawDeg: 40, decel: 4.0 },
MIN_AIR: 30,
ARM: { throttle: 0.6, release: 0.3, holdS: 0.3, graceS: 1.6, steerOut: 0.6 },
COUNT: { leadS: 0.5, steps: 3, stepS: 0.7, lastMin: 0.5, lastMax: 1.2 },
TARGET_S: 0.997, KP: 2,
REACT: { perfect: 0.20, great: 0.28, good: 0.40, curve: [[0.12, 0.90], [0.20, 0.918], [0.28, 0.945], [0.40, 0.969], [0.46, 0.997], [0.80, 1.15]],
max: 1.2, timeoutS: 1.5 },
FILM_S: 1.00,
OVERRUN_S: 0.15, RUN_TIMEOUT_S: 2.0, STEER_MUL: 0.25, AIR_VOID_S: 0.25,
CORRIDOR: { x0: 72, x1: 92, z0: 90, z1: 150 },
RESULT_S: 4.0, ABORT_S: 1.0, VOID_S: 1.2, RETRY_S: 4.0,
STORE_KEY: 'launchBest',
};
export const SPAWN = {
SLOTS: 32,
SPACING: 8,
FREE_RADIUS: 6,
CORRIDOR_M: 40, CORRIDOR_HALF: 3,
CLEAR_AHEAD_M: 150,
GRIDS: [
{ center: [122, 0, 6], yaw: 0, cols: 4, rows: 4 },
{ center: [122, 0, -26], yaw: 0, cols: 4, rows: 4 },
],
};
export function spawnPoint(i) {
const n = SPAWN.SLOTS;
const k = (((Math.floor(Number(i)) || 0) % n) + n) % n;
const g = SPAWN.GRIDS[k < 16 ? 0 : 1], j = k % 16;
const col = j % g.cols, row = Math.floor(j / g.cols);
const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw), lx = Math.cos(g.yaw), lz = -Math.sin(g.yaw);
const a = (col - (g.cols - 1) / 2) * SPAWN.SPACING, b = ((g.rows - 1) / 2 - row) * SPAWN.SPACING;
return { pos: [g.center[0] + lx * a + fx * b, CAR.REST_HEIGHT + 0.05, g.center[2] + lz * a + fz * b], yaw: g.yaw };
}
export const resetPoint = (_team, i = 0) => spawnPoint(i);
const _SR = fromRampLocal(10);
function _showSlot(x, z) {
const L = Math.hypot(x - _SR[0], z - _SR[2]), ux = (x - _SR[0]) / L, uz = (z - _SR[2]) / L;
const lx = -uz, lz = ux;
const cam = [r2(x + ux * 11), 1.0, r2(z + uz * 11)];
return {
pos: [x, CAR.REST_HEIGHT + 0.05, z], yaw: 0,
cam: { pos: cam, target: [x, 0.75, z], fovDeg: 30 },
spot: { from: [r2(x + ux * 9 + lx * 6), 11, r2(z + uz * 9 + lz * 6)], aim: [r2(x + ux * 3), 0, r2(z + uz * 3)], E: 5.6, poolR: 6.5, penumbra: 0.25 },
};
}
function _laneSlot(x, z, azDeg, d, sweep, swoopHalfW) {
const a = azDeg * Math.PI / 180, ux = Math.sin(a), uz = Math.cos(a);
const lx = -uz, lz = ux;
return {
pos: [x, CAR.REST_HEIGHT + 0.05, z], yaw: 0, lane: true,
cam: { pos: [r2(x + ux * d), 1.0, r2(z + uz * d)], target: [x, 0.75, z], fovDeg: 30, sweep, swoopHalfW },
spot: { from: [r2(x + ux * 9 + lx * 6), 11, r2(z + uz * 9 + lz * 6)], aim: [r2(x + ux * 3), 0, r2(z + uz * 3)], E: 5.6, poolR: 6.5, penumbra: 0.25 },
};
}
const _LANE_SLOTS = [
_laneSlot(0, -89.8, 30.5, 11, 0.22, 5.4),
_laneSlot(-4.4, -102.5, 72.5, 10, 0.22),
_laneSlot(4.4, -102.5, 72.5, 10, 0.22),
];
const _SLOTS = [..._LANE_SLOTS, ...[70, 78, 86, 94].map((x) => _showSlot(x, 14))];
export const SHOWCASE = {
SLOTS: _SLOTS,
LANE_SLOTS: _LANE_SLOTS.length,
pos: _SLOTS[0].pos, yaw: 0, cam: _SLOTS[0].cam, spot: _SLOTS[0].spot,
rampState: 'rest',
CLEAR_AHEAD_M: 150,
HANDOVER_WAIT_S: 3,
INTRO_CAM: { distance: 30, height: 1.6, lookAhead: 10, lookHeight: 0.9, fovBase: 18, lensShift: 0, holdUntil: 4.1, releaseS: 1.4 },
START_CAM: { DUR: 3.2, TUBES_AT: 0.36 },
};
const _xz = (p) => [p[0], p[2]];
export const BOT_SPOTS = {
LANE_QUEUE: [0, 0, APPROACH.Z0 - 14],
LANE_QUEUE_SLOTS: [[-4, 0, APPROACH.Z0 - 14], [0, 0, APPROACH.Z0 - 14], [4, 0, APPROACH.Z0 - 14]],
RAMP_QUEUE: fromRampLocal(-50, -17.5),
RAMP_QUEUE_SLOTS: [fromRampLocal(-50, -17.5), fromRampLocal(-57, -17.5), fromRampLocal(-64, -17.5)],
RAMP_QUEUE_YAW: r2(YAW_RAMP),
RAMP_RUNUP_START: fromRampLocal(-44, 0),
RAMP_RUNUP_YAW: r2(YAW_RAMP),
RAMP_EXIT: [fromRampLocal(-88, -8), fromRampLocal(-84, -20.8), fromRampLocal(-76, -20.8), fromRampLocal(-72, -17.5)],
RAMP_EXIT_YAW: r2(YAW_RAMP_OUT),
TRANSFER: [[62, -30], [36, -80], [22, -124], [-20, -124], [-20, -70], [-44, -78], [-44, -22], [-48, 24], _xz(fromRampLocal(-90, 0)), _xz(fromRampLocal(-84, -20.8)), _xz(fromRampLocal(-67, -20.8)), _xz(fromRampLocal(-44, -20.8))],
TRANSFER_WAIT: 6,
TRANSFER_BACK: [_xz(fromRampLocal(-42, -20.8)), _xz(fromRampLocal(-36, 12)), [-59, -45], [-56, -72], [-48, -95], [-36, -118], [-30, -131], [60, -131], [94, -124], [100, -96], [106, -56]],
TRANSFER_BACK_WAIT: 0,
LANE_JOIN: [[14, -108]],
KICKFLIP_RETURN: ZONES.RETURN.path,
DONUT: [[48, -78], [72, -78], [48, -102], [72, -102], [60, -90]],
ROAM_NODES: [[62, -30], [36, -80], [24, -100], [40, -131], [60, -131], [94, -124], [100, -96], [106, -56]],
ROAM_EDGES: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]],
ROAM_LOOP: [0, 1, 2, 3, 4, 5, 6, 7],
CROWD_PASS: [[104, -104], [104, -66], [108, -50], [138, -50]],
};
BOT_SPOTS.ROAM = BOT_SPOTS.ROAM_NODES;
const yawOfDir = (dx, dz) => Math.atan2(dx, dz);
export function buildColliders() {
const C = [];
C.push({ type: 'extrude', tag: 'ramp', origin: RAMP.ORIGIN, axisS: RAMP.AXIS_S, axisW: RAMP.AXIS_W,
halfWidth: RAMP.HALF_WIDTH, profile: rampProfile(), thickness: RAMP.THICKNESS });
const rYaw = yawOfDir(RAMP.AXIS_S[0], RAMP.AXIS_S[2]);
{
const FB = RAMP.FOOT_BEVEL, R = RAMP.R1, yAt = (x) => R - Math.sqrt(Math.max(0, R * R - x * x));
for (let a = 0; a < FB.s1 - 1e-6; a += FB.step) {
const b = Math.min(FB.s1, a + FB.step), h = yAt((a + b) / 2);
if (h < 0.03) continue;
for (const sd of [-1, 1]) {
const o = fromRampLocal((a + b) / 2, sd * RAMP.HALF_WIDTH);
C.push({ type: 'extrude', tag: 'ramp', origin: [o[0], 0, o[2]], axisS: [RAMP.AXIS_W[0] * sd, 0, RAMP.AXIS_W[2] * sd], axisW: RAMP.AXIS_S,
halfWidth: r4((b - a) / 2), profile: [[0, r4(h)], [r4(h), 0]], thickness: r4(Math.max(0.12, h * 0.7)), rampBevel: true });
}
}
}
{
const T = RAMP.TRUSS, c = fromRampLocal((T.s0 + T.s1) / 2);
C.push({ type: 'box', tag: 'truss', center: [c[0], T.height / 2, c[2]], half: [T.halfWidth, T.height / 2, (T.s1 - T.s0) / 2], yaw: rYaw });
const G = RAMP.GANTRY, g = fromRampLocal((G.s0 + G.s1) / 2);
C.push({ type: 'box', tag: 'truss', center: [g[0], (G.y0 + G.y1) / 2, g[2]], half: [G.halfWidth, (G.y1 - G.y0) / 2, (G.s1 - G.s0) / 2], yaw: rYaw });
for (const s of [T.s0 + 0.2, T.s1 - 0.2]) for (const sd of [-1, 1]) {
const p = fromRampLocal(s, sd * (T.halfWidth - 0.2));
C.push({ type: 'box', tag: 'truss', center: [p[0], 0.15, p[2]], half: [0.45, 0.15, 0.45], yaw: rYaw, footing: true });
}
const UF = RAMP.UNDER_FILL, hw = RAMP.HALF_WIDTH;
for (const [s0, y] of UF.steps) {
const p = fromRampLocal((s0 + UF.s1) / 2);
C.push({ type: 'box', tag: 'ramp', center: [p[0], y / 2, p[2]], half: [hw, y / 2, (UF.s1 - s0) / 2], yaw: rYaw, underFill: true });
}
{
const CT = RAMP.CURL_TOP_FILL, back = rampProfileOffset(-(RAMP.THICKNESS + CT.rGap), 24, 8, 56, 16);
const backMax = (a, b) => {
let m = -Infinity;
for (let i = 1; i < back.length; i++) {
const [s0, y0] = back[i - 1], [s1, y1] = back[i];
if (y0 < RAMP.R1 && y1 < RAMP.R1) continue;
const lo = Math.max(a, Math.min(s0, s1)), hi = Math.min(b, Math.max(s0, s1));
if (lo > hi) continue;
const yAt = (x) => (Math.abs(s1 - s0) < 1e-9 ? Math.max(y0, y1) : y0 + (y1 - y0) * (x - s0) / (s1 - s0));
m = Math.max(m, yAt(lo), yAt(hi));
}
return m;
};
for (const [a, b] of CT.steps) {
const yb = backMax(a, b), yt = G.y0;
if (!Number.isFinite(yb)) continue;
if (!(yt > yb + 0.05)) continue;
const p = fromRampLocal((a + b) / 2);
C.push({ type: 'box', tag: 'truss', center: [p[0], r4((yb + yt) / 2), p[2]], half: [G.halfWidth, r4((yt - yb) / 2), r4((b - a) / 2)], yaw: rYaw, curlTop: true });
}
}
const CU = RAMP.CURTAINS;
if (CU.collider) for (const sd of [-1, 1]) {
const [w0, w1] = (CU.side && CU.side[sd]) || [CU.w0, CU.w1];
const p = fromRampLocal(CU.s, sd * (w0 + w1) / 2), h = CU.height + 0.05;
C.push({ type: 'box', tag: 'curtain', center: [p[0], h / 2, p[2]], half: [r4((w1 - w0) / 2), h / 2, r4(CU.thick / 2 + CU.pleat)], yaw: rYaw, noSuction: true, curtain: true });
}
{
const PL = RAMP.PLINTHS, L = PL.s1 - PL.s0, Wd = PL.w1 - PL.w0, h = PL.h;
for (const sd of [-1, 1]) {
const wm = sd * (PL.w0 + PL.w1) / 2, o = fromRampLocal(PL.s0, wm);
C.push({ type: 'extrude', tag: 'prop', origin: [o[0], 0, o[2]], axisS: RAMP.AXIS_S, axisW: RAMP.AXIS_W, halfWidth: r4(Wd / 2 - h),
profile: [[0, 0], [h, h], [L - h, h], [L, 0]], thickness: h, plinth: true });
const o2 = fromRampLocal((PL.s0 + PL.s1) / 2, sd * PL.w0);
C.push({ type: 'extrude', tag: 'prop', origin: [o2[0], 0, o2[2]], axisS: [RAMP.AXIS_W[0] * sd, 0, RAMP.AXIS_W[2] * sd], axisW: RAMP.AXIS_S, halfWidth: r4(L / 2 - h),
profile: [[0, 0], [h, h], [Wd - h, h], [Wd, 0]], thickness: h, plinth: true });
}
}
const F = PROPS.BEAM_FAN_STAND.half;
for (const p of PROPS.BEAM_FANS) C.push({ type: 'box', tag: 'prop', center: [p[0], F[1], p[2]], half: F, yaw: rYaw });
}
C.push({ type: 'extrude', tag: 'kicker', origin: KICKER.ORIGIN, axisS: KICKER.AXIS_S, axisW: KICKER.AXIS_W,
halfWidth: KICKER.HALF_WIDTH, profile: KICKER.PROFILE, thickness: KICKER.THICKNESS });
{
const L = DECK.Z1 - DECK.Z0, b = DECK.BEVEL;
C.push({ type: 'extrude', tag: 'deck', origin: [0, 0, DECK.Z0], axisS: [0, 0, 1], axisW: [1, 0, 0],
halfWidth: (DECK.X1 - DECK.X0) / 2, profile: [[0, 0], [b, DECK.H], [L - b, DECK.H], [L, 0]], thickness: DECK.H });
}
for (const v of LINEUP.VEHICLES) {
const hw = LINEUP.HALF[v.model][0], fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
for (const [z0, z1, top] of LINEUP.BOXES[v.model]) {
const oz = (z0 + z1) / 2;
C.push({ type: 'box', tag: 'vehicle:' + v.model, center: [r4(v.x + fx * oz), DECK.H + top / 2, r4(v.z + fz * oz)], half: [hw, top / 2, (z1 - z0) / 2], yaw: v.yaw });
}
}
{
const a = APPROACH;
const FX = RUNWAY_START.FIXTURES.X, sp = a.LIGHT_SPACING, nK = Math.round((a.Z1 - a.Z0) / sp) + 1;
for (const s of [-1, 1]) {
for (const [z0, z1] of approachRailSegs()) {
C.push({ type: 'box', tag: 'rail', center: [s * a.X_HALF, a.RAIL_H / 2, r4((z0 + z1) / 2)], half: [0.25, a.RAIL_H / 2, r4((z1 - z0) / 2)], yaw: 0 });
for (const e of [-1, 1]) C.push({ type: 'box', tag: 'rail', center: [r4(s * (a.X_HALF + 0.12)), a.RAIL_H / 2, r4(e < 0 ? z0 - 0.9 : z1 + 0.9)], half: [0.1, a.RAIL_H / 2, 0.9], yaw: e * s * 0.28, terminal: true });
}
for (let k = 0, z = a.Z0; z <= a.Z1 + 1e-6; k++, z = a.Z0 + k * a.LIGHT_SPACING) {
if (approachInGap(z)) continue;
C.push({ type: 'box', tag: 'rail', center: [s * a.X_HALF, (a.RAIL_H + a.TUBE_H) / 2, z], half: [0.09, (a.TUBE_H - a.RAIL_H) / 2, 0.09], yaw: 0, post: true });
}
for (let k = 0; k + 1 < nK; k++) {
const z = a.Z0 + k * sp;
if (approachInGap(z) || approachInGap(z + sp)) continue;
const xi = a.X_HALF - 0.25, xo = FX + 0.23;
C.push({ type: 'box', tag: 'rail', center: [r4(s * (xi + xo) / 2), a.RAIL_H + 0.33, r4(z + sp / 2)], half: [r4((xo - xi) / 2), 0.33, 0.27], yaw: 0, fixture: true });
}
}
}
for (const p of PROPS.PAR_CARTS) if (p.collider) C.push({ type: 'box', tag: 'prop', center: [p.pos[0], 0.75, p.pos[2]], half: [0.8, 0.75, 0.6], yaw: p.yaw });
for (const f of FLOODLIGHTS) if (f.island) {
C.push({ type: 'box', tag: 'mast', center: [f.pos[0], 0.4, f.pos[2]], half: [1.2, 0.4, 1.2], yaw: 0, island: true });
C.push({ type: 'box', tag: 'mast', center: [f.pos[0], f.height / 2, f.pos[2]], half: [0.3, f.height / 2, 0.3], yaw: 0 });
const TW = LIGHT_PLAN.TOWER;
let mx = 0, mz = 0, span = -0.35, rows = 1;
for (const h of f.heads) {
const g = TW.GRID[h.panels] || [2, 2];
mx += h.dir[0]; mz += h.dir[2]; span += g[0] * TW.PANEL[0] + 2 * TW.FRAME_MARGIN + 0.35; rows = Math.max(rows, g[1]);
}
const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
const hy0 = f.height + 0.12, hy1 = f.height + 0.9 + rows * TW.PANEL[1] + 0.45;
C.push({ type: 'box', tag: 'mast', center: [r4(f.pos[0] + mx * 0.4), r4((hy0 + hy1) / 2), r4(f.pos[2] + mz * 0.4)],
half: [r4(span / 2 + 0.45), r4((hy1 - hy0) / 2), 0.85], yaw: r4(Math.atan2(-mx, -mz)), heads: true });
}
for (const w of INTERIOR_WALLS) {
const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], L = Math.hypot(dx, dz);
C.push({ type: 'box', tag: 'rail', center: [r4((w.a[0] + w.b[0]) / 2), w.h / 2, r4((w.a[1] + w.b[1]) / 2)], half: [0.3, w.h / 2, L / 2 + 0.3], yaw: yawOfDir(dx, dz), seg: w.id, catch: !!w.catch, catchSide: w.catchSide || null });
}
{
const SP = PROPS.SPRINT, Pt = SP.PORTAL, H = Pt.clearH + Pt.headerH;
for (const x of [Pt.x0 - Pt.towerW / 2, Pt.x1 + Pt.towerW / 2]) C.push({ type: 'box', tag: 'prop', center: [x, H / 2, Pt.z], half: [Pt.towerW / 2, H / 2, Pt.depth / 2], yaw: 0 });
C.push({ type: 'box', tag: 'prop', center: [(Pt.x0 + Pt.x1) / 2, Pt.clearH + Pt.headerH / 2, Pt.z], half: [(Pt.x1 - Pt.x0) / 2 + Pt.towerW, Pt.headerH / 2, Pt.depth / 2], yaw: 0, header: true });
for (const x of SP.RED_TUBES.xs) for (let z = SP.RED_TUBES.z0; z <= SP.RED_TUBES.z1 + 1e-6; z += SP.RED_TUBES.spacing) C.push({ type: 'box', tag: 'prop', center: [x, SP.RED_TUBES.h / 2, z], half: [0.09, SP.RED_TUBES.h / 2, 0.09], yaw: 0, post: true });
for (const r of SP.PAR_RACKS) C.push({ type: 'box', tag: 'prop', center: [r.pos[0], 0.9, r.pos[2]], half: [0.6, 0.9, r.len / 2], yaw: r.yaw });
for (const k of [SP.CRANE_POST.half, SP.CRANE_DOLLY.half]) C.push({ type: 'box', tag: 'prop', center: [SP.CRANE[0], k[1], SP.CRANE[2]], half: k, yaw: 0 });
for (const d of PROPS.DRESSING) if (!d.flush) C.push({ type: 'box', tag: 'prop', center: [d.pos[0], d.half[1], d.pos[2]], half: d.half, yaw: d.yaw });
}
for (const J of JUMPS) C.push(...jumpColliders(J));
const W = ARENA.WALL, T = W.THICKNESS;
for (let i = 0; i < PERIM.length; i++) {
const s = PERIM[i];
const dx = (s.b[0] - s.a[0]) / s.length, dz = (s.b[1] - s.a[1]) / s.length;
const e0 = s.convexStart ? T : 0, e1 = PERIM[(i + 1) % PERIM.length].convexStart ? T : 0;
const mid = s.length / 2 + (e1 - e0) / 2, half = s.length / 2 + (e0 + e1) / 2;
const cx = s.a[0] + dx * mid - s.inward[0] * T / 2, cz = s.a[1] + dz * mid - s.inward[2] * T / 2;
const yaw = Math.atan2(-dz, dx);
const flags = { perimeter: true, noSuction: true, kind: s.kind, seg: s.id, inward: s.inward, segA: s.a, segB: s.b };
C.push({ type: 'box', tag: 'wall', center: [cx, s.wallH / 2, cz], half: [half, s.wallH / 2, T / 2], yaw, ...flags });
C.push({ type: 'box', tag: 'skywall', center: [cx, (s.wallH + W.TOP) / 2, cz], half: [half, (W.TOP - s.wallH) / 2, T / 2], yaw, invisible: true, ...flags });
}
return C;
}
