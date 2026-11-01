import * as THREE from 'three';
import { lineupBoxes, HALF_W } from '../sim/lineup.js';

const MAX = 64;
const PAINT = { hatch: '#e8e6e1', robotaxi: '#a9adb3', pickup: '#b3261e', van: '#2f5d9e', semi: '#5b5f66' };
const CLIP = new THREE.Color('#ff2a1a');
const FLASH_S = 0.5;

export function createLineup(world, fog) {
  const { track } = world;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.2 });
  fog?.(mat);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat, MAX);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.count = 0;
  const m = new THREE.Matrix4(), basis = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const R = new THREE.Vector3(), U = new THREE.Vector3(), T = new THREE.Vector3(), color = new THREE.Color();
  let boxes = [], flash = 0, flashK = -1, shown = -1;
  const paint = () => {
    for (const b of boxes) mesh.setColorAt(b.k, color.set(PAINT[b.kind]).lerp(CLIP, b.k === flashK ? Math.min(1, flash * 2) : 0));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  return {
    mesh,
    set(count) {
      if (count === shown) return;
      shown = count;
      boxes = lineupBoxes(track, Math.min(count, MAX));
      flashK = -1;
      for (const b of boxes) {
        const k = Math.round((b.s0 + b.s1) / 2) * 3;
        R.set(track.R[k], track.R[k + 1], track.R[k + 2]); U.set(track.U[k], track.U[k + 1], track.U[k + 2]); T.set(track.T[k], track.T[k + 1], track.T[k + 2]);
        q.setFromRotationMatrix(basis.makeBasis(R.negate(), U, T));
        p.set(track.P[k], track.P[k + 1], track.P[k + 2]).addScaledVector(T, (b.s0 + b.s1) / 2 - Math.round((b.s0 + b.s1) / 2));
        mesh.setMatrixAt(b.k, m.compose(p, q, s.set(HALF_W * 2, b.h, b.s1 - b.s0)));
      }
      mesh.count = boxes.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      paint();
    },
    clip(k) { flashK = k; flash = 1; },
    update(dt) {
      if (flash <= 0) return;
      flash = Math.max(0, flash - dt / FLASH_S);
      paint();
    },
  };
}
