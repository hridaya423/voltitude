import { buildCourse } from '../src/sim/course.js';
import { createCar, placeCar, stepCar, steerLimit, DT, TUNING } from '../src/sim/drive.js';
import { createInput } from '../src/sim/race.js';

const MPH = 0.44704;
const START = 600;

export function flatWorld(len = 14000, w = 150) {
  const track = buildCourse({ start: [0, 0.62, 0], yaw: 0, w, pieces: [{ len }] });
  return { track, terrain: { height: () => -50 } };
}

function fresh(world, speed = 0) {
  const c = createCar();
  placeCar(c, world.track, START, speed, 0);
  const inp = createInput();
  for (let t = 0; t < 120; t++) stepCar(c, inp, world, t, false);
  return { c, inp };
}

export function zeroToSixty(world, boost) {
  const { c, inp } = fresh(world);
  inp.throttle = 1; inp.boost = boost ? 1 : 0;
  const x0 = c.x, z0 = c.z;
  for (let t = 0; t < 120 * 8; t++) {
    stepCar(c, inp, world, t, false);
    if (c.speed >= 60 * MPH) return { time: (t + 1) * DT, dist: Math.hypot(c.x - x0, c.z - z0), gas: c.gas };
  }
  return { time: Infinity };
}

export function topSpeed(world) {
  const { c, inp } = fresh(world);
  inp.throttle = 1;
  let last = 0;
  for (let t = 0; t < 120 * 400 && c.hint < world.track.n - 300; t++) {
    stepCar(c, inp, world, t, false);
    if (t % 120 === 0) {
      if (t > 0 && c.speed - last < 0.02) break;
      last = c.speed;
    }
  }
  return { mph: c.speed / MPH, ms: c.speed };
}

export function braking(world, from = 60) {
  const { c, inp } = fresh(world, from * MPH);
  inp.brake = 1;
  const x0 = c.x, z0 = c.z;
  for (let t = 0; t < 120 * 10; t++) {
    stepCar(c, inp, world, t, false);
    if (c.speed < 0.3) return { dist: Math.hypot(c.x - x0, c.z - z0), time: t * DT };
  }
  return { dist: Infinity };
}

function lap(world, radius, v) {
  const { c, inp } = fresh(world, Math.min(v, 12));
  const cx = c.x + c.rx * radius, cz = c.z + c.rz * radius;
  let e1 = 0, e2 = 0, sp = 0, rad = radius;
  for (let t = 0; t < 120 * 36; t++) {
    const dx = c.x - cx, dz = c.z - cz;
    const d = Math.hypot(dx, dz);
    const tx = -dz / d, tz = dx / d;
    const errH = Math.atan2(tx * c.rx + tz * c.rz, tx * c.fx + tz * c.fz);
    const delta = Math.atan(2.94 / radius) + 1.4 * errH + 0.05 * (d - radius);
    inp.steer = Math.max(-1, Math.min(1, delta / steerLimit(c.speed)));
    const want = Math.min(v, 8 + t * DT * 1.5);
    inp.throttle = Math.max(0, Math.min(1, (want - c.speed) * 0.8 + 0.1));
    inp.brake = c.speed > want + 1.5 ? 1 : 0;
    stepCar(c, inp, world, t, false);
    if (t === 120 * 24) e1 = d;
    if (t > 120 * 22) sp = Math.max(sp, Math.abs(c.speed - v));
    e2 = d;
  }
  rad = e2;
  return Math.abs(e2 - e1) < 0.3 && Math.abs(e2 - radius) < 5 && sp < 1 ? (v * v) / rad / 9.81 : 0;
}

export function skidpad(world, radius = 30.5) {
  let lo = 10, hi = 30, g = 0;
  for (let k = 0; k < 8; k++) {
    const mid = (lo + hi) / 2;
    const r = lap(world, radius, mid);
    if (r) { lo = mid; g = r; } else hi = mid;
  }
  return { g, v: lo };
}

if (process.argv[1]?.endsWith('physics-lab.mjs')) {
  const world = flatWorld();
  const a = zeroToSixty(world, false), b = zeroToSixty(world, true);
  console.log('0-60', a, 'with thrusters', b);
  console.log('braking 60-0', braking(world));
  console.log('top speed', topSpeed(world));
  console.log('skidpad', skidpad(world), TUNING.thrustG);
}

export function wallScrape(deg, v = 70, secs = 1.5) {
  const world = flatWorld(3000, 10), { T, R } = world.track, k = START * 3, a = (deg * Math.PI) / 180;
  const c = createCar(), inp = createInput();
  placeCar(c, world.track, START, v, 6.5);
  c.fx = T[k] * Math.cos(a) + R[k] * Math.sin(a); c.fy = 0; c.fz = T[k + 2] * Math.cos(a) + R[k + 2] * Math.sin(a);
  c.rx = R[k] * Math.cos(a) - T[k] * Math.sin(a); c.ry = 0; c.rz = R[k + 2] * Math.cos(a) - T[k + 2] * Math.sin(a);
  c.vx = c.fx * v; c.vz = c.fz * v;
  let wrecked = false;
  for (let t = 0; t < 120 * secs; t++) { stepCar(c, inp, world, t, false); wrecked ||= c.ev.some((e) => e.type === 'wreck'); c.ev.length = 0; }
  return { speed: c.speed, wrecked };
}
