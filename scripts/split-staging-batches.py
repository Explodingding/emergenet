#!/usr/bin/env python3
"""Apply 0012_batch_house_staging.sql in batches via stdout for MCP/manual use."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "supabase" / "migrations" / "0012_batch_house_staging.sql"
BATCH_DIR = ROOT / "supabase" / "migrations" / "batches"
BATCH_SIZE = 80

text = SQL.read_text(encoding="utf-8")
lines = text.splitlines()
import re
value_lines = [l.rstrip().rstrip(",") for l in lines if re.match(r"\s+\('", l)]
header = """INSERT INTO public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
VALUES
"""
footer = """
ON CONFLICT (tag) DO UPDATE SET
  name = EXCLUDED.name,
  type_code = EXCLUDED.type_code,
  building_code = EXCLUDED.building_code,
  floor_name = EXCLUDED.floor_name,
  properties = EXCLUDED.properties,
  source_doc = EXCLUDED.source_doc,
  source_notes = COALESCE(EXCLUDED.source_notes, staging_objects.source_notes),
  updated_at = now();
"""

BATCH_DIR.mkdir(exist_ok=True)
for i in range(0, len(value_lines), BATCH_SIZE):
    chunk = value_lines[i : i + BATCH_SIZE]
    # fix trailing comma on last line
    fixed = []
    for j, line in enumerate(chunk):
        s = line.rstrip()
        if j == len(chunk) - 1:
            s = s.rstrip(",")  # last row in batch
        fixed.append(s)
    batch_sql = header + ",\n".join(fixed) + footer
    out = BATCH_DIR / f"0012_batch_{i // BATCH_SIZE + 1:02d}.sql"
    out.write_text(batch_sql, encoding="utf-8")
    print(f"Wrote {out.name} ({len(chunk)} rows)")

print(f"Total batches: {(len(value_lines) + BATCH_SIZE - 1) // BATCH_SIZE}")
