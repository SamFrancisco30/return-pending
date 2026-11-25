// Design boards: stills and short loops that are reviewed BEFORE an episode is animated.
//   node src/board.ts cast|boss|inmate|map|loops  <outDir>
// Everything is drawn with the same functions the episode renderer uses, so what is approved here is what appears.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { loadScene, buildGeometry } from "./geometry.ts";
import { drawOperatorThermal, drawIdentityArc, drawEntityThermal, drawIcon, rgba, drawKit } from "./thermal.ts";
import { drawPulse, drawImpacts } from "./fx.ts";

GlobalFonts.registerFromPath("C:/Windows/Fonts/consola.ttf", "Consolas");
GlobalFonts.registerFromPath("C:/Windows/Fonts/msyh.ttc", "YaHei");
const [, , which, outDir = "../episodes/file_001_deathrow/boards"] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const W = 1920, H = 1080, CN = "YaHei", EN = "Consolas";
const INK = "#e8f2f4", DIMC = "rgba(170,200,205,0.85)", LINE = "rgba(150,185,190,0.35)";

function base(title: string, sub: string) {
  const cv = createCanvas(W, H), ctx = cv.getContext("2d");
  ctx.fillStyle = "#05090b"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(60,90,96,0.25)"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.font = `16px ${EN}`; ctx.fillStyle = DIMC; ctx.fillText("RETURN PENDING // FILE 001 // DESIGN BOARD", 48, 48);
  ctx.font = `bold 40px ${CN}`; ctx.fillStyle = INK; ctx.fillText(title, 48, 100);
  ctx.font = `20px ${CN}`; ctx.fillStyle = DIMC; ctx.fillText(sub, 48, 134);
  ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(48, 152); ctx.lineTo(W - 48, 152); ctx.stroke();
  return { cv, ctx };
}
const save = (cv: any, name: string) => { const p = path.join(outDir, name); fs.writeFileSync(p, cv.toBuffer("image/png")); console.log("wrote", p); };
function text(ctx: SKRSContext2D, lines: string[], x: number, y: number, size = 19, color = DIMC, lh = 1.5, center = false) {
  ctx.font = `${size}px ${CN}`; ctx.fillStyle = color;
  lines.forEach((l, i) => ctx.fillText(l, center ? x - ctx.measureText(l).width / 2 : x, y + i * size * lh));
}
// draw something authored in scene units, magnified k times, centred at (cx, cy)
function mag(ctx: SKRSContext2D, cx: number, cy: number, k: number, draw: () => void) { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); draw(); ctx.restore(); }
function floorDisc(ctx: SKRSContext2D, cx: number, cy: number, r: number) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, "rgba(40,62,68,0.55)"); g.addColorStop(1, "rgba(10,18,20,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
}
const entity = (ctx: SKRSContext2D, sp: string, pose: number, t: number, o: any = {}) =>
  drawEntityThermal(ctx, { x: o.x ?? 0, y: o.y ?? 0, heading: o.h ?? -90, visible: 1, glitch: o.g ?? 0, pose, look: o.look ?? 0, hidden: 0, reach: o.reach ?? 0 }, t, false, sp, 1);

const roster = loadScene("../scene/deathrow.json").roster;
const CAST: Record<string, { rank: string; role: string; gear: string; job: string[] }> = {
  KNOX: { rank: "A", role: "队长 · 持盾", gear: "强化盾牌 + 霰弹枪", job: ["挡：守通道、顶住冲击、", "给队友争取时间"] },
  HOUND: { rank: "B", role: "猎人", gear: "弩（可带绳）+ 战斧", job: ["够：低噪声出手，", "处理别人够不着的东西"] },
  REYES: { rank: "D", role: "侦察员 · 新人", gear: "手枪 + 狙击枪", job: ["看：先发现，再动手；", "本集由她看懂规则"] },
  MILLER: { rank: "C", role: "步枪手", gear: "步枪", job: ["贴身掩护 COLE；", "第二次换位中被击中"] },
  COLE: { rank: "C", role: "回收员", gear: "手枪 + 急救包", job: ["确认身份和生命体征；", "第一次换位被换进牢房"] },
};

