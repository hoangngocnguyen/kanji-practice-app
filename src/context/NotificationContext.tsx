import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabaseClient';
import {
  apiDeleteNotification,
  apiGetVapidPublicKey,
  apiListNotifications,
  apiMarkNotificationRead,
  AppNotification,
  getExistingPushSubscription,
  isStandaloneIosDevice,
  isWebPushSupported,
  subscribeBrowserToWebPush,
  unsubscribeBrowserFromWebPush,
} from '../services/notificationService';
import { FRIEND_STREAKS_UPDATED_EVENT } from '../services/friendStreakService';

interface ArrivalBannerState {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  unreadCount: number;
  notificationId?: string;
}

interface NotificationContextValue {
  tableReady: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  activeFilter: 'all' | 'unread';
  setActiveFilter: (filter: 'all' | 'unread') => void;
  refreshNotifications: (silent?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  openNotificationTarget: (item: AppNotification) => Promise<void>;

  // Arrival & Live popup banner
  banner: ArrivalBannerState | null;
  dismissBanner: () => void;

  // Web Push PWA state
  pushSupported: boolean;
  pushServerConfigured: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  isPushSubscribed: boolean;
  isPushBusy: boolean;
  needsIosHomeScreenInstall: boolean;
  enableWebPush: () => Promise<boolean>;
  disableWebPush: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, supabaseEnabled } = useAuth();
  const navigate = useNavigate();

  const [tableReady, setTableReady] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [banner, setBanner] = useState<ArrivalBannerState | null>(null);

