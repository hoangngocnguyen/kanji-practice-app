import crypto from 'crypto';

export interface SyncSrsState {
  dueAt: number;
  intervalMinutes: number;
  easeFactor: number;
  repetitions: number;
  lastRating?: 'hard' | 'good' | 'easy';
  lastReviewedAt?: number;
}

export interface SyncCardExample {
  id: string;
  jp: string;
  kana: string;
  vi: string;
}

export interface SyncCompoundWord {
  id: string;
  word: string;
  reading: string;
  hanViet: string;
  meaning: string;
  examples?: SyncCardExample[];
  srsState: SyncSrsState;
  updatedAt?: number;
}

export interface SyncFolder {
  id: string;
  parentId: string | null;
  name: string;
  description?: string;
  sortOrder: number;
  isPublic?: boolean;
  shareSlug?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SyncKanjiItem {
  id: string;
  folderId: string;
  kanji: string;
  hanViet: string;
  onReadings: string[];
  kunReadings: string[];
  meanings: string[];
  strokeCount?: number;
  examples?: SyncCardExample[];
  srsState: SyncSrsState;
  compoundWords: SyncCompoundWord[];
  createdAt: number;
  updatedAt?: number;
}

function normalizeSrsState(srs: Partial<SyncSrsState> | undefined) {
  return {
    dueAt: Number(srs?.dueAt || 0),
    intervalMinutes: Number(srs?.intervalMinutes || 0),
    easeFactor: Number(srs?.easeFactor ?? 2.5),
    repetitions: Number(srs?.repetitions || 0),
    lastRating: srs?.lastRating || null,
    lastReviewedAt: srs?.lastReviewedAt ? Number(srs.lastReviewedAt) : null,
  };
}

function normalizeCanonicalExamples(examples: SyncCardExample[] | undefined) {
  if (!Array.isArray(examples)) return [];
  return examples
    .map((ex) => ({
      jp: String(ex?.jp || '').trim(),
      kana: String(ex?.kana || '').trim(),
      vi: String(ex?.vi || '').trim(),
    }))
    .filter((ex) => ex.jp && ex.vi);
}

export function buildCanonicalDeckPayload(
  folders: SyncFolder[],
  items: SyncKanjiItem[]
): string {
  const normalizedFolders = [...folders]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) => ({
      id: f.id,
      parentId: f.parentId ?? null,
      name: f.name,
      description: f.description || '',
      sortOrder: Number(f.sortOrder || 0),
      isPublic: Boolean(f.isPublic),
      shareSlug: f.shareSlug || null,
    }));

  const normalizedItems = [...items]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((it) => {
      const itemExamples = normalizeCanonicalExamples(it.examples);
      const baseObj: Record<string, any> = {
        id: it.id,
        folderId: it.folderId,
        kanji: it.kanji,
        hanViet: it.hanViet || '',
        onReadings: Array.isArray(it.onReadings) ? it.onReadings : [],
        kunReadings: Array.isArray(it.kunReadings) ? it.kunReadings : [],
        meanings: Array.isArray(it.meanings) ? it.meanings : [],
        strokeCount: it.strokeCount ?? null,
        srsState: normalizeSrsState(it.srsState),
        compoundWords: [...(Array.isArray(it.compoundWords) ? it.compoundWords : [])]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((cw) => {
            const cwExamples = normalizeCanonicalExamples(cw.examples);
            const cwObj: Record<string, any> = {
              id: cw.id,
              word: cw.word,
              reading: cw.reading || '',
              hanViet: cw.hanViet || '',
              meaning: cw.meaning || '',
              srsState: normalizeSrsState(cw.srsState),
            };
            if (cwExamples.length > 0) {
              cwObj.examples = cwExamples;
            }
            return cwObj;
          }),
      };
      if (itemExamples.length > 0) {
        baseObj.examples = itemExamples;
      }
      return baseObj;
    });

  return JSON.stringify({
    folders: normalizedFolders,
    items: normalizedItems,
  });
}

export function computeServerDeckHash(
  folders: SyncFolder[],
  items: SyncKanjiItem[]
): string {
  const canonical = buildCanonicalDeckPayload(folders, items);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function safeIsoTimestamp(value: number | undefined, fallbackIso: string): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return fallbackIso;
}

