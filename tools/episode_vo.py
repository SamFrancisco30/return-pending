"""Voice a whole episode with ElevenLabs v3: takes per line, ranked, best one placed for the compiler.

Usage: python tools/episode_vo.py episodes/file_001 [takes=2] [stability=0.0] [--only 12,33] [--retake]

Reads   <ep>/episode.json (dialogue: t, who, line) + <ep>/vo_direction.json (tagged text per line)
Writes  <ep>/vo/takes/NN_WHO_tK.wav (raw), .tight.wav (dead air trimmed)
        <ep>/vo/NN_WHO.wav  = best take (24 kHz mono), picked up by compile_timeline.ts
        <ep>/vo/takes.json  = every take with its score
Window per line = time to the next line - 0.25 s. Score = expressiveness (pitch SD + 0.5 loudness SD)
minus 4 per second over the window. --retake adds one more take for lines whose best take overruns.
"""
import json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
EP = os.path.join(ROOT, args[0]) if not os.path.isabs(args[0]) else args[0]
K = int(args[1]) if len(args) > 1 else 2
STAB = args[2] if len(args) > 2 else "0.0"
ONLY = None
if "--only" in sys.argv: ONLY = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")}
RETAKE = "--retake" in sys.argv

# voice_takes.py runs its own CLI at import; pull just the helpers out of it
src = open(os.path.join(ROOT, "tools", "voice_takes.py"), encoding="utf-8").read()
helpers = src[src.index("def load("):src.index("ranking = {}")]
ns = {}; exec("import numpy as np\n" + helpers, ns)
load, tighten, save, stats = ns["load"], ns["tighten"], ns["save"], ns["stats"]

ep = json.load(open(os.path.join(EP, "episode.json"), encoding="utf-8"))
dr = json.load(open(os.path.join(EP, "vo_direction.json"), encoding="utf-8"))
dlg = ep["dialogue"]
assert len(dr["lines"]) == len(dlg), f"direction has {len(dr['lines'])} lines, script has {len(dlg)}"

strip = lambda s: re.sub(r"\s+", " ", re.sub(r"\[[^\]]*\]", "", s)).strip()
sec = lambda t: int(t.split(":")[0]) * 60 + float(t.split(":")[1])
bad = [(i + 1, strip(d["line"]), strip(x)) for i, (d, x) in enumerate(zip(dlg, dr["lines"])) if strip(d["line"]) != strip(x)]
if bad:
    for b in bad: print("WORDS DIFFER line", b[0], "\n  script:", b[1], "\n  direct:", b[2])
    sys.exit(1)

TK = os.path.join(EP, "vo", "takes"); os.makedirs(TK, exist_ok=True)
lines = []
for i, (d, text) in enumerate(zip(dlg, dr["lines"])):
    nxt = sec(dlg[i + 1]["t"]) if i + 1 < len(dlg) else ep.get("duration", 240)
    say = text
    for k, v in dr.get("say", {}).items(): say = say.replace(k, v)
    lines.append({"n": i + 1, "who": d["who"], "t": d["t"], "window": round(nxt - sec(d["t"]) - 0.25, 2), "say": say, "sub": strip(d["line"])})


def take(job):
    ln, k = job
    out = os.path.join(TK, f'{ln["n"]:02d}_{ln["who"]}_t{k}.wav')
    if not os.path.exists(out):
        r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "eleven.py"), "tts", dr["voices"][ln["who"]], out, ln["say"], STAB],
                           capture_output=True, text=True)
        if r.returncode: return ln["n"], k, None, r.stderr.strip()[-200:] or r.stdout.strip()[-200:]
    tight = out.replace(".wav", ".tight.wav")
    save(tighten(load(out)), tight)
    s = stats(load(tight))
    if not s: return ln["n"], k, None, "silent"
    s["score"] = round(s["pitch_sd"] + 0.5 * s["loud_sd"] - 4 * max(0, s["dur"] - ln["window"]), 2)
    return ln["n"], k, {"file": os.path.relpath(tight, EP).replace("\\", "/"), **s}, None


def run(jobs):
    with ThreadPoolExecutor(2) as ex: return list(ex.map(take, jobs))


todo = [l for l in lines if ONLY is None or l["n"] in ONLY]
book_path = os.path.join(EP, "vo", "takes.json")
book = json.load(open(book_path, encoding="utf-8")) if os.path.exists(book_path) else {}
results = run([(l, k) for l in todo for k in range(K)])
if RETAKE:
    over = []
    for l in todo:
        best = max((r[2] for r in results if r[0] == l["n"] and r[2]), key=lambda s: s["score"], default=None)
        if best is None or best["dur"] > l["window"]: over.append(l)
    if over: print("retake:", [l["n"] for l in over]); results += run([(l, K) for l in over])
errors = [r for r in results if r[3]]
for e in errors: print("FAILED line", e[0], "take", e[1], ":", e[3])

for l in todo:
    takes = sorted([r[2] for r in results if r[0] == l["n"] and r[2]], key=lambda s: -s["score"])
    if not takes: continue
    book[str(l["n"])] = {"who": l["who"], "t": l["t"], "window": l["window"], "subtitle": l["sub"], "takes": takes}
    x = load(os.path.join(EP, takes[0]["file"])); loud = (abs(x) > 0.025).nonzero()[0]     # speech starts on the cue
    if len(loud): x = x[max(0, loud[0] - 960): loud[-1] + 3600]
    save(x, os.path.join(EP, "vo", f'{l["n"]:02d}_{l["who"]}.wav'))
    flag = "  OVER" if takes[0]["dur"] > l["window"] else ""
    print(f'{l["n"]:02d} {l["t"]:>5} {l["who"]:9s} {takes[0]["dur"]:5.2f}s / {l["window"]:5.2f}  score {takes[0]["score"]:5.2f}{flag}  {l["sub"][:60]}')
json.dump(dict(sorted(book.items(), key=lambda kv: int(kv[0]))), open(book_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
sys.exit(1 if errors else 0)
