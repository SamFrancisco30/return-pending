// FILE 001 · DEATH ROW — sample of the death-row sequence (door -> fourth swap -> empty pulse).
// Hand-staged in METRES (x = distance into death row from the boundary line, y = across the corridor,
// negative y = the cell side) and SECONDS, then converted to the renderer's timeline JSON.
//   node episodes/file_001_deathrow/build_timeline.mjs        (run from C:\Sam)
// Positions and times follow FILE_001_TIMELINE_VALIDATION.md; sample second 24 = validation T 0.
import fs from "node:fs";

const M = 70, X0 = 330, YC = 576;
const P = (xm, ym) => [X0 + xm * M, YC + ym * M];
const S1 = 24, S2 = 44, S3 = 64, S4 = 84, S5 = 104, DUR = 108, EPS = 0.001;

// ---- helpers: tracks are [t, xm, ym, headingDeg]; heading 0 = deeper into the block, 180 = toward the door
const opTrack = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });

// ---- positions used by both sides of a swap (a swap exchanges exact positions; facing is kept)
const CELL_SEAT = [17.5, -3.4], CELL_BACK = [17.5, -4.1], BODY = [12.6, 0.15];
const COLE_AT_BODY = [11.9, 0];
const KNOX_HOLD = [9.0, 0], BOSS_AT_SHIELD = [10.3, 0];
const KNOX_DEEP = [13.5, 0], BOSS_DEEP = [12.3, 0];
const BOSS_AT_LINE = [1.05, 0];

const operators = {
  // KNOX: holds mid-corridor, steps in after swap 1, is traded past the prisoner at swap 2,
  // draws it deeper, turns his back at the last half second, is traded to the door side at swap 3, backs out.
  A: opTrack([
    [0, -1.6, 0, 0], [5, -1.6, 0, 0], [11, 6, 0.2, 0], [13, 6, 0.2, -18], [S1 + 0.3, 6, 0.2, -18],
    [S1 + 2.0, ...KNOX_HOLD, 0],
    [28, 8.92, 0, 0], [31, 9.05, 0, 0], [34, 8.9, 0, 0], [37, 9.02, 0, 0], [40, 8.93, 0, 0], [43.6, 9.0, 0, 0],
    [S2, ...KNOX_HOLD, 0], [S2 + EPS, ...BOSS_AT_SHIELD, 0],
    [S2 + 0.45, 10.3, 0, 0], [S2 + 0.95, 10.15, 0, 180],
    [46.5, 10.4, 0, 180], [52, 11.6, 0, 180], [58, 13.0, 0, 180], [60, ...KNOX_DEEP, 180],
    [63.45, ...KNOX_DEEP, 180], [63.85, ...KNOX_DEEP, 0],
    [S3, ...KNOX_DEEP, 0], [S3 + EPS, ...BOSS_DEEP, 0],
    [65.2, 12.3, 0, 0], [70, 7.4, 0, 0], [74, 3.4, 0, 0], [78, -0.75, 0, 0],
    [S4 + 1, -0.75, 0, 0], [S4 + 2.2, -0.9, -0.5, 30], [92, -0.9, -0.5, 30], [94, -1.4, -0.4, 180], [DUR, -1.4, -0.4, 180],
  ]),
  // HOUND: rear guard at the door, comes up with the crossbow, drags MILLER out
  B: opTrack([
    [0, -0.8, -0.9, 0], [5, -0.8, -0.9, 0], [7, 1.0, -0.9, 0], [8.2, 1.0, -0.9, 180], [S1 + 0.3, 1.0, -0.9, 180],
    [S1 + 0.8, 1.0, -0.9, 0], [27.2, 5.0, -0.9, 0], [S2 + 0.3, 5.0, -0.9, 0],
    [45.8, 6.3, -0.2, 0], [46.2, 6.0, -0.2, 0], [53, -0.6, -0.3, 0], [55, -2.0, -0.5, 0],
    [S4 + 1, -2.0, -0.5, 0], [S4 + 2.5, -2.0, -0.5, -70], [DUR, -2.0, -0.5, -70],
  ]),
  // REYES: mid-corridor observer, falls back covering
  C: opTrack([
    [0, -1.4, 0.9, 0], [5.4, -1.4, 0.9, 0], [10.5, 5.0, 0.9, 0], [S2 + 2, 5.0, 0.9, 0],
    [52, -0.5, 1.0, 0], [53.5, -1.6, 1.15, 0], [DUR, -1.6, 1.15, 0],
  ]),
  // MILLER: covers COLE at the body, back-pedals firing, stacks behind the shield, is hit, is dragged out
  D: opTrack([
    [0, -2.3, -0.6, 0], [5.8, -2.3, -0.6, 0], [11.5, 4.6, -0.7, 0], [14.8, 4.6, -0.7, 0], [19.2, 10.5, -0.6, -19], [S1 + 0.3, 10.5, -0.6, -19],
    [S1 + 2.0, 7.8, 0.7, 0], [40.5, 7.8, 0.7, 0], [42, 7.85, 0.15, 0], [S2 + 0.2, 7.85, 0.15, 0],
    [S2 + 0.75, 6.5, 0.3, 25], [46.2, 6.5, 0.3, 25], [53, -0.2, 0.2, 25], [55, -2.6, -1.2, 25], [DUR, -2.6, -1.2, 25],
  ]),
  // COLE: goes to the body, is traded into the cell, picks up the beacon, waits at the back wall, comes out at the line
  E: opTrack([
    [0, -2.7, 0.6, 0], [6.2, -2.7, 0.6, 0], [12, 5.2, 0.9, 0], [14.8, 5.2, 0.9, 0], [19.6, ...COLE_AT_BODY, 0], [S1, ...COLE_AT_BODY, 0],
    [S1 + EPS, ...CELL_SEAT, 0], [S1 + 0.6, ...CELL_SEAT, 0], [S1 + 1.3, 17.5, -3.4, 120], [27.5, 17.2, -2.1, 105],
    [30, 17.2, -2.1, 105], [32.6, 18.3, -3.7, -60], [33.6, 18.3, -3.7, -60], [36, 17.3, -2.1, 110], [50, 17.3, -2.1, 110],
    [52.5, ...CELL_BACK, 90], [S4, ...CELL_BACK, 90], [S4 + EPS, ...BOSS_AT_LINE, 90],
    [S4 + 0.35, 1.05, 0, 180], [S4 + 1.5, -1.3, 0.55, 180], [S4 + 3.0, -1.3, 0.55, 180], [S4 + 5.5, -2.5, -0.55, 250], [DUR, -2.5, -0.55, 250],
  ]),
};

