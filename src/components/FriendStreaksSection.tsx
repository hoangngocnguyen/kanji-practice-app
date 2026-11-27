import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Link2,
  Loader2,
  Plus,
  Search,
  Send,
  Shield,
  Snowflake,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  apiCreateFriendStreakInvite,
  apiEndFriendStreak,
  apiGetFriendStreaksHub,
  apiNudgeFriendStreak,
  apiRescueFriendStreak,
  apiRespondFriendStreakInvite,
  FriendStreakPair,
  FriendStreaksHubData,
} from '../services/friendStreakService';
import {
  apiGetMyFollows,
  apiSearchUsers,
  FollowUserItem,
  SearchUserResult,
} from '../services/communityService';
import { syncStudyStatsFromCloud } from '../services/studyStatsService';
import { UserAvatar } from './UserAvatar';

export const FriendStreaksSection: React.FC = () => {
  const { user, openAuthModal } = useAuth();

  const [hub, setHub] = useState<FriendStreaksHubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmEndPairId, setConfirmEndPairId] = useState<string | null>(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTab, setInviteTab] = useState<'direct' | 'link'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [followingList, setFollowingList] = useState<FollowUserItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadHub = useCallback(async () => {
    if (!user) {
      setHub(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetFriendStreaksHub();
      setHub(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách Streak bạn bè.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  // Load follow list & search users when Invite modal opens
  useEffect(() => {
    if (!isInviteModalOpen || !user) return;
    void apiGetMyFollows()
      .then((res) => setFollowingList(res.following || []))
      .catch(() => null);
  }, [isInviteModalOpen, user]);

  useEffect(() => {
    if (!isInviteModalOpen || inviteTab !== 'direct' || !user) return;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void apiSearchUsers(searchQuery)
        .then((res) => setSearchResults(res.users || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isInviteModalOpen, inviteTab, searchQuery, user]);

  const copyInviteUrl = async (code: string, keyId: string) => {
    const url = `${window.location.origin}/invite/streak/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(keyId);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setFeedback({ type: 'error', text: `Link mời của bạn: ${url}` });
    }
  };

  const handleCreateDirectInvite = async (targetUserId: string, targetName: string) => {
    setBusyKey(`invite-${targetUserId}`);
    setFeedback(null);
    try {
      const res = await apiCreateFriendStreakInvite(targetUserId);
      setFeedback({
        type: 'success',
        text: res.alreadyPending
          ? `Đã có lời mời chờ ${targetName} phản hồi.`
          : `Đã gửi lời mời nối Streak tới ${targetName}!`,
      });
      await loadHub();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể gửi lời mời nối Streak.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleGenerateQuickLink = async () => {
    setBusyKey('quick-link');
    setFeedback(null);
    try {
      const res = await apiCreateFriendStreakInvite();
      const url = `${window.location.origin}/invite/streak/${res.invite.inviteCode}`;
      setGeneratedLink(url);
      await loadHub();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể tạo link mời nhanh.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRespondInvite = async (
    inviteId: string,
    decision: 'accept' | 'decline' | 'cancel'
  ) => {
    setBusyKey(`resp-${inviteId}-${decision}`);
    setFeedback(null);
    try {
      const res = await apiRespondFriendStreakInvite({ inviteId, decision });
      if (decision === 'accept') {
        setFeedback({
          type: 'success',
          text: res.alreadyConnected
            ? 'Hai bạn đã đang nối Streak với nhau.'
            : 'Đã kết nối Streak bạn bè thành công!',
        });
      }
      await loadHub();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể xử lý lời mời.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleNudge = async (pair: FriendStreakPair) => {
    setBusyKey(`nudge-${pair.pairId}`);
    setFeedback(null);
    try {
      await apiNudgeFriendStreak(pair.pairId);
      setFeedback({
        type: 'success',
        text: `Đã gửi lời nhắc học hôm nay tới ${pair.partner.displayName}.`,
      });
      await loadHub();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể gửi nhắc học.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRescue = async (pair: FriendStreakPair) => {
    setBusyKey(`rescue-${pair.pairId}`);
    setFeedback(null);
    try {
      const res = await apiRescueFriendStreak(pair.pairId);
      setFeedback({
        type: 'success',
        text: `Đã dùng 1 Băng Streak để cứu chuỗi ngày cho ${pair.partner.displayName}! Còn ${res.remainingFreezes}/2 Băng.`,
      });
      await Promise.all([loadHub(), syncStudyStatsFromCloud()]);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể cứu Streak cho bạn bè.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleEndPair = async (pairId: string) => {
    setBusyKey(`end-${pairId}`);
    setFeedback(null);
    try {
      await apiEndFriendStreak(pairId);
      setConfirmEndPairId(null);
      await loadHub();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Không thể ngắt kết nối.',
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3">
        <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
          <Users className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          Đăng nhập để nối Streak cùng bạn bè
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Kết nối tối đa 6 người bạn học Kanji mỗi ngày, nhắc nhau ôn tập và dùng Băng Streak bảo vệ chuỗi ngày khi cần.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer transition-colors"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  if (loading && !hub) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
        <span>Đang tải Streak Bạn Bè và kho Băng Streak...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-2.5">
        <AlertCircle className="w-7 h-7 text-rose-600 mx-auto" />
        <p className="text-xs font-semibold text-rose-800">{error}</p>
        <button
          type="button"
          onClick={() => void loadHub()}
          className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (hub && !hub.tableReady) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-6 space-y-2 text-xs sm:text-sm text-amber-900">
        <div className="flex items-center gap-2 font-bold text-base">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Chưa kích hoạt bảng Streak Bạn Bè trên Supabase</span>
        </div>
        <p className="text-amber-800 leading-relaxed">
          Hãy chạy file migration{' '}
          <code className="font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            docs/supabase_friend_streak_notifications_migration.sql
          </code>{' '}
          trong Supabase SQL Editor để kích hoạt Băng Streak, Friend Streaks (tối đa 6 kết nối) và Hệ thống thông báo Realtime.
        </p>
      </div>
    );
  }

  const freeze = hub?.freezeState || {
    streakFreezes: 1,
    maxFreezes: 2,
    freezeRechargeDays: 0,
    rechargeTarget: 10,
    frozenDates: [],
  };
  const activePairs = hub?.activePairs || [];
  const incomingInvites = hub?.incomingInvites || [];
  const outgoingInvites = hub?.outgoingInvites || [];
  const maxSlots = hub?.maxSlots || 6;
  const emptySlotsCount = Math.max(0, maxSlots - activePairs.length);

  const connectedPartnerIds = new Set(activePairs.map((p) => p.partner.id));
  const pendingInviteeIds = new Set(
    outgoingInvites.map((i) => i.invitee?.id).filter(Boolean) as string[]
  );

  const rechargePct = Math.min(
    100,
    Math.round((freeze.freezeRechargeDays / Math.max(1, freeze.rechargeTarget)) * 100)
  );

  return (
    <div className="space-y-4">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Streak Freeze Inventory Card */}
      <div className="bg-white rounded-2xl border border-sky-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
            <Snowflake className="w-6 h-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Kho Băng Streak
              </h2>
              <span className="text-xs font-extrabold text-sky-700 tabular-nums">
                {freeze.streakFreezes}/{freeze.maxFreezes} Băng
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tự động kích hoạt khi bạn lỡ 1 ngày học để bảo toàn chuỗi. Học thêm 10 ngày liên tục để hồi lại +1 Băng (tối đa 2) hoặc dùng cứu bạn bè.
            </p>
          </div>
        </div>

        <div className="sm:w-56 shrink-0 space-y-2 bg-sky-50/70 border border-sky-200/70 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-sky-900">Kho trang bị</span>
            <div className="flex items-center gap-1.5">
              {[0, 1].map((idx) => (
                <span
                  key={idx}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                    idx < freeze.streakFreezes
                      ? 'bg-sky-500 border-sky-600 text-white shadow-2xs'
                      : 'bg-white border-sky-200 text-sky-200'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-sky-800 tabular-nums">
              <span>Tiến độ hồi băng</span>
              <span className="font-bold">
                {freeze.streakFreezes >= freeze.maxFreezes
                  ? 'Đã đầy'
                  : `${freeze.freezeRechargeDays}/${freeze.rechargeTarget} ngày`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-sky-200/70">
              <div
                className="h-full bg-sky-500 transition-all duration-200"
                style={{
                  width: `${
                    freeze.streakFreezes >= freeze.maxFreezes ? 100 : rechargePct
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Incoming Invites */}
      {incomingInvites.length > 0 && (
        <div className="bg-white rounded-2xl border border-orange-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-orange-900">
            <UserPlus className="w-4 h-4 text-orange-500" />
            <span>Lời mời nối Streak đang chờ bạn ({incomingInvites.length})</span>
          </div>
          <div className="divide-y divide-slate-100">
            {incomingInvites.map((inv) => (
              <div
                key={inv.id}
                className="py-2.5 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
              >
                <Link
                  to={`/u/${inv.inviter.id}`}
                  className="flex items-center gap-2.5 min-w-0"
                >
                  <UserAvatar
                    name={inv.inviter.displayName}
                    avatarUrl={inv.inviter.avatarUrl}
                    sizeClass="w-9 h-9"
                    textSizeClass="text-xs"
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {inv.inviter.displayName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Muốn cùng bạn giữ chuỗi Streak mỗi ngày
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyKey === `resp-${inv.id}-accept`}
                    onClick={() => void handleRespondInvite(inv.id, 'accept')}
                    className="px-3 py-1.5 min-h-[38px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Chấp nhận
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `resp-${inv.id}-decline`}
                    onClick={() => void handleRespondInvite(inv.id, 'decline')}
                    className="px-3 py-1.5 min-h-[38px] text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Active Friend Streaks Grid (Max 6 Slots) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>
                Streak Bạn Bè ({activePairs.length}/{maxSlots})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cả hai cùng học mỗi ngày để tăng chuỗi chung. Tự bảo vệ bằng Băng hoặc dùng Băng của mình cứu bạn!
            </p>
          </div>

          {activePairs.length < maxSlots && (
            <button
              type="button"
              onClick={() => {
                setGeneratedLink(null);
                setInviteTab('direct');
                setIsInviteModalOpen(true);
              }}
              className="px-3.5 py-2 min-h-[40px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Mời bạn nối Streak</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activePairs.map((pair) => {
            const isConfirmingEnd = confirmEndPairId === pair.pairId;
            return (
              <div
                key={pair.pairId}
                className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                  pair.isActiveToday
                    ? 'border-orange-200 bg-orange-50/35'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Partner & Pair Flame */}
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/u/${pair.partner.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <UserAvatar
                      name={pair.partner.displayName}
                      avatarUrl={pair.partner.avatarUrl}
                      sizeClass="w-11 h-11"
                      textSizeClass="text-sm"
                      className="border border-slate-200"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-teal-800 truncate">
                        {pair.partner.displayName}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                        Streak cá nhân {pair.partner.currentStreak} ngày · Kỷ lục cặp{' '}
                        {pair.longestPairStreak}
                      </div>
                    </div>
                  </Link>

                  <div
                    className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 tabular-nums shrink-0 ${
                      pair.isActiveToday
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : pair.pairStreak > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Flame
                      className={`w-4 h-4 ${
                        pair.isActiveToday ? 'text-white fill-amber-200' : ''
                      }`}
                    />
                    <span className="text-sm font-black leading-none">{pair.pairStreak}</span>
                  </div>
                </div>

                {/* Today Status Row */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div
                    className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                      pair.viewerStudiedToday
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : pair.viewerFrozenToday
                        ? 'bg-sky-50 border-sky-200 text-sky-800 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {pair.viewerStudiedToday ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : pair.viewerFrozenToday ? (
                      <Snowflake className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">
                      Bạn:{' '}
                      {pair.viewerStudiedToday
                        ? 'Đã học'
                        : pair.viewerFrozenToday
                        ? 'Đã đóng băng'
                        : 'Chờ học'}
                    </span>
                  </div>

                  <div
                    className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                      pair.partner.studiedToday
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : pair.partner.frozenToday
                        ? 'bg-sky-50 border-sky-200 text-sky-800 font-semibold'
                        : 'bg-amber-50/70 border-amber-200/80 text-amber-800'
                    }`}
                  >
                    {pair.partner.studiedToday ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : pair.partner.frozenToday ? (
                      <Snowflake className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className="truncate">
                      Bạn ấy:{' '}
                      {pair.partner.studiedToday
                        ? 'Đã học'
                        : pair.partner.frozenToday
                        ? 'Đã đóng băng'
                        : 'Chưa học'}
                    </span>
                  </div>
                </div>

                {pair.rescueReason && (
                  <p className="text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200/80 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{pair.rescueReason}</span>
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!pair.partner.studiedToday && !pair.partner.frozenToday && (
                      <button
                        type="button"
                        disabled={!pair.canNudge || busyKey === `nudge-${pair.pairId}`}
                        onClick={() => void handleNudge(pair)}
                        className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>{pair.nudgedToday ? 'Đã nhắc hôm nay' : 'Nhắc học'}</span>
                      </button>
                    )}

                    {pair.canRescue && (
                      <button
                        type="button"
                        disabled={busyKey === `rescue-${pair.pairId}`}
                        onClick={() => void handleRescue(pair)}
                        className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold rounded-xl border border-sky-300 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Snowflake className="w-3.5 h-3.5" />
                        <span>Cứu bạn (-1 Băng)</span>
                      </button>
                    )}
                  </div>

                  {isConfirmingEnd ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyKey === `end-${pair.pairId}`}
                        onClick={() => void handleEndPair(pair.pairId)}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                      >
                        Xác nhận ngắt
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmEndPairId(null)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmEndPairId(pair.pairId)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                      title="Ngắt kết nối Streak"
                      aria-label="Ngắt kết nối Streak"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty Invite Slots up to 6 */}
          {Array.from({ length: emptySlotsCount }).map((_, idx) => (
            <button
              key={`empty-slot-${idx}`}
              type="button"
              onClick={() => {
                setGeneratedLink(null);
                setInviteTab('direct');
                setIsInviteModalOpen(true);
              }}
              className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 p-5 min-h-[124px] flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-teal-800 transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-teal-100 text-slate-500 group-hover:text-teal-700 flex items-center justify-center transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Mời bạn nối Streak</span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                Vị trí {activePairs.length + idx + 1}/{maxSlots}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Outgoing Invites */}
      {outgoingInvites.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2.5">
          <h3 className="text-xs font-extrabold text-slate-700">
            Lời mời đã gửi ({outgoingInvites.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {outgoingInvites.map((inv) => (
              <div
                key={inv.id}
                className="py-2 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {inv.invitee ? (
                    <>
                      <UserAvatar
                        name={inv.invitee.displayName}
                        avatarUrl={inv.invitee.avatarUrl}
                        sizeClass="w-8 h-8"
                        textSizeClass="text-[11px]"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {inv.invitee.displayName}
                        </div>
                        <div className="text-[11px] text-slate-400">Đang chờ chấp nhận</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Link mời nhanh</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          /invite/streak/{inv.inviteCode}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void copyInviteUrl(inv.inviteCode, inv.id)}
                    className="px-2.5 py-1.5 min-h-[34px] text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === inv.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Chép link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `resp-${inv.id}-cancel`}
                    onClick={() => void handleRespondInvite(inv.id, 'cancel')}
                    className="px-2.5 py-1.5 min-h-[34px] text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Friend Modal */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setIsInviteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Mời bạn nối Streak"
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Mời bạn nối Streak
                </h2>
                <p className="text-[11px] text-slate-500 tabular-nums">
                  Đang kết nối {activePairs.length}/{maxSlots} người bạn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2 border-b border-slate-100 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setInviteTab('direct')}
                className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                  inviteTab === 'direct'
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Mời trực tiếp bạn học
              </button>
              <button
                type="button"
                onClick={() => setInviteTab('link')}
                className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                  inviteTab === 'link'
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tạo link mời nhanh
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {inviteTab === 'direct' ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên hiển thị..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                    />
                  </div>

                  {!searchQuery.trim() && followingList.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-500">
                        Đang theo dõi
                      </p>
                      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                        {followingList.slice(0, 6).map((person) => {
                          const isConnected = connectedPartnerIds.has(person.id);
                          const isPending = pendingInviteeIds.has(person.id);
                          return (
                            <div
                              key={person.id}
                              className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <UserAvatar
                                  name={person.displayName}
                                  avatarUrl={person.avatarUrl}
                                  sizeClass="w-8 h-8"
                                  textSizeClass="text-[11px]"
                                />
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {person.displayName}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={
                                  isConnected ||
                                  isPending ||
                                  busyKey === `invite-${person.id}`
                                }
                                onClick={() =>
                                  void handleCreateDirectInvite(person.id, person.displayName)
                                }
                                className="px-3 py-1.5 min-h-[34px] text-[11px] font-bold rounded-lg border cursor-pointer disabled:opacity-50 shrink-0 bg-teal-700 hover:bg-teal-800 text-white border-teal-700"
                              >
                                {isConnected
                                  ? 'Đã nối'
                                  : isPending
                                  ? 'Đã mời'
                                  : 'Mời'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500">
                      Thành viên cộng đồng
                    </p>
                    {searching ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                        <span>Đang tìm bạn học...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        Không tìm thấy thành viên nào phù hợp.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                        {searchResults.map((person) => {
                          const isConnected = connectedPartnerIds.has(person.id);
                          const isPending = pendingInviteeIds.has(person.id);
                          return (
                            <div
                              key={person.id}
                              className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <UserAvatar
                                  name={person.displayName}
                                  avatarUrl={person.avatarUrl}
                                  sizeClass="w-8 h-8"
                                  textSizeClass="text-[11px]"
                                />
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {person.displayName}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={
                                  isConnected ||
                                  isPending ||
                                  busyKey === `invite-${person.id}`
                                }
                                onClick={() =>
                                  void handleCreateDirectInvite(person.id, person.displayName)
                                }
                                className="px-3 py-1.5 min-h-[34px] text-[11px] font-bold rounded-lg border cursor-pointer disabled:opacity-50 shrink-0 bg-teal-700 hover:bg-teal-800 text-white border-teal-700 inline-flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>
                                  {isConnected
                                    ? 'Đã nối'
                                    : isPending
                                    ? 'Đã mời'
                                    : 'Gửi lời mời'}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tạo liên kết mời nhanh (có hiệu lực 7 ngày) để gửi qua Zalo, Messenger hoặc nhóm học Kanji. Người đầu tiên bấm chấp nhận sẽ nối Streak cùng bạn.
                  </p>

                  {!generatedLink ? (
                    <button
                      type="button"
                      disabled={busyKey === 'quick-link'}
                      onClick={() => void handleGenerateQuickLink()}
                      className="w-full py-2.5 min-h-[42px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Link2 className="w-4 h-4" />
                      <span>
                        {busyKey === 'quick-link'
                          ? 'Đang tạo link mời...'
                          : 'Tạo link mời ngay'}
                      </span>
                    </button>
                  ) : (
                    <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2.5">
                      <div className="text-xs font-mono text-teal-950 break-all bg-white p-2.5 rounded-lg border border-teal-200/80">
                        {generatedLink}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(generatedLink);
                          setCopiedKey('modal-link');
                          window.setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="w-full py-2 min-h-[38px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {copiedKey === 'modal-link' ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Đã sao chép link mời!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Sao chép link mời</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
