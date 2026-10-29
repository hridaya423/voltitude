import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const WRECK_BACK = 11, WRECK_UP = 4, WRECK_ORBIT = 0.35, CLEAR = 1.5;

export function createChaseCamera(camera, height) {
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), upS = new THREE.Vector3(0, 1, 0);
  const want = new THREE.Vector3(), wantLook = new THREE.Vector3(), dir = new THREE.Vector3(0, 0, 1), tmp = new THREE.Vector3(), vel = new THREE.Vector3();
  let fov = 70, shake = 0, init = false, t = 0, blend = 1, stall = 0, back = 7, breath = 0, wasBoost = false, hover = 0;
  const offS = new THREE.Vector3(), lookS = new THREE.Vector3();
  const fromOff = new THREE.Vector3(), toOff = new THREE.Vector3(), aim = new THREE.Vector3();
  let fromFov = 70, fromShift = 0;
  return {
    snap() { init = false; },
    from(cam, p) { fromOff.subVectors(cam.position, p); fromFov = cam.fov; fromShift = cam.filmOffset; blend = 0; },
    bump(v) { shake = Math.min(1, shake + v * 0.6); },
    stall(s) { stall = Math.max(stall, s); },
    update(dt, p, c, opts) {
      t += dt;
      if (blend >= 1 && camera.filmOffset !== 0) { camera.filmOffset *= Math.exp(-dt * 3); if (Math.abs(camera.filmOffset) < 0.01) camera.filmOffset = 0; camera.updateProjectionMatrix(); }
      const speed = c.speed;
      const grounded = c.mode !== 0;
      if (grounded && !c.wrecked) tmp.set(c.ux, c.uy, c.uz); else tmp.copy(UP);
      if (!init) upS.copy(tmp);
      upS.lerp(tmp, 1 - Math.exp(-dt * (grounded ? (tmp.y < upS.y - 0.02 ? 4.6 : 6.9) : 1.6))).normalize();
      vel.set(c.vx, c.vy, c.vz);
      if (grounded || speed < 8) {
        tmp.set(c.fx, c.fy, c.fz);
        if (speed > 8) tmp.lerp(vel.multiplyScalar(1 / speed), 0.35);
      } else tmp.copy(vel).multiplyScalar(1 / speed);
      tmp.addScaledVector(upS, -tmp.dot(upS)).normalize();
      if (!init) dir.copy(tmp);
      if (c.wrecked) dir.addScaledVector(UP, -dir.dot(UP)).normalize().applyAxisAngle(UP, dt * WRECK_ORBIT);
      else dir.lerp(tmp, 1 - Math.exp(-dt * (grounded ? 7 : 3))).normalize();
      hover += ((c.lifting && !grounded ? 1 : 0) - hover) * (1 - Math.exp(-dt * 2));
      const wantBack = 7.5 + Math.min(speed, 140) * 0.004 + (c.boosting ? 0.4 : 0) + 1.5 * hover;
      back += (wantBack - back) * (1 - Math.exp(-dt * 3));
      const ahead = Math.max(9, Math.min(speed, 120) * 0.18);
      const bias = grounded ? Math.max(-0.14, Math.min(0.14, c.yawRate * 0.15)) * ahead : 0;
      want.copy(p).addScaledVector(dir, -back).addScaledVector(upS, 1.8 + 0.15 * Math.min(1, Math.max(0, speed - 40) / 40) + (grounded ? 0 : 0.6) + hover);
      wantLook.copy(p).addScaledVector(dir, ahead).addScaledVector(upS, 0.25);
      if (bias) wantLook.x += c.rx * bias, wantLook.y += c.ry * bias, wantLook.z += c.rz * bias;
      want.sub(p); wantLook.sub(p);
      if (c.wrecked) { want.copy(dir).multiplyScalar(-WRECK_BACK).addScaledVector(UP, WRECK_UP); wantLook.set(0, 0, 0); }
      if (!init) { offS.copy(want); lookS.copy(wantLook); up.copy(upS); init = true; }
      if (stall > 0) stall -= dt;
      else {
        offS.lerp(want, 1 - Math.exp(-dt * 9));
        lookS.lerp(wantLook, 1 - Math.exp(-dt * 14));
      }
      pos.copy(p).add(offS);
      look.copy(p).add(lookS);
      for (let s = 1; s <= 4; s++) {
        const f = s / 4;
        const x = p.x + (pos.x - p.x) * f, z = p.z + (pos.z - p.z) * f, g = height(x, z);
        if (g > p.y + (pos.y - p.y) * f) { pos.set(x, g + CLEAR, z); break; }
      }
      const ground = height(pos.x, pos.z) + 1.0;
      if (pos.y < ground) pos.y = ground;
      up.lerp(upS, 1 - Math.exp(-dt * 10)).normalize();
      camera.position.copy(pos);
      camera.up.copy(up);
      camera.lookAt(look);
      shake = Math.max(0, shake - dt);
      let s = shake * shake;
      if (opts.reduced) s *= 0.15;
      if (s > 0.001) {
        camera.rotateZ((Math.sin(t * 63) + Math.sin(t * 37 + 2)) * 0.5 * 0.021 * s);
        camera.rotateX((Math.sin(t * 47 + 1.3) + Math.sin(t * 29)) * 0.5 * 0.014 * s);
        camera.rotateY(Math.sin(t * 39 + 2.1) * 0.008 * s);
      }
      if (wasBoost && !c.boosting) breath = 0.3;
      wasBoost = c.boosting;
      breath = Math.max(0, breath - dt);
      const sv = 1 - Math.pow(1 - Math.min(1, speed / 120), 2);
      const wantFov = 40 + 6 * sv + (c.boosting ? 3 : 0) - (breath > 0 ? 1.5 : 0);
      const target = opts.reduced ? 44 : wantFov;
      fov += (target - fov) * (1 - Math.exp(-dt * (target > fov ? 3.3 : 2)));
      if (blend < 1) {
        blend = Math.min(1, blend + dt / 1.4);
        const e = blend < 0.5 ? 4 * blend * blend * blend : 1 - Math.pow(-2 * blend + 2, 3) / 2;
        toOff.subVectors(camera.position, p);
        const a0 = Math.atan2(fromOff.x, fromOff.z), a1 = Math.atan2(toOff.x, toOff.z);
        let da = a1 - a0;
        da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
        const a = a0 + da * e;
        const r = THREE.MathUtils.lerp(Math.hypot(fromOff.x, fromOff.z), Math.hypot(toOff.x, toOff.z), e);
        const y = THREE.MathUtils.lerp(fromOff.y, toOff.y, e) + Math.sin(Math.PI * e) * 1.2;
        camera.position.set(p.x + Math.sin(a) * r, p.y + y, p.z + Math.cos(a) * r);
        aim.lerpVectors(p, look, e * e);
        camera.lookAt(aim);
        camera.fov = fromFov + (fov - fromFov) * e;
        camera.filmOffset = fromShift * (1 - e);
        camera.updateProjectionMatrix();
      } else if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    },
  };
}

