import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  RefreshCw,
  User as UserIcon,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDecks } from '../context/DeckContext';
import { usePageLoadingIndicator } from '../context/LoadingContext';
import { ProfilePageSkeleton } from '../components/PageSkeletons';
import {
  apiGetMyFollows,
  apiGetMyShares,
  FollowUserItem,
} from '../services/communityService';
import { FollowListModal, FollowModalTab } from '../components/auth/FollowListModal';
import {
  loadLocalStudyStats,
  LocalStudyStats,
  STUDY_STATS_UPDATED_EVENT,
  syncStudyStatsFromCloud,
} from '../services/studyStatsService';
import { StudyHeatmap365 } from '../components/StudyHeatmap365';

export const ProfilePage: React.FC = () => {
  const {
    user,
    profile,
    isAuthLoading,
    displayName,
    avatarUrl,
    avatarInitials,
    updateDisplayName,
    logout,
    openAuthModal,
    supabaseEnabled,
  } = useAuth();

  const {
    folders,
    items,
    lastSyncedAt,
    lastSyncedVersion,
    hasUnsyncedChanges,
    isSyncing,
    syncMessage,
    syncError,
    triggerAnkiSync,
    openCloudInspector,
  } = useDecks();

  const [nameInput, setNameInput] = useState(displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameSavedMsg, setNameSavedMsg] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarUrl]);

  // Follow & Share summary state
  const [followers, setFollowers] = useState<FollowUserItem[]>([]);
  const [following, setFollowing] = useState<FollowUserItem[]>([]);
  const [shareStats, setShareStats] = useState<{
    count: number;
    likes: number;
    downloads: number;
  } | null>(null);

  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<FollowModalTab>('followers');
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(() =>
    Boolean(user && supabaseEnabled)
  );
  const [studyStats, setStudyStats] = useState<LocalStudyStats>(() => loadLocalStudyStats());

  useEffect(() => {
    const syncHandler = () => setStudyStats(loadLocalStudyStats());
    window.addEventListener(STUDY_STATS_UPDATED_EVENT, syncHandler);
    return () => window.removeEventListener(STUDY_STATS_UPDATED_EVENT, syncHandler);
  }, []);

  useEffect(() => {
    setNameInput(displayName);
  }, [displayName]);

  const loadSummaryStats = useCallback(async () => {
    if (!user || !supabaseEnabled) {
      setIsLoadingStats(false);
      return;
    }
    setIsLoadingStats(true);
    try {
      const [followsRes, sharesRes, mergedStudy] = await Promise.all([
        apiGetMyFollows().catch(() => null),
        apiGetMyShares().catch(() => null),
        syncStudyStatsFromCloud().catch(() => null),
      ]);
      if (mergedStudy) setStudyStats(mergedStudy);
      if (followsRes) {
        setFollowers(followsRes.followers || []);
        setFollowing(followsRes.following || []);
      }
      if (sharesRes) {
        const list = sharesRes.shares || [];
        setShareStats({
          count: list.length,
          likes: list.reduce((sum, s) => sum + (s.likesCount || 0), 0),
          downloads: list.reduce((sum, s) => sum + (s.downloadsCount || 0), 0),
        });
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingStats(false);
    }
  }, [user, supabaseEnabled]);

  useEffect(() => {
    void loadSummaryStats();
  }, [loadSummaryStats]);

  const isPageLoading = isAuthLoading || (Boolean(user && supabaseEnabled) && isLoadingStats);
  usePageLoadingIndicator('profile', isPageLoading);

  if (isPageLoading) {
    return <ProfilePageSkeleton />;
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
          <UserIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">
            Bạn đang dùng chế độ Khách (Guest)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Đăng nhập hoặc tạo tài khoản để quản lý hồ sơ cá nhân, chia sẻ bộ thẻ,
            theo dõi bạn học và đồng bộ Flashcard SRS trên nhiều thiết bị.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer min-h-[42px]"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập / Đăng ký</span>
        </button>
      </div>
    );
  }

  const joinedDate = new Date(
    profile?.createdAt || user.created_at || Date.now()
  ).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const publicProfilePath = `/u/${user.id}`;

  const handleCopyPublicProfileUrl = async () => {
    const fullUrl = `${window.location.origin}${publicProfilePath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedProfileLink(true);
      window.setTimeout(() => setCopiedProfileLink(false), 2000);
    } catch {}
  };

  const handleStartEditName = () => {
    setNameInput(displayName);
    setNameError(null);
    setNameSavedMsg(null);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setNameInput(displayName);
    setNameError(null);
    setIsEditingName(false);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSavedMsg(null);
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Tên hiển thị không được để trống.');
      return;
    }
    if (trimmed === displayName) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      setIsEditingName(false);
      setNameSavedMsg('Đã cập nhật tên hiển thị.');
      window.setTimeout(() => setNameSavedMsg(null), 3000);
    } catch (err: any) {
      setNameError(err?.message || 'Không thể cập nhật tên hiển thị.');
    } finally {
      setSavingName(false);
    }
  };

  const openFollowModalWithTab = (tab: FollowModalTab) => {
    setFollowModalTab(tab);
    setFollowModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Focused Account Profile Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-8 space-y-5">
        {/* Top Row: Full-width Avatar + Personal Identity + Inline Edit Name */}
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-teal-700 text-white font-bold text-lg sm:text-xl flex items-center justify-center shrink-0 ring-4 ring-teal-50 overflow-hidden">
            {avatarUrl && !avatarLoadError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarLoadError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              avatarInitials
            )}
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="space-y-2 max-w-md">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      setNameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelEditName();
                      }
                    }}
                    maxLength={60}
                    placeholder="Nhập tên hiển thị..."
                    className="flex-1 min-w-[180px] px-3 py-1.5 text-sm font-semibold bg-slate-50 focus:bg-white border border-teal-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="submit"
                      disabled={savingName}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 min-h-[36px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {savingName ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Lưu</span>
                    </button>
                    <button
                      type="button"
                      disabled={savingName}
                      onClick={handleCancelEditName}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Hủy</span>
                    </button>
                  </div>
                </div>
                {nameError && (
                  <p className="text-xs text-rose-600 font-medium">{nameError}</p>
                )}
              </form>
            ) : (
              <div className="flex items-center flex-wrap gap-2 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {displayName}
                </h1>
                <button
                  type="button"
                  onClick={handleStartEditName}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-500 hover:text-teal-800 bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-200 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="Chỉnh sửa tên hiển thị"
                  aria-label="Chỉnh sửa tên hiển thị"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Sửa tên</span>
                </button>
                {nameSavedMsg && (
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{nameSavedMsg}</span>
                  </span>
                )}
              </div>
            )}

            {/* Instagram/Facebook-style Clickable Follow Stats right beneath Avatar / Name */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums">
              <button
                type="button"
                onClick={() => openFollowModalWithTab('followers')}
                className="text-slate-600 hover:text-teal-800 transition-colors cursor-pointer py-0.5 whitespace-nowrap"
              >
                <strong className="text-slate-900">{followers.length}</strong> người theo dõi
              </button>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => openFollowModalWithTab('following')}
                className="text-slate-600 hover:text-teal-800 transition-colors cursor-pointer py-0.5 whitespace-nowrap"
              >
                Đang theo dõi <strong className="text-slate-900">{following.length}</strong>
              </button>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <Link
                to="/shares"
                className="text-slate-600 hover:text-teal-800 transition-colors py-0.5 whitespace-nowrap"
              >
                <strong className="text-teal-700">
                  {shareStats !== null ? shareStats.count : '—'}
                </strong>{' '}
                bộ thẻ chia sẻ
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Tham gia {joinedDate}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Full-Width Action Bar Underneath (never squeezes left identity block) */}
        <div className="pt-4 border-t border-slate-100 flex items-center flex-wrap gap-2">
          <Link
            to={publicProfilePath}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors whitespace-nowrap min-h-[38px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Hồ sơ công khai</span>
          </Link>

          <button
            type="button"
            onClick={() => void handleCopyPublicProfileUrl()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
          >
            {copiedProfileLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã chép link</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Chép link hồ sơ</span>
              </>
            )}
          </button>

          {supabaseEnabled && (
            <button
              type="button"
              onClick={() => openFollowModalWithTab('find')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-700" />
              <span>Tìm bạn học</span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap min-h-[38px] sm:ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </section>

      {/* Two Concise Feature Cards (Separated into /shares & Cloud Inspector modal) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card A: Shared Decks Shortcut */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-700" />
                <span>Bộ thẻ đã chia sẻ</span>
              </h2>
              <p className="text-xs text-slate-500">
                Quản lý liên kết chia sẻ công khai, xem danh sách người đã thích và lượt tải về.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs tabular-nums">
              <div>
                <div className="text-slate-500">Bộ đã chia sẻ</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {shareStats ? shareStats.count : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" />
                  <span>Lượt thích</span>
                </div>
                <div className="text-base font-bold text-rose-600 mt-0.5">
                  {shareStats ? shareStats.likes : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 flex items-center gap-1">
                  <Download className="w-3 h-3 text-teal-700" />
                  <span>Lượt tải</span>
                </div>
                <div className="text-base font-bold text-teal-700 mt-0.5">
                  {shareStats ? shareStats.downloads : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Link
              to="/shares"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors whitespace-nowrap min-h-[40px]"
            >
              <span>Quản lý chia sẻ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/decks"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors whitespace-nowrap min-h-[40px]"
            >
              <span>Mở thư mục bài học</span>
            </Link>
          </div>
        </section>

        {/* Card B: Cloud Sync Summary */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-teal-700" />
                <span>Đồng bộ Flashcard SRS</span>
              </h2>
              <p className="text-xs text-slate-500">
                Kiểm tra phiên bản và đồng bộ 2 chiều chuẩn AnkiDroid trên nhiều thiết bị.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs tabular-nums">
              <div>
                <div className="text-slate-500">Thư mục</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {folders.length}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Kanji</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {items.length}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Phiên bản</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  v{profile?.syncVersion ?? lastSyncedVersion}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Gần nhất</div>
                <div className="text-xs font-semibold text-slate-900 mt-1">
                  {lastSyncedAt
                    ? new Date(lastSyncedAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : 'Chưa đồng bộ'}
                </div>
              </div>
            </div>

            {hasUnsyncedChanges && (
              <p className="text-xs text-amber-700 font-medium">
                Có thay đổi mới trên thiết bị này chưa được đẩy lên Cloud.
              </p>
            )}
            {syncMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {syncMessage}
              </div>
            )}
            {syncError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {syncError}
              </div>
            )}
          </div>

          {supabaseEnabled && (
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => openCloudInspector()}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap min-h-[40px]"
              >
                <Eye className="w-3.5 h-3.5 text-teal-700" />
                <span>Xem Cloud</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={() => triggerAnkiSync()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap min-h-[40px]"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>
                  {isSyncing ? 'Đang kiểm tra...' : 'Đồng bộ ngay'}
                </span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Annual 365-Day Study Activity Heatmap */}
      <StudyHeatmap365 stats={studyStats} />

      {/* Follow List & Find Study Buddies Modal */}
      <FollowListModal
        isOpen={followModalOpen}
        onClose={() => setFollowModalOpen(false)}
        targetUserId={user.id}
        targetDisplayName={displayName}
        isOwnProfile={true}
        initialTab={followModalTab}
        initialFollowers={followers}
        initialFollowing={following}
        onOwnFollowCountsChange={(nextFollowers, nextFollowing) => {
          setFollowers(nextFollowers);
          setFollowing(nextFollowing);
        }}
      />
    </div>
  );
};
