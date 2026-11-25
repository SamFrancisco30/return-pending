r"""General block map (single level): main hall with open cells, a side wing, entry on the left, passage to death row on the right.
Metres -> pixels: x_px = 8 + 56 * x, y_px = 20 + 56 * y.   Run from C:\Sam.
"""
import json
M = 56
X = lambda m: round(8 + M * m)
Y = lambda m: round(20 + M * m)
walls, doors, props = [], [], []
H0, H1 = 4.5, 10.5                      # hall
T0, B1 = 1.5, 13.5                      # outer faces of the cell rows
walls += [[X(2), Y(T0), X(35), Y(T0)], [X(2), Y(H0), X(35), Y(H0)],                 # top row
          [X(2), Y(H1), X(17), Y(H1)], [X(21), Y(H1), X(35), Y(H1)],                # hall bottom wall (wing mouth 17..21)
          [X(2), Y(B1), X(14), Y(B1)], [X(24), Y(B1), X(33), Y(B1)],                # bottom row outer
          [X(2), Y(T0), X(2), Y(B1)], [X(35), Y(T0), X(35), Y(H1)], [X(33), Y(H1), X(33), Y(B1)],
          [X(0) - 8, Y(6), X(2), Y(6)], [X(0) - 8, Y(9), X(2), Y(9)],               # entry corridor (from the dock)
          [X(35), Y(6), 2048, Y(6)], [X(35), Y(9), 2048, Y(9)],                     # passage to death row
          [X(17), Y(H1), X(17), Y(19.5)], [X(21), Y(H1), X(21), Y(19.5)],           # wing walls
          [X(14), Y(B1), X(14), Y(19.5)], [X(24), Y(B1), X(24), Y(19.5)], [X(14), Y(19.5), X(24), Y(19.5)],
          [X(14), Y(16.5), X(17), Y(16.5)], [X(21), Y(16.5), X(24), Y(16.5)],
          [X(14), Y(B1), X(17), Y(B1)], [X(21), Y(B1), X(24), Y(B1)]]
doors += [{"id": "IN", "axis": "v", "hx": X(2), "hy": Y(6), "width": 3 * M, "swing": 1, "open": True},
          {"id": "OUT", "axis": "v", "hx": X(35), "hy": Y(6), "width": 3 * M, "swing": 1, "open": True}]
def cell(i, x, row):
    top = row == "T"
    doors.append({"id": f"{row}{i}", "axis": "h", "hx": X(x) + 44, "hy": Y(H0 if top else H1), "width": 80, "swing": -1 if top else 1, "open": True})
    by = Y(T0) + 16 if top else Y(B1) - 16 - 120
    props.append({"type": "box", "x": X(x) + 108, "y": by, "w": 46, "h": 120})
    props.append({"type": "pillar", "x": X(x) + 16, "y": Y(T0) + 16 if top else Y(B1) - 42, "w": 26, "h": 26})
for i in range(11):
    x = 2 + 3 * i
    if i: walls.append([X(x), Y(T0), X(x), Y(H0)])
    cell(i + 1, x, "T")
for i, x in enumerate([2, 5, 8, 11, 14, 21, 24, 27, 30]):
    if x not in (2, 21): walls.append([X(x), Y(H1), X(x), Y(B1)])
    if x == 14: walls.append([X(14), Y(H1), X(14), Y(B1)])
    cell(i + 1, x, "B")
for k, (x, y, sw) in enumerate([(17, 14.2, -1), (17, 17.2, -1), (21, 14.2, 1), (21, 17.2, 1)]):   # wing cells open onto the wing
    doors.append({"id": f"W{k+1}", "axis": "v", "hx": X(x), "hy": Y(y), "width": 80, "swing": sw, "open": True})
    props.append({"type": "box", "x": X(14.3) if sw < 0 else X(22.9), "y": Y(y - 0.5), "w": 46, "h": 120})
for x in (7, 13, 25, 30):                                                                              # dayroom tables bolted to the floor
    props.append({"type": "box", "x": X(x), "y": Y(7.0), "w": 100, "h": 56})
props.append({"type": "box", "x": X(18.2), "y": Y(4.9), "w": 90, "h": 60})                              # officer's station opposite the wing
scene = {"name": "greyrock_block", "template": "explicit", "canvas": {"w": 2048, "h": 1152}, "wall": 14, "unitScale": 0.82,
         "origin": {"x": 8, "y": 20, "pxPerM": M}, "walls": walls, "doors": doors, "rooms": [], "props": props,
         "roster": json.load(open("scene/deathrow.json"))["roster"]}
json.dump(scene, open("scene/greyrock_block.json", "w"), indent=1)
p = ("Image 1 is an exact architectural floor plan. Reproduce its geometry EXACTLY in the same frame: every wall, doorway gap, cell partition, table and fixture must stay at the same pixel positions and proportions. Do not add, move or remove any wall, cell or doorway. "
     "Image 2 is only a STYLE reference: match its X-ray surveillance rendering, colors and wall treatment. "
     "Render the plan as a strict orthographic 90-degree top-down cutaway of the general population cell block of an old island penitentiary in an X-ray security scan style. A long central dayroom hall with a row of small open cells along the top and bottom; each cell has a narrow flat steel prison bunk with a thin mattress (a BED, never a vehicle) and a small steel toilet-sink unit. Steel dayroom tables with fixed round stools are bolted to the hall floor, and there is an officer's desk station. A shorter side wing branches downward from the middle of the hall with four more cells. A corridor enters from the left edge and another leaves through the right edge. Overturned trays, scattered bedding, dropped shoes and dark stains on the worn concrete suggest the place was abandoned in a hurry. Outside the walls is solid dark rock. Cold cyan glowing edges on the top faces of thick concrete walls. Every doorway is an EMPTY opening with no door leaf. No people, no creatures, no bodies. Subtle sensor noise. No text, no labels, no numbers, no UI, no perspective, no isometric view.")
jobs = [j for j in json.load(open("tools/jobs_deathrow.json")) if not j["name"].startswith("block_")]
jobs += [{"name": f"block_plate_{k}", "model": "gpt-image-2", "size": "2048x1152", "resolution": "2k",
          "refs": ["scene/greyrock_block_layout_nodoors.png", "concepts/deathrow2_plate_a.png"], "prompt": p} for k in "ab"]
json.dump(jobs, open("tools/jobs_deathrow.json", "w"), indent=1)
print("block scene written;", len(jobs), "plate jobs")
