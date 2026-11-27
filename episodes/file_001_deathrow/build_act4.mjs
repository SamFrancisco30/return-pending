// FILE 001 · DEATH ROW — ACT 4 only (swaps two, three and four), on the open map. Picks up where build_act3.mjs ends.
//   node episodes/file_001_deathrow/build_act4.mjs        (run from C:\Sam)
// Metres: x from the steel door into the hall (24 x 14, columns at x = 6, 11, 16 and y = +-3.6, bars at 19.5), y across.
// Seconds are from the start of this act; the ripple leaves him at 10, 30 and 50 (and left at -10, the first swap).
//
// What each side is doing (the staging is built on this, and the script checks it):
//   him   He cannot leave the block. The one thing he must not let happen: a ripple leaving him when the nearest living person
//         it can reach is COLE, in the cell. So he must keep one of them inside and nearer than COLE, every twenty seconds.
//   them  Until they understand it, they fight. Once they do, the answer is to have everyone but COLE out and the door shut
//         when a ripple leaves. He stops that the only way he can: he stays on KNOX, the rear man, so KNOX cannot break away.
//   2     He runs for a column, out of the machine gun's way (he is heavy: he has one speed, and it is not fast). FUSE brings the
//         column down on him; it throws him across the floor. He gets up and runs for the next one, and there he waits for his
//         moment. MILLER goes wide to see behind it; KNOX goes to cover MILLER; that is what he was waiting for. The ripple finds
//         KNOX, and he arrives beside MILLER. One blow. KNOX throws himself between them and takes him on the shield, then draws
//         him off north while FUSE gets MILLER by the harness and drags him out along the south wall.
//   3     Fighting withdrawal to the door. He rides KNOX's shield all the way so the door cannot be shut on him. REYES goes
//         behind him and makes herself the nearest; KNOX uses the shield's half step to break contact and gets out and away.
//         Whatever he does now, the ripple gives REYES his place, and she is faster than he is. The door shuts in his face.
//   4     Alone with COLE and ten seconds. He runs the length of the hall to reach COLE through the bars. He cannot.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";
const M = 64, X0 = 400, YC = 576, L = "../library/characters/", SCALE = 1.15;
const P = (x, y) => [X0 + x * M, YC + y * M];
const RIPPLE = 4.5, LOCK = 0.6, EPS = 0.001, DUR = 41, E2 = 10, E3 = 30, RUN = 2.6, CHARGE = RUN, SPRINT = RUN;      // he is heavy: one speed, whatever he is running at
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
const toward = (a, b, d) => { const L0 = dist(a, b) || 1; return [a[0] + (b[0] - a[0]) / L0 * d, a[1] + (b[1] - a[1]) / L0 * d]; };
const hitOf = (E, from, to, who) => { const touch = E + dist(from, to) / RIPPLE; return { t: E, touch, swap: touch + LOCK, who }; };
// ---- where act 3 left them
const KNOX0 = [10.7, 0.85], BOSS_UP = [11.75, 0.75], MILLER0 = [11.8, -2.2], FUSE0 = [9.9, 4.5], REYES0 = [1.2, -1.7], COLE0 = [20.2, 0.2], BODY = [13.0, 0.9];
// ---- swap 2
const COL_A = [16, 3.6], HIDE_A = [16.95, 3.55], VIA_A = [16.5, 2.5], CHG = [16.3, 4.5], THROWN = [17.6, 0.4], PUSHED = [14.1, 0.1], T_BREAK = 3.0;      // the column he runs for; where FUSE's charge lands; where it throws him
const T_VIA = T_BREAK + dist(PUSHED, VIA_A) / RUN, T_COL = T_VIA + dist(VIA_A, HIDE_A) / RUN, BLAST = 5.7, T_UP = 6.7;
const HIDE = [16.7, -4.4], T_HIDE = T_UP + dist(THROWN, HIDE) / RUN, MILLER_WIDE = [12.5, -5.6], KNOX_BLOCK = toward(MILLER_WIDE, HIDE, 1.2), GO2 = E2 + 0.6;       // he lets the ripple leave him, then goes
const H2 = hitOf(E2, HIDE, KNOX_BLOCK, "KNOX"), S2 = H2.swap, BOSS_S2 = toward(HIDE, MILLER_WIDE, RUN * (S2 - GO2));
// ---- MILLER down: KNOX gets between, then draws him off; FUSE drags MILLER out
const THROWN2 = [15.4, -5.3], WALL_HIT = [10.0, -6.5], ML = [10.25, -6.2], KNOX_OVER = [11.9, -5.5], T_OVER = S2 + 1.3, REPEL2 = S2 + 1.45, T_DRAW = 17.2, T_SILL = 27.0, T_RUNF = 12.2, T_KNEEL = 15.2, T_DRAG = 16.2, DRAG_V = 1.9;
const SILL = [0.5, 0.0];
const lerpK = (K, t) => { if (t <= K[0][0]) return K[0].slice(1); for (let i = 1; i < K.length; i++) if (K[i][0] >= t) { const a = K[i - 1], b = K[i], u = (t - a[0]) / (b[0] - a[0] || 1); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u); } return K.at(-1).slice(1); };
const KP = [[T_DRAW, ...KNOX_OVER], [21.67, 5.6, -5.3], [25.23, 3.2, -0.9], [T_SILL, SILL[0] + 0.4, 0.05]];          // KNOX the rearguard: backing along the way FUSE dragged MILLER, always between him and them
const KA = [[T_DRAW, 0], [21.67, 0], [22.4, -61], [25.23, -61], [25.8, -22], [26.6, -22], [T_SILL, 0]];             // where he is, seen from KNOX: always on the side KNOX is backing away from
const knoxBack = t => lerpK(KP, t), bossRide = t => { const k = knoxBack(t), a = lerpK(KA, t)[0] * Math.PI / 180; return [k[0] + 1.1 * Math.cos(a), k[1] + 1.1 * Math.sin(a)]; };
const DRAGQ = [ML, [8.95, -6.1], [5.0, -5.2], [2.6, -0.3], [-1.0, -0.2], [-4.4, -2.2]];                                // MILLER, FUSE's hands, and the way out along the south wall
const along = s => { let i = 0; for (; i + 2 < DRAGQ.length && s > dist(DRAGQ[i], DRAGQ[i + 1]); i++) s -= dist(DRAGQ[i], DRAGQ[i + 1]); const a = DRAGQ[i], b = DRAGQ[i + 1], u = Math.min(1, s / dist(a, b)); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, face(a, b)]; };
const DRAG_LEN = DRAGQ.slice(1).reduce((n, q, i) => n + dist(DRAGQ[i], q), 0), GRIP = dist(DRAGQ[0], DRAGQ[1]), T_DROP = T_DRAG + (DRAG_LEN - GRIP) / DRAG_V;
// ---- the door: KNOX throws him off the shield and steps out; FUSE shuts it in his face. The next ripple finds only COLE.
const BOSS_SILL = [1.6, 0.05], KNOCK3 = [3.9, 0.1], DOOR_IN = [1.25, 0], REPEL = 27.4, T_PRESS = REPEL + 0.75, T_SHUT = T_PRESS + 0.8, T_BOSS_DOOR = REPEL + 0.8 + dist(KNOCK3, DOOR_IN) / RUN;
const H3 = hitOf(E3, DOOR_IN, COLE0, "COLE"), S3 = H3.swap;

