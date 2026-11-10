import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lapReview } from '../src/time.js';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

test('the ideal lap adds the best of each sector, and the worst sector is named', () => {
  const splits = [1000, 2000, 3000, 3900, 5000, 6000, 6950, 7900, 8800];
  const r = lapReview(splits, 3);
  assert.equal(r.ideal, 900 + 950 + 900);
  assert.deepEqual(r.worst, { lap: 2, sector: 2, loss: 150 });
});

test('the standing-start sector never sets the ideal and is never the worst', () => {
  const r = lapReview([5000, 6000, 7000, 7900, 8900, 9900], 3);
  assert.equal(r.ideal, 900 + 1000 + 1000);
  assert.notDeepEqual([r.worst.lap, r.worst.sector], [1, 1]);
});

test('one lap gives no review', () => {
  assert.deepEqual(lapReview([1000, 2000, 3000], 3), { ideal: 0, worst: null });
});

test('a bot time trial has an ideal lap no slower than its best flying lap', () => {
  const world = loadWorld('pad'), ev = eventsFor(world.track, world.venue).find((e) => e.id === 'tt');
  const race = createRace(world, { event: ev }), inp = createInput();
  while (race.phase !== 'finished' && race.tick < 120 * 200) { botInput(race, inp, 1); stepRace(race, inp); race.events.length = 0; }
  const r = lapReview(race.splits, ev.perLap);
  assert.ok(r.ideal > 0 && r.ideal <= Math.min(...race.laps.slice(1)), `ideal ${r.ideal}, laps ${race.laps}`);
  assert.ok(r.worst.loss >= 0);
});
