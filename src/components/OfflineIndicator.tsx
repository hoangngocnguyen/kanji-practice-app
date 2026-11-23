import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAInstall();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBackOnline(false);
    } else if (wasOffline) {
      setShowBackOnline(true);
      const t = window.setTimeout(() => {
        setShowBackOnline(false);
        setWasOffline(false);
      }, 2600);
      return () => window.clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showBackOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 border-b transition-colors ${
        !isOnline
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Đang ngoại tuyến · Tra cứu, ôn thẻ SRS &amp; luyện viết vẫn hoạt động</span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>Đã kết nối mạng trở lại</span>
        </>
      )}
    </div>
  );
};
