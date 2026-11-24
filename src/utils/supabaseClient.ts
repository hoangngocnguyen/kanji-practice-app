import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { KanjiDeckExportBundle } from '../types/deck';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabasePublishableKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  ''
).trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabasePublishableKey && supabaseUrl.startsWith('http'));
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export async function getCurrentSupabaseUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInWithSupabase(email: string, password: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  displayName?: string
) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const cleanName = displayName?.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: cleanName
      ? {
          data: {
            display_name: cleanName,
          },
        }
      : undefined,
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signOutSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getGoogleOAuthUrl(redirectTo: string): Promise<string> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  if (!data?.url || !/^https?:\/\//i.test(data.url)) {
    throw new Error('Không thể khởi tạo liên kết đăng nhập Google.');
  }
  return data.url;
}

export async function completeSupabaseOAuthSession(payload: {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');

  if (payload.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(payload.code);
    if (error) throw error;
    return data.session;
  }

  if (payload.accessToken && payload.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });
    if (error) throw error;
    return data.session;
  }

  throw new Error('Không nhận được mã xác thực từ Google.');
}

/**
 * Xuất bản một thư mục (và toàn bộ cây con) thành bộ bài chia sẻ công khai trên Supabase
 */
export async function publishFolderShareToCloud(
  userId: string,
  authorNameOrEmail: string,
  bundle: KanjiDeckExportBundle,
  slug: string
): Promise<string> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');

  const rootFolder = bundle.folders.find((f) => f.id === bundle.rootFolderId);
  const title = rootFolder?.name || 'Bộ ôn tập Kanji';
  const authorName = authorNameOrEmail.includes('@')
    ? authorNameOrEmail.split('@')[0]
    : authorNameOrEmail;

  const { error } = await supabase.from('public_shared_decks').upsert(
    {
      slug,
      owner_id: userId,
      author_name: authorName || 'Thành viên',
      title,
      description: rootFolder?.description || `${bundle.items.length} chữ Kanji`,
      bundle,
      kanji_count: bundle.items.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' }
  );

  if (error) throw error;
  return slug;
}

export async function unpublishFolderShareFromCloud(slug: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('public_shared_decks').delete().eq('slug', slug);
  if (error) throw error;
}

export interface PublicSharedDeckRecord {
  slug: string;
  owner_id: string;
  author_name: string;
  title: string;
  description: string;
  kanji_count: number;
  likes_count?: number;
  downloads_count?: number;
  bundle: KanjiDeckExportBundle;
  updated_at: string;
}

export async function fetchPublicSharedDeck(slug: string): Promise<PublicSharedDeckRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('public_shared_decks')
    .select('slug, owner_id, author_name, title, description, kanji_count, likes_count, downloads_count, bundle, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return (data as PublicSharedDeckRecord) || null;
}

export async function listPublicSharedDecks(): Promise<PublicSharedDeckRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('public_shared_decks')
    .select('slug, owner_id, author_name, title, description, kanji_count, likes_count, downloads_count, bundle, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) return [];
  return (data as PublicSharedDeckRecord[]) || [];
}
