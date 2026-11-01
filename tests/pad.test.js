import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

const pad = loadWorld('pad');

test('the pad builds, bakes and laps', () => {
  const { track } = pad;
  assert.ok(pad.baked, 'terrain bake is current');
  assert.ok(track.closed && track.lap > 1400 && track.lap < 1650, `lap ${track.lap} m`);
  assert.equal(track.jumps.length, 1);
  assert.deepEqual(track.lineup, { i0: track.jumps[0].lip + 18, pitch: 7.5 });
  const tt = eventsFor(track).find((e) => e.id === 'tt');
  const race = createRace(pad, { event: tt, seed: 1 });
  const inp = createInput();
  const events = [];
  while (race.phase !== 'finished' && race.tick < 120 * 200) { botInput(race, inp, 1); stepRace(race, inp); events.push(...race.events); race.events.length = 0; }
  assert.equal(race.phase, 'finished');
  assert.equal(events.filter((e) => e.type === 'respawn').length, 0);
  for (const t of race.laps.slice(1)) assert.ok(t / 120 > 20 && t / 120 < 40, `lap ${(t / 120).toFixed(1)} s`);
});
