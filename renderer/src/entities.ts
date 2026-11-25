// Thermal entity species. Each species is two poses (0 and 1) of joint chains, facing +x;
// the timeline blends between them with the entity "pose" value. New anomalies = new entries here.
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

// Blur filters are applied per draw call, and an entity is ~40 strokes. Blurring each one costs
// seconds per frame, so draw into a small offscreen canvas and blur that once.
const OFF = 420;
function blurred(ctx: SKRSContext2D, x: number, y: number, px: number, draw: (c: SKRSContext2D) => void) {
  const cv = createCanvas(OFF, OFF); const c = cv.getContext("2d");
  c.translate(OFF / 2, OFF / 2); draw(c);
  ctx.save(); ctx.filter = `blur(${px.toFixed(1)}px)`; ctx.drawImage(cv, x - OFF / 2, y - OFF / 2); ctx.restore();
}

type Limb = { pts: [number, number][]; w: number[]; finger: number };
type Pose = { torso: [number, number]; head: [number, number, number, number]; limbs: Limb[]; blades?: boolean };
type Species = { name: string; poses: [Pose, Pose]; size: number };

const TAU = Math.PI * 2;
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mirror = (l: Limb): Limb => ({ ...l, pts: l.pts.map(([x, y]) => [x, -y] as [number, number]) });
const pair = (l: Limb) => [l, mirror(l)];

export const SPECIES: Record<string, Species> = {
  // UNK-1 "the Tall One": pose 0 hunched lurk (arms dangle in front), pose 1 low crawl
  stalker: {
    name: "Tall One", size: 1.2,
    poses: [
      { torso: [17, 22], head: [27, 0, 16, 9], blades: true, limbs: [
        ...pair({ pts: [[-12, -9], [-20, -14], [-26, -15]], w: [9, 7, 5], finger: 5 }),
        ...pair({ pts: [[8, -20], [24, -27], [44, -25], [58, -22]], w: [10, 8, 6, 3], finger: 17 }),
      ] },
      { torso: [30, 15], head: [40, 0, 17, 9], blades: true, limbs: [
        ...pair({ pts: [[-24, -9], [-52, -39], [-91, -37]], w: [9, 7, 4], finger: 5 }),
        ...pair({ pts: [[14, -14], [47, -45], [94, -38], [110, -36]], w: [9, 7, 5, 3], finger: 17 }),
      ] },
    ],
  },
  // FILE 001 "the Condemned": a heavy man in shackles. pose 0 seated and folded in, pose 1 upright and swinging
  prisoner: {
    name: "Condemned", size: 1.18,
    poses: [
      { torso: [17, 25], head: [9, 0, 12, 11], limbs: [
        ...pair({ pts: [[2, -23], [15, -22], [24, -9]], w: [11, 9], finger: 11 }),
        ...pair({ pts: [[-8, -11], [10, -15], [26, -13]], w: [11, 9], finger: 4 }),
      ] },
      { torso: [18, 31], head: [12, 0, 12, 11], limbs: [
        ...pair({ pts: [[4, -29], [27, -33], [46, -20]], w: [12, 10], finger: 11 }),
        ...pair({ pts: [[-10, -12], [-22, -15], [-30, -13]], w: [11, 9], finger: 4 }),
      ] },
    ],
  },
  // UNK-2 "Underbelly": flat, six-limbed; pose 0 tucked flat under a car, pose 1 spread and hunting
  underbelly: {
    name: "Underbelly", size: 1.0,
    poses: [
      { torso: [28, 16], head: [32, 0, 11, 9], limbs: [
        ...pair({ pts: [[-22, -12], [-34, -24], [-46, -26]], w: [8, 6, 3], finger: 7 }),
        ...pair({ pts: [[0, -16], [-2, -30], [-8, -38]], w: [8, 6, 3], finger: 7 }),
        ...pair({ pts: [[16, -14], [30, -26], [46, -26], [54, -24]], w: [8, 6, 4, 2], finger: 13 }),
      ] },
      { torso: [32, 21], head: [38, 0, 12, 10], limbs: [
        ...pair({ pts: [[-22, -14], [-50, -46], [-86, -54]], w: [8, 6, 3], finger: 7 }),
        ...pair({ pts: [[0, -20], [-4, -60], [-14, -94]], w: [8, 6, 3], finger: 7 }),
        ...pair({ pts: [[16, -16], [40, -52], [80, -62], [96, -60]], w: [8, 6, 4, 2], finger: 15 }),
      ] },
    ],
  },
};

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

