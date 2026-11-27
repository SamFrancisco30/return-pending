"""Cue-driven procedural sound design, driven by the same timeline JSON as the picture.

Usage: python tools/sound_design.py scene/timeline_X.json audio/mix_X.wav

Mix structure (v2, cleaner):
  room  : ambience + footsteps + drone          -> cut when the overhead feed drops
  fx    : explicit events (door, scrape, hit...) -> shared reverb space
  vo    : radio lines (subtitles[].vo)           -> dry, everything else ducks under it
Automatic: footsteps from operator keyframes, one soft HUD blip per warning, transition static.
Explicit "sfx" cues: ambience, creak, relocate, drone, insert_bed, door_push, feed_cut,
feed_back, scrape, hit, oneshot (any named sample), held (thumps on a held door), freeze (drone
dips), lapse_close (impacts stop, drone dies, outside air), typing (card ticks).
  ui    : cards and HUD (typing, stamp, countdown ticks, the beacon radio) -> dry, not ducked
Room sound is muted on card / black shots. Operators may be plain key lists or {interp, keys}.
"""
import json, os, sys, wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RENDERER = os.path.join(ROOT, "renderer")
tl = json.load(open(sys.argv[1], encoding="utf-8"))
DUR = tl["duration"]; N = int(SR * DUR)
rng = np.random.default_rng(7)
room = np.zeros(N); fxL = np.zeros(N); fxR = np.zeros(N); vo = np.zeros(N); ui = np.zeros(N); drone_buf = np.zeros(N)
cues = tl.get("sfx", [])
amb = next((c for c in cues if c["type"] == "ambience"), {"kind": "motel"})
KIND = amb["kind"]


def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def env(n, a, r):
    e = np.ones(n); ai = int(a * SR); ri = int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri)
    return e

def dec(n, tau): return np.exp(-np.arange(n) / SR / tau)

def put(buf, sig, t, gain=1.0):
    i = int(t * SR); j = min(N, i + len(sig))
    if i >= N or j <= 0: return
    buf[max(0, i):j] += sig[max(0, -i): j - i] * gain

def fx(sig, t, gain=1.0, pan=0.0):
    put(fxL, sig, t, gain * (1 - max(0, pan))); put(fxR, sig, t, gain * (1 + min(0, pan)))

def shot_at(t):
    for s in tl["shots"]:
        if s["from"] <= t < s["to"]: return s["type"]
    return tl["shots"][-1]["type"]

def noise(d): return rng.normal(0, 1, int(d * SR))
def norm(x): return x / (np.abs(x).max() + 1e-9)


# ---------------- recorded/generated samples (ElevenLabs SFX), synth is the fallback ----------------
SAMPLES = tl.get("samples", {})
_cache = {}
def smp(name, trim=True):
    """48 kHz mono sample from timeline 'samples' (path relative to renderer/), peak-normalized."""
    p = SAMPLES.get(name)
    if not p: return None
    if p not in _cache:
        w = wave.open(os.path.join(RENDERER, p)); sr = w.getframerate(); ch = w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        if ch > 1: x = x.reshape(-1, ch).mean(1)
        if sr != SR: x = np.interp(np.arange(0, len(x), sr / SR), np.arange(len(x)), x)
        if trim:
            on = np.nonzero(np.abs(x) > 0.05 * np.abs(x).max())[0]
            if len(on): x = x[max(0, on[0] - int(0.005 * SR)):]
        _cache[p] = norm(x)
    return _cache[p]

def fit(x, d, fade=0.06):
    m = int(d * SR); y = x[:m] if len(x) >= m else np.concatenate([x, np.zeros(m - len(x))])
    return y * env(len(y), 0.005, min(fade, d / 3))

def loop(x, n, xf=0.4):
    k = int(xf * SR); out = np.zeros(n); pos = 0; ramp = np.linspace(0, 1, k)
    while pos < n:
        seg = x.copy(); seg[:k] *= ramp if pos else 1; seg[-k:] *= ramp[::-1]
        j = min(n, pos + len(seg)); out[pos:j] += seg[: j - pos]; pos += len(seg) - k
    return out

