// Draws a plain floor-plan image of a scene, used as the layout reference for image generation.
// Usage: node src/layout_ref.ts ../scene/motel.json ../scene/motel_layout_ref.png [--no-doors]
import fs from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { loadScene, buildGeometry } from "./geometry.ts";

const [, , scenePath, outPath] = process.argv;
const s = loadScene(scenePath);
const g = buildGeometry(s);
const cv = createCanvas(s.canvas.w, s.canvas.h);
const ctx = cv.getContext("2d");

ctx.fillStyle = "#000"; ctx.fillRect(0, 0, s.canvas.w, s.canvas.h);
if (s.walkway) { ctx.fillStyle = "#3a3a3a"; ctx.fillRect(s.walkway.x0, 0, s.walkway.x1 - s.walkway.x0, s.canvas.h); }
// floor
const fl = s.floor ?? (s.building ? { x: s.building.x0, y: s.building.y0, w: s.building.x1 - s.building.x0, h: s.building.y1 - s.building.y0 } : null);
if (fl) { ctx.fillStyle = "#1c1c1c"; ctx.fillRect(fl.x, fl.y, fl.w, fl.h); }

// motel furniture hints
ctx.strokeStyle = "#8a8a8a"; ctx.lineWidth = 4;
for (const r of g.rooms as any[]) {
  if (!r.bed) continue;
  ctx.strokeRect(r.bed.x, r.bed.y, r.bed.w, r.bed.h);
  ctx.beginPath(); ctx.ellipse(r.toilet.x, r.toilet.y, 22, 30, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#cfcfcf"; ctx.fillRect(r.window.x, r.window.y + 4, r.window.w, r.window.h - 8);
}
// generic props
for (const p of g.props) {
  if (p.type === "line") {
    ctx.strokeStyle = "#5a5a5a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
  } else if (p.type === "car") {
    ctx.fillStyle = "#4a4a4a"; ctx.strokeStyle = "#9a9a9a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2a2a2a"; ctx.fillRect(p.x + p.w * 0.14, p.y + p.h * 0.3, p.w * 0.72, p.h * 0.4); // cabin
  } else if (p.type === "pillar") {
    ctx.fillStyle = "#d0d0d0"; ctx.fillRect(p.x, p.y, p.w, p.h);
  } else if (p.type === "stairs") {
    ctx.strokeStyle = "#8a8a8a"; ctx.lineWidth = 3; ctx.strokeRect(p.x, p.y, p.w, p.h);
    for (let y = p.y; y < p.y + p.h; y += 22) { ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.w, y); ctx.stroke(); }
  } else {
    ctx.strokeStyle = "#8a8a8a"; ctx.lineWidth = 3; ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
}
// walls
ctx.fillStyle = "#ffffff";
for (const w of g.walls) ctx.fillRect(w.x, w.y, w.w, w.h);
// doors: closed = thin bar in the gap, open = leaf swung
ctx.fillStyle = "#bdbdbd";
for (const d of process.argv.includes("--no-doors") ? [] : g.doors) {
  if (d.axis === "h") {
    if (d.open) ctx.fillRect(d.hx - 4, d.swing < 0 ? d.hy - d.width : d.hy, 8, d.width);
    else ctx.fillRect(d.hx, d.hy - 4, d.width, 8);
  } else {
    if (d.open) ctx.fillRect(d.swing < 0 ? d.hx - d.width : d.hx, d.hy - 4, d.width, 8);
    else ctx.fillRect(d.hx - 4, d.hy, 8, d.width);
  }
}
fs.writeFileSync(outPath, cv.toBuffer("image/png"));
console.log("wrote", outPath);
