// HOUND test: crossbow at range, reload, then the tomahawk when the prisoner closes. Not story.
//   node library/build_hound_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 15;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const OFF = [-40, 0], S1 = 3.4, S2 = 6.4, CH = [10.6, 12.4], HIT = 11 / 24;       // the chop lands on its 11th frame
const op = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const ek = (t, x, y, h) => [t, ...P(x, y), h, 1, 0, 1, 0, 0, 0];
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "SPRITE LIBRARY // HOUND TEST", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: { B: op([[0, 3.2, 0, 0], [2.4, 6.4, 0, 0], [DUR, 6.4, 0, 0]]), A: op([[0, ...OFF, 0]]), C: op([[0, ...OFF, 0]]), D: op([[0, ...OFF, 0]]), E: op([[0, ...OFF, 0]]) },
  operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  // the prisoner stands at range, takes two bolts, then walks him down and takes the axe twice
  entity: { interp: "linear", keys: [ek(0, 13.6, 0, 180), ek(S2 + 0.8, 13.6, 0, 180), ek(10.2, 7.75, 0, 180), ek(CH[0] + HIT, 7.75, 0, 180), ek(CH[0] + HIT + 0.3, 8.25, 0, 180),
    ek(CH[1] + HIT, 8.25, 0, 180), ek(CH[1] + HIT + 0.35, 9.5, 0, 180), ek(DUR, 9.5, 0, 180)] },
  sprites: {
    B: { dir: "../library/characters/hound", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 2.4, action: "aim", loop: true },
      { from: S1 - 0.08, action: "shoot" }, { from: S1 + 0.6, action: "reload" }, { from: S1 + 2.3, action: "aim", loop: true }, { from: S2 - 0.08, action: "shoot" }, { from: S2 + 0.6, action: "reload" },
      { from: 8.3, action: "idle", loop: true }, { from: CH[0], action: "chop" }, { from: CH[0] + 0.875, action: "idle", loop: true }, { from: CH[1], action: "chop" }, { from: CH[1] + 0.875, action: "idle", loop: true }] },
    ENTITY: { dir: "../library/characters/prisoner", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "idle", loop: true }, { from: S1 + 0.06, action: "hit" }, { from: S1 + 0.45, action: "idle", loop: true },
      { from: S2 + 0.06, action: "hit" }, { from: S2 + 0.45, action: "idle", loop: true }, { from: S2 + 0.8, action: "walk", loop: true }, { from: 10.2, action: "idle", loop: true },
      { from: CH[0] + HIT, action: "hit" }, { from: CH[0] + HIT + 0.4, action: "idle", loop: true }, { from: CH[1] + HIT, action: "knockback" }, { from: CH[1] + HIT + 0.85, action: "idle", loop: true }] },
  },
  fire: [{ t: S1, who: "HOUND", kind: "bolt", target: "ENTITY", at: P(13.6, 0.12) }, { t: S2, who: "HOUND", kind: "bolt", target: "ENTITY", at: P(13.6, -0.2) }],
  impacts: CH.map(t => ({ t: t + HIT, x: P(7.45, 0)[0], y: P(7.45, 0)[1], r: 22, kind: "chop" })),
  extraCues: CH.map(t => ({ type: "oneshot", t: t + HIT - 0.12, sample: "axe", vary: 60 })),
  camera: [[0, ...P(8.6, 0), 1.9], [7.4, ...P(8.6, 0), 1.9], [9.6, ...P(7.6, 0), 2.6], [DUR, ...P(7.6, 0), 2.6]],
  subtitles: [{ from: 0.2, to: 2.3, who: "TEST", text: "walk, crossbow carried" }, { from: 2.5, to: 8.2, who: "TEST", text: "aim  /  shoot  /  reload  /  shoot" }, { from: 8.3, to: DUR - 0.2, who: "TEST", text: "tomahawk: chop x2" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_hound_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_hound_demo.json");
