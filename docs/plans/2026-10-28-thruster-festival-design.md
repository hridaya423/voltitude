# Thruster festival: design (2026-10-28)

VOLTITUDE is a thruster stunt racer set at a festival on a private rocket test range. The Roadster's boost and flight are the core action. Proving Ground is the vertical slice. The slice must reach ship quality before other content gets work.

This design replaces the "normal racing game" direction from `2026-10-28-aaa-pass-design.md`. The user played the build and gave this verdict: "playable, but unpolished". The quality bar is Forza Horizon 6. A viewer who does not know the source should rate a 30-second clip of our game near a clip of Forza Horizon 6.

## Decisions

| Question | Decision |
|---|---|
| Core identity | Thruster stunt racer. Boost and flight are the core action. |
| World fiction | A flight-racing festival at a private rocket test range. |
| Vertical slice | Proving Ground. Airfield and Launch Complex stay playable and frozen. |
| Gas economy | The player earns gas by skill. Gas pads and regen refill are removed. |
| Realism | The car look, sound, mass, power and top speed follow Tesla's published figures. The thruster economy does not. |
| Run-off | F1-style run-off areas (paved strip, then grass or gravel) on corner outsides. A mistake costs time, not a wreck. Added 2026-10-29. |
| Flight control | The four down thrusters give a hop on the ground and hover in the air. The two front lateral thrusters give yaw and strafe in the air. Added 2026-10-29. |

## Pillars

Each feature must serve one or more pillars. If a feature serves no pillar, remove it.

1. **Air is the point.** Each lap has a section where the fastest line goes through the air.
2. **Earned, not rationed.** Near misses, air time, clean landings, wall-rides, drafts and flight gates give gas.
3. **A festival, not a facility.** Each frame of the chase camera shows people, light and motion.
4. **Clear at 300 mph.** The camera view alone shows the line, the danger and the reward.

Playground Games uses pillars in the same way (fun, freedom, beauty). Burnout earns boost from risk. Trackmania puts clarity before complexity and treats the track as the content.

## Core loop

The loop takes about 30 seconds: launch, select a ground line or an air line, fly, land clean, earn gas, boost to the next air line.

## Bugs the gas change removes

- **Infinite thrust.** Hold Shift without W and the thrusters stay at full force with an empty tank. Reproduced in the sim: the car reaches 307 mph after 18 s; Shift + W reaches 243 mph. The cause is `src/sim/drive.js:481-482`. The regen pump adds gas each step when the throttle is off. Thus `c.gas > 0` stays true, and the valve stays open. The fix: thrust needs gas in the tank, and regen refill is removed.
- **Gas starvation on keyboard.** This is finding #3 in `review/ranked.md`. A keyboard GP spends 200 of 263 s under 15% gas.

## Slice gameplay: Proving Ground

**Layout.** Keep the loop, the jump and the two flat-out corners. Add these parts:

- **Hairpin shortcut.** A ramp before the hairpin. A boosted car flies over the infield and cuts the corner.
- **Basin high line.** A crest on the back straight that leads to a high line over the basin.
- **Wall-ride.** A banked wall where the fans hold the car. It earns gas.
- **Flight gates.** Rings in the air that give gas. They teach the air lines without text.
- **Readability.** Each air line has a lip marking, a gate that is visible from 300 m, and an audio cue.

An air line is faster only after a clean landing. A bad landing costs more time than the ground line.

**AI.** Each of the seven drivers has a profile:

- **Pace.** The distance from the ideal line.
- **Nerve.** How often the driver takes air lines and how often the driver misses a landing.
- **Racecraft.** Passes under braking, defence of the inside line, room when side by side, and drafting.
- **Character.** An example is AAL as the clean champion and FER as the chaotic flier.

Drivers make visible mistakes: missed landings, lock-ups and wide exits. Difficulty has three tiers. There is no rubber-banding.

**AI benchmark.** Run it on every AI change:

- Each tier laps inside its pace band.
- Each race has four or more passes held for 5 s.
- Each race has three or fewer player-contact episodes.
- No car gets stuck.
- Each driver uses one or more air lines per race.

