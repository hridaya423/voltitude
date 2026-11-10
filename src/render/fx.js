import * as THREE from 'three';

function mark(geo, names, lo, cnt, count) {
  for (const name of names) {
    const at = geo.attributes[name], w = at.itemSize;
    at.clearUpdateRanges();
    if (lo + cnt <= count) at.addUpdateRange(lo * w, cnt * w);
    else { at.addUpdateRange(lo * w, (count - lo) * w); at.addUpdateRange(0, (lo + cnt - count) * w); }
    at.needsUpdate = true;
  }
}

const CLEAR = /* glsl */ `
  uniform vec3 uCar;
  float clearView(vec3 mv, float r) {
    vec3 car = (viewMatrix * vec4(uCar, 1.0)).xyz;
    float off = length(mv.xy / -mv.z - car.xy / -car.z), body = 2.4 / -car.z, puff = r / -mv.z;
    return smoothstep(1.5, 7.0, -mv.z) * mix(1.0, smoothstep(body + 0.4 * puff, body + puff, off), smoothstep(1.0, 4.0, mv.z - car.z));
  }`;

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
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uSun: { value: new THREE.Color('#ffc09a') }, uAmb: { value: new THREE.Color('#5d5a78') }, uCar: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `
      attribute vec3 vel; attribute float born; attribute float seed;
      uniform float uTime; uniform float uScale; varying float vA; varying float vS;${CLEAR}
      void main() {
        float t = uTime - born;
        float life = 1.4 + seed * 1.2;
        vA = t < 0.0 || t > life ? 0.0 : smoothstep(0.0, 0.12, t) * (1.0 - t / life);
        float drag = (1.0 - exp(-t * 1.8)) / 1.8;
        vec3 p = position + vel * drag + vec3(0.0, t * t * 0.6 * (0.5 + seed), 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vS = seed;
        vA *= clearView(mv.xyz, 0.6 + t * 2.0);
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
      mat.uniforms.uCar.value.copy(p);
      const gap = p.y - height(p.x, p.z);
      const k = (c.mode === 2 ? Math.min(1, c.speed / 25) : 0) * Math.max(0, 1 - gap / 9);
      const wash = c.lifting || c.hopT > 0.4 ? Math.max(0, 1 - (gap - 0.6) / 1.5) : 0;
      acc += dt * (k * (40 + c.speed * 2.2) + wash * 160);
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
      mark(geo, ['position', 'vel', 'born'], lo, cnt, count);
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

export function createVapour(count = 768) {
  const p0 = new Float32Array(count * 3), vel = new Float32Array(count * 3), born = new Float32Array(count).fill(-99), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p0, 3));
  geo.setAttribute('vel', new THREE.BufferAttribute(vel, 3));
  geo.setAttribute('born', new THREE.BufferAttribute(born, 1));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  for (const a of ['position', 'vel', 'born']) geo.attributes[a].setUsage(THREE.DynamicDrawUsage);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uSun: { value: new THREE.Color('#fff1e0') }, uAmb: { value: new THREE.Color('#7d8496') } },
    vertexShader: /* glsl */ `
      attribute vec3 vel; attribute float born; attribute float seed;
      uniform float uTime; uniform float uScale; varying float vA; varying float vS; varying float vT;
      void main() {
        float t = uTime - born;
        float life = 0.45 + seed * 0.5;
        vT = t / life;
        vA = t < 0.0 || t > life ? 0.0 : smoothstep(0.0, 0.05, t) * pow(1.0 - t / life, 1.5);
        float drag = (1.0 - exp(-t * 6.0)) / 6.0;
        vec3 p = position + vel * drag + vec3(0.0, t * t * 0.4, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vS = seed;
        float size = seed > 0.93 ? 0.05 : 0.12 + t * 2.4;
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform vec3 uAmb; varying float vA; varying float vS; varying float vT;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = dot(q, q) * 4.0;
        if (d > 1.0 || vA <= 0.0) discard;
        if (vS > 0.93) { float s = (1.0 - d) * vA * step(vT, 0.5) * (0.6 + 0.4 * sin(vS * 900.0 + vT * 40.0)); gl_FragColor = vec4(uSun * s * 3.0, 0.0); return; }
        float a = (1.0 - d) * (1.0 - d) * vA * 0.3;
        vec3 c = mix(uAmb, uSun, 0.45 + 0.3 * vS);
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let next = 0, lo = -1, cnt = 0;
  return {
    points,
    emit(x, y, z, vx, vy, vz, time) {
      const i = next;
      next = (next + 1) % count;
      if (lo < 0) lo = i;
      cnt++;
      p0[i * 3] = x; p0[i * 3 + 1] = y; p0[i * 3 + 2] = z;
      vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
      born[i] = time;
    },
    update(time, pixelScale) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uScale.value = pixelScale;
      if (lo < 0) return;
      mark(geo, ['position', 'vel', 'born'], lo, Math.min(cnt, count), count);
      lo = -1; cnt = 0;
    },
  };
}

