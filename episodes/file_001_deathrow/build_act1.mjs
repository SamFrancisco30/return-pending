// FILE 001, act 1 after the case card: the flight in and the approach, seen from high altitude (about 34 s).
//   node episodes/file_001_deathrow/build_act1.mjs        (run from C:\Sam)
//
// The plot in plain words:
//   Open sea at night, nothing in sight. The transport flies low and fast, the view travelling with it. A beat of rotor noise, then
//   DISPATCH clears them in. MILLER needles the new one, REYES, and her answer starts the talk that tells us where they are going
//   and why: a prison sealed nine years and still running, with whoever was inside; a recovery team of four that went in a week ago
//   and has not called. As FUSE counts them, Team 04's four grey name plates come up. KNOX ends it: there it is. Only then does the
//   shore slide into the picture. We never see the whole island, only its west side: cliffs, a parade ground, and the cellhouse on
//   the ridge, with the land running on past the edges of the picture. Roofs are on; nothing inside can be seen.
//   The transport crosses the shore and sets down on the old parade ground. DISPATCH adds the one thing nobody understands, and the
//   view closes on the isolation block at the end of the cellhouse: a ring goes out under its roof, stops at its walls, and a count
//   to the next one starts.
//   The view comes back to the parade ground. Five blips leave the transport in single file, KNOX first, COLE last, and go in at the
//   west door of the cellhouse. REYES asks the question the episode answers.
// Places are plate pixels (2048 x 1152, about 5 px to a metre), measured on the plate in use. The plate has sea only down its left
// side; the sea leg runs off it to the west over open water that the renderer draws there. The view must never pass the plate's
// top, right or bottom edge, where the land simply stops.
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";
import { PORTRAITS, withFaces } from "./cast_ui.mjs";

const PLATE = process.env.ISLAND_PLATE ?? "island3_plate_b";
const PLACES = {
  island3_plate_b: { pad: [691, 632], entry: [1067, 453], via: [[980, 520]], cell: [1830, 472], deep: [1517, 373, 1883, 571], deepTag: [1700, 375], nameTag: [1075, 376], shoreW: 240 },
  island2_plate_a: { pad: [512, 568], entry: [853, 459], via: [[640, 585], [790, 505]], cell: [1380, 462], deep: [1165, 395, 1416, 528], deepTag: [1290, 397], nameTag: [860, 405], shoreW: 216 },
}[PLATE];
const D = 41.2, FPS = 30, PXM = 5;
const scene = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow_open;
const smooth = u => u * u * (3 - 2 * u), lerp = (a, b, u) => a + (b - a) * u, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const dense = (t0, t1, f, step = 0.1) => { const k = []; for (let t = t0; t < t1 - 1e-6; t += step) k.push([+t.toFixed(3), ...f((t - t0) / (t1 - t0))]); k.push([t1, ...f(1)]); return k; };
const posAt = (keys, t) => { if (t <= keys[0][0]) return keys[0].slice(1); for (let i = 1; i < keys.length; i++) if (keys[i][0] >= t) { const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, j) => lerp(v, b[j + 1], u)); } return keys.at(-1).slice(1); };

// ---- the transport: level and fast over the water, then a slowing curve over the shore to the pad ----
const T_COAST = 22.1, T_LAND = 25.3, CRUISE = 190;                     // px/s over the sea (about 60 m/s)
const COAST = [PLACES.shoreW - 60, 665], START = [COAST[0] - CRUISE * T_COAST, COAST[1] + 40];
const Bz = [COAST, [COAST[0] + CRUISE * 1.2, COAST[1] - 8], [PLACES.pad[0] - 130, PLACES.pad[1] + 40], PLACES.pad];
const bez = u => [0, 1].map(j => (1 - u) ** 3 * Bz[0][j] + 3 * (1 - u) ** 2 * u * Bz[1][j] + 3 * (1 - u) * u * u * Bz[2][j] + u ** 3 * Bz[3][j]);
const heliKeys = [...dense(0, T_COAST, u => [0, 1].map(j => lerp(START[j], COAST[j], u))), ...dense(T_COAST, T_LAND, u => bez(1 - (1 - u) ** 2.2)).slice(1)];
const hEnd = bez(1), hPrev = bez(0.96), heading = Math.atan2(hEnd[1] - hPrev[1], hEnd[0] - hPrev[0]);

