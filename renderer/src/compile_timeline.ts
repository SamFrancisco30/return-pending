// Timeline compiler: beats (plain-language staging) + episode.json (door events, dialogue, zones)
// + map geometry  ->  the low-level timeline JSON that animate.ts renders.
//
//   node src/compile_timeline.ts ../episodes/file_001/beats.txt ../episodes/file_001/timeline.json
//
// What it derives so nobody hand-writes keyframes:
//   operators   walking paths along the corridor, file formation, speeds, easing, headings
//   entity      zone jumps from unprompted door events (glitch + residue), look/reach/freeze
//   doors       swing animation per door event; claimed/held state track (doorFx)
//   HUD         door source tags, zone track, countdown (site rules), confidence, warnings
//   audio       subtitles + VO from dialogue, sfx cues from door events and shots
//   checks      who is at which door when, entity-operator proximity (contact review), overlaps
//
// Beats syntax (one per line, '#' comments; times m:ss or m:ss.s):
//   @episode PATH | @scene PATH | @plates xray=PATH real=PATH | @feed TEXT | @clock HH:MM:SS
//   @cast VANCE=A ODA=B REYES=C        @doormap 01=T1 ... EXIT=EXIT
//   @spot NAME=PLACE | NAME=PLACE      @start WHO=PLACE ...      @sample KEY=PATH ...
//   T  move WHO[,WHO..] to PLACE [walk|creep|run] [by T]   (several WHO = single file, first leads)
//   T  face WHO[,WHO..] to PLACE|WHO|DEG
//   T  fire WHO at PLACE
//   T-T entity look WHO   |   T-T entity reach toward WHO   |   T entity freeze SECONDS
//   T  camera follow WHO[,WHO..] [zoom Z]   |   T camera at PLACE [zoom Z]
//   T-T shot map [at=T] | bodycam WHO clip=PATH still=PATH [offset=S] | card NAME | black
//   T-T warn TEXT   |   T confidence N
//   T-T prop beacon|pack at PLACE      T-T tag TEXT at PLACE   (a map label, e.g. an item readout)
//   @site TEXT  @objective TEXT        (case card / recovery report)
//   T sfx NAME [gain=G] [pan=P]  |  T-T sfx typing     (one-shot sample from @sample / card typing ticks)
// Places: door NN (corridor side), doorway NN (just inside), room NN, corridor NN, EXIT (inside the
// exit), OUTSIDE (walkway), (x,y); any place may end with +(dx,dy).
import fs from "node:fs";
import path from "node:path";
import { loadScene, buildGeometry } from "./geometry.ts";

const [, , beatsPath, outPath] = process.argv;
const beatsDir = path.dirname(path.resolve(beatsPath));
const rel = (p: string) => path.relative(process.cwd(), path.resolve(beatsDir, p)).replaceAll("\\", "/");
const T = (s: string) => { const [m, sec] = s.split(":"); return Number(m) * 60 + Number(sec); };
const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const report: string[] = [];

