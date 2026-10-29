import { VENUES } from '../sim/venues.js';

export const BOARD = { w: 2048, h: 960 };
export const TYRE = { w: 1280, h: 800 };
export const FLOOR = { w: 2560, h: 800 };
export const TELE = { w: 1536, h: 512 };

const C = {
  ink: '#f4f2ee', ink2: 'rgba(244,242,238,0.74)', ink3: 'rgba(244,242,238,0.5)', ink4: 'rgba(244,242,238,0.22)', hair: 'rgba(255,255,255,0.14)',
  red: '#d1122d', redHot: '#ff4258', cyan: '#7fe3ff', orange: '#ff8a2a', good: '#5dff9b', bad: '#ff6b78',
  author: '#6ff0c4', gold: '#e9c45c', silver: '#c7ccd4', bronze: '#c98b5b', purple: '#b45cff', yellow: '#ffd23f',
};
const DISPLAY = "'Michroma', 'Eurostile', ui-sans-serif, sans-serif";
const UI = "'Saira', ui-sans-serif, system-ui, sans-serif";
const TONE = { good: C.good, bad: C.bad, purple: C.purple, green: C.good, yellow: C.yellow, gold: C.gold, silver: C.silver, bronze: C.bronze, author: C.author, '': C.ink2 };

function put(g, str, x, y, { size = 36, fam = UI, weight = 600, color = C.ink, align = 'left', gap = 0, max = 0 } = {}) {
  let px = size;
  g.font = `${weight} ${px}px ${fam}`;
  if ('letterSpacing' in g) g.letterSpacing = `${gap}px`;
  if (max) while (g.measureText(str).width > max && px > size * 0.6) { px -= 1; g.font = `${weight} ${px}px ${fam}`; }
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.fillText(str, x, y);
  const w = g.measureText(str).width;
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  return w;
}

function wrap(g, str, max, size, fam = UI, weight = 500) {
  g.font = `${weight} ${size}px ${fam}`;
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function dot(g, x, y, r, id) {
  const col = TONE[id];
  if (!id || !col) { g.strokeStyle = C.ink4; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r - 2, 0, 7); g.stroke(); return; }
  g.fillStyle = col;
  g.shadowColor = col; g.shadowBlur = 16;
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.shadowBlur = 0;
}

function chip(g, label, x, y, h, { fill = false, color = C.ink } = {}) {
  g.font = `700 ${h * 0.62}px ${UI}`;
  const w = Math.max(h, g.measureText(label).width + h * 0.7);
  g.lineWidth = 3;
  g.strokeStyle = color;
  rrect(g, x - w, y - h * 0.78, w, h, h * 0.2);
  if (fill) { g.fillStyle = color; g.fill(); } else g.stroke();
  put(g, label, x - w / 2, y - h * 0.78 + h * 0.72, { size: h * 0.62, weight: 700, color: fill ? '#08090d' : color, align: 'center' });
  return w;
}

function clear(g, w, h, top = '#0b0d13', bottom = '#05060a') {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, top); bg.addColorStop(1, bottom);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
}

function header(g, right) {
  put(g, 'VOLTITUDE', 64, 88, { size: 46, fam: DISPLAY, weight: 400, gap: 16 });
  put(g, right, BOARD.w - 64, 84, { size: 32, color: C.ink2, align: 'right', gap: 6, max: 1100 });
  g.fillStyle = C.hair;
  g.fillRect(64, 118, BOARD.w - 128, 2);
}

function row(g, x, y, w, h, selected) {
  if (selected) {
    g.fillStyle = C.red;
    rrect(g, x, y, w, h - 10, 14); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(x + 22, y + (h - 10) / 2 - 14); g.lineTo(x + 22, y + (h - 10) / 2 + 14); g.lineTo(x + 44, y + (h - 10) / 2); g.fill();
  } else { g.fillStyle = C.hair; g.fillRect(x, y + h - 6, w, 2); }
}

