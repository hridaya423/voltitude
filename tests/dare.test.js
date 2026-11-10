import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, eventsFor, stepRace, createInput } from '../src/sim/race.js';
import { placeCar, steerTo } from '../src/sim/drive.js';
import { autopilot } from '../src/sim/bot.js';
import { lineupBoxes, lineupHit, LINEUP as KINDS } from '../src/sim/lineup.js';
import { HEART } from '../src/sim/course.js';

const pad = loadWorld('pad');
const EVENTS = eventsFor(pad.track, pad.venue);
const LINEUP = EVENTS.find((e) => e.id === 'lineup');

test('the pad lists its dare first and keeps the circuit events', () => {
  assert.deepEqual(EVENTS.map((e) => [e.id, e.card]), [['lineup', 1], ['ramp', 2], ['hl', 3], ['gp', 4], ['tt', 5], ['pr', 6]]);
  assert.equal(LINEUP.kind, 'dare');
  assert.deepEqual(eventsFor(loadWorld('proving').track, loadWorld('proving').venue).map((e) => e.id), ['hl', 'gp', 'tt', 'pr']);
});

test('a dare race has one entry and a dare state', () => {
  const race = createRace(pad, { event: LINEUP });
  assert.equal(race.entries.length, 1);
  assert.deepEqual(race.dare, { count: 1, score: 0, mult: 1, cleared: 0, armed: false, wide: false, resetAt: 0, over: false, endAt: 0, near: [] });
  assert.equal(race.car.gas, 1);
});

test('the Hot Lap is a one-lap solo time trial with the same checkpoints as one Time Trial lap', () => {
  const hl = EVENTS.find((e) => e.id === 'hl'), tt = EVENTS.find((e) => e.id === 'tt');
  assert.deepEqual([hl.name, hl.kind, hl.laps, hl.circuit], ['Hot Lap', 'tt', 1, true]);
  assert.deepEqual(hl.cps, tt.cps.slice(0, tt.perLap));
  assert.equal(createRace(pad, { event: hl }).entries.length, 1);
});


const TAU = Math.PI * 2;
const lip = pad.track.lineup.lip;

function dareAt(i, speed, count, assist = true) {
  const race = createRace(pad, { event: LINEUP, assist });
  race.phase = 'racing'; race.raceTick = 0;
  race.dare.count = count;
  placeCar(race.car, pad.track, i, speed);
  return race;
}

function run(race, script, ticks = 900) {
  const inp = createInput(), events = [];
  for (let t = 0; t < ticks && race.phase !== 'finished'; t++) {
    script(inp, race.car, t);
    stepRace(race, inp);
    events.push(...race.events);
    race.events.length = 0;
    if (events.some((e) => e.type === 'clear')) break;
  }
  return events;
}

test('at 66 m/s, flat out, throttle alone clears a line of one and the line grows', () => {
  const race = dareAt(lip - 2, 66, 1);
  const events = run(race, (inp) => { inp.throttle = 1; });
  assert.equal(events.filter((e) => e.type === 'clip').length, 0);
  assert.equal(events.find((e) => e.type === 'clear')?.count, 1);
  assert.equal(race.dare.count, 2);
  assert.equal(race.dare.cleared, 1);
});

test('throttle alone falls short of a line of two, so the thrusters have to work', () => {
  const events = run(dareAt(lip - 2, 66, 2), (inp) => { inp.throttle = 1; });
  assert.ok(events.some((e) => e.type === 'clip'), `no clip: ${events.map((e) => e.type).join(',')}`);
  assert.equal(events.filter((e) => e.type === 'clear').length, 0);
});

test('holding lift on the way down carries a line of three', () => {
  const race = dareAt(lip - 2, 66, 3);
  const events = run(race, (inp, c) => { inp.throttle = 1; inp.lift = c.mode === 0 && c.vy < 0 ? 1 : 0; });
  assert.equal(events.filter((e) => e.type === 'clip').length, 0);
  assert.equal(events.find((e) => e.type === 'clear')?.count, 3);
  assert.equal(race.dare.score, 3 * race.dare.mult);
});

test('a slow car hits the first vehicle, and the dare ends', () => {
  const race = dareAt(lip - 40, 20, 1);
  const events = [];
  const inp = createInput();
  let after = null;
  let clipAt = -1;
  for (let t = 0; t < 900 && race.phase !== 'finished'; t++) {
    inp.throttle = after ? 1 : 0;
    stepRace(race, inp);
    for (const e of race.events) { events.push(e); if (e.type === 'clip') { clipAt = t; after = { hint: race.car.hint, speed: race.car.speed }; } }
    race.events.length = 0;
  }
  const clip = events.find((e) => e.type === 'clip');
  assert.ok(clip, 'clipped');
  assert.equal(clip.k, 0);
  assert.equal(race.phase, 'finished');
  assert.ok(race.raceTick - clipAt <= 98, `finished ${race.raceTick - clipAt} ticks after the clip`);
  assert.equal(events.filter((e) => e.type === 'respawn').length, 0);
  assert.ok(race.car.hint <= after.hint + 1, `throttle carried the car from ${after.hint} to ${race.car.hint}`);
  assert.ok(race.car.speed < 4, `speed ${race.car.speed.toFixed(1)} after the clip`);
});

