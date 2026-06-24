-- ================================================================
-- Reset hard-coded coords from the OLD layout so these objects
-- re-anchor (via zone anchors) inside the NEW plan-aligned building
-- bounds. The earlier update-dxf-coords.sql positioned them in the
-- previous coordinate space (buildings at x~9300–17500), which no
-- longer matches the plan-based layout in buildings-layout.js.
-- After this, resolveCoordsCm() places them relative to current bounds.
-- ================================================================
UPDATE objects
SET coord_x = 0, coord_y = 0
WHERE code IN (
  'F10-ADP','F10-AUP','F10-DP1-3','F10-DP1-5','F10-DP1-6',
  'F10-DPG-3','F10-DPG-4','F10-DPG-5','F10-DPG-6','F10-DPG-7',
  'F10-DPG1','F10-DPG2','F10-FCP10.2','F10-FP','F10-FU-MCC',
  'F10-GEN-DP','F10-GEN-UP','F10-HOT10','F10-HP-1','F10-HP-2',
  'F10-HP-3','F10-HP-4','F10-IDC-2','F10-IDC-6-3',
  'F10-LAHTI-MCC-06','F10-LAHTI-MCC-07','F10-LUFTTECH',
  'F10-MCC-1','F10-MCC2','F10-MCC3','F10-MCC4',
  'F10-MDP-1','F10-MDP-2','F10-MDP-3','F10-MDP-7','F10-MDP-8','F10-MDP-9',
  'F10-MS-DP','F10-MZ-DP','F10-OTHER-OUTLETS','F10-PLC-2','F10-PW-DP',
  'F10-UO-DP','F10-UP1-1',
  'UTL-DP1-1','UTL-DP1-2','UTL-FMCC','UTL-UP'
);
