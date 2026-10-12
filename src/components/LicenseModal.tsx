import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Tuân thủ Giấy phép KanjiVG (CC BY-SA 3.0)
              </h3>
              <p className="text-xs text-slate-500">
                Bản công bố quyền tác giả và trách nhiệm pháp lý theo Creative Commons
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600 leading-relaxed">
          {/* Section 1: Ghi nhận công lao */}
          <div className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>1. Điều kiện Ghi nhận công lao (Attribution - CC BY)</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700">
              <li>
                <strong>Tác phẩm gốc:</strong> <span className="font-semibold">KanjiVG</span> (Kanji Vector Graphics).
              </li>
              <li>
                <strong>Tác giả gốc:</strong> Bản quyền tác giả{' '}
                <span className="font-semibold text-slate-900">
                  Copyright © 2009–2026 Ulrich Apel
                </span>{' '}
                và các cộng tác viên KanjiVG.
              </li>
              <li>
                <strong>Website chính thức:</strong>{' '}
                <a
                  href="https://kanjivg.tagaini.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  https://kanjivg.tagaini.net/ <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </li>
              <li>
                <strong>Giấy phép áp dụng:</strong>{' '}
                <a
                  href="https://creativecommons.org/licenses/by-sa/3.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0) <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </li>
            </ul>
          </div>

          {/* Section 2: Chỉnh sửa & Chia sẻ tương tự */}
          <div className="border border-blue-100 bg-blue-50/40 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>2. Ghi chú chỉnh sửa & Chia sẻ tương tự (ShareAlike - CC SA)</span>
            </div>
            <p>
              <strong>Nội dung chỉnh sửa/phái sinh:</strong> Công cụ này tải các file SVG gốc từ KanjiVG, sau đó vẽ lên HTML5 Canvas để tạo lớp nền trắng (<code className="bg-white px-1 py-0.5 rounded font-mono text-[11px]">#FFFFFF</code>) nhằm tránh lỗi nền đen khi dán vào Word/Anki/Obsidian Dark Mode, đồng thời hỗ trợ thêm lưới ô vuông chữ điền tuỳ chọn.
            </p>
            <p>
              <strong>Nguyên tắc ShareAlike:</strong> Tất cả các hình ảnh PNG xuất ra hoặc sao chép vào bộ nhớ tạm (Clipboard) từ công cụ này đều tiếp tục được cấp phép theo giấy phép mở tương đương{' '}
              <strong>CC BY-SA 3.0</strong>. Người dùng hoàn toàn tự do sử dụng trong các bộ thẻ học tập cá nhân, tài liệu giáo dục và phi thương mại/thương mại theo đúng điều khoản giấy phép.
            </p>
            <p>
              Không áp dụng bất kỳ biện pháp kỹ thuật số DRM hay khóa bản quyền nào ngăn cản người khác thực hiện các quyền theo CC BY-SA 3.0.
            </p>
          </div>

          {/* Section 3: Miễn trừ trách nhiệm & Không bảo trợ */}
          <div className="border border-amber-100 bg-amber-50/40 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>3. Miễn trừ trách nhiệm & Không bảo trợ (Non-Endorsement)</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700">
              <li>
                <strong>Cung cấp "Nguyên trạng" (As-Is):</strong> Dữ liệu nét vẽ được phân phối nguyên trạng từ KanjiVG mà không đi kèm bất kỳ bảo đảm pháp lý nào về tính chính xác tuyệt đối.
              </li>
              <li>
                <strong>Không bảo trợ:</strong> Việc ứng dụng trích dẫn tên tác giả Ulrich Apel và KanjiVG hoàn toàn nhằm tuân thủ nghĩa vụ Ghi nhận công lao (Attribution) và không thể hiện rằng tác giả gốc bảo trợ, tài trợ hay liên kết với ứng dụng này.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Cập nhật tuân thủ giấy phép CC BY-SA 3.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
