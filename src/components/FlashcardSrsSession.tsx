import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Volume2,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  Zap,
  PenTool,
  RotateCcw,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { useKanji } from '../context/KanjiContext';
import { FlashcardReviewItem, ReviewFilterMode, SrsRating } from '../types/deck';
import { previewNextIntervals } from '../utils/srsAlgorithm';
import { speakJapanese } from '../utils/speech';

interface FlashcardSrsSessionProps {
  folderId: string;
  initialMode?: ReviewFilterMode;
  onlyDue?: boolean;
  onExit: () => void;
}

export const FlashcardSrsSession: React.FC<FlashcardSrsSessionProps> = ({
  folderId,
  initialMode = 'all',
  onlyDue = true,
  onExit,
}) => {
  const {
    folders,
    srsConfig,
    setSrsConfig,
    getReviewCardsForFolder,
    gradeFlashcard,
  } = useDecks();
  const { handleSelectRecentKanji } = useKanji();

  const [filterMode, setFilterMode] = useState<ReviewFilterMode>(initialMode);
  const [cramMode, setCramMode] = useState<boolean>(!onlyDue);
  const [queue, setQueue] = useState<FlashcardReviewItem[]>(() =>
    getReviewCardsForFolder(folderId, initialMode, onlyDue)
  );
  const [initialTotal, setInitialTotal] = useState<number>(() =>
    getReviewCardsForFolder(folderId, initialMode, onlyDue).length
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [requeuedIds, setRequeuedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ hard: 0, good: 0, easy: 0 });

  const folder = folders.find((f) => f.id === folderId);

  const reloadSession = useCallback(
    (mode: ReviewFilterMode, isCram: boolean) => {
      const cards = getReviewCardsForFolder(folderId, mode, !isCram);
      setQueue(cards);
      setInitialTotal(cards.length);
      setIsFlipped(false);
      setRequeuedIds(new Set());
      setStats({ hard: 0, good: 0, easy: 0 });
    },
    [folderId, getReviewCardsForFolder]
  );

  const handleModeChange = (mode: ReviewFilterMode) => {
    setFilterMode(mode);
    reloadSession(mode, cramMode);
  };

  const currentCard = queue[0] || null;
  const completedCount = Math.max(0, initialTotal - queue.length);
  const progressPercent =
    initialTotal > 0 ? Math.min(100, Math.round((completedCount / initialTotal) * 100)) : 100;

  const intervals = useMemo(() => {
    if (!currentCard) return { hard: '', good: '', easy: '' };
    return previewNextIntervals(currentCard.srsState, srsConfig);
  }, [currentCard, srsConfig]);

  const handleRate = useCallback(
    (rating: SrsRating) => {
      if (!currentCard) return;
      gradeFlashcard(currentCard, rating);
      setStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

      setQueue((prev) => {
        const [, ...rest] = prev;
        // Giống Anki: nếu chọn Khó lần đầu trong phiên, xếp lại thẻ vào cuối hàng đợi để ôn lại
        if (rating === 'hard' && !requeuedIds.has(currentCard.cardId)) {
          setRequeuedIds((s) => new Set(s).add(currentCard.cardId));
          return [...rest, currentCard];
        }
        return rest;
      });
      setIsFlipped(false);
    },
    [currentCard, gradeFlashcard, requeuedIds]
  );

  // Keyboard shortcuts: Space/Enter to flip, 1/2/3 to rate
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (currentCard) setIsFlipped((f) => !f);
      } else if (isFlipped && currentCard) {
        if (e.key === '1') handleRate('hard');
        if (e.key === '2') handleRate('good');
        if (e.key === '3') handleRate('easy');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentCard, isFlipped, handleRate]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Top Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="p-2 text-slate-600 hover:text-teal-800 hover:bg-teal-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Quay lại bảng Kanji"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              Ôn tập: {folder?.name || 'Bài học'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
              <span>Còn lại: {queue.length} thẻ</span>
              <span aria-hidden="true">·</span>
              <span>{cramMode ? 'Chế độ ôn toàn bộ' : 'Thẻ đến hạn SRS'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Mode Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'kanji', label: 'Chỉ Kanji' },
                { id: 'compound', label: 'Từ ghép' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleModeChange(tab.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterMode === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowConfig((s) => !s)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              showConfig
                ? 'bg-teal-50 text-teal-800 border-teal-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
            title="Tùy chỉnh thời gian Anki SRS"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SRS Interval Config Drawer */}
      {showConfig && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">
              Tùy chỉnh mốc thời gian lặp lại (chuẩn Anki)
            </h3>
            <button
              type="button"
              onClick={() => setSrsConfig({ hardMinutes: 10, goodDays: 1, easyDays: 4 })}
              className="text-xs text-teal-700 hover:underline cursor-pointer"
            >
              Khôi phục mặc định
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-semibold text-rose-700 block">Mức Khó (phút)</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={srsConfig.hardMinutes}
                onChange={(e) =>
                  setSrsConfig({
                    ...srsConfig,
                    hardMinutes: Math.max(1, Number(e.target.value) || 10),
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-sky-700 block">Mức Tốt (ngày)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={srsConfig.goodDays}
                onChange={(e) =>
                  setSrsConfig({
                    ...srsConfig,
                    goodDays: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="font-semibold text-emerald-700 block">Mức Dễ (ngày)</span>
              <input
                type="number"
                min={1}
                max={90}
                value={srsConfig.easyDays}
                onChange={(e) =>
                  setSrsConfig({
                    ...srsConfig,
                    easyDays: Math.max(1, Number(e.target.value) || 4),
                  })
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </label>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-700 transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Flashcard Stage or Completion Screen */}
      {!currentCard ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              {initialTotal === 0
                ? 'Không có thẻ nào đến hạn ôn tập'
                : 'Hoàn thành phiên ôn tập!'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {initialTotal === 0
                ? 'Tất cả thẻ trong thư mục này đều đang ở trạng thái đã thuộc hoặc chưa đến lịch ôn lại.'
                : 'Bạn đã hoàn tất toàn bộ thẻ cần ôn trong phiên này. Trí nhớ của bạn đã được lên lịch lặp lại tối ưu.'}
            </p>
          </div>

          {stats.hard + stats.good + stats.easy > 0 && (
            <div className="flex items-center justify-center gap-6 text-xs tabular-nums pt-2">
              <span className="text-rose-700 font-semibold">Khó: {stats.hard}</span>
              <span className="text-sky-700 font-semibold">Tốt: {stats.good}</span>
              <span className="text-emerald-700 font-semibold">Dễ: {stats.easy}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setCramMode(true);
                reloadSession(filterMode, true);
              }}
              className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ôn tập lại tất cả thẻ</span>
            </button>
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
            >
              Quay lại bảng Kanji
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Interactive Card */}
          <div
            onClick={() => setIsFlipped((f) => !f)}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[340px] p-6 sm:p-8 flex flex-col justify-between cursor-pointer select-none transition-transform duration-150 active:scale-[0.995]"
          >
            {/* Card Metadata Header (Zero-pill clean text) */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-teal-800">
                  {currentCard.cardType === 'kanji' ? 'Thẻ Chữ Kanji' : 'Thẻ Từ Ghép'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentCard.folderName}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakJapanese(
                    currentCard.cardType === 'kanji'
                      ? currentCard.kanji
                      : currentCard.word || currentCard.kanji
                  );
                }}
                className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer"
                title="Nghe phát âm tiếng Nhật"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Card Center Content */}
            {!isFlipped ? (
              <div className="py-10 text-center space-y-4">
                <div className="font-kanji font-black text-6xl sm:text-7xl text-slate-900 tracking-wide">
                  {currentCard.cardType === 'kanji' ? currentCard.kanji : currentCard.word}
                </div>
                <p className="text-xs text-slate-400">
                  Nhấn vào thẻ hoặc phím Space để xem đáp án
                </p>
              </div>
            ) : (
              <div className="py-4 space-y-5 animate-in fade-in duration-150">
                {currentCard.cardType === 'kanji' ? (
                  <>
                    <div className="text-center space-y-1 border-b border-slate-100 pb-4">
                      <div className="font-kanji font-black text-4xl text-teal-900">
                        {currentCard.kanji}
                      </div>
                      <div className="text-base font-bold text-slate-900">
                        {currentCard.hanViet || 'Chưa có âm Hán-Việt'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                          Âm On (Katakana)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {currentCard.onReadings.length > 0
                            ? currentCard.onReadings.join(', ')
                            : '—'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                          Âm Kun (Hiragana)
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {currentCard.kunReadings.length > 0
                            ? currentCard.kunReadings.join(', ')
                            : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100">
                      <span className="text-[11px] font-semibold text-teal-800 block mb-0.5">
                        Ý nghĩa
                      </span>
                      <p className="text-sm font-semibold text-slate-900">
                        {currentCard.meanings.length > 0
                          ? currentCard.meanings.join(', ')
                          : 'Chưa cập nhật nghĩa'}
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRecentKanji(currentCard.kanji);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Xem thứ tự nét vẽ & Bộ thủ</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-1.5 border-b border-slate-100 pb-4">
                      <div className="font-kanji font-black text-4xl text-teal-900">
                        {currentCard.word}
                      </div>
                      {currentCard.reading && (
                        <div className="font-mono text-base font-bold text-slate-700">
                          {currentCard.reading}
                        </div>
                      )}
                      {currentCard.wordHanViet && (
                        <div className="text-xs font-bold text-teal-700">
                          {currentCard.wordHanViet}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100 text-center space-y-1">
                      <span className="text-[11px] font-semibold text-teal-800 block">
                        Nghĩa tiếng Việt
                      </span>
                      <p className="text-base font-bold text-slate-900">
                        {currentCard.wordMeaning}
                      </p>
                    </div>

                    <div className="text-center text-xs text-slate-500">
                      Chữ Kanji gốc:{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRecentKanji(currentCard.kanji);
                        }}
                        className="font-kanji font-bold text-teal-800 hover:underline cursor-pointer"
                      >
                        {currentCard.kanji} ({currentCard.hanViet})
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Card Footer Hint */}
            <div className="flex items-center justify-center text-[11px] text-slate-400 pt-2">
              {isFlipped ? (
                <span>Đánh giá mức độ ghi nhớ bên dưới (Phím 1 · 2 · 3)</span>
              ) : (
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  <span>Lật thẻ</span>
                </span>
              )}
            </div>
          </div>

          {/* Action / Rating Buttons */}
          {!isFlipped ? (
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Hiện đáp án (Space)
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleRate('hard')}
                className="py-3 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 transition-colors cursor-pointer flex flex-col items-center gap-0.5"
              >
                <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>1. Khó</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-rose-700">
                  {intervals.hard}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRate('good')}
                className="py-3 px-3 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900 transition-colors cursor-pointer flex flex-col items-center gap-0.5"
              >
                <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                  <ThumbsUp className="w-4 h-4 text-sky-600" />
                  <span>2. Tốt</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-sky-700">
                  {intervals.good}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRate('easy')}
                className="py-3 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors cursor-pointer flex flex-col items-center gap-0.5"
              >
                <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>3. Dễ</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-emerald-700">
                  {intervals.easy}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
