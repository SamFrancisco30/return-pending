// MILLER test: the rifleman. Carbine carried, shouldered, three three-round bursts as the prisoner walks him down. Not story.
//   node library/build_miller_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 13;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const OFF = [-40, 0], RX = 5.0, BU = [4.4, 6.4, 8.4], GAP = 0.125, W0 = 5.0, W1 = 8.65, EX0 = 14.6, EX1 = 9.0;
const ex = t => t <= W0 ? EX0 : t >= W1 ? EX1 : EX0 + (EX1 - EX0) * (t - W0) / (W1 - W0);
const op = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const ek = (t, x, y, h) => [t, ...P(x, y), h, 1, 0, 1, 0, 0, 0];
const rounds = BU.flatMap(t => [0, 1, 2].map(k => t + k * GAP));            // each burst is three rounds, an eighth of a second apart (matches the "shoot" clip)
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "SPRITE LIBRARY // MILLER TEST", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: { D: op([[0, 1.6, 0, 0], [1.6, 3.4, 0, 0], [2.6, RX, 0, 0], [DUR, RX, 0, 0]]), A: op([[0, ...OFF, 0]]), B: op([[0, ...OFF, 0]]), C: op([[0, ...OFF, 0]]), E: op([[0, ...OFF, 0]]) },
  operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [ek(0, EX0, 0, 180), ek(W0, EX0, 0, 180), ek(W1, EX1, 0, 180), ek(W1 + 0.35, EX1 + 1.3, 0, 180), ek(DUR, EX1 + 1.3, 0, 180)] },
  sprites: {
    D: { dir: "../library/characters/miller", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 1.6, action: "run", loop: true }, { from: 2.6, action: "idle", loop: true }, { from: 3.4, action: "aim", loop: true },
      ...BU.flatMap(t => [{ from: t - 0.04, action: "shoot" }, { from: t + 0.58, action: "aim", loop: true }]), { from: 10.6, action: "idle", loop: true }, { from: 11.4, action: "crouch", loop: true }] },
    ENTITY: { dir: "../library/characters/prisoner", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "idle", loop: true }, { from: BU[0] + 0.05, action: "hit" }, { from: BU[0] + 0.5, action: "idle", loop: true },
      { from: W0, action: "walk", loop: true }, { from: BU[1] + 0.05, action: "hit" }, { from: BU[1] + 0.5, action: "walk", loop: true }, { from: BU[2] + 0.05, action: "hit" }, { from: W1, action: "knockback" }] },
  },
  fire: rounds.map(t => ({ t, who: "MILLER", kind: "rifle", target: "ENTITY", at: P(ex(t), 0) })),
  camera: [[0, ...P(9.4, 0), 1.6], [DUR, ...P(9.4, 0), 1.6]],
  subtitles: [{ from: 0.2, to: 3.3, who: "TEST", text: "walk  /  run  /  stand, carbine carried" }, { from: 3.4, to: 10.5, who: "TEST", text: "shouldered  /  three-round burst x3" }, { from: 10.6, to: DUR - 0.2, who: "TEST", text: "stand down  /  crouch" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_miller_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_miller_demo.json");
