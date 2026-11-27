// FILE 001 — the three short pieces around the action: the case card, the beacon replay, the recovery report.
//   node episodes/file_001_deathrow/build_cards.mjs        (run from C:\Sam)
import fs from "node:fs";
import { addSound } from "./sound_cues.mjs";

const M = 64, X0 = 400, YC = 576, P = (x, y) => [X0 + x * M, YC + y * M];
const plates = JSON.parse(fs.readFileSync("episodes/file_001_deathrow/plates.json", "utf8")).deathrow_open;
const scene = JSON.parse(fs.readFileSync("scene/deathrow_open.json", "utf8"));
const PALE = "rgba(214,234,238,0.95)", DIM = "rgba(150,180,186,0.75)", AMBER = "#ffc15a", ALERT = "#ff5a4a";
const base = (dur, label) => ({
  scene: "../scene/deathrow_open.json", plates, feedLabel: label, entityId: "UNK-01", species: "prisoner", duration: dur, fps: 30, clockStart: "02:16:30",
  doors: Object.fromEntries(scene.doors.map(d => [d.id, [[0, 0]]])), explored: ["CELL"], operators: {}, operatorIds: {},
  entity: { interp: "linear", keys: [[0, -900, -900, 0, 0, 0, 0, 0, 0, 0], [dur, -900, -900, 0, 0, 0, 0, 0, 0, 0]] },
  camera: [[0, 1024, 576, 1.05], [dur, 1024, 576, 1.05]],
});
const write = (name, tl) => { fs.writeFileSync(`episodes/file_001_deathrow/${name}.json`, JSON.stringify(tl)); console.log("wrote", name, tl.duration, "s"); };
const row = (label, text, o = {}) => ({ label, segs: [{ text, ...o }] });

// ---------------- 1. case card (6 s) ----------------
{
  const D = 6.2, tl = base(D, "FILE 001");
  tl.shots = [{ from: 0, to: D, type: "card", card: "case" }];
  tl.props = [{ kind: "beacon", from: 0, to: D, x: P(21.3, 1.3)[0], y: P(21.3, 1.3)[1] }];
  tl.cards = {
    program: "WAYFARER RECOVERY PROGRAM", file: "001", stampAt: 4.9,
    caseRows: [
      row("SITE", "GREYROCK ISLAND PENITENTIARY"),
      row("SITE STATUS", "SEALED 9 YEARS  //  LAPSE", { color: AMBER }),
      row("ASSIGNED", "RECOVERY TEAM 04  //  4 PERSONNEL"),
      row("LAST SIGNAL", "TEAM RELAY  //  LOST ON DAY 2 OF 7"),
      row("TASK", "RECOVER TEAM 04", { bold: true }),
    ],
  };
  tl.subtitles = [];                 // DISPATCH speaks over the approach that follows (build_act1.mjs)
  tl.extraCues = [{ type: "oneshot", t: 4.9, sample: "stamp" }];
  addSound(tl, { ambience: "garage", typing: [[0.5, 3.4]] });
  write("timeline_card", tl);
}

