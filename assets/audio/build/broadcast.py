import sys, os, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, soundfile as sf
from scipy import signal
import build as B

SR = B.SR
OUT = B.OUT
TMP = B.TMP
VOICE = os.environ.get('RADIO_VOICE', 'Daniel')
RATE = os.environ.get('RADIO_RATE', '158')
rng = np.random.default_rng(7)

LINES = {
    'radio_check': ['Radio check. Lights in a moment. Go have some fun.'],
    'purple': ["Purple sector! Nobody's been quicker through there.", 'Purple! Fastest of anyone through that one.'],
    'green': ["Green sector. That's a personal best.", 'Green again. Lovely, a personal best.'],
    'yellow': ['Bit slow through there. Plenty left in it.'],
    'gas_low': ['Gas is low. Lift and let the compressor breathe.'],
    'gas_full': ["Tank's full. Use it."],
    'big_air': ['That was a lot of air. Starman says hi.'],
    'perfect': ['Beautiful landing. Mega.', 'Smooth as you like. Mega.'],
    'flip': ['Did you just flip it? Brilliant.', 'Was that a flip? Absolutely brilliant.'],
    'wall': ["You're on the wall. Trust the fans."],
    'inverted': ['Upside down. Totally normal. Keep pushing.'],
    'wreck': ["Ooh. Shake it off, we'll put you back."],
    'hard': ["Heavy landing. Car's fine. Mostly."],
    'last_sector': ['Last sector. Bring it home.'],
    'finish_pb': ['Personal best! Get in there!'],
    'finish_author': ["That's the author time. Unreal. Absolutely unreal."],
    'finish': ['Chequered flag. Good run, mate.'],
    'again': ['Again? Love it.'],
}

def tts(name, text):
    os.makedirs(os.path.join(B.WORK, 'tts'), exist_ok=True)
    p = os.path.join(B.WORK, 'tts', name + '.wav')
    subprocess.run(['say', '-v', VOICE, '-r', RATE, '-o', p, '--data-format=LEF32@44100', text], check=True)
    return B.load(p, 1)[:, 0]

def bandpass(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)

def trim_voice(x, floor_db=-48, margin=0.02):
    pk = np.abs(x).max()
    idx = np.where(np.abs(x) > pk * 10 ** (floor_db / 20))[0]
    m = int(margin * SR)
    return x[max(0, idx[0] - m): idx[-1] + m]

def compress(x, thr_db=-24, ratio=3.5, att=0.004, rel=0.09):
    a = np.exp(-1 / (att * SR)); r = np.exp(-1 / (rel * SR))
    ax = np.abs(x)
    env = np.empty_like(ax)
    e = 0.0
    for i in range(len(ax)):
        v = ax[i]
        e = a * e + (1 - a) * v if v > e else r * e + (1 - r) * v
        env[i] = e
    lvl = 20 * np.log10(env + 1e-9)
    over = np.maximum(lvl - thr_db, 0)
    gain = 10 ** (-(over * (1 - 1 / ratio)) / 20)
    return x * gain

def squelch_open():
    n = int(0.085 * SR)
    t = np.arange(n) / SR
    noise = bandpass(rng.standard_normal(n), 700, 3400) * np.exp(-t / 0.016)
    tick = np.sin(2 * np.pi * 1450 * t) * np.exp(-t / 0.004) * (t < 0.02)
    y = 0.55 * noise / np.abs(noise).max() + 0.5 * tick
    y[:int(0.0008 * SR)] *= np.linspace(0, 1, int(0.0008 * SR))
    return y

def squelch_close():
    n = int(0.19 * SR)
    t = np.arange(n) / SR
    noise = bandpass(rng.standard_normal(n), 600, 3400) * np.exp(-t / 0.045)
    tick = np.sin(2 * np.pi * 1100 * t) * np.exp(-t / 0.003) * (t < 0.015)
    y = 0.5 * noise / np.abs(noise).max() + 0.35 * tick
    y[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return y

def radio_voice(text, name):
    v = trim_voice(tts(name, text))
    v = v / np.abs(v).max()
    sos = signal.butter(4, 300, 'highpass', fs=SR, output='sos')
    v = signal.sosfilt(sos, v)
    sos = signal.butter(4, 3400, 'lowpass', fs=SR, output='sos')
    v = signal.sosfilt(sos, v)
    b, a = signal.iirpeak(1900, 1.2, fs=SR)
    v = v + 0.35 * signal.lfilter(b, a, v)
    v = v / np.abs(v).max() * 0.5
    v = compress(v, thr_db=-22, ratio=3.5)
    v = np.tanh(2.0 * v) / np.tanh(2.0)
    sos = signal.butter(2, 3400, 'lowpass', fs=SR, output='sos')
    v = signal.sosfilt(sos, v)
    v = v / np.sqrt(np.mean(v ** 2)) * 0.1
    head = squelch_open() * 0.14
    tail = squelch_close() * 0.14
    pre = int(0.1 * SR)
    gap = int(0.03 * SR)
    n = pre + len(v) + gap + len(tail)
    y = np.zeros(n)
    y[:len(head)] += head
    y[pre:pre + len(v)] += v
    y[pre + len(v) + gap:] += tail
    hiss = bandpass(rng.standard_normal(n), 350, 3200) * 0.0045
    env = np.zeros(n)
    env[int(0.04 * SR):pre + len(v) + gap] = 1
    env = signal.sosfilt(signal.butter(2, 60, 'low', fs=SR, output='sos'), env)
    y += hiss * np.clip(env, 0, 1)
    return y

def tone(f, dur, parts, decay):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, a in parts:
        y += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * decay * (0.6 + 0.4 * k))
    att = int(0.003 * SR)
    y[:att] *= np.linspace(0, 1, att)
    return y

