import { sendNotification, setVapidDetails } from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_ACTION_PREFIXES = [
  '/leaderboard',
  '/u/',
  '/share/',
  '/invite/',
  '/profile',
  '/decks',
  '/shares',
  '/arena',
  '/kanji',
  '/levels',
];

export function sanitizeInternalActionUrl(raw: unknown, fallback = '/leaderboard'): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }
  const matchesAllowed = ALLOWED_ACTION_PREFIXES.some((prefix) =>
    value.startsWith(prefix)
  );
  return matchesAllowed ? value.slice(0, 300) : fallback;
}

export function getVapidConfig() {
  const publicKey = (
    process.env.VAPID_PUBLIC_KEY ||
    process.env.VITE_VAPID_PUBLIC_KEY ||
    ''
  ).trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (
    process.env.VAPID_SUBJECT || 'mailto:support@luyenkanji.vercel.app'
  ).trim();

  return {
    configured: Boolean(publicKey && privateKey),
    publicKey,
    privateKey,
    subject,
  };
}

let vapidInitializedKey = '';

function ensureWebPushConfigured(): boolean {
  const cfg = getVapidConfig();
  if (!cfg.configured) return false;
  const signature = `${cfg.subject}:${cfg.publicKey}`;
  if (vapidInitializedKey !== signature) {
    setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    vapidInitializedKey = signature;
  }
  return true;
}

export function isMissingTableError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === '42703' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

export interface DispatchNotificationInput {
  userId: string;
  actorId?: string | null;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  sendPush?: boolean;
  tag?: string;
}

export async function dispatchWebPushToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: {
    title: string;
    body: string;
    url: string;
    notificationId?: string;
    type?: string;
    tag?: string;
  }
): Promise<{ sent: number; deactivated: number }> {
  if (!ensureWebPushConfigured()) {
    return { sent: 0, deactivated: 0 };
  }

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(12);

  if (error || !subs || subs.length === 0) {
    return { sent: 0, deactivated: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: sanitizeInternalActionUrl(payload.url),
    notificationId: payload.notificationId || null,
    type: payload.type || 'general',
    tag: payload.tag || payload.type || 'luyenkanji-notification',
  });

  let sent = 0;
  let deactivated = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload,
          { TTL: 60 * 60 * 12 }
        );
        sent += 1;
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || err?.status || 0);
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    deactivated = expiredIds.length;
    await supabaseAdmin
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', expiredIds);
  }

  return { sent, deactivated };
}

export async function createNotificationAndPush(
  supabaseAdmin: SupabaseClient,
  input: DispatchNotificationInput
): Promise<string | null> {
  if (!input.userId) return null;

  const safeUrl = sanitizeInternalActionUrl(input.actionUrl, '/leaderboard');
  const title = String(input.title || '').trim().slice(0, 140);
  const body = String(input.body || '').trim().slice(0, 320);
  if (!title) return null;

  let createdId: string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: input.userId,
        actor_id: input.actorId || null,
        type: input.type,
        title,
        body,
        action_url: safeUrl,
        metadata: input.metadata || {},
        is_read: false,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('Insert notification warning:', error.message);
      }
    } else {
      createdId = data?.id || null;
    }
  } catch {
    // Non-blocking when migration hasn't been executed yet
  }

  if (input.sendPush !== false) {
    try {
      await dispatchWebPushToUser(supabaseAdmin, input.userId, {
        title,
        body,
        url: safeUrl,
        notificationId: createdId || undefined,
        type: input.type,
        tag: input.tag || `lk-${input.type}`,
      });
    } catch {
      // Non-blocking push failure
    }
  }

  return createdId;
}
