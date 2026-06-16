-- =====================================================================
-- 0004 — Realistic plant layout v2 (from annotated top-down image)
-- =====================================================================
-- Layout (coordinates in cm, top-left origin, Y down):
--
--   +------------------------+----+
--   |   Furnace 20 (yellow)  | R  |
--   |                        | E  |
--   +------------------------+ S  |   <- Resorting Line
--   |   Utility Building     | O  |      (green, vertical annex)
--   +------------------------+ R  |
--   |                        | T  |
--   |   Furnace 10 (blue)    |    |
--   |                        |    |
--   +------------------------+----+
--
-- Site footprint: ~205 m x 200 m
-- Batch House: separate building, moved to the south-east as a free-standing block.
-- Existing objects keep their (cm) positions — they will need to be re-placed.
-- =====================================================================

-- Furnace 20 (top block — yellow)
update public.buildings
set
  bounds_x = 500,
  bounds_y = 300,
  bounds_w = 16400,
  bounds_h = 6800,
  accent_color = '#f59e0b',
  display_order = 1,
  description = 'Glass furnace 20 — melting + working ends'
where code = 'FRN-20';

-- Utility Building (middle long band — red)
update public.buildings
set
  bounds_x = 500,
  bounds_y = 7700,
  bounds_w = 16400,
  bounds_h = 2700,
  accent_color = '#ef4444',
  display_order = 2,
  description = 'Main MV/LV step-down, transformers, MCCs and service utilities'
where code = 'UTL-01';

-- Furnace 10 (bottom block — blue, slightly taller than F20)
update public.buildings
set
  bounds_x = 500,
  bounds_y = 10800,
  bounds_w = 16400,
  bounds_h = 9000,
  accent_color = '#3b82f6',
  display_order = 3,
  description = 'Glass furnace 10 — melting + working ends'
where code = 'FRN-10';

-- Resorting Line (right vertical annex — green) — NEW
insert into public.buildings
  (code, name, description, bounds_x, bounds_y, bounds_w, bounds_h, accent_color, display_order)
values
  ('RST-01', 'Resorting Line',
   'Glass resorting / sorting and quality inspection line',
   17000, 300, 3500, 19500,
   '#10b981', 4);

insert into public.floors (building_id, level, name, elevation_m)
select id, 0, 'Ground', 0.0 from public.buildings where code = 'RST-01';

-- Batch House (free-standing, south-east of main complex) — visual offset
update public.buildings
set
  bounds_x = 22000,
  bounds_y = 21500,
  bounds_w = 2400,
  bounds_h = 1500,
  accent_color = '#a855f7',
  display_order = 5,
  description = 'Stand-alone batch house: raw material storage, weighing, silo feeders'
where code = 'BTH-03';
