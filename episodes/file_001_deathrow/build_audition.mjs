// FILE 001 — audition reel: every action that makes a sound, one at a time, each played twice,
// with the action's name on screen and the sample's file name in the subtitle line.
// Nothing here is story. It exists so each action + sound pair can be approved by ear before it is used.
//   node episodes/file_001_deathrow/build_audition.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";

const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], EPS = 0.001;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const RIPPLE = 4.5, LOCK = 0.6;
const PARK = { A: [-40, 0], B: [-41, -0.9], C: [-42, 0.9], D: [-43, -0.8], E: [-44, 0.5] };
const NAME = { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" };

const ops = Object.fromEntries(Object.keys(PARK).map(id => [id, [[0, ...PARK[id], 0]]]));
const Em = [[0, -30, 0, 180, 0, 0, 1, 0, 0, 0]];
const fire = [], impacts = [], warn = [], subtitles = [], camera = [], guard = { A: [[0, 0]], B: [[0, 0]] }, gate = [[0, 0]], swaps = [];
let pulse = null, T = 1.0, n = 0;
const items = [];

// one slot: put people on stage for [T, T+len], park them again afterwards
function slot(len, title, sample, cam, stage, body) {
  const t0 = T, t1 = T + len; n++;
  for (const [id, x, y, h] of stage) ops[id].push([t0 - EPS, ...PARK[id], 0], [t0, x, y, h], [t1 - EPS, x, y, h], [t1, ...PARK[id], 0]);
  warn.push({ from: t0 + 0.1, to: t1 - 0.2, text: `${String(n).padStart(2, "0")}  //  ${title}` });
  subtitles.push({ from: t0 + 0.1, to: t1 - 0.2, who: "SOUND", text: sample });
  camera.push([t0, ...P(cam[0], cam[1]), cam[2]], [t1 - EPS, ...P(cam[0], cam[1]), cam[2]]);
  body(t0, t1);
  items.push({ n, from: t0, to: t1, title, sample });
  T = t1;
}
const boss = (t, x, y, h, o = {}) => Em.push([t, x, y, h, o.vis ?? 1, o.g ?? 0, o.pose ?? 1, 0, 0, o.reach ?? 0]);
const bossOn = (t0, t1, x, y, h, o) => { boss(t0 - EPS, -30, 0, h, { vis: 0 }); boss(t0, x, y, h, o); boss(t1 - EPS, x, y, h, o); boss(t1, -30, 0, h, { vis: 0 }); };
const TWICE = [1.2, 3.2], CLOSE = [9, 0, 2.2];

for (const [id, label, sample] of [["A", "KNOX  //  SHOTGUN", "shotgun"], ["D", "MILLER  //  RIFLE", "rifle"], ["C", "REYES  //  PISTOL", "pistol"]])
  slot(5, label, sample + ".wav", CLOSE, [[id, 7, 0, 0]], t0 => { for (const d of TWICE) fire.push({ t: t0 + d, who: NAME[id], at: P(12.5, 0) }); });

slot(5, "HOUND  //  CROSSBOW", "crossbow.wav", CLOSE, [["B", 7, 0, 0]], t0 => { for (const d of TWICE) fire.push({ t: t0 + d, who: "HOUND", at: P(12.5, 0), kind: "bolt" }); });

slot(5, "HOUND  //  TOMAHAWK", "axe.wav", [8, 0, 2.6], [["B", 7.2, 0, 0]], (t0, t1) => {
  guard.B.push([t0 - EPS, 0], [t0, 1], [t1 - EPS, 1], [t1, 0]);
  for (const d of TWICE) { fire.push({ t: t0 + d, who: "HOUND", at: P(8.1, 0), kind: "melee" }); impacts.push({ t: t0 + d, x: P(8.1, 0)[0], y: P(8.1, 0)[1], r: 36, kind: "chop" }); }
});

const punchAt = (t, x, kind, r) => { boss(t - 0.3, x, 0, 180, { reach: 0 }); boss(t, x - 0.14, 0, 180, { reach: 1 }); boss(t + 0.3, x, 0, 180, { reach: 0 }); impacts.push({ t, x: P(x - 0.86, 0)[0], y: P(x - 0.86, 0)[1], r, kind }); };
slot(5, "PRISONER  //  BLOW ON KNOX'S SHIELD", "shield_hit.wav", CLOSE, [["A", 9, 0, 0]], (t0, t1) => {
  guard.A.push([t0 - EPS, 0], [t0, 1], [t1 - EPS, 1], [t1, 0]); bossOn(t0, t1, 10.6, 0, 180); for (const d of TWICE) punchAt(t0 + d, 10.6, "shield", 62);
});
slot(5, "PRISONER  //  PUNCH LANDS ON A PERSON", "punch.wav", CLOSE, [["D", 9.4, 0, 0]], (t0, t1) => { bossOn(t0, t1, 10.6, 0, 180); for (const d of TWICE) punchAt(t0 + d, 10.6, "body", 125); });
slot(5, "PRISONER  //  POUNDING THE STEEL DOOR", "door_pound.wav", [1.6, 0, 2.0], [], (t0, t1) => { bossOn(t0, t1, 1.2, 0, 180); for (const d of TWICE) punchAt(t0 + d, 1.2, "door", 85); });

slot(6, "STEEL DOOR  //  OPEN, THEN SHUT AND BOLT", "fire_door.wav  >  door_slam.wav + door_latch.wav", [0.6, 0, 1.9], [["B", -0.5, 0.75, 0]], t0 => {
  gate.push([t0 + 1.0, 0], [t0 + 2.0, 1], [t0 + 3.6, 1], [t0 + 4.8, 0]);
});

slot(6, "FOOTSTEPS  //  KNOX WALKS (TOP), REYES RUNS (BOTTOM)", "step_b.wav  /  step_a.wav", [9, 0, 1.7], [], (t0, t1) => {
  ops.A.push([t0 - EPS, ...PARK.A, 0], [t0, 4, -1.2, 0], [t0 + 0.4, 4, -1.2, 0], [t0 + 5.4, 11, -1.2, 0], [t1 - EPS, 11, -1.2, 0], [t1, ...PARK.A, 0]);
  ops.C.push([t0 - EPS, ...PARK.C, 0], [t0, 4, 1.2, 0], [t0 + 1.0, 4, 1.2, 0], [t0 + 3.0, 13, 1.2, 0], [t1 - EPS, 13, 1.2, 0], [t1, ...PARK.C, 0]);
});

// the ripple, the lock and the trade, once, at story speed
slot(8, "SHACKLES  //  RIPPLE, LOCK, EXCHANGE", "pulse.wav  >  relocate.wav + glitch_burst.wav", [11, 0, 1.05], [], (t0, t1) => {
  const SEAT = [21.8, 0], AT = [11.9, 0], E = t0 + 0.8, touch = E + (SEAT[0] - AT[0]) / RIPPLE, S = touch + LOCK;
  ops.E.push([t0 - EPS, ...PARK.E, 0], [t0, ...AT, 0], [S, ...AT, 0], [S + EPS, ...SEAT, 0], [t1 - EPS, ...SEAT, 0], [t1, ...PARK.E, 0]);
  boss(t0 - EPS, -30, 0, 180, { vis: 0 }); boss(t0, ...SEAT, 180, { pose: 0 }); boss(S, ...SEAT, 180, { pose: 0 });
  boss(S + EPS, ...AT, 180, { pose: 0, g: 0.9 }); boss(S + 0.3, ...AT, 180, { pose: 0 }); boss(t1 - EPS, ...AT, 180, { pose: 0 }); boss(t1, -30, 0, 180, { vis: 0 });
  pulse = { t0: E, period: 999, speed: RIPPLE * M, maxR: 27 * M, zone: scene.blockZone, alertFrom: 9999, hits: [{ t: E, touch, swap: S, who: "COLE" }] };
  swaps.push({ t: S, a: P(...AT), b: P(...SEAT) });
});

const DUR = T + 1;
Em.sort((a, b) => a[0] - b[0]);
for (const id in ops) { ops[id].sort((a, b) => a[0] - b[0]); ops[id].push([DUR, ...PARK[id], 0]); }
for (const g of Object.values(guard)) g.sort((a, b) => a[0] - b[0]);
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_audition.mjs",
  scene: "../scene/deathrow.json", plates, feedLabel: "FILE 001 // ACTION + SOUND AUDITION // EACH PLAYED TWICE",
  entityId: "UNK-01", species: "prisoner", duration: DUR, fps: 30, clockStart: "00:00:00",
  shots: [{ from: 0, to: DUR, type: "map" }], static: swaps.map(s => [s.t + 0.03, 0.06]),
  doors: Object.fromEntries(scene.doors.map(d => [d.id, d.id === "GATE" ? [...gate, [DUR, 0]] : [[0, 0]]])),
  explored: ["CELL"],
  operators: Object.fromEntries(Object.entries(ops).map(([id, k]) => [id, { interp: "linear", keys: k.map(([t, x, y, h]) => [t, ...P(x, y), h]) }])),
  operatorIds: NAME,
  entity: { interp: "linear", keys: Em.map(k => [k[0], ...P(k[1], k[2]), ...k.slice(3)]) },
  fire, impacts, guard, pulse, swaps,
  boundary: { x1: X0, y1: YC - M + 4, x2: X0, y2: YC + M - 4, label: "DEATH ROW" },
  camera: [[0, ...P(9, 0), 2.2], ...camera, [DUR, ...P(11, 0), 1.05]].sort((a, b) => a[0] - b[0]),
  warn, subtitles,
};
addSound(tl, { ambience: "garage" });
tl.sfx = tl.sfx.filter(c => c.type !== "drone");        // no music bed under an audition
fs.writeFileSync("episodes/file_001_deathrow/timeline_audition.json", JSON.stringify(tl));
fs.writeFileSync("episodes/file_001_deathrow/audition_items.json", JSON.stringify(items, null, 1));
console.log("wrote timeline_audition.json", DUR, "s");
for (const i of items) console.log(String(i.n).padStart(2, "0"), `${Math.floor(i.from / 60)}:${(i.from % 60).toFixed(0).padStart(2, "0")}`, i.title, "|", i.sample);
