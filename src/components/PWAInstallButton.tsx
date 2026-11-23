import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  ExternalLink,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  collapsed?: boolean;
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>, label: string) => void;
  onMouseLeave?: () => void;
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  collapsed = false,
  onMouseEnter,
  onMouseLeave,
  onActionComplete,
}) => {
  const {
    canInstallNative,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    promptInstall,
  } = usePWAInstall();
  const [guideMode, setGuideMode] = useState<'ios' | 'android' | null>(null);

  if (isInstalled) return null;
  if (!canInstallNative && !isIOS && !isAndroid) return null;

  const handleClick = async () => {
    if (canInstallNative) {
      const outcome = await promptInstall();
      if (outcome !== 'unavailable') {
        onActionComplete?.();
        return;
      }
    }
    if (isIOS) {
      setGuideMode('ios');
    } else if (isAndroid) {
      setGuideMode('android');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        onMouseEnter={(e) => onMouseEnter?.(e, 'Cài ứng dụng')}
        onMouseLeave={onMouseLeave}
        className={`w-full group relative flex items-center ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-3'
        } py-2 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50/90 hover:bg-teal-100/90 border border-teal-200/80 transition-all cursor-pointer`}
        aria-label="Cài ứng dụng"
      >
        {canInstallNative ? (
          <Download className="w-4 h-4 shrink-0 text-teal-700" />
        ) : (
          <Smartphone className="w-4 h-4 shrink-0 text-teal-700" />
        )}
        {!collapsed && <span className="truncate">Cài ứng dụng</span>}
      </button>

      {guideMode && (
        <div
          onClick={() => setGuideMode(null)}
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn cài đặt ứng dụng"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                {guideMode === 'ios'
                  ? 'Cài đặt trên iPhone / iPad'
                  : 'Cài đặt trên Android'}
              </h3>
              <button
                type="button"
                onClick={() => setGuideMode(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {guideMode === 'ios' ? (
              <ol className="space-y-3 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="leading-relaxed">
                    Nhấn nút <Share className="inline w-3.5 h-3.5 text-teal-700 mx-0.5" />{' '}
                    <strong>Chia sẻ</strong> trên thanh công cụ Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="leading-relaxed">
                    Chọn <PlusSquare className="inline w-3.5 h-3.5 text-teal-700 mx-0.5" />{' '}
                    <strong>Thêm vào Màn hình chính</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                {isInIframe && (
                  <p className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
                    Bạn đang xem trong khung nhúng. Hãy mở trực tiếp địa chỉ web bằng{' '}
                    <strong>Chrome</strong> để Android cho phép cài đặt.
                  </p>
                )}
                <ol className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="leading-relaxed">
                      Mở trang web bằng trình duyệt <strong>Chrome</strong> (tránh trình duyệt mở nhanh trong Zalo/Facebook).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="leading-relaxed">
                      Nhấn biểu tượng <MoreVertical className="inline w-3.5 h-3.5 text-teal-700 mx-0.5" />{' '}
                      ở góc trên bên phải → chọn <strong>Thêm vào Màn hình chính</strong> (hoặc{' '}
                      <strong>Cài đặt ứng dụng</strong>).
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <div className="flex items-center gap-2">
              {guideMode === 'android' && isInIframe && (
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở tab mới</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setGuideMode(null);
                  onActionComplete?.();
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
