import { readFileSync, existsSync } from 'node:fs';
import { buildWorld } from '../src/sim/world.js';
import { venueOf } from '../src/sim/venues.js';

export const heightUrl = (id) => new URL(`../assets/terrain/height/${id}.bin`, import.meta.url);
export const ghostUrl = (id) => new URL(`../assets/ghosts/${id}.json`, import.meta.url);

export function loadWorld(id) {
  const venue = venueOf(id);
  const url = heightUrl(venue.id);
  return buildWorld(existsSync(url) ? readFileSync(url) : null, venue);
}
