// FILE 001 · DEATH ROW — script v4, acts 3 to 5 (the steel door to the last man carried out), with the sprite library.
// Hand-staged in METRES (x = distance into death row from the door, y = across the hall) and SECONDS from the start
// of the section, then converted to the renderer's timeline. Preview only: draft dialogue as subtitles, no Bodycam.
//   node episodes/file_001_deathrow/build_timeline_v4.mjs        (run from C:\Sam)
//
// The cuffs emit a ripple every 20 s. It spreads at RIPPLE m/s and stops on the first living person it touches;
// LOCK seconds later the two trade places. Swap time S = E + distance / RIPPLE + LOCK, and all staging is keyed to S.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";

const M = 64, X0 = 300, YC = 576, L = "../library/characters/";
const P = (xm, ym) => [X0 + xm * M, YC + ym * M];
const RIPPLE = 4.5, LOCK = 0.6, EPS = 0.001, DUR = 128;
const [E0, E1, E2, E3, E4, E5, E6] = [4, 24, 44, 64, 84, 104, 124];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
const toward = (a, b, d) => { const L0 = dist(a, b) || 1; return [a[0] + (b[0] - a[0]) / L0 * d, a[1] + (b[1] - a[1]) / L0 * d]; };
const hitOf = (E, from, to, who) => { const touch = E + dist(from, to) / RIPPLE; return { t: E, touch, swap: touch + LOCK, who }; };

// ---- fixed places
const SEAT = [21.8, 0], CELL_BACK = [23.2, 0], BODY = [12.7, 0.35], COLE_AT_BODY = [11.9, 0];
const KNOX_HOLD = [9.0, 0], BOSS_AT_SHIELD = [10.6, 0];
const NOOK = [11.5, -3.7];                          // just inside the open side cell he backs into (door T4): out of the line of fire
const NOOK_MOUTH = [11.3, -2.6];                    // where he steps out to, in the hall again
const MILLER_POST = [5.6, 1.6];                     // where MILLER covers from while he waits
const RUN = 2.2;                                    // the prisoner's charge, m/s (a heavy man)
// swap 1: as in the validated timeline
const H1 = hitOf(E1, SEAT, COLE_AT_BODY, "COLE"), S1 = H1.swap;
// swap 2: he starts at MILLER; KNOX is already between them when the ripple leaves; it finds KNOX first
const KNOX_BLOCK = toward(MILLER_POST, NOOK_MOUTH, 1.2);
const H2 = hitOf(E2, NOOK_MOUTH, KNOX_BLOCK, "KNOX"), S2 = H2.swap;
const BOSS_AT_S2 = toward(NOOK_MOUTH, MILLER_POST, RUN * (S2 - E2));         // how far his run has taken him when it happens
// swap 3: KNOX is the last man, on the threshold with the door open; he waits six metres off
const KNOX_SILL = [0.4, 0], BOSS_WAIT = [6.4, 0];
const H3 = hitOf(E3, BOSS_WAIT, KNOX_SILL, "KNOX"), S3 = H3.swap;
// swap 4: his back is to his own bars, KNOX in front of him, COLE behind the bars. The shield moves him half a step.
const BARS = 19.0, BOSS_PRE = [18.1, 0], BOSS_POST = [18.6, 0], KNOX_END = [17.3, 0], COLE_BARS = [19.35, 0];
const H4 = hitOf(E4, BOSS_POST, COLE_BARS, "COLE"), S4 = H4.swap;
const SLAM = 83.8;

