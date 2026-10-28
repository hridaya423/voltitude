import { DT, latCap, steerTo } from './drive.js';
import { racingLine } from './line.js';
import { LIM_BAND } from './circuit.js';
import { rng } from './drivers.js';

const lines = new WeakMap();
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const SPACE = 3.2;
const AIR_DECIDE = 200, AIR_GAS = 0.55, AIR_TOP = 85;

export function lineFor(track) {
  let l = lines.get(track);
  if (!l) {
    l = racingLine(track);
    l.zoneAt = new Int32Array(track.lap).fill(-1);
    l.zones.forEach((z, k) => { for (let d = 1; d <= 40; d++) l.zoneAt[(z.from - d + track.lap) % track.lap] = k; });
    lines.set(track, l);
  }
  return l;
}

export function createDriver(profile, seed) {
  const rand = rng(seed);
  const gauss = () => {
    let s = 0;
    for (let k = 0; k < 4; k++) s += rand();
    return (s - 2) * 1.7;
  };
  const jitter = 1 + (rand() - 0.5) * 0.024;
  return {
    p: profile, rand, gauss,
    pace: profile.skill * jitter,
    react: 22 + Math.round(rand() * 26),
    late: 3 + profile.aggr * 11,
    bias: 0, goal: 0, passing: -1, side: 0,
    noise: 0, zone: -1, slip: 1, slipUntil: -1, pinned: 0, back: 0,
    reserve: 0.42 - 0.3 * (profile.boost ?? 0.7), windows: Math.round(2 + 5 * (profile.boost ?? 0.7)),
    use: null, hold: 0, clear: 0,
  };
}

function airLine(track, e, d) {
  const N = track.lap, hint = e.car.hint;
  for (let k = 0; k < track.airs.length; k++) {
    const sp = track.airs[k], at = (hint - sp.lip + N) % N;
    if (at > (sp.to - sp.lip + N) % N && at < N - AIR_DECIDE) continue;
    if (d.air?.k !== k) {
      const go = !e.done && e.car.gas >= AIR_GAS && d.rand() < (d.p.nerve ?? 0);
      d.air = { k, go, miss: go && d.rand() < d.p.error * (1 - (d.p.craft ?? 0.5)) };
      if (go) e.airLines = (e.airLines || 0) + 1;
    }
    d.air.before = at > N / 2;
    return d.air;
  }
  d.air = null;
  return null;
}

function others(race, e) {
  return race.entries.filter((o) => o !== e);
}

function windowsFor(d, L, N) {
  if (d.use) return d.use;
  d.use = new Uint8Array(N);
  for (const w of L.exits.slice(0, d.windows)) for (let i = w.from; i !== w.to; i = (i + 1) % N) d.use[i] = 1;
  return d.use;
}

function wantBoost(race, e, L, vt) {
  const { track } = race.world;
  const N = track.lap, c = e.car, d = e.driver, hint = c.hint, sp = c.speed;
  if (c.mode !== 1 || c.gas < 0.03) { d.hold = 0; return false; }
  if (d.hold > 0) { d.hold--; return sp < vt + 4; }
  const straight = Math.abs(track.curv[(hint + 25) % N]) < 0.0025 && Math.abs(track.curv[hint]) < 0.0035;
  let want = false;
  if (race.raceTick < d.react + 170 && sp < 34) want = c.gas > 0.45;
  else if (straight && sp < vt - 3) {
    const attack = d.passing >= 0 && e.prog < race.entries[d.passing].prog + 40;
    let defend = false;
    for (const o of race.entries) {
      if (o === e || o.done) continue;
      const gap = e.prog - o.prog;
      if (gap > 3 && gap < 16 && o.car.speed > sp - 4 && o.pos > e.pos && d.p.aggr + d.p.boost * 0.4 > 0.8) defend = true;
    }
    if (windowsFor(d, L, N)[hint] && c.gas > d.reserve) want = true;
    else if (attack && c.gas > d.reserve * 0.4) want = true;
    else if (defend && c.gas > 0.35) want = true;
  }
  if (want) d.hold = 36;
  return want;
}

