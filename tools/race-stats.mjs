import { loadWorld } from './load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput, DT } from '../src/sim/race.js';

const count = Number(process.argv[2] || 12);
const venueId = process.argv[3] || 'proving';
const world = loadWorld(venueId);
const ev = eventsFor(world.track).find((e) => e.id === 'gp');
const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
const per = new Map();
const passLog = { lap1: 0, lap2: 0, lap3: 0, early: 0, boosted: 0, total: 0, byZone: {} };
const races = [];
for (let seed = 1; seed <= count; seed++) {
  const race = createRace(world, { event: ev, seed });
  const inp = createInput();
  const boostTicks = new Map(), bursts = new Map(), was = new Map();
  const rel = new Map();
  let leader = null, cand = null, candTicks = 0, leadChanges = 0, closeTicks = 0, ticks = 0, gapSum = 0, side = 0;
  while (!race.entries.every((e) => e.done) && race.tick < 120 * 600) {
    botInput(race, inp, 0.95 + 0.04 * ((seed * 37) % 10) / 10);
    stepRace(race, inp);
    race.events.length = 0;
    if (race.phase !== 'racing') continue;
    ticks++;
    for (let k = 1; k < race.entries.length; k++) {
      const e = race.entries[k], on = e.car.boosting && e.car.thr > 0.5;
      if (on) boostTicks.set(k, (boostTicks.get(k) || 0) + 1);
      if (on && !was.get(k)) bursts.set(k, (bursts.get(k) || 0) + 1);
      was.set(k, on);
    }
    for (let i = 0; i < race.entries.length; i++) for (let j = i + 1; j < race.entries.length; j++) {
      const a = race.entries[i], b = race.entries[j], gap = a.prog - b.prog;
      if (Math.abs(gap) < 4 || a.done || b.done) continue;
      const key = i * 8 + j, sg = Math.sign(gap), was = rel.get(key);
      rel.set(key, sg);
      if (was !== undefined && was !== sg) {
        const w = sg > 0 ? a : b;
        passLog.total++;
        passLog[`lap${Math.min(3, Math.floor(w.prog / world.track.lap) + 1)}`]++;
        if (race.raceTick < 120 * 14) passLog.early++;
        if (w.car.boosting) passLog.boosted++;
        const z = Math.floor(w.car.hint / 100) * 100;
        passLog.byZone[z] = (passLog.byZone[z] || 0) + 1;
      }
    }
    const lead = race.order[0];
    if (!lead.done) {
      if (lead !== cand) { cand = lead; candTicks = 0; }
      else if (++candTicks === 360 && lead !== leader) { if (leader) leadChanges++; leader = lead; }
    }
    for (let r = 0; r + 1 < race.order.length; r++) {
      const a = race.order[r], b = race.order[r + 1];
      if (a.done || b.done) continue;
      if (a.prog - b.prog < 22 && a.car.speed > 8) closeTicks++;
      gapSum++;
    }
    for (const a of race.entries) for (const b of race.entries) if (a.index < b.index && Math.abs(a.prog - b.prog) < 6 && Math.abs(a.car.lat - b.car.lat) < 4.5 && Math.abs(a.car.lat - b.car.lat) > 1.2 && a.car.speed > 8) side++;
  }
  const order = race.order.map((e) => e.identity.code);
  const winT = race.order[0].total, last = race.order[race.order.length - 1].total;
  const second = race.order[1].total;
  const laps = race.entries.length > 0 ? race.entries.slice(1).map((e) => mean(e.laps) * DT) : [];
  races.push({ seed, order: order.join(' '), win: (winT * DT).toFixed(1), gapP2: ((second - winT) * DT).toFixed(2), gapLast: ((last - winT) * DT).toFixed(1), leadChanges, passes: race.swaps, closePct: Math.round((100 * closeTicks) / Math.max(gapSum, 1)), sideBySide: Math.round(side / 120), resets: race.entries.reduce((s, e) => s + e.respawns, 0) });
  for (let k = 1; k < race.entries.length; k++) {
    const code = race.entries[k].identity.code;
    const row = per.get(code) || { boostS: [], bursts: [], lap: [], finish: [] };
    row.boostS.push(((boostTicks.get(k) || 0) * DT) / 3);
    row.bursts.push((bursts.get(k) || 0) / 3);
    row.lap.push(laps[k - 1]);
    row.finish.push(race.entries[k].finishPos);
    per.set(code, row);
  }
}
for (const r of races) console.log(JSON.stringify(r));
console.log('per driver (means over races): boost s/lap, bursts/lap, lap s, finish pos');
for (const [code, r] of per) console.log(code, mean(r.boostS).toFixed(2), mean(r.bursts).toFixed(1), mean(r.lap).toFixed(1), mean(r.finish).toFixed(1));
console.log('passes', JSON.stringify({ ...passLog, byZone: undefined }), 'by 100 m of lap', JSON.stringify(passLog.byZone));
const ms = (k) => mean(races.map((r) => +r[k]));
console.log({ races: count, meanGapP2: ms('gapP2').toFixed(2), meanGapLast: ms('gapLast').toFixed(1), meanLeadChanges: ms('leadChanges').toFixed(2), meanPasses: ms('passes').toFixed(1), closePct: ms('closePct').toFixed(0), sideBySideS: ms('sideBySide').toFixed(1), distinctWinners: new Set(races.map((r) => r.order.split(' ')[0])).size, boostSPerLapPerRival: mean([...per.values()].map((r) => mean(r.boostS))).toFixed(2) });
