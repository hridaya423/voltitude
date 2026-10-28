import { writeFileSync } from 'node:fs';
import { loadWorld, ghostUrl } from './load-world.mjs';
import { VENUES } from '../src/sim/venues.js';
import { createRace, stepRace, createInput, eventsFor, packInput, unpackInput, botInput } from '../src/sim/race.js';
import { autopilot } from '../src/sim/bot.js';
import { createRecorder, encodeRun } from '../src/sim/ghost.js';

for (const id of process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : Object.keys(VENUES)) {
  const world = loadWorld(id);
  if (!world.baked) throw new Error(`terrain not baked for ${id}`);
  const out = {};
  for (const event of eventsFor(world.track)) {
    if (event.circuit && event.kind !== 'tt') continue;
    const race = createRace(world, { event, seed: 1 });
    const rec = createRecorder();
    const raw = createInput(), applied = createInput(), bytes = new Int8Array(6);
    while (race.phase !== 'finished' && race.tick < 120 * 400) {
      if (event.circuit) botInput(race, raw, 1); else autopilot(race, raw, 1);
      packInput(raw, bytes, 0);
      unpackInput(bytes, 0, applied);
      rec.push(applied);
      stepRace(race, applied);
      race.events.length = 0;
    }
    if (race.phase !== 'finished') throw new Error(`author run failed on ${id} ${event.id}`);
    out[event.id] = encodeRun(race, rec.bytes());
    console.log(id, event.id, (race.total / 120).toFixed(3), 'respawns', race.respawns, event.circuit ? `laps ${race.laps.map((t) => (t / 120).toFixed(2)).join(' ')}` : '');
}
writeFileSync(ghostUrl(id), JSON.stringify(out));
}
