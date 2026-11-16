import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseAdmin, isServerSupabaseConfigured } from './supabaseAdmin.js';

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export interface AuthContext {
  user: User;
  supabaseAdmin: SupabaseClient;
}

export async function requireAuth(req: any, res: any): Promise<AuthContext | null> {
  if (!isServerSupabaseConfigured()) {
    res.status(503).json({
      error: 'Máy chủ chưa cấu hình SUPABASE_URL hoặc SUPABASE_SECRET_KEY.',
      code: 'SUPABASE_NOT_CONFIGURED',
    });
    return null;
  }

  const authHeader = (req.headers?.authorization || req.headers?.Authorization || '') as string;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();

  if (!token) {
    res.status(401).json({
      error: 'Thiếu token xác thực (Authorization: Bearer <token>).',
      code: 'UNAUTHORIZED',
    });
    return null;
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      res.status(401).json({
        error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'INVALID_TOKEN',
      });
      return null;
    }

    return {
      user: data.user,
      supabaseAdmin,
    };
  } catch (err: any) {
    res.status(500).json({
      error: err?.message || 'Lỗi xác thực người dùng với Supabase.',
      code: 'AUTH_INTERNAL_ERROR',
    });
    return null;
  }
}

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  sync_version: number;
  data_hash: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function ensureUserProfile(
  supabaseAdmin: SupabaseClient,
  user: User
): Promise<ProfileRow> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return existing as ProfileRow;
  }

  const fallbackDisplayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    (user.email ? user.email.split('@')[0] : 'Người học Kanji');

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email || '',
        display_name: fallbackDisplayName,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
        sync_version: 0,
        data_hash: '',
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted as ProfileRow;
}
