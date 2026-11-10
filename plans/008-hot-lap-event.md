# Plan 008: Add a one-lap Hot Lap event to every circuit

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/sim/race.js src/sim/daily.js src/main.js tools/medals.mjs tests/dare.test.js assets/ghosts`
> Earlier plans edit `src/sim/race.js` and `src/main.js`, and re-bake `assets/ghosts`. That is expected. `src/sim/daily.js` and `tools/medals.mjs` must be unchanged. Compare the "Current state" excerpts against the live code. On a mismatch in the excerpts themselves, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M (one line in the sim, four author runs, labels and briefs)
- **Risk**: LOW (adds an event; no existing event changes, so no version bump)
- **Depends on**: `plans/001-truth-and-bug-sweep.md` (provides `tools/smoke.mjs`), `plans/002-sim-rules-batch.md` (after it, a track-limit breach in a time trial costs time and no longer voids the run)
- **Category**: direction
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

The only way to race the clock on a circuit is the Time Trial, and it is three laps: about four minutes on three of the four venues. One mistake on lap three costs four minutes. A player who wants one more go at a corner has to commit to all of it again. A one-lap event is the shortest loop a time-attack game has, and this game does not have it. It also helps the daily board. The project log records that the three-lap author runs on the Proving Ground and the Launch Complex are rejected by the free Cloudflare plan for running too long (503), so three of the seven authored daily cards have no working board. A one-lap run is a third of the work to verify.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step. Everything under `rl/` is vendored: never edit it.
- `src/sim/` is a deterministic simulation shared by the browser, the node tests and the Cloudflare Worker in `server/`. A stored run names its event by `id` and is replayed through the sim.
- **This plan adds an event and changes no existing one.** Stored runs of `gp`, `tt`, `pr` and the dares replay exactly as before, so `SIM_VERSION` does not change and local saves survive.
- `eventsFor(track, venue)` (`src/sim/race.js`) lists a venue's events: its dares, then `gp`, `tt`, `pr`. Each event gets `card`, its 1-based position in the list. The garage board row for an event is its `card`.
- An event's `kind` drives behaviour: `gp` has rivals, `tt` is a solo timed run with a ghost and medals, `pr` is free laps. Code that should treat the Hot Lap like a Time Trial tests `kind === 'tt'`, and it already does (`src/main.js:349`, `:444`, `tools/medals.mjs:14`).
- Medals for a timed event come from the author's run, stored in `assets/ghosts/<venue>.json` under the event id. `tools/medals.mjs` records them with the bot. It takes a venue and an optional event id, and with an event id it keeps the other entries in the file.
- `book[ev.id]` holds the player's best for an event. `BRIEF[ev.id]` is the text the garage shows for it.
- `src/sim/daily.js` picks one venue and event for each UTC day.
- House rules, enforced in review:
  - Write no code comments at all.
  - Match the dense style of the file you edit.
  - No new dependencies. No defensive checks for states that cannot happen.
- Work in a fresh git worktree. See "Before any plan" in `plans/README.md`.

## Current state

Line numbers are from commit `9ee19cc`.

**The event list.** `src/sim/race.js:58`:

```js
    const list = [...(venue?.dares || []).map((id) => (track.spurs?.[id] ? spur(id) : mode(id, DARES[id], 'dare', 99))), mode('gp', 'Grand Prix', 'gp', 3), mode('tt', 'Time Trial', 'tt', 3), mode('pr', 'Practice', 'pr', 99)];
```

`mode(id, name, kind, laps)` is defined two lines above it.

**Tests that pin the list.** `tests/dare.test.js:14`, `:16` and `:254`:

```js
  assert.deepEqual(EVENTS.map((e) => [e.id, e.card]), [['lineup', 1], ['ramp', 2], ['gp', 3], ['tt', 4], ['pr', 5]]);
...
  assert.deepEqual(eventsFor(loadWorld('proving').track, loadWorld('proving').venue).map((e) => e.id), ['gp', 'tt', 'pr']);
...
  assert.deepEqual(eventsFor(launch.track, launch.venue).map((e) => e.id), ['trench', 'gp', 'tt', 'pr']);
```

**Briefs.** `src/main.js:195-219`, `BRIEFS`, has one object per venue with keys `gp`, `tt`, `pr` and the dares. The garage shows the first three wrapped lines of a brief, about 150 characters.

**Garage rows.** `src/main.js:252-268`, in `eventRows`:

```js
      tag: ev.spur ? 'DR' : ev.circuit ? ev.kind.slice(0, 2).toUpperCase() : k === 0 ? 'RUN' : `S${k}`,
