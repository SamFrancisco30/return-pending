r"""Renders one act's preview with sound, and tidies up after itself.
   python tools/render_act.py act4            builds, renders FILE001_ACT4_preview_v<next>.mp4, then deletes the older versions of it
   python tools/render_act.py act4 --review 1.5   no video: a sheet of frames every 1.5 s at renders/review_act4.jpg (to look at before rendering)
   python tools/render_act.py act4 --review 0.5 --span 10,16 --crop 2     the same for part of it, cropped 2x about the camera centre
The frame images and the silent video are always removed; so are older versions of the same preview (the newest is kept)."""
import subprocess, sys, os, re, glob, json
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); R = os.path.join(ROOT, "renderer"); EP = os.path.join(ROOT, "episodes", "file_001_deathrow")
act = sys.argv[1]; arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
tl = os.path.join(EP, f"timeline_{act}.json"); rel = f"../episodes/file_001_deathrow/timeline_{act}.json"
def run(cmd, cwd=ROOT):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode: sys.exit(f"FAILED: {' '.join(map(str, cmd))}\n{r.stdout[-1500:]}\n{r.stderr[-1500:]}")
    return r.stdout
def clear_frames():
    for f in glob.glob(os.path.join(ROOT, "renders", "frames", "*.png")): os.remove(f)
print(run(["node", f"episodes/file_001_deathrow/build_{act}.mjs"]).strip().splitlines()[-1])
dur = json.load(open(tl, encoding="utf8"))["duration"]
if "--review" in sys.argv:
    step = float(arg("--review")); a, b = map(float, arg("--span", f"0,{dur}").split(",")); z = float(arg("--crop", "1")); cols = int(arg("--cols", "4"))
    fr = []; t = a
    while t < b - 1e-6: fr.append(int(round(t * 30))); t += step
    clear_frames(); run(["node", "src/animate.ts", "S3", rel, "x", "--frames", ",".join(map(str, fr)), "--prefix", "rv"], R)
    w, h = (640, 360) if z == 1 else (760, 428); rows = (len(fr) + cols - 1) // cols; W = Image.new("RGB", (cols * w, rows * h))
    for i, f in enumerate(fr):
        im = Image.open(os.path.join(ROOT, "renders", "frames", f"rv_{f:04d}.png")).convert("RGB")
        if z != 1: cw, ch = 1920 / z, 1080 / z; im = im.crop((int(960 - cw / 2), int(540 - ch / 2), int(960 + cw / 2), int(540 + ch / 2)))
        W.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
    out = os.path.join(ROOT, "renders", f"review_{act}.jpg"); W.save(out, quality=86); clear_frames(); print("review sheet:", out, "frames at", [round(f / 30, 2) for f in fr]); sys.exit()
series = f"FILE001_{act.upper()}_preview_v"; old = sorted(glob.glob(os.path.join(EP, series + "*.mp4")), key=lambda p: int(re.search(r"_v(\d+)", p).group(1)))
n = int(arg("--version", (int(re.search(r"_v(\d+)", old[-1]).group(1)) + 1) if old else 1)); out = os.path.join(EP, f"{series}{n}.mp4")
silent = os.path.join(ROOT, "renders", f"{act}_silent.mp4"); wav = os.path.join(ROOT, "renders", f"mix_{act}.wav")
run(["node", "src/animate.ts", "S3", rel, silent], R)
run([sys.executable, "tools/sound_design.py", f"episodes/file_001_deathrow/timeline_{act}.json", wav])
ff = run(["node", "-e", "console.log(require('ffmpeg-static'))"], R).strip()
run([ff, "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", out])
os.remove(silent); clear_frames()
for p in old:
    if os.path.abspath(p) != os.path.abspath(out): os.remove(p); print("removed", os.path.basename(p))
print("rendered", out)
