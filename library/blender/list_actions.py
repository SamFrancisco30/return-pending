import bpy, sys, json
out = {}
for p in sys.argv[sys.argv.index("--") + 1:]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=p)
    out[p] = {"actions": sorted((a.name, int(a.frame_range[0]), int(a.frame_range[1])) for a in bpy.data.actions),
              "objects": [(o.name, o.type, [round(d, 2) for d in o.dimensions]) for o in bpy.data.objects],
              "bones": len(next((o for o in bpy.data.objects if o.type == "ARMATURE")).data.bones), "fps": bpy.context.scene.render.fps}
json.dump(out, open(sys.argv[sys.argv.index("--") + 1].rsplit("\\", 1)[0].rsplit("/", 1)[0] + "/../../actions_list.json", "w"), indent=1)
