"""Renders a library test scene with sound, plus an optional board of chosen frames.
   python tools/render_demo.py <name> <out.mp4> [frames "40,88,..."] [crop "x0,y0,x1,y1"] [cols]
   <name>: library/build_<name>_demo.mjs writes library/timeline_<name>_demo.json."""
import subprocess, sys, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); R = os.path.join(ROOT, "renderer")
name, out = sys.argv[1], sys.argv[2]
frames = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 and sys.argv[3] else []
crop = tuple(int(x) for x in sys.argv[4].split(",")) if len(sys.argv) > 4 else (0, 0, 1920, 1080); cols = int(sys.argv[5]) if len(sys.argv) > 5 else 2
tl = f"../library/timeline_{name}_demo.json"; silent = os.path.join(ROOT, "renders", f"{name}_silent.mp4"); wav = os.path.join(ROOT, "renders", f"mix_{name}_demo.wav")
run = lambda cmd, cwd=ROOT: subprocess.run(cmd, cwd=cwd, check=True, capture_output=True, text=True)
run(["node", f"library/build_{name}_demo.mjs"])
run(["node", "src/animate.ts", "S3", tl, silent], R)
run([sys.executable, "tools/sound_design.py", f"library/timeline_{name}_demo.json", wav])
ff = run(["node", "-e", "console.log(require('ffmpeg-static'))"], R).stdout.strip()
run([ff, "-y", "-i", silent, "-i", wav, "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", os.path.join(ROOT, out)]); os.remove(silent)
if frames:
    run(["node", "src/animate.ts", "S3", tl, "x", "--frames", ",".join(map(str, frames)), "--prefix", name], R)
    w, h = crop[2] - crop[0], crop[3] - crop[1]; rows = (len(frames) + cols - 1) // cols; W = Image.new("RGB", (cols * w, rows * h))
    for i, f in enumerate(frames): W.paste(Image.open(os.path.join(ROOT, "renders", "frames", f"{name}_{f:04d}.png")).convert("RGB").crop(crop), ((i % cols) * w, (i // cols) * h))
    W.save(os.path.join(ROOT, "library", "tests", f"board_{name}_demo.jpg"), quality=88)
print("rendered", out)
