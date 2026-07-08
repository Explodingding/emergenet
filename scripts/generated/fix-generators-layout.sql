-- =====================================================================
-- Straighten GENERATOR-1..4 into a single evenly-spaced row (150cm
-- apart, same y), continuing the line from SYNCHRONIZATION PANEL /
-- UT-UDP / UT-UPG.1 which already sit to their left.
-- Previous positions were roughly in a line but jittered in both
-- x-spacing (125/121/174cm gaps) and y (5602-5631).
-- =====================================================================

BEGIN;

UPDATE objects SET coord_x = 7809, coord_y = 5610 WHERE code = 'GENERATOR-1';
UPDATE objects SET coord_x = 7959, coord_y = 5610 WHERE code = 'GENERATOR-2';
UPDATE objects SET coord_x = 8109, coord_y = 5610 WHERE code = 'GENERATOR-3';
UPDATE objects SET coord_x = 8259, coord_y = 5610 WHERE code = 'GENERATOR-4';

COMMIT;

-- Verify
SELECT code, coord_x, coord_y FROM objects
WHERE code IN ('GENERATOR-1','GENERATOR-2','GENERATOR-3','GENERATOR-4')
ORDER BY code;
