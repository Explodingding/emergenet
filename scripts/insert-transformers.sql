-- =====================================================================
-- INSERT / UPDATE all plant transformers with canvas coordinates
-- Run once against Supabase (SQL Editor or psql)
--
-- Coordinate space: SITE_PLAN_RECT { x:600, y:600, w:18800, h:9280 }
-- All values in centimetres; coord_x/coord_y = object centre
-- =====================================================================
-- Building bounds reference (from lib/buildings-layout.js):
--   UTL-01: x=5559 y=4859 w=5194 h=949  → x:5559-10753  y:4859-5808
--   FRN-10: x=5547 y=6073 w=5559 h=2077 → x:5547-11106  y:6073-8150
--   FRN-20: x=5550 y=2523 w=5556 h=2063 → x:5550-11106  y:2523-4586
--   AWH-01: x=12487 y=2822 w=3565 h=4864
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 0. Ensure AWH-01 exists (it lives in buildings-layout.js but was
--    never inserted into the buildings table via a migration)
-- ---------------------------------------------------------------
INSERT INTO buildings (id, code, name, description, bounds_x, bounds_y, bounds_w, bounds_h, accent_color, display_order)
VALUES (
  'a0707a01-0000-4a01-aa01-000000000001',
  'AWH-01', 'Automated Warehouse', 'Automated finished-goods warehouse',
  12487, 2822, 3565, 4864, '#d97706', 7
)
ON CONFLICT (code) DO NOTHING;

-- Level 0 m floor for AWH-01
INSERT INTO floors (building_id, level, name, elevation_m)
VALUES ('a0707a01-0000-4a01-aa01-000000000001', 0, 'Level 0 m', 0.0)
ON CONFLICT (building_id, level) DO NOTHING;

-- ---------------------------------------------------------------
-- 1. UPDATE existing compressor transformers (already in DB at 0,0)
--    TR-COMP-1/2/3/4 live on the south row of UTL-01 Level 0 m
-- ---------------------------------------------------------------
UPDATE objects SET coord_x = 8150, coord_y = 5660 WHERE code = 'TR-COMP-1';
UPDATE objects SET coord_x = 7550, coord_y = 5660 WHERE code = 'TR-COMP-2';
UPDATE objects SET coord_x = 6950, coord_y = 5660 WHERE code = 'TR-COMP-3';
UPDATE objects SET coord_x = 6350, coord_y = 5660 WHERE code = 'TR-COMP-4';

-- ---------------------------------------------------------------
-- 2. INSERT new transformers
--    ON CONFLICT (code) DO UPDATE makes this re-runnable
-- ---------------------------------------------------------------
INSERT INTO objects
  (code, name, type_id, building_id, primary_floor_id,
   coord_x, coord_y, rotation, properties, is_active)
VALUES

-- ── UTL-01 South row (y = 5660) — left to right ─────────────────
-- TR COMPRESSOR LV  26/6 kV  2000 kVA  (feeds 6 kV turbo-compressor bus)
(
  'TR-COMP-LV',
  'Compressor LV Transformer (26/6 kV 2000 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  5750, 5660, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":6,"rating_kva":2000}',
  true
),

-- TR-DP1.2  26/0.4 kV  3150 kVA
(
  'TR-DP1.2',
  'Main Step-down Transformer DP1.2 (26/0.4 kV 3150 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  8750, 5660, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":3150}',
  true
),

-- TR-DP1.3  26/0.4 kV  3150 kVA
(
  'TR-DP1.3',
  'Main Step-down Transformer DP1.3 (26/0.4 kV 3150 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  9350, 5660, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":3150}',
  true
),

-- TR-DPC  Coupling / bus-tie transformer  26/0.4 kV  2000 kVA
(
  'TR-DPC',
  'Coupling Transformer (26/0.4 kV 2000 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  9950, 5660, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":2000}',
  true
),

-- TR-DP1.1  26/0.4 kV  3150 kVA  (far right, south row)
(
  'TR-DP1.1',
  'Main Step-down Transformer DP1.1 (26/0.4 kV 3150 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  10550, 5660, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":3150}',
  true
),

-- ── UTL-01 North row (y = 5050) — left to right ─────────────────
-- TR-DP2.2  26/0.4 kV  3150 kVA
(
  'TR-DP2.2',
  'Main Step-down Transformer DP2.2 (26/0.4 kV 3150 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  6200, 5050, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":3150}',
  true
),

