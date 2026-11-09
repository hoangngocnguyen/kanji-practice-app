import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  PenTool,
  BookOpen,
  Languages,
  FileText,
  Layers3,
  History,
  Settings,
  Printer,
  HelpCircle,
  X,
  ArrowLeftRight,
  Chrome,
  PanelLeftClose,
  PanelLeftOpen,
  Menu
} from 'lucide-react';
import { useKanji } from '../context/KanjiContext';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const {
    extractedKanjiList,
    recentlyViewed,
    setIsPrintModalOpen,
    setIsSettingsOpen
  } = useKanji();

  const effectiveCollapsed = isMobileOpen ? false : isCollapsed;

  const navItems = [
    {
      to: '/input',
      label: 'Nhập văn bản',
      icon: FileText,
      badge: null,
      desc: 'Nhập từ vựng & dán ảnh OCR',
    },
    {
      to: '/kanji',
      label: 'Nét viết Kanji',
      icon: PenTool,
      badge: extractedKanjiList.length > 0 ? extractedKanjiList.length : null,
      desc: 'Bảng nét & hoạt ảnh SVG động',
    },
    {
      to: '/romaji',
      label: 'Phiên âm Romaji',
      icon: BookOpen,
      badge: null,
      desc: 'Đọc câu xen dòng chuẩn Hepburn',
    },
    {
      to: '/translate',
      label: 'Dịch câu song ngữ',
      icon: Languages,
      badge: null,
      desc: 'Google & Gemini AI Dịch',
    },
    {
      to: '/converter',
      label: 'Chuyển đổi Romaji',
      icon: ArrowLeftRight,
      badge: null,
      desc: 'Đổi Romaji sang Kana có Hoàn tác',
    },
    {
      to: '/radicals',
      label: '214 Bộ thủ Khang Hy',
      icon: Layers3,
      badge: 214,
      desc: 'Phân tích cấu trúc chữ Hán',
    },
    {
      to: '/extension',
      label: 'Chrome Extension',
      icon: Chrome,
      badge: 'v3.0',
      desc: 'Tải tiện ích tra cứu Kanji & Snipping OCR',
    },
    {
      to: '/history',
      label: 'Lịch sử tra cứu',
      icon: History,
      badge: recentlyViewed.length > 0 ? recentlyViewed.length : null,
      desc: 'Các từ Kanji đã xem gần đây',
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between select-none">
      {/* Top Header: Menu Toggle Button (desktop) or Brand Logo + Close (mobile) */}
      <div>
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-200/90 bg-white">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden md:flex items-center gap-2 rounded-xl text-slate-700 hover:text-teal-800 hover:bg-teal-50/80 transition-all cursor-pointer group ${
              isCollapsed ? 'justify-center p-2.5 w-full' : 'justify-between w-full px-3 py-2'
            }`}
            title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-teal-700 group-hover:scale-110 transition-transform mx-auto" />
            ) : (
              <div className="flex items-center gap-2.5">
                <PanelLeftClose className="w-5 h-5 text-teal-700 group-hover:scale-105 transition-transform" />
                <span className="font-bold text-xs text-slate-800">Thu gọn danh mục</span>
              </div>
            )}
          </button>

          {/* Mobile Drawer Brand Header */}
          <div className="md:hidden flex items-center justify-between w-full">
            <NavLink to="/input" onClick={onCloseMobile} className="flex items-center gap-2 shrink-0 group">
              <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/15">
                <span className="font-kanji font-black text-lg leading-none">漢</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-black text-slate-900 text-sm tracking-tight">Luyện Kanji</span>
                  <span className="text-[9px] font-bold px-1 rounded bg-teal-50 text-teal-700 border border-teal-200">Pro</span>
                </div>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (isMobileOpen) onCloseMobile();
                }}
                className={({ isActive }) =>
                  `w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-700 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                  }`
                }
                title={effectiveCollapsed ? `${item.label} (${item.desc})` : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'
                      }`}
                    />

                    {!effectiveCollapsed && (
                      <div className="flex-1 text-left min-w-0 flex items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        {item.badge !== null && (
                          <span
                            className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {effectiveCollapsed && (
                      <div className="hidden md:group-hover:flex absolute left-full ml-2 z-50 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap items-center gap-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                        <span>{item.label}</span>
                        {item.badge !== null && (
                          <span className="px-1.5 py-0.2 bg-teal-500 text-white text-[10px] rounded-full font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility Actions */}
      <div className="p-2 border-t border-slate-200/90 bg-slate-50/60 space-y-1">
        {/* Print Page NavLink */}
        <NavLink
          to="/print"
          onClick={() => {
            if (isMobileOpen) onCloseMobile();
          }}
          className={({ isActive }) =>
            `w-full group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              isActive
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`
          }
          title={effectiveCollapsed ? 'In trang tập viết A4' : undefined}
        >
          {({ isActive }) => (
            <>
              <Printer
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'
                }`}
              />
              {!effectiveCollapsed && <span className="truncate">In trang tập viết</span>}
            </>
          )}
        </NavLink>

        {/* User Guide Page Link */}
        <NavLink
          to="/guide"
          onClick={() => {
            if (isMobileOpen) onCloseMobile();
          }}
          className={({ isActive }) =>
            `w-full group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              isActive
                ? 'bg-teal-700 text-white font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`
          }
          title={effectiveCollapsed ? 'Hướng dẫn & Mẹo học' : undefined}
        >
          {({ isActive }) => (
            <>
              <HelpCircle className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'}`} />
              {!effectiveCollapsed && <span className="truncate">Hướng dẫn sử dụng</span>}
            </>
          )}
        </NavLink>

        {/* Settings Modal Action */}
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen(true);
            if (isMobileOpen) onCloseMobile();
          }}
          className="w-full group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          title={effectiveCollapsed ? 'Cài đặt giao diện & Màu nét' : undefined}
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-teal-700" />
          {!effectiveCollapsed && <span className="truncate">Cài đặt ứng dụng</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen border-r border-slate-200/90 bg-white transition-all duration-300 z-20 overflow-y-auto ${
          isCollapsed ? 'w-[68px]' : 'w-[250px] lg:w-[260px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
