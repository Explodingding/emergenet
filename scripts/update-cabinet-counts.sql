-- =====================================================================
-- Set num_cabinets property on multi-cabinet distribution panels
-- Run in Supabase SQL editor
-- =====================================================================

UPDATE objects
SET properties = properties || '{"num_cabinets": 4}'::jsonb
WHERE code = 'F10-GEN-DP';

-- Verify
SELECT code, name, properties->>'num_cabinets' AS num_cabinets
FROM objects
WHERE code = 'F10-GEN-DP';
