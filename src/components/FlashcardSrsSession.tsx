import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
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
import {
  CardExampleSentence,
  FlashcardReviewItem,
  ReviewFilterMode,
  SrsRating,
} from '../types/deck';
import { previewNextIntervals } from '../utils/srsAlgorithm';
import { speakJapanese } from '../utils/speech';
import { extractUniqueKanji } from '../utils/kanji';
import { getKanjiInfo } from '../data/kanjiDictionary';
import {
  getStaticSentencesForKanji,
  loadKanjiSentencesStatic,
} from '../services/kanjiLevelService';

interface FlashcardSrsSessionProps {
  folderId: string;
  initialMode?: ReviewFilterMode;
  onlyDue?: boolean;
  onExit: () => void;
}

const isHanChar = (ch: string) => /\p{Script=Han}/u.test(ch);

function getFrontWordSizeClass(word: string): string {
  const len = Array.from(word || '').length;
  if (len <= 3) return 'text-5xl sm:text-7xl lg:text-8xl';
  if (len <= 5) return 'text-4xl sm:text-6xl lg:text-7xl';
  return 'text-3xl sm:text-5xl lg:text-6xl';
}

function getBackCompoundTextSizeClass(word: string): string {
  const len = Array.from(word || '').length;
  if (len <= 2) return 'text-4xl sm:text-5xl lg:text-6xl';
  if (len <= 4) return 'text-3xl sm:text-4xl lg:text-[44px]';
  if (len <= 6) return 'text-3xl sm:text-4xl lg:text-[40px]';
  return 'text-2xl sm:text-3xl lg:text-4xl';
}

function getBackCompoundWordSizeClass(word: string): string {
  const len = Array.from(word || '').length;
  const sizeClass = getBackCompoundTextSizeClass(word);
  return len <= 6 ? `${sizeClass} whitespace-nowrap` : `${sizeClass} break-keep`;
}

