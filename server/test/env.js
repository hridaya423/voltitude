import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';

export function testEnv() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  const ASSETS = {
    fetch: async (req) => {
      const file = new URL(`../../assets/terrain/height/${new URL(req.url).pathname.slice(1)}`, import.meta.url);
      return existsSync(file) ? new Response(readFileSync(file)) : new Response('missing', { status: 404 });
    },
  };
  return { DB: { prepare: (sql) => stmt(sql) }, ASSETS };
}
