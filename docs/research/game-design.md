# Voltitude: game design research

Research brief for a browser flying-racer: Tesla Roadster, SpaceX cold-gas thruster package, desert course, 1 to 5 minute sessions.
Written 2026-10-27. Grounded in `src/sim/*.js` and `index.html` as of this commit, and in sources cited by ID (list at the end).

## How to read the citations

Not every source could be read in full. Each ID carries a mark:

- `✓` I fetched the page this session and read it. Claims attributed to it are checked.
- `~` I only saw a search-result summary. The claim is probably right but I did not read the page.
- `○` The talk or book exists and I verified its title, speaker and venue, but I could not read its contents.
- **Proposal** means the number or rule is mine. It is a tuning starting point, not a sourced fact.

Gaps, stated plainly: I found no Nadeo GDC talk, no Criterion postmortem of Burnout, no Neversoft or EA Canada primary design writing, and Playground's onboarding work is only reported secondhand (S16). Where a point rests on such a source, I say so. Where the claim is "what the talk says" and I could not read the talk, I mark it `○` and treat it as direction only.

---

## 0. What exists today (measured, not assumed)

From the code and from running the bundled autopilot (`src/sim/bot.js`) through the sim in node:

| Fact | Value | Where |
|---|---|---|
| Sim rate, fixed step | 120 Hz, `DT = 1/120`, inputs recorded 6 bytes per tick | `flight.js`, `ghost.js` |
| Course length | 3321 m, 8 sections, 3 laps | `track.js` |
| Gates per lap | 18 checkpoints (r 17 to 22 m), 9 boost rings (r 5 to 5.5 m), 5 slots (14 × 1.7 m, angles 0, 45, 90, 135 deg) | `track.js` |
| Lap time, autopilot | 42.0 s flying lap, 43.6 s first lap, 3 laps = 127.6 s (skill 1); 141.6 s (skill 0.3) | measured |
| Mean lap speed | about 79 m/s (3321 m / 42 s) | measured |
| Top speed | about 85 m/s unboosted, about 128 m/s boosted (autopilot reached 129) | derived from `accel 24`, `boostAccel 30`, `drag 0.0033`; matches measurement |
| Tank ("energy") | starts 0.5, boost burns 0.3 per second (3.3 s per full tank), skim recharges up to 0.22 per second | `TUNING` |
| Gate refills | boost ring +35% and +8 m/s, slot +50% and +10 m/s, clip = 25% speed loss, missed checkpoint = +2 s | `race.js` |
| Camera | FOV 68 + 20·min(1, v/125) + 7 while boosting, shake decays at exp(-4t), reduced-motion option | `camera.js` |
| Persistence | `localStorage` for settings and one best run only | `main.js` |
| Missing | No medals, no hop, no hover, no air-dodge, no gravity term at all in `stepCar`, no event structure, one ghost | code |

Three consequences worth stating up front, because they shape the rest of this report:

1. **The sim has no gravity.** The car holds altitude unless the player pitches (`thrust = throttle·accel − 9.81·fy·0.7` only slows a climb). "Hover" has nothing to hover against. Hop and dodge are cheap to add as decaying velocity impulses. A ballistic hop is not.
2. **The tank is not yet a constraint.** I instrumented the autopilot over three laps. The aggressive bot (skill 1) boosts 37% of the time, averages 40% tank and never drops below 5%. The cautious bot never boosts and sits at 99%. Gates alone hand out about 5.6 tanks per lap (9 × 0.35 + 5 × 0.5), roughly 18 s of boost on a 42 s lap, before any skimming. Skimming is active 55% of the time because the course keeps the car low. A resource that never runs out is not a resource. Section 3.1 fixes this.
3. **The Wall is about 180 m of path.** The sheer climb, the game's signature set piece, lasts 2 to 3 seconds at lap speed. Section lengths in metres (from `sections`): Launch 692, Wall 180, Mesa Skim 494, Cliff Dive 228, Slot Canyon 636, Dry Lake 393, Corkscrew 418, Home Straight 280. At 79 m/s these are 9.2, 2.3, 6.3, 2.9, 8.1, 5.0, 5.3 and 3.5 seconds. Section 6 uses this.

---

## 1. Core loop and why a gamer would play it

### 1.1 The fantasy

**You are the test pilot of the one car that was supposed to be a stunt and turned out to be an aircraft.** The pitch is a single sentence of promise: *the Roadster that left the runway and kept going.*

Why this fantasy works for this audience:

- It sells the Pilotwings/Ace Combat wish (a vehicle you fly) with the Trackmania promise (a stopwatch, a ghost, a retry in under a second). Nobody else has both. Distance fused car and flight with boost, jump, rotate and fly (S23 ✓) but dropped racing against a clock as its identity. Rocket League proved a car plus rocket boost gives a skill ceiling players spend thousands of hours on (S11 ✓: boost and jump "allowed for a scaling of skill", a grappling hook made players "default to the same moves").
- The lore is a gift: a Tesla Roadster really was launched on Falcon Heavy on 2018-02-06 with a mannequin, "Starman", at the wheel. The tasteful move is to treat it as texture, not plot. See section 4.5.
- A recognisable car on a recognisable desert (Mojave, golden hour) means the first screenshot explains the game.

### 1.2 The three loops

**30-second loop: breathe.** One section is a breath. Spend tank pressure to climb or accelerate (exhale), drop low and skim to refill (inhale), thread the next gate, read a split against the ghost. Burnout's lesson is that a boost resource only matters if something dangerous earns it. Criterion's CTO said the first Burnout already had cars driving on the wrong side of the road and missing oncoming traffic, "but hadn't really worked out a reason why until someone came up with the boost" (S14 ✓). Voltitude has the same structure: skim is the dangerous act (low, fast, near rock), pressure is the reason.

**5-minute loop: one more try.** A run is 30 to 60 seconds, a retry costs under 3 seconds, and every run ends with one specific, actionable loss ("you lost 0.31 s in the Slot Canyon"). Trackmania's tracks are reported at roughly thirty seconds to a minute and a half, so a restart "isn't too far away" (S17 ~, Wccftech review). Lonely Mountains copied Super Meat Boy's instant restart so that failure never felt punishing (S22 ~, ✓ for Game Informer's "restarting never felt punishing"). Koster frames this as the engine of fun: we enjoy patterns we are in the middle of learning, and boredom is the signal that we have finished learning (S10 ~). A run that tells you which pattern you have not learned yet is the hook.

**Session-to-session loop: medals, ghosts, today's card.** Three things bring a player back tomorrow: (1) a medal ladder with a visible next rung and a hidden top rung (Author), (2) a personal best ghost that is always one specific beatable thing, (3) a daily card with the same conditions for everyone. Self-determination research (Ryan, Rigby, Przybylski 2006) says the pull of games comes from competence, autonomy and relatedness (S8 ~). Map them: competence is medals and ghost deltas, autonomy is line choice and choosing which ghost to chase, relatedness is a challenge link you can send a friend without a server.

### 1.3 What to borrow, what to refuse

