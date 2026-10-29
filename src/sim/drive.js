import { nearestIndex, HEART } from './course.js';
import { tyre } from './tyre.js';

export const DT = 1 / 120;
export const RIDE = HEART;
export const RAIL = 1.85;
const G = 9.81;
const TAU = Math.PI * 2;

export const TUNING = {
  mass: 2000,
  power: 1000e3,
  frontShare: 0.3,
  etaDrive: 0.92,
  torqueFront: 2400,
  torqueRear: 3950,
  rho: 1.2,
  cdA: 1.0,
  clA: 0.9,
  downFront: 0.42,
  rolling: 0.011,
  brakeFront: 2750,
  brakeRear: 1700,
  absSlip: 0.115,
  tcSlip: 0.12,
  tcFloor: 0.4,
  tcAngle: 0.2,
  coast: 140,
  thrustG: 1,
  burn: 4,
  valve: 0.01,
  fanG: 14,
  pitchRate: 3.8,
  yawRate: 2.4,
  rollRate: 4.6,
  attitude: [9, 6, 12],
  attitudeBurn: 0.05,
  hopDv: 9.2,
  hopGas: 0.11,
  hopCool: 0.6,
  liftG: 1.15,
  liftBurn: 0.4,
  reverseMax: 14,
  tractionG: 1.4,
  brakeG: 1.22,
  latG: 1.29,
};

const aeroK = () => (0.5 * TUNING.rho) / TUNING.mass;
export const accelAt = (v) => Math.min(TUNING.tractionG * G * (1 + aeroK() * TUNING.clA * v * v / G), (TUNING.power * TUNING.etaDrive) / (TUNING.mass * Math.max(v, 1))) - aeroK() * TUNING.cdA * v * v - TUNING.rolling * G;
export const brakeAt = (v) => TUNING.brakeG * G + aeroK() * TUNING.cdA * v * v;
export const latCap = (v) => TUNING.latG * G * (1 + (aeroK() * TUNING.clA * v * v) / G);
export function cornerSpeed(kappa, margin = 1) {
  const a0 = TUNING.latG * G * margin, k = TUNING.latG * margin * aeroK() * TUNING.clA;
  const room = Math.abs(kappa) - k;
  return room <= 1e-6 ? Infinity : Math.sqrt(a0 / room);
}


const CGO = [0, -0.15, -0.15];
const INERTIA = [3000, 3200, 750];
const WHEELS = [
  { r: -0.835, u: -0.253, f: 1.408, R: 0.347, front: true, k: 92e3, arb: 55e3, grip: 1 },
  { r: 0.835, u: -0.253, f: 1.408, R: 0.347, front: true, k: 92e3, arb: 55e3, grip: 1 },
  { r: -0.825, u: -0.236, f: -1.536, R: 0.364, front: false, k: 106e3, arb: 35e3, grip: 1.1 },
  { r: 0.825, u: -0.236, f: -1.536, R: 0.364, front: false, k: 106e3, arb: 35e3, grip: 1.1 },
];
const LS = 0.11, LD = 0.16, LB = 0.025;
const KB = 6e5, CB = 4200, CR = 6800, CS = 35e3;
const IW = 5.5;
const SIGMA = 0.4;
const HULL = [
  [-0.96, -0.2, 2.2], [0.96, -0.2, 2.2], [-0.96, -0.2, -2.2], [0.96, -0.2, -2.2], [-1, -0.05, 0], [1, -0.05, 0],
];

export const steerLimit = (v) => Math.min(0.55, (2.94 * latCap(v)) / Math.max(v * v, 1) + 0.045 * Math.min(1, 30 / Math.max(v, 1)) ** 0.3);
const WHEELBASE = 2.94;
const cl = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

export function steerTo(c, track, target, slope, kff) {
  const sp = c.speed, k = c.hint * 3;
  const eLat = c.lat - target;
  if (c.mode === 0) {
    const psi = Math.atan2(c.fx * track.R[k] + c.fy * track.R[k + 1] + c.fz * track.R[k + 2], c.fx * track.T[k] + c.fy * track.T[k + 1] + c.fz * track.T[k + 2]);
    return cl((-psi * 3) / TUNING.yawRate);
  }
  const vf = c.vx * track.T[k] + c.vy * track.T[k + 1] + c.vz * track.T[k + 2], vr = c.vx * track.R[k] + c.vy * track.R[k + 1] + c.vz * track.R[k + 2];
  if (c.fx * track.T[k] + c.fy * track.T[k + 1] + c.fz * track.T[k + 2] < 0 && vf < 3) {
    const wx = track.T[k] - 0.5 * eLat * track.R[k], wy = track.T[k + 1] - 0.5 * eLat * track.R[k + 1], wz = track.T[k + 2] - 0.5 * eLat * track.R[k + 2];
    return wx * c.rx + wy * c.ry + wz * c.rz >= 0 ? 1 : -1;
  }
  if (sp <= 2) return cl(-eLat * 0.2);
  const eHead = Math.atan2(vr, Math.max(vf, 1)) - Math.atan(slope);
  const kmax = (0.95 * latCap(sp)) / Math.max(sp * sp, 25);
  const yaw = -(c.ox * c.ux + c.oy * c.uy + c.oz * c.uz);
  const dmax = Math.atan(WHEELBASE * kmax) + 0.03;
  const dcmd = cl(Math.atan(WHEELBASE * cl(kff, -kmax, kmax)) - 0.45 * eHead - cl(Math.atan((0.5 * eLat) / Math.max(sp, 8)), -0.12, 0.12), -dmax, dmax);
  const delta = cl(dcmd + ((WHEELBASE / Math.max(sp, 8)) * 2.0) * (sp * (Math.tan(dcmd) / WHEELBASE) - yaw), -dmax, dmax);
  const beta = Math.atan2(c.slip, Math.max(Math.abs(c.vf), 3));
  return cl((delta + cl(1.5 * (beta - cl(beta, -0.1, 0.1)), -0.3, 0.3) * cl((sp - 15) / 10, 0, 1)) / steerLimit(sp));
}
const K_AIR = 1 - Math.exp(-12 * DT);