-- TR-DP2.3  26/0.4 kV  3150 kVA
(
  'TR-DP2.3',
  'Main Step-down Transformer DP2.3 (26/0.4 kV 3150 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  7400, 5050, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":3150}',
  true
),

-- TR-DP2.1  26/0.4 kV  3150 kVA
(
  'TR-DP2.1',
  'Main Step-down Transformer DP2.1 (26/0.4 kV 3150 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  8600, 5050, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":3150}',
  true
),

-- TR-DPS  Spare transformer  26/0.4 kV  3150 kVA
(
  'TR-DPS',
  'Spare Transformer (26/0.4 kV 3150 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  9800, 5050, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":3150}',
  true
),

-- ISOLATION-TR  Safety / isolation transformer  400 kVA  26/0.4 kV  (far right)
(
  'TR-ISOLATION',
  'Safety Isolation Transformer (26/0.4 kV 400 kVA)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'UTL-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'UTL-01' AND f.name = 'Level 0 m'),
  10400, 5050, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4,"rating_kva":400}',
  true
),

-- ── FRN-10 boosting transformers (y ≈ 6473, top edge of FRN-10) ──
-- Four Ox-Fuel/boosting transformers across the furnace length
(
  'TR-BOOSTING-1.1',
  'Furnace 10 Boosting Transformer 1.1',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-10'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-10' AND f.name = 'Level 0 m'),
  6000, 6473, 0,
  '{}',
  true
),
(
  'TR-BOOSTING-1.2',
  'Furnace 10 Boosting Transformer 1.2',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-10'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-10' AND f.name = 'Level 0 m'),
  7200, 6473, 0,
  '{}',
  true
),
(
  'TR-BOOSTING-1.3',
  'Furnace 10 Boosting Transformer 1.3',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-10'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-10' AND f.name = 'Level 0 m'),
  8400, 6473, 0,
  '{}',
  true
),
(
  'TR-BOOSTING-1.4',
  'Furnace 10 Boosting Transformer 1.4',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-10'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-10' AND f.name = 'Level 0 m'),
  9600, 6473, 0,
  '{}',
  true
),

-- ── FRN-20 boosting transformers (y ≈ 2923, top edge of FRN-20) ──
(
  'TR-BOOSTING-2.1',
  'Furnace 20 Boosting Transformer 2.1',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-20'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-20' AND f.name = 'Level 0 m'),
  6000, 2923, 0,
  '{}',
  true
),
(
  'TR-BOOSTING-2.2',
  'Furnace 20 Boosting Transformer 2.2',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-20'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-20' AND f.name = 'Level 0 m'),
  7200, 2923, 0,
  '{}',
  true
),
(
  'TR-BOOSTING-2.3',
  'Furnace 20 Boosting Transformer 2.3',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-20'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-20' AND f.name = 'Level 0 m'),
  8400, 2923, 0,
  '{}',
  true
),
(
  'TR-BOOSTING-2.4',
  'Furnace 20 Boosting Transformer 2.4',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'FRN-20'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'FRN-20' AND f.name = 'Level 0 m'),
  9600, 2923, 0,
  '{}',
  true
),

-- ── AWH-01 — warehouse distribution transformer ───────────────────
(
  'TR-WAREHOUSE',
  'Warehouse Distribution Transformer (26/0.4 kV)',
  (SELECT id FROM object_types WHERE code = 'transformer'),
  (SELECT id FROM buildings WHERE code = 'AWH-01'),
  (SELECT f.id FROM floors f JOIN buildings b ON b.id = f.building_id
   WHERE b.code = 'AWH-01' AND f.name = 'Level 0 m'),
  13500, 3200, 0,
  '{"voltage_primary_kv":26,"voltage_secondary_kv":0.4}',
  true
)

ON CONFLICT (code) DO UPDATE SET
  coord_x          = EXCLUDED.coord_x,
  coord_y          = EXCLUDED.coord_y,
  name             = EXCLUDED.name,
  building_id      = EXCLUDED.building_id,
  primary_floor_id = EXCLUDED.primary_floor_id,
  properties       = EXCLUDED.properties;

COMMIT;

-- ── Verification ─────────────────────────────────────────────────
SELECT o.code, o.name, o.coord_x, o.coord_y, b.code AS building, f.name AS floor
FROM objects o
JOIN object_types ot ON ot.id = o.type_id
JOIN buildings b ON b.id = o.building_id
JOIN floors f ON f.id = o.primary_floor_id
WHERE ot.code = 'transformer'
ORDER BY b.code, o.coord_y, o.coord_x;
