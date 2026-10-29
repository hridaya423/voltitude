import { createCar, placeCar, stepCar, DT } from './drive.js';
import { ROSTER, PLAYER, rng } from './drivers.js';
import { createDriver, drive, lineFor } from './driver.js';
import { resolveContacts, clearance } from './contact.js';
import { GAIN, earn, flushGains, landingGain } from './gas.js';
import { trackLimits, MIN_GAIN, PACE } from './limits.js';

export const SIM_VERSION = 13;
export const TIERS = Object.freeze({ easy: 0.94, pro: 0.98, elite: 1 });
export const COUNTDOWN = 240;
export const lightTick = (n) => -220 + 40 * (n - 1);
const CP_RADIUS = 45;
const GRID_SLOT = 5;
const NEAR = 1, NEAR_SPEED = 8, NEAR_EVERY = 360;
const DRAFT_NEAR = 4, DRAFT_FAR = 14, DRAFT_LAT = 1.6, DRAFT_SPEED = 40;
const TOW = 0.2, TOW_FULL = 8, TOW_FAR = 25, TOW_LAT = 2.5, TOW_SPEED = 30;
const HOLD = 600;
const RESPAWN_GAS = 0.15;
const STILL = 240, SINK = 6, AIR_RUNUP = 100;
const IDLE = { throttle: 0, brake: 0.3, steer: 0, pitch: 0, roll: 0, boost: 0, lift: 0, reset: 0 };

export function quantize(v) {
  return Math.max(-127, Math.min(127, Math.round(v * 127)));
}

export function createInput() {
  return { throttle: 0, brake: 0, steer: 0, pitch: 0, roll: 0, boost: 0, lift: 0, reset: 0 };
}

export function packInput(inp, out, o) {
  out[o] = quantize(inp.throttle); out[o + 1] = quantize(inp.brake); out[o + 2] = quantize(inp.steer);
  out[o + 3] = quantize(inp.pitch); out[o + 4] = Math.sign(inp.roll) | 0;
  out[o + 5] = (inp.boost ? 1 : 0) | (inp.reset ? 2 : 0) | (inp.lift ? 4 : 0);
}

export function unpackInput(buf, o, inp) {
  inp.throttle = buf[o] / 127; inp.brake = buf[o + 1] / 127; inp.steer = buf[o + 2] / 127;
  inp.pitch = buf[o + 3] / 127; inp.roll = buf[o + 4];
  inp.boost = buf[o + 5] & 1; inp.reset = (buf[o + 5] >> 1) & 1; inp.lift = (buf[o + 5] >> 2) & 1;
  return inp;
}

export function eventsFor(track) {
  if (track.closed) {
    const perLap = [...track.cps, track.lap];
    const mode = (id, card, name, kind, laps) => ({
      id, card, name, kind, laps, from: 0, to: track.lap, gas: 1, circuit: true, perLap: perLap.length,
      cps: Array.from({ length: laps }, () => perLap).flat(),
    });
    return [mode('gp', 1, 'Grand Prix', 'gp', 3), mode('tt', 2, 'Time Trial', 'tt', 3), mode('pr', 3, 'Practice', 'pr', 99)];
  }
  const { sectors, cps, finish } = track;
  const list = sectors.map((s, k) => {
    const to = k + 1 < sectors.length ? sectors[k + 1].i : finish;
    return { id: `s${k + 1}`, card: k + 2, name: s.name, from: s.i, to, gas: 1 };
  });
  list.unshift({ id: 'full', card: 1, name: 'Full Run', from: sectors[0].i, to: finish, gas: 1 });
  for (const e of list) e.cps = cps.filter((i) => i > e.from && i < e.to).concat(e.to);
  return list;
}

export function gridSlot(track, slot) {
  const row = slot >> 1, side = slot & 1;
  return { i: track.lap - 12 - row * 11 - side * 5.5 | 0, lat: side ? 3.2 : -3.2 };
}