export function createBroadcastCamera(camera, track, height) {
  const cams = [];
  for (let i = 40, side = 1; i < track.n - 40; i += 110, side = -side) {
    const k = i * 3, w = (side < 0 ? track.wallL : track.wallR)[i] - 6;
    const x = track.P[k] + track.R[k] * side * (w + 16), z = track.P[k + 2] + track.R[k + 2] * side * (w + 16);
    const y = Math.max(track.P[k + 1] + 5 + (i % 3) * 3, height(x, z) + 3);
    cams.push({ i, pos: new THREE.Vector3(x, y, z) });
  }
  const look = new THREE.Vector3(), orbit = new THREE.Vector3();
  let cur = -1, drone = 0, t = 0, fov = 30;
  return {
    reset() { cur = -1; drone = 0; },
    update(dt, p, c) {
      t += dt;
      const h = c.hint;
      let best = cur < 0 ? 0 : cur;
      while (best + 1 < cams.length && cams[best].i < h - 30) best++;
      if (best !== cur) { cur = best; look.copy(p); }
      drone = c.mode === 0 && c.air > 50 ? Math.min(1, drone + dt * 1.5) : Math.max(0, drone - dt * 2);
      const cam = cams[cur];
      if (drone > 0.5) {
        const a = t * 0.35;
        orbit.set(p.x + Math.sin(a) * 14 - c.vx * 0.12, p.y + 5, p.z + Math.cos(a) * 14 - c.vz * 0.12);
        camera.position.copy(orbit);
      } else camera.position.copy(cam.pos);
      look.lerp(p, 1 - Math.exp(-dt * 30));
      const d = camera.position.distanceTo(p);
      const want = Math.max(9, Math.min(55, 2 * Math.atan(6.5 / d) * 180 / Math.PI));
      fov += (want - fov) * (1 - Math.exp(-dt * 6));
      camera.up.set(0, 1, 0);
      camera.lookAt(look);
      if (camera.fov !== fov || camera.filmOffset !== 0) { camera.fov = fov; camera.filmOffset = 0; camera.updateProjectionMatrix(); }
    },
  };
}
