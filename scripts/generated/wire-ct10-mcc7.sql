-- =====================================================================
-- Cullet Tower (CT-10) MCC7 panel + confirmed equipment wiring.
--
-- CT-10 had ZERO panel objects and zero 'feeds' edges before this script
-- -- all 296 objects were floating leaf equipment. Source text in
-- '8220_Circuit diagrams of the cabinets 22.03.2026.pdf' (Project Cable
-- List pages, location code 'CT1') confirms a panel named MCC7 feeds the
-- base tags wired below -- 54 of CT-10's 107 distinct equipment groups.
-- The other 53 groups aren't referenced under this MCC in the source and
-- are left unwired rather than guessed.
--
-- Depth convention: MCC7 -> each unit's -Q1 (the breaker, matching real
-- electrical practice -- Q1 is what's physically on the MCC). Q1 -> every
-- other suffix in that same unit (motor, sensors), since they share the
-- unit's local control panel and go down together if the breaker trips.
-- Falls back to MCC7 -> <base> directly for the few units with no -Q1.
-- =====================================================================

BEGIN;

-- New panel object: MCC7 (Cullet Tower F10 motor control center)
INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
SELECT gen_random_uuid(), 'MCC7', 'MCC7 -- Cullet Tower F10 Motor Control Center',
  'cf10aa01-0000-4a01-aa10-000000000010', '750805ed-58ee-4ea9-bfae-6be9d6ca539e',
  (SELECT id FROM floors WHERE building_id = 'cf10aa01-0000-4a01-aa10-000000000010' AND name = 'Level 0 m'),
  true, 4900, 6200, 0,
  '{"source_drawing": "8220 Circuit diagrams of the cabinets 22.03.2026", "note": "confirmed via Project Cable List, location CT1"}'
ON CONFLICT (code) DO NOTHING;

-- 0151A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['0151A-AH1', '0151A-AH2', '0151A-AH3', '0151A-AH5', '0151A-LCP1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- 0171A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['0171A-AH3', '0171A-AHL', '0171A-AHS'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- BE1751A: MCC7 -> BE1751A-Q1 -> rest of unit
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MCC7' AND t.code = 'BE1751A-Q1'
ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['BE1751A-AS1', 'BE1751A-AS2', 'BE1751A-AS3', 'BE1751A-AS4', 'BE1751A-ES3', 'BE1751A-M1', 'BE1751A-M2', 'BE1751A-S51'])
WHERE s.code = 'BE1751A-Q1'
ON CONFLICT DO NOTHING;

-- BE1761A: MCC7 -> BE1761A-Q1 -> rest of unit
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MCC7' AND t.code = 'BE1761A-Q1'
ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['BE1761A-AS1', 'BE1761A-AS2', 'BE1761A-AS3', 'BE1761A-AS4', 'BE1761A-ES3', 'BE1761A-M1', 'BE1761A-M2', 'BE1761A-S51'])
WHERE s.code = 'BE1761A-Q1'
ON CONFLICT DO NOTHING;

-- BE1831A: MCC7 -> BE1831A-Q1 -> rest of unit
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MCC7' AND t.code = 'BE1831A-Q1'
ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['BE1831A-AS1', 'BE1831A-AS2', 'BE1831A-AS3', 'BE1831A-AS4', 'BE1831A-ES3', 'BE1831A-M1', 'BE1831A-M2', 'BE1831A-S51'])
WHERE s.code = 'BE1831A-Q1'
ON CONFLICT DO NOTHING;

-- BE1871A: MCC7 -> BE1871A-Q1 -> rest of unit
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MCC7' AND t.code = 'BE1871A-Q1'
ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['BE1871A-AS1', 'BE1871A-AS2', 'BE1871A-AS3', 'BE1871A-AS4', 'BE1871A-BS1', 'BE1871A-ES3', 'BE1871A-M1'])
WHERE s.code = 'BE1871A-Q1'
ON CONFLICT DO NOTHING;

