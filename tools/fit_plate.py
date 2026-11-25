"""Fit an AI plate back onto its floor plan (AI output drifts ~1-3% in scale/offset).

Usage: python tools/fit_plate.py <plate.png> <scene.json>
Finds the outer wall box in the plate (bright cyan wall faces) and in the plan, and prints the
"fit" block for the timeline's "plates": {"sx", "sy", "dx", "dy"}: plan = plate * s + d.
"""
import json, sys
import numpy as np
from PIL import Image

plate, scene = sys.argv[1], json.load(open(sys.argv[2], encoding="utf-8"))
a = np.asarray(Image.open(plate).convert("RGB")).astype(int)
m = (a[:, :, 2] > 150) & (a[:, :, 1] > 140) & (a[:, :, 0] < 190)
cols, rows = m.sum(0), m.sum(1)
xs = np.nonzero(cols > 0.35 * m.shape[0])[0]; ys = np.nonzero(rows > 0.35 * m.shape[1])[0]
px0, px1, py0, py1 = xs.min(), xs.max(), ys.min(), ys.max()

t = scene.get("wall", 16)
segs = scene["walls"]
X = [v for s in segs for v in (s[0], s[2])]; Y = [v for s in segs for v in (s[1], s[3])]
qx0, qx1, qy0, qy1 = min(X) - t / 2, max(X) + t / 2, min(Y) - t / 2, max(Y) + t / 2

sx = (qx1 - qx0) / (px1 - px0); sy = (qy1 - qy0) / (py1 - py0)
fit = {"sx": round(sx, 4), "sy": round(sy, 4), "dx": round(qx0 - px0 * sx, 1), "dy": round(qy0 - py0 * sy, 1)}
print(json.dumps({"plate_box": [int(px0), int(px1), int(py0), int(py1)], "plan_box": [qx0, qx1, qy0, qy1], "fit": fit}))
