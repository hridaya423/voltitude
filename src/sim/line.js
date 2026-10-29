import { TUNING, accelAt, brakeAt, cornerSpeed } from './drive.js';
import { LIM_BAND } from './circuit.js';

const G = 9.81;
const latGain = (v) => (0.5 * TUNING.rho * TUNING.clA * v * v) / (TUNING.mass * G);
const NODE = 8;
const KW = 4;
const MARGIN = 1.15;
const LOOP_SPEED = 45;
const GRIP = 0.9;
const BRAKE_GRIP = 0.86;
export const LIP_SPEED = 36;
const FLIGHT_IN = 60, FLIGHT_OUT = 90, AIR_LANE = 3.5;

export function groundLane(track, { lip }) {
  for (let d = 0; d < 300; d++) {
    const k = track.curv[(lip + d) % track.lap];
    if (Math.abs(k) > 0.005) return -Math.sign(k) * AIR_LANE;
  }
  return 0;
}

function solve(A, b, m) {
  const L = new Float64Array(m * m);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * m + j];
      for (let k = 0; k < j; k++) s -= L[i * m + k] * L[j * m + k];
      L[i * m + j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j * m + j];
    }
  }
  const y = new Float64Array(m), x = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i * m + k] * y[k];
    y[i] = s / L[i * m + i];
  }
  for (let i = m - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < m; k++) s -= L[k * m + i] * x[k];
    x[i] = s / L[i * m + i];
  }
  return x;
}

function offsets(track) {
  const { lap: N, H, R, halfW, loopMask } = track;
  const m = Math.round(N / NODE);
  const idx = new Int32Array(m), cx = new Float64Array(m), cz = new Float64Array(m), rx = new Float64Array(m), rz = new Float64Array(m);
  const bound = new Float64Array(m), scale = new Float64Array(m);
  const lane = new Float64Array(N).fill(NaN);
  for (const a of track.airs ?? []) for (let d = -FLIGHT_IN; d <= FLIGHT_OUT; d++) lane[(a.lip + d + N) % N] = groundLane(track, a);
  for (let i = 0; i < m; i++) {
    const s = Math.round((i * N) / m) % N, k = s * 3;
    idx[i] = s;
    cx[i] = H[k]; cz[i] = H[k + 2];
    const l = Math.hypot(R[k], R[k + 2]);
    rx[i] = R[k] / l; rz[i] = R[k + 2] / l;
    scale[i] = l;
    let flat = true;
    for (let d = -NODE; d <= NODE; d++) if (loopMask[(s + d + N) % N] || track.U[((s + d + N) % N) * 3 + 1] < 0.8) flat = false;
    bound[i] = flat ? Math.max(0, (halfW[s] - LIM_BAND - MARGIN) * l) : 0;
  }
  const A = new Float64Array(m * m), b = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const p = [(i + m - 1) % m, i, (i + 1) % m], co = [1, -2, 1];
    const dx = cx[p[0]] - 2 * cx[i] + cx[p[2]], dz = cz[p[0]] - 2 * cz[i] + cz[p[2]];
    for (let u = 0; u < 3; u++) {
      b[p[u]] -= co[u] * (rx[p[u]] * dx + rz[p[u]] * dz);
      for (let v = 0; v < 3; v++) A[p[u] * m + p[v]] += co[u] * co[v] * (rx[p[u]] * rx[p[v]] + rz[p[u]] * rz[p[v]]);
    }
  }
  for (let i = 0; i < m; i++) A[i * m + i] += 1e-4;
  const a = new Float64Array(m), fixed = new Uint8Array(m);
  for (let i = 0; i < m; i++) if (bound[i] === 0) fixed[i] = 1;
  for (let i = 0; i < m; i++) if (!Number.isNaN(lane[idx[i]])) { fixed[i] = 1; a[i] = lane[idx[i]] * scale[i]; }
  for (let it = 0; it < 14; it++) {
    const free = [];
    for (let i = 0; i < m; i++) if (!fixed[i]) free.push(i);
    const f = free.length;
    const Af = new Float64Array(f * f), bf = new Float64Array(f);
    for (let u = 0; u < f; u++) {
      let s = b[free[u]];
      for (let j = 0; j < m; j++) if (fixed[j]) s -= A[free[u] * m + j] * a[j];
      bf[u] = s;
      for (let v = 0; v < f; v++) Af[u * f + v] = A[free[u] * m + free[v]];
    }
    const x = solve(Af, bf, f);
    let hit = 0;
    for (let u = 0; u < f; u++) {
      const i = free[u];
      a[i] = x[u];
      if (Math.abs(a[i]) > bound[i]) { a[i] = Math.sign(a[i]) * bound[i]; fixed[i] = 1; hit++; }
    }
    if (!hit) break;
  }
  const off = new Float32Array(N);
  for (let s = 0; s < N; s++) {
    const q = (s * m) / N, i = Math.floor(q), f = q - i;
    const p0 = (i + m - 1) % m, p1 = i % m, p2 = (i + 1) % m, p3 = (i + 2) % m;
    const v = (j) => a[j] / scale[j];
    const t2 = f * f, t3 = t2 * f;
    off[s] = 0.5 * (2 * v(p1) + (-v(p0) + v(p2)) * f + (2 * v(p0) - 5 * v(p1) + 4 * v(p2) - v(p3)) * t2 + (-v(p0) + 3 * v(p1) - 3 * v(p2) + v(p3)) * t3);
  }
  return off;
}

