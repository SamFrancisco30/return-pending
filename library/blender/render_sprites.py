# Renders one action of one character as a top-down "thermal" image sequence.
#   blender -b --python library/blender/render_sprites.py -- <glb> <action> <char> <outdir> [size=320] [span=3.2] [step=1]
# Output PNGs are data, not pictures: R = heat (0..1); G = material class (0 skin, low = cloth, mid = weapon steel, 1 = armour/kit);
# B = 1 where the kit glows (the shield). The compositor turns that into the cold squad palette or the hot anomaly
# palette, so one sequence can be tinted any way. The character faces image-right; image-up is the character's left.
import bpy, sys, os, json, math, bmesh
from mathutils import Vector, Euler

a = sys.argv[sys.argv.index("--") + 1:]
GLB, ACTION, CHAR, OUT = a[0], a[1], a[2], a[3]
VAR = os.environ.get("RP_VARIANT", "v1")     # v1 = first pass (plain body, basic kit); v1gun = v1 plus the new shotgun and upright shield; v2 = everything
BASE = CHAR.split("_")[0]; OPS = ("knox", "hound", "reyes", "miller", "cole", "fuse")     # CHAR may carry a loadout: hound_bow, hound_axe
CARRY = os.environ.get("RP_CARRY", "0") == "1"       # 1 = the weapon is carried at the chest (walking, standing); 0 = it is in the hands, pointed (aiming, firing)
NOWEAPON = os.environ.get("RP_NOWEAPON", "0") == "1"
TAC = os.environ.get("RP_TAC", "0") == "1"           # 1 = moving like someone carrying a weapon: the legs do what the clip does, the arms stay on the weapon
PROC = os.environ.get("RP_PROC", "")                 # a movement built here instead of taken from a clip: "chop"
FOLLOW = os.environ.get("RP_FOLLOW", "0") == "1"
AXE_AXIS = os.environ.get("RP_AXE_AXIS", "y")
SHIELD = os.environ.get("RP_SHIELD", "arm")   # arm = strapped to the forearm (right for bracing and bashing); upright = held upright in front of the left shoulder, clear of the gun hand
SIZE = int(a[4]) if len(a) > 4 else 320; SPAN = float(a[5]) if len(a) > 5 else 3.2; STEP = int(a[6]) if len(a) > 6 else 1

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
if "Icosphere" in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects["Icosphere"])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); body = bpy.data.objects["Mannequin"]
NAMES = {"head": ["Head", "DEF-head"], "chest": ["spine_03", "DEF-spine.003"], "hips": ["pelvis", "DEF-hips"],
         "upper_l": ["upperarm_l", "DEF-upper_arm.L"], "upper_r": ["upperarm_r", "DEF-upper_arm.R"],
         "forearm_l": ["lowerarm_l", "DEF-forearm.L"], "forearm_r": ["lowerarm_r", "DEF-forearm.R"], "hand_l": ["hand_l", "DEF-hand.L"], "hand_r": ["hand_r", "DEF-hand.R"],
         "thigh_l": ["thigh_l", "DEF-thigh.L"], "thigh_r": ["thigh_r", "DEF-thigh.R"], "shin_l": ["calf_l", "DEF-shin.L"], "shin_r": ["calf_r", "DEF-shin.R"], "foot_l": ["foot_l", "DEF-foot.L"], "foot_r": ["foot_r", "DEF-foot.R"]}
bone = lambda k: next(n for n in NAMES[k] if n in arm.data.bones)

