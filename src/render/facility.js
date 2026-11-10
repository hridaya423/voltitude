import * as THREE from 'three';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { panelMaterial, makeLabel, mastSites } from './road.js';
import { skyFog, skyUniforms, UNIT_LUX, FLOOD_RGB } from './sky.js';

const MOUNT = 22, LUMENS = 2.2e6, BEAM_N = 5, HAZE = 1.5e-3, CELL = 2, REACH = 170;
const PEAK_CD = LUMENS * (BEAM_N + 1) / (2 * Math.PI);
const _m = new THREE.Matrix4(), _l = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

function glassMaterial(sunUniform, fogDensity) {
  const m = new THREE.MeshStandardMaterial({ color: '#0d1016', roughness: 0.08, metalness: 0.9, envMapIntensity: 1.6, emissive: '#ffcf9a', emissiveIntensity: 0.0 });
  skyFog(m, sunUniform, fogDensity);
  return m;
}

function ledTexture() {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 96, 64);
  g.fillStyle = '#fff';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) { g.beginPath(); g.arc(8 + x * 16, 8 + y * 16, 5.5, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

function ledMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: { tDots: { value: map }, uRadiance: { value: new THREE.Vector3(...FLOOD_RGB).multiplyScalar(PEAK_CD / (0.92 * 0.6 * 8 * 0.37) / UNIT_LUX.night) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vAxis; varying vec3 vView;
      void main() {
        mat4 w = modelMatrix * instanceMatrix;
        vec4 wp = w * vec4(position, 1.0);
        vUv = uv; vAxis = normalize(mat3(w) * vec3(0.0, 0.0, 1.0)); vView = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDots; uniform vec3 uRadiance;
      varying vec2 vUv; varying vec3 vAxis; varying vec3 vView;
      void main() {
        float c = max(dot(normalize(vView), vAxis), 0.0);
        float dots = texture2D(tDots, vUv).r;
        gl_FragColor = vec4(uRadiance * (pow(c, ${BEAM_N.toFixed(1)}) + 0.004) * (dots + 0.002), 1.0);
      }`,
  });
}

function shaftMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: HAZE * PEAK_CD * Math.tan(0.62) / (4 * Math.PI) / UNIT_LUX.night } },
    vertexShader: /* glsl */ `
      attribute float aDist;
      varying float vDist; varying vec3 vNormal; varying vec3 vView;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDist = aDist; vNormal = normalize(mat3(modelMatrix) * normal); vView = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uScale;
      varying float vDist; varying vec3 vNormal; varying vec3 vView;
      void main() {
        float cam = length(vView);
        float edge = abs(dot(vView / cam, vNormal));
        float fade = smoothstep(0.0, 4.0, cam) * smoothstep(0.0, 1.5, vDist) * exp(-cam * 0.0006);
        gl_FragColor = vec4(vec3(${FLOOD_RGB.map((c) => c.toFixed(2)).join(', ')}) * uScale * edge * edge * fade / max(vDist, 1.0), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function floodMap(fixtures) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const f of fixtures) { x0 = Math.min(x0, f.p.x); z0 = Math.min(z0, f.p.z); x1 = Math.max(x1, f.p.x); z1 = Math.max(z1, f.p.z); }
  x0 -= REACH; z0 -= REACH;
  const w = Math.ceil((x1 + REACH - x0) / CELL), h = Math.ceil((z1 + REACH - z0) / CELL);
  const data = new Float32Array(w * h * 4);
  for (const { p, axis, ground } of fixtures) {
    const cx = Math.floor((p.x - x0) / CELL), cz = Math.floor((p.z - z0) / CELL), r = REACH / CELL;
    for (let iz = Math.max(0, cz - r); iz < Math.min(h, cz + r); iz++) for (let ix = Math.max(0, cx - r); ix < Math.min(w, cx + r); ix++) {
      const vx = p.x - (x0 + (ix + 0.5) * CELL), vy = p.y - ground, vz = p.z - (z0 + (iz + 0.5) * CELL);
      const d2 = vx * vx + vy * vy + vz * vz, d = Math.sqrt(d2);
      const c = -(vx * axis.x + vy * axis.y + vz * axis.z) / d;
      if (c <= 0) continue;
      const e = PEAK_CD * c ** BEAM_N / d2 / UNIT_LUX.night, k = (iz * w + ix) * 4;
      data[k] += e * vx / d; data[k + 1] += e * vy / d; data[k + 2] += e * vz / d; data[k + 3] += e;
    }
  }
  const half = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(data[i]);
  const tex = new THREE.DataTexture(half, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  skyUniforms.tFlood.value = tex;
  skyUniforms.uFloodBox.value.set(x0, z0, 1 / (w * CELL), 1 / (h * CELL));
  const v = new THREE.Vector3();
  return (light, at) => {
    light.userData.base ??= { intensity: light.intensity, color: light.color.clone() };
    if (!at) { light.intensity = light.userData.base.intensity; light.color.copy(light.userData.base.color); return; }
    const fx = (at.x - x0) / CELL - 0.5, fz = (at.z - z0) / CELL - 0.5;
    const ix = Math.min(w - 2, Math.max(0, Math.floor(fx))), iz = Math.min(h - 2, Math.max(0, Math.floor(fz))), tx = fx - ix, tz = fz - iz;
    v.set(0, 0, 0);
    for (const [dx, dz, wt] of [[0, 0, (1 - tx) * (1 - tz)], [1, 0, tx * (1 - tz)], [0, 1, (1 - tx) * tz], [1, 1, tx * tz]]) {
      const k = ((iz + dz) * w + ix + dx) * 4;
      v.x += data[k] * wt; v.y += data[k + 1] * wt; v.z += data[k + 2] * wt;
    }
    light.intensity = v.length();
    light.color.setRGB(...FLOOD_RGB);
    if (light.intensity > 1e-6) light.position.copy(at).addScaledVector(v.normalize(), 200);
    light.target.position.copy(at);
  };
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

  const poles = [], heads = [];
  for (const m of mastSites(world)) {
    if (track.roof[m.i]) continue;
    poles.push([m.x, m.g, m.z, m.y + MOUNT - 1.4 - m.g]);
    heads.push({ x: m.x, y: m.y + MOUNT, z: m.z, yaw: m.yaw, pitch: Math.atan2(MOUNT, m.off), ground: m.y });
  }
  const banked = (i) => i < track.lap && track.U[i * 3 + 1] < 0.9 && track.U[i * 3 + 1] > 0.3 && !track.roof[i] && Math.abs(track.curv[i]) > 0.004;
  for (let a = 0; night && a < track.lap; a++) {
    if (!banked(a)) continue;
    let b = a;
    while (banked(b + 1)) b++;
    if (b - a > 40) {
      let cx = 0, cz = 0;
      for (let i = a; i <= b; i++) { const o = i * 3, r = 1 / Math.abs(track.curv[i]), side = Math.sign(track.U[o] * track.R[o] + track.U[o + 2] * track.R[o + 2]); cx += track.P[o] + track.R[o] * side * r; cz += track.P[o + 2] + track.R[o + 2] * side * r; }
      cx /= b - a + 1; cz /= b - a + 1;
      const g = terrain.height(cx, cz);
      for (const f of [0.2, 0.5, 0.8]) {
        const o = Math.round(a + (b - a) * f) * 3, dx = track.P[o] - cx, dz = track.P[o + 2] - cz, d = Math.hypot(dx, dz);
        const x = cx + dx / d * 6, z = cz + dz / d * 6;
        poles.push([x, g, z, MOUNT - 1.4]);
        heads.push({ x, y: g + MOUNT, z, yaw: Math.atan2(dx, dz), pitch: Math.atan2(MOUNT, d * 0.5), ground: g });
      }
    }
    a = b;
  }
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.38, 1, 10).translate(0, 0.5, 0), white, poles.length);
  poles.forEach(([x, y, z, h], k) => { _m.compose(_p.set(x, y, z), _q.identity(), _s.set(1, h, 1)); pole.setMatrixAt(k, _m); });
  const headGeo = mergeGeometries([new THREE.BoxGeometry(4.3, 1.5, 0.3).translate(0, 0, -0.05), new THREE.BoxGeometry(4.5, 0.12, 0.5).translate(0, 0.78, 0.05), new THREE.BoxGeometry(0.3, 2.4, 0.3).translate(0, -0.6, -0.35)]);
  const head = new THREE.InstancedMesh(headGeo, dark, heads.length);
  const dots = ledTexture();
  const ledMat = night ? ledMaterial(dots) : new THREE.MeshStandardMaterial({ color: '#9aa0a8', map: dots, roughness: 0.25, metalness: 0.6 });
  if (!night) skyFog(ledMat, sunUniform, fogDensity);
  const led = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.92, 0.6), ledMat, heads.length * 8);
  const fixtures = [], shafts = [];
  heads.forEach(({ x, y, z, yaw, pitch, ground }, k) => {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ')), _s.set(1, 1, 1));
    head.setMatrixAt(k, _m);
    for (let j = 0; j < 8; j++) led.setMatrixAt(k * 8 + j, _l.makeTranslation(((j % 4) - 1.5) * 1.02, (j < 4 ? 0.34 : -0.34), 0.11).premultiply(_m));
    const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(_q);
    fixtures.push({ p: new THREE.Vector3(x, y, z), axis, ground });
    const len = (y - ground) / Math.max(0.2, -axis.y);
    shafts.push(new THREE.CylinderGeometry(1, 1 + len * Math.tan(0.62), len, 20, 1, true).translate(0, -len / 2, 0).rotateX(-Math.PI / 2).scale(1.9, 0.65, 1).applyMatrix4(_l.makeRotationFromQuaternion(_q)).translate(x, y, z));
  });
  for (const m of [pole, head]) { m.castShadow = true; m.frustumCulled = false; }
  led.frustumCulled = false;
  group.add(pole, head, led);
  const floodLight = night && fixtures.length ? floodMap(fixtures) : () => {};
  if (night && shafts.length) {
    shafts.forEach((g, k) => {
      const p = g.attributes.position, d = new Float32Array(p.count), f = fixtures[k].p;
      for (let i = 0; i < p.count; i++) d[i] = Math.hypot(p.getX(i) - f.x, p.getY(i) - f.y, p.getZ(i) - f.z);
      g.setAttribute('aDist', new THREE.BufferAttribute(d, 1));
      g.deleteAttribute('uv');
    });
    const shaft = new THREE.Mesh(mergeGeometries(shafts), shaftMaterial());
    shaft.frustumCulled = false;
    shaft.renderOrder = 50;
    group.add(shaft);
  }

  const sx = 62, sz0 = -640;
  const base = (x, z, w, d) => {
    let lo = Infinity;
    for (const a of [-0.5, 0.5]) for (const b of [-0.5, 0.5]) lo = Math.min(lo, terrain.height(x + a * w, z + b * d));
    return lo;
  };
  const whites = [], darks = [], glasses = [], glows = [];
  const box = (list, w, h, d, x, y, z) => list.push(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  const clear = (x, z, w, d) => {
    for (let i = 0; i < track.lap; i++) {
      const k = i * 3, dx = Math.max(Math.abs(track.P[k] - x) - w / 2, 0), dz = Math.max(Math.abs(track.P[k + 2] - z) - d / 2, 0);
      if (Math.hypot(dx, dz) < Math.max(track.wallL[i], track.wallR[i]) + 4) return false;
    }
    return true;
  };
  if (clear(sx + 20, sz0 + 120, 34, 116)) {
    const x = sx + 22, z = sz0 + 120, y = base(x, z, 34, 110) - 0.5;
    box(whites, 30, 2, 110, x, y, z);
    box(glasses, 26, 5, 106, x, y + 2, z);
    box(whites, 34, 1.2, 116, x - 2, y + 7, z);
    box(glows, 0.2, 0.25, 104, x - 13.1, y + 6.6, z);
    box(darks, 2, 0.6, 116, x - 18, y + 7.8, z);
    for (let k = -2; k <= 2; k++) box(whites, 1.2, 7, 1.2, x - 14, y, z + k * 24);
  }
  if (clear(sx + 70, sz0 + 40, 58, 66)) {
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
    floodLight,
    update(time) { red.color.setRGB(Math.sin(time * 3) > 0.6 ? 6 : 0.2, 0.2, 0.25); },
  };
}
