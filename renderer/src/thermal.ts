// S3 thermal look: distinct operators (kit, build, gait) and an animated entity species.
// All drawing is in scene space, facing +x before rotation.
import type { SKRSContext2D } from "@napi-rs/canvas";

export type Kit = "shield" | "radio" | "recon";
export type Icon = "tri" | "square" | "diamond" | "circle" | "cross" | "arrow";
export type OperatorSpec = { id: string; callsign: string; kit: Kit; build: number; color?: string; icon?: Icon };
export type Gait = { phase: number; moving: number }; // phase in radians, moving 0..1
export type ThermalUnit = { id: string; x: number; y: number; heading: number; gait?: Gait; look?: number; guard?: number };
export type Footprint = { x: number; y: number; heading: number; age: number; side: number; color?: string };

// small identity glyph, also used by the HUD and subtitles
export function drawIcon(ctx: SKRSContext2D, kind: Icon | undefined, x: number, y: number, r: number, color: string, fill = true) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  if (kind === "tri") { ctx.moveTo(0, -r); ctx.lineTo(r * 0.95, r * 0.75); ctx.lineTo(-r * 0.95, r * 0.75); ctx.closePath(); }
  else if (kind === "square") ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  else if (kind === "diamond") { ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); }
  else if (kind === "cross") { const a = r * 0.36; ctx.rect(-a, -r, 2 * a, 2 * r); ctx.rect(-r, -a, 2 * r, 2 * a); }
  else if (kind === "arrow") { ctx.moveTo(r * 1.1, 0); ctx.lineTo(-r * 0.2, -r * 0.9); ctx.lineTo(-r * 0.2, -r * 0.3); ctx.lineTo(-r, -r * 0.3); ctx.lineTo(-r, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.3); ctx.lineTo(-r * 0.2, r * 0.9); ctx.closePath(); }
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


