import React from 'react';
import { Printer, History } from 'lucide-react';

interface HeaderProps {
  onPrint: () => void;
  kanjiCount: number;
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onPrint,
  kanjiCount,
  historyCount,
  onOpenHistory,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/15 transform hover:scale-105 transition-transform ring-1 ring-emerald-400/30">
            <span className="font-kanji font-black text-xl sm:text-2xl leading-none drop-shadow-xs">漢</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg md:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                Kanji Stroke Order
              </h1>
              {kanjiCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] sm:text-xs font-bold bg-teal-50 text-teal-800 rounded-full border border-teal-200 shadow-2xs shrink-0">
                  {kanjiCount} <span className="hidden xs:inline">Kanji</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden md:block truncate">
              Tra cứu nét viết, hoạt ảnh nét vẽ động, âm Hán-Việt & nghĩa tiếng Việt cho Anki, Word & Obsidian
            </p>
          </div>
        </div>

        {/* Right utility actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* History button */}
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-transparent rounded-xl transition-all cursor-pointer shadow-2xs min-h-[38px]"
            title="Xem danh sách chữ Kanji đã tra cứu gần đây"
          >
            <History className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Lịch sử</span>
            <span
              className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full transition-colors ${
                historyCount > 0
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {historyCount}
            </span>
          </button>

          {/* Print button */}
          <button
            onClick={onPrint}
            disabled={kanjiCount === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[38px]"
            title="In trang luyện viết ra giấy hoặc PDF"
          >
            <Printer className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">In bảng nét</span>
          </button>
        </div>
      </div>
    </header>
  );
};