// ---------------- board: cast ----------------
const KIT: Record<string, string[]> = {
  KNOX: ["盾：左为行进，右为防御姿态", "泵动霰弹枪：右手"],
  HOUND: ["弩（左）和战斧（右）：手里只拿一样，", "另一样收起，画面上不显示"],
  REYES: ["狙击枪：瞄准镜、两脚架、长枪管", "手枪：右胯枪套"],
  MILLER: ["步枪：弹匣在侧面，带瞄具"],
  COLE: ["手枪：双手持握", "急救包：背上的白十字"],
};
function cast() {
  const { cv, ctx } = base("出场人员", "五名队员在 SRS 俯视画面里的造型。白色热像 = 人；颜色和图标 = 身份；装备是冷色钢铁加亮边，只有 KNOX 的盾发光。");
  roster.forEach((r: any, i: number) => {
    const cx = 215 + i * 372, cy = 360, c = CAST[r.callsign];
    floorDisc(ctx, cx, cy, 170);
    mag(ctx, cx, cy, 2.25, () => { const u = { id: r.id, x: 0, y: 0, heading: -90, gait: { phase: 0, moving: 0 } }; drawIdentityArc(ctx, u, r, 1); drawOperatorThermal(ctx, u, r, 1.2, 1); });
    if (r.kit === "shield") { mag(ctx, cx + 118, cy + 92, 1.05, () => { const u = { id: r.id, x: 0, y: 0, heading: -90, guard: 1 }; drawOperatorThermal(ctx, u, r, 1.2, 1); }); text(ctx, ["防御姿态"], cx + 118, cy + 160, 15, DIMC, 1.5, true); }
    if (r.kit === "crossbow") { mag(ctx, cx + 122, cy + 92, 1.05, () => { const u = { id: r.id, x: 0, y: 0, heading: -90, guard: 1 }; drawOperatorThermal(ctx, u, r, 1.2, 1); }); text(ctx, ["持斧"], cx + 122, cy + 160, 15, DIMC, 1.5, true); }
    drawIcon(ctx, r.icon, cx - 150, 532, 11, r.color);
    ctx.font = `bold 32px ${EN}`; ctx.fillStyle = r.color; ctx.fillText(r.callsign, cx - 130, 544);
    ctx.font = `bold 20px ${EN}`; ctx.fillStyle = INK; ctx.fillText(`RANK ${c.rank}`, cx + 40, 541);
    text(ctx, [c.role], cx - 150, 578, 21, INK);
    text(ctx, c.job, cx - 150, 610, 17);
    // the kit on its own, larger, pointing right
    ctx.strokeStyle = LINE; ctx.strokeRect(cx - 160, 672, 330, 250);
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 160, 672, 330, 250); ctx.clip();
    if (r.kit === "shield") {
      mag(ctx, cx - 110, 800, 1.9, () => drawKit(ctx, r.kit, r.color, 0)); mag(ctx, cx + 55, 800, 1.9, () => drawKit(ctx, r.kit, r.color, 1));
    } else if (r.kit === "crossbow") {
      mag(ctx, cx - 130, 800, 2.3, () => drawKit(ctx, r.kit, r.color, 0)); mag(ctx, cx + 12, 780, 2.5, () => drawKit(ctx, r.kit, r.color, 1));
    } else mag(ctx, cx - (r.kit === "recon" ? 95 : 40), 800, 3.1, () => drawKit(ctx, r.kit, r.color));
    ctx.restore();
    text(ctx, KIT[r.callsign], cx - 160, 950, 17, rgba(r.color, 0.95), 1.45);
  });
  ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(48, 1006); ctx.lineTo(W - 48, 1006); ctx.stroke();
  text(ctx, ["身份标记：KNOX 青色三角 · HOUND 绿色箭头 · REYES 紫色菱形 · MILLER 黄色方块 · COLE 白色十字"], 48, 1040, 18);
  save(cv, "board_cast.png");
}

