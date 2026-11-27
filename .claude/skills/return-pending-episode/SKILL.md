---
name: return-pending-episode
description: How to stage, check, render and revise an episode of RETURN PENDING (top-down thermal "SRS" tactical horror shorts) in C:\Sam. Use when writing or changing an act's timeline builder, adding a renderer effect, building a character clip, rendering a preview or the full film, or responding to the user's notes on a render.
---

# Making a RETURN PENDING episode

Everything here was learned making FILE 001 (DEATH ROW). The user judges by watching renders and writes in Chinese; reply in Chinese, lead with what changed, offer A/B(/C) with a recommendation when a choice is theirs.

## The loop, one act at a time

1. **Plain-language plot first.** Before any staging, say in a few lines what each side wants and why each beat happens. If you cannot say why a character does something, the user will ask, and it will be a hole.
2. **Stage from the map.** Open the scene JSON, work in metres, give every position a reason (cover, lane, who is nearest). One act per builder: `episodes/<ep>/build_actN.mjs` writes `timeline_actN.json`. The header comment of the builder is the plot in plain words; keep it true when the staging changes.
3. **Put the logic in checks.** Every builder ends with printed `[OK]/[FAIL]` checks and exits non-zero on a failure. Check what the story depends on, not just numbers:
   - who is nearest at each pulse (with a margin), door open or shut at that moment
   - every round fired: no friend within 0.8 m of the line, in front of the target or a few metres behind it
   - spacing between squad members (>= 1.0 m), nobody inside a column, nobody inside a wall
   - timing races the plot relies on (door shut before he reaches it, out before the next pulse)
4. **Look before you send.** I cannot hear audio or see motion. `python tools/render_act.py <act> --review 1.0` makes a sheet of frames; use `--span a,b --crop 1.6` to look closely at a beat. Read it, fix what is visibly wrong, then render. Say plainly that sound and continuous motion are unverified.
5. **Render and tidy.** `python tools/render_act.py <act>` builds, renders, mixes sound, bumps the version and deletes older versions and frame images. `python tools/render_episode.py` renders every part and joins the full film. Never leave superseded previews or `renders/frames` behind (the disk is nearly full; the user asked for this every time).
6. **Report honestly.** List what changed against each of the user's notes, then what I can see is still weak.

## Staging rules the user has given

- **The squad is a special-forces team.** Stacks at doors, corners on entry, a rearguard between the threat and a casualty, nobody crossing a lane of fire, the protected man in the middle. If nobody has a clear lane, nobody fires, and a line of dialogue says so.
- **Every character's choice must make sense for that character**, the monster included. Ask of each beat: what does he want right now, and is this the obvious way to get it? Past failures: a monster strolling to cover; a monster ignoring an open door; a squad member walking past the monster at arm's length; the rearguard walking away from the casualty.
- **Consistent abilities.** One movement speed per creature unless something outside it moves it (a blast, the shield). If he is slow when attacking he is slow when hiding.
- **Pushed back is not knocked down.** A repel visibly moves the target (about 2.5 m, on its feet, afterimage trail), then it comes on again. Reserve falling for things that are finished.
- **Effects belong to the fight.** The light shield opens when contact starts and closes when it ends, not while someone is examining a body.
- **Big moments welcome, new lore is not.** Set pieces (a column blown down, a man thrown into a wall) are good. Do not invent world rules to patch a hole (the "tether" was rejected); prefer the simpler plot (shut the door).
- **Everyone stays in character.** Before any script or dialogue goes to the user, and again when reviewing a staged act, go through it person by person against the bible (`RETURN_PENDING_V4.md`) and the script's own character notes: would this person say this line, in these words, and do this thing? Rank, job and temperament decide who speaks, who gives orders, who explains and who stays quiet (KNOX commands and says little; FUSE is meticulous; REYES is the new one; MILLER is warm to his team; COLE confirms recoveries; DISPATCH is off-site, calm and procedural). A line that only exists to tell the audience something is out of character for whoever says it: move the information to the case card or cut it. Report the check to the user as a short list of anything changed for this reason.
- **Deliberate intent needs a line.** If the monster is being clever, someone says what just happened ("He wanted me in front.").
- No gore on screen. Bodies are respected. Dried stains are fine.

## Look and feel

- Squad cold and bright in their own colours, anomaly hot. A clean bright silhouette beats small detail at this size.
- Squad movement can be stylish (slides, afterimages via `tl.dashes`); the heavy monster gets a trail only when something throws him.
- Dialogue is short radio English, shown as subtitles. A line must fit its window at about 2.7 words a second.
- When the user must choose a look or a sound, make two or three candidates on one board and recommend one.

## Technical notes that cost time

- **Never put a `//` or `#` comment in the middle of a line when patching by string replacement**; it swallows the rest of the line. This happened three times. Put comments at the end of a complete statement or on their own line.
- Patch builders with a small Python script (`assert a in s` before every replace) written with the Write tool; shell heredocs break on apostrophes. After a line-number patch the file has moved: re-read before the next one.
- File writes on this machine sometimes fail with Errno 22: retry in a short loop.
- `rm -rf dir/*` after a `cd` is blocked by the safety check. Delete with full explicit paths.
- Mux previews at crf 26 (crf 20 gave 240 MB for a minute).
- Sprites: `library/build_characters.py` (`ONLY=clip python library/build_characters.py <char>`); a clip can override the sprite set with `dir` (dim resident to roused resident). Fallen or thrown bodies need `follow=1` and a wider `span`. A clip `from: 9999` shows frame 0; `from: -10` shows the last frame of a one-shot.
- Renderer timeline features: `sprites`, `mobs` with ids, `fire` (`at`, `target:"ENTITY"`), `impacts`, `flashes`, `repels`, `blasts`/`throws`/`charges`, `dashes`, `guard` (light shield, 0..1, above 1 = taking a blow), `down`, `unitTags`, `props` (`panel` with `presses`, `stain`, `rubble`), door tracks, `pulse` with `hits`, `swaps`, `static`, `warn`, `events`, `subtitles`, `camera`.
- Keep the camera inside the plate; a centre near the map edge shows black.
- High-altitude shots are their own shot type (`type: "aerial"`, data under `tl.aerial`, drawn by `renderer/src/aerial.ts`): one still plate with a moving camera, a transport blip, squad blips, name plates, and a ring clipped to one building. The plate is made from a layout drawn by `make_island.py`; the image model shifts things, so measure the places on the finished plate and keep them in the builder (`PLACES`).
- Acts must hand over cleanly: the first positions of act N+1 are the last positions of act N. Change both builders together.

## Sound

- Picture first, sound after: sound gets its own pass once the staging of an act is settled, because every picture change moves the cues.
- I cannot hear. Every new or replaced sound goes to the user as candidates in an audition video (`python tools/sfx_candidates.py tools/jobs_sfx_roundN.json`), levelled the same, a few per kind; nothing already generated is generated twice. Say where in the film each sound is used, with the count.
- Real recordings or generated samples, not synthesis in code. Ready-made CC0 packs are fine (ask before downloading; keep them under `audio/_downloads/<pack>/`).
- One event, one sound. An exchange of places keeps its own sound and nothing else is laid over it (no static, no alert). Before adding a sound, list what already fires at that instant.

## What is not done by these tools

Voice-over (ElevenLabs, cast in `scene/voice_cast.json`), Bodycam shots (AI image and video), and canon/bible updates. Do not write proposals into the bible, set `approved`, run `--apply`, commit or push unless the user asks.
