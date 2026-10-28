import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { RAIL } from '../sim/drive.js';
import { lightTick } from '../sim/race.js';
import { skyFog } from './sky.js';

const STRIDE = 2;
const SLAB = 1.1;
const WHITE = '#e4e2dc';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _t = new THREE.Vector3();

export function runs(track) {
  const out = [];
  let cur = null;
  for (let i = 0; i < track.n; i++) {
    if (track.gap[i]) { if (cur) { cur.push(i); out.push(cur); cur = null; } continue; }
    if (!cur) cur = [];
    if ((i % STRIDE === 0) || i === track.n - 1 || track.gap[i + 1]) cur.push(i);
  }
  if (cur && cur.length > 1) out.push(cur);
  return out.filter((r) => r.length > 1);
}

export function extrude(track, list, profile, extra) {
  const pos = [], nor = [], uv = [], idx = [], ex = [];
  const { P, U, R, halfW } = track;
  for (const run of list) {
    for (let seg = 0; seg < profile.length - 1; seg++) {
      const base = pos.length / 3;
      for (let k = 0; k < run.length; k++) {
        const i = run[k], o = i * 3, w = halfW[i];
        const s = i * track.step;
        for (const [a, b] of [[seg, 0], [seg + 1, 1]]) {
          const [l, h] = profile[a](w);
          pos.push(P[o] + R[o] * l + U[o] * h, P[o + 1] + R[o + 1] * l + U[o + 1] * h, P[o + 2] + R[o + 2] * l + U[o + 2] * h);
          const [l2, h2] = profile[seg + 1](w), [l1, h1] = profile[seg](w);
          const dl = l2 - l1, dh = h2 - h1, len = Math.hypot(dl, dh) || 1;
          const nl = dh / len, nh = -dl / len;
          nor.push(R[o] * nl + U[o] * nh, R[o + 1] * nl + U[o + 1] * nh, R[o + 2] * nl + U[o + 2] * nh);
          uv.push(s, b + seg);
          if (extra) ex.push(...extra(i, l, h, b));
        }
        if (k > 0) {
          const a = base + (k - 1) * 2;
          idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (extra) {
    const n = pos.length / 3, k = ex.length / n;
    const a = new Float32Array(n * 4), b = new Float32Array(n * 3), c = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { a.set(ex.slice(i * k, i * k + 4), i * 4); b.set(ex.slice(i * k + 4, i * k + 7), i * 3); if (k > 7) c.set(ex.slice(i * k + 7, i * k + 9), i * 2); }
    g.setAttribute('aRoad', new THREE.Float32BufferAttribute(a, 4));
    g.setAttribute('aMark', new THREE.Float32BufferAttribute(b, 3));
    if (k > 7) g.setAttribute('aLamp', new THREE.Float32BufferAttribute(c, 2));
  }
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}


export function mastSites(world) {
  const { track, terrain } = world;
  const out = [];
  let side = 1;
  for (let i = track.closed ? 0 : 80; i < track.n - (track.closed ? 45 : 40); i += 90) {
    const o = i * 3;
    if (track.gap[i] || track.U[o + 1] < 0.97) continue;
    side = -side;
    const off = track.halfW[i] + 7;
    const x = track.P[o] + track.R[o] * off * side, z = track.P[o + 2] + track.R[o + 2] * off * side;
    const g = terrain.height(x, z);
    if (Math.abs(g - track.P[o + 1]) > 4) continue;
    out.push({ i, side, off, x, z, g, yaw: Math.atan2(-track.R[o] * side, -track.R[o + 2] * side) });
  }
  return out;
}

export function panelMaterial(color, rough, metal, sunUniform, fogDensity, key, seam = 6) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.9 });
  skyFog(m, sunUniform, fogDensity, false, (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPanel;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvPanel = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPanel;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float sl = fract(vPanel.x / ${seam.toFixed(1)});
        float seamLine = smoothstep(0.012, 0.0, min(sl, 1.0 - sl));
        float grime = 0.92 + 0.08 * sin(vPanel.x * 0.37) * sin(vPanel.x * 0.061 + 1.3);
        diffuseColor.rgb *= grime * (1.0 - seamLine * 0.55);`);
  });
  m.customProgramCacheKey = () => `panel-${key}`;
  return m;
}

function surfaceMaterial(renderer, sunUniform, fogDensity) {
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const load = (f, srgb) => {
    const t = loader.load(`assets/terrain/runway_asphalt/${f}_2k.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  };
  const m = new THREE.MeshStandardMaterial({ map: load('albedo', true), normalMap: load('normal', false), roughnessMap: load('arm', false), aoMap: null, roughness: 1, metalness: 0, envMapIntensity: 0.75 });
  m.normalScale.set(0.7, 0.7);
  skyFog(m, sunUniform, fogDensity, false, (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aRoad;\nattribute vec3 aMark;\nattribute vec2 aLamp;\nvarying vec4 vRoad;\nvarying vec3 vMark;\nvarying vec2 vLamp;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoad = aRoad;\nvMark = aMark;\nvLamp = aLamp;\nvMapUv = vec2(aRoad.x, aRoad.y) / 9.0;\nvNormalMapUv = vMapUv;\nvRoughnessMapUv = vMapUv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vRoad;
        varying vec3 vMark;
        varying vec2 vLamp;
        vec3 paint(vec3 base) {
          float lat = vRoad.x, s = vRoad.y, w = vRoad.z;
          float a = abs(lat);
          float edge = w - ${RAIL.toFixed(2)} + 0.95;
          float aa = fwidth(lat) * 1.2 + 0.01;
          float kerbAmt = step(0.35, vMark.x);
          float kerbBand = smoothstep(edge - 1.7 - aa, edge - 1.7, a) * (1.0 - smoothstep(edge - aa, edge, a));
          float blocks = step(0.5, fract(s / 2.4));
          vec3 kerb = mix(vec3(0.62, 0.05, 0.05), vec3(0.85, 0.84, 0.8), blocks);
          vec3 c = mix(base, kerb, kerbBand * kerbAmt);
          float line = smoothstep(edge - 2.05 - aa, edge - 2.05, a) * (1.0 - smoothstep(edge - 1.8, edge - 1.8 + aa, a));
          c = mix(c, vec3(0.8, 0.79, 0.74), line * 0.9);
          float runoff = smoothstep(edge - aa, edge, a);
          c = mix(c, base * 0.55, runoff);
          float lip = step(0.5, vMark.y);
          float chev = step(0.5, fract((s + a * 0.9) / 3.0));
          c = mix(c, mix(vec3(0.05), vec3(0.85, 0.62, 0.05), chev), lip * (1.0 - runoff));
          float cp = step(0.5, vMark.z);
          float check = mod(floor(s / 1.2) + floor((lat + 40.0) / 1.2), 2.0);
          c = mix(c, mix(vec3(0.04), vec3(0.85), check), cp * (1.0 - runoff));
          float wear = smoothstep(4.0, 0.0, abs(a - 3.2)) * 0.12;
          c *= 1.0 - wear * (1.0 - runoff);
          float seg = floor(s / 17.0);
          float tar = abs(fract(s / 17.0 + 0.09 * sin(lat * 0.7 + seg * 1.7) + 0.04 * sin(lat * 2.3 + seg)) - 0.5);
          c *= 1.0 - 0.55 * (1.0 - smoothstep(0.0025, 0.006, abs(tar - 0.31))) * step(0.35, fract(sin(seg * 7.13) * 91.7)) * (1.0 - runoff);
          float joint = 1.0 - smoothstep(0.03, 0.07, abs(a - w * 0.34));
          c *= 1.0 - 0.3 * joint * (1.0 - runoff);
          float zone = floor(s / 55.0), zf = fract(s / 55.0);
          float zh = fract(sin(zone * 12.7) * 4375.85);
          float off = (fract(zh * 13.1) - 0.5) * 5.0;
          float streak = max(1.0 - smoothstep(0.08, 0.16, abs(lat - off - 0.8)), 1.0 - smoothstep(0.08, 0.16, abs(lat - off + 0.8)));
          float smear = 0.75 + 0.25 * sin(s * 3.1 + lat * 0.4);
          c *= 1.0 - 0.5 * streak * smear * step(0.45, zh) * smoothstep(0.0, 0.15, zf) * (1.0 - smoothstep(0.35, 0.7, zf)) * (1.0 - runoff);
          return c;
        }`)
      .replace('#include <map_fragment>', '#include <map_fragment>\nvec3 macroA = texture2D(map, vMapUv * 0.083 + 0.31).rgb;\ndiffuseColor.rgb = paint(diffuseColor.rgb * mix(0.62, 1.05, smoothstep(0.15, 0.5, dot(macroA, vec3(0.33)))));')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        if (uNight > 0.0) {
          float pd = vRoad.x - vLamp.y;
          float pool = vLamp.x * exp(-pd * pd / 450.0);
          vec3 lit = vec3(1.0, 0.9, 0.78) * pool * 9.0;
          reflectedLight.directDiffuse += diffuseColor.rgb * lit * uNight;
          reflectedLight.directSpecular += lit * 0.035 * uNight;
        }`);
  });
  m.customProgramCacheKey = () => 'road-surface';
  return m;
}

export function makeLabel(text, sub, accent) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0c10'; g.fillRect(0, 0, 1024, 160);
  g.fillStyle = accent; g.fillRect(0, 0, 14, 160);
  g.fillStyle = '#f2efe8';
  g.font = '600 64px Michroma, sans-serif';
  g.textBaseline = 'middle';
  g.fillText(text, 48, 70);
  if (sub) { g.fillStyle = accent; g.font = '600 30px Saira, sans-serif'; g.fillText(sub, 50, 128); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function basisAt(track, i, out) {
  const o = i * 3;
  _r.set(track.R[o], track.R[o + 1], track.R[o + 2]);
  _u.set(track.U[o], track.U[o + 1], track.U[o + 2]);
  _t.set(track.T[o], track.T[o + 1], track.T[o + 2]);
  _m.makeBasis(_r.clone().negate(), _u, _t);
  return out.setFromRotationMatrix(_m);
}

export function createRoad(world, sunUniform, fogDensity, renderer) {
  const { track, terrain } = world;
  const group = new THREE.Group();
  const list = runs(track);

  const kerb = new Float32Array(track.n), lip = new Float32Array(track.n), line = new Float32Array(track.n);
  for (let i = 0; i < track.n; i++) kerb[i] = Math.min(1, Math.max(0, (Math.abs(track.curv[i]) - 0.0035) / 0.003));
  for (let i = 1; i < track.n; i++) if (track.gap[i] && !track.gap[i - 1]) for (let j = Math.max(0, i - 16); j < i; j++) lip[j] = 1;
  for (const { lip: at } of track.jumps ?? []) for (let j = Math.max(0, at - 16); j < at; j++) lip[j] = 1;
  for (const m of track.closed ? [track.finish, 0] : [track.sectors[0].i + 10, track.finish]) for (let j = m - 2; j <= m + 2; j++) if (j >= 0 && j < track.n) line[j] = 1;

  const lampK = new Float32Array(track.n), lampL = new Float32Array(track.n), near = new Float32Array(track.n).fill(1e9);
  for (const m of mastSites(world)) for (let k = m.i - 120; k < m.i + 120; k++) {
    const j = track.closed ? (k + track.n) % track.n : k;
    if (j < 0 || j >= track.n) continue;
    const d = Math.abs(k - m.i);
    if (d < near[j]) { near[j] = d; lampL[j] = m.side * m.off; }
    lampK[j] = Math.max(lampK[j], Math.exp(-d * d / (2 * 30 * 30)));
  }
  for (let j = 0; j < track.n; j++) {
    if (track.U[j * 3 + 1] < 0.97) { lampK[j] = Math.max(lampK[j], 0.8); lampL[j] = 0; }
    else lampK[j] = Math.max(lampK[j], 0.22);
  }
  const top = extrude(track, list, [(w) => [w, 0], (w) => [-w, 0]], (i, l) => [l, i * track.step, track.halfW[i], 0, kerb[i], lip[i], line[i], lampK[i], lampL[i]]);
  const surface = new THREE.Mesh(top, surfaceMaterial(renderer, sunUniform, fogDensity));
  surface.receiveShadow = true;

  const shellMat = panelMaterial(WHITE, 0.55, 0.05, sunUniform, fogDensity, 'shell', 8);
  const shell = new THREE.Mesh(mergeGeometries([
    extrude(track, list, [(w) => [-w, 0], (w) => [-w - 0.05, -SLAB * 0.5], (w) => [-w + 0.4, -SLAB], (w) => [w - 0.4, -SLAB], (w) => [w + 0.05, -SLAB * 0.5], (w) => [w, 0]]),
  ]), shellMat);
  shell.castShadow = true; shell.receiveShadow = true;

  const railMat = panelMaterial('#f1efea', 0.38, 0.0, sunUniform, fogDensity, 'rail', 4);
  const capMat = new THREE.MeshStandardMaterial({ color: '#16171b', roughness: 0.35, metalness: 0.6 });
  skyFog(capMat, sunUniform, fogDensity);
  const railProfile = (side) => {
    const p = [(w) => [side * (w - RAIL + 0.85), 0], (w) => [side * (w - RAIL + 0.95), 0.95], (w) => [side * (w - 0.35), 1.08], (w) => [side * w, 0]];
    return side > 0 ? p.reverse() : p;
  };
  const rails = new THREE.Mesh(mergeGeometries([extrude(track, list, railProfile(1)), extrude(track, list, railProfile(-1))]), railMat);
  rails.castShadow = true; rails.receiveShadow = true;
  const capProfile = (side) => {
    const p = [(w) => [side * (w - RAIL + 0.93), 0.9], (w) => [side * (w - RAIL + 0.96), 1.1], (w) => [side * (w - 0.3), 1.16], (w) => [side * (w - 0.3), 1.07]];
    return side > 0 ? p.reverse() : p;
  };
  const caps = new THREE.Mesh(mergeGeometries([extrude(track, list, capProfile(1)), extrude(track, list, capProfile(-1))]), capMat);
  caps.castShadow = true;

  const ledAt = track.sectors[0].i + 10;
  const startLed = new THREE.Mesh(
    new THREE.BoxGeometry(track.halfW[ledAt] * 2 - 3, 0.05, 0.35).translate(0, 0.03, 0).applyQuaternion(basisAt(track, ledAt, _q)).translate(track.P[ledAt * 3], track.P[ledAt * 3 + 1], track.P[ledAt * 3 + 2]),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.5, 2.8), toneMapped: false }));
  group.add(surface, shell, rails, caps, startLed);

  const capsGeo = [];
  for (const run of list) for (const [i, dir] of [[run[0], -1], [run[run.length - 1], 1]]) {
    if (i === 0 || i === track.n - 1) continue;
    const w = track.halfW[i];
    const box = new THREE.BoxGeometry(w * 2, SLAB, 0.3).translate(0, -SLAB / 2, dir * 0.15);
    box.applyQuaternion(basisAt(track, i, _q));
    box.translate(track.P[i * 3], track.P[i * 3 + 1], track.P[i * 3 + 2]);
    capsGeo.push(box);
  }
  if (capsGeo.length) {
    const lipMat = new THREE.MeshStandardMaterial({ color: '#d9a40f', roughness: 0.5, metalness: 0.2 });
    skyFog(lipMat, sunUniform, fogDensity);
    group.add(new THREE.Mesh(mergeGeometries(capsGeo.map((g) => g.toNonIndexed())), lipMat));
  }

  const structMat = panelMaterial(WHITE, 0.5, 0.05, sunUniform, fogDensity, 'struct', 3);
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1a1b20', roughness: 0.4, metalness: 0.7 });
  skyFog(darkMat, sunUniform, fogDensity);

  const columns = [], heads = [], ribs = [], beams = [];
  for (let i = 10; i < track.n - 10; i += 34) {
    if (track.gap[i]) continue;
    const o = i * 3;
    const uy = track.U[o + 1];
    const px = track.P[o], py = track.P[o + 1], pz = track.P[o + 2];
    const ground = terrain.height(px, pz);
    if (uy > 0.9) {
      const lift = py - SLAB - ground;
      if (lift > 1.5) { columns.push([px, ground - 2, pz, lift + 2, i]); heads.push(i); }
    }
  }
  for (let i = 0; i < track.n; i += 6) {
    if (track.gap[i]) continue;
    const uy = track.U[i * 3 + 1];
    if (uy < 0.9 && i % 12 === 0) ribs.push(i);
    if (uy < -0.3 && track.wall[i] && i % 24 === 0) beams.push(i);
  }
  const colGeo = new THREE.CylinderGeometry(0.85, 1.25, 1, 20, 1).translate(0, 0.5, 0);
  const col = new THREE.InstancedMesh(colGeo, structMat, columns.length);
  columns.forEach(([x, y, z, h], k) => { _m.compose(_p.set(x, y, z), _q.identity(), _s.set(1, h, 1)); col.setMatrixAt(k, _m); });
  const headGeo = new THREE.BoxGeometry(1, 0.9, 2.2).translate(0, -SLAB - 0.45, 0);
  const head = new THREE.InstancedMesh(headGeo, darkMat, heads.length);
  heads.forEach((i, k) => { _m.compose(_p.fromArray(track.P, i * 3), basisAt(track, i, _q), _s.set(track.halfW[i] * 1.4, 1, 1)); head.setMatrixAt(k, _m); });
  const ribGeo = new THREE.BoxGeometry(1, 0.6, 0.7).translate(0, -SLAB - 0.3, 0);
  const rib = new THREE.InstancedMesh(ribGeo, structMat, ribs.length);
  ribs.forEach((i, k) => {
    _m.compose(_p.fromArray(track.P, i * 3), basisAt(track, i, _q), _s.set(track.halfW[i] * 2 + 0.6, 1, 1)); rib.setMatrixAt(k, _m);
  });
  const beamGeo = new THREE.BoxGeometry(1, 1.2, 1.4).translate(0, -SLAB - 0.6, 0);
  const beam = new THREE.InstancedMesh(beamGeo, structMat, beams.length);
  beams.forEach((i, k) => { _m.compose(_p.fromArray(track.P, i * 3), basisAt(track, i, _q), _s.set(130, 1, 1)); beam.setMatrixAt(k, _m); });
  for (const m of [col, head, rib, beam]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }

  const gantryIdx = [...new Set([...track.cps, track.finish])].filter((i) => i > 0).sort((a, b) => a - b);
  const startIdx = track.sectors[0].i + 2;
  const gantries = [startIdx, ...gantryIdx.filter((i) => i !== track.sectors[0].i && !(track.closed && i === track.finish))];
  const towerGeo = [], beamGeo2 = [], ledGeoG = [];
  const H = 10.5;
  gantries.forEach((i, k) => {
    const w = track.halfW[i] + 0.9;
    const q = basisAt(track, i, new THREE.Quaternion());
    const o = i * 3;
    const place = (g) => { g.applyQuaternion(q); g.translate(track.P[o], track.P[o + 1], track.P[o + 2]); return g; };
    const gid = (g) => { g.setAttribute('gid', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(k), 1)); return g; };
    for (const side of [-1, 1]) {
      towerGeo.push(place(new THREE.CylinderGeometry(0.85, 1.35, H + 2, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 1.5).translate(side * (w + 0.6), H / 2 - 1, 0)));
      towerGeo.push(place(new THREE.BoxGeometry(2.6, 0.5, 3.2).translate(side * (w + 0.6), 0.25, 0)));
      ledGeoG.push(gid(place(new THREE.BoxGeometry(0.16, H - 1.6, 0.16).translate(side * (w - 0.05), H / 2 - 0.5, -1.0))));
      ledGeoG.push(gid(place(new THREE.BoxGeometry(0.16, H - 1.6, 0.16).translate(side * (w - 0.05), H / 2 - 0.5, 1.0))));
    }
    beamGeo2.push(place(new THREE.BoxGeometry(w * 2 + 3.4, 2.8, 2.2).translate(0, H + 0.6, 0)));
    towerGeo.push(place(new THREE.BoxGeometry(w * 2 + 3.6, 0.35, 2.4).translate(0, H + 2.15, 0)));
    ledGeoG.push(gid(place(new THREE.BoxGeometry(w * 2 - 0.1, 0.16, 0.16).translate(0, H - 0.85, -1.0))));
    ledGeoG.push(gid(place(new THREE.BoxGeometry(w * 2 - 0.1, 0.16, 0.16).translate(0, H - 0.85, 1.0))));
    const sector = track.sectors.find((s) => Math.abs(s.i - i) <= 2);
    const sIdx = sector ? track.sectors.indexOf(sector) : -1;
    const isFinish = i === track.finish;
    const label = isFinish ? makeLabel('FINISH', `${world.venue.name.toUpperCase()} · CHEQUERED FLAG`, '#ff3344')
      : sIdx >= 0 ? makeLabel(sector.name.toUpperCase(), `SECTOR ${sIdx + 1}`, '#ff3344')
        : makeLabel('CHECKPOINT', 'SPLIT', '#e9f2ff');
    const pw = w * 2 + 2.6, ph = pw * 160 / 1024;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(pw, Math.min(ph, 2.4)), new THREE.MeshBasicMaterial({ map: label, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
    panel.position.set(0, H + 0.6, -1.12);
    panel.rotation.y = Math.PI;
    const holder = new THREE.Group();
    holder.position.fromArray(track.P, o);
    holder.quaternion.copy(q);
    holder.add(panel);
    const back = panel.clone();
    back.position.z = 1.12; back.rotation.y = 0;
    holder.add(back);
    group.add(holder);
  });
  const beams2 = new THREE.Mesh(mergeGeometries(beamGeo2.map((g) => g.toNonIndexed())), darkMat);
  beams2.castShadow = true;
  group.add(beams2);
  const towers = new THREE.Mesh(mergeGeometries(towerGeo.map((g) => g.toNonIndexed())), structMat);
  towers.castShadow = true; towers.receiveShadow = true;
  const gantryLed = new THREE.ShaderMaterial({
    uniforms: { uColors: { value: gantries.map(() => new THREE.Vector3(1, 1, 1)) } },
    vertexShader: `attribute float gid; uniform vec3 uColors[${gantries.length}]; varying vec3 vC; void main() { vC = uColors[int(gid + 0.5)]; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: 'varying vec3 vC; void main() { gl_FragColor = vec4(vC, 1.0); }',
  });
  group.add(towers, new THREE.Mesh(mergeGeometries(ledGeoG.map((g) => g.toNonIndexed())), gantryLed));
  for (const m of group.children) if (m.isMesh) m.frustumCulled = false;

  const lampGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.25, 20).rotateX(Math.PI / 2);
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), 5);
  {
    const q = basisAt(track, startIdx, new THREE.Quaternion());
    for (let k = 0; k < 5; k++) {
      _p.set((k - 2) * 1.6, H - 1.9, -1.15).applyQuaternion(q).add(_s.fromArray(track.P, startIdx * 3));
      _m.compose(_p, q, _s.setScalar(1));
      lamps.setMatrixAt(k, _m);
      lamps.setColorAt(k, new THREE.Color(0.05, 0.01, 0.01));
    }
  }
  group.add(lamps);

  const padMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vC; void main() { vUv = uv; vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv; varying vec3 vC;
      void main() {
        float x = abs(vUv.x - 0.5) * 2.0;
        float chev = fract(vUv.y * 4.0 - x * 0.9 - uTime * 2.2);
        float band = smoothstep(0.0, 0.08, chev) * smoothstep(0.55, 0.4, chev);
        float frame = step(0.94, x) + step(0.97, abs(vUv.y - 0.5) * 2.0);
        float a = clamp(band * 0.85 + frame, 0.0, 1.0) * smoothstep(1.0, 0.9, x);
        gl_FragColor = vec4(vC * (0.35 + a * 3.2), 1.0);
      }`,
  });
  const pads = new THREE.InstancedMesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2).translate(0, 0.04, 7), padMat, track.pads.length);
  track.pads.forEach((p, k) => {
    _m.compose(_p.fromArray(track.P, p.i * 3), basisAt(track, p.i, _q), _s.setScalar(1));
    _m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    pads.setMatrixAt(k, _m);
    pads.setColorAt(k, p.type === 'boost' ? new THREE.Color('#ff7a1c') : new THREE.Color('#2fd8ff'));
  });
  if (track.pads.length) group.add(pads);

  for (const m of [surface, shell, rails, caps, startLed, towers]) m.frustumCulled = false;

  const state = new Float32Array(gantries.length);
  const tmp = new THREE.Color();
  return {
    group,
    gantries,
    update(time, dt, race) {
      padMat.uniforms.uTime.value = time;
      const nextIdx = race ? race.event.cps[race.next] : -1;
      gantries.forEach((i, k) => {
        const passed = race && !track.closed && race.splits.length && i <= race.lastIdx && i > race.event.from;
        const target = i === nextIdx ? 1 : passed ? 0.4 : 0.15;
        state[k] += (target - state[k]) * Math.min(1, dt * 6);
        if (i === nextIdx) tmp.set(1, 0.95, 0.9).multiplyScalar(3 + 2 * Math.sin(time * 6));
        else if (passed) tmp.set(0.2, 1, 0.45).multiplyScalar(2.2);
        else tmp.set(0.9, 0.92, 1).multiplyScalar(0.6 + state[k]);
        gantryLed.uniforms.uColors.value[k].set(tmp.r, tmp.g, tmp.b);
      });
      if (race) {
        const t = race.raceTick;
        for (let k = 0; k < 5; k++) {
          if (race.phase === 'countdown') {
            const lit = t >= lightTick(k + 1);
            tmp.set(lit ? 6 : 0.05, lit ? 0.25 : 0.01, lit ? 0.2 : 0.01);
          } else tmp.set(0.05, 0.01, 0.01);
          lamps.setColorAt(k, tmp);
        }
        lamps.instanceColor.needsUpdate = true;
        let k = 0;
        for (const p of track.pads) {
          const used = race.used.has(p.i);
          pads.setColorAt(k++, tmp.set(p.type === 'boost' ? '#ff7a1c' : '#2fd8ff').multiplyScalar(used ? 0.25 : 1));
        }
        if (pads.instanceColor) pads.instanceColor.needsUpdate = true;
      }
    },
  };
}