export function drive(race, e, inp) {
  const { track } = race.world;
  const L = lineFor(track), N = track.lap, c = e.car, d = e.driver;
  const sp = c.speed, hint = c.hint;
  inp.pitch = 0; inp.roll = 0; inp.reset = 0; inp.boost = 0;
  if (race.raceTick < d.react) { inp.throttle = 0; inp.brake = 0; inp.steer = 0; return inp; }

  const lim = (i) => track.halfW[i] - LIM_BAND - 1.2;
  const done = e.done;
  const pace = done ? 0.45 : d.pace;

  let goal = 0, follow = 999, beside = null;
  if (!done) {
    for (const o of others(race, e)) {
      const gap = o.prog - e.prog;
      if (gap < -9 || gap > 38) continue;
      const oi = (hint + Math.round(Math.max(gap, 0))) % N;
      const lat = o.car.lat;
      const there = L.off[oi] + d.bias;
      const dl = lat - c.lat;
      if (Math.abs(gap) < 5.5) {
        if (Math.abs(dl) < 2.7) goal += (dl > 0 ? -1 : 1) * (2.7 - Math.abs(dl)) * 0.9;
        if (Math.abs(dl) < SPACE + 0.5 && (!beside || Math.abs(dl) < Math.abs(beside.car.lat - c.lat))) beside = o;
        continue;
      }
      if (gap > 0 && Math.abs(lat - there) < 2.6) {
        const closing = sp - o.car.speed;
        if (d.passing !== o.index && gap < 28 && closing > -4) {
          const room = lim(oi);
          const right = lat + 3.1 <= room, left = lat - 3.1 >= -room;
          const bend = track.curv[(hint + 40) % N];
          const prefer = bend > 0.004 ? 1 : bend < -0.004 ? -1 : lat > 0 ? -1 : 1;
          d.side = right && left ? prefer : right ? 1 : left ? -1 : 0;
          d.passing = d.side ? o.index : -1;
        }
        if (!d.side || d.passing !== o.index) follow = Math.min(follow, o.car.speed + 1.5 + (gap - 8) * 0.25);
        else if (gap < 6 && Math.abs(d.bias) < 1.2 && d.p.aggr < 0.5) follow = Math.min(follow, o.car.speed + 3);
      }
    }
    if (d.passing >= 0) {
      const o = race.entries[d.passing];
      const gap = o ? o.prog - e.prog : -99;
      if (!o || gap < -8 || gap > 40) { d.passing = -1; d.side = 0; }
      else goal += clamp(o.car.lat + d.side * 3.1 - (L.off[hint] + d.bias), -6, 6);
    }
  }
  d.goal = goal;
  d.bias += clamp(goal - d.bias, -1, 1) * 2.5 * DT;
  d.bias = clamp(d.bias, -6, 6);

  let target = clamp(L.off[hint] + d.bias, -lim(hint), lim(hint));
  if (beside) {
    const ol = beside.car.lat, room = lim(hint) + 1.5;
    if (Math.abs(target - ol) < SPACE) target = clamp(ol + (c.lat > ol ? SPACE : -SPACE), -room, room);
    if (Math.abs(c.lat - ol) < 2.6 && beside.prog > e.prog) follow = Math.min(follow, beside.car.speed - 1.5);
  }
  const air = track.airs?.length ? airLine(track, e, d) : null;
  const aim = air?.go && air.before;
  if (aim) target = 0;
  d.target = target;
  const slope = aim ? 0 : (L.off[(hint + 2) % N] - L.off[(hint - 2 + N) % N]) / 4;
  d.noise += d.gauss() * 0.02 * d.p.error - d.noise * 0.6 * DT;
  const kc = track.curv[(hint + Math.round(2 + sp * 0.12)) % N];
  inp.steer = clamp(steerTo(c, track, target, slope, kc / Math.max(0.3, 1 - kc * target)) + d.noise);

  const z = L.zoneAt[hint];
  if (z >= 0 && z !== d.zone && !done) {
    d.zone = z;
    const zone = L.zones[z];
    if (zone.vIn - zone.vOut > 18 && d.rand() < d.p.error * 0.6) { d.slip = 1.05 + d.rand() * 0.07; d.slipUntil = (zone.to + 30) % N; }
  }
  if (z < 0 && d.zone >= 0 && hint === ((L.zones[d.zone].from) % N)) d.zone = -1;
  if (d.slip !== 1 && ((hint - d.slipUntil + N) % N < N / 2)) d.slip = 1;

  const vi = (hint + Math.round(d.late * (d.slip === 1 ? 1 : 2))) % N;
  let vt = Math.min(L.cap[hint], L.cap[vi]) * pace * d.slip;
  if (follow < vt) vt = Math.max(follow, 5);
  const yaw = -(c.ox * c.ux + c.oy * c.uy + c.oz * c.uz);
  const spare = track.loopMask[hint] || c.uy < 0.8 ? 1 : Math.sqrt(Math.max(0.1, 1 - Math.min(1, Math.abs(yaw * sp) / latCap(sp)) ** 2));
  inp.throttle = clamp((vt - sp) / 2.5, 0, 1) * spare;
  inp.brake = sp > vt + 0.6 ? clamp((sp - vt) / 4, 0, 1) : 0;
  if (inp.brake > 0) inp.throttle = 0;
  d.pinned = sp < 1.5 && Math.abs(c.lat) > track.halfW[hint] - 3.5 ? d.pinned + 1 : 0;
  if (d.pinned > 60) d.back = 150;
  if (d.back > 0) {
    d.back--;
    inp.throttle = 0; inp.brake = 1; inp.steer = 0;
  }
  d.clear = follow > sp + 3 ? d.clear + 1 : 0;
  if (!d.clear) d.hold = 0;
  inp.boost = !done && inp.brake === 0 && (d.clear > 120 || (d.clear > 0 && race.raceTick < d.react + 170)) && wantBoost(race, e, L, vt) ? 1 : 0;
  if (air?.before) {
    inp.boost = 0;
    if (air.go && c.mode === 1 && Math.abs(track.curv[hint]) < 0.012) {
      inp.throttle = 1; inp.brake = 0;
      inp.boost = sp < AIR_TOP ? 1 : 0;
    }
  } else if (air && c.mode === 0) {
    const vx = c.vx - c.ux * (c.vx * c.ux + c.vy * c.uy + c.vz * c.uz), vz = c.vz - c.uz * (c.vx * c.ux + c.vy * c.uy + c.vz * c.uz);
    const psi = Math.atan2(vx * c.rx + vz * c.rz, vx * c.fx + vz * c.fz);
    inp.steer = clamp((psi * 3) / 2.4);
    inp.pitch = air.miss ? 1 : 0;
    inp.throttle = 1; inp.brake = 0; inp.boost = 0;
  }
  return inp;
}
