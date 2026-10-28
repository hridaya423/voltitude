import { buildCourse } from '../src/sim/course.js';
import { createCar, placeCar, stepCar, steerLimit, DT } from '../src/sim/drive.js';
import { createInput } from '../src/sim/race.js';
import { lineFor } from '../src/sim/driver.js';
import { speedProfile } from '../src/sim/line.js';
import { loadWorld } from './load-world.mjs';

const G = 9.81;
const WB = 2.94;
const START = 600;
const ATTACK = 6;
const RELEASE = 12;

const world = (() => {
  const track = buildCourse({ start: [0, 0.62, 0], yaw: 0, w: 900, pieces: [{ len: 14000 }] });
  return { track, terrain: { height: () => -50 } };
})();

function fresh(v) {
  const c = createCar();
  placeCar(c, world.track, START, v, 0);
  const inp = createInput();
  const hold = () => {
    inp.throttle = Math.max(0, Math.min(1, (v - c.vf) * 0.6 + 0.12));
    inp.brake = c.vf > v + 2 ? 0.4 : 0;
  };
  for (let t = 0; t < 240; t++) { hold(); stepCar(c, inp, world, t, false); }
  return { c, inp, hold };
}

const deg = (r) => +(r * 57.3).toFixed(1);

export function keyStep(v, holdFor = 3) {
  const { c, inp, hold } = fresh(v);
  let k = 0, psi = 0, chi = 0;
  const rows = [];
  for (let t = 0; t < 120 * holdFor; t++) {
    k = Math.min(1, k + ATTACK * DT);
    inp.steer = k;
    hold();
    stepCar(c, inp, world, t, false);
    const beta = Math.atan2(c.slip, Math.max(c.vf, 1));
    psi += c.yawRate * DT;
    rows.push({ t: (t + 1) * DT, yaw: c.yawRate, ay: (c.yawRate * c.vf) / G, beta, fa: Math.abs(c.wl[0].a), ra: Math.abs(c.wl[2].a), speed: c.speed });
  }
  const end = rows.slice(-120);
  const mean = (f) => end.reduce((s, r) => s + f(r), 0) / end.length;
  const yawF = mean((r) => r.yaw);
  const at = (f) => rows.find((r) => r.yaw >= f * yawF)?.t ?? Infinity;
  const peak = Math.max(...rows.map((r) => r.ay));
  const ayF = mean((r) => r.ay);
  return {
    v, lockDeg: deg(steerLimit(v)), t50: +at(0.5).toFixed(2), t90: +at(0.9).toFixed(2),
    peakG: +peak.toFixed(2), heldG: +ayF.toFixed(2), overshoot: +(peak / ayF).toFixed(2),
    heldBetaDeg: deg(Math.abs(mean((r) => r.beta))), frontSlipDeg: deg(mean((r) => r.fa)), rearSlipDeg: deg(mean((r) => r.ra)),
    speedKept: +(rows[rows.length - 1].speed / v).toFixed(2), psi3s: deg(psi),
  };
}

export function tap(v, ms) {
  const { c, inp, hold } = fresh(v);
  let k = 0, psi = 0, maxB = 0, maxG = 0;
  for (let t = 0; t < 120 * 3; t++) {
    k = t * DT < ms / 1000 ? Math.min(1, k + ATTACK * DT) : Math.max(0, k - RELEASE * DT);
    inp.steer = k;
    hold();
    stepCar(c, inp, world, t, false);
    psi += c.yawRate * DT;
    maxB = Math.max(maxB, Math.abs(Math.atan2(c.slip, Math.max(c.vf, 1))));
    maxG = Math.max(maxG, (c.yawRate * c.vf) / G);
  }
  return { v, ms, headingDeg: deg(psi), peakG: +maxG.toFixed(2), maxBetaDeg: deg(maxB) };
}

function steadyPoint(v, delta) {
  const { c, inp, hold } = fresh(v);
  let a = { y: 0, v: 0, b: 0, n: 0 };
  for (let t = 0; t < 120 * 6; t++) {
    inp.steer = Math.max(-1, Math.min(1, delta / steerLimit(c.speed)));
    hold();
    stepCar(c, inp, world, t, false);
    if (t > 120 * 4.5) { a.y += c.yawRate; a.v += c.vf; a.b += c.slip / Math.max(c.vf, 1); a.n++; }
  }
  const y = a.y / a.n, vf = a.v / a.n;
  return { delta, ay: (y * vf) / G, ug: delta - (WB * y) / vf, beta: a.b / a.n, ok: Math.abs(vf - v) < 1.2 };
}

