-- Apply AI task proposals atomically.
-- A plpgsql function runs inside a single transaction: if any create/update
-- fails (e.g. unknown assignee, deleted task), nothing is written.
-- Run this in the Supabase SQL Editor.

create or replace function apply_task_proposals(
  p_meeting_id uuid,
  p_summary    text,
  p_creates    jsonb,
  p_updates    jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_created int := 0;
  v_updated int := 0;
  u jsonb;
begin
  if not exists (select 1 from meetings where id = p_meeting_id) then
    raise exception 'meeting % not found', p_meeting_id;
  end if;

  insert into tasks (meeting_id, title, description, assignee_id, due_date, priority, source_quote)
  select
    p_meeting_id,
    c->>'title',
    nullif(c->>'description', ''),
    nullif(c->>'assignee_id', '')::uuid,
    nullif(c->>'due_date', '')::date,
    coalesce(c->>'priority', 'medium'),
    c->>'source_quote'
  from jsonb_array_elements(coalesce(p_creates, '[]'::jsonb)) as t(c);
  get diagnostics v_created = row_count;

  for u in select value from jsonb_array_elements(coalesce(p_updates, '[]'::jsonb)) loop
    update tasks set
      status      = coalesce(u->>'status', status),
      priority    = coalesce(u->>'priority', priority),
      due_date    = case when u ? 'due_date'    then (u->>'due_date')::date    else due_date    end,
      assignee_id = case when u ? 'assignee_id' then (u->>'assignee_id')::uuid else assignee_id end,
      updated_at  = now()
    where id = (u->>'task_id')::uuid;

    if not found then
      raise exception 'task % not found', u->>'task_id';
    end if;
    v_updated := v_updated + 1;
  end loop;

  if p_summary is not null then
    update meetings set summary = p_summary where id = p_meeting_id;
  end if;

  return jsonb_build_object('created', v_created, 'updated', v_updated);
end;
$$;

-- Only the server (service role / secret key) may call it.
revoke execute on function apply_task_proposals(uuid, text, jsonb, jsonb) from public, anon, authenticated;
grant  execute on function apply_task_proposals(uuid, text, jsonb, jsonb) to service_role;
