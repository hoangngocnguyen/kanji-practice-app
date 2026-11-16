import crypto from 'crypto';

export interface SyncSrsState {
  dueAt: number;
  intervalMinutes: number;
  easeFactor: number;
  repetitions: number;
  lastRating?: 'hard' | 'good' | 'easy';
  lastReviewedAt?: number;
}

export interface SyncCompoundWord {
  id: string;
  word: string;
  reading: string;
  hanViet: string;
  meaning: string;
  srsState: SyncSrsState;
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
  srsState: SyncSrsState;
  compoundWords: SyncCompoundWord[];
  createdAt: number;
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
    .map((it) => ({
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
        .map((cw) => ({
          id: cw.id,
          word: cw.word,
          reading: cw.reading || '',
          hanViet: cw.hanViet || '',
          meaning: cw.meaning || '',
          srsState: normalizeSrsState(cw.srsState),
        })),
    }));

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

export function dbDeckRowToFolder(row: any): SyncFolder {
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    name: row.name,
    description: row.description || undefined,
    sortOrder: Number(row.sort_order ?? 0),
    isPublic: Boolean(row.is_public),
    shareSlug: row.share_slug || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

export function dbCardRowToKanjiItem(row: any): SyncKanjiItem {
  return {
    id: row.id,
    folderId: row.deck_id,
    kanji: row.kanji,
    hanViet: row.han_viet || '',
    onReadings: Array.isArray(row.on_readings) ? row.on_readings : [],
    kunReadings: Array.isArray(row.kun_readings) ? row.kun_readings : [],
    meanings: Array.isArray(row.meanings) ? row.meanings : [],
    strokeCount: row.stroke_count ?? undefined,
    srsState: row.srs_state || {
      dueAt: Date.now(),
      intervalMinutes: 0,
      easeFactor: 2.5,
      repetitions: 0,
    },
    compoundWords: Array.isArray(row.compound_words) ? row.compound_words : [],
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
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
    parent_id: folder.parentId ?? null,
    name: folder.name,
    description: folder.description || '',
    sort_order: Number(folder.sortOrder ?? 0),
    is_public: Boolean(folder.isPublic),
    share_slug: folder.shareSlug || null,
    sync_version: syncVersion,
    created_at: folder.createdAt ? new Date(folder.createdAt).toISOString() : nowIso,
    updated_at: folder.updatedAt ? new Date(folder.updatedAt).toISOString() : nowIso,
    deleted_at: null,
  };
}

export function kanjiItemToDbRow(
  item: SyncKanjiItem,
  userId: string,
  syncVersion: number,
  nowIso: string
) {
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
    compound_words: Array.isArray(item.compoundWords) ? item.compoundWords : [],
    sync_version: syncVersion,
    created_at: item.createdAt ? new Date(item.createdAt).toISOString() : nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };
}
