// FILE 001 · DEATH ROW — ACT 3 only (the steel door to the first swap), on the open map, staged as a trained team would do it.
//   node episodes/file_001_deathrow/build_act3.mjs        (run from C:\Sam)
// Metres: x from the steel door into the hall (hall 24 x 14, columns at x = 6, 11, 16 and y = +-3.6, bars at 19.5), y across.
//
// How they do it:
//   stack    outside the door on one side, shield first, one man watching the rear
//   entry    shield straight in and stop; the next two take the near corners (left, right); nobody stands in the doorway
//   bound    one element moves while another covers; the machine gun and the long rifle set up as overwatch on the cell
//   forward  only the two who must go forward go; the others' lanes of fire pass either side of them
// The script prints every lane and how far each friendly stands from it. The first ripple then takes the nearest: COLE.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";
const M = 64, X0 = 400, YC = 576, L = "../library/characters/", SCALE = 1.15;
const P = (x, y) => [X0 + x * M, YC + y * M];
const RIPPLE = 4.5, LOCK = 0.6, EPS = 0.001, DUR = 33.5, E0 = 4, E1 = 24;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
const SEAT = [21.9, 0], BODY = [13.0, 0.9], CELL_MID = [21.0, 0];
// where each of them ends up before the ripple
const KNOX_HOLD = [6.0, 0], KNOX_COVER = [11.2, 0.8], KNOX_BACK = [10.7, 0.85], BOSS_UP = [11.75, 0.75], FUSE_FLANK = [9.9, 4.5], FUSE_GUN = [5.3, 3.0], REYES_GLASS = [1.2, -1.7], MILLER_COVER = [11.8, -2.2], COLE_BODY = [12.4, 0.5];
const touch = E1 + dist(SEAT, COLE_BODY) / RIPPLE, S1 = touch + LOCK;
const H1 = { t: E1, touch, swap: S1, who: "COLE" };

