-- =====================================================================
-- Floor naming standardisation migration
-- Run once against Supabase (SQL Editor or psql)
-- =====================================================================
-- Old → New:
--   Ground     → Level 0 m
--   Mezzanine  → Level -3.8 m
--   Level 5    → Level 5 m
--   Level 9    → Level 9 m
--   Level 12   → Level 12 m
--   Level 22   → Level 22 m
--   Level 27   → Level 27 m
--   Level 32   → Level 32 m
--   Level 17   → reassign objects to Level 22 m, then delete
-- =====================================================================

BEGIN;

-- Step 1: rename existing floors
UPDATE floors SET name = 'Level 0 m'    WHERE name = 'Ground';
UPDATE floors SET name = 'Level -3.8 m' WHERE name = 'Mezzanine';
UPDATE floors SET name = 'Level 5 m'    WHERE name = 'Level 5';
UPDATE floors SET name = 'Level 9 m'    WHERE name = 'Level 9';
UPDATE floors SET name = 'Level 12 m'   WHERE name = 'Level 12';
UPDATE floors SET name = 'Level 22 m'   WHERE name = 'Level 22';
UPDATE floors SET name = 'Level 27 m'   WHERE name = 'Level 27';
UPDATE floors SET name = 'Level 32 m'   WHERE name = 'Level 32';

-- Step 2: reassign Level 17 objects → Level 22 m
UPDATE objects
SET primary_floor_id = (SELECT id FROM floors WHERE name = 'Level 22 m')
WHERE primary_floor_id = (SELECT id FROM floors WHERE name = 'Level 17');

-- Step 3: remove Level 17 from object_floors junction table (if it exists)
DELETE FROM object_floors
WHERE floor_id = (SELECT id FROM floors WHERE name = 'Level 17');

-- Step 4: delete Level 17 floor row
DELETE FROM floors WHERE name = 'Level 17';

COMMIT;
