import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { drawBoard, drawTyre, drawFloor, drawTelemetry, BOARD, TYRE, FLOOR, TELE } from './garage-screens.js';
import { createPeople } from './people.js';
import { skyUniforms, SKY_GLSL } from './sky.js';

export const ANCHOR = new THREE.Vector3(0, 3000, 0);
const TABLE_H = 0.08, CAR_Y = 0.59 + TABLE_H, SLIDE = 0.18;
const DOOR_W = 10.5, DOOR_H = 6.6;
const BOARD_SIZE = [11, 11 * BOARD.h / BOARD.w], BOARD_AT = [0, 5.05, 11.2];
const TYRE_SIZE = [1.6, 1.0], TYRE_AT = [-4.62, 1.5, 2.2];
const FLOOR_SIZE = [12.8, 12.8 * FLOOR.h / FLOOR.w], FLOOR_AT = [0, 0.006, 5.9];
const BAY_X = (k) => (1 - k) * 4.4;

const SHOT = {
  board: { pos: [0.5, 1.15, -8.4], at: [0, 2.9, 11], h: 50 },
  venue: { pos: [0, 5.2, -3.6], at: [0, 0, 5.9], h: 64 },
  settings: { pos: [-1.5, 1.55, 3.9], at: [-4.62, 1.45, 2.2], h: 40 },
  keys: { pos: [-1.5, 1.55, 3.9], at: [-4.62, 1.45, 2.2], h: 40 },
  pause: { pos: [0.4, 3.3, -3.0], at: [0, 4.95, 11.2], h: 51 },
  results: { pos: [1.4, 2.8, -1.5], at: [0, 4.85, 11.2], h: 54 },
};
const INTRO = { pos: [3.4, 0.55, -4.6], at: [0, 0.75, 0], h: 56 };
const ZONE_LIGHT = { board: 0, floor: 1, tyre: 2 };

const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function noise(size, base, spread, seed = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size);
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const b = new THREE.Color(base);
  for (let i = 0; i < size * size; i++) {
    const k = 1 + (rnd() - 0.5) * spread;
    img.data[i * 4] = b.r * 255 * k; img.data[i * 4 + 1] = b.g * 255 * k; img.data[i * 4 + 2] = b.b * 255 * k; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 28; i++) {
    const x = rnd() * size, y = rnd() * size, r = 60 + rnd() * 160, d = g.createRadialGradient(x, y, 0, x, y, r);
    d.addColorStop(0, `rgba(${rnd() < 0.7 ? '0,0,0' : '255,255,255'},${0.03 + rnd() * 0.04})`); d.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = d; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function surface(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return { canvas, g: canvas.getContext('2d'), tex };
}

function bakeRoom(renderer, night) {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(26, 9, 26), new THREE.MeshBasicMaterial({ color: '#14161b', side: THREE.BackSide })));
  const tube = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 6.6, 6) });
  const sky = new THREE.MeshBasicMaterial({ color: night ? new THREE.Color(0.1, 0.13, 0.24) : new THREE.Color(7, 8.4, 10.5) });
  if (!night) { const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 14), sky); roof.position.y = 4.4; scene.add(roof); }
  for (const x of [-3, 3]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 18), tube); m.position.set(x, 4.3, 0); scene.add(m); }
  for (const x of [-12.9, 12.9]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 20), sky); m.position.set(x, 2.8, 0); scene.add(m); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(21, 6.6, 0.1), new THREE.MeshBasicMaterial({ color: night ? new THREE.Color(1.4, 0.9, 0.7) : new THREE.Color(5, 3.2, 1.9) }));
  door.position.set(0, -1.2, 12.9);
  scene.add(door);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(scene, 0.03).texture;
  pm.dispose();
  return env;
}