// ---- operators: [t, xm, ym, headingDeg]; heading 0 = deeper into the block, 180 = toward the door
const tracks = {
  // KNOX
  A: [[0, -1.6, 0, 0], [10.0, -1.6, 0, 0], [15.2, 6, 0.3, 0], [S1 + 0.3, 6, 0.3, 0], [S1 + 2.0, ...KNOX_HOLD, 0],
    [36.0, ...KNOX_HOLD, 0], [38.5, 9.0, 0.6, -50], [43.1, 9.0, 0.6, -50], [43.9, ...KNOX_BLOCK, face(KNOX_BLOCK, NOOK_MOUTH)], [S2, ...KNOX_BLOCK, face(KNOX_BLOCK, NOOK_MOUTH)],
    [S2 + EPS, ...BOSS_AT_S2, face(KNOX_BLOCK, NOOK_MOUTH)], [S2 + 0.5, ...BOSS_AT_S2, face(BOSS_AT_S2, KNOX_BLOCK)], [S2 + 1.0, ...toward(BOSS_AT_S2, KNOX_BLOCK, 0.6), face(BOSS_AT_S2, KNOX_BLOCK)],
    [S2 + 2.4, 8.4, -0.4, 180], [52, 9.6, -0.2, 180], [55.0, 10.2, 0, 180], [56.0, 10.2, 0, 180],               // draws him deeper, away from the men at the door
    [57.2, 8.6, 1.9, 200], [58.6, 5.8, 1.6, 0], [60.4, 3.0, 0.3, 0], [62.4, ...KNOX_SILL, 0], [S3, ...KNOX_SILL, 0],   // slips past him on the far side and backs to the threshold
    [S3 + EPS, ...BOSS_WAIT, 0], [S3 + 0.6, ...BOSS_WAIT, 0], [S3 + 1.2, ...BOSS_WAIT, 180], [70.5, ...BOSS_WAIT, 180],
    [81.3, 18.2, 0, 180], [82.2, 17.9, 1.1, 215], [83.2, ...KNOX_END, 0], [SLAM, 17.45, 0, 0], [S4 + 0.5, ...KNOX_END, 0],
    [S4 + 0.9, 18.0, 0.5, 30], [S4 + 1.3, 18.0, 0.5, 180], [89.9, 0.8, 0.2, 180], [90.7, -1.2, -0.5, 180], [91.5, -1.2, -0.5, 0],
    [110.0, -1.1, -0.6, 0], [110.5, 0.3, 0, 0], [113.4, 12.1, 0.95, 0], [115.0, 12.1, 0.95, 180], [122.2, -1.7, 0.75, 180], [124.2, -1.9, 0.7, 180], [DUR, -1.9, 0.7, 0]],
  // FUSE: machine gun from the left flank, drags MILLER out, shuts the door, carries the last man with KNOX
  B: [[0, -1.0, -0.9, 0], [8.4, -1.0, -0.9, 0], [9.0, -0.5, 0.75, 0], [10.2, -0.5, 0.75, 0], [10.9, 0.4, 0.3, 0], [12.1, 1.2, -1.7, 0], [S1 + 0.8, 1.2, -1.7, 0], [S1 + 3.4, 5.0, -1.9, 0],
    [37.0, 5.0, -1.9, 0], [39.0, 4.2, -0.4, -25], [S2 + 0.6, 4.2, -0.4, -25], [S2 + 1.6, ...toward(MILLER_POST, [-1.5, 0.5], -0.5), 180], [60.4, -1.2, 0.9, 180], [60.9, -1.2, 0.9, 0],
    [S3 + 2.2, -1.2, 0.9, 0], [S3 + 2.6, -0.7, 0.5, 0], [88.6, -0.7, 0.5, 0], [89.0, -0.7, 0.9, 0], [91.8, -0.7, 0.9, 0], [108.8, -0.5, 0.8, 0], [110.2, -0.5, 0.8, 0], [110.8, 0.3, 0.3, 0],
    [113.6, 13.3, -0.25, 0], [115.0, 13.3, -0.25, 180], [122.0, -0.6, -0.3, 180], [124.0, -1.2, -0.75, 180], [DUR, -1.0, -0.2, 0]],
  // REYES
  C: [[0, -1.7, 0.9, 0], [10.4, -1.7, 0.9, 0], [11.6, 0.4, 0.5, 0], [15.0, 5.0, 1.7, 0], [38.0, 5.0, 1.7, 0], [40.0, 3.4, 2.2, -20], [S2 + 1.6, 3.4, 2.2, -5],
    [58.0, 0.8, 1.4, 0], [59.6, -1.6, 1.6, 0], [S3 + 0.9, -1.6, 1.6, 0], [S3 + 1.6, -0.6, -0.6, 0], [88.4, -0.6, -0.6, 0], [89.0, -1.4, -1.5, 0], [DUR, -1.4, -1.5, 0]],
  // MILLER
  D: [[0, -2.7, -0.8, 0], [10.7, -2.7, -0.8, 0], [12.7, 0.4, -0.4, 0], [15.8, 4.6, -1.2, 0], [16.0, 4.6, -1.2, 0], [21.2, 10.5, -0.9, 4], [S1 + 0.3, 10.5, -0.9, 4],
    [S1 + 2.0, 7.8, 1.2, 0], [37.0, 7.8, 1.2, 0], [40.0, ...MILLER_POST, face(MILLER_POST, NOOK_MOUTH)], [S2 + 0.25, ...MILLER_POST, face(MILLER_POST, NOOK_MOUTH)],
    [S2 + 0.7, ...toward(MILLER_POST, NOOK_MOUTH, -0.9), face(MILLER_POST, NOOK_MOUTH)], [S2 + 1.6, ...toward(MILLER_POST, NOOK_MOUTH, -0.9), face(MILLER_POST, NOOK_MOUTH)],
    [60.4, -2.2, 0.5, face(MILLER_POST, NOOK_MOUTH)], [DUR, -2.2, 0.5, face(MILLER_POST, NOOK_MOUTH)]],
  // COLE
  E: [[0, -3.2, 0.5, 0], [11.0, -3.2, 0.5, 0], [13.4, 0.4, 0.3, 0], [16.2, 5.2, 0.9, 0], [16.4, 5.2, 0.9, 0], [22.3, ...COLE_AT_BODY, 0], [S1, ...COLE_AT_BODY, 0],
    [S1 + EPS, ...SEAT, 0], [S1 + 0.6, ...SEAT, 0], [S1 + 1.3, ...SEAT, 180], [S1 + 3.4, 19.9, 0.2, 180], [32.6, 19.9, 0.2, 180], [35, 20.6, 1.9, 60], [36, 20.6, 1.9, 60], [38.5, 19.9, 0.2, 180],
    [66.5, 19.9, 0.2, 180], [69.5, ...CELL_BACK, 180], [81.6, ...CELL_BACK, 180], [83.7, ...COLE_BARS, 180], [S4, ...COLE_BARS, 180],
    [S4 + EPS, ...BOSS_POST, 180], [S4 + 1.3, ...BOSS_POST, 180], [89.9, 1.2, -0.3, 180], [90.6, -1.6, -0.2, 180], [93.0, -2.0, 0.1, 150], [95.0, -1.7, 0.4, 150], [DUR, -1.7, 0.4, 150]],
};
const opTrack = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });

