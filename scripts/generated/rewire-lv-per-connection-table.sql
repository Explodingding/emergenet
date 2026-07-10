-- =====================================================================
-- Full LV rewiring per the authoritative connection table
-- 'Beschrijving Single Line LV.xlsx' (P:\public\Utilities E\Single lines),
-- which enumerates Van/Naar (from/to) per panel for the whole LV riser
-- (CNRBE-PMEP18-AB-XXX-SMT-5250).
--
-- KEY CORRECTIONS vs current DB:
--   * F10-GEN-DP is NOT the F10 master hub. Per the table, F1-MDP-1..4,7
--     hang from TR-DP1.1; F1-UO-DP/F1-GEN-DP/BH-MDP/F1-MDP-8/F1-MZ-DP/
--     HOT-10/F1-MCC.1 from TR-DP1.2; F1-MDP-9/F1-HOT-DP/F1-COLD-DP/
--     MHO-10/AD-MDP from TR-DP1.3; F1-MDP-5/6 and the fan panels from
--     F1-MDP-9. F1-GEN-DP itself is just a sub-panel of TR-DP1.2.
--   * F10-MCC-1 wrongly fed 12 panels (HP-1..4, DP1-3/5/6, AUP, GEN-UP,
--     FCP10.2, LAHTI-MCC-06/07) that belong to other parents.
--   * UT-MDP is fed from TR-DP2.2 (Furnace 20 side!) -- TR-DP2.2 created
--     here minimally (TR2.2 transformer already exists).
--   * UT-UDP is fed from UT-MDP, not from UT-UPG.1.
--   * BH-MDP (BTH-MDP) is fed from TR-DP1.2 -- BHSG/T-BATCH chain looks
--     like legacy seed data, its feed edge removed (objects left alone).
--   * Couplings/spare-transformer paths modeled as 'backup_for' (new:
--     TR-DPS spare-transformer panel + sync-panel couplings), answering
--     'is there anything besides feeds/backup': DB also has 'controls'
--     and 'monitors' (and the app supports 'synchronizes').
--
-- SUPERSEDES scripts/generated/fix-utl-wiring-gaps-2.sql -- do NOT run
-- that one: its F10-MCC-1 -> UTL-COMP7-2/UTL-CHEM-TREAT guess was wrong
-- (table: TR-DP1.2 feeds them); its correct rows are included here.
--
-- DEFERRED: the entire F2/F20 right-hand side of the table (Furnace 20
-- still under construction) except the single TR2.2->TR-DP2.2->UT-MDP
-- chain needed to give UT-MDP its real upstream.
-- NOT MODELED (no DB objects): PV arrays (1250/1500kW) and the 900/1600
-- kVA UPS units on F1-MDP-8/9; TR-DPC's unnamed 3.2/7-BAR compressors;
-- 'F10 schoorsteen filtersysteem'; BH GAS-UP (ambiguous vs F10-GAS-UP).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- New objects: TR-DPC (compressor LV panel), TR-DPS (spare-transformer
-- panel), UTL-TEST-PANEL (feeds EQP.1-4), all in UTL-01 Level 5m; and
-- TR-DP2.2 in FRN-20 (minimal placeholder, Furnace 20 scope deferred).
-- ---------------------------------------------------------------------
INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES (gen_random_uuid(), 'TR-DPC', 'TR-DPC Compressor LV Distribution Panel 400V/230V',
  'c92216bb-c77b-4f2b-8167-8f3817901d80', '68c6ef00-e9c8-4990-b249-3d6ab012e577',
  (SELECT id FROM floors WHERE building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80' AND name = 'Level 5 m'),
  true, 6900, 5850, 0, '{}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES (gen_random_uuid(), 'TR-DPS', 'TR-DPS Spare Transformer Distribution Panel 400V/230V',
  'c92216bb-c77b-4f2b-8167-8f3817901d80', '68c6ef00-e9c8-4990-b249-3d6ab012e577',
  (SELECT id FROM floors WHERE building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80' AND name = 'Level 5 m'),
  true, 7050, 5850, 0, '{}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES (gen_random_uuid(), 'UTL-TEST-PANEL', 'Test Panel (EQP.1-4)',
  'c92216bb-c77b-4f2b-8167-8f3817901d80', '68c6ef00-e9c8-4990-b249-3d6ab012e577',
  (SELECT id FROM floors WHERE building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80' AND name = 'Level 5 m'),
  true, 7200, 5850, 0, '{}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES (gen_random_uuid(), 'TR-DP2.2', 'TR-DP2.2 Distribution Panel 400V/230V (Furnace 20)',
  (SELECT id FROM buildings WHERE code = 'FRN-20'), '68c6ef00-e9c8-4990-b249-3d6ab012e577',
  (SELECT id FROM floors WHERE building_id = (SELECT id FROM buildings WHERE code = 'FRN-20') LIMIT 1),
  true, 0, 0, 0, '{}')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- Remove edges contradicted by the table
-- ---------------------------------------------------------------------
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-DPG1';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-DPG2';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-FP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-FU-MCC';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-HOT10';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MCC-1';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-1';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-2';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-3';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-4';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-5';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-6';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-7';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-8';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MDP-9';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-MZ-DP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-OTHER-OUTLETS';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-UO-DP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-UP1-1';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-COLD-DP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-GEN-UP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-GEN-DP' AND t.code='F10-HOT-DP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-AUP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-DP1-3';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-DP1-5';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-DP1-6';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-FCP10.2';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-GEN-UP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-HP-1';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-HP-2';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-HP-3';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-HP-4';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-LAHTI-MCC-06';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='F10-MCC-1' AND t.code='F10-LAHTI-MCC-07';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='TR1.2' AND t.code='F10-GEN-DP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='UT-UPG.1' AND t.code='UT-UDP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='BHSG' AND t.code='BTH-MDP';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='BTH-MDP' AND t.code='BTH-UP1';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='BTH-MDP' AND t.code='BTH-COMMAND-PANEL';
DELETE FROM dependencies d USING objects s, objects t
  WHERE d.source_id=s.id AND d.target_id=t.id AND d.relation='feeds' AND s.code='UTL-TRDP-1.3' AND t.code='SYNCHRONIZATION PANEL';

-- ---------------------------------------------------------------------
-- Correct 'feeds' edges (one INSERT per source group)
-- ---------------------------------------------------------------------
-- TR-DP1.1 -> 10 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-MDP-1', 'F10-MDP-2', 'F10-MDP-3', 'F10-MDP-4', 'F10-MDP-7', 'F10-FH10-DIST', 'F10-CHILLER-1', 'F10-CHILLER-2', 'UTL-COMP4-1', 'UTL-DRY4-1'])
WHERE s.code = 'TR-DP1.1' ON CONFLICT DO NOTHING;

-- UTL-TRDP-1.2 -> 10 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-UO-DP', 'F10-GEN-DP', 'BTH-MDP', 'F10-MDP-8', 'F10-MZ-DP', 'F10-HOT10', 'UTL-CHEM-TREAT', 'F10-MCC-1', 'UTL-COMP7-2', 'UTL-SAFETY-PANEL'])
WHERE s.code = 'UTL-TRDP-1.2' ON CONFLICT DO NOTHING;

-- UTL-TRDP-1.3 -> 6 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['ADB-MDP', 'F10-MDP-9', 'F10-HOT-DP', 'F10-COLD-DP', 'F10-MHO-10', 'UTL-TEST-PANEL'])
WHERE s.code = 'UTL-TRDP-1.3' ON CONFLICT DO NOTHING;

-- F10-MDP-9 -> 27 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-TWP-10', 'F10-BWP-10', 'F10-GEN-UP', 'F10-FU-MCC', 'UTL-MCC-2', 'F10-TC10.1-PANEL', 'F10-TC10.2-PANEL', 'F10-CAF10.1-PANEL', 'F10-CAF10.2-PANEL', 'F10-WEFH10.1-PANEL', 'F10-WEFH10.2-PANEL', 'F10-WEFH10.3-PANEL', 'F10-WEFH10.4-PANEL', 'F10-MDP-5', 'F10-MDP-6', 'UTL-OC-UDP', 'F10-LAHTI-MCC-06', 'F10-LAHTI-MCC-07', 'F10-COLD-UDP', 'F10-HOT-UDP', 'F10-UPG-1', 'F10-UPG-2', 'F10-GAS-UP', 'F10-UP1-1', 'F10-UP2-1', 'F10-UP2-2', 'F10-UP2-3'])
WHERE s.code = 'F10-MDP-9' ON CONFLICT DO NOTHING;

-- F10-TC10.1-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-TC10-1'])
WHERE s.code = 'F10-TC10.1-PANEL' ON CONFLICT DO NOTHING;

-- F10-TC10.2-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-TC10-2'])
WHERE s.code = 'F10-TC10.2-PANEL' ON CONFLICT DO NOTHING;

-- F10-CAF10.1-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-CAF10-1'])
WHERE s.code = 'F10-CAF10.1-PANEL' ON CONFLICT DO NOTHING;

-- F10-CAF10.2-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-CAF10-2'])
WHERE s.code = 'F10-CAF10.2-PANEL' ON CONFLICT DO NOTHING;

-- F10-WEFH10.1-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-WEFH10-1'])
WHERE s.code = 'F10-WEFH10.1-PANEL' ON CONFLICT DO NOTHING;

-- F10-WEFH10.2-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-WEFH10-2'])
WHERE s.code = 'F10-WEFH10.2-PANEL' ON CONFLICT DO NOTHING;

-- F10-WEFH10.3-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-WEFH10-3'])
WHERE s.code = 'F10-WEFH10.3-PANEL' ON CONFLICT DO NOTHING;

-- F10-WEFH10.4-PANEL -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-WEFH10-4'])
WHERE s.code = 'F10-WEFH10.4-PANEL' ON CONFLICT DO NOTHING;

-- F10-MDP-5 -> 3 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-BCF-1L', 'F10-BCF-1R', 'F10-SCF-1'])
WHERE s.code = 'F10-MDP-5' ON CONFLICT DO NOTHING;

-- F10-MDP-6 -> 3 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-BCF-2', 'F10-BCF-4', 'F10-SCF-2'])
WHERE s.code = 'F10-MDP-6' ON CONFLICT DO NOTHING;

-- F10-UO-DP -> 5 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-DPG1', 'F10-DPG2', 'F10-FP', 'F10-LP1', 'F10-CULLET-CB-DP1'])
WHERE s.code = 'F10-UO-DP' ON CONFLICT DO NOTHING;

-- F10-GEN-DP -> 7 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-UT-DP', 'F10-LP2', 'F10-LP3', 'F10-LP4', 'F10-LP5', 'F10-LP6', 'F10-W1-LP1'])
WHERE s.code = 'F10-GEN-DP' ON CONFLICT DO NOTHING;

-- F10-HOT-DP -> 24 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-DP2-1', 'F10-DP2-2', 'F10-DP2-3', 'F10-DP2-4', 'F10-DP2-5', 'F10-DP2-6', 'F10-DP2-7', 'F10-DP2-8', 'F10-MCC5', 'F10-MCC6', 'F10-RA-MCC', 'F10-RA-DP', 'F10-CRYN-05', 'F10-CRYN-06', 'F10-CRYN-07', 'F10-CRYN-08', 'F10-CRYN-09', 'F10-CRYN-15', 'F10-CRYN-17', 'F10-CRYN-18', 'F10-CRYN-19', 'F10-CRYN-20', 'F10-CRYN-41', 'F10-CRYN-42'])
WHERE s.code = 'F10-HOT-DP' ON CONFLICT DO NOTHING;

-- F10-COLD-DP -> 6 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-SIPAC-11', 'F10-SIPAC-12', 'F10-SIPAC-13', 'F10-SIPAC-14', 'F10-OTHER-OUTLETS', 'F10-DUST-FAN'])
WHERE s.code = 'F10-COLD-DP' ON CONFLICT DO NOTHING;

-- F10-MHO-10 -> 4 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-HEAT-OVEN-1', 'F10-HEAT-OVEN-2', 'F10-HEAT-OVEN-3', 'F10-HEAT-OVEN-4'])
WHERE s.code = 'F10-MHO-10' ON CONFLICT DO NOTHING;

-- F10-HOT10 -> 4 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-COOLING-OVEN-1', 'F10-COOLING-OVEN-2', 'F10-COOLING-OVEN-3', 'F10-COOLING-OVEN-4'])
WHERE s.code = 'F10-HOT10' ON CONFLICT DO NOTHING;

-- F10-MZ-DP -> 10 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-DP1-1', 'F10-DP1-2', 'F10-DP1-3', 'F10-DP1-4', 'F10-DP1-5', 'F10-DP1-6', 'F10-FCP10.1', 'F10-FCP10.2', 'F10-RFP10.1', 'F10-RFP10.2'])
WHERE s.code = 'F10-MZ-DP' ON CONFLICT DO NOTHING;

-- F10-MDP-8 -> 4 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-HP-1', 'F10-HP-2', 'F10-HP-3', 'F10-HP-4'])
WHERE s.code = 'F10-MDP-8' ON CONFLICT DO NOTHING;

-- F10-FH10-DIST -> 25 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-FTDP-1.1', 'F10-FTDP-1.2', 'F10-FTDP-1.3', 'F10-FTDP-1.4', 'F10-FTDP-2.1', 'F10-FTDP-2.2', 'F10-FTDP-2.3', 'F10-FTDP-2.4', 'F10-FTDP-3.1', 'F10-FTDP-3.2', 'F10-FTDP-3.3', 'F10-FTDP-3.4', 'F10-FTDP-4.1', 'F10-FTDP-4.2', 'F10-FTDP-4.3', 'F10-FTDP-4.4', 'F10-TBP-01', 'F10-SPD-01', 'F10-SPD-02', 'F10-SPD-03', 'F10-SPD-04', 'F10-SPD-05', 'F10-SPD-06', 'F10-SPD-07', 'F10-SPD-08'])
WHERE s.code = 'F10-FH10-DIST' ON CONFLICT DO NOTHING;

-- F10-OTHER-OUTLETS -> 7 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-TIMON-1', 'F10-TIMON-2', 'F10-TIMON-1-CONV', 'F10-TIMON-2-CONV', 'F10-FULL-PALLET-1', 'F10-FULL-PALLET-2', 'F10-GDK-FUR'])
WHERE s.code = 'F10-OTHER-OUTLETS' ON CONFLICT DO NOTHING;

-- F10-GEN-UP -> 3 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['UTL-UP', 'F10-AUP', 'F10-IN-UP'])
WHERE s.code = 'F10-GEN-UP' ON CONFLICT DO NOTHING;

-- UT-MDP -> 2 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['UT-MCC.1', 'UT-UDP'])
WHERE s.code = 'UT-MDP' ON CONFLICT DO NOTHING;

