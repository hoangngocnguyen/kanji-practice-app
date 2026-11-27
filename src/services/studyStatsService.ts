import { SrsRating } from '../types/deck';
import { getSupabaseAccessToken } from '../utils/supabaseClient';

export interface DailyActivityRecord {
  reviewed: number;
  hard: number;
  good: number;
  easy: number;
}

export interface LocalStudyStats {
  dailyGoal: number;
  activityByDate: Record<string, DailyActivityRecord>;
  streakFreezes: number;
  freezeRechargeDays: number;
  frozenDates: string[];
  updatedAt: number;
}

export interface StreakDayCell {
  dateKey: string;
  label: string;
  reviewed: number;
  metGoal: boolean;
  isFrozen: boolean;
  isToday: boolean;
}

export interface ComputedStreakMetrics {
  dailyGoal: number;
  todayReviewed: number;
  currentStreak: number;
  longestStreak: number;
  totalReviewed: number;
  lastStudyDate: string | null;
  goalProgressPercent: number;
  isStreakActiveToday: boolean;
  streakFreezes: number;
  freezeRechargeDays: number;
  frozenDates: string[];
  last30Days: StreakDayCell[];
}

export interface StreakLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  currentStreak: number;
  longestStreak: number;
  todayCount: number;
  dailyGoal: number;
  totalReviewed: number;
  lastStudyDate: string | null;
  isActiveToday: boolean;
  isSelf: boolean;
}

export interface StreakLeaderboardResponse {
  tableReady: boolean;
  entries: StreakLeaderboardEntry[];
  viewerEntry: StreakLeaderboardEntry | null;
  viewerRank: number | null;
}

const STORAGE_STUDY_STATS_KEY = 'luyenkanji_study_stats_v1';
export const STUDY_STATS_UPDATED_EVENT = 'luyenkanji:study-stats-updated';

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt);
}

function normalizeFrozenDatesList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.trim())) {
      valid.add(item.trim());
    }
  }
  return Array.from(valid).sort().slice(-371);
}

export function loadLocalStudyStats(): LocalStudyStats {
  try {
    const raw = localStorage.getItem(STORAGE_STUDY_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawFreezes = Number(parsed?.streakFreezes);
      const rawRecharge = Number(parsed?.freezeRechargeDays);
      return {
        dailyGoal: Math.max(1, Math.min(500, Math.floor(Number(parsed?.dailyGoal) || 20))),
        activityByDate:
          parsed?.activityByDate && typeof parsed.activityByDate === 'object'
            ? parsed.activityByDate
            : {},
        streakFreezes: Number.isFinite(rawFreezes)
          ? Math.max(0, Math.min(2, Math.floor(rawFreezes)))
          : 1,
        freezeRechargeDays: Number.isFinite(rawRecharge)
          ? Math.max(0, Math.min(10, Math.floor(rawRecharge)))
          : 0,
        frozenDates: normalizeFrozenDatesList(parsed?.frozenDates),
        updatedAt: Number(parsed?.updatedAt) || Date.now(),
      };
    }
  } catch {}
  return {
    dailyGoal: 20,
    activityByDate: {},
    streakFreezes: 1,
    freezeRechargeDays: 0,
    frozenDates: [],
    updatedAt: Date.now(),
  };
}

export function saveLocalStudyStats(stats: LocalStudyStats): void {
  try {
    // Keep up to 371 most recent date entries locally (53 full weeks for Heatmap)
    const sortedKeys = Object.keys(stats.activityByDate).sort();
    const pruned: Record<string, DailyActivityRecord> = {};
    for (const k of sortedKeys.slice(-371)) {
      pruned[k] = stats.activityByDate[k];
    }
    const payload: LocalStudyStats = {
      dailyGoal: stats.dailyGoal,
      activityByDate: pruned,
      streakFreezes: Math.max(0, Math.min(2, Math.floor(stats.streakFreezes ?? 1))),
      freezeRechargeDays: Math.max(
        0,
        Math.min(10, Math.floor(stats.freezeRechargeDays ?? 0))
      ),
      frozenDates: normalizeFrozenDatesList(stats.frozenDates),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_STUDY_STATS_KEY, JSON.stringify(payload));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STUDY_STATS_UPDATED_EVENT, { detail: payload }));
    }
  } catch {}
}