function spare(v, kappa, grip) {
  const used = (v * v * Math.abs(kappa)) / (TUNING.latG * G * grip * (1 + latGain(v)));
  return Math.sqrt(Math.max(0.05, 1 - Math.min(1, used) ** 2));
}

export function speedProfile(track, off, grip, brakeGrip, vTop, boost = null) {
  const { lap: N, H, R, T, step } = track;
  const kappa = new Float64Array(N), vlim = new Float64Array(N);
  const px = new Float64Array(N), pz = new Float64Array(N);
  for (let i = 0; i < N; i++) { px[i] = H[i * 3] + R[i * 3] * off[i]; pz[i] = H[i * 3 + 2] + R[i * 3 + 2] * off[i]; }
  const W = 5;
  for (let i = 0; i < N; i++) {
    const a = (i - W + N) % N, c = (i + W) % N;
    const ax = px[i] - px[a], az = pz[i] - pz[a], bx = px[c] - px[i], bz = pz[c] - pz[i];
    const cross = ax * bz - az * bx;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz), lc = Math.hypot(px[c] - px[a], pz[c] - pz[a]);
    kappa[i] = (2 * cross) / (la * lb * lc || 1);
  }
  const raw = Float64Array.from(kappa);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let d = -KW; d <= KW; d++) s += raw[(i + d + N) % N];
    kappa[i] = s / (2 * KW + 1);
  }
  const pitch = new Float64Array(N);
  for (let i = 0; i < N; i++) pitch[i] = Math.asin(Math.max(-1, Math.min(1, T[i * 3 + 1])));
  for (let i = 0; i < N; i++) {
    const loop = track.loopMask[i], uy = track.U[i * 3 + 1];
    let v = loop ? LOOP_SPEED : vTop;
    if (!loop) {
      const flat = cornerSpeed(kappa[i], grip * grip), s = Math.sqrt(1 - uy * uy), mu = TUNING.latG * grip * grip, den = uy - mu * s;
      if (uy >= 0.8) v = Math.min(v, flat);
      else if (den > 0) v = Math.min(v, Math.max(flat, Math.sqrt((G * (s + mu * uy)) / (Math.abs(kappa[i]) * den))));
      const d = (pitch[(i + 4) % N] - pitch[(i - 4 + N) % N]) / (8 * step);
      if (d < -1e-4 && !track.bot[i]) v = Math.min(v, Math.sqrt((G * 0.8) / -d));
    }
    vlim[i] = v;
  }
  for (const { lip } of track.airs ?? []) for (let d = 0; d < 8; d++) { const i = (lip - d + N) % N; vlim[i] = Math.min(vlim[i], LIP_SPEED); }
  const v = Float64Array.from(vlim);
  const cap = Float64Array.from(vlim);
  const accel = (s, i) => Math.max(0.5, accelAt(s) * 0.97) + (boost && boost[i] ? TUNING.thrustG * G : 0);
  for (let pass = 0; pass < 3; pass++) {
    for (let k = 0; k < N; k++) {
      const i = (N - 1 - k + N) % N, j = (i + 1) % N;
      cap[i] = Math.min(cap[i], Math.sqrt(cap[j] * cap[j] + 2 * brakeAt(cap[j]) * brakeGrip * spare(cap[j], kappa[i], grip) * step));
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * brakeAt(v[j]) * brakeGrip * spare(v[j], kappa[i], grip) * step));
    }
    for (let k = 0; k < N; k++) {
      const i = k, j = (i + 1) % N;
      v[j] = Math.min(v[j], vlim[j], Math.sqrt(v[i] * v[i] + 2 * accel(v[i], i) * spare(v[i], kappa[i], grip) * step));
    }
  }
  let time = 0;
  for (let i = 0; i < N; i++) time += step / ((v[i] + v[(i + 1) % N]) / 2);
  const zones = [];
  let start = -1;
  for (let k = 0; k < N * 2; k++) {
    const i = k % N, j = (i + 1) % N;
    const braking = v[j] < v[i] - 0.02;
    if (braking && start < 0) start = i;
    if (!braking && start >= 0) {
      zones.push({ from: start, to: i, vIn: v[start], vOut: v[i] });
      start = -1;
      if (k >= N) break;
    }
    if (k >= N && start < 0) break;
  }
  return { v, cap, kappa, vlim, time, zones };
}

