/// <reference lib="es2022" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  PrecacheEntry,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

interface SwExtendableEvent extends Event {
  waitUntil: (promise: Promise<unknown>) => void;
}

interface SwPushEvent extends SwExtendableEvent {
  data: {
    json: () => any;
    text: () => string;
  } | null;
}

interface SwNotificationEvent extends SwExtendableEvent {
  notification: Notification & { data?: any };
}

interface SwWindowClient {
  url: string;
  focused?: boolean;
  focus: () => Promise<SwWindowClient>;
  postMessage: (message: any) => void;
}

interface SwClients {
  matchAll: (options?: { type?: string; includeUncontrolled?: boolean }) => Promise<SwWindowClient[]>;
  openWindow: (url: string) => Promise<SwWindowClient | null>;
}

interface SwGlobalScope {
  skipWaiting: () => Promise<void>;
  clients: SwClients;
  location: Location;
  registration: ServiceWorkerRegistration;
  addEventListener: (type: string, listener: (event: any) => void) => void;
}

declare global {
  interface Window {
    __WB_MANIFEST?: Array<PrecacheEntry | string>;
  }
}

const sw = self as unknown as SwGlobalScope;

void sw.skipWaiting();
clientsClaim();

const manifest = self.__WB_MANIFEST || [];
precacheAndRoute(manifest);
cleanupOutdatedCaches();

const hasIndexInPrecache = manifest.some((entry) =>
  typeof entry === 'string'
    ? entry.endsWith('index.html')
    : Boolean(entry?.url?.endsWith('index.html'))
);

if (hasIndexInPrecache) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
      denylist: [/^\/api\//],
    })
  );
}

registerRoute(
  /^https:\/\/(cdn\.jsdelivr\.net|raw\.githubusercontent\.com)\/.*\.svg$/i,
  new CacheFirst({
    cacheName: 'kanjivg-svg-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 3500,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 15,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

function sanitizeTargetUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return '/leaderboard?tab=friends';
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/leaderboard?tab=friends';
  }
  return trimmed;
}

sw.addEventListener('push', (event: SwPushEvent) => {
  let payload: Record<string, any> = {};
  if (event.data) {
    try {
      payload = event.data.json() || {};
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : 'Luyện Kanji Pro';
  const body =
    typeof payload.body === 'string' && payload.body.trim()
      ? payload.body.trim()
      : 'Bạn có thông báo mới về chuỗi ngày học.';
  const targetUrl = sanitizeTargetUrl(payload.url);

  const options: NotificationOptions = {
    body,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag:
      typeof payload.tag === 'string' && payload.tag
        ? payload.tag
        : 'luyenkanji-notification',
    data: {
      url: targetUrl,
      notificationId: payload.notificationId || null,
      type: payload.type || 'general',
    },
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener('notificationclick', (event: SwNotificationEvent) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetPath = sanitizeTargetUrl(data.url);
  const fullUrl = new URL(targetPath, sw.location.origin).href;

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(sw.location.origin)) {
            return client.focus().then((focused) => {
              focused.postMessage({
                type: 'NAVIGATE_TO',
                url: targetPath,
                notificationId: data.notificationId || null,
              });
              return focused;
            });
          }
        }
        return sw.clients.openWindow(fullUrl);
      })
  );
});
