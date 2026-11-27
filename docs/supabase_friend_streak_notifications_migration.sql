-- ============================================================================
-- Migration: Friend Streaks (Max 6), Streak Freezes (Max 2, 10-day Recharge),
--            Realtime Notifications & Web Push Subscriptions
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- An toàn để chạy lại nhiều lần (Idempotent) trên database đã có sẵn dữ liệu.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Mở rộng bảng user_study_streaks với Băng Streak (Freeze) & tiến độ hồi băng
-- ----------------------------------------------------------------------------
alter table public.user_study_streaks
  add column if not exists streak_freezes integer not null default 1,
  add column if not exists freeze_recharge_days integer not null default 0,
  add column if not exists frozen_dates jsonb not null default '[]'::jsonb,
  add column if not exists last_freeze_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_user_study_streaks_freezes_range'
  ) then
    alter table public.user_study_streaks
      add constraint chk_user_study_streaks_freezes_range
      check (streak_freezes >= 0 and streak_freezes <= 2);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_user_study_streaks_recharge_range'
  ) then
    alter table public.user_study_streaks
      add constraint chk_user_study_streaks_recharge_range
      check (freeze_recharge_days >= 0 and freeze_recharge_days <= 10);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Bảng Lời mời nối Streak Bạn Bè (mời trực tiếp & qua link mời nhanh)
-- ----------------------------------------------------------------------------
create table if not exists public.friend_streak_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid references auth.users(id) on delete cascade,
  invite_code text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'canceled', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_friend_streak_invites_no_self check (invitee_id is null or inviter_id <> invitee_id)
);

create index if not exists idx_friend_streak_invites_inviter
  on public.friend_streak_invites (inviter_id, status, created_at desc);

create index if not exists idx_friend_streak_invites_invitee
  on public.friend_streak_invites (invitee_id, status, created_at desc);

create index if not exists idx_friend_streak_invites_code
  on public.friend_streak_invites (invite_code);

alter table public.friend_streak_invites enable row level security;

drop policy if exists "Users can view their own friend streak invites" on public.friend_streak_invites;
create policy "Users can view their own friend streak invites"
  on public.friend_streak_invites
  for select
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

drop policy if exists "Users can create friend streak invites" on public.friend_streak_invites;
create policy "Users can create friend streak invites"
  on public.friend_streak_invites
  for insert
  with check (auth.uid() = inviter_id);

drop policy if exists "Participants can update friend streak invites" on public.friend_streak_invites;
create policy "Participants can update friend streak invites"
  on public.friend_streak_invites
  for update
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- ----------------------------------------------------------------------------
-- 3. Bảng Cặp Streak Bạn Bè (Tối đa 6 kết nối đang hoạt động mỗi người)
-- ----------------------------------------------------------------------------
create table if not exists public.friend_streaks (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  pair_streak integer not null default 0 check (pair_streak >= 0),
  longest_pair_streak integer not null default 0 check (longest_pair_streak >= 0),
  last_pair_date text,
  frozen_dates jsonb not null default '[]'::jsonb,
  last_rescued_at timestamptz,
  last_rescued_by uuid references auth.users(id) on delete set null,
  last_nudged_at timestamptz,
  last_nudged_by uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_friend_streaks_order check (user_low < user_high),
  constraint uq_friend_streaks_pair unique (user_low, user_high)
);

create index if not exists idx_friend_streaks_low_active
  on public.friend_streaks (user_low, status, updated_at desc);

create index if not exists idx_friend_streaks_high_status
  on public.friend_streaks (user_high, status, updated_at desc);

alter table public.friend_streaks enable row level security;

drop policy if exists "Participants can view their friend streaks" on public.friend_streaks;
create policy "Participants can view their friend streaks"
  on public.friend_streaks
  for select
  using (auth.uid() = user_low or auth.uid() = user_high);

-- Tự động cập nhật updated_at trên friend_streaks
create or replace function public.touch_friend_streaks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_friend_streaks_updated_at on public.friend_streaks;
create trigger trg_friend_streaks_updated_at
  before update on public.friend_streaks
  for each row execute procedure public.touch_friend_streaks_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Hàm RPC nguyên tử chấp nhận lời mời (bảo đảm tối đa 6 kết nối mỗi bên)