// ---- [t, x, y, heading]: 0 = toward the cell, 180 = back toward the door
const tracks = {
  // KNOX: first in the stack, straight in, stops; holds the centre line; goes forward the moment it happens
  A: [[0, -0.9, -1.5, 35], [10.0, -0.9, -1.5, 35], [10.5, 0.3, -0.3, 0], [11.4, 2.5, 0, 0], [14.2, 2.5, 0, 0], [17.4, ...KNOX_HOLD, 0], [19.6, ...KNOX_HOLD, 0],
    [22.0, ...KNOX_COVER, 0], [S1 + 0.5, ...KNOX_COVER, 0], [S1 + 1.2, ...KNOX_BACK, 0], [S1 + 1.8, ...KNOX_BACK, 0], [S1 + 1.92, KNOX_BACK[0] - 0.16, KNOX_BACK[1], 0], [S1 + 2.30, ...KNOX_BACK, 0], [S1 + 2.9, ...KNOX_BACK, 0], [S1 + 3.02, KNOX_BACK[0] - 0.16, KNOX_BACK[1], 0], [S1 + 3.40, ...KNOX_BACK, 0], [S1 + 4.0, ...KNOX_BACK, 0], [S1 + 4.12, KNOX_BACK[0] - 0.16, KNOX_BACK[1], 0], [S1 + 4.50, ...KNOX_BACK, 0], [DUR, ...KNOX_BACK, 0]],     // goes forward with COLE and stands a step behind his shoulder, shield toward the cell; gives half a step when it comes at him
  // MILLER: second, takes the left corner, bounds up the left-hand columns, then goes forward as COLE's close cover, off both lanes
  D: [[0, -1.9, -1.7, 20], [10.4, -1.9, -1.7, 20], [10.9, 0.7, 0.0, -30], [12.0, 1.6, -4.2, -20], [12.6, 1.5, -4.2, 0], [14.6, 1.5, -4.2, 0], [17.2, 5.2, -2.8, 0], [19.6, 5.2, -2.8, 0],
    [21.4, 10.3, -2.9, 0], [22.6, ...MILLER_COVER, face(MILLER_COVER, CELL_MID)], [S1 + 0.15, ...MILLER_COVER, face(MILLER_COVER, CELL_MID)], [S1 + 0.5, ...MILLER_COVER, face(MILLER_COVER, COLE_BODY)],
    [S1 + 1.9, ...MILLER_COVER, face(MILLER_COVER, BOSS_UP)], [DUR, ...MILLER_COVER, face(MILLER_COVER, BOSS_UP)]],       // does not move: he is square on the flank already, and behind the man from here is only wall
  // FUSE: opens the door, third in, takes the right corner, sets the gun up at the first right-hand column
  B: [[0, -2.9, -1.8, 15], [8.6, -2.9, -1.8, 15], [9.3, -1.55, 2.2, -30], [10.9, -1.55, 2.2, -30], [11.4, -0.3, 0.6, -40], [11.7, 0.5, 0.6, 60], [12.5, 1.5, 4.2, 20], [13.1, 1.5, 4.2, 0], [14.8, 1.5, 4.2, 0],
    [17.6, ...FUSE_GUN, face(FUSE_GUN, CELL_MID)], [S1 + 0.2, ...FUSE_GUN, face(FUSE_GUN, CELL_MID)], [S1 + 0.6, ...FUSE_GUN, face(FUSE_GUN, COLE_BODY)], [S1 + 1.3, ...FUSE_GUN, face(FUSE_GUN, COLE_BODY)], [S1 + 2.9, ...FUSE_FLANK, face(FUSE_FLANK, BOSS_UP)], [DUR, ...FUSE_FLANK, face(FUSE_FLANK, BOSS_UP)]],
  // REYES: rear security until they are in, then just inside the door with the long rifle on the cell
  C: [[0, -4.4, 0.7, 180], [11.6, -4.4, 0.7, 180], [12.0, -4.2, 0.4, 0], [13.6, -0.5, -0.5, -20], [14.3, ...REYES_GLASS, face(REYES_GLASS, CELL_MID)], [S1 + 0.2, ...REYES_GLASS, face(REYES_GLASS, CELL_MID)], [S1 + 0.6, ...REYES_GLASS, face(REYES_GLASS, COLE_BODY)], [DUR, ...REYES_GLASS, face(REYES_GLASS, BOSS_UP)]],
  // COLE: waits outside until it is called clear, follows KNOX in his shadow, then forward to the body
  E: [[0, -3.9, -1.5, 15], [13.4, -3.9, -1.5, 15], [14.6, -0.4, -0.2, 0], [15.4, 1.4, 0.3, 0], [17.6, 4.4, -0.8, 0], [20.0, 4.4, -0.8, 0], [22.0, 11.9, -0.5, 20], [22.6, ...COLE_BODY, face(COLE_BODY, BODY)], [S1, ...COLE_BODY, face(COLE_BODY, BODY)],
    [S1 + EPS, ...SEAT, face(COLE_BODY, BODY)], [S1 + 1.0, ...SEAT, face(COLE_BODY, BODY)], [S1 + 1.8, ...SEAT, 180], [S1 + 3.6, 20.2, 0.2, 180], [DUR, 20.2, 0.2, 180]],
};
// the prisoner: seated; after the swap he is seated where COLE knelt, then gets up and turns to the nearest of them
const Em = [[0, ...SEAT, 180], [S1, ...SEAT, 180], [S1 + EPS, ...COLE_BODY, 180], [S1 + 0.45, ...COLE_BODY, 180], [S1 + 1.25, ...BOSS_UP, 180], [S1 + 3.5, ...BOSS_UP, 180], [S1 + 4.0, 12.5, 0.5, 180], [S1 + 5.2, 13.1, 0.2, 200], [DUR, 13.1, 0.2, 200]];      // gets up and goes for the nearest: KNOX, a step away
const bossAt = t => { let i = 0; while (i + 1 < Em.length && Em[i + 1][0] <= t) i++; const a = Em[i], b = Em[Math.min(i + 1, Em.length - 1)], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0; return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };

