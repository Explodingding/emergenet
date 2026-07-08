-- =====================================================================
-- Distribution Building (DST-01) -> Utility Building MV incoming supply.
--
-- Per user: DST-MV-H03 and DST-MV-H07 feed UTL-01's MV-SUPPLY-1/2.
--
-- Matched by object NAME, not code number -- the two switchgear names
-- say "Cinerglas 1" / "Cinerglas 2", which doesn't follow H03/H07 order:
--   DST-MV-H07 = "Distribution MV Outgoing Cinerglas 1 (to Utility)"
--   DST-MV-H03 = "Distribution MV Outgoing Cinerglas 2 (to Utility)"
-- This also matches the real MV SLD (CNRBE-PMEP20-AB-XXX-SMT-5255),
-- which shows "Vertrek Cinerglas 1" / "Vertrek Cinerglas 2" as the two
-- outgoing breakers from the Distribution Building's ring bus.
-- =====================================================================

BEGIN;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'DST-MV-H07' AND t.code = 'MV-SUPPLY-1'
ON CONFLICT DO NOTHING;

INSERT INTO dependencies (source_id, target_id, relation, is_active)
SELECT s.id, t.id, 'feeds', true FROM objects s, objects t
WHERE s.code = 'DST-MV-H03' AND t.code = 'MV-SUPPLY-2'
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT s.code AS source, s.name AS source_name, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE s.code IN ('DST-MV-H03', 'DST-MV-H07');
