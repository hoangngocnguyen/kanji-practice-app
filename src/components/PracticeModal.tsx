import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Copy,
  Download,
  RefreshCw,
  Volume2,
  BookOpen,
  BookMarked,
  PlayCircle,
  PenTool,
  Layers3,
  Award,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Target,
  MessageSquareQuote,
  Ghost,
  Lightbulb,
  Undo2,
  SkipForward,
  Grid3X3,
  EyeOff
} from 'lucide-react';
import { KanjiItem, KanjiDetail } from '../types/kanji';
import { StrokeAnimation, MAZII_STROKE_COLORS } from './StrokeAnimation';
import {
  getFullKanjiDetail,
  getQuickLocalKanjiDetails,
  mergeKanjiDetails,
  enrichCompoundExamplesVietnamese,
  updateCachedKanjiExamples,
} from '../utils/kanjiApi';
import { extractUniqueKanji, isKanjiChar } from '../utils/kanji';
import { SINO_VIETNAMESE_MAP, getKanjiInfo } from '../data/kanjiDictionary';
import { speakJapanese } from '../utils/speech';
import { getJlptBadgeClass } from '../utils/colorUtils';
import { fetchKanjiSvg, saveKanjiSvgToCache } from '../utils/kanji';
import { KanjiGridOverlay } from './KanjiGridOverlay';
import { KanjiRadicalTree } from './KanjiRadicalTree';
import { MnemonicStoryCard } from './MnemonicStoryCard';
import { getKanjiDecomposition } from '../data/radicalsData';
import { fetchAndDecomposeKanji } from '../utils/kanjiSubElementParser';
import { KanjiDecomposition } from '../types/radical';
import { KanjiSvgView } from './KanjiSvgView';
import {
  evaluateUserStroke,
  sampleSvgPathPoints,
  Point,
  StrokeEvaluationResult,
  StrokeStrictness,
} from '../utils/strokeMatcher';
import {
  getStaticSentencesForKanji,
  loadKanjiSentencesStatic,
  formatTatoebaFuriganaPlain,
  KanjiExampleSentence,
} from '../services/kanjiLevelService';
import {
  recordKanjiMistake,
  recordKanjiSuccess,
} from '../services/mistakeBankService';

const STACK_Z_CLASSES = ['z-[70]', 'z-[80]', 'z-[90]', 'z-[100]'];

interface PracticeModalProps {
  item: KanjiItem | null;
  kanjiList?: KanjiItem[];
  onNavigateKanji?: (item: KanjiItem) => void;
  showGrid?: boolean;
  onToggleGrid?: (show: boolean) => void;
  onClose: () => void;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
  onSelectKanji?: (char: string) => void;
  onDetailLoaded?: (kanji: string, detail: KanjiDetail) => void;
  stackDepth?: number;
}

type TabType = 'animation' | 'dictionary' | 'radicals' | 'practice';

