import {
  CompoundWordCard,
  FolderKanjiItem,
  SrsState,
  StudyFolder,
} from '../types/deck';
import {
  DeletedCompoundTombstone,
  DeletedTombstone,
  MergeSummaryStats,
  PendingMergeDraft,
  SyncCollisionItem,
} from '../services/syncService';

export interface ThreeWayMergeInput {
  base: { folders: StudyFolder[]; items: FolderKanjiItem[] } | null;
  local: { folders: StudyFolder[]; items: FolderKanjiItem[] };
  cloud: { folders: StudyFolder[]; items: FolderKanjiItem[] };
  tombstones: {
    deletedFolderIds: DeletedTombstone[];
    deletedItemIds: DeletedTombstone[];
    deletedCompoundKeys: DeletedCompoundTombstone[];
  };
}

export interface ThreeWayMergeResult {
  folders: StudyFolder[];
  items: FolderKanjiItem[];
  deletedFolderIdsToPush: DeletedTombstone[];
  deletedItemIdsToPush: DeletedTombstone[];
  collisions: SyncCollisionItem[];
  stats: MergeSummaryStats;
}

function srsEqual(a?: Partial<SrsState> | null, b?: Partial<SrsState> | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    Number(a.dueAt || 0) === Number(b.dueAt || 0) &&
    Number(a.intervalMinutes || 0) === Number(b.intervalMinutes || 0) &&
    Number(a.easeFactor ?? 2.5) === Number(b.easeFactor ?? 2.5) &&
    Number(a.repetitions || 0) === Number(b.repetitions || 0) &&
    (a.lastRating || null) === (b.lastRating || null) &&
    Number(a.lastReviewedAt || 0) === Number(b.lastReviewedAt || 0)
  );
}

/**
 * Gộp trạng thái ôn tập SRS theo nguyên tắc Last-Write-Wins (ưu tiên lastReviewedAt gần nhất).
 */
export function mergeSrsState(
  localSrs: SrsState,
  cloudSrs: SrsState,
  baseSrs?: SrsState
): { state: SrsState; source: 'same' | 'local' | 'cloud' } {
  if (srsEqual(localSrs, cloudSrs)) {
    return { state: cloudSrs, source: 'same' };
  }

  if (baseSrs) {
    const localChanged = !srsEqual(localSrs, baseSrs);
    const cloudChanged = !srsEqual(cloudSrs, baseSrs);
    if (localChanged && !cloudChanged) {
      return { state: localSrs, source: 'local' };
    }
    if (!localChanged && cloudChanged) {
      return { state: cloudSrs, source: 'cloud' };
    }
  }

  const localReviewedAt = Number(localSrs.lastReviewedAt || 0);
  const cloudReviewedAt = Number(cloudSrs.lastReviewedAt || 0);

  if (localReviewedAt !== cloudReviewedAt) {
    return localReviewedAt > cloudReviewedAt
      ? { state: localSrs, source: 'local' }
      : { state: cloudSrs, source: 'cloud' };
  }

  const localReps = Number(localSrs.repetitions || 0);
  const cloudReps = Number(cloudSrs.repetitions || 0);
  if (localReps !== cloudReps) {
    return localReps > cloudReps
      ? { state: localSrs, source: 'local' }
      : { state: cloudSrs, source: 'cloud' };
  }

  return Number(localSrs.dueAt || 0) >= Number(cloudSrs.dueAt || 0)
    ? { state: localSrs, source: 'local' }
    : { state: cloudSrs, source: 'cloud' };
}

function folderMetaEqual(a: StudyFolder, b: StudyFolder): boolean {
  return (
    (a.parentId ?? null) === (b.parentId ?? null) &&
    a.name.trim() === b.name.trim() &&
    (a.description || '').trim() === (b.description || '').trim() &&
    Number(a.sortOrder || 0) === Number(b.sortOrder || 0) &&
    Boolean(a.isPublic) === Boolean(b.isPublic) &&
    (a.shareSlug || '') === (b.shareSlug || '')
  );
}

function arrEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

function kanjiFieldsEqual(a: FolderKanjiItem, b: FolderKanjiItem): boolean {
  return (
    a.folderId === b.folderId &&
    a.kanji === b.kanji &&
    (a.hanViet || '') === (b.hanViet || '') &&
    arrEqual(a.onReadings, b.onReadings) &&
    arrEqual(a.kunReadings, b.kunReadings) &&
    arrEqual(a.meanings, b.meanings) &&
    (a.strokeCount ?? null) === (b.strokeCount ?? null)
  );
}

