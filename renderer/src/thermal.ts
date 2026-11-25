// S3 thermal look: distinct operators (kit, build, gait) and an animated entity species.
// All drawing is in scene space, facing +x before rotation.
import type { SKRSContext2D } from "@napi-rs/canvas";

export type Kit = "shield" | "radio" | "recon";
export type Icon = "tri" | "square" | "diamond" | "circle";
export type OperatorSpec = { id: string; callsign: string; kit: Kit; build: number; color?: string; icon?: Icon };
export type Gait = { phase: number; moving: number }; // phase in radians, moving 0..1
export type ThermalUnit = { id: string; x: number; y: number; heading: number; gait?: Gait; look?: number };
export type Footprint = { x: number; y: number; heading: number; age: number; side: number; color?: string };

// small identity glyph, also used by the HUD and subtitles
export function drawIcon(ctx: SKRSContext2D, kind: Icon | undefined, x: number, y: number, r: number, color: string, fill = true) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  if (kind === "tri") { ctx.moveTo(0, -r); ctx.lineTo(r * 0.95, r * 0.75); ctx.lineTo(-r * 0.95, r * 0.75); ctx.closePath(); }
  else if (kind === "square") ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  else if (kind === "diamond") { ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); }
  else ctx.arc(0, 0, r * 0.85, 0, TAU);
  if (fill) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}

