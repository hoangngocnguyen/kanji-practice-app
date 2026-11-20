import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  GitMerge,
  Loader2,
  RefreshCw,
  WifiOff,
  X,
} from 'lucide-react';
import { useDecks } from '../../context/DeckContext';

export const ReviewSyncModal: React.FC = () => {
  const { reviewSyncGate, retrySyncGate, bypassSyncGate } = useDecks();

  if (!reviewSyncGate.isOpen) return null;

  const { context, stage, summaryText, errorText } = reviewSyncGate;

  const isChecking = stage === 'checking';
  const isMerging = stage === 'merging';
  const isDone = stage === 'done';
  const isError = stage === 'error';

  const heading =
    context === 'start_session'
      ? 'Đồng bộ thẻ trước khi ôn tập'
      : 'Đang cập nhật bộ thẻ mới nhất';

  const subtitle =
    context === 'start_session'
      ? 'Đảm bảo hàng đợi thẻ đến hạn phản ánh kết quả học mới nhất từ mọi thiết bị'
      : 'Tự động kiểm tra và gộp thay đổi từ Cloud trước khi hiển thị bộ bài học';

  const steps = [
    {
      id: 'checking',
      label: 'Kết nối & kiểm tra phiên bản trên Cloud',
      active: isChecking,
      completed: isMerging || isDone,
    },
    {
      id: 'merging',
      label: 'Đối soát & gộp thẻ mới, lịch ôn SRS gần nhất',
      active: isMerging,
      completed: isDone,
    },
    {
      id: 'done',
      label:
        context === 'start_session'
          ? 'Sẵn sàng mở phiên ôn tập Flashcard'
          : 'Hoàn tất đồng bộ danh sách bộ thẻ',
      active: isDone,
      completed: isDone,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[65] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-sync-modal-title"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                isError
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : isDone
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-teal-50 border-teal-200 text-teal-700'
              }`}
            >
              {isError ? (
                <WifiOff className="w-5 h-5" />
              ) : isDone ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isMerging ? (
                <GitMerge className="w-5 h-5" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                id="review-sync-modal-title"
                className="text-sm sm:text-base font-bold text-slate-900 leading-snug"
              >
                {heading}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={bypassSyncGate}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Đóng và học ngoại tuyến"
            title="Tiếp tục với dữ liệu trên máy"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!isError ? (
            <div className="space-y-2.5">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs transition-colors duration-150 ${
                    step.completed
                      ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900 font-medium'
                      : step.active
                      ? 'bg-teal-50/70 border-teal-200 text-teal-900 font-semibold'
                      : 'bg-slate-50/70 border-slate-200/70 text-slate-400'
                  }`}
                >
                  <span className="shrink-0 flex items-center justify-center w-4 h-4">
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : step.active ? (
                      <Loader2 className="w-4 h-4 text-teal-700 animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </span>
                  <span className="leading-snug">{step.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Chưa thể đồng bộ với Cloud</div>
                <p className="text-amber-800 mt-0.5">{errorText}</p>
              </div>
            </div>
          )}

          {isDone && summaryText && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{summaryText}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {isError && (
              <button
                type="button"
                onClick={() => void retrySyncGate()}
                className="px-3.5 py-2 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử đồng bộ lại</span>
              </button>
            )}

            {!isDone && (
              <button
                type="button"
                onClick={bypassSyncGate}
                className={`px-3.5 py-2 text-xs sm:text-[13px] font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  isError
                    ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {context === 'start_session'
                  ? 'Học ngoại tuyến ngay'
                  : 'Tiếp tục ngoại tuyến'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
