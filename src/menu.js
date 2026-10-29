import { ACTIONS, DEFAULT_KEYS, keyLabel } from './input.js';

export const SETTINGS = [
  { key: 'assist', label: 'Landing assist', note: 'Levels the car in the air. Throttle and brake tilt the nose', type: 'toggle' },
  { key: 'invertPitch', label: 'Invert air pitch', note: 'Pull back to nose down', type: 'toggle' },
  { key: 'ghost', label: 'Ghost', note: 'Race your best run, or the author’s until you have one', type: 'toggle' },
  { key: 'tier', label: 'Difficulty', note: 'Rival pace in Grand Prix. Rivals never slow down to wait for you', type: 'choice', options: [['easy', 'EASY'], ['pro', 'PRO'], ['elite', 'ELITE']] },
  { key: 'units', label: 'Units', type: 'choice', options: [['mph', 'MPH'], ['kmh', 'KM/H']] },
  { key: 'session', label: 'Session', note: 'Floodlit night or desert golden hour. Reloads the game', type: 'choice', options: [['night', 'NIGHT'], ['day', 'DAY']] },
  { key: 'quality', label: 'Car detail', note: 'Reloads the game', type: 'choice', options: [['low', 'LOW'], ['medium', 'MEDIUM'], ['high', 'HIGH']] },
  { key: 'reduced', label: 'Reduced motion', note: 'Camera cuts instead of moving. No shake or FOV kick', type: 'toggle' },
  { key: 'rumble', label: 'Rumble', type: 'toggle' },
  { key: 'volume', label: 'Volume', type: 'slider' },
  { key: 'music', label: 'Music', type: 'slider' },
  { id: 'keys', label: 'Controls', note: 'Rebind the keyboard', type: 'link' },
  { id: 'back', label: 'Done', type: 'link' },
];

export const PAUSE = [
  { id: 'resume', label: 'Resume', key: 'Esc' },
  { id: 'restart', label: 'Restart', key: 'R' },
  { id: 'settings', label: 'Settings', key: 'S' },
  { id: 'quit', label: 'Quit to garage', key: '' },
];

export const RESULT_ACTIONS = [
  { id: 'retry', label: 'Retry', key: 'R' },
  { id: 'next', label: 'Next', key: 'N' },
  { id: 'replay', label: 'Replay', key: 'V' },
  { id: 'quit', label: 'Garage', key: 'Esc' },
];

export const KEY_ROWS = 6;
const STEP = 0.1;

