import { lineFor } from './sim/driver.js';
import { LIP_SPEED } from './sim/line.js';
import { brakeAt, TUNING } from './sim/drive.js';

const GAP = 720, LIMIT = 3;
const near = (r, c, e) => e !== r && e.prog - r.prog > 4 && e.prog - r.prog < 25 && Math.abs(e.car.lat - c.lat) < 1.6;
const RULES = [
  ['reset', (r, c, s) => !r.dare && r.raceTick - s.movedAt > 45, (r, c) => c.mode !== 0 && c.speed < 2],
  ['gas', (r, c) => c.gas < 0.02, (r, c) => c.gas < 0.05],
  ['air', (r, c) => c.mode === 0 && c.air > 24, (r, c) => c.mode === 0],
  ['lift', (r, c, s, seen) => c.mode === 0 && c.air > 36 && seen.air > 0, (r, c) => c.mode === 0],
  ['flip', (r, c, s, seen) => c.mode === 0 && c.air > 60 && seen.lift > 0, (r, c) => c.mode === 0],
  ['boost', (r, c, s) => c.mode !== 0 && r.raceTick > 360 && c.speed > 25 && c.gas > 0.5 && !s.boosted && (!s.line || c.speed + 8 < s.line.cap[(c.hint + Math.round(c.speed * 3)) % r.world.track.lap]), (r, c) => c.mode !== 0 && !c.boosting],
  ['slide', (r, c, s) => s.brakes >= 3 && !s.slid && c.mode !== 0 && c.brake > 0.3 && c.speed > 20, (r, c) => c.mode !== 0 && !c.slide && c.speed > 15],
  ['hop', (r, c, s) => c.mode !== 0 && c.gas > 0.3 && !s.hopped && r.entries.some((e) => near(r, c, e) && c.speed - e.car.speed > 5), (r, c) => c.mode !== 0 && c.hopT === 0 && r.entries.some((e) => near(r, c, e))],
];
const HOLD = Object.fromEntries(RULES.map(([id, , hold]) => [id, hold]));

export const hintHolds = (id, r) => r.phase === 'racing' && HOLD[id](r, r.car);

export function createHints() {
  let race = null, s = null;
  return (r, seen) => {
    if (r !== race) { race = r; s = { movedAt: 0, boosted: false, hopped: false, slid: false, brakes: 0, braking: false, last: -GAP, shown: new Set(), line: r.world.track.closed && !r.dare ? lineFor(r.world.track) : null }; }
    if (r.phase !== 'racing') return null;
    const c = r.car;
    if (c.mode === 0 || c.speed >= 2 || r.raceTick < 360) s.movedAt = r.raceTick;
    s.boosted ||= c.boosting;
    s.hopped ||= c.hopT > 0;
    s.slid ||= !!c.slide;
    const braking = c.mode !== 0 && c.brake > 0.3 && c.speed > 20;
    if (braking && !s.braking) s.brakes++;
    s.braking = braking;
    if (r.raceTick - s.last < GAP) return null;
    for (const [id, when] of RULES) {
      if (s.shown.has(id) || (seen[id] || 0) >= LIMIT || !when(r, c, s, seen)) continue;
      s.shown.add(id);
      s.last = r.raceTick;
      return id;
    }
    return null;
  };
}

const REACT = 0.25, PERSIST = 0.05, LIFT = 4, MIN_ON = 0.5, MIN_OFF = 0.4, SLACK = 2, LEARN = 2, PAST = 60;

export function createBrakeCue(track, line) {
  const N = track.lap, step = track.step, limit = new Float64Array(N), lip = new Uint8Array(N), clean = new Map();
  for (let i = 0; i < N; i++) limit[i] = track.loopMask[i] ? Infinity : line.vlim[i];
  for (const a of track.airs ?? []) { lip[a.lip] = 1; for (let d = 0; d < 8; d++) limit[(a.lip - d + N) % N] = Infinity; }
  const apexOf = (j) => { let a = j; for (let k = 1; k < 80; k++) if (limit[(j + k) % N] < limit[a]) a = (j + k) % N; return a; };
  const short = (c, v, a, react) => {
    const coast = brakeAt(v) - TUNING.brakeG * 9.81 + 0.6, reach = Math.min(N - 1, Math.ceil((v * react + (v * v) / (2 * a)) / step) + 2);
    for (let k = 1; k <= reach; k++) {
      const j = (c.hint + k) % N, w = limit[j];
      if (lip[j] && v >= LIP_SPEED) return -1;
      if (w >= v - LIFT) continue;
      const need = v * v - w * w, s = k * step;
      if (need > 2 * coast * s && need >= 2 * a * (s - v * react)) return apexOf(j);
    }
    return -1;
  };
  let on = false, held = MIN_OFF, hotFor = 0, target = -1;
  const cue = (c, dt) => {
    if (c.mode !== 1 || c.uy < 0.3) { on = false; target = -1; return false; }
    const v = c.speed, full = brakeAt(v), hot = short(c, v, full, REACT), braking = c.brake > 0.3;
    if (target < 0 || hot >= 0) target = hot >= 0 ? hot : short(c, v, full, REACT + 1.5);
    if (target >= 0 && (c.hint - target + N) % N < PAST) { clean.set(target, v <= limit[target] + LIFT + 1 ? (clean.get(target) || 0) + 1 : 0); target = -1; }
    held += dt;
    hotFor = hot >= 0 && !braking ? hotFor + dt : 0;
    if (!on) { if (hotFor >= PERSIST && held >= MIN_OFF && (clean.get(hot) || 0) < LEARN) { on = true; held = 0; } }
    else if (braking || (held >= MIN_ON && short(c, v - SLACK, full, REACT) < 0)) { on = false; held = 0; }
    return on;
  };
  cue.reset = () => { on = false; held = MIN_OFF; hotFor = 0; target = -1; };
  return cue;
}

export const wrongWay = (track, c) => c.mode !== 0 && c.speed > 5 && c.fx * track.T[c.hint * 3] + c.fy * track.T[c.hint * 3 + 1] + c.fz * track.T[c.hint * 3 + 2] < -0.5;

export const placeCall = (told, pos) => pos === told ? null : pos > told ? 'lost' : 'gained';
