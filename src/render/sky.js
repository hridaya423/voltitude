import * as THREE from 'three';

const SUN_AZ = { day: 98.5 * Math.PI / 180, night: -141.5 * Math.PI / 180 };
export const SUN_DIR = new THREE.Vector3(0, 1, 0);
export const UNIT_LUX = { day: 7300, night: 206 };
export const FLOOD_RGB = [1.0, 0.96, 0.9];
const SUN_SR = 6.8e-5;
const AP_SIGMA = [0.35 * 5.8 / 13.5 + 0.65, 1, 0.35 * 33.1 / 13.5 + 0.65];

export const skyUniforms = {
  uSunDir: { value: SUN_DIR },
  uSkyRot: { value: 0 },
  tSkyFog: { value: null },
  uSkyScale: { value: 1 },
  uNight: { value: 0 },
  tFlood: { value: null },
  uFloodBox: { value: new THREE.Vector4() },
};

export const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform float uSkyRot;
uniform float uSkyScale;
uniform sampler2D tSkyFog;
uniform float uNight;
vec2 skyUv(vec3 d) {
  float phi = atan(d.z, d.x) + uSkyRot;
  return vec2(phi / 6.28318530718 + 0.5, asin(clamp(d.y, 0.0, 1.0)) * 0.63661977);
}
vec3 skyDecode(vec3 v) {
  vec3 l = mix(v / 12.92, pow((v + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), v));
  l = min(l, vec3(0.998));
  return l / (1.0 - l) * uSkyScale;
}
vec3 skyColor(vec3 d) {
  return skyDecode(texture2D(tSkyFog, skyUv(vec3(d.x, max(d.y, 0.012), d.z))).rgb);
}
`;

const loadTexture = (url) => new THREE.TextureLoader().loadAsync(url);

export async function loadSky(night, renderer) {
  const name = night ? 'night' : 'day';
  const [info, sky, fog] = await Promise.all([
    fetch(`assets/sky/${name}_sky.json`).then((r) => r.json()),
    loadTexture(`assets/sky/${name}_sky.webp`),
    loadTexture(`assets/sky/${name}_fog.png`),
  ]);
  for (const t of [sky, fog]) { t.colorSpace = THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }
  sky.minFilter = THREE.LinearMipmapLinearFilter;
  sky.generateMipmaps = true;
  sky.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const el = (night ? 38 : info.sunElevationDeg) * Math.PI / 180;
  const az = SUN_AZ[name];
  SUN_DIR.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  skyUniforms.uSkyRot.value = info.sunPhi - az;
  skyUniforms.uSkyScale.value = night ? 0.02 : 1;
  skyUniforms.uNight.value = night ? 1 : 0;
  skyUniforms.tSkyFog.value = fog;
  return { sky, fog, info, sunIrradiance: info.maxLuminance * SUN_SR * skyUniforms.uSkyScale.value };
}

export function createSky(skyTex, sunRadiance, gain = 1) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...skyUniforms, tSky: { value: skyTex }, uGain: { value: gain }, uSunL: { value: Math.min(sunRadiance, 6e4) } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform sampler2D tSky;
      uniform float uGain;
      uniform float uSunL;
      ${SKY_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        vec2 uv = skyUv(vec3(d.x, max(d.y, 0.003), d.z));
        float phi = atan(d.z, d.x) + uSkyRot;
        float ua = fract(phi / 6.28318530718 + 0.5), ub = fract(phi / 6.28318530718) - 0.5;
        vec2 gx = vec2(abs(dFdx(ua)) < abs(dFdx(ub)) ? dFdx(ua) : dFdx(ub), dFdx(uv.y));
        vec2 gy = vec2(abs(dFdy(ua)) < abs(dFdy(ub)) ? dFdy(ua) : dFdy(ub), dFdy(uv.y));
        vec3 c = skyDecode(textureGrad(tSky, vec2(ua, uv.y), gx, gy).rgb);
        float sun = max(dot(d, uSunDir), 0.0);
        c += vec3(1.0, 0.86, 0.7) * smoothstep(0.999987, 0.999991, sun) * uSunL * (1.0 - uNight);
        gl_FragColor = vec4(c * uGain, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 100;
  mesh.onBeforeRender = (r, s, cam) => mesh.position.copy(cam.position);
  return mesh;
}

export function bakeEnvironment(renderer, skyTex, night, width = 4096) {
  const rt = new THREE.WebGLRenderTarget(width, width / 2, { type: THREE.HalfFloatType, depthBuffer: false });
  rt.texture.mapping = THREE.EquirectangularReflectionMapping;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { ...skyUniforms, tSky: { value: skyTex } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform sampler2D tSky;
      ${SKY_GLSL}
      void main() {
        float phi = (vUv.x - 0.5) * 6.28318530718, el = (vUv.y - 0.5) * 3.14159265359;
        vec3 d = vec3(cos(el) * cos(phi), sin(el), cos(el) * sin(phi));
        vec2 uv = skyUv(d);
        vec3 c = skyDecode(texture2D(tSky, vec2(uv.x, max(uv.y, 0.001))).rgb);
        vec3 ground = skyColor(vec3(d.x, 0.0, d.z)) * vec3(0.62, 0.5, 0.4) * 0.55;
        c = d.y < 0.0 ? ground : c;
        c = min(c, vec3(24.0));
        ${night ? `for (int k = 0; k < 10; k++) {
          float a = float(k) / 10.0 * 6.28318530718 + 0.2 + 0.3;
          vec2 dd = vec2(abs(atan(sin(phi - a), cos(phi - a))), abs(el - atan((16.0 + mod(float(k), 3.0) * 5.0) / 60.0)));
          c += vec3(7.0, 6.4, 5.6) * smoothstep(0.075, 0.05, dd.x) * smoothstep(0.022, 0.012, dd.y) * 0.5;
        }` : ''}
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  }));
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  renderer.setRenderTarget(rt);
  renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  renderer.setRenderTarget(null);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(rt.texture).texture;
  pmrem.dispose();
  rt.dispose();
  quad.material.dispose();
  return env;
}

export function skyFog(material, sunUniform, density, detail = false, extend = null) {
  material.onBeforeCompile = (shader) => {
    if (extend) extend(shader);
    Object.assign(shader.uniforms, skyUniforms);
    shader.uniforms.uFogDensity = density;
    const vis = detail && material.userData.shadowFocus;
    if (vis) shader.uniforms.uShadowFocus = material.userData.shadowFocus;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFogWorld;${vis ? '\nattribute float sunVis;\nvarying float vSunVis;' : ''}`)
      .replace('#include <fog_vertex>', `#include <fog_vertex>\nvFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;${vis ? '\nvSunVis = sunVis;' : ''}`);
    if (vis) shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSunVis;\nuniform vec3 uShadowFocus;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float farShadow = mix(1.0, vSunVis, smoothstep(250.0, 330.0, length(vFogWorld.xz - uShadowFocus.xz)));
        reflectedLight.directDiffuse *= farShadow;
        reflectedLight.directSpecular *= farShadow;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFogWorld;\nuniform float uFogDensity;\nuniform sampler2D tFlood;\nuniform vec4 uFloodBox;\n${SKY_GLSL}`)
      .replace('#include <aomap_fragment>', `if (uNight > 0.5) {
          vec4 fl = texture2D(tFlood, (vFogWorld.xz - uFloodBox.xy) * uFloodBox.zw);
          float fe = length(fl.rgb);
          reflectedLight.directDiffuse = vec3(0.0);
          reflectedLight.directSpecular = vec3(0.0);
          vec3 floodRgb = vec3(${FLOOD_RGB.map((c) => c.toFixed(2)).join(', ')});
          if (fe > 1e-7) RE_Direct(IncidentLight(floodRgb * fe, normalize((viewMatrix * vec4(fl.rgb / fe, 0.0)).xyz), true), geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
          reflectedLight.indirectDiffuse += BRDF_Lambert(material.diffuseColor) * floodRgb * fl.a * 0.12;
        }
        #include <aomap_fragment>`)
      .replace('#include <fog_fragment>', `
        vec3 fogRay = vFogWorld - cameraPosition;
        float fogDist = length(fogRay);
        vec3 fogDir = fogRay / fogDist;
        float fogK = 0.0042, fogDy = vFogWorld.y - cameraPosition.y;
        float fogH = abs(fogDy * fogK) < 0.002 ? exp(-fogK * cameraPosition.y) : (exp(-fogK * cameraPosition.y) - exp(-fogK * vFogWorld.y)) / (fogK * fogDy);
        vec3 fogT = exp(-fogDist * uFogDensity * 0.75 * max(fogH, 0.0) * vec3(${AP_SIGMA.map((c) => c.toFixed(3)).join(', ')}));
        gl_FragColor.rgb = gl_FragColor.rgb * fogT + skyColor(normalize(vec3(fogDir.x, 0.02, fogDir.z))) * (1.0 - fogT);`);
  };
  material.customProgramCacheKey = () => (extend ? 'skyfog-pbr' : 'skyfog');
}