// ---------------- parse beats ----------------
const dir: Record<string, string> = {};
const cmds: { t: number; t2?: number; verb: string; rest: string; line: number }[] = [];
fs.readFileSync(beatsPath, "utf8").split(/\r?\n/).forEach((raw, i) => {
  const line = raw.replace(/#.*$/, "").trim(); if (!line) return;
  if (line.startsWith("@")) { const k = line.split(/\s+/)[0].slice(1); dir[k] = line.slice(k.length + 1).trim(); return; }
  const m = line.match(/^(\d+:\d+(?:\.\d+)?)(?:-(\d+:\d+(?:\.\d+)?))?\s+(\S+)\s*(.*)$/);
  if (!m) throw new Error(`beats line ${i + 1}: cannot parse "${raw}"`);
  cmds.push({ t: T(m[1]), t2: m[2] ? T(m[2]) : undefined, verb: m[3], rest: m[4], line: i + 1 });
});
const kv = (s: string) => Object.fromEntries(s.split(/\s+/).filter(Boolean).map(p => p.split("=")));
const ep = JSON.parse(fs.readFileSync(path.resolve(beatsDir, dir.episode), "utf8"));
const scenePath = rel(dir.scene);
const scene = loadScene(scenePath);
const geo = buildGeometry(scene);
const cast: Record<string, string> = kv(dir.cast);                    // callsign -> roster id
const doorMap: Record<string, string> = kv(dir.doormap);              // episode door -> scene door
const samples: Record<string, string> = dir.sample ? Object.fromEntries(Object.entries(kv(dir.sample)).map(([k, v]) => [k, rel(v)])) : {};
const DUR = ep.duration ?? (dir.duration ? T(dir.duration) : 240);

// ---------------- places ----------------
const b = scene.building, c = scene.corridor, spineY = (c.y0 + c.y1) / 2;
const sceneDoor = (nn: string) => {
  const d = geo.doors.find(x => x.id === (doorMap[nn] ?? nn)); if (!d) throw new Error(`unknown door ${nn}`); return d;
};
const doorCenter = (nn: string) => { const d = sceneDoor(nn); return d.axis === "h" ? [d.hx + d.width / 2, d.hy] : [d.hx, d.hy + d.width / 2]; };
const intoRoom = (nn: string) => sceneDoor(nn).swing;                  // motel room doors: -1 up (top rooms), +1 down
function place(spec: string): { p: number[]; spur: number[][] } {
  let s = spec.trim(), off = [0, 0];
  const o = s.match(/\+\((-?\d+),\s*(-?\d+)\)$/); if (o) { off = [Number(o[1]), Number(o[2])]; s = s.slice(0, o.index).trim(); }
  const add = (q: number[]) => [q[0] + off[0], q[1] + off[1]];
  let m;
  if ((m = s.match(/^\((-?\d+),\s*(-?\d+)\)$/))) { const p = add([Number(m[1]), Number(m[2])]); return { p, spur: [p, [p[0], spineY]] }; }
  if (s === "EXIT") { const p = add([b.x0 + 60, spineY]); return { p, spur: [p] }; }
  if (s === "OUTSIDE") { const p = add([(scene.walkway.x0 + scene.walkway.x1) / 2 + 10, spineY]); return { p, spur: [p, [b.x0 + 60, spineY]] }; }
  if ((m = s.match(/^(door|doorway|room|corridor)\s+(\w+)$/))) {
    const [kind, nn] = [m[1], m[2]]; const [dx, dy] = doorCenter(nn); const sg = intoRoom(nn);
    const approach = [dx, dy - sg * 55], spine = [dx, spineY], doorway = [dx, dy + sg * 70];
    if (kind === "corridor") { const p = add(spine); return { p, spur: [p] }; }
    if (kind === "door") { const p = add(approach); return { p, spur: [p, spine] }; }
    if (kind === "doorway") { const p = add(doorway); return { p, spur: [p, approach, spine] }; }
    const room = geo.rooms.find((r: any) => r.id === (doorMap[nn] ?? nn)) as any;
    const rc = room?.bedroom ? [room.bedroom.x + room.bedroom.w / 2, room.bedroom.y + room.bedroom.h / 2] : doorway;
    const p = add(rc); return { p, spur: [p, doorway, approach, spine] };
  }
  throw new Error(`unknown place "${spec}"`);
}
const spots: Record<string, number[]> = {};
for (const part of (dir.spot ?? "").split("|")) { const [k, v] = part.split("="); if (k?.trim()) spots[k.trim()] = place(v).p; }

// ---------------- operator tracks ----------------
type Key = number[];                                                    // [t, x, y, heading]
const tracks: Record<string, Key[]> = {};
const SPEED: Record<string, number> = { creep: 70, walk: 125, run: 330 };
const LANE = [0, 26, -26, 40, -40];
function posAt(who: string, t: number): Key {
  const k = tracks[who]; if (t <= k[0][0]) return k[0].slice(); if (t >= k[k.length - 1][0]) return [t, ...k[k.length - 1].slice(1)];
  let i = 0; while (k[i + 1][0] < t) i++;
  const a = k[i], bb = k[i + 1], u = (t - a[0]) / (bb[0] - a[0]);
  let dh = ((bb[3] - a[3] + 540) % 360) - 180;
  return [t, a[1] + (bb[1] - a[1]) * u, a[2] + (bb[2] - a[2]) * u, a[3] + dh * u];
}
function cutAt(who: string, t: number) { const p = posAt(who, t); tracks[who] = tracks[who].filter(k => k[0] < t); tracks[who].push(p); return p; }
const dedupe = (pts: number[][]) => pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1);
const polyLen = (pts: number[][]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
function pointAlong(pts: number[][], d: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (d <= L || i === pts.length - 2) { const u = L ? Math.min(1, d / L) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; }
    d -= L;
  }
  return pts[pts.length - 1];
}
// nav: from any point, the way to the corridor spine; rooms/doorways go through their door
function spurFrom(xy: number[]): number[][] {
  const inCorr = xy[1] >= c.y0 && xy[1] <= c.y1 && xy[0] >= b.x0;
  if (xy[0] < b.x0) return [xy, [b.x0 + 60, spineY]];                // outside -> through the exit
  if (inCorr) return [xy, [xy[0], spineY]];
  const d = geo.doors.filter(d => d.axis === "h").sort((p, q) => Math.abs(p.hx + p.width / 2 - xy[0]) - Math.abs(q.hx + q.width / 2 - xy[0]))[0];
  const dx = d.hx + d.width / 2;
  return [xy, [dx, d.hy + d.swing * 70], [dx, d.hy - d.swing * 55], [dx, spineY]];
}
const inBand = (p: number[]) => p[0] >= b.x0 && p[1] > c.y0 + 8 && p[1] < c.y1 - 8;
function route(from: number[], to: { p: number[]; spur: number[][] }, lane: number) {
  const a = spurFrom(from), z = to.spur.slice().reverse();
  let pts = dedupe([...a, ...z]).map(p => (Math.abs(p[1] - spineY) < 1 ? [p[0], p[1] + lane] : p));
  pts = dedupe([from, ...pts.slice(1, -1), to.p]);
  // inside the corridor walk straight: drop corridor waypoints whose neighbours are both in the corridor
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    if (inBand(pts[i]) && inBand(out[out.length - 1]) && inBand(pts[i + 1])) continue;
    out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function addMove(who: string, t0: number, pts: number[][], speed: number) {
  const L = polyLen(pts); if (L < 2) return t0;
  // trapezoid speed profile: accelerate for 0.35 s to the target speed, cruise, decelerate;
  // short moves never reach full speed (triangle profile)
  const a = speed / 0.35, vp = Math.min(speed, Math.sqrt(L * a)), Ta = vp / a;
  const cruise = (L - a * Ta * Ta) / vp, Ttot = 2 * Ta + cruise;
  const distAt = (tt: number) => {
    if (tt <= Ta) return 0.5 * a * tt * tt;
    if (tt <= Ta + cruise) return 0.5 * a * Ta * Ta + vp * (tt - Ta);
    const r = Ttot - tt; return L - 0.5 * a * r * r;
  };
  let lastH = posAt(who, t0)[3];
  for (let tt = 0.1; tt < Ttot + 0.05; tt += 0.1) {
    const u = Math.min(tt, Ttot), d = Math.min(L, Math.max(0, distAt(u)));
    const [x, y] = pointAlong(pts, d), [x2, y2] = pointAlong(pts, Math.min(L, d + 25));
    if (Math.hypot(x2 - x, y2 - y) > 3) lastH = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
    tracks[who].push([t0 + u, x, y, lastH]);
  }
  return t0 + Ttot;
}
const headingTo = (from: number[], to: number[]) => Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
const whoList = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
const placeOrWho = (s: string, t: number) => (cast[s.trim()] ? posAt(s.trim(), t).slice(1, 3) : place(s).p);

for (const [k, v] of Object.entries(kv(dir.start ?? ""))) { const p = place(v.replaceAll("_", " ")).p; tracks[k] = [[0, p[0], p[1], 0]]; }
for (const who of Object.keys(cast)) if (!tracks[who]) throw new Error(`@start missing for ${who}`);

const fireEvents: { t: number; who: string; at: number[] }[] = [];
const entityMods: { t: number; t2?: number; kind: string; arg: string }[] = [];
const cameraCmds: { t: number; mode: string; who?: string[]; at?: number[]; zoom: number }[] = [];
const shots: any[] = [], warns: any[] = [], confidence: number[][] = [], props: any[] = [], userTags: any[] = [], beatSfx: any[] = [];
for (const cmd of cmds.sort((p, q) => p.t - q.t || p.line - q.line)) {
  const r = cmd.rest; let m;
  if (cmd.verb === "move" && (m = r.match(/^(\S+)\s+to\s+(.+?)(?:\s+(walk|creep|run))?(?:\s+by\s+(\S+))?$/))) {
    const group = whoList(m[1]), dest = place(m[2]), mode = m[3] ?? "walk", by = m[4] ? T(m[4]) : null;
    const lead = group[0], leadFrom = cutAt(lead, cmd.t).slice(1, 3);
    const leadPath = route(leadFrom, dest, 0), L = polyLen(leadPath);
    const speed = by ? L / Math.max(0.5, by - cmd.t - 0.35) : SPEED[mode];
    addMove(lead, cmd.t, leadPath, speed);
    group.slice(1).forEach((who, i) => {                                 // single file behind the lead
      const back = (i + 1) * 88, endP = pointAlong(leadPath.slice().reverse(), back);
      const tgt = { p: endP, spur: spurFrom(endP) };
      const from = cutAt(who, cmd.t + (i + 1) * 0.35).slice(1, 3);
      addMove(who, cmd.t + (i + 1) * 0.35, route(from, tgt, LANE[i + 1]), speed);
    });
  } else if (cmd.verb === "face" && (m = r.match(/^(\S+)\s+to\s+(.+)$/))) {
    for (const who of whoList(m[1])) {
      // a turn never cancels a walk in progress: it happens when the walk ends
      const k = tracks[who], tEnd = Math.max(cmd.t, k[k.length - 1][0]);
      const p = tEnd > cmd.t ? posAt(who, tEnd) : cutAt(who, cmd.t);
      const target = /^-?\d+$/.test(m[2].trim()) ? Number(m[2]) : headingTo(p.slice(1, 3), placeOrWho(m[2], tEnd));
      if (tEnd > cmd.t) k.push([tEnd, p[1], p[2], p[3]]);
      k.push([tEnd + 0.4, p[1], p[2], target]);
    }
  } else if (cmd.verb === "fire" && (m = r.match(/^(\S+)\s+at\s+(.+)$/))) {
    fireEvents.push({ t: cmd.t, who: m[1], at: placeOrWho(m[2], cmd.t) });
  } else if (cmd.verb === "entity") {
    const [kind, ...rest] = r.split(/\s+/); entityMods.push({ t: cmd.t, t2: cmd.t2, kind, arg: rest.join(" ") });
  } else if (cmd.verb === "camera" && (m = r.match(/^(follow|at)\s+(.+?)(?:\s+zoom\s+([\d.]+))?$/))) {
    cameraCmds.push(m[1] === "follow" ? { t: cmd.t, mode: "follow", who: whoList(m[2]), zoom: Number(m[3] ?? 1.2) }
                                      : { t: cmd.t, mode: "at", at: place(m[2]).p, zoom: Number(m[3] ?? 1.2) });
  } else if (cmd.verb === "shot") {
    const [type, ...rest] = r.split(/\s+/); const o = kv(rest.filter(x => x.includes("=")).join(" "));
    const s: any = { from: cmd.t, to: cmd.t2, type };
    if (type === "map" && o.at) s.at = T(o.at);
    if (type === "bodycam") { s.unit = rest[0]; if (o.clip) s.clip = rel(o.clip); if (o.still) s.still = rel(o.still); if (o.offset) s.clipOffset = Number(o.offset); }
    if (type === "card") s.card = rest[0];
    shots.push(s);
  } else if (cmd.verb === "warn") warns.push({ from: cmd.t, to: cmd.t2, text: r.replace(/^"|"$/g, "") });
  else if (cmd.verb === "confidence") confidence.push([cmd.t, Number(r)]);
  else if (cmd.verb === "sfx") { const [name, ...o] = r.split(/\s+/); const op = kv(o.join(" "));
    if (name === "typing") beatSfx.push({ type: "typing", from: cmd.t, to: cmd.t2 ?? cmd.t + 2 });
    else { if (!samples[name]) throw new Error(`beats line ${cmd.line}: no @sample ${name}`); beatSfx.push({ type: "oneshot", t: cmd.t, sample: name, gain: Number(op.gain ?? 1), pan: Number(op.pan ?? 0) }); } }
  else if (cmd.verb === "prop" && (m = r.match(/^(\S+)\s+at\s+(.+)$/))) { const p = place(m[2]).p; props.push({ kind: m[1], x: p[0], y: p[1], from: cmd.t, to: cmd.t2 ?? DUR }); }
  else if (cmd.verb === "tag" && (m = r.match(/^(.+?)\s+at\s+(.+)$/))) { const p = place(m[2]).p; userTags.push({ from: cmd.t, to: cmd.t2 ?? cmd.t + 4, x: p[0], y: p[1], text: m[1].replace(/^"|"$/g, "") }); }
  else throw new Error(`beats line ${cmd.line}: unknown command "${cmd.verb} ${r}"`);
}
for (const who of Object.keys(tracks)) { tracks[who].sort((p, q) => p[0] - q[0]); tracks[who].push([DUR, ...tracks[who][tracks[who].length - 1].slice(1)]); }

// ---------------- entity ----------------
const zones: Record<string, number> = ep.zones;
const eid = ep.anomalies[0].id;
const spotXY = (s: string) => { if (!spots[s]) throw new Error(`no @spot for ${s}`); return spots[s]; };
// facing: in a room it faces its doorway, in a doorway it faces the corridor, at the exit it faces the door
const facingFor = (s: string) => { const p = spotXY(s); return p[0] < b.x0 + 120 ? 180 : (p[1] < c.y0 ? 90 : p[1] > c.y1 ? -90 : 180); };
const doorEvents = [...ep.door_events].map((e: any) => ({ ...e, ts: Math.floor(e.t) * 60 + Math.round((e.t % 1) * 100) })).sort((p: any, q: any) => p.ts - q.ts);
let eSpot = ep.initial_positions[eid];
const eKeys: number[][] = [];
const ek = (t: number, s: string, glitch = 0, pose = 0, look = 0, h?: number) => { const p = spotXY(s); eKeys.push([t, p[0], p[1], h ?? facingFor(s), 1, glitch, pose, look, 0]); };
ek(0, eSpot);
const zoneTrack: number[][] = [[0, zones[eSpot]]];
for (const e of doorEvents.filter((e: any) => e.by === "unprompted")) {
  ek(e.ts - 0.3, eSpot); ek(e.ts - 0.001, eSpot, 1);
  eSpot = e.unk_to; ek(e.ts, eSpot, 1); ek(e.ts + 0.45, eSpot, 0);
  zoneTrack.push([e.ts, zones[eSpot]]);
}
eKeys.sort((p, q) => p[0] - q[0]);
const eAt = (t: number) => { let k = eKeys[0]; for (const x of eKeys) if (x[0] <= t && x[0] >= k[0]) k = x; return k; };
const freezeTags: any[] = [], freezes: { from: number; to: number }[] = [];
for (const mod of entityMods) {
  const base = eAt(mod.t), body = base[3];
  if (mod.kind === "look" && mod.t2) {
    const who = mod.arg.trim();
    for (let t = mod.t; t <= mod.t2; t += 0.25) {
      const k = eAt(t).slice(); k[0] = t; const target = headingTo([k[1], k[2]], posAt(who, t).slice(1, 3));
      k[7] = Math.max(-150, Math.min(150, ((target - k[3] + 540) % 360) - 180)); eKeys.push(k);
    }
    const end = eAt(mod.t2 + 0.5).slice(); end[0] = mod.t2 + 0.5; end[7] = 0; eKeys.push(end);
  } else if (mod.kind === "reach" && mod.t2) {
    const who = mod.arg.replace(/^toward\s+/, "").trim();
    const k0 = base.slice(); k0[0] = mod.t; eKeys.push(k0);
    const k1 = base.slice(); k1[0] = mod.t + 0.6; k1[6] = 1; k1[9] = 1; k1[3] = headingTo([k1[1], k1[2]], posAt(who, mod.t2).slice(1, 3)); eKeys.push(k1);
    const k2 = k1.slice(); k2[0] = mod.t2; eKeys.push(k2);
    const k3 = base.slice(); k3[0] = mod.t2 + 0.8; k3[3] = body; eKeys.push(k3);
  } else if (mod.kind === "freeze") {
    const s = Number(mod.arg); const k = eAt(mod.t).slice(); k[0] = mod.t;
    for (let i = eKeys.length - 1; i >= 0; i--) if (eKeys[i][0] > mod.t && eKeys[i][0] < mod.t + s) eKeys.splice(i, 1);
    eKeys.push(k); const k2 = k.slice(); k2[0] = mod.t + s; eKeys.push(k2);
    // then it slowly takes back whatever it was doing (a reach retracts) to its last resting key
    const rest = eKeys.filter(x => x[0] < mod.t && !(x[9] > 0)).sort((p, q) => q[0] - p[0])[0];
    if (k[9] > 0 && rest) { const k3 = rest.slice(); k3[0] = mod.t + s + 1.2; k3[1] = k[1]; k3[2] = k[2]; k3[9] = 0; eKeys.push(k3); }
    freezes.push({ from: mod.t, to: mod.t + s });
    freezeTags.push({ from: mod.t, to: mod.t + s + 0.6, x: k[1], y: k[2] - 60, text: `${eid} // MOTION HALTED ${s.toFixed(1)}s` });
  }
  eKeys.sort((p, q) => p[0] - q[0]);
}
eKeys.sort((p, q) => p[0] - q[0]);
for (const k of eKeys) while (k.length < 10) k.push(0);   // [t,x,y,h,vis,glitch,pose,look,hidden,reach]

// ---------------- doors ----------------
const doorTracks: Record<string, number[][]> = {}, doorFx: Record<string, any[]> = {}, tags: any[] = [];
for (const [nn, st] of Object.entries(ep.initial_doors as Record<string, string>)) {
  const id = doorMap[nn] ?? nn; doorTracks[id] = [[0, st === "open" || st === "propped" ? 1 : 0]];
  doorFx[id] = [[0, st]];
}
const label = (nn: string) => (nn === "EXIT" ? "EXIT" : `DOOR ${nn}`);
const TAG: Record<string, string> = { unprompted: "OPENED · UNPROMPTED", personnel: "OPENED · BY PERSONNEL", propped: "PROPPED",
  closed: "CLOSED", claimed: "CLAIMED", held: "HELD", attempt: "CLAIMED · WON'T OPEN" };
const sfx: any[] = [{ type: "ambience", kind: dir.ambience ?? "motel" }];
let firstSeen = true;
for (const e of doorEvents) {
  const id = doorMap[e.door] ?? e.door, tr = doorTracks[id], cur = tr[tr.length - 1][1];
  const swing = (dur: number, to: number) => { tr.push([e.ts, cur]); tr.push([e.ts + dur, to]); };
  const [px] = id === "EXIT" ? [b.x0] : doorCenter(e.door), pan = Math.max(-0.7, Math.min(0.7, (px - 1024) / 1024));
  const prevFx = doorFx[id][doorFx[id].length - 1]?.[1];
  const key = (k: string) => (samples[k] ? k : undefined);
  if (e.by === "unprompted") {
    if (prevFx === "released" || prevFx === "held") { swing(0.25, 1); sfx.push({ type: "oneshot", t: e.ts - 0.03, sample: key("door_burst"), gain: 1.1, pan }); }
    else { swing(0.7, 1); sfx.push({ type: "creak", t: e.ts - 0.05, dur: 1.0, sample: key("creak"), pan }); }
    sfx.push({ type: "relocate", t: e.ts, sample: key("relocate") }); if (firstSeen) { sfx.push({ type: "drone", t: e.ts }); firstSeen = false; } }
  else if (e.by === "personnel" || e.by === "propped") { swing(0.5, 1); sfx.push({ type: "door_push", t: e.ts, sample: key("door_open"), pan }); }
  else if (e.by === "closed") {
    const closer = /closer/.test(e.who ?? ""); swing(closer ? 1.2 : 0.35, 0);
    sfx.push({ type: "oneshot", t: e.ts + (closer ? 1.0 : 0.25), sample: key(closer ? "door_latch" : "door_slam"), gain: closer ? 0.6 : 1.0, pan });
  }
  else if (e.by === "claimed") sfx.push({ type: "oneshot", t: e.ts, sample: key("frost"), gain: 0.7, pan });
  else if (e.by === "attempt") sfx.push({ type: "oneshot", t: e.ts, sample: key("rattle"), gain: 0.9, pan });
  else if (e.by === "held") {
    const nxt = doorEvents.find((x: any) => x.ts > e.ts && (doorMap[x.door] ?? x.door) === id);
    const closes = (ep.site_rules ?? []).find((s: any) => s.closes); const end = nxt?.ts ?? (closes ? T(closes.closes) : DUR);
    sfx.push({ type: "held", from: e.ts, to: end, period: 1.15, phase: 0.3, sample: key("thump"), pan });   // same beat as the picture (fx.ts doorJolt)
  }
  doorFx[id].push([e.ts, e.by]);
  const [dx, dy] = id === "EXIT" ? [b.x0, (scene.exit.y0 + scene.exit.y1) / 2] : doorCenter(e.door);
  if (TAG[e.by]) tags.push({ from: e.ts, to: e.ts + 2.6, x: dx, y: id === "EXIT" ? dy : dy + (dy < spineY ? 30 : -30), text: `${label(e.door)} · ${TAG[e.by]}` });
}
for (const [i, z] of zoneTrack.entries()) if (i > 0) { const k = eAt(z[0] + 0.5); tags.push({ from: z[0] + 0.3, to: z[0] + 3, x: k[1], y: k[2] - 70, text: `${eid} -> ZONE ${z[1]}` }); }

// ---------------- dialogue, shots, camera ----------------
const sec = (s: string) => T(s);
const voDir = path.resolve(beatsDir, "vo");
const subtitles = ep.dialogue.map((d: any, i: number) => {
  const vo = path.join(voDir, `${String(i + 1).padStart(2, "0")}_${d.who}.wav`);
  let dur = d.line.replace(/\[[^\]]*\]/g, "").trim().split(/\s+/).length / 2.7 + 0.5;
  if (fs.existsSync(vo)) { const st = fs.statSync(vo); dur = (st.size - 44) / 48000; }
  return { from: sec(d.t), dur, who: d.who, text: d.line.replace(/\[[^\]]*\]\s*/g, ""), vo: fs.existsSync(vo) ? rel(path.relative(beatsDir, vo)) : undefined };
});
subtitles.forEach((s: any, i: number) => {
  const next = subtitles[i + 1]?.from ?? DUR; s.to = Math.min(s.from + s.dur + 0.35, next - 0.05);
  if (s.from + s.dur > next + 0.2) report.push(`dialogue overlap: ${fmt(s.from)} ${s.who} needs ${s.dur.toFixed(1)}s, next line at ${fmt(next)}`);
  delete s.dur;
});
shots.sort((p, q) => p.from - q.from);
const staticMarks: number[][] = [];
shots.forEach((s, i) => { if (i > 0 && s.type !== shots[i - 1].type) staticMarks.push([s.from, 0.15]); });
for (const s of shots.filter(s => s.type === "bodycam")) sfx.push({ type: "insert_bed", kind: "bodycam", from: s.from, to: s.to });
for (const f of fireEvents) sfx.push({ type: "oneshot", t: f.t - 0.02, sample: samples.gunfire ? "gunfire" : undefined, gain: 1.2 });
for (const m of entityMods) {
  if (m.kind === "reach" && samples.limb) sfx.push({ type: "oneshot", t: m.t, sample: "limb", gain: 0.8 });
  if (m.kind === "freeze") sfx.push({ type: "freeze", from: m.t, to: m.t + Number(m.arg) });
}
{ // the lapse closes when the site countdown runs out: impacts stop, the drone dies, outside air comes in
  const cl = (ep.site_rules ?? []).find((s: any) => s.closes);
  if (cl) { const tc = T(cl.closes); sfx.push({ type: "lapse_close", t: tc, sample: samples.lapse_close ? "lapse_close" : undefined });
    if (samples.glitch) { sfx.push({ type: "oneshot", t: tc - 5.5, sample: "glitch", gain: 0.5 }); sfx.push({ type: "oneshot", t: tc - 2.2, sample: "glitch", gain: 0.8 }); } }
}
sfx.push(...beatSfx);