function compoundFieldsEqual(a: CompoundWordCard, b: CompoundWordCard): boolean {
  return (
    a.word.trim() === b.word.trim() &&
    (a.reading || '').trim() === (b.reading || '').trim() &&
    (a.hanViet || '').trim() === (b.hanViet || '').trim() &&
    (a.meaning || '').trim() === (b.meaning || '').trim()
  );
}

function hasCompoundActivitySinceBase(
  item: FolderKanjiItem,
  baseItem: FolderKanjiItem | undefined
): boolean {
  const currentList = item.compoundWords || [];
  const baseList = baseItem?.compoundWords || [];
  if (currentList.length !== baseList.length) return true;
  const baseByWord = new Map(baseList.map((cw) => [cw.word.trim(), cw]));
  for (const cw of currentList) {
    const bw = baseByWord.get(cw.word.trim());
    if (!bw) return true;
    if (!compoundFieldsEqual(cw, bw) || !srsEqual(cw.srsState, bw.srsState)) {
      return true;
    }
  }
  return false;
}

function hasItemActivitySinceBase(
  item: FolderKanjiItem,
  baseItem: FolderKanjiItem | undefined
): boolean {
  if (!baseItem) return true;
  if (!kanjiFieldsEqual(item, baseItem)) return true;
  if (!srsEqual(item.srsState, baseItem.srsState)) return true;
  return hasCompoundActivitySinceBase(item, baseItem);
}

function mergeCompoundWordLists(
  baseWords: CompoundWordCard[] | undefined,
  localWords: CompoundWordCard[] | undefined,
  cloudWords: CompoundWordCard[] | undefined,
  deletedWordTombstones: DeletedCompoundTombstone[],
  stats: MergeSummaryStats
): CompoundWordCard[] {
  const bList = baseWords || [];
  const lList = localWords || [];
  const cList = cloudWords || [];

  const deletedWordSet = new Set(deletedWordTombstones.map((d) => d.word.trim()));
  const deletedWordIdSet = new Set(deletedWordTombstones.map((d) => d.wordId));

  // Match primarily by normalized word text so same compound added on both sides merges cleanly
  const bMap = new Map<string, CompoundWordCard>();
  bList.forEach((cw) => bMap.set(cw.word.trim(), cw));

  const lMap = new Map<string, CompoundWordCard>();
  lList.forEach((cw) => lMap.set(cw.word.trim(), cw));

  const cMap = new Map<string, CompoundWordCard>();
  cList.forEach((cw) => cMap.set(cw.word.trim(), cw));

  const allWords = new Set<string>([
    ...cList.map((w) => w.word.trim()),
    ...lList.map((w) => w.word.trim()),
    ...bList.map((w) => w.word.trim()),
  ]);

  const merged: CompoundWordCard[] = [];

  for (const wordKey of allWords) {
    if (!wordKey) continue;
    const b = bMap.get(wordKey);
    const l = lMap.get(wordKey);
    const c = cMap.get(wordKey);
    const locallyDeleted =
      deletedWordSet.has(wordKey) || (c ? deletedWordIdSet.has(c.id) : false);

    if (l && c) {
      // Both exist -> merge text fields (3-way / updatedAt) + SRS Last-Write-Wins
      let chosenMeta = c;
      if (b) {
        const lChanged = !compoundFieldsEqual(l, b);
        const cChanged = !compoundFieldsEqual(c, b);
        if (lChanged && !cChanged) {
          chosenMeta = l;
        } else if (lChanged && cChanged && !compoundFieldsEqual(l, c)) {
          chosenMeta = (l.updatedAt || 0) > (c.updatedAt || 0) ? l : c;
        }
      } else if (!compoundFieldsEqual(l, c)) {
        chosenMeta = (l.updatedAt || 0) > (c.updatedAt || 0) ? l : c;
      }

      const srsRes = mergeSrsState(l.srsState, c.srsState, b?.srsState);
      if (srsRes.source === 'cloud' && !srsEqual(l.srsState, c.srsState)) {
        stats.srsUpdatedFromCloud += 1;
      } else if (srsRes.source === 'local' && !srsEqual(l.srsState, c.srsState)) {
        stats.srsKeptFromLocal += 1;
      }

      merged.push({
        ...chosenMeta,
        id: c.id || l.id,
        srsState: srsRes.state,
        updatedAt: Math.max(l.updatedAt || 0, c.updatedAt || 0) || undefined,
      });
    } else if (l && !c) {
      if (b) {
        // Cloud deleted this compound word since base
        const localEdited =
          !compoundFieldsEqual(l, b) || !srsEqual(l.srsState, b.srsState);
        if (localEdited) {
          // Preserve locally edited/reviewed compound word safely
          merged.push(l);
        } else {
          stats.deletedCleanly += 1;
        }
      } else {
        // Added offline on Local
        merged.push(l);
      }
    } else if (!l && c) {
      if (locallyDeleted || b) {
        // Deleted locally since base
        const cloudEdited = b
          ? !compoundFieldsEqual(c, b) || !srsEqual(c.srsState, b.srsState)
          : false;
        if (cloudEdited) {
          // Cloud updated/reviewed it -> preserve safely
          merged.push(c);
          stats.srsUpdatedFromCloud += 1;
        } else {
          stats.deletedCleanly += 1;
        }
      } else {
        // Added on Cloud (another device)
        merged.push(c);
      }
    }
  }

  return merged;
}

