import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  PenTool,
  BookOpen,
  Languages,
  FileText,
  Layers3,
  History,
  Settings,
  HelpCircle,
  X,
  ArrowLeftRight,
  Chrome,
  PanelLeftClose,
  PanelLeftOpen,
  Columns3,
  FolderKanban,
  GraduationCap,
  Search,
  ChevronDown,
  Trophy,
  LucideIcon,
} from 'lucide-react';
import { useKanji } from '../context/KanjiContext';
import { useDecks } from '../context/DeckContext';
import { PWAInstallButton } from './PWAInstallButton';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

type NavGroupId = 'study' | 'review' | 'tools';

interface SidebarNavItem {
  to: string;
  matchExact?: string[];
  matchPrefix?: string[];
  label: string;
  icon: LucideIcon;
  badge: string | number | null;
  desc: string;
}

interface SidebarNavGroup {
  id: NavGroupId;
  label: string;
  summaryCount?: number | null;
  summaryTitle?: string;
  items: SidebarNavItem[];
}

const SIDEBAR_GROUPS_STORAGE_KEY = 'kanji_sidebar_groups_v1';

const DEFAULT_OPEN_GROUPS: Record<NavGroupId, boolean> = {
  study: true,
  review: true,
  tools: false,
};

function loadSavedOpenGroups(): Record<NavGroupId, boolean> {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
    if (!raw) return DEFAULT_OPEN_GROUPS;
    const parsed = JSON.parse(raw) as Partial<Record<NavGroupId, unknown>>;
    return {
      study: typeof parsed.study === 'boolean' ? parsed.study : DEFAULT_OPEN_GROUPS.study,
      review: typeof parsed.review === 'boolean' ? parsed.review : DEFAULT_OPEN_GROUPS.review,
      tools: typeof parsed.tools === 'boolean' ? parsed.tools : DEFAULT_OPEN_GROUPS.tools,
    };
  } catch {
    return DEFAULT_OPEN_GROUPS;
  }
}