**Failure handling:**

- If a car is stuck or off course for more than 2 s, it respawns at the last safe point. This applies to the player too (finding #2).
- One crash gives one wreck event and one WRECKED toast (finding #16).
- After a crash, the camera moves out of terrain (finding #11).

## Slice look

**Car rear.**

- Rebuild the tail in Blender against Tesla's 2026 reveal photos. It gets the full-width light bar, a floating tail blade, diffuser strakes and real nozzles. Remove the brass rings and the box-grid diffuser.
- Rivals use the hero model with festival liveries. They use a lower-detail model only at a distance.
- Check: compare a turntable against the reveal photos from eight angles.

**Festival world.** Place the festival props for the chase camera, not in an even spread:

- packed grandstands
- a paddock with team trucks, tents and camper vans
- flags and banners
- a helicopter and drones
- spectators on the air lines
- a stage with screens near the start
- fireworks and a drone show at the finish

Crowds animate at low cost: waves, flags and phone lights at night.

**Light.**

- Day uses a physically based sky and sun in real units (Hillaire, EGSR 2020).
- Night uses real floodlight fixtures, light shafts in the haze, and road brightness from real fixture values.
- The glare halos from the look pass are a placeholder. Remove them.
- Find and fix the terrain that shows through at Airfield and Launch. Extend the terrain test from the drivable surface to all visible track geometry.

**Garage.**

- The garage becomes a festival team hangar.
- The car stands on a turntable under studio lights.
- Engineers, telemetry walls and an open door to the track at golden hour fill the scene.
- The camera moves between menu pages.

**UI and feel.**

- No HUD text smaller than 14 px. Measure the contrast.
- Use one style for all event toasts. Show a clear "CLOSE" for near misses, and show each gas gain when it occurs.
- The time from boot to driving is less than 10 s.
- Audit steer, boost, fly and land with the six parts from Swink's *Game Feel*. For each action, check the camera, shake, sound, rumble and time scale.

## Gates

The slice is done when all of these pass:

1. **Blind clip test.** Five or more people see 30-second clips of our game, Forza Horizon 6 and a mid-tier racer. They do not know which clip is which. They rate "looks AAA" and "want to play" from 1 to 10. Pass: our "want to play" score is within 2 points of Forza Horizon 6, and both our scores are clearly above the mid-tier racer.
2. **Cold playtest.** Three to five strangers play for 15 minutes with no instructions. Pass:
   - Each player uses flight without a prompt within 2 minutes.
   - Three or more players name flight as the best part.
   - Nobody finds an exploit or a soft-lock.
   - Most players rate the AI as fair.
3. **Hard gates.**
   - The AI benchmark passes.
   - The perf gate passes: no frame over 20 ms and no long task over 50 ms on a quiet machine.
   - `npm test` passes.
   - No known exploits remain.

Report each gate result, including the gates that fail.

## Out of scope until the slice passes

- New venues or new events.
- Work on Airfield and Launch Complex, except bug fixes.
- An open world.

## Sources

- Forza Horizon pillars and the festival framing:
  - https://traxion.gg/playground-games-on-the-secret-to-forza-horizons-enduring-success/
  - https://gameinformer.com/b/features/archive/2014/10/31/afterwords-forza-horizon-2.aspx
  - https://gamespot.com/articles/forza-horizon-forza-goes-open-world/1100-6380081/
- Burnout risk and reward:
  - https://www.gamepeople.co.uk/family_psp_burnoutdominator.htm
  - https://games.slashdot.org/story/05/01/18/1626202/review-burnout-3---takedown
- Trackmania clarity over complexity:
  - https://www.pcgamesn.com/trackmania-nations-forever/remake
  - https://wccftech.com/trackmania-preview/amp/
- To read during the plan:
  - Swink, *Game Feel* (2008)
  - Jonasson and Purho, "Juice it or lose it" (GDC Europe 2012)
  - Nijman, "The art of screenshake" (2013)
  - Griesemer, "30 seconds of fun" (Halo)
  - Wurman et al., GT Sophy (*Nature*, 2022)
  - Playground Games GDC talks (look them up, not named from memory)
