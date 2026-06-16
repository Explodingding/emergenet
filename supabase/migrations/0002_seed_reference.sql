-- =====================================================================
-- Plant Electrical Network — Reference Seed Data
-- =====================================================================
-- Layout converted from the demo dashboard: 1 px (old) = 10 cm.
-- Total plant footprint ≈ 136 m × 72 m.
--
-- Buildings:
--   UTL-01  Utility Building   — main step-down, distribution, support cabinets
--   FRN-02  Furnace Area       — furnace transformer + heating + conveyor + PLC
--   BTH-03  Batch House        — physically separate block (mixer + silo)
--
-- Showcases:
--   * relation = 'feeds'       — normal power flow (BFS propagation target)
--   * relation = 'controls'    — PLC-FURN -> FC-CONV (no power propagation)
--   * relation = 'monitors'    — MTR-MAIN -> SG-MAIN (telemetry)
--   * relation = 'backup_for'  — GEN-BACKUP -> SG-MAIN, UPS-CTRL -> PLC-FURN
-- =====================================================================

-- -------------------------- BUILDINGS ----------------------------------
insert into public.buildings (code, name, description, bounds_x, bounds_y, bounds_w, bounds_h, accent_color, display_order) values
  ('UTL-01', 'Utility Building', 'Main MV/LV step-down and support utilities', 400,  800, 3600, 5400, '#3b82f6', 1),
  ('FRN-02', 'Furnace Area',     'Process heat zone with conveyor and exhaust', 4400, 800, 5000, 5400, '#f97316', 2),
  ('BTH-03', 'Batch House',      'Separate building for batching, mixing and silo feeders', 9900, 1400, 3200, 4200, '#a855f7', 3);

-- --------------------------- FLOORS ------------------------------------
-- One ground floor per building. Add more rows later if needed (mezzanine/roof).
insert into public.floors (building_id, level, name, elevation_m)
select id, 0, 'Ground', 0.0 from public.buildings where code in ('UTL-01','FRN-02','BTH-03');

-- Utility has a mezzanine where HVAC sits
insert into public.floors (building_id, level, name, elevation_m)
select id, 1, 'Mezzanine', 4.5 from public.buildings where code = 'UTL-01';

-- Furnace has a roof for the exhaust fan
insert into public.floors (building_id, level, name, elevation_m)
select id, 2, 'Roof', 9.0 from public.buildings where code = 'FRN-02';

-- =====================================================================
-- HELPER: object insertion via codes (no UUIDs to guess)
-- =====================================================================
-- We use a temporary CTE-style insert for each object. To keep it readable
-- we use scalar subqueries inline.

