#!/usr/bin/env python3
"""
Extract equipment positions from Locations Lahti floor plan PDFs.

For each floor plan PNG:
1. Run RapidOCR to get all text with bounding boxes
2. Filter for equipment tag patterns (e.g. DCU7503-M1, PTP1621-ZS1)
3. Map pixel positions → BTH-03 building coordinate space (cm)
4. Generate SQL UPDATE statements for objects table

Usage:
    py scripts/extract_locations_lahti.py [--preview] [--output out.sql]
"""
import re, json, argparse, sys
from pathlib import Path
from PIL import Image
import numpy as np
from rapidocr_onnxruntime import RapidOCR

# ── Configuration ──────────────────────────────────────────────────────────────

PREVIEW_DIR = Path(r"C:\Users\lukasz.klimowski\Documents\emergent\Locations Lahti\_preview")
PDF_ROOT    = Path(r"C:\Users\lukasz.klimowski\Documents\emergent\Locations Lahti")

# BTH-03 building bounds (cm in plant coordinate space)
BTH_X  = 300
BTH_Y  = 4425
BTH_W  = 4000
BTH_H  = 1200

# Floor plan files → (floor_id, elevation_label)
# The PDFs are A3 portrait; floor plan drawing occupies the upper portion.
# Pixel bounding box of the actual floor plan drawing (within the 1684x2382 image):
#   These were calibrated by visual inspection of BH_0m.png.
#   Adjust if needed per floor (most are similar layout).
DEFAULT_PLAN_BBOX = (30, 10, 1650, 1700)   # (left, top, right, bottom) pixels

