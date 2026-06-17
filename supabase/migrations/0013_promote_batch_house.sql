-- Migration 0013: Promote Batch House staging objects → objects
-- Promotes all 955 BTH-03 items from staging_objects (status='draft')
-- into the live objects table. Floors for BTH-03 already exist from 0010.
-- Objects that already have a code in objects are updated (upsert via code).

-- ─── 1. Insert new objects from staging ──────────────────────────────────────
-- Uses INSERT ... ON CONFLICT (code) DO UPDATE to safely re-run.
-- Add process_equipment type if missing (covers ~289 unresolved Batch House tags)
INSERT INTO public.object_types (code, label, category, icon, default_color, default_size, description)
VALUES ('process_equipment','Process Equipment','consumer','Package','#6b7280',60,'Generic process equipment (type to be confirmed)')
ON CONFLICT (code) DO NOTHING;

-- Promote staging → objects; DISTINCT ON resolves 9 duplicate proposed_codes
INSERT INTO public.objects (
  code, name, type_id, building_id, primary_floor_id,
  coord_x, coord_y, rotation, properties, is_active
)
SELECT DISTINCT ON (s.proposed_code)
  s.proposed_code,
  s.name,
  t.id,
  b.id,
  f.id,
  COALESCE(s.coord_x, 0),
  COALESCE(s.coord_y, 0),
  COALESCE(s.rotation, 0),
  s.properties,
  true
FROM public.staging_objects s
JOIN  public.buildings     b ON b.code = s.building_code
JOIN  public.floors        f ON f.building_id = b.id AND f.name = s.floor_name
JOIN  public.object_types  t ON t.code = s.type_code
WHERE s.building_code = 'BTH-03'
  AND s.status = 'draft'
  AND s.merge_into_tag IS NULL
ORDER BY s.proposed_code, s.tag
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  type_id          = EXCLUDED.type_id,
  building_id      = EXCLUDED.building_id,
  primary_floor_id = EXCLUDED.primary_floor_id,
  properties       = EXCLUDED.properties,
  is_active        = true;

-- ─── 2. Mark staging records as promoted ─────────────────────────────────────
UPDATE public.staging_objects s
SET
  status             = 'merged',
  promoted_at        = now(),
  promoted_object_id = o.id
FROM public.objects o
WHERE o.code = s.proposed_code
  AND s.building_code  = 'BTH-03'
  AND s.status         = 'draft'
  AND s.merge_into_tag IS NULL;