def vary(x, cents=60):   # small random pitch/speed change so repeated samples don't sound identical
    f = 2 ** (rng.uniform(-cents, cents) / 1200); return np.interp(np.arange(0, len(x), f), np.arange(len(x)), x)


# ---------------- ambience (room bus) ----------------
n_ = np.arange(N) / SR
brown = np.cumsum(rng.normal(0, 1, N)); brown -= np.convolve(brown, np.ones(4800) / 4800, "same"); brown = norm(brown)
mask_map = np.array([1.0 if shot_at(i / SR) == "map" else 0.0 for i in range(0, N, 480)]).repeat(480)[:N]
mask_map = np.convolve(mask_map, np.ones(4800) / 4800, "same")
if smp("ambience") is not None:
    room += loop(smp("ambience", trim=False), N) * 0.09 + norm(bandpass(brown, 25, 120)) * 0.03
elif KIND == "garage":
    room += norm(bandpass(brown, 25, 140)) * 0.10
    room += (np.sin(2 * np.pi * 120 * n_) + 0.4 * np.sin(2 * np.pi * 240 * n_)) * 0.004 * mask_map
    t = rng.uniform(0.8, 2.0)
    while t < DUR - 1:                                           # sparse water drips
        m = int(0.12 * SR); tt = np.arange(m) / SR; f0 = rng.uniform(1400, 2400)
        put(room, np.sin(2 * np.pi * f0 * tt * (1 - tt * 2)) * dec(m, 0.012), t, 0.03)
        t += rng.uniform(2.5, 5.0)
else:
    room += norm(bandpass(brown, 30, 400)) * 0.07
    room += (np.sin(2 * np.pi * 60 * n_) + 0.3 * np.sin(2 * np.pi * 120 * n_)) * 0.008 * mask_map

# ---------------- footsteps (room bus) ----------------
def footstep(weight):
    m = int(0.09 * SR); tt = np.arange(m) / SR
    thump = np.sin(2 * np.pi * rng.uniform(80, 110) * tt) * dec(m, 0.018)
    grit = bandpass(rng.normal(0, 1, m), 1500, 5000) * dec(m, 0.010) * 0.25
    return (thump + grit) * weight

roster = json.load(open(os.path.join(RENDERER, tl.get("scene", "../scene/motel.json")), encoding="utf-8")).get("roster", [])
weights = {r["id"]: (1.25 if r.get("kit") in ("radio", "shield") else 0.8 if r.get("kit") == "recon" else 1.0) for r in roster}
step_smp = {r["id"]: smp({"radio": "step_heavy", "shield": "step_heavy", "recon": "step_light"}.get(r.get("kit"), "step")) for r in roster}
def step_at(oid, t):
    s = step_smp.get(oid)
    if s is not None: put(room, fit(vary(s), 0.35) * weights.get(oid, 1.0), t, rng.uniform(0.10, 0.14))
    else: put(room, footstep(weights.get(oid, 1.0)), t, rng.uniform(0.09, 0.12))
for oid, tr in tl["operators"].items():
    keys = tr["keys"] if isinstance(tr, dict) else tr
    if not isinstance(tr, dict):            # sparse hand-written keys: steady cadence while moving
        for a, b in zip(keys, keys[1:]):
            if np.hypot(b[1] - a[1], b[2] - a[2]) < 20: continue
            t = a[0] + rng.uniform(0.05, 0.2)
            while t < b[0]: step_at(oid, t); t += rng.uniform(0.29, 0.34)
        continue
    acc = 0.0                                # a step every stride of distance, however long the segment between two keys is
    for a, b in zip(keys, keys[1:]):
        d = np.hypot(b[1] - a[1], b[2] - a[2]); dt = max(1e-3, b[0] - a[0]); v = d / dt
        if v < 15 or v > 900: acc = 0.0; continue          # standing still, or a cut / a trade of places: no footsteps
        stride = 40 + 0.11 * v; acc += d
        while acc >= stride: acc -= stride; step_at(oid, b[0] - acc / v + rng.uniform(-0.02, 0.02))

