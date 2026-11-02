import * as THREE from 'three';
import { GLTFLoader } from '../../rl/vendor/three-r169/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../rl/vendor/three-r169/examples/jsm/utils/BufferGeometryUtils.js';
import { CAR } from '@rl/js/config.js';
import { createVapour } from './fx.js';

const COLD = new THREE.Color('#bfefff');

const REAR_EXIT = [0.37, 0.125, -0.125, -0.37].map((x) => ({ pos: [x, -0.1, -2.31], dir: [0, 0, -1] }));
const NOZ = [...REAR_EXIT, ...CAR.NOZZLES.down, ...CAR.NOZZLES.lateral];
const WING = { lift: 0.13, stow: -10.5, deploy: 7, brake: 26 };
const REFLECT = { medium: { size: 256 }, high: { size: 256 } };

function plumeGeometry(count) {
  const base = [], dir = [], rad = [], along = [], nid = [], idx = [];
  const seg = 12, d = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  NOZ.slice(0, count).forEach((n, k) => {
    d.fromArray(n.dir).normalize();
    a.set(0, 1, 0); if (Math.abs(d.y) > 0.9) a.set(1, 0, 0);
    a.cross(d).normalize(); b.crossVectors(d, a);
    for (const s of [0.075, 0.05, 0.025]) {
      const o = along.length;
      for (let r = 0; r <= 1; r++) for (let i = 0; i < seg; i++) {
        const t = (i / seg) * Math.PI * 2;
        base.push(...n.pos); dir.push(d.x, d.y, d.z);
        rad.push((a.x * Math.cos(t) + b.x * Math.sin(t)) * s, (a.y * Math.cos(t) + b.y * Math.sin(t)) * s, (a.z * Math.cos(t) + b.z * Math.sin(t)) * s);
        along.push(r); nid.push(k);
      }
      for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; idx.push(o + i, o + j, o + seg + i, o + j, o + seg + j, o + seg + i); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(base, 3));
  g.setAttribute('dir', new THREE.Float32BufferAttribute(dir, 3));
  g.setAttribute('rad', new THREE.Float32BufferAttribute(rad, 3));
  g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute('nid', new THREE.Float32BufferAttribute(nid, 1));
  g.setIndex(idx);
  return g;
}

function createPlume(lite) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPow: { value: new Float32Array(NOZ.length) }, uLen: { value: new Float32Array(NOZ.length) }, uBoost: { value: 0 }, uTime: { value: 0 }, uColor: { value: COLD } },
    vertexShader: /* glsl */ `
      attribute vec3 dir; attribute vec3 rad; attribute float along; attribute float nid;
      uniform float uPow[${NOZ.length}]; uniform float uLen[${NOZ.length}];
      varying float vT; varying float vP; varying float vN;
      void main() {
        int k = int(nid + 0.5);
        float len = uLen[k];
        vT = along; vP = uPow[k]; vN = nid;
        vec3 p = position + dir * along * len + rad * (1.0 + along * (k < 4 ? 1.4 : 2.4));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uBoost; uniform float uTime; uniform vec3 uColor; varying float vT; varying float vP; varying float vN;
      void main() {
        if (vP < 0.01) discard;
        float rear = step(vN, 3.5);
        float fade = pow(1.0 - clamp(vT, 0.0, 1.0), 1.6 + 1.4 * rear);
        float flick = 0.85 + 0.15 * sin(uTime * 90.0 + vN * 7.0);
        vec3 c = mix(uColor, vec3(1.0, 0.7, 0.95), uBoost * 0.35 * rear) * fade * flick * vP * (0.55 - 0.4 * rear);
        gl_FragColor = vec4(c, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(plumeGeometry(lite ? 4 : NOZ.length), mat);
  if (lite) mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.1, -3), 1.8);
  else mesh.frustumCulled = false;
  return mesh;
}

const models = {};

export async function loadCar() {
  const loader = new GLTFLoader();
  const [hi, lo] = await Promise.all(['roadster', 'roadster_lod1'].map((n) => loader.loadAsync(new URL(`../../assets/models/car/${n}.glb`, import.meta.url).href)));
  models.hi = hi.scene; models.lo = lo.scene;
  models.lite = liteModel(hi.scene, (n) => NEAR[n] || n);
  models.liteFar = liteModel(lo.scene, (n) => (KEEP.has(n) ? n : 'black'));
}

const WHEELS = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'];
const TYRE = new Set(['tire', 'tire_text', 'brake']);
const RIM = new Set(['rim', 'spoke', 'gunmetal']);
const KEEP = new Set(['paint', 'glass', 'light_front', 'light_tail']);
const NEAR = { liner: 'black', throat: 'black', lens: 'black', amber: 'black', trim: 'black', gap: 'black', gloss: 'black', carbon: 'black', lip: 'black', plate: 'black', reflector: 'black' };
const CASTS = new Set(['paint', 'gloss', 'black', 'carbon', 'tire']);

function bake(root, bucket) {
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), parts = {};
  root.traverse((o) => {
    if (!o.isMesh || o.name.endsWith('_caliper')) return;
    const g = o.geometry, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(m);
    const P = new Float32Array(g.attributes.position.count * 3), N = new Float32Array(P.length), v = new THREE.Vector3();
    for (let i = 0; i < g.attributes.position.count; i++) {
      v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(m).toArray(P, i * 3);
      v.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize().toArray(N, i * 3);
    }
    const flat = new THREE.BufferGeometry();
    flat.setAttribute('position', new THREE.BufferAttribute(P, 3));
    flat.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    flat.setIndex(new THREE.BufferAttribute(Uint32Array.from(g.index.array), 1));
    const key = bucket(o.material.name);
    const part = (parts[key] ||= { material: o.material, list: [] });
    if (o.material.name === key) part.material = o.material;
    part.list.push(flat);
  });
  return Object.entries(parts).map(([key, { material, list }]) => { const m = new THREE.Mesh(mergeGeometries(list), material); m.name = key; return m; });
}

function liteModel(src, bucket) {
  src.updateMatrixWorld(true);
  const out = new THREE.Group();
  for (const child of src.children) {
    if (child.name === 'wing') continue;
    if (WHEELS.includes(child.name)) {
      const wheel = new THREE.Group();
      wheel.name = child.name;
      wheel.position.copy(child.position);
      for (const m of bake(child, (n) => (RIM.has(n) ? 'rim' : 'tire'))) wheel.add(m);
      out.add(wheel);
    }
  }
  const chassisRoot = new THREE.Group();
  for (const child of src.children) if (!WHEELS.includes(child.name) && child.name !== 'wing') chassisRoot.add(child.clone(true));
  chassisRoot.updateMatrixWorld(true);
  for (const m of bake(chassisRoot, bucket)) out.add(m);
  return out;
}

function buildModel(src, { envMap, ghost }) {
  const model = src.clone(true);
  const chassis = new THREE.Group();
  const wheels = [];
  for (const child of [...model.children]) {
    if (WHEELS.includes(child.name)) {
      const spin = new THREE.Group();
      for (const m of [...child.children]) if (!m.name.endsWith('_caliper')) spin.add(m);
      child.add(spin);
      wheels[WHEELS.indexOf(child.name)] = { steer: child, spin };
    } else chassis.add(child);
  }
  model.add(chassis);
  const holo = ghost ? new THREE.MeshBasicMaterial({ color: '#59dcff', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }) : null;
  const mats = {};
  model.traverse((o) => {
    if (!o.isMesh) return;
    if (holo) { o.material = holo; return; }
    const name = o.material.name;
    o.material = mats[name] ||= o.material.clone();
    o.material.envMap = envMap;
    o.castShadow = CASTS.has(name);
    o.receiveShadow = true;
  });
  return { model, chassis, wheels, mats };
}

function grime(m, uDust, uCar) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDust = uDust;
    sh.uniforms.uCar = uCar;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nuniform mat4 uCar;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = (uCar * modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vObj;
uniform float uDust;
float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float dustAt() { float n = vn(vObj * 6.0) * 0.6 + vn(vObj * 23.0) * 0.4;
  float low = smoothstep(0.25, -0.45, vObj.y) + smoothstep(-1.7, -2.3, vObj.z) * 0.6;
  return clamp(uDust * (low * 1.3 + 0.15) * (0.55 + n * 0.9) - 0.1, 0.0, 0.92); }`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat dust = dustAt();\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.33, 0.24), dust);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, dust);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 cell = floor(vObj * 400.0);
