-- =====================================================================
-- Line up the Main MV bus row (incoming supplies + outgoing feeders +
-- spares), 25cm spacing, continuing the same y=5332 line as the
-- MV-FRN10-INPUT panel row, starting at (6700, 5332).
-- =====================================================================

BEGIN;

UPDATE objects SET coord_x = 6700, coord_y = 5332 WHERE code = 'MV-SUPPLY-1';
UPDATE objects SET coord_x = 6725, coord_y = 5332 WHERE code = 'MV-SUPPLY-2';
UPDATE objects SET coord_x = 6750, coord_y = 5332 WHERE code = 'MV-OUT-FRN10';
UPDATE objects SET coord_x = 6775, coord_y = 5332 WHERE code = 'MV-OUT-FRN20';
UPDATE objects SET coord_x = 6800, coord_y = 5332 WHERE code = 'MV-SPARE-1';
UPDATE objects SET coord_x = 6825, coord_y = 5332 WHERE code = 'MV-SPARE-2';

COMMIT;

-- Verify
SELECT code, coord_x, coord_y FROM objects
WHERE code IN ('MV-SUPPLY-1','MV-SUPPLY-2','MV-OUT-FRN10','MV-OUT-FRN20','MV-SPARE-1','MV-SPARE-2')
ORDER BY coord_x;
