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
    isUntouchedStarter: boolean;
  };
}): Promise<SyncCheckResponse> {
  return authorizedFetch('/api/sync/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

const STARTER_FOLDER_IDS = new Set([
  'starter-n5',
  'starter-n5-b1',
  'starter-n5-b2',
]);
const STARTER_ITEM_IDS = new Set(['item-nichi', 'item-getsu', 'item-ken']);

export function isUntouchedStarterDeck(
  folders: StudyFolder[],
  items: FolderKanjiItem[],
  hasUserModifiedData: boolean
): boolean {
  if (hasUserModifiedData) return false;
  if (folders.length !== 3 || items.length !== 3) return false;
  const allFoldersAreStarter = folders.every((f) => STARTER_FOLDER_IDS.has(f.id));
  const allItemsAreStarter = items.every(
    (it) =>
      STARTER_ITEM_IDS.has(it.id) &&
      (it.srsState?.repetitions || 0) === 0
  );
  return allFoldersAreStarter && allItemsAreStarter;
}

export interface CloudSnapshot {
  syncVersion: number;
  syncedAt: number;
  dataHash: string;
  folders: StudyFolder[];
  items: FolderKanjiItem[];
}

export type DiffStatus = 'matched' | 'local_only' | 'cloud_only' | 'modified';

export interface DiffCardEntry {
  id: string;
  kanji: string;
  hanViet: string;
  status: DiffStatus;
  changeDetails: string[];
  localCompoundCount: number;
  cloudCompoundCount: number;
  localReps: number;
  cloudReps: number;
}

export interface DiffFolderEntry {
  id: string;
  name: string;
  pathLabel: string;
  status: DiffStatus;
  nameConflictHint?: string;
  localFolder?: StudyFolder;
  cloudFolder?: StudyFolder;
  localCardCount: number;
  cloudCardCount: number;
  localCompoundCount: number;
  cloudCompoundCount: number;
  cardDiffs: DiffCardEntry[];
}

export interface SyncDiffReport {
  isExactMatch: boolean;
  folderStats: {
    total: number;
    matched: number;
    localOnly: number;
    cloudOnly: number;
    modified: number;
  };
  cardStats: {
    total: number;
    matched: number;
    localOnly: number;
    cloudOnly: number;
    modified: number;
  };
  folderDiffs: DiffFolderEntry[];
}

function buildFolderPathLabel(
  folderId: string,
  folderMap: Map<string, StudyFolder>
): string {
  const parts: string[] = [];
  let curr = folderMap.get(folderId);
  const seen = new Set<string>();
  while (curr && !seen.has(curr.id)) {
    seen.add(curr.id);
    parts.unshift(curr.name);
    curr = curr.parentId ? folderMap.get(curr.parentId) : undefined;
  }
  return parts.join(' / ');
}

function canonicalItemFingerprint(item: FolderKanjiItem): string {
  return JSON.stringify({
    folderId: item.folderId,
    kanji: item.kanji,
    hanViet: item.hanViet || '',
    onReadings: Array.isArray(item.onReadings) ? item.onReadings : [],
    kunReadings: Array.isArray(item.kunReadings) ? item.kunReadings : [],
    meanings: Array.isArray(item.meanings) ? item.meanings : [],
    strokeCount: item.strokeCount ?? null,
    srsState: normalizeSrsState(item.srsState),
    compoundWords: [...(Array.isArray(item.compoundWords) ? item.compoundWords : [])]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((cw) => ({
        id: cw.id,
        word: cw.word,
        reading: cw.reading || '',
        hanViet: cw.hanViet || '',
        meaning: cw.meaning || '',
        srsState: normalizeSrsState(cw.srsState),
      })),
  });
}

export function computeSyncDiff(
  localFolders: StudyFolder[],
  localItems: FolderKanjiItem[],
  cloudFolders: StudyFolder[],
  cloudItems: FolderKanjiItem[]
): SyncDiffReport {
  const localFolderMap = new Map(localFolders.map((f) => [f.id, f]));
  const cloudFolderMap = new Map(cloudFolders.map((f) => [f.id, f]));

  const localPathSet = new Map<string, string>();
  localFolders.forEach((f) => {
    localPathSet.set(buildFolderPathLabel(f.id, localFolderMap).toLowerCase(), f.id);
  });
  const cloudPathSet = new Map<string, string>();
  cloudFolders.forEach((f) => {
    cloudPathSet.set(buildFolderPathLabel(f.id, cloudFolderMap).toLowerCase(), f.id);
  });

  const allFolderIds = Array.from(
    new Set([...localFolders.map((f) => f.id), ...cloudFolders.map((f) => f.id)])
  );

  const folderDiffs: DiffFolderEntry[] = [];
  const folderStats = { total: 0, matched: 0, localOnly: 0, cloudOnly: 0, modified: 0 };
  const cardStats = { total: 0, matched: 0, localOnly: 0, cloudOnly: 0, modified: 0 };

  for (const folderId of allFolderIds) {
    const lf = localFolderMap.get(folderId);
    const cf = cloudFolderMap.get(folderId);

    const lItems = localItems.filter((it) => it.folderId === folderId);
    const cItems = cloudItems.filter((it) => it.folderId === folderId);

    const lItemMap = new Map(lItems.map((it) => [it.id, it]));
    const cItemMap = new Map(cItems.map((it) => [it.id, it]));
    const allItemIds = Array.from(new Set([...lItemMap.keys(), ...cItemMap.keys()]));

    const cardDiffs: DiffCardEntry[] = [];
    let hasCardDiff = false;

    for (const itemId of allItemIds) {
      const li = lItemMap.get(itemId);
      const ci = cItemMap.get(itemId);
      cardStats.total += 1;

      if (li && !ci) {
        hasCardDiff = true;
        cardStats.localOnly += 1;
        cardDiffs.push({
          id: itemId,
          kanji: li.kanji,
          hanViet: li.hanViet || '',
          status: 'local_only',
          changeDetails: ['Chỉ tồn tại trên máy này'],
          localCompoundCount: li.compoundWords?.length || 0,
          cloudCompoundCount: 0,
          localReps: li.srsState?.repetitions || 0,
          cloudReps: 0,
        });
      } else if (!li && ci) {
        hasCardDiff = true;
        cardStats.cloudOnly += 1;
        cardDiffs.push({
          id: itemId,
          kanji: ci.kanji,
          hanViet: ci.hanViet || '',
          status: 'cloud_only',
          changeDetails: ['Chỉ tồn tại trên Cloud'],
          localCompoundCount: 0,
          cloudCompoundCount: ci.compoundWords?.length || 0,
          localReps: 0,
          cloudReps: ci.srsState?.repetitions || 0,
        });
      } else if (li && ci) {
        const lFp = canonicalItemFingerprint(li);
        const cFp = canonicalItemFingerprint(ci);
        const lCompCount = li.compoundWords?.length || 0;
        const cCompCount = ci.compoundWords?.length || 0;
        const lReps = li.srsState?.repetitions || 0;
        const cReps = ci.srsState?.repetitions || 0;

        if (lFp === cFp) {
          cardStats.matched += 1;
          cardDiffs.push({
            id: itemId,
            kanji: li.kanji,
            hanViet: li.hanViet || '',
            status: 'matched',
            changeDetails: [],
            localCompoundCount: lCompCount,
            cloudCompoundCount: cCompCount,
            localReps: lReps,
            cloudReps: cReps,
          });
        } else {
          hasCardDiff = true;
          cardStats.modified += 1;
          const details: string[] = [];
          if (lCompCount !== cCompCount) {
            details.push(`Từ ghép: Máy ${lCompCount} / Cloud ${cCompCount}`);
          }
          if (
            JSON.stringify(normalizeSrsState(li.srsState)) !==
            JSON.stringify(normalizeSrsState(ci.srsState))
          ) {
            details.push(`Tiến độ SRS khác (Ôn: Máy ${lReps} / Cloud ${cReps})`);
          }
          if (details.length === 0) {
            details.push('Thông tin thẻ hoặc danh sách từ ghép khác nhau');
          }
          cardDiffs.push({
            id: itemId,
            kanji: li.kanji,
            hanViet: li.hanViet || '',
            status: 'modified',
            changeDetails: details,
            localCompoundCount: lCompCount,
            cloudCompoundCount: cCompCount,
            localReps: lReps,
            cloudReps: cReps,
          });
        }
      }
    }

    const localCompoundCount = lItems.reduce(
      (s, it) => s + (it.compoundWords?.length || 0),
      0
    );
    const cloudCompoundCount = cItems.reduce(
      (s, it) => s + (it.compoundWords?.length || 0),
      0
    );

    const pathLabel = lf
      ? buildFolderPathLabel(lf.id, localFolderMap)
      : buildFolderPathLabel(cf!.id, cloudFolderMap);

    let folderStatus: DiffStatus = 'matched';
    let nameConflictHint: string | undefined;

    if (lf && !cf) {
      folderStatus = 'local_only';
      folderStats.localOnly += 1;
      const otherId = cloudPathSet.get(pathLabel.toLowerCase());
      if (otherId && otherId !== lf.id) {
        nameConflictHint = 'Cloud cũng có thư mục cùng tên nhưng khác ID nội bộ';
      }
    } else if (!lf && cf) {
      folderStatus = 'cloud_only';
      folderStats.cloudOnly += 1;
      const otherId = localPathSet.get(pathLabel.toLowerCase());
      if (otherId && otherId !== cf.id) {
        nameConflictHint = 'Máy cũng có thư mục cùng tên nhưng khác ID nội bộ';
      }
    } else if (lf && cf) {
      const folderMetaDiff =
        lf.name !== cf.name ||
        (lf.description || '') !== (cf.description || '') ||
        (lf.parentId ?? null) !== (cf.parentId ?? null) ||
        Number(lf.sortOrder || 0) !== Number(cf.sortOrder || 0);
      if (folderMetaDiff || hasCardDiff) {
        folderStatus = 'modified';
        folderStats.modified += 1;
      } else {
        folderStatus = 'matched';
        folderStats.matched += 1;
      }
    }

    folderStats.total += 1;
    folderDiffs.push({
      id: folderId,
      name: (lf || cf)!.name,
      pathLabel,
      status: folderStatus,
      nameConflictHint,
      localFolder: lf,
      cloudFolder: cf,
      localCardCount: lItems.length,
      cloudCardCount: cItems.length,
      localCompoundCount,
      cloudCompoundCount,
      cardDiffs,
    });
  }

  // Sort: differences first, then matched, alphabetically by path
  const statusPriority: Record<DiffStatus, number> = {
    local_only: 0,
    cloud_only: 1,
    modified: 2,
    matched: 3,
  };
  folderDiffs.sort((a, b) => {
    const pDiff = statusPriority[a.status] - statusPriority[b.status];
    if (pDiff !== 0) return pDiff;
    return a.pathLabel.localeCompare(b.pathLabel, 'vi');
  });

  const isExactMatch =
    folderStats.localOnly === 0 &&
    folderStats.cloudOnly === 0 &&
    folderStats.modified === 0 &&
    cardStats.localOnly === 0 &&
    cardStats.cloudOnly === 0 &&
    cardStats.modified === 0;

  return {
    isExactMatch,
    folderStats,
    cardStats,
    folderDiffs,
  };
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

export async function apiForcePullSync(): Promise<CloudSnapshot> {
  return authorizedFetch('/api/sync/pull', {
    method: 'GET',
  });
}
