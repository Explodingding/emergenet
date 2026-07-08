-- =====================================================================
-- Power topology dependencies derived from:
--   SLD: CNRBE-PMEP20-AB-XXX-SMT-5255 (Ciner Glass Utility Building - Main MV Panel)
--   Naming conventions and floor-plan SQL files
--
-- !! Run rename-transformer-codes.sql FIRST !!
--    That script fixes the transformer/panel code naming before these
--    dependencies can reference the correct codes.
--
-- Relation 'feeds' drives fault propagation in the app.
-- Direction: source_id (upstream) feeds target_id (downstream consumer).
--
-- Confidence:
--   [HIGH]   Directly visible on the MV SLD
--   [INFER]  Derived from naming convention — confirm if unsure
-- =====================================================================

-- =====================================================================
-- BLOCK 1 [HIGH] — 26 kV MV main switchgear → all step-down transformers
--   UTL-FMCC is the "Ciner Glass Utility Building Main MV Panel" (SLD title).
--   Two internal bus sections (Furnace 10 INPUT, Furnace 20 INPUT) both
--   belong to the same physical switchgear; no separate source objects exist.
-- =====================================================================

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  -- Furnace 10 INPUT bus section
  'TR1.1', 'TR1.2', 'TR1.3',
  'TR-S',
  'TR-COMP-LV',
  'TR-BOOSTING-1.1', 'TR-BOOSTING-1.2', 'TR-BOOSTING-1.3', 'TR-BOOSTING-1.4',
  -- Furnace 20 INPUT bus section
  'TR2.1', 'TR2.2', 'TR2.3',
  'TR-COMP-4',
  'TR-WAREHOUSE',
  'TR-BOOSTING-2.1', 'TR-BOOSTING-2.2', 'TR-BOOSTING-2.3', 'TR-BOOSTING-2.4',
  -- Bus-tie and auxiliary
  'TR-C', 'TR-ISO'
])
WHERE s.code = 'UTL-FMCC'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- BLOCK 2 [HIGH] — TR-COMP-LV (26/6 kV, 2000 kVA) → 6 kV compressor starters
--   SLD shows 6 kV bus with compressor-1 and compressor-2 sections,
--   each with ring input, compensation capacitor banks, and main output.
--   TR-COMP-4 is a separate direct MV feeder, not on this 6 kV bus.
-- =====================================================================

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['TR-COMP-1', 'TR-COMP-2', 'TR-COMP-3'])
WHERE s.code = 'TR-COMP-LV'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- BLOCK 3 [HIGH] — Transformers → their downstream 400 V distribution panels
--   TR1.1 → TR-DP1.1  (after rename-transformer-codes.sql renames UTL-TRDP-1.1)
--   TR1.2 and TR1.3: downstream panels not yet in DB — add when available
--   TR2.1 / TR2.2 / TR2.3: panels (TR-DP2.x) not yet in DB
-- =====================================================================

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s, objects t
WHERE s.code = 'TR1.1' AND t.code = 'TR-DP1.1'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- BLOCK 4 [INFER] — TR-DP1.1 → UTL-01 sub-panels
-- =====================================================================

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY['UTL-DP1-1', 'UTL-DP1-2'])
WHERE s.code = 'TR-DP1.1'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- BLOCK 5 [INFER] — FRN-10 main 400 V panel (F10-GEN-DP)
--   Adjust source to TR1.2 or TR1.3 once feeder assignment is confirmed.
-- =====================================================================

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s, objects t
WHERE s.code = 'TR1.2' AND t.code = 'F10-GEN-DP'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- BLOCK 6 [INFER] — F10-GEN-DP → FRN-10 distribution panels and MCCs
-- =====================================================================

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'F10-MCC-1', 'F10-MCC2', 'F10-MCC3', 'F10-MCC4',
  'F10-MDP-1', 'F10-MDP-2', 'F10-MDP-3', 'F10-MDP-7', 'F10-MDP-8', 'F10-MDP-9',
  'F10-DPG1', 'F10-DPG2', 'F10-DPG-3', 'F10-DPG-4', 'F10-DPG-5', 'F10-DPG-6', 'F10-DPG-7',
  'F10-FP', 'F10-FU-MCC', 'F10-MS-DP', 'F10-ADP', 'F10-PW-DP', 'F10-MZ-DP', 'F10-UO-DP',
  'F10-HOT10', 'F10-UP1-1', 'F10-IDC-2', 'F10-IDC-6-3', 'F10-LUFTTECH', 'F10-OTHER-OUTLETS'
])
WHERE s.code = 'F10-GEN-DP'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- BLOCK 7 [INFER] — F10-MCC-1 → sub-panels it directly powers
-- =====================================================================

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'F10-FCP10.2',
  'F10-HP-1', 'F10-HP-2', 'F10-HP-3', 'F10-HP-4',
  'F10-AUP', 'F10-PLC-2', 'F10-GEN-UP',
  'F10-CRAC-1',
  'F10-LAHTI-MCC-06', 'F10-LAHTI-MCC-07',
  'F10-DP1-3', 'F10-DP1-5', 'F10-DP1-6'
])
WHERE s.code = 'F10-MCC-1'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- Verify: count inserted dependencies per source
-- =====================================================================
SELECT s.code AS source, COUNT(*) AS feeds_count
FROM dependencies d
JOIN objects s ON s.id = d.source_id
WHERE d.relation = 'feeds'
GROUP BY s.code
ORDER BY feeds_count DESC;
