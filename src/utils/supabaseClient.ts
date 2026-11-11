import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { FolderKanjiItem, KanjiDeckExportBundle, StudyFolder } from '../types/deck';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function getCurrentSupabaseUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signInWithSupabase(email: string, password: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUpWithSupabase(email: string, password: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOutSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Đồng bộ toàn bộ cây thư mục & thẻ Kanji lên Supabase (bảng user_kanji_decks)
 */
export async function syncDecksToCloud(
  userId: string,
  folders: StudyFolder[],
  items: FolderKanjiItem[]
): Promise<void> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');

  const { error } = await supabase.from('user_kanji_decks').upsert(
    {
      user_id: userId,
      folders,
      items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}

/**
 * Tải dữ liệu thư mục & thẻ Kanji từ Supabase của user hiện tại
 */
export async function fetchDecksFromCloud(userId: string): Promise<{
  folders: StudyFolder[];
  items: FolderKanjiItem[];
} | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_kanji_decks')
    .select('folders, items')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    folders: (data.folders as StudyFolder[]) || [],
    items: (data.items as FolderKanjiItem[]) || [],
  };
}

/**
 * Xuất bản một thư mục (và toàn bộ cây con) thành bộ bài chia sẻ công khai trên Supabase
 */
export async function publishFolderShareToCloud(
  userId: string,
  authorEmail: string,
  bundle: KanjiDeckExportBundle,
  slug: string
): Promise<string> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');

  const rootFolder = bundle.folders.find((f) => f.id === bundle.rootFolderId);
  const title = rootFolder?.name || 'Bộ ôn tập Kanji';

  const { error } = await supabase.from('public_shared_decks').upsert(
    {
      slug,
      owner_id: userId,
      author_name: authorEmail.split('@')[0] || 'Thành viên',
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
