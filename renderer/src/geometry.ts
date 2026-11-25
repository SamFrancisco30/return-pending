// Derives walls, doors, rooms and props from scene/*.json.
// Two map formats:
//   template "motel"    - corridor + unit rows (the first test scene)
//   template "explicit" - walls as axis-aligned segments, doors placed on walls, rooms/props listed
// All coordinates are in the scene canvas space (2048x1152).
import fs from "node:fs";

export type Rect = { x: number; y: number; w: number; h: number };
export type Door = {
  id: string; open: boolean;
  axis: "h" | "v";          // wall orientation the door sits in
  hx: number; hy: number;   // hinge point; closed leaf runs +x (h) or +y (v) from it
  width: number;
  swing: number;            // h: -1 opens up, +1 opens down; v: -1 opens left, +1 opens right
  row?: string; intoRoomSign?: number;
};
export type Room = { id: string; rect: Rect; row?: "top" | "bottom" };
export type Prop =
  | { type: "car" | "pillar" | "stairs" | "box"; x: number; y: number; w: number; h: number; rot?: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number };

export function loadScene(path: string) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function wallBuilder(t: number) {
  const walls: Rect[] = [];
  const hWall = (y: number, xa: number, xb: number, gaps: [number, number][]) => {
    let x = xa;
    for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
      if (g0 > x) walls.push({ x, y: y - t / 2, w: g0 - x, h: t });
      x = Math.max(x, g1);
    }
    if (xb > x) walls.push({ x, y: y - t / 2, w: xb - x, h: t });
  };
  const vWall = (x: number, ya: number, yb: number, gaps: [number, number][]) => {
    let y = ya;
    for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
      if (g0 > y) walls.push({ x: x - t / 2, y, w: t, h: g0 - y });
      y = Math.max(y, g1);
    }
    if (yb > y) walls.push({ x: x - t / 2, y, w: t, h: yb - y });
  };
  return { walls, hWall, vWall };
}

export function buildGeometry(s: any) {
  return s.template === "explicit" ? buildExplicit(s) : buildMotel(s);
}

// ---------------- explicit maps ----------------
function buildExplicit(s: any) {
  const t = s.wall ?? 16;
  const { walls, hWall, vWall } = wallBuilder(t);
  const doors: Door[] = (s.doors ?? []).map((d: any) => ({ ...d, open: !!d.open }));
  for (const [x1, y1, x2, y2] of s.walls as number[][]) {
    if (y1 === y2) {
      const xa = Math.min(x1, x2), xb = Math.max(x1, x2);
      const gaps = doors.filter(d => d.axis === "h" && Math.abs(d.hy - y1) < 1 && d.hx >= xa && d.hx < xb).map(d => [d.hx, d.hx + d.width] as [number, number]);
      hWall(y1, xa - t / 2, xb + t / 2, gaps);
    } else {
      const ya = Math.min(y1, y2), yb = Math.max(y1, y2);
      const gaps = doors.filter(d => d.axis === "v" && Math.abs(d.hx - x1) < 1 && d.hy >= ya && d.hy < yb).map(d => [d.hy, d.hy + d.width] as [number, number]);
      vWall(x1, ya, yb, gaps);
    }
  }
  const rooms: Room[] = (s.rooms ?? []).map((r: any) => ({ id: r.id, rect: { x: r.x, y: r.y, w: r.w, h: r.h } }));
  const props: Prop[] = [...(s.props ?? [])];
  // parking stall rows: stripes + cars in occupied stalls (cars nose toward the aisle)
  for (const row of s.stallRows ?? []) {
    for (let i = 0; i <= row.count; i++) {
      const x = row.x0 + i * row.w;
      props.push({ type: "line", x1: x, y1: row.y0, x2: x, y2: row.y1 });
    }
    row.occupied.forEach((o: number, i: number) => {
      if (!o) return;
      const cw = row.w * 0.72, ch = (row.y1 - row.y0) * 0.86;
      props.push({ type: "car", x: row.x0 + i * row.w + (row.w - cw) / 2, y: row.y0 + (row.y1 - row.y0 - ch) / 2, w: cw, h: ch });
    });
  }
  return { walls, doors, rooms, props, unitW: 0 };
}

