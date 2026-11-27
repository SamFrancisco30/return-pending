// FILE 001 · DEATH ROW — ACT 2: the general block. Three things happen, and then the walk to death row.
//   node episodes/file_001_deathrow/build_act2.mjs        (run from C:\Sam)
// Metres on scene/greyrock_block.json: hall x 2..35, y 4.5..10.5; cells above (T1..T11, doors at y 5) and below (B1..B9, doors at y 10);
// way in at x = 2, way on to death row at x = 35; tables x 7-8.9, 13-14.8, 25-26.8, 30-31.8 (y 7..8); the officers' station x 18.2..19.8, y 4.9..6.
//
// The plot in plain words:
//   1. THE COUNT.  The squad comes in through the west door in single file (KNOX, REYES, COLE in the middle, FUSE, MILLER). The block
//      is still doing its job after nine years: a man stands at every cell door, an officer in a cap walks the top row counting
//      them, another stands at the station by the door lever. One cell is open and empty, and a man of Team 04 lies in it. KNOX
//      sends COLE to confirm him with REYES covering. COLE confirms and pulls back first, so when the officer gets to the open
//      cell the nearest person to it is REYES.
//   2. THE GRAB.  The count is one short. This is seen through the helmet camera of REYES, because the overhead feed cannot show it:
//      the officer stops at the open cell, looks in, and his pencil stops. Then only his head turns, too far, to her. KNOX tells
//      her to back away slowly; it is too late. He takes her by the arm and puts her in the cell with the dead man, and the other officer
//      throws the lever: the door shuts, the count is right. The doors only work from the station, so FUSE blows its linkage:
//      every door on the block lets go at once and every man in it wakes.
//   3. THE WAY OUT.  The squad closes up back to back with KNOX at the front, facing the way on. MILLER drops the officer at the
//      cell and REYES comes out. KNOX opens the light shield (the picture holds while its card is read) and lets the men from the
//      east end bunch against it, then throws them all back with one blow; the guns finish it. They go on east past two more of
//      Team 04, which makes three of four, and out by the east door.
//   THE WALK.  Seen from above again: five blips through the covered passage to the isolation block, and its sealed door.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";
import { EQUIP } from "./cast_ui.mjs";
const M = 56, L = "../library/characters/", SCALE = 1.12, HOT = L + "resident", DIM = L + "resident_dim";
const P = (x, y) => [8 + M * x, 20 + M * y];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), lerp = (a, b, u) => a + (b - a) * u;
const face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
let seed = 23; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const NAME = { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" }, SQUAD = ["A", "B", "C", "D", "E"];

// ---- times
// the officer reaches the open cell at T5A, stands at it, turns his head at TURN, takes her at GRAB; she is in the cell at IN_CELL
const T5A = 12.0, TURN = T5A + 3.2, GRAB = T5A + 8.3, IN_CELL = T5A + 11.4, LEVER = IN_CELL + 0.7, SHUT = LEVER + 0.6, RUN_F = SHUT + 2.3, PLANT = RUN_F + 3.0, BLAST = PLANT + 4.7, WAKE = BLAST + 0.6;
const T_SHIELD = BLAST + 2.6, REPEL = BLAST + 5.6, HOLD = 4.6;                      // HOLD: how long the picture stops for the shield's card
// ---- places
const T5_DOOR = [15.5, 5.0], STATION = [18.6, 5.5], LINK = [18.05, 5.6], G2_AT = [19.0, 6.75], BODY = [15.3, 3.0];
const LANE = 8.9, STOP = { A: 13.4, C: 12.0, E: 10.6, B: 9.2, D: 7.8 };              // where each halts on the south lane, in marching order
const WEDGE = { A: [18.4, 7.5], B: [16.6, 8.9], D: [14.3, 5.9], E: [15.4, 8.1], C: [15.7, 6.0] };   // backs together between the tables, KNOX in front facing east, MILLER watching the way they came
const COLE_AT = [15.3, 5.75], REYES_AT = [14.0, 6.0];      // she covers from the entrance side of the door, so in her camera the cells stay on the left as they were when she came in

// ---- the squad: [t, x, y, heading]. In by the west door in single file, down the south lane.
const ORDER = ["A", "C", "E", "B", "D"], V_IN = 2.0, tracks = {};
// Furniture nobody walks through: each mess table with the stools round it, and the officers' station. A rect is where a person's
// CENTRE may not be. Every walk goes round them: if the straight line is blocked, it goes by the best corner of what blocks it.
const OBST = [7.0, 13.0, 25.0, 30.0].map(x => [x - 0.35, 6.2, x + 1.79 + 0.35, 8.8]).concat([[17.9, 4.6, 20.1, 6.25]]);
const inside = (p, r, e = 0.02) => p[0] > r[0] + e && p[0] < r[2] - e && p[1] > r[1] + e && p[1] < r[3] - e;
const blocker = (a, b) => { const n = Math.max(2, Math.ceil(dist(a, b) / 0.08)); for (let i = 0; i <= n; i++) { const q = [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)], r = OBST.find(r => inside(q, r)); if (r) return r; } return null; };
function route(a, b, depth = 0) { const r = blocker(a, b); if (!r || depth > 4) return [b]; const g = 0.06, cs = [[r[0] - g, r[1] - g], [r[2] + g, r[1] - g], [r[0] - g, r[3] + g], [r[2] + g, r[3] + g]].filter(c => !blocker(a, c) && dist(a, c) > 0.05);
  if (!cs.length) return [b]; const c = cs.sort((p, q) => dist(a, p) + dist(p, b) - dist(a, q) - dist(q, b))[0]; return [c, ...route(c, b, depth + 1)]; }
