# Game feel: steer, boost, fly, land

An audit of the four core actions against the six parts of game feel in Swink's *Game Feel* (2008):

- **Input:** what the player presses.
- **Response:** how the simulation answers.
- **Context:** the space that gives the action meaning.
- **Polish:** the effects that sell the answer.
- **Metaphor:** what the action pretends to be.
- **Rules:** what the action is worth.

For each action, the polish row lists the current camera, shake, sound, rumble and time-scale values from the code.

Sources:
- Swink, *Game Feel*.
- Jonasson and Purho, "Juice it or lose it" (GDC Europe 2012): layer cheap feedback on every event.
- Nijman, "The art of screenshake" (2013): kick the camera along the action, keep shake short, and use permanence.
- Griesemer, "30 seconds of fun": the loop must feel good at the scale of a few seconds.

They were applied from what is already known about them. They were not re-watched this session, and the Playground Games GDC talks were not looked up.

## Audit (before tuning, at df7e493)

### Steer

| Part | Now |
|---|---|
| Input | Keyboard steer ramps at 6/s (`input.js` `ramp(steerK, kSteer, 6)`). Gamepad stick curve `|x|^1.4`. |
| Response | Tyre model in `src/sim/drive.js`. Assists (ABS slip 0.115, TC slip 0.12) on by default. |
| Context | Kerbs 2.8 m wide inside the white line, Forza-style track limits (Task 31), and walls. |
| Polish: camera | The camera follows the car heading at 7/s on the ground. It looks into the turn by `yawRate × 0.15`, clamped to ±0.14 of the look-ahead (9–22 m). No roll. |
| Polish: shake | None from steering. Scrapes over 0.35 rad bump 0.25. |
| Polish: sound | Front tyre layer gain `+0.15 × |steer|`. Kerb, scrub and scrub-burn loops. |
| Polish: rumble | **None on kerbs.** Scrapes rumble `min(1, v/15)`. |
| Polish: time scale | None. |
| Metaphor | A light electric GT on a festival circuit. |
| Rules | Kerbs are free and the white line is the limit. Cutting costs the time gained. |

### Boost

| Part | Now |
|---|---|
| Input | Hold Shift. |
| Response | Rear thrust while gas lasts. The gas bar burns down with a bright edge. |
| Context | Straights and air-line approaches. Gas is earned from near misses, clean landings, gates, drafting and air. |
| Polish: camera | FOV +3° eased in at 3.3/s and back +0.4 m. On release, a 0.3 s "breath" of −1.5°. Post blur +0.25, chromatic aberration +0.012. **No onset accent.** |
| Polish: shake | None. |
| Polish: sound | `ignite_gas` plus `burst_long` on ignition, ducking for 0.8 s. Roar and low loops, a music duck, and `vent` on release. |
| Polish: rumble | **None.** |
| Polish: time scale | None. |
| Metaphor | Rear thrusters (the plumes are drawn). |
| Rules | Burns gas. The draft and near misses refill it. |

### Fly

| Part | Now |
|---|---|
| Input | Pitch W and S, roll A and D in the air. Hold Space to lift or hover; a tap hops. |
| Response | Lift is 1.15 g and burns 0.4 gas/s. A hop is 9.2 m/s for 0.11 gas, with a 0.6 s cooldown. |
| Context | Air lines with a lip marking, gates 10.8 m up, and the ground line alongside. |
| Polish: camera | In the air, heading follows velocity at 3/s, with +0.6 m up. While hovering it moves back +1.5 m and up +1 m (2/s). |
| Polish: shake | None. |
| Polish: sound | Wind layers, `burst_long` at lift start, hiss loop `0.45 × lift`. |
| Polish: rumble | **None on lift.** |
| Polish: time scale | None. |
| Metaphor | A hover-capable car leaving a ramp. |
| Rules | An air line is 0.6–1.2 s faster when landed clean. Gates pay gas. |

### Land

| Part | Now |
|---|---|
| Input | None. The land grade comes from the attitude set while flying. |
| Response | Graded in `drive.js` `landing()`. Perfect: alignment > 0.95 and impact < 16 m/s. Clean: > 0.8 and < 24 m/s. Hard: anything worse, −10% speed. Wreck: alignment < 0.45. |
| Context | Landing ramps and flat run-outs. |
| Polish: camera | Perfect: bump 0.25. Clean: bump 0.35. Hard: bump 0.9 and a 0.05 s camera stall. Wreck: bump 1.2 and a 0.08 s stall. **A perfect landing shakes less than a clean one, so the reward runs backwards.** |
| Polish: shake | Same as the camera row; shake decays at 1/s, squared. |
| Polish: sound | Perfect `perfect`, clean `check`, hard `impact`, plus a cheer near stands. |
| Polish: rumble | Perfect (0.3, 0.5, 140 ms). Clean (0.4, 0.3, 140 ms). Hard (0.9, 0.4, 220 ms). |
| Polish: time scale | None. |
| Metaphor | Sticking a landing. |
| Rules | Perfect and clean landings pay gas; tricks pay more. Hard landings cost speed. |

