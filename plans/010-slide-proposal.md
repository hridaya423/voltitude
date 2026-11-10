# Proposal 010: a car that can slide

**Shipped** on `advisor/slide-and-bank` with SIM_VERSION 20, on the recommendations below. The owner had not driven the spike.

- `SLIDE.lock = 2.5`. Key F, pad X (button 2). Boost is on pad B (button 1) only. Rivals do not slide.
- Gas source `slide` at 0.08 a second, the wall rate, while slide is held on the ground above 15 degrees of body slip and 20 m/s. Style pays 25 points a second.
- A `slide` hint after the third braking zone, unless the player already slid. The garage legend lists `F slide`.
- No limit on the fan-held walls: in scripted runs a slide on the banks, the walls and into the jumps never spun, launched or gained speed.
- Two new exploit cases, `slide held` and `slide weave`. Both pass on all four venues.

The prototype is on the branch `spike/010-slide` (three commits on top of `fd4ae57`). It is not merged and `SIM_VERSION` stays 18.

## 1. What was built

- `src/sim/drive.js`: a new constant `SLIDE = { lock: 2.5 }`. When the slide input is held, the steering lock becomes `min(0.55, steerLimit(v) * SLIDE.lock)`. The existing counter-steer term is unchanged. Tyre grip, `TUNING` and `steerTo` are unchanged, so rivals do not slide.
- `src/sim/race.js`: `slide` is a new input field. It is packed into the flag byte as bit 16, because plan 002's `flip` already uses bit 8. Old runs have the bit clear and replay unchanged.
- `src/input.js`: a rebindable action "Slide (hold in a corner)" with the default key `F`. On a pad, slide uses button 2 (X on an Xbox pad). Boost now uses only button 1 (B). `src/main.js` `PAD_KEYS` has `slide: 'X'`. The title legend and hints are unchanged.
- `tools/slide-lab.mjs` and `tests/slide.test.js` (4 tests).

Evidence on the spike branch:
- `npm test`: 193 pass, 0 fail. The baseline was 189.
- `tests/handling.test.js` is untouched and passes.
- `node tools/handling-lab.mjs proving` gives the same output as before the change.

## 2. Measurements

### Slide lab

`node tools/slide-lab.mjs [lock]` holds the steering key for 3 s on a flat plane, then catches the slide with counter-steer. Rows 10 to 12 are a left-right flick with slide held (0.6 s in each direction).

**Lock × 2.5**

| v | slide | hold | flick | pathTurnDeg | maxBetaDeg | slipMs | speedKept | spun | recoveredInS |
|---|---|---|---|---|---|---|---|---|---|
| 20 | false | 3 | 0 | 101.6 | 4.6 | 1.6 | 1 | false | 0.37 |
| 20 | true | 3 | 0 | 123.5 | 10.6 | 3.4 | 0.81 | false | 0.5 |
| 30 | false | 3 | 0 | 68.6 | 7 | 3.6 | 1 | false | 0.42 |
| 30 | true | 3 | 0 | 84.7 | 16.5 | 8 | 0.84 | false | 0.48 |
| 45 | false | 3 | 0 | 46 | 8.2 | 6.4 | 1 | false | 0.47 |
| 45 | true | 3 | 0 | 56.4 | 19 | 13.8 | 0.88 | false | 0.54 |
| 60 | false | 3 | 0 | 35.2 | 8.7 | 9 | 1 | false | 0.49 |
| 60 | true | 3 | 0 | 42.8 | 19.4 | 18.9 | 0.9 | false | 0.63 |
| 80 | false | 3 | 0 | 26.8 | 8.6 | 11.8 | 0.99 | false | 0.5 |
| 80 | true | 3 | 0 | 33.3 | 18.8 | 24.6 | 0.9 | false | 1 |
| 30 | true | 1.2 | 0.6 | 12.8 | 31.9 | 7.7 | 0.99 | false | 1.15 |
| 45 | true | 1.2 | 0.6 | 9.1 | 43.6 | 12.5 | 0.99 | false | 2.35 |
| 60 | true | 1.2 | 0.6 | 7.5 | 44.1 | 16.7 | 0.99 | false | 2.49 |

**Lock × 2**