def light(i):
    f = [523.25, 587.33, 659.25, 783.99, 880.0][i]
    y = tone(f, 0.26, [(1, 1), (2, 0.28), (3, 0.1), (4.01, 0.04)], 13)
    return y

def lights_out():
    n = int(1.3 * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f, a in [(523.25, 1), (659.25, 0.8), (783.99, 0.7), (1046.5, 0.6), (1318.5, 0.35)]:
        y += a * tone(f, 1.3, [(1, 1), (2, 0.25), (3, 0.08)], 3.4)
    air = signal.sosfilt(signal.butter(3, 2600, 'highpass', fs=SR, output='sos'), rng.standard_normal(n))
    air *= (1 - np.exp(-t / 0.05)) * np.exp(-t / 0.22) * 0.09
    thump = np.sin(2 * np.pi * (70 + 60 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.09) * 0.7
    y = y / 3.2 + air + thump * 0.5
    y[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return y

def seg(path, a, b, fin=0.01, fout=0.2):
    x = B.load(path, 1)[:, 0]
    x = B.hpf(B.cut(x, a, b)[:, None], 70)[:, 0]
    return B.fade(x[:, None], fin, fout)[:, 0]

def encode(name, x, kbps, sr):
    wav = os.path.join(TMP, name + '.wav')
    sf.write(wav, np.clip(x, -1, 1).astype(np.float32), SR, subtype='FLOAT')
    out = os.path.join(OUT, name + '.m4a')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'aac_at', '-b:a', f'{kbps}k', '-ac', '1', '-ar', str(sr), '-movflags', '+faststart', out], check=True)
    return os.path.getsize(out)

def pack(items, target):
    gap = int(0.25 * SR)
    chunks, offs, pos = [], {}, 0
    lead = int(0.2 * SR)
    chunks.append(np.zeros(lead)); pos = lead
    rep = []
    for name, x in items.items():
        tg = target.get(name, -15) if isinstance(target, dict) else target
        m = B.momentary_max(x[:, None])
        g = B.db(tg - m)
        pk = np.abs(x).max() * g
        if pk > B.db(-1.5): g *= B.db(-1.5) / pk
        x = x * g
        offs[name] = [round(pos / SR, 4), round(len(x) / SR, 4)]
        chunks.append(x); chunks.append(np.zeros(gap))
        pos += len(x) + gap
        rep.append(f'  {name:14s} {len(x)/SR:5.2f}s  mom {m:6.1f} -> {tg}  peak {20*np.log10(np.abs(x).max()):5.1f}')
    return np.concatenate(chunks), offs, rep

def build_radio():
    items, lines = {}, {}
    for lid, texts in LINES.items():
        names = []
        for i, text in enumerate(texts):
            nm = lid if len(texts) == 1 else f'{lid}_{"ab"[i]}'
            items[nm] = radio_voice(text, nm)
            names.append(nm)
        lines[lid] = names
    full, offs, rep = pack(items, -15)
    size = encode('radio', full, 40, 24000)
    print('\n'.join(rep))
    print(f'radio {len(full)/SR:.1f}s {size/1024:.1f} KB')
    return dict(file='radio.m4a', cues=offs, lines=lines)

def build_broadcast():
    raw = B.raw
    items = {}
    items['cheer_a'] = seg(raw(267246), 0.3, 4.9, 0.02, 0.8)
    items['cheer_b'] = seg(raw(651645), 0.8, 4.8, 0.05, 0.7)
    items['pb'] = seg(raw(130568), 0.0, 5.6, 0.02, 1.6)
    items['gasp_a'] = seg(raw(324895), 0.7, 2.0, 0.03, 0.25)
    items['gasp_b'] = seg(raw(439258), 5.1, 7.2, 0.03, 0.6)
    items['applause'] = seg(raw(777709), 0.5, 6.0, 0.3, 1.6)
    for i in range(5):
        items[f'light{i + 1}'] = light(i)
    items['lights_out'] = lights_out()
    target = {k: -17 for k in items}
    target.update(pb=-15, lights_out=-16)
    for i in range(1, 6): target[f"light{i}"] = -19
    full, offs, rep = pack(items, target)
    size = encode('broadcast', full, 64, SR)
    print('\n'.join(rep))
    print(f'broadcast {len(full)/SR:.1f}s {size/1024:.1f} KB')
    return dict(file='broadcast.m4a', cues=offs)

def build_bed():
    B.noise_loop('crowd_bed', B.raw(480765), 3.0, 20, 2.5, -27, 64, pre=lambda x: B.lpf(B.hpf(x, 100), 7500, 2))
    print(B.report[-1])
    return B.manifest['loops']['crowd_bed']

if __name__ == '__main__':
    what = sys.argv[1:] or ['bed', 'broadcast', 'radio']
    mf = os.path.join(OUT, 'manifest.json')
    man = json.load(open(mf))
    if 'bed' in what: man['loops']['crowd_bed'] = build_bed()
    if 'broadcast' in what: man['broadcast'] = build_broadcast()
    if 'radio' in what: man['radio'] = build_radio()
    json.dump(man, open(mf, 'w'), indent=1)
