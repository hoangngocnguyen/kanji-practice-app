import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenLicenseModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLicenseModal }) => {
  return (
    <footer className="mt-8 border-t border-slate-200/80 py-4 text-slate-500 w-full">
      <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-2.5 text-xs sm:text-[13px]">
        <p className="text-center lg:text-left leading-relaxed">
          © {new Date().getFullYear()}{' '}
          <strong className="font-semibold text-slate-700">Luyện Kanji</strong>
          <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
          <span>Phát triển bởi Hoang Ngoc Nguyen</span>
        </p>

        <nav
          aria-label="Liên kết bản quyền và nguồn dữ liệu"
          className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1"
        >
          {onOpenLicenseModal && (
            <>
              <button
                type="button"
                onClick={onOpenLicenseModal}
                className="inline-flex items-center gap-1.5 py-1 text-slate-600 hover:text-teal-700 font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Nguồn dữ liệu &amp; Bản quyền</span>
              </button>
              <span className="text-slate-300" aria-hidden="true">·</span>
            </>
          )}

          <a
            href="https://kanjivg.tagaini.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 hover:text-teal-700 transition-colors whitespace-nowrap"
          >
            KanjiVG
          </a>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <a
            href="https://kanjiapi.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 hover:text-teal-700 transition-colors whitespace-nowrap"
          >
            kanjiapi.dev
          </a>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <a
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 hover:text-teal-700 transition-colors whitespace-nowrap"
          >
            Giấy phép MIT
          </a>
        </nav>
      </div>
    </footer>
  );
};
