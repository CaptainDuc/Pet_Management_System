"""Inspect payment Flyway history; --apply backs up and adopts known legacy V4.

Local Docker only. No password, API key or bank transfer is required.
"""
import argparse
from datetime import datetime
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--apply", action="store_true")
parser.add_argument("--container", default="petcare-payment-postgres")
parser.add_argument("--user", default="petcare_payment")
parser.add_argument("--database", default="petcare_payment")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]


def psql(statement):
    result = subprocess.run(
        ["docker", "exec", "-i", args.container, "psql", "-U", args.user, "-d", args.database,
         "-v", "ON_ERROR_STOP=1", "-At"], input=statement, text=True, capture_output=True)
    if result.returncode:
        raise SystemExit("Database check/adoption failed: " + result.stderr.strip())
    return result.stdout.strip()


def history():
    return json.loads(psql("SELECT coalesce(json_agg(t),'[]'::json) FROM "
                          "(SELECT version,checksum,success FROM flyway_schema_history ORDER BY installed_rank) t;"))


def counts():
    return json.loads(psql("SELECT json_build_object("
                          "'orders',(SELECT count(*) FROM orders),"
                          "'payments',(SELECT count(*) FROM payments),"
                          "'transactions',(SELECT count(*) FROM payment_transactions),"
                          "'events',(SELECT count(*) FROM payment_events));"))


before = history()
print("Flyway history:", json.dumps(before))
canonical = {"1": 83097785, "2": -1182131905, "3": 1911053231}
versions = {row["version"]: row["checksum"] for row in before if row["success"]}
if all(versions.get(version) == checksum for version, checksum in canonical.items()):
    print("Canonical V1-V3 already present. No adoption needed.")
    raise SystemExit(0)
if len(before) != 2 or versions != {"1": 83097785, "4": 995927507}:
    raise SystemExit("Unsupported history. No changes made; review it before migration.")
print("Known legacy V1+V4 detected. Adoption restores V2 column settings and V1-V3 metadata; business rows are preserved.")
if not args.apply:
    print("Dry run only. To back up and apply: python scripts/normalize-payment-history.py --apply")
    raise SystemExit(0)

directory = root / ".local-backups"
directory.mkdir(exist_ok=True)
backup = directory / ("payment-before-merge-" + datetime.now().strftime("%Y%m%d-%H%M%S-%f") + ".sql")
with backup.open("xb") as destination:
    dumped = subprocess.run(["docker", "exec", args.container, "pg_dump", "-U", args.user,
                             "-d", args.database, "--no-owner", "--no-acl"], stdout=destination, stderr=subprocess.PIPE)
if dumped.returncode or backup.stat().st_size == 0:
    raise SystemExit("Backup failed; no metadata was changed.")
print("Full database backup:", backup)
row_counts = counts()
psql((root / "infrastructure/postgres/normalize_payment_history.sql").read_text(encoding="utf-8"))
after = history()
assert {row["version"]: row["checksum"] for row in after if row["success"]} == canonical
assert counts() == row_counts, "Business row counts changed; inspect backup before proceeding"
print("Adoption complete. Orders/payments/transactions/events unchanged:", json.dumps(row_counts))
print("Start the updated payment service to apply the retired V4 marker and validate normally.")
