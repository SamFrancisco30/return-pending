r"""Sound candidates for the ear: generates the A/B/C takes listed in a jobs file with ElevenLabs sound effects, then builds one
audition video where each take is played under a card that names it, so a choice can be made by listening.
   python tools/sfx_candidates.py tools/jobs_sfx_round1.json            generate what is missing, then build the audition
   python tools/sfx_candidates.py tools/jobs_sfx_round1.json --video    only rebuild the audition from the files already there
jobs: {"out": "audio/sfx/f001/cand", "video": "episodes/.../AUDITION_x.mp4", "items": [{"key", "title", "where", "secs", "play"?, "takes": {"a": prompt, ...}}]}
Takes land at <out>/<key>_<letter>.wav. Nothing already generated is generated again."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); J = json.load(open(sys.argv[1], encoding="utf8"))
OUT = os.path.join(ROOT, J["out"]); os.makedirs(OUT, exist_ok=True)
if "--video" not in sys.argv:
    for it in J["items"]:
        for k, prompt in it["takes"].items():
            dest = os.path.join(OUT, f"{it['key']}_{k}.wav")
            if os.path.exists(dest): continue
            r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "eleven.py"), "sfx", dest, str(it["secs"]), prompt, "0.55"], capture_output=True, text=True)
            print(it["key"], k, "ok" if r.returncode == 0 else "FAILED " + (r.stdout + r.stderr)[-300:], flush=True)
ff = subprocess.run(["node", "-e", "console.log(require('ffmpeg-static'))"], capture_output=True, text=True, cwd=os.path.join(ROOT, "renderer")).stdout.strip()
tmp = os.path.join(ROOT, "renders", "_audition"); os.makedirs(tmp, exist_ok=True)
F = lambda s, b=False: ImageFont.truetype("C:/Windows/Fonts/consolab.ttf" if b else "C:/Windows/Fonts/consola.ttf", s)
segs = []
for n, it in enumerate(J["items"], 1):
    for k in it["takes"]:
        wav = os.path.join(OUT, f"{it['key']}_{k}.wav")
        if not os.path.exists(wav): continue
        im = Image.new("RGB", (1280, 720), (5, 9, 12)); d = ImageDraw.Draw(im)
        d.text((90, 110), f"SOUND AUDITION  {n:02d} / {len(J['items']):02d}", font=F(26), fill=(150, 180, 186))
        d.text((90, 170), it["title"], font=F(64, True), fill=(214, 234, 238))
        d.text((90, 262), it["where"], font=F(26), fill=(150, 180, 186))
        for i, q in enumerate(it["takes"]):
            x = 90 + i * 230; on = q == k
            d.rectangle([x, 400, x + 190, 590], outline=(255, 193, 90) if on else (70, 90, 96), width=6 if on else 2, fill=(40, 30, 8) if on else None)
            d.text((x + 62, 430), q.upper(), font=F(120, True), fill=(255, 193, 90) if on else (70, 90, 96))
        png = os.path.join(tmp, f"{n:02d}_{k}.png"); im.save(png); seg = os.path.join(tmp, f"{n:02d}_{k}.mp4"); play = it.get("play", it["secs"])
        subprocess.run([ff, "-y", "-loglevel", "error", "-loop", "1", "-i", png, "-i", wav, "-filter_complex", f"[1:a]atrim=0:{play},loudnorm=I=-18:TP=-2,adelay=400:all=1,apad=pad_dur=0.7[a]",
                        "-map", "0:v", "-map", "[a]", "-t", str(play + 1.1), "-r", "30", "-c:v", "libx264", "-crf", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", seg], check=True)
        segs.append(seg)
lst = os.path.join(tmp, "list.txt"); open(lst, "w").write("".join(f"file '{s.replace(os.sep, '/')}'\n" for s in segs))
video = os.path.join(ROOT, J["video"]); subprocess.run([ff, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video], check=True)
for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
os.rmdir(tmp); print("audition:", video, len(segs), "takes")
