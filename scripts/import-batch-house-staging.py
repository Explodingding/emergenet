#!/usr/bin/env python3
"""Import Batch House equipment TSV into staging_objects SQL migration."""
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "batch-house-equipment.tsv"
OUTPUT = ROOT / "supabase" / "migrations" / "0012_batch_house_staging.sql"

# Full legend: prefix -> type_code  (None = awaiting clarification from user)
LEGEND = {
    "BA":   "bin_activator",         # Bin Activator
    "BE":   "bucket_elevator",       # Bucket Elevator
    "C":    "conveyor",              # Conveyor Belt
    "DCC":  "pneumatic_hammer",      # Pneumatic Hammer
    "DCU":  "dedusting_unit",        # Dedusting Unit
    "DE":   None,                    # Unknown — needs clarification
    "DG":   "diverter_gate",         # Diverter Gate
    "FFS":  None,                    # Unknown — needs clarification
    "HM":   "hose_mover",            # Hose Mover
    "HO":   "receiving_hopper",      # Receiving Hopper
    "M":    "mixer",                 # Mixer
    "MI":   "premixer",              # Premixer
    "MMU":  "moisture_probe",        # Moisture Probe
    "MS":   "moisture_shutoff",      # Moisture Shut-Off Valve
    "MW":   None,                    # Unknown — needs clarification
    "PM":   None,                    # Unknown — needs clarification
    "PTP":  "pneumatic_pipeline",    # Pneumatic Transfer Pipeline (sender)
    "S":    "silo_accessory",        # Silo Accessory
    "SC":   "dosing_screw",          # Dosing Screw
    "TB":   "terminal_block",        # Terminal Block
    "TW":   "test_weight",           # Automatic Test Weight
    "VF":   "dosing_feeder",         # Dosing Vibratory Feeder
}

# Order matters — longer prefixes first to avoid mis-matching e.g. "DCC" as "DC"
_PREFIX_ORDER = [
    ("DCC", "DCC"),
    ("DCU", "DCU"),
    ("DG",  "DG"),
    ("DE",  "DE"),
    ("FFS", "FFS"),
    ("HM",  "HM"),
    ("HO",  "HO"),
    ("MMU", "MMU"),
    ("MS",  "MS"),
    ("MW",  "MW"),
    ("MI",  "MI"),
    ("PTP", "PTP"),
    ("PM",  "PM"),
    ("SC",  "SC"),
    ("TB",  "TB"),
    ("TW",  "TW"),
    ("VF",  "VF"),
    ("BE",  "BE"),
    ("BA",  "BA"),
    ("CG",  None),   # CG = valve/gate families, keep as process_equipment
    ("CC",  None),
    ("CT",  None),
    ("C",   "C"),    # plain conveyor — only if starts with C + digit
    ("M",   "M"),
    ("S",   "S"),
]


def infer_type_code(tag: str) -> str:
    # Use the full tag (before first '-') as the base
    base = tag.split("-")[0].upper()
    for prefix, legend_key in _PREFIX_ORDER:
        if base.startswith(prefix) and legend_key is not None:
            # Special case: "C" prefix only matches C<digit> conveyors
            if prefix == "C" and not re.match(r"^C[0-9]", base):
                continue
            # Special case: "M" prefix — bare Mx or Mx#### pattern only
            if prefix == "M" and not re.match(r"^M[0-9]", base):
                continue
            # Special case: "S" prefix — silo accessories S<digit> or S3…
            if prefix == "S" and not re.match(r"^S[0-9]", base):
                continue
            tc = LEGEND.get(legend_key)
            return tc if tc else "process_equipment"
        elif base.startswith(prefix) and legend_key is None:
            return "process_equipment"
    return "process_equipment"


def elevation_to_floor(elev: float, subtitle: str) -> str:
    if elev <= 0:
        return "Ground"
    if elev <= 11:
        return "Level 5"
    if elev <= 14:
        return "Level 12"
    if elev <= 20:
        return "Level 17"
    if elev <= 25:
        return "Level 22"
    if elev <= 30:
        return "Level 27"
    return "Level 32"


def parse_level(level_raw: str, subtitle: str):
    if not level_raw or level_raw.strip() in ("", "5"):
        return None, "Ground", None
    s = level_raw.strip()
    if s == "CULLET RETURN":
        return 0.0, "Ground", "cullet_return"

    m = re.match(r"([+-]?\d+(?:\.\d+)?)\.\.\.([+-]?\d+(?:\.\d+)?)", s)
    if m:
        mid = (float(m.group(1)) + float(m.group(2))) / 2
        return mid, elevation_to_floor(mid, subtitle), infer_zone(subtitle)

    dual = re.search(r"([+-]?\d+(?:\.\d+)?)\s*/\s*([+-]?\d+(?:\.\d+)?)", subtitle)
    try:
        n = float(s.replace("+", ""))
    except ValueError:
        return None, "Ground", infer_zone(subtitle)

    if dual and (n < 5 or n > 40):
        mid = (float(dual.group(1)) + float(dual.group(2))) / 2
        return mid, elevation_to_floor(mid, subtitle), infer_zone(subtitle)

    return n, elevation_to_floor(n, subtitle), infer_zone(subtitle)


