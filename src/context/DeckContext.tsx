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
  fetchDecksFromCloud,
  getCurrentSupabaseUser,
  isSupabaseConfigured,
  publishFolderShareToCloud,
  signOutSupabase,
  supabase,
  syncDecksToCloud,
  unpublishFolderShareFromCloud,
} from '../utils/supabaseClient';

const STORAGE_FOLDERS_KEY = 'kanji_decks_folders_v1';
const STORAGE_ITEMS_KEY = 'kanji_decks_items_v1';
const STORAGE_SRS_CONFIG_KEY = 'kanji_decks_srs_config_v1';

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
  createFolder: (name: string, parentId: string | null, description?: string) => StudyFolder;
  renameFolder: (id: string, name: string, description?: string) => void;
  deleteFolder: (id: string) => void;

  // Kanji & Compound Word CRUD
  addKanjiListToFolder: (folderId: string, rawText: string) => Promise<number>;
  updateKanjiItem: (itemId: string, patch: Partial<FolderKanjiItem>) => void;
  deleteKanjiItem: (itemId: string) => void;
  addCompoundWord: (
    kanjiItemId: string,
    payload: { word: string; reading: string; hanViet: string; meaning: string }
  ) => void;
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
  importDeckBundle: (
    bundle: KanjiDeckExportBundle,
    targetParentId: string | null,
    resetSrs: boolean
  ) => { importedFolders: number; importedKanji: number; rootFolderId: string };

  // Supabase Cloud & Share
  supabaseEnabled: boolean;
  cloudUser: User | null;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  syncNowToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  logoutCloud: () => Promise<void>;
  publishFolderPublicly: (folderId: string) => Promise<string>;
  unpublishFolderPublicly: (folderId: string) => Promise<void>;
}

const DeckContext = createContext<DeckContextValue | undefined>(undefined);

