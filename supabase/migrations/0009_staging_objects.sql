-- =====================================================================
-- 0009 — Staging / review table for real SPE objects
-- =====================================================================
-- Workflow:
--   1. Objects extracted from drawings land here as 'draft'
--   2. Engineer reviews each row: fills gaps, merges duplicates, sets 'approved'
--   3. Approved rows are promoted to the live objects + dependencies tables
--      (either manually via Studio or via a future 001x migration)
--
-- Source document:
--   CNRBE-PMEP20-AB-XXX-SMT-5255 — Belgium MV Distribution System Riser Plan
--   Rev A.02, 29/09/2025, DT Construction LLC, Lommel
-- =====================================================================

-- =====================================================================
-- TABLE DEFINITION
-- =====================================================================
create table public.staging_objects (
  id                  uuid primary key default gen_random_uuid(),

  -- Drawing identification
  tag                 text unique,            -- SPE drawing tag  (e.g. "66-15-014a-3", "H05")
  proposed_code       text,                   -- short code to use in objects table

  -- Core fields (mirrors objects table)
  name                text not null,
  type_code           text,                   -- references object_types.code (text, no FK — flexible)
  building_code       text,                   -- references buildings.code  (text, no FK)
  floor_name          text not null default 'Ground',
  coord_x             integer,                -- null = not yet positioned on map
  coord_y             integer,
  rotation            smallint not null default 0,
  properties          jsonb not null default '{}',

  -- Review metadata
  source_doc          text,                   -- filename the data came from
  source_notes        text,                   -- assumptions, gaps, conflicts with demo data
  confidence          text not null default 'medium'
                        check (confidence in ('high','medium','low')),
  status              text not null default 'draft'
                        check (status in ('draft','reviewed','approved','rejected','merged')),
  merge_into_tag      text,                   -- set when this row is a duplicate of another tag
  reviewed_by         text,
  reviewed_at         timestamptz,
  promoted_object_id  uuid,                   -- filled after promotion to objects table
  promoted_at         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index staging_status_idx    on public.staging_objects(status);
create index staging_building_idx  on public.staging_objects(building_code);
create index staging_type_idx      on public.staging_objects(type_code);

create trigger trg_staging_objects_updated_at
  before update on public.staging_objects
  for each row execute function public.tg_set_updated_at();

-- RLS: public read, authenticated write (matches rest of schema)
alter table public.staging_objects enable row level security;

create policy "public_read_staging_objects"  on public.staging_objects
  for select to anon, authenticated using (true);
create policy "auth_insert_staging_objects"  on public.staging_objects
  for insert to authenticated with check (true);
create policy "auth_update_staging_objects"  on public.staging_objects
  for update to authenticated using (true) with check (true);
create policy "auth_delete_staging_objects"  on public.staging_objects
  for delete to authenticated using (true);


-- =====================================================================
-- SEED — all objects extracted from CNRBE-PMEP20-AB-XXX-SMT-5255
-- =====================================================================

-- -----------------------------------------------------------------------
-- GROUP 1: Distribution Building MV Panel  (building not yet in DB → DST-01)
-- Schneider GHA 40.5-31-12  |  40.5 kV, 1250 A, 31.5 kA (1s)
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  ('H05','DST-MV-H05','Distribution MV Bus Coupler 1 (Koppelcel 1)','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"bus_coupler"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Distribution Building not yet in buildings table — create DST-01 first','high','draft'),

  ('H06','DST-MV-H06','Distribution MV Feeder Fluvius 1 (incoming grid)','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"incoming_fluvius_1","cable":"EAXECWB 3X1X630/35+(1x630 spare)-np 20.8/36kV 5.5km"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('H07','DST-MV-H07','Distribution MV Outgoing Cinerglas 1 (to Utility)','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"outgoing_utility_1"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('H08','DST-MV-H08','Distribution MV Reserve 1','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"spare"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('H01','DST-MV-H01','Distribution MV Reserve 2','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"spare"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('H02','DST-MV-H02','Distribution MV Feeder Fluvius 2 (incoming grid)','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"incoming_fluvius_2","cable":"EAXECWB 3X1X630/35-np 20.8/36kV 5.5km"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('H03','DST-MV-H03','Distribution MV Outgoing Cinerglas 2 (to Utility)','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"outgoing_utility_2"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('H04','DST-MV-H04','Distribution MV Bus Coupler 2 (Koppelcel 2)','switchgear','DST-01','Ground',
   '{"voltage_kv":40.5,"rating_amps":1250,"breaking_ka":31.5,"breaker":"Schneider GHA 40.5-31-12","function":"bus_coupler"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft');


-- -----------------------------------------------------------------------
-- GROUP 2: UTL-01 Main MV Panel — Incoming bus (HZ01_VT / HZ01)
-- VCB-3AH5  |  26-30 kV (Ur 36 kV), 1250 A, 25 kA/3s
-- CT: 1000-500/1-1A  |  VT: 26-30/0.11 kV
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  ('66-15-014a-3','MV-SUPPLY-1','MV Main Supply 1 — HZ01_VT (incoming from DST)','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"duration_s":3,"breaker":"VCB-3AH5","busbar":"HZ01_VT","ct":"1000-500/1-1A 5P20/0.5SFS10 5VA","vt":"26-30/0.11kV Cl0.5 10VA / Cl3P 90VA","function":"incoming","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','May replace demo object SG-MAIN (main switchgear). Check if T-MAIN demo should become TR2.x.','high','draft'),

  ('66-15-014a-4','MV-SUPPLY-2','MV Main Supply 2 — HZ01 (incoming from DST)','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"duration_s":3,"breaker":"VCB-3AH5","busbar":"HZ01","ct":"1000-500/1-1A 5P20/0.5FS5 5VA","vt":"26-30/0.11kV Cl0.5 10VA / Cl3P 90VA","function":"incoming","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('66-15-014b-3','MV-SPARE-1','MV Outgoing Spare 1 — HZ01.1','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","busbar":"HZ01.1","function":"spare","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('66-15-014b-4','MV-SPARE-2','MV Outgoing Spare 2 — HZ01.1','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","busbar":"HZ01.1","function":"spare","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('66-15-014b-5','MV-OUT-FRN10','MV Outgoing Feeder — FUR 10 (HZ01.1)','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","busbar":"HZ01.1","function":"outgoing_furnace_10","feeder":"1250A","cable":"3(1x95)mm2 35kV EXeCG"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  ('66-15-014b-6','MV-OUT-FRN20','MV Outgoing Feeder — FUR 20 (HZ01.1)','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","busbar":"HZ01.1","function":"outgoing_furnace_20","feeder":"1250A","cable":"3(1x95)mm2 35kV EXeCG"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft');


-- -----------------------------------------------------------------------
-- GROUP 3: UTL-01 — SICAM-Q100 Energy Quality Analyzers
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  ('66-15-014j-1','MV-SICAM-1','Energy Quality Analyzer SICAM-Q100 (Supply 1)','measurement','UTL-01','Ground',
   '{"model":"SICAM-Q100","manufacturer":"Siemens","mounted_on_cubicle":"66-15-014a-3","function":"mv_power_quality"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','May replace demo object MTR-MAIN','high','draft'),

  ('66-15-014j-2','MV-SICAM-2','Energy Quality Analyzer SICAM-Q100 (Supply 2)','measurement','UTL-01','Ground',
   '{"model":"SICAM-Q100","manufacturer":"Siemens","mounted_on_cubicle":"66-15-014a-4","function":"mv_power_quality"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft');


-- -----------------------------------------------------------------------
-- GROUP 4: UTL-01 MV Panel — Furnace 10 feeder section (HZ01_F10)
-- VCB-3AH5  |  800A feeders except FRN10 input (1250A) and ring (1250A)
-- Exact 014f-x cubicle numbers not yet confirmed from drawing
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  ('66-15-014f-?-FRN10-INPUT','MV-F10-INPUT','MV Furnace 10 Input Cubicle — HZ01_F10','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","busbar":"HZ01_F10","function":"furnace_10_input","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag (014f-?) not confirmed — verify on physical drawing','medium','draft'),

  ('66-15-014f-?-TR1-1','MV-TR1-1-FEED','MV Feeder Cubicle — TR 1.1','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-1.1","feeder":"800A","ct":"60/1-1A 5P20/0.5FS5 5VA"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-TR1-2','MV-TR1-2-FEED','MV Feeder Cubicle — TR 1.2','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-1.2","feeder":"800A","ct":"60/1-1A 5P20/0.5FS5 5VA"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-TR1-3','MV-TR1-3-FEED','MV Feeder Cubicle — TR 1.3','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-1.3","feeder":"800A","ct":"60/1-1A 5P20/0.5FS5 5VA"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-TR1-SPARE','MV-TR1-SPARE-FEED','MV Feeder Cubicle — TR 1 Spare','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder_spare","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-TCOMP-LV','MV-TCOMP-LV-FEED','MV Feeder Cubicle — TR Compressor LV','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-COMP-LV","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST1-1','MV-BOOST1-1-FEED','MV Feeder Cubicle — TR Boosting 1.1','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-1.1","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST1-2','MV-BOOST1-2-FEED','MV Feeder Cubicle — TR Boosting 1.2','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-1.2","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST1-3','MV-BOOST1-3-FEED','MV Feeder Cubicle — TR Boosting 1.3','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-1.3","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST1-4','MV-BOOST1-4-FEED','MV Feeder Cubicle — TR Boosting 1.4','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-1.4","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','medium','draft'),

  ('66-15-014f-?-RING-10-20','MV-RING-10-20','MV Ring Tie 10–20 (HZ01_F10 side)','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","function":"ring_tie","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Ring connects Furnace 10 and Furnace 20 MV busbars; exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-SPARE-F10','MV-SPARE-F10','MV Spare Cubicle — F10 section','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"spare"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact cubicle tag not confirmed','low','draft');


-- -----------------------------------------------------------------------
-- GROUP 5: UTL-01 MV Panel — Furnace 20 feeder section (HZ01_F20)
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  ('66-15-014f-?-FRN20-INPUT','MV-F20-INPUT','MV Furnace 20 Input Cubicle — HZ01_F20','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","busbar":"HZ01_F20","function":"furnace_20_input","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-TR2-1','MV-TR2-1-FEED','MV Feeder Cubicle — TR 2.1','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-2.1","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-TR2-2','MV-TR2-2-FEED','MV Feeder Cubicle — TR 2.2','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-2.2","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-TR2-3','MV-TR2-3-FEED','MV Feeder Cubicle — TR 2.3','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-2.3","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-TCOMP4','MV-TCOMP4-FEED','MV Feeder Cubicle — TR Compressor-4 (UT-COMP 4.6-4)','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"UT-COMP-4.6-4","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-WH','MV-WH-FEED','MV Feeder Cubicle — Warehouse','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST2-1','MV-BOOST2-1-FEED','MV Feeder Cubicle — TR Boosting 2.1','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-2.1","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST2-2','MV-BOOST2-2-FEED','MV Feeder Cubicle — TR Boosting 2.2','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-2.2","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST2-3','MV-BOOST2-3-FEED','MV Feeder Cubicle — TR Boosting 2.3','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-2.3","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-BOOST2-4','MV-BOOST2-4-FEED','MV Feeder Cubicle — TR Boosting 2.4','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder","feeds_transformer":"TR-BOOSTING-2.4","feeder":"800A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','medium','draft'),

  ('66-15-014f-?-RING-20-10','MV-RING-20-10','MV Ring Tie 20–10 (HZ01_F20 side)','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","function":"ring_tie","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Ring connects Furnace 20 and Furnace 10 MV busbars','medium','draft'),

  ('66-15-014f-?-SPARE-F20','MV-SPARE-F20','MV Spare Cubicle — F20 section','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"spare"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag not confirmed','low','draft');


-- -----------------------------------------------------------------------
-- GROUP 6: UTL-01 MV Panel — Warehouse / additional section
-- Tags confirmed from PDF
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  ('66-15-014d-1','MV-WH-INPUT','MV Warehouse Input Cubicle — HZ01_W','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"incoming","feeder":"800A","ct":"80/1-1A 5P20/0.5FS5 5VA","cable":"3(1x95)mm2+1x95 spare 35kV EXeCG 20m"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Tag confirmed in PDF','high','draft'),

  ('66-15-014d-3','MV-TR-SPARE','MV Feeder Cubicle — TR Spare','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":800,"breaking_ka":25,"breaker":"VCB-3AH5","function":"tr_feeder_spare","feeder":"800A","ct":"150/1-1A 5P20/0.5FS5 5VA","cable":"3(1x240)mm2 35kV EXeCG 25m"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Tag confirmed in PDF','high','draft'),

  ('66-15-014d-4','MV-PV-FUTURE','MV Future Expansion — PV Panels','switchgear','UTL-01','Ground',
   '{"voltage_kv":36,"rating_amps":1250,"breaking_ka":25,"breaker":"VCB-3AH5","function":"future_pv","feeder":"1250A","ct":"150/1-1A 5P20/0.5FS5 5VA"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Tag confirmed in PDF. For future PV panel connection.','high','draft');


-- -----------------------------------------------------------------------
-- GROUP 7: MV/6kV Compressor Transformers (step-down for turbo compressors)
-- Tags confirmed: UT-COMP 4.6-1 through 4.6-4
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  ('UT-COMP-4.6-1','TR-COMP-1','Turbo Compressor Transformer 1 (MV/6kV)','transformer','UTL-01','Ground',
   '{"voltage_primary_kv":36,"voltage_secondary_kv":6,"function":"compressor_supply","feeds_panel":"TC-1-MV-PANEL"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Rating kVA not confirmed — check nameplate or LV SLD','medium','draft'),

  ('UT-COMP-4.6-2','TR-COMP-2','Turbo Compressor Transformer 2 (MV/6kV)','transformer','UTL-01','Ground',
   '{"voltage_primary_kv":36,"voltage_secondary_kv":6,"function":"compressor_supply","feeds_panel":"TC-2-MV-PANEL"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Rating kVA not confirmed','medium','draft'),

  ('UT-COMP-4.6-3','TR-COMP-3','Turbo Compressor Transformer 3 (MV/6kV)','transformer','UTL-01','Ground',
   '{"voltage_primary_kv":36,"voltage_secondary_kv":6,"function":"compressor_supply","feeds_panel":"TC-3-MV-PANEL"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Rating kVA not confirmed','medium','draft'),

  ('UT-COMP-4.6-4','TR-COMP-4','Turbo Compressor Transformer 4 (MV/6kV)','transformer','UTL-01','Ground',
   '{"voltage_primary_kv":36,"voltage_secondary_kv":6,"function":"compressor_supply","feeds_panel":"TC-4-MV-PANEL"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Rating kVA not confirmed','medium','draft');


-- -----------------------------------------------------------------------
-- GROUP 8: Turbo Compressor 6kV Panels (VCB-SION, 6kV / Ur 12kV)
-- TC-1 and TC-2 share tag series 66-15-014l-1…6, 66-15-014m-1/2
-- TC-3 uses 66-15-014l-7…9, 66-15-014m-3
-- TC-4 uses 66-15-014n-1…4
-- Each panel: 2× 1600A incomer/tie + 2× 800A outgoing + compensation panel
-- -----------------------------------------------------------------------
insert into public.staging_objects
  (tag, proposed_code, name, type_code, building_code, floor_name, properties, source_doc, source_notes, confidence, status)
values
  -- TC-1 Panel
  ('66-15-014l-1','TC1-INPUT','Turbo Compressor 1 — MV Panel Input (1600A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":1600,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"incoming","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','6kV busbar (Ur 12kV). Exact l-1 to l-6 mapping to functions not fully confirmed.','medium','draft'),

  ('66-15-014l-2','TC1-OUTPUT','Turbo Compressor 1 — MV Panel Output to Compressor (800A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":800,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"outgoing_compressor","feeder":"630A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014l-3','TC1-RING','Turbo Compressor 1 — MV Panel Ring Input (800A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":800,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"ring_input","feeder":"630A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014l-4','TC1-BUS-TIE','Turbo Compressor 1 — MV Panel Bus Tie (1600A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":1600,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"bus_tie","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','low','draft'),

  ('66-15-014m-1','TC1-COMP-PANEL','Turbo Compressor 1 — Compensation Panel (450 kVAR, 6kV)','cabinet','UTL-01','Ground',
   '{"voltage_kv":6,"rating_kvar":450,"function":"power_factor_correction","contactor_voltage_kv":7.2,"reactor":"inrush_reactor"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','450 KVAR capacitor bank with inrush reactor, 7.2kV contactor','high','draft'),

  -- TC-2 Panel
  ('66-15-014l-5','TC2-INPUT','Turbo Compressor 2 — MV Panel Input (1600A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":1600,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"incoming","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014l-6','TC2-OUTPUT','Turbo Compressor 2 — MV Panel Output to Compressor (800A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":800,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"outgoing_compressor","feeder":"630A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014m-2','TC2-COMP-PANEL','Turbo Compressor 2 — Compensation Panel (450 kVAR, 6kV)','cabinet','UTL-01','Ground',
   '{"voltage_kv":6,"rating_kvar":450,"function":"power_factor_correction","contactor_voltage_kv":7.2,"reactor":"inrush_reactor"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','450 KVAR capacitor bank with inrush reactor','high','draft'),

  -- TC-3 Panel
  ('66-15-014l-7','TC3-INPUT','Turbo Compressor 3 — MV Panel Input (1600A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":1600,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"incoming","feeder":"1250A","cable":"3(1x120)mm2 6/10kV EXeCGB 72m"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Cable length confirmed from drawing','medium','draft'),

  ('66-15-014l-8','TC3-OUTPUT','Turbo Compressor 3 — MV Panel Output (800A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":800,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"outgoing_compressor","feeder":"630A","cable":"3(1x95)mm2 6/10kV EXeCGB 92m"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014l-9','TC3-RING','Turbo Compressor 3 — MV Panel Ring (800A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":800,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"ring_input","feeder":"630A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014m-3','TC3-COMP-PANEL','Turbo Compressor 3 — Compensation Panel (450 kVAR, 6kV)','cabinet','UTL-01','Ground',
   '{"voltage_kv":6,"rating_kvar":450,"function":"power_factor_correction","contactor_voltage_kv":7.2,"reactor":"inrush_reactor"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft'),

  -- TC-4 Panel
  ('66-15-014n-1','TC4-INPUT','Turbo Compressor 4 — MV Panel Input (1600A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":1600,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"incoming","feeder":"1250A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014n-2','TC4-OUTPUT','Turbo Compressor 4 — MV Panel Output (800A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":800,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"outgoing_compressor","feeder":"630A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014n-3','TC4-RING','Turbo Compressor 4 — MV Panel Ring (800A)','switchgear','UTL-01','Ground',
   '{"voltage_kv":12,"rating_amps":800,"breaking_ka":31.5,"breaker":"VCB-SION","control_voltage_vdc":110,"function":"ring_input","feeder":"630A"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255','Exact tag assignment not fully confirmed','medium','draft'),

  ('66-15-014n-4','TC4-COMP-PANEL','Turbo Compressor 4 — Compensation Panel (450 kVAR, 6kV)','cabinet','UTL-01','Ground',
   '{"voltage_kv":6,"rating_kvar":450,"function":"power_factor_correction","contactor_voltage_kv":7.2,"reactor":"inrush_reactor"}',
   'CNRBE-PMEP20-AB-XXX-SMT-5255',null,'high','draft');
