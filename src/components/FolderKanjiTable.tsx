import React, { useState } from 'react';
import {
  Play,
  Plus,
  Download,
  Globe,
  Trash2,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Volume2,
  Pencil,
  Check,
  X,
  Share2,
  ListPlus,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { useKanji } from '../context/KanjiContext';
import { FolderKanjiItem, ReviewFilterMode } from '../types/deck';
import { speakJapanese } from '../utils/speech';
import { formatIntervalLabel } from '../utils/srsAlgorithm';
import { BatchImportLessonModal } from './BatchImportLessonModal';

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
    addCompoundWord,
    deleteCompoundWord,
    supabaseEnabled,
  } = useDecks();

  const { handleSelectRecentKanji } = useKanji();

  const [kanjiInput, setKanjiInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const [editingKanjiId, setEditingKanjiId] = useState<string | null>(null);
  const [editHv, setEditHv] = useState('');
  const [editMeanings, setEditMeanings] = useState('');

  // Compound word form state per Kanji row
  const [cwDrafts, setCwDrafts] = useState<
    Record<string, { word: string; reading: string; hanViet: string; meaning: string }>
  >({});

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

  const toggleExpandRow = (id: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getDraft = (itemId: string) =>
    cwDrafts[itemId] || { word: '', reading: '', hanViet: '', meaning: '' };

  const setDraft = (
    itemId: string,
    patch: Partial<{ word: string; reading: string; hanViet: string; meaning: string }>
  ) => {
    setCwDrafts((prev) => ({
      ...prev,
      [itemId]: { ...getDraft(itemId), ...patch },
    }));
  };

  const handleAddCompoundSubmit = (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    const draft = getDraft(itemId);
    if (!draft.word.trim() || !draft.meaning.trim()) return;
    addCompoundWord(itemId, draft);
    setCwDrafts((prev) => ({
      ...prev,
      [itemId]: { word: '', reading: '', hanViet: '', meaning: '' },
    }));
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
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
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
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/90 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80">
              <div className="col-span-1">Kanji</div>
              <div className="col-span-2">Hán-Việt</div>
              <div className="col-span-2">Âm On / Kun</div>
              <div className="col-span-3">Nghĩa</div>
              <div className="col-span-2">Từ ghép & SRS</div>
              <div className="col-span-2 text-right">Thao tác</div>
            </div>

            {folderItems.map((item) => {
              const isExpanded = !!expandedItemIds[item.id];
              const isDue = item.srsState.dueAt <= Date.now();
              const cwCount = item.compoundWords?.length || 0;
              const belongFolderName =
                item.folderId !== selectedFolder.id ? folderNameMap.get(item.folderId) : null;

              return (
                <div key={item.id} className="transition-colors hover:bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 items-center">
                    {/* Kanji Character */}
                    <div className="md:col-span-1 flex items-center gap-2">
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
                        className="md:hidden p-1.5 text-slate-400 hover:text-teal-700 cursor-pointer"
                        title="Nghe phát âm"
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

                    {/* Compound Words Count & SRS Status */}
                    <div className="md:col-span-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleExpandRow(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950 cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <span className="tabular-nums">{cwCount} từ ghép</span>
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

                    {/* Actions */}
                    <div className="md:col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => speakJapanese(item.kanji)}
                        className="hidden md:inline-flex p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

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
                        <button
                          type="button"
                          onClick={() => handleStartEditKanji(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Sửa Hán-Việt & Nghĩa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpandRow(item.id)}
                        className="px-2 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        + Từ ghép
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteKanjiItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa khỏi bài"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Compound Words Editor */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          Từ ghép của chữ <span className="font-kanji font-bold text-sm">{item.kanji}</span> (mỗi từ ghép sẽ thành 1 thẻ Flashcard riêng)
                        </span>
                      </div>

                      {item.compoundWords.length > 0 && (
                        <div className="divide-y divide-slate-200/70 bg-white border border-slate-200 rounded-xl overflow-hidden">
                          {item.compoundWords.map((cw) => {
                            const cwDue = cw.srsState.dueAt <= Date.now();
                            return (
                              <div
                                key={cw.id}
                                className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center flex-wrap gap-3 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => speakJapanese(cw.word)}
                                    className="font-kanji font-bold text-sm text-teal-900 hover:text-teal-700 cursor-pointer flex items-center gap-1"
                                    title="Nghe phát âm"
                                  >
                                    <span>{cw.word}</span>
                                    <Volume2 className="w-3 h-3 text-slate-400" />
                                  </button>
                                  {cw.reading && (
                                    <span className="font-mono text-slate-600">{cw.reading}</span>
                                  )}
                                  {cw.hanViet && (
                                    <span className="font-semibold text-slate-800">{cw.hanViet}</span>
                                  )}
                                  <span className="text-slate-600">{cw.meaning}</span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[11px] tabular-nums text-slate-400">
                                    {cwDue
                                      ? 'Đến hạn ôn'
                                      : `Ôn sau ${formatIntervalLabel(cw.srsState.intervalMinutes)}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteCompoundWord(item.id, cw.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Xóa từ ghép"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline Add Compound Word Form */}
                      <form
                        onSubmit={(e) => handleAddCompoundSubmit(e, item.id)}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2"
                      >
                        <input
                          type="text"
                          value={getDraft(item.id).word}
                          onChange={(e) => setDraft(item.id, { word: e.target.value })}
                          placeholder="Từ ghép (vd: 日本)"
                          className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                          required
                        />
                        <input
                          type="text"
                          value={getDraft(item.id).reading}
                          onChange={(e) => setDraft(item.id, { reading: e.target.value })}
                          placeholder="Cách đọc (vd: にほん)"
                          className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                        <input
                          type="text"
                          value={getDraft(item.id).hanViet}
                          onChange={(e) => setDraft(item.id, { hanViet: e.target.value })}
                          placeholder="Hán-Việt (vd: NHẬT BẢN)"
                          className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                        <input
                          type="text"
                          value={getDraft(item.id).meaning}
                          onChange={(e) => setDraft(item.id, { meaning: e.target.value })}
                          placeholder="Nghĩa tiếng Việt..."
                          className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                          required
                        />
                        <button
                          type="submit"
                          className="sm:col-span-1 py-1.5 px-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
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
    </div>
  );
};
