-- =====================================================================
-- Migration 0011 — assign location_code to objects.properties
-- =====================================================================
-- Location codes follow the SLD format:  BLDG-ZONE-ELEV-ROOM
-- e.g.  UTB-Y1-5.5-LVR,  F10-A1-0.0-FPR,  BAH-12.0-CPC
--
-- This migration:
--   1. Back-fills location_code into objects.properties from
--      staging_objects source notes where the pattern is present.
--   2. Assigns location_code explicitly for objects whose position we
--      know from the original SLD panel schedules (Panel 1.1 / 1.2).
--   3. Sets grid-slot coords for each building/floor/room group.
-- =====================================================================

-- ─── STEP 1: Back-fill from staging_objects.source_notes ─────────────────
-- Some staging records have the location code embedded in source_notes.
-- We extract it with a regex pattern like "UTB-Y1-5.5-LVR".
UPDATE public.objects o
SET properties = o.properties || jsonb_build_object(
    'location_code',
    substring(s.source_notes FROM '[A-Z0-9]+-[A-Z0-9]+-[0-9.]+(?:-[A-Z0-9]+)?')
  )
FROM public.staging_objects s
WHERE s.promoted_object_id = o.id
  AND s.source_notes ~* '[A-Z]+-[A-Z0-9]+-[0-9.]+-[A-Z]+'
  AND (o.properties->>'location_code') IS NULL;


-- ─── STEP 2: Explicit assignment from Panel 1.1 schedule ─────────────────
-- Source: "Panel 1.1  Location ... F1-MDP-1 400V/230V  F10-A1-0.0-FPR"
-- Objects originally at F10-A1-0.0-FPR  (Fan Panel Room Right, FRN-10 ground)
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-0.0-FPR"}'::jsonb
WHERE code IN ('F1-MDP-1','F1-MDP-2');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-0.0-FPL"}'::jsonb
WHERE code IN ('F1-MDP-3','F1-MDP-4');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-0.0-VPR"}'::jsonb
WHERE code IN ('F1-MDP-7');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-9.0-FH1"}'::jsonb
WHERE code IN ('FH10');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-0.0-CFS"}'::jsonb
WHERE code IN ('FUR-10-CFS','ACH-01','ACH-02');

-- Panel 1.1 — UTL-01 Level 5 (LVR)
UPDATE public.objects SET properties = properties || '{"location_code":"UTB-Y1-5.5-LVR"}'::jsonb
WHERE code IN ('TR-DP1','TR-DP1-PFC','TR-DP1-2-PFC','UTL-FMCC');

-- Panel 1.1 — Foreheart transformers Level 9
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-9.0-FH1"}'::jsonb
WHERE code LIKE 'FHDP-1%' OR code LIKE 'SPDB-1%' OR code LIKE 'SPDB-2%';

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-9.0-FH2"}'::jsonb
WHERE code LIKE 'FHDP-2%' OR code LIKE 'SPDB-3%' OR code LIKE 'SPDB-4%';

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-9.0-FH3"}'::jsonb
WHERE code LIKE 'FHDP-3%' OR code LIKE 'SPDB-5%' OR code LIKE 'SPDB-6%';

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-9.0-FH4"}'::jsonb
WHERE code LIKE 'FHDP-4%' OR code LIKE 'SPDB-7%' OR code LIKE 'SPDB-8%';

-- Panel 1.1 — Vacuum Compressors (VCC room, FRN-10 ground)
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-0.0-VCC"}'::jsonb
WHERE code LIKE 'F10-VAC-%';

-- Panel 1.1 — Fan rooms (FRL / FRR)
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-0.0-FRL"}'::jsonb
WHERE code LIKE 'F10-ECF-14-%' OR code LIKE 'F10-CCF-13%' OR code LIKE 'F10-CCF-14%'
   OR code LIKE 'F10-VCF-13%' OR code LIKE 'F10-ECF-13-%';

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-0.0-FRR"}'::jsonb
WHERE code LIKE 'F10-ECF-12-%' OR code LIKE 'F10-CCF-11%' OR code LIKE 'F10-CCF-12%'
   OR code LIKE 'F10-VCF-11%' OR code LIKE 'F10-ECF-11-%';

-- Panel 1.1 — Furnace room  (FUR)
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-0.0-FUR"}'::jsonb
WHERE code IN ('F1-MCC-1','F1-MCC1');


-- ─── STEP 3: Panel 1.2 objects ───────────────────────────────────────────
-- UTL-01 Level 5 — UPS room
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-5.5-UPS"}'::jsonb
WHERE code IN ('F1-MDP-8','F1-MZ-DP','HOT10','F1-DP1-4');

