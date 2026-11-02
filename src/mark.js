export const MARK = 'M6 10h15l11 26 11-26h15L39 50H25z';
export const RED = '#e31937';

export function drawMark(g, x, y, size, ink = '#f4f2ee') {
  const s = size / 64;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = ink;
  g.fill(new Path2D(MARK));
  g.fillStyle = RED;
  g.fillRect(22, 55, 20, 5);
  g.restore();
}
