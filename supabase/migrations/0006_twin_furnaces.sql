-- =====================================================================
-- 0006 — Equalize Furnace 10 and Furnace 20 (twin halls)
-- =====================================================================
-- F10 and F20 are physically identical buildings. Keep total complex
-- height = 9650 cm (matching Resorting Line) and Utility band = 1300 cm:
--   (9650 - 1300) / 2 = 4175  -> each furnace = 4175 cm deep
--
--   y=200    +-- Furnace 20 --+    +-- Resorting --+
--            |  82 x 41.75 m  |    |               |
--   y=4375   +-- Utility -----+    |               |
--            |  82 x 13 m     |    |   18 x 96.5 m |
--   y=5675   +-- Furnace 10 --+    |               |
--            |  82 x 41.75 m  |    |               |
--   y=9850   +----------------+    +---------------+
-- =====================================================================

update public.buildings
set bounds_x = 300, bounds_y = 200, bounds_w = 8200, bounds_h = 4175
where code = 'FRN-20';

update public.buildings
set bounds_x = 300, bounds_y = 4375, bounds_w = 8200, bounds_h = 1300
where code = 'UTL-01';

update public.buildings
set bounds_x = 300, bounds_y = 5675, bounds_w = 8200, bounds_h = 4175
where code = 'FRN-10';

-- (RST-01 and BTH-03 unchanged from 0005)