// ---- the prisoner: [t, xm, ym, heading, visible, glitch, pose (0 seated / 1 upright), look, hidden, reach]
const E = [];
const e = (t, x, y, h, o = {}) => E.push([t, ...P(x, y), h, 1, o.g ?? 0, o.pose ?? 1, o.look ?? 0, 0, o.reach ?? 0]);
const impacts = [], fire = [];
const hit = (t, x, y, r = 60) => impacts.push({ t, x: P(x, y)[0], y: P(x, y)[1], r });
// a punch thrown at the shield in front of it: dir = +1 hitting toward the door, -1 toward the deep end
function punch(t, x, dir, heading) {
  e(t - 0.3, x, 0, heading, { reach: 0 }); e(t, x - dir * 0.14, 0, heading, { reach: 1 }); e(t + 0.3, x, 0, heading, { reach: 0 });
  hit(t, x - dir * 0.82, 0, 58);
}
// seated in the cell, slowly turning its head toward the people coming in
e(0, ...CELL_SEAT, 90, { pose: 0 }); e(9, ...CELL_SEAT, 90, { pose: 0 }); e(14, ...CELL_SEAT, 90, { pose: 0, look: 70 });
e(S1, ...CELL_SEAT, 90, { pose: 0, look: 70 });
// SWAP 1: appears where COLE knelt, still seated, still facing the way it faced
e(S1 + EPS, ...COLE_AT_BODY, 90, { pose: 0, look: 70, g: 0.9 }); e(S1 + 0.3, ...COLE_AT_BODY, 90, { pose: 0, look: 60, g: 0 });
e(S1 + 1.0, 11.8, -0.1, 180, { pose: 1 }); e(S1 + 2.0, ...BOSS_AT_SHIELD, 180);
for (const t of [27.3, 29.8, 32.3, 34.8, 37.3, 39.8, 41.9]) punch(t, 10.3, 1, 180);
// the big one: wind up, step in, fist almost on the shield at S2
e(42.9, 10.3, 0, 180); e(43.45, 10.62, 0, 180, { reach: 0 }); e(S2, ...BOSS_AT_SHIELD, 180, { reach: 0.8 });
// SWAP 2: same swing, new place. The fist carries on into the man who was behind the shield.
e(S2 + EPS, ...KNOX_HOLD, 180, { reach: 0.8, g: 0.6 }); e(S2 + 0.2, 8.55, 0.05, 180, { reach: 1 }); hit(S2 + 0.2, 7.9, 0.15, 120);
e(S2 + 0.8, 8.6, 0, 180, { reach: 0 }); e(S2 + 1.1, 8.65, 0, 180);
// KNOX opens up on its back at arm's length: it turns on the nearest person
e(S2 + 1.9, 8.8, 0, 0); e(46.5, 9.2, 0, 0); e(52, 10.4, 0, 0); e(58, 11.8, 0, 0); e(60, ...BOSS_DEEP, 0);
for (const t of [47.6, 50.1, 52.6, 55.1, 57.6, 60.8]) { const x = 9.2 + (Math.min(t, 60) - 46.5) * (12.3 - 9.2) / 13.5; hit(t, x + 0.82, 0, 58); }
e(63.0, ...BOSS_DEEP, 0); e(63.5, 12.05, 0, 0, { reach: 0 }); e(S3, ...BOSS_DEEP, 0, { reach: 0.8 });
// SWAP 3: it lands where KNOX stood, still swinging at nothing; KNOX is now behind it, on the door side
e(S3 + EPS, ...KNOX_DEEP, 0, { reach: 0.8, g: 0.6 }); e(S3 + 0.2, 13.85, 0, 0, { reach: 1 }); e(S3 + 0.7, 13.7, 0, 0, { reach: 0 });
e(S3 + 1.5, 13.55, 0, 180);
// it chases KNOX down the corridor, hammering the shield
e(66, 12.55, 0, 180); e(70, 8.65, 0, 180); e(74, 4.65, 0, 180); e(77.4, 1.3, 0, 180);
for (const t of [67.2, 69.7, 72.2, 74.7, 76.9]) { const x = 12.55 - (t - 66) * (12.55 - 1.3) / 11.4; hit(t, x - 0.82, 0, 58); }
// it reaches the line and cannot cross it
e(78.3, ...BOSS_AT_LINE, 180); e(78.6, 1.35, 0, 180); e(79.2, 1.05, 0.3, 180, { g: 0.25 }); e(79.9, 1.4, -0.25, 180);
e(80.6, 1.05, -0.3, 180, { g: 0.25 }); e(81.4, 1.35, 0.2, 180); e(82.2, 1.05, 0.25, 180, { g: 0.25 }); e(83.2, 1.3, 0, 180); e(S4, ...BOSS_AT_LINE, 180);
// SWAP 4: back in the cell, at the back wall where COLE stood
e(S4 + EPS, ...CELL_BACK, 180, { g: 0.9 }); e(S4 + 0.4, ...CELL_BACK, 180); e(S4 + 1.6, 17.5, -3.9, 90);
e(S4 + 3.4, 17.4, -2.15, 90); e(92, 17.4, -2.15, 90, { look: 60 }); e(96, 17.4, -2.2, 90, { look: 75 }); e(100, 17.45, -2.9, 90, { pose: 0.5, look: 75 });
e(S5 + 2, ...CELL_SEAT, 90, { pose: 0, look: 70 }); e(DUR, ...CELL_SEAT, 90, { pose: 0, look: 70 });

