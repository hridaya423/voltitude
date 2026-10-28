# Voltitude: what makes driving pleasant

Written 2026-10-27. Scope: moment-to-moment feel. Medals, restarts, onboarding, tank economy and the hit-stop and landing-tier table are in `game-design.md` and not repeated.

## How to read this

Marks follow `game-design.md`: `✓` I fetched and read the page; `~` search-result summary only; `○` exists, contents unread; **P** the number is my proposal, tuned against the code. "Derived" means I computed it from a verified source.

**Honest gap.** The talks you named were mostly unreachable. No usable Nadeo, Playground, Criterion, Milestone or Psyonix primary material on steering, camera or collisions turned up, and the GDC Vault, Epic, Audiokinetic and Unreal pages returned 403 or redirects. Shipped-game numbers therefore come from datamined constants (Rocket League, Mario Kart Wii), one Nadeo patch note and one audio write-up. Everything else is P.

Baseline in code (`src/input.js`, `src/sim/flight.js`, `src/render/camera.js`): keyboard steer ramp 7/s (143 ms to full); yaw rate 1.75 falling to 1.35 rad/s at 120 m/s; chase position rate 14/s (half-life 50 ms), look 18/s, heading 7/s grounded and 3/s airborne, up-vector 9/s grounded (77 ms) and 1.6/s airborne (433 ms); FOV 66 to 88, +6 on boost.

---

## 1. Steering feel

| Finding | Parameter | Source |
|---|---|---|
| Rocket League steer angle falls with speed: 0.534 rad at 0, 0.319 at 500 uu/s, 0.182 at 1000, 0.106 at 1500, 0.085 at 1750, 0.035 at 3000. Multiply by speed and you get yaw rate. Derived: yaw rate is nearly flat from 500 to 1500 uu/s (±10% of peak), and about 0.79 of peak at the 2300 uu/s top speed. | Our 1.75 to 1.35 rad/s is 0.77 of low-speed rate. **Keep it.** The shape already matches. Do not make steering heavier at speed. | ✓ https://raw.githubusercontent.com/ZealanL/RocketSim/main/src/RLConst.h |
| Nadeo's Action Keys re-range analog input. 50% stick gives 30% steer on the Snow/Rally car, 60% max at full stick. Minimum sensitivity dropped from 1.0 to 0.1. Stated goal: "avoid high-end gaming devices being a requirement to perform well." | Gamepad curve exponent 1.4 (already in `input.js`) is right. Add a sensitivity slider that goes down to 0.1 and a 60% "precision" cap on a held key. | ✓ https://www.trackmania.com/news/7971?lang=it |
| A critically damped spring with a half-life parameter is frame-rate independent and carries velocity, so it never pops when the target jumps. | Replace per-frame `1-exp(-k dt)` blends on camera and steer with this spring. Half-life = ln2/k. | ✓ https://theorangeduck.com/page/spring-roll-call |

**Proposals (all P).**
- Keyboard: attack 6/s (167 ms to full), release 12/s (83 ms), for crisp straightening. No source.
- Lateral limit: `yaw = min(turn(v), 9 g / v)`. At 85 m/s that is 1.04 rad/s. It is the only physics-harshness gate you need.
- Countersteer assist: above 8° slip, add yaw toward velocity at 40% of the player's counter input, fading to 0 by 25°.
- Burnout and Forza assist internals: **not verified**. Only reviews and forum threads exist (Forza stability control "prevents oversteer completely", ~). No developer source for any assist number.

## 2. Drift and slide as reward

| Finding | Parameter | Source |
|---|---|---|
| Rocket League's powerslide uses a second steer curve: 0.392 rad at 0 and 0.126 at 2500 uu/s. Derived: 2.3x the normal steer angle at top speed (0.147 vs 0.063), 0.74x at standstill. | While sliding, multiply steer authority by 2.0 at top speed, 1.0 at low speed. | ✓ RLConst.h above |
| Mario Kart Wii mini-turbo is time-based. Charge +5/frame when steering 3 to 7 of 7 (any deflection above ~43% charges equally), +2/frame otherwise. Release at charge >270. Derived at 60 fps: 0.92 s to fire, 2.3 s worst case. Boost lasts 15 to 48 frames (0.25 to 0.8 s), +20% max speed. Blue sparks at charge 150 (0.5 s), orange at 180 (0.6 s). Super turbo (karts) is 3x length. | The cue arrives 0.3 to 0.4 s **before** the reward, so the player holds for it. Steering depth does not change charge rate, so wide and tight drifts both pay. | ✓ https://wiki.mkwtas.com/wiki/Miniturbo |