// ---- fire: after the swap only MILLER has a safe shot. Behind the target from FUSE and from REYES is the cell, and COLE is in it now.
const fire = [], flashes = [], impacts = [1.8, 2.9].map(t => ({ t: S1 + t, x: P(KNOX_BACK[0] + 0.5, KNOX_BACK[1])[0], y: P(KNOX_BACK[0] + 0.5, KNOX_BACK[1])[1], r: 62, kind: "shield" }));
const burst = t => { for (let k = 0; k < 3; k++) { fire.push({ t: t + k * 0.125, who: "MILLER", kind: "rifle", target: "ENTITY", at: P(...bossAt(t)) }); } };
burst(S1 + 0.75); burst(S1 + 1.95); burst(S1 + 3.0);
for (let k = 0; k / 12 < 1.3; k++) fire.push({ t: S1 + 3.4 + k / 12, who: "FUSE", kind: "rifle", target: "ENTITY", at: P(...bossAt(S1 + 3.4 + k / 12)) });   // FUSE, once he has an angle

// ---- sprites
function clipsFor(keys, base, extra = []) {
  const segs = [];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1], dt = b[0] - a[0]; if (dt < 0.01) continue;
    const v = dist([a[1], a[2]], [b[1], b[2]]) / dt, act = v > 2.3 ? base.run : v > 0.25 ? base.walk : base.idle; if (!segs.length || segs.at(-1).action !== act) segs.push({ from: a[0], action: act, loop: true }); }
  const baseAt = t => { let c = segs[0]; for (const s of segs) if (s.from <= t) c = s; return c; };
  const times = [...new Set([...segs.map(s => s.from), ...extra.flatMap(x => [x.from, x.to])])].sort((a, b) => a - b), out = [];
  for (const t of times) { const ov = extra.filter(x => x.from <= t && t < x.to).at(-1); const c = ov ? { from: ov.from === t ? t : null, action: ov.action, loop: !!ov.loop } : { ...baseAt(t), from: t };
    if (!out.length || out.at(-1).action !== c.action || ov?.from === t) out.push({ from: t, action: c.action, ...(c.loop ? { loop: true } : {}) }); }      // (a hold picks up again when a one-shot inside it ends)
  return out;
}
const once = (t, action, len) => ({ from: t, to: t + len, action }), hold = (from, to, action) => ({ from, to, action, loop: true });
const B3 = { idle: "idle", walk: "walk", run: "run" }, sp = (dir, clips) => ({ dir: L + dir, pxPerM: M, scale: SCALE, clips });
const sprites = {
  A: sp("knox", clipsFor(tracks.A, B3, [hold(11.4, 14.2, "guard"), hold(17.4, 19.6, "guard"), hold(22.0, DUR, "guard")])),
  D: sp("miller", clipsFor(tracks.D, B3, [hold(12.6, 14.6, "aim"), hold(17.2, 19.6, "aim"), hold(22.6, S1 + 0.71, "aim"), once(S1 + 0.71, "shoot", 0.6), hold(S1 + 1.31, S1 + 1.91, "aim"), once(S1 + 1.91, "shoot", 0.6),
    hold(S1 + 2.51, S1 + 2.96, "aim"), once(S1 + 2.96, "shoot", 0.6), hold(S1 + 3.56, DUR, "aim")])),
  B: sp("fuse", clipsFor(tracks.B, B3, [hold(13.1, 14.8, "aim"), hold(17.6, S1 + 1.3, "aim"), hold(S1 + 2.9, S1 + 3.4, "aim"), hold(S1 + 3.4, S1 + 4.7, "fire"), hold(S1 + 4.7, DUR, "aim")])),
  C: sp("reyes", clipsFor(tracks.C, B3, [hold(14.3, DUR, "snipe_aim")])),
  E: sp("cole", clipsFor(tracks.E, B3, [{ from: 22.6, to: S1 + 1.0, action: "kneel" }])),
  ENTITY: sp("prisoner", clipsFor(Em, { idle: "idle", walk: "walk", run: "walk" }, [hold(0, S1 + 0.45, "sit"), once(S1 + 1.3, "punch", 1.0), once(S1 + 2.4, "punch", 1.0), once(S1 + 3.5, "hit", 0.4)])),
};

