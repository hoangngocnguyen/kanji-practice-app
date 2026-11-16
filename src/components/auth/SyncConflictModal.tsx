import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  Download,
  Laptop,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useDecks } from '../../context/DeckContext';

function formatSyncTime(ts: number | null | undefined): string {
  if (!ts) return 'Chưa từng đồng bộ';
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const SyncConflictModal: React.FC = () => {
  const {
    syncConflict,
    isSyncing,
    resolveConflictPush,
    resolveConflictPull,
    dismissConflict,
  } = useDecks();

  const [pendingAction, setPendingAction] = useState<'push' | 'pull' | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!syncConflict) {
      setPendingAction(null);
      setActionError(null);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSyncing) dismissConflict();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [syncConflict, isSyncing, dismissConflict]);

  if (!syncConflict) return null;

  const { reason, localSummary, serverSummary } = syncConflict;

  const handleUploadLocal = async () => {
    setActionError(null);
    setPendingAction('push');
    try {
      await resolveConflictPush();
    } catch (err: any) {
      setActionError(err?.message || 'Không thể tải dữ liệu lên Cloud.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDownloadCloud = async () => {
    setActionError(null);
    setPendingAction('pull');
    try {
      await resolveConflictPull();
    } catch (err: any) {
      setActionError(err?.message || 'Không thể tải dữ liệu từ Cloud.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isSyncing && dismissConflict()}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Phát hiện xung đột dữ liệu đồng bộ
              </h3>
              <p className="text-xs text-slate-600">
                Chọn 1 chiều đồng bộ chuẩn (tương tự AnkiDroid) để tránh mất dữ
                liệu
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSyncing}
            onClick={dismissConflict}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Nguyên nhân: </strong>
            {reason}
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local Device Card */}
            <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Laptop className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Trên máy này (Local)</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 tabular-nums">
                <div className="flex justify-between">
                  <span>Thư mục bài học:</span>
                  <strong className="text-slate-900">
                    {localSummary.deckCount} thư mục
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Chữ Kanji:</span>
                  <strong className="text-slate-900">
                    {localSummary.cardCount} chữ
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Từ ghép đi kèm:</span>
                  <strong className="text-slate-900">
                    {localSummary.compoundCount} từ
                  </strong>
                </div>
                <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                  Cập nhật gần nhất:{' '}
                  <span className="font-medium text-slate-700">
                    {formatSyncTime(localSummary.lastModifiedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cloud Server Card */}
            <div className="rounded-xl border border-teal-200 p-4 bg-teal-50/35 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Cloud className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Trên Cloud (Supabase)</span>
                </div>
                <span className="text-[11px] font-semibold text-teal-800 tabular-nums">
                  v{serverSummary.syncVersion ?? 0}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 tabular-nums">
                <div className="flex justify-between">
                  <span>Thư mục bài học:</span>
                  <strong className="text-slate-900">
                    {serverSummary.deckCount} thư mục
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Chữ Kanji:</span>
                  <strong className="text-slate-900">
                    {serverSummary.cardCount} chữ
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Từ ghép đi kèm:</span>
                  <strong className="text-slate-900">
                    {serverSummary.compoundCount} từ
                  </strong>
                </div>
                <div className="pt-1.5 border-t border-teal-200/60 text-[11px] text-slate-500">
                  Đồng bộ gần nhất:{' '}
                  <span className="font-medium text-slate-700">
                    {formatSyncTime(serverSummary.lastModifiedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {actionError}
            </div>
          )}

          {/* Two Explicit AnkiDroid Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleUploadLocal}
              className="p-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-left transition-colors cursor-pointer disabled:cursor-not-allowed flex items-start gap-3"
            >
              {pendingAction === 'push' ? (
                <Loader2 className="w-5 h-5 shrink-0 animate-spin mt-0.5" />
              ) : (
                <Upload className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs sm:text-sm font-bold">
                  Tải lên Cloud (Upload)
                </div>
                <div className="text-[11px] text-teal-100 mt-0.5">
                  Lấy dữ liệu ở máy này ghi đè toàn bộ lên Cloud
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={handleDownloadCloud}
              className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-left transition-colors cursor-pointer disabled:cursor-not-allowed flex items-start gap-3"
            >
              {pendingAction === 'pull' ? (
                <Loader2 className="w-5 h-5 shrink-0 animate-spin mt-0.5" />
              ) : (
                <Download className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs sm:text-sm font-bold">
                  Tải về máy (Download)
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Xóa bản trên máy và tải bản chuẩn từ Cloud về
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
