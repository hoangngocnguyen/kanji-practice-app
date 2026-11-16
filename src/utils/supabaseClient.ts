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
  author_name: string;
  title: string;
  description: string;
  kanji_count: number;
  bundle: KanjiDeckExportBundle;
  updated_at: string;
}

export async function fetchPublicSharedDeck(slug: string): Promise<PublicSharedDeckRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('public_shared_decks')
    .select('slug, author_name, title, description, kanji_count, bundle, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return (data as PublicSharedDeckRecord) || null;
}

export async function listPublicSharedDecks(): Promise<PublicSharedDeckRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('public_shared_decks')
    .select('slug, author_name, title, description, kanji_count, bundle, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) return [];
  return (data as PublicSharedDeckRecord[]) || [];
}
