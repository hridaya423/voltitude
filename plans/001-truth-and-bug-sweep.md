# Plan 001: Make the game tell the truth (bug sweep with no sim change)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/main.js src/audio.js src/menu.js src/input.js src/render/garage-screens.js index.html tools/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. On a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M (fourteen small edits and one new tool)
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

A playtest and four code audits found places where the game misreports what happened or throws away what the player did. A daily retry stops counting toward the daily board. A win sounds the same as last place. The shared clip can carry the wrong score. The results board strobes while the player reads it. None of these needs a design decision, and none touches the simulation, so saved runs and ghosts stay valid. This plan also adds `tools/smoke.mjs`, a one-command browser check that later plans use as a gate.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step, no framework. three.js r169 is vendored under `rl/vendor/`. Everything under `rl/` is vendored: call it, never edit it.
- `src/sim/` is a deterministic 120 Hz simulation. **This plan must not edit anything under `src/sim/`.**
- `src/main.js` is the entry point, the state machine and the frame loop. `mode` is one of `'title' | 'race' | 'paused' | 'results' | 'replay'`.
- Serve with `npm start` (http://localhost:8790/). URL options: `?venue=proving|airfield|launch|pad`, `&event=gp|tt|pr|lineup|ramp|trench`, `&autostart`, `&autopilot` (a bot drives).
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit. Most statements sit on one long line.
  - No new dependencies. No wrapper function with a single caller.
  - Player-facing text is short and plain, with no em dashes.
- Work in a fresh git worktree of the repo. The owner's main checkout had `rl/vendor/three-r169/build/three.module.js` deleted at planning time, and the game cannot boot without it.

## Current state

Line numbers are from commit `9ee19cc`.

**A. The daily flag is lost on restart.** `src/main.js:426-427`:

```js
function startRace(ev = current, daily = false) {
  dailyRun = daily;
```

Callers that restart: `main.js:305` (`restart: () => startRace(current)`), `:833` and `:843` (`startRace(current)` on the R key). Only `startDaily` at `:279` passes `true`. `dailyRun` gates the board post (`:533`, `if (dailyRun) postDaily(result)`) and the board ghosts (`:439`).

**B. A daily at another venue reloads and then waits.** `main.js:278-285` sets `location.search` with a `daily` param. After the reload, `main.js:901` only selects the row:

```js
if (params.has('daily') && DAILY_EV) { menu.open('board', { index: 0 }); current = DAILY_EV; params.delete('daily'); history.replaceState(null, '', `?${params}${location.hash}`); }
```

and `main.js:907` starts a race only for `autostart` or a linked ghost:

```js
if (params.has('autostart') || linked?.run.event === current.id) startRace(current);
```

**C. Every finish is the same.** `main.js:739-743` (circuit finish inside `handleEvents`):

```js
if (current.circuit) {
  const k = track.finish % track.lap * 3;
  for (const side of [-1, 1]) fireworks.show(finishAtPos.set(...), race.order[0] === race ? 5 : 3, 24);
  audio.event('finish'); hud.toast('FINISH', 'white'); finishAt = performance.now(); stands.party(); input.rumble(0.6, 0.6, 400); break;
}
```

`src/audio.js`, the `finish` case inside `function event(type, v = 0)`:

```js
case 'finish': play('finish', 0.95); play('check_a', 0.45, 0.78 * 2, 0.4); duckFor(0.4, 3.5); if (v) commentary(v === 1 ? 'finish_win' : v <= 3 ? 'finish_podium' : 'finish'); break;
```

`v` is never passed, so the three recorded finish lines never play. `main.js:141` creates `createFireworks()` with the default of 8 shells (`src/render/fx.js:79`), and a win queues 5 per side, 10 in total.

**D. Music hooks that exist and are never called.** The music engine in `rl/js/music/index.js` exposes `setAir(x)` (line 2260) and `stinger(kind, strength, opts)` (line 2273) with kinds `'bank', 'bail', 'lineup', 'ramp', 'rampEnd', 'start', 'air'`. In `src/audio.js`:

- `grep -n setAir src/` returns nothing.
- `const STINGS = { go: ['start', 1], ... }` (line 9) needs `event('go')`, which nothing sends. `main.js:659` calls `audio.lightsOut()` instead.
- The wreck handler at `main.js:733` calls `audio.event('clip')` with no value, so the low-pass in the `clip` case (`if (v) { const f = musicLow.frequency; ... }`) never runs for a wreck.

**E. The clip and OG renders leave `race` pointing at a replay.** `main.js:1099-1103` in `ogImage()` and `:1154-1159` in `exportClip()`:

```js
const was = { mode, aspect: camera.aspect };
try {
  replay = createGhost(world, lastRun);
  ...
  race = replay.race;
```

Both `finally` blocks restore `mode`, the renderer size and the camera, but not `race`. `makeClip` at `:1066` then reads `race.dare.score` for the file name, and `exportClip` at `:1151` reads `race.dare` for the burned-in card.

**F. Time Trial shows the author's lap as "BEST".** `main.js:444` and `:458`:

```js
const ref = ev.kind === 'tt' ? lapSplits(ghostRun(ev)) : null;
...
if (ev.circuit) hud.els.target.textContent = ev.kind === 'dare' ? (book[ev.id]?.best ? `BEST ${book[ev.id].best}` : '') : ref ? `BEST ${fmt(ref.t)}` : '';
```

`ghostRun(ev)` at `:347-352` returns the player's own run when one exists for this sim version, and the author's otherwise.

**G. Space or gamepad A confirms Retry the moment results open.** `main.js:838` maps `any('Enter', 'Space') || pad(0)` to `'confirm'`. Results open on the Retry row (`src/menu.js` `open()`: `if (results) { s.results = results; s.index.results = 0; }`). Space and A are also hop and hover.

**H. S leaves the menu.** `main.js:838-840`: `KeyW` is up, but down is only `ArrowDown`, and `KeyS` opens Settings on the board and pause pages. `src/render/garage-screens.js:137` prints the legend `'↑↓  MODE     ←→  VENUE     ENTER  DRIVE     S  SETTINGS'`. `src/menu.js:24` gives the pause row `{ id: 'settings', label: 'Settings', key: 'S' }`.

**I. Two rewards play the wrong sound.** `src/audio.js`: `case 'near_miss': cheer('gasp'); commentary('near_miss'); break;` uses the same crowd gasp as a wreck. `main.js:724` sends a clean landing as `audio.event('check')`, which advances the `streak` pitch ladder that belongs to sector checkpoints.

**J. Results strobe.** `main.js:534-535` in `showResults`: `garage.cut(); garage.boot();`. `src/render/garage.js:365` is `boot() { introT = 0; }`, and `:418-419` turns `introT < 1` into a 1.8 s flicker of every hangar light. `showResults` is the only caller of `boot()`.

**K. Wrong card on Trench results.** `main.js:621`:

```js
card: ev.id === 'full' ? `${venue.name} · Full run` : `Practice · S${ev.card - 1} ${ev.name}`,
```

The Trench reaches this branch (it is a spur event, not a circuit), so its results read `PRACTICE · S0 THE TRENCH`.

**L. A gamepad that disconnects is ignored.** `src/input.js:44` listens only for `gamepadconnected`. `main.js:850` pauses only on `visibilitychange`.

**M. Two different things are called GAS on a phone.** `index.html:37` is `<button type="button" data-t="gas" class="t-gas">GAS</button>` (throttle). `index.html:67` is `<span class="gas-label">GAS</span>` (the thruster tank). `src/touch.js` reads `data-t="gas"`; keep that attribute.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sim tests | `npm test` | exit 0, 157 tests pass, 0 fail |
| Server tests | `npm run test:server` | exit 0, 6 pass |
| Browser tools install (once) | `npm install --prefix tools` | exit 0 |
| Serve | `npm start` (leave running in a second shell) | prints `http://localhost:8790/` |
| Smoke (after step 1) | `node tools/smoke.mjs '<query>' [flags]` | JSON on stdout, exit 0 |

If `npm install --prefix tools` fails on the npm cache, retry with `--cache "$(mktemp -d)"`. If `sharp` fails to build, that is unrelated to this plan; `playwright-core` is the only package the smoke tool needs.

## Scope

**In scope** (the only files you may modify):
- `tools/smoke.mjs` (create)
- `src/main.js`
- `src/audio.js`
- `src/menu.js` (the `PAUSE` table only)
- `src/input.js`
- `src/render/garage.js` (remove `boot()` only if step 11 leaves it unused)
- `src/render/garage-screens.js` (line 137 legend string only)
- `index.html` (line 37 only)
- `README.md` (the "Develop" command list, one line for the smoke tool)
- `progress.md` (append a dated entry)
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch):
- Anything under `src/sim/`. A sim change invalidates every recorded run and needs a version bump. Plan 002 owns those.
- Anything under `rl/`. It is vendored.
- The `HARD LANDING −10% SPEED` toast at `main.js:725`. The toast is wrong today, and plan 002 makes it true in the sim.
- `server/`.

