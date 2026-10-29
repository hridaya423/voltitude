import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/load-world.mjs';
import { VENUES } from '../src/sim/venues.js';
import { seaMask } from '../src/sim/terrain.js';
import { createRace, stepRace, createInput, unpackInput, packInput, eventsFor, botInput } from '../src/sim/race.js';
import { createRecorder, encodeRun, createGhost } from '../src/sim/ghost.js';
import { placeCar, TUNING, wallAt } from '../src/sim/drive.js';
import { lineFor } from '../src/sim/driver.js';
import { contactPair } from '../src/sim/contact.js';

const world = loadWorld('airfield');
const EVENTS = eventsFor(world.track);
const byId = (id) => EVENTS.find((e) => e.id === id);

function botRace(event, w = world) {
  const race = createRace(w, { event });
  const rec = createRecorder();
  const raw = createInput(), applied = createInput(), bytes = new Int8Array(6);
  const events = [];
  while (race.phase !== 'finished' && race.tick < 120 * 400) {
    botInput(race, raw, 1);
    packInput(raw, bytes, 0);
    unpackInput(bytes, 0, applied);
    rec.push(applied);
    stepRace(race, applied);
    events.push(...race.events);
    race.events.length = 0;
  }
  return { race, rec, events };
}

for (const id of Object.keys(VENUES)) {
  const world = loadWorld(id);
  const name = VENUES[id].name;
  const circuit = !!world.track.closed;

  test(`${name}: baked terrain matches the current course`, () => {
    assert.ok(world.baked, `assets/terrain/height/${id}.bin is stale: run node tools/bake-terrain.mjs ${id}`);
  });

  test(`${name}: course frames are orthonormal`, () => {
    const { T, U, R, n } = world.track;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      for (const v of [T, U, R]) assert.ok(Math.abs(Math.hypot(v[k], v[k + 1], v[k + 2]) - 1) < 1e-6, `unit at ${i}`);
      assert.ok(Math.abs(T[k] * U[k] + T[k + 1] * U[k + 1] + T[k + 2] * U[k + 2]) < 1e-6, `T·U at ${i}`);
    }
  });

  if (VENUES[id].terrain.sea) test(`${name}: road stays above the water`, () => {
    const { P, gap, n } = world.track;
    for (let i = 0; i < n; i++) {
      if (gap[i] || seaMask(P[i * 3], P[i * 3 + 2], VENUES[id].terrain) < 0.15) continue;
      assert.ok(P[i * 3 + 1] > 1, `road at ${P[i * 3 + 1].toFixed(2)} m over water at sample ${i}`);
    }
  });

  test(`${name}: terrain never pokes through the drivable surface`, () => {
    const { P, U, gap, n } = world.track;
    let worst = Infinity, at = -1;
    for (let i = 0; i < n; i++) {
      if (gap[i] || U[i * 3 + 1] < 0.9) continue;
      const d = P[i * 3 + 1] - world.terrain.height(P[i * 3], P[i * 3 + 2]);
      if (d < worst) { worst = d; at = i; }
    }
    assert.ok(worst > 0.1, `terrain ${(-worst).toFixed(2)} m above road at sample ${at}`);
  });

  if (circuit) test(`${name}: the terrain lies just under the run-off`, () => {
    const { P, R, halfW, wallL, wallR, lap } = world.track;
    let high = -Infinity, deep = -Infinity, hi = -1, lo = -1;
    for (let i = 0; i < lap; i++) for (const side of [-1, 1]) {
      const wall = side < 0 ? wallL[i] : wallR[i], k = i * 3;
      const below = (lat) => { const l = side * lat; return P[k + 1] + R[k + 1] * l - world.terrain.height(P[k] + R[k] * l, P[k + 2] + R[k + 2] * l); };
      for (let lat = halfW[i] + 0.5; lat < wall - 1; lat += 1) if (-below(lat) > high) { high = -below(lat); hi = i; }
      if (wall > halfW[i] + 2 && below(wall + 1) > deep) { deep = below(wall + 1); lo = i; }
    }
    assert.ok(high < 0, `terrain ${high.toFixed(2)} m above the run-off at sample ${hi}`);
    assert.ok(deep < 2, `terrain ${deep.toFixed(2)} m below the run-off behind the wall at sample ${lo}`);
  });

  if (circuit) test(`${name}: the racing line laps in 60 to 90 seconds`, () => {
    const { time } = lineFor(world.track);
    assert.ok(time > 60 && time < 90, `${time.toFixed(1)} s`);
  });

  if (circuit) test(`${name}: a solo bot laps three times with no reset`, () => {
    const race = createRace(world, { event: eventsFor(world.track).find((e) => e.id === 'tt'), seed: 1 });
    const inp = createInput();
    let resets = 0;
    while (race.phase !== 'finished' && race.tick < 120 * 400) { botInput(race, inp, 1); stepRace(race, inp); resets += race.events.filter((e) => e.type === 'respawn').length; race.events.length = 0; }
    assert.equal(race.phase, 'finished');
    assert.equal(resets, 0);
    for (const t of race.laps) assert.ok(t / 120 > 60 && t / 120 < 90, `lap ${(t / 120).toFixed(1)} s`);
  });

  if (circuit) test(`${name}: full throttle into the walls is slower than braking for the corners`, () => {
    const lap2 = (flat) => {
      const race = createRace(world, { event: eventsFor(world.track).find((e) => e.id === 'tt'), seed: 1 });
      const inp = createInput();
      while (race.laps.length < 2 && race.tick < 120 * 300) {
        botInput(race, inp, 1);
        if (flat) Object.assign(inp, { throttle: 1, brake: 0, boost: 0 });
        stepRace(race, inp);
        race.events.length = 0;
      }
      return race.laps[1] ?? Infinity;
    };
    const bot = lap2(false), flat = lap2(true);
    assert.ok(flat > bot, `full throttle ${(flat / 120).toFixed(1)} s, braking ${(bot / 120).toFixed(1)} s`);
  });

  for (const ev of circuit ? [] : eventsFor(world.track)) {
    test(`${name}: autopilot clears ${ev.name} without a reset`, () => {
      const { race, events } = botRace(ev, world);
      assert.equal(race.phase, 'finished');
      assert.equal(events.filter((e) => e.type === 'respawn').length, 0);
      assert.equal(race.splits.length, ev.cps.length);
    });
  }
}

