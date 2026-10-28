import sys, os, json
from fractions import Fraction
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import signal
import build as B

SR, raw = B.SR, B.raw
cut, hpf, lpf, fade, db = B.cut, B.hpf, B.lpf, B.fade, B.db


def mono(i):
    return B.load(raw(i), 1)[:, 0]


def shifted(x, a, b, f_src, f_dst):
    seg = cut(x, a, b)
    r = Fraction(f_dst / f_src).limit_denominator(100)
    return signal.resample_poly(seg, r.denominator, r.numerator)


def tonal_loop(name, y, f0, kbps=96, xf=0.2):
    y = lpf(hpf(y[:, None], 60), 6500, 3)[:, 0]
    N, corr = B.best_period_len(y, len(y) * 0.5, int(xf * SR))
    L = B.make_loop(y, N, int(xf * SR), tonal=True)
    B.loop_asset(name, L, -24, kbps, f0=round(f0, 1), tonal=True)
    B.report[-1] += f'  f0 {f0:6.1f} Hz  corr {corr:.2f}'


def build_motor():
    x = mono(697379)
    tonal_loop('motor_z1', shifted(x, 3.0, 7.3, 185, 185), 185)
    tonal_loop('motor_z2', shifted(x, 13.75, 17.1, 278, 400), 400)
    tonal_loop('motor_z3', shifted(x, 13.75, 17.1, 278, 829.6), 829.6)
    hum = shifted(x, 3.0, 7.3, 185, 170)
    hum = lpf(hum[:, None], 900, 3)[:, 0]
    tonal_loop('motor_hum', hum, 170.0, 64, 0.4)


def build_loops():
    B.noise_loop('thrust_hiss', raw(182359), 4.5, 8.5, 1.5, -26, 96)
    B.noise_loop('tire', raw(383475), 8, 8.0, 1.5, -26, 64, pre=lambda x: hpf(lpf(x, 3200, 3), 160))
    B.noise_loop('kerb', raw(104634), 1.0, 8.0, 1.2, -22, 64, pre=lambda x: hpf(x, 40))
    B.noise_loop('scrub', raw(71739), 3.0, 8.0, 1.5, -24, 96, pre=lambda x: hpf(x, 400))
    B.noise_loop('scrub_burn', raw(71740), 3.3, 1.6, 0.5, -24, 96, pre=lambda x: hpf(x, 400))
    B.noise_loop('crowd_bed2', raw(424295), 2.0, 20.0, 2.0, -26, 64)


def build_sprite():
    L = lambda i, a=0, b=None: cut(B.load(raw(i), 2), a, b)
    items = {}
    for k, (a, b) in zip('abcd', [(0.66, 1.2), (1.2, 1.75), (1.86, 2.35), (3.56, 4.1)]):
        items['burst_' + k] = fade(hpf(L(371839, a, b), 90), 0.004, 0.08)
    items['burst_long'] = fade(hpf(L(371839, 7.6, 8.6), 90), 0.004, 0.2)
    items['vent'] = fade(hpf(L(477846, 0.62, 1.9), 90), 0.004, 0.25)
    items['ignite_gas'] = fade(hpf(L(131931, 0.35, 2.1), 90), 0.003, 0.3)
    for k, t in zip('abcd', [0.22, 2.03, 3.6, 4.52]):
        items['kerb_' + k] = fade(hpf(L(104634, t - 0.08, t + 0.3), 30), 0.004, 0.12)
    items['contact_a'] = fade(hpf(L(592388, 0, 1.6), 40), 0.001, 0.3)
    items['contact_b'] = fade(hpf(L(332057, 0, 1.3), 40), 0.001, 0.3)
    items['contact_c'] = fade(hpf(L(321482, 0, 1.2), 40), 0.001, 0.25)
    gap = int(0.3 * SR)
    pos, chunks, offs = 0, [], {}
    for name, x in items.items():
        m = B.momentary_max(x)
        g = db(-14 - m)
        pk = np.abs(x).max() * g
        if pk > db(-1.5):
            g *= db(-1.5) / pk
        x = x * g
        offs[name] = [round(pos / SR, 4), round(len(x) / SR, 4)]
        chunks += [x, np.zeros((gap, 2))]
        pos += len(x) + gap
        B.report.append(f'  real {name:11s} {len(x)/SR:5.2f}s  mom {m:6.1f} -> -14  peak {20*np.log10(np.abs(x).max()):5.1f} dBFS')
    full = np.concatenate([np.zeros((int(0.2 * SR), 2))] + chunks)
    for k in offs:
        offs[k][0] = round(offs[k][0] + 0.2, 4)
    size = B.encode('real', full, 112, 2)
    B.manifest['real'] = dict(file='real.m4a', cues=offs)
    B.report.append(f'real sprite {len(full)/SR:.1f}s {size/1024:.1f} KB')


if __name__ == '__main__':
    what = sys.argv[1:] or ['motor', 'loops', 'sprite']
    mf = os.path.join(B.OUT, 'manifest.json')
    B.manifest.update(json.load(open(mf)))
    if 'motor' in what:
        build_motor()
    if 'loops' in what:
        build_loops()
    if 'sprite' in what:
        build_sprite()
    json.dump(B.manifest, open(mf, 'w'), indent=1)
    print('\n'.join(B.report))
