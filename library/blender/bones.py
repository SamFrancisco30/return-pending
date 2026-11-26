import bpy, sys
p = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
print("BONES", [b.name for b in arm.data.bones if b.use_deform or True])
print("ARM", arm.name, tuple(arm.rotation_euler), tuple(arm.scale), [ (o.name, o.parent.name if o.parent else None, [m.type for m in o.modifiers]) for o in bpy.data.objects])
m = bpy.data.objects["Mannequin"]; print("MATS", [s.material.name for s in m.material_slots], "VERTS", len(m.data.vertices))
import mathutils
for n in ["Head","head","hand_r","hand_l","lowerarm_l","spine_03"]:
    b = arm.pose.bones.get(n)
    if b: print(n, [round(v,2) for v in (arm.matrix_world @ b.head)], [round(v,2) for v in (arm.matrix_world @ b.tail)])
