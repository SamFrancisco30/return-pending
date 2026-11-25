"""Generate several ElevenLabs v3 takes per line and rank them by how much they move.

Usage: python tools/voice_takes.py scene/voice_cast.json [takes_per_voice=3] [stability=0.0]
Writes audio/el2/<line>__<voice>__t<k>.wav and audio/el2/ranking.json.

Score = pitch variation (semitones SD) + 0.5 * loudness variation (dB SD over voiced 50 ms frames)
        - 3 * seconds over the line's window. Highest score = most expressive take that still fits.
This is a proxy for "not flat"; the final call is by ear.
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cast = json.load(open(sys.argv[1], encoding="utf-8"))
K = int(sys.argv[2]) if len(sys.argv) > 2 else 3
STAB = sys.argv[3] if len(sys.argv) > 3 else "0.0"
OUT = os.path.join(ROOT, "audio", "el2"); os.makedirs(OUT, exist_ok=True)


def load(p):
    b = open(p, "rb").read(); i = b.find(b"data") + 8
    return np.frombuffer(b[i:i + (len(b) - i) // 2 * 2], dtype=np.int16).astype(float) / 32768


def tighten(x, sr=24000, max_gap=0.30, keep=0.22):
    """Dialogue edit: shorten internal pauses longer than max_gap to `keep` seconds (crossfaded).
    Keeps breaths/whispers (anything above the silence floor), only removes dead air."""
    hop = int(0.01 * sr); n = len(x) // hop
    rms = np.array([np.sqrt((x[i * hop:(i + 1) * hop] ** 2).mean()) for i in range(n)])
    silent = rms < 10 ** (-48 / 20)
    out, i, cf = [], 0, int(0.01 * sr)
    seg_start = 0
    while i < n:
        if silent[i]:
            j = i
            while j < n and silent[j]: j += 1
            if (j - i) * hop > max_gap * sr and i > 0 and j < n:
                a = x[seg_start:i * hop + int(keep * sr / 2)]
                out.append(a); seg_start = j * hop - int(keep * sr / 2)
            i = j
        else: i += 1
    out.append(x[seg_start:])
    y = out[0]
    for s in out[1:]:
        r = np.linspace(0, 1, cf); y = np.concatenate([y[:-cf], y[-cf:] * r[::-1] + s[:cf] * r, s[cf:]])
    return y


def save(x, p, sr=24000):
    import struct
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    open(p, "wb").write(b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16) + b"data" + struct.pack("<I", len(pcm)) + pcm)


def stats(x, sr=24000):
    loud = np.nonzero(np.abs(x) > 0.025)[0]
    if not len(loud): return None
    x = x[loud[0]:loud[-1]]
    win, hop = int(0.04 * sr), int(0.01 * sr); f0s = []; lv = []
    for s in range(0, len(x) - win, hop):
        w = x[s:s + win] * np.hanning(win); r = np.sqrt((w ** 2).mean())
        if r < 0.01: continue
        lv.append(20 * np.log10(r))
        ac = np.correlate(w, w, "full")[win - 1:]; lo, hi = int(sr / 400), int(sr / 70)
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.35 * ac[0]: f0s.append(sr / k)
    f0 = np.array(f0s); st = 12 * np.log2(f0 / np.median(f0)) if len(f0) > 5 else np.array([0.0])
    return {"dur": round(len(x) / sr, 2), "pitch_sd": round(float(st.std()), 2), "loud_sd": round(float(np.std(lv)), 2) if lv else 0}


ranking = {}
for line in cast["lines"]:
    takes = []
    for who in line["who"]:
        for k in range(K):
            out = os.path.join(OUT, f'{line["id"]}__{who}__t{k}.wav')
            if not os.path.exists(out):
                r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "eleven.py"), "tts", cast["voices"][who], out, line["text"], STAB],
                                   capture_output=True, text=True)
                if r.returncode: print("FAILED", out, r.stderr[-300:]); continue
            tight = out.replace(".wav", ".tight.wav")
            save(tighten(load(out)), tight)
            s = stats(load(tight))
            if not s: continue
            s["raw_dur"] = stats(load(out))["dur"]
            s["score"] = round(s["pitch_sd"] + 0.5 * s["loud_sd"] - 3 * max(0, s["dur"] - line["window"]), 2)
            takes.append({"file": os.path.relpath(tight, ROOT).replace("\\", "/"), "voice": who, **s})
    takes.sort(key=lambda d: -d["score"])
    ranking[line["id"]] = {"subtitle": line["subtitle"], "window": line["window"], "takes": takes}
    print(f'== {line["id"]} (window {line["window"]}s)')
    for t in takes: print(f'   {t["score"]:6.2f}  {t["voice"]:12s} dur {t["raw_dur"]:.2f}->{t["dur"]:.2f}  pitchSD {t["pitch_sd"]:.2f}  loudSD {t["loud_sd"]:.2f}  {t["file"]}')
json.dump(ranking, open(os.path.join(OUT, "ranking.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