function modes(g, b) {
  const hits = [];
  const v = b.venue;
  header(g, `${v.name.toUpperCase()} · ${v.place.toUpperCase()}`);
  put(g, b.circuit ? 'MODES' : 'RACE · PRACTICE', 64, 172, { size: 28, color: C.ink3, gap: 8 });
  const n = b.rows.length, top = 196, rowH = Math.min(150, (770 - top) / n), lx = 64, lw = 780;
  b.rows.forEach((ev, i) => {
    const y = top + i * rowH, sel = i === b.index;
    row(g, lx, y, lw, rowH, sel);
    const mid = y + (rowH - 10) / 2, size = Math.max(30, Math.min(52, rowH * 0.36));
    put(g, ev.tag, lx + 78, mid + size * 0.36, { size: size * 0.62, fam: DISPLAY, weight: 400, color: sel ? '#fff' : C.ink3, align: 'center' });
    put(g, ev.name.toUpperCase(), lx + 130, mid + size * 0.36, { size, fam: DISPLAY, weight: 400, color: sel ? '#fff' : C.ink2, gap: 2, max: lw - 380 });
    if (ev.best) put(g, ev.best, lx + lw - 80, mid + 12, { size: 36, color: sel ? '#fff' : C.ink3, align: 'right' });
    dot(g, lx + lw - 40, mid, 15, ev.medal && ev.medal.id);
    hits.push({ x: lx, y, w: lw, h: rowH, row: i });
  });
  const d = b.detail, rx = 920, rw = 1064;
  if (d) {
    put(g, d.kicker.toUpperCase(), rx, 180, { size: 30, weight: 700, color: C.redHot, gap: 8, max: rw });
    put(g, d.name.toUpperCase(), rx, 262, { size: 60, fam: DISPLAY, weight: 400, gap: 3, max: rw });
    const lines = wrap(g, d.brief, rw, 38);
    lines.slice(0, 3).forEach((l, i) => put(g, l, rx, 330 + i * 50, { size: 38, weight: 500, color: C.ink2 }));
    d.ladder.forEach((m, i) => {
      const y = 510 + i * 56;
      dot(g, rx + 16, y - 12, 14, m.id);
      put(g, m.name.toUpperCase(), rx + 52, y, { size: 30, color: C.ink3, gap: 6 });
      put(g, m.time, rx + 360, y + 2, { size: 38, fam: DISPLAY, weight: 400 });
      if (m.got) put(g, 'CLEARED', rx + 700, y, { size: 28, color: C.good, gap: 6 });
    });
    if (d.bestLabel) {
      g.fillStyle = C.hair; g.fillRect(rx, 716, rw, 2);
      put(g, d.bestLabel, rx, 764, { size: 28, color: C.ink3, gap: 8 });
      put(g, d.best || '—', rx + rw, 768, { size: 44, fam: DISPLAY, weight: 400, align: 'right' });
    }
    const cy = 786;
    g.fillStyle = C.red;
    rrect(g, rx, cy, rw, 76, 14); g.fill();
    put(g, 'DRIVE', rx + 36, cy + 52, { size: 38, fam: DISPLAY, weight: 400, gap: 6, color: '#fff' });
    chip(g, 'ENTER', rx + rw - 32, cy + 56, 48, { color: '#fff' });
    hits.push({ x: rx, y: cy, w: rw, h: 76, row: b.index });
  }
  put(g, '↑↓  MODE     ←→  VENUE     ENTER  DRIVE     S  SETTINGS', 64, 906, { size: 30, color: C.ink2, gap: 4 });
  let x = 64;
  b.legend.forEach(([keys, label]) => {
    x += put(g, keys.join(' '), x, 944, { size: 30, weight: 700, color: C.ink, gap: 2 }) + 12;
    x += put(g, label, x, 944, { size: 30, weight: 500, color: C.ink3 }) + 34;
  });
  return hits;
}

function pause(g, b) {
  const hits = [];
  header(g, b.sub.toUpperCase());
  put(g, b.title, 64, 310, { size: 112, fam: DISPLAY, weight: 400, gap: 6 });
  const top = 380, rowH = 112, lw = 780;
  b.rows.forEach((r, i) => {
    const y = top + i * rowH, sel = i === b.index;
    row(g, 64, y, lw, rowH, sel);
    put(g, r.label.toUpperCase(), 130, y + 68, { size: 42, fam: DISPLAY, weight: 400, color: sel ? '#fff' : C.ink2, gap: 3 });
    if (r.key) chip(g, r.key, 64 + lw - 28, y + 76, 48, { color: sel ? '#fff' : C.ink3 });
    hits.push({ x: 64, y, w: lw, h: rowH, row: i });
  });
  b.lines.forEach((l, i) => {
    const y = 250 + i * 150;
    put(g, l.label.toUpperCase(), 1000, y, { size: 30, color: C.ink3, gap: 8 });
    put(g, l.value, 1000, y + 76, { size: 76, fam: DISPLAY, weight: 400, max: 984 });
  });
  put(g, 'ESC  RESUME     ↑↓  CHOOSE     ENTER  CONFIRM', 64, 930, { size: 30, color: C.ink2, gap: 4 });
  return hits;
}

