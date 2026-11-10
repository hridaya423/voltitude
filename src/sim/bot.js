import { cornerSpeed, steerTo } from './drive.js';

export function autopilot(race, inp, skill = 1) {
  const { track } = race.world;
  const c = race.car;
  const n = track.n;
  let vmax = 999, wantBoost = false;
  const span = Math.min(n - 1, c.hint + Math.round(20 + c.speed * 1.6));
  for (let i = c.hint; i < span; i += 2) {
    const brakeDist = i - c.hint;
    const a = Math.max(0, i - 6) * 3, b = Math.min(n - 1, i + 6) * 3, k = i * 3;
    const rise = Math.abs((track.T[b] - track.T[a]) * track.U[k] + (track.T[b + 1] - track.T[a + 1]) * track.U[k + 1] + (track.T[b + 2] - track.T[a + 2]) * track.U[k + 2]) / ((b - a) / 3);
    const limit = rise > 0.004 ? Math.sqrt(35 / rise) : Infinity;
    let reach = Infinity;
    if (track.gap[i] && !track.gap[i - 1]) {
      let end = i;
      while (end < n - 1 && track.gap[end]) end++;
      const angle = Math.asin(track.T[(i - 1) * 3 + 1]);
      if (angle > 0.02) reach = Math.sqrt(((end - i + 40) * 9.81) / Math.sin(2 * angle));
      if (i - c.hint < 70 && c.speed < reach * 0.9) wantBoost = true;
    }
    const cap = Math.sqrt(Math.min(cornerSpeed(track.curv[i], 0.7), limit, reach) ** 2 + 2 * 20 * brakeDist);
    if (cap < vmax) vmax = cap;
  }
  vmax *= 0.97 + 0.03 * skill;
  inp.steer = steerTo(c, track, 0, 0, track.curv[Math.min(n - 1, c.hint + Math.round(2 + c.speed * 0.12))]);
  inp.pitch = 0; inp.roll = 0; inp.reset = 0; inp.lift = 0; inp.flip = 0;
  inp.throttle = c.speed < vmax ? 1 : 0;
  inp.brake = c.speed > vmax + 4 ? 1 : 0;
  const tag = track.bot[c.hint] || '';
  inp.boost = skill > 0.5 && c.gas > 0.17 && (tag === 'boost' || wantBoost) && c.speed < vmax - 4 ? 1 : 0;
  if (c.mode === 0) {
    inp.throttle = 0; inp.brake = 0;
    let lip = -1;
    for (let j = 0; j < 80 && lip < 0; j++) {
      const i = Math.min(n - 1, c.hint + j);
      if (!track.gap[i]) continue;
      lip = i;
      while (lip < n - 1 && track.gap[lip]) lip++;
    }
    if (lip < 0 && track.gap[c.hint]) {
      lip = c.hint;
      while (lip < n - 1 && track.gap[lip]) lip++;
    }
    if (lip >= 0 && (track.gap[c.hint] || c.air > 24) && c.gas > 0.1 && skill > 0.5) {
      const vh = Math.max(Math.hypot(c.vx, c.vz), 1), t = ((lip - c.hint) * track.step) / vh;
      const clear = c.y + c.vy * t - 4.905 * t * t - track.H[lip * 3 + 1];
      const pitch = Math.asin(c.fy);
      inp.pitch = Math.max(-1, Math.min(1, (0.3 - pitch) * 2));
      inp.boost = pitch > 0.1 && clear < 1 ? 1 : 0;
    }
  }
  const L = race.dare && track.lineup;
  if (L && c.hint > L.lip - 200 && c.hint < L.lip + 5 && c.mode !== 0) { inp.throttle = 1; inp.brake = 0; inp.boost = 0; }
  if (L && c.mode === 0 && c.hint >= L.lip) { inp.boost = 0; inp.lift = c.vy < 0 ? 1 : 0; }
  return inp;
}