// ---------------- kit: every weapon is drawn as what it is, so it can be told apart from above ----------------
const STEEL = "rgba(38,64,72,1)", STEEL2 = "rgba(62,100,110,1)", EDGE = "rgba(178,224,234,0.95)", BRIGHT = "rgba(226,245,250,0.96)";
function part(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r = 1.2, fill = STEEL) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.stroke();
}
// facing +x, in the operator's own space (shoulders at y = +-21). Also used alone on the design boards.
// guard (0..1): shield 0 = carried on the left arm, 1 = squared up and pushed forward;
// crossbow kit 0 = crossbow in hand, 1 = tomahawk in hand. Only one of the two is ever shown.
export function drawKit(ctx: SKRSContext2D, kit: string, idc: string, guard = 0) {
  ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "butt";
  if (kit === "shield") {
    const y = 22, g = guard, lerp = (p: number, q: number) => p + (q - p) * g;
    ctx.save(); ctx.translate(-9 * g, 1.5 * g);             // pump shotgun in the right hand; drawn back behind the shield on guard
    part(ctx, 26, y - 1.7, 23, 3.4, 1);                     // barrel
    part(ctx, 26, y + 1.9, 18, 2.8, 1);                     // magazine tube under it
    part(ctx, 1, y - 3, 11, 6, 2.5);                        // stock
    part(ctx, 12, y - 3.8, 14, 7.6, 1.5);                   // receiver
    part(ctx, 30, y - 2.6, 10, 8, 2, STEEL2);               // pump fore-end
    ctx.restore();
    // tower shield: the one piece of kit that is lit. Carried, it hangs on the left arm and covers the front-left;
    // on guard it is squared to the front, pushed out, and its edge burns brighter.
    const R = 43, A0 = lerp(-1.32, -1.1), A1 = lerp(0.42, 1.1), sx = lerp(-8, -2);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(14,30,36,0.98)"; ctx.lineWidth = 15 + 2 * g; ctx.beginPath(); ctx.arc(sx, 0, R, A0, A1); ctx.stroke();
    ctx.shadowColor = idc; ctx.shadowBlur = 16 + 14 * g;
    ctx.strokeStyle = rgba(idc, 0.9); ctx.lineWidth = 6 + 2 * g; ctx.beginPath(); ctx.arc(sx, 0, R + 3.5, A0, A1); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = BRIGHT; ctx.lineWidth = 1.8 + g; ctx.beginPath(); ctx.arc(sx, 0, R + 6.5 + g, A0 + 0.04, A1 - 0.04); ctx.stroke();
    ctx.strokeStyle = rgba(idc, 0.55); ctx.lineWidth = 1.4;
    for (let k = 0; k < 5; k++) { const an = A0 + (A1 - A0) * (k + 0.5) / 5; ctx.beginPath(); ctx.moveTo(sx + Math.cos(an) * (R - 6), Math.sin(an) * (R - 6)); ctx.lineTo(sx + Math.cos(an) * (R + 6), Math.sin(an) * (R + 6)); ctx.stroke(); }
    ctx.fillStyle = BRIGHT; ctx.fillRect(sx + R - 4, -3, 5, 6);                     // view port
  } else if (kit === "crossbow") {
    if (guard >= 0.5) {
      // tomahawk in the right hand, carried forward ready to strike: handle, poll, bearded blade with a bright edge
      ctx.save(); ctx.translate(13, 9); ctx.rotate(-0.16);
      part(ctx, -6, -1.8, 40, 3.6, 1.6, "rgba(56,84,90,1)");                         // handle
      part(ctx, 26, -5.6, 7, 3.8, 1, STEEL2);                                          // poll
      ctx.beginPath(); ctx.moveTo(25.5, 1.8); ctx.lineTo(33.5, 1.8); ctx.lineTo(38, 14.5); ctx.quadraticCurveTo(29, 20, 19.5, 14.5); ctx.closePath();
      ctx.fillStyle = "rgba(150,196,206,1)"; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.strokeStyle = BRIGHT; ctx.lineWidth = 2.4; ctx.shadowColor = idc; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(38, 14.5); ctx.quadraticCurveTo(29, 20, 19.5, 14.5); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.restore();
    } else {
    // crossbow: stock, rail, recurve limbs, drawn string, a bolt on the rail, a line reel under it
    part(ctx, -4, -2.6, 17, 5.2, 2);
    part(ctx, 13, -2, 33, 4, 1);
    ctx.lineCap = "round";
    const limbs = () => { ctx.beginPath(); ctx.moveTo(29, -27); ctx.quadraticCurveTo(47, 0, 29, 27); ctx.stroke(); };
    ctx.strokeStyle = EDGE; ctx.lineWidth = 6.4; limbs(); ctx.strokeStyle = STEEL2; ctx.lineWidth = 4.2; limbs();
    ctx.strokeStyle = rgba(idc, 0.95); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(29, -27); ctx.lineTo(15, 0); ctx.lineTo(29, 27); ctx.stroke();
    ctx.strokeStyle = BRIGHT; ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(53, 0); ctx.stroke();
    ctx.fillStyle = BRIGHT; ctx.beginPath(); ctx.moveTo(59, 0); ctx.lineTo(52, -3.2); ctx.lineTo(52, 3.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(22, 7.5, 4.6, 0, TAU); ctx.fillStyle = STEEL2; ctx.fill(); ctx.strokeStyle = EDGE; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.strokeStyle = rgba(idc, 0.9); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(22, 7.5, 2.2, 0, TAU); ctx.stroke();
    }
  } else if (kit === "recon") {
    const y = 3;                                            // long bolt-action rifle with a scope and a bipod
    part(ctx, 22, y - 1.15, 41, 2.3, 1);                    // barrel
    part(ctx, 62, y - 2.6, 5.5, 5.2, 1);                    // muzzle brake
    ctx.strokeStyle = EDGE; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(50, y - 8.5); ctx.moveTo(42, y); ctx.lineTo(50, y + 8.5); ctx.stroke();   // bipod
    part(ctx, -7, y - 2.7, 16, 5.4, 2.5);                   // stock
    part(ctx, 9, y - 3.2, 14, 6.4, 1.5);                    // receiver
    part(ctx, 9, y - 1.6, 19, 3.2, 1.5, BRIGHT);            // scope tube
    part(ctx, 6, y - 2.6, 4.5, 5.2, 1.2, BRIGHT); part(ctx, 26, y - 2.9, 5, 5.8, 1.2, BRIGHT);   // scope bells
    part(ctx, -11, 15.5, 10, 5.5, 1.5);                     // pistol holstered on the hip
  } else if (kit === "medic") {
    part(ctx, 13, -2.4, 13, 4.8, 1.2);                      // pistol in a two-hand grip
    part(ctx, 13, -2.4, 5, 4.8, 1.2, STEEL2);
    ctx.fillStyle = BRIGHT; ctx.fillRect(-25, -1.2, 9, 2.4); ctx.fillRect(-21.7, -5.2, 2.4, 10.4);   // a slim cross on the trauma pack
  } else {
    const y = 3;                                            // carbine: stock, receiver with magazine and optic, handguard, barrel
    part(ctx, 39, y - 1.2, 12, 2.4, 1); part(ctx, 50, y - 2.1, 4.5, 4.2, 1);
    part(ctx, -5, y - 2.6, 14, 5.2, 2.5);
    part(ctx, 14, y + 2.6, 6.5, 8.5, 1.5);                  // magazine, out to the side
    part(ctx, 9, y - 3.6, 16, 7.2, 1.5);
    part(ctx, 25, y - 3.1, 15, 6.2, 1.5, STEEL2);
    part(ctx, 12, y - 1.6, 8, 3.2, 1.2, BRIGHT);
  }
  ctx.restore();
}

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

  // arms (warm) reach for wherever this kit is gripped, then the kit itself (cold steel with a bright edge)
  const idc = spec.color ?? "#aae6f0";
  const GRIP: Record<string, number[]> = { shield: [21, -11, 9, 21], crossbow: [27, -2, 8, 3], medic: [16, -2, 16, 2], recon: [31, 2, 12, 6], rifle: [30, 2, 12, 6] };
  const gd = u.guard ?? 0;
  const gr = spec.kit === "shield" ? [21 + 4 * gd, -11 + 9 * gd, 9 - 5 * gd, 21 - 2 * gd]
    : spec.kit === "crossbow" && gd >= 0.5 ? [15, -13, 17, 9] : GRIP[spec.kit] ?? GRIP.rifle;
  ctx.strokeStyle = WARM; ctx.lineWidth = 6.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-2, -shW + 3); ctx.lineTo(gr[0], gr[1]); ctx.moveTo(-2, shW - 3); ctx.lineTo(gr[2], gr[3]); ctx.stroke();
  drawKit(ctx, spec.kit, idc, gd);
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
