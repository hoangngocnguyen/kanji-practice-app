import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Download,
  Upload,
  Globe,
  Cloud,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { StudyFolder } from '../types/deck';

interface FolderTreeSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenImportModal: () => void;
  onOpenCloudModal: () => void;
  onExportFolder: (folderId: string) => void;
}

export const FolderTreeSidebar: React.FC<FolderTreeSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenImportModal,
  onOpenCloudModal,
  onExportFolder,
}) => {
  const {
    folders,
    selectedFolderId,
    setSelectedFolderId,
    getDueCountForFolderRecursive,
    getItemsForFolderRecursive,
    createFolder,
    renameFolder,
    deleteFolder,
    cloudUser,
    supabaseEnabled,
  } = useDecks();

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    folders.forEach((f) => {
      if (f.parentId === null) initial[f.id] = true;
    });
    return initial;
  });

  const [creatingParentId, setCreatingParentId] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartCreate = (parentId: string | null) => {
    setCreatingParentId(parentId);
    setNewFolderName('');
    if (parentId) {
      setExpandedIds((prev) => ({ ...prev, [parentId]: true }));
    }
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || creatingParentId === undefined) return;
    createFolder(newFolderName.trim(), creatingParentId);
    setCreatingParentId(undefined);
    setNewFolderName('');
  };

  const handleStartRename = (folder: StudyFolder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const handleConfirmRename = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editingName.trim()) {
      renameFolder(id, editingName.trim());
    }
    setEditingFolderId(null);
  };

  const renderFolderNode = (folder: StudyFolder, depth = 0) => {
    const children = folders
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedIds[folder.id];
    const isSelected = selectedFolderId === folder.id;
    const dueCount = getDueCountForFolderRecursive(folder.id);
    const totalKanji = getItemsForFolderRecursive(folder.id).length;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
            isSelected
              ? 'bg-teal-50 text-teal-900 font-semibold border border-teal-200/90'
              : 'text-slate-700 hover:bg-slate-100/80 border border-transparent'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          {/* Expand/Collapse chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(folder.id);
            }}
            className={`p-0.5 rounded hover:bg-slate-200/70 transition-colors shrink-0 ${
              hasChildren ? 'text-slate-500 cursor-pointer' : 'text-transparent pointer-events-none'
            }`}
            aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {isSelected || isExpanded ? (
            <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-teal-700' : 'text-slate-500'}`} />
          ) : (
            <Folder className="w-4 h-4 shrink-0 text-slate-400" />
          )}

          {editingFolderId === folder.id ? (
            <form
              onSubmit={(e) => handleConfirmRename(e, folder.id)}
              className="flex-1 flex items-center gap-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                autoFocus
                className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-white border border-teal-400 rounded focus:outline-none"
              />
              <button type="submit" className="p-0.5 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingFolderId(null)}
                className="p-0.5 text-slate-400 hover:bg-slate-200 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <>
              <span className="flex-1 truncate">{folder.name}</span>

              {folder.isPublic && (
                <span title="Đang chia sẻ công khai">
                  <Globe className="w-3 h-3 text-teal-600 shrink-0" />
                </span>
              )}

              {/* Unboxed tabular numerals */}
              <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                {dueCount > 0 ? (
                  <span className="text-teal-700 font-bold">{dueCount}</span>
                ) : (
                  <span>{totalKanji}</span>
                )}
              </span>

              {/* Hover actions */}
              <div
                className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleStartCreate(folder.id)}
                  className="p-1 text-slate-500 hover:text-teal-700 hover:bg-white rounded cursor-pointer"
                  title="Tạo thư mục con"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartRename(folder)}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded cursor-pointer"
                  title="Đổi tên"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onExportFolder(folder.id)}
                  className="p-1 text-slate-500 hover:text-teal-700 hover:bg-white rounded cursor-pointer"
                  title="Xuất file JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(folder.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded cursor-pointer"
                  title="Xóa thư mục"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Confirm delete inline bar */}
        {confirmDeleteId === folder.id && (
          <div
            className="mt-1 mb-1.5 mx-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-900 flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">Xóa "{folder.name}" và các bài con?</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  deleteFolder(folder.id);
                  setConfirmDeleteId(null);
                }}
                className="px-2 py-0.5 bg-rose-600 text-white rounded font-semibold cursor-pointer hover:bg-rose-700"
              >
                Xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Inline create subfolder form */}
        {creatingParentId === folder.id && (
          <form
            onSubmit={handleConfirmCreate}
            className="mt-1 mb-1 flex items-center gap-1 pr-2"
            style={{ paddingLeft: `${(depth + 1) * 14 + 12}px` }}
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Tên bài / thư mục con..."
              autoFocus
              className="flex-1 min-w-0 px-2 py-1 text-xs bg-white border border-teal-400 rounded-lg focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-teal-700 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-teal-800"
            >
              Tạo
            </button>
            <button
              type="button"
              onClick={() => setCreatingParentId(undefined)}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Render child folders */}
        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders
  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;
  const selectedFolderDueCount = selectedFolder
    ? getDueCountForFolderRecursive(selectedFolder.id)
    : 0;
  const selectedFolderTotalKanji = selectedFolder
    ? getItemsForFolderRecursive(selectedFolder.id).length
    : 0;

  // Compact collapsed view
  if (isCollapsed) {
    return (
      <aside className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden w-full">
        {/* Mobile / Stacked View (< lg): Horizontal Banner collapsing bottom-to-top */}
        <div className="lg:hidden p-3 flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
            onClick={onToggleCollapse}
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4 text-teal-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {selectedFolder?.name || 'Thư mục bài học'}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums">
                {selectedFolderDueCount > 0 ? (
                  <span className="text-teal-700 font-bold">{selectedFolderDueCount} thẻ đến hạn</span>
                ) : (
                  <span>{selectedFolderTotalKanji} chữ Kanji</span>
                )}
                <span>• Bấm để mở bài</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Mở rộng danh mục thư mục"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Đổi bài</span>
          </button>
        </div>

        {/* Desktop View (lg:flex): Compact Vertical Icon Column */}
        <div className="hidden lg:flex p-2 flex-col items-center justify-between space-y-3 w-13 sm:w-14 shrink-0 mx-auto">
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-9 h-9 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Mở rộng danh mục thư mục"
            >
              <PanelLeftOpen className="w-4 h-4 text-teal-700" />
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleCollapse();
                handleStartCreate(null);
              }}
              className="w-9 h-9 text-slate-600 hover:text-teal-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Tạo thư mục mới"
            >
              <FolderPlus className="w-4 h-4" />
            </button>

            <div className="w-full border-t border-slate-100 pt-2 flex flex-col items-center gap-2 max-h-[calc(100vh-14rem)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {rootFolders.map((folder) => {
                const dueCount = getDueCountForFolderRecursive(folder.id);
                const isSelected = selectedFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`relative w-9 h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={`${folder.name}${dueCount > 0 ? ` (${dueCount} thẻ đến hạn)` : ''}`}
                  >
                    <Folder className="w-4 h-4" />
                    {dueCount > 0 && (
                      <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center font-mono tabular-nums ring-2 ring-white">
                        {dueCount > 9 ? '9+' : dueCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full border-t border-slate-100 pt-2 flex flex-col items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="w-9 h-9 text-slate-600 hover:text-teal-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Nhập thư mục từ file (.json)"
            >
              <Upload className="w-4 h-4 text-teal-700" />
            </button>

            {supabaseEnabled && (
              <button
                type="button"
                onClick={onOpenCloudModal}
                className="w-9 h-9 text-slate-600 hover:text-teal-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Đồng bộ Supabase Cloud"
              >
                <Cloud className={`w-4 h-4 ${cloudUser ? 'text-emerald-600' : 'text-slate-400'}`} />
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col justify-between space-y-3 shadow-2xs">
      <div className="space-y-2.5">
        {/* Compact Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Thư mục bài học</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleStartCreate(null)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/90 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              title="Tạo thư mục mới"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Thư mục mới</span>
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Thu gọn khung thư mục"
            >
              <ChevronUp className="w-4 h-4 lg:hidden" />
              <PanelLeftClose className="w-4 h-4 hidden lg:block" />
            </button>
          </div>
        </div>

        {/* Inline create root folder form */}
        {creatingParentId === null && (
          <form onSubmit={handleConfirmCreate} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Tên thư mục gốc (vd: N3)..."
              autoFocus
              className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-slate-50 border border-teal-400 rounded-lg focus:outline-none focus:bg-white"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-teal-700 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-teal-800 shrink-0"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => setCreatingParentId(undefined)}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Folder tree list with max height for sticky view */}
        <div className="space-y-0.5 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
          {rootFolders.length > 0 ? (
            rootFolders.map((folder) => renderFolderNode(folder, 0))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              Chưa có thư mục nào. Hãy bấm "Thư mục mới" để bắt đầu.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Import & Cloud Sync Actions */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={onOpenImportModal}
          className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-teal-700" />
          <span>Nhập thư mục từ file (.json)</span>
        </button>

        {supabaseEnabled && (
          <button
            type="button"
            onClick={onOpenCloudModal}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Cloud className={`w-3.5 h-3.5 shrink-0 ${cloudUser ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="truncate">
                {cloudUser
                  ? cloudUser.email?.split('@')[0]
                  : 'Đăng nhập & Đồng bộ'}
              </span>
            </span>
            <span className="text-[11px] font-medium text-teal-700 shrink-0">
              {cloudUser ? 'Đã kết nối' : 'Cài đặt'}
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
