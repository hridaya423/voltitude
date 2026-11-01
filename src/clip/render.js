import { createClipEncoder } from './encode.js';

const BURN_S = 1.2;

function burnIn(g, w, h, card, k) {
  const u = w / 1080, pad = 64 * u, plate = 330 * u, y = h - plate - 120 * u;
  g.save();
  g.globalAlpha = Math.min(1, k * 3);
  g.fillStyle = 'rgba(8, 9, 13, 0.82)';
  g.beginPath(); g.roundRect(pad, y, w - pad * 2, plate, 28 * u); g.fill();
  g.fillStyle = '#ff2a3a'; g.fillRect(pad + 48 * u, y + 58 * u, 44 * u, 5 * u);
  g.fillStyle = 'rgba(255, 255, 255, 0.72)';
  g.font = `600 ${30 * u}px Saira, sans-serif`;
  g.fillText(card.title.toUpperCase().split('').join(String.fromCharCode(8202)), pad + 110 * u, y + 70 * u);
  g.fillStyle = '#fff';
  g.font = `400 ${120 * u}px Michroma, sans-serif`;
  g.fillText(card.value, pad + 48 * u, y + 210 * u);
  g.fillStyle = 'rgba(255, 255, 255, 0.72)';
  g.font = `500 ${34 * u}px Saira, sans-serif`;
  g.fillText(card.sub, pad + 48 * u, y + 280 * u);
  g.font = `400 ${30 * u}px Michroma, sans-serif`;
  g.textAlign = 'right';
  g.fillStyle = '#fff';
  g.fillText('VOLTITUDE', w - pad - 48 * u, y + 70 * u);
  if (card.link) { g.font = `500 ${28 * u}px Saira, sans-serif`; g.fillStyle = 'rgba(255, 255, 255, 0.72)'; g.fillText(card.link, w - pad - 48 * u, y + 280 * u); }
  g.restore();
}

export async function renderClip({ source, width, height, fps = 60, frames, step, card, onProgress }) {
  const enc = await createClipEncoder({ width, height, fps });
  const flat = document.createElement('canvas');
  flat.width = width; flat.height = height;
  const g = flat.getContext('2d');
  await document.fonts.load(`400 40px Michroma`).catch(() => {});
  const burnFrames = Math.round(BURN_S * fps);
  let renderMs = 0, encodeMs = 0;
  for (let i = 0; i < frames; i++) {
    const t0 = performance.now();
    step(i);
    g.drawImage(source, 0, 0, width, height);
    const into = i - (frames - burnFrames);
    if (into >= 0) burnIn(g, width, height, card, into / burnFrames);
    const t1 = performance.now();
    await enc.addFrame(flat, Math.round(i * 1e6 / fps));
    renderMs += t1 - t0; encodeMs += performance.now() - t1;
    onProgress?.((i + 1) / frames);
  }
  const t2 = performance.now(), blob = await enc.finish();
  return { blob, codec: enc.codec, renderMs: Math.round(renderMs), encodeMs: Math.round(encodeMs + performance.now() - t2) };
}
