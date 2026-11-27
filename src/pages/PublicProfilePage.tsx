import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  Loader2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageLoadingIndicator } from '../context/LoadingContext';
import { PublicProfilePageSkeleton } from '../components/PageSkeletons';
import {
  apiGetPublicProfile,
  apiToggleFollowUser,
  PublicProfileData,
} from '../services/communityService';
import { apiCreateFriendStreakInvite } from '../services/friendStreakService';
import { FollowListModal, FollowModalTab } from '../components/auth/FollowListModal';
import { UserAvatar } from '../components/UserAvatar';

type PublicProfileTab = 'decks' | 'followers' | 'following';

export const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, displayName, avatarUrl, openAuthGuard } = useAuth();

  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PublicProfileTab>('decks');

  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<FollowModalTab>('followers');
  const [streakInviteBusy, setStreakInviteBusy] = useState(false);
  const [streakInviteStatus, setStreakInviteStatus] = useState<string | null>(null);

  const followSeqRef = useRef(0);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError('Không tìm thấy mã người dùng.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const res = await apiGetPublicProfile(userId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải hồ sơ thành viên.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setActiveTab('decks');
    setFollowModalOpen(false);
    void loadProfile();
  }, [loadProfile, user?.id]);

  const handleToggleFollow = () => {
    if (!userId || !data) return;
    if (!user) {
      openAuthGuard('Theo dõi thành viên');
      return;
    }
    if (data.isSelf) return;

    const prevSnapshot = data;
    const nextFollowing = !data.viewerIsFollowing;
    const nextFollowersCount = Math.max(
      0,
      data.followersCount + (nextFollowing ? 1 : -1)
    );

    const filteredFollowers = data.followers.filter((f) => f.id !== user.id);
    const nextFollowers = nextFollowing
      ? [
          {
            id: user.id,
            displayName: displayName || 'Thành viên',
            avatarUrl: avatarUrl || null,
            followedAt: new Date().toISOString(),
          },
          ...filteredFollowers,
        ]
      : filteredFollowers;

    // 1. Instant Optimistic UI (<16ms)
    setActionError(null);
    setData({
      ...data,
      viewerIsFollowing: nextFollowing,
      followersCount: nextFollowersCount,
      followers: nextFollowers,
    });

    // 2. Persist in background with latest-intent sequencing (no redundant blocking refetch)
    const reqSeq = ++followSeqRef.current;
    void apiToggleFollowUser(userId, nextFollowing)
      .then((res) => {
        if (followSeqRef.current !== reqSeq) return;
        setData((curr) =>
          curr
            ? {
                ...curr,
                viewerIsFollowing: res.isFollowing,
                followersCount: res.followersCount,
              }
            : curr
        );
      })
      .catch((err: any) => {
        if (followSeqRef.current !== reqSeq) return;
        setData(prevSnapshot);
        setActionError(err?.message || 'Không thể cập nhật theo dõi. Vui lòng thử lại.');
      });
  };

  const handleInviteFriendStreak = async () => {
    if (!userId || !data || data.isSelf) return;
    if (!user) {
      openAuthGuard('Mời nối Streak bạn bè');
      return;
    }
    setStreakInviteBusy(true);
    setActionError(null);
    try {
      const res = await apiCreateFriendStreakInvite(userId);
      setStreakInviteStatus(
        res.alreadyPending ? 'Đã gửi lời mời (đang chờ)' : 'Đã gửi lời mời nối Streak'
      );
    } catch (err: any) {
      setActionError(err?.message || 'Không thể gửi lời mời nối Streak.');
    } finally {
      setStreakInviteBusy(false);
    }
  };

  usePageLoadingIndicator('public-profile', loading);

  if (loading) {
    return <PublicProfilePageSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Không tìm thấy hồ sơ</h2>
        <p className="text-xs text-slate-600">{error}</p>
        <Link
          to="/decks"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về thư mục của tôi</span>
        </Link>
      </div>
    );
  }

  const joinedLabel = data.profile.createdAt
    ? new Date(data.profile.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header Profile Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            <UserAvatar
              name={data.profile.displayName}
              avatarUrl={data.profile.avatarUrl}
              sizeClass="w-14 h-14 sm:w-16 sm:h-16"
              textSizeClass="text-lg sm:text-xl"
              className="ring-4 ring-teal-50"
            />
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {data.profile.displayName}
              </h1>

              {/* Instagram/Facebook-style clickable followers & following counts */}
              <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-600 tabular-nums">
                <button
                  type="button"
                  onClick={() => {
                    setFollowModalTab('followers');
                    setFollowModalOpen(true);
                  }}
                  className="hover:text-teal-800 transition-colors cursor-pointer py-0.5"
                >
                  <strong className="text-slate-900">{data.followersCount}</strong> người theo dõi
                </button>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setFollowModalTab('following');
                    setFollowModalOpen(true);
                  }}
                  className="hover:text-teal-800 transition-colors cursor-pointer py-0.5"
                >
                  Đang theo dõi <strong className="text-slate-900">{data.followingCount}</strong>
                </button>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  <strong className="text-teal-700">{data.sharedDecks.length}</strong> bộ thẻ chia sẻ
                </span>
              </div>

              {joinedLabel && (
                <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tham gia {joinedLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            {data.isSelf ? (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors whitespace-nowrap min-h-[40px]"
              >
                <span>Quản lý trang cá nhân</span>
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  disabled={streakInviteBusy || Boolean(streakInviteStatus)}
                  onClick={() => void handleInviteFriendStreak()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap min-h-[40px]"
                >
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>{streakInviteStatus || 'Mời nối Streak'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer whitespace-nowrap min-h-[40px] active:scale-95 ${
                    data.viewerIsFollowing
                      ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                      : 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800'
                  }`}
                >
                  {data.viewerIsFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Đang theo dõi</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Theo dõi</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {actionError && (
          <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{actionError}</span>
            </span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('decks')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap min-h-[34px] ${
              activeTab === 'decks'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-teal-700" />
            <span>Bộ thẻ chia sẻ ({data.sharedDecks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('followers')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap min-h-[34px] ${
              activeTab === 'followers'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-700" />
            <span>Người theo dõi ({data.followersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap min-h-[34px] ${
              activeTab === 'following'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>Đang theo dõi ({data.followingCount})</span>
          </button>
        </div>
      </section>

      {/* Tab Content */}
      {activeTab === 'decks' && (
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
          {data.sharedDecks.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Thành viên này chưa chia sẻ bộ thẻ công khai nào.
            </div>
          ) : (
            data.sharedDecks.map((deck) => (
              <div
                key={deck.slug}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <Link
                    to={`/share/${deck.slug}`}
                    className="text-sm font-bold text-slate-900 hover:text-teal-800 block truncate"
                  >
                    {deck.title}
                  </Link>
                  <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
                    <span>{deck.kanjiCount} chữ Kanji</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>{deck.likesCount}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-teal-700" />
                      <span>{deck.downloadsCount}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {new Date(deck.updatedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/share/${deck.slug}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors shrink-0 self-start sm:self-center whitespace-nowrap min-h-[38px]"
                >
                  <span>Xem bộ thẻ</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))
          )}
        </section>
      )}

      {activeTab === 'followers' && (
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
          {data.followers.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Chưa có người theo dõi nào.
            </div>
          ) : (
            data.followers.map((person) => (
              <Link
                key={person.id}
                to={`/u/${person.id}`}
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors min-h-[56px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={person.displayName}
                    avatarUrl={person.avatarUrl}
                    sizeClass="w-9 h-9"
                    textSizeClass="text-xs"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
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
                </div>
                <span className="text-xs font-semibold text-teal-700 shrink-0">Xem hồ sơ</span>
              </Link>
            ))
          )}
        </section>
      )}

      {activeTab === 'following' && (
        <section className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
          {data.following.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Chưa theo dõi thành viên nào.
            </div>
          ) : (
            data.following.map((person) => (
              <Link
                key={person.id}
                to={`/u/${person.id}`}
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors min-h-[56px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={person.displayName}
                    avatarUrl={person.avatarUrl}
                    sizeClass="w-9 h-9"
                    textSizeClass="text-xs"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {person.displayName}
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      Đã theo dõi từ{' '}
                      {new Date(person.followedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-teal-700 shrink-0">Xem hồ sơ</span>
              </Link>
            ))
          )}
        </section>
      )}

      {/* Instagram/Facebook-style Follow Modal */}
      {userId && (
        <FollowListModal
          isOpen={followModalOpen}
          onClose={() => setFollowModalOpen(false)}
          targetUserId={userId}
          targetDisplayName={data.profile.displayName}
          isOwnProfile={data.isSelf}
          initialTab={followModalTab}
          initialFollowers={data.followers}
          initialFollowing={data.following}
        />
      )}
    </div>
  );
};
