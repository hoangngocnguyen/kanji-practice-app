import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudDownload,
  Folder,
  FolderOpen,
  GitCompare,
  Laptop,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useDecks } from '../../context/DeckContext';
import {
  computeSyncDiff,
  DiffFolderEntry,
  DiffStatus,
} from '../../services/syncService';
import { FolderKanjiItem, StudyFolder } from '../../types/deck';

function formatInspectorTime(ts: number | null | undefined): string {
  if (!ts) return 'Chưa từng đồng bộ';
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const STATUS_META: Record<
  DiffStatus,
  {
    label: string;
    shortLabel: string;
    rowClass: string;
    badgeClass: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  local_only: {
    label: 'Chỉ có trên Máy',
    shortLabel: 'Chỉ trên Máy',
    rowClass: 'bg-sky-50/40',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: Laptop,
  },
  cloud_only: {
    label: 'Chỉ có trên Cloud',
    shortLabel: 'Chỉ trên Cloud',
    rowClass: 'bg-amber-50/45',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: CloudDownload,
  },
  modified: {
    label: 'Khác nội dung / SRS',
    shortLabel: 'Khác biệt',
    rowClass: 'bg-violet-50/35',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
    icon: GitCompare,
  },
  matched: {
    label: 'Khớp 100%',
    shortLabel: 'Khớp',
    rowClass: 'bg-white',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
};

export const CloudInspectorModal: React.FC = () => {
  const {
    folders: localFolders,
    items: localItems,
    isCloudInspectorOpen,
    cloudSnapshot,
    isLoadingCloudSnapshot,
    cloudSnapshotError,
    refreshCloudSnapshot,
    closeCloudInspector,
    syncConflict,
  } = useDecks();

  const [activeTab, setActiveTab] = useState<'diff' | 'cloud_tree'>('diff');
  const [diffFilter, setDiffFilter] = useState<'all' | DiffStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDiffIds, setExpandedDiffIds] = useState<Record<string, boolean>>({});
  const [expandedCloudIds, setExpandedCloudIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isCloudInspectorOpen) return;
    setActiveTab(syncConflict ? 'diff' : 'diff');
    setDiffFilter('all');
    setSearchQuery('');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCloudInspector();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCloudInspectorOpen, syncConflict, closeCloudInspector]);

  const diffReport = useMemo(() => {
    if (!cloudSnapshot) return null;
    return computeSyncDiff(
      localFolders,
      localItems,
      cloudSnapshot.folders,
      cloudSnapshot.items
    );
  }, [localFolders, localItems, cloudSnapshot]);

  // Auto-expand folders with differences when snapshot loads
  useEffect(() => {
    if (!diffReport) return;
    const autoExpand: Record<string, boolean> = {};
    let count = 0;
    for (const fd of diffReport.folderDiffs) {
      if (fd.status !== 'matched' && count < 4) {
        autoExpand[fd.id] = true;
        count += 1;
      }
    }
    setExpandedDiffIds(autoExpand);
  }, [diffReport]);

  // Auto-expand root Cloud folders in tree view
  useEffect(() => {
    if (!cloudSnapshot) return;
    const roots: Record<string, boolean> = {};
    cloudSnapshot.folders
      .filter((f) => f.parentId === null)
      .forEach((f) => {
        roots[f.id] = true;
      });
    setExpandedCloudIds(roots);
  }, [cloudSnapshot]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredDiffFolders = useMemo(() => {
    if (!diffReport) return [];
    return diffReport.folderDiffs.filter((fd) => {
      if (diffFilter !== 'all' && fd.status !== diffFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      if (fd.pathLabel.toLowerCase().includes(normalizedQuery)) return true;
      return fd.cardDiffs.some(
        (c) =>
          c.kanji.toLowerCase().includes(normalizedQuery) ||
          c.hanViet.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [diffReport, diffFilter, normalizedQuery]);

  const cloudStats = useMemo(() => {
    if (!cloudSnapshot) return { deckCount: 0, cardCount: 0, compoundCount: 0 };
    const compoundCount = cloudSnapshot.items.reduce(
      (sum, it) => sum + (it.compoundWords?.length || 0),
      0
    );
    return {
      deckCount: cloudSnapshot.folders.length,
      cardCount: cloudSnapshot.items.length,
      compoundCount,
    };
  }, [cloudSnapshot]);

  const cloudItemsByFolder = useMemo(() => {
    const map = new Map<string, FolderKanjiItem[]>();
    if (!cloudSnapshot) return map;
    for (const item of cloudSnapshot.items) {
      const list = map.get(item.folderId) || [];
      list.push(item);
      map.set(item.folderId, list);
    }
    return map;
  }, [cloudSnapshot]);

  const matchingCloudFolders = useMemo(() => {
    if (!cloudSnapshot || !normalizedQuery) return null;
    return cloudSnapshot.folders.filter((f) => {
      if (f.name.toLowerCase().includes(normalizedQuery)) return true;
      const folderItems = cloudItemsByFolder.get(f.id) || [];
      return folderItems.some(
        (it) =>
          it.kanji.toLowerCase().includes(normalizedQuery) ||
          (it.hanViet || '').toLowerCase().includes(normalizedQuery) ||
          (it.meanings || []).some((m) => m.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [cloudSnapshot, normalizedQuery, cloudItemsByFolder]);

  if (!isCloudInspectorOpen) return null;

  const renderDiffFolderRow = (fd: DiffFolderEntry) => {
    const isExpanded = Boolean(expandedDiffIds[fd.id]);
    const meta = STATUS_META[fd.status];
    const StatusIcon = meta.icon;

    const visibleCards = normalizedQuery
      ? fd.cardDiffs.filter(
          (c) =>
            fd.pathLabel.toLowerCase().includes(normalizedQuery) ||
            c.kanji.toLowerCase().includes(normalizedQuery) ||
            c.hanViet.toLowerCase().includes(normalizedQuery)
        )
      : fd.cardDiffs;

    return (
      <div key={fd.id} className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() =>
            setExpandedDiffIds((prev) => ({ ...prev, [fd.id]: !prev[fd.id] }))
          }
          className={`w-full px-4 py-3 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors hover:bg-slate-50/80 cursor-pointer ${meta.rowClass}`}
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <span className="p-0.5 text-slate-400 shrink-0 mt-0.5 sm:mt-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
            <Folder className="w-4 h-4 text-teal-700 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {fd.pathLabel}
              </div>
              {fd.nameConflictHint && (
                <div className="text-[11px] text-amber-700 mt-0.5">
                  Lưu ý: {fd.nameConflictHint}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0 pl-7 sm:pl-0">
            <div className="text-[11px] text-slate-600 tabular-nums flex items-center gap-2">
              <span>
                Máy: <strong className="text-slate-900">{fd.localCardCount}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Cloud: <strong className="text-slate-900">{fd.cloudCardCount}</strong>
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold border rounded-md whitespace-nowrap ${meta.badgeClass}`}
            >
              <StatusIcon className="w-3 h-3 shrink-0" />
              <span>{meta.shortLabel}</span>
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-200 bg-white divide-y divide-slate-100">
            {visibleCards.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">
                Thư mục này chưa có chữ Kanji nào.
              </div>
            ) : (
              visibleCards.map((card) => {
                const cMeta = STATUS_META[card.status];
                const CardIcon = cMeta.icon;
                return (
                  <div
                    key={card.id}
                    className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-japanese text-base font-bold flex items-center justify-center shrink-0">
                        {card.kanji}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {card.hanViet || 'Chưa có Hán Việt'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {card.changeDetails.length > 0
                            ? card.changeDetails.join(' · ')
                            : 'Nội dung và tiến độ SRS khớp nhau'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-11 sm:pl-0 tabular-nums">
                      <span className="text-[11px] text-slate-500">
                        Từ ghép: {card.localCompoundCount} / {card.cloudCompoundCount}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold border rounded-md whitespace-nowrap ${cMeta.badgeClass}`}
                      >
                        <CardIcon className="w-3 h-3 shrink-0" />
                        <span>{cMeta.shortLabel}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCloudTreeFolder = (folder: StudyFolder, depth = 0) => {
    if (!cloudSnapshot) return null;
    const children = cloudSnapshot.folders
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const folderItems = cloudItemsByFolder.get(folder.id) || [];
    const isExpanded = Boolean(expandedCloudIds[folder.id]);
    const hasChildrenOrItems = children.length > 0 || folderItems.length > 0;

    return (
      <div key={folder.id}>
        <div
          onClick={() =>
            setExpandedCloudIds((prev) => ({
              ...prev,
              [folder.id]: !prev[folder.id],
            }))
          }
          style={{ paddingLeft: `${depth * 20 + 14}px` }}
          className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-0.5 text-slate-400 shrink-0">
              {hasChildrenOrItems ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <span className="w-4 h-4 inline-block" />
              )}
            </span>
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-teal-700 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-teal-700 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
              {folder.name}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 tabular-nums shrink-0">
            <span>{folderItems.length} chữ Kanji</span>
            {children.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{children.length} bài con</span>
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="divide-y divide-slate-100">
            {folderItems.length > 0 && (
              <div
                style={{ paddingLeft: `${depth * 20 + 44}px` }}
                className="pr-4 py-2 bg-slate-50/60 flex flex-wrap gap-2"
              >
                {folderItems.map((it) => (
                  <div
                    key={it.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <span className="font-japanese text-sm font-bold text-slate-900">
                      {it.kanji}
                    </span>
                    <span className="text-slate-700 font-medium">
                      {it.hanViet || '—'}
                    </span>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      · {it.compoundWords?.length || 0} từ · Ôn {it.srsState?.repetitions || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!matchingCloudFolders &&
              children.map((child) => renderCloudTreeFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootCloudFolders = cloudSnapshot
    ? cloudSnapshot.folders
        .filter((f) => f.parentId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={closeCloudInspector}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">
                Kiểm tra dữ liệu trên Cloud
              </h3>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                <span>
                  Phiên bản Cloud:{' '}
                  <strong className="text-slate-800">
                    v{cloudSnapshot?.syncVersion ?? 0}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>{cloudStats.deckCount} thư mục</span>
                <span aria-hidden="true">·</span>
                <span>{cloudStats.cardCount} chữ Kanji</span>
                <span aria-hidden="true">·</span>
                <span>{cloudStats.compoundCount} từ ghép</span>
                {cloudSnapshot?.syncedAt ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Cập nhật {formatInspectorTime(cloudSnapshot.syncedAt)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isLoadingCloudSnapshot}
              onClick={() => refreshCloudSnapshot()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoadingCloudSnapshot ? 'animate-spin text-teal-700' : ''
                }`}
              />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              type="button"
              onClick={closeCloudInspector}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isLoadingCloudSnapshot && !cloudSnapshot ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
              <span className="text-xs sm:text-sm">
                Đang tải bản dữ liệu hiện có trên Cloud...
              </span>
            </div>
          ) : cloudSnapshotError ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{cloudSnapshotError}</span>
              </div>
              <button
                type="button"
                onClick={() => refreshCloudSnapshot()}
                className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg font-semibold hover:bg-rose-100 cursor-pointer shrink-0"
              >
                Thử lại
              </button>
            </div>
          ) : cloudSnapshot && diffReport ? (
            <>
              {/* Diff Summary Banner */}
              {diffReport.isExactMatch ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Khớp 100%:</strong> Bộ thẻ trên máy và trên Cloud đang
                    giống hệt nhau, không có dữ liệu bị thiếu hay sai lệch.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Phát hiện chênh lệch giữa Máy và Cloud</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 tabular-nums">
                    <span>
                      Chỉ có trên Máy:{' '}
                      <strong className="text-sky-800">
                        {diffReport.folderStats.localOnly} thư mục ·{' '}
                        {diffReport.cardStats.localOnly} Kanji
                      </strong>
                    </span>
                    <span>
                      Chỉ có trên Cloud:{' '}
                      <strong className="text-amber-800">
                        {diffReport.folderStats.cloudOnly} thư mục ·{' '}
                        {diffReport.cardStats.cloudOnly} Kanji
                      </strong>
                    </span>
                    <span>
                      Khác nội dung / SRS:{' '}
                      <strong className="text-violet-800">
                        {diffReport.cardStats.modified} Kanji
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Tabs & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
                  <button
                    type="button"
                    onClick={() => setActiveTab('diff')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'diff'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>So sánh Máy vs Cloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cloud_tree')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'cloud_tree'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Cây thư mục Cloud ({cloudStats.deckCount})</span>
                  </button>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm thư mục hoặc chữ Kanji..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  />
                </div>
              </div>

              {activeTab === 'diff' ? (
                <div className="space-y-3">
                  {/* Diff Filter Bar */}
                  <div className="flex items-center flex-wrap gap-1.5 tabular-nums">
                    {(
                      [
                        {
                          id: 'all',
                          label: `Tất cả (${diffReport.folderStats.total})`,
                        },
                        {
                          id: 'local_only',
                          label: `Chỉ trên Máy (${diffReport.folderStats.localOnly})`,
                        },
                        {
                          id: 'cloud_only',
                          label: `Chỉ trên Cloud (${diffReport.folderStats.cloudOnly})`,
                        },
                        {
                          id: 'modified',
                          label: `Khác biệt (${diffReport.folderStats.modified})`,
                        },
                        {
                          id: 'matched',
                          label: `Khớp (${diffReport.folderStats.matched})`,
                        },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDiffFilter(f.id)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                          diffFilter === f.id
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {filteredDiffFolders.length === 0 ? (
                    <div className="p-8 text-center border border-slate-200 rounded-xl text-xs text-slate-500">
                      Không có thư mục nào thuộc bộ lọc hiện tại.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredDiffFolders.map(renderDiffFolderRow)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {cloudSnapshot.folders.length === 0 ? (
                    <div className="p-10 text-center space-y-1.5">
                      <Cloud className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">
                        Cloud hiện đang trống (0 thư mục / 0 thẻ)
                      </p>
                      <p className="text-xs text-slate-500">
                        Khi bạn bấm Đồng bộ Cloud, dữ liệu từ máy sẽ được đẩy lên
                        đây để lưu trữ.
                      </p>
                    </div>
                  ) : matchingCloudFolders ? (
                    matchingCloudFolders.length > 0 ? (
                      matchingCloudFolders.map((f) => renderCloudTreeFolder(f, 0))
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500">
                        Không tìm thấy thư mục hoặc chữ Kanji nào khớp với "
                        {searchQuery}".
                      </div>
                    )
                  ) : (
                    rootCloudFolders.map((f) => renderCloudTreeFolder(f, 0))
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-500">
            Chế độ chỉ đọc — việc xem dữ liệu không làm thay đổi bộ thẻ trên máy hay
            trên Cloud.
          </p>
          <button
            type="button"
            onClick={closeCloudInspector}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer self-end sm:self-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
