"""Comparison sheet for round 2 (layout-locked plates + procedural compositing)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from contact_sheet import sheet

sheet([
    ("scene/motel_layout_ref.png", "① 程序平面图（地图唯一真相）", "门/人/实体坐标都在 scene/motel.json"),
    ("concepts/plate_xray_b.png", "② AI 按平面图生成 X 光底图", "gpt-image-2 · 门洞位置与平面图对齐 · $0.0135"),
    ("concepts/plate_real_a.png", "③ AI 生成对齐的真实材质版", "与②偏移 0px · 只在手电光里露出 · $0.0135"),
    ("renders/still_S2_wide.png", "S2 合成 · 全景", "手电照到处变真实材质；实体是暗影+红色未知信号框"),
    ("renders/still_S2_mid.png", "S2 合成 · 中景", "同一帧换机位，程序化镜头"),
    ("renders/still_S3_wide.png", "S3 合成 · 全景", "X 光环境 + 冷白热成像人员 + 红色热信号实体"),
    ("renders/still_S3_mid.png", "S3 合成 · 中景", "同一帧换机位"),
], "sheet_round2_S2_S3.jpg")
