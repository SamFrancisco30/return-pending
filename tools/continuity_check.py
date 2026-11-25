"""Continuity checker for RETURN PENDING episodes.

Each episode has a manifest, episodes/file_NNN/episode.json, describing what happens in the
script in checkable form (cast, anomalies, equipment, Salvage, exposure events, results,
reveals, dialogue). This tool checks it against canon/ and, once a human has approved the
episode, writes state snapshots and advances canon.

  python tools/continuity_check.py episodes/file_001/episode.json            # check only
  python tools/continuity_check.py episodes/file_001/episode.json --apply    # needs "approved": true
  --canon <dir>   use another canon folder (tests)

Exit code 1 when there are errors. Only approved episodes may change canon.
"""
import argparse, copy, json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIELD_APPEARANCES = {"field"}
GHOST_APPEARANCES = {"voice", "recording", "mimic"}   # allowed for people who are gone


def load(p):
    return json.load(open(p, encoding="utf-8"))


def save(obj, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(obj, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def load_canon(d):
    names = ["series", "characters", "exposure_rules", "equipment", "salvage", "anomalies", "mysteries", "timeline"]
    return {n: load(os.path.join(d, n + ".json")) for n in names}


def check_door_threshold(ep, aid, anomaly, E):
    """UNK-1 style rule, replayed event by event.
    Door states: open, propped, closed, claimed (it has taken the door), held (claimed and being held shut).
      claimed     closed -> claimed; only one claimed/held door at a time
      attempt     people try a door; must be claimed or held (it does not open); on a plain closed door it would open
      personnel   people open it; never a claimed/held door; never moves the entity
      propped     people open it and wedge it; same limits as personnel
      held        claimed -> held
      released    held -> claimed
      unprompted  claimed (not held) -> open; the entity advances exactly one zone (episode 'zones' map)
      closed      open/propped -> closed (a closer, or people)"""
    zones = ep.get("zones", {})
    doors = dict(ep.get("initial_doors", {}))
    pos = ep.get("initial_positions", {}).get(aid)
    if not doors or pos is None or not zones:
        E(f"{aid}: door_threshold rule needs zones, initial_doors and initial_positions to be checkable"); return
    if pos not in zones: E(f"{aid}: start position {pos} is not in the zone map"); return
    for ev in sorted(ep.get("door_events", []), key=lambda e: e["t"]):
        d, by, st = ev["door"], ev["by"], doors.get(ev["door"])
        tag = f"t={ev['t']} door {d} ({by})"
        if st is None: E(f"{tag}: unknown door"); continue
        if ev.get("unk_to") and by != "unprompted": E(f"{tag}: only a door opening by itself can move {aid}")
        if by == "claimed":
            if st != "closed": E(f"{tag}: only a closed door can be claimed (it is {st})")
            other = [k for k, v in doors.items() if v in ("claimed", "held") and k != d]
            if other: E(f"{tag}: {aid} already holds a claim on door {other[0]}")
            doors[d] = "claimed"
        elif by == "attempt":
            if st == "closed": E(f"{tag}: an unclaimed closed door would just open for people; mark it personnel, or claim it first")
            elif st not in ("claimed", "held"): E(f"{tag}: attempt on a door that is {st}")
        elif by in ("personnel", "propped"):
            if st in ("claimed", "held"): E(f"{tag}: a claimed door cannot be opened by people")
            doors[d] = "open" if by == "personnel" else "propped"
        elif by == "held":
            if st != "claimed": E(f"{tag}: only a claimed door needs holding (it is {st})")
            doors[d] = "held"
        elif by == "released":
            if st != "held": E(f"{tag}: released but it was {st}")
            doors[d] = "claimed"
        elif by == "unprompted":
            if st != "claimed": E(f"{tag}: a door only opens by itself after it is claimed (it is {st})")
            if ev.get("unk_from") != pos: E(f"{tag}: {aid} advances from {ev.get('unk_from')} but it is at {pos}")
            to = ev.get("unk_to")
            if to not in zones: E(f"{tag}: unknown destination {to}")
            elif zones[to] != zones[pos] - 1:
                E(f"{tag}: {aid} must advance exactly one zone (zone {zones[pos]} at {pos} -> zone {zones[to]} at {to})")
            pos, doors[d] = to, "open"
        elif by == "closed":
            if st not in ("open", "propped"): E(f"{tag}: closing a door that is {st}")
            doors[d] = "closed"
        else:
            E(f"{tag}: unknown door event '{by}'")


def check(ep, canon):
    errors, warnings = [], []
    E = lambda m: errors.append(m)
    W = lambda m: warnings.append(m)
    f = ep["file"]
    series, rules = canon["series"], canon["exposure_rules"]
    chars = {c["id"]: c for c in canon["characters"]["characters"]}
    for nc in ep.get("new_characters", []):
        if nc["id"] in chars: E(f"new character {nc['id']} already exists in canon")
        chars[nc["id"]] = {**nc, "_new": True}
    equip = {i["id"]: i for i in canon["equipment"]["items"]}
    salv = {i["id"]: i for i in canon["salvage"]["items"]}
    anoms = {a["id"]: a for a in canon["anomalies"]["anomalies"]}
    for na in ep.get("new_anomalies", []):
        if na["id"] in anoms: E(f"new anomaly {na['id']} already exists")
        anoms[na["id"]] = {**na, "_new": True}
    secrets = {s["id"]: s for s in canon["mysteries"]["secrets"]}

    # --- order and dates
    last = series["last_approved_file"]
    if f in series["approved_files"]:
        E(f"FILE {f:03d} is already approved canon; make a new file instead of rewriting it")
    elif f != last + 1 and not ep.get("special") and not ep.get("allow_gap"):
        E(f"FILE {f:03d} follows FILE {last:03d}; set \"allow_gap\" or \"special\" for a deliberate jump")
    prev_dates = [t.get("date") for t in canon["timeline"]["files"] if t.get("status") == "approved" and t.get("date")]
    if prev_dates and ep.get("date") and ep["date"] < max(prev_dates) and not ep.get("special"):
        E(f"date {ep['date']} is earlier than an approved file ({max(prev_dates)})")
    if ep.get("date") and ep["date"] > canon["timeline"]["program_terminated"]:
        W(f"date {ep['date']} is after the program termination date: intended twist?")

    # --- cast
    cast = {c["id"]: c for c in ep.get("cast", [])}
    for cid, c in cast.items():
        ch = chars.get(cid)
        if not ch: E(f"cast member {cid} is not in canon (add under new_characters)"); continue
        app = c.get("appearance", "field")
        if app in FIELD_APPEARANCES:
            if not ch.get("field", True): E(f"{cid} is not a field operator and cannot appear in the field")
            if ch.get("status") in ("DECEASED", "LOST", "RETURN PENDING"):
                E(f"{cid} is {ch['status']} and cannot appear in the field (use appearance voice/recording/mimic)")
        elif app in GHOST_APPEARANCES:
            if ch.get("status") == "DECEASED" and app == "voice":
                W(f"{cid} is DECEASED: a voice must be framed as something imitating them or a recording")
        elif app != "offsite":
            E(f"{cid}: unknown appearance '{app}'")
    field_cast = [cid for cid, c in cast.items()
                  if c.get("appearance", "field") in FIELD_APPEARANCES and chars.get(cid, {}).get("field", True)]

    # --- anomalies
    for a in ep.get("anomalies", []):
        ca = anoms.get(a["id"])
        if not ca: E(f"anomaly {a['id']} not in canon (add under new_anomalies)"); continue
        if a.get("rule") and a["rule"] != ca["rule"] and not a.get("rule_variant"):
            E(f"{a['id']}: rule differs from canon; declare rule_variant if this is deliberate")

    # --- anomaly mechanics: replay the episode's events against the rule
    for a in ep.get("anomalies", []):
        ca = anoms.get(a["id"]) or {}
        if ca.get("mechanic") == "door_threshold":
            check_door_threshold(ep, a["id"], ca, E)

    # --- equipment
    unlocked_now = set(ep.get("equipment_unlocked", []))
    used_ids = set()
    for u in ep.get("equipment_used", []):
        it = equip.get(u["id"])
        if not it: E(f"equipment {u['id']} not in canon"); continue
        used_ids.add(u["id"])
        if not it.get("standard_kit"):
            available = it.get("status") == "available" or u["id"] in unlocked_now
            if not available: E(f"{u['id']} is {it.get('status')} at FILE {f:03d}")
        if it.get("quantity") is not None and u.get("count", 1) > it["quantity"]:
            E(f"{u['id']}: uses {u.get('count', 1)} but only {it['quantity']} exist")
        if u.get("by") and u["by"] not in field_cast: E(f"{u['id']} used by {u['by']}, who is not in the field")
    for uid in unlocked_now:
        if uid not in equip: E(f"unlocked equipment {uid} not in canon"); continue
        if uid not in used_ids: E(f"{uid} is unlocked in this file but never used (bible: new gear must matter the episode it appears)")

    # --- salvage
    custody = {k: v.get("status") for k, v in salv.items()}
    for ch_ in ep.get("salvage_changes", []):
        if ch_["id"] not in salv: E(f"salvage {ch_['id']} not in canon"); continue
        prior = custody[ch_["id"]]
        if prior in ("lost_in_field", "destroyed") and ch_["status"] == "in_custody":
            E(f"{ch_['id']} was {prior}; a lost Salvage cannot come back")
        if ch_.get("before_use"): custody[ch_["id"]] = ch_["status"]
    salvage_exposure = {}
    for u in ep.get("salvage_used", []):
        it = salv.get(u["id"])
        if not it: E(f"salvage {u['id']} not in canon"); continue
        st = custody.get(u["id"])
        recovered_here = any(c["id"] == u["id"] and c["status"] == "in_custody" for c in ep.get("salvage_changes", []))
        if st != "in_custody" and not recovered_here: E(f"{u['id']} is {st}; it cannot be used in FILE {f:03d}")
        if not u.get("authorized") and not recovered_here: W(f"{u['id']} used without authorization: intended (defying Wayfarer)?")
        if u.get("by"):
            if u["by"] not in field_cast: E(f"{u['id']} used by {u['by']}, who is not in the field")
            salvage_exposure[u["by"]] = salvage_exposure.get(u["by"], 0) + it.get("exposure_per_use", 0) * u.get("uses", 1)

    # --- results and exposure
    result = ep.get("mission_result")
    if result not in series["mission_results"]: E(f"mission_result must be one of {series['mission_results']}")
    stab = bool(ep.get("stabilizer_access"))
    if stab and result != rules["stabilizer_requires"]: E(f"stabilizer granted but mission is {result}")
    pres = {p["id"]: p["status"] for p in ep.get("personnel_results", [])}
    for cid in field_cast:
        if cid not in pres: E(f"{cid} was in the field but has no personnel result")
    for cid, st in pres.items():
        if st not in series["status_values"]: E(f"{cid}: status {st} is not one of {series['status_values']}")
        if chars.get(cid, {}).get("status") == "DECEASED" and st != "DECEASED": E(f"{cid} is DECEASED; status cannot change")

    computed = {}
    for cid in field_cast:
        ch = chars[cid]
        start, floor = ch.get("exposure") or 0, ch.get("exposure_floor") or 0
        v = start + rules["events"]["entry"]
        for ev in ep.get("exposure_events", []):
            if ev["who"] != cid: continue
            if ev["event"] not in rules["events"]: E(f"unknown exposure event {ev['event']}"); continue
            v += rules["events"][ev["event"]] * ev.get("count", 1)
        v += salvage_exposure.get(cid, 0)
        floor += rules["floor_increase_per_entry"]
        if stab and pres.get(cid) == "RETURNED": v += rules["stabilizer"]
        v = max(0, min(rules["cap"], max(floor, v)))
        computed[cid] = {"before": start, "after": v, "floor": floor}
        if v >= rules["cap"] and pres.get(cid) != rules["at_cap"]:
            E(f"{cid} reaches {v}% exposure: status must be {rules['at_cap']}")
        shown = ep.get("report", {}).get(cid)
        if shown and (shown[0] != start or shown[1] != v):
            E(f"{cid}: report shows {shown[0]}% -> {shown[1]}% but the rules give {start}% -> {v}%")

    # --- secrets and dialogue
    reveals = set(ep.get("reveals", []))
    for sid in reveals:
        s = secrets.get(sid)
        if not s: E(f"reveal {sid} not in mysteries.json"); continue
        if s.get("revealed_in"): W(f"{sid} was already revealed in FILE {s['revealed_in']:03d}")
        if s.get("planned_reveal") and f < s["planned_reveal"]: W(f"{sid} revealed in FILE {f:03d}, planned for FILE {s['planned_reveal']:03d}")
    for i, d in enumerate(ep.get("dialogue", [])):
        who, line = d.get("who"), d.get("line", "")
        if who not in cast: E(f"line {i + 1}: {who} speaks but is not in the cast")
        low = line.lower()
        for s in secrets.values():
            if s.get("revealed_in") or s["id"] in reveals: continue
            for term in s.get("forbidden_terms", []):
                if term.lower() in low: E(f"line {i + 1} ({who}) says '{term}' before secret {s['id']} is revealed")
    return errors, warnings, computed


def apply(ep, canon, computed, canon_dir, ep_dir):
    f = ep["file"]
    save(canon, os.path.join(ep_dir, "state_before.json"))
    new = copy.deepcopy(canon)
    chars = new["characters"]["characters"]
    chars.extend({k: v for k, v in nc.items()} for nc in ep.get("new_characters", []))
    byid = {c["id"]: c for c in chars}
    pres = {p["id"]: p["status"] for p in ep.get("personnel_results", [])}
    for cid, c in {c["id"]: c for c in ep.get("cast", [])}.items():
        ch = byid[cid]
        ch["first_appearance"] = ch.get("first_appearance") or f
        ch["last_appearance"] = f
        if cid in computed:
            ch["exposure"], ch["exposure_floor"] = computed[cid]["after"], computed[cid]["floor"]
            ch["missions_completed"] = (ch.get("missions_completed") or 0) + 1
        if cid in pres: ch["status"] = pres[cid]
        ch["known_anomalies"] = sorted(set(ch.get("known_anomalies", [])) | {a["id"] for a in ep.get("anomalies", [])}) if cid in computed else ch.get("known_anomalies", [])
    for e in new["equipment"]["items"]:
        if e["id"] in ep.get("equipment_unlocked", []): e["status"], e["unlocked_in"] = "available", f
    for ch_ in ep.get("salvage_changes", []):
        for s in new["salvage"]["items"]:
            if s["id"] == ch_["id"]: s["status"] = ch_["status"]
    new["anomalies"]["anomalies"].extend({k: v for k, v in na.items()} for na in ep.get("new_anomalies", []))
    for a in new["anomalies"]["anomalies"]:
        if a["id"] in {x["id"] for x in ep.get("anomalies", [])} and not a.get("first_seen"): a["first_seen"] = f
    for s in new["mysteries"]["secrets"]:
        if s["id"] in ep.get("reveals", []) and not s.get("revealed_in"): s["revealed_in"] = f
    tl = [t for t in new["timeline"]["files"] if t["file"] == f]
    if tl: tl[0].update({"status": "approved", "date": ep.get("date"), "site": ep.get("site", tl[0].get("site"))})
    else: new["timeline"]["files"].append({"file": f, "date": ep.get("date"), "site": ep.get("site"), "status": "approved"})
    new["series"]["last_approved_file"] = max(new["series"]["last_approved_file"], f)
    new["series"]["approved_files"] = sorted(set(new["series"]["approved_files"]) | {f})
    save(new, os.path.join(ep_dir, "state_after.json"))
    for k, v in new.items(): save(v, os.path.join(canon_dir, k + ".json"))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--canon", default=os.path.join(ROOT, "canon"))
    a = ap.parse_args()
    ep = load(a.episode)
    canon = load_canon(a.canon)
    errors, warnings, computed = check(ep, canon)
    print(f"FILE {ep['file']:03d} · {ep.get('title', '')}")
    for cid, v in computed.items(): print(f"  exposure {cid}: {v['before']}% -> {v['after']}% (floor {v['floor']}%)")
    for w in warnings: print("  WARN ", w)
    for e in errors: print("  ERROR", e)
    print(f"  {len(errors)} error(s), {len(warnings)} warning(s)")
    if errors: sys.exit(1)
    if a.apply:
        if not ep.get("approved"): sys.exit("  not applied: set \"approved\": true after human review")
        apply(ep, canon, computed, a.canon, os.path.dirname(os.path.abspath(a.episode)))
        print("  applied: canon advanced, state_before/state_after written")


if __name__ == "__main__":
    main()
