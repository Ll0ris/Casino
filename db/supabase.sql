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

-- User profiles for auth + balances
create table if not exists public.profiles (
  user_id uuid primary key,
  email text not null,
  username text unique not null,
  balance numeric not null default 0,
  last_topup_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

-- Keep it simple: disable RLS for this prototype (or add permissive policies if you enable RLS)
alter table public.profiles disable row level security;