// ---------------- board: the condemned ----------------
function boss() {
  const { cv, ctx } = base("死囚（UNK-01）", "戴着异常镣铐的死刑犯。红色 = 异常；手腕上的镣铐是他身上唯一的冷色亮点，和它发出的涟漪同色。");
  const poses: [string, string[], () => void][] = [
    ["坐姿", ["平时的样子：坐在牢房正中，", "面朝大厅，清醒，不动。"], () => entity(ctx, "prisoner", 0, 1.3)],
    ["站立", ["被换出来后约 1 秒站起。", "肩宽接近队员的两倍。"], () => entity(ctx, "prisoner", 1, 1.3)],
    ["挥拳", ["带前冲的重拳，够到约 1.5 米。", "打不穿 KNOX 的盾。"], () => entity(ctx, "prisoner", 1, 1.3, { reach: 1 })],
    ["换位瞬间", ["位置对调的一刻信号撕裂；", "姿势和动作原样保留。"], () => entity(ctx, "prisoner", 1, 0.37, { reach: 0.8, g: 0.8 })],
  ];
  poses.forEach(([name, note, draw], i) => {
    const cx = 215 + i * 345, cy = 420;
    floorDisc(ctx, cx, cy, 180); mag(ctx, cx, cy, 2.6, draw);
    text(ctx, [name], cx, 640, 28, INK, 1.5, true); text(ctx, note, cx, 680, 18, DIMC, 1.5, true);
  });
  // the ripple, to scale against the figure
  const rx = 1670, ry = 470;
  ctx.save(); ctx.beginPath(); ctx.rect(1480, 190, 392, 560); ctx.clip();
  drawPulse(ctx, { x: rx, y: ry, r: 250, alpha: 1, zone: [[1480, 190, 392, 560]] }, undefined, 1); mag(ctx, rx, ry, 1.1, () => entity(ctx, "prisoner", 0, 1.3)); ctx.restore();
  ctx.strokeStyle = LINE; ctx.strokeRect(1480, 190, 392, 560);
  text(ctx, ["镣铐的涟漪（同比例）"], 1676, 790, 22, INK, 1.5, true);
  ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(48, 830); ctx.lineTo(W - 48, 830); ctx.stroke();
  text(ctx, ["行为规则", "· 攻击离自己最近、够得着的活人；最近的人够不着时，尽量靠近并持续尝试。", "· 控制不了换位：不能发动、取消、选人或改变间隔。", "· 走不出死囚区的边界。"], 48, 872, 19);
  text(ctx, ["镣铐（TRANSFER SHACKLES，CLASS 未定）", "· 每 20 秒发出一圈蓝色涟漪，约 4.5 米/秒，出不了死囚区。", "· 涟漪碰到的第一个活人被锁定 0.6 秒，然后与佩戴者换位。", "· 本集不回收。"], 1000, 872, 19);
  save(cv, "board_boss.png");
}

// ---------------- board: reanimated inmates ----------------
function inmate() {
  const { cv, ctx } = base("复苏的囚犯", "普通监区的小怪。和人一样大，红色比死囚暗。站在各自牢门口不动，像在等点名；听到响声就朝声音聚过来。");
  const poses: [string, string[], () => void][] = [
    ["站立待命", ["双臂下垂，头前倾。", "不靠近就没有反应。"], () => entity(ctx, "inmate", 0, 1.3)],
    ["转头", ["听到响声：身体不动，", "头先转向声音。"], () => entity(ctx, "inmate", 0, 1.3, { look: 75 })],
    ["扑击", ["双臂前伸扑上来。", "常规武器有效。"], () => entity(ctx, "inmate", 1, 1.3, { reach: 0.6 })],
  ];
  poses.forEach(([name, note, draw], i) => {
    const cx = 230 + i * 330, cy = 400;
    floorDisc(ctx, cx, cy, 170); mag(ctx, cx, cy, 3.0, draw);
    text(ctx, [name], cx, 620, 28, INK, 1.5, true); text(ctx, note, cx, 660, 18, DIMC, 1.5, true);
  });
  // sound: how loud each weapon is, drawn as rings on the map
  const sx = 1130, sy = 210; ctx.strokeStyle = LINE; ctx.strokeRect(sx, sy, 740, 520);
  text(ctx, ["声音在地图上的表现"], sx + 20, sy + 36, 22, INK);
  const ring = (x: number, y: number, R: number, n: number, col: string) => { for (let k = 0; k < n; k++) { ctx.strokeStyle = rgba(col, 0.8 - k * 0.22); ctx.lineWidth = 3 - k * 0.6; ctx.beginPath(); ctx.arc(x, y, R * (0.45 + k * 0.28), 0, Math.PI * 2); ctx.stroke(); } };
  ring(sx + 150, sy + 280, 60, 2, "#e8f2f4"); mag(ctx, sx + 150, sy + 280, 1.1, () => drawOperatorThermal(ctx, { id: "B", x: 0, y: 0, heading: 0 }, roster[1], 1, 1));
  text(ctx, ["弩、战斧", "很小的一圈"], sx + 150, sy + 420, 18, DIMC, 1.5, true);
  ring(sx + 510, sy + 280, 210, 3, "#ffe2b0"); mag(ctx, sx + 510, sy + 280, 1.1, () => drawOperatorThermal(ctx, { id: "D", x: 0, y: 0, heading: 0 }, roster[3], 1, 1));
  text(ctx, ["枪声", "一大圈，圈内的囚犯全部转头"], sx + 510, sy + 470, 18, DIMC, 1.5, true);
  ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(48, 770); ctx.lineTo(W - 48, 770); ctx.stroke();
  text(ctx, ["一群站着的样子（普通监区的常态）"], 48, 812, 20, INK);
  for (let i = 0; i < 9; i++) mag(ctx, 150 + i * 150, 940, 1.25, () => entity(ctx, "inmate", i === 5 ? 1 : 0, 1.3 + i * 0.7, { h: i === 5 ? 0 : 90, look: i === 3 || i === 4 ? 60 : 0, reach: i === 5 ? 0.6 : 0 }));
  text(ctx, ["他们不是活人，镣铐的涟漪不会选中他们。", "渲染器目前一次只能画一个实体；", "小怪战需要先加上\"多个实体\"的支持。"], 1500, 900, 18);
  save(cv, "board_inmate.png");
}

