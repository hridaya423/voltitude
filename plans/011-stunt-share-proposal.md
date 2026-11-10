# Proposal 011: more of the lap on walls and in the air

The prototype is on the branch `spike/011-airfield-bank`, five commits on top of `014db02` (the lap map). It is not merged. `SIM_VERSION` stays 18. The tests, `circuit.js`, `drive.js`, `driver.js`, `line.js`, `race.js`, `server/` and `assets/ghosts/` are unchanged on the branch.

Each variant is a separate commit, so the owner can check out any one of them:

| Commit | Variant |
|---|---|
| `63d071a` | Hairpin banked to 45 degrees (the plan's step 3) |
| `14e9f93` | Hairpin banked to 35 degrees |
| `1c3ef54` | Hairpin on a 79 m arc, bank under 0.5 degrees per metre (peak 35) |
| `2fe4878` | The 79 m arc at a 45 degree peak |
| `8e43999` | 45 degrees, with the Hangars sector flag moved 30 m onto the flat exit (the recommended version) |

## 1. The lap map before

`node tools/lap-map.mjs all 3` on `advisor/integration` (`014db02`). The AI drives at full pace and the second lap is timed.

| Venue | Lap | Flat out | Braking | Turning | On a wall | In the air |
|---|---|---|---|---|---|---|
| Proving Ground | 75.8 s | 23.5% | 30.2% | 30.0% | 7.3% | 9.0% |
| Airfield | 80.6 s | 27.0% | 36.7% | 34.6% | 0% | 1.8% |
| Launch Complex | 69.2 s | 23.6% | 38.7% | 28.6% | 6.9% | 2.2% |
| The Pad | 37.3 s | 25.9% | 22.2% | 46.5% | 0% | 5.4% |

Flat-out stretches of 3 s or more:

| Venue | From m | To m | Seconds | Ends at | Ends in |
|---|---|---|---|---|---|
| Proving Ground | 3176 | 3609 | 5.7 | 294 km/h | brake |
| Airfield | 0 | 283 | 3.3 | 331 km/h | brake |
| The Pad | 77 | 260 | 3.7 | 220 km/h | air |
| The Pad | 769 | 1025 | 4.5 | 251 km/h | brake |

## 2. The prototype: the Airfield's Hangars hairpin

Baseline on `advisor/integration`: lap 80.6 s, wall 0%, gas 0.47 tanks per lap in a Time Trial and 0.84 in a Grand Prix, 189 tests pass, exploits PASS. The AI bench (`ai-bench 5 airfield`) already fails before any change: rookie `contacts` 5.2 and easy `contacts` 4.0 (the limit is 3). Pro and elite pass.

| Variant | Lap | Wall | Air | Gas TT / GP | Peak bank, fastest change | Failing tests | Bench (`ai-bench 5`) |
|---|---|---|---|---|---|---|---|
| Before | 80.6 s | 0% | 1.8% | 0.47 / 0.84 | 8°, under 0.5°/m | none | rookie and easy FAIL contacts |
| 45° | 76.9 s | 2.8% | 1.9% | 0.61 / 0.96 | 45°, 0.86°/m | `reset returns the car to the last checkpoint` | rookie FAIL contacts, others PASS |
| 35° | 80.8 s | 0% | 1.8% | 0.47 / 1.04 | 35°, 0.67°/m | `reset returns the car to the last checkpoint` | rookie (4.8) and easy (3.6) FAIL contacts |
| 79 m arc, bank under 0.5°/m | 79.7 s | 0% | 2.0% | 0.47 / 0.82 | 34.7°, 0.50°/m | `reset returns...`, `Airfield: a kerb never launches...` | rookie FAIL contacts (4.6), elite FAIL air |
| 79 m arc, 45° peak | 78.9 s | 1.7% | 1.8% | 0.55 / 1.08 | 42.8°, 0.67°/m | `reset returns...`, `Airfield: a kerb never launches...` | rookie FAIL contacts (4.0) |
| 45°, sector moved | 76.9 s | 2.8% | 1.9% | 0.61 / 0.96 | 45°, 0.86°/m | none (189 pass) | rookie FAIL contacts (4.4), others PASS |

Notes:

- The exploit check (`exploits.mjs airfield`) passes on every variant.
- No ghost test failed on any variant. The plan expected the Airfield ghost tests to fail.
- In the 45° variant the AI holds 147 km/h at mid-corner. Before the change it held 82 km/h. The fan effort peaks at 0.42.
- At 35° the Grand Prix gas rises, but the wall column of `gas-econ` stays at zero. The extra gas comes from draft and near misses, because the field bunches up in the corner. It is not wall gas.
- Gas per lap rises by 0.14 tanks in a Time Trial (0.47 to 0.61) and by 0.12 in a Grand Prix (0.84 to 0.96).

## 3. What a banked corner needs

**35 degrees is not enough.** The fan effort is `(0.86 − cos tilt) / 0.36` (`drive.js:474`). At 35 degrees it is 0.11, which gives about 1.5 g of extra grip. The lap map counts a tick as a wall only above 0.2, which needs 38 degrees of tilt. At 35 degrees the lap was 0.2 s slower than before. A wall-ride corner needs a peak of 40 degrees or more.

**The 0.5°/m rule and a 40 degree peak do not fit on this corner.** The largest arc that keeps both ends of the corner and their headings has a radius of 79 m (the old arc is 37 m). It moves the two straight nodes before the corner and replaces the ten corner nodes with fourteen. On that arc, the steepest profile that stays at 0.5°/m peaks at 34.7 degrees. `circuit.js:182` scales the bank by curvature, so a straight cannot hold bank, and the smoothing window cuts the peak further. The longer arc was also slower than the short 45 degree corner (78.9 s against 76.9 s), and it added the kerb test failure. The short corner at 45 degrees is the better shape. No test holds the Airfield to 0.5°/m: `tests/handling.test.js:44` checks only the Proving Ground. If the owner wants the 0.5°/m rule on every circuit, a banked hairpin needs at least 180 m of curve. That means a new corner, not a re-banked one.

**Why `reset returns the car to the last checkpoint` fails.** A checkpoint sits two metres after the node that carries a `sector` flag (`race.js:235`). On a reset, `respawn` walks back from the checkpoint to the first point where the road's up-vector is above 0.95 (`safeAt`, `race.js:130`), which means a bank of less than about 18 degrees. The Hangars sector flag is on the last banked node, where the road is at 31 degrees. So the car respawns at metre 1060, which is before the corner and 120 m behind the checkpoint at 1180. A player would feel this: a reset takes away a corner they had already driven. The test protects a real thing. The fix is in the track, not in the test: put the sector flag on a flat node. Commit `8e43999` moves it 30 m on, to `[445.51, 621.62]`, and all 189 tests pass. The sector split moves 30 m too.

**Why `Airfield: a kerb never launches a car the road centre would keep down` fails.** It fails only on the 79 m arc, at samples 1170 to 1185 on side +1. That is the exit, where the road still curves while the bank unwinds. The test places a car 1.75 m inside the road edge, 30 m before each sample, at 1.1 times the racing-line speed. Then it checks that the car leaves the ground only if a car on the centre line would also leave the ground. As the bank unwinds, the high edge drops faster than the centre. A fast car on that edge goes light and takes off, while a car on the centre line stays down. A player would feel this as the car hopping off the edge of the corner exit. The short 45 degree corner does not trip it. My best explanation is that its unwind happens on the straight, where the line speed is lower and the car is no longer on the kerb. I did not prove this. The test should stay as it is. A corner that fails it should get a shorter unwind or a lower peak.

**The bench.** On the recommended variant, rookie `contacts` reads 4.4 against a baseline of 5.2, and easy passes (4.0 at baseline). The bank does not make the field collide more. The rookie failure is there before the change, so it needs its own look.

**What the frames show.** I captured the AI in Practice on the recommended variant, from the chase camera at metres 1030 (approach), 1080, 1120 (mid-corner), 1170 and 1215 (exit) and 1290 (hangars). I also shot fixed cameras from above, from outside at ground level and from inside the corner, and the same views on `advisor/integration`.

- The bank reads as a wall ride. From the inside camera, the car sits on a steeply tilted road under a high outer kerb and wall. The chase camera rolls with the car, so the horizon tilts by about 45 degrees at mid-corner and the gas bar turns blue (wall gas).
- At the outside edge, the terrain has no gap and no spike. From outside at ground level, the raised edge of the bank stands as a tall white retaining wall with struts, with the green verge on top. Its base meets the desert floor cleanly.
- The barriers follow the bank. The inner wall and the outer wall run along both edges with the kerbs.
- The outer run-off at the apex shrinks from about 19 m to 10 m. The props that stood outside the corner are gone after the re-bake: the pink tents, a truss tower and a stack of containers. Something in the scenery placement now avoids that ground. Nothing hangs in the air.
- The hangar roofs after the corner still line up. At metres 1215 and 1290 the road runs straight into the arches.
- The dark slab across the exit in the low view is the existing grandstand roof. It is the same before the change.

## 4. Candidates

Gains scale from the prototype: one banked hairpin gave 2.8 points of wall share and 3.7 s on the Airfield. The other rows are estimates, not measurements. Every row costs, per venue: a terrain re-bake, a `SIM_VERSION` bump, `node tools/medals.mjs all` (author ghosts and medal times re-baked), the AI bench, and a Worker redeploy. "Nodes" counts what changes in `venues.js`.

| Rank | Venue | Where | Change | Expected gain | Nodes | Beside it |
|---|---|---|---|---|---|---|
| 1 | Airfield | Hangars hairpin, about metres 1040 to 1200 | 8° to 45°, Hangars sector flag 30 m on (the prototype) | Measured: +2.8 points wall, −3.7 s, +0.14 tanks TT | 10 banks, 1 flag | Hangar roofs start about 85 m on, unaffected. Grandstand at the exit, unaffected. Props outside the apex are lost. |
| 2 | The Pad | Both 180 degree ends (at metres 507 and 1275, 262 m and 248 m, radius 77 m, apex 103 and 101 km/h) | 14° to 45°, ramped at 0.5°/m | About +5 points per end on a 37 s lap (each end is longer than the hairpin and the lap is half as long), so +10 in total. The Pad would go from 5.4% to about 15%. | 23 banks per end | The jump at 231 to 400 ends 107 m before the first end. The `Back` sector at 1018 is on the back straight. There are no roofs and no gates. These are the only candidates long enough for 0.5°/m (90 m ramps leave about 80 m at full bank). |
| 3 | Airfield | The three slow hairpins the lab finds: metre 604 (176 m, radius 41 m, apex 73 km/h), 2516 (160 m, 45 m, 67 km/h) and 2754 (176 m, 49 m, 81 km/h) | 6° or 8° to 45°, the same shape as the prototype | About +2.8 points and 3 to 4 s each | 6 to 8 banks each | Check each for sector flags on banked nodes. The jump and gate at 3110 to 3219 are 180 m after the last one. Not in the plan's list: the lab's corner table shows they match the prototype. |
| 4 | Airfield | The two sweepers after Tower (metres 2011 and 2250, radius about 135 m, apex 138 km/h) | 8° to 40° | Smaller than a hairpin. They are fast already, so the bank adds less time. About +1.5 points each. | 7 banks each | The `Tower` sector flag sits one node before the first sweeper (checkpoint at 1995). Move it back one node, or the reset test's problem returns. |
| 5 | Proving Ground | Metres 3176 to 3609 (5.7 s flat out, braking at 294 km/h) | A kicker with a gate before the braking zone | About +2 to 3 points of air, from the existing jump at 2877 (340 m of air) | 1 jump node, 1 gate | No jump or gate on the stretch. The last gate is at 2982. The start line and grid are at metre 0, so the landing must clear before braking at 3609. Kickers were not tested in this spike. |
| 6 | Launch Complex | The 6 degree pair at metres 1750 and 1846 (radius 157 and 162 m, 50 m and 92 m long, apex about 150 km/h) | 6° to 40° | Small. The corners are short and fast. | 8 banks | The circuit already has its 50 degree bowl. The pair at 2505 and 2534 sits right after the jump and gate at 2402 to 2511, so leave that pair flat. |
| 7 | The Pad | The back straight, 769 to 1025 | A second kicker | About +3 points of air | 1 jump node | Rank 2 changes more of the lap. Do this only if the ends stay flat. |

Recommendation: ship ranks 1 and 3 together. They bring the Airfield to about 13% on walls and in the air, from 1.8%. Add rank 2 for The Pad. Batch them into one release with one version bump.

## 5. A target

Suggested target: no circuit under 10% of the lap on a wall or in the air.

Braking does not move much with banking. The prototype cut the Airfield's braking share from 36.7% to 35.9%, because the AI still brakes into the banked corner, only less. The suggested "under 30% braking" target is out of reach by banking alone. Keep it as a target only if the owner also funds longer straights or plan 010's slide. Otherwise drop it.

## 6. What the spike did not test

- A human driving the banked corner, at the keyboard or on a pad. The bank changes at 0.86°/m, above the 0.5°/m held on the Proving Ground.
- Eight cars on the corner at once in a Grand Prix, beyond the bench's contact count.
- The corner at night.
- Kickers (ranks 5 and 7).
- Why the scenery props outside the corner disappear after the re-bake.
- Why the rookie tier fails `contacts` on the Airfield before any change.
