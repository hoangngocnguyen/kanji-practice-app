import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { User } from '@supabase/supabase-js';
import { useLocation } from 'react-router-dom';
import {
  CardExampleSentence,
  CompoundWordCard,
  FlashcardReviewItem,
  FolderKanjiItem,
  KanjiDeckExportBundle,
  ReviewFilterMode,
  SrsConfig,
  SrsRating,
  StudyFolder,
} from '../types/deck';
import { KanjiDetail } from '../types/kanji';
import {
  calculateNextSrsState,
  createInitialSrsState,
  DEFAULT_SRS_CONFIG,
} from '../utils/srsAlgorithm';
import { extractUniqueKanji } from '../utils/kanji';
import { getKanjiInfo } from '../data/kanjiDictionary';
import {
  cleanMeaningsList,
  cleanReadingsList,
  getFullKanjiDetail,
  hasMissingKanjiData,
  isNoisyClassicalGloss,
} from '../utils/kanjiApi';
import {
  ParsedCompoundWordInput,
  ParsedExampleSentenceInput,
  ParsedLessonItemInput,
} from '../utils/batchLessonParser';
import {
  publishFolderShareToCloud,
  unpublishFolderShareFromCloud,
} from '../utils/supabaseClient';
import { useAuth } from './AuthContext';
import {
  apiCheckSyncStatus,
  apiForcePullSync,
  apiForcePushSync,
  apiMergeSync,
  clearSyncBaselineSnapshot,
  CloudSnapshot,
  computeClientDeckHash,
  DEFAULT_SYNC_META,
  DeletedCompoundTombstone,
  isUntouchedStarterDeck,
  loadLocalSyncMeta,
  loadSyncBaselineSnapshot,
  LocalSyncMeta,
  saveLocalSyncMeta,
  saveSyncBaselineSnapshot,
  SyncConflictInfo,
} from '../services/syncService';
import {
  applyCollisionResolutions,
  threeWayMergeDecks,
} from '../utils/threeWayMerge';
import { recordStudyReview } from '../services/studyStatsService';
import {
  getActiveMistakes,
  recordKanjiMistake,
  recordKanjiSuccess,
} from '../services/mistakeBankService';

const STORAGE_FOLDERS_KEY = 'kanji_decks_folders_v1';
const STORAGE_ITEMS_KEY = 'kanji_decks_items_v1';
const STORAGE_SRS_CONFIG_KEY = 'kanji_decks_srs_config_v1';
const STORAGE_STARTER_SEEDED_KEY = 'kanji_decks_starter_seeded_v1';

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function toCardExamples(
  parsed: ParsedExampleSentenceInput[] | undefined
): CardExampleSentence[] | undefined {
  if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
  const seen = new Set<string>();
  const list: CardExampleSentence[] = [];
  for (const ex of parsed) {
    const jp = (ex.jp || '').trim();
    const kana = (ex.kana || '').trim();
    const vi = (ex.vi || '').trim();
    if (!jp || !vi || seen.has(jp)) continue;
    seen.add(jp);
    list.push({ id: genId(), jp, kana, vi });
  }
  return list.length > 0 ? list : undefined;
}

function mergeCardExamples(
  existing: CardExampleSentence[] | undefined,
  incoming: ParsedExampleSentenceInput[] | undefined
): { merged: CardExampleSentence[] | undefined; addedCount: number } {
  const prev = Array.isArray(existing) ? existing : [];
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return { merged: prev.length > 0 ? prev : undefined, addedCount: 0 };
  }
  const seenJp = new Set(prev.map((e) => e.jp.trim()));
  const next = [...prev];
  let addedCount = 0;
  for (const ex of incoming) {
    const jp = (ex.jp || '').trim();
    const kana = (ex.kana || '').trim();
    const vi = (ex.vi || '').trim();
    if (!jp || !vi || seenJp.has(jp)) continue;
    seenJp.add(jp);
    next.push({ id: genId(), jp, kana, vi });
    addedCount += 1;
  }
  return {
    merged: next.length > 0 ? next : undefined,
    addedCount,
  };
}

