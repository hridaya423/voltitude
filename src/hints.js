import { lineFor } from './sim/driver.js';

const GAP = 720, LIMIT = 3;
const RULES = [
  ['reset', (r, c, s) => !r.dare && r.raceTick - s.movedAt > 45],
  ['gas', (r, c) => c.gas < 0.02],
  ['air', (r, c) => c.mode === 0 && c.air > 24],
  ['lift', (r, c, s, seen) => c.mode === 0 && c.air > 36 && seen.air > 0],
  ['flip', (r, c, s, seen) => c.mode === 0 && c.air > 60 && seen.lift > 0],
  ['boost', (r, c, s) => c.mode !== 0 && r.raceTick > 360 && c.speed > 25 && c.gas > 0.5 && !s.boosted && (!s.line || c.speed + 8 < s.line.cap[(c.hint + Math.round(c.speed * 3)) % r.world.track.lap])],
  ['slide', (r, c, s) => s.brakes >= 3 && !s.slid && c.mode !== 0 && c.brake > 0.3 && c.speed > 20],
  ['hop', (r, c, s) => c.mode !== 0 && c.gas > 0.3 && !s.hopped && r.entries.some((e) => e !== r && e.prog - r.prog > 4 && e.prog - r.prog < 25 && Math.abs(e.car.lat - c.lat) < 1.6 && c.speed - e.car.speed > 5)],
];

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

export const brakeCue = (line, lap, c, on) => c.mode === 1 && c.uy >= 0.3 && c.speed > line.cap[(c.hint + Math.round(c.speed * 0.5)) % lap] + (on ? 0 : 3);

export const wrongWay = (track, c) => c.mode !== 0 && c.speed > 5 && c.fx * track.T[c.hint * 3] + c.fy * track.T[c.hint * 3 + 1] + c.fz * track.T[c.hint * 3 + 2] < -0.5;