## Git workflow

- Branch: `advisor/001-truth-and-bug-sweep` from `shook`.
- One commit per step. Message style matches the repo, for example `fix(trench): real road body on spurs, panelled lit trench walls; declutter HUD outside races`. Use `fix(daily): ...`, `fix(audio): ...`, `feat(tools): ...`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `tools/smoke.mjs`

Create `tools/smoke.mjs` with exactly this content. It was run against commit `9ee19cc` during planning and works.

```js
import { chromium } from 'playwright-core';

const [query = '', ...flags] = process.argv.slice(2);
const opt = (name, fallback) => { const i = flags.indexOf(`--${name}`); return i < 0 ? fallback : flags[i + 1]; };
const port = process.env.PORT || 8790, until = opt('until', 'racing'), limit = Number(opt('timeout', 420)) * 1000, expr = opt('eval', ''), keys = opt('keys', '');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], logs = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 160)); });
await page.route('**/src/main.js', async (route) => {
  const res = await route.fetch();
  const body = `${await res.text()}\nwindow.__cap = { get race() { return race; }, get mode() { return mode; }, get current() { return current; }, get dailyRun() { return dailyRun; }, camera, menu, hud, audio, input };`;
  await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
});
const t0 = Date.now();
await page.goto(`http://localhost:${port}/index.html${query}`);
await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__cap, null, { timeout: 180000, polling: 50 });
const loadedMs = Date.now() - t0;
for (const k of keys.split(',').filter(Boolean)) { if (/^\d+$/.test(k)) await page.waitForTimeout(Number(k)); else await page.keyboard.press(k); }
const done = { boot: () => true, racing: () => window.__cap.mode === 'race' && window.__cap.race.phase === 'racing', results: () => window.__cap.mode === 'results' }[until];
const reached = await page.waitForFunction(done, null, { timeout: limit, polling: 100 }).then(() => true, () => false);
const out = { query, until, reached, loadedMs, errors, consoleErrors: [...new Set(logs)], state: await page.evaluate(() => ({ mode: window.__cap.mode, event: window.__cap.current.id, phase: window.__cap.race.phase, live: document.getElementById('menuLive').textContent })) };
if (expr) out.value = await page.evaluate(expr);
console.log(JSON.stringify(out, null, 1));
await browser.close();
process.exit(reached && !errors.length ? 0 : 1);
```

How it works, for you and for later plans:
- First argument: the URL query, for example `'?venue=pad&event=lineup&autostart&autopilot'`. Pass `''` for a cold boot.
- `--until boot|racing|results` (default `racing`): what state to wait for.
- `--keys Enter,4000,KeyR`: after load, press keys in order. A bare number is a wait in milliseconds.
- `--eval '<js>'`: evaluate an expression in the page at the end and print it as `value`. `window.__cap` exposes `race`, `mode`, `current`, `dailyRun`, `camera`, `menu`, `hud`, `audio`, `input`.
- It exits 1 on an uncaught page error or if the state is never reached.
- One console error is expected on every boot at this commit and is not a failure: `THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false ... texture image units`. Plan 012 owns it.

Add one line to the "Develop" block of `README.md`: `node tools/smoke.mjs '?venue=pad&event=lineup&autostart&autopilot'   # boots the game in headless Chrome and reports state`.

