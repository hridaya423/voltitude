import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const crowdDir = new URL('../assets/crowd/', import.meta.url);
const audioDir = new URL('../assets/audio/', import.meta.url);

test('crowd bake is internally consistent', () => {
  const meta = JSON.parse(readFileSync(new URL('crowd.json', crowdDir)));
  const bin = readFileSync(new URL('crowd.bin', crowdDir));
  const { width, height } = meta.vat;
  assert.equal(readFileSync(new URL('vat_pos.bin', crowdDir)).length, width * height * 8);
  assert.equal(readFileSync(new URL('vat_nrm.bin', crowdDir)).length, width * height * 4);
  assert.equal(height, meta.chars.length * meta.anims.length * meta.frames);
  for (const c of meta.chars) {
    assert.ok(c.verts <= width);
    const index = new Uint16Array(bin.buffer.slice(bin.byteOffset + c.index, bin.byteOffset + c.index + c.tris * 6));
    assert.ok(index.every((i) => i < c.verts));
    assert.ok(c.tris < 2000);
  }
  assert.deepEqual(meta.anims.map((a) => a.name), ['idle', 'fold', 'cheer', 'clap', 'phone', 'flag', 'gasp']);
});

test('audio manifest points at real files with sane loop windows and cues', () => {
  const man = JSON.parse(readFileSync(new URL('manifest.json', audioDir)));
  for (const [name, l] of Object.entries(man.loops)) {
    assert.ok(existsSync(new URL(l.file, audioDir)), name);
    assert.ok(l.loop[1] > l.loop[0], name);
  }
  for (const key of ['sprite', 'real', 'broadcast', 'radio', 'commentary']) {
    assert.ok(existsSync(new URL(man[key].file, audioDir)), key);
    for (const [cue, q] of Object.entries(man[key].cues)) assert.ok(q[1] > 0.05, `${key}.${cue}`);
  }
  for (const [id, names] of Object.entries(man.commentary.lines)) for (const n of names) assert.ok(man.commentary.cues[n], `${id}:${n}`);
  for (const n of ['kerb', 'scrub', 'scrub_burn', 'crowd_bed2', 'motor_z1']) assert.ok(man.loops[n], n);
  for (const n of ['burst_a', 'ignite_gas', 'vent', 'kerb_a', 'contact_a']) assert.ok(man.real.cues[n], n);
});

test('the gzipped crowd buffers the client downloads match the raw ones', async () => {
  const { readFileSync } = await import('node:fs');
  const { gunzipSync } = await import('node:zlib');
  for (const f of ['vat_pos.bin', 'vat_nrm.bin', 'crowd.bin']) {
    const raw = readFileSync(new URL(`../assets/crowd/${f}`, import.meta.url));
    assert.ok(gunzipSync(readFileSync(new URL(`../assets/crowd/${f}.gz`, import.meta.url))).equals(raw), `${f}.gz is stale: regzip it`);
  }
});
