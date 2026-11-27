import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiGetMyFollows,
  apiGetPublicProfile,
  apiSearchUsers,
  apiToggleFollowUser,
  FollowUserItem,
  SearchUserResult,
} from '../../services/communityService';
import { UserAvatar } from '../UserAvatar';

export type FollowModalTab = 'followers' | 'following' | 'find';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetDisplayName?: string;
  isOwnProfile?: boolean;
  initialTab?: FollowModalTab;
  initialFollowers?: FollowUserItem[];
  initialFollowing?: FollowUserItem[];
  onOwnFollowCountsChange?: (
    followers: FollowUserItem[],
    following: FollowUserItem[]
  ) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetDisplayName,
  isOwnProfile = false,
  initialTab = 'followers',
  initialFollowers,
  initialFollowing,
  onOwnFollowCountsChange,
}) => {
  const { user, displayName, openAuthGuard, supabaseEnabled } = useAuth();

  const [activeTab, setActiveTab] = useState<FollowModalTab>(initialTab);
  const [followers, setFollowers] = useState<FollowUserItem[]>(initialFollowers || []);
  const [following, setFollowing] = useState<FollowUserItem[]>(initialFollowing || []);
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(() => {
    if (isOwnProfile && initialFollowing) {
      return new Set(initialFollowing.map((u) => u.id));
    }
    return new Set();
  });

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Per-user request sequence to ensure rapid optimistic clicks always converge cleanly
  const reqSeqByUserRef = useRef<Map<string, number>>(new Map());

  const showFindTab = Boolean(user && supabaseEnabled);

  useEffect(() => {
    if (!isOpen) return;
    const targetTab =
      initialTab === 'find' && !showFindTab ? 'followers' : initialTab;
    setActiveTab(targetTab);
    setActionError(null);
    if (initialFollowers) setFollowers(initialFollowers);
    if (initialFollowing) {
      setFollowing(initialFollowing);
      if (isOwnProfile) {
        setMyFollowingIds(new Set(initialFollowing.map((u) => u.id)));
      }
    }
  }, [isOpen, initialTab, showFindTab, initialFollowers, initialFollowing, isOwnProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadLists = useCallback(async () => {
    if (!isOpen || !supabaseEnabled || !targetUserId) return;
    setLoading(true);
    try {
      if (isOwnProfile && user) {
        const res = await apiGetMyFollows();
        const nextFollowers = res.followers || [];
        const nextFollowing = res.following || [];
        setFollowers(nextFollowers);
        setFollowing(nextFollowing);
        setMyFollowingIds(new Set(nextFollowing.map((u) => u.id)));
        onOwnFollowCountsChange?.(nextFollowers, nextFollowing);
      } else {
        const [profData, myData] = await Promise.all([
          apiGetPublicProfile(targetUserId),
          user ? apiGetMyFollows().catch(() => null) : Promise.resolve(null),
        ]);
        setFollowers(profData.followers || []);
        setFollowing(profData.following || []);
        if (myData) {
          setMyFollowingIds(new Set((myData.following || []).map((u) => u.id)));
        }
      }
    } catch {
      // Keep seeded initial lists if refresh fails
    } finally {
      setLoading(false);
    }
  }, [isOpen, supabaseEnabled, targetUserId, isOwnProfile, user, onOwnFollowCountsChange]);

  useEffect(() => {
    if (isOpen) {
      void loadLists();
    }
  }, [isOpen, loadLists]);

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
    if (!isOpen || activeTab !== 'find' || !user) return;
    const timer = window.setTimeout(() => {
      void runUserSearch(searchQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [isOpen, activeTab, searchQuery, user, runUserSearch]);

  const handleToggleFollow = (person: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  }) => {
    if (!user) {
      openAuthGuard('Theo dõi thành viên');
      return;
    }
    if (person.id === user.id) return;

    const currentlyFollowing = myFollowingIds.has(person.id);
    const nextFollowing = !currentlyFollowing;

    // Snapshot previous state for atomic rollback if server rejects
    const prevFollowingIds = new Set(myFollowingIds);
    const prevFollowers = followers;
    const prevFollowing = following;
    const prevSearchResults = searchResults;

    // 1. Immediate Optimistic UI Update (<16ms)
    setActionError(null);
    const nextFollowingIds = new Set(myFollowingIds);
    if (nextFollowing) {
      nextFollowingIds.add(person.id);
    } else {
      nextFollowingIds.delete(person.id);
    }
    setMyFollowingIds(nextFollowingIds);

    const updatedFollowers = followers.map((f) =>
      f.id === person.id ? { ...f, isFollowingBack: nextFollowing } : f
    );
    setFollowers(updatedFollowers);

    let updatedFollowing = following;
    if (isOwnProfile) {
      if (nextFollowing) {
        if (!following.some((u) => u.id === person.id)) {
          updatedFollowing = [
            {
              id: person.id,
              displayName: person.displayName,
              avatarUrl: person.avatarUrl,
              followedAt: new Date().toISOString(),
            },
            ...following,
          ];
        }
      } else {
        updatedFollowing = following.filter((u) => u.id !== person.id);
      }
      setFollowing(updatedFollowing);
      onOwnFollowCountsChange?.(updatedFollowers, updatedFollowing);
    }

    setSearchResults((prev) =>
      prev.map((u) =>
        u.id === person.id ? { ...u, isFollowing: nextFollowing } : u
      )
    );

    // 2. Background persistence with latest-intent sequencing
    const nextSeq = (reqSeqByUserRef.current.get(person.id) || 0) + 1;
    reqSeqByUserRef.current.set(person.id, nextSeq);

    void apiToggleFollowUser(person.id, nextFollowing).catch((err: any) => {
      if (reqSeqByUserRef.current.get(person.id) !== nextSeq) return;
      setMyFollowingIds(prevFollowingIds);
      setFollowers(prevFollowers);
      setFollowing(prevFollowing);
      setSearchResults(prevSearchResults);
      if (isOwnProfile) {
        onOwnFollowCountsChange?.(prevFollowers, prevFollowing);
      }
      setActionError(
        err?.message || `Không thể cập nhật theo dõi ${person.displayName}.`
      );
    });
  };

  const titleLabel = useMemo(() => {
    if (isOwnProfile) return displayName || 'Cộng đồng của tôi';
    return targetDisplayName || 'Cộng đồng thành viên';
  }, [isOwnProfile, displayName, targetDisplayName]);

  if (!isOpen) return null;

  const renderPersonRow = (
    person: FollowUserItem,
    subtitle: string,
    tabContext: 'followers' | 'following'
  ) => {
    const isSelf = Boolean(user && user.id === person.id);
    const isViewerFollowing = isOwnProfile
      ? tabContext === 'following'
        ? myFollowingIds.has(person.id)
        : Boolean(person.isFollowingBack ?? myFollowingIds.has(person.id))
      : myFollowingIds.has(person.id);

    return (
      <div
        key={`${tabContext}-${person.id}`}
        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors min-h-[56px]"
      >
        <Link
          to={`/u/${person.id}`}
          onClick={onClose}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          <UserAvatar
            name={person.displayName}
            avatarUrl={person.avatarUrl}
            sizeClass="w-10 h-10"
            textSizeClass="text-xs"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 hover:text-teal-800 truncate">
              {person.displayName}
            </div>
            <div className="text-[11px] text-slate-400 tabular-nums truncate">
              {subtitle}
            </div>
          </div>
        </Link>

        {!isSelf && (
          <button
            type="button"
            onClick={() => handleToggleFollow(person)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] active:scale-95 ${
              isViewerFollowing
                ? tabContext === 'following' && isOwnProfile
                  ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                  : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                : 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800'
            }`}
          >
            {isViewerFollowing ? (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Đang theo dõi</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {isOwnProfile && tabContext === 'followers'
                    ? 'Theo dõi lại'
                    : 'Theo dõi'}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-modal-title"
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[86vh] sm:max-h-[80vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2
              id="follow-modal-title"
              className="text-sm sm:text-base font-bold text-slate-900 truncate"
            >
              {titleLabel}
            </h2>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {followers.length} người theo dõi · Đang theo dõi {following.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('followers')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap min-h-[36px] ${
              activeTab === 'followers'
                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Người theo dõi ({followers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap min-h-[36px] ${
              activeTab === 'following'
                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Đang theo dõi ({following.length})</span>
          </button>

          {showFindTab && (
            <button
              type="button"
              onClick={() => setActiveTab('find')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px] ${
                activeTab === 'find'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm bạn học</span>
            </button>
          )}
        </div>

        {actionError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2 shrink-0">
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {activeTab === 'find' ? (
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm thành viên theo tên hiển thị..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                />
              </div>

              {searchingUsers ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                  <span>Đang tìm kiếm thành viên...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Không tìm thấy thành viên nào phù hợp.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {searchResults.map((person) => {
                    const isFollowing =
                      myFollowingIds.size > 0
                        ? myFollowingIds.has(person.id)
                        : person.isFollowing;

                    return (
                      <div
                        key={person.id}
                        className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors min-h-[56px]"
                      >
                        <Link
                          to={`/u/${person.id}`}
                          onClick={onClose}
                          className="flex items-center gap-3 min-w-0 flex-1"
                        >
                          <UserAvatar
                            name={person.displayName}
                            avatarUrl={person.avatarUrl}
                            sizeClass="w-9 h-9"
                            textSizeClass="text-xs"
                          />
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
                          onClick={() => handleToggleFollow(person)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] active:scale-95 ${
                            isFollowing
                              ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                              : 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800'
                          }`}
                        >
                          {isFollowing ? (
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
                    );
                  })}
                </div>
              )}
            </div>
          ) : loading && followers.length === 0 && following.length === 0 ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
              <span>Đang tải danh sách...</span>
            </div>
          ) : activeTab === 'followers' ? (
            followers.length === 0 ? (
              <div className="py-12 px-6 text-center text-xs text-slate-500">
                {isOwnProfile
                  ? 'Chưa có ai theo dõi bạn. Chia sẻ bộ thẻ hay để kết nối thêm nhiều bạn học!'
                  : 'Chưa có người theo dõi nào.'}
              </div>
            ) : (
              followers.map((person) =>
                renderPersonRow(
                  person,
                  `Theo dõi từ ${new Date(person.followedAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}`,
                  'followers'
                )
              )
            )
          ) : following.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-slate-500">
              {isOwnProfile
                ? 'Bạn chưa theo dõi thành viên nào. Chuyển sang tab Tìm bạn học để khám phá!'
                : 'Chưa theo dõi thành viên nào.'}
            </div>
          ) : (
            following.map((person) =>
              renderPersonRow(
                person,
                `Đang theo dõi từ ${new Date(person.followedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}`,
                'following'
              )
            )
          )}
        </div>
      </div>
    </div>
  );
};
