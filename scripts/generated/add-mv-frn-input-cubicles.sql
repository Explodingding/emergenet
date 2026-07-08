-- =====================================================================
-- Add MV-FRN10-INPUT and MV-FRN20-INPUT (didn't exist yet) and wire:
--   MV-OUT-FRN10 -> MV-FRN10-INPUT   (Furnace 10's incoming MV cubicle)
--   MV-OUT-FRN20 -> MV-FRN20-INPUT   (Furnace 20's incoming MV cubicle)
--
-- Placed inside FRN-10 / FRN-20 respectively, at the edge nearest to
-- Utility Building (where the MV feed physically comes from) --
-- FRN-10's top edge and FRN-20's bottom edge both face UTL-01.
--
-- Not touched here: TR1.1/1.2/1.3/TR-S/TR-COMP-LV/etc are still wired
-- directly from UTL-FMCC (existing Block 1). Restructuring those to
-- hang off MV-FRN10-INPUT instead is a separate, bigger change -- ask
-- if you want that too.
-- =====================================================================

BEGIN;

INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES
  (gen_random_uuid(), 'MV-FRN10-INPUT', 'MV Input Cubicle - Furnace 10 Main MV Panel',
   '96656dcd-b6b6-40b5-8205-82d5b88d4a56', '4a685e38-f5c9-4252-ab5e-367868816a08',
   (SELECT id FROM floors WHERE building_id = '96656dcd-b6b6-40b5-8205-82d5b88d4a56' AND name = 'Level 0 m'),
   true, 8326, 6173, 0, '{}'),
  (gen_random_uuid(), 'MV-FRN20-INPUT', 'MV Input Cubicle - Furnace 20 Main MV Panel',
   'cb415f24-8508-45a3-be65-bf9239afeb81', '4a685e38-f5c9-4252-ab5e-367868816a08',
   (SELECT id FROM floors WHERE building_id = 'cb415f24-8508-45a3-be65-bf9239afeb81' AND name = 'Level 0 m'),
   true, 8328, 4486, 0, '{}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MV-OUT-FRN10' AND t.code = 'MV-FRN10-INPUT'
ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MV-OUT-FRN20' AND t.code = 'MV-FRN20-INPUT'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE t.code IN ('MV-FRN10-INPUT', 'MV-FRN20-INPUT');
