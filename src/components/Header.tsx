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
}

export const Header: React.FC<HeaderProps> = ({
  onPrint,
  kanjiCount,
  historyCount,
  onOpenHistory,
  onOpenGuide,
  onOpenRadicals,
  onOpenSettings,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
              <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                Luyện Kanji
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

        {/* Desktop / Tablet Utility Actions */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Radicals Explorer Button */}
          <button
            type="button"
            onClick={onOpenRadicals}
            className="p-2 sm:p-2.5 text-cyan-800 bg-cyan-50 hover:bg-cyan-100 hover:text-cyan-950 border border-cyan-200/90 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95 shrink-0"
            title="Tra cứu 214 Bộ thủ Khang Hy & Phân tích cấu trúc Kanji"
          >
            <Layers3 className="w-4 h-4 text-cyan-600 shrink-0" />
          </button>

          {/* Guide / Tutorial button */}
          <button
            type="button"
            onClick={onOpenGuide}
            className="p-2 sm:p-2.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-950 border border-emerald-200/90 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95 shrink-0"
            title="Xem hướng dẫn sử dụng & mẹo chép thẻ Anki"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          </button>

          {/* History button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="relative p-2 sm:p-2.5 text-slate-700 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200/90 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95 shrink-0"
            title={`Xem danh sách chữ Kanji đã tra cứu gần đây (${historyCount} từ)`}
          >
            <History className="w-4 h-4 text-teal-600 shrink-0" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-teal-600 text-white ring-2 ring-white shadow-2xs">
                {historyCount}
              </span>
            )}
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={onPrint}
            disabled={kanjiCount === 0}
            className="p-2 sm:p-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/90 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95 shrink-0"
            title="In trang luyện viết ra giấy hoặc PDF"
          >
            <Printer className="w-4 h-4 text-slate-600 shrink-0" />
          </button>

          {/* Global Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 sm:p-2.5 text-teal-800 bg-teal-50 hover:bg-teal-100 hover:text-teal-950 border border-teal-200 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95 shrink-0"
            title="Cài đặt chung ứng dụng (Màu nét Mazii, Bố cục, Lịch sử)"
          >
            <Settings className="w-4 h-4 text-teal-700 shrink-0" />
          </button>
        </div>

        {/* Mobile-only action group: Keeps ONLY Print button and Menu toggle */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onPrint}
            disabled={kanjiCount === 0}
            className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95"
            title="In bảng nét vẽ Kanji"
          >
            <Printer className="w-4 h-4 text-slate-600" />
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs min-h-[38px] min-w-[38px] flex items-center justify-center active:scale-95 ${
              isMobileMenuOpen
                ? 'bg-teal-700 text-white border-teal-800'
                : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
            }`}
            title="Menu tính năng"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-slate-50/95 backdrop-blur-md px-4 py-3 space-y-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-teal-900 bg-white hover:bg-teal-50 rounded-xl border border-teal-200 shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-teal-700" />
              <span>Cài đặt</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenRadicals();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-cyan-900 bg-white hover:bg-cyan-50 rounded-xl border border-cyan-200 shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Layers3 className="w-4 h-4 text-cyan-700" />
              <span>214 Bộ thủ</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenHistory();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 bg-white hover:bg-teal-50 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-teal-600" />
              <span>Lịch sử tra cứu</span>
            </div>
            {historyCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-teal-600 text-white">
                {historyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenGuide();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>Hướng dẫn</span>
            </div>
          </button>
        </div>
      )}
    </header>
  );
};


