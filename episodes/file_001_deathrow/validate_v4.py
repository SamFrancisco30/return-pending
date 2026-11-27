"""FILE 001 script v4: can it happen in the time and space the script gives it?
   python episodes/file_001_deathrow/validate_v4.py        (run from C:\\Sam)
Act 2 is checked on scene/greyrock_block.json (metres, x along the hall, y down). Death row is checked along the hall axis:
x = metres from the steel door, the cell bars at 19.5. The first swap is the old, already validated one (build_timeline.mjs);
swaps two to four are new and are checked here from the positions the script calls for."""
import json, math, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = json.load(open(os.path.join(ROOT, "scene", "greyrock_block.json"), encoding="utf8")); O = S["origin"]; PPM = O["pxPerM"]
m = lambda px, py: ((px - O["x"]) / PPM, (py - O["y"]) / PPM)
fails = []
def check(name, ok, detail): print(f"  [{'OK' if ok else 'FAIL'}] {name}: {detail}"); (ok or fails.append(name))
def clock(t): t = round(t, 1); return f"{int(t // 60)}:{t % 60:04.1f}"
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
RIPPLE, LOCK = 4.5, 0.6                                                            # the ripple's speed, and how long it holds on whoever it touches before the swap

# ---------- act 2 ----------
print("ACT 2")
doors = {d["id"]: d for d in S["doors"]}
top = [m(doors[f"T{i}"]["hx"] + doors[f"T{i}"]["width"] / 2, doors[f"T{i}"]["hy"]) for i in range(1, 12)]
PITCH = top[1][0] - top[0][0]; Y_TOP, Y_BOT = top[0][1], m(0, 608)[1]; CAGE, WING = m(1072, 324), m(1075, 608)
WALK, NOD = 1.2, 0.7; PER = PITCH / WALK + NOD; T_BELL, T_START = 35.0, 40.0
check("officer crosses the hall between the bell and cell 1", (Y_BOT - Y_TOP) / WALK <= T_START - T_BELL + 0.2, f"{(Y_BOT - Y_TOP) / WALK:.1f} s needed, {T_START - T_BELL:.1f} s given")
OPEN = 6; t_open = T_START + (OPEN - 1) * PER; door = top[OPEN - 1]
check("officer finds the open cell short when the script says (0:57)", abs(t_open + NOD - 57.0) <= 1.0, f"arrives {clock(t_open)}, finds it short {clock(t_open + NOD)}")
v = (door[0] - 1.0 - 3.0) / (54.0 - 37.0 - 3.0)
check("squad reaches the open cell at a careful walk, with a 3 s halt for the far signal", 0.7 <= v <= 1.3, f"{door[0] - 4.0:.1f} m in 14 s of walking = {v:.2f} m/s")
pos = {"REYES": (door[0] + 0.4, door[1] + 0.9), "COLE": (door[0] - 1.0, door[1] + 1.4), "MILLER": (door[0] + 1.1, door[1] + 1.6), "KNOX": (door[0] - 0.5, door[1] + 2.7), "FUSE": (door[0] + 2.3, door[1] + 2.3)}
d = sorted((dist(p, door), k) for k, p in pos.items())
check("REYES is the nearest to the open door, clearly", d[0][1] == "REYES" and d[1][0] - d[0][0] >= 0.5, ", ".join(f"{k} {x:.1f} m" for x, k in d))
plant = dist(pos["FUSE"], CAGE) / 1.5 + 0.9 + 3.0 / 2.0
check("FUSE walks to the cage, sets the charge and gets behind a table in 7 s", plant <= 7.0, f"{plant:.1f} s ({dist(pos['FUSE'], CAGE):.1f} m to the cage)")
check("KNOX reaches the wing mouth in that time", dist(pos["KNOX"], WING) / 3.0 <= 7.0, f"{dist(pos['KNOX'], WING):.1f} m, {dist(pos['KNOX'], WING) / 3.0:.1f} s")
T_BLAST, T_REPEL, RUN = 75.0, 79.0, 2.2
wing = [m(960, 815), m(1184, 815), m(960, 983), m(1184, 983)]; arr = sorted(T_BLAST + 0.5 + dist(w, WING) / RUN for w in wing for _ in (0, 1))
inreach = sum(1 for a in arr if a <= T_REPEL + 1.4)
check("the wing's eight are in front of the shield when it lands", inreach == 8, f"repel at {clock(T_REPEL)}; they arrive {clock(arr[0])} to {clock(arr[-1])}; {inreach} of 8 within reach")
check("the nine left can be put down in the 7 s that follow", 9 <= 5 * 7 / 3.0, "5 people, one every 3 s = 11")

# ---------- death row ----------
print("\nACT 3-5 (death row; x = metres from the door)")
T0 = 93.0
def first(emit, people):                                                           # who the ripple reaches first, and when the swap happens
    order = sorted((dd, k) for k, dd in people.items()); return order, emit + order[0][0] / RIPPLE + LOCK