function mergeTwoKanjiItems(
  baseItem: FolderKanjiItem | undefined,
  localItem: FolderKanjiItem,
  cloudItem: FolderKanjiItem,
  deletedCompoundKeys: DeletedCompoundTombstone[],
  stats: MergeSummaryStats
): FolderKanjiItem {
  let metaSource = cloudItem;
  if (baseItem) {
    const lChanged = !kanjiFieldsEqual(localItem, baseItem);
    const cChanged = !kanjiFieldsEqual(cloudItem, baseItem);
    if (lChanged && !cChanged) {
      metaSource = localItem;
    } else if (lChanged && cChanged && !kanjiFieldsEqual(localItem, cloudItem)) {
      metaSource =
        (localItem.updatedAt || localItem.createdAt || 0) >
        (cloudItem.updatedAt || cloudItem.createdAt || 0)
          ? localItem
          : cloudItem;
    }
  } else if (!kanjiFieldsEqual(localItem, cloudItem)) {
    metaSource =
      (localItem.updatedAt || localItem.createdAt || 0) >
      (cloudItem.updatedAt || cloudItem.createdAt || 0)
        ? localItem
        : cloudItem;
  }

  const srsRes = mergeSrsState(
    localItem.srsState,
    cloudItem.srsState,
    baseItem?.srsState
  );
  if (srsRes.source === 'cloud' && !srsEqual(localItem.srsState, cloudItem.srsState)) {
    stats.srsUpdatedFromCloud += 1;
  } else if (srsRes.source === 'local' && !srsEqual(localItem.srsState, cloudItem.srsState)) {
    stats.srsKeptFromLocal += 1;
  }

  const relevantTombstones = deletedCompoundKeys.filter(
    (d) => d.itemId === localItem.id || d.itemId === cloudItem.id
  );

  const mergedCompounds = mergeCompoundWordLists(
    baseItem?.compoundWords,
    localItem.compoundWords,
    cloudItem.compoundWords,
    relevantTombstones,
    stats
  );

  return {
    ...metaSource,
    id: cloudItem.id || localItem.id,
    folderId: metaSource.folderId,
    hanViet: metaSource.hanViet || localItem.hanViet || cloudItem.hanViet,
    onReadings:
      metaSource.onReadings?.length > 0
        ? metaSource.onReadings
        : localItem.onReadings?.length > 0
        ? localItem.onReadings
        : cloudItem.onReadings || [],
    kunReadings:
      metaSource.kunReadings?.length > 0
        ? metaSource.kunReadings
        : localItem.kunReadings?.length > 0
        ? localItem.kunReadings
        : cloudItem.kunReadings || [],
    meanings:
      metaSource.meanings?.length > 0
        ? metaSource.meanings
        : localItem.meanings?.length > 0
        ? localItem.meanings
        : cloudItem.meanings || [],
    strokeCount:
      metaSource.strokeCount ?? localItem.strokeCount ?? cloudItem.strokeCount,
    srsState: srsRes.state,
    compoundWords: mergedCompounds,
    createdAt: Math.min(
      localItem.createdAt || Date.now(),
      cloudItem.createdAt || Date.now()
    ),
    updatedAt:
      Math.max(localItem.updatedAt || 0, cloudItem.updatedAt || 0) || undefined,
  };
}

