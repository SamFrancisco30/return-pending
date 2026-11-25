// Renders an episode from a timeline JSON (hand-written or from compile_timeline.ts), piping raw frames into ffmpeg.
// Usage: node src/animate.ts S2|S3 ../scene/timeline_motel_15s.json ../renders/sample_S2.mp4 [--frames 0,120,240] [--from 0 --to 45]
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { loadImage, type Image } from "@napi-rs/canvas";
import { loadScene } from "./geometry.ts";
import { loadPlates, renderFrame, renderBodycam, renderSignalLost, type FrameState, type Style } from "./compose.ts";
import { doorFxAt } from "./fx.ts";
import { renderTitleCard, renderCaseCard, renderReportCard } from "./cards.ts";

const [, , styleArg, tlPath, outPath] = process.argv;
const style = styleArg as Style;
const framesArg = process.argv.indexOf("--frames");
const onlyFrames = framesArg > 0 ? process.argv[framesArg + 1].split(",").map(Number) : null;
const framePrefix = process.argv.includes("--prefix") ? process.argv[process.argv.indexOf("--prefix") + 1] : style;

const tl = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const scene = loadScene(tl.scene ?? "../scene/motel.json");
const plateCfg = tl.plates ?? { xray: "../concepts/plate_xray_b.png", real: "../concepts/plate_real_a.png" };
const plates = { ...(await loadPlates(plateCfg.xray, plateCfg.real ?? plateCfg.xray)), fit: plateCfg.fit };
const debugPlan = process.argv.includes("--debug-plan");
const feedLabel = tl.feedLabel ?? "SITE 07 // ROUTE 9 MOTEL // CAM-OVH";
const W = 1920, H = 1080, FPS = tl.fps, N = Math.round(tl.duration * FPS);
const argNum = (k: string) => (process.argv.includes(k) ? Number(process.argv[process.argv.indexOf(k) + 1]) : null);
const I0 = Math.round((argNum("--from") ?? 0) * FPS), I1 = Math.min(N, Math.round((argNum("--to") ?? tl.duration) * FPS));

// ---------- interpolation ----------
// A track is either a plain key list [[t, ...values]] (smoothstep between keys, hand-authored) or
// {interp: "linear", keys} (dense keys from the timeline compiler, interpolated linearly).
const smooth = (u: number) => u * u * (3 - 2 * u);
type Track = number[][] | { interp: "linear" | "smooth"; keys: number[][] };
const keysOf = (tr: Track) => (Array.isArray(tr) ? tr : tr.keys);
const easeOf = (tr: Track) => (Array.isArray(tr) || tr.interp !== "linear" ? smooth : (u: number) => u);
function sample(tr: Track, t: number, angleIdx: number[] = []) {
  const keys = keysOf(tr), ease = easeOf(tr);
  if (t <= keys[0][0]) return keys[0].slice(1);
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last.slice(1);
  let lo = 0, hi = keys.length - 1;                    // binary search: keys[lo][0] <= t < keys[hi][0]
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (keys[m][0] <= t) lo = m; else hi = m; }
  const a = keys[lo], b = keys[hi];
  const u = ease((t - a[0]) / (b[0] - a[0]));
  return a.slice(1).map((v, k) => {
    if (angleIdx.includes(k)) { let d = ((b[k + 1] - v + 540) % 360) - 180; return v + d * u; }
    return v + (b[k + 1] - v) * u;
  });
}
const windowAlpha = (t: number, from: number, to: number, fade = 0.25) =>
  t < from || t > to ? 0 : Math.min(1, (t - from) / fade, (to - t) / fade);

function clockAt(t: number) {
  const [h, m, s] = tl.clockStart.split(":").map(Number);
  const tot = h * 3600 + m * 60 + s + t;
  const p = (n: number) => String(Math.floor(n)).padStart(2, "0");
  return `${p(tot / 3600)}:${p((tot % 3600) / 60)}:${p(tot % 60)}.${String(Math.floor((t % 1) * 100)).padStart(2, "0")}`;
}

function staticAt(t: number) {
  let a = 0;
  for (const [c, w] of tl.static ?? []) a = Math.max(a, 1 - Math.abs(t - c) / w);
  return Math.max(0, a);
}

