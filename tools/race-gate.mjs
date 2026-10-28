import { loadWorld } from './load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';

const count = Number(process.argv[2] || 20);
const venueId = process.argv[3] || 'proving';
const world = loadWorld(venueId);
const ev = eventsFor(world.track).find((e) => e.id === 'gp');
const orders = new Set(), winners = new Map();
const rows = [];
let fail = 0;
for (let seed = 1; seed <= count; seed++) {
  const race = createRace(world, { event: ev, seed });
  const inp = createInput();
  let ticks = 0;
  while (!race.entries.every((e) => e.done) && ticks < 120 * 600) { botInput(race, inp, 0.9 + 0.08 * ((seed * 37) % 10) / 10); stepRace(race, inp); race.events.length = 0; ticks++; }
  const order = race.order.map((e) => e.identity.code).join(' ');
  orders.add(order);
  winners.set(race.order[0].identity.code, (winners.get(race.order[0].identity.code) || 0) + 1);
  const resets = race.entries.reduce((s, e) => s + e.respawns, 0), dnf = race.entries.filter((e) => !e.done).length;
  const wrecks = race.entries.reduce((s, e) => s + e.wrecks, 0);
  const slowest = Math.max(...race.entries.map((e) => e.total));
  if (resets || dnf || wrecks) fail++;
  rows.push({ seed, order, passes: race.swaps, contacts: race.contacts, resets, wrecks, dnf, time: (slowest / 120).toFixed(1) });
  console.log(`seed ${seed}: ${order} | passes ${race.swaps} resets ${resets} wrecks ${wrecks} dnf ${dnf} t=${(slowest / 120).toFixed(0)}s`);
}
const passes = rows.reduce((s, r) => s + r.passes, 0) / rows.length;
console.log({ races: count, distinctOrders: orders.size, winners: Object.fromEntries(winners), meanPasses: +passes.toFixed(1), racesWithResetOrWreckOrDnf: fail });
const ok = fail === 0 && orders.size >= Math.ceil(count * 0.75) && winners.size >= 2 && passes >= 5;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
