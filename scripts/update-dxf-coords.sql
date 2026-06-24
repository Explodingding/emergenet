-- ================================================================
-- Set coord_x / coord_y for FRN-10 and UTL-01 objects from DXF
-- coord_x mapped from DXF section-view X position
-- coord_y set to building centre (plan view has no cross-section)
-- ================================================================

UPDATE objects SET coord_x = 14625, coord_y = 7250 WHERE code = 'F10-ADP';
UPDATE objects SET coord_x = 14686, coord_y = 7250 WHERE code = 'F10-AUP';
UPDATE objects SET coord_x = 12475, coord_y = 7250 WHERE code = 'F10-DP1-3';
UPDATE objects SET coord_x = 14733, coord_y = 7250 WHERE code = 'F10-DP1-5';
UPDATE objects SET coord_x = 14666, coord_y = 7250 WHERE code = 'F10-DP1-6';
UPDATE objects SET coord_x = 13080, coord_y = 7250 WHERE code = 'F10-DPG-3';
UPDATE objects SET coord_x = 13030, coord_y = 7250 WHERE code = 'F10-DPG-4';
UPDATE objects SET coord_x = 14600, coord_y = 7250 WHERE code = 'F10-DPG-5';
UPDATE objects SET coord_x = 17115, coord_y = 7250 WHERE code = 'F10-DPG-6';
UPDATE objects SET coord_x = 16988, coord_y = 7250 WHERE code = 'F10-DPG-7';
UPDATE objects SET coord_x = 10980, coord_y = 7250 WHERE code = 'F10-DPG1';
UPDATE objects SET coord_x = 10866, coord_y = 7250 WHERE code = 'F10-DPG2';
UPDATE objects SET coord_x = 12417, coord_y = 7250 WHERE code = 'F10-FCP10.2';
UPDATE objects SET coord_x = 12472, coord_y = 7250 WHERE code = 'F10-FP';
UPDATE objects SET coord_x = 12684, coord_y = 7250 WHERE code = 'F10-FU-MCC';
UPDATE objects SET coord_x = 14711, coord_y = 7250 WHERE code = 'F10-GEN-DP';
UPDATE objects SET coord_x = 14711, coord_y = 7250 WHERE code = 'F10-GEN-UP';
UPDATE objects SET coord_x = 13383, coord_y = 7250 WHERE code = 'F10-HOT10';
UPDATE objects SET coord_x = 12523, coord_y = 7250 WHERE code = 'F10-HP-1';
UPDATE objects SET coord_x = 12636, coord_y = 7250 WHERE code = 'F10-HP-2';
UPDATE objects SET coord_x = 12523, coord_y = 7250 WHERE code = 'F10-HP-3';
UPDATE objects SET coord_x = 12523, coord_y = 7250 WHERE code = 'F10-HP-4';
UPDATE objects SET coord_x = 11070, coord_y = 7250 WHERE code = 'F10-IDC-2';
UPDATE objects SET coord_x = 12523, coord_y = 7250 WHERE code = 'F10-IDC-6-3';
UPDATE objects SET coord_x = 9380, coord_y = 7250 WHERE code = 'F10-LAHTI-MCC-06';
UPDATE objects SET coord_x = 9674, coord_y = 7250 WHERE code = 'F10-LAHTI-MCC-07';
UPDATE objects SET coord_x = 11070, coord_y = 7250 WHERE code = 'F10-LUFTTECH';
UPDATE objects SET coord_x = 10242, coord_y = 7250 WHERE code = 'F10-MCC-1';
UPDATE objects SET coord_x = 13564, coord_y = 7250 WHERE code = 'F10-MCC2';
UPDATE objects SET coord_x = 13596, coord_y = 7250 WHERE code = 'F10-MCC3';
UPDATE objects SET coord_x = 15664, coord_y = 7250 WHERE code = 'F10-MCC4';
UPDATE objects SET coord_x = 10998, coord_y = 7250 WHERE code = 'F10-MDP-1';
UPDATE objects SET coord_x = 10947, coord_y = 7250 WHERE code = 'F10-MDP-2';
UPDATE objects SET coord_x = 10994, coord_y = 7250 WHERE code = 'F10-MDP-3';
UPDATE objects SET coord_x = 10485, coord_y = 7250 WHERE code = 'F10-MDP-7';
UPDATE objects SET coord_x = 13383, coord_y = 7250 WHERE code = 'F10-MDP-8';
UPDATE objects SET coord_x = 13069, coord_y = 7250 WHERE code = 'F10-MDP-9';
UPDATE objects SET coord_x = 15569, coord_y = 7250 WHERE code = 'F10-MS-DP';
UPDATE objects SET coord_x = 13383, coord_y = 7250 WHERE code = 'F10-MZ-DP';
UPDATE objects SET coord_x = 17385, coord_y = 7250 WHERE code = 'F10-OTHER-OUTLETS';
UPDATE objects SET coord_x = 10868, coord_y = 7250 WHERE code = 'F10-PLC-2';
UPDATE objects SET coord_x = 16111, coord_y = 7250 WHERE code = 'F10-PW-DP';
UPDATE objects SET coord_x = 10873, coord_y = 7250 WHERE code = 'F10-UO-DP';
UPDATE objects SET coord_x = 13297, coord_y = 7250 WHERE code = 'F10-UP1-1';
UPDATE objects SET coord_x = 9846, coord_y = 5025 WHERE code = 'UTL-DP1-1';
UPDATE objects SET coord_x = 10445, coord_y = 5025 WHERE code = 'UTL-DP1-2';
UPDATE objects SET coord_x = 9759, coord_y = 5025 WHERE code = 'UTL-FMCC';
UPDATE objects SET coord_x = 14680, coord_y = 5025 WHERE code = 'UTL-UP';
