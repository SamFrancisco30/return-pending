// FILE 001 · DEATH ROW — sample of the death-row sequence (door -> fourth swap -> empty pulse). v2
// Hand-staged in METRES (x = distance into death row from the boundary line, y = across the hall)
// and SECONDS, then converted to the renderer's timeline JSON.
//   node episodes/file_001_deathrow/build_timeline.mjs        (run from C:\Sam)
//
// The shackles emit a ripple every 20 s (E1..E5). The ripple spreads at RIPPLE m/s, cannot leave the
// block, and stops on the first living person it touches; LOCK seconds later the two trade places.
// So each swap time S = E + distance / RIPPLE + LOCK, and all staging is keyed to S.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";

const M = 64, X0 = 300, YC = 576;
const P = (xm, ym) => [X0 + xm * M, YC + ym * M];
const RIPPLE = 4.5, LOCK = 0.6, EPS = 0.001, DUR = 132;
const [E0, E1, E2, E3, E4, E5, E6] = [4, 24, 44, 64, 84, 104, 124];

// ---- positions shared by both sides of a swap (a swap exchanges exact positions; facing and pose are kept)
const SEAT = [21.8, 0], CELL_BACK = [23.2, 0], CELL_GATE = [19.9, 0.2], BODY = [12.7, 0.35];
const COLE_AT_BODY = [11.9, 0];
const KNOX_HOLD = [9.0, 0], BOSS_AT_SHIELD = [10.6, 0];
const KNOX_DEEP = [13.5, 0], BOSS_DEEP = [11.9, 0];
const BOSS_AT_LINE = [1.2, 0];     // hard against the inside of the shut door
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const hitOf = (E, from, to, who) => { const touch = E + dist(from, to) / RIPPLE; return { t: E, touch, swap: touch + LOCK, who }; };
const H1 = hitOf(E1, SEAT, COLE_AT_BODY, "COLE"), H2 = hitOf(E2, BOSS_AT_SHIELD, KNOX_HOLD, "KNOX"),
  H3 = hitOf(E3, BOSS_DEEP, KNOX_DEEP, "KNOX"), H4 = hitOf(E4, BOSS_AT_LINE, CELL_BACK, "COLE");
const [S1, S2, S3, S4] = [H1, H2, H3, H4].map(h => h.swap);

