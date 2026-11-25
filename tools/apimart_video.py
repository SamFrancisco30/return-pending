"""APIMart image-to-video: upload a local first frame, submit, poll, download.

Usage: python tools/apimart_video.py <image> <out.mp4> <model> <duration> "<prompt>"
Key from env APIMART-KEY / APIMART_API_KEY. Appends a record to concepts/log.jsonl.
"""
import json, os, sys, time, uuid, urllib.request, urllib.error

BASE = "https://api.apimart.ai/v1"
KEY = os.environ.get("APIMART-KEY") or os.environ.get("APIMART_API_KEY")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def call(req):
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode(errors="replace")[:800]}


def upload(path):
    b = uuid.uuid4().hex
    data = open(path, "rb").read()
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{os.path.basename(path)}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + data + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request(BASE + "/uploads/images?retention_days=3", data=body, method="POST", headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": f"multipart/form-data; boundary={b}"})
    return call(req)


def main():
    img, out, model, dur, prompt = sys.argv[1:6]
    t0 = time.time()
    up = upload(img)
    if "url" not in up:
        sys.exit(f"upload failed: {up}")
    body = {"model": model, "prompt": prompt, "image_urls": [up["url"]], "duration": int(dur),
            "resolution": "720p", "size": "16:9", "generate_audio": False}
    req = urllib.request.Request(BASE + "/videos/generations", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    sub = call(req)
    try:
        tid = sub["data"][0]["task_id"]
    except Exception:
        sys.exit(f"submit failed: {sub}")
    print("task", tid, flush=True)
    d = {}
    for _ in range(240):
        time.sleep(5)
        r = call(urllib.request.Request(f"{BASE}/tasks/{tid}?language=en", headers={"Authorization": f"Bearer {KEY}"}))
        d = r.get("data", r)
        if d.get("status") in ("completed", "success", "failed", "cancelled"):
            break
    rec = {"name": os.path.basename(out), "model": model, "duration": dur, "status": d.get("status"),
           "cost": d.get("cost"), "secs": round(time.time() - t0, 1), "prompt": prompt, "first_frame": img}
    if d.get("status") in ("completed", "success"):
        url = d["result"]["videos"][0]["url"]
        url = url[0] if isinstance(url, list) else url
        with urllib.request.urlopen(url, timeout=300) as r, open(out, "wb") as f:
            f.write(r.read())
        rec["file"] = os.path.relpath(out, ROOT)
    else:
        rec["raw"] = d
    with open(os.path.join(ROOT, "concepts", "log.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(json.dumps({k: rec.get(k) for k in ("status", "cost", "secs", "file")} | ({"raw": rec.get("raw")} if "raw" in rec else {})))


if __name__ == "__main__":
    main()
