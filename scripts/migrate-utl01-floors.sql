-- =====================================================================
-- UTL-01 object floor corrections
-- TC1–TC4 MV panels moved from Level 0 m → Level 5 m
-- Run once in Supabase SQL Editor
-- =====================================================================

-- Anchor to an existing UTL-01 object already on Level 5 m to avoid
-- ambiguity when multiple buildings share the same floor name.
UPDATE objects
SET primary_floor_id = (SELECT primary_floor_id FROM objects WHERE code = 'UTL-FMCC')
WHERE code IN (
  'TC1-BUS-TIE',
  'TC1-COMP-PANEL',
  'TC1-INPUT',
  'TC1-OUTPUT',
  'TC1-RING',
  'TC2-COMP-PANEL',
  'TC2-INPUT',
  'TC2-OUTPUT',
  'TC3-INPUT',
  'TC3-OUTPUT',
  'TC3-RING',
  'TC4-COMP-PANEL',
  'TC4-INPUT',
  'TC4-OUTPUT',
  'TC4-RING',
  'TC4-RING-INPUT'
);