-- =====================================================================
-- OBJECTS — UTILITY BUILDING
-- =====================================================================
insert into public.objects (code, name, type_id, building_id, primary_floor_id, coord_x, coord_y, rotation, properties) values
  ('T-MAIN',  'Main Transformer 15kV/0.4kV',
     (select id from public.object_types where code='transformer'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     1200, 1800, 0,
     '{"rating_kva":2500,"primary_kv":15,"secondary_v":400,"manufacturer":"ABB","installed":"2018-04-12","oil_volume_l":1200}'::jsonb),

  ('SG-MAIN', 'Main LV Switchgear',
     (select id from public.object_types where code='switchgear'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     2600, 1800, 0,
     '{"rating_amps":4000,"voltage_v":400,"sections":8,"ip_rating":"IP54","installed":"2018-05-03"}'::jsonb),

  ('UDB-1',   'Utility Distribution Board A',
     (select id from public.object_types where code='distribution_board'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     1200, 3400, 0,
     '{"rating_amps":630,"voltage_v":400}'::jsonb),

  ('UDB-2',   'Utility Distribution Board B',
     (select id from public.object_types where code='distribution_board'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     2600, 3400, 0,
     '{"rating_amps":400,"voltage_v":400}'::jsonb),

  ('UC-PUMPS','Cooling Pumps Cabinet',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     900, 4900, 0,
     '{"rating_amps":160,"ip_rating":"IP55","purpose":"Cooling water pumps"}'::jsonb),

  ('UC-COMP', 'Compressor Cabinet',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     2200, 4900, 0,
     '{"rating_amps":125,"purpose":"Air compressors"}'::jsonb),

  ('UC-HVAC', 'HVAC Control Cabinet',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=1 and building_id=(select id from public.buildings where code='UTL-01')),
     3300, 4900, 0,
     '{"rating_amps":80,"purpose":"HVAC"}'::jsonb),

  ('MTR-MAIN','Main Energy Meter',
     (select id from public.object_types where code='measurement'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     2000, 1800, 0,
     '{"protocol":"Modbus TCP","poll_seconds":5}'::jsonb),

  ('GEN-BACKUP','Diesel Backup Generator',
     (select id from public.object_types where code='generator'),
     (select id from public.buildings    where code='UTL-01'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='UTL-01')),
     3500, 5500, 0,
     '{"rating_kva":1500,"fuel_capacity_l":2000,"auto_start":true}'::jsonb);

-- =====================================================================
-- OBJECTS — FURNACE AREA
-- =====================================================================
insert into public.objects (code, name, type_id, building_id, primary_floor_id, coord_x, coord_y, rotation, properties) values
  ('T-FURN',   'Furnace Transformer',
     (select id from public.object_types where code='transformer'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     5000, 1800, 0,
     '{"rating_kva":1600,"primary_v":400,"secondary_v":690}'::jsonb),

  ('FSG',      'Furnace Main Switchgear',
     (select id from public.object_types where code='switchgear'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     6600, 1800, 0,
     '{"rating_amps":2500,"voltage_v":690}'::jsonb),

  ('FDB-1',    'Furnace DB — Zone A',
     (select id from public.object_types where code='distribution_board'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     5400, 3400, 0,
     '{"rating_amps":800}'::jsonb),

  ('FDB-2',    'Furnace DB — Zone B',
     (select id from public.object_types where code='distribution_board'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     7800, 3400, 0,
     '{"rating_amps":800}'::jsonb),

  ('FC-HEAT-1','Heating Element Cabinet 1',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     4900, 4900, 0,
     '{"rating_amps":400,"target_heater":"HTR-A"}'::jsonb),

  ('FC-HEAT-2','Heating Element Cabinet 2',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     6000, 4900, 0,
     '{"rating_amps":400,"target_heater":"HTR-B"}'::jsonb),

  ('FC-CONV',  'Conveyor Drive Cabinet',
     (select id from public.object_types where code='vfd_drive'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     7300, 4900, 0,
     '{"rating_kw":110,"input_v":400,"controls_motor":"MOT-CONV-A"}'::jsonb),

  ('FC-EXH',   'Exhaust Fan Cabinet',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=2 and building_id=(select id from public.buildings where code='FRN-02')),
     8400, 4900, 0,
     '{"rating_amps":160,"location":"Roof"}'::jsonb),

  ('PLC-FURN', 'Furnace Process PLC',
     (select id from public.object_types where code='plc'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     7300, 3700, 0,
     '{"model":"Siemens S7-1500","io_modules":12,"network":"PROFINET"}'::jsonb),

  ('UPS-CTRL', 'Control UPS',
     (select id from public.object_types where code='ups'),
     (select id from public.buildings    where code='FRN-02'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='FRN-02')),
     7800, 4200, 0,
     '{"rating_kva":10,"runtime_minutes":30,"protects":"PLC-FURN"}'::jsonb);

-- =====================================================================
-- OBJECTS — BATCH HOUSE (separate building)
-- =====================================================================
insert into public.objects (code, name, type_id, building_id, primary_floor_id, coord_x, coord_y, rotation, properties) values
  ('T-BATCH',  'Batch House Transformer',
     (select id from public.object_types where code='transformer'),
     (select id from public.buildings    where code='BTH-03'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='BTH-03')),
     10500, 2200, 0,
     '{"rating_kva":800,"primary_v":400,"secondary_v":400}'::jsonb),

  ('BHSG',     'Batch House Switchgear',
     (select id from public.object_types where code='switchgear'),
     (select id from public.buildings    where code='BTH-03'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='BTH-03')),
     12200, 2200, 0,
     '{"rating_amps":1600}'::jsonb),

  ('BHDB',     'Batch House Distribution Board',
     (select id from public.object_types where code='distribution_board'),
     (select id from public.buildings    where code='BTH-03'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='BTH-03')),
     11400, 3700, 0,
     '{"rating_amps":400}'::jsonb),

  ('BHC-MIX',  'Mixer Drives Cabinet',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='BTH-03'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='BTH-03')),
     10500, 5000, 0,
     '{"rating_amps":200}'::jsonb),

  ('BHC-SILO', 'Silo Feeders Cabinet',
     (select id from public.object_types where code='cabinet'),
     (select id from public.buildings    where code='BTH-03'),
     (select id from public.floors       where level=0 and building_id=(select id from public.buildings where code='BTH-03')),
     12300, 5000, 0,
     '{"rating_amps":160}'::jsonb);

-- =====================================================================
-- DEPENDENCIES — power flow + showcases
-- =====================================================================
-- helper: get object id by code
-- we use scalar subqueries (Postgres caches them per row → fine for seed)

-- PRIMARY POWER FLOW (relation='feeds')
insert into public.dependencies (source_id, target_id, relation, priority, properties) values
  ((select id from public.objects where code='T-MAIN'),  (select id from public.objects where code='SG-MAIN'),  'feeds', 0, '{"cable_id":"C-MAIN-01","length_m":18,"rating_amps":4000}'::jsonb),

  ((select id from public.objects where code='SG-MAIN'), (select id from public.objects where code='UDB-1'),   'feeds', 0, '{"cable_id":"C-UTL-A","length_m":22}'::jsonb),
  ((select id from public.objects where code='SG-MAIN'), (select id from public.objects where code='UDB-2'),   'feeds', 0, '{"cable_id":"C-UTL-B","length_m":24}'::jsonb),
  ((select id from public.objects where code='SG-MAIN'), (select id from public.objects where code='T-FURN'),  'feeds', 0, '{"cable_id":"C-FRN-FEED","length_m":42}'::jsonb),
  ((select id from public.objects where code='SG-MAIN'), (select id from public.objects where code='T-BATCH'), 'feeds', 0, '{"cable_id":"C-BTH-FEED","length_m":68}'::jsonb),

  ((select id from public.objects where code='UDB-1'),   (select id from public.objects where code='UC-PUMPS'),'feeds', 0, '{"cable_id":"C-UDB1-P"}'::jsonb),
  ((select id from public.objects where code='UDB-1'),   (select id from public.objects where code='UC-COMP'), 'feeds', 0, '{"cable_id":"C-UDB1-C"}'::jsonb),
  ((select id from public.objects where code='UDB-2'),   (select id from public.objects where code='UC-HVAC'), 'feeds', 0, '{"cable_id":"C-UDB2-H"}'::jsonb),

  ((select id from public.objects where code='T-FURN'),  (select id from public.objects where code='FSG'),     'feeds', 0, '{"cable_id":"C-FRN-MAIN","length_m":16}'::jsonb),
  ((select id from public.objects where code='FSG'),     (select id from public.objects where code='FDB-1'),   'feeds', 0, null),
  ((select id from public.objects where code='FSG'),     (select id from public.objects where code='FDB-2'),   'feeds', 0, null),

  ((select id from public.objects where code='FDB-1'),   (select id from public.objects where code='FC-HEAT-1'),'feeds', 0, null),
  ((select id from public.objects where code='FDB-1'),   (select id from public.objects where code='FC-HEAT-2'),'feeds', 0, null),
  ((select id from public.objects where code='FDB-2'),   (select id from public.objects where code='FC-CONV'), 'feeds', 0, null),
  ((select id from public.objects where code='FDB-2'),   (select id from public.objects where code='FC-EXH'),  'feeds', 0, null),
  ((select id from public.objects where code='FDB-2'),   (select id from public.objects where code='PLC-FURN'),'feeds', 0, '{"note":"normal supply"}'::jsonb),
  ((select id from public.objects where code='FDB-2'),   (select id from public.objects where code='UPS-CTRL'),'feeds', 0, null),

  ((select id from public.objects where code='T-BATCH'), (select id from public.objects where code='BHSG'),    'feeds', 0, null),
  ((select id from public.objects where code='BHSG'),    (select id from public.objects where code='BHDB'),    'feeds', 0, null),
  ((select id from public.objects where code='BHDB'),    (select id from public.objects where code='BHC-MIX'), 'feeds', 0, null),
  ((select id from public.objects where code='BHDB'),    (select id from public.objects where code='BHC-SILO'),'feeds', 0, null);

-- BACKUP supplies (relation='backup_for', priority=1)
insert into public.dependencies (source_id, target_id, relation, priority, properties) values
  ((select id from public.objects where code='GEN-BACKUP'), (select id from public.objects where code='SG-MAIN'),  'backup_for', 1, '{"transfer_time_s":15,"capacity_pct":60}'::jsonb),
  ((select id from public.objects where code='UPS-CTRL'),   (select id from public.objects where code='PLC-FURN'), 'backup_for', 1, '{"transfer_time_s":0,"runtime_min":30}'::jsonb);

-- CONTROL relationships (relation='controls' — does NOT propagate power fault)
insert into public.dependencies (source_id, target_id, relation, priority, properties) values
  ((select id from public.objects where code='PLC-FURN'), (select id from public.objects where code='FC-CONV'),   'controls', 0, '{"signal":"PROFINET","function":"speed_setpoint"}'::jsonb),
  ((select id from public.objects where code='PLC-FURN'), (select id from public.objects where code='FC-HEAT-1'), 'controls', 0, '{"signal":"4-20mA","function":"temperature_setpoint"}'::jsonb),
  ((select id from public.objects where code='PLC-FURN'), (select id from public.objects where code='FC-HEAT-2'), 'controls', 0, '{"signal":"4-20mA","function":"temperature_setpoint"}'::jsonb);

-- MONITORING relationships (relation='monitors')
insert into public.dependencies (source_id, target_id, relation, priority, properties) values
  ((select id from public.objects where code='MTR-MAIN'), (select id from public.objects where code='SG-MAIN'), 'monitors', 0, '{"poll_s":5,"variables":["kW","kVAr","cosphi","kWh"]}'::jsonb);
