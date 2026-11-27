r"""Renders the whole of FILE 001 from its parts and joins them with hard cuts.
   python tools/render_episode.py                 -> episodes/file_001_deathrow/FILE001_DEATH_ROW_full_v<next>.mp4
   python tools/render_episode.py act4 act5       -> only those parts, joined (for checking a stretch)
Each part is a timeline: the cards come from build_cards.mjs, the acts from build_<act>.mjs. Every builder runs its own checks first
and the render stops if one fails. Frame images, the silent videos, the part videos and older versions of the full film are removed."""
import subprocess, sys, os, re, glob, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); R = os.path.join(ROOT, "renderer"); EP = os.path.join(ROOT, "episodes", "file_001_deathrow")
PARTS = [("card", "build_cards.mjs"), ("act1", "build_act1.mjs"), ("act2", "build_act2.mjs"), ("act3", "build_act3.mjs"), ("act4", "build_act4.mjs"), ("act5", "build_act5.mjs"), ("replay", None), ("report", None)]
want = [a for a in sys.argv[1:] if not a.startswith("--")]; parts = [p for p in PARTS if not want or p[0] in want]
def run(cmd, cwd=ROOT):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode: sys.exit(f"FAILED: {' '.join(map(str, cmd))}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
    return r.stdout
ff = run(["node", "-e", "console.log(require('ffmpeg-static'))"], R).strip(); segs = []
for name, builder in parts:
    if not builder: continue
    for attempt in range(5):                     # writing the timeline file sometimes fails on this machine for no reason: try again
        r = subprocess.run(["node", f"episodes/file_001_deathrow/{builder}"], cwd=ROOT, capture_output=True, text=True)
        if r.returncode == 0 or "FAIL" in r.stdout: break
        time.sleep(2)
    if r.returncode: sys.exit("FAILED: " + builder + "\n" + r.stdout[-2000:] + "\n" + r.stderr[-2000:])
    print(name, "::", r.stdout.strip().splitlines()[-1], flush=True)
for name, _ in parts:
    silent = os.path.join(ROOT, "renders", f"{name}_silent.mp4"); wav = os.path.join(ROOT, "renders", f"mix_{name}.wav"); seg = os.path.join(ROOT, "renders", f"seg_{name}.mp4")
    run(["node", "src/animate.ts", "S3", f"../episodes/file_001_deathrow/timeline_{name}.json", silent], R)
    run([sys.executable, "tools/sound_design.py", f"episodes/file_001_deathrow/timeline_{name}.json", wav])
    run([ff, "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "18", "-r", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", seg])
    os.remove(silent); segs.append(seg); print("part done:", name, flush=True)
    for f in glob.glob(os.path.join(ROOT, "renders", "frames", "*.png")): os.remove(f)
series = "FILE001_DEATH_ROW_full_v" if not want else "FILE001_DEATH_ROW_part_v"
old = sorted(glob.glob(os.path.join(EP, series + "*.mp4")), key=lambda p: int(re.search(r"_v(\d+)", p).group(1)))
n = (int(re.search(r"_v(\d+)", old[-1]).group(1)) + 1) if old else 1; out = os.path.join(EP, f"{series}{n}.mp4")
inputs = sum((["-i", s] for s in segs), []); filt = "".join(f"[{i}:v][{i}:a]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=1:a=1[v][a]"
run([ff, "-y", *inputs, "-filter_complex", filt, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "25", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", out])
for s in segs: os.remove(s)
for p in old: os.remove(p); print("removed", os.path.basename(p))
print("rendered", out)