-- UTL-01 — Batch House Ground Panel
UPDATE public.objects SET properties = properties || '{"location_code":"BAH-0.0-GPR"}'::jsonb
WHERE code IN ('BH-MDP','BH-DP1');

-- UTL-01 — 7bar Compressor (CPH room, Y3)
UPDATE public.objects SET properties = properties || '{"location_code":"UTB-Y3-0.0-CPH"}'::jsonb
WHERE code IN ('UTL-COMP7-2','UT-COMP7-2');

-- UTL-01 — 4bar Compressor (CPH room, Y2)
UPDATE public.objects SET properties = properties || '{"location_code":"UTB-Y2-0.0-CPH"}'::jsonb
WHERE code IN ('UTL-COMP4-1','UT-COMP4-1','UTL-DRY4-1','UT-DRY4-1');

-- UTL-01 — Safety panel (STR room)
UPDATE public.objects SET properties = properties || '{"location_code":"UTB-Y1-0.0-STR"}'::jsonb
WHERE code IN ('UTL-SAFETY-PANEL','UTL-LP4','UT-LP4');

-- FRN-10 — service rooms Ground
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-FLR"}'::jsonb
WHERE code IN ('F1-DPG-3','F1-DPG3');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-MLR"}'::jsonb
WHERE code IN ('F1-DPG-4','F1-DPG4');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-CNC"}'::jsonb
WHERE code IN ('F1-DPG-5','F1-DPG5');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-MTR"}'::jsonb
WHERE code IN ('MS-DP');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-HSE"}'::jsonb
WHERE code IN ('F1-ADP');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-UTW"}'::jsonb
WHERE code IN ('UT-DP');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-UTR"}'::jsonb
WHERE code IN ('F1-GEN-DP','F1-MCC2','F1-MCC3','F1-MCC4');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-0.0-LTR"}'::jsonb
WHERE code IN ('F1-MCC-2');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A4-0.0-PEL"}'::jsonb
WHERE code IN ('PW-DP');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A3-0.0-RPL"}'::jsonb
WHERE code IN ('F1-DPG-6','F1-DPG-7','F1-DPG6','F1-DPG7');

-- FRN-10 — Level 5 rooms
UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-5.5-BMR"}'::jsonb
WHERE code IN ('F1-DP1-1','F1-DP1-2','FCP10-1','FCP10-2');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-5.5-BTH"}'::jsonb
WHERE code IN ('F1-DP1-3');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A2-5.5-CRA"}'::jsonb
WHERE code IN ('F1-DP1-5','F1-DP1-6');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-5.5-RFR"}'::jsonb
WHERE code IN ('RFP10-1');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-5.5-RFL"}'::jsonb
WHERE code IN ('RFP10-2');

UPDATE public.objects SET properties = properties || '{"location_code":"F10-A1-5.5-BTR"}'::jsonb
WHERE code IN ('F1-HP-1','F1-HP-2','F1-HP-3','F1-HP-4');

-- BTH-03 — Batch House levels
UPDATE public.objects SET properties = properties || '{"location_code":"BAH-12.0-CPC"}'::jsonb
WHERE code IN ('BH-UDP','LAHTI-MCC01','LAHTI-MCC02','LAHTI-MCC03','LAHTI-MCC04','LAHTI-MCC05');

UPDATE public.objects SET properties = properties || '{"location_code":"BAH-0.0-GPR"}'::jsonb
WHERE code LIKE 'BH-%' AND (properties->>'location_code') IS NULL;


-- ─── STEP 4: MV objects in UTL-01 (MVC / MV corridor) ───────────────────
UPDATE public.objects SET properties = properties || '{"location_code":"UTB-Y1-0.0-MVC"}'::jsonb
WHERE code LIKE 'MV-%' OR code LIKE 'TC%' OR code LIKE 'TR-COMP%'
  AND (properties->>'location_code') IS NULL;

-- Utility Building top-level objects (main meter, generator, backup)
UPDATE public.objects SET properties = properties || '{"location_code":"UTB-Y3-0.0-GSR"}'::jsonb
WHERE code LIKE 'GEN-%' OR code = 'GEN-BACKUP'
  AND (properties->>'location_code') IS NULL;

UPDATE public.objects SET properties = properties || '{"location_code":"UTB-Y2-0.0-UTR"}'::jsonb
WHERE code = 'MTR-MAIN'
  AND (properties->>'location_code') IS NULL;


-- ─── STEP 5: Recompute coordinates from location_code ────────────────────
-- This is handled in the application layer (useNetworkTopology hook) which
-- reads location_code from properties and maps it via lib/room-anchors.js.
-- Objects without a location_code retain their current coord_x / coord_y.