# ---- material: heat from how much a surface faces the camera and how high it is; the class goes in G, glow in B
def mat(name, cls=0.0, glow=0.0, gain=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nsep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0]); nt.links.new(geo.outputs["Normal"], nsep.inputs[0])
    h = nt.nodes.new("ShaderNodeMapRange"); h.inputs[1].default_value = 0.0; h.inputs[2].default_value = 1.75; h.inputs[3].default_value = 0.10; h.inputs[4].default_value = 1.0
    nt.links.new(sep.outputs["Z"], h.inputs[0])
    f = nt.nodes.new("ShaderNodeMapRange"); f.inputs[1].default_value = 0.0; f.inputs[2].default_value = 1.0; f.inputs[3].default_value = 0.22; f.inputs[4].default_value = 1.0
    nt.links.new(nsep.outputs["Z"], f.inputs[0])
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; nt.links.new(h.outputs[0], mul.inputs[0]); nt.links.new(f.outputs[0], mul.inputs[1])
    g = nt.nodes.new("ShaderNodeMath"); g.operation = "MULTIPLY"; g.inputs[1].default_value = gain; g.use_clamp = True; nt.links.new(mul.outputs[0], g.inputs[0])
    comb = nt.nodes.new("ShaderNodeCombineColor"); nt.links.new(g.outputs[0], comb.inputs[0]); comb.inputs[1].default_value = cls; comb.inputs[2].default_value = glow
    nt.links.new(comb.outputs[0], em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m
M_SKIN, M_CLOTH, M_KIT, M_GUN, M_GLOW = mat("skin", 0.0, 0.0, 1.15), mat("cloth", 0.05, 0.0, 0.85), mat("kit", 1.0, 0.0, 0.85), mat("gun", 0.2, 0.0, 1.0), mat("glow", 1.0, 1.0, 1.0)

# ---- clothing: split the mannequin's faces by where they are in the rest pose (T-pose, arms along X, up +Z)
body.data.materials.clear(); body.data.materials.append(M_SKIN); body.data.materials.append(M_CLOTH)
V = body.data.vertices
for p in body.data.polygons:
    c = sum((V[i].co for i in p.vertices), Vector()) / len(p.vertices); c = body.matrix_world @ c; ax = abs(c.x)
    if CHAR in ("prisoner", "resident"): cloth = c.z < 1.02 or (ax < 0.24 and c.z < 1.50) or (0.24 <= ax < 0.36 and c.z > 1.30)      # jumpsuit: legs, torso, sleeves torn off at the shoulder
    else: cloth = not (ax > 0.70 or c.z > 1.52)                                                                    # uniform everywhere but hands and face
    p.material_index = 1 if cloth and VAR == "v2" else 0
if VAR != "v2" and CHAR not in ("prisoner", "resident"): body.data.materials[0] = mat("body", 0.0, 0.0, 1.0)

# ---- kit: simple solids placed in the REST pose and parented to a bone
arm.data.pose_position = "REST"; bpy.context.view_layer.update()
def attach(obj, key, m):
    obj.data.materials.append(m); w = obj.matrix_world.copy()
    obj.parent = arm; obj.parent_type = "BONE"; obj.parent_bone = bone(key); bpy.context.view_layer.update(); obj.matrix_world = w
def box(name, loc, size, key, m, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = name; o.scale = size
    if bevel: bv = o.modifiers.new("b", "BEVEL"); bv.width = bevel; bv.segments = 3
    bpy.context.view_layer.update()
    if key: attach(o, key, m)
    else: o.data.materials.append(m)
    return o
def ball(name, loc, scale, key, m):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=loc, segments=24, ring_count=12); o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.shade_smooth(); bpy.context.view_layer.update(); attach(o, key, m); return o
def band(name, loc, key, m, r=0.062, w=0.07):
    bpy.ops.mesh.primitive_cylinder_add(location=loc, rotation=(0, math.pi / 2, 0), radius=r, depth=w, vertices=20); o = bpy.context.object; o.name = name
    bpy.context.view_layer.update(); attach(o, key, m); return o
P = lambda k: arm.matrix_world @ arm.pose.bones[bone(k)].head
if BASE in OPS:
    hd, ch = P("head"), P("chest")
    ball("helmet", (hd.x, hd.y + 0.005, hd.z + 0.10), (0.135, 0.15, 0.125), "head", M_KIT)
    if VAR == "v2": box("helmet_rail", (hd.x, hd.y + 0.005, hd.z + 0.215), (0.035, 0.22, 0.03), "head", M_GUN, bevel=0.01)       # ridge front to back
    if VAR == "v2": box("nvg_mount", (hd.x, hd.y - 0.15, hd.z + 0.13), (0.07, 0.05, 0.05), "head", M_GUN, bevel=0.01)
    for sx in ((-1, 1) if VAR == "v2" else ()): box("ear_pro", (hd.x + sx * 0.135, hd.y + 0.01, hd.z + 0.06), (0.05, 0.09, 0.09), "head", M_KIT, bevel=0.02)
    box("carrier", (ch.x, ch.y - 0.02, ch.z + 0.0), (0.33, 0.27, 0.36), "chest", M_KIT, bevel=0.05)
    box("pack", (ch.x, ch.y + 0.17, ch.z + 0.02), (0.25, 0.11, 0.30), "chest", M_KIT, bevel=0.04)
    if VAR == "v2": box("radio", (ch.x + 0.10, ch.y + 0.20, ch.z + 0.19), (0.06, 0.06, 0.12), "chest", M_GUN, bevel=0.01)
    if VAR == "v2": box("antenna", (ch.x + 0.10, ch.y + 0.30, ch.z + 0.24), (0.012, 0.20, 0.012), "chest", M_GUN)
    for sx in ((-1, 0, 1) if VAR == "v2" else (-1.2, 1.2)): box("mag_pouch", (ch.x + sx * 0.10, ch.y - 0.185, ch.z - 0.08), (0.075, 0.06, 0.13), "chest", M_KIT, bevel=0.012)
    for s, k in (((1, "upper_l"), (-1, "upper_r")) if VAR == "v2" else ()):
        u = P(k); box("pauldron", (u.x + s * 0.09, u.y, u.z + 0.045), (0.17, 0.15, 0.05), k, M_KIT, bevel=0.02)
    for k in (("shin_l", "shin_r") if VAR == "v2" else ()): s = P(k); box("knee_pad", (s.x, s.y - 0.06, s.z), (0.11, 0.06, 0.13), k, M_KIT, bevel=0.02)
if CHAR in ("knox", "operator", "prisoner") and VAR == "v2":
    for k in ("foot_l", "foot_r"):
        f = P(k); box("boot", (f.x, f.y - 0.07, f.z - 0.05), (0.105, 0.27, 0.10), k, M_KIT if CHAR != "prisoner" else M_CLOTH, bevel=0.03)
# what tells the others apart from above: one big piece each, plus a strip of their own colour on the pack
if BASE in OPS and BASE != "knox":
    ch = P("chest")
    box("id_strip", (ch.x, ch.y + 0.17, ch.z + 0.185), (0.21, 0.045, 0.03), "chest", M_GLOW)
    if BASE == "reyes":                                   # the long rifle slung across her back, muzzle past the left shoulder
        if CHAR != "reyes_rifle":                         # (when it is in her hands it is not on her back)
            c0 = Vector((ch.x + 0.03, ch.y + 0.26, ch.z + 0.06)); ang = math.radians(-14 if "Pistol" in ACTION else 38); u = Vector((math.cos(ang), math.sin(ang), 0))
            for nm, t, ln, wd, m, dz in (("sl_stock", -0.33, 0.26, 0.10, M_GUN, 0), ("sl_receiver", -0.08, 0.26, 0.11, M_GUN, 0), ("sl_scope", -0.07, 0.26, 0.055, M_KIT, 0.06),
                                         ("sl_guard", 0.16, 0.24, 0.085, M_GUN, 0), ("sl_barrel", 0.40, 0.26, 0.048, M_GUN, 0), ("sl_brake", 0.555, 0.07, 0.08, M_KIT, 0)):
                c = c0 + u * t; box(nm, (c.x, c.y, c.z + dz), (ln, wd, 0.06), "chest", m, rot=(0, 0, ang), bevel=0.01)
        arm.scale = (0.93, 0.93, 0.96)
    if BASE == "fuse":                                    # demolitions: a deep satchel on the back with a row of charges strapped across its lid, and a bigger man under it
        box("satchel", (ch.x, ch.y + 0.23, ch.z - 0.02), (0.38, 0.22, 0.40), "chest", M_KIT, bevel=0.05)
        for dx in (-0.12, 0.0, 0.12): box("charge", (ch.x + dx, ch.y + 0.23, ch.z + 0.20), (0.085, 0.17, 0.05), "chest", M_GUN, bevel=0.015)
        arm.scale = (1.10, 1.10, 1.03)
    if BASE == "cole":                                    # the recovery pack, with the cross on its lid
        box("med_pack", (ch.x, ch.y + 0.22, ch.z + 0.0), (0.33, 0.20, 0.36), "chest", M_KIT, bevel=0.05)
        box("cross_a", (ch.x, ch.y + 0.22, ch.z + 0.19), (0.19, 0.055, 0.02), "chest", M_GLOW); box("cross_b", (ch.x, ch.y + 0.22, ch.z + 0.19), (0.055, 0.17, 0.02), "chest", M_GLOW)
        box("cross_c", (ch.x, ch.y + 0.325, ch.z + 0.0), (0.19, 0.02, 0.055), "chest", M_GLOW); box("cross_d", (ch.x, ch.y + 0.325, ch.z + 0.0), (0.055, 0.02, 0.19), "chest", M_GLOW)   # and on its back, which is what shows when he bends over something
        if os.environ.get("RP_LOAD") == "case":           # a sealed recovery case carried in both arms: dark, banded in his colour
            box("case", (ch.x, ch.y - 0.40, ch.z - 0.10), (0.50, 0.30, 0.24), "chest", M_KIT, bevel=0.03)
            for dx in (-0.15, 0.15): box("case_band", (ch.x + dx, ch.y - 0.40, ch.z + 0.025), (0.045, 0.31, 0.02), "chest", M_GLOW)
            box("case_handle", (ch.x, ch.y - 0.40, ch.z + 0.04), (0.16, 0.035, 0.03), "chest", M_GUN, bevel=0.01)
    if BASE == "hound":                                   # quiver across the back
        box("quiver", (ch.x - 0.07, ch.y + 0.24, ch.z + 0.03), (0.085, 0.27, 0.085), "chest", M_KIT, rot=(0, 0, math.radians(-28)), bevel=0.03)
if CHAR == "knox":
    fl, hl = P("forearm_l"), P("hand_l")
    # tower shield strapped to the left forearm: 0.62 wide (along the forearm), 1.05 tall, curved back at the sides
    me = bpy.data.meshes.new("shield"); bm = bmesh.new(); W, H, NU, NV = 0.62, 1.05, 14, 2
    vs = [[bm.verts.new(((u / NU - 0.5) * W, (v / NV - 0.5) * H, -0.16 * (2 * u / NU - 1) ** 2)) for v in range(NV + 1)] for u in range(NU + 1)]
    for u in range(NU):
        for v in range(NV): bm.faces.new((vs[u][v], vs[u + 1][v], vs[u + 1][v + 1], vs[u][v + 1]))
    bm.to_mesh(me); bm.free(); sh = bpy.data.objects.new("shield", me); bpy.context.collection.objects.link(sh)
    so = sh.modifiers.new("s", "SOLIDIFY"); so.thickness = 0.045; sh.data.materials.append(M_GLOW)
    # like the gun, the shield follows the left hand but stays upright and square to the way he faces: whatever the
    # arm does (walking, bracing, bashing) it is seen from above as one curved edge, never as a flat slab
    ARM = VAR == "v1" and SHIELD == "arm" and not TAC
    if ARM:
        sh.location = ((fl.x + hl.x) / 2, fl.y, fl.z + 0.11); bpy.context.view_layer.update(); sh.data.materials.clear(); attach(sh, "forearm_l", M_GLOW)
    sroot = bpy.data.objects.new("shield_root", None); bpy.context.collection.objects.link(sroot)
    UP = SHIELD == "upright" or TAC
    if TAC: sroot.location = (0.15, -0.47, 1.22); bpy.context.view_layer.update(); w0 = sroot.matrix_world.copy(); sroot.parent = arm; sroot.parent_type = "BONE"; sroot.parent_bone = bone("chest"); bpy.context.view_layer.update(); sroot.matrix_world = w0
    elif SHIELD == "upright": sroot.location = (0.15, -0.47, 1.22)          # a fixed place in front of the left shoulder; the left arm is posed to reach it (below)
    else: c2 = sroot.constraints.new("COPY_LOCATION"); c2.target = arm; c2.subtarget = bone("hand_l")
    if not TAC: sroot.rotation_euler = Euler((0, 0, math.radians(12 if UP else 14)))
    if not ARM: sh.parent = sroot; sh.location = ((0.0, -0.09, -0.22) if UP else (-0.10, -0.10, -0.30)); sh.rotation_euler = Euler((math.radians(80 if UP else 90), 0, 12 * math.pi / 180 if TAC else 0))   # leaned back a little so its face shows from above
if CHAR == "prisoner":
    for k, hk in (("forearm_l", "hand_l"), ("forearm_r", "hand_r")):
        h = P(hk); s = 1 if k.endswith("l") else -1
        if VAR != "v2":
            # the shackles are the anomaly, not the man: they are the one thing on him that glows in their own colour, wrists and ankles
            bpy.ops.mesh.primitive_torus_add(location=(h.x - s * 0.05, h.y, h.z), rotation=(0, math.pi / 2, 0), major_radius=0.078, minor_radius=0.04); attach(bpy.context.object, k, M_GLOW)
            for j in (1, 2, 3): box("chain", (h.x - s * 0.05, h.y + 0.05 * j, h.z - 0.07 - 0.035 * j), (0.03, 0.05, 0.03), k, M_GLOW, bevel=0.008)      # a few broken links hanging from each
            continue
        band("cuff", (h.x - s * 0.06, h.y, h.z), k, M_KIT, 0.075, 0.085)
        box("cuff_lock", (h.x - s * 0.06, h.y, h.z + 0.075), (0.06, 0.06, 0.035), k, M_GUN, bevel=0.008)
    for k in ("shin_l", "shin_r"):
        f = P(k.replace("shin", "foot")); bpy.ops.mesh.primitive_torus_add(location=(f.x, f.y + 0.02, f.z + 0.06), major_radius=0.062, minor_radius=0.032); attach(bpy.context.object, k, M_GLOW)
    arm.scale = (1.32, 1.30, 1.10)                       # a much bigger man: wide and deep, a little taller
if CHAR == "resident": arm.scale = (0.94, 0.90, 0.97)     # an ordinary inmate, on the thin side: nothing on him, nothing in his hands
arm.data.pose_position = "POSE"

# ---- the action
act = bpy.data.actions[ACTION]
if not arm.animation_data: arm.animation_data_create()
arm.animation_data.action = act
if hasattr(act, "slots") and len(act.slots): arm.animation_data.action_slot = act.slots[0]
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])

