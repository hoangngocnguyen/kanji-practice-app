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
  Volume2
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
  const [currentStrokeIdx, setCurrentStrokeIdx] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(0); // 0 to 1 for current stroke
  const [speed, setSpeed] = useState<number>(1.0);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [internalShowGrid, setInternalShowGrid] = useState<boolean>(true);

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
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Parse SVG
  useEffect(() => {
    let isCancelled = false;
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

  // RequestAnimationFrame animation loop
  useEffect(() => {
    if (!isPlaying || strokes.length === 0) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const durationPerStroke = 600 / speed; // ms cho mỗi nét tùy speed

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setCurrentProgress((prev) => {
        const next = prev + deltaTime / durationPerStroke;
        if (next >= 1) {
          // Hoàn thành nét hiện tại, chuyển sang nét kế tiếp
          setCurrentStrokeIdx((currIdx) => {
            if (currIdx + 1 >= strokes.length) {
              // Hoàn thành cả chữ -> lặp lại sau 1.2s nghỉ
              setTimeout(() => {
                setCurrentStrokeIdx(0);
                setCurrentProgress(0);
                lastTimeRef.current = null;
              }, 1200 / speed);
              setIsPlaying(false);
              return currIdx;
            }
            return currIdx + 1;
          });
          return 0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, strokes.length, speed, currentStrokeIdx]);

  const handlePlayPause = () => {
    if (!isPlaying && currentStrokeIdx >= strokes.length - 1 && currentProgress >= 1) {
      // Replay từ đầu nếu đã kết thúc
      setCurrentStrokeIdx(0);
      setCurrentProgress(0);
      lastTimeRef.current = null;
    }
    setIsPlaying(!isPlaying);
  };

  const handleReplay = () => {
    setCurrentStrokeIdx(0);
    setCurrentProgress(0);
    lastTimeRef.current = null;
    setIsPlaying(true);
  };

  const handlePrevStroke = () => {
    setIsPlaying(false);
    setCurrentProgress(0);
    setCurrentStrokeIdx((prev) => Math.max(0, prev - 1));
  };

  const handleNextStroke = () => {
    setIsPlaying(false);
    setCurrentProgress(0);
    setCurrentStrokeIdx((prev) => Math.min(strokes.length - 1, prev + 1));
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

        {/* Sub toggles: Grid & Numbers */}
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 px-1 text-xs text-slate-600">
          <button
            onClick={handleToggleGrid}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              showGrid ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80' : 'text-slate-500 hover:bg-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Lưới ô</span>
          </button>

          <button
            onClick={() => setShowNumbers(!showNumbers)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              showNumbers ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80' : 'text-slate-500 hover:bg-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Số nét (1, 2, 3)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