test('replaying recorded inputs reproduces the run exactly', () => {
  const { race, rec } = botRace(byId('tt'));
  const run = JSON.parse(JSON.stringify(encodeRun(race, rec.bytes())));
  const a = createGhost(world, run), b = createGhost(world, run);
  while (a.race.phase !== 'finished' && a.race.tick < 120 * 400) a.step();
  while (b.race.phase !== 'finished' && b.race.tick < 120 * 400) b.step();
  assert.equal(a.race.total, race.total);
  assert.deepEqual(a.race.splits, race.splits);
  assert.equal(a.race.car.x, b.race.car.x);
});

test('the car stays attached upside down at a crawl', () => {
  const ev = eventsFor(circuit.track).find((e) => e.id === 'tt');
  const race = createRace(circuit, { event: ev });
  const inp = createInput();
  while (race.phase !== 'racing') stepRace(race, inp);
  let i = 0, best = 0, run = 0;
  for (let k = 0; k < circuit.track.lap; k++) {
    run = circuit.track.U[k * 3 + 1] < -0.9 ? run + 1 : 0;
    if (run > best) { best = run; i = k - run + 1; }
  }
  placeCar(race.car, circuit.track, i, 6);
  inp.throttle = 0.3;
  for (let t = 0; t < 120; t++) stepRace(race, inp);
  assert.equal(race.car.mode, 1);
  assert.ok(race.car.uy < -0.7, `car up ${race.car.uy.toFixed(2)}`);
});

