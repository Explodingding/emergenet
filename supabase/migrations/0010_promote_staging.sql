-- Migration 0010: Promote staging objects to production
-- Adds missing buildings, floors, clears demo data and promotes staging_objects → objects.
-- NOTE: This migration was applied manually via Supabase MCP (execute_sql).
--       File is kept for version control / documentation purposes.

-- ─── 1. New buildings (placeholder bounds, to be positioned on map) ──────────
INSERT INTO public.buildings (code, name, description, bounds_x, bounds_y, bounds_w, bounds_h, accent_color, display_order)
VALUES
  ('DST-01', 'Distribution Building', 'Main MV/LV distribution building', 4500, 4375, 1200, 800, '#ef4444', 2),
  ('ADB-01', 'Administration Building', 'Administration and office building', 300, 200, 2000, 1500, '#8b5cf6', 3),
  ('LPG-01', 'LPG Building', 'LPG storage/distribution', 4500, 200, 800, 600, '#f97316', 8),
  ('GUH-01', 'Guardhouse', 'Guardhouse at plant entrance', 5400, 200, 600, 400, '#6b7280', 9),
  ('TRG-01', 'Truck Guard', 'Truck guard post', 6100, 200, 600, 400, '#6b7280', 11),
  ('CPK-01', 'Car Parking', 'Car parking area', 4500, 900, 2500, 2000, '#6b7280', 10)
ON CONFLICT (code) DO NOTHING;

-- ─── 2. Rename FRN-10 'Roof' floor → 'Level 9' ───────────────────────────────
UPDATE public.floors SET name = 'Level 9' WHERE name = 'Roof';

-- ─── 3. Add Ground floors for new buildings ───────────────────────────────────
INSERT INTO public.floors (building_id, level, name, elevation_m, is_visible_default)
SELECT b.id, 0, 'Ground', 0.0, true
FROM public.buildings b
WHERE b.code IN ('DST-01','ADB-01','LPG-01','GUH-01','TRG-01','CPK-01')
ON CONFLICT DO NOTHING;

-- ─── 4. Add Level 5 for FRN-10 ───────────────────────────────────────────────
INSERT INTO public.floors (building_id, level, name, elevation_m, is_visible_default)
SELECT b.id, 1, 'Level 5', 5.5, false FROM public.buildings b WHERE b.code = 'FRN-10'
ON CONFLICT DO NOTHING;

-- ─── 5. Add Level 5 + Level 9 for UTL-01 ─────────────────────────────────────
INSERT INTO public.floors (building_id, level, name, elevation_m, is_visible_default)
SELECT b.id, 2, 'Level 5', 5.5, false FROM public.buildings b WHERE b.code = 'UTL-01'
ON CONFLICT DO NOTHING;
INSERT INTO public.floors (building_id, level, name, elevation_m, is_visible_default)
SELECT b.id, 3, 'Level 9', 9.0, false FROM public.buildings b WHERE b.code = 'UTL-01'
ON CONFLICT DO NOTHING;

-- ─── 6. Add 6 upper levels for BTH-03 (Batch House, ~35 m tall) ──────────────
INSERT INTO public.floors (building_id, level, name, elevation_m, is_visible_default)
SELECT b.id, v.lvl, v.nm, v.elev, false
FROM public.buildings b
CROSS JOIN (VALUES
  (1,'Level 5',5.1),
  (2,'Level 12',12.0),
  (3,'Level 17',17.5),
  (4,'Level 22',22.8),
  (5,'Level 27',27.8),
  (6,'Level 32',32.5)
) AS v(lvl, nm, elev)
WHERE b.code = 'BTH-03'
ON CONFLICT DO NOTHING;

-- ─── 7. Clear demo objects ────────────────────────────────────────────────────
DELETE FROM public.objects;

-- ─── 8. Promote staging_objects → public.objects ─────────────────────────────
-- Objects without coordinates get (0,0) as placeholder; position them via UI later.
INSERT INTO public.objects (code, name, type_id, building_id, primary_floor_id, coord_x, coord_y, rotation, properties, is_active)
SELECT
  s.proposed_code,
  s.name,
  t.id,
  b.id,
  f.id,
  COALESCE(s.coord_x, 0),
  COALESCE(s.coord_y, 0),
  s.rotation,
  s.properties,
  true
FROM public.staging_objects s
JOIN public.buildings b ON b.code = s.building_code
JOIN public.floors f ON f.building_id = b.id AND f.name = s.floor_name
LEFT JOIN public.object_types t ON t.code = s.type_code
WHERE s.merge_into_tag IS NULL
  AND s.status NOT IN ('rejected');

-- ─── 9. Mark staging records as promoted ─────────────────────────────────────
UPDATE public.staging_objects s
SET status = 'merged', promoted_at = now(), promoted_object_id = o.id
FROM public.objects o
WHERE o.code = s.proposed_code
  AND s.merge_into_tag IS NULL
  AND s.status NOT IN ('rejected','merged');