-- ----------------------------------------------------------------------------
create or replace function public.accept_friend_streak_invite(
  p_invite_id uuid,
  p_accepter_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite public.friend_streak_invites%rowtype;
  v_low uuid;
  v_high uuid;
  v_inviter_count integer;
  v_accepter_count integer;
  v_existing_pair public.friend_streaks%rowtype;
  v_pair_exists boolean := false;
  v_pair_id uuid;
begin
  select * into v_invite
  from public.friend_streak_invites
  where id = p_invite_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Lời mời không tồn tại.');
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'NOT_PENDING', 'message', 'Lời mời này đã được xử lý hoặc đã hủy.');
  end if;

  if v_invite.expires_at < now() then
    update public.friend_streak_invites
    set status = 'expired', responded_at = now()
    where id = v_invite.id;
    return jsonb_build_object('ok', false, 'code', 'EXPIRED', 'message', 'Lời mời đã hết hạn.');
  end if;

  if v_invite.inviter_id = p_accepter_id then
    return jsonb_build_object('ok', false, 'code', 'SELF_INVITE', 'message', 'Bạn không thể tự nối Streak với chính mình.');
  end if;

  if v_invite.invitee_id is not null and v_invite.invitee_id <> p_accepter_id then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'Lời mời này dành cho thành viên khác.');
  end if;

  v_low := least(v_invite.inviter_id, p_accepter_id);
  v_high := greatest(v_invite.inviter_id, p_accepter_id);

  -- Khóa giao dịch theo thứ tự cặp UUID để tránh race condition vượt 6 kết nối
  perform pg_advisory_xact_lock(hashtext(v_low::text));
  perform pg_advisory_xact_lock(hashtext(v_high::text));

  select * into v_existing_pair
  from public.friend_streaks
  where user_low = v_low and user_high = v_high
  for update;

  -- Lưu cờ tồn tại ngay lập tức vì các câu lệnh SELECT COUNT(*) bên dưới sẽ ghi đè biến FOUND
  v_pair_exists := found;

  if v_pair_exists and v_existing_pair.status = 'active' then
    update public.friend_streak_invites
    set status = 'accepted', invitee_id = p_accepter_id, responded_at = now()
    where id = v_invite.id;

    update public.friend_streak_invites
    set status = 'accepted', responded_at = now()
    where id <> v_invite.id
      and status = 'pending'
      and (
        (inviter_id = v_low and invitee_id = v_high)
        or (inviter_id = v_high and invitee_id = v_low)
      );

    return jsonb_build_object(
      'ok', true,
      'alreadyConnected', true,
      'pairId', v_existing_pair.id,
      'inviterId', v_invite.inviter_id,
      'inviteeId', p_accepter_id
    );
  end if;

  select count(*) into v_inviter_count
  from public.friend_streaks
  where status = 'active' and (user_low = v_invite.inviter_id or user_high = v_invite.inviter_id);

  if v_inviter_count >= 6 then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVITER_MAX_SLOTS',
      'message', 'Người mời đã đạt tối đa 6 kết nối Streak bạn bè.'
    );
  end if;

  select count(*) into v_accepter_count
  from public.friend_streaks
  where status = 'active' and (user_low = p_accepter_id or user_high = p_accepter_id);

  if v_accepter_count >= 6 then
    return jsonb_build_object(
      'ok', false,
      'code', 'ACCEPTER_MAX_SLOTS',
      'message', 'Bạn đã đạt tối đa 6 kết nối Streak bạn bè. Hãy ngắt bớt 1 kết nối nếu muốn thêm bạn mới.'
    );
  end if;

  if v_pair_exists and v_existing_pair.id is not null then
    update public.friend_streaks
    set status = 'active',
        pair_streak = 0,
        last_pair_date = null,
        frozen_dates = '[]'::jsonb,
        updated_at = now()
    where id = v_existing_pair.id
    returning id into v_pair_id;
  else
    insert into public.friend_streaks (user_low, user_high, pair_streak, longest_pair_streak, status)
    values (v_low, v_high, 0, 0, 'active')
    on conflict (user_low, user_high) do update
      set status = 'active',
          pair_streak = 0,
          last_pair_date = null,
          frozen_dates = '[]'::jsonb,
          updated_at = now()
    returning id into v_pair_id;
  end if;

  update public.friend_streak_invites
  set status = 'accepted',
      invitee_id = p_accepter_id,
      responded_at = now()
  where id = v_invite.id;

  update public.friend_streak_invites
  set status = 'accepted',
      responded_at = now()
  where id <> v_invite.id
    and status = 'pending'
    and (
      (inviter_id = v_low and invitee_id = v_high)
      or (inviter_id = v_high and invitee_id = v_low)
    );

  return jsonb_build_object(
    'ok', true,
    'pairId', v_pair_id,
    'inviterId', v_invite.inviter_id,
    'inviteeId', p_accepter_id
  );
end;
$$;

-- Khôi phục tự động (idempotent) các cặp Streak đã bấm chấp nhận trước khi vá lỗi RPC
do $$
declare
  rec record;
  v_low uuid;
  v_high uuid;
  v_low_count integer;
  v_high_count integer;
begin
  for rec in
    select inviter_id, invitee_id
    from public.friend_streak_invites
    where status = 'accepted'
      and invitee_id is not null
      and inviter_id <> invitee_id
    order by coalesce(responded_at, created_at) asc
  loop
    v_low := least(rec.inviter_id, rec.invitee_id);
    v_high := greatest(rec.inviter_id, rec.invitee_id);

    if exists (
      select 1 from public.friend_streaks
      where user_low = v_low and user_high = v_high
    ) then
      continue;
    end if;

    select count(*) into v_low_count
    from public.friend_streaks
    where status = 'active' and (user_low = v_low or user_high = v_low);

    select count(*) into v_high_count
    from public.friend_streaks
    where status = 'active' and (user_low = v_high or user_high = v_high);

    if v_low_count < 6 and v_high_count < 6 then
      insert into public.friend_streaks (user_low, user_high, pair_streak, longest_pair_streak, status)
      values (v_low, v_high, 0, 0, 'active')
      on conflict (user_low, user_high) do nothing;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Bảng Thông báo Realtime (notifications)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text not null default '',
  action_url text not null default '/leaderboard',
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications
  for delete
  using (auth.uid() = user_id);

-- Bật Supabase Realtime cho bảng notifications (idempotent)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Bảng Đăng ký Thiết bị nhận Thông báo đẩy Web Push (VAPID)
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_active
  on public.push_subscriptions (user_id, is_active);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;
create policy "Users can manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. Grants
-- ----------------------------------------------------------------------------
grant all privileges on table public.friend_streak_invites to postgres, service_role;
grant all privileges on table public.friend_streaks to postgres, service_role;
grant all privileges on table public.notifications to postgres, service_role;
grant all privileges on table public.push_subscriptions to postgres, service_role;

grant select, insert, update on table public.friend_streak_invites to authenticated;
grant select on table public.friend_streaks to authenticated;
grant select, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

grant execute on function public.accept_friend_streak_invite(uuid, uuid) to authenticated, service_role;
