"""Builds labelled comparison sheets from concepts/ images."""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, "concepts")
FONT = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 30)
SMALL = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 22)


def sheet(items, out, cols=2, w=1024):
    h = w * 9 // 16
    lab = 70
    rows = (len(items) + cols - 1) // cols
    pad = 16
    S = Image.new("RGB", (cols * w + (cols + 1) * pad, rows * (h + lab) + (rows + 1) * pad), (14, 16, 18))
    d = ImageDraw.Draw(S)
    for i, (path, title, sub) in enumerate(items):
        r, c = divmod(i, cols)
        x, y = pad + c * (w + pad), pad + r * (h + lab + pad)
        im = Image.open(os.path.join(ROOT, path)).convert("RGB")
        # letterbox to 16:9
        im.thumbnail((w, h))
        S.paste(im, (x + (w - im.width) // 2, y + lab + (h - im.height) // 2))
        d.text((x + 4, y + 2), title, font=FONT, fill=(225, 235, 240))
        d.text((x + 4, y + 40), sub, font=SMALL, fill=(120, 170, 185))
    S.save(os.path.join(C, out), quality=90)
    print("saved", out, S.size)


sheet([
    ("refs/user_xray_motel_ref.webp", "REF  你给的参考图", "风格基准"),
    ("concepts/r1_v1_xray_cyan__gpt2.png", "S1  X光冷青（贴近参考）", "gpt-image-2 · 2K · $0.0135"),
    ("concepts/r1_v2_xray_flashlight__gpt2.png", "S2  X光 + 真实手电光锥", "光照范围内是真实材质，范围外保持X光 · $0.0135"),
    ("concepts/r1_v3_xray_thermal_entity__gpt2.png", "S3  X光 + 热成像人员 / 红色实体", "危险红只给实体 · $0.0135"),
    ("concepts/r1_v4_radiograph_film__gpt2.png", "S4  医学X光底片", "骨白、胶片颗粒、墙内结构可见 · $0.0135"),
    ("concepts/r1_v6_sodium_amber__gpt2.png", "S5  钠灯琥珀色X光", "测试每集换环境色 · $0.0135"),
    ("concepts/r1_v5_empty_plate__gpt2.png", "P1  空场景底图（无人物）", "用于程序化叠加人物/实体/光影 · $0.0135"),
    ("concepts/r1_v7_other_scene_hospital__gpt2.png", "G1  换场景：废弃医院病房", "测试画风能否跨集复用 · $0.0135"),
], "sheet_styles_round1.jpg")

sheet([
    ("concepts/r1_v1_xray_cyan__gpt2.png", "gpt-image-2 (2K)", "$0.0135 · 54s · 最稳，布局清楚"),
    ("concepts/r1_v1_xray_cyan__nanobananapro.jpg", "nano-banana-pro", "$0.100 · 96s · 质感强但更像普通灰度渲染"),
    ("concepts/r1_v1_xray_cyan__seedream5pro.jpg", "seedream-5-0-pro (2K)", "$0.065 · 101s · 偏透视，不是严格俯视"),
    ("concepts/r1_v1_xray_cyan__nanobanana.png", "nano-banana (2.5 flash)", "$0.007 · 16s · 几乎照抄参考图，分辨率低"),
], "sheet_models_round1.jpg")
