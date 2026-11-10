import { loadWorld } from './load-world.mjs';
import { createRace, stepRace, createInput, eventsFor, botInput } from '../src/sim/race.js';
import { lineFor } from '../src/sim/driver.js';
import * as hints from '../src/hints.js';

const VENUES = (process.env.VENUES || 'proving,airfield,launch,pad').split(',');
const DT = 1 / 120;
const old = (line, lap) => { let on = false; return (c) => (on = c.mode === 1 && c.uy >= 0.3 && c.speed > line.cap[(c.hint + Math.round(c.speed * 0.5)) % lap] + (on ? 0 : 3)); };
const cues = { old, ...(hints.createBrakeCue && { new: (line, lap, track) => { const cue = hints.createBrakeCue(track, line); return (c) => cue(c, DT); } }) };

function drive(world, kind, make, laps = 1) {
  const ev = eventsFor(world.track, world.venue).find((e) => e.id === 'tt') || eventsFor(world.track, world.venue).find((e) => e.id === 'hl');
  const race = createRace(world, { event: ev }), inp = createInput(), track = world.track, line = lineFor(track), N = track.lap, cue = make(line, N, track);
  const delay = new Float32Array(36), corner = (c) => { let m = Infinity; for (let k = 0; k < 250; k++) m = Math.min(m, line.vlim[(c.hint + k) % N]); return m; };
  const out = Array.from({ length: laps }, () => ({ ticks: 0, on: 0, onBraking: 0, rises: 0, busy: 0, brakes: [], cues: [] }));
  let was = false, braked = false, t = 0;
  for (; t < 120 * 400 && race.laps.length < laps; t++) {
    botInput(race, inp, 1);
    const c = race.car;
    if (kind === 'early') { const ahead = line.v[(c.hint + Math.round(c.speed)) % N]; if (ahead < c.speed - 0.3) { inp.throttle = 0; inp.brake = 1; inp.boost = 0; } }
    if (kind === 'late') { const want = inp.brake, b = delay[t % 36]; delay[t % 36] = want; inp.brake = b; inp.throttle = b > 0 ? 0 : want > 0 ? 1 : inp.throttle; }
    if (kind === 'obey') { inp.throttle = was ? 0 : 1; inp.brake = was ? 1 : 0; inp.boost = 0; }
    stepRace(race, inp);
    race.events.length = 0;
    if (race.phase !== 'racing' || race.laps.length >= laps) continue;
    const o = out[race.laps.length], on = cue(c);
    o.ticks++;
    if (on) { o.on++; if (c.brake > 0.3) o.onBraking++; }
    if (on && !was) { o.rises++; o.cues.push(race.raceTick); if (c.brake > 0.3 || c.speed <= corner(c)) o.busy++; }
    const b = c.brake > 0.3 && c.speed > 20;
    if (b && !braked) o.brakes.push(race.raceTick);
    braked = b; was = on;
  }
  return out;
}

const rows = [];
for (const id of VENUES) {
  const world = loadWorld(id);
  for (const kind of ['ai', 'early', 'late']) for (const [name, make] of Object.entries(cues)) {
    const [o] = drive(world, kind, make);
    let covered = 0, lead = [];
    if (kind === 'late') for (const b of o.brakes) { const k = o.cues.filter((x) => x <= b + 6 && x > b - 240).pop(); if (k !== undefined) { covered++; lead.push(((b - k) / 120).toFixed(2)); } }
    rows.push({ venue: id, driver: kind, cue: name, onPct: ((100 * o.on) / o.ticks).toFixed(1), activations: o.rises, litWhileBrakingPct: o.on ? ((100 * o.onBraking) / o.on).toFixed(0) : '-', whileBrakingOrUnder: o.busy, ...(kind === 'late' && { brakeZones: o.brakes.length, cuedBefore: covered, leadS: lead.join(' ') }) });
  }
}
console.table(rows);