const walk = (keys, to, v, h) => { for (const q of route([keys.at(-1)[1], keys.at(-1)[2]], to)) { const a = keys.at(-1); keys.push([a[0] + dist([a[1], a[2]], q) / v, ...q, face([a[1], a[2]], q)]); } if (h != null) keys.at(-1)[3] = h; return keys; };
const wait = (keys, t, h) => { const a = keys.at(-1); if (t > a[0]) keys.push([t, a[1], a[2], h ?? a[3]]); return keys; };
function posOf(k, t) { if (t <= k[0][0]) return [k[0][1], k[0][2]]; for (let i = 1; i < k.length; i++) if (k[i][0] >= t) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0] || 1); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; } return [k.at(-1)[1], k.at(-1)[2]]; }
ORDER.forEach((id, i) => { const k = [[0, 0.6, 7.3, 0], [i * 0.7, 0.6, 7.3, 0]]; walk(k, [4.4, 7.3], V_IN); walk(k, [5.8, LANE], V_IN); walk(k, [STOP[id], LANE], V_IN, 0); tracks[id] = k; });
// COLE goes to the open cell to confirm the man in it; REYES covers him from the far side of the door
{ const e = tracks.E, c = tracks.C, tGo = 5.6, cut = (k, t) => { const p = posOf(k, t); while (k.at(-1)[0] > t) k.pop(); k.push([t, ...p, 0]); };
  cut(e, tGo); walk(e, [10.9, 5.9], 2.6); walk(e, COLE_AT, 2.6, -90); e.kneel = [e.at(-1)[0], 10.4]; wait(e, 10.4, -90); walk(e, [15.6, 6.1], 2.4); walk(e, [15.6, 9.2], 2.4); walk(e, [14.4, 9.75], 2.4, -60); wait(e, BLAST + 0.3, -60);
  cut(c, tGo + 1.0); walk(c, [11.6, 6.0], 2.6); walk(c, REYES_AT, 2.6, -35); wait(c, GRAB - 0.9, -35); walk(c, [13.6, 6.0], 0.5, -35); wait(c, GRAB, -35);   // she follows COLE up and covers him from behind; when the officer turns she starts to back off, too late
  c.push([GRAB + 1.6, 15.3, 5.0, -80], [IN_CELL, 15.0, 3.6, -90], [IN_CELL + 0.6, 15.0, 3.6, 90], [BLAST + 1.5, 15.2, 3.9, 90]); walk(c, [15.5, 5.1], 2.4); walk(c, WEDGE.C, 2.4, 150); c.out = c.at(-1)[0]; }
// FUSE to the linkage beside the station, plants, comes back to cover
{ const b = tracks.B; wait(b, RUN_F, 0); walk(b, [10.4, 6.6], 3.2); walk(b, [16.6, 6.5], 3.2); walk(b, [17.45, 5.85], 3.2, -20); b.plant = [b.at(-1)[0], b.at(-1)[0] + 2.0]; wait(b, b.plant[1], -20); walk(b, [15.9, 9.3], 3.0, -40); b.back = b.at(-1)[0]; wait(b, BLAST + 0.3, -40); }
// MILLER steps up where he can see the cell door; KNOX holds the lane
{ const d = tracks.D; wait(d, RUN_F + 0.6, 0); walk(d, [11.6, 8.95], 2.8); walk(d, [12.4, 5.9], 2.8, face([12.4, 5.9], T5_DOOR)); wait(d, BLAST + 1.4, face([12.4, 5.9], [16.1, 4.85])); }
wait(tracks.A, BLAST + 0.3, 0);
// the wedge, as soon as the doors are open
for (const id of ["A", "B", "D", "E"]) { const k = tracks[id]; wait(k, BLAST + (id === "A" ? 0.3 : id === "E" ? 1.2 : 1.4)); walk(k, WEDGE[id], 3.0, id === "A" ? 0 : id === "B" ? 150 : id === "D" ? 200 : 180); k.set = k.at(-1)[0]; }
const at = (id, t) => posOf(tracks[id], t);

// ---- the block's people. Three bodies and the officers, every loop out of step, nobody standing quite square.
const mobs = [], sprites = {}, fire = [], impacts = [], flashes = [], repels = [];
const mob = (id, keys) => mobs.push({ id, species: "inmate", track: { interp: "linear", keys: keys.map(([t, x, y, h, v = 1]) => [t, ...P(x, y), h, v, 0, 1, 0, 0, 0]) } });
const spr = (id, clips, sfx = "") => { sprites[id] = { dir: DIM + sfx, pxPerM: M, scale: SCALE * (sfx === "_g" ? 1.0 : 0.94 + 0.12 * rnd()), phase: rnd(), clips: clips.sort((a, b) => a.from - b.from) }; };
const dim = (from, action, sfx) => ({ from, dir: DIM + sfx, action, loop: true }), hot = (from, action, sfx, loop = true) => ({ from, dir: HOT + sfx, action, ...(loop ? { loop } : {}) });
// G1 walks the count along the top row: a stop at every door, T1 to the open one
const g1 = [[0, 3.5, 5.0, -90]];
for (let i = 1; i <= 4; i++) { const x = 3.5 + 3 * i, t = 3 * i; g1.push([t - 2.5, x - 3, 5.0, -90], [t - 2.3, x - 3, 5.0, 0], [t - 0.3, x, 5.0, 0], [t - 0.1, x, 5.0, -90]); }       // arrives at T5 at 11.7
g1.push([T5A, ...T5_DOOR, -90], [TURN, ...T5_DOOR, -90], [TURN + 1.4, ...T5_DOOR, face(T5_DOOR, REYES_AT)], [GRAB - 1.0, ...T5_DOOR, face(T5_DOOR, REYES_AT)], [GRAB, 14.45, 5.65, face(T5_DOOR, REYES_AT)], [GRAB + 0.3, 14.45, 5.65, -60], [GRAB + 1.6, 15.9, 4.95, -80], [IN_CELL, 15.7, 3.3, -90], [IN_CELL + 0.2, 15.7, 3.3, 70], [LEVER + 0.2, 16.1, 4.3, 80], [SHUT + 0.4, 16.3, 5.0, 90],
  [BLAST + 0.6, 16.3, 5.0, 90], [BLAST + 0.8, 16.3, 5.0, 200], [BLAST + 1.3, 16.0, 4.9, 215], [BLAST + 1.55, 16.0, 4.9, 215, 1], [BLAST + 3.2, 16.0, 4.9, 215, 0]);
