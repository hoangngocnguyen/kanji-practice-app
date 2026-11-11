import React, { useState, useEffect, useRef } from 'react';
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
    supabaseEnabled,
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

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (kanjiMenuRef.current && !kanjiMenuRef.current.contains(e.target as Node)) {
        setOpenKanjiMenuId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenKanjiMenuId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;

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
  const folderItems = getItemsForFolderRecursive(selectedFolder.id);
  const folderNameMap = new Map(folders.map((f) => [f.id, f.name]));
  const hasSubfolders = folders.some((f) => f.parentId === selectedFolder.id);

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

            {supabaseEnabled && (
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
            )}

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
            {/* Table Column Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/90 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 rounded-t-2xl">
              <div className="col-span-2">Kanji</div>
              <div className="col-span-2">Hán-Việt</div>
              <div className="col-span-2">Âm On / Kun</div>
              <div className="col-span-3">Nghĩa</div>
              <div className="col-span-2">Từ ghép &amp; SRS</div>
              <div className="col-span-1 text-right">Thao tác</div>
            </div>

            {folderItems.map((item) => {
              const isDue = item.srsState.dueAt <= Date.now();
              const cwCount = item.compoundWords?.length || 0;
              const belongFolderName =
                item.folderId !== selectedFolder.id ? folderNameMap.get(item.folderId) : null;

              return (
                <div key={item.id} className="transition-colors hover:bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 items-center">
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
              );
            })}
          </div>
        )}
      </div>

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
