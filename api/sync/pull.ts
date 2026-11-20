import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureUserProfile, requireAuth, setCorsHeaders } from '../_lib/auth.js';
import {
  computeServerDeckHash,
  dbCardRowToKanjiItem,
  dbDeckRowToFolder,
  fetchActiveExamplesByCard,
} from '../_lib/hash.js';

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức GET.' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { user, supabaseAdmin } = auth;

  try {
    const profile = await ensureUserProfile(supabaseAdmin, user);

    const [{ data: deckRows, error: deckErr }, { data: cardRows, error: cardErr }, examplesByCard] =
      await Promise.all([
        supabaseAdmin
          .from('flashcard_decks')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true }),
        supabaseAdmin
          .from('flashcards')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
        fetchActiveExamplesByCard(supabaseAdmin, user.id),
      ]);

    if (deckErr) throw deckErr;
    if (cardErr) throw cardErr;

    const folders = (deckRows || []).map(dbDeckRowToFolder);
    const items = (cardRows || []).map((row: any) =>
      dbCardRowToKanjiItem(row, examplesByCard.get(row.id))
    );
    const dataHash = profile.data_hash || computeServerDeckHash(folders, items);

    return res.status(200).json({
      syncVersion: Number(profile.sync_version || 0),
      syncedAt: profile.last_sync_at
        ? new Date(profile.last_sync_at).getTime()
        : Date.now(),
      dataHash,
      folders,
      items,
    });
  } catch (err: any) {
    console.error('Lỗi /api/sync/pull:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi tải dữ liệu từ Cloud.' });
  }
}