**Verify**: with `npm start` running, `node tools/smoke.mjs '?venue=launch&event=trench&autostart&autopilot' --until results --timeout 120` → exit 0, `"reached": true`, `"errors": []`, and `state.live` begins `Results. Position 1 of 5. Time 0:22.208.`

### Step 2: Keep the daily flag across restarts (A)

In `src/main.js`:
1. Change the signature at line 426 to `function startRace(ev = current, daily = dailyRun && ev === current) {`. Leave the next line (`dailyRun = daily;`) as it is.
2. In `toTitle()` (line 329), add `dailyRun = false;` as the first statement, so a normal event picked from the board after a daily is not treated as a daily.

`dailyRun` is declared at line 193, before both functions are called, so no ordering problem exists.

**Verify**: `node tools/smoke.mjs '?venue=pad&daily&day=2026-11-09' --until racing --keys Enter,6000,KeyR,3500 --eval 'window.__cap.dailyRun'` → `"value": true`. The `day` param pins the daily card to The Lineup on The Pad (`src/sim/daily.js`), so the check does not depend on today's date. It also selects the daytime sky, which does not matter here.
**Verify**: `node tools/smoke.mjs '?venue=pad&event=lineup&autostart&autopilot' --until racing --keys 4000,KeyR,3500 --eval 'window.__cap.dailyRun'` → `"value": false`.

