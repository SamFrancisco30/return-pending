// FILE 001 · GENERAL BLOCK — the fight on the way to death row.
// Staged in METRES on scene/greyrock_block.json (hall x 2..35, y 4.5..10.5; wing x 17..21 below it).
//   node episodes/file_001_deathrow/build_block.mjs        (run from C:\Sam)
// Inmates stand at their cell doors until something loud happens, then walk at the noise.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";

const M = 56, P = (x, y) => [8 + M * x, 20 + M * y];
const DUR = 46, SHOT = 13.4, WAKE = 14.7, WALK = 1.2;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

const opTrack = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
// The dayroom tables are bolted down the middle of the hall (y 7..8), so the team works the lane below them (y ~8.8).
const BODY1 = [13.7, 9.25], BODY2 = [27.2, 6.3], BODY3 = [31.0, 9.1];
const KNOX_WING = [19, 9.75], HOUND_POST = [11.2, 8.9];
const operators = {
  A: opTrack([[0, 1.2, 7.5, 0], [3, 1.2, 7.5, 0], [6.4, 5.4, 8.8, 0], [10.2, 9.4, 8.8, 0], [12.5, 12.0, 8.6, 0], [15.6, 12.0, 8.6, 0], [17.4, ...KNOX_WING, 90], [30.5, ...KNOX_WING, 90],
    [32, 19.6, 8.8, 0], [34, 19.6, 8.8, 0], [41.0, 33.4, 8.7, 0], [42.6, 36.6, 7.4, 0], [DUR, 36.6, 7.4, 0]]),
  // HOUND leads with the tomahawk, then holds the rear
  B: opTrack([[0, 2.6, 7.4, 0], [2.6, 2.6, 7.4, 0], [4.4, 5.4, 8.7, 0], [5.7, 8.1, 8.75, 0], [6.4, 8.1, 8.75, 0], [7.7, 10.2, 9.0, 0], [8.4, 10.2, 9.0, 0], [10.5, 12.0, 8.9, 0], [14.8, 12.0, 8.9, 0],
    [15.6, ...HOUND_POST, 180], [30.5, ...HOUND_POST, 180], [32.5, 14.5, 8.8, 0], [34, 14.5, 8.8, 0], [40.2, 33.6, 8.8, 0], [41.4, 36.9, 7.6, 0], [DUR, 36.9, 7.6, 0]]),
  C: opTrack([[0, 0.3, 7.9, 0], [3.6, 0.3, 7.9, 0], [7.4, 5.2, 8.9, 0], [11, 8.6, 8.5, 0], [13, 11.2, 8.3, 0], [14.9, 11.2, 8.3, 40], [16.6, 15.6, 8.4, 0], [30.5, 15.6, 8.4, 0],
    [34.4, 15.6, 8.4, 0], [41.6, 33.2, 8.9, 0], [43.0, 35.8, 7.9, 0], [DUR, 35.8, 7.9, 0]]),
  D: opTrack([[0, -0.3, 7.2, 0], [4, -0.3, 7.2, 0], [8.0, 5.0, 8.7, 0], [11.6, 9.6, 8.7, 0], [12.6, 12.7, 9.0, 60], [30.5, 12.7, 9.0, 0], [34.8, 12.7, 9.0, 0], [42.0, 33.0, 8.6, 0], [43.4, 35.2, 7.2, 0], [DUR, 35.2, 7.2, 0]]),
  E: opTrack([[0, -1.1, 7.6, 0], [4.4, -1.1, 7.6, 0], [8.6, 4.8, 8.9, 0], [10.8, 9.0, 9.0, 0], [12.2, 13.1, 9.1, 20], [31, 13.1, 9.1, 20], [35, 13.1, 9.1, 0],
    [37.0, 23.4, 8.8, 0], [37.8, 24.2, 6.5, 0], [38.6, 26.6, 6.45, 0], [39.3, 26.6, 6.45, 0], [39.9, 28.6, 6.6, 0], [40.6, 29.2, 8.8, 0], [41.2, 30.4, 9.0, 0], [42.0, 30.4, 9.0, 0], [44.4, 34.6, 7.7, 0], [DUR, 34.6, 7.7, 0]]),
};
const lerpOp = (id, t) => { const k = operators[id].keys; if (t <= k[0][0]) return k[0]; for (let i = 1; i < k.length; i++) if (k[i][0] >= t) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0] || 1); return a.map((v, j) => v + (b[j] - v) * u); } return k.at(-1); };
const opAt = (id, t) => { const o = lerpOp(id, t); return [(o[1] - 8) / M, (o[2] - 20) / M]; };