function initEntry(e, world, event, slot) {
  const { track } = world;
  const car = createCar();
  const g = track.closed ? gridSlot(track, slot) : { i: event.from + 1, lat: 0 };
  placeCar(car, track, g.i, 0, g.lat);
  car.gas = event.gas;
  const hint = car.hint;
  return Object.assign(e, {
    car, next: 0, splits: [], lastIdx: g.i, lastSpeed: 0, cpIdx: g.i, cpSpeed: 0, used: new Set(), respawnIn: 0, lost: 0, resetHeld: false,
    wrecks: 0, respawns: 0, tricks: 0, maxSpeed: 0, airTime: 0, still: 0, earned: {}, gateLaps: [],
    limits: { w: -1 }, pace: 1, penalty: 0, invalid: [], breaches: [],
    done: false, total: 0, laps: [], lapStart: 0, prog: track.closed && hint > track.lap / 2 ? hint - track.lap : hint, lastHint: hint,
    pos: slot + 1, grid: slot + 1,
  });
}

export function createRace(world, { event, assist = true, seed = 1, tier = 'pro' }) {
  const { track } = world;
  const race = initEntry({
    world, event, assist, seed, tier, tick: 0, raceTick: -COUNTDOWN, phase: 'countdown',
    events: [], gasPending: {}, index: 0, swaps: 0, passes: 0, contacts: 0, finished: 0, identity: PLAYER,
  }, world, event, event.kind === 'gp' ? GRID_SLOT : 0);
  race.entries = [race];
  race.order = [race];
  race.rel = new Map();
  race.held = new Map();
  if (track.closed && event.kind === 'gp') {
    const slots = [0, 1, 2, 3, 4, 5, 6, 7].filter((s) => s !== GRID_SLOT), draw = rng(seed * 2246822519 + 1);
    for (let n = slots.length - 1; n > 0; n--) {
      const m = Math.floor(draw() * (n + 1));
      [slots[n], slots[m]] = [slots[m], slots[n]];
    }
    ROSTER.forEach((profile, k) => {
      const e = initEntry({ world, event, index: k + 1, identity: profile }, world, event, slots[k]);
      e.driver = createDriver(profile, seed * 7919 + k * 104729, TIERS[tier]);
      e.pace = e.driver.pace / PACE;
      race.entries.push(e);
    });
    race.order = race.entries.slice().sort((a, b) => a.grid - b.grid);
  }
  if (track.closed) lineFor(track);
  return race;
}

function emit(race, type, extra) {
  race.events.push(Object.assign({ type, tick: race.tick }, extra));
}

function safeAt(track, i) {
  if (track.U[i * 3 + 1] <= 0.95 || track.gap[i] || track.loopMask[i] || track.air?.[i] || track.air?.[(i + AIR_RUNUP) % track.lap]) return false;
  return !track.jumps.some((j) => i >= j.from && i <= j.to);
}

function respawn(race, e, from = e.lastIdx, fromSpeed = e.lastSpeed) {
  const { track } = race.world;
  const c = e.car;
  let i = from;
  for (let n = 0; n < track.lap && !safeAt(track, i); n++) i = (i + track.lap - 1) % track.lap;
  const speed = Math.min(fromSpeed, safeAt(track, c.hint) ? 90 : 45);
  placeCar(c, track, i, speed, e.driver ? lineFor(track).off[i] : 0);
  c.gas = Math.max(c.gas, RESPAWN_GAS);
  e.lost = 0; e.respawnIn = 0; e.respawns++; e.still = 0;
  e.lastIdx = i;
  progress(race, e);
  if (e === race) emit(race, 'respawn');
}

function progress(race, e) {
  const { track } = race.world;
  if (!track.closed) { e.prog = e.car.hint; return; }
  const N = track.lap;
  let d = e.car.hint - e.lastHint;
  if (d > N / 2) d -= N; else if (d < -N / 2) d += N;
  e.prog += d;
  e.lastHint = e.car.hint;
}

