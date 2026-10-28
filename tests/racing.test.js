import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput, nearMisses } from '../src/sim/race.js';
import { createCar, placeCar } from '../src/sim/drive.js';

const world = loadWorld('proving');
const GP = eventsFor(world.track).find((e) => e.id === 'gp');

function field(seed) {
  const race = createRace(world, { event: GP, seed });
  const inp = createInput();
  const rivals = race.entries.slice(1);
  const stats = rivals.map(() => ({ ticks: 0, bursts: 0, straight: 0, was: false }));
  let launch = 0;
  while (!race.entries.every((e) => e.done) && race.tick < 120 * 400) {
    botInput(race, inp, 0.97);
    stepRace(race, inp);
    race.events.length = 0;
    if (race.phase !== 'racing') continue;
    if (race.raceTick === 140) launch = rivals.filter((e) => e.car.boosting).length;
    rivals.forEach((e, k) => {
      const on = e.car.boosting && e.car.thr > 0.5, s = stats[k];
      if (!on) { s.was = false; return; }
      s.ticks++;
      if (!s.was) s.bursts++;
      s.was = true;
      if (Math.abs(world.track.curv[e.car.hint]) < 0.006) s.straight++;
    });
  }
  return { race, stats, launch };
}

test('rivals launch on the thrusters and spend them in planned bursts on the straights', () => {
  const { race, stats, launch } = field(4);
  assert.ok(launch >= 6, `${launch} of 7 rivals boosting at the launch`);
  for (const [k, s] of stats.entries()) {
    const perLap = s.ticks / 120 / 3, bursts = s.bursts / 3;
    assert.ok(perLap > 1 && perLap < 5, `${race.entries[k + 1].identity.code} boosts ${perLap.toFixed(1)} s per lap`);
    assert.ok(bursts >= 2 && bursts <= 12, `${race.entries[k + 1].identity.code} fires ${bursts.toFixed(1)} bursts per lap`);
    assert.ok(s.straight / s.ticks > 0.8, `${race.entries[k + 1].identity.code} boosts ${((100 * s.straight) / s.ticks).toFixed(0)}% on straights`);
  }
});

test('the field is close and the order changes from race to race', () => {
  const orders = new Set();
  for (const seed of [1, 2, 3, 4]) {
    const { race } = field(seed);
    orders.add(race.order.map((e) => e.identity.code).join(' '));
    const gap = (race.order[race.order.length - 1].total - race.order[0].total) / 120;
    assert.ok(gap < 30, `seed ${seed}: last car ${gap.toFixed(1)} s behind`);
    assert.ok(race.swaps >= 8, `seed ${seed}: ${race.swaps} passes`);
  }
  assert.ok(orders.size >= 3, `${orders.size} distinct finishing orders in 4 races`);
});

function put(c, s, speed, lat) {
  const i = Math.floor(s), k = i * 3;
  placeCar(c, world.track, i, speed, lat);
  c.x += world.track.T[k] * (s - i); c.y += world.track.T[k + 1] * (s - i); c.z += world.track.T[k + 2] * (s - i);
}

function pass(lat, speed = 42, gas = 1) {
  const race = createRace(world, { event: eventsFor(world.track).find((e) => e.id === 'tt'), seed: 1 });
  const rival = { car: createCar(), earned: {} };
  race.entries = [race, rival];
  race.car.gas = rival.car.gas = gas;
  const near = [], gains = [];
  for (let t = 0; t < 480; t++) {
    race.tick++;
    put(race.car, 200 + (30 * t) / 120, 30, 0);
    put(rival.car, 180 + (speed * t) / 120, speed, lat);
    nearMisses(race);
    near.push(...race.events.filter((e) => e.type === 'near_miss'));
    gains.push(...race.events.filter((e) => e.type === 'gas_gain'));
    race.events.length = 0;
  }
  return Object.assign(near, { race, rival, gains });
}

test('a rival passing within a metre at speed is one near miss, a touch is none', () => {
  const close = pass(2.8);
  assert.equal(close.length, 1);
  assert.equal(close[0].other, 1);
  assert.ok(close[0].v > 8);
  assert.equal(pass(1.6).length, 0);
  assert.equal(pass(4).length, 0);
  assert.equal(pass(2.8, 34).length, 0);
});

function drop(height, upright) {
  const race = createRace(world, { event: GP, seed: 1 });
  race.phase = 'racing'; race.raceTick = 400;
  const c = race.car;
  placeCar(c, world.track, 900, 30, 0);
  c.y += height;
  if (!upright) { c.ux = -c.ux; c.uy = -c.uy; c.uz = -c.uz; c.rx = -c.rx; c.ry = -c.ry; c.rz = -c.rz; }
  c.gas = 0.3;
  const inp = createInput();
  const events = [];
  for (let t = 0; t < 120 * 3; t++) {
    stepRace(race, inp);
    events.push(...race.events);
    race.events.length = 0;
  }
  return { race, events, land: events.find((e) => e.type === 'land') };
}

const total = (earned) => Object.values(earned).reduce((a, b) => a + b, 0);

test('gas: a near miss pays the player 0.12', () => {
  const near = pass(2.8, 42, 0.5);
  assert.equal(near.length, 1);
  assert.ok(Math.abs(near.race.car.gas - 0.62) < 1e-9, `gas ${near.race.car.gas}`);
  assert.deepEqual(near.race.earned, { near_miss: 0.12 });
  assert.deepEqual(near.gains.map((e) => [e.source, e.amount]), [['near_miss', 0.12]]);
});

test('gas: a perfect landing after 1.5 s of air pays 0.15 plus 0.03 per second', () => {
  const { race, events, land } = drop(10.6, true);
  assert.equal(land?.quality, 'perfect');
  assert.ok(Math.abs(land.air - 1.5) < 0.1, `air ${land.air}`);
  assert.equal(race.earned.perfect, 0.15);
  assert.ok(Math.abs(race.earned.air - 0.03 * land.air) < 1e-9);
  assert.ok(Math.abs(total(race.earned) - 0.195) < 0.005, `${total(race.earned)}`);
  const gains = events.filter((e) => e.type === 'gas_gain').map((e) => e.source).sort();
  assert.deepEqual(gains, ['air', 'perfect']);
});

test('gas: a wreck pays nothing', () => {
  const { race, events } = drop(3, false);
  assert.ok(events.some((e) => e.type === 'wreck'));
  assert.equal(total(race.earned), 0);
  assert.ok(!events.some((e) => e.type === 'gas_gain'));
});

test('gas: a rival earns from a near miss too', () => {
  const near = pass(2.8, 42, 0.5);
  assert.ok(near.rival.earned.near_miss > 0);
  assert.ok(Math.abs(near.rival.car.gas - 0.62) < 1e-9);
});