function createWheels() {
  return WHEELS.map((w) => ({
    om: 0, hint: 0, a: 0, x: 0, xp: 0, hit: false, fz: 0, kap: 0, road: false, kind: 'road',
    nx: 0, ny: 1, nz: 0, px: 0, py: 0, pz: 0, mu: 1, w,
  }));
}

export function createCar() {
  return {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    fx: 0, fy: 0, fz: 1, ux: 0, uy: 1, uz: 0, rx: -1, ry: 0, rz: 0,
    nx: 0, ny: 1, nz: 0,
    ox: 0, oy: 0, oz: 0,
    wp: 0, wy: 0, wr: 0,
    mode: 1, hint: 0, lat: 0,
    gas: 1, boosting: false, thr: 0, delta: 0, brk: 0, lifting: false, liftHeld: false, hopT: 0, hopped: false,
    air: 0, flip: 0, spin: 0, barrel: 0,
    speed: 0, vf: 0, slip: 0, throttle: 0, brake: 0, steer: 0, yawRate: 0,
    wrecked: false, load: 0, fan: 0, wallT: 0, tow: 0,
    wl: createWheels(),
    ev: [],
  };
}

export function placeCar(c, track, i, speed, lat = 0) {
  const k = i * 3;
  c.x = track.H[k] + track.R[k] * lat; c.y = track.H[k + 1] + track.R[k + 1] * lat; c.z = track.H[k + 2] + track.R[k + 2] * lat;
  c.fx = track.T[k]; c.fy = track.T[k + 1]; c.fz = track.T[k + 2];
  c.ux = track.U[k]; c.uy = track.U[k + 1]; c.uz = track.U[k + 2];
  c.rx = track.R[k]; c.ry = track.R[k + 1]; c.rz = track.R[k + 2];
  c.x -= c.ux * 0.02; c.y -= c.uy * 0.02; c.z -= c.uz * 0.02;
  c.nx = c.ux; c.ny = c.uy; c.nz = c.uz;
  c.vx = c.fx * speed; c.vy = c.fy * speed; c.vz = c.fz * speed;
  c.ox = c.oy = c.oz = 0;
  c.wp = c.wy = c.wr = 0;
  c.mode = 1; c.hint = i; c.lat = lat;
  c.air = 0; c.flip = c.spin = c.barrel = 0;
  c.speed = speed; c.vf = speed; c.slip = 0; c.delta = 0; c.brk = 0; c.thr = 0;
  c.wrecked = false; c.boosting = false; c.wallT = 0; c.lifting = false; c.hopT = 0; c.hopped = false;
  for (let k2 = 0; k2 < 4; k2++) {
    const w = c.wl[k2];
    w.om = speed / w.w.R; w.hint = i; w.a = 0; w.x = w.xp = 0; w.hit = false; w.fz = 0; w.kap = 0;
  }
}

const AIR_PAD = 40;
const WALL_HIT = 1, WALL_HARD = 5, WALL_DRAG = 4 * G, WALL_GRACE = 30, WALL_RAMP = 36, WALL_WRECK = 25;
const WALL_TOP = 1.16;
const TYRE_MU = 1, TYRE_WRECK = 45, TYRE_SPIN = 0.5;

export const GRIP = { road: 1, kerb: 1, paved: 0.9, grass: 0.55, gravel: 0.45, terrain: 0.58 };
export const DRAG = { road: 0, kerb: 0, paved: 0, grass: 0.15 * G, gravel: 0.6 * G, terrain: 0 };
const KERB_IN = 2.6, PAVED_IN = 0.9, KERB_CURV = 0.00455;
export const PAVED_OUT = 1.1;

export const wallAt = (track, i, side) => (side < 0 ? track.wallL[i] : track.wallR[i]);

function nearestRoad(track, x, y, z, hint) {
  const i = nearestIndex(track, x, y, z, hint, 10);
  const span = track.air?.[i];
  if (!span) return i;
  const { H, R } = track, k = i * 3;
  const lat = (x - H[k]) * R[k] + (y - H[k + 1]) * R[k + 1] + (z - H[k + 2]) * R[k + 2];
  if (Math.abs(lat) <= wallAt(track, i, Math.sign(lat)) + 0.4) return i;
  const { from, to } = track.airs[span - 1], len = (to - from + track.lap) % track.lap;
  return nearestIndex(track, x, y, z, (from + (len >> 1)) % track.lap, (len >> 1) + AIR_PAD);
}

