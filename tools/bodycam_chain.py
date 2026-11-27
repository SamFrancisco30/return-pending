r"""A run of helmet-camera clips that follow one another without a jump: each clip starts from the last frame of the one before.
   python tools/bodycam_chain.py <jobs.json>
jobs: {"dir": "episodes/.../bodycam", "model": "seedance-2.0-fast", "secs": 4, "chains": [{"start": "<still.png>", "clips": [{"name": "a2_watch1", "prompt": "..."}, ...]}]}
Chains run side by side; inside a chain the clips are made in order. A clip whose file already exists is kept (delete it to remake it
and everything after it in its chain). The frame handed on is saved beside the clip as <name>_last.png."""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); J = json.load(open(sys.argv[1], encoding="utf8")); D = os.path.join(ROOT, J["dir"]); os.makedirs(D, exist_ok=True)
ff = subprocess.run(["node", "-e", "console.log(require('ffmpeg-static'))"], capture_output=True, text=True, cwd=os.path.join(ROOT, "renderer")).stdout.strip()
def chain(c):
    img = os.path.join(ROOT, c["start"]); remake = False
    for clip in c["clips"]:
        out = os.path.join(D, clip["name"] + ".mp4"); last = os.path.join(D, clip["name"] + "_last.png")
        if remake or not os.path.exists(out):
            remake = True
            r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "apimart_video.py"), img, out, J.get("model", "seedance-2.0-fast"), str(clip.get("secs", J.get("secs", 4))), clip["prompt"]], capture_output=True, text=True)
            print(clip["name"], (r.stdout.strip().splitlines() or [r.stderr[-300:]])[-1][:160], flush=True)
            if not os.path.exists(out): return
        subprocess.run([ff, "-y", "-loglevel", "error", "-sseof", "-0.12", "-i", out, "-frames:v", "1", "-update", "1", last], check=True)
        img = last
with ThreadPoolExecutor(max_workers=3) as ex: list(ex.map(chain, J["chains"]))
