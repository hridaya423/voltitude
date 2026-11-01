import { loadWorld } from './load-world.mjs';
import { createRace, stepRace, createInput, eventsFor } from '../src/sim/race.js';
import { autopilot } from '../src/sim/bot.js';

const venueId = process.argv[2] || 'proving';
const which = process.argv[3] || 'full';
const skill = Number(process.argv[4] ?? 1);
const verbose = process.argv.includes('-v');
const world = loadWorld(venueId);
if (!world.baked) console.log('warning: terrain not baked for', venueId);
const events = eventsFor(world.track, world.venue);
for (const ev of events.filter((e) => which === 'all' || e.id === which)) {
  const race = createRace(world, { event: ev });
  const inp = createInput();
  const counts = {}, log = [];
  let ticks = 0, minGas = 1;
  while (race.phase !== 'finished' && ticks < 120 * 300) {
    autopilot(race, inp, skill);
    stepRace(race, inp);
    ticks++;
    minGas = Math.min(minGas, race.car.gas);
    for (const e of race.events) {
      counts[e.type] = (counts[e.type] || 0) + 1;
      const c = race.car;
      if (['land', 'wreck', 'respawn', 'impact', 'check'].includes(e.type)) log.push(`${(race.raceTick / 120).toFixed(2)}s ${e.type}${e.quality ? ' ' + e.quality : ''}${e.air ? ' air=' + e.air.toFixed(2) : ''}${e.v ? ' vn=' + e.v.toFixed(1) : ''} i=${c.hint} v=${c.speed.toFixed(0)} gas=${c.gas.toFixed(2)} mode=${c.mode}`);
    }
    race.events.length = 0;
    if (verbose && ticks % 120 === 0) log.push(`  t=${(ticks / 120).toFixed(0)} i=${race.car.hint} v=${race.car.speed.toFixed(1)} mode=${race.car.mode} lat=${race.car.lat.toFixed(1)} gas=${race.car.gas.toFixed(2)}`);
  }
  console.log(`${ev.id} ${ev.name}: ${race.phase} ${(race.total / 120).toFixed(2)}s len=${ev.to - ev.from} maxMph=${Math.round(race.maxSpeed * 2.237)} wrecks=${race.wrecks} respawns=${race.respawns} air=${(race.airTime / 120).toFixed(1)}s minGas=${minGas.toFixed(2)}`, JSON.stringify(counts));
  if (verbose || race.phase !== 'finished' || race.respawns) console.log(log.slice(0, 80).join('\n'));
}
