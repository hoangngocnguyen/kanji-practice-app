import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureUserProfile, requireAuth, setCorsHeaders } from '../_lib/auth.js';
import {
  computeServerDeckHash,
  dbCardRowToKanjiItem,
  dbDeckRowToFolder,
  fetchActiveExamplesByCard,
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
    const currentServerVersion = Number(profile.sync_version || 0);

    const {
      baseVersion = 0,
      folders = [],
      items = [],
      deletedFolderIds = [],
      deletedItemIds = [],
    } = req.body || {};

    if (!Array.isArray(folders) || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Dữ liệu đồng bộ không hợp lệ.' });
    }

    // Race-condition / optimistic lock guard
    if (currentServerVersion > 0 && Number(baseVersion || 0) !== currentServerVersion) {
      return res.status(409).json({
        error: 'Phát hiện dữ liệu trên Cloud vừa được cập nhật từ thiết bị khác.',
        code: 'SYNC_CONFLICT',
        serverVersion: currentServerVersion,
      });
    }

    const nowIso = new Date().toISOString();
    const nextVersion = currentServerVersion + 1;

    // 1. Apply tombstones for deleted folders & cards
    const deletedFolderIdList = (Array.isArray(deletedFolderIds) ? deletedFolderIds : [])
      .map((entry: any) => (typeof entry === 'string' ? entry : entry?.id))
      .filter(Boolean);

    const deletedItemIdList = (Array.isArray(deletedItemIds) ? deletedItemIds : [])
      .map((entry: any) => (typeof entry === 'string' ? entry : entry?.id))
      .filter(Boolean);

    if (deletedFolderIdList.length > 0) {
      await supabaseAdmin
        .from('flashcards')
        .update({
          deleted_at: nowIso,
          updated_at: nowIso,
          sync_version: nextVersion,
        })
        .eq('user_id', user.id)
        .in('deck_id', deletedFolderIdList);

      await supabaseAdmin
        .from('flashcard_decks')
        .update({
          deleted_at: nowIso,
          updated_at: nowIso,
          sync_version: nextVersion,
        })
        .eq('user_id', user.id)
        .in('id', deletedFolderIdList);
    }

    if (deletedItemIdList.length > 0) {
      await supabaseAdmin
        .from('flashcards')
        .update({
          deleted_at: nowIso,
          updated_at: nowIso,
          sync_version: nextVersion,
        })
        .eq('user_id', user.id)
        .in('id', deletedItemIdList);
    }

    // 2. Sanitize and upsert incoming active folders & cards
    const incomingFolders: SyncFolder[] = folders;
    const validFolderIds = new Set(incomingFolders.map((f) => f.id));

    const sanitizedFolders = incomingFolders.map((f) => ({
      ...f,
      parentId: f.parentId && validFolderIds.has(f.parentId) ? f.parentId : null,
    }));

    if (sanitizedFolders.length > 0) {
      const deckRows = sanitizedFolders.map((f) =>
        folderToDbRow(f, user.id, nextVersion, nowIso)
      );
      const { error: upsertDeckErr } = await supabaseAdmin
        .from('flashcard_decks')
        .upsert(deckRows, { onConflict: 'user_id,id' });
      if (upsertDeckErr) throw upsertDeckErr;
    }

    const sanitizedItems: SyncKanjiItem[] = (items as SyncKanjiItem[]).filter((it) =>
      validFolderIds.has(it.folderId)
    );

    if (sanitizedItems.length > 0) {
      const cardRows = sanitizedItems.map((it) =>
        kanjiItemToDbRow(it, user.id, nextVersion, nowIso)
      );
      const { error: upsertCardErr } = await supabaseAdmin
        .from('flashcards')
        .upsert(cardRows, { onConflict: 'user_id,id' });
      if (upsertCardErr) throw upsertCardErr;
    }

    // Read all active cards for user and reconcile flashcard_examples cleanly
    const [{ data: finalDeckRows, error: fDeckErr }, { data: finalCardRows, error: fCardErr }] =
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
      ]);

    if (fDeckErr) throw fDeckErr;
    if (fCardErr) throw fCardErr;

    // Sync flashcard_examples against surviving active items
    const activeItemById = new Map<string, SyncKanjiItem>();
    for (const row of finalCardRows || []) {
      const incomingMatch = sanitizedItems.find((s) => s.id === row.id);
      if (incomingMatch) {
        activeItemById.set(row.id, incomingMatch);
      } else {
        activeItemById.set(row.id, dbCardRowToKanjiItem(row));
      }
    }

    await syncFlashcardExamplesToDb(
      supabaseAdmin,
      user.id,
      Array.from(activeItemById.values()),
      nextVersion,
      nowIso
    );

    const examplesByCard = await fetchActiveExamplesByCard(supabaseAdmin, user.id);

    const canonicalFolders = (finalDeckRows || []).map(dbDeckRowToFolder);
    const canonicalItems = (finalCardRows || []).map((row: any) =>
      dbCardRowToKanjiItem(row, examplesByCard.get(row.id))
    );
    const dataHash = computeServerDeckHash(canonicalFolders, canonicalItems);

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
      folders: canonicalFolders,
      items: canonicalItems,
    });
  } catch (err: any) {
    console.error('Lỗi /api/sync/merge:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi đồng bộ dữ liệu lên Cloud.' });
  }
}
