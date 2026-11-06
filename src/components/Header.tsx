import React, { useState } from 'react';
import { Printer, History, HelpCircle, Layers3, Settings, Menu, X } from 'lucide-react';

interface HeaderProps {
  onPrint: () => void;
  kanjiCount: number;
  historyCount: number;
  onOpenHistory: () => void;
  onOpenGuide: () => void;
  onOpenRadicals: () => void;
  onOpenSettings: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onPrint,
  kanjiCount,
  historyCount,
  onOpenHistory,
  onOpenGuide,
  onOpenRadicals,
  onOpenSettings,
  onOpenMobileMenu,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu Toggle & Brand Wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0 active:scale-95"
              title="Mở menu tính năng"
            >
              <Menu className="w-5 h-5 text-teal-700" />
            </button>
          )}

          {/* Brand Wordmark */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/15 md:hidden">
              <span className="font-kanji font-black text-lg leading-none">漢</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] sm:text-lg font-black text-slate-900 tracking-tight truncate">
                  Luyện Kanji
                </h1>
                {kanjiCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-teal-50 text-teal-800 rounded-full border border-teal-200 shadow-2xs shrink-0">
                    {kanjiCount} Kanji
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden lg:block truncate">
                Học & Tra cứu chữ Hán toàn diện · Tra nét vẽ SVG, Romaji & dịch song ngữ
              </p>
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Utility Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Print button */}
          <button
            type="button"
            onClick={onPrint}
            disabled={kanjiCount === 0}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/90 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:scale-95 shrink-0"
            title="In trang luyện viết ra giấy hoặc PDF"
          >
            <Printer className="w-4 h-4 text-slate-600 shrink-0" />
            <span>In tập viết</span>
          </button>

          {/* Quick Guide */}
          <button
            type="button"
            onClick={onOpenGuide}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/90 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            title="Xem hướng dẫn sử dụng"
          >
            <HelpCircle className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Hướng dẫn</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            title="Cài đặt chung ứng dụng"
          >
            <Settings className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
};


