import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const three = new URL('../rl/vendor/three-r169/build/three.module.js', import.meta.url).href;
registerHooks({ resolve: (s, c, next) => next(s === 'three' ? three : s, c) });
const THREE = await import('three');
const { createChaseCamera } = await import('../src/render/camera.js');

function settle(speed, { reduced = false, boosting = false } = {}) {
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.3, 9000), chase = createChaseCamera(camera, () => 0);
  const c = { speed, mode: 1, wrecked: false, ux: 0, uy: 1, uz: 0, vx: 0, vy: 0, vz: speed, fx: 0, fy: 0, fz: 1, rx: -1, ry: 0, rz: 0, yawRate: 0, lifting: false, boosting };
  const p = new THREE.Vector3(0, 0.5, 0), right = new THREE.Vector3();
  let roll = 0;
  for (let k = 0; k < 600; k++) { p.z += speed / 120; chase.update(1 / 120, p, c, { reduced }); roll = Math.max(roll, Math.abs(right.set(1, 0, 0).applyQuaternion(camera.quaternion).y)); }
  return { fov: camera.fov, back: camera.position.distanceTo(p), size: 1 / (camera.position.distanceTo(p) * Math.tan(camera.fov * Math.PI / 360)), roll };
}

test('the field of view keeps widening up to top speed', () => {
  const rest = settle(0), mid = settle(68), top = settle(114);
  assert.ok(rest.fov > 45 && rest.fov < 47, `rest ${rest.fov.toFixed(1)}`);
  assert.ok(top.fov > 62 && top.fov < 66, `top ${top.fov.toFixed(1)}`);
  assert.ok(top.fov - mid.fov > 5, `top minus 60% speed is ${(top.fov - mid.fov).toFixed(1)} deg`);
});

test('the car looks smaller at top speed than at rest', () => {
  const rest = settle(0), top = settle(114);
  assert.ok(top.size / rest.size > 0.75 && top.size / rest.size < 0.9, `size ratio ${(top.size / rest.size).toFixed(2)}`);
});

test('reduced motion fixes the field of view and removes the speed rumble', () => {
  const rest = settle(0, { reduced: true }), top = settle(114, { reduced: true });
  assert.equal(Math.round(rest.fov), 44);
  assert.equal(Math.round(top.fov), 44);
  assert.ok(top.roll < 1e-6, `roll ${top.roll}`);
});

test('the speed rumble exists at top speed and stays small', () => {
  const slow = settle(40), top = settle(114);
  assert.ok(slow.roll < 1e-6, `rumble at 40 m/s: ${slow.roll}`);
  assert.ok(top.roll > 0.001 && top.roll < 0.0026, `rumble at top speed: ${top.roll.toFixed(5)} rad`);
});

test('the road ahead stays in view and the camera stays behind the car through a loop', () => {
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.3, 9000), chase = createChaseCamera(camera, () => 0);
  const R = 16, v = 50, L = 2 * Math.PI * R, p = new THREE.Vector3(), q = new THREE.Vector3(), F = new THREE.Vector3(), U = new THREE.Vector3(), fw = new THREE.Vector3();
  const at = (s, pos, f, u) => {
    const th = Math.max(0, Math.min(L, s)) / R;
    pos.set(0, R + 0.5 - R * Math.cos(th), R * Math.sin(th) + Math.min(0, s) + Math.max(0, s - L));
    f?.set(0, Math.sin(th), Math.cos(th)); u?.set(0, Math.cos(th), -Math.sin(th));
    return pos;
  };
  const c = { speed: v, mode: 1, wrecked: false, yawRate: 0, lifting: false, boosting: false };
  let worst = 1, behind = -Infinity, seen = Infinity, car = Infinity;
  for (let s = -120; s < L + 40; s += v / 120) {
    at(s, p, F, U);
    Object.assign(c, { fx: F.x, fy: F.y, fz: F.z, ux: U.x, uy: U.y, uz: U.z, vx: F.x * v, vy: F.y * v, vz: F.z * v, rx: F.y * U.z - F.z * U.y, ry: F.z * U.x - F.x * U.z, rz: F.x * U.y - F.y * U.x });
    chase.update(1 / 120, p, c, { reduced: false });
    camera.updateMatrixWorld();
    if (s < 0) continue;
    camera.getWorldDirection(fw);
    worst = Math.min(worst, fw.dot(F));
    behind = Math.max(behind, q.subVectors(camera.position, p).dot(F));
    q.copy(p).addScaledVector(U, 0.6).project(camera); car = Math.min(car, 0.6 - Math.abs(q.y));
    for (const d of [8, 15]) { at(s + d, q).project(camera); seen = Math.min(seen, 1 - Math.max(Math.abs(q.x), Math.abs(q.y), q.z > 1 ? 9 : 0)); }
  }
  assert.ok(worst > 0.75, `camera forward against car forward: ${worst.toFixed(2)}`);
  assert.ok(behind < -3, `camera offset along car forward: ${behind.toFixed(1)} m`);
  assert.ok(car > 0, `car outside the middle of the view by ${(-car).toFixed(2)}`);
  assert.ok(seen > 0, `road ahead outside the view by ${(-seen).toFixed(2)}`);
});