function createStarterData(): { folders: StudyFolder[]; items: FolderKanjiItem[] } {
  const now = Date.now();
  const rootId = 'starter-n5';
  const lesson1Id = 'starter-n5-b1';
  const lesson2Id = 'starter-n5-b2';

  const folders: StudyFolder[] = [
    {
      id: rootId,
      parentId: null,
      name: 'JLPT N5 · Cơ bản',
      description: 'Thư mục cha mẫu chứa các bài học nền tảng',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: lesson1Id,
      parentId: rootId,
      name: 'Bài 1 · Thời gian & Mặt trời',
      description: 'Nhật, Nguyệt, Thời, Gian',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: lesson2Id,
      parentId: rootId,
      name: 'Bài 2 · Con người & Hành động',
      description: 'Nhân, Kiến, Hành, Học',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const items: FolderKanjiItem[] = [
    {
      id: 'item-nichi',
      folderId: lesson1Id,
      kanji: '日',
      hanViet: 'NHẬT',
      onReadings: ['ニチ', 'ジツ'],
      kunReadings: ['ひ', 'か'],
      meanings: ['Mặt trời', 'Ngày', 'Nhật Bản'],
      strokeCount: 4,
      srsState: createInitialSrsState(now),
      createdAt: now,
      compoundWords: [
        {
          id: 'cw-nihon',
          word: '日本',
          reading: 'にほん',
          hanViet: 'NHẬT BẢN',
          meaning: 'Nước Nhật Bản',
          srsState: createInitialSrsState(now),
        },
        {
          id: 'cw-kyou',
          word: '今日',
          reading: 'きょう',
          hanViet: 'KIM NHẬT',
          meaning: 'Hôm nay',
          srsState: createInitialSrsState(now),
        },
      ],
    },
    {
      id: 'item-getsu',
      folderId: lesson1Id,
      kanji: '月',
      hanViet: 'NGUYỆT',
      onReadings: ['ゲツ', 'ガツ'],
      kunReadings: ['つき'],
      meanings: ['Mặt trăng', 'Tháng'],
      strokeCount: 4,
      srsState: createInitialSrsState(now),
      createdAt: now,
      compoundWords: [
        {
          id: 'cw-getsuyoubi',
          word: '月曜日',
          reading: 'げつようび',
          hanViet: 'NGUYỆT DIỆU NHẬT',
          meaning: 'Thứ Hai',
          srsState: createInitialSrsState(now),
        },
      ],
    },
    {
      id: 'item-ken',
      folderId: lesson2Id,
      kanji: '見',
      hanViet: 'KIẾN',
      onReadings: ['ケン'],
      kunReadings: ['み.る', 'み.える'],
      meanings: ['Nhìn', 'Xem', 'Trông thấy'],
      strokeCount: 7,
      srsState: createInitialSrsState(now),
      createdAt: now,
      compoundWords: [
        {
          id: 'cw-kengaku',
          word: '見学',
          reading: 'けんがく',
          hanViet: 'KIẾN HỌC',
          meaning: 'Tham quan học hỏi',
          srsState: createInitialSrsState(now),
        },
      ],
    },
  ];

  return { folders, items };
}

export interface FolderTreeNodeInput {
  name: string;
  children: FolderTreeNodeInput[];
}

export interface ReviewSyncGateState {
  isOpen: boolean;
  context: 'enter_decks' | 'start_session';
  stage: 'checking' | 'merging' | 'done' | 'error';
  summaryText: string | null;
  errorText: string | null;
}

export type SyncTriggerSource =
  | 'startup'
  | 'focus'
  | 'online'
  | 'review_page'
  | 'pre_review'
  | 'auto_save'
  | 'manual';

interface DeckContextValue {
  folders: StudyFolder[];
  items: FolderKanjiItem[];
  srsConfig: SrsConfig;
  setSrsConfig: (config: SrsConfig) => void;
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;

  // Tree & Query Helpers
  getDescendantFolderIds: (folderId: string) => string[];
  getFolderPath: (folderId: string) => StudyFolder[];
  getItemsForFolderRecursive: (folderId: string) => FolderKanjiItem[];
  getReviewCardsForFolder: (
    folderId: string,
    mode: ReviewFilterMode,
    onlyDue?: boolean
  ) => FlashcardReviewItem[];
  getDueCountForFolderRecursive: (folderId: string) => number;

  // Folder CRUD
  isDuplicateFolderName: (name: string, parentId: string | null, excludeId?: string) => boolean;
  createFolder: (
    name: string,
    parentId: string | null,
    description?: string
  ) => { ok: boolean; error?: string; folder?: StudyFolder };
  createFolderTree: (
    parentId: string | null,
    nodes: FolderTreeNodeInput[]
  ) => { createdCount: number; skippedCount: number };
  renameFolder: (
    id: string,
    name: string,
    description?: string
  ) => { ok: boolean; error?: string };
  moveFolder: (
    folderId: string,
    targetParentId: string | null
  ) => { ok: boolean; error?: string };
  deleteFolder: (id: string) => void;

  // Kanji & Compound Word CRUD
  addKanjiListToFolder: (folderId: string, rawText: string) => Promise<number>;
  addCatalogKanjiToFolder: (
    folderId: string,
    entries: KanjiDetail[]
  ) => { addedCount: number; skippedCount: number };
  batchImportItemsToFolder: (
    folderId: string,
    parsedItems: ParsedLessonItemInput[]
  ) => Promise<{
    addedKanji: number;
    mergedKanji: number;
    addedCompoundWords: number;
    addedExamples?: number;
  }>;
  updateKanjiItem: (itemId: string, patch: Partial<FolderKanjiItem>) => void;
  deleteKanjiItem: (itemId: string) => void;
  deleteKanjiItems: (itemIds: string[]) => void;
  moveKanjiItems: (
    itemIds: string[],
    targetFolderId: string
  ) => { movedCount: number; mergedCount: number };
  enrichingItemIds: Record<string, boolean>;
  enrichKanjiItems: (targetItems: FolderKanjiItem[], forceRetry?: boolean) => Promise<number>;
  addCompoundWord: (
    kanjiItemId: string,
    payload: { word: string; reading: string; hanViet: string; meaning: string }
  ) => void;
  batchAddCompoundWords: (
    kanjiItemId: string,
    words: ParsedCompoundWordInput[]
  ) => number;
  updateCompoundWord: (
    kanjiItemId: string,
    wordId: string,
    patch: Partial<Omit<CompoundWordCard, 'id' | 'srsState'>>
  ) => void;
  deleteCompoundWord: (kanjiItemId: string, wordId: string) => void;
  deleteCompoundWords: (kanjiItemId: string, wordIds: string[]) => void;

  // SRS Grading
  gradeFlashcard: (card: FlashcardReviewItem, rating: SrsRating) => void;

  // JSON Export / Import
  buildExportBundle: (folderId: string) => KanjiDeckExportBundle | null;
  buildFullExportBundle: () => KanjiDeckExportBundle | null;
  detectImportConflicts: (
    bundle: KanjiDeckExportBundle,
    targetParentId: string | null
  ) => string[];
  importDeckBundle: (
    bundle: KanjiDeckExportBundle,
    targetParentId: string | null,
    resetSrs: boolean,
    conflictMode?: 'merge' | 'copy'
  ) => { importedFolders: number; importedKanji: number; rootFolderId: string };

  // Supabase Cloud & AnkiDroid Sync
  supabaseEnabled: boolean;
  cloudUser: User | null;
  isSyncing: boolean;
  syncStatus: 'idle' | 'checking' | 'syncing' | 'synced' | 'conflict' | 'error';
  syncMessage: string | null;
  syncConflict: SyncConflictInfo | null;
  lastSyncedAt: number | null;
  lastSyncedVersion: number;
  hasUnsyncedChanges: boolean;
  syncError: string | null;
  reviewSyncGate: ReviewSyncGateState;
  runSyncGate: (
    context: 'enter_decks' | 'start_session',
    onReady?: () => void
  ) => Promise<void>;
  retrySyncGate: () => Promise<void>;
  bypassSyncGate: () => void;
  flushPendingSync: () => Promise<void>;
  triggerAnkiSync: () => Promise<'auth_required' | 'synced' | 'conflict' | 'error'>;
  resolveSelectiveCollisions: (
    resolutions: Record<string, 'keep' | 'delete'>
  ) => Promise<void>;
  resolveConflictUnionMerge: () => Promise<void>;
  resolveConflictPush: () => Promise<void>;
  resolveConflictPull: () => Promise<void>;
  dismissConflict: () => void;
  clearSyncMessage: () => void;
  isCloudInspectorOpen: boolean;
  cloudSnapshot: CloudSnapshot | null;
  isLoadingCloudSnapshot: boolean;
  cloudSnapshotError: string | null;
  openCloudInspector: () => Promise<void>;
  refreshCloudSnapshot: () => Promise<CloudSnapshot | null>;
  closeCloudInspector: () => void;
  syncNowToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  logoutCloud: () => Promise<void>;
  publishFolderPublicly: (folderId: string) => Promise<string>;
  unpublishFolderPublicly: (folderId: string) => Promise<void>;
}

const DeckContext = createContext<DeckContextValue | undefined>(undefined);

export const DeckProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialStarter] = useState<{
    folders: StudyFolder[];
    items: FolderKanjiItem[];
  } | null>(() => {
    try {
      const savedFolders = localStorage.getItem(STORAGE_FOLDERS_KEY);
      const alreadySeeded = localStorage.getItem(STORAGE_STARTER_SEEDED_KEY) === '1';

      // If user already has saved folders (including empty array []) or starter was already seeded once, do not recreate starter data
      if (savedFolders !== null || alreadySeeded) {
        if (!alreadySeeded) {
          localStorage.setItem(STORAGE_STARTER_SEEDED_KEY, '1');
        }
        return null;
      }

      const starter = createStarterData();
      localStorage.setItem(STORAGE_STARTER_SEEDED_KEY, '1');
      return starter;
    } catch {
      return null;
    }
  });

  const [folders, setFolders] = useState<StudyFolder[]>(() => {
    if (initialStarter) return initialStarter.folders;
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [items, setItems] = useState<FolderKanjiItem[]>(() => {
    if (initialStarter) return initialStarter.items;
    try {
      const saved = localStorage.getItem(STORAGE_ITEMS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [srsConfig, setSrsConfigState] = useState<SrsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SRS_CONFIG_KEY);
      if (saved) return { ...DEFAULT_SRS_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SRS_CONFIG;
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    return folders[0]?.id ?? null;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
    } catch {}
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const setSrsConfig = useCallback((config: SrsConfig) => {
    setSrsConfigState(config);
    try {
      localStorage.setItem(STORAGE_SRS_CONFIG_KEY, JSON.stringify(config));
    } catch {}
  }, []);

  // Auth & AnkiDroid Sync State
  const {
    user: cloudUser,
    displayName: authDisplayName,
    supabaseEnabled,
    openAuthGuard,
    refreshProfile,
    logout: authLogout,
  } = useAuth();

  const [syncMeta, setSyncMeta] = useState<LocalSyncMeta>(() => loadLocalSyncMeta());
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'checking' | 'syncing' | 'synced' | 'conflict' | 'error'
  >('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState<SyncConflictInfo | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [isCloudInspectorOpen, setIsCloudInspectorOpen] = useState(false);
  const [cloudSnapshot, setCloudSnapshot] = useState<CloudSnapshot | null>(null);
  const [isLoadingCloudSnapshot, setIsLoadingCloudSnapshot] = useState(false);
  const [cloudSnapshotError, setCloudSnapshotError] = useState<string | null>(null);

  const [enrichingItemIds, setEnrichingItemIds] = useState<Record<string, boolean>>({});
  const attemptedEnrichRef = useRef<Set<string>>(new Set());
  const activeEnrichRef = useRef<Set<string>>(new Set());

  const isStarterUntouched = useMemo(
    () => isUntouchedStarterDeck(folders, items, syncMeta.hasUserModifiedData),
    [folders, items, syncMeta.hasUserModifiedData]
  );

  const isSyncing = syncStatus === 'checking' || syncStatus === 'syncing';
  const lastSyncedAt = syncMeta.lastSyncedAt;
  const lastSyncedVersion = syncMeta.lastSyncedVersion;
  const hasUnsyncedChanges =
    syncMeta.dirtySinceLastSync ||
    syncMeta.deletedFolderIds.length > 0 ||
    syncMeta.deletedItemIds.length > 0 ||
    syncMeta.deletedCompoundKeys.length > 0 ||
    (syncMeta.lastSyncedVersion === 0 &&
      (folders.length > 0 || items.length > 0) &&
      !isStarterUntouched);

  // Fresh refs to prevent stale closures inside async sync & debounced timers
  const latestFoldersRef = useRef<StudyFolder[]>(folders);
  const latestItemsRef = useRef<FolderKanjiItem[]>(items);
  const latestSyncMetaRef = useRef<LocalSyncMeta>(syncMeta);
  const latestCloudUserRef = useRef<User | null>(cloudUser);
  latestFoldersRef.current = folders;
  latestItemsRef.current = items;
  latestSyncMetaRef.current = syncMeta;
  latestCloudUserRef.current = cloudUser;

  const location = useLocation();
  const isDecksRoute =
    location.pathname === '/decks' || location.pathname.startsWith('/decks/');
  const isDecksRouteRef = useRef(isDecksRoute);
  isDecksRouteRef.current = isDecksRoute;
  const wasInDecksRouteRef = useRef<boolean>(false);
  const decksVisitSyncedUserIdRef = useRef<string | null>(null);

  const mutationSeqRef = useRef(0);
  const inFlightSyncRef = useRef<Promise<
    'auth_required' | 'synced' | 'conflict' | 'error'
  > | null>(null);
  const queuedFollowUpSyncRef = useRef(false);
  const debounceAutoSyncTimerRef = useRef<number | null>(null);
  const lastSuccessfulCheckAtRef = useRef<number>(0);

  const [reviewSyncGate, setReviewSyncGate] = useState<ReviewSyncGateState>({
    isOpen: false,
    context: 'enter_decks',
    stage: 'checking',
    summaryText: null,
    errorText: null,
  });
  const syncGateReadyCallbackRef = useRef<(() => void) | null>(null);
  const syncGateDismissedRef = useRef(false);
  const syncGateTimerRef = useRef<number | null>(null);
  const runSmartSyncRef = useRef<
    (opts?: {
      trigger?: SyncTriggerSource;
      silent?: boolean;
      onStage?: (stage: 'checking' | 'merging') => void;
    }) => Promise<{
      outcome: 'auth_required' | 'synced' | 'conflict' | 'error';
      summaryText?: string | null;
      errorText?: string | null;
    }>
  >(async () => ({ outcome: 'error' }));
  const runSyncGateRef = useRef<
    (
      context: 'enter_decks' | 'start_session',
      onReady?: () => void
    ) => Promise<void>
  >(async () => {});

  const updateSyncMeta = useCallback(
    (updater: (prev: LocalSyncMeta) => LocalSyncMeta) => {
      setSyncMeta((prev) => {
        const next = updater(prev);
        latestSyncMetaRef.current = next;
        saveLocalSyncMeta(next);
        return next;
      });
    },
    []
  );

  const scheduleDebouncedAutoSync = useCallback(() => {
    if (!latestCloudUserRef.current || !supabaseEnabled) return;
    // Inside the Decks feature, keep study/edit changes locally and sync when leaving for another feature
    if (isDecksRouteRef.current) return;
    if (debounceAutoSyncTimerRef.current) {
      window.clearTimeout(debounceAutoSyncTimerRef.current);
    }
    debounceAutoSyncTimerRef.current = window.setTimeout(() => {
      debounceAutoSyncTimerRef.current = null;
      void runSmartSyncRef.current({ trigger: 'auto_save', silent: true });
    }, 1800);
  }, [supabaseEnabled]);

  const markLocalMutation = useCallback(
    (opts?: {
      deletedFolders?: string[];
      deletedItems?: string[];
      deletedCompounds?: Array<{ itemId: string; wordId: string; word: string }>;
    }) => {
      const now = Date.now();
      mutationSeqRef.current += 1;
      updateSyncMeta((prev) => {
        const existingDeletedFolders = new Map(
          prev.deletedFolderIds.map((d) => [d.id, d])
        );
        (opts?.deletedFolders || []).forEach((id) => {
          existingDeletedFolders.set(id, { id, deletedAt: now });
        });

        const existingDeletedItems = new Map(
          prev.deletedItemIds.map((d) => [d.id, d])
        );
        (opts?.deletedItems || []).forEach((id) => {
          existingDeletedItems.set(id, { id, deletedAt: now });
        });

        const existingDeletedCompounds = new Map(
          prev.deletedCompoundKeys.map((d) => [`${d.itemId}::${d.word}`, d])
        );
        (opts?.deletedCompounds || []).forEach((c) => {
          existingDeletedCompounds.set(`${c.itemId}::${c.word}`, {
            ...c,
            deletedAt: now,
          });
        });

        return {
          ...prev,
          dirtySinceLastSync: true,
          hasUserModifiedData: true,
          lastLocalModifiedAt: now,
          deletedFolderIds: Array.from(existingDeletedFolders.values()),
          deletedItemIds: Array.from(existingDeletedItems.values()),
          deletedCompoundKeys: Array.from(existingDeletedCompounds.values()),
        };
      });
      scheduleDebouncedAutoSync();
    },
    [updateSyncMeta, scheduleDebouncedAutoSync]
  );

  // Tree Helpers
  const getDescendantFolderIds = useCallback(
    (folderId: string): string[] => {
      const result: string[] = [folderId];
      const queue = [folderId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = folders.filter((f) => f.parentId === current);
        for (const child of children) {
          result.push(child.id);
          queue.push(child.id);
        }
      }
      return result;
    },
    [folders]
  );

  const getFolderPath = useCallback(
    (folderId: string): StudyFolder[] => {
      const path: StudyFolder[] = [];
      let current = folders.find((f) => f.id === folderId);
      const visited = new Set<string>();
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        path.unshift(current);
        current = current.parentId
          ? folders.find((f) => f.id === current!.parentId)
          : undefined;
      }
      return path;
    },
    [folders]
  );

  const getItemsForFolderRecursive = useCallback(
    (folderId: string): FolderKanjiItem[] => {
      if (folderId === '__ALL__') {
        return items;
      }
      const ids = new Set(getDescendantFolderIds(folderId));
      return items.filter((item) => ids.has(item.folderId));
    },
    [getDescendantFolderIds, items]
  );

  const getReviewCardsForFolder = useCallback(
    (
      folderId: string,
      mode: ReviewFilterMode = 'all',
      onlyDue = true
    ): FlashcardReviewItem[] => {
      const now = Date.now();
      const folderMap = new Map(folders.map((f) => [f.id, f.name]));

      if (folderId === '__MISTAKES__') {
        const activeMistakes = getActiveMistakes();
        const cards: FlashcardReviewItem[] = [];
        for (const m of activeMistakes) {
          const existingItem = items.find((it) => it.kanji === m.kanji);
          if (existingItem) {
            const folderName = folderMap.get(existingItem.folderId) || 'Chữ hay sai';
            if (mode === 'all' || mode === 'kanji') {
              cards.push({
                cardId: `k-${existingItem.id}`,
                cardType: 'kanji',
                folderId: existingItem.folderId,
                folderName,
                kanjiItemId: existingItem.id,
                kanji: existingItem.kanji,
                hanViet: existingItem.hanViet,
                onReadings: existingItem.onReadings,
                kunReadings: existingItem.kunReadings,
                meanings: existingItem.meanings,
                strokeCount: existingItem.strokeCount,
                examples: existingItem.examples,
                srsState: existingItem.srsState,
              });
            }
            if (mode === 'compound') {
              for (const cw of existingItem.compoundWords) {
                cards.push({
                  cardId: `c-${cw.id}`,
                  cardType: 'compound',
                  folderId: existingItem.folderId,
                  folderName,
                  kanjiItemId: existingItem.id,
                  kanji: existingItem.kanji,
                  hanViet: existingItem.hanViet,
                  onReadings: existingItem.onReadings,
                  kunReadings: existingItem.kunReadings,
                  meanings: existingItem.meanings,
                  compoundWordId: cw.id,
                  word: cw.word,
                  reading: cw.reading,
                  wordHanViet: cw.hanViet,
                  wordMeaning: cw.meaning,
                  examples: cw.examples,
                  srsState: cw.srsState,
                });
              }
            }
          } else if (mode === 'all' || mode === 'kanji') {
            const info = getKanjiInfo(m.kanji);
            cards.push({
              cardId: `mistake-${m.kanji}`,
              cardType: 'kanji',
              folderId: '__MISTAKES__',
              folderName: 'Chữ hay sai',
              kanjiItemId: `mistake-${m.kanji}`,
              kanji: m.kanji,
              hanViet: info?.hanViet || '',
              onReadings: info?.on || [],
              kunReadings: info?.kun || [],
              meanings: info?.meanings || [],
              strokeCount: info?.strokeCount,
              srsState: createInitialSrsState(now),
            });
          }
        }
        return cards;
      }

      const targetItems = getItemsForFolderRecursive(folderId);
      const cards: FlashcardReviewItem[] = [];

      for (const item of targetItems) {
        const folderName = folderMap.get(item.folderId) || 'Bài học';

        if (mode === 'all' || mode === 'kanji') {
          if (!onlyDue || item.srsState.dueAt <= now) {
            cards.push({
              cardId: `k-${item.id}`,
              cardType: 'kanji',
              folderId: item.folderId,
              folderName,
              kanjiItemId: item.id,
              kanji: item.kanji,
              hanViet: item.hanViet,
              onReadings: item.onReadings,
              kunReadings: item.kunReadings,
              meanings: item.meanings,
              strokeCount: item.strokeCount,
              examples: item.examples,
              srsState: item.srsState,
            });
          }
        }

        if (mode === 'all' || mode === 'compound') {
          for (const cw of item.compoundWords) {
            if (!onlyDue || cw.srsState.dueAt <= now) {
              cards.push({
                cardId: `c-${cw.id}`,
                cardType: 'compound',
                folderId: item.folderId,
                folderName,
                kanjiItemId: item.id,
                kanji: item.kanji,
                hanViet: item.hanViet,
                onReadings: item.onReadings,
                kunReadings: item.kunReadings,
                meanings: item.meanings,
                compoundWordId: cw.id,
                word: cw.word,
                reading: cw.reading,
                wordHanViet: cw.hanViet,
                wordMeaning: cw.meaning,
                examples: cw.examples,
                srsState: cw.srsState,
              });
            }
          }
        }
      }

      // Ưu tiên các thẻ quá hạn lâu nhất lên trước
      return cards.sort((a, b) => a.srsState.dueAt - b.srsState.dueAt);
    },
    [folders, items, getItemsForFolderRecursive]
  );

  const getDueCountForFolderRecursive = useCallback(
    (folderId: string): number => {
      return getReviewCardsForFolder(folderId, 'all', true).length;
    },
    [getReviewCardsForFolder]
  );

  // Folder CRUD
  const isDuplicateFolderName = useCallback(
    (name: string, parentId: string | null, excludeId?: string): boolean => {
      const normalized = name.trim().toLowerCase();
      if (!normalized) return false;
      return folders.some(
        (f) =>
          f.parentId === parentId &&
          f.id !== excludeId &&
          f.name.trim().toLowerCase() === normalized
      );
    },
    [folders]
  );

  const createFolder = useCallback(
    (
      name: string,
      parentId: string | null,
      description = ''
    ): { ok: boolean; error?: string; folder?: StudyFolder } => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { ok: false, error: 'Tên thư mục không được để trống.' };
      }
      if (isDuplicateFolderName(trimmed, parentId)) {
        return {
          ok: false,
          error: `Đã tồn tại thư mục "${trimmed}" trong cùng cấp này.`,
        };
      }
      const now = Date.now();
      const siblings = folders.filter((f) => f.parentId === parentId);
      const newFolder: StudyFolder = {
        id: genId(),
        parentId,
        name: trimmed,
        description: description.trim() || undefined,
        sortOrder: siblings.length,
        createdAt: now,
        updatedAt: now,
      };
      setFolders((prev) => [...prev, newFolder]);
      setSelectedFolderId(newFolder.id);
      markLocalMutation();
      return { ok: true, folder: newFolder };
    },
    [folders, isDuplicateFolderName, markLocalMutation]
  );

  const createFolderTree = useCallback(
    (
      parentId: string | null,
      nodes: FolderTreeNodeInput[]
    ): { createdCount: number; skippedCount: number } => {
      if (nodes.length === 0) return { createdCount: 0, skippedCount: 0 };

      const now = Date.now();
      const allKnown = [...folders];
      const created: StudyFolder[] = [];
      let skippedCount = 0;

      const walk = (nodeList: FolderTreeNodeInput[], currentParentId: string | null) => {
        for (const node of nodeList) {
          const cleanName = node.name.trim();
          if (!cleanName) continue;

          const existing = allKnown.find(
            (f) =>
              f.parentId === currentParentId &&
              f.name.trim().toLowerCase() === cleanName.toLowerCase()
          );

          let targetId: string;
          if (existing) {
            targetId = existing.id;
            skippedCount += 1;
          } else {
            const siblingsCount = allKnown.filter(
              (f) => f.parentId === currentParentId
            ).length;
            const newFolder: StudyFolder = {
              id: genId(),
              parentId: currentParentId,
              name: cleanName,
              sortOrder: siblingsCount,
              createdAt: now,
              updatedAt: now,
            };
            allKnown.push(newFolder);
            created.push(newFolder);
            targetId = newFolder.id;
          }

          if (node.children.length > 0) {
            walk(node.children, targetId);
          }
        }
      };

      walk(nodes, parentId);

      if (created.length > 0) {
        setFolders((prev) => [...prev, ...created]);
        setSelectedFolderId(created[0].id);
        markLocalMutation();
      }

      return { createdCount: created.length, skippedCount };
    },
    [folders, markLocalMutation]
  );

  const renameFolder = useCallback(
    (
      id: string,
      name: string,
      description?: string
    ): { ok: boolean; error?: string } => {
      const target = folders.find((f) => f.id === id);
      if (!target) return { ok: false, error: 'Không tìm thấy thư mục.' };
      const trimmed = name.trim();
      if (!trimmed) {
        return { ok: false, error: 'Tên thư mục không được để trống.' };
      }
      if (isDuplicateFolderName(trimmed, target.parentId, id)) {
        return {
          ok: false,
          error: `Đã tồn tại thư mục "${trimmed}" trong cùng cấp này.`,
        };
      }
      setFolders((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                name: trimmed,
                description:
                  description !== undefined ? description.trim() : f.description,
                updatedAt: Date.now(),
              }
            : f
        )
      );
      markLocalMutation();
      return { ok: true };
    },
    [folders, isDuplicateFolderName, markLocalMutation]
  );

  const moveFolder = useCallback(
    (
      folderId: string,
      targetParentId: string | null
    ): { ok: boolean; error?: string } => {
      const target = folders.find((f) => f.id === folderId);
      if (!target) return { ok: false, error: 'Không tìm thấy thư mục cần di chuyển.' };
      if (target.parentId === targetParentId) return { ok: true };

      if (targetParentId !== null) {
        const descendants = new Set(getDescendantFolderIds(folderId));
        if (descendants.has(targetParentId)) {
          return {
            ok: false,
            error: 'Không thể di chuyển thư mục vào chính nó hoặc thư mục con của nó.',
          };
        }
      }

      if (isDuplicateFolderName(target.name, targetParentId, folderId)) {
        return {
          ok: false,
          error: `Thư mục đích đã có thư mục trùng tên "${target.name}".`,
        };
      }

      const newSiblingsCount = folders.filter(
        (f) => f.parentId === targetParentId
      ).length;

      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? {
                ...f,
                parentId: targetParentId,
                sortOrder: newSiblingsCount,
                updatedAt: Date.now(),
              }
            : f
        )
      );
      markLocalMutation();
      return { ok: true };
    },
    [folders, getDescendantFolderIds, isDuplicateFolderName, markLocalMutation]
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const idsToDelete = new Set(getDescendantFolderIds(id));
      const itemIdsToDelete = items
        .filter((item) => idsToDelete.has(item.folderId))
        .map((item) => item.id);

      setFolders((prev) => {
        const remaining = prev.filter((f) => !idsToDelete.has(f.id));
        if (selectedFolderId && idsToDelete.has(selectedFolderId)) {
          setSelectedFolderId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
      setItems((prev) => prev.filter((item) => !idsToDelete.has(item.folderId)));
      markLocalMutation({
        deletedFolders: Array.from(idsToDelete),
        deletedItems: itemIdsToDelete,
      });
    },
    [getDescendantFolderIds, selectedFolderId, items, markLocalMutation]
  );

  const enrichKanjiItems = useCallback(
    async (targetItems: FolderKanjiItem[], forceRetry = false): Promise<number> => {
      const queue = targetItems.filter((it) => {
        if (!it?.id || !it?.kanji) return false;
        if (activeEnrichRef.current.has(it.id)) return false;
        if (!forceRetry && attemptedEnrichRef.current.has(it.id)) return false;
        return forceRetry || hasMissingKanjiData(it);
      });

      if (queue.length === 0) return 0;

      queue.forEach((it) => {
        activeEnrichRef.current.add(it.id);
        attemptedEnrichRef.current.add(it.id);
      });

      setEnrichingItemIds((prev) => {
        const next = { ...prev };
        queue.forEach((it) => {
          next[it.id] = true;
        });
        return next;
      });

      let updatedCount = 0;
      let cursor = 0;
      const concurrency = Math.min(4, queue.length);

      const worker = async () => {
        while (cursor < queue.length) {
          const current = queue[cursor++];
          if (!current) break;

          try {
            const detail = await getFullKanjiDetail(current.kanji);
            const cleanedOn = cleanReadingsList(detail?.on);
            const cleanedKun = cleanReadingsList(detail?.kun);
            const cleanedMeanings = cleanMeaningsList(detail?.meanings);
            const nextHv =
              detail?.hanViet && detail.hanViet !== 'Chưa rõ' ? detail.hanViet : '';

            let didMutateItem = false;
            setItems((prev) =>
              prev.map((it) => {
                if (it.id !== current.id) return it;
                const prevCleanOn = cleanReadingsList(it.onReadings);
                const prevCleanKun = cleanReadingsList(it.kunReadings);
                const prevHasNoisyMeaning =
                  Array.isArray(it.meanings) &&
                  it.meanings.some((m) => isNoisyClassicalGloss(m));
                const prevCleanMeanings = cleanMeaningsList(it.meanings);

                const finalOn = prevCleanOn.length > 0 ? prevCleanOn : cleanedOn;
                const finalKun = prevCleanKun.length > 0 ? prevCleanKun : cleanedKun;
                const finalMeanings =
                  !prevHasNoisyMeaning && prevCleanMeanings.length > 0
                    ? prevCleanMeanings
                    : cleanedMeanings.length > 0
                    ? cleanedMeanings
                    : prevCleanMeanings;
                const finalHv = it.hanViet || nextHv;
                const finalStroke = it.strokeCount || detail?.strokeCount;

                const changed =
                  JSON.stringify(finalOn) !== JSON.stringify(it.onReadings) ||
                  JSON.stringify(finalKun) !== JSON.stringify(it.kunReadings) ||
                  JSON.stringify(finalMeanings) !== JSON.stringify(it.meanings) ||
                  finalHv !== it.hanViet ||
                  finalStroke !== it.strokeCount;

                if (changed) {
                  didMutateItem = true;
                }

                return changed
                  ? {
                      ...it,
                      hanViet: finalHv,
                      onReadings: finalOn,
                      kunReadings: finalKun,
                      meanings: finalMeanings,
                      strokeCount: finalStroke,
                    }
                  : it;
              })
            );

            if (didMutateItem) {
              updatedCount += 1;
            }
          } catch {
            // If forced retry or network failed, allow future retry
            attemptedEnrichRef.current.delete(current.id);
          } finally {
            activeEnrichRef.current.delete(current.id);
            setEnrichingItemIds((prev) => {
              if (!prev[current.id]) return prev;
              const next = { ...prev };
              delete next[current.id];
              return next;
            });
          }
        }
      };

      await Promise.all(Array.from({ length: concurrency }, () => worker()));

      if (updatedCount > 0) {
        markLocalMutation();
      }
      return updatedCount;
    },
    [markLocalMutation]
  );

  // Kanji & Compound Word CRUD
  const addKanjiListToFolder = useCallback(
    async (folderId: string, rawText: string): Promise<number> => {
      const extracted = extractUniqueKanji(rawText);
      if (extracted.length === 0) return 0;

      const existingInFolder = new Set(
        items.filter((i) => i.folderId === folderId).map((i) => i.kanji)
      );
      const toAdd = extracted.filter((e) => !existingInFolder.has(e.kanji));
      if (toAdd.length === 0) return 0;

      const now = Date.now();
      const newItems: FolderKanjiItem[] = toAdd.map((entry) => {
        const localInfo = getKanjiInfo(entry.kanji);
        return {
          id: genId(),
          folderId,
          kanji: entry.kanji,
          hanViet: localInfo?.hanViet || '',
          onReadings: cleanReadingsList(localInfo?.on),
          kunReadings: cleanReadingsList(localInfo?.kun),
          meanings: cleanMeaningsList(localInfo?.meanings),
          strokeCount: localInfo?.strokeCount,
          srsState: createInitialSrsState(now),
          compoundWords: [],
          createdAt: now,
        };
      });

      setItems((prev) => [...prev, ...newItems]);
      markLocalMutation();

      // Enrich asynchronously with concurrency-limited worker queue & loading state
      void enrichKanjiItems(newItems, true);

      return newItems.length;
    },
    [items, markLocalMutation, enrichKanjiItems]
  );

  const addCatalogKanjiToFolder = useCallback(
    (
      folderId: string,
      entries: KanjiDetail[]
    ): { addedCount: number; skippedCount: number } => {
      if (!folderId || entries.length === 0) {
        return { addedCount: 0, skippedCount: 0 };
      }

      const existingInFolder = new Set(
        items.filter((i) => i.folderId === folderId).map((i) => i.kanji)
      );
      const uniqueMap = new Map<string, KanjiDetail>();
      let skippedCount = 0;

      for (const entry of entries) {
        if (!entry?.kanji) continue;
        if (existingInFolder.has(entry.kanji) || uniqueMap.has(entry.kanji)) {
          skippedCount += 1;
          continue;
        }
        uniqueMap.set(entry.kanji, entry);
      }

      const toInsert = Array.from(uniqueMap.values());
      if (toInsert.length === 0) {
        return { addedCount: 0, skippedCount };
      }

      const now = Date.now();
      const newItems: FolderKanjiItem[] = toInsert.map((entry, idx) => {
        const localDict = getKanjiInfo(entry.kanji);
        const compoundSources =
          entry.examples && entry.examples.length > 0
            ? entry.examples
            : localDict?.examples || [];
        return {
          id: genId(),
          folderId,
          kanji: entry.kanji,
          hanViet: entry.hanViet || localDict?.hanViet || '',
          onReadings: cleanReadingsList(entry.on?.length ? entry.on : localDict?.on),
          kunReadings: cleanReadingsList(entry.kun?.length ? entry.kun : localDict?.kun),
          meanings: cleanMeaningsList(entry.meanings?.length ? entry.meanings : localDict?.meanings),
          strokeCount: entry.strokeCount || localDict?.strokeCount,
          srsState: createInitialSrsState(now + idx),
          compoundWords: compoundSources.slice(0, 6).map((cw) => ({
            id: genId(),
            word: cw.word,
            reading: cw.reading,
            hanViet: cw.hanViet,
            meaning: cw.meaning,
            srsState: createInitialSrsState(now + idx),
          })),
          createdAt: now + idx,
        };
      });

      setItems((prev) => [...prev, ...newItems]);
      markLocalMutation();

      // Only enrich items that still miss data
      const missingItems = newItems.filter((it) => hasMissingKanjiData(it));
      if (missingItems.length > 0) {
        void enrichKanjiItems(missingItems, true);
      }

      return { addedCount: newItems.length, skippedCount };
    },
    [items, markLocalMutation, enrichKanjiItems]
  );

  const updateKanjiItem = useCallback(
    (itemId: string, patch: Partial<FolderKanjiItem>) => {
      const now = Date.now();
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, ...patch, updatedAt: now } : it))
      );
      markLocalMutation();
    },
    [markLocalMutation]
  );

  const deleteKanjiItem = useCallback(
    (itemId: string) => {
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      markLocalMutation({ deletedItems: [itemId] });
    },
    [markLocalMutation]
  );

  const deleteKanjiItems = useCallback(
    (itemIds: string[]) => {
      const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
      if (uniqueIds.length === 0) return;
      const idSet = new Set(uniqueIds);
      setItems((prev) => prev.filter((it) => !idSet.has(it.id)));
      markLocalMutation({ deletedItems: uniqueIds });
    },
    [markLocalMutation]
  );

  const moveKanjiItems = useCallback(
    (
      itemIds: string[],
      targetFolderId: string
    ): { movedCount: number; mergedCount: number } => {
      const uniqueIds = Array.from(new Set(itemIds.filter(Boolean)));
      if (uniqueIds.length === 0 || !targetFolderId) {
        return { movedCount: 0, mergedCount: 0 };
      }
      const targetExists = folders.some((f) => f.id === targetFolderId);
      if (!targetExists) return { movedCount: 0, mergedCount: 0 };

      const idSet = new Set(uniqueIds);
      let movedCount = 0;
      let mergedCount = 0;
      const removedIds: string[] = [];

      const targetByKanji = new Map<string, number>();
      const next: FolderKanjiItem[] = [];

      // Collect untouched items (or items already in targetFolderId)
      for (const it of items) {
        if (!idSet.has(it.id) || it.folderId === targetFolderId) {
          const idx = next.push(it) - 1;
          if (it.folderId === targetFolderId) {
            targetByKanji.set(it.kanji, idx);
          }
        }
      }

      // Move or merge selected items from other folders into targetFolderId
      for (const it of items) {
        if (!idSet.has(it.id) || it.folderId === targetFolderId) continue;

        const existingIdx = targetByKanji.get(it.kanji);
        if (existingIdx !== undefined) {
          const targetItem = next[existingIdx];
          const existingWords = new Set(
            (targetItem.compoundWords || []).map((cw) => cw.word.trim())
          );
          const extraWords = (it.compoundWords || []).filter((cw) => {
            const w = cw.word.trim();
            if (!w || existingWords.has(w)) return false;
            existingWords.add(w);
            return true;
          });
          next[existingIdx] = {
            ...targetItem,
            hanViet: targetItem.hanViet || it.hanViet,
            onReadings:
              targetItem.onReadings.length > 0 ? targetItem.onReadings : it.onReadings,
            kunReadings:
              targetItem.kunReadings.length > 0 ? targetItem.kunReadings : it.kunReadings,
            meanings:
              targetItem.meanings.length > 0 ? targetItem.meanings : it.meanings,
            strokeCount: targetItem.strokeCount || it.strokeCount,
            compoundWords: [...(targetItem.compoundWords || []), ...extraWords],
          };
          removedIds.push(it.id);
          mergedCount += 1;
        } else {
          const movedItem: FolderKanjiItem = {
            ...it,
            folderId: targetFolderId,
          };
          const idx = next.push(movedItem) - 1;
          targetByKanji.set(movedItem.kanji, idx);
          movedCount += 1;
        }
      }

      if (movedCount > 0 || mergedCount > 0) {
        setItems(next);
        markLocalMutation(removedIds.length > 0 ? { deletedItems: removedIds } : undefined);
      }

      return { movedCount, mergedCount };
    },
    [items, folders, markLocalMutation]
  );

  const addCompoundWord = useCallback(
    (
      kanjiItemId: string,
      payload: { word: string; reading: string; hanViet: string; meaning: string }
    ) => {
      const now = Date.now();
      const newWord: CompoundWordCard = {
        id: genId(),
        word: payload.word.trim(),
        reading: payload.reading.trim(),
        hanViet: payload.hanViet.trim().toUpperCase(),
        meaning: payload.meaning.trim(),
        srsState: createInitialSrsState(now),
        updatedAt: now,
      };
      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? { ...it, compoundWords: [...it.compoundWords, newWord], updatedAt: now }
            : it
        )
      );
      markLocalMutation();
    },
    [markLocalMutation]
  );

  const batchAddCompoundWords = useCallback(
    (kanjiItemId: string, words: ParsedCompoundWordInput[]): number => {
      if (words.length === 0) return 0;
      const targetItem = items.find((it) => it.id === kanjiItemId);
      if (!targetItem) return 0;

      const parsedByWord = new Map<string, ParsedCompoundWordInput>();
      for (const w of words) {
        const cleanWord = w.word.trim();
        if (cleanWord && !parsedByWord.has(cleanWord)) {
          parsedByWord.set(cleanWord, w);
        }
      }

      const existingWords = new Set(
        (targetItem.compoundWords || []).map((cw) => cw.word.trim())
      );
      const now = Date.now();
      let didUpdateExistingExamples = false;
      const updatedExistingCompounds = (targetItem.compoundWords || []).map((cw) => {
        const match = parsedByWord.get(cw.word.trim());
        if (!match || !match.examples || match.examples.length === 0) return cw;
        const { merged, addedCount } = mergeCardExamples(cw.examples, match.examples);
        if (addedCount > 0) {
          didUpdateExistingExamples = true;
          return { ...cw, examples: merged, updatedAt: now };
        }
        return cw;
      });

      const newCards: CompoundWordCard[] = [];

      for (const w of words) {
        const cleanWord = w.word.trim();
        const cleanMeaning = w.meaning.trim();
        if (!cleanWord || !cleanMeaning || existingWords.has(cleanWord)) continue;
        existingWords.add(cleanWord);
        const examples = toCardExamples(w.examples);
        newCards.push({
          id: genId(),
          word: cleanWord,
          reading: w.reading.trim(),
          hanViet: w.hanViet.trim().toUpperCase(),
          meaning: cleanMeaning,
          ...(examples ? { examples } : {}),
          srsState: createInitialSrsState(now),
          updatedAt: now,
        });
      }

      if (newCards.length === 0 && !didUpdateExistingExamples) return 0;

      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? {
                ...it,
                compoundWords: [...updatedExistingCompounds, ...newCards],
                updatedAt: now,
              }
            : it
        )
      );
      markLocalMutation();

      return newCards.length;
    },
    [items, markLocalMutation]
  );

  const updateCompoundWord = useCallback(
    (
      kanjiItemId: string,
      wordId: string,
      patch: Partial<Omit<CompoundWordCard, 'id' | 'srsState'>>
    ) => {
      const now = Date.now();
      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? {
                ...it,
                updatedAt: now,
                compoundWords: it.compoundWords.map((cw) =>
                  cw.id === wordId ? { ...cw, ...patch, updatedAt: now } : cw
                ),
              }
            : it
        )
      );
      markLocalMutation();
    },
    [markLocalMutation]
  );

  const deleteCompoundWord = useCallback(
    (kanjiItemId: string, wordId: string) => {
      const targetItem = latestItemsRef.current.find((it) => it.id === kanjiItemId);
      const removedWord = targetItem?.compoundWords.find((cw) => cw.id === wordId);
      const now = Date.now();
      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? {
                ...it,
                updatedAt: now,
                compoundWords: it.compoundWords.filter((cw) => cw.id !== wordId),
              }
            : it
        )
      );
      markLocalMutation(
        removedWord
          ? {
              deletedCompounds: [
                {
                  itemId: kanjiItemId,
                  wordId,
                  word: removedWord.word.trim(),
                },
              ],
            }
          : undefined
      );
    },
    [markLocalMutation]
  );

  const deleteCompoundWords = useCallback(
    (kanjiItemId: string, wordIds: string[]) => {
      const uniqueIds = Array.from(new Set(wordIds.filter(Boolean)));
      if (uniqueIds.length === 0) return;
      const idSet = new Set(uniqueIds);
      const targetItem = latestItemsRef.current.find((it) => it.id === kanjiItemId);
      const deletedCompounds = (targetItem?.compoundWords || [])
        .filter((cw) => idSet.has(cw.id))
        .map((cw) => ({
          itemId: kanjiItemId,
          wordId: cw.id,
          word: cw.word.trim(),
        }));
      const now = Date.now();
      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? {
                ...it,
                updatedAt: now,
                compoundWords: it.compoundWords.filter((cw) => !idSet.has(cw.id)),
              }
            : it
        )
      );
      markLocalMutation(
        deletedCompounds.length > 0 ? { deletedCompounds } : undefined
      );
    },
    [markLocalMutation]
  );

  const batchImportItemsToFolder = useCallback(
    async (folderId: string, parsedItems: ParsedLessonItemInput[]) => {
      if (parsedItems.length === 0) {
        return {
          addedKanji: 0,
          mergedKanji: 0,
          addedCompoundWords: 0,
          addedExamples: 0,
        };
      }

      const now = Date.now();
      let addedKanji = 0;
      let mergedKanji = 0;
      let addedCompoundWords = 0;
      let addedExamples = 0;
      const newlyCreatedItems: FolderKanjiItem[] = [];

      setItems((prev) => {
        const next = [...prev];

        for (const parsed of parsedItems) {
          const existingIdx = next.findIndex(
            (it) => it.folderId === folderId && it.kanji === parsed.kanji
          );

          if (existingIdx >= 0) {
            const existing = next[existingIdx];
            const parsedByWord = new Map<string, ParsedCompoundWordInput>();
            parsed.compoundWords.forEach((cw) => {
              const key = cw.word.trim();
              if (key && !parsedByWord.has(key)) parsedByWord.set(key, cw);
            });

            let didMutateExisting = false;
            const updatedCompounds = (existing.compoundWords || []).map((cw) => {
              const incomingCw = parsedByWord.get(cw.word.trim());
              if (!incomingCw?.examples || incomingCw.examples.length === 0) return cw;
              const { merged, addedCount } = mergeCardExamples(
                cw.examples,
                incomingCw.examples
              );
              if (addedCount > 0) {
                didMutateExisting = true;
                addedExamples += addedCount;
                return { ...cw, examples: merged, updatedAt: now };
              }
              return cw;
            });

            const existingWords = new Set(
              updatedCompounds.map((cw) => cw.word.trim())
            );
            const extraWords: CompoundWordCard[] = parsed.compoundWords
              .filter((cw) => !existingWords.has(cw.word.trim()))
              .map((cw) => {
                existingWords.add(cw.word.trim());
                const cwExamples = toCardExamples(cw.examples);
                if (cwExamples) addedExamples += cwExamples.length;
                return {
                  id: genId(),
                  word: cw.word.trim(),
                  reading: cw.reading.trim(),
                  hanViet: cw.hanViet.trim().toUpperCase(),
                  meaning: cw.meaning.trim(),
                  ...(cwExamples ? { examples: cwExamples } : {}),
                  srsState: createInitialSrsState(now),
                  updatedAt: now,
                };
              });

            const rootExMerge = mergeCardExamples(existing.examples, parsed.examples);
            if (rootExMerge.addedCount > 0) {
              didMutateExisting = true;
              addedExamples += rootExMerge.addedCount;
            }

            if (extraWords.length > 0 || didMutateExisting) {
              mergedKanji += 1;
              addedCompoundWords += extraWords.length;
              next[existingIdx] = {
                ...existing,
                ...(rootExMerge.merged ? { examples: rootExMerge.merged } : {}),
                compoundWords: [...updatedCompounds, ...extraWords],
                updatedAt: now,
              };
            }
          } else {
            const localInfo = getKanjiInfo(parsed.kanji);
            const seenWords = new Set<string>();
            const compoundWords: CompoundWordCard[] = [];
            for (const cw of parsed.compoundWords) {
              const w = cw.word.trim();
              if (!w || seenWords.has(w)) continue;
              seenWords.add(w);
              const cwExamples = toCardExamples(cw.examples);
              if (cwExamples) addedExamples += cwExamples.length;
              compoundWords.push({
                id: genId(),
                word: w,
                reading: cw.reading.trim(),
                hanViet: cw.hanViet.trim().toUpperCase(),
                meaning: cw.meaning.trim(),
                ...(cwExamples ? { examples: cwExamples } : {}),
                srsState: createInitialSrsState(now),
                updatedAt: now,
              });
            }

            const kanjiExamples = toCardExamples(parsed.examples);
            if (kanjiExamples) addedExamples += kanjiExamples.length;

            const created: FolderKanjiItem = {
              id: genId(),
              folderId,
              kanji: parsed.kanji,
              hanViet: parsed.hanViet || localInfo?.hanViet || '',
              onReadings: cleanReadingsList(localInfo?.on),
              kunReadings: cleanReadingsList(localInfo?.kun),
              meanings:
                parsed.meanings && parsed.meanings.length > 0
                  ? cleanMeaningsList(parsed.meanings)
                  : cleanMeaningsList(localInfo?.meanings),
              strokeCount: localInfo?.strokeCount,
              ...(kanjiExamples ? { examples: kanjiExamples } : {}),
              srsState: createInitialSrsState(now),
              compoundWords,
              createdAt: now,
              updatedAt: now,
            };

            next.push(created);
            newlyCreatedItems.push(created);
            addedKanji += 1;
            addedCompoundWords += compoundWords.length;
          }
        }

        return next;
      });

      // Enrich newly created Kanji items asynchronously with loading state & retries
      if (newlyCreatedItems.length > 0) {
        void enrichKanjiItems(newlyCreatedItems, true);
      }

      markLocalMutation();
      return { addedKanji, mergedKanji, addedCompoundWords, addedExamples };
    },
    [markLocalMutation, enrichKanjiItems]
  );

  // SRS Grading
  const gradeFlashcard = useCallback(
    (card: FlashcardReviewItem, rating: SrsRating) => {
      if (card.folderId !== '__MISTAKES__') {
        const nextState = calculateNextSrsState(card.srsState, rating, srsConfig);
        const now = Date.now();
        if (card.cardType === 'kanji') {
          setItems((prev) =>
            prev.map((it) =>
              it.id === card.kanjiItemId ? { ...it, srsState: nextState, updatedAt: now } : it
            )
          );
        } else if (card.compoundWordId) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === card.kanjiItemId
                ? {
                    ...it,
                    updatedAt: now,
                    compoundWords: it.compoundWords.map((cw) =>
                      cw.id === card.compoundWordId
                        ? { ...cw, srsState: nextState, updatedAt: now }
                        : cw
                    ),
                  }
                : it
            )
          );
        }
        markLocalMutation();
      }
      recordStudyReview(rating);
      if (rating === 'hard') {
        recordKanjiMistake(card.kanji, 'srs');
      } else {
        recordKanjiSuccess(card.kanji);
      }
    },
    [srsConfig, markLocalMutation]
  );

  // JSON Export & Import
  const buildExportBundle = useCallback(
    (folderId: string): KanjiDeckExportBundle | null => {
      const targetIds = new Set(getDescendantFolderIds(folderId));
      const targetFolders = folders.filter((f) => targetIds.has(f.id));
      if (targetFolders.length === 0) return null;
      const targetItems = items.filter((it) => targetIds.has(it.folderId));
      return {
        schemaVersion: 1,
        appName: 'LuyenKanji',
        exportedAt: Date.now(),
        rootFolderId: folderId,
        folders: targetFolders,
        items: targetItems,
      };
    },
    [folders, items, getDescendantFolderIds]
  );

  const buildFullExportBundle = useCallback((): KanjiDeckExportBundle | null => {
    if (folders.length === 0) return null;
    return {
      schemaVersion: 1,
      appName: 'LuyenKanji',
      exportedAt: Date.now(),
      rootFolderId: '__ALL__',
      folders,
      items,
    };
  }, [folders, items]);

  const detectImportConflicts = useCallback(
    (bundle: KanjiDeckExportBundle, targetParentId: string | null): string[] => {
      if (bundle.rootFolderId === '__ALL__') {
        const rootFoldersInBundle = bundle.folders.filter((f) => f.parentId === null);
        const conflicts: string[] = [];
        for (const rf of rootFoldersInBundle) {
          const match = folders.find(
            (f) =>
              f.parentId === targetParentId &&
              f.name.trim().toLowerCase() === rf.name.trim().toLowerCase()
          );
          if (match) conflicts.push(match.name);
        }
        return conflicts;
      }

      const rootBundleFolder =
        bundle.folders.find((f) => f.id === bundle.rootFolderId) || bundle.folders[0];
      if (!rootBundleFolder) return [];

      const conflicts: string[] = [];
      const rootMatch = folders.find(
        (f) =>
          f.parentId === targetParentId &&
          f.name.trim().toLowerCase() === rootBundleFolder.name.trim().toLowerCase()
      );
      if (rootMatch) {
        conflicts.push(rootMatch.name);
      }
      return conflicts;
    },
    [folders]
  );

  const importDeckBundle = useCallback(
    (
      bundle: KanjiDeckExportBundle,
      targetParentId: string | null,
      resetSrs: boolean,
      conflictMode: 'merge' | 'copy' = 'copy'
    ) => {
      const now = Date.now();
      const folderIdMap = new Map<string, string>();
      const reusedFolderIds = new Set<string>();
      const createdFolders: StudyFolder[] = [];
      const isFullAllBundle = bundle.rootFolderId === '__ALL__';

      const rootIdInBundle = isFullAllBundle
        ? null
        : bundle.folders.find((f) => f.id === bundle.rootFolderId)?.id ||
          bundle.folders[0]?.id;

      // Sort bundle folders top-down from root so parent mappings resolve in order
      const orderedBundleFolders: StudyFolder[] = [];
      const visited = new Set<string>();
      const queue: string[] = isFullAllBundle
        ? bundle.folders.filter((f) => f.parentId === null).map((f) => f.id)
        : rootIdInBundle
        ? [rootIdInBundle]
        : [];

      while (queue.length > 0) {
        const cid = queue.shift()!;
        if (visited.has(cid)) continue;
        const found = bundle.folders.find((f) => f.id === cid);
        if (found) {
          visited.add(cid);
          orderedBundleFolders.push(found);
          bundle.folders
            .filter((child) => child.parentId === cid)
            .forEach((child) => queue.push(child.id));
        }
      }
      bundle.folders.forEach((f) => {
        if (!visited.has(f.id)) orderedBundleFolders.push(f);
      });

      const allKnownFolders = [...folders];

      for (const bf of orderedBundleFolders) {
        const isRoot = isFullAllBundle ? bf.parentId === null : bf.id === rootIdInBundle;
        const resolvedParentId = isRoot
          ? targetParentId
          : bf.parentId && folderIdMap.has(bf.parentId)
          ? folderIdMap.get(bf.parentId)!
          : targetParentId;

        const existingMatch = allKnownFolders.find(
          (ef) =>
            ef.parentId === resolvedParentId &&
            ef.name.trim().toLowerCase() === bf.name.trim().toLowerCase()
        );

        if (conflictMode === 'merge' && existingMatch) {
          folderIdMap.set(bf.id, existingMatch.id);
          reusedFolderIds.add(existingMatch.id);
        } else {
          let finalName = bf.name.trim() || 'Thư mục nhập';
          if (existingMatch) {
            let suffixIndex = 1;
            let candidate = `${finalName} (Bản sao)`;
            while (
              allKnownFolders.some(
                (ef) =>
                  ef.parentId === resolvedParentId &&
                  ef.name.trim().toLowerCase() === candidate.toLowerCase()
              )
            ) {
              suffixIndex += 1;
              candidate = `${finalName} (Bản sao ${suffixIndex})`;
            }
            finalName = candidate;
          }

          const newFolder: StudyFolder = {
            ...bf,
            id: genId(),
            name: finalName,
            parentId: resolvedParentId,
            isPublic: false,
            shareSlug: undefined,
            createdAt: now,
            updatedAt: now,
          };
          folderIdMap.set(bf.id, newFolder.id);
          createdFolders.push(newFolder);
          allKnownFolders.push(newFolder);
        }
      }

      const fallbackRootId =
        (rootIdInBundle && folderIdMap.get(rootIdInBundle)) ||
        createdFolders[0]?.id ||
        '';

      let addedKanjiCount = 0;

      setItems((prevItems) => {
        const nextItems = [...prevItems];

        for (const rawItem of bundle.items) {
          const targetFolderId =
            folderIdMap.get(rawItem.folderId) || fallbackRootId;
          if (!targetFolderId) continue;

          const existingIdx = nextItems.findIndex(
            (it) => it.folderId === targetFolderId && it.kanji === rawItem.kanji
          );

          if (existingIdx >= 0 && conflictMode === 'merge') {
            // Merge new compound words into existing Kanji item
            const existing = nextItems[existingIdx];
            const existingWords = new Set(
              (existing.compoundWords || []).map((cw) => cw.word.trim())
            );
            const extraWords = (rawItem.compoundWords || [])
              .filter((cw) => !existingWords.has(cw.word.trim()))
              .map((cw) => ({
                ...cw,
                id: genId(),
                srsState: resetSrs ? createInitialSrsState(now) : cw.srsState,
              }));
            if (extraWords.length > 0) {
              nextItems[existingIdx] = {
                ...existing,
                compoundWords: [...(existing.compoundWords || []), ...extraWords],
              };
            }
          } else if (existingIdx < 0 || conflictMode === 'copy') {
            nextItems.push({
              ...rawItem,
              id: genId(),
              folderId: targetFolderId,
              srsState: resetSrs ? createInitialSrsState(now) : rawItem.srsState,
              compoundWords: (rawItem.compoundWords || []).map((cw) => ({
                ...cw,
                id: genId(),
                srsState: resetSrs ? createInitialSrsState(now) : cw.srsState,
              })),
              createdAt: now,
            });
            addedKanjiCount += 1;
          }
        }

        return nextItems;
      });

      if (createdFolders.length > 0) {
        setFolders((prev) => [...prev, ...createdFolders]);
      }

      if (fallbackRootId) setSelectedFolderId(fallbackRootId);
      markLocalMutation();

      return {
        importedFolders: createdFolders.length,
        importedKanji: addedKanjiCount || bundle.items.length,
        rootFolderId: fallbackRootId,
      };
    },
    [folders, markLocalMutation]
  );

  // AnkiDroid-style Cloud Sync & Conflict Resolution
  const buildLocalSummary = useCallback(() => {
    const compoundCount = items.reduce(
      (sum, it) => sum + (it.compoundWords ? it.compoundWords.length : 0),
      0
    );
    return {
      deckCount: folders.length,
      cardCount: items.length,
      compoundCount,
      lastModifiedAt: syncMeta.lastLocalModifiedAt || null,
      syncVersion: syncMeta.lastSyncedVersion,
    };
  }, [folders, items, syncMeta]);

  const applyServerSnapshot = useCallback(
    (
      nextFolders: StudyFolder[],
      nextItems: FolderKanjiItem[],
      version: number,
      syncedAt: number,
      dataHash: string,
      userId: string
    ) => {
      const validFolderIds = new Set(nextFolders.map((f) => f.id));
      const normalizedFolders = nextFolders.map((f) => ({
        ...f,
        parentId:
          f.parentId && validFolderIds.has(f.parentId) ? f.parentId : null,
      }));
      latestFoldersRef.current = normalizedFolders;
      latestItemsRef.current = nextItems;
      setFolders(normalizedFolders);
      setItems(nextItems);
      setSelectedFolderId((prev) =>
        prev && normalizedFolders.some((f) => f.id === prev)
          ? prev
          : normalizedFolders[0]?.id ?? null
      );
      try {
        localStorage.setItem(
          STORAGE_FOLDERS_KEY,
          JSON.stringify(normalizedFolders)
        );
        localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(nextItems));
        localStorage.setItem(STORAGE_STARTER_SEEDED_KEY, '1');
      } catch {}

      saveSyncBaselineSnapshot({
        userId,
        version,
        folders: normalizedFolders,
        items: nextItems,
      });

      updateSyncMeta(() => ({
        ...DEFAULT_SYNC_META,
        lastSyncedUserId: userId,
        lastSyncedVersion: version,
        lastSyncedAt: syncedAt,
        lastSyncedHash: dataHash,
        dirtySinceLastSync: false,
        lastLocalModifiedAt: syncedAt,
        hasUserModifiedData: true,
        deletedFolderIds: [],
        deletedItemIds: [],
        deletedCompoundKeys: [],
      }));
    },
    [updateSyncMeta]
  );

  const refreshCloudSnapshot = useCallback(async (): Promise<CloudSnapshot | null> => {
    if (!cloudUser) return null;
    setIsLoadingCloudSnapshot(true);
    setCloudSnapshotError(null);
    try {
      const snap = await apiForcePullSync();
      setCloudSnapshot(snap);
      return snap;
    } catch (err: any) {
      setCloudSnapshotError(
        err?.message || 'Không thể tải dữ liệu xem trước từ Cloud.'
      );
      return null;
    } finally {
      setIsLoadingCloudSnapshot(false);
    }
  }, [cloudUser]);

  const openCloudInspector = useCallback(async () => {
    if (!cloudUser) {
      openAuthGuard('Xem dữ liệu bộ thẻ hiện có trên Cloud');
      return;
    }
    setIsCloudInspectorOpen(true);
    await refreshCloudSnapshot();
  }, [cloudUser, openAuthGuard, refreshCloudSnapshot]);

  const closeCloudInspector = useCallback(() => {
    setIsCloudInspectorOpen(false);
  }, []);

  const resolveConflictPush = useCallback(async () => {
    const activeUser = latestCloudUserRef.current;
    if (!activeUser) {
      openAuthGuard('Đồng bộ bộ thẻ Flashcard lên đám mây');
      return;
    }
    const curFolders = latestFoldersRef.current;
    const curItems = latestItemsRef.current;
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncMessage(null);
    try {
      const pushRes = await apiForcePushSync({ folders: curFolders, items: curItems });
      saveSyncBaselineSnapshot({
        userId: activeUser.id,
        version: pushRes.syncVersion,
        folders: curFolders,
        items: curItems,
      });
      updateSyncMeta(() => ({
        ...DEFAULT_SYNC_META,
        lastSyncedUserId: activeUser.id,
        lastSyncedVersion: pushRes.syncVersion,
        lastSyncedAt: pushRes.syncedAt,
        lastSyncedHash: pushRes.dataHash,
        dirtySinceLastSync: false,
        lastLocalModifiedAt: pushRes.syncedAt,
        hasUserModifiedData: true,
        deletedFolderIds: [],
        deletedItemIds: [],
        deletedCompoundKeys: [],
      }));
      setCloudSnapshot({
        syncVersion: pushRes.syncVersion,
        syncedAt: pushRes.syncedAt,
        dataHash: pushRes.dataHash,
        folders: [...curFolders],
        items: [...curItems],
      });
      setSyncConflict(null);
      setSyncStatus('synced');
      lastSuccessfulCheckAtRef.current = Date.now();
      setSyncMessage(
        `Đã tải ${curFolders.length} thư mục (${curItems.length} Kanji) từ máy lên Cloud (v${pushRes.syncVersion}).`
      );
      refreshProfile();
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Lỗi tải dữ liệu lên Cloud.');
      throw err;
    }
  }, [openAuthGuard, refreshProfile, updateSyncMeta]);

  const resolveConflictPull = useCallback(async () => {
    const activeUser = latestCloudUserRef.current;
    if (!activeUser) {
      openAuthGuard('Tải dữ liệu bộ thẻ từ đám mây');
      return;
    }
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncMessage(null);
    try {
      const pullRes = await apiForcePullSync();
      if (
        syncConflict &&
        syncConflict.serverSummary.deckCount > 0 &&
        pullRes.folders.length === 0
      ) {
        throw new Error(
          'Cloud báo đang có dữ liệu nhưng kết quả tải về bị rỗng. Đã hủy ghi đè để bảo vệ bộ thẻ trên máy.'
        );
      }
      applyServerSnapshot(
        pullRes.folders,
        pullRes.items,
        pullRes.syncVersion,
        pullRes.syncedAt,
        pullRes.dataHash,
        activeUser.id
      );
      setCloudSnapshot(pullRes);
      setSyncConflict(null);
      setSyncStatus('synced');
      lastSuccessfulCheckAtRef.current = Date.now();
      setSyncMessage(
        `Đã tải ${pullRes.folders.length} thư mục (${pullRes.items.length} Kanji) từ Cloud về máy (v${pullRes.syncVersion}).`
      );
      refreshProfile();
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Lỗi tải dữ liệu từ Cloud.');
      throw err;
    }
  }, [syncConflict, openAuthGuard, applyServerSnapshot, refreshProfile]);

  const resolveSelectiveCollisions = useCallback(
    async (resolutions: Record<string, 'keep' | 'delete'>) => {
      const activeUser = latestCloudUserRef.current;
      if (!activeUser) {
        openAuthGuard('Đồng bộ bộ thẻ Flashcard lên đám mây');
        return;
      }
      if (!syncConflict?.pendingMergeDraft || !syncConflict.collisions) {
        return;
      }
      setSyncStatus('syncing');
      setSyncError(null);
      setSyncMessage(null);

      try {
        const resolved = applyCollisionResolutions(
          syncConflict.pendingMergeDraft,
          syncConflict.collisions,
          resolutions
        );
        const mergeRes = await apiMergeSync({
          baseVersion: syncConflict.pendingMergeDraft.baseVersion,
          folders: resolved.folders,
          items: resolved.items,
          deletedFolderIds: resolved.deletedFolderIds,
          deletedItemIds: resolved.deletedItemIds,
        });
        applyServerSnapshot(
          mergeRes.folders,
          mergeRes.items,
          mergeRes.syncVersion,
          mergeRes.syncedAt,
          mergeRes.dataHash,
          activeUser.id
        );
        setCloudSnapshot({
          syncVersion: mergeRes.syncVersion,
          syncedAt: mergeRes.syncedAt,
          dataHash: mergeRes.dataHash,
          folders: mergeRes.folders,
          items: mergeRes.items,
        });
        setSyncConflict(null);
        setSyncStatus('synced');
        lastSuccessfulCheckAtRef.current = Date.now();
        setSyncMessage(
          `Đã hoàn tất gộp thông minh ${mergeRes.folders.length} thư mục (${mergeRes.items.length} Kanji) lên Cloud (v${mergeRes.syncVersion}).`
        );
        refreshProfile();

        const pendingCallback = syncGateReadyCallbackRef.current;
        if (pendingCallback) {
          syncGateReadyCallbackRef.current = null;
          pendingCallback();
        }
      } catch (err: any) {
        setSyncStatus('error');
        setSyncError(err?.message || 'Lỗi khi hoàn tất gộp dữ liệu.');
        throw err;
      }
    },
    [syncConflict, openAuthGuard, applyServerSnapshot, refreshProfile]
  );

  const resolveConflictUnionMerge = useCallback(async () => {
    const activeUser = latestCloudUserRef.current;
    if (!activeUser) {
      openAuthGuard('Đồng bộ bộ thẻ Flashcard lên đám mây');
      return;
    }
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncMessage(null);
    try {
      const cloudSnap = await apiForcePullSync();
      const curFolders = latestFoldersRef.current;
      const curItems = latestItemsRef.current;
      const merged = threeWayMergeDecks({
        base: null,
        local: { folders: curFolders, items: curItems },
        cloud: { folders: cloudSnap.folders, items: cloudSnap.items },
        tombstones: {
          deletedFolderIds: [],
          deletedItemIds: [],
          deletedCompoundKeys: [],
        },
      });
      const mergeRes = await apiMergeSync({
        baseVersion: cloudSnap.syncVersion,
        folders: merged.folders,
        items: merged.items,
        deletedFolderIds: [],
        deletedItemIds: [],
      });
      applyServerSnapshot(
        mergeRes.folders,
        mergeRes.items,
        mergeRes.syncVersion,
        mergeRes.syncedAt,
        mergeRes.dataHash,
        activeUser.id
      );
      setCloudSnapshot({
        syncVersion: mergeRes.syncVersion,
        syncedAt: mergeRes.syncedAt,
        dataHash: mergeRes.dataHash,
        folders: mergeRes.folders,
        items: mergeRes.items,
      });
      setSyncConflict(null);
      setSyncStatus('synced');
      lastSuccessfulCheckAtRef.current = Date.now();
      setSyncMessage(
        `Đã gộp cả 2 thiết bị thành ${mergeRes.folders.length} thư mục (${mergeRes.items.length} Kanji) trên Cloud (v${mergeRes.syncVersion}).`
      );
      refreshProfile();

      const pendingCallback = syncGateReadyCallbackRef.current;
      if (pendingCallback) {
        syncGateReadyCallbackRef.current = null;
        pendingCallback();
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Không thể gộp dữ liệu 2 chiều.');
      throw err;
    }
  }, [openAuthGuard, applyServerSnapshot, refreshProfile]);

  const formatMergeSummary = useCallback(
    (stats: {
      addedFromCloud: number;
      addedFromLocal: number;
      srsUpdatedFromCloud: number;
      srsKeptFromLocal: number;
    }): string => {
      const parts: string[] = [];
      if (stats.addedFromCloud > 0) parts.push(`+${stats.addedFromCloud} mục từ Cloud`);
      if (stats.addedFromLocal > 0) parts.push(`+${stats.addedFromLocal} mục từ máy`);
      if (stats.srsUpdatedFromCloud > 0)
        parts.push(`${stats.srsUpdatedFromCloud} thẻ cập nhật lịch ôn mới hơn`);
      if (parts.length === 0) return 'Đã đồng bộ và hợp nhất dữ liệu mới nhất.';
      return `Đã gộp thông minh: ${parts.join(' · ')}.`;
    },
    []
  );

  const runSmartSync = useCallback(
    async (opts?: {
      trigger?: SyncTriggerSource;
      silent?: boolean;
      onStage?: (stage: 'checking' | 'merging') => void;
    }): Promise<{
      outcome: 'auth_required' | 'synced' | 'conflict' | 'error';
      summaryText?: string | null;
      errorText?: string | null;
    }> => {
      const trigger = opts?.trigger || 'manual';
      const activeUser = latestCloudUserRef.current;
      if (!activeUser || !supabaseEnabled) {
        if (!opts?.silent && trigger === 'manual') {
          openAuthGuard('Đồng bộ bộ thẻ Flashcard lên đám mây');
        }
        return { outcome: 'auth_required' };
      }

      if (inFlightSyncRef.current) {
        const outcome = await inFlightSyncRef.current;
        if (
          trigger === 'pre_review' ||
          trigger === 'review_page' ||
          trigger === 'manual'
        ) {
          // If an earlier background sync just completed, ensure latest mutations are flushed
          if (latestSyncMetaRef.current.dirtySinceLastSync && outcome === 'synced') {
            return runSmartSyncRef.current(opts);
          }
        }
        return { outcome };
      }

      const execute = async (): Promise<{
        outcome: 'auth_required' | 'synced' | 'conflict' | 'error';
        summaryText?: string | null;
        errorText?: string | null;
      }> => {
        const startMutationSeq = mutationSeqRef.current;
        setSyncStatus('checking');
        setSyncError(null);
        if (!opts?.silent) setSyncMessage(null);
        opts?.onStage?.('checking');

        try {
          const curFolders = latestFoldersRef.current;
          const curItems = latestItemsRef.current;
          const curMeta = latestSyncMetaRef.current;
          const localHash = await computeClientDeckHash(curFolders, curItems);
          const curUntouched = isUntouchedStarterDeck(
            curFolders,
            curItems,
            curMeta.hasUserModifiedData
          );
          const localStats = {
            deckCount: curFolders.length,
            cardCount: curItems.length,
            compoundCount: curItems.reduce(
              (sum, it) => sum + (it.compoundWords ? it.compoundWords.length : 0),
              0
            ),
            lastModifiedAt: curMeta.lastLocalModifiedAt || null,
            syncVersion: curMeta.lastSyncedVersion,
          };

          const hasRealLocalWithoutVersion =
            curMeta.lastSyncedVersion === 0 &&
            (curFolders.length > 0 || curItems.length > 0) &&
            !curUntouched;
          const localHasChanges =
            curMeta.dirtySinceLastSync ||
            (Boolean(curMeta.lastSyncedHash) && localHash !== curMeta.lastSyncedHash) ||
            hasRealLocalWithoutVersion ||
            curMeta.deletedFolderIds.length > 0 ||
            curMeta.deletedItemIds.length > 0 ||
            curMeta.deletedCompoundKeys.length > 0;

          const checkRes = await apiCheckSyncStatus({
            lastSyncedVersion: curMeta.lastSyncedVersion,
            lastSyncedUserId: curMeta.lastSyncedUserId,
            localHasChanges,
            localDataHash: localHash,
            localStats: {
              deckCount: localStats.deckCount,
              cardCount: localStats.cardCount,
              compoundCount: localStats.compoundCount,
              lastModifiedAt: curMeta.lastLocalModifiedAt,
              deletedDeckCount: curMeta.deletedFolderIds.length,
              deletedCardCount: curMeta.deletedItemIds.length,
              hasUserModifiedData:
                curMeta.hasUserModifiedData || hasRealLocalWithoutVersion,
              isUntouchedStarter: curUntouched,
            },
          });

          const serverSummary = {
            deckCount: checkRes.serverSummary.deckCount,
            cardCount: checkRes.serverSummary.cardCount,
            compoundCount: checkRes.serverSummary.compoundCount,
            lastModifiedAt: checkRes.serverSummary.lastSyncAt
              ? new Date(checkRes.serverSummary.lastSyncAt).getTime()
              : null,
            syncVersion: checkRes.serverSummary.syncVersion,
          };

          if (checkRes.decision === 'up_to_date') {
            const syncedTime =
              serverSummary.lastModifiedAt || curMeta.lastSyncedAt || Date.now();
            const existingBaseline = loadSyncBaselineSnapshot();
            if (
              !existingBaseline ||
              existingBaseline.userId !== activeUser.id ||
              existingBaseline.version !== checkRes.serverSummary.syncVersion
            ) {
              saveSyncBaselineSnapshot({
                userId: activeUser.id,
                version: checkRes.serverSummary.syncVersion,
                folders: curFolders,
                items: curItems,
              });
            }
            updateSyncMeta((prev) => ({
              ...prev,
              lastSyncedUserId: activeUser.id,
              lastSyncedVersion: checkRes.serverSummary.syncVersion,
              lastSyncedAt: syncedTime,
              lastSyncedHash: localHash || checkRes.serverSummary.dataHash,
              dirtySinceLastSync: false,
              deletedFolderIds: [],
              deletedItemIds: [],
              deletedCompoundKeys: [],
            }));
            setSyncStatus('synced');
            lastSuccessfulCheckAtRef.current = Date.now();
            const msg = 'Dữ liệu trên máy và Cloud đã đồng bộ mới nhất.';
            if (!opts?.silent) setSyncMessage(msg);
            return { outcome: 'synced', summaryText: msg };
          }

          if (checkRes.decision === 'auto_pull') {
            setSyncStatus('syncing');
            opts?.onStage?.('merging');
            const pullRes = await apiForcePullSync();
            if (
              checkRes.serverSummary.deckCount > 0 &&
              pullRes.folders.length === 0
            ) {
              throw new Error(
                'Cloud báo đang có dữ liệu nhưng kết quả tải về bị rỗng. Đã hủy ghi đè để bảo vệ bộ thẻ trên máy.'
              );
            }
            const addedKanji = Math.max(0, pullRes.items.length - curItems.length);
            applyServerSnapshot(
              pullRes.folders,
              pullRes.items,
              pullRes.syncVersion,
              pullRes.syncedAt,
              pullRes.dataHash,
              activeUser.id
            );
            setCloudSnapshot(pullRes);
            setSyncStatus('synced');
            lastSuccessfulCheckAtRef.current = Date.now();
            const msg =
              addedKanji > 0
                ? `Đã cập nhật +${addedKanji} chữ Kanji và lịch ôn mới nhất từ Cloud (v${pullRes.syncVersion}).`
                : `Đã tải bản cập nhật mới nhất từ Cloud (v${pullRes.syncVersion}).`;
            setSyncMessage(msg);
            refreshProfile();
            return { outcome: 'synced', summaryText: msg };
          }

          // Helper for Git-style 3-way merge + optimistic lock retry
          const executeThreeWayMergeWithRetry = async (
            reasonForFallback: string
          ): Promise<{
            outcome: 'synced' | 'conflict';
            summaryText?: string | null;
          }> => {
            const latestAccountMismatch = Boolean(
              curMeta.lastSyncedUserId &&
                curMeta.lastSyncedUserId !== activeUser.id &&
                !curUntouched &&
                (curFolders.length > 0 || curItems.length > 0)
            );
            if (latestAccountMismatch) {
              setSyncConflict({
                reason: reasonForFallback,
                localSummary: localStats,
                serverSummary,
                isAccountMismatch: true,
              });
              setSyncStatus('conflict');
              refreshCloudSnapshot();
              return { outcome: 'conflict' };
            }

            setSyncStatus('syncing');
            opts?.onStage?.('merging');

            for (let attempt = 0; attempt < 3; attempt += 1) {
              const snap = await apiForcePullSync();
              const latestLocalFolders = latestFoldersRef.current;
              const latestLocalItems = latestItemsRef.current;
              const latestMeta = latestSyncMetaRef.current;

              const storedBaseline = loadSyncBaselineSnapshot();
              const validBaseline =
                storedBaseline && storedBaseline.userId === activeUser.id
                  ? {
                      folders: storedBaseline.folders,
                      items: storedBaseline.items,
                    }
                  : null;

              const merged = threeWayMergeDecks({
                base: validBaseline,
                local: {
                  folders: latestLocalFolders,
                  items: latestLocalItems,
                },
                cloud: {
                  folders: snap.folders,
                  items: snap.items,
                },
                tombstones: {
                  deletedFolderIds: latestMeta.deletedFolderIds,
                  deletedItemIds: latestMeta.deletedItemIds,
                  deletedCompoundKeys: latestMeta.deletedCompoundKeys,
                },
              });

              if (merged.collisions.length > 0) {
                setCloudSnapshot(snap);
                setSyncConflict({
                  reason: `Phát hiện ${merged.collisions.length} mục đụng độ (một thiết bị đã xóa trong khi thiết bị kia vừa sửa hoặc ôn tập). Các mục còn lại đã được giữ nguyên an toàn.`,
                  localSummary: localStats,
                  serverSummary: {
                    deckCount: snap.folders.length,
                    cardCount: snap.items.length,
                    compoundCount: snap.items.reduce(
                      (s, it) => s + (it.compoundWords?.length || 0),
                      0
                    ),
                    lastModifiedAt: snap.syncedAt,
                    syncVersion: snap.syncVersion,
                  },
                  collisions: merged.collisions,
                  pendingMergeDraft: {
                    baseVersion: snap.syncVersion,
                    folders: merged.folders,
                    items: merged.items,
                    deletedFolderIds: merged.deletedFolderIdsToPush,
                    deletedItemIds: merged.deletedItemIdsToPush,
                    summaryStats: merged.stats,
                  },
                });
                setSyncStatus('conflict');
                return { outcome: 'conflict' };
              }

              const mergedHash = await computeClientDeckHash(
                merged.folders,
                merged.items
              );
              const needsPush =
                mergedHash !== snap.dataHash ||
                merged.deletedFolderIdsToPush.length > 0 ||
                merged.deletedItemIdsToPush.length > 0;

              if (!needsPush) {
                applyServerSnapshot(
                  snap.folders,
                  snap.items,
                  snap.syncVersion,
                  snap.syncedAt,
                  snap.dataHash,
                  activeUser.id
                );
                setCloudSnapshot(snap);
                setSyncStatus('synced');
                lastSuccessfulCheckAtRef.current = Date.now();
                const summary = formatMergeSummary(merged.stats);
                if (
                  !opts?.silent ||
                  merged.stats.addedFromCloud > 0 ||
                  merged.stats.srsUpdatedFromCloud > 0
                ) {
                  setSyncMessage(summary);
                }
                refreshProfile();
                return { outcome: 'synced', summaryText: summary };
              }

              try {
                const mergeRes = await apiMergeSync({
                  baseVersion: snap.syncVersion,
                  folders: merged.folders,
                  items: merged.items,
                  deletedFolderIds: merged.deletedFolderIdsToPush,
                  deletedItemIds: merged.deletedItemIdsToPush,
                });
                applyServerSnapshot(
                  mergeRes.folders,
                  mergeRes.items,
                  mergeRes.syncVersion,
                  mergeRes.syncedAt,
                  mergeRes.dataHash,
                  activeUser.id
                );
                setCloudSnapshot({
                  syncVersion: mergeRes.syncVersion,
                  syncedAt: mergeRes.syncedAt,
                  dataHash: mergeRes.dataHash,
                  folders: mergeRes.folders,
                  items: mergeRes.items,
                });
                setSyncStatus('synced');
                lastSuccessfulCheckAtRef.current = Date.now();
                const summary = formatMergeSummary(merged.stats);
                if (
                  !opts?.silent ||
                  merged.stats.addedFromCloud > 0 ||
                  merged.stats.srsUpdatedFromCloud > 0
                ) {
                  setSyncMessage(summary);
                }
                refreshProfile();
                return { outcome: 'synced', summaryText: summary };
              } catch (err: any) {
                if (
                  (err?.status === 409 || err?.code === 'SYNC_CONFLICT') &&
                  attempt < 2
                ) {
                  continue;
                }
                throw err;
              }
            }

            throw new Error(
              'Cloud liên tục thay đổi trong lúc gộp. Vui lòng thử lại sau giây lát.'
            );
          };

          if (checkRes.decision === 'auto_push') {
            setSyncStatus('syncing');
            opts?.onStage?.('merging');
            try {
              const mergeRes = await apiMergeSync({
                baseVersion: checkRes.serverSummary.syncVersion,
                folders: curFolders,
                items: curItems,
                deletedFolderIds: curMeta.deletedFolderIds,
                deletedItemIds: curMeta.deletedItemIds,
              });
              applyServerSnapshot(
                mergeRes.folders,
                mergeRes.items,
                mergeRes.syncVersion,
                mergeRes.syncedAt,
                mergeRes.dataHash,
                activeUser.id
              );
              setCloudSnapshot({
                syncVersion: mergeRes.syncVersion,
                syncedAt: mergeRes.syncedAt,
                dataHash: mergeRes.dataHash,
                folders: mergeRes.folders,
                items: mergeRes.items,
              });
              setSyncStatus('synced');
              lastSuccessfulCheckAtRef.current = Date.now();
              const msg = `Đã đồng bộ ${mergeRes.folders.length} thư mục (${mergeRes.items.length} Kanji) lên Cloud (v${mergeRes.syncVersion}).`;
              if (!opts?.silent) setSyncMessage(msg);
              refreshProfile();
              return { outcome: 'synced', summaryText: msg };
            } catch (mergeErr: any) {
              if (
                mergeErr?.status === 409 ||
                mergeErr?.code === 'SYNC_CONFLICT'
              ) {
                return await executeThreeWayMergeWithRetry(
                  mergeErr?.message ||
                    'Cloud vừa cập nhật từ thiết bị khác.'
                );
              }
              throw mergeErr;
            }
          }

          // 'conflict' from /api/sync/check -> automatically resolve via Git-style 3-way merge!
          return await executeThreeWayMergeWithRetry(checkRes.reason);
        } catch (err: any) {
          const message = err?.message || 'Lỗi kiểm tra đồng bộ Cloud.';
          setSyncStatus('error');
          setSyncError(message);
          return { outcome: 'error', errorText: message };
        } finally {
          inFlightSyncRef.current = null;
          // If user mutated data outside /decks while this sync was running, schedule a follow-up auto-sync
          if (
            !isDecksRouteRef.current &&
            (queuedFollowUpSyncRef.current ||
              mutationSeqRef.current !== startMutationSeq)
          ) {
            queuedFollowUpSyncRef.current = false;
            window.setTimeout(() => {
              void runSmartSyncRef.current({ trigger: 'auto_save', silent: true });
            }, 400);
          } else {
            queuedFollowUpSyncRef.current = false;
          }
        }
      };

      const promiseWrapper = execute();
      inFlightSyncRef.current = promiseWrapper.then((r) => r.outcome);
      return await promiseWrapper;
    },
    [
      supabaseEnabled,
      openAuthGuard,
      updateSyncMeta,
      applyServerSnapshot,
      refreshProfile,
      refreshCloudSnapshot,
      formatMergeSummary,
    ]
  );

  runSmartSyncRef.current = runSmartSync;

  const triggerAnkiSync = useCallback(async (): Promise<
    'auth_required' | 'synced' | 'conflict' | 'error'
  > => {
    const res = await runSmartSync({ trigger: 'manual', silent: false });
    return res.outcome;
  }, [runSmartSync]);

  const flushPendingSync = useCallback(async () => {
    if (!latestCloudUserRef.current || !supabaseEnabled) return;
    if (debounceAutoSyncTimerRef.current) {
      window.clearTimeout(debounceAutoSyncTimerRef.current);
      debounceAutoSyncTimerRef.current = null;
    }
    const meta = latestSyncMetaRef.current;
    const hasPending =
      meta.dirtySinceLastSync ||
      meta.deletedFolderIds.length > 0 ||
      meta.deletedItemIds.length > 0 ||
      meta.deletedCompoundKeys.length > 0;
    if (hasPending) {
      await runSmartSyncRef.current({ trigger: 'auto_save', silent: true });
    }
  }, [supabaseEnabled]);

  const bypassSyncGate = useCallback(() => {
    syncGateDismissedRef.current = true;
    if (syncGateTimerRef.current) {
      window.clearTimeout(syncGateTimerRef.current);
      syncGateTimerRef.current = null;
    }
    setReviewSyncGate((prev) => ({ ...prev, isOpen: false }));
    const cb = syncGateReadyCallbackRef.current;
    syncGateReadyCallbackRef.current = null;
    if (cb) cb();
  }, []);

  const runSyncGate = useCallback(
    async (
      context: 'enter_decks' | 'start_session',
      onReady?: () => void
    ) => {
      if (!latestCloudUserRef.current || !supabaseEnabled) {
        onReady?.();
        return;
      }

      const now = Date.now();
      const cooldownMs = context === 'start_session' ? 1200 : 1200;
      const recentlySynced =
        now - lastSuccessfulCheckAtRef.current < cooldownMs &&
        !latestSyncMetaRef.current.dirtySinceLastSync;

      if (recentlySynced) {
        onReady?.();
        return;
      }

      if (syncGateTimerRef.current) {
        window.clearTimeout(syncGateTimerRef.current);
        syncGateTimerRef.current = null;
      }
      syncGateDismissedRef.current = false;
      syncGateReadyCallbackRef.current = onReady || null;

      setReviewSyncGate({
        isOpen: true,
        context,
        stage: 'checking',
        summaryText: null,
        errorText: null,
      });

      const res = await runSmartSync({
        trigger: context === 'start_session' ? 'pre_review' : 'review_page',
        silent: true,
        onStage: (stage) => {
          if (syncGateDismissedRef.current) return;
          setReviewSyncGate((prev) =>
            prev.isOpen ? { ...prev, stage } : prev
          );
        },
      });

      if (syncGateDismissedRef.current) return;

      if (res.outcome === 'synced') {
        setReviewSyncGate((prev) => ({
          ...prev,
          stage: 'done',
          summaryText:
            res.summaryText || 'Đã đồng bộ dữ liệu ôn tập mới nhất.',
        }));
        const hasVisibleNews = Boolean(
          res.summaryText &&
            (res.summaryText.includes('+') ||
              res.summaryText.includes('cập nhật'))
        );
        syncGateTimerRef.current = window.setTimeout(
          () => {
            setReviewSyncGate((prev) => ({ ...prev, isOpen: false }));
            const cb = syncGateReadyCallbackRef.current;
            syncGateReadyCallbackRef.current = null;
            if (cb) cb();
          },
          hasVisibleNews ? 650 : 240
        );
      } else if (res.outcome === 'conflict') {
        // Hand off directly to SyncConflictModal (keeping callback for after resolution)
        setReviewSyncGate((prev) => ({ ...prev, isOpen: false }));
      } else if (res.outcome === 'auth_required') {
        setReviewSyncGate((prev) => ({ ...prev, isOpen: false }));
        const cb = syncGateReadyCallbackRef.current;
        syncGateReadyCallbackRef.current = null;
        if (cb) cb();
      } else {
        setReviewSyncGate((prev) => ({
          ...prev,
          stage: 'error',
          errorText:
            res.errorText ||
            'Không thể kết nối Cloud. Bạn vẫn có thể học ngoại tuyến với dữ liệu trên máy.',
        }));
      }
    },
    [supabaseEnabled, runSmartSync]
  );

  runSyncGateRef.current = runSyncGate;

  const retrySyncGate = useCallback(async () => {
    const cb = syncGateReadyCallbackRef.current || undefined;
    await runSyncGate(reviewSyncGate.context, cb);
  }, [runSyncGate, reviewSyncGate.context]);

  // Lifecycle Auto-Sync:
  // 1) Sync once upon entering the Decks feature (/decks or /decks/:folderId),
  //    and only flush to Cloud when leaving for another feature if there were changes.
  useEffect(() => {
    if (isDecksRoute) {
      wasInDecksRouteRef.current = true;
      if (!cloudUser?.id || !supabaseEnabled) {
        decksVisitSyncedUserIdRef.current = null;
        return;
      }
      if (decksVisitSyncedUserIdRef.current !== cloudUser.id) {
        decksVisitSyncedUserIdRef.current = cloudUser.id;
        void runSyncGateRef.current('enter_decks');
      }
      return;
    }

    const justLeftDecks = wasInDecksRouteRef.current;
    wasInDecksRouteRef.current = false;
    decksVisitSyncedUserIdRef.current = null;

    if (justLeftDecks && cloudUser?.id && supabaseEnabled) {
      void flushPendingSync();
    }
  }, [isDecksRoute, cloudUser?.id, supabaseEnabled, flushPendingSync]);

  // 2) Immediately when opening the app / logging in (skip if already entering /decks*, which uses the sync gate above)
  useEffect(() => {
    if (!cloudUser?.id || !supabaseEnabled) return;
    if (isDecksRouteRef.current) return;
    void runSmartSyncRef.current({ trigger: 'startup', silent: true });
  }, [cloudUser?.id, supabaseEnabled]);

  // 3) Safety flush when tab is hidden/closed with unsaved study progress,
  //    plus focus/online sync only when outside the Decks feature
  useEffect(() => {
    if (!cloudUser?.id || !supabaseEnabled) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingSync();
        return;
      }
      if (document.visibilityState && document.visibilityState !== 'visible') {
        return;
      }
      if (isDecksRouteRef.current) return;
      if (Date.now() - lastSuccessfulCheckAtRef.current < 5000) return;
      void runSmartSyncRef.current({ trigger: 'focus', silent: true });
    };

    const handlePageHide = () => {
      void flushPendingSync();
    };

    const handleOnline = () => {
      if (isDecksRouteRef.current) {
        void flushPendingSync();
        return;
      }
      void runSmartSyncRef.current({ trigger: 'online', silent: true });
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('online', handleOnline);
    };
  }, [cloudUser?.id, supabaseEnabled, flushPendingSync]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceAutoSyncTimerRef.current) {
        window.clearTimeout(debounceAutoSyncTimerRef.current);
      }
      if (syncGateTimerRef.current) {
        window.clearTimeout(syncGateTimerRef.current);
      }
    };
  }, []);

  const dismissConflict = useCallback(() => {
    setSyncConflict(null);
    syncGateReadyCallbackRef.current = null;
    setSyncStatus('idle');
  }, []);

  const clearSyncMessage = useCallback(() => {
    setSyncMessage(null);
    setSyncError(null);
  }, []);

  const syncNowToCloud = useCallback(async () => {
    await triggerAnkiSync();
  }, [triggerAnkiSync]);

  const pullFromCloud = useCallback(async () => {
    await resolveConflictPull();
  }, [resolveConflictPull]);

  const logoutCloud = useCallback(async () => {
    setCloudSnapshot(null);
    setIsCloudInspectorOpen(false);
    decksVisitSyncedUserIdRef.current = null;
    wasInDecksRouteRef.current = false;
    clearSyncBaselineSnapshot();
    await authLogout();
  }, [authLogout]);

  const publishFolderPublicly = useCallback(
    async (folderId: string): Promise<string> => {
      if (!cloudUser) {
        openAuthGuard('Chia sẻ bộ bài học công khai');
        throw new Error('Vui lòng đăng nhập để chia sẻ công khai.');
      }
      const bundle = buildExportBundle(folderId);
      if (!bundle) throw new Error('Không tìm thấy thư mục.');

      const targetFolder = folders.find((f) => f.id === folderId);
      const slug =
        targetFolder?.shareSlug ||
        `${folderId.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;

      await publishFolderShareToCloud(
        cloudUser.id,
        authDisplayName || cloudUser.email || 'user',
        bundle,
        slug
      );

      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, isPublic: true, shareSlug: slug, updatedAt: Date.now() } : f
        )
      );
      markLocalMutation();

      return slug;
    },
    [cloudUser, authDisplayName, openAuthGuard, buildExportBundle, folders, markLocalMutation]
  );

  const unpublishFolderPublicly = useCallback(
    async (folderId: string) => {
      const targetFolder = folders.find((f) => f.id === folderId);
      if (targetFolder?.shareSlug) {
        await unpublishFolderShareFromCloud(targetFolder.shareSlug);
      }
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, isPublic: false, updatedAt: Date.now() } : f
        )
      );
      markLocalMutation();
    },
    [folders, markLocalMutation]
  );

  return (
    <DeckContext.Provider
      value={{
        folders,
        items,
        srsConfig,
        setSrsConfig,
        selectedFolderId,
        setSelectedFolderId,
        getDescendantFolderIds,
        getFolderPath,
        getItemsForFolderRecursive,
        getReviewCardsForFolder,
        getDueCountForFolderRecursive,
        isDuplicateFolderName,
        createFolder,
        createFolderTree,
        renameFolder,
        moveFolder,
        deleteFolder,
        addKanjiListToFolder,
        addCatalogKanjiToFolder,
        batchImportItemsToFolder,
        updateKanjiItem,
        deleteKanjiItem,
        deleteKanjiItems,
        moveKanjiItems,
        enrichingItemIds,
        enrichKanjiItems,
        addCompoundWord,
        batchAddCompoundWords,
        updateCompoundWord,
        deleteCompoundWord,
        deleteCompoundWords,
        gradeFlashcard,
        buildExportBundle,
        buildFullExportBundle,
        detectImportConflicts,
        importDeckBundle,
        supabaseEnabled,
        cloudUser,
        isSyncing,
        syncStatus,
        syncMessage,
        syncConflict,
        lastSyncedAt,
        lastSyncedVersion,
        hasUnsyncedChanges,
        syncError,
        reviewSyncGate,
        runSyncGate,
        retrySyncGate,
        bypassSyncGate,
        flushPendingSync,
        triggerAnkiSync,
        resolveSelectiveCollisions,
        resolveConflictUnionMerge,
        resolveConflictPush,
        resolveConflictPull,
        dismissConflict,
        clearSyncMessage,
        isCloudInspectorOpen,
        cloudSnapshot,
        isLoadingCloudSnapshot,
        cloudSnapshotError,
        openCloudInspector,
        refreshCloudSnapshot,
        closeCloudInspector,
        syncNowToCloud,
        pullFromCloud,
        logoutCloud,
        publishFolderPublicly,
        unpublishFolderPublicly,
      }}
    >
      {children}
    </DeckContext.Provider>
  );
};

export const useDecks = () => {
  const ctx = useContext(DeckContext);
  if (!ctx) {
    throw new Error('useDecks must be used within a DeckProvider');
  }
  return ctx;
};
