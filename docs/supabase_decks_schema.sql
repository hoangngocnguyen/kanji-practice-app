-- ============================================================================
-- Supabase Schema for Luyện Kanji (Decks, SRS Sync & Public Community Sharing)
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. User personal decks & SRS progress table
create table if not exists public.user_kanji_decks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  folders jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_kanji_decks enable row level security;

create policy "Users can read their own decks"
  on public.user_kanji_decks
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own decks"
  on public.user_kanji_decks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own decks"
  on public.user_kanji_decks
  for update
  using (auth.uid() = user_id);

-- 2. Publicly shared decks for community learning
create table if not exists public.public_shared_decks (
  slug text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Thành viên',
  title text not null,
  description text default '',
  kanji_count integer not null default 0,
  bundle jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.public_shared_decks enable row level security;

create policy "Anyone can view public shared decks"
  on public.public_shared_decks
  for select
  using (true);

create policy "Owners can insert public shared decks"
  on public.public_shared_decks
  for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their public shared decks"
  on public.public_shared_decks
  for update
  using (auth.uid() = owner_id);

create policy "Owners can delete their public shared decks"
  on public.public_shared_decks
  for delete
  using (auth.uid() = owner_id);
