import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ArrowUpToLine,
  AlertCircle,
  CheckCircle2,
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
    buildFullExportBundle,
    renameFolder,
    moveFolder,
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

  // Google Drive-like selection & pointer detection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: coarse)').matches
      : false
  );

  // Inline rename (F2)
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const isCancellingRenameRef = useRef(false);

  // 3-dot dropdown menu & Right-click Context Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    folder: StudyFolder;
    x: number;
    y: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Drag & Drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | '__ROOT__' | null>(null);

  // Toast feedback for drag-drop / quick actions
  const [actionToast, setActionToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setActionToast({ type, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setActionToast(null);
    }, 2800);
  }, []);

  // Track pointer type (Desktop mouse vs Mobile touch)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarsePointer(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Auto-focus & select text when inline rename starts
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Close 3-dot menu & Context Menu on outside click / scroll / resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setOpenMenuId(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(target)) {
        setContextMenu(null);
      }
    };
    const handleViewportChange = () => {
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchingFolders = useMemo(
    () =>
      normalizedQuery
        ? folders.filter((f) => f.name.toLowerCase().includes(normalizedQuery))
        : null,
    [folders, normalizedQuery]
  );

  const rootFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parentId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [folders]
  );

  // Flattened list of currently visible folders for ArrowUp/ArrowDown keyboard navigation
  const visibleFolders = useMemo(() => {
    if (matchingFolders) return matchingFolders;
    const result: StudyFolder[] = [];
    const walk = (parentId: string | null) => {
      const children = folders
        .filter((f) => f.parentId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      for (const child of children) {
        result.push(child);
        if (expandedIds[child.id]) {
          walk(child.id);
        }
      }
    };
    walk(null);
    return result;
  }, [folders, expandedIds, matchingFolders]);

  // Check if targetId is sourceId or a descendant of sourceId (invalid drag target)
  const isDescendantOrSelf = useCallback(
    (sourceId: string, targetId: string): boolean => {
      if (sourceId === targetId) return true;
      const childrenMap = new Map<string | null, string[]>();
      for (const f of folders) {
        const list = childrenMap.get(f.parentId) || [];
        list.push(f.id);
        childrenMap.set(f.parentId, list);
      }
      const stack = [sourceId];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        const kids = childrenMap.get(curr) || [];
        for (const kid of kids) {
          if (kid === targetId) return true;
          stack.push(kid);
        }
      }
      return false;
    },
    [folders]
  );

  const startInlineRename = useCallback((folder: StudyFolder) => {
    isCancellingRenameRef.current = false;
    setSelectedId(folder.id);
    setRenamingId(folder.id);
    setRenameValue(folder.name);
    setRenameError(null);
    setOpenMenuId(null);
    setContextMenu(null);
  }, []);

  const commitInlineRename = useCallback(() => {
    if (!renamingId || isCancellingRenameRef.current) {
      isCancellingRenameRef.current = false;
      return;
    }
    const targetFolder = folders.find((f) => f.id === renamingId);
    if (!targetFolder) {
      setRenamingId(null);
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === targetFolder.name) {
      setRenamingId(null);
      setRenameError(null);
      return;
    }
    const res = renameFolder(renamingId, trimmed, targetFolder.description);
    if (!res.ok) {
      setRenameError(res.error || 'Không thể đổi tên thư mục.');
      window.setTimeout(() => renameInputRef.current?.focus(), 0);
      return;
    }
    setRenamingId(null);
    setRenameError(null);
  }, [renamingId, renameValue, folders, renameFolder]);

  const cancelInlineRename = useCallback(() => {
    isCancellingRenameRef.current = true;
    setRenamingId(null);
    setRenameError(null);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleExportFolder = useCallback(
    (folderId: string) => {
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
    },
    [buildExportBundle, folders]
  );

  const handleExportAllFolders = useCallback(() => {
    const bundle = buildFullExportBundle();
    if (!bundle) {
      showToast('error', 'Chưa có thư mục nào để xuất.');
      return;
    }

    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `luyen-kanji-toan-bo-thu-muc.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', `Đã xuất toàn bộ ${bundle.folders.length} thư mục.`);
  }, [buildFullExportBundle, showToast]);

  // Global keyboard shortcuts for Google Drive-like navigation
  const anyModalOpen =
    folderModal.isOpen ||
    Boolean(moveTarget) ||
    Boolean(deleteTarget) ||
    isImportOpen ||
    isCloudOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (anyModalOpen || renamingId) return;

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        if (openMenuId) {
          setOpenMenuId(null);
          return;
        }
        setSelectedId(null);
        return;
      }

      if (visibleFolders.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = selectedId
          ? visibleFolders.findIndex((f) => f.id === selectedId)
          : -1;
        const nextIdx = idx < visibleFolders.length - 1 ? idx + 1 : 0;
        const nextId = visibleFolders[nextIdx].id;
        setSelectedId(nextId);
        rowRefs.current[nextId]?.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = selectedId
          ? visibleFolders.findIndex((f) => f.id === selectedId)
          : -1;
        const prevIdx = idx > 0 ? idx - 1 : visibleFolders.length - 1;
        const prevId = visibleFolders[prevIdx].id;
        setSelectedId(prevId);
        rowRefs.current[prevId]?.scrollIntoView({ block: 'nearest' });
        return;
      }

      if (!selectedId) return;
      const selectedFolder = folders.find((f) => f.id === selectedId);
      if (!selectedFolder) return;

      if (e.key === 'ArrowRight' && !matchingFolders) {
        const children = folders
          .filter((f) => f.parentId === selectedFolder.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        if (children.length > 0) {
          e.preventDefault();
          if (!expandedIds[selectedFolder.id]) {
            setExpandedIds((prev) => ({ ...prev, [selectedFolder.id]: true }));
          } else {
            setSelectedId(children[0].id);
            rowRefs.current[children[0].id]?.scrollIntoView({ block: 'nearest' });
          }
        }
        return;
      }

      if (e.key === 'ArrowLeft' && !matchingFolders) {
        const hasChildren = folders.some((f) => f.parentId === selectedFolder.id);
        if (hasChildren && expandedIds[selectedFolder.id]) {
          e.preventDefault();
          setExpandedIds((prev) => ({ ...prev, [selectedFolder.id]: false }));
        } else if (selectedFolder.parentId) {
          e.preventDefault();
          setSelectedId(selectedFolder.parentId);
          rowRefs.current[selectedFolder.parentId]?.scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        navigate(`/decks/${selectedFolder.id}`);
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        startInlineRename(selectedFolder);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setDeleteTarget(selectedFolder);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    anyModalOpen,
    renamingId,
    contextMenu,
    openMenuId,
    visibleFolders,
    selectedId,
    folders,
    expandedIds,
    matchingFolders,
    navigate,
    startInlineRename,
  ]);

  const handleOpenContextMenu = (e: React.MouseEvent, folder: StudyFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(folder.id);
    setOpenMenuId(null);

    const menuWidth = 228;
    const menuHeight = 270;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setContextMenu({ folder, x: Math.max(8, x), y: Math.max(8, y) });
  };

  const handleDropOnTarget = (targetParentId: string | null) => {
    if (!draggingId) return;
    const sourceFolder = folders.find((f) => f.id === draggingId);
    if (!sourceFolder) return;

    if (targetParentId !== null && isDescendantOrSelf(draggingId, targetParentId)) {
      showToast('error', 'Không thể di chuyển thư mục vào chính nó hoặc thư mục con.');
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }

    const res = moveFolder(draggingId, targetParentId);
    if (!res.ok) {
      showToast('error', res.error || 'Không thể di chuyển thư mục.');
    } else {
      if (targetParentId) {
        setExpandedIds((prev) => ({ ...prev, [targetParentId]: true }));
        const targetFolder = folders.find((f) => f.id === targetParentId);
        showToast(
          'success',
          `Đã chuyển "${sourceFolder.name}" vào "${targetFolder?.name || 'thư mục đích'}"`
        );
      } else {
        showToast('success', `Đã đưa "${sourceFolder.name}" ra thư mục gốc`);
      }
      setSelectedId(draggingId);
    }

    setDraggingId(null);
    setDropTargetId(null);
  };

  const renderFolderRow = (folder: StudyFolder, depth = 0) => {
    const children = folders
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedIds[folder.id];
    const dueCount = getDueCountForFolderRecursive(folder.id);
    const totalKanji = getItemsForFolderRecursive(folder.id).length;
    const isMenuOpen = openMenuId === folder.id;
    const isSelected = selectedId === folder.id;
    const isRenaming = renamingId === folder.id;
    const isDragging = draggingId === folder.id;
    const isDropOver = dropTargetId === folder.id && draggingId !== null;
    const isInvalidDrop =
      isDropOver && draggingId ? isDescendantOrSelf(draggingId, folder.id) : false;

    return (
      <div key={folder.id}>
        <div
          ref={(el) => {
            rowRefs.current[folder.id] = el;
          }}
          draggable={!isRenaming}
          onDragStart={(e) => {
            if (isRenaming) return;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', folder.id);
            setDraggingId(folder.id);
            setSelectedId(folder.id);
            setContextMenu(null);
            setOpenMenuId(null);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDropTargetId(null);
          }}
          onDragOver={(e) => {
            if (!draggingId || draggingId === folder.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = isDescendantOrSelf(draggingId, folder.id)
              ? 'none'
              : 'move';
            if (dropTargetId !== folder.id) {
              setDropTargetId(folder.id);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              if (dropTargetId === folder.id) {
                setDropTargetId(null);
              }
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDropOnTarget(folder.id);
          }}
          onClick={() => {
            if (isRenaming) return;
            setContextMenu(null);
            if (isCoarsePointer) {
              navigate(`/decks/${folder.id}`);
            } else {
              setSelectedId(folder.id);
            }
          }}
          onDoubleClick={() => {
            if (isRenaming || isCoarsePointer) return;
            navigate(`/decks/${folder.id}`);
          }}
          onContextMenu={(e) => handleOpenContextMenu(e, folder)}
          className={`group flex items-center justify-between gap-3 px-4 py-3 transition-colors select-none cursor-pointer border-l-2 ${
            isDragging ? 'opacity-45' : ''
          } ${
            isDropOver
              ? isInvalidDrop
                ? 'bg-rose-50/70 ring-2 ring-inset ring-rose-400 border-l-rose-500'
                : 'bg-teal-50/90 ring-2 ring-inset ring-teal-600 border-l-teal-700'
              : isSelected
              ? 'bg-teal-50/75 border-l-teal-700'
              : 'border-l-transparent hover:bg-slate-50/90'
          }`}
          style={{ paddingLeft: `${depth * 24 + 14}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Expand/Collapse chevron */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpand(folder.id);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
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

            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'bg-teal-100/80 border-teal-300 text-teal-800'
                  : 'bg-teal-50/80 border-teal-100 text-teal-700'
              }`}
            >
              {isExpanded && hasChildren ? (
                <FolderOpen className="w-4 h-4" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <div
                  className="space-y-1 max-w-md"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => {
                      setRenameValue(e.target.value);
                      if (renameError) setRenameError(null);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitInlineRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelInlineRename();
                      }
                    }}
                    onBlur={commitInlineRename}
                    className={`w-full px-2.5 py-1 text-sm font-semibold text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                      renameError
                        ? 'border-rose-400 focus:ring-rose-500/20'
                        : 'border-teal-600 focus:ring-teal-600/20'
                    }`}
                  />
                  {renameError && (
                    <p className="text-[11px] text-rose-600 font-medium">{renameError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`text-sm font-semibold transition-colors truncate ${
                      isSelected
                        ? 'text-teal-900'
                        : 'text-slate-900 group-hover:text-teal-800'
                    }`}
                  >
                    {folder.name}
                  </div>
                  {isDropOver && !isInvalidDrop && (
                    <span className="text-[11px] font-semibold text-teal-700 shrink-0">
                      · Thả vào đây
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums mt-0.5">
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
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseLeave={() => {
              if (openMenuId === folder.id) {
                setOpenMenuId(null);
              }
            }}
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
              onClick={() => {
                setContextMenu(null);
                setSelectedId(folder.id);
                setOpenMenuId((prev) => (prev === folder.id ? null : folder.id));
              }}
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
                className="absolute right-0 top-full pt-1 z-30"
              >
                <div className="w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    navigate(`/decks/${folder.id}`);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mở bài học</span>
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">Enter</span>
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
                  onClick={() => startInlineRename(folder)}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    <span>Đổi tên thư mục</span>
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">F2</span>
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
                  className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa thư mục</span>
                  </span>
                  <span className="text-[10px] text-rose-400 hidden sm:inline">Del</span>
                </button>
                </div>
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

  const draggingFolder = draggingId
    ? folders.find((f) => f.id === draggingId) || null
    : null;
  const showRootDropZone = Boolean(draggingFolder && draggingFolder.parentId !== null);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-base sm:text-lg font-bold text-slate-900">
            Thư mục bài học Kanji
          </h1>
          <p className="text-xs text-slate-500">
            Quản lý thư mục trực quan như Google Drive · Chọn để thao tác hoặc mở bài học SRS
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
            onClick={handleExportAllFolders}
            disabled={folders.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-45 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            title="Xuất toàn bộ cây thư mục và thẻ Kanji ra 1 file JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất toàn bộ</span>
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

      {/* Action Toast */}
      {actionToast && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            actionToast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {actionToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{actionToast.message}</span>
        </div>
      )}

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

        {/* Dynamic Root Drop Zone when dragging a nested folder */}
        {showRootDropZone && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dropTargetId !== '__ROOT__') setDropTargetId('__ROOT__');
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                if (dropTargetId === '__ROOT__') setDropTargetId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDropOnTarget(null);
            }}
            className={`mx-4 my-2.5 px-4 py-2.5 rounded-xl border-2 border-dashed text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              dropTargetId === '__ROOT__'
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-slate-300 bg-slate-50/80 text-slate-600'
            }`}
          >
            <ArrowUpToLine className="w-4 h-4 text-teal-700" />
            <span>Thả vào đây để đưa ra thư mục gốc (cấp cao nhất)</span>
          </div>
        )}

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

        {/* Subtle Desktop Shortcut Hint Bar */}
        {visibleFolders.length > 0 && (
          <div className="hidden sm:flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 rounded-b-2xl">
            <span>
              Click để chọn · Nhấn đúp hoặc <strong className="font-semibold text-slate-700">Enter</strong> để mở · <strong className="font-semibold text-slate-700">F2</strong> đổi tên · Kéo thả để di chuyển · Chuột phải mở menu · <strong className="font-semibold text-slate-700">Del</strong> xóa
            </span>
          </div>
        )}
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          onMouseLeave={() => setContextMenu(null)}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 text-xs"
        >
          <button
            type="button"
            onClick={() => {
              const id = contextMenu.folder.id;
              setContextMenu(null);
              navigate(`/decks/${id}`);
            }}
            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Mở bài học</span>
            </span>
            <span className="text-[10px] text-slate-400">Enter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const folder = contextMenu.folder;
              setContextMenu(null);
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
            onClick={() => startInlineRename(contextMenu.folder)}
            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>Đổi tên thư mục</span>
            </span>
            <span className="text-[10px] text-slate-400">F2</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const folder = contextMenu.folder;
              setContextMenu(null);
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
              const id = contextMenu.folder.id;
              setContextMenu(null);
              handleExportFolder(id);
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
              const folder = contextMenu.folder;
              setContextMenu(null);
              setDeleteTarget(folder);
            }}
            className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa thư mục</span>
            </span>
            <span className="text-[10px] text-rose-400">Del</span>
          </button>
        </div>
      )}

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
