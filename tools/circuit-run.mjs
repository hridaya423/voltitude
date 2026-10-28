import { loadWorld } from './load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';
import { lineFor } from '../src/sim/driver.js';

const venueId = process.argv[2] || 'proving';
const kind = process.argv[3] || 'gp';
const seed = Number(process.argv[4] || 1);
const world = loadWorld(venueId);
const ev = eventsFor(world.track).find((e) => e.id === kind);
const race = createRace(world, { event: ev, seed });
const inp = createInput();
const L = lineFor(world.track);
console.log('lap estimate', L.time.toFixed(1), 'zones', L.zones.length, 'baked', world.baked);
let ticks = 0;
const events = [];
while (!race.entries.every((e) => e.done) && ticks < 120 * 600) {
  botInput(race, inp);
  stepRace(race, inp);
  ticks++;
  for (const e of race.events) events.push(e);
  race.events.length = 0;
  if (ticks % (120 * 20) === 0) console.log(`t=${ticks / 120}`, race.order.map((e) => `${e.identity.code}:${(e.prog / world.track.lap).toFixed(2)}`).join(' '));
}
const fmt = (t) => (t / 120).toFixed(2);
for (const e of race.order) console.log(`P${e.pos} ${e.identity.code} grid ${e.grid} total ${e.done ? fmt(e.total) : 'DNF'} laps ${e.laps.map(fmt).join(' / ')} resp ${e.respawns} wrecks ${e.wrecks} passes ${e.passes || 0} max ${Math.round(e.maxSpeed * 2.237)}mph`);
console.log('swaps', race.swaps, 'player passes', race.passes, 'contacts', race.contacts, 'ticks', ticks);