**Rule (P).** A slide is good when it is entered deliberately, readable, and faster than the clean line only when held. Numbers:
- Slide held 0.5 s: spark cue, rising tone. Release at 0.9 s: +15% speed for 0.5 s, decay over 0.3 s. The bonus is speed, not tank.
- Slip target 15 to 25°. Past 35° add 1.5 m/s² drag so the player self-corrects before a spin.
- Slide scrub drag: at most 5% speed loss per second, or nobody slides. Hop airtime does not count toward charge (Mario Kart Wii, ~ https://www.mariowiki.com/Mini-Turbo).

## 3. Camera

| Finding | Parameter | Source |
|---|---|---|
| Rocket League pro cameras: distance 260 to 280 uu (2.7 m), height 90 to 110, angle −3° to −5°, stiffness 0.35 to 0.46, swivel speed 1.8 to 10, transition speed 1.0 to 1.2, FOV 90 default with most pros at 108 to 110. These are community guides, not Psyonix. | Camera height about 0.37x distance and a slight down-tilt. Ours is 2.0 up at 6.6 to 8.5 back: 0.24 to 0.30x, lower and flatter, which hides the road. Raise to 2.4 up at 7.0 back (0.34x). **P** | ~ https://upcomer.com/rocket-league-guide-professional-camera-setup/ and https://www.gfinityesports.com/guides/best-rocket-league-camera-settings |
| Holm, Skovhus, Kraus: wider geometric FOV raised perceived speed; strong motion blur lowered it; higher camera altitude at high speed raised it. | Keep blur capped (game-design §2.1). Camera altitude +0.4 m at >60 m/s. | ~ https://eudl.eu/doi/10.1007/978-3-319-55834-9_14 (403, summary only) |
| Eiserloh's trauma model: gameplay adds trauma 0 to 1, it decays linearly, shake = trauma^2 or ^3. A reference implementation decays full trauma over 2 s. | Replace the current `shake *= exp(-5 dt)` with trauma: boost start 0.15, perfect landing 0.3, wreck 0.8, linear decay 1.0/s, shake = trauma^2 times 1.2° roll, 0.8° pitch. | ~ https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math |

**Proposals (all P; no source gave loop or wall camera values, and no Hot Wheels Unleashed, F-Zero or Trackmania camera numbers were found).**
- Surface transitions: up-vector half-life 0.15 s on entering a wall or loop (today 77 ms), so the horizon visibly sweeps. Returning to ground: 0.10 s.
- Heading follow: half-life 0.10 s grounded, 0.25 s airborne (today 99 and 231 ms; keep).
- Look-ahead: aim point leads by `velocity * 0.18 s`, plus lateral bias `clamp(yawRate * 0.15 s, ±8°)` toward the turn. Camera sees the exit before the car is there.
- Air: do not roll the camera with the car. Hold the velocity vector, world-up pull half-life 0.4 s (keep). Re-bind to the surface normal within 0.12 s of touchdown.
- FOV: ease-out `s = 1-(1-v/120)^2` so most of the widening arrives in the first 60 m/s, where acceleration is felt. Time constant 0.3 s up, 0.5 s down. Boost release undershoots −2° for 0.3 s ("breath").

## 4. Barrier collisions

| Finding | Parameter | Source |
|---|---|---|
| Mario Kart Wii wall hit: max speed drops to between 35% and just above 0 of its prior value depending on angle, stays lowered **while in contact**, and returns on leaving. | The harsh benchmark: scraping is a sustained penalty. Do not copy it. | ✓ https://wiki.mkwtas.com/wiki/IV |
| Burnout review: "considerable forgiveness when it comes to losing momentum from minor scrapes." Reviewer, not developer. Trackmania wall behaviour: no developer source found. | Glancing hits keep most speed. **Unverified.** | ~ search summary |

**Model (P).** Resolve contacts in components, not as a speed cap:
- `v_n' = −e v_n` with `e = 0` below 20° incidence, rising to 0.25 head-on.
- `v_t' = v_t − 0.15 (1+e) |v_n|`, floored at 0.
- Derived: 10° scrape loses about 4%; 45° loses about 40%; head-on stops you.
- Restore any cap you add at 25 m/s², not "when you leave."
- Yaw the nose toward the wall tangent at `3 sin(angle)` rad/s for 0.25 s so the car is not left aimed into it.
- Presentation by angle: under 20° sparks and scrape loop; 20 to 45° add 0.15 trauma; over 45° the existing impact table.

## 5. Air control and landing

| Finding | Parameter | Source |
|---|---|---|
| Rocket League air control torque (pitch, yaw, roll) = 130, 95, 400; damping 30, 20, 50; angular speed cap 5.5 rad/s (315°/s). Derived: roll is about 4x yaw authority, and roll damping is the highest. | Our `rollRate` 5.5 rad/s already matches the cap. Set pitch and yaw caps near 2.5 rad/s (P). Damping applies when the stick is released, so spins stop crisply (from memory ○: damping is scaled by 1 − |input|). | ✓ RLConst.h; https://rlgym.org/Cheatsheets/game_values |
| Celeste: "centered around widening timing or positioning windows... fudged a tiny bit in the player's favor." Half gravity at the jump apex "gives you more time to adjust for landing, and also just looks/feels pleasant." Frame counts not given. | Hover is your apex: reduce gravity to 50% when `|v_n| < 2 m/s`. Widen every window; never narrow. | ✓ https://maddymakesgames.com/articles/celeste_and_forgiveness/ |
| SSX: the 2012 demo was criticised for "too much auto-correct" at landings; SSX Blur lets you press a button before touchdown to re-orient, at a points cost. | The line between earned and free is **price and opt-in**. Make the assist cost tank, or do it automatically but with only a small cap. | ~ https://osftw.com/features/1443/ssx-demo-roundtable/ ; ~ https://strategywiki.org/wiki/SSX_Blur/Tips_for_Beginners |

**Landing assist (P).** "Wheels down" means relative to the **surface normal at touchdown**, so ceiling landings count.
- Time-to-impact raycast; assist starts at 0.5 s out.
- Angle between car up and surface normal at touchdown: **≤ 15° perfect**; **15 to 35°** auto-align in 0.15 s, no penalty, "clean"; **35 to 60°** align plus 8% speed loss, "hard"; **> 60°** wreck.
- Assist torque is 50% of full air torque and shuts off the moment the player gives any pitch or roll input. The assist never fights the player.
- Buffer hop and boost presses for 100 ms before touchdown. Allow hop for 100 ms after leaving a lip ("coyote").
- If over 70% of landings need the assist, the band is too wide.

## 6. Audio as feel

| Finding | Parameter | Source |
|---|---|---|
| Inertial Drift (Atmos): wind is procedural, driven by distance to walls in the sides and to overhead obstacles in the height channels. Each wheel makes its own surface sound; rolling and sliding scale with speed and slip. Tunnel reverb makes the engine louder. They tried several wind systems before this one. | Wind gain from speed plus a proximity term from side and overhead raycasts at 6 m. Your car goes under arches and along walls: this is the right design. | ✓ https://www.mcvuk.com/dolby-atmos-powerslides-into-arcade-racing-with-inertial-drift/ |

**Proposals (P).**
- No gears: motor whine +24 semitones across 0 to 85 m/s, gain follows throttle, lift-off drops 3 dB (regen).
- Wind gain 0 at 30 m/s to 1.0 at 125 m/s (already in game-design); add `+6 dB` bandpass 1 to 3 kHz when a wall is within 2 m, and a −4 dB low-pass step plus reverb send when an overhead surface is within 4 m.
- Fan spool: 150 ms rise when the car attaches to a wall. Sticking is the verb; give it a sound.
- Slide charge: tone steps at 0.5 s and 0.6 s, release thump (section 2).

## 7. Flow and pacing in 20 s

Source evidence is thin. Konno: "instantly enjoyable, but deep" and he played Mario Kart 7 "thousands of times" before completion (✓ https://nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Mario-Kart-7/Vol-2-In-house-Staff/2-Instantly-Enjoyable-But-Deep/2-Instantly-Enjoyable-But-Deep-231022.html). Milestone kept Hot Wheels at toy scale because it "reinforces the scaled feeling" (✓ https://kotaku.com/hot-wheels-unleashed-devs-on-making-2021s-most-surprisi-1847946535). Nothing I found quantifies tension and release. The rest is P.

**20 s shape.**
- 0 to 4 s: hook. Full throttle, a visible target.
- 4 to 13 s: technique. Two or three decisions, 2.5 to 4 s apart. At 70 m/s that is 175 to 280 m between decisions.
- 13 to 17 s: climax. The one set-piece with the biggest view: loop, gap, arch.
- 17 to 20 s: release. A straight, a boost pickup, the finish. End on the fastest speed.

**Landmarks.** Each set-piece visible at least 5 s ahead (350 m at 70 m/s). Reveal it over a crest, then give 1 s of calm before it. Use contrast to mark the line: dark void under a gap, bright strip along the wall run.

**Beat rule (P).** No two high-intensity events (landing, wall transition, boost) within 1.5 s unless the first sets up the second.

## 8. The thousand small things

Sourced: Mario Kart Wii's Wii Wheel icon turns gold, spectators are cheering Miis, and voice actors recorded while playing (✓ https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Mario-Kart-Wii/Bringing-Racers-Together/4-Mario-Kart-X/4-Mario-Kart-X-214639.html). Nijman's recoil numbers (6 px camera kick, +4 shake) come from a secondary write-up (~ https://infovore.org/?p=5275), not the talk.

Proposed (P):
1. Tyre marks on walls persist 4 s, so glancing hits leave evidence.
2. Suspension squash 30 mm over 80 ms on every surface transition.
3. Headlights tilt 4° into turns.
4. Dust colour sampled from the surface.
5. Boost release leaves nozzle heat shimmer for 0.6 s.
6. Ghost car dips its nose when you pass it.
7. Countdown 3-2-1 lands with the motor spooling; the pitch at "go" is full-throttle pitch.
8. 80 ms of silence after a wreck, then the respawn tone.

---

## Ranked top 15 changes

Ranked by expected smile per hour of work. Items 1 to 8 are cheap and go first.

1. **Component-based wall contact (section 4).** 20° threshold, no sustained cap. Over-punished scrapes are the likeliest frown.
2. **Landing assist bands (section 5).** ≤ 15° / 35° / 60°, surface-normal relative, input cancels assist.
3. **Camera spring rewrite (section 3).** Half-life critical spring; heading 0.10 s grounded; up 0.15 s on wall entry.
4. **Surface-transition horizon sweep.** The loop reads as a loop only if the camera lags it. Largest visual payoff for loops.
5. **Look-ahead `v * 0.18 s` plus yaw bias.** Sees the exit.
6. **Steer asymmetry 6/s attack, 12/s release; sensitivity down to 0.1; lateral-g cap 9 g/v.**
7. **Wind proximity audio.** Walls and arches get a voice (Inertial Drift model).
8. **Trauma shake with an exponent of 2.** Events spike, baseline hums.
9. **Slide with a 0.9 s timed payoff and a spark cue at 0.5 s.** Steer authority 2x at speed; +15% for 0.5 s.
10. **Apex half-gravity in hover** (Celeste rationale).
11. **Input buffer 100 ms and 100 ms coyote on hop and boost.**
12. **Camera 20 cm higher; FOV ease-out; −2° undershoot on boost release.**
13. **Electric motor whine and fan spool sounds**, speed-pitch mapping 24 semitones.
14. **20 s four-beat pacing and 5 s landmark visibility** as a checklist for sector review.
15. **The small-details list** (section 8).

## Could not verify

- Trackmania wall, glancing and steering internals; Nadeo camera or FOV values.
- Forza Horizon, Ridge Racer, Burnout steering assist numbers (only reviews and forums).
- Camera behaviour on loops in F-Zero, Hot Wheels Unleashed, Trackmania, Mario Kart 8 anti-gravity (only a Konno summary saying camera placement was hard, ~).
- Riders Republic and SSX landing windows (no numbers found).
- Jonasson and Purho, and Nijman talks (read nothing of the primary talks).
- Rocket League air-control damping formula (read constants only), and the meaning of the auto-flip threshold.
- Rocket League camera values are community guides, not Psyonix defaults.
