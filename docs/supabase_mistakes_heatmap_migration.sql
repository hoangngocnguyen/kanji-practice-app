-- ============================================================================
-- Luyện Kanji Pro: Ngân hàng chữ hay sai (Leech Tracker) & Heatmap 365 ngày
-- Chạy trực tiếp trên Supabase SQL Editor (Idempotent / An toàn khi chạy lại)
-- ============================================================================

-- 1. Hàm cập nhật timestamp dùng chung
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2. Bảng lưu Ngân hàng chữ hay sai của từng người dùng
create table if not exists public.user_kanji_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kanji text not null check (char_length(kanji) between 1 and 4),
  mistake_count integer not null default 1 check (mistake_count >= 0),
  consecutive_correct integer not null default 0 check (consecutive_correct >= 0),
  srs_hard_count integer not null default 0 check (srs_hard_count >= 0),
  quiz_wrong_count integer not null default 0 check (quiz_wrong_count >= 0),
  writing_fail_count integer not null default 0 check (writing_fail_count >= 0),
  is_mastered boolean not null default false,
  last_mistake_source text not null default 'srs'
    check (last_mistake_source in ('srs', 'quiz', 'writing', 'confusable')),
  last_mistake_at timestamptz not null default timezone('utc', now()),
  mastered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_kanji_mistakes_unique unique (user_id, kanji)
);

-- Index phục vụ lọc nhanh các chữ chưa khắc phục, sắp xếp theo mức độ sai nhiều nhất
create index if not exists idx_user_kanji_mistakes_user_active
  on public.user_kanji_mistakes (user_id, is_mastered, mistake_count desc, last_mistake_at desc);

-- Trigger tự cập nhật updated_at
drop trigger if exists set_user_kanji_mistakes_updated_at on public.user_kanji_mistakes;
create trigger set_user_kanji_mistakes_updated_at
  before update on public.user_kanji_mistakes
  for each row
  execute function public.handle_updated_at();

-- 3. Bật Row Level Security (RLS) - Mỗi người dùng chỉ đọc/ghi dữ liệu của chính mình
alter table public.user_kanji_mistakes enable row level security;

drop policy if exists "Users can view own kanji mistakes" on public.user_kanji_mistakes;
create policy "Users can view own kanji mistakes"
  on public.user_kanji_mistakes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own kanji mistakes" on public.user_kanji_mistakes;
create policy "Users can insert own kanji mistakes"
  on public.user_kanji_mistakes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own kanji mistakes" on public.user_kanji_mistakes;
create policy "Users can update own kanji mistakes"
  on public.user_kanji_mistakes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own kanji mistakes" on public.user_kanji_mistakes;
create policy "Users can delete own kanji mistakes"
  on public.user_kanji_mistakes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Đảm bảo trường lưu lịch sử Heatmap 365 ngày trên bảng user_study_streaks
alter table if exists public.user_study_streaks
  add column if not exists activity_by_date jsonb not null default '{}'::jsonb;

comment on column public.user_study_streaks.activity_by_date is
  'Lịch sử hoạt động từng ngày theo múi giờ Việt Nam (giữ tối đa 371 ngày cho Heatmap 53 tuần)';

grant select, insert, update, delete on public.user_kanji_mistakes to authenticated;
