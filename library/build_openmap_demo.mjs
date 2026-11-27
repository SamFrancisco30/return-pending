// Scale check for the open death-row layout: the squad and the prisoner standing on it, nothing happening. Not story.
//   node library/build_openmap_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
const M = 64, X0 = 400, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 2, L = "../library/characters/";
const scene = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow_open;
const still = (x, y, h) => ({ interp: "linear", keys: [[0, ...P(x, y), h], [DUR, ...P(x, y), h]] });
const sp = (dir, action) => ({ dir: L + dir, pxPerM: M, scale: 1.3, clips: [{ from: 0, action, loop: true }] });
const tl = {
  scene: "../scene/deathrow_open.json", plates, feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // DEATH ROW // SRS", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:17:36", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: { GATE: [[0, 1]], CELL: [[0, 0]] }, explored: ["CELL"],
  operators: { A: still(8.2, 0.2, 0), B: still(4.5, -2.6, 10), C: still(3.6, 2.4, -10), D: still(11.0, -1.2, 10), E: still(12.2, 0.6, 0) },
  operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [[0, ...P(21.9, 0), 180, 1, 0, 1, 0, 0, 0], [DUR, ...P(21.9, 0), 180, 1, 0, 1, 0, 0, 0]] },
  sprites: { A: sp("knox", "guard"), B: sp("fuse", "aim"), C: sp("reyes", "aim"), D: sp("miller", "aim"), E: sp("cole", "kneel"), ENTITY: sp("prisoner", "sit") },
  props: [{ kind: "body", from: 0, to: DUR, track: [[0, ...P(13.0, 0.9), 200], [DUR, ...P(13.0, 0.9), 200]] }],
  pulse: { t0: -3.2, period: 20, speed: 4.5 * M, maxR: 30 * M, zone: scene.blockZone, hits: [] },
  camera: [[0, 1024, 576, 1.0], [0.9, 1024, 576, 1.0], [1.0, ...P(10, 0), 1.7], [DUR, ...P(10, 0), 1.7]],
};
fs.writeFileSync("library/timeline_openmap_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_openmap_demo.json");