// ---- operators: [t, xm, ym, headingDeg]; heading 0 = deeper into the block, 180 = toward the door
const opTrack = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const operators = {
  // KNOX: holds mid-hall, steps in after swap 1, is traded past the prisoner at swap 2, draws it deeper,
  // turns his back at the last moment, is traded to the door side at swap 3, backs out under the shield.
  A: opTrack([
    [0, -1.6, 0, 0], [10.0, -1.6, 0, 0], [15.2, 6, 0.3, 0], [S1 + 0.3, 6, 0.3, 0],
    [S1 + 2.0, ...KNOX_HOLD, 0],
    [31, 8.92, 0, 0], [34, 9.05, 0, 0], [37, 8.9, 0, 0], [40, 9.02, 0, 0], [43, 8.95, 0, 0], [S2 - 0.5, 9.0, 0, 0],
    [S2, ...KNOX_HOLD, 0], [S2 + EPS, ...BOSS_AT_SHIELD, 0],
    [S2 + 0.45, 10.6, 0, 0], [S2 + 0.95, 10.5, 0, 180],
    [S2 + 2.5, 10.6, 0, 180], [52, 11.6, 0, 180], [58, 13.0, 0, 180], [60, ...KNOX_DEEP, 180],
    [S3 - 0.5, ...KNOX_DEEP, 180], [S3 - 0.12, ...KNOX_DEEP, 0],
    [S3, ...KNOX_DEEP, 0], [S3 + EPS, ...BOSS_DEEP, 0],
    [S3 + 1.2, 11.9, 0, 0], [70.5, 7.4, 0, 0], [75, 3.4, 0, 0], [78.4, 0.5, 0, 0], [78.9, 0.5, 0, 0], [79.8, -1.0, -0.2, 0], [80.6, -1.1, -0.6, 0],
    [110.0, -1.1, -0.6, 0], [110.5, 0.3, 0, 0], [113.4, 12.1, 0.95, 0], [115.0, 12.1, 0.95, 180], [122.2, -1.7, 0.75, 180], [124.2, -1.9, 0.7, 180], [DUR, -1.6, -0.5, 0],
  ]),
  // HOUND: rear guard at the door, comes up with the crossbow, drags MILLER out
  B: opTrack([
    [0, -1.0, -0.9, 0], [8.4, -1.0, -0.9, 0], [9.0, -0.5, 0.75, 0], [10.2, -0.5, 0.75, 0], [10.9, 0.4, 0.3, 0], [12.1, 1.2, -1.7, 0], [13.2, 1.2, -1.7, 180], [S1 + 0.3, 1.2, -1.7, 180],
    [S1 + 0.8, 1.2, -1.7, 0], [S1 + 3.4, 5.0, -1.8, 0], [S2 + 0.3, 5.0, -1.8, 0],
    [S2 + 1.8, 6.3, 0.0, 0], [S2 + 2.2, 6.0, 0.0, 0], [53.5, -0.6, -0.3, 0], [55.5, -2.1, -0.8, 0],
    [79.0, -2.1, -0.8, 0], [79.9, -0.5, 0.8, 0], [108.8, -0.5, 0.8, 0], [110.2, -0.5, 0.8, 0], [110.8, 0.3, 0.3, 0], [113.6, 13.3, -0.25, 0], [115.0, 13.3, -0.25, 180], [122.0, -0.6, -0.3, 180], [124.0, -1.2, -0.75, 180], [DUR, -1.0, -0.2, 0],
  ]),
  // REYES: mid-hall observer, falls back covering
  C: opTrack([
    [0, -1.7, 0.9, 0], [10.4, -1.7, 0.9, 0], [11.6, 0.4, 0.5, 0], [15.0, 5.0, 1.7, 0], [S2 + 2, 5.0, 1.7, 0],
    [51.4, 0.6, 0.6, 0], [52.5, -0.7, 0.7, 0], [54, -2.5, 1.0, 0], [122.0, -2.5, 1.0, 0], [123.0, -0.5, 0.85, 0], [DUR, -0.5, 0.85, 0],
  ]),
  // MILLER: covers COLE at the body, back-pedals firing, stacks behind the shield, is hit, is dragged out
  D: opTrack([
    [0, -2.7, -0.8, 0], [10.7, -2.7, -0.8, 0], [12.7, 0.4, -0.4, 0], [15.8, 4.6, -1.2, 0], [16.0, 4.6, -1.2, 0], [21.2, 10.5, -0.9, 4], [S1 + 0.3, 10.5, -0.9, 4],
    [S1 + 2.0, 7.8, 1.2, 0], [S2 - 4.4, 7.8, 1.2, 0], [S2 - 2.9, 7.85, 0.15, 0], [S2 + 0.2, 7.85, 0.15, 0],
    [S2 + 0.75, 6.5, 0.4, 25], [S2 + 2.2, 6.5, 0.4, 25], [53.5, -0.2, 0.3, 25], [55.5, -2.9, -0.9, 25], [DUR, -2.9, -0.9, 25],
  ]),
  // COLE: goes to the body, is traded into the chamber, finds the beacon, waits at the back wall, comes out at the line
  E: opTrack([
    [0, -3.2, 0.5, 0], [11.0, -3.2, 0.5, 0], [13.4, 0.4, 0.3, 0], [16.2, 5.2, 0.9, 0], [16.4, 5.2, 0.9, 0], [22.3, ...COLE_AT_BODY, 0], [S1, ...COLE_AT_BODY, 0],
    [S1 + EPS, ...SEAT, 0], [S1 + 0.6, ...SEAT, 0], [S1 + 1.3, ...SEAT, 180], [S1 + 3.4, ...CELL_GATE, 180],
    [32.6, ...CELL_GATE, 180], [35, 20.6, 1.9, 60], [36, 20.6, 1.9, 60], [38.5, ...CELL_GATE, 180], [50, ...CELL_GATE, 180],
    [53, ...CELL_BACK, 180], [S4, ...CELL_BACK, 180], [S4 + EPS, ...BOSS_AT_LINE, 180],
    [S4 + 1.5, ...BOSS_AT_LINE, 180], [S4 + 2.6, -1.7, 0.1, 180], [S4 + 4.6, -2.7, -0.3, 250], [DUR, -2.7, -0.3, 250],
  ]),
};

