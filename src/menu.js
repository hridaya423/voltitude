import { ACTIONS, DEFAULT_KEYS, keyLabel } from './input.js';
import { fmt } from './time.js';
import { raceClock } from './sim/race.js';

export const SETTINGS = [
  { key: 'assist', label: 'Landing assist', note: 'Levels the car in the air. Hold brake in the air to flip', type: 'toggle' },
  { key: 'cue', label: 'Brake cue', note: 'Shows BRAKE above the speed when you are too fast for the next corner', type: 'toggle' },
  { key: 'invertPitch', label: 'Invert air pitch', note: 'Pull back to nose down', type: 'toggle' },
  { key: 'ghost', label: 'Ghost', note: 'Race your best run, or the author’s until you have one', type: 'toggle' },
  { key: 'tier', label: 'Difficulty', note: 'Rival pace in Grand Prix. Rivals never slow down to wait for you', type: 'choice', options: [['rookie', 'ROOKIE'], ['easy', 'EASY'], ['pro', 'PRO'], ['elite', 'ELITE']] },
  { key: 'units', label: 'Units', type: 'choice', options: [['mph', 'MPH'], ['kmh', 'KM/H']] },
  { key: 'session', label: 'Session', note: 'Low desert sun, high afternoon or floodlit night. Reloads the game', type: 'choice', options: [['golden', 'GOLDEN HOUR'], ['day', 'DAY'], ['night', 'NIGHT']] },
  { key: 'quality', label: 'Car detail', note: 'Reloads the game', type: 'choice', options: [['low', 'LOW'], ['medium', 'MEDIUM'], ['high', 'HIGH']] },
  { key: 'reduced', label: 'Reduced motion', note: 'Camera cuts instead of moving. No shake or FOV kick', type: 'toggle' },
  { key: 'rumble', label: 'Rumble', type: 'toggle' },
  { key: 'volume', label: 'Volume', type: 'slider' },
  { key: 'music', label: 'Music', type: 'slider' },
  { key: 'callsign', label: 'Callsign', note: 'Your name on the boards. Enter, type it, Enter to keep', type: 'text' },
  { id: 'keys', label: 'Controls', note: 'Rebind the keyboard', type: 'link' },
  { id: 'back', label: 'Done', type: 'link' },
];

export const PAUSE = [
  { id: 'resume', label: 'Resume', key: 'Esc' },
  { id: 'restart', label: 'Restart', key: 'R' },
  { id: 'settings', label: 'Settings', key: 'O' },
  { id: 'quit', label: 'Quit to garage', key: '' },
];

export const RESULT_ACTIONS = [
  { id: 'retry', label: 'Retry', key: 'R' },
  { id: 'next', label: 'Next', key: 'N' },
  { id: 'replay', label: 'Replay', key: 'V' },
  { id: 'share', label: 'Share', key: 'C' },
  { id: 'board', label: 'Board', key: 'L' },
  { id: 'quit', label: 'Garage', key: 'Esc' },
];

export function pauseView(race, ev, venueName) {
  const lap = Math.min(race.laps.length + 1, ev.laps);
  const lines = [{ label: 'Time', value: fmt(raceClock(race)) }];
  if (ev.circuit) lines.push({ label: 'Lap', value: ev.kind === 'pr' ? `${lap}` : `${lap} of ${ev.laps}` });
  else lines.push({ label: 'Checkpoint', value: `${Math.min(race.next, ev.cps.length - 1)} of ${ev.cps.length - 1}` });
  if (ev.kind === 'gp') lines.push({ label: 'Position', value: `P${race.pos} of ${race.entries.length}` });
  return { title: 'PAUSED', sub: `${venueName} · ${ev.name}`, lines };
}

export const KEY_ROWS = 6;
const STEP = 0.1;

