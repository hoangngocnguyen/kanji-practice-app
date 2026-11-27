import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, ArrowRight, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const NotificationBannerToast: React.FC = () => {
  const navigate = useNavigate();
  const { banner, dismissBanner, markAsRead } = useNotifications();

  if (!banner) return null;

  const handleOpen = () => {
    if (banner.notificationId && banner.unreadCount === 1) {
      void markAsRead(banner.notificationId);
    }
    const url = banner.actionUrl || '/leaderboard?tab=friends';
    dismissBanner();
    navigate(url);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] z-50 bg-white border border-teal-200 shadow-2xl rounded-2xl p-3.5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-150 print:hidden"
    >
      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
        <BellRing className="w-4 h-4" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-extrabold text-slate-900 leading-snug">
          {banner.title}
        </p>
        {banner.body && (
          <p className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
            {banner.body}
          </p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleOpen}
            className="px-3 py-1.5 min-h-[32px] text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Xem ngay</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            className="px-2.5 py-1.5 min-h-[32px] text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={dismissBanner}
        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer shrink-0"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