| v | slide | hold | flick | pathTurnDeg | maxBetaDeg | slipMs | speedKept | spun | recoveredInS |
|---|---|---|---|---|---|---|---|---|---|
| 20 | false | 3 | 0 | 101.6 | 4.6 | 1.6 | 1 | false | 0.37 |
| 20 | true | 3 | 0 | 123.5 | 10.9 | 3.6 | 0.86 | false | 0.47 |
| 30 | false | 3 | 0 | 68.6 | 7 | 3.6 | 1 | false | 0.42 |
| 30 | true | 3 | 0 | 82.9 | 15.2 | 7.5 | 0.89 | false | 0.49 |
| 45 | false | 3 | 0 | 46 | 8.2 | 6.4 | 1 | false | 0.47 |
| 45 | true | 3 | 0 | 55.2 | 16.8 | 12.4 | 0.92 | false | 0.52 |
| 60 | false | 3 | 0 | 35.2 | 8.7 | 9 | 1 | false | 0.49 |
| 60 | true | 3 | 0 | 42 | 17 | 16.9 | 0.93 | false | 0.56 |
| 80 | false | 3 | 0 | 26.8 | 8.6 | 11.8 | 0.99 | false | 0.5 |
| 80 | true | 3 | 0 | 32.5 | 16.4 | 21.7 | 0.93 | false | 0.98 |
| 30 | true | 1.2 | 0.6 | 11.4 | 22.8 | 6.9 | 0.99 | false | 1.04 |
| 45 | true | 1.2 | 0.6 | 9 | 22.8 | 10.8 | 1 | false | 1.22 |
| 60 | true | 1.2 | 0.6 | 7.5 | 22 | 14.5 | 0.99 | false | 1.28 |

**Lock × 1.75**

| v | slide | hold | flick | pathTurnDeg | maxBetaDeg | slipMs | speedKept | spun | recoveredInS |
|---|---|---|---|---|---|---|---|---|---|
| 20 | false | 3 | 0 | 101.6 | 4.6 | 1.6 | 1 | false | 0.37 |
| 20 | true | 3 | 0 | 121.4 | 10.5 | 3.5 | 0.91 | false | 0.45 |
| 30 | false | 3 | 0 | 68.6 | 7 | 3.6 | 1 | false | 0.42 |
| 30 | true | 3 | 0 | 81.1 | 14 | 7 | 0.93 | false | 0.5 |
| 45 | false | 3 | 0 | 46 | 8.2 | 6.4 | 1 | false | 0.47 |
| 45 | true | 3 | 0 | 54.3 | 15.3 | 11.5 | 0.95 | false | 0.54 |
| 60 | false | 3 | 0 | 35.2 | 8.7 | 9 | 1 | false | 0.49 |
| 60 | true | 3 | 0 | 41.4 | 15.5 | 15.5 | 0.95 | false | 0.54 |
| 80 | false | 3 | 0 | 26.8 | 8.6 | 11.8 | 0.99 | false | 0.5 |
| 80 | true | 3 | 0 | 32 | 14.9 | 19.9 | 0.94 | false | 0.63 |
| 30 | true | 1.2 | 0.6 | 10.8 | 18.1 | 6.1 | 1 | false | 0.71 |
| 45 | true | 1.2 | 0.6 | 8.8 | 18.3 | 9.7 | 1 | false | 1.14 |
| 60 | true | 1.2 | 0.6 | 7.3 | 18.3 | 13.1 | 0.99 | false | 1.22 |

### Corner probe

The probe turns the path 90 degrees on flat ground, then drives at full throttle to a line 150 m down the exit. It has no braking and no track edges, so use it only as a hint.

| v | lock | slide | turnS | exitSpeed | lineS |
|---|---|---|---|---|---|
| 25 | any | false | 3.3 | 1 | 5.9 |
| 25 | 2.5 | true | 2.71 | 0.84 | 5.83 |
| 25 | 2 | true | 2.75 | 0.89 | 5.78 |
| 25 | 1.75 | true | 2.8 | 0.93 | 5.74 |
| 35 | any | false | 4.55 | 1 | 5.83 |
| 35 | 2.5 | true | 3.65 | 0.84 | 5.76 |
| 35 | 2 | true | 3.74 | 0.9 | 5.68 |
| 35 | 1.75 | true | 3.82 | 0.94 | 5.63 |

At lock × 2.5 the sliding car is 0.07 s ahead at both speeds. At lock × 1.75 it is 0.16 s and 0.20 s ahead.

