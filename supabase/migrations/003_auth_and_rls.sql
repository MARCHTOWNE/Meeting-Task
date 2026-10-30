-- Per-user data with Supabase Auth + Row Level Security.
--
-- BEFORE running this file: create your own account in
--   Authentication → Users → Add user → Create new user (tick "Auto Confirm User").
-- Existing rows are assigned to the oldest account.
--
-- Run the whole file in the Supabase SQL Editor (left menu → SQL Editor → New query).

do $$
begin
  if not exists (select 1 from auth.users) then
    raise exception 'No user found. Create your account first (Authentication -> Users -> Add user), then run this migration.';
  end if;
end $$;

-- 1. Owner column on every table. New rows get the caller's id automatically.
alter table members  add column user_id uuid references auth.users (id) on delete cascade default auth.uid();
alter table meetings add column user_id uuid references auth.users (id) on delete cascade default auth.uid();
alter table tasks    add column user_id uuid references auth.users (id) on delete cascade default auth.uid();

-- 2. Give existing rows to the oldest account, then make the column required.
update members  set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update meetings set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update tasks    set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

alter table members  alter column user_id set not null;
alter table meetings alter column user_id set not null;
alter table tasks    alter column user_id set not null;

create index members_user_id_idx  on members  (user_id);
create index meetings_user_id_idx on meetings (user_id);
create index tasks_user_id_idx    on tasks    (user_id);

-- 3. Member emails only need to be unique within one account.
alter table members drop constraint if exists members_email_key;
alter table members add constraint members_user_email_key unique (user_id, email);

-- 4. A task may only point at a member / meeting of the SAME account.
--    Foreign keys ignore RLS, so without this a user could attach another
--    account's member id to their own task.
alter table members  add constraint members_id_user_key  unique (id, user_id);
alter table meetings add constraint meetings_id_user_key unique (id, user_id);

alter table tasks drop constraint if exists tasks_assignee_id_fkey;
alter table tasks drop constraint if exists tasks_meeting_id_fkey;
alter table tasks add constraint tasks_assignee_same_user_fkey
  foreign key (assignee_id, user_id) references members (id, user_id) on delete set null (assignee_id);
alter table tasks add constraint tasks_meeting_same_user_fkey
  foreign key (meeting_id, user_id) references meetings (id, user_id) on delete set null (meeting_id);

-- 5. Row Level Security: each signed-in user can only see and change their own rows.
--    (select auth.uid()) is evaluated once per query instead of once per row.
create policy "members: owner only" on members
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "meetings: owner only" on meetings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tasks: owner only" on tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 6. The app now calls the database as the signed-in user, not with the secret key.
--    apply_task_proposals is SECURITY INVOKER, so RLS above still applies inside it.
grant execute on function apply_task_proposals(uuid, text, jsonb, jsonb) to authenticated;