function finishEntry(race, e) {
  e.done = true;
  e.total = race.raceTick + Math.round(e.penalty * 120);
  e.finishPos = ++race.finished;
  if (e === race) { race.phase = 'finished'; emit(race, 'finish', { t: e.total }); }
}

function stepEntry(race, e, inp) {
  const { track } = race.world;
  const c = e.car;
  const px = c.x, py = c.y, pz = c.z, prevHint = c.hint;
  stepCar(c, inp, race.world, race.tick, race.assist);
  if (e.done) { c.ev.length = 0; progress(race, e); return; }
  for (const ev of c.ev) {
    if (e === race) {
      emit(race, ev.type, ev);
      if (ev.type === 'land' && ev.tricks.length) e.tricks += ev.tricks.length;
    }
    if (ev.type === 'land') landingGain(race, e, ev);
    if (ev.type === 'wreck') e.wrecks++;
  }
  c.ev.length = 0;
  if (c.mode === 0) e.airTime++;
  e.maxSpeed = Math.max(e.maxSpeed, c.speed);
  progress(race, e);
  if (track.gates?.length) gatePasses(race, e, px, py, pz);

  if (e === race && c.mode === 1) {
    for (const p of track.pads) {
      if (p.type !== 'boost' || p.i <= race.event.from || p.i >= race.event.to || e.used.has(p.i)) continue;
      if (prevHint < p.i && c.hint >= p.i && Math.abs(c.lat) < 7) {
        e.used.add(p.i);
        const k = 14 / Math.max(c.speed, 1) + 1;
        c.vx *= k; c.vy *= k; c.vz *= k;
        emit(race, 'pad');
      }
    }
  }

  const k = c.hint * 3;
  const off = Math.hypot(c.x - track.H[k], c.y - track.H[k + 1], c.z - track.H[k + 2]);
  const sunk = c.mode === 2 && c.y < track.H[k + 1] - SINK;
  const span = track.air?.[c.hint];
  e.lost = (off > CP_RADIUS && !(span && c.mode === 0)) || sunk || (span && c.mode === 2) || (c.mode === 0 && c.air > 120 * 7) ? e.lost + 1 : 0;
  e.still = race.raceTick > 360 && c.speed < 2 ? e.still + 1 : 0;
  const held = !track.closed || c.speed <= lineFor(track).cap[c.hint] * 1.1 + 3;
  if (c.mode === 1 && !e.lost && !c.wrecked && held && safeAt(track, c.hint)) { e.lastIdx = c.hint; e.lastSpeed = c.speed; }
  if (c.wrecked && !e.respawnIn) e.respawnIn = 70;
  if (e.respawnIn && --e.respawnIn === 0) respawn(race, e);
  else if (e.lost > 60 || e.still > STILL) respawn(race, e);

  if (track.closed && race.phase === 'racing') {
    const breach = trackLimits(race, e, e === race);
    if (breach) e.breaches.push(breach);
    if (breach?.gain >= MIN_GAIN) {
      const gp = race.event.kind === 'gp';
      if (gp) e.penalty += breach.gain;
      else if (!e.invalid.includes(e.laps.length)) e.invalid.push(e.laps.length);
      if (e === race) emit(race, 'track_limits', { gain: breach.gain, penalty: gp });
    }
  }

  const cp = race.event.cps[e.next];
  const q = cp * 3;
  const d0 = (px - track.H[q]) * track.T[q] + (py - track.H[q + 1]) * track.T[q + 1] + (pz - track.H[q + 2]) * track.T[q + 2];
  const d1 = (c.x - track.H[q]) * track.T[q] + (c.y - track.H[q + 1]) * track.T[q + 1] + (c.z - track.H[q + 2]) * track.T[q + 2];
  if (d0 < 0 && d1 >= 0 && Math.hypot(c.x - track.H[q], c.y - track.H[q + 1], c.z - track.H[q + 2]) < CP_RADIUS) {
    e.splits.push(race.raceTick);
    e.cpIdx = track.closed ? (cp + 2) % track.lap : Math.min(cp + 2, track.n - 2);
    e.cpSpeed = Math.min(c.speed, 90);
    e.next++;
    const lapEnd = race.event.perLap && e.next % race.event.perLap === 0;
    if (lapEnd) {
      const t = race.raceTick - e.lapStart;
      e.laps.push(t);
      e.lapStart = race.raceTick;
      if (e === race) emit(race, 'lap', { lap: e.laps.length, t, invalid: e.invalid.includes(e.laps.length - 1) });
    }
    if (e.next >= race.event.cps.length) finishEntry(race, e);
    else if (e === race) emit(race, 'check', { index: e.splits.length - 1, t: race.raceTick });
  }
}

