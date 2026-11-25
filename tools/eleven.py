"""ElevenLabs helpers: voices list, TTS (eleven_v3 with audio tags), sound effects.

Key: env ELEVENLABS_API_KEY, falling back to the Windows user environment (HKCU\\Environment)
so a key set after this shell started still works. The key is never printed.

  python tools/eleven.py voices
  python tools/eleven.py tts <voice_id> <out.wav> "<text with [tags]>" [stability 0|0.5|1]
  python tools/eleven.py sfx <out.wav> <seconds> "<description>" [prompt_influence]
TTS output: 24 kHz mono 16-bit WAV (same as the rest of the pipeline). SFX output: 48 kHz WAV.
"""
import json, os, struct, subprocess, sys, time, urllib.request, urllib.error

API = "https://api.elevenlabs.io/v1"


def key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k and os.name == "nt":
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
            k = winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0]
    if not k: sys.exit("ELEVENLABS_API_KEY not found")
    return k


def call(path, body=None, query=""):
    req = urllib.request.Request(API + path + query, method="POST" if body is not None else "GET",
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read()[:500].decode(errors='replace')}")


def wav_from_pcm(pcm, sr, out):
    hdr = b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16) + b"data" + struct.pack("<I", len(pcm))
    open(out, "wb").write(hdr + pcm)


def log(rec):
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(root, "concepts", "log.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


cmd = sys.argv[1]
if cmd == "voices":
    d = json.loads(call("/voices")[0])
    for v in d.get("voices", []):
        L = v.get("labels") or {}
        print(f'{v["voice_id"]} | {v["name"]} | {L.get("gender","")} {L.get("age","")} {L.get("accent","")} | {L.get("description","") or L.get("descriptive","")} | {L.get("use_case","")} | {v.get("category","")}')
elif cmd == "tts":
    vid, out, text = sys.argv[2], sys.argv[3], sys.argv[4]
    stab = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
    t0 = time.time()
    audio, hdr = call(f"/text-to-speech/{vid}", {"text": text, "model_id": "eleven_v3", "voice_settings": {"stability": stab}}, "?output_format=pcm_24000")
    wav_from_pcm(audio, 24000, out)
    rec = {"name": os.path.basename(out), "model": "eleven_v3", "voice": vid, "text": text, "stability": stab,
           "chars": len(text), "credits": hdr.get("character-cost") or hdr.get("Character-Cost"), "secs": round(time.time() - t0, 1)}
    log(rec); print(json.dumps(rec, ensure_ascii=False))
elif cmd == "sfx":
    out, dur, text = sys.argv[2], float(sys.argv[3]), sys.argv[4]
    infl = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
    t0 = time.time()
    audio, hdr = call("/sound-generation", {"text": text, "duration_seconds": dur, "prompt_influence": infl}, "?output_format=mp3_44100_128")
    tmp = out + ".mp3"; open(tmp, "wb").write(audio)
    ff = subprocess.run(["node", "-e", "console.log(require('ffmpeg-static'))"], capture_output=True, text=True,
                        cwd=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "renderer")).stdout.strip()
    subprocess.run([ff, "-loglevel", "error", "-y", "-i", tmp, "-ar", "48000", "-ac", "1", out], check=True); os.remove(tmp)
    rec = {"name": os.path.basename(out), "model": "eleven_sfx", "text": text, "duration": dur, "credits": hdr.get("character-cost") or hdr.get("Character-Cost"), "secs": round(time.time() - t0, 1)}
    log(rec); print(json.dumps(rec, ensure_ascii=False))