-- BTH-MDP -> 2 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['BTH-LP1', 'EXL-DP3'])
WHERE s.code = 'BTH-MDP' ON CONFLICT DO NOTHING;

-- BTH-UDP -> 2 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['BTH-UP1', 'BTH-COMMAND-PANEL'])
WHERE s.code = 'BTH-UDP' ON CONFLICT DO NOTHING;

-- UTL-TEST-PANEL -> 4 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-EQP1', 'F10-EQP2', 'F10-EQP3', 'F10-EQP4'])
WHERE s.code = 'UTL-TEST-PANEL' ON CONFLICT DO NOTHING;

-- TR-COMP-LV -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['TR-DPC'])
WHERE s.code = 'TR-COMP-LV' ON CONFLICT DO NOTHING;

-- TR-S -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['TR-DPS'])
WHERE s.code = 'TR-S' ON CONFLICT DO NOTHING;

-- TR2.2 -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['TR-DP2.2'])
WHERE s.code = 'TR2.2' ON CONFLICT DO NOTHING;

-- TR-DP2.2 -> 1 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['UT-MDP'])
WHERE s.code = 'TR-DP2.2' ON CONFLICT DO NOTHING;

-- F10-SIPAC-12 -> 14 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-CONV-FEEDER-PAL12', 'F10-EMMETI-PAL12', 'F10-MCAL-12.1', 'F10-MCAL-12.2', 'F10-MULTI-12.1', 'F10-MULTI-12.2', 'F10-MX4-12.1', 'F10-MX4-12.2', 'F10-MX4-12.3', 'F10-MX4-12.4', 'F10-CVCD-12.1', 'F10-CVCD-12.2', 'F10-RSAC-PAL12', 'F10-PALAC-PAL12'])
WHERE s.code = 'F10-SIPAC-12' ON CONFLICT DO NOTHING;