function gatePasses(race, e, px, py, pz) {
  const { H, U, T, gates } = race.world.track, c = e.car;
  for (let g = 0; g < gates.length; g++) {
    if (e.gateLaps[g] === e.laps.length) continue;
    const { i, h, r } = gates[g], k = i * 3;
    const cx = H[k] + U[k] * h, cy = H[k + 1] + U[k + 1] * h, cz = H[k + 2] + U[k + 2] * h;
    const d0 = (px - cx) * T[k] + (py - cy) * T[k + 1] + (pz - cz) * T[k + 2];
    const d1 = (c.x - cx) * T[k] + (c.y - cy) * T[k + 1] + (c.z - cz) * T[k + 2];
    if (d0 >= 0 || d1 < 0) continue;
    const f = d0 / (d0 - d1);
    if (Math.hypot(px + (c.x - px) * f - cx, py + (c.y - py) * f - cy, pz + (c.z - pz) * f - cz) > r) continue;
    e.gateLaps[g] = e.laps.length;
    earn(race, e, 'gate', GAIN.gate);
    if (e === race) emit(race, 'gate', { index: g });
  }
}

export function nearMisses(race) {
  const { entries } = race;
  race.near ||= entries.map(() => entries.map(() => ({ close: false, touched: false, rel: 0, last: -NEAR_EVERY })));
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i].car, b = entries[j].car, s = race.near[i][j];
      const gap = clearance(a, b);
      if (gap < NEAR || (s.close && gap < NEAR + 0.5)) {
        s.close = true;
        if (gap <= 0) s.touched = true;
        s.rel = Math.max(s.rel, Math.hypot(a.vx - b.vx, a.vy - b.vy, a.vz - b.vz));
        continue;
      }
      if (s.close && !s.touched && s.rel > NEAR_SPEED && race.tick - s.last >= NEAR_EVERY) {
        s.last = race.tick;
        if (i === 0) emit(race, 'near_miss', { v: s.rel, other: j });
        earn(race, entries[i], 'near_miss', GAIN.near_miss);
        earn(race, entries[j], 'near_miss', GAIN.near_miss);
      }
      s.close = false; s.touched = false; s.rel = 0;
    }
  }
}

function towFor(race, e) {
  const { track } = race.world;
  const a = e.car, k = a.hint * 3;
  if (a.speed <= TOW_SPEED || a.mode !== 1) return 0;
  let tow = 0;
  for (const o of race.entries) {
    if (o === e) continue;
    const dx = o.car.x - a.x, dy = o.car.y - a.y, dz = o.car.z - a.z;
    const ahead = dx * track.T[k] + dy * track.T[k + 1] + dz * track.T[k + 2];
    const side = Math.abs(dx * track.R[k] + dy * track.R[k + 1] + dz * track.R[k + 2]);
    if (ahead < DRAFT_NEAR || ahead > TOW_FAR || side > TOW_LAT) continue;
    tow = Math.max(tow, TOW * Math.min(1, (TOW_FAR - ahead) / (TOW_FAR - TOW_FULL)) * (1 - side / TOW_LAT));
  }
  return tow;
}

