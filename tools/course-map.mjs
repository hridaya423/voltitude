import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { venueOf } from '../src/sim/venues.js';
import { buildTrack } from '../src/sim/world.js';

const venue = venueOf(process.argv[2]);
const out = process.argv[3];
const TERRAIN = venue.terrain;
const track = buildTrack(venue);
const { n, H, gap, cps, sectors, pads, finish } = track;
const { cx, cz, size } = TERRAIN;
const x0 = cx - size / 2, z0 = cz - size / 2;
const sx = (x) => ((x - x0) / size) * 1000, sz = (z) => (1 - (z - z0) / size) * 1000;
let path = '', gaps = '';
let lo = Infinity, hi = -Infinity;
for (let i = 0; i < n; i++) {
  const x = H[i * 3], y = H[i * 3 + 1], z = H[i * 3 + 2];
  lo = Math.min(lo, y); hi = Math.max(hi, y);
  path += `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sz(z).toFixed(1)}`;
  if (gap[i]) gaps += `<circle cx="${sx(x)}" cy="${sz(z)}" r="1.6" fill="#f44"/>`;
}
const dot = (i, c, r, label) => `<circle cx="${sx(H[i * 3])}" cy="${sz(H[i * 3 + 2])}" r="${r}" fill="${c}"/>` + (label ? `<text x="${sx(H[i * 3]) + 6}" y="${sz(H[i * 3 + 2]) - 6}" fill="#fff" font-size="14">${label}</text>` : '');
const elev = [];
for (let i = 0; i < n; i += 4) elev.push(`${(i / n) * 1000},${300 - ((H[i * 3 + 1] - lo) / (hi - lo + 1e-6)) * 280}`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1320" style="background:#222">
<circle cx="${sx(cx)}" cy="${sz(cz)}" r="${(TERRAIN.ring / size) * 1000}" fill="none" stroke="#555"/>
${[...TERRAIN.mesas, ...TERRAIN.buttes].map(([x, z, r]) => `<circle cx="${sx(x)}" cy="${sz(z)}" r="${(r / size) * 1000}" fill="#653"/>`).join('')}
<path d="${path}" fill="none" stroke="#7cf" stroke-width="2"/>${gaps}
${cps.map((i) => dot(i, '#fff', 3)).join('')}${pads.map((p) => dot(p.i, p.type === 'gas' ? '#4f8' : '#fc3', 4)).join('')}
${sectors.map((s) => dot(s.i, '#f0f', 5, s.name)).join('')}${dot(finish, '#f00', 6, 'FINISH')}${dot(0, '#0f0', 6, 'START')}
<g transform="translate(0,1010)"><rect width="1000" height="310" fill="#111"/><polyline points="${elev.join(' ')}" fill="none" stroke="#fc6" stroke-width="2"/>
<text x="10" y="20" fill="#fff" font-size="14">elev ${lo.toFixed(0)}..${hi.toFixed(0)} m, length ${n} m</text></g></svg>`;
writeFileSync(out + '.svg', svg);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 1320 } });
await page.setContent(svg);
await page.screenshot({ path: out + '.png' });
await browser.close();
console.log({ n, lo, hi, cps: cps.length, sectors: sectors.map((s) => [s.name, s.i]) });
