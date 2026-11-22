import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Flame,
  Trophy,
  CheckCircle2,
  Play,
  Target,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  computeStreakMetrics,
  loadLocalStudyStats,
  LocalStudyStats,
  setDailyStudyGoal,
  STUDY_STATS_UPDATED_EVENT,
  syncStudyStatsFromCloud,
} from '../services/studyStatsService';
import { getFlameStyle, StreakLeaderboardModal } from './StreakLeaderboardModal';

const GOAL_PRESETS = [10, 20, 30, 50];

export const HeaderStreakControl: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [stats, setStats] = useState<LocalStudyStats>(() => loadLocalStudyStats());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live refresh when any SRS card or daily goal is updated
  useEffect(() => {
    const syncHandler = () => setStats(loadLocalStudyStats());
    window.addEventListener(STUDY_STATS_UPDATED_EVENT, syncHandler);
    return () => window.removeEventListener(STUDY_STATS_UPDATED_EVENT, syncHandler);
  }, []);

  // Global cloud sync as soon as user signs in or mounts anywhere in the app
  useEffect(() => {
    if (!user) return;
    void syncStudyStatsFromCloud().then((merged) => setStats(merged));
  }, [user]);

  // Close popover on route transitions
  useEffect(() => {
    setIsPopoverOpen(false);
  }, [location.pathname]);

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!isPopoverOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPopoverOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopoverOpen]);

  const metrics = useMemo(() => computeStreakMetrics(stats), [stats]);
  const flame = getFlameStyle(metrics.currentStreak, metrics.isStreakActiveToday);

  const handleSelectGoal = (goal: number) => {
    const next = setDailyStudyGoal(goal);
    setStats(next);
  };

  // Trigger button styling tuned for compact Header harmony (mobile & desktop)
  const triggerTone =
    metrics.currentStreak <= 0
      ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200/90 text-slate-600'
      : !metrics.isStreakActiveToday
      ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-800'
      : metrics.currentStreak >= 30
      ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
      : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700';

  const triggerIconTone =
    metrics.currentStreak <= 0
      ? 'text-slate-400'
      : !metrics.isStreakActiveToday
      ? 'text-amber-500'
      : metrics.currentStreak >= 30
      ? 'text-rose-500 fill-orange-400'
      : 'text-orange-500 fill-orange-400';

  return (
    <>
      <div className="relative shrink-0" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 min-h-[36px] rounded-xl border text-xs font-extrabold tabular-nums transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${triggerTone} ${
            isPopoverOpen ? 'ring-2 ring-orange-400/40' : ''
          }`}
          title={`Chuỗi ${metrics.currentStreak} ngày · Hôm nay ${metrics.todayReviewed}/${metrics.dailyGoal} thẻ`}
          aria-label={`Chuỗi ngày học: ${metrics.currentStreak} ngày`}
          aria-expanded={isPopoverOpen}
          aria-haspopup="dialog"
        >
          <Flame className={`w-4 h-4 shrink-0 ${triggerIconTone}`} />
          <span>{metrics.currentStreak}</span>
        </button>

        {isPopoverOpen && (
          <div
            role="dialog"
            aria-label="Chi tiết chuỗi ngày học"
            className="fixed inset-x-3 top-[68px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[344px] bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Streak Status Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${flame.bg}`}
                >
                  <Flame className={`w-6 h-6 ${flame.icon}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900 tabular-nums leading-none">
                      {metrics.currentStreak}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      ngày liên tục
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 tabular-nums mt-1 truncate">
                    {flame.label} · Kỷ lục {metrics.longestStreak} ngày
                  </p>
                </div>
              </div>
            </div>

            {!metrics.isStreakActiveToday && metrics.currentStreak > 0 && (
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-800">
                Ôn ít nhất 1 thẻ hôm nay để giữ ngọn lửa chuỗi ngày!
              </div>
            )}

            {/* Daily Goal Bar + Quick Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  {metrics.todayReviewed >= metrics.dailyGoal ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Target className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  )}
                  <span>
                    Hôm nay: {metrics.todayReviewed}/{metrics.dailyGoal} thẻ
                  </span>
                </span>
                <span className="font-extrabold text-teal-800">
                  {metrics.goalProgressPercent}%
                </span>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    metrics.todayReviewed >= metrics.dailyGoal
                      ? 'bg-emerald-600'
                      : 'bg-teal-700'
                  }`}
                  style={{ width: `${metrics.goalProgressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-medium text-slate-500 shrink-0">
                  Mục tiêu ngày:
                </span>
                <div className="grid grid-cols-4 gap-1 flex-1 max-w-[205px]">
                  {GOAL_PRESETS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleSelectGoal(g)}
                      className={`py-1 text-[11px] font-bold rounded-lg border cursor-pointer tabular-nums transition-colors ${
                        metrics.dailyGoal === g
                          ? 'bg-teal-700 text-white border-teal-800'
                          : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 30-day Compact Activity Strip */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Lịch sử 30 ngày gần nhất</span>
                <span>Tổng {metrics.totalReviewed} lượt</span>
              </div>
              <div className="flex items-center justify-between gap-[3px]">
                {metrics.last30Days.map((day) => {
                  const intensityClass =
                    day.reviewed === 0
                      ? 'bg-slate-100 border-slate-200/70'
                      : day.metGoal
                      ? 'bg-emerald-500 border-emerald-600/30'
                      : day.reviewed >= Math.ceil(metrics.dailyGoal / 2)
                      ? 'bg-teal-500 border-teal-600/30'
                      : 'bg-teal-200 border-teal-300/60';
                  return (
                    <div
                      key={day.dateKey}
                      className={`flex-1 h-3.5 rounded-[3px] border ${intensityClass} ${
                        day.isToday ? 'ring-1 ring-orange-400 ring-offset-1' : ''
                      }`}
                      title={`${day.label}: ${day.reviewed} lượt ôn${
                        day.metGoal ? ' (Đạt mục tiêu)' : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPopoverOpen(false);
                  setIsLeaderboardOpen(true);
                }}
                className="flex-1 py-2 px-3 text-xs font-bold text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Trophy className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Mở BXH Streak</span>
              </button>

              {location.pathname !== '/decks' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    navigate('/decks');
                  }}
                  className="py-2 px-3 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Ôn tập</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <StreakLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        localCurrentStreak={metrics.currentStreak}
        localLongestStreak={metrics.longestStreak}
        localTodayReviewed={metrics.todayReviewed}
        localDailyGoal={metrics.dailyGoal}
        localTotalReviewed={metrics.totalReviewed}
      />
    </>
  );
};
