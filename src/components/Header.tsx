import React from 'react';
import { Printer, Settings, Menu } from 'lucide-react';
import { useLocation, NavLink } from 'react-router-dom';
import { useKanji } from '../context/KanjiContext';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const { extractedKanjiList, setIsPrintModalOpen, setIsSettingsOpen } = useKanji();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/input':
        return {
          title: 'Nhập văn bản tiếng Nhật',
          subtitle: 'Dán đoạn văn hoặc quét chữ Kanji từ ảnh',
        };
      case '/kanji':
        return {
          title: 'Nét viết Kanji',
          subtitle: `${extractedKanjiList.length} chữ Kanji trích xuất · Hoạt ảnh thứ tự nét vẽ SVG`,
        };
      case '/romaji':
        return {
          title: 'Phiên âm Romaji',
          subtitle: 'Đọc câu tiếng Nhật xen dòng chuẩn Hepburn',
        };
      case '/translate':
        return {
          title: 'Dịch câu song ngữ',
          subtitle: 'Dịch thuật Nhật - Việt với Google Dịch & Gemini AI',
        };
      case '/converter':
        return {
          title: 'Chuyển đổi Romaji ⇄ Kana',
          subtitle: 'Chuyển chữ Latinh sang Hiragana/Katakana có Hoàn tác (Undo)',
        };
      case '/radicals':
        return {
          title: '214 Bộ thủ Khang Hy',
          subtitle: 'Cấu trúc và ý nghĩa gốc các bộ thủ chữ Hán',
        };
      case '/compare':
        return {
          title: 'So sánh Kanji song song',
          subtitle: 'Đối chiếu cách viết, bộ thủ, âm đọc và phân biệt từ dễ nhầm lẫn',
        };
      case '/history':
        return {
          title: 'Lịch sử tra cứu',
          subtitle: 'Các từ Kanji đã xem gần đây lưu trữ ngoại tuyến',
        };
      case '/print':
        return {
          title: 'In phiếu tập viết A4',
          subtitle: 'Tùy chọn chữ Kanji, cột hiển thị và xuất bản in hoặc PDF chuẩn A4',
        };
      case '/extension':
        return {
          title: 'Chrome Extension v3.0',
          subtitle: 'Tiện ích tra cứu Kanji, khoanh vùng chụp màn hình OCR & vẽ nét SVG trực tiếp',
        };
      case '/guide':
        return {
          title: 'Hướng dẫn sử dụng',
          subtitle: 'Cẩm nang học & tra cứu chữ Hán toàn diện',
        };
      default:
        return {
          title: 'Luyện Kanji',
          subtitle: 'Tra nét vẽ SVG, đọc Romaji & dịch song ngữ',
        };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs print:hidden">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu Toggle & Brand Logo with Web Name */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0 active:scale-95"
              title="Mở menu tính năng"
            >
              <Menu className="w-5 h-5 text-teal-700" />
            </button>
          )}

          {/* Brand Logo & Web Name (Only Logo & Name per user request) */}
          <NavLink to="/input" className="flex items-center gap-2.5 shrink-0 group" title="Trang chủ / Nhập văn bản">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/15 ring-1 ring-emerald-400/30 group-hover:scale-105 transition-transform">
              <span className="font-kanji font-black text-xl leading-none">漢</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">Luyện Kanji</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">Pro</span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5 truncate">Học &amp; Tra cứu chữ Hán</p>
            </div>
          </NavLink>
        </div>

        {/* Right: Clean Utility Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <NavLink
            to="/print"
            className={({ isActive }) =>
              `hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 border ${
                isActive
                  ? 'bg-teal-700 text-white border-teal-800'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border-slate-200/90'
              }`
            }
            title="In bảng tập viết ra giấy hoặc PDF"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>In tập viết</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            title="Cài đặt ứng dụng"
          >
            <Settings className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
};
