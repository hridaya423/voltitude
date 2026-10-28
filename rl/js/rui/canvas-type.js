export const CANVAS_TEXT = '"Saira", "Eurostile", "Bahnschrift", "Helvetica Neue", Arial, sans-serif';
export const CANVAS_LEGEND = '"Michroma", "Eurostile Extended", "Eurostile", "Helvetica Neue", Arial, sans-serif';
let epoch = 0, asked = false;
const subs = new Set();
function bump() {
epoch++;
for (const cb of subs) { try { cb(epoch); } catch (_) {   } }
}
export function ensureCanvasFonts() {
if (asked) return;
asked = true;
const fs = typeof document !== 'undefined' ? document.fonts : null;
if (!fs || typeof fs.load !== 'function') return;
try { fs.addEventListener('loadingdone', bump); } catch (_) {   }
for (const f of ['400 32px Michroma', '600 expanded 32px Saira', '600 semi-condensed 32px Saira', '700 semi-condensed 32px Saira']) {
try { fs.load(f).then((list) => { if (list && list.length) bump(); }, () => {}); } catch (_) {   }
}
}
export function canvasFontEpoch() { ensureCanvasFonts(); return epoch; }
export function onCanvasFonts(cb) { ensureCanvasFonts(); subs.add(cb); return () => subs.delete(cb); }
export function roleOf(str) {
const s = String(str);
if (/[0-9°%]/.test(s)) return 'num';
if (/[A-Z]/.test(s) && !/[a-z]/.test(s)) return 'legend';
return 'text';
}
const clampW = (w) => Math.max(400, Math.min(700, Math.round((+w || 600) / 50) * 50));
export function setFace(g, size, weight, role = 'text', text = CANVAS_TEXT) {
let fam = text || CANVAS_TEXT, w, sz = +size || 12, st = 'semi-condensed', ls = 0;
if (role === 'legend') { fam = CANVAS_LEGEND; w = 400; sz *= 0.9; st = 'normal'; ls = 0.1 * sz; }
else if (role === 'num') { w = (+weight || 600) >= 800 ? 700 : 600; st = sz >= 40 ? 'expanded' : 'semi-condensed'; }
else w = clampW(weight);
g.font = `${w} ${Math.round(sz * 100) / 100}px ${fam}`;
if ('fontStretch' in g) g.fontStretch = st;
if ('letterSpacing' in g) g.letterSpacing = ls ? `${ls.toFixed(2)}px` : '0px';
else ls = 0;
return ls;
}
export function resetFace(g) {
if ('letterSpacing' in g) g.letterSpacing = '0px';
if ('fontStretch' in g) g.fontStretch = 'normal';
}
const cells = new Map();
function cellW(g) {
const key = epoch + '|' + g.font + '|' + (g.fontStretch || '');
let w = cells.get(key);
if (w === undefined) {
w = 0;
for (let d = 0; d <= 9; d++) w = Math.max(w, g.measureText(String(d)).width);
if (cells.size > 96) cells.clear();
cells.set(key, w);
}
return w;
}
const isDigit = (c) => c >= 48 && c <= 57;
export function measureTabular(g, str) {
const s = String(str), cw = cellW(g);
let total = 0;
for (let i = 0; i < s.length;) {
if (isDigit(s.charCodeAt(i))) { total += cw; i++; continue; }
let j = i + 1;
while (j < s.length && !isDigit(s.charCodeAt(j))) j++;
total += g.measureText(s.slice(i, j)).width;
i = j;
}
return total;
}
export function fillTabular(g, str, x, y, align = g.textAlign) {
const s = String(str), cw = cellW(g);
const total = measureTabular(g, s);
let cx = align === 'center' ? x - total / 2 : (align === 'right' || align === 'end') ? x - total : x;
const prev = g.textAlign;
g.textAlign = 'left';
for (let i = 0; i < s.length;) {
if (isDigit(s.charCodeAt(i))) {
const ch = s[i];
g.fillText(ch, cx + (cw - g.measureText(ch).width) / 2, y);
cx += cw; i++;
continue;
}
let j = i + 1;
while (j < s.length && !isDigit(s.charCodeAt(j))) j++;
const run = s.slice(i, j);
g.fillText(run, cx, y);
cx += g.measureText(run).width;
i = j;
}
g.textAlign = prev;
return total;
}
export function fillRole(g, str, x, y, size, weight, align = 'left', text = CANVAS_TEXT) {
const s = String(str == null ? '' : str);
if (!s) return 0;
const role = roleOf(s);
const ls = setFace(g, size, weight, role, text);
let w;
if (role === 'num') w = fillTabular(g, s, x, y, align);
else {
g.textAlign = align;
const dx = ls ? (align === 'center' ? ls / 2 : (align === 'right' || align === 'end') ? ls : 0) : 0;
g.fillText(s, x + dx, y);
w = g.measureText(s).width - ls;
}
resetFace(g);
return w;
}
export function measureRole(g, str, size, weight, text = CANVAS_TEXT) {
const s = String(str == null ? '' : str);
if (!s) return 0;
const role = roleOf(s);
const ls = setFace(g, size, weight, role, text);
const w = role === 'num' ? measureTabular(g, s) : g.measureText(s).width - ls;
resetFace(g);
return w;
}
