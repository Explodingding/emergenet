#!/usr/bin/env python3
"""Cross-reference extracted OCR tags against BTH-03 objects in Supabase."""
import json, sys, urllib.request, urllib.parse

PROJECT_URL = "https://opicdwopttlahwambyvx.supabase.co"
SERVICE_KEY = sys.argv[1] if len(sys.argv) > 1 else None

with open("scripts/_locations_extracted.json", encoding="utf-8") as f:
    hits = json.load(f)

non_basement = [h for h in hits if h["floor_id"] is not None]
print(f"OCR extracted (non-basement): {len(non_basement)}")

if not SERVICE_KEY:
    print("No service key provided — skipping DB match check")
    print("Usage: py scripts/_verify_match.py <service_role_key>")
    sys.exit(0)

# Fetch all BTH-03 object codes from DB
headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
url = f"{PROJECT_URL}/rest/v1/objects?select=code,coord_x,coord_y&building_id=eq.(select+id+from+buildings+where+code+eq+BTH-03)&limit=2000"
# Use RPC instead for complex query
# Simpler: fetch all and filter client-side
url = f"{PROJECT_URL}/rest/v1/objects?select=code,coord_x,coord_y&limit=2000"

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    all_objs = json.loads(resp.read())

# Filter to BTH-03 by code pattern (all codes we extracted)
extracted_codes = set(h["tag"] for h in non_basement)
matched = [o for o in all_objs if o["code"] in extracted_codes]
unmatched = extracted_codes - {o["code"] for o in all_objs}

print(f"DB objects matching extracted tags: {len(matched)}")
print(f"Extracted tags NOT in DB:           {len(unmatched)}")
if unmatched:
    print("  Unmatched sample:")
    for c in sorted(unmatched)[:20]:
        print(f"    {c}")

already_positioned = [o for o in matched if o["coord_x"] != 0 or o["coord_y"] != 0]
will_be_updated = [o for o in matched if o["coord_x"] == 0 and o["coord_y"] == 0]
print(f"Of matched: {len(already_positioned)} already have coords, {len(will_be_updated)} will get new coords")
