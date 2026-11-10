import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { panelMaterial, makeLabel } from './road.js';
import { skyFog } from './sky.js';
import { lightPoints, roofRuns, merged } from './venue-kit.js';
import { wallKit, bankWall } from './spur.js';

export const RUNWAY = { half: 45, z0: -820, z1: 930, y: 1.32 };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

function runwayMaterial(renderer, sunUniform, fogDensity) {
  const loader = new THREE.TextureLoader();
  const load = (f, srgb) => {
    const t = loader.load(`assets/terrain/runway_asphalt/${f}_2k.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  };
  const m = new THREE.MeshStandardMaterial({ map: load('albedo', true), normalMap: load('normal', false), roughnessMap: load('arm', false), roughness: 1, metalness: 0, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  m.normalScale.set(0.6, 0.6);
  const { half, z0, z1 } = RUNWAY;
  skyFog(m, sunUniform, fogDensity, false, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = (modelMatrix * vec4(position, 1.0)).xz / 9.0;\nvNormalMapUv = vMapUv;\nvRoughnessMapUv = vMapUv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        float band(float v, float a, float b, float aa) { return smoothstep(a - aa, a, v) * (1.0 - smoothstep(b, b + aa, v)); }
        float marks(vec2 p) {
          float a = abs(p.x), aa = fwidth(p.x) + 0.02;
          float L = ${(z1 - z0).toFixed(1)};
          float s = min(p.y - ${z0.toFixed(1)}, ${z1.toFixed(1)} - p.y);
          float m = band(a, ${(half - 2).toFixed(1)}, ${(half - 1.1).toFixed(1)}, aa) * step(0.0, s);
          float keys = band(s, 6.0, 36.0, 0.05) * step(16.0, a) * step(a, 42.0) * step(0.5, fract((a - 16.0) / 3.6));
          float tdz = 0.0;
          for (int k = 0; k < 4; k++) {
            float at = 150.0 + float(k) * 150.0;
            tdz += band(s, at, at + 22.0, 0.05) * step(19.0, a) * step(a, 36.0) * step(0.45, fract((a - 19.0) / 3.4));
          }
          float aim = band(s, 330.0, 390.0, 0.05) * band(a, 18.0, 28.0, aa);
          return clamp(m + keys + tdz + aim, 0.0, 1.0) * step(s, L);
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float paintAmt = marks(vFogWorld.xz);
        float rubber = 0.75 + 0.25 * smoothstep(0.2, 0.6, texture2D(map, vMapUv * 0.07).r);
        diffuseColor.rgb *= 0.78 * rubber;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.85, 0.8) * mix(0.75, 1.0, texture2D(map, vMapUv * 3.1).r * 1.6), paintAmt * 0.92);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.85, 0.88, 0.95) * paintAmt * uNight * 0.05 * exp(-length(vFogWorld - cameraPosition) / 140.0);`);
  });
  m.customProgramCacheKey = () => 'runway';
  return m;
}

function towerSite(track) {
  const k = track.sectors.findIndex((s) => s.name === 'Tower');
  if (k < 0) return null;
  const end = track.sectors[k + 1]?.i ?? track.lap;
  let i = track.sectors[k].i, best = 0;
  for (let j = i; j < end; j++) if (!track.air[j] && Math.abs(track.curv[j]) > best) { best = Math.abs(track.curv[j]); i = j; }
  const side = track.curv[i] > 0 ? -1 : 1, off = Math.max(track.wallL[i], track.wallR[i]) + 45, o = i * 3;
  return { x: track.P[o] + track.R[o] * off * side, z: track.P[o + 2] + track.R[o + 2] * off * side, top: track.P[o + 1] };
}

