import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseAdmin, isServerSupabaseConfigured } from './supabaseAdmin.js';

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

export async function optionalAuth(
  req: any,
  res: any
): Promise<{ user: User | null; supabaseAdmin: SupabaseClient } | null> {
  if (!isServerSupabaseConfigured()) {
    res.status(503).json({
      error: 'Máy chủ chưa cấu hình SUPABASE_URL hoặc SUPABASE_SECRET_KEY.',
      code: 'SUPABASE_NOT_CONFIGURED',
    });
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const authHeader = (req.headers?.authorization || req.headers?.Authorization || '') as string;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = match?.[1]?.trim();

  if (!token) {
    return { user: null, supabaseAdmin };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, supabaseAdmin };
    }
    return { user: data.user, supabaseAdmin };
  } catch {
    return { user: null, supabaseAdmin };
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

export function sanitizeHttpAvatarUrl(raw: unknown): string | null {
  const val = typeof raw === 'string' ? raw.trim() : '';
  if (!val) return null;
  if (/^https?:\/\//i.test(val)) return val.slice(0, 500);
  return null;
}

export interface ResolvedUserIdentity {
  emailPrefix: string;
  isCustomDisplayName: boolean;
  googleName: string;
  metaDisplayName: string;
  preferredDisplayName: string;
  metaAvatar: string | null;
}

export function resolveUserIdentity(user: User): ResolvedUserIdentity {
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const emailPrefix = user.email ? user.email.split('@')[0].trim() : '';
  const isCustomDisplayName =
    meta.custom_display_name === true || meta.custom_display_name === 'true';

  const metaDisplayName =
    typeof meta.display_name === 'string' ? meta.display_name.trim() : '';

  const fullName =
    typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const name = typeof meta.name === 'string' ? meta.name.trim() : '';
  const googleName = fullName || name;

  const metaAvatar = sanitizeHttpAvatarUrl(meta.avatar_url || meta.picture);

  const metaDisplayIsEmailPrefix =
    Boolean(emailPrefix) &&
    metaDisplayName.toLowerCase() === emailPrefix.toLowerCase();

  let preferredDisplayName = '';
  if (isCustomDisplayName && metaDisplayName) {
    preferredDisplayName = metaDisplayName;
  } else if (metaDisplayName && (!metaDisplayIsEmailPrefix || !googleName)) {
    preferredDisplayName = metaDisplayName;
  } else if (googleName) {
    preferredDisplayName = googleName;
  } else if (emailPrefix) {
    preferredDisplayName = emailPrefix;
  } else {
    preferredDisplayName = 'Người học Kanji';
  }

  return {
    emailPrefix,
    isCustomDisplayName,
    googleName,
    metaDisplayName,
    preferredDisplayName: preferredDisplayName.slice(0, 60),
    metaAvatar,
  };
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

  const identity = resolveUserIdentity(user);

  if (existing) {
    const existingRow = existing as ProfileRow;
    const currentName = (existingRow.display_name || '').trim();
    const looksLikeEmailPrefix =
      Boolean(identity.emailPrefix) &&
      currentName.toLowerCase() === identity.emailPrefix.toLowerCase();

    const shouldUpgradeName =
      !identity.isCustomDisplayName &&
      ((!currentName && Boolean(identity.preferredDisplayName)) ||
        (looksLikeEmailPrefix &&
          Boolean(identity.googleName) &&
          identity.googleName.toLowerCase() !== identity.emailPrefix.toLowerCase()));

    const currentAvatar = sanitizeHttpAvatarUrl(existingRow.avatar_url);
    const isGoogleHostedAvatar = Boolean(
      currentAvatar && /googleusercontent\.com|ggpht\.com/i.test(currentAvatar)
    );
    const shouldUpdateAvatar = Boolean(
      identity.metaAvatar &&
        (!currentAvatar ||
          (isGoogleHostedAvatar && currentAvatar !== identity.metaAvatar))
    );

    if (shouldUpgradeName || shouldUpdateAvatar) {
      const nextName = shouldUpgradeName
        ? (identity.googleName || identity.preferredDisplayName).slice(0, 60)
        : existingRow.display_name;
      const nextAvatar = shouldUpdateAvatar ? identity.metaAvatar : existingRow.avatar_url;

      const { data: patched } = await supabaseAdmin
        .from('profiles')
        .update({
          ...(shouldUpgradeName ? { display_name: nextName } : {}),
          ...(shouldUpdateAvatar ? { avatar_url: nextAvatar } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('*')
        .maybeSingle();

      if (shouldUpgradeName && nextName) {
        try {
          await supabaseAdmin
            .from('public_shared_decks')
            .update({ author_name: nextName })
            .eq('owner_id', user.id);
        } catch {
          // Non-blocking sync for public deck author snapshot
        }
      }

      if (patched) return patched as ProfileRow;
    }

    return existingRow;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email || '',
        display_name: identity.preferredDisplayName,
        avatar_url: identity.metaAvatar,
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