### Time scale

Time scale is not used on any action, and that is deliberate. The sim runs at a fixed 120 Hz, and a hit-pause in a racer reads as a dropped frame. Rivals are on screen, so a pause would freeze the whole field. The camera stall on hard landings and wrecks covers the same job: the camera holds while the car moves on.

## Tuning log

One change at a time. Each change has a 3 s before-and-after clip from the same seeded race (`Math.random` seeded the same way as `tools/shot-match.mjs`; Proving GP on autopilot). The clips are captured with a CDP screencast and kept in the session scratchpad.

### 1. Boost ignition gets an onset accent

- Change: a camera `punch(1)` on the frame boost starts. It adds 4° of FOV that decays at 5/s on top of the eased boost FOV (off under reduced motion). Also a rumble of 0.15 strong, 0.6 weak, 200 ms.
- Why: before, boost eased in over 0.4 s with no first-frame change, so pressing Shift felt soft. Nijman: kick along the action at once, then let it settle.
- Measured (camera FOV minus its value at ignition, every second frame, same seeded race):
  - before: 0.16 0.47 0.75 1.0 1.24 … 3.0 at 0.6 s
  - after: 3.84 3.58 3.38 3.23 3.12 3.05 3.0 … then the same ease
- Clip frames (scratchpad `t22/boost-ab.jpg`, before top, after bottom, 0.13 s apart from 0.1 s before ignition): the car shrinks in frame on the ignition frame in the after row. In the before row it holds and then eases. Clips: `t22/boost-before.mp4`, `t22/boost-after.mp4`.

### 2. A perfect landing hits harder than a clean one

- Change:

  | Landing | Shake bump | FOV thump | Rumble (strong, weak, duration) |
  |---|---|---|---|
  | Perfect | 0.25 → 0.3 | −2.4° (`punch(-0.6)`) | (0.3, 0.5, 140 ms) → (0.45, 0.6, 160 ms) |
  | Clean | 0.35 → 0.2 | −1.2° | (0.4, 0.3, 140 ms) → (0.3, 0.3, 140 ms) |
  | Hard | unchanged: 0.9 and a 0.05 s stall | none | unchanged |

  `punch` now takes a sign, clamped to ±1.5.
- Why: the reward ran backwards. A clean landing shook more than a perfect one, and neither had a beat on the frame of contact. Swink's polish row should rank the outcomes the way the rules do.
- Measured (camera FOV from the frame the PERFECT toast appears, every second frame):
  - before: 0 0 0 0 −0.01 … (the normal speed-driven drift only)
  - after: the landing frame sits 2.4° tighter, then recovers +0.34 +0.62 +0.86 … +1.9 by 0.6 s
- Clip frames (`t22/perfect-ab.jpg`, before top, after bottom): the car fills more of the frame on contact in the after row, with a small roll from the shake. Clips: `t22/perfect-before.mp4`, `t22/perfect-after.mp4`.

### 3. Steer: kerbs rumble

- Change: while the car is on the kerb band (`c.kerb`, the flag the kerb audio already uses), the weak motor pulses every 80 ms at `min(0.4, speed / 90)` for 100 ms. Off below 4 m/s.
- Why: kerbs had sound but nothing in the hands. Riding a kerb is how a driver finds the edge of the track, and Task 31 made the white line the limit.
- Evidence: a rumble clip can't be seen, so `input.rumble` calls were logged over the same keyboard drive (Proving TT, full throttle, steering taps onto the right kerb, then Space). Before: 0 kerb pulses in 90 kerb frames. After: 18 pulses at 0.36–0.40. Scratchpad `drivelog.mjs`.
- Found on the way: a hard steer onto the kerb at speed throws the car airborne over the kerb lip (mode 0 in the band), so neither the kerb sound nor the rumble plays then. Left as it is: that is the physics of the kerb profile, not the feedback.

### 4. Fly: lift start rumbles

- Change: one pulse on the frame lift engages (0.1 strong, 0.45 weak, 180 ms). It pairs with the `burst_long` sound already there.
- Evidence: same drive. Before: no call at lift start. After: one call with `lifting` true.

### 5. Near misses read CLOSE

- Change: the near-miss gas gain reads "+12 CLOSE" instead of "+12 NEAR MISS", as the design asks ("a clear CLOSE for near misses"). The label uses the shared toast plate from Task 21.
- Checked: `tools/a11y-probe.mjs` measures "+12 CLOSE" at 14 px and 13.4:1 or better on all three runs. The probe passes, 0 of 91.

## Not changed

- **Time scale.** See the audit: a hit-pause would read as a dropped frame and freeze the field.
- **Takeoff.** The camera already lifts 0.6 m and switches to velocity heading at the lip, and the wind layers rise. The clips show the takeoff reads without more.
- **Steer camera.** The look-ahead bias and 7/s heading follow were not touched. No clip showed lag or overshoot that a change would fix.
