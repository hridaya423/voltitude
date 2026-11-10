import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';
import { lineFor } from '../src/sim/driver.js';
import { createHints, brakeCue, wrongWay } from '../src/hints.js';
import { placeCar } from '../src/sim/drive.js';

const world = loadWorld('proving');
const TT = eventsFor(world.track, world.venue).find((e) => e.id === 'tt');
const airfield = loadWorld('airfield');
const RUNWAY = eventsFor(airfield.track, airfield.venue).find((e) => e.id === 'tt');

function play(script, secs, seen = {}, w = world, event = TT) {
  const race = createRace(w, { event }), inp = createInput(), next = createHints(), out = [];
  for (let t = 0; t < 120 * secs; t++) {
    script(race, inp);
    stepRace(race, inp);
    race.events.length = 0;
    const id = next(race, seen);
    if (id) { seen[id] = (seen[id] || 0) + 1; out.push([id, race.raceTick]); }
  }
  return out;
}

test('on a long straight a player who never boosts is told about boost three seconds in', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 8, {}, airfield, RUNWAY);
  assert.equal(out[0][0], 'boost');
  assert.ok(out[0][1] > 360 && out[0][1] < 480, `boost hint at tick ${out[0][1]}`);
});

test('the boost hint waits when a corner is close, and a stopped car is told about reset', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 30);
  assert.equal(out[0][0], 'reset');
  assert.ok(out[0][1] > 700 && out[0][1] < 1100, `reset hint at tick ${out[0][1]}`);
  assert.ok(out.some(([id]) => id === 'boost'), `hints: ${out.map((h) => h[0])}`);
});

test('hints keep six seconds apart and never repeat within a race', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 60);
  for (let k = 1; k < out.length; k++) assert.ok(out[k][1] - out[k - 1][1] >= 720, `${out[k - 1]} then ${out[k]}`);
  assert.equal(new Set(out.map((h) => h[0])).size, out.length);
});

test('a hint shown three times is never shown again', () => {
  const out = play((race, inp) => { inp.throttle = 1; }, 30, { boost: 3, reset: 3, gas: 3 });
  assert.deepEqual(out.filter(([id]) => id === 'boost' || id === 'reset'), []);
});

test('the bot is taught the air verbs in order across its jumps', () => {
  const out = play((race, inp) => botInput(race, inp, 1), 100).map((h) => h[0]).filter((id) => ['air', 'lift', 'flip'].includes(id));
  assert.deepEqual(out.slice(0, 2), ['air', 'lift']);
});

test('the brake cue warns a flat-out driver two seconds before the first corner and stays quiet on the straight', () => {
  const race = createRace(world, { event: TT }), inp = createInput(), line = lineFor(world.track), N = world.track.lap;
  let on = false, first = -1, trouble = -1;
  for (let t = 0; t < 120 * 20 && trouble < 0; t++) {
    inp.throttle = 1;
    stepRace(race, inp);
    if (race.phase === 'racing') {
      on = brakeCue(line, N, race.car, on);
      if (on && first < 0) first = race.raceTick;
      if (race.events.some((e) => e.type === 'scrape' || e.type === 'impact' || e.type === 'wreck')) trouble = race.raceTick;
    }
    race.events.length = 0;
  }
  assert.ok(first > 240, `cue lit on the start straight at tick ${first}`);
  assert.ok(trouble - first > 240, `cue at ${first}, wall at ${trouble}`);
});

test('a driver who brakes only on the cue laps within 8% of the bot', () => {
  const lap = (obey) => {
    const race = createRace(world, { event: TT }), inp = createInput(), line = lineFor(world.track), N = world.track.lap;
    let on = false;
    for (let t = 0; t < 120 * 200 && race.laps.length < 1; t++) {
      botInput(race, inp, 1);
      if (obey) { on = race.phase === 'racing' && brakeCue(line, N, race.car, on); inp.throttle = on ? 0 : 1; inp.brake = on ? 1 : 0; inp.boost = 0; }
      stepRace(race, inp);
      race.events.length = 0;
    }
    return race.laps[0];
  };
  const bot = lap(false), cued = lap(true);
  assert.ok(cued && cued < bot * 1.08, `bot ${bot}, cue driver ${cued}`);
});

test('a car driving against the track is flagged, and one driving with it is not', () => {
  const c = createRace(world, { event: TT }).car;
  placeCar(c, world.track, 200, 30);
  assert.equal(wrongWay(world.track, c), false);
  c.fx = -c.fx; c.fy = -c.fy; c.fz = -c.fz;
  assert.equal(wrongWay(world.track, c), true);
  c.speed = 2;
  assert.equal(wrongWay(world.track, c), false);
});

test('the slide hint waits for the third braking zone, and a player who slides is never told', () => {
  const quiet = { air: 3, lift: 3, flip: 3, boost: 3, hop: 3, reset: 3, gas: 3 }, zones = [];
  let was = false;
  const out = play((race, inp) => {
    botInput(race, inp, 1);
    const b = race.phase === 'racing' && inp.brake > 0.3 && race.car.speed > 20;
    if (b && !was) zones.push(race.raceTick);
    was = b;
  }, 60, { ...quiet });
  const hint = out.find(([id]) => id === 'slide');
  assert.ok(hint && zones.length >= 3 && hint[1] >= zones[2], `hint ${hint}, braking from ${zones.slice(0, 4)}`);
  assert.deepEqual(play((race, inp) => { botInput(race, inp, 1); inp.slide = 1; }, 60, { ...quiet }).filter(([id]) => id === 'slide'), []);
});
