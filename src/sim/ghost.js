import { SIM_VERSION, packInput, unpackInput, createRace, stepRace, createInput, eventsFor } from './race.js';

export const STRIDE = 6;

export function createRecorder() {
  let buf = new Int8Array(STRIDE * 120 * 60);
  let n = 0;
  return {
    push(inp) {
      if ((n + 1) * STRIDE > buf.length) {
        const next = new Int8Array(buf.length * 2);
        next.set(buf);
        buf = next;
      }
      packInput(inp, buf, n * STRIDE);
      n++;
    },
    get length() { return n; },
    bytes() { return buf.slice(0, n * STRIDE); },
  };
}

export function encodeRun(race, bytes) {
  let s = '';
  const u = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return { v: SIM_VERSION, event: race.event.id, assist: race.assist, seed: race.seed, tier: race.tier, total: race.total, splits: race.splits, laps: race.laps, inputs: btoa(s) };
}

export function decodeInputs(run) {
  const s = atob(run.inputs);
  const out = new Int8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = (s.charCodeAt(i) << 24) >> 24;
  return out;
}

export function createGhost(world, run) {
  if (!run || run.v !== SIM_VERSION) return null;
  const inputs = decodeInputs(run);
  const event = eventsFor(world.track, world.venue).find((e) => e.id === run.event);
  if (!event) return null;
  const race = createRace(world, { event, assist: run.assist, seed: run.seed, tier: run.tier });
  const inp = createInput();
  let i = 0;
  const frames = inputs.length / STRIDE;
  return {
    race, run,
    step(sink) {
      if (i < frames) unpackInput(inputs, i * STRIDE, inp);
      else { inp.throttle = 0; inp.brake = 0; inp.boost = 0; inp.steer = 0; inp.pitch = 0; inp.roll = 0; inp.reset = 0; }
      i++;
      stepRace(race, inp);
      sink?.push(...race.events);
      race.events.length = 0;
    },
  };
}