### Step 3: Start the daily after its reload (B)

In `src/main.js` near line 901:
1. Before the existing `if (params.has('daily') && DAILY_EV)` line, add `const dailyBoot = params.has('daily') && !!DAILY_EV;`.
2. Change line 907 to: `if (dailyBoot) startRace(DAILY_EV, true); else if (params.has('autostart') || linked?.run.event === current.id) startRace(current);`

**Verify**: `node tools/smoke.mjs '?venue=pad&daily&day=2026-11-09' --until racing --timeout 60 --eval 'window.__cap.dailyRun'` → exit 0 and `"value": true` with no key press.

### Step 4: Give a finish its position (C)

In `src/main.js`:
1. Line 141: `const fireworks = createFireworks(12);`
2. In the circuit branch of `case 'finish'` (line 739-743), replace `audio.event('finish'); hud.toast('FINISH', 'white');` and the rumble with position-aware calls. `race.pos` is the player's position (1 is first) and `current.kind === 'gp'` marks a Grand Prix:

```js
const p = current.kind === 'gp' ? race.pos : 0;
audio.event('finish', p);
hud.toast(p === 1 ? 'WINNER' : p ? `P${p}` : 'FINISH', p && p <= 3 ? 'good' : 'white', p ? 'FINISH' : '');
finishAt = performance.now(); stands.party(); input.rumble(p === 1 ? 1 : 0.6, p === 1 ? 0.8 : 0.6, p === 1 ? 700 : 400); break;
```

Keep the fireworks line above it unchanged.

**Verify**: `grep -n "audio.event('finish', p)" src/main.js` → one match. `grep -n "createFireworks(12)" src/main.js` → one match.
**Verify**: `node tools/smoke.mjs '?venue=pad&event=gp&autostart&autopilot' --until results --timeout 200` → exit 0, `"errors": []`.

### Step 5: Call the music hooks (D)

In `src/audio.js`:
1. In `function update(c, active)`, on the line directly after the existing `music.setIntensity(...)` block closes (the block that starts `if (music && intensityT <= 0) {`), add: `if (music) music.setAir(active && c.mode === 0 ? 1 : 0);`
2. In `function lightsOut()`, after `commentary('lights_out', 0.7);`, add: `if (music) music.stinger('start', 1);`

In `src/main.js` line 733 (the `case 'wreck'` handler), change `audio.event('clip')` to `audio.event('clip', 1)`.

**Verify**: `grep -c "music.setAir" src/audio.js` → `1`. `grep -c "music.stinger('start', 1)" src/audio.js` → `1`. `grep -n "case 'wreck'" src/main.js | grep -c "audio.event('clip', 1)"` → `1`.
**Verify**: `node tools/smoke.mjs '?venue=proving&event=tt&autostart&autopilot' --until racing --keys 25000` → exit 0, `"errors": []` (25 s covers the first jump, so `setAir` runs with both values).

