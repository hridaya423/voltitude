import numpy as np, soundfile as sf
from scipy import signal

def track_f0(x, sr, fmin=120, fmax=2400, nfft=8192, hop=512, nh=6):
    win = np.hanning(nfft)
    frames = range(0, len(x) - nfft, hop)
    freqs = np.fft.rfftfreq(nfft, 1 / sr)
    cand = np.geomspace(fmin, fmax, 400)
    S = np.zeros((len(frames), len(cand)))
    for i, s in enumerate(frames):
        m = np.abs(np.fft.rfft(x[s:s + nfft] * win)) + 1e-9
        lm = np.log(m)
        lm = lm - signal.medfilt(lm, 101)
        for j, f in enumerate(cand):
            idx = np.round(f * np.arange(1, nh + 1) / (sr / nfft)).astype(int)
            idx = idx[idx < len(lm) - 2]
            S[i, j] = sum(lm[k - 1:k + 2].max() for k in idx) / len(idx)
    n, m = S.shape
    cost = np.zeros((n, m)); back = np.zeros((n, m), int)
    cost[0] = S[0]
    jump = np.abs(np.log(cand)[:, None] - np.log(cand)[None, :])
    pen = 6.0 * jump
    for i in range(1, n):
        t = cost[i - 1][None, :] - pen
        back[i] = t.argmax(1)
        cost[i] = S[i] + t.max(1)
    path = np.zeros(n, int); path[-1] = cost[-1].argmax()
    for i in range(n - 1, 0, -1): path[i - 1] = back[i, path[i]]
    t = (np.array(list(frames)) + nfft / 2) / sr
    return t, cand[path]

if __name__ == '__main__':
    import sys
    x, sr = sf.read(sys.argv[1]); x = x if x.ndim == 1 else x.mean(1)
    t, f = track_f0(x, sr)
    for a, b in zip(t[::8], f[::8]): print(f'{a:.2f}s {b:.0f}Hz')
