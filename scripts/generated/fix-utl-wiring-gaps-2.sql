-- =====================================================================
-- Second pass of UTL-01 wiring gaps, from re-examining the LV riser SLD
-- more precisely (exact text search on the block-exploded DXF, not just
-- the coarse geometric trace from before).
--
-- [HIGH CONFIDENCE] Read from tight coordinate clustering in the riser
-- drawing (all label positions within ~700 units of each other):
--   - UT-MCC.1 sits right next to UT-MDP/UT-DPG.1-3 (same y=287418/419)
--   - UT-COMP4-1 and UT-DRY4-1 sit right on top of TR-DP1.1's own
--     busbar cluster (the "FUR10" component from the earlier geometric
--     trace) -- these are UTL loads physically fed off Furnace 10's
--     TR-DP1.1 panel, a real cross-building feed (same pattern as
--     TR-WAREHOUSE/TR-BOOSTING-x.x already in the DB).
--   - UT-COMP7-2 and CHEMICAL TREATMENT cluster around a panel labeled
--     "F1-MCC.1" on the drawing -- which is exactly what F10-MCC-1's own
--     DB name says ("F1-MCC.1 (Furnace Area)"). Confirmed match, not a
--     guess.
-- =====================================================================

BEGIN;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='UT-MDP' AND t.code='UT-MCC.1' ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['UTL-COMP4-1', 'UTL-DRY4-1'])
WHERE s.code = 'TR-DP1.1'
ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['UTL-COMP7-2', 'UTL-CHEM-TREAT'])
WHERE s.code = 'F10-MCC-1'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE s.code IN ('UT-MDP', 'TR-DP1.1', 'F10-MCC-1')
  AND t.code IN ('UT-MCC.1', 'UTL-COMP4-1', 'UTL-DRY4-1', 'UTL-COMP7-2', 'UTL-CHEM-TREAT');
