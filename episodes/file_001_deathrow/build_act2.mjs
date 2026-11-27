// FILE 001 · DEATH ROW — ACT 2: the general block. The count that never cleared.
//   node episodes/file_001_deathrow/build_act2.mjs        (run from C:\Sam)
// Metres on scene/greyrock_block.json: hall x 2..35, y 4.5..10.5; cells above (T1..T11) and below (B1..B9); wing x 17..21 below the hall;
// entry at x = 2, way on to death row at x = 35; tables at x = 7, 13, 25, 30 (y 7..8); the officer's station at x 18.2..19.8, y 4.9..6.
//
// What is going on (the staging is built on this, and the script checks what it can):
//   the block   Nine years on, it is still doing its job. Every man stands at his door. One guard walks the count; another stands at
//               the station with his hand on the lever that works the doors. The count is one short (T5 is empty: a man of Team 04
//               lies in it), so the bell rings and the guard starts again. They are dim: nothing here has noticed the squad.
//   the squad   Stay out of its way: single file down the far side of the hall from the guard, ahead of him.
//   the count   At the empty cell the guard takes the nearest person (REYES) to make the number right. Pulling her back wakes the
//               whole block for a second, so KNOX has MILLER let go. The door shuts on her; the count clears.
//   getting her out   The doors only work from the station. FUSE blows the linkage: every door lets go at once, and every man in the
//               block wakes. KNOX holds the wing mouth and throws the eight who come out of it back with the shield; the guns do the rest.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";
const M = 56, L = "../library/characters/", SCALE = 1.12, HOT = L + "resident", DIM = L + "resident_dim";
const P = (x, y) => [8 + M * x, 20 + M * y];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
// ---- times
const BELL = 6.6, T5A = 25.2, GRAB = T5A + 2.0, PULL = T5A + 2.6, LET_GO = T5A + 3.7, IN_CELL = T5A + 4.6, LEVER = T5A + 6.0, PLANT = T5A + 10.3, BLAST = T5A + 16.4, WAKE = BLAST + 0.8, REPEL = BLAST + 4.9, CUT = BLAST + 14.5, DUR = BLAST + 19.5;
// ---- places
const T5_DOOR = [15.5, 5.0], STATION = [18.6, 5.5], LINK = [18.05, 5.6], G2_AT = [19.0, 6.55], WING = [19.0, 9.7], G1_WAIT = [16.4, 5.0];
const COVER = { A: WING, B: [13.9, 8.8], C: [15.5, 6.3], D: [14.4, 6.3], E: [12.6, 7.6] };
// ---- the squad: [t, x, y, heading]
const col = (t0, start, stop, tail) => { const a = [5.6, 8.9], t1 = t0 + dist(start, a) / 1.5, t2 = t1 + dist(a, stop) / 1.5; return [[0, ...start, 0], [t0, ...start, 0], [t1, ...a, 0], [t2, ...stop, 0], ...tail(t2)]; };
const leg = (t, from, to, h, v = 1.5) => [t + dist(from, to) / v, ...to, h];
const tracks = {
  A: [...col(11.6, [5.7, 7.5], [15.0, 8.9], t => [leg(t, [15.0, 8.9], [17.4, 8.0], -60)]), [T5A + 9.4, 17.4, 8.0, -60], [T5A + 11.0, ...WING, 90], [CUT - 0.01, ...WING, 90], [CUT, 33.0, 7.5, 0], [DUR, 33.0, 7.5, 0]],
  D: [...col(12.7, [4.4, 8.5], [15.0, 8.9], t => [leg(t, [15.0, 8.9], [17.3, 6.6], -90)]), [T5A + 0.9, 17.3, 6.6, face([17.3, 6.6], T5_DOOR)], [PULL - 0.2, 17.3, 6.6, -110], [PULL, 16.35, 5.75, -120], [LET_GO, 16.35, 5.75, -120], [LET_GO + 0.5, 17.3, 6.6, -110],
    [T5A + 7.4, 17.3, 6.6, face([17.3, 6.6], G1_WAIT)], [T5A + 8.6, ...COVER.D, face(COVER.D, G1_WAIT)], [CUT - 0.01, ...COVER.D, 0], [CUT, 31.8, 8.4, 0], [DUR, 31.8, 8.4, 0]],
  E: [...col(13.6, [2.5, 7.5], [14.2, 8.9], t => [leg(t, [14.2, 8.9], [15.2, 8.2], -80), [22.9, 15.5, 5.25, -90]]), [23.6, 15.5, 5.25, -90], [24.5, 14.6, 6.3, -40], [T5A + 6.4, 14.6, 6.3, -40], [T5A + 7.4, 12.6, 6.3, 180], [T5A + 8.2, ...COVER.E, 0], [CUT - 0.01, ...COVER.E, 0], [CUT, 29.4, 7.5, 0], [DUR, 29.4, 7.5, 0]],
  C: [[0, 3.5, 7.5, 0], [6.8, 3.5, 7.5, 0], [7.5, 4.45, 7.5, 0], ...col(13.1, [4.45, 7.5], [16.2, 8.9], t => [[22.6, 16.2, 8.9, -90], [24.4, 16.2, 5.5, -120]]).slice(1), [GRAB, 16.2, 5.5, face([16.2, 5.5], [15.95, 5.3])], [IN_CELL, 14.9, 3.6, -90], [IN_CELL + 0.6, 14.9, 3.6, 90],
    [BLAST + 1.9, 15.2, 3.9, 90], [BLAST + 2.8, ...COVER.C, 60], [CUT - 0.01, ...COVER.C, 0], [CUT, 30.6, 7.5, 0], [DUR, 30.6, 7.5, 0]],
  B: [...col(16.0, [4.4, 6.5], [13.6, 9.0], t => []), [T5A + 7.6, 13.6, 9.0, 0], [T5A + 8.7, 15.6, 8.5, -50], [PLANT - 0.1, 17.45, 5.85, -20], [PLANT + 2.1, 17.45, 5.85, -20], [PLANT + 3.6, 15.4, 8.5, 150], [PLANT + 4.6, ...COVER.B, 0],
    [CUT - 0.01, ...COVER.B, 0], [CUT, 31.8, 6.6, 0], [DUR, 31.8, 6.6, 0]],
};
for (const k of Object.values(tracks)) k.sort((a, b) => a[0] - b[0]);
const at = (id, t) => { const k = tracks[id]; if (t <= k[0][0]) return [k[0][1], k[0][2]]; for (let i = 1; i < k.length; i++) if (k[i][0] >= t) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } return [k.at(-1)[1], k.at(-1)[2]]; };
const NAME = { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" }, SQUAD = Object.keys(tracks);

// ---- the block's people
const mobs = [], sprites = {}, fire = [], impacts = [], flashes = [], repels = [];
const mob = (id, keys) => mobs.push({ id, species: "inmate", track: { interp: "linear", keys: keys.map(([t, x, y, h, v = 1]) => [t, ...P(x, y), h, v, 0, 1, 0, 0, 0]) } });
const spr = (id, clips, dir = DIM) => { sprites[id] = { dir, pxPerM: M, scale: SCALE, clips }; };
const stand = from => ({ from, dir: DIM, action: "stand", loop: true }), hot = (from, action, loop = true) => ({ from, dir: HOT, action, ...(loop ? { loop } : {}) });
// G1 walks the count: bottom row B3..B1, the bell, across the hall, then the top row from T1
const g1 = [[0, 9.5, 10.0, 90], [0.6, 9.5, 10.0, 180], [3.1, 6.5, 10.0, 180], [3.3, 6.5, 10.0, 90], [3.9, 6.5, 10.0, 180], [6.2, 3.5, 10.0, 180], [6.4, 3.5, 10.0, 90], [BELL + 0.3, 3.5, 10.0, 90], [BELL + 0.6, 3.5, 10.0, -90], [11.0, 3.5, 5.0, -90]];
for (let i = 0; i < 4; i++) { const t = 11.2 + 3.5 * i, x = 3.5 + 3 * i; g1.push([t + 1.0, x, 5.0, -90], [t + 1.2, x, 5.0, 0], [t + 3.5 - 0.2, x + 3, 5.0, 0], [t + 3.5, x + 3, 5.0, -90]); }
g1.push([T5A + 0.9, ...T5_DOOR, -90], [T5A + 1.3, ...T5_DOOR, 25], [T5A + 1.9, 15.95, 5.3, 25], [GRAB + 0.2, 15.95, 5.3, -100], [IN_CELL, 15.6, 3.2, -90], [IN_CELL + 0.3, 15.6, 3.2, 70], [IN_CELL + 0.9, 16.1, 4.2, 70], [IN_CELL + 1.4, ...G1_WAIT, 90],
  [BLAST + 0.7, ...G1_WAIT, 90], [BLAST + 0.9, ...G1_WAIT, 200], [BLAST + 1.2, 16.1, 4.85, 215], [BLAST + 1.4, 16.1, 4.85, 215, 1], [BLAST + 3.0, 16.1, 4.85, 215, 0], [DUR, 16.1, 4.85, 215, 0]);
mob("G1", g1);
{ const c = []; for (let i = 0; i + 1 < g1.length; i++) { const a = g1[i], b = g1[i + 1]; if (b[0] > BLAST + 0.6) break; const mv = dist([a[1], a[2]], [b[1], b[2]]) / (b[0] - a[0] || 1) > 0.25, act = mv ? "walk" : "stand"; if (!c.length || c.at(-1).action !== act) c.push({ from: a[0], dir: DIM, action: act, loop: true }); }
  c.push(hot(PULL + 0.1, "turn", false), stand(LET_GO), { from: LET_GO + 0.05, dir: DIM, action: "walk", loop: true }, stand(IN_CELL), { from: IN_CELL + 0.3, dir: DIM, action: "walk", loop: true }, stand(IN_CELL + 1.4), hot(BLAST + 0.7, "idle"), hot(BLAST + 0.95, "attack", false), hot(BLAST + 1.4, "down", false));
  c.sort((a, b) => a.from - b.from); spr("G1", c); }
mob("G2", [[0, ...G2_AT, -90], [BLAST, ...G2_AT, -90, 1], [BLAST + 0.15, ...G2_AT, -90, 0], [DUR, ...G2_AT, -90, 0]]); spr("G2", [stand(0)]);
// the inmates: one to a cell (two in each wing cell), standing at the door
const inmates = [];
for (let i = 0; i < 11; i++) if (i !== 4) inmates.push({ id: `T${i + 1}`, home: [3.5 + 3 * i, 4.0], door: [3.5 + 3 * i, 4.95], h: 90 });
[2, 5, 8, 11, 14, 21, 24, 27, 30].forEach((x, i) => inmates.push({ id: `B${i + 1}`, home: [x + 1.5, 11.0], door: [x + 1.5, 10.05], h: -90 }));
[[16.3, 14.9, 0], [15.4, 14.6, 0], [16.3, 17.9, 0], [15.4, 17.6, 0], [21.7, 14.9, 180], [22.6, 14.6, 180], [21.7, 17.9, 180], [22.6, 17.6, 180]].forEach(([x, y, h], i) =>
  inmates.push({ id: `W${i + 1}`, home: [x, y], door: [h ? 20.2 : 17.8, y > 16 ? 17.9 : 14.9], h, wing: true, spot: [18.1 + 0.6 * (i % 4) + (i > 3 ? 0.0 : 0.0), i % 2 ? 12.5 : 11.5] }));
inmates.filter(m => m.wing).forEach((m, i) => { m.spot = [18.1 + 0.6 * (i % 4), i < 4 ? 11.5 : 12.6]; });
// the wing: they come up it and bunch at the mouth just as KNOX's shield is ready, and it throws all eight back down
for (const m of inmates.filter(m => m.wing)) { const len = dist(m.home, m.door) + dist(m.door, m.spot), v = Math.min(1.75, Math.max(1.1, len / (REPEL - 0.3 - WAKE - 0.4))), go = REPEL - 0.25 - len / v, tDoor = go + dist(m.home, m.door) / v, back = [m.spot[0] + (m.spot[0] - 19) * 0.6, m.spot[1] + 3.3 + rnd()];
  m.go = go; m.td = REPEL; m.keys = [[0, ...m.home, m.h], [go, ...m.home, m.h], [tDoor, ...m.door, face(m.home, m.door)], [REPEL - 0.25, ...m.spot, -90], [REPEL, ...m.spot, -90], [REPEL + 0.35, ...back, -90, 1], [REPEL + 1.2, ...back, -90, 1], [REPEL + 2.4, ...back, -90, 0], [DUR, ...back, -90, 0]]; }
// the hall: each wakes a little after the next, comes out of his door and walks at whoever is nearest; the squad shoots the nearest threat it has a clear line to
const hall = inmates.filter(m => !m.wing); hall.forEach(m => { m.go = WAKE + 0.5 + 3.4 * rnd(); m.pos = [...m.home]; m.path = [[0, ...m.home, m.h], [m.go, ...m.home, m.h]]; m.alive = true; });
const SHOOTERS = [{ id: "B", from: BLAST + 1.7, cad: 0.62, kind: "rifle", n: 5, dt: 1 / 12 }, { id: "D", from: BLAST + 2.0, cad: 0.85, kind: "rifle", n: 3, dt: 0.125 }, { id: "C", from: BLAST + 3.2, cad: 0.9, kind: "pistol_s", n: 2, dt: 0.22 }, { id: "A", from: REPEL + 1.0, cad: 1.25, kind: "shotgun", n: 1, dt: 0 }];
const clearLane = (id, from, to, t) => SQUAD.every(o => { if (o === id) return true; const p = at(o, t), L0 = dist(from, to), far = [from[0] + (to[0] - from[0]) * (L0 + 5) / L0, from[1] + (to[1] - from[1]) * (L0 + 5) / L0], u = ((p[0] - from[0]) * (far[0] - from[0]) + (p[1] - from[1]) * (far[1] - from[1])) / dist(from, far) ** 2;
  return u <= 0 || u >= 1 || Math.abs((p[0] - from[0]) * (far[1] - from[1]) - (p[1] - from[1]) * (far[0] - from[0])) / dist(from, far) >= 0.8; });
let closest = [99];
for (let t = WAKE; t < CUT - 1; t += 0.05) {
  for (const m of hall) { if (!m.alive || t < m.go) continue; const inHall = m.pos[1] > 4.9 && m.pos[1] < 10.1, tgt = inHall ? SQUAD.map(o => at(o, t)).sort((a, b) => dist(a, m.pos) - dist(b, m.pos))[0] : m.door, d = dist(m.pos, tgt);
    if (d > 0.05) { const s = Math.min(d, 1.05 * 0.05); m.pos = [m.pos[0] + (tgt[0] - m.pos[0]) / d * s, m.pos[1] + (tgt[1] - m.pos[1]) / d * s]; m.hd = face(m.pos, tgt); }
    if (Math.round(t * 20) % 5 === 0) m.path.push([t, ...m.pos, m.hd ?? m.h]);
    for (const o of SQUAD) { const g = dist(m.pos, at(o, t)); if (g < closest[0]) closest = [g, m.id, NAME[o], t]; } }
  for (const s of SHOOTERS) { if (t < s.from || t < (s.free ?? 0)) continue; const me = at(s.id, t);
    const c = hall.filter(m => m.alive && !m.claimed && t >= m.go && m.pos[1] > 4.85 && m.pos[1] < 10.15 && clearLane(s.id, me, m.pos, t)).sort((a, b) => Math.min(...SQUAD.map(o => dist(at(o, t), a.pos))) - Math.min(...SQUAD.map(o => dist(at(o, t), b.pos))))[0];
    if (!c) continue; c.claimed = true; s.free = t + s.cad; c.td = t + (s.n - 1) * s.dt * 0.6 + 0.08; c.by = s.id;
    for (let k = 0; k < s.n; k++) fire.push({ t: t + k * s.dt, who: NAME[s.id], kind: s.kind, at: P(...c.pos) }); (s.clips ??= []).push([t, s.n * s.dt]); }
  for (const m of hall) if (m.alive && m.td != null && t >= m.td) { m.alive = false; m.path.push([m.td, ...m.pos, m.hd ?? m.h, 1], [m.td + 1.0, ...m.pos, m.hd ?? m.h, 1], [m.td + 2.2, ...m.pos, m.hd ?? m.h, 0], [DUR, ...m.pos, m.hd ?? m.h, 0]); flashes.push({ t: m.td, who: m.id }); }
}
for (const m of hall) m.keys = m.path;
for (const m of inmates) { mob(m.id, m.keys); const c = [stand(0), hot(PULL + 0.15 + 0.3 * rnd(), "turn", false), stand(LET_GO + 0.1), hot(WAKE + 0.4 * rnd(), "idle"), hot(m.go, "walk")]; if (m.td != null) c.push(hot(m.td, "down", false)); spr(m.id, c); }
// the men of Team 04: one in the empty cell; after the cut, the three they have found lie at the way in
mob("T04", [[0, 15.3, 3.0, 20, 0.95], [CUT - 0.01, 15.3, 3.0, 20, 0.95], [CUT, 2.9, 6.7, 5, 0.95], [DUR, 2.9, 6.7, 5, 0.95]]); mob("T04b", [[0, 2.9, 7.6, 185, 0], [CUT - 0.01, 2.9, 7.6, 185, 0], [CUT, 2.9, 7.6, 185, 0.95], [DUR, 2.9, 7.6, 185, 0.95]]); mob("T04c", [[0, 3.0, 8.5, 12, 0], [CUT - 0.01, 3.0, 8.5, 12, 0], [CUT, 3.0, 8.5, 12, 0.95], [DUR, 3.0, 8.5, 12, 0.95]]);
for (const id of ["T04", "T04b", "T04c"]) sprites[id] = { dir: L + "t04", pxPerM: M, scale: SCALE, clips: [{ from: 9999, action: "lying" }] };
// MILLER puts the guard down as he reaches for REYES in the doorway
for (let k = 0; k < 3; k++) fire.push({ t: BLAST + 1.25 + k * 0.125, who: "MILLER", kind: "rifle", at: P(16.1, 4.85) }); flashes.push({ t: BLAST + 1.4, who: "G1" });
repels.push({ t: REPEL, x: P(WING[0], WING[1] + 0.5)[0], y: P(WING[0], WING[1] + 0.5)[1], heading: 90, power: 0.7 });

// ---- squad sprites
function clipsFor(keys, base, extra = []) {
  const segs = [];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1], dt = b[0] - a[0]; if (dt < 0.02) continue;
    const v = dist([a[1], a[2]], [b[1], b[2]]) / dt, act = v > 2.6 ? base.run : v > 0.25 ? base.walk : base.idle; if (!segs.length || segs.at(-1).action !== act) segs.push({ from: a[0], action: act, loop: true }); }
  const baseAt = t => { let c = segs[0]; for (const s of segs) if (s.from <= t) c = s; return c; };
  const times = [...new Set([...segs.map(s => s.from), ...extra.flatMap(x => [x.from, x.to])])].sort((a, b) => a - b), out = [];
  for (const t of times) { const ov = extra.filter(x => x.from <= t && t < x.to).at(-1); const c = ov ? { from: ov.from === t ? t : null, action: ov.action, loop: !!ov.loop } : { ...baseAt(t), from: t };
    if (!out.length || out.at(-1).action !== c.action || ov?.from === t) out.push({ from: t, action: c.action, ...(c.loop ? { loop: true } : {}) }); }
  return out;
}
const once = (t, action, len) => ({ from: t, to: t + len, action }), hold = (from, to, action) => ({ from, to, action, loop: true });
const B3 = { idle: "idle", walk: "walk", run: "run" }, sp = (dir, clips) => ({ dir: L + dir, pxPerM: M, scale: SCALE, clips });
const shots = id => (SHOOTERS.find(s => s.id === id).clips ?? []);
Object.assign(sprites, {
  A: sp("knox", clipsFor(tracks.A, B3, [hold(T5A + 11.0, CUT, "guard"), once(REPEL - 0.3, "bash", 0.83), ...shots("A").map(([t]) => once(t - 0.04, "shoot", 0.5))])),
  B: sp("fuse", clipsFor(tracks.B, B3, [hold(PLANT, PLANT + 2.0, "plant"), hold(PLANT + 4.6, CUT, "aim"), ...shots("B").map(([t, d]) => hold(t, t + d + 0.1, "fire"))])),
  C: sp("reyes", clipsFor(tracks.C, B3, [hold(BLAST + 2.8, CUT, "aim"), ...shots("C").flatMap(([t]) => [once(t - 0.04, "shoot", 0.2), once(t + 0.18, "shoot", 0.3)])])),
  D: sp("miller", clipsFor(tracks.D, B3, [hold(T5A + 7.4, CUT, "aim"), once(BLAST + 1.21, "shoot", 0.6), ...shots("D").map(([t]) => once(t - 0.04, "shoot", 0.6))])),
  E: sp("cole", clipsFor(tracks.E, B3, [hold(22.9, 24.0, "crouch"), hold(T5A + 8.2, CUT, "crouch")])),
});
// the squad faces what it shoots at
for (const s of SHOOTERS) for (const f of fire.filter(f => f.who === NAME[s.id])) { const me = at(s.id, f.t), k = tracks[s.id], h = Math.atan2(f.at[1] - P(...me)[1], f.at[0] - P(...me)[0]) * 180 / Math.PI; k.push([f.t - 0.05, ...me, h], [f.t + 0.3, ...me, h]); k.sort((a, b) => a[0] - b[0]); }