// ---------------- board: whole-episode map ----------------
async function map() {
  const { cv, ctx } = base("全集地图", "整集发生在两块区域：普通监区（左）经一条通道连到死囚区（右）。数字是剧情发生的位置。");
  const exists = (p: string) => fs.existsSync(p);
  const plan = async (scenePath: string, platePath: string, fit: any, bx: number, by: number, bw: number, beats: [number, number, string][], pxPerM: number, ox: number, oy: number) => {
    const s = loadScene(scenePath), g = buildGeometry(s), k = bw / 2048, bh = 1152 * k;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); ctx.translate(bx, by); ctx.scale(k, k);
    if (exists(platePath)) { const im = await loadImage(platePath); ctx.filter = "brightness(0.9) saturate(0.75)"; ctx.drawImage(im, fit.dx, fit.dy, 2048 * fit.sx, 1152 * fit.sy); ctx.filter = "none"; }
    else { ctx.fillStyle = "rgba(150,225,235,0.75)"; for (const w of g.walls) ctx.fillRect(w.x, w.y, w.w, w.h); }
    for (const [mx, my, n] of beats) {
      const x = ox + mx * pxPerM, y = oy + my * pxPerM;
      ctx.fillStyle = "rgba(4,10,12,0.9)"; ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffd98a"; ctx.lineWidth = 4; ctx.stroke();
      ctx.font = `bold 38px ${EN}`; ctx.fillStyle = "#ffd98a"; ctx.fillText(n, x - ctx.measureText(n).width / 2, y + 13);
    }
    ctx.restore(); ctx.strokeStyle = LINE; ctx.strokeRect(bx, by, bw, bh);
  };
  const tl = JSON.parse(fs.readFileSync("../episodes/file_001_deathrow/plates.json", "utf8"));
  await plan("../scene/greyrock_block.json", tl.block.xray, tl.block.fit, 48, 180, 900, [[1, 7.5, "1"], [6, 9, "2"], [10, 8.6, "3"], [15, 6.2, "4"], [19, 12.5, "5"], [23, 6, "6"], [29, 8.4, "7"], [35.4, 7.5, "8"]], 56, 8, 20);
  await plan("../scene/deathrow.json", tl.deathrow.xray, tl.deathrow.fit, 972, 180, 900, [[-2.6, 0, "8"], [0, -2.2, "9"], [12.7, 1.6, "10"], [21.8, -2.2, "11"]], 64, 300, 576);
  text(ctx, ["普通监区（单层：主厅 + 侧翼）"], 48, 720, 22, INK); text(ctx, ["死囚区（大厅 + 尽头的独立牢房）"], 972, 720, 22, INK);
  const L = [
    ["1", "入口：队伍从码头方向进入"], ["2", "HOUND 走在最前，低噪声放倒挡路的囚犯"], ["3", "第一具 Team 04 遗体倒在三个囚犯中间，HOUND 用带绳的弩箭拉出"],
    ["4", "一个囚犯从牢门里扑向 COLE，MILLER 开枪，整层囚犯转头"], ["5", "侧翼：囚犯从这里涌出，KNOX 用盾封住 4 米宽的入口"], ["6", "REYES 的位置：她先发现侧翼在聚集，再开枪"],
    ["7", "另外两具 Team 04 遗体"], ["8", "通道：连接两块区域，样片从这里开始"],
  ];
  const R = [["9", "边界线：涟漪到这里为止，死囚也走不出这条线"], ["10", "第四具 Team 04 遗体，COLE 上前确认"], ["11", "死囚的牢房：双层加厚墙，正面是重型栅栏"]];
  const list = (rows: string[][], x: number, y: number) => rows.forEach(([n, s], i) => {
    ctx.font = `bold 20px ${EN}`; ctx.fillStyle = "#ffd98a"; ctx.fillText(n.padStart(2, " "), x, y + i * 34); ctx.font = `19px ${CN}`; ctx.fillStyle = DIMC; ctx.fillText(s, x + 44, y + i * 34);
  });
  list(L, 48, 762); list(R, 972, 762);
  text(ctx, ["比例：普通监区主厅 33 × 6 米；死囚区大厅 19 × 6 米，牢房 5 × 7 米。", "原大纲写的是两层牢房；俯视画面画不出上下层，这里改成了单层加侧翼。"], 972, 900, 18);
  save(cv, "board_map.png");
}

