-- =====================================================================
-- Furnace 10 Main MV Panel — individual feeder breaker cubicles.
--
-- Source: real MV panel elevation ("Fur 10 Main MV Panel", drawing refs
-- 66-15-014d/e/f), read left to right. MV-FRN10-INPUT (already in the
-- DB, in UTL-01) is column 1 — the incoming/metering cubicle. This
-- script adds the 14 outgoing feeder breakers (columns 2-15), each
-- representing the physical VCB-3AH5 breaker cubicle for one
-- downstream transformer/tie, and wires:
--   MV-FRN10-INPUT -> each new breaker -> its transformer (where one exists)
--
-- All placed in UTL-01 alongside MV-FRN10-INPUT (same physical MV
-- switchroom — the "Furnace 10 Input" bus section lives in Utility
-- Building even though some of the transformers it feeds are
-- physically located over in FRN-10 or elsewhere).
--
-- [OPEN QUESTION] MV-WAREHOUSE-F10 is wired to TR-WAREHOUSE below as the
-- best-guess target, per the earlier flagged ambiguity around
-- MV-WH-INPUT vs this cubicle — confirm this is the right transformer
-- before trusting that one edge; everything else here is a direct 1:1
-- read off the panel.
-- =====================================================================

BEGIN;

INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES
  (gen_random_uuid(), 'MV-TR1.1',            'MV Feeder Breaker - TR1.1 (800A)',            'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 6378, 5450, 0, '{"drawing_ref": "66-15-014f-1"}'),
  (gen_random_uuid(), 'MV-TR1.2',            'MV Feeder Breaker - TR1.2 (800A)',            'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 6468, 5450, 0, '{"drawing_ref": "66-15-014f-2"}'),
  (gen_random_uuid(), 'MV-TR1.3',            'MV Feeder Breaker - TR1.3 (800A)',            'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 6558, 5450, 0, '{"drawing_ref": "66-15-014f-3"}'),
  (gen_random_uuid(), 'MV-TR-SPARE-F10',     'MV Feeder Breaker - Spare Transformer Bay (800A)', 'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 6648, 5450, 0, '{"drawing_ref": "66-15-014f-4"}'),
  (gen_random_uuid(), 'MV-TR-COMP-1',        'MV Feeder Breaker - TR Compressor 1 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 6738, 5450, 0, '{"drawing_ref": "66-15-014f-5"}'),
  (gen_random_uuid(), 'MV-TR-COMP-2',        'MV Feeder Breaker - TR Compressor 2 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 6828, 5450, 0, '{"drawing_ref": "66-15-014f-6"}'),
  (gen_random_uuid(), 'MV-TR-COMP-LV',       'MV Feeder Breaker - TR Compressor LV (800A)', 'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 6918, 5450, 0, '{"drawing_ref": "66-15-014f-7"}'),
  (gen_random_uuid(), 'MV-TR-BOOSTING-1.1',  'MV Feeder Breaker - TR Boosting 1.1 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 7008, 5450, 0, '{"drawing_ref": "66-15-014f-8"}'),
  (gen_random_uuid(), 'MV-TR-BOOSTING-1.2',  'MV Feeder Breaker - TR Boosting 1.2 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 7098, 5450, 0, '{"drawing_ref": "66-15-014f-9"}'),
  (gen_random_uuid(), 'MV-TR-BOOSTING-1.3',  'MV Feeder Breaker - TR Boosting 1.3 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 7188, 5450, 0, '{"drawing_ref": "66-15-014f-10"}'),
  (gen_random_uuid(), 'MV-TR-BOOSTING-1.4',  'MV Feeder Breaker - TR Boosting 1.4 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 7278, 5450, 0, '{"drawing_ref": "66-15-014f-11"}'),
  (gen_random_uuid(), 'MV-RING-10-20',       'MV Bus Tie - Ring 10/20 (1250A)',             'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 7368, 5450, 0, '{"drawing_ref": "66-15-014e-1"}'),
  (gen_random_uuid(), 'MV-WAREHOUSE-F10',    'MV Feeder Breaker - Warehouse (800A)',        'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 7458, 5450, 0, '{"drawing_ref": "66-15-014f-12"}'),
  (gen_random_uuid(), 'MV-SPARE-F10',        'MV Feeder Breaker - Spare/Unused (1250A)',    'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 7548, 5450, 0, '{"drawing_ref": "66-15-014d-13"}')
ON CONFLICT (code) DO NOTHING;

-- MV-FRN10-INPUT -> each new breaker
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'MV-TR1.1', 'MV-TR1.2', 'MV-TR1.3', 'MV-TR-SPARE-F10',
  'MV-TR-COMP-1', 'MV-TR-COMP-2', 'MV-TR-COMP-LV',
  'MV-TR-BOOSTING-1.1', 'MV-TR-BOOSTING-1.2', 'MV-TR-BOOSTING-1.3', 'MV-TR-BOOSTING-1.4',
  'MV-RING-10-20', 'MV-WAREHOUSE-F10', 'MV-SPARE-F10'
])
WHERE s.code = 'MV-FRN10-INPUT'
ON CONFLICT DO NOTHING;

-- Each breaker -> its transformer (direct 1:1 reads off the panel)
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR1.1' AND t.code='TR1.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR1.2' AND t.code='TR1.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR1.3' AND t.code='TR1.3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-COMP-1' AND t.code='TR-COMP-1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-COMP-2' AND t.code='TR-COMP-2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-COMP-LV' AND t.code='TR-COMP-LV' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-BOOSTING-1.1' AND t.code='TR-BOOSTING-1.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-BOOSTING-1.2' AND t.code='TR-BOOSTING-1.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-BOOSTING-1.3' AND t.code='TR-BOOSTING-1.3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-BOOSTING-1.4' AND t.code='TR-BOOSTING-1.4' ON CONFLICT DO NOTHING;

-- [OPEN QUESTION -- see header] best-guess target, confirm before trusting
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-WAREHOUSE-F10' AND t.code='TR-WAREHOUSE' ON CONFLICT DO NOTHING;

-- MV-TR-SPARE-F10, MV-RING-10-20, MV-SPARE-F10 have no transformer target
-- (spare bay / bus tie / unused position) -- left as leaf nodes on purpose.

COMMIT;

-- Verify
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE s.code = 'MV-FRN10-INPUT' OR s.code LIKE 'MV-TR%' OR s.code LIKE 'MV-RING%' OR s.code LIKE 'MV-WAREHOUSE%' OR s.code LIKE 'MV-SPARE%'
ORDER BY s.code, t.code;
