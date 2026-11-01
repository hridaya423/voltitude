import { mkdirSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, textureCompress, prune, join, flatten } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [src, name, ...ratios] = process.argv.slice(2);
const dir = new URL('../assets/models/flora/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const tris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ?? p.getAttribute('POSITION')).getCount() / 3, 0), 0);
for (const [lod, ratio] of ratios.map(Number).entries()) {
  const doc = await io.read(src);
  const before = tris(doc);
  await doc.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: lod ? 0.1 : 0.02, lockBorder: false }), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: lod ? [256, 256] : [512, 512] }));
  const out = `${dir}${name}${lod ? `_lod${lod}` : ''}.glb`;
  await io.write(out, doc);
  console.log(out, before, '->', tris(doc));
}
