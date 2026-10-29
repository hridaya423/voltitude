import * as THREE from 'three';
import { panelMaterial } from './road.js';
import { skyFog } from './sky.js';
import { seaMask } from '../sim/terrain.js';
import { lightPoints, roofRuns, merged } from './venue-kit.js';

const _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

function waterMaterial(sunUniform, fogDensity, time) {
  const m = new THREE.MeshStandardMaterial({ color: '#08202c', roughness: 0.07, metalness: 0, envMapIntensity: 1.3 });
  skyFog(m, sunUniform, fogDensity, false, (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSea;\nattribute float aDepth;\nvarying float vSea;\nvarying float vDepth;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSea = aSea;\nvDepth = aDepth;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vSea;\nvarying float vDepth;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vSea < 0.5) discard;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float foam = smoothstep(2.2, 0.2, vDepth) * (0.55 + 0.45 * sin(vFogWorld.x * 0.31 + vFogWorld.z * 0.17 + uTime * 1.6));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.8, 0.8), foam * 0.6);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 wp = vFogWorld.xz;
        float t = uTime;
        vec3 wn = normalize(vec3(
          0.05 * sin(wp.x * 0.21 + t * 1.3) + 0.035 * sin(wp.x * 0.53 - wp.y * 0.37 + t * 1.9) + 0.02 * sin(wp.y * 1.3 + wp.x * 0.7 + t * 2.7),
          1.0,
          0.05 * cos(wp.y * 0.19 + t * 1.1) + 0.035 * cos(wp.x * 0.41 + wp.y * 0.6 - t * 1.7) + 0.02 * sin(wp.x * 1.1 - t * 2.2)));
        normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);`);
  });
  m.customProgramCacheKey = () => 'water';
  return m;
}

function water(terrain, T, mat) {
  const n = 240, size = terrain.size, x0 = terrain.x0, z0 = terrain.z0;
  const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2).translate(x0 + size / 2, 0, z0 + size / 2);
  const p = g.attributes.position, sea = new Float32Array(p.count), depth = new Float32Array(p.count);
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), z = p.getZ(k);
    sea[k] = seaMask(x, z, T) > 0.15 ? 1 : 0;
    depth[k] = -terrain.height(x, z);
  }
  g.setAttribute('aSea', new THREE.BufferAttribute(sea, 1));
  g.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function vapor() {
  const N = 160, seed = new Float32Array(N), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) seed[i] = i / N;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uNight: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
      float h(float n) { return fract(sin(n * 127.1) * 43758.5453); }
      void main() {
        float life = fract(uTime * 0.18 + aSeed * 7.31);
        float a = h(aSeed) * 6.2832;
        vec3 p = position + vec3(cos(a), 0.0, sin(a)) * (1.0 + life * 16.0) + vec3(0.0, -life * life * 22.0 + h(aSeed + 3.0) * 30.0, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.0, 0.1, life) * (1.0 - life);
        gl_PointSize = clamp((3.0 + life * 14.0) * uScale / -mv.z, 1.0, 220.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNight; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d) * vA * 0.32;
        gl_FragColor = vec4(mix(vec3(0.92, 0.94, 0.96), vec3(0.42, 0.47, 0.56), uNight), a);
      }`,
    transparent: true, depthWrite: false,
  });
  const points = new THREE.Points(g, mat);
  points.frustumCulled = false;
  return points;
}

function bankCentre(track, name) {
  const k = track.sectors.findIndex((s) => s.name === name);
  if (k < 0) return null;
  const end = track.sectors[k + 1]?.i ?? track.finish;
  let x = 0, z = 0, n = 0, r = 0;
  for (let i = track.sectors[k].i; i < end; i++) {
    if (track.U[i * 3 + 1] > 0.9) continue;
    x += track.H[i * 3]; z += track.H[i * 3 + 2]; n++;
  }
  if (!n) return null;
  x /= n; z /= n;
  for (let i = 0; i < track.lap; i++) r = Math.min(r || Infinity, Math.hypot(track.H[i * 3] - x, track.H[i * 3 + 2] - z) - Math.max(track.wallL[i], track.wallR[i]));
  return { x, z, r };
}

