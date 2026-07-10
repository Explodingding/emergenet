-- =====================================================================
-- Acknowledgment tracking for fault_events, enabling real incident-
-- management KPIs: MTTA (mean time to acknowledge -- "reaction time")
-- separate from MTTR (mean time to resolve -- total duration), plus a
-- "fixing time" (acknowledge -> clear) once both events exist.
--
-- acknowledged_at/acknowledged_by are deliberately independent of the
-- `state` column (injected/real_alarm/cleared) rather than folded into
-- it -- state already conflates *origin* (injected vs real_alarm) with
-- *lifecycle stage* (open vs cleared); adding a third lifecycle value
-- there would make that ambiguity worse. A fault can be acknowledged
-- regardless of whether it was manually injected or a real alarm.
-- =====================================================================

alter table public.fault_events add column if not exists acknowledged_at timestamptz;
alter table public.fault_events add column if not exists acknowledged_by text;

create or replace function public.tg_generate_fault_report() returns trigger as $$
declare
  obj record;
  duration interval;
  reaction_time interval;
  fixing_time interval;
  impact_codes text[];
  impact_lines text;
  timing_lines text;
begin
  if new.ended_at is null or old.ended_at is not null then
    return new;
  end if;

  select code, name into obj from public.objects where id = new.object_id;
  duration := new.ended_at - new.started_at;

  if new.impact_snapshot is not null and jsonb_typeof(new.impact_snapshot) = 'array' then
    select array_agg(elem) into impact_codes from jsonb_array_elements_text(new.impact_snapshot) as elem;
  end if;

  if impact_codes is not null and array_length(impact_codes, 1) > 0 then
    select string_agg(format('- **%s** — %s', o.code, o.name), E'\n' order by o.code)
      into impact_lines
      from public.objects o
      where o.code = any(impact_codes);
  else
    impact_lines := '_No downstream objects were affected._';
  end if;

  -- Timing breakdown: only split into reaction/fixing time when the fault
  -- was actually acknowledged before it was cleared. Otherwise fall back
  -- to a single total-duration row (no acknowledgment step happened).
  if new.acknowledged_at is not null and new.acknowledged_at <= new.ended_at then
    reaction_time := new.acknowledged_at - new.started_at;
    fixing_time := new.ended_at - new.acknowledged_at;
    timing_lines := format(
      E'| Acknowledged | %s (by %s) |\n' ||
      E'| Reaction time (inject → ack) | %s |\n' ||
      E'| Fixing time (ack → clear) | %s |\n' ||
      E'| Total duration | %s |\n',
      to_char(new.acknowledged_at, 'YYYY-MM-DD HH24:MI:SS TZ'),
      coalesce(new.acknowledged_by, 'unknown'),
      reaction_time,
      fixing_time,
      duration
    );
  else
    timing_lines := format(E'| Duration | %s |\n', duration);
  end if;

  new.report_md := format(
    E'# Fault Report — %s\n\n' ||
    E'| Field | Value |\n' ||
    E'|---|---|\n' ||
    E'| Object | `%s` — %s |\n' ||
    E'| State | %s |\n' ||
    E'| Triggered by | %s |\n' ||
    E'| Started | %s |\n' ||
    E'| Ended | %s |\n' ||
    E'%s\n' ||
    E'## Downstream impact (%s object%s)\n\n%s\n\n' ||
    E'## Notes\n\n%s\n',
    coalesce(obj.code, new.object_id::text),
    coalesce(obj.code, new.object_id::text), coalesce(obj.name, 'unknown object'),
    new.state,
    coalesce(new.triggered_by, 'unknown'),
    to_char(new.started_at, 'YYYY-MM-DD HH24:MI:SS TZ'),
    to_char(new.ended_at, 'YYYY-MM-DD HH24:MI:SS TZ'),
    timing_lines,
    coalesce(array_length(impact_codes, 1), 0),
    case when coalesce(array_length(impact_codes, 1), 0) = 1 then '' else 's' end,
    impact_lines,
    coalesce(new.notes, '_none_')
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;
