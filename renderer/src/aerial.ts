// High-altitude SRS view (FILE 001, act 1): one still plate of the whole site with a moving camera, a transport blip coming in
// over the sea, the squad as five coloured blips on the ground, the name plates of the team that went missing, and the
// periodic signal seen from above, stopped by the walls of the block it comes from.
// Everything is in plate pixels (2048 x 1152). The timeline carries it under tl.aerial; the shot type is "aerial".
import { createCanvas, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import { post, hud } from "./compose.ts";
import { drawPulseHud } from "./fx.ts";
import { drawIcon, rgba } from "./thermal.ts";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const win = (t: number, a: number, b: number, f = 0.3) => clamp((t - a) / f) * clamp((b - t) / f);
const PALE = "rgba(214,234,238,0.95)", DIM = "rgba(150,180,186,0.8)", CYAN = "#8fe9ff", BLUE = "#4aa8ff";
type Sample = (keys: number[][], t: number) => number[];

function tag(ctx: SKRSContext2D, x: number, y: number, text: string, a: number, k: number, side = 1, color = "#eaf7f9") {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `bold ${17 / k}px Consolas`;
  const w = ctx.measureText(text).width + 18 / k, bx = side > 0 ? x + 44 / k : x - 44 / k - w;
  ctx.strokeStyle = "rgba(235,250,252,0.75)"; ctx.lineWidth = 1.4 / k;
  ctx.beginPath(); ctx.moveTo(x + side * 8 / k, y - 8 / k); ctx.lineTo(x + side * 34 / k, y - 34 / k); ctx.lineTo(x + side * 44 / k, y - 34 / k); ctx.stroke();
  ctx.fillStyle = "rgba(4,10,12,0.82)"; ctx.fillRect(bx, y - 48 / k, w, 27 / k);
  ctx.fillStyle = color; ctx.fillText(text, bx + 9 / k, y - 29 / k);
  ctx.restore();
}

// The island plate with its edges faded out, so it sits in the open sea drawn round it. Made once.
let feathered: any = null;
function featherPlate(img: Image, sides: string[], f = 150) {
  if (feathered) return feathered;
  const c = createCanvas(2048, 1152), x = c.getContext("2d"); x.drawImage(img, 0, 0, 2048, 1152);
  x.globalCompositeOperation = "destination-in";
  const E: Record<string, number[]> = { left: [0, 0, f, 0], right: [2048, 0, 2048 - f, 0], top: [0, 0, 0, f], bottom: [0, 1152, 0, 1152 - f] };
  for (const [x0, y0, x1, y1] of sides.map(k => E[k])) {
    const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)");
    x.fillStyle = g; x.fillRect(0, 0, 2048, 1152);
  }
  return (feathered = c);
}

