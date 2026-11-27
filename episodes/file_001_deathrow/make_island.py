r"""Layout of the high-altitude view of Greyrock Island: writes scene/greyrock_island_layout_ref.png, the geometry reference handed
to the image model for the plate.
   python episodes/file_001_deathrow/make_island.py        (run from C:\Sam)
All numbers are plate pixels on a 2048 x 1152 frame, about 5 px to a metre. Only the island's WEST side is in the frame: the shore
runs down the left, and the land goes on past the top, right and bottom edges, so the island is as big as the viewer imagines.
Modelled on real island prisons (Alcatraz above all): the cellhouse sits along the ridge, there is no ring wall, and round it are a
parade ground, a walled yard, a jetty with a road up, a powerhouse, a water tower, a lighthouse and ruins.
The image model moves things a little, so the places the shot uses are measured on the finished plate and kept in build_act1.mjs."""
import math, os, random
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); W, H = 2048, 1152
random.seed(5)
shore = []
for k in range(0, 61):
    y = -20 + k * 20
    x = 390 + 55 * math.sin(y / 170 + 0.8) + 35 * math.sin(y / 61 + 2.0) + random.uniform(-12, 12)
    if 800 < y < 960: x += 70 * math.sin((y - 800) / 160 * math.pi)                 # the cove where the jetty is
    shore.append((round(x), y))
im = Image.new("RGB", (W, H), (5, 12, 18)); d = ImageDraw.Draw(im)
d.polygon(shore + [(W + 10, H + 20), (W + 10, -20)], fill=(52, 56, 58), outline=(110, 120, 122))
ROOF, EDGE = (128, 134, 136), (215, 224, 226)
d.line([(470, 885), (620, 985), (960, 990), (1010, 800), (930, 680), (1050, 560)], fill=(92, 96, 96), width=16)                 # road up from the jetty
d.rectangle([250, 868, 480, 902], fill=(120, 124, 120))                                                                       # jetty
d.rectangle([500, 930, 600, 975], fill=ROOF, outline=EDGE, width=3)                                                           # guardhouse at the landing
d.rectangle([520, 560, 850, 850], fill=(82, 86, 88), outline=(150, 158, 160), width=3)                                        # parade ground
px, py, r = 685, 705, 68; d.ellipse([px - r, py - r, px + r, py + r], outline=EDGE, width=6)
for x0, y0, x1, y1 in ((px - 24, py - 30, px - 24, py + 30), (px + 24, py - 30, px + 24, py + 30), (px - 24, py, px + 24, py)): d.line([x0, y0, x1, y1], fill=EDGE, width=6)
d.rectangle([1050, 430, 1430, 620], fill=ROOF, outline=EDGE, width=6)                                                         # general block
d.rectangle([1430, 497, 1490, 553], fill=ROOF, outline=EDGE, width=5)                                                         # passage
d.rectangle([1490, 415, 1840, 635], fill=(150, 156, 158), outline=(245, 250, 252), width=15)                                  # deep block, thick walls
d.rectangle([1120, 240, 1420, 390], outline=EDGE, width=6)                                                                    # walled exercise yard
d.rectangle([890, 430, 1010, 530], fill=ROOF, outline=EDGE, width=4)                                                          # administration
d.ellipse([500, 330, 556, 386], fill=EDGE)                                                                                    # lighthouse
d.rectangle([620, 110, 840, 215], fill=ROOF, outline=EDGE, width=4); d.ellipse([856, 140, 896, 180], fill=EDGE)               # powerhouse and its chimney
d.ellipse([1640, 190, 1730, 280], fill=ROOF, outline=EDGE, width=5)                                                           # water tower
d.rectangle([1700, 830, 2060, 950], fill=ROOF, outline=EDGE, width=4)                                                         # workshops, running off the frame
d.rectangle([1230, 800, 1500, 910], outline=EDGE, width=4)                                                                    # quarters, roof gone
d.rectangle([1500, -20, 1800, 70], fill=ROOF, outline=EDGE, width=4)                                                          # a store, cut by the top edge
im.save(os.path.join(ROOT, "scene", "greyrock_island_layout_ref.png")); print("wrote layout ref")
