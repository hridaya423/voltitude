import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenu, pauseView, dareResults, describe, SETTINGS, PAUSE, RESULT_ACTIONS, dareMedal, DARE_MEDALS } from '../src/menu.js';
import { loadWorld } from '../tools/load-world.mjs';
import { createRace, createInput, stepRace, eventsFor } from '../src/sim/race.js';
import { ACTIONS, DEFAULT_KEYS } from '../src/input.js';

const EVENTS = ['Grand Prix', 'Time Trial', 'Practice'].map((name, i) => ({ id: `e${i}`, name, tag: `T${i}`, best: '', medal: null, kicker: '', brief: '', ladder: [], bestLabel: '', circuit: true }));
const VENUES = [{ id: 'proving', name: 'Proving Ground', place: 'High desert', note: '0 of 3 set' }, { id: 'airfield', name: 'Airfield', place: 'Dry lakebed', note: '0 of 6 set' }, { id: 'launch', name: 'Launch Complex', place: 'Coastal pad', note: '0 of 6 set' }];

function setup(overrides = {}) {
  const calls = [];
  const settings = { assist: true, invertPitch: false, ghost: true, units: 'mph', quality: 'medium', session: 'night', reduced: false, rumble: true, volume: 0.7, music: 0.7, keys: structuredClone(DEFAULT_KEYS), ...overrides };
  const rec = (name) => (...args) => calls.push([name, ...args]);
  const menu = createMenu({
    settings,
    data: { events: () => EVENTS, venues: () => VENUES, pause: () => ({ title: 'PAUSED', sub: 'Proving Ground', lines: [] }) },
    on: { sound: rec('sound'), drive: rec('drive'), venue: rec('venue'), resume: rec('resume'), restart: rec('restart'), quit: rec('quit'), next: rec('next'), replay: rec('replay'), change: rec('change'), keys: rec('keys') },
  });
  menu.setVenue('proving');
  menu.open('board');
  const named = (n) => calls.filter((c) => c[0] === n);
  return { menu, settings, calls, named };
}

test('mode list wraps and drives the selected mode', () => {
  const { menu, named } = setup();
  menu.command('up');
  assert.equal(menu.selected, 2);
  menu.command('down');
  menu.command('down');
  assert.equal(menu.selected, 1);
  menu.command('confirm');
  assert.deepEqual(named('drive'), [['drive', 1]]);
});

test('left and right on the board fly to the floor markings, confirm loads another venue', () => {
  const { menu, named } = setup();
  menu.command('right');
  assert.equal(menu.page, 'venue');
  assert.equal(menu.view().zone, 'floor');
  assert.equal(menu.view().floor.index, 1);
  menu.command('confirm');
  assert.deepEqual(named('venue'), [['venue', 'airfield']]);
});

test('confirming the loaded venue returns to the board, back and up also return', () => {
  const { menu, named } = setup();
  menu.command('venue');
  assert.equal(menu.page, 'venue');
  menu.command('confirm');
  assert.equal(menu.page, 'board');
  assert.equal(named('venue').length, 0);
  menu.command('left');
  assert.equal(menu.view().floor.index, 2);
  menu.command('back');
  assert.equal(menu.page, 'board');
  menu.command('left');
  menu.command('up');
  assert.equal(menu.page, 'board');
});

test('settings rows toggle, cycle and step, and report each change', () => {
  const { menu, settings, named } = setup();
  menu.command('settings');
  assert.equal(menu.page, 'settings');
  assert.equal(menu.view().zone, 'tyre');
  menu.command('confirm');
  assert.equal(settings.assist, false);
  const at = (key) => SETTINGS.findIndex((r) => r.key === key);
  for (let i = 0; i < at('units'); i++) menu.command('down');
  menu.command('right');
  assert.equal(settings.units, 'kmh');
  menu.command('left');
  assert.equal(settings.units, 'mph');
  for (let i = at('units'); i < at('volume'); i++) menu.command('down');
  menu.command('right');
  assert.equal(settings.volume, 0.8);
  for (let i = 0; i < 10; i++) menu.command('right');
  assert.equal(settings.volume, 1);
  for (let i = 0; i < 20; i++) menu.command('left');
  assert.equal(settings.volume, 0);
  assert.deepEqual(named('change').map((c) => c[1]).slice(0, 3), ['assist', 'units', 'units']);
});

test('choice rows wrap around their options', () => {
  const { menu, settings } = setup({ quality: 'high' });
  menu.command('settings');
  const at = SETTINGS.findIndex((r) => r.key === 'quality');
  for (let i = 0; i < at; i++) menu.command('down');
  menu.command('right');
  assert.equal(settings.quality, 'low');
  menu.command('left');
  assert.equal(settings.quality, 'high');
});