# ---- tactical movement: the clip's free-swinging arms are replaced by arms that hold the weapon. Each arm is aimed at an
# elbow point and then a hand point; the points ride on the chest, so the upper body still turns and bobs with the stride.
def fist(side):
    for pb in arm.pose.bones:
        n = pb.name.lower()
        if any(f in n for f in ("index", "middle", "ring", "pinky", "thumb")) and (n.endswith("_" + side) or n.endswith("." + side)):
            ls = pb.constraints.new("LIMIT_SCALE"); ls.owner_space = "LOCAL"
            for ax in "xyz": setattr(ls, "use_max_" + ax, True); setattr(ls, "max_" + ax, 0.05)
def hold(side, elbow, hand_pt):
    arm.data.pose_position = "REST"; bpy.context.view_layer.update(); ch = arm.matrix_world @ arm.pose.bones[bone("chest")].head; made = []
    for key, off in (("upper_" + side, elbow), ("forearm_" + side, hand_pt)):
        e = bpy.data.objects.new("hold_" + key, None); bpy.context.collection.objects.link(e); e.location = (ch.x + off[0], ch.y + off[1], ch.z + off[2])
        bpy.context.view_layer.update(); w = e.matrix_world.copy(); e.parent = arm; e.parent_type = "BONE"; e.parent_bone = bone("chest"); bpy.context.view_layer.update(); e.matrix_world = w
        c = arm.pose.bones[bone(key)].constraints.new("DAMPED_TRACK"); c.target = e; c.track_axis = "TRACK_Y"; made.append(e)
    cr = arm.pose.bones[bone("hand_" + side)].constraints.new("COPY_ROTATION"); cr.target = arm; cr.subtarget = bone("forearm_" + side); fist(side)
    arm.data.pose_position = "POSE"; bpy.context.view_layer.update(); return made