### In the browser (Proving Ground, Practice)

The test holds `W` for 4 s, then holds `D` for 2 s, with and without `F`. `tools/smoke.mjs` reports the peak sideways speed:

| Slide key | Peak slip | Speed at end | errors |
|---|---|---|---|
| held | 17.2 m/s | 15 m/s | [] |
| not held | 9.9 m/s | 21 m/s | [] |

The ratio is 1.74, which is more than the 1.5 the plan requires. In both runs the car hits the first corner's wall at about 1.5 s. Because of this, the speed at the end does not show the cost of the slide.

A screenshot taken 1 s into the slide at 48 m/s (17.1 m/s slip) shows these results:
- The car body is clearly turned against its path. From the chase camera, the right flank and the right rear wheel are visible.
- Two dark skid marks come out from under the rear wheels and curve back across the lane.
- A control run on the straight with no steering shows no marks.

There is one surprise: the grip-only run at 52 m/s (8.9 m/s slip) also leaves clear rear marks. This is because skid marks reach 84% strength at 9 m/s. A held steering key above about 50 m/s therefore already marks the road. This disagrees with the plan's statement that the marks "almost never fire". On the screenshot, the marks in the slide are not much darker than the grip marks. The difference shows in their spread and in the angle of the car body.

## 3. The owner's answers

Not asked. The owner was not available when the spike ran. Answer these questions when you drive the branch.

**How to try it**

```sh
cd voltitude
git switch spike/010-slide
npm start
```

1. Open `http://localhost:8790/?venue=proving&event=pr&autostart`.
2. To slide, hold `F` while you steer. On a pad, hold X, which is the left face button (button 2).
3. To change the depth without a restart, enter this line in the browser console:

```js
(await import('./src/sim/drive.js')).SLIDE.lock = 1.75
```

You can also use `2` or `2.5`. The default is `2.5`.

4. When you are done, enter `git switch advisor/integration`.

**Questions**

| # | Question | What the numbers say | Recommendation |
|---|---|---|---|
| 1 | Is a slide worth having at all? | It adds a second way through every corner. The body angle goes from 7 to 9 degrees to 16 to 19 degrees, and the sideways speed reaches 8 to 25 m/s between 30 and 80 m/s. From 45 m/s up, this is past the 10 m/s where the skid marks and squeal are at full strength. | Yes, if it feels good when you drive it. |
| 2 | How deep: lock × 1.75, 2 or 2.5? | At × 1.75 the car keeps 93% to 95% of its speed, turns 18% to 19% further, and gains 0.16 to 0.20 s in the probe. Because of this, a player would always hold the key. At × 2.5 the car keeps 84% to 90% of its speed, turns 22% to 24% further, and gains 0.07 s in the probe, so the time cost is almost neutral. The flick at × 2.5 reaches 44 degrees and takes up to 2.5 s to catch. | 2.5. |
| 3 | A dedicated key, or a brake tap while steering? | The key is explicit and is already built. A brake tap needs no new key, but it collides with trail braking, which the handling tests protect. | The key. |
| 4 | Should a slide pay gas and style? | Without a reward, the slide is a slower line and a player has no reason to use it. | Yes. Pay gas at the wall-ride rate for each second above 15 degrees and 20 m/s, and 25 style points a second (plan 009's table). |
| 5 | Should rivals slide? | Rivals steer through `steerTo`, which knows nothing about the slide. | No, not in the first version. |

## 4. Recommendation

Ship, if question 1 gets a yes after you drive it. Use lock × 2.5 and the rewards in question 4. The follow-up plan has these tasks:

1. Increase `SIM_VERSION`.
2. Re-bake the ghosts with `node tools/medals.mjs all`.
3. Add the gas source and the style points.
4. Add the slide key to the title legend and the hints, and add a first-run hint.
5. Redeploy the Worker. The owner does this. Until the redeploy, the deployed Worker rejects runs that use the slide bit.

## 5. What the spike did not test

- Slides on banked road and on the fan-held walls. The fans pull the car onto the surface with up to 14 g, so a slide there can be much smaller or much faster.
- A slide into a jump.
- Touch controls. `src/touch.js` does not set `slide`.
- Whether a human lap is faster with the slide.
- A pad stick at part lock. The opened lock scales with the stick, so on a pad any angle between grip and a full slide is possible. This is likely to feel better than the keys.