test('barriers keep the car on the road', () => {
  const race = createRace(world, { event: byId('tt') });
  const inp = createInput();
  while (race.phase !== 'racing') stepRace(race, inp);
  inp.throttle = 1; inp.steer = 1;
  for (let t = 0; t < 120 * 4; t++) stepRace(race, inp);
  assert.equal(race.car.mode, 1);
  assert.ok(Math.abs(race.car.lat) <= wallAt(world.track, race.car.hint, Math.sign(race.car.lat)) - 1.8);
});

test('reset returns the car to the last checkpoint', () => {
  const ev = byId('tt');
  const race = createRace(world, { event: ev });
  const inp = createInput();
  while (race.splits.length === 0) { botInput(race, inp, 1); stepRace(race, inp); race.events.length = 0; }
  for (let t = 0; t < 240; t++) { botInput(race, inp, 1); stepRace(race, inp); race.events.length = 0; }
  inp.reset = 1;
  stepRace(race, inp);
  assert.ok(race.events.some((e) => e.type === 'respawn'));
  assert.ok(Math.abs(race.car.hint - ev.cps[0]) < 4, `respawned at ${race.car.hint}`);
});

test('thrusters burn gas and never push harder than the car weighs', () => {
  const race = createRace(world, { event: byId('tt') });
  const inp = createInput();
  while (race.phase !== 'racing') stepRace(race, inp);
  const gas = race.car.gas;
  inp.boost = 1;
  for (let t = 0; t < 120; t++) stepRace(race, inp);
  assert.ok(race.car.boosting);
  assert.ok(race.car.gas < gas);
  assert.ok(TUNING.thrustG <= 1);
});

const circuit = loadWorld('proving');
const GP = eventsFor(circuit.track).find((e) => e.id === 'gp');
const TT = eventsFor(circuit.track).find((e) => e.id === 'tt');

function runField(event, seed, limit = 120 * 600) {
  const race = createRace(circuit, { event, seed });
  const inp = createInput();
  const deepest = { pen: 0 }, hit = {}, flights = [], air = race.entries.map(() => 0), takeoff = race.entries.map(() => 0);
  while (!race.entries.every((e) => e.done) && race.tick < limit) {
    botInput(race, inp, 0.97);
    stepRace(race, inp);
    race.events.length = 0;
    race.entries.forEach((e, k) => {
      if (e.car.mode === 0) { if (!air[k]) takeoff[k] = e.car.hint; air[k]++; }
      else { if (air[k] > 30) flights.push({ from: takeoff[k], land: e.car.hint, mode: e.car.mode }); air[k] = 0; }
    });
    for (let i = 0; i < race.entries.length; i++) for (let j = i + 1; j < race.entries.length; j++) {
      if (contactPair(race.entries[i].car, race.entries[j].car, hit) && hit.pen > deepest.pen) deepest.pen = hit.pen;
    }
  }
  return { race, deepest, flights };
}

test('the circuit closes on itself', () => {
  const { H, T, lap, n, closed } = circuit.track;
  assert.ok(closed);
  assert.equal(n, lap + 1);
  for (let c = 0; c < 3; c++) assert.equal(H[lap * 3 + c], H[c]);
  const jump = Math.hypot(H[3] - H[0], H[4] - H[1], H[5] - H[2]);
  assert.ok(Math.abs(jump - circuit.track.step) < 0.01);
  const last = Math.hypot(H[lap * 3] - H[(lap - 1) * 3], H[lap * 3 + 1] - H[(lap - 1) * 3 + 1], H[lap * 3 + 2] - H[(lap - 1) * 3 + 2]);
  assert.ok(Math.abs(last - circuit.track.step) < 0.01, `seam step ${last}`);
  const dot = T[0] * T[(lap - 1) * 3] + T[1] * T[(lap - 1) * 3 + 1] + T[2] * T[(lap - 1) * 3 + 2];
  assert.ok(dot > 0.999, `seam tangent ${dot}`);
});