// ---- the squad: [t, x, y, heading]
const dragKeys = (lead) => { const out = []; for (let t = T_DRAG; t < T_DROP + 0.29; t += 0.3) { const tt = Math.min(t, T_DROP), q = along(DRAG_V * (tt - T_DRAG) + (lead ? GRIP : 0)); out.push([tt, q[0], q[1], lead ? q[2] : q[2] + 180]); } return out; };
const backKeys = []; for (let t = T_DRAW + 0.4; t < T_SILL - 0.05; t += 0.4) backKeys.push([t, ...knoxBack(t), lerpK(KA, t)[0]]);
const tracks = {
  A: [[0, ...KNOX0, 0], [T_BREAK, ...KNOX0, 0], [T_COL, ...KNOX0, 25], [BLAST + 0.6, ...KNOX0, 12], [T_UP + 0.6, ...KNOX0, -30], [8.0, ...KNOX0, -40], [9.9, ...KNOX_BLOCK, face(KNOX_BLOCK, HIDE)], [S2, ...KNOX_BLOCK, face(KNOX_BLOCK, HIDE)],
    [S2 + EPS, ...BOSS_S2, face(KNOX_BLOCK, HIDE)], [S2 + 0.3, ...BOSS_S2, 180], [S2 + 0.7, 13.5, -4.05, 200], [S2 + 1.05, 12.4, -4.6, 270], [T_OVER, ...KNOX_OVER, 360], [T_OVER + EPS, ...KNOX_OVER, 0],      // round his north side and in between him and MILLER
    [REPEL2, ...KNOX_OVER, 0], [REPEL2 + 0.12, KNOX_OVER[0] + 0.15, KNOX_OVER[1], 0], [REPEL2 + 0.3, ...KNOX_OVER, 0], [T_DRAW, ...KNOX_OVER, 0], ...backKeys,
    [T_SILL, SILL[0] + 0.4, 0.05, 0], [REPEL, SILL[0] + 0.4, 0.05, 0], [REPEL + 0.12, SILL[0] + 0.55, 0.05, 0], [REPEL + 0.3, SILL[0] + 0.4, 0.05, 0], [REPEL + 0.45, 0.3, 0.07, 180],
    [REPEL + 1.1, -1.8, 1.0, 180], [REPEL + 1.5, -1.8, 1.0, 0], [DUR, -1.8, 1.0, 0]],
  B: [[0, ...FUSE0, face(FUSE0, BOSS_UP)], [T_BREAK, ...FUSE0, face(FUSE0, BOSS_UP)], [T_BREAK + 0.3, ...FUSE0, face(FUSE0, [13.2, 1.1])], [3.8, ...FUSE0, face(FUSE0, VIA_A)], [4.2, ...FUSE0, face(FUSE0, CHG)], [BLAST + 0.3, ...FUSE0, face(FUSE0, CHG)],
    [BLAST + 0.55, ...FUSE0, face(FUSE0, THROWN)], [T_UP + 0.4, ...FUSE0, face(FUSE0, THROWN)], [T_HIDE, ...FUSE0, face(FUSE0, HIDE)], [S2 + 0.5, ...FUSE0, face(FUSE0, KNOX_BLOCK)], [T_RUNF, ...FUSE0, -100],
    [T_RUNF + 1.58, 9.0, -1.0, -85], [T_KNEEL, ...DRAGQ[1], face(DRAGQ[1], ML)], [T_DRAG - 0.2, ...DRAGQ[1], face(DRAGQ[1], ML)], ...dragKeys(true),
    [T_DROP + 0.4, ...DRAGQ.at(-1), 0], [26.8, -1.55, 2.2, -30], [DUR, -1.55, 2.2, -30]],
  C: [[0, ...REYES0, face(REYES0, BOSS_UP)], [T_BREAK + 0.5, ...REYES0, face(REYES0, VIA_A)], [T_COL, ...REYES0, face(REYES0, COL_A)], [BLAST + 0.8, ...REYES0, face(REYES0, THROWN)], [T_HIDE, ...REYES0, face(REYES0, HIDE)], [12, ...REYES0, face(REYES0, KNOX_BLOCK)],
    [19.9, ...REYES0, face(REYES0, [9, -5])], [24.6, ...REYES0, face(REYES0, [5, -3])], [25.1, 0.3, -0.7, 180], [25.7, -1.2, -1.6, 180], [26.1, -1.2, -1.6, 0], [DUR, -1.2, -1.6, 0]],          // covers the others out, then out herself before KNOX gets to the door
  D: [[0, ...MILLER0, face(MILLER0, BOSS_UP)], [T_BREAK + 0.4, ...MILLER0, face(MILLER0, VIA_A)], [T_COL, ...MILLER0, face(MILLER0, HIDE_A)], [BLAST + 0.5, ...MILLER0, face(MILLER0, THROWN)], [T_UP + 0.5, ...MILLER0, face(MILLER0, HIDE)],
    [T_HIDE + 0.4, ...MILLER_WIDE, face(MILLER_WIDE, HIDE)], [S2 + 0.3, ...MILLER_WIDE, face(MILLER_WIDE, HIDE)], [S2 + 0.58, ...WALL_HIT, face(MILLER_WIDE, HIDE) + 25], [S2 + 1.0, ...ML, face(MILLER_WIDE, HIDE)], [T_DRAG - 0.01, ...ML, face(MILLER_WIDE, HIDE)],        // one blow: off his feet, across the floor and into the wall; he slides down it
    ...dragKeys(false), [DUR, along(DRAG_LEN - GRIP)[0], along(DRAG_LEN - GRIP)[1], along(DRAG_LEN - GRIP)[2] + 180]],
  E: [[0, ...COLE0, 180], [S3, ...COLE0, 180], [S3 + EPS, ...DOOR_IN, 180], [S3 + 0.9, ...DOOR_IN, 180], [S3 + 1.6, -1.8, -0.2, 180], [S3 + 2.2, -4.0, 0.0, 180], [DUR, -4.0, 0.0, 180]],
};
const at = (id, t) => { const k = tracks[id]; if (t <= k[0][0]) return [k[0][1], k[0][2]]; for (let i = 1; i < k.length; i++) if (k[i][0] >= t) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } return [k.at(-1)[1], k.at(-1)[2]]; };
const hdg = (id, t) => { const k = tracks[id]; let i = 0; while (i + 1 < k.length && k[i + 1][0] <= t) i++; const a = k[i], b = k[Math.min(i + 1, k.length - 1)], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0; return (a[3] + (b[3] - a[3]) * u) * Math.PI / 180; };
const shieldPt = (t, d = 0.5) => { const q = at("A", t), h = hdg("A", t); return [q[0] + d * Math.cos(h), q[1] + d * Math.sin(h)]; };