export function steady(v) {
  const lim = steerLimit(v);
  const pts = [];
  for (let d = 0.004; d <= lim + 1e-6; d += 0.004) pts.push(steadyPoint(v, d));
  pts.push(steadyPoint(v, lim));
  const good = pts.filter((p) => p.ok);
  const peak = good.reduce((m, p) => (p.ay > m.ay ? p : m), good[0]);
  const near = (g) => good.reduce((m, p) => (Math.abs(p.ay - g) < Math.abs(m.ay - g) ? p : m), good[0]);
  const ug = (g) => { const p = near(g); return Math.abs(p.ay - g) < 0.1 ? deg(p.ug) / Math.max(p.ay, 0.1) : null; };
  const fix = (x) => (x === null ? null : +x.toFixed(1));
  return { v, maxG: +peak.ay.toFixed(2), atLockDeg: deg(peak.delta), lockDeg: deg(lim), ugDegPerG: { g05: fix(ug(0.5)), g09: fix(ug(0.9)), g11: fix(ug(1.1)) } };
}

export function throttleSteer(v = 30, g = 0.9) {
  const base = (() => { for (let d = 0.004; d < 0.2; d += 0.002) { const p = steadyPoint(v, d); if (p.ay >= g) return d; } return 0.05; })();
  const run = (thr, brk) => {
    const { c, inp, hold } = fresh(v);
    for (let t = 0; t < 120 * 4; t++) { inp.steer = Math.min(1, base / steerLimit(c.speed)); hold(); stepCar(c, inp, world, t, false); }
    const y0 = c.yawRate;
    let beta = 0;
    for (let t = 0; t < 120 * 0.8; t++) {
      inp.steer = Math.min(1, base / steerLimit(c.speed));
      inp.throttle = thr; inp.brake = brk;
      stepCar(c, inp, world, t, false);
      beta = Math.max(beta, Math.abs(Math.atan2(c.slip, Math.max(c.vf, 1))));
    }
    return { yawRatio: +(c.yawRate / y0).toFixed(2), betaDeg: deg(beta) };
  };
  return { v, g, lift: run(0, 0), brake: run(0, 0.4), full: run(1, 0) };
}

export function slideCatch(v = 40) {
  const out = {};
  for (const mode of ['release', 'countersteer']) {
    const { c, inp, hold } = fresh(v);
    let k = 0, kick = false, recovered = -1, spun = false, maxB = 0;
    for (let t = 0; t < 120 * 6; t++) {
      const beta = Math.atan2(c.slip, Math.max(c.vf, 1));
      if (t < 120 * 0.5) k = Math.min(1, k + ATTACK * DT);
      else if (t < 120 * 0.9) { inp.brake = 0.6; inp.throttle = 0; k = 1; kick = true; }
      else if (mode === 'release') k = Math.max(0, k - RELEASE * DT);
      else k = Math.max(-1, Math.min(1, k - Math.sign(beta) * ATTACK * DT * -1 * (Math.abs(beta) > 0.04 ? 1 : -1)));
      inp.steer = mode === 'release' || t < 120 * 0.9 ? k : Math.max(-1, Math.min(1, Math.sign(beta) * Math.min(1, Math.abs(beta) * 8)));
      if (t >= 120 * 0.9) hold();
      stepCar(c, inp, world, t, false);
      maxB = Math.max(maxB, Math.abs(beta));
      if (Math.abs(beta) > 1.2) spun = true;
      if (kick && t > 120 * 0.9 && recovered < 0 && Math.abs(beta) < 0.05 && Math.abs(c.yawRate) < 0.1) recovered = t * DT - 0.9;
    }
    out[mode] = { maxBetaDeg: deg(maxB), spun, recoveredInS: recovered < 0 ? null : +recovered.toFixed(2) };
  }
  return out;
}

export function transition(v = 40, hold = 0.6) {
  const { c, inp, hold: pace } = fresh(v);
  let k = 0, maxB = 0, maxG = 0, spun = false;
  for (let t = 0; t < 120 * (2 * hold + 2); t++) {
    const s = t * DT < hold ? 1 : t * DT < 2 * hold ? -1 : 0;
    if (s === 0) k = Math.abs(k) < RELEASE * DT ? 0 : k - Math.sign(k) * RELEASE * DT;
    else if (Math.sign(k) !== s && k !== 0) k = 0;
    else k = Math.max(-1, Math.min(1, k + s * ATTACK * DT));
    inp.steer = k;
    pace();
    stepCar(c, inp, world, t, false);
    const beta = Math.abs(Math.atan2(c.slip, Math.max(c.vf, 1)));
    maxB = Math.max(maxB, beta);
    maxG = Math.max(maxG, Math.abs((c.yawRate * c.vf) / G));
    if (beta > 0.6) spun = true;
  }
  return { v, hold, maxBetaDeg: deg(maxB), peakG: +maxG.toFixed(2), spun };
}