test('a car 0.4 m over the semi roof earns near-miss gas once', () => {
  const semi = lineupBoxes(pad.track, 5)[4];
  assert.equal(semi.kind, 'semi');
  const race = dareAt(semi.s0 - 3, 62, 5);
  const c = race.car, k = c.hint * 3, lift = semi.h + 0.4 + 0.55 - HEART;
  c.x += pad.track.U[k] * lift; c.y += pad.track.U[k + 1] * lift; c.z += pad.track.U[k + 2] * lift;
  c.gas = 0.5;
  const inp = createInput(), events = [];
  for (let t = 0; t < 30; t++) { stepRace(race, inp); events.push(...race.events); race.events.length = 0; }
  assert.equal(events.filter((e) => e.type === 'clip').length, 0);
  assert.equal(events.filter((e) => e.type === 'near_miss').length, 1);
  assert.ok(c.gas > 0.5 + 0.12 - 1e-3, `gas ${c.gas}`);
});

test('a lineup point inside a box is a clip; one just above it is a near miss', () => {
  const boxes = lineupBoxes(pad.track, 1);
  const race = dareAt(boxes[0].s0 + 2, 0, 1);
  assert.deepEqual(lineupHit(race.car, pad.track, boxes), { clip: 0 });
  const c = race.car, k = c.hint * 3, lift = boxes[0].h + 0.3 + 0.55 - HEART;
  c.x += pad.track.U[k] * lift; c.y += pad.track.U[k + 1] * lift; c.z += pad.track.U[k + 2] * lift;
  const hit = lineupHit(c, pad.track, boxes);
  assert.equal(hit.near, 0);
  assert.ok(Math.abs(hit.gap - 0.3) < 0.05, `gap ${hit.gap}`);
  assert.equal(KINDS.length, 5);
});

test('a barrel roll over the line doubles the clear', () => {
  const race = dareAt(lip - 2, 66, 2);
  const events = run(race, (inp, c) => { inp.throttle = 1; inp.roll = c.mode === 0 && Math.abs(c.barrel) < TAU - 0.3 ? 1 : 0; inp.lift = c.mode === 0 && c.vy < 0 ? 1 : 0; });
  const clear = events.find((e) => e.type === 'clear');
  assert.ok(clear, `no clear: ${events.map((e) => e.type).join(',')}`);
  assert.equal(clear.mult, 2);
  assert.equal(race.dare.score, 4);
});

test('a hard landing after the line keeps the count and resets the multiplier', () => {
  const race = dareAt(lip - 2, 66, 1, false);
  race.dare.mult = 3;
  const events = run(race, (inp, c) => { inp.throttle = 1; inp.pitch = c.mode === 0 && c.air < 38 ? 1 : 0; inp.lift = c.mode === 0 && c.vy < 0 ? 1 : 0; });
  const clear = events.find((e) => e.type === 'clear');
  assert.ok(clear, `no clear: ${events.map((e) => e.type + (e.quality ? ':' + e.quality : '')).join(',')}`);
  assert.equal(clear.hard, true);
  assert.equal(clear.mult, 1);
  assert.equal(race.dare.count, 2);
  assert.equal(race.dare.score, 1);
});

test('a recorded dare replays to the same line and score, so a clip shows what happened', async () => {
  const { createRecorder, encodeRun, createGhost } = await import('../src/sim/ghost.js');
  const { packInput, unpackInput } = await import('../src/sim/race.js');
  const { autopilot } = await import('../src/sim/bot.js');
  const race = createRace(pad, { event: LINEUP }), rec = createRecorder(), inp = createInput(), q = new Int8Array(6);
  for (let t = 0; t < 120 * 100; t++) {
    if (race.phase === 'racing') autopilot(race, inp, 1);
    packInput(inp, q, 0); unpackInput(q, 0, inp);
    rec.push(inp);
    stepRace(race, inp);
    race.events.length = 0;
  }
  assert.ok(race.dare.cleared >= 3, `bot cleared ${race.dare.cleared}`);
  const ghost = createGhost(pad, encodeRun(race, rec.bytes()));
  for (let t = 0; t < 120 * 100; t++) ghost.step();
  assert.deepEqual(ghost.race.dare, race.dare);
  assert.equal(ghost.race.car.x, race.car.x);
});