// ---- him: [t, x, y, heading]
const Em = [[0, 13.1, 0.2, 200], [0.5, ...BOSS_UP, 180], [2.0, ...BOSS_UP, 180], [2.3, ...PUSHED, 180], [T_BREAK - 0.1, ...PUSHED, 180],          // on the shield; the shield throws him off it; the machine gun opens up again
  [T_BREAK, ...PUSHED, face(PUSHED, VIA_A)], [T_VIA, ...VIA_A, face(PUSHED, VIA_A)], [T_COL, ...HIDE_A, face(VIA_A, HIDE_A)], [T_COL + 0.3, ...HIDE_A, 124], [BLAST, ...HIDE_A, 110],     // he runs for the nearest column, at the only speed he has
  [BLAST + 0.5, ...THROWN, 102], [T_UP - 0.25, ...THROWN, 102], [T_UP, ...THROWN, face(THROWN, HIDE)], [T_HIDE, ...HIDE, face(THROWN, HIDE)], [T_HIDE + 0.3, ...HIDE, face(HIDE, MILLER_WIDE)],     // the column goes, and throws him; he gets up and runs for the next
  [GO2, ...HIDE, face(HIDE, MILLER_WIDE)], [S2, ...BOSS_S2, face(HIDE, MILLER_WIDE)],
  [S2 + EPS, ...KNOX_BLOCK, face(HIDE, MILLER_WIDE)], [S2 + 0.3, ...toward(KNOX_BLOCK, MILLER_WIDE, 0.45), face(HIDE, MILLER_WIDE)], [S2 + 0.65, ...toward(KNOX_BLOCK, MILLER_WIDE, 0.45), face(KNOX_BLOCK, ML)],
  [T_OVER + 0.05, 12.95, -5.5, 180], [REPEL2, 12.95, -5.5, 180], [REPEL2 + 0.3, ...THROWN2, 180], [REPEL2 + 0.7, ...THROWN2, 180], [REPEL2 + 0.7 + dist(THROWN2, [13.0, -5.5]) / RUN, 13.0, -5.5, 180], [T_DRAW, 13.0, -5.5, 180]];      // he walks on to finish it; the shield throws him back; he comes again
