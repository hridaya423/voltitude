import * as THREE from 'three';
import { lineFor } from '../sim/driver.js';
import { gridSlot } from '../sim/race.js';

const BOARDS = [150, 100, 50];
const SLOTS = 8;

export function boardTexture(text, label = '') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#f2efe8'; g.fillRect(0, 0, 128, 96);
  g.fillStyle = '#d4202c'; g.fillRect(0, 0, 128, label ? 22 : 14);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (label) { g.fillStyle = '#f2efe8'; g.font = '700 16px Archivo, sans-serif'; g.fillText(label, 64, 12); }
  g.fillStyle = '#101216'; g.font = '700 56px Archivo, sans-serif';
  g.fillText(text, 64, label ? 60 : 56);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function slotTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = '#e8e6df'; g.lineWidth = 6;
  g.strokeRect(5, 5, 54, 118);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function brakingSites(track) {
  const { zones } = lineFor(track);
  const N = track.lap, out = [];
  for (const z of zones) {
    if (z.vIn - z.vOut < 22) continue;
    if (out.length && (z.from - out[out.length - 1] + N) % N < 160) continue;
    out.push(z.from);
  }
  return out;
}

export function createCircuitProps(world) {
  const { track } = world;
  const N = track.lap, group = new THREE.Group();
  const sites = brakingSites(track);
  const post = new THREE.BoxGeometry(0.14, 1.6, 0.14).translate(0, 0.8, 0);
  const postMat = new THREE.MeshStandardMaterial({ color: '#2a2c32', roughness: 0.7 });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3(), t = new THREE.Vector3();
  const frame = (i, off, side, lift) => {
    const k = ((i % N) + N) % N * 3;
    r.set(track.R[k], track.R[k + 1], track.R[k + 2]); u.set(track.U[k], track.U[k + 1], track.U[k + 2]); t.set(track.T[k], track.T[k + 1], track.T[k + 2]);
    p.set(track.H[k], track.H[k + 1], track.H[k + 2]).addScaledVector(r, off * side).addScaledVector(u, lift);
    m.makeBasis(r.clone().negate(), u, t);
    q.setFromRotationMatrix(m);
  };
  BOARDS.forEach((d) => {
    const mat = new THREE.MeshBasicMaterial({ map: boardTexture(String(d)), toneMapped: false });
    const board = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6, 1.95).rotateY(Math.PI).translate(0, 2.55, 0), mat, sites.length);
    const poles = new THREE.InstancedMesh(post, postMat, sites.length);
    sites.forEach((from, k) => {
      const curv = track.curv[(from + 120) % N];
      const side = curv > 0 ? -1 : 1;
      frame(from - d, (side < 0 ? track.wallL : track.wallR)[((from - d) % N + N) % N] + 0.25, side, 0);
      board.setMatrixAt(k, m.compose(p, q, new THREE.Vector3(1, 1, 1)));
      poles.setMatrixAt(k, m);
    });
    board.frustumCulled = false; poles.frustumCulled = false;
    group.add(board, poles);
  });
  const slot = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3, 4.7).rotateX(-Math.PI / 2).translate(0, 0.03, 0.8), new THREE.MeshBasicMaterial({ map: slotTexture(), transparent: true, toneMapped: false, depthWrite: false }), SLOTS);
  for (let s = 0; s < SLOTS; s++) {
    const g = gridSlot(track, s);
    frame(g.i, Math.abs(g.lat), Math.sign(g.lat), 0);
    slot.setMatrixAt(s, m.compose(p, q, new THREE.Vector3(1, 1, 1)));
  }
  slot.frustumCulled = false;
  group.add(slot);
  return { group, sites };
}
