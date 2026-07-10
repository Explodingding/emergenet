-- =====================================================================
-- Deactivate BTR-01 (Batch Transport / Conveyor Bridge) field-instrument/
-- sensor tags so they no longer show on the site map. Same rule as
-- deactivate-bth03-instrument-tags.sql / deactivate-ct10-instrument-tags.sql:
-- keep active only codes ending in -M1, -M2, -Q1, -Q2 (motors/safety
-- switches) -- deactivate everything else (limit switches, zone switches,
-- junction boxes, control units, sensors, etc.).
--
-- No backbone panels (DP/MDP/UDP/MCC-style codes) found among BTR-01's
-- objects, so no exclusions needed this time.
-- 85 objects affected.
-- =====================================================================

BEGIN;

UPDATE objects SET is_active = false
WHERE building_id = 'b7a0aa01-0000-4b01-aa01-000000000001'
  AND code = ANY(ARRAY[
    '0162-AH2', '0162-AH4', '6111', '6211', '8161-AH2', '8162-AH1', '8162-AH5', 'C6131A-AS1',
    'C6131A-AS2', 'C6131A-ESR1', 'C6131A-ESR2', 'C6131A-MS1', 'C6131A-SS1', 'C6151A-AS1', 'C6151A-AS2', 'C6151A-AS3',
    'C6151A-AS4', 'C6151A-ESR1', 'C6151A-ESR2', 'C6161A-AS1', 'C6161A-AS2', 'C6161A-AS3', 'C6161A-AS4', 'C6161A-ESR1',
    'C6161A-ESR2', 'C6171A-AS1', 'C6171A-AS2', 'C6171A-ESR1', 'C6171A-ESR2', 'C6231A-AS1', 'C6231A-AS2', 'C6231A-ESR1',
    'C6231A-ESR2', 'C6231A-MS1', 'C6231A-SS1', 'C6251A-AS1', 'C6251A-AS2', 'C6251A-AS3', 'C6251A-ESR1', 'C6251A-ESR2',
    'C6271A-AS1', 'C6271A-AS2', 'C6271A-ESR1', 'C6271A-ESR2', 'DCU1692A-XV1', 'DCU1692A-XV2', 'DCU7541A-CUT', 'DCU7544A-CUT',
    'DCU7551A-CU1', 'DCU7552A-CU1', 'DCU7553A-CU1', 'DCU7554A-CU1', 'DCU7555A-CU1', 'DCU7556A-CU1', 'DCU7557A-CU1', 'DCU7558A-CU1',
    'DCU7581A-CU1', 'DCU7582A-CU1', 'DCU7583A-CU1', 'DCU7584A-CU1', 'DG6273A-XV1', 'DG6273A-XV2', 'DG6273A-ZS1', 'DG6273A-ZS2',
    'EB14', 'EB15', 'EB16', 'EB17', 'EB18', 'MMU6132-JB1', 'MMU6132-MP1', 'MMU6232-JB1',
    'MMU6232-MP1', 'S6331A-B1', 'S6331A-LSH1', 'S6331A-SST', 'S6351A-B1', 'S6351A-LSH1', 'S6351A-SST', 'S6371A-B1',
    'S6371A-LSH1', 'S6371A-SST', 'TB120', 'TB130', 'YB119'
  ]);

COMMIT;

-- Verify
SELECT is_active, count(*) FROM objects
WHERE building_id = 'b7a0aa01-0000-4b01-aa01-000000000001'
GROUP BY is_active;

