-- Routine Tracker — Supabase schema.
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query).
--
-- Design: one row per (user, date). The whole day record is stored as JSONB in
-- `data`, so changing the app's fields never requires a migration. `updated_at`
-- is epoch milliseconds (matches the client's Date.now()) for trivial
-- last-write-wins comparison during sync.

create table if not exists public.days (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  date       text        not null,                 -- "YYYY-MM-DD"
  data       jsonb       not null default '{}'::jsonb,
  updated_at bigint      not null default 0,        -- epoch ms
  primary key (user_id, date)
);

-- Helps the incremental pull (fetch rows changed since a watermark).
create index if not exists days_user_updated_idx
  on public.days (user_id, updated_at);

-- Row-level security: each user can only see and change their own rows.
alter table public.days enable row level security;

drop policy if exists "own rows - select" on public.days;
create policy "own rows - select" on public.days
  for select using (auth.uid() = user_id);

drop policy if exists "own rows - insert" on public.days;
create policy "own rows - insert" on public.days
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows - update" on public.days;
create policy "own rows - update" on public.days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows - delete" on public.days;
create policy "own rows - delete" on public.days
  for delete using (auth.uid() = user_id);

-- Enable realtime so other devices get changes pushed live.
-- (Safe to re-run; ignore "already member" notices.)
alter publication supabase_realtime add table public.days;
