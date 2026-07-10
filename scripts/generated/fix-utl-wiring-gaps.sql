-- =====================================================================
-- UTL-01 wiring audit against the real LV riser SLD
-- (CNRBE-PMEP18-AB-XXX-SMT-5250.pdf / .dxf).
--
-- [BUG FIX] TC2's chain was missing 3 edges that TC1/TC3/TC4 all have --
-- TC2-INPUT was a dead end (fed from UTL-FMCC but fed nothing further).
-- Likely dropped silently when wire-utl01-mv-backbone.sql first ran.
--
-- [GAP] MV-TR-SPARE (a third main-bus spare bay, distinct from
-- MV-SPARE-1/2) was never targeted by any earlier script.
--
-- [NEW, HIGH CONFIDENCE] Generator/UPS chain, read from the DXF
-- geometric trace done earlier this session:
--   - Each generator's "FROM GENERATOR-N" label + symbol orientation
--     confirms GENERATOR-1..4 (and GEN-BACKUP) feed INTO the
--     synchronization panel, not the other way round.
--   - SYNCHRONIZATION PANEL sits topmost in its riser column, with
--     UT-UPG.1 then UT-UDP below it -- standard generator -> sync ->
--     UPS-distribution flow.
--   - UT-UDP -> its two 60kVA UPS units -> each UPS's own battery rack
--     (modeled as 'backup_for', not 'feeds' -- a battery doesn't power
--     the UPS in normal operation, it backs it up when mains fails).
--
-- [NEW OBJECT] UT-MDP didn't exist in the DB at all -- created here so
-- UT-DPG.1/2/3 (Distribution Panel Generators 1/2/3, already geometrically
-- confirmed as one shared busbar in the DXF trace) have something to
-- attach to.
--
-- [LEFT UNWIRED -- flagging, not guessing]: UT-MCC.1, UTL-MCC-2,
-- UTL-COMP4-1, UTL-COMP7-2, UTL-DRY4-1, UTL-CHEM-TREAT, UTL-LP4,
-- UTL-OC-UDP, UTL-SAFETY-PANEL, UTL-UP -- no clear upstream in the
-- riser trace so far (the "Hold"-marked provisional section from
-- earlier, or simply not yet traced). "test tr" looks like debris, not
-- touched here either.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- [BUG FIX] Complete the TC2 chain to match TC1/TC3/TC4
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC2-INPUT' AND t.code='TC2-RING' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC2-RING' AND t.code='TC2-OUTPUT' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC2-RING' AND t.code='TC2-COMP-PANEL' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- [GAP] Third main-bus spare bay, missed earlier
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='UTL-FMCC' AND t.code='MV-TR-SPARE' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- [NEW OBJECT] UT-MDP -- Utility Building's own 400V Main Distribution
-- Panel, referenced by the SLD but never entered as a DB object.
-- ---------------------------------------------------------------------
INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES (
  gen_random_uuid(), 'UT-MDP', 'UTL Main Distribution Panel 400V/230V',
  'c92216bb-c77b-4f2b-8167-8f3817901d80', '68c6ef00-e9c8-4990-b249-3d6ab012e577',
  (SELECT id FROM floors WHERE building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80' AND name = 'Level 5 m'),
  true, 6750, 5850, 0, '{}'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['UT-DPG.1', 'UT-DPG.2', 'UT-DPG.3'])
WHERE s.code = 'UT-MDP'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- [NEW] Generator + UPS chain
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = 'SYNCHRONIZATION PANEL'
WHERE s.code = ANY(ARRAY['GENERATOR-1', 'GENERATOR-2', 'GENERATOR-3', 'GENERATOR-4', 'GEN-BACKUP'])
ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='SYNCHRONIZATION PANEL' AND t.code='UT-UPG.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='UT-UPG.1' AND t.code='UT-UDP' ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['UPS UDP1.1', 'UPS UDP1.2'])
WHERE s.code = 'UT-UDP'
ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='BATT-UPS1.1' AND t.code='UPS UDP1.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='BATT-UPS1.2' AND t.code='UPS UDP1.2' ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================================
-- Verify
-- =====================================================================
SELECT s.code AS source, t.code AS target, d.relation
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE s.code IN ('TC2-INPUT','TC2-RING','UTL-FMCC','UT-MDP','SYNCHRONIZATION PANEL','UT-UPG.1','UT-UDP','GENERATOR-1','GENERATOR-2','GENERATOR-3','GENERATOR-4','GEN-BACKUP')
   OR t.code IN ('BATT-UPS1.1','BATT-UPS1.2')
ORDER BY s.code, t.code;