/**
 * Thực hiện gộp 3 chiều (Git-Style 3-Way Merge) cho toàn bộ cây thư mục, chữ Kanji,
 * từ ghép và trạng thái SRS. Tự động gộp các phần không đụng độ và chỉ tách riêng
 * các mục đụng độ thực sự (Delete-vs-Edit) để hỏi người dùng.
 */
export function threeWayMergeDecks(input: ThreeWayMergeInput): ThreeWayMergeResult {
  const { base, local, cloud, tombstones } = input;

  const stats: MergeSummaryStats = {
    addedFromCloud: 0,
    addedFromLocal: 0,
    srsUpdatedFromCloud: 0,
    srsKeptFromLocal: 0,
    deletedCleanly: 0,
  };

  const baseFolders = base?.folders || [];
  const baseItems = base?.items || [];

  const deletedFolderMap = new Map(tombstones.deletedFolderIds.map((d) => [d.id, d]));
  const deletedItemMap = new Map(tombstones.deletedItemIds.map((d) => [d.id, d]));

  // When base is null (no previous baseline snapshot), match newly-created / unlinked
  // folders with the exact same (parentId, lowercase name) onto Cloud IDs so devices
  // that created the same folder offline don't duplicate folders.
  const folderIdRemap = new Map<string, string>();
  if (!base) {
    const cloudByParentAndName = new Map<string, StudyFolder>();
    const mapFolderKey = (parentId: string | null, name: string) =>
      `${parentId || '__ROOT__'}::${name.trim().toLowerCase()}`;

    const remapParent = (pid: string | null): string | null =>
      pid ? folderIdRemap.get(pid) || pid : null;

    // Resolve top-down (roots first, then descendants)
    const remainingLocal = [...local.folders];
    const cloudIdSet = new Set(cloud.folders.map((f) => f.id));
    cloud.folders.forEach((cf) => {
      cloudByParentAndName.set(mapFolderKey(cf.parentId ?? null, cf.name), cf);
    });

    let progressed = true;
    const processed = new Set<string>();
    while (progressed) {
      progressed = false;
      for (const lf of remainingLocal) {
        if (processed.has(lf.id)) continue;
        if (cloudIdSet.has(lf.id)) {
          processed.add(lf.id);
          progressed = true;
          continue;
        }
        const parentResolved =
          lf.parentId === null ||
          processed.has(lf.parentId) ||
          cloudIdSet.has(lf.parentId);
        if (!parentResolved) continue;

        const mappedParent = remapParent(lf.parentId ?? null);
        const match = cloudByParentAndName.get(mapFolderKey(mappedParent, lf.name));
        if (match && !local.folders.some((x) => x.id === match.id)) {
          folderIdRemap.set(lf.id, match.id);
        }
        processed.add(lf.id);
        progressed = true;
      }
    }
  }

  const normalizedLocalFolders = local.folders.map((lf) => ({
    ...lf,
    id: folderIdRemap.get(lf.id) || lf.id,
    parentId: lf.parentId ? folderIdRemap.get(lf.parentId) || lf.parentId : null,
  }));

  const normalizedLocalItems = local.items.map((it) => ({
    ...it,
    folderId: folderIdRemap.get(it.folderId) || it.folderId,
  }));

  const bFolderMap = new Map(baseFolders.map((f) => [f.id, f]));
  const lFolderMap = new Map(normalizedLocalFolders.map((f) => [f.id, f]));
  const cFolderMap = new Map(cloud.folders.map((f) => [f.id, f]));

  const bItemMap = new Map(baseItems.map((it) => [it.id, it]));
  const lItemMap = new Map(normalizedLocalItems.map((it) => [it.id, it]));
  const cItemMap = new Map(cloud.items.map((it) => [it.id, it]));

  const folderIds = new Set<string>([
    ...cloud.folders.map((f) => f.id),
    ...normalizedLocalFolders.map((f) => f.id),
    ...baseFolders.map((f) => f.id),
  ]);

  const mergedFolders: StudyFolder[] = [];
  const deletedFolderIdsToPush: DeletedTombstone[] = [];
  const deletedItemIdsToPush: DeletedTombstone[] = [];
  const collisions: SyncCollisionItem[] = [];
  const collisionFolderIds = new Set<string>();

  // Pre-compute items grouped by folderId to detect changes inside a deleted folder
  const itemsInFolderLocal = new Map<string, FolderKanjiItem[]>();
  normalizedLocalItems.forEach((it) => {
    const arr = itemsInFolderLocal.get(it.folderId) || [];
    arr.push(it);
    itemsInFolderLocal.set(it.folderId, arr);
  });

  const itemsInFolderCloud = new Map<string, FolderKanjiItem[]>();
  cloud.items.forEach((it) => {
    const arr = itemsInFolderCloud.get(it.folderId) || [];
    arr.push(it);
    itemsInFolderCloud.set(it.folderId, arr);
  });

  const didLocalModifyInsideFolder = (folderId: string): boolean => {
    const lCards = itemsInFolderLocal.get(folderId) || [];
    for (const lc of lCards) {
      if (hasItemActivitySinceBase(lc, bItemMap.get(lc.id))) return true;
    }
    return false;
  };

  const didCloudModifyInsideFolder = (folderId: string): boolean => {
    const cCards = itemsInFolderCloud.get(folderId) || [];
    for (const cc of cCards) {
      if (hasItemActivitySinceBase(cc, bItemMap.get(cc.id))) return true;
    }
    return false;
  };

  // 1. Merge Folders
  for (const fid of folderIds) {
    const b = bFolderMap.get(fid);
    const l = lFolderMap.get(fid);
    const c = cFolderMap.get(fid);
    const deletedLocally = deletedFolderMap.has(fid);

    if (l && c) {
      let chosen = c;
      if (b) {
        const lChanged = !folderMetaEqual(l, b);
        const cChanged = !folderMetaEqual(c, b);
        if (lChanged && !cChanged) {
          chosen = l;
        } else if (lChanged && cChanged && !folderMetaEqual(l, c)) {
          chosen = (l.updatedAt || 0) > (c.updatedAt || 0) ? l : c;
        }
      } else if (!folderMetaEqual(l, c)) {
        chosen = (l.updatedAt || 0) > (c.updatedAt || 0) ? l : c;
      }
      mergedFolders.push(chosen);
    } else if (l && !c) {
      if (b) {
        // Folder existed in common ancestor, removed on Cloud
        const localTouchedFolder =
          !folderMetaEqual(l, b) || didLocalModifyInsideFolder(fid);
        if (localTouchedFolder) {
          collisionFolderIds.add(fid);
          collisions.push({
            key: `folder:${fid}`,
            entityType: 'folder',
            id: fid,
            label: `Thư mục "${l.name}"`,
            subLabel: `${(itemsInFolderLocal.get(fid) || []).length} chữ Kanji trên máy`,
            collisionType: 'deleted_cloud_modified_locally',
            localDescription: 'Máy này có thêm/sửa thẻ hoặc vừa cập nhật thư mục.',
            cloudDescription: 'Thiết bị khác đã xóa thư mục này khỏi Cloud.',
            keepCandidateFolder: l,
          });
        } else {
          stats.deletedCleanly += 1;
        }
      } else {
        // Newly created offline on Local
        mergedFolders.push(l);
        stats.addedFromLocal += 1;
      }
    } else if (!l && c) {
      if (deletedLocally || b) {
        // Folder existed in common ancestor or marked deleted locally
        const cloudTouchedFolder = b
          ? !folderMetaEqual(c, b) || didCloudModifyInsideFolder(fid)
          : didCloudModifyInsideFolder(fid);
        if (cloudTouchedFolder) {
          collisionFolderIds.add(fid);
          collisions.push({
            key: `folder:${fid}`,
            entityType: 'folder',
            id: fid,
            label: `Thư mục "${c.name}"`,
            subLabel: `${(itemsInFolderCloud.get(fid) || []).length} chữ Kanji trên Cloud`,
            collisionType: 'deleted_locally_modified_cloud',
            localDescription: 'Bạn đã xóa thư mục này trên máy.',
            cloudDescription: 'Thiết bị khác đã thêm/sửa hoặc ôn tập thẻ bên trong.',
            keepCandidateFolder: c,
          });
        } else {
          deletedFolderIdsToPush.push(
            deletedFolderMap.get(fid) || { id: fid, deletedAt: Date.now() }
          );
          stats.deletedCleanly += 1;
        }
      } else {
        // Newly created on Cloud (other device)
        mergedFolders.push(c);
        stats.addedFromCloud += 1;
      }
    }
  }

  // Ensure valid folder tree (break cycles, lift orphan child folders if parent deleted)
  const survivingFolderIds = new Set(mergedFolders.map((f) => f.id));
  const sanitizedFolders = mergedFolders.map((f) => {
    const parentId =
      f.parentId && f.parentId !== f.id && survivingFolderIds.has(f.parentId)
        ? f.parentId
        : null;
    return { ...f, parentId };
  });

  // 2. Merge Kanji Items
  // Detect newly created items on both sides with same (folderId, kanji) but different IDs
  const matchedLocalIds = new Set<string>();
  const localNewByFolderAndKanji = new Map<string, FolderKanjiItem>();
  for (const lf of normalizedLocalItems) {
    if (!cItemMap.has(lf.id) && !bItemMap.has(lf.id)) {
      localNewByFolderAndKanji.set(`${lf.folderId}::${lf.kanji}`, lf);
    }
  }

  const pairedCloudWithLocal = new Map<string, FolderKanjiItem>();
  for (const ci of cloud.items) {
    if (!lItemMap.has(ci.id) && !bItemMap.has(ci.id)) {
      const localMatch = localNewByFolderAndKanji.get(`${ci.folderId}::${ci.kanji}`);
      if (localMatch) {
        pairedCloudWithLocal.set(ci.id, localMatch);
        matchedLocalIds.add(localMatch.id);
      }
    }
  }

  const itemIds = new Set<string>([
    ...cloud.items.map((it) => it.id),
    ...normalizedLocalItems.map((it) => it.id),
    ...baseItems.map((it) => it.id),
  ]);

  const mergedItems: FolderKanjiItem[] = [];
  const folderNameLookup = new Map<string, string>();
  sanitizedFolders.forEach((f) => folderNameLookup.set(f.id, f.name));
  normalizedLocalFolders.forEach((f) => {
    if (!folderNameLookup.has(f.id)) folderNameLookup.set(f.id, f.name);
  });
  cloud.folders.forEach((f) => {
    if (!folderNameLookup.has(f.id)) folderNameLookup.set(f.id, f.name);
  });

  for (const itemId of itemIds) {
    if (matchedLocalIds.has(itemId)) {
      // Already merged into its paired cloud item below
      continue;
    }

    const b = bItemMap.get(itemId);
    const l = lItemMap.get(itemId) || pairedCloudWithLocal.get(itemId);
    const c = cItemMap.get(itemId);
    const deletedLocally = deletedItemMap.has(itemId);

    if (l && c) {
      const mergedItem = mergeTwoKanjiItems(
        b,
        l,
        c,
        tombstones.deletedCompoundKeys,
        stats
      );
      if (survivingFolderIds.has(mergedItem.folderId)) {
        mergedItems.push(mergedItem);
      } else if (collisionFolderIds.has(mergedItem.folderId)) {
        // Keep provisionally inside folder collision handling
        mergedItems.push(mergedItem);
      }
    } else if (l && !c) {
      if (b) {
        // Existed in base, removed from Cloud
        if (collisionFolderIds.has(l.folderId)) {
          // Parent folder itself is already flagged as a collision; preserve card if folder is kept
          mergedItems.push(l);
        } else if (hasItemActivitySinceBase(l, b)) {
          collisions.push({
            key: `kanji:${l.id}`,
            entityType: 'kanji',
            id: l.id,
            label: `Chữ ${l.kanji}${l.hanViet ? ` (${l.hanViet})` : ''}`,
            subLabel: folderNameLookup.get(l.folderId) || 'Thư mục',
            collisionType: 'deleted_cloud_modified_locally',
            localDescription: 'Máy này vừa sửa, thêm từ ghép hoặc ôn tập chữ này.',
            cloudDescription: 'Thiết bị khác đã xóa chữ này khỏi Cloud.',
            keepCandidateItem: l,
          });
        } else {
          stats.deletedCleanly += 1;
        }
      } else {
        // Newly added offline on Local
        if (survivingFolderIds.has(l.folderId) || collisionFolderIds.has(l.folderId)) {
          mergedItems.push(l);
          stats.addedFromLocal += 1;
        }
      }
    } else if (!l && c) {
      if (deletedLocally || b) {
        if (collisionFolderIds.has(c.folderId)) {
          mergedItems.push(c);
        } else {
          const cloudModified = b ? hasItemActivitySinceBase(c, b) : false;
          if (cloudModified) {
            collisions.push({
              key: `kanji:${c.id}`,
              entityType: 'kanji',
              id: c.id,
              label: `Chữ ${c.kanji}${c.hanViet ? ` (${c.hanViet})` : ''}`,
              subLabel: folderNameLookup.get(c.folderId) || 'Thư mục',
              collisionType: 'deleted_locally_modified_cloud',
              localDescription: 'Bạn đã xóa chữ Kanji này trên máy.',
              cloudDescription: 'Thiết bị khác vừa cập nhật hoặc ôn tập chữ này.',
              keepCandidateItem: c,
            });
          } else {
            deletedItemIdsToPush.push(
              deletedItemMap.get(itemId) || { id: itemId, deletedAt: Date.now() }
            );
            stats.deletedCleanly += 1;
          }
        }
      } else {
        // Newly added on Cloud (e.g., from phone!)
        if (survivingFolderIds.has(c.folderId) || collisionFolderIds.has(c.folderId)) {
          mergedItems.push(c);
          stats.addedFromCloud += 1;
        }
      }
    }
  }

  return {
    folders: sanitizedFolders,
    items: mergedItems,
    deletedFolderIdsToPush,
    deletedItemIdsToPush,
    collisions,
    stats,
  };
}

