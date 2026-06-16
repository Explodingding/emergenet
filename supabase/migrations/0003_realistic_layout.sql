-- =====================================================================
-- 0003 — Realistic building layout from Cinerglass plant drawing v5.5
-- =====================================================================
-- Source: Cinerglass Electrical Panel Locations - Model 5.5.pdf (top-down view)
-- Total site footprint: ~280 m x 120 m
-- Renames "Furnace Area" -> "Furnace 10", adds "Furnace 20", repositions Utility & Batch House.
-- Object positions (cabinets/transformers) are NOT moved here — that comes later.
--
-- NOTE: Existing objects keep their old coord_x/coord_y values. They will likely
-- appear OUTSIDE the new building outlines until we reposition them.
-- =====================================================================

-- Furnace 10 (was "Furnace Area" / FRN-02)
update public.buildings
set
  code = 'FRN-10',
  name = 'Furnace 10',
  description = 'Glass furnace 10 — melting + working ends',
  bounds_x = 1500,
  bounds_y = 4500,
  bounds_w = 6500,
  bounds_h = 4500,
  display_order = 2
where code = 'FRN-02';

-- Utility Building (UTL-01) — repositioned, shares east edge of Furnace 10
update public.buildings
set
  description = 'Main MV/LV step-down, switchgear and support utilities',
  bounds_x = 8200,
  bounds_y = 3500,
  bounds_w = 4000,
  bounds_h = 4000,
  display_order = 1
where code = 'UTL-01';

-- Batch House (BTH-03) — much smaller, south of Furnace 20
update public.buildings
set
  description = 'Raw material batching & silo feeders',
  bounds_x = 21500,
  bounds_y = 9500,
  bounds_w = 1800,
  bounds_h = 1200,
  display_order = 4
where code = 'BTH-03';

-- Furnace 20 — new building (twin of Furnace 10, far east)
insert into public.buildings
  (code, name, description, bounds_x, bounds_y, bounds_w, bounds_h, accent_color, display_order)
values
  ('FRN-20', 'Furnace 20', 'Glass furnace 20 — melting + working ends',
   20500, 4500, 6500, 4500, '#f97316', 3);

-- Add a ground floor for Furnace 20 so future objects can be assigned
insert into public.floors (building_id, level, name, elevation_m)
select id, 0, 'Ground', 0.0
from public.buildings where code = 'FRN-20';