export function corners(venueId = 'proving', grip = 0.93) {
  const { track } = loadWorld(venueId);
  const L = lineFor(track);
  const N = track.lap;
  const prof = speedProfile(track, L.off, grip, grip, 150);
  const v = prof.v, kap = prof.kappa;
  const KMIN = 1 / 250;
  const sign = (i) => (Math.abs(kap[i]) >= KMIN ? Math.sign(kap[i]) : 0);
  let s0 = 0;
  while (sign(s0)) s0++;
  const runs = [];
  for (let n = 0; n < N;) {
    const i = (s0 + n) % N, sg = sign(i);
    if (!sg) { n++; continue; }
    let m = n + 1, last = n;
    while (m < N && m - last < 20 && sign((s0 + m) % N) !== -sg) { if (sign((s0 + m) % N) === sg) last = m; m++; }
    runs.push({ from: i, len: last - n + 1 });
    n = last + 1;
  }
  const rows = runs.filter((r) => r.len >= 25).map((r) => {
    let apex = Infinity, before = 0;
    const ks = [];
    for (let d = 0; d < r.len; d++) { const q = (r.from + d) % N; apex = Math.min(apex, v[q]); ks.push(Math.abs(kap[q])); }
    ks.sort((x, y) => x - y);
    for (let d = 1; d <= 160; d++) before = Math.max(before, v[(r.from - d + N) % N]);
    const ratio = apex / Math.min(before, 150);
    return { at: r.from, len: r.len, radius: Math.round(1 / ks[Math.floor(ks.length * 0.9)]), entryKmh: Math.round(before * 3.6), apexKmh: Math.round(apex * 3.6), ratio: +ratio.toFixed(2), kind: ratio >= 0.96 ? 'flat' : ratio >= 0.85 ? 'lift' : 'brake' };
  });
  const dec = (i) => (v[i] * v[i] - v[(i + 1) % N] * v[(i + 1) % N]) / (2 * track.step);
  let hard = 0, lifts = 0, run = 0, runLen = 0, hardM = 0, liftM = 0;
  for (let k = 0; k < N * 2; k++) {
    const i = k % N, d = dec(i);
    if (d > 4) { if (!run) { run = 1; runLen = 0; } runLen++; if (k < N) hardM++; }
    else { if (run && runLen >= 12 && k - runLen < N) hard++; run = 0; }
    if (k < N && d > 0.5 && d <= 4) liftM++;
  }
  let accel = 0, braking = 0;
  const top = Math.max(...v);
  for (let i = 0; i < N; i++) {
    const d = v[(i + 1) % N] - v[i];
    if (d > 0.005 || v[i] > top * 0.99) accel++;
    else if (d < -0.005) braking++;
  }
  const count = (k) => rows.filter((r) => r.kind === k).length;
  return { lapSeconds: +prof.time.toFixed(1), lengthM: N, topKmh: Math.round(top * 3.6), corners: rows.length, flat: count('flat'), lift: count('lift'), brake: count('brake'), throttlePct: Math.round((100 * accel) / N), brakingPct: Math.round((100 * braking) / N), hardBrakeZones: hard, hardBrakePct: Math.round((100 * hardM) / N), liftPct: Math.round((100 * liftM) / N), avgKmh: Math.round((N / prof.time) * 3.6), medianApexKmh: rows.map((r) => r.apexKmh).sort((a, b) => a - b)[rows.length >> 1], above150Pct: Math.round((100 * v.filter((x) => x * 3.6 > 150).length) / N), rows };
}

if (process.argv[1]?.endsWith('handling-lab.mjs')) {
  const speeds = [15, 30, 50, 70];
  console.log('full-key step (steer ramps 0 to 1 at', ATTACK, '/s and is held)');
  for (const v of speeds) console.log(JSON.stringify(keyStep(v)));
  console.log('key taps');
  for (const v of [30, 50, 70]) for (const ms of [60, 120]) console.log(JSON.stringify(tap(v, ms)));
  console.log('steady state, steering up to full lock');
  for (const v of [15, 30, 50, 70, 100]) console.log(JSON.stringify(steady(v)));
  console.log('left-right key transitions (esses)');
  for (const v of [30, 45, 60]) console.log(JSON.stringify(transition(v)));
  console.log('throttle steering, 0.9 g corner at 30 m/s (yaw rate ratio after 0.8 s)');
  console.log(JSON.stringify(throttleSteer()));
  console.log('slide at 40 m/s');
  console.log(JSON.stringify(slideCatch(40)));
  const c = corners(process.argv[2] || 'proving');
  console.log('circuit at 0.93 grip', JSON.stringify({ ...c, rows: undefined }));
  for (const r of c.rows) console.log(JSON.stringify(r));
}
