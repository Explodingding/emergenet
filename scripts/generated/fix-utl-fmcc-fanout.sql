-- =====================================================================
-- UTL-FMCC was directly feeding 29 objects -- unrealistic for a single
-- MV bus per the real SLD, and now genuinely redundant: the proper
-- intermediate hierarchy exists for most of them (MV-FRN10-INPUT /
-- MV-FRN20-INPUT and their breaker cubicles, added in the last two
-- scripts). Removing the direct shortcuts so fault propagation follows
-- the real path instead of skipping straight to the transformer.
--
-- REMOVED (now have a proper multi-hop path instead):
--   UTL-FMCC -> TR1.1/1.2/1.3         (now: MV-OUT-FRN10 -> MV-FRN10-INPUT -> MV-TR1.x -> TR1.x)
--   UTL-FMCC -> TR2.1/2.2/2.3         (now: MV-OUT-FRN20 -> MV-FRN20-INPUT -> MV-TR2.x -> TR2.x)
--   UTL-FMCC -> TR-BOOSTING-1.1..1.4  (now: ... -> MV-FRN10-INPUT -> MV-TR-BOOSTING-1.x -> ...)
--   UTL-FMCC -> TR-BOOSTING-2.1..2.4  (now: ... -> MV-FRN20-INPUT -> MV-BOOSTING-2.x -> ...)
--   UTL-FMCC -> TR-COMP-4             (now: ... -> MV-FRN20-INPUT -> MV-TR-COMP-4 -> TR-COMP-4)
--   UTL-FMCC -> TR-WAREHOUSE          (now: ... -> MV-FRN10-INPUT -> MV-WAREHOUSE-F10 -> TR-WAREHOUSE)
--
-- LEFT ALONE (still correct -- these ARE the direct main-bus breaker
-- bays, or don't have a built-out intermediate yet):
--   UTL-FMCC -> MV-OUT-FRN10, MV-OUT-FRN20, MV-SPARE-1, MV-SPARE-2, MV-WH-INPUT
--   UTL-FMCC -> TC1-INPUT, TC2-INPUT, TC3-INPUT, TC4-INPUT
--   UTL-FMCC -> TR-C, TR-ISO, TR-S   (no MV breaker cubicle built for these yet)
-- =====================================================================

BEGIN;

DELETE FROM dependencies d
USING objects s, objects t
WHERE d.source_id = s.id AND d.target_id = t.id
  AND d.relation = 'feeds'
  AND s.code = 'UTL-FMCC'
  AND t.code = ANY(ARRAY[
    'TR1.1', 'TR1.2', 'TR1.3',
    'TR2.1', 'TR2.2', 'TR2.3',
    'TR-BOOSTING-1.1', 'TR-BOOSTING-1.2', 'TR-BOOSTING-1.3', 'TR-BOOSTING-1.4',
    'TR-BOOSTING-2.1', 'TR-BOOSTING-2.2', 'TR-BOOSTING-2.3', 'TR-BOOSTING-2.4',
    'TR-COMP-4', 'TR-WAREHOUSE'
  ]);

COMMIT;

-- Verify: what UTL-FMCC feeds directly now (should be 13, all bus bays / TCs / TR-C/ISO/S)
SELECT t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE d.relation = 'feeds' AND s.code = 'UTL-FMCC'
ORDER BY t.code;

-- Verify: TR1.1 (as an example) now has exactly one upstream path
SELECT s.code AS source, t.code AS target
FROM dependencies d
JOIN objects s ON s.id = d.source_id
JOIN objects t ON t.id = d.target_id
WHERE d.relation = 'feeds' AND t.code = 'TR1.1';