function lineupRun(script, secs) {
  const race = createRace(pad, { event: LINEUP }), inp = createInput(), events = [];
  for (let t = 0; t < 120 * secs && race.phase !== 'finished'; t++) {
    if (race.phase === 'racing') script(inp, race.car, race);
    stepRace(race, inp);
    for (const e of race.events) events.push({ ...e, at: race.raceTick, hint: race.car.hint, speed: race.car.speed });
    race.events.length = 0;
  }
  return { race, events };
}

test('the Lineup starts centred on the straight, and throttle alone with no steering clears line one', () => {
  const start = createRace(pad, { event: LINEUP }).car;
  assert.equal(start.hint, (lip - 250 + pad.track.lap) % pad.track.lap);
  assert.equal(start.lat, 0);
  assert.equal(start.speed, 0);
  const { events } = lineupRun((inp) => { inp.throttle = 1; }, 12);
  const clear = events.find((e) => e.type === 'clear');
  assert.equal(clear?.count, 1);
  assert.ok(clear.at < 120 * 8, `first clear at tick ${clear.at}`);
});

test('after a clear the car is back on the run-up within 150 ticks, rolling at 30 m/s', () => {
  const { events } = lineupRun((inp) => { inp.throttle = 1; }, 12);
  const clear = events.find((e) => e.type === 'clear'), retry = events.find((e) => e.type === 'retry');
  assert.ok(retry && retry.at - clear.at <= 150, `retry ${retry?.at}, clear ${clear.at}`);
  assert.equal(retry.hint, (lip - 250 + pad.track.lap) % pad.track.lap);
  assert.equal(retry.speed, 30);
});

test('the autopilot clears four lines in under a minute', () => {
  const { race } = lineupRun((inp, c, r) => autopilot(r, inp, 1), 90);
  assert.equal(race.phase, 'finished');
  assert.ok(race.dare.score >= 10, `score ${race.dare.score}`);
  assert.ok(race.raceTick < 120 * 60, `ended at ${(race.raceTick / 120).toFixed(1)} s`);
});

test('a jump that leaves the lip beside the row scores nothing and goes back to the run-up', () => {
  const { race, events } = lineupRun((inp, c) => { inp.throttle = 1; inp.steer = steerTo(c, pad.track, 4, 0, 0); }, 12);
  assert.ok(events.some((e) => e.type === 'wide'), `events: ${[...new Set(events.map((e) => e.type))]}`);
  assert.equal(events.filter((e) => e.type === 'clear' || e.type === 'clip').length, 0);
  assert.equal(race.dare.score, 0);
  assert.equal(race.dare.count, 1);
});

const RAMP = EVENTS.find((e) => e.id === 'ramp');

function rampRun(script, { assist = true, tries = 1, ticks = 120 * 60 } = {}) {
  const race = createRace(pad, { event: RAMP, assist }), inp = createInput(), events = [];
  race.phase = 'racing'; race.raceTick = 0;
  for (let t = 0; t < ticks && race.dare.tries.length < tries && race.phase !== 'finished'; t++) {
    Object.assign(inp, { throttle: 1, brake: 0, steer: 0, boost: 0, roll: 0, pitch: 0, lift: 0, reset: 0 }, script(race.car, race.dare, t));
    stepRace(race, inp);
    events.push(...race.events);
    race.events.length = 0;
  }
  return { race, events };
}

test('the ramp runs on its own spur and leaves the circuit and its bake untouched', () => {
  assert.equal(pad.baked, true);
  const race = createRace(pad, { event: RAMP }), spur = pad.track.spurs.ramp;
  assert.equal(race.world.track, spur);
  assert.equal(race.world.terrain, pad.terrain);
  assert.equal(spur.closed, false);
  let ceiling = 0;
  for (let i = 0; i < spur.n; i++) if (spur.U[i * 3 + 1] < -0.99) ceiling = Math.max(ceiling, spur.H[i * 3 + 1] - spur.H[1]);
  assert.ok(ceiling > 14, `ceiling ${ceiling.toFixed(1)} m above the run-up`);
  assert.equal(spur.gap[spur.n - 2], 1);
});

test('a ramp try drives up the curl, holds the ceiling inverted, and lands upright with assist', () => {
  let inverted = 0;
  const { race, events } = rampRun((c) => { if (c.uy < -0.95 && c.mode === 1) inverted++; return {}; });
  assert.ok(inverted > 60, `held the ceiling for ${inverted} ticks`);
  const r = race.dare.tries[0];
  assert.ok(events.some((e) => e.type === 'release'));
  assert.ok(r.align > 0.9 && r.kept > 0.8, JSON.stringify(r));
  assert.equal(r.rolls, 0);
  assert.equal(r.points, Math.round(100 * r.align) + Math.round(100 * r.kept));
  assert.equal(race.dare.score, r.points);
});