### Step 6: Restore `race` after clip and OG renders (E)

In `src/main.js`, in both `ogImage()` (line 1099) and `exportClip()` (line 1154):
1. Change `const was = { mode, aspect: camera.aspect };` to `const was = { mode, aspect: camera.aspect, race };`
2. In the matching `finally` block, add `race = was.race;` directly after `replay = null;`.

**Verify**: `grep -c "race = was.race" src/main.js` → `2`. `grep -c "aspect: camera.aspect, race }" src/main.js` → `2`.

### Step 7: Label the Time Trial reference honestly (F)

In `src/main.js` `startRace`, line 458, replace the `ref ? \`BEST ${fmt(ref.t)}\` : ''` part so that the label depends on whose run it is:

```js
const own = book[ev.id]?.run?.v === SIM_VERSION;
if (ev.circuit) hud.els.target.textContent = ev.kind === 'dare' ? (book[ev.id]?.best ? `BEST ${book[ev.id].best}` : '') : ref ? `${own ? 'BEST' : 'AUTHOR LAP'} ${fmt(ref.t)}` : '';
```

Leave line 689 (`if (bestLap) hud.els.target.textContent = \`BEST ${fmt(bestLap)}\`;`) alone. After the player's first lap, the number is theirs.

**Verify**: `node tools/smoke.mjs '?venue=proving&event=tt&autostart&autopilot' --until racing --eval 'document.getElementById("target").textContent'` → `"value"` starts with `AUTHOR LAP ` (headless Chrome starts with an empty save).

### Step 8: Guard the results screen against a stray hop press (G)

In `src/main.js`:
1. Next to `let clears = [], contactCount = 0, ...` (line 486), add `let resultsAt = 0;`.
2. In `showResults` (line 529), add `resultsAt = performance.now();`.
3. In `menuKeys()` (line 836-839), the line that computes `cmd` ends with `if (cmd) menu.command(cmd);`. Change that statement to: `if (cmd && !(cmd === 'confirm' && page === 'results' && performance.now() - resultsAt < 600)) menu.command(cmd);`

R and the pad Back button still restart at once (`main.js:843`). That is deliberate.

**Verify**: `grep -c "resultsAt" src/main.js` → `3`.

### Step 9: Make S mean down (H)

1. `src/main.js:838`: in the expression for `cmd`, change `any('ArrowDown') || pad(13)` to `any('ArrowDown', 'KeyS') || pad(13)`.
2. `src/main.js:840`: change `else if (any('KeyS')) menu.command(page === 'board' || page === 'pause' ? 'settings' : 'down');` to `else if (any('KeyO')) menu.command('settings');`
3. `src/render/garage-screens.js:137`: change `S  SETTINGS` to `O  SETTINGS` in the legend string.
4. `src/menu.js:24`: change `key: 'S'` to `key: 'O'` in the pause `settings` row.

**Verify**: `grep -rn "S  SETTINGS\|any('KeyS'))" src/` → no matches. `npm test` → exit 0 (`tests/menu.test.js` must still pass; if it asserts the old `'S'` key label, update that one expectation to `'O'`).

### Step 10: Fix the two wrong sounds (I)

In `src/audio.js`:
1. `case 'near_miss': cheer('gasp'); ...` → `case 'near_miss': cheer('stunt'); commentary('near_miss'); break;`
2. Add `clean: ['bank', 0.6]` to the `STINGS` table on line 9.
3. Add a new case next to `case 'gate'`: `case 'clean': play('check_b', 0.7, 0.9); play('whoosh2', 0.3, 1.2, 0.02); break;`

In `src/main.js:724`, change `audio.event('check')` to `audio.event('clean')` in the clean-landing branch only.

Both sample names (`check_b`, `whoosh2`) are already used by other cases in the same switch, so they exist in the sprite.

**Verify**: `grep -c "case 'clean'" src/audio.js` → `1`. `grep -n "quality === 'clean'" src/main.js | grep -c "audio.event('clean')"` → `1`.

### Step 11: Stop the results strobe (J)