const scene = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow_open;
const cam = (t, x, y, z) => [t, ...P(x, y), z];
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_act3.mjs", scene: "../scene/deathrow_open.json", plates,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // DEATH ROW // SRS", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:17:36", shots: [{ from: 0, to: DUR, type: "map" }], static: [[S1 + 0.03, 0.06]],
  doors: { GATE: [[0, 0], [9.4, 0], [10.2, 1], [DUR, 1]], CELL: [[0, 0]] }, explored: ["CELL"],
  operators: Object.fromEntries(Object.entries(tracks).map(([id, k]) => [id, { interp: "linear", keys: k.map(([t, x, y, h]) => [t, ...P(x, y), h]) }])),
  operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: Em.map(k => [k[0], ...P(k[1], k[2]), k[3], 1, k[0] > S1 && k[0] < S1 + 0.1 ? 0.9 : 0, 1, 0, 0, 0]) },
  sprites: { ...sprites, T04: { dir: L + "t04", pxPerM: M, scale: SCALE, clips: [{ from: 9999, action: "lying" }] } }, fire, flashes, impacts,
  mobs: [{ id: "T04", species: "inmate", track: { interp: "linear", keys: [[0, ...P(...BODY), 8, 0.95, 0, 1, 0, 0, 0], [DUR, ...P(...BODY), 8, 0.95, 0, 1, 0, 0, 0]] } }],      // the Team 04 man, where he fell
  pulse: { t0: E0, period: 20, speed: RIPPLE * M, maxR: 30 * M, zone: scene.blockZone, hits: [H1] },
  swaps: [{ t: S1, a: P(...COLE_BODY), b: P(...SEAT) }],
  props: [{ kind: "stain", from: 0, to: DUR, x: P(BODY[0] + 0.15, BODY[1])[0], y: P(BODY[0] + 0.15, BODY[1])[1], r: 40, w: 11,
    trail: [[18.2, 0.1], [17.0, 0.5], [15.6, 0.3], [14.4, 0.8], [13.6, 0.9]].map(q => P(...q)) },      // he was hurt at the bars and dragged himself five metres toward the door
    { kind: "panel", from: 0, to: DUR, x: P(-0.74, 1.75)[0], y: P(-0.74, 1.75)[1], presses: [9.4] }],
  events: [{ from: 13.6, to: E1 + 1.5, x: P(...BODY)[0], y: P(...BODY)[1] - 20, text: "TEAM 04 TAG // NO VITALS" }, { from: 13.6, to: E1 + 1.5, x: P(...SEAT)[0] + 30, y: P(...SEAT)[1] - 50, text: "UNK-01 // CELL LOCKED" }],
  camera: [cam(0, -1.6, -0.6, 2.3), cam(8.8, -1.6, -0.6, 2.3), cam(10.2, 0.6, 0, 2.0), cam(12.8, 1.8, 0, 1.55), cam(14.6, 2.6, 0, 1.5), cam(17.8, 5.6, 0, 1.35), cam(19.6, 6.6, 0, 1.35),
    cam(22.6, 11.4, -0.4, 1.6), cam(E1 - 0.3, 11.8, -0.4, 1.6), [E1 + 0.5, 1168, 576, 1.02], [touch - 0.2, 1168, 576, 1.02], cam(touch + 0.3, 12.2, -0.4, 2.1), cam(S1 + 1.2, 12.0, -0.6, 2.1), cam(S1 + 3.4, 11.8, 1.0, 1.55), cam(DUR, 11.8, 1.0, 1.55)],
  warn: [{ from: S1 + 0.25, to: S1 + 3.4, text: "POSITION EXCHANGE  //  COLE <-> UNK-01" }],
  subtitles: [
    { from: 0.6, to: 3.6, who: "KNOX", text: "Stack on me. Reyes, watch our back." },
    { from: 4.4, to: 8.4, who: "DISPATCH", text: "There it is again. It has never come through that door." },
    { from: 8.7, to: 9.6, who: "KNOX", text: "Fuse. Door." },
    { from: 12.4, to: 13.2, who: "MILLER", text: "Left clear." }, { from: 13.2, to: 14.0, who: "FUSE", text: "Right clear." },
    { from: 14.5, to: 17.0, who: "REYES", text: "One down, thirteen metres. One in the cell, seated." },
    { from: 17.6, to: 19.4, who: "KNOX", text: "Fuse, gun on the cell. Reyes, stay on him." },
    { from: 19.6, to: 22.4, who: "KNOX", text: "Cole, on me. We confirm our man. Miller, left side. Stay out of the lanes." },
    { from: 22.6, to: 23.8, who: "COLE", text: "It's Team Four. No pulse." },
    { from: S1 + 0.3, to: S1 + 1.2, who: "MILLER", text: "CONTACT!" },
    { from: S1 + 1.2, to: S1 + 2.6, who: "FUSE", text: "No shot! Cole's behind him! Moving!" },
    { from: S1 + 1.7, to: S1 + 2.8, who: "KNOX", text: "He's on me! Fuse, angle!" },
    { from: S1 + 2.9, to: S1 + 3.8, who: "FUSE", text: "Set!" },
  ],
};
{ const on = [[S1 + 0.3, DUR + 1]], blows = [1.8, 2.9, 4.0].map(d => S1 + d), keys = [];          // the light shield: open while KNOX has it set, flaring when it takes a blow
  for (let t = 0; t <= DUR + 0.001; t += 0.05) { let g = 0; for (const [a, b] of on) g = Math.max(g, Math.min(1, (t - a) / 0.35, (b - t) / 0.25)); if (g > 0) for (const tb of blows) if (t >= tb - 0.001 && t < tb + 0.6) g += 0.9 * Math.exp(-(t - tb) / 0.14); keys.push([+t.toFixed(2), +Math.max(0, g).toFixed(3)]); }
  tl.guard = { A: { interp: "linear", keys } }; }
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline_act3.json", JSON.stringify(tl));

