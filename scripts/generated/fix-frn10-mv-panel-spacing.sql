-- =====================================================================
-- Line up MV-FRN10-INPUT + all 14 Furnace 10 MV panel breakers in one
-- row, edge-to-edge with no visible gap, same y — matches the real
-- panel elevation's continuous cubicle row. Run AFTER
-- add-frn10-mv-panel-cubicles.sql has created the 14 breaker objects.
--
-- 25cm spacing: as tight as practical while keeping each object its
-- own clickable marker (0cm would stack them exactly on top of each
-- other, making individual ones unselectable).
-- =====================================================================

BEGIN;

UPDATE objects SET coord_x = 6288, coord_y = 5332 WHERE code = 'MV-FRN10-INPUT';
UPDATE objects SET coord_x = 6313, coord_y = 5332 WHERE code = 'MV-TR1.1';
UPDATE objects SET coord_x = 6338, coord_y = 5332 WHERE code = 'MV-TR1.2';
UPDATE objects SET coord_x = 6363, coord_y = 5332 WHERE code = 'MV-TR1.3';
UPDATE objects SET coord_x = 6388, coord_y = 5332 WHERE code = 'MV-TR-SPARE-F10';
UPDATE objects SET coord_x = 6413, coord_y = 5332 WHERE code = 'MV-TR-COMP-1';
UPDATE objects SET coord_x = 6438, coord_y = 5332 WHERE code = 'MV-TR-COMP-2';
UPDATE objects SET coord_x = 6463, coord_y = 5332 WHERE code = 'MV-TR-COMP-LV';
UPDATE objects SET coord_x = 6488, coord_y = 5332 WHERE code = 'MV-TR-BOOSTING-1.1';
UPDATE objects SET coord_x = 6513, coord_y = 5332 WHERE code = 'MV-TR-BOOSTING-1.2';
UPDATE objects SET coord_x = 6538, coord_y = 5332 WHERE code = 'MV-TR-BOOSTING-1.3';
UPDATE objects SET coord_x = 6563, coord_y = 5332 WHERE code = 'MV-TR-BOOSTING-1.4';
UPDATE objects SET coord_x = 6588, coord_y = 5332 WHERE code = 'MV-RING-10-20';
UPDATE objects SET coord_x = 6613, coord_y = 5332 WHERE code = 'MV-WAREHOUSE-F10';
UPDATE objects SET coord_x = 6638, coord_y = 5332 WHERE code = 'MV-SPARE-F10';

COMMIT;

-- Verify
SELECT code, coord_x, coord_y FROM objects
WHERE code = 'MV-FRN10-INPUT' OR code LIKE 'MV-TR%' OR code LIKE 'MV-RING%' OR code LIKE 'MV-WAREHOUSE%' OR code LIKE 'MV-SPARE%'
ORDER BY coord_x;
