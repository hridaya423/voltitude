import { loadWorld } from './load-world.mjs';
import { VENUES } from '../src/sim/venues.js';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

const rows = [];
for (const id of process.argv[2] ? [process.argv[2]] : Object.keys(VENUES)) {
  const world = loadWorld(id);
  for (const kind of ['tt', 'gp']) {
    const race = createRace(world, { event: eventsFor(world.track, world.venue).find((e) => e.id === kind), seed: 3 }), inp = createInput();
    let n = 0, boost = 0, dry = 0;
    while (race.phase !== 'finished' && race.tick < 120 * 400) {
      botInput(race, inp, 1);
      stepRace(race, inp);
      race.events.length = 0;
      if (race.phase !== 'racing') continue;
      n++; if (race.car.boosting) boost++; if (race.car.gas < 0.02) dry++;
    }
    const laps = race.laps.length, total = Object.values(race.earned).reduce((a, b) => a + b, 0);
    rows.push({ venue: id, event: kind, lapS: +(n / 120 / laps).toFixed(1), tanksPerLap: +(total / laps).toFixed(2), boostPct: +(100 * boost / n).toFixed(1), dryPct: +(100 * dry / n).toFixed(1), ...Object.fromEntries(Object.entries(race.earned).map(([k, v]) => [k, +(v / laps).toFixed(2)])) });
  }
}
console.table(rows);
console.log(JSON.stringify(rows.map((r) => [r.venue, r.event, r.tanksPerLap])));
