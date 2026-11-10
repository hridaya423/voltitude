import * as THREE from 'three';
import { CAR } from '@rl/js/config.js';

const N = 4096, WIDTH = 0.24, CONTACT = -0.57;

export function createSkids() {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, toneMapped: false, fog: false });
  const uHead = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHead = uHead;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uHead; varying float vAge;').replace('#include <begin_vertex>', `#include <begin_vertex>\nvAge = mod(uHead - float(gl_InstanceID) + ${N}.0, ${N}.0) / ${N}.0;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAge;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), smoothstep(0.4, 1.0, vAge));');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color(1, 1, 1));
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  const last = CAR.WHEELS.map(() => new THREE.Vector3()), live = CAR.WHEELS.map(() => false);
  const p = new THREE.Vector3(), up = new THREE.Vector3(), d = new THREE.Vector3(), x = new THREE.Vector3(), m = new THREE.Matrix4(), col = new THREE.Color();
  let next = 0, thump = 0, wasAir = false, lo = -1, cnt = 0;
  return {
    mesh,
    update(world, c, dt) {
      const air = c.mode === 0;
      if (wasAir && !air && Math.abs(c.vy) > 4) thump = 0.14;
      wasAir = air;
      thump = Math.max(0, thump - dt);
      const slide = Math.min(1, Math.max(0, (Math.abs(c.slip) - 4.2) / 5.8));
      up.set(0, 1, 0).transformDirection(world);
      for (let k = 0; k < CAR.WHEELS.length; k++) {
        const w = CAR.WHEELS[k];
        const k0 = air || c.speed < 2 ? 0 : Math.max(k >= 2 ? slide : slide * 0.4, thump > 0 ? 0.8 : 0);
        p.set(w[0], CONTACT, w[2]).applyMatrix4(world);
        if (k0 < 0.05) { live[k] = false; continue; }
        if (!live[k]) { last[k].copy(p); live[k] = true; continue; }
        d.subVectors(p, last[k]);
        const len = d.length();
        if (len > 6) { last[k].copy(p); continue; }
        if (len < 0.35) continue;
        d.divideScalar(len);
        x.crossVectors(up, d).normalize();
        m.makeBasis(x.multiplyScalar(WIDTH), up, d.multiplyScalar(len));
        m.setPosition((p.x + last[k].x) / 2, (p.y + last[k].y) / 2, (p.z + last[k].z) / 2);
        mesh.setMatrixAt(next, m);
        mesh.setColorAt(next, col.setScalar(1 - 0.7 * k0));
        if (lo < 0) lo = next;
        cnt++;
        next = (next + 1) % N;
        mesh.count = Math.max(mesh.count, next === 0 ? N : next);
        last[k].copy(p);
      }
      uHead.value = next;
      if (lo < 0) return;
      for (const a of [mesh.instanceMatrix, mesh.instanceColor]) {
        const s = a.itemSize;
        a.clearUpdateRanges();
        if (lo + cnt <= N) a.addUpdateRange(lo * s, cnt * s);
        else { a.addUpdateRange(lo * s, (N - lo) * s); a.addUpdateRange(0, (lo + cnt - N) * s); }
        a.needsUpdate = true;
      }
      lo = -1; cnt = 0;
    },
  };
}
