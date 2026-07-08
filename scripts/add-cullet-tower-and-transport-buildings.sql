-- =====================================================================
-- Add missing buildings for Cullet Tower (CT-10 / CT-20) and the new
-- Batch Transport / Conveyor Bridge structure.
--
-- CT-10 / CT-20 already have bounding boxes hardcoded in
-- lib/buildings-layout.js (the frontend's single source of truth for
-- rendering), but no matching rows existed in the Supabase `buildings`
-- table, so no object could reference them. This inserts those rows
-- using the EXACT SAME UUIDs already hardcoded in buildings-layout.js
-- so the objects.building_id FK resolves and rendering stays in sync.
--
-- Run once in Supabase SQL Editor. Safe to re-run (ON CONFLICT DO NOTHING).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Buildings
-- ---------------------------------------------------------------------
INSERT INTO buildings (id, code, name, description, bounds_x, bounds_y, bounds_w, bounds_h, accent_color, display_order)
VALUES
  ('cf10aa01-0000-4a01-aa10-000000000010', 'CT-10', 'Cullet Tower',
   'Cullet return tower serving Furnace 10', 4400, 6082, 1113, 530, '#0ea5e9', 5),
  ('cf10aa01-0000-4a01-aa10-000000000020', 'CT-20', 'Cullet Tower',
   'Cullet return tower serving Furnace 20', 4406, 4055, 1110, 533, '#0ea5e9', 4),
  ('b7a0aa01-0000-4b01-aa01-000000000001', 'BTR-01', 'Batch Transport / Conveyor Bridge',
   'Elevated conveyor connecting Batch House to the Cullet Tower / furnace area',
   2900, 5400, 1600, 700, '#14b8a6', 9)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Floors — CT-10
--    Elevations from BH_equipment_locations_merged.csv. Reuses the same
--    floor NAMES already established for BTH-03 (Level 0/5/22/27/32 m)
--    where the elevation is a close match, so naming stays consistent
--    across the plant. Two genuinely new floors (-5 m, 18 m) added for
--    elevations with no close match.
-- ---------------------------------------------------------------------
INSERT INTO floors (building_id, level, name, elevation_m)
VALUES
  ('cf10aa01-0000-4a01-aa10-000000000010', -2, 'Level -5 m',   -5.00),
  ('cf10aa01-0000-4a01-aa10-000000000010', -1, 'Level -3.8 m', -3.50),
  ('cf10aa01-0000-4a01-aa10-000000000010',  0, 'Level 0 m',     0.00),
  ('cf10aa01-0000-4a01-aa10-000000000010',  1, 'Level 5 m',     4.72),
  ('cf10aa01-0000-4a01-aa10-000000000010',  2, 'Level 9 m',     9.00),
  ('cf10aa01-0000-4a01-aa10-000000000010',  3, 'Level 18 m',   18.80),
  ('cf10aa01-0000-4a01-aa10-000000000010',  4, 'Level 22 m',   22.70),
  ('cf10aa01-0000-4a01-aa10-000000000010',  5, 'Level 27 m',   27.65),
  ('cf10aa01-0000-4a01-aa10-000000000010',  6, 'Level 32 m',   32.38)
ON CONFLICT (building_id, level) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Floors — CT-20 (placeholder set, mirrors CT-10; no CSV data yet)
-- ---------------------------------------------------------------------
INSERT INTO floors (building_id, level, name, elevation_m)
VALUES
  ('cf10aa01-0000-4a01-aa10-000000000020', -1, 'Level -3.8 m', -3.80),
  ('cf10aa01-0000-4a01-aa10-000000000020',  0, 'Level 0 m',     0.00),
  ('cf10aa01-0000-4a01-aa10-000000000020',  1, 'Level 5 m',     5.10),
  ('cf10aa01-0000-4a01-aa10-000000000020',  2, 'Level 9 m',     9.00)
ON CONFLICT (building_id, level) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Floors — BTR-01 (Batch Transport / Conveyor Bridge)
--    Covers CSV clusters: 0.000 | 13.680 | 18.374 & 18.370 | 21.341 & 20.730
-- ---------------------------------------------------------------------
INSERT INTO floors (building_id, level, name, elevation_m)
VALUES
  ('b7a0aa01-0000-4b01-aa01-000000000001', 0, 'Level 0 m',   0.00),
  ('b7a0aa01-0000-4b01-aa01-000000000001', 1, 'Level 14 m', 13.68),
  ('b7a0aa01-0000-4b01-aa01-000000000001', 2, 'Level 18 m', 18.37),
  ('b7a0aa01-0000-4b01-aa01-000000000001', 3, 'Level 21 m', 21.00)
ON CONFLICT (building_id, level) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Floors — BTH-03 itself is missing two floors that its own
--    buildings-layout.js entry already lists (Level -3.8 m, Level 9 m)
--    but were never inserted as DB rows.
-- ---------------------------------------------------------------------
INSERT INTO floors (building_id, level, name, elevation_m)
VALUES
  ('2de1ab67-96b7-4641-a8e9-ed296418ccae', -1, 'Level -3.8 m', -3.85),
  ('2de1ab67-96b7-4641-a8e9-ed296418ccae',  3, 'Level 9 m',     9.08)
ON CONFLICT (building_id, level) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
SELECT b.code, b.name, f.name AS floor, f.elevation_m
FROM buildings b
JOIN floors f ON f.building_id = b.id
WHERE b.code IN ('CT-10', 'CT-20', 'BTR-01', 'BTH-03')
ORDER BY b.code, f.elevation_m;