export function createGarage({ renderer, night, settings, sunUniform, fogDensity, skyTex }) {
  const group = new THREE.Group();
  group.position.copy(ANCHOR);
  const env = bakeRoom(renderer, night);
  const envK = night ? 1 : 1.5;
  const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: envK, ...o });
  const floorTex = noise(512, '#34363b', 0.34);
  floorTex.repeat.set(9, 9);
  const M = {
    wall: std({ color: night ? '#20232a' : '#343840', roughness: 0.5, metalness: 0.55 }),
    steel: std({ color: '#3a3e47', roughness: 0.32, metalness: 0.9 }),
    frame: std({ color: '#0a0b0e', roughness: 0.45, metalness: 0.7 }),
    yellow: std({ color: '#c9962a', roughness: 0.5 }),
    red: std({ color: '#8d1322', roughness: 0.42, metalness: 0.3 }),
    rubber: std({ color: '#0c0c0e', roughness: 0.92 }),
    warmer: std({ color: '#17171c', roughness: 0.96 }),
    tube: new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 5), toneMapped: false }),
    heat: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.9, 0.2), toneMapped: false }),
    sky: new THREE.MeshBasicMaterial({ color: night ? new THREE.Color(0.03, 0.05, 0.12) : new THREE.Color(3, 3.6, 4.4), toneMapped: false }),
    soft: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.7), toneMapped: false }),
    lamp: new THREE.MeshBasicMaterial({ color: night ? new THREE.Color(14, 12, 9) : new THREE.Color(2, 1.8, 1.5), toneMapped: false }),
    beacon: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 0.4, 0.3), toneMapped: false }),
    dark: std({ color: night ? '#0b0c10' : '#3a3634', roughness: 0.8, metalness: 0.3 }),
  };
  const lists = {};
  const put = (key, geo, x, y, z, ry = 0) => {
    geo.rotateY(ry).translate(x, y, z);
    (lists[key] ||= []).push(geo);
  };
  const box = (key, w, h, d, x, y, z, ry = 0) => put(key, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, ry);
  const cyl = (key, r, h, x, y, z, seg = 18) => put(key, new THREE.CylinderGeometry(r, r, h, seg), x, y + h / 2, z);

  const W = 13, Z0 = -9.5, Z1 = 11.7, H = 8.8;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, Z1 - Z0).rotateX(-Math.PI / 2), std({ map: floorTex, roughness: night ? 0.55 : 0.8, metalness: 0.1, envMapIntensity: night ? 1.25 : 0.45 }));
  floor.position.set(0, 0, (Z0 + Z1) / 2);
  floor.receiveShadow = true;
  group.add(floor);

  for (const s of [-1, 1]) {
    box('wall', W - DOOR_W, H, 0.5, s * (DOOR_W + W) / 2, 0, Z1 + 0.25);
    box('frame', 0.3, DOOR_H, 0.4, s * (DOOR_W + 0.15), 0, Z1);
  }
  box('wall', DOOR_W * 2, H - DOOR_H, 0.5, 0, DOOR_H, Z1 + 0.25);
  put('steel', new THREE.CylinderGeometry(0.45, 0.45, DOOR_W * 2, 24).rotateZ(Math.PI / 2), 0, DOOR_H + 0.5, Z1 - 0.3);
  box('frame', DOOR_W * 2, 0.25, 0.3, 0, DOOR_H, Z1 - 0.05);
  box('yellow', DOOR_W * 2, 0.02, 0.3, 0, 0, Z1 - 0.2);
  box('wall', W * 2, H, 0.5, 0, 0, Z0 - 0.25);
  box('wall', 0.5, H, Z1 - Z0, W + 0.25, 0, (Z0 + Z1) / 2);
  box('wall', 0.5, H, Z1 - Z0, -W - 0.25, 0, (Z0 + Z1) / 2);
  box('wall', W * 2, 0.5, Z1 - Z0, 0, H, (Z0 + Z1) / 2);
  for (let x = -W + 0.6; x < W; x += 1.6) {
    if (Math.abs(x) > DOOR_W + 0.4) box('steel', 0.2, 2.3, 0.14, x, 0, Z1 - 0.07);
    box('steel', 0.2, 2.3, 0.14, x, 0, Z0 + 0.07);
  }
  for (let z = Z0 + 1; z < Z1; z += 1.6) for (const s of [-1, 1]) box('steel', 0.14, 2.3, 0.2, s * (W - 0.07), 0, z);
  for (let z = -6; z <= 8; z += 4.7) box('steel', W * 2, 0.5, 0.35, 0, H - 0.85, z);
  for (const x of [-9, -3, 3, 9]) box('steel', 0.35, 0.5, Z1 - Z0, x, H - 0.85, (Z0 + Z1) / 2);
  for (const z of [-4.5, 0, 4.5]) for (const s of [-1, 1]) {
    box('tube', 0.28, 0.14, 8, s * 2.8, H - 1.25, z + 0.3);
    box('frame', 0.5, 0.2, 8.2, s * 2.8, H - 1.0, z + 0.3);
  }
  for (const s of [-1, 1]) for (const z of [-6, 1, 7]) box('sky', 0.1, 1.1, 4.6, s * (W - 0.02), 5.6, z);
  for (const x of [-9, 0, 9]) box('sky', 3.4, 0.08, 5.2, x, H - 0.03, 3);
  for (let y = 0.3; y < 4.4; y += 0.42) box('steel', 7.4, 0.3, 0.1, 0, y, Z0 + 0.3);
  box('frame', 7.8, 4.6, 0.2, 0, 0, Z0 + 0.4);

  const [bw, bh] = BOARD_SIZE;
  box('frame', bw + 0.6, bh + 0.6, 0.5, BOARD_AT[0], BOARD_AT[1] - bh / 2 - 0.3, BOARD_AT[2] + 0.1);
  box('steel', 0.3, BOARD_AT[1] - bh / 2, 0.3, -bw / 2 - 0.15, 0, BOARD_AT[2] + 0.1);
  box('steel', 0.3, BOARD_AT[1] - bh / 2, 0.3, bw / 2 + 0.15, 0, BOARD_AT[2] + 0.1);
  box('red', bw + 0.6, 0.12, 0.2, 0, BOARD_AT[1] - bh / 2 - 0.42, BOARD_AT[2] - 0.2);

  const OUT = Z1 + 0.5;
  for (let x = -60; x <= 60; x += 2.4) box('rubber', 2.3, 0.9, 0.9, x, 0, OUT + 24);
  for (let x = -60; x <= 60; x += 4) box('frame', 0.08, 3.2, 0.08, x, 0.9, OUT + 24.2);
  for (const x of [-50, -26, 22, 46]) {
    box('dark', 0.6, 24, 0.6, x, 0, OUT + 70);
    box('frame', 4.2, 1.6, 0.4, x, 24, OUT + 70);
    box('lamp', 4, 1.3, 0.1, x, 24.15, OUT + 69.78);
  }
  put('dark', new THREE.CylinderGeometry(2, 2, 36, 20), -34, 18, OUT + 150);
  put('dark', new THREE.ConeGeometry(2, 7, 20), -34, 39.5, OUT + 150);
  box('dark', 4, 46, 4, -27.5, 0, OUT + 150);
  for (let y = 4; y < 46; y += 6) box('dark', 4.6, 0.4, 3, -30.6, y, OUT + 150);
  box('beacon', 0.8, 0.8, 0.8, -27.5, 46, OUT + 150);
  box('dark', 60, 5, 6, 30, 0, OUT + 110);
  box('dark', 64, 0.6, 9, 30, 5, OUT + 110);

  box('frame', 3, 0.12, 5.4, 0, 5.35, 0);
  put('soft', new THREE.PlaneGeometry(2.8, 5.2).rotateX(Math.PI / 2), 0, 5.34, 0);
  for (const x of [-1.3, 1.3]) for (const z of [-2.5, 2.5]) box('frame', 0.03, H - 6.3, 0.03, x, 5.45, z);
  cyl('frame', 3.05, TABLE_H - 0.02, 0, 0, 0, 64);
  const PIT = [6.4, 8.6];
  box('frame', 2.6, 0.95, 0.8, PIT[0], 0, PIT[1]);
  box('steel', 2.7, 0.05, 0.9, PIT[0], 0.95, PIT[1]);
  box('frame', 0.12, 1.1, 0.12, PIT[0], 0.95, PIT[1] + 0.2);

  const sx = TYRE_AT[0], cz = TYRE_AT[2];
  box('frame', 0.79, 2.3, 2.1, sx - 0.505, 0, cz);
  box('frame', 0.1, 1.22, 1.82, sx - 0.06, 0.89, cz);
  box('steel', 0.04, 0.5, 1.7, sx - 0.115, 0.18, cz);
  box('heat', 0.03, 0.05, 1.6, sx - 0.115, 0.76, cz);
  for (let k = 0; k < 5; k++) box('steel', 0.03, 0.03, 1.5, sx - 0.115, 0.1 + k * 0.07, cz);
  for (const dz of [-2.2, -1.5]) for (let k = 0; k < 4; k++) cyl('warmer', 0.4, 0.2, sx - 0.5, 0.05 + k * 0.22, cz + dz - 0.2);
  for (let k = 0; k < 4; k++) put('heat', new THREE.TorusGeometry(0.4, 0.015, 6, 28).rotateX(Math.PI / 2), sx - 0.5, 0.17 + k * 0.22, cz - 1.9);
  for (const [x, z] of [[8, 2.4], [8.9, 1.5]]) for (let k = 0; k < 5; k++) cyl('rubber', 0.34, 0.3, x, k * 0.3, z);
  box('red', 1.6, 1.0, 0.7, 7.2, 0, -2.2);
  box('steel', 1.7, 0.05, 0.8, 7.2, 1.0, -2.2);
  box('frame', 1.5, 0.22, 0.02, 7.2, 0.7, -1.83);
  box('frame', 1.5, 0.22, 0.02, 7.2, 0.4, -1.83);
  for (const x of [-0.83, 0.83]) for (const z of [-1.97, 1.97]) box('yellow', 0.16, 0.12, 0.3, x, 0, z);

  const parts = Object.entries(lists).map(([key, list]) => {
    const mesh = new THREE.Mesh(mergeGeometries(list), M[key]);
    mesh.castShadow = key !== 'tube' && key !== 'sky' && key !== 'heat';
    mesh.receiveShadow = true;
    return mesh;
  });
  group.add(...parts);

  const boardFace = surface(BOARD.w, BOARD.h), tyreFace = surface(TYRE.w, TYRE.h), floorFace = surface(FLOOR.w, FLOOR.h), glowFace = surface(FLOOR.w, FLOOR.h);
  const screenMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1, 1, 1) });
  const boardMat = screenMat(boardFace.tex), tyreMat = screenMat(tyreFace.tex);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(...BOARD_SIZE), boardMat);
  board.position.set(BOARD_AT[0], BOARD_AT[1], BOARD_AT[2] - 0.32);
  board.rotation.y = Math.PI;
  board.userData.zone = 'board';
  const tyre = new THREE.Mesh(new THREE.PlaneGeometry(...TYRE_SIZE), tyreMat);
  tyre.position.set(...TYRE_AT);
  tyre.rotation.y = Math.PI / 2;
  tyre.userData.zone = 'tyre';
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(...FLOOR_SIZE).rotateX(-Math.PI / 2).rotateY(Math.PI), new THREE.MeshStandardMaterial({ map: floorFace.tex, emissiveMap: glowFace.tex, emissive: '#ffffff', emissiveIntensity: 1.4, transparent: true, roughness: night ? 0.55 : 0.85, metalness: 0, envMap: env, envMapIntensity: night ? 1 : 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  glowFace.tex.colorSpace = THREE.SRGBColorSpace;
  decal.position.set(...FLOOR_AT);
  decal.renderOrder = 1;
  decal.userData.zone = 'floor';
  const scan = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.04), M.beacon);
  scan.position.set(0, BOARD_AT[1] - bh / 2 - 0.36, BOARD_AT[2] - 0.34);
  group.add(board, tyre, decal, scan);

  const teleFace = surface(TELE.w, TELE.h), teleMat = screenMat(teleFace.tex);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), teleMat);
  desk.position.set(PIT[0], 2.45, PIT[1] + 0.12);
  desk.rotation.y = -2.81;
  const wallTele = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), teleMat);
  wallTele.position.set(-W + 0.03, 2.6, -6.5);
  wallTele.rotation.y = Math.PI / 2;
  group.add(desk, wallTele);

  const ground = surface(2048, 1024);
  {
    const g = ground.g, k = 2048 / 120;
    g.fillStyle = '#5d5853'; g.fillRect(0, 0, 2048, 1024);
    g.fillStyle = '#6b655e'; g.fillRect(0, 0, 2048, 13 * k);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = 0; x < 2048; x += 6 * k) g.fillRect(x, 0, 2, 13 * k);
    for (let z = 0; z < 13 * k; z += 6 * k) g.fillRect(0, z, 2048, 2);
    g.fillStyle = '#2b2b2e'; g.fillRect(0, 14 * k, 2048, 8 * k);
    g.fillStyle = '#d9d6cf'; g.fillRect(0, 14 * k + 3, 2048, 5); g.fillRect(0, 22 * k - 8, 2048, 5);
    for (let x = 0; x < 2048; x += 3 * k) { g.fillStyle = (x / (3 * k)) % 2 ? '#e9e5dc' : '#b8202c'; g.fillRect(x, 13 * k, 3 * k, k); }
    g.fillStyle = '#a07a52'; g.fillRect(0, 25 * k, 2048, 1024 - 25 * k);
  }
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(120, 60).rotateX(-Math.PI / 2), std({ map: ground.tex, roughness: 0.85, envMapIntensity: 0.5 * envK }));
  yard.position.set(0, -0.01, OUT + 30);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(520, 260).rotateX(-Math.PI / 2), std({ color: '#a07a52', roughness: 0.95, envMapIntensity: 0.5 * envK }));
  sand.position.set(0, -0.03, OUT + 150);
  yard.receiveShadow = sand.receiveShadow = true;
  const R = 240, backGeo = new THREE.CylinderGeometry(R, R, 140, 64, 24, true, -1.4, 2.8);
  backGeo.translate(0, 55, 0);
  const bp = backGeo.attributes.position, buv = backGeo.attributes.uv;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    buv.setXY(i, 0.6 + (Math.atan2(x, z) + 0.38) / (Math.PI * 2), 0.5 + Math.atan2(y - 1.5, R) / Math.PI);
  }
  const backMat = night ? new THREE.ShaderMaterial({
    uniforms: { ...skyUniforms, tSky: { value: skyTex } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position - vec3(0.0, 1.5, 0.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform sampler2D tSky; ${SKY_GLSL} void main() {
      vec3 d = normalize(vDir);
      float l = dot(skyDecode(texture2D(tSky, skyUv(vec3(d.x, max(d.y, 0.003), d.z))).rgb), vec3(0.2126, 0.7152, 0.0722));
      gl_FragColor = vec4(mix(vec3(0.25, 0.16, 0.1), vec3(0.01, 0.016, 0.045), smoothstep(0.0, 0.12, d.y)) + max(l - 1.2, 0.0), 1.0);
    }`,
    side: THREE.BackSide,
  }) : new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.4), side: THREE.BackSide, toneMapped: false, fog: false });
  if (!night) new THREE.TextureLoader().loadAsync('assets/sky/golden_sky_4k.jpg').then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; backMat.map = t; backMat.needsUpdate = true; });
  const backdrop = new THREE.Mesh(backGeo, backMat);
  group.add(yard, sand, backdrop);

  const table = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 0.02, 64).translate(0, TABLE_H - 0.01, 0), std({ color: '#16181d', roughness: 0.5, metalness: 0.7, envMapIntensity: 0.5 }));
  deck.receiveShadow = true;
  const leds = [];
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    leds.push(new THREE.BoxGeometry(0.05, 0.01, 0.16).rotateY(a).translate(Math.sin(a) * 2.82, TABLE_H, Math.cos(a) * 2.82));
  }
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.2, 2.6), toneMapped: false });
  table.add(deck, new THREE.Mesh(mergeGeometries(leds), ledMat));
  const halo = new THREE.Mesh(new THREE.RingGeometry(3.06, 3.12, 96).rotateX(-Math.PI / 2), ledMat);
  halo.position.y = 0.004;
  group.add(table, halo);

  let people = null;
  const CREW = [
    { x: 6.6, z: 15.4, yaw: 1.05, char: 0, seed: [0.01, 0.05, 0.72, 0.64] },
    { x: -7.4, z: 15.9, yaw: 0.3, char: 1, seed: [0.13, 0.6, 0.72, 0.42] },
    { x: -9.2, z: 17.1, yaw: 0.82, char: 2, seed: [0.19, 0.27, 0.72, 0.21] },
    { x: 8.4, z: 16.6, yaw: -1.3, char: 3, seed: [0.17, 0.62, 0.72, 0.22] },
  ];
  createPeople(renderer, sunUniform, fogDensity).then((p) => {
    people = p;
    p.addSeats(CREW.map((c) => ({ ...c, y: 0, scale: 1, chunk: 0, center: new THREE.Vector3(0, 1, 4), radius: 16 })));
    group.add(p.group);
  }).catch((e) => console.warn('crew', e));

  const spot = (color, intensity, angle, pos, at, decay = 1.6) => {
    const l = new THREE.SpotLight(color, intensity, 60, angle, 0.85, decay);
    l.position.set(...pos);
    l.target.position.set(...at);
    group.add(l, l.target);
    return l;
  };
  const studio = [
    [spot('#ffe4c4', 520, 0.42, [-5.4, 5.6, -4.8], [0, 0.6, 0]), 520],
    [spot('#b9d2ff', 700, 0.4, [4.6, 3.4, 5.8], [0, 0.7, 0]), 700],
    [spot('#f4f6ff', 150, 1.0, [0, 5.3, 0], [0, 0, 0]), 150],
    [spot('#fff1e0', 160, 0.42, [5.6, 3.2, -5.2], [0, 0.6, 0]), 160],
  ];
  const lights = [spot('#ffd9d4', 260, 1.0, [0, 5.2, 8.6], [0, 0.4, -0.5]), spot('#fff6e6', 700, 0.8, [0, 7.8, -2], [0, 0, 5.9]), spot('#ffe8d0', 460, 0.55, [-1.6, 6.8, 2.7], [-4.7, 1.2, 2.2])];
  for (const l of [studio[0][0], studio[2][0], studio[3][0], lights[0]]) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004; }
  const base = [260, night ? 700 : 420, 460];
  const level = [1, 0.2, 0.2], want = [1, 0.2, 0.2];
  const spots = [...studio.map(([l]) => l), ...lights];
  group.visible = false;
  for (const l of spots) l.visible = false;

  const raycaster = new THREE.Raycaster();
  const faces = [board, tyre, decal];
  const hits = { board: [], tyre: [], floor: [] };
  const sig = {};
  const redraw = (name, view, draw) => {
    const key = JSON.stringify(view);
    if (sig[name] === key) return;
    sig[name] = key;
    draw();
  };
  const reduced = () => !!settings.reduced;
  const slide = { page: '', at: 0, from: 0, to: 0, t0: 0 };

  const cam = { pos: new THREE.Vector3(), at: new THREE.Vector3(), fov: 40 };
  const from = { pos: new THREE.Vector3(), at: new THREE.Vector3(), fov: 40 };
  const to = { pos: new THREE.Vector3(), at: new THREE.Vector3(), fov: 40 };
  let t = 1, dur = 1, lastKey = '', lastAspect = 0, flashK = 0, introT = 1, active = false, cutNext = false;
  const saved = new Map();
  const teleData = { rows: [], venues: [], current: '' };
  let teleAt = -1;

  function target(shot, aspect, out) {
    out.pos.fromArray(shot.pos).add(ANCHOR);
    out.at.fromArray(shot.at).add(ANCHOR);
    out.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(shot.h) / 2) / aspect) * 180 / Math.PI, 18, 62);
  }

  return {
    group,
    anchor: ANCHOR,
    carPosition: new THREE.Vector3(ANCHOR.x, ANCHOR.y + CAR_Y, ANCHOR.z),
    carQuaternion: table.quaternion,
    get active() { return active; },
    setActive(on, scene, keep = []) {
      if (on === active) return;
      active = on;
      if (on) {
        for (const o of scene.children) {
          if (o === group || o.isLight || keep.includes(o)) continue;
          saved.set(o, o.visible);
          o.visible = false;
        }
      } else {
        for (const [o, v] of saved) o.visible = v;
        saved.clear();
      }
      group.visible = on;
      for (const l of spots) l.visible = on;
    },
    intro() {
      introT = 0;
      lastKey = '';
    },
    cut() { cutNext = true; },
    get sliding() { return slide.at !== slide.to; },
    flash() { flashK = 1; },
    draw(view, now) {
      const b = view.board;
      if (b.kind !== 'results') {
        const page = `${b.kind}${b.venue?.id ?? ''}${b.rows.length}`;
        if (slide.page !== page) Object.assign(slide, { page, at: b.index, from: b.index, to: b.index, t0: now });
        else if (slide.to !== b.index) Object.assign(slide, { from: slide.at, to: b.index, t0: now });
        const k = reduced() ? 1 : Math.min(1, (now - slide.t0) / SLIDE);
        slide.at = slide.from + (slide.to - slide.from) * (1 - (1 - k) ** 3);
        view = { ...view, board: { ...b, at: slide.at } };
      }
      redraw('board', view.board, () => { hits.board = drawBoard(boardFace.g, view.board); boardFace.tex.needsUpdate = true; });
      redraw('floor', view.floor, () => { hits.floor = drawFloor(floorFace.g, glowFace.g, view.floor); floorFace.tex.needsUpdate = true; glowFace.tex.needsUpdate = true; });
      const tv = view.tyre.listening ? { ...view.tyre, blink: Math.floor(now * 3) } : view.tyre;
      redraw('tyre', tv, () => { hits.tyre = drawTyre(tyreFace.g, view.tyre, now); tyreFace.tex.needsUpdate = true; });
    },
    update(dt, now, view, camera, pointer) {
      const k = SHOT[view.page] ? view.page : 'board', aspect = camera.aspect;
      target(SHOT[k], aspect, to);
      const retarget = k !== lastKey || aspect !== lastAspect;
      if (retarget) {
        if (lastKey === '') {
          target(INTRO, aspect, from);
          dur = reduced() ? 0 : 2.4;
        } else if (cutNext) dur = 0;
        else {
          from.pos.copy(cam.pos); from.at.copy(cam.at); from.fov = cam.fov;
          dur = reduced() || (aspect !== lastAspect && k === lastKey) ? 0 : 1.2;
        }
        t = dur === 0 ? 1 : 0;
        lastKey = k; lastAspect = aspect; cutNext = false;
      }
      t = dur === 0 ? 1 : Math.min(1, t + dt / dur);
      const e = smooth(t);
      cam.pos.lerpVectors(from.pos, to.pos, e);
      cam.pos.y += Math.sin(Math.PI * e) * 0.4;
      cam.at.lerpVectors(from.at, to.at, e);
      cam.fov = from.fov + (to.fov - from.fov) * e;
      camera.position.copy(cam.pos);
      camera.up.set(0, 1, 0);
      if (!reduced()) {
        const s = 1 - Math.exp(-dt * 3);
        pointer.x += (pointer.tx - pointer.x) * s; pointer.y += (pointer.ty - pointer.y) * s;
        camera.position.x += Math.sin(now * 0.31) * 0.03; camera.position.y += Math.sin(now * 0.23 + 1) * 0.02;
      }
      camera.lookAt(cam.at);
      if (!reduced()) { camera.rotateY(-pointer.x * 0.02); camera.rotateX(pointer.y * 0.012); }
      camera.filmOffset = 0;
      if (Math.abs(camera.fov - cam.fov) > 1e-3) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }

      introT = Math.min(1, introT + dt / (reduced() ? 0.01 : 1.8));
      const boot = introT < 1 ? (Math.sin(introT * 38) > -0.2 ? 1 : 0.25) * smooth(Math.min(1, introT * 1.6)) : 1;
      flashK = Math.max(0, flashK - dt * 2.6);
      const z = ZONE_LIGHT[view.zone];
      for (let i = 0; i < 3; i++) {
        want[i] = i === z ? 1 : 0.18;
        level[i] += (want[i] - level[i]) * (1 - Math.exp(-dt * (reduced() ? 60 : 4)));
        lights[i].intensity = base[i] * level[i] * boot * (i === 0 ? 1 + flashK * 5 : 1);
      }
      lights[0].color.set(flashK > 0.01 ? '#ff4a52' : '#ffd9d4');
      for (const [l, b] of studio) l.intensity = b * boot;
      if (!reduced()) { table.rotation.y += dt * 0.16; scan.position.x = Math.sin(now * 0.9) * (bw / 2 - 0.4); }
      ledMat.color.setRGB(1.6, 2.2, 2.6).multiplyScalar(boot);
      M.heat.color.setRGB(3.2, 0.9, 0.2).multiplyScalar(0.7 + 0.3 * Math.sin(now * 2.2));
      if (people) people.uniforms.uTime.value = now;
      if (view.board.kind === 'modes') teleData.rows = view.board.rows;
      teleData.venues = view.floor.venues; teleData.current = view.floor.current;
      if (now - teleAt > 0.1) { teleAt = now; drawTelemetry(teleFace.g, teleData, now); teleFace.tex.needsUpdate = true; }
      const dim = (zone) => (0.34 + 0.66 * level[ZONE_LIGHT[zone]]) * boot;
      const bk = 0.85 * dim('board');
      boardMat.color.setRGB(bk * (1 + flashK * 2), bk * (1 - flashK * 0.55), bk * (1 - flashK * 0.6));
      tyreMat.color.setScalar(0.85 * dim('tyre'));
      decal.material.emissiveIntensity = 1.6 * dim('floor');
      decal.material.color.setScalar(0.5 + 0.7 * level[1]);
      lights[1].target.position.x = BAY_X(view.floor.active ? view.floor.index : view.floor.venues.findIndex((v) => v.id === view.floor.current));
    },
    pick(camera, x, y) {
      raycaster.setFromCamera({ x, y }, camera);
      const hit = raycaster.intersectObjects(faces, false)[0];
      if (!hit) return null;
      const zone = hit.object.userData.zone, spec = zone === 'board' ? BOARD : zone === 'tyre' ? TYRE : FLOOR;
      const px = hit.uv.x * spec.w, py = (1 - hit.uv.y) * spec.h;
      const found = hits[zone].find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
      if (!found) return { zone };
      return { zone, row: found.row, act: found.act, fx: found.slider ? (px - found.slider[0]) / (found.slider[1] - found.slider[0]) : undefined };
    },
  };
}