mob("G1", g1);
{ const c = []; for (let i = 0; i + 1 < g1.length; i++) { const a = g1[i], b = g1[i + 1]; if (b[0] > BLAST + 0.5) break; const act = dist([a[1], a[2]], [b[1], b[2]]) / (b[0] - a[0] || 1) > 0.25 ? "walk" : "stand"; if (!c.length || c.at(-1).action !== act) c.push(dim(a[0], act, "_g")); }
  c.push(hot(TURN, "turn", "_g", false), dim(TURN + 1.3, "stand", "_g"), dim(GRAB - 1.0, "walk", "_g"), dim(SHUT + 0.4, "stand", "_g"), hot(BLAST + 0.6, "idle", "_g"), hot(BLAST + 0.85, "attack", "_g", false), hot(BLAST + 1.55, "down", "_g", false)); spr("G1", c, "_g"); }
mob("G2", [[0, ...G2_AT, -90], [LEVER - 0.5, ...G2_AT, -90], [LEVER - 0.2, ...G2_AT, -60], [BLAST, ...G2_AT, -60, 1], [BLAST + 0.15, ...G2_AT, -60, 0]]); spr("G2", [dim(0, "stand", "_g")], "_g");
// the inmates: one to a cell on the hall, standing at his door. T5 is the empty one.
const BODIES = ["", "_b", "", "_c", "", "", "_b", "_c", ""], inmates = [];
for (let i = 0; i < 11; i++) if (i !== 4) inmates.push({ id: `T${i + 1}`, home: [3.5 + 3 * i + 0.5 * (rnd() - 0.5), 4.05 + 0.25 * rnd()], door: [3.5 + 3 * i, 4.95], h: 90 + 30 * (rnd() - 0.5) });
[2, 5, 8, 11, 14, 21, 24, 27, 30].forEach((x, i) => inmates.push({ id: `B${i + 1}`, home: [x + 1.5 + 0.5 * (rnd() - 0.5), 10.95 - 0.25 * rnd()], door: [x + 1.5, 10.05], h: -90 + 30 * (rnd() - 0.5) }));
inmates.forEach((m, i) => { m.sfx = BODIES[(i * 5 + 2) % BODIES.length]; m.east = m.door[0] > 18.5 && m.door[0] < 30; m.go = WAKE + (m.east ? 0.2 + 0.7 * rnd() : 0.9 + 3.0 * rnd()); m.v = m.east ? 1.9 : 1.05;
  m.pos = [...m.home]; m.hd = m.h; m.path = [[0, ...m.home, m.h], [m.go, ...m.home, m.h]]; m.alive = true; m.ev = []; m.state = "wait"; });
// the fight: each comes out of his door and goes for whoever is nearest, stopping at arm's length. The men from the east end are let
// come on until KNOX's blow; everyone else is shot as soon as someone has a clear line to him.
const SHOOTERS = [{ id: "B", from: BLAST + 2.0, cad: 0.62, kind: "rifle", n: 5, dt: 1 / 12 }, { id: "D", from: BLAST + 2.3, cad: 0.85, kind: "rifle", n: 3, dt: 0.125 }, { id: "C", from: 0, cad: 0.9, kind: "pistol_s", n: 2, dt: 0.22 }, { id: "A", from: REPEL + 1.0, cad: 1.25, kind: "shotgun", n: 1, dt: 0 }];
SHOOTERS[2].from = tracks.C.out + 0.3;
const clearLane = (id, from, to, t) => SQUAD.every(o => { if (o === id) return true; const p = at(o, t), L0 = dist(from, to), far = [from[0] + (to[0] - from[0]) * (L0 + 5) / L0, from[1] + (to[1] - from[1]) * (L0 + 5) / L0], u = ((p[0] - from[0]) * (far[0] - from[0]) + (p[1] - from[1]) * (far[1] - from[1])) / dist(from, far) ** 2;
  return u <= 0 || u >= 1 || Math.abs((p[0] - from[0]) * (far[1] - from[1]) - (p[1] - from[1]) * (far[0] - from[0])) / dist(from, far) >= 0.8; });