const camKeys: number[][] = [];
cameraCmds.sort((p, q) => p.t - q.t);
let cx = place("corridor 01").p[0], cy = spineY, cz = 1.0;
for (let t = 0; t <= DUR + 0.01; t += 0.25) {
  const cmd = [...cameraCmds].reverse().find(cc => cc.t <= t);
  let tx = cx, ty = cy, tz = cz;
  if (cmd?.mode === "follow") { const ps = cmd.who!.map(w => posAt(w, t)); tx = ps.reduce((s, p) => s + p[1], 0) / ps.length; ty = ps.reduce((s, p) => s + p[2], 0) / ps.length; tz = cmd.zoom; }
  else if (cmd?.mode === "at") { tx = cmd.at![0]; ty = cmd.at![1]; tz = cmd.zoom; }
  const k = t === 0 ? 1 : 0.12; cx += (tx - cx) * k; cy += (ty - cy) * k; cz += (tz - cz) * k;
  const hw = 2048 / cz / 2, hh = 1152 / cz / 2;                         // keep the view inside the plate
  camKeys.push([t, Math.min(2048 - hw, Math.max(hw, cx)), Math.min(1152 - hh, Math.max(hh, cy)), cz]);
}

// ---------------- checks ----------------
for (const e of doorEvents.filter((e: any) => e.who && !/closer/.test(e.who))) {
  const id = doorMap[e.door] ?? e.door, dc = id === "EXIT" ? [b.x0, (scene.exit.y0 + scene.exit.y1) / 2] : doorCenter(e.door);
  for (const who of String(e.who).split("+")) {
    if (!cast[who]) continue;
    const p = posAt(who, e.ts), d = Math.hypot(p[1] - dc[0], p[2] - dc[1]);
    if (d > 130) report.push(`${fmt(e.ts)} ${who} should be at ${label(e.door)} (${e.by}) but is ${Math.round(d)} units away`);
  }
}
// Contact (bible / script definition): its attention is on the person AND they are within ~2 m.
// Attention = the beats' "entity look WHO" windows. Proximity alone (passing it while it watches
// someone else, or standing on the other side of a shut door) does not count.
const CONTACT = 200;
const looks = entityMods.filter(m => m.kind === "look" && m.t2).map(m => ({ who: m.arg.trim(), from: m.t, to: m.t2! }));
const spansOf = (pred: (t: number) => boolean) => {
  const spans: number[][] = []; let open: number | null = null;
  for (let t = 0; t <= DUR + 1e-6; t += 0.1) {
    const v = pred(t);
    if (v && open === null) open = t; if (!v && open !== null) { spans.push([open, t]); open = null; }
  }
  if (open !== null) spans.push([open, DUR]);
  return spans;
};
const shut = (t: number) => (doorFx.EXIT ?? []).filter((x: any) => x[0] <= t).pop()?.[1];
for (const who of Object.keys(cast)) {
  const near = (t: number) => { const k = eAt(t), p = posAt(who, t); return Math.hypot(k[1] - p[1], k[2] - p[2]) < CONTACT; };
  const watched = (t: number) => looks.some(l => l.who === who && t >= l.from && t <= l.to);
  const prox = spansOf(near), contact = spansOf(t => near(t) && watched(t));
  const declared = ep.exposure_events.filter((x: any) => x.who === who && x.event === "direct_contact").reduce((s: number, x: any) => s + (x.count ?? 1), 0);
  const ok = contact.length === declared ? "OK " : "MISMATCH";
  report.push(`contact ${ok} ${who.padEnd(6)} declared ${declared}, on map ${contact.length}: ${contact.map(s => `${fmt(s[0])}-${fmt(s[1])}`).join(", ") || "none"}`
    + `   (near but not watched: ${prox.filter(p => !contact.some(c2 => c2[0] < p[1] && c2[1] > p[0])).map(s => `${fmt(s[0])}-${fmt(s[1])}`).join(", ") || "none"})`);
}

