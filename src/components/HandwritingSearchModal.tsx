import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Undo2, Trash2, PenLine, Loader2 } from 'lucide-react';
import { Point } from '../utils/strokeMatcher';
import {
  HandwritingCandidate,
  loadHandwritingIndex,
  recognizeHandwrittenKanji,
} from '../services/handwritingService';

interface HandwritingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKanji: (kanji: string) => void;
}

const PAD_SIZE = 240;

export const HandwritingSearchModal: React.FC<HandwritingSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectKanji,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const activeStrokeRef = useRef<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [candidates, setCandidates] = useState<HandwritingCandidate[]>([]);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    loadHandwritingIndex()
      .then(() => {
        if (mounted) {
          setIsIndexReady(true);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setLoadError(err?.message || 'Không thể tải dữ liệu nét vẽ.');
        }
      });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const redrawCanvas = useCallback((strokes: Point[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, []);

  const runRecognition = useCallback(async (strokes: Point[][]) => {
    if (strokes.length === 0) {
      setCandidates([]);
      return;
    }
    try {
      const results = await recognizeHandwrittenKanji(strokes, PAD_SIZE, PAD_SIZE, 12);
      setCandidates(results);
    } catch {
      // Ignore transient recognition failures
    }
  }, []);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    activeStrokeRef.current = [];
    setStrokeCount(0);
    setCandidates([]);
    redrawCanvas([]);
  }, [redrawCanvas]);

  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const next = strokesRef.current.slice(0, -1);
    strokesRef.current = next;
    setStrokeCount(next.length);
    redrawCanvas(next);
    void runRecognition(next);
  }, [redrawCanvas, runRecognition]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const pt = getPoint(e);
    if (!pt) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(true);
    activeStrokeRef.current = [pt];

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = e.pointerType === 'pen' ? 6 : 6.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getPoint(e);
    if (!pt) return;
    activeStrokeRef.current.push(pt);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const pts = activeStrokeRef.current;
    activeStrokeRef.current = [];
    if (pts.length < 2) {
      redrawCanvas(strokesRef.current);
      return;
    }

    const next = [...strokesRef.current, pts];
    strokesRef.current = next;
    setStrokeCount(next.length);
    void runRecognition(next);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vẽ tay tìm chữ Kanji"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <PenLine className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">
                Vẽ tay tìm Kanji
              </h2>
              <p className="text-[11px] text-slate-500 truncate tabular-nums">
                {strokeCount > 0 ? `${strokeCount} nét đã vẽ` : 'Vẽ từng nét vào khung'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: 2 columns on desktop, stacked cleanly on mobile */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-[248px_1fr] gap-4 items-start">
          {/* Left: 1:1 Drawing Pad + Undo/Clear */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative w-[220px] h-[220px] sm:w-[240px] sm:h-[240px] rounded-2xl border-2 border-slate-200 bg-slate-50/70 overflow-hidden shadow-inner">
              {/* Crosshair guide lines */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full pointer-events-none text-slate-200"
                aria-hidden="true"
              >
                <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
                <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
              </svg>

              {strokeCount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-medium text-slate-400">Vẽ chữ Hán tại đây</span>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width={PAD_SIZE}
                height={PAD_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative z-10 w-full h-full touch-none cursor-crosshair"
              />
            </div>

            <div className="flex items-center gap-2 w-[220px] sm:w-[240px]">
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokeCount === 0}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Hoàn tác</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={strokeCount === 0}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-40 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            </div>
          </div>

          {/* Right: Candidates Grid */}
          <div className="space-y-2.5 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Gợi ý gần nhất</span>
              {!isIndexReady && !loadError && (
                <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Đang nạp...
                </span>
              )}
            </div>

            {loadError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {loadError}
              </div>
            ) : candidates.length === 0 ? (
              <div className="h-[200px] sm:h-[240px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-4 text-center">
                <p className="text-xs text-slate-400">
                  Kết quả nhận diện chữ Kanji sẽ hiện ngay sau nét đầu tiên.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[268px] overflow-y-auto pr-0.5">
                {candidates.map((cand) => (
                  <button
                    key={cand.kanji}
                    type="button"
                    onClick={() => {
                      onSelectKanji(cand.kanji);
                      onClose();
                    }}
                    className="group p-2 rounded-xl border border-slate-200/90 hover:border-teal-600 bg-white hover:bg-teal-50/60 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95"
                    title={`${cand.kanji}${cand.hanViet ? ` (${cand.hanViet})` : ''}${cand.meaning ? ` — ${cand.meaning}` : ''}`}
                  >
                    <span className="font-kanji font-bold text-2xl sm:text-3xl text-slate-900 group-hover:text-teal-800 leading-none">
                      {cand.kanji}
                    </span>
                    <span className="text-[10px] font-bold text-teal-800 truncate max-w-full mt-1">
                      {cand.hanViet || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {cand.strokeCount} nét
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