function limbPath(ctx: SKRSContext2D, pts: [number, number][], w: number[], widthMul: number, twitch: () => number, fingerLen: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    ctx.lineWidth = w[i] * widthMul;
    ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[i + 1][0] + (i ? twitch() : 0), pts[i + 1][1] + (i ? twitch() : 0)); ctx.stroke();
  }
  const [px, py] = pts[pts.length - 2], [hx, hy] = pts[pts.length - 1];
  const ang = Math.atan2(hy - py, hx - px);
  ctx.lineWidth = 2.2 * widthMul;
  for (let k = -1.5; k <= 1.5; k += 1) {
    const a = ang + k * 0.28; const L = fingerLen - Math.abs(k) * fingerLen * 0.13;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * L + twitch() * 0.5, hy + Math.sin(a) * L + twitch() * 0.5); ctx.stroke();
  }
}

// reach (0..1): the first front arm stretches out along the facing, the other follows a little
function shape(ctx: SKRSContext2D, sp: Species, pose: number, seed: number, widthMul: number, fill: string, reach = 0) {
  const r = rng(seed); const tw = () => (r() - 0.5) * 2.5;
  const [A, B] = sp.poses;
  const torso = [lerp(A.torso[0], B.torso[0], pose), lerp(A.torso[1], B.torso[1], pose)];
  const head = A.head.map((v, i) => lerp(v, B.head[i], pose));
  ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineCap = "round"; ctx.lineJoin = "round";
  A.limbs.forEach((la, i) => {
    const lb = B.limbs[i];
    let pts = la.pts.map((p, k) => [lerp(p[0], lb.pts[k][0], pose), lerp(p[1], lb.pts[k][1], pose)] as [number, number]);
    const ext = reach > 0.01 && la.finger > 10 ? (i % 2 === 0 ? 1.0 : 0.2) * reach : 0;
    if (ext > 0) { const [sx, sy] = pts[0]; pts = pts.map(([x, y]) => [sx + (x - sx) * (1 + ext), sy + (y - sy) * (1 - 0.5 * ext)] as [number, number]); }
    limbPath(ctx, pts, la.w, widthMul, tw, lerp(la.finger, lb.finger, pose));
  });
  ctx.beginPath(); ctx.ellipse(-2, 0, torso[0] + widthMul * 2, torso[1] + widthMul, 0, 0, TAU); ctx.fill();
  if (A.blades) for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(lerp(2, 10, pose), s * torso[1] * 0.55, 6 + widthMul, 4 + widthMul, 0, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(head[0], head[1], head[2] + widthMul, head[3] + widthMul * 0.6, 0, 0, TAU); ctx.fill();
  return { torso, head };
}

export type EntityState = { x: number; y: number; heading: number; visible: number; glitch?: number; pose?: number; look?: number; hidden?: number; reach?: number };

// hidden (0..1): heat diffused through something above it (e.g. a car body): blurred, dimmer, no detail
export function drawEntityThermal(ctx: SKRSContext2D, e: EntityState, t: number, ghost = false, species = "stalker", mapScale = 1) {
  if (e.visible <= 0.01) return;
  const h = e.hidden ?? 0;
  if (h > 0.01) {  // heat seen through a car body: render sharp offscreen, blur once
    const ctxAlpha = ctx.globalAlpha;
    blurred(ctx, e.x, e.y, h * 9, c => { c.globalAlpha = ctxAlpha; drawEntitySharp(c, { ...e, x: 0, y: 0 }, t, ghost, species, mapScale, h); });
    return;
  }
  drawEntitySharp(ctx, e, t, ghost, species, mapScale, 0);
}

function drawEntitySharp(ctx: SKRSContext2D, e: EntityState, t: number, ghost: boolean, species: string, mapScale: number, hidForLook: number) {
  const sp = SPECIES[species] ?? SPECIES.stalker;
  const pose = e.pose ?? 1, g = e.glitch ?? 0, hid = hidForLook;
  const r = rng(Math.floor(t * 60) + 11);
  const dx = g > 0 ? (r() - 0.5) * 70 * g : 0, flick = g > 0 && r() < 0.35 * g ? 0.15 : 1;
  const breath = 1 + 0.035 * Math.sin(t * 1.7);
  const tw = Math.pow(Math.max(0, Math.sin(t * 2.7)), 24);   // occasional sharp twitch
  const seed = Math.floor(t * 8) + Math.floor(tw * 5) * 97;
  const a = e.visible * flick * (ghost ? 0.5 : 1) * (1 - 0.55 * hid);
  const k = breath * sp.size * mapScale;

  ctx.save(); ctx.translate(e.x + dx, e.y); ctx.rotate((e.heading + tw * 9) * Math.PI / 180); ctx.scale(k, k);
  ctx.globalAlpha = a;

  ctx.globalCompositeOperation = "lighter";
  const bloom = ctx.createRadialGradient(0, 0, 8, 0, 0, 150);
  bloom.addColorStop(0, `rgba(255,50,40,${0.40 + 0.15 * hid})`); bloom.addColorStop(1, "rgba(120,0,0,0)");
  ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.fill();
  for (let i = 1; i <= 3; i++) {
    ctx.save(); ctx.translate(-i * (6 + g * 18), Math.sin(t * 3 + i) * 2); ctx.globalAlpha = a * (0.10 - i * 0.02);
    shape(ctx, sp, pose, seed + i, 1.0, "rgba(255,40,30,1)", e.reach ?? 0); ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a;
  ctx.shadowColor = "rgba(255,40,30,1)"; ctx.shadowBlur = 26;
  shape(ctx, sp, pose, seed, 1.25, "#b81418", e.reach ?? 0);
  ctx.shadowBlur = 0;
  const { torso, head } = shape(ctx, sp, pose, seed, 0.85, "#ff4a3a", e.reach ?? 0);
  if (hid < 0.6) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(-2, 0, torso[0], torso[1], 0, 0, TAU); ctx.clip();
    for (let k2 = 0; k2 < 4; k2++) {
      const cx = Math.sin(t * (0.9 + k2 * 0.37) + k2 * 2) * torso[0] * 0.6, cy = Math.cos(t * (1.1 + k2 * 0.29) + k2) * torso[1] * 0.5;
      const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
      hg.addColorStop(0, "rgba(255,190,150,0.75)"); hg.addColorStop(1, "rgba(255,120,90,0)");
      ctx.fillStyle = hg; ctx.fillRect(cx - 14, cy - 14, 28, 28);
    }
    ctx.restore();
    // cold void where a face should be
    ctx.save(); ctx.rotate((e.look ?? 0) * Math.PI / 180);
    const hx = head[0] + 3, rr = head[2] * 0.75;
    const cold = ctx.createRadialGradient(hx, head[1], 0, hx, head[1], rr);
    cold.addColorStop(0, "rgba(8,0,2,0.95)"); cold.addColorStop(0.55, "rgba(40,0,6,0.7)"); cold.addColorStop(1, "rgba(120,0,10,0)");
    ctx.fillStyle = cold; ctx.translate(hx, head[1]); ctx.scale(1, head[3] / head[2] * 1.1); ctx.translate(-hx, -head[1]);
    ctx.beginPath(); ctx.arc(hx, head[1], rr, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// fading heat left where the entity used to be
export function drawResidue(ctx: SKRSContext2D, e: EntityState, age: number, life = 2.6, species = "stalker", mapScale = 1) {
  const a = Math.max(0, 1 - age / life); if (a <= 0) return;
  const sp = SPECIES[species] ?? SPECIES.stalker;
  blurred(ctx, e.x, e.y, 4 + age * 6 + (e.hidden ?? 0) * 6, c => {
    c.globalAlpha = a * 0.55; c.rotate(e.heading * Math.PI / 180); c.scale(sp.size * mapScale, sp.size * mapScale);
    shape(c, sp, e.pose ?? 1, 3, 1.2, "rgba(200,30,25,1)");
  });
}
