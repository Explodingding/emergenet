-- =====================================================================
-- 0008 — Reposition all objects inside their building boundaries
-- =====================================================================
-- Previous migrations (0003–0007) moved buildings significantly, but
-- objects kept their original seed coordinates (outside the new bounds).
-- This migration places every object inside its building footprint.
--
-- Layout used (cm, from BUILDINGS_LAYOUT static file / migration 0007):
--
--   BTH-03  x=300,   y=4425, w=4000, h=1200   (40 m × 12 m)
--   FRN-20  x=9300,  y=200,  w=8200, h=4175   (82 m × 41.75 m)  — no objects yet
--   UTL-01  x=9300,  y=4375, w=8200, h=1300   (82 m × 13 m)
--   FRN-10  x=9300,  y=5675, w=8200, h=4175   (82 m × 41.75 m)
--   RST-01  x=17600, y=200,  w=1800, h=9650   (18 m × 96.5 m)   — no objects yet
--
-- Placement strategy:
--   • UTL-01 / BTH-03 (narrow strips) → single row, horizontally spaced
--   • FRN-10 (large hall) → two rows of 5, aligned to power-flow hierarchy
--
-- All positions are the CENTRE of the object (coord_x, coord_y).
-- Padding: 500 cm from walls for UTL/FRN, 400 cm for BTH.
-- =====================================================================

-- -----------------------------------------------------------------------
-- UTILITY BUILDING — UTL-01
-- Interior: x=[9800, 17000]  y_centre=5075
-- 9 objects in one row, ~900 cm step (≈ 9 m between centres)
-- Order: power entry → main distribution → feeders → loads → backup
-- -----------------------------------------------------------------------

UPDATE public.objects SET coord_x =  9900, coord_y = 5075 WHERE code = 'T-MAIN';
UPDATE public.objects SET coord_x = 10800, coord_y = 5075 WHERE code = 'SG-MAIN';
UPDATE public.objects SET coord_x = 11500, coord_y = 5075 WHERE code = 'MTR-MAIN';
UPDATE public.objects SET coord_x = 12400, coord_y = 5075 WHERE code = 'UDB-1';
UPDATE public.objects SET coord_x = 13300, coord_y = 5075 WHERE code = 'UDB-2';
UPDATE public.objects SET coord_x = 14200, coord_y = 5075 WHERE code = 'UC-PUMPS';
UPDATE public.objects SET coord_x = 15100, coord_y = 5075 WHERE code = 'UC-COMP';
UPDATE public.objects SET coord_x = 16000, coord_y = 5075 WHERE code = 'UC-HVAC';
UPDATE public.objects SET coord_x = 17000, coord_y = 5075 WHERE code = 'GEN-BACKUP';

-- -----------------------------------------------------------------------
-- FURNACE 10 — FRN-10  (former FRN-02)
-- Interior: x=[9900, 16900]  y=[6275, 9250]
-- 10 objects in 2 rows of 5, ~1400 cm horizontal step (≈ 14 m)
--
-- Row 1  y=7100 — power / distribution tier
-- Row 2  y=8600 — consumer / control tier
-- -----------------------------------------------------------------------

-- Row 1 — power / switchgear / distribution / control
UPDATE public.objects SET coord_x =  9900, coord_y = 7100 WHERE code = 'T-FURN';
UPDATE public.objects SET coord_x = 11300, coord_y = 7100 WHERE code = 'FSG';
UPDATE public.objects SET coord_x = 12700, coord_y = 7100 WHERE code = 'FDB-1';
UPDATE public.objects SET coord_x = 14100, coord_y = 7100 WHERE code = 'FDB-2';
UPDATE public.objects SET coord_x = 15500, coord_y = 7100 WHERE code = 'PLC-FURN';

-- Row 2 — consumers and UPS
UPDATE public.objects SET coord_x =  9900, coord_y = 8600 WHERE code = 'FC-HEAT-1';
UPDATE public.objects SET coord_x = 11300, coord_y = 8600 WHERE code = 'FC-HEAT-2';
UPDATE public.objects SET coord_x = 12700, coord_y = 8600 WHERE code = 'FC-CONV';
UPDATE public.objects SET coord_x = 14100, coord_y = 8600 WHERE code = 'UPS-CTRL';
UPDATE public.objects SET coord_x = 15500, coord_y = 8600 WHERE code = 'FC-EXH';

-- -----------------------------------------------------------------------
-- BATCH HOUSE — BTH-03
-- Interior: x=[700, 4000]  y_centre=5025
-- 5 objects in one row, ~825 cm step (≈ 8.25 m between centres)
-- Order: transformer → switchgear → distribution board → drives → silo
-- -----------------------------------------------------------------------

UPDATE public.objects SET coord_x =  700, coord_y = 5025 WHERE code = 'T-BATCH';
UPDATE public.objects SET coord_x = 1525, coord_y = 5025 WHERE code = 'BHSG';
UPDATE public.objects SET coord_x = 2350, coord_y = 5025 WHERE code = 'BHDB';
UPDATE public.objects SET coord_x = 3175, coord_y = 5025 WHERE code = 'BHC-MIX';
UPDATE public.objects SET coord_x = 4000, coord_y = 5025 WHERE code = 'BHC-SILO';