for (let t = T_DRAW + 0.4; t < T_SILL - 0.05; t += 0.4) Em.push([t, ...bossRide(t), lerpK(KA, t)[0] + 180]);                                 // on KNOX's shield all the way to the door
Em.push([T_SILL, ...BOSS_SILL, 180], [REPEL, ...BOSS_SILL, 180], [REPEL + 0.3, ...KNOCK3, 180], [REPEL + 0.8, ...KNOCK3, 180], [T_BOSS_DOOR, ...DOOR_IN, 180], [31.6, ...DOOR_IN, 180], [32.4, ...DOOR_IN, 0], [S3, ...DOOR_IN, 0],      // thrown back on his feet; at the door a moment after it shuts; then he turns and watches the ripple go down the hall
  [S3 + EPS, ...COLE0, 0], [S3 + 1.2, ...COLE0, 0], [S3 + 1.9, ...COLE0, 180], [S3 + 3.2, 19.95, 0, 180], [DUR, 19.95, 0, 180]);
Em.sort((a, b) => a[0] - b[0]);
const bossAt = t => { let i = 0; while (i + 1 < Em.length && Em[i + 1][0] <= t) i++; const a = Em[i], b = Em[Math.min(i + 1, Em.length - 1)], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0; return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };

// ---- blows and fire
const impacts = [], fire = [], flashes = [], repels = [];
const hit = (t, p, r = 62, kind = "shield") => impacts.push({ t, x: P(...p)[0], y: P(...p)[1], r, kind });
const shot = (t, who, kind) => fire.push({ t, who, kind, target: "ENTITY", at: P(...bossAt(t)) });
const mg = (t, len) => { for (let k = 0; k / 12 < len; k++) shot(t + k / 12, "FUSE", "rifle"); }, burst = (t, who) => { for (let k = 0; k < 3; k++) shot(t + k * 0.125, who, "rifle"); };
const PUNCH = [0.9, 1.6, 15.2, 16.1, 17.0, 18.6, 20.2, 21.8, 23.4, 25.0, 26.4];                         // his fist on the shield
for (const t of PUNCH) hit(t, shieldPt(t));
hit(2.0, [KNOX0[0] + 0.6, KNOX0[1]], 70); repels.push({ t: 2.0, at: [KNOX0[0] + 0.4, KNOX0[1]], heading: 0, power: 0.55 });
hit(S2 + 0.3, toward(MILLER_WIDE, KNOX_BLOCK, 0.25), 130, "body"); hit(S2 + 0.58, [WALL_HIT[0] - 0.1, -6.95], 150, "door");
hit(REPEL2, [KNOX_OVER[0] + 0.6, KNOX_OVER[1]], 85); repels.push({ t: REPEL2, at: [KNOX_OVER[0] + 0.45, KNOX_OVER[1]], heading: 0, power: 0.55 });
hit(REPEL, [SILL[0] + 0.95, 0.05], 85); repels.push({ t: REPEL, at: [SILL[0] + 0.8, 0.05], heading: 0, power: 0.55 });
for (const d of [0, 0.8, 1.6]) hit(T_BOSS_DOOR + d, [0.35, 0], 100, "door");
for (const d of [3.9, 5.1]) hit(S3 + d, [19.6, 0], 80, "door");
burst(0.4, "MILLER"); mg(1.0, 0.7); mg(2.4, 0.8); burst(2.5, "MILLER");            // thrown off the shield and in the open: the machine gun is what makes him run for cover
burst(BLAST + 0.45, "MILLER"); mg(BLAST + 0.55, 0.6); shot(T_UP + 1.1, "REYES", "sniper");              // in the open after the blast: everyone with a lane takes it
flashes.push({ t: 2.0 }, { t: S2 + 0.58 }, { t: REPEL2 }, { t: REPEL });                                                 // once MILLER is down nobody fires: KNOX is in every lane, or MILLER is