// Walk each operator's whole path once (60 Hz): cumulative distance drives the gait phase and
// every stride drops a heat footprint (alternating feet). Frames then only look things up.
const STRIDE = 30, WALK_DT = 1 / 60;
const walkCache = new Map<string, { dist: Float64Array; prints: { x: number; y: number; heading: number; t: number; side: number }[] }>();
function walk(id: string, tr: Track) {
  if (walkCache.has(id)) return walkCache.get(id)!;
  const n = Math.ceil(tl.duration / WALK_DT) + 2, dist = new Float64Array(n);
  const prints: { x: number; y: number; heading: number; t: number; side: number }[] = [];
  let [px, py] = sample(tr, 0), d = 0, next = STRIDE, side = 1;
  for (let i = 1; i < n; i++) {
    const tt = i * WALK_DT, [x, y, h] = sample(tr, tt, [2]);
    const step = Math.hypot(x - px, y - py); if (step < 40) d += step; else next = d + STRIDE;   // a position swap is not a stride
    px = x; py = y; dist[i] = d;
    while (d >= next) {
      const a = h * Math.PI / 180;
      prints.push({ x: x - Math.sin(a) * 7 * side, y: y + Math.cos(a) * 7 * side, heading: h, t: tt, side });
      side = -side; next += STRIDE;
    }
  }
  const w = { dist, prints }; walkCache.set(id, w); return w;
}
function track(id: string, tr: Track, t: number) {
  const w = walk(id, tr), i = Math.min(w.dist.length - 1, Math.max(0, Math.round(t / WALK_DT)));
  const [x0, y0] = sample(tr, Math.max(0, t - 0.05)), [x1, y1] = sample(tr, t);
  const sp0 = Math.hypot(x1 - x0, y1 - y0) / 0.05, speed = sp0 > 900 ? 0 : sp0;
  const prints = w.prints.filter(p => p.t <= t && t - p.t < 3.5).map(p => ({ ...p, age: t - p.t }));
  return { phase: (w.dist[i] / STRIDE) * Math.PI, moving: Math.min(1, speed / 90), prints };
}

// Entity residues: wherever its position jumps (two keys < 50ms apart, far apart in space)
const entityKeys = keysOf(tl.entity);
const jumps = entityKeys.slice(1).map((k: number[], i: number) => [entityKeys[i], k])
  .filter(([a, b]: number[][]) => b[0] - a[0] < 0.05 && Math.hypot(b[1] - a[1], b[2] - a[2]) > 50);

// ---------- HUD signals ----------
const confKeys: number[][] = tl.confidence ?? [];
const tZero = confKeys.find(k => k[1] === 0)?.[0] ?? Infinity;          // reconstruction lost = lapse closed
function confAt(t: number) {
  let v = confKeys[0]?.[1] ?? 100;
  confKeys.forEach(([kt, kv], i) => { if (kt > t) return; const p = i ? confKeys[i - 1][1] : kv; v = p + (kv - p) * Math.min(1, (t - kt) / 0.4); });
  if (v > 0 && v <= 50) v = Math.max(1, v + Math.sin(t * 7.3) * 3 + Math.sin(t * 19.1) * 2);   // unstable: jitters
  return v;
}
const collapseAt = (t: number) => (t >= tZero ? 1 : Math.max(0, Math.min(0.999, (t - (tZero - 6)) / 6)));
const zoneTrack: number[][] = tl.zoneTrack ?? [];
const zoneLevels = [...new Set(zoneTrack.map(z => z[1]))].sort((a, b) => b - a);
if (zoneLevels.length && !zoneLevels.includes(0)) zoneLevels.push(0);
function zoneAt(t: number) {
  if (zoneTrack.length < 2 || t < zoneTrack[1][0]) return undefined;      // shown once it is first detected
  let i = 0; while (i + 1 < zoneTrack.length && zoneTrack[i + 1][0] <= t) i++;
  return { cur: zoneTrack[i][1], prev: zoneTrack[Math.max(0, i - 1)][1], since: zoneTrack[i][0], levels: zoneLevels };
}
function countdownAt(t: number) {
  const c = (tl.countdown ?? []).find((c: any) => t >= c.start);
  return c ? { label: c.label, remaining: c.seconds - (t - c.start) } : undefined;
}
const idOf = (who: string) => Object.entries(tl.operatorIds ?? {}).find(([, cs]) => cs === who)?.[0] ?? who;
function shotsAt(t: number, ops: { id: string; x: number; y: number }[]) {
  const out: { x0: number; y0: number; x1: number; y1: number; age: number; kind?: string }[] = [];
  for (const f of tl.fire ?? []) for (let k = 0; k < 3; k++) {
    const age = t - (f.t + k * 0.085); if (age < 0 || age > 0.45) continue;
    const o = ops.find(o => o.id === idOf(f.who)); if (!o) continue;
    const dx = f.at[0] - o.x, dy = f.at[1] - o.y, L = Math.hypot(dx, dy) || 1;
    if (f.kind === "bolt" && k) continue;
    out.push({ x0: o.x + dx / L * 38, y0: o.y + dy / L * 38, x1: f.at[0] + (f.kind === "bolt" ? 0 : (k - 1) * 9), y1: f.at[1] + (f.kind === "bolt" ? 0 : ((k * 7) % 5 - 2) * 5), age, kind: f.kind });
  }
  return out;
}

