/**
 * Import Batch House process equipment tags into staging_objects.
 * Usage: node scripts/import-batch-house-staging.mjs [path-to.tsv]
 * Default input: data/batch-house-equipment.tsv
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inputPath = process.argv[2] || path.join(root, 'data', 'batch-house-equipment.tsv');
const outSql = path.join(root, 'supabase', 'migrations', '0012_batch_house_staging.sql');

const LEGEND = {
  BA: 'bin_activator',
  BE: 'bucket_elevator',
  C: 'conveyor',
  DCC: 'pneumatic_hammer',
};

function inferTypeCode(tag) {
  const base = tag.split('-')[0].toUpperCase();
  if (base.startsWith('DCC')) return LEGEND.DCC;
  if (base.startsWith('BE')) return LEGEND.BE;
  if (base.startsWith('BA')) return LEGEND.BA;
  // Conveyor tags: C1121, C6131A, C9281A (not CG, CC, CT equipment families)
  if (/^C[0-9]/.test(base) && !/^(CG|CC|CT|CP|C9)/.test(base)) return LEGEND.C;
  return 'process_equipment';
}

function inferEquipmentClass(tag) {
  const suffix = tag.includes('-') ? tag.split('-').slice(1).join('-').toUpperCase() : '';
  if (/^XV|^ZS|^JB|^CB|^CU|^EU|^FD|^MP|^FM|^WE|^DP|^LP|^M\d|^Q\d|^S51|^SS|^AS|^ES|^MS|^HS|^TC|^LS|^OT|^G\d|^B\d|^H\d|^D\d|^U\d|^P\d|^SST|^MGC|^MGE|^M2X|^CUT|^AHL|^AHS|^AHG|^LCP|^SLS|^LSL|^CV|^DPSS|^PS|^SM|^FM|^JB|^WE/.test(suffix)) {
    return suffix.replace(/\d+$/, '').slice(0, 6) || 'component';
  }
  return null;
}

function parseLevel(levelRaw, subtitle) {
  if (!levelRaw || levelRaw === '5' || levelRaw.trim() === '') return { elevation_m: null, floor: 'Ground' };
  const s = String(levelRaw).trim();
  if (s === 'CULLET RETURN') return { elevation_m: 0, floor: 'Ground', zone: 'cullet_return' };

  // Range like +8.190...+9.965 or +32.460...+42.125
  const range = s.match(/([+-]?\d+(?:\.\d+)?)\.\.\.([+-]?\d+(?:\.\d+)?)/);
  if (range) {
    const mid = (parseFloat(range[1]) + parseFloat(range[2])) / 2;
    return { elevation_m: mid, floor: elevationToFloor(mid, subtitle) };
  }

  // Dual elevation in subtitle: +26.300 / +29.000 — use subtitle if level looks like ratio
  const dual = subtitle.match(/([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)/);
  if (dual && (parseFloat(s) < 5 || parseFloat(s) > 40)) {
    const mid = (parseFloat(dual[1]) + parseFloat(dual[2])) / 2;
    return { elevation_m: mid, floor: elevationToFloor(mid, subtitle) };
  }

  const n = parseFloat(s.replace(/^\+/, ''));
  if (Number.isNaN(n)) return { elevation_m: null, floor: 'Ground' };
  return { elevation_m: n, floor: elevationToFloor(n, subtitle) };
}

function elevationToFloor(elev, subtitle) {
  if (subtitle.includes('CULLET TOWER')) {
    if (elev <= 0) return 'Ground';
    if (elev <= 6) return 'Level 5';
    if (elev <= 14) return 'Level 12';
    if (elev <= 20) return 'Level 17';
    if (elev <= 25) return 'Level 22';
    if (elev <= 30) return 'Level 27';
    return 'Level 32';
  }
  if (elev <= 0) return 'Ground';
  if (elev <= 6) return 'Level 5';
  if (elev <= 11) return 'Level 5'; // +10.435 areas
  if (elev <= 14) return 'Level 12';
  if (elev <= 20) return 'Level 17';
  if (elev <= 25) return 'Level 22';
  if (elev <= 30) return 'Level 27';
  return 'Level 32';
}

function inferZone(subtitle) {
  if (subtitle.includes('CULLET TOWER')) return 'cullet_tower';
  if (subtitle.includes('BATCH TRANSPORT START')) return 'batch_transport_start';
  if (subtitle.includes('BATCH TRANSPORT END')) return 'batch_transport_end';
  if (subtitle.includes('CULLET RETURN')) return 'cullet_return';
  if (subtitle.includes('BATCH HOUSE')) return 'batch_house';
  return 'batch_house';
}

function inferBuilding(subtitle) {
  return 'BTH-03';
}

function buildName(tag, subtitle, typeCode) {
  const typeLabel = {
    bin_activator: 'Bin Activator',
    bucket_elevator: 'Bucket Elevator',
    conveyor: 'Conveyor',
    pneumatic_hammer: 'Pneumatic Hammer',
    process_equipment: 'Process Equipment',
  }[typeCode] || 'Equipment';
  const zone = subtitle.split(/\s+\+/)[0].trim();
  return `${typeLabel} ${tag} — ${zone}`;
}

function esc(s) {
  return String(s ?? '').replace(/'/g, "''");
}

function parseTsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = [];
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 2) continue;
    const [tag, area_code, subtitle_location, drawing, level, project_site] = cols;
    if (!tag || tag === 'tag' || tag.trim() === '5') continue;
    if (!tag.trim()) continue;
    rows.push({
      tag: tag.trim(),
      area_code: (area_code || '').trim(),
      subtitle_location: (subtitle_location || '').trim(),
      drawing: (drawing || '').trim(),
      level: (level || '').trim(),
      project_site: (project_site || '').trim(),
    });
  }
  return rows;
}

function dedupeTags(rows) {
  const seen = new Map();
  const out = [];
  for (const row of rows) {
    let key = row.tag;
    if (seen.has(key)) {
      const prev = seen.get(key);
      const suffix = row.drawing || row.level || String(seen.size);
      key = `${row.tag}@${suffix}`;
      row.source_notes = `Duplicate tag; also at drawing ${prev.drawing} level ${prev.level}`;
    }
    row.unique_tag = key;
    seen.set(row.tag, row);
    out.push(row);
  }
  return out;
}

const raw = fs.readFileSync(inputPath, 'utf8');
const rows = dedupeTags(parseTsv(raw));
console.log(`Parsed ${rows.length} rows from ${inputPath}`);

const values = rows.map((r) => {
  const typeCode = inferTypeCode(r.tag);
  const { elevation_m, floor, zone: zoneFromLevel } = parseLevel(r.level, r.subtitle_location);
  const zone = zoneFromLevel || inferZone(r.subtitle_location);
  const building = inferBuilding(r.subtitle_location);
  const equipClass = inferEquipmentClass(r.tag);
  const props = {
    area_code: r.area_code,
    subtitle_location: r.subtitle_location,
    drawing: r.drawing,
    level_raw: r.level,
    elevation_m,
    zone,
    project_site: r.project_site,
    original_tag: r.tag,
  };
  if (equipClass) props.equipment_class = equipClass;
  if (typeCode === 'process_equipment') props.legend_pending = true;

  const locationCode = `BAH-${elevation_m ?? 0}-${zone.toUpperCase().replace(/_/g, '')}`;

  return `  ('${esc(r.unique_tag)}','${esc(r.tag)}','${esc(buildName(r.tag, r.subtitle_location, typeCode))}','${typeCode}','${building}','${floor}', '${esc(JSON.stringify({ ...props, location_code: locationCode }))}'::jsonb, 'batch-house-equipment-export', ${r.source_notes ? `'${esc(r.source_notes)}'` : 'NULL'}, 'medium', 'draft')`;
});

const header = `-- Migration 0012: Batch House process equipment → staging_objects
-- Source: batch-house-equipment.tsv (Ciner Glass Belgium / AGC legacy tags)
-- Legend: BA=Bin Activator, BE=Bucket Elevator, C=Conveyor, DCC=Pneumatic Hammer
-- Generated: ${new Date().toISOString().slice(0, 10)}

INSERT INTO public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
VALUES
`;

const footer = `
ON CONFLICT (tag) DO UPDATE SET
  name = EXCLUDED.name,
  type_code = EXCLUDED.type_code,
  building_code = EXCLUDED.building_code,
  floor_name = EXCLUDED.floor_name,
  properties = EXCLUDED.properties,
  source_doc = EXCLUDED.source_doc,
  source_notes = COALESCE(EXCLUDED.source_notes, staging_objects.source_notes),
  updated_at = now();
`;

// Split into chunks of 100 for readability; single INSERT is fine for Postgres
const sql = header + values.join(',\n') + footer;
fs.writeFileSync(outSql, sql, 'utf8');
console.log(`Wrote ${outSql} (${rows.length} rows)`);
