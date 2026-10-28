import {
ARENA, LIGHT_PLAN, RAMP, KICKER, APPROACH, approachInGap, FLOODLIGHTS, ACCENT_LIGHTS, KEY_POOLS, fromRampLocal, LINEUP,
} from "@rl/js/config.js";
const M = LIGHT_PLAN.POOL_MAP.MARGIN;
const B = ARENA.BOUNDS;
export const GROUND_MAP = {
X0: B.MIN_X - M, X1: B.MAX_X + M, Z0: B.MIN_Z - M, Z1: B.MAX_Z + M,
};
GROUND_MAP.W = GROUND_MAP.X1 - GROUND_MAP.X0;
GROUND_MAP.H = GROUND_MAP.Z1 - GROUND_MAP.Z0;
GROUND_MAP.CX = (GROUND_MAP.X0 + GROUND_MAP.X1) / 2;
GROUND_MAP.CZ = (GROUND_MAP.Z0 + GROUND_MAP.Z1) / 2;
export const ARENA_CENTER = [(B.MIN_X + B.MAX_X) / 2, 0, (B.MIN_Z + B.MAX_Z) / 2];
export const ENV_INTENSITY = 0.3;
export const KEY_COLOR = LIGHT_PLAN.KEY_COLOR;
export const RED_UNIT = [1.0, 0.0103, 0.0044];
export const RED_LED_HDR = [2.6, 2.6 * RED_UNIT[1], 2.6 * RED_UNIT[2]];
export const RED_CORE = [1.0, 0.045, 0.03];
export const RAIL_LIGHT = {
Y0: APPROACH.RAIL_H + 0.05, Y1: APPROACH.TUBE_H, X: APPROACH.X_HALF, Z0: APPROACH.Z0, Z1: APPROACH.Z1, STEP: APPROACH.LIGHT_SPACING,
};
export function railLightZs() {
const zs = [];
for (let k = 0, z = APPROACH.Z0; z <= APPROACH.Z1 + 1e-6; k++, z = APPROACH.Z0 + k * APPROACH.LIGHT_SPACING) if (!approachInGap(z)) zs.push(z);
return zs;
}
export { RAMP_TOP_Y } from "@rl/js/config.js";
export const KICKER_LIP = (() => { const p = KICKER.PROFILE[KICKER.PROFILE.length - 1]; return { s: p[0], y: p[1] }; })();
export const RAMP_YAW = Math.atan2(RAMP.AXIS_S[0], RAMP.AXIS_S[2]);
export function rampWorld(s, w, y = 0) { const p = fromRampLocal(s, w); return [p[0], y, p[2]]; }
export const FOLLOW = {
HEIGHT: 34,
BACK: 0.45,
OFFSET_DIR: (() => { const v = [-1, 0.3]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l]; })(),
POOL_R: LIGHT_PLAN.FOLLOW_SPOT.POOL_R,
E: LIGHT_PLAN.FOLLOW_SPOT.E,
PENUMBRA: LIGHT_PLAN.FOLLOW_SPOT.PENUMBRA,
LAG: 9,
COLOR: 0xf4f6ff,
FEATURED_COLOR: 0xfff1de,
FEATURED_E: LIGHT_PLAN.FEATURED_SPOT.E,
FEATURED_R: LIGHT_PLAN.FEATURED_SPOT.POOL_R,
};
export const TOWER_HEADS = (() => {
const T = LIGHT_PLAN.TOWER, out = [];
for (const f of FLOODLIGHTS) {
const n = f.heads.length;
let mx = 0, mz = 0;
for (const h of f.heads) { mx += h.dir[0]; mz += h.dir[2]; }
const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
const bx = -mz, bz = mx;
const sizes = f.heads.map((h) => { const g = T.GRID[h.panels] || [2, 2]; return g[0] * T.PANEL[0] + 2 * T.FRAME_MARGIN; });
const total = sizes.reduce((a, b) => a + b, 0) + (n - 1) * 0.35;
let off = -total / 2;
for (let k = 0; k < n; k++) {
const h = f.heads[k], g = T.GRID[h.panels] || [2, 2];
const c = off + sizes[k] / 2; off += sizes[k] + 0.35;
const pos = [f.pos[0] + bx * c + mx * 0.55, f.height + 0.9 + (g[1] * T.PANEL[1]) / 2, f.pos[2] + bz * c + mz * 0.55];
const dx = h.aim[0] - pos[0], dy = (h.aim[1] || 0) - pos[1], dz = h.aim[2] - pos[2], l = Math.hypot(dx, dy, dz) || 1;
out.push({ mast: f.id, head: k, pos, aim: h.aim, dir: [dx / l, dy / l, dz / l], cols: g[0], rows: g[1],
w: g[0] * T.PANEL[0] + 2 * T.FRAME_MARGIN, h: g[1] * T.PANEL[1] + 2 * T.FRAME_MARGIN, beam: !!h.beam, weight: h.w, panels: h.panels });
}
}
return out;
})();
export const ACCENT_HEADS = ACCENT_LIGHTS.flatMap((f) => f.heads.map((h) => {
const pos = [f.pos[0], f.pos[1], f.pos[2]];
const dx = h.aim[0] - pos[0], dy = -pos[1], dz = h.aim[2] - pos[2], l = Math.hypot(dx, dy, dz) || 1;
return { mast: f.id, head: 0, pos, aim: h.aim, dir: [dx / l, dy / l, dz / l], weight: h.w, kind: f.kind };
}));
export const LINEUP_HEADLIGHT_POOLS = LINEUP.VEHICLES.map((v) => {
const H = LINEUP.HALF[v.model] || [1, 1, 2.3], cz = (LINEUP.CENTER_Z && LINEUP.CENTER_Z[v.model]) || 0;
const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), P = LINEUP.HEADLIGHT_POOL;
const nose = H[2] + cz;
return { x: v.x + fx * (nose + P.ahead), z: v.z + fz * (nose + P.ahead), fx, fz, half: H[0] * P.widthMul, len: P.len, semi: v.model === 'semi' };
});
export { KEY_POOLS };
