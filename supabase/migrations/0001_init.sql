-- =====================================================================
-- Plant Electrical Network — Initial Schema
-- =====================================================================
-- Conventions:
--   * All primary keys are UUID v4 (gen_random_uuid())
--   * All distances/positions are stored in CENTIMETRES (integer, 1 cm precision)
--   * Coordinates (coord_x, coord_y) refer to the CENTER of the object
--   * width/height in objects are in cm as well (nullable -> fallback to type default_size)
--   * Rotation is constrained to {0, 90, 180, 270}
--   * Status (operational/fault/affected) is NOT persisted — it is
--     computed at runtime from the dependency graph + open fault_events
--   * RLS: public READ, authenticated WRITE
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. BUILDINGS
-- =====================================================================
create table public.buildings (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  description     text,
  bounds_x        integer not null,                    -- top-left X in cm
  bounds_y        integer not null,                    -- top-left Y in cm
  bounds_w        integer not null check (bounds_w > 0), -- width in cm
  bounds_h        integer not null check (bounds_h > 0), -- height in cm
  accent_color    text not null default '#3b82f6',
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index buildings_display_order_idx on public.buildings(display_order);

-- =====================================================================
-- 2. FLOORS
-- =====================================================================
create table public.floors (
  id                 uuid primary key default gen_random_uuid(),
  building_id        uuid not null references public.buildings(id) on delete cascade,
  level              integer not null,        -- 0 = ground, -1 = basement, 1 = first
  name               text not null,           -- "Ground", "Mezzanine", "Roof"
  elevation_m        numeric(6,2),
  is_visible_default boolean not null default true,
  created_at         timestamptz not null default now(),
  unique (building_id, level)
);
create index floors_building_idx on public.floors(building_id);

-- =====================================================================
-- 3. OBJECT TYPES  (catalog — adding new types = INSERT, no migration)
-- =====================================================================
create table public.object_types (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,    -- "transformer", "vfd_drive", ...
  label              text not null,
  category           text not null check (category in (
                       'power_source','switching','distribution',
                       'consumer','protection','control','monitoring','passive'
                     )),
  icon               text not null default 'Box',     -- lucide-react icon
  default_color      text not null default '#10b981',
  default_size       integer not null default 100,    -- in CENTIMETRES
  properties_schema  jsonb,                    -- optional JSON Schema for validation
  description        text,
  created_at         timestamptz not null default now()
);

-- =====================================================================
-- 4. OBJECTS  (physical components on the map)
-- =====================================================================
create table public.objects (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,            -- "T-MAIN", "FC-HEAT-1"
  name              text not null,
  type_id           uuid not null references public.object_types(id) on delete restrict,
  building_id       uuid not null references public.buildings(id)    on delete restrict,
  primary_floor_id  uuid not null references public.floors(id)       on delete restrict,
  coord_x           integer not null check (coord_x >= 0),            -- CENTER X (cm)
  coord_y           integer not null check (coord_y >= 0),            -- CENTER Y (cm)
  rotation          smallint not null default 0 check (rotation in (0, 90, 180, 270)),
  width             integer check (width > 0),                        -- cm (nullable: overrides type default_size)
  height            integer check (height > 0),                        -- cm
  properties        jsonb not null default '{}'::jsonb,               -- type-specific spec
  metadata          jsonb,                                            -- free-form extras
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index objects_building_idx       on public.objects(building_id);
create index objects_type_idx           on public.objects(type_id);
create index objects_primary_floor_idx  on public.objects(primary_floor_id);
create index objects_active_idx         on public.objects(is_active) where is_active = true;
create index objects_properties_gin     on public.objects using gin (properties jsonb_path_ops);

-- =====================================================================
-- 5. OBJECT_FLOORS  (M:N for objects spanning multiple floors)
-- =====================================================================
create table public.object_floors (
  object_id uuid not null references public.objects(id) on delete cascade,
  floor_id  uuid not null references public.floors(id)  on delete cascade,
  primary key (object_id, floor_id)
);
create index object_floors_floor_idx on public.object_floors(floor_id);

-- =====================================================================
-- 6. DEPENDENCIES  (logical graph: source feeds/controls/monitors target)
-- =====================================================================
create table public.dependencies (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.objects(id) on delete cascade,  -- upstream
  target_id   uuid not null references public.objects(id) on delete cascade,  -- downstream
  relation    text not null default 'feeds' check (relation in (
                'feeds',        -- supplies electrical power  (propagates fault)
                'controls',     -- e.g. PLC controls motor    (does NOT propagate power loss)
                'monitors',     -- measurement / telemetry    (does NOT propagate)
                'backup_for'    -- redundant supply           (active only if primary fails)
              )),
  priority    smallint not null default 0,   -- 0 = primary path, 1+ = backup
  properties  jsonb,                          -- { cable_id, length_m, breaker_id, rating_amps }
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (source_id, target_id, relation),
  check (source_id <> target_id)
);
create index deps_source_idx on public.dependencies(source_id);
create index deps_target_idx on public.dependencies(target_id);
create index deps_relation_idx on public.dependencies(relation);

-- =====================================================================
-- 7. FAULT EVENTS  (history + audit + future SCADA integration)
-- =====================================================================
create table public.fault_events (
  id               uuid primary key default gen_random_uuid(),
  object_id        uuid not null references public.objects(id) on delete cascade,
  state            text not null check (state in ('injected','cleared','real_alarm')),
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  triggered_by     text,                                -- user id or 'simulator'
  impact_snapshot  jsonb,                               -- ["UDB-1", "UC-PUMPS", ...]
  notes            text
);
create index fault_events_object_idx on public.fault_events(object_id, started_at desc);
create index fault_events_open_idx   on public.fault_events(object_id) where ended_at is null;

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function public.tg_set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_buildings_updated_at before update on public.buildings
  for each row execute function public.tg_set_updated_at();
create trigger trg_objects_updated_at before update on public.objects
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY  (Plan A: public READ, authenticated WRITE)
-- =====================================================================
alter table public.buildings     enable row level security;
alter table public.floors        enable row level security;
alter table public.object_types  enable row level security;
alter table public.objects       enable row level security;
alter table public.object_floors enable row level security;
alter table public.dependencies  enable row level security;
alter table public.fault_events  enable row level security;

-- Read for everyone (anon + authenticated)
do $$
declare t text;
begin
  for t in select unnest(array[
    'buildings','floors','object_types','objects',
    'object_floors','dependencies','fault_events'
  ]) loop
    execute format($f$
      create policy "public_read_%1$s" on public.%1$I
        for select to anon, authenticated using (true);
    $f$, t);
  end loop;
end$$;

-- Write only for authenticated users
do $$
declare t text;
begin
  for t in select unnest(array[
    'buildings','floors','object_types','objects',
    'object_floors','dependencies','fault_events'
  ]) loop
    execute format($f$
      create policy "auth_insert_%1$s" on public.%1$I
        for insert to authenticated with check (true);
      create policy "auth_update_%1$s" on public.%1$I
        for update to authenticated using (true) with check (true);
      create policy "auth_delete_%1$s" on public.%1$I
        for delete to authenticated using (true);
    $f$, t);
  end loop;
end$$;

-- =====================================================================
-- SEED: object_types catalog (16 starter types) — default_size in CM
-- =====================================================================
insert into public.object_types (code, label, category, icon, default_color, default_size, description) values
  ('transformer',        'Transformer',          'power_source', 'Zap',            '#10b981', 250, 'Power transformer (HV/LV)'),
  ('generator',          'Diesel Generator',     'power_source', 'Fuel',           '#10b981', 350, 'Backup diesel generator'),
  ('battery_bank',       'Battery Bank',         'power_source', 'BatteryFull',    '#10b981', 120, 'Battery storage / DC backup'),
  ('switchgear',         'Switchgear',           'switching',    'CircuitBoard',   '#10b981', 200, 'Main switchgear assembly'),
  ('breaker',            'Circuit Breaker',      'switching',    'Power',          '#10b981', 30,  'Individual circuit breaker'),
  ('distribution_board', 'Distribution Board',   'distribution', 'Cpu',            '#10b981', 100, 'Sub-distribution panel'),
  ('mcc',                'Motor Control Center', 'distribution', 'LayoutPanelTop', '#10b981', 180, 'MCC bucket assembly'),
  ('cabinet',            'Control Cabinet',      'control',      'Box',            '#10b981', 80,  'Generic control cabinet'),
  ('plc',                'PLC',                  'control',      'Cpu',            '#10b981', 40,  'Programmable logic controller'),
  ('vfd_drive',          'VFD Drive',            'control',      'Gauge',          '#10b981', 60,  'Variable frequency drive'),
  ('ups',                'UPS',                  'protection',   'ShieldCheck',    '#10b981', 80,  'Uninterruptible power supply'),
  ('motor',              'Motor',                'consumer',     'Cog',            '#10b981', 70,  'Electric motor'),
  ('heater',             'Heater',               'consumer',     'Flame',          '#10b981', 80,  'Heating element'),
  ('light_panel',        'Lighting Panel',       'consumer',     'Lightbulb',      '#10b981', 50,  'Lighting distribution'),
  ('junction_box',       'Junction Box',         'passive',      'Square',         '#10b981', 25,  'Wiring junction'),
  ('measurement',        'Measurement Device',   'monitoring',   'Activity',       '#10b981', 30,  'Power meter / sensor');

-- =====================================================================
-- (No seed for buildings/objects — you populate via Supabase Studio)
-- =====================================================================
