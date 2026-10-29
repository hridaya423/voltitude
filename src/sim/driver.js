import { DT, TUNING, accelAt, brakeAt, latCap, steerTo, cornerSpeed } from './drive.js';
import { racingLine, groundLane, LIP_SPEED } from './line.js';
import { LIM_BAND } from './circuit.js';
import { rng } from './drivers.js';

const lines = new WeakMap();
const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const SPACE = 3.2, WIDTH = 3, NEAR = 20, FOLLOW = 7, FOLLOW_DECEL = 7, TUCK = 16;
const PASS_NEAR = 10, PASS_FAR = 25, PASS_OFF = 3.6, ATTACK_GAP = 12, PLAYER_LATE = 6;
const CLOSE_T = 0.5, SETTLE = 60, SHIFT_V = 2.5, SHIFT_ACC = 4, BIAS_EDGE = 1.2, PREVIEW = 0.3, OFF_LINE = 2, OFF_GRIP = 0.81;
const DEFEND_GAP = 0.6, DEFEND_T = 120, DEFEND_REST = 480;
const AIR_DECIDE = 200, AIR_TOP = 85, AIR_RESERVE = 0.08, AIR_MIN = 62, AIR_SURE = 66, AIR_STRAIGHT = 0.012, AIR_ACCEL = 0.8, LAUNCH = 40, LIFT = 15, AIR_SAVE = 0.6, BLOCK_GAP = 60, BLOCK_CLOSING = 5;

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

export function createDriver(profile, seed, scale = 1) {
  const rand = rng(seed);
  const gauss = () => {
    let s = 0;
    for (let k = 0; k < 4; k++) s += rand();
    return (s - 2) * 1.7;
  };
  const jitter = 1 + (rand() - 0.5) * 0.024;
  return {
    p: profile, rand, gauss,
    pace: profile.skill * jitter * scale,
    react: 22 + Math.round(rand() * 26),
    late: 3 + profile.aggr * 11,
    bias: 0, drift: 0, goal: 0, passing: -1, side: 0, defend: 0, defendSide: 0, defendNext: 0,
    noise: 0, zone: -1, slip: 1, slipUntil: -1, pinned: 0, back: 0,
    reserve: 0.42 - 0.3 * (profile.boost ?? 0.7), windows: Math.round(2 + 5 * (profile.boost ?? 0.7)),
    use: null, hold: 0, clear: 0, daring: rand(), land: 0,
  };
}

function lipSpeed(track, c, toLip) {
  let v = Math.max(c.speed, 5), gas = c.gas;
  for (let x = 0; x < toLip; x += 2) {
    const boost = gas > AIR_RESERVE && v < AIR_TOP && Math.abs(track.curv[(c.hint + x) % track.lap]) < AIR_STRAIGHT;
    if (boost) gas -= 2 / v / TUNING.burn;
    v = Math.sqrt(v * v + 4 * AIR_ACCEL * Math.max(0, accelAt(v) + (boost ? TUNING.thrustG * 9.81 : 0)));
  }
  return v;
}

function airLine(track, e, d) {
  const N = track.lap, hint = e.car.hint;
  for (let k = 0; k < track.airs.length; k++) {
    const sp = track.airs[k], at = (hint - sp.lip + N) % N;
    if (at > (sp.to - sp.lip + N) % N && at < N - AIR_DECIDE) continue;
    if (d.air?.k !== k) {
      const go = !e.done && planFor(track, d, hint).want && lipSpeed(track, e.car, (sp.lip - hint + N) % N) >= AIR_SURE;
      d.air = { k, go, miss: go && d.rand() < d.p.error * (1 - (d.p.craft ?? 0.5)) };
      if (go) e.airCommits = (e.airCommits || 0) + 1;
    }
    d.air.before = at > N / 2;
    const c = e.car, toLip = N - at;
    if (d.air.go && d.air.before && canAbort(c, toLip) && lipSpeed(track, c, toLip) < AIR_MIN) d.air.go = false;
    return d.air;
  }
  d.air = null;
  planFor(track, d, hint);
  return null;
}

function canAbort(c, toLip) {
  return c.speed * c.speed - LIP_SPEED * LIP_SPEED < 1.6 * brakeAt(c.speed) * toLip;
}