let closest = [99], CLEAR = REPEL + 3, pushed = [];
const REACH = 1.3, DT = 0.05;
for (let t = WAKE; t < BLAST + 26; t += DT) {
  if (Math.abs(t - REPEL) < DT / 2) {                                           // the blow: everything in front of the shield goes back three metres, on its feet
    const k = at("A", t);
    for (const m of inmates) { if (!m.alive || t < m.go) continue; const d = dist(m.pos, k), ang = Math.abs(face(k, m.pos)); if (m.pos[0] <= k[0] || d > 3.9 || ang > 72) continue;
      const to = [m.pos[0] + (m.pos[0] - k[0]) / d * 3.0, Math.min(9.7, Math.max(5.3, m.pos[1] + (m.pos[1] - k[1]) / d * 3.0))];
      m.path.push([t, ...m.pos, m.hd], [t + 0.35, ...to, m.hd]); pushed.push({ id: m.id, d, moved: dist(m.pos, to) }); m.pos = to; m.stun = t + 1.15; m.ev.push([t, "hit"], [t + 1.15, "walk"]); m.state = "walk"; }
  }
  for (const m of inmates) { if (!m.alive || t < m.go || t < (m.stun ?? 0)) continue;
    const inHall = m.pos[1] > 4.9 && m.pos[1] < 10.1, near = SQUAD.map(o => at(o, t)).sort((a, b) => dist(a, m.pos) - dist(b, m.pos))[0], tgt = inHall ? near : m.door, d = dist(m.pos, tgt), stop = inHall ? REACH : 0.05;
    if (m.state === "wait") { m.state = "walk"; m.ev.push([t, "walk"]); }
    if (d > stop) { const via = inHall ? route(m.pos, tgt)[0] : tgt, dv = dist(m.pos, via) || 1, s = Math.min(via === tgt ? d - stop : dv, m.v * DT); m.pos = [m.pos[0] + (via[0] - m.pos[0]) / dv * s, m.pos[1] + (via[1] - m.pos[1]) / dv * s]; m.hd = face(m.pos, via); if (m.state === "claw") { m.state = "walk"; m.ev.push([t, "walk"]); } }
    else if (inHall && m.state !== "claw") { m.state = "claw"; m.ev.push([t, "attack"]); }
    if (Math.round(t / DT) % 4 === 0) m.path.push([t, ...m.pos, m.hd]);
    for (const o of SQUAD) { const g = dist(m.pos, at(o, t)); if (g < closest[0]) closest = [g, m.id, NAME[o], t]; } }
  for (const s of SHOOTERS) { if (t < s.from || t < (s.free ?? 0)) continue; const me = at(s.id, t);
    const c = inmates.filter(m => m.alive && !m.claimed && t >= m.go && !(m.east && t < REPEL + 0.5) && m.pos[1] > 4.85 && m.pos[1] < 10.15 && clearLane(s.id, me, m.pos, t)).sort((a, b) => Math.min(...SQUAD.map(o => dist(at(o, t), a.pos))) - Math.min(...SQUAD.map(o => dist(at(o, t), b.pos))))[0];
    if (!c) continue; c.claimed = true; s.free = t + s.cad; c.td = t + (s.n - 1) * s.dt * 0.6 + 0.08; c.by = s.id;
    for (let k = 0; k < s.n; k++) fire.push({ t: t + k * s.dt, who: NAME[s.id], kind: s.kind, at: P(...c.pos) }); (s.clips ??= []).push([t, s.n * s.dt]); }
  for (const m of inmates) if (m.alive && m.td != null && t >= m.td) { m.alive = false; m.path.push([m.td, ...m.pos, m.hd, 1], [m.td + 1.0, ...m.pos, m.hd, 1], [m.td + 2.2, ...m.pos, m.hd, 0]); flashes.push({ t: m.td, who: m.id }); CLEAR = Math.max(CLEAR, m.td); }
  if (t > REPEL + 2 && inmates.every(m => !m.alive)) break;
}
for (const m of inmates) { mob(m.id, m.path); const c = [dim(0, "stand", m.sfx), hot(WAKE + 0.5 * rnd(), "turn", m.sfx, false), hot(WAKE + 0.7, "idle", m.sfx)];
  for (const [t, a] of m.ev) if (m.td == null || t < m.td) c.push(hot(t, a, m.sfx, a !== "hit")); if (m.td != null) c.push(hot(m.td, rnd() < 0.5 ? "down" : "down2", m.sfx, false)); spr(m.id, c, m.sfx); }
// MILLER puts the officer down as he turns from the cell door
for (let k = 0; k < 3; k++) fire.push({ t: BLAST + 1.4 + k * 0.125, who: "MILLER", kind: "rifle", at: P(16.0, 4.9) }); flashes.push({ t: BLAST + 1.55, who: "G1" });
repels.push({ t: REPEL, x: P(WEDGE.A[0] + 0.5, WEDGE.A[1])[0], y: P(WEDGE.A[0] + 0.5, WEDGE.A[1])[1], heading: 0, power: 0.7 });

// ---- on east: the same marching order down the south lane, past two more of Team 04, to the east door
const T_MOVE = +(CLEAR + 1.0).toFixed(2), T04B = [27.5, 8.25], T04C = [28.5, 7.35], EXIT = { A: [34.2, 7.6], B: [33.4, 6.4], C: [33.0, 8.9], E: [32.6, 7.6], D: [31.2, 9.2] };
// They form the file on the lane first (in the order they stand, so nobody crosses anybody; COLE inside, MILLER at the rear), then move as one; the whole file halts while COLE looks at the two men.
const OUT_ORDER = ["A", "B", "C", "E", "D"], GAPX = 1.5, T_FORM = +(T_MOVE + 2.0).toFixed(2), LEG1 = (27.6 - 15.5) / 2.8, HALT = 2.4, LEG2 = 1.2 / 2.8;
OUT_ORDER.forEach((id, i) => { const k = tracks[id], x0 = 20.0 - i * GAPX, dx = (3 - i) * GAPX; wait(k, T_MOVE); walk(k, [x0, LANE], 3.0, 0); wait(k, T_FORM, 0);
  k.push([T_FORM + LEG1, 27.6 + dx, LANE, id === "E" ? -70 : 0]); if (id === "E") k.kneel2 = [T_FORM + LEG1, T_FORM + LEG1 + HALT]; k.push([T_FORM + LEG1 + HALT, 27.6 + dx, LANE, id === "E" ? -70 : 0], [T_FORM + LEG1 + HALT + LEG2, 28.8 + dx, LANE, 0]); walk(k, EXIT[id], 2.4, 0); });
