import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput, nearMisses, TIERS } from '../src/sim/race.js';
import { createCar, placeCar, TUNING, wallAt } from '../src/sim/drive.js';
import { buildCircuit } from '../src/sim/circuit.js';
import { lineFor } from '../src/sim/driver.js';
import { turtle, arc } from '../tools/turtle.mjs';

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
    const e = race.entries[k + 1], budget = (1 + Object.values(e.earned).reduce((a, b) => a + b, 0)) * TUNING.burn;
    assert.ok(perLap > 1 && s.ticks / 120 <= budget, `${e.identity.code} boosts ${perLap.toFixed(1)} s per lap, ${(s.ticks / 120).toFixed(1)} s against a ${budget.toFixed(1)} s budget`);
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

test('rivals lap slower on Easy than on Pro, and slower on Pro than on Elite', () => {
  const launch = loadWorld('launch'), event = eventsFor(launch.track).find((e) => e.id === 'gp');
  const lap = Object.fromEntries(Object.keys(TIERS).map((tier) => {
    const race = createRace(launch, { event, seed: 1, tier }), inp = createInput();
    race.entries = race.entries.slice(0, 2);
    race.entries[1].driver.p = { ...race.entries[1].driver.p, nerve: 0 };
    while (!race.entries.every((e) => e.done) && race.tick < 120 * 400) { botInput(race, inp, 0.97); stepRace(race, inp); race.events.length = 0; }
    return [tier, Math.min(...race.entries[1].laps.slice(1)) / 120];
  }));
  assert.ok(lap.easy > lap.pro * 1.01, `easy ${lap.easy.toFixed(2)} s against pro ${lap.pro.toFixed(2)} s`);
  assert.ok(lap.pro > lap.elite * 1.005, `pro ${lap.pro.toFixed(2)} s against elite ${lap.elite.toFixed(2)} s`);
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

test('a car in the wake of another on a straight gains on one in clean air', () => {
  const run = (lat) => {
    const race = createRace(world, { event: GP, seed: 1 });
    race.phase = 'racing'; race.raceTick = 400;
    const rival = race.entries[1];
    race.entries = [race, rival];
    placeCar(race.car, world.track, 3300, 60, 0);
    const inp = createInput();
    inp.throttle = 1;
    for (let t = 0; t < 240; t++) {
      placeCar(rival.car, world.track, (race.car.hint + 6) % world.track.lap, race.car.speed, lat);
      stepRace(race, inp);
    }
    return race.car.speed;
  };
  const wake = run(0), clear = run(5);
  assert.ok(wake > clear + 0.3, `in the wake ${wake.toFixed(2)} m/s, in clean air ${clear.toFixed(2)} m/s`);
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

test('respawn keeps the gas level, with a floor of 0.15', () => {
  const race = createRace(world, { event: GP, seed: 1 });
  race.phase = 'racing'; race.raceTick = 400;
  const inp = createInput();
  const respawnWith = (gas) => {
    race.car.gas = gas;
    race.respawnIn = 1; stepRace(race, inp);
    stepRace(race, inp);
    return race.car.gas;
  };
  assert.equal(respawnWith(0), 0.15);
  assert.equal(respawnWith(0.6), 0.6);
});

const LAUNCH = loadWorld('launch');
const LAUNCH_GP = eventsFor(LAUNCH.track).find((e) => e.id === 'gp');

function racing(w, ev) {
  const race = createRace(w, { event: ev, seed: 1 });
  race.phase = 'racing'; race.raceTick = 400;
  return race;
}

function ticksToRespawn(race, inp, limit) {
  for (let t = 1; t <= limit; t++) {
    stepRace(race, inp);
    const hit = race.events.some((e) => e.type === 'respawn');
    race.events.length = 0;
    if (hit) return t;
  }
  return Infinity;
}

test('the player under the course respawns within 2.5 s', () => {
  const race = racing(LAUNCH, LAUNCH_GP);
  placeCar(race.car, LAUNCH.track, 1478, 0, 0);
  race.car.y -= 20;
  race.lastIdx = 1320;
  const t = ticksToRespawn(race, createInput(), 120 * 5);
  assert.ok(t <= 300, `respawned after ${(t / 120).toFixed(2)} s`);
});

test('a player held still on the road respawns at 2 s', () => {
  const race = racing(world, GP);
  placeCar(race.car, world.track, 700, 0, 0);
  race.lastIdx = 700;
  const t = ticksToRespawn(race, createInput(), 120 * 5);
  assert.ok(t >= 236 && t <= 250, `respawned after ${t} ticks`);
});

test('a respawn from a wall-ride sample lands on a flat sample', () => {
  const race = racing(LAUNCH, LAUNCH_GP);
  const { U } = LAUNCH.track;
  assert.ok(U[812 * 3 + 1] < 0.7);
  placeCar(race.car, LAUNCH.track, 812, 20, 0);
  race.lastIdx = 812; race.lastSpeed = 58; race.car.wrecked = true;
  assert.ok(ticksToRespawn(race, createInput(), 120) <= 71);
  const i = race.car.hint;
  assert.ok(U[i * 3 + 1] > 0.95, `respawned at ${i}, U.y ${U[i * 3 + 1].toFixed(2)}`);
  assert.ok(race.car.speed <= 45, `respawn speed ${race.car.speed.toFixed(1)}`);
});

test('three respawns in a row from mid-bank do not wreck', () => {
  const race = racing(LAUNCH, LAUNCH_GP);
  const inp = createInput();
  const events = [];
  for (let n = 0; n < 3; n++) {
    placeCar(race.car, LAUNCH.track, 812, 58, 0);
    race.lastIdx = 812; race.lastSpeed = 58; race.car.gas = 0.3; race.car.wrecked = true;
    assert.ok(ticksToRespawn(race, inp, 120) <= 71);
    for (let t = 0; t < 120 * 4; t++) {
      botInput(race, inp, 0.97);
      stepRace(race, inp);
      events.push(...race.events);
      race.events.length = 0;
    }
  }
  assert.equal(events.filter((e) => e.type === 'wreck').length, 0);
  assert.equal(events.filter((e) => e.type === 'respawn').length, 0);
});

function airOval({ air = true, sector = 'Back' } = {}) {
  const r = 100 / (4 * Math.sin((35 * Math.PI) / 180));
  const nodes = [[0, 0, 0, 0, 10, null], ...turtle(0, 0, 0, 0, 10, [
    [200], [50, 0, -1, { jump: { kick: 6, ramp: 25, flare: 10 }, ...(air && { air: { len: 260 } }) }],
    [arc(r, 35), 35, -2, sector === 'S' && { sector }], [arc(r, 70), -70, -9], [arc(r, 35), 35, -8],
    [120, 0, -8], [200, 0, 0], [100], [arc(80, 180), 180], [200, 0, 0, sector === 'Back' && { sector }], [570], [arc(80, 180), 180],
  ])].slice(0, -1);
  return { track: buildCircuit({ w: 10, nodes }), terrain: { height: () => -50 } };
}

function launch(w, v) {
  const { track } = w;
  const race = createRace(w, { event: eventsFor(track).find((e) => e.id === 'tt') });
  const inp = createInput();
  while (race.phase !== 'racing') stepRace(race, inp);
  placeCar(race.car, track, track.jumps[0].lip - 30, v, 0);
  const c = race.car, out = { race, wide: 0, over: -Infinity, respawns: 0, landed: -1, splits: [] };
  for (let t = 0; t < 120 * 90 && race.splits.length < 2; t++) {
    if (out.landed < 0 || t < out.landed + 120) Object.assign(inp, createInput(), { throttle: 0.3 });
    else botInput(race, inp, 0.9);
    stepRace(race, inp);
    for (const e of race.events) {
      if (e.type === 'respawn') out.respawns++;
      if (e.type === 'land' && out.landed < 0) { out.landed = t; out.land = c.hint; }
      if (e.type === 'check' || e.type === 'lap') out.splits.push(e.type);
    }
    race.events.length = 0;
    const k = c.hint * 3;
    const lat = (c.x - track.H[k]) * track.R[k] + (c.y - track.H[k + 1]) * track.R[k + 1] + (c.z - track.H[k + 2]) * track.R[k + 2];
    out.wide = Math.max(out.wide, Math.abs(lat));
    out.over = Math.max(out.over, Math.abs(lat) - wallAt(track, c.hint, Math.sign(lat)));
  }
  return out;
}

test('air span: a car launched at 70 m/s flies over the infield and lands on the far leg', () => {
  const w = airOval();
  const [span] = w.track.airs;
  const out = launch(w, 70);
  assert.ok(out.wide > w.track.halfW[span.from] + 2, `widest ${out.wide.toFixed(1)} m from the centreline`);
  assert.ok(out.land > span.from + 150 && out.land < span.to, `landed at ${out.land}, span ${span.from} to ${span.to}`);
  assert.equal(out.respawns, 0);
  assert.deepEqual(out.splits, ['check', 'lap', 'check']);
});

test('outside an air span the walls hold a flying car on the road', () => {
  const w = airOval({ air: false });
  const out = launch(w, 70);
  assert.ok(out.over < -0.5, `widest ${out.over.toFixed(1)} m past the wall line`);
});

test('a checkpoint inside an air span is a build error', () => {
  assert.throws(() => airOval({ sector: 'S' }), /inside an air span/);
});

test('a bot holds the wall-ride bank at more than 40 m/s for 3 s and earns wall gas', () => {
  const race = createRace(world, { event: eventsFor(world.track).find((e) => e.id === 'tt'), seed: 1 });
  const inp = createInput(), c = race.car;
  let on = 0, best = 0, respawns = 0;
  while (race.laps.length < 1 && race.tick < 120 * 120) {
    botInput(race, inp, 1);
    stepRace(race, inp);
    respawns += race.events.filter((e) => e.type === 'respawn').length;
    race.events.length = 0;
    on = c.fan > 0.2 && c.speed > 40 && c.mode === 1 && !race.world.track.loopMask[c.hint] ? on + 1 : 0;
    best = Math.max(best, on);
  }
  assert.ok(best >= 120 * 3, `longest wall-ride ${(best / 120).toFixed(1)} s`);
  assert.equal(respawns, 0);
  assert.ok(race.earned.wall > 0.15, `wall gas ${race.earned.wall?.toFixed(2)}`);
});

function gateOval() {
  const nodes = [[0, 0, 0, 0, 10, null], ...turtle(0, 0, 0, 0, 10, [
    [20], [280, 0, 0, { gate: { h: 6, r: 3, at: 130 } }], [arc(80, 180), 180], [300, 0, 0, { sector: 'Back' }], [arc(80, 180), 180],
  ])].slice(0, -1);
  return { track: buildCircuit({ w: 10, nodes }), terrain: { height: () => -50 } };
}

function flyThroughGate(w, lat, tries = 1) {
  const { track } = w, [{ i, h }] = track.gates;
  const race = createRace(w, { event: eventsFor(track).find((e) => e.id === 'tt') });
  const inp = createInput(), c = race.car;
  while (race.phase !== 'racing') stepRace(race, inp);
  const gates = [];
  for (let n = 0; n < tries; n++) {
    placeCar(c, track, i - 6, 40, lat);
    const k = (i - 6) * 3;
    c.x += track.U[k] * h; c.y += track.U[k + 1] * h; c.z += track.U[k + 2] * h;
    for (let t = 0; t < 30; t++) {
      stepRace(race, inp);
      gates.push(...race.events.filter((e) => e.type === 'gate'));
      race.events.length = 0;
    }
  }
  return { earned: race.earned.gate ?? 0, gates: gates.length };
}

test('a flight gate pays 0.25 once per lap to a car through its centre, and nothing to a car that misses by r + 1', () => {
  const w = gateOval(), [gate] = w.track.gates;
  assert.ok(gate && gate.h === 6 && gate.r === 3, JSON.stringify(w.track.gates));
  const hit = flyThroughGate(w, 0);
  assert.equal(hit.earned, 0.25);
  assert.equal(hit.gates, 1);
  const twice = flyThroughGate(w, 0, 2);
  assert.equal(twice.earned, 0.25);
  assert.equal(twice.gates, 1);
  const miss = flyThroughGate(w, gate.r + 1);
  assert.equal(miss.earned, 0);
  assert.equal(miss.gates, 0);
});

test('a rival 20 m behind a stopped car on a straight hops over it without contact', () => {
  const { track } = world, s0 = 2400;
  for (let d = -150; d < 150; d++) assert.ok(Math.abs(track.curv[s0 + d]) < 0.0015 && !track.air?.[s0 + d], `bend at ${s0 + d}`);
  const race = createRace(world, { event: GP, seed: 1 }), inp = createInput();
  while (race.phase !== 'racing') { stepRace(race, inp); race.events.length = 0; }
  for (let t = 0; t < 300; t++) { stepRace(race, inp); race.events.length = 0; }
  const off = (i) => lineFor(track).off[i], rival = race.entries[1];
  race.entries.slice(2).forEach((e, k) => { const j = (s0 + 900 + k * 120) % track.lap; placeCar(e.car, track, j, 30, off(j)); e.prog = race.prog + 900 + k * 120; });
  placeCar(race.car, track, s0, 0, off(s0));
  placeCar(rival.car, track, s0 - 20, 45, off(s0 - 20));
  rival.car.gas = 1;
  let air = 0, contacts = 0;
  for (let t = 0; t < 360; t++) {
    Object.assign(inp, createInput(), { brake: 1 });
    stepRace(race, inp);
    contacts += race.events.filter((e) => e.type === 'contact').length;
    race.events.length = 0;
    if (rival.car.mode === 0) air++;
  }
  assert.ok(air > 60, `airborne ${(air / 120).toFixed(2)} s`);
  assert.equal(contacts, 0);
  assert.ok(rival.car.hint > s0 + 50, `rival at ${rival.car.hint}`);
});
