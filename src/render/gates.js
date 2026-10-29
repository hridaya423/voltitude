import * as THREE from 'three';

const CHEVRONS = 8;
const GLOW = new THREE.Color('#2fd4ff');
const IDLE = new THREE.Color('#0b2a38');
const PULSE_S = 0.9;
const MIN_PX = 3;

const GLOW_VERT = /* glsl */ `
attribute vec3 core;
uniform float uPx, uTube, uPulse;
varying float vEdge;
void main() {
  vec4 c = modelMatrix * vec4(core, 1.0);
  float dist = distance(c.xyz, cameraPosition);
  float grow = max(1.0, MIN_PX * dist / (2.0 * uTube * uPx)) * (1.0 + 0.8 * uPulse);
  vec4 w = c + (modelMatrix * vec4(position, 1.0) - c) * grow;
  vEdge = clamp(dist / 400.0, 0.0, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uPulse, uTime;
varying float vEdge;
void main() {
  float breathe = 0.85 + 0.15 * sin(uTime * 3.0);
  gl_FragColor = vec4(mix(uColor * breathe, vec3(1.0), uPulse), 1.0);
}`;

function chevronGeometry(size) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(-0.55, 0.62); s.lineTo(-0.95, 0.62); s.lineTo(-0.4, 0); s.lineTo(-0.95, -0.62); s.lineTo(-0.55, -0.62); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false }).translate(0.47, 0, -0.08).scale(size, size, 1);
}

function glowTorus(radius, tube) {
  const geo = new THREE.TorusGeometry(radius, tube, 10, 96);
  const pos = geo.attributes.position, core = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i), pos.getX(i));
    core[i * 3] = Math.cos(a) * radius; core[i * 3 + 1] = Math.sin(a) * radius;
  }
  geo.setAttribute('core', new THREE.BufferAttribute(core, 3));
  return geo;
}

export function createGates(world, fog) {
  const { track } = world;
  const group = new THREE.Group();
  const gates = [];
  const frameMat = new THREE.MeshStandardMaterial({ color: '#16191f', metalness: 0.65, roughness: 0.35 });
  fog?.(frameMat);
  const basis = new THREE.Matrix4();
  for (const { i, h, r } of track.gates ?? []) {
    const k = i * 3;
    const R = new THREE.Vector3(track.R[k], track.R[k + 1], track.R[k + 2]), U = new THREE.Vector3(track.U[k], track.U[k + 1], track.U[k + 2]), T = new THREE.Vector3(track.T[k], track.T[k + 1], track.T[k + 2]);
    const root = new THREE.Group();
    root.position.set(track.H[k], track.H[k + 1], track.H[k + 2]).addScaledVector(U, h);
    root.quaternion.setFromRotationMatrix(basis.makeBasis(R.negate(), U, T));

    const frame = new THREE.Mesh(new THREE.TorusGeometry(r + 0.5, 0.34, 14, 96), frameMat);
    frame.castShadow = true;
    const uniforms = { uPx: { value: 600 }, uTube: { value: 0.2 }, uPulse: { value: 0 }, uTime: { value: 0 }, uColor: { value: GLOW.clone().multiplyScalar(1.25) } };
    const glow = new THREE.Mesh(glowTorus(r + 0.05, 0.2), new THREE.ShaderMaterial({ uniforms, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, defines: { MIN_PX: MIN_PX.toFixed(2) }, toneMapped: false }));
    glow.frustumCulled = false;

    const chevrons = new THREE.InstancedMesh(chevronGeometry(0.85), new THREE.MeshBasicMaterial({ toneMapped: false }), CHEVRONS * 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), z = new THREE.Vector3(0, 0, 1);
    for (let n = 0; n < CHEVRONS * 2; n++) {
      const a = ((n % CHEVRONS) / CHEVRONS) * Math.PI * 2 + Math.PI / CHEVRONS, face = n < CHEVRONS ? -0.36 : 0.36;
      p.set(Math.cos(a) * (r + 0.5), Math.sin(a) * (r + 0.5), face);
      q.setFromAxisAngle(z, a + Math.PI);
      chevrons.setMatrixAt(n, m.compose(p, q, one));
      chevrons.setColorAt(n, IDLE);
    }
    root.add(frame, glow, chevrons);
    group.add(root);
    gates.push({ root, uniforms, chevrons, pulse: 0 });
  }

  const color = new THREE.Color();
  return {
    group,
    pass(index) {
      const g = gates[index];
      if (g) g.pulse = 1;
    },
    update(time, dt, px) {
      for (const g of gates) {
        g.pulse = Math.max(0, g.pulse - dt / PULSE_S);
        const pulse = g.pulse * g.pulse;
        g.uniforms.uPulse.value = pulse;
        g.uniforms.uTime.value = time;
        g.uniforms.uPx.value = px;
        g.root.scale.setScalar(1 + 0.12 * pulse);
        const lead = (time * 1.6) % 1;
        for (let n = 0; n < CHEVRONS * 2; n++) {
          const phase = ((n % CHEVRONS) / CHEVRONS - lead + 1) % 1;
          color.copy(IDLE).lerp(GLOW, Math.max(0.3, 1 - phase * 1.6)).multiplyScalar(1.5).lerp(new THREE.Color(1, 1, 1), pulse);
          g.chevrons.setColorAt(n, color);
        }
        g.chevrons.instanceColor.needsUpdate = true;
      }
    },
  };
}
