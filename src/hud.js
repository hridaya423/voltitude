import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const TOWER_ROW = 21;

export function fmt(ticks) {
  const ms = Math.round(ticks * 1000 / 120);
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}

export function fmtDelta(ticks) {
  const s = Math.abs(ticks) / 120;
  return `${ticks < 0 ? '−' : '+'}${s.toFixed(3)}`;
}

function setText(el, v) {
  if (el._v !== v) { el._v = v; el.textContent = v; }
}

function toggle(el, cls, on) {
  if (el['_' + cls] !== on) { el['_' + cls] = on; el.classList.toggle(cls, on); }
}

export const MEDALS = [['author', 'Author', 1], ['gold', 'Gold', 1.05], ['silver', 'Silver', 1.15], ['bronze', 'Bronze', 1.35]];

export function medalTimes(authorTicks) {
  return MEDALS.map(([id, name, k]) => ({ id, name, t: Math.round(authorTicks * k) }));
}

export function medalFor(ticks, authorTicks) {
  return medalTimes(authorTicks).find((m) => ticks <= m.t) || null;
}

export function createHud(world, settings) {
  const els = {
    hud: $('hud'), clock: $('clock'), tower: $('tower'), sectors: $('sectors'), delta: $('delta'), card: $('card'), cps: $('cps'), target: $('target'),
    cpLabel: $('cpLabel'), lights: $('lights'), toasts: $('toasts'), hint: $('hint'), marker: $('marker'), markerDist: $('markerDist'),
    speed: $('speed'), unit: $('unit'), gas: $('gas'), gasFill: $('gasFill'), gasPct: $('gasPct'), gasEdge: $('gasEdge'), map: $('map'), state: $('state'),
  };
  const { track } = world;
  const NS = 'http://www.w3.org/2000/svg';
  let mapFn = null, meDot = null, ghostDot = null, cpDot = null, rivalDots = [];
  const v = new THREE.Vector3();
  let deltaTimer = 0, hintTimer = 0, lastGas = 1;

  function buildMap(event) {
    els.map.innerHTML = '';
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = event.from; i <= event.to; i += 4) {
      minX = Math.min(minX, track.P[i * 3]); maxX = Math.max(maxX, track.P[i * 3]);
      minZ = Math.min(minZ, track.P[i * 3 + 2]); maxZ = Math.max(maxZ, track.P[i * 3 + 2]);
    }
    const span = Math.max(maxX - minX, maxZ - minZ, 200) * 1.15;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    mapFn = [(x) => 50 + ((x - cx) / span) * 100, (z) => 50 - ((z - cz) / span) * 100];
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); els.map.append(e); return e; };
    let d = '';
    for (let i = event.from; i <= event.to; i += 4) d += `${i === event.from ? 'M' : 'L'}${mapFn[0](track.P[i * 3]).toFixed(1)} ${mapFn[1](track.P[i * 3 + 2]).toFixed(1)}`;
    mk('path', { d, class: 'route' });
    if (!event.circuit) for (const i of event.cps) mk('circle', { cx: mapFn[0](track.P[i * 3]), cy: mapFn[1](track.P[i * 3 + 2]), r: 1.6, class: 'cp' });
    cpDot = mk('circle', { r: 2.6, class: 'next' });
    ghostDot = mk('circle', { r: 2.2, class: 'ghost' });
    rivalDots = event.kind === 'gp' ? Array.from({ length: 7 }, () => mk('circle', { r: 2.2, class: 'rival' })) : [];
    meDot = mk('circle', { r: 3, class: 'me' });
  }

  return {
    els,
    show(on) { els.hud.hidden = !on; },
    begin(event, targetText) {
      buildMap(event);
      setText(els.card, event.id === 'full' ? 'FULL RUN' : event.circuit ? event.name.toUpperCase() : `S${event.card - 1}  ${event.name.toUpperCase()}`);
      els.cpLabel.firstChild.textContent = event.circuit ? 'LAP' : 'CHECKPOINT';
      els.target.innerHTML = targetText || '';
      toggle(els.delta, 'on', false);
      els.lights.classList.remove('on', 'out');
      for (const col of els.lights.children) col.classList.remove('lit');
      els.toasts.innerHTML = '';
      toggle(els.hint, 'on', false);
    },
    toast(text, color = 'white', sub = '') {
      const t = document.createElement('div');
      t.className = `toast ${color}`;
      t.innerHTML = sub ? `${text}<small>${sub}</small>` : text;
      els.toasts.append(t);
      while (els.toasts.children.length > 3) els.toasts.firstChild.remove();
      setTimeout(() => t.remove(), 1600);
    },
    hint(html) {
      els.hint.innerHTML = html;
      toggle(els.hint, 'on', true);
      hintTimer = 4.5;
    },
    sectorsBegin(n) {
      els.sectors.innerHTML = '<i></i>'.repeat(n);
      els.sectors.children[0]?.classList.add('now');
    },
    sector(i, color) {
      const segs = els.sectors.children;
      segs[i]?.classList.remove('now');
      segs[i]?.classList.add(color);
      segs[i + 1]?.classList.add('now');
    },
    tower(rows) {
      const list = els.tower;
      const byId = {};
      for (const li of list.children) byId[li.dataset.id] = li;
      rows.forEach((r, k) => {
        let li = byId[r.id];
        if (!li) {
          li = document.createElement('li');
          li.dataset.id = r.id;
          li.innerHTML = `<span class="p"></span><span class="c ${r.id}"></span><span class="n">${r.code}</span><span class="g"></span>`;
          if (r.color) li.children[1].style.background = r.color;
          if (r.id === 'me') li.classList.add('me');
          list.appendChild(li);
        }
        const was = li._k;
        li._k = k;
        li.style.transform = `translateY(${k * TOWER_ROW}px)`;
        li.style.zIndex = was !== undefined && k < was ? 2 : 1;
        li.children[0].textContent = k + 1;
        li.children[3].textContent = r.gap;
        if (r.id === 'me' && was !== undefined && k < was) { li.classList.remove('up'); void li.offsetWidth; li.classList.add('up'); }
        delete byId[r.id];
      });
      for (const id in byId) byId[id].remove();
      list.style.height = `${rows.length * TOWER_ROW}px`;
    },
    light(n) {
      const cols = els.lights.children;
      for (let k = 0; k < cols.length; k++) cols[k].classList.toggle('lit', k < n);
      els.lights.classList.toggle('on', n > 0);
      els.lights.classList.toggle('out', n === 0);
    },
    delta(ticks, purple) {
      setText(els.delta, fmtDelta(ticks));
      toggle(els.delta, 'purple', !!purple);
      toggle(els.delta, 'good', !purple && ticks <= 0);
      toggle(els.delta, 'bad', !purple && ticks > 0);
      toggle(els.delta, 'on', true);
      deltaTimer = 3;
    },
    update(dt, race, camera, ghostPos, interpPos) {
      const c = race.car;
      const clock = race.phase === 'countdown' ? 0 : race.phase === 'finished' ? race.total : race.raceTick;
      setText(els.clock, fmt(clock));
      const ev = race.event;
      setText(els.cps, ev.circuit ? (ev.laps > 9 ? `${Math.min(race.laps.length + 1, ev.laps)}` : `${Math.min(race.laps.length + 1, ev.laps)}/${ev.laps}`) : `${Math.min(race.next, ev.cps.length - 1)}/${ev.cps.length - 1}`);
      const mph = settings.units === 'kmh' ? c.speed * 3.6 : c.speed * 2.237;
      setText(els.speed, String(Math.round(mph)));
      setText(els.unit, settings.units === 'kmh' ? 'KM/H' : 'MPH');
      els.gasFill.style.transform = `scaleX(${c.gas.toFixed(3)})`;
      setText(els.gasPct, `${Math.round(c.gas * 100)}`);
      toggle(els.gas, 'burn', c.boosting);
      toggle(els.gas, 'low', c.gas < 0.17);
      els.gasEdge.style.left = `${(c.gas * 100).toFixed(1)}%`;
      if (c.gas >= 1 && lastGas < 1) { els.gas.classList.remove('full'); void els.gas.offsetWidth; els.gas.classList.add('full'); }
      lastGas = c.gas;
      const st = c.mode === 0 ? 'AIR' : c.uy < 0.3 ? (c.uy < -0.5 ? 'INVERTED' : 'WALL') : '';
      setText(els.state, st);
      toggle(els.state, 'on', !!st && race.phase === 'racing');
      deltaTimer -= dt;
      if (deltaTimer <= 0) toggle(els.delta, 'on', false);
      if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) toggle(els.hint, 'on', false); }

      const i = race.event.cps[Math.min(race.next, race.event.cps.length - 1)];
      const o = i * 3;
      v.set(track.H[o] + track.U[o] * 4, track.H[o + 1] + track.U[o + 1] * 4, track.H[o + 2] + track.U[o + 2] * 4).project(camera);
      const w = innerWidth, h = innerHeight;
      const behind = v.z > 1;
      let x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      if (behind) { x = w - x; y = h - y; }
      const m = 56;
      const off = behind || x < m || x > w - m || y < m || y > h - m;
      if (off) {
        const dx = x - w / 2, dy = y - h / 2;
        const k = Math.min((w / 2 - m) / Math.abs(dx || 1e-6), (h / 2 - m) / Math.abs(dy || 1e-6));
        x = w / 2 + dx * k; y = h / 2 + dy * k;
        els.marker.style.setProperty('--rot', `${(Math.atan2(dy, dx) * 180 / Math.PI - 90).toFixed(0)}deg`);
      }
      toggle(els.marker, 'edge', off);
      toggle(els.marker, 'on', race.phase === 'racing' && !ev.circuit);
      els.marker.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      const dist = Math.hypot(track.H[o] - interpPos.x, track.H[o + 1] - interpPos.y, track.H[o + 2] - interpPos.z);
      setText(els.markerDist, off ? '' : `${Math.round(dist)} m`);

      if (mapFn) {
        meDot.setAttribute('cx', mapFn[0](interpPos.x).toFixed(1)); meDot.setAttribute('cy', mapFn[1](interpPos.z).toFixed(1));
        cpDot.setAttribute('cx', mapFn[0](track.P[o]).toFixed(1)); cpDot.setAttribute('cy', mapFn[1](track.P[o + 2]).toFixed(1));
        if (ghostPos) { ghostDot.setAttribute('cx', mapFn[0](ghostPos.x).toFixed(1)); ghostDot.setAttribute('cy', mapFn[1](ghostPos.z).toFixed(1)); }
        ghostDot.style.display = ghostPos ? '' : 'none';
        for (let k = 0; k < rivalDots.length; k++) {
          const rc = race.entries[k + 1].car;
          rivalDots[k].setAttribute('cx', mapFn[0](rc.x).toFixed(1)); rivalDots[k].setAttribute('cy', mapFn[1](rc.z).toFixed(1));
          rivalDots[k].style.fill = race.entries[k + 1].identity.color;
        }
      }
    },
  };
}