# 1: unchanged from the validated timeline
print(f"  swap 1: old timeline, COLE at 9.9 m, swap at {clock(T0 + 26.8)}")
# 2: he breaks from the pillar at MILLER; KNOX steps between them before the ripple leaves
o, t2 = first(44.0, {"KNOX": 6.5, "MILLER": 7.7, "REYES": 10.5, "FUSE": 10.0, "COLE": 13.0})
check("swap 2: the ripple finds KNOX before MILLER", o[0][1] == "KNOX" and o[1][0] - o[0][0] >= 1.0, f"{o[0][1]} {o[0][0]} m, {o[1][1]} {o[1][0]} m; swap at {clock(T0 + t2)}")
CHARGE = 2.2; gap = 6.5 - CHARGE * (t2 - 44.0)
check("swap 2: he has not reached the shield when it happens", gap >= 1.0, f"a heavy run at {CHARGE} m/s leaves him {gap:.1f} m short of KNOX at the swap; that is how far away KNOX reappears")
check("swap 2: the blow then lands at once", 1.2 / CHARGE <= 0.6, f"he arrives 1.2 m from MILLER still moving: {1.2 / CHARGE:.2f} s")
# 3: KNOX holds the threshold, the others are out behind him, the door is open
o, t3 = first(64.0, {"KNOX": 6.0, "FUSE": 7.6, "REYES": 8.0, "COLE": 13.5})
check("swap 3: the ripple finds KNOX on the threshold first", o[0][1] == "KNOX" and o[1][0] - o[0][0] >= 1.0, f"{o[0][1]} {o[0][0]} m, {o[1][1]} {o[1][0]} m; swap at {clock(T0 + t3)}")
drag = 9.0 / 0.6
check("FUSE and REYES have MILLER out of the door before that", t2 + 1.0 + drag <= 63.5, f"9 m at 0.6 m/s: out by {clock(T0 + t2 + 1.0 + drag)}, ripple leaves {clock(T0 + 64)}")
t_shut = t3 + 0.7 + 1.2 + 0.8
check("the door is shut on him before he recovers", t_shut <= t3 + 3.0, f"burst 0.7 s, push 1.2 s, bolt 0.8 s: bolted {clock(T0 + t_shut)}")
# 4: KNOX backs to the cell with him one step away, then the half step
walk = (19.5 - 1.2 - 6.0) / (81.5 - 70.0)
check("KNOX can back down the hall to the bars in time", walk <= 1.3, f"{19.5 - 1.2 - 6.0:.1f} m in 11.5 s = {walk:.2f} m/s backwards behind a shield")
before, _ = first(84.0, {"KNOX": 0.8, "COLE": 1.2}); after, t4 = first(84.0, {"KNOX": 0.8 + 0.5, "COLE": 1.2 - 0.5})
check("before the shield lands, KNOX is still the nearest (so he has no reason to move)", before[0][1] == "KNOX", f"KNOX {before[0][0]} m, COLE at the bars {before[1][0]} m")
check("after the half step, COLE is", after[0][1] == "COLE" and after[1][0] - after[0][0] >= 0.4, f"COLE {after[0][0]:.1f} m, KNOX {after[1][0]:.1f} m: the ripple touches COLE {1000 * (after[1][0] - after[0][0]) / RIPPLE:.0f} ms sooner; swap at {clock(T0 + t4)}")
check("COLE can get from the back wall to the bars on the word", 3.4 / 1.6 <= 84.0 - 81.6, f"3.4 m at 1.6 m/s = {3.4 / 1.6:.1f} s, given {84.0 - 81.6:.1f} s")
out = t4 + 0.6 + 19.5 / 4.0 + 1.5
check("KNOX and COLE are out and the door bolted before the next ripple", out <= 104.0, f"19.5 m at a run, door: bolted {clock(T0 + out)}; next ripple leaves {clock(T0 + 104)}")
check("carrying the last man out fits between two ripples", 108.4 + 0.6 + 3 + 1.5 + 7 + 1 <= 124 + 19.0 / RIPPLE, f"in after {clock(T0 + 108.4)}, bolted about {clock(T0 + 122)}, next ripple at the door {clock(T0 + 124 + 19.0 / RIPPLE)}")
print("  on screen: ripples leave", ", ".join(clock(T0 + e) for e in (4, 24, 44, 64, 84, 104, 124)), "| swaps", ", ".join(clock(T0 + s) for s in (26.8, t2, t3, t4)))

# ---------- dialogue ----------
print("\nDIALOGUE (2.6 words a second, 0.35 s between lines)")
script = open(os.path.join(ROOT, "FILE_001_SCRIPT_V4.md"), encoding="utf8").read()
def block(start, end): a = script.index(start); return re.findall(r"^> \w+: (.*)$", script[a:script.index(end, a)], re.M)
slots = [("briefing over the island", "**0:05", "**0:20", 15), ("walking in", "**0:20", "## 第二幕", 8.5), ("why they still count", "REYES 问", "远端**", 14), ("the far signal", "远端**", "空牢房**", 4),
         ("the lock-in", "意外**", "把人弄出来**", 11), ("the linkage", "把人弄出来**", "开门**\n", 7), ("the wing and the shield", "开门**\n", "收尾**", 9), ("at the steel door", "门前**", "进入**", 10),
         ("the first exchange of fire", "试探**", "他不打了**", 9), ("he is counting", "他不打了**", "设局", 7), ("the retreat", "**2:19 撤**", "第三次换位**", 18), ("the door shut", "第三次换位**", "他不动手**", 5),
         ("he will not strike", "他不动手**", "那半步", 12)]
for name, a, b, slot in slots:
    lines = block(a, b); w = sum(len(l.split()) for l in lines); t = w / 2.6 + 0.35 * len(lines)
    check(name, t <= slot and lines, f"{len(lines)} lines, {w} words, {t:.1f} s in a {slot} s slot")
print("\nRESULT:", "all checks pass" if not fails else f"{len(fails)} FAIL: " + "; ".join(fails)); sys.exit(1 if fails else 0)
