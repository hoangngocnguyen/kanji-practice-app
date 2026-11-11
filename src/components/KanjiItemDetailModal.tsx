import React, { useState } from 'react';
import {
  X,
  Volume2,
  Eye,
  Pencil,
  Check,
  Plus,
  Trash2,
  ListPlus,
  BookOpen,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { useKanji } from '../context/KanjiContext';
import { CompoundWordCard, FolderKanjiItem } from '../types/deck';
import { speakJapanese } from '../utils/speech';
import { formatIntervalLabel } from '../utils/srsAlgorithm';

interface KanjiItemDetailModalProps {
  item: FolderKanjiItem | null;
  onClose: () => void;
  onOpenBatchCompoundImport: (itemId: string) => void;
}

export const KanjiItemDetailModal: React.FC<KanjiItemDetailModalProps> = ({
  item,
  onClose,
  onOpenBatchCompoundImport,
}) => {
  const {
    updateKanjiItem,
    addCompoundWord,
    updateCompoundWord,
    deleteCompoundWord,
  } = useDecks();
  const { handleSelectRecentKanji } = useKanji();

  const [isEditingKanji, setIsEditingKanji] = useState(false);
  const [editHv, setEditHv] = useState('');
  const [editMeanings, setEditMeanings] = useState('');

  const [editingCw, setEditingCw] = useState<{
    wordId: string;
    word: string;
    reading: string;
    hanViet: string;
    meaning: string;
  } | null>(null);

  const [newWord, setNewWord] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newHanViet, setNewHanViet] = useState('');
  const [newMeaning, setNewMeaning] = useState('');

  if (!item) return null;

  const isDue = item.srsState.dueAt <= Date.now();

  const startEditKanji = () => {
    setEditHv(item.hanViet || '');
    setEditMeanings((item.meanings || []).join(', '));
    setIsEditingKanji(true);
  };

  const saveEditKanji = () => {
    updateKanjiItem(item.id, {
      hanViet: editHv.trim().toUpperCase(),
      meanings: editMeanings
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    });
    setIsEditingKanji(false);
  };

  const startEditCw = (cw: CompoundWordCard) => {
    setEditingCw({
      wordId: cw.id,
      word: cw.word,
      reading: cw.reading || '',
      hanViet: cw.hanViet || '',
      meaning: cw.meaning,
    });
  };

  const saveEditCw = () => {
    if (!editingCw) return;
    const cleanWord = editingCw.word.trim();
    const cleanMeaning = editingCw.meaning.trim();
    if (!cleanWord || !cleanMeaning) return;
    updateCompoundWord(item.id, editingCw.wordId, {
      word: cleanWord,
      reading: editingCw.reading.trim(),
      hanViet: editingCw.hanViet.trim().toUpperCase(),
      meaning: cleanMeaning,
    });
    setEditingCw(null);
  };

  const handleAddCompoundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newMeaning.trim()) return;
    addCompoundWord(item.id, {
      word: newWord,
      reading: newReading,
      hanViet: newHanViet,
      meaning: newMeaning,
    });
    setNewWord('');
    setNewReading('');
    setNewHanViet('');
    setNewMeaning('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/45 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <BookOpen className="w-4 h-4 text-teal-700" />
            <span>Chi tiết chữ Kanji &amp; Từ ghép</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Root Kanji Info Card */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-start">
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectRecentKanji(item.kanji)}
                className="w-20 h-20 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 flex items-center justify-center font-kanji text-5xl font-black text-slate-900 hover:text-teal-800 transition-colors cursor-pointer shadow-2xs"
                title="Xem nét viết & Bộ thủ"
              >
                {item.kanji}
              </button>
              <div className="flex sm:flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => speakJapanese(item.kanji)}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRecentKanji(item.kanji)}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer"
                  title="Xem nét viết & Bộ thủ"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isEditingKanji ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Âm Hán-Việt
                          </label>
                          <input
                            type="text"
                            value={editHv}
                            onChange={(e) => setEditHv(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-teal-400 rounded-lg focus:outline-none"
                            placeholder="VD: NHẬT"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Nghĩa (phân cách dấu phẩy)
                          </label>
                          <input
                            type="text"
                            value={editMeanings}
                            onChange={(e) => setEditMeanings(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditKanji();
                              if (e.key === 'Escape') setIsEditingKanji(false);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                            placeholder="Mặt trời, Ngày..."
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveEditKanji}
                          className="px-3 py-1 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingKanji(false)}
                          className="px-3 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-lg font-bold text-slate-900">
                          {item.hanViet || 'Chưa có Hán-Việt'}
                        </span>
                        {item.strokeCount ? (
                          <span className="text-xs text-slate-500 tabular-nums">
                            · {item.strokeCount} nét
                          </span>
                        ) : null}
                        <span
                          className={`text-xs font-medium tabular-nums ${
                            isDue ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          · {isDue ? 'Đến hạn ôn' : `Ôn sau ${formatIntervalLabel(item.srsState.intervalMinutes)}`}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">
                        {item.meanings.length > 0 ? item.meanings.join(', ') : 'Chưa có nghĩa'}
                      </p>
                    </>
                  )}
                </div>

                {!isEditingKanji && (
                  <button
                    type="button"
                    onClick={startEditKanji}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sửa thông tin</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-white border border-slate-200/80 rounded-xl px-3 py-2">
                  <span className="text-slate-400 text-[11px] block">Âm On</span>
                  <span className="font-mono font-medium text-slate-800">
                    {item.onReadings.length > 0 ? item.onReadings.join(', ') : '—'}
                  </span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-xl px-3 py-2">
                  <span className="text-slate-400 text-[11px] block">Âm Kun</span>
                  <span className="font-mono font-medium text-slate-800">
                    {item.kunReadings.length > 0 ? item.kunReadings.join(', ') : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compound Words Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Danh sách từ ghép ({item.compoundWords.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Mỗi từ ghép sẽ tạo thành một thẻ Flashcard riêng khi ôn tập bài học.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenBatchCompoundImport(item.id)}
                className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5 text-teal-700" />
                <span>Nhập hàng loạt (Text / JSON)</span>
              </button>
            </div>

            {item.compoundWords.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                Chưa có từ ghép nào cho chữ <strong className="font-kanji">{item.kanji}</strong>. Hãy thêm từ ghép ở form bên dưới hoặc dùng nút Nhập hàng loạt.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {item.compoundWords.map((cw) => {
                  const cwDue = cw.srsState.dueAt <= Date.now();
                  const isEditingThis = editingCw?.wordId === cw.id;

                  if (isEditingThis && editingCw) {
                    return (
                      <div
                        key={cw.id}
                        className="px-3.5 py-2.5 bg-teal-50/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <input
                          type="text"
                          value={editingCw.word}
                          onChange={(e) =>
                            setEditingCw({ ...editingCw, word: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditCw();
                            if (e.key === 'Escape') setEditingCw(null);
                          }}
                          placeholder="Từ ghép"
                          className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-teal-400 rounded-lg focus:outline-none"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editingCw.reading}
                          onChange={(e) =>
                            setEditingCw({ ...editingCw, reading: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditCw();
                            if (e.key === 'Escape') setEditingCw(null);
                          }}
                          placeholder="Cách đọc"
                          className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                        <input
                          type="text"
                          value={editingCw.hanViet}
                          onChange={(e) =>
                            setEditingCw({ ...editingCw, hanViet: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditCw();
                            if (e.key === 'Escape') setEditingCw(null);
                          }}
                          placeholder="Hán-Việt"
                          className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                        <input
                          type="text"
                          value={editingCw.meaning}
                          onChange={(e) =>
                            setEditingCw({ ...editingCw, meaning: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditCw();
                            if (e.key === 'Escape') setEditingCw(null);
                          }}
                          placeholder="Nghĩa tiếng Việt"
                          className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
                        />
                        <div className="sm:col-span-1 flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={saveEditCw}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Lưu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCw(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cw.id}
                      className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center flex-wrap gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => speakJapanese(cw.word)}
                          className="font-kanji font-bold text-base text-teal-900 hover:text-teal-700 cursor-pointer flex items-center gap-1.5"
                          title="Nghe phát âm"
                        >
                          <span>{cw.word}</span>
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        {cw.reading && (
                          <span className="font-mono text-slate-600">{cw.reading}</span>
                        )}
                        {cw.hanViet && (
                          <span className="font-semibold text-slate-800">{cw.hanViet}</span>
                        )}
                        <span className="text-slate-600">{cw.meaning}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] tabular-nums text-slate-400 mr-1">
                          {cwDue
                            ? 'Đến hạn ôn'
                            : `Ôn sau ${formatIntervalLabel(cw.srsState.intervalMinutes)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditCw(cw)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                          title="Sửa từ ghép"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCompoundWord(item.id, cw.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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

            {/* Add New Compound Word Form */}
            <form
              onSubmit={handleAddCompoundSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1"
            >
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Từ ghép (vd: 日本)"
                className="sm:col-span-3 px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                required
              />
              <input
                type="text"
                value={newReading}
                onChange={(e) => setNewReading(e.target.value)}
                placeholder="Cách đọc (vd: にほん)"
                className="sm:col-span-3 px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
              />
              <input
                type="text"
                value={newHanViet}
                onChange={(e) => setNewHanViet(e.target.value)}
                placeholder="Hán-Việt (vd: NHẬT BẢN)"
                className="sm:col-span-2 px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
              />
              <input
                type="text"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="Nghĩa tiếng Việt..."
                className="sm:col-span-3 px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                required
              />
              <button
                type="submit"
                className="sm:col-span-1 py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                title="Thêm từ ghép"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
