// FILE 001 · DEATH ROW — ACT 5 (the map part: after the door is shut), on the open map. Picks up where build_act4.mjs ends.
//   node episodes/file_001_deathrow/build_act5.mjs        (run from C:\Sam)
// Metres: x from the steel door into the hall (24 x 14, bars at 19.5), y across; the vestibule is x < 0.
// Seconds are from the start of this act. He is in the cell. The ripple leaves him at 9 and at 29 (act 4's 50 and 70).
//
//   0     Outside the shut door. COLE goes to MILLER. He is gone.
//   9     The ripple leaves him. Nobody is in reach: they let it cross the hall and die on the door (13.4).
//   13.5  Sixteen seconds until the next one. Door open; KNOX and FUSE run in, no weapons up, and carry out the last of Team 04.
//         REYES covers from the door jamb; COLE is on the button. KNOX takes the end nearer the cell.
//   28    Out, door shut. The next ripple leaves at 29 and finds a door.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";
const M = 64, X0 = 400, YC = 576, L = "../library/characters/", SCALE = 1.15;
const P = (x, y) => [X0 + x * M, YC + y * M];
const RIPPLE = 4.5, DUR = 34, E1 = 9, E2 = 29, CARRY = 1.8;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const face = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
// ---- where act 4 left them
const KNOX0 = [-1.8, 1.0], FUSE0 = [-1.55, 2.2], REYES0 = [-1.2, -1.6], COLE0 = [-4.0, 0.0], MILLER = [-3.28, -1.54], MILLER_H = 210.5, BOSS = [19.95, 0], BODY = [13.0, 0.9];
// ---- places
const PANEL = [-1.55, 2.2], BY_MILLER = [-3.35, -0.55], REYES_JAMB = [-1.1, -0.85], KNOX_READY = [-1.2, 0.25], FUSE_READY = [-2.6, 0.2];
const T_DEAD = 6.2, T_LAND = E1 + dist(BOSS, [0, 0]) / RIPPLE, T_OPEN = 13.5, T_GO = 13.9;
const K_END = [BODY[0] + 1.05, BODY[1] + 0.1], F_END = [BODY[0] - 1.05, BODY[1] - 0.1], T_AT = 18.2, T_LIFT = 19.4;      // KNOX takes the end nearer the cell, FUSE the end nearer the door
const OUT = [-2.4, 0.45], VIA = [0.3, 0.35], T_DOOR = T_LIFT + dist(BODY, VIA) / CARRY, T_OUT = T_DOOR + dist(VIA, OUT) / CARRY;
const bodyAt = t => { if (t <= T_LIFT) return BODY; if (t <= T_DOOR) { const u = (t - T_LIFT) / (T_DOOR - T_LIFT); return [BODY[0] + (VIA[0] - BODY[0]) * u, BODY[1] + (VIA[1] - BODY[1]) * u]; } const u = Math.min(1, (t - T_DOOR) / (T_OUT - T_DOOR)); return [VIA[0] + (OUT[0] - VIA[0]) * u, VIA[1] + (OUT[1] - VIA[1]) * u]; };
const T_KNOX_OUT = T_DOOR + (VIA[0] + 1.05 + 0.1) / CARRY, T_PRESS2 = T_KNOX_OUT + 0.1, T_SHUT = T_PRESS2 + 0.8;      // the button goes in as KNOX, the last man, clears the sill
const carryKeys = (dx) => [T_LIFT, T_DOOR, T_OUT].map(t => [t, bodyAt(t)[0] + dx, bodyAt(t)[1] + (dx > 0 ? 0.1 : -0.1) * (t === T_LIFT ? 1 : 0), 180]);

