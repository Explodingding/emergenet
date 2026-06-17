#!/usr/bin/env python3
"""
Apply batch SQL files to Supabase via REST upsert API using service_role key.
Usage: py scripts/execute_batches_api.py <service_role_key> [start_batch] [end_batch]
Example: py scripts/execute_batches_api.py eyJ... 4 12
"""
import sys, json, re, urllib.request, urllib.error
from pathlib import Path

PROJECT_URL = "https://opicdwopttlahwambyvx.supabase.co"
BATCH_DIR = Path(__file__).resolve().parents[1] / "supabase" / "migrations" / "batches"
COLS = ["tag", "proposed_code", "name", "type_code", "building_code",
        "floor_name", "properties", "source_doc", "source_notes",
        "confidence", "status"]

service_key = sys.argv[1] if len(sys.argv) > 1 else None
start_batch = int(sys.argv[2]) if len(sys.argv) > 2 else 1
end_batch   = int(sys.argv[3]) if len(sys.argv) > 3 else 12

if not service_key:
    print("ERROR: pass service_role key as first argument")
    sys.exit(1)


def parse_sql_values(sql: str) -> list[dict]:
    """Extract VALUES rows from an INSERT ... VALUES (...), (...) statement."""
    # Find the values block between VALUES and ON CONFLICT
    m = re.search(r"VALUES\s*\n(.*?)ON CONFLICT", sql, re.DOTALL)
    if not m:
        return []
    block = m.group(1)

    rows = []
    # Match each row: ( ... )  (optionally followed by comma)
    # Use a greedy approach: split on "),\n  (" boundaries
    raw_rows = re.split(r"\),\s*\n\s*\(", block.strip())
    for raw in raw_rows:
        raw = raw.strip().lstrip("(").rstrip("),")
        # Parse the row into its 11 column values
        # Strategy: walk character by character tracking quotes and json braces
        values = []
        current = ""
        in_single = False
        brace_depth = 0

        i = 0
        while i < len(raw):
            c = raw[i]
            if c == "'" and not in_single:
                in_single = True
                i += 1
                continue
            if c == "'" and in_single:
                # Check for escaped quote ''
                if i + 1 < len(raw) and raw[i+1] == "'":
                    current += "'"
                    i += 2
                    continue
                in_single = False
                i += 1
                continue
            if in_single:
                current += c
                i += 1
                continue
            # Outside quotes
            if c == "," and brace_depth == 0:
                values.append(current.strip())
                current = ""
                i += 1
                continue
            current += c
            i += 1

        values.append(current.strip())  # last value

        if len(values) != 11:
            # Skip malformed rows
            continue

        row = {}
        for col, val in zip(COLS, values):
            val = val.strip()
            if val == "NULL":
                row[col] = None
            elif val.endswith("::jsonb"):
                # Strip ::jsonb and parse the inner JSON string
                inner = val[:-len("::jsonb")].strip().strip("'")
                # Unescape SQL single-quote escaping
                inner = inner.replace("''", "'")
                try:
                    row[col] = json.loads(inner)
                except json.JSONDecodeError:
                    row[col] = inner
            else:
                row[col] = val
        rows.append(row)

    return rows


def upsert_rows(rows: list[dict], service_key: str, batch_num: int) -> bool:
    if not rows:
        print(f"  SKIP batch {batch_num:02d}: no rows parsed")
        return True

    payload = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{PROJECT_URL}/rest/v1/staging_objects?on_conflict=tag",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(f"  OK batch {batch_num:02d}: {len(rows)} rows -> HTTP {resp.status}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR batch {batch_num:02d}: HTTP {e.code} — {body[:400]}")
        return False


total_ok = 0
total_err = 0

for i in range(start_batch, end_batch + 1):
    sql_file = BATCH_DIR / f"0012_batch_{i:02d}.sql"
    if not sql_file.exists():
        print(f"SKIP: {sql_file.name} not found")
        continue

    sql = sql_file.read_text(encoding="utf-8")
    rows = parse_sql_values(sql)
    print(f"Batch {i:02d}: parsed {len(rows)} rows from {sql_file.name}")

    ok = upsert_rows(rows, service_key, i)
    if ok:
        total_ok += len(rows)
    else:
        total_err += len(rows)

print(f"\nDone: {total_ok} rows upserted, {total_err} rows failed")