const scene = JSON.parse(fs.readFileSync("scene/greyrock_block.json", "utf8")), open = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).block;
const cam = (t, x, y, z) => [t, ...P(x, y), z], WIDE = [1024, 576, 1.02];
const doors = Object.fromEntries(scene.doors.map(d => [d.id, d.id === "IN" || d.id === "OUT" ? [[0, 1]] : d.id === "T5" ? [[0, 1], [LEVER, 1], [LEVER + 0.6, 0], [BLAST, 0], [BLAST + 0.5, 1]] : [[0, 0], [BLAST, 0], [BLAST + 0.5, 1]]]));
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_act2.mjs", scene: "../scene/greyrock_block.json", plates, roster: open.roster,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // GENERAL BLOCK // SRS", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:02:40", shots: [{ from: 0, to: DUR, type: "map" }], static: [[CUT - 0.12, 0.3]],
  doors, explored: [],
  operators: Object.fromEntries(Object.entries(tracks).map(([id, k]) => [id, { interp: "linear", keys: k.map(([t, x, y, h]) => [t, ...P(x, y), h]) }])),
  operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [[0, -900, -900, 0, 0, 0, 0, 0, 0, 0], [DUR, -900, -900, 0, 0, 0, 0, 0, 0, 0]] },
  mobs, sprites, fire, flashes, impacts,
  charges: [{ from: PLANT + 2.0, to: BLAST, x: P(...LINK)[0], y: P(...LINK)[1], rot: 0.2 }], blasts: [{ t: BLAST, x: P(...STATION)[0], y: P(...STATION)[1], r: 150 }], repels,
  dashes: [{ who: "A", from: T5A + 9.4, to: T5A + 11.0 }],
  props: [{ kind: "panel", from: 0, to: BLAST, x: P(19.0, 6.05)[0], y: P(19.0, 6.05)[1], presses: [-30, LEVER] }, { kind: "rubble", from: BLAST + 0.06, to: DUR, x: P(19.0, 5.45)[0], y: P(19.0, 5.45)[1], size: 50 }],
  events: [{ from: BELL, to: BELL + 2.2, x: P(3.5, 10.0)[0] + 26, y: P(3.5, 10.0)[1] - 40, text: "COUNT // 28 OF 29 // AGAIN" }, { from: 17.2, to: 17.9, x: P(33.6, 2.6)[0], y: P(33.6, 2.6)[1], text: "SIG ?" },
    { from: T5A + 0.4, to: GRAB + 0.4, x: P(...T5_DOOR)[0] + 30, y: P(...T5_DOOR)[1] - 46, text: "COUNT // 28 OF 29" }, { from: LEVER + 0.6, to: LEVER + 3.4, x: P(...T5_DOOR)[0] + 30, y: P(...T5_DOOR)[1] - 46, text: "COUNT // 29 OF 29 // CLEAR" },
    { from: CUT + 0.2, to: DUR, x: P(31.2, 5.6)[0], y: P(31.2, 5.6)[1], text: "+ 00:14:00" }],
  unitTags: [{ who: "REYES", from: IN_CELL + 0.4, to: BLAST + 1.8, text: "REYES // HELD // T5" }],
  camera: [cam(0, 7.6, 7.9, 1.8), cam(6.4, 7.4, 7.9, 1.8), cam(11.0, 7.6, 6.8, 1.7), cam(14.0, 9.5, 7.4, 1.5), cam(17.0, 12.8, 7.2, 1.45), [17.3, ...P(22, 6.4), 1.08], [18.4, ...P(22, 6.4), 1.08], cam(20.6, 15.4, 6.6, 1.7), cam(T5A, 15.8, 5.6, 2.2), cam(IN_CELL, 15.7, 5.0, 2.3),
    cam(LEVER + 0.8, 16.6, 5.4, 2.0), cam(T5A + 8.0, 16.2, 6.4, 1.6), cam(PLANT + 1.0, 17.0, 6.0, 1.9), cam(BLAST - 1.2, 16.0, 7.4, 1.35), cam(BLAST + 1.6, 16.0, 6.4, 1.5), [BLAST + 3.2, ...P(17.5, 9.0), 1.1], [REPEL - 1.0, ...P(18.5, 10.2), 1.5], cam(REPEL + 1.2, 19.0, 11.6, 1.6),
    [REPEL + 2.6, ...WIDE], [CUT - 0.2, ...WIDE], [CUT, ...WIDE], [CUT + 1.6, ...WIDE], cam(CUT + 3.0, 26.6, 7.5, 1.45), cam(DUR, 26.8, 7.5, 1.45)],
  warn: [{ from: PULL + 0.1, to: LET_GO, text: "BLOCK ROUSED  //  ALL RESIDENTS" }, { from: WAKE, to: WAKE + 3.0, text: "DOORS RELEASED  //  BLOCK ROUSED" }, { from: CUT + 0.3, to: DUR, text: "RECOVERY TEAM 04  //  3 OF 4 CONFIRMED  //  DECEASED" }],
  subtitles: [
    { from: 0.5, to: 2.0, who: "REYES", text: "And if they're still alive?" }, { from: 2.2, to: 3.6, who: "DISPATCH", text: "Then you bring them home." },
    { from: 3.8, to: 6.2, who: "MILLER", text: "Mask sealed, Reyes. I'm not carrying you back." },
    { from: 7.8, to: 9.2, who: "REYES", text: "Why are they still counting?" },
    { from: 9.4, to: 13.0, who: "KNOX", text: "When a place lapses, it keeps doing its job. Stay long enough, you're part of it." },
    { from: 13.2, to: 14.4, who: "KNOX", text: "Stay out of its way." }, { from: 14.6, to: 16.0, who: "FUSE", text: "Or you're part of the count." },
    { from: 17.9, to: 18.9, who: "REYES", text: "Dispatch. Far end?" }, { from: 19.1, to: 20.3, who: "DISPATCH", text: "Sensor ghost. Logged." },
    { from: 23.2, to: 24.3, who: "COLE", text: "It's one of ours." },
    { from: PULL + 0.2, to: PULL + 1.1, who: "KNOX", text: "Miller. Let go." }, { from: LET_GO + 0.1, to: LET_GO + 1.1, who: "REYES", text: "I'm okay. Don't." },
    { from: LEVER + 0.7, to: LEVER + 2.0, who: "DISPATCH", text: "...The count just cleared." },
    { from: T5A + 7.6, to: T5A + 9.2, who: "KNOX", text: "Not that one. They watch him." },
    { from: PLANT + 2.1, to: PLANT + 3.8, who: "FUSE", text: "One linkage. Whole row lets go." }, { from: PLANT + 3.9, to: PLANT + 5.0, who: "KNOX", text: "Blow it. Positions." },
    { from: BLAST + 1.7, to: BLAST + 3.2, who: "REYES", text: "Side wing! The wing's open too!" },
    { from: REPEL + 0.6, to: REPEL + 1.7, who: "REYES", text: "...The shield does that?" }, { from: REPEL + 1.9, to: REPEL + 3.2, who: "KNOX", text: "Once. Then it needs time." },
    { from: CUT + 0.8, to: CUT + 3.0, who: "COLE", text: "Three of four. All gone. One still missing." }, { from: CUT + 3.2, to: CUT + 4.4, who: "KNOX", text: "Death row. Move." },
  ],
  extraCues: [BELL, LEVER + 0.6].map(t => ({ type: "oneshot", t, sample: "door_pound", gain: 0.5 })),
};
{ const on = [[BLAST + 0.3, CUT - 1.5]], blows = [REPEL], keys = [];          // the light shield: only once the block is awake
  for (let t = 0; t <= DUR + 0.001; t += 0.05) { let g = 0; for (const [a, b] of on) g = Math.max(g, Math.min(1, (t - a) / 0.35, (b - t) / 0.25)); if (g > 0) for (const tb of blows) if (t >= tb - 0.001 && t < tb + 0.6) g += 0.9 * Math.exp(-(t - tb) / 0.14); keys.push([+t.toFixed(2), +Math.max(0, g).toFixed(3)]); }
  tl.guard = { A: { interp: "linear", keys } }; }
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline_act2.json", JSON.stringify(tl));

