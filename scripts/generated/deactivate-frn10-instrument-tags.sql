-- =====================================================================
-- Deactivate FRN-10's C91xx/C92xx cullet-return field-instrument tags
-- so they no longer show on the site map. Same suffix rule as the other
-- three buildings (keep -M1/-M2/-Q1/-Q2, deactivate everything else in
-- that tag family) -- limit switches, sensors, zone switches, etc.
--
-- SCOPE NOTE: unlike Batch House/CT-10/BTR-01, FRN-10 mixes this
-- instrument-tag convention with a large number of distinctly-named
-- real equipment and panels (ovens, chillers, conveyors, fans,
-- TR-BOOSTING-1.x transformers, F10-MDP-x/F10-MCC-x/F10-DP1/2-x
-- distribution panels, etc.) that just don't happen to end in
-- -M1/-M2/-Q1/-Q2. Those are left untouched here -- only the C91xx/C92xx
-- family (cullet-return area instrumentation) is deactivated.
-- 74 objects affected.
-- =====================================================================

BEGIN;

UPDATE objects SET is_active = false
WHERE building_id = '96656dcd-b6b6-40b5-8205-82d5b88d4a56'
  AND code = ANY(ARRAY[
    'C9111A-ESR1', 'C9111A-ESR2', 'C9111A-MS1', 'C9111A-PS1', 'C9111A-SS1', 'C9111A-TE1', 'C9111A-TE2', 'C9111A-XV1',
    'C9111A-XV2', 'C9121A-ESR1', 'C9121A-ESR2', 'C9121A-MS1', 'C9121A-PS1', 'C9121A-SS1', 'C9121A-TE1', 'C9121A-TE2',
    'C9121A-XV1', 'C9121A-XV2', 'C9131A-ESR1', 'C9131A-ESR2', 'C9131A-MS1', 'C9131A-PS1', 'C9131A-SS1', 'C9131A-TE1',
    'C9131A-TE2', 'C9131A-XV1', 'C9131A-XV2', 'C9141A-ESR1', 'C9141A-ESR2', 'C9141A-MS1', 'C9141A-PS1', 'C9141A-SS1',
    'C9141A-TE1', 'C9141A-TE2', 'C9141A-XV1', 'C9141A-XV2', 'C9211A-AS1', 'C9211A-AS2', 'C9211A-BS1', 'C9211A-ESR1',
    'C9211A-ESR2', 'C9211A-MS1', 'C9211A-SS1', 'C9221A-AS1', 'C9221A-AS2', 'C9221A-BS1', 'C9221A-ESR1', 'C9221A-ESR2',
    'C9221A-MS1', 'C9221A-SS1', 'C9241A-AS1', 'C9241A-AS2', 'C9241A-AS3', 'C9241A-AS4', 'C9241A-BS1', 'C9241A-ESR1',
    'C9241A-ESR2', 'C9241A-MS1', 'C9241A-SS1', 'C9261A-AS1', 'C9261A-AS2', 'C9261A-BS1', 'C9261A-ESR1', 'C9261A-ESR2',
    'C9261A-MS1', 'C9261A-SS1', 'C9281A-ESR1', 'C9281A-SS1', 'C9291A-AS1', 'C9291A-AS2', 'C9291A-ESR1', 'C9291A-ESR2',
    'C9291A-MS1', 'C9291A-SS1'
  ]);

COMMIT;

-- Verify
SELECT is_active, count(*) FROM objects
WHERE building_id = '96656dcd-b6b6-40b5-8205-82d5b88d4a56'
GROUP BY is_active;

