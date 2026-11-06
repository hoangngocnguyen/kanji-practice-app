import React from 'react';
import { ExternalLink, ShieldCheck, Database, Code, BookOpen } from 'lucide-react';

interface FooterProps {
  onOpenLicenseModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLicenseModal }) => {
  return (
    <footer className="mt-8 sm:mt-10 border-t border-slate-200/70 pt-6 pb-12 text-slate-600 text-xs w-full">
      <div className="w-full space-y-4">
        {/* Centralized Attribution & License Hub */}
        <div className="bg-white/80 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-800 rounded-xl border border-teal-200/60 shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Nguồn Dữ Liệu & Giấy Phép Sử Dụng (Data Attribution & Licenses)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Dữ liệu chữ Hán mở, sơ đồ vector thứ tự nét viết và bộ từ điển chuẩn mực
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
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

          {/* Grid 3 cột ghi nhận toàn bộ nguồn dữ liệu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs text-slate-600 leading-relaxed">
            {/* Cột 1: KanjiVG */}
            <div className="space-y-1.5 bg-slate-50/70 hover:bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 transition-colors">
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
                Bản quyền © 2009–2026 <strong>Ulrich Apel</strong> & cộng tác viên dưới giấy phép mở{' '}
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
            <div className="space-y-1.5 bg-slate-50/70 hover:bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 transition-colors">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Từ điển & JLPT (kanjiapi.dev)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dữ liệu cấp độ JLPT, bộ thủ, số nét và từ vựng mở rộng từ API{' '}
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
                Dựa trên từ điển mở <strong>KANJIDIC2 & JMdict</strong> của nhóm EDRDG.
              </p>
            </div>

            {/* Cột 3: Tra cứu & Âm Hán-Việt */}
            <div className="space-y-1.5 bg-slate-50/70 hover:bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/60 transition-colors">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Tra cứu & Tham chiếu từ vựng</span>
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
              <p className="text-[11px] text-slate-400">
                Phát âm tiếng Nhật chuẩn qua Web Speech API native của trình duyệt.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Credits with safe right padding to prevent collision with floating button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px] pt-1 pr-14 sm:pr-20">
          <p>© {new Date().getFullYear()} Hoang Ngoc Nguyen. Phân phối mở theo giấy phép MIT (Code) & CC BY-SA 3.0 (Kanji Data).</p>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <button
              onClick={onOpenLicenseModal}
              className="hover:text-teal-700 transition-colors cursor-pointer underline"
            >
              Xem chi tiết bản quyền
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
