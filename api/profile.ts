import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureUserProfile, requireAuth, setCorsHeaders } from './_lib/auth';

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { user, supabaseAdmin } = auth;

  try {
    const profile = await ensureUserProfile(supabaseAdmin, user);

    if (req.method === 'GET') {
      const [{ count: deckCount }, { count: cardCount }] = await Promise.all([
        supabaseAdmin
          .from('flashcard_decks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null),
        supabaseAdmin
          .from('flashcards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null),
      ]);

      return res.status(200).json({
        id: profile.id,
        email: profile.email || user.email || '',
        displayName:
          profile.display_name ||
          (user.user_metadata?.display_name as string | undefined) ||
          (user.email ? user.email.split('@')[0] : 'Người học Kanji'),
        avatarUrl: profile.avatar_url || null,
        createdAt: user.created_at || profile.created_at,
        syncVersion: Number(profile.sync_version || 0),
        lastSyncAt: profile.last_sync_at,
        dataHash: profile.data_hash || '',
        stats: {
          deckCount: deckCount || 0,
          cardCount: cardCount || 0,
        },
      });
    }

    if (req.method === 'PUT') {
      const rawName = req.body?.displayName;
      if (typeof rawName !== 'string' || !rawName.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên hiển thị hợp lệ.' });
      }

      const displayName = rawName.trim().slice(0, 60);
      const nowIso = new Date().toISOString();

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          display_name: displayName,
          updated_at: nowIso,
        })
        .eq('id', user.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      // Sync display_name back to Supabase Auth user_metadata
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          display_name: displayName,
        },
      });

      return res.status(200).json({
        id: updated.id,
        email: updated.email,
        displayName: updated.display_name,
        avatarUrl: updated.avatar_url || null,
        createdAt: user.created_at || updated.created_at,
        updatedAt: updated.updated_at,
        syncVersion: Number(updated.sync_version || 0),
        lastSyncAt: updated.last_sync_at,
      });
    }

    return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' });
  } catch (err: any) {
    console.error('Lỗi /api/profile:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi xử lý thông tin tài khoản.' });
  }
}