const sf = { hit: false, i: 0, hs: 0, lat: 0, w: 0, nx: 0, ny: 1, nz: 0, rx: 0, ry: 0, rz: 1, road: true, kind: 'road', tyre: 0 };

function roadAt(track, x, y, z, hint, s) {
  const i = nearestRoad(track, x, y, z, hint);
  const { H, T, U, R, n, gap } = track;
  let k = i * 3;
  let d = (x - H[k]) * T[k] + (y - H[k + 1]) * T[k + 1] + (z - H[k + 2]) * T[k + 2];
  let j = d >= 0 ? i : i - 1;
  if (j < 0) j = track.closed ? track.lap - 1 : 0; else if (j > n - 2) j = n - 2;
  k = j * 3;
  const k2 = k + 3;
  d = (x - H[k]) * T[k] + (y - H[k + 1]) * T[k + 1] + (z - H[k + 2]) * T[k + 2];
  const seg = Math.hypot(H[k2] - H[k], H[k2 + 1] - H[k + 1], H[k2 + 2] - H[k + 2]);
  const t = Math.max(0, Math.min(1, d / seg));
  s.i = t < 0.5 ? j : track.closed ? (j + 1) % track.lap : j + 1;
  if (gap[j] && gap[j + 1]) { s.hit = false; return s; }
  const hx = H[k] + (H[k2] - H[k]) * t, hy = H[k + 1] + (H[k2 + 1] - H[k + 1]) * t, hz = H[k + 2] + (H[k2 + 2] - H[k + 2]) * t;
  let ux = U[k] + (U[k2] - U[k]) * t, uy = U[k + 1] + (U[k2 + 1] - U[k + 1]) * t, uz = U[k + 2] + (U[k2 + 2] - U[k + 2]) * t;
  const ul = Math.hypot(ux, uy, uz);
  ux /= ul; uy /= ul; uz /= ul;
  const rx = R[k] + (R[k2] - R[k]) * t, ry = R[k + 1] + (R[k2 + 1] - R[k + 1]) * t, rz = R[k + 2] + (R[k2 + 2] - R[k + 2]) * t;
  const dx = x - hx, dy = y - hy, dz = z - hz;
  s.lat = dx * rx + dy * ry + dz * rz;
  s.hs = dx * ux + dy * uy + dz * uz + HEART;
  s.nx = ux; s.ny = uy; s.nz = uz;
  s.rx = rx; s.ry = ry; s.rz = rz;
  s.w = wallAt(track, j, Math.sign(s.lat));
  s.hit = Math.abs(s.lat) <= s.w + 0.4 && s.hs > -2;
  s.road = true;
  const a = Math.abs(s.lat), edge = track.halfW[j], run = track.runoff;
  s.tyre = (s.lat < 0 ? run.tyreL : run.tyreR)[j];
  s.kind = a <= edge - PAVED_IN ? (a > edge - KERB_IN && Math.abs(track.curv[j]) > KERB_CURV ? 'kerb' : 'road')
    : a <= edge + PAVED_OUT ? 'paved' : (s.lat < 0 ? run.gravelL : run.gravelR)[j] ? 'gravel' : 'grass';
  return s;
}

function ground(height, x, y, z, s) {
  const h = height(x, z);
  const gx = height(x - 1, z) - height(x + 1, z), gz = height(x, z - 1) - height(x, z + 1);
  const l = Math.hypot(gx, 2, gz);
  s.nx = gx / l; s.ny = 2 / l; s.nz = gz / l;
  s.hs = (y - h) * s.ny;
  s.road = false;
  s.kind = 'terrain';
  s.hit = true;
  return s;
}

export function surface(world, x, y, z, hint, s = sf) {
  roadAt(world.track, x, y, z, hint, s);
  if (s.hit) return s;
  return ground(world.terrain.height, x, y, z, s);
}

export function contact(c, world) {
  const s = surface(world, c.x, c.y, c.z, c.hint);
  c.hint = s.i;
  return s;
}

function orthonormalize(c) {
  let l = Math.hypot(c.fx, c.fy, c.fz);
  c.fx /= l; c.fy /= l; c.fz /= l;
  const d = c.ux * c.fx + c.uy * c.fy + c.uz * c.fz;
  c.ux -= c.fx * d; c.uy -= c.fy * d; c.uz -= c.fz * d;
  l = Math.hypot(c.ux, c.uy, c.uz);
  c.ux /= l; c.uy /= l; c.uz /= l;
  c.rx = c.fy * c.uz - c.fz * c.uy; c.ry = c.fz * c.ux - c.fx * c.uz; c.rz = c.fx * c.uy - c.fy * c.ux;
}