test('settings opened from the board go back to the board, from pause back to pause', () => {
  const a = setup();
  a.menu.command('settings');
  a.menu.command('back');
  assert.equal(a.menu.page, 'board');
  const b = setup();
  b.menu.open('pause');
  b.menu.command('settings');
  assert.equal(b.menu.page, 'settings');
  b.menu.command('back');
  assert.equal(b.menu.page, 'pause');
  assert.equal(b.named('resume').length, 0);
});

test('rebinding takes the next key, steals it from other actions and Escape cancels', () => {
  const { menu, settings, named } = setup();
  menu.command('settings');
  const keysAt = SETTINGS.findIndex((r) => r.id === 'keys');
  for (let i = 0; i < keysAt; i++) menu.command('down');
  menu.command('confirm');
  assert.equal(menu.page, 'keys');
  assert.equal(menu.view().tyre.kind, 'keys');
  assert.equal(menu.listening, null);
  menu.command('confirm');
  assert.equal(menu.listening, ACTIONS[0][0]);
  menu.command('down');
  assert.equal(menu.view().tyre.index, 0);
  assert.equal(menu.capture('KeyZ'), true);
  assert.deepEqual(settings.keys.throttle, ['KeyZ']);
  assert.equal(named('keys').length, 1);
  menu.command('down');
  menu.command('confirm');
  assert.equal(menu.capture('KeyZ'), true);
  assert.deepEqual(settings.keys.throttle, []);
  assert.deepEqual(settings.keys.brake, ['KeyZ']);
  menu.command('confirm');
  menu.capture('Escape');
  assert.deepEqual(settings.keys.brake, ['KeyZ']);
  assert.equal(menu.capture('KeyQ'), false);
});

test('reset restores the default keys and Done returns to settings', () => {
  const { menu, settings, named } = setup();
  settings.keys.boost = ['KeyB'];
  menu.command('settings');
  const keysAt = SETTINGS.findIndex((r) => r.id === 'keys');
  for (let i = 0; i < keysAt; i++) menu.command('down');
  menu.command('confirm');
  for (let i = 0; i < ACTIONS.length; i++) menu.command('down');
  menu.command('confirm');
  assert.deepEqual(settings.keys, DEFAULT_KEYS);
  assert.equal(named('keys').length, 1);
  menu.command('down');
  menu.command('confirm');
  assert.equal(menu.page, 'settings');
});

test('the keys page jumps between its two columns', () => {
  const { menu } = setup();
  menu.command('settings');
  for (let i = 0; i < SETTINGS.findIndex((r) => r.id === 'keys'); i++) menu.command('down');
  menu.command('confirm');
  menu.command('right');
  assert.equal(menu.view().tyre.index, 6);
  menu.command('left');
  assert.equal(menu.view().tyre.index, 0);
});

test('navigation is ignored while a key is being captured', () => {
  const { menu } = setup();
  menu.command('settings');
  for (let i = 0; i < SETTINGS.findIndex((r) => r.id === 'keys'); i++) menu.command('down');
  menu.command('confirm');
  menu.command('confirm');
  menu.command('back');
  menu.command('down');
  assert.equal(menu.page, 'keys');
  assert.equal(menu.view().tyre.index, 0);
});

test('pause: resume, restart and quit; back resumes', () => {
  const { menu, named } = setup();
  menu.open('pause');
  assert.equal(menu.view().board.kind, 'pause');
  menu.command('confirm');
  assert.equal(named('resume').length, 1);
  menu.command('down');
  menu.command('confirm');
  assert.equal(named('restart').length, 1);
  menu.command('down');
  menu.command('down');
  menu.command('confirm');
  assert.equal(named('quit').length, 1);
  menu.command('back');
  assert.equal(named('resume').length, 2);
  assert.equal(PAUSE.length, 4);
});

test('results: retry is first, next is skipped when nothing follows, back leaves', () => {
  const { menu, named } = setup();
  menu.open('results', { results: { hasNext: false, title: 'LAPS', rows: [], stats: [], card: '', time: '', delta: { text: '', tone: '' } } });
  assert.equal(menu.view().board.kind, 'results');
  menu.command('right');
  assert.equal(RESULT_ACTIONS[menu.view().board.index].id, 'replay');
  menu.command('left');
  assert.equal(RESULT_ACTIONS[menu.view().board.index].id, 'retry');
  menu.command('next');
  assert.equal(named('next').length, 0);
  assert.equal(named('sound').at(-1)[1], 'deny');
  menu.command('confirm');
  assert.equal(named('restart').length, 1);
  menu.command('back');
  assert.equal(named('quit').length, 1);
});