// ---- checks
let bad = 0; const say = (ok, s) => { console.log(`  [${ok ? "OK" : "FAIL"}] ${s}`); if (!ok) bad++; };
console.log(`act 2: ${DUR.toFixed(1)} s; guard at the empty cell ${T5A}, blast ${BLAST.toFixed(1)}, shield ${REPEL.toFixed(1)}, cut ${CUT.toFixed(1)}`);
{ const g = [15.5, 5.0], d = SQUAD.map(o => ({ who: NAME[o], d: dist(at(o, T5A + 0.9), g) })).sort((a, b) => a.d - b.d); say(d[0].who === "REYES" && d[1].d - d[0].d >= 0.4, `at the empty cell the nearest to the guard is ${d.map(o => `${o.who} ${o.d.toFixed(1)} m`).slice(0, 3).join(", ")}`); }
say(SQUAD.every(o => dist(at(o, BLAST), STATION) >= 3.2), `at the blast the nearest of the squad is ${Math.min(...SQUAD.map(o => dist(at(o, BLAST), STATION))).toFixed(1)} m from the station`);
const left = hall.filter(m => m.alive); say(!left.length, left.length ? `${left.length} still up at the cut: ${left.map(m => m.id).join(" ")}` : `all ${hall.length} in the hall are down by ${Math.max(...hall.map(m => m.td)).toFixed(1)} s; the eight from the wing go to the shield`);
say(closest[0] >= 0.9, `the nearest any of them gets to the squad: ${closest[1]}, ${closest[0].toFixed(1)} m from ${closest[2]} at ${closest[3]?.toFixed(1)} s`);
say(inmates.filter(m => m.wing).every(m => dist(m.spot, WING) >= 1.5), "the wing's eight are bunched in front of the shield, none within arm's reach, when it goes");
let gap = [99];
for (let t = 0; t <= DUR; t += 0.25) for (let i = 0; i < SQUAD.length; i++) for (let j = i + 1; j < SQUAD.length; j++) { if (t > PULL - 0.4 && t < LET_GO + 0.6 && [SQUAD[i], SQUAD[j]].sort().join() === "C,D") continue; const g = dist(at(SQUAD[i], t), at(SQUAD[j], t)); if (g < gap[0]) gap = [g, NAME[SQUAD[i]], NAME[SQUAD[j]], t]; }
say(gap[0] >= 1.0, `closest any two of the squad come: ${gap[1]} and ${gap[2]}, ${gap[0].toFixed(1)} m at ${gap[3]} s`);
let g1gap = [99]; for (let t = 0; t <= T5A - 1; t += 0.25) { const i = g1.findLastIndex(k => k[0] <= t), a = g1[i], b = g1[Math.min(i + 1, g1.length - 1)], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0, p = [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; for (const o of SQUAD) { const d = dist(at(o, t), p); if (d < g1gap[0]) g1gap = [d, NAME[o], t]; } }
say(g1gap[0] >= 0.9, `before the empty cell, the closest the guard passes to anyone: ${g1gap[0].toFixed(1)} m from ${g1gap[1]} at ${g1gap[2]} s`);
console.log(bad ? `${bad} FAIL` : "all checks pass"); if (bad) process.exitCode = 1;