/**
 * Áp dụng lựa chọn giải quyết đụng độ của người dùng ('keep' | 'delete') lên bản nháp gộp.
 */
export function applyCollisionResolutions(
  draft: PendingMergeDraft,
  collisions: SyncCollisionItem[],
  resolutions: Record<string, 'keep' | 'delete'>
): {
  folders: StudyFolder[];
  items: FolderKanjiItem[];
  deletedFolderIds: DeletedTombstone[];
  deletedItemIds: DeletedTombstone[];
} {
  const now = Date.now();
  const folders = [...draft.folders];
  const items = [...draft.items];
  const deletedFolderIds = [...draft.deletedFolderIds];
  const deletedItemIds = [...draft.deletedItemIds];

  const deletedFolderIdSet = new Set<string>(deletedFolderIds.map((d) => d.id));

  for (const col of collisions) {
    const choice = resolutions[col.key] || 'keep';

    if (col.entityType === 'folder') {
      if (choice === 'keep' && col.keepCandidateFolder) {
        if (!folders.some((f) => f.id === col.id)) {
          folders.push(col.keepCandidateFolder);
        }
      } else {
        deletedFolderIdSet.add(col.id);
        if (!deletedFolderIds.some((d) => d.id === col.id)) {
          deletedFolderIds.push({ id: col.id, deletedAt: now });
        }
      }
    } else if (col.entityType === 'kanji') {
      if (choice === 'keep' && col.keepCandidateItem) {
        if (!items.some((it) => it.id === col.id)) {
          items.push(col.keepCandidateItem);
        }
      } else {
        if (!deletedItemIds.some((d) => d.id === col.id)) {
          deletedItemIds.push({ id: col.id, deletedAt: now });
        }
      }
    }
  }

  const validFolderIds = new Set(
    folders.filter((f) => !deletedFolderIdSet.has(f.id)).map((f) => f.id)
  );

  const finalFolders = folders
    .filter((f) => validFolderIds.has(f.id))
    .map((f) => ({
      ...f,
      parentId:
        f.parentId && f.parentId !== f.id && validFolderIds.has(f.parentId)
          ? f.parentId
          : null,
    }));

  const deletedItemSet = new Set(deletedItemIds.map((d) => d.id));
  const finalItems = items.filter(
    (it) => validFolderIds.has(it.folderId) && !deletedItemSet.has(it.id)
  );

  return {
    folders: finalFolders,
    items: finalItems,
    deletedFolderIds,
    deletedItemIds,
  };
}
