import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  Trophy,
  Crown,
  Medal,
  RefreshCw,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Play,
  Target,
  ExternalLink,
} from 'lucide-react';
import {
  apiGetStreakLeaderboard,
  computeStreakMetrics,
  getFlameStyle,
  loadLocalStudyStats,
  LocalStudyStats,
  StreakLeaderboardEntry,
  StreakLeaderboardResponse,
  STUDY_STATS_UPDATED_EVENT,
  syncStudyStatsFromCloud,
} from '../services/studyStatsService';
import { useAuth } from '../context/AuthContext';
import { usePageLoadingIndicator } from '../context/LoadingContext';
import { StudyHeatmap365 } from '../components/StudyHeatmap365';
import { UserAvatar } from '../components/UserAvatar';

export const StreakLeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthLoading, openAuthModal } = useAuth();

  const [stats, setStats] = useState<LocalStudyStats>(() => loadLocalStudyStats());
  const [data, setData] = useState<StreakLeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncHandler = () => setStats(loadLocalStudyStats());
    window.addEventListener(STUDY_STATS_UPDATED_EVENT, syncHandler);
    return () => window.removeEventListener(STUDY_STATS_UPDATED_EVENT, syncHandler);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (isAuthLoading) return;
    if (!user) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const merged = await syncStudyStatsFromCloud();
      setStats(merged);
      const res = await apiGetStreakLeaderboard(50);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải bảng xếp hạng Streak lúc này.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  usePageLoadingIndicator('streak-leaderboard', isLoading);

  const metrics = useMemo(() => computeStreakMetrics(stats), [stats]);
  const myFlame = getFlameStyle(metrics.currentStreak, metrics.isStreakActiveToday);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4 fill-amber-400 text-amber-600" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 flex items-center justify-center shrink-0">
          <Medal className="w-4 h-4 text-slate-500" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0">
          <Medal className="w-4 h-4 text-orange-600" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 font-mono text-xs font-bold tabular-nums flex items-center justify-center shrink-0">
        {rank}
      </div>
    );
  };

  const topThree: StreakLeaderboardEntry[] =
    data && data.entries.length >= 3 ? data.entries.slice(0, 3) : [];

  return (
    <section className="w-full max-w-4xl mx-auto space-y-5 pb-10">
      {/* Page Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Bảng xếp hạng Streak học Kanji
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Duy trì chuỗi ngày ôn tập liên tục để giữ ngọn lửa và leo hạng cùng cộng đồng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <button
              type="button"
              onClick={() => void loadLeaderboard()}
              disabled={isLoading}
              className="px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-700' : ''}`} />
              <span>Làm mới</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/decks')}
            className="px-3.5 py-2 min-h-[38px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Ôn tập ngay</span>
          </button>
        </div>
      </div>

      {/* Personal Streak Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${myFlame.bg}`}
            title={myFlame.label}
          >
            <Flame className={`w-6 h-6 ${myFlame.icon}`} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-900 tabular-nums">
              <span>
                Streak của bạn:{' '}
                <strong className="text-orange-600">{metrics.currentStreak} ngày</strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-xs font-bold text-slate-600">{myFlame.label}</span>
              {data?.viewerRank && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="text-xs font-extrabold text-teal-700">
                    Hạng #{data.viewerRank}
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-teal-700" />
                Hôm nay: {metrics.todayReviewed}/{metrics.dailyGoal} thẻ
              </span>
              <span aria-hidden="true">·</span>
              <span>Kỷ lục: {metrics.longestStreak} ngày</span>
              <span aria-hidden="true">·</span>
              <span>Tổng: {metrics.totalReviewed.toLocaleString('vi-VN')} lượt ôn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Annual 365-Day Study Heatmap */}
      <StudyHeatmap365 stats={stats} title="Bản đồ nhiệt 365 ngày của bạn" />

      {/* Leaderboard Body */}
      {isAuthLoading || (isLoading && !data) ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-16 rounded-xl bg-slate-100 animate-pulse border border-slate-200/60"
            />
          ))}
        </div>
      ) : !user || (error && /token|xác thực|unauthorized|đăng nhập/i.test(error)) ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 text-center space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Đăng nhập để xem bảng xếp hạng
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Đồng bộ chuỗi Streak và thi đua thứ hạng cùng cộng đồng học Kanji.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 min-h-[40px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập</span>
          </button>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => void loadLeaderboard()}
            className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl cursor-pointer transition-colors"
          >
            Thử tải lại
          </button>
        </div>
      ) : data && !data.tableReady ? (
        <div className="bg-white rounded-2xl border border-amber-200 p-6 space-y-2.5 text-xs sm:text-sm text-amber-900">
          <div className="flex items-center gap-2 font-bold text-base">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Chưa kích hoạt bảng Streak trên Supabase</span>
          </div>
          <p className="leading-relaxed text-amber-800">
            Bảng <code className="font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">public.user_study_streaks</code> chưa tồn tại trên cơ sở dữ liệu Supabase. Hãy mở <strong>Supabase SQL Editor</strong> và chạy file script migration <code className="font-mono font-bold">docs/supabase_study_streak_migration.sql</code> để kích hoạt bảng xếp hạng trực tuyến.
          </p>
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3">
          <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Chưa có thành viên trên bảng xếp hạng</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Hãy đăng nhập và hoàn thành ít nhất 1 thẻ Flashcard hôm nay để thắp ngọn lửa đầu tiên trên bảng xếp hạng cộng đồng!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 Podium Cards */}
          {topThree.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topThree.map((entry) => {
                const flame = getFlameStyle(entry.currentStreak, entry.isActiveToday);
                const cardRing =
                  entry.rank === 1
                    ? 'border-amber-300 bg-gradient-to-b from-amber-50/70 to-white'
                    : entry.rank === 2
                    ? 'border-slate-300 bg-gradient-to-b from-slate-50/80 to-white'
                    : 'border-orange-200 bg-gradient-to-b from-orange-50/50 to-white';

                return (
                  <div
                    key={entry.userId}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${cardRing}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {renderRankBadge(entry.rank)}
                      <div
                        className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 tabular-nums ${flame.bg}`}
                        title={flame.label}
                      >
                        <Flame className={`w-4 h-4 shrink-0 ${flame.icon}`} />
                        <span
                          className={`text-sm font-black leading-none ${
                            entry.currentStreak >= 7 && entry.isActiveToday
                              ? 'text-white'
                              : flame.text
                          }`}
                        >
                          {entry.currentStreak}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        name={entry.displayName}
                        avatarUrl={entry.avatarUrl}
                        sizeClass="w-10 h-10"
                        textSizeClass="text-xs"
                        className="border border-slate-200"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/u/${entry.userId}`}
                          className="text-sm font-bold text-slate-900 hover:text-teal-800 truncate inline-flex items-center gap-1 max-w-full"
                        >
                          <span className="truncate">{entry.displayName}</span>
                          {entry.isSelf && (
                            <span className="text-[11px] font-bold text-teal-700 shrink-0">
                              (Bạn)
                            </span>
                          )}
                        </Link>
                        <p className="text-[11px] text-slate-500 tabular-nums truncate">
                          Hôm nay {entry.todayCount}/{entry.dailyGoal} · Kỷ lục {entry.longestStreak} ngày
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Ranked List */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {data.entries.map((entry) => {
              const flame = getFlameStyle(entry.currentStreak, entry.isActiveToday);

              return (
                <div
                  key={entry.userId}
                  className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 transition-colors ${
                    entry.isSelf ? 'bg-teal-50/75' : 'bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {renderRankBadge(entry.rank)}

                    <UserAvatar
                      name={entry.displayName}
                      avatarUrl={entry.avatarUrl}
                      sizeClass="w-9 h-9"
                      textSizeClass="text-xs"
                      className="border border-slate-200"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Link
                          to={`/u/${entry.userId}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-teal-800 truncate inline-flex items-center gap-1"
                        >
                          <span className="truncate">{entry.displayName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 opacity-75" />
                        </Link>
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
                      <div className="text-[11px] text-slate-500 tabular-nums truncate mt-0.5">
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
        </div>
      )}
    </section>
  );
};
