r"""Builds door design B (concepts/door_design_b.png, a picture of the doorway with the double blast door shut) into the open
death-row map:  python episodes/file_001_deathrow/make_door_b.py     (run from C:\Sam, after make_scene_open.py)
  - pastes the door frame, its two roller housings and the wall around them into the floor plate, over the old frame blocks,
    but leaves the opening itself as it was (the threshold plate), so the floor shows when the door is open
  - cuts the two leaves out as one image, concepts/door_b_leaves.png: the renderer slides the top half up and the bottom half down
  - writes where they go into scene/deathrow_open.json (door GATE, "art")
The picture is 0.2207 plan pixels per pixel: its 580 px door spans the 2 m (128 px) opening."""
import json
from PIL import Image, ImageDraw, ImageFilter
B = Image.open("concepts/door_design_b.png").convert("RGB"); S = 128 / 580          # plan px per picture px
BX, BY, PX, PY = 548, 760, 400, 576                                                   # the wall's centre line and the middle of the door, in the picture and on the plan
plan = lambda bx, by: (PX + (bx - BX) * S, PY + (by - BY) * S)
fit = {"sx": 0.9904, "sy": 0.9828, "dx": 6.7, "dy": 39.4}                              # plan = plate * s + d
plate = Image.open("concepts/deathrow_open_plate_a.png").convert("RGB")
def paste(box, keep=None):
    (x0, y0), (x1, y1) = plan(box[0], box[1]), plan(box[2], box[3]); q = lambda x, y: (int(round((x - fit["dx"]) / fit["sx"])), int(round((y - fit["dy"]) / fit["sy"])))
    (a, b), (c, d) = q(x0, y0), q(x1, y1); piece = B.crop(box).resize((c - a, d - b), Image.LANCZOS)
    m = Image.new("L", piece.size, 0); ImageDraw.Draw(m).rectangle([6, 6, piece.size[0] - 7, piece.size[1] - 7], fill=255); m = m.filter(ImageFilter.GaussianBlur(4))
    if keep:                                                                           # a hole: this part of the plate is left alone
        (kx0, ky0), (kx1, ky1) = plan(keep[0], keep[1]), plan(keep[2], keep[3]); (ka, kb), (kc, kd) = q(kx0, ky0), q(kx1, ky1); ImageDraw.Draw(m).rectangle([ka - a, kb - b, kc - a, kd - b], fill=0)
    plate.paste(piece, (a, b), m)
LEAF = (378, 468, 662, 1052)                                                           # the two leaves and their frame bars
paste((612, 40, 760, 1480))                                                            # the hall side of the wall, top to bottom: covers the old inner frame blocks
paste((350, 272, 760, 1212), keep=(392, 478, 648, 1042))                               # the door frame, both housings, the wall between; the opening keeps its own floor
plate.save("concepts/deathrow_open_plate_b.png")
B.crop(LEAF).save("concepts/door_b_leaves.png")
(lx0, ly0), (lx1, ly1) = plan(LEAF[0], LEAF[1]), plan(LEAF[2], LEAF[3])
p = "scene/deathrow_open.json"; sc = json.load(open(p, encoding="utf8"))
for d in sc["doors"]:
    if d["id"] == "GATE": d["art"] = {"img": "../concepts/door_b_leaves.png", "x": round(lx0, 1), "y": round(ly0, 1), "w": round(lx1 - lx0, 1), "h": round(ly1 - ly0, 1)}
json.dump(sc, open(p, "w", encoding="utf8"), indent=1)
q = "episodes/file_001_deathrow/plates.json"; pl = json.load(open(q, encoding="utf8")); pl["deathrow_open"]["xray"] = "../concepts/deathrow_open_plate_b.png"; json.dump(pl, open(q, "w", encoding="utf8"), indent=1)
print("door B built: leaves at", sc["doors"][0]["art"])
