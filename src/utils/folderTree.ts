import { FolderKanjiItem, StudyFolder } from '../types/deck';
import { cleanMeaningsList, cleanReadingsList } from './kanjiApi';

export interface FolderTreeIndex {
  folderMap: Map<string, StudyFolder>;
  childrenMap: Map<string | null, StudyFolder[]>;
  rootFolders: StudyFolder[];
  directItemsMap: Map<string, FolderKanjiItem[]>;
  getFolderPath: (folderId: string) => StudyFolder[];
  getChildren: (folderId: string) => StudyFolder[];
  getItemsDirect: (folderId: string) => FolderKanjiItem[];
  getItemsRecursive: (folderId: string) => FolderKanjiItem[];
  getSubfolderCountRecursive: (folderId: string) => number;
  getFolderStats: (folderId: string) => {
    kanjiCount: number;
    compoundCount: number;
    flashcardCount: number;
    directSubfolderCount: number;
    totalSubfolderCount: number;
  };
}

export function buildFolderTreeIndex(
  folders: StudyFolder[],
  items: FolderKanjiItem[],
  rootFolderId?: string
): FolderTreeIndex {
  const folderMap = new Map<string, StudyFolder>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  const childrenMap = new Map<string | null, StudyFolder[]>();
  const rawRoots: StudyFolder[] = [];

  for (const f of folders) {
    const hasValidParent = Boolean(f.parentId && folderMap.has(f.parentId) && f.parentId !== f.id);
    if (!hasValidParent) {
      rawRoots.push(f);
    } else {
      const parentKey = f.parentId as string;
      const list = childrenMap.get(parentKey) || [];
      list.push(f);
      childrenMap.set(parentKey, list);
    }
  }

  rawRoots.sort((a, b) => {
    if (rootFolderId) {
      if (a.id === rootFolderId && b.id !== rootFolderId) return -1;
      if (b.id === rootFolderId && a.id !== rootFolderId) return 1;
    }
    return a.sortOrder - b.sortOrder;
  });

  childrenMap.forEach((list) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  });

  const directItemsMap = new Map<string, FolderKanjiItem[]>();
  for (const item of items) {
    const list = directItemsMap.get(item.folderId) || [];
    list.push(item);
    directItemsMap.set(item.folderId, list);
  }

  const getChildren = (folderId: string): StudyFolder[] => {
    return childrenMap.get(folderId) || [];
  };

  const getFolderPath = (folderId: string): StudyFolder[] => {
    const path: StudyFolder[] = [];
    const visited = new Set<string>();
    let curr = folderMap.get(folderId);
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      path.unshift(curr);
      curr = curr.parentId ? folderMap.get(curr.parentId) : undefined;
    }
    return path;
  };

  const getItemsDirect = (folderId: string): FolderKanjiItem[] => {
    return directItemsMap.get(folderId) || [];
  };

  const recursiveItemsCache = new Map<string, FolderKanjiItem[]>();
  const getItemsRecursive = (folderId: string): FolderKanjiItem[] => {
    const cached = recursiveItemsCache.get(folderId);
    if (cached) return cached;

    const result: FolderKanjiItem[] = [];
    const visited = new Set<string>();
    const stack = [folderId];

    while (stack.length > 0) {
      const currId = stack.shift()!;
      if (visited.has(currId)) continue;
      visited.add(currId);

      const direct = directItemsMap.get(currId);
      if (direct && direct.length > 0) {
        result.push(...direct);
      }

      const kids = childrenMap.get(currId);
      if (kids && kids.length > 0) {
        for (let i = kids.length - 1; i >= 0; i--) {
          stack.unshift(kids[i].id);
        }
      }
    }

    recursiveItemsCache.set(folderId, result);
    return result;
  };

  const subfolderCountCache = new Map<string, number>();
  const getSubfolderCountRecursive = (folderId: string): number => {
    const cached = subfolderCountCache.get(folderId);
    if (cached !== undefined) return cached;

    let count = 0;
    const visited = new Set<string>([folderId]);
    const queue = [...getChildren(folderId)];
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      count++;
      queue.push(...getChildren(node.id));
    }

    subfolderCountCache.set(folderId, count);
    return count;
  };

  const getFolderStats = (folderId: string) => {
    const recursiveItems = getItemsRecursive(folderId);
    let compoundCount = 0;
    for (const it of recursiveItems) {
      compoundCount += it.compoundWords?.length || 0;
    }
    const directSubfolderCount = getChildren(folderId).length;
    const totalSubfolderCount = getSubfolderCountRecursive(folderId);

    return {
      kanjiCount: recursiveItems.length,
      compoundCount,
      flashcardCount: recursiveItems.length + compoundCount,
      directSubfolderCount,
      totalSubfolderCount,
    };
  };

  return {
    folderMap,
    childrenMap,
    rootFolders: rawRoots,
    directItemsMap,
    getFolderPath,
    getChildren,
    getItemsDirect,
    getItemsRecursive,
    getSubfolderCountRecursive,
    getFolderStats,
  };
}

export function doesKanjiItemMatchQuery(item: FolderKanjiItem, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  if (item.kanji.toLowerCase().includes(q)) return true;
  if ((item.hanViet || '').toLowerCase().includes(q)) return true;

  const readings = [
    ...cleanReadingsList(item.onReadings || []),
    ...cleanReadingsList(item.kunReadings || []),
  ];
  if (readings.some((r) => r.toLowerCase().includes(q))) return true;

  const meanings = cleanMeaningsList(item.meanings || []);
  if (meanings.some((m) => m.toLowerCase().includes(q))) return true;

  for (const cw of item.compoundWords || []) {
    if (
      cw.word.toLowerCase().includes(q) ||
      (cw.reading || '').toLowerCase().includes(q) ||
      (cw.hanViet || '').toLowerCase().includes(q) ||
      (cw.meaning || '').toLowerCase().includes(q)
    ) {
      return true;
    }
  }

  return false;
}