test('results: next and replay act when available', () => {
  const { menu, named } = setup();
  menu.open('results', { results: { hasNext: true, title: 'LAPS', rows: [], stats: [], card: '', time: '', delta: { text: '', tone: '' } } });
  menu.command('next');
  menu.command('replay');
  assert.equal(named('next').length, 1);
  assert.equal(named('replay').length, 1);
  menu.command('right');
  assert.equal(RESULT_ACTIONS[menu.view().board.index].id, 'next');
});

test('results for a dare show score, best and the line reached, with no sector dots', () => {
  const clears = [{ count: 1, mult: 1, hard: false }, { count: 2, mult: 2, hard: false }, { count: 3, mult: 1, hard: true }];
  const r = dareResults({ card: 'The Pad · The Lineup', score: 8, best: 5, line: 4, clears, speed: '140 MPH', hasNext: true });
  assert.equal(r.dare, true);
  assert.equal(r.label, 'SCORE');
  assert.equal(r.time, '8');
  assert.equal(r.line, 4);
  assert.deepEqual(r.delta, { text: 'New best · +3', tone: 'good' });
  assert.deepEqual(r.rows.map((x) => [x.label, x.value, x.tag]), [['Line 1', '+1', ''], ['Line 2', '+4', '×2'], ['Line 3', '+3', 'HARD']]);
  assert.ok(r.rows.every((x) => !('dot' in x)));
  assert.deepEqual(r.stats.map((x) => [x.label, x.value]), [['Best', '8'], ['Cleared', '6'], ['Top speed', '140 MPH']]);
  assert.deepEqual(dareResults({ card: '', score: 2, best: 5, line: 2, clears: [], speed: '' }).delta, { text: '3 short of your best', tone: 'bad' });
  assert.equal(dareResults({ card: '', score: 0, best: 0, line: 1, clears: [], speed: '' }).delta.text, 'First time on the board');
  const { menu } = setup();
  menu.open('results', { results: r });
  assert.equal(describe(menu.view()), 'Results. Score 8. Line 4. New best · +3. Retry.');
});

test('pointer: hovering selects, clicking a mode drives it', () => {
  const { menu, named } = setup();
  menu.point('board', { row: 2 }, false);
  assert.equal(menu.selected, 2);
  assert.equal(named('drive').length, 0);
  menu.point('board', { row: 2 }, true);
  assert.deepEqual(named('drive'), [['drive', 2]]);
});

test('pointer: floor click opens the venue page, a second click loads it', () => {
  const { menu, named } = setup();
  menu.point('floor', { row: 2 }, false);
  assert.equal(menu.page, 'board');
  menu.point('floor', { row: 2 }, true);
  assert.equal(menu.page, 'venue');
  assert.equal(named('venue').length, 0);
  menu.point('floor', { row: 2 }, true);
  assert.deepEqual(named('venue'), [['venue', 'launch']]);
});

test('pointer: tyre screen opens settings and sliders take the click position', () => {
  const { menu, settings } = setup();
  menu.point('tyre', {}, true);
  assert.equal(menu.page, 'settings');
  const at = SETTINGS.findIndex((r) => r.key === 'music');
  menu.point('tyre', { row: at, fx: 0.31 }, true);
  assert.equal(settings.music, 0.3);
  menu.point('tyre', { row: at, fx: 1.4 }, true);
  assert.equal(settings.music, 1);
});

test('the view names the shot for each page', () => {
  const { menu } = setup();
  const zones = [];
  zones.push(menu.view().zone);
  menu.command('venue');
  zones.push(menu.view().zone);
  menu.command('back');
  menu.command('settings');
  zones.push(menu.view().zone);
  assert.deepEqual(zones, ['board', 'floor', 'tyre']);
});

test('closing the menu clears the page and any capture', () => {
  const { menu } = setup();
  menu.command('settings');
  menu.close();
  assert.equal(menu.page, null);
  menu.command('confirm');
  assert.equal(menu.page, null);
});

test('pausing during the countdown shows a zero race time', () => {
  const world = loadWorld('proving');
  const ev = eventsFor(world.track).find((e) => e.kind === 'gp');
  const race = createRace(world, { event: ev });
  const inp = createInput();
  for (let t = 0; t < 60; t++) stepRace(race, inp);
  assert.equal(race.phase, 'countdown');
  assert.equal(pauseView(race, ev, 'Proving Ground').lines[0].value, '0:00.000');
});