In `src/main.js` `showResults`, delete the call `garage.boot();`. Then run `grep -rn "\.boot()" src/`. If nothing else calls it, delete the `boot() { introT = 0; },` method at `src/render/garage.js:365` too.

**Verify**: `grep -rn "garage.boot" src/` → no matches.

### Step 12: Fix the Trench card (K)

`src/main.js:621`: change the `card:` expression to
`ev.id === 'full' ? \`${venue.name} · Full run\` : ev.spur ? \`${venue.name} · ${ev.name}\` : \`Practice · S${ev.card - 1} ${ev.name}\``.

**Verify**: `node tools/smoke.mjs '?venue=launch&event=trench&autostart&autopilot' --until results --timeout 120 --eval 'window.__cap.menu.view().board.card'` → `"value": "Launch Complex · The Trench"`.

### Step 13: Pause when the gamepad drops (L)

In `src/main.js`, directly after the `visibilitychange` listener at line 850, add: `addEventListener('gamepaddisconnected', () => pause());`

`pause()` already returns early unless a race is running (`main.js:469`).

**Verify**: `grep -c "gamepaddisconnected" src/main.js` → `1`.

### Step 14: Rename the phone throttle button (M)

`index.html:37`: change the button text from `GAS` to `GO`. Keep `data-t="gas"` and `class="t-gas"`.

**Verify**: `grep -c '>GO</button>' index.html` → `1`. `grep -c 'data-t="gas"' index.html` → `1`.

### Step 15: Full gate and log

1. `npm test` → exit 0, 157 pass.
2. `npm run test:server` → exit 0, 6 pass.
3. `node tools/smoke.mjs '' --until boot` → exit 0.
4. `node tools/smoke.mjs '?venue=pad&event=ramp&autostart&autopilot' --until results --timeout 120` → exit 0.
5. `git diff --stat 9ee19cc -- src/sim rl server` → empty.
6. Append an entry to `progress.md` under a heading `## Session <date>: truth and bug sweep (plan 001)`. List each lettered fix in one line with its verification output.

## Test plan

`src/main.js` and `src/audio.js` run only in a browser, and the repo has no unit harness for them. The gates are the smoke runs in each step plus the grep checks. No new node tests are required. `tests/menu.test.js` covers `src/menu.js` and must stay green.

## Done criteria

- [ ] `npm test` exits 0 with 157 passing
- [ ] `npm run test:server` exits 0
- [ ] Every "Verify" line above produced the stated result
- [ ] `git diff --stat 9ee19cc -- src/sim rl server` is empty
- [ ] `grep -rn "//" src/main.js src/audio.js | grep -v "http" | wc -l` is unchanged from before your edits (no comments added)
- [ ] `progress.md` has the new entry and `plans/README.md` shows 001 as DONE

## STOP conditions

Stop and report back if:

- `ls rl/vendor/three-r169/build/three.module.js` fails. You are not in a clean worktree.
- A "Current state" excerpt does not match the file.
- The step 1 verification fails before you have changed any game code. The harness or the machine is the problem, not your edits.
- Any fix seems to need a change under `src/sim/` or `rl/`.
- The daily checks in steps 2 and 3 report `"value": null` or never reach `racing`. `DAILIES[0]` in `src/sim/daily.js` may no longer be The Lineup on The Pad. Report the card you found.
- A smoke run reports an entry in `errors` (an uncaught page error) that was not there at `9ee19cc`.

## Maintenance notes

- `tools/smoke.mjs` appends a line to `src/main.js` at request time to expose internals. If `main.js` renames `race`, `mode`, `current`, `dailyRun`, `camera`, `menu`, `hud`, `audio` or `input`, the tool breaks with a page error. Keep the list in step with `main.js`.
- Step 5 was placed by reading code, not by ear. Someone should listen to a jump, a race start and a wreck. If the air filter is too heavy, the fix is the strength inside `setAir`, not removing the call.
- Step 10 picks existing samples for the clean landing. A sound designer may want a dedicated one.
- Plan 005 changes the cold boot so the daily's venue loads first. Step 3 stays correct after that.
- Reviewer: check that no hunk touches `src/sim/`, and that step 2 did not make a board-selected event count as a daily.