export function createMenu({ settings, data, on }) {
  const s = { base: 'board', page: null, index: { board: 0, venue: 0, settings: 0, keys: 0, pause: 0, results: 0, leaders: 0 }, listening: null, draft: '', from: 'board', results: null, dirty: true, venueId: null };
  const events = () => data.events();
  const venues = () => data.venues();
  const nextOk = () => !!s.results?.hasNext;
  const leaders = () => { const b = data.leaders(); return [...b.rows, ...b.around]; };
  const rows = {
    board: () => events().length,
    venue: () => venues().length,
    settings: () => SETTINGS.length,
    keys: () => ACTIONS.length + 2,
    pause: () => PAUSE.length,
    results: () => RESULT_ACTIONS.length,
    leaders: () => leaders().length,
  };
  const disabled = (page, i) => page === 'results' && ((RESULT_ACTIONS[i].id === 'next' && !nextOk()) || (RESULT_ACTIONS[i].id === 'board' && !s.results?.board));
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
  function openLeaders() {
    if (!(s.page === 'results' ? !!s.results?.board && on.leaders(null) : s.page === 'board' && on.leaders(s.index.board))) { on.sound('deny'); return; }
    s.from = s.base; s.base = 'leaders'; s.index.leaders = 0;
    go('leaders'); touch('confirm');
  }
  function leaveLeaders() { s.base = s.from; go(s.from); touch('back'); }

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
      else if (row.type === 'text') { s.listening = row.key; s.draft = settings[row.key]; touch('confirm'); }
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
      else if (id === 'share') on.share();
      else if (id === 'board') openLeaders();
      else on.quit();
    } else if (page === 'leaders') {
      if (i < leaders().length) on.race(i); else on.sound('deny');
    }
  }
  function back() {
    const page = s.page;
    if (page === 'venue') { go('board'); touch('back'); }
    else if (page === 'settings') leaveSettings();
    else if (page === 'keys') { go('settings'); touch('back'); }
    else if (page === 'pause') on.resume();
    else if (page === 'results') on.quit();
    else if (page === 'leaders') leaveLeaders();
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
        else if (page === 'leaders') { if (on.page(dir)) { s.index.leaders = 0; touch('move'); } else on.sound('deny'); }
      } else if (name === 'confirm') activate();
      else if (name === 'back') back();
      else if (name === 'venue' && page === 'board') enterVenue(0);
      else if (name === 'settings' && (page === 'board' || page === 'pause')) { go('settings'); touch('confirm'); }
      else if (name === 'next' && page === 'results') { if (nextOk()) on.next(); else on.sound('deny'); }
      else if (name === 'replay' && page === 'results') on.replay();
      else if (name === 'share' && page === 'results') on.share();
      else if (name === 'leaders' && (page === 'board' || page === 'results')) openLeaders();
      else if (name === 'scope' && page === 'leaders') { if (on.scope()) { s.index.leaders = 0; touch('move'); } else on.sound('deny'); }
    },
    point(zone, hit, click) {
      if (s.listening === 'callsign' && click) { api.capture('Enter', 'Enter'); return; }
      if (!s.page || s.listening) return;
      const page = s.page;
      if (zone === 'board') {
        if (hit?.act) { if (click) api.command(hit.act); return; }
        if (page === 'board' || page === 'pause' || page === 'results' || page === 'leaders') {
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
    capture(code, key = '') {
      if (!s.listening) return false;
      const action = s.listening;
      if (action === 'callsign') {
        if (code === 'Backspace') s.draft = s.draft.slice(0, -1);
        else if (/^[\w .-]$/.test(key) && s.draft.length < 16) s.draft += key;
        else if (code === 'Enter' || code === 'Escape') {
          s.listening = null;
          if (code === 'Enter' && s.draft.trim()) { settings.callsign = s.draft.trim(); on.change('callsign'); }
          touch('confirm');
        }
        s.dirty = true;
        return true;
      }
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
      const legend = [[[lk('throttle'), lk('brake')], 'drive'], [[lk('left'), lk('right')], 'steer'], [[lk('boost')], 'boost'], [[lk('lift')], 'hop · hover'], [[lk('slide')], 'slide'], [[lk('rollLeft'), lk('rollRight')], 'air roll'], [[lk('reset')], 'reset'], [[lk('restart')], 'restart']];
      const board = s.base === 'pause' ? { kind: 'pause', ...data.pause(), rows: PAUSE, index: s.index.pause }
        : s.base === 'results' && s.results ? { kind: 'results', ...s.results, actions: RESULT_ACTIONS.map((a, i) => ({ ...a, off: disabled('results', i) })), index: s.index.results }
        : s.base === 'leaders' ? { kind: 'leaders', ...data.leaders(), index: Math.min(s.index.leaders, Math.max(0, leaders().length - 1)) }
          : { kind: 'modes', venue: cur, rows: list, index: s.index.board, detail: ev, legend, circuit: list.some((e) => e.circuit) };
      const setRows = SETTINGS.map((r) => ({ ...r, value: r.type === 'choice' ? (r.options.find((o) => o[0] === settings[r.key]) || r.options[0])[1] : r.type === 'text' && s.listening === r.key ? s.draft : settings[r.key] }));
      const keyRows = [...ACTIONS.map(([id, label]) => ({ id, label, value: (settings.keys[id] || []).map(keyLabel).join(' / ') || '—' })), { id: 'reset', label: 'Reset to defaults' }, { id: 'back', label: 'Done' }];
      const tyre = s.page === 'keys' ? { kind: 'keys', rows: keyRows, index: s.index.keys, listening: s.listening } : { kind: 'settings', rows: setRows, index: s.index.settings, listening: s.listening === 'callsign' ? 'callsign' : null };
      const zone = { board: 'board', pause: 'board', results: 'board', leaders: 'board', venue: 'floor', settings: 'tyre', keys: 'tyre' }[s.page] || 'board';
      return { page: s.page, base: s.base, zone, board, floor: { venues: venueList, index: s.index.venue, current: cur.id, active: s.page === 'venue' }, tyre };
    },
  };
  return api;
}

export const DARE_MEDALS = {
  lineup: [['author', 'Author', 36], ['gold', 'Gold', 21], ['silver', 'Silver', 10], ['bronze', 'Bronze', 3]],
  ramp: [['author', 'Author', 1000], ['gold', 'Gold', 700], ['silver', 'Silver', 500], ['bronze', 'Bronze', 300]],
};

export function dareMedal(id, score) {
  const m = (DARE_MEDALS[id] || []).find((x) => score >= x[2]);
  return m ? { id: m[0], name: m[1] } : null;
}

export function dareResults({ card, score, best, line, clears, speed, hasNext = false }) {
  const delta = !best ? { text: '', tone: '' }
    : score > best ? { text: `New best · +${score - best}`, tone: 'good' }
      : { text: score === best ? 'Equal to your best' : `${best - score} short of your best`, tone: score === best ? 'good' : 'bad' };
  return {
    card, dare: true, pos: 0, field: 1, medal: null, label: 'SCORE', time: `${score}`, line, delta, note: '',
    title: 'CLEARS',
    rows: clears.map((c) => ({ label: `Line ${c.count}`, value: `+${c.count * c.mult}`, tag: c.hard ? 'HARD' : c.mult > 1 ? `×${c.mult}` : '', tone: c.hard ? 'bad' : 'good' })),
    stats: [{ label: 'Best', value: `${Math.max(score, best)}` }, { label: 'Cleared', value: `${clears.reduce((n, c) => n + c.count, 0)}` }, { label: 'Top speed', value: speed }],
    hasNext,
  };
}

export function rampResults({ card, score, best, tries, speed, hasNext = false }) {
  const r = dareResults({ card, score, best, line: 0, clears: [], speed, hasNext });
  const why = { wreck: 'Wrecked', stall: 'Stalled', reset: 'Reset' };
  return {
    ...r, line: `${tries.filter((t) => !t.why).length}/${tries.length}`, lineLabel: 'LANDED', title: 'TRIES',
    rows: tries.map((t, k) => ({ label: `Try ${k + 1}`, value: `+${t.points}`, tag: t.why ? why[t.why] : `${Math.round(t.align * 100)}% · ${Math.round(t.kept * 100)}%${t.rolls ? ` · ${t.rolls}R` : ''}`, tone: t.why ? 'bad' : 'good' })),
    stats: [{ label: 'Best', value: `${Math.max(score, best)}` }, { label: 'Rolls', value: `${tries.reduce((n, t) => n + (t.rolls || 0), 0)}` }, { label: 'Top speed', value: speed }],
  };
}

export function describe(view) {
  const { page, board, floor, tyre } = view;
  if (page === 'venue') { const v = floor.venues[floor.index]; return `Venue ${v.name}, ${v.place}. ${v.note}.${v.id === floor.current ? ' Loaded.' : ' Press Enter to load.'}`; }
  if (page === 'settings' || page === 'keys') {
    const r = tyre.rows[tyre.index];
    if (tyre.listening === 'callsign') return `Callsign ${r.value}. Type a name. Enter keeps it, Escape cancels.`;
    if (tyre.listening) return `Press the new key for ${r.label.split(' \u00b7 ')[0]}.`;
    const value = r.type === 'toggle' ? (r.value ? 'on' : 'off') : r.type === 'slider' ? `${Math.round(r.value * 100)} percent` : r.value || '';
    return `${page === 'keys' ? 'Controls' : 'Settings'}. ${r.label.split(' \u00b7 ')[0]} ${value}. ${r.note || ''}`;
  }
  if (board.kind === 'results' && board.dare) return `Results. Score ${board.time}. ${board.lineLabel ? `Landed ${board.line}` : `Line ${board.line}`}. ${board.delta.text ? `${board.delta.text}. ` : ''}${board.note ? `${board.note}. ` : ''}${board.actions[board.index].label}.`;
  if (board.kind === 'results') return `Results. ${board.pos ? `Position ${board.pos} of ${board.field}. ` : ''}Time ${board.time}. ${board.delta.text ? `${board.delta.text}. ` : ''}${board.note || ''} ${board.actions[board.index].label}.`;
  if (board.kind === 'pause') return `Paused. ${board.rows[board.index].label}.`;
  if (board.kind === 'leaders') { const r = [...board.rows, ...board.around][board.index]; return `Leaderboard. ${board.title}, ${board.scope === 'day' ? 'daily' : 'all-time'}. ${board.message || `${board.mine ? `You are ${board.mine}. ` : ''}${r ? `Rank ${r.rank}, ${r.name}, ${r.value}. Enter races this ghost.` : ''}`}`; }
  const e = board.rows[board.index];
  return `${board.venue.name}. ${e.name}. ${e.kicker}. ${e.brief} ${e.best ? `Best ${e.best}.` : 'No result yet.'}`;
}
