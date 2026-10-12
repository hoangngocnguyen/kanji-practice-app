import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, Database, Code, BookOpen } from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
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
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-800 rounded-xl border border-teal-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Tuân thủ Bản quyền & Giấy phép Nguồn Dữ liệu
              </h3>
              <p className="text-xs text-slate-500">
                Công bố đầy đủ nguồn cấp API, tác giả dữ liệu vector và điều khoản pháp lý
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-600 leading-relaxed">
          {/* Section 1: KanjiVG (CC BY-SA 3.0) */}
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Code className="w-4 h-4 text-emerald-700" />
              <span>1. Dữ liệu nét vẽ KanjiVG (Creative Commons CC BY-SA 3.0)</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700">
              <li>
                <strong>Tác phẩm dữ liệu gốc:</strong> <span className="font-semibold">KanjiVG</span> (Kanji Vector Graphics).
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
                  className="text-teal-700 hover:underline font-semibold inline-flex items-center gap-0.5"
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
                  className="text-teal-700 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  CC Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0) <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </li>
              <li>
                <strong>Điều khoản ShareAlike:</strong> Mọi hình ảnh xuất PNG hoặc sao chép vào bộ nhớ tạm từ ứng dụng này đều tiếp tục được phân phối theo giấy phép CC BY-SA 3.0.
              </li>
            </ul>
          </div>

          {/* Section 2: kanjiapi.dev & EDRDG */}
          <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Database className="w-4 h-4 text-amber-700" />
              <span>2. API Từ điển Mở kanjiapi.dev & EDRDG</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-700">
              <li>
                <strong>Dịch vụ API:</strong>{' '}
                <a
                  href="https://kanjiapi.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-800 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  kanjiapi.dev <ExternalLink className="w-2.5 h-2.5" />
                </a>{' '}
                cung cấp dữ liệu từ điển mở không thu phí.
              </li>
              <li>
                <strong>Nguồn dữ liệu gốc:</strong> Tập dữ liệu từ điển KANJIDIC2 và JMdict thuộc sở hữu của Electronic Dictionary Research and Development Group (EDRDG).
              </li>
              <li>
                <strong>Giấy phép:</strong> Phân phối tuân thủ theo giấy phép Creative Commons Attribution-ShareAlike License của EDRDG.
              </li>
            </ul>
          </div>

          {/* Section 3: Mã nguồn ứng dụng */}
          <div className="border border-teal-200 bg-teal-50/40 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>3. Mã nguồn Ứng dụng (MIT License)</span>
            </div>
            <p>
              Toàn bộ giao diện người dùng, mã nguồn xử lý thuật toán lọc ký tự, chuyển đổi ảnh Canvas nền trắng và tương tác hoạt ảnh nét vẽ được cấp phép dưới{' '}
              <strong>Giấy phép MIT (MIT License)</strong>.
            </p>
            <p>
              Người dùng có toàn quyền sử dụng, sửa đổi và tích hợp vào các dự án học tập, nghiên cứu và sản xuất.
            </p>
          </div>

          {/* Section 4: Miễn trừ trách nhiệm */}
          <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>4. Tuyên bố Miễn trừ trách nhiệm (Disclaimer)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Các nguồn dữ liệu từ bên thứ ba (KanjiVG, kanjiapi.dev) được cung cấp theo nguyên tắc "nguyên trạng" (As-Is). Việc trích dẫn tác giả nhằm tuân thủ nghĩa vụ bản quyền và không bao hàm rằng các tổ chức hoặc tác giả gốc bảo trợ ứng dụng này.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Tổng hợp tập trung • Tuân thủ CC BY-SA 3.0 & MIT
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
