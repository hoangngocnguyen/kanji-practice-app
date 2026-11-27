import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureUserProfile,
  optionalAuth,
  requireAuth,
  setCorsHeaders,
} from './_lib/auth.js';
import {
  createNotificationAndPush,
  isMissingTableError,
} from './_lib/notifications.js';

const MAX_FRIEND_STREAK_SLOTS = 6;
const MAX_PENDING_OUTGOING_INVITES = 10;
const MAX_FREEZE_SLOTS = 2;
const FREEZE_RECHARGE_DAYS_REQUIRED = 10;

function getVnDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getVnHour(date: Date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  const parsed = Number(hourStr);
  return Number.isFinite(parsed) ? parsed % 24 : 12;
}

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function normalizeFrozenDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.trim())) {
      valid.add(item.trim());
    }
  }
  return Array.from(valid).sort().slice(-371);
}

type ActivityMap = Record<
  string,
  { reviewed: number; hard: number; good: number; easy: number }
>;

function sanitizeActivityMap(raw: unknown): ActivityMap {
  const clean: ActivityMap = {};
  if (!raw || typeof raw !== 'object') return clean;
  const clamp = (v: unknown) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(10000, n)) : 0;
  };
  const keys = Object.keys(raw as Record<string, any>)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort()
    .slice(-371);
  for (const key of keys) {
    const entry = (raw as Record<string, any>)[key];
    if (entry && typeof entry === 'object') {
      clean[key] = {
        reviewed: clamp(entry.reviewed),
        hard: clamp(entry.hard),
        good: clamp(entry.good),
        easy: clamp(entry.easy),
      };
    }
  }
  return clean;
}

function mergeActivityMaps(a: ActivityMap, b: ActivityMap): ActivityMap {
  const merged: ActivityMap = { ...a };
  for (const [k, rec] of Object.entries(b)) {
    const existing = merged[k];
    if (!existing) {
      merged[k] = { ...rec };
    } else {
      merged[k] = {
        reviewed: Math.max(existing.reviewed, rec.reviewed),
        hard: Math.max(existing.hard, rec.hard),
        good: Math.max(existing.good, rec.good),
        easy: Math.max(existing.easy, rec.easy),
      };
    }
  }
  const trimmed: ActivityMap = {};
  for (const key of Object.keys(merged).sort().slice(-371)) {
    trimmed[key] = merged[key];
  }
  return trimmed;
}