// ---- camera: with the transport over the sea, then the whole island, then the isolation block, then the parade ground ----
const T_REVEAL = 18.3, T_WIDE = 22.1, T_PUSH = 24.3, T_DEEP = 26.7, T_BACK = 30.4, T_PAD = 32.4, ZSEA = 1.55, ZSEA0 = 1.8;
const lead = t => { const p = posAt(heliKeys, t); return [p[0] + 240, p[1] - 90]; };      // the transport sits left of centre, flying into the frame
const CAMK = [[T_WIDE, 1024, 576, 1.0], [T_PUSH, 1030, 576, 1.05], [T_DEEP, 1560, 472, 2.1], [T_BACK, 1575, 472, 2.18], [T_PAD, 880, 545, 2.15], [D, 890, 540, 2.28]];
const camera = [...dense(0, T_REVEAL, u => [...lead(u * T_REVEAL), lerp(ZSEA0, ZSEA, smooth(u))]),
  ...dense(T_REVEAL, T_WIDE, u => { const s = smooth(u), l = lead(T_REVEAL + u * (T_WIDE - T_REVEAL)); const z = lerp(ZSEA, 1.0, s); return [Math.min(lerp(l[0], 1024, s), l[0] - 240 + 1024 / z - 130), lerp(l[1], 576, s), z]; }).slice(1)];
for (let i = 1; i < CAMK.length; i++) { const a = CAMK[i - 1], b = CAMK[i]; camera.push(...dense(a[0], b[0], u => [1, 2, 3].map(j => lerp(a[j], b[j], smooth(u)))).slice(1)); }
const viewAt = t => { const [cx, cy, z] = posAt(camera, t); return [cx - 1024 / z, cy - 576 / z, cx + 1024 / z, cy + 576 / z]; };
const inView = (p, t, m = 30) => { const v = viewAt(t); return p[0] > v[0] + m && p[0] < v[2] - m && p[1] > v[1] + m && p[1] < v[3] - m; };

// ---- the squad: single file from the pad to the west door, KNOX first ----
const T_GO = 31.0, GAP = 0.8, SPEED = 70, ORDER = ["A", "B", "C", "D", "E"];
const ROUTE = [PLACES.pad, ...PLACES.via, PLACES.entry], LEG = ROUTE.slice(1).map((p, i) => dist(ROUTE[i], p)), LEN = LEG.reduce((a, b) => a + b, 0);
const along = s => { let i = 0; while (i < LEG.length - 1 && s > LEG[i]) s -= LEG[i++]; return [0, 1].map(j => lerp(ROUTE[i][j], ROUTE[i + 1][j], Math.min(1, s / LEG[i]))); };
const squad = Object.fromEntries(ORDER.map((id, i) => { const t0 = T_GO + i * GAP; return [id, dense(t0, +(t0 + LEN / SPEED).toFixed(2), u => along(u * LEN))]; }));

// ---- the signal ----
const T_RING = 26.5, ripple = { times: [T_RING], period: 20, speed: 100, life: 3.8, x: PLACES.cell[0], y: PLACES.cell[1], clip: PLACES.deep, outlineFrom: 25.5 };

