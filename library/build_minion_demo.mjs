// Small-monster look test: residents (dim until roused, the rousing spreads, heat goes out when put down) next to the main threat. Not story.
//   node library/build_minion_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 14, L = "../library/characters/";
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const OFF = [-40, 0], op = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const ek = (t, x, y, h, v = 1) => [t, ...P(x, y), h, v, 0, 1, 0, 0, 0];
const RX = [6, 8, 10, 12, 14, 16], RY = -2.0, CHOP = 2.4, HIT = 11 / 24, WAKE = 6.8, SHOT = 7.9, DOWN = 8.25;
const wakeAt = [null, 9.1, 8.5, WAKE, 8.5, 9.1];                                 // the rousing runs outward from the one that was disturbed
const goal = [null, [9.6, 0.2], [10.6, -0.2], null, [12.6, 0.3], [13.0, 0.9]];
const sp = clips => ({ dir: L + "resident_dim", pxPerM: M, scale: 1.3, clips });
const R = d => ({ dir: L + "resident", ...d });
const mobs = [], sprites = {};
RX.forEach((x, i) => {
  const id = "R" + (i + 1), c = [{ from: 0, action: "stand", loop: true }]; let keys;
  if (i === 0) { c.push({ from: CHOP + HIT, action: "down" }); keys = [ek(0, x, RY, 90), ek(CHOP + HIT, x, RY, 90), ek(CHOP + HIT + 0.3, x, RY - 0.5, 90), ek(CHOP + HIT + 0.5, x, RY - 0.5, 90), ek(CHOP + HIT + 1.5, x, RY - 0.5, 90, 0)]; }
  else if (i === 3) { c.push(R({ from: WAKE, action: "turn" }), R({ from: WAKE + 0.4, action: "attack" }), R({ from: SHOT + 0.03, action: "hit" }), R({ from: DOWN, action: "down" }));
    keys = [ek(0, x, RY, 90), ek(WAKE + 0.4, x, RY, 90), ek(WAKE + 0.9, x, RY + 0.35, 90), ek(DOWN, x, RY + 0.35, 90), ek(DOWN + 0.3, x, RY - 0.4, 90), ek(DOWN + 0.6, x, RY - 0.4, 90), ek(DOWN + 1.6, x, RY - 0.4, 90, 0)]; }
  else { const w = wakeAt[i], [gx, gy] = goal[i], h = Math.atan2(gy - RY, gx - x) * 180 / Math.PI;
    c.push(R({ from: w, action: "turn" }), R({ from: w + 0.45, action: "walk", loop: true }));
    keys = [ek(0, x, RY, 90), ek(w, x, RY, 90), ek(w + 0.45, x, RY, h), ek(DUR, gx, gy, h)]; }
  mobs.push({ id, species: "inmate", track: { interp: "linear", keys } }); sprites[id] = sp(c);
});
const mh = Math.atan2(RY - 1.2, 12 - 9.4) * 180 / Math.PI;
const tl = {
  scene: "../scene/deathrow.json", plates, feedLabel: "SPRITE LIBRARY // RESIDENTS TEST", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: { B: op([[0, 3.2, 0.4, -40], [2.0, 5.5, -1.25, -55], [DUR, 5.5, -1.25, -55]]), E: op([[0, 2.4, 1.0, 0], [5.6, 12, -0.85, -10], [6.0, 12, -0.85, 0], [DOWN, 12, -0.85, 0], [DOWN + 1.2, 11.2, 0.9, 150], [DUR, 11.2, 0.9, 150]]),
    D: op([[0, 2.0, 1.6, 0], [5.0, 9.4, 1.2, 0], [5.6, 9.4, 1.2, mh], [DUR, 9.4, 1.2, mh]]), A: op([[0, ...OFF, 0]]), C: op([[0, ...OFF, 0]]) },
  operatorIds: { A: "KNOX", B: "HOUND", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [ek(0, 17.6, 1.4, 180), ek(DUR, 17.6, 1.4, 180)] }, mobs,
  sprites: { ...sprites,
    B: { dir: L + "hound", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 2.0, action: "idle", loop: true }, { from: CHOP, action: "chop" }, { from: CHOP + 0.875, action: "idle", loop: true }] },
    E: { dir: L + "cole", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 6.0, action: "kneel" }, { from: DOWN, action: "run", loop: true }, { from: DOWN + 1.2, action: "aim", loop: true }] },
    D: { dir: L + "miller", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 5.0, action: "idle", loop: true }, { from: WAKE + 0.5, action: "aim", loop: true }, { from: SHOT - 0.04, action: "shoot" }, { from: SHOT + 0.58, action: "aim", loop: true }] },
    ENTITY: { dir: L + "prisoner", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "idle", loop: true }] } },
  fire: [0, 1, 2].map(k => ({ t: SHOT + k * 0.125, who: "MILLER", kind: "rifle", at: P(12, RY + 0.3) })),
  flashes: [{ t: CHOP + HIT, who: "R1" }, ...[0, 1, 2].map(k => ({ t: SHOT + k * 0.125 + 0.03, who: "R4" }))],
  extraCues: [{ type: "oneshot", t: CHOP + HIT - 0.12, sample: "axe", vary: 60 }],
  camera: [[0, ...P(10.4, 0), 1.62], [DUR, ...P(10.4, 0), 1.62]],
  subtitles: [{ from: 0.2, to: 4.4, who: "TEST", text: "unnoticed: dim.  HOUND puts one down before it wakes" }, { from: 4.6, to: WAKE, who: "TEST", text: "COLE steps in front of one" },
    { from: WAKE, to: DOWN + 0.2, who: "TEST", text: "roused: bright.  MILLER fires" }, { from: DOWN + 0.3, to: DUR - 0.2, who: "TEST", text: "the rousing spreads down the line   (far right: the main threat, for comparison)" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_minion_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_minion_demo.json");