function planFor(track, d, hint) {
  const N = track.lap;
  let k = 0;
  for (let j = 1; j < track.airs.length; j++) if ((track.airs[j].lip - hint + N) % N < (track.airs[k].lip - hint + N) % N) k = j;
  if (d.plan?.k !== k) {
    d.daring += d.p.nerve ?? 0;
    d.plan = { k, want: d.daring >= 1 };
    if (d.plan.want) d.daring -= 1;
  }
  return d.plan;
}

function straightTo(track, from, to) {
  for (let i = from; i !== to; i = (i + 1) % track.lap) if (Math.abs(track.curv[i]) > AIR_STRAIGHT) return false;
  return true;
}

function latSpeed(track, c) {
  const k = c.hint * 3;
  return c.vx * track.R[k] + c.vy * track.R[k + 1] + c.vz * track.R[k + 2];
}

function keepBack(speed, gap, keep) {
  return gap < keep ? speed + (gap - keep) * 0.35 : Math.sqrt(speed ** 2 + 2 * FOLLOW_DECEL * (gap - keep));
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

function attacking(race, e) {
  const rival = race.entries[e.driver.passing];
  return !!rival && rival.prog - e.prog < ATTACK_GAP && Math.abs(rival.car.lat - e.car.lat) >= WIDTH;
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
    const attack = attacking(race, e);
    let defend = false;
    for (const o of race.entries) {
      if (o === e || o.done) continue;
      const gap = e.prog - o.prog;
      if (gap > 3 && gap < 16 && o.car.speed > sp - 4 && o.pos > e.pos && d.p.aggr + d.p.boost * 0.4 > 0.8) defend = true;
    }
    const save = d.plan?.want ? AIR_SAVE : 0;
    if (windowsFor(d, L, N)[hint] && c.gas > Math.max(d.reserve, save)) want = true;
    else if (attack && c.gas > Math.max(d.reserve * 0.4, save)) want = true;
    else if (defend && c.gas > Math.max(0.35, save)) want = true;
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

  const air = track.airs?.length ? airLine(track, e, d) : null;
  const aim = air?.go && air.before, runup = !!air?.before;
  let goal = 0, follow = 999, beside = null, besideNear = 0;
  const straight = Math.abs(track.curv[(hint + 30) % N]) < 0.0025 && Math.abs(track.curv[(hint + 60) % N]) < 0.0025;
  const braking = sp > L.cap[(hint + 45) % N] * pace + 3;
  let chaser = false, blocked = false;
  const k3 = hint * 3;
  for (const o of others(race, e)) {
    const along = o.prog - e.prog;
    const gap = Math.abs(along) < NEAR ? (o.car.x - c.x) * track.T[k3] + (o.car.y - c.y) * track.T[k3 + 1] + (o.car.z - c.z) * track.T[k3 + 2] : along;
    if (gap < -sp * DEFEND_GAP || gap > Math.max(38, FOLLOW + (sp * sp) / (2 * FOLLOW_DECEL))) continue;
    const oi = (hint + Math.round(Math.max(gap, 0))) % N;
    const lat = o.car.lat;
    const there = L.off[oi] + d.bias;
    const dl = lat - c.lat;
    if (Math.abs(gap) < 5.5) {
      if (Math.abs(dl) < 2.7 && !aim) goal += (dl > 0 ? -1 : 1) * (2.7 - Math.abs(dl)) * 0.9;
      const soon = dl + (latSpeed(track, o.car) - latSpeed(track, c)) * CLOSE_T;
      const near = Math.sign(soon) === Math.sign(dl) ? Math.min(Math.abs(dl), Math.abs(soon)) : 0;
      if (near < SPACE + 0.5 && (!beside || near < besideNear)) { beside = o; besideNear = near; }
      continue;
    }
    if (gap < 0) { chaser = chaser || o.car.speed > sp - 2; continue; }
    const inPath = Math.abs(lat - there) < 2.6, overlap = Math.abs(dl) < WIDTH;
    if (!inPath && !overlap) continue;
    const closing = sp - o.car.speed;
    if (aim && overlap && gap < BLOCK_GAP && closing > BLOCK_CLOSING && !(o === race ? race.driver : o.driver)?.air?.go) blocked = true;
    if (!done && !runup && d.passing < 0 && closing > -4 && gap < (straight && closing < 6 ? TUCK : 28) && (!braking || d.late > (o === race ? PLAYER_LATE : o.driver.late))) {
      const room = lim(oi) - 1;
      const right = lat + PASS_OFF <= room, left = lat - PASS_OFF >= -room;
      const bend = track.curv[(hint + 40) % N];
      const prefer = bend > 0.004 ? 1 : bend < -0.004 ? -1 : lat > 0 ? -1 : 1;
      d.side = right && left ? prefer : right ? 1 : left ? -1 : 0;
      d.passing = d.side ? o.index : -1;
    }
    if (d.passing !== o.index || overlap) {
      follow = Math.min(follow, keepBack(o.car.speed, gap, FOLLOW));
    }
    if (!done && !runup && d.passing < 0 && straight && gap > FOLLOW && gap < 45 && Math.abs(closing) < 4) goal += clamp(lat - L.off[oi], -2, 2);
  }
  if (runup) { d.passing = -1; d.side = 0; }
  if (blocked && canAbort(c, (track.airs[air.k].lip - hint + N) % N)) air.go = false;
  if (d.passing >= 0) {
    const o = race.entries[d.passing];
    const gap = o ? o.prog - e.prog : -99;
    if (!o || gap < -8 || gap > 40) { d.passing = -1; d.side = 0; }
    else {
      goal += clamp((PASS_FAR - gap) / (PASS_FAR - PASS_NEAR), 0, 1) * clamp(o.car.lat + d.side * PASS_OFF - L.off[(hint + Math.round(Math.max(gap, 0))) % N], -6, 6);
      if (gap > 0 && Math.abs(o.car.lat + d.side * PASS_OFF) > lim(hint) - 0.5) follow = Math.min(follow, keepBack(o.car.speed, gap, FOLLOW));
    }
  }
  const corner = track.curv[(hint + 70) % N];
  if (!done && !runup && chaser && !beside && d.passing < 0 && !d.defend && race.tick >= d.defendNext && Math.abs(corner) > 0.004 && L.zoneAt[hint] >= 0) {
    d.defend = DEFEND_T; d.defendSide = Math.sign(corner); d.defendNext = race.tick + DEFEND_REST;
  }
  if (d.defend > 0 && !beside && !runup) goal += clamp(d.defendSide * (lim(hint) - 1) - L.off[(hint + 70) % N], -3, 3);
  if (d.defend > 0) d.defend--;
  d.goal = goal;
  const err = goal - d.bias, want = clamp(Math.sign(err) * Math.sqrt(2 * SHIFT_ACC * Math.abs(err)), -SHIFT_V, SHIFT_V);
  d.drift += clamp(want - d.drift, -SHIFT_ACC * DT, SHIFT_ACC * DT);
  d.bias += d.drift * DT;
  if (Math.abs(d.bias) > 6) { d.bias = clamp(d.bias, -6, 6); d.drift = 0; }
  if (air?.flown && !air.before && c.mode === 1 && air.lane === undefined) air.lane = straightTo(track, hint, track.airs[air.k].to) ? clamp(c.lat, -lim(hint), lim(hint)) : null;
  const landed = air?.lane != null && !air.before && c.mode === 1;
  if (landed) {
    d.bias = clamp(air.lane - L.off[hint], -6, 6);
    d.drift = 0;
  }

  const lane = (i) => {
    const edge = lim(i), off = L.off[i], raw = off + d.bias;
    const cap = Math.sign(raw) === Math.sign(d.bias) ? Math.max(edge - BIAS_EDGE, Math.sign(raw) === Math.sign(off) ? Math.abs(off) : 0) : edge;
    return clamp(raw, -cap, cap);
  };
  const toLip = air ? (track.airs[air.k].lip - hint + N) % N : -1;
  const launch = !!air && (toLip < LAUNCH || toLip > N - LIFT);
  let target = launch ? clamp(c.lat, -lim(hint), lim(hint)) : landed ? air.lane : aim ? clamp(-0.7 * groundLane(track, track.airs[air.k]) + d.bias, -lim(hint), lim(hint)) : lane(hint);
  let held = false;
  if (beside && !launch) {
    const ol = beside.car.lat, room = lim(hint) + 1.5;
    if (Math.abs(target - ol) < SPACE || (besideNear < SPACE && !aim)) {
      target = clamp(ol + (c.lat > ol ? SPACE : -SPACE), -room, room);
      held = !aim && !landed;
      if (held) { d.bias = clamp(target - L.off[hint], -6, 6); d.drift = 0; }
    }
    if (Math.abs(c.lat - ol) < WIDTH && beside.prog > e.prog) follow = Math.min(follow, beside.car.speed - 1.5);
  }
  d.target = target;
  const free = lane(hint) === L.off[hint] + d.bias;
  const ahead = Math.round(clamp(sp * PREVIEW, 2, 15));
  const slope = aim || launch || landed || held ? 0 : (lane((hint + ahead) % N) - lane((hint - 2 + N) % N)) / (ahead + 2) + (free ? d.drift / Math.max(sp, 8) : 0);
  d.noise += d.gauss() * 0.02 * d.p.error - d.noise * 0.6 * DT;
  const kc = track.curv[(hint + Math.round(2 + sp * 0.12)) % N];
  if (c.mode === 0) d.land = SETTLE; else if (d.land > 0) d.land--;
  const ease = c.mode === 1 ? d.land / SETTLE : 0;
  const aimAt = target + (c.lat - target) * ease, heading = slope + (latSpeed(track, c) / Math.max(sp, 8) - slope) * ease;
  inp.steer = clamp(steerTo(c, track, aimAt, heading, kc / Math.max(0.3, 1 - kc * aimAt)) + d.noise);

  const z = L.zoneAt[hint];
  if (z >= 0 && z !== d.zone && !done) {
    d.zone = z;
    const zone = L.zones[z];
    if (zone.vIn - zone.vOut > 18 && d.rand() < d.p.error * 0.6) { d.slip = 1.05 + d.rand() * 0.07; d.slipUntil = (zone.to + 30) % N; }
  }
  if (z < 0 && d.zone >= 0 && hint === ((L.zones[d.zone].from) % N)) d.zone = -1;
  if (d.slip !== 1 && ((hint - d.slipUntil + N) % N < N / 2)) d.slip = 1;

  const vi = (hint + Math.round(d.late * (d.slip === 1 ? 1 : 2))) % N;
  const arc = (i) => {
    const k = track.curv[i];
    if (landed) return cornerSpeed(k / Math.max(0.3, 1 - k * air.lane), OFF_GRIP);
    const off = Math.min(1, Math.abs(lane(i) - L.off[i]) / OFF_LINE);
    if (aim || launch || !off || c.uy < 0.8) return L.cap[i];
    return Math.min(L.cap[i], L.cap[i] * (1 - off) + off * cornerSpeed(k / Math.max(0.3, 1 - k * lane(i)), OFF_GRIP));
  };
  let vt = Math.min(arc(hint), arc(vi)) * pace * d.slip;
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
  const attack = attacking(race, e);
  if ((!d.clear && !attack) || inp.brake > 0) d.hold = 0;
  inp.boost = !done && inp.brake === 0 && (d.clear > 120 || attack || race.raceTick < d.react + 170) && wantBoost(race, e, L, vt) ? 1 : 0;
  if (air?.before) {
    inp.boost = 0;
    if (air.go && c.mode === 1 && Math.abs(track.curv[hint]) < AIR_STRAIGHT) {
      inp.throttle = 1; inp.brake = 0;
      inp.boost = sp < AIR_TOP && c.gas > AIR_RESERVE + (c.boosting ? 0 : 0.04) ? 1 : 0;
    }
  } else if (air && c.mode === 0) {
    if (air.go && !air.flown) { air.flown = true; e.airLines = (e.airLines || 0) + 1; }
    const vx = c.vx - c.ux * (c.vx * c.ux + c.vy * c.uy + c.vz * c.uz), vz = c.vz - c.uz * (c.vx * c.ux + c.vy * c.uy + c.vz * c.uz);
    const psi = Math.atan2(vx * c.rx + vz * c.rz, vx * c.fx + vz * c.fz);
    inp.steer = clamp((psi * 3) / 2.4);
    inp.pitch = air.miss ? 1 : 0;
    inp.throttle = 1; inp.brake = 0; inp.boost = 0;
  }
  return inp;
}
