-- =====================================================================
-- 0007 — Reposition Batch House: 50 m west of Utility (40 m x 12 m)
-- =====================================================================
-- New Batch House size: 40 x 12 m (4000 x 1200 cm) ≈ 480 m^2
-- "50 m to the left of Utility" => 5000 cm gap.
-- Negative coordinates would result if we keep the main complex anchored
-- at x=300, so we SHIFT the whole main block by +9000 cm to the right and
-- place Batch House on the left.
--
-- New layout (cm):
--    x=300              4300  +5000  9300              17500  17600 ─ 19400
--    +-Batch House-+         +-Furnace 20-----+   +-Resorting-+
--    | 40 x 12 m   |         | 82 x 41.75 m   |   | 18 x 96.5 |
--    | 480 m^2     |         +-Utility--------+   |  1736 m^2 |
--    +-------------+         | 82 x 13 m      |   |           |
--      (aligned to Utility)  +-Furnace 10-----+   |           |
--                            | 82 x 41.75 m   |   |           |
--                            +----------------+   +-----------+
-- =====================================================================

-- Batch House — moved to the LEFT of main complex, vertically centered on Utility band
update public.buildings
set bounds_x = 300, bounds_y = 4425, bounds_w = 4000, bounds_h = 1200
where code = 'BTH-03';

-- Shift main complex +9000 cm to the right
update public.buildings set bounds_x = 9300 where code in ('FRN-20', 'UTL-01', 'FRN-10');

-- Resorting Line moves with the main complex
update public.buildings set bounds_x = 17600 where code = 'RST-01';
