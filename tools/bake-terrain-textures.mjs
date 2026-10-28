import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const [name, albedo, normal, height = ''] = process.argv.slice(2);
const dir = new URL(`../assets/terrain/${name}/`, import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const SIZE = 2048;
const raw = async (file, channels) => {
  const { data } = await sharp(file).resize(SIZE, SIZE, { fit: 'fill' }).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
};
const a = await raw(albedo, 3), n = await raw(normal, 3);
let h;
if (height) {
  const { data } = await sharp(height).resize(SIZE, SIZE, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  h = data;
} else {
  h = Buffer.alloc(SIZE * SIZE);
  for (let i = 0; i < h.length; i++) h[i] = Math.round(0.2126 * a[i * 3] + 0.7152 * a[i * 3 + 1] + 0.0722 * a[i * 3 + 2]);
}
const gn = Buffer.alloc(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; i++) { gn[i * 3] = n[i * 3]; gn[i * 3 + 1] = n[i * 3 + 1]; gn[i * 3 + 2] = h[i]; }
await sharp(a, { raw: { width: SIZE, height: SIZE, channels: 3 } }).webp({ quality: 86, effort: 5 }).toFile(`${dir}ground_albedo_2k.webp`);
await sharp(gn, { raw: { width: SIZE, height: SIZE, channels: 3 } }).webp({ quality: 92, effort: 5 }).toFile(`${dir}ground_nrm_2k.webp`);
console.log(name, 'ok');