function drafting(race, e) {
  const { track } = race.world;
  const a = e.car, k = a.hint * 3;
  if (a.speed <= DRAFT_SPEED) return false;
  for (const o of race.entries) {
    if (o === e) continue;
    const dx = o.car.x - a.x, dy = o.car.y - a.y, dz = o.car.z - a.z;
    const ahead = dx * track.T[k] + dy * track.T[k + 1] + dz * track.T[k + 2];
    const side = dx * track.R[k] + dy * track.R[k + 1] + dz * track.R[k + 2];
    if (ahead > DRAFT_NEAR && ahead < DRAFT_FAR && Math.abs(side) < DRAFT_LAT) return true;
  }
  return false;
}

function streaks(race) {
  for (const e of race.entries) {
    if (e.done) continue;
    const c = e.car;
    if (c.fan > 0.2 && c.speed > 30) earn(race, e, 'wall', GAIN.wall * DT);
    if (drafting(race, e)) earn(race, e, 'draft', GAIN.draft * DT);
  }
  flushGains(race);
}

function rank(race) {
  const order = race.order, entries = race.entries;
  if (entries.length === 1) return;
  order.sort((a, b) => (a.done !== b.done ? (a.done ? -1 : 1) : a.done ? a.total - b.total || a.finishPos - b.finishPos : b.prog - a.prog) || a.index - b.index);
  order.forEach((e, k) => { e.pos = k + 1; });
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const gap = entries[i].prog - entries[j].prog;
      if (Math.abs(gap) < 4 || entries[i].done || entries[j].done) continue;
      const key = i * 8 + j, sign = Math.sign(gap), was = race.rel.get(key);
      race.rel.set(key, sign);
      if (was !== undefined && was !== sign) {
        const winner = sign > 0 ? entries[i] : entries[j], loser = sign > 0 ? entries[j] : entries[i];
        race.swaps++;
        race.held.set(key, { winner, sign, tick: race.tick });
        if (winner === race || loser === race) emit(race, 'pass', { gained: winner === race, other: (winner === race ? loser : winner).index });
      }
    }
  }
  for (const [key, h] of race.held) {
    if (race.rel.get(key) !== h.sign) race.held.delete(key);
    else if (race.tick - h.tick >= HOLD) { h.winner.passes = (h.winner.passes || 0) + 1; race.held.delete(key); }
  }
}

export function stepRace(race, inp) {
  race.tick++;
  race.raceTick++;
  const c = race.car;
  if (race.phase === 'countdown') {
    if (race.raceTick === 0) { race.phase = 'racing'; emit(race, 'go'); }
    else {
      for (let n = 1; n <= 5; n++) if (race.raceTick === lightTick(n)) emit(race, 'light', { n });
      c.throttle = inp.throttle;
      return;
    }
  }
  if (race.phase === 'racing') {
    if (inp.reset && !race.resetHeld) respawn(race, race, race.cpIdx, race.cpSpeed);
    race.resetHeld = !!inp.reset;
  }
  const rivals = race.entries;
  if (rivals.length > 1) for (const e of rivals) e.car.tow = towFor(race, e);
  stepEntry(race, race, race.phase === 'racing' ? inp : IDLE);
  for (let k = 1; k < rivals.length; k++) {
    const e = rivals[k];
    stepEntry(race, e, drive(race, e, e.input || (e.input = createInput())));
  }
  if (rivals.length > 1) {
    resolveContacts(rivals, (i, j, v) => {
      if (v < 0.6) return;
      race.contacts++;
      if (i === 0 || j === 0) emit(race, 'contact', { v, other: i === 0 ? j : i });
    });
    nearMisses(race);
    rank(race);
  }
  streaks(race);
}

export function botInput(race, inp, skill = 0.97) {
  if (!race.driver) race.driver = createDriver({ skill, aggr: 0.6, error: 0.05, boost: 0.8, nerve: 0.7, craft: 0.9 }, race.seed * 31 + 7);
  return drive(race, race, inp);
}

export function raceClock(race) {
  if (race.phase === 'countdown') return 0;
  if (race.phase === 'finished') return race.total;
  return race.raceTick;
}

export { DT };
