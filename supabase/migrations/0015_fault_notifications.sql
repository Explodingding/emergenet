-- =====================================================================
-- Fault event notifications (Slack / Microsoft Teams incoming webhook).
--
-- Fires on every new row in fault_events with state IN ('injected',
-- 'real_alarm') -- i.e. every new fault, manual or automatic, but NOT on
-- 'cleared' (clearing a fault is an UPDATE of the existing row, not an
-- INSERT, so it's naturally excluded without extra filtering).
--
-- Uses Postgres directly (pg_net for the HTTP call, Vault for the secret)
-- rather than a separate Supabase Edge Function -- no extra deploy step,
-- everything lives in one reviewable SQL file.
--
-- SETUP (do this AFTER running this migration, and do NOT paste your
-- webhook URL into chat/anywhere public -- it's a bearer credential,
-- anyone with it can post to your channel):
--   1. Create an incoming webhook in Slack (or a Teams "Incoming Webhook"
--      connector) and copy its URL.
--   2. In the Supabase SQL editor, run (with YOUR real URL):
--        select vault.create_secret('https://hooks.slack.com/services/…', 'slack_fault_webhook_url');
--   3. Done -- the trigger below picks it up automatically. If the secret
--      doesn't exist yet, the trigger silently no-ops (no error), so it's
--      safe to run this migration before step 2.
--   To rotate/replace the URL later:
--        select vault.update_secret(id, 'https://hooks.slack.com/services/new-url')
--        from vault.secrets where name = 'slack_fault_webhook_url';
-- =====================================================================

create extension if not exists pg_net;

create or replace function public.tg_notify_fault_event() returns trigger as $$
declare
  webhook_url text;
  obj record;
  msg text;
begin
  if new.state not in ('injected', 'real_alarm') then
    return new;
  end if;

  select decrypted_secret into webhook_url
  from vault.decrypted_secrets
  where name = 'slack_fault_webhook_url'
  limit 1;

  if webhook_url is null or webhook_url = '' then
    return new; -- no webhook configured yet -- skip silently, don't block the insert
  end if;

  select code, name into obj from public.objects where id = new.object_id;

  msg := format(
    '%s Fault *%s* on `%s` — %s%s',
    case when new.state = 'real_alarm' then ':rotating_light:' else ':zap:' end,
    new.state,
    coalesce(obj.code, new.object_id::text),
    coalesce(obj.name, 'unknown object'),
    case when new.triggered_by is not null then format(' (by %s)', new.triggered_by) else '' end
  );

  perform net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('text', msg)
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public, vault, net;

drop trigger if exists trg_fault_events_notify on public.fault_events;
create trigger trg_fault_events_notify
  after insert on public.fault_events
  for each row execute function public.tg_notify_fault_event();