// ---- words ----
const subtitles = [
  { from: 1.6, to: 3.9, who: "DISPATCH", text: "Transport, you're cleared in to Greyrock." },
  { from: 4.4, to: 5.6, who: "MILLER", text: "First Lapse, Reyes?" },
  { from: 5.9, to: 9.3, who: "REYES", text: "First one. They said it's been sealed nine years." },
  { from: 9.6, to: 12.6, who: "MILLER", text: "Still running, too. Guards, inmates, whoever was inside." },
  { from: 13.0, to: 14.2, who: "REYES", text: "And Team 04?" },
  { from: 14.6, to: 17.6, who: "FUSE", text: "Four went in. Seven days, and nobody's called." },
  { from: 17.9, to: 20.5, who: "KNOX", text: "That's why we're here. There it is." },
  { from: 23.0, to: 28.2, who: "DISPATCH", text: "One more thing. A signal in the deep block, every twenty seconds. Source unknown." },
  { from: 30.6, to: 32.5, who: "REYES", text: "And if they're still alive?" },
  { from: 32.8, to: 34.7, who: "DISPATCH", text: "Then you bring them home." },
  { from: 35.1, to: 38.1, who: "MILLER", text: "Mask sealed, Reyes. I'm not carrying you back." },
];
const FUSE_LINE = subtitles[5], KNOX_LINE = subtitles[6], SIGNAL_LINE = subtitles[7];
const T04 = [14.8, 15.4, 16.0, 16.6];

const tl = {
  scene: "../scene/deathrow_open.json", plates, feedLabel: "SRS // HIGH ALTITUDE // TRANSPORT TRACK", entityId: "UNK-01", species: "prisoner", duration: D, fps: FPS, clockStart: "02:16:36",
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: [], operators: {}, operatorIds: {},
  entity: { interp: "linear", keys: [[0, -900, -900, 0, 0, 0, 0, 0, 0, 0], [D, -900, -900, 0, 0, 0, 0, 0, 0, 0]] },
  camera: [[0, 1024, 576, 1.05], [D, 1024, 576, 1.05]],
  shots: [{ from: 0, to: D, type: "aerial" }],
  aerial: {
    plate: `../concepts/${PLATE}.png`, sea: "../concepts/sea_tile.png", feather: ["left"], grid: "GREYROCK ISLAND", pxPerM: PXM, aboard: true, camera,
    heli: { keys: heliKeys, land: T_LAND, heading, pad: PLACES.pad, tagIn: "TRANSPORT // 5 ABOARD", tagDown: "TRANSPORT // ON PAD", tagTo: 24.3 },
    squad, ripple,
    plates04: { from: 14.3, to: 23.7, title: "RECOVERY TEAM 04  //  DAY 7", rows: T04.map((t, i) => ({ t, id: `T04-${i + 1}`, text: "RETURN PENDING" })) },
    labels: [
      { x: PLACES.nameTag[0], y: PLACES.nameTag[1], text: "GREYROCK ISLAND PENITENTIARY", from: 21.5, to: 24.3, side: 1 },
      { x: PLACES.deepTag[0], y: PLACES.deepTag[1], text: "DEEP BLOCK  //  PERIODIC SIGNAL", from: 25.9, to: 30.2, side: -1, color: "#9fd0ff" },
      { x: PLACES.entry[0], y: PLACES.entry[1], text: "CELLHOUSE  //  ENTRY", from: 32.6, to: 40.6, side: 1 },
    ],
  },
  subtitles: withFaces(subtitles), portraits: PORTRAITS,
  extraSamples: { ambience: "../audio/sfx/f001/amb_sea.wav", heli: "../audio/sfx/f001/heli_approach.wav", heli_cruise: "../audio/sfx/f001/heli_cruise.wav" },
  extraCues: [
    { type: "oneshot", t: 0.0, sample: "heli_cruise", gain: 0.7 },
    { type: "oneshot", t: T_LAND - 6.5, sample: "heli", gain: 1.1, pan: -0.4 },
    ...T04.map(t => ({ type: "oneshot", t, sample: "beacon_chirp", gain: 0.5 })),
    { type: "oneshot", t: T_RING, sample: "pulse" },
  ],
};
addSound(tl, { ambience: "garage" });