const T_END = +(Math.max(...SQUAD.map(id => tracks[id].at(-1)[0])) + 1.0).toFixed(2), LINK_DUR = 5.0, DUR = +(T_END + LINK_DUR).toFixed(2);
for (const k of Object.values(tracks)) wait(k, DUR);
// the men of Team 04: one in the open cell, two by the tables at the east end
mob("T04", [[0, ...BODY, 20, 0.95], [DUR, ...BODY, 20, 0.95]]); mob("T04b", [[0, ...T04B, 185, 0.95], [DUR, ...T04B, 185, 0.95]]); mob("T04c", [[0, ...T04C, 40, 0.95], [DUR, ...T04C, 40, 0.95]]);
for (const id of ["T04", "T04b", "T04c"]) sprites[id] = { dir: L + "t04", pxPerM: M, scale: SCALE, clips: [{ from: 9999, action: "lying" }] };
for (const m of mobs) { const k = m.track.keys, a = k.at(-1); if (a[0] < DUR) k.push([DUR, ...a.slice(1)]); }

// ---- squad sprites
function clipsFor(keys, base, extra = []) {
  const segs = [];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1], dt = b[0] - a[0]; if (dt < 0.02) continue;
    const v = dist([a[1], a[2]], [b[1], b[2]]) / dt, act = v > 2.5 ? base.run : v > 0.25 ? base.walk : base.idle; if (!segs.length || segs.at(-1).action !== act) segs.push({ from: a[0], action: act, loop: true }); }
  const baseAt = t => { let c = segs[0]; for (const s of segs) if (s.from <= t) c = s; return c; };
  const times = [...new Set([...segs.map(s => s.from), ...extra.flatMap(x => [x.from, x.to])])].sort((a, b) => a - b), out = [];
  for (const t of times) { const ov = extra.filter(x => x.from <= t && t < x.to).at(-1); const c = ov ? { action: ov.action, loop: !!ov.loop } : baseAt(t);
    if (!out.length || out.at(-1).action !== c.action || ov?.from === t) out.push({ from: t, action: c.action, ...(c.loop ? { loop: true } : {}) }); }
  return out;
}
const once = (t, action, len) => ({ from: t, to: t + len, action }), hold = (from, to, action) => ({ from, to, action, loop: true });
const B3 = { idle: "idle", walk: "walk", run: "run" }, sp = (dir, clips) => ({ dir: L + dir, pxPerM: M, scale: SCALE, clips });
const shots = id => (SHOOTERS.find(s => s.id === id).clips ?? []);
Object.assign(sprites, {
  A: sp("knox", clipsFor(tracks.A, B3, [hold(T_SHIELD, T_MOVE, "guard"), once(REPEL - 0.3, "bash", 0.83), ...shots("A").map(([t]) => once(t - 0.04, "shoot", 0.5))])),
  B: sp("fuse", clipsFor(tracks.B, B3, [hold(...tracks.B.plant, "plant"), hold(tracks.B.set, T_MOVE, "aim"), ...shots("B").map(([t, d]) => hold(t, t + d + 0.1, "fire"))])),
  C: sp("reyes", clipsFor(tracks.C, B3, [hold(tracks.C.out, T_MOVE, "aim"), ...shots("C").flatMap(([t]) => [once(t - 0.04, "shoot", 0.2), once(t + 0.18, "shoot", 0.3)])])),
  D: sp("miller", clipsFor(tracks.D, B3, [hold(GRAB + 1.0, BLAST + 1.3, "aim"), once(BLAST + 1.36, "shoot", 0.6), hold(tracks.D.set, T_MOVE, "aim"), ...shots("D").map(([t]) => once(t - 0.04, "shoot", 0.6))])),
  E: sp("cole", clipsFor(tracks.E, B3, [hold(...tracks.E.kneel, "kneel"), hold(tracks.E.set, T_MOVE, "crouch"), hold(...tracks.E.kneel2, "kneel")])),
});
// the squad faces what it shoots at (KNOX keeps the shield to the east until the blow has landed)
for (const s of SHOOTERS) for (const f of fire.filter(f => f.who === NAME[s.id])) { const me = at(s.id, f.t), k = tracks[s.id], h = Math.atan2(f.at[1] - P(...me)[1], f.at[0] - P(...me)[0]) * 180 / Math.PI; k.push([f.t - 0.05, ...me, h], [f.t + 0.3, ...me, h]); k.sort((a, b) => a[0] - b[0]); }
const headingAt = (id, t) => { const k = tracks[id]; let h = k[0][3]; for (const q of k) if (q[0] <= t) h = q[3]; return h; };

// ---- the walk to death row, seen from above (same plate and places as act 1)
const AIR = { sealed: [1512, 462], cell: [1830, 472], deep: [1517, 373, 1883, 571], pad: [691, 632] };
const dense = (t0, t1, f, step = 0.1) => { const k = []; for (let t = t0; t < t1 - 1e-6; t += step) k.push([+t.toFixed(3), ...f((t - t0) / (t1 - t0))]); k.push([t1, ...f(1)]); return k; };
const airSquad = Object.fromEntries(ORDER.map((id, i) => { const t0 = 0.3 + i * 0.4, a = [1392, 452], b = [AIR.sealed[0] - 8 - i * 15, AIR.sealed[1] + (i % 2 ? 9 : -7)]; return [id, dense(t0, t0 + 2.6, u => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]).concat([[LINK_DUR + 1, ...b]])]; }));
const aerial = {
  plate: "../concepts/island3_plate_b.png", sea: "../concepts/sea_tile.png", feather: ["left"], grid: "GREYROCK ISLAND", pxPerM: 5, aboard: true,
  camera: dense(0, LINK_DUR, u => [lerp(1440, 1520, u * u * (3 - 2 * u)), 468, lerp(2.3, 2.55, u)]),
  heli: { keys: [[0, ...AIR.pad], [1, ...AIR.pad]], land: 0, heading: -0.5, pad: AIR.pad, tagIn: "", tagDown: "", tagTo: 0 },
  squad: airSquad, ripple: { times: [1.9], period: 20, speed: 100, life: 3.0, x: AIR.cell[0], y: AIR.cell[1], clip: AIR.deep, outlineFrom: 0.6 },
  labels: [{ x: 1470, y: 440, text: "PASSAGE", from: 0.4, to: 2.4, side: -1 }, { x: AIR.sealed[0] + 4, y: AIR.sealed[1] - 30, text: "DEEP BLOCK  //  DOOR SEALED", from: 2.6, to: LINK_DUR, side: 1, color: "#9fd0ff" }],
};