| Game | Take | Refuse |
|---|---|---|
| Trackmania | Medals, author ghost, sub-second retry, short maps, daily track | Complexity of editor/club monetisation (S17 ✓: subscription gating was the controversial part) |
| Burnout | Risk is the thing that pays | Crash spectacle as punishment. A time trial must not stall the clock for a slow-mo wreck |
| Forza Horizon | Strong first ten minutes, rewind-style mercy | Open-world bloat |
| Mario Kart | "Instantly enjoyable, but deep" (S12 ✓), ghosts | Item-based catch-up. There are no AI racers |
| Rocket League | Physics-based skill ceiling, "everyone had fun being terrible together" (S11 ✓) | Online-only |
| SSX / Tony Hawk | Air time converts to resource, bank on clean landing | Score bloat. Keep it a medal axis, not the main axis |
| Distance | Obstacles you outmaneuver with car abilities (S23 ✓) | Survival-only framing |
| Lonely Mountains | Clear, memorable routes; safe line vs shortcut | Slow reset after a crash |
| Hot Wheels Unleashed | Exaggerated track set pieces, puzzle-like "clever airborne" tracks, track sharing (S24 ✓) | Heavy UGC pipeline for v1 |

---

## 2. Game feel

Foundations first, then rules.

- Swink defines game feel as "the tactile sensation of manipulating a digital agent" and splits it into input, response, context, polish, metaphor and rules. He says the first, last and most common thing a player experiences is the feel, and warns that "constraint is the mother of skill and challenge." Spacing that is too tight feels oppressive, too loose trivial (S1 ✓). Liz England's review of the book gives the real-time threshold as a feedback loop under about 100 ms (S2 ~).
- Mick West's *Programming Responsiveness*: in the best case it takes up to three frames from input to visible feedback, about 50 ms at 60 fps, and common ordering mistakes add three more (S6 ✓). Voltitude's fixed 120 Hz sim helps, but the render path still decides what the player feels.
- Nijman's *The art of screenshake* (INDIGO Classes 2013 ✓ title and venue, S5 ○) and Jonasson and Purho's *Juice it or lose it* (S4 ○ title and speakers only; the Game Developer write-up is S4b ~) are the canonical case for stacking cheap feedback. I could not read either talk. What I carry from them is direction (layer many small effects, tune by feel, restraint matters), not numbers.
- Evidence that juice is not folklore: a 2022 study of Steam action games found that hit stop, sound coherence and camera control "may strongly influence impact feel", and that missing any one of the three "may ruin" it (S19 ✓).

Every number below is a **Proposal** unless a source is attached. They are tuned against the real values in `TUNING` and `camera.js`.

### 2.1 Speed

| Rule | Proposal | Basis |
|---|---|---|
| FOV | Keep 68 + 20·min(1, v/125); boost +7 (already in `camera.js`). Ramp boost FOV in about 250 ms (current time constant is 0.25 s), release over 500 ms so the exit feels like a breath. | existing code; Nijman direction ○ |
| Radial blur | Edge-weighted, zero in the central 40% of the frame, strength ∝ max(0, v − 60)/65, capped at 0.35. | Hargreaves: blur tied to camera velocity "one of the main sources of the speed sensation in MotoGP", only appearing at high speed (S21a ✓). Holm et al. found a strong blur setting *lowered* perceived velocity (S21b ~), so cap it. |
| Parallax cues | Skim is also the fastest-feeling place to be. Camera altitude relative to the ground raises perceived speed (S21b ~). Put props, posts and dust ribbons within 15 m of the skim line so the reward is felt as well as filled. | S21b ~ |
| Particle streaks | Dust and spark streak length = v·dt·k so they stretch along velocity. Nothing stretches under 30 m/s. | Proposal |
| Wind audio | Gain from 0 at 30 m/s to 1.0 at 125 m/s, low-pass opening with speed. Music ducks 3 dB under boost. | Proposal |
| Camera distance | Keep `back = 7.2 + 0.018·v`. At boost, push 0.4 m further back in 150 ms, then return. | existing code; Proposal |

### 2.2 Boost and thrusters

- **Latency budget.** Boost press to first visible and audible change within 2 render frames (about 33 ms at 60 fps). Poll input at the top of each sim step, never after render (S6 ✓: rendering before logic and events after physics are exactly the mistakes that add frames).
- **Layering.** On press: FOV punch, plume ignite, a 60 ms low "thump" transient, controller rumble (0.2 weak, 0.6 strong, 180 ms is already in `main.js`). While held: plume noise plus a pitched hiss whose pitch is tied to tank pressure.
- **Pressure audio.** Hiss pitch follows tank percentage (full = bright, 20% = flat and airy). Below 15% play a single soft low-pressure chirp and flash the gauge. Sound should teach the resource without text. This matches Swink's "polish" and "metaphor" elements (S1 ✓): the metaphor is a pressurised tank, so the sound should obey it.
- **Cold-gas fiction gives you a rule for free.** Thrust from a blowdown tank falls as pressure falls. Scale boost accel by `0.6 + 0.4·tank` (so 20% tank gives 68% thrust). The player feels the tank running down in the car itself, and the HUD is confirmation.

### 2.3 Landing and impacts

Current sim: `impact` is the normal velocity; above 7 m/s the car loses 18% speed; above 4 m/s an `impact` event fires and the camera bumps by `min(1, v/15)`.

| Impact (normal speed) | Visual | Audio | Haptic | Camera |
|---|---|---|---|---|
| under 4 m/s | skid dust only | soft scrape | none | none |
| 4 to 7 | dust burst, 2 sparks | thud | 0.2 weak, 100 ms | shake 0.3 |
| over 7 | big dust plume, sparks, brief red tint on speed readout showing "−18%" | low thump plus 200 ms low-pass dip | strong 0.5 to 1.0, 160 ms | shake `min(1, v/15)`, 40 ms camera-follow stall (see below) |

**Hit stop in a racer: do it to the camera, never to the clock.** Sakurai's Smash column describes hitstop as "a crucial effect" with a cap on duration, and says he does not lengthen it in free-for-alls because a frozen pair lets a third player strike (S19b ✓). The racing equivalent is that freezing the sim hands time to nobody but also corrupts the clock and ghost. Instead freeze only the camera follow and particle layer for 33 to 50 ms (4 to 6 sim ticks) while the car keeps moving. Reference ranges for fighting-style hit stop at 60 fps are 2 to 4 frames light and 6 to 10 heavy (S19c ~), which is 33 to 67 ms and 100 to 167 ms. Racing should sit at the low end.

### 2.4 Near misses

- **Why they work, and the one condition.** Clark et al. (Neuron 2009) found near-misses were *less pleasant* than full misses but *increased the desire to play*, and the effect was restricted to trials where the subject had personal control (S9 ~). That is a design rule: reward near-misses that are the player's own doing, not luck.
- **Make the margin visible.** Slot gaps are 1.7 m (or 14 m on the long axis) against a car 0.84 m tall and 1.96 m wide (`CAR_HALF_H`, `CAR_HALF_W`). At angle 0 the margin on each side is about 0.43 m. Compute the minimum clearance of the four corners at the gate plane and:
  - under 0.15 m: "RAZOR" tag, whoosh with Doppler, 1-frame edge flash, rumble blip, +small tank bonus.
  - On the results screen: "Slots 5/5, tightest 9 cm." That is a brag stat and costs one number per slot.
