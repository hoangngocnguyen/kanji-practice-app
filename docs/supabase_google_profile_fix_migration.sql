-- ============================================================================
-- Migration: Fix Google OAuth Avatars & Display Names (+ Backfill Old Users)
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- An toàn để chạy lại nhiều lần (Idempotent) trên database đã có sẵn dữ liệu.
-- ============================================================================

-- 1. Cập nhật trigger tạo hồ sơ cho tài khoản mới (lấy full_name/name & avatar_url/picture từ Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resolved_name text;
  resolved_avatar text;
begin
  resolved_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Người học Kanji'
    ),
    60
  );

  resolved_avatar := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture',
        ''
      )
    ),
    ''
  );
  if resolved_avatar is not null and resolved_avatar !~* '^https?://' then
    resolved_avatar := null;
  end if;

  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    resolved_name,
    left(resolved_avatar, 500)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tạo bổ sung các dòng profiles còn thiếu (nếu có user chưa có dòng trong public.profiles)
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  left(
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Người học Kanji'
    ),
    60
  ),
  case
    when coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '') ~* '^https?://'
      then left(trim(coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')), 500)
    else null
  end
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- 3. Tự động cập nhật tên người dùng Google cho các tài khoản cũ đang bị lưu phần đầu Gmail
--    Chỉ áp dụng nếu người dùng CHƯA tự sửa tên (custom_display_name <> 'true')
--    và tên hiện tại đang rỗng hoặc trùng với phần trước '@' của email.
update public.profiles p
set
  display_name = left(google_name, 60),
  updated_at = now()
from (
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), '')
    ) as google_name,
    lower(trim(split_part(coalesce(u.email, ''), '@', 1))) as email_prefix,
    coalesce(u.raw_user_meta_data->>'custom_display_name', 'false') as is_custom
  from auth.users u
) src
where p.id = src.id
  and src.is_custom <> 'true'
  and src.google_name is not null
  and (
    nullif(trim(p.display_name), '') is null
    or (
      src.email_prefix <> ''
      and lower(trim(p.display_name)) = src.email_prefix
      and lower(trim(src.google_name)) <> src.email_prefix
    )
  );

-- 4. Bổ sung ảnh đại diện Google cho các hồ sơ cũ đang bị thiếu avatar_url
update public.profiles p
set
  avatar_url = left(src.meta_avatar, 500),
  updated_at = now()
from (
  select
    u.id,
    trim(coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')) as meta_avatar
  from auth.users u
) src
where p.id = src.id
  and nullif(trim(coalesce(p.avatar_url, '')), '') is null
  and src.meta_avatar ~* '^https?://';

-- 5. Đồng bộ lại tên tác giả trên các bộ thẻ chia sẻ công khai nếu đang lưu tên cũ hoặc phần đầu email
update public.public_shared_decks d
set author_name = p.display_name
from public.profiles p
where d.owner_id = p.id
  and nullif(trim(p.display_name), '') is not null
  and (
    nullif(trim(d.author_name), '') is null
    or trim(d.author_name) = 'Thành viên'
    or lower(trim(d.author_name)) = lower(trim(split_part(coalesce(p.email, ''), '@', 1)))
  );
