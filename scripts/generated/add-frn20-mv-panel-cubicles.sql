-- =====================================================================
-- Furnace 20 Main MV Panel — individual feeder breaker cubicles.
-- Same pattern as add-frn10-mv-panel-cubicles.sql.
--
-- Source: real MV panel elevation ("Fur 20 Main MV Panel", drawing refs
-- 66-15-014d/e/f), read left to right. MV-FRN20-INPUT (already in the
-- DB, in UTL-01) is column 1. This adds the 11 outgoing feeder breakers
-- (columns 2-12) and wires MV-FRN20-INPUT -> each -> its transformer.
--
-- Unlike Furnace 10's panel, this one has no separate "TR SPARE" bay
-- and no "WAREHOUSE" feeder — matches exactly what's drawn (11 feeders,
-- not 14 like FRN10). TR-BOOSTING-2.1..4 physically sit in FRN-20;
-- TR2.1/2.2/2.3/TR-COMP-3/TR-COMP-4 sit in UTL-01 — same building split
-- as the Furnace 10 case.
--
-- All new breakers placed in UTL-01, in a row starting from
-- MV-FRN20-INPUT's existing position (5722, 5339 -> realigned to
-- y=5332 to match the other MV rows), 25cm spacing.
-- =====================================================================

BEGIN;

UPDATE objects SET coord_y = 5332 WHERE code = 'MV-FRN20-INPUT';

INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES
  (gen_random_uuid(), 'MV-TR2.1',         'MV Feeder Breaker - TR2.1 (800A)',            'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5747, 5332, 0, '{"drawing_ref": "66-15-014f-13"}'),
  (gen_random_uuid(), 'MV-TR2.2',         'MV Feeder Breaker - TR2.2 (800A)',            'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5772, 5332, 0, '{"drawing_ref": "66-15-014f-14"}'),
  (gen_random_uuid(), 'MV-TR2.3',         'MV Feeder Breaker - TR2.3 (800A)',            'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5797, 5332, 0, '{"drawing_ref": "66-15-014f-15"}'),
  (gen_random_uuid(), 'MV-TR-COMP-4',     'MV Feeder Breaker - TR Compressor 4 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5822, 5332, 0, '{"drawing_ref": "66-15-014f-16"}'),
  (gen_random_uuid(), 'MV-BOOSTING-2.1',  'MV Feeder Breaker - TR Boosting 2.1 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5847, 5332, 0, '{"drawing_ref": "66-15-014f-17"}'),
  (gen_random_uuid(), 'MV-BOOSTING-2.2',  'MV Feeder Breaker - TR Boosting 2.2 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5872, 5332, 0, '{"drawing_ref": "66-15-014f-18"}'),
  (gen_random_uuid(), 'MV-BOOSTING-2.3',  'MV Feeder Breaker - TR Boosting 2.3 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5897, 5332, 0, '{"drawing_ref": "66-15-014f-19"}'),
  (gen_random_uuid(), 'MV-BOOSTING-2.4',  'MV Feeder Breaker - TR Boosting 2.4 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5922, 5332, 0, '{"drawing_ref": "66-15-014f-20"}'),
  (gen_random_uuid(), 'MV-RING-20-10',    'MV Bus Tie - Ring 20/10 (1250A)',             'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5947, 5332, 0, '{"drawing_ref": "66-15-014e-2"}'),
  (gen_random_uuid(), 'MV-TR-COMP-3',     'MV Feeder Breaker - TR Compressor 3 (800A)',  'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5972, 5332, 0, '{"drawing_ref": "66-15-014e-3"}'),
  (gen_random_uuid(), 'MV-SPARE-F20',     'MV Feeder Breaker - Spare/Unused (1250A)',    'c92216bb-c77b-4f2b-8167-8f3817901d80', '433486b6-b661-48e4-89fe-cbe20aba8765', '13a9ce11-f532-404f-9974-de85955dc0ba', true, 5997, 5332, 0, '{"drawing_ref": "66-15-014d-4"}')
ON CONFLICT (code) DO NOTHING;

-- MV-FRN20-INPUT -> each new breaker
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'MV-TR2.1', 'MV-TR2.2', 'MV-TR2.3', 'MV-TR-COMP-4',
  'MV-BOOSTING-2.1', 'MV-BOOSTING-2.2', 'MV-BOOSTING-2.3', 'MV-BOOSTING-2.4',
  'MV-RING-20-10', 'MV-TR-COMP-3', 'MV-SPARE-F20'
])
WHERE s.code = 'MV-FRN20-INPUT'
ON CONFLICT DO NOTHING;

-- Each breaker -> its transformer
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR2.1' AND t.code='TR2.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR2.2' AND t.code='TR2.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR2.3' AND t.code='TR2.3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-COMP-4' AND t.code='TR-COMP-4' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-BOOSTING-2.1' AND t.code='TR-BOOSTING-2.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-BOOSTING-2.2' AND t.code='TR-BOOSTING-2.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-BOOSTING-2.3' AND t.code='TR-BOOSTING-2.3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-BOOSTING-2.4' AND t.code='TR-BOOSTING-2.4' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='MV-TR-COMP-3' AND t.code='TR-COMP-3' ON CONFLICT DO NOTHING;

-- MV-RING-20-10 and MV-SPARE-F20 have no transformer target (bus tie /
-- unused position) -- left as leaf nodes on purpose.

COMMIT;

-- Verify
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE s.code = 'MV-FRN20-INPUT' OR s.code LIKE 'MV-TR2%' OR s.code LIKE 'MV-BOOSTING-2%' OR s.code LIKE 'MV-RING-20%' OR s.code = 'MV-TR-COMP-3' OR s.code = 'MV-TR-COMP-4' OR s.code = 'MV-SPARE-F20'
ORDER BY s.code, t.code;