// ---------------- loops ----------------
function loop(name: string, dur: number, draw: (ctx: SKRSContext2D, t: number) => void) {
  const dir = path.join(outDir, `_${name}`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < dur * 30; i++) {
    const cv = createCanvas(1280, 720), ctx = cv.getContext("2d");
    ctx.fillStyle = "#05090b"; ctx.fillRect(0, 0, 1280, 720); floorDisc(ctx, 640, 360, 420);
    draw(ctx, i / 30);
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, "0")}.png`), cv.toBuffer("image/png"));
  }
  const out = path.join(outDir, `${name}.mp4`);
  spawnSync(ffmpegPath as unknown as string, ["-y", "-loglevel", "error", "-framerate", "30", "-i", path.join(dir, "f%04d.png"), "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", out]);
  fs.rmSync(dir, { recursive: true, force: true }); console.log("wrote", out);
}
const ss = (u: number) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
function loops() {
  // the condemned: seated -> stands -> two blows on a shield -> a ripple leaves it
  loop("loop_boss", 8, (ctx, t) => {
    const pose = ss((t - 1.6) / 0.8) - ss((t - 7.2) / 0.7);
    const blow = (c: number) => Math.max(0, 1 - Math.abs(t - c) / 0.28);
    const reach = Math.max(blow(3.3), blow(4.5)), lunge = reach * 26;
    const k = 3.2, sx = 520;
    if (t > 5.4) drawPulse(ctx, { x: sx, y: 360, r: (t - 5.4) * 330, alpha: Math.max(0, 1 - (t - 5.4) / 2.2), zone: [[0, 0, 1280, 720]] }, undefined, t);
    mag(ctx, sx + lunge, 360, k, () => entity(ctx, "prisoner", pose, t, { h: 0, reach }));
    if (t > 2.6 && t < 5.2) mag(ctx, sx + 330, 360, k, () => drawOperatorThermal(ctx, { id: "A", x: 0, y: 0, heading: 180 }, roster[0], t, 1));
    drawImpacts(ctx, [3.3, 4.5].map(c => ({ x: sx + 215, y: 360, r: 150, age: t - c })).filter(i => i.age >= 0));
    ctx.font = `22px ${CN}`; ctx.fillStyle = DIMC; ctx.fillText(t < 1.6 ? "坐姿" : t < 2.6 ? "站起" : t < 5.2 ? "攻击盾牌" : "镣铐发出涟漪", 40, 680);
  });
  // an inmate: stands -> a shot is fired -> head turns -> lunges
  loop("loop_inmate", 6, (ctx, t) => {
    const look = 80 * (ss((t - 1.6) / 0.5) - ss((t - 2.8) / 0.3)), turn = 90 * (1 - ss((t - 2.8) / 0.5));
    const pose = ss((t - 3.1) / 0.4), run = Math.max(0, t - 3.3) * 150;
    if (t > 1.2 && t < 2.6) { const a = t - 1.2; for (let k2 = 0; k2 < 3; k2++) { ctx.strokeStyle = `rgba(255,226,176,${Math.max(0, 0.8 - a * 0.6 - k2 * 0.2)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1180, 360, Math.max(1, a * 700 - k2 * 60), 0, Math.PI * 2); ctx.stroke(); } }
    mag(ctx, 420 + run, 360, 3.4, () => entity(ctx, "inmate", pose, t, { h: turn, look, reach: pose * 0.6 }));
    ctx.font = `22px ${CN}`; ctx.fillStyle = DIMC; ctx.fillText(t < 1.2 ? "站立待命" : t < 2.8 ? "枪声：头先转过去" : "扑击", 40, 680);
  });
}

if (which === "cast") cast(); else if (which === "boss") boss(); else if (which === "inmate") inmate(); else if (which === "map") await map(); else if (which === "loops") loops();
else { cast(); boss(); inmate(); loops(); }
