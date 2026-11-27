"""FILE 001 script v3: checks that the new second act and the dialogue can happen in the time and space the script gives them.
   python episodes/file_001_deathrow/validate_v3.py        (run from C:\\Sam)
Coordinates are metres on scene/greyrock_block.json (x along the hall from the left wall, y down). Death row itself is
checked by build_timeline.mjs, which this script runs and reads."""
import json, math, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = json.load(open(os.path.join(ROOT, "scene", "greyrock_block.json"), encoding="utf8")); O = S["origin"]; PPM = O["pxPerM"]
m = lambda px, py: ((px - O["x"]) / PPM, (py - O["y"]) / PPM)
fails = []
def check(name, ok, detail): print(f"  [{'OK' if ok else 'FAIL'}] {name}: {detail}"); (ok or fails.append(name))
def clock(t): t = round(t, 1); return f"{int(t // 60)}:{t % 60:04.1f}"
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])

# ---------- the room ----------
doors = {d["id"]: d for d in S["doors"]}
top = [m(doors[f"T{i}"]["hx"] + doors[f"T{i}"]["width"] / 2, doors[f"T{i}"]["hy"]) for i in range(1, 12)]        # cell fronts of the upper row, left to right
PITCH = top[1][0] - top[0][0]; Y_TOP, Y_BOT, Y_MID = top[0][1], m(0, 608)[1], m(0, 440)[1]
CAGE, WING = m(1072, 324), m(1075, 608)                                                                           # the control cage and the mouth of the side wing
print(f"room: cells every {PITCH:.1f} m, upper fronts y={Y_TOP:.1f}, lower y={Y_BOT:.1f}, cage at ({CAGE[0]:.1f},{CAGE[1]:.1f}), wing mouth at ({WING[0]:.1f},{WING[1]:.1f})")