export function createMenu({ settings, data, on }) {
  const s = { base: 'board', page: null, index: { board: 0, venue: 0, settings: 0, keys: 0, pause: 0, results: 0 }, listening: null, results: null, dirty: true, venueId: null };
  const events = () => data.events();
  const venues = () => data.venues();
  const nextOk = () => !!s.results?.hasNext;
  const rows = {
    board: () => events().length,
    venue: () => venues().length,
    settings: () => SETTINGS.length,
    keys: () => ACTIONS.length + 2,
    pause: () => PAUSE.length,
    results: () => RESULT_ACTIONS.length,
  };
  const disabled = (page, i) => page === 'results' && RESULT_ACTIONS[i].id === 'next' && !nextOk();
  const touch = (sound) => { s.dirty = true; if (sound) on.sound(sound); };

  function go(page) { if (s.page !== page) { s.page = page; touch(); } }
  function move(delta) {
    const n = rows[s.page](), cur = s.index[s.page];
    let i = cur;
    for (let k = 0; k < n; k++) { i = (i + delta + n) % n; if (!disabled(s.page, i)) break; }
    if (i !== cur) { s.index[s.page] = i; touch('move'); }
  }
  function jump(i) {
    const n = rows[s.page](), j = Math.max(0, Math.min(n - 1, i));
    if (j !== s.index[s.page] && !disabled(s.page, j)) { s.index[s.page] = j; touch('move'); }
  }
  function enterVenue(dir) {
    const list = venues(), at = list.findIndex((v) => v.id === s.venueId);
    s.index.venue = ((at < 0 ? 0 : at) + dir + list.length) % list.length;
    go('venue');
    touch('move');
  }
  function adjust(dir) {
    const row = SETTINGS[s.index.settings];
    if (row.type === 'toggle') settings[row.key] = !settings[row.key];
    else if (row.type === 'choice') {
      const at = row.options.findIndex((o) => o[0] === settings[row.key]);
      settings[row.key] = row.options[(at + dir + row.options.length) % row.options.length][0];
    } else if (row.type === 'slider') settings[row.key] = Math.max(0, Math.min(1, Math.round((settings[row.key] + dir * STEP) * 100) / 100));
    else return;
    touch('move');
    on.change(row.key);
  }
  function leaveSettings() { go(s.base); touch('back'); }

  function activate() {
    const page = s.page, i = s.index[page];
    if (disabled(page, i)) { on.sound('deny'); return; }
    if (page === 'board') { on.sound('drive'); on.drive(i); }
    else if (page === 'venue') {
      const v = venues()[i];
      if (v.id === s.venueId) { go('board'); touch('confirm'); } else { on.sound('confirm'); on.venue(v.id); }
    } else if (page === 'settings') {
      const row = SETTINGS[i];
      if (row.id === 'keys') { go('keys'); touch('confirm'); }
      else if (row.id === 'back') leaveSettings();
      else adjust(1);
    } else if (page === 'keys') {
      if (i < ACTIONS.length) { s.listening = ACTIONS[i][0]; touch('confirm'); }
      else if (i === ACTIONS.length) { settings.keys = structuredClone(DEFAULT_KEYS); touch('confirm'); on.keys(); }
      else { go('settings'); touch('back'); }
    } else if (page === 'pause') {
      const id = PAUSE[i].id;
      if (id === 'resume') on.resume();
      else if (id === 'restart') on.restart();
      else if (id === 'settings') { go('settings'); touch('confirm'); }
      else on.quit();
    } else if (page === 'results') {
      const id = RESULT_ACTIONS[i].id;
      if (id === 'retry') on.restart();
      else if (id === 'next') on.next();
      else if (id === 'replay') on.replay();
      else on.quit();
    }
  }
  function back() {
    const page = s.page;
    if (page === 'venue') { go('board'); touch('back'); }
    else if (page === 'settings') leaveSettings();
    else if (page === 'keys') { go('settings'); touch('back'); }
    else if (page === 'pause') on.resume();
    else if (page === 'results') on.quit();
  }

  const api = {
    get page() { return s.page; },
    get base() { return s.base; },
    get listening() { return s.listening; },
    get selected() { return s.index.board; },
    get dirty() { return s.dirty; },
    clean() { s.dirty = false; },
    open(base, { index, results, venueId } = {}) {
      s.base = base;
      if (venueId) s.venueId = venueId;
      if (index !== undefined) s.index[base] = index;
      if (results) { s.results = results; s.index.results = 0; }
      if (base === 'pause') s.index.pause = 0;
      s.listening = null;
      go(base);
      touch();
    },
    close() { s.page = null; s.listening = null; touch(); },
    setVenue(id) { s.venueId = id; touch(); },
    refresh() { touch(); },
    command(name) {
      if (!s.page || s.listening) return;
      const page = s.page;
      if (name === 'up') { if (page === 'venue') { go('board'); touch('back'); } else move(-1); }
      else if (name === 'down') { if (page === 'venue') { go('board'); touch('back'); } else move(1); }
      else if (name === 'left' || name === 'right') {
        const dir = name === 'left' ? -1 : 1;
        if (page === 'board') enterVenue(dir);
        else if (page === 'venue') move(dir);
        else if (page === 'settings') adjust(dir);
        else if (page === 'keys') jump(s.index.keys + dir * KEY_ROWS);
        else if (page === 'results') move(dir);
      } else if (name === 'confirm') activate();
      else if (name === 'back') back();
      else if (name === 'venue' && page === 'board') enterVenue(0);
      else if (name === 'settings' && (page === 'board' || page === 'pause')) { go('settings'); touch('confirm'); }
      else if (name === 'next' && page === 'results') { if (nextOk()) on.next(); else on.sound('deny'); }
      else if (name === 'replay' && page === 'results') on.replay();
    },
    point(zone, hit, click) {
      if (!s.page || s.listening) return;
      const page = s.page;
      if (zone === 'board') {
        if (page === 'board' || page === 'pause' || page === 'results') {
          if (hit?.row === undefined) return;
          if (hit.row !== s.index[page]) { if (disabled(page, hit.row)) return; s.index[page] = hit.row; touch(); }
          if (click) activate();
        } else if (click) { if (page === 'venue') go('board'); else if (page === 'settings') leaveSettings(); else go('settings'); touch('back'); }
      } else if (zone === 'floor') {
        if (page !== 'board' && page !== 'venue') return;
        if (page === 'board') { if (!click) return; go('venue'); touch('move'); }
        if (hit?.row === undefined) return;
        const was = s.index.venue;
        s.index.venue = hit.row;
        s.dirty = true;
        if (click && was === hit.row && page === 'venue') activate();
      } else if (zone === 'tyre') {
        if (page === 'board' || page === 'pause') { if (click) { go('settings'); touch('confirm'); } return; }
        if (page !== 'settings' && page !== 'keys') return;
        if (hit?.row === undefined) return;
        s.index[page] = hit.row;
        s.dirty = true;
        if (page === 'settings' && SETTINGS[hit.row].type === 'slider' && click && hit.fx !== undefined) {
          const row = SETTINGS[hit.row];
          settings[row.key] = Math.round(Math.max(0, Math.min(1, hit.fx)) / STEP) * STEP;
          settings[row.key] = Math.round(settings[row.key] * 100) / 100;
          touch('move');
          on.change(row.key);
        } else if (click) activate();
      }
    },
    capture(code) {
      if (!s.listening) return false;
      const action = s.listening;
      s.listening = null;
      if (code !== 'Escape') {
        for (const a in settings.keys) settings.keys[a] = settings.keys[a].filter((k) => k !== code);
        settings.keys[action] = [code];
        on.keys();
      }
      touch('confirm');
      return true;
    },
    view() {
      const list = events(), venueList = venues(), cur = venueList.find((v) => v.id === s.venueId) || venueList[0];
      const ev = list[s.index.board] || list[0];
      const lk = (a) => keyLabel((settings.keys[a] || [])[0]);
      const legend = [[[lk('throttle'), lk('brake')], 'drive'], [[lk('left'), lk('right')], 'steer'], [[lk('boost')], 'boost'], [[lk('rollLeft'), lk('rollRight')], 'air roll'], [[lk('restart')], 'restart']];
      const board = s.base === 'pause' ? { kind: 'pause', ...data.pause(), rows: PAUSE, index: s.index.pause }
        : s.base === 'results' && s.results ? { kind: 'results', ...s.results, actions: RESULT_ACTIONS.map((a) => ({ ...a, off: a.id === 'next' && !nextOk() })), index: s.index.results }
          : { kind: 'modes', venue: cur, rows: list, index: s.index.board, detail: ev, legend, circuit: list.some((e) => e.circuit) };
      const setRows = SETTINGS.map((r) => ({ ...r, value: r.type === 'choice' ? (r.options.find((o) => o[0] === settings[r.key]) || r.options[0])[1] : settings[r.key] }));
      const keyRows = [...ACTIONS.map(([id, label]) => ({ id, label, value: (settings.keys[id] || []).map(keyLabel).join(' / ') || '—' })), { id: 'reset', label: 'Reset to defaults' }, { id: 'back', label: 'Done' }];
      const tyre = s.page === 'keys' ? { kind: 'keys', rows: keyRows, index: s.index.keys, listening: s.listening } : { kind: 'settings', rows: setRows, index: s.index.settings, listening: null };
      const zone = { board: 'board', pause: 'board', results: 'board', venue: 'floor', settings: 'tyre', keys: 'tyre' }[s.page] || 'board';
      return { page: s.page, base: s.base, zone, board, floor: { venues: venueList, index: s.index.venue, current: cur.id, active: s.page === 'venue' }, tyre };
    },
  };
  return api;
}

