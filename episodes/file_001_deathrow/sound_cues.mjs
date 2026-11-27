// Turns what is already in a timeline (shots, impacts, swaps, door movement, cards) into sound cues for
// tools/sound_design.py, so picture and sound cannot drift apart. Each weapon and each kind of blow has its
// own sample (audio/sfx/f001, generated once with tools/eleven.py sfx).
const S = "../audio/sfx/";
export function addSound(tl, { ambience = "garage", typing = [], gangRelease = null } = {}) {
  tl.samples = {
    step: S + "step_a.wav", step_heavy: S + "step_b.wav", step_light: S + "step_a.wav",
    gunfire: S + "f01/gunfire_burst.wav", hit: S + "hit.wav", relocate: S + "relocate.wav", glitch: S + "f01/glitch_burst.wav",
    door_slam: S + "f01/door_slam.wav", door_latch: S + "f01/door_latch.wav", thump: S + "f01/door_thump.wav",
    shotgun: S + "f001/shotgun.wav", rifle: S + "f001/rifle.wav", sniper: S + "f001/sniper.wav", pistol_s: S + "f001/pistol_s.wav", mg_shot: S + "f001/mg_shot.wav", mg_tail: S + "f001/mg_tail.wav", blast_a: S + "f001/blast_a.wav", blast_b: S + "f001/blast_b.wav", blast_c: S + "f001/blast_c.wav", pistol: S + "f001/pistol.wav", crossbow: S + "f001/crossbow.wav", axe: S + "f001/axe.wav",
    shield_hit: S + "f001/shield_hit.wav", punch: S + "f001/punch.wav", door_pound: S + "f001/door_pound.wav", pulse: S + "f001/pulse.wav",
    typing: S + "f001/typing.wav", ambience: S + "f001/amb_prison.wav", drone: S + "f001/drone.wav", static: S + "f001/static.wav", bell: S + "f001/bell.wav", gang_lock: S + "f001/gang_lock.wav",
    repel: S + "f001/repel.wav", alert: S + "f001/alert.wav",          // chosen by ear from tools/jobs_sfx_round*.json; a sample whose file is not there yet is simply silent
    door_open: S + "fire_door.wav", stamp: S + "f01/stamp.wav", beacon_chirp: S + "f01/beacon_chirp.wav", pack_drag: S + "f01/pack_drag.wav",
  };
  Object.assign(tl.samples, tl.extraSamples ?? {});
  const W = 2048, pan = x => Math.max(-0.8, Math.min(0.8, (x - W / 2) / (W / 2)));
  const cues = [{ type: "ambience", kind: ambience }];
  // every shot is one cue, with the sound of the weapon that person carries
  const GUN = { KNOX: "shotgun", MILLER: "rifle", REYES: "pistol_s", FUSE: "mg_shot", COLE: "pistol" };
  // a machine gun is heard round by round, as it is seen: every round is one short report, and the last of a burst carries the tail
  const mgT = (tl.fire ?? []).filter(f => GUN[f.who] === "mg_shot" && !f.kind?.match(/melee|bolt/)).map(f => f.t).sort((a, b) => a - b);
  const lastOfBurst = f => GUN[f.who] === "mg_shot" && !mgT.some(t => t > f.t + 0.001 && t < f.t + 0.2);
  for (const f of tl.fire ?? []) {
    if (f.silent) continue;
    const sample = f.kind === "melee" ? "axe" : f.kind === "bolt" ? "crossbow" : f.kind === "sniper" ? "sniper" : GUN[f.who] ?? "rifle";
    cues.push({ type: "oneshot", t: f.t, sample: f.sample ?? (lastOfBurst(f) ? "mg_tail" : sample), vary: f.sample ? 0 : sample === "mg_shot" ? 25 : 50, pan: pan(f.at[0]) });   // f.sample: an audition can name the file itself
  }
  // blows: what was hit decides the sound. An axe chop already carries its own impact.
  const BLOW = { shield: "shield_hit", body: "punch", door: "door_pound" };
  for (const i of tl.impacts ?? []) if (i.kind !== "chop") cues.push({ type: "oneshot", t: i.t, sample: i.sample ?? BLOW[i.kind] ?? "thump", vary: i.sample ? 0 : 90, gain: i.r > 100 ? 1.0 : i.r > 70 ? 0.8 : 0.6, pan: pan(i.x) });
  // blasts: three recordings, used in turn so two explosions in a row never sound identical (a blast may name its own)
  (tl.blasts ?? []).forEach((b, i) => cues.push({ type: "oneshot", t: b.t, sample: b.sample ?? "blast_" + "abc"[i % 3], pan: pan(b.x) }));
  for (const s of tl.swaps ?? []) { cues.push({ type: "relocate", t: s.t, sample: "relocate" }); cues.push({ type: "oneshot", t: s.t, sample: "glitch", gain: 0.8 }); }
  if (tl.swaps?.length) cues.push({ type: "drone", t: tl.swaps[0].t, gain: 0.7 });
  // the security door: a heavy push when it opens, a slam and a latch when it shuts
  for (const [id, keys] of Object.entries(tl.doors ?? {})) for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (a[1] === 0 && b[1] === 1 && gangRelease != null && Math.abs(a[0] - gangRelease) < 2) continue;      // a whole row let go at once is one sound, not one per door
    if (a[1] === 0 && b[1] === 1) cues.push({ type: "door_push", t: a[0], sample: "door_open", pan: -0.6 });
    if (a[1] === 1 && b[1] === 0) { cues.push({ type: "oneshot", t: b[0] - 0.1, sample: "door_slam", pan: -0.6 }); cues.push({ type: "oneshot", t: b[0] + 0.25, sample: "door_latch", gain: 0.8, pan: -0.6 }); }
  }
  // each ripple leaving the shackles: a low pulse on the monitor
  if (tl.pulse && tl.pulse.zone?.length) for (let t = tl.pulse.t0; t < tl.duration; t += tl.pulse.period) cues.push({ type: "oneshot", t, sample: "pulse" });
  if (gangRelease != null) cues.push({ type: "oneshot", t: gangRelease + 0.1, sample: "gang_lock", gain: 1.6 });
  for (const r of tl.repels ?? []) cues.push({ type: "oneshot", t: r.t, sample: "repel", gain: 1.7, pan: pan(r.x ?? W / 2) });
  for (const [a, b] of typing) cues.push({ type: "typing", from: a, to: b });
  for (const c of tl.extraCues ?? []) cues.push(c);
  tl.sfx = cues;
  return tl;
}
