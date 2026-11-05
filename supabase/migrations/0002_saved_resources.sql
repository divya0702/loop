-- Loop: saved resources shelf (migration 0002).
-- Run in the Supabase SQL editor. Per-user RLS like the other tables.

create table if not exists saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null default '',
  title text not null,
  url text not null,
  description text not null default '',
  kind text not null default 'article',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table saved_resources enable row level security;

drop policy if exists "saved_resources_own" on saved_resources;
create policy "saved_resources_own" on saved_resources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists saved_resources_user_id_idx on saved_resources (user_id, created_at desc);