// ---- sprites
function clipsFor(keys, base, extra = []) {
  const segs = [];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1], dt = b[0] - a[0]; if (dt < 0.01) continue;
    const v = dist([a[1], a[2]], [b[1], b[2]]) / dt, act = v > (base.runAbove ?? 2.6) ? base.run : v > 0.25 ? base.walk : base.idle; if (!segs.length || segs.at(-1).action !== act) segs.push({ from: a[0], action: act, loop: true }); }
  const baseAt = t => { let c = segs[0]; for (const s of segs) if (s.from <= t) c = s; return c; };
  const times = [...new Set([...segs.map(s => s.from), ...extra.flatMap(x => [x.from, x.to])])].sort((a, b) => a - b), out = [];
  for (const t of times) { const ov = extra.filter(x => x.from <= t && t < x.to).at(-1); const c = ov ? { from: ov.from === t ? t : null, action: ov.action, loop: !!ov.loop } : { ...baseAt(t), from: t };
    if (!out.length || out.at(-1).action !== c.action || ov?.from === t) out.push({ from: t, action: c.action, ...(c.loop ? { loop: true } : {}) }); }      // (a hold picks up again when a one-shot inside it ends)
  return out;
}
const once = (t, action, len) => ({ from: t, to: t + len, action }), hold = (from, to, action) => ({ from, to, action, loop: true });
const B3 = { idle: "idle", walk: "walk", run: "run" }, sp = (dir, clips) => ({ dir: L + dir, pxPerM: M, scale: SCALE, clips });
const sprites = {
  A: sp("knox", clipsFor(tracks.A, B3, [hold(0, 8.0, "guard"), once(1.7, "bash", 0.83), hold(9.9, S2 + 0.3, "guard"), once(REPEL2 - 0.3, "bash", 0.83), hold(T_OVER + 0.55, T_DRAW, "guard"), hold(T_SILL, REPEL - 0.3, "guard"), once(REPEL - 0.3, "bash", 0.83), hold(REPEL + 1.5, DUR, "aim")])),
  B: sp("fuse", clipsFor(tracks.B, B3, [hold(0, T_RUNF, "aim"), hold(1.0, 1.7, "fire"), hold(2.4, 3.2, "fire"), once(3.85, "throw", 1.375), hold(BLAST + 0.55, BLAST + 1.15, "fire"), hold(T_KNEEL, T_DRAG, "kneel"), hold(T_DRAG, T_DROP, "carry")])),
  C: sp("reyes", clipsFor(tracks.C, B3, [hold(0, 24.6, "snipe_aim"), once(T_UP + 1.06, "snipe_shoot", 0.5), hold(26.1, DUR, "aim")])),
  D: sp("miller", clipsFor(tracks.D, B3, [hold(0, T_UP + 0.5, "aim"), once(0.36, "shoot", 0.6), once(2.46, "shoot", 0.6), once(BLAST + 0.41, "shoot", 0.6), hold(T_HIDE + 0.4, S2 + 0.3, "aim"), { from: S2 + 0.3, to: DUR, action: "death" }])),
  E: sp("cole", clipsFor(tracks.E, B3, [hold(30.6, S3 + 0.9, "crouch")])),
  ENTITY: sp("prisoner", clipsFor(Em, { idle: "idle", walk: "walk", run: "run", runAbove: 1.9 }, [once(BLAST, "hit", 0.6), ...PUNCH.map(t => once(t - 0.5, "punch", 1.0)), once(2.0, "hit", 0.5), once(S2 - 0.2, "punch", 1.0), once(REPEL2, "hit", 0.5), once(REPEL, "hit", 0.5),
    ...[0, 0.8, 1.6].map(d => once(T_BOSS_DOOR + d - 0.5, "punch", 1.0)), ...[3.4, 4.6].map(d => once(S3 + d, "punch", 1.0))])),
  T04: { dir: L + "t04", pxPerM: M, scale: SCALE, clips: [{ from: 9999, action: "lying" }] },
};

