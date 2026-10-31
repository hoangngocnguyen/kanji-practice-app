import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Copy,
  Download,
  RefreshCw,
  ExternalLink,
  Volume2,
  BookOpen,
  PlayCircle,
  PenTool,
  Sparkles,
  Layers3,
  Award,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  Target
} from 'lucide-react';
import { KanjiItem, KanjiDetail } from '../types/kanji';
import { StrokeAnimation, MAZII_STROKE_COLORS } from './StrokeAnimation';
import { getFullKanjiDetail } from '../utils/kanjiApi';
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
import { evaluateUserStroke, sampleSvgPathPoints, Point, StrokeEvaluationResult } from '../utils/strokeMatcher';

interface PracticeModalProps {
  item: KanjiItem | null;
  showGrid?: boolean;
  onToggleGrid?: (show: boolean) => void;
  onClose: () => void;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
  onSelectKanji?: (char: string) => void;
}

type TabType = 'animation' | 'dictionary' | 'radicals' | 'practice';

export const PracticeModal: React.FC<PracticeModalProps> = ({
  item,
  showGrid = false,
  onToggleGrid,
  onClose,
  onCopyImage,
  onDownloadPng,
  onSelectKanji,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('animation');
  const [detail, setDetail] = useState<KanjiDetail | null>(null);
  const [decomposition, setDecomposition] = useState<KanjiDecomposition | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0f766e');

  // Stroke Order & Direction Verification State
  const [practiceSubMode, setPracticeSubMode] = useState<'guided' | 'free'>('guided');
  const [practiceStrokes, setPracticeStrokes] = useState<Array<{ id: string; d: string; index: number }>>([]);
  const [currentStrokeIdx, setCurrentStrokeIdx] = useState<number>(0);
  const [completedStrokeIndices, setCompletedStrokeIndices] = useState<number[]>([]);
  const [strokeScores, setStrokeScores] = useState<number[]>([]);
  const [lastEvaluation, setLastEvaluation] = useState<StrokeEvaluationResult | null>(null);
  const [isPracticeFinished, setIsPracticeFinished] = useState<boolean>(false);
  const [strokeStartPoints, setStrokeStartPoints] = useState<Point[]>([]);

  // User drawn points of current stroke
  const userPointsRef = useRef<Point[]>([]);

  // Clear canvas helper
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const resetPracticeTest = () => {
    setCurrentStrokeIdx(0);
    setCompletedStrokeIndices([]);
    setStrokeScores([]);
    setLastEvaluation(null);
    setIsPracticeFinished(false);
    userPointsRef.current = [];
    clearCanvas();
  };

  useEffect(() => {
    if (!item) return;

    setActiveTab('animation');
    resetPracticeTest();

    let isMounted = true;
    getFullKanjiDetail(item.kanji)
      .then((res) => {
        if (isMounted) {
          setDetail(res);
        }
      })
      .catch(() => {});

    clearCanvas();

    return () => {
      isMounted = false;
    };
  }, [item]);

  // Load SVG strokes for interactive guided practice
  useEffect(() => {
    if (!item) return;

    let isCancelled = false;

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

  useEffect(() => {
    if (!item) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!item) return null;

  // Drawing handlers for Practice tab with responsive canvas scaling
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    userPointsRef.current = [{ x, y }];
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const strokeColor =
      practiceSubMode === 'guided'
        ? (MAZII_STROKE_COLORS[currentStrokeIdx % MAZII_STROKE_COLORS.length] || penColor)
        : penColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    userPointsRef.current.push({ x, y });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (
      practiceSubMode === 'guided' &&
      practiceStrokes.length > 0 &&
      !isPracticeFinished &&
      currentStrokeIdx < practiceStrokes.length
    ) {
      if (userPointsRef.current.length < 3) {
        return;
      }

      const currentStroke = practiceStrokes[currentStrokeIdx];
      if (!currentStroke) return;

      const evalResult = evaluateUserStroke(userPointsRef.current, currentStroke.d, 280, 280);
      setLastEvaluation(evalResult);

      if (evalResult.isPass) {
        const nextScores = [...strokeScores, evalResult.score];
        setStrokeScores(nextScores);
        setCompletedStrokeIndices((prev) => [...prev, currentStrokeIdx]);

        if (currentStrokeIdx + 1 >= practiceStrokes.length) {
          setIsPracticeFinished(true);
        } else {
          setTimeout(() => {
            setCurrentStrokeIdx((prev) => prev + 1);
            setLastEvaluation(null);
            clearCanvas();
          }, 650);
        }
      }
    }
  };

  const skipCurrentStroke = () => {
    if (currentStrokeIdx < practiceStrokes.length) {
      setStrokeScores((prev) => [...prev, 60]);
      setCompletedStrokeIndices((prev) => [...prev, currentStrokeIdx]);
      if (currentStrokeIdx + 1 >= practiceStrokes.length) {
        setIsPracticeFinished(true);
      } else {
        setCurrentStrokeIdx((prev) => prev + 1);
        setLastEvaluation(null);
        clearCanvas();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header with Kanji & Sino-Vietnamese Reading */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span
              onClick={() => speakJapanese(item.kanji)}
              className="font-kanji font-black text-3xl sm:text-5xl text-teal-700 leading-none cursor-pointer hover:scale-105 transition-transform shrink-0"
              title="Click để nghe phát âm tiếng Nhật"
            >
              {item.kanji}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h4 className="text-sm sm:text-lg font-black text-slate-900 tracking-wide truncate">
                  {detail?.hanViet ? `Hán-Việt: ${detail.hanViet}` : `Chữ ${item.kanji}`}
                </h4>
                {detail?.jlpt && (
                  <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md border ${getJlptBadgeClass(detail.jlpt)}`}>
                    {detail.jlpt}
                  </span>
                )}
                <button
                  onClick={() => speakJapanese(item.kanji)}
                  className="p-1 rounded-lg text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-slate-400 truncate">
                U+{item.hex.toUpperCase()} • #{item.id}
                {detail?.strokeCount ? ` • ${detail.strokeCount} nét` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation with color indicators */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/50 p-1 sm:p-1.5 gap-1 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('animation')}
            className={`flex-1 min-w-[90px] py-2 px-1.5 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'animation'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Hoạt ảnh nét vẽ</span>
            <span className="sm:hidden text-[11px]">Hoạt ảnh</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex-1 min-w-[90px] py-2 px-1.5 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'dictionary'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Nghĩa & Từ ghép</span>
            <span className="sm:hidden text-[11px]">Tra nghĩa</span>
          </button>

          <button
            onClick={() => setActiveTab('radicals')}
            className={`flex-1 min-w-[90px] py-2 px-1.5 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'radicals'
                ? 'bg-cyan-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers3 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Bộ thủ & Mẹo nhớ</span>
            <span className="sm:hidden text-[11px]">Bộ thủ</span>
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 min-w-[90px] py-2 px-1.5 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Tập viết tay</span>
            <span className="sm:hidden text-[11px]">Viết tay</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
          {/* TAB 1: STROKE ANIMATION */}
          {activeTab === 'animation' && (
            <div className="space-y-4 sm:space-y-5">
              <StrokeAnimation
                svgUrl={item.svgUrl}
                kanji={item.kanji}
                size={280}
                showGrid={showGrid}
                onToggleGrid={onToggleGrid}
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
          )}

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
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Từ ghép ví dụ thực tế ({detail?.examples.length || 0})</span>
                  </h5>
                  <span className="text-[11px] text-slate-400">Click loa để nghe</span>
                </div>

                {detail?.examples && detail.examples.length > 0 ? (
                  <div className="space-y-2">
                    {detail.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200/80 transition-all flex items-start justify-between gap-3 group"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-kanji font-bold text-base text-slate-900 group-hover:text-teal-700 transition-colors">
                              {ex.word}
                            </span>
                            <span className="text-xs font-kanji text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              【{ex.reading}】
                            </span>
                            {ex.hanViet && (
                              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/70">
                                {ex.hanViet}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{ex.meaning}</p>
                        </div>

                        <button
                          onClick={() => speakJapanese(ex.word)}
                          className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title={`Nghe phát âm "${ex.word}"`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                    Chưa có từ ghép mẫu trong danh mục này. Bạn có thể tra nhanh trên Mazii hoặc Jisho bên dưới.
                  </div>
                )}
              </div>

              {/* Fast Online Dictionaries Links */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
                <a
                  href={`https://mazii.net/vi-VN/search/kanji/${encodeURIComponent(item.kanji)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1 border border-slate-200 transition-colors"
                >
                  Tra từ điển Mazii <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={`https://jisho.org/search/${encodeURIComponent(item.kanji)}%20%23kanji`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 font-medium inline-flex items-center gap-1 border border-teal-200 transition-colors"
                >
                  Tra cứu Jisho.org <ExternalLink className="w-3 h-3" />
                </a>
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
                    onSelectKanji={(k) => {
                      if (onSelectKanji) onSelectKanji(k);
                    }}
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

          {/* TAB 4: TRACING & WRITING PRACTICE */}
          {activeTab === 'practice' && (
            <div className="space-y-3.5">
              {/* Practice Sub-Mode Switcher */}
              <div className="flex items-center justify-between gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPracticeSubMode('guided');
                    resetPracticeTest();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    practiceSubMode === 'guided'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chế độ kiểm tra thứ tự nét, hướng vẽ và chấm điểm độ chính xác từng nét"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Kiểm tra nét & Thứ tự (Chấm điểm)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPracticeSubMode('free');
                    clearCanvas();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    practiceSubMode === 'free'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chế độ tự do vẽ đè lên hình mẫu"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Tự do viết</span>
                </button>
              </div>

              {/* Guided Mode Action Header */}
              {practiceSubMode === 'guided' && (
                <div className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Nét thứ <strong className="text-teal-700 font-black">{Math.min(currentStrokeIdx + 1, practiceStrokes.length || 1)}</strong> / {practiceStrokes.length || 1}
                    </span>
                    {strokeScores.length > 0 && (
                      <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full font-bold border border-teal-300">
                        TB: {Math.round(strokeScores.reduce((a, b) => a + b, 0) / strokeScores.length)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-2 py-1 text-slate-600 hover:text-rose-700 hover:bg-white rounded-lg transition-colors cursor-pointer text-[11px] font-semibold"
                      title="Vẽ lại nét hiện tại"
                    >
                      Vẽ lại
                    </button>
                    <button
                      type="button"
                      onClick={skipCurrentStroke}
                      disabled={currentStrokeIdx >= practiceStrokes.length - 1}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer text-[11px] font-semibold disabled:opacity-40"
                      title="Bỏ qua nét này và chuyển sang nét tiếp theo"
                    >
                      Bỏ qua
                    </button>
                    <button
                      type="button"
                      onClick={resetPracticeTest}
                      className="p-1 text-slate-400 hover:text-teal-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Bắt đầu lại từ nét 1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Canvas Box Area */}
              <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-white rounded-2xl border-2 border-slate-200 p-2 shadow-inner flex items-center justify-center overflow-hidden">
                {/* Lưới ô nét đứt nếu bật Kèm lưới */}
                {showGrid && <KanjiGridOverlay />}

                {/* SVG Layers in Guided Mode */}
                {practiceSubMode === 'guided' ? (
                  <svg
                    viewBox="0 0 109 109"
                    className="absolute inset-0 w-full h-full p-2 pointer-events-none select-none"
                  >
                    {/* 1. Mờ mờ toàn bộ chữ để tham khảo vị trí */}
                    <g style={{ fill: 'none', stroke: '#f1f5f9', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      {practiceStrokes.map((s, idx) => (
                        <path key={`bg-${idx}`} d={s.d} />
                      ))}
                    </g>

                    {/* 2. Các nét đã hoàn thành chuẩn xác */}
                    <g style={{ fill: 'none', strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      {completedStrokeIndices.map((idx) => {
                        const s = practiceStrokes[idx];
                        if (!s) return null;
                        const color = MAZII_STROKE_COLORS[idx % MAZII_STROKE_COLORS.length];
                        return <path key={`done-${idx}`} d={s.d} style={{ stroke: color }} />;
                      })}
                    </g>

                    {/* 3. Nét mẫu hiện tại cần vẽ (đường nét đứt nổi bật) */}
                    {practiceStrokes[currentStrokeIdx] && !isPracticeFinished && (
                      <path
                        d={practiceStrokes[currentStrokeIdx].d}
                        style={{
                          fill: 'none',
                          stroke: MAZII_STROKE_COLORS[currentStrokeIdx % MAZII_STROKE_COLORS.length] || '#0d9488',
                          strokeWidth: 3.6,
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                          strokeDasharray: '3 3',
                          opacity: 0.65,
                        }}
                      />
                    )}

                    {/* 4. Chấm điểm bắt đầu phát sáng và chỉ dẫn */}
                    {strokeStartPoints[currentStrokeIdx] && !isPracticeFinished && (
                      <g>
                        <circle
                          cx={strokeStartPoints[currentStrokeIdx].x}
                          cy={strokeStartPoints[currentStrokeIdx].y}
                          r="5.5"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1.2"
                          className="animate-ping"
                        />
                        <circle
                          cx={strokeStartPoints[currentStrokeIdx].x}
                          cy={strokeStartPoints[currentStrokeIdx].y}
                          r="3.2"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="0.8"
                        />
                        <text
                          x={strokeStartPoints[currentStrokeIdx].x + 4.5}
                          y={strokeStartPoints[currentStrokeIdx].y - 3}
                          fontSize="5.5"
                          fontWeight="bold"
                          fill="#047857"
                        >
                          #{currentStrokeIdx + 1}
                        </text>
                      </g>
                    )}
                  </svg>
                ) : (
                  /* Freehand template */
                  <KanjiSvgView
                    svgUrl={item.svgUrl}
                    kanji={item.kanji}
                    monochrome={true}
                    className="w-full h-full object-contain pointer-events-none select-none opacity-30 p-2"
                  />
                )}

                {/* Tracing / Practice Canvas */}
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={280}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="absolute inset-0 cursor-crosshair touch-none"
                  title="Dùng chuột hoặc ngón tay để vẽ theo hướng dẫn"
                />

                {/* Floating feedback toast */}
                {practiceSubMode === 'guided' && lastEvaluation && !isPracticeFinished && (
                  <div
                    className={`absolute top-2 left-2 right-2 px-3 py-1.5 rounded-xl shadow-md text-[11px] font-bold flex items-center justify-between gap-1.5 z-10 animate-in fade-in slide-in-from-top-1 ${
                      lastEvaluation.isPass
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    <span className="truncate">{lastEvaluation.feedback}</span>
                    <span className="bg-white/20 px-1.5 py-0.2 rounded font-mono text-[10px] shrink-0">
                      {lastEvaluation.score}%
                    </span>
                  </div>
                )}

                {/* Completion summary overlay when all strokes pass */}
                {practiceSubMode === 'guided' && isPracticeFinished && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20 animate-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                      <Award className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-black text-slate-800">Hoàn thành chữ Kanji!</h4>
                    <div className="text-2xl font-black text-teal-700 font-mono my-1">
                      {Math.round(
                        strokeScores.reduce((a, b) => a + b, 0) / (strokeScores.length || 1)
                      )}
                      %
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      {Math.round(
                        strokeScores.reduce((a, b) => a + b, 0) / (strokeScores.length || 1)
                      ) >= 80
                        ? 'Xuất sắc! Bạn đã vẽ đúng thứ tự và hướng các nét.'
                        : 'Bạn đã hoàn thành đủ các nét theo đúng quy tắc.'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetPracticeTest}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Luyện lại chữ này</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeSubMode('free');
                          resetPracticeTest();
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
                      >
                        Viết tự do
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Freehand Controls (Only in Freehand Mode) */}
              {practiceSubMode === 'free' ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-y border-slate-100 py-3 px-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-slate-500 font-medium">Màu mực:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { color: '#0f766e', label: 'Xanh ngọc bích' },
                        { color: '#2563eb', label: 'Xanh dương' },
                        { color: '#dc2626', label: 'Đỏ chu sa' },
                        { color: '#16a34a', label: 'Xanh lá' },
                        { color: '#9333ea', label: 'Tím hoa súng' },
                        { color: '#d97706', label: 'Cam hoàng hôn' },
                        { color: '#0f172a', label: 'Đen mực tàu' },
                      ].map(({ color, label }) => (
                        <button
                          key={color}
                          onClick={() => setPenColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            penColor === color
                              ? 'scale-115 border-white ring-2 ring-teal-600 shadow-xs'
                              : 'border-transparent'
                          }`}
                          title={label}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={clearCanvas}
                    className="inline-flex items-center gap-1.5 text-slate-500 hover:text-rose-600 font-semibold cursor-pointer transition-colors py-1 px-2 rounded-lg hover:bg-rose-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xóa nét vẽ tay</span>
                  </button>
                </div>
              ) : (
                /* Instruction hint in Guided Mode */
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 leading-relaxed text-center font-medium">
                  🎯 Đặt bút/ngón tay vào <strong className="text-emerald-700 font-bold">chấm xanh #{currentStrokeIdx + 1}</strong> và vẽ dọc theo nét đứt. Hệ thống sẽ nhận diện hướng vẽ, thứ tự nét và chấm điểm độ chính xác.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Tra cứu chi tiết & Luyện nét Kanji</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
