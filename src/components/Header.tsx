import React, { useEffect, useRef, useState } from 'react';
import {
  Printer,
  Settings,
  Menu,
  LogIn,
  User,
  Globe,
  RefreshCw,
  Eye,
  LogOut,
  Users,
  ExternalLink,
} from 'lucide-react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useKanji } from '../context/KanjiContext';
import { useAuth } from '../context/AuthContext';
import { useDecks } from '../context/DeckContext';
import { FollowListModal } from './auth/FollowListModal';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsSettingsOpen } = useKanji();
  const {
    user,
    displayName,
    avatarInitials,
    openAuthModal,
    logout,
    supabaseEnabled,
  } = useAuth();
  const {
    isSyncing,
    hasUnsyncedChanges,
    triggerAnkiSync,
    openCloudInspector,
  } = useDecks();

  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isFindBuddiesOpen, setIsFindBuddiesOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on route change
  useEffect(() => {
    setIsAvatarMenuOpen(false);
  }, [location.pathname]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isAvatarMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setIsAvatarMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAvatarMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs print:hidden">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Mobile Menu Toggle & Brand Logo (min-w-0 so it never collides with Login/Avatar on small phones) */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="md:hidden p-2 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0 active:scale-95"
                title="Mở menu tính năng"
                aria-label="Mở menu tính năng"
              >
                <Menu className="w-5 h-5 text-teal-700" />
              </button>
            )}

            {/* Brand Logo & Web Name */}
            <NavLink
              to="/input"
              className="flex items-center gap-2 sm:gap-2.5 min-w-0 group"
              title="Trang chủ / Nhập văn bản"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/15 ring-1 ring-emerald-400/30 group-hover:scale-105 transition-transform">
                <span className="font-kanji font-black text-lg sm:text-xl leading-none">
                  漢
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black text-slate-900 text-sm sm:text-lg tracking-tight truncate">
                    Luyện Kanji
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                    Pro
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] text-slate-500 -mt-0.5 truncate">
                  Học &amp; Tra cứu chữ Hán
                </p>
              </div>
            </NavLink>
          </div>

          {/* Right: Auth / Print / Avatar Dropdown / Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/90 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 whitespace-nowrap"
                title="Đăng nhập hoặc đăng ký tài khoản để đồng bộ Flashcard"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Đăng nhập</span>
              </button>
            )}

            <NavLink
              to="/print"
              className={({ isActive }) =>
                `hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 border whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-700 text-white border-teal-800'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border-slate-200/90'
                }`
              }
              title="In bảng tập viết ra giấy hoặc PDF"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>In tập viết</span>
            </NavLink>

            {user && (
              <div className="relative" ref={menuContainerRef}>
                <button
                  type="button"
                  onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                  className={`relative w-9 h-9 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer shrink-0 select-none ${
                    isAvatarMenuOpen
                      ? 'ring-2 ring-offset-2 ring-teal-700'
                      : 'ring-1 ring-teal-800/20'
                  }`}
                  title={`${displayName} · Menu tài khoản`}
                  aria-label="Menu tài khoản"
                  aria-expanded={isAvatarMenuOpen}
                  aria-haspopup="menu"
                >
                  <span>{avatarInitials}</span>
                  {hasUnsyncedChanges && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white"
                      title="Có thay đổi chưa đồng bộ lên Cloud"
                    />
                  )}
                </button>

                {isAvatarMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    {/* User Identity Header */}
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {displayName}
                        </span>
                        <NavLink
                          to={`/u/${user.id}`}
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-0.5 shrink-0"
                        >
                          <span>Công khai</span>
                          <ExternalLink className="w-3 h-3" />
                        </NavLink>
                      </div>
                      {user.email && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {user.email}
                        </div>
                      )}
                    </div>

                    {/* Profile & Community Navigation */}
                    <div className="py-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full px-4 py-2 min-h-[40px] text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                      >
                        <User className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Trang cá nhân</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          navigate('/shares');
                        }}
                        className="w-full px-4 py-2 min-h-[40px] text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Bộ thẻ đã chia sẻ</span>
                      </button>

                      {supabaseEnabled && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            setIsFindBuddiesOpen(true);
                          }}
                          className="w-full px-4 py-2 min-h-[40px] text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Tìm bạn học &amp; Follow</span>
                        </button>
                      )}
                    </div>

                    {/* Cloud Sync Controls */}
                    {supabaseEnabled && (
                      <div className="py-1 border-t border-slate-100">
                        <button
                          type="button"
                          role="menuitem"
                          disabled={isSyncing}
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            triggerAnkiSync();
                          }}
                          className="w-full px-4 py-2 min-h-[40px] text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800 disabled:opacity-50 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <RefreshCw
                              className={`w-4 h-4 text-teal-700 shrink-0 ${
                                isSyncing ? 'animate-spin' : ''
                              }`}
                            />
                            <span>
                              {isSyncing ? 'Đang đồng bộ Cloud...' : 'Đồng bộ Cloud'}
                            </span>
                          </span>
                          {hasUnsyncedChanges && !isSyncing && (
                            <span className="text-[10px] font-semibold text-amber-700">
                              Chờ lưu
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            openCloudInspector();
                          }}
                          className="w-full px-4 py-2 min-h-[40px] text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Xem dữ liệu Cloud</span>
                        </button>
                      </div>
                    )}

                    {/* Settings & Sign out */}
                    <div className="py-1 border-t border-slate-100">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className="w-full px-4 py-2 min-h-[40px] text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Cài đặt ứng dụng</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          void logout();
                        }}
                        className="w-full px-4 py-2 min-h-[40px] text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!user && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex p-2 min-h-[36px] min-w-[36px] items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Cài đặt ứng dụng"
                aria-label="Cài đặt ứng dụng"
              >
                <Settings className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Quick Find Buddies / Follow Modal reachable directly from Avatar dropdown */}
      {user && (
        <FollowListModal
          isOpen={isFindBuddiesOpen}
          onClose={() => setIsFindBuddiesOpen(false)}
          targetUserId={user.id}
          targetDisplayName={displayName}
          isOwnProfile={true}
          initialTab="find"
        />
      )}
    </>
  );
};