  const pushSupported = isWebPushSupported();
  const needsIosHomeScreenInstall = isStandaloneIosDevice();
  const [pushServerConfigured, setPushServerConfigured] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(
    () => (pushSupported ? Notification.permission : 'unsupported')
  );
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushBusy, setIsPushBusy] = useState(false);

  const arrivalShownUserRef = useRef<string | null>(null);

  const refreshNotifications = useCallback(
    async (silent = false) => {
      if (!user || !supabaseEnabled) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      if (!silent) setIsLoading(true);
      try {
        const res = await apiListNotifications('all', 35);
        setTableReady(res.tableReady);
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);

        // Show non-blocking arrival banner once per session when entering with unread items
        if (
          res.tableReady &&
          res.unreadCount > 0 &&
          arrivalShownUserRef.current !== user.id
        ) {
          arrivalShownUserRef.current = user.id;
          const latestUnread = res.notifications.find((n) => !n.isRead);
          if (latestUnread) {
            setBanner({
              id: `arrival-${latestUnread.id}`,
              notificationId: latestUnread.id,
              title:
                res.unreadCount > 1
                  ? `Bạn có ${res.unreadCount} thông báo mới`
                  : latestUnread.title,
              body:
                res.unreadCount > 1
                  ? `Mới nhất: ${latestUnread.title}`
                  : latestUnread.body || 'Nhấn để xem chi tiết.',
              actionUrl: latestUnread.actionUrl || '/leaderboard?tab=friends',
              unreadCount: res.unreadCount,
            });
          }
        }
      } catch {
        // Non-blocking
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [user, supabaseEnabled]
  );

  // Initial fetch + Push capability check when user changes
  useEffect(() => {
    if (!user || !supabaseEnabled) {
      arrivalShownUserRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setBanner(null);
      setIsPushSubscribed(false);
      return;
    }

    void refreshNotifications(false);

    if (pushSupported) {
      setPushPermission(Notification.permission);
      void Promise.all([apiGetVapidPublicKey(), getExistingPushSubscription()]).then(
        ([vapid, sub]) => {
          setPushServerConfigured(vapid.configured);
          setIsPushSubscribed(Boolean(sub));
        }
      );
    }
  }, [user, supabaseEnabled, pushSupported, refreshNotifications]);

  // Supabase Realtime subscription on public.notifications
  useEffect(() => {
    if (!user || !supabaseEnabled || !supabase) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row?.id) return;

          const newItem: AppNotification = {
            id: row.id,
            type: row.type || 'general',
            title: row.title || 'Thông báo mới',
            body: row.body || '',
            actionUrl: row.action_url || '/leaderboard?tab=friends',
            metadata: row.metadata || {},
            isRead: Boolean(row.is_read),
            readAt: row.read_at || null,
            createdAt: row.created_at || new Date().toISOString(),
            actor: null,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newItem.id)) return prev;
            return [newItem, ...prev].slice(0, 40);
          });
          if (!newItem.isRead) {
            setUnreadCount((c) => c + 1);
            setBanner({
              id: `live-${newItem.id}`,
              notificationId: newItem.id,
              title: newItem.title,
              body: newItem.body || 'Nhấn để mở ngay.',
              actionUrl: newItem.actionUrl,
              unreadCount: 1,
            });
          }

          if (
            typeof newItem.type === 'string' &&
            newItem.type.startsWith('friend_streak_')
          ) {
            window.dispatchEvent(new CustomEvent(FRIEND_STREAKS_UPDATED_EVENT));
          }

          // Hydrate actor metadata in background
          void refreshNotifications(true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, supabaseEnabled, refreshNotifications]);

  // Refresh notifications when browser tab becomes visible again
  useEffect(() => {
    if (!user || !supabaseEnabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshNotifications(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, supabaseEnabled, refreshNotifications]);

  // Listen for Service Worker notificationclick navigation messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'NAVIGATE_TO' && typeof data.url === 'string') {
        if (data.notificationId && user) {
          void apiMarkNotificationRead({ notificationId: data.notificationId }).catch(
            () => null
          );
        }
        navigate(data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate, user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId && !n.isRead
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const res = await apiMarkNotificationRead({ notificationId });
      setUnreadCount(res.unreadCount);
    } catch {
      void refreshNotifications(true);
    }
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
    setBanner(null);
    try {
      const res = await apiMarkNotificationRead({ markAll: true });
      setUnreadCount(res.unreadCount);
    } catch {
      void refreshNotifications(true);
    }
  }, [refreshNotifications]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const target = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      try {
        const res = await apiDeleteNotification(notificationId);
        setUnreadCount(res.unreadCount);
      } catch {
        void refreshNotifications(true);
      }
    },
    [notifications, refreshNotifications]
  );

  const openNotificationTarget = useCallback(
    async (item: AppNotification) => {
      if (!item.isRead) {
        void markAsRead(item.id);
      }
      setBanner(null);
      const target =
        item.actionUrl && item.actionUrl.startsWith('/') && !item.actionUrl.startsWith('//')
          ? item.actionUrl
          : '/leaderboard?tab=friends';
      navigate(target);
    },
    [markAsRead, navigate]
  );

  const dismissBanner = useCallback(() => {
    setBanner(null);
  }, []);

  const enableWebPush = useCallback(async () => {
    if (!pushSupported) return false;
    setIsPushBusy(true);
    try {
      const res = await subscribeBrowserToWebPush();
      setPushPermission(res.permission);
      setIsPushSubscribed(res.subscribed);
      return res.subscribed;
    } finally {
      setIsPushBusy(false);
    }
  }, [pushSupported]);

  const disableWebPush = useCallback(async () => {
    setIsPushBusy(true);
    try {
      await unsubscribeBrowserFromWebPush();
      setIsPushSubscribed(false);
    } finally {
      setIsPushBusy(false);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        tableReady,
        notifications,
        unreadCount,
        isLoading,
        activeFilter,
        setActiveFilter,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        openNotificationTarget,
        banner,
        dismissBanner,
        pushSupported,
        pushServerConfigured,
        pushPermission,
        isPushSubscribed,
        isPushBusy,
        needsIosHomeScreenInstall,
        enableWebPush,
        disableWebPush,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};
