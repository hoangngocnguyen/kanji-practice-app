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
  Sparkles
} from 'lucide-react';
import { KanjiItem, KanjiDetail } from '../types/kanji';
import { StrokeAnimation } from './StrokeAnimation';
import { getFullKanjiDetail } from '../utils/kanjiApi';
import { speakJapanese } from '../utils/speech';
import { getJlptBadgeClass } from '../utils/colorUtils';

interface PracticeModalProps {
  item: KanjiItem | null;
  onClose: () => void;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
}

type TabType = 'animation' | 'dictionary' | 'practice';

export const PracticeModal: React.FC<PracticeModalProps> = ({
  item,
  onClose,
  onCopyImage,
  onDownloadPng,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('animation');
  const [detail, setDetail] = useState<KanjiDetail | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0f766e');

  useEffect(() => {
    if (!item) return;

    setActiveTab('animation');

    let isMounted = true;
    getFullKanjiDetail(item.kanji)
      .then((res) => {
        if (isMounted) {
          setDetail(res);
        }
      })
      .catch(() => {});

    // Reset canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      isMounted = false;
    };
  }, [item]);

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

  // Drawing handlers for Practice tab
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header with Kanji & Sino-Vietnamese Reading */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span
              onClick={() => speakJapanese(item.kanji)}
              className="font-kanji font-black text-4xl sm:text-5xl text-teal-700 leading-none cursor-pointer hover:scale-105 transition-transform"
              title="Click để nghe phát âm tiếng Nhật"
            >
              {item.kanji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-wide">
                  {detail?.hanViet ? `Hán-Việt: ${detail.hanViet}` : `Chữ ${item.kanji}`}
                </h4>
                {detail?.jlpt && (
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${getJlptBadgeClass(detail.jlpt)}`}>
                    {detail.jlpt}
                  </span>
                )}
                <button
                  onClick={() => speakJapanese(item.kanji)}
                  className="p-1 rounded-lg text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-mono text-slate-400">
                U+{item.hex.toUpperCase()} • Thứ tự #{item.id}
                {detail?.strokeCount ? ` • ${detail.strokeCount} nét` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation with color indicators */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/50 p-1.5 gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('animation')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'animation'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-teal-600" />
            <span>Hoạt ảnh nét vẽ</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'dictionary'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span>Nghĩa & Từ ghép</span>
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-white text-teal-900 shadow-xs font-bold ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4 text-teal-600" />
            <span>Tập viết tay</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: STROKE ANIMATION */}
          {activeTab === 'animation' && (
            <div className="space-y-5">
              <StrokeAnimation svgUrl={item.svgUrl} kanji={item.kanji} size={280} />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => onCopyImage(item)}
                  className="py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Copy className="w-4 h-4" />
                  <span>Sao chép ảnh</span>
                </button>

                <button
                  onClick={() => onDownloadPng(item)}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200/80"
                >
                  <Download className="w-4 h-4" />
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

          {/* TAB 3: TRACING & WRITING PRACTICE */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-white rounded-2xl border-2 border-slate-200 p-2 shadow-inner flex items-center justify-center overflow-hidden">
                {/* SVG Background template */}
                <img
                  src={item.svgUrl}
                  alt={`Nét viết ${item.kanji}`}
                  className="w-full h-full object-contain pointer-events-none select-none filter opacity-35"
                />

                {/* Tracing canvas */}
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
                  title="Dùng chuột hoặc ngón tay để vẽ đè lên hình luyện viết"
                />
              </div>

              {/* Canvas Controls */}
              <div className="flex items-center justify-between text-xs border-y border-slate-100 py-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Màu mực:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { color: '#0f766e', label: 'Xanh ngọc bích thư pháp' },
                      { color: '#2563eb', label: 'Xanh dương đại dương' },
                      { color: '#0f172a', label: 'Đen mực tàu' },
                      { color: '#dc2626', label: 'Đỏ chu sa truyền thống' },
                    ].map(({ color, label }) => (
                      <button
                        key={color}
                        onClick={() => setPenColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          penColor === color ? 'scale-125 border-white ring-2 ring-teal-600' : 'border-transparent'
                        }`}
                        title={label}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Xóa nét vẽ tay</span>
                </button>
              </div>
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
