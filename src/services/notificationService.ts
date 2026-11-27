import { getSupabaseAccessToken } from '../utils/supabaseClient';

export interface NotificationActor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string;
  metadata: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActor | null;
}

export interface NotificationsListResponse {
  tableReady: boolean;
  unreadCount: number;
  notifications: AppNotification[];
}

async function getRequiredToken(): Promise<string> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    throw new Error('Vui lòng đăng nhập để xem thông báo.');
  }
  return token;
}

export async function apiListNotifications(
  filter: 'all' | 'unread' = 'all',
  limit = 30
): Promise<NotificationsListResponse> {
  const token = await getRequiredToken();
  const res = await fetch(
    `/api/notifications?action=list&filter=${encodeURIComponent(filter)}&limit=${encodeURIComponent(String(limit))}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể tải danh sách thông báo.');
  }
  return {
    tableReady: Boolean(data?.tableReady),
    unreadCount: Number(data?.unreadCount || 0),
    notifications: Array.isArray(data?.notifications) ? data.notifications : [],
  };
}

export async function apiMarkNotificationRead(params: {
  notificationId?: string;
  markAll?: boolean;
}): Promise<{ tableReady: boolean; unreadCount: number }> {
  const token = await getRequiredToken();
  const res = await fetch('/api/notifications', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'mark_read',
      ...params,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể cập nhật trạng thái thông báo.');
  }
  return {
    tableReady: Boolean(data?.tableReady),
    unreadCount: Number(data?.unreadCount || 0),
  };
}

export async function apiDeleteNotification(
  notificationId: string
): Promise<{ tableReady: boolean; unreadCount: number }> {
  const token = await getRequiredToken();
  const res = await fetch('/api/notifications', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'delete_notification',
      notificationId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể xóa thông báo.');
  }
  return {
    tableReady: Boolean(data?.tableReady),
    unreadCount: Number(data?.unreadCount || 0),
  };
}

export async function apiGetVapidPublicKey(): Promise<{
  configured: boolean;
  publicKey: string | null;
}> {
  const clientEnvKey = (
    (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || ''
  ).trim();
  if (clientEnvKey) {
    return { configured: true, publicKey: clientEnvKey };
  }
  try {
    const res = await fetch('/api/notifications?action=vapid_public_key', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return { configured: false, publicKey: null };
    const data = await res.json().catch(() => ({}));
    return {
      configured: Boolean(data?.configured && data?.publicKey),
      publicKey: data?.publicKey || null,
    };
  } catch {
    return { configured: false, publicKey: null };
  }
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function isStandaloneIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/i.test(ua);
  const isStandalone =
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return isIos && !isStandalone;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeBrowserToWebPush(): Promise<{
  subscribed: boolean;
  permission: NotificationPermission;
}> {
  if (!isWebPushSupported()) {
    throw new Error('Trình duyệt hiện tại không hỗ trợ Web Push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { subscribed: false, permission };
  }

  const vapid = await apiGetVapidPublicKey();
  if (!vapid.configured || !vapid.publicKey) {
    throw new Error(
      'Máy chủ chưa cấu hình khóa VAPID Web Push (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).'
    );
  }

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    const applicationServerKey = urlBase64ToUint8Array(vapid.publicKey);
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });
  }

  const subJson = subscription.toJSON();
  const token = await getRequiredToken();
  const res = await fetch('/api/notifications', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'subscribe_push',
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      userAgent: navigator.userAgent,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể lưu đăng ký thông báo đẩy.');
  }
  return { subscribed: Boolean(data?.subscribed), permission };
}

export async function unsubscribeBrowserFromWebPush(): Promise<void> {
  if (!isWebPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  const endpoint = subscription?.endpoint || '';
  if (subscription) {
    await subscription.unsubscribe().catch(() => false);
  }

  const token = await getSupabaseAccessToken();
  if (token) {
    await fetch('/api/notifications', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'unsubscribe_push',
        endpoint,
      }),
    }).catch(() => null);
  }
}
