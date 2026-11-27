import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureUserProfile, requireAuth, setCorsHeaders } from './_lib/auth.js';
import { getSupabaseAdmin, isServerSupabaseConfigured } from './_lib/supabaseAdmin.js';
import {
  createNotificationAndPush,
  getVapidConfig,
  isMissingTableError,
} from './_lib/notifications.js';

function getTodayVn(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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
    // Public VAPID key check so frontend knows if background push is enabled on server
    if (req.method === 'GET' && action === 'vapid_public_key') {
      const cfg = getVapidConfig();
      return res.status(200).json({
        configured: cfg.configured,
        publicKey: cfg.configured ? cfg.publicKey : null,
      });
    }

    // Daily background Streak Reminder Cron (runs at 20:00 Asia/Ho_Chi_Minh via Vercel Cron)
    if (action === 'cron_daily_reminders') {
      if (!isServerSupabaseConfigured()) {
        return res.status(503).json({ error: 'Supabase chưa được cấu hình.' });
      }
      const expectedSecret = (process.env.CRON_SECRET || '').trim();
      const authHeader = String(
        req.headers?.authorization || req.headers?.Authorization || ''
      ).trim();
      const bearerSecret = authHeader.replace(/^Bearer\s+/i, '').trim();
      const querySecret = String(req.query?.secret || '').trim();

      if (expectedSecret && bearerSecret !== expectedSecret && querySecret !== expectedSecret) {
        return res.status(401).json({ error: 'Cron secret không hợp lệ.' });
      }

      const supabaseAdmin = getSupabaseAdmin();
      const todayVn = getTodayVn();

      const { data: streaks, error: stErr } = await supabaseAdmin
        .from('user_study_streaks')
        .select('user_id, current_streak, last_study_date, streak_freezes')
        .gte('current_streak', 1)
        .limit(500);

      if (stErr) {
        if (isMissingTableError(stErr)) {
          return res.status(200).json({ tableReady: false, sentCount: 0 });
        }
        throw stErr;
      }

      const candidates = (streaks || []).filter(
        (row: any) => row.last_study_date && row.last_study_date !== todayVn
      );

      if (candidates.length === 0) {
        return res.status(200).json({ tableReady: true, sentCount: 0 });
      }

      const candidateIds = candidates.map((c: any) => c.user_id);
      const { data: alreadySentRows } = await supabaseAdmin
        .from('notifications')
        .select('user_id, metadata')
        .in('user_id', candidateIds)
        .eq('type', 'streak_danger_reminder')
        .order('created_at', { ascending: false })
        .limit(500);

      const sentTodaySet = new Set<string>();
      for (const r of alreadySentRows || []) {
        if (r?.metadata?.date === todayVn) {
          sentTodaySet.add(r.user_id);
        }
      }

      let sentCount = 0;
      for (const item of candidates) {
        if (sentTodaySet.has(item.user_id)) continue;
        const streakVal = Number(item.current_streak || 0);
        const freezes = Number(item.streak_freezes ?? 1);
        await createNotificationAndPush(supabaseAdmin, {
          userId: item.user_id,
          type: 'streak_danger_reminder',
          title: `Đừng để mất chuỗi ${streakVal} ngày hôm nay!`,
          body:
            freezes > 0
              ? `Ôn nhanh ít nhất 1 thẻ Flashcard trước nửa đêm để giữ ngọn lửa và tiết kiệm ${freezes} Băng Streak.`
              : 'Ôn nhanh ít nhất 1 thẻ Flashcard ngay để giữ chuỗi học của bạn và bạn bè.',
          actionUrl: '/decks',
          metadata: { date: todayVn, streak: streakVal },
          sendPush: true,
          tag: `streak-reminder-${todayVn}`,
        });
        sentCount += 1;
      }

      return res.status(200).json({ tableReady: true, sentCount });
    }

    // All remaining notification & push actions require authenticated user
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { user, supabaseAdmin } = auth;

    await ensureUserProfile(supabaseAdmin, user).catch(() => null);

    if (req.method === 'GET' && action === 'list') {
      const filter = String(req.query?.filter || 'all').trim();
      const limit = Math.max(5, Math.min(50, Number(req.query?.limit) || 30));

      let listQuery = supabaseAdmin
        .from('notifications')
        .select('id, actor_id, type, title, body, action_url, metadata, is_read, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filter === 'unread') {
        listQuery = listQuery.eq('is_read', false);
      }

      const [
        { data: rows, error: listErr },
        { count: unreadCount, error: countErr },
      ] = await Promise.all([
        listQuery,
        supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ]);

      if (listErr || countErr) {
        const err = listErr || countErr;
        if (isMissingTableError(err)) {
          return res.status(200).json({
            tableReady: false,
            notifications: [],
            unreadCount: 0,
          });
        }
        throw err;
      }

      const actorIds = Array.from(
        new Set((rows || []).map((r: any) => r.actor_id).filter(Boolean))
      );
      const actorsMap = new Map<
        string,
        { id: string; displayName: string; avatarUrl: string | null }
      >();

      if (actorIds.length > 0) {
        const { data: actorProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', actorIds);

        for (const prof of actorProfiles || []) {
          actorsMap.set(prof.id, {
            id: prof.id,
            displayName: (prof.display_name || '').trim() || 'Thành viên',
            avatarUrl: prof.avatar_url || null,
          });
        }
      }

      return res.status(200).json({
        tableReady: true,
        unreadCount: unreadCount || 0,
        notifications: (rows || []).map((r: any) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          body: r.body || '',
          actionUrl: r.action_url || '/leaderboard',
          metadata: r.metadata || {},
          isRead: Boolean(r.is_read),
          readAt: r.read_at || null,
          createdAt: r.created_at,
          actor: r.actor_id ? actorsMap.get(r.actor_id) || null : null,
        })),
      });
    }

    if (req.method === 'POST' && action === 'mark_read') {
      const markAll = Boolean(req.body?.markAll);
      const notificationId = String(req.body?.notificationId || '').trim();
      const nowIso = new Date().toISOString();

      if (markAll) {
        const { error } = await supabaseAdmin
          .from('notifications')
          .update({ is_read: true, read_at: nowIso })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (error) {
          if (isMissingTableError(error)) {
            return res.status(200).json({ tableReady: false, unreadCount: 0 });
          }
          throw error;
        }
      } else {
        if (!notificationId) {
          return res.status(400).json({ error: 'Thiếu notificationId.' });
        }
        const { error } = await supabaseAdmin
          .from('notifications')
          .update({ is_read: true, read_at: nowIso })
          .eq('id', notificationId)
          .eq('user_id', user.id);

        if (error) {
          if (isMissingTableError(error)) {
            return res.status(200).json({ tableReady: false, unreadCount: 0 });
          }
          throw error;
        }
      }

      const { count: unreadCount } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      return res.status(200).json({
        tableReady: true,
        unreadCount: unreadCount || 0,
      });
    }

    if (req.method === 'POST' && action === 'delete_notification') {
      const notificationId = String(req.body?.notificationId || '').trim();
      if (!notificationId) {
        return res.status(400).json({ error: 'Thiếu notificationId.' });
      }

      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error && !isMissingTableError(error)) throw error;

      const { count: unreadCount } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      return res.status(200).json({
        tableReady: true,
        unreadCount: unreadCount || 0,
      });
    }

    if (req.method === 'POST' && action === 'subscribe_push') {
      const endpoint = String(req.body?.endpoint || '').trim();
      const p256dh = String(req.body?.keys?.p256dh || req.body?.p256dh || '').trim();
      const authKey = String(req.body?.keys?.auth || req.body?.auth || '').trim();
      const userAgent = String(req.body?.userAgent || '').trim().slice(0, 240);

      if (!/^https:\/\//i.test(endpoint) || !p256dh || !authKey) {
        return res.status(400).json({ error: 'Thông tin đăng ký Web Push không hợp lệ.' });
      }

      const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: endpoint.slice(0, 1000),
          p256dh: p256dh.slice(0, 500),
          auth: authKey.slice(0, 500),
          user_agent: userAgent,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({ tableReady: false, subscribed: false });
        }
        throw error;
      }

      return res.status(200).json({ tableReady: true, subscribed: true });
    }

    if (req.method === 'POST' && action === 'unsubscribe_push') {
      const endpoint = String(req.body?.endpoint || '').trim();
      if (endpoint) {
        const { error } = await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
        if (error && !isMissingTableError(error)) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
        if (error && !isMissingTableError(error)) throw error;
      }

      return res.status(200).json({ tableReady: true, subscribed: false });
    }

    return res.status(400).json({ error: `Action "${action}" không hợp lệ.` });
  } catch (err: any) {
    console.error(`Lỗi /api/notifications [${action}]:`, err);
    return res.status(500).json({
      error: err?.message || 'Lỗi máy chủ xử lý thông báo.',
    });
  }
}
