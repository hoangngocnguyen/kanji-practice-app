import { FolderKanjiItem, SrsState, StudyFolder } from '../types/deck';
import { getSupabaseAccessToken } from '../utils/supabaseClient';

export const STORAGE_SYNC_META_KEY = 'kanji_sync_meta_v1';

export interface DeletedTombstone {
  id: string;
  deletedAt: number;
}

export interface LocalSyncMeta {
  lastSyncedUserId: string | null;
  lastSyncedVersion: number;
  lastSyncedAt: number | null;
  lastSyncedHash: string;
  dirtySinceLastSync: boolean;
  lastLocalModifiedAt: number;
  hasUserModifiedData: boolean;
  deletedFolderIds: DeletedTombstone[];
  deletedItemIds: DeletedTombstone[];
}

export const DEFAULT_SYNC_META: LocalSyncMeta = {
  lastSyncedUserId: null,
  lastSyncedVersion: 0,
  lastSyncedAt: null,
  lastSyncedHash: '',
  dirtySinceLastSync: false,
  lastLocalModifiedAt: 0,
  hasUserModifiedData: false,
  deletedFolderIds: [],
  deletedItemIds: [],
};

export function loadLocalSyncMeta(): LocalSyncMeta {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_META_KEY);
    if (!raw) return { ...DEFAULT_SYNC_META };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SYNC_META,
      ...parsed,
      deletedFolderIds: Array.isArray(parsed.deletedFolderIds)
        ? parsed.deletedFolderIds
        : [],
      deletedItemIds: Array.isArray(parsed.deletedItemIds) ? parsed.deletedItemIds : [],
    };
  } catch {
    return { ...DEFAULT_SYNC_META };
  }
}

export function saveLocalSyncMeta(meta: LocalSyncMeta): void {
  try {
    localStorage.setItem(STORAGE_SYNC_META_KEY, JSON.stringify(meta));
  } catch {}
}

function normalizeSrsState(srs: Partial<SrsState> | undefined) {
  return {
    dueAt: Number(srs?.dueAt || 0),
    intervalMinutes: Number(srs?.intervalMinutes || 0),
    easeFactor: Number(srs?.easeFactor ?? 2.5),
    repetitions: Number(srs?.repetitions || 0),
    lastRating: srs?.lastRating || null,
    lastReviewedAt: srs?.lastReviewedAt ? Number(srs.lastReviewedAt) : null,
  };
}

export function buildClientCanonicalPayload(
  folders: StudyFolder[],
  items: FolderKanjiItem[]
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

export async function computeClientDeckHash(
  folders: StudyFolder[],
  items: FolderKanjiItem[]
): Promise<string> {
  const canonical = buildClientCanonicalPayload(folders, items);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(canonical);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

export type SyncDecision = 'up_to_date' | 'auto_push' | 'auto_pull' | 'conflict';

export interface SyncSideSummary {
  deckCount: number;
  cardCount: number;
  compoundCount: number;
  lastModifiedAt: number | null;
  syncVersion?: number;
}

export interface SyncCheckResponse {
  decision: SyncDecision;
  reason: string;
  serverSummary: {
    syncVersion: number;
    dataHash: string;
    lastSyncAt: string | null;
    deckCount: number;
    cardCount: number;
    compoundCount: number;
  };
}

export interface SyncConflictInfo {
  reason: string;
  localSummary: SyncSideSummary;
  serverSummary: SyncSideSummary;
}

async function authorizedFetch(url: string, init: RequestInit = {}) {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: any = new Error(data?.error || `Lỗi đồng bộ (${res.status}).`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }

  return data;
}

export async function apiCheckSyncStatus(payload: {
  lastSyncedVersion: number;
  lastSyncedUserId: string | null;
  localHasChanges: boolean;
  localDataHash: string;
  localStats: {
    deckCount: number;
    cardCount: number;
    compoundCount: number;
    lastModifiedAt: number;
    deletedDeckCount: number;
    deletedCardCount: number;
    hasUserModifiedData: boolean;
  };
}): Promise<SyncCheckResponse> {
  return authorizedFetch('/api/sync/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiMergeSync(payload: {
  baseVersion: number;
  folders: StudyFolder[];
  items: FolderKanjiItem[];
  deletedFolderIds: DeletedTombstone[];
  deletedItemIds: DeletedTombstone[];
}): Promise<{
  ok: boolean;
  syncVersion: number;
  syncedAt: number;
  dataHash: string;
  folders: StudyFolder[];
  items: FolderKanjiItem[];
}> {
  return authorizedFetch('/api/sync/merge', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiForcePushSync(payload: {
  folders: StudyFolder[];
  items: FolderKanjiItem[];
}): Promise<{
  ok: boolean;
  syncVersion: number;
  syncedAt: number;
  dataHash: string;
  deckCount: number;
  cardCount: number;
}> {
  return authorizedFetch('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiForcePullSync(): Promise<{
  syncVersion: number;
  syncedAt: number;
  dataHash: string;
  folders: StudyFolder[];
  items: FolderKanjiItem[];
}> {
  return authorizedFetch('/api/sync/pull', {
    method: 'GET',
  });
}