- **Burnout parallel.** Near-miss with oncoming traffic was Burnout's boost earner (S14 ✓ for the boost-gives-purpose-to-risk framing; the GameSpot previews S14b ~ describe risk-filled boost as the series philosophy).
- **Do not reward luck.** The slot "magnet" (`race.js`, pulls within 3 m beyond half-width, strength 0.06) lets weak aims succeed. Keep it for early events. Turn it off for Gold and Author attempts, or the Razor stat means nothing.

### 2.5 Gate passes

- **Checkpoint:** short rising tone. Each *consecutive clean* gate steps the tone up one semitone, cap +7, and a miss resets it. This is a streak with no number on screen. Proposal.
- **Split:** ±delta against the ghost flashes 1.2 s, green or red, large enough to read in peripheral vision. Already present in the HUD (`delta`). Make the colour carry sign and the text carry magnitude.
- **Boost ring:** cyan flash, thruster pop, FOV +3 for 200 ms.
- **Slot clean:** amber flash, +50% toast, and a visible kick (the +10 m/s is real, so show the speed readout jumping).
- **Miss:** red, short low tone, "+2.0" delta. 2 s is about 5% of a 42 s lap: it hurts a medal run but never ends it.

### 2.6 Slow-mo and UI

- **No slow-mo during play.** It breaks the clock and the ghost. Use perceptual substitutes: 200 ms FOV pull-in plus audio low-pass on a Razor slot.
- **Slow-mo is allowed in replays,** on a personal best, with the finish camera.
- **UI during a run:** the speed readout, one tank ring around it, a delta, and a distance marker to the next gate. No paragraphs. Toasts under 1 second. Reduced-motion mode scales shake to 15% (already `opts.reduced`) and should also cut radial blur and boost FOV.

### 2.7 Haptics (gamepad)

- Skim gets its own texture: continuous weak-motor buzz proportional to `1 − clearance/9`, 0.05 to 0.25. The player learns "I am in the zone" by hand.
- Impacts use the strong motor. Boost uses a rising pair.
- Trigger rumble is not broadly available in browsers; do not design around it.

---

## 3. New primitives this car enables

The car is physically a Roadster with cold-gas thrusters. Cold gas is stored high-pressure nitrogen released through nozzles: instant response, small total impulse, thrust that falls with tank pressure. Every primitive below follows from that, and all draw from **one tank** so decisions trade against each other.

### 3.1 Tank pressure as the single resource (rework of `energy`)

**What:** Rename `energy` to pressure. Boost, hop and dodge all draw from it. Skim, boost rings and slots refill it.

**The problem to solve first:** per section 0, the tank never binds. Fix by making gates pay in *position* rather than *amount*, and by cutting gate refills.
- Proposal: boost ring +20% (was 35), slot +30% (was 50), skim rate 0.22 (keep). That halves free refill to about 3.1 tanks per lap.
- Proposal: boost drain 0.3 per second stays. Add hop 8% and dodge 10%.
- Success criterion, measurable with the existing autopilot: skill 1 bot should spend at least 15% of the lap under 15% tank, and a hop/dodge-heavy line should be able to run dry. Re-run `tank.mjs`-style instrumentation after each tuning pass. **Proposal.**

**Risk/reward:** spend now for a faster line, or save for the next climb. Running dry is not a fail state, it is a heavy glider with 0.6× thrust at 20% pressure. That is a lap you can finish but cannot win.

**Skill expression:** routing pressure across a lap, the same decision Rocket League players make with boost pads. Psyonix's own finding was that boost beat the grappling hook because stopping momentum mid-flight "takes finesse" and supports a wider range of maneuvers (S11 ✓).

**Teach without text:** (a) a pressure ring on the speedometer; (b) the hiss-pitch cue (2.2); (c) start Card 0 at 50% with a boost ring 8 seconds ahead (the sim already starts at 0.5) so the first success is a refill, not a lecture.

### 3.2 Skim (exists): make it the signature

**Mechanic today:** under 9 m AGL above 25 m/s, recharge `0.22·(1 − clr/9)` per second. A perfect ground-level skim fills a tank in 4.5 s; at 4.5 m it takes 9 s. Compare boost's 3.3 s per tank: skimming returns 0.74 s of boost for every second skimmed, at best. That ratio is why the autopilot skims 55% of the time.

**Risk/reward:** the cushion pushes the car up from 3 m, and below 0 clearance you hit terrain. The reward is the best-feeling part of the game (low camera altitude, parallax, speed cues, S21b ~). Make perceived reward line up with mechanical reward.

**Skill expression:** hold 1 to 3 m AGL over a changing surface. Hills and mesa edges make the line non-trivial.

**Teach:** dust ribbon behind the car that thickens as clearance shrinks; gauge ring pulses green while charging; the haptic texture (2.7). Place the first skim corridor on the runway-to-ramp transition with a floating ribbon of ground glyphs, not words.

### 3.3 Hop (ventral pulse)

**Mechanic (Proposal):** tap hop adds a vertical velocity impulse of about +9 m/s that decays over 0.45 s, costs 8%, 0.6 s cooldown. Because the sim has no gravity, this is a "lift bump" of about 2 to 3 m, not a jump arc. That keeps it deterministic and cheap, and it cancels a scrape or clears a lip.

**Use cases:** clear a rock spine, pop onto a mesa lip without pitching up (which would bleed speed: a 40 degree climb costs about 9.81·sin(40°)·0.7 = 4.4 m/s²), re-enter a skim after clipping the cushion.

**Risk/reward:** hop is cheap but spent hops are a pressure you did not have for the boost. Misuse launches you above the skim band and costs time. Combined with the Wall, it is the only way to hold speed over a lip.

**Teach:** a low wall of floating hazard chevrons across the runway at 2 m height in Card 0. Nothing stops you; if you hit it the car just scrapes. A hop prompt (single glyph) fades in on the second pass only.

### 3.4 Lateral air-dodge

**Mechanic (Proposal):** double-tap steer or dedicated button: a lateral impulse of about 12 m/s over 0.25 s, costs 10%, 0.5 s cooldown, and *does not rotate the nose*. Why it earns its place: at 85 m/s with `turnHigh = 1.35 rad/s` the tightest steering radius is about 63 m, so a 12 m lateral correction by steering alone takes roughly 39 m of path (`√(2·R·d)`) and 0.5 s plus an equal recovery. A dodge does it in about 0.25 s without bleeding heading. That is the difference between hitting and missing a boost ring placed at `off: [6, 1]`.

**Skill expression:** dodge then re-line, chaining dodges between the 3 rings in the Dry Lake (rings at 2375, 2451 and 2521 m along the track, so 70 to 76 m apart, about 0.9 s at lap speed).

**Teach:** place a boost ring 10 m off the line with a rock in front of the line. Players learn by trying to reach it with steering and failing by a hair. The failure and the invitation are the same object.

