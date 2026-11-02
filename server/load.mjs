import worker from './src/index.js';
import { testEnv } from './test/env.js';
import { botRun, padded } from './test/runs.js';

const N = Number(process.argv[2] || 1000);
const env = testEnv();
const runs = [{ venue: 'pad', ...botRun('pad', 'ramp') }, { venue: 'launch', ...botRun('launch', 'trench') }];
const post = (body) => worker.fetch(new Request('https://w.test/runs', { method: 'POST', body: JSON.stringify(body) }), env);
const status = {}, ms = [];
const t0 = performance.now();
for (let k = 0; k < N; k++) {
  const r = runs[k % 2], t = performance.now();
  const forged = k % 10 === 9;
  const res = await post({ venue: r.venue, run: { ...padded(r.run, k), total: r.run.total - (forged ? 60 : 0) }, score: r.score, name: `p${k}` });
  status[res.status] = (status[res.status] || 0) + 1;
  ms.push(performance.now() - t);
}
const wall = (performance.now() - t0) / 1000;
ms.sort((a, b) => a - b);
const board = await (await worker.fetch(new Request('https://w.test/board/pad.ramp/all'), env)).json();
const times = await (await worker.fetch(new Request('https://w.test/board/launch.trench/all'), env)).json();
console.log(JSON.stringify({ submissions: N, status, wall_s: +wall.toFixed(1), p50_ms: +ms[N >> 1].toFixed(1), p99_ms: +ms[Math.floor(N * 0.99)].toFixed(1), max_ms: +ms[N - 1].toFixed(1), rampBoard: board.rows.length, trenchBoard: times.rows.length, top: board.rows[0] }));
