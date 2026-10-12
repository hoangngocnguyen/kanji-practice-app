import React from 'react';
import { Printer, Sparkles, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onPrint: () => void;
  kanjiCount: number;
  onOpenLicense: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onPrint, kanjiCount, onOpenLicense }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 transform hover:scale-105 transition-transform">
            <span className="font-kanji font-black text-2xl leading-none">漢</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 bg-clip-text text-transparent">
                Kanji Stroke Order Tool
              </h1>
              {kanjiCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  {kanjiCount} Kanji
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Tra cứu nét viết chữ Hán, chép ảnh nền trắng vào Clipboard cho Anki, Word & Obsidian
            </p>
          </div>
        </div>

        {/* Right utility actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLicense}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
            title="Xem chi tiết tuân thủ bản quyền KanjiVG & Creative Commons"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>CC BY-SA 3.0</span>
          </button>

          <button
            onClick={onPrint}
            disabled={kanjiCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="In trang luyện viết ra giấy hoặc PDF"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">In bảng</span>
          </button>
        </div>
      </div>
    </header>
  );
};
