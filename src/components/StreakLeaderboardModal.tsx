import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Flame,
  Trophy,
  Crown,
  Medal,
  RefreshCw,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  apiGetStreakLeaderboard,
  StreakLeaderboardResponse,
  syncStudyStatsFromCloud,
} from '../services/studyStatsService';
import { useAuth } from '../context/AuthContext';

interface StreakLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  localCurrentStreak: number;
  localLongestStreak: number;
  localTodayReviewed: number;
  localDailyGoal: number;
  localTotalReviewed: number;
}

export function getFlameStyle(streak: number, isActiveToday: boolean) {
  if (streak <= 0) {
    return {
      bg: 'bg-slate-100 border-slate-200',
      icon: 'text-slate-400',
      text: 'text-slate-500',
      label: 'Chưa có chuỗi',
    };
  }
  if (!isActiveToday) {
    return {
      bg: 'bg-amber-50 border-amber-200/80',
      icon: 'text-amber-500',
      text: 'text-amber-800',
      label: 'Chờ giữ lửa hôm nay',
    };
  }
  if (streak >= 30) {
    return {
      bg: 'bg-gradient-to-br from-orange-500 to-rose-500 border-orange-400 shadow-xs',
      icon: 'text-white fill-amber-200',
      text: 'text-rose-700',
      label: 'Siêu bền bỉ',
    };
  }
  if (streak >= 7) {
    return {
      bg: 'bg-gradient-to-br from-amber-400 to-orange-500 border-orange-400 shadow-xs',
      icon: 'text-white fill-amber-100',
      text: 'text-orange-700',
      label: 'Đang rực cháy',
    };
  }
  return {
    bg: 'bg-orange-50 border-orange-200',
    icon: 'text-orange-500 fill-orange-400',
    text: 'text-orange-700',
    label: 'Đang giữ lửa',
  };
}

export const StreakLeaderboardModal: React.FC<StreakLeaderboardModalProps> = ({
  isOpen,
  onClose,
  localCurrentStreak,
  localLongestStreak,
  localTodayReviewed,
  localDailyGoal,
  localTotalReviewed,
}) => {
  const { user, openAuthModal } = useAuth();
  const [data, setData] = useState<StreakLeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (user) {
        await syncStudyStatsFromCloud();
      }
      const res = await apiGetStreakLeaderboard(30);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải bảng xếp hạng lúc này.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    void loadLeaderboard();
  }, [isOpen, loadLeaderboard]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4 fill-amber-400 text-amber-600" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 flex items-center justify-center shrink-0">
          <Medal className="w-4 h-4 text-slate-500" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0">
          <Medal className="w-4 h-4 text-orange-600" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 font-mono text-xs font-bold tabular-nums flex items-center justify-center shrink-0">
        {rank}
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 max-h-[100dvh] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-2.5 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Bảng xếp hạng Streak"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92dvh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Flame className="w-5 h-5 fill-amber-100 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                Bảng xếp hạng Streak học Kanji
              </h2>
              <p className="text-xs text-slate-600 truncate">
                Duy trì ngọn lửa ôn tập mỗi ngày để leo hạng cùng cộng đồng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void loadLeaderboard()}
              disabled={isLoading}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-50 transition-colors"
              title="Làm mới bảng xếp hạng"
              aria-label="Làm mới bảng xếp hạng"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-700' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer Personal Summary Banner */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                getFlameStyle(localCurrentStreak, localTodayReviewed > 0).bg
              }`}
            >
              <Flame
                className={`w-5 h-5 ${
                  getFlameStyle(localCurrentStreak, localTodayReviewed > 0).icon
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 tabular-nums">
                <span>
                  Streak của bạn:{' '}
                  <strong className="text-orange-600">{localCurrentStreak} ngày</strong>
                </span>
                {data?.viewerRank && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-teal-700">Hạng #{data.viewerRank}</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                Hôm nay: {localTodayReviewed}/{localDailyGoal} thẻ · Kỷ lục: {localLongestStreak} ngày · Tổng: {localTotalReviewed.toLocaleString('vi-VN')} lượt ôn
              </div>
            </div>
          </div>

          {!user && (
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal('login');
              }}
              className="px-3 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập để lên BXH</span>
            </button>
          )}
        </div>

        {/* Leaderboard List Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-2.5">
          {isLoading && !data ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-slate-100 animate-pulse border border-slate-200/70"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50/70 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="text-xs font-semibold text-rose-800">{error}</p>
              <button
                type="button"
                onClick={() => void loadLeaderboard()}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-100 cursor-pointer"
              >
                Thử tải lại
              </button>
            </div>
          ) : data && !data.tableReady ? (
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Chưa kích hoạt bảng Streak trên Supabase</span>
              </div>
              <p className="leading-relaxed text-amber-800">
                Bảng <code className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">public.user_study_streaks</code> chưa tồn tại trên cơ sở dữ liệu Supabase. Hãy mở <strong>Supabase SQL Editor</strong> và chạy file script migration <code className="font-mono font-bold">docs/supabase_study_streak_migration.sql</code> để kích hoạt bảng xếp hạng trực tuyến.
              </p>
            </div>
          ) : !data || data.entries.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Trophy className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Chưa có dữ liệu xếp hạng</p>
              <p className="text-xs text-slate-500">
                Hãy hoàn thành ít nhất 1 thẻ ôn tập hôm nay khi đã đăng nhập để thắp ngọn lửa đầu tiên trên bảng xếp hạng!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-2xl overflow-hidden">
              {data.entries.map((entry) => {
                const flame = getFlameStyle(entry.currentStreak, entry.isActiveToday);
                const initials = entry.displayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() || '')
                  .join('') || 'U';

                return (
                  <div
                    key={entry.userId}
                    className={`px-3.5 sm:px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                      entry.isSelf ? 'bg-teal-50/75' : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      {renderRankBadge(entry.rank)}

                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {entry.displayName}
                          </span>
                          {entry.isSelf && (
                            <span className="text-[11px] font-bold text-teal-700 shrink-0">
                              (Bạn)
                            </span>
                          )}
                          {entry.todayCount >= entry.dailyGoal && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 shrink-0"
                              title="Đã đạt mục tiêu hôm nay"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums truncate">
                          Hôm nay: {entry.todayCount}/{entry.dailyGoal} thẻ · Kỷ lục: {entry.longestStreak} ngày · {entry.totalReviewed.toLocaleString('vi-VN')} lượt
                        </div>
                      </div>
                    </div>

                    {/* Duolingo-style Flame Streak Counter */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 tabular-nums ${flame.bg}`}
                        title={flame.label}
                      >
                        <Flame className={`w-4 h-4 shrink-0 ${flame.icon}`} />
                        <span
                          className={`text-xs sm:text-sm font-black leading-none ${
                            entry.currentStreak >= 7 && entry.isActiveToday
                              ? 'text-white'
                              : flame.text
                          }`}
                        >
                          {entry.currentStreak}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
