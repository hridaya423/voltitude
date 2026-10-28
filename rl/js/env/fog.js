import * as THREE from "@rl/vendor/three-r169/build/three.module.js";
import { LIGHT_PLAN, STAGE, CROWD, HALL, RAMP, LINEUP, LIGHT_ROW, ARENA } from "@rl/js/config.js";
import { GROUND_MAP } from "@rl/js/env/layout.js";
import { bakePoolMap, bakeFloorMap, POOL_RES } from "@rl/js/env/poolmap.js";
import * as SKY_MOD from "@rl/js/env/sky.js";
const HZ = LIGHT_PLAN.HAZE;
export const HEIGHT_FOG = {
FALLOFF: HZ.FALLOFF,
BASE_Y: 0.0,
UNIFORM: 0.1,
};
let installed = false;
let poolTexture = null;
let poolBake = null;
let floorTexture = null;
let floorBake = null;
function f(x) { return Number(x).toFixed(5); }
const MIST = (() => {
const m = SKY_MOD && SKY_MOD.HORIZON_MIST;
if (m && m.isColor) return [m.r, m.g, m.b];
if (Array.isArray(m) && m.length >= 3) return m.slice(0, 3);
return [0.0080, 0.0091, 0.0123];
})();
export function getPoolMap() { return { texture: poolTexture, bake: poolBake, floorTexture, floorBake }; }
export function installEnvShaderPatches() {
if (installed) return;
installed = true;
const C = THREE.ShaderChunk;
try { poolBake = bakePoolMap(POOL_RES); } catch (e) { console.warn('[env] pool map bake failed', e); poolBake = null; }
if (poolBake) {
poolTexture = new THREE.DataTexture(poolBake.data, poolBake.W, poolBake.H, THREE.RGBAFormat, THREE.UnsignedByteType);
} else {
poolTexture = new THREE.DataTexture(new Uint8Array([255, 128, 128, 230]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
}
poolTexture.name = 'env.poolMap';
poolTexture.wrapS = poolTexture.wrapT = THREE.ClampToEdgeWrapping;
poolTexture.magFilter = THREE.LinearFilter;
poolTexture.minFilter = THREE.LinearFilter;
poolTexture.generateMipmaps = false;
poolTexture.colorSpace = THREE.NoColorSpace;
poolTexture.needsUpdate = true;
try { floorBake = bakeFloorMap(POOL_RES); } catch (e) { console.warn('[env] floor map bake failed', e); floorBake = null; }
floorTexture = floorBake
? new THREE.DataTexture(floorBake.data, floorBake.W, floorBake.H, THREE.RGBAFormat, THREE.UnsignedByteType)
: new THREE.DataTexture(new Uint8Array([0, 255, 0, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
floorTexture.name = 'env.floorPoolMap';
floorTexture.wrapS = floorTexture.wrapT = THREE.ClampToEdgeWrapping;
floorTexture.magFilter = floorTexture.minFilter = THREE.LinearFilter;
floorTexture.generateMipmaps = false;
floorTexture.colorSpace = THREE.NoColorSpace;
floorTexture.needsUpdate = true;
for (const k of ['lambert', 'phong', 'standard', 'physical', 'toon']) {
const sl = THREE.ShaderLib[k];
if (sl && sl.uniforms) sl.uniforms.envPoolMap = { value: [poolTexture] };
}
const sx = (STAGE.DECK.X0 + CROWD.X1) / 2, sz = (STAGE.DECK.Z0 + STAGE.DECK.Z1) / 2;
const hx = (HALL.CORNERS[0][0] + HALL.CORNERS[2][0]) / 2, hz = (HALL.CORNERS[0][2] + HALL.CORNERS[2][2]) / 2;
const rampMid = [RAMP.ORIGIN[0] + RAMP.AXIS_S[0] * 6, RAMP.ORIGIN[2] + RAMP.AXIS_S[2] * 6];
const lrMid = [(LIGHT_ROW.A[0] + LIGHT_ROW.B[0]) / 2, (LIGHT_ROW.A[2] + LIGHT_ROW.B[2]) / 2];
const B = ARENA.BOUNDS, acx = (B.MIN_X + B.MAX_X) / 2, acz = (B.MIN_Z + B.MAX_Z) / 2;
const ahx = (B.MAX_X - B.MIN_X) / 2 + 30, ahz = (B.MAX_Z - B.MIN_Z) / 2 + 30;
C.fog_pars_vertex =  `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorldPos;
#endif`;
C.fog_vertex =  `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorldPos = ( mvPosition.xyz - viewMatrix[ 3 ].xyz ) * mat3( viewMatrix );
#endif`;
C.fog_pars_fragment =  `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorldPos;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif


  #if ( ( defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG ) || defined( TOON ) ) && ! defined( ENV_NO_POOLMAP ) ) || defined( ENV_FOG_POOLMAP )
    #define ENV_FOG_PM 1
    uniform sampler2D envPoolMap[ 1 ];
  #endif

  float envHazeLocal( vec3 p ) {
    vec2 qs = ( p.xz - vec2( ${f(sx)}, ${f(sz)} ) ) / vec2( 34.0, 40.0 );
    vec2 qr = ( p.xz - vec2( ${f(rampMid[0])}, ${f(rampMid[1])} ) ) / vec2( 22.0, 22.0 );
    return 1.0 + ${f(HZ.STAGE_DENSITY_MUL - 1)} * exp( - dot( qs, qs ) ) + ${f(HZ.RAMP_DENSITY_MUL - 1)} * exp( - dot( qr, qr ) );
  }


  float envFogFactor( vec3 cam, vec3 p, float density ) {
    vec3 d = p - cam;
    float L = length( d );
    float fo = ${f(HEIGHT_FOG.FALLOFF)};
    float camH = exp( - fo * ( clamp( cam.y, -20.0, 400.0 ) - ${f(HEIGHT_FOG.BASE_Y)} ) );
    float k = fo * d.y;
    float li = abs( k ) > 0.001 ? ( 1.0 - exp( - k ) ) / k : 1.0 - 0.5 * k;
    float tau = density * L * ( ${f(HEIGHT_FOG.UNIFORM)} + camH * li ) * envHazeLocal( p );
    return 1.0 - exp( - tau );
  }


  vec3 envHazeColor( vec3 p, vec3 base ) {
  #ifdef ENV_FOG_PM
    vec2 puv = ( p.xz - vec2( ${f(GROUND_MAP.X0)}, ${f(GROUND_MAP.Z0)} ) ) * vec2( ${f(1 / GROUND_MAP.W)}, ${f(1 / GROUND_MAP.H)} );
    float lit = pow( texture2D( envPoolMap[ 0 ], puv ).r, ${f(HZ.LIT_POW || 2)} );
  #else
    vec2 qa = ( p.xz - vec2( ${f(acx)}, ${f(acz)} ) ) / vec2( ${f(ahx)}, ${f(ahz)} );
    float lit = exp( - pow( dot( qa, qa ), 2.0 ) * 1.2 );
  #endif
    vec2 ql = ( p.xz - vec2( 0.0, ${f(LINEUP.Z)} ) ) / vec2( 16.0, 26.0 );
    vec2 qr = ( p.xz - vec2( ${f(rampMid[0])}, ${f(rampMid[1])} ) ) / vec2( 26.0, 26.0 );
    vec2 qw = ( p.xz - vec2( ${f(lrMid[0])}, ${f(lrMid[1])} ) ) / vec2( 30.0, 30.0 );
    vec2 qs = ( p.xz - vec2( ${f(sx)}, ${f(sz)} ) ) / vec2( 40.0, 46.0 );
    vec2 qh = ( p.xz - vec2( ${f(hx)}, ${f(hz)} ) ) / vec2( 50.0, 50.0 );
    float red = 0.8 * exp( - dot( ql, ql ) ) + 1.1 * exp( - dot( qr, qr ) ) + 0.7 * exp( - dot( qw, qw ) );
    float stage = exp( - dot( qs, qs ) ), hall = exp( - dot( qh, qh ) );


    vec3 col = base * ( 0.25 + 1.0 * lit ) + 0.6 * ( vec3( 0.016, 0.0012, 0.0009 ) * red
      + vec3( 0.022, 0.003, 0.003 ) * stage + vec3( 0.003, 0.005, 0.010 ) * stage + vec3( 0.012, 0.002, 0.001 ) * hall );


    vec2 qo = ( p.xz - vec2( ${f(acx)}, ${f(acz)} ) ) / vec2( ${f(ahx)}, ${f(ahz)} );
    float outA = 1.0 - exp( - pow( dot( qo, qo ), 2.0 ) * 1.2 );
    float dm = length( p.xz - vec2( ${f(acx)}, ${f(acz)} ) );
    return max( col, vec3( ${f(MIST[0])}, ${f(MIST[1])}, ${f(MIST[2])} ) * outA * mix( 0.65, 1.0, smoothstep( 300.0, 2500.0, dm ) ) );
  }
#endif`;
C.fog_fragment =  `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = envFogFactor( cameraPosition, vFogWorldPos, fogDensity );
    vec3 envFogCol = envHazeColor( vFogWorldPos, fogColor );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
    vec3 envFogCol = fogColor;
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, envFogCol, fogFactor );
#endif`;
const KD = LIGHT_PLAN.KEY_DIR;
const fb = KD.FALLBACK, fbl = Math.hypot(fb[0], fb[1], fb[2]);
const se0 = Math.sin(KD.ELEV_DEG[0] * Math.PI / 180), se1 = Math.sin(KD.ELEV_DEG[1] * Math.PI / 180);
C.lights_pars_begin = C.lights_pars_begin +  `
#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG ) || defined( TOON )
#ifndef ENV_NO_POOLMAP
#define ENV_POOLMAP 1
#ifndef ENV_FOG_PM
uniform sampler2D envPoolMap[ 1 ];
#endif
vec2 envPoolUV( vec3 wp ) { return ( wp.xz - vec2( ${f(GROUND_MAP.X0)}, ${f(GROUND_MAP.Z0)} ) ) * vec2( ${f(1 / GROUND_MAP.W)}, ${f(1 / GROUND_MAP.H)} ); }

void envApplyKey( inout IncidentLight dl, vec3 viewPos ) {
  vec3 wp = ( viewPos - viewMatrix[ 3 ].xyz ) * mat3( viewMatrix );
  vec4 pm = texture2D( envPoolMap[ 0 ], envPoolUV( wp ) );
#ifdef ENV_GROUND
  dl.color *= envGroundMask( pm.r );
#else
  dl.color *= pm.r;
#endif
#ifdef ENV_GROUND
  vec3 Lw = vec3( ${f(-fb[0] / fbl)}, ${f(-fb[1] / fbl)}, ${f(-fb[2] / fbl)} );
#else
  vec2 hd = pm.gb * 2.0 - 1.0;
  float hl = length( hd );
  hd = hl > 1e-3 ? hd / hl : vec2( 0.0, -1.0 );
  float se = clamp( pm.a, ${f(se0)}, ${f(se1)} ), ce = sqrt( 1.0 - se * se );
  vec3 Lw = vec3( - hd.x * ce, se, - hd.y * ce );
#endif
  dl.direction = normalize( ( viewMatrix * vec4( Lw, 0.0 ) ).xyz );
}
#endif
#endif
`;
const target = 'getDirectionalLightInfo( directionalLight, directLight );';
if (C.lights_fragment_begin.includes(target)) {
C.lights_fragment_begin = C.lights_fragment_begin.replace(target, target + `
		#if defined( ENV_POOLMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 ) && ( UNROLLED_LOOP_INDEX == 0 )
		envApplyKey( directLight, geometryPosition );
		#endif`);
} else {
console.warn('[env] lights_fragment_begin layout changed; key-light pools disabled');
}
}
export function createSceneFog() {
const b = HZ.BASE || [0.024, 0.028, 0.036];
return new THREE.FogExp2(new THREE.Color(b[0], b[1], b[2]), HZ.DENSITY);
}