export function renderAerial(a: any, img: Image, sea: Image | null, lt: number, t: number, sample: Sample, st: any, W = 1920, H = 1080) {
  const cv = createCanvas(W, H), ctx = cv.getContext("2d");
  ctx.fillStyle = "#02060a"; ctx.fillRect(0, 0, W, H);
  const [cx, cy, zoom] = sample(a.camera, lt), k = (W / 2048) * zoom;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-cx, -cy);
  if (sea) {                                                        // open water in every direction: the sea picture, made to repeat without seams (concepts/sea_tile.png)
    const vx0 = cx - 1024 / zoom, vx1 = cx + 1024 / zoom, vy0 = cy - 576 / zoom, vy1 = cy + 576 / zoom;
    const tw = sea.width, th = sea.height;
    for (let i = Math.floor(vx0 / tw); i <= Math.floor(vx1 / tw); i++) for (let j = Math.floor(vy0 / th); j <= Math.floor(vy1 / th); j++) ctx.drawImage(sea, i * tw, j * th, tw + 1, th + 1);
    ctx.drawImage(featherPlate(img, a.feather ?? ["left", "right", "top", "bottom"]), 0, 0);
  } else ctx.drawImage(img, 0, 0, 2048, 1152);
  // survey grid, fixed to the ground
  ctx.strokeStyle = "rgba(150,210,220,0.06)"; ctx.lineWidth = 1 / k;
  { const gx0 = Math.floor((cx - 1024 / zoom) / 128) * 128, gx1 = cx + 1024 / zoom, gy0 = Math.floor((cy - 576 / zoom) / 128) * 128, gy1 = cy + 576 / zoom;
    for (let x = gx0; x <= gx1; x += 128) { ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy1 + 128); ctx.stroke(); }
    for (let y = gy0; y <= gy1; y += 128) { ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1 + 128, y); ctx.stroke(); } }

  // the block the signal comes from: its outline is picked out once the scan settles on it
  const r = a.ripple, [bx0, by0, bx1, by1] = r.clip, ob = clamp((lt - r.outlineFrom) / 0.6);
  if (ob > 0) {
    ctx.save(); ctx.globalAlpha = ob * (0.55 + 0.2 * Math.sin(t * 3)); ctx.strokeStyle = rgba(BLUE, 1); ctx.lineWidth = 2.2 / k; ctx.setLineDash([10 / k, 7 / k]);
    ctx.strokeRect(bx0 - 5, by0 - 5, bx1 - bx0 + 10, by1 - by0 + 10); ctx.restore();
  }
  // the ripple: a ring from the source, drawn only inside the block. Where it meets a wall the wall lights for a moment.
  for (const t0 of r.times as number[]) {
    const age = lt - t0; if (age < 0 || age > r.life) continue;
    const rad = age * r.speed, fade = clamp((r.life - age) / 0.7);
    ctx.save(); ctx.beginPath(); ctx.rect(bx0, by0, bx1 - bx0, by1 - by0); ctx.clip();
    for (const [dr, al, lw] of [[-10, 0.16, 26], [0, 1, 5.5], [-11, 0.5, 3], [-23, 0.25, 2]]) {
      if (rad + dr <= 0) continue;
      ctx.strokeStyle = rgba(BLUE, al * fade); ctx.lineWidth = lw / Math.sqrt(k); ctx.shadowColor = BLUE; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad + dr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    const reach = [r.x - bx0, bx1 - r.x, r.y - by0, by1 - r.y];           // distance from the source to each wall
    const hitA = (d: number) => (rad >= d ? clamp(1 - (rad - d) / (r.speed * 0.9)) * fade : 0);
    ctx.save(); ctx.strokeStyle = rgba("#bfe2ff", 1); ctx.lineWidth = 4 / Math.sqrt(k); ctx.shadowColor = BLUE; ctx.shadowBlur = 14;
    const seg = (x0: number, y0: number, x1: number, y1: number, al: number) => { if (al <= 0.01) return; ctx.globalAlpha = al; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
    seg(bx0, by0, bx0, by1, hitA(reach[0])); seg(bx1, by0, bx1, by1, hitA(reach[1])); seg(bx0, by0, bx1, by0, hitA(reach[2])); seg(bx0, by1, bx1, by1, hitA(reach[3]));
    ctx.restore();
  }
  if (lt >= r.times[0] - 0.05) {                                    // the source keeps blinking once it has been seen
    const on = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.fillStyle = rgba(BLUE, 0.5 + 0.5 * on); ctx.shadowColor = BLUE; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(r.x, r.y, 7 / Math.sqrt(k), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(BLUE, 0.6 * (1 - on)); ctx.lineWidth = 2 / k; ctx.beginPath(); ctx.arc(r.x, r.y, (9 + 10 * on) / Math.sqrt(k), 0, Math.PI * 2); ctx.stroke();
  }

  // labels on the ground
  for (const l of a.labels ?? []) tag(ctx, l.x, l.y, l.text, win(lt, l.from, l.to), k, l.side ?? 1, l.color);

  // the transport: a dashed track behind it, the blip itself, a tag
  const h = a.heli, [hx, hy] = sample(h.keys, lt), [px, py] = sample(h.keys, Math.max(0, lt - 0.1));
  const landed = lt >= h.land, hd = landed ? h.heading : Math.atan2(hy - py, hx - px);
  ctx.save(); ctx.strokeStyle = rgba(CYAN, 0.38); ctx.lineWidth = 1.6 / k; ctx.setLineDash([9 / k, 9 / k]); ctx.beginPath();
  for (let q = Math.max(0, lt - 6), first = true; q <= Math.min(lt, h.land); q += 0.1, first = false) { const [x, y] = sample(h.keys, q); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke(); ctx.restore();
  {
    const s = 2048 / W, spin = landed ? clamp(1 - (lt - h.land) / 3.5) : 1, ang = landed ? h.land * 30 + (lt - h.land) * 30 * (0.5 + spin * 0.5) * spin + 6 : lt * 30;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(s, s);
    if (!landed) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(14, 18, 22, 9, 0, 0, Math.PI * 2); ctx.fill(); }   // shadow on the water
    ctx.rotate(hd); ctx.shadowColor = CYAN; ctx.shadowBlur = 12; ctx.fillStyle = "#eafcff";
    ctx.beginPath(); ctx.ellipse(2, 0, 17, 7.5, 0, 0, Math.PI * 2); ctx.fill();                       // hull
    ctx.fillRect(-34, -2, 22, 4); ctx.fillRect(-37, -8, 4, 16);                                        // tail boom and tail rotor
    ctx.shadowBlur = 0; ctx.rotate(-hd + ang);
    ctx.strokeStyle = rgba(CYAN, 0.25 + 0.35 * spin); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", 0.85); ctx.lineWidth = 2.4;
    for (let b = 0; b < 4; b++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(27 * Math.cos(b * Math.PI / 2), 27 * Math.sin(b * Math.PI / 2)); ctx.stroke(); }
    ctx.restore();
    tag(ctx, hx, hy, landed ? h.tagDown : h.tagIn, win(lt, 0.4, h.tagTo, 0.3), k, hx > cx ? -1 : 1, CYAN);
  }

  // the squad on the ground: a blip in each one's colour, a short trail, nothing else at this height
  for (const [id, keys] of Object.entries(a.squad as Record<string, number[][]>)) {
    if (lt < keys[0][0]) continue;
    const sp = st.roster?.find((q: any) => q.id === id), c = sp?.color ?? "#eafcff", [x, y] = sample(keys, lt);
    if (lt > keys[keys.length - 1][0] + 0.25) continue;                 // gone inside
    ctx.save(); ctx.strokeStyle = rgba(c, 0.4); ctx.lineWidth = 3 / k; ctx.beginPath();
    for (let q = Math.max(keys[0][0], lt - 1.2), first = true; q <= lt; q += 0.1, first = false) { const [tx, ty] = sample(keys, q); first ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty); }
    ctx.stroke();
    ctx.shadowColor = c; ctx.shadowBlur = 10 / k; drawIcon(ctx, sp?.icon, x, y, 11 / k, c); ctx.restore();
  }
  ctx.restore();

  post(ctx, W, H, t, "rgba(0,20,30,0.08)");

  // the missing team's name plates, lit one at a time on the right
  const p = a.plates04;
  if (p) {
    const pa = win(lt, p.from, p.to, 0.4);
    if (pa > 0.01) {
      const x0 = W - 34 - 372, y0 = 150; ctx.save(); ctx.globalAlpha = pa;
      ctx.font = "16px Consolas"; ctx.fillStyle = DIM; ctx.fillText(p.title, x0, y0 - 12);
      p.rows.forEach((row: any, i: number) => {
        const age = lt - row.t; if (age < 0) return;
        const y = y0 + i * 58, fl = clamp(1 - age / 0.35);
        ctx.fillStyle = `rgba(${Math.round(20 + 90 * fl)},${Math.round(26 + 100 * fl)},${Math.round(30 + 100 * fl)},0.82)`; ctx.fillRect(x0, y, 372, 48);
        ctx.strokeStyle = "rgba(160,176,180,0.55)"; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y, 372, 48);
        ctx.fillStyle = "rgba(160,176,180,0.9)"; ctx.fillRect(x0, y, 5, 48);
        ctx.font = "bold 20px Consolas"; ctx.fillStyle = "rgba(196,208,212,0.95)"; ctx.fillText(row.id, x0 + 20, y + 31);
        ctx.font = "17px Consolas"; ctx.fillStyle = "rgba(150,164,168,0.95)"; ctx.fillText(row.text, x0 + 110, y + 30);
      });
      ctx.restore();
    }
  }
  // altitude strip, bottom right
  ctx.font = "16px Consolas"; ctx.fillStyle = DIM; const [fx, fy] = sample(a.heli.keys, lt), km = Math.hypot(fx - a.heli.pad[0], fy - a.heli.pad[1]) / (a.pxPerM ?? 3) / 1000;
  const alt = `${lt < a.heli.land ? `TRANSPORT TO SITE ${km.toFixed(1)} KM` : a.grid ?? ""}  //  ALT 9400 M  //  x${zoom.toFixed(1)}`;
  ctx.fillText(alt, W - 34 - 14 - ctx.measureText(alt).width, H - 34 - 13);

  hud(ctx, W, H, st, "#ff3a32");
  if (lt >= r.times[0]) { const since = (lt - r.times[0]) % r.period; drawPulseHud(ctx, W, H, t, { remaining: r.period - since, period: r.period, alert: 0, count: 1 }); }
  // a short fade from black at the head of the shot
  const fi = clamp(1 - lt / 0.5); if (fi > 0) { ctx.fillStyle = `rgba(2,6,10,${fi})`; ctx.fillRect(0, 0, W, H); }
  void PALE;
  return cv;
}