def infer_zone(subtitle: str) -> str:
    if "CULLET TOWER" in subtitle:
        return "cullet_tower"
    if "BATCH TRANSPORT START" in subtitle:
        return "batch_transport_start"
    if "BATCH TRANSPORT END" in subtitle:
        return "batch_transport_end"
    if "CULLET RETURN" in subtitle:
        return "cullet_return"
    return "batch_house"


_TYPE_LABELS = {
    "bin_activator":    "Bin Activator",
    "bucket_elevator":  "Bucket Elevator",
    "conveyor":         "Conveyor",
    "pneumatic_hammer": "Pneumatic Hammer",
    "dedusting_unit":   "Dedusting Unit",
    "diverter_gate":    "Diverter Gate",
    "hose_mover":       "Hose Mover",
    "receiving_hopper": "Receiving Hopper",
    "mixer":            "Mixer",
    "premixer":         "Premixer",
    "moisture_probe":   "Moisture Probe",
    "moisture_shutoff": "Moisture Shut-Off Valve",
    "pneumatic_pipeline": "Pneumatic Transfer Pipeline",
    "silo_accessory":   "Silo Accessory",
    "dosing_screw":     "Dosing Screw",
    "terminal_block":   "Terminal Block",
    "test_weight":      "Automatic Test Weight",
    "dosing_feeder":    "Dosing Vibratory Feeder",
    "process_equipment": "Process Equipment",
}


def build_name(tag: str, subtitle: str, type_code: str) -> str:
    label = _TYPE_LABELS.get(type_code, "Equipment")
    zone = subtitle.split(" +")[0].strip()
    return f"{label} {tag} — {zone}"


def esc(s) -> str:
    return str(s or "").replace("'", "''")


def parse_tsv(text: str):
    rows = []
    for line in text.splitlines():
        if not line.strip():
            continue
        cols = line.split("\t")
        if len(cols) < 2:
            continue
        tag = cols[0].strip()
        if tag in ("tag", "5", ""):
            continue
        rows.append(
            {
                "tag": tag,
                "area_code": cols[1].strip() if len(cols) > 1 else "",
                "subtitle_location": cols[2].strip() if len(cols) > 2 else "",
                "drawing": cols[3].strip() if len(cols) > 3 else "",
                "level": cols[4].strip() if len(cols) > 4 else "",
                "project_site": cols[5].strip() if len(cols) > 5 else "",
            }
        )
    return rows


def dedupe_tags(rows):
    seen = {}
    out = []
    for row in rows:
        key = row["tag"]
        unique = key
        note = None
        if key in seen:
            prev = seen[key]
            suffix = row["drawing"] or row["level"] or str(len(seen))
            unique = f"{key}@{suffix}"
            note = f"Duplicate tag; also at drawing {prev['drawing']} level {prev['level']}"
        row["unique_tag"] = unique
        row["source_notes"] = note
        seen[key] = row
        out.append(row)
    return out


def main():
    rows = dedupe_tags(parse_tsv(INPUT.read_text(encoding="utf-8")))
    print(f"Parsed {len(rows)} rows")

    values = []
    for r in rows:
        type_code = infer_type_code(r["tag"])
        elev, floor, zone = parse_level(r["level"], r["subtitle_location"])
        zone = zone or infer_zone(r["subtitle_location"])
        props = {
            "area_code": r["area_code"],
            "subtitle_location": r["subtitle_location"],
            "drawing": r["drawing"],
            "level_raw": r["level"],
            "elevation_m": elev,
            "zone": zone,
            "project_site": r["project_site"],
            "original_tag": r["tag"],
            "location_code": f"BAH-{elev if elev is not None else 0}-{zone.upper()}",
        }
        if type_code == "process_equipment":
            props["legend_pending"] = True
        props_json = esc(json.dumps(props, ensure_ascii=False))
        note_sql = f"'{esc(r['source_notes'])}'" if r["source_notes"] else "NULL"
        values.append(
            f"  ('{esc(r['unique_tag'])}','{esc(r['tag'])}','{esc(build_name(r['tag'], r['subtitle_location'], type_code))}',"
            f"'{type_code}','BTH-03','{floor}','{props_json}'::jsonb,"
            f"'batch-house-equipment-export',{note_sql},'medium','draft')"
        )

    sql = f"""-- Migration 0012: Batch House process equipment → staging_objects
-- Source: batch-house-equipment.tsv
-- Legend: BA=Bin Activator, BE=Bucket Elevator, C=Conveyor, DCC=Pneumatic Hammer
-- Generated: {date.today().isoformat()}

INSERT INTO public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
VALUES
{',\n'.join(values)}
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
    OUTPUT.write_text(sql, encoding="utf-8")
    print(f"Wrote {OUTPUT} ({len(values)} rows, {OUTPUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
