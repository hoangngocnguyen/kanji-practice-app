import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Plus,
  Download,
  Globe,
  Trash2,
  ChevronRight,
  BookOpen,
  Volume2,
  Pencil,
  Check,
  X,
  Share2,
  ListPlus,
  MoreVertical,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { useKanji } from '../context/KanjiContext';
import { FolderKanjiItem, ReviewFilterMode } from '../types/deck';
import { speakJapanese } from '../utils/speech';
import { formatIntervalLabel } from '../utils/srsAlgorithm';
import { BatchImportLessonModal } from './BatchImportLessonModal';
import { BatchImportCompoundModal } from './BatchImportCompoundModal';
import { KanjiItemDetailModal } from './KanjiItemDetailModal';

interface FolderKanjiTableProps {
  onStartReview: (mode: ReviewFilterMode, onlyDue: boolean) => void;
  onExportFolder: (folderId: string) => void;
  onOpenShareModal: (folderId: string) => void;
  onSelectFolder?: (folderId: string) => void;
}

export const FolderKanjiTable: React.FC<FolderKanjiTableProps> = ({
  onStartReview,
  onExportFolder,
  onOpenShareModal,
  onSelectFolder,
}) => {
  const {
    folders,
    selectedFolderId,
    setSelectedFolderId,
    getFolderPath,
    getItemsForFolderRecursive,
    getReviewCardsForFolder,
    addKanjiListToFolder,
    updateKanjiItem,
    deleteKanjiItem,
    deleteKanjiItems,
  } = useDecks();

  const { handleSelectRecentKanji } = useKanji();

  const [kanjiInput, setKanjiInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [compoundImportItemId, setCompoundImportItemId] = useState<string | null>(null);
  const [openKanjiMenuId, setOpenKanjiMenuId] = useState<string | null>(null);
  const kanjiMenuRef = useRef<HTMLDivElement | null>(null);

  const [editingKanjiId, setEditingKanjiId] = useState<string | null>(null);
  const [editHv, setEditHv] = useState('');
  const [editMeanings, setEditMeanings] = useState('');

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const masterCheckboxRef = useRef<HTMLInputElement | null>(null);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;
  const folderItems = useMemo(
    () => (selectedFolder ? getItemsForFolderRecursive(selectedFolder.id) : []),
    [selectedFolder, getItemsForFolderRecursive]
  );

  // Reset selection when switching folders
  useEffect(() => {
    setSelectedItemIds([]);
    setIsBulkDeleteModalOpen(false);
  }, [selectedFolderId]);

  // Prune any selected IDs that no longer exist in folderItems
  useEffect(() => {
    const validIds = new Set(folderItems.map((it) => it.id));
    setSelectedItemIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [folderItems]);

  const selectedIdSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const allSelected = folderItems.length > 0 && selectedItemIds.length === folderItems.length;
  const someSelected = selectedItemIds.length > 0 && selectedItemIds.length < folderItems.length;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (kanjiMenuRef.current && !kanjiMenuRef.current.contains(e.target as Node)) {
        setOpenKanjiMenuId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenKanjiMenuId(null);
        setIsBulkDeleteModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  if (!selectedFolder) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-2">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">Chưa chọn thư mục bài học</h3>
        <p className="text-xs text-slate-500">
          Hãy chọn hoặc tạo một thư mục ở cột bên trái để thêm chữ Kanji và từ ghép.
        </p>
      </div>
    );
  }

  const breadcrumbs = getFolderPath(selectedFolder.id);
  const folderNameMap = new Map(folders.map((f) => [f.id, f.name]));
  const hasSubfolders = folders.some((f) => f.parentId === selectedFolder.id);

  const selectedItemsList = folderItems.filter((it) => selectedIdSet.has(it.id));
  const selectedCompoundCount = selectedItemsList.reduce(
    (sum, it) => sum + (it.compoundWords?.length || 0),
    0
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(folderItems.map((it) => it.id));
    }
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleConfirmBulkDelete = () => {
    if (selectedItemIds.length === 0) return;
    deleteKanjiItems(selectedItemIds);
    setSelectedItemIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const dueCards = getReviewCardsForFolder(selectedFolder.id, 'all', true);
  const totalCompoundWords = folderItems.reduce(
    (sum, it) => sum + (it.compoundWords?.length || 0),
    0
  );
  const totalCards = folderItems.length + totalCompoundWords;

  const handleAddKanjiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kanjiInput.trim()) return;
    setIsAdding(true);
    try {
      await addKanjiListToFolder(selectedFolder.id, kanjiInput);
      setKanjiInput('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEditKanji = (item: FolderKanjiItem) => {
    setEditingKanjiId(item.id);
    setEditHv(item.hanViet);
    setEditMeanings(item.meanings.join(', '));
  };

  const handleSaveEditKanji = (itemId: string) => {
    updateKanjiItem(itemId, {
      hanViet: editHv.trim().toUpperCase(),
      meanings: editMeanings
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    });
    setEditingKanjiId(null);
  };

  const detailItem = detailItemId
    ? folderItems.find((it) => it.id === detailItemId) || null
    : null;

  const compoundImportItem = compoundImportItemId
    ? folderItems.find((it) => it.id === compoundImportItemId) || null
    : null;

  return (
    <div className="space-y-4">
      {/* Header & Primary Review Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center flex-wrap gap-1 text-xs text-slate-500">
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={b.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                  <button
                    type="button"
                    onClick={() =>
                      onSelectFolder
                        ? onSelectFolder(b.id)
                        : setSelectedFolderId(b.id)
                    }
                    className={`hover:text-teal-700 transition-colors cursor-pointer truncate max-w-[180px] ${
                      idx === breadcrumbs.length - 1 ? 'font-bold text-slate-900' : ''
                    }`}
                  >
                    {b.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Clean unboxed metadata with typographic separators */}
            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
              <span>
                <strong className="text-slate-800">{folderItems.length}</strong> chữ Kanji
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-slate-800">{totalCompoundWords}</strong> từ ghép
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-teal-700">{dueCards.length}</strong> / {totalCards} thẻ đến hạn ôn
              </span>
              {hasSubfolders && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-teal-700 font-medium">Bao gồm các thư mục con</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onExportFolder(selectedFolder.id)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất JSON</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenShareModal(selectedFolder.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                selectedFolder.isPublic
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {selectedFolder.isPublic ? (
                <Globe className="w-3.5 h-3.5 text-teal-700" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{selectedFolder.isPublic ? 'Đang chia sẻ' : 'Chia sẻ'}</span>
            </button>

            <button
              type="button"
              disabled={totalCards === 0}
              onClick={() => onStartReview('all', dueCards.length > 0)}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {dueCards.length > 0
                  ? `Ôn tập ngay (${dueCards.length})`
                  : totalCards > 0
                  ? `Ôn lại tất cả (${totalCards})`
                  : 'Ôn tập ngay'}
              </span>
            </button>
          </div>
        </div>

        {/* Add Kanji List Bar */}
        <form onSubmit={handleAddKanjiSubmit} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={kanjiInput}
            onChange={(e) => setKanjiInput(e.target.value)}
            placeholder="Nhập hoặc dán danh sách chữ Kanji vào bài này (vd: 漢字勉強 hoặc cả đoạn văn)..."
            className="flex-1 h-10 px-3.5 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all"
          />
          <button
            type="submit"
            disabled={!kanjiInput.trim() || isAdding}
            className="h-10 px-4 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 disabled:bg-slate-100 disabled:text-slate-400 border border-teal-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Đang thêm...' : 'Thêm vào bảng'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBatchImportOpen(true)}
            className="h-10 px-3.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Nhập hàng loạt Kanji kèm từ ghép bằng Text hoặc JSON"
          >
            <ListPlus className="w-4 h-4 text-teal-700" />
            <span>Nhập hàng loạt</span>
          </button>
        </form>
      </div>

      {/* Kanji Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-visible">
        {folderItems.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">Thư mục này chưa có chữ Kanji nào</p>
            <p className="text-xs text-slate-500">
              Hãy dán danh sách Kanji vào ô phía trên để tự động tạo bảng học và thêm từ ghép.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Bulk Selection Action Bar */}
            {selectedItemIds.length > 0 && (
              <div className="px-4 py-2.5 bg-rose-50/90 border-b border-rose-200 rounded-t-2xl flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center flex-wrap gap-2 text-xs text-rose-950 tabular-nums">
                  <span>
                    Đã chọn <strong>{selectedItemIds.length}</strong> / {folderItems.length} thẻ Kanji
                  </span>
                  {selectedCompoundCount > 0 && (
                    <>
                      <span aria-hidden="true" className="text-rose-300">·</span>
                      <span className="text-rose-800">
                        {selectedCompoundCount} từ ghép đi kèm
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!allSelected && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Chọn tất cả ({folderItems.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedItemIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa đã chọn ({selectedItemIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Select-All Bar */}
            {selectedItemIds.length === 0 && (
              <div className="flex md:hidden items-center justify-between px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 rounded-t-2xl text-xs">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                  />
                  <span className="tabular-nums">Chọn tất cả ({folderItems.length} thẻ)</span>
                </label>
              </div>
            )}

            {/* Desktop Table Column Header */}
            <div
              className={`hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/90 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 ${
                selectedItemIds.length === 0 ? 'rounded-t-2xl' : ''
              }`}
            >
              <label
                className="w-7 h-7 -ml-1.5 flex items-center justify-center rounded-lg hover:bg-slate-200/60 cursor-pointer shrink-0"
                title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả thẻ'}
              >
                <input
                  ref={masterCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Chọn tất cả thẻ Kanji"
                  className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                />
              </label>
              <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-2">Kanji</div>
                <div className="col-span-2">Hán-Việt</div>
                <div className="col-span-2">Âm On / Kun</div>
                <div className="col-span-3">Nghĩa</div>
                <div className="col-span-2">Từ ghép &amp; SRS</div>
                <div className="col-span-1 text-right">Thao tác</div>
              </div>
            </div>

            {folderItems.map((item) => {
              const isDue = item.srsState.dueAt <= Date.now();
              const cwCount = item.compoundWords?.length || 0;
              const belongFolderName =
                item.folderId !== selectedFolder.id ? folderNameMap.get(item.folderId) : null;
              const isSelected = selectedIdSet.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-teal-50/50 hover:bg-teal-50/70' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <label
                      className="w-8 h-8 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
                      title={isSelected ? 'Bỏ chọn thẻ' : 'Chọn thẻ'}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        aria-label={`Chọn thẻ ${item.kanji}`}
                        className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                      />
                    </label>
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      {/* Kanji Character + Pronunciation button right next to it */}
                      <div className="md:col-span-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectRecentKanji(item.kanji)}
                          className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 flex items-center justify-center font-kanji text-2xl font-black text-slate-900 hover:text-teal-800 transition-colors cursor-pointer shrink-0"
                          title="Xem nét viết & bộ thủ"
                        >
                          {item.kanji}
                        </button>
                        <button
                          type="button"
                          onClick={() => speakJapanese(item.kanji)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          title="Nghe phát âm"
                          aria-label="Nghe phát âm"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                    {/* Hán Việt & Source folder if viewing parent */}
                    <div className="md:col-span-2 min-w-0">
                      {editingKanjiId === item.id ? (
                        <input
                          type="text"
                          value={editHv}
                          onChange={(e) => setEditHv(e.target.value)}
                          placeholder="Hán-Việt"
                          className="w-full px-2 py-1 text-xs border border-teal-400 rounded-lg focus:outline-none"
                        />
                      ) : (
                        <div>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {item.hanViet || '—'}
                          </div>
                          {belongFolderName && (
                            <div className="text-[11px] text-slate-400 truncate">
                              Bài: {belongFolderName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* On / Kun */}
                    <div className="md:col-span-2 text-xs space-y-0.5 min-w-0">
                      <div className="font-mono text-slate-700 truncate">
                        <span className="text-slate-400 text-[10px] mr-1">On:</span>
                        {item.onReadings.length > 0 ? item.onReadings.slice(0, 2).join(', ') : '—'}
                      </div>
                      <div className="font-mono text-slate-600 truncate">
                        <span className="text-slate-400 text-[10px] mr-1">Kun:</span>
                        {item.kunReadings.length > 0 ? item.kunReadings.slice(0, 2).join(', ') : '—'}
                      </div>
                    </div>

                    {/* Meanings */}
                    <div className="md:col-span-3 min-w-0">
                      {editingKanjiId === item.id ? (
                        <input
                          type="text"
                          value={editMeanings}
                          onChange={(e) => setEditMeanings(e.target.value)}
                          placeholder="Nghĩa (phân cách bằng dấu phẩy)"
                          className="w-full px-2 py-1 text-xs border border-teal-400 rounded-lg focus:outline-none"
                        />
                      ) : (
                        <p className="text-xs text-slate-700 line-clamp-2">
                          {item.meanings.length > 0 ? item.meanings.join(', ') : 'Chưa có nghĩa'}
                        </p>
                      )}
                    </div>

                    {/* Compound Words Count & SRS Status -> Click opens Detail Modal */}
                    <div className="md:col-span-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => setDetailItemId(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline cursor-pointer"
                      >
                        <span className="tabular-nums">{cwCount} từ ghép</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-[11px] tabular-nums text-slate-500">
                        {isDue ? (
                          <span className="text-amber-700 font-medium">● Đến hạn ôn</span>
                        ) : (
                          <span className="text-emerald-700">
                            ✓ Ôn sau {formatIntervalLabel(item.srsState.intervalMinutes)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: 3-dot menu */}
                    <div
                      className="md:col-span-1 flex items-center justify-end gap-1 relative"
                      onMouseLeave={() => {
                        if (openKanjiMenuId === item.id) {
                          setOpenKanjiMenuId(null);
                        }
                      }}
                    >
                      {editingKanjiId === item.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEditKanji(item.id)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Lưu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKanjiId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenKanjiMenuId((prev) =>
                                prev === item.id ? null : item.id
                              )
                            }
                            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                              openKanjiMenuId === item.id
                                ? 'bg-slate-100 border-slate-300 text-slate-900'
                                : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                            }`}
                            title="Thao tác chữ Kanji"
                            aria-label="Thao tác chữ Kanji"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openKanjiMenuId === item.id && (
                            <div
                              ref={kanjiMenuRef}
                              className="absolute right-0 top-full pt-1 z-30"
                            >
                              <div className="w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKanjiMenuId(null);
                                  setDetailItemId(item.id);
                                }}
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer font-medium"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                                <span>Xem chi tiết &amp; Từ ghép</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKanjiMenuId(null);
                                  handleSelectRecentKanji(item.kanji);
                                }}
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>Xem nét viết &amp; Bộ thủ</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKanjiMenuId(null);
                                  handleStartEditKanji(item);
                                }}
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                <span>Sửa Hán-Việt &amp; Nghĩa</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKanjiMenuId(null);
                                  setCompoundImportItemId(item.id);
                                }}
                                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                              >
                                <ListPlus className="w-3.5 h-3.5 text-teal-700" />
                                <span>Nhập từ ghép (Text / JSON)</span>
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKanjiMenuId(null);
                                  deleteKanjiItem(item.id);
                                }}
                                className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa khỏi bài</span>
                              </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận xóa {selectedItemsList.length} thẻ Kanji
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Các thẻ đã chọn sẽ bị xóa khỏi bài học{' '}
                  <strong className="text-slate-900">{selectedFolder.name}</strong>.
                  {selectedCompoundCount > 0 && (
                    <>
                      {' '}
                      Đồng thời <strong className="text-rose-700">{selectedCompoundCount} thẻ từ ghép</strong>{' '}
                      đi kèm cũng sẽ bị xóa theo.
                    </>
                  )}
                </p>
              </div>
            </div>

            {selectedItemsList.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap gap-1.5">
                {selectedItemsList.slice(0, 14).map((it) => (
                  <span
                    key={it.id}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-kanji text-base font-bold text-slate-900"
                  >
                    {it.kanji}
                  </span>
                ))}
                {selectedItemsList.length > 14 && (
                  <span className="px-2.5 h-8 rounded-lg bg-slate-200/70 flex items-center justify-center text-xs font-semibold text-slate-700 tabular-nums">
                    +{selectedItemsList.length - 14}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedItemsList.length} thẻ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BatchImportLessonModal
        isOpen={isBatchImportOpen}
        folderId={selectedFolder.id}
        folderName={selectedFolder.name}
        onClose={() => setIsBatchImportOpen(false)}
      />

      <KanjiItemDetailModal
        item={detailItem}
        onClose={() => setDetailItemId(null)}
        onOpenBatchCompoundImport={(itemId) => setCompoundImportItemId(itemId)}
      />

      <BatchImportCompoundModal
        item={compoundImportItem}
        onClose={() => setCompoundImportItemId(null)}
      />
    </div>
  );
};
