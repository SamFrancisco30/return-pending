// Pipeline test: KNOX and the prisoner played from the sprite library on the death-row map. Not story.
//   node library/build_spike.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 12;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const OFF = [-40, 0], PUNCH = [3.4, 5.0], HIT = 0.33, BASH = 6.4, SHOTS = [8.0, 9.4, 10.8];
const op = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const ek = (t, x, y, h) => [t, ...P(x, y), h, 1, 0, 1, 0, 0, 0];
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "PIPELINE TEST // SPRITE LIBRARY // KNOX + UNK-01", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: { A: op([[0, 5.6, 0, 0], [2.6, 9, 0, 0], [DUR, 9, 0, 0]]), B: op([[0, ...OFF, 0]]), C: op([[0, ...OFF, 0]]), D: op([[0, ...OFF, 0]]), E: op([[0, ...OFF, 0]]) },
  operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [ek(0, 15.2, 0, 180), ek(3.0, 10.5, 0, 180), ek(BASH + 0.3, 10.5, 0, 180), ek(BASH + 0.65, 11.9, 0, 180), ...SHOTS.flatMap((t, i) => [ek(t, 11.9 + i * 0.35, 0, 180), ek(t + 0.25, 12.25 + i * 0.35, 0, 180)]), ek(DUR, 12.95, 0, 180)] },
  sprites: {
    A: { dir: "../library/characters/knox", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 2.6, action: "guard", loop: true }, { from: BASH, action: "bash" }, { from: BASH + 0.9, action: "aim", loop: true }, ...SHOTS.flatMap(t => [{ from: t - 0.08, action: "shoot" }, { from: t + 0.6, action: "aim", loop: true }])] },
    ENTITY: { dir: "../library/characters/prisoner", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 3.0, action: "idle", loop: true },
      ...PUNCH.flatMap(t => [{ from: t, action: "punch" }, { from: t + 1.04, action: "idle", loop: true }]), { from: BASH + 0.3, action: "idle", loop: true }] },
  },
  fire: SHOTS.map((t, i) => ({ t, who: "KNOX", kind: "shotgun", at: P(11.9 + i * 0.35, 0), muzzle: [62, 27] })), impacts: [...PUNCH.map(t => ({ t: t + HIT, x: P(9.62, 0.1)[0], y: P(9.62, 0.1)[1], r: 62, kind: "shield" })), { t: BASH + 0.3, x: P(9.9, 0)[0], y: P(9.9, 0)[1], r: 90, kind: "shield" }],
  camera: [[0, ...P(10, 0), 2.3], [DUR, ...P(10, 0), 2.3]],
  warn: [{ from: 0.3, to: DUR - 0.3, text: "PIPELINE TEST  //  3D BODIES RENDERED TO THERMAL SPRITES" }],
  subtitles: [{ from: 0.2, to: 2.8, who: "TEST", text: "walk" }, { from: 3.0, to: 6.2, who: "TEST", text: "guard  /  punch x2" }, { from: 6.3, to: 7.5, who: "TEST", text: "shield bash" }, { from: 7.6, to: 11.8, who: "TEST", text: "short shotgun x3" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_spike.json", JSON.stringify(tl)); console.log("wrote library/timeline_spike.json");
