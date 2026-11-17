import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Search,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDecks } from '../context/DeckContext';
import { SharedDecksManager } from '../components/SharedDecksManager';
import {
  apiGetMyFollows,
  apiSearchUsers,
  apiToggleFollowUser,
  FollowUserItem,
  SearchUserResult,
} from '../services/communityService';

function getInitials(name: string): string {
  const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

type FollowTab = 'followers' | 'following' | 'find';

export const ProfilePage: React.FC = () => {
  const {
    user,
    profile,
    isAuthLoading,
    displayName,
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
  const [savingName, setSavingName] = useState(false);
  const [nameSavedMsg, setNameSavedMsg] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);

  // Follow & Community state
  const [followTab, setFollowTab] = useState<FollowTab>('followers');
  const [followers, setFollowers] = useState<FollowUserItem[]>([]);
  const [following, setFollowing] = useState<FollowUserItem[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [followActionUserId, setFollowActionUserId] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(displayName);
  }, [displayName]);

  const loadMyFollows = useCallback(async () => {
    if (!user || !supabaseEnabled) return;
    setLoadingFollows(true);
    try {
      const res = await apiGetMyFollows();
      setFollowers(res.followers || []);
      setFollowing(res.following || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingFollows(false);
    }
  }, [user, supabaseEnabled]);

  useEffect(() => {
    void loadMyFollows();
  }, [loadMyFollows]);

  const runUserSearch = useCallback(
    async (q: string) => {
      if (!user || !supabaseEnabled) return;
      setSearchingUsers(true);
      try {
        const res = await apiSearchUsers(q);
        setSearchResults(res.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    },
    [user, supabaseEnabled]
  );

  useEffect(() => {
    if (followTab !== 'find' || !user) return;
    const timer = window.setTimeout(() => {
      void runUserSearch(searchQuery);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [followTab, searchQuery, user, runUserSearch]);

  const handleToggleFollowPerson = async (targetUserId: string) => {
    if (followActionUserId) return;
    setFollowActionUserId(targetUserId);
    try {
      const res = await apiToggleFollowUser(targetUserId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, isFollowing: res.isFollowing } : u
        )
      );
      await loadMyFollows();
    } catch {
      // Ignore transient error
    } finally {
      setFollowActionUserId(null);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
        <span>Đang tải thông tin tài khoản...</span>
      </div>
    );
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
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
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

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSavedMsg(null);
    if (!nameInput.trim()) {
      setNameError('Tên hiển thị không được để trống.');
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(nameInput.trim());
      setNameSavedMsg('Đã cập nhật tên hiển thị thành công.');
    } catch (err: any) {
      setNameError(err?.message || 'Không thể cập nhật tên hiển thị.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Account Profile Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-700 text-white font-bold text-xl flex items-center justify-center shrink-0 ring-4 ring-teal-50">
              {avatarInitials}
            </div>
            <div className="space-y-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tham gia {joinedDate}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs tabular-nums">
                <span className="text-slate-600">
                  <strong className="text-slate-900">{followers.length}</strong> người theo dõi
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-600">
                  Đang theo dõi <strong className="text-slate-900">{following.length}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0 self-start sm:self-center">
            <Link
              to={publicProfilePath}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Hồ sơ công khai</span>
            </Link>

            <button
              type="button"
              onClick={() => void handleCopyPublicProfileUrl()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
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

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveName} className="space-y-3 max-w-md">
          <label className="block space-y-1.5 text-xs">
            <span className="font-semibold text-slate-700 block">
              Tên hiển thị (Display Name)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setNameSavedMsg(null);
                  setNameError(null);
                }}
                maxLength={60}
                placeholder="Nhập tên hiển thị..."
                className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
              />
              <button
                type="submit"
                disabled={savingName || nameInput.trim() === displayName}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                {savingName ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </label>

          {nameError && (
            <p className="text-xs text-rose-600 font-medium">{nameError}</p>
          )}
          {nameSavedMsg && (
            <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{nameSavedMsg}</span>
            </p>
          )}
        </form>
      </section>

      {/* Shared Decks Manager */}
      <SharedDecksManager />

      {/* Follow & Community Section */}
      {supabaseEnabled && (
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <span>Theo dõi &amp; Cộng đồng</span>
              </h2>
              <p className="text-xs text-slate-500">
                Xem những người đang theo dõi bạn, danh sách bạn đang theo dõi và tìm bạn học mới.
              </p>
            </div>

            <button
              type="button"
              disabled={loadingFollows}
              onClick={() => void loadMyFollows()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-teal-700 ${loadingFollows ? 'animate-spin' : ''}`}
              />
              <span>Làm mới</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setFollowTab('followers')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap ${
                followTab === 'followers'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-700" />
              <span>Người theo dõi ({followers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFollowTab('following')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap ${
                followTab === 'following'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Đang theo dõi ({following.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFollowTab('find')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                followTab === 'find'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-teal-700" />
              <span>Tìm bạn học</span>
            </button>
          </div>

          {/* Tab Panel: Followers */}
          {followTab === 'followers' && (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {followers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Chưa có ai theo dõi bạn. Chia sẻ bộ thẻ hay để kết nối thêm nhiều bạn học nhé!
                </div>
              ) : (
                followers.map((person) => (
                  <div
                    key={person.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60"
                  >
                    <Link to={`/u/${person.id}`} className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(person.displayName)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 hover:text-teal-800 truncate">
                          {person.displayName}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          Theo dõi từ{' '}
                          {new Date(person.followedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={followActionUserId === person.id}
                        onClick={() => void handleToggleFollowPerson(person.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                          person.isFollowingBack
                            ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                            : 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800'
                        }`}
                      >
                        {person.isFollowingBack ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Đang theo dõi</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Theo dõi lại</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Panel: Following */}
          {followTab === 'following' && (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {following.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Bạn chưa theo dõi thành viên nào. Chuyển sang tab <strong>Tìm bạn học</strong> để khám phá!
                </div>
              ) : (
                following.map((person) => (
                  <div
                    key={person.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60"
                  >
                    <Link to={`/u/${person.id}`} className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(person.displayName)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 hover:text-teal-800 truncate">
                          {person.displayName}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          Đang theo dõi từ{' '}
                          {new Date(person.followedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/u/${person.id}`}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap"
                      >
                        Xem hồ sơ
                      </Link>
                      <button
                        type="button"
                        disabled={followActionUserId === person.id}
                        onClick={() => void handleToggleFollowPerson(person.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Bỏ theo dõi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Panel: Find Users */}
          {followTab === 'find' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bạn học theo tên hiển thị..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                />
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {searchingUsers ? (
                  <div className="p-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                    <span>Đang tìm kiếm thành viên...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Không tìm thấy thành viên nào phù hợp.
                  </div>
                ) : (
                  searchResults.map((person) => (
                    <div
                      key={person.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60"
                    >
                      <Link to={`/u/${person.id}`} className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(person.displayName)}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 hover:text-teal-800 truncate">
                            {person.displayName}
                          </div>
                          {person.createdAt && (
                            <div className="text-[11px] text-slate-400 tabular-nums">
                              Tham gia{' '}
                              {new Date(person.createdAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </div>
                          )}
                        </div>
                      </Link>

                      <button
                        type="button"
                        disabled={followActionUserId === person.id}
                        onClick={() => void handleToggleFollowPerson(person.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                          person.isFollowing
                            ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                            : 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800'
                        }`}
                      >
                        {person.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Đang theo dõi</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Theo dõi</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Cloud Sync Summary Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-teal-700" />
              <span>Đồng bộ Flashcard SRS</span>
            </h2>
            <p className="text-xs text-slate-500">
              Kiểm tra phiên bản và đồng bộ 2 chiều chuẩn AnkiDroid
            </p>
          </div>

          {supabaseEnabled && (
            <div className="flex items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => openCloudInspector()}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 text-teal-700" />
                <span>Xem Cloud</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={() => triggerAnkiSync()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>
                  {isSyncing ? 'Đang kiểm tra...' : 'Kiểm tra & Đồng bộ ngay'}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-xs tabular-nums">
          <div>
            <div className="text-slate-500">Thư mục trên máy</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {folders.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Chữ Kanji trên máy</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {items.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Phiên bản Sync</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              v{profile?.syncVersion ?? lastSyncedVersion}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Đồng bộ gần nhất</div>
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
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {syncMessage}
          </div>
        )}

        {syncError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {syncError}
          </div>
        )}
      </section>
    </div>
  );
};