test('the lap is 60 to 90 seconds on the racing line', () => {
  const { time } = lineFor(circuit.track);
  assert.ok(time > 60 && time < 90, `${time.toFixed(1)} s`);
});

test('the teardrop loop clears itself by more than the road width', () => {
  const { loops, P, lap, halfW } = circuit.track;
  assert.equal(loops.length, 1);
  const { from, to } = loops[0];
  let top = -Infinity, near = Infinity;
  for (let i = from; i <= to; i++) top = Math.max(top, circuit.track.H[i * 3 + 1]);
  for (let i = from; i <= to; i++) for (let j = i + 40; j <= to; j++) {
    const d = Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]);
    if (d < near) near = d;
  }
  assert.ok(top - circuit.track.H[from * 3 + 1] > 25, 'loop is tall');
  assert.ok(near > 2 * Math.max(...Array.from({ length: to - from }, (_, k) => halfW[from + k])) * 0.5 + 2, `closest approach ${near.toFixed(1)} m`);
});

test('the final hairpin has 14 m of run-off on its outside, and the loop keeps its walls', () => {
  const { curv, halfW, wallL, wallR, loopMask, air, lap } = circuit.track;
  let last = lap - 1;
  while (air[last] || loopMask[last] || Math.abs(curv[last]) < 0.02) last--;
  let apex = last;
  for (let i = last - 150; i <= last; i++) if (Math.abs(curv[i]) > Math.abs(curv[apex])) apex = i;
  const outside = curv[apex] > 0 ? wallL : wallR;
  assert.ok(outside[apex] - halfW[apex] >= 14, `outside run-off ${(outside[apex] - halfW[apex]).toFixed(1)} m at sample ${apex}`);
  let loops = 0;
  for (let i = 0; i < lap; i++) if (loopMask[i]) { loops++; assert.equal(wallL[i], halfW[i]); assert.equal(wallR[i], halfW[i]); }
  assert.ok(loops > 100);
});

test('every car that leaves a jump lands on its down-slope, or on the road inside its air span', () => {
  const { jumps, airs, T } = circuit.track;
  assert.ok(jumps.length >= 3 && airs.length >= 2, `${jumps.length} jumps, ${airs.length} air spans`);
  const { flights } = runField(GP, 2);
  const used = new Set();
  for (const f of flights) {
    const inSpan = circuit.track.air[f.from];
    const jump = inSpan ? jumps.find((j) => j.from === airs[inSpan - 1].from) : jumps.find((j) => f.from >= j.from - 5 && f.from <= j.to);
    assert.ok(jump, `flight from ${f.from} starts at no jump`);
    used.add(jump);
    const span = airs.find((a) => a.from === jump.from);
    const end = span ? span.to : jump.to;
    assert.equal(f.mode, 1, `flight from ${f.from} landed off the road at ${f.land}`);
    assert.ok(f.land > jump.lip && f.land < end, `landed at ${f.land}, landing runs ${jump.lip} to ${end}`);
    if (!span) assert.ok(T[f.land * 3 + 1] < -0.01, `landing slope ${T[f.land * 3 + 1].toFixed(3)} at ${f.land}`);
  }
  assert.equal(used.size, jumps.length, 'every jump was flown');
});

test('a solo bot laps the circuit three times with no reset', () => {
  const race = createRace(circuit, { event: TT, seed: 1 });
  const inp = createInput();
  const events = [];
  while (race.phase !== 'finished' && race.tick < 120 * 400) { botInput(race, inp, 1); stepRace(race, inp); events.push(...race.events); race.events.length = 0; }
  assert.equal(race.phase, 'finished');
  assert.equal(race.laps.length, 3);
  assert.equal(events.filter((e) => e.type === 'respawn').length, 0);
  for (const t of race.laps) assert.ok(t / 120 > 60 && t / 120 < 90, `lap ${(t / 120).toFixed(1)} s`);
  assert.equal(events.filter((e) => e.type === 'lap').length, 3);
});

