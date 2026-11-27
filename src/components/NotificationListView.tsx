import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  Flame,
  Heart,
  Loader2,
  ShieldAlert,
  Snowflake,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification } from '../services/notificationService';
import { UserAvatar } from './UserAvatar';

interface NotificationListViewProps {
  onNavigate?: () => void;
  compact?: boolean;
}

function formatRelativeVi(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'friend_streak_invite':
    case 'friend_streak_accepted':
    case 'friend_streak_milestone':
      return <Flame className="w-4 h-4 text-orange-500" />;
    case 'friend_streak_nudge':
    case 'streak_danger_reminder':
      return <ShieldAlert className="w-4 h-4 text-amber-600" />;
    case 'friend_streak_rescued':
    case 'freeze_auto_used':
    case 'freeze_recharged':
      return <Snowflake className="w-4 h-4 text-sky-600" />;
    case 'new_follower':
      return <UserPlus className="w-4 h-4 text-teal-700" />;
    case 'deck_liked':
      return <Heart className="w-4 h-4 text-rose-500" />;
    default:
      return <Users className="w-4 h-4 text-teal-700" />;
  }
}

export const NotificationListView: React.FC<NotificationListViewProps> = ({
  onNavigate,
  compact = false,
}) => {
  const {
    tableReady,
    notifications,
    unreadCount,
    isLoading,
    activeFilter,
    setActiveFilter,
    markAllAsRead,
    deleteNotification,
    openNotificationTarget,
    pushSupported,
    pushServerConfigured,
    pushPermission,
    isPushSubscribed,
    isPushBusy,
    needsIosHomeScreenInstall,
    enableWebPush,
    disableWebPush,
  } = useNotifications();

  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const visibleList =
    activeFilter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleTogglePush = async () => {
    setPushMessage(null);
    try {
      if (isPushSubscribed) {
        await disableWebPush();
        setPushMessage('Đã tắt thông báo đẩy trên thiết bị này.');
      } else {
        const granted = await enableWebPush();
        if (!granted) {
          setPushMessage(
            pushPermission === 'denied'
              ? 'Bạn đã chặn thông báo trong cài đặt trình duyệt.'
              : 'Chưa cấp quyền hiển thị thông báo trên thiết bị.'
          );
        }
      }
    } catch (err: any) {
      setPushMessage(err?.message || 'Không thể bật thông báo đẩy lúc này.');
    }
  };

  const handleClickNotification = async (item: AppNotification) => {
    onNavigate?.();
    await openNotificationTarget(item);
  };

  return (
    <div className="flex flex-col">
      {/* Top Filter & Mark-All-Read Controls */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/70">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer transition-colors ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md cursor-pointer tabular-nums transition-colors ${
              activeFilter === 'unread'
                ? 'bg-white text-teal-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 px-2 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Đọc tất cả</span>
          </button>
        )}
      </div>

      {/* Web Push Opt-In Bar */}
      {pushSupported && (
        <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 space-y-1">
          {needsIosHomeScreenInstall ? (
            <p className="text-[11px] text-slate-600 leading-snug">
              Trên iPhone/iPad: chọn <strong>Chia sẻ &gt; Thêm vào MH chính</strong> để nhận thông báo đẩy khi đóng app.
            </p>
          ) : !pushServerConfigured ? (
            <p className="text-[11px] text-slate-500">
              Thông báo trong ứng dụng đang bật (Realtime). Web Push nền cần cấu hình khóa VAPID trên máy chủ.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isPushSubscribed ? (
                  <BellRing className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                ) : (
                  <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="text-[11px] font-semibold text-slate-700 truncate">
                  {isPushSubscribed
                    ? 'Đang bật thông báo đẩy thiết bị'
                    : 'Nhận thông báo kể cả khi đóng web'}
                </span>
              </div>
              <button
                type="button"
                disabled={isPushBusy}
                onClick={() => void handleTogglePush()}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer disabled:opacity-50 shrink-0 transition-colors ${
                  isPushSubscribed
                    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-teal-700 text-white border-teal-700 hover:bg-teal-800'
                }`}
              >
                {isPushBusy ? '...' : isPushSubscribed ? 'Tắt' : 'Bật ngay'}
              </button>
            </div>
          )}
          {pushMessage && (
            <p className="text-[11px] font-medium text-amber-700">{pushMessage}</p>
          )}
        </div>
      )}

      {/* List Body */}
      <div
        className={`overflow-y-auto divide-y divide-slate-100 ${
          compact ? 'max-h-[320px]' : 'max-h-[380px]'
        }`}
      >
        {!tableReady ? (
          <div className="p-5 text-center text-xs text-amber-800 bg-amber-50/70">
            Chưa chạy script migration <code className="font-mono font-bold">docs/supabase_friend_streak_notifications_migration.sql</code> trên Supabase.
          </div>
        ) : isLoading && notifications.length === 0 ? (
          <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
            <span>Đang tải thông báo...</span>
          </div>
        ) : visibleList.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-1.5">
            <Bell className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              {activeFilter === 'unread'
                ? 'Bạn đã đọc hết tất cả thông báo.'
                : 'Chưa có thông báo nào.'}
            </p>
          </div>
        ) : (
          visibleList.map((item) => (
            <div
              key={item.id}
              className={`group flex items-stretch transition-colors ${
                item.isRead
                  ? 'bg-white hover:bg-slate-50/80'
                  : 'bg-teal-50/45 hover:bg-teal-50/80 border-l-2 border-l-teal-700'
              }`}
            >
              <button
                type="button"
                onClick={() => void handleClickNotification(item)}
                className="flex-1 text-left px-3.5 py-2.5 min-h-[48px] flex items-start gap-2.5 cursor-pointer min-w-0"
              >
                <div className="relative shrink-0 mt-0.5">
                  {item.actor ? (
                    <UserAvatar
                      name={item.actor.displayName}
                      avatarUrl={item.actor.avatarUrl}
                      sizeClass="w-8 h-8"
                      textSizeClass="text-[11px]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {getNotificationIcon(item.type)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-xs leading-snug ${
                        item.isRead
                          ? 'font-medium text-slate-700'
                          : 'font-bold text-slate-900'
                      }`}
                    >
                      {item.title}
                    </p>
                  </div>
                  {item.body && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {item.body}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 tabular-nums pt-0.5">
                    <span>{formatRelativeVi(item.createdAt)}</span>
                    {!item.isRead && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-teal-700">Chưa đọc</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => void deleteNotification(item.id)}
                className="px-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50/60 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Xóa thông báo"
                aria-label="Xóa thông báo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
