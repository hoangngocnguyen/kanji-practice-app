import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Upload,
  FolderInput,
  Search,
  Cloud,
  ExternalLink,
  Play,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { StudyFolder } from '../types/deck';
import {
  FolderFormModal,
  MoveFolderModal,
  DeleteFolderConfirmModal,
  JsonImportModal,
  SupabaseCloudModal,
} from './DeckModals';

export const DecksView: React.FC = () => {
  const navigate = useNavigate();
  const {
    folders,
    getDueCountForFolderRecursive,
    getItemsForFolderRecursive,
    buildExportBundle,
    supabaseEnabled,
    cloudUser,
  } = useDecks();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    folders.forEach((f) => {
      if (f.parentId === null) initial[f.id] = true;
    });
    return initial;
  });

  // 3-dot dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Modals state
  const [folderModal, setFolderModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'rename';
    parentId: string | null;
    folder: StudyFolder | null;
  }>({ isOpen: false, mode: 'create', parentId: null, folder: null });

  const [moveTarget, setMoveTarget] = useState<StudyFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyFolder | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCloudOpen, setIsCloudOpen] = useState(false);

  // Close 3-dot menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleExportFolder = (folderId: string) => {
    const bundle = buildExportBundle(folderId);
    if (!bundle) return;

    const folder = folders.find((f) => f.id === folderId);
    const safeName = (folder?.name || 'kanji-deck')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName || 'kanji-deck'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchingFolders = normalizedQuery
    ? folders.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
    : null;

  const renderFolderRow = (folder: StudyFolder, depth = 0) => {
    const children = folders
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedIds[folder.id];
    const dueCount = getDueCountForFolderRecursive(folder.id);
    const totalKanji = getItemsForFolderRecursive(folder.id).length;
    const isMenuOpen = openMenuId === folder.id;

    return (
      <div key={folder.id}>
        <div
          onClick={() => navigate(`/decks/${folder.id}`)}
          className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/90 transition-colors cursor-pointer"
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Expand/Collapse chevron */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpand(folder.id);
              }}
              className={`p-1 rounded-lg transition-colors shrink-0 ${
                hasChildren
                  ? 'text-slate-500 hover:bg-slate-200/70 cursor-pointer'
                  : 'text-transparent pointer-events-none'
              }`}
              aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <div className="w-9 h-9 rounded-xl bg-teal-50/80 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              {isExpanded && hasChildren ? (
                <FolderOpen className="w-4 h-4" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-800 transition-colors truncate">
                {folder.name}
              </div>
              <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
                <span>{totalKanji} chữ Kanji</span>
                {hasChildren && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{children.length} bài con</span>
                  </>
                )}
                {dueCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-teal-700 font-semibold">
                      {dueCount} thẻ đến hạn ôn
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-2 shrink-0 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {dueCount > 0 && (
              <button
                type="button"
                onClick={() => navigate(`/decks/${folder.id}?review=1`)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Ôn ({dueCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setOpenMenuId((prev) => (prev === folder.id ? null : folder.id))
              }
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMenuOpen
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
              title="Thao tác thư mục"
              aria-label="Thao tác thư mục"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuContainerRef}
                className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-30 text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    navigate(`/decks/${folder.id}`);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mở bài học</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    setExpandedIds((prev) => ({ ...prev, [folder.id]: true }));
                    setFolderModal({
                      isOpen: true,
                      mode: 'create',
                      parentId: folder.id,
                      folder: null,
                    });
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thêm thư mục con</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    setFolderModal({
                      isOpen: true,
                      mode: 'rename',
                      parentId: folder.parentId,
                      folder,
                    });
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đổi tên thư mục</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    setMoveTarget(folder);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <FolderInput className="w-3.5 h-3.5 text-slate-400" />
                  <span>Di chuyển đến...</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    handleExportFolder(folder.id);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Xuất file JSON</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    setDeleteTarget(folder);
                  }}
                  className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa thư mục</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && !matchingFolders && (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {children.map((child) => renderFolderRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-base sm:text-lg font-bold text-slate-900">
            Thư mục bài học Kanji
          </h1>
          <p className="text-xs text-slate-500">
            Chọn thư mục để xem bảng Kanji, thêm từ ghép hoặc ôn tập Flashcard SRS
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {supabaseEnabled && (
            <button
              type="button"
              onClick={() => setIsCloudOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Cloud
                className={`w-3.5 h-3.5 ${
                  cloudUser ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>{cloudUser ? cloudUser.email?.split('@')[0] : 'Đồng bộ Cloud'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-teal-700" />
            <span>Nhập JSON</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFolderModal({
                isOpen: true,
                mode: 'create',
                parentId: null,
                folder: null,
              })
            }
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Thư mục mới</span>
          </button>
        </div>
      </div>

      {/* Search & Folder List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-visible">
        <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nhanh thư mục bài học..."
            className="flex-1 text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-700 px-2 cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {matchingFolders ? (
            matchingFolders.length > 0 ? (
              matchingFolders.map((folder) => renderFolderRow(folder, 0))
            ) : (
              <div className="p-10 text-center text-xs text-slate-500">
                Không tìm thấy thư mục nào khớp với "{searchQuery}".
              </div>
            )
          ) : rootFolders.length > 0 ? (
            rootFolders.map((folder) => renderFolderRow(folder, 0))
          ) : (
            <div className="p-12 text-center space-y-2">
              <Folder className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Chưa có thư mục bài học nào
              </p>
              <p className="text-xs text-slate-500">
                Bấm "Thư mục mới" hoặc "Nhập JSON" để bắt đầu tạo bộ thẻ ôn tập.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FolderFormModal
        isOpen={folderModal.isOpen}
        mode={folderModal.mode}
        parentId={folderModal.parentId}
        folder={folderModal.folder}
        onClose={() =>
          setFolderModal((prev) => ({ ...prev, isOpen: false }))
        }
      />

      <MoveFolderModal
        isOpen={Boolean(moveTarget)}
        folder={moveTarget}
        onClose={() => setMoveTarget(null)}
      />

      <DeleteFolderConfirmModal
        isOpen={Boolean(deleteTarget)}
        folder={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />

      <JsonImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <SupabaseCloudModal
        isOpen={isCloudOpen}
        shareFolderId={null}
        onClose={() => setIsCloudOpen(false)}
      />
    </div>
  );
};