def keys(e, frames):                                 # move a hold point through chest-relative positions over the action: [(frame, (x, y, z)), ...]
    arm.data.pose_position = "REST"; bpy.context.view_layer.update(); ch = arm.matrix_world @ arm.pose.bones[bone("chest")].head
    for fr, off in frames:
        m = e.matrix_world.copy(); m.translation = Vector((ch.x + off[0], ch.y + off[1], ch.z + off[2])); e.matrix_world = m; bpy.context.view_layer.update(); e.keyframe_insert("location", frame=f0 + fr)
    arm.data.pose_position = "POSE"; bpy.context.view_layer.update()
def steady(key, influence):                          # keep a bone near its upright, forward-facing rest attitude while the legs run
    arm.data.pose_position = "REST"; bpy.context.view_layer.update()
    e = bpy.data.objects.new("steady_" + key, None); bpy.context.collection.objects.link(e); e.matrix_world = arm.matrix_world @ arm.pose.bones[bone(key)].matrix
    c = arm.pose.bones[bone(key)].constraints.new("COPY_ROTATION"); c.target = e; c.target_space = "WORLD"; c.owner_space = "WORLD"; c.influence = influence
    arm.data.pose_position = "POSE"; bpy.context.view_layer.update(); return e
def twist(e, frames):                                # turn a steadied bone about the vertical over the action: [(frame, degrees), ...] (+ = to the figure's left)
    from mathutils import Matrix
    base = e.matrix_world.copy(); e.rotation_mode = "QUATERNION"
    for fr, deg in frames: e.matrix_world = Matrix.Rotation(math.radians(deg), 4, "Z") @ base; bpy.context.view_layer.update(); e.keyframe_insert("rotation_quaternion", frame=f0 + fr)