function renderHighlightedSentence(sentence: string, targets: string[]) {
  const target = targets.find((t) => t && sentence.includes(t));
  if (!target) return sentence;
  return sentence.split(target).map((seg, idx, arr) => (
    <React.Fragment key={idx}>
      {seg}
      {idx < arr.length - 1 && (
        <span className="text-teal-700 font-black underline decoration-teal-300 underline-offset-2">
          {target}
        </span>
      )}
    </React.Fragment>
  ));
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
  const { inspectedKanji, openKanjiPracticeModal } = useKanji();

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
  const [staticSentencesReady, setStaticSentencesReady] = useState(false);

  // Preload static sentences dictionary once for single-Kanji fallback when DB has no custom examples
  useEffect(() => {
    loadKanjiSentencesStatic()
      .then(() => setStaticSentencesReady(true))
      .catch(() => {});
  }, []);

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

  // All unique constituent Kanji inside current word (supports 1, 2, 3+ Kanji compounds)
  const constituentKanji = useMemo(() => {
    if (!currentCard) return [];
    const sourceText =
      currentCard.cardType === 'compound'
        ? currentCard.word || currentCard.kanji
        : currentCard.kanji;
    const extracted = extractUniqueKanji(sourceText);
    if (extracted.length > 0) {
      return extracted.map((k) => ({
        char: k.kanji,
        hanViet:
          k.detail?.hanViet ||
          getKanjiInfo(k.kanji)?.hanViet ||
          (k.kanji === currentCard.kanji ? currentCard.hanViet : ''),
      }));
    }
    return currentCard.kanji
      ? [
          {
            char: currentCard.kanji,
            hanViet: currentCard.hanViet || getKanjiInfo(currentCard.kanji)?.hanViet || '',
          },
        ]
      : [];
  }, [currentCard]);

  const constituentKanjiChars = useMemo(
    () => constituentKanji.map((k) => k.char),
    [constituentKanji]
  );

  const handleInspectKanjiChar = useCallback(
    (char: string) => {
      if (!char) return;
      const contextList =
        constituentKanjiChars.length > 0 ? constituentKanjiChars : [char];
      openKanjiPracticeModal(char, contextList);
    },
    [constituentKanjiChars, openKanjiPracticeModal]
  );

  // Resolve up to 2 example sentences: DB-stored examples first, static fallback for Kanji cards
  const resolvedExamples: CardExampleSentence[] = useMemo(() => {
    if (!currentCard) return [];
    if (currentCard.examples && currentCard.examples.length > 0) {
      return currentCard.examples.slice(0, 2);
    }
    if (currentCard.cardType === 'kanji' && staticSentencesReady) {
      const staticList = getStaticSentencesForKanji(currentCard.kanji, 2).filter(
        (ex) => ex.source === 'static' && ex.jp && ex.vi
      );
      return staticList.map((ex, idx) => ({
        id: `static-${currentCard.kanji}-${idx}`,
        jp: ex.jp,
        kana: ex.kana || '',
        vi: ex.vi,
      }));
    }
    return [];
  }, [currentCard, staticSentencesReady]);

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

  // Keyboard shortcuts: paused automatically when PracticeModal (inspectedKanji) is open on top
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (inspectedKanji) return;
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
  }, [
    inspectedKanji,
    currentCard,
    isFlipped,
    handleRate,
    handlePrevCard,
    handleNextCard,
    showConfig,
    onExit,
  ]);

  const highlightTargets = useMemo(() => {
    if (!currentCard) return [];
    const list: string[] = [];
    if (currentCard.cardType === 'compound' && currentCard.word) {
      list.push(currentCard.word);
    }
    if (currentCard.kanji) {
      list.push(currentCard.kanji);
    }
    return list;
  }, [currentCard]);

  return (
    <div
      onClick={onExit}
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Phiên ôn tập Flashcard"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-full max-h-[96dvh] sm:max-h-[92dvh] bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-2.5 sm:p-4 lg:p-5 flex flex-col gap-2 sm:gap-2.5 overflow-hidden"
      >
        {/* 1. Compact Top Control Bar + Progress */}
        <div className="space-y-2 shrink-0 w-full">
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
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[320px]">
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
                  <span className="font-semibold text-rose-700 block text-[11px]">
                    Khó (phút)
                  </span>
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
                  <span className="font-semibold text-sky-700 block text-[11px]">
                    Tốt (ngày)
                  </span>
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
                  <span className="font-semibold text-emerald-700 block text-[11px]">
                    Dễ (ngày)
                  </span>
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

        {/* 2. Expanded Responsive Card Stage + Action Group */}
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
                  className="px-3.5 py-2 text-xs sm:text-[13px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ôn lại tất cả</span>
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="px-4 py-2 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
                >
                  Quay lại bài học
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 sm:gap-2.5">
            {/* Card Row + Desktop Left/Right Arrows */}
            <div className="flex-1 min-h-0 w-full flex items-stretch justify-center gap-2 sm:gap-3">
              {/* Desktop Left Arrow */}
              <button
                type="button"
                onClick={handlePrevCard}
                disabled={currentIndex <= 0}
                className="hidden sm:flex self-center w-10 h-10 rounded-full bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-600 hover:text-teal-800 disabled:opacity-30 disabled:pointer-events-none items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
                title="Thẻ trước (←)"
                aria-label="Thẻ trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Expanded Flashcard Container: stretches full height & width inside modal on both Mobile & PC */}
              <div
                onClick={() => setIsFlipped((f) => !f)}
                className="flex-1 min-w-0 h-full bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-6 lg:p-7 flex flex-col justify-between cursor-pointer select-none transition-transform duration-150 overflow-hidden"
              >
                {/* Card Metadata Header */}
                <div className="flex items-center justify-between text-xs text-slate-500 shrink-0 pb-1.5 border-b border-slate-100">
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
                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Nghe phát âm tiếng Nhật"
                    aria-label="Nghe phát âm từ đang học"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Center Content (independently scrollable only if tall content exceeds frame) */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col py-2 sm:py-3">
                  {!isFlipped ? (
                    <div className="text-center space-y-3 my-auto px-2">
                      <div
                        className={`font-kanji font-black text-slate-900 tracking-wide leading-tight ${
                          currentCard.cardType === 'kanji'
                            ? 'text-7xl sm:text-8xl lg:text-9xl'
                            : getFrontWordSizeClass(currentCard.word || currentCard.kanji)
                        }`}
                      >
                        {currentCard.cardType === 'kanji'
                          ? currentCard.kanji
                          : currentCard.word}
                      </div>
                      <p className="text-xs text-slate-400">
                        Chạm vào thẻ hoặc nhấn Space để lật
                      </p>
                    </div>
                  ) : (
                    <div className="my-auto animate-in fade-in duration-150 space-y-3">
                      {currentCard.cardType === 'kanji' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-6 items-center">
                          {/* Left Column: Kanji + Han-Viet + Stroke Lookup */}
                          <div className="sm:col-span-5 flex sm:flex-col items-center sm:justify-center gap-3.5 sm:gap-2.5 sm:border-r sm:border-slate-100 sm:pr-5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectKanjiChar(currentCard.kanji);
                              }}
                              className="font-kanji font-black text-6xl sm:text-7xl lg:text-[84px] text-teal-900 hover:text-teal-700 leading-none shrink-0 rounded-2xl px-2 py-1 hover:bg-teal-50/70 transition-colors cursor-pointer"
                              title={`Nhấp để tra cứu chi tiết chữ ${currentCard.kanji}`}
                            >
                              {currentCard.kanji}
                            </button>
                            <div className="flex flex-col sm:items-center gap-1.5 min-w-0">
                              <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                {currentCard.hanViet || 'Chưa có Hán-Việt'}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInspectKanjiChar(currentCard.kanji);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors cursor-pointer w-fit"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                <span>Xem nét viết & Chi tiết</span>
                              </button>
                            </div>
                          </div>

                          {/* Right Column: On/Kun + Meaning + Example Sentences */}
                          <div className="sm:col-span-7 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[11px] font-semibold text-slate-500 block">
                                  Âm On
                                </span>
                                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm break-words">
                                  {currentCard.onReadings.length > 0
                                    ? currentCard.onReadings.slice(0, 3).join(', ')
                                    : '—'}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[11px] font-semibold text-slate-500 block">
                                  Âm Kun
                                </span>
                                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm break-words">
                                  {currentCard.kunReadings.length > 0
                                    ? currentCard.kunReadings.slice(0, 3).join(', ')
                                    : '—'}
                                </span>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                              <span className="text-[11px] font-semibold text-teal-800 block mb-0.5">
                                Ý nghĩa
                              </span>
                              <p className="text-sm sm:text-base font-bold text-slate-900">
                                {currentCard.meanings.length > 0
                                  ? currentCard.meanings.join(', ')
                                  : 'Chưa cập nhật nghĩa'}
                              </p>
                            </div>

                            {/* 2 Example Sentences (matching KanjiByLevelPage style) */}
                            {resolvedExamples.length > 0 && (
                              <div className="rounded-xl bg-slate-50 border border-slate-200/80 divide-y divide-slate-200/70">
                                {resolvedExamples.map((ex) => (
                                  <div
                                    key={ex.id}
                                    className="p-2.5 sm:p-3 flex items-start gap-2.5"
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        speakJapanese(ex.jp);
                                      }}
                                      className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-teal-700 bg-white hover:bg-teal-50 border border-slate-200 rounded-lg cursor-pointer shrink-0 shadow-2xs transition-colors"
                                      title="Nghe câu ví dụ"
                                      aria-label="Nghe câu ví dụ"
                                    >
                                      <Volume2 className="w-4 h-4" />
                                    </button>
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <p className="font-kanji text-sm font-medium text-slate-900 leading-snug break-words">
                                        {renderHighlightedSentence(ex.jp, highlightTargets)}
                                      </p>
                                      {ex.kana && (
                                        <p className="text-xs font-kanji text-teal-800 font-semibold leading-snug">
                                          {ex.kana}
                                        </p>
                                      )}
                                      <p className="text-xs text-slate-600 leading-snug">
                                        {ex.vi}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-6 items-center">
                          {/* Left Column: Compound Word (clickable Kanji chars) + Reading + Han-Viet + All Constituent Kanji Chips */}
                          <div className="sm:col-span-5 text-center sm:border-r sm:border-slate-100 sm:pr-5 space-y-2">
                            <div
                              className={`font-kanji font-black text-teal-900 leading-tight inline-flex items-baseline justify-center flex-wrap ${getBackCompoundWordSizeClass(
                                currentCard.word || ''
                              )}`}
                            >
                              {Array.from(currentCard.word || '').map((ch, idx) =>
                                isHanChar(ch) ? (
                                  <button
                                    key={`${ch}-${idx}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInspectKanjiChar(ch);
                                    }}
                                    className={`font-kanji font-black leading-tight ${getBackCompoundTextSizeClass(
                                      currentCard.word || ''
                                    )} hover:text-teal-700 hover:bg-teal-50 rounded-lg px-0.5 transition-colors cursor-pointer underline decoration-teal-300/70 decoration-2 underline-offset-4`}
                                    title={`Nhấp để tra cứu chữ ${ch}`}
                                  >
                                    {ch}
                                  </button>
                                ) : (
                                  <span key={`${ch}-${idx}`}>{ch}</span>
                                )
                              )}
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

                            {/* Interactive lookup buttons for every Kanji in compound word */}
                            {constituentKanji.length > 0 && (
                              <div className="pt-1 flex flex-col items-center gap-1.5">
                                <span className="text-[11px] text-slate-500">
                                  Nhấp chữ Kanji để tra cứu:
                                </span>
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                  {constituentKanji.map((k) => (
                                    <button
                                      key={k.char}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInspectKanjiChar(k.char);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-xs font-semibold text-slate-800 hover:text-teal-900 transition-colors cursor-pointer"
                                      title={`Xem chi tiết & nét viết chữ ${k.char}`}
                                    >
                                      <span className="font-kanji font-black text-sm text-teal-800">
                                        {k.char}
                                      </span>
                                      {k.hanViet && (
                                        <span className="text-[11px] font-bold text-slate-600">
                                          {k.hanViet}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Column: Meaning + 2 Practical Example Sentences */}
                          <div className="sm:col-span-7 space-y-2.5">
                            <div className="p-3 sm:p-3.5 rounded-xl bg-teal-50/60 border border-teal-100 text-center sm:text-left">
                              <span className="text-[11px] font-semibold text-teal-800 block mb-0.5">
                                Nghĩa tiếng Việt
                              </span>
                              <p className="text-sm sm:text-base lg:text-lg font-bold text-slate-900">
                                {currentCard.wordMeaning}
                              </p>
                            </div>

                            {resolvedExamples.length > 0 && (
                              <div className="space-y-1.5 text-left">
                                <div className="text-[11px] font-semibold text-slate-500">
                                  Ví dụ áp dụng ({resolvedExamples.length})
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200/80 divide-y divide-slate-200/70">
                                  {resolvedExamples.map((ex) => (
                                    <div
                                      key={ex.id}
                                      className="p-2.5 sm:p-3 flex items-start gap-2.5"
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          speakJapanese(ex.jp);
                                        }}
                                        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-teal-700 bg-white hover:bg-teal-50 border border-slate-200 rounded-lg cursor-pointer shrink-0 shadow-2xs transition-colors"
                                        title="Nghe câu ví dụ"
                                        aria-label="Nghe câu ví dụ"
                                      >
                                        <Volume2 className="w-4 h-4" />
                                      </button>
                                      <div className="space-y-0.5 min-w-0 flex-1">
                                        <p className="font-kanji text-sm font-medium text-slate-900 leading-snug break-words">
                                          {renderHighlightedSentence(
                                            ex.jp,
                                            highlightTargets
                                          )}
                                        </p>
                                        {ex.kana && (
                                          <p className="text-xs font-kanji text-teal-800 font-semibold leading-snug">
                                            {ex.kana}
                                          </p>
                                        )}
                                        <p className="text-xs text-slate-600 leading-snug">
                                          {ex.vi}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Hint */}
                <div className="flex items-center justify-center text-[11px] text-slate-400 shrink-0 pt-1.5 border-t border-slate-100/80">
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
                className="hidden sm:flex self-center w-10 h-10 rounded-full bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-600 hover:text-teal-800 disabled:opacity-30 disabled:pointer-events-none items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
                title="Thẻ tiếp theo (→)"
                aria-label="Thẻ tiếp theo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 3. Bottom Thumb-Zone Action Bar */}
            <div className="w-full space-y-2 shrink-0">
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
                    className="flex-1 h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-[13px] rounded-xl transition-colors cursor-pointer"
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
                      <span className="flex items-center gap-1 text-xs sm:text-[13px] font-bold">
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
                      <span className="flex items-center gap-1 text-xs sm:text-[13px] font-bold">
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
                      <span className="flex items-center gap-1 text-xs sm:text-[13px] font-bold">
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
                      className="flex-1 h-10 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-30 flex items-center justify-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Thẻ trước</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextCard}
                      disabled={currentIndex >= queue.length - 1}
                      className="flex-1 h-10 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-30 flex items-center justify-center gap-1"
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
