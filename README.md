# RETURN PENDING — Visual Prototype

Prototype for the top-down anomaly series: a 15-second sample in the abandoned motel test scene, rendered in two styles (S2 / S3).

## Pipeline

```
scene/motel.json               map: walls, doors, units (single source of truth)
  └─ renderer/src/layout_ref.ts  → scene/motel_layout_ref.png   (floor-plan reference for AI)
APIMart gpt-image-2 (layout ref + style ref)
  └─ concepts/plate_xray_b.png   X-ray empty plate, aligned to the plan
  └─ concepts/plate_real_a.png   real-material plate, pixel-aligned to the X-ray plate (S2 flashlight reveal)
APIMart gpt-image-2 + seedance-2.0-fast
  └─ concepts/bodycam_b2_b.png → concepts/bodycam_b2_i2v.mp4   (bodycam insert, 4 s, 720p)
ElevenLabs eleven_v3 (tools/eleven.py tts, audio tags like [whispers])
  └─ audio/el2/*.tight.wav  radio lines, cast in scene/voice_cast.json (VANCE=Jerry B., ODA=George, REYES=Veda Sky, DISPATCH=Eryn);
     tools/voice_takes.py makes several takes per line, tightens long pauses, ranks them; audio/el2/audition_*.wav to listen
ElevenLabs sound generation (tools/eleven.py sfx)
  └─ audio/sfx/*.wav        steps, doors, scrape, hit, ambience, breathing, fluorescent, squelch
     (listed per episode in the timeline "samples"/"sfx"; synthesized versions are the fallback)
scene/timeline_motel_15s.json  event timeline: door states, unit/entity keyframes, camera, HUD, subtitles, shots
  ├─ renderer/src/animate.ts     → procedural frames (Canvas) → ffmpeg → MP4
  └─ tools/sound_design.py       → audio/mix_15s.wav (synth SFX + radio VO)
```

## Reproduce

Requires Node 24+, Python 3 with numpy and Pillow, and the env var `APIMART-KEY` (or `APIMART_API_KEY`).

```powershell
cd C:\Sam\renderer; npm install
node src/animate.ts S2 ../scene/timeline_motel_15s.json ../renders/_silent_S2.mp4
python ..\tools\sound_design.py ..\scene\timeline_motel_15s.json ..\audio\mix_15s.wav
```

Single test frames: `node src/animate.ts S2 ../scene/timeline_motel_15s.json x --frames 0,150,300`.

AI assets (only needed for a new scene): `python tools/apimart_gen.py tools/jobs_*.json`, `python tools/apimart_video.py ...`, `python tools/tts.py ...`. Every call is appended to `concepts/log.jsonl` with its prompt, model and cost.

## Series state (canon)

`canon/` holds the current state of the series as data (characters with exposure and status, exposure rules, equipment, Salvage, anomalies with their writer-only "reality", secrets with forbidden terms, timeline). Each episode gets `episodes/file_NNN/episode.json`, a checkable manifest of its script.

```powershell
python tools\continuity_check.py episodes\file_001\episode.json          # check against canon
python tools\continuity_check.py episodes\file_001\episode.json --apply  # after human approval (approved: true)
python tests\continuity\run.py                                          # regression test of the checker
```

Only approved episodes advance canon; `--apply` also writes `state_before.json` / `state_after.json` next to the manifest.

## Episodes

| Scene | Timeline | Output | Production log |
|---|---|---|---|
| Route 9 Motel | `scene/timeline_motel_15s.json` | `renders/RETURN_PENDING_motel_15s_S3_v2.mp4` | (first prototype) |
| Halverson Parkade P2 | `scene/timeline_garage_15s.json` | `renders/RETURN_PENDING_garage_15s_S3.mp4` | `productions/garage_production_log.md` |

### Full episodes: beats -> timeline -> render

An episode is staged in `episodes/file_NNN/beats.txt` (who moves where, camera, shots, HUD extras; syntax in the header of `renderer/src/compile_timeline.ts`). Door events, dialogue, zones and the report come from `episode.json`; the case card and report also read `state_before.json`.

```
cd renderer
node src/compile_timeline.ts ../episodes/file_001/beats.txt ../episodes/file_001/timeline.json   # prints contact / door-position checks
node src/animate.ts S3 ../episodes/file_001/timeline.json ../episodes/file_001/preview.mp4 [--from 0 --to 45] [--frames 360,3393]
```

Sound for a full episode:

```
python tools/episode_vo.py episodes/file_001 3 0.0 --retake      # vo_direction.json -> vo/NN_WHO.wav (best of 3 takes, words checked against the script)
(cd renderer; node src/compile_timeline.ts ...)                     # re-run so subtitles use the real VO lengths
python tools/sound_design.py episodes/file_001/timeline.json episodes/file_001/mix.wav
```

Door / gunfire / reach / lapse sounds come from episode events; one-offs are `T sfx NAME` lines in beats.txt (samples in `audio/sfx/f01/`). ElevenLabs allows only 2 concurrent requests on this account.

Renderer layers: `fx.ts` (claimed-door frost and handle, held-door thumps, unprompted burst, gunfire, props, confidence / zone bar / closure countdown, reconstruction collapse and wireframe), `cards.ts` (title sting, case file, personnel recovery report with the beacon light tail).

A new scene needs: a map JSON (`template: "explicit"`, walls/doors/rooms/props/stallRows), one layout-locked AI plate fitted with `tools/fit_plate.py`, an insert shot (still + image-to-video), TTS lines, and a timeline JSON. Entity species are defined in `renderer/src/entities.ts`.

## Rule shown in the sample

Every time a door opens by itself, UNK-1 relocates one room closer to the exit. It reads with the sound off: the door swings, an event tag appears, the entity marker jumps, and a warning line names the pattern.

## Costs (actual, from API responses)

| Item | Cost |
|---|---|
| Round 1 style exploration (11 images) | $0.274 |
| Layout-locked plates (4 images) | $0.054 |
| Bodycam stills (2 images) | $0.027 |
| Bodycam image-to-video, seedance-2.0-fast 4 s 720p | $0.308 |
| TTS (4 calls) | not returned by the API, check the console |
