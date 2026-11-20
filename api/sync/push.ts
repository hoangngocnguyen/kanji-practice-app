import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureUserProfile, requireAuth, setCorsHeaders } from '../_lib/auth.js';
import {
  computeServerDeckHash,
  folderToDbRow,
  kanjiItemToDbRow,
  SyncFolder,
  SyncKanjiItem,
  syncFlashcardExamplesToDb,
} from '../_lib/hash.js';

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST.' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { user, supabaseAdmin } = auth;

  try {
    const profile = await ensureUserProfile(supabaseAdmin, user);
    const nextVersion = Number(profile.sync_version || 0) + 1;
    const nowIso = new Date().toISOString();

    const { folders = [], items = [] } = req.body || {};

    if (!Array.isArray(folders) || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Payload folders/items không hợp lệ.' });
    }

    const incomingFolders: SyncFolder[] = folders;
    const validFolderIds = new Set(incomingFolders.map((f) => f.id));
    const sanitizedFolders = incomingFolders.map((f) => ({
      ...f,
      parentId: f.parentId && validFolderIds.has(f.parentId) ? f.parentId : null,
    }));

    const sanitizedItems: SyncKanjiItem[] = (items as SyncKanjiItem[]).filter((it) =>
      validFolderIds.has(it.folderId)
    );
    const incomingItemIds = new Set(sanitizedItems.map((it) => it.id));

    // Fetch existing active records to soft-delete any removed decks/cards (Force Overwrite Cloud)
    const [{ data: existingDecks, error: eDeckErr }, { data: existingCards, error: eCardErr }] =
      await Promise.all([
        supabaseAdmin
          .from('flashcard_decks')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null),
        supabaseAdmin
          .from('flashcards')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null),
      ]);

    if (eDeckErr) throw eDeckErr;
    if (eCardErr) throw eCardErr;

    const removedCardIds = (existingCards || [])
      .map((c: any) => c.id as string)
      .filter((id) => !incomingItemIds.has(id));

    const removedDeckIds = (existingDecks || [])
      .map((d: any) => d.id as string)
      .filter((id) => !validFolderIds.has(id));

    if (removedCardIds.length > 0) {
      const { error: delCardErr } = await supabaseAdmin
        .from('flashcards')
        .update({
          deleted_at: nowIso,
          updated_at: nowIso,
          sync_version: nextVersion,
        })
        .eq('user_id', user.id)
        .in('id', removedCardIds);
      if (delCardErr) throw delCardErr;
    }

    if (removedDeckIds.length > 0) {
      const { error: delDeckErr } = await supabaseAdmin
        .from('flashcard_decks')
        .update({
          deleted_at: nowIso,
          updated_at: nowIso,
          sync_version: nextVersion,
        })
        .eq('user_id', user.id)
        .in('id', removedDeckIds);
      if (delDeckErr) throw delDeckErr;
    }

    // Upsert all active folders & cards from Local
    if (sanitizedFolders.length > 0) {
      const deckRows = sanitizedFolders.map((f) =>
        folderToDbRow(f, user.id, nextVersion, nowIso)
      );
      const { error: upsertDeckErr } = await supabaseAdmin
        .from('flashcard_decks')
        .upsert(deckRows, { onConflict: 'user_id,id' });
      if (upsertDeckErr) throw upsertDeckErr;
    }

    if (sanitizedItems.length > 0) {
      const cardRows = sanitizedItems.map((it) =>
        kanjiItemToDbRow(it, user.id, nextVersion, nowIso)
      );
      const { error: upsertCardErr } = await supabaseAdmin
        .from('flashcards')
        .upsert(cardRows, { onConflict: 'user_id,id' });
      if (upsertCardErr) throw upsertCardErr;
    }

    await syncFlashcardExamplesToDb(
      supabaseAdmin,
      user.id,
      sanitizedItems,
      nextVersion,
      nowIso
    );

    const dataHash = computeServerDeckHash(sanitizedFolders, sanitizedItems);

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        sync_version: nextVersion,
        data_hash: dataHash,
        last_sync_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', user.id);

    if (profileErr) throw profileErr;

    return res.status(200).json({
      ok: true,
      syncVersion: nextVersion,
      syncedAt: new Date(nowIso).getTime(),
      dataHash,
      deckCount: sanitizedFolders.length,
      cardCount: sanitizedItems.length,
    });
  } catch (err: any) {
    console.error('Lỗi /api/sync/push:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi ghi đè dữ liệu lên Cloud.' });
  }
}