function saveOpenGroups(groups: Record<NavGroupId, boolean>): void {
  try {
    localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

function doesItemMatchPath(item: SidebarNavItem, pathname: string): boolean {
  if (pathname === item.to) return true;
  if (item.matchExact?.includes(pathname)) return true;
  if (item.matchPrefix?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  return false;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const {
    extractedKanjiList,
    recentlyViewed,
    setIsSettingsOpen,
  } = useKanji();
  const { folders, getDueCountForFolderRecursive } = useDecks();

  const totalDueCount = folders
    .filter((f) => f.parentId === null)
    .reduce((sum, f) => sum + getDueCountForFolderRecursive(f.id), 0);

  const effectiveCollapsed = isMobileOpen ? false : isCollapsed;

  const [collapsedTooltip, setCollapsedTooltip] = useState<{
    label: string;
    badge: string | number | null;
    top: number;
    left: number;
  } | null>(null);

  const showCollapsedTooltip = useCallback(
    (e: React.MouseEvent<HTMLElement>, label: string, badge: string | number | null = null) => {
      if (!effectiveCollapsed) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setCollapsedTooltip({
        label,
        badge,
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      });
    },
    [effectiveCollapsed]
  );

  const hideCollapsedTooltip = useCallback(() => {
    setCollapsedTooltip(null);
  }, []);

  useEffect(() => {
    setCollapsedTooltip(null);
  }, [effectiveCollapsed, location.pathname]);

  const navGroups: SidebarNavGroup[] = [
    {
      id: 'study',
      label: 'Học & Tra cứu',
      summaryCount: extractedKanjiList.length > 0 ? extractedKanjiList.length : null,
      summaryTitle: 'Số chữ Kanji đang chọn',
      items: [
        {
          to: '/input',
          matchExact: ['/'],
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
          to: '/search',
          label: 'Tra cứu theo nghĩa',
          icon: Search,
          badge: null,
          desc: 'Tìm ngược theo nghĩa Việt & Hán-Việt',
        },
        {
          to: '/radicals',
          label: '214 Bộ thủ Khang Hy',
          icon: Layers3,
          badge: 214,
          desc: 'Phân tích cấu trúc chữ Hán',
        },
        {
          to: '/compare',
          label: 'So sánh Kanji',
          icon: Columns3,
          badge: null,
          desc: 'Đối chiếu các chữ dễ nhầm lẫn',
        },
      ],
    },
    {
      id: 'review',
      label: 'Ôn tập',
      summaryCount: totalDueCount > 0 ? totalDueCount : null,
      summaryTitle: 'Số thẻ đến hạn ôn',
      items: [
        {
          to: '/decks',
          matchPrefix: ['/decks'],
          label: 'Ôn tập theo bài',
          icon: FolderKanban,
          badge: totalDueCount > 0 ? totalDueCount : null,
          desc: 'Thư mục bài học, từ ghép & Flashcard SRS',
        },
        {
          to: '/levels',
          label: 'Kanji theo cấp độ',
          icon: GraduationCap,
          badge: '2.136',
          desc: 'JLPT N5–N1, 2.136 Jōyō, Quiz & Ví dụ',
        },
        {
          to: '/leaderboard',
          label: 'Bảng xếp hạng',
          icon: Trophy,
          badge: null,
          desc: 'Chuỗi Streak & thi đua cộng đồng',
        },
        {
          to: '/history',
          label: 'Lịch sử tra cứu',
          icon: History,
          badge: recentlyViewed.length > 0 ? recentlyViewed.length : null,
          desc: 'Các từ Kanji đã xem gần đây',
        },
      ],
    },
    {
      id: 'tools',
      label: 'Công cụ bổ trợ',
      summaryCount: null,
      items: [
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
          to: '/extension',
          label: 'Chrome Extension',
          icon: Chrome,
          badge: 'v3.0',
          desc: 'Tải tiện ích tra cứu Kanji & Snipping OCR',
        },
      ],
    },
  ];

  const [openGroups, setOpenGroups] = useState<Record<NavGroupId, boolean>>(() => {
    const saved = loadSavedOpenGroups();
    const matchedGroup = navGroups.find((g) =>
      g.items.some((it) => doesItemMatchPath(it, location.pathname))
    );
    if (matchedGroup && !saved[matchedGroup.id]) {
      const next = { ...saved, [matchedGroup.id]: true };
      saveOpenGroups(next);
      return next;
    }
    return saved;
  });

  // Auto-expand the group containing the currently active route
  useEffect(() => {
    const matchedGroup = navGroups.find((g) =>
      g.items.some((it) => doesItemMatchPath(it, location.pathname))
    );
    if (!matchedGroup) return;
    setOpenGroups((prev) => {
      if (prev[matchedGroup.id]) return prev;
      const next = { ...prev, [matchedGroup.id]: true };
      saveOpenGroups(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = useCallback((groupId: NavGroupId) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      saveOpenGroups(next);
      return next;
    });
  }, []);

  const sidebarContent = (
    <div className="h-full flex flex-col overflow-hidden select-none">
      {/* Top Header + Grouped Scrollable Navigation */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="h-16 shrink-0 flex items-center justify-between px-3 border-b border-slate-200/90 bg-white">
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

        {/* Grouped Navigation List */}
        <nav
          aria-label="Danh mục chính"
          onScroll={hideCollapsedTooltip}
          className={`flex-1 min-h-0 p-2 overflow-y-auto overflow-x-hidden ${
            effectiveCollapsed ? 'space-y-1' : 'space-y-2'
          }`}
        >
          {navGroups.map((group, groupIdx) => {
            const isOpen = openGroups[group.id];
            const hasActiveItem = group.items.some((item) =>
              doesItemMatchPath(item, location.pathname)
            );
            const showItems = effectiveCollapsed || isOpen;

            return (
              <div
                key={group.id}
                className={
                  groupIdx > 0
                    ? effectiveCollapsed
                      ? 'pt-1 border-t border-slate-200/80'
                      : 'pt-1.5 border-t border-slate-100'
                    : ''
                }
              >
                {!effectiveCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 min-h-[36px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      !isOpen && hasActiveItem
                        ? 'text-teal-800 bg-teal-50/70'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <span className="truncate">{group.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {!isOpen && group.summaryCount != null && (
                        <span
                          title={group.summaryTitle}
                          className="text-[11px] font-bold text-teal-700 tabular-nums"
                        >
                          {group.summaryCount}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                          isOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </span>
                  </button>
                )}

                {showItems && (
                  <div className={`space-y-1 ${!effectiveCollapsed ? 'mt-1' : ''}`}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isHomeInputMatch =
                        item.to === '/input' && location.pathname === '/';

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => {
                            hideCollapsedTooltip();
                            if (isMobileOpen) onCloseMobile();
                          }}
                          onMouseEnter={(e) => showCollapsedTooltip(e, item.label, item.badge)}
                          onMouseLeave={hideCollapsedTooltip}
                          className={({ isActive }) => {
                            const active = isActive || isHomeInputMatch;
                            return `w-full group relative flex items-center ${
                              effectiveCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5'
                            } rounded-xl text-xs sm:text-[13px] transition-all cursor-pointer ${
                              active
                                ? 'bg-teal-700 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                            }`;
                          }}
                          aria-label={item.label}
                        >
                          {({ isActive }) => {
                            const active = isActive || isHomeInputMatch;
                            return (
                              <>
                                <Icon
                                  className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:scale-110 ${
                                    active
                                      ? 'text-white'
                                      : 'text-slate-500 group-hover:text-teal-700'
                                  }`}
                                />

                                {!effectiveCollapsed && (
                                  <div className="flex-1 text-left min-w-0 flex items-center justify-between">
                                    <span className="truncate">{item.label}</span>
                                    {item.badge !== null && (
                                      <span
                                        className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 tabular-nums ${
                                          active
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800'
                                        }`}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          }}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility Actions */}
      <div className="shrink-0 p-2 border-t border-slate-200/90 bg-slate-50/60 space-y-1">
        <PWAInstallButton
          collapsed={effectiveCollapsed}
          onMouseEnter={showCollapsedTooltip}
          onMouseLeave={hideCollapsedTooltip}
          onActionComplete={() => {
            if (isMobileOpen) onCloseMobile();
          }}
        />

        {/* User Guide Page Link */}
        <NavLink
          to="/guide"
          onClick={() => {
            hideCollapsedTooltip();
            if (isMobileOpen) onCloseMobile();
          }}
          onMouseEnter={(e) => showCollapsedTooltip(e, 'Hướng dẫn sử dụng')}
          onMouseLeave={hideCollapsedTooltip}
          className={({ isActive }) =>
            `w-full group relative flex items-center ${
              effectiveCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
            } py-2 rounded-xl text-xs transition-all cursor-pointer ${
              isActive
                ? 'bg-teal-700 text-white font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`
          }
          aria-label="Hướng dẫn sử dụng"
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
            hideCollapsedTooltip();
            setIsSettingsOpen(true);
            if (isMobileOpen) onCloseMobile();
          }}
          onMouseEnter={(e) => showCollapsedTooltip(e, 'Cài đặt ứng dụng')}
          onMouseLeave={hideCollapsedTooltip}
          className={`w-full group relative flex items-center ${
            effectiveCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
          } py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer`}
          aria-label="Cài đặt ứng dụng"
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
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen border-r border-slate-200/90 bg-white transition-all duration-300 z-20 ${
          effectiveCollapsed ? 'w-[68px]' : 'w-[250px] lg:w-[260px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Fixed Floating Tooltip for Collapsed Desktop Sidebar */}
      {effectiveCollapsed && collapsedTooltip && (
        <div
          style={{ top: collapsedTooltip.top, left: collapsedTooltip.left }}
          className="hidden md:flex fixed -translate-y-1/2 z-50 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap items-center gap-1.5 pointer-events-none"
        >
          <span>{collapsedTooltip.label}</span>
          {collapsedTooltip.badge !== null && (
            <span className="px-1.5 py-0.5 bg-teal-500 text-white text-[10px] rounded-full font-bold tabular-nums">
              {collapsedTooltip.badge}
            </span>
          )}
        </div>
      )}

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
