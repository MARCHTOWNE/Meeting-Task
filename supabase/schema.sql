-- Meeting Tasks database schema
-- Run this in the Supabase SQL Editor.

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  created_at timestamptz not null default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date not null default current_date,
  transcript text not null,
  summary text,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete set null,
  title text not null,
  description text,
  assignee_id uuid references members(id) on delete set null,
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low','medium','high')),
  status text not null default 'todo'
    check (status in ('todo','in_progress','done')),
  source_quote text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on, no policies: only the server (secret key) can access data.
alter table members  enable row level security;
alter table meetings enable row level security;
alter table tasks    enable row level security;

-- Sample members
insert into members (name, email) values
  ('Alice', 'alice@example.com'),
  ('Bob',   'bob@example.com'),
  ('March', 'march@example.com');
