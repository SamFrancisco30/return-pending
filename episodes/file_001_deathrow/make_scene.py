r"""Death row map v2: a 6 m wide hall, five cells per side, and the condemned cell as its own chamber at the far end.
Metres -> pixels: x_px = 300 + 64 * m (0 m = the block boundary), y_px = 576 + 64 * m.
Run from C:\Sam:  python episodes/file_001_deathrow/make_scene.py
"""
import json
M, X0, YC = 64, 300, 576
px = lambda m: X0 + M * m
hall_t, hall_b = YC - 3 * M, YC + 3 * M            # 384 .. 768
cell_t, cell_b = hall_t - 3 * M, hall_b + 3 * M    # 192 .. 960
rows_end, hall_end = px(16), px(19)                # 1324, 1516
ch_x1, ch_t, ch_b = px(24), YC - int(3.5 * M), YC + int(3.5 * M)   # 1836, 352, 800
walls = [
    [0, YC - 96, X0, YC - 96], [0, YC + 96, X0, YC + 96],                            # access passage from the general block (open at the left edge)
    [X0, cell_t, X0, cell_b],                                                         # block front wall (door gap)
    [X0 - 24, YC - 96, X0 - 24, YC - 64], [X0 - 24, YC + 64, X0 - 24, YC + 96],       # the doorway is a thick security frame:
    [X0 + 24, YC - 150, X0 + 24, YC - 64], [X0 + 24, YC + 64, X0 + 24, YC + 150],     # jambs three skins deep
    [X0, cell_t, rows_end, cell_t], [X0, cell_b, rows_end, cell_b],                   # cell rows, outer
    [rows_end, cell_t, rows_end, hall_t], [rows_end, hall_b, rows_end, cell_b],       # cell rows end
    [X0, hall_t, hall_end, hall_t], [X0, hall_b, hall_end, hall_b],                   # hall walls
    [hall_end, ch_t, hall_end, ch_b],                                                 # chamber front (barred gate gap)
    [hall_end, ch_t, ch_x1, ch_t], [hall_end, ch_b, ch_x1, ch_b], [ch_x1, ch_t, ch_x1, ch_b],
    # second skin around the chamber: it is built heavier than anything else here
    [hall_end - 26, ch_t - 26, ch_x1 + 26, ch_t - 26], [hall_end - 26, ch_b + 26, ch_x1 + 26, ch_b + 26],
    [ch_x1 + 26, ch_t - 26, ch_x1 + 26, ch_b + 26],
    [hall_end - 26, ch_t - 26, hall_end - 26, hall_t], [hall_end - 26, hall_b, hall_end - 26, ch_b + 26],
]
doors = [{"id": "GATE", "axis": "v", "hx": X0, "hy": YC - 64, "width": 128, "swing": 1, "open": False, "heavy": True},
         {"id": "CELL", "axis": "v", "hx": hall_end, "hy": YC - 128, "width": 256, "swing": 1, "open": False}]
rooms = [{"id": "CELL", "x": hall_end, "y": ch_t, "w": ch_x1 - hall_end, "h": ch_b - ch_t}]
props = [{"type": "box", "x": px(21.8) - 46, "y": YC - 46, "w": 92, "h": 92}]          # restraint plate, chamber centre
for i in range(5):
    x = px(1 + 3 * i)
    if i: walls += [[x, cell_t, x, hall_t], [x, hall_b, x, cell_b]]
    else: walls += [[x, cell_t, x, hall_t], [x, hall_b, x, cell_b]]
    doors += [{"id": f"T{i+1}", "axis": "h", "hx": x + 52, "hy": hall_t, "width": 88, "swing": -1, "open": False},
              {"id": f"B{i+1}", "axis": "h", "hx": x + 52, "hy": hall_b, "width": 88, "swing": 1, "open": False}]
    rooms += [{"id": f"T{i+1}", "x": x, "y": cell_t, "w": 3 * M, "h": 3 * M}, {"id": f"B{i+1}", "x": x, "y": hall_b, "w": 3 * M, "h": 3 * M}]
    props += [{"type": "box", "x": x + 122, "y": cell_t + 20, "w": 52, "h": 132}, {"type": "box", "x": x + 122, "y": cell_b - 152, "w": 52, "h": 132},
              {"type": "pillar", "x": x + 20, "y": cell_t + 20, "w": 28, "h": 28}, {"type": "pillar", "x": x + 20, "y": cell_b - 48, "w": 28, "h": 28}]