// ---- checks
const at = (id, t) => { const k = tracks[id]; if (t <= k[0][0]) return [k[0][1], k[0][2]]; for (let i = 1; i < k.length; i++) if (k[i][0] >= t) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } return [k.at(-1)[1], k.at(-1)[2]]; };
const off = (p, a, b) => { const L0 = dist(a, b), u = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (L0 * L0); return u <= 0 || u >= 1 ? 99 : Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / L0; };
const NAME = { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" }; let bad = 0;
const say = (ok, s) => { console.log(`  [${ok ? "OK" : "FAIL"}] ${s}`); if (!ok) bad++; };
console.log(`act 3: ripple leaves at ${E1}s, touches COLE at ${touch.toFixed(2)}s, swap at ${S1.toFixed(2)}s`);
console.log("before the ripple (t = 23.5 s):");
const d = Object.keys(tracks).map(id => [dist(at(id, 23.5), SEAT), NAME[id]]).sort((a, b) => a[0] - b[0]);
say(d[0][1] === "COLE" && d[1][0] - d[0][0] >= 0.6, "nearest to the prisoner: " + d.map(([v, n]) => `${n} ${v.toFixed(1)} m`).join(", "));
for (const [gun, who] of [["B", "FUSE"], ["C", "REYES"]]) { const worst = Object.keys(tracks).filter(id => id !== gun).map(id => [off(at(id, 23.5), at(gun, 23.5), CELL_MID), NAME[id]]).sort((a, b) => a[0] - b[0])[0];
  say(worst[0] >= 1.0, `${who}'s lane to the cell: the nearest friendly to it is ${worst[1]}, ${worst[0].toFixed(1)} m off the line`); }
const ids = Object.keys(tracks); let minGap = [99];
for (let t = 12.5; t <= S1; t += 0.25) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const g = dist(at(ids[i], t), at(ids[j], t)); if (g < minGap[0]) minGap = [g, NAME[ids[i]], NAME[ids[j]], t]; }
say(minGap[0] >= 1.2, `closest any two of them come once they are through the door: ${minGap[1]} and ${minGap[2]}, ${minGap[0].toFixed(1)} m at ${minGap[3]}s`);
let inDoor = 0; for (let t = 10; t <= S1; t += 0.1) if (ids.some(id => { const p = at(id, t); return Math.abs(p[0]) < 0.5 && Math.abs(p[1]) < 1.0; })) inDoor += 0.1;
say(inDoor <= 3.0, `time anyone spends in the doorway itself: ${inDoor.toFixed(1)} s in total for five people`);
console.log("after the swap (he is up and on KNOX's shield; COLE is in the cell):");
const side = (p, a, b) => { const L0 = dist(a, b); return Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / L0; };
say(side(KNOX_COVER, MILLER_COVER, COLE_BODY) >= 1.0 && side(KNOX_BACK, MILLER_COVER, BOSS_UP) >= 1.0, `MILLER fires from where he stands: KNOX is ${side(KNOX_COVER, MILLER_COVER, COLE_BODY).toFixed(1)} m off his line at first, ${side(KNOX_BACK, MILLER_COVER, BOSS_UP).toFixed(1)} m once the man is up`);
{ const far = [FUSE_FLANK[0] + (BOSS_UP[0] - FUSE_FLANK[0]) * 4, FUSE_FLANK[1] + (BOSS_UP[1] - FUSE_FLANK[1]) * 4], near = Math.min(side(KNOX_BACK, FUSE_FLANK, BOSS_UP), side(MILLER_COVER, FUSE_FLANK, BOSS_UP)), u = (19.5 - FUSE_FLANK[0]) / (BOSS_UP[0] - FUSE_FLANK[0]), yAtBars = FUSE_FLANK[1] + (BOSS_UP[1] - FUSE_FLANK[1]) * u;
  say((u < 0 || Math.abs(yAtBars) > 7) && near >= 0.85 && off(REYES_GLASS, FUSE_FLANK, far) >= 2, `FUSE's new position, at right angles to MILLER: his line ends on the side wall, well short of the cell; KNOX ${side(KNOX_BACK, FUSE_FLANK, BOSS_UP).toFixed(1)} m and MILLER ${side(MILLER_COVER, FUSE_FLANK, BOSS_UP).toFixed(1)} m off it; he gets there ${(2.9).toFixed(1)} s after the swap`); }
for (const [gun, who, want] of [["B", "FUSE", false], ["C", "REYES", false], ["D", "MILLER", true]]) { const g = at(gun, gun === "D" ? S1 + 1.8 : S1 + 0.8), b = gun === "D" ? BOSS_UP : COLE_BODY, far = [g[0] + (b[0] - g[0]) * 3, g[1] + (b[1] - g[1]) * 3], miss = off(SEAT, g, far);
  const inCell = (() => { const u = (19.5 - g[0]) / (b[0] - g[0]); const y = g[1] + (b[1] - g[1]) * u; return u > 1 && Math.abs(y) < 3; })();
  say(want ? !inCell : inCell, `${who}${gun === "D" ? "" : ", from the overwatch position"}: the line through him ${inCell ? `runs on into the cell, ${miss.toFixed(1)} m from COLE: no shot` : "ends on the far wall, clear of the cell: safe to fire"}`); }
console.log(bad ? `${bad} FAIL` : "all checks pass"); if (bad) process.exitCode = 1;
