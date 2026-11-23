-- ============================================================================
-- Luyện Kanji Pro: Đấu trường Kanji Real-Time (1v1 & Phòng thi nhóm kiểu Wayground)
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

-- 2. Bảng lưu Bộ đề tự tạo (Wayground-style Quiz Library)
create table if not exists public.arena_quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 400),
  level_tag text not null default 'MIXED' check (char_length(level_tag) <= 24),
  time_per_question integer not null default 15 check (time_per_question between 5 and 60),
  questions jsonb not null default '[]'::jsonb,
  play_count integer not null default 0 check (play_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_arena_quizzes_owner_updated
  on public.arena_quizzes (owner_id, updated_at desc);

drop trigger if exists set_arena_quizzes_updated_at on public.arena_quizzes;
create trigger set_arena_quizzes_updated_at
  before update on public.arena_quizzes
  for each row
  execute function public.handle_updated_at();

alter table public.arena_quizzes enable row level security;

drop policy if exists "Users can view own arena quizzes" on public.arena_quizzes;
create policy "Users can view own arena quizzes"
  on public.arena_quizzes
  for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own arena quizzes" on public.arena_quizzes;
create policy "Users can insert own arena quizzes"
  on public.arena_quizzes
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own arena quizzes" on public.arena_quizzes;
create policy "Users can update own arena quizzes"
  on public.arena_quizzes
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own arena quizzes" on public.arena_quizzes;
create policy "Users can delete own arena quizzes"
  on public.arena_quizzes
  for delete
  to authenticated
  using (auth.uid() = owner_id);

-- 3. Bảng Phòng thi đấu trực tiếp (Live Arena Rooms)
create table if not exists public.arena_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  mode text not null default '1v1' check (mode in ('1v1', 'group')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  host_player_id text not null check (char_length(host_player_id) between 4 and 128),
  host_user_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 140),
  level_filter text not null default 'N5' check (char_length(level_filter) <= 32),
  quiz_id uuid references public.arena_quizzes(id) on delete set null,
  question_count integer not null default 10 check (question_count between 1 and 50),
  time_per_question integer not null default 15 check (time_per_question between 5 and 60),
  advance_mode text not null default 'auto' check (advance_mode in ('auto', 'host')),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  question_started_at timestamptz,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '12 hours')
);

create index if not exists idx_arena_rooms_code_expires
  on public.arena_rooms (room_code, expires_at desc);

drop trigger if exists set_arena_rooms_updated_at on public.arena_rooms;
create trigger set_arena_rooms_updated_at
  before update on public.arena_rooms
  for each row
  execute function public.handle_updated_at();

-- Bật RLS để không cho client đọc trực tiếp cột questions chứa đáp án đúng
-- Toàn bộ thao tác phòng và chấm điểm đi qua API /api/arena (sử dụng supabaseAdmin)
alter table public.arena_rooms enable row level security;

-- 4. Bảng Người chơi trong phòng (hỗ trợ cả khách nhập tên và thành viên)
create table if not exists public.arena_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.arena_rooms(id) on delete cascade,
  player_id text not null check (char_length(player_id) between 4 and 128),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  is_host boolean not null default false,
  is_ready boolean not null default false,
  score integer not null default 0 check (score >= 0),
  streak integer not null default 0 check (streak >= 0),
  max_streak integer not null default 0 check (max_streak >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  total_response_ms integer not null default 0 check (total_response_ms >= 0),
  answers_by_index jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  constraint arena_room_players_unique unique (room_id, player_id)
);

create index if not exists idx_arena_room_players_room_score
  on public.arena_room_players (room_id, score desc, total_response_ms asc, joined_at asc);

alter table public.arena_room_players enable row level security;

grant all privileges on table public.arena_quizzes to postgres, service_role;
grant all privileges on table public.arena_rooms to postgres, service_role;
grant all privileges on table public.arena_room_players to postgres, service_role;

grant select, insert, update, delete on public.arena_quizzes to authenticated;