function spinFrame(c, wx, wy, wz) {
  const a = DT;
  const fx = c.fx + (wy * c.fz - wz * c.fy) * a, fy = c.fy + (wz * c.fx - wx * c.fz) * a, fz = c.fz + (wx * c.fy - wy * c.fx) * a;
  const ux = c.ux + (wy * c.uz - wz * c.uy) * a, uy = c.uy + (wz * c.ux - wx * c.uz) * a, uz = c.uz + (wx * c.uy - wy * c.ux) * a;
  c.fx = fx; c.fy = fy; c.fz = fz; c.ux = ux; c.uy = uy; c.uz = uz;
  orthonormalize(c);
}

function upHint(c, track) {
  const ahead = track.closed ? (c.hint + Math.round(Math.hypot(c.vx, c.vz) * 0.9)) % track.lap : Math.min(track.n - 1, c.hint + Math.round(Math.hypot(c.vx, c.vz) * 0.9));
  const k = ahead * 3;
  return [track.U[k], track.U[k + 1], track.U[k + 2]];
}

const F = [0, 0, 0], TQ = [0, 0, 0];
const COM = [0, 0, 0];
const sw = [0, 1, 2, 3].map(() => ({ ...sf }));
const cg = [0, 0, 0];
const at = [0, 0, 0];
const tmp = [0, 0, 0];

function body(c, pr, pu, pf, out) {
  out[0] = c.rx * pr + c.ux * pu + c.fx * pf;
  out[1] = c.ry * pr + c.uy * pu + c.fy * pf;
  out[2] = c.rz * pr + c.uz * pu + c.fz * pf;
  return out;
}

function pushForce(fx, fy, fz, rx, ry, rz) {
  F[0] += fx; F[1] += fy; F[2] += fz;
  TQ[0] += ry * fz - rz * fy; TQ[1] += rz * fx - rx * fz; TQ[2] += rx * fy - ry * fx;
}

function pushAt(c, fx, fy, fz, pr, pu, pf) {
  body(c, pr, pu, pf, at);
  pushForce(fx, fy, fz, at[0] - cg[0], at[1] - cg[1], at[2] - cg[2]);
}

function invI(c, x, y, z, out) {
  const a = (x * c.rx + y * c.ry + z * c.rz) / INERTIA[0];
  const b = (x * c.ux + y * c.uy + z * c.uz) / INERTIA[1];
  const d = (x * c.fx + y * c.fy + z * c.fz) / INERTIA[2];
  out[0] = c.rx * a + c.ux * b + c.fx * d;
  out[1] = c.ry * a + c.uy * b + c.fy * d;
  out[2] = c.rz * a + c.uz * b + c.fz * d;
}

function impulse(c, rx, ry, rz, nx, ny, nz, e, mu) {
  const m = TUNING.mass;
  const vx = c.vx + c.oy * rz - c.oz * ry, vy = c.vy + c.oz * rx - c.ox * rz, vz = c.vz + c.ox * ry - c.oy * rx;
  const vn = vx * nx + vy * ny + vz * nz;
  if (vn >= 0) return 0;
  const cx = ry * nz - rz * ny, cy = rz * nx - rx * nz, cz = rx * ny - ry * nx;
  invI(c, cx, cy, cz, tmp);
  const j = (-(1 + e) * vn) / (1 / m + tmp[0] * cx + tmp[1] * cy + tmp[2] * cz);
  c.vx += (nx * j) / m; c.vy += (ny * j) / m; c.vz += (nz * j) / m;
  invI(c, cx * j, cy * j, cz * j, tmp);
  c.ox += tmp[0]; c.oy += tmp[1]; c.oz += tmp[2];
  let tx = vx - nx * vn, ty = vy - ny * vn, tz = vz - nz * vn;
  const tl = Math.hypot(tx, ty, tz);
  if (tl > 1e-4 && mu > 0) {
    tx /= tl; ty /= tl; tz /= tl;
    const jt = Math.min(mu * j, tl * m * 0.5);
    c.vx -= (tx * jt) / m; c.vy -= (ty * jt) / m; c.vz -= (tz * jt) / m;
    const qx = ry * tz - rz * ty, qy = rz * tx - rx * tz, qz = rx * ty - ry * tx;
    invI(c, -qx * jt, -qy * jt, -qz * jt, tmp);
    c.ox += tmp[0]; c.oy += tmp[1]; c.oz += tmp[2];
  }
  return -vn;
}