function computeFreezeAwareMetrics(params: {
  activityByDate: ActivityMap;
  frozenDates: string[];
  todayVn: string;
}) {
  const { activityByDate, frozenDates, todayVn } = params;
  const yesterdayVn = addDaysToDateKey(todayVn, -1);

  const activeDates = Object.keys(activityByDate)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && (activityByDate[k]?.reviewed || 0) > 0)
    .sort();
  const activeSet = new Set(activeDates);
  const frozenSet = new Set(frozenDates);

  let totalReviewed = 0;
  for (const key of activeDates) {
    totalReviewed += Math.max(0, Number(activityByDate[key]?.reviewed || 0));
  }

  const lastStudyDate = activeDates.length > 0 ? activeDates[activeDates.length - 1] : null;
  const todayCount = Math.max(0, Number(activityByDate[todayVn]?.reviewed || 0));

  let currentStreak = 0;
  let cursorKey: string | null = null;
  if (activeSet.has(todayVn) || frozenSet.has(todayVn)) {
    cursorKey = todayVn;
  } else if (activeSet.has(yesterdayVn) || frozenSet.has(yesterdayVn)) {
    cursorKey = yesterdayVn;
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

  // Longest streak bridging frozen dates
  const allRelevantDates = Array.from(new Set([...activeDates, ...frozenDates])).sort();
  let longestStreak = currentStreak;
  let run = 0;
  let prevKey: string | null = null;
  for (const key of allRelevantDates) {
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

  return {
    currentStreak,
    longestStreak,
    todayCount,
    totalReviewed,
    lastStudyDate,
    isActiveToday: activeSet.has(todayVn),
  };
}

async function fetchStreakRowSafe(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<{ row: any | null; tableReady: boolean; freezeReady: boolean }> {
  const extended = await supabaseAdmin
    .from('user_study_streaks')
    .select(
      'user_id, current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, activity_by_date, streak_freezes, freeze_recharge_days, frozen_dates, last_freeze_at, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!extended.error) {
    return { row: extended.data || null, tableReady: true, freezeReady: true };
  }

  const code = String((extended.error as any)?.code || '');
  const msg = String(extended.error.message || '').toLowerCase();
  if (code === '42703' || msg.includes('streak_freezes') || msg.includes('frozen_dates')) {
    const basic = await supabaseAdmin
      .from('user_study_streaks')
      .select(
        'user_id, current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, activity_by_date, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (!basic.error) {
      return { row: basic.data || null, tableReady: true, freezeReady: false };
    }
    if (isMissingTableError(basic.error)) {
      return { row: null, tableReady: false, freezeReady: false };
    }
    throw basic.error;
  }

  if (isMissingTableError(extended.error)) {
    return { row: null, tableReady: false, freezeReady: false };
  }
  throw extended.error;
}

async function reconcileAutoFreezeForUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  row: any | null,
  freezeReady: boolean,
  todayVn: string,
  notify = true
): Promise<any | null> {
  if (!row || !freezeReady) return row;

  const yesterdayVn = addDaysToDateKey(todayVn, -1);
  const twoDaysAgoVn = addDaysToDateKey(todayVn, -2);
  const activity = sanitizeActivityMap(row.activity_by_date);
  const frozenDates = normalizeFrozenDates(row.frozen_dates);
  const frozenSet = new Set(frozenDates);

  const streakFreezes = Math.max(
    0,
    Math.min(MAX_FREEZE_SLOTS, Number(row.streak_freezes ?? 1))
  );

  const yesterdayReviewed = Math.max(0, Number(activity[yesterdayVn]?.reviewed || 0));
  const missedYesterday =
    yesterdayReviewed === 0 &&
    row.last_study_date !== yesterdayVn &&
    !frozenSet.has(yesterdayVn);

  const hadStreakBeforeYesterday =
    (activity[twoDaysAgoVn]?.reviewed || 0) > 0 ||
    frozenSet.has(twoDaysAgoVn) ||
    (row.last_study_date === twoDaysAgoVn && Number(row.current_streak || 0) > 0);

  if (missedYesterday && hadStreakBeforeYesterday && streakFreezes >= 1) {
    const nextFreezes = streakFreezes - 1;
    const nextFrozenDates = normalizeFrozenDates([...frozenDates, yesterdayVn]);
    const metrics = computeFreezeAwareMetrics({
      activityByDate: activity,
      frozenDates: nextFrozenDates,
      todayVn,
    });
    const nextCurrentStreak = Math.max(metrics.currentStreak, Number(row.current_streak || 0));
    const nextLongestStreak = Math.max(
      nextCurrentStreak,
      metrics.longestStreak,
      Number(row.longest_streak || 0)
    );
    const nowIso = new Date().toISOString();

    const { data: updatedRow } = await supabaseAdmin
      .from('user_study_streaks')
      .update({
        streak_freezes: nextFreezes,
        frozen_dates: nextFrozenDates,
        last_freeze_at: nowIso,
        current_streak: nextCurrentStreak,
        longest_streak: nextLongestStreak,
      })
      .eq('user_id', userId)
      .select(
        'user_id, current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, activity_by_date, streak_freezes, freeze_recharge_days, frozen_dates, last_freeze_at, updated_at'
      )
      .maybeSingle();

    if (notify) {
      await createNotificationAndPush(supabaseAdmin, {
        userId,
        type: 'freeze_auto_used',
        title: 'Băng Streak đã tự động bảo vệ chuỗi ngày của bạn!',
        body: `Hệ thống đã dùng 1 Băng Streak cho ngày hôm qua để giữ chuỗi ${nextCurrentStreak} ngày. Bạn còn ${nextFreezes}/${MAX_FREEZE_SLOTS} Băng.`,
        actionUrl: '/leaderboard?tab=friends',
        metadata: { date: yesterdayVn, remainingFreezes: nextFreezes },
        sendPush: true,
        tag: `freeze-used-${yesterdayVn}`,
      });
    }

    return updatedRow || {
      ...row,
      streak_freezes: nextFreezes,
      frozen_dates: nextFrozenDates,
      last_freeze_at: nowIso,
      current_streak: nextCurrentStreak,
      longest_streak: nextLongestStreak,
    };
  }

  return row;
}

async function advanceFriendStreaksForUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  todayVn: string
): Promise<void> {
  try {
    const yesterdayVn = addDaysToDateKey(todayVn, -1);
    const { data: pairs, error } = await supabaseAdmin
      .from('friend_streaks')
      .select('*')
      .eq('status', 'active')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`);

    if (error || !pairs || pairs.length === 0) return;

    const partnerIds = pairs.map((p: any) =>
      p.user_low === userId ? p.user_high : p.user_low
    );
    const uniquePartnerIds = Array.from(new Set(partnerIds));

    const [{ data: streakRows }, usersMap] = await Promise.all([
      supabaseAdmin
        .from('user_study_streaks')
        .select(
          'user_id, current_streak, longest_streak, today_count, last_study_date, activity_by_date, streak_freezes, frozen_dates'
        )
        .in('user_id', [userId, ...uniquePartnerIds]),
      fetchPublicUsersMap(supabaseAdmin, [userId, ...uniquePartnerIds]),
    ]);

    const streakMap = new Map<string, any>();
    for (const r of streakRows || []) {
      streakMap.set(r.user_id, r);
    }

    const myRow = streakMap.get(userId);
    const myAct = sanitizeActivityMap(myRow?.activity_by_date);
    const myFrozen = new Set(normalizeFrozenDates(myRow?.frozen_dates));
    const mySatisfiedToday =
      myRow?.last_study_date === todayVn ||
      (myAct[todayVn]?.reviewed || 0) > 0 ||
      myFrozen.has(todayVn);
    if (!mySatisfiedToday) return;

    const mySatisfiedYesterday =
      myRow?.last_study_date === yesterdayVn ||
      (myAct[yesterdayVn]?.reviewed || 0) > 0 ||
      myFrozen.has(yesterdayVn);

    for (const pair of pairs) {
      if (pair.last_pair_date === todayVn) continue;

      const partnerId = pair.user_low === userId ? pair.user_high : pair.user_low;
      let partnerRow = streakMap.get(partnerId) || null;
      if (partnerRow) {
        partnerRow = await reconcileAutoFreezeForUser(
          supabaseAdmin,
          partnerId,
          partnerRow,
          true,
          todayVn,
          true
        );
      }
      if (!partnerRow) continue;

      const pAct = sanitizeActivityMap(partnerRow.activity_by_date);
      const pFrozen = new Set(normalizeFrozenDates(partnerRow.frozen_dates));
      const partnerSatisfiedToday =
        partnerRow.last_study_date === todayVn ||
        (pAct[todayVn]?.reviewed || 0) > 0 ||
        pFrozen.has(todayVn);

      if (!partnerSatisfiedToday) continue;

      const pairFrozen = new Set(normalizeFrozenDates(pair.frozen_dates));
      const partnerSatisfiedYesterday =
        partnerRow.last_study_date === yesterdayVn ||
        (pAct[yesterdayVn]?.reviewed || 0) > 0 ||
        pFrozen.has(yesterdayVn);

      const continuedFromYesterday =
        pair.last_pair_date === yesterdayVn ||
        pairFrozen.has(yesterdayVn) ||
        (Number(pair.pair_streak || 0) > 0 && mySatisfiedYesterday && partnerSatisfiedYesterday);

      const nextPairStreak = continuedFromYesterday
        ? Math.max(1, Number(pair.pair_streak || 0) + 1)
        : 1;
      const nextLongest = Math.max(
        nextPairStreak,
        Number(pair.longest_pair_streak || 0)
      );

      await supabaseAdmin
        .from('friend_streaks')
        .update({
          pair_streak: nextPairStreak,
          longest_pair_streak: nextLongest,
          last_pair_date: todayVn,
        })
        .eq('id', pair.id);

      const milestones = new Set([7, 14, 30, 60, 100]);
      if (milestones.has(nextPairStreak)) {
        const myName = usersMap.get(userId)?.displayName || 'Bạn học';
        const partnerName = usersMap.get(partnerId)?.displayName || 'Bạn học';
        await Promise.all([
          createNotificationAndPush(supabaseAdmin, {
            userId,
            actorId: partnerId,
            type: 'friend_streak_milestone',
            title: `Cột mốc ${nextPairStreak} ngày Streak cùng ${partnerName}!`,
            body: 'Cả hai bạn đã giữ vững ngọn lửa học Kanji liên tục cùng nhau.',
            actionUrl: '/leaderboard?tab=friends',
            metadata: { pairId: pair.id, streak: nextPairStreak },
            sendPush: true,
          }),
          createNotificationAndPush(supabaseAdmin, {
            userId: partnerId,
            actorId: userId,
            type: 'friend_streak_milestone',
            title: `Cột mốc ${nextPairStreak} ngày Streak cùng ${myName}!`,
            body: 'Cả hai bạn đã giữ vững ngọn lửa học Kanji liên tục cùng nhau.',
            actionUrl: '/leaderboard?tab=friends',
            metadata: { pairId: pair.id, streak: nextPairStreak },
            sendPush: true,
          }),
        ]);
      }
    }
  } catch {
    // Non-blocking if friend_streaks tables haven't been migrated yet
  }
}

interface PublicUserLite {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt?: string;
}

async function fetchPublicUsersMap(
  supabaseAdmin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, PublicUserLite>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, PublicUserLite>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url, created_at')
    .in('id', uniqueIds);

  for (const row of data || []) {
    map.set(row.id, {
      id: row.id,
      displayName: (row.display_name || '').trim() || 'Thành viên',
      avatarUrl: row.avatar_url || null,
      createdAt: row.created_at,
    });
  }
  return map;
}

async function getDeckLikesList(
  supabaseAdmin: SupabaseClient,
  slug: string
): Promise<Array<{ id: string; displayName: string; avatarUrl: string | null; likedAt: string }>> {
  const { data: likeRows, error } = await supabaseAdmin
    .from('shared_deck_likes')
    .select('user_id, created_at')
    .eq('deck_slug', slug)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !likeRows) return [];

  const usersMap = await fetchPublicUsersMap(
    supabaseAdmin,
    likeRows.map((r: any) => r.user_id)
  );

  return likeRows.map((r: any) => {
    const profile = usersMap.get(r.user_id);
    return {
      id: r.user_id,
      displayName: profile?.displayName || 'Thành viên',
      avatarUrl: profile?.avatarUrl || null,
      likedAt: r.created_at,
    };
  });
}

export default async function handler(
  req: VercelRequest | any,
  res: VercelResponse | any
) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = String(
    req.method === 'GET' ? req.query?.action || '' : req.body?.action || ''
  ).trim();

  if (!action) {
    return res.status(400).json({ error: 'Thiếu tham số action.' });
  }

  try {
    // 1. Public & Auth-optional GET actions
    if (req.method === 'GET' && action === 'deck_meta') {
      const slug = String(req.query?.slug || '').trim();
      if (!slug) {
        return res.status(400).json({ error: 'Thiếu slug bộ thẻ chia sẻ.' });
      }

      const ctx = await optionalAuth(req, res);
      if (!ctx) return;
      const { user, supabaseAdmin } = ctx;

      const { data: deckRow, error: deckErr } = await supabaseAdmin
        .from('public_shared_decks')
        .select('slug, owner_id, author_name, likes_count, downloads_count, updated_at')
        .eq('slug', slug)
        .maybeSingle();

      if (deckErr) throw deckErr;
      if (!deckRow) {
        return res.status(404).json({ error: 'Không tìm thấy bộ bài chia sẻ.' });
      }

      const [
        likedBy,
        authorMap,
        { count: followersCount },
        viewerLikeRow,
        viewerFollowRow,
      ] = await Promise.all([
        getDeckLikesList(supabaseAdmin, slug),
        fetchPublicUsersMap(supabaseAdmin, [deckRow.owner_id]),
        supabaseAdmin
          .from('user_follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', deckRow.owner_id),
        user
          ? supabaseAdmin
              .from('shared_deck_likes')
              .select('user_id')
              .eq('deck_slug', slug)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        user && user.id !== deckRow.owner_id
          ? supabaseAdmin
              .from('user_follows')
              .select('follower_id')
              .eq('follower_id', user.id)
              .eq('following_id', deckRow.owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const authorProfile = authorMap.get(deckRow.owner_id);
      const likesCount = Math.max(Number(deckRow.likes_count || 0), likedBy.length);

      return res.status(200).json({
        slug: deckRow.slug,
        likesCount,
        downloadsCount: Number(deckRow.downloads_count || 0),
        viewerLiked: Boolean((viewerLikeRow as any)?.data),
        likedBy,
        author: {
          id: deckRow.owner_id,
          displayName: authorProfile?.displayName || deckRow.author_name || 'Thành viên',
          avatarUrl: authorProfile?.avatarUrl || null,
          followersCount: followersCount || 0,
          isFollowing: Boolean((viewerFollowRow as any)?.data),
        },
      });
    }

    if (req.method === 'GET' && action === 'public_profile') {
      const targetUserId = String(req.query?.userId || '').trim();
      if (!targetUserId) {
        return res.status(400).json({ error: 'Thiếu userId hồ sơ công khai.' });
      }

      const ctx = await optionalAuth(req, res);
      if (!ctx) return;
      const { user, supabaseAdmin } = ctx;

      let { data: targetProfile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email, display_name, avatar_url, created_at')
        .eq('id', targetUserId)
        .maybeSingle();

      if (profErr) throw profErr;

      // Lazily heal legacy Google profiles (missing avatar or stuck on email prefix) on view
      const targetEmailPrefix = targetProfile?.email
        ? String(targetProfile.email).split('@')[0].trim().toLowerCase()
        : '';
      const targetNameLower = (targetProfile?.display_name || '').trim().toLowerCase();
      const needsHeal =
        !targetProfile ||
        !targetProfile.avatar_url ||
        !targetNameLower ||
        (Boolean(targetEmailPrefix) && targetNameLower === targetEmailPrefix);

      if (needsHeal) {
        try {
          const { data: authData } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
          if (authData?.user) {
            const healed = await ensureUserProfile(supabaseAdmin, authData.user);
            targetProfile = {
              id: healed.id,
              email: healed.email,
              display_name: healed.display_name,
              avatar_url: healed.avatar_url,
              created_at: healed.created_at,
            };
          }
        } catch {
          // Keep existing profile if auth lookup fails
        }
      }

      if (!targetProfile) {
        return res.status(404).json({ error: 'Không tìm thấy hồ sơ người dùng này.' });
      }

      const [
        { data: sharedRows },
        { data: followerRows },
        { data: followingRows },
        viewerFollowRow,
      ] = await Promise.all([
        supabaseAdmin
          .from('public_shared_decks')
          .select('slug, title, description, kanji_count, likes_count, downloads_count, updated_at')
          .eq('owner_id', targetUserId)
          .order('updated_at', { ascending: false }),
        supabaseAdmin
          .from('user_follows')
          .select('follower_id, created_at')
          .eq('following_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabaseAdmin
          .from('user_follows')
          .select('following_id, created_at')
          .eq('follower_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(200),
        user && user.id !== targetUserId
          ? supabaseAdmin
              .from('user_follows')
              .select('follower_id')
              .eq('follower_id', user.id)
              .eq('following_id', targetUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const relatedIds = [
        ...(followerRows || []).map((r: any) => r.follower_id),
        ...(followingRows || []).map((r: any) => r.following_id),
      ];
      const usersMap = await fetchPublicUsersMap(supabaseAdmin, relatedIds);

      return res.status(200).json({
        profile: {
          id: targetProfile.id,
          displayName: (targetProfile.display_name || '').trim() || 'Thành viên',
          avatarUrl: targetProfile.avatar_url || null,
          createdAt: targetProfile.created_at,
        },
        followersCount: (followerRows || []).length,
        followingCount: (followingRows || []).length,
        viewerIsFollowing: Boolean((viewerFollowRow as any)?.data),
        isSelf: Boolean(user && user.id === targetUserId),
        followers: (followerRows || []).map((r: any) => {
          const u = usersMap.get(r.follower_id);
          return {
            id: r.follower_id,
            displayName: u?.displayName || 'Thành viên',
            avatarUrl: u?.avatarUrl || null,
            followedAt: r.created_at,
          };
        }),
        following: (followingRows || []).map((r: any) => {
          const u = usersMap.get(r.following_id);
          return {
            id: r.following_id,
            displayName: u?.displayName || 'Thành viên',
            avatarUrl: u?.avatarUrl || null,
            followedAt: r.created_at,
          };
        }),
        sharedDecks: (sharedRows || []).map((d: any) => ({
          slug: d.slug,
          title: d.title,
          description: d.description || '',
          kanjiCount: Number(d.kanji_count || 0),
          likesCount: Number(d.likes_count || 0),
          downloadsCount: Number(d.downloads_count || 0),
          updatedAt: d.updated_at,
        })),
      });
    }

    // 2. Guest-allowed POST: Record a download when saving shared deck
    if (req.method === 'POST' && action === 'record_download') {
      const slug = String(req.body?.slug || '').trim();
      if (!slug) {
        return res.status(400).json({ error: 'Thiếu slug bộ thẻ chia sẻ.' });
      }

      const ctx = await optionalAuth(req, res);
      if (!ctx) return;
      const { supabaseAdmin } = ctx;

      const { data: rpcCount, error: rpcErr } = await supabaseAdmin.rpc(
        'increment_shared_deck_downloads',
        { deck_slug: slug }
      );

      if (!rpcErr && typeof rpcCount === 'number') {
        return res.status(200).json({ downloadsCount: rpcCount });
      }

      // Fallback if RPC isn't installed yet
      const { data: existing, error: selErr } = await supabaseAdmin
        .from('public_shared_decks')
        .select('downloads_count')
        .eq('slug', slug)
        .maybeSingle();

      if (selErr) throw selErr;
      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy bộ bài chia sẻ.' });
      }

      const nextCount = Number(existing.downloads_count || 0) + 1;
      const { error: updErr } = await supabaseAdmin
        .from('public_shared_decks')
        .update({ downloads_count: nextCount })
        .eq('slug', slug);

      if (updErr) throw updErr;

      return res.status(200).json({ downloadsCount: nextCount });
    }

    // 3. Authenticated actions
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user, supabaseAdmin } = auth;

    if (req.method === 'POST' && action === 'toggle_like') {
      const slug = String(req.body?.slug || '').trim();
      if (!slug) {
        return res.status(400).json({ error: 'Thiếu slug bộ thẻ chia sẻ.' });
      }
      const hasDesiredState = typeof req.body?.desiredState === 'boolean';
      const desiredState = hasDesiredState ? Boolean(req.body.desiredState) : undefined;

      let liked = false;
      if (hasDesiredState) {
        if (desiredState) {
          const [{ error: insErr }] = await Promise.all([
            supabaseAdmin
              .from('shared_deck_likes')
              .upsert(
                { deck_slug: slug, user_id: user.id },
                { onConflict: 'deck_slug,user_id', ignoreDuplicates: true }
              ),
            ensureUserProfile(supabaseAdmin, user).catch(() => null),
          ]);
          if (insErr) throw insErr;
          liked = true;
        } else {
          const { error: delErr } = await supabaseAdmin
            .from('shared_deck_likes')
            .delete()
            .eq('deck_slug', slug)
            .eq('user_id', user.id);
          if (delErr) throw delErr;
          liked = false;
        }
      } else {
        const [{ data: existingLike }] = await Promise.all([
          supabaseAdmin
            .from('shared_deck_likes')
            .select('user_id')
            .eq('deck_slug', slug)
            .eq('user_id', user.id)
            .maybeSingle(),
          ensureUserProfile(supabaseAdmin, user).catch(() => null),
        ]);

        if (existingLike) {
          const { error: delErr } = await supabaseAdmin
            .from('shared_deck_likes')
            .delete()
            .eq('deck_slug', slug)
            .eq('user_id', user.id);
          if (delErr) throw delErr;
          liked = false;
        } else {
          const { error: insErr } = await supabaseAdmin
            .from('shared_deck_likes')
            .insert({ deck_slug: slug, user_id: user.id });
          if (insErr) throw insErr;
          liked = true;
        }
      }

      const [likedBy, { count: exactCount }] = await Promise.all([
        getDeckLikesList(supabaseAdmin, slug),
        supabaseAdmin
          .from('shared_deck_likes')
          .select('user_id', { count: 'exact', head: true })
          .eq('deck_slug', slug),
      ]);

      const likesCount = exactCount ?? likedBy.length;
      await supabaseAdmin
        .from('public_shared_decks')
        .update({ likes_count: likesCount })
        .eq('slug', slug);

      if (liked) {
        const { data: deckOwnerRow } = await supabaseAdmin
          .from('public_shared_decks')
          .select('owner_id, title')
          .eq('slug', slug)
          .maybeSingle();

        if (deckOwnerRow?.owner_id && deckOwnerRow.owner_id !== user.id) {
          const actorsMap = await fetchPublicUsersMap(supabaseAdmin, [user.id]);
          const actorName = actorsMap.get(user.id)?.displayName || 'Một thành viên';
          const deckTitle = deckOwnerRow.title || 'bộ thẻ chia sẻ';
          await createNotificationAndPush(supabaseAdmin, {
            userId: deckOwnerRow.owner_id,
            actorId: user.id,
            type: 'deck_liked',
            title: `${actorName} đã thả tim bộ thẻ của bạn`,
            body: `Bộ thẻ "${deckTitle}" vừa nhận được một lượt thích mới.`,
            actionUrl: `/share/${slug}`,
            metadata: { slug, title: deckTitle },
            sendPush: false,
          });
        }
      }

      return res.status(200).json({
        liked,
        likesCount,
        likedBy,
      });
    }

    await ensureUserProfile(supabaseAdmin, user);

    if (req.method === 'GET' && action === 'my_shares') {
      const { data: rows, error } = await supabaseAdmin
        .from('public_shared_decks')
        .select('slug, title, description, kanji_count, likes_count, downloads_count, bundle, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const slugs = (rows || []).map((r: any) => r.slug);
      let likesBySlug = new Map<
        string,
        Array<{ id: string; displayName: string; avatarUrl: string | null; likedAt: string }>
      >();

      if (slugs.length > 0) {
        const { data: allLikes } = await supabaseAdmin
          .from('shared_deck_likes')
          .select('deck_slug, user_id, created_at')
          .in('deck_slug', slugs)
          .order('created_at', { ascending: false });

        const likerMap = await fetchPublicUsersMap(
          supabaseAdmin,
          (allLikes || []).map((l: any) => l.user_id)
        );

        for (const l of allLikes || []) {
          const list = likesBySlug.get(l.deck_slug) || [];
          const prof = likerMap.get(l.user_id);
          list.push({
            id: l.user_id,
            displayName: prof?.displayName || 'Thành viên',
            avatarUrl: prof?.avatarUrl || null,
            likedAt: l.created_at,
          });
          likesBySlug.set(l.deck_slug, list);
        }
      }

      const shares = (rows || []).map((r: any) => {
        const likedBy = likesBySlug.get(r.slug) || [];
        const bundleItems = Array.isArray(r.bundle?.items) ? r.bundle.items : [];
        const compoundCount = bundleItems.reduce(
          (sum: number, it: any) => sum + (Array.isArray(it.compoundWords) ? it.compoundWords.length : 0),
          0
        );
        return {
          slug: r.slug,
          rootFolderId: r.bundle?.rootFolderId || null,
          title: r.title,
          description: r.description || '',
          kanjiCount: Number(r.kanji_count || bundleItems.length || 0),
          cardCount: bundleItems.length + compoundCount,
          likesCount: Math.max(Number(r.likes_count || 0), likedBy.length),
          downloadsCount: Number(r.downloads_count || 0),
          likedBy,
          updatedAt: r.updated_at,
        };
      });

      return res.status(200).json({ shares });
    }

    if (req.method === 'POST' && action === 'unpublish_share') {
      const slug = String(req.body?.slug || '').trim();
      if (!slug) {
        return res.status(400).json({ error: 'Thiếu slug bộ thẻ chia sẻ.' });
      }

      const { error } = await supabaseAdmin
        .from('public_shared_decks')
        .delete()
        .eq('slug', slug)
        .eq('owner_id', user.id);

      if (error) throw error;
      return res.status(200).json({ ok: true, slug });
    }

    if (req.method === 'POST' && action === 'toggle_follow') {
      const targetUserId = String(req.body?.targetUserId || '').trim();
      if (!targetUserId) {
        return res.status(400).json({ error: 'Thiếu ID người dùng cần theo dõi.' });
      }
      if (targetUserId === user.id) {
        return res.status(400).json({ error: 'Bạn không thể tự theo dõi chính mình.' });
      }
      const hasDesiredState = typeof req.body?.desiredState === 'boolean';
      const desiredState = hasDesiredState ? Boolean(req.body.desiredState) : undefined;

      let isFollowing = false;
      if (hasDesiredState) {
        if (desiredState) {
          const { error: insErr } = await supabaseAdmin
            .from('user_follows')
            .upsert(
              { follower_id: user.id, following_id: targetUserId },
              { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
            );
          if (insErr) throw insErr;
          isFollowing = true;
        } else {
          const { error: delErr } = await supabaseAdmin
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId);
          if (delErr) throw delErr;
          isFollowing = false;
        }
      } else {
        const { data: existingFollow } = await supabaseAdmin
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        if (existingFollow) {
          const { error: delErr } = await supabaseAdmin
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId);
          if (delErr) throw delErr;
          isFollowing = false;
        } else {
          const { error: insErr } = await supabaseAdmin
            .from('user_follows')
            .insert({ follower_id: user.id, following_id: targetUserId });
          if (insErr) throw insErr;
          isFollowing = true;
        }
      }

      const { count: followersCount } = await supabaseAdmin
        .from('user_follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      if (isFollowing) {
        const actorsMap = await fetchPublicUsersMap(supabaseAdmin, [user.id]);
        const actorName = actorsMap.get(user.id)?.displayName || 'Một thành viên';
        await createNotificationAndPush(supabaseAdmin, {
          userId: targetUserId,
          actorId: user.id,
          type: 'new_follower',
          title: `${actorName} đã bắt đầu theo dõi bạn`,
          body: 'Nhấn để xem hồ sơ hoặc mời bạn ấy nối Streak học Kanji.',
          actionUrl: `/u/${user.id}`,
          metadata: { followerId: user.id },
          sendPush: true,
        });
      }

      return res.status(200).json({
        isFollowing,
        followersCount: followersCount || 0,
      });
    }

    if (req.method === 'GET' && action === 'my_follows') {
      const [{ data: followerRows, error: err1 }, { data: followingRows, error: err2 }] =
        await Promise.all([
          supabaseAdmin
            .from('user_follows')
            .select('follower_id, created_at')
            .eq('following_id', user.id)
            .order('created_at', { ascending: false })
            .limit(200),
          supabaseAdmin
            .from('user_follows')
            .select('following_id, created_at')
            .eq('follower_id', user.id)
            .order('created_at', { ascending: false })
            .limit(200),
        ]);

      if (err1) throw err1;
      if (err2) throw err2;

      const allIds = [
        ...(followerRows || []).map((r: any) => r.follower_id),
        ...(followingRows || []).map((r: any) => r.following_id),
      ];
      const usersMap = await fetchPublicUsersMap(supabaseAdmin, allIds);
      const followingSet = new Set((followingRows || []).map((r: any) => r.following_id));

      return res.status(200).json({
        followers: (followerRows || []).map((r: any) => {
          const u = usersMap.get(r.follower_id);
          return {
            id: r.follower_id,
            displayName: u?.displayName || 'Thành viên',
            avatarUrl: u?.avatarUrl || null,
            followedAt: r.created_at,
            isFollowingBack: followingSet.has(r.follower_id),
          };
        }),
        following: (followingRows || []).map((r: any) => {
          const u = usersMap.get(r.following_id);
          return {
            id: r.following_id,
            displayName: u?.displayName || 'Thành viên',
            avatarUrl: u?.avatarUrl || null,
            followedAt: r.created_at,
          };
        }),
      });
    }

    // 1b. Public & Auth-optional GET: Streak Leaderboard
    if (req.method === 'GET' && action === 'streak_leaderboard') {
      const limit = Math.max(5, Math.min(50, Number(req.query?.limit) || 30));
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;
      const { user, supabaseAdmin } = ctx;

      let rows: any[] | null = null;
      let lbErr: any = null;
      const extendedRes = await supabaseAdmin
        .from('user_study_streaks')
        .select(
          'user_id, current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, frozen_dates, updated_at'
        )
        .order('current_streak', { ascending: false })
        .order('total_reviewed', { ascending: false })
        .limit(100);

      if (extendedRes.error && String((extendedRes.error as any)?.code || '') === '42703') {
        const basicRes = await supabaseAdmin
          .from('user_study_streaks')
          .select(
            'user_id, current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, updated_at'
          )
          .order('current_streak', { ascending: false })
          .order('total_reviewed', { ascending: false })
          .limit(100);
        rows = basicRes.data;
        lbErr = basicRes.error;
      } else {
        rows = extendedRes.data;
        lbErr = extendedRes.error;
      }

      if (lbErr) {
        if (isMissingTableError(lbErr)) {
          return res.status(200).json({
            tableReady: false,
            entries: [],
            viewerEntry: null,
            viewerRank: null,
          });
        }
        throw lbErr;
      }

      const todayVn = getVnDateKey();
      const yesterdayVn = addDaysToDateKey(todayVn, -1);
      const tomorrowVn = addDaysToDateKey(todayVn, 1);
      const activeDateSet = new Set([yesterdayVn, todayVn, tomorrowVn]);

      const rawRows = rows || [];
      const userIds = rawRows.map((r: any) => r.user_id);
      if (user?.id && !userIds.includes(user.id)) {
        userIds.push(user.id);
      }
      const usersMap = await fetchPublicUsersMap(supabaseAdmin, userIds);

      const normalizedEntries = rawRows.map((r: any) => {
        const lastDate = typeof r.last_study_date === 'string' ? r.last_study_date : null;
        const frozenDates = normalizeFrozenDates(r.frozen_dates);
        const isFrozenGrace = frozenDates.includes(yesterdayVn) || frozenDates.includes(todayVn);
        const isStreakActive = Boolean((lastDate && activeDateSet.has(lastDate)) || isFrozenGrace);
        const effectiveStreak = isStreakActive ? Math.max(0, Number(r.current_streak || 0)) : 0;
        const todayCount =
          lastDate === todayVn || lastDate === tomorrowVn
            ? Math.max(0, Number(r.today_count || 0))
            : 0;
        const prof = usersMap.get(r.user_id);

        return {
          userId: r.user_id as string,
          displayName: prof?.displayName || 'Thành viên',
          avatarUrl: prof?.avatarUrl || null,
          currentStreak: effectiveStreak,
          longestStreak: Math.max(effectiveStreak, Number(r.longest_streak || 0)),
          todayCount,
          dailyGoal: Math.max(1, Number(r.daily_goal || 20)),
          totalReviewed: Math.max(0, Number(r.total_reviewed || 0)),
          lastStudyDate: lastDate,
          isActiveToday: lastDate === todayVn || lastDate === tomorrowVn,
          isSelf: Boolean(user && user.id === r.user_id),
        };
      });

      normalizedEntries.sort((a, b) => {
        if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
        if (b.todayCount !== a.todayCount) return b.todayCount - a.todayCount;
        if (b.longestStreak !== a.longestStreak) return b.longestStreak - a.longestStreak;
        return b.totalReviewed - a.totalReviewed;
      });

      const ranked = normalizedEntries.map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }));

      const viewerRanked = user ? ranked.find((e) => e.userId === user.id) || null : null;

      return res.status(200).json({
        tableReady: true,
        entries: ranked.slice(0, limit),
        viewerEntry: viewerRanked,
        viewerRank: viewerRanked ? viewerRanked.rank : null,
      });
    }

    // Public/Auth-optional preview for shareable Friend Streak Invite links
    if (req.method === 'GET' && action === 'friend_streak_invite_preview') {
      const code = String(req.query?.code || '').trim();
      if (!code) {
        return res.status(400).json({ error: 'Thiếu mã lời mời nối Streak.' });
      }
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;
      const { user, supabaseAdmin } = ctx;

      const { data: invite, error: invErr } = await supabaseAdmin
        .from('friend_streak_invites')
        .select('id, inviter_id, invitee_id, invite_code, status, expires_at, created_at')
        .eq('invite_code', code)
        .maybeSingle();

      if (invErr) {
        if (isMissingTableError(invErr)) {
          return res.status(200).json({ tableReady: false, invite: null });
        }
        throw invErr;
      }

      if (!invite) {
        return res.status(404).json({ error: 'Không tìm thấy lời mời nối Streak này.' });
      }

      const [usersMap, inviterStreak] = await Promise.all([
        fetchPublicUsersMap(supabaseAdmin, [invite.inviter_id]),
        fetchStreakRowSafe(supabaseAdmin, invite.inviter_id),
      ]);

      const inviterProfile = usersMap.get(invite.inviter_id);
      const isExpired =
        invite.status === 'expired' ||
        (invite.status === 'pending' && new Date(invite.expires_at).getTime() < Date.now());

      let viewerSlotCount = 0;
      let alreadyConnected = false;
      if (user) {
        const [{ count }, { data: pairRow }] = await Promise.all([
          supabaseAdmin
            .from('friend_streaks')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .or(`user_low.eq.${user.id},user_high.eq.${user.id}`),
          user.id !== invite.inviter_id
            ? supabaseAdmin
                .from('friend_streaks')
                .select('id, status')
                .eq('user_low', user.id < invite.inviter_id ? user.id : invite.inviter_id)
                .eq('user_high', user.id < invite.inviter_id ? invite.inviter_id : user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        viewerSlotCount = count || 0;
        alreadyConnected = Boolean((pairRow as any)?.status === 'active');
      }

      return res.status(200).json({
        tableReady: true,
        invite: {
          id: invite.id,
          inviteCode: invite.invite_code,
          status: isExpired ? 'expired' : invite.status,
          expiresAt: invite.expires_at,
          isTargetedToOther: Boolean(
            user && invite.invitee_id && invite.invitee_id !== user.id
          ),
          isOwnInvite: Boolean(user && invite.inviter_id === user.id),
          alreadyConnected,
          viewerSlotsFull: viewerSlotCount >= MAX_FRIEND_STREAK_SLOTS,
          inviter: {
            id: invite.inviter_id,
            displayName: inviterProfile?.displayName || 'Thành viên',
            avatarUrl: inviterProfile?.avatarUrl || null,
            currentStreak: Math.max(0, Number(inviterStreak.row?.current_streak || 0)),
          },
        },
      });
    }

    if (req.method === 'GET' && action === 'search_users') {
      const q = String(req.query?.q || '').trim();

      let query = supabaseAdmin
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .neq('id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (q) {
        query = query.ilike('display_name', `%${q}%`);
      }

      const [{ data: profileRows, error: searchErr }, { data: myFollowingRows }] =
        await Promise.all([
          query,
          supabaseAdmin
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user.id),
        ]);

      if (searchErr) throw searchErr;
      const myFollowingSet = new Set((myFollowingRows || []).map((r: any) => r.following_id));

      return res.status(200).json({
        users: (profileRows || []).map((row: any) => ({
          id: row.id,
          displayName: (row.display_name || '').trim() || 'Thành viên',
          avatarUrl: row.avatar_url || null,
          createdAt: row.created_at,
          isFollowing: myFollowingSet.has(row.id),
        })),
      });
    }

    if (req.method === 'GET' && action === 'my_study_streak') {
      const todayVn = getVnDateKey();
      const { row, tableReady, freezeReady } = await fetchStreakRowSafe(
        supabaseAdmin,
        user.id
      );

      if (!tableReady) {
        return res.status(200).json({ tableReady: false, freezeReady: false, streak: null });
      }

      const reconciled = await reconcileAutoFreezeForUser(
        supabaseAdmin,
        user.id,
        row,
        freezeReady,
        todayVn,
        true
      );

      return res.status(200).json({
        tableReady: true,
        freezeReady,
        streak: reconciled
          ? {
              ...reconciled,
              streak_freezes: Math.max(
                0,
                Math.min(MAX_FREEZE_SLOTS, Number(reconciled.streak_freezes ?? 1))
              ),
              freeze_recharge_days: Math.max(
                0,
                Math.min(FREEZE_RECHARGE_DAYS_REQUIRED, Number(reconciled.freeze_recharge_days ?? 0))
              ),
              frozen_dates: normalizeFrozenDates(reconciled.frozen_dates),
            }
          : null,
      });
    }

    if (req.method === 'POST' && action === 'upsert_study_streak') {
      const sanitizeInt = (val: unknown, min: number, max: number, fallback = 0) => {
        const n = Math.floor(Number(val));
        if (!Number.isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, n));
      };

      const todayVn = getVnDateKey();
      const yesterdayVn = addDaysToDateKey(todayVn, -1);

      const { row: existingRowRaw, tableReady, freezeReady } = await fetchStreakRowSafe(
        supabaseAdmin,
        user.id
      );

      if (!tableReady) {
        return res.status(200).json({ tableReady: false, freezeReady: false, saved: null });
      }

      const existingRow = await reconcileAutoFreezeForUser(
        supabaseAdmin,
        user.id,
        existingRowRaw,
        freezeReady,
        todayVn,
        true
      );

      const clientActivity = sanitizeActivityMap(req.body?.activityByDate);
      const serverActivity = sanitizeActivityMap(existingRow?.activity_by_date);
      const mergedActivity = mergeActivityMaps(serverActivity, clientActivity);

      const frozenDates = normalizeFrozenDates(existingRow?.frozen_dates);
      const dailyGoal = sanitizeInt(req.body?.dailyGoal, 1, 500, existingRow?.daily_goal || 20);
      const todayCount = Math.max(
        sanitizeInt(req.body?.todayCount, 0, 10000, 0),
        Number(mergedActivity[todayVn]?.reviewed || 0)
      );

      // Default 1 Freeze for brand new users
      let streakFreezes = existingRow
        ? Math.max(0, Math.min(MAX_FREEZE_SLOTS, Number(existingRow.streak_freezes ?? 1)))
        : 1;
      let freezeRechargeDays = existingRow
        ? Math.max(
            0,
            Math.min(FREEZE_RECHARGE_DAYS_REQUIRED, Number(existingRow.freeze_recharge_days ?? 0))
          )
        : 0;

      // 10-day recharge check: only count once on the first study session of todayVn
      const alreadyStudiedTodayOnServer =
        existingRow?.last_study_date === todayVn ||
        Number(serverActivity[todayVn]?.reviewed || 0) > 0;

      if (todayCount > 0 && !alreadyStudiedTodayOnServer && streakFreezes < MAX_FREEZE_SLOTS) {
        freezeRechargeDays += 1;
        if (freezeRechargeDays >= FREEZE_RECHARGE_DAYS_REQUIRED) {
          streakFreezes = Math.min(MAX_FREEZE_SLOTS, streakFreezes + 1);
          freezeRechargeDays = 0;

          await createNotificationAndPush(supabaseAdmin, {
            userId: user.id,
            type: 'freeze_recharged',
            title: 'Bạn vừa nhận được +1 Băng Streak mới!',
            body: `Chúc mừng bạn đã học đủ 10 ngày để hồi 1 Băng Streak (Hiện có ${streakFreezes}/${MAX_FREEZE_SLOTS} Băng).`,
            actionUrl: '/leaderboard?tab=friends',
            metadata: { date: todayVn, streakFreezes },
            sendPush: true,
            tag: `freeze-recharged-${todayVn}`,
          });
        }
      }

      const computed = computeFreezeAwareMetrics({
        activityByDate: mergedActivity,
        frozenDates,
        todayVn,
      });

      const fallbackStreak = sanitizeInt(req.body?.currentStreak, 0, 5000, 0);
      const currentStreak = Math.max(computed.currentStreak, fallbackStreak);
      const longestStreak = Math.max(
        currentStreak,
        computed.longestStreak,
        sanitizeInt(req.body?.longestStreak, 0, 5000, 0),
        Number(existingRow?.longest_streak || 0)
      );
      const totalReviewed = Math.max(
        computed.totalReviewed,
        sanitizeInt(req.body?.totalReviewed, 0, 5000000, 0)
      );

      const rawDate = typeof req.body?.lastStudyDate === 'string' ? req.body.lastStudyDate.trim() : '';
      const clientLastStudyDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
      const lastStudyDate =
        todayCount > 0
          ? todayVn
          : computed.lastStudyDate || clientLastStudyDate || existingRow?.last_study_date || null;

      const basePayload: Record<string, any> = {
        user_id: user.id,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        today_count: todayCount,
        daily_goal: dailyGoal,
        total_reviewed: totalReviewed,
        last_study_date: lastStudyDate,
        activity_by_date: mergedActivity,
      };

      if (freezeReady) {
        basePayload.streak_freezes = streakFreezes;
        basePayload.freeze_recharge_days = freezeRechargeDays;
        basePayload.frozen_dates = frozenDates;
      }

      const { data: saved, error: upErr } = await supabaseAdmin
        .from('user_study_streaks')
        .upsert(basePayload, { onConflict: 'user_id' })
        .select(
          freezeReady
            ? 'current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, streak_freezes, freeze_recharge_days, frozen_dates'
            : 'current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date'
        )
        .maybeSingle();

      if (upErr) {
        if (isMissingTableError(upErr)) {
          return res.status(200).json({ tableReady: false, freezeReady: false, saved: null });
        }
        throw upErr;
      }

      if (todayCount > 0) {
        await advanceFriendStreaksForUser(supabaseAdmin, user.id, todayVn);
      }

      return res.status(200).json({
        tableReady: true,
        freezeReady,
        saved: saved
          ? {
              ...(saved as Record<string, any>),
              streak_freezes: Number((saved as any).streak_freezes ?? streakFreezes),
              freeze_recharge_days: Number(
                (saved as any).freeze_recharge_days ?? freezeRechargeDays
              ),
              frozen_dates: normalizeFrozenDates((saved as any).frozen_dates ?? frozenDates),
            }
          : null,
      });
    }

    // 3b. Friend Streaks Hub (Active 6 slots, Freeze inventory, Pending Invites)
    if (req.method === 'GET' && action === 'friend_streaks_hub') {
      const todayVn = getVnDateKey();
      const yesterdayVn = addDaysToDateKey(todayVn, -1);
      const twoDaysAgoVn = addDaysToDateKey(todayVn, -2);
      const vnHour = getVnHour();

      const { row: viewerRowRaw, freezeReady } = await fetchStreakRowSafe(
        supabaseAdmin,
        user.id
      );
      const viewerRow = await reconcileAutoFreezeForUser(
        supabaseAdmin,
        user.id,
        viewerRowRaw,
        freezeReady,
        todayVn,
        true
      );

      const viewerFreezes = viewerRow
        ? Math.max(0, Math.min(MAX_FREEZE_SLOTS, Number(viewerRow.streak_freezes ?? 1)))
        : 1;
      const viewerRechargeDays = viewerRow
        ? Math.max(
            0,
            Math.min(FREEZE_RECHARGE_DAYS_REQUIRED, Number(viewerRow.freeze_recharge_days ?? 0))
          )
        : 0;
      const viewerFrozenDates = normalizeFrozenDates(viewerRow?.frozen_dates);
      const viewerAct = sanitizeActivityMap(viewerRow?.activity_by_date);
      const viewerStudiedToday =
        viewerRow?.last_study_date === todayVn || (viewerAct[todayVn]?.reviewed || 0) > 0;

      // Self-heal any orphaned 'accepted' invites missing from friend_streaks (caused by legacy RPC bug)
      try {
        const [{ data: acceptedRows }, { data: allMyPairs }] = await Promise.all([
          supabaseAdmin
            .from('friend_streak_invites')
            .select('id, inviter_id, invitee_id, responded_at, created_at')
            .eq('status', 'accepted')
            .not('invitee_id', 'is', null)
            .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
            .order('responded_at', { ascending: true }),
          supabaseAdmin
            .from('friend_streaks')
            .select('id, user_low, user_high, status')
            .or(`user_low.eq.${user.id},user_high.eq.${user.id}`),
        ]);

        const existingPairKeySet = new Set(
          (allMyPairs || []).map((p: any) => `${p.user_low}:${p.user_high}`)
        );
        let myActiveCount = (allMyPairs || []).filter((p: any) => p.status === 'active').length;
        let healedAny = false;

        for (const acc of acceptedRows || []) {
          if (myActiveCount >= MAX_FRIEND_STREAK_SLOTS) break;
          if (!acc.invitee_id || acc.inviter_id === acc.invitee_id) continue;
          const low = acc.inviter_id < acc.invitee_id ? acc.inviter_id : acc.invitee_id;
          const high = acc.inviter_id < acc.invitee_id ? acc.invitee_id : acc.inviter_id;
          const key = `${low}:${high}`;
          if (existingPairKeySet.has(key)) continue;

          const otherId = acc.inviter_id === user.id ? acc.invitee_id : acc.inviter_id;
          const { count: otherActiveCount } = await supabaseAdmin
            .from('friend_streaks')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .or(`user_low.eq.${otherId},user_high.eq.${otherId}`);

          if ((otherActiveCount || 0) >= MAX_FRIEND_STREAK_SLOTS) continue;

          const { error: healErr } = await supabaseAdmin
            .from('friend_streaks')
            .insert({
              user_low: low,
              user_high: high,
              pair_streak: 0,
              longest_pair_streak: 0,
              status: 'active',
            });

          if (!healErr) {
            existingPairKeySet.add(key);
            myActiveCount += 1;
            healedAny = true;
          }
        }

        if (healedAny && viewerStudiedToday) {
          await advanceFriendStreaksForUser(supabaseAdmin, user.id, todayVn);
        }
      } catch {
        // Non-blocking self-heal
      }

      const [
        { data: pairRows, error: pairErr },
        { data: incomingRowsRaw, error: incErr },
        { data: outgoingRowsRaw, error: outErr },
      ] = await Promise.all([
        supabaseAdmin
          .from('friend_streaks')
          .select('*')
          .eq('status', 'active')
          .or(`user_low.eq.${user.id},user_high.eq.${user.id}`)
          .order('pair_streak', { ascending: false })
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('friend_streak_invites')
          .select('id, inviter_id, invitee_id, invite_code, status, expires_at, created_at')
          .eq('invitee_id', user.id)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('friend_streak_invites')
          .select('id, inviter_id, invitee_id, invite_code, status, expires_at, created_at')
          .eq('inviter_id', user.id)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ]);

      if (pairErr || incErr || outErr) {
        const err = pairErr || incErr || outErr;
        if (isMissingTableError(err)) {
          return res.status(200).json({
            tableReady: false,
            maxSlots: MAX_FRIEND_STREAK_SLOTS,
            freezeState: {
              streakFreezes: viewerFreezes,
              maxFreezes: MAX_FREEZE_SLOTS,
              freezeRechargeDays: viewerRechargeDays,
              rechargeTarget: FREEZE_RECHARGE_DAYS_REQUIRED,
              frozenDates: viewerFrozenDates,
            },
            activePairs: [],
            incomingInvites: [],
            outgoingInvites: [],
          });
        }
        throw err;
      }

      const activePartnerSet = new Set(
        (pairRows || []).map((p: any) => (p.user_low === user.id ? p.user_high : p.user_low))
      );
      const incomingRows = (incomingRowsRaw || []).filter(
        (r: any) => !activePartnerSet.has(r.inviter_id)
      );
      const outgoingRows = (outgoingRowsRaw || []).filter(
        (r: any) => !r.invitee_id || !activePartnerSet.has(r.invitee_id)
      );

      const partnerIds = (pairRows || []).map((p: any) =>
        p.user_low === user.id ? p.user_high : p.user_low
      );
      const relatedIds = Array.from(
        new Set([
          ...partnerIds,
          ...(incomingRows || []).map((r: any) => r.inviter_id),
          ...(outgoingRows || []).map((r: any) => r.invitee_id).filter(Boolean),
        ])
      );

      const [usersMap, { data: partnerStreakRows }] = await Promise.all([
        fetchPublicUsersMap(supabaseAdmin, relatedIds),
        partnerIds.length > 0
          ? supabaseAdmin
              .from('user_study_streaks')
              .select(
                'user_id, current_streak, longest_streak, today_count, daily_goal, last_study_date, activity_by_date, streak_freezes, frozen_dates'
              )
              .in('user_id', partnerIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const partnerStreakMap = new Map<string, any>();
      for (const row of partnerStreakRows || []) {
        const reconciled = await reconcileAutoFreezeForUser(
          supabaseAdmin,
          row.user_id,
          row,
          true,
          todayVn,
          true
        );
        partnerStreakMap.set(row.user_id, reconciled || row);
      }

      const activePairs = (pairRows || []).map((pair: any) => {
        const partnerId = pair.user_low === user.id ? pair.user_high : pair.user_low;
        const prof = usersMap.get(partnerId);
        const pStreak = partnerStreakMap.get(partnerId) || null;
        const pAct = sanitizeActivityMap(pStreak?.activity_by_date);
        const pFrozen = normalizeFrozenDates(pStreak?.frozen_dates);
        const pFrozenSet = new Set(pFrozen);
        const pFreezes = pStreak
          ? Math.max(0, Math.min(MAX_FREEZE_SLOTS, Number(pStreak.streak_freezes ?? 1)))
          : 1;

        const partnerStudiedToday = Boolean(
          pStreak &&
            (pStreak.last_study_date === todayVn || (pAct[todayVn]?.reviewed || 0) > 0)
        );
        const partnerFrozenToday = pFrozenSet.has(todayVn);
        const partnerSatisfiedYesterday = Boolean(
          pStreak &&
            (pStreak.last_study_date === yesterdayVn ||
              (pAct[yesterdayVn]?.reviewed || 0) > 0 ||
              pFrozenSet.has(yesterdayVn))
        );
        const partnerHadPriorStreak = Boolean(
          pStreak &&
            ((pAct[twoDaysAgoVn]?.reviewed || 0) > 0 ||
              pFrozenSet.has(twoDaysAgoVn) ||
              (pStreak.last_study_date === twoDaysAgoVn && Number(pStreak.current_streak || 0) > 0) ||
              (pair.last_pair_date === twoDaysAgoVn && Number(pair.pair_streak || 0) > 0))
        );

        const pairFrozen = normalizeFrozenDates(pair.frozen_dates);
        const pairFrozenSet = new Set(pairFrozen);
        const isPairActiveToday = pair.last_pair_date === todayVn;
        const isPairAlive =
          isPairActiveToday ||
          pair.last_pair_date === yesterdayVn ||
          pairFrozenSet.has(yesterdayVn) ||
          pairFrozenSet.has(todayVn);
        const effectivePairStreak = isPairAlive ? Math.max(0, Number(pair.pair_streak || 0)) : 0;

        // Nudge check (once per VN day per pair, only if partner hasn't studied today)
        const lastNudgeVn = pair.last_nudged_at
          ? getVnDateKey(new Date(pair.last_nudged_at))
          : null;
        const nudgedToday = lastNudgeVn === todayVn;
        const canNudge = !partnerStudiedToday && !partnerFrozenToday && !nudgedToday;

        // Rescue check (7-day pair cooldown, rescuer has >= 1 Freeze)
        const cooldownMs = 7 * 24 * 60 * 60 * 1000;
        const rescueCooldownActive = Boolean(
          pair.last_rescued_at &&
            Date.now() - new Date(pair.last_rescued_at).getTime() < cooldownMs
        );

        let rescueTargetDate: string | null = null;
        let rescueReason: string | null = null;
        if (!rescueCooldownActive) {
          if (!partnerSatisfiedYesterday && partnerHadPriorStreak) {
            rescueTargetDate = yesterdayVn;
            rescueReason = 'Bạn ấy lỡ học hôm qua — dùng 1 Băng để cứu chuỗi kịp thời';
          } else if (
            vnHour >= 20 &&
            !partnerStudiedToday &&
            !partnerFrozenToday &&
            pFreezes === 0 &&
            (Number(pStreak?.current_streak || 0) > 0 || effectivePairStreak > 0)
          ) {
            rescueTargetDate = todayVn;
            rescueReason = 'Đã tối muộn & bạn ấy hết Băng — đóng băng hộ hôm nay';
          }
        }

        const canRescue = Boolean(rescueTargetDate && viewerFreezes >= 1);

        return {
          pairId: pair.id,
          partner: {
            id: partnerId,
            displayName: prof?.displayName || 'Thành viên',
            avatarUrl: prof?.avatarUrl || null,
            currentStreak: Math.max(0, Number(pStreak?.current_streak || 0)),
            longestStreak: Math.max(0, Number(pStreak?.longest_streak || 0)),
            todayCount: partnerStudiedToday ? Math.max(0, Number(pStreak?.today_count || 0)) : 0,
            dailyGoal: Math.max(1, Number(pStreak?.daily_goal || 20)),
            studiedToday: partnerStudiedToday,
            frozenToday: partnerFrozenToday,
            streakFreezes: pFreezes,
          },
          pairStreak: effectivePairStreak,
          longestPairStreak: Math.max(
            effectivePairStreak,
            Number(pair.longest_pair_streak || 0)
          ),
          lastPairDate: pair.last_pair_date || null,
          isActiveToday: isPairActiveToday,
          viewerStudiedToday,
          viewerFrozenToday: viewerFrozenDates.includes(todayVn),
          canNudge,
          nudgedToday,
          canRescue,
          rescueTargetDate,
          rescueReason,
          rescueCooldownActive,
          createdAt: pair.created_at,
        };
      });

      return res.status(200).json({
        tableReady: true,
        maxSlots: MAX_FRIEND_STREAK_SLOTS,
        freezeState: {
          streakFreezes: viewerFreezes,
          maxFreezes: MAX_FREEZE_SLOTS,
          freezeRechargeDays: viewerRechargeDays,
          rechargeTarget: FREEZE_RECHARGE_DAYS_REQUIRED,
          frozenDates: viewerFrozenDates,
        },
        activePairs,
        incomingInvites: (incomingRows || []).map((r: any) => {
          const prof = usersMap.get(r.inviter_id);
          return {
            id: r.id,
            inviteCode: r.invite_code,
            inviter: {
              id: r.inviter_id,
              displayName: prof?.displayName || 'Thành viên',
              avatarUrl: prof?.avatarUrl || null,
            },
            expiresAt: r.expires_at,
            createdAt: r.created_at,
          };
        }),
        outgoingInvites: (outgoingRows || []).map((r: any) => {
          const prof = r.invitee_id ? usersMap.get(r.invitee_id) : null;
          return {
            id: r.id,
            inviteCode: r.invite_code,
            invitee: r.invitee_id
              ? {
                  id: r.invitee_id,
                  displayName: prof?.displayName || 'Thành viên',
                  avatarUrl: prof?.avatarUrl || null,
                }
              : null,
            expiresAt: r.expires_at,
            createdAt: r.created_at,
          };
        }),
      });
    }

    if (req.method === 'POST' && action === 'create_friend_streak_invite') {
      const targetUserId = String(req.body?.targetUserId || '').trim() || null;
      if (targetUserId && targetUserId === user.id) {
        return res.status(400).json({ error: 'Bạn không thể tự mời chính mình nối Streak.' });
      }

      const [{ count: activeCount, error: cntErr }, { count: pendingCount }] =
        await Promise.all([
          supabaseAdmin
            .from('friend_streaks')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .or(`user_low.eq.${user.id},user_high.eq.${user.id}`),
          supabaseAdmin
            .from('friend_streak_invites')
            .select('id', { count: 'exact', head: true })
            .eq('inviter_id', user.id)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString()),
        ]);

      if (cntErr) {
        if (isMissingTableError(cntErr)) {
          return res.status(400).json({
            error:
              'Tính năng Streak Bạn Bè chưa được kích hoạt trên Supabase. Vui lòng chạy script migration trước.',
          });
        }
        throw cntErr;
      }

      if ((activeCount || 0) >= MAX_FRIEND_STREAK_SLOTS) {
        return res.status(400).json({
          error: `Bạn đã đạt tối đa ${MAX_FRIEND_STREAK_SLOTS} kết nối Streak bạn bè.`,
        });
      }

      if ((pendingCount || 0) >= MAX_PENDING_OUTGOING_INVITES) {
        return res.status(400).json({
          error: `Bạn đang có ${MAX_PENDING_OUTGOING_INVITES} lời mời chờ xử lý. Hãy hủy bớt lời mời cũ trước khi tạo thêm.`,
        });
      }

      if (targetUserId) {
        const low = user.id < targetUserId ? user.id : targetUserId;
        const high = user.id < targetUserId ? targetUserId : user.id;
        const [{ data: existingPair }, { data: existingInvite }, { data: reverseInvite }] =
          await Promise.all([
            supabaseAdmin
              .from('friend_streaks')
              .select('id, status')
              .eq('user_low', low)
              .eq('user_high', high)
              .maybeSingle(),
            supabaseAdmin
              .from('friend_streak_invites')
              .select('id, invite_code, expires_at')
              .eq('inviter_id', user.id)
              .eq('invitee_id', targetUserId)
              .eq('status', 'pending')
              .gt('expires_at', new Date().toISOString())
              .maybeSingle(),
            supabaseAdmin
              .from('friend_streak_invites')
              .select('id, invite_code')
              .eq('inviter_id', targetUserId)
              .eq('invitee_id', user.id)
              .eq('status', 'pending')
              .gt('expires_at', new Date().toISOString())
              .maybeSingle(),
          ]);

        if (existingPair?.status === 'active') {
          return res.status(400).json({
            error: 'Hai bạn đã đang nối Streak cùng nhau rồi.',
          });
        }
        if (reverseInvite) {
          return res.status(400).json({
            error:
              'Bạn ấy đã gửi lời mời nối Streak cho bạn — hãy bấm Chấp nhận ngay trong danh sách Lời mời đang chờ!',
          });
        }
        if (existingInvite) {
          return res.status(200).json({
            alreadyPending: true,
            invite: {
              id: existingInvite.id,
              inviteCode: existingInvite.invite_code,
              expiresAt: existingInvite.expires_at,
            },
          });
        }
      }

      const inviteCode = crypto.randomBytes(6).toString('base64url');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: created, error: insErr } = await supabaseAdmin
        .from('friend_streak_invites')
        .insert({
          inviter_id: user.id,
          invitee_id: targetUserId,
          invite_code: inviteCode,
          status: 'pending',
          expires_at: expiresAt,
        })
        .select('id, invite_code, expires_at, created_at')
        .single();

      if (insErr) throw insErr;

      if (targetUserId) {
        const usersMap = await fetchPublicUsersMap(supabaseAdmin, [user.id]);
        const actorName = usersMap.get(user.id)?.displayName || 'Một bạn học';
        await createNotificationAndPush(supabaseAdmin, {
          userId: targetUserId,
          actorId: user.id,
          type: 'friend_streak_invite',
          title: `${actorName} mời bạn nối Streak học Kanji!`,
          body: 'Cùng ôn tập mỗi ngày để thắp sáng chuỗi Streak chung (tối đa 6 người bạn).',
          actionUrl: '/leaderboard?tab=friends',
          metadata: { inviteId: created.id, inviteCode: created.invite_code },
          sendPush: true,
        });
      }

      return res.status(200).json({
        invite: {
          id: created.id,
          inviteCode: created.invite_code,
          expiresAt: created.expires_at,
          createdAt: created.created_at,
        },
      });
    }

    if (req.method === 'POST' && action === 'respond_friend_streak_invite') {
      const decision = String(req.body?.decision || '').trim();
      const inviteIdParam = String(req.body?.inviteId || '').trim();
      const inviteCodeParam = String(req.body?.inviteCode || '').trim();

      if (!['accept', 'decline', 'cancel'].includes(decision)) {
        return res.status(400).json({ error: 'Lựa chọn xử lý lời mời không hợp lệ.' });
      }

      let inviteRow: any = null;
      if (inviteIdParam) {
        const { data, error } = await supabaseAdmin
          .from('friend_streak_invites')
          .select('*')
          .eq('id', inviteIdParam)
          .maybeSingle();
        if (error) throw error;
        inviteRow = data;
      } else if (inviteCodeParam) {
        const { data, error } = await supabaseAdmin
          .from('friend_streak_invites')
          .select('*')
          .eq('invite_code', inviteCodeParam)
          .maybeSingle();
        if (error) throw error;
        inviteRow = data;
      }

      if (!inviteRow) {
        return res.status(404).json({ error: 'Không tìm thấy lời mời nối Streak.' });
      }

      if (decision === 'cancel') {
        if (inviteRow.inviter_id !== user.id) {
          return res.status(403).json({ error: 'Bạn không có quyền hủy lời mời này.' });
        }
        const { error: updErr } = await supabaseAdmin
          .from('friend_streak_invites')
          .update({ status: 'canceled', responded_at: new Date().toISOString() })
          .eq('id', inviteRow.id)
          .eq('status', 'pending');
        if (updErr) throw updErr;
        return res.status(200).json({ ok: true, status: 'canceled' });
      }

      if (decision === 'decline') {
        if (inviteRow.invitee_id && inviteRow.invitee_id !== user.id) {
          return res.status(403).json({ error: 'Lời mời này dành cho thành viên khác.' });
        }
        const { error: updErr } = await supabaseAdmin
          .from('friend_streak_invites')
          .update({ status: 'declined', responded_at: new Date().toISOString() })
          .eq('id', inviteRow.id)
          .eq('status', 'pending');
        if (updErr) throw updErr;
        return res.status(200).json({ ok: true, status: 'declined' });
      }

      // Accept via atomic PostgreSQL RPC (enforces <= 6 active connections per side)
      const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc(
        'accept_friend_streak_invite',
        {
          p_invite_id: inviteRow.id,
          p_accepter_id: user.id,
        }
      );

      if (rpcErr) throw rpcErr;
      if (!rpcRes?.ok) {
        return res.status(400).json({
          error: rpcRes?.message || 'Không thể chấp nhận lời mời nối Streak.',
          code: rpcRes?.code || 'ACCEPT_FAILED',
        });
      }

      // Defense-in-depth: ensure friend_streaks row actually exists even if an older RPC returned null pairId
      let finalPairId: string | null = rpcRes.pairId || null;
      const inviterId = String(rpcRes.inviterId || inviteRow.inviter_id);
      const low = inviterId < user.id ? inviterId : user.id;
      const high = inviterId < user.id ? user.id : inviterId;

      if (!finalPairId) {
        const [{ data: existingPair }, { count: inviterCount }, { count: accepterCount }] =
          await Promise.all([
            supabaseAdmin
              .from('friend_streaks')
              .select('id, status')
              .eq('user_low', low)
              .eq('user_high', high)
              .maybeSingle(),
            supabaseAdmin
              .from('friend_streaks')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'active')
              .or(`user_low.eq.${inviterId},user_high.eq.${inviterId}`),
            supabaseAdmin
              .from('friend_streaks')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'active')
              .or(`user_low.eq.${user.id},user_high.eq.${user.id}`),
          ]);

        if (existingPair?.status === 'active') {
          finalPairId = existingPair.id;
        } else {
          if ((inviterCount || 0) >= MAX_FRIEND_STREAK_SLOTS) {
            return res.status(400).json({
              error: 'Người mời đã đạt tối đa 6 kết nối Streak bạn bè.',
              code: 'INVITER_MAX_SLOTS',
            });
          }
          if ((accepterCount || 0) >= MAX_FRIEND_STREAK_SLOTS) {
            return res.status(400).json({
              error: 'Bạn đã đạt tối đa 6 kết nối Streak bạn bè.',
              code: 'ACCEPTER_MAX_SLOTS',
            });
          }

          const { data: upsertedPair, error: upsertPairErr } = await supabaseAdmin
            .from('friend_streaks')
            .upsert(
              {
                user_low: low,
                user_high: high,
                pair_streak: 0,
                longest_pair_streak: existingPair ? undefined : 0,
                last_pair_date: null,
                frozen_dates: [],
                status: 'active',
              },
              { onConflict: 'user_low,user_high' }
            )
            .select('id')
            .single();

          if (upsertPairErr) throw upsertPairErr;
          finalPairId = upsertedPair?.id || null;
        }
      }

      if (!finalPairId) {
        return res.status(500).json({
          error: 'Không thể tạo kết nối Streak bạn bè trên máy chủ. Vui lòng thử lại.',
        });
      }

      // Close any opposite-direction pending invites between the same pair
      await supabaseAdmin
        .from('friend_streak_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('status', 'pending')
        .neq('id', inviteRow.id)
        .or(`and(inviter_id.eq.${low},invitee_id.eq.${high}),and(inviter_id.eq.${high},invitee_id.eq.${low})`);

      const todayVn = getVnDateKey();
      await advanceFriendStreaksForUser(supabaseAdmin, user.id, todayVn);

      if (!rpcRes.alreadyConnected && inviterId && inviterId !== user.id) {
        const usersMap = await fetchPublicUsersMap(supabaseAdmin, [user.id]);
        const accepterName = usersMap.get(user.id)?.displayName || 'Bạn học';
        await createNotificationAndPush(supabaseAdmin, {
          userId: inviterId,
          actorId: user.id,
          type: 'friend_streak_accepted',
          title: `${accepterName} đã nhận lời nối Streak cùng bạn!`,
          body: 'Hai bạn đã bắt đầu chuỗi Streak chung. Hãy ôn tập hôm nay để thắp lửa nhé.',
          actionUrl: '/leaderboard?tab=friends',
          metadata: { pairId: finalPairId },
          sendPush: true,
        });
      }

      return res.status(200).json({
        ok: true,
        status: 'accepted',
        pairId: finalPairId,
        alreadyConnected: Boolean(rpcRes.alreadyConnected),
      });
    }

    if (req.method === 'POST' && action === 'nudge_friend_streak') {
      const pairId = String(req.body?.pairId || '').trim();
      if (!pairId) {
        return res.status(400).json({ error: 'Thiếu pairId.' });
      }

      const { data: pair, error: pairErr } = await supabaseAdmin
        .from('friend_streaks')
        .select('*')
        .eq('id', pairId)
        .eq('status', 'active')
        .maybeSingle();

      if (pairErr) throw pairErr;
      if (!pair || (pair.user_low !== user.id && pair.user_high !== user.id)) {
        return res.status(404).json({ error: 'Không tìm thấy kết nối Streak bạn bè.' });
      }

      const todayVn = getVnDateKey();
      const lastNudgeVn = pair.last_nudged_at
        ? getVnDateKey(new Date(pair.last_nudged_at))
        : null;
      if (lastNudgeVn === todayVn) {
        return res.status(400).json({ error: 'Bạn đã nhắc bạn ấy hôm nay rồi.' });
      }

      const partnerId = pair.user_low === user.id ? pair.user_high : pair.user_low;
      const partnerStreak = await fetchStreakRowSafe(supabaseAdmin, partnerId);
      const pAct = sanitizeActivityMap(partnerStreak.row?.activity_by_date);
      if (
        partnerStreak.row?.last_study_date === todayVn ||
        (pAct[todayVn]?.reviewed || 0) > 0
      ) {
        return res.status(400).json({ error: 'Bạn ấy đã học hôm nay rồi!' });
      }

      await supabaseAdmin
        .from('friend_streaks')
        .update({
          last_nudged_at: new Date().toISOString(),
          last_nudged_by: user.id,
        })
        .eq('id', pair.id);

      const usersMap = await fetchPublicUsersMap(supabaseAdmin, [user.id]);
      const senderName = usersMap.get(user.id)?.displayName || 'Bạn học';
      const streakLabel =
        Number(pair.pair_streak || 0) > 0
          ? `chuỗi ${pair.pair_streak} ngày`
          : 'chuỗi học Kanji hôm nay';

      await createNotificationAndPush(supabaseAdmin, {
        userId: partnerId,
        actorId: user.id,
        type: 'friend_streak_nudge',
        title: `${senderName} nhắc bạn học Kanji hôm nay!`,
        body: `Ôn nhanh ít nhất 1 thẻ Flashcard để cùng nhau giữ ${streakLabel} nhé.`,
        actionUrl: '/decks',
        metadata: { pairId: pair.id },
        sendPush: true,
        tag: `nudge-${pair.id}-${todayVn}`,
      });

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && action === 'rescue_friend_streak') {
      const pairId = String(req.body?.pairId || '').trim();
      if (!pairId) {
        return res.status(400).json({ error: 'Thiếu pairId.' });
      }

      const { data: pair, error: pairErr } = await supabaseAdmin
        .from('friend_streaks')
        .select('*')
        .eq('id', pairId)
        .eq('status', 'active')
        .maybeSingle();

      if (pairErr) throw pairErr;
      if (!pair || (pair.user_low !== user.id && pair.user_high !== user.id)) {
        return res.status(404).json({ error: 'Không tìm thấy kết nối Streak bạn bè.' });
      }

      const cooldownMs = 7 * 24 * 60 * 60 * 1000;
      if (
        pair.last_rescued_at &&
        Date.now() - new Date(pair.last_rescued_at).getTime() < cooldownMs
      ) {
        return res.status(400).json({
          error: 'Mỗi cặp bạn bè chỉ có thể dùng tính năng Cứu Streak tối đa 1 lần mỗi 7 ngày.',
        });
      }

      const todayVn = getVnDateKey();
      const yesterdayVn = addDaysToDateKey(todayVn, -1);
      const twoDaysAgoVn = addDaysToDateKey(todayVn, -2);
      const vnHour = getVnHour();
      const partnerId = pair.user_low === user.id ? pair.user_high : pair.user_low;

      const [rescuerRes, partnerRes, usersMap] = await Promise.all([
        fetchStreakRowSafe(supabaseAdmin, user.id),
        fetchStreakRowSafe(supabaseAdmin, partnerId),
        fetchPublicUsersMap(supabaseAdmin, [user.id, partnerId]),
      ]);

      if (!rescuerRes.freezeReady) {
        return res.status(400).json({
          error: 'Chưa chạy script migration Băng Streak trên Supabase.',
        });
      }

      const rescuerFreezes = rescuerRes.row
        ? Math.max(0, Math.min(MAX_FREEZE_SLOTS, Number(rescuerRes.row.streak_freezes ?? 1)))
        : 1;

      if (rescuerFreezes < 1) {
        return res.status(400).json({
          error: 'Bạn không còn Băng Streak nào để cứu bạn bè.',
        });
      }

      const pRow = partnerRes.row;
      const pAct = sanitizeActivityMap(pRow?.activity_by_date);
      const pFrozen = normalizeFrozenDates(pRow?.frozen_dates);
      const pFrozenSet = new Set(pFrozen);
      const pFreezes = pRow
        ? Math.max(0, Math.min(MAX_FREEZE_SLOTS, Number(pRow.streak_freezes ?? 1)))
        : 1;

      const partnerSatisfiedYesterday = Boolean(
        pRow &&
          (pRow.last_study_date === yesterdayVn ||
            (pAct[yesterdayVn]?.reviewed || 0) > 0 ||
            pFrozenSet.has(yesterdayVn))
      );
      const partnerHadPriorStreak = Boolean(
        pRow &&
          ((pAct[twoDaysAgoVn]?.reviewed || 0) > 0 ||
            pFrozenSet.has(twoDaysAgoVn) ||
            (pRow.last_study_date === twoDaysAgoVn && Number(pRow.current_streak || 0) > 0) ||
            (pair.last_pair_date === twoDaysAgoVn && Number(pair.pair_streak || 0) > 0))
      );
      const partnerStudiedToday = Boolean(
        pRow && (pRow.last_study_date === todayVn || (pAct[todayVn]?.reviewed || 0) > 0)
      );

      let targetDate: string | null = null;
      if (!partnerSatisfiedYesterday && partnerHadPriorStreak) {
        targetDate = yesterdayVn;
      } else if (
        vnHour >= 20 &&
        !partnerStudiedToday &&
        !pFrozenSet.has(todayVn) &&
        pFreezes === 0 &&
        (Number(pRow?.current_streak || 0) > 0 || Number(pair.pair_streak || 0) > 0)
      ) {
        targetDate = todayVn;
      }

      if (!targetDate) {
        return res.status(400).json({
          error:
            'Hiện bạn ấy chưa cần cứu Streak (hoặc chưa đến 20:00 để đóng băng hộ hôm nay).',
        });
      }

      // 1. Deduct 1 Freeze from rescuer
      const nextRescuerFreezes = rescuerFreezes - 1;
      if (rescuerRes.row) {
        await supabaseAdmin
          .from('user_study_streaks')
          .update({ streak_freezes: nextRescuerFreezes })
          .eq('user_id', user.id);
      } else {
        await supabaseAdmin.from('user_study_streaks').insert({
          user_id: user.id,
          streak_freezes: nextRescuerFreezes,
          freeze_recharge_days: 0,
        });
      }

      // 2. Grant targetDate freeze to partner + pair
      const nextPartnerFrozen = normalizeFrozenDates([...pFrozen, targetDate]);
      const pMetrics = computeFreezeAwareMetrics({
        activityByDate: pAct,
        frozenDates: nextPartnerFrozen,
        todayVn,
      });
      const nextPartnerStreak = Math.max(
        pMetrics.currentStreak,
        Number(pRow?.current_streak || 0)
      );
      const nextPartnerLongest = Math.max(
        nextPartnerStreak,
        pMetrics.longestStreak,
        Number(pRow?.longest_streak || 0)
      );

      if (pRow) {
        await supabaseAdmin
          .from('user_study_streaks')
          .update({
            frozen_dates: nextPartnerFrozen,
            current_streak: nextPartnerStreak,
            longest_streak: nextPartnerLongest,
            last_freeze_at: new Date().toISOString(),
          })
          .eq('user_id', partnerId);
      } else {
        await supabaseAdmin.from('user_study_streaks').insert({
          user_id: partnerId,
          frozen_dates: nextPartnerFrozen,
          current_streak: nextPartnerStreak,
          longest_streak: nextPartnerLongest,
          streak_freezes: 1,
          last_freeze_at: new Date().toISOString(),
        });
      }

      const nextPairFrozen = normalizeFrozenDates([...(pair.frozen_dates || []), targetDate]);
      await supabaseAdmin
        .from('friend_streaks')
        .update({
          frozen_dates: nextPairFrozen,
          last_rescued_at: new Date().toISOString(),
          last_rescued_by: user.id,
        })
        .eq('id', pair.id);

      if (targetDate === todayVn) {
        await advanceFriendStreaksForUser(supabaseAdmin, user.id, todayVn);
      }

      const rescuerName = usersMap.get(user.id)?.displayName || 'Bạn học';
      const partnerName = usersMap.get(partnerId)?.displayName || 'bạn';
      await createNotificationAndPush(supabaseAdmin, {
        userId: partnerId,
        actorId: user.id,
        type: 'friend_streak_rescued',
        title: `${rescuerName} đã dùng 1 Băng Streak để cứu chuỗi ngày của bạn!`,
        body: `Chuỗi học Kanji của ${partnerName} đã được bảo vệ an toàn. Vào học ngay để cảm ơn bạn ấy nhé!`,
        actionUrl: '/leaderboard?tab=friends',
        metadata: { pairId: pair.id, targetDate },
        sendPush: true,
        tag: `rescued-${pair.id}-${targetDate}`,
      });

      return res.status(200).json({
        ok: true,
        targetDate,
        remainingFreezes: nextRescuerFreezes,
      });
    }

    if (req.method === 'POST' && action === 'end_friend_streak') {
      const pairId = String(req.body?.pairId || '').trim();
      if (!pairId) {
        return res.status(400).json({ error: 'Thiếu pairId.' });
      }

      const { data: pair, error: pairErr } = await supabaseAdmin
        .from('friend_streaks')
        .select('id, user_low, user_high, status')
        .eq('id', pairId)
        .maybeSingle();

      if (pairErr) throw pairErr;
      if (!pair || (pair.user_low !== user.id && pair.user_high !== user.id)) {
        return res.status(404).json({ error: 'Không tìm thấy kết nối Streak bạn bè.' });
      }

      const { error: updErr } = await supabaseAdmin
        .from('friend_streaks')
        .update({ status: 'ended' })
        .eq('id', pair.id);

      if (updErr) throw updErr;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET' && action === 'my_kanji_mistakes') {
      const { data: rows, error: mErr } = await supabaseAdmin
        .from('user_kanji_mistakes')
        .select(
          'kanji, mistake_count, consecutive_correct, srs_hard_count, quiz_wrong_count, writing_fail_count, is_mastered, last_mistake_source, last_mistake_at, mastered_at, updated_at'
        )
        .eq('user_id', user.id)
        .order('is_mastered', { ascending: true })
        .order('mistake_count', { ascending: false })
        .limit(300);

      if (mErr) {
        const errCode = String((mErr as any)?.code || '');
        const errMsg = String(mErr.message || '').toLowerCase();
        if (
          errCode === '42P01' ||
          errCode === 'PGRST205' ||
          errMsg.includes('user_kanji_mistakes')
        ) {
          return res.status(200).json({ tableReady: false, mistakes: [] });
        }
        throw mErr;
      }

      return res.status(200).json({ tableReady: true, mistakes: rows || [] });
    }

    if (req.method === 'POST' && action === 'upsert_kanji_mistakes') {
      const rawList = Array.isArray(req.body?.mistakes) ? req.body.mistakes : [];
      const sanitizeCount = (val: unknown, fallback = 0) => {
        const n = Math.floor(Number(val));
        return Number.isFinite(n) ? Math.max(0, Math.min(100000, n)) : fallback;
      };
      const allowedSources = new Set(['srs', 'quiz', 'writing', 'confusable']);

      const rowsToUpsert: Array<Record<string, any>> = [];
      for (const raw of rawList.slice(0, 300)) {
        const kanji = typeof raw?.kanji === 'string' ? raw.kanji.trim() : '';
        if (!kanji || kanji.length > 4) continue;
        const src = allowedSources.has(String(raw?.lastMistakeSource || ''))
          ? String(raw.lastMistakeSource)
          : 'srs';
        const lastMistakeAtMs = Number(raw?.lastMistakeAt);
        const masteredAtMs = raw?.masteredAt != null ? Number(raw.masteredAt) : null;

        rowsToUpsert.push({
          user_id: user.id,
          kanji,
          mistake_count: sanitizeCount(raw?.mistakeCount, 1),
          consecutive_correct: sanitizeCount(raw?.consecutiveCorrect, 0),
          srs_hard_count: sanitizeCount(raw?.srsHardCount, 0),
          quiz_wrong_count: sanitizeCount(raw?.quizWrongCount, 0),
          writing_fail_count: sanitizeCount(raw?.writingFailCount, 0),
          is_mastered: Boolean(raw?.isMastered),
          last_mistake_source: src,
          last_mistake_at: Number.isFinite(lastMistakeAtMs)
            ? new Date(lastMistakeAtMs).toISOString()
            : new Date().toISOString(),
          mastered_at:
            masteredAtMs && Number.isFinite(masteredAtMs)
              ? new Date(masteredAtMs).toISOString()
              : null,
        });
      }

      if (rowsToUpsert.length === 0) {
        return res.status(200).json({ tableReady: true, savedCount: 0 });
      }

      const { error: upMistakeErr } = await supabaseAdmin
        .from('user_kanji_mistakes')
        .upsert(rowsToUpsert, { onConflict: 'user_id,kanji' });

      if (upMistakeErr) {
        const errCode = String((upMistakeErr as any)?.code || '');
        const errMsg = String(upMistakeErr.message || '').toLowerCase();
        if (
          errCode === '42P01' ||
          errCode === 'PGRST205' ||
          errMsg.includes('user_kanji_mistakes')
        ) {
          return res.status(200).json({ tableReady: false, savedCount: 0 });
        }
        throw upMistakeErr;
      }

      return res.status(200).json({ tableReady: true, savedCount: rowsToUpsert.length });
    }

    if (req.method === 'POST' && action === 'delete_kanji_mistake') {
      const kanji = typeof req.body?.kanji === 'string' ? req.body.kanji.trim() : '';
      if (!kanji) {
        return res.status(400).json({ error: 'Thiếu ký tự Kanji cần xóa.' });
      }
      const { error: delErr } = await supabaseAdmin
        .from('user_kanji_mistakes')
        .delete()
        .eq('user_id', user.id)
        .eq('kanji', kanji);

      if (delErr) {
        const errCode = String((delErr as any)?.code || '');
        if (errCode === '42P01' || errCode === 'PGRST205') {
          return res.status(200).json({ tableReady: false });
        }
        throw delErr;
      }
      return res.status(200).json({ tableReady: true, deleted: kanji });
    }

    if (req.method === 'POST' && action === 'clear_kanji_mistakes') {
      const { error: clrErr } = await supabaseAdmin
        .from('user_kanji_mistakes')
        .delete()
        .eq('user_id', user.id);

      if (clrErr) {
        const errCode = String((clrErr as any)?.code || '');
        if (errCode === '42P01' || errCode === 'PGRST205') {
          return res.status(200).json({ tableReady: false });
        }
        throw clrErr;
      }
      return res.status(200).json({ tableReady: true });
    }

    return res.status(400).json({ error: `Action "${action}" không hợp lệ.` });
  } catch (err: any) {
    console.error(`Lỗi /api/community [${action}]:`, err);
    return res.status(500).json({
      error: err?.message || 'Lỗi máy chủ xử lý tính năng cộng đồng.',
    });
  }
}