...
      kicker: ev.spur ? `${venue.name} · Dare${dare ? '' : ' · Time attack'}` : ev.circuit ? `${venue.name} · ${dare ? 'Dare' : ev.kind === 'pr' ? 'Free laps' : `${ev.laps} laps`}` : k === 0 ? `${venue.name} · Full run` : `Practice · Sector ${k}`,
```

`dailyRow` (`src/main.js:271-278`): ``name: `Daily · ${DARES[DAILY.event] || 'Time Trial'}` ``.

`venueRows` (`src/main.js:288-292`): `const total = v.circuit ? 3 + (v.dares?.length || 0) : ...`.

**The dailies.** `src/sim/daily.js:3-13`:

```js
export const DAILIES = Object.freeze([
  { venue: 'pad', event: 'lineup', title: 'Opening night on The Pad' },
  { venue: 'airfield', event: 'tt', title: 'Three laps of the lakebed' },
  { venue: 'pad', event: 'ramp', title: 'The reveal curl' },
  { venue: 'proving', event: 'tt', title: 'Loop and leap' },
  { venue: 'launch', event: 'trench', title: 'Upside down in the trench' },
  { venue: 'launch', event: 'tt', title: 'The tank farm wall' },
  { venue: 'pad', event: 'lineup', title: 'Lineup rematch' },
]);

