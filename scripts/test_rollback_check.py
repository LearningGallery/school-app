#!/usr/bin/env python3
"""Self-check: the compatibility table matches the real migrations and blocks the rollbacks the integration test proves unsafe."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rollback_check import check  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
compat = json.loads((ROOT / "database/compat.json").read_text())
stamps = sorted(int(re.match(r"\d{13}", f.name).group()) for f in (ROOT / "database/migrations").glob("*.sql"))

# every migration must be runnable by at least one release, and the newest migration only by the newest release
for s in stamps:
    assert any(r["min"] <= s and (r["max"] is None or s <= r["max"]) for r in compat["releases"].values()), f"migration {s} fits no release"
assert stamps[-1] == compat["releases"]["school-app/v4"]["min"], "compat.json is out of date: newest migration is not v4's minimum"

ok = lambda rel, ts: check(rel, ts, compat)[0]
# the same facts the integration test proves against PostgreSQL
assert ok("school-app/v1", 1700000000000)
assert ok("school-app/v1", 1700000001000) and ok("school-app/v2", 1700000001000)  # expand: both work
assert ok("school-app/v1", 1700000002000) and ok("school-app/v2", 1700000002000)  # backfill: both work
assert not ok("school-app/v2", 1700000003000), "rolling back to v2 after contract must be blocked"
assert not ok("school-app/v1", 1700000003000), "rolling back to v1 after contract must be blocked"
assert not ok("school-app/v3", 1700000002000), "v3 needs the contract migration"
assert not ok("school-app/v9", 1700000003000), "an unknown release must not be trusted"
# v4 is expand-only: rolling back to v3 after it is safe, rolling back past the contract still is not
assert ok("school-app/v3", 1700000004000), "v4 only adds, so v3 must still run on the v4 schema"
assert not ok("school-app/v2", 1700000004000) and not ok("school-app/v1", 1700000004000)
assert not ok("school-app/v4", 1700000003000), "v4 needs its own migration"
print("rollback_check: ok")
