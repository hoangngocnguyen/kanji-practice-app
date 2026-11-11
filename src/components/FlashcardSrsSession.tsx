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
  ChevronLeft,
  ChevronRight,
  X,
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
  const [currentIndex, setCurrentIndex] = useState<number>(0);
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
      setCurrentIndex(0);
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

  const currentCard = queue[currentIndex] || null;
  const completedCount = Math.max(0, initialTotal - queue.length);
  const progressPercent =
    initialTotal > 0 ? Math.min(100, Math.round((completedCount / initialTotal) * 100)) : 100;

  const intervals = useMemo(() => {
    if (!currentCard) return { hard: '', good: '', easy: '' };
    return previewNextIntervals(currentCard.srsState, srsConfig);
  }, [currentCard, srsConfig]);

  const handlePrevCard = useCallback(() => {
    if (queue.length <= 1 || currentIndex <= 0) return;
    setCurrentIndex((i) => Math.max(0, i - 1));
    setIsFlipped(false);
  }, [queue.length, currentIndex]);

  const handleNextCard = useCallback(() => {
    if (queue.length <= 1 || currentIndex >= queue.length - 1) return;
    setCurrentIndex((i) => Math.min(queue.length - 1, i + 1));
    setIsFlipped(false);
  }, [queue.length, currentIndex]);

  const handleRate = useCallback(
    (rating: SrsRating) => {
      if (!currentCard) return;
      gradeFlashcard(currentCard, rating);
      setStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

      const nextQueue = queue.filter((_, idx) => idx !== currentIndex);
      if (rating === 'hard' && !requeuedIds.has(currentCard.cardId)) {
        setRequeuedIds((s) => new Set(s).add(currentCard.cardId));
        nextQueue.push(currentCard);
      }

      setQueue(nextQueue);
      setCurrentIndex((prevIdx) =>
        nextQueue.length === 0 ? 0 : Math.min(prevIdx, nextQueue.length - 1)
      );
      setIsFlipped(false);
    },
    [currentCard, currentIndex, queue, gradeFlashcard, requeuedIds]
  );

  // Lock background scroll while flashcard review modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard shortcuts: Space/Enter to flip, Left/Right to switch cards, 1/2/3 to rate, Esc to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showConfig) {
          setShowConfig(false);
        } else {
          onExit();
        }
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (currentCard) setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (isFlipped && currentCard) {
        if (e.key === '1') handleRate('hard');
        if (e.key === '2') handleRate('good');
        if (e.key === '3') handleRate('easy');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentCard, isFlipped, handleRate, handlePrevCard, handleNextCard, showConfig, onExit]);

  return (
    <div
      onClick={onExit}
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Phiên ôn tập Flashcard"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-full max-h-[96dvh] sm:max-h-[90dvh] bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-3 sm:p-5 flex flex-col justify-between gap-2.5 sm:gap-3 overflow-hidden"
      >
        {/* 1. Compact Top Control Bar + Progress */}
        <div className="space-y-2 shrink-0 w-full max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200/90 px-3 py-2 sm:px-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onExit}
                className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-teal-800 hover:bg-teal-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Đóng phiên ôn tập (Esc)"
                aria-label="Đóng phiên ôn tập"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[280px]">
                  {folder?.name || 'Bài học'}
                </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums">
                <span>
                  Thẻ {queue.length > 0 ? currentIndex + 1 : 0} / {queue.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>{cramMode ? 'Ôn toàn bộ' : 'Đến hạn SRS'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-xl">
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'kanji', label: 'Kanji' },
                  { id: 'compound', label: 'Từ ghép' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleModeChange(tab.id)}
                  className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer shrink-0 ${
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
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                Mốc thời gian lặp lại (chuẩn Anki)
              </h3>
              <button
                type="button"
                onClick={() => setSrsConfig({ hardMinutes: 10, goodDays: 1, easyDays: 4 })}
                className="text-[11px] text-teal-700 hover:underline cursor-pointer"
              >
                Mặc định
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className="space-y-1">
                <span className="font-semibold text-rose-700 block text-[11px]">Khó (phút)</span>
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
                  className="w-full px-2.5 py-1 border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold text-sky-700 block text-[11px]">Tốt (ngày)</span>
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
                  className="w-full px-2.5 py-1 border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold text-emerald-700 block text-[11px]">Dễ (ngày)</span>
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
                  className="w-full px-2.5 py-1 border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </label>
            </div>
          </div>
        )}

        {/* Thin Progress Bar */}
        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-700 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Centered Card + Action Group */}
      {!currentCard ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="w-full max-w-[520px] bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {initialTotal === 0
                  ? 'Không có thẻ nào đến hạn ôn tập'
                  : 'Hoàn thành phiên ôn tập!'}
              </h3>
              <p className="text-xs text-slate-500">
                {initialTotal === 0
                  ? 'Tất cả thẻ trong thư mục này đều chưa đến lịch ôn lại.'
                  : 'Bạn đã hoàn tất toàn bộ thẻ cần ôn trong phiên này.'}
              </p>
            </div>

            {stats.hard + stats.good + stats.easy > 0 && (
              <div className="flex items-center justify-center gap-5 text-xs tabular-nums">
                <span className="text-rose-700 font-semibold">Khó: {stats.hard}</span>
                <span className="text-sky-700 font-semibold">Tốt: {stats.good}</span>
                <span className="text-emerald-700 font-semibold">Dễ: {stats.easy}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2.5 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setCramMode(true);
                  reloadSession(filterMode, true);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ôn lại tất cả</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
              >
                Quay lại bài học
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 sm:gap-4 py-1">
          {/* Card + Desktop Left/Right Arrows */}
          <div className="w-full flex items-center justify-center gap-3 sm:gap-5">
            {/* Desktop Left Arrow */}
            <button
              type="button"
              onClick={handlePrevCard}
              disabled={currentIndex <= 0}
              className="hidden sm:flex w-11 h-11 rounded-full bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-600 hover:text-teal-800 disabled:opacity-30 disabled:pointer-events-none items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
              title="Thẻ trước (←)"
              aria-label="Thẻ trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Fixed-Height Responsive Card (Front & Back identical dimensions) */}
            <div
              onClick={() => setIsFlipped((f) => !f)}
              className="w-full max-w-[480px] md:max-w-[580px] lg:max-w-[640px] h-[250px] sm:h-[310px] lg:h-[340px] bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col justify-between cursor-pointer select-none transition-transform duration-150 active:scale-[0.995] overflow-y-auto"
            >
              {/* Card Metadata Header */}
              <div className="flex items-center justify-between text-xs text-slate-500 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-teal-800 shrink-0">
                    {currentCard.cardType === 'kanji' ? 'Thẻ Kanji' : 'Thẻ Từ ghép'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{currentCard.folderName}</span>
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
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Nghe phát âm tiếng Nhật"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Card Center Content */}
              {!isFlipped ? (
                <div className="text-center space-y-3 my-auto">
                  <div className="font-kanji font-black text-6xl sm:text-7xl lg:text-8xl text-slate-900 tracking-wide leading-none">
                    {currentCard.cardType === 'kanji' ? currentCard.kanji : currentCard.word}
                  </div>
                  <p className="text-xs text-slate-400">
                    Chạm vào thẻ hoặc nhấn Space để lật
                  </p>
                </div>
              ) : (
                <div className="my-auto animate-in fade-in duration-150">
                  {currentCard.cardType === 'kanji' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-5 items-center">
                      {/* Left Column: Kanji + Han-Viet + Stroke Button */}
                      <div className="sm:col-span-5 flex sm:flex-col items-center sm:justify-center gap-3 sm:gap-2 sm:border-r sm:border-slate-100 sm:pr-4">
                        <div className="font-kanji font-black text-5xl sm:text-6xl lg:text-7xl text-teal-900 leading-none shrink-0">
                          {currentCard.kanji}
                        </div>
                        <div className="flex flex-col sm:items-center gap-1.5 min-w-0">
                          <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {currentCard.hanViet || 'Chưa có Hán-Việt'}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRecentKanji(currentCard.kanji);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors cursor-pointer w-fit"
                          >
                            <PenTool className="w-3 h-3" />
                            <span>Xem nét viết</span>
                          </button>
                        </div>
                      </div>

                      {/* Right Column: On/Kun + Meaning */}
                      <div className="sm:col-span-7 space-y-2 sm:space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-500 block">
                              Âm On
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm break-words">
                              {currentCard.onReadings.length > 0
                                ? currentCard.onReadings.slice(0, 3).join(', ')
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-500 block">
                              Âm Kun
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm break-words">
                              {currentCard.kunReadings.length > 0
                                ? currentCard.kunReadings.slice(0, 3).join(', ')
                                : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 sm:p-3.5 rounded-xl bg-teal-50/60 border border-teal-100">
                          <span className="text-[10px] font-semibold text-teal-800 block mb-0.5">
                            Ý nghĩa
                          </span>
                          <p className="text-xs sm:text-sm lg:text-base font-semibold text-slate-900 line-clamp-3">
                            {currentCard.meanings.length > 0
                              ? currentCard.meanings.join(', ')
                              : 'Chưa cập nhật nghĩa'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-5 items-center">
                      {/* Left Column: Compound Word + Reading + Han-Viet */}
                      <div className="sm:col-span-6 text-center sm:border-r sm:border-slate-100 sm:pr-4 space-y-1">
                        <div className="font-kanji font-black text-4xl sm:text-5xl lg:text-6xl text-teal-900 leading-tight">
                          {currentCard.word}
                        </div>
                        {currentCard.reading && (
                          <div className="font-mono text-sm sm:text-base font-bold text-slate-700">
                            {currentCard.reading}
                          </div>
                        )}
                        {currentCard.wordHanViet && (
                          <div className="text-xs sm:text-sm font-bold text-teal-700">
                            {currentCard.wordHanViet}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Meaning + Root Kanji */}
                      <div className="sm:col-span-6 space-y-2.5">
                        <div className="p-3 sm:p-4 rounded-xl bg-teal-50/60 border border-teal-100 text-center sm:text-left">
                          <span className="text-[10px] font-semibold text-teal-800 block mb-0.5">
                            Nghĩa tiếng Việt
                          </span>
                          <p className="text-sm sm:text-base lg:text-lg font-bold text-slate-900">
                            {currentCard.wordMeaning}
                          </p>
                        </div>

                        <div className="text-center sm:text-left text-xs text-slate-500">
                          Chữ gốc:{' '}
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
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card Footer Hint */}
              <div className="flex items-center justify-center text-[11px] text-slate-400 shrink-0">
                {isFlipped ? (
                  <span>Chọn mức đánh giá bên dưới (1 · 2 · 3)</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3 h-3" />
                    <span>Lật thẻ</span>
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Right Arrow */}
            <button
              type="button"
              onClick={handleNextCard}
              disabled={currentIndex >= queue.length - 1}
              className="hidden sm:flex w-11 h-11 rounded-full bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-600 hover:text-teal-800 disabled:opacity-30 disabled:pointer-events-none items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
              title="Thẻ tiếp theo (→)"
              aria-label="Thẻ tiếp theo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 3. Bottom Thumb-Zone Action Bar (aligned with Card width) */}
          <div className="w-full max-w-[480px] md:max-w-[600px] lg:max-w-[680px] mx-auto space-y-2 shrink-0">
            {!isFlipped ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevCard}
                  disabled={currentIndex <= 0}
                  className="sm:hidden min-w-[44px] h-11 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 flex items-center justify-center shrink-0"
                  aria-label="Thẻ trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  className="flex-1 h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Hiện đáp án (Space)
                </button>

                <button
                  type="button"
                  onClick={handleNextCard}
                  disabled={currentIndex >= queue.length - 1}
                  className="sm:hidden min-w-[44px] h-11 rounded-xl bg-white border border-slate-200 text-slate-700 disabled:opacity-30 flex items-center justify-center shrink-0"
                  aria-label="Thẻ tiếp theo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleRate('hard')}
                    className="min-h-[48px] py-2 px-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 transition-colors cursor-pointer flex flex-col items-center justify-center"
                  >
                    <span className="flex items-center gap-1 text-xs sm:text-sm font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>1. Khó</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-rose-700">
                      {intervals.hard}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate('good')}
                    className="min-h-[48px] py-2 px-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900 transition-colors cursor-pointer flex flex-col items-center justify-center"
                  >
                    <span className="flex items-center gap-1 text-xs sm:text-sm font-bold">
                      <ThumbsUp className="w-3.5 h-3.5 text-sky-600" />
                      <span>2. Tốt</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-sky-700">
                      {intervals.good}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate('easy')}
                    className="min-h-[48px] py-2 px-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors cursor-pointer flex flex-col items-center justify-center"
                  >
                    <span className="flex items-center gap-1 text-xs sm:text-sm font-bold">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>3. Dễ</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-emerald-700">
                      {intervals.easy}
                    </span>
                  </button>
                </div>

                {/* Mobile Prev/Next strip when flipped */}
                <div className="flex sm:hidden items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePrevCard}
                    disabled={currentIndex <= 0}
                    className="flex-1 h-9 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-30 flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Thẻ trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCard}
                    disabled={currentIndex >= queue.length - 1}
                    className="flex-1 h-9 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-30 flex items-center justify-center gap-1"
                  >
                    <span>Thẻ sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
