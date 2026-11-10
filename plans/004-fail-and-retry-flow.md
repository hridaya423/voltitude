# Plan 004: Cut the dead time around failing and retrying

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/sim/race.js src/main.js tests/sim.test.js tests/dare.test.js assets/ghosts`
> Plans 001 and 002 edit `src/main.js` and `src/sim/race.js` before you. That is expected. Compare the "Current state" excerpts against the live code. A line that plan 001 or 002 changed in the way this plan describes is fine. Any other mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S (seven small edits, two of them in the sim)
- **Risk**: MED (two edits change the deterministic sim, so the version bumps and the author ghosts are re-baked)
- **Depends on**: `plans/001-truth-and-bug-sweep.md` (provides `tools/smoke.mjs`), `plans/002-sim-rules-batch.md` (edits the same functions)
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

A failed Lineup jump takes 3 seconds to play and 6 seconds to get back from. The car sits clipped for 2.0 s, the finish hold adds 2.2 s, then the results screen, then a 2.0 s countdown. A player who retries thirty times spends three minutes watching timers. Pressing restart during that hold throws away the score the run just earned. A car that auto-resets shows no message. Resuming from pause drops the player into a car doing 150 mph with no warning. After this plan, a clip reaches the results screen in 1.5 s, restart works at once and keeps the score, a solo event counts down in 1.33 s, and pause ends with a short hold.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic 120 Hz simulation shared by the browser, the node tests and the Cloudflare Worker in `server/`. A recorded run stores inputs only and is replayed through the sim. **Any behaviour change breaks every stored run**, which is why `SIM_VERSION` in `src/sim/race.js` exists. Steps 2 and 3 change behaviour.
- One tick is 1/120 s. `race.raceTick` is negative during the countdown and reaches 0 at GO.
- Events have a `kind`: `gp` (Grand Prix with seven rivals), `tt` (Time Trial), `pr` (Practice), `dare` (The Lineup and The Ramp, scored), `trial` (The Trench, timed).
- `race.dare` exists only for The Lineup and The Ramp. `race.dare.over` turns true when the dare has ended and the sim is holding before it finishes the run.
- `src/main.js` owns the screen state in `mode`: `title`, `race`, `paused`, `results`, `replay`.
- `hud.toast(text, color, sub)` shows a toast for 1.6 s. It writes HTML, so `<kbd>` tags work.
- `key(action)` in `src/main.js` returns the bound key as `<kbd>R</kbd>`.
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies. No wrapper function with a single caller. No defensive checks for states that cannot happen.
- Work in a fresh git worktree. The owner's main checkout had vendored files deleted at planning time.

## Current state

Line numbers are from commit `9ee19cc`. Plans 001 and 002 shift them by a few lines.

**The countdown.** `src/sim/race.js:9-12` and `:96`:

```js
export const SIM_VERSION = 14;
export const TIERS = Object.freeze({ easy: 0.94, pro: 0.98, elite: 1 });
export const COUNTDOWN = 240;
export const lightTick = (n) => -220 + 40 * (n - 1);
...
    world, event, assist, seed, tier, tick: 0, raceTick: -COUNTDOWN, phase: 'countdown',
```

`stepRace` (`src/sim/race.js:439-447`) emits a `light` event when `race.raceTick === lightTick(n)` for `n` 1 to 5, and `go` at tick 0. The five lights fire at -220, -180, -140, -100 and -60. `src/hud.js:147` lights the first `n` columns on `light`. `src/render/road.js:502` lights a gantry lamp when `t >= lightTick(k + 1)`.

After plan 002 the first line reads `SIM_VERSION = 15`.

**The clip hold.** `src/sim/race.js:322-329`:

```js
function clip(race, c, k) {
  const d = race.dare;
  d.over = true;
  d.endAt = race.tick + 240;
  c.wrecked = true;
  c.vx *= -0.15; c.vy *= -0.15; c.vz *= -0.15;
  emit(race, 'clip', { k, score: d.score });
}
```

`dareStep` finishes the run when `race.tick >= d.endAt`. That emits `finish`.

**The finish hold.** `src/main.js:944`:

```js
  if (mode === 'race' && race.phase === 'finished' && finishAt && performance.now() - finishAt > 2200) { finishAt = 0; finish(); }
