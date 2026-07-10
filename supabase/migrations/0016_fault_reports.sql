-- =====================================================================
-- Automated fault documentation: generates a Markdown incident report
-- directly on fault_events whenever a fault transitions from open to
-- cleared (ended_at goes from null -> not null).
--
-- BEFORE UPDATE (not AFTER) so the trigger can just set NEW.report_md
-- and let it ride along in the same UPDATE -- no second round trip.
--
-- Report includes: object code/name, state, who triggered it, start/end
-- timestamps, duration, the downstream-impact list (resolved from the
-- impact_snapshot codes captured at injection time back to real object
-- names), and any freeform notes on the row.
-- =====================================================================

alter table public.fault_events add column if not exists report_md text;

create or replace function public.tg_generate_fault_report() returns trigger as $$
declare
  obj record;
  duration interval;
  impact_codes text[];
  impact_lines text;
begin
  -- Only (re)generate when this update is what actually closes the fault.
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

  new.report_md := format(
    E'# Fault Report — %s\n\n' ||
    E'| Field | Value |\n' ||
    E'|---|---|\n' ||
    E'| Object | `%s` — %s |\n' ||
    E'| State | %s |\n' ||
    E'| Triggered by | %s |\n' ||
    E'| Started | %s |\n' ||
    E'| Ended | %s |\n' ||
    E'| Duration | %s |\n\n' ||
    E'## Downstream impact (%s object%s)\n\n%s\n\n' ||
    E'## Notes\n\n%s\n',
    coalesce(obj.code, new.object_id::text),
    coalesce(obj.code, new.object_id::text), coalesce(obj.name, 'unknown object'),
    new.state,
    coalesce(new.triggered_by, 'unknown'),
    to_char(new.started_at, 'YYYY-MM-DD HH24:MI:SS TZ'),
    to_char(new.ended_at, 'YYYY-MM-DD HH24:MI:SS TZ'),
    duration,
    coalesce(array_length(impact_codes, 1), 0),
    case when coalesce(array_length(impact_codes, 1), 0) = 1 then '' else 's' end,
    impact_lines,
    coalesce(new.notes, '_none_')
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_fault_events_report on public.fault_events;
create trigger trg_fault_events_report
  before update on public.fault_events
  for each row execute function public.tg_generate_fault_report();
