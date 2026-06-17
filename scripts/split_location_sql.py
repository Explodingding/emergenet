#!/usr/bin/env python3
"""Split 0014 migration into 3 batches for MCP apply."""
import re
from pathlib import Path

src = Path("supabase/migrations/0014_location_coords_bth.sql")
sql = src.read_text(encoding="utf-8")

# Extract all value rows
rows = re.findall(r"    \('[^']+', \d+, \d+, '[^']+'\)", sql)
print(f"Total rows: {len(rows)}")

BATCH = len(rows) // 3 + 1
header = """UPDATE public.objects AS obj
SET
    coord_x          = u.cx,
    coord_y          = u.cy,
    primary_floor_id = u.fid::uuid
FROM (VALUES
"""
footer = """\n) AS u(code, cx, cy, fid)
WHERE obj.code = u.code
  AND obj.building_id = (SELECT id FROM public.buildings WHERE code = 'BTH-03');"""

out_dir = Path("supabase/migrations/batches")
out_dir.mkdir(exist_ok=True)

for i in range(3):
    chunk = rows[i*BATCH:(i+1)*BATCH]
    body = ",\n".join(chunk)
    full = header + body + footer
    fname = out_dir / f"0014_batch_{i+1:02d}.sql"
    fname.write_text(full, encoding="utf-8")
    print(f"  {fname.name}: {len(chunk)} rows")