-- BE9301A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['BE9301A-BS1', 'BE9301A-M1', 'BE9301A-M2', 'BE9301A-S51'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- C1331A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['C1331A-SS1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- CG1844A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['CG1844A-CB1', 'CG1844A-XV1', 'CG1844A-ZS1', 'CG1844A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- CG4477A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['CG4477A-CB1', 'CG4477A-XV1', 'CG4477A-ZS1', 'CG4477A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- CG9324A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['CG9324A-CB1', 'CG9324A-XV1', 'CG9324A-ZS1', 'CG9324A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC1777A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC1777A-XV1', 'DCC1777A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC1836A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC1836A-XV1', 'DCC1836A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC1843A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC1843A-XV1', 'DCC1843A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC1876A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC1876A-XV1', 'DCC1876A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC1882A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC1882A-XV1', 'DCC1882A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC1884A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC1884A-XV1', 'DCC1884A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC4475A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC4475A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC9312A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC9312A-XV1', 'DCC9312A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCC9323A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCC9323A-XV1', 'DCC9323A-XV2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7528A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7528A-G'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7531A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7531A-EU1', 'DCU7531A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7568A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7568A-CU1', 'DCU7568A-D1', 'DCU7568A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7571A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7571A-CU1', 'DCU7571A-D1', 'DCU7571A-EU1', 'DCU7571A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7574A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7574A-EU1', 'DCU7574A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7575A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7575A-EU1', 'DCU7575A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7577A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7577A-EU1', 'DCU7577A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DCU7579A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DCU7579A-EU1', 'DCU7579A-M1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG1745A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG1745A-XV1', 'DG1745A-XV2', 'DG1745A-ZS1', 'DG1745A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG1765A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG1765A-XV1', 'DG1765A-XV2', 'DG1765A-ZS1', 'DG1765A-ZS2', 'DG1765A-ZS3'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG1796A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG1796A-XV1', 'DG1796A-XV2', 'DG1796A-ZS1', 'DG1796A-ZS2', 'DG1796A-ZS3'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG1835A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG1835A-XV1', 'DG1835A-XV2', 'DG1835A-ZS1', 'DG1835A-ZS2', 'DG1835A-ZS3'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG1841A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG1841A-XV1', 'DG1841A-XV2', 'DG1841A-ZS1', 'DG1841A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG1873A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG1873A-XV1', 'DG1873A-XV2', 'DG1873A-ZS1', 'DG1873A-ZS2', 'DG1873A-ZS3'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG1881A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG1881A-XV1', 'DG1881A-XV2', 'DG1881A-ZS1', 'DG1881A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG4474A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG4474A-XV1', 'DG4474A-XV2', 'DG4474A-ZS1', 'DG4474A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG4481A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG4481A-XV1', 'DG4481A-XV2', 'DG4481A-ZS1', 'DG4481A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- DG9311A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['DG9311A-XV1', 'DG9311A-XV2', 'DG9311A-ZS1', 'DG9311A-ZS2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- HO1311A: MCC7 -> HO1311A-Q1 -> rest of unit
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MCC7' AND t.code = 'HO1311A-Q1'
ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['HO1311A-M1'])
WHERE s.code = 'HO1311A-Q1'
ON CONFLICT DO NOTHING;

-- HO1312A: MCC7 -> HO1312A-Q1 -> rest of unit
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MCC7' AND t.code = 'HO1312A-Q1'
ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['HO1312A-M1'])
WHERE s.code = 'HO1312A-Q1'
ON CONFLICT DO NOTHING;

-- HO1313A: MCC7 -> HO1313A-Q1 -> rest of unit
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'MCC7' AND t.code = 'HO1313A-Q1'
ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['HO1313A-M1'])
WHERE s.code = 'HO1313A-Q1'
ON CONFLICT DO NOTHING;

-- MD4473A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['MD4473A-M01'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- S3091A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['S3091A-LT1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- S3092A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['S3092A-LT1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- S3093A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['S3093A-LT1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- TW4454A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['TW4454A-XV1', 'TW4454A-XV2', 'TW4454A-XV3'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- TW4464A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['TW4464A-XV1', 'TW4464A-XV2', 'TW4464A-XV3'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- VF1321A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['VF1321A-CU1', 'VF1321A-JB1', 'VF1321A-MGC1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- VF1322A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['VF1322A-CU1', 'VF1322A-JB1', 'VF1322A-MGC1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- VF1323A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['VF1323A-CU1', 'VF1323A-JB1', 'VF1323A-MGC1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- VF1721A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['VF1721A-FD1', 'VF1721A-M1', 'VF1721A-M2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- VF1731A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['VF1731A-FD1', 'VF1731A-M1', 'VF1731A-M2'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- VF4452A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['VF4452A-EU1', 'VF4452A-M2X1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

-- VF9331A: no -Q1 found, MCC7 feeds unit directly
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['VF9331A-D1'])
WHERE s.code = 'MCC7'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT count(*) AS ct10_wired_objects FROM objects o WHERE o.building_id = 'cf10aa01-0000-4a01-aa10-000000000010' AND (
  EXISTS (SELECT 1 FROM dependencies d WHERE d.source_id = o.id OR d.target_id = o.id)
);