test('an extra roll in the air counts, and landing it inverted scores nothing', () => {
  const roll = rampRun((c, d) => ({ roll: d.phase === 'free' && c.barrel < 2.5 * Math.PI ? 1 : 0, lift: d.phase === 'free' && c.uy > 0.3 ? 1 : 0 })).race.dare.tries[0];
  assert.equal(roll.rolls, 1);
  assert.equal(roll.points, Math.round(100 * roll.align) + Math.round(100 * roll.kept) + 150);
  const flat = rampRun(() => ({}), { assist: false }).race.dare.tries[0];
  assert.deepEqual(flat, { points: 0, why: 'wreck' });
});

test('reset ends the try with nothing, and the dare ends after three tries', () => {
  const { race, events } = rampRun((c, d, t) => ({ reset: d.phase === 'run' && c.hint > 100 && t % 2 ? 1 : 0 }), { tries: 3 });
  assert.deepEqual(race.dare.tries.map((r) => r.why), ['reset', 'reset', 'reset']);
  assert.equal(events.filter((e) => e.type === 'retry').length, 2);
  for (let t = 0; t < 400 && race.phase !== 'finished'; t++) stepRace(race, createInput());
  assert.equal(race.phase, 'finished');
  assert.equal(race.dare.over, true);
});

test('the autopilot finishes the ramp, and its recording replays to the same score', async () => {
  const { createRecorder, encodeRun, createGhost } = await import('../src/sim/ghost.js');
  const { packInput, unpackInput } = await import('../src/sim/race.js');
  const { autopilot } = await import('../src/sim/bot.js');
  const race = createRace(pad, { event: RAMP }), rec = createRecorder(), inp = createInput(), q = new Int8Array(6);
  for (let t = 0; t < 120 * 60 && race.phase !== 'finished'; t++) {
    if (race.phase === 'racing') autopilot(race, inp, 1);
    packInput(inp, q, 0); unpackInput(q, 0, inp);
    rec.push(inp);
    stepRace(race, inp);
    race.events.length = 0;
  }
  assert.equal(race.phase, 'finished');
  assert.equal(race.dare.tries.length, 3);
  assert.ok(race.dare.score > 450, `score ${race.dare.score}`);
  const ghost = createGhost(pad, encodeRun(race, rec.bytes()));
  while (ghost.race.phase !== 'finished') ghost.step();
  assert.deepEqual(ghost.race.dare, race.dare);
});

const launch = loadWorld('launch');
const TRENCH = eventsFor(launch.track, launch.venue).find((e) => e.id === 'trench');

async function trenchRun(meddle = () => {}) {
  const { autopilot } = await import('../src/sim/bot.js');
  const race = createRace(launch, { event: TRENCH }), inp = createInput(), events = [];
  for (let t = 0; t < 120 * 90 && race.phase !== 'finished'; t++) {
    autopilot(race, inp, 1);
    meddle(race);
    stepRace(race, inp);
    events.push(...race.events);
    race.events.length = 0;
  }
  return { race, events };
}

test('the trench is a timed spur on the launch complex with six gates, two of them on the ceiling', () => {
  assert.equal(launch.baked, true);
  assert.deepEqual(eventsFor(launch.track, launch.venue).map((e) => e.id), ['trench', 'hl', 'gp', 'tt', 'pr']);
  assert.equal(TRENCH.kind, 'trial');
  assert.equal(TRENCH.gates, 6);
  const spur = launch.track.spurs.trench;
  assert.equal(spur.gates.filter((g) => spur.U[g.i * 3 + 1] < -0.99).length, 2);
  assert.equal(TRENCH.cps[TRENCH.cps.length - 1], spur.finish);
});

test('the autopilot threads all six trench gates in about thirty seconds with no penalty', async () => {
  const { race, events } = await trenchRun();
  assert.equal(race.phase, 'finished');
  assert.equal(events.filter((e) => e.type === 'gate').length, 6);
  assert.equal(race.penalty, 0);
  assert.equal(race.respawns, 0);
  assert.ok(race.total > 120 * 18 && race.total < 120 * 40, `total ${(race.total / 120).toFixed(2)} s`);
});

test('a missed trench gate costs three seconds on the clock', async () => {
  const { race } = await trenchRun((r) => { if (r.gateLaps[2] !== undefined) r.gateLaps[2] = undefined; });
  assert.equal(race.penalty, 3);
  assert.equal(race.total, race.raceTick + 360);
});
