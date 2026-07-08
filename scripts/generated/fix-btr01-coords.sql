-- =====================================================================
-- Fix-up: BTR-01 (Batch Transport / Conveyor Bridge) is a narrow
-- horizontal strip spanning exactly from Batch House's right edge
-- (x=3439) to Utility Building's left edge (x=5559), matching the
-- real conveyor route confirmed against the site drawings.
--
-- Supersedes all previous BTR-01 bounds/coord fixes — run this one.
-- =====================================================================

BEGIN;

UPDATE buildings SET bounds_x = 3439, bounds_y = 5197, bounds_w = 2120, bounds_h = 300 WHERE code = 'BTR-01';

UPDATE objects SET coord_x = 4822, coord_y = 5212 WHERE code = 'C6161A-AS1';
UPDATE objects SET coord_x = 4922, coord_y = 5212 WHERE code = 'C6161A-AS2';
UPDATE objects SET coord_x = 5022, coord_y = 5212 WHERE code = 'C6161A-AS3';
UPDATE objects SET coord_x = 5122, coord_y = 5212 WHERE code = 'C6161A-AS4';
UPDATE objects SET coord_x = 5222, coord_y = 5212 WHERE code = 'C6161A-ESR1';
UPDATE objects SET coord_x = 4822, coord_y = 5297 WHERE code = 'C6161A-ESR2';
UPDATE objects SET coord_x = 4922, coord_y = 5297 WHERE code = 'C6161A-M1';
UPDATE objects SET coord_x = 5022, coord_y = 5297 WHERE code = 'DCU1692A-M1';
UPDATE objects SET coord_x = 5122, coord_y = 5297 WHERE code = 'DCU1692A-XV1';
UPDATE objects SET coord_x = 5222, coord_y = 5297 WHERE code = 'DCU1692A-XV2';
UPDATE objects SET coord_x = 4822, coord_y = 5397 WHERE code = 'DCU7551A-CU1';
UPDATE objects SET coord_x = 4922, coord_y = 5397 WHERE code = 'DCU7551A-M1';
UPDATE objects SET coord_x = 5022, coord_y = 5397 WHERE code = 'DCU7552A-CU1';
UPDATE objects SET coord_x = 5122, coord_y = 5397 WHERE code = 'DCU7552A-M1';
UPDATE objects SET coord_x = 5222, coord_y = 5397 WHERE code = 'S6331A-B1';
UPDATE objects SET coord_x = 4822, coord_y = 5482 WHERE code = 'S6331A-LSH1';
UPDATE objects SET coord_x = 4922, coord_y = 5482 WHERE code = 'S6331A-M1';
UPDATE objects SET coord_x = 5022, coord_y = 5482 WHERE code = 'S6331A-M2';
UPDATE objects SET coord_x = 5122, coord_y = 5482 WHERE code = 'S6331A-SST';
UPDATE objects SET coord_x = 4404, coord_y = 5212 WHERE code = 'C6151A-AS1';
UPDATE objects SET coord_x = 4504, coord_y = 5212 WHERE code = 'C6151A-AS2';
UPDATE objects SET coord_x = 4604, coord_y = 5212 WHERE code = 'C6151A-AS3';
UPDATE objects SET coord_x = 4704, coord_y = 5212 WHERE code = 'C6151A-AS4';
UPDATE objects SET coord_x = 4804, coord_y = 5212 WHERE code = 'C6151A-ESR1';
UPDATE objects SET coord_x = 4404, coord_y = 5247 WHERE code = 'C6151A-ESR2';
UPDATE objects SET coord_x = 4504, coord_y = 5247 WHERE code = 'C6151A-M1';
UPDATE objects SET coord_x = 4604, coord_y = 5247 WHERE code = 'C6251A-AS1';
UPDATE objects SET coord_x = 4704, coord_y = 5247 WHERE code = 'C6251A-AS2';
UPDATE objects SET coord_x = 4804, coord_y = 5247 WHERE code = 'C6251A-AS3';
UPDATE objects SET coord_x = 4404, coord_y = 5347 WHERE code = 'C6251A-ESR1';
UPDATE objects SET coord_x = 4504, coord_y = 5347 WHERE code = 'C6251A-ESR2';
UPDATE objects SET coord_x = 4604, coord_y = 5347 WHERE code = 'C6251A-M1';
UPDATE objects SET coord_x = 4704, coord_y = 5347 WHERE code = 'DCU7553A-CU1';
UPDATE objects SET coord_x = 4804, coord_y = 5347 WHERE code = 'DCU7553A-M1';
UPDATE objects SET coord_x = 4404, coord_y = 5447 WHERE code = 'DCU7554A-CU1';
UPDATE objects SET coord_x = 4504, coord_y = 5447 WHERE code = 'DCU7554A-M1';
UPDATE objects SET coord_x = 4604, coord_y = 5447 WHERE code = 'S6351A-B1';
UPDATE objects SET coord_x = 4704, coord_y = 5447 WHERE code = 'S6351A-LSH1';
UPDATE objects SET coord_x = 4804, coord_y = 5447 WHERE code = 'S6351A-M1';
UPDATE objects SET coord_x = 4404, coord_y = 5482 WHERE code = 'S6351A-M2';
UPDATE objects SET coord_x = 4504, coord_y = 5482 WHERE code = 'S6351A-SST';
UPDATE objects SET coord_x = 4036, coord_y = 5212 WHERE code = 'C6131A-AS1';
UPDATE objects SET coord_x = 4136, coord_y = 5212 WHERE code = 'C6131A-AS2';
UPDATE objects SET coord_x = 4236, coord_y = 5212 WHERE code = 'C6131A-M1';
UPDATE objects SET coord_x = 4336, coord_y = 5212 WHERE code = 'C6131A-MS1';
UPDATE objects SET coord_x = 4036, coord_y = 5297 WHERE code = 'C6131A-Q1';
UPDATE objects SET coord_x = 4136, coord_y = 5297 WHERE code = 'C6231A-AS1';
UPDATE objects SET coord_x = 4236, coord_y = 5297 WHERE code = 'C6231A-AS2';
UPDATE objects SET coord_x = 4336, coord_y = 5297 WHERE code = 'C6231A-M1';
UPDATE objects SET coord_x = 4036, coord_y = 5397 WHERE code = 'C6231A-MS1';
UPDATE objects SET coord_x = 4136, coord_y = 5397 WHERE code = 'C6231A-Q1';
UPDATE objects SET coord_x = 4236, coord_y = 5397 WHERE code = 'EB14';
UPDATE objects SET coord_x = 4336, coord_y = 5397 WHERE code = 'YB119';
UPDATE objects SET coord_x = 5035, coord_y = 5212 WHERE code = '0162-AH2';
UPDATE objects SET coord_x = 5135, coord_y = 5212 WHERE code = '0162-AH4';
UPDATE objects SET coord_x = 5235, coord_y = 5212 WHERE code = '8161-AH2';
UPDATE objects SET coord_x = 5335, coord_y = 5212 WHERE code = '8162-AH1';
UPDATE objects SET coord_x = 5435, coord_y = 5212 WHERE code = '8162-AH5';
UPDATE objects SET coord_x = 5535, coord_y = 5212 WHERE code = 'C6171A-AS1';
UPDATE objects SET coord_x = 5544, coord_y = 5212 WHERE code = 'C6171A-AS2';
UPDATE objects SET coord_x = 5035, coord_y = 5212 WHERE code = 'C6171A-ESR1';
UPDATE objects SET coord_x = 5135, coord_y = 5212 WHERE code = 'C6171A-ESR2';
UPDATE objects SET coord_x = 5235, coord_y = 5212 WHERE code = 'C6171A-M1';
UPDATE objects SET coord_x = 5335, coord_y = 5212 WHERE code = 'C6271A-AS1';
UPDATE objects SET coord_x = 5435, coord_y = 5212 WHERE code = 'C6271A-AS2';
UPDATE objects SET coord_x = 5535, coord_y = 5212 WHERE code = 'C6271A-ESR1';
UPDATE objects SET coord_x = 5544, coord_y = 5212 WHERE code = 'C6271A-ESR2';
UPDATE objects SET coord_x = 5035, coord_y = 5247 WHERE code = 'C6271A-M1';
UPDATE objects SET coord_x = 5135, coord_y = 5247 WHERE code = 'DCU7555A-CU1';
UPDATE objects SET coord_x = 5235, coord_y = 5247 WHERE code = 'DCU7555A-M1';
UPDATE objects SET coord_x = 5335, coord_y = 5247 WHERE code = 'DCU7556A-CU1';
UPDATE objects SET coord_x = 5435, coord_y = 5247 WHERE code = 'DCU7556A-M1';
UPDATE objects SET coord_x = 5535, coord_y = 5247 WHERE code = 'DCU7557A-CU1';
UPDATE objects SET coord_x = 5544, coord_y = 5247 WHERE code = 'DCU7557A-M1';
UPDATE objects SET coord_x = 5035, coord_y = 5347 WHERE code = 'DCU7558A-CU1';
UPDATE objects SET coord_x = 5135, coord_y = 5347 WHERE code = 'DCU7558A-M1';
UPDATE objects SET coord_x = 5235, coord_y = 5347 WHERE code = 'DCU7581A-CU1';
UPDATE objects SET coord_x = 5335, coord_y = 5347 WHERE code = 'DCU7581A-M1';
UPDATE objects SET coord_x = 5435, coord_y = 5347 WHERE code = 'DCU7582A-CU1';
UPDATE objects SET coord_x = 5535, coord_y = 5347 WHERE code = 'DCU7582A-M1';
UPDATE objects SET coord_x = 5544, coord_y = 5347 WHERE code = 'DCU7583A-CU1';
UPDATE objects SET coord_x = 5035, coord_y = 5447 WHERE code = 'DCU7583A-M1';
UPDATE objects SET coord_x = 5135, coord_y = 5447 WHERE code = 'DCU7584A-CU1';
UPDATE objects SET coord_x = 5235, coord_y = 5447 WHERE code = 'DCU7584A-M1';
UPDATE objects SET coord_x = 5335, coord_y = 5447 WHERE code = 'DG6273A-XV1';
UPDATE objects SET coord_x = 5435, coord_y = 5447 WHERE code = 'DG6273A-XV2';
UPDATE objects SET coord_x = 5535, coord_y = 5447 WHERE code = 'DG6273A-ZS1';
UPDATE objects SET coord_x = 5544, coord_y = 5447 WHERE code = 'DG6273A-ZS2';
UPDATE objects SET coord_x = 5035, coord_y = 5482 WHERE code = 'EB15';
UPDATE objects SET coord_x = 5135, coord_y = 5482 WHERE code = 'EB16';
UPDATE objects SET coord_x = 5235, coord_y = 5482 WHERE code = 'EB17';
UPDATE objects SET coord_x = 5335, coord_y = 5482 WHERE code = 'EB18';
UPDATE objects SET coord_x = 5435, coord_y = 5482 WHERE code = 'S6371A-B1';
UPDATE objects SET coord_x = 5535, coord_y = 5482 WHERE code = 'S6371A-LSH1';
UPDATE objects SET coord_x = 5544, coord_y = 5482 WHERE code = 'S6371A-M1';
UPDATE objects SET coord_x = 5035, coord_y = 5482 WHERE code = 'S6371A-M2';
UPDATE objects SET coord_x = 5135, coord_y = 5482 WHERE code = 'S6371A-SST';
UPDATE objects SET coord_x = 5235, coord_y = 5482 WHERE code = 'TB120';
UPDATE objects SET coord_x = 5335, coord_y = 5482 WHERE code = 'TB130';
UPDATE objects SET coord_x = 3463, coord_y = 5212 WHERE code = '6111';
UPDATE objects SET coord_x = 3563, coord_y = 5212 WHERE code = '6211';
UPDATE objects SET coord_x = 3663, coord_y = 5212 WHERE code = 'C6131A-ESR1';
UPDATE objects SET coord_x = 3763, coord_y = 5212 WHERE code = 'C6131A-ESR2';
UPDATE objects SET coord_x = 3863, coord_y = 5212 WHERE code = 'C6131A-SS1';
UPDATE objects SET coord_x = 3463, coord_y = 5297 WHERE code = 'C6231A-ESR1';
UPDATE objects SET coord_x = 3563, coord_y = 5297 WHERE code = 'C6231A-ESR2';
UPDATE objects SET coord_x = 3663, coord_y = 5297 WHERE code = 'C6231A-SS1';
UPDATE objects SET coord_x = 3763, coord_y = 5297 WHERE code = 'DCU7541A-CUT';
UPDATE objects SET coord_x = 3863, coord_y = 5297 WHERE code = 'DCU7541A-M1';
UPDATE objects SET coord_x = 3463, coord_y = 5397 WHERE code = 'DCU7541A-Q1';
UPDATE objects SET coord_x = 3563, coord_y = 5397 WHERE code = 'DCU7544A-CUT';
UPDATE objects SET coord_x = 3663, coord_y = 5397 WHERE code = 'DCU7544A-M1';
UPDATE objects SET coord_x = 3763, coord_y = 5397 WHERE code = 'DCU7544A-Q1';
UPDATE objects SET coord_x = 3863, coord_y = 5397 WHERE code = 'MMU6132-JB1';
UPDATE objects SET coord_x = 3463, coord_y = 5482 WHERE code = 'MMU6132-MP1';
UPDATE objects SET coord_x = 3563, coord_y = 5482 WHERE code = 'MMU6232-JB1';
UPDATE objects SET coord_x = 3663, coord_y = 5482 WHERE code = 'MMU6232-MP1';

COMMIT;

SELECT code, coord_x, coord_y FROM objects WHERE building_id = 'b7a0aa01-0000-4b01-aa01-000000000001' ORDER BY coord_x;
