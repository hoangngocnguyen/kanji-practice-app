import React, { useRef, useState, useEffect } from 'react';
import { X, Copy, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { KanjiItem } from '../types/kanji';

interface PracticeModalProps {
  item: KanjiItem | null;
  onClose: () => void;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({
  item,
  onClose,
  onCopyImage,
  onDownloadPng,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#2563eb');

  useEffect(() => {
    // Reset canvas whenever modal item changes
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!item) return null;

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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-kanji font-black text-4xl text-blue-600 leading-none">
              {item.kanji}
            </span>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                Thứ tự nét viết chữ {item.kanji}
              </h4>
              <p className="text-xs font-mono text-slate-400">
                Unicode: U+{item.hex.toUpperCase()} • Thứ tự #{item.id}
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

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Large image & practice canvas (380x380 px) */}
          <div className="relative w-full aspect-square max-w-[380px] mx-auto bg-white rounded-2xl border-2 border-slate-200 p-2 shadow-inner flex items-center justify-center overflow-hidden">
            {/* SVG Background */}
            <img
              src={item.svgUrl}
              alt={`Nét viết ${item.kanji}`}
              className="w-full h-full object-contain pointer-events-none select-none filter contrast-125"
            />

            {/* Tracing canvas */}
            <canvas
              ref={canvasRef}
              width={380}
              height={380}
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
              <span className="text-slate-500 font-medium">Bút vẽ nét:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { color: '#2563eb', label: 'Xanh dương' },
                  { color: '#dc2626', label: 'Đỏ' },
                  { color: '#059669', label: 'Xanh lá' },
                  { color: '#0f172a', label: 'Đen mực' },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${penColor === color ? 'scale-125 border-white ring-2 ring-blue-500' : 'border-transparent'
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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onCopyImage(item)}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>📋 Copy ảnh nền trắng</span>
            </button>

            <button
              onClick={() => onDownloadPng(item)}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Tải ảnh PNG</span>
            </button>
          </div>

          <div className="text-center pt-1 space-y-1">
            <div>
              <a
                href={`https://jisho.org/search/${encodeURIComponent(item.kanji)}%20%23kanji`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-medium"
              >
                Tra cứu nghĩa, phát âm Onyomi/Kunyomi trên Jisho.org <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Dữ liệu nét vẽ: Dự án KanjiVG do Ulrich Apel sáng lập (Giấy phép CC BY-SA 3.0)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
