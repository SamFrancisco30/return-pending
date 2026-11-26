# Builds a rough 3D set from a map JSON and renders a first-person reference from a position on that map.
#   blender -b --python library/blender/build_set.py -- <scene.json> <out.png> <x_px> <y_px> <heading_deg> [fov_deg=100] [save.blend]
# heading uses the map's convention: 0 = +x (right on the map), 90 = +y (down on the map).
import bpy, sys, json, math
a = sys.argv[sys.argv.index("--") + 1:]
S = json.load(open(a[0])); OUT = a[1]; CX, CY, HEAD = float(a[2]), float(a[3]), float(a[4]); FOV = float(a[5]) if len(a) > 5 else 100
K = 1.0 / S["origin"]["pxPerM"]; TH = S["wall"] * K; HWALL = 3.2
W = lambda x, y: (x * K, -y * K)                      # map px -> world metres (map y is down, world y is up)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, col, rough=0.9):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; return m
M_WALL, M_FLOOR, M_STEEL, M_PROP = mat("wall", (0.42, 0.45, 0.43)), mat("floor", (0.30, 0.31, 0.30)), mat("steel", (0.20, 0.21, 0.22), 0.5), mat("prop", (0.36, 0.38, 0.40))
def box(x0, y0, x1, y1, z0, z1, m):
    (ax, ay), (bx, by) = W(x0, y0), W(x1, y1)
    bpy.ops.mesh.primitive_cube_add(size=1, location=((ax + bx) / 2, (ay + by) / 2, (z0 + z1) / 2)); o = bpy.context.object
    o.scale = (max(abs(bx - ax), 0.01), max(abs(by - ay), 0.01), z1 - z0); o.data.materials.append(m); return o
c = S["canvas"]; box(0, 0, c["w"], c["h"], -0.1, 0, M_FLOOR); box(0, 0, c["w"], c["h"], HWALL, HWALL + 0.1, M_WALL)
h = S["wall"] / 2
def cuts(seg):                                        # door openings lying on this wall segment, as intervals along it
    x1, y1, x2, y2 = seg; out = []
    for d in S["doors"]:
        if d["axis"] == "v" and x1 == x2 and abs(d["hx"] - x1) < 2: out.append((d["hy"], d["hy"] + d["width"], d))
        if d["axis"] == "h" and y1 == y2 and abs(d["hy"] - y1) < 2: out.append((d["hx"], d["hx"] + d["width"], d))
    return sorted(out, key=lambda t: t[0])
for seg in S["walls"]:
    x1, y1, x2, y2 = seg; vert = x1 == x2; lo, hi = (min(y1, y2), max(y1, y2)) if vert else (min(x1, x2), max(x1, x2)); p = lo
    def piece(a0, a1, z0=0, z1=HWALL, m=M_WALL):
        if a1 - a0 < 1: return
        box(x1 - h, a0, x1 + h, a1, z0, z1, m) if vert else box(a0, y1 - h, a1, y1 + h, z0, z1, m)
    for a0, a1, d in cuts(seg):
        a0, a1 = max(a0, lo), min(a1, hi)
        if a1 <= a0: continue
        piece(p, a0); piece(a0, a1, 2.3, HWALL)                      # lintel over the opening
        if d.get("heavy"): piece(a0, a1, 0, 2.3, M_STEEL)             # the steel door, shut
        else:                                                         # bars
            n = max(2, int((a1 - a0) * K / 0.14))
            for i in range(n + 1):
                q = a0 + (a1 - a0) * i / n
                (wx, wy) = W(x1, q) if vert else W(q, y1)
                bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=2.3, location=(wx, wy, 1.15), vertices=8); bpy.context.object.data.materials.append(M_STEEL)
            for z in (0.25, 1.2, 2.2): piece(a0, a1, z - 0.03, z + 0.03, M_STEEL)
        p = a1
    piece(p, hi)
for pr in S.get("props", []):
    box(pr["x"], pr["y"], pr["x"] + pr["w"], pr["y"] + pr["h"], 0, 0.12 if pr["w"] > 80 and pr["h"] > 80 else 0.75 if pr["type"] == "pillar" else 0.5, M_PROP)
# camera at head height, with the wearer's weapon light
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); bpy.context.collection.objects.link(cam)
wx, wy = W(CX, CY); cam.location = (wx, wy, 1.68); cam.data.lens_unit = "FOV"; cam.data.angle = math.radians(FOV)
cam.rotation_euler = (math.radians(86), 0, math.radians(-HEAD - 90))
sc = bpy.context.scene; sc.camera = cam
li = bpy.data.objects.new("torch", bpy.data.lights.new("torch", "SPOT")); bpy.context.collection.objects.link(li)
li.data.energy = 2500; li.data.spot_size = math.radians(70); li.data.spot_blend = 0.6; li.parent = cam; li.location = (0.15, -0.25, 0)
fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "POINT")); bpy.context.collection.objects.link(fill); fill.data.energy = 120; fill.location = (wx, wy, 2.6)
sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.01, 0.012, 0.014, 1)
ids = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
sc.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in ids else "BLENDER_EEVEE_NEXT"
sc.render.resolution_x, sc.render.resolution_y = 1600, 900; sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)
if len(a) > 6: bpy.ops.wm.save_as_mainfile(filepath=a[6])
print("SET RENDERED", OUT)
