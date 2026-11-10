import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stylePoints } from '../src/style.js';
import { GAIN } from '../src/sim/gas.js';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

test('tricks, air and a perfect landing make the score; a hard landing scores nothing', () => {
  assert.equal(stylePoints({ type: 'land', quality: 'perfect', air: 2, tricks: ['flip', 'roll'] }), 360);
  assert.equal(stylePoints({ type: 'land', quality: 'clean', air: 1, tricks: [] }), 20);
  assert.equal(stylePoints({ type: 'land', quality: 'hard', air: 3, tricks: ['flip'] }), 0);
});

test('a near miss scores 75, and wall and draft time score 25 a second', () => {
  assert.equal(stylePoints({ type: 'near_miss' }), 75);
  assert.equal(stylePoints({ type: 'gas_gain', source: 'wall', amount: GAIN.wall * 2 }), 50);
  assert.equal(stylePoints({ type: 'gas_gain', source: 'draft', amount: GAIN.draft * 0.5 }), 13);
  assert.equal(stylePoints({ type: 'gas_gain', source: 'perfect', amount: GAIN.perfect }), 0);
  assert.equal(stylePoints({ type: 'check' }), 0);
});

test('the same run always scores the same, and a bot lap of the Proving Ground scores something', () => {
  const world = loadWorld('proving'), ev = eventsFor(world.track, world.venue).find((e) => e.id === 'tt');
  const run = () => {
    const race = createRace(world, { event: ev }), inp = createInput();
    let s = 0;
    while (race.laps.length < 1 && race.tick < 120 * 200) { botInput(race, inp, 1); stepRace(race, inp); for (const e of race.events) s += stylePoints(e); race.events.length = 0; }
    return s;
  };
  const a = run();
  assert.ok(a > 100, `style ${a}`);
  assert.equal(run(), a);
});