export function createAirfield(world, sunUniform, fogDensity, renderer) {
  const { track, terrain } = world;
  const group = new THREE.Group();
  const C = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
  const WHITE = C('#fff4dc', 7), AMBER = C('#ffb347', 7), GREEN = C('#3dff7a', 7), RED = C('#ff2a2a', 7), BLUE = C('#3d7bff', 6), WARM = C('#ffd9a0', 6);
  const lights = lightPoints();
  const { half, z0, z1, y } = RUNWAY;

  const strip = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, z1 - z0).rotateX(-Math.PI / 2).translate(0, y, (z0 + z1) / 2), runwayMaterial(renderer, sunUniform, fogDensity));
  strip.receiveShadow = true;
  group.add(strip);
  const designators = [['36', z0 + 70, Math.PI], ['18', z1 - 70, 0]];
  for (const [txt, z, rot] of designators) for (const side of [-1, 1]) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#e8e6df';
    g.font = '700 300px Archivo, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(side < 0 ? txt[0] : txt[1], 128, 270);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const dm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    skyFog(dm, sunUniform, fogDensity);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(9, 18).rotateX(-Math.PI / 2).rotateY(rot), dm);
    d.position.set((side * 27) * (rot ? -1 : 1), y + 0.02, z);
    group.add(d);
  }

  const dashes = [];
  for (let i = 0; i < track.n; i++) {
    const o = i * 3, z = track.P[o + 2];
    if (Math.abs(track.P[o]) < 0.5 && z > z0 + 60 && z < z1 - 60 && Math.abs(track.U[o + 1] - 1) < 1e-3 && ((z - z0) % 60 + 60) % 60 < track.step) dashes.push([track.P[o + 1], z]);
  }
  const dashMat = new THREE.MeshStandardMaterial({ color: '#e4e2dc', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  skyFog(dashMat, sunUniform, fogDensity);
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 36).rotateX(-Math.PI / 2).translate(0, 0, 18), dashMat, dashes.length);
  dashes.forEach(([dy, z], k) => dash.setMatrixAt(k, _m.makeTranslation(0, dy + 0.01, z)));
  dash.receiveShadow = true;
  group.add(dash);

  for (let z = z0; z <= z1; z += 30) {
    const c = z > z1 - 600 ? AMBER : WHITE;
    lights.add(-half - 0.6, y + 0.4, z, c);
    lights.add(half + 0.6, y + 0.4, z, c);
  }
  for (let x = -half; x <= half; x += 3) {
    lights.add(x, y + 0.35, z0 - 2, GREEN, 0.8);
    lights.add(x, y + 0.35, z1 + 2, RED, 0.8);
  }
  for (let k = 1; k <= 30; k++) {
    const z = z0 - 30 * k;
    for (let x = -6; x <= 6; x += 1.5) lights.add(x, y + 1.2, z, WHITE, 0.7);
    lights.add(0, y + 1.6, z, WHITE, 1.6, 1 - k / 30);
    if (k === 10) for (let x = -21; x <= 21; x += 1.5) lights.add(x, y + 1.2, z, WHITE, 0.7);
  }
  const poles = [];
  for (let k = 1; k <= 30; k++) poles.push(new THREE.BoxGeometry(0.2, 1.2, 0.2).translate(0, y + 0.6, z0 - 30 * k), new THREE.BoxGeometry(13, 0.18, 0.18).translate(0, y + 1.1, z0 - 30 * k));

  const shell = panelMaterial('#9aa0a8', 0.55, 0.35, sunUniform, fogDensity, 'hangar', 2.4);
  shell.side = THREE.DoubleSide;
  const dark = new THREE.MeshStandardMaterial({ color: '#17181d', roughness: 0.45, metalness: 0.6 });
  skyFog(dark, sunUniform, fogDensity);
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.4, 3.6), toneMapped: false });
  const shells = [], frames = [], lamps = [];
  roofRuns(track).forEach(([a, b], k) => {
    const ka = a * 3, kb = b * 3;
    const ax = track.P[ka], az = track.P[ka + 2], bx = track.P[kb], bz = track.P[kb + 2];
    const len = Math.hypot(bx - ax, bz - az) + 24;
    const yaw = Math.atan2(bx - ax, bz - az);
    const R = Math.max(track.wallL[a], track.wallR[a]) + 9;
    const base = Math.min(track.P[ka + 1], track.P[kb + 1]) - 1.2;
    _q.setFromAxisAngle(_p.set(0, 1, 0), yaw);
    const at = new THREE.Vector3((ax + bx) / 2, base, (az + bz) / 2);
    const place = (g) => g.applyQuaternion(_q).translate(at.x, at.y, at.z);
    const arch = new THREE.CylinderGeometry(R, R, len, 40, 1, true, -Math.PI / 2, Math.PI);
    const uv = arch.attributes.uv;
    for (let u = 0; u < uv.count; u++) uv.setXY(u, uv.getY(u) * len, uv.getX(u) * Math.PI * R);
    shells.push(place(arch.rotateX(-Math.PI / 2)));
    for (const end of [-1, 1]) {
      const ring = new THREE.TorusGeometry(R + 0.3, 0.7, 6, 40, Math.PI).translate(0, 0, end * len / 2);
      frames.push(place(ring));
      for (const s of [-1, 1]) frames.push(place(new THREE.BoxGeometry(3.2, R * 0.92, 0.5).translate(s * (R - 1.6), R * 0.46, end * (len / 2 + 0.4))));
    }
    for (let z = -len / 2 + 4; z < len / 2 - 2; z += 7) for (const s of [-0.36, 0.36]) {
      const ang = Math.PI / 2 - s;
      lamps.push(place(new THREE.BoxGeometry(0.5, 0.18, 3.6).translate(Math.cos(ang) * (R - 0.6), Math.sin(ang) * (R - 0.6), z)));
    }
    for (const end of [-1, 1]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 14 * 160 / 1024), new THREE.MeshBasicMaterial({ map: makeLabel(`HANGAR ${k + 1}`, 'VOLTITUDE AIR', '#ff3344'), toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3), side: THREE.DoubleSide }));
      sign.position.set(0, R + 1.6, end * (len / 2 + 0.6));
      sign.rotation.y = end > 0 ? 0 : Math.PI;
      const holder = new THREE.Group();
      holder.add(sign);
      holder.quaternion.copy(_q);
      holder.position.copy(at);
      group.add(holder);
    }
  });
  merged(group, shells, shell, true);
  merged(group, [...frames, ...poles], dark, true);
  merged(group, lamps, lamp, false);

  const site = towerSite(track);
  let beam = null;
  if (site) {
    const g0 = terrain.height(site.x, site.z);
    const H = site.top + 30;
    const cab = H - 10;
    const concrete = panelMaterial('#d8d4cc', 0.7, 0.05, sunUniform, fogDensity, 'tower', 3);
    const glass = new THREE.MeshStandardMaterial({ color: '#0d1218', roughness: 0.06, metalness: 0.9, emissive: '#7fc8ff', emissiveIntensity: 0.55, envMapIntensity: 1.6 });
    skyFog(glass, sunUniform, fogDensity);
    const T = new THREE.Group();
    T.position.set(site.x, g0, site.z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 6.5, cab, 24), concrete);
    shaft.position.y = cab / 2;
    const ribs = [];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ribs.push(new THREE.BoxGeometry(0.8, cab, 1.6).translate(Math.sin(a) * 4.9, cab / 2, Math.cos(a) * 4.9)); }
    const rib = new THREE.Mesh(mergeGeometries(ribs), dark);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 6, 3, 24), concrete);
    deck.position.y = cab + 1.5;
    const win = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 9.5, 6, 24, 1, true), glass);
    win.position.y = cab + 6;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(9, 12.2, 1.6, 24), dark);
    roof.position.y = cab + 9.8;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 14, 8), concrete);
    mast.position.y = cab + 17;
    for (const m of [shaft, rib, deck, roof, mast]) { m.castShadow = true; m.receiveShadow = true; }
    T.add(shaft, rib, deck, win, roof, mast);
    for (let k = 0; k < 4; k++) lights.add(site.x, g0 + cab * (k + 1) / 4, site.z + 6.8 - k * 0.35, RED, 1.1, k * 0.13);
    lights.add(site.x, g0 + cab + 24.2, site.z, RED, 1.6, 0.5);
    const beamMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0.9, 1.2, 1.0) } },
      vertexShader: 'varying float vT; varying vec2 vUv; void main() { vUv = uv; vT = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main() { float edge = sin(vUv.x * 3.14159); gl_FragColor = vec4(uColor * pow(vUv.y, 3.0) * edge * 0.22, 1.0); }',
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    beam = new THREE.Group();
    beam.position.y = cab + 11.5;
    for (const [s, c] of [[1, null], [-1, new THREE.Color(0.4, 1.6, 0.6)]]) {
      const m = beamMat.clone();
      if (c) m.uniforms.uColor.value = c;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 26, 520, 16, 1, true).translate(0, -260, 0).rotateZ(s * Math.PI / 2 + s * -0.06), m);
      cone.frustumCulled = false;
      beam.add(cone);
    }
    T.add(beam);
    group.add(T);
  }

  const kit = wallKit(sunUniform, fogDensity), bank = bankWall(track, terrain.height);
  merged(group, bank.walls, kit.concrete, true);
  merged(group, bank.ribs, kit.rib, true);
  merged(group, bank.leds, kit.led, false);

  const lp = lights.build();
  group.add(lp);
  return {
    group,
    update(time, camera, night) {
      lights.mat.uniforms.uTime.value = time;
      lights.mat.uniforms.uNight.value = night;
      lights.mat.uniforms.uScale.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360);
      if (beam) { beam.rotation.y = time * 1.4; beam.visible = night > 0.5; }
    },
  };
}