const scene = JSON.parse(fs.readFileSync("scene/greyrock_block.json", "utf8")), open = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).block;
const cam = (t, x, y, z) => [t, ...P(x, y), z];
const doors = Object.fromEntries(scene.doors.map(d => [d.id, d.id === "IN" || d.id === "OUT" ? [[0, 1]] : d.id === "T5" ? [[0, 1], [LEVER, 1], [SHUT, 0], [BLAST, 0], [BLAST + 0.5, 1]] : /^[TB]\d/.test(d.id) ? [[0, 0], [BLAST, 0], [BLAST + 0.5, 1]] : [[0, 0]]]));
const subtitles = [
  { from: 1.2, to: 3.8, who: "REYES", text: "Open cell ahead. One of ours inside." },
  { from: 4.0, to: 5.9, who: "KNOX", text: "Cole, confirm. Reyes, cover him." },
  { from: 9.0, to: 10.5, who: "COLE", text: "One of ours. Gone." },
  { from: 10.7, to: 12.2, who: "KNOX", text: "Guard's on you. Out." },
  { from: TURN + 1.6, to: TURN + 3.1, who: "KNOX", text: "Reyes. Back away. Slow." },
  { from: GRAB + 0.1, to: GRAB + 0.9, who: "REYES", text: "Knox!" },
  { from: SHUT + 0.3, to: SHUT + 1.8, who: "DISPATCH", text: "The count just cleared." },
  { from: SHUT + 2.0, to: SHUT + 3.5, who: "KNOX", text: "Fuse. Get her out." },
  { from: PLANT + 0.2, to: PLANT + 2.5, who: "FUSE", text: "One linkage. Whole row lets go." },
  { from: PLANT + 2.7, to: PLANT + 3.5, who: "KNOX", text: "Blow it." },
  { from: BLAST + 0.9, to: BLAST + 2.4, who: "KNOX", text: "On me. Backs together." },
  { from: T_SHIELD + 0.4, to: T_SHIELD + 1.9, who: "KNOX", text: "Hold. Let them bunch." },
  { from: REPEL + 0.5, to: REPEL + 1.7, who: "KNOX", text: "Now. Drop them." },
  { from: T_MOVE - 0.6, to: T_MOVE + 0.6, who: "KNOX", text: "Clear. Move." },
  { from: tracks.E.kneel2[0] + 0.2, to: tracks.E.kneel2[0] + 2.8, who: "COLE", text: "Two more of ours. That makes three." },
  { from: tracks.E.kneel2[0] + 3.0, to: tracks.E.kneel2[0] + 4.5, who: "KNOX", text: "One left. Keep moving." },
];
// ---- helmet cameras: three short looks at what the overhead feed cannot show. All three are the same hall and the same officer
// (stills made from scene/bodycam_refs/block_hall_master.png and officer_master.png, then animated). The map carries on underneath.
const BC = "../episodes/file_001_deathrow/bodycam/", CAMS = [
  { from: 1.6, to: 4.6, unit: "REYES", clip: BC + "a2_count.mp4", clipOffset: 0.4 },                    // coming in: the count, and the open cell
  // the grab: ONE continuous take from where she stands covering the door, trimmed at both ends. One take, so the man, his dust and
  // the hall behind him cannot change between moments (separate clips did). Clip time = timeline time - T5A: he looks into the cell
  // and his pencil stops (0-3), only his head turns to her (3-6), he comes (6-8), takes her arm (8.3) and she goes into the dark.
  // Screen direction as in her first shot: cells on the left, tables on the right.
  { from: T5A + 0.3, to: IN_CELL, unit: "REYES", clip: BC + "a2_grab_take2.mp4", clipOffset: 0.3, len: 12 },
  // nothing from a helmet camera after she is taken (user, 2026-11-27): the rest of the act is the overhead feed
];
const cuts = []; { let t = 0; for (const c of CAMS) { if (c.from > t + 0.01) cuts.push({ from: t, to: c.from, type: "map" }); cuts.push({ ...c, from: Math.max(t, c.from), type: "bodycam", still: c.clip.replace(".mp4", ".png") }); t = c.to; } cuts.push({ from: t, to: T_END, type: "map" }, { from: T_END, to: DUR, type: "aerial" }); }
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_act2.mjs", scene: "../scene/greyrock_block.json", plates, roster: open.roster,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // GENERAL BLOCK // SRS", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:17:20", shots: cuts, static: [[T_END - 0.06, 0.25], ...CAMS.filter(c => c.jolt || !CAMS.some(q => Math.abs(q.to - c.from) < 0.02)).map(c => [c.from - 0.04, c.jolt ? 0.12 : 0.2])],
  doors, explored: [],
  operators: Object.fromEntries(Object.entries(tracks).map(([id, k]) => [id, { interp: "linear", keys: k.map(([t, x, y, h]) => [t, ...P(x, y), h]) }])),
  operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [[0, -900, -900, 0, 0, 0, 0, 0, 0, 0], [DUR, -900, -900, 0, 0, 0, 0, 0, 0, 0]] },
  mobs, sprites, fire, flashes, impacts, aerial,
  charges: [{ from: tracks.B.plant[1], to: BLAST, x: P(...LINK)[0], y: P(...LINK)[1], rot: 0.2 }], blasts: [{ t: BLAST, x: P(...STATION)[0], y: P(...STATION)[1], r: 150 }], repels,
  props: [{ kind: "lever", from: 0, to: BLAST, x: P(19.0, 6.14)[0], y: P(19.0, 6.14)[1], presses: [LEVER] }, { kind: "rubble", from: BLAST + 0.06, to: DUR, x: P(19.0, 5.45)[0], y: P(19.0, 5.45)[1], size: 50 }],
  events: [{ from: T5A + 0.1, to: GRAB + 0.3, x: P(...T5_DOOR)[0] + 30, y: P(...T5_DOOR)[1] - 46, text: "COUNT // 28 OF 29" }, { from: SHUT, to: SHUT + 3.0, x: P(...T5_DOOR)[0] + 30, y: P(...T5_DOOR)[1] - 46, text: "COUNT // 29 OF 29 // CLEAR" }],
  unitTags: [{ who: "REYES", from: IN_CELL + 0.3, to: BLAST + 1.4, text: "REYES // HELD // T5" }],
  camera: [cam(0, 8.6, 7.4, 1.5), cam(4.5, 9.6, 7.4, 1.5), cam(8.4, 14.0, 6.6, 1.9), cam(T5A, 15.4, 5.9, 2.2), cam(IN_CELL, 15.7, 5.5, 2.3), cam(SHUT + 0.6, 17.0, 5.9, 2.0), cam(RUN_F + 0.6, 15.6, 7.0, 1.6), cam(PLANT + 0.6, 16.9, 6.4, 1.9), cam(BLAST - 1.0, 16.2, 7.3, 1.4),
    cam(BLAST + 1.6, 16.6, 7.4, 1.34), cam(T_SHIELD, 18.6, 7.5, 1.6), cam(REPEL + 1.2, 19.4, 7.5, 1.6), cam(REPEL + 3.0, 17.2, 7.5, 1.34), cam(T_MOVE, 18.0, 7.5, 1.34), cam(T_FORM, 19.0, 7.8, 1.4), cam(T_FORM + LEG1, 26.6, 7.8, 1.6), cam(T_FORM + LEG1 + HALT, 27.0, 7.8, 1.7), cam(T_END, 29.2, 7.6, 1.5), cam(DUR, 29.2, 7.6, 1.5)],
  warn: [{ from: WAKE, to: WAKE + 2.0, text: "DOORS RELEASED  //  BLOCK ROUSED" }, { from: tracks.E.kneel2[0] + 0.4, to: T_END, text: "RECOVERY TEAM 04  //  3 OF 4 CONFIRMED  //  DECEASED" }],
  subtitles,
  freezes: [{ at: T_SHIELD, dur: HOLD, card: EQUIP.shield(0, 0) }],
  extraCues: [{ type: "oneshot", t: LEVER, sample: "door_pound", gain: 0.5 }, { type: "oneshot", t: T_END + 1.9, sample: "pulse" }, ...CAMS.map(c => ({ type: "insert_bed", from: c.from, to: c.to, kind: "bodycam" })), { type: "oneshot", t: GRAB, sample: "punch", gain: 1.0 }],
};
{ const on = [[T_SHIELD, T_MOVE - 0.3]], blows = [REPEL], keys = [];          // the light shield: open only for the fight
  for (let t = 0; t <= DUR + 0.001; t += 0.05) { let g = 0; for (const [a, b] of on) g = Math.max(g, Math.min(1, (t - a) / 0.35, (b - t) / 0.25)); if (g > 0) for (const tb of blows) if (t >= tb - 0.001 && t < tb + 0.6) g += 0.9 * Math.exp(-(t - tb) / 0.14); keys.push([+t.toFixed(2), +Math.max(0, g).toFixed(3)]); }
  tl.guard = { A: { interp: "linear", keys } }; }
