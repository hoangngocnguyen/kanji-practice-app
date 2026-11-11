import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Download,
  Upload,
  Globe,
  Cloud,
  Check,
  X,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { StudyFolder } from '../types/deck';

interface FolderTreeSidebarProps {
  onOpenImportModal: () => void;
  onOpenCloudModal: () => void;
  onExportFolder: (folderId: string) => void;
}

export const FolderTreeSidebar: React.FC<FolderTreeSidebarProps> = ({
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
          className={`group flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
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
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <aside className="bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Thư mục bài học</h2>
            <p className="text-[11px] text-slate-500">Chọn cha để ôn gộp tất cả bài con</p>
          </div>
          <button
            type="button"
            onClick={() => handleStartCreate(null)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Thư mục mới</span>
          </button>
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
              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-50 border border-teal-400 rounded-lg focus:outline-none focus:bg-white"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-teal-800 shrink-0"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => setCreatingParentId(undefined)}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Folder tree list */}
        <div className="space-y-0.5 max-h-[460px] overflow-y-auto pr-1">
          {rootFolders.length > 0 ? (
            rootFolders.map((folder) => renderFolderNode(folder, 0))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
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
