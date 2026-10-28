import sys, numpy as np, soundfile as sf
from scipy import signal
def peaks(x, sr, fmin=800, thr=7.0):
    f, P = signal.welch(x, sr, nperseg=16384, noverlap=8192)
    L = 10 * np.log10(P + 1e-20)
    med = signal.medfilt(L, 151)
    d = L - med
    idx = [i for i in signal.find_peaks(d, height=thr)[0] if f[i] > fmin]
    return [(int(f[i]), round(float(d[i]), 1)) for i in idx]
if __name__ == '__main__':
    for p in sys.argv[1:]:
        x, sr = sf.read(p); x = x if x.ndim == 1 else x.mean(1)
        print(p.split('/')[-1], peaks(x, sr))
