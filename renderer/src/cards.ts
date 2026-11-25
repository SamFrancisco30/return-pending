// Full-screen program cards: title sting, case file (briefing), personnel recovery report (ending).
// Data comes from timeline.cards (compile_timeline.ts reads episode.json + state_before.json).
import { createCanvas, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import { post } from "./compose.ts";
import { drawIcon, rgba } from "./thermal.ts";

const PALE = "rgba(214,234,238,0.95)", DIM = "rgba(150,180,186,0.75)", AMBER = "#ffc15a", ALERT = "#ff5a4a", GREEN = "#7dffaa";
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

type Seg = { text: string; color?: string; bold?: boolean; icon?: string; iconColor?: string };
type Row = { label?: string; segs: Seg[]; bar?: { before: number; after: number; color: string } };

function frame(W: number, H: number) {
  const cv = createCanvas(W, H), ctx = cv.getContext("2d");
  ctx.fillStyle = "#04070a"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(120,170,180,0.05)"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  return { cv, ctx };
}

function header(ctx: SKRSContext2D, small: string, big: string, x: number, y: number, a: number) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.font = "20px Consolas"; ctx.fillStyle = DIM; ctx.fillText(small.split("").join(" "), x, y);
  ctx.font = "bold 60px Consolas"; ctx.fillStyle = PALE; ctx.fillText(big, x, y + 70);
  ctx.fillStyle = "rgba(150,200,210,0.35)"; ctx.fillRect(x, y + 96, 1620, 2);
  ctx.restore();
}

// rows typed out in order; `budget` = characters revealed so far. Returns the y after the last row.
// rowStart receives, per row, the card-local time its typing begins (t0 + chars before it / rate)
function typeRows(ctx: SKRSContext2D, rows: Row[], x: number, valX: number, y0: number, lh: number, t0: number, rate: number, lt: number, rowStart: number[]) {
  let left = (lt - t0) * rate, y = y0, before = 0;
  rows.forEach((r, i) => {
    rowStart[i] = t0 + before / rate;
    before += (r.label?.length ?? 0) + r.segs.reduce((s, g) => s + g.text.length, 0);
    if (left <= 0) return;
    if (r.label) {
      const s = r.label.slice(0, Math.max(0, left)); left -= r.label.length;
      ctx.font = "22px Consolas"; ctx.fillStyle = DIM; ctx.fillText(s, x, y);
    }
    let cx = valX;
    for (const g of r.segs) {
      if (left <= 0) break;
      if (g.icon) { drawIcon(ctx, g.icon as any, cx + 8, y - 8, 8, g.iconColor ?? PALE); cx += 28; }
      const s = g.text.slice(0, Math.max(0, left)); left -= g.text.length;
      ctx.font = `${g.bold ? "bold " : ""}28px Consolas`; ctx.fillStyle = g.color ?? PALE; ctx.fillText(s, cx, y);
      cx += ctx.measureText(g.text).width;
    }
    y += lh;
  });
  return y;
}

// ---------- 0:07 title sting ----------
export function renderTitleCard(cards: any, lt: number, dur: number, W = 1920, H = 1080) {
  const cv = createCanvas(W, H), ctx = cv.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (lt > 0.12) {
    const txt = `${cards.program ?? "WAYFARER RECOVERY PROGRAM"} // FILE ${cards.file ?? "001"}`;
    ctx.font = "bold 34px Consolas"; ctx.fillStyle = `rgba(220,238,240,${lt < 0.2 ? 0.4 : 0.95})`;
    ctx.fillText(txt, W / 2 - ctx.measureText(txt).width / 2, H / 2 + 12);
  }
  return cv;
}

