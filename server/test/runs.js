import { loadWorld } from '../../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, packInput, unpackInput } from '../../src/sim/race.js';
import { autopilot } from '../../src/sim/bot.js';
import { createRecorder, encodeRun } from '../../src/sim/ghost.js';

export function botRun(venue, event) {
  const world = loadWorld(venue);
  const race = createRace(world, { event: eventsFor(world.track, world.venue).find((e) => e.id === event) });
  const rec = createRecorder(), raw = createInput(), applied = createInput(), bytes = new Int8Array(6);
  while (race.phase !== 'finished' && race.tick < 120 * 120) {
    autopilot(race, raw, 1);
    packInput(raw, bytes, 0);
    unpackInput(bytes, 0, applied);
    rec.push(applied);
    stepRace(race, applied);
    race.events.length = 0;
  }
  return { run: encodeRun(race, rec.bytes()), score: race.dare?.score ?? null };
}

export function padded(run, frames) {
  const s = atob(run.inputs) + '\0'.repeat(frames * 6);
  return { ...run, inputs: btoa(s) };
}
