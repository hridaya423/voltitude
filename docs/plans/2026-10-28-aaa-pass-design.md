# AAA pass: design

Date: 2026-10-28. Agreed with the user in a brainstorm.

## Goal

Every second of play should feel crafted. The bar is a player who finishes a run and says "wow". The mood is a live launch event with an F1 broadcast feel, full of whimsy and joy.

## Decisions

| Area | Decision |
|---|---|
| Unlocks | Nothing is locked. The full run is the headline. Sectors are practice for one skill each. |
| Tracks | Three venues, each with a full run and 4 to 6 practice sectors: Proving Ground (desert, existing), Airfield (night runway, top speed), Launch Complex (coastal pad, tower wall ride, flame trench). |
| Gas | Real 5 s tank, with an always-on compressor. Details below. |
| Car | Rebuilt in Blender from the Oct 2026 event photos. 10 nozzles that fire individually, a lit fan diffuser, LODs. |
| Mood | Launch-event spectacle in the F1 broadcast style. |

## Gas

Moravy: the 200 L Thrust tank gives about 5 s of boost. A station refill takes 2 to 6 hours today, and Tesla targets under 30 minutes. Tesla says the car refills itself from ambient air, but the rate is undisclosed. The game keeps the real tank and compresses time at the compressor, the one part Tesla claims.

- Full tank: 5 s of boost. Thrust falls with pressure.
- Compressor: always on when gas is not being spent. Empty to full in about 8 s. Twice as fast while braking or coasting (regen drives the pump).
- Reserve: boost cannot drain the last 15%. Hop and hover can. The player is never stranded.
- Clean landings and flips give a small instant top-up. Pads become quick-connect fill gates.
- A whine and a moving fill line show the compressor working.

## Realism fixes

- Top speed on the ground rises from about 185 mph to about 230 mph.
- Nozzles fire where they sit: 4 rear for boost, 4 behind the wheels pointing down for hop and hover, 2 at the nose for yaw.

## F1 layer

- Five red lights, then lights out. The camera sits on the car through the countdown.
- A timing tower against ghosts. Sectors are purple, green or yellow.
- Team radio with short engineer calls.
- Grandstands that react to stunts.
- Broadcast and drone cameras for a highlight replay after each run.
- A podium results screen.

## Whimsy and joy

Small surprises, rewarded at once:
- The crowd and PA react to near misses, big air and clean saves.
- Starman waves from the passenger seat.
- Drones follow you through set pieces.
- Confetti and fireworks for a PB.
- Playful lines on the radio.

None of it slows a restart.

## Method

1. Each venue gets a second-by-second beat sheet: feel, input, camera and sound at each moment.
2. Greybox it. It must be fun in grey before any art.
3. Then art, then a polish pass.

## Evidence

- Input-to-screen latency, measured.
- A reset heatmap from bot runs and player runs.
- Side-by-side frames against F1 TV and Forza Horizon at matching moments.
- `npm test` green, and the 60 fps perf gate with no frame over 20 ms.

## Order

1. Systems: unlock, gas, top speed, nozzles, countdown camera.
2. F1 layer on the Proving Ground.
3. Car rebuild, run in parallel.
4. Airfield, then Launch Complex.
