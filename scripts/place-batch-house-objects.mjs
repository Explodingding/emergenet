/**
 * Generate placement UPDATEs for the previously-unplaced Batch House objects.
 *
 * Source of truth for tag -> area: BH_equipment_locations_merged.csv
 * Source of truth for area -> position: AREA_ANCHORS in lib/room-anchors.js
 *   (duplicated here as plain data — same convention already used by
 *   scripts/insert-transformers.sql, which duplicates building bounds
 *   from lib/buildings-layout.js as comments/values rather than importing).
 *
 * Usage: node scripts/place-batch-house-objects.mjs [path-to.csv]
 * Requires: run scripts/add-cullet-tower-and-transport-buildings.sql FIRST.
 * Output: scripts/generated/place-batch-house.sql
 *
 * Object codes + coords are read live from Supabase (publishable key,
 * read-only) so the "unplaced" set always reflects the current DB state.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const csvPath = process.argv[2] || 'P:/public/Utilities E/Drawings BH/BH Boxes/BH_equipment_locations_merged.csv';
const outSql = path.join(root, 'scripts', 'generated', 'place-batch-house.sql');

const SUPABASE_URL = 'https://opicdwopttlahwambyvx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dESxDjADYgiawrNW7ButgQ_APFHhY_V';
const BTH_BUILDING_ID = '2de1ab67-96b7-4641-a8e9-ed296418ccae';

// Keep in sync with AREA_ANCHORS in lib/room-anchors.js.
const AREA_ANCHORS = {
  'BATCH HOUSE +8.190...+9.965':             ['BTH-03', 'Level 9 m',    0.50, 0.50],
  'BATCH HOUSE CULLET RETURN':               ['BTH-03', 'Level 0 m',   0.65, 0.50],
  'BATCH HOUSE +5.135':                      ['BTH-03', 'Level 5 m',   0.25, 0.50],
  'BATCH HOUSE -3.850':                      ['BTH-03', 'Level -3.8 m',0.50, 0.50],
  'BATCH HOUSE +0.000, +2.135':              ['BTH-03', 'Level 0 m',   0.75, 0.50],
  'BATCH HOUSE +17.460':                     ['BTH-03', 'Level 22 m',  0.25, 0.50],
  'BATCH HOUSE +32.460...+42.125':           ['BTH-03', 'Level 32 m',  0.50, 0.50],
  'BATCH HOUSE +22.760':                     ['BTH-03', 'Level 22 m',  0.75, 0.50],
  'BATCH HOUSE +10.435, +12.435':            ['BTH-03', 'Level 12 m',  0.50, 0.50],

  'CULLET TOWER +0.000':                     ['CT-10', 'Level 0 m',   0.50, 0.50],
  'CULLET TOWER -5.000':                     ['CT-10', 'Level -5 m',  0.50, 0.50],
  'CULLET TOWER +26.300 / +29.000':          ['CT-10', 'Level 27 m',  0.50, 0.50],
  'CULLET TOWER +26.300':                    ['CT-10', 'Level 27 m',  0.35, 0.50],
  'CULLET TOWER +22.700':                    ['CT-10', 'Level 22 m',  0.50, 0.50],
  'CULLET TOWER +18.800':                    ['CT-10', 'Level 18 m',  0.50, 0.50],
  'CULLET TOWER +4.720':                     ['CT-10', 'Level 5 m',   0.50, 0.50],
  'CULLET TOWER +32.380':                    ['CT-10', 'Level 32 m',  0.50, 0.50],
  'CULLET TOWER -3.500':                     ['CT-10', 'Level -3.8 m',0.50, 0.50],

  'BATCH TRANSPORT START':                   ['BTR-01', 'Level 0 m',  0.10, 0.50],
  'BATCH TRANSPORT START +0.000':            ['BTR-01', 'Level 0 m',  0.10, 0.50],
  'BATCH TRANSPORT START +20.730 / +18.370': ['BTR-01', 'Level 18 m', 0.35, 0.50],
  'BATCH TRANSPORT END +13.680':             ['BTR-01', 'Level 14 m', 0.55, 0.50],
  'BATCH TRANSPORT END +18.374':             ['BTR-01', 'Level 18 m', 0.75, 0.50],
  'BATCH TRANSPORT END +21.341':             ['BTR-01', 'Level 21 m', 0.90, 0.50],
};

// Keep in sync with lib/buildings-layout.js bounds_x/y/w/h.
const BOUNDS = {
  'BTH-03': [1494, 5041, 1945, 612],
  'CT-10':  [4400, 6082, 1113, 530],
  'BTR-01': [3439, 5197, 2120, 300],
};

const BUILDING_ID = {
  'BTH-03': BTH_BUILDING_ID,
  'CT-10':  'cf10aa01-0000-4a01-aa10-000000000010',
  'BTR-01': 'b7a0aa01-0000-4b01-aa01-000000000001',
};

async function fetchUnplaced() {
  const url = `${SUPABASE_URL}/rest/v1/objects?select=code,coord_x,coord_y&building_id=eq.${BTH_BUILDING_ID}&coord_x=eq.0&coord_y=eq.0&limit=1000`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return res.json();
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(';');
  const tagIdx = header.indexOf('tag');
  const areaIdx = header.indexOf('subtitle_location');
  const map = new Map();
  for (const line of lines.slice(1)) {
    const cols = line.split(';');
    map.set(cols[tagIdx]?.trim(), cols[areaIdx]?.trim());
  }
  return map;
}

// Mirrors resolveCoordinates() spread math in lib/room-anchors.js.
function computeSpread(building, relX, relY, index, groupSize) {
  const [bx, by, bw, bh] = BOUNDS[building];
  const MARGIN = Math.min(bw, bh) * 0.05;
  const usableW = bw - MARGIN * 2;
  const usableH = bh - MARGIN * 2;
  const SPREAD = 120;
  const cols = Math.max(1, Math.ceil(Math.sqrt(groupSize)));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const offsetX = (col - (cols - 1) / 2) * SPREAD;
  const offsetY = (row - Math.floor(groupSize / cols) / 2) * SPREAD;
  const x = bx + MARGIN + relX * usableW + offsetX;
  const y = by + MARGIN + relY * usableH + offsetY;
  return {
    x: Math.round(Math.max(bx + MARGIN, Math.min(bx + bw - MARGIN, x))),
    y: Math.round(Math.max(by + MARGIN, Math.min(by + bh - MARGIN, y))),
  };
}

async function main() {
  const unplaced = await fetchUnplaced();
  const tagToArea = parseCsv(fs.readFileSync(csvPath, 'utf-8'));

  const resolved = [];
  const missing = [];
  for (const { code } of unplaced) {
    const area = tagToArea.get(code);
    const anchor = area && AREA_ANCHORS[area];
    if (!anchor) { missing.push(code); continue; }
    resolved.push([code, ...anchor]);
  }

  if (missing.length) {
    console.warn(`WARNING: ${missing.length} unplaced codes had no CSV/anchor match:`, missing.slice(0, 20));
  }

  const groups = new Map();
  for (const [code, building, floor, relX, relY] of resolved) {
    const key = `${building}|${floor}|${relX}|${relY}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(code);
  }

  const placements = new Map();
  for (const [key, codes] of groups) {
    const [building, floor, relXStr, relYStr] = key.split('|');
    const relX = Number(relXStr), relY = Number(relYStr);
    codes.forEach((code, i) => {
      const { x, y } = computeSpread(building, relX, relY, i, codes.length);
      placements.set(code, { x, y, building, floor });
    });
  }

  const lines = [
    '-- =====================================================================',
    '-- Generated by scripts/place-batch-house-objects.mjs',
    '-- Places previously-unplaced Batch House objects using',
    '-- BH_equipment_locations_merged.csv + AREA_ANCHORS (lib/room-anchors.js).',
    '--',
    '-- Run scripts/add-cullet-tower-and-transport-buildings.sql FIRST —',
    '-- this script relies on the CT-10 / BTR-01 buildings and floors it creates.',
    '-- =====================================================================',
    '',
    'BEGIN;',
    '',
  ];
  for (const code of [...placements.keys()].sort()) {
    const { x, y, building, floor } = placements.get(code);
    const bid = BUILDING_ID[building];
    lines.push(
      `UPDATE objects SET building_id = '${bid}', ` +
      `primary_floor_id = (SELECT id FROM floors WHERE building_id = '${bid}' AND name = '${floor}'), ` +
      `coord_x = ${x}, coord_y = ${y} WHERE code = '${code}';`
    );
  }
  lines.push('', 'COMMIT;');

  fs.mkdirSync(path.dirname(outSql), { recursive: true });
  fs.writeFileSync(outSql, lines.join('\n') + '\n');
  console.log(`Placed ${placements.size} objects -> ${outSql}`);
}

main();
