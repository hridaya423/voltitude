import * as THREE from 'three';
import { CAR } from '@rl/js/config.js';
import { createSmoke, createSparks } from './fx.js';

const CONTACT = -0.57, CHUNKS = 32;

function createShock() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uK; varying vec2 vUv; void main() { float r = length(vUv - 0.5) * 2.0; float k = exp(-pow((r - 0.86) / 0.07, 2.0)) + 0.25 * exp(-pow((r - 0.7) / 0.05, 2.0)); gl_FragColor = vec4(vec3(0.6, 0.95, 1.0) * k * uK, 1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat);
  mesh.matrixAutoUpdate = false;
  mesh.frustumCulled = false;
  return mesh;
}

function createDebris() {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.05, 0.34), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.3 }), CHUNKS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.Color();
  for (let i = 0; i < CHUNKS; i++) mesh.setColorAt(i, col.set(i % 3 ? '#16181c' : '#d9dde3'));
  mesh.frustumCulled = false;
  mesh.count = 0;
  const pos = new Float32Array(CHUNKS * 3), vel = new Float32Array(CHUNKS * 3), spin = new Float32Array(CHUNKS * 3), floor = new Float32Array(CHUNKS);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  let age = 99;
  return {
    mesh,
    burst(x, y, z, vx, vy, vz) {
      age = 0;
      mesh.count = CHUNKS;
      for (let i = 0; i < CHUNKS; i++) {
        const a = Math.random() * Math.PI * 2, out = 3 + Math.random() * 7;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        vel[i * 3] = vx * (0.5 + Math.random() * 0.4) + Math.cos(a) * out; vel[i * 3 + 1] = 3 + Math.random() * 7; vel[i * 3 + 2] = vz * (0.5 + Math.random() * 0.4) + Math.sin(a) * out;
        spin[i * 3] = 0; spin[i * 3 + 1] = (Math.random() - 0.5) * 30; spin[i * 3 + 2] = (Math.random() - 0.5) * 30;
        floor[i] = y - 0.5;
      }
    },
    update(dt) {
      if (age > 3) { mesh.count = 0; return; }
      age += dt;
      const k = Math.min(1, (3 - age) * 2);
      for (let i = 0; i < CHUNKS; i++) {
        const j = i * 3;
        vel[j + 1] -= 9.8 * dt;
        pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
        if (pos[j + 1] < floor[i]) { pos[j + 1] = floor[i]; vel[j + 1] *= -0.35; vel[j] *= 0.6; vel[j + 2] *= 0.6; spin[j + 1] *= 0.6; spin[j + 2] *= 0.6; }
        spin[j] += spin[j + 1] * dt;
        m.compose(p.set(pos[j], pos[j + 1], pos[j + 2]), q.setFromEuler(e.set(spin[j], spin[j] * 0.7 + i, spin[j + 2] * age)), s.setScalar(k * (0.6 + (i % 4) * 0.3)));
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function createCarFx(night, depth) {
  const smoke = createSmoke(night), sparks = createSparks(depth), debris = createDebris(), shock = createShock();
  const group = new THREE.Group();
  group.add(smoke.points, debris.mesh, shock);
  const overlay = new THREE.Scene();
  overlay.add(sparks.mesh);
  const local = new THREE.Matrix4();
  const p = new THREE.Vector3(), o = new THREE.Vector3(), acc = new Float32Array(4);
  const R = (a) => (Math.random() - 0.5) * a;
  let time = 0, wasAir = false, vyAir = 0, hopWas = 0, burn = 0, side = 1, mat = null, wake = 0, wakeK = 0, shockT = 9;
  const wheel = (k) => p.set(CAR.WHEELS[k][0], CONTACT, CAR.WHEELS[k][2]).applyMatrix4(mat);
  const origin = () => o.set(mat.elements[12], mat.elements[13], mat.elements[14]);
  function ring(c, n, speed, grow, tone, life, lift = 0.3) {
    origin();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R(0.3), ca = Math.cos(a), sa = Math.sin(a), r = 1.2 + R(0.5), v = speed * (0.75 + Math.random() * 0.5);
      const dx = c.rx * ca + c.fx * sa, dy = c.ry * ca + c.fy * sa, dz = c.rz * ca + c.fz * sa;
      smoke.emit(o.x + dx * r - c.ux * 0.45, o.y + dy * r - c.uy * 0.45, o.z + dz * r - c.uz * 0.45, dx * v + c.vx * 0.8, dy * v + c.vy * 0.2 + lift * (0.5 + Math.random()), dz * v + c.vz * 0.8, time, grow, tone, life);
    }
  }
  function spray(c, n, x, y, z, nx, ny, nz, out) {
    for (let i = 0; i < n; i++) {
      const k = out * (0.4 + Math.random());
      sparks.emit(x + R(0.3), y + R(0.2), z + R(0.3), c.vx * (0.55 + Math.random() * 0.35) + nx * k + R(4), c.vy * 0.5 + ny * k + 1 + Math.random() * 4, c.vz * (0.55 + Math.random() * 0.35) + nz * k + R(4), time - Math.random() * 0.016);
    }
  }
  function flank(c) {
    origin();
    const f = R(3.6);
    return p.set(o.x + c.rx * side * 0.98 + c.fx * f - c.ux * 0.15, o.y + c.ry * side * 0.98 + c.fy * f - c.uy * 0.15, o.z + c.rz * side * 0.98 + c.fz * f - c.uz * 0.15);
  }
  return {
    group,
    overlay,
    event(e, c, other) {
      if (!mat) return;
      switch (e.type) {
        case 'go': burn = 0.8; break;
        case 'scrape': case 'impact': {
          if (e.side) side = e.side;
          flank(c);
          spray(c, Math.min(70, 14 + e.v * 4), p.x, p.y, p.z, -c.rx * side, 0, -c.rz * side, 2 + e.v * 0.4);
          break;
        }
        case 'contact': {
          if (!other) break;
          origin();
          p.set((o.x + other.x) / 2, (o.y + other.y) / 2 - 0.1, (o.z + other.z) / 2);
          spray(c, Math.min(30, 6 + e.v * 3), p.x, p.y, p.z, 0, 0.3, 0, 3);
          break;
        }
        case 'land': {
          if (e.quality === 'perfect') { wake = 0.4; wakeK = 1.5; shockT = 0; ring(c, 40, 12, 2, 1, 0.9, 0.1); }
          if (e.quality === 'hard') { origin(); spray(c, 36, o.x - c.ux * 0.5, o.y - c.uy * 0.5, o.z - c.uz * 0.5, 0, 0.4, 0, 5); }
          break;
        }
        case 'wreck': {
          origin();
          for (let i = 0; i < 3; i++) spray(c, 30, o.x, o.y, o.z, R(2), 0.6, R(2), 9);
          ring(c, 30, 7, 3.4, 1.85, 2.4, 1.5);
          debris.burst(o.x, o.y, o.z, c.vx, c.vy, c.vz);
          break;
        }
        default: break;
      }
    },
    update(dt, t, c, matrix, width, height, pixelScale, running) {
      time = t; mat = matrix;
      if (running) {
        const air = c.mode === 0, ground = !air && c.speed > 2;
        if (wasAir && !air) { const imp = Math.min(1, Math.max(0.2, (-vyAir - 2) / 12)); wake = 0.3; wakeK = Math.max(wakeK, imp); ring(c, Math.round(10 + imp * 24), 3 + imp * 8, 2.2 + imp * 2, c.mode === 2 ? 0.1 : 0.85, 0.8 + imp); }
        if (wake > 0) {
          wake -= dt;
          const n = Math.round(dt * 260 * wakeK);
          for (let i = 0; i < n; i++) {
            const sd = i & 1 ? 1 : -1, f = R(4.4), out = (4 + Math.random() * 6) * wakeK, b = Math.random() * dt;
            origin();
            smoke.emit(o.x + c.rx * sd * 1.1 + c.fx * f - c.ux * 0.45 - c.vx * b, o.y + c.ry * sd * 1.1 + c.fy * f - c.uy * 0.45 - c.vy * b, o.z + c.rz * sd * 1.1 + c.fz * f - c.uz * 0.45 - c.vz * b, c.rx * sd * out + c.vx * 0.5, 0.6 + Math.random() * 1.5, c.rz * sd * out + c.vz * 0.5, time - b, 2.4 + wakeK * 1.6, c.mode === 2 ? 0.1 : 0.9, 0.9 + wakeK * 0.6);
          }
          if (wake <= 0) wakeK = 0;
        }
        if (air) vyAir = c.vy;
        wasAir = air;
        if (ground && c.hopT > hopWas + 0.1) ring(c, 26, 7, 2.4, 0.95, 0.9, 1);
        hopWas = c.hopT;
        burn = Math.max(0, burn - dt);
        const slide = Math.min(1, Math.max(0, (Math.abs(c.slip) - 2.5) / 6));
        const launch = burn > 0 && c.throttle > 0.5 && c.speed < 22 ? 0.45 : 0, lock = c.brake > 0.85 && c.speed > 30 ? 0.3 : 0;
        const k = ground ? Math.max(slide, launch, lock) : 0, tone = c.mode === 2 ? 0.15 : 1;
        for (let w = 2; w < 4; w++) {
          acc[w] = k > 0.05 ? acc[w] + dt * k * 130 : 0;
          while (acc[w] >= 1) {
            acc[w]--;
            wheel(w);
            const b = Math.random() * dt;
            smoke.emit(p.x - c.vx * b + R(0.3), p.y + 0.2, p.z - c.vz * b + R(0.3), c.vx * 0.3 + R(2.5), 0.5 + Math.random() * 1.2, c.vz * 0.3 + R(2.5), time - b, 2.6 + k * 2.4, tone, 1.6 + k * 1.6);
          }
        }
        acc[0] = ground && c.fan > 0.2 ? acc[0] + dt * c.fan * 200 : 0;
        while (acc[0] >= 1) {
          acc[0]--;
          const sd = Math.random() < 0.5 ? -1 : 1, up = 1 + Math.random() * 2.5, out = 2 + Math.random() * 4, b = Math.random() * dt, f = R(4);
          origin();
          smoke.emit(o.x + c.rx * sd * 1.2 + c.fx * f - c.ux * 0.45 - c.vx * b, o.y + c.ry * sd * 1.2 + c.fy * f - c.uy * 0.45 - c.vy * b, o.z + c.rz * sd * 1.2 + c.fz * f - c.uz * 0.45 - c.vz * b,
            c.vx * 0.6 + c.ux * up + c.rx * sd * out, c.vy * 0.6 + c.uy * up + c.ry * sd * out, c.vz * 0.6 + c.uz * up + c.rz * sd * out, time - b, 3.6, 0.4, 1.2);
        }
        acc[1] = c.wallT > 0 && c.speed > 8 ? acc[1] + dt * Math.min(360, c.speed * 7) : 0;
        while (acc[1] >= 1) { acc[1]--; flank(c); spray(c, 1, p.x, p.y, p.z, -c.rx * side, 0.2, -c.rz * side, 3); }
      }
      shockT += running ? dt : 0;
      const sk = Math.min(1, shockT / 0.4);
      shock.visible = sk < 1;
      if (shock.visible) { const r = 3 + 16 * (1 - (1 - sk) * (1 - sk)); shock.matrix.copy(mat).multiply(local.makeScale(r, 1, r).setPosition(0, -0.46, 0)); shock.material.uniforms.uK.value = 2.5 * (1 - sk) * (1 - sk); }
      debris.update(running ? dt : 0);
      smoke.update(t, pixelScale, origin());
      sparks.update(t, width, height);
    },
  };
}
