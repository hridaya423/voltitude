import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { RAIL } from '../sim/drive.js';
import { skyFog } from './sky.js';
import { runs, extrude, barriers } from './road.js';
import { RUNWAY } from './airfield.js';

const BOARD = 12.8;
const ROWS = 8;
const FENCE = 4.4;
const TYRE = 0.66;
const SPONSORS = [
  ['VOLTITUDE', '#e3263b', '#ffffff'], ['RDSTR', '#111216', '#f4f2ee'], ['HELIO CELLS', '#ffc21a', '#141414'], ['NORTHWIND', '#1069f0', '#ffffff'],
  ['KESTREL TYRES', '#17a84f', '#ffffff'], ['MERIDIAN', '#f4f2ee', '#d81f34'], ['AXIAL', '#ff6a14', '#ffffff'], ['TERRA GRID', '#08a6ab', '#ffffff'],
];
const _m = new THREE.Matrix4();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();

function boardAtlas() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 128 * ROWS;
  const g = c.getContext('2d');
  g.scale(2, 2);
  SPONSORS.forEach(([name, bg, ink], k) => {
    const y = k * 64;
    g.fillStyle = bg; g.fillRect(0, y, 1024, 64);
    g.fillStyle = ink; g.font = '800 expanded 38px Archivo, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
    for (const x of [256, 768]) g.fillText(name, x, y + 33);
    g.fillRect(511, y + 14, 2, 36);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

function wireTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.lineWidth = 3;
  for (let k = -128; k <= 256; k += 32) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 128, 128); g.stroke();
    g.beginPath(); g.moveTo(k + 128, 0); g.lineTo(k, 128); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.25, (FENCE - 1.16) * 1.25);
  t.anisotropy = 8;
  return t;
}

