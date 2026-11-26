// Cast demo: the five squad members side by side, running through their library actions together. Not story.
//   node library/build_cast_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 17;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
// staggered in two columns so nobody overlaps a neighbour
const WHO = { A: ["KNOX", "knox", -2.1, 0], B: ["HOUND", "hound", -1.05, 2.4], C: ["REYES", "reyes", 0, 0], D: ["MILLER", "miller", 1.05, 2.4], E: ["COLE", "cole", 2.1, 0] };
const SHOTS = [8.2, 9.6], T2 = 10.8;
const operators = {}, sprites = {}, fire = [], impacts = [];
for (const [id, [name, dir, y, dx]] of Object.entries(WHO)) {
  operators[id] = { interp: "linear", keys: [[0, 1.4, y], [2, 1.4, y], [5, 5.6, y], [6.5, 10.9, y], [DUR, 10.9, y]].map(([t, x, yy]) => [t, ...P(x + dx, yy), 0]) };
  const clips = [{ from: 0, action: "idle", loop: true }, { from: 2, action: "walk", loop: true }, { from: 5, action: "run", loop: true }, { from: 6.5, action: "aim", loop: true },
    ...SHOTS.flatMap(t => [{ from: t - 0.08, action: "shoot" }, { from: t + 0.6, action: "aim", loop: true }])];
  if (id === "A") clips.push({ from: T2, action: "guard", loop: true }, { from: 12.2, action: "bash" }, { from: 13.1, action: "guard", loop: true });
  if (id === "B") clips.push({ from: T2, action: "idle", loop: true }, { from: 11.6, action: "chop" }, { from: 12.48, action: "idle", loop: true }, { from: 13.6, action: "chop" }, { from: 14.48, action: "idle", loop: true });
  if (id === "C") clips.push({ from: T2, action: "crouch", loop: true });
  if (id === "D") clips.push({ from: T2, action: "idle", loop: true }, { from: 12.0, action: "hit" }, { from: 12.35, action: "death" });
  if (id === "E") clips.push({ from: T2, action: "kneel", loop: true });
  sprites[id] = { dir: "../library/characters/" + dir, pxPerM: M, scale: 1.3, clips };
  for (const t of SHOTS) fire.push({ t, who: name, at: P(16.4 + dx * 0.7, y), ...(id === "A" ? { kind: "shotgun" } : id === "B" ? { kind: "bolt" } : {}) });
}
for (const t of [11.6 + 11 / 24, 13.6 + 11 / 24]) fire.push({ t, who: "HOUND", at: P(14.3, -1.05), kind: "melee" });
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "SPRITE LIBRARY // CAST DEMO", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators, operatorIds: Object.fromEntries(Object.entries(WHO).map(([id, w]) => [id, w[0]])),
  entity: { interp: "linear", keys: [[0, -900, -900, 0, 0, 0, 1, 0, 0, 0], [DUR, -900, -900, 0, 0, 0, 1, 0, 0, 0]] },
  sprites, fire, impacts,
  camera: [[0, ...P(4.4, 0), 1.75], [2, ...P(4.4, 0), 1.75], [5, ...P(7.6, 0), 1.75], [6.5, ...P(13.0, 0), 1.75], [DUR, ...P(13.0, 0), 1.75]],
  subtitles: [{ from: 0.2, to: 1.9, who: "ALL", text: "idle" }, { from: 2, to: 4.9, who: "ALL", text: "walk" }, { from: 5, to: 6.4, who: "ALL", text: "run" }, { from: 6.5, to: 10.6, who: "ALL", text: "aim  /  shoot x2" },
    { from: T2, to: DUR - 0.2, who: "EACH", text: "KNOX guard + bash  /  HOUND tomahawk  /  REYES crouch  /  MILLER hit + down  /  COLE kneel" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_cast_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_cast_demo.json");