scene = {"name": "greyrock_deathrow", "template": "explicit", "canvas": {"w": 2048, "h": 1152},
         "wall": 16, "unitScale": 0.95,
         "origin": {"x": X0, "y": YC, "pxPerM": M},
         "blockZone": [[X0, cell_t, rows_end - X0, cell_b - cell_t], [rows_end, hall_t, hall_end - rows_end, hall_b - hall_t],
                       [hall_end, ch_t, ch_x1 - hall_end, ch_b - ch_t]],
         "walls": walls, "doors": doors, "rooms": rooms, "props": props,
         "roster": [
             {"id": "A", "callsign": "KNOX", "kit": "shield", "build": 1.18, "color": "#6fdcff", "icon": "tri"},
             {"id": "B", "callsign": "HOUND", "kit": "crossbow", "build": 1.05, "color": "#a6e36e", "icon": "arrow"},
             {"id": "C", "callsign": "REYES", "kit": "recon", "build": 0.92, "color": "#b9a4ff", "icon": "diamond"},
             {"id": "D", "callsign": "MILLER", "kit": "rifle", "build": 1.0, "color": "#f0df7c", "icon": "square"},
             {"id": "E", "callsign": "COLE", "kit": "medic", "build": 0.98, "color": "#f2f6f7", "icon": "cross"},
             {"id": "F", "callsign": "T04-4", "kit": "rifle", "build": 1.0, "color": "#9fb4ba", "icon": "circle"}]}
json.dump(scene, open("scene/deathrow.json", "w"), indent=1)
p = ("Image 1 is an exact architectural floor plan. Reproduce its geometry EXACTLY in the same frame: every wall, doorway gap, cell partition and fixture must stay at the same pixel positions and proportions. Do not add, move or remove any wall, cell or doorway. "
     "Image 2 is only a STYLE reference: match its X-ray surveillance rendering, colors and wall treatment. "
     "Render the plan as a strict orthographic 90-degree top-down cutaway of the death row block of an old island penitentiary in an X-ray security scan style. A wide central concrete hall with five small prison cells on each side; each cell has a narrow flat steel prison bunk bolted to the wall with a thin mattress and a folded blanket (a BED, never a vehicle, no wheels, no windows), and a small steel toilet-sink unit in the corner. At the far right end of the hall, standing apart from the cell rows, is ONE large isolated high-security holding chamber with double-thick reinforced walls, heavy steel bars across its front facing the hall, and a square steel restraint plate with floor anchor rings and a drain bolted to the centre of its floor; it must look far heavier and more important than the ordinary cells. Worn concrete floor with drain grates, cracks, stains and faded painted lines along the hall; on the far left a narrow access corridor comes in from the left edge of the image and ends at the block entrance, which is a heavy reinforced security doorway: a very thick steel-and-concrete door frame three wall-layers deep, with a steel threshold plate set into the floor across the opening and a massive steel door leaf swung fully open and lying flat against the inside wall; outside the walls is solid dark rock. Cold cyan glowing edges on the top faces of thick concrete walls. Every doorway is an EMPTY opening with no door leaf. No people, no creatures, no bodies. Subtle sensor noise. No text, no labels, no numbers, no UI, no perspective, no isometric view.")
json.dump([{"name": f"deathrow4_plate_{k}", "model": "gpt-image-2", "size": "2048x1152", "resolution": "2k",
            "refs": ["scene/deathrow_layout_nodoors.png", "concepts/deathrow3_plate_a.png"], "prompt": p} for k in "ab"],
          open("tools/jobs_deathrow.json", "w"), indent=1)
print("scene + plate job written")
