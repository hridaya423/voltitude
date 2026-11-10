# Plan 012: Stop the first race of a session from freezing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9ee19cc..HEAD -- src/render/garage.js tools/first-start.mjs`
> `src/render/garage.js` should be unchanged, and `tools/first-start.mjs` must not exist. Compare the "Current state" excerpts against the live code. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S (two lines and one measuring tool)
- **Risk**: LOW (rendering only; the simulation, saves and ghosts are untouched)
- **Depends on**: none (only the three.js restore in `plans/README.md`)
- **Category**: bug
- **Planned at**: commit `9ee19cc`, 2026-11-09

## Why this matters

The first time a player presses Enter to race in a session, the game freezes. The advisor measured it in headless Chrome on an Apple silicon Mac mini: from Enter to GO took 10.2 s for a 2 s countdown, with one frame of 6.2 s. On later runs, with the graphics driver's shader cache warm, the frozen frame was 0.3 to 1.2 s. A restart of the same race takes 2.0 s with no slow frame. So every new player's first impression of driving is a hang, and it is worst on the first visit, when the cache is cold.

The cause is one missed state in the boot warm-up. The fix is two lines. It also removes a shader error that is logged on every daytime boot.

## Repo facts (read once)

- Voltitude is a browser stunt racer. Plain ES modules, no build step, three.js r169 vendored under `rl/vendor/`. Never edit `rl/`.
- The title screen is a garage: a `THREE.Group` holding the car on a turntable, lit by seven spot lights, four of them casting shadows. A race is lit by three directional lights and no spots.
- three.js compiles one shader program per material **per light setup**. The number of spot lights is part of the program's cache key. A material compiled with seven spots cannot be reused with none.
- At boot, `src/main.js` warms the shader cache with `post.compile(scene, camera)`, which calls three's `renderer.compileAsync`. That call compiles **every** material in the scene, visible or not, for the lights that are **visible** at that moment.
- `garage.setActive(on, scene, keep)` switches between the garage and the track: it hides or shows the rest of the scene, the garage group and the spot lights.
- `window.__perf.frames` holds the last frame times in ms. `renderer.info.programs` is three's list of compiled programs.
- Browser tools need `playwright-core`: run `npm install --prefix tools` once. If it fails on the npm cache, retry with `--cache "$(mktemp -d)"`. A `sharp` build failure is unrelated.
- House rules, enforced in review: write no code comments; match the dense style of the file you edit; no new dependencies.
- Work in a fresh git worktree. See "Before any plan" in `plans/README.md`.
- The owner asked that heavy commands stay off the MacBook. A headless browser run is heavy. Run it on a remote machine if the operator gave you one.

## Current state

Line numbers are from commit `9ee19cc`.

**The garage lights are created visible.** `src/render/garage.js:293-310`:

```js
  const spot = (color, intensity, angle, pos, at, decay = 1.6) => {
    const l = new THREE.SpotLight(color, intensity, 60, angle, 0.85, decay);
    l.position.set(...pos);
    l.target.position.set(...at);
    group.add(l, l.target);
    return l;
  };
  ...
  const spots = [...studio.map(([l]) => l), ...lights];
```

**The garage starts "inactive", but nothing hides it.** `src/render/garage.js:330` declares `active = false`. `setActive` at `:345-360` is the only place that sets `group.visible` and each spot's `visible`:

```js
    setActive(on, scene, keep = []) {
      if (on === active) return;
      active = on;
      ...
      group.visible = on;
      for (const l of spots) l.visible = on;
    },
```

**The boot warm-up.** `src/main.js:873-889`:

```js
progress(0.75, 'Compiling shaders…');
toTitle();
...
await post.compile(scene, camera);
post.render(scene, camera);
...
garage.setActive(true, scene, garageKeep);
await post.compile(scene, camera);
post.render(scene, camera);
```

The first `compile` is meant to cover the race and the second the garage. But `setActive` has not been called yet when the first one runs, so the garage group and its seven spots are still visible from creation. Both compiles see seven spot lights. The race's light setup (no spots) is never compiled at boot. It is compiled inside the first frame of the first race.