export const PracticeModal: React.FC<PracticeModalProps> = ({
  item,
  kanjiList,
  onNavigateKanji,
  showGrid = false,
  onToggleGrid,
  onClose,
  onCopyImage,
  onDownloadPng,
  onSelectKanji,
  onDetailLoaded,
  stackDepth = 0,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('animation');
  const [detail, setDetail] = useState<KanjiDetail | null>(null);
  const [decomposition, setDecomposition] = useState<KanjiDecomposition | null>(null);
  const [exampleSentences, setExampleSentences] = useState<KanjiExampleSentence[]>([]);
  const [nestedKanjiItem, setNestedKanjiItem] = useState<KanjiItem | null>(null);
  const [isTranslatingExamples, setIsTranslatingExamples] = useState(false);
  const onDetailLoadedRef = useRef(onDetailLoaded);
  onDetailLoadedRef.current = onDetailLoaded;

  const openNestedKanji = useCallback(
    (char: string) => {
      if (!isKanjiChar(char)) return;
      if (stackDepth >= 4) {
        if (onSelectKanji) onSelectKanji(char);
        return;
      }
      const created = extractUniqueKanji(char)[0];
      if (!created) return;
      setNestedKanjiItem(created);
    },
    [stackDepth, onSelectKanji]
  );

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0f766e');

  // Stroke Order & Direction Verification State
  const [practiceSubMode, setPracticeSubMode] = useState<'guided' | 'blind' | 'free'>('guided');
  const [practiceStrictness, setPracticeStrictness] = useState<StrokeStrictness>('normal');
  const [showGhostGuide, setShowGhostGuide] = useState<boolean>(true);
  const [showHintStroke, setShowHintStroke] = useState<boolean>(false);
  const [showStartMarker, setShowStartMarker] = useState<boolean>(true);
  const [localShowGrid, setLocalShowGrid] = useState<boolean>(showGrid);
  const [isWrongFlash, setIsWrongFlash] = useState<boolean>(false);
  const [practiceStrokes, setPracticeStrokes] = useState<Array<{ id: string; d: string; index: number }>>([]);
  const [currentStrokeIdx, setCurrentStrokeIdx] = useState<number>(0);
  const [completedStrokeIndices, setCompletedStrokeIndices] = useState<number[]>([]);
  const [strokeScores, setStrokeScores] = useState<number[]>([]);
  const [lastEvaluation, setLastEvaluation] = useState<StrokeEvaluationResult | null>(null);
  const [isPracticeFinished, setIsPracticeFinished] = useState<boolean>(false);
  const [strokeStartPoints, setStrokeStartPoints] = useState<Point[]>([]);

  // User drawn points of current stroke & cancelable fail-clear timer
  const userPointsRef = useRef<Point[]>([]);
  const failClearTimerRef = useRef<number | null>(null);
  const consecutiveWritingFailsRef = useRef<number>(0);
  const hadWritingFailOnCharRef = useRef<boolean>(false);

  useEffect(() => {
    setLocalShowGrid(showGrid);
  }, [showGrid]);

  const effectiveShowGrid = onToggleGrid ? showGrid : localShowGrid;
  const handleTogglePracticeGrid = () => {
    const nextVal = !effectiveShowGrid;
    setLocalShowGrid(nextVal);
    onToggleGrid?.(nextVal);
  };

  const clearFailTimer = useCallback(() => {
    if (failClearTimerRef.current) {
      window.clearTimeout(failClearTimerRef.current);
      failClearTimerRef.current = null;
    }
  }, []);

  // Clear canvas helper
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const resetPracticeTest = useCallback(() => {
    clearFailTimer();
    setCurrentStrokeIdx(0);
    setCompletedStrokeIndices([]);
    setStrokeScores([]);
    setLastEvaluation(null);
    setIsPracticeFinished(false);
    setShowHintStroke(false);
    setIsWrongFlash(false);
    consecutiveWritingFailsRef.current = 0;
    hadWritingFailOnCharRef.current = false;
    userPointsRef.current = [];
    clearCanvas();
  }, [clearCanvas, clearFailTimer]);

  const switchPracticeMode = useCallback(
    (nextMode: 'guided' | 'blind' | 'free') => {
      clearFailTimer();
      setIsWrongFlash(false);
      setPracticeSubMode(nextMode);
      if (nextMode === 'guided') {
        resetPracticeTest();
        setShowGhostGuide(true);
        setShowStartMarker(true);
      } else if (nextMode === 'blind') {
        resetPracticeTest();
        setShowGhostGuide(false);
        setShowStartMarker(false);
      } else {
        setLastEvaluation(null);
        setShowHintStroke(false);
        userPointsRef.current = [];
        clearCanvas();
      }
    },
    [clearCanvas, clearFailTimer, resetPracticeTest]
  );

  const lastKanjiRef = useRef<string | null>(null);

  useEffect(() => {
    if (!item) {
      lastKanjiRef.current = null;
      return;
    }

    const isKanjiChanged = lastKanjiRef.current !== item.kanji;
    lastKanjiRef.current = item.kanji;

    if (isKanjiChanged) {
      setActiveTab('animation');
      setNestedKanjiItem(null);
      resetPracticeTest();
      setShowGhostGuide(practiceSubMode !== 'blind');
      setShowStartMarker(practiceSubMode === 'guided');
    }
    // Seed immediately with any catalog detail already attached to item
    setDetail(item.detail || null);

    let isMounted = true;
    const targetKanji = item.kanji;
    const itemDetailFallback = item.detail;

    // Seed nhanh từ dữ liệu cục bộ nếu mở popup chồng lớp từ từ ghép
    getQuickLocalKanjiDetails([targetKanji])
      .then((quickMap) => {
        if (isMounted && quickMap[targetKanji]) {
          setDetail((prev) => mergeKanjiDetails(prev, quickMap[targetKanji]) || quickMap[targetKanji]);
        }
      })
      .catch(() => {});

    getFullKanjiDetail(targetKanji)
      .then(async (res) => {
        if (!isMounted || !res) return;
        const merged = mergeKanjiDetails(res, itemDetailFallback) || res;
        setDetail((prev) => mergeKanjiDetails(merged, prev) || merged);
        onDetailLoadedRef.current?.(targetKanji, merged);

        if (merged.examples && merged.examples.length > 0) {
          setIsTranslatingExamples(true);
          try {
            const translatedExamples = await enrichCompoundExamplesVietnamese(merged.examples);
            if (!isMounted) return;
            updateCachedKanjiExamples(targetKanji, translatedExamples);
            const enrichedDetail: KanjiDetail = {
              ...merged,
              examples: translatedExamples,
            };
            setDetail((prev) =>
              prev ? { ...prev, examples: translatedExamples } : enrichedDetail
            );
            onDetailLoadedRef.current?.(targetKanji, enrichedDetail);
          } finally {
            if (isMounted) setIsTranslatingExamples(false);
          }
        }
      })
      .catch(() => {});

    // Load pre-bundled static sentences instantaneously (0ms once JSON is cached)
    const immediateEx = getStaticSentencesForKanji(item.kanji, 4);
    setExampleSentences(immediateEx);
    if (immediateEx.length === 0) {
      loadKanjiSentencesStatic()
        .then(() => {
          if (isMounted) {
            setExampleSentences(getStaticSentencesForKanji(item.kanji, 4));
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [item]);

  // Load SVG strokes for interactive guided practice
  useEffect(() => {
    if (!item) return;

    let isCancelled = false;
    setPracticeStrokes([]);
    setStrokeStartPoints([]);

    async function loadStrokesForPractice() {
      try {
        const text = await fetchKanjiSvg(item!.svgUrl, item!.hex);
        if (isCancelled) return;
        saveKanjiSvgToCache(item!.svgUrl, text);

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const pathElements = Array.from(doc.querySelectorAll('path[d]'));
        const parsed = pathElements.map((el, i) => ({
          id: el.getAttribute('id') || `p-stroke-${i}`,
          d: el.getAttribute('d') || '',
          index: i,
        }));

        setPracticeStrokes(parsed);

        // Precompute start points in 109x109 space
        const startPoints = parsed.map((s) => {
          const pts = sampleSvgPathPoints(s.d, 4);
          return pts[0] || { x: 50, y: 50 };
        });
        setStrokeStartPoints(startPoints);
      } catch (err) {
        console.error('Failed to load strokes for practice test:', err);
      }
    }

    loadStrokesForPractice();

    return () => {
      isCancelled = true;
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;

    let isMounted = true;
    // Set immediate initial local fallback
    setDecomposition(getKanjiDecomposition(item.kanji, detail?.hanViet));

    // Fetch full KanjiVG SVG decomposition online for 100% complete coverage
    fetchAndDecomposeKanji(item.kanji, detail?.hanViet)
      .then((res) => {
        if (isMounted) {
          setDecomposition(res);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [item, detail?.hanViet]);

  // Navigation indexing across active Kanji list
  const currentIndex =
    kanjiList && item
      ? kanjiList.findIndex((k) => k.kanji === item.kanji || k.hex === item.hex)
      : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = kanjiList && currentIndex >= 0 && currentIndex < kanjiList.length - 1;

  // Compute ~5 Kanji items centered around current item for quick navigation carousel
  const surroundingKanjiWindow = useMemo(() => {
    if (!kanjiList || kanjiList.length === 0 || currentIndex < 0) return [];

    const maxItems = 5;
    let start = Math.max(0, currentIndex - Math.floor(maxItems / 2));
    let end = start + maxItems - 1;

    if (end >= kanjiList.length) {
      end = kanjiList.length - 1;
      start = Math.max(0, end - maxItems + 1);
    }

    return kanjiList.slice(start, end + 1);
  }, [kanjiList, currentIndex]);

  const goToPrev = useCallback(() => {
    if (kanjiList && item) {
      const idx = kanjiList.findIndex((k) => k.kanji === item.kanji || k.hex === item.hex);
      if (idx > 0 && onNavigateKanji) {
        onNavigateKanji(kanjiList[idx - 1]);
      }
    }
  }, [kanjiList, item, onNavigateKanji]);

  const goToNext = useCallback(() => {
    if (kanjiList && item) {
      const idx = kanjiList.findIndex((k) => k.kanji === item.kanji || k.hex === item.hex);
      if (idx >= 0 && idx < kanjiList.length - 1 && onNavigateKanji) {
        onNavigateKanji(kanjiList[idx + 1]);
      }
    }
  }, [kanjiList, item, onNavigateKanji]);

  useEffect(() => {
    if (!item) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      // Nhường phím điều hướng & Esc cho popup đang mở đè lên trên
      if (nestedKanjiItem) return;

      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        const target = event.target as HTMLElement;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        if (hasPrev) {
          event.preventDefault();
          goToPrev();
        }
      } else if (event.key === 'ArrowRight') {
        const target = event.target as HTMLElement;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        if (hasNext) {
          event.preventDefault();
          goToNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, nestedKanjiItem, onClose, hasPrev, hasNext, goToPrev, goToNext]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    return () => {
      clearFailTimer();
    };
  }, [clearFailTimer]);

  if (!item) return null;

  // Drawing handlers for Practice tab with unified Pointer Events and 1:1 coordinate mapping
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (practiceSubMode !== 'free' && (isPracticeFinished || practiceStrokes.length === 0)) return;

    const pt = getCanvasPoint(e);
    if (!pt) return;

    // Cancel pending auto-clear from a previous failed stroke so quick retries are never wiped
    if (practiceSubMode !== 'free') {
      clearFailTimer();
      clearCanvas();
      setIsWrongFlash(false);
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
    userPointsRef.current = [pt];
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = e.pointerType === 'pen' ? 6.5 : 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const strokeColor =
      practiceSubMode !== 'free'
        ? MAZII_STROKE_COLORS[currentStrokeIdx % MAZII_STROKE_COLORS.length] || penColor
        : penColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    userPointsRef.current.push(pt);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
    }

    if (
      practiceSubMode !== 'free' &&
      practiceStrokes.length > 0 &&
      !isPracticeFinished &&
      currentStrokeIdx < practiceStrokes.length
    ) {
      if (userPointsRef.current.length < 3) {
        clearCanvas();
        userPointsRef.current = [];
        return;
      }

      const currentStroke = practiceStrokes[currentStrokeIdx];
      if (!currentStroke) return;

      const canvas = canvasRef.current;
      const evalWidth = canvas?.width || 280;
      const evalHeight = canvas?.height || 280;

      const evalResult = evaluateUserStroke(
        userPointsRef.current,
        currentStroke.d,
        evalWidth,
        evalHeight,
        { strictness: practiceStrictness }
      );
      setLastEvaluation(evalResult);

      if (evalResult.isPass) {
        // Synchronous 0ms transition: convert passed stroke to vector ink & advance immediately
        consecutiveWritingFailsRef.current = 0;
        const nextScores = [...strokeScores, evalResult.score];
        setStrokeScores(nextScores);
        setCompletedStrokeIndices((prev) => [...prev, currentStrokeIdx]);
        setShowHintStroke(false);
        setIsWrongFlash(false);
        userPointsRef.current = [];
        clearCanvas();

        if (currentStrokeIdx + 1 >= practiceStrokes.length) {
          setIsPracticeFinished(true);
          if (!hadWritingFailOnCharRef.current) {
            recordKanjiSuccess(item.kanji);
          }
        } else {
          setCurrentStrokeIdx((prev) => prev + 1);
        }
      } else {
        consecutiveWritingFailsRef.current += 1;
        hadWritingFailOnCharRef.current = true;
        if (consecutiveWritingFailsRef.current === 2) {
          recordKanjiMistake(item.kanji, 'writing');
        }
        setIsWrongFlash(true);
        clearFailTimer();
        failClearTimerRef.current = window.setTimeout(() => {
          clearCanvas();
          setIsWrongFlash(false);
          failClearTimerRef.current = null;
        }, 280);
      }
    }
  };

  const undoLastStroke = () => {
    if (practiceSubMode === 'free' || completedStrokeIndices.length === 0) return;
    clearFailTimer();
    clearCanvas();
    setIsWrongFlash(false);
    setCompletedStrokeIndices((prev) => prev.slice(0, -1));
    setStrokeScores((prev) => prev.slice(0, -1));
    setCurrentStrokeIdx((prev) => Math.max(0, prev - 1));
    setIsPracticeFinished(false);
    setLastEvaluation(null);
    setShowHintStroke(false);
    userPointsRef.current = [];
  };

  const skipCurrentStroke = () => {
    if (isPracticeFinished || currentStrokeIdx >= practiceStrokes.length) return;
    clearFailTimer();
    clearCanvas();
    setIsWrongFlash(false);
    setStrokeScores((prev) => [...prev, 60]);
    setCompletedStrokeIndices((prev) => [...prev, currentStrokeIdx]);
    setShowHintStroke(false);
    setLastEvaluation(null);
    userPointsRef.current = [];
    if (currentStrokeIdx + 1 >= practiceStrokes.length) {
      setIsPracticeFinished(true);
    } else {
      setCurrentStrokeIdx((prev) => prev + 1);
    }
  };

  const backdropZClass = STACK_Z_CLASSES[Math.min(stackDepth, STACK_Z_CLASSES.length - 1)];

  return (
    <>
    <div
      className={`fixed inset-0 max-h-[100dvh] ${backdropZClass} bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden overscroll-contain`}
      onClick={handleBackdropClick}
    >
      <div
        className={`relative ${
          stackDepth > 0 ? 'max-w-2xl' : 'max-w-3xl'
        } w-full h-full max-h-full min-h-0 flex items-center justify-center pointer-events-none`}
      >
        {/* Desktop Floating Left Arrow */}
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="pointer-events-auto hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 w-11 h-11 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-full shadow-xl items-center justify-center border border-slate-200/90 transition-all hover:scale-110 active:scale-95 cursor-pointer z-30"
            title="Chữ Kanji trước (Phím ←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Floating Right Arrow */}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="pointer-events-auto hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 w-11 h-11 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-full shadow-xl items-center justify-center border border-slate-200/90 transition-all hover:scale-110 active:scale-95 cursor-pointer z-30"
            title="Chữ Kanji tiếp theo (Phím →)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div
          className="pointer-events-auto bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-h-full sm:max-h-[90dvh] min-h-0 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header with Kanji & Sino-Vietnamese Reading */}
          <div className="shrink-0 flex items-start sm:items-center justify-between gap-2 px-3.5 sm:px-6 py-2.5 sm:py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                onClick={() => speakJapanese(item.kanji)}
                className="font-kanji font-black text-4xl sm:text-5xl text-teal-700 leading-none cursor-pointer hover:scale-105 transition-transform shrink-0"
                title="Click để nghe phát âm tiếng Nhật"
              >
                {item.kanji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-wide leading-snug break-words">
                    {detail?.hanViet ? `Hán-Việt: ${detail.hanViet}` : `Chữ ${item.kanji}`}
                  </h4>
                  {detail?.jlpt && (
                    <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md border shrink-0 ${getJlptBadgeClass(detail.jlpt)}`}>
                      {detail.jlpt}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => speakJapanese(item.kanji)}
                    className="p-1 rounded-lg text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer shrink-0"
                    title="Nghe phát âm"
                    aria-label="Nghe phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-0.5 truncate">
                  U+{item.hex.toUpperCase()} • #{item.id}
                  {detail?.strokeCount ? ` • ${detail.strokeCount} nét` : ''}
                </p>
              </div>
            </div>

            {/* Header Right Actions: Desktop 5-Kanji Carousel Strip & Close */}
            <div className="flex items-center gap-2 shrink-0">
              {kanjiList && kanjiList.length > 1 && currentIndex >= 0 && (
                <div className="hidden md:flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 rounded-2xl p-1 shadow-inner">
                  {/* Prev Button */}
                  <button
                    type="button"
                    onClick={goToPrev}
                    disabled={!hasPrev}
                    className="p-1 text-slate-500 hover:text-teal-800 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                    title="Chữ Kanji trước (Phím mũi tên Trái ←)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* 5-Kanji Chips Window with Middle Highlight */}
                  <div className="flex items-center gap-1">
                    {surroundingKanjiWindow.map((kItem) => {
                      const isSelected = kItem.kanji === item.kanji;
                      const hanViet = kItem.detail?.hanViet;

                      return (
                        <button
                          key={kItem.kanji}
                          type="button"
                          onClick={() => onNavigateKanji && onNavigateKanji(kItem)}
                          className={`flex items-center justify-center px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                            isSelected
                              ? 'bg-teal-700 text-white shadow-md border border-teal-800 scale-105 ring-2 ring-teal-500/30 font-black min-w-[38px]'
                              : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/90 hover:border-teal-300 min-w-[34px]'
                          }`}
                          title={`Chuyển tới chữ ${kItem.kanji}${hanViet ? ` (${hanViet})` : ''}`}
                        >
                          <span className="font-kanji text-base leading-none">
                            {kItem.kanji}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={goToNext}
                    disabled={!hasNext}
                    className="p-1 text-slate-500 hover:text-teal-800 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                    title="Chữ Kanji tiếp theo (Phím mũi tên Phải →)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <span className="pl-1 pr-1.5 text-xs font-mono font-bold text-slate-500 border-l border-slate-200 select-none tabular-nums">
                    {currentIndex + 1}/{kanjiList.length}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Đóng (Phím Esc)"
                aria-label="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile 5-Kanji Carousel Strip (Placed cleanly below Kanji header and above Tabs) */}
          {kanjiList && kanjiList.length > 1 && currentIndex >= 0 && (
            <div className="shrink-0 md:hidden flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-1 flex-1 min-w-0 justify-center bg-slate-100/90 border border-slate-200/80 rounded-xl p-1">
                <button
                  type="button"
                  onClick={goToPrev}
                  disabled={!hasPrev}
                  className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                  title="Chữ Kanji trước"
                  aria-label="Chữ Kanji trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-1 overflow-x-auto scrollbar-none">
                  {surroundingKanjiWindow.map((kItem) => {
                    const isSelected = kItem.kanji === item.kanji;
                    const hanViet = kItem.detail?.hanViet;

                    return (
                      <button
                        key={kItem.kanji}
                        type="button"
                        onClick={() => onNavigateKanji && onNavigateKanji(kItem)}
                        className={`flex items-center justify-center px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold shrink-0 ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-xs border border-teal-800 font-black min-w-[34px]'
                            : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200/90 min-w-[32px]'
                        }`}
                        title={`Chuyển tới chữ ${kItem.kanji}${hanViet ? ` (${hanViet})` : ''}`}
                      >
                        <span className="font-kanji text-sm leading-none">
                          {kItem.kanji}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={goToNext}
                  disabled={!hasNext}
                  className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-white disabled:opacity-25 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                  title="Chữ Kanji tiếp theo"
                  aria-label="Chữ Kanji tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-[11px] font-mono font-bold text-slate-500 shrink-0 tabular-nums px-1">
                {currentIndex + 1}/{kanjiList.length}
              </span>
            </div>
          )}

        {/* Tab Navigation with color indicators */}
        <div className="shrink-0 flex items-center border-b border-slate-200 bg-slate-100/50 p-1 sm:p-1.5 gap-1 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('animation')}
            className={`flex-1 min-w-0 sm:min-w-[90px] py-2 px-1 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'animation'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Hoạt ảnh nét vẽ</span>
            <span className="sm:hidden text-[11px] truncate">Hoạt ảnh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            className={`flex-1 min-w-0 sm:min-w-[90px] py-2 px-1 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dictionary'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Nghĩa &amp; Từ ghép</span>
            <span className="sm:hidden text-[11px] truncate">Tra nghĩa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('radicals')}
            className={`flex-1 min-w-0 sm:min-w-[90px] py-2 px-1 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'radicals'
                ? 'bg-cyan-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers3 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'radicals' ? 'text-cyan-100' : 'text-cyan-500'}`} />
            <span className="hidden sm:inline">Bộ thủ &amp; Mẹo nhớ</span>
            <span className="sm:hidden text-[11px] truncate">Bộ thủ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`flex-1 min-w-0 sm:min-w-[90px] py-2 px-1 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'practice'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Tập viết tay</span>
            <span className="sm:hidden text-[11px] truncate">Viết tay</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-4 sm:space-y-5">
          {/* TAB 1: STROKE ANIMATION (Kept mounted via CSS so drawn strokes remain intact across tab switches) */}
          <div className={activeTab === 'animation' ? 'space-y-4 sm:space-y-5' : 'hidden'}>
            <StrokeAnimation
              svgUrl={item.svgUrl}
              kanji={item.kanji}
              hex={item.hex}
              size={280}
              showGrid={showGrid}
              onToggleGrid={onToggleGrid}
              isTabActive={activeTab === 'animation'}
            />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={() => onCopyImage(item)}
                className="py-2.5 sm:py-3 px-3 sm:px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer active:scale-95 transition-all min-h-[40px]"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span>Sao chép ảnh</span>
              </button>

              <button
                onClick={() => onDownloadPng(item)}
                className="py-2.5 sm:py-3 px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-colors border border-slate-200/80 min-h-[40px]"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Tải ảnh PNG</span>
              </button>
            </div>
          </div>

          {/* TAB 2: DICTIONARY & EXAMPLES */}
          {activeTab === 'dictionary' && (
            <div className="space-y-5">
              {/* Meaning & Readings Box */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Ý nghĩa tiếng Việt:
                  </span>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {detail?.meanings && detail.meanings.length > 0
                      ? detail.meanings.join(', ')
                      : 'Đang cập nhật...'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      Âm Onyomi (Hán):
                    </span>
                    <div className="font-kanji font-bold text-slate-800 text-sm mt-1">
                      {detail?.on && detail.on.length > 0 ? detail.on.join('、 ') : '—'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Âm Kunyomi (Thuần Nhật):
                    </span>
                    <div className="font-kanji font-bold text-slate-800 text-sm mt-1">
                      {detail?.kun && detail.kun.length > 0 ? detail.kun.join('、 ') : '—'}
                    </div>
                  </div>
                </div>

                {detail?.radical && (
                  <div className="text-xs text-slate-500 pt-1">
                    Bộ thủ: <strong className="text-slate-700">{detail.radical}</strong>
                  </div>
                )}
              </div>

              {/* Compound Words Examples */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <BookMarked className="w-4 h-4 text-teal-700" />
                    <span>Từ ghép ví dụ thực tế ({detail?.examples.length || 0})</span>
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    Bấm chữ Kanji để tra · Di chuột xem Hán-Việt
                  </span>
                </div>

                {detail?.examples && detail.examples.length > 0 ? (
                  <div className="space-y-2">
                    {detail.examples.map((ex, idx) => (
                      <div
                        key={`${ex.word}-${idx}`}
                        className="p-3 bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200/80 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                            <span className="inline-flex items-baseline flex-wrap">
                              {Array.from(ex.word).map((char, cIdx) => {
                                if (!isKanjiChar(char)) {
                                  return (
                                    <span
                                      key={cIdx}
                                      className="font-kanji font-bold text-base sm:text-[17px] text-slate-800 leading-snug"
                                    >
                                      {char}
                                    </span>
                                  );
                                }
                                const charHv =
                                  SINO_VIETNAMESE_MAP[char] ||
                                  getKanjiInfo(char)?.hanViet ||
                                  '';
                                const isCurrentKanji = char === item.kanji;
                                return (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => openNestedKanji(char)}
                                    title={
                                      charHv
                                        ? `${char} (${charHv}) — Bấm để xem chi tiết`
                                        : `Bấm để xem chi tiết chữ ${char}`
                                    }
                                    className={`font-kanji font-bold text-base sm:text-[17px] leading-snug underline decoration-2 underline-offset-4 rounded px-0.5 transition-colors cursor-pointer ${
                                      isCurrentKanji
                                        ? 'text-teal-700 decoration-teal-400 hover:bg-teal-50'
                                        : 'text-slate-900 decoration-slate-300 decoration-dotted hover:text-teal-700 hover:decoration-teal-400 hover:bg-teal-50'
                                    }`}
                                  >
                                    {char}
                                  </button>
                                );
                              })}
                            </span>

                            {ex.reading && (
                              <span className="text-xs font-kanji text-slate-500">
                                【{ex.reading}】
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-[13px] text-slate-700 font-medium leading-relaxed">
                            {ex.meaning ||
                              (isTranslatingExamples ? 'Đang dịch nghĩa tiếng Việt...' : '')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => speakJapanese(ex.word)}
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title={`Nghe phát âm "${ex.word}"`}
                          aria-label={`Nghe phát âm ${ex.word}`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-200/60">
                    Chưa có từ ghép mẫu cho chữ này. Bạn có thể tham khảo câu ví dụ thực tế bên dưới.
                  </div>
                )}
              </div>

              {/* Real Example Sentences (Pre-bundled Static Nhật - Việt) */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200/70">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquareQuote className="w-4 h-4 text-teal-600" />
                    <span>Câu ví dụ thực tế ({exampleSentences.length})</span>
                  </h5>
                  <span className="text-[11px] text-slate-400">Click loa để nghe</span>
                </div>

                {exampleSentences.length > 0 ? (
                  <div className="space-y-2">
                    {exampleSentences.map((sent) => {
                      const parts = sent.jp.split(item.kanji);
                      const furiganaNote = formatTatoebaFuriganaPlain(sent.furigana);
                      return (
                        <div
                          key={sent.id}
                          className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3 transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="font-kanji text-sm sm:text-[15px] text-slate-900 font-medium leading-relaxed break-words">
                              {parts.map((part, pIdx) => (
                                <React.Fragment key={pIdx}>
                                  {part}
                                  {pIdx < parts.length - 1 && (
                                    <span className="text-teal-700 font-black underline decoration-teal-300 decoration-2 underline-offset-4">
                                      {item.kanji}
                                    </span>
                                  )}
                                </React.Fragment>
                              ))}
                            </p>
                            {furiganaNote && furiganaNote !== sent.jp && (
                              <p className="text-[11px] text-slate-500 font-sans truncate">
                                {furiganaNote}
                              </p>
                            )}
                            {sent.kana && (
                              <p className="text-[11px] font-kanji text-teal-800 font-semibold leading-none">
                                {sent.kana}
                              </p>
                            )}
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {sent.vi}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => speakJapanese(sent.jp)}
                            className="p-2 text-slate-400 hover:text-teal-700 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-slate-200"
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-200/60">
                    Chưa tìm thấy câu ví dụ ngắn phù hợp cho chữ "{item.kanji}".
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: RADICALS & MNEMONIC DECOMPOSITION */}
          {activeTab === 'radicals' && (
            <div className="space-y-4">
              {decomposition ? (
                <>
                  <KanjiRadicalTree
                    decomposition={decomposition}
                    onSelectKanji={(k) => openNestedKanji(k)}
                  />
                  <MnemonicStoryCard decomposition={decomposition} />
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                  Đang bóc tách đầy đủ cấu trúc bộ thủ cho chữ {item.kanji}...
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRACING & WRITING PRACTICE (Kept mounted via CSS so handwriting canvas stays intact across tab switches) */}
          <div className={activeTab === 'practice' ? 'space-y-4' : 'hidden'}>
              {/* 3-Mode Segmented Control */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => switchPracticeMode('guided')}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    practiceSubMode === 'guided'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị bóng mờ theo nét chuẩn và chấm điểm từng nét"
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>Có mẫu mờ</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPracticeMode('blind')}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    practiceSubMode === 'blind'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Ẩn mẫu để viết từ trí nhớ, hỗ trợ bật bóng mờ hoặc gợi ý từng nét khi cần"
                >
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span>Viết mù</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchPracticeMode('free')}
                  className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    practiceSubMode === 'free'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tự do phóng tác bằng nhiều màu mực trên khung ô ly"
                >
                  <PenTool className="w-3.5 h-3.5 shrink-0" />
                  <span>Viết tự do</span>
                </button>
              </div>

              {/* Two-Zone Sandbox Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-start">
                {/* Left Zone: 1:1 Coordinate Writing Canvas Stage */}
                <div className="md:col-span-6 flex flex-col items-center">
                  <div
                    className={`relative w-full aspect-square max-w-[264px] sm:max-w-[280px] bg-white rounded-2xl border-2 shadow-inner overflow-hidden select-none transition-colors duration-150 ${
                      isWrongFlash
                        ? 'border-rose-400 bg-rose-50/10'
                        : isPracticeFinished && practiceSubMode !== 'free'
                        ? 'border-emerald-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {effectiveShowGrid && <KanjiGridOverlay />}

                    {/* Vector Reference & Completed Strokes Layer (Exact 1:1 0..109 SVG coordinate box) */}
                    {practiceStrokes.length > 0 ? (
                      <svg
                        viewBox="0 0 109 109"
                        className="absolute inset-0 w-full h-full pointer-events-none select-none"
                        aria-hidden="true"
                      >
                        {/* 1. Optional Ghost Shadow Guide */}
                        {showGhostGuide && (
                          <g
                            style={{
                              fill: 'none',
                              stroke: '#94a3b8',
                              strokeOpacity: practiceSubMode === 'free' ? 0.28 : 0.24,
                              strokeWidth: 4.2,
                              strokeLinecap: 'round',
                              strokeLinejoin: 'round',
                            }}
                          >
                            {practiceStrokes.map((s, idx) => (
                              <path key={`ghost-${s.id}-${idx}`} d={s.d} />
                            ))}
                          </g>
                        )}

                        {/* 2. Passed / Completed Strokes in Crisp Ink */}
                        {practiceSubMode !== 'free' && (
                          <g
                            style={{
                              fill: 'none',
                              strokeWidth: 4.4,
                              strokeLinecap: 'round',
                              strokeLinejoin: 'round',
                            }}
                          >
                            {completedStrokeIndices.map((idx) => {
                              const s = practiceStrokes[idx];
                              if (!s) return null;
                              const color = MAZII_STROKE_COLORS[idx % MAZII_STROKE_COLORS.length] || '#0f766e';
                              return <path key={`done-${s.id}-${idx}`} d={s.d} style={{ stroke: color }} />;
                            })}
                          </g>
                        )}

                        {/* 3. Single-Stroke Hint (On-demand in either Guided or Blind mode) */}
                        {practiceSubMode !== 'free' &&
                          showHintStroke &&
                          practiceStrokes[currentStrokeIdx] &&
                          !isPracticeFinished && (
                            <path
                              d={practiceStrokes[currentStrokeIdx].d}
                              style={{
                                fill: 'none',
                                stroke: '#d97706',
                                strokeOpacity: 0.65,
                                strokeWidth: 3.8,
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                strokeDasharray: '3.2 2.8',
                              }}
                            />
                          )}

                        {/* 4. Static Start Marker (Zero pulsing animation) */}
                        {practiceSubMode !== 'free' &&
                          !isPracticeFinished &&
                          strokeStartPoints[currentStrokeIdx] &&
                          (showHintStroke || (practiceSubMode === 'guided' && showStartMarker)) && (
                            <g>
                              <circle
                                cx={strokeStartPoints[currentStrokeIdx].x}
                                cy={strokeStartPoints[currentStrokeIdx].y}
                                r="3.2"
                                fill={showHintStroke ? '#d97706' : '#059669'}
                                stroke="#ffffff"
                                strokeWidth="0.9"
                              />
                              <text
                                x={Math.min(98, strokeStartPoints[currentStrokeIdx].x + 4.4)}
                                y={Math.max(8, strokeStartPoints[currentStrokeIdx].y - 3.2)}
                                fontSize="5.4"
                                fontWeight="700"
                                fill={showHintStroke ? '#b45309' : '#047857'}
                              >
                                #{currentStrokeIdx + 1}
                              </text>
                            </g>
                          )}
                      </svg>
                    ) : (
                      showGhostGuide && (
                        <KanjiSvgView
                          svgUrl={item.svgUrl}
                          kanji={item.kanji}
                          monochrome={true}
                          className="w-full h-full object-contain pointer-events-none select-none opacity-25"
                        />
                      )
                    )}

                    {/* Interactive Pointer Canvas Layer (Exact 1:1 0..280 backing store) */}
                    <canvas
                      ref={canvasRef}
                      width={280}
                      height={280}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
                      title="Dùng chuột, ngón tay hoặc bút cảm ứng để viết"
                    />

                    {/* Completion Summary Overlay */}
                    {practiceSubMode !== 'free' && isPracticeFinished && (
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20 animate-in zoom-in-95 duration-150">
                        <div className="w-11 h-11 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl flex items-center justify-center mb-2">
                          <Award className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900">
                          Hoàn thành chữ {item.kanji}
                        </h4>
                        <div className="text-2xl font-black text-teal-700 font-mono tabular-nums my-1">
                          {Math.round(
                            strokeScores.reduce((a, b) => a + b, 0) / (strokeScores.length || 1)
                          )}
                          %
                        </div>
                        <p className="text-xs text-slate-600 mb-3">
                          {Math.round(
                            strokeScores.reduce((a, b) => a + b, 0) / (strokeScores.length || 1)
                          ) >= 80
                            ? 'Chuẩn xác thứ tự và hướng nét.'
                            : 'Đã hoàn tất đủ số nét của chữ.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={resetPracticeTest}
                            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Luyện lại</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              switchPracticeMode(practiceSubMode === 'guided' ? 'blind' : 'guided')
                            }
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
                          >
                            {practiceSubMode === 'guided' ? 'Thử viết mù' : 'Về có mẫu mờ'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Zone: Control & Telemetry Deck */}
                <div className="md:col-span-6 space-y-3">
                  {practiceSubMode !== 'free' ? (
                    <>
                      {/* Progress & Average Score Telemetry (Clean unboxed typography, tabular-nums) */}
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 text-xs tabular-nums">
                        <div className="font-bold text-slate-800">
                          {isPracticeFinished ? (
                            <span className="text-emerald-700">
                              Hoàn thành {practiceStrokes.length}/{practiceStrokes.length} nét
                            </span>
                          ) : (
                            <span>
                              Nét{' '}
                              <strong className="text-teal-700 font-black">
                                {Math.min(currentStrokeIdx + 1, practiceStrokes.length || 1)}
                              </strong>{' '}
                              / {practiceStrokes.length || '?'}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 font-medium">
                          {strokeScores.length > 0 ? (
                            <>
                              Điểm TB:{' '}
                              <strong className="text-slate-900 font-mono">
                                {Math.round(
                                  strokeScores.reduce((a, b) => a + b, 0) / strokeScores.length
                                )}
                                %
                              </strong>
                            </>
                          ) : (
                            <span>
                              {practiceSubMode === 'blind' ? 'Chế độ trí nhớ' : 'Theo thứ tự nét'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Real-time Stroke Feedback Strip (Outside Canvas so strokes are never covered) */}
                      <div
                        className={`min-h-[52px] rounded-xl border px-3 py-2 flex items-center justify-between gap-2 text-xs transition-colors ${
                          lastEvaluation && !isPracticeFinished
                            ? lastEvaluation.isPass
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-slate-50 border-slate-200/80 text-slate-600'
                        }`}
                      >
                        {lastEvaluation && !isPracticeFinished ? (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              {lastEvaluation.isPass ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span className="font-semibold leading-snug">
                                {lastEvaluation.feedback}
                              </span>
                            </div>
                            <span className="font-mono font-bold tabular-nums shrink-0 text-[11px]">
                              {lastEvaluation.score}%
                            </span>
                          </>
                        ) : (
                          <div className="leading-snug">
                            {practiceSubMode === 'blind'
                              ? 'Hình mẫu đang ẩn. Nhớ vị trí nét trong ô ly và đặt bút viết, hoặc bật Bóng mờ / Gợi ý 1 nét.'
                              : 'Đặt bút từ chấm đầu nét và kéo dọc theo bóng mờ. Nét sai sẽ tự xóa nhanh để bạn viết lại ngay.'}
                          </div>
                        )}
                      </div>

                      {/* Grading Strictness Selector */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Độ khó chấm điểm</span>
                          <span>
                            {practiceStrictness === 'easy'
                              ? 'Ưu tiên đúng thứ tự'
                              : practiceStrictness === 'strict'
                              ? 'Chuẩn thư pháp'
                              : 'Cân bằng'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
                          {(
                            [
                              { id: 'easy', label: 'Dễ' },
                              { id: 'normal', label: 'Chuẩn' },
                              { id: 'strict', label: 'Khắt khe' },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPracticeStrictness(opt.id)}
                              className={`py-1.5 px-2 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                practiceStrictness === opt.id
                                  ? 'bg-white text-teal-800 shadow-2xs ring-1 ring-slate-200 font-bold'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Visual Assistance Toggles */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowGhostGuide((v) => !v)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                            showGhostGuide
                              ? 'bg-teal-50 border-teal-300 text-teal-800'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                          title="Bật hoặc tắt lớp bóng mờ toàn bộ chữ Kanji"
                        >
                          <Ghost className="w-3.5 h-3.5 shrink-0" />
                          <span>Bóng mờ</span>
                        </button>

                        <button
                          type="button"
                          disabled={isPracticeFinished || practiceStrokes.length === 0}
                          onClick={() => setShowHintStroke((v) => !v)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-45 transition-colors whitespace-nowrap ${
                            showHintStroke
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                          title="Hiện nét hiện tại và điểm bắt đầu cho riêng 1 nét này"
                        >
                          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                          <span>Gợi ý 1 nét</span>
                        </button>

                        {practiceSubMode === 'guided' && (
                          <button
                            type="button"
                            disabled={isPracticeFinished}
                            onClick={() => setShowStartMarker((v) => !v)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-45 transition-colors whitespace-nowrap ${
                              showStartMarker
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                            title="Ẩn hoặc hiện chấm vị trí bắt đầu từng nét"
                          >
                            <Target className="w-3.5 h-3.5 shrink-0" />
                            <span>Đầu nét</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleTogglePracticeGrid}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                            effectiveShowGrid
                              ? 'bg-slate-100 border-slate-300 text-slate-900'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                          title="Bật hoặc tắt lưới ô ly chữ Mễ"
                        >
                          <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Ô ly</span>
                        </button>
                      </div>

                      {/* Stroke Flow Controls: Undo / Skip / Reset */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/70">
                        <button
                          type="button"
                          onClick={undoLastStroke}
                          disabled={completedStrokeIndices.length === 0}
                          className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors whitespace-nowrap"
                          title="Quay lại 1 nét vừa hoàn thành"
                        >
                          <Undo2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Hoàn tác</span>
                        </button>

                        <button
                          type="button"
                          onClick={skipCurrentStroke}
                          disabled={isPracticeFinished || practiceStrokes.length === 0}
                          className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors whitespace-nowrap"
                          title="Bỏ qua nét hiện tại và chuyển sang nét tiếp theo"
                        >
                          <SkipForward className="w-3.5 h-3.5 shrink-0" />
                          <span>Bỏ qua</span>
                        </button>

                        <button
                          type="button"
                          onClick={resetPracticeTest}
                          className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                          title="Xóa hết và viết lại từ nét 1"
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Viết lại</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Freehand Mode Controls */
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-700 block">
                          Màu mực luyện viết
                        </span>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {[
                            { color: '#0f766e', label: 'Xanh ngọc bích' },
                            { color: '#2563eb', label: 'Xanh dương' },
                            { color: '#dc2626', label: 'Đỏ chu sa' },
                            { color: '#16a34a', label: 'Xanh lá' },
                            { color: '#9333ea', label: 'Tím' },
                            { color: '#d97706', label: 'Cam' },
                            { color: '#0f172a', label: 'Đen mực tàu' },
                          ].map(({ color, label }) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setPenColor(color)}
                              style={{ backgroundColor: color }}
                              className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                                penColor === color
                                  ? 'scale-110 border-white ring-2 ring-teal-600 shadow-xs'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              title={label}
                              aria-label={label}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowGhostGuide((v) => !v)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                            showGhostGuide
                              ? 'bg-teal-50 border-teal-300 text-teal-800'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <Ghost className="w-3.5 h-3.5 shrink-0" />
                          <span>Bóng mờ</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTogglePracticeGrid}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                            effectiveShowGrid
                              ? 'bg-slate-100 border-slate-300 text-slate-900'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Ô ly</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70">
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                          <span>Xóa nét vẽ tay</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>

        {/* Footer info & Navigation */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Tra cứu chi tiết & Luyện nét</span>
            <span className="hidden sm:inline text-slate-400 font-mono">
              (Phím ← / → chuyển từ nhanh)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {kanjiList && kanjiList.length > 1 && (
              <div className="flex items-center gap-1 sm:hidden">
                <button
                  type="button"
                  onClick={goToPrev}
                  disabled={!hasPrev}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold disabled:opacity-30 text-xs flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Trước
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  disabled={!hasNext}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold disabled:opacity-30 text-xs flex items-center gap-0.5"
                >
                  Sau <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
    {nestedKanjiItem && (
      <PracticeModal
        item={nestedKanjiItem}
        stackDepth={stackDepth + 1}
        showGrid={showGrid}
        onToggleGrid={onToggleGrid}
        onClose={() => setNestedKanjiItem(null)}
        onCopyImage={onCopyImage}
        onDownloadPng={onDownloadPng}
        onSelectKanji={onSelectKanji}
        onDetailLoaded={onDetailLoaded}
      />
    )}
    </>
  );
};