export function createSmoke(night, count = 2048) {
  const p0 = new Float32Array(count * 3), vel = new Float32Array(count * 3), born = new Float32Array(count).fill(-99), aux = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(p0, 3));
  geo.setAttribute('vel', new THREE.BufferAttribute(vel, 3));
  geo.setAttribute('born', new THREE.BufferAttribute(born, 1));
  geo.setAttribute('aux', new THREE.BufferAttribute(aux, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  for (const a of ['position', 'vel', 'born', 'aux']) geo.attributes[a].setUsage(THREE.DynamicDrawUsage);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uSun: { value: new THREE.Color(night ? '#5a6278' : '#fff0dc').multiplyScalar(night ? 1 : 1.5) }, uAmb: { value: new THREE.Color(night ? '#1c2030' : '#b4b9c8') }, uCar: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `
      attribute vec3 vel; attribute float born; attribute vec3 aux; attribute float seed;
      uniform float uTime; uniform float uScale; varying float vA; varying float vS; varying float vTone;${CLEAR}
      void main() {
        float t = uTime - born;
        float life = aux.z * (0.75 + 0.5 * seed);
        vA = t < 0.0 || t > life ? 0.0 : smoothstep(0.0, 0.06, t) * pow(1.0 - t / life, 1.4);
        float drag = (1.0 - exp(-t * 2.2)) / 2.2;
        vec3 p = position + vel * drag + vec3(0.0, t * t * 0.35, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vS = seed; vTone = aux.y;
        vA *= clearView(mv.xyz, 0.5 * (0.25 + aux.x * (0.12 + t)));
        gl_PointSize = vA > 0.0 ? min((0.25 + aux.x * (0.12 + t)) * uScale / -mv.z, 360.0) : 0.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun; uniform vec3 uAmb; varying float vA; varying float vS; varying float vTone;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = dot(q, q) * 4.0;
        if (d > 1.0 || vA <= 0.0) discard;
        float lit = 0.45 + 0.55 * smoothstep(0.3, -0.5, q.y + q.x * 0.4);
        vec3 base = vTone < 1.0 ? mix(vec3(0.95, 0.78, 0.6), vec3(1.0), vTone) : mix(vec3(1.0), vec3(0.16, 0.15, 0.15), vTone - 1.0);
        float a = (1.0 - d) * (1.0 - d) * vA * (vTone > 1.0 ? 0.7 : 0.45);
        vec3 c = base * mix(uAmb, uSun, lit * (0.8 + 0.2 * vS));
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let next = 0, lo = -1, cnt = 0;
  return {
    points,
    emit(x, y, z, vx, vy, vz, time, grow, tone, life) {
      const i = next;
      next = (next + 1) % count;
      if (lo < 0) lo = i;
      cnt++;
      p0[i * 3] = x; p0[i * 3 + 1] = y; p0[i * 3 + 2] = z;
      vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
      aux[i * 3] = grow; aux[i * 3 + 1] = tone; aux[i * 3 + 2] = life;
      born[i] = time;
    },
    update(time, pixelScale, car) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uScale.value = pixelScale;
      mat.uniforms.uCar.value.copy(car);
      if (lo < 0) return;
      mark(geo, ['position', 'vel', 'born', 'aux'], lo, Math.min(cnt, count), count);
      lo = -1; cnt = 0;
    },
  };
}

export function createSparks(depth, count = 1024) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0]), 3));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  const p0 = new Float32Array(count * 3), vel = new Float32Array(count * 3), born = new Float32Array(count).fill(-99), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  geo.setAttribute('p0', new THREE.InstancedBufferAttribute(p0, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('vel', new THREE.InstancedBufferAttribute(vel, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('born', new THREE.InstancedBufferAttribute(born, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 1));
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1280, 720) }, tDepth: depth },
    vertexShader: /* glsl */ `
      attribute vec3 p0; attribute vec3 vel; attribute float born; attribute float seed;
      uniform float uTime; uniform vec2 uRes; varying float vA; varying float vY;
      vec4 at(float t) { float k = (1.0 - exp(-t * 2.5)) / 2.5; return projectionMatrix * viewMatrix * vec4(p0 + vel * k + vec3(0.0, -6.0 * t * t, 0.0), 1.0); }
      void main() {
        float t = uTime - born, life = 0.25 + seed * 0.55;
        vA = t < 0.0 || t > life ? 0.0 : 1.0 - t / life;
        vec4 h = at(t), b = at(max(0.0, t - 0.05 - seed * 0.05));
        vec4 c = position.x > 0.5 ? h : b;
        vec2 d = (h.xy / h.w - b.xy / b.w) * uRes;
        float len = length(d);
        vec2 n = len > 1e-3 ? vec2(-d.y, d.x) / len : vec2(0.0, 1.0);
        c.xy += n * position.y * (1.0 + 1.3 * vA) * (position.x > 0.5 ? 1.0 : 0.35) * uRes.y / 720.0 / uRes * 2.0 * c.w;
        vY = position.y;
        gl_Position = vA > 0.0 && h.w > 0.1 && b.w > 0.1 ? c : vec4(0.0, 0.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDepth; uniform vec2 uRes; varying float vA; varying float vY;
      void main() {
        if (gl_FragCoord.z > texture2D(tDepth, gl_FragCoord.xy / uRes).r + 2e-5) discard;
        float e = 1.0 - abs(vY);
        vec3 c = mix(vec3(1.0, 0.32, 0.06), vec3(1.0, 0.86, 0.55), vA * vA) * (2.0 + 6.0 * vA * vA);
        gl_FragColor = vec4(c * e * e, 1.0);
      }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  let next = 0, lo = -1, cnt = 0;
  return {
    mesh,
    emit(x, y, z, vx, vy, vz, time) {
      const i = next;
      next = (next + 1) % count;
      if (lo < 0) lo = i;
      cnt++;
      p0[i * 3] = x; p0[i * 3 + 1] = y; p0[i * 3 + 2] = z;
      vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
      born[i] = time;
    },
    update(time, w, h) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uRes.value.set(w, h);
      if (lo < 0) return;
      mark(geo, ['p0', 'vel', 'born'], lo, Math.min(cnt, count), count);
      lo = -1; cnt = 0;
    },
  };
}
