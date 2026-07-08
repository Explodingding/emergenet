-- =====================================================================
-- Recalibrate UTL-01 transformer coordinates from SVG floor plan analysis
--
-- Source: public/floor-plans/utl-01-ground.svg (viewBox 32 579 1088 180)
-- Building canvas: x=5559–10753 (w=5194 cm), y=4859–5808 (h=949 cm)
--
-- Method: extracted horizontal wall y-positions and vertical x-clusters
-- from 17,288 path elements; derived room centres by equal-spacing model
-- (confirmed against actual SVG coordinate clusters ± 50 cm).
--
-- Horizontal wall positions found in SVG:
--   svg_y=590 → canvas_y=4917  (top interior wall, 58cm from exterior)
--   svg_y=668 → canvas_y=5328  (north room bottom / MV bus top)
--   svg_y=678 → canvas_y=5381  (MV bus bottom / south room top)
--   svg_y=748 → canvas_y=5750  (bottom interior wall)
--
-- Layout:
--   North row y=5122: 7 equal rooms (rooms 1-2 utility, rooms 3-7 = TRs)
--   South row y=5565: 9 equal rooms (all TRs), 555 cm wide each
--   Interior x range: 5726–10724 (9 × 555 cm or 7 × 714 cm)
-- =====================================================================

-- ── South row (y = 5565) — 9 rooms, left to right ────────────────
UPDATE objects SET coord_x =  6004, coord_y = 5565 WHERE code = 'TR-COMP-4';
UPDATE objects SET coord_x =  6559, coord_y = 5565 WHERE code = 'TR-COMP-3';
UPDATE objects SET coord_x =  7114, coord_y = 5565 WHERE code = 'TR-COMP-2';
UPDATE objects SET coord_x =  7670, coord_y = 5565 WHERE code = 'TR-COMP-1';
UPDATE objects SET coord_x =  8225, coord_y = 5565 WHERE code = 'TR-COMP-LV';
UPDATE objects SET coord_x =  8780, coord_y = 5565 WHERE code = 'TR-DP1.2';
UPDATE objects SET coord_x =  9336, coord_y = 5565 WHERE code = 'TR-DP1.3';
UPDATE objects SET coord_x =  9891, coord_y = 5565 WHERE code = 'TR-DPC';
UPDATE objects SET coord_x = 10446, coord_y = 5565 WHERE code = 'TR-DP1.1';

-- ── North row (y = 5122) — rooms 3-7 (rooms 1-2 are utility) ─────
UPDATE objects SET coord_x =  7511, coord_y = 5122 WHERE code = 'TR-DP2.2';
UPDATE objects SET coord_x =  8225, coord_y = 5122 WHERE code = 'TR-DP2.3';
UPDATE objects SET coord_x =  8939, coord_y = 5122 WHERE code = 'TR-DP2.1';
UPDATE objects SET coord_x =  9653, coord_y = 5122 WHERE code = 'TR-DPS';
UPDATE objects SET coord_x = 10367, coord_y = 5122 WHERE code = 'TR-ISOLATION';

-- ── Verify ────────────────────────────────────────────────────────
SELECT code, coord_x, coord_y
FROM objects
WHERE code IN (
  'TR-COMP-LV','TR-COMP-4','TR-COMP-3','TR-COMP-2','TR-COMP-1',
  'TR-DP1.2','TR-DP1.3','TR-DPC','TR-DP1.1',
  'TR-DP2.2','TR-DP2.3','TR-DP2.1','TR-DPS','TR-ISOLATION'
)
ORDER BY coord_y, coord_x;
