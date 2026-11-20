import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  Download,
  Eye,
  Folder,
  GitMerge,
  Laptop,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useDecks } from '../../context/DeckContext';
import { computeSyncDiff } from '../../services/syncService';

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
    folders,
    items,
    syncConflict,
    isSyncing,
    cloudSnapshot,
    isLoadingCloudSnapshot,
    openCloudInspector,
    resolveSelectiveCollisions,
    resolveConflictUnionMerge,
    resolveConflictPush,
    resolveConflictPull,
    dismissConflict,
  } = useDecks();

  const [pendingAction, setPendingAction] = useState<
    'selective' | 'merge' | 'push' | 'pull' | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, 'keep' | 'delete'>>({});

  const collisions = syncConflict?.collisions || [];
  const hasSelectiveCollisions = collisions.length > 0;

  useEffect(() => {
    if (!syncConflict) {
      setPendingAction(null);
      setActionError(null);
      setResolutions({});
      return;
    }
    if (syncConflict.collisions?.length) {
      const defaults: Record<string, 'keep' | 'delete'> = {};
      syncConflict.collisions.forEach((c) => {
        defaults[c.key] = 'keep';
      });
      setResolutions(defaults);
    }
  }, [syncConflict]);

  const quickDiff = useMemo(() => {
    if (!syncConflict || !cloudSnapshot || hasSelectiveCollisions) return null;
    return computeSyncDiff(
      folders,
      items,
      cloudSnapshot.folders,
      cloudSnapshot.items
    );
  }, [syncConflict, cloudSnapshot, folders, items, hasSelectiveCollisions]);

  useEffect(() => {
    if (!syncConflict) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSyncing) dismissConflict();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [syncConflict, isSyncing, dismissConflict]);

  if (!syncConflict) return null;

  const { reason, localSummary, serverSummary, pendingMergeDraft } = syncConflict;

  const handleApplySelective = async () => {
    setActionError(null);
    setPendingAction('selective');
    try {
      await resolveSelectiveCollisions(resolutions);
    } catch (err: any) {
      setActionError(err?.message || 'Không thể hoàn tất gộp dữ liệu.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleUnionMerge = async () => {
    setActionError(null);
    setPendingAction('merge');
    try {
      await resolveConflictUnionMerge();
    } catch (err: any) {
      setActionError(err?.message || 'Không thể gộp dữ liệu 2 thiết bị.');
    } finally {
      setPendingAction(null);
    }
  };

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
      className="fixed inset-0 z-[68] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !isSyncing && dismissConflict()}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-amber-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {hasSelectiveCollisions
                  ? `Cần xác nhận ${collisions.length} mục đụng độ khi gộp`
                  : 'Phát hiện dữ liệu đồng bộ khác tài khoản'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {hasSelectiveCollisions
                  ? 'Các thẻ không đụng độ đã tự động gộp; chọn giữ hoặc xóa riêng từng mục bên dưới'
                  : 'Chọn gộp cả 2 bên hoặc chọn 1 chiều đồng bộ chuẩn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSyncing}
            onClick={dismissConflict}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Chi tiết: </strong>
            {reason}
          </div>

          {hasSelectiveCollisions && pendingMergeDraft ? (
            <>
              {/* Auto-merge safe stats */}
              <div className="px-3.5 py-2.5 rounded-xl bg-teal-50/60 border border-teal-200/80 text-xs text-teal-900 flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                <span className="font-bold flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-teal-700" />
                  <span>Phần tự động gộp an toàn:</span>
                </span>
                <span>+{pendingMergeDraft.summaryStats.addedFromCloud} mục từ Cloud</span>
                <span aria-hidden="true">·</span>
                <span>+{pendingMergeDraft.summaryStats.addedFromLocal} mục từ máy</span>
                {(pendingMergeDraft.summaryStats.srsUpdatedFromCloud > 0 ||
                  pendingMergeDraft.summaryStats.srsKeptFromLocal > 0) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {pendingMergeDraft.summaryStats.srsUpdatedFromCloud +
                        pendingMergeDraft.summaryStats.srsKeptFromLocal}{' '}
                      thẻ gộp SRS theo lần ôn mới nhất
                    </span>
                  </>
                )}
              </div>

              {/* Per-item Selective Collision List */}
              <div className="space-y-3">
                {collisions.map((col) => {
                  const selected = resolutions[col.key] || 'keep';
                  return (
                    <div
                      key={col.key}
                      className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            {col.entityType === 'folder' && (
                              <Folder className="w-4 h-4 text-teal-700 shrink-0" />
                            )}
                            <span className="truncate">{col.label}</span>
                          </div>
                          {col.subLabel && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {col.subLabel}
                            </div>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={() =>
                              setResolutions((prev) => ({
                                ...prev,
                                [col.key]: 'keep',
                              }))
                            }
                            className={`px-3 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                              selected === 'keep'
                                ? 'bg-teal-700 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Giữ lại</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={() =>
                              setResolutions((prev) => ({
                                ...prev,
                                [col.key]: 'delete',
                              }))
                            }
                            className={`px-3 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                              selected === 'delete'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xác nhận xóa</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600">
                          <span className="font-bold text-slate-800">Trên máy: </span>
                          {col.localDescription}
                        </div>
                        <div className="p-2.5 rounded-lg bg-teal-50/45 border border-teal-200/70 text-slate-600">
                          <span className="font-bold text-teal-900">Trên Cloud: </span>
                          {col.cloudDescription}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Account Mismatch / Side-by-side comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-600 tabular-nums">
                  {isLoadingCloudSnapshot && !quickDiff ? (
                    <span>Đang đối chiếu chi tiết giữa Máy và Cloud...</span>
                  ) : quickDiff ? (
                    <span>
                      Chênh lệch:{' '}
                      <strong className="text-sky-800">
                        {quickDiff.cardStats.localOnly} Kanji chỉ ở Máy
                      </strong>
                      {' · '}
                      <strong className="text-amber-800">
                        {quickDiff.cardStats.cloudOnly} Kanji chỉ ở Cloud
                      </strong>
                      {' · '}
                      <strong className="text-violet-800">
                        {quickDiff.cardStats.modified} Kanji khác nội dung/SRS
                      </strong>
                    </span>
                  ) : (
                    <span>
                      Bạn có thể xem chi tiết trước khi chọn gộp hoặc thay thế.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => openCloudInspector()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem & So sánh Cloud</span>
                </button>
              </div>
            </>
          )}

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {actionError}
            </div>
          )}

          {/* Action Buttons */}
          {hasSelectiveCollisions ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSyncing}
                onClick={dismissConflict}
                className="px-4 py-2 text-xs sm:text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Để sau (giữ dữ liệu trên máy)
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleApplySelective}
                className="px-4 py-2 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {pendingAction === 'selective' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4" />
                )}
                <span>Áp dụng & Hoàn tất đồng bộ</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleUnionMerge}
                className="w-full p-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-left transition-colors cursor-pointer flex items-start gap-3"
              >
                {pendingAction === 'merge' ? (
                  <Loader2 className="w-5 h-5 shrink-0 animate-spin mt-0.5" />
                ) : (
                  <GitMerge className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs sm:text-[13px] font-bold">
                    Gộp thông minh cả 2 bên (Khuyên dùng)
                  </div>
                  <div className="text-[11px] text-teal-100 mt-0.5">
                    Giữ toàn bộ thư mục & thẻ từ cả Máy và Cloud, ưu tiên lần ôn SRS gần nhất
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleUploadLocal}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-900 text-left transition-colors cursor-pointer flex items-start gap-2.5 border border-slate-200"
                >
                  {pendingAction === 'push' ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin mt-0.5" />
                  ) : (
                    <Upload className="w-4 h-4 shrink-0 mt-0.5 text-teal-700" />
                  )}
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold">
                      Chỉ giữ bản trên Máy
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Ghi đè Cloud bằng {localSummary.cardCount} chữ từ máy
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleDownloadCloud}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-900 text-left transition-colors cursor-pointer flex items-start gap-2.5 border border-slate-200"
                >
                  {pendingAction === 'pull' ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin mt-0.5" />
                  ) : (
                    <Download className="w-4 h-4 shrink-0 mt-0.5 text-slate-700" />
                  )}
                  <div>
                    <div className="text-xs sm:text-[13px] font-bold">
                      Chỉ giữ bản trên Cloud
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Thay máy bằng {serverSummary.cardCount} chữ từ Cloud
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
