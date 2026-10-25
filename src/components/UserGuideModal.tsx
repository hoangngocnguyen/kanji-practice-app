import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  Copy,
  FileSpreadsheet,
  Printer,
  Search,
  Play,
  Languages,
  ChevronRight,
  Lightbulb,
  Layers,
  Camera,
  Grid
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

type TabKey = 'lookup' | 'anki' | 'export' | 'tools';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenScanner,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('lookup');
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('kanji_guide_dismissed_v1', 'true');
      } catch (e) {
        console.warn('Không thể lưu cài đặt hướng dẫn:', e);
      }
    }
    onClose();
  };

  const tabs: { id: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'lookup',
      label: 'Tra cứu & Nét vẽ',
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: 'anki',
      label: 'Chép Anki & Word',
      icon: <Copy className="w-4 h-4" />,
      badge: 'Phổ biến',
    },
    {
      id: 'export',
      label: 'Xuất CSV & In ấn',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'tools',
      label: 'Dịch & Quét OCR',
      icon: <Sparkles className="w-4 h-4" />,
      badge: 'Mới',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700/60 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <BookOpen className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Hướng dẫn sử dụng & Mẹo học Kanji
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full">
                  v1.2
                </span>
              </div>
              <p className="text-xs text-teal-100/80 hidden sm:block">
                Khám phá các tính năng tra nét vẽ, sao chép thẻ Anki, xuất CSV và phát âm
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-3 sm:px-6 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-teal-800 border-teal-600 shadow-xs'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.3 text-[10px] font-extrabold rounded-full ${
                      isActive
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-700 text-xs sm:text-sm">
          {/* TAB 1: LOOKUP & STROKE ANIMATION */}
          {activeTab === 'lookup' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 p-4 rounded-xl border border-teal-100">
                <h3 className="font-bold text-teal-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Search className="w-4 h-4 text-teal-600" />
                  1. Tra cứu câu/từ vựng & Trích xuất Kanji
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Nhập bất kỳ đoạn văn bản tiếng Nhật (ví dụ: <code className="bg-teal-100/80 text-teal-900 px-1.5 py-0.5 rounded font-mono">一期一会 温故知新</code>), ứng dụng sẽ tự động tách các ký tự Hán tự độc nhất và hiển thị bảng tra cứu cùng thứ tự nét vẽ.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs sm:text-sm">
                    <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                    Hoạt ảnh nét vẽ động (Dynamic SVG)
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Mỗi chữ Kanji có ảnh nét vẽ được vẽ hoạt hình sinh động. Bạn có thể tạm dừng, chạy lại hoặc thay đổi tốc độ (0.5x, 1x, 2x) theo nhu cầu luyện tập.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs sm:text-sm">
                    <Grid className="w-4 h-4 text-teal-600" />
                    Chế độ Lưới kẻ ô Mễ (米)
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Bật công tắc <strong>+ Ô lưới</strong> để hiển thị đường căn nét chữ (tâm, đường chéo mễ) giúp bạn tập viết Kanji chuẩn tỉ lệ như trong vở luyện chữ.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <strong className="font-semibold">Mẹo nhỏ:</strong> Bạn có thể nhấp chuột trực tiếp vào bất kỳ ô chữ Kanji nào để mở <strong>Cửa sổ chi tiết (Practice Modal)</strong> để tập vẽ đè nét chữ và nghe âm Hiragana/Kunyomi!
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANKI & COPYING */}
          {activeTab === 'anki' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-indigo-50 to-teal-50/50 p-4 rounded-xl border border-indigo-100">
                <h3 className="font-bold text-indigo-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Copy className="w-4 h-4 text-indigo-600" />
                  2. Sao chép sơ đồ nét vào Anki, Word & Notion
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Dễ dàng sao chép đồ họa thứ tự nét vẽ vào phần mềm thẻ nhớ Anki hoặc tài liệu học tập chỉ bằng 1 cú nhấp.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs sm:text-sm">Chép ảnh PNG độ nét cao (High-Res PNG)</h4>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Bấm nút <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono text-[11px]">Chép PNG</span>. Sau đó mở Anki hoặc Word và nhấn <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">Ctrl + V</code> (Cmd + V trên Mac) để dán trực tiếp.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs sm:text-sm">Chép mã SVG đường nét (Vector SVG)</h4>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Bấm nút <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-mono text-[11px]">Chép SVG</span> để lấy mã vector SVG chuẩn. Thích hợp dán vào các template Anki tùy biến có hỗ trợ SVG nét vẽ.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs sm:text-sm">Sao chép hàng loạt (Batch Copy)</h4>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Ở góc trên bên phải của bảng tra cứu, sử dụng nút <strong>Chép tất cả nét vẽ</strong> để xuất trọn bộ danh sách chữ dưới dạng hình ảnh.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CSV EXPORT & PRINT */}
          {activeTab === 'export' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-xl border border-emerald-100">
                <h3 className="font-bold text-emerald-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  3. Xuất file CSV Thẻ nhớ & In tập viết PDF
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Tạo dữ liệu học tập cá nhân hóa để mang đi mọi nơi hoặc in ấn tập viết thủ công.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs sm:text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Xuất CSV Anki / Excel
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Nhấp vào <strong>Xuất CSV (Anki)</strong> trên thanh công cụ. File CSV tạo ra có chứa sẵn các cột: <em>Kanji, Âm Hán Việt, Nghĩa Việt, Onyomi, Kunyomi, Cấp độ JLPT & Mã SVG</em>.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs sm:text-sm">
                    <Printer className="w-4 h-4 text-teal-600" />
                    In bảng nét / Tạo PDF
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Bấm <strong>In bảng nét</strong> trên thanh Header để mở giao diện in tập viết. Có thể chọn căn lề, hiển thị ô lưới mễ và xuất trực tiếp ra file PDF để in ra giấy A4.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center gap-2 border border-slate-200">
                <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Hỗ trợ tương thích chuẩn Anki 2.1+, Quizlet, Excel và Google Sheets.</span>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSLATION & OCR */}
          {activeTab === 'tools' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-purple-50 to-teal-50/50 p-4 rounded-xl border border-purple-100">
                <h3 className="font-bold text-purple-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  4. Dịch tự động, Bàn phím gõ Kana & Quét ảnh OCR
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Các công cụ thông minh giúp xử lý đoạn văn bản tiếng Nhật dài hoặc ảnh chụp sách báo.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-purple-800 text-xs sm:text-sm">
                    <Languages className="w-4 h-4 text-purple-600" />
                    Dịch đoạn văn tự động (Google Translate API)
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Nhấn nút <strong>Dịch ngay</strong> trong hộp nhập liệu để tự động chuyển ngữ câu tiếng Nhật sang Tiếng Việt hoặc Tiếng Anh, giúp bạn vừa học nghĩa từ vừa tra nét viết.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-teal-800 text-xs sm:text-sm">
                      <Camera className="w-4 h-4 text-teal-600" />
                      Nhận diện chữ Hán từ Ảnh (Kanji OCR Scanner)
                    </div>
                    {onOpenScanner && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenScanner();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        Thử ngay <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Tải ảnh sách báo, biển hiệu hoặc màn hình điện thoại để công cụ OCR trích xuất tự động toàn bộ Kanji vào ô tra cứu.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors select-none text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
            />
            <span>Không tự mở lại khi truy cập ứng dụng</span>
          </label>

          <button
            onClick={handleClose}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-xl shadow-md shadow-teal-900/15 transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
          >
            <span>Đã hiểu, Bắt đầu</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