function results(g, b) {
  const hits = [];
  header(g, b.card.toUpperCase());
  if (b.pos) {
    put(g, `P${b.pos}`, 64, 380, { size: 200, fam: DISPLAY, weight: 400, color: b.pos === 1 ? '#fff' : C.ink });
    put(g, `OF ${b.field}`, 64, 440, { size: 44, weight: 700, color: C.ink3, gap: 8 });
  }
  const mid = b.medal;
  dot(g, 90, 520, 26, mid && mid.id);
  put(g, mid ? `${mid.name.toUpperCase()}${mid.fresh ? ' MEDAL' : ''}` : 'NO MEDAL YET', 140, 536, { size: 42, fam: DISPLAY, weight: 400, color: mid ? C.ink : C.ink3, max: 560 });
  put(g, 'TIME', 760, 180, { size: 28, color: C.ink3, gap: 8 });
  put(g, b.time, 760, 280, { size: 76, fam: DISPLAY, weight: 400, max: 540 });
  put(g, b.delta.text, 760, 350, { size: 40, weight: 700, color: TONE[b.delta.tone] || C.ink2, max: 540 });
  wrap(g, b.note || '', 540, 34).slice(0, 4).forEach((l, i) => put(g, l, 760, 420 + i * 46, { size: 34, weight: 500, color: C.ink2 }));
  put(g, b.title, 1400, 180, { size: 28, color: C.ink3, gap: 8 });
  const cols = Math.ceil(b.rows.length / 9), per = Math.ceil(b.rows.length / cols), rowH = Math.min(64, 540 / per), colW = 584 / cols;
  b.rows.forEach((r, i) => {
    const c = Math.floor(i / per), y = 236 + (i % per) * rowH, x = 1400 + c * colW, size = cols > 1 ? 30 : 36;
    dot(g, x + 12, y + rowH * 0.42, 9, r.dot);
    put(g, r.label, x + 34, y + rowH * 0.62, { size, weight: 500, color: C.ink2 });
    put(g, r.value, x + colW - (cols > 1 ? 4 : 190), y + rowH * 0.62, { size, fam: DISPLAY, weight: 400, align: 'right' });
    if (cols === 1 && r.tag) put(g, r.tag, x + colW, y + rowH * 0.62, { size: 30, color: TONE[r.tone] || C.ink3, align: 'right' });
  });
  g.fillStyle = C.hair; g.fillRect(64, 724, BOARD.w - 128, 2);
  const sw = (BOARD.w - 128) / Math.max(1, b.stats.length);
  b.stats.forEach((s, i) => {
    put(g, s.label.toUpperCase(), 64 + i * sw, 770, { size: 26, color: C.ink3, gap: 6 });
    put(g, s.value, 64 + i * sw, 826, { size: 44, fam: DISPLAY, weight: 400, max: sw - 24 });
  });
  return hits;
}

function resultActions(g, b, hits) {
  const tw = 470, gap = 20, y = 864;
  b.actions.forEach((r, i) => {
    const x = 64 + i * (tw + gap), sel = i === b.index;
    g.globalAlpha = r.off ? 0.3 : 1;
    if (sel) { g.fillStyle = C.red; rrect(g, x, y, tw, 72, 14); g.fill(); } else { g.strokeStyle = C.hair; g.lineWidth = 3; rrect(g, x, y, tw, 72, 14); g.stroke(); }
    put(g, r.label.toUpperCase(), x + 32, y + 49, { size: 34, fam: DISPLAY, weight: 400, color: sel ? '#fff' : C.ink2, gap: 4 });
    if (r.key) chip(g, r.key, x + tw - 26, y + 52, 44, { color: sel ? '#fff' : C.ink3 });
    g.globalAlpha = 1;
    if (!r.off) hits.push({ x, y, w: tw, h: 72, row: i });
  });
}

export function drawBoard(g, b) {
  clear(g, BOARD.w, BOARD.h);
  const hits = b.kind === 'pause' ? pause(g, b) : b.kind === 'results' ? results(g, b) : modes(g, b);
  if (b.kind === 'results') resultActions(g, b, hits);
  return hits;
}

