-- =====================================================================
-- 0005 — Plant footprint calibrated against Resorting Line = 1736 m^2
-- =====================================================================
-- Anchor: Resorting Line area = 1736 m^2 (user-provided)
-- All other building footprints derived from the proportions of the
-- annotated drawing (image-pixel ratios kept; absolute scale from anchor).
--
-- Layout (cm, top-left origin):
--   x         300 ............... 8500  8600 ........... 10400
--   y=200  +--Furnace 20--------+    +--Resorting----+
--          |  82 x 34 m         |    |  18 x 96.5 m  |
--   y=3600 +--Utility-----------+    |  1736 m^2     |
--          |  82 x 13 m         |    |               |
--   y=4900 +--Furnace 10--------+    |               |
--          |  82 x 49.5 m       |    |               |
--   y=9850 +--------------------+    +---------------+
--
--   Batch House (separate, east of main block):
--   TL=(11000, 4500), 24 x 15 m, 360 m^2
-- =====================================================================

-- Furnace 20  (yellow / top)
update public.buildings
set bounds_x = 300, bounds_y = 200, bounds_w = 8200, bounds_h = 3400
where code = 'FRN-20';

-- Utility Building  (red / middle band)
update public.buildings
set bounds_x = 300, bounds_y = 3600, bounds_w = 8200, bounds_h = 1300
where code = 'UTL-01';

-- Furnace 10  (blue / bottom, deepest)
update public.buildings
set bounds_x = 300, bounds_y = 4900, bounds_w = 8200, bounds_h = 4950
where code = 'FRN-10';

-- Resorting Line  (green / right vertical annex) — anchor = 1736 m^2
update public.buildings
set bounds_x = 8600, bounds_y = 200, bounds_w = 1800, bounds_h = 9650
where code = 'RST-01';

-- Batch House  (purple / stand-alone, east of complex)
update public.buildings
set bounds_x = 11000, bounds_y = 4500, bounds_w = 2400, bounds_h = 1500
where code = 'BTH-03';