export function computeStreakMetrics(stats: LocalStudyStats): ComputedStreakMetrics {
  const todayKey = getLocalDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  const todayRecord = stats.activityByDate[todayKey];
  const todayReviewed = Math.max(0, Number(todayRecord?.reviewed || 0));

  const allDatesSorted = Object.keys(stats.activityByDate)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && (stats.activityByDate[k]?.reviewed || 0) > 0)
    .sort();
  const activeSet = new Set(allDatesSorted);
  const frozenDates = normalizeFrozenDatesList(stats.frozenDates);
  const frozenSet = new Set(frozenDates);

  let totalReviewed = 0;
  for (const key of allDatesSorted) {
    totalReviewed += Math.max(0, Number(stats.activityByDate[key]?.reviewed || 0));
  }

  const lastStudyDate = allDatesSorted.length > 0 ? allDatesSorted[allDatesSorted.length - 1] : null;

  // Calculate current active streak bridging frozen dates seamlessly
  let currentStreak = 0;
  let cursorKey: string | null = null;
  if (todayReviewed > 0 || frozenSet.has(todayKey)) {
    cursorKey = todayKey;
  } else if (activeSet.has(yesterdayKey) || frozenSet.has(yesterdayKey)) {
    cursorKey = yesterdayKey;
  }

  let steps = 0;
  while (cursorKey && steps < 4000) {
    steps += 1;
    if (activeSet.has(cursorKey)) {
      currentStreak += 1;
      cursorKey = addDaysToDateKey(cursorKey, -1);
    } else if (frozenSet.has(cursorKey)) {
      cursorKey = addDaysToDateKey(cursorKey, -1);
    } else {
      break;
    }
  }

  // Calculate longest historical streak bridging frozen dates
  const relevantDates = Array.from(new Set([...allDatesSorted, ...frozenDates])).sort();
  let longestStreak = currentStreak;
  let run = 0;
  let prevKey: string | null = null;
  for (const key of relevantDates) {
    const isActive = activeSet.has(key);
    const isFrozen = frozenSet.has(key);
    if (!isActive && !isFrozen) continue;

    if (prevKey && addDaysToDateKey(prevKey, 1) === key) {
      if (isActive) run += 1;
    } else {
      run = isActive ? 1 : 0;
    }
    if (run > longestStreak) longestStreak = run;
    prevKey = key;
  }

  // Build 30-day activity grid (oldest -> newest)
  const last30Days: StreakDayCell[] = [];
  for (let offset = 29; offset >= 0; offset--) {
    const key = addDaysToDateKey(todayKey, -offset);
    const [, mm, dd] = key.split('-');
    const reviewed = Math.max(0, Number(stats.activityByDate[key]?.reviewed || 0));
    last30Days.push({
      dateKey: key,
      label: `${dd}/${mm}`,
      reviewed,
      metGoal: reviewed >= stats.dailyGoal,
      isFrozen: reviewed === 0 && frozenSet.has(key),
      isToday: offset === 0,
    });
  }

  const goalProgressPercent = Math.min(
    100,
    Math.round((todayReviewed / Math.max(1, stats.dailyGoal)) * 100)
  );

  return {
    dailyGoal: stats.dailyGoal,
    todayReviewed,
    currentStreak,
    longestStreak,
    totalReviewed,
    lastStudyDate,
    goalProgressPercent,
    isStreakActiveToday: todayReviewed > 0,
    streakFreezes: Math.max(0, Math.min(2, Math.floor(stats.streakFreezes ?? 1))),
    freezeRechargeDays: Math.max(0, Math.min(10, Math.floor(stats.freezeRechargeDays ?? 0))),
    frozenDates,
    last30Days,
  };
}

let cloudPushTimer: number | null = null;

export function scheduleCloudStreakPush(): void {
  if (typeof window === 'undefined') return;
  if (cloudPushTimer) window.clearTimeout(cloudPushTimer);
  cloudPushTimer = window.setTimeout(() => {
    cloudPushTimer = null;
    void pushStudyStatsToCloud();
  }, 1500);
}

export function recordStudyReview(rating: SrsRating): LocalStudyStats {
  const stats = loadLocalStudyStats();
  const todayKey = getLocalDateKey();
  const prev = stats.activityByDate[todayKey] || {
    reviewed: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };

  const nextStats: LocalStudyStats = {
    ...stats,
    activityByDate: {
      ...stats.activityByDate,
      [todayKey]: {
        reviewed: prev.reviewed + 1,
        hard: prev.hard + (rating === 'hard' ? 1 : 0),
        good: prev.good + (rating === 'good' ? 1 : 0),
        easy: prev.easy + (rating === 'easy' ? 1 : 0),
      },
    },
    updatedAt: Date.now(),
  };

  saveLocalStudyStats(nextStats);
  scheduleCloudStreakPush();
  return nextStats;
}

export function setDailyStudyGoal(goal: number): LocalStudyStats {
  const stats = loadLocalStudyStats();
  const nextGoal = Math.max(1, Math.min(500, Math.floor(Number(goal) || 20)));
  const nextStats: LocalStudyStats = {
    ...stats,
    dailyGoal: nextGoal,
    updatedAt: Date.now(),
  };
  saveLocalStudyStats(nextStats);
  scheduleCloudStreakPush();
  return nextStats;
}

