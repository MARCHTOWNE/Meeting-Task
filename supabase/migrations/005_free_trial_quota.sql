-- Change the AI quota from "N per 24 hours" to a configurable limit
-- that can also be a lifetime limit (e.g. one free try per account).
-- Run in the Supabase SQL Editor after 004.

drop function if exists claim_ai_extraction(int);

-- p_limit:        how many uses are allowed
-- p_window_hours: counting window in hours; NULL = since the account was created (lifetime)
-- Returns uses left after this one, or -1 if the limit is reached.
create function claim_ai_extraction(p_limit int, p_window_hours int default null)
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

  -- Serialise concurrent requests from the same user so two clicks cannot both pass.
  perform pg_advisory_xact_lock(hashtext('ai_usage:' || v_uid::text));

  select count(*) into v_used
  from ai_usage
  where user_id = v_uid
    and (p_window_hours is null or created_at > now() - make_interval(hours => p_window_hours));

  if v_used >= p_limit then
    return -1;
  end if;

  insert into ai_usage (user_id) values (v_uid);
  return p_limit - v_used - 1;
end;
$$;

revoke execute on function claim_ai_extraction(int, int) from public, anon;
grant execute on function claim_ai_extraction(int, int) to authenticated;
