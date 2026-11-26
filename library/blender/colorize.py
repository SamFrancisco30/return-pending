"""Turns the data sprites from render_sprites.py into pictures: cold (squad) or hot (anomaly) thermal.
   python library/blender/colorize.py <in_dir> <out_dir> cold|hot [#idcolor]"""
import sys, os, glob, numpy as np
from PIL import Image, ImageFilter
src, dst, mode = sys.argv[1], sys.argv[2], sys.argv[3]
idc = np.array([int(sys.argv[4][i:i + 2], 16) for i in (1, 3, 5)], float) / 255 if len(sys.argv) > 4 else np.array([0.44, 0.86, 1.0])
def ramp(v, stops):
    xs = [s[0] for s in stops]; out = np.zeros(v.shape + (3,))
    for c in range(3): out[..., c] = np.interp(v, xs, [s[1][c] for s in stops])
    return out
COLD = [(0, (0.03, 0.09, 0.12)), (0.35, (0.16, 0.36, 0.42)), (0.7, (0.55, 0.80, 0.86)), (1, (0.93, 0.99, 1.0))]
KIT  = [(0, (0.02, 0.06, 0.08)), (0.5, (0.10, 0.22, 0.27)), (1, (0.30, 0.50, 0.56))]
HOT  = [(0, (0.22, 0.0, 0.01)), (0.45, (0.70, 0.04, 0.02)), (0.8, (1.0, 0.24, 0.05)), (1, (1.0, 0.72, 0.36))]
CLOTH = [(0, (0.03, 0.10, 0.13)), (0.4, (0.14, 0.33, 0.40)), (0.8, (0.36, 0.62, 0.70)), (1, (0.62, 0.86, 0.92))]
STEEL = [(0, (0.10, 0.20, 0.24)), (0.5, (0.40, 0.62, 0.68)), (1, (0.90, 0.98, 1.0))]
HCLOTH = [(0, (0.16, 0.0, 0.01)), (0.45, (0.52, 0.03, 0.02)), (0.8, (0.86, 0.14, 0.04)), (1, (1.0, 0.42, 0.16))]
HKIT = [(0, (0.10, 0.01, 0.02)), (0.5, (0.28, 0.05, 0.05)), (1, (0.50, 0.16, 0.12))]
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, "*.png"))):
    a = np.asarray(Image.open(f).convert("RGBA"), float) / 255; heat, G, glow, al = a[..., 0], a[..., 1], a[..., 2] > 0.5, a[..., 3]
    cloth, gun, kit = (G > 0.12) & (G <= 0.37), (G > 0.37) & (G <= 0.75), G > 0.75          # classes written by render_sprites.py
    heat = heat ** 0.85
    rgb = ramp(heat, COLD if mode == "cold" else HOT)
    if mode == "cold":                                       # the body takes the wearer's colour: brightness from the heat, hue from the person
        lum = rgb.mean(axis=2, keepdims=True); tint = idc[None, None, :] / max(idc.max(), 1e-6)
        rgb = lum * (0.30 + 0.70 * tint) * 1.12 + 0.10 * rgb
    rgb[cloth] = ramp(heat, CLOTH if mode == "cold" else HCLOTH)[cloth]
    rgb[gun] = ramp(heat, STEEL if mode == "cold" else HKIT)[gun]
    rgb[kit] = ramp(heat, KIT if mode == "cold" else HKIT)[kit]
    if glow.any(): rgb[glow] = (0.25 + 0.75 * heat[glow, None]) * idc[None, :] * 0.9 + 0.1
    # dark seams where body meets kit and along the silhouette; a bright rim just inside the outline
    lab = Image.fromarray((kit * 110 + gun * 60 + cloth * 30 + glow * 40 + (al > 0.5) * 15).astype(np.uint8))
    edge = np.asarray(lab.filter(ImageFilter.FIND_EDGES), float) > 8
    edge = np.asarray(Image.fromarray((edge * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), float) / 255
    inner = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2)), float) / 255
    rim = np.clip((1 - inner) * 2.2, 0, 1) * (al > 0.5)
    rimc = (idc * 0.8 + 0.2) if mode == "cold" else np.array([1.0, 0.55, 0.25])
    rgb = rgb * (1 - 0.55 * edge[..., None]) + rimc[None, None, :] * rim[..., None] * 0.75
    # soft glow around the figure
    halo = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7)), float) / 255
    hc = (idc * 0.9 + 0.05) if mode == "cold" else np.array([1.0, 0.16, 0.08])
    oa = np.clip(al + halo * (0.55 if mode == "cold" else 0.6) * (1 - al), 0, 1)
    out = np.where(al[..., None] > 0.02, rgb * al[..., None] + hc * (1 - al[..., None]), hc[None, None, :])
    Image.fromarray((np.dstack([np.clip(out, 0, 1), oa]) * 255).astype(np.uint8), "RGBA").save(os.path.join(dst, os.path.basename(f)))
print("colorized", src, "->", dst, mode)
