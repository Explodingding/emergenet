-- =====================================================================
-- Utility Building (UTL-01) MV backbone completion, from the real SLD:
--   P:\public\Utilities E\Single lines\CNRBE-PMEP20-AB-XXX-SMT-5255.pdf
--   "Ciner Glass Utility Building - Main MV Panel" / "MV Distribution
--   System Riser Plan"
--
-- IMPORTANT — this script CORRECTS previously-run wiring:
--   wire-dependencies.sql (Block 2) wired TR-COMP-LV -> TR-COMP-1/2/3,
--   treating them as "6kV compressor starters" sharing one transformer.
--   The real SLD shows TR-COMP-1/2/3/4 as FOUR INDEPENDENT MV/6kV
--   transformers, each fed from its own Turbo Compressor ring panel
--   (matching their actual DB names: "Turbo Compressor Transformer N").
--   This script removes those 3 edges and rewires correctly. TR-COMP-LV
--   itself is untouched (it's real, just doesn't feed TR-COMP-1/2/3).
--
-- Confidence:
--   [HIGH]   Everything below is read directly off the SLD text/layout,
--            not inferred from naming alone.
--   [GAP]    TC3 has no compensation-panel object in the DB (TC1/2/4 do)
--            -- the SLD lists one, but it was never entered. Not created
--            here; flagging so it can be added later if wanted.
--   [GAP]    TR-COMP-1..4's downstream loads (the actual compressor
--            motors, "UT-COMP 4.6-1..4" on the SLD) don't map 1:1 to the
--            3 mechanical-compressor objects in the DB (UTL-COMP7-1/2,
--            UTL-COMP4-1 -- only 3 for 4 transformers). Left unwired
--            rather than guessing which transformer feeds which.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Fix: remove the incorrect TR-COMP-LV -> TR-COMP-1/2/3 edges
-- ---------------------------------------------------------------------
DELETE FROM dependencies d
USING objects s, objects t
WHERE d.source_id = s.id AND d.target_id = t.id
  AND d.relation = 'feeds'
  AND s.code = 'TR-COMP-LV'
  AND t.code IN ('TR-COMP-1', 'TR-COMP-2', 'TR-COMP-3');

-- ---------------------------------------------------------------------
-- [HIGH] Incoming MV supply -> Main MV bus (UTL-FMCC)
-- Note: UTL-FMCC's DB name ("Utility Smoke Exhaust Fan MCC 4x15kW")
-- doesn't match its role -- it's already wired as the main MV bus
-- (feeds TR1.x/TR2.x/TR-C/TR-S/TR-ISO/TR-COMP-4/TR-COMP-LV). Worth
-- renaming separately; not blocking this wiring.
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = 'UTL-FMCC'
WHERE s.code IN ('MV-SUPPLY-1', 'MV-SUPPLY-2')
ON CONFLICT DO NOTHING;

-- [HIGH] Main MV bus -> outgoing breaker bays (FUR10/FUR20 feeders, spares, warehouse cubicle)
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['MV-OUT-FRN10', 'MV-OUT-FRN20', 'MV-SPARE-1', 'MV-SPARE-2', 'MV-WH-INPUT'])
WHERE s.code = 'UTL-FMCC'
ON CONFLICT DO NOTHING;

-- [HIGH] Warehouse input cubicle -> future PV expansion bay
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s, objects t
WHERE s.code = 'MV-WH-INPUT' AND t.code = 'MV-PV-FUTURE'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- [HIGH] Turbo Compressor 1-4: Main bus -> Input -> Ring -> Output -> Transformer
-- Compensation panels branch off the ring bus (PFC capacitor banks).
-- Bus-tie / ring-input objects represent the ring's redundant coupling
-- points and are wired as branches off the ring rather than extended
-- further, since they're backup paths, not primary supply.
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['TC1-INPUT', 'TC2-INPUT', 'TC3-INPUT', 'TC4-INPUT'])
WHERE s.code = 'UTL-FMCC'
ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC1-INPUT' AND t.code='TC1-RING' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC2-INPUT' AND t.code='TC2-RING' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC3-INPUT' AND t.code='TC3-RING' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC4-INPUT' AND t.code='TC4-RING' ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC1-RING' AND t.code='TC1-OUTPUT' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC2-RING' AND t.code='TC2-OUTPUT' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC3-RING' AND t.code='TC3-OUTPUT' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC4-RING' AND t.code='TC4-OUTPUT' ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC1-OUTPUT' AND t.code='TR-COMP-1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC2-OUTPUT' AND t.code='TR-COMP-2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC3-OUTPUT' AND t.code='TR-COMP-3' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC4-OUTPUT' AND t.code='TR-COMP-4' ON CONFLICT DO NOTHING;

-- Compensation panels (PFC) branch off the ring -- TC3 has none in the DB (see [GAP] note)
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC1-RING' AND t.code='TC1-COMP-PANEL' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC2-RING' AND t.code='TC2-COMP-PANEL' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC4-RING' AND t.code='TC4-COMP-PANEL' ON CONFLICT DO NOTHING;

-- Ring redundancy/coupling points (backup paths, not extended further)
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC1-RING' AND t.code='TC1-BUS-TIE' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t WHERE s.code='TC4-RING' AND t.code='TC4-RING-INPUT' ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- [HIGH] Metering/monitoring devices -- 'monitors', not 'feeds' (they
-- don't supply power, they watch it; doesn't drive fault propagation).
-- ---------------------------------------------------------------------
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'monitors', true FROM objects s, objects t WHERE s.code='MV-SUPPLY-1' AND t.code='MV-SICAM-1' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'monitors', true FROM objects s, objects t WHERE s.code='MV-SUPPLY-2' AND t.code='MV-SICAM-2' ON CONFLICT DO NOTHING;
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'monitors', true FROM objects s, objects t WHERE s.code='UTL-FMCC' AND t.code='MTR-MAIN' ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================================
-- Verify: full UTL-01 'feeds' chain after this script
-- =====================================================================
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE d.relation = 'feeds'
  AND (s.building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80' OR t.building_id = 'c92216bb-c77b-4f2b-8167-8f3817901d80')
ORDER BY s.code, t.code;