// ---- the prisoner: [t, xm, ym, heading, visible, glitch, pose, look, hidden, reach]
const Em = [], impacts = [], fire = [], flashes = [], repels = [];
const e = (t, x, y, h, o = {}) => Em.push([t, x, y, h, 1, o.g ?? 0, 1, 0, 0, 0]);
const hit = (t, x, y, r = 60, kind = "shield") => impacts.push({ t, x: P(x, y)[0], y: P(x, y)[1], r, kind });
e(0, ...SEAT, 180); e(S1, ...SEAT, 180);
// SWAP 1: where COLE knelt, still seated
e(S1 + EPS, ...COLE_AT_BODY, 180, { g: 0.9 }); e(S1 + 0.9, ...COLE_AT_BODY, 180); e(S1 + 1.6, 11.6, -0.2, 190); e(S1 + 2.6, ...BOSS_AT_SHIELD, 180);
e(33.2, ...BOSS_AT_SHIELD, 180); e(33.6, 11.1, 0, 180); e(36.0, 11.1, 0, 180);                       // the half-power shield: half a step. He looks at his feet, and at the shield
e(37.2, 11.4, -1.6, 250); e(38.5, ...NOOK, 270); e(39.0, ...NOOK, 100); e(43.0, ...NOOK, 100);    // he breaks off into the open side cell and waits there, counting
e(43.8, ...NOOK_MOUTH, face(NOOK_MOUTH, MILLER_POST)); e(E2, ...NOOK_MOUTH, face(NOOK_MOUTH, MILLER_POST));   // steps out looking at MILLER, and goes as the ripple leaves him
e(S2, ...BOSS_AT_S2, face(NOOK_MOUTH, MILLER_POST));
// SWAP 2: he is where KNOX stood, the run and the fist come with him
e(S2 + EPS, ...KNOX_BLOCK, face(NOOK_MOUTH, MILLER_POST), { g: 0.6 }); e(S2 + 0.25, ...toward(KNOX_BLOCK, MILLER_POST, 0.45), face(NOOK_MOUTH, MILLER_POST)); hit(S2 + 0.25, ...toward(MILLER_POST, KNOX_BLOCK, 0.25), 120, "body");
e(S2 + 1.2, ...toward(KNOX_BLOCK, MILLER_POST, 0.45), face(NOOK_MOUTH, MILLER_POST));
e(S2 + 2.0, 6.9, 0.6, 0); e(S2 + 2.6, 7.4, 0.1, 0); e(52, 8.6, -0.2, 0); e(55.0, 9.2, 0, 0); e(56.0, 9.2, 0, 0);               // turns on KNOX, follows him deeper
e(57.4, 8.4, 0.9, 150); e(58.8, 6.6, 0.9, 170); e(60.4, ...BOSS_WAIT, 180); e(S3, ...BOSS_WAIT, 180);             // KNOX gets by; he follows as far as six metres from the door, and stops
// SWAP 3: on the threshold, facing out, the door open
e(S3 + EPS, ...KNOX_SILL, 180, { g: 0.6 }); e(S3 + 0.25, 0.3, 0, 180); e(S3 + 0.9, 1.6, 0, 180, { g: 0.3 }); e(S3 + 2.3, 1.6, 0, 180);
e(S3 + 2.6, 1.15, 0, 180); hit(S3 + 2.6, 0.3, 0, 105, "door"); e(S3 + 3.4, 1.4, 0, 180);
e(70.0, 1.5, 0, 0); e(72.6, 5.5, 0, 0); e(73.2, 6.1, 0, 0);                                           // he turns from the door and walks up to KNOX. He does not strike
e(81.3, 17.3, 0, 0); e(82.2, 17.7, -0.9, 35); e(83.2, ...BOSS_PRE, 180); e(SLAM, ...BOSS_PRE, 180); e(SLAM + 0.2, ...BOSS_POST, 180); e(S4, ...BOSS_POST, 180);
// SWAP 4: in his cell
e(S4 + EPS, ...COLE_BARS, 180, { g: 0.9 }); e(S4 + 1.0, ...COLE_BARS, 180); e(S4 + 2.5, 19.6, 0, 180); e(DUR, 19.6, 0, 180);
Em.sort((a, b) => a[0] - b[0]);
const bossAt = t => { let i = 0; while (i + 1 < Em.length && Em[i + 1][0] <= t) i++; const a = Em[i], b = Em[Math.min(i + 1, Em.length - 1)], u = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0; return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
for (const t of [30.2, 32.2]) hit(t, 9.8, 0, 62);                                                      // his blows on the shield
hit(33.4, 10.0, 0, 70); repels.push({ t: 33.4, at: [9.4, 0], heading: 0, power: 0.5 });
hit(SLAM, 17.85, 0, 90); repels.push({ t: SLAM, at: [17.6, 0], heading: 0, power: 0.6 });

// ---- gunfire
const tgt = t => P(...bossAt(t));
const shot = (t, who, kind) => fire.push({ t, who, kind, target: "ENTITY", at: tgt(t) });
const mg = (t, len) => { for (let k = 0; k / 12 < len; k++) shot(t + k / 12, "FUSE", "rifle"); };
const burst = (t, who) => { for (let k = 0; k < 3; k++) shot(t + k * 0.125, who, "rifle"); };
burst(S1 + 0.7, "MILLER"); burst(S1 + 1.6, "MILLER"); burst(31.0, "MILLER"); burst(34.6, "MILLER");
mg(30.6, 1.0); mg(34.0, 1.2); shot(31.6, "KNOX", "shotgun"); shot(35.0, "REYES", "pistol_s"); shot(35.5, "REYES", "pistol_s");
shot(S2 + 1.3, "KNOX", "shotgun"); shot(S2 + 1.8, "KNOX", "shotgun"); shot(50.5, "KNOX", "shotgun"); shot(54.0, "KNOX", "shotgun");
mg(S3 + 0.2, 0.7);                                                                                   // FUSE, point blank, at the man in the doorway
flashes.push({ t: 33.4 }, { t: SLAM });

// ---- sprites: walk / run / stand follow the track; the rest is said outright
function clipsFor(keys, base, extra = []) {
  const segs = [];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1], dt = b[0] - a[0]; if (dt < 0.01) continue;
    const v = dist([a[1], a[2]], [b[1], b[2]]) / dt, act = v > 2.3 ? base.run : v > 0.25 ? base.walk : base.idle; if (!segs.length || segs.at(-1).action !== act) segs.push({ from: a[0], action: act, loop: true }); }
  const baseAt = t => { let c = segs[0]; for (const s of segs) if (s.from <= t) c = s; return c; };
  const times = [...new Set([...segs.map(s => s.from), ...extra.flatMap(x => [x.from, x.to])])].sort((a, b) => a - b), out = [];
  for (const t of times) { const ov = extra.filter(x => x.from <= t && t < x.to).at(-1); const c = ov ? { from: ov.from === t ? t : null, action: ov.action, loop: !!ov.loop } : { ...baseAt(t), from: t };
    if (c.from == null) continue; if (!out.length || out.at(-1).action !== c.action || ov?.from === t) out.push({ from: t, action: c.action, ...(c.loop ? { loop: true } : {}) }); }
  return out;
}
const once = (t, action, len) => ({ from: t, to: t + len, action }), hold = (from, to, action) => ({ from, to, action, loop: true });
const B3 = { idle: "idle", walk: "walk", run: "run" };
const sprite = (dir, clips) => ({ dir: L + dir, pxPerM: M, scale: 1.3, clips });
const sprites = {
  A: sprite("knox", clipsFor(tracks.A, B3, [hold(S1 + 2.0, 36.0, "guard"), once(31.5, "shoot", 0.6), once(33.1, "bash", 0.83), hold(43.9, S2 + 0.5, "guard"), once(S2 + 1.2, "shoot", 0.5), once(S2 + 1.7, "shoot", 0.6),
    once(50.4, "shoot", 0.6), once(53.9, "shoot", 0.6), hold(62.4, S3 + 0.6, "guard"), hold(S3 + 1.2, 70.5, "guard"), once(SLAM - 0.3, "bash", 0.83), hold(SLAM + 0.53, S4 + 0.5, "guard")])),
  B: sprite("fuse", clipsFor(tracks.B, B3, [hold(S1 + 3.4, 37.0, "aim"), hold(30.6, 31.6, "fire"), hold(34.0, 35.2, "fire"), hold(39.0, S2 + 0.6, "aim"), hold(60.9, S3 + 0.2, "aim"), hold(S3 + 0.2, S3 + 0.9, "fire"),
    hold(S3 + 0.9, S3 + 2.2, "aim"), hold(115.0, 122.0, "carry")])),
  C: sprite("reyes", clipsFor(tracks.C, B3, [hold(15.0, 38.0, "aim"), once(34.92, "shoot", 0.5), once(35.42, "shoot", 0.6), hold(40.0, S2 + 1.6, "aim"), hold(59.6, S3 + 0.9, "aim")])),
  D: sprite("miller", clipsFor(tracks.D, B3, [hold(21.2, S1 + 0.3, "aim"), once(S1 + 0.66, "shoot", 0.6), once(S1 + 1.56, "shoot", 0.6), hold(S1 + 2.2, 37.0, "aim"), once(30.96, "shoot", 0.6), once(34.56, "shoot", 0.6),
    hold(40.0, S2 + 0.25, "aim"), { from: S2 + 0.25, to: DUR, action: "death" }])),
  E: sprite("cole", clipsFor(tracks.E, B3, [{ from: 22.3, to: S1 + 0.6, action: "kneel" }, hold(69.5, 81.6, "crouch"), { from: 95.0, to: DUR, action: "kneel" }])),
  ENTITY: sprite("prisoner", clipsFor(Em.map(k => [k[0], k[1], k[2], k[3]]), { idle: "idle", walk: "walk", run: "walk" }, [hold(0, S1 + 0.9, "sit"), once(29.7, "punch", 1.0), once(31.7, "punch", 1.0), once(33.4, "hit", 0.4),
    once(S2 - 0.25, "punch", 1.0), once(S3 + 0.3, "hit", 0.4), once(S3 + 2.1, "punch", 1.0), once(SLAM, "hit", 0.4)])),
};

