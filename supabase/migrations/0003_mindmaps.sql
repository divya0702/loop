-- Loop: generated mindmaps (migration 0003).
-- Run in the Supabase SQL editor. Per-user RLS like the other tables.

create table if not exists mindmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  doc jsonb not null,
  created_at timestamptz not null default now()
);

alter table mindmaps enable row level security;

create policy "mindmaps_own" on mindmaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists mindmaps_user_id_idx on mindmaps (user_id, created_at desc);