export const DeckProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<StudyFolder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return createStarterData().folders;
  });

  const [items, setItems] = useState<FolderKanjiItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ITEMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return createStarterData().items;
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

  // Supabase Auth Listener
  const supabaseEnabled = isSupabaseConfigured();
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;
    getCurrentSupabaseUser().then(setCloudUser).catch(() => {});
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCloudUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabaseEnabled]);

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
  const createFolder = useCallback(
    (name: string, parentId: string | null, description = ''): StudyFolder => {
      const now = Date.now();
      const siblings = folders.filter((f) => f.parentId === parentId);
      const newFolder: StudyFolder = {
        id: genId(),
        parentId,
        name: name.trim() || 'Thư mục mới',
        description: description.trim() || undefined,
        sortOrder: siblings.length,
        createdAt: now,
        updatedAt: now,
      };
      setFolders((prev) => [...prev, newFolder]);
      setSelectedFolderId(newFolder.id);
      return newFolder;
    },
    [folders]
  );

  const renameFolder = useCallback((id: string, name: string, description?: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              name: name.trim() || f.name,
              description: description !== undefined ? description.trim() : f.description,
              updatedAt: Date.now(),
            }
          : f
      )
    );
  }, []);

  const deleteFolder = useCallback(
    (id: string) => {
      const idsToDelete = new Set(getDescendantFolderIds(id));
      setFolders((prev) => {
        const remaining = prev.filter((f) => !idsToDelete.has(f.id));
        if (selectedFolderId && idsToDelete.has(selectedFolderId)) {
          setSelectedFolderId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
      setItems((prev) => prev.filter((item) => !idsToDelete.has(item.folderId)));
    },
    [getDescendantFolderIds, selectedFolderId]
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
    [items]
  );

  const updateKanjiItem = useCallback(
    (itemId: string, patch: Partial<FolderKanjiItem>) => {
      setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
    },
    []
  );

  const deleteKanjiItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }, []);

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
    },
    []
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
    },
    []
  );

  const deleteCompoundWord = useCallback((kanjiItemId: string, wordId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === kanjiItemId
          ? { ...it, compoundWords: it.compoundWords.filter((cw) => cw.id !== wordId) }
          : it
      )
    );
  }, []);

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
    },
    [srsConfig]
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

  const importDeckBundle = useCallback(
    (
      bundle: KanjiDeckExportBundle,
      targetParentId: string | null,
      resetSrs: boolean
    ) => {
      const now = Date.now();
      const folderIdMap = new Map<string, string>();
      bundle.folders.forEach((f) => folderIdMap.set(f.id, genId()));

      const newFolders: StudyFolder[] = bundle.folders.map((f) => {
        const isRootOfBundle = f.id === bundle.rootFolderId;
        const mappedParent = isRootOfBundle
          ? targetParentId
          : f.parentId && folderIdMap.has(f.parentId)
          ? folderIdMap.get(f.parentId)!
          : targetParentId;

        return {
          ...f,
          id: folderIdMap.get(f.id)!,
          parentId: mappedParent,
          isPublic: false,
          shareSlug: undefined,
          createdAt: now,
          updatedAt: now,
        };
      });

      const newItems: FolderKanjiItem[] = bundle.items.map((it) => ({
        ...it,
        id: genId(),
        folderId: folderIdMap.get(it.folderId) || folderIdMap.get(bundle.rootFolderId)!,
        srsState: resetSrs ? createInitialSrsState(now) : it.srsState,
        compoundWords: (it.compoundWords || []).map((cw) => ({
          ...cw,
          id: genId(),
          srsState: resetSrs ? createInitialSrsState(now) : cw.srsState,
        })),
        createdAt: now,
      }));

      setFolders((prev) => [...prev, ...newFolders]);
      setItems((prev) => [...prev, ...newItems]);

      const newRootId = folderIdMap.get(bundle.rootFolderId) || newFolders[0]?.id || '';
      if (newRootId) setSelectedFolderId(newRootId);

      return {
        importedFolders: newFolders.length,
        importedKanji: newItems.length,
        rootFolderId: newRootId,
      };
    },
    []
  );

  // Supabase Cloud Sync & Share
  const syncNowToCloud = useCallback(async () => {
    if (!cloudUser) throw new Error('Vui lòng đăng nhập tài khoản Supabase trước.');
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncDecksToCloud(cloudUser.id, folders, items);
      setLastSyncedAt(Date.now());
    } catch (err: any) {
      setSyncError(err?.message || 'Lỗi đồng bộ lên Cloud.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [cloudUser, folders, items]);

  const pullFromCloud = useCallback(async () => {
    if (!cloudUser) throw new Error('Vui lòng đăng nhập tài khoản Supabase trước.');
    setIsSyncing(true);
    setSyncError(null);
    try {
      const data = await fetchDecksFromCloud(cloudUser.id);
      if (data && data.folders.length > 0) {
        setFolders(data.folders);
        setItems(data.items);
        setSelectedFolderId(data.folders[0]?.id ?? null);
      }
      setLastSyncedAt(Date.now());
    } catch (err: any) {
      setSyncError(err?.message || 'Lỗi tải dữ liệu từ Cloud.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [cloudUser]);

  const logoutCloud = useCallback(async () => {
    await signOutSupabase();
    setCloudUser(null);
  }, []);

  const publishFolderPublicly = useCallback(
    async (folderId: string): Promise<string> => {
      if (!cloudUser) throw new Error('Cần đăng nhập Supabase để chia sẻ công khai.');
      const bundle = buildExportBundle(folderId);
      if (!bundle) throw new Error('Không tìm thấy thư mục.');

      const targetFolder = folders.find((f) => f.id === folderId);
      const slug =
        targetFolder?.shareSlug ||
        `${folderId.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;

      await publishFolderShareToCloud(cloudUser.id, cloudUser.email || 'user', bundle, slug);

      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, isPublic: true, shareSlug: slug, updatedAt: Date.now() } : f
        )
      );

      return slug;
    },
    [cloudUser, buildExportBundle, folders]
  );

  const unpublishFolderPublicly = useCallback(async (folderId: string) => {
    const targetFolder = folders.find((f) => f.id === folderId);
    if (targetFolder?.shareSlug) {
      await unpublishFolderShareFromCloud(targetFolder.shareSlug);
    }
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, isPublic: false, updatedAt: Date.now() } : f
      )
    );
  }, [folders]);

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
        createFolder,
        renameFolder,
        deleteFolder,
        addKanjiListToFolder,
        updateKanjiItem,
        deleteKanjiItem,
        addCompoundWord,
        updateCompoundWord,
        deleteCompoundWord,
        gradeFlashcard,
        buildExportBundle,
        importDeckBundle,
        supabaseEnabled,
        cloudUser,
        isSyncing,
        lastSyncedAt,
        syncError,
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
