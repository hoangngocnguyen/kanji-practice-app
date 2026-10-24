import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Grid,
  Hash,
  Sparkles,
  Volume2,
  Repeat
} from 'lucide-react';
import { speakJapanese } from '../utils/speech';
import { KanjiGridOverlay } from './KanjiGridOverlay';

interface StrokeItem {
  id: string;
  d: string;
  index: number;
}

interface StrokeNumber {
  text: string;
  transform: string;
}

interface StrokeAnimationProps {
  svgUrl: string;
  kanji: string;
  size?: number;
  showGrid?: boolean;
  onToggleGrid?: (show: boolean) => void;
}

export const StrokeAnimation: React.FC<StrokeAnimationProps> = ({
  svgUrl,
  kanji,
  size = 320,
  showGrid: showGridProp,
  onToggleGrid,
}) => {
  const [strokes, setStrokes] = useState<StrokeItem[]>([]);
  const [strokeNumbers, setStrokeNumbers] = useState<StrokeNumber[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true); // Vẽ nét liên tục tự động lặp lại
  const [currentStrokeIdx, setCurrentStrokeIdx] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(0); // 0 to 1 for current stroke
  const [speed, setSpeed] = useState<number>(1.0);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [internalShowGrid, setInternalShowGrid] = useState<boolean>(true);
  const strokeIdxRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const clearLoopTimer = () => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  };

  const showGrid = showGridProp !== undefined ? showGridProp : internalShowGrid;
  const handleToggleGrid = () => {
    if (onToggleGrid) {
      onToggleGrid(!showGrid);
    } else {
      setInternalShowGrid(!internalShowGrid);
    }
  };

  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [pathLengths, setPathLengths] = useState<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLoopTimer();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Parse SVG
  useEffect(() => {
    let isCancelled = false;
    clearLoopTimer();
    isHoldingRef.current = false;
    strokeIdxRef.current = 0;
    progressRef.current = 0;
    lastTimeRef.current = null;
    setLoading(true);
    setError(null);
    setCurrentStrokeIdx(0);
    setCurrentProgress(0);
    setIsPlaying(true);

    async function fetchSvg() {
      try {
        const res = await fetch(svgUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (isCancelled) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');

        // Lấy tất cả các nét vẽ path trong cụm StrokePaths
        const pathElements = Array.from(doc.querySelectorAll('path[d]'));
        const parsedStrokes: StrokeItem[] = pathElements.map((el, i) => ({
          id: el.getAttribute('id') || `stroke-${i}`,
          d: el.getAttribute('d') || '',
          index: i,
        }));

        // Lấy các số thứ tự nét
        const textElements = Array.from(doc.querySelectorAll('g[id*="StrokeNumbers"] text'));
        const parsedNumbers: StrokeNumber[] = textElements.map((el) => ({
          text: el.textContent || '',
          transform: el.getAttribute('transform') || '',
        }));

        setStrokes(parsedStrokes);
        setStrokeNumbers(parsedNumbers);
        setPathLengths(new Array(parsedStrokes.length).fill(150)); // default fallback
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Không thể tải nét vẽ');
          setLoading(false);
        }
      }
    }

    fetchSvg();

    return () => {
      isCancelled = true;
      clearLoopTimer();
    };
  }, [svgUrl]);

  // Đo chiều dài thực tế của từng nét sau khi render
  useEffect(() => {
    if (strokes.length > 0 && pathRefs.current.length === strokes.length) {
      const lengths = pathRefs.current.map((path) => {
        if (path) {
          try {
            return path.getTotalLength();
          } catch {
            return 150;
          }
        }
        return 150;
      });
      setPathLengths(lengths);
    }
  }, [strokes]);

  // RequestAnimationFrame animation loop with continuous auto-repeat support
  useEffect(() => {
    if (!isPlaying || strokes.length === 0) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const durationPerStroke = 550 / speed; // ms cho mỗi nét tùy speed

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Nếu đang trong thời gian giữ chữ hoàn chỉnh trước khi tự động lặp lại từ đầu
      if (isHoldingRef.current) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const totalStrokes = strokes.length;
      if (totalStrokes === 0) return;

      const currentP = progressRef.current;
      const nextProgress = currentP + deltaTime / durationPerStroke;

      if (nextProgress >= 1) {
        const currentIdx = strokeIdxRef.current;
        if (currentIdx + 1 >= totalStrokes) {
          // Hoàn thành toàn bộ nét của chữ Kanji!
          // Giữ nét cuối cùng ở trạng thái hoàn chỉnh 100% để hiển thị trọn vẹn cả chữ
          progressRef.current = 1;
          setCurrentProgress(1);
          isHoldingRef.current = true;

          if (isLooping) {
            clearLoopTimer();
            // Dừng 900ms cho người dùng quan sát toàn bộ chữ Kanji hoàn chỉnh, sau đó tự động bắt đầu lại từ nét đầu tiên (nét 0)
            loopTimerRef.current = setTimeout(() => {
              clearLoopTimer();
              isHoldingRef.current = false;
              strokeIdxRef.current = 0;
              progressRef.current = 0;
              lastTimeRef.current = null;
              setCurrentStrokeIdx(0);
              setCurrentProgress(0);
            }, 900 / speed);
          } else {
            setIsPlaying(false);
            isHoldingRef.current = false;
          }
        } else {
          // Chuyển sang nét kế tiếp
          const nextIdx = currentIdx + 1;
          strokeIdxRef.current = nextIdx;
          progressRef.current = 0;
          setCurrentStrokeIdx(nextIdx);
          setCurrentProgress(0);
        }
      } else {
        progressRef.current = nextProgress;
        setCurrentProgress(nextProgress);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, strokes.length, speed, isLooping]);

  const handlePlayPause = () => {
    if (!isPlaying && strokeIdxRef.current >= strokes.length - 1 && progressRef.current >= 1) {
      // Replay từ đầu nếu đã kết thúc toàn bộ chữ
      clearLoopTimer();
      isHoldingRef.current = false;
      strokeIdxRef.current = 0;
      progressRef.current = 0;
      lastTimeRef.current = null;
      setCurrentStrokeIdx(0);
      setCurrentProgress(0);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      clearLoopTimer();
      setIsPlaying(false);
    } else {
      lastTimeRef.current = null;
      setIsPlaying(true);
    }
  };

  const handleReplay = () => {
    clearLoopTimer();
    isHoldingRef.current = false;
    strokeIdxRef.current = 0;
    progressRef.current = 0;
    lastTimeRef.current = null;
    setCurrentStrokeIdx(0);
    setCurrentProgress(0);
    setIsPlaying(true);
  };

  const handlePrevStroke = () => {
    clearLoopTimer();
    isHoldingRef.current = false;
    setIsPlaying(false);
    const prev = Math.max(0, strokeIdxRef.current - 1);
    strokeIdxRef.current = prev;
    progressRef.current = 0;
    lastTimeRef.current = null;
    setCurrentStrokeIdx(prev);
    setCurrentProgress(0);
  };

  const handleNextStroke = () => {
    clearLoopTimer();
    isHoldingRef.current = false;
    setIsPlaying(false);
    const next = Math.min(strokes.length - 1, strokeIdxRef.current + 1);
    strokeIdxRef.current = next;
    progressRef.current = 0;
    lastTimeRef.current = null;
    setCurrentStrokeIdx(next);
    setCurrentProgress(0);
  };

  const handleToggleLoop = () => {
    setIsLooping((prev) => {
      const next = !prev;
      if (!next && isHoldingRef.current) {
        clearLoopTimer();
        isHoldingRef.current = false;
        setIsPlaying(false);
      }
      return next;
    });
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
  };

  if (loading) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-200"
      >
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-slate-500 mt-3 font-medium">Đang tải hoạt ảnh nét...</span>
      </div>
    );
  }

  if (error || strokes.length === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex flex-col items-center justify-center bg-rose-50/50 rounded-2xl border border-rose-200 text-rose-600 p-4 text-center"
      >
        <span className="text-xs font-semibold">Chưa có dữ liệu hoạt ảnh nét cho chữ này</span>
      </div>
    );
  }

  const total = strokes.length;
  const currentNum = Math.min(currentStrokeIdx + 1, total);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-sm mx-auto">
      {/* Top Banner Status */}
      <div className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 mb-2 bg-slate-100/80 rounded-xl font-medium text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          <span>
            Nét thứ <strong className="text-rose-700 font-bold">{currentNum}</strong> / {total}
          </span>
        </div>
        <button
          onClick={() => speakJapanese(kanji)}
          className="inline-flex items-center gap-1 text-slate-600 hover:text-teal-800 font-semibold cursor-pointer px-1.5 py-0.5 rounded hover:bg-white"
          title="Nghe phát âm chuẩn tiếng Nhật"
        >
          <Volume2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Phát âm</span>
        </button>
      </div>

      {/* SVG Canvas Box */}
      <div
        className="relative w-full aspect-square bg-white rounded-3xl border-2 border-slate-200 shadow-sm flex items-center justify-center overflow-hidden mx-auto"
        style={{ maxWidth: size, maxHeight: size }}
      >
        {/* Practice Grid */}
        {showGrid && <KanjiGridOverlay />}

        {/* SVG Drawing Canvas */}
        <svg
          viewBox="0 0 109 109"
          className="w-full h-full p-3 sm:p-4 transform"
        >
          {/* 1. Nét phác thảo mờ (Guide outlines) */}
          <g style={{ fill: 'none', stroke: '#f1f5f9', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            {strokes.map((s, idx) => (
              <path key={`guide-${idx}`} d={s.d} />
            ))}
          </g>

          {/* 2. Các nét đã vẽ xong hoàn toàn */}
          <g style={{ fill: 'none', stroke: '#1e293b', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            {strokes.map((s, idx) => {
              if (idx < currentStrokeIdx) {
                return <path key={`done-${idx}`} d={s.d} />;
              }
              return null;
            })}
          </g>

          {/* 3. Nét đang vẽ (Animated Stroke) */}
          {strokes[currentStrokeIdx] && (
            <path
              ref={(el) => {
                pathRefs.current[currentStrokeIdx] = el;
              }}
              d={strokes[currentStrokeIdx].d}
              style={{
                fill: 'none',
                stroke: '#dc2626', // Màu đỏ chu sa (Shu-iro) thư pháp Nhật Bản truyền thống
                strokeWidth: 3.6,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeDasharray: pathLengths[currentStrokeIdx] || 150,
                strokeDashoffset: (pathLengths[currentStrokeIdx] || 150) * (1 - currentProgress),
                filter: 'drop-shadow(0 1px 3px rgba(220,38,38,0.35))',
              }}
            />
          )}

          {/* 4. Số thứ tự các nét (Stroke numbers) */}
          {showNumbers && (
            <g style={{ fontSize: '8px', fill: '#64748b', fontWeight: 600 }}>
              {strokeNumbers.map((num, i) => {
                // Chỉ hiện số nét cho các nét đã hoặc đang vẽ
                if (i <= currentStrokeIdx) {
                  return (
                    <text
                      key={`num-${i}`}
                      transform={num.transform}
                      style={{
                        fill: i === currentStrokeIdx ? '#dc2626' : '#94a3b8',
                        fontWeight: i === currentStrokeIdx ? 800 : 500,
                      }}
                    >
                      {num.text}
                    </text>
                  );
                }
                return null;
              })}
            </g>
          )}
        </svg>

        {/* Step Indicator Pill Bottom Corner */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-mono font-bold text-slate-700 shadow-2xs">
          {Math.round(((currentStrokeIdx + currentProgress) / total) * 100)}%
        </div>
      </div>

      {/* Animation Player Controls */}
      <div className="w-full mt-3 bg-slate-100/90 rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs space-y-2">
        {/* Main playback buttons */}
        <div className="flex items-center justify-center gap-2">
          {/* Replay */}
          <button
            onClick={handleReplay}
            className="p-2 rounded-xl text-slate-600 hover:text-teal-800 hover:bg-white transition-all cursor-pointer"
            title="Vẽ lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Prev stroke */}
          <button
            onClick={handlePrevStroke}
            disabled={currentStrokeIdx === 0}
            className="p-2 rounded-xl text-slate-600 hover:text-teal-800 hover:bg-white transition-all disabled:opacity-30 cursor-pointer"
            title="Lùi về nét trước"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="p-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all shadow-md shadow-teal-900/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            title={isPlaying ? 'Tạm dừng' : 'Chạy tiếp'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span className="text-xs">{isPlaying ? 'Tạm dừng' : 'Phát nét'}</span>
          </button>

          {/* Next stroke */}
          <button
            onClick={handleNextStroke}
            disabled={currentStrokeIdx >= total - 1}
            className="p-2 rounded-xl text-slate-600 hover:text-teal-800 hover:bg-white transition-all disabled:opacity-30 cursor-pointer"
            title="Tiến sang nét sau"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Toggle */}
          <button
            onClick={handleSpeedChange}
            className="px-2.5 py-1.5 rounded-xl bg-white text-slate-700 font-mono text-xs font-bold border border-slate-200 hover:border-teal-300 hover:text-teal-800 transition-all cursor-pointer shadow-2xs"
            title="Thay đổi tốc độ phát"
          >
            {speed}x
          </button>
        </div>

        {/* Sub toggles: Grid, Numbers & Continuous Loop */}
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 px-1 text-xs text-slate-600 gap-1.5 flex-wrap">
          {/* Loop toggle */}
          <button
            onClick={handleToggleLoop}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
              isLooping
                ? 'bg-teal-50 text-teal-950 border-2 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
            }`}
            title="Nhấp để Bật/Tắt chế độ tự động vẽ lặp lại liên tục"
          >
            <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'text-teal-700 animate-spin-slow' : 'text-slate-400'}`} />
            <span>Vẽ liên tục</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                isLooping ? 'bg-teal-700 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {isLooping ? '✓ BẬT' : '○ TẮT'}
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            {/* Grid toggle */}
            <button
              onClick={handleToggleGrid}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                showGrid
                  ? 'bg-teal-50 text-teal-950 border-2 border-teal-600 ring-2 ring-teal-500/20'
                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
              }`}
              title="Nhấp để Bật/Tắt đường lưới ô nét đứt"
            >
              <Grid className={`w-3.5 h-3.5 ${showGrid ? 'text-teal-700' : 'text-slate-400'}`} />
              <span>Lưới ô</span>
              <span
                className={`px-1 py-0.2 rounded text-[9px] font-black ${
                  showGrid ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {showGrid ? '✓' : '○'}
              </span>
            </button>

            {/* Numbers toggle */}
            <button
              onClick={() => setShowNumbers(!showNumbers)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                showNumbers
                  ? 'bg-teal-50 text-teal-950 border-2 border-teal-600 ring-2 ring-teal-500/20'
                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
              }`}
              title="Nhấp để Bật/Tắt số thứ tự nét 1, 2, 3"
            >
              <Hash className={`w-3.5 h-3.5 ${showNumbers ? 'text-teal-700' : 'text-slate-400'}`} />
              <span>Số nét</span>
              <span
                className={`px-1 py-0.2 rounded text-[9px] font-black ${
                  showNumbers ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {showNumbers ? '✓' : '○'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
