import { stepCar, steerTo } from './drive.js';
import { lineFor } from './driver.js';
import { LIM_BAND } from './circuit.js';

export const PRE = 150, POST = 150, PACE = 0.97, MIN_GAIN = 0.1;
const CORNER = 0.006, JOIN = 60, ENTRY = 12, CATCH_UP = 120 * 20;
const cache = new WeakMap();

export function limitWindows(track) {
  let L = cache.get(track);
  if (L) return L;
  const N = track.lap;
  const on = (j) => Math.abs(track.curv[j]) > CORNER && !track.loopMask[j] && !track.air?.[j] && track.U[j * 3 + 1] > 0.95;
  const cores = [];
  for (let i = 0; i < N; i++) {
    if (!on(i) || on((i + N - 1) % N)) continue;
    let len = 0;
    while (len < N && on((i + len) % N)) len++;
    const last = cores[cores.length - 1];
    if (last && i - last.e < JOIN) last.e = i + len;
    else cores.push({ s: i, e: i + len });
  }
  const first = cores[0], tail = cores[cores.length - 1];
  if (cores.length > 1 && first.s + N - tail.e < JOIN) { first.s = tail.s - N; cores.pop(); }
  const merged = cores.map((c, k) => {
    const prev = cores[(k + cores.length - 1) % cores.length], next = cores[(k + 1) % cores.length];
    const gapIn = (c.s - prev.e + N) % N, gapOut = (next.s - c.e + N) % N;
    return { a: c.s - Math.min(PRE, gapIn / 2), b: c.e + Math.min(POST, gapOut / 2) };
  }).map((w) => ({ a: Math.round(w.a), b: Math.round(w.b) }));
  const at = new Int16Array(N).fill(-1), f = track.finish % N;
  const list = merged.flatMap((w) => {
    const a = (w.a + N) % N, len = w.b - w.a, cut = (f - a + N) % N;
    return cut > 0 && cut < len ? [{ a, len: cut }, { a: f, len: len - cut, tail: true }] : [{ a, len }];
  }).map(({ a, len, tail = false }, k) => {
    for (let d = 0; d < len; d++) at[(a + d) % N] = k;
    return { a, b: (a + len) % N, len, tail };
  });
  L = { wins: list, at };
  cache.set(track, L);
  return L;
}

export function outside(c, track) {
  if (c.mode === 2) return true;
  if (c.mode !== 1) return false;
  const edge = track.halfW[c.hint] - LIM_BAND;
  let side = 0;
  for (const w of c.wl) {
    if (Math.abs(w.lat) <= edge) return false;
    const s = Math.sign(w.lat);
    if (side && s !== side) return false;
    side = s;
  }
  return true;
}

function drive(track, line, s) {
  const c = s.car, N = track.lap, h = c.hint, ahead = (h + Math.round(c.speed * 0.25)) % N;
  const slope = (line.off[(h + 3) % N] - line.off[(h + N - 3) % N]) / 6;
  s.inp.steer = steerTo(c, track, line.off[h], slope, line.kappa[h]);
  const vt = line.v[ahead] * PACE;
  s.inp.throttle = Math.max(0, Math.min(1, (vt - c.speed) / 2.5));
  s.inp.brake = c.speed > vt + 0.6 ? Math.min(1, (c.speed - vt) / 4) : 0;
  if (s.inp.brake) s.inp.throttle = 0;
}

function stepShadow(world, s) {
  const { track } = world, c = s.car, N = track.lap;
  drive(track, lineFor(track), s);
  stepCar(c, s.inp, world, s.t, true);
  c.ev.length = 0;
  s.t++;
  let d = c.hint - s.last;
  if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
  s.last = c.hint;
  s.prog += Math.max(0, d);
  while (s.mark < Math.min(s.prog, s.len)) s.at[++s.mark] = s.t;
  if (c.wrecked) s.failed = true;
}

function shadowOf(car, len) {
  return { car: structuredClone(car), inp: { throttle: 0, brake: 0, steer: 0, pitch: 0, roll: 0, boost: 0, lift: 0, reset: 0 }, t: 0, prog: 0, last: car.hint, len, at: new Int32Array(len + 1), mark: 0, failed: false };
}

function open(race, e, st, lockstep, len, whole) {
  const c = e.car;
  st.seg = true; st.whole = whole; st.from = c.hint; st.len = len; st.t0 = race.raceTick; st.breach = outside(c, race.world.track); st.respawns = e.respawns;
  if (lockstep) st.shadow = shadowOf(c, len); else { st.snap = structuredClone(c); st.shadow = null; }
}

function close(race, e, st, lockstep, p, whole) {
  st.seg = false;
  if (st.respawns !== e.respawns || (!st.breach && !(lockstep && whole))) return null;
  const s = st.shadow || shadowOf(st.snap, st.len);
  p = Math.min(p, st.len);
  while (s.mark < p && !s.failed && s.t < CATCH_UP) stepShadow(race.world, s);
  if (s.mark < p) return null;
  const actual = race.raceTick - st.t0;
  if (!st.breach) {
    if (!limitWindows(race.world.track).wins[st.w0].tail) e.pace += 0.3 * (Math.max(0.8, Math.min(1.25, s.at[p] / actual)) - e.pace);
    return null;
  }
  return { window: st.w0, gain: (s.at[p] / e.pace - actual) / 120 };
}

export function trackLimits(race, e, lockstep) {
  const { world } = race, { track } = world, c = e.car, N = track.lap;
  const { wins, at } = limitWindows(track);
  const st = e.limits;
  const k = at[c.hint];
  if (st.w >= 0) {
    const w = wins[st.w];
    if (k === st.w) {
      if (!st.seg) {
        if (c.mode !== 0) open(race, e, st, lockstep, (w.b - c.hint + N) % N, false);
        return null;
      }
      if (c.mode === 0) return close(race, e, st, lockstep, (c.hint - st.from + N) % N, false);
      if (outside(c, track)) st.breach = true;
      if (lockstep && st.shadow.mark < st.len && !st.shadow.failed) stepShadow(world, st.shadow);
      return null;
    }
    st.w = -1;
    if (!st.seg) return null;
    if ((c.hint - w.b + N) % N >= ENTRY) { st.seg = false; return null; }
    return close(race, e, st, lockstep, st.len, st.whole);
  }
  if (k >= 0 && (c.hint - wins[k].a + N) % N < ENTRY) {
    st.w = st.w0 = k; st.seg = false;
    if (c.mode !== 0) open(race, e, st, lockstep, (wins[k].b - c.hint + N) % N, true);
  }
  return null;
}