// ---------------- 2. beacon replay (15 s): what the fourth man of Team 04 went through ----------------
// The beacon logs only tagged personnel, so the prisoner is not on it: just one dot, thrown between the
// chamber and the hall every 20 seconds, crawling for the door each time and never getting there.
{
  const STEP = 0.9, T0 = 1.3, N = 12, D = 15.5, tl = base(D, "T04 BEACON // LOCAL LOG // x22");
  const K = [[0, 0.6, 0.2, 0], [T0, 2.6, 0.5, 0]];
  const reach = [9.6, 8.9, 8.0, 7.2, 6.3, 5.7];               // how far he gets toward the door on each try, shrinking
  let out = 0;
  for (let k = 0; k < N; k++) {
    const t = T0 + k * STEP;
    if (k % 2 === 0) { K.push([t + 0.001, 21.9, 0, 0], [t + 0.55 * STEP, 23.2, 0.3, 0], [t + STEP, 23.2, 0.3, 0]); }          // thrown into the chamber; backs to the far wall
    else {
      const far = 18.4 - reach[out++];
      K.push([t + 0.001, 18.4, 0, 180]);
      if (k === N - 1) K.push([t + 0.8, 13.2, 0.8, 180], [D, 13.0, 0.9, 180]);                                                           // the last time he stops where they found him
      else K.push([t + STEP, far, 0.25, 180]);
    }
  }
  const tEnd = T0 + (N - 1) * STEP + 0.8;
  tl.shots = [{ from: 0, to: D, type: "map" }];
  tl.operators = { F: { interp: "linear", keys: K.map(([t, x, y, h]) => [t, ...P(x, y), h]) } };
  tl.operatorIds = { F: "T04-4" };
  tl.down = { F: tEnd };
  tl.props = [{ kind: "beacon", from: T0 + 2 * STEP + 0.4, to: D, x: P(21.3, 1.3)[0], y: P(21.3, 1.3)[1] }];
  tl.unitTags = [{ who: "T04-4", from: 0.3, to: tEnd, text: "T04-4 // VITALS WEAK" }, { who: "T04-4", from: tEnd, to: D, text: "T04-4 // NO VITALS" }];
  tl.events = [{ from: T0 + 2 * STEP + 0.6, to: T0 + 5 * STEP, x: P(21.3, 1.3)[0], y: P(21.3, 1.3)[1] - 10, text: "BEACON DROPPED" }];
  tl.static = Array.from({ length: N }, (_, k) => [T0 + k * STEP + 0.02, 0.05]);
  tl.warn = [{ from: 0.2, to: tEnd, text: "LOCAL LOG  //  POSITION OF T04-4  //  EVERY 20 SECONDS" }, { from: tEnd + 0.3, to: D, text: "LOG ENDS  //  12 EXCHANGES  //  4 MIN 00 SEC" }];
  tl.clockStart = "21:14:07";
  tl.subtitles = [];
  tl.extraCues = [];                 // each jump is heard through tl.static (the feed-static sample), one sound per jump
  addSound(tl, { ambience: "garage" });
  write("timeline_replay", tl);
}

// ---------------- 3. personnel recovery report (13 s) ----------------
{
  const D = 13, tl = base(D, "FILE 001");
  const person = (cs, rank, status, color, icon, alert) => ({ label: "", segs: [{ text: cs.padEnd(8), color, bold: true, icon, iconColor: color }, { text: `RANK ${rank}   `, color: DIM }, { text: status, color: alert ? ALERT : PALE, bold: !!alert }] });
  tl.shots = [{ from: 0, to: D, type: "card", card: "report" }];
  tl.cards = {
    program: "WAYFARER RECOVERY PROGRAM", file: "001", site: "GREYROCK ISLAND PENITENTIARY",
    reportRows: [
      row("MISSION STATUS", "SUCCESS", { bold: true }),
      { ...person("KNOX", "A", "RETURNED", "#6fdcff", "tri"), label: "PERSONNEL" },
      person("FUSE", "B", "RETURNED", "#ffd23f", "circle"), person("REYES", "D", "RETURNED", "#b9a4ff", "diamond"),
      person("COLE", "C", "RETURNED", "#f2f6f7", "cross"), person("MILLER", "C", "DECEASED", "#f2f6f7", "square", true),
      row("RECOVERY TEAM 04", "4 OF 4 RECOVERED  //  DECEASED"),
      row("RECOVERED ITEMS", "TEAM 04 BEACON  //  LOCAL LOG INTACT"),
      row("NOT RECOVERED", "TRANSFER SHACKLES  //  UNCLASSIFIED  //  LEFT IN PLACE", { color: AMBER }),
    ],
  };
  tl.subtitles = [];
  addSound(tl, { ambience: "garage", typing: [[0.4, 4.4]] });
  write("timeline_report", tl);
}