export function drawTyre(g, t, time) {
  const { w, h } = TYRE;
  clear(g, w, h, '#0d0d12', '#050508');
  const keys = t.kind === 'keys';
  put(g, keys ? 'CONTROLS' : 'SETTINGS', 56, 82, { size: 42, fam: DISPLAY, weight: 400, gap: 6 });
  put(g, 'TYRE WARMER', w - 56, 76, { size: 28, color: C.ink3, align: 'right', gap: 8 });
  const heat = g.createLinearGradient(56, 0, w - 56, 0);
  heat.addColorStop(0, C.orange); heat.addColorStop(1, C.red);
  g.fillStyle = heat;
  g.fillRect(56, 104, w - 112, 6);
  const hits = [];
  const sel = t.rows[t.index];
  if (keys) {
    const per = 6, rowH = 98, colW = 580;
    t.rows.forEach((r, i) => {
      const c = Math.floor(i / per), x = 56 + c * (colW + 24), y = 132 + (i % per) * rowH, on = i === t.index;
      row(g, x, y, colW, rowH, on);
      const label = r.label.split(' · ')[0];
      put(g, label, x + 58, y + 58, { size: 36, color: on ? '#fff' : C.ink2, max: r.value ? 290 : 480 });
      if (r.value) {
        const listening = on && t.listening;
        const txt = listening ? (Math.floor(time * 3) % 2 ? 'PRESS A KEY' : '') : r.value;
        g.font = `700 32px ${UI}`;
        const cw = listening ? 236 : Math.max(112, g.measureText(txt).width + 44);
        g.lineWidth = 4; g.strokeStyle = listening ? '#fff' : on ? '#fff' : C.ink3;
        rrect(g, x + colW - 20 - cw, y + 14, cw, 58, 12); g.stroke();
        put(g, txt, x + colW - 20 - cw / 2, y + 54, { size: 32, weight: 700, color: on ? '#fff' : C.ink, align: 'center', max: cw - 16 });
      }
      hits.push({ x, y, w: colW, h: rowH, row: i });
    });
    const hint = sel.label.split(' · ')[1];
    const note = t.listening ? 'Press the new key. Esc cancels.' : hint ? hint[0].toUpperCase() + hint.slice(1) : 'Enter rebinds the selected action.';
    put(g, note, 56, 752, { size: 30, weight: 500, color: C.ink2 });
    put(g, 'Gamepad: RT drive · LT brake · stick steer and pitch · A lift · B boost · LB RB roll · Y checkpoint', 56, 788, { size: 24, weight: 500, color: C.ink3, max: w - 112 });
    return hits;
  }
  const visible = 7, rowH = 84, first = Math.max(0, Math.min(t.rows.length - visible, t.index - 3));
  t.rows.slice(first, first + visible).forEach((r, k) => {
    const i = first + k, y = 128 + k * rowH, on = i === t.index, col = on ? '#fff' : C.ink2;
    row(g, 56, y, w - 112, rowH, on);
    put(g, r.label, 98, y + 54, { size: 38, color: col });
    const xr = w - 84;
    if (r.type === 'toggle') {
      const pw = 128, ph = 48, x = xr - pw, py = y + 12;
      g.fillStyle = r.value ? C.good : 'rgba(255,255,255,0.12)';
      rrect(g, x, py, pw, ph, ph / 2); g.fill();
      put(g, r.value ? 'ON' : 'OFF', x + pw / 2, py + 35, { size: 30, weight: 700, color: r.value ? '#06100a' : col, align: 'center', gap: 2 });
    } else if (r.type === 'choice') {
      put(g, `‹  ${r.value}  ›`, xr, y + 54, { size: 36, weight: 700, color: col, align: 'right', gap: 2 });
    } else if (r.type === 'slider') {
      const x0 = 690, x1 = xr - 96, fill = x0 + (x1 - x0) * r.value;
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x0, y + 34, x1 - x0, 10);
      g.fillStyle = on ? '#fff' : C.orange; g.fillRect(x0, y + 34, fill - x0, 10);
      g.beginPath(); g.arc(fill, y + 39, 15, 0, 7); g.fill();
      put(g, `${Math.round(r.value * 100)}`, xr, y + 54, { size: 34, weight: 700, color: col, align: 'right' });
      hits.push({ x: 56, y, w: w - 112, h: rowH, row: i, slider: [x0, x1] });
      return;
    } else put(g, '›', xr, y + 54, { size: 44, weight: 700, color: col, align: 'right' });
    hits.push({ x: 56, y, w: w - 112, h: rowH, row: i });
  });
  if (t.rows.length > visible) {
    const th = 560 * visible / t.rows.length;
    g.fillStyle = C.hair; g.fillRect(w - 40, 128, 6, 588);
    g.fillStyle = C.ink2; g.fillRect(w - 40, 128 + (588 - th) * first / (t.rows.length - visible), 6, th);
  }
  put(g, sel.note || '', 56, 758, { size: 30, weight: 500, color: C.ink2, max: w - 112 });
  return hits;
}