# ---------------- explicit cues ----------------
def creak(d):
    n = int(d * SR); out = np.zeros(n); t = 0.0
    while t < d:
        i = int(t * SR)
        if i < n: out[i] = 1 if rng.random() > 0.1 else -1
        t += 1 / (35 + 40 * np.sin(np.pi * t / d) + rng.normal(0, 6))
    out = sum(bandpass(out, f * 0.85, f * 1.15) * g for f, g in [(520, 1), (1150, 0.6), (2300, 0.25)])
    return norm(out) * env(n, 0.05, 0.25)

def click(gain=1.0):
    m = int(0.006 * SR); return bandpass(rng.normal(0, 1, m), 2000, 7000) * dec(m, 0.0015) * gain

def boom(d=1.2, f=45, tau=0.35):
    m = int(d * SR); tt = np.arange(m) / SR
    return np.sin(2 * np.pi * f * tt * (1 - tt * 0.15)) * dec(m, tau)

def scrape(d):
    n = int(d * SR); x = bandpass(rng.normal(0, 1, n), 200, 2000)
    gate = np.abs(np.convolve(rng.normal(0, 1, n), np.ones(240) / 240, "same"))      # grainy drag
    slow = np.abs(np.convolve(rng.normal(0, 1, n), np.ones(4000) / 4000, "same"))
    return norm(x * gate * norm(slow)) * env(n, 0.04, 0.1)

