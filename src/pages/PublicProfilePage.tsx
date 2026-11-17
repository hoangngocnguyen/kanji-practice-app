import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  Globe,
  Heart,
  Loader2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  apiGetPublicProfile,
  apiToggleFollowUser,
  PublicProfileData,
} from '../services/communityService';

function getInitials(name: string): string {
  const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

type PublicProfileTab = 'decks' | 'followers' | 'following';

export const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, openAuthGuard } = useAuth();

  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PublicProfileTab>('decks');
  const [followBusy, setFollowBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError('Không tìm thấy mã người dùng.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
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
    void loadProfile();
  }, [loadProfile, user?.id]);

  const handleToggleFollow = async () => {
    if (!userId || !data) return;
    if (!user) {
      openAuthGuard('Theo dõi thành viên');
      return;
    }
    if (data.isSelf || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await apiToggleFollowUser(userId);
      setData((prev) =>
        prev
          ? {
              ...prev,
              viewerIsFollowing: res.isFollowing,
              followersCount: res.followersCount,
            }
          : prev
      );
      // Reload follower list silently so viewer appears/disappears accurately
      const refreshed = await apiGetPublicProfile(userId).catch(() => null);
      if (refreshed) setData(refreshed);
    } catch {
      // Non-blocking
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
        <span>Đang tải hồ sơ cộng đồng...</span>
      </div>
    );
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
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-full bg-teal-700 text-white font-bold text-xl flex items-center justify-center shrink-0 ring-4 ring-teal-50">
              {getInitials(data.profile.displayName)}
            </div>
            <div className="space-y-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {data.profile.displayName}
              </h1>
              <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
                {joinedLabel && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tham gia {joinedLabel}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>
                  <strong className="text-slate-800">{data.followersCount}</strong> người theo dõi
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Đang theo dõi <strong className="text-slate-800">{data.followingCount}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-teal-700">{data.sharedDecks.length}</strong> bộ thẻ chia sẻ
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {data.isSelf ? (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors whitespace-nowrap"
              >
                <span>Quản lý trang cá nhân</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled={followBusy}
                onClick={() => void handleToggleFollow()}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
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
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('decks')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap ${
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
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap ${
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
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap ${
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors shrink-0 self-start sm:self-center whitespace-nowrap"
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
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {getInitials(person.displayName)}
                  </span>
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
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {getInitials(person.displayName)}
                  </span>
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
    </div>
  );
};
