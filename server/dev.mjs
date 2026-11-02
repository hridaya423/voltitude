import { createServer } from 'node:http';
import worker from './src/index.js';
import { testEnv } from './test/env.js';

const port = Number(process.argv[2] || 8791);
const env = testEnv();
createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks);
  const out = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body }), env);
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
}).listen(port, () => console.log(`worker on http://localhost:${port} (in-memory D1)`));
