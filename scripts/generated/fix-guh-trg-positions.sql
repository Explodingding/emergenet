-- =====================================================================
-- Fix: GUH-DP-UP and TRG-DP-UP1 were positioned 4000+ cm outside their
-- own buildings. Moved to the center of each (single-object buildings,
-- so no spread math needed).
--   GUH-01 (Guardhouse):   bounds x:1400-2000, y:200-600  -> center (1700, 400)
--   TRG-01 (Truck Guard):  bounds x:1400-2000, y:700-1100 -> center (1700, 900)
-- =====================================================================

BEGIN;

UPDATE objects SET coord_x = 1700, coord_y = 400 WHERE code = 'GUH-DP-UP';
UPDATE objects SET coord_x = 1700, coord_y = 900 WHERE code = 'TRG-DP-UP1';

COMMIT;

-- Verify
SELECT code, coord_x, coord_y FROM objects WHERE code IN ('GUH-DP-UP', 'TRG-DP-UP1');
