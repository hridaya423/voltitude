import { buildCourse } from '../src/sim/course.js';
import { createCar, placeCar, stepCar, SLIDE, DT } from '../src/sim/drive.js';
import { createInput } from '../src/sim/race.js';

const world = { track: buildCourse({ start: [0, 0.62, 0], yaw: 0, w: 900, pieces: [{ len: 14000 }] }), terrain: { height: () => -50 } };
const deg = (r) => +(r * 57.3).toFixed(1);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const course = (c) => Math.atan2(c.vx, c.vz);
const angle = (c) => Math.atan2(c.slip, Math.max(c.vf, 1));
const catchIt = (c) => Math.max(-1, Math.min(1, Math.sign(angle(c)) * Math.min(1, Math.abs(angle(c)) * 8)));

function fresh(v) {
  const c = createCar(), inp = createInput();
  placeCar(c, world.track, 600, v, 0);
  const pace = () => { inp.throttle = Math.max(0, Math.min(1, (v - c.vf) * 0.6 + 0.12)); inp.brake = c.vf > v + 2 ? 0.4 : 0; };
  for (let t = 0; t < 240; t++) { pace(); stepCar(c, inp, world, t, false); }
  return { c, inp, pace };
}

export function slide(v, on, hold = 3, flick = 0) {
  const { c, inp, pace } = fresh(v), h0 = course(c);
  let k = 0, maxB = 0, spun = false, rec = -1, path = 0, kept = 0, slipMs = 0;
  for (let t = 0; t < 120 * (hold + 4); t++) {
    const held = t < 120 * hold;
    if (held) {
      const s = flick && t >= 120 * flick ? -1 : 1;
      k = Math.sign(k) === -s ? 0 : Math.max(-1, Math.min(1, k + s * 6 * DT));
      inp.steer = k; inp.slide = on ? 1 : 0;
    } else { inp.slide = 0; inp.steer = catchIt(c); }
    pace();
    stepCar(c, inp, world, t, false);
    const beta = Math.abs(angle(c));
    maxB = Math.max(maxB, beta);
    if (held) slipMs = Math.max(slipMs, Math.abs(c.slip));
    if (beta > 1.2) spun = true;
    if (t === Math.round(120 * hold) - 1) { path = Math.abs(wrap(course(c) - h0)); kept = c.speed / v; }
    if (!held && rec < 0 && beta < 0.05 && Math.abs(c.yawRate) < 0.1) rec = t * DT - hold;
  }
  return { v, slide: on, hold, flick, pathTurnDeg: deg(path), maxBetaDeg: deg(maxB), slipMs: +slipMs.toFixed(1), speedKept: +kept.toFixed(2), spun, recoveredInS: rec < 0 ? null : +rec.toFixed(2) };
}

export function corner(v, on, D = 150) {
  const { c, inp, pace } = fresh(v), h0 = course(c), x0 = c.x, z0 = c.z;
  let k = 0, side = 0, turnS = 0, exit = 0;
  for (let t = 0; t < 120 * 30; t++) {
    const d = wrap(course(c) - h0);
    if (!side && Math.abs(d) >= Math.PI / 2) { side = Math.sign(d); turnS = t * DT; exit = c.speed / v; }
    if (!side) { k = Math.min(1, k + 6 * DT); inp.steer = k; inp.slide = on ? 1 : 0; pace(); }
    else { inp.slide = 0; inp.steer = catchIt(c); inp.throttle = 1; inp.brake = 0; }
    stepCar(c, inp, world, t, false);
    const a = h0 + side * Math.PI / 2;
    if (side && (c.x - x0) * Math.sin(a) + (c.z - z0) * Math.cos(a) >= D) return { v, slide: on, turnS: +turnS.toFixed(2), exitSpeed: +exit.toFixed(2), lineS: +((t + 1) * DT).toFixed(2) };
  }
  return { v, slide: on, turnS: null, exitSpeed: null, lineS: null };
}

if (process.argv[1]?.endsWith('slide-lab.mjs')) {
  if (process.argv[2]) SLIDE.lock = +process.argv[2];
  console.log('steering lock x', SLIDE.lock);
  const rows = [];
  for (const v of [20, 30, 45, 60, 80]) for (const on of [false, true]) rows.push(slide(v, on));
  for (const v of [30, 45, 60]) rows.push(slide(v, true, 1.2, 0.6));
  console.table(rows);
  console.table([25, 35].flatMap((v) => [corner(v, false), corner(v, true)]));
}
