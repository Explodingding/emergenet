-- =====================================================================
-- Batch House (BTH-03) internal distribution backbone.
--
-- Context: BTH-03 has 555 objects but only 5 had any 'feeds' edge before
-- this script — a partial chain (T-BATCH -> BHSG -> BHDB -> BHC-MIX/SILO)
-- already existed, but 15 panel objects (BTH-MDP, BTH-UDP, BTH-UP1,
-- BTH-COMMAND-PANEL, BTH-LAHTI-MCC01..05, BTH-DP1..7) were completely
-- disconnected — no parent, no children.
--
-- This wires the panel-to-panel backbone ONLY (matching the established
-- depth convention already used for FRN-10/UTL-01: F10-MCC-1 feeds other
-- panels/cabinets, never individual motors — BHC-MIX/BHC-SILO likewise
-- feed nothing further today). Individual equipment (conveyors, dosing
-- screws, mixers, etc.) stays unwired at this pass; see chat for the
-- follow-up decision on going deeper.
--
-- Confidence:
--   [HIGH]   BTH-MDP is literally named "Batch House Main Distribution
--            Panel" (BTH-MDP object name); BHSG is the only switchgear
--            in the building and already feeds BHDB as a sibling branch,
--            so BHSG -> BTH-MDP is the only structurally consistent link.
--   [INFER]  BTH-MDP -> the 14 remaining orphaned panels. These are the
--            only BTH-03 panel objects with no other candidate parent in
--            the DB, and "Main Distribution Panel" is definitionally the
--            single upstream source for a building's sub-panels/MCCs.
--            Confirm/adjust if a real BTH SLD becomes available.
-- =====================================================================

-- [HIGH] Switchgear -> Main Distribution Panel (parallel branch to BHDB)
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s, objects t
WHERE s.code = 'BHSG' AND t.code = 'BTH-MDP'
ON CONFLICT DO NOTHING;

-- [INFER] Main Distribution Panel -> all orphaned BTH-03 panels/MCCs
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'BTH-UDP', 'BTH-UP1', 'BTH-COMMAND-PANEL',
  'BTH-LAHTI-MCC01', 'BTH-LAHTI-MCC02', 'BTH-LAHTI-MCC03', 'BTH-LAHTI-MCC04', 'BTH-LAHTI-MCC05',
  'BTH-DP1', 'BTH-DP2', 'BTH-DP3', 'BTH-DP4', 'BTH-DP5', 'BTH-DP6', 'BTH-DP7'
])
WHERE s.code = 'BTH-MDP'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- Verify: full BTH-03 panel-level chain after this script
-- =====================================================================
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE d.relation = 'feeds'
  AND (s.building_id = '2de1ab67-96b7-4641-a8e9-ed296418ccae' OR t.building_id = '2de1ab67-96b7-4641-a8e9-ed296418ccae')
ORDER BY s.code, t.code;
