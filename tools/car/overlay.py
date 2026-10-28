import sys, subprocess, json
import numpy as np


def load(path, fmt):
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path]))['streams'][0]
    w, h = probe['width'], probe['height']
    ch = {'rgb24': 3, 'rgba': 4, 'gray': 1}[fmt]
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', fmt, '-'])
    return np.frombuffer(raw, np.uint8).reshape(h, w, ch)


def save(path, a):
    h, w = a.shape[:2]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-i', '-', path], input=np.ascontiguousarray(a.astype(np.uint8)).tobytes(), check=True)


def edge(m):
    e = np.zeros_like(m)
    e[1:-1, 1:-1] = m[1:-1, 1:-1] & ~(m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:])
    return e


def thick(e, k=1):
    o = e.copy()
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            o |= np.roll(np.roll(e, dy, 0), dx, 1)
    return o


if __name__ == '__main__':
    photo, render, out = sys.argv[1], sys.argv[2], sys.argv[3]
    mask = sys.argv[4] if len(sys.argv) > 4 else None
    p = load(photo, 'rgb24').astype(float)
    r = load(render, 'rgba').astype(float)
    a = r[..., 3:] / 255
    mix = p * (1 - 0.5 * a) + r[..., :3] * 0.5 * a
    model = r[..., 3] > 127
    mix[thick(edge(model))] = (255, 40, 40)
    if mask:
        m = load(mask, 'gray')[..., 0] > 127
        mix[thick(edge(m))] = (40, 255, 80)
        inter, union = (m & model).sum(), (m | model).sum()
        print('IoU', round(inter / union, 4), 'model-only', int((model & ~m).sum()), 'photo-only', int((m & ~model).sum()))
    save(out, mix)
