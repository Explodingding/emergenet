-- =====================================================================
-- Fix transformer and distribution-panel codes
--
-- Problem: objects inserted as TR-DP1.1/TR-DP1.2/… were actually the
--          26 kV/400 V transformers. The "-DP" prefix should belong to
--          the downstream distribution panel, not the transformer itself.
--
-- Correct naming:
--   TR1.1  = transformer 26/0.4 kV 3150 kVA (Furnace 10 bus, feeder 1)
--   TR-DP1.1 = 400 V distribution panel fed by TR1.1
--   … same pattern for 1.2, 1.3, 2.1, 2.2, 2.3
--
-- Run in Supabase SQL Editor. Safe to re-run (DO UPDATE is idempotent).
-- =====================================================================

BEGIN;

-- ── Furnace 10 INPUT bus transformers ────────────────────────────────
UPDATE objects SET code = 'TR1.1',  name = 'Main Step-down Transformer 1.1 (26/0.4 kV 3150 kVA)' WHERE code = 'TR-DP1.1';
UPDATE objects SET code = 'TR1.2',  name = 'Main Step-down Transformer 1.2 (26/0.4 kV 3150 kVA)' WHERE code = 'TR-DP1.2';
UPDATE objects SET code = 'TR1.3',  name = 'Main Step-down Transformer 1.3 (26/0.4 kV 3150 kVA)' WHERE code = 'TR-DP1.3';

-- ── Furnace 20 INPUT bus transformers ────────────────────────────────
UPDATE objects SET code = 'TR2.1',  name = 'Main Step-down Transformer 2.1 (26/0.4 kV 3150 kVA)' WHERE code = 'TR-DP2.1';
UPDATE objects SET code = 'TR2.2',  name = 'Main Step-down Transformer 2.2 (26/0.4 kV 3150 kVA)' WHERE code = 'TR-DP2.2';
UPDATE objects SET code = 'TR2.3',  name = 'Main Step-down Transformer 2.3 (26/0.4 kV 3150 kVA)' WHERE code = 'TR-DP2.3';

-- ── Spare / coupling / isolation ─────────────────────────────────────
UPDATE objects SET code = 'TR-S',   name = 'Spare Transformer (26/0.4 kV 3150 kVA)'        WHERE code = 'TR-DPS';
UPDATE objects SET code = 'TR-C',   name = 'Coupling Transformer (26/0.4 kV 2000 kVA)'     WHERE code = 'TR-DPC';
UPDATE objects SET code = 'TR-ISO', name = 'Safety Isolation Transformer (26/0.4 kV 400 kVA)' WHERE code = 'TR-ISOLATION';

-- ── Distribution panel: rename UTL-TRDP-1.1 → TR-DP1.1 ──────────────
-- UTL-TRDP-1.1 is the 400 V panel fed by TR1.1 — its proper code is TR-DP1.1
UPDATE objects SET code = 'TR-DP1.1', name = 'Distribution Panel TR-DP1.1 (400 V, fed by TR1.1)' WHERE code = 'UTL-TRDP-1.1';

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────
SELECT o.code, o.name, ot.label AS type
FROM objects o
JOIN object_types ot ON ot.id = o.type_id
WHERE o.code IN (
  'TR1.1','TR1.2','TR1.3','TR2.1','TR2.2','TR2.3',
  'TR-S','TR-C','TR-ISO',
  'TR-DP1.1',
  'TR-COMP-LV','TR-COMP-1','TR-COMP-2','TR-COMP-3','TR-COMP-4',
  'TR-WAREHOUSE',
  'TR-BOOSTING-1.1','TR-BOOSTING-1.2','TR-BOOSTING-1.3','TR-BOOSTING-1.4',
  'TR-BOOSTING-2.1','TR-BOOSTING-2.2','TR-BOOSTING-2.3','TR-BOOSTING-2.4'
)
ORDER BY code;
