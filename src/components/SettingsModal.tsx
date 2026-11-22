import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Palette,
  History,
  BookOpen,
  Check,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import {
  DEFAULT_STROKE_SPEED_KEY,
  MAZII_STROKE_COLORS,
  STROKE_SPEED_OPTIONS,
  getSavedDefaultStrokeSpeed,
} from './StrokeAnimation';
import { KanjiItem } from '../types/kanji';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyCount: number;
  historyItems?: KanjiItem[];
  historyLimit?: number | null;
  onChangeHistoryLimit?: (limit: number | null) => void;
  onRemoveHistoryChars?: (chars: string[]) => void;
  onTrimHistoryToLimit?: (limit: number) => void;
  onClearHistory: () => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const HISTORY_PRESETS: Array<{ label: string; value: number | null }> = [
  { label: '25 từ', value: 25 },
  { label: '50 từ', value: 50 },
  { label: '100 từ', value: 100 },
  { label: '200 từ', value: 200 },
  { label: 'Không giới hạn', value: null },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  historyCount,
  historyItems = [],
  historyLimit = 50,
  onChangeHistoryLimit,
  onRemoveHistoryChars,
  onTrimHistoryToLimit,
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

  // 3. Default stroke animation speed
  const [defaultStrokeSpeed, setDefaultStrokeSpeed] = useState<number>(() =>
    getSavedDefaultStrokeSpeed()
  );

  // 4. List Furigana setting
  const [showListFurigana, setShowListFurigana] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kanji_setting_list_furigana');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  // 5. Input & Romaji Font Size setting
  const [fontSize, setFontSize] = useState<string>(() => {
    try {
      return localStorage.getItem('kanji_setting_input_font_size') || 'md';
    } catch {
      return 'md';
    }
  });

  // 6. History limit editor & 2-option reduction confirmation state
  const [customLimitInput, setCustomLimitInput] = useState<string>(() =>
    historyLimit === null ? '' : String(historyLimit)
  );
  const [pendingLimit, setPendingLimit] = useState<number | null>(null);
  const [isSelectingToDelete, setIsSelectingToDelete] = useState<boolean>(false);
  const [selectedCharsToDelete, setSelectedCharsToDelete] = useState<string[]>([]);
  const [historyFeedback, setHistoryFeedback] = useState<string | null>(null);
  const [historyLimitError, setHistoryLimitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDefaultStrokeSpeed(getSavedDefaultStrokeSpeed());
      setCustomLimitInput(historyLimit === null ? '' : String(historyLimit));
      setPendingLimit(null);
      setIsSelectingToDelete(false);
      setSelectedCharsToDelete([]);
      setHistoryFeedback(null);
      setHistoryLimitError(null);
    }
  }, [isOpen, historyLimit]);

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
      if (showToast) {
        showToast(
          `Đã chuyển sang chế độ nét ${mode === 'multi' ? 'Đa màu (Mazii)' : 'Đơn màu'}`,
          'info'
        );
      }
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

  const handleSelectDefaultStrokeSpeed = (speed: number) => {
    setDefaultStrokeSpeed(speed);
    try {
      localStorage.setItem(DEFAULT_STROKE_SPEED_KEY, String(speed));
      window.dispatchEvent(
        new CustomEvent('kanji-stroke-speed-change', { detail: { speed } })
      );
      window.dispatchEvent(new Event('storage'));
      if (showToast) {
        showToast(`Đã áp dụng tốc độ nét vẽ ${speed}x cho mọi hoạt ảnh`, 'info');
      }
    } catch {}
  };

  const handleToggleListFurigana = (val: boolean) => {
    setShowListFurigana(val);
    try {
      localStorage.setItem('kanji_setting_list_furigana', String(val));
      window.dispatchEvent(new Event('storage'));
      if (showToast) {
        showToast(
          `Đã ${val ? 'BẬT' : 'TẮT'} phiên âm Hiragana trên đầu chữ Kanji`,
          'info'
        );
      }
    } catch {}
  };

  const handleSelectFontSize = (size: string) => {
    setFontSize(size);
    try {
      localStorage.setItem('kanji_setting_input_font_size', size);
      window.dispatchEvent(new Event('storage'));
      if (showToast) {
        showToast(
          `Đã đổi cỡ chữ ô nhập liệu sang ${
            size === 'sm' ? '12px' : size === 'lg' ? '16px' : size === 'xl' ? '18px' : '14px'
          }`,
          'info'
        );
      }
    } catch {}
  };

  const applyRequestedHistoryLimit = (nextLimit: number | null) => {
    setHistoryLimitError(null);
    setHistoryFeedback(null);

    if (nextLimit === null) {
      onChangeHistoryLimit?.(null);
      setCustomLimitInput('');
      setPendingLimit(null);
      setIsSelectingToDelete(false);
      setSelectedCharsToDelete([]);
      setHistoryFeedback('Đã chuyển bộ nhớ lịch sử sang Không giới hạn.');
      return;
    }

    if (Number.isNaN(nextLimit) || nextLimit < 5) {
      setHistoryLimitError('Vui lòng nhập giới hạn tối thiểu 5 chữ Kanji.');
      return;
    }

    const safeLimit = Math.min(5000, Math.floor(nextLimit));
    setCustomLimitInput(String(safeLimit));

    if (historyCount > safeLimit) {
      // Prompt user with 2 options instead of silently deleting history
      setPendingLimit(safeLimit);
      setIsSelectingToDelete(false);
      setSelectedCharsToDelete([]);
      return;
    }

    onChangeHistoryLimit?.(safeLimit);
    setPendingLimit(null);
    setIsSelectingToDelete(false);
    setSelectedCharsToDelete([]);
    setHistoryFeedback(`Đã lưu giới hạn tối đa ${safeLimit} chữ Kanji.`);
  };

  const handleApplyCustomLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customLimitInput.trim(), 10);
    if (Number.isNaN(parsed)) {
      setHistoryLimitError('Vui lòng nhập một số hợp lệ (tối thiểu 5).');
      return;
    }
    applyRequestedHistoryLimit(parsed);
  };

  const excessCount =
    pendingLimit !== null ? Math.max(0, historyItems.length - pendingLimit) : 0;

  const handleTrimOldestConfirm = () => {
    if (pendingLimit === null) return;
    onTrimHistoryToLimit?.(pendingLimit);
    setHistoryFeedback(
      `Đã xóa ${excessCount} chữ cũ nhất và đặt giới hạn mới ${pendingLimit} chữ.`
    );
    setPendingLimit(null);
    setIsSelectingToDelete(false);
    setSelectedCharsToDelete([]);
  };

  const toggleSelectCharToDelete = (char: string) => {
    setSelectedCharsToDelete((prev) =>
      prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char]
    );
  };

  const handleQuickSelectOldest = () => {
    if (pendingLimit === null || excessCount <= 0) return;
    const oldest = historyItems.slice(pendingLimit).map((k) => k.kanji);
    setSelectedCharsToDelete(oldest);
  };

  const handleConfirmSelectedDeletes = () => {
    if (pendingLimit === null || selectedCharsToDelete.length < excessCount) return;
    const removedCount = selectedCharsToDelete.length;
    onRemoveHistoryChars?.(selectedCharsToDelete);
    onChangeHistoryLimit?.(pendingLimit);
    setHistoryFeedback(
      `Đã xóa ${removedCount} chữ đã chọn và đặt giới hạn mới ${pendingLimit} chữ.`
    );
    setPendingLimit(null);
    setIsSelectingToDelete(false);
    setSelectedCharsToDelete([]);
  };

  const handleCancelPendingLimit = () => {
    setPendingLimit(null);
    setIsSelectingToDelete(false);
    setSelectedCharsToDelete([]);
    setCustomLimitInput(historyLimit === null ? '' : String(historyLimit));
  };

  const handleResetDefaults = () => {
    try {
      localStorage.setItem('kanji_stroke_color_mode', 'multi');
      localStorage.setItem('kanji_stroke_single_color', '#dc2626');
      localStorage.setItem(DEFAULT_STROKE_SPEED_KEY, '1');
      localStorage.setItem('kanji_setting_grid', 'true');
      localStorage.setItem('kanji_setting_list_furigana', 'false');
      localStorage.setItem('kanji_setting_input_font_size', 'md');
      setColorMode('multi');
      setSingleColor('#dc2626');
      setDefaultStrokeSpeed(1.0);
      setShowListFurigana(false);
      setFontSize('md');
      onChangeHistoryLimit?.(50);
      setCustomLimitInput('50');
      setPendingLimit(null);
      setIsSelectingToDelete(false);
      setSelectedCharsToDelete([]);
      window.dispatchEvent(
        new CustomEvent('kanji-stroke-speed-change', { detail: { speed: 1.0 } })
      );
      window.dispatchEvent(new Event('storage'));
      if (showToast) showToast('Đã khôi phục cài đặt mặc định ban đầu!', 'success');
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 max-h-[100dvh] z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-hidden overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-full sm:max-h-[90dvh] min-h-0 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/80">
              <Settings className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Cài đặt chung ứng dụng
              </h3>
              <p className="text-xs text-slate-500">
                Tùy chỉnh nét vẽ, tốc độ hoạt ảnh, hiển thị &amp; bộ nhớ lịch sử
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng cài đặt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-5 text-xs sm:text-sm">
          {/* SECTION 1: KANJI STROKE COLOR & SPEED */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Palette className="w-4 h-4 text-teal-600" />
              <span>1. Màu sắc &amp; Tốc độ hoạt ảnh nét vẽ Kanji</span>
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
                  Mỗi nét có một màu sinh động riêng biệt để dễ phân biệt thứ tự
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {MAZII_STROKE_COLORS.slice(0, 8).map((c) => (
                    <span
                      key={c}
                      className="w-3 h-3 rounded-full shadow-2xs"
                      style={{ backgroundColor: c }}
                    />
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
                  Tất cả các nét sử dụng 1 màu chủ đạo tùy chọn
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-300"
                    style={{ backgroundColor: singleColor }}
                  />
                  <span className="text-[11px] text-slate-600 font-semibold">{singleColor}</span>
                </div>
              </button>
            </div>

            {/* Single color swatches selector */}
            {colorMode === 'single' && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-xs font-semibold text-slate-600">
                  Chọn màu đơn chủ đạo:
                </span>
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
                        singleColor === color
                          ? 'scale-110 border-white ring-2 ring-teal-600 shadow-xs'
                          : 'border-transparent opacity-85 hover:opacity-100'
                      }`}
                      title={label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Default Stroke Animation Speed */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-teal-700" />
                    <span>Tốc độ nét vẽ mặc định</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Áp dụng ngay cho mọi khung hoạt ảnh nét đang mở và khi mở chữ mới
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg shrink-0 tabular-nums">
                  {defaultStrokeSpeed}x
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {STROKE_SPEED_OPTIONS.map((spd) => {
                  const isActive = defaultStrokeSpeed === spd;
                  const subLabel =
                    spd === 0.5
                      ? 'Chậm rõ'
                      : spd === 1.0
                        ? 'Chuẩn'
                        : spd === 2.0
                          ? 'Nhanh'
                          : '';
                  return (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handleSelectDefaultStrokeSpeed(spd)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border flex flex-col items-center justify-center ${
                        isActive
                          ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-mono tabular-nums">{spd}x</span>
                      {subLabel && (
                        <span
                          className={`text-[9px] font-medium leading-tight mt-0.5 ${
                            isActive ? 'text-teal-100' : 'text-slate-400'
                          }`}
                        >
                          {subLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: DISPLAY OPTIONS */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>2. Tùy chọn hiển thị &amp; Cỡ chữ ô nhập</span>
            </div>

            {/* Font size selector for input & romaji text */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-800 block">
                  Kích cỡ chữ ô nhập liệu &amp; phiên âm Romaji
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Tùy chỉnh cỡ chữ văn bản tiếng Nhật &amp; dòng phiên âm Romaji
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { id: 'sm', label: '12px (Nhỏ)' },
                  { id: 'md', label: '14px (Vừa)' },
                  { id: 'lg', label: '16px (Lớn)' },
                  { id: 'xl', label: '18px (Rất lớn)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectFontSize(opt.id)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                      fontSize === opt.id
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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

          {/* SECTION 3: RECENT HISTORY & CONFIGURABLE MEMORY LIMIT */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>3. Bộ nhớ Lịch sử tra cứu Kanji</span>
              </span>
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full tabular-nums">
                {historyLimit === null
                  ? `Đang lưu ${historyCount} / Không giới hạn`
                  : `Đang lưu ${historyCount} / ${historyLimit} từ`}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Chọn số lượng chữ Kanji tối đa muốn lưu tự động vào lịch sử trình duyệt để mở lại tức thì.
            </p>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {HISTORY_PRESETS.map((preset) => {
                const isActive =
                  pendingLimit !== null
                    ? pendingLimit === preset.value
                    : historyLimit === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyRequestedHistoryLimit(preset.value)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer tabular-nums ${
                      isActive
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom numeric input */}
            <form onSubmit={handleApplyCustomLimit} className="flex items-center gap-2">
              <label className="text-xs text-slate-600 font-medium shrink-0" htmlFor="custom-history-limit">
                Hoặc nhập số lượng:
              </label>
              <input
                id="custom-history-limit"
                type="number"
                min={5}
                max={5000}
                value={customLimitInput}
                onChange={(e) => {
                  setCustomLimitInput(e.target.value);
                  setHistoryLimitError(null);
                }}
                placeholder="VD: 25"
                className="w-24 px-2.5 py-1.5 text-xs font-bold tabular-nums bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
              >
                Áp dụng
              </button>
            </form>

            {historyLimitError && (
              <p className="text-xs font-medium text-rose-600">{historyLimitError}</p>
            )}

            {historyFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{historyFeedback}</span>
              </div>
            )}

            {/* Confirmation Card when lowering limit below current saved items */}
            {pendingLimit !== null && excessCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-amber-950">
                      Lịch sử hiện có {historyItems.length} chữ, vượt mức mới {pendingLimit} chữ
                    </p>
                    <p className="text-amber-800 leading-relaxed">
                      Cần xóa tối thiểu <strong className="tabular-nums">{excessCount}</strong> chữ
                      để thu gọn bộ nhớ. Bạn muốn xử lý theo cách nào?
                    </p>
                  </div>
                </div>

                {!isSelectingToDelete ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTrimOldestConfirm}
                      className="px-3 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Xóa {excessCount} từ cũ nhất
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectingToDelete(true);
                        setSelectedCharsToDelete([]);
                      }}
                      className="px-3 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Chọn từ để xóa
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelPendingLimit}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer ml-auto"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-2 border-t border-amber-200/80">
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                      <span className="font-semibold text-amber-950 tabular-nums">
                        Đã chọn{' '}
                        <strong
                          className={
                            selectedCharsToDelete.length >= excessCount
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }
                        >
                          {selectedCharsToDelete.length}
                        </strong>{' '}
                        / cần tối thiểu {excessCount} chữ
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleQuickSelectOldest}
                          className="font-semibold text-teal-800 hover:underline cursor-pointer"
                        >
                          Chọn nhanh {excessCount} chữ cũ nhất
                        </button>
                        {selectedCharsToDelete.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedCharsToDelete([])}
                            className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Bỏ chọn
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-44 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 pr-1">
                      {historyItems.map((hItem, idx) => {
                        const checked = selectedCharsToDelete.includes(hItem.kanji);
                        const isOverLimit = idx >= pendingLimit;
                        return (
                          <button
                            key={hItem.kanji}
                            type="button"
                            onClick={() => toggleSelectCharToDelete(hItem.kanji)}
                            className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                              checked
                                ? 'bg-rose-50 border-rose-400 text-rose-900'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'bg-rose-600 border-rose-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </span>
                            <span className="font-kanji font-bold text-base leading-none shrink-0">
                              {hItem.kanji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-semibold truncate">
                                {hItem.detail?.hanViet || `#${idx + 1}`}
                              </div>
                              {isOverLimit && (
                                <div className="text-[9px] text-amber-700 font-semibold">
                                  Cũ
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelPendingLimit}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-xl cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={selectedCharsToDelete.length < excessCount}
                        onClick={handleConfirmSelectedDeletes}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                      >
                        Xóa {selectedCharsToDelete.length} chữ &amp; Lưu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {historyCount > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setPendingLimit(null);
                    setIsSelectingToDelete(false);
                    setSelectedCharsToDelete([]);
                    if (showToast) showToast('Đã xóa toàn bộ lịch sử tra cứu', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa toàn bộ lịch sử ({historyCount} từ)</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4: SYSTEM INFO & RESET */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-teal-600" />
                <span>4. Dữ liệu &amp; Khôi phục</span>
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
              Tất cả cấu hình được lưu trực tiếp trên thiết bị của bạn và không gửi bất kỳ dữ liệu
              cá nhân nào lên máy chủ.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
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