export async function pushStudyStatsToCloud(): Promise<boolean> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) return false;

    const stats = loadLocalStudyStats();
    const metrics = computeStreakMetrics(stats);

    const res = await fetch('/api/community', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'upsert_study_streak',
        currentStreak: metrics.currentStreak,
        longestStreak: metrics.longestStreak,
        todayCount: metrics.todayReviewed,
        dailyGoal: metrics.dailyGoal,
        totalReviewed: metrics.totalReviewed,
        lastStudyDate: metrics.lastStudyDate,
        activityByDate: stats.activityByDate,
      }),
    });

    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (data?.saved) {
      const serverFreezes = Number(data.saved.streak_freezes);
      const serverRecharge = Number(data.saved.freeze_recharge_days);
      const serverFrozen = normalizeFrozenDatesList(data.saved.frozen_dates);
      const changed =
        (Number.isFinite(serverFreezes) && serverFreezes !== stats.streakFreezes) ||
        (Number.isFinite(serverRecharge) && serverRecharge !== stats.freezeRechargeDays) ||
        JSON.stringify(serverFrozen) !== JSON.stringify(stats.frozenDates);

      if (changed) {
        saveLocalStudyStats({
          ...stats,
          streakFreezes: Number.isFinite(serverFreezes) ? serverFreezes : stats.streakFreezes,
          freezeRechargeDays: Number.isFinite(serverRecharge)
            ? serverRecharge
            : stats.freezeRechargeDays,
          frozenDates: serverFrozen,
        });
      }
    }
    return Boolean(data?.tableReady);
  } catch {
    return false;
  }
}

export async function syncStudyStatsFromCloud(): Promise<LocalStudyStats> {
  const local = loadLocalStudyStats();
  try {
    const token = await getSupabaseAccessToken();
    if (!token) return local;

    const res = await fetch('/api/community?action=my_study_streak', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return local;
    const data = await res.json().catch(() => null);
    if (!data?.tableReady) return local;

    const cloudRow = data?.streak;
    if (!cloudRow) {
      // Push local data up to initialize cloud leaderboard entry
      if (Object.keys(local.activityByDate).length > 0) {
        void pushStudyStatsToCloud();
      }
      return local;
    }

    const cloudActivity: Record<string, DailyActivityRecord> =
      cloudRow.activity_by_date && typeof cloudRow.activity_by_date === 'object'
        ? cloudRow.activity_by_date
        : {};

    const mergedActivity: Record<string, DailyActivityRecord> = { ...local.activityByDate };
    for (const [dateKey, cRec] of Object.entries(cloudActivity)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !cRec) continue;
      const lRec = mergedActivity[dateKey];
      if (!lRec) {
        mergedActivity[dateKey] = {
          reviewed: Number(cRec.reviewed || 0),
          hard: Number(cRec.hard || 0),
          good: Number(cRec.good || 0),
          easy: Number(cRec.easy || 0),
        };
      } else {
        mergedActivity[dateKey] = {
          reviewed: Math.max(Number(lRec.reviewed || 0), Number(cRec.reviewed || 0)),
          hard: Math.max(Number(lRec.hard || 0), Number(cRec.hard || 0)),
          good: Math.max(Number(lRec.good || 0), Number(cRec.good || 0)),
          easy: Math.max(Number(lRec.easy || 0), Number(cRec.easy || 0)),
        };
      }
    }

    const cloudFreezes = Number(cloudRow.streak_freezes);
    const cloudRecharge = Number(cloudRow.freeze_recharge_days);
    const cloudFrozen = normalizeFrozenDatesList(cloudRow.frozen_dates);

    const mergedStats: LocalStudyStats = {
      dailyGoal: local.dailyGoal || Number(cloudRow.daily_goal || 20),
      activityByDate: mergedActivity,
      streakFreezes: Number.isFinite(cloudFreezes)
        ? Math.max(0, Math.min(2, cloudFreezes))
        : local.streakFreezes,
      freezeRechargeDays: Number.isFinite(cloudRecharge)
        ? Math.max(0, Math.min(10, cloudRecharge))
        : local.freezeRechargeDays,
      frozenDates: cloudFrozen.length > 0 ? cloudFrozen : local.frozenDates,
      updatedAt: Date.now(),
    };
    saveLocalStudyStats(mergedStats);
    void pushStudyStatsToCloud();
    return mergedStats;
  } catch {
    return local;
  }
}

export async function apiGetStreakLeaderboard(
  limit = 30
): Promise<StreakLeaderboardResponse> {
  const token = await getSupabaseAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `/api/community?action=streak_leaderboard&limit=${encodeURIComponent(String(limit))}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers,
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể tải bảng xếp hạng Streak.');
  }
  return {
    tableReady: Boolean(data?.tableReady),
    entries: Array.isArray(data?.entries) ? data.entries : [],
    viewerEntry: data?.viewerEntry || null,
    viewerRank: typeof data?.viewerRank === 'number' ? data.viewerRank : null,
  };
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
