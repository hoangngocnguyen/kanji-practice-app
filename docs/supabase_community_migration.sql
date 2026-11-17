-- ============================================================================
-- Migration: Community Features (Likes, Who Liked, Downloads & User Follows)
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- An toàn để chạy lại nhiều lần (Idempotent) trên database đã có sẵn dữ liệu.
-- ============================================================================

-- 1. Mở rộng bảng public_shared_decks với số lượt thích & lượt tải
alter table public.public_shared_decks
  add column if not exists likes_count integer not null default 0,
  add column if not exists downloads_count integer not null default 0;

create index if not exists idx_public_shared_decks_owner
  on public.public_shared_decks (owner_id, updated_at desc);

-- 2. Bảng lưu danh sách người dùng đã Like từng bộ thẻ chia sẻ (hiển thị ai đã like)
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

-- 3. Bảng Follow trang cá nhân giữa các người dùng
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

-- 4. RPC tăng lượt tải an toàn cho cả Khách (Guest) và Thành viên
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

-- 5. Cấp quyền truy cập (Grants)
grant all privileges on table public.shared_deck_likes to postgres, service_role;
grant all privileges on table public.user_follows to postgres, service_role;

grant select, insert, delete on table public.shared_deck_likes to authenticated;
grant select on table public.shared_deck_likes to anon;

grant select, insert, delete on table public.user_follows to authenticated;
grant select on table public.user_follows to anon;

grant execute on function public.increment_shared_deck_downloads(text) to anon, authenticated, service_role;
