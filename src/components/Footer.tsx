import React from 'react';
import { ExternalLink, ShieldCheck, Database, Code, BookOpen } from 'lucide-react';

interface FooterProps {
  onOpenLicenseModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLicenseModal }) => {
  return (
    <footer className="mt-12 sm:mt-16 border-t border-slate-200/90 bg-white/80 backdrop-blur-md py-8 sm:py-10 text-slate-600 text-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 space-y-5 sm:space-y-6">
        {/* Centralized Attribution & License Hub */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-800 rounded-xl border border-teal-200/60 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Trung tâm Ghi nhận Bản quyền & Nguồn Dữ liệu (License & Data Attribution)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tổng hợp nguồn cấp API, dữ liệu vector nét vẽ và giấy phép sử dụng hợp pháp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onOpenLicenseModal}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-[11px] border border-emerald-300 transition-colors cursor-pointer"
                title="Xem điều khoản bản quyền Creative Commons CC BY-SA 3.0"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>CC BY-SA 3.0</span>
              </button>

              <span className="px-2.5 py-1.5 bg-teal-50 text-teal-800 rounded-xl font-bold text-[11px] border border-teal-200">
                MIT License
              </span>
            </div>
          </div>

          {/* Grid 3 cột ghi nhận toàn bộ nguồn dữ liệu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600 leading-relaxed">
            {/* Cột 1: KanjiVG */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Code className="w-4 h-4 text-teal-700" />
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
              <p className="text-[11px] text-slate-400">
                Bản quyền © 2009–2026 <strong>Ulrich Apel</strong> và cộng tác viên dưới giấy phép mở{' '}
                <a
                  href="https://creativecommons.org/licenses/by-sa/3.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 underline font-medium"
                >
                  CC BY-SA 3.0
                </a>.
              </p>
            </div>

            {/* Cột 2: kanjiapi.dev & EDRDG */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Từ điển & JLPT (kanjiapi.dev)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dữ liệu cấp độ JLPT, bộ thủ, số nét và từ vựng mở rộng tích hợp từ API mở{' '}
                <a
                  href="https://kanjiapi.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  kanjiapi.dev <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </p>
              <p className="text-[11px] text-slate-400">
                Dựa trên từ điển mở <strong>KANJIDIC2 & JMdict</strong> của Electronic Dictionary Research and Development Group (EDRDG).
              </p>
            </div>

            {/* Cột 3: Tra cứu & Âm Hán-Việt */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Tra cứu & Tham chiếu từ vựng</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dữ liệu âm Hán-Việt, giải nghĩa tiếng Việt đối chiếu với từ điển chữ Hán chuẩn mực. Hỗ trợ liên kết tra cứu trực tiếp cùng{' '}
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
              <p className="text-[11px] text-slate-400">
                Phát âm tiếng Nhật chuẩn qua Web Speech API native của trình duyệt.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px] pt-1">
          <p>© {new Date().getFullYear()} Hoang Ngoc Nguyen. Phân phối mở theo giấy phép MIT (Code) & CC BY-SA 3.0 (Kanji Data).</p>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenLicenseModal}
              className="hover:text-teal-700 transition-colors cursor-pointer underline"
            >
              Xem chi tiết điều khoản bản quyền
            </button>
            <span>•</span>
            <a
              href="https://kanjivg.tagaini.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-700 transition-colors"
            >
              Trang chủ KanjiVG
            </a>
            <span>•</span>
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
