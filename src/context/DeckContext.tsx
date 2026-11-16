import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import {
  CompoundWordCard,
  FlashcardReviewItem,
  FolderKanjiItem,
  KanjiDeckExportBundle,
  ReviewFilterMode,
  SrsConfig,
  SrsRating,
  StudyFolder,
} from '../types/deck';
import {
  calculateNextSrsState,
  createInitialSrsState,
  DEFAULT_SRS_CONFIG,
} from '../utils/srsAlgorithm';
import { extractUniqueKanji } from '../utils/kanji';
import { getKanjiInfo } from '../data/kanjiDictionary';
import { getFullKanjiDetail } from '../utils/kanjiApi';
import {
  ParsedCompoundWordInput,
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
  computeClientDeckHash,
  DEFAULT_SYNC_META,
  loadLocalSyncMeta,
  LocalSyncMeta,
  saveLocalSyncMeta,
  SyncConflictInfo,
} from '../services/syncService';

const STORAGE_FOLDERS_KEY = 'kanji_decks_folders_v1';
const STORAGE_ITEMS_KEY = 'kanji_decks_items_v1';
const STORAGE_SRS_CONFIG_KEY = 'kanji_decks_srs_config_v1';
const STORAGE_STARTER_SEEDED_KEY = 'kanji_decks_starter_seeded_v1';

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
  batchImportItemsToFolder: (
    folderId: string,
    parsedItems: ParsedLessonItemInput[]
  ) => Promise<{ addedKanji: number; mergedKanji: number; addedCompoundWords: number }>;
  updateKanjiItem: (itemId: string, patch: Partial<FolderKanjiItem>) => void;
  deleteKanjiItem: (itemId: string) => void;
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
  triggerAnkiSync: () => Promise<'auth_required' | 'synced' | 'conflict' | 'error'>;
  resolveConflictPush: () => Promise<void>;
  resolveConflictPull: () => Promise<void>;
  dismissConflict: () => void;
  clearSyncMessage: () => void;
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

  const isSyncing = syncStatus === 'checking' || syncStatus === 'syncing';
  const lastSyncedAt = syncMeta.lastSyncedAt;
  const lastSyncedVersion = syncMeta.lastSyncedVersion;
  const hasUnsyncedChanges =
    syncMeta.dirtySinceLastSync ||
    syncMeta.deletedFolderIds.length > 0 ||
    syncMeta.deletedItemIds.length > 0;

  const updateSyncMeta = useCallback(
    (updater: (prev: LocalSyncMeta) => LocalSyncMeta) => {
      setSyncMeta((prev) => {
        const next = updater(prev);
        saveLocalSyncMeta(next);
        return next;
      });
    },
    []
  );

  const markLocalMutation = useCallback(
    (opts?: { deletedFolders?: string[]; deletedItems?: string[] }) => {
      const now = Date.now();
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

        return {
          ...prev,
          dirtySinceLastSync: true,
          hasUserModifiedData: true,
          lastLocalModifiedAt: now,
          deletedFolderIds: Array.from(existingDeletedFolders.values()),
          deletedItemIds: Array.from(existingDeletedItems.values()),
        };
      });
    },
    [updateSyncMeta]
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
                srsState: cw.srsState,
              });
            }
          }
        }
      }

      // Ưu tiên các thẻ quá hạn lâu nhất lên trước
      return cards.sort((a, b) => a.srsState.dueAt - b.srsState.dueAt);
    },
    [folders, getItemsForFolderRecursive]
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
          onReadings: localInfo?.on || [],
          kunReadings: localInfo?.kun || [],
          meanings: localInfo?.meanings || [],
          strokeCount: localInfo?.strokeCount,
          srsState: createInitialSrsState(now),
          compoundWords: [],
          createdAt: now,
        };
      });

      setItems((prev) => [...prev, ...newItems]);
      markLocalMutation();

      // Enrich asynchronously with full dictionary API in background
      newItems.forEach((created) => {
        getFullKanjiDetail(created.kanji)
          .then((detail) => {
            if (!detail) return;
            setItems((prev) =>
              prev.map((it) =>
                it.id === created.id
                  ? {
                      ...it,
                      hanViet: it.hanViet || detail.hanViet || '',
                      onReadings:
                        detail.on && detail.on.length > 0 && !detail.on[0].includes('Tra Mazii')
                          ? detail.on
                          : it.onReadings,
                      kunReadings:
                        detail.kun && detail.kun.length > 0 && !detail.kun[0].includes('Tra Mazii')
                          ? detail.kun
                          : it.kunReadings,
                      meanings:
                        detail.meanings &&
                        detail.meanings.length > 0 &&
                        !detail.meanings[0].includes('Tra Mazii') &&
                        !detail.meanings[0].includes('Bấm "Xem nét')
                          ? detail.meanings
                          : it.meanings,
                      strokeCount: detail.strokeCount || it.strokeCount,
                    }
                  : it
              )
            );
          })
          .catch(() => {});
      });

      return newItems.length;
    },
    [items, markLocalMutation]
  );

  const updateKanjiItem = useCallback(
    (itemId: string, patch: Partial<FolderKanjiItem>) => {
      setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
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
      };
      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? { ...it, compoundWords: [...it.compoundWords, newWord] }
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

      const existingWords = new Set(
        (targetItem.compoundWords || []).map((cw) => cw.word.trim())
      );
      const now = Date.now();
      const newCards: CompoundWordCard[] = [];

      for (const w of words) {
        const cleanWord = w.word.trim();
        const cleanMeaning = w.meaning.trim();
        if (!cleanWord || !cleanMeaning || existingWords.has(cleanWord)) continue;
        existingWords.add(cleanWord);
        newCards.push({
          id: genId(),
          word: cleanWord,
          reading: w.reading.trim(),
          hanViet: w.hanViet.trim().toUpperCase(),
          meaning: cleanMeaning,
          srsState: createInitialSrsState(now),
        });
      }

      if (newCards.length === 0) return 0;

      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? { ...it, compoundWords: [...it.compoundWords, ...newCards] }
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
      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? {
                ...it,
                compoundWords: it.compoundWords.map((cw) =>
                  cw.id === wordId ? { ...cw, ...patch } : cw
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
      setItems((prev) =>
        prev.map((it) =>
          it.id === kanjiItemId
            ? { ...it, compoundWords: it.compoundWords.filter((cw) => cw.id !== wordId) }
            : it
        )
      );
      markLocalMutation();
    },
    [markLocalMutation]
  );

  const batchImportItemsToFolder = useCallback(
    async (folderId: string, parsedItems: ParsedLessonItemInput[]) => {
      if (parsedItems.length === 0) {
        return { addedKanji: 0, mergedKanji: 0, addedCompoundWords: 0 };
      }

      const now = Date.now();
      let addedKanji = 0;
      let mergedKanji = 0;
      let addedCompoundWords = 0;
      const newlyCreatedItems: FolderKanjiItem[] = [];

      setItems((prev) => {
        const next = [...prev];

        for (const parsed of parsedItems) {
          const existingIdx = next.findIndex(
            (it) => it.folderId === folderId && it.kanji === parsed.kanji
          );

          if (existingIdx >= 0) {
            const existing = next[existingIdx];
            const existingWords = new Set(
              (existing.compoundWords || []).map((cw) => cw.word.trim())
            );
            const extraWords: CompoundWordCard[] = parsed.compoundWords
              .filter((cw) => !existingWords.has(cw.word.trim()))
              .map((cw) => {
                existingWords.add(cw.word.trim());
                return {
                  id: genId(),
                  word: cw.word.trim(),
                  reading: cw.reading.trim(),
                  hanViet: cw.hanViet.trim().toUpperCase(),
                  meaning: cw.meaning.trim(),
                  srsState: createInitialSrsState(now),
                };
              });

            if (extraWords.length > 0) {
              mergedKanji += 1;
              addedCompoundWords += extraWords.length;
              next[existingIdx] = {
                ...existing,
                compoundWords: [...(existing.compoundWords || []), ...extraWords],
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
              compoundWords.push({
                id: genId(),
                word: w,
                reading: cw.reading.trim(),
                hanViet: cw.hanViet.trim().toUpperCase(),
                meaning: cw.meaning.trim(),
                srsState: createInitialSrsState(now),
              });
            }

            const created: FolderKanjiItem = {
              id: genId(),
              folderId,
              kanji: parsed.kanji,
              hanViet: parsed.hanViet || localInfo?.hanViet || '',
              onReadings: localInfo?.on || [],
              kunReadings: localInfo?.kun || [],
              meanings:
                parsed.meanings && parsed.meanings.length > 0
                  ? parsed.meanings
                  : localInfo?.meanings || [],
              strokeCount: localInfo?.strokeCount,
              srsState: createInitialSrsState(now),
              compoundWords,
              createdAt: now,
            };

            next.push(created);
            newlyCreatedItems.push(created);
            addedKanji += 1;
            addedCompoundWords += compoundWords.length;
          }
        }

        return next;
      });

      // Enrich newly created Kanji items asynchronously
      newlyCreatedItems.forEach((created) => {
        getFullKanjiDetail(created.kanji)
          .then((detail) => {
            if (!detail) return;
            setItems((prev) =>
              prev.map((it) =>
                it.id === created.id
                  ? {
                      ...it,
                      hanViet: it.hanViet || detail.hanViet || '',
                      onReadings:
                        detail.on &&
                        detail.on.length > 0 &&
                        !detail.on[0].includes('Tra Mazii')
                          ? detail.on
                          : it.onReadings,
                      kunReadings:
                        detail.kun &&
                        detail.kun.length > 0 &&
                        !detail.kun[0].includes('Tra Mazii')
                          ? detail.kun
                          : it.kunReadings,
                      meanings:
                        detail.meanings &&
                        detail.meanings.length > 0 &&
                        !detail.meanings[0].includes('Tra Mazii') &&
                        !detail.meanings[0].includes('Bấm "Xem nét')
                          ? detail.meanings
                          : it.meanings,
                      strokeCount: detail.strokeCount || it.strokeCount,
                    }
                  : it
              )
            );
          })
          .catch(() => {});
      });

      markLocalMutation();
      return { addedKanji, mergedKanji, addedCompoundWords };
    },
    [markLocalMutation]
  );

  // SRS Grading
  const gradeFlashcard = useCallback(
    (card: FlashcardReviewItem, rating: SrsRating) => {
      const nextState = calculateNextSrsState(card.srsState, rating, srsConfig);
      if (card.cardType === 'kanji') {
        setItems((prev) =>
          prev.map((it) => (it.id === card.kanjiItemId ? { ...it, srsState: nextState } : it))
        );
      } else if (card.compoundWordId) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === card.kanjiItemId
              ? {
                  ...it,
                  compoundWords: it.compoundWords.map((cw) =>
                    cw.id === card.compoundWordId ? { ...cw, srsState: nextState } : cw
                  ),
                }
              : it
          )
        );
      }
      markLocalMutation();
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
      setFolders(nextFolders);
      setItems(nextItems);
      setSelectedFolderId((prev) =>
        prev && nextFolders.some((f) => f.id === prev)
          ? prev
          : nextFolders[0]?.id ?? null
      );
      try {
        localStorage.setItem(STORAGE_STARTER_SEEDED_KEY, '1');
      } catch {}

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
      }));
    },
    [updateSyncMeta]
  );

  const resolveConflictPush = useCallback(async () => {
    if (!cloudUser) {
      openAuthGuard('Đồng bộ bộ thẻ Flashcard lên đám mây');
      return;
    }
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncMessage(null);
    try {
      const pushRes = await apiForcePushSync({ folders, items });
      updateSyncMeta(() => ({
        ...DEFAULT_SYNC_META,
        lastSyncedUserId: cloudUser.id,
        lastSyncedVersion: pushRes.syncVersion,
        lastSyncedAt: pushRes.syncedAt,
        lastSyncedHash: pushRes.dataHash,
        dirtySinceLastSync: false,
        lastLocalModifiedAt: pushRes.syncedAt,
        hasUserModifiedData: true,
        deletedFolderIds: [],
        deletedItemIds: [],
      }));
      setSyncConflict(null);
      setSyncStatus('synced');
      setSyncMessage(
        `Đã tải toàn bộ dữ liệu từ máy lên Cloud (v${pushRes.syncVersion}).`
      );
      refreshProfile();
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Lỗi tải dữ liệu lên Cloud.');
      throw err;
    }
  }, [cloudUser, folders, items, openAuthGuard, refreshProfile, updateSyncMeta]);

  const resolveConflictPull = useCallback(async () => {
    if (!cloudUser) {
      openAuthGuard('Tải dữ liệu bộ thẻ từ đám mây');
      return;
    }
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncMessage(null);
    try {
      const pullRes = await apiForcePullSync();
      applyServerSnapshot(
        pullRes.folders,
        pullRes.items,
        pullRes.syncVersion,
        pullRes.syncedAt,
        pullRes.dataHash,
        cloudUser.id
      );
      setSyncConflict(null);
      setSyncStatus('synced');
      setSyncMessage(
        `Đã tải bản chuẩn từ Cloud về máy (v${pullRes.syncVersion}).`
      );
      refreshProfile();
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Lỗi tải dữ liệu từ Cloud.');
      throw err;
    }
  }, [cloudUser, openAuthGuard, applyServerSnapshot, refreshProfile]);

  const triggerAnkiSync = useCallback(async (): Promise<
    'auth_required' | 'synced' | 'conflict' | 'error'
  > => {
    if (!cloudUser) {
      openAuthGuard('Đồng bộ bộ thẻ Flashcard lên đám mây');
      return 'auth_required';
    }

    setSyncStatus('checking');
    setSyncError(null);
    setSyncMessage(null);

    try {
      const localHash = await computeClientDeckHash(folders, items);
      const localStats = buildLocalSummary();
      const localHasChanges =
        syncMeta.dirtySinceLastSync ||
        (Boolean(syncMeta.lastSyncedHash) && localHash !== syncMeta.lastSyncedHash) ||
        syncMeta.deletedFolderIds.length > 0 ||
        syncMeta.deletedItemIds.length > 0;

      const checkRes = await apiCheckSyncStatus({
        lastSyncedVersion: syncMeta.lastSyncedVersion,
        lastSyncedUserId: syncMeta.lastSyncedUserId,
        localHasChanges,
        localDataHash: localHash,
        localStats: {
          deckCount: localStats.deckCount,
          cardCount: localStats.cardCount,
          compoundCount: localStats.compoundCount,
          lastModifiedAt: syncMeta.lastLocalModifiedAt,
          deletedDeckCount: syncMeta.deletedFolderIds.length,
          deletedCardCount: syncMeta.deletedItemIds.length,
          hasUserModifiedData: syncMeta.hasUserModifiedData,
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
          serverSummary.lastModifiedAt || syncMeta.lastSyncedAt || Date.now();
        updateSyncMeta((prev) => ({
          ...prev,
          lastSyncedUserId: cloudUser.id,
          lastSyncedVersion: checkRes.serverSummary.syncVersion,
          lastSyncedAt: syncedTime,
          lastSyncedHash: localHash || checkRes.serverSummary.dataHash,
          dirtySinceLastSync: false,
          deletedFolderIds: [],
          deletedItemIds: [],
        }));
        setSyncStatus('synced');
        setSyncMessage('Dữ liệu trên máy và Cloud đã đồng bộ mới nhất.');
        return 'synced';
      }

      if (checkRes.decision === 'auto_pull') {
        setSyncStatus('syncing');
        const pullRes = await apiForcePullSync();
        applyServerSnapshot(
          pullRes.folders,
          pullRes.items,
          pullRes.syncVersion,
          pullRes.syncedAt,
          pullRes.dataHash,
          cloudUser.id
        );
        setSyncStatus('synced');
        setSyncMessage(`Đã tự động đồng bộ dữ liệu mới từ Cloud (v${pullRes.syncVersion}).`);
        refreshProfile();
        return 'synced';
      }

      if (checkRes.decision === 'auto_push') {
        setSyncStatus('syncing');
        try {
          const mergeRes = await apiMergeSync({
            baseVersion: checkRes.serverSummary.syncVersion,
            folders,
            items,
            deletedFolderIds: syncMeta.deletedFolderIds,
            deletedItemIds: syncMeta.deletedItemIds,
          });
          applyServerSnapshot(
            mergeRes.folders,
            mergeRes.items,
            mergeRes.syncVersion,
            mergeRes.syncedAt,
            mergeRes.dataHash,
            cloudUser.id
          );
          setSyncStatus('synced');
          setSyncMessage(`Đã đồng bộ thay đổi lên Cloud (v${mergeRes.syncVersion}).`);
          refreshProfile();
          return 'synced';
        } catch (mergeErr: any) {
          if (mergeErr?.status === 409 || mergeErr?.code === 'SYNC_CONFLICT') {
            setSyncConflict({
              reason:
                mergeErr?.message ||
                'Dữ liệu trên Cloud vừa thay đổi trong lúc đồng bộ.',
              localSummary: localStats,
              serverSummary,
            });
            setSyncStatus('conflict');
            return 'conflict';
          }
          throw mergeErr;
        }
      }

      // Conflict case
      setSyncConflict({
        reason: checkRes.reason,
        localSummary: localStats,
        serverSummary,
      });
      setSyncStatus('conflict');
      return 'conflict';
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Lỗi kiểm tra đồng bộ Cloud.');
      return 'error';
    }
  }, [
    cloudUser,
    openAuthGuard,
    folders,
    items,
    syncMeta,
    buildLocalSummary,
    updateSyncMeta,
    applyServerSnapshot,
    refreshProfile,
  ]);

  const dismissConflict = useCallback(() => {
    setSyncConflict(null);
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
        batchImportItemsToFolder,
        updateKanjiItem,
        deleteKanjiItem,
        addCompoundWord,
        batchAddCompoundWords,
        updateCompoundWord,
        deleteCompoundWord,
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
        triggerAnkiSync,
        resolveConflictPush,
        resolveConflictPull,
        dismissConflict,
        clearSyncMessage,
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
