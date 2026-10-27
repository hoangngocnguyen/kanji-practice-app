import React, { useState, useEffect } from 'react';
import { Settings, X, Palette, Columns, History, BookOpen, Grid, Check, RotateCcw, Trash2, Sparkles } from 'lucide-react';
import { MAZII_STROKE_COLORS } from './StrokeAnimation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyCount: number;
  onClearHistory: () => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  historyCount,
  onClearHistory,
  showToast,
}) => {
  // 1. Color mode ('multi' | 'single')
  const [colorMode, setColorMode] = useState<'multi' | 'single'>(() => {
    try {
      return (localStorage.getItem('kanji_stroke_color_mode') as 'multi' | 'single') || 'multi';
    } catch {
      return 'multi';
    }
  });

  // 2. Single stroke color
  const [singleColor, setSingleColor] = useState<string>(() => {
    try {
      return localStorage.getItem('kanji_stroke_single_color') || '#dc2626';
    } catch {
      return '#dc2626';
    }
  });

  // 3. Grid overlay setting
  const [defaultGrid, setDefaultGrid] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kanji_setting_grid');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // 4. List Furigana setting (Default false as requested)
  const [showListFurigana, setShowListFurigana] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kanji_setting_list_furigana');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectColorMode = (mode: 'multi' | 'single') => {
    setColorMode(mode);
    try {
      localStorage.setItem('kanji_stroke_color_mode', mode);
      window.dispatchEvent(new Event('storage'));
      if (showToast) showToast(`Đã chuyển sang chế độ nét ${mode === 'multi' ? 'Đa màu (Mazii)' : 'Đơn màu'}`, 'info');
    } catch {}
  };

  const handleSelectSingleColor = (color: string) => {
    setSingleColor(color);
    try {
      localStorage.setItem('kanji_stroke_single_color', color);
      window.dispatchEvent(new Event('storage'));
      if (showToast) showToast('Đã lưu màu nét vẽ đơn', 'info');
    } catch {}
  };

  const handleToggleListFurigana = (val: boolean) => {
    setShowListFurigana(val);
    try {
      localStorage.setItem('kanji_setting_list_furigana', String(val));
      window.dispatchEvent(new Event('storage'));
      if (showToast) showToast(`Đã ${val ? 'BẬT' : 'TẮT'} phiên âm Hiragana trên đầu chữ Kanji`, 'info');
    } catch {}
  };

  const handleResetDefaults = () => {
    try {
      localStorage.setItem('kanji_stroke_color_mode', 'multi');
      localStorage.setItem('kanji_stroke_single_color', '#dc2626');
      localStorage.setItem('kanji_setting_grid', 'true');
      localStorage.setItem('kanji_setting_list_furigana', 'false');
      setColorMode('multi');
      setSingleColor('#dc2626');
      setDefaultGrid(true);
      setShowListFurigana(false);
      window.dispatchEvent(new Event('storage'));
      if (showToast) showToast('Đã khôi phục cài đặt mặc định ban đầu!', 'success');
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/80">
              <Settings className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Cài đặt chung ứng dụng</h3>
              <p className="text-xs text-slate-500">Tùy chỉnh màu sắc nét vẽ, hiển thị & lưu trữ hệ thống</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* SECTION 1: KANJI STROKE COLOR MODE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Palette className="w-4 h-4 text-teal-600" />
              <span>1. Chế độ màu sắc hoạt ảnh nét vẽ Kanji</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectColorMode('multi')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                  colorMode === 'multi'
                    ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 font-bold text-teal-950 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm">Đa màu nét (Mazii)</span>
                  {colorMode === 'multi' && <Check className="w-4 h-4 text-teal-600" />}
                </div>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  Mỗi nét có một màu sinh động riêng biệt (Blue, Red, Black, Green, Purple...)
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {MAZII_STROKE_COLORS.slice(0, 8).map((c) => (
                    <span key={c} className="w-3 h-3 rounded-full shadow-2xs" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectColorMode('single')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                  colorMode === 'single'
                    ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 font-bold text-teal-950 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm">Đơn màu đồng nhất</span>
                  {colorMode === 'single' && <Check className="w-4 h-4 text-teal-600" />}
                </div>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  Tất cả các nét sử dụng 1 màu accent chủ đạo tùy chọn
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: singleColor }} />
                  <span className="text-[11px] text-slate-600 font-semibold">{singleColor}</span>
                </div>
              </button>
            </div>

            {/* Single color swatches selector */}
            {colorMode === 'single' && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-xs font-semibold text-slate-600">Chọn màu đơn chủ đạo:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { color: '#dc2626', label: 'Đỏ chu sa truyền thống' },
                    { color: '#0f766e', label: 'Xanh ngọc bích' },
                    { color: '#2563eb', label: 'Xanh dương đại dương' },
                    { color: '#16a34a', label: 'Xanh lá thư pháp' },
                    { color: '#9333ea', label: 'Tím đậm' },
                    { color: '#0f172a', label: 'Đen mực tàu' },
                  ].map(({ color, label }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleSelectSingleColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all cursor-pointer ${
                        singleColor === color ? 'scale-110 border-white ring-2 ring-teal-600 shadow-xs' : 'border-transparent opacity-85 hover:opacity-100'
                      }`}
                      title={label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: DISPLAY OPTIONS */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>2. Tùy chọn hiển thị danh sách Kanji</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-800 block">
                  Hiện Hiragana (Furigana) trên đầu chữ Kanji
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Hiển thị phiên âm Hiragana nhỏ trên đầu mỗi chữ Hán trong danh sách tra cứu
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleListFurigana(!showListFurigana)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs active:scale-95 text-xs shrink-0 ${
                  showListFurigana
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {showListFurigana ? '✓ BẬT' : '○ TẮT'}
              </button>
            </div>
          </div>

          {/* SECTION 3: RECENT HISTORY & MEMORY */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>3. Bộ nhớ Lịch sử tra cứu Kanji</span>
              </span>
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                Lưu tối đa 25 từ
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Lịch sử tự động lưu {historyCount} Kanji gần nhất vào trình duyệt để mở lại tức thì mà không cần dán lại đoạn văn.
            </p>

            {historyCount > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    if (showToast) showToast('Đã xóa toàn bộ lịch sử tra cứu', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa bộ nhớ lịch sử ({historyCount} từ)</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: SYSTEM INFO & RESET */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>3. Dữ liệu & Tùy chỉnh</span>
              </span>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Khôi phục lại toàn bộ cài đặt về mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại mặc định</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Tất cả cấu hình được lưu trực tiếp trên thiết bị của bạn và không gửi bất kỳ dữ liệu cá nhân nào lên máy chủ.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