export function stepCar(c, inp, world, tick, assist) {
  const T = TUNING, m = T.mass;
  const { track } = world;
  c.throttle = inp.throttle; c.brake = inp.brake; c.steer = inp.steer;
  body(c, CGO[0], CGO[1], CGO[2], cg);
  COM[0] = c.x + cg[0]; COM[1] = c.y + cg[1]; COM[2] = c.z + cg[2];
  F[0] = F[1] = F[2] = 0; TQ[0] = TQ[1] = TQ[2] = 0;

  const vf0 = c.vx * c.fx + c.vy * c.fy + c.vz * c.fz;
  const speed0 = Math.hypot(c.vx, c.vy, c.vz);
  const beta0 = Math.atan2(c.slip, Math.max(Math.abs(vf0), 4));
  const lock = steerLimit(speed0) + (inp.steer * beta0 > 0 ? Math.max(0, Math.min(Math.abs(beta0) - 0.08, 0.3)) : 0);
  c.delta += Math.max(-3 * DT, Math.min(3 * DT, inp.steer * lock - c.delta));
  const cd = Math.cos(c.delta), sd = Math.sin(c.delta);

  let hits = 0, roadHits = 0, anx = 0, any = 0, anz = 0, sumFz = 0, dig = 0;
  const wl = c.wl;
  for (let k = 0; k < 4; k++) {
    const w = wl[k], P = w.w, s = sw[k];
    const mx = c.x + c.rx * P.r + c.ux * (P.u + LS) + c.fx * P.f;
    const my = c.y + c.ry * P.r + c.uy * (P.u + LS) + c.fy * P.f;
    const mz = c.z + c.rz * P.r + c.uz * (P.u + LS) + c.fz * P.f;
    surface(world, mx, my, mz, w.hint, s);
    w.hint = s.i;
    const d = s.hs / Math.max(0.3, c.ux * s.nx + c.uy * s.ny + c.uz * s.nz);
    w.hit = d < LD + P.R && d > -0.8;
    w.road = s.road;
    w.kind = s.kind;
    if (!w.hit) { w.fz = 0; w.xp = 0; w.x = 0; continue; }
    w.x = LD - (d - P.R);
    w.px = mx - c.ux * d; w.py = my - c.uy * d; w.pz = mz - c.uz * d;
    w.nx = s.nx; w.ny = s.ny; w.nz = s.nz;
    w.mu = GRIP[s.kind];
    hits++;
  }
  for (let k = 0; k < 4; k++) {
    const w = wl[k], P = w.w;
    if (!w.hit) continue;
    const pair = wl[k ^ 1];
    const xd = w.xp > 0 ? (w.x - w.xp) / DT : 0;
    const stop = w.x > LD - LB ? 1 : 0;
    const damp = Math.min((xd > 0 ? CB : CR) * xd + stop * CS * xd, xd > 0 ? (0.5 * TUNING.mass * xd) / (4 * DT) : Infinity);
    const fs = P.k * w.x + stop * KB * (w.x - LD + LB) + damp + P.arb * (w.x - (pair.hit ? pair.x : 0));
    w.fz = Math.max(0, fs);
    w.xp = Math.max(w.x, 1e-6);
  }
  const airborne = hits === 0;

  if (!airborne && c.air > 0) {
    let l = 0, nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 4; k++) if (wl[k].hit) { nx += wl[k].nx; ny += wl[k].ny; nz += wl[k].nz; }
    l = Math.hypot(nx, ny, nz) || 1;
    landing(c, nx / l, ny / l, nz / l);
  }

  const pedal = inp.throttle, brakeIn = inp.brake;
  const reversing = brakeIn > 0.05 && pedal < 0.05 && vf0 < 0.8;
  const braking = brakeIn > 0.05 && !reversing && vf0 > 0.3;
  c.brk += ((braking ? brakeIn : 0) - c.brk) * Math.min(1, DT / 0.05);
  const yawNow = -(c.ox * c.ux + c.oy * c.uy + c.oz * c.uz);
  const yawWant = (vf0 * c.delta) / (2.94 * (1 + (vf0 / 32) ** 2));
  const bias = Math.max(-0.5, Math.min(0.5, 0.9 * (yawWant - yawNow) * Math.min(1, Math.max(Math.abs(vf0), 1) / 8)));

  for (let k = 0; k < 4; k++) {
    const w = wl[k], P = w.w, s = sw[k];
    const om = w.om;
    const cap = P.front ? T.torqueFront : T.torqueRear;
    let td = pedal * Math.min(cap, (T.power * T.etaDrive * (P.front ? T.frontShare : 1 - T.frontShare) * 0.5) / Math.max(Math.abs(om), 25));
    td *= (w.hit ? 1 : 0) * Math.max(0, Math.min(1, (360 - om) / 25));
    if (!P.front) td *= k === 2 ? 1 + bias : 1 - bias;
    if (reversing) td = -brakeIn * 0.35 * cap * Math.max(0, 1 - Math.abs(vf0) / T.reverseMax);
    let tb = 0;
    if (braking) tb = c.brk * (P.front ? T.brakeFront : T.brakeRear);
    else if (pedal < 0.05 && !reversing) tb = Math.abs(vf0) < 0.4 ? 2200 : T.coast * Math.min(1, Math.abs(vf0) / 3);

    if (!w.hit) {
      w.om += ((td - Math.sign(om) * Math.min(tb, (Math.abs(om) * IW) / DT)) / IW) * DT;
      w.kap = 0;
      continue;
    }
    body(c, P.r, P.u, P.f, at);
    const ax = at[0] - cg[0], ay = at[1] - cg[1], az = at[2] - cg[2];
    let wfx = c.fx, wfy = c.fy, wfz = c.fz;
    if (P.front) { wfx = c.fx * cd + c.rx * sd; wfy = c.fy * cd + c.ry * sd; wfz = c.fz * cd + c.rz * sd; }
    const nx = w.nx, ny = w.ny, nz = w.nz;
    const dn = wfx * nx + wfy * ny + wfz * nz;
    let tx = wfx - nx * dn, ty = wfy - ny * dn, tz = wfz - nz * dn;
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    const sx = ty * nz - tz * ny, sy = tz * nx - tx * nz, sz = tx * ny - ty * nx;
    const vcx = c.vx + c.oy * az - c.oz * ay, vcy = c.vy + c.oz * ax - c.ox * az, vcz = c.vz + c.ox * ay - c.oy * ax;
    const vx = vcx * tx + vcy * ty + vcz * tz, vy = vcx * sx + vcy * sy + vcz * sz;
    const den = Math.max(Math.abs(vx), 1.2);
    const kap = (om * P.R - vx) / den;
    w.a += (Math.atan2(vy, Math.max(Math.abs(vx), 1)) - w.a) * (1 - Math.exp((-Math.max(Math.abs(vx), 0.6) * DT) / SIGMA));
    const t = tyre(w.fz, kap, w.a, w.mu * P.grip);
    let omNew = om + (DT * (td - (tb > 0 ? Math.sign(om) * tb : 0) - P.R * t.fx)) / (IW + (DT * P.R * P.R * Math.max(0, t.cx)) / den);
    if (tb > 0 && om * omNew < 0) omNew = 0;
    if (braking && vx > 1) omNew = Math.max(omNew, (vx * (1 - T.absSlip)) / P.R);
    if (td > 0) omNew = Math.min(omNew, (vx + den * T.tcSlip * Math.max(T.tcFloor, 1 - Math.abs(w.a) / T.tcAngle)) / P.R);
    const kapNew = (omNew * P.R - vx) / den;
    let fxT = t.fx + Math.max(0, t.cx) * (Math.max(-1, Math.min(1, kapNew)) - Math.max(-1, Math.min(1, kap)));
    if (fxT * vx < 0 && td <= 0) fxT = Math.sign(fxT) * Math.min(Math.abs(fxT), (0.3 * m * Math.abs(vx)) / DT);
    let fyT = -t.fy;
    const vyMax = (0.3 * m * Math.abs(vy)) / DT;
    if (Math.abs(fyT) > vyMax) fyT = Math.sign(fyT) * vyMax;
    w.om = omNew;
    w.kap = kapNew;
    const rr = T.rolling * w.fz * Math.tanh(vx / 0.6);
    fxT -= rr;
    pushForce(tx * fxT + sx * fyT + nx * w.fz, ty * fxT + sy * fyT + ny * w.fz, tz * fxT + sz * fyT + nz * w.fz, w.px - COM[0], w.py - COM[1], w.pz - COM[2]);
    anx += nx * w.fz; any += ny * w.fz; anz += nz * w.fz;
    sumFz += w.fz;
    dig += DRAG[w.kind] / 4;
    if (w.road) roadHits++;
  }
  c.load = sumFz;

  F[1] -= m * G;
  const sp = speed0;
  if (sp > 0.01) {
    const dr = 0.5 * T.rho * sp * T.cdA * (1 - c.tow);
    F[0] -= c.vx * dr; F[1] -= c.vy * dr; F[2] -= c.vz * dr;
    const fwd = Math.max(0, vf0);
    const dn = 0.5 * T.rho * fwd * fwd * T.clA;
    pushAt(c, -c.ux * dn * T.downFront, -c.uy * dn * T.downFront, -c.uz * dn * T.downFront, 0, -0.25, 1.41);
    pushAt(c, -c.ux * dn * (1 - T.downFront), -c.uy * dn * (1 - T.downFront), -c.uz * dn * (1 - T.downFront), 0, -0.24, -1.54);
    const fd = (m * dig * Math.min(1, sp / 2)) / sp;
    F[0] -= c.vx * fd; F[1] -= c.vy * fd; F[2] -= c.vz * fd;
  }

  c.boosting = !!inp.boost && c.gas > 1e-4;
  c.thr += ((c.boosting ? 1 : 0) - c.thr) * Math.min(1, DT / T.valve);
  if (c.thr > 0.001) {
    const ft = T.thrustG * m * G * c.thr;
    pushAt(c, c.fx * ft, c.fy * ft, c.fz * ft, 0, -0.09, -2.23);
  }
  if (c.boosting) c.gas = Math.max(0, c.gas - DT / T.burn);

  const tap = !!inp.lift && !c.liftHeld;
  c.liftHeld = !!inp.lift;
  c.hopT = Math.max(0, c.hopT - DT);
  c.lifting = false;
  if (tap && !airborne && c.hopT === 0 && c.gas >= T.hopGas) {
    c.vx += c.ux * T.hopDv; c.vy += c.uy * T.hopDv; c.vz += c.uz * T.hopDv;
    c.gas -= T.hopGas; c.hopT = T.hopCool; c.lifting = true; c.hopped = true;
  } else if (inp.lift && airborne && c.gas > 1e-4) {
    const a = Math.max(0, Math.min(T.liftG * G, (G - 3 * c.vy) / Math.max(c.uy, 0.3)));
    F[0] += c.ux * m * a; F[1] += c.uy * m * a; F[2] += c.uz * m * a;
    c.gas = Math.max(0, c.gas - (T.liftBurn * a * DT) / G);
    c.lifting = a > 0;
  }

  c.fan = 0;
  if (roadHits > 0 && sumFz > 0) {
    const l = Math.hypot(anx, any, anz);
    const e = Math.max(0, Math.min(1, (0.86 - any / l) / 0.36));
    if (e > 0) {
      c.fan = e;
      const ff = m * G * T.fanG * e;
      F[0] -= (anx / l) * ff; F[1] -= (any / l) * ff; F[2] -= (anz / l) * ff;
    }
  }

  if (airborne) {
    let tp = inp.pitch * T.pitchRate, ty = inp.steer * T.yawRate, tr = inp.roll * T.rollRate;
    if (assist && inp.roll === 0) {
      const [hx, hy, hz] = upHint(c, track);
      const ex = c.uy * hz - c.uz * hy, ey = c.uz * hx - c.ux * hz, ez = c.ux * hy - c.uy * hx;
      tp = Math.max(-2.2, Math.min(2.2, ((ex * c.rx + ey * c.ry + ez * c.rz) + inp.pitch * 0.45) * 3));
      if (c.air > 8 || c.lifting) tr = Math.max(-2.2, Math.min(2.2, (ex * c.fx + ey * c.fy + ez * c.fz) * 3));
    }
    const rates = [c.ox * c.rx + c.oy * c.ry + c.oz * c.rz, -(c.ox * c.ux + c.oy * c.uy + c.oz * c.uz), c.ox * c.fx + c.oy * c.fy + c.oz * c.fz];
    const want = [tp, ty, tr];
    const axis = [[c.rx, c.ry, c.rz], [-c.ux, -c.uy, -c.uz], [c.fx, c.fy, c.fz]];
    let used = 0;
    for (let a = 0; a < 3 && c.gas > 0; a++) {
      const acc = Math.max(-T.attitude[a], Math.min(T.attitude[a], (want[a] - rates[a]) * 14));
      TQ[0] += axis[a][0] * acc * INERTIA[a]; TQ[1] += axis[a][1] * acc * INERTIA[a]; TQ[2] += axis[a][2] * acc * INERTIA[a];
      used += Math.abs(acc) / T.attitude[a];
    }
    c.gas = Math.max(0, c.gas - (used * T.attitudeBurn * DT) / 3);
  }

  c.vx += (F[0] / m) * DT; c.vy += (F[1] / m) * DT; c.vz += (F[2] / m) * DT;
  {
    const br = TQ[0] * c.rx + TQ[1] * c.ry + TQ[2] * c.rz, bu = TQ[0] * c.ux + TQ[1] * c.uy + TQ[2] * c.uz, bf = TQ[0] * c.fx + TQ[1] * c.fy + TQ[2] * c.fz;
    let wr = c.ox * c.rx + c.oy * c.ry + c.oz * c.rz, wu = c.ox * c.ux + c.oy * c.uy + c.oz * c.uz, wf = c.ox * c.fx + c.oy * c.fy + c.oz * c.fz;
    const gr = (INERTIA[1] - INERTIA[2]) * wu * wf, gu = (INERTIA[2] - INERTIA[0]) * wf * wr, gf = (INERTIA[0] - INERTIA[1]) * wr * wu;
    wr += ((br + gr) / INERTIA[0]) * DT; wu += ((bu + gu) / INERTIA[1]) * DT; wf += ((bf + gf) / INERTIA[2]) * DT;
    c.ox = c.rx * wr + c.ux * wu + c.fx * wf; c.oy = c.ry * wr + c.uy * wu + c.fy * wf; c.oz = c.rz * wr + c.uz * wu + c.fz * wf;
  }

  const q = roadAt(track, COM[0], COM[1], COM[2], c.hint, sf);
  c.hint = sf.i;
  if (q.hit) collide(c, q, track.air?.[q.i]);

  spinFrame(c, c.ox, c.oy, c.oz);
  body(c, CGO[0], CGO[1], CGO[2], cg);
  c.x = COM[0] + c.vx * DT - cg[0]; c.y = COM[1] + c.vy * DT - cg[1]; c.z = COM[2] + c.vz * DT - cg[2];
  if (q.hit) c.lat = q.lat - (cg[0] * q.rx + cg[1] * q.ry + cg[2] * q.rz);

  const wp = c.ox * c.rx + c.oy * c.ry + c.oz * c.rz, wy = -(c.ox * c.ux + c.oy * c.uy + c.oz * c.uz), wr = c.ox * c.fx + c.oy * c.fy + c.oz * c.fz;
  c.wp = wp; c.wy = wy; c.wr = wr; c.yawRate = wy;
  if (airborne) {
    c.air++;
    c.flip += wp * DT; c.spin += wy * DT; c.barrel += wr * DT;
  } else {
    c.air = 0;
    if (c.hopT === 0) c.hopped = false;
    const l = Math.hypot(anx, any, anz);
    if (l > 0) { c.nx = anx / l; c.ny = any / l; c.nz = anz / l; }
  }
  c.mode = airborne && c.air >= 6 ? 0 : roadHits > 0 ? 1 : hits > 0 ? 2 : c.mode || 1;
  c.vf = c.vx * c.fx + c.vy * c.fy + c.vz * c.fz;
  c.slip = c.vx * c.rx + c.vy * c.ry + c.vz * c.rz;
  c.speed = Math.hypot(c.vx, c.vy, c.vz);
}