// ---------- 0:08 case file ----------
export function renderCaseCard(cards: any, plates: { xray: Image }, beacon: number[] | null, lt: number, dur: number, W: number, H: number, t: number) {
  const { cv, ctx } = frame(W, H);
  const X = 150, VX = 470, RY = 420;
  header(ctx, cards.program, `CASE FILE ${cards.file}`, X, 230, clamp(lt / 0.3));
  const rows: Row[] = [
    { label: "SITE", segs: [{ text: cards.site }] },
    { label: "OBJECTIVE", segs: [{ text: cards.objective }] },
    ...cards.personnel.map((p: any, i: number) => ({
      label: i === 0 ? "PERSONNEL" : "",
      segs: [{ text: p.callsign.padEnd(8), color: p.color, bold: true, icon: p.icon, iconColor: p.color },
             { text: `EXPOSURE ${String(p.before).padStart(2)}%`, color: PALE },
             ...(p.note ? [{ text: `   ${p.note}`, color: AMBER }] : [])],
    })),
  ];
  const starts: number[] = [];
  typeRows(ctx, rows, X, VX, RY, 64, 0.5, 75, lt, starts);

  // SRS thumbnail: last reconstruction, beacon signal blinking
  const ta = clamp((lt - 1.0) / 0.5);
  if (ta > 0) {
    const tw = 560, th = 315, tx = W - 150 - tw, ty = 410;
    ctx.save(); ctx.globalAlpha = ta;
    ctx.filter = "brightness(0.6) saturate(0.5)"; ctx.drawImage(plates.xray, tx, ty, tw, th); ctx.filter = "none";
    ctx.strokeStyle = "rgba(150,200,210,0.6)"; ctx.lineWidth = 1.5; ctx.strokeRect(tx, ty, tw, th);
    ctx.font = "18px Consolas"; ctx.fillStyle = DIM; ctx.fillText("SRS // LAST RECONSTRUCTION", tx, ty - 14);
    if (beacon) {
      const bx = tx + beacon[0] / 2048 * tw, by = ty + beacon[1] / 1152 * th, on = Math.floor(t * 1.6) % 2 === 0;
      ctx.fillStyle = on ? GREEN : "rgba(60,140,90,0.6)"; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(GREEN, 0.7); ctx.beginPath(); ctx.arc(bx, by, 14 + (t * 20) % 16, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "bold 18px Consolas"; ctx.fillStyle = GREEN; ctx.fillText("LAST SIGNAL", bx - 130, by - 20);
    }
    ctx.restore();
  }

  // status stamp
  const sa = lt - 6.0;
  if (sa > 0) {
    ctx.font = "22px Consolas"; ctx.fillStyle = DIM; ctx.fillText("STATUS", X, RY + 64 * rows.length + 40);
    const k = 1 + 0.5 * (1 - clamp(sa / 0.14));
    ctx.save(); ctx.translate(VX + 210, RY + 64 * rows.length + 30); ctx.rotate(-0.04); ctx.scale(k, k);
    ctx.globalAlpha = clamp(sa / 0.08);
    ctx.font = "bold 46px Consolas"; const txt = "RETURN PENDING", w = ctx.measureText(txt).width;
    ctx.strokeStyle = ALERT; ctx.lineWidth = 4; ctx.strokeRect(-w / 2 - 22, -44, w + 44, 66);
    ctx.fillStyle = ALERT; ctx.fillText(txt, -w / 2, 6);
    ctx.restore();
  }
  post(ctx, W, H, t, "rgba(0,20,30,0.06)");
  return cv;
}

// ---------- 3:40 personnel recovery report ----------
export function renderReportCard(cards: any, lastSignal: string, lt: number, dur: number, W: number, H: number, t: number) {
  const { cv, ctx } = frame(W, H);
  const X = 150, VX = 560, tail = dur - 4;                 // last 4 s: everything fades but the beacon light
  const fade = clamp(1 - (lt - tail) / 1.2);
  ctx.save(); ctx.globalAlpha = fade;
  header(ctx, `${cards.program} // FILE ${cards.file} // ${String(cards.site).split(" · ")[0]}`, "PERSONNEL RECOVERY REPORT", X, 160, clamp(lt / 0.3));
  const rec = cards.recovered?.[0];
  const rows: Row[] = [
    { label: "MISSION OBJECTIVE", segs: [{ text: cards.result, bold: true }] },
    { label: "EXPOSURE", segs: [{ text: "BEFORE -> AFTER STABILIZER", color: DIM }] },
    ...cards.personnel.map((p: any) => ({
      label: "", bar: { before: p.before, after: p.after, color: p.color },
      segs: [{ text: p.callsign.padEnd(8), color: p.color, bold: true, icon: p.icon, iconColor: p.color },
             { text: p.status.padEnd(10), color: PALE },
             { text: `${String(p.before).padStart(2)}% -> ${String(p.after).padStart(2)}%`, color: PALE }],
    })),
    { label: "RECOVERY PAYMENT", segs: [{ text: `$${Number(cards.payment).toLocaleString("en-US")}` }] },
    { label: "STABILIZER ACCESS", segs: [{ text: cards.stabilizer }] },
    ...(rec ? [{ label: "RECOVERED ITEMS", segs: [{ text: `${rec.label} (REGISTRATION: ` }, { text: rec.record, color: AMBER, bold: true }, { text: ")" }] }] : []),
    { label: "LAST KNOWN SIGNAL", segs: [{ text: lastSignal }] },
  ];
  const starts: number[] = [], y0 = 350, lh = 58;
  typeRows(ctx, rows, X, VX, y0, lh, 0.4, 80, lt, starts);
  // exposure bars: before (dim) sliding to after
  rows.forEach((r, i) => {
    if (!r.bar || lt < starts[i]) return;
    const u = clamp((lt - starts[i] - 0.6) / 0.9), v = r.bar.before + (r.bar.after - r.bar.before) * (u * u * (3 - 2 * u));
    const bx = 1180, by = y0 + i * lh - 20, bw = 420;
    ctx.fillStyle = "rgba(120,150,155,0.18)"; ctx.fillRect(bx, by, bw, 18);
    ctx.fillStyle = rgba(r.bar.color, 0.25); ctx.fillRect(bx, by, bw * r.bar.before / 100, 18);
    ctx.fillStyle = rgba(r.bar.color, 0.9); ctx.fillRect(bx, by, bw * v / 100, 18);
    ctx.fillStyle = PALE; ctx.fillRect(bx + bw * v / 100 - 1, by - 4, 2, 26);
  });
  ctx.restore();
  // the beacon light outlives the report
  const ri = rows.findIndex(r => r.label === "RECOVERED ITEMS");
  if (ri >= 0 && lt >= starts[ri] && lt < dur - 0.45) {
    const on = Math.floor(t * 1.6) % 2 === 0 || lt > tail + 1.4 && lt < tail + 1.6;
    const bx = X - 40, by = y0 + ri * lh - 9;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, 34);
    g.addColorStop(0, `rgba(90,255,150,${on ? 0.6 : 0.15})`); g.addColorStop(1, "rgba(40,200,100,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 34, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = on ? GREEN : "#2f7a4c"; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
  }
  if (fade > 0.02) post(ctx, W, H, t, "rgba(0,20,30,0.06)");
  return cv;
}
