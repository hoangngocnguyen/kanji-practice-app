import React, { useState } from 'react';
import {
  Chrome,
  Download,
  CheckCircle2,
  Scissors,
  Layers,
  Zap,
  PenTool,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Laptop
} from 'lucide-react';
import { ExtensionExporter } from './ExtensionExporter';

export const ExtensionDownloadView: React.FC = () => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleCopyExtensionsUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Main Exporter & Download Banner */}
      <ExtensionExporter />

      {/* 2. Key Features Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-700" />
            <span>Tính Năng Nổi Bật Của Extension v3.0.0</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Học tiếng Nhật và đọc tin tức, truyện tranh, Youtube mượt mà ngay trên trình duyệt
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
              <Scissors className="w-4 h-4 text-teal-600" />
              <span>1. Khoanh Vùng Chụp Màn Hình (Ctrl + Shift + K)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bấm phím tắt <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-900 font-bold">Ctrl + Shift + K</code> (hoặc <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-900 font-bold">Cmd + Shift + K</code> trên Mac) để kéo chuột khoanh vùng bất kỳ đoạn văn bản, truyện tranh Manga hoặc video YouTube để quét trích xuất chữ Kanji tức thì.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>2. Bôi Đen Từ Vựng &amp; Tooltip Tra Cứu</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bôi đen bất kỳ từ hoặc câu tiếng Nhật trên bất cứ trang web nào (như báo NHK, Yahoo Japan), một nút tooltip nhỏ sẽ hiện ra để bạn tra cứu nhanh âm Hán-Việt, Furigana và nghĩa từ vựng.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
              <PenTool className="w-4 h-4 text-teal-600" />
              <span>3. Xem Thứ Tự Nét Vẽ SVG &amp; Luyện Viết</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cửa sổ phân tích tích hợp ảnh nét vẽ chuẩn vector KanjiVG với hoạt ảnh động từng nét vẽ, phân loại bộ thủ và phát âm chuẩn Nhật Bản.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
              <ExternalLink className="w-4 h-4 text-teal-600" />
              <span>4. Đồng Bộ 1-Chạm Sang Web App</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nhấp nút <strong>🌐 Mở trên Web</strong> trong cửa sổ nổi để đưa toàn bộ câu văn hoặc danh sách Kanji vừa phát hiện sang trang web <code>luyenkanji.vercel.app</code> để in ấn, phiên âm Romaji hoặc dịch câu.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Step-by-Step Installation Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-teal-700" />
            <span>Hướng Dẫn Cài Đặt Vào Trình Duyệt (3 Bước)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Áp dụng cho Google Chrome, Microsoft Edge, Brave, Cốc Cốc và các trình duyệt Chromium
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <span className="font-bold text-sm text-slate-800">Tải &amp; Giải Nén ZIP</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nhấn nút <strong>Tải gói ZIP Extension</strong> ở trên để tải file về máy. Sau đó nhấp chuột phải và chọn <strong>Extract All... (Giải nén)</strong> thành một thư mục.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <span className="font-bold text-sm text-slate-800">Mở Trang Quản Lý Tiện Ích</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mở tab mới trên trình duyệt và nhập:
            </p>
            <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-xs">
              <span className="text-teal-900 font-bold flex-1 select-all">chrome://extensions</span>
              <button
                type="button"
                onClick={handleCopyExtensionsUrl}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title="Sao chép"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Bật công tắc <strong>Chế độ cho nhà phát triển (Developer mode)</strong> ở góc trên bên phải.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <span className="font-bold text-sm text-slate-800">Tải Tiện Ích Đã Giải Nén</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bấm nút <strong>Tải tiện ích đã giải nén (Load unpacked)</strong> ở góc trái, sau đó chọn thư mục vừa giải nén ở Bước 1. Hoàn tất cài đặt!
            </p>
          </div>
        </div>
      </div>

      {/* 4. Keyboard Shortcuts & Compatibility Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            <strong>Phím tắt nhanh:</strong> <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900">Ctrl + Shift + K</kbd> (Windows) hoặc <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900">Cmd + Shift + K</kbd> (Mac) để bật công cụ quét ảnh.
          </span>
        </div>
        <div className="text-slate-500">
          Tương thích 100% với Manifest V3 chuẩn mới nhất của Google.
        </div>
      </div>
    </div>
  );
};
