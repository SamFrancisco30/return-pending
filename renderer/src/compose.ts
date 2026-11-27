// Layered compositor: AI background plates + procedural doors, units, light, entity, HUD.
// Scene space is 2048x1152; output is scaled to the output canvas size.
import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D, type Image, type Canvas } from "@napi-rs/canvas";
import { buildGeometry, type Rect } from "./geometry.ts";
import { drawEquipCard, doorJolt, drawDoorFx, drawGunfire, drawProps, drawHudExtras, applyCollapse, drawWireframe, drawPulse, drawSwap, drawImpacts, drawOrdnance, drawPulseHud, drawHeavyDoor, drawRopes, drawSounds, type Rope, type SoundRing, type DoorFx, type Shot, type Prop, type HudExtras, type Pulse, type Boundary, type SwapFx, type Impact, type PulseHud } from "./fx.ts";
import { drawOperatorThermal, drawCallsign, callsignWidth, drawEntityThermal, drawFootprints, drawResidue, drawIdentityArc, drawIcon, rgba, type OperatorSpec, type Footprint, type Gait, type EntityState } from "./thermal.ts";

GlobalFonts.registerFromPath("C:/Windows/Fonts/consola.ttf", "Consolas");

export type Style = "S2" | "S3";
function drawSprite(ctx: SKRSContext2D, u: { x: number; y: number; heading: number; sprite?: { img: Image; size: number; trail?: number[][] } }, color = "#eafcff", flash = 0) {
  const s = u.sprite!; ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.heading * Math.PI / 180); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(s.img, -s.size / 2, -s.size / 2, s.size, s.size);
  if (flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, flash); ctx.drawImage(s.img, -s.size / 2, -s.size / 2, s.size, s.size); ctx.drawImage(s.img, -s.size / 2, -s.size / 2, s.size, s.size); ctx.restore(); }
  // (no light streak behind a swung blade: the swing itself and the hit burst carry it. The tip path is still in meta.json as tip_m.)
  ctx.restore();
}
// KNOX's shield is not only a plate: when he sets it, it throws a wall of light out in front of him, wider than he is. g is how far the
// wall is open (0..1); above 1 it is taking a blow. Two looks: "wall" (five bright panels with light spilling on the floor) and "hex" (a strip of cells).
function drawLightShield(ctx: SKRSContext2D, u: { x: number; y: number; heading: number }, g: number, sc = 1, style = "wall", t = 0) {
  const k = Math.min(1, g), fl = Math.min(1, Math.max(0, g - 1)), C = "110,225,255";
  const D = 46 * sc, Rc = 130 * sc, cx = D - Rc, halfW = (16 + 60 * k) * sc, half = Math.asin(Math.min(0.95, halfW / Rc));
  ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.heading * Math.PI / 180); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "butt"; ctx.lineJoin = "round";
  const arc = (a0: number, a1: number, w: number, col: string) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, 0, Rc, a0, a1); ctx.stroke(); };
  for (const sgn of [-1, 1]) { ctx.strokeStyle = `rgba(${C},${0.4 * k})`; ctx.lineWidth = 1.1 * sc; ctx.beginPath(); ctx.moveTo(27 * sc, sgn * 13 * sc); ctx.lineTo(cx + Rc * Math.cos(half), sgn * Rc * Math.sin(half)); ctx.stroke(); }      // thrown from the plate's two edges
  if (style === "hex") {
    const N = 7, step = 2 * half / N, r = Rc * step / Math.sqrt(3);
    for (let i = 0; i < N; i++) { const a = -half + step * (i + 0.5), px = cx + Rc * Math.cos(a), py = Rc * Math.sin(a), edge = 1 - 0.55 * Math.abs(i - (N - 1) / 2) / ((N - 1) / 2), sh = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.3);
      ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.beginPath(); for (let q = 0; q < 6; q++) { const an = q * Math.PI / 3; ctx.lineTo(Math.cos(an) * r * 0.62, Math.sin(an) * r * 0.98); } ctx.closePath();
      ctx.fillStyle = `rgba(${C},${(0.16 + 0.08 * sh) * k * edge + 0.5 * fl})`; ctx.fill(); ctx.strokeStyle = `rgba(232,252,255,${0.9 * k * edge})`; ctx.lineWidth = (1.5 + fl) * sc; ctx.stroke(); ctx.restore(); }
    arc(-half, half, (24 + 12 * fl) * sc, `rgba(${C},${0.06 * k + 0.12 * fl})`);
  } else {
    const N = 5, gap = 0.03;
    for (let i = 0; i < N; i++) { const a0 = -half + 2 * half * i / N + gap / 2, a1 = -half + 2 * half * (i + 1) / N - gap / 2, sh = 0.5 + 0.5 * Math.sin(t * 6 - Math.abs(i - 2) * 1.6);
      arc(a0, a1, (34 + 16 * fl) * sc, `rgba(${C},${0.055 * k + 0.1 * fl})`); arc(a0, a1, (13 + 8 * fl) * sc, `rgba(${C},${(0.13 + 0.05 * sh) * k + 0.25 * fl})`);
      arc(a0, a1, (5 + 2 * fl) * sc, `rgba(${C},${0.45 * k})`); arc(a0, a1, (2.0 + 1.2 * fl) * sc, `rgba(238,253,255,${0.97 * k})`); }
  }
  for (const sgn of [-1, 1]) { const px = cx + Rc * Math.cos(half), py = sgn * Rc * Math.sin(half); ctx.fillStyle = `rgba(238,253,255,${0.95 * k})`; ctx.beginPath(); ctx.moveTo(px + 4 * sc, py); ctx.lineTo(px, py + 4 * sc); ctx.lineTo(px - 4 * sc, py); ctx.lineTo(px, py - 4 * sc); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
// The shackles do not let him out of the block: at the limit a line of light snaps taut from his wrists back to the cell and hauls him off his feet.
function drawTether(ctx: SKRSContext2D, q: { x: number; y: number; ax: number; ay: number; age: number; dur: number }) {
  const u = q.age / q.dur, a = u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88, L = Math.hypot(q.ax - q.x, q.ay - q.y), th = Math.atan2(q.ay - q.y, q.ax - q.x), n = Math.max(6, Math.floor(L / 46));
  ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(th); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [w, col] of [[16, `rgba(70,170,255,${0.22 * a})`], [6, `rgba(120,205,255,${0.55 * a})`], [2, `rgba(235,250,255,${0.95 * a})`]] as [number, string][]) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 1; i <= n; i++) { const jit = i === n ? 0 : Math.sin(i * 12.9898 + Math.floor(q.age * 30) * 4.1) * 7 * (1 - u); ctx.lineTo(L * i / n, jit); } ctx.stroke(); }
  for (let i = 0; i < 3; i++) { const r = (18 + 26 * i) * Math.min(1, u * 5 + 0.2); ctx.strokeStyle = `rgba(150,215,255,${0.7 * a / (i + 1)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
export type Unit = { id: string; x: number; y: number; heading: number; gait?: Gait; look?: number; down?: boolean; guard?: number; stow?: number; swing?: number; slash?: number; sprite?: { img: Image; size: number; trail?: number[][] }; color?: string };
export type FrameState = {
  stuck?: { x: number; y: number; ang: number; alpha: number; color: string }[];
  t: number;                       // seconds, drives noise/flicker
  doors: Record<string, number>;   // id -> open fraction 0..1
  operators: Unit[];
  roster?: OperatorSpec[];         // callsign + kit per operator id
  footprints?: Footprint[];
  residues?: { e: EntityState; age: number }[];
  entity: Unit & { visible: number; glitch?: number; pose?: number; hidden?: number; reach?: number; trail?: { x: number; y: number }[] };
  explored: string[];              // room ids already revealed
  hud?: { label: string; clock: string; warn?: string; warnAlpha?: number };
  evac?: number;                   // 0..1 evacuation route overlay
  evacPath?: number[][];           // polyline ending at the exit
  unitScale?: number;              // operator/entity size for this map's scale
  species?: string;                // entity species id (thermal.ts)
  debugPlan?: boolean;             // outline plan walls/cars over the plate (alignment check)
  events?: { x: number; y: number; text: string; alpha: number }[];
  subtitle?: { who: string; text: string; alpha: number };
  staticAmt?: number;              // 0..1 transition interference
  camera?: { cx: number; cy: number; zoom: number }; // scene-space framing
  doorFx?: Record<string, DoorFx>;  // claimed / held / unprompted state per door
  shots?: Shot[];                   // gunfire in flight
  props?: Prop[];
  hudX?: HudExtras;                 // confidence, zone bar, countdown
  collapse?: number;                // 0..1 reconstruction breaking up; >=1 lapse closed (wireframe)
  shake?: number;                   // camera shake in px
  frozenAt?: number | null;         // entity motion halted: draw it as it was at this time
  pulse?: Pulse; boundary?: Boundary; swaps?: SwapFx[]; impacts?: Impact[]; pulseHud?: PulseHud; ropes?: Rope[];   // FILE 001
  mobs?: (EntityState & { species: string })[]; sounds?: SoundRing[];
};

const SW = 2048, SH = 1152;
type Seg = [number, number, number, number];

export async function loadPlates(xray: string, real: string) {
  return { xray: await loadImage(xray), real: await loadImage(real) };
}

function rectSegs(r: Rect): Seg[] {
  const { x, y, w, h } = r;
  return [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
}

function raySeg(ox: number, oy: number, dx: number, dy: number, s: Seg) {
  const [x1, y1, x2, y2] = s;
  const sx = x2 - x1, sy = y2 - y1;
  const den = dx * sy - dy * sx;
  if (Math.abs(den) < 1e-9) return Infinity;
  const t = ((x1 - ox) * sy - (y1 - oy) * sx) / den;
  const u = ((x1 - ox) * dy - (y1 - oy) * dx) / den;
  return t > 0 && u >= 0 && u <= 1 ? t : Infinity;
}

// visibility polygon of a cone, clipped by walls and closed doors
function conePoly(ox: number, oy: number, headingDeg: number, halfDeg: number, range: number, segs: Seg[]) {
  const pts: [number, number][] = [[ox, oy]];
  const n = 160;
  for (let i = 0; i <= n; i++) {
    const a = (headingDeg - halfDeg + (2 * halfDeg * i) / n) * Math.PI / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    let d = range;
    for (const s of segs) d = Math.min(d, raySeg(ox, oy, dx, dy, s));
    pts.push([ox + dx * d, oy + dy * d]);
  }
  return pts;
}

// door leaf end point for an open fraction f (0 closed along the wall, 1 swung 90deg into the room)
// closed leaf direction: +x for doors in horizontal walls, +y for vertical walls; it rotates by up to
// 90deg toward the swing side.
function leafAngles(d: any, f: number) {
  const a0 = d.axis === "v" ? Math.PI / 2 : 0;
  const turn = d.axis === "v" ? -d.swing : d.swing;
  return { a0, a1: a0 + turn * f * Math.PI / 2 };
}
function leafEnd(d: any, f: number): [number, number] {
  const { a1 } = leafAngles(d, f);
  return [d.hx + d.width * Math.cos(a1), d.hy + d.width * Math.sin(a1)];
}

// chevrons flowing along a polyline toward its last point
function drawEvac(ctx: SKRSContext2D, path: number[][], t: number, alpha: number) {
  const segs: { x: number; y: number; dx: number; dy: number; len: number; s0: number }[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [x, y] = path[i], dx = path[i + 1][0] - x, dy = path[i + 1][1] - y, len = Math.hypot(dx, dy);
    segs.push({ x, y, dx: dx / len, dy: dy / len, len, s0: total }); total += len;
  }
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(225,245,248,0.35)"; ctx.setLineDash([10, 12]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(path[0][0], path[0][1]); for (const p of path.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.setLineDash([]);
  for (let s = (t * 160) % 70; s < total; s += 70) {
    const sg = segs.find(q => s >= q.s0 && s < q.s0 + q.len)!; const u = s - sg.s0;
    const x = sg.x + sg.dx * u, y = sg.y + sg.dy * u, a = Math.min(1, s / 120, (total - s) / 120);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(sg.dy, sg.dx));
    ctx.strokeStyle = `rgba(235,250,252,${0.9 * a})`; ctx.lineWidth = 5; ctx.lineJoin = "miter";
    ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(6, 0); ctx.lineTo(-14, 18); ctx.stroke(); ctx.restore();
  }
  const [ex, ey] = path[path.length - 1];
  ctx.font = "bold 22px Consolas"; ctx.fillStyle = "rgba(235,250,252,0.95)"; ctx.fillText("EXIT", ex - 26, ey - 40);
  ctx.restore();
}

function poly(ctx: SKRSContext2D, pts: number[][]) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
}

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- units ----------
const UNIT_SCALE = 1.35;
function drawOperatorS2(ctx: SKRSContext2D, u: Unit) {
  ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.heading * Math.PI / 180); ctx.scale(UNIT_SCALE, UNIT_SCALE);
  const rim = "rgba(200,238,244,0.75)";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 16; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 7;
  ctx.fillStyle = "#23282a"; ctx.fillRect(-25, -13, 14, 26);              // backpack
  ctx.beginPath(); ctx.ellipse(-4, 0, 13, 24, 0, 0, Math.PI * 2); ctx.fillStyle = "#353b3e"; ctx.fill(); // shoulders
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = rim; ctx.lineWidth = 1.6; ctx.stroke(); ctx.strokeRect(-25, -13, 14, 26);
  ctx.strokeStyle = "#2c3235"; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-2, -18); ctx.lineTo(18, -3); ctx.moveTo(-2, 18); ctx.lineTo(22, 4); ctx.stroke(); // arms
  ctx.strokeStyle = "#0c0d0e"; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(52, 3); ctx.stroke(); // rifle
  ctx.beginPath(); ctx.arc(1, 0, 11, 0, Math.PI * 2); ctx.fillStyle = "#4a5154"; ctx.fill();   // helmet
  ctx.strokeStyle = rim; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = "#fff6dc"; ctx.shadowColor = "#ffe9b0"; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(52, 3, 3, 0, Math.PI * 2); ctx.fill(); // torch
  ctx.restore();
}

function drawOperatorS3(ctx: SKRSContext2D, u: Unit, t: number) {
  ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.heading * Math.PI / 180); ctx.scale(UNIT_SCALE, UNIT_SCALE);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  g.addColorStop(0, "rgba(220,245,255,0.55)"); g.addColorStop(1, "rgba(120,200,230,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowColor = "rgba(190,240,255,0.9)"; ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(225,245,250,0.92)";
  ctx.beginPath(); ctx.ellipse(-4, 0, 12, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(225,245,250,0.9)"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(18, -3); ctx.moveTo(-2, 16); ctx.lineTo(20, 3); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(120,150,160,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(46, 2); ctx.stroke(); // cold rifle
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(1, 0, 9.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTag(ctx: SKRSContext2D, u: Unit, color: string) {
  ctx.save(); ctx.translate(u.x, u.y);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, 34); ctx.lineTo(-40, 46); ctx.lineTo(-28, 46); ctx.stroke();
  ctx.font = "bold 22px Consolas"; ctx.fillStyle = color; ctx.fillText(u.id, -22, 54);
  ctx.restore();
}

// tall gaunt thing seen from above, facing +x: narrow torso, elongated head,
// over-long arms reaching forward, legs trailing back. Stays within ~±62px laterally.
function entityPath(ctx: SKRSContext2D, jitter: () => number) {
  ctx.beginPath(); ctx.ellipse(-4, 0, 24, 17, 0, 0, Math.PI * 2);
  ctx.moveTo(40, 0); ctx.ellipse(30, 0, 13, 8, 0, 0, Math.PI * 2);
}
function entityLimbs(ctx: SKRSContext2D, j: () => number) {
  const limbs = [[10, -15, 46, -48, 104, -40], [10, 15, 50, 52, 112, 30], [-24, -9, -58, -34, -102, -26], [-24, 9, -56, 36, -96, 44]];
  for (const [ax, ay, bx, by, cx, cy] of limbs) {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx + j() * 4, by + j() * 4); ctx.lineTo(cx + j() * 6, cy + j() * 6); ctx.stroke();
    // fingers
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (cx - bx) * 0.25 + k * 7, cy + (cy - by) * 0.25 + k * 7); ctx.stroke(); }
  }
}

function glitchJitter(e: FrameState["entity"], t: number) {
  const g = e.glitch ?? 0; if (g <= 0) return { dx: 0, dy: 0, a: 1 };
  const r = rng(Math.floor(t * 60) + 11);
  return { dx: (r() - 0.5) * 60 * g, dy: (r() - 0.5) * 10 * g, a: r() < 0.35 * g ? 0.15 : 1 };
}

function drawEntityS2(ctx: SKRSContext2D, e: FrameState["entity"], t: number) {
  if (e.visible <= 0.01) return;
  const r = rng(Math.floor(t * 12) + 7); const j = () => r() - 0.5;
  const gj = glitchJitter(e, t);
  ctx.save(); ctx.translate(e.x + gj.dx, e.y + gj.dy); ctx.rotate(e.heading * Math.PI / 180); ctx.globalAlpha = e.visible * gj.a;
  // offset ghost copies = signal instability
  for (const [ox, oy, col] of [[3, -2, "rgba(120,220,235,0.18)"], [-3, 2, "rgba(220,80,80,0.14)"]] as const) {
    ctx.save(); ctx.translate(ox + j() * 3, oy); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 7; ctx.lineCap = "round";
    entityPath(ctx, j); ctx.fill(); entityLimbs(ctx, j); ctx.restore();
  }
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 24;
  ctx.fillStyle = "#050607"; ctx.strokeStyle = "#050607"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
  entityPath(ctx, j); ctx.fill(); entityLimbs(ctx, j);
  ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(210,235,240,0.55)"; ctx.lineWidth = 1.6; entityPath(ctx, j); ctx.stroke();
  ctx.restore();
  // unidentified-signal marker (HUD semantics, red reserved for threat)
  ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = e.visible * (0.55 + 0.45 * Math.abs(Math.sin(t * 3)));
  ctx.strokeStyle = "#e0453c"; ctx.lineWidth = 2; const R = 132, k = 22;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath(); ctx.moveTo(sx * R, sy * (R * 0.62 - k)); ctx.lineTo(sx * R, sy * R * 0.62); ctx.lineTo(sx * (R - k), sy * R * 0.62); ctx.stroke();
  }
  ctx.font = "bold 20px Consolas"; const tw = ctx.measureText("UNK-1").width;
  ctx.fillStyle = "rgba(10,0,0,0.75)"; ctx.fillRect(-R - tw - 22, -R * 0.62, tw + 14, 28);
  ctx.fillStyle = "#e0453c"; ctx.fillText("UNK-1", -R - tw - 15, -R * 0.62 + 20);
  ctx.restore();
}

function drawEntityS3(ctx: SKRSContext2D, e0: FrameState["entity"], t: number) {
  if (e0.visible <= 0.01) return;
  const r = rng(Math.floor(t * 12) + 3); const j = () => r() - 0.5;
  const gj = glitchJitter(e0, t);
  const e = { ...e0, x: e0.x + gj.dx, y: e0.y + gj.dy, visible: e0.visible * gj.a };
  const ha = e.heading * Math.PI / 180;
  const trail = e.trail ?? [1, 2, 3, 4].map(i => ({ x: e.x - Math.cos(ha) * i * 16 + Math.sin(i * 1.3 + t * 2) * 4, y: e.y - Math.sin(ha) * i * 16 }));
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  trail.forEach((p, i) => {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(e.heading * Math.PI / 180);
    const a = 0.22 * (1 - i / trail.length) * e.visible;
    ctx.strokeStyle = `rgba(200,20,30,${a})`; ctx.fillStyle = `rgba(200,20,30,${a})`; ctx.lineWidth = 9; ctx.lineCap = "round";
    entityPath(ctx, j); ctx.fill(); entityLimbs(ctx, j); ctx.restore();
  });
  ctx.translate(e.x, e.y); ctx.rotate(e.heading * Math.PI / 180);
  const g = ctx.createRadialGradient(0, 0, 6, 0, 0, 150);
  g.addColorStop(0, `rgba(255,40,40,${0.45 * e.visible})`); g.addColorStop(1, "rgba(120,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = e.visible;
  ctx.shadowColor = "rgba(255,30,30,1)"; ctx.shadowBlur = 22;
  ctx.fillStyle = "#ff3a32"; ctx.strokeStyle = "#e3241f"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
  entityPath(ctx, j); ctx.fill(); entityLimbs(ctx, j);
  ctx.shadowBlur = 0; ctx.fillStyle = "#1a0000"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 12, 0, 0, Math.PI * 2); ctx.fill(); // cold core
  ctx.restore();
}

// red bracket that marks the live entity signal (HUD layer, sits on top of the map)
function drawEntityMarker(ctx: SKRSContext2D, e: FrameState["entity"], t: number) {
  if (e.visible <= 0.01 || (e.glitch ?? 0) > 0.3) return;
  ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = e.visible * (0.6 + 0.4 * Math.abs(Math.sin(t * 3)));
  const R = 120, k = 20; ctx.strokeStyle = "#ff3a32"; ctx.lineWidth = 2;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath(); ctx.moveTo(sx * R, sy * (R * 0.7 - k)); ctx.lineTo(sx * R, sy * R * 0.7); ctx.lineTo(sx * (R - k), sy * R * 0.7); ctx.stroke();
  }
  ctx.font = "bold 18px Consolas"; const w = ctx.measureText(e.id).width;
  ctx.fillStyle = "rgba(10,0,0,0.75)"; ctx.fillRect(R - w - 4, -R * 0.7 - 30, w + 12, 24);
  ctx.fillStyle = "#ff3a32"; ctx.fillText(e.id, R - w + 2, -R * 0.7 - 12);
  ctx.restore();
}

// ---------- post ----------
let noiseCache: Canvas[] = [];
export function noiseFrames(w: number, h: number) {
  if (noiseCache.length) return noiseCache;
  for (let k = 0; k < 6; k++) {
    const c = createCanvas(w, h), x = c.getContext("2d"); const id = x.createImageData(w, h); const r = rng(k * 99 + 1);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 22; }
    x.putImageData(id, 0, 0); noiseCache.push(c);
  }
  return noiseCache;
}

export function post(ctx: SKRSContext2D, W: number, H: number, t: number, tint: string) {
  ctx.drawImage(noiseFrames(W, H)[Math.floor(t * 24) % 6], 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.10)"; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
}

export function hud(ctx: SKRSContext2D, W: number, H: number, st: FrameState, accent: string) {
  if (!st.hud) return;
  const m = 34, L = 26;
  ctx.strokeStyle = "rgba(190,225,230,0.55)"; ctx.lineWidth = 2;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  }
  ctx.font = "18px Consolas"; ctx.fillStyle = "rgba(210,232,235,0.85)";
  ctx.fillText(st.hud.label, m + 14, m + 30);
  const blink = Math.floor(st.t * 2) % 2 === 0;
  ctx.fillStyle = blink ? "#d8312b" : "rgba(216,49,43,0.3)"; ctx.beginPath(); ctx.arc(W - m - 150, m + 24, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(210,232,235,0.85)"; ctx.fillText("REC " + st.hud.clock, W - m - 136, m + 30);
  // squad roster: identity color + glyph + callsign + status pips
  ctx.font = "bold 16px Consolas";
  let rx = m + 14;
  for (const o of st.operators) {
    const sp = st.roster?.find(r => r.id === o.id);
    const c = sp?.color ?? "#aac8cd", nm = sp?.callsign ?? o.id;
    drawIcon(ctx, sp?.icon, rx + 6, H - m - 19, 6, c);
    ctx.fillStyle = rgba(c, 0.95); ctx.fillText(nm, rx + 18, H - m - 13);
    const tw = ctx.measureText(nm).width;
    for (let k = 0; k < 4; k++) { ctx.fillStyle = rgba(c, k < 4 ? 0.8 : 0.2); ctx.fillRect(rx + 18 + k * 9, H - m - 6, 7, 3); }
    rx += 18 + Math.max(tw, 36) + 34;
  }
  if (st.hud.warn && (st.hud.warnAlpha ?? 1) > 0.01) {
    ctx.save(); ctx.globalAlpha = st.hud.warnAlpha ?? 1;
    ctx.font = "bold 24px Consolas"; const w = ctx.measureText(st.hud.warn).width + 36;
    ctx.fillStyle = "rgba(20,0,0,0.7)"; ctx.fillRect(W / 2 - w / 2, m + 2, w, 42);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - w / 2, m + 2, w, 42);
    ctx.fillStyle = accent; ctx.fillText(st.hud.warn, W / 2 - w / 2 + 18, m + 31);
    ctx.restore();
  }
  subtitle(ctx, W, H, st);
}

function subtitle(ctx: SKRSContext2D, W: number, H: number, st: FrameState) {
  const s = st.subtitle; if (!s || s.alpha <= 0.01) return;
  if ((s as any).portrait) {                                   // the line is given with a face: dossier photo, name, rank and job
    const sp = st.roster?.find(r => r.callsign === s.who), c = sp?.color ?? "#96e1eb", P = 132, pad = 16;
    ctx.save(); ctx.globalAlpha = s.alpha; ctx.font = "30px Consolas";
    const tw = Math.max(ctx.measureText(s.text).width, 380), w = pad + P + 24 + tw + 30, h = P + pad * 2, x = W / 2 - w / 2, y = H - 70 - h;
    ctx.fillStyle = "rgba(4,8,10,0.86)"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = rgba(c, 0.95); ctx.fillRect(x, y, 5, h);
    ctx.strokeStyle = rgba(c, 0.35); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    ctx.drawImage((s as any).portrait, x + pad, y + pad, P, P);
    ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 2; ctx.strokeRect(x + pad, y + pad, P, P);
    const tx = x + pad + P + 24;
    drawIcon(ctx, sp?.icon, tx + 9, y + pad + 17, 9, c);
    ctx.font = "bold 28px Consolas"; ctx.fillStyle = rgba(c, 0.98); ctx.fillText(s.who, tx + 28, y + pad + 27);
    const nw = ctx.measureText(s.who).width;
    ctx.font = "16px Consolas"; ctx.fillStyle = "rgba(150,180,186,0.85)"; ctx.fillText((s as any).tag ?? "", tx + 28 + nw + 18, y + pad + 25);
    ctx.fillStyle = "rgba(150,200,210,0.25)"; ctx.fillRect(tx, y + pad + 44, tw, 1.5);
    ctx.font = "30px Consolas"; ctx.fillStyle = "#eef4f5"; ctx.fillText(s.text, tx, y + pad + 96);
    ctx.restore(); return;
  }
  ctx.save(); ctx.globalAlpha = s.alpha;
  ctx.font = "bold 22px Consolas"; const who = s.who + "  ";
  ctx.font = "30px Consolas"; const tw = ctx.measureText(s.text).width;
  ctx.font = "bold 22px Consolas"; const ww = ctx.measureText(who).width;
  const w = tw + ww + 48, x = W / 2 - w / 2, y = H - 150;
  ctx.fillStyle = "rgba(4,8,10,0.78)"; ctx.fillRect(x, y, w, 56);
  const sp = st.roster?.find(r => r.callsign === s.who);
  const c = sp?.color ?? "#96e1eb";
  ctx.fillStyle = rgba(c, 0.95); ctx.fillRect(x, y, 4, 56);
  ctx.fillStyle = rgba(c, 0.95); ctx.fillText(who, x + 22, y + 36);
  ctx.font = "30px Consolas"; ctx.fillStyle = "#eef4f5"; ctx.fillText(s.text, x + 22 + ww, y + 38);
  ctx.restore();
}

function staticBurst(ctx: SKRSContext2D, W: number, H: number, t: number, amt: number) {
  if (amt <= 0.01) return;
  const r = rng(Math.floor(t * 60) + 5);
  ctx.save(); ctx.globalAlpha = amt;
  const nf = noiseFrames(W, H);
  for (let k = 0; k < 6; k++) ctx.drawImage(nf[(Math.floor(t * 60) + k) % 6], 0, 0);
  ctx.globalAlpha = amt * 0.8; ctx.fillStyle = "rgba(200,220,225,0.5)";
  for (let k = 0; k < 14; k++) ctx.fillRect(0, r() * H, W, 2 + r() * 18);
  ctx.globalAlpha = amt * 0.6; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------- bodycam ----------
export function renderSignalLost(t: number, label: string, clock: string, W = 1920, H = 1080) {
  const cv = createCanvas(W, H); const ctx = cv.getContext("2d");
  ctx.fillStyle = "#020304"; ctx.fillRect(0, 0, W, H);
  const r = rng(Math.floor(t * 60) + 21);
  ctx.globalAlpha = 0.5; ctx.drawImage(noiseFrames(W, H)[Math.floor(t * 30) % 6], 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(180,210,215,0.08)"; for (let k = 0; k < 5; k++) ctx.fillRect(0, r() * H, W, 1 + r() * 4);
  ctx.font = "bold 44px Consolas"; ctx.fillStyle = "rgba(215,235,238,0.9)";
  const txt = "NO SIGNAL"; ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H / 2);
  ctx.font = "20px Consolas"; ctx.fillStyle = "rgba(170,200,205,0.75)";
  ctx.fillText(label, W / 2 - ctx.measureText(label).width / 2, H / 2 + 40);
  ctx.fillText(clock, W / 2 - ctx.measureText(clock).width / 2, H / 2 + 68);
  return cv;
}

export function renderBodycam(src: Image, t: number, localT: number, label: string, clock: string, staticAmt: number, W = 1920, H = 1080, mode: "bodycam" | "cctv" = "bodycam", subSt?: Pick<FrameState, "subtitle" | "roster">) {
  const cv = createCanvas(W, H); const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const cctv = mode === "cctv";
  // bodycam: handheld micro-shake + slow push-in; cctv: locked-off with a very slow digital zoom
  const sx = cctv ? 0 : Math.sin(t * 7.1) * 6 + Math.sin(t * 13.7) * 3, sy = cctv ? 0 : Math.cos(t * 5.3) * 5 + Math.sin(t * 17.9) * 2;
  const z = cctv ? 1.0 + localT * 0.012 : 1.06 + localT * 0.025;
  const flick = cctv ? 0.97 + 0.03 * Math.sin(t * 90) : 0.9 + 0.1 * Math.sin(t * 41) * Math.sin(t * 7);
  ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z);
  ctx.filter = cctv ? `brightness(${flick}) contrast(1.2) grayscale(1)` : `brightness(${flick}) contrast(1.12) saturate(0.6)`;
  const sc = Math.max(W / src.width, H / src.height);
  ctx.drawImage(src, -src.width * sc / 2, -src.height * sc / 2, src.width * sc, src.height * sc);
  ctx.filter = "none"; ctx.restore();
  // fisheye-ish vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, cctv ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.85)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  post(ctx, W, H, t, "rgba(20,30,20,0.05)");
  ctx.font = "22px Consolas"; ctx.fillStyle = "rgba(235,240,235,0.9)";
  ctx.fillText(label, 44, 62);
  ctx.fillText(clock, W - 44 - ctx.measureText(clock).width, 62);
  const blink = Math.floor(t * 2) % 2 === 0;
  ctx.fillStyle = blink ? "#d8312b" : "rgba(216,49,43,0.3)"; ctx.beginPath(); ctx.arc(W - 44 - ctx.measureText(clock).width - 24, 54, 7, 0, Math.PI * 2); ctx.fill();
  if (subSt?.subtitle) subtitle(ctx, W, H, { ...subSt, t } as FrameState);
  staticBurst(ctx, W, H, t, staticAmt);
  return cv;
}

// ---------- main ----------
export function renderFrame(scene: any, plates: { xray: Image; real: Image }, style: Style, st: FrameState, W = 1920, H = 1080) {
  const closedLapse = (st.collapse ?? 0) >= 1;
  const frac = (d: any) => Math.min(1, (st.doors[d.id] ?? (d.open ? 1 : 0)) + (closedLapse ? 0 : doorJolt(d.id, st.doorFx?.[d.id], st.t)));
  const geo = buildGeometry({ ...scene, doors: scene.doors.map((d: any) => ({ ...d, open: frac(d) > 0.02 })) });
  const doorF: Record<string, number> = Object.fromEntries([...scene.doors, ...(scene.exitDoor ? [{ id: "EXIT", open: scene.exitDoor.open }] : [])].map((d: any) => [d.id, frac(d)]));
  const cv = createCanvas(W, H); const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.scale(W / SW, H / SH);
  const view = st.camera ? { x0: st.camera.cx - SW / (2 * st.camera.zoom), x1: st.camera.cx + SW / (2 * st.camera.zoom) } : { x0: 0, x1: SW };
  if (st.camera) {
    const { cx, cy, zoom } = st.camera;
    const sh = st.shake ?? 0, sx = sh ? Math.sin(st.t * 97) * sh : 0, sy = sh ? Math.cos(st.t * 83) * sh : 0;
    ctx.scale(zoom, zoom); ctx.translate(-(cx - SW / (2 * zoom)) + sx, -(cy - SH / (2 * zoom)) + sy);
  }

  // 1. X-ray base
  const wire = closedLapse ? 1 : 0;
  ctx.filter = style === "S2" ? "brightness(0.7) saturate(0.8)" : `brightness(${(0.85 * (1 - 0.82 * wire)).toFixed(3)}) saturate(${0.7 * (1 - wire)})`;
  const fit = (plates as any).fit ?? { sx: 1, sy: 1, dx: 0, dy: 0 };
  ctx.drawImage(plates.xray, fit.dx, fit.dy, plates.xray.width * fit.sx * (SW / plates.xray.width), plates.xray.height * fit.sy * (SH / plates.xray.height)); ctx.filter = "none";
  drawWireframe(ctx, geo.walls, wire, st.t);
  if (st.debugPlan) { ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 2; for (const w of geo.walls) ctx.strokeRect(w.x, w.y, w.w, w.h); for (const p of geo.props as any[]) if (p.type === "car") ctx.strokeRect(p.x, p.y, p.w, p.h); }

  // 2. unexplored rooms fall into darkness (map knowledge vs live signal)
  for (const r of geo.rooms) {
    if (st.explored.includes(r.id)) continue;
    const dark = style === "S2" ? 0.6 : 0.4;
    const R = r.rect;
    if (r.row) { // fade from the corridor side
      const top = r.row === "top";
      const g = ctx.createLinearGradient(0, top ? R.y + R.h : R.y, 0, top ? R.y : R.y + R.h);
      g.addColorStop(0, `rgba(0,0,0,${dark * 0.75})`); g.addColorStop(0.35, `rgba(0,0,0,${dark})`);
      ctx.fillStyle = g;
    } else ctx.fillStyle = `rgba(0,0,0,${dark})`;
    ctx.fillRect(R.x, R.y, R.w, R.h);
  }

  // occluders
  const segs: Seg[] = geo.walls.flatMap(rectSegs);
  for (const d of geo.doors) { const [ex, ey] = leafEnd(d, doorF[d.id]); segs.push([d.hx, d.hy, ex, ey]); }

  // 3. S2: flashlight cones reveal the real-material plate
  if (style === "S2") {
    const lit = createCanvas(SW, SH); const lc = lit.getContext("2d");
    for (const o of st.operators) {
      const a = o.heading * Math.PI / 180, mx = o.x + Math.cos(a) * 70, my = o.y + Math.sin(a) * 70;
      const flick = 0.92 + 0.08 * Math.sin(st.t * 37 + o.x);
      const R = 680;
      const p = conePoly(mx, my, o.heading, 16, R, segs);
      const g = lc.createRadialGradient(mx, my, 10, mx, my, R);
      g.addColorStop(0, `rgba(255,255,255,${flick})`); g.addColorStop(0.5, `rgba(255,255,255,${0.7 * flick})`); g.addColorStop(1, "rgba(255,255,255,0)");
      lc.fillStyle = g; poly(lc, p); lc.fill();
      // small ambient pool around the operator
      const g2 = lc.createRadialGradient(o.x, o.y, 0, o.x, o.y, 95);
      g2.addColorStop(0, "rgba(255,255,255,0.35)"); g2.addColorStop(1, "rgba(255,255,255,0)");
      lc.fillStyle = g2; lc.beginPath(); lc.arc(o.x, o.y, 95, 0, Math.PI * 2); lc.fill();
    }
    const mask = createCanvas(SW, SH); const mc = mask.getContext("2d");
    mc.filter = "blur(6px)"; mc.drawImage(lit, 0, 0); mc.filter = "none";
    const realL = createCanvas(SW, SH); const rc = realL.getContext("2d");
    rc.filter = "brightness(1.05) sepia(0.25) saturate(0.85)"; rc.drawImage(plates.real, 0, 0, SW, SH); rc.filter = "none";
    rc.globalCompositeOperation = "destination-in"; rc.drawImage(mask, 0, 0);
    ctx.drawImage(realL, 0, 0);
    // warm bloom
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.10;
    ctx.filter = "blur(18px) sepia(1)"; ctx.drawImage(mask, 0, 0); ctx.filter = "none";
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  // 4. doors (procedural, X-ray look)
  for (const d of geo.doors) {
    const f = doorF[d.id]; const [ex, ey] = leafEnd(d, f);
    if ((d as any).heavy) continue;                       // drawn after the pulse, as a slab
    ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(150,190,200,0.45)"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(d.hx, d.hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.shadowColor = "rgba(120,230,245,0.9)"; ctx.shadowBlur = 10; ctx.strokeStyle = "rgba(160,240,248,0.95)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(d.hx, d.hy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
    if (f > 0.02) { // swing arc
      ctx.strokeStyle = "rgba(150,235,245,0.25)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
      const { a0, a1 } = leafAngles(d, f);
      ctx.beginPath(); ctx.arc(d.hx, d.hy, d.width, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  if (!closedLapse) for (const d of geo.doors) drawDoorFx(ctx, d as any, leafEnd(d, doorF[d.id]), st.doorFx?.[d.id], st.t);
  drawProps(ctx, st.props ?? [], st.t);
  if (!closedLapse) drawPulse(ctx, st.pulse, st.boundary, st.t);
  for (const d of geo.doors) if ((d as any).heavy) {
    if ((d as any).art && (d as any)._img) {             // a double door from a picture: the top half slides up, the bottom half down, each out of sight behind the frame
      const a = (d as any).art, img = (d as any)._img, f = doorF[d.id], hh = a.h / 2, ih = img.height / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(a.x - 4, a.y, a.w + 8, a.h); ctx.clip();
      ctx.drawImage(img, 0, 0, img.width, ih, a.x, a.y - f * hh, a.w, hh); ctx.drawImage(img, 0, ih, img.width, ih, a.x, a.y + hh + f * hh, a.w, hh);
      if (f < 0.04) { ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(255,214,90,0.5)"; ctx.shadowColor = "rgba(255,200,60,1)"; ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.strokeRect(a.x + 3, a.y + 3, a.w - 6, a.h - 6); }
      ctx.restore();
    } else if ((d as any).slide) {                       // a sliding slab in a heavy steel frame: it runs back into the housing beside the opening, not into the room
      const [cx, cy] = leafEnd(d, 0), L = Math.hypot(cx - d.hx, cy - d.hy) || 1, ux = (cx - d.hx) / L, uy = (cy - d.hy) / L, o = doorF[d.id] * (L + 4);
      drawHeavyDoor(ctx, d.hx - ux * o, d.hy - uy * o, cx - ux * o, cy - uy * o, doorF[d.id], st.t, true);
      ctx.save(); ctx.translate(d.hx, d.hy); ctx.rotate(Math.atan2(uy, ux));
      const block = (x0: number, len: number, slot: boolean) => {      // drawn over the slab, so the slab goes out of sight inside it
        ctx.shadowColor = "rgba(120,230,245,0.55)"; ctx.shadowBlur = 12; ctx.fillStyle = "rgba(30,60,68,1)"; ctx.beginPath(); ctx.roundRect(x0, -38, len, 76, 4); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(170,228,238,0.95)"; ctx.lineWidth = 2.6; ctx.stroke(); ctx.fillStyle = "rgba(52,92,102,1)"; ctx.fillRect(x0 + 6, -31, len - 12, 62);
        if (slot) { ctx.fillStyle = "rgba(6,14,17,0.95)"; ctx.fillRect(x0 + 10, -9, len - 10, 18); ctx.strokeStyle = "rgba(150,210,222,0.7)"; ctx.lineWidth = 1.2; ctx.strokeRect(x0 + 10, -9, len - 10, 18); }
        ctx.fillStyle = "rgba(220,244,250,0.9)"; for (let x = x0 + 12; x < x0 + len - 6; x += 26) for (const y of [-25, 25]) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill(); } };
      block(-(L + 22), L + 22, true); block(L, 86, false); ctx.restore();
    } else { const [ex, ey] = leafEnd(d, doorF[d.id]); drawHeavyDoor(ctx, d.hx, d.hy, ex, ey, doorF[d.id], st.t); }
  }
  drawRopes(ctx, st.ropes ?? [], st.t);

  // 4b. thermal floor residue (S3): footprints and the heat an entity leaves behind
  if (style === "S3") {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; drawFootprints(ctx, st.footprints ?? []); ctx.restore();
    if (!closedLapse) for (const r of st.residues ?? []) drawResidue(ctx, r.e, r.age, 2.6, st.species, st.unitScale ?? 1);
  }

  // 5. evacuation route: chevrons flowing toward the exit
  if ((st.evac ?? 0) > 0.01) {
    const path = st.evacPath ?? [[1000, (scene.corridor.y0 + scene.corridor.y1) / 2], [scene.exit.x - 60, (scene.corridor.y0 + scene.corridor.y1) / 2]];
    drawEvac(ctx, path, st.t, st.evac!);
  }

  // 6. entity, 7. operators
  if (style === "S2") {
    drawEntityS2(ctx, st.entity, st.t);
    for (const o of st.operators) drawOperatorS2(ctx, o);
    for (const o of st.operators) drawTag(ctx, o, "rgba(160,225,235,0.85)");
  } else {
    if (!closedLapse) {
      for (const g of (st as any).ghosts ?? []) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = g.alpha; drawSprite(ctx, g); ctx.restore(); }     // the trail of something moving fast
      for (const m of st.mobs ?? []) {
        if ((m as any).sprite) { ctx.save(); ctx.globalAlpha = Math.min(1, m.visible); drawSprite(ctx, m as any, "#eafcff", (m as any).flash ?? 0); ctx.restore(); }      // heat going out = the picture fading
        else drawEntityThermal(ctx, m, st.t + m.x * 0.013, false, m.species, st.unitScale ?? 1);
      }
      if (st.entity.sprite) {
        if (st.entity.visible > 0.01) {
          drawSprite(ctx, st.entity, "#eafcff", (st.entity as any).flash ?? 0);
          for (const q of st.stuck ?? []) {                    // a shaft standing out of it: only the part outside the body is drawn, the head is buried
            const c = Math.cos(q.ang), s = Math.sin(q.ang), n = 30;
            ctx.save(); ctx.globalAlpha = q.alpha; ctx.lineCap = "butt";
            ctx.strokeStyle = "rgba(6,14,16,0.75)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(q.x + c * 5, q.y + s * 5); ctx.lineTo(q.x - c * n, q.y - s * n); ctx.stroke();
            ctx.strokeStyle = rgba(q.color, 1); ctx.lineWidth = 2.8; ctx.shadowColor = q.color; ctx.shadowBlur = 6; ctx.beginPath(); ctx.moveTo(q.x + c * 5, q.y + s * 5); ctx.lineTo(q.x - c * n, q.y - s * n); ctx.stroke(); ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(240,252,255,0.95)"; ctx.lineWidth = 1.6;
            for (const k of [0, 5]) for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(q.x - c * (n - k), q.y - s * (n - k)); ctx.lineTo(q.x - c * (n + 7 - k) - s * 5.5 * sg, q.y - s * (n + 7 - k) + c * 5.5 * sg); ctx.stroke(); }
            ctx.restore();
          }
        }
      } else drawEntityThermal(ctx, st.entity, st.frozenAt ?? st.t, false, st.species, st.unitScale ?? 1);
      drawEntityMarker(ctx, st.entity, st.t);
    }
    const spec = (id: string): OperatorSpec => st.roster?.find(r => r.id === id) ?? { id, callsign: id, kit: "recon", build: 1 };
    for (const o of st.operators) if (!o.down && !o.sprite) drawIdentityArc(ctx, o, spec(o.id), st.unitScale ?? 1);
    for (const o of st.operators) { ctx.save(); if (o.down) ctx.globalAlpha = 0.62; if (o.sprite) { drawSprite(ctx, o, spec(o.id).color ?? "#eafcff"); if ((o.guard ?? 0) > 0.02) drawLightShield(ctx, o, o.guard!, st.unitScale ?? 1, (st as any).shieldStyle ?? "wall", st.t); } else drawOperatorThermal(ctx, o, spec(o.id), st.t, st.unitScale ?? 1); ctx.restore(); }
    // callsign labels: stack downward instead of overlapping
    const placed: Rect[] = [];
    for (const o of [...st.operators].sort((p, q) => p.y - q.y)) {
      if (o.x < view.x0 - 20 || o.x > view.x1 + 20) continue;      // off-screen: no label parked at the edge
      const bw = callsignWidth(ctx, spec(o.id)); let dy = 0;
      const lx = Math.max(o.x - 48 - bw, view.x0 + 12);       // pushed inward at the left edge of the view
      const box = () => ({ x: lx, y: o.y + 32 + dy, w: bw, h: 24 });
      const hit = (a: Rect) => placed.some(b => a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6 && a.y < b.y + b.h + 3 && b.y < a.y + a.h + 3);
      for (let n = 0; n < 6 && hit(box()); n++) dy += 27;
      placed.push(box()); drawCallsign(ctx, o, spec(o.id), dy, view.x0 + 12);
    }
  }

  drawSounds(ctx, st.sounds ?? []);
  drawGunfire(ctx, st.shots ?? []);
  drawImpacts(ctx, st.impacts ?? []);
  for (const q of (st as any).tethers ?? []) drawTether(ctx, q);
  drawOrdnance(ctx, (st as any).ordnance);
  drawSwap(ctx, st.swaps ?? []);

  // 8. map event tags (e.g. a door state change)
  for (const ev of st.events ?? []) {
    if (ev.alpha <= 0.01) continue;
    ctx.save(); ctx.globalAlpha = ev.alpha; ctx.font = "bold 20px Consolas";
    const w = ctx.measureText(ev.text).width + 20, sd = ev.x + 52 + w > view.x1 - 12 ? -1 : 1;   // flip left at the right edge
    const bx = sd > 0 ? ev.x + 52 : ev.x - 52 - w;
    ctx.strokeStyle = "rgba(235,250,252,0.8)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ev.x, ev.y); ctx.lineTo(ev.x + 40 * sd, ev.y - 40); ctx.lineTo(ev.x + 52 * sd, ev.y - 40); ctx.stroke();
    ctx.fillStyle = "rgba(4,10,12,0.8)"; ctx.fillRect(bx, ev.y - 56, w, 30);
    ctx.fillStyle = "#eaf7f9"; ctx.fillText(ev.text, bx + 10, ev.y - 34);
    ctx.restore();
  }

  ctx.restore();
  const c = st.collapse ?? 0; if (c > 0 && c < 1) applyCollapse(cv, c, st.t);
  post(ctx, W, H, st.t, style === "S2" ? "rgba(10,30,40,0.06)" : "rgba(0,20,30,0.08)");
  hud(ctx, W, H, st, style === "S2" ? "#e0453c" : "#ff3a32");
  if (st.hudX) drawHudExtras(ctx, W, H, st.t, st.hudX);
  if (st.pulseHud) drawPulseHud(ctx, W, H, st.t, st.pulseHud);
  if ((st as any).equip) drawEquipCard(ctx, W, H, st.t, (st as any).equip);
  staticBurst(ctx, W, H, st.t, st.staticAmt ?? 0);
  return cv;
}
