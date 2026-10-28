import * as THREE from 'three';

export function createDust(height, count = 600) {
  const p0 = new Float32Array(count * 3), vel = new Float32Array(count * 3), born = new Float32Array(count).fill(-99), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p0, 3));
  geo.setAttribute('vel', new THREE.BufferAttribute(vel, 3));
  geo.setAttribute('born', new THREE.BufferAttribute(born, 1));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  for (const a of ['position', 'vel', 'born']) geo.attributes[a].setUsage(THREE.DynamicDrawUsage);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uSun: { value: new THREE.Color('#ffc09a') }, uAmb: { value: new THREE.Color('#5d5a78') } },
    vertexShader: /* glsl */ `
      attribute vec3 vel; attribute float born; attribute float seed;
      uniform float uTime; uniform float uScale; varying float vA; varying float vS;
      void main() {
        float t = uTime - born;
        float life = 1.4 + seed * 1.2;
        vA = t < 0.0 || t > life ? 0.0 : smoothstep(0.0, 0.12, t) * (1.0 - t / life);
        float drag = (1.0 - exp(-t * 1.8)) / 1.8;
        vec3 p = position + vel * drag + vec3(0.0, t * t * 0.6 * (0.5 + seed), 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vS = seed;
        gl_PointSize = (1.2 + t * 4.0) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform vec3 uAmb; varying float vA; varying float vS;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = dot(q, q) * 4.0;
        if (d > 1.0 || vA <= 0.0) discard;
        float a = (1.0 - d) * (1.0 - d) * vA * 0.22;
        vec3 c = mix(uAmb, uSun, 0.35 + 0.4 * vS) * vec3(0.95, 0.78, 0.62);
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let next = 0, acc = 0;
  return {
    points,
    update(time, dt, p, c, pixelScale) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uScale.value = pixelScale;
      const k = (c.mode === 2 ? Math.min(1, c.speed / 25) : 0) * Math.max(0, 1 - (p.y - height(p.x, p.z)) / 9);
      acc += dt * k * (40 + c.speed * 2.2);
      let n = Math.min(60, Math.floor(acc));
      acc -= n;
      if (!n) return;
      const g = height(p.x, p.z);
      let lo = next, cnt = 0;
      while (n-- > 0) {
        const i = next;
        next = (next + 1) % count;
        const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 1.8;
        p0[i * 3] = p.x + Math.cos(a) * r - c.vx * 0.02; p0[i * 3 + 1] = g + 0.2; p0[i * 3 + 2] = p.z + Math.sin(a) * r - c.vz * 0.02;
        const out = 5 + Math.random() * 7;
        vel[i * 3] = Math.cos(a) * out + c.vx * 0.25; vel[i * 3 + 1] = 1 + Math.random() * 3; vel[i * 3 + 2] = Math.sin(a) * out + c.vz * 0.25;
        born[i] = time;
        cnt++;
      }
      for (const name of ['position', 'vel', 'born']) {
        const at = geo.attributes[name];
        at.clearUpdateRanges();
        const w = name === 'born' ? 1 : 3;
        if (lo + cnt <= count) at.addUpdateRange(lo * w, cnt * w);
        else { at.addUpdateRange(lo * w, (count - lo) * w); at.addUpdateRange(0, (lo + cnt - count) * w); }
        at.needsUpdate = true;
      }
    },
  };
}

export function createFireworks(shells = 8, per = 180) {
  const n = shells * per;
  const dir = new Float32Array(n * 3), shell = new Float32Array(n), seed = new Float32Array(n);
  for (let s = 0, k = 0; s < shells; s++) for (let i = 0; i < per; i++, k++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const sp = 0.8 + Math.random() * 0.2;
    dir[k * 3] = r * Math.cos(a) * sp; dir[k * 3 + 1] = u * sp; dir[k * 3 + 2] = r * Math.sin(a) * sp;
    shell[k] = s; seed[k] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aShell', new THREE.BufferAttribute(shell, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const origins = Array.from({ length: shells }, () => new THREE.Vector4(0, -1e4, 0, -100));
  const colors = Array.from({ length: shells }, () => new THREE.Color());
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOrigin: { value: origins }, uColor: { value: colors }, uScale: { value: 600 } },
    vertexShader: /* glsl */ `
      attribute float aShell; attribute float aSeed;
      uniform float uTime; uniform vec4 uOrigin[${shells}]; uniform vec3 uColor[${shells}]; uniform float uScale;
      varying vec3 vC; varying float vA;
      void main() {
        int s = int(aShell + 0.5);
        vec4 o = uOrigin[s];
        float t = uTime - o.w;
        float life = 2.2 + aSeed * 0.8;
        vA = t < 0.0 || t > life ? 0.0 : pow(1.0 - t / life, 1.5) * (0.6 + 0.4 * sin(t * 30.0 + aSeed * 50.0));
        float v = 22.0;
        float k = (1.0 - exp(-t * 1.6)) / 1.6;
        vec3 p = o.xyz + position * v * k + vec3(0.0, -4.0 * t * t, 0.0);
        vC = mix(vec3(1.0, 0.95, 0.85), uColor[s], smoothstep(0.0, 0.35, t)) * 4.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = vA > 0.0 ? clamp(uScale * 0.5 / -mv.z, 1.5, 6.0) : 0.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5 || vA <= 0.0) discard;
        gl_FragColor = vec4(vC * vA * smoothstep(0.5, 0.0, d), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const PALETTE = ['#ff2a3c', '#ffffff', '#7fe3ff', '#ffd23f', '#b45cff'];
  let next = 0, time = 0;
  const queue = [];
  return {
    points,
    show(at, count = 6, spread = 40) {
      for (let i = 0; i < count; i++) queue.push({ t: time + i * 0.22 + Math.random() * 0.15, x: at.x + (Math.random() - 0.5) * spread, y: at.y + 16 + Math.random() * 14, z: at.z + (Math.random() - 0.5) * spread });
    },
    update(t, scale) {
      time = t;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uScale.value = scale;
      for (let i = queue.length - 1; i >= 0; i--) {
        const q = queue[i];
        if (q.t > t) continue;
        origins[next].set(q.x, q.y, q.z, t);
        colors[next].set(PALETTE[(Math.random() * PALETTE.length) | 0]);
        next = (next + 1) % shells;
        queue.splice(i, 1);
      }
    },
  };
}
