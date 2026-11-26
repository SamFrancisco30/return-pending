// FILE 001 — candidate audition: for each sound that is not settled, three candidates A / B / C on the same action.
// The round A, B, C is played twice. The subtitle line names the file that is playing.
//   node episodes/file_001_deathrow/build_audition_abc.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], EPS = 0.001;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const PARK = { A: [-40, 0], B: [-41, -0.9], C: [-42, 0.9], D: [-43, -0.8], E: [-44, 0.5] }, NAME = { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" };
const ops = Object.fromEntries(Object.keys(PARK).map(id => [id, [[0, ...PARK[id], 0]]]));
const Em = [[0, -30, 0, 180, 0, 0, 1, 0, 0, 0]], fire = [], impacts = [], warn = [], subtitles = [], camera = [], guard = { B: [[0, 0]] }, extraSamples = {};
const boss = (t, x, y, h, o = {}) => Em.push([t, x, y, h, o.vis ?? 1, 0, 1, 0, 0, o.reach ?? 0]);
const GAP = 2.1, LEN = 6 * GAP + 0.8; let T = 1, n = 0;
function item(title, base, who, cam, act) {
  const t0 = T, t1 = T + LEN; n++;
  if (who) ops[who].push([t0 - EPS, ...PARK[who], 0], [t0, 7, 0, 0], [t1 - EPS, 7, 0, 0], [t1, ...PARK[who], 0]);
  warn.push({ from: t0 + 0.1, to: t1 - 0.2, text: `${String(n).padStart(2, "0")}  //  ${title}  //  A, B, C  THEN AGAIN` });
  camera.push([t0, ...P(cam[0], cam[1]), cam[2]], [t1 - EPS, ...P(cam[0], cam[1]), cam[2]]);
  for (let k = 0; k < 6; k++) {
    const L = "abc"[k % 3], s = `${base}_${L}`, t = t0 + 0.8 + k * GAP;
    extraSamples[s] = `../audio/sfx/f001/cand/${s}.wav`;
    subtitles.push({ from: t - 0.35, to: t + GAP - 0.45, who: L.toUpperCase(), text: `${s}.wav` });
    act(t, s, t0, t1, k);
  }
  T = t1;
}
for (const [id, label, base] of [["A", "KNOX  //  SHOTGUN", "shotgun"], ["D", "MILLER  //  RIFLE", "rifle"], ["C", "REYES  //  PISTOL", "pistol"]])
  item(label, base, id, [9, 0, 2.2], (t, s) => fire.push({ t, who: NAME[id], at: P(12.5, 0), sample: s }));
item("HOUND  //  TOMAHAWK", "axe", "B", [8, 0, 2.6], (t, s, t0, t1, k) => {
  if (!k) guard.B.push([t0 - EPS, 0], [t0, 1], [t1 - EPS, 1], [t1, 0]);
  fire.push({ t, who: "HOUND", at: P(8.1, 0), kind: "melee", sample: s }); impacts.push({ t, x: P(8.1, 0)[0], y: P(8.1, 0)[1], r: 36, kind: "chop" });
});
item("PRISONER  //  PUNCH LANDS ON A PERSON", "punch", null, [9, 0, 2.2], (t, s, t0, t1, k) => {
  if (!k) { ops.D.push([t0 - EPS, ...PARK.D, 0], [t0, 9.4, 0, 0], [t1 - EPS, 9.4, 0, 0], [t1, ...PARK.D, 0]); boss(t0 - EPS, -30, 0, 180, { vis: 0 }); boss(t0, 10.6, 0, 180); boss(t1 - EPS, 10.6, 0, 180); boss(t1, -30, 0, 180, { vis: 0 }); }
  boss(t - 0.3, 10.6, 0, 180, { reach: 0 }); boss(t, 10.46, 0, 180, { reach: 1 }); boss(t + 0.3, 10.6, 0, 180, { reach: 0 });
  impacts.push({ t, x: P(9.74, 0)[0], y: P(9.74, 0)[1], r: 125, kind: "body", sample: s });
});
const DUR = T + 1;
Em.sort((a, b) => a[0] - b[0]);
for (const id in ops) { ops[id].sort((a, b) => a[0] - b[0]); ops[id].push([DUR, ...PARK[id], 0]); }
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "FILE 001 // SOUND CANDIDATES // PICK ONE LETTER PER ACTION",
  entityId: "UNK-01", species: "prisoner", duration: DUR, fps: 30, clockStart: "00:00:00",
  shots: [{ from: 0, to: DUR, type: "map" }], doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: Object.fromEntries(Object.entries(ops).map(([id, k]) => [id, { interp: "linear", keys: k.map(([t, x, y, h]) => [t, ...P(x, y), h]) }])),
  operatorIds: NAME, entity: { interp: "linear", keys: Em.map(k => [k[0], ...P(k[1], k[2]), ...k.slice(3)]) },
  fire, impacts, guard, extraSamples,
  camera: [[0, ...P(9, 0), 2.2], ...camera, [DUR, ...P(9, 0), 2.2]].sort((a, b) => a[0] - b[0]), warn, subtitles,
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline_audition_abc.json", JSON.stringify(tl));
console.log("wrote timeline_audition_abc.json", DUR.toFixed(1), "s");