The first `post.render` also draws the track under garage lighting. One terrain material then needs its own textures, three sun shadow maps and four spot shadow maps, which is more than the 16 texture units the GPU allows. That is the error logged on boot:

```
THREE.WebGLProgram: Shader Error 0 - VALIDATE_STATUS false
Material Type: MeshStandardMaterial
Program Info Log: FRAGMENT shader texture image units count exceeds MAX_TEXTURE_IMAGE_UNITS(16)
```

**What the advisor measured**, with the tool from step 1. The first row had a cold driver cache. The rest ran later with it warm. The machine was under other load throughout, so read the times as ranges.

| Start | Enter to GO | Worst frame | New programs | Time in shader link | Shader error |
|---|---|---|---|---|---|
| Proving Ground Grand Prix, cold | 10.2 s | 6216 ms | 52 | 6483 ms | yes |
| Proving Ground Grand Prix | 3.6 s | 1050 ms | 52 | 312 ms | yes |
| Airfield Grand Prix (two runs) | 3.6 to 4.2 s | 1033 to 1217 ms | 62 to 63 | | yes |
| The Pad, The Lineup | 3.8 s | 1183 ms | 56 | | not recorded |
| Launch Complex Time Trial, night (four runs) | 2.9 s | 267 to 367 ms | 48 | | no |
| Any restart | 2.0 s | 33 to 67 ms | 0 | | |

Of the 52 new programs on the Proving Ground, 46 differ from a program compiled at boot in exactly two fields of the cache key: spot lights 7 to 0, and spot light shadows 4 to 0.

With the two lines of step 2 applied in a scratch copy:

| Start | Enter to GO | Worst frame | New programs | Time in shader link | Shader error |
|---|---|---|---|---|---|
| Proving Ground Grand Prix (two runs) | 2.6 to 2.7 s | 117 to 133 ms | 19 | 77 to 80 ms | no |
| Airfield Grand Prix (two runs) | 2.7 s | 117 ms | 23 to 26 | | no |
| The Pad, The Lineup | 2.8 s | 200 ms | 25 | | not recorded |
| Launch Complex Time Trial, night (four runs) | 2.6 to 3.2 s | 117 to 550 ms | 12 | | no |

One of the four night runs had a 550 ms frame. The other three were 117 to 183 ms. The loading screen took 0.7 to 0.9 s longer in two pairs of runs and was within the noise in the other four. The advisor looked at the title screen, a daytime race, a night race and The Lineup with the fix applied: all drew as before, and `npm test` passed.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Browser tools install (once) | `npm install --prefix tools` | exit 0 |
| Dev server | `npm start` | `http://localhost:8790/` |
| Sim tests | `npm test` | exit 0, 0 fail |
| First-start check (after step 1) | `node tools/first-start.mjs ['<url>']` | JSON on stdout; exit 0 when 30 or fewer programs are new and no shader error is logged |

## Scope

**In scope**:
- `tools/first-start.mjs` (create)
- `src/render/garage.js` (two lines after the `spots` declaration)
- `progress.md`, `plans/README.md`

**Out of scope** (do NOT touch):
- `src/main.js`. The warm-up order there is right once the garage starts hidden.
- `src/render/post.js`, `src/render/terrain.js`, `src/render/sky.js`. The shader error goes away without touching them.
- Keeping the spot lights on during a race at zero brightness so one program serves both. It would make every pixel of a race pay for seven spot lights and four shadow maps.
- Anything under `src/sim/`, `rl/`, `server/`.

## Git workflow

- Branch: `advisor/012-first-start-freeze`.
- Two commits: `chore(tools): first-start check for shader warm-up`, then `fix(garage): start hidden so the boot warm-up compiles race lighting`.
- Do NOT push.

## Steps

### Step 1: Add the check and see it fail

Create `tools/first-start.mjs`:

