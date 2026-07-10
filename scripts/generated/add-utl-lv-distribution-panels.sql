-- =====================================================================
-- Utility Building 400V distribution panels (Level 5m), from the real
-- TR-DP1.3 panel elevation drawing.
--
-- SCOPE NOTE: only TR-DP1.3 has a real drawing to read loads from. The
-- SAME six-panel structure ("TR-DP1.1/1.2/1.3/2.1/2.2/2.3, each with a
-- PFC filter") was mentioned for all of TR1.1/1.2/1.3/2.1/2.2/2.3, but:
--   - TR1.1's panel (TR-DP1.1) and its sub-panels already exist and are
--     already wired (from an earlier script) -- just missing its PFC link.
--   - TR1.2's panel (UTL-TRDP-1.2) and PFC (UTL-PFC-1.2) exist as objects
--     but were never wired or positioned correctly.
--   - TR1.3's panel is the one with the real drawing -- full load list below.
--   - TR2.1/2.2/2.3 have NO panel objects in the DB at all yet -- Furnace 20
--     is still under construction (per earlier scope decision), so none
--     created here. Say the word if you want placeholders started anyway.
--
-- Also fixes: UTL-TRDP-1.2/1.3, UTL-PFC-1/1.2/1.3, UTL-COMP7-1 were all
-- positioned between x=10587 and x=16213 -- outside UTL-01's actual
-- bounds (x:5559-10753). Repositioned into a new row inside the building,
-- below the MV panel rows (y=5700, 150cm spacing).
--
-- GUH-DP-UP, TRG-DP-UP1, DST-DP-UP, LPG-DP stay in their own buildings
-- (Guardhouse/Truck Guard/Distribution/LPG) -- only the 'feeds' edge
-- crosses buildings, matching how TR-WAREHOUSE/TR-BOOSTING-x.x are
-- already modeled (load stays put, feed comes from wherever it really
-- comes from).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Reposition existing but mis-placed objects into UTL-01's real bounds
-- ---------------------------------------------------------------------
UPDATE objects SET coord_x = 5700, coord_y = 5700 WHERE code = 'UTL-PFC-1';
UPDATE objects SET coord_x = 5850, coord_y = 5700 WHERE code = 'UTL-TRDP-1.2';
UPDATE objects SET coord_x = 6000, coord_y = 5700 WHERE code = 'UTL-PFC-1.2';
UPDATE objects SET coord_x = 6150, coord_y = 5700 WHERE code = 'UTL-TRDP-1.3';
UPDATE objects SET coord_x = 6300, coord_y = 5700 WHERE code = 'UTL-PFC-1.3';
UPDATE objects SET coord_x = 6450, coord_y = 5700 WHERE code = 'UTL-COMP7-1';

-- ---------------------------------------------------------------------
-- New object: EV Charging station (150kW), the one load on the TR-DP1.3
-- panel with no existing match
-- ---------------------------------------------------------------------
INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES (
  gen_random_uuid(), 'UTL-EV-CHG', 'EV Car Charging Station (150kW)',
  'c92216bb-c77b-4f2b-8167-8f3817901d80', '507c9286-6f09-4128-9442-07abcf8f3d75',
  (SELECT id FROM floors WHERE building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80' AND name = 'Level 5 m'),
  true, 6600, 5700, 0, '{"rated_kw": 150}'
)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- TR1.1's panel: already wired to TR1.1 and its own sub-panels -- just
-- missing the PFC filter link.
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TR-DP1.1' AND t.code='UTL-PFC-1' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- TR1.2's panel: wire from TR1.2, add its PFC filter
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TR1.2' AND t.code='UTL-TRDP-1.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='UTL-TRDP-1.2' AND t.code='UTL-PFC-1.2' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- TR1.3's panel: full load list read off the real drawing
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TR1.3' AND t.code='UTL-TRDP-1.3' ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'GUH-DP-UP', 'TRG-DP-UP1', 'DST-DP-UP', 'LPG-DP',
  'UTL-COMP7-1', 'UTL-PFC-1.3', 'UTL-EV-CHG'
])
WHERE s.code = 'UTL-TRDP-1.3'
ON CONFLICT DO NOTHING;

-- Bus tie to the generator synchronization panel (seen as "COUPLING TO
-- SYNCHRONIZATION" on the drawing) -- modeled the same way as the MV
-- ring ties: a 'feeds' edge to a leaf, not extended further.
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='UTL-TRDP-1.3' AND t.code='SYNCHRONIZATION PANEL' ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================================
-- Verify
-- =====================================================================
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE s.code IN ('TR-DP1.1', 'TR1.2', 'UTL-TRDP-1.2', 'TR1.3', 'UTL-TRDP-1.3')
ORDER BY s.code, t.code;
