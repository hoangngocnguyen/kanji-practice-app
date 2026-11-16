import React, { useEffect } from 'react';
import { Cloud, Lock, LogIn, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthGuardModal: React.FC = () => {
  const { authGuardFeature, closeAuthGuard, openAuthModal } = useAuth();

  useEffect(() => {
    if (!authGuardFeature) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthGuard();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authGuardFeature, closeAuthGuard]);

  if (!authGuardFeature) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={closeAuthGuard}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Yêu cầu đăng nhập tài khoản
              </h3>
              <p className="text-xs text-slate-500">
                Tính năng dành cho thành viên đã đăng nhập
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthGuard}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            Để sử dụng tính năng{' '}
            <strong className="text-slate-900">{authGuardFeature}</strong>, bạn
            cần đăng nhập vào tài khoản Luyện Kanji.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Cloud className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Lưu trữ an toàn toàn bộ thư mục bài học, từ ghép và tiến độ ôn
                tập SRS lên Cloud.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Tự động kiểm tra phiên bản và bảo vệ dữ liệu không bị ghi đè
                nhầm giữa nhiều thiết bị.
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeAuthGuard}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tiếp tục dùng bản Guest
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
