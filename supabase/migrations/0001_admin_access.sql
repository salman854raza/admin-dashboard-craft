-- Ashlar Studio admin dashboard: grants a single admin (identified by
-- app_metadata.role = 'admin', set server-side via scripts/promote-admin.mjs)
-- read/update access to the tables the dashboard needs, and enables realtime
-- so new rows stream to the dashboard without a page refresh.
--
-- Run this in the Supabase SQL editor for project utllswqajudzehlfwryv,
-- or via `supabase db push` if you use the CLI locally.

-- Make sure RLS is on (no-op if already enabled)
alter table if exists public.profiles enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.newsletter_subscribers enable row level security;

-- Admins can read every profile (not just their own)
drop policy if exists "Admin can read all profiles" on public.profiles;
create policy "Admin can read all profiles"
  on public.profiles
  for select
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Admins can read every message
drop policy if exists "Admin can read all messages" on public.messages;
create policy "Admin can read all messages"
  on public.messages
  for select
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Admins can update message status (new -> contacted -> qualified -> closed)
drop policy if exists "Admin can update messages" on public.messages;
create policy "Admin can update messages"
  on public.messages
  for update
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' )
  with check ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Admins can read every newsletter subscriber
drop policy if exists "Admin can read all newsletter subscribers" on public.newsletter_subscribers;
create policy "Admin can read all newsletter subscribers"
  on public.newsletter_subscribers
  for select
  using ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' );

-- Enable realtime streaming for the tables the dashboard watches live.
-- Safe to re-run: guarded so it won't error if a table is already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'newsletter_subscribers'
  ) then
    alter publication supabase_realtime add table public.newsletter_subscribers;
  end if;
end $$;