test('ramp results list each try and count the landed ones', async () => {
  const { rampResults } = await import('../src/menu.js');
  const r = rampResults({ card: 'The Pad · The Ramp', score: 536, best: 0, speed: '120 MPH', tries: [{ points: 341, align: 0.95, kept: 0.96, rolls: 1 }, { points: 0, why: 'wreck' }, { points: 195, align: 1, kept: 0.95, rolls: 0 }] });
  assert.equal(r.line, '2/3');
  assert.equal(r.lineLabel, 'LANDED');
  assert.deepEqual(r.rows.map((x) => [x.value, x.tag, x.tone]), [['+341', '95% · 96% · 1R', 'good'], ['+0', 'Wrecked', 'bad'], ['+195', '100% · 95%', 'good']]);
  assert.deepEqual(r.stats.map((x) => x.value), ['536', '1', '120 MPH']);
});

test('dare medals step up with the score and stop below bronze', () => {
  assert.equal(dareMedal('lineup', 2), null);
  assert.deepEqual(dareMedal('lineup', 3), { id: 'bronze', name: 'Bronze' });
  assert.deepEqual(dareMedal('lineup', 10), { id: 'silver', name: 'Silver' });
  assert.deepEqual(dareMedal('lineup', 35), { id: 'gold', name: 'Gold' });
  assert.deepEqual(dareMedal('lineup', 36), { id: 'author', name: 'Author' });
  assert.deepEqual(dareMedal('ramp', 585), { id: 'silver', name: 'Silver' });
  assert.equal(dareMedal('trench', 999), null);
  for (const rows of Object.values(DARE_MEDALS)) assert.deepEqual(rows.map((r) => r[2]), rows.map((r) => r[2]).slice().sort((a, b) => b - a));
});

function leadersSetup(open = true) {
  const calls = [], rec = (name, ret) => (...args) => { calls.push([name, ...args]); return ret; };
  const board = { title: 'Hot Lap', state: 'ok', rows: [{ rank: 1 }, { rank: 2 }, { rank: 3 }], around: [{ rank: 30 }], scopes: ['day', 'all'], scope: 'all' };
  const menu = createMenu({
    settings: { keys: structuredClone(DEFAULT_KEYS) },
    data: { events: () => EVENTS, venues: () => VENUES, pause: () => ({}), leaders: () => board },
    on: { sound: rec('sound'), drive: rec('drive'), venue: rec('venue'), resume: rec('resume'), restart: rec('restart'), quit: rec('quit'), next: rec('next'), replay: rec('replay'), change: rec('change'), keys: rec('keys'), leaders: rec('leaders', open), page: rec('page', true), scope: rec('scope', true), race: rec('race') },
  });
  menu.setVenue('proving');
  menu.open('board', { index: 2 });
  return { menu, board, named: (n) => calls.filter((c) => c[0] === n) };
}

test('leaderboard: opens from the board for the selected event, pages, switches, races a row and goes back', () => {
  const { menu, named } = leadersSetup();
  menu.command('leaders');
  assert.deepEqual(named('leaders'), [['leaders', 2]]);
  assert.equal(menu.page, 'leaders');
  assert.equal(menu.view().board.kind, 'leaders');
  assert.equal(menu.view().zone, 'board');
  menu.command('right');
  menu.command('left');
  assert.deepEqual(named('page'), [['page', 1], ['page', -1]]);
  menu.command('scope');
  assert.equal(named('scope').length, 1);
  menu.command('up');
  assert.equal(menu.view().board.index, 3);
  menu.command('confirm');
  assert.deepEqual(named('race'), [['race', 3]]);
  menu.command('back');
  assert.equal(menu.page, 'board');
  assert.equal(menu.selected, 2);
});

test('leaderboard: an event with no board is refused, and the results Board action waits for a submitted run', () => {
  const { menu, named } = leadersSetup(false);
  menu.command('leaders');
  assert.equal(menu.page, 'board');
  assert.deepEqual(named('sound').at(-1), ['sound', 'deny']);
  const r = { hasNext: false, title: 'LAPS', rows: [], stats: [], card: '', time: '', delta: { text: '', tone: '' } };
  menu.open('results', { results: r });
  assert.equal(menu.view().board.actions.find((a) => a.id === 'board').off, true);
  menu.command('leaders');
  assert.equal(named('leaders').length, 1);
  r.board = { scope: 'all' };
  assert.equal(menu.view().board.actions.find((a) => a.id === 'board').off, false);
});

test('leaderboard: touch buttons page, switch and leave; a tapped row races', () => {
  const { menu, named } = leadersSetup();
  menu.point('board', { act: 'leaders' }, true);
  assert.equal(menu.page, 'leaders');
  menu.point('board', { act: 'right' }, true);
  menu.point('board', { act: 'scope' }, true);
  menu.point('board', { row: 1 }, true);
  assert.deepEqual([named('page').length, named('scope').length, named('race').at(-1)], [1, 1, ['race', 1]]);
  menu.point('board', { act: 'back' }, true);
  assert.equal(menu.page, 'board');
});
