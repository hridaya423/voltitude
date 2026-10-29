import { VENUES } from './sim/venues.js';
import { fmt } from './time.js';
import { ACTIONS, keyLabel } from './input.js';

const NAMES = { gp: 'Grand Prix', tt: 'Time Trial', pr: 'Practice', full: 'Full run' };

function records(save) {
  return Object.values(VENUES).map((v) => {
    const book = v.id === 'proving' ? save.events : save.venues?.[v.id];
    const sectors = v.course ? v.course.pieces.filter((p) => p.sector).map((p) => p.sector) : [];
    const name = (id) => NAMES[id] || sectors[Number(id.slice(1)) - 1] || id;
    const set = Object.entries(book || {}).filter(([, e]) => e?.best);
    const list = set.map(([id, e]) => `<li><span>${name(id)}</span><b>${id === 'gp' ? `P${e.best}` : fmt(e.best)}</b></li>`).join('');
    return `<h3>${v.name}</h3><ul>${list || '<li class="none">No results yet</li>'}</ul>`;
  }).join('');
}

export function showFallback({ settings, save, reason }) {
  const root = document.getElementById('fallback');
  const keys = ACTIONS.map(([id, label]) => `<li><span>${label}</span><kbd>${(settings.keys[id] || []).map(keyLabel).join(' / ') || '—'}</kbd></li>`).join('');
  root.innerHTML = `<div class="fb"><h1>VOLTITUDE</h1><p class="why" role="alert">The garage and the races need WebGL, and this browser did not provide it. <span class="reason"></span> Turn on hardware acceleration or try another browser, then reload.</p><button type="button" class="fb-btn">Reload</button><div class="fb-grid"><div><h2>Records</h2>${records(save)}</div><div><h2>Controls</h2><ul>${keys}</ul></div></div></div>`;
  root.querySelector('.reason').textContent = reason ? `(${reason})` : '';
  const reload = root.querySelector('.fb-btn');
  reload.addEventListener('click', () => location.reload());
  root.hidden = false;
  document.getElementById('loading')?.classList.add('done');
  reload.focus();
}
