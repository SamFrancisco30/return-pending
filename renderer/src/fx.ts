// Map-layer and HUD effects driven by the compiled timeline:
//   door state FX (claimed frost, handle turning, rattle, held thumps, unprompted burst)
//   gunfire (short burst: muzzle bloom, warm tracers, impact sparks)
//   props (SRS beacon, ODA's relay pack)
//   HUD: recon confidence, UNK zone bar, site closure countdown
//   reconstruction collapse (wall drift, flicker, heat streaks) -> empty wireframe
import { createCanvas, type SKRSContext2D, type Canvas } from "@napi-rs/canvas";

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// ---------------- doors ----------------
export type DoorFx = { state: string; since: number; claim: number | null; claimEnd: number | null };
const CLAIMING = new Set(["claimed", "attempt", "held", "released"]);

// state of one door at time t from its [[t, state], ...] track
export function doorFxAt(track: [number, string][] | undefined, t: number): DoorFx | undefined {
  if (!track) return;
  let cur: DoorFx = { state: "closed", since: 0, claim: null, claimEnd: null };
  for (const [ts, st] of track) {
    if (ts > t) break;
    if (CLAIMING.has(st)) { if (cur.claim === null || cur.claimEnd !== null) { cur.claim = ts; cur.claimEnd = null; } }
    else if (cur.claim !== null && cur.claimEnd === null) cur.claimEnd = ts;
    cur = { ...cur, state: st, since: ts };
  }
  return cur;
}

// extra open fraction: the leaf rattles / is shoved against whoever holds it
export function doorJolt(id: string, fx: DoorFx | undefined, t: number) {
  if (!fx) return 0;
  const age = t - fx.since;
  if (fx.state === "held") {
    const ph = ((age + 0.3) % 1.15) / 1.15;
    return ph < 0.14 ? 0.06 * Math.sin((ph / 0.14) * Math.PI) : 0;
  }
  if (fx.state === "attempt" && age < 1.4) return 0.012 * Math.abs(Math.sin(t * 55));
  if (CLAIMING.has(fx.state)) return 0.014 * Math.pow(Math.max(0, Math.sin(t * 2.3 + (hash(id) % 10))), 30);
  return 0;
}

const frostAmt = (fx: DoorFx, t: number) => {
  if (fx.claim === null) return 0;
  const grow = clamp((t - fx.claim) / 1.6);
  return fx.claimEnd !== null ? grow * clamp(1 - (t - fx.claimEnd) / 0.6) : grow;
};

