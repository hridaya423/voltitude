import * as THREE from 'three';

export const CASCADES = [
  { far: 24, size: 2048, bias: -0.00015, normal: 0.04 },
  { far: 90, size: 2048, bias: -0.0002, normal: 0.14 },
  { far: 280, size: 2048, bias: -0.0003, normal: 0.45 },
];
const SINGLE = { far: 110, size: 2048, bias: -0.0003, normal: 0.3 };
const FADE = 0.2;
const PERIOD = [1, 2, 4];
const PHASE = [0, 0, 1];
const CASTER_REACH = 1000;

const cascade = (j) => `getShadow( directionalShadowMap[ ${j} ], directionalLightShadows[ ${j} ].shadowMapSize, directionalLightShadows[ ${j} ].shadowIntensity, directionalLightShadows[ ${j} ].shadowBias, directionalLightShadows[ ${j} ].shadowRadius, vDirectionalShadowCoord[ ${j} ] )`;
const begin = THREE.ShaderChunk.lights_fragment_begin;
const loop = begin.indexOf('getDirectionalLightInfo( directionalLight, directLight );');
const shadowLine = /directLight\.color \*= \( directLight\.visible && receiveShadow \) \? getShadow\([^;]*\) : 1\.0;/;
const direct = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
THREE.ShaderChunk.lights_fragment_begin = begin.slice(0, loop)
  + begin.slice(loop).replace(shadowLine, `{
		float cd = -vViewPosition.z;
		float c0 = smoothstep( ${(CASCADES[0].far * (1 - FADE)).toFixed(1)}, ${CASCADES[0].far.toFixed(1)}, cd ), c1 = smoothstep( ${(CASCADES[1].far * (1 - FADE)).toFixed(1)}, ${CASCADES[1].far.toFixed(1)}, cd );
		if ( UNROLLED_LOOP_INDEX == 0 ) {
#if NUM_DIR_LIGHT_SHADOWS == 1
			float w0 = 1.0 - smoothstep( ${(SINGLE.far * (1 - FADE)).toFixed(1)}, ${SINGLE.far.toFixed(1)}, cd );
			float sh = w0 > 0.002 && receiveShadow ? w0 * ${cascade(0)} + 1.0 - w0 : 1.0;
#else
			float w0 = 1.0 - c0, w1 = c0 * ( 1.0 - c1 ), w2 = c0 * c1;
			float sh = ( w0 > 0.002 && receiveShadow ? w0 * ${cascade(0)} : w0 )
				+ ( w1 > 0.002 && receiveShadow ? w1 * ${cascade(1)} : w1 )
				+ ( w2 > 0.002 && receiveShadow ? w2 * ${cascade(2)} : w2 );
#endif
			directLight.color *= sh;
		} else directLight.visible = false;
		}`).replace(direct, `if ( directLight.visible ) ${direct}`);

const pcfStart = '#elif defined( SHADOWMAP_TYPE_PCF_SOFT )', pcfEnd = '#elif defined( SHADOWMAP_TYPE_VSM )';
const pcf = THREE.ShaderChunk.shadowmap_pars_fragment;
THREE.ShaderChunk.shadowmap_pars_fragment = pcf.slice(0, pcf.indexOf(pcfStart)) + `#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			vec2 q = shadowCoord.xy * shadowMapSize - 0.5;
			vec2 f = fract( q );
			vec2 uv = ( floor( q ) + 0.5 ) * texelSize;
			shadow = mix(
				mix( texture2DCompare( shadowMap, uv, shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( texelSize.x, 0.0 ), shadowCoord.z ), f.x ),
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, texelSize.y ), shadowCoord.z ), texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ), f.x ),
				f.y );
		` + pcf.slice(pcf.indexOf(pcfEnd));

const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
const center = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3();
const basis = new THREE.Matrix4(), inv = new THREE.Matrix4();

export function createCascades(scene, color, intensity, dir, night, single = false) {
  const group = new THREE.Group();
  scene.add(group);
  const list = single ? [SINGLE] : CASCADES;
  const count = night ? 1 : list.length;
  const lights = [];
  for (let i = 0; i < count; i++) {
    const l = new THREE.DirectionalLight(color, intensity);
    if (!night) {
      const c = list[i];
      l.castShadow = true;
      l.shadow.autoUpdate = false;
      l.shadow.mapSize.set(c.size, c.size);
      l.shadow.bias = c.bias;
      l.shadow.normalBias = c.normal;
      l.shadow.camera.near = 1;
    }
    group.add(l, l.target);
    lights.push(l);
  }
  const sunDir = dir.clone().normalize();
  let tick = 0;
  return {
    lights,
    update(camera, focus) {
      camera.updateMatrixWorld();
      if (night) {
        lights[0].position.copy(focus).addScaledVector(sunDir, 200);
        lights[0].target.position.copy(focus);
        return;
      }
      tick++;
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      fwd.setFromMatrixColumn(camera.matrixWorld, 2).negate();
      const th = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      let near = camera.near;
      const lightUp = Math.abs(sunDir.y) > 0.95 ? right : up;
      basis.lookAt(sunDir, new THREE.Vector3(), lightUp);
      inv.copy(basis).invert();
      lights.forEach((l, i) => {
        const far = list[i].far;
        let k = 0;
        for (const d of [near, far]) {
          const hh = d * th, hw = hh * camera.aspect;
          for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
            corners[k++].copy(camera.position).addScaledVector(fwd, d).addScaledVector(right, sx * hw).addScaledVector(up, sy * hh);
          }
        }
        center.set(0, 0, 0);
        for (const c of corners) center.add(c);
        center.multiplyScalar(1 / 8);
        let r = 0;
        for (const c of corners) r = Math.max(r, c.distanceTo(center));
        r = Math.ceil(r * (i ? 1.06 : 1) * 4) / 4;
        const texel = (2 * r) / list[i].size;
        center.applyMatrix4(inv);
        center.x = Math.round(center.x / texel) * texel;
        center.y = Math.round(center.y / texel) * texel;
        center.z = Math.round(center.z / texel) * texel;
        center.applyMatrix4(basis);
        l.target.position.copy(center);
        l.position.copy(center).addScaledVector(sunDir, CASTER_REACH);
        const sc = l.shadow.camera;
        if (sc.right !== r) { sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.far = CASTER_REACH + r; sc.updateProjectionMatrix(); }
        l.shadow.needsUpdate = tick % PERIOD[i] === PHASE[i];
        near = far * (1 - FADE);
      });
    },
  };
}
