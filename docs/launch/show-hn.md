# Show HN draft (not posted)

**Title:** Show HN: Voltitude – a browser stunt racer where the server replays every run

**URL:** https://voltitude.vercel.app/

**Text:**

Voltitude is a stunt racer that runs in the browser. The car has thrusters, so it can hover, jump a row of parked cars, drive up a curl and hold onto a ceiling. Each day has one card, and everyone races the same event.

The part I want feedback on is the leaderboard. The physics is a fixed 120 Hz simulation in plain JavaScript, with no randomness that the inputs do not control. A run is only its inputs: 6 bytes per tick, delta-coded and deflated. A 22-second run of The Trench is a 1.6 KB link.

When you submit a run, a Cloudflare Worker loads the same simulation code and replays your inputs. It accepts the run only if its replay reproduces your time within one tick and your score exactly. It rejects an edited input byte, a faster claimed time, or a higher claimed score. A SHA-256 hash of the run catches duplicate submissions. So a fake time means a set of inputs that the physics accepts. In my local load test, 1,000 submissions with 100 forgeries took 8.9 s, at a p99 of 10.7 ms per request. I have not yet measured the deployed Worker.

Because a run is only inputs, the same bytes also give you:

- Ghosts: the daily board loads the top twenty runs as ghosts.
- Clips: the game replays your last ten seconds offscreen, encodes them to H.264 with WebCodecs, mixes the sound offline and gives you an MP4.
- The share image: the Worker stores a frame from your run's highest airborne moment as its Open Graph image.

Stack: three.js, no build step, ES modules served as files. There is a phone tier with touch controls, but I have only tested it in emulation.

It is a fan project. Tesla does not endorse or support it.

Things I know are weak: a cold load on a 50 Mbps connection takes about 6 s to reach the first frame, and the phone tier has not run on a real iPhone or Pixel yet.
