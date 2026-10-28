import { writeFileSync, mkdirSync } from 'node:fs';
import { shapeTerrain, erode } from '../src/sim/terrain.js';
import { trackHash, encodeHeights, buildTrack } from '../src/sim/world.js';
import { VENUES } from '../src/sim/venues.js';
import { heightUrl } from './load-world.mjs';

const ids = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : Object.keys(VENUES);
const drops = Number(process.argv[3] || 420000);
mkdirSync(new URL('../assets/terrain/height/', import.meta.url), { recursive: true });
for (const id of ids) {
  const venue = VENUES[id], T = venue.terrain;
  const track = buildTrack(venue);
  const t0 = performance.now();
  const H = shapeTerrain(track, T);
  erode(H, T.res, T.size / (T.res - 1), drops);
  writeFileSync(heightUrl(id), encodeHeights(H, trackHash(track, venue)));
  console.log(id, { ms: Math.round(performance.now() - t0), drops });
}