function mapState(t: number): FrameState {
  const doors: Record<string, number> = {};
  for (const [id, keys] of Object.entries(tl.doors)) doors[id] = sample(keys as Track, t)[0];
  const footprints: any[] = [];
  const operators = Object.entries(tl.operators).map(([id, keys]) => {
    let [x, y, heading] = sample(keys as Track, t, [2]);
    // whoever is firing faces what they are firing at: turn in before the shot, hold, ease back after
    for (const f of tl.fire ?? []) {
      if (idOf(f.who) !== id) continue;
      const dt = t - f.t, w = dt < 0 ? 1 + dt / 0.45 : 1 - (dt - 0.5) / 0.5;
      if (w <= 0) continue;
      const aim = Math.atan2(f.at[1] - y, f.at[0] - x) * 180 / Math.PI, d = ((aim - heading + 540) % 360) - 180;
      heading += d * Math.min(1, w);
    }
    const tr = track(id, keys as Track, t);
    const col = scene.roster?.find((r: any) => r.id === id)?.color;
    footprints.push(...tr.prints.map(p => ({ ...p, color: col })));
    const downAt = tl.down?.[id];
    return { id, x, y, heading, gait: { phase: tr.phase, moving: tr.moving }, down: downAt != null && t >= downAt, guard: tl.guard?.[id] ? sample(tl.guard[id] as Track, t)[0] : 0 };
  });
  const residues = jumps.filter(([, b]: number[][]) => t >= b[0] && t - b[0] < 3)
    .map(([a, b]: number[][]) => ({ e: { x: a[1], y: a[2], heading: a[3], visible: 1, pose: a[6] ?? 1, hidden: a[8] ?? 0 }, age: t - b[0] }));
  // entity uses step (no interpolation) across the relocation instant: keys 1ms apart
  const [ex, ey, eh, ev, eg, epose, elook, ehid, ereach] = sample(tl.entity as Track, t, [2, 6]);
  const shots = shotsAt(t, operators);
  const freeze = (tl.freeze ?? []).find((f: any) => t >= f.from && t < f.to);
  const warn = (tl.warn ?? []).find((w: any) => t >= w.from && t <= w.to);
  const sub = subAt(t);
  // FILE 001: the shackle pulse (leaves the wearer every period), swaps, impacts, tags that follow a person
  let pulse: any, pulseHud: any;
  if (tl.pulse) {
    const P = tl.pulse, n = Math.floor((t - P.t0) / P.period), tp = P.t0 + n * P.period;
    if (n >= 0) {
      const [px, py] = sample(tl.entity as Track, tp);
      const age = t - tp, hit = (P.hits ?? []).find((h: any) => Math.abs(h.t - tp) < 1e-6);
      const bx = tl.boundary ? (tl.boundary.x1 + tl.boundary.x2) / 2 : null;
      let r: number, alpha: number, lock: any;
      if (hit) {                       // the ripple stops on the first living person it reaches, holds, then they trade places
        const ta = hit.touch - tp, sa = hit.swap - tp;
        r = P.speed * Math.min(age, ta); alpha = age < sa ? 1 : Math.max(0, 1 - (age - sa) / 0.45);
        if (age >= ta && age < sa) { const o = operators.find(o => o.id === idOf(hit.who)); if (o) lock = { x: o.x, y: o.y, u: (age - ta) / (sa - ta) }; }
      } else { r = P.speed * age; alpha = Math.max(0, Math.min(1, (P.maxR - r) / (P.maxR * 0.2))); }
      const dB = bx != null ? Math.abs(bx - px) : Infinity, eAge = age - dB / P.speed;
      const reaches = !hit || P.speed * (hit.touch - tp) >= dB;
      pulse = { x: px, y: py, r, alpha, zone: P.zone, lock, edge: reaches && eAge >= 0 && eAge < 1.3 ? 1 - eAge / 1.3 : 0 };
    }
    const rem = n >= 0 ? P.period - (t - tp) : P.t0 - t;
    pulseHud = { remaining: rem, period: P.period, alert: Math.max(0, Math.min(1, (t - (P.alertFrom ?? 1e9)) / 0.6)), count: Math.max(0, n + 1) };
  }
  const swaps = (tl.swaps ?? []).map((s: any) => ({ a: s.a, b: s.b, age: t - s.t })).filter((s: any) => s.age >= 0 && s.age < 1.2);
  const impacts = (tl.impacts ?? []).map((s: any) => ({ x: s.x, y: s.y, r: s.r ?? 60, age: t - s.t })).filter((s: any) => s.age >= 0 && s.age < 0.4);
  const impShake = impacts.reduce((m: number, s: any) => Math.max(m, (s.r / 60) * 7 * (1 - s.age / 0.4)), 0);
  const swapShake = swaps.reduce((m: number, s: any) => Math.max(m, s.age < 0.35 ? 12 * (1 - s.age / 0.35) : 0), 0);
  const unitTags = (tl.unitTags ?? []).filter((g: any) => t >= g.from && t <= g.to).map((g: any) => {
    const o = operators.find(o => o.id === idOf(g.who)); return o ? { x: o.x, y: o.y - 34, text: g.text, alpha: windowAlpha(t, g.from, g.to, 0.2) } : null; }).filter(Boolean);
  return {
    pulse, pulseHud, boundary: tl.boundary, swaps, impacts,
    t, doors, operators, footprints, residues, roster: scene.roster,
    entity: { id: tl.entityId ?? "UNK-1", x: ex, y: ey, heading: eh, visible: ev, glitch: eg, pose: epose ?? 1, look: elook ?? 0, hidden: ehid ?? 0, reach: ereach ?? 0 },
    doorFx: Object.fromEntries(Object.entries(tl.doorFx ?? {}).map(([id, tr]) => [id, doorFxAt(tr as [number, string][], t)!])),
    shots, shake: Math.max(impShake, swapShake, shots.reduce((m, s) => Math.max(m, s.age < 0.25 ? 5 * (1 - s.age / 0.25) : 0), 0)),
    frozenAt: freeze ? freeze.from : null,
    props: (tl.props ?? []).filter((p: any) => t >= p.from && t < p.to),
    hudX: { confidence: tl.pulse && !confKeys.length ? undefined : confAt(t), zone: zoneAt(t), countdown: countdownAt(t), entityId: tl.entityId },
    collapse: collapseAt(t),
    species: tl.species ?? "stalker", unitScale: scene.unitScale ?? 1, evacPath: tl.evacPath,
    explored: tl.explored ?? [],
    hud: { label: feedLabel, clock: clockAt(t), warn: warn?.text, warnAlpha: warn ? windowAlpha(t, warn.from, warn.to, 0.15) : 0 },
    evac: tl.evac ? sample(tl.evac, t)[0] : 0,
    events: [...(tl.events ?? []).map((e: any) => ({ x: e.x, y: e.y, text: e.text, alpha: windowAlpha(t, e.from, e.to, 0.2) })), ...unitTags],
    subtitle: sub ? { who: sub.who, text: sub.text, alpha: windowAlpha(t, sub.from, sub.to, 0.15) } : undefined,
    camera: (() => { const [cx, cy, zoom] = sample(tl.camera as Track, t); return { cx, cy, zoom }; })(),
    staticAmt: staticAt(t), debugPlan,
  };
}

