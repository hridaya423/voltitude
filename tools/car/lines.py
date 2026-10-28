import sys, json
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import shape as S
from camera import project
from overlay import load, save

cam_path, photo, out = sys.argv[1], sys.argv[2], sys.argv[3]
side = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
spec = json.load(open(cam_path))
W, H = spec['size']
p = np.array(spec['location'] + list(np.radians(spec['rotation'])) + [spec['lens']])
img = load(photo, 'rgb24').copy()

COLORS = [(80, 80, 255), (80, 80, 255), (255, 220, 0), (0, 255, 255), (255, 0, 255), (255, 140, 0), (0, 255, 0)]


def draw(pts, col):
    q = project(p, pts, W, H)
    for a, b in zip(q[:-1], q[1:]):
        n = int(max(abs(b - a).max(), 1))
        for t in np.linspace(0, 1, n + 1):
            x, y = (a + (b - a) * t).round().astype(int)
            if 1 <= x < W - 1 and 1 <= y < H - 1:
                img[y - 1:y + 2, x - 1:x + 2] = col


us = np.linspace(0, S.L, 400)
secs = np.array([S.section(u) for u in us])
for k in range(1, secs.shape[1]):
    for sgn in ((side,) if k < secs.shape[1] - 1 else (1,)):
        pts = np.stack([secs[:, k, 0] * sgn, us - S.L / 2, secs[:, k, 1] + S.GROUND], 1)
        draw(pts, COLORS[k])
for u in (S.NOSE_BOW, S.GLASS_START, S.PILLAR, 2.0, S.TIP, S.DECK, S.L):
    sec = S.section(u)
    draw(np.stack([sec[:, 0] * side, np.full(len(sec), u - S.L / 2), sec[:, 1] + S.GROUND], 1), (255, 255, 255))
save(out, img)
