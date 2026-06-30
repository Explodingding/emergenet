-- =====================================================================
-- Move all FRN-10 objects into the staging grid
--
-- Staging zone:  x 5500–11500 cm,  y 10200–13800 cm
-- Grid layout:   20 columns × 270 cm spacing
--                objects sorted by code → predictable left-to-right order
--
-- After running this, open the dashboard, zoom to the "FRN-10 Staging"
-- zone at the bottom of the canvas, enable the placement tool (MapPin),
-- pick each object and click its target position on the floor plan.
-- =====================================================================

WITH ranked AS (
  SELECT
    id,
    code,
    (ROW_NUMBER() OVER (ORDER BY code) - 1)::int AS rn
  FROM objects
  WHERE building_id = '96656dcd-b6b6-40b5-8205-82d5b88d4a56'  -- FRN-10
    AND (is_active IS NULL OR is_active = true)
)
UPDATE objects
SET
  coord_x = 5730 + (rn % 20) * 270,
  coord_y = 10350 + (rn / 20) * 270
FROM ranked
WHERE objects.id = ranked.id;

-- Verify: list objects with their new staging coordinates
SELECT code, coord_x, coord_y
FROM objects
WHERE building_id = '96656dcd-b6b6-40b5-8205-82d5b88d4a56'
  AND (is_active IS NULL OR is_active = true)
ORDER BY coord_y, coord_x;