// ---------- insert-shot source frames (bodycam / cctv), one frame list per distinct clip ----------
const clipFrames = new Map<string, Image[]>();
for (const s of (tl.shots ?? []).filter((s: any) => s.type === "bodycam" || s.type === "cctv")) {
  const key = s.clip && fs.existsSync(s.clip) ? s.clip : s.still;
  if (!key || clipFrames.has(key)) continue;
  const frames: Image[] = [];
  if (key === s.clip) {
    const dir = path.resolve(`../renders/_insert_frames_${process.pid}`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    spawnSync(ffmpegPath as unknown as string, ["-loglevel", "error", "-i", s.clip, "-vf", `fps=${FPS}`, path.join(dir, "f%04d.png")]);
    for (const f of fs.readdirSync(dir).sort()) frames.push(await loadImage(path.join(dir, f)));
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`${s.type} source: ${path.basename(s.clip)},`, frames.length, "frames");
  } else {
    frames.push(await loadImage(s.still));
    console.log(`${s.type} source: still ${path.basename(s.still)} (no clip found)`);
  }
  clipFrames.set(key, frames);
}

const inWindow = (t: number, wins: number[][] = []) => wins.some(([a, b]) => t >= a && t < b);
const subAt = (t: number) => (tl.subtitles ?? []).find((s: any) => t >= s.from && t <= s.to);

