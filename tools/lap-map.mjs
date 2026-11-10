import { loadWorld } from './load-world.mjs';
import { VENUES } from '../src/sim/venues.js';
import { lineFor } from '../src/sim/driver.js';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

const MIN = +(process.argv[3] || 3);

export function lapMap(id) {
  const world = loadWorld(id), race = createRace(world, { event: eventsFor(world.track, world.venue).find((e) => e.id === 'tt'), seed: 3 }), inp = createInput();
  const c = race.car, runs = [], line = lineFor(world.track);
  let n = 0, idle = 0, air = 0, wall = 0, brake = 0, turn = 0, from = -1, at = 0;
  while (race.laps.length < 2 && race.tick < 120 * 400) {
    botInput(race, inp, 1);
    stepRace(race, inp);
    race.events.length = 0;
    if (race.phase !== 'racing' || race.laps.length < 1) continue;
    n++;
    const state = c.mode === 0 ? 'air' : c.fan > 0.2 ? 'wall' : inp.brake > 0.1 ? 'brake' : Math.abs(line.kappa[c.hint % world.track.lap]) * c.speed * c.speed > 3.9 ? 'turn' : 'idle';
    if (state === 'air') air++; else if (state === 'wall') wall++; else if (state === 'brake') brake++; else if (state === 'turn') turn++; else idle++;
    if (state === 'idle') { if (from < 0) { from = n; at = c.hint; } }
    else if (from >= 0) { if ((n - from) / 120 >= MIN) runs.push({ fromM: at, toM: c.hint, seconds: +((n - from) / 120).toFixed(1), endKmh: Math.round(c.speed * 3.6), endsIn: state }); from = -1; }
  }
  const pct = (k) => +((100 * k) / n).toFixed(1);
  return { venue: id, lapS: +(n / 120).toFixed(1), idlePct: pct(idle), brakePct: pct(brake), turnPct: pct(turn), wallPct: pct(wall), airPct: pct(air), runs };
}

if (process.argv[1]?.endsWith('lap-map.mjs')) {
  const all = (process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : Object.keys(VENUES)).map(lapMap);
  console.table(all.map(({ runs, ...r }) => r));
  for (const v of all) { console.log(v.venue, 'flat-out stretches of', MIN, 's or more'); console.table(v.runs); }
  console.log(JSON.stringify(all.map((v) => [v.venue, v.brakePct, v.turnPct, v.idlePct, v.wallPct, v.airPct])));
}
