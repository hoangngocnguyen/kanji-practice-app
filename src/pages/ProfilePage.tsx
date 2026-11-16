import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Cloud,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDecks } from '../context/DeckContext';

export const ProfilePage: React.FC = () => {
  const {
    user,
    profile,
    isAuthLoading,
    displayName,
    avatarInitials,
    updateDisplayName,
    logout,
    openAuthModal,
    supabaseEnabled,
  } = useAuth();

  const {
    folders,
    items,
    lastSyncedAt,
    lastSyncedVersion,
    hasUnsyncedChanges,
    isSyncing,
    syncMessage,
    syncError,
    triggerAnkiSync,
  } = useDecks();

  const [nameInput, setNameInput] = useState(displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameSavedMsg, setNameSavedMsg] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(displayName);
  }, [displayName]);

  if (isAuthLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
        <span>Đang tải thông tin tài khoản...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
          <UserIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">
            Bạn đang dùng chế độ Khách (Guest)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Đăng nhập hoặc tạo tài khoản để quản lý hồ sơ cá nhân và đồng bộ bộ
            thẻ Flashcard SRS trên nhiều thiết bị.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập / Đăng ký</span>
        </button>
      </div>
    );
  }

  const joinedDate = new Date(
    profile?.createdAt || user.created_at || Date.now()
  ).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSavedMsg(null);
    if (!nameInput.trim()) {
      setNameError('Tên hiển thị không được để trống.');
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(nameInput.trim());
      setNameSavedMsg('Đã cập nhật tên hiển thị thành công.');
    } catch (err: any) {
      setNameError(err?.message || 'Không thể cập nhật tên hiển thị.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Account Profile Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-teal-700 text-white font-bold text-xl flex items-center justify-center shrink-0 ring-4 ring-teal-50">
              {avatarInitials}
            </div>
            <div className="space-y-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tham gia {joinedDate}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer shrink-0 self-start sm:self-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>

        <form onSubmit={handleSaveName} className="space-y-3 max-w-md">
          <label className="block space-y-1.5 text-xs">
            <span className="font-semibold text-slate-700 block">
              Tên hiển thị (Display Name)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setNameSavedMsg(null);
                  setNameError(null);
                }}
                maxLength={60}
                placeholder="Nhập tên hiển thị..."
                className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
              />
              <button
                type="submit"
                disabled={savingName || nameInput.trim() === displayName}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                {savingName ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </label>

          {nameError && (
            <p className="text-xs text-rose-600 font-medium">{nameError}</p>
          )}
          {nameSavedMsg && (
            <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{nameSavedMsg}</span>
            </p>
          )}
        </form>
      </section>

      {/* Cloud Sync Summary Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-teal-700" />
              <span>Đồng bộ Flashcard SRS</span>
            </h2>
            <p className="text-xs text-slate-500">
              Kiểm tra phiên bản và đồng bộ 2 chiều chuẩn AnkiDroid
            </p>
          </div>

          {supabaseEnabled && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => triggerAnkiSync()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>
                {isSyncing ? 'Đang kiểm tra...' : 'Kiểm tra & Đồng bộ ngay'}
              </span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-xs tabular-nums">
          <div>
            <div className="text-slate-500">Thư mục trên máy</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {folders.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Chữ Kanji trên máy</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {items.length}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Phiên bản Sync</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              v{profile?.syncVersion ?? lastSyncedVersion}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Đồng bộ gần nhất</div>
            <div className="text-xs font-semibold text-slate-900 mt-1">
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })
                : 'Chưa đồng bộ'}
            </div>
          </div>
        </div>

        {hasUnsyncedChanges && (
          <p className="text-xs text-amber-700 font-medium">
            Có thay đổi mới trên thiết bị này chưa được đẩy lên Cloud.
          </p>
        )}

        {syncMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            {syncMessage}
          </div>
        )}

        {syncError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {syncError}
          </div>
        )}
      </section>
    </div>
  );
};
