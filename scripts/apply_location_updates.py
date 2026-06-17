#!/usr/bin/env python3
"""
Apply 0014_location_coords_bth.sql to Supabase via REST API in batches.
Usage: py scripts/apply_location_updates.py <service_role_key>
"""
import sys, re, json, urllib.request, urllib.error
from pathlib import Path

PROJECT_URL = "https://opicdwopttlahwambyvx.supabase.co"
SQL_FILE = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "0014_location_coords_bth.sql"
BATCH_SIZE = 80

service_key = sys.argv[1] if len(sys.argv) > 1 else None
if not service_key:
    print("ERROR: pass service_role key as first argument")
    print("Usage: py scripts/apply_location_updates.py eyJ...")
    sys.exit(1)

headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# Read all UPDATE lines from SQL file
sql_text = SQL_FILE.read_text(encoding="utf-8")
updates = [line.strip() for line in sql_text.splitlines()
           if line.strip().startswith("UPDATE")]
print(f"Total UPDATE statements: {len(updates)}")


def run_batch(statements: list[str], batch_num: int) -> int:
    """Execute a batch of statements via /rest/v1/rpc or directly via management API."""
    batch_sql = "\n".join(statements)
    body = json.dumps({"query": batch_sql}).encode("utf-8")
    url = f"{PROJECT_URL}/rest/v1/rpc/exec_sql"
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"  [!] Batch {batch_num} error: {e.code} {err[:200]}")
        return e.code


def run_batch_sql_endpoint(statements: list[str], batch_num: int) -> bool:
    """Apply using Supabase Management API SQL endpoint."""
    batch_sql = "BEGIN;\n" + "\n".join(statements) + "\nCOMMIT;"
    url = f"https://api.supabase.com/v1/projects/opicdwopttlahwambyvx/database/query"
    # This requires a personal access token, not service role
    # Fall back to direct postgres connection
    return False


# Batch the updates
total_batches = (len(updates) + BATCH_SIZE - 1) // BATCH_SIZE
applied = 0

for i in range(0, len(updates), BATCH_SIZE):
    batch = updates[i:i + BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1
    
    # Build a combined SQL for this batch
    combined = "BEGIN;\n" + "\n".join(batch) + "\nCOMMIT;"
    
    # Use the execute_sql via management API
    url = f"https://api.supabase.com/v1/projects/opicdwopttlahwambyvx/database/query"
    mgmt_headers = {
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    body = json.dumps({"query": combined}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=mgmt_headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            applied += len(batch)
            print(f"  Batch {batch_num}/{total_batches}: OK ({len(batch)} statements, total applied: {applied})")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"  Batch {batch_num}/{total_batches}: ERROR {e.code}: {err[:300]}")
        # Try alternative approach
        break

print(f"\nDone. Applied {applied}/{len(updates)} updates.")
