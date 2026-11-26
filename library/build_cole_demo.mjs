// COLE test: the recovery man. Pistol, two shots, then goes forward, kneels over what is down, and walks a sealed case back out. Not story.
//   node library/build_cole_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 16.5;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const OFF = [-40, 0], SH = [3.6, 4.3], EX = 10.0, KX = 9.7, KN = 7.8, UP = 11.8;
const op = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const ek = (t, x, y, h) => [t, ...P(x, y), h, 1, 0, 1, 0, 0, 0];
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "SPRITE LIBRARY // COLE TEST", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: { E: op([[0, 1.6, 0, 0], [2.0, 4.0, 0, 0], [5.6, 4.0, 0, 0], [KN, KX, 0.55, 0], [UP, KX, 0.55, 0], [UP + 0.5, KX, 0.55, 180], [DUR, 4.2, 0.55, 180]]),
    A: op([[0, ...OFF, 0]]), B: op([[0, ...OFF, 0]]), C: op([[0, ...OFF, 0]]), D: op([[0, ...OFF, 0]]) },
  operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [ek(0, EX, 0, 180), ek(SH[1], EX, 0, 180), ek(SH[1] + 0.35, EX + 1.3, 0, 180), ek(DUR, EX + 1.3, 0, 180)] },
  sprites: {
    E: { dir: "../library/characters/cole", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 2.0, action: "idle", loop: true }, { from: 2.7, action: "aim", loop: true },
      ...SH.flatMap(t => [{ from: t - 0.08, action: "shoot" }]), { from: SH[1] + 0.6, action: "aim", loop: true }, { from: 5.2, action: "idle", loop: true }, { from: 5.6, action: "run", loop: true },
      { from: KN, action: "kneel" }, { from: UP, action: "carry_case", loop: true }] },
    ENTITY: { dir: "../library/characters/prisoner", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "idle", loop: true }, { from: SH[0] + 0.03, action: "hit" }, { from: SH[0] + 0.4, action: "idle", loop: true }, { from: SH[1] + 0.02, action: "knockback" }] },
  },
  fire: SH.map(t => ({ t, who: "COLE", kind: "pistol", target: "ENTITY", at: P(EX, 0) })),
  camera: [[0, ...P(7.4, 0), 1.75], [DUR, ...P(7.4, 0), 1.75]],
  subtitles: [{ from: 0.2, to: 2.6, who: "TEST", text: "walk, pistol low" }, { from: 2.7, to: 5.5, who: "TEST", text: "pistol x2" }, { from: 5.6, to: KN, who: "TEST", text: "run" },
    { from: KN, to: UP, who: "TEST", text: "kneel over it" }, { from: UP, to: DUR - 0.2, who: "TEST", text: "carry the sealed case out" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_cole_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_cole_demo.json");
