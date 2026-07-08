-- =====================================================================
-- Fix: MV-FRN10-INPUT / MV-FRN20-INPUT were placed in FRN-10/FRN-20 with
-- coordinates that didn't even fall inside those buildings' own bounds.
-- They actually belong in UTL-01 (Utility Building) -- placed right next
-- to MV-OUT-FRN10/MV-OUT-FRN20, continuing the same row/spacing.
-- =====================================================================

BEGIN;

UPDATE objects
SET building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80',
    primary_floor_id = '13a9ce11-f532-404f-9974-de85955dc0ba',
    coord_x = 7007, coord_y = 5320
WHERE code = 'MV-FRN10-INPUT';

UPDATE objects
SET building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80',
    primary_floor_id = '13a9ce11-f532-404f-9974-de85955dc0ba',
    coord_x = 7052, coord_y = 5320
WHERE code = 'MV-FRN20-INPUT';

COMMIT;

-- Verify
SELECT code, building_id, coord_x, coord_y
FROM objects
WHERE code IN ('MV-OUT-FRN10', 'MV-OUT-FRN20', 'MV-FRN10-INPUT', 'MV-FRN20-INPUT')
ORDER BY code;