addSound(tl, { ambience: "garage", gangRelease: BLAST });

// ---- checks
let bad = 0; const say = (ok, s) => { console.log(`  [${ok ? "OK" : "FAIL"}] ${s}`); if (!ok) bad++; };
{ let worst = 0; for (const s of subtitles) worst = Math.max(worst, s.text.split(/\s+/).length / 2.7 - (s.to - s.from)); say(worst <= 0.05, `every line fits its window at 2.7 words a second (worst ${worst.toFixed(2)} s over)`); }
{ const o = [...subtitles].sort((a, b) => a.from - b.from); say(o.every((s, i) => i === 0 || s.from >= o[i - 1].to + 0.15), "lines do not overlap"); say(subtitles.every(s => !(s.from < T_SHIELD && s.to > T_SHIELD)), "no line is on screen when the picture holds for the shield card"); }
{ const d = SQUAD.map(id => [NAME[id], dist(at(id, T5A + 0.4), T5_DOOR)]).sort((a, b) => a[1] - b[1]); say(d[0][0] === "REYES" && d[0][1] < 3 && d[1][1] - d[0][1] >= 1.0, `when the officer finds the cell empty, the nearest person to it is ${d[0][0]} at ${d[0][1].toFixed(1)} m; next is ${d[1][0]} at ${d[1][1].toFixed(1)} m`); }
{ let near = [9]; for (let t = 0; t < GRAB - 0.3; t += 0.05) { const p = posOf(g1, t); for (const id of SQUAD) { const d = dist(p, at(id, t)); if (d < near[0]) near = [d, NAME[id], t]; } } say(near[0] >= 1.0, `before the grab nobody is closer to the counting officer than ${near[0].toFixed(2)} m (${near[1]} at ${near[2]?.toFixed(1)} s)`); }
say(tracks.E.kneel[1] < T5A - 1 && dist(at("E", T5A), T5_DOOR) > 3, "COLE has confirmed the body and is clear of the door before the officer reaches it");
say(SQUAD.filter(id => id !== "C").every(id => dist(at(id, BLAST), STATION) >= 4.0), `nobody in the hall is within 4 m of the charge when it goes (nearest ${Math.min(...SQUAD.filter(id => id !== "C").map(id => dist(at(id, BLAST), STATION))).toFixed(1)} m; REYES is behind the cell wall)`);
say(tracks.B.back <= BLAST - 0.3, `FUSE is back in cover ${(BLAST - tracks.B.back).toFixed(1)} s before the blast`);
{ let worst = [9]; for (let t = 0; t <= T_END; t += 0.1) for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { if (t < 4 || (t > GRAB - 0.2 && t < tracks.C.out && (SQUAD[i] === "C" || SQUAD[j] === "C"))) continue; const d = dist(at(SQUAD[i], t), at(SQUAD[j], t)); if (d < worst[0]) worst = [d, NAME[SQUAD[i]], NAME[SQUAD[j]], t]; } say(worst[0] >= 1.0, `squad spacing never under 1.0 m once inside (closest ${worst[0].toFixed(2)} m, ${worst[1]} and ${worst[2]} at ${worst[3]?.toFixed(1)} s)`); }
{ let worst = [9]; for (const f of fire) { const id = SQUAD.find(o => NAME[o] === f.who), me = P(...at(id, f.t)); for (const o of SQUAD) { if (o === id) continue; const p = P(...at(o, f.t)), L0 = dist(me, f.at), u = ((p[0] - me[0]) * (f.at[0] - me[0]) + (p[1] - me[1]) * (f.at[1] - me[1])) / L0 ** 2; if (u <= 0 || u >= 1.3) continue; const d = Math.abs((p[0] - me[0]) * (f.at[1] - me[1]) - (p[1] - me[1]) * (f.at[0] - me[0])) / L0 / M; if (d < worst[0]) worst = [d, f.who, NAME[o], f.t]; } }
  say(worst[0] >= 0.8, `no round passes within 0.8 m of a friend (closest ${worst[0].toFixed(2)} m: ${worst[1]} past ${worst[2]} at ${worst[3]?.toFixed(1)} s); ${fire.length} rounds`); }
