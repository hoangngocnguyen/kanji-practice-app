-- ============================================================================
-- Migration: Daily Study Streak, Activity History & Streak Leaderboard
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- An toàn để chạy lại nhiều lần (Idempotent) trên database đã có sẵn dữ liệu.
-- ============================================================================

create table if not exists public.user_study_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  today_count integer not null default 0 check (today_count >= 0),
  daily_goal integer not null default 20 check (daily_goal >= 1 and daily_goal <= 500),
  total_reviewed integer not null default 0 check (total_reviewed >= 0),
  last_study_date text,
  activity_by_date jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Đảm bảo các cột bổ sung luôn tồn tại nếu nâng cấp từ phiên bản cũ hơn
alter table public.user_study_streaks
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists today_count integer not null default 0,
  add column if not exists daily_goal integer not null default 20,
  add column if not exists total_reviewed integer not null default 0,
  add column if not exists last_study_date text,
  add column if not exists activity_by_date jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_study_streaks_leaderboard
  on public.user_study_streaks (current_streak desc, longest_streak desc, total_reviewed desc, updated_at desc);

create index if not exists idx_user_study_streaks_last_date
  on public.user_study_streaks (last_study_date desc);

-- Bật Row Level Security (RLS)
alter table public.user_study_streaks enable row level security;

-- Cho phép mọi người xem bảng xếp hạng streak công khai
drop policy if exists "Anyone can view user study streaks" on public.user_study_streaks;
create policy "Anyone can view user study streaks"
  on public.user_study_streaks
  for select
  using (true);

-- Chỉ chính chủ mới có quyền thêm bản ghi streak của mình
drop policy if exists "Users can insert own study streak" on public.user_study_streaks;
create policy "Users can insert own study streak"
  on public.user_study_streaks
  for insert
  with check (auth.uid() = user_id);

-- Chỉ chính chủ mới có quyền cập nhật bản ghi streak của mình
drop policy if exists "Users can update own study streak" on public.user_study_streaks;
create policy "Users can update own study streak"
  on public.user_study_streaks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tự động cập nhật updated_at khi upsert/update
create or replace function public.touch_user_study_streaks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_study_streaks_updated_at on public.user_study_streaks;
create trigger trg_user_study_streaks_updated_at
  before update on public.user_study_streaks
  for each row execute procedure public.touch_user_study_streaks_updated_at();

-- Cấp quyền truy cập (Grants)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on table public.user_study_streaks to postgres, service_role;
grant select on table public.user_study_streaks to anon;
grant select, insert, update on table public.user_study_streaks to authenticated;
