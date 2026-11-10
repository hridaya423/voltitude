import { GAIN } from './sim/gas.js';

export function stylePoints(e) {
  if (e.type === 'land') return e.quality === 'hard' ? 0 : Math.round((e.tricks.length * 100 + e.air * 20) * (e.quality === 'perfect' ? 1.5 : 1));
  if (e.type === 'near_miss') return 75;
  if (e.type === 'gas_gain' && (e.source === 'wall' || e.source === 'draft')) return Math.round((e.amount / GAIN[e.source]) * 25);
  return 0;
}
