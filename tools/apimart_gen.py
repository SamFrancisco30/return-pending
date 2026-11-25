"""APIMart image generation runner.

Reads the key from env var APIMART-KEY (or APIMART_API_KEY). Never prints it.
Usage:  python tools/apimart_gen.py jobs.json
jobs.json: [{"name": "...", "model": "...", "prompt": "...", "size": "16:9",
             "resolution": "2k", "refs": ["refs/x.webp"], "extra": {...}}]
Outputs go to concepts/<name>.<ext>; a log line per job is appended to concepts/log.jsonl.
"""
import base64, json, mimetypes, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

BASE = "https://api.apimart.ai/v1"
KEY = os.environ.get("APIMART-KEY") or os.environ.get("APIMART_API_KEY")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "concepts")
mimetypes.add_type("image/webp", ".webp")


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode(errors="replace")[:800]}


def data_uri(path):
    p = path if os.path.isabs(path) else os.path.join(ROOT, path)
    mime = mimetypes.guess_type(p)[0] or "image/png"
    return f"data:{mime};base64," + base64.b64encode(open(p, "rb").read()).decode()


def run(job):
    t0 = time.time()
    body = {"model": job["model"], "prompt": job["prompt"], "n": 1,
            "size": job.get("size", "16:9")}
    if job.get("resolution"):
        body["resolution"] = job["resolution"]
    if job.get("refs"):
        body["image_urls"] = [data_uri(p) for p in job["refs"]]
    body.update(job.get("extra", {}))
    sub = req("POST", "/images/generations", body)
    rec = {"name": job["name"], "model": job["model"], "size": body["size"],
           "resolution": body.get("resolution"), "refs": job.get("refs", []),
           "prompt": job["prompt"]}
    try:
        task_id = sub["data"][0]["task_id"]
    except Exception:
        rec.update(status="submit_failed", response=sub, secs=round(time.time() - t0, 1))
        return rec
    task = {}
    for _ in range(120):  # up to ~10 min
        time.sleep(5)
        task = req("GET", f"/tasks/{task_id}?language=en")
        d = task.get("data", task)
        st = d.get("status")
        if st in ("completed", "success", "failed", "cancelled"):
            break
    d = task.get("data", task)
    rec.update(task_id=task_id, status=d.get("status"), cost=d.get("cost"),
               credits_cost=d.get("credits_cost"), secs=round(time.time() - t0, 1))
    if d.get("status") in ("completed", "success"):
        try:
            url = d["result"]["images"][0]["url"]
            url = url[0] if isinstance(url, list) else url
            ext = os.path.splitext(url.split("?")[0])[1] or ".png"
            dest = os.path.join(OUT, job["name"] + ext)
            with urllib.request.urlopen(url, timeout=120) as r, open(dest, "wb") as f:
                f.write(r.read())
            rec["file"] = os.path.relpath(dest, ROOT)
        except Exception as e:
            rec["download_error"] = repr(e)
            rec["raw"] = d
    else:
        rec["raw"] = d
    return rec


def main():
    if not KEY:
        sys.exit("APIMART key env var not found")
    os.makedirs(OUT, exist_ok=True)
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    with ThreadPoolExecutor(max_workers=6) as ex:
        for rec in ex.map(run, jobs):
            with open(os.path.join(OUT, "log.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            short = {k: rec.get(k) for k in ("name", "model", "status", "cost", "credits_cost", "secs", "file")}
            if rec.get("status") not in ("completed", "success"):
                short["err"] = json.dumps(rec.get("response") or rec.get("raw"), ensure_ascii=False)[:400]
            print(json.dumps(short, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
