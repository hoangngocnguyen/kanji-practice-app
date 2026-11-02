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
  Grid,
  Chrome,
  Scissors,
  Bookmark,
  Table
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

type TabKey = 'lookup' | 'extension' | 'scanner' | 'radicals' | 'anki' | 'export';

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
      label: 'Tra Cứu & Nét Vẽ',
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: 'extension',
      label: 'Chrome Extension v3.0',
      icon: <Chrome className="w-4 h-4" />,
      badge: 'HOT',
    },
    {
      id: 'scanner',
      label: 'Quét Ảnh OCR & Dịch AI',
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: 'radicals',
      label: '214 Bộ Thủ Kangxi',
      icon: <Bookmark className="w-4 h-4" />,
    },
    {
      id: 'anki',
      label: 'Chép Thẻ Anki & Word',
      icon: <Copy className="w-4 h-4" />,
      badge: 'Phổ biến',
    },
    {
      id: 'export',
      label: 'Xuất CSV & In Bảng Nét A4',
      icon: <FileSpreadsheet className="w-4 h-4" />,
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
                  Hướng Dẫn Cẩm Nang Học & Tra Cứu Kanji Toàn Diện
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 rounded-full shadow-xs">
                  v3.0.0
                </span>
              </div>
              <p className="text-xs text-teal-100/80 hidden sm:block">
                Khám phá trọn bộ tính năng Web App & Chrome Extension: Tra nét vẽ, quét OCR, bộ thủ, Anki & In ấn
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
                  1. Tra Cứu Câu / Văn Bản & Trích Xuất Kanji Tự Động
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Nhập bất kỳ đoạn văn bản tiếng Nhật (ví dụ: <code className="bg-teal-100/80 text-teal-900 px-1.5 py-0.5 rounded font-mono">一期一会 温故知新</code>), ứng dụng sẽ tự động tách các ký tự Hán tự độc nhất và hiển thị bảng tra cứu cùng thứ tự nét vẽ.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs sm:text-sm">
                    <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                    Hoạt Ảnh Nét Vẽ Động (SVG Stroke Animation)
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Mỗi chữ Kanji có ảnh nét vẽ được vẽ hoạt hình sinh động. Bạn có thể tạm dừng, chạy lại hoặc thay đổi tốc độ (0.5x, 1x, 2x) theo nhu cầu luyện tập.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs sm:text-sm">
                    <Grid className="w-4 h-4 text-teal-600" />
                    Chế Độ Lưới Kẻ Ô Mễ (米)
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Bật công tắc <strong>+ Ô lưới</strong> để hiển thị đường căn nét chữ (tâm, đường chéo mễ) giúp bạn tập viết Kanji chuẩn tỉ lệ như trong vở luyện chữ.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs sm:text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Điều Hướng Trái / Phải Nhanh Giữa Các Chữ (Phím ← / →)
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Khi đang mở modal xem chi tiết, bạn có thể chuyển tức thì sang chữ tiếp theo hoặc trước đó bằng phím mũi tên <strong>Trái (←)</strong> / <strong>Phải (→)</strong> trên bàn phím, hoặc bấm nút điều hướng trên header modal mà không cần đóng modal rồi cuộn trang.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <strong className="font-semibold">Mẹo Luyện Viết:</strong> Bạn có thể nhấp chuột trực tiếp vào bất kỳ ô chữ Kanji nào để mở <strong>Cửa sổ chi tiết (Practice Modal)</strong> để tập vẽ đè nét chữ, xem cách phân tích bộ thủ và nghe âm Hiragana/Kunyomi chuẩn!
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHROME EXTENSION v3.0.0 */}
          {activeTab === 'extension' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-teal-950 p-4 rounded-xl text-white shadow-sm border border-teal-800/60">
                <div className="flex items-center gap-2 mb-1 text-teal-300 font-bold text-sm sm:text-base">
                  <Chrome className="w-5 h-5 text-teal-400" />
                  <span>2. Tiện Ích Chrome Extension v3.0.0 (Khoanh Vùng Snipping OCR)</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Tiện ích tra cứu Kanji thế hệ mới giúp bạn đọc tin tức tiếng Nhật (NHK, Yahoo), xem Manga hay Youtube và quét trích xuất Kanji tức thì mà không cần rời trang web.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-teal-800 text-xs sm:text-sm">
                    <Scissors className="w-4 h-4 text-teal-600" />
                    Khoanh Vùng Chụp Màn Hình (Ctrl + Shift + K)
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Bấm phím tắt <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">Ctrl + Shift + K</code> (hoặc <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">Cmd + Shift + K</code> trên Mac) rồi kéo chuột khoanh vùng bất kỳ đoạn văn bản hoặc hình ảnh chứa chữ Hán.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-teal-800 text-xs sm:text-sm">
                    <Layers className="w-4 h-4 text-teal-600" />
                    Cửa Sổ Tra Cứu Nổi & Ô Tìm Kiếm Kép (Floating Modal)
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Kết quả trích xuất được hiển thị ngay trên cửa sổ nổi (có thể nắm kéo di chuyển). Cửa sổ tích hợp ô tìm kiếm giúp tra cứu nhanh câu/từ vựng mới mà không cần mở tab khác.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-teal-800 text-xs sm:text-sm">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    Từ Điển 11,000+ Âm Hán-Việt & Hoạt Ảnh SVG Nét Vẽ
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Cung cấp đầy đủ âm Hán Việt chuẩn cho mọi chữ Kanji N5~N1, On/Kun, số nét, bộ thủ và hình vẽ hoạt ảnh nét vẽ chuẩn xác.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-teal-50 rounded-xl text-xs text-teal-900 border border-teal-200 flex items-center justify-between">
                <span>Tải tệp ZIP cài đặt trong phần <strong>"Tải Tiện Ích Extension"</strong> ở cuối trang Web App.</span>
              </div>
            </div>
          )}

          {/* TAB 3: SCANNER & AI TRANSLATION */}
          {activeTab === 'scanner' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-purple-50 to-teal-50/50 p-4 rounded-xl border border-purple-100">
                <h3 className="font-bold text-purple-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  3. Quét Ảnh OCR Chữ Hán & Dịch Câu Tự Động
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Công cụ thông minh giúp xử lý hình ảnh chụp sách báo, biển hiệu hoặc dịch nhanh ngữ cảnh câu văn tiếng Nhật dài.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-teal-800 text-xs sm:text-sm">
                      <Camera className="w-4 h-4 text-teal-600" />
                      Nhận Diện Chữ Hán Từ Ảnh (Kanji OCR Scanner)
                    </div>
                    {onOpenScanner && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenScanner();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        Mở Trình Quét <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Tải ảnh sách báo, biển hiệu hoặc chụp màn hình điện thoại để công cụ OCR trích xuất tự động toàn bộ chữ Kanji vào danh sách tra cứu nét vẽ.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-purple-800 text-xs sm:text-sm">
                    <Languages className="w-4 h-4 text-purple-600" />
                    Dịch Đoạn Văn Tự Động (Google Translate API)
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Nhấn nút <strong>Dịch ngay</strong> trong hộp nhập liệu để tự động chuyển ngữ câu tiếng Nhật sang Tiếng Việt hoặc Tiếng Anh, giúp bạn vừa học nghĩa từ vừa tra nét viết.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 214 KANGXI RADICALS */}
          {activeTab === 'radicals' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-amber-50 to-teal-50/50 p-4 rounded-xl border border-amber-100">
                <h3 className="font-bold text-amber-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                  4. Khám Phá 214 Bộ Thủ Khang Hi (214 Kangxi Radicals)
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Tra cứu chi tiết cấu tạo Kanji theo các bộ thủ từ 1 nét đến 17 nét chuẩn từ điển Khang Hi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs sm:text-sm">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Phân Loại Theo Số Nét Bộ Thủ
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Dễ dàng tìm kiếm bộ thủ theo số nét (ví dụ: Bộ 1 nét <code>一</code>, <code>丨</code> đến bộ 17 nét <code>龠</code>).
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-teal-800 font-semibold text-xs sm:text-sm">
                    <Search className="w-4 h-4 text-teal-600" />
                    Danh Sách Chữ Hán Chứa Bộ Thủ
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Khi bấm vào một bộ thủ, hệ thống sẽ liệt kê tất cả các chữ Kanji có chứa bộ thủ đó để học từ vựng theo chuỗi logic.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANKI & COPYING */}
          {activeTab === 'anki' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-indigo-50 to-teal-50/50 p-4 rounded-xl border border-indigo-100">
                <h3 className="font-bold text-indigo-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Copy className="w-4 h-4 text-indigo-600" />
                  5. Sao Chép Sơ Đồ Nét Vào Anki, Word & Notion
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
                    <h4 className="font-semibold text-slate-800 text-xs sm:text-sm">Chép Ảnh PNG Độ Nét Cao (High-Res PNG)</h4>
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
                    <h4 className="font-semibold text-slate-800 text-xs sm:text-sm">Chép Mã SVG Đường Nét (Vector SVG)</h4>
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
                    <h4 className="font-semibold text-slate-800 text-xs sm:text-sm">Sao Chép Hàng Loạt (Batch Copy)</h4>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Ở góc trên bên phải của bảng tra cứu, sử dụng nút <strong>Chép tất cả nét vẽ</strong> để xuất trọn bộ danh sách chữ dưới dạng hình ảnh.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CSV EXPORT & PRINT */}
          {activeTab === 'export' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-xl border border-emerald-100">
                <h3 className="font-bold text-emerald-900 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  6. Xuất Dữ Liệu Google Docs, Anki CSV & In Bảng Nét A4
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Tạo dữ liệu học tập cá nhân hóa để mang đi mọi nơi hoặc sao chép thẳng vào Google Docs / Word.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs sm:text-sm">
                    <Table className="w-4 h-4 text-emerald-600" />
                    Dán Google Docs (1 Cột)
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Bấm <strong>Dán Google Docs</strong> trên thanh công cụ để xuất bảng ảnh nét vẽ Kanji. Tùy chọn bật/tắt linh hoạt các cột (STT, Chữ Hán, Âm đọc, Ảnh nét vẽ) và sao chép 1 chạm để dán trực tiếp (`Ctrl + V`).
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs sm:text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Xuất CSV Anki / Excel
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Nhấp vào <strong>Xuất CSV (Anki)</strong> trên thanh công cụ để tạo file CSV chứa sẵn dữ liệu chữ, Hán-Việt, On/Kun và nghĩa để import vào Anki.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-xs sm:text-sm">
                    <Printer className="w-4 h-4 text-teal-600" />
                    In Bảng Nét / Tạo PDF A4 Đa Trang
                  </div>
                  <p className="text-slate-600 text-xs leading-normal">
                    Bấm biểu tượng <strong>Máy in</strong> trên Header để chọn các cột cần in (STT, Chữ Hán, Âm đọc, Ảnh nét vẽ, Ô luyện viết tay) với thuật toán tự động ngắt trang A4 chuẩn (multi-page pagination) không bị cắt ngắn hay nhân bản.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center gap-2 border border-slate-200">
                <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Hỗ trợ tương thích chuẩn Google Docs, Anki 2.1+, Quizlet, Excel và Google Sheets.</span>
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