function landing(c, nx, ny, nz) {
  const align = c.ux * nx + c.uy * ny + c.uz * nz;
  const vn = -(c.vx * nx + c.vy * ny + c.vz * nz);
  const airS = c.air * DT;
  const tricks = [];
  const count = (acc, name) => {
    const k = Math.floor((Math.abs(acc) + 0.9) / TAU);
    for (let i = 0; i < k; i++) tricks.push(name);
  };
  count(c.flip, c.flip > 0 ? 'backflip' : 'frontflip');
  count(c.barrel, 'barrel roll');
  count(c.spin, 'spin');
  if (airS > 0.25 || vn > 6) {
    if (align < 0.45) {
      if (!c.wrecked) c.ev.push({ type: 'wreck', v: vn });
      c.wrecked = true;
    } else {
      const quality = align > 0.95 && vn < 16 ? 'perfect' : align > 0.8 && vn < 24 ? 'clean' : 'hard';
      if (quality === 'hard') tricks.length = 0;
      if (quality === 'hard' || tricks.length || !c.hopped) c.ev.push({ type: 'land', quality, air: airS, tricks, v: vn, hop: c.hopped });
    }
  }
  c.flip = c.spin = c.barrel = 0;
}

function collide(c, q, air) {
  const side0 = q.w - 0.9;
  const qlat = q.lat;
  if (air && Math.abs(qlat) > side0) return;
  let press = 0, tyreSide = 0;
  for (let k = 0; k < HULL.length; k++) {
    body(c, HULL[k][0], HULL[k][1], HULL[k][2], at);
    const rx = at[0] - cg[0], ry = at[1] - cg[1], rz = at[2] - cg[2];
    const lat = qlat + rx * q.rx + ry * q.ry + rz * q.rz;
    const over = Math.abs(lat) - side0;
    if (over <= 0) continue;
    if (air && q.hs + rx * q.nx + ry * q.ny + rz * q.nz > WALL_TOP) continue;
    const side = Math.sign(lat);
    COM[0] -= q.rx * over * side; COM[1] -= q.ry * over * side; COM[2] -= q.rz * over * side;
    const vr = (c.vx * q.rx + c.vy * q.ry + c.vz * q.rz) * side;
    if (vr <= 0) continue;
    press += vr;
    const vt = Math.hypot(c.vx - q.rx * vr * side, c.vy - q.ry * vr * side, c.vz - q.rz * vr * side);
    const ang = Math.atan2(vr, vt);
    if (q.tyre) { tyreSide = side; continue; }
    const hit = impulse(c, rx, ry, rz, -q.rx * side, -q.ry * side, -q.rz * side, 0.2 * Math.max(0, Math.min(1, (ang - 0.2) / 1.2)), 0.18);
    if (hit > 3) c.ev.push({ type: 'scrape', v: hit, side, angle: ang });
    const roll = c.ox * c.fx + c.oy * c.fy + c.oz * c.fz;
    c.ox -= c.fx * roll * 0.5; c.oy -= c.fy * roll * 0.5; c.oz -= c.fz * roll * 0.5;
  }
  c.wallT = press ? c.wallT + 1 : 0;
  if (!press) return;
  if (tyreSide) return tyreHit(c, q, tyreSide);
  const drag = WALL_DRAG * DT * Math.min(1, Math.max(0, c.wallT - WALL_GRACE) / WALL_RAMP);
  const sp = Math.hypot(c.vx, c.vy, c.vz), k = Math.max(0, sp - (WALL_HIT * press * (1 + (press / WALL_HARD) ** 2) + drag) * Math.min(1, sp / 40)) / Math.max(sp, 1e-6);
  c.vx *= k; c.vy *= k; c.vz *= k;
  if (press > WALL_WRECK && !c.wrecked) { c.ev.push({ type: 'wreck', v: press }); c.wrecked = true; }
}

function tyreHit(c, q, side) {
  const nx = q.rx * side, ny = q.ry * side, nz = q.rz * side;
  const vn = c.vx * nx + c.vy * ny + c.vz * nz;
  const drag = WALL_DRAG * DT * Math.min(1, Math.max(0, c.wallT - WALL_GRACE) / WALL_RAMP);
  if (vn > 0) {
    c.vx -= nx * vn; c.vy -= ny * vn; c.vz -= nz * vn;
    c.ox *= TYRE_SPIN; c.oy *= TYRE_SPIN; c.oz *= TYRE_SPIN;
    if (vn > 3) c.ev.push({ type: 'scrape', v: vn, side, angle: Math.atan2(vn, Math.hypot(c.vx, c.vy, c.vz)) });
    if (vn > TYRE_WRECK && !c.wrecked) { c.ev.push({ type: 'wreck', v: vn }); c.wrecked = true; }
  }
  const sp = Math.hypot(c.vx, c.vy, c.vz), k = Math.max(0, sp - TYRE_MU * Math.max(0, vn) - drag) / Math.max(sp, 1e-6);
  c.vx *= k; c.vy *= k; c.vz *= k;
}