FLOOR_MAP = {
    "BH_m3.85m": {
        "floor_id": None,            # no matching floor in DB, will add as basement
        "floor_name": "Basement",
        "elevation_m": -3.85,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
    "BH_0m": {
        "floor_id": "9d7ec3d3-b0a1-462a-9876-9ec30f3a9b99",
        "floor_name": "Ground",
        "elevation_m": 0.0,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
    "BH_p5m1": {
        "floor_id": "1de8a7f5-cf60-4081-95fb-9d4abd2c771c",
        "floor_name": "Level 5",
        "elevation_m": 5.1,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
    "BH_p5m2": {
        "floor_id": "1de8a7f5-cf60-4081-95fb-9d4abd2c771c",
        "floor_name": "Level 5",
        "elevation_m": 5.1,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
    "BH_p12m": {
        "floor_id": "e5556fdf-4b9a-4f2a-bcc7-f677c8262230",
        "floor_name": "Level 12",
        "elevation_m": 12.0,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
    "BH_p17m": {
        "floor_id": "9b336b23-39cb-472f-b5ec-859d65ad1945",
        "floor_name": "Level 17",
        "elevation_m": 17.5,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
    "BH_p22m": {
        "floor_id": "6552687d-40d9-430e-bdd2-ad37cf5e0edc",
        "floor_name": "Level 22",
        "elevation_m": 22.8,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
    "BH_p32m": {
        "floor_id": "d72b0dc0-2243-4d12-926d-7dcc5b830d18",
        "floor_name": "Level 32",
        "elevation_m": 32.5,
        "plan_bbox": DEFAULT_PLAN_BBOX,
    },
}

# Equipment tag pattern: 2-5 uppercase letters, 4+ digits, optional suffix
TAG_PATTERN = re.compile(
    r"^[A-Z]{2,5}\d{3,5}(?:[A-Z]\d*)?(?:[-_][A-Z]{1,4}\d{0,3})?$"
)

# ── Helpers ────────────────────────────────────────────────────────────────────

def bbox_center(bbox):
    """Return (cx, cy) of a RapidOCR bounding box [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]."""
    pts = np.array(bbox)
    return float(pts[:, 0].mean()), float(pts[:, 1].mean())


def pixel_to_cm(px, py, plan_bbox):
    """
    Map pixel position within the floor plan image to BTH-03 building cm coordinates.

    plan_bbox: (left, top, right, bottom) pixel bounds of the floor plan drawing area.
    The Batch House is a wide horizontal building.  Its long axis runs left-right
    on the drawing.  Left edge = bounds_x, right edge = bounds_x + bounds_w.
    """
    left, top, right, bottom = plan_bbox
    plan_w = right - left
    plan_h = bottom - top

    # Normalised [0..1] within the drawing
    rel_x = max(0.0, min(1.0, (px - left)  / plan_w))
    rel_y = max(0.0, min(1.0, (py - top)   / plan_h))

    # Map to BTH-03 bounds (cm)
    cm_x = int(BTH_X + rel_x * BTH_W)
    cm_y = int(BTH_Y + rel_y * BTH_H)
    return cm_x, cm_y


def is_equipment_tag(text: str) -> bool:
    """Return True if the text looks like a BTH-03 equipment tag."""
    t = text.strip().upper().replace(" ", "")
    return bool(TAG_PATTERN.match(t))


def clean_tag(text: str) -> str:
    return text.strip().upper().replace(" ", "")


# ── Main extraction ────────────────────────────────────────────────────────────

def extract_floor(png_path: Path, floor_cfg: dict, engine: RapidOCR, verbose=False):
    """Run OCR on one floor plan PNG, return list of {tag, cx_cm, cy_cm, floor_id}."""
    img = Image.open(png_path).convert("RGB")
    arr = np.array(img)

    result, _ = engine(arr)
    if not result:
        print(f"  [!] No OCR results for {png_path.name}")
        return []

    plan_bbox = floor_cfg["plan_bbox"]
    hits = []
    seen = set()

    for item in result:
        bbox, text, score = item
        tag = clean_tag(text)
        if not is_equipment_tag(tag):
            continue
        cx, cy = bbox_center(bbox)
        cm_x, cm_y = pixel_to_cm(cx, cy, plan_bbox)
        key = tag
        if key in seen:
            continue
        seen.add(key)
        hits.append({
            "tag": tag,
            "text_raw": text.strip(),
            "score": round(float(score), 3),
            "px": round(cx, 1),
            "py": round(cy, 1),
            "cm_x": cm_x,
            "cm_y": cm_y,
            "floor_id": floor_cfg["floor_id"],
            "floor_name": floor_cfg["floor_name"],
            "elevation_m": floor_cfg["elevation_m"],
        })
        if verbose:
            print(f"    {tag:30s}  px=({cx:.0f},{cy:.0f})  cm=({cm_x},{cm_y})  score={score:.2f}")

    return hits


def generate_sql(all_hits: list) -> str:
    """
    Generate a single bulk UPDATE using a VALUES CTE for efficiency.
    One statement — easy to apply via MCP execute_sql.
    """
    rows = []
    for h in all_hits:
        if h["floor_id"] is None:
            continue  # skip basement
        tag = h["tag"].replace("'", "''")
        rows.append(
            f"    ('{tag}', {h['cm_x']}, {h['cm_y']}, '{h['floor_id']}')"
        )

    if not rows:
        return "-- No data to update\n"

    values_block = ",\n".join(rows)

    return f"""\
-- Auto-generated: equipment positions from Locations Lahti floor plans
-- Generated by scripts/extract_locations_lahti.py
-- Single bulk UPDATE via VALUES CTE — {len(rows)} rows

BEGIN;

UPDATE public.objects AS obj
SET
    coord_x          = u.cx,
    coord_y          = u.cy,
    primary_floor_id = u.fid::uuid
FROM (VALUES
{values_block}
) AS u(code, cx, cy, fid)
WHERE obj.code = u.code
  AND obj.building_id = (SELECT id FROM public.buildings WHERE code = 'BTH-03');

COMMIT;
"""


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="supabase/migrations/0014_location_coords_bth.sql")
    parser.add_argument("--json", default="scripts/_locations_extracted.json")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--floors", nargs="*", help="Only process these floor keys (e.g. BH_0m BH_p5m1)")
    args = parser.parse_args()

    print("Loading RapidOCR engine...")
    engine = RapidOCR()

    all_hits = []
    floors_to_run = args.floors or list(FLOOR_MAP.keys())

    for key in floors_to_run:
        cfg = FLOOR_MAP[key]
        png = PREVIEW_DIR / f"{key}.png"
        if not png.exists():
            print(f"  SKIP {key}: PNG not found at {png}")
            continue

        print(f"\n-- {key} ({cfg['floor_name']}, {cfg['elevation_m']}m) --")
        hits = extract_floor(png, cfg, engine, verbose=args.verbose)
        print(f"  Found {len(hits)} equipment tags")
        all_hits.extend(hits)

    # Deduplicate: if a tag appears on multiple floors, keep the one from the floor
    # where it appears most prominently (highest OCR score).
    deduped = {}
    for h in all_hits:
        k = h["tag"]
        if k not in deduped or h["score"] > deduped[k]["score"]:
            deduped[k] = h

    final = list(deduped.values())
    print(f"\nTotal unique tags extracted: {len(final)}")

    # Save JSON for inspection
    json_path = Path(args.json)
    json_path.parent.mkdir(exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2)
    print(f"JSON saved -> {json_path}")

    # Generate SQL
    sql = generate_sql(final)
    out_path = Path(args.output)
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"SQL saved  -> {out_path}")
    print(f"SQL UPDATE rows (excl. basement): {sql.count('UPDATE public.objects')}")


if __name__ == "__main__":
    main()
