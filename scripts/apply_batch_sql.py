#!/usr/bin/env python3
"""
Apply batch SQL files to Supabase via REST API.
Requires SUPABASE_SERVICE_ROLE_KEY environment variable or pass as first arg.
Usage: py scripts/apply_batch_sql.py <service_role_key>
"""
import sys, json, urllib.request, urllib.error
from pathlib import Path

PROJECT_URL = "https://opicdwopttlahwambyvx.supabase.co"
BATCH_DIR = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "batches"

service_key = sys.argv[1] if len(sys.argv) > 1 else None
if not service_key:
    print("ERROR: pass service_role key as first argument")
    sys.exit(1)

for i in range(1, 13):
    sql_file = BATCH_DIR / f"0012_batch_{i:02d}.sql"
    if not sql_file.exists():
        print(f"SKIP: {sql_file.name} not found")
        continue

    sql = sql_file.read_text(encoding="utf-8")
    payload = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        f"{PROJECT_URL}/rest/v1/rpc/execute_sql",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"OK batch {i:02d}: {resp.status}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"ERROR batch {i:02d}: {e.code} {body[:300]}")