```js
import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://localhost:8790/?venue=proving&event=gp';
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: !process.env.HEADED, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.route('**/src/main.js', async (route) => {
  const res = await route.fetch();
  await route.fulfill({ response: res, body: `${await res.text()}\nwindow.__gl = { renderer, get race() { return race; }, get mode() { return mode; } };` });
});
await page.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done') && window.__gl, null, { timeout: 180000 });
const bootMs = Date.now() - t0;
await page.waitForTimeout(4000);
const shot = async (name) => { if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }); };
await shot('title');

async function toGo(key) {
  const before = await page.evaluate(() => { window.__perf.frames.length = 0; return { programs: window.__gl.renderer.info.programs.length, t: performance.now() }; });
  await cdp.send('Profiler.start');
  await page.keyboard.press(key);
  await page.waitForFunction(() => window.__gl.mode === 'race' && window.__gl.race.phase !== 'racing', null, { timeout: 20000, polling: 16 });
  await page.waitForFunction(() => window.__gl.race.phase === 'racing', null, { timeout: 60000, polling: 16 });
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, k) => {
    const f = byId.get(id).callFrame, name = `${f.functionName || '(anonymous)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
    self.set(name, (self.get(name) || 0) + profile.timeDeltas[k] / 1000);
  });
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, ms]) => `${Math.round(ms)} ms  ${name}`);
  const out = await page.evaluate((b) => {
    const f = window.__perf.frames;
    return { toGoMs: Math.round(performance.now() - b.t), worstFrameMs: Math.round(Math.max(...f)), framesOver100: f.filter((x) => x > 100).length, newPrograms: window.__gl.renderer.info.programs.length - b.programs, longTasks: window.__long.filter((l) => l.at >= b.t).sort((x, y) => y.ms - x.ms).slice(0, 5) };
  }, before);
  return { ...out, top };
}

const first = await toGo('Enter');
await page.waitForTimeout(2000);
await shot('race');
const again = await toGo('KeyR');
console.log(JSON.stringify({ url, bootMs, first, again, errors: [...new Set(errors)] }, null, 1));
await browser.close();
process.exit(first.newPrograms > 30 || errors.some((e) => e.includes('Shader Error')) ? 1 : 0);
```

It boots the game, presses Enter on the title screen, and times the run up to GO. It reports the worst frame, the long tasks, how many shader programs were compiled during the start, and the eight functions with the most CPU time. Then it restarts with R and reports the same again. With `SHOTS=<dir>` it also saves `title.png` and `race.png`.

On a machine without Google Chrome at the default path, set `CHROME` to a Chromium binary. On Linux or Windows, drop `--use-angle=metal` by editing the `args` list for your run only, and do not commit that edit.

```sh
npm install --prefix tools
npm start &
mkdir -p /tmp/plan012/before
SHOTS=/tmp/plan012/before node tools/first-start.mjs > /tmp/plan012/before.json; echo "exit $?"
grep -n "newPrograms\|worstFrameMs\|toGoMs\|Shader Error" /tmp/plan012/before.json
```

**Verify**: `exit 1`. `first.newPrograms` is between 45 and 65. `again.newPrograms` is 0. On a daytime venue the errors list holds the `MAX_TEXTURE_IMAGE_UNITS` shader error. `first.top` starts with `getProgramInfoLog`.

If `first.newPrograms` is already under 30, someone fixed this. STOP.

### Step 2: Start the garage hidden

In `src/render/garage.js`, directly after the line `const spots = [...studio.map(([l]) => l), ...lights];`, add:

```js
  group.visible = false;
  for (const l of spots) l.visible = false;
