import {
  getSupabaseAccessToken,
  signInWithSupabase,
  signOutSupabase,
  signUpWithSupabase,
  supabase,
} from '../utils/supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  syncVersion: number;
  lastSyncAt: string | null;
  dataHash?: string;
  stats?: {
    deckCount: number;
    cardCount: number;
  };
}

export function mapSupabaseAuthError(err: any): string {
  const raw = String(err?.message || err || '').toLowerCase();
  if (raw.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'Email này đã được đăng ký tài khoản.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Vui lòng kiểm tra hộp thư và xác nhận email trước khi đăng nhập.';
  }
  if (raw.includes('password should be at least')) {
    return 'Mật khẩu phải có ít nhất 6 ký tự.';
  }
  if (raw.includes('unable to validate email address') || raw.includes('invalid format')) {
    return 'Địa chỉ email không hợp lệ.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.';
  }
  return err?.message || 'Đã xảy ra lỗi xác thực. Vui lòng thử lại.';
}

export async function loginAccount(email: string, password: string) {
  try {
    return await signInWithSupabase(email.trim(), password);
  } catch (err) {
    throw new Error(mapSupabaseAuthError(err));
  }
}

export async function registerAccount(
  email: string,
  password: string,
  displayName: string
) {
  try {
    return await signUpWithSupabase(email.trim(), password, displayName.trim());
  } catch (err) {
    throw new Error(mapSupabaseAuthError(err));
  }
}

export async function logoutAccount() {
  await signOutSupabase();
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('Phiên đăng nhập chưa sẵn sàng.');
  }

  const res = await fetch('/api/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể tải thông tin tài khoản.');
  }

  return data as UserProfile;
}

export async function updateUserDisplayName(displayName: string): Promise<UserProfile> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập lại để cập nhật.');
  }

  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ displayName: displayName.trim() }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể cập nhật tên hiển thị.');
  }

  // Refresh client session metadata so Header avatar updates immediately
  if (supabase) {
    await supabase.auth.refreshSession().catch(() => {});
  }

  return data as UserProfile;
}