float fade = 1.0 - smoothstep(0.25, 0.7, length(fwidth(vObj * 400.0)));
vec3 jit = vec3(h3(cell), h3(cell + 17.0), h3(cell + 41.0)) - 0.5;
normal = normalize(normal + jit * 0.3 * step(0.72, h3(cell + 5.0)) * fade * (1.0 - dust));`)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat *= 1.0 - dust * 0.85;');
  };
}

function contactShadow() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const blob = (cx, cy, rx, ry, a) => {
    const r = g.createRadialGradient(cx, cy, 0, cx, cy, 1);
    r.addColorStop(0, `rgba(0,0,0,${a})`); r.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(cx, cy); g.scale(rx, ry); g.translate(-cx, -cy); g.fillStyle = r; g.beginPath(); g.arc(cx, cy, 1, 0, Math.PI * 2); g.fill(); g.restore();
  };
  blob(64, 128, 60, 118, 0.62);
  for (const [x, y] of [[26, 52], [102, 52], [26, 204], [102, 204]]) blob(x, y, 20, 30, 0.45);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 5.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false }));
  m.position.y = -0.585;
  m.renderOrder = 1;
  m.layers.set(4);
  return m;
}

export const PROBE_LAYER = 5;

function createProbe({ size }, holder, softbox) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.4, 3000, rt);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(softbox * 0.3, softbox * 0.3, softbox * 0.312), side: THREE.DoubleSide }));
  panel.rotation.x = Math.PI / 2;
  panel.position.set(0, 3.2, -0.2);
  panel.layers.set(2);
  holder.add(panel);
  let frame = 0, tick = 0;
  return {
    texture: rt.texture,
    update(renderer, scene, viewer, hide, indoors) {
      if (tick++ % 3) return;
      const face = frame++ % 6;
      cam.layers.set(indoors ? 0 : PROBE_LAYER);
      if (indoors) cam.layers.enable(2);
      if (!cam.coordinateSystem) { cam.coordinateSystem = renderer.coordinateSystem; cam.updateCoordinateSystem(); }
      holder.getWorldPosition(cam.position);
      cam.position.y += 0.35;
      cam.updateMatrixWorld(true);
      for (const o of hide) o.visible = false;
      viewer.visible = false;
      const target = renderer.getRenderTarget(), shadows = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt, face);
      renderer.render(scene, cam.children[face]);
      renderer.setRenderTarget(target);
      renderer.shadowMap.autoUpdate = shadows;
      viewer.visible = true;
      for (const o of hide) o.visible = true;
      if (face === 5) rt.texture.needsPMREMUpdate = true;
    },
  };
}

export function createCarView({ quality, envMap, ghost = false, headlights = false, color = null, lite = false }) {
  const { model, chassis, wheels, mats } = buildModel(lite ? models.lite : ghost || quality === 'low' ? models.lo : models.hi, { envMap, ghost });
  const holder = new THREE.Group();
  holder.add(model);
  const shadow = ghost ? null : contactShadow();
  if (shadow) holder.add(shadow);
  const far = lite ? buildModel(models.liteFar, { envMap, ghost }) : null;
  if (far) { far.model.visible = false; holder.add(far.model); }
  if (color) for (const m of [mats.paint, far?.mats.paint]) m?.color.set(color);
  const probe = !ghost && REFLECT[quality] ? createProbe(REFLECT[quality], holder, headlights ? 3 : 2) : null;
  if (probe) for (const m of Object.values(mats)) m.envMap = probe.texture;
  const wing = model.getObjectByName('wing');
  const wingBase = wing && { y: wing.position.y };
  let wingK = 0, wingBrake = 0;
  if (wing) wing.visible = false;
  let plume = null, head = null;
  const uDust = { value: 0 }, uCar = { value: new THREE.Matrix4() };
  const vapour = ghost || lite ? null : createVapour(), puff = new Float32Array(NOZ.length), vp = new THREE.Vector3(), vd = new THREE.Vector3();
  if (!ghost) {
    plume = createPlume(lite);
    holder.add(plume);
    if (mats.paint) { mats.paint.envMapIntensity = 1.2; mats.paint.clearcoatRoughness = Math.max(mats.paint.clearcoatRoughness, 0.06); if (!lite) grime(mats.paint, uDust, uCar); }
    if (mats.glass) { mats.glass.envMapIntensity = 2.2; mats.glass.roughness = 0.04; mats.glass.metalness = 0; mats.glass.color.set('#07090c'); }
    if (headlights) {
      const key = new THREE.SpotLight('#dfe6ff', 90, 22, 0.6, 0.8, 1.6);
      key.position.set(1.2, 5.5, -2.5);
      key.target.position.set(0, 0, 0.4);
      chassis.add(key, key.target);
      head = new THREE.SpotLight('#eef3ff', 320, 70, 0.52, 0.55, 2);
      head.position.set(0, -0.05, 2.25);
      head.target.position.set(0, -0.95, 16);
      chassis.add(head, head.target);
    }
  }
  const fire = new Float32Array(NOZ.length);
  let spin = 0, lastSpeed = 0, aLong = 0, aLat = 0, bob = 0, brakeGlow = 0;
  return {
    root: holder,
    vapour,
    reflect(renderer, scene, viewer, indoors) {
      if (mats.paint) mats.paint.envMapIntensity = indoors ? 0.3 : 1.2;
      if (mats.glass) mats.glass.envMapIntensity = indoors ? 0.4 : 2.2;
      probe?.update(renderer, scene, viewer, plume ? [model, plume] : [model], indoors);
    },
    wash() { uDust.value = 0; },
    get dust() { return uDust.value; },
    set dust(v) { uDust.value = v; },
    update(dt, c, time, dist = 0) {
      const air = c.mode === 0;
      if (c.mode === 2) uDust.value = Math.min(1, uDust.value + dt * Math.min(1, c.speed / 30) * 0.06);
      else if (air && c.air > 60) uDust.value = Math.min(1, uDust.value + dt * 0.004);
      if (far && (dist > (far.model.visible ? 55 : 60)) !== far.model.visible) {
        far.model.visible = !far.model.visible;
        model.visible = !far.model.visible;
      }
      if (shadow) shadow.visible = !air;
      const pitch = air ? c.wp / 3.8 : 0, roll = air ? c.wr / 4.6 : 0, yaw = air ? c.wy / 2.4 : 0;
      const rear = Math.min(1, c.throttle * 0.55 + (c.boosting ? 0.9 : 0));
      fire[4] = Math.max(0, pitch) * 0.6 + Math.max(0, -roll) * 0.6;
      fire[5] = Math.max(0, pitch) * 0.6 + Math.max(0, roll) * 0.6;
      fire[6] = Math.max(0, -pitch) * 0.6 + Math.max(0, -roll) * 0.6;
      fire[7] = Math.max(0, -pitch) * 0.6 + Math.max(0, roll) * 0.6;
      fire[8] = Math.max(0, -yaw) * 0.9; fire[9] = Math.max(0, yaw) * 0.9;
      if (c.lifting || c.hopT > 0.4) {
        for (let k = 4; k < 8; k++) fire[k] = 1;
        if (air) { fire[8] = Math.max(fire[8], c.steer); fire[9] = Math.max(fire[9], -c.steer); }
      }
      spin += (air ? c.speed * 0.4 : c.vf) / 0.345 * dt;
      const steer = air ? 0 : -c.steer * 0.32;
      for (let k = 0; k < 4; k++) {
        wheels[k].spin.rotation.x = spin;
        if (k < 2) wheels[k].steer.rotation.y += (steer - wheels[k].steer.rotation.y) * Math.min(1, dt * 12);
      }
      if (wing) {
        const want = Math.max(Math.min(1, Math.max(0, (c.speed - 38) / 14)), c.brake > 0.3 && c.speed > 18 ? 1 : 0);
        wingK += (want - wingK) * Math.min(1, dt * (want > wingK ? 3 : 1.6));
        wingBrake += ((c.brake > 0.3 && c.speed > 18 ? 1 : 0) - wingBrake) * Math.min(1, dt * 5);
        wing.visible = wingK > 0.02;
        wing.position.y = wingBase.y + WING.lift * wingK;
        wing.rotation.x = THREE.MathUtils.degToRad(WING.stow + (WING.deploy - WING.stow) * wingK + WING.brake * wingBrake * wingK);
      }
      if (mats.light_tail) {
        brakeGlow += ((c.brake > 0.1 ? 1 : 0) - brakeGlow) * Math.min(1, dt * 14);
        for (const m of [mats.light_tail, far?.mats.light_tail]) if (m) m.emissiveIntensity = 2.5 + 4 * brakeGlow;
      }
      if (dt > 0) {
        const k = 1 - Math.exp(-dt * 5);
        aLong += (Math.max(-40, Math.min(40, (c.speed - lastSpeed) / dt)) - aLong) * k;
        aLat += ((air ? 0 : c.yawRate) * c.speed - aLat) * k;
        lastSpeed = c.speed;
        bob += dt;
        chassis.rotation.set(
          Math.max(-0.05, Math.min(0.05, -aLong * 0.0016 + c.brake * 0.02)) + Math.sin(bob * 1.7) * 0.003,
          0,
          Math.max(-0.045, Math.min(0.045, aLat * 0.0007)) + Math.sin(bob * 1.3 + 1) * 0.004,
        );
        chassis.position.y = Math.sin(bob * 2.3) * 0.012 + (c.boosting ? Math.sin(bob * 71) * 0.005 : 0);
      }
      if (plume) {
        const u = plume.material.uniforms, P = u.uPow.value, L = u.uLen.value;
        u.uBoost.value += ((c.boosting ? 1 : 0) - u.uBoost.value) * Math.min(1, dt * 8);
        for (let k = 0; k < 4; k++) { P[k] += ((c.boosting ? 1 : 0) - P[k]) * Math.min(1, dt * 12); L[k] = 0.3 + 0.3 * rear + 0.5 * u.uBoost.value; }
        for (let k = 4; k < NOZ.length; k++) { const w = Math.min(1, fire[k]); P[k] += (w - P[k]) * Math.min(1, dt * (w > P[k] ? 30 : 10)); L[k] = 0.35 + (k < 8 ? 1.1 : 0.7) * P[k]; }
        u.uTime.value = time;
        if (lite) plume.visible = dist < 160 && (c.boosting || P[0] > 0.02);
      }
      if (!lite) { holder.updateMatrixWorld(); uCar.value.copy(chassis.matrixWorld).invert(); }
      if (vapour && plume) {
        const P = plume.material.uniforms.uPow.value;
        for (let k = 0; k < NOZ.length; k++) {
          puff[k] = P[k] > 0.05 ? puff[k] + dt * P[k] * (k < 4 ? 110 : 70) : 0;
          while (puff[k] >= 1) {
            puff[k]--;
            vp.fromArray(NOZ[k].pos).applyMatrix4(holder.matrixWorld);
            vd.fromArray(NOZ[k].dir).transformDirection(holder.matrixWorld).multiplyScalar((k < 4 ? 16 : 11) * (0.7 + Math.random() * 0.6));
            vapour.emit(vp.x, vp.y, vp.z, vd.x + c.vx + (Math.random() - 0.5) * 2, vd.y + c.vy + (Math.random() - 0.5) * 2, vd.z + c.vz + (Math.random() - 0.5) * 2, time);
          }
        }
      }
    },
  };
}