room_gate = np.ones(N); freezes = []; lapse_t = None
for c in cues:
    ty, t = c["type"], c.get("t", 0); g = c.get("gain", 1.0)
    s = smp(c["sample"]) if c.get("sample") else None
    if s is not None and ty in ("creak", "relocate", "door_push", "scrape", "hit"):   # generated sample replaces synth
        d = c.get("dur", len(s) / SR)
        lvl = {"creak": 0.30, "relocate": 0.32, "door_push": 0.5, "scrape": 0.45, "hit": 0.75}[ty]
        fx(fit(s, d, 0.15), t, lvl * g, c.get("pan", 0.0))
    elif ty == "creak":
        d = c.get("dur", 0.95); fx(click(0.6), t - 0.05, 1, 0.2); fx(creak(d), t, 0.28 * g, 0.2)
    elif ty == "relocate":
        m = int(0.5 * SR); fx(bandpass(rng.normal(0, 1, m), 200, 3000) * np.linspace(0, 1, m) ** 4, t - 0.5, 0.12)
        fx(boom(1.4, 48, 0.4), t, 0.55 * g)
    elif ty == "drone":
        m = N - int(t * SR)
        dr = norm(bandpass(rng.normal(0, 1, m), 40, 170)) * 0.6 + np.sin(2 * np.pi * 49 * np.arange(m) / SR) * 0.4
        put(drone_buf, dr * np.linspace(0.15, 1.0, m) ** 2, t, 0.10 * g)
    elif ty == "door_push":
        fx(click(0.7), t, 1, -0.5); fx(click(0.5), t + 0.07, 1, -0.5)
        m = int(0.5 * SR); fx(boom(0.5, 62, 0.08) + bandpass(rng.normal(0, 1, m), 60, 500) * dec(m, 0.05) * 0.5, t + 0.12, 0.45, -0.5)
    elif ty == "feed_cut":
        d = c.get("dur", 0.4); i0, i1 = int(t * SR), int((t + d) * SR); r = int(0.004 * SR)
        room_gate[i0:i1] = 0.03; room_gate[i0:i0 + r] = np.linspace(1, 0.03, r); room_gate[i1 - r:i1] = np.linspace(0.03, 1, r)
        fx(click(0.8), t, 1)
        put(vo, bandpass(noise(d), 3000, 8000) * 0.012, t)                             # dead-line hiss
    elif ty == "feed_back":
        fx(click(0.6), t, 1); fx(bandpass(noise(0.06), 1000, 6000) * env(int(0.06 * SR), 0.002, 0.04), t, 0.08)
    elif ty == "oneshot" and c.get("sample") == "holloway":                       # distant, broken radio
        s = smp("holloway")
        if s is not None:
            v = bandpass(s, 380, 2600); v = np.tanh(norm(v) * 3.0) / np.tanh(3.0)
            m = len(v) + int(0.6 * SR); hiss = bandpass(rng.normal(0, 1, m), 1500, 7000) * env(m, 0.05, 0.3) * 0.25
            chop = (np.convolve(rng.random(len(v)) > 0.12, np.ones(240) / 240, "same") > 0.5).astype(float)
            put(ui, hiss, t - 0.2, 0.35 * g); put(ui, v * chop, t, 0.45 * g)
    elif ty == "oneshot":
        s = smp(c["sample"]) if c.get("sample") else None
        lvl = {"gunfire": 0.9, "door_slam": 0.8, "door_burst": 0.45, "rattle": 0.5, "frost": 0.35, "door_latch": 0.45,
               "pack_drag": 0.45, "stamp": 0.6, "limb": 0.45, "beacon_chirp": 0.3, "glitch": 0.35,
               "shotgun": 0.95, "blast": 1.0, "mg": 0.85, "mg_shot": 0.8, "mg_tail": 0.8, "sniper": 0.9, "rifle": 0.75, "pistol": 0.6, "pistol_s": 0.5, "crossbow": 0.5, "axe": 0.5, "shield_hit": 0.7, "punch": 0.8, "door_pound": 0.75, "pulse": 0.28}.get(c.get("sample").rsplit("_", 1)[0] if c.get("sample", "").rsplit("_", 1)[-1] in ("a", "b", "c") else c.get("sample"), 0.5)
        if s is not None:
            if c.get("vary"): s = vary(s, c["vary"])
            if c.get("sample") in ("stamp", "beacon_chirp", "pulse"): put(ui, s, t, lvl * g)
            else: fx(s, t, lvl * g, c.get("pan", 0.0))
        elif c.get("sample") == "gunfire":
            for k in range(3): fx(click(1.0), t + k * 0.085, 1); fx(boom(0.3, 90, 0.04), t + k * 0.085, 0.6)
    elif ty == "held":                                                            # shoves against a held door, on the picture's beat
        s = smp(c["sample"]) if c.get("sample") else None
        k = 1
        while True:
            tt = c["from"] - c.get("phase", 0.3) + k * c.get("period", 1.15) + 0.05; k += 1
            if tt >= c["to"]: break
            hit_ = vary(s, 120) if s is not None else boom(0.4, 70, 0.06)
            fx(hit_, tt, rng.uniform(0.55, 0.75), c.get("pan", 0.0))
    elif ty == "freeze": freezes.append((c["from"], c["to"]))
    elif ty == "lapse_close":
        lapse_t = t
        s = smp(c["sample"]) if c.get("sample") else None
        fx(s if s is not None else boom(3.0, 32, 1.2), t - 0.05, 0.38)
    elif ty == "typing":
        tt = c["from"]
        while tt < c["to"]: put(ui, click(0.5), tt, rng.uniform(0.10, 0.18)); tt += rng.uniform(1 / 26, 1 / 14)
    elif ty == "scrape": fx(scrape(c.get("dur", 0.4)), t, 0.32 * g, rng.uniform(-0.3, 0.3))
    elif ty == "hit":
        m = int(0.25 * SR); fx(boom(1.6, 42, 0.5), t - 0.02, 0.7 * g); fx(bandpass(rng.normal(0, 1, m), 100, 2500) * dec(m, 0.04), t - 0.02, 0.35 * g)
    elif ty == "insert_bed":
        a, b = c["from"], c["to"]
        bed_s = smp("breath" if c["kind"] == "bodycam" else "fluoro", trim=False)
        if bed_s is not None:
            m = int((b - a) * SR); fx(loop(bed_s, m, 0.25) * env(m, 0.08, 0.15), a, 0.30 if c["kind"] == "bodycam" else 0.18)
            if c["kind"] == "bodycam":
                for k in range(int((b - a) / 0.75)):
                    for off, gg in ((0, 1.0), (0.16, 0.6)):
                        mm = int(0.12 * SR); fx(np.sin(2 * np.pi * 50 * np.arange(mm) / SR) * dec(mm, 0.03), a + 0.2 + k * 0.75 + off, 0.22 * gg)
        elif c["kind"] == "bodycam":
            t2 = a + 0.15
            while t2 < b - 0.3:
                for d, gg in ((0.55, 0.5), (0.7, 0.35)):
                    m = int(d * SR); fx(bandpass(rng.normal(0, 1, m), 300, 2200) * np.sin(np.linspace(0, np.pi, m)) ** 2, t2, gg * 0.30); t2 += d + 0.1
            for k in range(int((b - a) / 0.75)):                                        # lub-dub
                for off, gg in ((0, 1.0), (0.16, 0.6)):
                    m = int(0.12 * SR); fx(np.sin(2 * np.pi * 50 * np.arange(m) / SR) * dec(m, 0.03), a + 0.2 + k * 0.75 + off, 0.30 * gg)
        else:  # cctv: just the fluorescent tube and two relay ticks
            m = int((b - a) * SR); tt = np.arange(m) / SR
            fx((np.sin(2 * np.pi * 120 * tt) + 0.3 * np.sin(2 * np.pi * 240 * tt)) * env(m, 0.08, 0.1), a, 0.04)
            for k in range(2): fx(click(0.5), a + rng.uniform(0.3, b - a - 0.3), 1)

