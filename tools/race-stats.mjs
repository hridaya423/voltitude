import { pathToFileURL } from 'node:url';
import { loadWorld } from './load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput, DT } from '../src/sim/race.js';
import { lineFor } from '../src/sim/driver.js';

const STILL = 240, EPISODE = 40;
const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);

export function raceStats(world, { seed, tier = 'pro', skill = 0.95 + 0.04 * ((seed * 37) % 10) / 10 }) {
  const { track } = world;
  const race = createRace(world, { event: eventsFor(track).find((e) => e.id === 'gp'), seed, tier });
  const inp = createInput();
  const boost = race.entries.map(() => ({ ticks: 0, bursts: 0, was: false }));
  const rel = new Map(), stuck = new Set(), log = [];
  let leader = null, cand = null, candTicks = 0, leadChanges = 0, closeTicks = 0, gapTicks = 0, side = 0, contactEpisodes = 0, lastContact = -Infinity;
  while (!race.entries.every((e) => e.done) && race.tick < 120 * 600) {
    botInput(race, inp, skill);
    stepRace(race, inp);
    for (const ev of race.events) if (ev.type === 'contact' && !race.done) { if (ev.tick - lastContact > EPISODE) contactEpisodes++; lastContact = ev.tick; }
    race.events.length = 0;
    if (race.phase !== 'racing') continue;
    race.entries.forEach((e, k) => {
      const on = e.car.boosting && e.car.thr > 0.5, b = boost[k];
      if (on) b.ticks++;
      if (on && !b.was) b.bursts++;
      b.was = on;
      if (e.still >= STILL) stuck.add(e.identity.code);
    });
    for (let i = 0; i < race.entries.length; i++) for (let j = i + 1; j < race.entries.length; j++) {
      const a = race.entries[i], b = race.entries[j], gap = a.prog - b.prog;
      if (Math.abs(gap) < 4 || a.done || b.done) continue;
      const key = i * 8 + j, sg = Math.sign(gap), was = rel.get(key);
      rel.set(key, sg);
      if (was !== undefined && was !== sg) {
        const w = sg > 0 ? a : b;
        log.push({ lap: Math.min(3, Math.floor(w.prog / track.lap) + 1), early: race.raceTick < 120 * 14, boosted: w.car.boosting, zone: Math.floor(w.car.hint / 100) * 100 });
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
      gapTicks++;
    }
    for (const a of race.entries) for (const b of race.entries) if (a.index < b.index && Math.abs(a.prog - b.prog) < 6 && Math.abs(a.car.lat - b.car.lat) < 4.5 && Math.abs(a.car.lat - b.car.lat) > 1.2 && a.car.speed > 8) side++;
  }
  for (const e of race.entries) if (!e.done) stuck.add(e.identity.code);
  const rivals = race.entries.slice(1), line = lineFor(track).time;
  const total = (e) => e.total * DT;
  return {
    seed, tier,
    order: race.order.map((e) => e.identity.code),
    win: total(race.order[0]), gapP2: total(race.order[1]) - total(race.order[0]), gapLast: total(race.order[race.order.length - 1]) - total(race.order[0]),
    leadChanges, swaps: race.swaps, heldPasses: race.entries.reduce((s, e) => s + (e.passes || 0), 0),
    playerContacts: contactEpisodes, contacts: race.contacts,
    closePct: Math.round((100 * closeTicks) / Math.max(gapTicks, 1)), sideBySide: Math.round(side / 120),
    resets: race.entries.reduce((s, e) => s + e.respawns, 0), wrecks: race.entries.reduce((s, e) => s + e.wrecks, 0), stuck: [...stuck],
    lapRatio: mean(rivals.flatMap((e) => e.laps.slice(1).map((l) => (l * DT) / line))),
    drivers: Object.fromEntries(race.entries.map((e, k) => [e.identity.code, {
      lap: mean(e.laps.map((l) => l * DT)), finish: e.finishPos, airLines: e.airLines || 0, gates: Math.round((e.earned.gate || 0) / 0.25),
      boostS: (boost[k].ticks * DT) / 3, bursts: boost[k].bursts / 3,
    }])),
    passes: log,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = Number(process.argv[2] || 12), world = loadWorld(process.argv[3] || 'proving'), tier = process.argv[4] || 'pro';
  const races = [];
  for (let seed = 1; seed <= count; seed++) {
    const r = raceStats(world, { seed, tier });
    races.push(r);
    console.log(JSON.stringify({ seed, order: r.order.join(' '), win: r.win.toFixed(1), gapP2: r.gapP2.toFixed(2), gapLast: r.gapLast.toFixed(1), leadChanges: r.leadChanges, passes: r.swaps, closePct: r.closePct, sideBySide: r.sideBySide, resets: r.resets }));
  }
  console.log('per driver (means over races): boost s/lap, bursts/lap, lap s, finish pos');
  for (const code of Object.keys(races[0].drivers)) {
    const rows = races.map((r) => r.drivers[code]);
    console.log(code, mean(rows.map((d) => d.boostS)).toFixed(2), mean(rows.map((d) => d.bursts)).toFixed(1), mean(rows.map((d) => d.lap)).toFixed(1), mean(rows.map((d) => d.finish)).toFixed(1));
  }
  const all = races.flatMap((r) => r.passes), byZone = {};
  for (const p of all) byZone[p.zone] = (byZone[p.zone] || 0) + 1;
  console.log('passes', JSON.stringify({ lap1: all.filter((p) => p.lap === 1).length, lap2: all.filter((p) => p.lap === 2).length, lap3: all.filter((p) => p.lap === 3).length, early: all.filter((p) => p.early).length, boosted: all.filter((p) => p.boosted).length, total: all.length }), 'by 100 m of lap', JSON.stringify(byZone));
  const ms = (f) => mean(races.map(f));
  console.log({ races: count, tier, meanGapP2: ms((r) => r.gapP2).toFixed(2), meanGapLast: ms((r) => r.gapLast).toFixed(1), meanLeadChanges: ms((r) => r.leadChanges).toFixed(2), meanPasses: ms((r) => r.swaps).toFixed(1), closePct: ms((r) => r.closePct).toFixed(0), sideBySideS: ms((r) => r.sideBySide).toFixed(1), distinctWinners: new Set(races.map((r) => r.order[0])).size });
}
