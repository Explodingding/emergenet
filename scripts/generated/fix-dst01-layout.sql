-- =====================================================================
-- Layout fix: DST-01 (Distribution Building) internal object positions.
-- The 8 MV switchgear cubicles (H01-H08) placed in a single evenly-
-- spaced row (matching physical MV panel layout), DST-DP-UP kept in
-- the bottom-left corner, away from the row.
-- =====================================================================

BEGIN;

UPDATE objects SET coord_x = 2235, coord_y = 8774 WHERE code = 'DST-MV-H01';
UPDATE objects SET coord_x = 2368, coord_y = 8774 WHERE code = 'DST-MV-H02';
UPDATE objects SET coord_x = 2501, coord_y = 8774 WHERE code = 'DST-MV-H03';
UPDATE objects SET coord_x = 2634, coord_y = 8774 WHERE code = 'DST-MV-H04';
UPDATE objects SET coord_x = 2766, coord_y = 8774 WHERE code = 'DST-MV-H05';
UPDATE objects SET coord_x = 2899, coord_y = 8774 WHERE code = 'DST-MV-H06';
UPDATE objects SET coord_x = 3032, coord_y = 8774 WHERE code = 'DST-MV-H07';
UPDATE objects SET coord_x = 3165, coord_y = 8774 WHERE code = 'DST-MV-H08';
UPDATE objects SET coord_x = 2235, coord_y = 9215 WHERE code = 'DST-DP-UP';

COMMIT;

-- Verify
SELECT code, coord_x, coord_y FROM objects WHERE code IN (
  'DST-DP-UP','DST-MV-H01','DST-MV-H02','DST-MV-H03','DST-MV-H04',
  'DST-MV-H05','DST-MV-H06','DST-MV-H07','DST-MV-H08'
) ORDER BY code;