const BURN = 1.5;

function boostExits(track, base, off) {
  const { lap: N, step } = track;
  const { v, kappa } = base;
  const bound = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    bound[i] = Math.abs(v[j] - Math.sqrt(v[i] * v[i] + 2 * Math.max(0.5, accelAt(v[i]) * 0.97) * spare(v[i], kappa[i], GRIP) * step)) < 0.1 && v[j] > v[i] ? 1 : 0;
  }
  const exits = [];
  let start = -1;
  for (let k = 0; k <= N * 2; k++) {
    const i = k % N;
    if (bound[i] && start < 0) start = k;
    if ((!bound[i] || k === N * 2) && start >= 0) {
      if (k - start >= 40 && start < N) {
        const e = start % N;
        let t = 0, vv = v[e], j = e;
        while (t < BURN && j !== (start + (k - start) - 1) % N) {
          const vn = Math.sqrt(vv * vv + 2 * (Math.max(0.5, accelAt(vv) * 0.97) + TUNING.thrustG * G) * step);
          t += (2 * step) / (vv + vn);
          vv = vn;
          j = (j + 1) % N;
        }
        const mask = new Uint8Array(N);
        for (let q = e; q !== j; q = (q + 1) % N) mask[q] = 1;
        const gain = base.time - speedProfile(track, off, GRIP, BRAKE_GRIP, 150, mask).time;
        exits.push({ from: e, to: j, secs: t, gain, value: gain / Math.max(t, 0.1), vOut: v[e], run: k - start });
      }
      start = -1;
    }
  }
  exits.sort((a, b) => b.value - a.value);
  return exits;
}

export function racingLine(track) {
  const off = offsets(track);
  const prof = speedProfile(track, off, GRIP, BRAKE_GRIP, 150);
  return { off, ...prof, exits: boostExits(track, prof, off) };
}