-- F10-SIPAC-13 -> 14 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-CONV-FEEDER-PAL13', 'F10-EMMETI-PAL13', 'F10-MCAL-13.1', 'F10-MCAL-13.2', 'F10-MULTI-13.1', 'F10-MULTI-13.2', 'F10-MX4-13.1', 'F10-MX4-13.2', 'F10-MX4-13.3', 'F10-MX4-13.4', 'F10-CVCD-13.1', 'F10-CVCD-13.2', 'F10-RSAC-PAL13', 'F10-PALAC-PAL13'])
WHERE s.code = 'F10-SIPAC-13' ON CONFLICT DO NOTHING;

-- F10-SIPAC-14 -> 14 loads
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s JOIN objects t ON t.code = ANY(ARRAY['F10-CONV-FEEDER-PAL14', 'F10-EMMETI-PAL14', 'F10-MCAL-14.1', 'F10-MCAL-14.2', 'F10-MULTI-14.1', 'F10-MULTI-14.2', 'F10-MX4-14.1', 'F10-MX4-14.2', 'F10-MX4-14.3', 'F10-MX4-14.4', 'F10-CVCD-14.1', 'F10-CVCD-14.2', 'F10-RSAC-PAL14', 'F10-PALAC-PAL14'])
WHERE s.code = 'F10-SIPAC-14' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Couplings / spare paths as 'backup_for'
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='SYNCHRONIZATION PANEL' AND t.code='TR-DP1.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='SYNCHRONIZATION PANEL' AND t.code='UTL-TRDP-1.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='SYNCHRONIZATION PANEL' AND t.code='UTL-TRDP-1.3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='SYNCHRONIZATION PANEL' AND t.code='TR-DPC' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='SYNCHRONIZATION PANEL' AND t.code='UTL-SAFETY-PANEL' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='TR-DPS' AND t.code='TR-DP1.1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='TR-DPS' AND t.code='UTL-TRDP-1.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='TR-DPS' AND t.code='UTL-TRDP-1.3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='TR-DPS' AND t.code='TR-DPC' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='TR-DP1.1' AND t.code='UTL-TRDP-1.2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='TR-DP1.1' AND t.code='UTL-TRDP-1.3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'backup_for', true FROM objects s, objects t WHERE s.code='UTL-TRDP-1.2' AND t.code='TR-DPC' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- Debris: 'F1-MDP-7' duplicates F10-MDP-7 (both exist; the SLD label is
-- F1-MDP-7, DB canonical is F10-MDP-7). Deactivate the duplicate.
-- ---------------------------------------------------------------------
UPDATE objects SET is_active = false WHERE code = 'F1-MDP-7';

COMMIT;

-- Verify: nothing left hanging off F10-GEN-DP that belongs elsewhere,
-- and the new TR-DP1.x hierarchy is in place
SELECT s.code AS source, count(*) AS n_feeds FROM dependencies d
JOIN objects s ON s.id=d.source_id WHERE d.relation='feeds'
  AND s.code IN ('TR-DP1.1','UTL-TRDP-1.2','UTL-TRDP-1.3','F10-MDP-9','F10-GEN-DP','F10-MCC-1','UT-MDP')
GROUP BY s.code ORDER BY s.code;

SELECT s.code AS source, t.code AS target, d.relation FROM dependencies d
JOIN objects s ON s.id=d.source_id JOIN objects t ON t.id=d.target_id
WHERE t.code IN ('UT-MDP','UT-UDP','BTH-MDP','ADB-MDP','UTL-MCC-2','UTL-SAFETY-PANEL','F10-COLD-UDP','F10-HOT-UDP','UTL-UP','UTL-OC-UDP')
ORDER BY t.code;