**Risk:** input overload. The control scheme already has 11 actions (`ACTIONS` in `input.js`). Use tap = dodge, hold = roll on the existing roll keys, and test misfires on keyboard. Proposal; if misfires exceed a few percent, make dodge its own key.

### 3.5 Roll through knife-edge slots (exists)

**Mechanic today:** a slot is a gate of 14 × 1.7 m at a given angle. All four car corners inside means clean (+50%, +10 m/s), partial overlap is a clip (speed ×0.75), outside the gate rectangle is a pass-through with no reward. The existing course introduces them well: 0 deg, then 90 deg, then a 45/90/135 trio ("Corkscrew") with the slots 58 to 60 m apart, about 0.75 s at lap speed.

**Skill expression:** match roll to angle while managing pitch and yaw for the entry point. Roll rate is 5.5 rad/s, so a 90 degree roll takes about 0.29 s; at 79 m/s that is 23 m of path. You must commit about 25 m before the gate.

**Teach:** draw the slot as a bright bar that you can read at 400 m, and project a thin ghost silhouette of the car on the bar once you are within 80 m (the car's own outline, rolled to fit). Use the personal-best ghost as an instructor: it flies through the first slot 60 m ahead of you on Card 0.

### 3.6 Flight windows

**Definition:** a section where the terrain falls away (clearance over 40 m for at least 3 seconds), so skimming is impossible. The autopilot spends about 20% of the lap above 40 m.

**Design:** these are where pressure is *spent* and where tricks (3.7) can happen. Cliff Dive (228 m) and the Dry Lake approach already qualify. Place a tank top-off at the exit of every window so a player who spent early has a way back, and never place a precision gate immediately at the exit of a window for a player who is empty.

**Risk/reward:** the climb out of a window costs pressure, and arriving empty at the Slot Canyon entrance is the lap-defining mistake. This is the pacing lever that makes the tank matter.

### 3.7 Trick/style system (optional axis)

**Rule (Proposal):** while above 15 m AGL, each full 360 degree roll (`rollOff` accumulates, wraps at `TAU`) or pitch flip arms a style charge. A clean re-entry (clearance under 9 m, pitch within 20 degrees of the slope, no impact above 4 m/s, within 1.2 s of the last trick) banks it as +6% tank per trick, max 3 per window. A botched landing loses the lot.

**Why:** SSX Tricky filled an adrenaline bar with tricks and handed out Uber Tricks, with six Uber Tricks earning unlimited boost (S25 ~), and Tony Hawk's combos made a two-minute run a skill expression (S26 ~). The shared idea is *bank on landing*. Same trade here: risk the trick, bank only if you land it.

**Boundaries:** keep style out of the main medal ladder. A separate **Style** medal per event scores tricks and Razors. Otherwise optimal time trial play becomes rolling at every opportunity and the Trackmania purity is gone. S17 ✓: Castelnérac's stated aim for the newest Trackmania was clarity over accumulated complexity.

### 3.8 What not to build

- **Hover.** There is no gravity to hover against. A hold-in-place has no value in a time trial. Cut it from the plan unless gravity is added, and if it is, hover becomes a slow-speed canyon tool at 25% per second. Low priority.
- **Weapons/combat.** Psyonix tried weapons and grappling hooks and dropped them: they "didn't make the game more fun" (S11 ✓).
- **Wake-draft behind the ghost** is a clever COULD (deterministic, because the ghost is a pure function of its input log), but it ties your run to the ghost state, so do it last.

---

## 4. Structure

### 4.1 Event format: slice the course

A 3 lap, 130 to 140 s run is the *finale*, not the unit. The unit is a **30 to 60 second event**, cut from existing `COURSE`/`GATES` data:

| Type | Rule | Teaches |
|---|---|---|
| Sprint | One section or two, point to point | Line reading |
| Lap | Full flying lap (about 42 s) | Pacing |
| Skim | Charge X% in this section | Skim |
| Needle | All slots clean, ideally with Razors | Roll |
| Low Tank | Start at 20% | Pressure routing |
| Duel | Beat the Author ghost | Mastery |
| Style | Score tricks and Razors | Flight windows |
| Full Circuit | 3 laps | Endurance |

Trackmania's seasonal campaign is 25 tracks plus a permanent 25 track training campaign (S17 ✓). A comparable scale for Voltitude is **5 chapters × 5 events = 25**, cheap because each event is a data row over the same world, not a new build.

### 4.2 Medals

- **Bronze, Silver, Gold, Author** per event. Author is a hidden fourth tier: "the author's best time when they were validating the track" (S17 ~, ggrecon guide).
- **Author time must come from a validation run** by a person (with the bot as a sanity floor: the skill-1 autopilot does 42.0 s per flying lap and is not a human ceiling).
- **Starting thresholds (Proposal):** Gold = Author × 1.05, Silver = Author × 1.15, Bronze = Author × 1.35. Playtest and adjust until about 80% of players earn Bronze in 3 tries and about 10% earn Gold in 10.
- **Ghosts of medals.** On consoles Trackmania exposes ghosts representing the bronze, silver, gold and author times, with names (S17 ~, ggrecon). A Steam thread reports Author ghost racing unlocking after Gold (S17 ~). Adopt both: after any medal the player can choose which ghost to chase. This is Jenova Chen's "active adjustment": the player controls challenge by choice, which preserves flow better than hidden difficulty tuning (S7 ✓).
- **Ship the Author ghost on day 1.** The existing ghost infrastructure stores inputs. At 6 bytes per tick and 120 ticks per second, a 45 s run is about 32 KB raw (about 43 KB base64), so 25 authored ghosts is about 1 MB of static JSON in the repo, not in `localStorage`.

### 4.3 Campaign (the "Flight Test" series)

A small frame, no cutscenes. Five chapters, each is a section the code already names:

1. **Roll-out** (Launch Strip). Throttle, steer, first boost ring, first skim. Card 0 is the tutorial.
2. **The Wall** (climb). Hop, pitch, pressure budgeting.
3. **Mesa** (Mesa Skim). Skim mastery, risk lines.
4. **Needle** (Slot Canyon). Roll, dodge.
5. **Heavy** (Dry Lake, Corkscrew, Home Straight). Full lap, Full Circuit.

Progress gate: **medal points** (Bronze 1, Silver 2, Gold 3, Author 4). Chapter N+1 opens at a threshold of 60% of the max of chapter N. Never gate an event on Gold of the previous one. Mario Kart's design aim was a game anyone can enjoy "instantly" but that stays deep (S12 ✓), and gating on Gold fails the first half.

### 4.4 Daily Test Card

No backend, so no global leaderboard. What a daily can still be:

- **Deterministic from the date.** Seed a PRNG from `YYYYMMDD`. The seed picks a slice, a start-tank value (20 to 60%), a modifier (all slots at 45 degrees; boost rings shifted by `off`; miss penalty ×2), and Author/Gold targets computed offline by bot. Course geometry stays the same, so the sim stays the same.
- **Why shared-seed dailies work:** a shared seed that changes every 24 hours is the core idea, popularised by Spelunky; developers also treat it as a puzzle with a "perfect line", and use it for retention (S18 ✓). Derek Yu's rationale: a high score "can really be attributed to skill and knowledge of the game, rather than the luck of the draw" (S18b ~).
- **One attempt or many?** The 2017 survey found OlliOlli allowed unlimited practice but one committed scored attempt, Caveblazers one run a day, Dead Cells unlimited tries recording the top score (S18 ✓). For a time trial, **unlimited tries, best counts** is right; Trackmania's Track of the Day works that way. Offer an honour-system "committed attempt" badge, nothing enforced.
- **Social without a server:** a **challenge link** carrying a compressed ghost in the URL fragment. Inputs are 6 bytes per tick and highly repetitive; native `CompressionStream('deflate')` should shrink a 45 s run well below the 43 KB base64 size. Measure before promising a size. A friend opens the link, races your ghost, and sees your time. This replaces the leaderboard for the audience that matters (friends) and costs no infrastructure.
- **Do not fake a global leaderboard.** Cheating risk named in S18 ✓ ("easily abusable") plus no backend means do not show ranks.

### 4.5 Narrative frame (small, dry)

The tone is a flight-test card, not a movie.

- **Premise:** you are the pilot of an experimental thruster package on a road car. The program runs "test cards" in the Mojave. Each event is a card. Briefing text is one line: `CARD 3 · THE WALL · START PRESSURE 60% · SKIM THE MESA RAMP`.
- **Starman:** the mannequin rides in the passenger seat in cosmetic builds, and the pause screen carries a small "DON'T PANIC" on the dash. That's the entire reference. No dialogue trees, no named real people, no tweets.
- **Voice:** a telemetry voice, 5 to 8 words, at section starts and after PBs ("Pressure nominal." "Wall clear. Gold pace."). Written as terse radio, never jokes.
- **Chapter 5 is named "Heavy"** as the one Falcon Heavy nod.
- **Rule:** if a line would work as a tweet, cut it.

### 4.6 Progression without a backend

`localStorage` can return empty or throw (private windows, cleared data), so treat it as a convenience and give the player an escape hatch.

```json
{
  "v": 1,
  "events": { "c1e1": { "best": 41230, "medal": 3, "ghost": "<b64 deflate>" } },
  "daily": { "20261027": { "best": 40980, "tries": 7 } },
  "unlocked": { "livery": ["desert", "gulf"], "chapter": 3 },
  "settings": { }
}
```

- Store only the personal-best ghost per event. 25 events × 43 KB is about 1.1 MB, under the 5 MB typical quota. Compress to be safe.
- **Export/Import** as a single copyable string in Settings. This is the "my browser forgot me" insurance.
- **Cosmetic unlocks** from medals: liveries, tank trim, plume colour, mannequin. Cosmetics only, so there is nothing to grind and nothing to gate.
- Keep the `SIM_VERSION` check (`createGhost` already rejects mismatched runs). When tuning changes the sim, bump it, and warn that old ghosts are retired rather than silently desyncing.

---

## 5. Onboarding: the first 60 seconds

**Premise:** the player never read the instructions. Everything is taught by the first minute of play. Direction from the sources:

- Super Mario Bros 1-1 is the canonical text-free tutorial: safe space to try, hazards introduced after their solution (S27b ~, secondary and weak).
- The Witness teaches its rules through puzzles that don't unlock anything and exist only to teach (S27a ~).
- Rocket League's lead said they were "terrified that it was way too hard" and refused to put new players in an easy mode, relying on "everyone had fun being terrible together" (S11 ✓). Lesson: a physics sandbox lets novices enjoy a subset before they master the rest.
- Forza Horizon 3 reportedly spent two years on the first ten minutes (S16 ~, secondhand, Spanish source).
- Crash Bandicoot quietly helped struggling players (extra mask, slower boulder, a crate that becomes a checkpoint) without helping strong ones (S13b ✓).
- Celeste fudges windows in the player's favour so the game "wants you to succeed" (S20 ✓).

### 5.1 The script

| Time | What happens | What teaches |
|---|---|---|
| 0:00 | Any key on the title starts the runway. **No countdown on Card 0.** Existing attract mode already flies the car; hand over control mid-flight. | Immediate action; Trackmania-style no friction |
| 0:00 to 0:08 | Only throttle and steer exist. The HUD shows speed only. Wide ground gates guide the line. | One verb at a time |
| 0:08 | A glowing boost ring 8 s ahead, tank ring at 50% visibly half full. If no boost press in 3 s, the boost glyph fades in beside the ring, in-world. | Resource + reason, no text |
| 0:15 | Runway ends in a ramp. The pitch assist (`assist = true`) keeps the nose on course so the player stays in the air even if they do nothing. | Flying is safe by default |
| 0:22 | A low open corridor over desert floor. A ribbon of light follows the ground. The gauge fills while the player is inside it. | Skim: see it fill |
| 0:35 | First slot, angle 0 (horizontal, no roll needed). The ghost instructor passes through it 60 m ahead. | Slots exist, shape is readable |
| 0:42 | Second slot at 90 degrees. The ghost instructor rolls first, visibly. Roll glyph appears after one miss only. | Roll matches the gap |
| 0:52 | Final gate. Results card with a Bronze, "next: Card 1", and the retry key. | Medal ladder, retry |

### 5.2 Rules

1. **Show each control at the moment it is first useful, and hide it after two correct uses.** Glyphs live in the world next to the object, not on a control diagram. The title screen's `howto` panel stays for people who want it.
2. **Never block on a prompt.** If the player ignores a hint, the run continues.
3. **Forgiveness is invisible.** After two clips in a row on the same gate, widen the slot magnet radius by 25% for the next try. Never announce it. Offer a visible Assist toggle so those who want it off can have a clean medal. This follows the DDA pattern in S13b ✓ and Chen's caution that passive adjustment cannot read the player's flow state (S7 ✓), which is why the visible toggle exists.
4. **Respawn must be kind.** Today `respawn()` places the car 4 steps ahead of the last checkpoint at 45 m/s but leaves the tank untouched. Floor it at 30% on respawn so a respawn never lands an empty car in front of a climb. Proposal.
5. **Default to cruise on first launch.** Eleven bound actions is a lot for a keyboard. Offer an "auto-throttle" assist and a gamepad profile in the first run. Proposal.
6. **Retry teaches.** After Card 0, show where the time went, one sentence ("Slot Canyon: −0.4 s").

---

## 6. Track design principles for a flying racer

### 6.1 Principles (with the existing course as evidence)

1. **Pulse, don't plateau.** Alternate load and release roughly every 8 to 10 seconds. The current course already does it: Launch (release) → Wall (load) → Mesa (sustain) → Cliff Dive (release) → Slot Canyon (load) → Dry Lake (release) → Corkscrew (load) → Home Straight (release). Keep this as the template for new events. Swink: spacing that is too tight is oppressive and too loose trivial (S1 ✓), so the pulse is how you stay between them.
2. **Set pieces need time to register.** The Wall is about 2.3 s at lap speed (section 0). A set piece should last 6 to 8 s to be a memory. Options: lengthen the climb to 450 to 600 m (add a spiral or a double-back along the wall), slow the car with the climb itself (a steeper section costs speed unless the player spends pressure), or add a gated "ledge walk" at the top. Prefer the spiral: it also gives the skim line more length.
3. **Always one gate ahead, always two visible.** Cars cover 79 m/s; a gate must be readable at least 3 s ahead, that is 240 m, and at boosted 128 m/s that is 380 m. Draw a gate beacon (light column) that stays visible past fog to at least 400 m. Keep the next-gate distance marker (already `markerDist`).
4. **One colour per verb, plus shape.** Checkpoint = white/neutral ring, boost = cyan ring, slot = amber bar, miss = red. The toasts already use cyan/amber/red. Make slots a *bar* and rings a *ring* so shape carries meaning for colour-blind players.
5. **Risk lines are optional rings, never required gates.** The existing `off` offsets (e.g. `[6, -2]`) do this: a boost ring 6 m off the line costs a dodge or a bank. A shortcut that skips a required checkpoint just costs the 2 s miss penalty, which is the wrong signal: either make the shortcut legal and gated, or close it.
6. **Terrain is part of the rhythm.** Skimming turns the ground into the instrument. Keep surface variation (rolling, then flat, then drops) so the skim line is a decision and not a straight.
7. **Teach in the safe place, test in the hard place.** Introduce each verb in a section with a forgiving outcome, then test the same verb under pressure later (slot at 0 deg early, trio of 45/90/135 late). The course already does this.
8. **Corridors need sight lines.** Slot Canyon is the one place the player sees only 100 to 200 m. Light the next gate with a ground-reflected glow so turns announce themselves before the wall hides them.

### 6.2 Section-by-section pass on the current course

| Section | Length / time at 79 m/s | Role | Recommendation |
|---|---|---|---|
| Launch Strip | 692 m / 9 s | Release, teach throttle and first boost | Keep. Add the first skim ribbon in the last third. |
| The Wall | 180 m / 2.3 s | Signature load | Lengthen to 450 to 600 m. Add the hop test. |
| Mesa Skim | 494 m / 6 s | Sustain, skim mastery | Add one off-line ring at 1 to 2 m AGL. |
| Cliff Dive | 228 m / 3 s | Release | Perfect flight window. Place the tank top-off at the exit. |
| Slot Canyon | 636 m / 8 s | Load, precision | Only 2 slots (at 1706 and 1852 m, 146 m apart) in 636 m. Add a dodge-gated ring. |
| Dry Lake | 393 m / 5 s | Release | Three boost rings in sequence: use as the dodge tutorial. |
| Corkscrew | 418 m / 5 s | Load, roll | 3 slots 58 to 60 m apart (about 0.75 s each): the right climax. A 45 degree roll takes about 0.14 s at 5.5 rad/s, so the chain is feasible but tight; playtest it. |
| Home Straight | 280 m / 3.5 s | Release | Short and good. Keep. |

How many sections: 8 is right for a 42 s lap (average 5 s each). Do not add sections. Cut by slicing (4.1) and extend only the Wall.

---

## 7. Anti-patterns to avoid

1. **Unreadable gates.** A slot whose angle can't be read until 40 m out is a coin flip at 79 m/s. Draw bars, align them, and show the car's silhouette (3.5).
2. **A tank that never matters** (section 0). If the autopilot never goes below 5%, players learn that nothing they do with the resource matters.
3. **Rubber-banding that feels fake.** There are no AI opponents; do not add them. The rubber-band article describes AI that speeds up when behind and slows when ahead, creating implausible situations that players read as cheating (S13 ✓). If you add rival ghosts later, make them pure replays.
4. **Hidden difficulty adaptation as the only adaptation.** Crash's DDA was invisible and effective (S13b ✓), but Chen warns passive adjustment cannot observe flow (S7 ✓). Pair every hidden assist with a visible toggle.
5. **Punishing resets.** Respawn at 45 m/s with an empty tank is a soft-lock. Floor the tank (5.2). Make restart 1 key and under 1 second; Forza 3's rewind existed to make a hard game "friendlier" and its director said every game would have it within five years (S15 ~). A time-trial game needs rewind-level mercy at the *restart* level, not a rewind button.
6. **A 3-lap default.** 130 to 140 s with no checkpoint save is long for browser sessions and punishes a single mistake with a full restart. Make the default event 40 to 60 s.
7. **Sim hit stop.** Freezing the sim corrupts the ghost and the clock. Camera-only stalls (2.3).
8. **Constant shake.** `camera.js` adds shake 0.12 whenever boosting. Nijman's argument is that feedback must be proportional and event-driven; continuous shake is noise. Use a smooth hum under boost, spikes on events.
9. **Gating on Gold.** Locks out the middle of the audience. Gate on total points (4.3).
10. **Fake global leaderboards** on localStorage (4.4).
11. **Subscription-style gating of content.** Trackmania 2020's subscription tiers drew criticism (S17 ✓). Everything here is free and local.
12. **Overlong tutorial text.** No paragraph appears in a run. The `howto` panel on the title screen is the only text, and it is opt-in.
13. **Control overload.** 11 actions plus hop and dodge is too many for a first run (5.2 rule 5).

---

## 8. Prioritised feature list

Sizing: S = days, M = 1 to 2 weeks, L = 3+ weeks, for one engineer on the existing code base.

### MUST

| # | Feature | Size | Rationale (source) |
|---|---|---|---|
| M1 | Bronze/Silver/Gold/Author medals per event, Author ghost shipped as static JSON | M | Trackmania's whole motivational structure; Author as the hidden top rung (S17) |
| M2 | One-key restart in under 1 s, countdown skipped on retry | S | Lonely Mountains' instant restart "never felt punishing" (S22); Trackmania's short-map loop (S17) |
| M3 | Event slicing (30 to 60 s) from `COURSE`/`GATES`, event data rows, start-tank and rule fields | M | Short sessions; Trackmania 25-map campaign scale (S17) |
| M4 | Tank rework: refill rebalanced so it can run dry, thrust falls with pressure, pressure audio and ring HUD | S to M | A resource must bind to matter; Burnout boost needs risk to earn it (S14); Swink's metaphor and polish (S1). Measured in section 0. |
| M5 | Card 0 onboarding: in-world prompts, ghost instructor, no countdown | M | Text-free teaching (S27), Rocket League's novice-friendly sandbox (S11) |
| M6 | Feel pass: parallax props, stretched streaks, wind audio, impact tiers, gate pitch ladder, Razor margins | M | Hargreaves/Holm speed cues (S21), impact feel study (S19), near-miss research (S9) |
| M7 | Post-run "where you lost it" by section delta | S | Koster's learning-as-fun (S10); the 5-minute loop |
| M8 | Respawn tank floor and hidden slot-magnet widening, with a visible Assist toggle | S | Crash's DDA (S13b), Celeste forgiveness (S20), Chen's active adjustment (S7) |

### SHOULD

| # | Feature | Size | Rationale (source) |
|---|---|---|---|
| S1 | Lateral air-dodge (tap) drawing from the tank | M | Rocket League: physics-based propulsion "allowed a scaling of skill" (S11) |
| S2 | Hop (decaying vy impulse, no gravity model) | M | Gives the Wall a reason to exist and a second tank sink; pairs with flight windows |
| S3 | Daily Test Card (date-seeded modifiers, unlimited tries) | M | Shared seed as retention tool (S18) |
| S4 | Chapter structure with medal-point unlocks, `localStorage` save + Export/Import | M | Competence need (S8); Mario Kart's "instantly enjoyable but deep" (S12) |
| S5 | Chase-any-medal ghost selector | S | Player-controlled challenge (S7); medal ghosts (S17) |
| S6 | Challenge links with deflate-compressed ghost in URL fragment | M | Relatedness without a backend (S8, S18) |
| S7 | Lengthen the Wall to 450 to 600 m | S to M | Set pieces must last long enough to register (section 6) |
| S8 | Gamepad-first control profile and tap/hold input scheme | S | Input is the first element of game feel (S1); control overload |

### COULD

| # | Feature | Size | Rationale (source) |
|---|---|---|---|
| C1 | Style axis: roll/flip flight tricks that bank tank on clean re-entry; separate Style medal | M to L | SSX/Tony Hawk bank-on-landing (S25, S26) |
| C2 | Track editor lite (place gates along a spline, share) | L | Hot Wheels Unleashed reported over half a million tracks created (S24); Distance added an editor on request (S23) |
| C3 | Weekly Shorts-style curated rotating slice pack | S to M | Trackmania Weekly Shorts (S17) |
| C4 | Weather/time-of-day variants (dust storm, blue hour) of the same events | M | Cheap replay value from one course |
| C5 | Ghost-wake draft (tail the ghost for small refill) | M | Novel; ties ghost to run |
| C6 | Photo mode / replay camera on PBs | M | Presentation, shareability |
| C7 | Hover | S to M | Only if gravity is added. Otherwise skip (section 3.8) |

---

## 9. One-page summary

### Design pillars

1. **Breathe.** One tank, spent by thrusters, refilled by skimming low. Every decision is a trade on that gauge. If the tank never runs dry, the game has no spine.
2. **Fly low, go fast.** The most dangerous place (skimming) is the fastest-feeling place and the best resource. Reward and sensation line up.
3. **Read the line.** Gates are readable at 3 seconds' distance, one colour and one shape per verb, no text during a run.
4. **One more try.** Retry in under 3 seconds. Every run ends with one specific loss to fix.
5. **Honest ghosts.** Medals and ghosts are the whole social layer. Author time is a person's real time. No AI, no catch-up, no fake leaderboard.
6. **Feel is the product.** Latency under 2 render frames, layered feedback, and restraint: events spike, the baseline hums.
7. **Mercy is invisible, choice is visible.** Hidden help for strugglers, visible toggles for purists.

### Top 10 features, in build order

1. **Medals plus shipped Author ghost** (M1). The hook that carries sessions.
2. **Event slicing into 30 to 60 s events** (M3). Fits the 1 to 5 minute browser session.
3. **Instant restart** (M2). The retry loop is the game.
4. **Tank rework so it can run dry** (M4). Makes the central resource real. Measured: today it never binds.
5. **Card 0 onboarding with a ghost instructor** (M5). First 60 seconds, no text.
6. **Feel pass** (M6): speed cues, impact tiers, Razor margins, pitch ladder.
7. **Post-run section deltas** (M7). Turns every failure into a plan.
8. **Hidden mercy plus visible Assist toggle** (M8).
9. **Air-dodge and hop** (S1, S2). The new primitives that no other racer has.
10. **Daily Test Card plus challenge links** (S3, S6). Return-tomorrow reasons with no backend.

Biggest single risk: building the primitives (9) before the tank binds (4). Dodge and hop spend a resource that currently has no scarcity.

---

## Sources

IDs referenced above. Mark: ✓ read this session, ~ search summary only, ○ title/existence verified, contents not read.

**Game feel, juice, responsiveness**
- **S1 ✓** Steve Swink, *Game Feel: The Secret Ingredient*, Game Developer. https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient
- **S2 ~** Liz England, review of Swink's *Game Feel* (book, 2008). https://lizengland.com/blog/review-game-feel-by-steve-swink/
- **S3 ~** Wikipedia, "Game feel". https://en.wikipedia.org/wiki/Game_feel
- **S4 ○** Martin Jonasson and Petri Purho, *Juice it or lose it* (2012). https://www.youtube.com/watch?v=Fy0aCDmgnxg
- **S4b ~** Game Developer write-up, *Is your game juicy enough?* https://gamedeveloper.com/design/video-is-your-game-juicy-enough-
- **S5 ○** Jan Willem Nijman (Vlambeer), *The art of screenshake*, INDIGO Classes 2013 (title, speaker and venue read from the page). https://www.youtube.com/watch?v=AJdEqssNZ-U
- **S6 ✓** Mick West, *Programming Responsiveness*, Game Developer. https://www.gamedeveloper.com/programming/programming-responsiveness
- **S19 ✓** Lin, Duan, Wen, Cai, *What Features Influence Impact Feel?*, IEEE CTSoc GEM 2022. https://arxiv.org/abs/2208.06155
- **S19b ✓** Source Gaming, on Sakurai's Famitsu column vol. 490 (hitstop). https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/
- **S19c ~** GamineAI, pixel-art hitstop timing guide (2 to 4 and 6 to 10 frame bands at 60 fps). https://gamineai.com/blog/pixel-art-combat-fx-hitstop-smear-frames-impact-timing-2026
- **S20 ✓** Maddy Thorson, *Celeste & Forgiveness*. https://maddymakesgames.com/articles/celeste_and_forgiveness/
- **S21a ✓** Shawn Hargreaves, *Motion blur* (MotoGP). https://www.shawnhargreaves.com/blog/motion-blur.html
- **S21b ~** Holm, Skovhus, Kraus, perceived camera velocity in 3D racing games (motion blur, altitude). https://eudl.eu/doi/10.1007/978-3-319-55834-9_14 (page returned 403; claim comes from a search summary)

**Flow, motivation, mastery, near-miss**
- **S7 ✓** Jenova Chen, *Flow in Games* design framework page. http://www.jenovachen.com/flowingames/designfig.htm (the PDF at /Flow_in_games_final.pdf could not be text-extracted)
- **S8 ~** Ryan, Rigby, Przybylski, *The motivational pull of video games: a self-determination theory approach*, Motivation and Emotion 30, 2006. https://www.rochester.edu/news/printable.php?id=2719 and https://pure.ewha.ac.kr/en/publications/the-motivational-pull-of-video-games-a-self-determination-theory-/
- **S9 ~** Clark, Lawrence, Astley-Jones, Gray, *Gambling near-misses enhance motivation to gamble and recruit win-related brain circuitry*, Neuron 61(3), 2009. https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737/
- **S10 ✓** Engadget, on Raph Koster's GDC Online 2012 keynote, *Theory of Fun, 10 years later*. https://www.engadget.com/2012-10-10-gdc-online-2012-raph-kosters-keynote-on-a-theory-of-fun-10-ye.html
- **S10b ~** Koster, *A Theory of Fun for Game Design* (book, 2004), summaries. https://gamedev.net/blogs/entry/437313-a-theory-of-fun-by-raph-koster and retrospective https://www.raphkoster.com/wp-content/uploads/2026/07/Theory-of-Fun-10-Years-Later.pdf

**Racing and arcade design**
- **S11 ✓** Dave Hagewood (Psyonix), *Game Design Deep Dive: Rocket jumping in Rocket League*, Game Developer. https://gamedeveloper.com/design/game-design-deep-dive-rocket-jumping-in-i-rocket-league-i-
- **S11b ✓** Corey Davis (Psyonix), interview, The Ringer (2017). https://www.theringer.com/2017/6/30/16039894/rocket-league-corey-davis-interview-podcast-achievement-oriented-e465e3e2a129
- **S11c ○** Jared Cone (Psyonix), *It IS Rocket Science! The Physics of Rocket League Detailed*, GDC 2018. https://www.youtube.com/watch?v=ueEmiDM94IE (Game Developer listing: https://www.gamedeveloper.com/design/video-the-rocket-science-behind-i-rocket-league-s-i-physics). The 120 Hz tick claim is from a third-party summary, https://glasp.co/youtube/ueEmiDM94IE, and is not used as evidence here.
- **S12 ✓** Iwata Asks, *Mario Kart 7*, vol. 2, "Instantly Enjoyable, But Deep". https://nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Mario-Kart-7/Vol-2-In-house-Staff/2-Instantly-Enjoyable-But-Deep/2-Instantly-Enjoyable-But-Deep-231022.html
- **S12b ✓** Iwata Asks, *Mario Kart Wii*, "Mario Kart X" (accessibility for older and new players). https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Mario-Kart-Wii/Bringing-Racers-Together/4-Mario-Kart-X/4-Mario-Kart-X-214639.html
- **S12c ~** Konno on items and balance. https://www.nintendolife.com/news/2011/03/mario_kart_without_items_isnt_mario_kart_that_includes_the_blue_shell
- **S13 ✓** Wikipedia, "Rubber band AI". https://en.wikipedia.org/wiki/Rubber_band_AI
- **S13b ✓** Andy Gavin and Jason Rubin, *Making Crash Bandicoot, part 6* (dynamic difficulty adjustment). https://all-things-andy-gavin.com/2011/02/07/making-crash-bandicoot-part-6/
- **S14 ✓** Jon Jordan, *The Euro Vision: Criterion Goes Back To College*, Gamasutra (Richard Parr on how boost gave Burnout's wrong-side driving a purpose). https://www.gamedeveloper.com/game-platforms/the-euro-vision-criterion-goes-back-to-college
- **S14b ~** GameSpot, *Burnout 3: Takedown* feature preview; *Burnout Revenge* designer diary 2. https://gamespot.com/articles/burnout-3-takedown-feature-preview/1100-6104473/ and https://www.gamespot.com/articles/burnout-revenge-designer-diary-2/1100-6132331/
- **S15 ~** Greenawalt on Forza 3's rewind: Engadget interview https://www.engadget.com/2009-09-02-interview-forza-3-game-director-dan-greenawalt.html ; The Sixth Axis https://www.thesixthaxis.com/2009/10/06/why-rewind-is-the-best-thing-to-happen-to-racers/ ; Wikipedia https://en.wikipedia.org/wiki/Forza_Motorsport_3
- **S16 ~** LevelUp (Spanish), Playground spent two years on Forza Horizon 3's first ten minutes (secondhand from a Nordic Game talk). https://www.levelup.com/noticias/playground-trabajo-2-anos-en-los-primeros-10-minutos-de-forza-horizon-3/
- **S17 ✓** Wikipedia, "Trackmania (2020 video game)" (campaign size, Track of the Day, Cup of the Day, Weekly Shorts, subscription model). https://en.wikipedia.org/wiki/Trackmania_(2020_video_game)
- **S17b ✓** Florent Castelnérac (Nadeo), Gamereactor interview. https://www.gamereactor.eu/trackmania-it-was-the-right-time-to-press-the-restart-button/
- **S17c ~** Wccftech, *Trackmania review* (30 s to 1.5 min tracks). https://wccftech.com/review/trackmania-review/ ; ggrecon author medal guide https://ggrecon.com/guides/trackmania-author-medals ; Steam thread on Author ghost unlock https://steamcommunity.com/app/232910/discussions/0/1291817208485885935
- **S18 ✓** *The 24-hour ticket: examining daily runs*, Game Developer (2017). https://www.gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-
- **S18b ~** Derek Yu on Spelunky's Daily Challenge. https://cinemablend.com/games/Spelunky-Gets-Daily-Challenges-PS3-PS-Vita-60666.html
- **S22 ✓/~** Game Informer preview of *Lonely Mountains: Downhill* (checkpoints, restarts, shortcuts) ✓ https://gameinformer.com/preview/2019/02/28/a-mountain-biking-game-designed-for-speedrunners ; Wikipedia (Super Meat Boy influence) ~ https://en.wikipedia.org/wiki/Lonely_Mountains:_Downhill ; Gamereactor ✓ https://www.gamereactor.eu/crashing-is-part-of-the-game-in-lonely-mountains-downhill
- **S23 ✓** Jordan Hemenway (Refract), GamesBeat interview on *Distance*. https://gamesbeat.com/refract-studios-distance-interview/
- **S24 ✓** Michele Caletti (Milestone), Kotaku interview on *Hot Wheels Unleashed*. https://kotaku.com/hot-wheels-unleashed-devs-on-making-2021s-most-surprisi-1847946535 ; Andrea Basilio, GamingBolt ~ https://gamingbolt.com/hot-wheels-unleashed-2-turbocharged-interview-multiplayer-campaign-new-vehicles-and-more
- **S25 ~** Wikipedia, "SSX Tricky" (Uber Tricks, adrenaline bar). https://en.wikipedia.org/wiki/SSX_Tricky
- **S26 ~** GameSpot, *Tony Hawk's Pro Skater 3* review (two-minute runs, combos); Giant Bomb *THPS HD* review. https://gamespot.com/reviews/tony-hawks-pro-skater-3-review/1900-2820972/ and https://giantbomb.com/reviews/tony-hawks-pro-skater-hd-review
- **S27 ~** Teaching without text: The Witness (Engadget, 2014) https://www.engadget.com/2014-06-12-the-witness-and-the-joy-of-intuition.html ; Super Mario Bros 1-1 (secondary commentary) https://blakecrosley.com/blog/design-philosophy-shigeru-miyamoto
- **S28 ~** Red Bull, *F-Zero 10 years on* (Wipeout's creator on F-Zero speed and Mario Kart structure). https://www.redbull.com/eu-en/f-zero-10-years-on-retrospective ; Siliconera on FAST Racing League's readable tracks https://www.siliconera.com/2010/10/08/behind-the-dashboard-of-fast-racing-league/

**Recommended next reads** (not read this session, worth the time): the Nijman and Jonasson/Purho talks above, the Cone GDC talk for the physics determinism angle, and Swink's book for its chapters on response curves and sensitivity.