const roster = scene.roster ?? [];
// ---------------- cards (case file at the top, recovery report at the end) ----------------
const before = (() => { try { return JSON.parse(fs.readFileSync(path.resolve(beatsDir, "state_before.json"), "utf8")); } catch { return null; } })();
const chars = before?.characters?.characters ?? [];
const fileNo = String(ep.file).padStart(3, "0");
const cards = {
  program: (before?.series?.program ?? "Wayfarer Recovery Program").toUpperCase(), file: fileNo,
  site: dir.site ?? ep.site, objective: dir.objective ?? "", result: ep.mission_result,
  payment: ep.payment, stabilizer: ep.stabilizer_access ? "GRANTED" : "DENIED",
  reportNote: ep.report_note,
  recovered: (ep.recovered_items ?? []).map((r: any) => ({ label: r.label, record: r.official_record })),
  personnel: Object.keys(cast).map(who => {
    const ch = chars.find((x: any) => x.id === who), sp = roster.find((r: any) => r.id === cast[who]) ?? {};
    const rep = ep.report?.[who] ?? [ch?.exposure ?? 0, ch?.exposure ?? 0];
    return { callsign: who, color: sp.color, icon: sp.icon, before: rep[0], after: rep[1],
             status: ep.personnel_results?.find((x: any) => x.id === who)?.status ?? "RETURNED",
             note: ch && !ch.missions_completed ? "FIRST ASSIGNMENT" : "" };
  }),
};

