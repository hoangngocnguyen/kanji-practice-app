import React, { useEffect, useRef, useState } from 'react';
import {
  Eye,
  Lightbulb,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Volume2,
  Ghost,
} from 'lucide-react';
import { loadKanjiStrokes, LoadedKanjiStrokes } from '../utils/kanjivgLoader';
import { evaluateUserStroke, Point, StrokeEvaluationResult } from '../utils/strokeMatcher';
import { MAZII_STROKE_COLORS } from './StrokeAnimation';
import { speakJapanese } from '../utils/speech';

interface BlindWritingPadProps {
  kanjiChars: string[];
  hanViet?: string;
  meaning: string;
  readingHint?: string;
  audioText?: string;
  onCompleteOrReveal: () => void;
}

export const BlindWritingPad: React.FC<BlindWritingPadProps> = ({
  kanjiChars,
  hanViet,
  meaning,
  readingHint,
  audioText,
  onCompleteOrReveal,
}) => {
  const availableChars = kanjiChars.length > 0 ? kanjiChars : [];
  const [selectedCharIdx, setSelectedCharIdx] = useState(0);
  const activeChar = availableChars[selectedCharIdx] || availableChars[0] || '';

  const [strokeData, setStrokeData] = useState<LoadedKanjiStrokes | null>(null);
  const [isLoadingStrokes, setIsLoadingStrokes] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [currentStrokeIdx, setCurrentStrokeIdx] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [showNextHint, setShowNextHint] = useState(false);
  const [showGhostAll, setShowGhostAll] = useState(false);
  const [lastEval, setLastEval] = useState<StrokeEvaluationResult | null>(null);
  const [isDone, setIsDone] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const userPointsRef = useRef<Point[]>([]);
  const autoRevealTimerRef = useRef<number | null>(null);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Reset char selection whenever card changes
  useEffect(() => {
    setSelectedCharIdx(0);
  }, [kanjiChars.join('|')]);

  // Load KanjiVG stroke paths for activeChar
  useEffect(() => {
    if (autoRevealTimerRef.current) {
      window.clearTimeout(autoRevealTimerRef.current);
      autoRevealTimerRef.current = null;
    }
    setCurrentStrokeIdx(0);
    setCompletedIndices([]);
    setShowNextHint(false);
    setShowGhostAll(false);
    setLastEval(null);
    setIsDone(false);
    userPointsRef.current = [];
    clearCanvas();

    if (!activeChar) return;
    let cancelled = false;
    setIsLoadingStrokes(true);
    setLoadError(false);

    loadKanjiStrokes(activeChar)
      .then((res) => {
        if (!cancelled) {
          setStrokeData(res);
          setLoadError(res.strokes.length === 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStrokeData(null);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStrokes(false);
      });

    return () => {
      cancelled = true;
      if (autoRevealTimerRef.current) {
        window.clearTimeout(autoRevealTimerRef.current);
      }
    };
  }, [activeChar]);

  const handleResetPad = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (autoRevealTimerRef.current) {
      window.clearTimeout(autoRevealTimerRef.current);
      autoRevealTimerRef.current = null;
    }
    setCurrentStrokeIdx(0);
    setCompletedIndices([]);
    setShowNextHint(false);
    setLastEval(null);
    setIsDone(false);
    userPointsRef.current = [];
    clearCanvas();
  };

  const getPointFromEvent = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;

    return {
      x: ((clientX - rect.left) * canvas.width) / rect.width,
      y: ((clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.stopPropagation();
    if (isDone || !strokeData || strokeData.strokes.length === 0) return;
    const pt = getPointFromEvent(e);
    if (!pt) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
    userPointsRef.current = [pt];
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.stopPropagation();
    if (!isDrawing) return;
    const pt = getPointFromEvent(e);
    if (!pt) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle =
      MAZII_STROKE_COLORS[currentStrokeIdx % MAZII_STROKE_COLORS.length] || '#0F766E';
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    userPointsRef.current.push(pt);
  };

  const stopDrawing = (
    e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e?.stopPropagation();
    if (!isDrawing) return;
    setIsDrawing(false);

    if (!strokeData || isDone || currentStrokeIdx >= strokeData.strokes.length) {
      return;
    }

    if (userPointsRef.current.length < 3) {
      clearCanvas();
      userPointsRef.current = [];
      return;
    }

    const targetStroke = strokeData.strokes[currentStrokeIdx];
    const result = evaluateUserStroke(userPointsRef.current, targetStroke.d, 260, 260);
    setLastEval(result);

    if (result.isPass) {
      const nextCompleted = [...completedIndices, currentStrokeIdx];
      setCompletedIndices(nextCompleted);
      setShowNextHint(false);
      userPointsRef.current = [];
      clearCanvas();

      if (currentStrokeIdx + 1 >= strokeData.strokes.length) {
        setIsDone(true);
        if (audioText || activeChar) {
          speakJapanese(audioText || activeChar);
        }
        autoRevealTimerRef.current = window.setTimeout(() => {
          onCompleteOrReveal();
        }, 700);
      } else {
        setCurrentStrokeIdx((idx) => idx + 1);
      }
    } else {
      window.setTimeout(() => {
        clearCanvas();
      }, 280);
    }
  };

  const totalStrokes = strokeData?.strokes.length || 0;
  const completedCount = completedIndices.length;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full h-full flex flex-col lg:grid lg:grid-cols-12 gap-4 items-center justify-center my-auto px-1"
    >
      {/* Left Zone: Recall Prompt (Kanji Hidden) + Action Controls */}
      <div className="lg:col-span-6 w-full flex flex-col items-center lg:items-start text-center lg:text-left space-y-3">
        <div className="space-y-1.5 w-full">
          <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
            Viết mù theo trí nhớ
          </div>
          {hanViet && (
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {hanViet}
            </div>
          )}
          <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100 text-sm sm:text-base font-bold text-slate-900">
            {meaning || 'Nhớ lại chữ Kanji tương ứng'}
          </div>
          {readingHint && (
            <div className="text-xs font-mono text-slate-600 flex items-center justify-center lg:justify-start gap-2">
              <span>{readingHint}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakJapanese(audioText || activeChar);
                }}
                className="p-1 rounded-lg hover:bg-teal-50 text-teal-700 cursor-pointer"
                title="Nghe phát âm gợi ý"
                aria-label="Nghe phát âm gợi ý"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* If Compound Word has multiple Kanji characters, allow choosing which char to blind-write */}
        {availableChars.length > 1 && (
          <div className="flex items-center flex-wrap gap-1.5 justify-center lg:justify-start">
            <span className="text-[11px] text-slate-500">Chọn chữ viết:</span>
            {availableChars.map((ch, idx) => (
              <button
                key={`${ch}-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCharIdx(idx);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border cursor-pointer tabular-nums ${
                  idx === selectedCharIdx
                    ? 'bg-teal-700 text-white border-teal-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Chữ #{idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Stroke Progress & Evaluation Feedback */}
        <div className="w-full flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs tabular-nums">
          <span className="font-semibold text-slate-700">
            Tiến độ nét:{' '}
            <strong className="text-teal-800">
              {completedCount}/{totalStrokes || '?'}
            </strong>
          </span>

          {lastEval && !isDone && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                lastEval.isPass ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {lastEval.isPass ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {lastEval.isPass ? `Chuẩn nét (${lastEval.score}%)` : 'Chưa khớp — vẽ lại nét'}
              </span>
            </span>
          )}
        </div>

        {/* Utility Buttons */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
          <button
            type="button"
            disabled={!strokeData || isDone}
            onClick={(e) => {
              e.stopPropagation();
              setShowNextHint((v) => !v);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer disabled:opacity-45 transition-colors ${
              showNextHint
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Gợi ý 1 nét</span>
          </button>

          <button
            type="button"
            disabled={!strokeData || isDone}
            onClick={(e) => {
              e.stopPropagation();
              setShowGhostAll((v) => !v);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer disabled:opacity-45 transition-colors ${
              showGhostAll
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Ghost className="w-3.5 h-3.5 text-teal-700" />
            <span>Hiện bóng mờ</span>
          </button>

          <button
            type="button"
            onClick={handleResetPad}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Viết lại</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCompleteOrReveal();
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem đáp án</span>
          </button>
        </div>
      </div>

      {/* Right Zone: Blind Writing Grid Canvas */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center shrink-0">
        <div className="relative w-[230px] h-[230px] sm:w-[260px] sm:h-[260px] bg-white rounded-2xl border-2 border-slate-200 shadow-inner overflow-hidden select-none">
          {/* Blank Japanese Writing Grid (Mi-grid crosshairs) */}
          <svg
            viewBox="0 0 109 109"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            <line
              x1="54.5"
              y1="0"
              x2="54.5"
              y2="109"
              stroke="#e2e8f0"
              strokeWidth="0.8"
              strokeDasharray="2.5,2.5"
            />
            <line
              x1="0"
              y1="54.5"
              x2="109"
              y2="54.5"
              stroke="#e2e8f0"
              strokeWidth="0.8"
              strokeDasharray="2.5,2.5"
            />
            <line
              x1="0"
              y1="0"
              x2="109"
              y2="109"
              stroke="#f1f5f9"
              strokeWidth="0.6"
              strokeDasharray="2,3"
            />
            <line
              x1="109"
              y1="0"
              x2="0"
              y2="109"
              stroke="#f1f5f9"
              strokeWidth="0.6"
              strokeDasharray="2,3"
            />

            {/* Optional subtle ghost outline if toggled */}
            {showGhostAll &&
              strokeData?.strokes.map((s) => (
                <path
                  key={`ghost-${s.id}`}
                  d={s.d}
                  fill="none"
                  stroke="#94a3b8"
                  strokeOpacity="0.22"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

            {/* Already matched strokes stay visible in crisp ink */}
            {strokeData &&
              completedIndices.map((sIdx) => {
                const s = strokeData.strokes[sIdx];
                if (!s) return null;
                return (
                  <path
                    key={`done-${s.id}`}
                    d={s.d}
                    fill="none"
                    stroke={MAZII_STROKE_COLORS[sIdx % MAZII_STROKE_COLORS.length] || '#0F766E'}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

            {/* Optional hint for just current stroke */}
            {showNextHint && strokeData && strokeData.strokes[currentStrokeIdx] && (
              <g>
                <path
                  d={strokeData.strokes[currentStrokeIdx].d}
                  fill="none"
                  stroke="#f59e0b"
                  strokeOpacity="0.55"
                  strokeWidth="3.8"
                  strokeDasharray="3,3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {strokeData.startPoints[currentStrokeIdx] && (
                  <circle
                    cx={strokeData.startPoints[currentStrokeIdx].x}
                    cy={strokeData.startPoints[currentStrokeIdx].y}
                    r="3.2"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                )}
              </g>
            )}
          </svg>

          {/* Interactive Drawing Canvas */}
          <canvas
            ref={canvasRef}
            width={260}
            height={260}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
          />

          {/* Loading / Error / Done States */}
          {isLoadingStrokes && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
              <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
            </div>
          )}

          {loadError && !isLoadingStrokes && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 text-center gap-2 z-20">
              <p className="text-xs text-slate-600 font-medium">
                Không tải được dữ liệu nét viết cho chữ này.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleteOrReveal();
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-teal-700 rounded-xl cursor-pointer"
              >
                Mở đáp án
              </button>
            </div>
          )}

          {isDone && (
            <div className="absolute inset-0 bg-emerald-50/90 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center gap-1.5 z-20 animate-in fade-in duration-150">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div className="font-kanji text-5xl font-black text-teal-900">
                {activeChar}
              </div>
              <span className="text-xs font-bold text-emerald-800">
                Xuất sắc! Đang mở đáp án...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
