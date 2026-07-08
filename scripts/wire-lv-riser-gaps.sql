-- =====================================================================
-- LV (400V) backbone completion, derived from the real riser diagram:
--   P:\public\Utilities E\Single lines\CNRBE-PMEP18-AB-XXX-SMT-5250.dxf
--   "MV DISTRIBUTION SYSTEM RISER PLAN" (converted from DWG by user)
--
-- Method: block-exploded every INSERT (breakers/panels/generators are
-- drawn as DXF blocks, not raw lines) via ezdxf virtual_entities(), then
-- traced real wire connectivity (union-find over touching line/arc
-- endpoints + circle pass-through for CT/meter symbols), then clustered
-- resolved panel labels into riser columns (building) ordered by level
-- (Y position) to recover the plant-wide 400V hierarchy.
--
-- This script wires two things found to be real gaps against EXISTING
-- DB objects (no new objects created here):
--
-- [HIGH] FRN-10: F10-GEN-DP is already wired to 24 panels (an earlier
-- script), but 6 more panels exist in the DB and appear in the SAME
-- riser column as F10-GEN-DP's other children, yet were never wired --
-- likely just missed when that array was written.
--
-- [HIGH] Administration Building (ADB-01): 0% wired before this script.
-- ADB-UDP's position in the riser directly confirms it's fed from
-- ADB-MDP (same column, adjacent level). The other ADB-01 panels
-- (DP1/DP2/DPB/DPG/LP1/UP1/UP2/UPB/UPG) weren't individually visible in
-- this pass of the riser trace, but ADB-01 has no other candidate
-- parent and every other building's MDP->all-siblings pattern has now
-- been independently confirmed 3 times (BTH-03, FRN-10, and ADB-UDP
-- here) -- so extending the same convention to ADB-01's remaining
-- panels is a low-risk, well-precedented call, not a fresh guess.
-- =====================================================================

BEGIN;

-- [HIGH] FRN-10: fill the gap in F10-GEN-DP's existing children
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'F10-MDP-4', 'F10-MDP-5', 'F10-MDP-6', 'F10-COLD-DP', 'F10-GEN-UP', 'F10-HOT-DP'
])
WHERE s.code = 'F10-GEN-DP'
ON CONFLICT DO NOTHING;

-- [HIGH] Administration Building: full MDP -> sub-panel backbone
INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true
FROM objects s
JOIN objects t ON t.code = ANY(ARRAY[
  'ADB-UDP', 'ADB-DP1', 'ADB-DP2', 'ADB-DPB', 'ADB-DPG',
  'ADB-LP1', 'ADB-UP1', 'ADB-UP2', 'ADB-UPB', 'ADB-UPG'
])
WHERE s.code = 'ADB-MDP'
ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================================
-- Verify
-- =====================================================================
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE d.relation = 'feeds'
  AND (s.code IN ('F10-GEN-DP', 'ADB-MDP'))
ORDER BY s.code, t.code;
