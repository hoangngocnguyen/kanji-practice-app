import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  completeGoogleOAuthCallback,
  getGoogleAuthPopupUrl,
  loginAccount,
  registerAccount,
} from '../../services/authService';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    supabaseEnabled,
    refreshProfile,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(authModalTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const cleanupPopupWatchers = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    popupRef.current = null;
  }, []);

  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalTab);
      setError(null);
      setSuccessMsg(null);
      setGoogleLoading(false);
    } else {
      cleanupPopupWatchers();
    }
  }, [isAuthModalOpen, authModalTab, cleanupPopupWatchers]);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  useEffect(() => {
    if (!isAuthModalOpen) return;

    const handleMessage = async (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin &&
        !event.origin.endsWith('.run.app') &&
        !event.origin.includes('localhost')
      ) {
        return;
      }

      const data = event.data;
      if (!data || data.type !== 'SUPABASE_GOOGLE_OAUTH_CALLBACK') return;

      cleanupPopupWatchers();
      if (popupRef.current && !popupRef.current.closed) {
        try {
          popupRef.current.close();
        } catch {}
      }

      if (data.error) {
        setGoogleLoading(false);
        setError(
          data.errorDescription ||
            'Đăng nhập Google không thành công. Vui lòng thử lại.'
        );
        return;
      }

      try {
        setGoogleLoading(true);
        await completeGoogleOAuthCallback({
          code: data.code,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        await refreshProfile();
        closeAuthModal();
      } catch (err: any) {
        setError(err?.message || 'Không thể hoàn tất đăng nhập Google.');
      } finally {
        setGoogleLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      cleanupPopupWatchers();
    };
  }, [isAuthModalOpen, cleanupPopupWatchers, refreshProfile, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!supabaseEnabled) {
      setError(
        'Ứng dụng chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
      return;
    }

    // Open popup synchronously inside user click gesture to prevent browser popup blockers
    const popup = window.open(
      'about:blank',
      'luyenkanji_google_oauth',
      'width=520,height=640,menubar=no,toolbar=no,location=yes,status=no'
    );

    if (!popup) {
      setError(
        'Trình duyệt đã chặn cửa sổ bật lên (Popup). Vui lòng cho phép Popup cho trang này rồi thử lại.'
      );
      return;
    }

    try {
      popup.document.title = 'Đang kết nối Google...';
      popup.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;text-align:center;margin-top:40vh;color:#334155;font-size:14px;">Đang chuyển tới trang đăng nhập Google...</p>';
    } catch {}

    popupRef.current = popup;
    setGoogleLoading(true);

    cleanupPopupWatchers();
    popupRef.current = popup;
    pollTimerRef.current = window.setInterval(() => {
      if (popup.closed) {
        cleanupPopupWatchers();
        setGoogleLoading(false);
      }
    }, 400);

    try {
      const oauthUrl = await getGoogleAuthPopupUrl();
      if (popup.closed) {
        cleanupPopupWatchers();
        setGoogleLoading(false);
        return;
      }
      popup.location.href = oauthUrl;
    } catch (err: any) {
      cleanupPopupWatchers();
      try {
        popup.close();
      } catch {}
      setGoogleLoading(false);
      setError(err?.message || 'Không thể mở đăng nhập Google.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!supabaseEnabled) {
      setError(
        'Ứng dụng chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setError('Vui lòng nhập tên hiển thị của bạn.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await loginAccount(email, password);
        await refreshProfile();
        closeAuthModal();
      } else {
        const res = await registerAccount(email, password, displayName);
        if (res.session) {
          await refreshProfile();
          closeAuthModal();
        } else {
          setSuccessMsg(
            'Đăng ký thành công! Vui lòng kiểm tra hộp thư email để xác nhận tài khoản rồi đăng nhập.'
          );
          setMode('login');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể xác thực tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={closeAuthModal}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              {mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mode === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Đồng bộ bộ thẻ Kanji &amp; tiến độ SRS trên mọi thiết bị
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đăng ký
            </button>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={loading || googleLoading}
            className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shadow-2xs"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal-700 shrink-0" />
            ) : (
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            <span>
              {googleLoading ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}
            </span>
          </button>

          <div className="relative flex items-center py-0.5">
            <div className="grow border-t border-slate-200" />
            <span className="shrink mx-3 text-[11px] font-medium text-slate-400">
              hoặc dùng email
            </span>
            <div className="grow border-t border-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode === 'signup' && (
              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-700 block">
                  Tên hiển thị
                </span>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ví dụ: Minh Nhật"
                    maxLength={60}
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  />
                </div>
              </label>
            )}

            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-700 block">Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-700 block">Mật khẩu</span>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="p-1 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs sm:text-[13px] font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {loading
                  ? 'Đang xử lý...'
                  : mode === 'login'
                  ? 'Đăng nhập'
                  : 'Đăng ký tài khoản'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
