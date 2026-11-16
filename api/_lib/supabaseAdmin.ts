import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
}

export function getSupabaseSecretKey(): string {
  return (process.env.SUPABASE_SECRET_KEY || '').trim();
}

function validateSecretKeyFormat(secretKey: string): string | null {
  if (!secretKey) return null;
  if (secretKey.startsWith('sb_publishable_')) {
    return 'SUPABASE_SECRET_KEY đang bị điền nhầm là Publishable key (sb_publishable_...). Vui lòng thay bằng Secret key (sb_secret_...) trong Supabase.';
  }
  if (secretKey.startsWith('eyJ')) {
    try {
      const parts = secretKey.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8')
        );
        if (payload?.role === 'anon') {
          return 'SUPABASE_SECRET_KEY đang bị điền nhầm là anon key. Vui lòng đổi sang service_role key hoặc sb_secret_... key.';
        }
      }
    } catch {}
  }
  return null;
}

export function isServerSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  return Boolean(url && secretKey && url.startsWith('http'));
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!isServerSupabaseConfigured()) {
    throw new Error(
      'Server chưa cấu hình SUPABASE_URL và SUPABASE_SECRET_KEY trong biến môi trường.'
    );
  }

  const secretKey = getSupabaseSecretKey();
  const keyError = validateSecretKeyFormat(secretKey);
  if (keyError) {
    throw new Error(keyError);
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(getSupabaseUrl(), secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedAdminClient;
}