// ---- the timeline
const swap = (t, a, b) => ({ t, a: P(...a), b: P(...b) });
const cam = (t, xm, ym, z) => [t, ...P(xm, ym), z], WIDE = [1024, 576, 1.05];
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const roster = scene.roster.map(r => r.id === "B" ? { ...r, callsign: "FUSE", kit: "mg", build: 1.1, color: "#ffd23f", icon: "circle" } : r);
const operators = Object.fromEntries(Object.entries(tracks).map(([id, k]) => [id, opTrack(k)]));
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_timeline_v4.mjs — edit that file, not this one",
  scene: "../scene/deathrow.json", plates, roster,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // DEATH ROW // SRS", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:17:36", shots: [{ from: 0, to: DUR, type: "map" }],
  static: [S1, S2, S3, S4].map(s => [s + 0.03, 0.06]),
  // the steel door: opened by the team, shut on him after the third swap, opened for KNOX and COLE, and once more for the body. Side cell T4 stands open.
  doors: Object.fromEntries(scene.doors.map(d => [d.id, d.id === "GATE"
    ? [[0, 0], [9.0, 0], [10.0, 1], [S3 + 0.9, 1], [S3 + 2.1, 0], [88.8, 0], [89.8, 1], [90.8, 1], [92.0, 0], [109.0, 0], [110.0, 1], [123.0, 1], [124.2, 0], [DUR, 0]]
    : d.id === "T4" ? [[0, 1]] : [[0, 0]]])),
  explored: ["CELL"], operators, operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: Em.map(k => [k[0], ...P(k[1], k[2]), ...k.slice(3)]) },
  sprites, fire, impacts, flashes, repels: repels.map(r => ({ t: r.t, x: P(...r.at)[0], y: P(...r.at)[1], heading: r.heading, power: r.power })),
  pulse: { t0: E0, period: 20, speed: RIPPLE * M, maxR: 27 * M, zone: scene.blockZone, alertFrom: 47, hits: [H1, H2, H3, H4] },
  boundary: { x1: X0, y1: YC - M + 4, x2: X0, y2: YC + M - 4, label: "DEATH ROW" },
  swaps: [swap(S1, COLE_AT_BODY, SEAT), swap(S2, KNOX_BLOCK, BOSS_AT_S2), swap(S3, KNOX_SILL, BOSS_WAIT), swap(S4, COLE_BARS, BOSS_POST)],
  props: [
    { kind: "body", from: 0, to: DUR, track: [[0, ...P(...BODY), 200], [115.0, ...P(...BODY), 200], [115.6, ...P(12.4, 0.35), 180], [122.1, ...P(-1.2, 0.25), 180], [DUR, ...P(-1.2, 0.25), 180]] },
    { kind: "beacon", from: 0, to: 35.6, x: P(20.9, 2.3)[0], y: P(20.9, 2.3)[1] },
  ],
  events: [
    { from: 9.6, to: E1 + 1.5, x: P(...BODY)[0], y: P(...BODY)[1] - 20, text: "TEAM 04 TAG // NO VITALS" },
    { from: 12.2, to: E1 + 1.5, x: P(...SEAT)[0] + 30, y: P(...SEAT)[1] - 50, text: "UNK-01 // CELL LOCKED" },
    { from: 39.2, to: 43.6, x: P(...NOOK)[0] + 30, y: P(...NOOK)[1] - 40, text: "UNK-01 // HOLDING // RHYTHMIC MOTION, RIGHT HAND" },
    { from: S4 + 2, to: S4 + 10, x: P(19.6, 0)[0] + 30, y: P(19.6, 0)[1] - 50, text: "UNK-01 // CELL LOCKED" },
  ],
  unitTags: [
    { who: "MILLER", from: S2 + 0.6, to: 97.4, text: "MILLER // CRITICAL" }, { who: "MILLER", from: 97.4, to: DUR, text: "MILLER // NO VITALS" },
    { who: "COLE", from: 36.2, to: 43.5, text: "T04 BEACON" }, { who: "COLE", from: S4 + 0.8, to: S4 + 6, text: "T04 BEACON RECOVERED" },
  ],
  camera: [
    [0, 540, 576, 1.5], [3.4, 540, 576, 1.5], [5.4, ...WIDE], [8.6, ...WIDE], cam(9.6, 0.6, 0, 1.7), cam(11.2, 0.6, 0, 1.7), [13.4, ...WIDE], [H1.touch - 0.15, ...WIDE],
    cam(H1.touch + 0.25, ...COLE_AT_BODY, 2.0), cam(S1 + 0.9, ...COLE_AT_BODY, 2.0), cam(S1 + 2.6, 9.4, 0, 1.45), cam(36.0, 9.4, 0, 1.45), cam(38.6, 9.4, -1.2, 1.55), cam(E2 - 0.4, 8.6, -0.8, 1.55),
    cam(H2.touch + 0.15, 6.6, 0.8, 1.95), cam(S2 + 1.4, 6.4, 1.0, 1.9), cam(50, 7, 0, 1.3), cam(58, 5, 0.4, 1.3), cam(E3 - 0.4, 3.4, 0, 1.45), cam(H3.touch + 0.15, 1.0, 0, 1.9), cam(S3 + 3.0, 1.0, 0, 1.9),
    cam(71.5, 4.5, 0, 1.4), cam(77, 12, 0, 1.4), cam(81.0, 17.6, 0, 1.75), cam(E4 - 0.5, 18.4, 0, 2.3), cam(S4 + 1.2, 18.6, 0, 2.3), cam(S4 + 2.6, 13, 0, 1.4), cam(90.0, 2, 0, 1.45),
    [93.5, ...WIDE], [109.4, ...WIDE], cam(112.4, 6.5, 0, 1.3), cam(121.6, 2.5, 0, 1.45), cam(124.4, 0.6, 0, 1.6), [126.6, ...WIDE], [DUR, ...WIDE],
  ].sort((a, b) => a[0] - b[0]),
  warn: [
    { from: S1 + 0.25, to: S1 + 3.2, text: "POSITION EXCHANGE  //  COLE <-> UNK-01" },
    { from: S2 + 0.25, to: S2 + 3.2, text: "POSITION EXCHANGE  //  KNOX <-> UNK-01" },
    { from: S3 + 0.25, to: S3 + 3.2, text: "POSITION EXCHANGE  //  KNOX <-> UNK-01  //  UNK-01 AT DOOR" },
    { from: S3 + 3.4, to: 72.0, text: "DOOR SEALED  //  KNOX, COLE, UNK-01 INSIDE" },
    { from: 79.0, to: SLAM, text: "RANGE TO UNK-01  //  KNOX 0.8 m  //  COLE 4.0 m" },
    { from: SLAM, to: S4, text: "RANGE TO UNK-01  //  COLE 0.7 m  //  KNOX 1.3 m" },
    { from: S4 + 0.25, to: S4 + 4.5, text: "POSITION EXCHANGE  //  COLE <-> UNK-01  //  UNK-01 IN CELL" },
    { from: E5 + 4.6, to: E5 + 8, text: "PULSE CONTAINED  //  DOOR SEALED  //  NO EXCHANGE" },
    { from: 110.8, to: 122.8, text: "RECOVERING TEAM 04  //  TWO INSIDE  //  DOOR OPEN" },
  ],
  // DRAFT dialogue from script v4 (no voice yet): for timing and readability only
  subtitles: [
    { from: 4.4, to: 8.6, who: "DISPATCH", text: "There it is again. It has never come through that door." },
    { from: 15.1, to: 18.2, who: "KNOX", text: "Cole, confirm him. Miller, stay on Cole. Nobody else moves." },
    { from: S1 + 0.5, to: S1 + 1.7, who: "MILLER", text: "CONTACT!" },
    { from: 29.0, to: 30.4, who: "MILLER", text: "Fuse, just blow him!" },
    { from: 30.6, to: 33.2, who: "FUSE", text: "With our man on the floor right there? No." },
    { from: 33.9, to: 35.9, who: "KNOX", text: "He's solid. It barely moves him." },
    { from: 39.4, to: 40.9, who: "REYES", text: "His hand. He's counting." },
    { from: 41.1, to: 43.4, who: "DISPATCH", text: "...Twenty seconds. He's on the signal." },
    { from: 43.5, to: 44.4, who: "KNOX", text: "Miller!" },
    { from: S2 + 1.9, to: S2 + 4.6, who: "REYES", text: "He ran at Miller. He was waiting for you." },
    { from: 51.0, to: 53.6, who: "REYES", text: "It takes whoever's closest. Like the count." },
    { from: 54.0, to: 56.2, who: "KNOX", text: "Everyone out. I walk out last." },
    { from: 59.0, to: 60.6, who: "DISPATCH", text: "Next pulse in five." },
    { from: S3 + 2.3, to: S3 + 3.1, who: "FUSE", text: "Door holds." },
    { from: S3 + 3.3, to: S3 + 5.1, who: "REYES", text: "...Knox is still in there." },
    { from: 73.4, to: 75.2, who: "REYES", text: "Knox, he's not hitting you." },
    { from: 75.5, to: 77.6, who: "KNOX", text: "He needs me closer than Cole." },
    { from: 77.9, to: 80.6, who: "KNOX", text: "Cole. On my word, come to the bars." },
    { from: 79.0, to: 81.5, who: "DISPATCH", text: "Pulse in five. Knox, point eight. Cole, four." },
    { from: 81.6, to: 82.4, who: "KNOX", text: "Now." },
    { from: S4 + 1.0, to: S4 + 2.2, who: "KNOX", text: "Door!" },
    { from: 96.6, to: 99.2, who: "COLE", text: "Knox. Miller's gone." },
    { from: 105.0, to: 107.6, who: "REYES", text: "Wait for it to hit the door." },
    { from: 109.7, to: 112.4, who: "KNOX", text: "Fuse, with me. We carry him out." },
    { from: 122.8, to: 123.8, who: "KNOX", text: "Shut it." },
  ],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline_v4.json", JSON.stringify(tl));