if TAC and BASE in OPS and not NOWEAPON:
    SHOULDERED = CHAR == "reyes_rifle" or (BASE in ("miller", "fuse") and not CARRY)        # a long gun up in the shoulder, pointed
    CHEST = steady("chest", 1.0 if PROC or SHOULDERED else 0.8); steady("head", 0.8)        # a runner with a weapon keeps shoulders and eyes on the way ahead; the hips do the work
    if "Jog" in ACTION or "Sprint" in ACTION:        # the clip is an open-field jog with a long reaching stride; someone moving through a building in kit takes shorter, quicker steps
        steady("hips", float(os.environ.get("RP_HIPS", "0.85")))                    # and runs upright, not leaning into it, so the legs work under the body instead of trailing behind
        for k in ("thigh_l", "thigh_r"): steady(k, float(os.environ.get("RP_STRIDE", "0.3")))
        for k in ("shin_l", "shin_r"): steady(k, float(os.environ.get("RP_SHIN", "0.6")))   # no heel kicked up behind: from above that reads as a leg a metre long
    if BASE == "knox":   hold("l", (0.33, -0.12, -0.22), (0.15, -0.45, -0.09)); hold("r", (-0.31, -0.02, -0.27), (-0.21, -0.31, -0.20))        # shield up in front, gun at the hip
    elif SHOULDERED:                                      # the long rifle shouldered: right hand on the grip by the shoulder, left out under the fore-end
        RE, RH = (-0.34, -0.02, -0.22), (-0.15, -0.26, 0.02)
        er, hr = hold("r", RE, RH); hold("l", (0.14, -0.28, -0.22), (-0.17, -0.50 if BASE == "reyes" else -0.44, -0.02))
        # recoil: the rifle comes straight back into the shoulder and the shoulder gives, then both settle. One heavy shot, or three quick light ones.
        KICK = {"recoil": [(0, 0), (1, 0.08), (3, 0.055), (9, 0), (12, 0)], "burst": [(0, 0), (1, 0.05), (2, 0.02), (3, 0.012), (4, 0.05), (5, 0.022), (6, 0.014), (7, 0.05), (9, 0.022), (14, 0)],
                "auto": [(i, 0.034 if i % 2 else 0.012) for i in range(12)] + [(12, 0.012)]}.get(PROC)        # auto = a machine gun: twelve rounds a second for as long as the clip is looped
        if KICK:
            f1 = f0 + KICK[-1][0]; kick = lambda p, k: (p[0], p[1] + k, p[2])
            keys(er, [(f, kick(RE, k)) for f, k in KICK]); keys(hr, [(f, kick(RH, k)) for f, k in KICK]); twist(CHEST, [(f, -60 * k) for f, k in KICK])
    elif BASE in ("reyes", "cole"): hold("l", (0.26, -0.08, -0.25), (0.03, -0.37, -0.17)); hold("r", (-0.26, -0.08, -0.25), (-0.03, -0.37, -0.17))  # pistol low in both hands
    else:                                                 # long gun across the chest
        READY_E, READY_H = (-0.30, -0.02, -0.28), (-0.10, -0.27, -0.17)
        er, hr = hold("r", READY_E, READY_H); hold("l", (0.30, -0.14, -0.25), (0.15, -0.44, -0.10))
        # HOUND's hatchet exists only inside the chop: the right hand leaves the crossbow (the left keeps it at the chest), reaches back
        # over the shoulder, comes down with the hatchet in it, and goes back to the crossbow empty. Nothing to pose at rest.
        if PROC == "chop":
            # one compact overhand chop, 20 frames: draw back over the right shoulder, cut down and across in three frames, ride through, recover.
            # The shoulders wind up with the arm and unwind into the cut.
            f1 = f0 + 20
            keys(er, [(0, READY_E), (6, (-0.36, 0.14, 0.02)), (8, (-0.36, 0.12, 0.04)), (11, (-0.20, -0.24, -0.06)), (13, (-0.14, -0.22, -0.18)), (17, (-0.36, 0.04, -0.24)), (20, READY_E)])
            keys(hr, [(0, READY_H), (6, (-0.30, 0.30, 0.26)), (8, (-0.30, 0.32, 0.28)), (11, (-0.10, -0.60, -0.02)), (13, (0.04, -0.54, -0.26)), (17, (-0.31, -0.08, -0.52)), (20, READY_H)])   # 17: down to the belt, where the hatchet is put away
            twist(CHEST, [(0, 0), (6, -22), (8, -24), (11, 6), (13, 12), (17, 0), (20, 0)])

# ---- kneeling: the clip lays the trailing leg out straight behind, which from above reads as a leg a metre and a half long.
# Bring the trailing thigh and shin most of the way back under the body.
if "Kneeling" in ACTION:
    for k in ("thigh_l", "thigh_r"): steady(k, float(os.environ.get("RP_KNEEL_THIGH", "0.35")))
    for k in ("shin_l", "shin_r"): steady(k, float(os.environ.get("RP_KNEEL_SHIN", "0.7")))

# ---- a body on the floor: laid out straight it is three times the length of anyone standing, and reads as a giant. Draw the knees up
# (seen from above the legs shorten by a third) so it reads as a man who went down and stayed there.
if os.environ.get("RP_CURL") == "1":
    steady("thigh_l", 0.45); steady("thigh_r", 0.2); steady("shin_l", 0.85); steady("shin_r", 0.6)

# ---- one-handed shooting: the source clips are two-handed pistol stances, so the left arm is taken off the gun and
# pointed at the shield grip instead (upper arm to a point low at the front-left, forearm on to where the shield is held)
if CHAR == "knox" and SHIELD == "upright":
    for key, tgt in (("upper_l", (0.37, -0.15, 1.10)), ("forearm_l", (0.15, -0.47, 1.22))):
        e = bpy.data.objects.new("aim_" + key, None); bpy.context.collection.objects.link(e); e.location = tgt
        c = arm.pose.bones[bone(key)].constraints.new("DAMPED_TRACK"); c.target = e; c.track_axis = "TRACK_Y"
    # the wrist keeps its pose from the two-handed clip, which leaves the fist bent off the re-aimed forearm: make it follow straight on
    cr = arm.pose.bones[bone("hand_l")].constraints.new("COPY_ROTATION"); cr.target = arm; cr.subtarget = bone("forearm_l")
    for pb in arm.pose.bones:                          # the hand is closed on the shield grip: fold the open fingers away into a fist
        n = pb.name.lower()
        if any(f in n for f in ("index", "middle", "ring", "pinky", "thumb")) and (n.endswith("_l") or n.endswith(".l")):
            ls = pb.constraints.new("LIMIT_SCALE"); ls.owner_space = "LOCAL"
            for ax in "xyz": setattr(ls, "use_max_" + ax, True); setattr(ls, "max_" + ax, 0.05)

