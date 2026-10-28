# Voltitude: game design

Sources: `docs/research/roadster.md` (what the car does), `docs/research/game-design.md` (why people keep playing).

## Pitch

The car that sticks to anything and jumps over everything. A time-trial stunt racer on a desert proving ground, built on what the 2026 Roadster actually showed: fans that hold it to walls and ceilings, and cold-gas thrusters that buy about five seconds of flight per tank.

## Verbs

| Verb | Real basis | Rule |
|---|---|---|
| Drive | 1 MW drive, 0.81 s 0-60 | Power-limited acceleration, drag-limited top speed around 185 mph without gas |
| Stick | 4 fans, 2 G suction at standstill | On track surfaces the car stays attached at any angle: walls, loops, ceilings |
| Boost | 4 rear nozzles, 80 kN, thrust falls with pressure | Hold. Thrust scales `0.6 + 0.4 * tank` |
| Hop | Down nozzles at each wheel, kickflip demo | Tap on a surface. Fixed tank cost, impulse along the surface normal |
| Hover | Brief hover in the demo | Hold in the air. Expensive. Seconds, not minutes |
| Rotate | Nose yaw nozzles, "spare air to flip" | Air pitch, yaw and roll. Free |
| Land | Down nozzles for soft landing | Land wheels-down to keep speed. Land badly and you wreck |

## The tank binds

One tank. Boost, hop and hover drain it. Nothing refills it passively. It refills from risk:

- Clean landings refill in proportion to airtime.
- Each landed flip or roll refills a fixed chunk.
- Gas pads sit before set pieces that need gas.
- Respawning floors the tank at 30%.

Every required gap clears at full speed with an empty tank. Gas buys a faster line, a recovery, or a shortcut.

## Structure

- One course, the Proving Ground Run, split into five sectors. Each sector is an event of 15 to 30 s. The full run is the finale.
- Medals: Bronze, Silver, Gold and Author per event. Author comes from a recorded validation run. Gold is 1.05x Author, Silver 1.15x, Bronze 1.35x.
- Unlocks: the next event opens when the previous one is finished. The full run opens when all five sectors are finished. Finishing is enough, so medals stay a choice, not a gate.
- Restart takes one key and under a second, with a 1 s countdown. Respawn returns you to the last checkpoint at the speed you crossed it.
- Results show where the time went: per-checkpoint deltas against your best, with the worst one named.
- Ghosts: your personal best, plus any medal ghost you have earned.

## Sectors

1. **Ignition**: runway, throttle, boost pad, first kicker jump. Teaches drive, boost and landing.
2. **Wall of Death**: banked turns that rise to a full wall ride, then a loop. Teaches stick.
3. **Leap**: a climb, then a canyon gap that clears at speed. Hover makes the landing clean. Teaches hop, hover and the tank.
4. **Underside**: the track twists through 180 degrees. You drive inverted under a rock arch, then twist back. Teaches trust in the fans.
5. **Heavy**: a mesa run with kickers that reward flips, ending in the long jump home. Teaches flips and refill.

## Frame

A flight-test card, not a story. Each event has one line, for example `CARD 02 · WALL OF DEATH · TANK 40%`. Starman rides as a passenger cosmetic, unlocked with Author medals. Telemetry calls are terse: "Tank low." "Clean." "Gold pace."

## Feel rules

- Events spike, the baseline hums. No constant shake.
- Hit stop goes to the camera, never the clock.
- No slow motion during play.
- Each landing quality has a distinct sound, flash and rumble: perfect, clean, hard, wreck.
- Speed cues: FOV, edge blur above 60 m/s, road-edge light strips for parallax, and wind.
