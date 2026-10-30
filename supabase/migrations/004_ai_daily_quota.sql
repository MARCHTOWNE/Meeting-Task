-- Daily limit for AI extractions, so open sign-up cannot burn through the OpenAI credit.
-- Run in the Supabase SQL Editor after 003.

create table ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_usage_user_time_idx on ai_usage (user_id, created_at desc);

alter table ai_usage enable row level security;

-- Users may read and add their own usage rows, but never update or delete them
-- (otherwise they could reset their own quota).
create policy "ai_usage: read own" on ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_usage: insert own" on ai_usage
  for insert to authenticated with check ((select auth.uid()) = user_id);

grant select, insert on ai_usage to authenticated;
revoke update, delete, truncate on ai_usage from authenticated, anon;

-- Atomically check the quota and record one use.
-- The advisory lock serialises concurrent requests from the same user,
-- so two clicks at the same moment cannot both slip under the limit.
-- Returns how many uses are left today (after this one), or -1 if the limit is reached.
create function claim_ai_extraction(p_daily_limit int)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_used int;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  perform pg_advisory_xact_lock(hashtext('ai_usage:' || v_uid::text));

  select count(*) into v_used
  from ai_usage
  where user_id = v_uid and created_at > now() - interval '24 hours';

  if v_used >= p_daily_limit then
    return -1;
  end if;

  insert into ai_usage (user_id) values (v_uid);
  return p_daily_limit - v_used - 1;
end;
$$;

revoke execute on function claim_ai_extraction(int) from public, anon;
grant execute on function claim_ai_extraction(int) to authenticated;