const scene = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow_open;
const cam = (t, x, y, z) => [t, ...P(x, y), z], WIDE = [1168, 576, 1.02];
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_act4.mjs", scene: "../scene/deathrow_open.json", plates,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // DEATH ROW // SRS", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:18:10", shots: [{ from: 0, to: DUR, type: "map" }], static: [S2, S3].map(s => [s + 0.03, 0.06]),
  doors: { GATE: [[0, 1], [T_PRESS, 1], [T_SHUT, 0], [S3 + 0.3, 0], [S3 + 1.1, 1], [S3 + 1.8, 1], [S3 + 2.6, 0], [DUR, 0]], CELL: [[0, 0]] }, explored: ["CELL"],
  operators: Object.fromEntries(Object.entries(tracks).map(([id, k]) => [id, { interp: "linear", keys: k.map(([t, x, y, h]) => [t, ...P(x, y), h]) }])),
  operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: Em.map(k => [k[0], ...P(k[1], k[2]), k[3], 1, [S2, S3].some(s => k[0] > s && k[0] < s + 0.1) ? 0.8 : 0, 1, 0, 0, 0]) },
  sprites, fire, flashes, impacts,
  throws: [{ t0: 4.65, t1: 5.25, from: P(FUSE0[0] + 0.5, FUSE0[1] - 0.2), to: P(...CHG) }], charges: [{ from: 5.25, to: BLAST, x: P(...CHG)[0], y: P(...CHG)[1], rot: 0.4 }],
  blasts: [{ t: BLAST, x: P(...COL_A)[0], y: P(...COL_A)[1], r: 175 }],
  dashes: [...[2.0, REPEL2, REPEL].map(t => ({ who: "ENTITY", from: t, to: t + 0.3 })), { who: "ENTITY", from: BLAST, to: BLAST + 0.5 }, { who: "D", from: S2 + 0.3, to: S2 + 0.58 }, { who: "A", from: 8.0, to: 9.9 }, { who: "A", from: S2 + 0.3, to: T_OVER }, { who: "B", from: T_RUNF, to: T_KNEEL },
    { who: "B", from: T_DROP + 0.4, to: 26.8 }, { who: "A", from: REPEL + 0.45, to: REPEL + 1.1 }, { who: "E", from: S3 + 0.9, to: S3 + 2.2 }], repels: repels.map(r => ({ t: r.t, x: P(...r.at)[0], y: P(...r.at)[1], heading: r.heading, power: r.power })),
  mobs: [{ id: "T04", species: "inmate", track: { interp: "linear", keys: [[0, ...P(...BODY), 8, 0.95, 0, 1, 0, 0, 0], [DUR, ...P(...BODY), 8, 0.95, 0, 1, 0, 0, 0]] } }],
  pulse: { t0: -10, period: 20, speed: RIPPLE * M, maxR: 30 * M, zone: scene.blockZone, alertFrom: 22, hits: [H2, H3] },
  swaps: [{ t: S2, a: P(...KNOX_BLOCK), b: P(...BOSS_S2) }, { t: S3, a: P(...COLE0), b: P(...DOOR_IN) }],
  props: [{ kind: "stain", from: 0, to: DUR, x: P(BODY[0] + 0.15, BODY[1])[0], y: P(BODY[0] + 0.15, BODY[1])[1], r: 40, w: 11, trail: [[18.2, 0.1], [17.0, 0.5], [15.6, 0.3], [14.4, 0.8], [13.6, 0.9]].map(q => P(...q)) },
    { kind: "rubble", from: BLAST + 0.06, to: DUR, x: P(...COL_A)[0], y: P(...COL_A)[1], size: 62 },
    { kind: "panel", from: 0, to: DUR, x: P(-0.74, 1.75)[0], y: P(-0.74, 1.75)[1], presses: [-30, T_PRESS, S3 + 0.3, S3 + 1.8] }],
  events: [],
  unitTags: [{ who: "MILLER", from: S2 + 0.8, to: DUR, text: "MILLER // CRITICAL" }],
  camera: [cam(0, 12.0, 0.6, 1.7), cam(1.9, 12.4, 0.5, 1.7), cam(2.6, 13.2, 0.5, 1.5), cam(3.8, 13.8, 2.2, 1.4), cam(5.5, 14.4, 2.6, 1.4), cam(6.5, 15.0, 0.8, 1.3), cam(8.2, 14.4, -2.4, 1.3), cam(9.5, 14.2, -3.8, 1.6), cam(H2.touch + 0.15, 13.4, -5.0, 2.0),
    cam(REPEL2 - 0.1, 12.6, -5.3, 2.0), cam(REPEL2 + 0.9, 13.2, -5.2, 1.75), cam(T_DRAW, 11.6, -5.0, 1.7), cam(19.5, 8.6, -3.6, 1.3), cam(22.6, 5.6, -0.6, 1.1), cam(25.6, 3.4, 0.2, 1.3), cam(REPEL - 0.3, 2.2, 0.2, 1.6), cam(REPEL + 1.0, 1.4, 0.2, 1.7),
    cam(30.4, 1.2, 0.1, 1.8), [32.0, ...WIDE], [H3.touch - 0.4, ...WIDE], cam(H3.touch + 0.3, 20.4, 0, 2.0), cam(S3 + 0.35, 20.4, 0, 2.0), cam(S3 + 1.0, 0.6, 0.1, 1.8), cam(S3 + 2.8, 0.4, 0.2, 1.8), cam(S3 + 3.8, 19.6, 0, 1.8), cam(DUR, 19.6, 0, 1.8)],
  warn: [{ from: S2 + 0.25, to: S2 + 3.2, text: "POSITION EXCHANGE  //  KNOX <-> UNK-01" },
    { from: T_SHUT + 0.3, to: S3, text: "DOOR SHUT  //  UNK-01 AND COLE INSIDE" }, { from: S3 + 0.25, to: S3 + 4.5, text: "POSITION EXCHANGE  //  COLE <-> UNK-01  //  UNK-01 IN CELL" }],
  subtitles: [
    { from: 2.4, to: 4.4, who: "KNOX", text: "Rounds don't stop him. Fuse, take his cover away." },
    { from: 4.7, to: 5.6, who: "FUSE", text: "Fire in the hole." },
    { from: 6.8, to: 7.8, who: "MILLER", text: "He's going for the next one. I'll get eyes." },
    { from: 7.9, to: 8.7, who: "KNOX", text: "Miller, not so wide!" },
    { from: 8.8, to: 9.7, who: "REYES", text: "He's not hiding. He's waiting." },
    { from: 9.8, to: 11.2, who: "KNOX", text: "Behind me, Miller. He has to come through me." },
    { from: S2 + 0.4, to: S2 + 1.3, who: "REYES", text: "MILLER!" },
    { from: REPEL2 + 0.3, to: REPEL2 + 2.2, who: "KNOX", text: "It switched us. He wanted me in front. Man down!" },
    { from: 15.0, to: 16.0, who: "FUSE", text: "On him. He's breathing." },
    { from: 16.2, to: 17.6, who: "KNOX", text: "Get him out. I'm your wall." },
    { from: 17.9, to: 19.8, who: "REYES", text: "It takes whoever's closest. Like the count." },
    { from: 20.1, to: 22.4, who: "KNOX", text: "Then nobody stays in here. Everyone out. We shut it." },
    { from: 22.7, to: 24.3, who: "FUSE", text: "He's not letting you go, Knox." },
    { from: 24.6, to: 26.6, who: "KNOX", text: "He will. Fuse, on the door. On my mark." },
    { from: REPEL + 0.1, to: REPEL + 0.9, who: "KNOX", text: "Mark!" },
    { from: T_SHUT + 0.3, to: T_SHUT + 1.3, who: "FUSE", text: "Door's shut." },
    { from: 30.4, to: 32.4, who: "DISPATCH", text: "Pulse is out. Cole's the only one in reach." },
    { from: 32.6, to: 34.4, who: "KNOX", text: "Cole. When you land, you run." },
    { from: S3 + 0.5, to: S3 + 1.7, who: "COLE", text: "...I'm out. I'm out." },
    { from: S3 + 2.9, to: S3 + 4.3, who: "FUSE", text: "Shut. He's in the cell." },
  ],
};
// ---- the light shield: open while KNOX has it set, flaring when it takes a blow
{ const on = [[-1, 8.0], [9.7, S2], [S2 + 0.3, REPEL + 0.35]], blows = [...PUNCH, 2.0, REPEL2, REPEL], keys = [];
  for (let t = 0; t <= DUR + 0.001; t += 0.05) { let g = 0; for (const [a, b] of on) g = Math.max(g, Math.min(1, (t - a) / 0.35, (b - t) / 0.25)); if (g > 0) for (const tb of blows) if (t >= tb - 0.001 && t < tb + 0.6) g += 0.9 * Math.exp(-(t - tb) / 0.14); keys.push([+t.toFixed(2), +Math.max(0, g).toFixed(3)]); }
  tl.guard = { A: { interp: "linear", keys } }; }
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline_act4.json", JSON.stringify(tl));