function outline(v) {
  const pts = [];
  if (v.circuit) for (const n of v.circuit.nodes) pts.push(Array.isArray(n) ? [n[0], n[1]] : [n.loop.x, n.loop.z]);
  else {
    let x = 0, z = 0, a = 0;
    pts.push([0, 0]);
    for (const p of v.course.pieces) {
      const steps = Math.max(1, Math.ceil(p.len / 10)), da = (p.turn || 0) * Math.PI / 180 / steps, d = p.len / steps;
      for (let k = 0; k < steps; k++) { a += da; x += Math.sin(a) * d; z += Math.cos(a) * d; pts.push([x, z]); }
    }
  }
  return pts;
}

function trace(g, v, x, y, w, h) {
  const pts = outline(v);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [px, pz] of pts) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); z0 = Math.min(z0, pz); z1 = Math.max(z1, pz); }
  const k = Math.min(w / Math.max(1, x1 - x0), h / Math.max(1, z1 - z0));
  const ox = x + (w - (x1 - x0) * k) / 2, oy = y + (h - (z1 - z0) * k) / 2;
  const P = ([px, pz]) => [ox + (px - x0) * k, oy + (z1 - pz) * k];
  g.beginPath();
  pts.forEach((p, i) => { const [qx, qy] = P(p); if (i) g.lineTo(qx, qy); else g.moveTo(qx, qy); });
  if (v.circuit) g.closePath();
  g.lineWidth = 14; g.lineJoin = 'round'; g.lineCap = 'round';
  g.stroke();
  const [sx, sy] = P(pts[0]);
  g.fillRect(sx - 4, sy - 22, 8, 44);
}

export function drawFloor(g, glow, f) {
  const { w, h } = FLOOR;
  g.clearRect(0, 0, w, h);
  glow.clearRect(0, 0, w, h);
  const hits = [], bw = 800, gap = 80, x0 = (w - (bw * 3 + gap * 2)) / 2;
  f.venues.forEach((v, i) => {
    const x = x0 + i * (bw + gap), sel = f.active && i === f.index, here = v.id === f.current;
    const paint = sel ? '#f7f4ec' : 'rgba(236,232,222,0.74)', edge = sel ? '#ffd23f' : 'rgba(242,194,48,0.62)';
    g.fillStyle = sel ? 'rgba(14,16,22,0.78)' : 'rgba(14,16,22,0.62)';
    g.fillRect(x + 8, 32, bw - 16, h - 64);
    g.strokeStyle = edge; g.lineWidth = 16;
    g.strokeRect(x + 8, 8 + 24, bw - 16, h - 64);
    g.fillStyle = edge;
    for (const [cx, cy] of [[x + 8, 32], [x + bw - 8, 32], [x + 8, h - 32], [x + bw - 8, h - 32]]) g.fillRect(cx - 24, cy - 24, 48, 48);
    g.fillStyle = paint; g.strokeStyle = paint;
    const words = v.name.toUpperCase().split(' ');
    words.forEach((word, k) => put(g, word, x + bw / 2, 128 + k * 84, { size: 72, fam: DISPLAY, weight: 400, color: paint, align: 'center', gap: 4, max: bw - 120 }));
    g.fillStyle = paint; g.strokeStyle = paint;
    trace(g, VENUES[v.id], x + 120, 250, bw - 240, 300);
    put(g, v.place.toUpperCase(), x + bw / 2, 624, { size: 40, color: paint, align: 'center', gap: 8 });
    put(g, v.note.toUpperCase(), x + bw / 2, 684, { size: 38, color: paint, align: 'center', gap: 4 });
    if (here) put(g, 'LOADED', x + bw / 2, 744, { size: 38, weight: 700, color: paint, align: 'center', gap: 10 });
    else if (sel) put(g, 'ENTER  ·  LOAD', x + bw / 2, 744, { size: 38, weight: 700, color: paint, align: 'center', gap: 8 });
    if (sel) {
      glow.strokeStyle = C.redHot; glow.lineWidth = 8; glow.shadowColor = C.redHot; glow.shadowBlur = 20;
      glow.strokeRect(x + 24, 48, bw - 48, h - 96);
      glow.shadowBlur = 0;
    }
    if (here) { glow.fillStyle = C.cyan; glow.fillRect(x + bw / 2 - 90, 714, 180, 8); }
    hits.push({ x, y: 0, w: bw, h, row: i });
  });
  return hits;
}