const ROTATION = [['pad', 'lineup'], ['proving', 'tt'], ['launch', 'trench'], ['airfield', 'tt'], ['pad', 'ramp'], ['launch', 'tt'], ['pad', 'tt']];
```

**What the advisor measured.** With the one-line change of step 2 applied to `9ee19cc`, `node tools/medals.mjs <venue> hl` printed:

| Venue | Author Hot Lap | Author Time Trial (unchanged) |
|---|---|---|
| Proving Ground | 82.608 s | 238.358 s |
| Airfield | 83.350 s | 233.733 s |
| Launch Complex | 71.617 s | 201.625 s |
| The Pad | 38.283 s | 112.550 s |

The existing `tt` and `trench` entries in the ghost files came out byte-identical. Each ghost file grew by about a third (Proving Ground: 231 KB to 312 KB). After plan 002 the times differ a little.

With the event added and nothing else changed, `npm test` gave 155 of 157. The two failures are the tests in `tests/dare.test.js` that hold the three event-list assertions quoted above. `npm run test:server` gave 6 of 6, and the exploit patterns passed on the Proving Ground and The Pad.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| All tests | `npm test` | exit 0, 0 fail |
| Server tests | `npm run test:server` | exit 0, 6 pass |
| Record one author run | `node tools/medals.mjs <venue> hl` | one line: `<venue> hl <seconds> respawns 0 laps <seconds>` |
| Exploit patterns | `node tools/exploits.mjs <venue>` | prints PASS |
| Browser smoke | `node tools/smoke.mjs '<query>' [flags]` (needs `npm start` running) | JSON on stdout, exit 0 |

## Scope

**In scope**:
- `src/sim/race.js` (the one `list` line in `eventsFor`)
- `src/sim/daily.js` (step 6 only)
- `src/main.js` (`BRIEFS`, `eventRows`, `dailyRow`, `venueRows`)
- `tests/dare.test.js` (the three event-list assertions, one new test)
- `assets/ghosts/*.json` (extended by `tools/medals.mjs`, never by hand)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- `SIM_VERSION`. It must not change in this plan.
- The Time Trial. It stays three laps.
- `tools/medals.mjs`. It already records every circuit event whose kind is `tt`.
- `server/`. The Worker learns the new event when the owner redeploys it.
- A rolling start for the Hot Lap. The event is a standing start, like the Time Trial.

## Git workflow

- Branch: `advisor/008-hot-lap-event` from the branch that holds plans 001 and 002.
- One commit per step, for example `feat(events): one-lap Hot Lap on every circuit`. The ghosts are their own commit: `chore(ghosts): author runs for the Hot Lap`.
- Do NOT push. Do NOT run `wrangler`.

## Steps

### Step 0: Record the baseline

```sh
mkdir -p /tmp/plan008 && npm test > /tmp/plan008/test-before.txt 2>&1; echo "tests exit $?"
grep -n "SIM_VERSION = " src/sim/race.js
for f in assets/ghosts/*.json; do node -e "const g=JSON.parse(require('fs').readFileSync('$f','utf8'));console.log('$f',Object.keys(g).map(k=>k+':'+g[k].total+':'+g[k].inputs.length).join(' '))"; done > /tmp/plan008/ghosts-before.txt; cat /tmp/plan008/ghosts-before.txt
```

**Verify**: tests exit 0. The last command prints, for each venue, its existing entries with their totals.

### Step 1: Update the tests first

In `tests/dare.test.js`:

```js
  assert.deepEqual(EVENTS.map((e) => [e.id, e.card]), [['lineup', 1], ['ramp', 2], ['hl', 3], ['gp', 4], ['tt', 5], ['pr', 6]]);
...
  assert.deepEqual(eventsFor(loadWorld('proving').track, loadWorld('proving').venue).map((e) => e.id), ['hl', 'gp', 'tt', 'pr']);
...
  assert.deepEqual(eventsFor(launch.track, launch.venue).map((e) => e.id), ['trench', 'hl', 'gp', 'tt', 'pr']);
```

Add one test below `'a dare race has one entry and a dare state'`:

```js
test('the Hot Lap is a one-lap solo time trial with the same checkpoints as one Time Trial lap', () => {
  const hl = EVENTS.find((e) => e.id === 'hl'), tt = EVENTS.find((e) => e.id === 'tt');
  assert.deepEqual([hl.name, hl.kind, hl.laps, hl.circuit], ['Hot Lap', 'tt', 1, true]);
  assert.deepEqual(hl.cps, tt.cps.slice(0, tt.perLap));
  assert.equal(createRace(pad, { event: hl }).entries.length, 1);
});
```

**Verify**: `node --test tests/dare.test.js 2>&1 | grep "✖"` → these four tests fail, nothing else.

### Step 2: Add the event

In `eventsFor` in `src/sim/race.js`, add the Hot Lap in front of the Grand Prix:

```js
mode('hl', 'Hot Lap', 'tt', 1), mode('gp', 'Grand Prix', 'gp', 3), mode('tt', 'Time Trial', 'tt', 3), mode('pr', 'Practice', 'pr', 99)
```

Change nothing else on the line. The Hot Lap sits before the Grand Prix so that the shortest circuit event is the first one a player meets.

**Verify**: `node --test tests/dare.test.js` → all pass. `grep -n "SIM_VERSION = " src/sim/race.js` → the same number as in step 0.

### Step 3: Record the author runs

```sh
for v in proving airfield launch pad; do node tools/medals.mjs $v hl; done
```

**Verify**: four lines, each with `respawns 0` and one lap time. On `9ee19cc` they are 82.608, 83.350, 71.617 and 38.283 s. After plan 002 they may differ by a second or two. A time more than 5% away from these is a STOP condition.

**Verify**: run the step 0 ghost listing again and compare with `/tmp/plan008/ghosts-before.txt`. Every old entry has the same total and the same input length. Each file has one new `hl` entry.

### Step 4: Briefs and labels

In `src/main.js`:

1. Add an `hl` key to each venue in `BRIEFS`:

```js
  proving: { hl: 'One lap from a standing start. The loop, the jump and both hairpins, once each.', ... },
  airfield: { hl: 'One lap from a standing start. The runway, the three hangars and the tower esses, once each.', ... },
  launch: { hl: 'One lap from a standing start. The banked wall, the tank farm and the tower climb, once each.', ... },
  pad: { hl: 'One lap of the oval from a standing start. The kicker is on the racing line.', ... },
```

2. In `eventRows`, give the Hot Lap its own tag and fix the lap count wording:

```js
      tag: ev.spur ? 'DR' : ev.id === 'hl' ? 'HL' : ev.circuit ? ev.kind.slice(0, 2).toUpperCase() : k === 0 ? 'RUN' : `S${k}`,
```

and in `kicker`, replace `` `${ev.laps} laps` `` with `` ev.laps === 1 ? 'One lap' : `${ev.laps} laps` ``.

3. In `dailyRow`: ``name: `Daily · ${DARES[DAILY.event] || (DAILY.event === 'hl' ? 'Hot Lap' : 'Time Trial')}` ``.

4. In `venueRows`: `const total = v.circuit ? 4 + (v.dares?.length || 0) : ...`.

**Verify**: `npm test` → exit 0. With `npm start` running:

```sh
node tools/smoke.mjs '?venue=proving' --until boot --eval 'window.__cap.menu.view().board.rows.map((r) => r.tag + " " + r.name + " | " + r.kicker + " | " + r.ladder.map((m) => m.time).join(" "))'
```

→ the second row is `HL Hot Lap | Proving Ground · One lap | ` followed by four medal times, the first near `1:22.6`. The Time Trial row still reads `· 3 laps`.

### Step 5: Drive it

With `npm start` running:

```sh
node tools/smoke.mjs '?venue=pad&event=hl&autostart&autopilot' --until results --timeout 120 --eval '({ card: window.__cap.menu.view().board.card, time: window.__cap.menu.view().board.time, medal: window.__cap.menu.view().board.medal, rows: window.__cap.menu.view().board.rows.length })'
```

→ exit 0, `"errors": []`, `"card": "The Pad · Hot Lap"`, one row, a time near `0:39`, and a medal. The browser autopilot drives at 97% of the author's pace, so the medal is Gold or Silver.

```sh
node tools/smoke.mjs '?venue=proving&event=tt&autostart&autopilot' --until racing --timeout 60 --eval 'window.__cap.current.laps'
```

→ `"value": 3`. The Time Trial is untouched.

```sh
for v in proving airfield launch pad; do node tools/exploits.mjs $v | tail -1; done
```

→ `PASS` four times.

### Step 6: Make the circuit dailies one lap

This step changes which event the daily card is on some days. If the operator told you to leave the dailies alone, skip it and say so in the report.

In `src/sim/daily.js`, change every `'tt'` to `'hl'` in `DAILIES` and in `ROTATION`, and retitle the one card whose title names the lap count:

```js
  { venue: 'airfield', event: 'hl', title: 'One lap of the lakebed' },
...
  { venue: 'proving', event: 'hl', title: 'Loop and leap' },
...
  { venue: 'launch', event: 'hl', title: 'The tank farm wall' },
...
const ROTATION = [['pad', 'lineup'], ['proving', 'hl'], ['launch', 'trench'], ['airfield', 'hl'], ['pad', 'ramp'], ['launch', 'hl'], ['pad', 'hl']];
```

**Verify**: `grep -c "'tt'" src/sim/daily.js` → 0. `npm run test:server` → exit 0. `npm test` → exit 0.

**Verify**: `node tools/smoke.mjs '?venue=airfield&daily&day=2026-11-10' --until racing --timeout 90 --eval '({ event: window.__cap.current.id, laps: window.__cap.current.laps, daily: window.__cap.dailyRun })'` → `"event": "hl"`, `"laps": 1`, `"daily": true`. The game will report the daily board as offline. That is expected until the Worker is redeployed.

### Step 7: Log

Append to `progress.md` a section `## Session <date>: Hot Lap (plan 008)`. Give the four author times, the ghost file sizes before and after, and the smoke outputs. End with the open items for the owner from "Maintenance notes".

## Test plan

- `tests/dare.test.js`: three updated event-list assertions and one new test for the Hot Lap's shape. Changed first, seen failing.
- The author runs are the functional test of the event: `tools/medals.mjs` throws if the bot cannot finish it.
- Browser: the smoke commands in steps 4, 5 and 6.

## Done criteria

- [ ] `npm test` exits 0, with one more test than before this plan
- [ ] `npm run test:server` exits 0
- [ ] `grep -n "SIM_VERSION = " src/sim/race.js` shows the same number as before this plan
- [ ] Each `assets/ghosts/*.json` has an `hl` entry, and every older entry is unchanged
- [ ] The step 5 smoke reaches results on `The Pad · Hot Lap`
- [ ] `git diff --stat -- tools/medals.mjs server rl` is empty
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- An existing ghost entry changes in step 3. The new event must not affect the old ones.
- `tools/medals.mjs` throws `author run failed` for an `hl` run, or reports a respawn.
- A test outside `tests/dare.test.js` fails after step 2. Some code depends on the position of `gp` or `tt` in the list. Report the test. Do not move the Hot Lap to the end to make it pass without saying so.
- `SIM_VERSION` would have to change for any reason.
- The step 4 smoke shows no medal times on the Hot Lap row. `author.hl` is not being loaded.

## Maintenance notes

For the owner, after this lands:

- **Redeploy the Worker** (`npx wrangler deploy` in `server/`). It builds its event list from the same `eventsFor`, so until then it answers `no such event` to a Hot Lap run.
- **Measure the daily board after the redeploy.** The log says a 22 s Trench run verifies in 179 ms and the 200 s to 240 s Time Trials exceed the free plan's CPU limit. A 72 s to 83 s Hot Lap sits between them. Post one author Hot Lap per venue and see whether it returns 201 or 503.
- Step 6 moved the circuit dailies to the Hot Lap. If the 503 persists even for one lap, the choice is the paid plan or dare-only dailies.
- Every card number after the dares moved up by one. Anything outside the repo that links to `?event=gp` still works, because links use the id.
- The Hot Lap is a standing start. A flying start would make the lap time comparable with a Time Trial's later laps, and would need a run-in lap or a rolling release. Plan 006 added a rolling release for The Lineup that could be reused.
- Ghost files are a third larger. They are fetched once per venue.
- Plans that bump `SIM_VERSION` after this one re-bake every entry, the Hot Lap included, with `node tools/medals.mjs all`.
- Reviewer: check that nothing in `src/` tests `ev.id === 'tt'` where it means "any timed circuit event". At `9ee19cc` nothing did.
