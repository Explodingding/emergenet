-- =====================================================================
-- Insert missing FRN-10 and UTL-01 objects found in DXF
-- Floor IDs anchored to known existing objects (avoids multi-row ambiguity)
-- Run once in Supabase SQL Editor
-- =====================================================================

INSERT INTO objects (id, code, name, building_id, type_id, primary_floor_id, is_active, coord_x, coord_y, rotation, properties)
VALUES

-- FRN-10 Level 0 m objects
(gen_random_uuid(),
 'F10-IDC-2',
 'F10 Intermediate Distribution Cabinet 2',
 '96656dcd-b6b6-40b5-8205-82d5b88d4a56',
 (SELECT type_id FROM objects WHERE code = 'F10-MCC-1'),
 (SELECT primary_floor_id FROM objects WHERE code = 'F10-FP'),
 true, 0, 0, 0, '{}'),

(gen_random_uuid(),
 'F10-PLC-2',
 'F10 SCADA PLC Panel 2 (PLC40-2, FAN 41-42)',
 '96656dcd-b6b6-40b5-8205-82d5b88d4a56',
 (SELECT type_id FROM objects WHERE code = 'PLC-FURN'),
 (SELECT primary_floor_id FROM objects WHERE code = 'F10-FP'),
 true, 0, 0, 0, '{}'),

(gen_random_uuid(),
 'F10-LUFTTECH',
 'F10 Lufttechnik Air Technology Panel',
 '96656dcd-b6b6-40b5-8205-82d5b88d4a56',
 (SELECT type_id FROM objects WHERE code = 'F10-MCC-1'),
 (SELECT primary_floor_id FROM objects WHERE code = 'F10-FP'),
 true, 0, 0, 0, '{}'),

-- FRN-10 Level 5 m objects
(gen_random_uuid(),
 'F10-IDC-6-3',
 'F10 Intermediate Distribution Cabinet 6/3',
 '96656dcd-b6b6-40b5-8205-82d5b88d4a56',
 (SELECT type_id FROM objects WHERE code = 'F10-MCC-1'),
 (SELECT primary_floor_id FROM objects WHERE code = 'F10-MDP-8'),
 true, 0, 0, 0, '{}'),

(gen_random_uuid(),
 'F10-CRAC-1',
 'F10 CRAC Cooling Unit 1',
 '96656dcd-b6b6-40b5-8205-82d5b88d4a56',
 (SELECT type_id FROM objects WHERE code = 'F10-CHILLER-1'),
 (SELECT primary_floor_id FROM objects WHERE code = 'F10-MDP-8'),
 true, 0, 0, 0, '{}'),

-- UTL-01 Level 5 m objects
(gen_random_uuid(),
 'UTL-DP1-1',
 'UTL Distribution Panel 1.1',
 'c92216bb-c77b-4f2b-8167-8f3817901d80',
 (SELECT type_id FROM objects WHERE code = 'UTL-TRDP-1.1'),
 (SELECT primary_floor_id FROM objects WHERE code = 'UTL-FMCC'),
 true, 0, 0, 0, '{}'),

(gen_random_uuid(),
 'UTL-DP1-2',
 'UTL Distribution Panel 1.2',
 'c92216bb-c77b-4f2b-8167-8f3817901d80',
 (SELECT type_id FROM objects WHERE code = 'UTL-TRDP-1.1'),
 (SELECT primary_floor_id FROM objects WHERE code = 'UTL-FMCC'),
 true, 0, 0, 0, '{}');