const tracks = {
  A: [[0, ...KNOX0, 0], [6.4, ...KNOX0, 0], [7.2, ...KNOX_READY, 0], [T_GO, ...KNOX_READY, 0], [T_GO + 0.5, 0.4, 0.3, 0], [T_AT - 0.5, 13.4, 2.1, 0], [T_AT, ...K_END, 180], ...carryKeys(1.05), [T_OUT + 0.4, OUT[0] + 1.05, OUT[1], 0], [DUR, OUT[0] + 1.05, OUT[1], 0]],
  B: [[0, ...FUSE0, -30], [7.6, ...FUSE0, -30], [8.8, ...FUSE_READY, -20], [T_GO + 0.3, ...FUSE_READY, -20], [T_GO + 1.0, 0.4, 0.45, 0], [T_AT, ...F_END, 0], [T_LIFT - 0.3, ...F_END, 0], ...carryKeys(-1.05), [DUR, OUT[0] - 1.05, OUT[1], 180]],
  C: [[0, ...REYES0, 0], [7.2, ...REYES0, 0], [8.2, ...REYES_JAMB, 0], [DUR, ...REYES_JAMB, 0]],
  D: [[0, ...MILLER, MILLER_H], [DUR, ...MILLER, MILLER_H]],
  E: [[0, ...COLE0, 180], [0.4, ...COLE0, 180], [1.4, ...BY_MILLER, face(BY_MILLER, MILLER)], [7.6, ...BY_MILLER, face(BY_MILLER, MILLER)], [8.5, -4.0, 1.0, 60], [9.9, ...PANEL, -30], [DUR, ...PANEL, -30]],
};
const at = (id, t) => { const k = tracks[id]; if (t <= k[0][0]) return [k[0][1], k[0][2]]; for (let i = 1; i < k.length; i++) if (k[i][0] >= t) { const a = k[i - 1], b = k[i], u = (t - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } return [k.at(-1)[1], k.at(-1)[2]]; };
// ---- him: at the bars, watching the door. He tries them when they come in, and again when they leave.
const Em = [[0, ...BOSS, 180], [DUR, ...BOSS, 180]], PUNCH = [16.4, 17.6, 22.0, 24.2, 30.6, 32.0];
const impacts = PUNCH.map(t => ({ t: t + 0.5, x: P(19.6, 0)[0], y: P(19.6, 0)[1], r: 80, kind: "door" }));

function clipsFor(keys, base, extra = []) {
  const segs = [];
  for (let i = 0; i + 1 < keys.length; i++) { const a = keys[i], b = keys[i + 1], dt = b[0] - a[0]; if (dt < 0.01) continue;
    const v = dist([a[1], a[2]], [b[1], b[2]]) / dt, act = v > 2.6 ? base.run : v > 0.25 ? base.walk : base.idle; if (!segs.length || segs.at(-1).action !== act) segs.push({ from: a[0], action: act, loop: true }); }
  const baseAt = t => { let c = segs[0]; for (const s of segs) if (s.from <= t) c = s; return c; };
  const times = [...new Set([...segs.map(s => s.from), ...extra.flatMap(x => [x.from, x.to])])].sort((a, b) => a - b), out = [];
  for (const t of times) { const ov = extra.filter(x => x.from <= t && t < x.to).at(-1); const c = ov ? { from: ov.from === t ? t : null, action: ov.action, loop: !!ov.loop } : { ...baseAt(t), from: t };
    if (!out.length || out.at(-1).action !== c.action || ov?.from === t) out.push({ from: t, action: c.action, ...(c.loop ? { loop: true } : {}) }); }
  return out;
}
const once = (t, action, len) => ({ from: t, to: t + len, action }), hold = (from, to, action) => ({ from, to, action, loop: true });
const B3 = { idle: "idle", walk: "walk", run: "run" }, sp = (dir, clips) => ({ dir: L + dir, pxPerM: M, scale: SCALE, clips });
const sprites = {
  A: sp("knox", clipsFor(tracks.A, B3, [hold(0, 6.4, "aim")])),
  B: sp("fuse", clipsFor(tracks.B, B3, [hold(T_AT, T_LIFT - 0.3, "crouch"), hold(T_LIFT - 0.3, T_OUT, "carry")])),
  C: sp("reyes", clipsFor(tracks.C, B3, [hold(0, 7.2, "aim"), hold(8.2, DUR, "snipe_aim")])),
  D: sp("miller", [{ from: -10, action: "death" }]),
  E: sp("cole", clipsFor(tracks.E, B3, [hold(1.4, 7.6, "kneel")])),
  ENTITY: sp("prisoner", clipsFor(Em, { idle: "idle", walk: "walk", run: "run" }, PUNCH.map(t => once(t, "punch", 1.0)))),
  T04: { dir: L + "t04", pxPerM: M, scale: SCALE, clips: [{ from: 9999, action: "lying" }] },
};
const scene = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow_open;
const cam = (t, x, y, z) => [t, ...P(x, y), z], WIDE = [1100, 576, 1.0];
const bodyKeys = [0, T_LIFT, T_DOOR, T_OUT, DUR].map(t => [t, ...P(...bodyAt(t)), 8, 0.95, 0, 1, 0, 0, 0]);
const tl = {
  _note: "generated by episodes/file_001_deathrow/build_act5.mjs", scene: "../scene/deathrow_open.json", plates,
  feedLabel: "FILE 001 // GREYROCK ISLAND PENITENTIARY // DEATH ROW // SRS", entityId: "UNK-01", species: "prisoner",
  duration: DUR, fps: 30, clockStart: "02:18:51", shots: [{ from: 0, to: DUR, type: "map" }],
  doors: { GATE: [[0, 0], [T_OPEN, 0], [T_OPEN + 0.8, 1], [T_PRESS2, 1], [T_SHUT, 0], [DUR, 0]], CELL: [[0, 0]] }, explored: ["CELL"],
  operators: Object.fromEntries(Object.entries(tracks).map(([id, k]) => [id, { interp: "linear", keys: k.map(([t, x, y, h]) => [t, ...P(x, y), h]) }])),
  operatorIds: { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" }, down: { D: T_DEAD },
  entity: { interp: "linear", keys: Em.map(k => [k[0], ...P(k[1], k[2]), k[3], 1, 0, 1, 0, 0, 0]) },
  sprites, fire: [], flashes: [], impacts,
  mobs: [{ id: "T04", species: "inmate", track: { interp: "linear", keys: bodyKeys } }],
  pulse: { t0: E1 - 20, period: 20, speed: RIPPLE * M, maxR: 30 * M, zone: scene.blockZone, alertFrom: 20, hits: [] },
  props: [{ kind: "stain", from: 0, to: DUR, x: P(BODY[0] + 0.15, BODY[1])[0], y: P(BODY[0] + 0.15, BODY[1])[1], r: 40, w: 11, trail: [[18.2, 0.1], [17.0, 0.5], [15.6, 0.3], [14.4, 0.8], [13.6, 0.9]].map(q => P(...q)) },
    { kind: "rubble", from: 0, to: DUR, x: P(16, 3.6)[0], y: P(16, 3.6)[1], size: 62 },
    { kind: "panel", from: 0, to: DUR, x: P(-0.74, 1.75)[0], y: P(-0.74, 1.75)[1], presses: [-30, T_OPEN, T_PRESS2] }],
  events: [],
  unitTags: [{ who: "MILLER", from: 0, to: T_DEAD, text: "MILLER // CRITICAL" }, { who: "MILLER", from: T_DEAD, to: DUR, text: "MILLER // DECEASED" }],
  camera: [cam(0, -1.4, 0, 2.1), cam(7.4, -1.4, 0, 2.1), [9.4, ...WIDE], [T_LAND - 0.6, ...WIDE], cam(T_OPEN + 0.3, 1.0, 0.3, 1.5), cam(T_GO + 1.2, 3.0, 0.5, 1.4), cam(T_AT - 0.4, 12.4, 0.9, 1.5), cam(T_LIFT, 13.0, 0.8, 1.8), cam(T_LIFT + 1.5, 12.0, 0.7, 1.6),
    cam(T_DOOR - 1.5, 3.4, 0.4, 1.45), cam(T_OUT, -0.6, 0.3, 1.8), cam(E2 - 0.2, -0.6, 0.3, 1.8), [E2 + 1.6, ...WIDE], [DUR, ...WIDE]],
  warn: [{ from: T_LAND, to: T_LAND + 2.6, text: "PULSE  //  NO CONTACT  //  STOPPED AT DOOR" }, { from: T_SHUT + 0.2, to: DUR, text: "DOOR SHUT  //  UNK-01 IN CELL  //  ALL RECOVERED" }],
  subtitles: [
    { from: 0.3, to: 1.4, who: "KNOX", text: "Cole. Miller." },
    { from: 5.4, to: 6.8, who: "COLE", text: "...He's gone." },
    { from: 7.2, to: 9.0, who: "KNOX", text: "Copy. One more to bring out. Cole, the door." },
    { from: 9.3, to: 11.0, who: "REYES", text: "Pulse. Let it hit the door first." },
    { from: 11.3, to: 13.2, who: "DISPATCH", text: "Nobody in reach. Next one in sixteen seconds." },
    { from: T_OPEN, to: T_OPEN + 0.8, who: "KNOX", text: "Go." },
    { from: T_AT + 0.1, to: T_AT + 1.2, who: "FUSE", text: "Got him. Lift." },
    { from: 21.0, to: 22.0, who: "DISPATCH", text: "Eight seconds." },
    { from: 24.0, to: 25.0, who: "DISPATCH", text: "Five." },
    { from: T_KNOX_OUT - 0.5, to: T_KNOX_OUT + 0.4, who: "KNOX", text: "Shut it!" },
    { from: T_SHUT + 0.2, to: T_SHUT + 1.0, who: "COLE", text: "Shut." },
    { from: 30.4, to: 33.2, who: "DISPATCH", text: "Recovery Team Four, all accounted for. Bring them home." },
  ],
};
addSound(tl, { ambience: "garage" });
fs.writeFileSync("episodes/file_001_deathrow/timeline_act5.json", JSON.stringify(tl));

// ---- checks
const NAME = { A: "KNOX", B: "FUSE", C: "REYES", D: "MILLER", E: "COLE" }; let bad = 0;
const say = (ok, s) => { console.log(`  [${ok ? "OK" : "FAIL"}] ${s}`); if (!ok) bad++; };
const gateOpen = t => { const k = tl.doors.GATE; let v = k[0][1]; for (const q of k) if (q[0] <= t) v = q[1]; return v > 0.5; };
for (const E of [E1, E2]) say(!gateOpen(E) && Object.keys(tracks).every(id => at(id, E)[0] < 0), `ripple at ${E} s: door shut, everyone outside: it finds nobody`);
say(T_OPEN >= T_LAND, `the door opens at ${T_OPEN} s, after the ripple has died on it at ${T_LAND.toFixed(1)} s`);
say(T_SHUT + 0.5 <= E2, `in and out in ${(T_SHUT - T_OPEN).toFixed(1)} s: the door is shut at ${T_SHUT.toFixed(1)} s, ${(E2 - T_SHUT).toFixed(1)} s before the next ripple`);
say(at("A", T_PRESS2)[0] < 0 && at("B", T_PRESS2)[0] < 0 && bodyAt(T_PRESS2)[0] < 0, "both carriers and the body are through the door when COLE presses the button");
let gap = [99]; const ids = Object.keys(tracks).filter(id => id !== "D");
for (let t = 0; t <= DUR; t += 0.25) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const g = dist(at(ids[i], t), at(ids[j], t)); if (g < gap[0]) gap = [g, NAME[ids[i]], NAME[ids[j]], t]; }
say(gap[0] >= 1.0, `closest any two of the squad come: ${gap[1]} and ${gap[2]}, ${gap[0].toFixed(1)} m at ${gap[3]} s`);
let inP = null; for (let t = 0; t <= DUR; t += 0.25) for (const id of ids) for (const q of scene.places.pillars) { const p = at(id, t); if (!(q[0] === 16 && q[1] === 3.6) && Math.abs(p[0] - q[0]) < 0.6 && Math.abs(p[1] - q[1]) < 0.6) inP = [NAME[id], t]; }
say(!inP, inP ? `${inP[0]} is standing in a column at ${inP[1]} s` : "nobody ever stands in a column");
console.log(bad ? `${bad} FAIL` : "all checks pass"); if (bad) process.exitCode = 1;
