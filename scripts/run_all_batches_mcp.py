#!/usr/bin/env python3
"""Read each batch SQL file and print it to stdout for manual MCP apply."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "supabase" / "migrations" / "batches"

for i in range(1, 13):
    p = BATCH_DIR / f"0012_batch_{i:02d}.sql"
    if p.exists():
        print(f"\n--- BATCH {i:02d} ({p.name}) ---")
        print(p.read_text(encoding="utf-8")[:200], "...")