// ---------------- checks ----------------
let bad = 0; const ok = (c, msg) => { console.log(c ? "[OK]  " : "[FAIL]", msg); if (!c) bad++; };
{ let worst = 0; for (const s of subtitles) worst = Math.max(worst, s.text.split(/\s+/).length / 2.7 - (s.to - s.from)); ok(worst <= 0.05, `every line fits its window at 2.7 words a second (worst is ${worst.toFixed(2)} s over)`); }
ok(subtitles.every((s, i) => i === 0 || s.from >= subtitles[i - 1].to + 0.2), "lines do not overlap");
{ let o = true; for (let t = 0; t <= T_PUSH; t += 0.1) if (!inView(posAt(heliKeys, t), t, 60)) o = false; const dp = dist(posAt(heliKeys, T_PUSH), PLACES.pad); ok(o && dp < 80, `the transport is in the picture all the way in (${o}), and over the pad before the view leaves it (${dp.toFixed(0)} px off)`); }
{ let seen = null; for (let t = 0; t <= T_WIDE; t += 0.1) if (viewAt(t)[2] > PLACES.shoreW && seen === null) seen = t; ok(seen !== null && seen >= FUSE_LINE.to - 0.5 && seen <= KNOX_LINE.to, `the island first shows at ${seen?.toFixed(1)} s: not before the talk is done, and while KNOX says they are close`); }
{ let o = true; for (let t = 0; t <= D; t += 0.1) { const v = viewAt(t); if (v[2] > 2048.5 || (v[2] > 0 && (v[1] < -0.5 || v[3] > 1152.5))) o = false; } ok(o, "the view never passes the top, right or bottom edge of the plate: only the west shore is ever shown"); }
ok(dist(heliKeys.at(-1).slice(1), PLACES.pad) < 2 && T_LAND < T_GO - 2, `the transport is on the pad at ${T_LAND} s, well before anyone leaves it (${T_GO} s)`);
ok(T04[0] >= FUSE_LINE.from && T04.at(-1) < FUSE_LINE.to, "the four Team 04 plates light while FUSE counts them");
{ const [x0, y0, x1, y1] = ripple.clip, corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]; let o = true; for (let t = T_RING; t <= T_RING + ripple.life; t += 0.1) for (const c of corners) if (!inView(c, t, 10)) o = false; ok(o, "the whole deep block is in the picture while the ring crosses it"); }
{ const reach = Math.max(ripple.x - ripple.clip[0], ripple.clip[2] - ripple.x); ok(reach / ripple.speed < ripple.life - 0.4, `the ring reaches the far wall (${(reach / ripple.speed).toFixed(1)} s) before it fades (${ripple.life} s)`); }
ok(T_RING > SIGNAL_LINE.from + 1.5 && T_RING < SIGNAL_LINE.to - 1, "the ring goes out while DISPATCH is talking about it");
ok(SPEED * GAP >= 40, `the file is spaced ${(SPEED * GAP).toFixed(0)} px apart`);
{ const last = squad.E.at(-1)[0]; ok(last <= D - 0.8, `COLE is through the door at ${last} s, ${(D - last).toFixed(1)} s before the cut`); }
{ let o = true; for (const keys of Object.values(squad)) for (const k of keys) if (k[0] >= T_PAD && !inView(k.slice(1), k[0])) o = false; ok(o, "once the view is back on the parade ground, every blip stays in the picture until it goes in"); }
ok(inView(PLACES.pad, T_PAD + 0.2) && inView(PLACES.entry, T_PAD + 0.2), "the pad and the door are both in the picture for the walk in");
if (bad) { console.log(bad, "check(s) failed"); process.exit(1); }
fs.writeFileSync("episodes/file_001_deathrow/timeline_act1.json", JSON.stringify(tl));
console.log("wrote timeline_act1", D, "s, all checks passed");
