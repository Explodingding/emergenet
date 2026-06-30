-- =====================================================================
-- Add Synchronization Panel object type + synchronizes relation
-- Run in Supabase SQL editor
-- =====================================================================

-- 1. Add the object type
--    icon: 'GitMerge' (already registered in the frontend icon registry)
INSERT INTO object_types (code, label, category, icon)
VALUES ('sync_panel', 'Synchronization Panel', 'switching', 'GitMerge')
ON CONFLICT (code) DO NOTHING;

-- 2. Allow 'synchronizes' as a relation value.
--    If your dependencies.relation column is a plain TEXT / VARCHAR, skip this block.
--    If it is an ENUM, run the ALTER TYPE below:
--
-- ALTER TYPE dependency_relation ADD VALUE IF NOT EXISTS 'synchronizes';
--
--    If unsure, check with:
-- SELECT pg_type.typname, pg_enum.enumlabel
-- FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
-- WHERE pg_type.typname LIKE '%relation%';

-- 3. Example: wire a sync panel to its generators
--    (replace codes with your actual object codes)
--
-- INSERT INTO dependencies (source_id, target_id, relation, is_active)
-- SELECT s.id, g.id, 'synchronizes', true
-- FROM objects s, objects g
-- WHERE s.code = 'SYN-01'           -- your sync panel code
--   AND g.code IN ('GEN-01', 'GEN-02', 'GEN-03');

-- 4. Set sync panel properties (sync_method, tolerances)
--
-- UPDATE objects
-- SET properties = properties || '{
--   "sync_method": "auto",
--   "voltage_tolerance_pct": 2,
--   "freq_tolerance_hz": 0.2
-- }'::jsonb
-- WHERE code = 'SYN-01';

-- 5. Verify
SELECT code, name, building_id, coord_x, coord_y
FROM objects
WHERE type_id = (SELECT id FROM object_types WHERE code = 'sync_panel');
