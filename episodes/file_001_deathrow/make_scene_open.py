r"""Death row, open layout: one big bare hall built around a single cell. Nothing else in it but six columns.
Metres -> pixels: x_px = 400 + 64 * m (0 m = the steel door), y_px = 576 + 64 * m.
Run from C:\Sam:  python episodes/file_001_deathrow/make_scene_open.py

  vestibule 5 x 6 m  |  hall 24 x 14 m                                   | the cell 4.5 x 6 m, bars across its whole front,
  (room to stand     |  columns at x = 6, 11, 16 m, 3.6 m either side    | against the far wall, 19.5 m from the door
   outside the door) |  of the centre line                               |
"""
import json
M, X0, YC = 64, 400, 576
px = lambda m: int(X0 + M * m); py = lambda m: int(YC + M * m)
HALL_L, HALL_W, VEST = 24, 7, 5                       # hall length; half-width; vestibule depth
CELL_X, CELL_HW = 19.5, 3                             # where the bars are; the cell's half-width
ht, hb, hr = py(-HALL_W), py(HALL_W), px(HALL_L)
walls = [
    [px(-VEST), py(-3), X0, py(-3)], [px(-VEST), py(3), X0, py(3)],                   # vestibule (open at the left edge: the passage from the general block)
    [X0, ht, X0, hb], [X0, ht, hr, ht], [X0, hb, hr, hb], [hr, ht, hr, hb],           # the hall
    # (the doorway is a plain 2 m opening: the door is a slab that slides in a housing on the vestibule face of the wall, drawn by the renderer)
    [px(CELL_X), py(-CELL_HW), hr, py(-CELL_HW)], [px(CELL_X), py(CELL_HW), hr, py(CELL_HW)],             # the cell: side walls (its front is all bars)
    [px(CELL_X) - 26, py(-CELL_HW) - 26, hr, py(-CELL_HW) - 26], [px(CELL_X) - 26, py(CELL_HW) + 26, hr, py(CELL_HW) + 26],   # second skin: built heavier than anything else here
    [px(CELL_X) - 26, py(-CELL_HW) - 26, px(CELL_X) - 26, py(-CELL_HW)], [px(CELL_X) - 26, py(CELL_HW), px(CELL_X) - 26, py(CELL_HW) + 26],
]
doors = [{"id": "GATE", "axis": "v", "hx": X0, "hy": py(-1), "width": 2 * M, "swing": 1, "open": False, "heavy": True, "slide": True},
         {"id": "CELL", "axis": "v", "hx": px(CELL_X), "hy": py(-CELL_HW), "width": 2 * CELL_HW * M, "swing": 1, "open": False}]
rooms = [{"id": "CELL", "x": px(CELL_X), "y": py(-CELL_HW), "w": hr - px(CELL_X), "h": 2 * CELL_HW * M}]
PILLARS = [(x, s * 3.6) for x in (6, 11, 16) for s in (-1, 1)]
props = [{"type": "box", "x": px(21.9) - 46, "y": YC - 46, "w": 92, "h": 92}]          # restraint plate, cell centre
props += [{"type": "pillar", "x": px(x) - 29, "y": py(y) - 29, "w": 58, "h": 58} for x, y in PILLARS]
scene = {"name": "greyrock_deathrow_open", "template": "explicit", "canvas": {"w": 2048, "h": 1152}, "wall": 16, "unitScale": 0.95,
         "origin": {"x": X0, "y": YC, "pxPerM": M},
         "blockZone": [[X0, ht, hr - X0, hb - ht]],
         "walls": walls, "doors": doors, "rooms": rooms, "props": props,
         "places": {"door": [0, 0], "bars": [CELL_X, 0], "seat": [21.9, 0], "pillars": PILLARS, "hall": [HALL_L, 2 * HALL_W]},
         "roster": [
             {"id": "A", "callsign": "KNOX", "kit": "shield", "build": 1.18, "color": "#6fdcff", "icon": "tri"},
             {"id": "B", "callsign": "FUSE", "kit": "mg", "build": 1.1, "color": "#ffd23f", "icon": "circle"},
             {"id": "C", "callsign": "REYES", "kit": "recon", "build": 0.92, "color": "#b9a4ff", "icon": "diamond"},
             {"id": "D", "callsign": "MILLER", "kit": "rifle", "build": 1.0, "color": "#f2f6f7", "icon": "square"},
             {"id": "E", "callsign": "COLE", "kit": "medic", "build": 0.98, "color": "#f2f6f7", "icon": "cross"}]}
json.dump(scene, open("scene/deathrow_open.json", "w"), indent=1)
p = ("Image 1 is an exact architectural floor plan. Reproduce its geometry EXACTLY in the same frame: every wall, doorway gap, column and fixture must stay at the same pixel positions and proportions. Do not add, move or remove any wall, room, column or doorway. "
     "Image 2 is only a STYLE reference: match its X-ray surveillance rendering, colours and wall treatment. "
     "Render the plan as a strict orthographic 90-degree top-down cutaway of the death row of an old island penitentiary in an X-ray security scan style. It is ONE very large, bare, empty concrete hall: no cells along its walls, no furniture, no beds, nothing stored in it. "
     "Six massive square concrete columns stand in two rows of three down the hall, exactly where the plan shows them. "
     "Against the middle of the far right wall stands the ONLY cell: one isolated high-security holding chamber with double-thick reinforced side walls, heavy steel bars across its entire front facing the hall, and a square steel restraint plate with floor anchor rings and a drain bolted to the centre of its floor. The whole hall was built around this one cell. "
     "Worn bare concrete floor with a few drain grates, long cracks, water stains and faded painted lines; one faded painted warning line on the floor a short distance in front of the bars. "
     "On the far left a short wide vestibule comes in from the left edge of the image and ends at the hall entrance, which is a plain rectangular doorway cut straight through the hall's front wall, exactly as wide as the plan shows, with a steel threshold plate set into the floor across the opening. The wall on both sides of the doorway is flat and plain: no door frame blocks, no pilasters, no buttresses, no door leaf. Outside the walls is solid dark rock. "
     "Cold cyan glowing edges on the top faces of thick concrete walls and on the tops of the columns. Every doorway is an EMPTY opening with no door leaf drawn and the cell front is left OPEN with no bars drawn (they are added later). No people, no bodies, no text, no labels, no arrows, no UI.")
json.dump([{"name": f"deathrow_open2_plate_{k}", "model": "gpt-image-2", "size": "2048x1152", "resolution": "2k",
            "refs": ["scene/deathrow_open_layout_nodoors.png", "concepts/deathrow4_plate_a.png"], "prompt": p} for k in "ab"], open("tools/jobs_deathrow_open.json", "w"), indent=1)
print("scene + plate job written")
