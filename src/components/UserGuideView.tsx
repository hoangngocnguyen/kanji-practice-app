import React, { useState } from 'react';
import {
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
  Table,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { WorkspaceTab } from './AppSidebar';

interface UserGuideViewProps {
  onOpenScanner?: () => void;
  onNavigateTab?: (tab: WorkspaceTab) => void;
}

type TabKey = 'lookup' | 'extension' | 'scanner' | 'radicals' | 'anki' | 'export';

export const UserGuideView: React.FC<UserGuideViewProps> = ({
  onOpenScanner,
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('lookup');

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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-700/60 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <BookOpen className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Hướng Dẫn Cẩm Nang Học &amp; Tra Cứu Kanji
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 rounded-full shadow-xs">
                  v3.0.0 Pro
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-0.5 max-w-2xl">
                Khám phá trọn bộ tính năng Web App &amp; Chrome Extension: Tra nét vẽ SVG động, quét OCR từ ảnh, 214 bộ thủ Khang Hy, sao chép Anki &amp; xuất file in ấn A4.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('input-text')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>Bắt đầu Luyện Kanji</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Full Page Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Tab Bar */}
        <div className="flex items-center gap-1 px-3 sm:px-6 pt-3 bg-slate-50/90 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold rounded-t-2xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-teal-800 border-teal-600 shadow-2xs'
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

        {/* Tab Content Panels */}
        <div className="p-4 sm:p-6 sm:p-8 space-y-6 text-slate-700">
          {/* TAB 1: LOOKUP & STROKE ANIMATION */}
          {activeTab === 'lookup' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-teal-100 space-y-1">
                <h2 className="font-bold text-teal-900 text-base sm:text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-teal-600" />
                  1. Tra Cứu Câu / Văn Bản &amp; Trích Xuất Kanji Tự Động
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Dán bất kỳ đoạn văn bản tiếng Nhật nào (ví dụ: <code className="bg-teal-100/80 text-teal-900 px-1.5 py-0.5 rounded font-mono font-bold">一期一会 温故知新</code>), ứng dụng sẽ tự động tách các ký tự Hán tự độc nhất và hiển thị bảng tra cứu cùng thứ tự nét vẽ chi tiết.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-sm sm:text-base">
                    <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                    Hoạt Ảnh Nét Vẽ Động (SVG Stroke Animation)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Mỗi chữ Kanji có ảnh nét vẽ được vẽ hoạt hình sinh động. Bạn có thể tạm dừng, chạy lại hoặc thay đổi tốc độ (0.5x, 1x, 2x) theo nhu cầu luyện tập.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-sm sm:text-base">
                    <Grid className="w-4 h-4 text-teal-600" />
                    Chế Độ Lưới Kẻ Ô Mễ (米)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Bật công tắc <strong>+ Ô lưới</strong> để hiển thị đường căn nét chữ (tâm, đường chéo mễ) giúp bạn tập viết Kanji chuẩn tỉ lệ như trong vở luyện chữ.
                  </p>
                </div>

                <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-50 to-indigo-50/50 rounded-2xl border border-teal-200/90 space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-teal-900 font-bold text-sm sm:text-base">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Bộ Gõ IME Nhật Bản: Romaji → Hiragana → Kanji Trực Tiếp (Phím Space / Tab)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Không cần cài đặt thêm bàn phím tiếng Nhật trên máy tính hay điện thoại: Bật chế độ <strong>漢 Kanji IME</strong>, bạn vẫn gõ Romaji tự nhiên (như <code className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-teal-900 font-bold">hana</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-teal-900 font-bold">nihon</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-teal-900 font-bold">gakusei</code>). Khi nhấn phím <strong>Tab</strong> (hoặc <strong>Space</strong>), hệ thống sẽ mở menu gợi ý Kanji chuẩn IME Nhật Bản.
                  </p>
                </div>

                <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/90 space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm sm:text-base">
                    <Languages className="w-5 h-5 text-emerald-600" />
                    Phiên Âm Romaji Tách Từ Chuẩn Hepburn (Bật/Tắt Romaji)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Nút <strong>Romaji [BẬT/TẮT]</strong> hỗ trợ tự động chuyển toàn bộ văn bản tiếng Nhật sang phiên âm Romaji chuẩn Hepburn với khoảng trắng phân tách từ ghép và cụm từ rõ ràng.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200/90 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-950">
                  <strong className="font-bold">Mẹo Luyện Viết:</strong> Bạn có thể nhấp chuột trực tiếp vào bất kỳ ô chữ Kanji nào để mở <strong>Cửa sổ chi tiết (Practice Modal)</strong> để tập vẽ đè nét chữ, xem cách phân tích bộ thủ và nghe âm Hiragana/Kunyomi chuẩn!
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHROME EXTENSION v3.0.0 */}
          {activeTab === 'extension' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-teal-950 p-5 rounded-2xl text-white shadow-sm border border-teal-800/60 space-y-2">
                <div className="flex items-center gap-2 text-teal-300 font-black text-base sm:text-lg">
                  <Chrome className="w-6 h-6 text-teal-400" />
                  <span>2. Tiện Ích Chrome Extension v3.0.0 (Khoanh Vùng Snipping OCR)</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Tiện ích tra cứu Kanji thế hệ mới giúp bạn đọc tin tức tiếng Nhật (NHK, Yahoo), xem Manga hay Youtube và quét trích xuất Kanji tức thì mà không cần rời trang web.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-teal-800 text-sm sm:text-base">
                    <Scissors className="w-4 h-4 text-teal-600" />
                    Khoanh Vùng Chụp Màn Hình (Ctrl + Shift + K)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Bấm phím tắt <code className="bg-white text-slate-900 border border-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">Ctrl + Shift + K</code> (hoặc <code className="bg-white text-slate-900 border border-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">Cmd + Shift + K</code> trên Mac) rồi kéo chuột khoanh vùng bất kỳ đoạn văn bản hoặc hình ảnh chứa chữ Hán.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-teal-800 text-sm sm:text-base">
                    <Layers className="w-4 h-4 text-teal-600" />
                    Cửa Sổ Tra Cứu Nổi &amp; Ô Tìm Kiếm Kép (Floating Modal)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Kết quả trích xuất được hiển thị ngay trên cửa sổ nổi (có thể nắm kéo di chuyển). Cửa sổ tích hợp ô tìm kiếm giúp tra cứu nhanh câu/từ vựng mới mà không cần mở tab khác.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-teal-800 text-sm sm:text-base">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    Từ Điển 11,000+ Âm Hán-Việt &amp; Hoạt Ảnh SVG Nét Vẽ
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Cung cấp đầy đủ âm Hán Việt chuẩn cho mọi chữ Kanji N5~N1, On/Kun, số nét, bộ thủ và hình vẽ hoạt ảnh nét vẽ chuẩn xác.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCANNER & AI TRANSLATION */}
          {activeTab === 'scanner' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-purple-50 to-teal-50/50 p-5 rounded-2xl border border-purple-100 space-y-1">
                <h2 className="font-bold text-purple-900 text-base sm:text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  3. Quét Ảnh OCR Chữ Hán &amp; Dịch Câu Tự Động
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Công cụ thông minh giúp xử lý hình ảnh chụp sách báo, biển hiệu hoặc dịch nhanh ngữ cảnh câu văn tiếng Nhật dài.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-teal-800 text-sm sm:text-base">
                      <Camera className="w-4 h-4 text-teal-600" />
                      Nhận Diện Chữ Hán Từ Ảnh (Kanji OCR Scanner)
                    </div>
                    {onOpenScanner && (
                      <button
                        type="button"
                        onClick={onOpenScanner}
                        className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        Mở Trình Quét OCR ngay <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Tải ảnh sách báo, biển hiệu hoặc chụp màn hình điện thoại để công cụ OCR trích xuất tự động toàn bộ chữ Kanji vào danh sách tra cứu nét vẽ.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-800 text-sm sm:text-base">
                    <Languages className="w-4 h-4 text-purple-600" />
                    Dịch Đoạn Văn Tự Động (Google Translate &amp; Gemini AI)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Chuyển sang trang <strong>Dịch câu song ngữ</strong> trên thanh bên để tự động chuyển ngữ câu tiếng Nhật sang Tiếng Việt chuẩn xác.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 214 KANGXI RADICALS */}
          {activeTab === 'radicals' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-amber-50 to-teal-50/50 p-5 rounded-2xl border border-amber-100 space-y-1">
                <h2 className="font-bold text-amber-950 text-base sm:text-lg flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-600" />
                  4. Khám Phá 214 Bộ Thủ Khang Hi (214 Kangxi Radicals)
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Tra cứu chi tiết cấu tạo Kanji theo các bộ thủ từ 1 nét đến 17 nét chuẩn từ điển Khang Hi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm sm:text-base">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Phân Loại Theo Số Nét Bộ Thủ
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Dễ dàng tìm kiếm bộ thủ theo số nét (ví dụ: Bộ 1 nét <code>一</code>, <code>丨</code> đến bộ 17 nét <code>龠</code>).
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-sm sm:text-base">
                    <Search className="w-4 h-4 text-teal-600" />
                    Danh Sách Chữ Hán Chứa Bộ Thủ
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Khi bấm vào một bộ thủ, hệ thống sẽ liệt kê tất cả các chữ Kanji có chứa bộ thủ đó để học từ vựng theo chuỗi logic.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANKI & COPYING */}
          {activeTab === 'anki' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-indigo-50 to-teal-50/50 p-5 rounded-2xl border border-indigo-100 space-y-1">
                <h2 className="font-bold text-indigo-950 text-base sm:text-lg flex items-center gap-2">
                  <Copy className="w-5 h-5 text-indigo-600" />
                  5. Sao Chép Sơ Đồ Nét Vào Anki, Word &amp; Notion
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Dễ dàng sao chép đồ họa thứ tự nét vẽ vào phần mềm thẻ nhớ Anki hoặc tài liệu học tập chỉ bằng 1 cú nhấp.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 shadow-2xs">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Chép Ảnh PNG Độ Nét Cao (High-Res PNG)</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                      Bấm nút <span className="px-1.5 py-0.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs font-bold">Chép PNG</span>. Sau đó mở Anki hoặc Word và nhấn <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-900 font-mono font-bold">Ctrl + V</code> (Cmd + V trên Mac) để dán trực tiếp.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 shadow-2xs">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Chép Mã SVG Đường Nét (Vector SVG)</h3>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                      Bấm nút <span className="px-1.5 py-0.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs font-bold">Chép SVG</span> để lấy mã vector SVG chuẩn. Thích hợp dán vào các template Anki tùy biến có hỗ trợ SVG nét vẽ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CSV EXPORT & PRINT */}
          {activeTab === 'export' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-100 space-y-1">
                <h2 className="font-bold text-emerald-950 text-base sm:text-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  6. Xuất Dữ Liệu Google Docs, Anki CSV &amp; In Bảng Nét A4
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Tạo dữ liệu học tập cá nhân hóa để mang đi mọi nơi hoặc sao chép thẳng vào Google Docs / Word.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
                    <Table className="w-4 h-4 text-emerald-600" />
                    Dán Google Docs (1 Cột)
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Bấm <strong>Dán Google Docs</strong> trên thanh công cụ để xuất bảng ảnh nét vẽ Kanji. Tùy chọn bật/tắt linh hoạt các cột và sao chép 1 chạm để dán trực tiếp.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm sm:text-base">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Xuất CSV Anki / Excel
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Nhấp vào <strong>Xuất CSV (Anki)</strong> trên thanh công cụ để tạo file CSV chứa sẵn dữ liệu chữ, Hán-Việt, On/Kun và nghĩa để import vào Anki.
                  </p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-sm sm:text-base">
                    <Printer className="w-4 h-4 text-teal-600" />
                    In Bảng Nét / Tạo PDF A4 Đa Trang
                  </div>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Bấm biểu tượng <strong>Máy in</strong> trên Header để chọn các cột cần in với thuật toán tự động ngắt trang A4 chuẩn (multi-page pagination).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