export function dbDeckRowToFolder(row: any): SyncFolder {
  return {
    id: row.id,
    parentId: row.parent_id ? String(row.parent_id) : null,
    name: row.name,
    description: row.description || undefined,
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    isPublic: Boolean(row.is_public),
    shareSlug: row.share_slug || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

export function dbCardRowToKanjiItem(
  row: any,
  exampleRowsForCard?: any[]
): SyncKanjiItem {
  const rows = Array.isArray(exampleRowsForCard)
    ? [...exampleRowsForCard].sort(
        (a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0)
      )
    : [];

  const kanjiExamples: SyncCardExample[] = rows
    .filter((ex) => ex.target_type === 'kanji')
    .map((ex) => ({
      id: String(ex.id),
      jp: String(ex.sentence_jp || '').trim(),
      kana: String(ex.sentence_kana || '').trim(),
      vi: String(ex.sentence_vi || '').trim(),
    }))
    .filter((ex) => ex.jp && ex.vi);

  const compoundRows = Array.isArray(row.compound_words) ? row.compound_words : [];
  const hydratedCompounds: SyncCompoundWord[] = compoundRows.map((cw: any) => {
    const dbCwExamples: SyncCardExample[] = rows
      .filter(
        (ex) =>
          ex.target_type === 'compound' &&
          ((ex.compound_word_id && ex.compound_word_id === cw.id) ||
            (!ex.compound_word_id &&
              cw.word &&
              String(ex.target_text || '').trim() === String(cw.word).trim()))
      )
      .map((ex) => ({
        id: String(ex.id),
        jp: String(ex.sentence_jp || '').trim(),
        kana: String(ex.sentence_kana || '').trim(),
        vi: String(ex.sentence_vi || '').trim(),
      }))
      .filter((ex) => ex.jp && ex.vi);

    const fallbackInlineExamples: SyncCardExample[] = Array.isArray(cw.examples)
      ? cw.examples
          .map((ex: any, idx: number) => ({
            id: String(ex?.id || `${cw.id}-ex-${idx}`),
            jp: String(ex?.jp || '').trim(),
            kana: String(ex?.kana || '').trim(),
            vi: String(ex?.vi || '').trim(),
          }))
          .filter((ex: SyncCardExample) => ex.jp && ex.vi)
      : [];

    const resolvedExamples =
      dbCwExamples.length > 0 ? dbCwExamples : fallbackInlineExamples;

    return {
      ...cw,
      ...(resolvedExamples.length > 0 ? { examples: resolvedExamples } : {}),
    };
  });

  return {
    id: row.id,
    folderId: row.deck_id,
    kanji: row.kanji,
    hanViet: row.han_viet || '',
    onReadings: Array.isArray(row.on_readings) ? row.on_readings : [],
    kunReadings: Array.isArray(row.kun_readings) ? row.kun_readings : [],
    meanings: Array.isArray(row.meanings) ? row.meanings : [],
    strokeCount: row.stroke_count ?? undefined,
    ...(kanjiExamples.length > 0 ? { examples: kanjiExamples } : {}),
    srsState: row.srs_state || {
      dueAt: Date.now(),
      intervalMinutes: 0,
      easeFactor: 2.5,
      repetitions: 0,
    },
    compoundWords: hydratedCompounds,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  };
}

export function folderToDbRow(
  folder: SyncFolder,
  userId: string,
  syncVersion: number,
  nowIso: string
) {
  return {
    id: folder.id,
    user_id: userId,
    parent_id: folder.parentId ? String(folder.parentId) : null,
    name: folder.name,
    description: folder.description || '',
    sort_order: Number.isFinite(Number(folder.sortOrder)) ? Number(folder.sortOrder) : 0,
    is_public: Boolean(folder.isPublic),
    share_slug: folder.shareSlug || null,
    sync_version: syncVersion,
    created_at: safeIsoTimestamp(folder.createdAt, nowIso),
    updated_at: safeIsoTimestamp(folder.updatedAt, nowIso),
    deleted_at: null,
  };
}

export function kanjiItemToDbRow(
  item: SyncKanjiItem,
  userId: string,
  syncVersion: number,
  nowIso: string
) {
  const sanitizedCompounds = (Array.isArray(item.compoundWords)
    ? item.compoundWords
    : []
  ).map((cw) => {
    const cleanExamples = normalizeCanonicalExamples(cw.examples).map((ex, idx) => ({
      id: cw.examples?.[idx]?.id || `${cw.id}-ex-${idx}`,
      ...ex,
    }));
    return {
      ...cw,
      ...(cleanExamples.length > 0 ? { examples: cleanExamples } : {}),
    };
  });

  return {
    id: item.id,
    user_id: userId,
    deck_id: item.folderId,
    kanji: item.kanji,
    han_viet: item.hanViet || '',
    on_readings: Array.isArray(item.onReadings) ? item.onReadings : [],
    kun_readings: Array.isArray(item.kunReadings) ? item.kunReadings : [],
    meanings: Array.isArray(item.meanings) ? item.meanings : [],
    stroke_count: item.strokeCount ?? null,
    srs_state: item.srsState,
    compound_words: sanitizedCompounds,
    sync_version: syncVersion,
    created_at: safeIsoTimestamp(item.createdAt, nowIso),
    updated_at: safeIsoTimestamp(item.updatedAt, nowIso),
    deleted_at: null,
  };
}

function isMissingExamplesTableError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('flashcard_examples')
  );
}

