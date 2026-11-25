"""APIMart TTS (gpt-4o-mini-tts).

Usage: python tools/tts.py <voice> <speed> <out.wav> "<text>" ["<delivery instructions>"]
The optional instructions describe the performance (emotion, pace, breath), e.g.
"Hushed, scared field operator on a radio, breathing hard, words clipped".
"""
import json, os, sys, time, urllib.request

KEY = os.environ.get("APIMART-KEY") or os.environ.get("APIMART_API_KEY")
voice, speed, out, text = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
instr = sys.argv[5] if len(sys.argv) > 5 else None
body = {"model": "gpt-4o-mini-tts", "input": text, "voice": voice, "response_format": "wav", "speed": speed}
if instr: body["instructions"] = instr
t0 = time.time()
req = urllib.request.Request("https://api.apimart.ai/v1/audio/speech", method="POST", data=json.dumps(body).encode(),
                             headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=120) as r:
    data = r.read()
open(out, "wb").write(data)
print(json.dumps({"out": out, "bytes": len(data), "secs": round(time.time() - t0, 1), "instructions": bool(instr)}))
