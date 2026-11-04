-- Loop initial schema. Run once in a FRESH Supabase project's SQL editor,
-- in one go. All tables are per-user with RLS scoped to auth.uid().

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  target_role text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('note', 'code')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('drill', 'interview')),
  topic text not null default '',
  transcript jsonb not null default '[]'::jsonb,
  score jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table materials enable row level security;
alter table plans enable row level security;
alter table sessions enable row level security;

create policy "profiles_own" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "materials_own" on materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plans_own" on plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions_own" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists materials_user_id_idx on materials (user_id, created_at desc);
create index if not exists plans_user_id_idx on plans (user_id, created_at desc);
create index if not exists sessions_user_id_idx on sessions (user_id, created_at desc);