function upright(track, open) {
  return runs(track).flatMap((run) => {
    const out = [];
    let cur = [];
    for (const i of run) {
      if (track.U[i * 3 + 1] > 0.95 && !open(track.P[i * 3], track.P[i * 3 + 2])) cur.push(i);
      else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  });
}

function frameAt(track, i, side, lat, h, out) {
  const o = i * 3;
  _x.set(track.R[o], track.R[o + 1], track.R[o + 2]);
  _y.set(track.U[o], track.U[o + 1], track.U[o + 2]);
  _z.crossVectors(_x, _y);
  out.makeBasis(_x, _y, _z);
  out.setPosition(track.P[o] + _x.x * side * lat + _y.x * h, track.P[o + 1] + _x.y * side * lat + _y.y * h, track.P[o + 2] + _x.z * side * lat + _y.z * h);
  return out;
}

function instanced(geo, mat, sites, place) {
  const mesh = new THREE.InstancedMesh(geo, mat, sites.length);
  sites.forEach((s, k) => mesh.setMatrixAt(k, place(s)));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export function createTrackside(world, sunUniform, fogDensity, night) {
  const { track } = world;
  const group = new THREE.Group();
  const { half, z0, z1 } = RUNWAY;
  const list = upright(track, world.venue.id === 'airfield' ? (x, z) => Math.abs(x) < half && z > z0 && z < z1 : () => false);

  const boardMat = new THREE.MeshStandardMaterial({ map: boardAtlas(), roughness: 0.55, metalness: 0, emissive: 0xffffff, emissiveIntensity: night ? 1.4 : 0 });
  boardMat.emissiveMap = boardMat.map;
  skyFog(boardMat, sunUniform, fogDensity, false, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vBoard;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvBoard = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vBoard;')
      .replace('#include <map_fragment>', `
        float bi = floor(vBoard.x / ${BOARD.toFixed(1)});
        float row = floor(fract(sin(bi * 12.9898) * 43758.5453) * ${ROWS.toFixed(1)});
        vec2 auv = vec2(fract(vBoard.x / ${BOARD.toFixed(1)}), 1.0 - (row + 1.0 - vBoard.y) / ${ROWS.toFixed(1)});
        vec4 board = texture2D(map, auv);
        diffuseColor.rgb *= board.rgb;`)
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= board.rgb;');
  });
  boardMat.customProgramCacheKey = () => 'trackside-board';
  const bar = barriers(track), at = (side) => (side > 0 ? bar.R : bar.L);
  const face = (side) => {
    const b = at(side), lo = (w, i) => [side * (b[i] - RAIL + 0.84), 0.14], hi = (w, i) => [side * (b[i] - RAIL + 0.92), 0.86];
    const g = extrude(track, list, side > 0 ? [hi, lo] : [lo, hi]);
    if (side > 0) { const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, 4000 - uv.getX(k), 1 - uv.getY(k)); }
    return g;
  };
  const boards = new THREE.Mesh(mergeGeometries([face(1), face(-1)]), boardMat);
  boards.receiveShadow = true;

  const wireMat = new THREE.MeshStandardMaterial({ color: '#8d9298', roughness: 0.45, metalness: 0.7, alphaMap: wireTexture(), alphaHash: true, side: THREE.DoubleSide });
  skyFog(wireMat, sunUniform, fogDensity);
  const wire = new THREE.Mesh(mergeGeometries([1, -1].map((side) => extrude(track, list, [(w, i) => [side * (at(side)[i] - 0.3), 1.16], (w, i) => [side * (at(side)[i] - 0.3), FENCE]]))), wireMat);
  wire.castShadow = true;

  const steel = new THREE.MeshStandardMaterial({ color: '#6f747b', roughness: 0.4, metalness: 0.8 });
  skyFog(steel, sunUniform, fogDensity);
  const tube = (side, h) => extrude(track, list, [(w, i) => [side * (at(side)[i] - 0.34), h], (w, i) => [side * (at(side)[i] - 0.3), h + 0.06], (w, i) => [side * (at(side)[i] - 0.26), h]]);
  const rails = new THREE.Mesh(mergeGeometries([1, -1].flatMap((side) => [tube(side, FENCE - 0.04), tube(side, 2.6)])), steel);

  const step = Math.max(1, Math.round(4 / track.step)), postSites = [];
  for (const run of list) for (let i = run[0]; i <= run[run.length - 1]; i += step) for (const side of [-1, 1]) postSites.push([i, side]);
  const posts = instanced(new THREE.BoxGeometry(0.09, FENCE - 1.16, 0.09).translate(0, (FENCE - 1.16) / 2, 0), steel, postSites, ([i, side]) => frameAt(track, i, side, at(side)[i] - 0.3, 1.16, _m));

  const tyreSites = [];
  for (const side of [-1, 1]) for (let row = 0; row < 2; row++) {
    const tyre = side > 0 ? track.runoff.tyreR : track.runoff.tyreL, wall = side > 0 ? track.wallR : track.wallL;
    const spot = (i) => { const o = i * 3, l = side * (wall[i] - 0.58 + row * 0.66); return [track.P[o] + track.R[o] * l, track.P[o + 1] + track.R[o + 1] * l, track.P[o + 2] + track.R[o + 2] * l]; };
    let run = 0;
    for (let i = 0; i < track.lap; i++) {
      if (!tyre[i]) { run = 0; continue; }
      const a = spot(i), b = spot(i + 1), len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      for (; run < len; run += TYRE) tyreSites.push([i, side, row, a.map((v, c) => v + (b[c] - v) * (run / len))]);
      run -= len;
    }
  }
  const tyreMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, vertexColors: true });
  skyFog(tyreMat, sunUniform, fogDensity);
  const stack = mergeGeometries([0, 1, 2].map((h) => {
    const g = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12, 1, h < 2).translate(0, 0.125 + h * 0.25, 0).toNonIndexed();
    const shade = h === 1 ? 1 : 0.09;
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(shade), 3));
    return g;
  }));
  const tyres = instanced(stack, tyreMat, tyreSites, ([i, side, , p]) => frameAt(track, i, side, 0, 0, _m).setPosition(p[0], p[1], p[2]));
  const red = new THREE.Color('#c8202e'), white = new THREE.Color('#e9e7e1');
  tyreSites.forEach(([i, , row], k) => tyres.setColorAt(k, (Math.floor(i / 6) + row) % 2 ? red : white));

  const hutSites = [], hutStep = Math.round(260 / track.step);
  for (const run of list) for (let i = run[0] + hutStep / 2; i < run[run.length - 1]; i += hutStep) hutSites.push([Math.round(i), (Math.round(i / hutStep) % 2) * 2 - 1]);
  const hutMat = new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.6, emissive: '#ff7a1a', emissiveIntensity: night ? 0.25 : 0 });
  skyFog(hutMat, sunUniform, fogDensity);
  const huts = instanced(new THREE.BoxGeometry(1.6, 2.3, 1.6).translate(0, 1.15, 0), hutMat, hutSites, ([i, side]) => frameAt(track, i, side, at(side)[i] + 2.2, 0, _m));

  group.add(boards, wire, rails, posts, tyres, huts);
  return { group };
}
