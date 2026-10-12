import React from 'react';
import { ExternalLink, ShieldCheck, Info } from 'lucide-react';

interface FooterProps {
  onOpenLicenseModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLicenseModal }) => {
  return (
    <footer className="mt-16 border-t border-slate-200/90 bg-white/70 backdrop-blur-md py-10 text-slate-600 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Attribution Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ghi nhận công lao & Giấy phép bản quyền (License & Attribution)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold text-[11px] border border-blue-200">
                MIT License (Code)
              </span>
              <a
                href="https://creativecommons.org/licenses/by-sa/3.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold text-[11px] border border-emerald-200 transition-colors w-fit"
              >
                <span>CC BY-SA 3.0 (Kanji Data)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-2">
              <p>
                <strong>Tác phẩm gốc & Dữ liệu Kanji:</strong> Dữ liệu vector và sơ đồ thứ tự nét vẽ chữ Kanji được cung cấp bởi dự án{' '}
                <a
                  href="https://kanjivg.tagaini.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  KanjiVG (Kanji Vector Graphics) <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </p>
              <p>
                <strong>Tác giả dữ liệu gốc:</strong> Bản quyền tác giả{' '}
                <span className="font-semibold text-slate-800">
                  Copyright © 2009–2026 Ulrich Apel
                </span>{' '}
                và các cộng tác viên của dự án KanjiVG.
              </p>
            </div>

            <div className="space-y-2">
              <p>
                <strong>Phát triển ứng dụng & Mã nguồn:</strong> Giao diện và công cụ này được lập trình và phát triển bởi <span className="font-semibold text-slate-800">Nguyễn Văn A</span>, phân phối theo điều khoản của <span className="font-semibold text-slate-800">Giấy phép MIT</span>.
              </p>
              <p className="text-[11px] text-slate-500">
                <strong>Miễn trừ trách nhiệm:</strong> Tác phẩm dữ liệu gốc được cung cấp theo nguyên tắc "nguyên trạng" (As-Is) dưới giấy phép CC BY-SA 3.0.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px] pt-1">
          <p>© {new Date().getFullYear()} Hoang Ngoc Nguyen. Mã nguồn mở MIT • Dữ liệu KanjiVG (CC BY-SA 3.0).</p>
          <div className="flex items-center gap-4">
            <a
              href="https://kanjivg.tagaini.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              Trang chủ KanjiVG
            </a>
            <span>•</span>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors"
            >
              Giấy phép MIT
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};