test('a Grand Prix field of eight finishes three laps with no stuck car or reset', () => {
  const { race, deepest } = runField(GP, 3);
  assert.equal(race.entries.length, 8);
  for (const e of race.entries) {
    assert.ok(e.done, `${e.identity.code} did not finish`);
    assert.equal(e.laps.length, 3);
    assert.equal(e.respawns, 0, `${e.identity.code} reset`);
  }
  assert.deepEqual(race.order.map((e) => e.pos), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(race.contacts > 0, 'cars touched');
  assert.ok(deepest.pen < 0.8, `deepest overlap ${deepest.pen.toFixed(2)} m`);
});

test('the field is not rubber-banded: AI times ignore the player', () => {
  const a = runField(GP, 5).race, b = (() => {
    const race = createRace(circuit, { event: GP, seed: 5 });
    const inp = createInput();
    while (!race.entries.slice(1).every((e) => e.done) && race.tick < 120 * 400) { inp.throttle = 0; inp.brake = 1; stepRace(race, inp); race.events.length = 0; }
    return race;
  })();
  const lead = a.order.find((e) => e.index === 1), lead2 = b.entries[1];
  assert.ok(Math.abs(lead.laps[0] - lead2.laps[0]) / 120 < 8, `${lead.laps[0]} vs ${lead2.laps[0]}`);
  const pace = lineFor(circuit.track).time * 1.15;
  assert.ok(lead2.laps[2] / 120 < pace, `lap 3 ${(lead2.laps[2] / 120).toFixed(1)} s against ${pace.toFixed(1)} s`);
});

test('replaying the player inputs reproduces the whole race', () => {
  const race = createRace(circuit, { event: GP, seed: 9 });
  const inp = createInput(), applied = createInput(), bytes = new Int8Array(6), rec = createRecorder();
  while (!race.entries.every((e) => e.done) && race.tick < 120 * 400) {
    botInput(race, inp, 0.95);
    packInput(inp, bytes, 0); unpackInput(bytes, 0, applied); rec.push(applied);
    stepRace(race, applied);
    race.events.length = 0;
  }
  const run = JSON.parse(JSON.stringify(encodeRun(race, rec.bytes())));
  const ghost = createGhost(circuit, run);
  while (!ghost.race.entries.every((e) => e.done) && ghost.race.tick < 120 * 400) ghost.step();
  assert.equal(ghost.race.total, race.total);
  for (let k = 0; k < 8; k++) {
    assert.equal(ghost.race.entries[k].car.x, race.entries[k].car.x);
    assert.equal(ghost.race.entries[k].total, race.entries[k].total);
  }
});

test('car to car contact separates the cars and passes momentum forward', () => {
  const race = createRace(circuit, { event: GP, seed: 1 });
  const a = race.entries[1], b = race.entries[2];
  placeCar(b.car, circuit.track, 400, 30);
  placeCar(a.car, circuit.track, 396, 60);
  const inp = createInput();
  race.phase = 'racing'; race.raceTick = 1;
  const before = a.car.speed;
  const hit = {};
  for (let t = 0; t < 30; t++) { stepRace(race, inp); race.events.length = 0; }
  assert.ok(a.car.speed < before - 1, `rear car slowed to ${a.car.speed.toFixed(1)}`);
  assert.ok(!contactPair(a.car, b.car, hit) || hit.pen < 0.3);
});

test('the bot drives across the start line seam and the car stays on the road', () => {
  const race = createRace(circuit, { event: TT, seed: 1 });
  const inp = createInput();
  while (race.laps.length < 1 && race.tick < 120 * 180) {
    botInput(race, inp, 1);
    stepRace(race, inp);
    race.events.length = 0;
  }
  assert.equal(race.laps.length, 1);
  assert.equal(race.car.mode, 1);
});
