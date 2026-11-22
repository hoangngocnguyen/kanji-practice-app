import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureUserProfile,
  optionalAuth,
  requireAuth,
  setCorsHeaders,
} from './_lib/auth.js';

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

      const { data: targetProfile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .eq('id', targetUserId)
        .maybeSingle();

      if (profErr) throw profErr;
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

      const { data: rows, error: lbErr } = await supabaseAdmin
        .from('user_study_streaks')
        .select('user_id, current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, updated_at')
        .order('current_streak', { ascending: false })
        .order('total_reviewed', { ascending: false })
        .limit(100);

      if (lbErr) {
        const errCode = String((lbErr as any)?.code || '');
        const errMsg = String(lbErr.message || '').toLowerCase();
        if (
          errCode === '42P01' ||
          errCode === 'PGRST205' ||
          errMsg.includes('does not exist') ||
          errMsg.includes('user_study_streaks')
        ) {
          return res.status(200).json({
            tableReady: false,
            entries: [],
            viewerEntry: null,
            viewerRank: null,
          });
        }
        throw lbErr;
      }

      const now = new Date();
      const formatVnDate = (d: Date) =>
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(d);

      const todayVn = formatVnDate(now);
      const yesterdayVn = formatVnDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const tomorrowVn = formatVnDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
      const activeDateSet = new Set([yesterdayVn, todayVn, tomorrowVn]);

      const rawRows = rows || [];
      const userIds = rawRows.map((r: any) => r.user_id);
      if (user?.id && !userIds.includes(user.id)) {
        userIds.push(user.id);
      }
      const usersMap = await fetchPublicUsersMap(supabaseAdmin, userIds);

      const normalizedEntries = rawRows.map((r: any) => {
        const lastDate = typeof r.last_study_date === 'string' ? r.last_study_date : null;
        const isStreakActive = Boolean(lastDate && activeDateSet.has(lastDate));
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
      const { data: row, error } = await supabaseAdmin
        .from('user_study_streaks')
        .select('current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date, activity_by_date, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        const errCode = String((error as any)?.code || '');
        if (errCode === '42P01' || errCode === 'PGRST205') {
          return res.status(200).json({ tableReady: false, streak: null });
        }
        throw error;
      }

      return res.status(200).json({
        tableReady: true,
        streak: row || null,
      });
    }

    if (req.method === 'POST' && action === 'upsert_study_streak') {
      const sanitizeInt = (val: unknown, min: number, max: number, fallback = 0) => {
        const n = Math.floor(Number(val));
        if (!Number.isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, n));
      };

      const currentStreak = sanitizeInt(req.body?.currentStreak, 0, 5000, 0);
      const longestStreak = Math.max(currentStreak, sanitizeInt(req.body?.longestStreak, 0, 5000, 0));
      const todayCount = sanitizeInt(req.body?.todayCount, 0, 10000, 0);
      const dailyGoal = sanitizeInt(req.body?.dailyGoal, 1, 500, 20);
      const totalReviewed = sanitizeInt(req.body?.totalReviewed, 0, 5000000, 0);

      const rawDate = typeof req.body?.lastStudyDate === 'string' ? req.body.lastStudyDate.trim() : '';
      const lastStudyDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

      // Sanitize recent 65 date keys in activityByDate
      const cleanActivity: Record<string, { reviewed: number; hard: number; good: number; easy: number }> = {};
      if (req.body?.activityByDate && typeof req.body.activityByDate === 'object') {
        const validKeys = Object.keys(req.body.activityByDate)
          .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
          .sort()
          .slice(-65);

        for (const key of validKeys) {
          const entry = req.body.activityByDate[key];
          if (entry && typeof entry === 'object') {
            cleanActivity[key] = {
              reviewed: sanitizeInt(entry.reviewed, 0, 10000, 0),
              hard: sanitizeInt(entry.hard, 0, 10000, 0),
              good: sanitizeInt(entry.good, 0, 10000, 0),
              easy: sanitizeInt(entry.easy, 0, 10000, 0),
            };
          }
        }
      }

      const { data: saved, error: upErr } = await supabaseAdmin
        .from('user_study_streaks')
        .upsert(
          {
            user_id: user.id,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            today_count: todayCount,
            daily_goal: dailyGoal,
            total_reviewed: totalReviewed,
            last_study_date: lastStudyDate,
            activity_by_date: cleanActivity,
          },
          { onConflict: 'user_id' }
        )
        .select('current_streak, longest_streak, today_count, daily_goal, total_reviewed, last_study_date')
        .maybeSingle();

      if (upErr) {
        const errCode = String((upErr as any)?.code || '');
        if (errCode === '42P01' || errCode === 'PGRST205') {
          return res.status(200).json({ tableReady: false, saved: null });
        }
        throw upErr;
      }

      return res.status(200).json({ tableReady: true, saved });
    }

    return res.status(400).json({ error: `Action "${action}" không hợp lệ.` });
  } catch (err: any) {
    console.error(`Lỗi /api/community [${action}]:`, err);
    return res.status(500).json({
      error: err?.message || 'Lỗi máy chủ xử lý tính năng cộng đồng.',
    });
  }
}