// d: geometry door (hinge hx,hy), end: current leaf end
export function drawDoorFx(ctx: SKRSContext2D, d: { id: string; hx: number; hy: number; width: number }, end: [number, number], fx: DoorFx | undefined, t: number) {
  if (!fx) return;
  const fr = frostAmt(fx, t);
  const lx = end[0] - d.hx, ly = end[1] - d.hy, L = Math.hypot(lx, ly) || 1, ux = lx / L, uy = ly / L, nx = -uy, ny = ux;
  if (fr > 0.01) {
    ctx.save();
    // cold haze hugging the leaf
    ctx.globalCompositeOperation = "lighter";
    const mx = d.hx + lx / 2, my = d.hy + ly / 2;
    const g = ctx.createRadialGradient(mx, my, 4, mx, my, L * 0.85);
    g.addColorStop(0, `rgba(150,215,255,${0.30 * fr})`); g.addColorStop(1, "rgba(60,120,200,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, L * 0.85, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // frosted leaf + crystalline rime spikes
    ctx.strokeStyle = `rgba(225,245,255,${0.9 * fr})`; ctx.lineWidth = 5; ctx.shadowColor = "rgba(170,225,255,1)"; ctx.shadowBlur = 14 * fr;
    ctx.beginPath(); ctx.moveTo(d.hx, d.hy); ctx.lineTo(end[0], end[1]); ctx.stroke(); ctx.shadowBlur = 0;
    const r = rng(hash(d.id)), n = 26;
    ctx.lineWidth = 1.3;
    for (let i = 0; i < n; i++) {
      const u = r(), side = r() < 0.5 ? -1 : 1, len = (5 + r() * 15) * clamp(fr * 1.4 - r() * 0.4);
      if (len <= 0.5) continue;
      const px = d.hx + ux * L * u, py = d.hy + uy * L * u, a = (r() - 0.5) * 1.2;
      const dx = (nx * Math.cos(a) - ux * Math.sin(a)) * side, dy = (ny * Math.cos(a) - uy * Math.sin(a)) * side;
      ctx.strokeStyle = `rgba(215,240,255,${0.55 * fr})`;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx * len, py + dy * len); ctx.stroke();
    }
    // handle: a cold knob near the free end, its tick turning
    const hx = d.hx + ux * L * 0.82, hy = d.hy + uy * L * 0.82;
    const turn = fx.state === "attempt" && t - fx.since < 1.4 ? Math.sin(t * 40) * 0.35 : Math.sin(t * 1.4) * 0.9;
    ctx.fillStyle = `rgba(235,250,255,${fr})`; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, TAU); ctx.fill();
    const ta = Math.atan2(ny, nx) + turn;
    ctx.strokeStyle = `rgba(235,250,255,${fr})`; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ta) * 11, hy + Math.sin(ta) * 11); ctx.stroke();
    ctx.restore();
  }
  // held: every shove leaves a pale impact ring on the leaf
  if (fx.state === "held") {
    const ph = ((t - fx.since + 0.3) % 1.15);
    if (ph < 0.5) {
      const mx = d.hx + lx * 0.6, my = d.hy + ly * 0.6, a = 1 - ph / 0.5;
      ctx.save(); ctx.strokeStyle = `rgba(235,248,255,${0.7 * a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 10 + ph * 90, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  // unprompted: a cold burst where it came through
  if (fx.state === "unprompted" && t - fx.since < 1.0) {
    const age = t - fx.since, a = 1 - age;
    const cx = d.hx + (end[0] - d.hx) * 0.5, cy = d.hy + (end[1] - d.hy) * 0.5;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + age * 160);
    g.addColorStop(0, `rgba(180,230,255,${0.35 * a})`); g.addColorStop(1, "rgba(80,150,220,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 60 + age * 160, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(225,245,255,${0.8 * a})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 20 + age * 140, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

// ---------------- gunfire ----------------
export type Shot = { x0: number; y0: number; x1: number; y1: number; age: number; kind?: string; seed?: number };
// A short shotgun going off, seen from above. Five things, each on its own clock, all keyed to the seed of the shot so nothing
// flickers from frame to frame: a white-hot flash with a forward tongue and two side jets; a dozen pellets that actually
// travel; flecks where they land; a puff of smoke that hangs and drifts; and the spent shell kicked out to the right.
function drawShotgunBlast(ctx: SKRSContext2D, s: Shot) {
  const th = Math.atan2(s.y1 - s.y0, s.x1 - s.x0), D = Math.min(Math.hypot(s.x1 - s.x0, s.y1 - s.y0), 360), H = 0.19, age = s.age;
  const r = rng((s.seed ?? Math.floor(s.x1 * 7 + s.y1 * 3)) + 17), cs = Math.cos(th), sn = Math.sin(th);
  const at = (d: number, off = 0): [number, number] => [s.x0 + cs * d - sn * off, s.y0 + sn * d + cs * off];
  ctx.save();
  // smoke first, under everything, in normal blending so it greys the floor instead of adding light
  ctx.globalCompositeOperation = "source-over";
  for (let k = 0; k < 6; k++) {
    const d0 = 14 + r() * 70, off = (r() - 0.5) * 30, grow = 12 + r() * 10, life = 0.55 + r() * 0.4, drift = 0.6 + r() * 0.6, u = clamp((age - 0.03) / life);
    if (age <= 0.03 || u >= 1) continue;
    const [x, y] = at(d0 + 46 * u * drift, off * (1 + u)), R = grow + 30 * Math.sqrt(u), al = 0.17 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.4);
    const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(196,212,214,${al})`); g.addColorStop(0.6, `rgba(170,190,194,${al * 0.55})`); g.addColorStop(1, "rgba(160,180,186,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
  const spikes = Array.from({ length: 5 }, () => [(r() - 0.5) * 1.5, 30 + r() * 34]);
  // the flash: over in two or three frames
  if (age < 0.075) {
    const a = 1 - age / 0.075, k = 0.75 + 0.25 * a;
    const gl = ctx.createRadialGradient(s.x0, s.y0, 0, s.x0, s.y0, 190); gl.addColorStop(0, `rgba(255,236,196,${0.30 * a})`); gl.addColorStop(1, "rgba(255,210,150,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(s.x0, s.y0, 190, 0, TAU); ctx.fill();                         // light thrown on the floor
    const jet = (ang: number, len: number, wid: number, alpha: number) => {
      const c = Math.cos(ang), n = Math.sin(ang), tx = s.x0 + c * len, ty = s.y0 + n * len, mx = s.x0 + c * len * 0.35, my = s.y0 + n * len * 0.35;
      const g = ctx.createLinearGradient(s.x0, s.y0, tx, ty); g.addColorStop(0, `rgba(255,255,246,${alpha})`); g.addColorStop(0.45, `rgba(255,224,150,${alpha * 0.8})`); g.addColorStop(1, "rgba(255,150,60,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.quadraticCurveTo(mx - n * wid, my + c * wid, tx, ty); ctx.quadraticCurveTo(mx + n * wid, my - c * wid, s.x0, s.y0); ctx.fill();
    };
    jet(th, 92 * k, 17, a); jet(th + 1.15, 34 * k, 7, a * 0.8); jet(th - 1.15, 34 * k, 7, a * 0.8);
    for (const [da, len] of spikes) jet(th + da, len * k, 2.6, a * 0.7);
    const c0 = ctx.createRadialGradient(s.x0, s.y0, 0, s.x0, s.y0, 30); c0.addColorStop(0, `rgba(255,255,250,${a})`); c0.addColorStop(0.5, `rgba(255,236,190,${0.6 * a})`); c0.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = c0; ctx.beginPath(); ctx.arc(s.x0, s.y0, 30, 0, TAU); ctx.fill();
  } else if (age < 0.4) {                                                                                          // the muzzle stays hot for a moment
    const a = (1 - (age - 0.075) / 0.325) * 0.5, g = ctx.createRadialGradient(s.x0, s.y0, 0, s.x0, s.y0, 16);
    g.addColorStop(0, `rgba(255,214,160,${a})`); g.addColorStop(1, "rgba(255,170,90,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x0, s.y0, 16, 0, TAU); ctx.fill();
  }
  // pellets: each flies its own line at its own speed, a tapering streak behind a bright head, then a fleck where it lands
  ctx.lineCap = "round";
  for (let q = 0; q < 13; q++) {
    const an = th + (r() + r() - 1) * H, reach = D * (0.86 + r() * 0.26), speed = D / (0.055 + r() * 0.035), sc = [r(), r(), r(), r()];
    const d = Math.min(reach, speed * age), tHit = reach / speed, c = Math.cos(an), n = Math.sin(an), hx = s.x0 + c * d, hy = s.y0 + n * d;
    if (age < tHit + 0.02) {
      const tail = Math.min(d, 58), tx = hx - c * tail, ty = hy - n * tail; if (tail < 1) continue;
      const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, "rgba(255,220,160,0)"); g.addColorStop(1, "rgba(255,250,232,0.95)");
      ctx.strokeStyle = g; ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,245,0.95)"; ctx.beginPath(); ctx.arc(hx, hy, 1.7, 0, TAU); ctx.fill();
    } else if (age < tHit + 0.22) {
      const u = (age - tHit) / 0.22, a = 1 - u, ex = s.x0 + c * reach, ey = s.y0 + n * reach;
      ctx.fillStyle = `rgba(255,214,150,${a})`; ctx.beginPath(); ctx.arc(ex, ey, 3.2 * a + 0.6, 0, TAU); ctx.fill();
      for (let w = 0; w < 2; w++) { const sa = an + Math.PI + (sc[w * 2] - 0.5) * 2.4, sd = 6 + 26 * u * (0.5 + sc[w * 2 + 1]);
        ctx.fillStyle = `rgba(255,196,120,${a * 0.9})`; ctx.beginPath(); ctx.arc(ex + Math.cos(sa) * sd, ey + Math.sin(sa) * sd, 1.3, 0, TAU); ctx.fill(); }
    }
  }
  // the spent shell: out to the right, tumbling, comes to rest and cools
  if (age > 0.07 && age < 0.9) {
    const u = age - 0.07, d = 46 * (1 - Math.exp(-u * 7)), back = -30 - 10 * (1 - Math.exp(-u * 5)), [x, y] = at(back, d + 12), a = age < 0.55 ? 1 : 1 - (age - 0.55) / 0.35;
    ctx.globalCompositeOperation = "source-over"; ctx.translate(x, y); ctx.rotate(th + 9 * (1 - Math.exp(-u * 4)));
    ctx.fillStyle = `rgba(255,232,170,${0.95 * a})`; ctx.fillRect(-3.6, -1.5, 7.2, 3); ctx.fillStyle = `rgba(255,255,240,${a})`; ctx.fillRect(1.6, -1.5, 2, 3);
  }
  ctx.restore();
}

export function drawGunfire(ctx: SKRSContext2D, shots: Shot[]) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const s of shots) {
    if (s.kind === "bolt") {           // a crossbow bolt: no flash, a thin pale streak
      const u = clamp(s.age / 0.11), tx = s.x0 + (s.x1 - s.x0) * u, ty = s.y0 + (s.y1 - s.y0) * u;
      const L = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) || 1, ux = (s.x1 - s.x0) / L, uy = (s.y1 - s.y0) / L;
      ctx.strokeStyle = `rgba(230,246,250,${u < 1 ? 0.95 : Math.max(0, 0.9 - (s.age - 0.11) * 2.6)})`; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(tx - ux * 34, ty - uy * 34); ctx.lineTo(tx, ty); ctx.stroke();
      continue;
    }
    if (s.kind === "shotgun") { drawShotgunBlast(ctx, s); continue; }
    if (s.age < 0.2) { // tracer + muzzle bloom
      const a = 1 - s.age / 0.2;
      const g = ctx.createRadialGradient(s.x0, s.y0, 0, s.x0, s.y0, 70);
      g.addColorStop(0, `rgba(255,245,215,${0.9 * a})`); g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x0, s.y0, 70, 0, TAU); ctx.fill();
      const u = clamp(s.age / 0.07), tx = s.x0 + (s.x1 - s.x0) * u, ty = s.y0 + (s.y1 - s.y0) * u;
      const bx = s.x0 + (s.x1 - s.x0) * Math.max(0, u - 0.45), by = s.y0 + (s.y1 - s.y0) * Math.max(0, u - 0.45);
      ctx.strokeStyle = `rgba(255,236,200,${a})`; ctx.lineWidth = 4; ctx.shadowColor = "rgba(255,220,170,1)"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke(); ctx.shadowBlur = 0;
    }
    if (s.age > 0.05 && s.age < 0.4) { // impact sparks
      const a = 1 - (s.age - 0.05) / 0.35, r = rng(Math.floor(s.x1 * 13 + s.y1));
      ctx.fillStyle = `rgba(255,230,190,${a})`;
      for (let k = 0; k < 7; k++) {
        const ang = r() * TAU, d = 6 + (s.age - 0.05) * (80 + r() * 120);
        ctx.beginPath(); ctx.arc(s.x1 + Math.cos(ang) * d, s.y1 + Math.sin(ang) * d, 1.8, 0, TAU); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// ---------------- props ----------------
export type Prop = { kind: string; x: number; y: number };
export function drawProps(ctx: SKRSContext2D, props: Prop[], t: number) {
  for (const p of props) {
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.kind === "beacon") {
      const on = Math.floor(t * 1.6) % 2 === 0;
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
      g.addColorStop(0, `rgba(90,255,150,${on ? 0.55 : 0.18})`); g.addColorStop(1, "rgba(40,200,100,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(170,200,190,0.9)"; ctx.fillRect(-9, -6, 18, 12);
      ctx.fillStyle = on ? "#7dffaa" : "#2f7a4c"; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
    } else if (p.kind === "body") {       // a person with no heat left: cold outline lying on the floor
      ctx.rotate(((p as any).rot ?? 20) * Math.PI / 180);
      ctx.fillStyle = "rgba(70,105,115,0.38)"; ctx.strokeStyle = "rgba(140,190,200,0.55)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(44, 0, 11, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.strokeStyle = "rgba(90,130,140,0.4)";
      ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(-70, -16); ctx.moveTo(-30, 8); ctx.lineTo(-68, 20); ctx.moveTo(14, 14); ctx.lineTo(40, 34); ctx.stroke();
    } else if (p.kind === "pack") {
      ctx.fillStyle = "rgba(255,193,90,0.20)"; ctx.fillRect(-16, -12, 32, 24);
      ctx.strokeStyle = "rgba(255,193,90,0.85)"; ctx.lineWidth = 2; ctx.strokeRect(-16, -12, 32, 24);
      ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(18, -30); ctx.stroke();       // antenna
    }
    ctx.restore();
  }
}

// ---------------- HUD extras ----------------
export type HudExtras = {
  confidence?: number;
  zone?: { cur: number; prev: number; since: number; levels: number[] };
  countdown?: { label: string; remaining: number };
  entityId?: string;
};
const mmss = (s: number) => { const v = Math.max(0, Math.ceil(s)); return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; };

export function drawHudExtras(ctx: SKRSContext2D, W: number, H: number, t: number, x: HudExtras) {
  const m = 34;
  ctx.save();
  if (x.confidence != null) {     // top-left, under the feed label
    const c = x.confidence, col = c >= 70 ? "rgba(210,232,235,0.9)" : c >= 35 ? "#ffc15a" : "#ff5a4a";
    const y = m + 46;
    ctx.font = "16px Consolas"; ctx.fillStyle = "rgba(170,200,205,0.8)"; ctx.fillText("RECON CONFIDENCE", m + 14, y + 13);
    const bx = m + 14 + 160;
    for (let k = 0; k < 10; k++) {
      ctx.fillStyle = k < Math.round(c / 10) ? col : "rgba(120,150,155,0.25)";
      ctx.fillRect(bx + k * 13, y + 2, 10, 12);
    }
    ctx.font = "bold 16px Consolas"; ctx.fillStyle = col; ctx.fillText(`${Math.round(c)}%`, bx + 136, y + 13);
  }
  if (x.zone) {                    // top-right, under REC: where the entity sits, exit on the right
    const { cur, prev, since, levels } = x.zone, cw = 62, ch = 26, gap = 4;
    const total = levels.length * cw + (levels.length - 1) * gap, x0 = W - m - total, y = m + 50;
    ctx.font = "15px Consolas"; ctx.fillStyle = "rgba(170,200,205,0.8)";
    const lbl = `${x.entityId ?? "UNK-1"} · ZONE`; ctx.fillText(lbl, x0 - ctx.measureText(lbl).width - 12, y + 18);
    const flash = t - since < 1.2 ? 0.5 + 0.5 * Math.sin((t - since) * 20) : 0;
    levels.forEach((z, i) => {
      const cx = x0 + i * (cw + gap), here = z === cur, was = z === prev && t - since < 1.2;
      ctx.fillStyle = here ? `rgba(255,58,50,${0.75 + 0.25 * flash})` : was ? "rgba(255,58,50,0.25)" : "rgba(10,18,20,0.75)";
      ctx.fillRect(cx, y, cw, ch);
      ctx.strokeStyle = here ? "#ff3a32" : "rgba(150,185,190,0.5)"; ctx.lineWidth = 1.5; ctx.strokeRect(cx, y, cw, ch);
      ctx.font = "bold 15px Consolas"; ctx.fillStyle = here ? "#fff" : "rgba(190,215,220,0.75)";
      const s = z === 0 ? "EXIT" : `Z${z}`; ctx.fillText(s, cx + cw / 2 - ctx.measureText(s).width / 2, y + 18);
    });
  }
  if (x.countdown) {               // top-right, under the zone bar
    const { label, remaining } = x.countdown, closed = remaining <= 0, hot = remaining <= 30;
    const pulse = hot && !closed ? 0.6 + 0.4 * Math.abs(Math.sin(t * 4)) : 1;
    const txt = closed ? label.replace(/CLOSURE IN$/, "CLOSED") : label, val = mmss(remaining);
    ctx.font = "15px Consolas"; const lw = ctx.measureText(txt).width;
    ctx.font = "bold 26px Consolas"; const vw = ctx.measureText(val).width;
    const w = lw + vw + 40, x0 = W - m - w, y = m + 88;
    ctx.fillStyle = "rgba(10,4,4,0.72)"; ctx.fillRect(x0, y, w, 38);
    const col = hot ? `rgba(255,90,74,${pulse})` : "rgba(225,240,242,0.95)";
    ctx.strokeStyle = hot ? col : "rgba(150,185,190,0.5)"; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y, w, 38);
    ctx.font = "15px Consolas"; ctx.fillStyle = "rgba(190,215,220,0.85)"; ctx.fillText(txt, x0 + 14, y + 24);
    ctx.font = "bold 26px Consolas"; ctx.fillStyle = col; ctx.fillText(val, x0 + 26 + lw, y + 28);
  }
  ctx.restore();
}

// ---------------- reconstruction collapse ----------------
// drift 0..1: horizontal strips of the map slide, room blocks drop out, heat smears into streaks
export function applyCollapse(cv: Canvas, drift: number, t: number) {
  if (drift <= 0.01) return;
  const W = cv.width, H = cv.height, ctx = cv.getContext("2d");
  const snap = createCanvas(W, H); snap.getContext("2d").drawImage(cv, 0, 0);
  const r = rng(Math.floor(t * 18) + 77);
  // heat streaks: a stretched, additive copy
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.18 * drift;
  ctx.drawImage(snap, -W * 0.08 * drift, 0, W * (1 + 0.16 * drift), H); ctx.restore();
  // strip drift
  const n = 6 + Math.floor(drift * 14);
  for (let k = 0; k < n; k++) {
    if (r() > 0.35 + drift * 0.5) continue;
    const y = Math.floor(r() * H), h = Math.floor(8 + r() * 70 * drift), dx = (r() - 0.5) * 140 * drift;
    ctx.drawImage(snap, 0, y, W, h, dx, y, W, h);
  }
  // dropouts
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  for (let k = 0; k < Math.floor(drift * 10); k++) if (r() < 0.5) ctx.fillRect(r() * W, r() * H, 80 + r() * 320, 40 + r() * 200);
}

// building as an empty wireframe (after the lapse closes)
export function drawWireframe(ctx: SKRSContext2D, walls: { x: number; y: number; w: number; h: number }[], amt: number, t: number) {
  if (amt <= 0.01) return;
  const r = rng(Math.floor(t * 10) + 5);
  ctx.save(); ctx.lineWidth = 1.4; ctx.shadowColor = "rgba(140,220,235,0.8)"; ctx.shadowBlur = 6;
  for (const w of walls) {
    ctx.strokeStyle = `rgba(160,225,238,${amt * (r() < 0.06 ? 0.25 : 0.75)})`;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
  ctx.restore();
}

// ---------------- FILE 001: shackle pulse, block boundary, position swap, impacts ----------------
export type Pulse = {
  x: number; y: number; r: number; alpha: number;          // ripple origin (the wearer), current radius, fade
  zone: number[][];                                        // the block as [x, y, w, h] rects: the ripple cannot leave it
  lock?: { x: number; y: number; u: number };              // the first living person it touched; u 0..1 until the trade
  edge?: number;                                           // 0..1 flash on the boundary line where it is stopped
};
export type Boundary = { x1: number; y1: number; x2: number; y2: number; label?: string };
export type SwapFx = { a: number[]; b: number[]; age: number };
export type Impact = { x: number; y: number; age: number; r: number };

// a slow blue ripple that leaves the wearer, is cut off by the block's outline, and stops on the first person it touches
export function drawPulse(ctx: SKRSContext2D, p: Pulse | undefined, b: Boundary | undefined, t: number) {
  if (b) {
    const flash = p?.edge ?? 0;
    ctx.save(); ctx.lineCap = "butt";
    ctx.strokeStyle = flash > 0 ? `rgba(${Math.round(150 - 60 * flash)},${Math.round(225 - 55 * flash)},255,${0.7 + 0.3 * flash})` : "rgba(150,225,235,0.6)";
    ctx.lineWidth = 3 + 6 * flash; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 14;
    if (flash > 0) { ctx.shadowColor = "rgba(70,150,255,1)"; ctx.shadowBlur = 26 * flash; }
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
    if (b.label) {
      ctx.font = "bold 15px Consolas"; ctx.fillStyle = flash > 0 ? "rgba(170,210,255,0.95)" : "rgba(160,225,235,0.8)";
      ctx.save(); ctx.translate(b.x1 - 12, (b.y1 + b.y2) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText(b.label, -ctx.measureText(b.label).width / 2, 0); ctx.restore();
    }
    ctx.restore();
  }
  if (!p || p.alpha <= 0.01 || p.r <= 0) return;
  const locked = !!p.lock, lu = p.lock?.u ?? 0;
  ctx.save(); ctx.beginPath(); for (const [x, y, w, h] of p.zone) ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  // water-like: a bright crest, then trailing troughs that get wider and fainter
  const crest = locked ? `rgba(${Math.round(120 + 135 * lu)},${Math.round(190 - 90 * lu)},${Math.round(255 - 170 * lu)},` : "rgba(120,190,255,";
  for (let k = 0; k < 5; k++) {
    const r = p.r - k * 34 - (k ? Math.sin(t * 5 + k) * 3 : 0); if (r <= 2) continue;
    const a = p.alpha * (k === 0 ? 0.95 : 0.42 / k);
    ctx.strokeStyle = (k === 0 ? crest : "rgba(60,120,255,") + a + ")"; ctx.lineWidth = k === 0 ? 5 : 5 + k * 5;
    if (k === 0) { ctx.shadowColor = locked ? "rgba(255,90,70,1)" : "rgba(80,150,255,1)"; ctx.shadowBlur = 22; }
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
  }
  const g = ctx.createRadialGradient(p.x, p.y, Math.max(0, p.r - 220), p.x, p.y, p.r);     // faint lit water behind the crest
  g.addColorStop(0, "rgba(40,90,220,0)"); g.addColorStop(1, `rgba(50,110,240,${0.16 * p.alpha})`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  ctx.restore();
  // lock: the ripple has found someone. Brackets close on them while the line back to the wearer brightens.
  if (p.lock) {
    const { x, y, u } = p.lock, R = 96 - 44 * u, beat = 0.6 + 0.4 * Math.abs(Math.sin(t * 22));
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,${Math.round(240 - 150 * u)},${Math.round(235 - 170 * u)},${0.35 + 0.65 * u})`; ctx.lineWidth = 2 + 3 * u; ctx.setLineDash([10, 9]);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255,${Math.round(245 - 160 * u)},${Math.round(240 - 180 * u)},${beat})`; ctx.lineWidth = 4; ctx.shadowColor = "rgba(255,80,60,1)"; ctx.shadowBlur = 18;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(x + sx * R, y + sy * (R - 30)); ctx.lineTo(x + sx * R, y + sy * R); ctx.lineTo(x + sx * (R - 30), y + sy * R); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, R * 0.62, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.font = "bold 20px Consolas"; ctx.fillStyle = `rgba(255,${Math.round(240 - 130 * u)},${Math.round(235 - 150 * u)},${beat})`;
    const txt = "NEAREST"; ctx.fillText(txt, x - ctx.measureText(txt).width / 2, y - R - 12);
    ctx.restore();
  }
}

// two positions trade places: a hard link between them, a collapsing ring at each end
export function drawSwap(ctx: SKRSContext2D, swaps: SwapFx[]) {
  for (const s of swaps) {
    const life = 1.1; if (s.age < 0 || s.age > life) continue;
    const u = s.age / life, a = 1 - u;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    if (s.age < 0.45) {
      const la = 1 - s.age / 0.45;
      ctx.strokeStyle = `rgba(255,235,225,${la})`; ctx.lineWidth = 5 * la + 1; ctx.shadowColor = "rgba(255,70,50,1)"; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.moveTo(s.a[0], s.a[1]); ctx.lineTo(s.b[0], s.b[1]); ctx.stroke(); ctx.shadowBlur = 0;
    }
    for (const [x, y] of [s.a, s.b]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 150);
      g.addColorStop(0, `rgba(255,240,230,${0.85 * a * a})`); g.addColorStop(0.4, `rgba(255,80,60,${0.35 * a})`); g.addColorStop(1, "rgba(255,40,30,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 150, 0, TAU); ctx.fill();
      for (let k = 0; k < 2; k++) {       // rings closing in on the new occupant
        const r = 150 * (1 - Math.min(1, u * (1.6 + k * 0.9))) + 30;
        ctx.strokeStyle = `rgba(255,${200 - k * 90},${190 - k * 110},${a})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,230,220,${a})`; ctx.lineWidth = 2;   // crosshair ticks
      for (let q = 0; q < 4; q++) { const an = q * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * 46, y + Math.sin(an) * 46); ctx.lineTo(x + Math.cos(an) * 70, y + Math.sin(an) * 70); ctx.stroke(); }
    }
    ctx.restore();
  }
}

export function drawImpacts(ctx: SKRSContext2D, imps: Impact[]) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const i of imps) {
    const life = 0.38; if (i.age < 0 || i.age > life) continue;
    const a = 1 - i.age / life, R = i.r * (0.5 + 0.9 * i.age / life);
    const g = ctx.createRadialGradient(i.x, i.y, 0, i.x, i.y, R);
    g.addColorStop(0, `rgba(255,250,235,${a})`); g.addColorStop(0.5, `rgba(255,215,160,${0.5 * a})`); g.addColorStop(1, "rgba(255,180,110,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(i.x, i.y, R, 0, TAU); ctx.fill();
    const r = rng(Math.floor(i.x * 7 + i.y * 3));
    ctx.strokeStyle = `rgba(255,240,215,${a})`; ctx.lineWidth = 2.5;
    for (let k = 0; k < 9; k++) { const an = r() * TAU, d0 = R * 0.35, d1 = R * (0.7 + r() * 0.6); ctx.beginPath(); ctx.moveTo(i.x + Math.cos(an) * d0, i.y + Math.sin(an) * d0); ctx.lineTo(i.x + Math.cos(an) * d1, i.y + Math.sin(an) * d1); ctx.stroke(); }
  }
  ctx.restore();
}

// periodic-signal readout: a quiet telemetry line until someone works out what it means, then a large countdown
export type PulseHud = { remaining: number; period: number; alert: number; count: number };
export function drawPulseHud(ctx: SKRSContext2D, W: number, H: number, t: number, p: PulseHud) {
  const m = 34, sec = Math.max(0, p.remaining), txt = sec.toFixed(1).padStart(4, "0");
  ctx.save();
  if (p.alert < 0.99) {                 // quiet: top-left, under the feed label
    ctx.globalAlpha = 1 - p.alert;
    const y = m + 46;
    ctx.font = "16px Consolas"; ctx.fillStyle = "rgba(170,200,205,0.8)"; ctx.fillText("PERIODIC SIGNAL", m + 14, y + 13);
    const bx = m + 14 + 150, n = 20, lit = Math.ceil((1 - sec / p.period) * n);
    for (let k = 0; k < n; k++) { ctx.fillStyle = k < lit ? "rgba(225,120,110,0.85)" : "rgba(120,150,155,0.25)"; ctx.fillRect(bx + k * 8, y + 2, 6, 12); }
    ctx.font = "bold 16px Consolas"; ctx.fillStyle = "rgba(210,232,235,0.9)"; ctx.fillText(`T-${txt}s`, bx + n * 8 + 10, y + 13);
  }
  if (p.alert > 0.01) {                 // loud: top-right, under REC
    ctx.globalAlpha = p.alert;
    const hot = sec <= 5, beat = hot ? 0.65 + 0.35 * Math.abs(Math.sin(t * 6)) : 1;
    const w = 330, x0 = W - m - w, y = m + 50, h = 96;
    ctx.fillStyle = "rgba(14,2,2,0.8)"; ctx.fillRect(x0, y, w, h);
    ctx.strokeStyle = `rgba(255,74,58,${beat})`; ctx.lineWidth = 2.5; ctx.strokeRect(x0, y, w, h);
    ctx.font = "bold 18px Consolas"; ctx.fillStyle = "rgba(255,170,160,0.95)"; ctx.fillText("NEXT PULSE", x0 + 16, y + 28);
    ctx.font = "bold 54px Consolas"; ctx.fillStyle = `rgba(255,${hot ? 90 : 235},${hot ? 74 : 230},${beat})`; ctx.fillText(txt, x0 + 16, y + 80);
    ctx.font = "bold 20px Consolas"; ctx.fillStyle = "rgba(255,170,160,0.8)"; ctx.fillText("SEC", x0 + 154, y + 80);
    const bx = x0 + 214, n = 10, lit = Math.ceil((1 - sec / p.period) * n);
    for (let k = 0; k < n; k++) { ctx.fillStyle = k < lit ? `rgba(255,74,58,${beat})` : "rgba(140,90,85,0.3)"; ctx.fillRect(bx + k * 10, y + 58, 7, 22); }
  }
  ctx.restore();
}

// ---------------- FILE 001: the block's security door, and a recovery line ----------------
// A thick steel leaf from hinge (hx, hy) to its free end. f = open fraction; shut, it shows its bolts and a SEALED tag.
export function drawHeavyDoor(ctx: SKRSContext2D, hx: number, hy: number, ex: number, ey: number, f: number, t: number) {
  const L = Math.hypot(ex - hx, ey - hy) || 1, ux = (ex - hx) / L, uy = (ey - hy) / L, shut = f < 0.04, moving = f > 0.04 && f < 0.96;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.atan2(uy, ux));
  ctx.shadowColor = shut ? "rgba(120,230,245,1)" : "rgba(120,230,245,0.6)"; ctx.shadowBlur = shut ? 22 : 10;
  ctx.fillStyle = "rgba(26,46,54,1)"; ctx.beginPath(); ctx.roundRect(-4, -12, L + 8, 24, 3); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(190,238,246,0.98)"; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.fillStyle = "rgba(70,112,124,1)"; ctx.fillRect(2, -7, L - 4, 14);                         // plate
  ctx.strokeStyle = "rgba(150,210,222,0.8)"; ctx.lineWidth = 1.2;
  for (let x = 14; x < L - 6; x += 22) { ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x, 7); ctx.stroke(); }   // ribs
  ctx.fillStyle = "rgba(220,244,250,0.95)";
  for (let x = 8; x < L; x += 22) { ctx.beginPath(); ctx.arc(x, -9.2, 1.5, 0, TAU); ctx.arc(x, 9.2, 1.5, 0, TAU); ctx.fill(); }   // rivets
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fillStyle = "rgba(190,238,246,0.95)"; ctx.fill();   // hinge post
  if (shut) {                                                                                         // drop bolts thrown
    ctx.fillStyle = "rgba(255,214,130,0.95)"; ctx.fillRect(L * 0.30, -15, 7, 30); ctx.fillRect(L * 0.66, -15, 7, 30);
  }
  ctx.restore();
  if (moving) {                                                                                       // swing arc
    ctx.save(); ctx.strokeStyle = "rgba(150,235,245,0.3)"; ctx.setLineDash([5, 7]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(hx, hy, L, 0, Math.PI / 2); ctx.stroke(); ctx.restore();
  }
  if (shut) {
    ctx.save(); ctx.font = "bold 16px Consolas"; const txt = "DOOR SEALED", w = ctx.measureText(txt).width + 16, mx = (hx + ex) / 2, my = (hy + ey) / 2;
    ctx.fillStyle = "rgba(20,14,2,0.85)"; ctx.fillRect(mx - w - 26, my - 13, w, 26);
    ctx.strokeStyle = "rgba(255,214,130,0.9)"; ctx.lineWidth = 1.5; ctx.strokeRect(mx - w - 26, my - 13, w, 26);
    ctx.fillStyle = "rgba(255,224,150,0.98)"; ctx.fillText(txt, mx - w - 18, my + 5.5); ctx.restore();
  }
}
export type Rope = { x0: number; y0: number; x1: number; y1: number };
export function drawRopes(ctx: SKRSContext2D, ropes: Rope[], t: number) {
  for (const r of ropes) {
    const mx = (r.x0 + r.x1) / 2, my = (r.y0 + r.y1) / 2 + 5 + Math.sin(t * 9) * 1.5;
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(10,20,24,0.8)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.quadraticCurveTo(mx, my, r.x1, r.y1); ctx.stroke();
    ctx.strokeStyle = "rgba(226,245,250,0.95)"; ctx.lineWidth = 2.2; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.quadraticCurveTo(mx, my, r.x1, r.y1); ctx.stroke();
    ctx.restore();
  }
}

// how loud something was, drawn on the map: a small pale ring for a blade or a bolt, a wide warm one for a gunshot
export type SoundRing = { x: number; y: number; r: number; age: number; loud: boolean };
export function drawSounds(ctx: SKRSContext2D, rings: SoundRing[]) {
  ctx.save();
  for (const s of rings) {
    const life = s.loud ? 1.1 : 0.6; if (s.age < 0 || s.age > life) continue;
    const u = s.age / life, a = (1 - u) * (s.loud ? 0.75 : 0.6);
    for (let k = 0; k < (s.loud ? 3 : 2); k++) {
      const rr = s.r * (u * (1 - k * 0.22)); if (rr <= 2) continue;
      ctx.strokeStyle = s.loud ? `rgba(255,226,176,${a * (1 - k * 0.3)})` : `rgba(226,245,250,${a * (1 - k * 0.3)})`;
      ctx.lineWidth = s.loud ? 3.5 - k : 2; ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();
}