console.log("wrote timeline_v4.json; swaps at", [S1, S2, S3, S4].map(s => s.toFixed(2)).join(", "), "s");

// ---- self-check: at every emission, which living person does the ripple reach first? (the dead and those beyond the shut door do not count)
const lerpKeys = (keys, t) => { if (t <= keys[0][0]) return keys[0]; for (let i = 1; i < keys.length; i++) if (keys[i][0] >= t) { const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0] || 1); return a.map((v, k) => v + (b[k] - v) * u); } return keys.at(-1); };
const doorOpenAt = t => lerpKeys(tl.doors.GATE, t)[1] > 0.5; let bad = 0;
for (const [E, h] of [[E1, H1], [E2, H2], [E3, H3], [E4, H4], [E5, null], [E6, null]]) {
  const b = bossAt(E), open = doorOpenAt(E);
  const d = Object.entries(tracks).filter(([id]) => !(id === "D" && E > S2)).map(([id, k]) => { const o = lerpKeys(k, E); return { who: tl.operatorIds[id], x: o[1], d: dist([o[1], o[2]], b) }; })
    .filter(o => o.x > 0 || open).sort((p, q) => p.d - q.d);
  const ok = h ? (d[0]?.who === h.who && (d[1]?.d ?? 99) - d[0].d >= 0.4) : !d.length; if (!ok) bad++;
  console.log(`emission ${E}s (door ${open ? "open" : "shut"}): prisoner at ${b[0].toFixed(1)},${b[1].toFixed(1)} ->`, d.length ? d.slice(0, 4).map(o => `${o.who} ${o.d.toFixed(2)}m`).join(", ") : "nobody in reach", `[${ok ? "OK" : "MISMATCH"}]`);
}
console.log(`swap 2: he is ${dist(BOSS_AT_S2, KNOX_BLOCK).toFixed(2)} m short of KNOX when it happens`, dist(BOSS_AT_S2, KNOX_BLOCK) >= 1 ? "[OK]" : "[TOO CLOSE]");
if (bad) process.exitCode = 1;
