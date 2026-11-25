"""Rough prosody stats for TTS takes: speech span, pitch range and pitch variation (autocorrelation F0).
Usage: python tools/voice_stats.py a.wav b.wav ...
More pitch variation and a wider range usually means a less flat, less robotic read."""
import sys
import numpy as np

def load(p):
    b = open(p, "rb").read(); i = b.find(b"data") + 8
    return np.frombuffer(b[i:i + (len(b) - i) // 2 * 2], dtype=np.int16).astype(float) / 32768, 24000

for p in sys.argv[1:]:
    x, sr = load(p)
    loud = np.nonzero(np.abs(x) > 0.025)[0]
    if not len(loud): print(p, "silent"); continue
    x = x[loud[0]:loud[-1]]
    f0s = []
    win, hop = int(0.04 * sr), int(0.01 * sr)
    for s in range(0, len(x) - win, hop):
        w = x[s:s + win] * np.hanning(win)
        if np.sqrt((w ** 2).mean()) < 0.02: continue
        ac = np.correlate(w, w, "full")[win - 1:]
        lo, hi = int(sr / 400), int(sr / 70)
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.35 * ac[0]: f0s.append(sr / k)
    f0 = np.array(f0s)
    st = 12 * np.log2(f0 / np.median(f0)) if len(f0) else np.array([0])
    rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    print(f"{p}: speech {len(x)/sr:.2f}s  median F0 {np.median(f0):.0f} Hz  pitch SD {st.std():.2f} st  range(5-95%) {np.percentile(st,95)-np.percentile(st,5):.1f} st  RMS {rms:.1f} dB")
