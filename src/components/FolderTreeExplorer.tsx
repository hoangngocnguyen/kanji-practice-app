import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Folder,
  FolderOpen,
  Play,
  Search,
  X,
} from 'lucide-react';
import { FolderKanjiItem, StudyFolder } from '../types/deck';
import { buildFolderTreeIndex, doesKanjiItemMatchQuery } from '../utils/folderTree';

interface FolderTreeExplorerProps {
  folders: StudyFolder[];
  items: FolderKanjiItem[];
  rootFolderId?: string;
  selectedFolderId?: string | null;
  onSelectFolder: (folderId: string) => void;
  onPracticeFolder?: (folderId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const FolderTreeExplorer: React.FC<FolderTreeExplorerProps> = ({
  folders,
  items,
  rootFolderId,
  selectedFolderId,
  onSelectFolder,
  onPracticeFolder,
  searchQuery,
  onSearchQueryChange,
}) => {
  const tree = useMemo(
    () => buildFolderTreeIndex(folders, items, rootFolderId),
    [folders, items, rootFolderId]
  );

  // Default: expand root level folders so visitors immediately see sub-lessons
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const root of tree.rootFolders) {
      initial[root.id] = true;
    }
    return initial;
  });

  // Reset default expansion when the root folder changes (e.g. navigating between shared links)
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const root of tree.rootFolders) {
      initial[root.id] = true;
    }
    setExpandedIds(initial);
  }, [rootFolderId, tree.rootFolders]);

  const collapsibleFolderIds = useMemo(
    () =>
      folders
        .filter((f) => tree.getChildren(f.id).length > 0)
        .map((f) => f.id),
    [folders, tree]
  );

  const allExpanded =
    collapsibleFolderIds.length > 0 &&
    collapsibleFolderIds.every((id) => Boolean(expandedIds[id]));

  const toggleExpand = (folderId: string) => {
    setExpandedIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleToggleExpandAll = () => {
    if (allExpanded) {
      // Collapse back to root-only view if >1 collapsible folder, otherwise collapse all
      const next: Record<string, boolean> = {};
      if (collapsibleFolderIds.length > 1) {
        for (const root of tree.rootFolders) {
          next[root.id] = true;
        }
      }
      setExpandedIds(next);
    } else {
      const next: Record<string, boolean> = {};
      for (const id of collapsibleFolderIds) {
        next[id] = true;
      }
      setExpandedIds(next);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return null;

    const totalItemMatches = items.filter((it) =>
      doesKanjiItemMatchQuery(it, normalizedQuery)
    ).length;

    const matchingFolders: Array<{
      folder: StudyFolder;
      nameMatched: boolean;
      matchedItemCount: number;
      pathLabel: string;
    }> = [];

    for (const folder of folders) {
      const nameMatched =
        folder.name.toLowerCase().includes(normalizedQuery) ||
        (folder.description || '').toLowerCase().includes(normalizedQuery);
      const recursiveItems = tree.getItemsRecursive(folder.id);
      const matchedItemCount = recursiveItems.filter((it) =>
        doesKanjiItemMatchQuery(it, normalizedQuery)
      ).length;

      if (nameMatched || matchedItemCount > 0) {
        const path = tree.getFolderPath(folder.id);
        const pathLabel =
          path.length > 1
            ? path
                .slice(0, -1)
                .map((p) => p.name)
                .join(' › ')
            : '';
        matchingFolders.push({
          folder,
          nameMatched,
          matchedItemCount,
          pathLabel,
        });
      }
    }

    return { totalItemMatches, matchingFolders };
  }, [normalizedQuery, folders, items, tree]);

  const renderFolderRow = (folder: StudyFolder, depth = 0) => {
    const children = tree.getChildren(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = Boolean(expandedIds[folder.id]);
    const isSelected = selectedFolderId === folder.id;
    const stats = tree.getFolderStats(folder.id);

    return (
      <div key={folder.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectFolder(folder.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectFolder(folder.id);
            } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
              e.preventDefault();
              setExpandedIds((prev) => ({ ...prev, [folder.id]: true }));
            } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
              e.preventDefault();
              setExpandedIds((prev) => ({ ...prev, [folder.id]: false }));
            }
          }}
          className={`group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
            isSelected
              ? 'bg-teal-50/85'
              : 'hover:bg-slate-50/90'
          }`}
          style={{ paddingLeft: `${depth * 22 + 12}px` }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              tabIndex={hasChildren ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpand(folder.id);
              }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                hasChildren
                  ? 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 cursor-pointer'
                  : 'text-transparent pointer-events-none'
              }`}
              aria-label={isExpanded ? `Thu gọn ${folder.name}` : `Mở rộng ${folder.name}`}
              aria-hidden={!hasChildren}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'bg-teal-100/90 border-teal-300 text-teal-800'
                  : 'bg-teal-50/75 border-teal-100 text-teal-700'
              }`}
            >
              {isExpanded && hasChildren ? (
                <FolderOpen className="w-4 h-4" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-semibold transition-colors truncate ${
                  isSelected
                    ? 'text-teal-900'
                    : 'text-slate-900 group-hover:text-teal-800'
                }`}
              >
                {folder.name}
              </div>

              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums mt-0.5">
                <span>{stats.kanjiCount} chữ Kanji</span>
                <span aria-hidden="true">·</span>
                <span>{stats.flashcardCount} thẻ Flashcard</span>
                {hasChildren && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{children.length} thư mục con</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {stats.flashcardCount > 0 && onPracticeFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPracticeFolder(folder.id);
              }}
              className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
              title={`Ôn Flashcard thư mục ${folder.name}`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Ôn ({stats.flashcardCount})</span>
              <span className="sm:hidden">Ôn</span>
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {children.map((child) => renderFolderRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const mainRootId = rootFolderId || tree.rootFolders[0]?.id || '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
      {/* Top Toolbar: Quick Search & Expand/Collapse */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 min-w-0 bg-slate-50 focus-within:bg-white border border-slate-200 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/15 rounded-xl px-3 min-h-[42px] transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Tìm nhanh thư mục, chữ Kanji, Hán-Việt hoặc nghĩa..."
            className="flex-1 min-w-0 text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer shrink-0"
              aria-label="Xóa từ khóa tìm kiếm"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {collapsibleFolderIds.length > 0 && !normalizedQuery && (
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="px-3 py-2 min-h-[42px] text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Thu gọn nhánh</span>
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-teal-700" />
                <span>Mở rộng tất cả</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Folder Tree or Search Matches */}
      {searchResults ? (
        <div className="divide-y divide-slate-100">
          <div className="px-4 py-2.5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span className="tabular-nums">
              Tìm thấy <strong className="text-slate-900">{searchResults.matchingFolders.length}</strong> thư mục
              {searchResults.totalItemMatches > 0 && (
                <>
                  {' '}·{' '}
                  <strong className="text-teal-800">{searchResults.totalItemMatches}</strong> chữ Kanji khớp
                </>
              )}
            </span>
            {mainRootId && selectedFolderId !== mainRootId && (
              <button
                type="button"
                onClick={() => onSelectFolder(mainRootId)}
                className="font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
              >
                Xem tất cả kết quả
              </button>
            )}
          </div>

          {searchResults.matchingFolders.length > 0 ? (
            searchResults.matchingFolders.map(
              ({ folder, matchedItemCount, pathLabel }) => {
                const stats = tree.getFolderStats(folder.id);
                const isSelected = selectedFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectFolder(folder.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectFolder(folder.id);
                      }
                    }}
                    className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-teal-50/85' : 'hover:bg-slate-50/90'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-teal-100/90 border-teal-300 text-teal-800'
                            : 'bg-teal-50/75 border-teal-100 text-teal-700'
                        }`}
                      >
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {pathLabel && (
                          <div className="text-[11px] text-slate-400 truncate">
                            {pathLabel}
                          </div>
                        )}
                        <div
                          className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-teal-900' : 'text-slate-900'
                          }`}
                        >
                          {folder.name}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums mt-0.5">
                          <span>{stats.kanjiCount} chữ Kanji</span>
                          {matchedItemCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-teal-700 font-semibold">
                                Khớp {matchedItemCount} chữ
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {stats.flashcardCount > 0 && onPracticeFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPracticeFolder(folder.id);
                        }}
                        className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Ôn ({stats.flashcardCount})</span>
                      </button>
                    )}
                  </div>
                );
              }
            )
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                Không tìm thấy thư mục hay chữ Kanji nào khớp &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {tree.rootFolders.map((root) => renderFolderRow(root, 0))}
        </div>
      )}

      {!searchResults && tree.rootFolders.length > 0 && (
        <div className="hidden sm:flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500">
          <span>
            Nhấn vào thư mục để xem danh sách Kanji · Nhấn mũi tên để đóng/mở thư mục con
          </span>
        </div>
      )}
    </div>
  );
};