```

`finishAt` is set when the `finish` event arrives. So a clip reaches results after 240 ticks plus 2200 ms: 4.2 s.

**Restart during a race.** `src/main.js:829-831`, in `menuKeys`:

```js
  if (mode === 'race') {
    if (any('Escape', 'KeyP') || pad(9)) pause();
    else if (input.actionPressed('restart') || pad(8)) startRace(current);
```

`startRace` sets `finishAt = 0`, so `finish()` never runs for the run that just ended. The only place a dare score is saved is `finishDare` (`src/main.js:577-580`):

```js
function finishDare(ev) {
  const d = race.dare, best = book[ev.id]?.best || 0;
  lastRun = encodeRun(race, recorder.bytes());
  if (d.score > best) { book[ev.id] = { best: d.score }; persist(); }
```

**Pause and resume.** `src/main.js:468-475`:

```js
function pause() {
  if (mode !== 'race' || race.phase === 'finished') return;
  mode = 'paused';
  audio.mute(true);
  hud.show(false);
  menu.open('pause');
}
function resume() { mode = 'race'; audio.mute(false); hud.show(true); menu.close(); }
```

**The loop.** `src/main.js:934-947`, in `draw`:

```js
  const running = mode === 'race' || mode === 'replay';
  if (running) {
    if (ticks >= 0) { for (let n = 0; n < ticks; n++) tick(); acc = 0; }
    else {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 12) { tick(); acc -= DT; n++; }
      if (n === 12) acc = 0;
    }
    time += dt;
  }
  if (mode === 'race' && race.phase === 'finished' && finishAt && performance.now() - finishAt > 2200) { finishAt = 0; finish(); }
  if (!running) time += dt;
  const a = running ? acc / DT : 1;
```

**The event handlers.** `src/main.js`, in `handleEvents`:

```js
      case 'clip': lineup.clip(e.k); hud.toast('CLIPPED', 'red', `SCORE ${e.score}`); audio.event('clip', 1); cheerNear(0.2, 'gasp'); input.rumble(1, 0.6, 320); chase.bump(1.2); chase.stall(0.08); break;
...
      case 'retry': wreckToast?.remove(); chase.snap(); snapshot(race.car, prev); break;
...
      case 'respawn': wreckToast?.remove(); audio.event('respawn'); chase.snap(); snapshot(race.car, prev); break;
```

The screen flash already exists. The boost pad uses it: `post.uniforms.uFlash.value = 0.25;` (`src/main.js:719`), and `draw` decays it every frame.

**The existing clip test.** `tests/dare.test.js:74-93`, `'a slow car hits the first vehicle, and the dare ends'`, asserts `race.raceTick - clipAt <= 242`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Sim tests | `npm test` | exit 0, 0 fail |
| One test file | `node --test tests/dare.test.js` | exit 0 |
| Server tests | `npm run test:server` | exit 0, 6 pass |
| Exploit patterns | `node tools/exploits.mjs <venue>` for `proving`, `airfield`, `launch`, `pad` | prints PASS |
| Re-bake author ghosts | `node tools/medals.mjs all` | one line per event, no throw |
| Dev server | `npm start` | serves http://localhost:8790/ |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

`tools/smoke.mjs` comes from plan 001. Its `--eval` flag takes a JavaScript expression, awaits it if it is a promise, and prints the result as `"value"`. It exposes `window.__cap` with `race`, `mode`, `current`, `hud`, `menu`, `input` and others.

## Scope

**In scope**:
- `src/sim/race.js` (`SIM_VERSION`, the countdown constant, `createRace`, `clip`)
- `src/main.js` (`resume`, `finishDare`, `menuKeys`, `handleEvents`, `draw`)
- `tests/sim.test.js`, `tests/dare.test.js`
- `assets/ghosts/*.json` (rewritten by `tools/medals.mjs`, never by hand)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- The Grand Prix countdown. It stays at 240 ticks. The grid needs the full sequence.
- `lightTick`, `src/hud.js`, `src/render/road.js`, `src/audio.js`. The shorter countdown works with them unchanged. See step 2.
- `RAMP.wait` and `RAMP.stall` in `race.js`, and the Lineup rules in `dareStep`. Plan 006 owns the dares.
- `src/render/camera.js`. Plan 003 owns it.
- `server/`. The Worker needs a redeploy after this plan. The owner does that.

## Git workflow

- Branch: `advisor/004-fail-and-retry-flow` from the branch that holds plans 001 and 002.
- One commit per step, for example `feat(flow): solo events count down in 1.33 s`. The ghost re-bake is its own commit: `chore(ghosts): re-bake author runs for sim <N>`.
- Do NOT push. Do NOT run `wrangler`.

## Steps

### Step 0: Record the baseline

```sh
mkdir -p /tmp/plan004 && npm test > /tmp/plan004/test-before.txt 2>&1; echo "tests exit $?"
for v in proving airfield launch pad; do node tools/exploits.mjs $v > /tmp/plan004/exploits-$v-before.txt 2>&1; echo "$v exploits exit $?"; done
grep -n "SIM_VERSION = " src/sim/race.js
```

**Verify**: tests exit 0, exploits print PASS for all four venues, and you know the current `SIM_VERSION`. Call it `N`. Any baseline failure is a STOP condition.

### Step 1: Bump the version

In `src/sim/race.js`, raise `SIM_VERSION` by one, to `N + 1`.

Some tests replay author ghosts and will fail until step 9. Run `npm test 2>&1 | grep "✖" > /tmp/plan004/after-bump.txt` and keep the list.

**Verify**: `grep -n "SIM_VERSION = " src/sim/race.js` → shows `N + 1`.

### Step 2: Solo events count down in 160 ticks

Only a Grand Prix has a grid to wait for. Every other event starts 80 ticks later in the same light sequence. Lights 1 and 2 are already lit when the race appears, lights 3, 4 and 5 fire at their usual ticks (-140, -100, -60), and GO is at 0. The beeps keep their spacing.

Write the test first. Add to `tests/sim.test.js` (the file already defines `world`, `EVENTS` and `byId` for the Airfield, and imports `createRace`, `stepRace`, `createInput`):

```js
test('solo events count down in 160 ticks, a Grand Prix in 240', () => {
  for (const [id, ticks, lights] of [['tt', 160, [3, 4, 5]], ['pr', 160, [3, 4, 5]], ['gp', 240, [1, 2, 3, 4, 5]]]) {
    const race = createRace(world, { event: byId(id) }), inp = createInput(), seen = [];
    let n = 0;
    while (race.phase === 'countdown') { stepRace(race, inp); n++; for (const e of race.events) if (e.type === 'light') seen.push(e.n); race.events.length = 0; }
    assert.equal(n, ticks, id);
    assert.deepEqual(seen, lights, id);
  }
});
```

**Verify**: `node --test tests/sim.test.js 2>&1 | grep "solo events"` → the test FAILS with `240 !== 160`.

Then in `src/sim/race.js`:

```js
export const COUNTDOWN = 240, SOLO_COUNTDOWN = 160;
```

and in `createRace`:

```js
    world, event, assist, seed, tier, tick: 0, raceTick: -(event.kind === 'gp' ? COUNTDOWN : SOLO_COUNTDOWN), phase: 'countdown',
```

Change nothing else. `src/hud.js` lights the first three columns when light 3 arrives. `src/render/road.js` compares against `lightTick`, so the gantry shows lamps 1 and 2 lit from the first frame.

The advisor applied these two lines to commit `9ee19cc` and ran `npm test`: 157 of 157 passed. No existing test depends on a 240-tick solo countdown.

**Verify**: `node --test tests/sim.test.js 2>&1 | grep "solo events"` → passes. `npm test 2>&1 | grep "✖"` → no test fails that is not in `/tmp/plan004/after-bump.txt`.

### Step 3: A clip holds for 0.8 s, not 2 s

In `clip` in `src/sim/race.js`: `d.endAt = race.tick + 96;`

In `tests/dare.test.js`, in `'a slow car hits the first vehicle, and the dare ends'`, change the bound:

```js
  assert.ok(race.raceTick - clipAt <= 98, `finished ${race.raceTick - clipAt} ticks after the clip`);
```

**Verify**: `node --test tests/dare.test.js` → all pass. Then set `96` back to `240` for a moment and confirm that test fails, and restore `96`.

### Step 4: The dare finish hold is 0.7 s

In `draw` in `src/main.js`:

```js
  if (mode === 'race' && race.phase === 'finished' && finishAt && performance.now() - finishAt > (race.dare ? 700 : 2200)) { finishAt = 0; finish(); }
```

Circuits and The Trench keep 2200 ms. Their finish has fireworks and a crowd.

**Verify**: with `npm start` running, run this. It lets the autopilot clear one line, then forces a line of nine so the next jump clips, and times the clip to the results screen.

```sh
node tools/smoke.mjs '?venue=pad&event=lineup&autostart&autopilot' --until racing --timeout 60 --eval '(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); const c = window.__cap; const until = async (f, lim) => { const t = performance.now(); while (!f() && performance.now() - t < lim) await w(20); return performance.now(); }; await until(() => c.race.dare.score > 0, 40000); const first = c.race; first.dare.count = 9; const tClip = await until(() => first.dare.over, 90000); const tRes = await until(() => c.mode === "results", 8000); return { mode: c.mode, clipToResultsMs: Math.round(tRes - tClip) }; })()'
```

→ `"mode": "results"` and `clipToResultsMs` between 1300 and 1800. The advisor measured 1519. Before this plan it is about 4200. The run takes about 50 s.

If plan 006 has landed, the forced line of nine may arrive sooner. The bounds still hold.

### Step 5: Restart during the hold keeps the score, and never discards a finished run

Add a function above `finishDare` in `src/main.js` and use it there:

```js
function bankDare(ev) {
  const best = book[ev.id]?.best || 0;
  if (race.dare.score > best) { book[ev.id] = { best: race.dare.score }; persist(); }
  return best;
}

function finishDare(ev) {
  const d = race.dare, best = bankDare(ev);
  lastRun = encodeRun(race, recorder.bytes());
```

The old `if (d.score > best) { ... }` line in `finishDare` goes away. `best` must still hold the score from before this run, because the results screen compares against it.

In `menuKeys`, replace the restart line in the `mode === 'race'` branch:

```js
    else if (input.actionPressed('restart') || pad(8)) {
      const over = race.phase === 'finished' || race.dare?.over;
      if (over && race.dare && !dailyRun) bankDare(current);
      if (!over || (race.dare && !dailyRun)) startRace(current);
    }
```

The rule:
- Run still live: restart, as today.
- Dare over, not a daily: save the score, restart at once.
- Daily dare over, or a circuit or trial finished: ignore the press. The results screen arrives within 2.2 s and owns posting, medals and the restart button. Restarting here used to throw the finished run away.

**Verify**: with `npm start` running:

```sh
node tools/smoke.mjs '?venue=pad&event=lineup&autostart&autopilot' --until racing --timeout 60 --eval '(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); const c = window.__cap; const until = async (f, lim) => { const t = performance.now(); while (!f() && performance.now() - t < lim) await w(20); }; await until(() => c.race.dare.score > 0, 40000); const first = c.race; first.dare.count = 9; await until(() => first.dare.over, 90000); await w(200); dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR" })); dispatchEvent(new KeyboardEvent("keyup", { code: "KeyR" })); await w(400); const k = Object.keys(localStorage).find((x) => x.startsWith("voltitude.save")); return { fresh: c.race !== first, mode: c.mode, phase: c.race.phase, saved: JSON.parse(localStorage.getItem(k)).venues.pad.lineup }; })()'
```

→ `"fresh": true`, `"mode": "race"`, `"phase": "countdown"`, `"saved": { "best": 1 }`. The advisor ran this against the code above and got exactly that. `best` may be higher than 1 if plan 006 changed the scoring. It must not be missing.

### Step 6: Say how to retry, and say when the game reset the car

In `handleEvents` in `src/main.js`:

```js
      case 'clip': lineup.clip(e.k); hud.toast('CLIPPED', 'red', `SCORE ${e.score} · ${key('restart')} RETRY`); ...
```

Keep the rest of the `clip` line as it is. If plan 001 already changed its `audio.event` call, keep plan 001's version.

On `respawn`, add a toast after `wreckToast?.remove();`:

```js
      case 'respawn': wreckToast?.remove(); hud.toast('RESET', 'white'); ...
```

A car that sat against a wall and was put back on the road now says so. Before, it moved with no message.

**Verify**: `grep -c "RETRY\`" src/main.js` → 1, and `grep -c "hud.toast('RESET', 'white')" src/main.js` → 1. The step 4 smoke command with `const toast = document.getElementById("toasts").textContent;` read right after `tClip` returns `CLIPPEDSCORE 1 · R RETRY`. You do not need to run it again; step 9 covers the browser.

### Step 7: Soften the cut when the car is moved

The camera cuts to the new position on `respawn` and on `retry` (the next try at The Ramp). Add the existing screen flash to both lines, off under reduced motion:

```js
      case 'retry': wreckToast?.remove(); if (!settings.reduced) post.uniforms.uFlash.value = 0.3; chase.snap(); snapshot(race.car, prev); break;
...
      case 'respawn': wreckToast?.remove(); hud.toast('RESET', 'white'); if (!settings.reduced) post.uniforms.uFlash.value = 0.3; audio.event('respawn'); chase.snap(); snapshot(race.car, prev); break;
```

**Verify**: `grep -c "uFlash.value = 0.3" src/main.js` → 2.

### Step 8: Resume holds for 0.7 s

Add `resumeAt = 0` to an existing `let` line near `resume` (for example the one that declares `wreckToast`). Then:

```js
function resume() { mode = 'race'; resumeAt = performance.now() + 700; audio.mute(false); hud.show(true); menu.close(); hud.toast('READY', 'white'); }
```

In `draw`:

```js
  const running = (mode === 'race' && performance.now() >= resumeAt) || mode === 'replay';
```

and

```js
  const a = running || mode === 'race' ? acc / DT : 1;
```

The second change keeps the car drawn where it was when the pause began. Without it the car jumps forward by up to one tick during the hold and back when the hold ends.

During the hold the scene, the HUD and the engine sound are back, and the sim does not step. `tick()` is not called, so no input is recorded and replays stay exact.

**Verify**: with `npm start` running:

```sh
node tools/smoke.mjs '?venue=proving&event=tt&autostart&autopilot' --until racing --keys 3000,Escape,600,Escape --eval '(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); const c = window.__cap; const t0 = c.race.tick; await w(300); const t1 = c.race.tick; await w(1200); return { mode: c.mode, held: t1 - t0, after: c.race.tick - t1 }; })()'
```

→ `"mode": "race"`, `"held": 0`, and `"after"` between 60 and 150. The advisor measured `held 0, after 108`. Before this step `held` is about 36.

### Step 9: Re-bake the author ghosts and run every gate

1. `node tools/medals.mjs all` → one line per event, no throw. It rewrites `assets/ghosts/*.json`.
2. `npm test` → exit 0. Every test from `/tmp/plan004/after-bump.txt` is green again.
3. `npm run test:server` → exit 0.
4. `for v in proving airfield launch pad; do node tools/exploits.mjs $v | tail -3; done` → PASS for all four.
5. With `npm start` running:
   - `node tools/smoke.mjs '?venue=proving&event=tt&autostart&autopilot' --until racing --timeout 30 --eval 'window.__cap.race.raceTick'` → exit 0.
   - `node tools/smoke.mjs '?venue=pad&event=ramp&autostart&autopilot' --until results --timeout 120` → exit 0, `"errors": []`.
   - `node tools/smoke.mjs '?venue=launch&event=trench&autostart&autopilot' --until results --timeout 120` → exit 0, `"errors": []`.
6. The author times must not move. Neither sim change touches driving. Before step 9.1, note each `"total"` with `grep -o '"total":[0-9]*' assets/ghosts/*.json`, and compare after. Every Time Trial and Trench total is the same number of ticks. A changed total is a STOP condition. The advisor re-baked with both sim changes applied to `9ee19cc`, and all five totals were identical to the old ones.

### Step 10: Log

Append to `progress.md` a section `## Session <date>: fail and retry flow (plan 004), SIM_VERSION <N + 1>`. List each step in one line with the measured number: countdown ticks, clip to results in ms, the saved score after a restart, ticks held on resume. End with the open items for the owner from "Maintenance notes".

## Test plan

- `tests/sim.test.js`: one new test, the countdown length and the light events per event kind (step 2). Written first, seen failing.
- `tests/dare.test.js`: one tightened bound, the clip hold (step 3). Seen failing with the old constant.
- The `main.js` changes have no node test. The repo has no DOM test harness, and `main.js` runs on import. The three smoke commands in steps 4, 5 and 8 are the proof. Each prints a number with a stated band.

## Done criteria

- [ ] `npm test` exits 0, with one more test than before this plan
- [ ] `npm run test:server` exits 0
- [ ] `node tools/exploits.mjs` prints PASS for `proving`, `airfield`, `launch`, `pad`
- [ ] `grep -n "SOLO_COUNTDOWN = 160" src/sim/race.js` matches, and `grep -n "race.tick + 96" src/sim/race.js` matches
- [ ] The step 4 smoke prints `clipToResultsMs` between 1300 and 1800
- [ ] The step 5 smoke prints `"fresh": true` and a `saved.best` of at least 1
- [ ] The step 8 smoke prints `"held": 0`
- [ ] `assets/ghosts/*.json` each carry the new version number and not the old one
- [ ] `git status` shows changes only in the in-scope files
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- The step 0 baseline has a failing test or a failing exploit pattern.
- After step 2, a test fails that is not in `/tmp/plan004/after-bump.txt`. Report the test name. Do not edit `lightTick`, the HUD or the gantry to make it pass.
- `node tools/medals.mjs all` throws, or an author time changes (step 9.6).
- `race.dare`, `bankDare`'s inputs (`book`, `persist`) or `finishAt` no longer exist in `src/main.js` under those names.
- The step 5 smoke shows `saved` missing. The score was lost, which is the bug this step exists to fix.

If one step is blocked, the others can still land. Revert the blocked step, finish the rest, and mark the plan BLOCKED with the step number in `plans/README.md`.

## Maintenance notes

For the owner, after this lands:

- **Redeploy the Worker** (`npx wrangler deploy` in `server/`). It rejects any run whose version is not its own `SIM_VERSION` with a 422. One redeploy after the last sim plan is enough if the plans land together.
- **Local records reset** again, because the save key contains the sim version.
- Three taste constants are worth a look in play: the solo countdown (`SOLO_COUNTDOWN = 160` in `race.js`), the resume hold (`700` in `resume`), and the reset flash (`0.3`, two places in `handleEvents`).
- The solo countdown beeps three times, not five. `src/audio.js` plays one clip per light, so nothing overlaps. If three beeps feel abrupt, raise `SOLO_COUNTDOWN` to 200 for four.
- The `R RETRY` label shows the keyboard key on every device. Plan 005 makes key labels follow the device in use. Touch has no restart button at all (see "Findings without a plan" in `plans/README.md`).
- Plan 006 changes what happens after a Lineup clear. It does not change `clip`, so step 3 stands.
- Reviewer: read the restart rule in step 5. A finished circuit run must never be dropped by a restart press.
