// FUSE test: the demolitions man. Machine gun in three bursts (one candidate sound each), two thrown charges and one planted (one candidate blast each). Not story.
//   node library/build_fuse_demo.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "../episodes/file_001_deathrow/sound_cues.mjs";
const M = 64, X0 = 300, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M], DUR = 20, L = "../library/characters/";
const scene = JSON.parse(fs.readFileSync("scene/deathrow.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow;
const OFF = [-40, 0], op = keys => ({ interp: "linear", keys: keys.map(([t, x, y, h]) => [t, ...P(x, y), h]) });
const ek = (t, x, y, h, v = 1) => [t, ...P(x, y), h, v, 0, 1, 0, 0, 0];
const roster = scene.roster.map(r => r.id === "B" ? { ...r, callsign: "FUSE", kit: "mg", build: 1.1, color: "#ffd23f", icon: "circle" } : r);
const mobs = [], sprites = {}, flashes = [], fire = [];
// a resident that walks in roused and is put down at tDown
function walker(id, t0, from, to, tDown) {
  const h = Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI, u = (tDown - t0) / (to[2] - t0), x = from[0] + (to[0] - from[0]) * u, y = from[1] + (to[1] - from[1]) * u;
  mobs.push({ id, species: "inmate", track: { interp: "linear", keys: [ek(0, from[0], from[1], h, 0), ek(t0, from[0], from[1], h, 0), ek(t0 + 0.3, from[0], from[1], h), ek(tDown, x, y, h), ek(tDown + 0.3, x + 0.7, y, h), ek(tDown + 0.8, x + 0.7, y, h), ek(tDown + 1.7, x + 0.7, y, h, 0)] } });
  sprites[id] = { dir: L + "resident", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: tDown, action: "down" }] }; flashes.push({ t: tDown, who: id }); return [x, y];
}
// one that stands unnoticed until a blast takes it
function stander(id, x, y, tDown, away) {
  mobs.push({ id, species: "inmate", track: { interp: "linear", keys: [ek(0, x, y, 180), ek(tDown, x, y, 180), ek(tDown + 0.3, x + away[0], y + away[1], 180), ek(tDown + 0.7, x + away[0], y + away[1], 180), ek(tDown + 1.6, x + away[0], y + away[1], 180, 0)] } });
  sprites[id] = { dir: L + "resident_dim", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "stand", loop: true }, { from: tDown, action: "down" }] }; flashes.push({ t: tDown, who: id });
}
const FX = 5.0, burst = (t, len, at, sample) => { for (let k = 0; k * (1 / 12) < len; k++) fire.push({ t: t + k / 12, who: "FUSE", kind: "rifle", at: P(...at) }); };
const B1 = 3.0, B2 = 5.2, T1 = 6.8, BL1 = 8.75, B3 = 10.0, T2 = 11.6, BL2 = 13.55, PL = 15.6, BL3 = 18.6, REL = 0.8;
const a1 = walker("W1", 0.6, [15.5, -0.6], [7, 0, 9], 3.45), a2 = walker("W2", 1.0, [16.5, 0.7], [7, 0, 10], 4.0), a3 = walker("W3", 2.2, [16.5, -0.2], [7, 0, 11], 5.8);
[[13.4, -1.6], [14.4, -1.9], [14.1, -0.8], [15.0, -1.2]].forEach(([x, y], i) => stander("S" + i, x, y, BL1, [(x - 14.2) * 0.9, (y - 1.35 * -1) * 0 + (y + 1.35) * 0.9]));
const a4 = walker("W4", 8.6, [16.5, 0.9], [7, 0.4, 16], 10.5), a5 = walker("W5", 10.2, [16, -0.4], [9, 0, 16.5], BL2), a6 = walker("W6", 10.5, [16.8, 0.5], [9, 0.3, 17], BL2);
burst(B1, 1.2, [12, 0]); burst(B2, 0.9, a3); burst(B3, 0.9, a4);
const C1 = [14.2, -1.35], C2 = [(a5[0] + a6[0]) / 2, (a5[1] + a6[1]) / 2], C3 = [8.6, 2.5];
const tl = {
  scene: "../scene/deathrow.json", plates, roster, feedLabel: "SPRITE LIBRARY // FUSE TEST", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "00:00:00", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"],
  operators: { B: op([[0, 2.2, 0, 0], [2.0, FX, 0, 0], [14.0, FX, 0, 0], [14.3, FX, 0, 35], [PL, 8.0, 2.0, 35], [PL + 0.9, 8.0, 2.0, 35], [PL + 1.2, 8.0, 2.0, 190], [PL + 2.6, 4.4, 0.6, 190], [PL + 2.9, 4.4, 0.6, 20], [DUR, 4.4, 0.6, 20]]),
    A: op([[0, ...OFF, 0]]), C: op([[0, ...OFF, 0]]), D: op([[0, ...OFF, 0]]), E: op([[0, ...OFF, 0]]) },
  operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" },
  entity: { interp: "linear", keys: [[0, -900, -900, 0, 0, 0, 1, 0, 0, 0], [DUR, -900, -900, 0, 0, 0, 1, 0, 0, 0]] }, mobs,
  sprites: { ...sprites, B: { dir: L + "fuse", pxPerM: M, scale: 1.3, clips: [{ from: 0, action: "walk", loop: true }, { from: 2.0, action: "aim", loop: true },
    { from: B1, action: "fire", loop: true }, { from: B1 + 1.2, action: "aim", loop: true }, { from: B2, action: "fire", loop: true }, { from: B2 + 0.9, action: "aim", loop: true },
    { from: T1, action: "throw" }, { from: T1 + 1.375, action: "aim", loop: true }, { from: B3, action: "fire", loop: true }, { from: B3 + 0.9, action: "aim", loop: true },
    { from: T2, action: "throw" }, { from: T2 + 1.375, action: "idle", loop: true }, { from: 14.3, action: "walk", loop: true }, { from: PL, action: "plant" }, { from: PL + 0.9, action: "run", loop: true }, { from: PL + 2.6, action: "crouch", loop: true }] } },
  fire, flashes,
  throws: [{ t0: T1 + REL, t1: BL1 - 0.45, from: P(FX + 0.6, -0.2), to: P(...C1) }, { t0: T2 + REL, t1: BL2 - 0.45, from: P(FX + 0.6, -0.2), to: P(...C2) }],
  charges: [{ from: BL1 - 0.45, to: BL1, x: P(...C1)[0], y: P(...C1)[1], rot: 0.5 }, { from: BL2 - 0.45, to: BL2, x: P(...C2)[0], y: P(...C2)[1], rot: -0.3 }, { from: PL + 0.6, to: BL3, x: P(...C3)[0], y: P(...C3)[1], rot: 0.2 }],
  blasts: [{ t: BL1, x: P(...C1)[0], y: P(...C1)[1], r: 150 }, { t: BL2, x: P(...C2)[0], y: P(...C2)[1], r: 150 }, { t: BL3, x: P(...C3)[0], y: P(...C3)[1], r: 115 }],
  camera: [[0, ...P(10.2, 0), 1.62], [DUR, ...P(10.2, 0), 1.62]],
  subtitles: [{ from: 0.2, to: 2.8, who: "TEST", text: "walk, machine gun carried" }, { from: B1, to: B2 - 0.2, who: "TEST", text: "machine gun, 1.2 s burst" }, { from: B2, to: T1 - 0.2, who: "TEST", text: "machine gun, 0.9 s burst" },
    { from: T1, to: B3 - 0.2, who: "TEST", text: "thrown charge  /  blast A" }, { from: B3, to: T2 - 0.2, who: "TEST", text: "machine gun" }, { from: T2, to: 14.2, who: "TEST", text: "thrown charge  /  blast B" },
    { from: 14.3, to: DUR - 0.2, who: "TEST", text: "planted charge, back off  /  blast C" }],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("library/timeline_fuse_demo.json", JSON.stringify(tl)); console.log("wrote library/timeline_fuse_demo.json");