# ---- weapons for the rest of the squad. Built in the posed body at the first frame of the action: in the hands and pointed
# where the figure faces (aiming, firing), or carried across the chest (everything else). Chunky on purpose.
if BASE in OPS and BASE != "knox" and not NOWEAPON:
    bpy.context.scene.frame_set(f0); bpy.context.view_layer.update()
    hand = arm.matrix_world @ arm.pose.bones[bone("hand_r")].head; chest = arm.matrix_world @ arm.pose.bones[bone("chest")].head
    if CARRY: org = Vector((chest.x - 0.02, chest.y - 0.25, chest.z - 0.10)); d = Vector((0.62, -0.78, 0)).normalized(); key = "chest"       # low ready: muzzle forward and to the left
    else: org = Vector((hand.x, hand.y, hand.z)); d = Vector((0.0, -1, 0)); key = "hand_r"
    side = Vector((-d.y, d.x, 0)); yaw = math.atan2(d.y, d.x) - math.pi / 2
    KICK = globals().get("KICK")
    def ride(parts):                                      # a chest-mounted gun comes straight back with the hands on each shot
        inv = (arm.matrix_world @ arm.pose.bones[bone("chest")].matrix).to_3x3().inverted()
        for o in parts:
            for fr, k in KICK: o.delta_location = inv @ Vector((0, k, 0)); o.keyframe_insert("delta_location", frame=f0 + fr)
    def part(name, fwd, size, m=M_GUN, lat=0.0, dz=0.0, turn=0.0, bevel=0.01):
        c = org + d * fwd + side * lat; return box(name, (c.x, c.y, org.z + dz), size, key, m, rot=(0, 0, yaw + turn), bevel=bevel)
    if BASE == "hound":
        b = -0.30 if not CARRY else -0.25                # the hands hold it by the middle of the stock
        part("stock", b + 0.25, (0.075, 0.58, 0.07)); part("butt", b - 0.05, (0.10, 0.10, 0.09), M_KIT)
        F, HW, SW = b + 0.50, 0.31, 0.13                 # the bow sits across the front: half-width, and how far the tips sweep back
        for i in range(-4, 5):                           # one curved prod, built from short pieces
            lat = HW * i / 4.5; part("prod", F - SW * (lat / HW) ** 2, (HW / 4.5 + 0.012, 0.055, 0.05), M_KIT, lat=lat, turn=math.atan(2 * SW * lat / HW ** 2), bevel=0.012)
        tipf = F - SW * (4 / 4.5) ** 2; latch = b + 0.20; L = math.hypot(HW * 4 / 4.5, tipf - latch)
        for sgn in (-1, 1): part("string", (tipf + latch) / 2, (L, 0.014, 0.014), M_GLOW, lat=sgn * HW * 2 / 4.5, turn=-sgn * math.atan2(tipf - latch, HW * 4 / 4.5), dz=0.02, bevel=0)   # cocked: drawn back to the latch in a V
        def broadhead(f_base, length, half):                 # a flat arrowhead: point forward, two barbs swept back. Its origin is its middle, so it also marks where the bolt leaves from
            pts = [(f_base + length, 0.0), (f_base, half), (f_base + length * 0.28, 0.0), (f_base, -half)]; cen = org + d * (f_base + length * 0.5); cen.z = org.z + 0.045
            me = bpy.data.meshes.new("muzzle"); bm = bmesh.new(); up = Vector((0, 0, 0.012))
            top = [bm.verts.new(org + d * f + side * l + Vector((0, 0, 0.045)) + up - cen) for f, l in pts]; bot = [bm.verts.new(v.co - 2 * up) for v in top]
            bm.faces.new(top); bm.faces.new(bot[::-1])
            for i in range(4): j = (i + 1) % 4; bm.faces.new((top[i], bot[i], bot[j], top[j]))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
            o = bpy.data.objects.new("muzzle", me); bpy.context.collection.objects.link(o); o.location = cen; bpy.context.view_layer.update(); attach(o, key, M_GLOW); return o
        bolt = [part("bolt", b + 0.40, (0.024, 0.40, 0.024), M_GLOW, dz=0.045, bevel=0), broadhead(b + 0.58, 0.15, 0.058)]
        BOLT = os.environ.get("RP_BOLT", "")             # "fired": gone from the third frame; "reload": absent until the new one is seated
        if BOLT:
            cut = f0 + 2 if BOLT == "fired" else f0 + int((f1 - f0) * 0.62)
            for o in bolt:
                for fr, hide in ((f0, BOLT == "reload"), (cut, BOLT == "fired")): o.hide_render = hide; o.keyframe_insert("hide_render", frame=fr)
                for fc in (o.animation_data.action.fcurves if o.animation_data and o.animation_data.action and hasattr(o.animation_data.action, "fcurves") else []): 
                    for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
    if CHAR == "hound_axe":
        if PROC == "chop": bpy.context.scene.frame_set(f0 + 11); bpy.context.view_layer.update()      # built as it is at the moment it lands, so the head lies flat to the camera there
        pb = arm.pose.bones[bone("hand_r")]; M = arm.matrix_world @ pb.matrix; ax = {"x": 0, "y": 1, "z": 2}[AXE_AXIS.strip("-")]
        a3 = M.to_3x3().col[ax].normalized() * (-1 if AXE_AXIS.startswith("-") else 1); org = M.translation
        q = a3.to_track_quat("Y", "Z").to_euler(); sd = a3.cross(Vector((0, 0, 1))); sd = sd.normalized() if sd.length > 0.1 else Vector((1, 0, 0))
        axe = []; c = org + a3 * 0.17; axe.append(box("haft", (c.x, c.y, c.z), (0.04, 0.50, 0.04), "hand_r", M_GUN, rot=q, bevel=0.008))
        # the head is a hatchet's wedge, laid flat to the camera so its outline shows: narrow at the eye, flaring to a curved bit
        sd = -sd; up = a3.cross(sd).normalized(); prof = [(0.0, 0.33), (0.0, 0.43), (0.09, 0.46), (0.17, 0.49), (0.20, 0.39), (0.17, 0.28), (0.09, 0.31)]
        me = bpy.data.meshes.new("axe_head"); bm = bmesh.new(); top = [bm.verts.new(org + a3 * y + sd * x + up * 0.02) for x, y in prof]; bot = [bm.verts.new(org + a3 * y + sd * x - up * 0.02) for x, y in prof]
        bm.faces.new(top); bm.faces.new(bot[::-1])
        for i in range(len(prof)): j = (i + 1) % len(prof); bm.faces.new((top[i], bot[i], bot[j], top[j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free(); hd_o = bpy.data.objects.new("axe_head", me); bpy.context.collection.objects.link(hd_o); bpy.context.view_layer.update(); attach(hd_o, "hand_r", M_GLOW); axe.append(hd_o)
        c = org + a3 * 0.37 - sd * 0.045; axe.append(box("poll", (c.x, c.y, c.z), (0.05, 0.09, 0.05), "hand_r", M_KIT, rot=q, bevel=0.008))
        fist("r"); fist("l")
        if PROC == "chop":                                # in the hand only from the top of the reach back until the hand is on its way home
            A0, A1 = int(os.environ.get("RP_AXE_IN", "5")), int(os.environ.get("RP_AXE_OUT", "17"))
            for o in axe:
                for fr, hide in ((f0, True), (f0 + A0, False), (f0 + A1, True)): o.hide_render = hide; o.keyframe_insert("hide_render", frame=fr)
                for fc in (o.animation_data.action.fcurves if o.animation_data and o.animation_data.action and hasattr(o.animation_data.action, "fcurves") else []):
                    for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
            bpy.context.scene.frame_set(f0); bpy.context.view_layer.update()
    elif CHAR == "reyes_rifle":                           # scoped bolt-action rifle, held by the grip: about 1.2 m from butt to brake
        # It lies along the way she faces with the butt in the right shoulder, fixed to the chest (not to a wrist), so it stays level and true.
        org = Vector((chest.x - 0.13, chest.y - 0.30, chest.z + 0.14)); d = Vector((0.0, -1, 0)); key = "chest"; side = Vector((-d.y, d.x, 0)); yaw = math.atan2(d.y, d.x) - math.pi / 2
        rifle = [part("stock", -0.20, (0.10, 0.30, 0.09)), part("receiver", 0.07, (0.11, 0.26, 0.09)), part("scope", 0.08, (0.055, 0.28, 0.055), M_KIT, dz=0.075),
                 part("handguard", 0.32, (0.085, 0.26, 0.065)), part("barrel", 0.66, (0.048, 0.44, 0.04)), part("muzzle", 0.91, (0.08, 0.08, 0.055), M_KIT)]
        if KICK: ride(rifle)
    elif BASE in ("reyes", "cole"):
        if not CARRY or TAC:                              # pistol: in the hands when pointed or at low ready; otherwise holstered and unseen
            if CARRY: org = Vector((hand.x, hand.y, hand.z)); d = Vector((0.0, -1, 0)); key = "hand_r"; side = Vector((1, 0, 0)); yaw = math.pi
            part("slide", 0.11, (0.055, 0.23, 0.06))
            if BASE == "reyes": part("suppressor", 0.315, (0.044, 0.18, 0.044)); part("muzzle", 0.415, (0.03, 0.02, 0.03))     # hers is suppressed: a long can on the front, which also tells her pistol from COLE's
            else: part("muzzle", 0.235, (0.04, 0.02, 0.04))
    elif BASE == "fuse":                                  # belt-fed machine gun: the biggest gun in the squad. Fat receiver, a dark ammunition box hung on its left side, heavy barrel, folded bipod
        g = -0.06
        if not CARRY:
            org = Vector((chest.x - 0.15, chest.y - 0.28, chest.z + 0.10)); d = Vector((0.0, -1, 0)); key = "chest"; side = Vector((-d.y, d.x, 0)); yaw = math.atan2(d.y, d.x) - math.pi / 2; g = 0.0
        rifle = [part("stock", g - 0.22, (0.095, 0.24, 0.09)), part("receiver", g + 0.08, (0.135, 0.38, 0.10)), part("cover", g + 0.10, (0.06, 0.22, 0.04), M_KIT, dz=0.07),
                 part("ammo_box", g + 0.12, (0.14, 0.18, 0.11), M_KIT, lat=0.135, dz=-0.02, bevel=0.02), part("shroud", g + 0.42, (0.085, 0.30, 0.075)), part("barrel", g + 0.68, (0.05, 0.24, 0.045)),
                 part("muzzle", g + 0.82, (0.065, 0.05, 0.055), M_KIT), part("bipod_l", g + 0.50, (0.022, 0.24, 0.02), M_KIT, lat=0.07, dz=-0.03), part("bipod_r", g + 0.50, (0.022, 0.24, 0.02), M_KIT, lat=-0.07, dz=-0.03)]
        if not CARRY and KICK: ride(rifle)
    elif BASE == "miller":                                # carbine: light-coloured and thick so it reads as a gun, with a dark sight, a dark magazine out of the left side and a dark flash hider
        g = -0.10                                         # where the grip is along it; carried, it hangs across the chest
        if not CARRY:                                     # shouldered: fixed to the chest with the butt in the right shoulder, like the long rifle
            org = Vector((chest.x - 0.13, chest.y - 0.30, chest.z + 0.14)); d = Vector((0.0, -1, 0)); key = "chest"; side = Vector((-d.y, d.x, 0)); yaw = math.atan2(d.y, d.x) - math.pi / 2; g = 0.0
        rifle = [part("stock", g - 0.20, (0.085, 0.22, 0.085)), part("receiver", g + 0.04, (0.105, 0.28, 0.09)), part("optic", g + 0.04, (0.05, 0.11, 0.05), M_KIT, dz=0.07),
                 part("mag", g + 0.10, (0.09, 0.075, 0.05), M_KIT, lat=0.085), part("handguard", g + 0.30, (0.085, 0.26, 0.07)), part("barrel", g + 0.50, (0.045, 0.16, 0.04)), part("muzzle", g + 0.60, (0.06, 0.05, 0.05), M_KIT)]
        if not CARRY and KICK: ride(rifle)

# ---- KNOX's pump shotgun. It rides at his right hip and always lies along the way he faces (it is not glued to the
# wrist), so from above it reads as a gun carried at the hip: wide stock, receiver, fat ribbed pump, thin barrel.
if CHAR == "knox" and VAR == "v1":                     # first pass: a plain long box in the right hand
    sc0 = bpy.context.scene; sc0.frame_set(f0); bpy.context.view_layer.update()
    hd = arm.matrix_world @ arm.pose.bones[bone("hand_r")].head; d = Vector((0.12, -1, 0)).normalized(); q = d.to_track_quat("Y", "Z").to_euler()
    # short pistol-grip breaching shotgun, the kind a shield man fires one-handed: a fat receiver, a fatter pump, a stub of barrel.
    # Wider than life so it reads from above as a chunk of gun in the fist, not as a rod.
    for nm, off, size, dz, m in (("receiver", 0.07, (0.085, 0.24, 0.10), 0.0, M_GUN), ("pump", 0.25, (0.11, 0.15, 0.09), -0.01, M_KIT),
                                 ("barrel", 0.37, (0.06, 0.13, 0.06), 0.02, M_GUN), ("muzzle", 0.44, (0.075, 0.03, 0.075), 0.02, M_GUN)):
        c = hd + d * off; box(nm, (c.x, c.y, hd.z + dz), size, "hand_r", m, rot=q, bevel=0.012)
if CHAR == "knox" and VAR != "v1":
    root = bpy.data.objects.new("gun_root", None); bpy.context.collection.objects.link(root)
    cl = root.constraints.new("COPY_LOCATION"); cl.target = arm; cl.subtarget = bone("chest")   # carried at the right hip, whatever the right arm is doing
    root.rotation_euler = Euler((0, 0, math.radians(-4))); root.scale = (1.55, 0.72, 1.2)   # shorter and fatter than life so it reads at this size
    def part(name, y, size, z=0.0, m=M_GUN, bevel=0.008):   # y = metres forward of the grip (the character faces -Y)
        o = box(name, (0, 0, 0), size, None, m, bevel=bevel); o.parent = root; o.location = (-0.19, -y - 0.22, z - 0.30); return o
    part("stock", -0.27, (0.062, 0.30, 0.10), -0.02, bevel=0.02)
    part("stock_pad", -0.43, (0.07, 0.03, 0.12), -0.02)
    part("receiver", 0.02, (0.058, 0.30, 0.085), 0.0)
    part("ejection_port", 0.04, (0.064, 0.09, 0.03), 0.045, M_KIT)
    part("pump", 0.33, (0.082, 0.24, 0.07), -0.02, M_KIT, 0.02)
    for i in range(5): part("pump_rib", 0.24 + i * 0.045, (0.09, 0.014, 0.075), -0.02, M_GUN, 0.0)
    part("barrel", 0.55, (0.03, 0.78, 0.03), 0.03)
    part("mag_tube", 0.44, (0.036, 0.50, 0.03), -0.015)
    part("muzzle", 0.94, (0.042, 0.03, 0.042), 0.03)
    part("bead", 0.91, (0.012, 0.012, 0.03), 0.055)

# ---- camera straight down, turned so the character's forward (-Y) is image-right
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); bpy.context.collection.objects.link(cam)
cam.data.type = "ORTHO"; cam.data.ortho_scale = SPAN; cam.location = (0, 0, 10); cam.rotation_euler = (0, 0, -math.pi / 2)
sc = bpy.context.scene; sc.camera = cam
ids = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
sc.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in ids else "BLENDER_EEVEE_NEXT"
sc.render.resolution_x = sc.render.resolution_y = SIZE; sc.render.film_transparent = True
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Raw" if "Raw" in [i.identifier for i in sc.view_settings.bl_rna.properties["view_transform"].enum_items] else "Standard"
try: sc.eevee.taa_render_samples = 8
except Exception: pass
def ground_speed():
    fl, fr = arm.pose.bones[bone("foot_l")], arm.pose.bones[bone("foot_r")]; ys = []
    for f in range(f0, f1 + 1): bpy.context.scene.frame_set(f); ys.append(((arm.matrix_world @ fl.head).y, (arm.matrix_world @ fr.head).y))
    fps = bpy.context.scene.render.fps; v = sorted(max((ys[i + 1][k] - ys[i][k]) * fps for k in (0, 1)) for i in range(len(ys) - 1))
    return round(v[int(len(v) * 0.6)], 3) if v else 0.0          # forward is -Y, so the planted foot moves +Y
SPEED = ground_speed() if any(k in ACTION for k in ("Walk", "Jog", "Sprint", "Crouch_Fwd")) else 0.0
os.makedirs(OUT, exist_ok=True); n = 0; MUZZLE = []; TIP = []
for f in os.listdir(OUT):
    if f.endswith(".png"): os.remove(os.path.join(OUT, f))
for f in range(f0, f1 + 1, STEP):
    sc.frame_set(f)
    if FOLLOW:                                          # the clip carries the figure across the floor: keep the camera over the hips, the timeline does the travelling
        hp = arm.matrix_world @ arm.pose.bones[bone("hips")].head
        cam.location.x, cam.location.y = hp.x, hp.y; bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(OUT, f"{n:04d}.png"); bpy.ops.render.render(write_still=True); n += 1
    ah = bpy.data.objects.get("axe_head")               # where the blade is in this frame, for the trail it leaves in a swing
    if ah: w = ah.matrix_world @ (sum((v.co for v in ah.data.vertices), Vector()) / len(ah.data.vertices)); TIP.append([round(-(w.y - cam.location.y), 4), round(-(w.x - cam.location.x), 4)])
    mz = bpy.data.objects.get("muzzle")                 # where the muzzle is in this frame: metres ahead of, and to the right of, the figure's centre
    if mz: w = mz.matrix_world.translation; MUZZLE.append([round(-(w.y - cam.location.y) + 0.02, 4), round(-(w.x - cam.location.x), 4)])
json.dump({"action": ACTION, "char": CHAR, "frames": n, "fps": sc.render.fps / STEP, "size": SIZE, "span_m": SPAN, **({"muzzle_m": MUZZLE} if MUZZLE else {}), **({"tip_m": TIP} if TIP else {}), **({"speed_mps": SPEED} if SPEED > 0.2 else {})}, open(os.path.join(OUT, "meta.json"), "w"))
print("RENDERED", n, "frames ->", OUT)