# ---------- second act, beat by beat (seconds from the start of the film) ----------
print("\nACT 2")
WALK, NOD = 1.2, 0.7; PER = PITCH / WALK + NOD                                    # the officer: walks to the next door, stops, nods
T_BELL, T_START = 35.0, 40.0                                                       # recount bell; he has crossed the hall and is at cell 1 again
cross = (Y_BOT - Y_TOP) / WALK
check("officer crosses the hall between the bell and cell 1", cross <= T_START - T_BELL + 0.2, f"{cross:.1f} s needed, {T_START - T_BELL:.1f} s given")
OPEN = 5; t_open = T_START + (OPEN - 1) * PER                                      # the open, empty cell is the 5th
check("officer reaches the open cell when the script says (0:54)", abs(t_open + NOD - 54.0) <= 1.5, f"arrives {clock(t_open)}, has looked and found it short by {clock(t_open + NOD)}")
squad_v = (top[OPEN - 1][0] - 1.0 - 3.0) / (50.0 - 37.0)
check("squad reaches the open cell at a careful walk", 0.7 <= squad_v <= 1.3, f"{top[OPEN - 1][0] - 4.0:.1f} m in 13 s = {squad_v:.2f} m/s")
door = top[OPEN - 1]
pos = {"REYES": (door[0] + 0.4, door[1] + 0.9), "COLE": (door[0] - 1.0, door[1] + 1.4), "MILLER": (door[0] + 1.1, door[1] + 1.6), "KNOX": (door[0] - 0.5, door[1] + 2.7), "HOUND": (door[0] + 2.3, door[1] + 2.3)}
d = sorted((dist(p, door), k) for k, p in pos.items()); REACH = 2.5
check("REYES is the nearest to the open door, clearly", d[0][1] == "REYES" and d[1][0] - d[0][0] >= 0.5, ", ".join(f"{k} {v:.1f} m" for v, k in d))
check("only people standing at the door can be taken (within %.1f m)" % REACH, sum(v <= REACH for v, _ in d) >= 1 and all(dist(m(120, 440), door) > REACH for _ in [0]), f"{sum(v <= REACH for v, _ in d)} of 5 inside the reach; the entrance is {dist(m(120, 440), door):.0f} m away, so nobody was taken on the earlier round")
lock = [("wrist taken", 1.0), ("MILLER pulls, the row turns its heads", 1.5), ("KNOX: Miller. Let go.", 1.5), ("heads turn back", 1.0), ("REYES: I'm okay. Don't.", 1.5), ("walked 1.5 m into the cell", 2.0), ("hand raised, lever, door slides", 1.6), ("clear bell", 0.9)]
need = sum(s for _, s in lock)
check("the lock-in fits its slot", need <= 11.0, f"needs {need:.1f} s; script v3 first draft gave 9 s, now 11 s")
hb = [("bolt into the officer in the cage", 0.8), ("reload", 1.7), ("roped bolt onto the lever", 0.9), ("KNOX jogs %.1f m to the wing mouth" % dist(pos["KNOX"], WING), dist(pos["KNOX"], WING) / 3.0)]
check("HOUND's two bolts and KNOX's move fit in 6 s", hb[0][1] + hb[1][1] + hb[2][1] <= 6.0 and hb[3][1] <= 6.0, f"bolts {hb[0][1] + hb[1][1] + hb[2][1]:.1f} s; {hb[3][0]} {hb[3][1]:.1f} s (at the same time)")
check("HOUND can reach both targets from where he stands", dist(pos["HOUND"], CAGE) <= 6, f"{dist(pos['HOUND'], CAGE):.1f} m to the cage")
T_PULL = 72.0; n_doors = 11; t_all = n_doors * 0.12 + 0.6
check("the row racks open before the first one steps out", t_all <= 2.0, f"{n_doors} doors, 0.12 s apart, 0.6 s each: {t_all:.1f} s")
# the wing: 4 two-man cells; the two lower-row cells either side of the mouth come the same way
wing_doors = [m(960, 815), m(1184, 815), m(960, 983), m(1184, 983)]; ROUSE0, CHAIN, RUN = T_PULL + 2.2, 0.35, 2.2
arr = sorted(ROUSE0 + CHAIN * (2 + i // 2) + dist(dd, WING) / RUN for i, dd in enumerate(wing_doors) for _ in (0, 1))
T_REPEL = 77.5; inreach = sum(1 for a in arr if T_REPEL - a >= -1.4)              # within about 3 m of him when it lands
check("enough of them are in front of the shield when it lands", inreach >= 6, f"repel at {clock(T_REPEL)}: {inreach} of {len(arr)} wing occupants within reach (first arrives {clock(arr[0])}, last {clock(arr[-1])})")
occ = {"upper row": 5, "lower row": 4, "wing": 8}; left = sum(occ.values()) - inreach - 0; shooters, per_kill, window = 5, 3.0, 7.0
check("what is left can be put down in the 7 s that follow", left <= shooters * window / per_kill, f"{sum(occ.values())} inmates ({occ}), {inreach} thrown back, {left} left for {shooters} people at one every {per_kill:.0f} s = {shooters * window / per_kill:.0f}")
print("  note: carrying three bodies to the entrance cannot be shown in real time; the script cuts, and the mission clock on the HUD jumps.")

# ---------- death row (existing, validated timeline) ----------
print("\nACT 3-5 (death row)")
out = subprocess.run(["node", "episodes/file_001_deathrow/build_timeline.mjs"], cwd=ROOT, capture_output=True, text=True).stdout
em = re.findall(r"emission (\d+)s: (.*?) \[(\w+)\]", out); swaps = [float(x) for x in re.search(r"swaps at ([\d., ]+) s", out).group(1).split(",")]
check("every ripple reaches the right person first", all(e[2] == "OK" for e in em) and len(em) == 6, f"{sum(e[2] == 'OK' for e in em)} of {len(em)} emissions")
T0 = 90.0                                                                          # the section starts here once act 2 has its extra seconds
print("  swaps on screen:", ", ".join(clock(T0 + s) for s in swaps), "(ripples leave every 20 s from", clock(T0 + 4) + ")")
e44 = dict(re.findall(r"(\w+) ([\d.]+)m", next(e[1] for e in em if e[0] == "44")))
check("the failed repel cannot change who is nearest at the second swap", float(e44["MILLER"]) - float(e44["KNOX"]) > 0.5 + 0.3, f"KNOX {e44['KNOX']} m, MILLER {e44['MILLER']} m; the repel moves the prisoner at most 0.5 m")
check("the shield has had time to gather some light again", (T0 + 36) - T_REPEL >= 30, f"{(T0 + 36) - T_REPEL:.0f} s between the two uses")

# ---------- dialogue: does it fit where it is put ----------
print("\nDIALOGUE (2.6 words a second, 0.35 s between lines)")
script = open(os.path.join(ROOT, "FILE_001_SCRIPT_V3.md"), encoding="utf8").read()
def block(start, end): a = script.index(start); return re.findall(r"^> \w+: (.*)$", script[a:script.index(end, a)], re.M)
slots = [("briefing over the island", "**0:05", "**0:20", 15), ("walking in", "**0:20", "## 第二幕", 8.5), ("why they still count", "REYES 问", "空牢房**", 14), ("the lock-in", "意外**", "把人弄出来**", 11),
         ("the lever", "把人弄出来**", "开门**\n", 7), ("the wing and the shield", "开门**\n", "收尾**", 8), ("after the second swap", "KNOX 转身从背后开枪", "第三次换位**", 19)]
for name, a, b, slot in slots:
    lines = block(a, b); w = sum(len(l.split()) for l in lines); t = w / 2.6 + 0.35 * len(lines)
    check(name, t <= slot, f"{len(lines)} lines, {w} words, {t:.1f} s in a {slot} s slot")
print("\nRESULT:", "all checks pass" if not fails else f"{len(fails)} FAIL: " + "; ".join(fails)); sys.exit(1 if fails else 0)