// ---------------- motel template ----------------
function buildMotel(s: any) {
  const b = s.building, c = s.corridor, t = b.wall;
  const unitW = (b.x1 - b.x0) / s.unit.count;
  const { walls, hWall, vWall } = wallBuilder(t);

  const doors: Door[] = s.doors.map((d: any) => {
    const ux = b.x0 + d.unit * unitW;
    const hx = ux + s.unit.bathW + s.doorGeom.offsetInBedroom;
    const top = d.row === "top";
    return { id: d.id, row: d.row, open: d.open, axis: "h", hx, hy: top ? c.y0 : c.y1,
             width: s.doorGeom.width, swing: top ? -1 : 1, intoRoomSign: top ? -1 : 1 };
  });
  // optional exterior door in the exit gap: vertical wall, swings outward (toward -x)
  if (s.exitDoor) doors.push({ id: "EXIT", open: !!s.exitDoor.open, axis: "v", hx: b.x0, hy: s.exit.y0,
                               width: s.exit.y1 - s.exit.y0, swing: -1 });
  const gapsFor = (row: string) =>
    doors.filter(d => d.row === row).map(d => [d.hx, d.hx + d.width] as [number, number]);

  hWall(b.y0, b.x0 - t / 2, b.x1 + t / 2, []);
  hWall(b.y1, b.x0 - t / 2, b.x1 + t / 2, []);
  hWall(c.y0, b.x0, b.x1, gapsFor("top"));
  hWall(c.y1, b.x0, b.x1, gapsFor("bottom"));
  vWall(b.x0, b.y0, b.y1, [[s.exit.y0, s.exit.y1]]);
  vWall(b.x1, b.y0, b.y1, []);

  const rooms: (Room & { bed: Rect; bath: Rect; bedroom: Rect; toilet: { x: number; y: number }; window: Rect })[] = [];
  for (let i = 0; i < s.unit.count; i++) {
    const ux = b.x0 + i * unitW;
    if (i > 0) { vWall(ux, b.y0, c.y0, []); vWall(ux, c.y1, b.y1, []); }
    const bx = ux + s.unit.bathW;
    vWall(bx, b.y0, c.y0, [[c.y0 - 150, c.y0 - 60]]);
    vWall(bx, c.y1, b.y1, [[c.y1 + 60, c.y1 + 150]]);
    for (const row of ["top", "bottom"] as const) {
      const top = row === "top";
      const ry0 = top ? b.y0 : c.y1, ry1 = top ? c.y0 : b.y1;
      const bedW = 150, bedH = 210;
      const bedX = bx + (unitW - s.unit.bathW) * 0.62 - bedW / 2;
      const bedY = top ? b.y0 + t + 24 : b.y1 - t - 24 - bedH;
      rooms.push({
        id: `${top ? "T" : "B"}${i + 1}`, row,
        rect: { x: ux, y: ry0, w: unitW, h: ry1 - ry0 },
        bedroom: { x: bx, y: ry0, w: ux + unitW - bx, h: ry1 - ry0 },
        bath: { x: ux, y: ry0, w: s.unit.bathW, h: ry1 - ry0 },
        bed: { x: bedX, y: bedY, w: bedW, h: bedH },
        toilet: { x: ux + s.unit.bathW / 2, y: top ? b.y0 + 90 : b.y1 - 90 },
        window: { x: bx + (unitW - s.unit.bathW) * 0.3, y: top ? b.y0 - t / 2 : b.y1 - t / 2, w: 110, h: t },
      });
    }
  }
  return { walls, doors, rooms, props: [] as Prop[], unitW };
}
