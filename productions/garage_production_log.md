# Production log: Garage P2 (episode 2 test, 15 s, S3)

Goal: a new scene with a new anomaly rule run end to end, to measure what one more episode costs in time and money.

Output: `renders/RETURN_PENDING_garage_15s_S3.mp4`, 1920x1080, 30 fps, 21.6 MB.

## What was new in this episode

| Item | Garage P2 | vs Motel |
|---|---|---|
| Map | Parking level: 14 parked cars, pillars, stairwell, ramp | Corridor with 6 rooms |
| Anomaly | UNK-2 "Underbelly": flat, six limbs, hides under cars, heat seeps through the car body | UNK-1 "Tall One" |
| Rule | It only moves while the overhead feed is down. After every dropout it is closer. | Every door that opens brings it closer |
| Insert shot | Fixed CCTV camera (seedance-2.0-mini) | Bodycam (seedance-2.0-fast) |
| Ending | It reappears in the stairwell exit, behind the team | It turns toward the door |

## Cost (actual, from API responses)

| Item | Calls | Cost |
|---|---|---|
| X-ray plates, gpt-image-2 2K | 2 (used 1) | $0.027 |
| CCTV stills, gpt-image-2 2K | 2 (used 1) | $0.027 |
| CCTV image-to-video, seedance-2.0-mini 4 s 720p | 1 | $0.141 |
| TTS, gpt-4o-mini-tts | 4 (one line regenerated) | not returned by the API |
| **Total** | | **≈ $0.20 + TTS** |

Mini vs fast: mini cost $0.14 for 4 s, fast cost $0.31 for 4 s (motel). For a locked-off CCTV shot with one small motion (hands retract), mini did exactly what the prompt asked. Use mini by default and fast only for complex motion.

## Time (wall clock)

| Step | Time | Notes |
|---|---|---|
| Map JSON + floor-plan render | ~4 min | stall rows generate the cars automatically |
| AI assets (plates, stills, TTS) in parallel | 72 s | image jobs run 6 at a time |
| Plate fit to plan | <1 min | `tools/fit_plate.py`, then overlay check with `--debug-plan` |
| Image-to-video | 112 s | runs in the background while the timeline is written |
| Timeline JSON (motion, HUD, subtitles, sfx cues) | ~10 min | the main authoring work |
| Test frames + one fix pass | ~5 min | subtitle timing, CCTV vignette |
| Sound mix | 5 s | cue-driven, from the same timeline |
| Final render + mux | 60 s | 36 s frames + encode |

One-time engine work in this run (does not repeat per episode): generic map format, door orientation, evac polyline, species registry, insert-shot types, feed-loss frames, cue-driven sound. A first render took 37 min because a blur filter was applied per stroke; fixed by blurring an offscreen sprite once, now 36 s.

**Estimate for the next new 15 s scene: about 20-25 min of work and about $0.20.** A full 4-minute episode is mostly more timeline authoring; AI spend stays small because the top-down shots (≈65%) cost nothing to render.

## Problems found and fixed

1. **AI plates drift about 2% in scale and offset** from the floor plan. Without correction the cars and walls would be misaligned with the hide spots. Fixed by measuring the outer wall box automatically (`tools/fit_plate.py`) and applying the fit when the plate is drawn.
2. **Blur filter per draw call** made hidden-entity frames take ~7 s each. Fixed with an offscreen sprite (≈0.1 s per frame).
3. **TTS lines run longer than their subtitle windows.** Lines were shortened and leading/trailing silence is now trimmed automatically.

## Still manual / next to automate

- Writing timeline keyframes by hand is the slowest step. Next: a higher-level script format ("REYES moves to the stairwell door", "UNK-2 relocates to car T5 during dropout 2") that compiles to keyframes.
- Picking the better of two AI candidates is still a human judgement (about 1 min).
- TTS delivery is flat; a better voice option is still open.
