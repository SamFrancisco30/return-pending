"""Regression test for tools/continuity_check.py. Uses a temporary copy of tests/continuity/baseline_canon (canon as it was before FILE 001).

  python tests/continuity/run.py
"""
import json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
CHECK = os.path.join(ROOT, "tools", "continuity_check.py")


def run(ep, canon, *extra):
    r = subprocess.run([sys.executable, CHECK, ep, "--canon", canon, *extra], capture_output=True, text=True, encoding="utf-8")
    return r.returncode, r.stdout


with tempfile.TemporaryDirectory() as tmp:
    canon = os.path.join(tmp, "canon"); shutil.copytree(os.path.join(HERE, "baseline_canon"), canon)  # fixed pre-FILE-001 state, independent of live canon
    ep_dir = os.path.join(tmp, "file_001"); os.makedirs(ep_dir)
    ep = os.path.join(ep_dir, "episode.json"); shutil.copy(os.path.join(HERE, "good_file_001.json"), ep)

    code, out = run(ep, canon, "--apply")
    assert code == 0, out
    chars = {c["id"]: c for c in json.load(open(os.path.join(canon, "characters.json"), encoding="utf-8"))["characters"]}
    assert (chars["REYES"]["exposure"], chars["VANCE"]["exposure"], chars["ODA"]["exposure"]) == (11, 18, 48), chars
    assert os.path.exists(os.path.join(ep_dir, "state_before.json")) and os.path.exists(os.path.join(ep_dir, "state_after.json"))

    code, out = run(os.path.join(HERE, "bad_file_002.json"), canon)
    expected = ["follows FILE 001", "earlier than an approved file", "not a field operator", "rule differs from canon",
                "relay_puck is locked", "only 2 exist", "spare_key is unknown", "stabilizer granted but mission is FAILED",
                "but the rules give", "before secret srs_core_is_salvage", "ODA speaks but is not in the cast"]
    missing = [e for e in expected if e not in out]
    assert code == 1 and not missing, f"missing errors: {missing}\n{out}"

    code, out = run(ep, canon)
    assert code == 1 and "already approved" in out, out

print("continuity tests passed")