// ---------------- write ----------------
const ids = Object.entries(cast);
const out = {
  _generated: `compile_timeline.ts from ${path.basename(beatsPath)} + ${path.basename(dir.episode)}; do not edit by hand`,
  scene: scenePath, plates: Object.fromEntries(Object.entries(kv(dir.plates ?? "")).map(([k, v]) => [k, rel(v)])),
  feedLabel: dir.feed, entityId: eid, species: dir.species ?? "stalker",
  duration: DUR, fps: 30, clockStart: dir.clock ?? "02:00:00",
  shots, static: staticMarks,
  doors: doorTracks, doorFx,
  operators: Object.fromEntries(ids.map(([who, rid]) => [rid, { interp: "linear", keys: tracks[who].map(k => k.map(v => Math.round(v * 100) / 100)) }])),
  operatorIds: Object.fromEntries(ids.map(([who, rid]) => [rid, who])),
  entity: eKeys.map(k => k.map(v => Math.round(v * 1000) / 1000)),
  zoneTrack, countdown: (ep.site_rules ?? []).filter((s: any) => s.countdown_from).map((s: any) => ({ start: T(s.announced), seconds: T(s.countdown_from), label: "SITE 07 · CLOSURE IN" })),
  confidence: confidence.length ? confidence : [[0, 91]],
  camera: { interp: "linear", keys: camKeys.map(k => k.map(v => Math.round(v * 100) / 100)) },
  warn: warns, events: [...tags, ...freezeTags, ...userTags],
  fire: fireEvents, freeze: freezes, props, cards,
  subtitles, samples,
  sfx,
};
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`wrote ${outPath}: ${shots.length} shots, ${Object.values(tracks).reduce((s, k) => s + k.length, 0)} operator keys, ${eKeys.length} entity keys, ${tags.length} HUD tags, ${subtitles.length} subtitles, ${sfx.length} sfx cues`);
for (const r of report) console.log("  " + r);
