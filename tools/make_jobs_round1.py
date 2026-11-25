"""Builds tools/jobs_round1.json: style variants + model comparison for the motel test scene."""
import json, os

REF = ["refs/user_xray_motel_ref.webp"]
STYLE_NOTE = ("Use the reference image only as a STYLE reference, not as a layout to copy. ")

LAYOUT = ("Strict orthographic 90-degree top-down cutaway view of an abandoned North American roadside motel: "
          "one long horizontal central corridor, three motel rooms above it and three below it, each room with a bed, "
          "nightstand, chair and a small bathroom with toilet and sink; the exit is at the left end of the corridor, "
          "opening onto an outdoor concrete walkway. Two room doors are open, the other four are closed. ")

ACTORS = ("Three human operators in tactical gear stand in the left half of the corridor, seen strictly from directly "
          "above (only helmets, shoulders and rifles visible, not a side view); one tall, unnatural unknown entity "
          "stands at the right end of the corridor, also seen from directly above. ")

XRAY = ("Rendering style: X-ray security scan / surveillance feed. Realistic real-world objects and furniture rendered "
        "as translucent grey-white density layers on a near-black background, cold cyan glowing edges on walls and "
        "door frames, thick walls with visible depth, stains and debris on the floor, subtle sensor noise. ")

TAIL = ("Muted cinematic horror atmosphere, clear readable spatial layout. Landscape 16:9. "
        "No text, no labels, no numbers, no logos, no UI, no isometric perspective.")

variants = {
    # baseline (closest to user's reference) - also used for model comparison
    "v1_xray_cyan": LAYOUT + ACTORS + XRAY + TAIL,
    "v2_xray_flashlight": LAYOUT + ACTORS + XRAY +
        "Each operator casts a narrow realistic warm-white flashlight cone forward; inside the cones the floor, carpet, "
        "furniture and stains appear in real muted color and texture, while everything outside the light stays in the "
        "X-ray scan look. Rooms nobody has entered are almost fully black. " + TAIL,
    "v3_xray_thermal_entity": LAYOUT +
        "Three human operators in the left half of the corridor, seen strictly from directly above, rendered as pale "
        "cool-white thermal silhouettes. At the right end of the corridor an unknown entity rendered as a distorted "
        "deep crimson heat signature with smeared ghosting and multiple offset afterimages, clearly not human. " +
        XRAY + TAIL,
    "v4_radiograph_film": LAYOUT + ACTORS +
        "Rendering style: old medical radiograph / X-ray film. Bone-white and warm grey densities on deep black, "
        "objects look like real scanned matter with internal structure visible (bed springs, pipes inside walls, "
        "wiring), heavy film grain, slight light leaks at the edges, no color except a faint blue-grey tint. " + TAIL,
    "v5_empty_plate": LAYOUT +
        "No people, no creatures, completely empty building - this is a clean background plate. " + XRAY + TAIL,
    "v6_sodium_amber": LAYOUT + ACTORS +
        "Rendering style: X-ray security scan tinted by failing sodium street lights: monochrome amber and dark brown "
        "densities on near-black, glowing amber edges on walls and door frames, thick walls with visible depth, "
        "stains and debris on floor, sensor noise and slight horizontal interference bands. " + TAIL,
    "v7_other_scene_hospital": STYLE_NOTE +
        "Strict orthographic 90-degree top-down cutaway view of an abandoned hospital ward wing: a long corridor with "
        "patient rooms on both sides, hospital beds, IV stands, curtains on rails, a nurse station in the middle, "
        "wheelchairs, scattered papers. Three human operators seen strictly from above in the corridor, one unnatural "
        "tall entity at the far end. " + XRAY + TAIL,
}

jobs = []
for name, prompt in variants.items():
    jobs.append({"name": f"r1_{name}__gpt2", "model": "gpt-image-2", "size": "16:9", "resolution": "2k",
                 "refs": REF, "prompt": STYLE_NOTE + prompt if not prompt.startswith(STYLE_NOTE) else prompt})

# model comparison on the baseline prompt
base = STYLE_NOTE + variants["v1_xray_cyan"]
jobs.append({"name": "r1_v1_xray_cyan__nanobananapro", "model": "nano-banana-pro", "size": "16:9",
             "refs": REF, "prompt": base})
jobs.append({"name": "r1_v1_xray_cyan__seedream5pro", "model": "seedream-5-0-pro", "size": "16:9",
             "resolution": "2K", "refs": REF, "prompt": base})
jobs.append({"name": "r1_v1_xray_cyan__nanobanana", "model": "gemini-2.5-flash-image-preview", "size": "16:9",
             "refs": REF, "prompt": base[:1000]})

out = os.path.join(os.path.dirname(__file__), "jobs_round1.json")
json.dump(jobs, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(jobs), "jobs ->", out)
