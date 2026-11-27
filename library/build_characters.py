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
            "kneel": C(UAL1, "Fixing_Kneeling", **o), "hit": C(UAL1, "Hit_Chest", **o), "death": C(UAL1, "Death01", follow=1, span=3.6, **o), "carry": C(UAL2, "Walk_Carry_Loop", build=build, noweapon=1)}
gun = lambda build, **x: {"aim": C(UAL1, "Pistol_Idle_Loop", build=build), "shoot": C(UAL1, "Pistol_Shoot", build=build, **x)}
CHARS = {
    "knox": {"tint": ["cold", "#6fdcff"], "actions": {
        "idle": C(UAL1, "Idle_Loop", build="knox", tac=1), "walk": C(UAL1, "Walk_Loop", build="knox", tac=1), "run": C(UAL1, "Jog_Fwd_Loop", build="knox", tac=1),
        "hit": C(UAL1, "Hit_Chest", build="knox"), "death": C(UAL1, "Death01", build="knox", follow=1, span=3.6),
        "guard": C(UAL2, "Idle_Shield_Loop", build="knox"), "bash": C(UAL2, "Shield_OneShot", build="knox"),
        "aim": C(UAL1, "Pistol_Idle_Loop", build="knox", shield="upright"), "shoot": C(UAL1, "Pistol_Shoot", build="knox", shield="upright")}},
    "hound": {"tint": ["cold", "#a6e36e"], "actions": {**common("hound_bow"), **gun("hound_bow", bolt="fired"), "reload": C(UAL1, "Pistol_Reload", build="hound_bow", bolt="reload"),
        "chop": C(UAL1, "Idle_Loop", build="hound_axe", tac=1, carry=1, proc="chop")}},      # the hatchet is seen only in the chop; it starts and ends in "idle"
    "reyes": {"tint": ["cold", "#b9a4ff"], "actions": {**common("reyes"), **gun("reyes"),          # pistol in the hands, long rifle on the back; unslung only to shoot with it
        "snipe_aim": C(UAL1, "Crouch_Idle_Loop", build="reyes_rifle", tac=1, span=3.4), "snipe_shoot": C(UAL1, "Crouch_Idle_Loop", build="reyes_rifle", tac=1, span=3.4, proc="recoil"),
        "slide": C(UAL2, "Slide_Loop", build="reyes", carry=1, follow=1, span=3.0)}},
    "miller": {"tint": ["cold", "#f2f6f7"], "actions": {**common("miller"),                       # rifleman: carbine shouldered to shoot, three-round bursts
        "aim": C(UAL1, "Idle_Loop", build="miller", tac=1, span=3.0), "shoot": C(UAL1, "Idle_Loop", build="miller", tac=1, span=3.0, proc="burst")}},
    # demolitions and the squad's heavy fire: machine gun shouldered, fired in a looped burst; throws and plants charges (the charge itself is drawn by the renderer)
    "fuse": {"tint": ["cold", "#ffd23f"], "actions": {**common("fuse"), "aim": C(UAL1, "Idle_Loop", build="fuse", tac=1, span=3.2), "fire": C(UAL1, "Idle_Loop", build="fuse", tac=1, span=3.2, proc="auto"),
        "throw": C(UAL2, "OverhandThrow", build="fuse", noweapon=1), "plant": C(UAL1, "PickUp_Table", build="fuse", noweapon=1)}},
    "cole": {"tint": ["cold", "#f2f6f7"], "actions": {**common("cole"), **gun("cole"),              # recovery: kneels over what is found, walks it out in a sealed case
        "carry_case": C(UAL2, "Walk_Carry_Loop", build="cole", noweapon=1, load="case")}},
    # the place's own: inmates still lined up for a count. Same body rendered once, tinted twice: unnoticed (dim) and roused.
    "resident_dim": {"tint": ["ember"], "actions": {"stand": C(UAL1, "Idle_Loop", build="resident"), "walk": C(UAL1, "Walk_Loop", build="resident"), "down": C(UAL2, "Hit_Knockback", build="resident", follow=1, span=3.6)}},
    "resident": {"tint": ["roused"], "actions": {"turn": C(UAL1, "Hit_Head", build="resident"), "idle": C(UAL2, "Zombie_Idle_Loop", build="resident"), "walk": C(UAL2, "Zombie_Walk_Fwd_Loop", build="resident"),
        "attack": C(UAL2, "Zombie_Scratch", build="resident"), "hit": C(UAL1, "Hit_Chest", build="resident"), "down": C(UAL2, "Hit_Knockback", build="resident", follow=1, span=3.6), "down2": C(UAL1, "Death01", build="resident", follow=1, span=3.6)}},
    # more bodies for the block, so a row of men is not one man copied: a heavy one, a tall one, and the officers (cap, belt, baton)
    **{f"resident_dim{sfx}": {"tint": ["ember"], "actions": {"stand": C(UAL1, "Idle_Loop", build=bd), "walk": C(UAL1, "Walk_Loop", build=bd)}} for sfx, bd in (("_b", "resident_b"), ("_c", "resident_c"), ("_g", "guard"))},
    **{f"resident{sfx}": {"tint": ["roused"], "actions": {"turn": C(UAL1, "Hit_Head", build=bd), "idle": C(UAL2, "Zombie_Idle_Loop", build=bd), "walk": C(UAL2, "Zombie_Walk_Fwd_Loop", build=bd),
        "attack": C(UAL2, "Zombie_Scratch", build=bd), "hit": C(UAL1, "Hit_Chest", build=bd), "down": C(UAL2, "Hit_Knockback", build=bd, follow=1, span=3.6), "down2": C(UAL1, "Death01", build=bd, follow=1, span=3.6)}}
       for sfx, bd in (("_b", "resident_b"), ("_c", "resident_c"), ("_g", "guard"))},
    # a man of Team 04, seven days dead: the same body and kit as the squad, with the heat gone out of it. Only ever seen lying where he fell.
    "t04": {"tint": ["cold", "#8ba2aa"], "actions": {"death": C(UAL1, "Death01", build="miller", follow=1, span=3.6), "lying": C(UAL2, "LayToIdle", build="miller", follow=1, noweapon=1, curl=1)}},
    "prisoner": {"tint": ["boss", "#62c4ff"], "actions": {
        "idle": C(UAL1, "Idle_Loop", build="prisoner"), "walk": C(UAL1, "Walk_Loop", build="prisoner"), "punch": C(UAL1, "Punch_Cross", build="prisoner"), "sit": C(UAL1, "Sitting_Idle_Loop", build="prisoner"),
        "hit": C(UAL1, "Hit_Chest", build="prisoner"), "knockback": C(UAL2, "Hit_Knockback", build="prisoner", follow=1, span=3.6),
        "run": C(UAL1, "Sprint_Loop", build="prisoner"), "leap": C(UAL2, "NinjaJump_Idle_Loop", build="prisoner", follow=1, span=3.0)}},
}
for name in (sys.argv[1:] or CHARS):
    c = CHARS[name]
    for act, (glb, src, o) in c["actions"].items():
        if os.environ.get("ONLY") and act not in os.environ["ONLY"].split(","): continue
        env = dict(os.environ, RP_VARIANT="v1", RP_SHIELD=o.get("shield", "arm"), RP_CARRY=str(o.get("carry", 0)), RP_NOWEAPON=str(o.get("noweapon", 0)), RP_TAC=str(o.get("tac", 0)), RP_PROC=o.get("proc", ""), RP_BOLT=o.get("bolt", ""), RP_FOLLOW=str(o.get("follow", 0)), RP_LOAD=o.get("load", ""), RP_CURL=str(o.get("curl", 0)))
        span = o.get("span", SPAN); size = int(round(SIZE * span / SPAN / 2) * 2)       # a wider frame keeps the same pixels per metre
        raw = os.path.join(tempfile.gettempdir(), "rp_sprites", name, act); out = os.path.join(ROOT, "characters" + os.environ.get("RP_OUT_SUFFIX", ""), name, act)
        r = subprocess.run([BLENDER, "-b", "--python", os.path.join(ROOT, "blender", "render_sprites.py"), "--", glb, src, o["build"], raw, str(size), str(span)], capture_output=True, text=True, env=env)
        if "RENDERED" not in r.stdout: print(r.stdout[-1500:], r.stderr[-800:]); sys.exit(1)
        if os.path.isdir(out):
            for old in os.listdir(out):
                if old.endswith(".png"): os.remove(os.path.join(out, old))
        for attempt in range(3):                       # a frame can be briefly locked by a scanner right after Blender writes it
            cz = subprocess.run([sys.executable, os.path.join(ROOT, "blender", "colorize.py"), raw, out, *c["tint"]], capture_output=True, text=True)
            if cz.returncode == 0: break
            import time; time.sleep(2)
        else: print(cz.stderr[-600:]); sys.exit(1)
        meta = json.load(open(os.path.join(raw, "meta.json"), encoding="utf8")); meta.update(source=f"Quaternius Universal Animation Library (CC0) / {src}")
        json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1); print(name, act, meta["frames"], "frames")
