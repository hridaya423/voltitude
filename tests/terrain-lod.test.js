import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { loadWorld } from '../tools/load-world.mjs';
import { venueOf } from '../src/sim/venues.js';

const three = new URL('../rl/vendor/three-r169/build/three.module.js', import.meta.url).href;
registerHooks({ resolve: (s, c, next) => next(s === 'three' ? three : s, c) });
const THREE = await import('three');
const { createTerrain } = await import('../src/render/terrain.js');

const PIXEL_AT = 400;

function coarseHeight(mesh, cx, cz) {
  const pos = mesh.geometry.attributes.position.array, xs = [], zs = [];
  for (let k = 0; k < pos.length; k += 3) { xs.push(pos[k]); zs.push(pos[k + 2]); }
  const cols = [...new Set(xs)].sort((a, b) => a - b), rows = [...new Set(zs)].sort((a, b) => a - b);
  const nc = cols.length, at = (r, c) => pos[(r * nc + c) * 3 + 1];
  return (x, z) => {
    const lx = x - cx, lz = z - cz;
    let c = cols.findIndex((v, k) => k + 1 < nc && lx >= v && lx <= cols[k + 1]);
    let r = rows.findIndex((v, k) => k + 1 < rows.length && lz >= v && lz <= rows[k + 1]);
    if (c < 0 || r < 0) return -Infinity;
    const fx = (lx - cols[c]) / (cols[c + 1] - cols[c]), fz = (lz - rows[r]) / (rows[r + 1] - rows[r]);
    const a = at(r, c), b = at(r, c + 1), d = at(r + 1, c), e = at(r + 1, c + 1);
    return fx >= fz ? a + (b - a) * fx + (e - b) * fz : a + (e - d) * fx + (d - a) * fz;
  };
}

for (const id of ['proving', 'airfield', 'launch']) {
  test(`${id}: a coarse terrain level that pokes through the road or run-off is only drawn from ${PIXEL_AT} m or more away`, () => {
    const world = loadWorld(id), { track } = world;
    const group = createTerrain(world.terrain, { value: new THREE.Vector3(0, 1, 0) }, { value: 0 }, null, venueOf(id), track);
    const tiles = group.children.filter((o) => o.isLOD).map((lod) => ({
      c: lod.position,
      levels: lod.levels.slice(2).map((l) => ({ distance: l.distance, height: coarseHeight(l.object, lod.position.x, lod.position.z) })),
    }));
    let worst = Infinity, where = '';
    for (let i = 0; i < track.lap; i += 3) {
      if (track.gap[i] || track.loopMask[i]) continue;
      const k = i * 3;
      for (const side of [-1, 1]) {
        const wall = side < 0 ? track.wallL[i] : track.wallR[i];
        for (let lat = 0; lat <= wall; lat += 1.5) {
          const l = side * lat, x = track.P[k] + track.R[k] * l, y = track.P[k + 1] + track.R[k + 1] * l, z = track.P[k + 2] + track.R[k + 2] * l;
          for (const t of tiles) for (const lv of t.levels) {
            if (lv.height(x, z) - y < 0.05) continue;
            const margin = lv.distance - Math.hypot(x - t.c.x, z - t.c.z);
            if (margin < worst) { worst = margin; where = `sample ${i}, ${l.toFixed(1)} m`; }
          }
        }
      }
    }
    assert.ok(worst >= PIXEL_AT, `coarse terrain over the track is drawn from ${worst.toFixed(0)} m away at ${where}`);
  });
}