// ---- checks
const NAME = { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" }; let bad = 0;
const say = (ok, s) => { console.log(`  [${ok ? "OK" : "FAIL"}] ${s}`); if (!ok) bad++; };
const gateOpen = t => { const k = tl.doors.GATE; let v = k[0][1]; for (const q of k) if (q[0] <= t) v = q[1]; return v > 0.5; };
console.log(`act 4: swaps at ${S2.toFixed(2)}, ${S3.toFixed(2)} s`);
for (const [E, h] of [[E2, H2], [E3, H3]]) {
  const b = bossAt(E), open = gateOpen(E), d = Object.keys(tracks).map(id => ({ who: NAME[id], p: at(id, E) })).filter(o => o.p[0] > 0 || open).map(o => ({ ...o, d: dist(o.p, b) })).sort((p, q) => p.d - q.d);
  say(d[0].who === h.who && (d[1]?.d ?? 99) - d[0].d >= 0.6, `ripple at ${E} s (door ${open ? "open" : "shut"}): ${d.slice(0, 4).map(o => `${o.who} ${o.d.toFixed(1)} m`).join(", ")}`);
}
say(dist(BOSS_S2, KNOX_BLOCK) >= 1.0, `swap 2: he is still ${dist(BOSS_S2, KNOX_BLOCK).toFixed(1)} m short of KNOX when it happens (so KNOX reappears that far away)`);
say(dist(at("A", E2), HIDE) + 1.0 <= dist(MILLER_WIDE, HIDE), `swap 2: KNOX is between them before the ripple leaves: KNOX ${dist(at("A", E2), HIDE).toFixed(1)} m, MILLER ${dist(MILLER_WIDE, HIDE).toFixed(1)} m`);
say(T_SHUT + 0.05 <= T_BOSS_DOOR && T_SHUT + 0.5 <= E3, `the door is shut at ${T_SHUT.toFixed(1)} s; he reaches it at ${T_BOSS_DOOR.toFixed(1)} s; the ripple leaves at ${E3} s`);
say(Object.keys(tracks).every(id => id === "E" || at(id, T_PRESS)[0] < 0), "everyone but COLE is through the door when FUSE presses the button");
say(S3 + 2.6 <= 50 - 1, `COLE is out and the door shut at ${(S3 + 2.6).toFixed(1)} s; the next ripple leaves at 50 s`);
// every round fired: how close does the line pass to a friend, in front of the target or within 8 m behind it
let worst = [99];
for (const f of fire) { const id = Object.keys(NAME).find(k => NAME[k] === f.who), g = at(id, f.t), b = bossAt(f.t), L0 = dist(g, b), far = [g[0] + (b[0] - g[0]) * (L0 + 8) / L0, g[1] + (b[1] - g[1]) * (L0 + 8) / L0];
  for (const o of Object.keys(tracks)) { if (o === id) continue; const p = at(o, f.t), u = ((p[0] - g[0]) * (far[0] - g[0]) + (p[1] - g[1]) * (far[1] - g[1])) / dist(g, far) ** 2; if (u <= 0 || u >= 1) continue;
    const off = Math.abs((p[0] - g[0]) * (far[1] - g[1]) - (p[1] - g[1]) * (far[0] - g[0])) / dist(g, far); if (off < worst[0]) worst = [off, f.who, NAME[o], f.t]; } }
say(worst[0] >= 0.8, `closest any round passes to a friend: ${worst[0] === 99 ? "none near" : `${worst[1]}'s fire, ${worst[0].toFixed(1)} m from ${worst[2]} at ${worst[3].toFixed(1)} s`}`);
let gap = [99]; const ids = Object.keys(tracks);
for (let t = 0; t <= DUR; t += 0.25) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { if ((ids[i] === "D" || ids[j] === "D") && t > S2) continue; const g = dist(at(ids[i], t), at(ids[j], t)); if (g < gap[0]) gap = [g, NAME[ids[i]], NAME[ids[j]], t]; }
say(gap[0] >= 1.0, `closest any two of the squad come: ${gap[1]} and ${gap[2]}, ${gap[0].toFixed(1)} m at ${gap[3]} s`);
const PILLARS = scene.places.pillars; let inP = null;
for (let t = 0; t <= DUR; t += 0.25) for (const [who, p] of [...ids.map(id => [NAME[id], at(id, t)]), ["UNK-01", bossAt(t)]]) for (const q of PILLARS) if (!(t > BLAST && q[0] === COL_A[0] && q[1] === COL_A[1]) && Math.abs(p[0] - q[0]) < 0.6 && Math.abs(p[1] - q[1]) < 0.6) inP = [who, t];
say(!inP, inP ? `${inP[0]} is standing in a column at ${inP[1]} s` : "nobody ever stands in a column");
console.log(bad ? `${bad} FAIL` : "all checks pass"); if (bad) process.exitCode = 1;