export function createLaunchComplex(world, sunUniform, fogDensity, renderer, night) {
  const { track, terrain, venue } = world;
  const group = new THREE.Group();
  const time = { value: 0 };
  const C = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
  const RED = C('#ff2a2a', 7), WHITE = C('#fff1d8', 8), AMBER = C('#ffb347', 6);
  const lights = lightPoints();
  const steel = panelMaterial('#c4c9d0', 0.3, 0.85, sunUniform, fogDensity, 'steel', 0.125);
  steel.emissive.set(night ? '#1c2230' : '#000000');
  const lattice = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.55, metalness: 0.7 });
  skyFog(lattice, sunUniform, fogDensity);
  const tile = new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.7, metalness: 0.2 });
  skyFog(tile, sunUniform, fogDensity);
  const white = panelMaterial('#e6e4de', 0.5, 0.1, sunUniform, fogDensity, 'tanks', 0.0625);
  const concrete = panelMaterial('#a39d93', 0.9, 0, sunUniform, fogDensity, 'concrete', 4);

  group.add(water(terrain, venue.terrain, waterMaterial(sunUniform, fogDensity, time)));

  const towerParts = [], steelParts = [], tileParts = [], whiteParts = [], concreteParts = [];
  let vent = null;
  {
    const k = track.sectors.findIndex((s) => s.name === 'Tower');
    const end = track.sectors[k + 1]?.i ?? track.finish;
    let crest = track.sectors[k].i, top = -Infinity;
    for (let i = track.sectors[k].i; i < end; i++) if (track.P[i * 3 + 1] > top) { top = track.P[i * 3 + 1]; crest = i; }
    const o = crest * 3;
    const back = new THREE.Vector3(track.R[o], 0, track.R[o + 2]).normalize();
    const side = new THREE.Vector3().crossVectors(_up, back);
    const half = 10, H = top + 26, off = Math.max(track.wallL[crest], track.wallR[crest]) + half + 14;
    const cx = track.P[o] + back.x * off, cz = track.P[o + 2] + back.z * off;
    const g0 = terrain.height(cx, cz) - 1;
    const yaw = Math.atan2(back.x, back.z);
    _q.setFromAxisAngle(_up, yaw);
    const at = new THREE.Vector3(cx, g0, cz);
    const place = (g) => g.applyQuaternion(_q).translate(at.x, at.y, at.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) towerParts.push(place(new THREE.BoxGeometry(2.4, H, 2.4).translate(sx * half, H / 2, sz * half)));
    const bay = 12, diag = Math.hypot(half * 2, bay), ang = Math.atan2(bay, half * 2);
    for (let y = bay; y < H; y += bay) {
      for (const sz of [-1, 1]) towerParts.push(place(new THREE.BoxGeometry(half * 2, 0.9, 0.9).translate(0, y, sz * half)));
      for (const sx of [-1, 1]) towerParts.push(place(new THREE.BoxGeometry(0.9, 0.9, half * 2).translate(sx * half, y, 0)));
      for (const sx of [-1, 1]) towerParts.push(place(new THREE.BoxGeometry(0.5, 0.5, diag).rotateX((y / bay) % 2 ? ang : -ang).translate(sx * half, y - bay / 2, 0)));
      towerParts.push(place(new THREE.BoxGeometry(diag, 0.5, 0.5).rotateZ((y / bay) % 2 ? ang : -ang).translate(0, y - bay / 2, half)));
      if ((y / bay) % 3 === 0) lights.add(at.x + side.x * (half + 1.4), g0 + y, at.z + side.z * (half + 1.4), RED, 1.1, ((y / bay) % 6) / 6);
    }
    towerParts.push(place(new THREE.BoxGeometry(half * 2 + 4, 6, half * 2 + 4).translate(0, H + 3, 0)));
    towerParts.push(place(new THREE.BoxGeometry(1.2, 22, 1.2).translate(0, H + 17, 0)));
    lights.add(at.x, g0 + H + 28.5, at.z, RED, 2.2, 0.5);
    const armY = H - 34;
    for (const s of [-1, 1]) {
      towerParts.push(place(new THREE.BoxGeometry(46, 3.2, 2.4).translate(half + 23, armY, s * 7)));
      towerParts.push(place(new THREE.BoxGeometry(3, 8, 3).translate(half + 1.5, armY, s * 7)));
    }
    towerParts.push(place(new THREE.BoxGeometry(5, 5, half * 2 + 6).translate(half + 2.5, armY + 4, 0)));
    for (let k2 = 0; k2 < 3; k2++) lights.add(at.x + side.x * (half + 46), g0 + armY + 2.4, at.z + side.z * (half + 46) + (k2 - 1) * 7 * back.z, AMBER, 1.2);

    const rx = at.x + side.x * (half + 34), rz = at.z + side.z * (half + 34);
    const rg = terrain.height(rx, rz) - 0.5;
    const mount = 20, R = 4.6, booster = 70, ship = 38;
    for (let k2 = 0; k2 < 6; k2++) {
      const a = (k2 / 6) * Math.PI * 2;
      concreteParts.push(new THREE.BoxGeometry(3, mount, 3).translate(rx + Math.cos(a) * 11, rg + mount / 2, rz + Math.sin(a) * 11));
    }
    concreteParts.push(new THREE.CylinderGeometry(14, 14, 3, 32, 1).translate(rx, rg + mount + 1.5, rz));
    concreteParts.push(new THREE.CylinderGeometry(9, 9, 2.5, 32, 1, true).translate(rx, rg + mount - 1.25, rz));
    const b0 = rg + mount + 3;
    steelParts.push(new THREE.CylinderGeometry(R, R, booster, 40, 1).translate(rx, b0 + booster / 2, rz));
    steelParts.push(new THREE.CylinderGeometry(R, R, ship, 40, 1).translate(rx, b0 + booster + 1.2 + ship / 2, rz));
    steelParts.push(new THREE.CylinderGeometry(0.4, R, 16, 40, 1).translate(rx, b0 + booster + 1.2 + ship + 8, rz));
    tileParts.push(new THREE.CylinderGeometry(R + 0.06, R + 0.06, ship - 1, 40, 1, true, -Math.PI / 2 + yaw, Math.PI).translate(rx, b0 + booster + 1.2 + ship / 2, rz));
    tileParts.push(new THREE.CylinderGeometry(R - 0.1, R - 0.1, 1.2, 40, 1).translate(rx, b0 + booster + 0.6, rz));
    for (let k2 = 0; k2 < 4; k2++) {
      const a = (k2 / 4) * Math.PI * 2 + Math.PI / 4;
      tileParts.push(new THREE.BoxGeometry(0.4, 4.2, 4.2).rotateY(-a).translate(rx + Math.cos(a) * (R + 2.2), b0 + booster - 5, rz + Math.sin(a) * (R + 2.2)));
    }
    for (const [s, h] of [[1, 6], [-1, 30]]) for (const d of [-1, 1]) {
      const a = yaw + (d > 0 ? 0 : Math.PI) + Math.PI / 2;
      tileParts.push(new THREE.BoxGeometry(0.5, h > 10 ? 9 : 6, 3.6).rotateY(-a).translate(rx + Math.cos(a) * (R + 1.6), b0 + booster + 1.2 + (s > 0 ? 6 : ship - 9), rz + Math.sin(a) * (R + 1.6)));
    }
    for (let k2 = 0; k2 < 8; k2++) {
      const a = (k2 / 8) * Math.PI * 2;
      lights.add(rx + Math.cos(a) * 16, rg + 1.2, rz + Math.sin(a) * 16, WHITE, 1.4);
    }
    vent = vapor();
    vent.position.set(rx, b0 + 4, rz);
    group.add(vent);
  }

  {
    const big = bankCentre(track, 'Tank Farm');
    const sites = [];
    const clear = (x, z, r) => {
      for (let i = 0; i < track.n; i += 3) {
        const dx = track.H[i * 3] - x, dz = track.H[i * 3 + 2] - z;
        if (dx * dx + dz * dz < (r + Math.max(track.wallL[i], track.wallR[i]) + 8) ** 2) return false;
      }
      return Math.hypot(x - big.x, z - big.z) > r + 46;
    };
    if (big) {
      const R0 = Math.min(40, big.r - 12), y0 = terrain.height(big.x, big.z) + R0 + 6;
      whiteParts.push(new THREE.SphereGeometry(R0, 48, 32).translate(big.x, y0, big.z));
      for (let k2 = 0; k2 < 10; k2++) {
        const a = (k2 / 10) * Math.PI * 2;
        whiteParts.push(new THREE.CylinderGeometry(1.1, 1.1, y0 - 4, 10).translate(big.x + Math.cos(a) * R0 * 0.8, (y0 - 4) / 2 + terrain.height(big.x, big.z), big.z + Math.sin(a) * R0 * 0.8));
      }
      lights.add(big.x, y0 + R0 + 0.5, big.z, RED, 1.6, 0.25);
      const k = track.sectors.findIndex((s) => s.name === 'Tank Farm');
      const from = track.sectors[k].i, to = track.sectors[k + 1]?.i ?? track.finish;
      for (let i = from - 200; i < to + 100; i += 45) {
        if (track.U[i * 3 + 1] < 0.97) continue;
        for (const s of [-1, 1]) {
          const r = 9 + ((i * 7) % 5);
          const off = Math.max(track.wallL[i], track.wallR[i]) + r + 16;
          const x = track.H[i * 3] + track.R[i * 3] * off * s, z = track.H[i * 3 + 2] + track.R[i * 3 + 2] * off * s;
          if (!clear(x, z, r) || sites.some(([a, b, c]) => Math.hypot(a - x, b - z) < c + r + 4)) continue;
          sites.push([x, z, r]);
          const y = terrain.height(x, z) + r + 3;
          whiteParts.push(new THREE.SphereGeometry(r, 32, 20).translate(x, y, z));
          for (let k2 = 0; k2 < 6; k2++) {
            const a = (k2 / 6) * Math.PI * 2;
            whiteParts.push(new THREE.CylinderGeometry(0.5, 0.5, y - 2, 8).translate(x + Math.cos(a) * r * 0.75, (y - 2) / 2 + terrain.height(x, z), z + Math.sin(a) * r * 0.75));
          }
          lights.add(x, y + r + 0.3, z, RED, 1.0, (i % 7) / 7);
        }
      }
    }
  }

  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 1.8, 0.4), toneMapped: false });
  const flames = [];
  for (const [a, b] of roofRuns(track)) {
    const ka = a * 3, kb = b * 3;
    const ax = track.P[ka], az = track.P[ka + 2], bx = track.P[kb], bz = track.P[kb + 2];
    const len = Math.hypot(bx - ax, bz - az) + 10;
    const w = Math.max(track.wallL[a], track.wallR[a]) + 3;
    const base = Math.min(track.P[ka + 1], track.P[kb + 1]) - 1.2;
    _q.setFromAxisAngle(_up, Math.atan2(bx - ax, bz - az));
    const at = new THREE.Vector3((ax + bx) / 2, base, (az + bz) / 2);
    const place = (g) => g.applyQuaternion(_q).translate(at.x, at.y, at.z);
    for (const s of [-1, 1]) {
      concreteParts.push(place(new THREE.BoxGeometry(3, 12, len).translate(s * (w + 1.5), 6, 0)));
      concreteParts.push(place(new THREE.BoxGeometry(14, 4, len).translate(s * (w + 10), 2, 0)));
      for (const h of [3.4, 7.2]) flames.push(place(new THREE.BoxGeometry(0.3, h > 5 ? 0.35 : 0.7, len - 4).translate(s * (w - 0.1), h, 0)));
    }
    for (let z = -len / 2; z < len / 2 - 6; z += 13) concreteParts.push(place(new THREE.BoxGeometry(w * 2 + 6, 1.6, 10).translate(0, 12.8, z + 5)));
  }

  merged(group, towerParts, lattice, true);
  merged(group, steelParts, steel, true);
  merged(group, tileParts, tile, true);
  merged(group, whiteParts, white, true);
  merged(group, concreteParts, concrete, true);
  merged(group, flames, glow, false);
  group.add(lights.build());

  return {
    group,
    update(t, camera, n) {
      time.value = t;
      const scale = renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360);
      lights.mat.uniforms.uTime.value = t;
      lights.mat.uniforms.uNight.value = n;
      lights.mat.uniforms.uScale.value = scale;
      if (vent) { vent.material.uniforms.uTime.value = t; vent.material.uniforms.uScale.value = scale; vent.material.uniforms.uNight.value = n; }
      glow.color.setRGB(6 * (0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3)), 1.8, 0.4);
    },
  };
}