export function describe(view) {
  const { page, board, floor, tyre } = view;
  if (page === 'venue') { const v = floor.venues[floor.index]; return `Venue ${v.name}, ${v.place}. ${v.note}.${v.id === floor.current ? ' Loaded.' : ' Press Enter to load.'}`; }
  if (page === 'settings' || page === 'keys') {
    const r = tyre.rows[tyre.index];
    if (tyre.listening) return `Press the new key for ${r.label.split(' \u00b7 ')[0]}.`;
    const value = r.type === 'toggle' ? (r.value ? 'on' : 'off') : r.type === 'slider' ? `${Math.round(r.value * 100)} percent` : r.value || '';
    return `${page === 'keys' ? 'Controls' : 'Settings'}. ${r.label.split(' \u00b7 ')[0]} ${value}. ${r.note || ''}`;
  }
  if (board.kind === 'results') return `Results. ${board.pos ? `Position ${board.pos} of ${board.field}. ` : ''}Time ${board.time}. ${board.delta.text}. ${board.note || ''} ${board.actions[board.index].label}.`;
  if (board.kind === 'pause') return `Paused. ${board.rows[board.index].label}.`;
  const e = board.rows[board.index];
  return `${board.venue.name}. ${e.name}. ${e.kicker}. ${e.brief} ${e.best ? `Best ${e.best}.` : 'No result yet.'}`;
}
