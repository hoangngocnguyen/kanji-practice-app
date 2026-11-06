import React from 'react';
import {
  PenTool,
  BookOpen,
  Languages,
  FileText,
  Layers3,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';

export type WorkspaceTab = 'kanji-strokes' | 'input-text' | 'romaji-reader' | 'translation' | 'radicals' | 'history';

interface AppSidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  kanjiCount: number;
  historyCount: number;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onPrint: () => void;
  // Mobile drawer support
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  kanjiCount,
  historyCount,
  onOpenSettings,
  onOpenGuide,
  onPrint,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'input-text' as WorkspaceTab,
      label: 'Nhập văn bản',
      shortLabel: 'Nhập liệu',
      icon: FileText,
      badge: null,
      desc: 'Dán đoạn văn & quét ảnh OCR',
    },
    {
      id: 'kanji-strokes' as WorkspaceTab,
      label: 'Nét viết Kanji',
      shortLabel: 'Nét Kanji',
      icon: PenTool,
      badge: kanjiCount > 0 ? kanjiCount : null,
      desc: 'Bảng nét & hoạt ảnh động',
    },
    {
      id: 'romaji-reader' as WorkspaceTab,
      label: 'Phiên âm Romaji',
      shortLabel: 'Romaji',
      icon: BookOpen,
      badge: null,
      desc: 'Đọc câu xen dòng chuẩn Hepburn',
    },
    {
      id: 'translation' as WorkspaceTab,
      label: 'Dịch câu song ngữ',
      shortLabel: 'Dịch câu',
      icon: Languages,
      badge: null,
      desc: 'Google & Gemini AI Dịch',
    },
    {
      id: 'radicals' as WorkspaceTab,
      label: '214 Bộ thủ Khang Hy',
      shortLabel: 'Bộ thủ',
      icon: Layers3,
      badge: 214,
      desc: 'Phân tích cấu trúc chữ Hán',
    },
    {
      id: 'history' as WorkspaceTab,
      label: 'Lịch sử tra cứu',
      shortLabel: 'Lịch sử',
      icon: History,
      badge: historyCount > 0 ? historyCount : null,
      desc: 'Các từ Kanji đã xem gần đây',
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between select-none">
      {/* Top Header / Brand */}
      <div>
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-200/90 bg-white">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/15 ring-1 ring-emerald-400/30">
              <span className="font-kanji font-black text-xl leading-none">漢</span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-black text-slate-900 text-base tracking-tight truncate">Luyện Kanji</h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">Pro</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">Học & Tra cứu chữ Hán</p>
              </div>
            )}
          </div>

          {/* Collapse Toggle for Desktop */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng thanh bên (Sidebar)' : 'Thu gọn thanh bên'}
            aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Close for Mobile Drawer */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (isMobileOpen) onCloseMobile();
                }}
                className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title={isCollapsed ? `${item.label} (${item.desc})` : undefined}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'
                  }`}
                />

                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0 flex items-center justify-between">
                    <span className="truncate font-semibold">{item.label}</span>
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

                {/* Floating tooltip when collapsed */}
                {isCollapsed && (
                  <div className="hidden md:group-hover:flex absolute left-full ml-2 z-50 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap items-center gap-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                    <span>{item.label}</span>
                    {item.badge !== null && (
                      <span className="px-1.5 py-0.2 bg-teal-500 text-white text-[10px] rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility Actions */}
      <div className="p-2 border-t border-slate-200/90 bg-slate-50/60 space-y-1">
        {/* Print Action */}
        <button
          type="button"
          onClick={() => {
            onPrint();
            if (isMobileOpen) onCloseMobile();
          }}
          disabled={kanjiCount === 0}
          className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
          title={isCollapsed ? 'In trang luyện viết' : undefined}
        >
          <Printer className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-teal-700" />
          {!isCollapsed && <span className="truncate">In trang tập viết</span>}
        </button>

        {/* User Guide Action */}
        <button
          type="button"
          onClick={() => {
            onOpenGuide();
            if (isMobileOpen) onCloseMobile();
          }}
          className="w-full group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          title={isCollapsed ? 'Hướng dẫn & Mẹo học' : undefined}
        >
          <HelpCircle className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-teal-700" />
          {!isCollapsed && <span className="truncate">Hướng dẫn sử dụng</span>}
        </button>

        {/* Settings Action */}
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobileOpen) onCloseMobile();
          }}
          className="w-full group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          title={isCollapsed ? 'Cài đặt giao diện & Màu nét' : undefined}
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-teal-700" />
          {!isCollapsed && <span className="truncate">Cài đặt ứng dụng</span>}
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
