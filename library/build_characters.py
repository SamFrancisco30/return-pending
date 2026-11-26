"""Builds the character sprite library: every (character, action) is rendered once by Blender and tinted once.
   python library/build_characters.py [char ...]
   Sources are the CC0 Quaternius Universal Animation Library 1 and 2 in library/_sources (not committed)."""
import subprocess, sys, os, json, tempfile
ROOT = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.environ.get("BLENDER", r"C:\Tools\Blender\blender-5.2.2-windows-x64\blender.exe")
Q = os.path.join(ROOT, "_sources", "quaternius")
UAL1 = os.path.join(Q, "Animation Library[Standard]", "Godot", "AnimationLibrary_Godot_Standard.glb")
UAL2 = os.path.join(Q, "Universal Animation Library 2 [Standard]", "Unreal-Godot", "UAL2_Standard.glb")
SIZE, SPAN = 384, 2.6
C = lambda glb, src, **o: (glb, src, o)
def common(build, shield=None):                     # what everyone can do; weapons are carried, not pointed
    o = {"build": build, "carry": 1}; t = dict(o, tac=1)        # tac: arms stay on the weapon
    return {"idle": C(UAL1, "Idle_Loop", **t), "walk": C(UAL1, "Walk_Loop", **t), "run": C(UAL1, "Jog_Fwd_Loop", **t), "crouch": C(UAL1, "Crouch_Idle_Loop", **t),
            "kneel": C(UAL1, "Fixing_Kneeling", **o), "hit": C(UAL1, "Hit_Chest", **o), "death": C(UAL1, "Death01", **o), "carry": C(UAL2, "Walk_Carry_Loop", build=build, noweapon=1)}
gun = lambda build: {"aim": C(UAL1, "Pistol_Idle_Loop", build=build), "shoot": C(UAL1, "Pistol_Shoot", build=build)}
CHARS = {
    "knox": {"tint": ["cold", "#6fdcff"], "actions": {
        "idle": C(UAL1, "Idle_Loop", build="knox", tac=1), "walk": C(UAL1, "Walk_Loop", build="knox", tac=1), "run": C(UAL1, "Jog_Fwd_Loop", build="knox", tac=1),
        "hit": C(UAL1, "Hit_Chest", build="knox"), "death": C(UAL1, "Death01", build="knox"),
        "guard": C(UAL2, "Idle_Shield_Loop", build="knox"), "bash": C(UAL2, "Shield_OneShot", build="knox"),
        "aim": C(UAL1, "Pistol_Idle_Loop", build="knox", shield="upright"), "shoot": C(UAL1, "Pistol_Shoot", build="knox", shield="upright")}},
    "hound": {"tint": ["cold", "#a6e36e"], "actions": {**common("hound_bow"), **gun("hound_bow"),
        "axe_idle": C(UAL1, "Sword_Idle", build="hound_axe"), "chop": C(UAL1, "Sword_Attack", build="hound_axe"), "axe_walk": C(UAL1, "Walk_Loop", build="hound_axe")}},
    "reyes": {"tint": ["cold", "#b9a4ff"], "actions": {**common("reyes"), **gun("reyes")}},
    "miller": {"tint": ["cold", "#f0df7c"], "actions": {**common("miller"), **gun("miller")}},
    "cole": {"tint": ["cold", "#f2f6f7"], "actions": {**common("cole"), **gun("cole")}},
    "prisoner": {"tint": ["hot"], "actions": {
        "idle": C(UAL1, "Idle_Loop", build="prisoner"), "walk": C(UAL1, "Walk_Loop", build="prisoner"), "punch": C(UAL1, "Punch_Cross", build="prisoner"), "sit": C(UAL1, "Sitting_Idle_Loop", build="prisoner"),
        "hit": C(UAL1, "Hit_Chest", build="prisoner"), "knockback": C(UAL2, "Hit_Knockback", build="prisoner")}},
}
for name in (sys.argv[1:] or CHARS):
    c = CHARS[name]
    for act, (glb, src, o) in c["actions"].items():
        if os.environ.get("ONLY") and act not in os.environ["ONLY"].split(","): continue
        env = dict(os.environ, RP_VARIANT="v1", RP_SHIELD=o.get("shield", "arm"), RP_CARRY=str(o.get("carry", 0)), RP_NOWEAPON=str(o.get("noweapon", 0)), RP_TAC=str(o.get("tac", 0)))
        raw = os.path.join(tempfile.gettempdir(), "rp_sprites", name, act); out = os.path.join(ROOT, "characters" + os.environ.get("RP_OUT_SUFFIX", ""), name, act)
        r = subprocess.run([BLENDER, "-b", "--python", os.path.join(ROOT, "blender", "render_sprites.py"), "--", glb, src, o["build"], raw, str(SIZE), str(SPAN)], capture_output=True, text=True, env=env)
        if "RENDERED" not in r.stdout: print(r.stdout[-1500:], r.stderr[-800:]); sys.exit(1)
        subprocess.run([sys.executable, os.path.join(ROOT, "blender", "colorize.py"), raw, out, *c["tint"]], check=True, capture_output=True)
        meta = json.load(open(os.path.join(raw, "meta.json"), encoding="utf8")); meta.update(source=f"Quaternius Universal Animation Library (CC0) / {src}")
        json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1); print(name, act, meta["frames"], "frames")