// Placeholder for programmatic screens (case card, recovery report, black) until the real layouts exist.
async function placeholderCard(lines: string[], t: number) {
  const { createCanvas } = await import("@napi-rs/canvas");
  const cv = createCanvas(W, H), ctx = cv.getContext("2d");
  ctx.fillStyle = "#05080a"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(210,232,235,0.9)"; ctx.font = "28px Consolas";
  lines.forEach((l, i) => ctx.fillText(l, 160, 300 + i * 46));
  return cv;
}

const beaconXY = () => { const b = (tl.props ?? []).find((p: any) => p.kind === "beacon"); return b ? [b.x, b.y] : null; };

async function frameAt(i: number) {
  const t = i / FPS;
  const shot = tl.shots.find((s: any) => t >= s.from && t < s.to) ?? tl.shots[tl.shots.length - 1];
  if (shot.type === "bodycam" || shot.type === "cctv") {
    const lt = t - shot.from;
    const frames = clipFrames.get(shot.clip && fs.existsSync(shot.clip) ? shot.clip : shot.still)!;
    const k = Math.min(frames.length - 1, Math.floor((lt + (shot.clipOffset ?? 0)) * FPS));
    const label = shot.type === "cctv" ? shot.label : `BODYCAM // ${shot.unit}`;
    const sub = subAt(t);
    const subSt = sub ? { subtitle: { who: sub.who, text: sub.text, alpha: windowAlpha(t, sub.from, sub.to, 0.15) }, roster: scene.roster } : undefined;
    return renderBodycam(frames[Math.max(0, k)], t, lt, label, clockAt(t), staticAt(t), W, H, shot.type, subSt);
  }
  const lt = t - shot.from, cards = tl.cards ?? {};
  if (shot.type === "black") return renderTitleCard(cards, lt, shot.to - shot.from, W, H);
  if (shot.type === "card" && shot.card === "case") return renderCaseCard(cards, plates, beaconXY(), lt, shot.to - shot.from, W, H, t);
  if (shot.type === "card" && shot.card === "report") return renderReportCard(cards, clockAt(Math.min(tZero, tl.duration)).slice(0, 8), lt, shot.to - shot.from, W, H, t);
  if (shot.type === "card") return placeholderCard(shot.lines ?? [`[${shot.card}]`], t);
  // the overhead feed itself drops out: the map is not drawn at all
  if (inWindow(t, tl.feedLoss)) return renderSignalLost(t, feedLabel, clockAt(t), W, H);
  // a map shot can show another moment (flash-forward cold open): "at" = source time of its first frame
  const st = shot.at != null ? shot.at + (t - shot.from) : t;
  return renderFrame(scene, plates, style, mapState(st), W, H);
}

// ---------- output ----------
if (onlyFrames) {
  fs.mkdirSync("../renders/frames", { recursive: true });
  for (const i of onlyFrames) {
    const p = `../renders/frames/${framePrefix}_${String(i).padStart(4, "0")}.png`;
    fs.writeFileSync(p, (await frameAt(i)).toBuffer("image/png")); console.log("wrote", p);
  }
} else {
  const ff = spawn(ffmpegPath as unknown as string, [
    "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outPath,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let i = I0; i < I1; i++) {
    const cv = await frameAt(i);
    const data = cv.getContext("2d").getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength))) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 300 === 0) console.log(`frame ${i}/${I1}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  console.log("wrote", outPath, `in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
