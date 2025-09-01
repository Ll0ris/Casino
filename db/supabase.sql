-- Supabase schema for Multiplayer Blackjack

create table if not exists public.rooms (
  id text primary key,
  state jsonb not null,
  updated_at timestamp with time zone default now()
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

-- Optional: enable RLS and allow anon upsert/select by id
-- alter table public.rooms enable row level security;
-- create policy select_rooms on public.rooms for select using (true);
-- create policy upsert_rooms on public.rooms for insert with check (true);
-- create policy update_rooms on public.rooms for update using (true);

