-- ============================================================================
-- Supabase Schema for Luyện Kanji (Profiles, Flashcard Sync & Public Sharing)
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. User Profiles & Global Sync Metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  sync_version bigint not null default 0,
  data_hash text not null default '',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles: user can view own profile" on public.profiles;
create policy "Profiles: user can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles: user can insert own profile" on public.profiles;
create policy "Profiles: user can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles: user can update own profile" on public.profiles;
create policy "Profiles: user can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile row when a new user registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(coalesce(new.email, 'User'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Hierarchical Flashcard Decks (Study Folders) with Soft-Delete & Sync Version
create table if not exists public.flashcard_decks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id text,
  name text not null,
  description text default '',
  sort_order integer not null default 0,
  is_public boolean not null default false,
  share_slug text,
  sync_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists idx_flashcard_decks_user_active
  on public.flashcard_decks (user_id, deleted_at, updated_at desc);

alter table public.flashcard_decks enable row level security;

drop policy if exists "Decks: user owns all operations" on public.flashcard_decks;
create policy "Decks: user owns all operations"
  on public.flashcard_decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Flashcards (Kanji Items + SRS State + Compound Words) with Soft-Delete & Sync Version
create table if not exists public.flashcards (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  kanji text not null,
  han_viet text not null default '',
  on_readings jsonb not null default '[]'::jsonb,
  kun_readings jsonb not null default '[]'::jsonb,
  meanings jsonb not null default '[]'::jsonb,
  stroke_count integer,
  srs_state jsonb not null default '{}'::jsonb,
  compound_words jsonb not null default '[]'::jsonb,
  sync_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, deck_id)
    references public.flashcard_decks (user_id, id)
    on delete cascade
);

create index if not exists idx_flashcards_user_deck_active
  on public.flashcards (user_id, deck_id, deleted_at);

alter table public.flashcards enable row level security;

drop policy if exists "Flashcards: user owns all operations" on public.flashcards;
create policy "Flashcards: user owns all operations"
  on public.flashcards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Publicly shared decks for community learning
create table if not exists public.public_shared_decks (
  slug text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Thành viên',
  title text not null,
  description text default '',
  kanji_count integer not null default 0,
  likes_count integer not null default 0,
  downloads_count integer not null default 0,
  bundle jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.public_shared_decks
  add column if not exists likes_count integer not null default 0,
  add column if not exists downloads_count integer not null default 0;

create index if not exists idx_public_shared_decks_owner
  on public.public_shared_decks (owner_id, updated_at desc);

alter table public.public_shared_decks enable row level security;

drop policy if exists "Anyone can view public shared decks" on public.public_shared_decks;
create policy "Anyone can view public shared decks"
  on public.public_shared_decks
  for select
  using (true);

drop policy if exists "Owners can insert public shared decks" on public.public_shared_decks;
create policy "Owners can insert public shared decks"
  on public.public_shared_decks
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their public shared decks" on public.public_shared_decks;
create policy "Owners can update their public shared decks"
  on public.public_shared_decks
  for update
  using (auth.uid() = owner_id);

drop policy if exists "Owners can delete their public shared decks" on public.public_shared_decks;
create policy "Owners can delete their public shared decks"
  on public.public_shared_decks
  for delete
  using (auth.uid() = owner_id);

-- 5. Shared Deck Likes (tracks who liked each shared deck)
create table if not exists public.shared_deck_likes (
  deck_slug text not null references public.public_shared_decks(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deck_slug, user_id)
);

create index if not exists idx_shared_deck_likes_slug_time
  on public.shared_deck_likes (deck_slug, created_at desc);

create index if not exists idx_shared_deck_likes_user
  on public.shared_deck_likes (user_id, created_at desc);

alter table public.shared_deck_likes enable row level security;

drop policy if exists "Anyone can view shared deck likes" on public.shared_deck_likes;
create policy "Anyone can view shared deck likes"
  on public.shared_deck_likes
  for select
  using (true);

drop policy if exists "Authenticated users can like shared decks" on public.shared_deck_likes;
create policy "Authenticated users can like shared decks"
  on public.shared_deck_likes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike their own shared deck likes" on public.shared_deck_likes;
create policy "Users can unlike their own shared deck likes"
  on public.shared_deck_likes
  for delete
  using (auth.uid() = user_id);

-- 6. User Follows (Follower / Following graph)
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists idx_user_follows_follower
  on public.user_follows (follower_id, created_at desc);

create index if not exists idx_user_follows_following
  on public.user_follows (following_id, created_at desc);

alter table public.user_follows enable row level security;

drop policy if exists "Anyone can view user follows" on public.user_follows;
create policy "Anyone can view user follows"
  on public.user_follows
  for select
  using (true);

drop policy if exists "Authenticated users can follow others" on public.user_follows;
create policy "Authenticated users can follow others"
  on public.user_follows
  for insert
  with check (auth.uid() = follower_id and follower_id <> following_id);

drop policy if exists "Users can unfollow others" on public.user_follows;
create policy "Users can unfollow others"
  on public.user_follows
  for delete
  using (auth.uid() = follower_id);

-- 7. RPC for safe atomic download counter
create or replace function public.increment_shared_deck_downloads(deck_slug text)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  next_count integer;
begin
  update public.public_shared_decks
  set downloads_count = coalesce(downloads_count, 0) + 1
  where slug = deck_slug
  returning downloads_count into next_count;

  return coalesce(next_count, 0);
end;
$$;

-- ============================================================================
-- 8. Explicit Table & Schema Grants (Fix "permission denied for table ...")
-- ============================================================================
grant usage on schema public to postgres, anon, authenticated, service_role;

grant all privileges on table public.profiles to postgres, service_role;
grant all privileges on table public.flashcard_decks to postgres, service_role;
grant all privileges on table public.flashcards to postgres, service_role;
grant all privileges on table public.public_shared_decks to postgres, service_role;
grant all privileges on table public.shared_deck_likes to postgres, service_role;
grant all privileges on table public.user_follows to postgres, service_role;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.flashcard_decks to authenticated;
grant select, insert, update, delete on table public.flashcards to authenticated;
grant select, insert, update, delete on table public.public_shared_decks to authenticated;
grant select on table public.public_shared_decks to anon;
grant select, insert, delete on table public.shared_deck_likes to authenticated;
grant select on table public.shared_deck_likes to anon;
grant select, insert, delete on table public.user_follows to authenticated;
grant select on table public.user_follows to anon;
grant execute on function public.increment_shared_deck_downloads(text) to anon, authenticated, service_role;