# ---------------- automatic cues ----------------
def blip():
    m = int(0.07 * SR); tt = np.arange(m) / SR; e = env(m, 0.004, 0.04)
    return np.concatenate([np.sin(2 * np.pi * 880 * tt) * e, np.zeros(int(0.03 * SR)), np.sin(2 * np.pi * 660 * tt) * e])
for w in tl.get("warn", []): fx(blip(), w["from"], 0.06)
for c0, w0 in tl.get("static", []):
    m = int(0.18 * SR); x = bandpass(rng.normal(0, 1, m), 1000, 8000) * np.sin(np.linspace(0, np.pi, m))
    fx(x, c0 - 0.09, 0.12 * min(1, w0 / 0.15))

# ---------------- radio voice (vo bus) ----------------
def load_wav(p):
    b = open(p, "rb").read(); i = b.find(b"data") + 8
    x = np.frombuffer(b[i:i + (len(b) - i) // 2 * 2], dtype=np.int16).astype(float) / 32768
    loud = np.nonzero(np.abs(x) > 0.025)[0]
    if len(loud): x = x[max(0, loud[0] - 600): loud[-1] + 2400]
    return np.interp(np.arange(0, len(x), 24000 / SR), np.arange(len(x)), x)
def squelch():
    s = smp("squelch")
    if s is not None: return fit(s, 0.25, 0.05) * 0.6
    m = int(0.05 * SR); return bandpass(rng.normal(0, 1, m), 1200, 4000) * env(m, 0.002, 0.02)
for s in tl.get("subtitles", []):
    if not s.get("vo"): continue
    # light radio: wider band keeps breath and whisper texture; level-match halfway between RMS and
    # peak so a whisper stays quieter than a shout; only a touch of saturation
    v = bandpass(load_wav(os.path.join(RENDERER, s["vo"])), 220, 5000)
    g_rms = 0.11 / (np.sqrt((v ** 2).mean()) + 1e-9); g_pk = 0.55 / (np.abs(v).max() + 1e-9)
    v = np.tanh(v * np.sqrt(g_rms * g_pk) * 1.2) / np.tanh(1.2)
    put(vo, squelch(), s["from"] - 0.04, 0.10); put(vo, v, s["from"] + 0.03, 0.9); put(vo, squelch(), s["from"] + 0.03 + len(v) / SR, 0.08)

# ---------------- drone dips, lapse closing, card shots ----------------
def ramp_gate(gate, a, b, lo, r=0.25):
    i0, i1, k = int(a * SR), min(N, int(b * SR)), int(r * SR)
    if i0 >= N: return
    gate[i0:i1] = np.minimum(gate[i0:i1], lo)
    if i0 - k > 0: gate[i0 - k:i0] = np.minimum(gate[i0 - k:i0], np.linspace(1, lo, k))
    if i1 + k < N: gate[i1:i1 + k] = np.minimum(gate[i1:i1 + k], np.linspace(lo, 1, k))
drone_gate = np.ones(N)
for a, b in freezes: ramp_gate(drone_gate, a, b, 0.25, 0.08)
if lapse_t is not None:
    ramp_gate(drone_gate, lapse_t, DUR + 1, 0.0, 0.3)
    out_s = smp("outside", trim=False)
    if out_s is not None:                          # the inside room tone gives way to night air
        i0 = int(lapse_t * SR); m = N - i0; xf = np.minimum(1, np.arange(m) / (2.0 * SR))
        room[i0:] *= 1 - xf; room[i0:] += loop(out_s, m) * xf * 0.10
for cd in tl.get("countdown", []):                 # last ten seconds of the site clock tick
    end = cd["start"] + cd["seconds"]
    for k in range(1, 11):
        m = int(0.045 * SR); tt = np.arange(m) / SR; f0 = 1320 if k <= 3 else 990
        put(ui, np.sin(2 * np.pi * f0 * tt) * env(m, 0.003, 0.03), end - k, 0.035)
card_gate = np.array([0.0 if shot_at(i / SR) in ("card", "black") else 1.0 for i in range(0, N, 480)]).repeat(480)[:N]
card_gate = np.convolve(card_gate, np.ones(2400) / 2400, "same")
room = (room + drone_buf * drone_gate) * card_gate

# ---------------- reverb (shared space for room + fx) ----------------
rt, wet = (0.35, 0.28) if KIND == "garage" else (0.12, 0.16)
m = int(rt * 5 * SR); ir = bandpass(rng.normal(0, 1, m), 120, 6000) * dec(m, rt); ir[: int(0.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
def conv(x): L = len(x) + len(ir); F = 1 << (L - 1).bit_length(); return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:len(x)]

# ---------------- master ----------------
vo_env = np.convolve(np.abs(vo), np.ones(2400) / 2400, "same"); vo_env = np.minimum(1, vo_env / (vo_env.max() * 0.15 + 1e-9))
vo_env = np.convolve(vo_env, np.ones(9600) / 9600, "same")
duck = 1 - 0.55 * vo_env                                                   # ~ -7 dB under dialogue
roomg = room * room_gate
L = (roomg + fxL + conv(roomg * 0.6 + fxL) * wet) * duck + vo + ui
R = (roomg + fxR + conv(roomg * 0.6 + fxR) * wet) * duck + vo + ui
fade = int(0.25 * SR); L[-fade:] *= np.linspace(1, 0, fade); R[-fade:] *= np.linspace(1, 0, fade)
peak = np.percentile(np.abs(np.concatenate([L, R])), 99.97)   # transients (gunfire, slams) ride the soft clip instead of setting the level
L, R = np.tanh(L / peak * 1.1) * 0.97, np.tanh(R / peak * 1.1) * 0.97   # tanh tops out at 1, so nothing can pass 0.97 and wrap around in int16
pcm = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", sys.argv[2], round(N / SR, 2), "s,", len(cues), "explicit cues")
