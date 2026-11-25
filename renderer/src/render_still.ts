// Renders one still per style for the motel test scene.
// Usage: node src/render_still.ts
import fs from "node:fs";
import { loadScene } from "./geometry.ts";
import { loadPlates, renderFrame, type FrameState } from "./compose.ts";

const scene = loadScene("../scene/motel.json");
const plates = await loadPlates("../concepts/plate_xray_b.png", "../concepts/plate_real_a.png");
fs.mkdirSync("../renders", { recursive: true });

const st: FrameState = {
  t: 1.3,
  doors: Object.fromEntries(scene.doors.map((d: any) => [d.id, d.open])),
  operators: scene.operators,
  entity: { ...scene.entity, id: "X", visible: 1 },
  explored: [],
  hud: { label: "SITE 07 // ROUTE 9 MOTEL // CAM-OVH", clock: "02:14:07" },
};

for (const style of ["S2", "S3"] as const) {
  for (const [tag, camera] of [["wide", undefined], ["mid", { cx: 1150, cy: 576, zoom: 1.25 }]] as const) {
    const cv = renderFrame(scene, plates, style, { ...st, camera });
    fs.writeFileSync(`../renders/still_${style}_${tag}.png`, cv.toBuffer("image/png"));
    console.log("wrote", `renders/still_${style}_${tag}.png`);
  }
}
