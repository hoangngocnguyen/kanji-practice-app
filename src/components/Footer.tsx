import React from 'react';
import { ExternalLink, ShieldCheck, Database, Code, BookOpen, Heart } from 'lucide-react';

interface FooterProps {
  onOpenLicenseModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLicenseModal }) => {
  return (
    <footer className="mt-8 sm:mt-12 border-t border-slate-200/80 pt-6 pb-20 sm:pb-10 text-slate-600 text-xs w-full">
      <div className="w-full space-y-4">
        {/* Attribution & License Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 md:p-6 space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-800 rounded-xl border border-teal-200/60 shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Nguồn Dữ Liệu &amp; Giấy Phép Sử Dụng
                </h4>
                <p className="text-[11px] text-slate-500">
                  Dữ liệu mở chữ Hán, sơ đồ vector thứ tự nét viết và bộ từ điển chuẩn mực
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenLicenseModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-[11px] border border-emerald-300 transition-colors cursor-pointer"
                title="Xem chi tiết điều khoản bản quyền Creative Commons CC BY-SA 3.0"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>CC BY-SA 3.0</span>
              </button>

              <span className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded-xl font-bold text-[11px] border border-teal-200">
                MIT License
              </span>
            </div>
          </div>

          {/* 3 Responsive Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 leading-relaxed">
            {/* Column 1: KanjiVG */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <Code className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Nét vẽ Kanji (KanjiVG)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dữ liệu thứ tự nét viết và sơ đồ vector SVG được cung cấp bởi dự án{' '}
                  <a
                    href="https://kanjivg.tagaini.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    KanjiVG <ExternalLink className="w-2.5 h-2.5" />
                  </a>.
                </p>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Bản quyền © 2009–2026 <strong>Ulrich Apel</strong> &amp; cộng tác viên (CC BY-SA 3.0).
              </p>
            </div>

            {/* Column 2: kanjiapi.dev */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <Database className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Từ điển &amp; JLPT (kanjiapi.dev)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dữ liệu cấp độ JLPT, bộ thủ, số nét và từ vựng mở rộng tích hợp từ{' '}
                  <a
                    href="https://kanjiapi.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    kanjiapi.dev <ExternalLink className="w-2.5 h-2.5" />
                  </a>.
                </p>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Dựa trên từ điển mở <strong>KANJIDIC2 &amp; JMdict</strong> của nhóm EDRDG.
              </p>
            </div>

            {/* Column 3: Tham chiếu & Phát âm */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tra cứu &amp; Phát âm bản xứ</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dữ liệu âm Hán-Việt, giải nghĩa tiếng Việt đối chiếu với từ điển chữ Hán chuẩn mực. Hỗ trợ liên kết tra cứu{' '}
                  <a
                    href="https://jisho.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 hover:underline font-semibold"
                  >
                    Jisho.org
                  </a>{' '}
                  và{' '}
                  <a
                    href="https://mazii.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-700 hover:underline font-semibold"
                  >
                    Mazii
                  </a>.
                </p>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Phát âm tiếng Nhật chuẩn qua Web Speech API native của trình duyệt.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits & Quick Links - Clean Responsive Footer Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-slate-500 text-[11px] pt-1 px-1">
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} <strong>Luyện Kanji</strong> • Phát triển bởi Hoang Ngoc Nguyen. Mã nguồn mở MIT &amp; Dữ liệu CC BY-SA 3.0.
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-slate-500">
            <button
              type="button"
              onClick={onOpenLicenseModal}
              className="hover:text-teal-700 transition-colors cursor-pointer underline underline-offset-2"
            >
              Chi tiết bản quyền
            </button>
            <span className="text-slate-300">•</span>
            <a
              href="https://kanjivg.tagaini.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-700 transition-colors"
            >
              Trang chủ KanjiVG
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-700 transition-colors"
            >
              Giấy phép MIT
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