// ---- the prisoner: [t, xm, ym, heading, visible, glitch, pose (0 seated / 1 upright), look, hidden, reach]
const Em = [];                                     // keys in metres, converted at the end
const e = (t, x, y, h, o = {}) => Em.push([t, x, y, h, 1, o.g ?? 0, o.pose ?? 1, o.look ?? 0, 0, o.reach ?? 0]);
const impacts = [], fire = [];
const hit = (t, x, y, r = 60, kind = "shield") => impacts.push({ t, x: P(x, y)[0], y: P(x, y)[1], r, kind });
// a blow on the shield in front of it: dir +1 = swinging toward the door, -1 = toward the deep end
function punch(t, x, dir, heading) {
  e(t - 0.3, x, 0, heading, { reach: 0 }); e(t, x - dir * 0.14, 0, heading, { reach: 1 }); e(t + 0.3, x, 0, heading, { reach: 0 });
  hit(t, x - dir * 0.86, 0, 62);
}
// seated in the middle of its chamber, facing the hall. It has done this many times.
e(0, ...SEAT, 180, { pose: 0 }); e(S1, ...SEAT, 180, { pose: 0 });
// SWAP 1: appears where COLE knelt, still seated, still facing the way it faced
e(S1 + EPS, ...COLE_AT_BODY, 180, { pose: 0, g: 0.9 }); e(S1 + 0.3, ...COLE_AT_BODY, 180, { pose: 0 });
e(S1 + 1.0, 11.8, -0.1, 185, { pose: 1 }); e(S1 + 2.0, ...BOSS_AT_SHIELD, 180);
for (const t of [30.1, 32.6, 35.1, 37.6, 40.1, 42.3]) punch(t, 10.6, 1, 180);
// the big one: rear back, step in; the fist is almost on the shield at S2
e(S2 - 1.15, 10.6, 0, 180); e(S2 - 0.55, 10.95, 0, 180, { reach: 0 }); e(S2, ...BOSS_AT_SHIELD, 180, { reach: 0.8 });
// SWAP 2: same swing, new place. The fist carries on into the man who stood behind the shield.
e(S2 + EPS, ...KNOX_HOLD, 180, { reach: 0.8, g: 0.6 }); e(S2 + 0.2, 8.55, 0.05, 180, { reach: 1 }); hit(S2 + 0.2, 7.9, 0.15, 125, "body");
e(S2 + 0.8, 8.6, 0, 180, { reach: 0 }); e(S2 + 1.1, 8.65, 0, 180);
// KNOX opens up on its back at arm's length: it turns on the nearest person
e(S2 + 1.9, 8.8, 0, 0); e(S2 + 2.5, 9.0, 0, 0); e(52, 10.0, 0, 0); e(58, 11.4, 0, 0); e(60, ...BOSS_DEEP, 0);
e(S3 - 1.1, ...BOSS_DEEP, 0); e(S3 - 0.5, 11.6, 0, 0, { reach: 0 }); e(S3, ...BOSS_DEEP, 0, { reach: 0.8 });
// SWAP 3: it lands where KNOX stood, still swinging at nothing; KNOX is now behind it, on the door side
e(S3 + EPS, ...KNOX_DEEP, 0, { reach: 0.8, g: 0.6 }); e(S3 + 0.2, 13.85, 0, 0, { reach: 1 }); e(S3 + 0.7, 13.7, 0, 0, { reach: 0 });
e(S3 + 1.6, 13.55, 0, 180);
// it runs KNOX down the hall, hammering the shield
e(67.2, 12.35, 0, 180); e(70.5, 9.0, 0, 180); e(75, 5.0, 0, 180); e(78.4, 2.1, 0, 180);
// at the threshold KNOX empties the shotgun into it: one step back is all he needs
e(78.7, 2.3, 0, 180, { g: 0.4 }); e(79.3, 3.5, 0.2, 180, { g: 0.2 }); e(79.9, 3.4, 0.1, 180);
// it comes again and meets a shut door. It hammers on it until the trade takes it.
e(81.0, 1.9, 0, 180); e(81.3, ...BOSS_AT_LINE, 180);
for (let t = 82.1, k = 0; t < S4 - 0.5; t += 0.95, k++) { if (Math.abs(t - E4) < 0.4) continue; e(t - 0.3, 1.55, (k % 3 - 1) * 0.25, 180); e(t, 1.2, (k % 3 - 1) * 0.25, 180, { reach: 0.5 }); hit(t, 0.3, (k % 3 - 1) * 0.3, 85, "door"); }
e(E4 - 0.05, ...BOSS_AT_LINE, 180); e(E4 + 0.05, ...BOSS_AT_LINE, 180);
e(S4, ...BOSS_AT_LINE, 180);
// SWAP 4: back in its chamber, at the back wall where COLE stood
e(S4 + EPS, ...CELL_BACK, 180, { g: 0.9 }); e(S4 + 0.4, ...CELL_BACK, 180); e(S4 + 2.4, 20.0, 0, 180);
// it stands at its bars watching the door for as long as there is someone on the other side of it
e(DUR, 20.0, 0, 180);
Em.sort((a, b) => a[0] - b[0]);
const bossAt = t => { let i = 0; while (i + 1 < Em.length && Em[i + 1][0] <= t) i++; const a = Em[i], b = Em[Math.min(i + 1, Em.length - 1)], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0; return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
for (const t of [48.6, 51.1, 53.6, 56.1, 58.6, 61.4]) hit(t, bossAt(t)[0] + 0.86, 0, 62);          // blows on the shield, facing deep
for (const t of [68.4, 70.9, 73.4, 75.9]) hit(t, bossAt(t)[0] - 0.86, 0, 62);
hit(81.3, 0.3, 0, 110, "door");                  // and on the way out

// ---- gunfire (who, aim point in metres)
const shoot = (t, who, x, y) => fire.push({ t, who, at: P(x, y), ...(who === "HOUND" ? { kind: "bolt" } : {}) });
for (const dt of [0.55, 0.95, 1.35, 1.8]) shoot(S1 + dt, "MILLER", 11.5, -0.1);
for (const t of [31.4, 33.9, 36.4, 38.9]) shoot(t, "MILLER", 10.6, -0.3);
for (const t of [32.2, 39.4]) shoot(t, "HOUND", 10.6, -0.35);
for (const t of [33.4, 38.4, 43.2]) shoot(t, "KNOX", 10.5, 0.1);
shoot(S2 + 1.2, "KNOX", 9.0, 0); shoot(S2 + 1.55, "KNOX", 9.0, 0);
for (const t of [50, 55, 59.5]) shoot(t, "KNOX", bossAt(t)[0], 0);
shoot(S3 + 0.6, "KNOX", 13.7, 0);
for (const t of [69.6, 74.4]) shoot(t, "KNOX", bossAt(t)[0], 0);
shoot(78.5, "KNOX", 2.1, 0); shoot(78.75, "KNOX", 2.3, 0);


const swap = (t, a, b) => ({ t, a: P(...a), b: P(...b) });
const cam = (t, xm, ym, z) => [t, ...P(xm, ym), z], WIDE = [1024, 576, 1.05];
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_timeline.mjs — edit that file, not this one",
  scene: "../scene/deathrow.json",
  plates,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // DEATH ROW // SRS",
  entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:17:36",
  shots: [{ from: 0, to: DUR, type: "map" }],
  static: [S1, S2, S3, S4].map(s => [s + 0.03, 0.06]),
  // the security door: shut until the team opens it, shut again behind KNOX, opened twice more for COLE and for the body
  doors: Object.fromEntries(scene.doors.map(d => [d.id, d.id === "GATE"
    ? [[0, 0], [9.0, 0], [10.0, 1], [80.0, 1], [81.2, 0], [S4 + 0.5, 0], [S4 + 1.5, 1], [S4 + 2.8, 1], [S4 + 4.0, 0], [109.0, 0], [110.0, 1], [123.0, 1], [124.2, 0], [DUR, 0]]
    : [[0, 0]]])),
  explored: ["CELL"],
  operators, operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: Em.map(k => [k[0], ...P(k[1], k[2]), ...k.slice(3)]) },
  fire, impacts,
  down: { D: S2 + 0.2 },
  // hands free to carry: weapons slung while KNOX and HOUND bring the Team 04 man out
  stow: { A: [[0, 0], [113.6, 0], [114.2, 1], [122.6, 1], [123.4, 0]], B: [[0, 0], [113.8, 0], [114.4, 1], [122.6, 1], [123.4, 0]] },
  // KNOX squares the shield up whenever the prisoner is on him; he lowers it to turn, shoot, or walk
  guard: { A: [[0, 0], [S1 + 0.4, 0], [S1 + 1.2, 1], [S2 + 0.3, 1], [S2 + 0.6, 0], [S2 + 1.9, 0], [S2 + 2.5, 1], [S3 - 0.55, 1], [S3 - 0.4, 0.3], [S3 - 0.1, 1],
               [S3 + 0.35, 1], [S3 + 0.5, 0.2], [S3 + 0.9, 0.2], [S3 + 1.4, 1], [78.3, 1], [78.5, 0.2], [78.9, 0.2], [79.2, 1], [80.2, 1], [81.4, 0]] },
  pulse: { t0: E0, period: 20, speed: RIPPLE * M, maxR: 27 * M, zone: scene.blockZone, alertFrom: 53, hits: [H1, H2, H3, H4] },
  boundary: { x1: X0, y1: YC - M + 4, x2: X0, y2: YC + M - 4, label: "DEATH ROW" },
  swaps: [swap(S1, COLE_AT_BODY, SEAT), swap(S2, KNOX_HOLD, BOSS_AT_SHIELD), swap(S3, KNOX_DEEP, BOSS_DEEP), swap(S4, BOSS_AT_LINE, CELL_BACK)],
  props: [
    { kind: "body", from: 0, to: DUR, track: [[0, ...P(...BODY), 200], [115.0, ...P(...BODY), 200], [115.6, ...P(12.4, 0.35), 180], [122.1, ...P(-1.2, 0.25), 180], [DUR, ...P(-1.2, 0.25), 180]] },
    { kind: "beacon", from: 0, to: 35.6, x: P(20.9, 2.3)[0], y: P(20.9, 2.3)[1] },
  ],
  events: [
    { from: 9.6, to: E1 + 1.5, x: P(...BODY)[0], y: P(...BODY)[1] - 20, text: "TEAM 04 TAG // NO VITALS" },
    { from: 12.2, to: E1 + 1.5, x: P(...SEAT)[0] + 30, y: P(...SEAT)[1] - 50, text: "UNK-01 // CELL LOCKED" },
    { from: S4 + 3, to: S4 + 12, x: P(20, 0)[0] + 30, y: P(20, 0)[1] - 50, text: "UNK-01 // CELL LOCKED" },
  ],
  unitTags: [
    { who: "MILLER", from: S2 + 0.6, to: 97.4, text: "MILLER // CRITICAL" },
    { who: "MILLER", from: 97.4, to: DUR, text: "MILLER // NO VITALS" },
    { who: "COLE", from: 36.2, to: 43.5, text: "T04 BEACON" },
    { who: "COLE", from: S4 + 0.8, to: S4 + 6, text: "T04 BEACON RECOVERED" },
  ],
  // camera: wide while a ripple travels, then a hard push onto whoever it touched, held through the trade
  camera: [
    [0, 540, 576, 1.5], [3.4, 540, 576, 1.5], [5.4, ...WIDE], [8.6, ...WIDE], cam(9.6, 0.6, 0, 1.7), cam(11.2, 0.6, 0, 1.7), [13.4, ...WIDE], [H1.touch - 0.15, ...WIDE],
    cam(H1.touch + 0.25, ...COLE_AT_BODY, 2.0), cam(S1 + 0.7, ...COLE_AT_BODY, 2.0), cam(S1 + 2.4, 9.6, 0, 1.45),
    cam(E2 - 1, 9.4, 0, 1.6), cam(H2.touch + 0.2, 9.3, 0, 2.05), cam(S2 + 1.4, 8.7, 0, 1.85), cam(49.5, 7, 0, 1.25),
    [55, ...WIDE], [E3 - 2.5, ...WIDE], cam(E3 - 0.3, 13, 0, 1.6), cam(H3.touch + 0.2, 13, 0, 2.05), cam(S3 + 1.4, 12.7, 0, 1.75),
    cam(71, 8, 0, 1.35), cam(79.5, 1.6, 0, 1.6), cam(E4 + 0.3, 1.6, 0, 1.6), [E4 + 2.2, ...WIDE], [H4.touch - 0.15, ...WIDE],
    cam(H4.touch + 0.3, ...CELL_BACK, 1.9), cam(S4 - 0.05, ...CELL_BACK, 1.9), cam(S4 + 0.12, 1.2, 0, 1.75), cam(S4 + 2.6, 1.2, 0, 1.75),
    [S4 + 5.5, ...WIDE], [109.4, ...WIDE], cam(112.4, 6.5, 0, 1.3), cam(121.6, 2.5, 0, 1.45), cam(124.4, 0.6, 0, 1.6), [126.6, ...WIDE], [DUR, ...WIDE],
  ].sort((a, b) => a[0] - b[0]),
  warn: [
    { from: S1 + 0.25, to: S1 + 3.2, text: "POSITION EXCHANGE  //  COLE <-> UNK-01" },
    { from: S2 + 0.25, to: S2 + 3.2, text: "POSITION EXCHANGE  //  KNOX <-> UNK-01" },
    { from: 56.6, to: 63.6, text: "HYPOTHESIS: PULSE TRADES UNK-01 WITH NEAREST PERSON IN BLOCK" },
    { from: S3 + 0.25, to: S3 + 3.2, text: "POSITION EXCHANGE  //  KNOX <-> UNK-01" },
    { from: 81.4, to: 83.8, text: "DOOR SEALED  //  UNK-01 AND COLE INSIDE" },
    { from: E4 + 0.6, to: H4.touch, text: "PULSE  //  NO PERSON IN HALL  //  STILL SPREADING" },
    { from: S4 + 0.25, to: S4 + 4.5, text: "POSITION EXCHANGE  //  COLE <-> UNK-01  //  UNK-01 IN CELL" },
    { from: E5 + 4.6, to: E5 + 8, text: "PULSE CONTAINED  //  DOOR SEALED  //  NO EXCHANGE" },
    { from: 110.8, to: 122.8, text: "RECOVERING TEAM 04  //  TWO INSIDE  //  DOOR OPEN" },
    { from: E6 + 4.6, to: DUR, text: "PULSE CONTAINED  //  DOOR SEALED" },
  ],
  // DRAFT dialogue (no voice yet). Text here is for timing and readability review only.
  subtitles: [
    { from: 0.6, to: 3.6, who: "KNOX", text: "Team Four's beacon is behind that door. Nobody touches it yet." },
    { from: 4.4, to: 8.6, who: "DISPATCH", text: "There it is again. Every twenty seconds. I can't tell you what it is. It has never come through that door." },
    { from: 8.9, to: 10.1, who: "KNOX", text: "Open it." },
    { from: 10.6, to: 12.4, who: "REYES", text: "One body. Twelve meters in." },
    { from: 12.7, to: 14.8, who: "KNOX", text: "And something in the end cell. Locked in." },
    { from: 15.1, to: 18.2, who: "KNOX", text: "Cole, confirm him. Miller, stay on Cole. Nobody else moves." },
    { from: 22.5, to: 24.2, who: "COLE", text: "It's Team Four. No pulse." },
    { from: S1 + 0.5, to: S1 + 1.7, who: "MILLER", text: "CONTACT!" },
    { from: S1 + 2.0, to: S1 + 4.0, who: "KNOX", text: "Behind me! All of you!" },
    { from: 31.4, to: 33.8, who: "COLE", text: "I'm in the cell. I'm in ITS cell!" },
    { from: 34.4, to: 36.6, who: "HOUND", text: "Two bolts in it. Doesn't care." },
    { from: 37.4, to: 40.0, who: "COLE", text: "Their beacon's in here with me." },
    { from: S2 + 0.6, to: S2 + 1.7, who: "REYES", text: "MILLER!" },
    { from: S2 + 1.9, to: S2 + 3.9, who: "KNOX", text: "Hound, get him out! It's on me!" },
    { from: 49.0, to: 51.0, who: "REYES", text: "Dispatch, that signal. When was it?" },
    { from: 51.1, to: 53.2, who: "DISPATCH", text: "Just now. And twenty seconds before that." },
    { from: 53.3, to: 56.6, who: "REYES", text: "It takes whoever it reaches first. And it never got out while that door was shut." },
    { from: 56.8, to: 60.0, who: "KNOX", text: "Everyone out. We shut it in with Cole. Cole, back wall, don't move." },
    { from: 60.4, to: 63.8, who: "DISPATCH", text: "Pulse in three. Two. One." },
    { from: S3 + 1.2, to: S3 + 3.4, who: "DISPATCH", text: "It took Knox again. Closest."},
    { from: 71.5, to: 73.5, who: "REYES", text: "Knox, twelve seconds!" },
    { from: 79.6, to: 80.8, who: "KNOX", text: "SHUT IT!" },
    { from: 81.3, to: 82.3, who: "HOUND", text: "Bolted." },
    { from: 82.4, to: 84.2, who: "DISPATCH", text: "Two. One." },
    { from: 85.4, to: 88.4, who: "REYES", text: "It hit the door and stopped. It's going the other way. All the way down." },
    { from: S4 + 0.3, to: S4 + 1.5, who: "KNOX", text: "Open! Get him out!" },
    { from: S4 + 2.4, to: S4 + 3.8, who: "COLE", text: "I'm out. I'm out." },
    { from: S4 + 4.2, to: S4 + 6.2, who: "KNOX", text: "Shut it. Cole, Miller. Now." },
    { from: 96.6, to: 99.2, who: "COLE", text: "Knox. Miller's gone." },
    { from: 100.6, to: 103.9, who: "DISPATCH", text: "Pulse in three. Two. One." },
    { from: 105.0, to: 107.6, who: "REYES", text: "Wait for it. Let it hit the door first." },
    { from: 108.7, to: 109.6, who: "DISPATCH", text: "Contained." },
    { from: 109.7, to: 112.4, who: "KNOX", text: "One window. Hound, with me. We carry him out." },
    { from: 115.0, to: 116.3, who: "HOUND", text: "Got him. Go." },
    { from: 118.4, to: 119.8, who: "REYES", text: "Ten seconds." },
    { from: 122.8, to: 123.8, who: "KNOX", text: "Shut it." },
    { from: 124.3, to: 126.6, who: "DISPATCH", text: "Pulse is out. Door is shut." },
    { from: 128.8, to: 131.4, who: "DISPATCH", text: "Contained. Nothing in range." },
  ],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline.json", JSON.stringify(tl));