export async function fetchActiveExamplesByCard(
  supabaseAdmin: any,
  userId: string
): Promise<Map<string, any[]>> {
  const byCard = new Map<string, any[]>();
  const { data, error } = await supabaseAdmin
    .from('flashcard_examples')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    if (isMissingExamplesTableError(error)) {
      console.warn('Bảng flashcard_examples chưa được tạo trên Supabase, tạm dùng dữ liệu inline.');
      return byCard;
    }
    throw error;
  }

  for (const row of data || []) {
    const cardId = String(row.flashcard_id || '');
    if (!cardId) continue;
    const arr = byCard.get(cardId) || [];
    arr.push(row);
    byCard.set(cardId, arr);
  }
  return byCard;
}

export async function syncFlashcardExamplesToDb(
  supabaseAdmin: any,
  userId: string,
  items: SyncKanjiItem[],
  syncVersion: number,
  nowIso: string
): Promise<void> {
  const { data: existingRows, error: fetchErr } = await supabaseAdmin
    .from('flashcard_examples')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (fetchErr) {
    if (isMissingExamplesTableError(fetchErr)) {
      console.warn('Bảng flashcard_examples chưa tồn tại trên Supabase, bỏ qua ghi bảng con.');
      return;
    }
    throw fetchErr;
  }

  const rowsToUpsert: any[] = [];
  const activeIds = new Set<string>();

  for (const item of items) {
    // 1. Kanji-level examples
    if (Array.isArray(item.examples)) {
      item.examples.forEach((ex, idx) => {
        const jp = String(ex?.jp || '').trim();
        const vi = String(ex?.vi || '').trim();
        if (!jp || !vi) return;
        const rawId = ex.id ? String(ex.id).trim() : `${item.id}-k-${idx}`;
        const rowId = activeIds.has(rawId) ? `${item.id}-k-${idx}-${rawId}` : rawId;
        activeIds.add(rowId);
        rowsToUpsert.push({
          id: rowId,
          user_id: userId,
          flashcard_id: item.id,
          target_type: 'kanji',
          compound_word_id: null,
          target_text: item.kanji,
          sentence_jp: jp,
          sentence_kana: String(ex?.kana || '').trim(),
          sentence_vi: vi,
          sort_order: idx,
          sync_version: syncVersion,
          updated_at: nowIso,
          deleted_at: null,
        });
      });
    }

    // 2. Compound word-level examples
    if (Array.isArray(item.compoundWords)) {
      for (const cw of item.compoundWords) {
        if (!Array.isArray(cw.examples)) continue;
        cw.examples.forEach((ex, idx) => {
          const jp = String(ex?.jp || '').trim();
          const vi = String(ex?.vi || '').trim();
          if (!jp || !vi) return;
          const rawId = ex.id ? String(ex.id).trim() : `${cw.id}-c-${idx}`;
          const rowId = activeIds.has(rawId) ? `${cw.id}-c-${idx}-${rawId}` : rawId;
          activeIds.add(rowId);
          rowsToUpsert.push({
            id: rowId,
            user_id: userId,
            flashcard_id: item.id,
            target_type: 'compound',
            compound_word_id: cw.id,
            target_text: cw.word,
            sentence_jp: jp,
            sentence_kana: String(ex?.kana || '').trim(),
            sentence_vi: vi,
            sort_order: idx,
            sync_version: syncVersion,
            updated_at: nowIso,
            deleted_at: null,
          });
        });
      }
    }
  }

  const removedIds = (existingRows || [])
    .map((r: any) => String(r.id))
    .filter((id: string) => !activeIds.has(id));

  if (removedIds.length > 0) {
    const { error: delErr } = await supabaseAdmin
      .from('flashcard_examples')
      .update({
        deleted_at: nowIso,
        updated_at: nowIso,
        sync_version: syncVersion,
      })
      .eq('user_id', userId)
      .in('id', removedIds);
    if (delErr) throw delErr;
  }

  if (rowsToUpsert.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < rowsToUpsert.length; i += chunkSize) {
      const chunk = rowsToUpsert.slice(i, i + chunkSize);
      const { error: upsertErr } = await supabaseAdmin
        .from('flashcard_examples')
        .upsert(chunk, { onConflict: 'user_id,id' });
      if (upsertErr) throw upsertErr;
    }
  }
}
