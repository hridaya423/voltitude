import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { panelMaterial, makeLabel, mastSites } from './road.js';
import { skyFog } from './sky.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

function glassMaterial(sunUniform, fogDensity) {
  const m = new THREE.MeshStandardMaterial({ color: '#0d1016', roughness: 0.08, metalness: 0.9, envMapIntensity: 1.6, emissive: '#ffcf9a', emissiveIntensity: 0.0 });
  skyFog(m, sunUniform, fogDensity);
  return m;
}

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.06, 'rgba(255,255,255,0.7)'); r.addColorStop(0.18, 'rgba(255,255,255,0.12)'); r.addColorStop(0.5, 'rgba(255,255,255,0.03)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createFacility(world, sunUniform, fogDensity, night) {
  const { track, terrain } = world;
  const group = new THREE.Group();
  const white = panelMaterial('#e8e6e1', 0.45, 0.05, sunUniform, fogDensity, 'facility', 5);
  const dark = new THREE.MeshStandardMaterial({ color: '#1b1c21', roughness: 0.35, metalness: 0.7 });
  skyFog(dark, sunUniform, fogDensity);
  const glass = glassMaterial(sunUniform, fogDensity);
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 2.0), toneMapped: false });
  const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.25, 0.3), toneMapped: false });

  const poles = [], heads = [], glare = [];
  for (const m of mastSites(world)) {
    if (track.roof[m.i]) continue;
    poles.push([m.x, m.g, m.z, 22]);
    heads.push([m.x, m.g + 22, m.z, m.yaw]);
    glare.push(m.x - track.R[m.i * 3] * m.side * 1.5, m.g + 21.7, m.z - track.R[m.i * 3 + 2] * m.side * 1.5);
  }
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.38, 1, 10).translate(0, 0.5, 0), white, poles.length);
  poles.forEach(([x, y, z, h], k) => { _m.compose(_p.set(x, y, z), _q.identity(), _s.set(1, h, 1)); pole.setMatrixAt(k, _m); });
  const headGeo = mergeGeometries([new THREE.BoxGeometry(4.2, 0.9, 0.7), new THREE.BoxGeometry(0.4, 1.6, 0.4).translate(0, -0.9, -0.2)]);
  const head = new THREE.InstancedMesh(headGeo, dark, heads.length);
  const lamp = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.8, 0.55).translate(0, 0, 0.36), glow, heads.length);
  heads.forEach(([x, y, z, yaw], k) => {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0.35, yaw, 0)), _s.set(1, 1, 1));
    head.setMatrixAt(k, _m); lamp.setMatrixAt(k, _m);
  });
  for (const m of [pole, head]) { m.castShadow = true; m.frustumCulled = false; }
  lamp.frustumCulled = false;
  group.add(pole, head, lamp);
  if (night) {
    const halo = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(glare, 3)), new THREE.PointsMaterial({ map: haloTexture(), size: 26, color: new THREE.Color(4, 3.6, 3.1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.frustumCulled = false;
    group.add(halo);
  }

  const sx = 62, sz0 = -640;
  const base = (x, z, w, d) => {
    let lo = Infinity;
    for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) lo = Math.min(lo, terrain.height(x + a * w, z + b * d));
    return lo;
  };
  const whites = [], darks = [], glasses = [], glows = [];
  const box = (list, w, h, d, x, y, z) => list.push(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  {
    const x = sx + 22, z = sz0 + 120, y = base(x, z, 34, 110) - 0.5;
    box(whites, 30, 2, 110, x, y, z);
    box(glasses, 26, 5, 106, x, y + 2, z);
    box(whites, 34, 1.2, 116, x - 2, y + 7, z);
    box(glows, 0.2, 0.25, 104, x - 13.1, y + 6.6, z);
    box(darks, 2, 0.6, 116, x - 18, y + 7.8, z);
    for (let k = -2; k <= 2; k++) box(whites, 1.2, 7, 1.2, x - 14, y, z + k * 24);
  }
  {
    const x = sx + 70, z = sz0 + 40, y = base(x, z, 60, 70) - 0.5;
    box(whites, 56, 18, 64, x, y, z);
    box(darks, 46, 15, 0.6, x, y, z - 32.2);
    box(glows, 46, 0.3, 0.3, x, y + 15.2, z - 32.6);
    box(darks, 58, 1, 66, x, y + 18, z);
  }
  {
    const x = sx + 6, z = sz0 + 250, y = base(x, z, 10, 10) - 0.5;
    box(whites, 5, 38, 5, x, y, z);
    box(darks, 7, 0.6, 7, x, y + 38, z);
    box(glasses, 11, 4.5, 11, x, y + 38.6, z);
    box(darks, 12, 0.8, 12, x, y + 43.1, z);
    box(whites, 0.3, 9, 0.3, x, y + 43.9, z);
    group.userData.beacon = new THREE.Vector3(x, y + 53, z);
  }
  const mk = (list, mat, shadow = true) => {
    if (!list.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(list.map((g) => g.toNonIndexed())), mat);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    group.add(mesh);
  };
  mk(whites, white); mk(darks, dark); mk(glasses, glass); mk(glows, glow, false);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), red);
  beacon.position.copy(group.userData.beacon);
  group.add(beacon);

  {
    const x = sx + 44, z = sz0 + 20, y = base(x, z, 30, 4);
    const board = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(32, 9, 1.2), dark);
    frame.position.set(0, 13, 0);
    frame.castShadow = true;
    const label = makeLabel('VOLTITUDE', `${world.venue.name.toUpperCase()} · ROADSTER TEST PROGRAM`, '#ff3344');
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(30, 30 * 160 / 1024), new THREE.MeshBasicMaterial({ map: label, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) }));
    screen.position.set(0, 13, -0.62);
    screen.rotation.y = Math.PI;
    const legs = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(1, 9, 1).translate(-10, 4.5, 0), new THREE.BoxGeometry(1, 9, 1).translate(10, 4.5, 0)]), white);
    legs.castShadow = true;
    board.add(frame, screen, legs);
    board.position.set(x, y, z);
    board.rotation.y = -Math.PI / 2 + 0.35;
    group.add(board);
  }
  return {
    group,
    update(time) { red.color.setRGB(Math.sin(time * 3) > 0.6 ? 6 : 0.2, 0.2, 0.25); },
  };
}