console.log("wrote timeline.json:", Em.length, "entity keys,", fire.length, "shots,", impacts.length, "impacts");
console.log("swaps at", [S1, S2, S3, S4].map(s => s.toFixed(2)).join(", "), "s");

// ---- self-check: at every emission, which living person inside the block does the ripple reach first?
const lerpKeys = (keys, t) => { if (t <= keys[0][0]) return keys[0]; for (let i = 1; i < keys.length; i++) if (keys[i][0] >= t) { const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0] || 1); return a.map((v, k) => v + (b[k] - v) * u); } return keys.at(-1); };
for (const [E, h] of [[E1, H1], [E2, H2], [E3, H3], [E4, H4], [E5, null], [E6, null]]) {
  const b = bossAt(E);
  const d = Object.entries(operators).map(([id, tr]) => { const o = lerpKeys(tr.keys, E); const x = (o[1] - X0) / M, y = (o[2] - YC) / M; return { who: tl.operatorIds[id], x, d: dist([x, y], b) }; })
    .filter(o => o.x > 0).sort((p, q) => p.d - q.d);
  const ok = h ? (d[0]?.who === h.who ? "OK" : "MISMATCH") : (d.length ? "MISMATCH" : "OK");
  console.log(`emission ${E}s: prisoner at ${b[0].toFixed(1)} m ->`, d.length ? d.map(o => `${o.who} ${o.d.toFixed(1)}m`).join(", ") : "nobody in the block", `[${ok}]`);
}