```

This makes the garage's real state match its `active = false` flag. The first boot compile now sees the race's lights. `garage.setActive(true, ...)` then shows the garage, and the second compile covers it.

**Verify**:

```sh
mkdir -p /tmp/plan012/after
SHOTS=/tmp/plan012/after node tools/first-start.mjs > /tmp/plan012/after.json; echo "exit $?"
grep -n "newPrograms\|worstFrameMs\|toGoMs\|Shader Error" /tmp/plan012/after.json
```

→ `exit 0`. `first.newPrograms` is 30 or fewer (the advisor saw 19). No `Shader Error`. `first.worstFrameMs` is well under the value in `before.json`.

**Verify**: run the check on the other venues. Each exits 0:

```sh
for q in 'venue=airfield&event=gp' 'venue=pad&event=lineup' 'venue=launch&event=tt&night'; do node tools/first-start.mjs "http://localhost:8790/?$q" > /tmp/plan012/$(echo $q | tr '&=' '__').json; echo "$q exit $?"; done
```

### Step 3: Look at it

Open `/tmp/plan012/before/title.png` beside `/tmp/plan012/after/title.png`, and the two `race.png` files. The turntable turns, so the car's angle differs. Everything else must match: the car is lit by the studio spots on the title screen, and the race shows road, rivals, grandstands and HUD.

Then load `http://localhost:8790/?venue=launch&event=gp&autostart&autopilot&night` in the smoke tool or a browser and check that a race that starts without ever showing the garage still draws.

**Verify**: no visible difference apart from the turntable angle. No console error.

### Step 4: Tests and log

`npm test` → exit 0, same count as before. Nothing under `src/sim/` changed.

Append to `progress.md` a section `## Session <date>: first-start freeze (plan 012)` with the before and after JSON for the Proving Ground, and one sentence on the cause.

## Test plan

- `tools/first-start.mjs` is the regression check. Its exit code rests on the count of programs compiled during the first start, which does not depend on how fast the machine is. It fails at `9ee19cc` and passes with the fix.
- There is no unit test: the bug is in the order of GPU work at boot, which only a browser shows.
- Add the command to whatever pre-release checklist the owner keeps (`progress.md` lists launch gates).

## Done criteria

- [ ] `node tools/first-start.mjs` exits 0 on all four venues
- [ ] `first.newPrograms` is 30 or fewer on each
- [ ] No `Shader Error` in any run's `errors`
- [ ] The before and after screenshots match apart from the turntable angle
- [ ] `npm test` exits 0
- [ ] `git diff --stat -- src/main.js src/sim rl server` is empty
- [ ] `progress.md` and `plans/README.md` updated

## STOP conditions

Stop and report back if:

- The `spots` line or `setActive` in `src/render/garage.js` does not match "Current state".
- After step 2 the title screen is dark or the car is unlit. Something relies on the garage being visible before `setActive`. Report the screenshot. Do not add a second `setActive` call in `src/main.js` to compensate.
- After step 2 `first.newPrograms` is still above 30. Report `first.top` and the count. The remaining programs need their own diagnosis.
- The tool cannot reach GO (a timeout). Earlier plans changed the title screen's first key press. Report what the title screen shows.

## Maintenance notes

For the owner:

- **Why it broke silently**: `setActive(false)` returns early when the garage is already "inactive", so the flag and the scene could disagree from the first line. Any new light added to the garage group inherits the fix, because the group itself now starts hidden.
- **What is left in the first start**: 12 to 26 programs still compile there, costing about 80 ms in total, and `audio.start` (`src/audio.js:220`) takes 120 to 280 ms on its first call. The worst frame after the fix is 117 to 200 ms. If that still shows, the next step is to list the remaining programs' cache keys and find which state differs, and to build the audio graph during loading.
- **The loading screen** may take up to a second longer, because the race's programs are now compiled there. That time used to be a frozen frame.
- **An open question, not part of this plan**: `src/sim/race.js:138` caps the respawn speed at 90 m/s, or at 45 m/s when the place the car wrecked is not a safe respawn point. It reads the wreck site, not the place the car is put back. If the 45 is a penalty for wrecking in a loop or a jump, it is working as meant. If it was meant to protect the restart point, it tests the wrong index. It is a sim change either way, so it belongs with the next version bump.
- Reviewer: check the two lines sit after `const spots` and before any code that reads `group.visible`, and that `src/main.js` is untouched.
