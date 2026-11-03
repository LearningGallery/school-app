#!/usr/bin/env python3
"""Can we roll the application back to a release without breaking it against the CURRENT database schema?

usage: rollback_check.py --to school-app/v2 --applied 1700000003000_v3-contract-drop-full-name

--applied is the newest applied migration (name or timestamp), for example:
  psql "$DATABASE_URL" -Atc "select name from pgmigrations order by id desc limit 1"
Exit 0: safe. Exit 1: the old version cannot run on this schema (roll FORWARD with a fix, or restore the snapshot).
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMPAT = ROOT / "database" / "compat.json"


def timestamp(value):
    m = re.match(r"^(\d{13})", str(value))
    if not m:
        raise SystemExit(f"cannot read a migration timestamp from {value!r}")
    return int(m.group(1))


def check(release, applied, compat):
    rel = compat["releases"].get(release)
    if rel is None:
        return False, f"{release} is not in database/compat.json: unknown compatibility, do not roll back blindly"
    ts = timestamp(applied)
    if ts < rel["min"]:
        return False, f"schema {ts} is older than {release} needs ({rel['min']}): {rel['note']}"
    if rel["max"] is not None and ts > rel["max"]:
        return False, (f"schema {ts} is newer than {release} can run on (max {rel['max']}): {rel['note']}. "
                       "A rollback would break it. Roll forward with a fix, or restore the pre-contract snapshot.")
    return True, f"{release} runs on schema {ts}"


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--to", required=True, help="release to roll back to, as tagged, for example school-app/v2")
    ap.add_argument("--applied", required=True)
    ap.add_argument("--compat", default=COMPAT, type=Path)
    a = ap.parse_args(argv)
    ok, why = check(a.to, a.applied, json.loads(a.compat.read_text()))
    print(("OK    " if ok else "BLOCK ") + why)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
