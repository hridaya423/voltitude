import { loadWorld } from './load-world.mjs';
import { raceStats } from './race-stats.mjs';
import { TIERS } from '../src/sim/race.js';

const ELITE = [0.95, 1.08];
const BEHIND = { easy: [1.025, 1.08], pro: [1.003, 1.04] };
const HELD = 4, CONTACTS = 3;

const count = Number(process.argv[2] || 20), venue = process.argv[3] || 'proving';
const world = loadWorld(venue), spans = world.track.airs.length > 0;
const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);

const runs = Object.fromEntries(Object.keys(TIERS).map((tier) => [tier, Array.from({ length: count }, (_, k) => raceStats(world, { seed: k + 1, tier }))]));
const elite = mean(runs.elite.map((r) => r.lapRatio));
let fail = false;
for (const [tier, races] of Object.entries(runs)) {
  const codes = Object.keys(races[0].drivers);
  const lapRatio = mean(races.map((r) => r.lapRatio));
  const band = tier === 'elite' ? ELITE : BEHIND[tier];
  const measured = tier === 'elite' ? lapRatio : lapRatio / elite;
  const out = {
    venue, tier, races: count,
    lapRatio: +lapRatio.toFixed(3), lapCheck: { against: tier === 'elite' ? 'line' : 'elite', value: +measured.toFixed(3), band },
    heldPasses: +mean(races.map((r) => r.heldPasses)).toFixed(1),
    playerContacts: +mean(races.map((r) => r.playerContacts)).toFixed(1),
    stuck: races.flatMap((r) => r.stuck),
    airLines: Object.fromEntries(codes.map((c) => [c, { perRace: +mean(races.map((r) => r.drivers[c].airLines)).toFixed(1), fewest: Math.min(...races.map((r) => r.drivers[c].airLines)) }])),
    wins: races.reduce((w, r) => ({ ...w, [r.order[0]]: (w[r.order[0]] || 0) + 1 }), {}),
  };
  const checks = {
    lap: measured >= band[0] && measured <= band[1],
    held: out.heldPasses >= HELD,
    contacts: out.playerContacts <= CONTACTS,
    stuck: out.stuck.length === 0,
    air: !spans || codes.every((c) => out.airLines[c].fewest >= 1),
  };
  const ok = Object.values(checks).every(Boolean);
  fail ||= !ok;
  console.log(JSON.stringify({ ...out, checks }));
  console.log(`${tier}: ${ok ? 'PASS' : 'FAIL ' + Object.keys(checks).filter((k) => !checks[k]).join(' ')}`);
}
process.exit(fail ? 1 : 0);