// ---- inmates. key = [t, x, y, heading, visible, glitch, pose, look, hidden, reach]
const mobs = [], fire = [], impacts = [], sounds = [];
const NAME = { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" };
const ring = (t, p, r, loud) => sounds.push({ t, x: P(...p)[0], y: P(...p)[1], r: r * M, loud });
const hit = (t, p, r = 55, kind = "shield") => impacts.push({ t, x: P(...p)[0], y: P(...p)[1], r, kind });
function shoot(t, id, at) { fire.push({ t, who: NAME[id], at: P(...at) }); ring(t, opAt(id, t), 16, true); }
function chop(t, id, at) { fire.push({ t, who: NAME[id], at: P(...at), kind: "melee" }); hit(t, at, 36, "chop"); ring(t, at, 1.6, false); }

// home = where it stands; goal(t) = who it walks at once woken; killer = [operator, time, how]
function inmate(home, facing, { wake = null, goal = null, stopAt = 1.1, kill = null, lunge = null, speed = WALK } = {}) {
  const K = [[0, ...home, facing, 1, 0, 0, 0, 0, 0]];
  let pos = home.slice(), t = 0, h = facing;
  if (lunge) {                                    // bursts out of its cell at one person, no warning
    K.push([lunge.t - 0.05, ...home, facing, 1, 0, 0, 0, 0, 0]);
    pos = lunge.to; h = ang(home, lunge.to); t = lunge.t + 0.45;
    K.push([t, ...pos, h, 1, 0.2, 1, 0, 0, 0.7]);
  } else if (wake != null) {
    const look = ((ang(home, [12.7, 9.0]) - facing + 540) % 360) - 180;
    K.push([SHOT, ...home, facing, 1, 0, 0, 0, 0, 0], [SHOT + 0.5, ...home, facing, 1, 0, 0, Math.max(-85, Math.min(85, look)), 0, 0], [wake, ...home, facing, 1, 0, 0, Math.max(-85, Math.min(85, look)), 0, 0]);
    t = wake;
    const end = kill ? kill[1] : DUR;
    while (t < end - 1e-6) {                      // walk at the goal in half-second steps, stop at arm's length
      const dt = Math.min(0.5, end - t), g = goal(t + dt), d = dist(pos, g);
      const step = Math.max(0, Math.min(speed * dt, d - stopAt));
      h = ang(pos, g); pos = [pos[0] + Math.cos(h * Math.PI / 180) * step, pos[1] + Math.sin(h * Math.PI / 180) * step]; t += dt;
      K.push([t, ...pos, h, 1, 0, 1, 0, 0, d - stopAt < 0.4 ? 0.6 : 0]);
    }
  }
  if (kill) {
    const [who, kt, how] = kill, last = K.at(-1);
    if (kt > last[0]) K.push([kt, ...last.slice(1)]);
    (how === "axe" ? chop : shoot)(kt - 0.04, who, pos);
    K.push([kt + 0.05, ...pos, h, 1, 0.9, 0.3, 0, 0, 0], [kt + 0.5, ...pos, h + 25, 0.26, 0, 0, 0, 0, 0], [DUR, ...pos, h + 25, 0.26, 0, 0, 0, 0, 0]);
  } else K.push([DUR, ...K.at(-1).slice(1)]);
  mobs.push({ species: "inmate", track: { interp: "linear", keys: K.map(k => [k[0], ...P(k[1], k[2]), ...k.slice(3)]) }, _end: pos });
  return pos;
}
const top = x => [x + 1.5, 5.15], bot = x => [x + 1.5, 10.25];     // bottom row stands in its doorways, clear of the lane
// two standing in the way: HOUND takes them with the tomahawk, quietly
inmate([9.25, 8.75], 180, { kill: ["B", 6.1, "axe"] });
inmate([11.35, 9.0], 180, { kill: ["B", 8.1, "axe"] });
// the one nobody saw: inside the cell beside the first Team 04 body, it goes for COLE
inmate([15.4, 11.4], -90, { lunge: { t: 12.9, to: [14.2, 9.9] }, kill: ["D", SHOT, "gun"] });
// hall, left of the team: they come at HOUND
const toHound = () => HOUND_POST;
[[bot(11), 16.9], [top(8), 18.0], [bot(8), 19.2], [top(5), 21.2], [bot(5), 22.6]].forEach(([home, kt]) =>
  inmate(home, home[1] < 7 ? 90 : -90, { wake: WAKE + rnd() * 0.5, goal: toHound, kill: ["B", kt, "axe"] }));
// hall, centre top: they come at COLE; MILLER drops them
[[top(14), 15.7], [top(17), 16.4]].forEach(([home, kt]) => inmate(home, 90, { wake: WAKE + 0.1, goal: () => [13.1, 9.0], kill: ["D", kt, "gun"] }));
// hall, right of the team: a long walk down the hall into REYES's and MILLER's fire
const toTeam = () => [15.6, 8.6];
[[top(20), "D", 17.1], [bot(21), "C", 18.0], [top(23), "D", 19.5], [bot(24), "C", 20.2], [top(26), "C", 22.4], [bot(27), "D", 23.0], [top(29), "C", 24.6], [bot(30), "D", 25.6], [top(32), "C", 27.6]]
  .forEach(([home, who, kt]) => inmate(home, home[1] < 7 ? 90 : -90, { wake: WAKE + rnd() * 0.6, goal: toTeam, kill: [who, kt, "gun"] }));
// the wing: nine of them, all heading for the 4 m mouth. KNOX is standing in it.
const wing = [[19.5, 13.6], [18.3, 14.2], [20.0, 14.9], [18.6, 15.8], [15.6, 14.9], [19.6, 16.6], [22.4, 15.0], [18.4, 17.6], [20.1, 18.3]];
wing.forEach((home, i) => {
  const via = home[0] < 17 ? [17.6, 14.9] : home[0] > 21 ? [20.4, 15.0] : null, slot = [18.0 + (i % 3) * 1.0, 11.15];
  inmate(home, -90, { wake: WAKE + 0.9 + rnd() * 0.5, stopAt: 0.25, goal: t => (via && t < WAKE + 3.2 ? via : slot), kill: ["A", 18.3 + i * 1.28, "gun"] });
});
// blows on the shield between blasts
for (let t = 17.9; t < 29.4; t += 1.28) hit(t + 0.6, [18.4 + rnd() * 1.2, 10.45], 50);
// REYES sees the wing first, and says so before she fires
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_block.mjs — edit that file, not this one",
  scene: "../scene/greyrock_block.json",
  plates: JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).block,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // GENERAL BLOCK // SRS",
  entityId: "UNK-01", species: "inmate", duration: DUR, fps: 30, clockStart: "02:16:46",
  shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(JSON.parse(fs.readFileSync("scene/greyrock_block.json", "utf8")).doors.map(d => [d.id, [[0, 1]]])),
  explored: [],
  operators, operatorIds: NAME,
  entity: { interp: "linear", keys: [[0, -500, -500, 0, 0, 0, 0, 0, 0, 0], [DUR, -500, -500, 0, 0, 0, 0, 0, 0, 0]] },
  mobs: mobs.map(({ species, track }) => ({ species, track })), fire, impacts, sounds,
  // HOUND: tomahawk out for the whole block. KNOX: shield squared up in the wing mouth.
  guard: { B: [[0, 1], [DUR, 1]], A: [[0, 0], [16.8, 0], [17.5, 1], [30.2, 1], [31, 0]] },
  // the periodic signal is already on the readout here; nobody knows what it is yet (phase lines up with the next scene)
  pulse: { t0: 10, period: 20, speed: 1, maxR: 1, zone: [] },
  props: [{ kind: "body", from: 0, to: DUR, x: P(...BODY1)[0], y: P(...BODY1)[1], rot: 30 }, { kind: "body", from: 0, to: DUR, x: P(...BODY2)[0], y: P(...BODY2)[1], rot: 250 },
          { kind: "body", from: 0, to: DUR, x: P(...BODY3)[0], y: P(...BODY3)[1], rot: 140 }],
  events: [
    { from: 11.4, to: 13.2, x: P(...BODY1)[0], y: P(...BODY1)[1] - 20, text: "TEAM 04 TAG // NO VITALS" },
    { from: 15.0, to: 18.5, x: P(19, 14.5)[0], y: P(19, 14.5)[1], text: "MOVEMENT // WING" },
    { from: 37.4, to: 40.0, x: P(...BODY2)[0], y: P(...BODY2)[1] - 20, text: "TEAM 04 TAG // NO VITALS" },
    { from: 40.2, to: 43.0, x: P(...BODY3)[0], y: P(...BODY3)[1] - 20, text: "TEAM 04 TAG // NO VITALS" },
  ],
  camera: [[0, 330, 450, 1.75], [3, 330, 450, 1.75], [10.5, 700, 490, 1.6], [13.2, 780, 510, 1.6], [14.6, 780, 510, 1.6], [16.4, 1024, 590, 1.06], [30.5, 1024, 590, 1.06],
           [34, 1000, 480, 1.3], [42, 1560, 470, 1.5], [DUR, 1700, 450, 1.5]],
  warn: [
    { from: SHOT + 0.3, to: SHOT + 3.4, text: "GUNSHOT  //  ALL CONTACTS ORIENTING ON SOUND" },
    { from: 30.2, to: 34, text: "GENERAL BLOCK  //  NO MOVEMENT" },
    { from: 41.6, to: DUR, text: "TEAM 04  //  3 OF 4 LOCATED  //  NO VITALS" },
  ],
  // DRAFT dialogue (no voice yet)
  subtitles: [
    { from: 0.5, to: 3.2, who: "DISPATCH", text: "General block. Team Four came through here eleven days ago." },
    { from: 3.6, to: 5.6, who: "KNOX", text: "They're just standing there. Nobody fires." },
    { from: 6.6, to: 8.0, who: "HOUND", text: "Two down. Quiet." },
    { from: 9.4, to: 11.4, who: "COLE", text: "Body. Team Four tag." },
    { from: SHOT + 0.2, to: SHOT + 1.6, who: "MILLER", text: "It was on him! I had to!" },
    { from: 15.0, to: 17.2, who: "REYES", text: "The wing. Knox, the wing is filling up!" },
    { from: 17.4, to: 19.2, who: "KNOX", text: "On it. Hold the hall!" },
    { from: 20.6, to: 22.4, who: "HOUND", text: "Rear's mine." },
    { from: 25.0, to: 26.6, who: "REYES", text: "Two left on the hall." },
    { from: 30.4, to: 32.0, who: "REYES", text: "Clear." },
    { from: 32.2, to: 34.6, who: "DISPATCH", text: "No movement on the block. The signal is still there." },
    { from: 38.0, to: 40.4, who: "COLE", text: "Two more. That's three of four." },
    { from: 42.4, to: 45.4, who: "DISPATCH", text: "Their beacon is past that passage. Death row." },
  ],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline_block.json", JSON.stringify(tl));
console.log("wrote timeline_block.json:", mobs.length, "inmates,", fire.length, "attacks,", sounds.length, "sound rings");

// ---- self-check: nothing alive gets inside 1 m of anyone except the three staged contacts
let worst = 9;
for (let t = SHOT + 0.6; t < 30; t += 0.25) for (const m of tl.mobs) {
  const k = m.track.keys; let i = 0; while (i + 1 < k.length && k[i + 1][0] <= t) i++;
  if (k[i][4] < 0.5) continue;
  for (const id of "ABCDE") { const o = lerpOp(id, t), d = Math.hypot(o[1] - k[i][1], o[2] - k[i][2]) / M; if (d < worst) worst = d; }
}
console.log("closest a live inmate gets to anyone after the shot:", worst.toFixed(2), "m");