say(closest[0] >= 1.0, `no inmate gets closer to anyone than ${closest[0].toFixed(2)} m (${closest[1]} to ${closest[2]} at ${closest[3]?.toFixed(1)} s)`);
say(Math.abs(headingAt("A", REPEL) - repels[0].heading) < 5 && Math.abs(headingAt("A", T_SHIELD + 0.1) - repels[0].heading) < 5, `KNOX, his light shield and the blow all face the same way (${headingAt("A", REPEL).toFixed(0)} deg, blow ${repels[0].heading} deg)`);
say(pushed.length >= 4 && pushed.every(q => q.moved >= 2.2), `the blow throws ${pushed.length} men back ${pushed.length ? Math.min(...pushed.map(q => q.moved)).toFixed(1) : 0} m or more, on their feet (${pushed.map(q => q.id).join(" ")})`);
say(T_SHIELD > WAKE && T_SHIELD < REPEL - 1.5, "the shield card is read after the block wakes and before the blow");
say(inmates.every(m => m.td != null && m.td < T_MOVE - 0.5), `every man in the hall is down by ${CLEAR.toFixed(1)} s; the squad moves at ${T_MOVE} s`);
{ const kinds = new Set(Object.values(sprites).map(s => s.dir)), ph = inmates.map(m => sprites[m.id].phase.toFixed(2)); say(new Set(inmates.map(m => m.sfx)).size === 3 && new Set(ph).size >= inmates.length - 5 && sprites.G1.dir.endsWith("_g"), `three inmate bodies, every loop out of step, officers in their own kit (${kinds.size} sprite sets)`); }
{ let o = true; for (const k of tl.camera) { const z = k[3]; if (k[1] < 960 / z - 260 || k[1] > 2048 - 960 / z + 260 || k[2] < 540 / z - 1 || k[2] > 1152 - 540 / z + 1) { o = false; console.log("     camera key off the plate:", k.map(v => +v.toFixed(1))); } } say(o, "the camera stays on the plate top and bottom, and shows no more than the dark outside the end walls left and right"); }
say(SQUAD.every(id => at(id, T_END)[0] > 31), "everyone is at the east door when the block is left");
{ let hit = null; for (let t = 0; t <= T_END && !hit; t += 0.1) { for (const id of SQUAD) { const q = at(id, t); if (OBST.some(r => inside(q, r, 0.03))) { hit = [NAME[id], t, q]; break; } } }
  for (const m of [...inmates.map(m => [m.id, m.path]), ["G1", g1]]) for (let t = 0; t <= T_END && !hit; t += 0.1) { const q = posOf(m[1], t); if (OBST.some(r => inside(q, r, 0.03))) hit = [m[0], t, q]; }
  say(!hit, hit ? `${hit[0]} walks through furniture at ${hit[1].toFixed(1)} s (${hit[2].map(v => v.toFixed(1))})` : "nobody, squad or inmate, ever walks through a table, a stool or the station"); }
say(CAMS.every(c => fs.existsSync("renderer/" + c.clip) && c.clipOffset + c.to - c.from <= (c.len ?? 4) + 0.02) && CAMS.every(c => !(c.from < T_SHIELD && c.to > T_SHIELD)), `${CAMS.length} helmet-camera shots (${CAMS.reduce((q, c) => q + c.to - c.from, 0).toFixed(1)} s in all), each inside its clip, none across the shield card`);
fs.writeFileSync("episodes/file_001_deathrow/timeline_act2.json", JSON.stringify(tl));
console.log(bad ? `${bad} check(s) FAILED` : "all checks pass", `| map ${T_END} s + walk ${LINK_DUR} s + card ${HOLD} s = ${(DUR + HOLD).toFixed(1)} s on screen`);
if (bad) process.exit(1);