const CHANNELS = [['CELL TEMP', C.orange, 0.7, 1.3], ['THRUST', C.cyan, 1.9, 2.6], ['GAS', C.good, 0.35, 0.9]];

export function drawTelemetry(g, data, now) {
  const { w, h } = TELE;
  clear(g, w, h, '#0a0d14', '#04050a');
  put(g, 'PIT WALL', 40, 58, { size: 30, fam: DISPLAY, weight: 400, gap: 10 });
  put(g, 'TEAM VOLTITUDE · ROCKET RANGE', 300, 56, { size: 24, color: C.ink3, gap: 6 });
  g.fillStyle = C.redHot;
  if (Math.floor(now * 1.5) % 2) { g.beginPath(); g.arc(w - 150, 46, 9, 0, Math.PI * 2); g.fill(); }
  put(g, 'LIVE', w - 40, 56, { size: 26, weight: 700, color: C.redHot, align: 'right', gap: 6 });
  g.fillStyle = C.hair; g.fillRect(40, 82, w - 80, 2);
  data.venues.forEach((v, i) => {
    const y = 136 + i * 62, [set, total] = v.note.split(' of ').map((n) => parseInt(n, 10));
    put(g, v.name.toUpperCase(), 40, y, { size: 24, fam: DISPLAY, weight: 400, color: v.id === data.current ? C.ink : C.ink3, max: 300 });
    g.fillStyle = C.ink4; g.fillRect(40, y + 14, 320, 8);
    g.fillStyle = v.id === data.current ? C.yellow : C.ink3; g.fillRect(40, y + 14, 320 * (set / total || 0), 8);
    put(g, `${set}/${total}`, 400, y + 8, { size: 26, weight: 700, color: C.ink2, align: 'right' });
  });
  data.rows.slice(0, 5).forEach((ev, i) => {
    const y = 136 + i * 62;
    put(g, ev.tag, 460, y, { size: 22, fam: DISPLAY, weight: 400, color: C.ink3 });
    put(g, ev.name.toUpperCase(), 540, y, { size: 24, fam: DISPLAY, weight: 400, color: C.ink2, max: 250 });
    put(g, ev.best || '—', 900, y, { size: 28, weight: 700, color: ev.best ? C.ink : C.ink4, align: 'right' });
    dot(g, 930, y - 9, 10, ev.medal && ev.medal.id);
  });
  const x0 = 980, x1 = w - 40, gw = x1 - x0;
  CHANNELS.forEach(([name, color, f1, f2], k) => {
    const top = 104 + k * 132, mid = top + 66;
    put(g, name, x0, top + 22, { size: 20, color: C.ink3, gap: 4 });
    g.fillStyle = C.hair; g.fillRect(x0, top + 120, gw, 1);
    g.strokeStyle = color; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= gw; x += 6) {
      const t = now * 0.8 - (gw - x) / gw * 6;
      const y = mid - 40 * (Math.sin(t * f1 + k) * 0.6 + Math.sin(t * f2 * 1.7 + k * 3) * 0.3 + Math.sin(t * 7.3 + k) * 0.1);
      if (x) g.lineTo(x0 + x, y); else g.moveTo(x0 + x, y);
    }
    g.stroke();
    g.fillStyle = color; g.beginPath(); g.arc(x1, mid - 40 * (Math.sin(now * 0.8 * f1 + k) * 0.6 + Math.sin(now * 0.8 * f2 * 1.7 + k * 3) * 0.3 + Math.sin(now * 0.8 * 7.3 + k) * 0.1), 6, 0, Math.PI * 2); g.fill();
  });
}