// ---- gunfire (who, aim point)
const shoot = (t, who, x, y) => fire.push({ t, who, at: P(x, y) });
for (const t of [24.55, 24.95, 25.35, 25.8]) shoot(t, "MILLER", 11.4, -0.1);
for (const t of [28.6, 31.1, 33.6, 36.1, 38.6]) shoot(t, "MILLER", 10.3, -0.25);
for (const t of [29.4, 38.2]) shoot(t, "HOUND", 10.3, -0.3);
for (const t of [30.6, 35.6, 40.6]) shoot(t, "KNOX", 10.2, 0);
shoot(S2 + 1.2, "KNOX", 9.0, 0); shoot(S2 + 1.55, "KNOX", 9.0, 0);
for (const t of [49, 54, 59]) shoot(t, "KNOX", 9.2 + (t - 46.5) * 0.23, 0);
shoot(S3 + 0.55, "KNOX", 13.7, 0);
for (const t of [68.4, 73.4]) shoot(t, "KNOX", 12.55 - (t - 66) * 0.99, 0);

const swap = (t, a, b) => ({ t, a: P(...a), b: P(...b) });
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_timeline.mjs — edit that file, not this one",
  scene: "../scene/deathrow.json",
  plates: { xray: "../concepts/deathrow_plate_a.png", fit: { sx: 0.9854, sy: 0.9542, dx: -6.1, dy: 51.7 } },
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // DEATH ROW // SRS",
  entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:17:36",
  shots: [{ from: 0, to: DUR, type: "map" }],
  static: [[S1, 0.05], [S2, 0.05], [S3, 0.05], [S4, 0.05]],
  doors: Object.fromEntries(["GATE", "CELL", ...[1, 2, 3, 4, 5, 7].map(i => `T${i}`), ...[1, 2, 3, 4, 5, 6, 7].map(i => `B${i}`)].map(id => [id, [[0, id === "GATE" ? 1 : 0]]])),
  explored: ["CELL"],
  operators, operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: E.sort((a, b) => a[0] - b[0]) },
  fire, impacts,
  down: { D: S2 + 0.2 },
  pulse: { t0: 4, period: 20, zone: { x: 330, y: 261, w: 1540, h: 630 }, alertFrom: 53 },
  boundary: { x1: 330, y1: 478, x2: 330, y2: 674, label: "DEATH ROW" },
  swaps: [swap(S1, COLE_AT_BODY, CELL_SEAT), swap(S2, KNOX_HOLD, BOSS_AT_SHIELD), swap(S3, KNOX_DEEP, BOSS_DEEP), swap(S4, BOSS_AT_LINE, CELL_BACK)],
  props: [
    { kind: "body", from: 0, to: DUR, x: P(...BODY)[0], y: P(...BODY)[1], rot: 200 },
    { kind: "beacon", from: 0, to: 33.2, x: P(18.45, -3.85)[0], y: P(18.45, -3.85)[1] },
  ],
  events: [
    { from: 8.6, to: 23.6, x: P(...BODY)[0], y: P(...BODY)[1] - 20, text: "TEAM 04 TAG // NO VITALS" },
    { from: 11.4, to: 23.6, x: P(...CELL_SEAT)[0] + 40, y: P(...CELL_SEAT)[1] - 30, text: "UNK-01 // CELL LOCKED" },
    { from: 86.5, to: 96, x: P(17.4, -2.6)[0] + 40, y: P(17.4, -2.6)[1] - 30, text: "UNK-01 // CELL LOCKED" },
  ],
  unitTags: [
    { who: "MILLER", from: S2 + 0.6, to: DUR, text: "MILLER // CRITICAL" },
    { who: "COLE", from: 33.4, to: 43.5, text: "T04 BEACON" },
    { who: "COLE", from: S4 + 0.8, to: S4 + 6, text: "T04 BEACON RECOVERED" },
  ],
  camera: [
    [0, 560, 576, 1.55], [4, 560, 576, 1.55], [5.2, 760, 576, 1.3], [8, 1024, 576, 1.06], [15, 1024, 576, 1.06],
    [21, 1260, 500, 1.5], [S1 + 0.5, 1260, 500, 1.5], [S1 + 2.2, 1060, 560, 1.38], [36, 1010, 576, 1.6], [S2 + 1.2, 960, 576, 1.6],
    [48, 900, 576, 1.3], [54, 1000, 576, 1.08], [59, 1000, 576, 1.08], [62.5, 1230, 560, 1.5], [S3 + 1.2, 1230, 560, 1.5],
    [70, 900, 576, 1.4], [78, 470, 576, 1.6], [S4 + 0.8, 470, 576, 1.6], [88, 1024, 576, 1.06], [100, 1024, 576, 1.06], [DUR, 1024, 576, 1.1],
  ],
  warn: [
    { from: S1 + 0.25, to: S1 + 3.2, text: "POSITION EXCHANGE  //  COLE <-> UNK-01" },
    { from: S2 + 0.25, to: S2 + 3.2, text: "POSITION EXCHANGE  //  KNOX <-> UNK-01" },
    { from: 56.6, to: 63.6, text: "HYPOTHESIS: PULSE TRADES UNK-01 WITH NEAREST PERSON IN BLOCK" },
    { from: S3 + 0.25, to: S3 + 3.2, text: "POSITION EXCHANGE  //  KNOX <-> UNK-01" },
    { from: 78.8, to: 83.6, text: "UNK-01 HELD AT BOUNDARY  //  CANNOT CROSS" },
    { from: S4 + 0.25, to: S4 + 4, text: "POSITION EXCHANGE  //  COLE <-> UNK-01  //  UNK-01 IN CELL" },
    { from: S5 + 0.3, to: DUR, text: "PULSE  //  NO PERSON IN BLOCK  //  NO EXCHANGE" },
  ],
  // DRAFT dialogue (no voice yet). Text here is for timing and readability review only.
  subtitles: [
    { from: 0.6, to: 3.6, who: "KNOX", text: "Team Four's beacon is in there. Hold at the door." },
    { from: 4.5, to: 7.9, who: "DISPATCH", text: "There it is again. Every twenty seconds. It never leaves that block." },
    { from: 8.6, to: 10.8, who: "REYES", text: "One body. Twelve meters in." },
    { from: 11.4, to: 13.8, who: "KNOX", text: "And something in that cell. Locked in." },
    { from: 14.2, to: 17.6, who: "KNOX", text: "Cole, confirm him. Miller, stay on Cole. Nobody else moves." },
    { from: 20.6, to: 23.0, who: "COLE", text: "It's Team Four. No pulse." },
    { from: 24.5, to: 25.7, who: "MILLER", text: "CONTACT!" },
    { from: 26.2, to: 28.2, who: "KNOX", text: "Behind me! All of you!" },
    { from: 29.8, to: 32.2, who: "COLE", text: "I'm in the cell. I'm in ITS cell!" },
    { from: 33.6, to: 35.8, who: "HOUND", text: "Two bolts in it. Doesn't care." },
    { from: 37.0, to: 39.6, who: "COLE", text: "Their beacon's in here with me." },
    { from: 44.7, to: 45.9, who: "REYES", text: "MILLER!" },
    { from: 46.2, to: 48.2, who: "KNOX", text: "Hound, get him out! It's on me!" },
    { from: 48.5, to: 50.5, who: "REYES", text: "Dispatch, that signal. When was it?" },
    { from: 50.7, to: 53.0, who: "DISPATCH", text: "Just now. And twenty seconds before that." },
    { from: 53.2, to: 56.4, who: "REYES", text: "It trades places with whoever's closest. And it stops at that door." },
    { from: 56.6, to: 59.6, who: "KNOX", text: "Everyone out. Cole, back wall. Don't move." },
    { from: 60.4, to: 63.8, who: "DISPATCH", text: "Pulse in three. Two. One." },
    { from: 65.4, to: 67.9, who: "DISPATCH", text: "Pulse stopped at the door. Nobody outside was taken." },
    { from: 71.0, to: 73.0, who: "REYES", text: "Knox, twelve seconds!" },
    { from: 79.2, to: 81.2, who: "KNOX", text: "...It can't cross." },
    { from: 81.4, to: 83.8, who: "DISPATCH", text: "Three. Two. One." },
    { from: 85.0, to: 87.0, who: "COLE", text: "I'm out. I'm out." },
    { from: 88.4, to: 90.6, who: "KNOX", text: "Cole. Miller. Now." },
    { from: 100.6, to: 103.9, who: "DISPATCH", text: "Pulse in three. Two. One." },
    { from: 104.9, to: 107.6, who: "DISPATCH", text: "Nothing in range. It's back in the cell." },
  ],
};
fs.writeFileSync("episodes/file_001_deathrow/timeline.json", JSON.stringify(tl));
console.log("wrote timeline.json:", E.length, "entity keys,", fire.length, "shots,", impacts.length, "impacts");

// ---- self-check: at every pulse, who is the nearest living person inside the block, and how far?
const lerpKeys = (keys, t) => { if (t <= keys[0][0]) return keys[0]; for (let i = 1; i < keys.length; i++) if (keys[i][0] >= t) { const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0] || 1); return a.map((v, k) => v + (b[k] - v) * u); } return keys.at(-1); };
for (const tp of [S1, S2, S3, S4, S5]) {
  const b = lerpKeys(tl.entity.keys, tp - 0.01);
  const d = Object.entries(operators).map(([id, tr]) => { const o = lerpKeys(tr.keys, tp - 0.01); return { who: tl.operatorIds[id], x: (o[1] - X0) / M, dist: Math.hypot(o[1] - b[1], o[2] - b[2]) / M }; })
    .filter(o => o.x > 0).sort((p, q) => p.dist - q.dist);
  console.log(`pulse at ${tp}s: prisoner at ${((b[1] - X0) / M).toFixed(1)} m ->`, d.length ? d.map(o => `${o.who} ${o.dist.toFixed(1)}m`).join(", ") : "nobody in the block");
}