// hex "#rrggbb" -> "rgba(r,g,b,a)"
export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// colored arc in front of the operator: identity + facing at a glance (not a full ring)
export function drawIdentityArc(ctx: SKRSContext2D, u: ThermalUnit, spec: OperatorSpec, mapScale = 1) {
  if (!spec.color) return;
  const R = 38 * S * mapScale, a = u.heading * Math.PI / 180, half = 0.62;
  ctx.save(); ctx.translate(u.x, u.y); ctx.lineCap = "round";
  ctx.shadowColor = spec.color; ctx.shadowBlur = 10;
  ctx.strokeStyle = rgba(spec.color, 0.95); ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(0, 0, R, a - half, a + half); ctx.stroke();
  ctx.shadowBlur = 0;
  // small chevron at the arc's center = heading
  ctx.fillStyle = spec.color; ctx.translate(Math.cos(a) * (R + 7), Math.sin(a) * (R + 7)); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5.5); ctx.lineTo(-4, 5.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

const HOT = "rgba(236,250,255,0.96)";
const WARM = "rgba(150,215,230,0.85)";
const COLD = "rgba(28,48,54,0.96)";
const COLD_RIM = "rgba(120,180,190,0.55)";
const S = 1.35;

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const TAU = Math.PI * 2;

// ---------------- operators ----------------
export function drawFootprints(ctx: SKRSContext2D, fps: Footprint[], life = 3.2) {
  for (const f of fps) {
    const a = Math.max(0, 1 - f.age / life); if (a <= 0) continue;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.heading * Math.PI / 180);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
    g.addColorStop(0, f.color ? rgba(f.color, 0.42 * a * a) : `rgba(190,240,250,${0.42 * a * a})`); g.addColorStop(1, "rgba(120,200,220,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

export function drawOperatorThermal(ctx: SKRSContext2D, u: ThermalUnit, spec: OperatorSpec, t: number, mapScale = 1) {
  const g = u.gait ?? { phase: 0, moving: 0 };
  const breath = 1 + 0.03 * Math.sin(t * 2.4 + u.x * 0.01);
  const sway = Math.sin(g.phase) * 2.2 * g.moving;          // shoulder roll while walking
  const shW = 21 * spec.build, shD = 12 * spec.build;

  ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.heading * Math.PI / 180); ctx.scale(S * mapScale, S * mapScale);

  // body heat halo
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 46 * breath);
  halo.addColorStop(0, "rgba(170,230,250,0.22)"); halo.addColorStop(1, "rgba(80,170,200,0)");
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 46 * breath, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // legs: only show past the torso when walking (stride alternates)
  if (g.moving > 0.05) {
    const st = Math.sin(g.phase) * 19 * g.moving;
    ctx.fillStyle = WARM; ctx.shadowColor = "rgba(170,230,245,0.7)"; ctx.shadowBlur = 8;
    for (const [side, k] of [[-1, 1], [1, -1]]) {
      ctx.beginPath(); ctx.ellipse(-4 + st * k, side * 8, 10, 5, 0, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // cold gear behind the body
  if (spec.kit === "radio") {
    ctx.fillStyle = COLD; ctx.strokeStyle = COLD_RIM; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-34, -15, 22, 30, 4); ctx.fill(); ctx.stroke();
    const w = Math.sin(t * 5 + g.phase) * 4;                 // whip antenna wobble
    ctx.strokeStyle = "rgba(170,215,225,0.85)"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-30, -11); ctx.quadraticCurveTo(-56, -24 + w, -80, -34 + w * 1.8); ctx.stroke();
    ctx.fillStyle = "rgba(200,235,245,0.9)"; ctx.beginPath(); ctx.arc(-80, -34 + w * 1.8, 2.4, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = COLD; ctx.strokeStyle = COLD_RIM; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-27, -11, 13, 22, 3); ctx.fill(); ctx.stroke();
  }

  // hot torso
  ctx.save(); ctx.rotate(sway * 0.03);
  const tg = ctx.createRadialGradient(-2, 0, 2, -2, 0, shW + 4);
  tg.addColorStop(0, "rgba(255,255,255,1)"); tg.addColorStop(0.6, HOT); tg.addColorStop(1, "rgba(150,215,230,0.9)");
  ctx.fillStyle = tg; ctx.shadowColor = "rgba(190,240,255,0.9)"; ctx.shadowBlur = 14;
  // shoulders: rounded trapezoid, wider than deep, so heading reads at a glance
  ctx.beginPath();
  ctx.moveTo(-shD - 2, -shW * 0.8); ctx.quadraticCurveTo(-shD, -shW - 2, -2, -shW);
  ctx.quadraticCurveTo(shD * 0.9, -shW * 0.85, shD * 0.8, 0);
  ctx.quadraticCurveTo(shD * 0.9, shW * 0.85, -2, shW);
  ctx.quadraticCurveTo(-shD, shW + 2, -shD - 2, shW * 0.8); ctx.closePath();
  ctx.save(); ctx.scale(breath, 1); ctx.fill(); ctx.restore(); ctx.shadowBlur = 0;
  // cold plate carrier on the back/chest: a darker band across the torso
  ctx.fillStyle = "rgba(60,110,122,0.55)"; ctx.fillRect(-shD + 1, -shW * 0.55, shD * 0.9, shW * 1.1);

  // arms + weapon/shield (arms warm, gear cold)
  ctx.strokeStyle = WARM; ctx.lineWidth = 6.5; ctx.lineCap = "round";
  if (spec.kit === "shield") {
    ctx.beginPath(); ctx.moveTo(-2, -shW + 3); ctx.lineTo(20, -10); ctx.moveTo(-2, shW - 3); ctx.lineTo(16, 10); ctx.stroke();
    ctx.strokeStyle = COLD; ctx.lineWidth = 10; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(-6, 0, 34, -1.1, 1.1); ctx.stroke();   // ballistic shield (cold arc in front)
    ctx.strokeStyle = "rgba(150,210,222,0.8)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-6, 0, 39.5, -1.1, 1.1); ctx.stroke();
    ctx.fillStyle = "rgba(190,235,245,0.9)"; ctx.fillRect(27, -2.5, 3, 5); // view-port slit
    ctx.strokeStyle = COLD; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(10, 9); ctx.lineTo(30, 9); ctx.stroke(); // pistol
  } else {
    const len = spec.kit === "recon" ? 44 : 50;
    ctx.beginPath(); ctx.moveTo(-2, -shW + 3); ctx.lineTo(18, -3); ctx.moveTo(-2, shW - 3); ctx.lineTo(24, 3); ctx.stroke();
    ctx.strokeStyle = COLD; ctx.lineWidth = spec.kit === "radio" ? 5 : 4; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(len, 2); ctx.stroke();
    ctx.strokeStyle = COLD_RIM; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();

  // head: cold helmet disc with a hot face crescent showing where they look
  const look = (u.look ?? 0) * Math.PI / 180;
  ctx.save(); ctx.rotate(look);
  // hot face/neck forward, smaller cool helmet shell set back: reads as a head, not an eye
  ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(220,250,255,1)"; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.ellipse(3, 0, 9, 8.5, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(120,175,188,0.95)"; ctx.beginPath(); ctx.ellipse(-2, 0, 7.5, 8, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(40,70,78,0.9)"; ctx.lineWidth = 1.4; ctx.stroke();
  if (spec.kit === "recon") { // helmet lamp + bodycam: small hot points
    ctx.fillStyle = "#ffffff"; ctx.shadowColor = "#e8fbff"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(2, -8.5, 2.2, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  }
  if (spec.kit === "shield") { // NVG mount: a cold bar forward of the helmet
    ctx.fillStyle = COLD; ctx.fillRect(6, -4, 7, 8);
  }
  ctx.restore();
  ctx.restore();
}

export function callsignWidth(ctx: SKRSContext2D, spec: OperatorSpec) {
  ctx.save(); ctx.font = "bold 18px Consolas"; const w = ctx.measureText(spec.callsign).width; ctx.restore();
  return w + 34;
}

// dy pushes the label down when it would collide with a teammate's (leader line follows)
export function drawCallsign(ctx: SKRSContext2D, u: ThermalUnit, spec: OperatorSpec, dy = 0, minX = -Infinity) {
  ctx.save(); ctx.translate(u.x, u.y);
  const c = spec.color ?? "#aae6f0";
  ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-26, 30); ctx.lineTo(-38, 44 + dy); ctx.lineTo(-44, 44 + dy); ctx.stroke();
  ctx.font = "bold 18px Consolas";
  const bw = callsignWidth(ctx, spec), x0 = Math.max(-48 - bw, minX - u.x);   // pushed inward at the view edge
  ctx.fillStyle = "rgba(3,10,12,0.8)"; ctx.fillRect(x0, 32 + dy, bw, 24);
  ctx.fillStyle = c; ctx.fillRect(x0, 32 + dy, 3, 24);                       // color spine
  drawIcon(ctx, spec.icon, x0 + 15, 44 + dy, 6, c);
  ctx.fillStyle = c; ctx.fillText(spec.callsign, x0 + 26, 50 + dy);
  ctx.restore();
}

// entity species live in entities.ts
export { drawEntityThermal, drawResidue, SPECIES, type EntityState } from "./entities.ts";
