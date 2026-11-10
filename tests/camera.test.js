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
