import sys, os, json, subprocess, shutil
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np, soundfile as sf
from scipy import signal, interpolate
import pyloudnorm as pyln
from f0 import track_f0

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.abspath(os.environ.get('AUDIO_SRC', os.path.join(HERE, 'src')))
OUT = os.path.abspath(os.environ.get('AUDIO_OUT', os.path.join(HERE, '..')))
TMP = os.path.join(WORK, 'build')
os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
SR = 44100
PAD = 0.1
meter = pyln.Meter(SR)

def raw(i): return os.path.join(WORK, 'raw', f'{i}.mp3')
def el(n): return os.path.join(WORK, 'el', f'{n}.mp3')

def load(path, ch=None):
    x, sr = sf.read(path, always_2d=True)
    x = x.astype(np.float64)
    if sr != SR:
        g = np.gcd(sr, SR)
        x = signal.resample_poly(x, SR // g, sr // g, axis=0)
    if ch == 1: x = x.mean(1, keepdims=True)
    if ch == 2 and x.shape[1] == 1: x = np.repeat(x, 2, axis=1)
    return x

def cut(x, a, b=None):
    return x[int(round(a * SR)): None if b is None else int(round(b * SR))]

def hpf(x, fc, order=2):
    sos = signal.butter(order, fc, 'highpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)

def lpf(x, fc, order=2):
    sos = signal.butter(order, fc, 'lowpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)

def kw(x):
    y = x.copy()
    for f in meter._filters.values(): y = f.apply_filter(y)
    return y

def lufs_int(x):
    return meter.integrated_loudness(x if x.shape[0] > SR // 2 else np.pad(x, ((0, SR // 2), (0, 0))))

def momentary_max(x):
    y = kw(x if x.ndim > 1 else x[:, None])
    w = int(0.4 * SR); h = int(0.1 * SR)
    if len(y) < w: y = np.pad(y, ((0, w - len(y)), (0, 0)))
    best = -120
    for s in range(0, len(y) - w + 1, h):
        ms = np.sum(np.mean(y[s:s + w] ** 2, axis=0))
        best = max(best, -0.691 + 10 * np.log10(ms + 1e-12))
    return best

def db(g): return 10 ** (g / 20)

def fade(x, fin=0.003, fout=0.01):
    x = x.copy()
    a = int(fin * SR); b = int(fout * SR)
    if a: x[:a] *= np.linspace(0, 1, a)[:, None]
    if b: x[-b:] *= np.linspace(1, 0, b)[:, None]
    return x

def make_loop(x, N, xf, tonal=False):
    x = x[:, 0] if x.ndim > 1 else x
    N = int(round(N)); xf = int(round(xf))
    assert len(x) >= N + xf, (len(x), N + xf)
    L = x[:N].copy()
    tail = x[N:N + xf]
    t = np.linspace(0, 1, xf)
    if tonal: fi, fo = t, 1 - t
    else: fi, fo = np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)
    L[:xf] = L[:xf] * fi + tail * fo
    return L

def best_period_len(x, lo, xf):
    a = x[:xf]
    hi = len(x) - xf
    cc = signal.fftconvolve(x, a[::-1], mode='valid')
    en = np.sqrt(np.convolve(x ** 2, np.ones(xf), mode='valid'))
    sc = cc / (en * np.linalg.norm(a) + 1e-9)
    sc = sc[:hi + 1]
    sc[:int(lo)] = -1
    n = int(np.argmax(sc))
    return n, float(sc[n])

def detonal(x, thr=8.0, fmax=9500, fmin=800, q=28):
    from peaks import peaks
    y = x[:, 0] if x.ndim > 1 else x
    for f0, d in peaks(y, SR, fmin, thr):
        if f0 < fmax:
            b, a = signal.iirnotch(f0, q, fs=SR)
            y = signal.sosfiltfilt(signal.tf2sos(b, a), y)
    return y[:, None]

def seam(L):
    d = np.abs(np.diff(L))
    return float(abs(L[0] - L[-1]) / (np.sqrt(np.mean(d ** 2)) + 1e-12))

def encode(name, x, kbps, ch):
    wav = os.path.join(TMP, name + '.wav')
    sf.write(wav, np.clip(x, -1, 1).astype(np.float32), SR, subtype='FLOAT')
    out = os.path.join(OUT, name + '.m4a')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'aac_at', '-b:a', f'{kbps}k', '-ac', str(ch), '-ar', str(SR), '-movflags', '+faststart', out], check=True)
    return os.path.getsize(out)

manifest = {'loops': {}, 'sprite': None, 'ir': None}
report = []

def loop_asset(name, L, lufs, kbps=64, **extra):
    n = len(L)
    L = hpf(np.tile(L, 3)[:, None], 25)[n:2 * n, 0]
    L = L * db(lufs - lufs_int(np.tile(L, 2)[:, None]))
    pk = np.abs(L).max()
    if pk > db(-1): L *= db(-1) / pk
    stream = np.concatenate([L[-int(PAD * SR):], L, L[:int(PAD * SR)]])
    size = encode(name, stream[:, None], kbps, 1)
    manifest['loops'][name] = dict(file=name + '.m4a', loop=[PAD, round(PAD + len(L) / SR, 4)], **extra)
    report.append(f'{name:12s} {len(L)/SR:6.2f}s loop  seam {seam(L):5.2f}  {size/1024:6.1f} KB')
    return L

def noise_loop(name, x, a, N, xf=1.0, lufs=-24, kbps=64, pre=None, **extra):
    seg = cut(load(x, 1), a, a + (N + xf) / 1.0)
    if pre: seg = pre(seg)
    L = make_loop(seg, N * SR, xf * SR)
    return loop_asset(name, L, lufs, kbps, **extra)

def build_motor():
    x = load(el('motor_b'), 1)[:, 0]
    t, f = track_f0(x, SR, fmin=140, nfft=8192, hop=512)
    K = 1.39
    keep = ((t > 0.45) & (t < 2.55)) | ((t > 2.75) & (t < 3.55)) | ((t > 3.72) & (t < 7.3))
    tb, fb = t[keep], f[keep].copy()
    fb[tb > 3.6] /= K
    sp = interpolate.UnivariateSpline(tb, np.log(fb), k=3, s=len(tb) * 0.0004)
    curve = lambda q: np.exp(sp(q))
    cs = interpolate.CubicSpline(np.arange(len(x)) / SR, x)
    env = np.sqrt(np.maximum(signal.sosfiltfilt(signal.butter(2, 2.0, 'low', fs=SR, output='sos'), x ** 2), 0)) + 1e-3
    xn = x / env
    csn = interpolate.CubicSpline(np.arange(len(x)) / SR, xn)
    zones = {'motor_z1': (0.45, 1.55), 'motor_z2': (1.55, 3.0), 'motor_z3': (3.72, 6.2)}
    for name, (ta, tbz) in zones.items():
        tt = np.arange(ta, tbz, 1 / (SR * 2.0))
        fq = curve(tt)
        ft = float(np.exp(np.mean(np.log(fq))))
        corr_fac = np.ones_like(tt)
        for it in range(4):
            rate = fq * corr_fac / ft
            tau = np.concatenate([[0], np.cumsum(rate[1:] / (SR * 2.0))])
            n = int(tau[-1] * SR)
            src_t = np.interp(np.arange(n) / SR, tau, tt)
            y = csn(src_t)
            tr_t, tr_f = track_f0(y, SR, fmin=ft * 0.85, fmax=ft * 1.18, nfft=8192, hop=256, nh=8)
            if it == 3: break
            res = signal.savgol_filter(np.log(tr_f / ft), 15, 2)
            src_at = src_t[np.clip((tr_t * SR).astype(int), 0, n - 1)]
            res_t = np.interp(tt, src_at, res)
            corr_fac = corr_fac * np.exp(res_t)
        flat = float(np.std(np.log(tr_f)) * 100)
        y = lpf(hpf(y[:, None], 60), 6500, 3)[:, 0]
        xf = int(0.2 * SR)
        N, corr = best_period_len(y, len(y) * 0.5, xf)
        L = make_loop(y, N, xf, tonal=True)
        loop_asset(name, L, -24, 96, f0=round(ft, 1), tonal=True)
        report[-1] += f'  ft {ft:6.1f} Hz  corr {corr:.2f}  pitch-wobble {flat:.2f}%'
    hum = load(el('motor_c'), 1)
    L = make_loop(cut(hum, 0.0, 9.9)[:, 0], 8.5 * SR, 1.0 * SR, tonal=True)
    loop_asset('motor_hum', L, -24, 64, f0=170.0, tonal=True)

def build_loops():
    noise_loop('thrust_hiss', el('thruster_a'), 0, 8.5, 1.2, -26, 96, pre=lambda x: lpf(detonal(x), 10000, 3))
    noise_loop('boost_roar', raw(774270), 4, 12, 2.0, -22, 96)
    noise_loop('boost_low', el('boost_b'), 0, 8.0, 1.5, -22, 64)
    noise_loop('wind_body', raw(518090), 8, 14, 2.0, -26, 64)
    noise_loop('wind_rush', raw(162414), 0, 7.5, 1.5, -24, 96)
    noise_loop('wind_gust', raw(438881), 8, 14, 2.0, -26, 96)
    noise_loop('ground', el('ground_loop'), 0, 8.0, 1.5, -24, 64)
    noise_loop('tire', el('tire_loop'), 0, 6.0, 1.2, -26, 64, pre=lambda x: detonal(x, 8.5))
    noise_loop('scrape', el('scrape_loop'), 0, 4.5, 1.0, -26, 64, pre=lambda x: detonal(x, 9.0))

def stereo_fx(x, spread=0.0):
    return x

def mix_at(parts, length):
    out = np.zeros((int(length * SR), 2))
    for x, at, g in parts:
        s = int(at * SR); n = min(len(x), len(out) - s)
        out[s:s + n] += x[:n] * g
    return out

def build_sprite():
    L = lambda p, a=0, b=None, ch=2: cut(load(p, ch), a, b)
    items = {}
    items['count'] = fade(hpf(L(raw(651010), 0.10, 1.05), 60), 0.002, 0.25)
    items['go'] = fade(hpf(L(raw(651010), 3.15, 5.2), 60), 0.002, 0.3)
    items['check_a'] = fade(L(raw(614832), 0, 1.5), 0.001, 0.2)
    items['check_b'] = fade(L(raw(562196), 0, 1.7), 0.001, 0.25)
    items['slot'] = fade(L(raw(531125), 0, 3.2), 0.001, 0.4)
    items['shimmer'] = fade(L(raw(849807), 3.6, 5.3), 0.01, 0.35)
    items['lap'] = fade(L(raw(521643), 0, 3.0), 0.001, 0.5)
    items['finish'] = fade(L(raw(706753), 0, 6.0), 0.001, 0.8)
    thump = lpf(L(el('impact_a'), 0, 1.0), 220, 3)
    items['miss'] = fade(mix_at([(L(el('miss_a'), 0, 1.5), 0, 1.0), (thump, 0, 0.9)], 1.5), 0.002, 0.3)
    ign = mix_at([(L(el('boost_start'), 0, 2.6), 0, 1.0), (L(raw(540068), 0, 2.2), 0.02, 0.8)], 2.6)
    items['ignite'] = fade(ign, 0.002, 0.5)
    items['puff'] = fade(L(el('thruster_b'), 0, 1.2), 0.002, 0.2)
    items['impact_a'] = fade(L(el('impact_a'), 0, 1.4), 0.001, 0.2)
    items['impact_b'] = fade(L(el('impact_b'), 0, 2.0), 0.001, 0.3)
    items['clip'] = fade(L(el('clip_a'), 0, 1.45), 0.001, 0.2)
    items['scrape_hit'] = fade(L(raw(641048), 0, 2.0), 0.001, 0.4)
    items['whoosh1'] = fade(L(raw(776651), 0.45, 2.5), 0.005, 0.3)
    items['whoosh2'] = fade(L(raw(449994), 0.0, 1.5), 0.005, 0.3)
    items['whoosh3'] = fade(L(el('whoosh_a'), 0, 1.2), 0.005, 0.2)
    items['whoosh4'] = fade(L(raw(719636), 0, 0.55), 0.002, 0.1)
    items['respawn'] = fade(L(el('respawn_a'), 0, 1.5), 0.002, 0.3)
    items['ui'] = fade(L(raw(528561), 0, 0.2), 0.0005, 0.04)
    gap = int(0.3 * SR)
    pos = 0; chunks = []; offs = {}
    for name, x in items.items():
        x = hpf(x, 30)
        m = momentary_max(x)
        g = db(-14 - m)
        pk = np.abs(x).max() * g
        if pk > db(-1.5): g *= db(-1.5) / pk
        x = x * g
        offs[name] = [round(pos / SR, 4), round(len(x) / SR, 4)]
        chunks.append(x); chunks.append(np.zeros((gap, 2)))
        pos += len(x) + gap
        report.append(f'  sprite {name:10s} {len(x)/SR:5.2f}s  mom {m:6.1f} -> -14  peak {20*np.log10(np.abs(x).max()):5.1f} dBFS')
    full = np.concatenate([np.zeros((int(0.2 * SR), 2))] + chunks)
    for k in offs: offs[k][0] = round(offs[k][0] + 0.2, 4)
    size = encode('sfx', full, 112, 2)
    manifest['sprite'] = dict(file='sfx.m4a', cues=offs)
    report.append(f'sfx sprite {len(full)/SR:.1f}s {size/1024:.1f} KB')

def build_ir():
    x = load(raw(379909), 2)
    x = cut(x, 0, 2.4)
    x = hpf(x, 80)
    n = int(0.5 * SR)
    x[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
    x = x / np.sqrt(np.sum(x ** 2) / 2) * 0.12
    size = encode('ir_canyon', x, 96, 2)
    manifest['ir'] = dict(file='ir_canyon.m4a')
    report.append(f'ir_canyon {len(x)/SR:.1f}s {size/1024:.1f} KB')

if __name__ == '__main__':
    what = sys.argv[1:] or ['motor', 'loops', 'sprite', 'ir']
    mf = os.path.join(OUT, 'manifest.json')
    if os.path.exists(mf):
        old = json.load(open(mf))
        for k in manifest:
            if old.get(k) is not None: manifest[k] = old[k]
    if 'motor' in what: build_motor()
    if 'loops' in what: build_loops()
    if 'sprite' in what: build_sprite()
    if 'ir' in what: build_ir()
    json.dump(manifest, open(mf, 'w'), indent=1)
    print('\n'.join(report))
    tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.m4a'))
    print(f'TOTAL m4a {tot/1024:.0f} KB')
