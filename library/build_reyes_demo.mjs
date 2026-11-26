// REYES test: the long rifle at range (three shots, one per candidate sound), then the pistol when the prisoner closes. Not story.
//   node library/build_reyes_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 15;
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const OFF = [-40, 0], RX = 4.0, SN = [4.0, 6.0, 8.0], PS = [10.2, 11.0, 11.8], W0 = 6.6, W1 = 11.8, EX0 = 15.4, EX1 = 8.6;
const ex = t => t <= W0 ? EX0 : t >= W1 ? EX1 : EX0 + (EX1 - EX0) * (t - W0) / (W1 - W0);       // where the prisoner is: stands, then walks him down
const op = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const ek = (t, x, y, h) => [t, ...P(x, y), h, 1, 0, 1, 0, 0, 0];
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "SPRITE LIBRARY // REYES TEST", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: { C: op([[0, 1.6, 0, 0], [2.0, RX, 0, 0], [DUR, RX, 0, 0]]), A: op([[0, ...OFF, 0]]), B: op([[0, ...OFF, 0]]), D: op([[0, ...OFF, 0]]), E: op([[0, ...OFF, 0]]) },
  operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [ek(0, EX0, 0, 180), ek(W0, EX0, 0, 180), ek(W1, EX1, 0, 180), ek(W1 + 0.35, EX1 + 1.3, 0, 180), ek(DUR, EX1 + 1.3, 0, 180)] },
  sprites: {
    C: { dir: "../library/characters/reyes", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 2.0, action: "idle", loop: true }, { from: 2.8, action: "snipe_aim", loop: true },
      ...SN.flatMap(t => [{ from: t - 0.04, action: "snipe_shoot" }, { from: t + 0.5, action: "snipe_aim", loop: true }]), { from: 9.0, action: "aim", loop: true },
      ...PS.flatMap(t => [{ from: t - 0.08, action: "shoot" }]), { from: PS[2] + 0.6, action: "aim", loop: true }, { from: 13.2, action: "idle", loop: true }] },
    ENTITY: { dir: "../library/characters/prisoner", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "idle", loop: true },
      ...SN.slice(0, 2).flatMap(t => [{ from: t + 0.05, action: "hit" }, { from: t + 0.45, action: "idle", loop: true }]), { from: W0, action: "walk", loop: true },
      { from: SN[2] + 0.05, action: "hit" }, { from: SN[2] + 0.45, action: "walk", loop: true }, { from: PS[0] + 0.03, action: "hit" }, { from: PS[0] + 0.4, action: "walk", loop: true }, { from: PS[2] + 0.02, action: "knockback" }] },
  },
  fire: [...SN.map((t, i) => ({ t, who: "REYES", kind: "sniper", target: "ENTITY", at: P(ex(t), 0) })),
    ...PS.map((t, i) => ({ t, who: "REYES", kind: "pistol_s", target: "ENTITY", at: P(ex(t), 0) }))],
  camera: [[0, ...P(9.6, 0), 1.55], [8.6, ...P(9.6, 0), 1.55], [10.0, ...P(7.0, 0), 2.3], [DUR, ...P(7.0, 0), 2.3]],
  subtitles: [{ from: 0.2, to: 2.6, who: "TEST", text: "walk, pistol low, rifle slung" }, { from: 2.8, to: 8.9, who: "TEST", text: "long rifle x3" }, { from: 9.0, to: DUR - 0.2, who: "TEST", text: "suppressed pistol x3" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_reyes_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_reyes_demo.json");
