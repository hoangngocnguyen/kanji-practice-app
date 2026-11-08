import React, { useState } from 'react';
import {
  BookOpen,
  Keyboard,
  PenTool,
  Languages,
  ArrowLeftRight,
  Bookmark,
  Printer,
  History,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Camera,
  Play,
  Grid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserGuideViewProps {
  onOpenScanner?: () => void;
}

type GuideTabKey =
  | 'input'
  | 'strokes'
  | 'romaji'
  | 'translate'
  | 'converter'
  | 'radicals'
  | 'history'
  | 'export';

export const UserGuideView: React.FC<UserGuideViewProps> = ({ onOpenScanner }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<GuideTabKey>('input');

  const tabs: { id: GuideTabKey; label: string; icon: React.ReactNode }[] = [
    {
      id: 'input',
      label: 'Nhập & IME',
      icon: <Keyboard className="w-3.5 h-3.5" />,
    },
    {
      id: 'strokes',
      label: 'Nét viết & Luyện vẽ',
      icon: <PenTool className="w-3.5 h-3.5" />,
    },
    {
      id: 'romaji',
      label: 'Phiên âm Romaji',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    {
      id: 'translate',
      label: 'Dịch câu song ngữ',
      icon: <Languages className="w-3.5 h-3.5" />,
    },
    {
      id: 'converter',
      label: 'Chuyển Romaji ⇄ Kana',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
    },
    {
      id: 'radicals',
      label: '214 Bộ thủ',
      icon: <Bookmark className="w-3.5 h-3.5" />,
    },
    {
      id: 'history',
      label: 'Lịch sử ngoại tuyến',
      icon: <History className="w-3.5 h-3.5" />,
    },
    {
      id: 'export',
      label: 'In A4 & Google Docs',
      icon: <Printer className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Compact Navigation Tab Bar */}
        <div className="flex items-center gap-1 px-3 sm:px-5 pt-2 bg-slate-50/90 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-teal-800 border-teal-600 shadow-2xs'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="p-4 sm:p-5 text-slate-700">
          {/* TAB 1: NHẬP VĂN BẢN & BỘ GÕ IME */}
          {activeTab === 'input' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    Nhập văn bản tiếng Nhật &amp; Bộ gõ Romaji IME
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/input')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Tới trang Nhập <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Keyboard className="w-4 h-4 text-teal-600" />
                    Bộ gõ Kanji IME trực tiếp (Space / Tab)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bật chế độ <strong>漢 Kanji IME</strong> ngay trên khung nhập để gõ Romaji tự nhiên (như <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-teal-800">nihon</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-teal-800">gakusei</code>). Nhấn phím <strong>Space</strong> hoặc <strong>Tab</strong> để chọn gợi ý Hán tự chuẩn xác mà không cần cài thêm bàn phím tiếng Nhật.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Gõ Hiragana &amp; Katakana tự động
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Chọn chế độ <strong>あ Hiragana</strong> hoặc <strong>ア Katakana</strong> để ký tự Romaji được chuyển sang Kana ngay trong lúc gõ (ví dụ gõ <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-teal-800">sakura</code> thành <span className="font-japanese font-bold text-teal-800">さくら</span>).
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Quét ảnh OCR nhận diện chữ Hán
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nhấp nút <strong>Chọn ảnh / Dán ảnh</strong> để tải ảnh chụp sách báo, bảng hiệu hoặc dán ảnh từ clipboard (<code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">Ctrl + V</code>). Hệ thống sẽ tự động quét và trích xuất chữ Kanji.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                    Nhận diện &amp; Chuyển đổi từ Latinh
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Khi dán đoạn văn bản có xen kẽ từ phiên âm Romaji, hộp thông báo thông minh sẽ xuất hiện gợi ý bạn chuyển đổi nhanh sang Hiragana hoặc Katakana chỉ với 1 cú nhấp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NÉT VIẾT & LUYỆN VẼ */}
          {activeTab === 'strokes' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    Nét viết Kanji, ảnh động SVG &amp; Luyện viết tay
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/kanji')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Tới trang Nét viết <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Play className="w-4 h-4 text-emerald-600" />
                    Hoạt ảnh thứ tự nét vẽ (Stroke Animation)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mỗi chữ Kanji trong văn bản được hiển thị kèm ảnh nét động SVG chuẩn KanjiVG. Bạn có thể nhấn xem từng nét, phát lại hoặc điều chỉnh tốc độ vẽ.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Grid className="w-4 h-4 text-teal-600" />
                    Lưới căn tỷ lệ ô Mễ (米)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bật công tắc <strong>+ Ô lưới</strong> để hiển thị các đường tâm và đường chéo mễ tự, hỗ trợ căn chỉnh bố cục chữ Hán cân đối chuẩn thư pháp.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <PenTool className="w-4 h-4 text-teal-600" />
                    Bảng luyện viết tay trên Canvas
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bấm vào biểu tượng <strong>Phóng to / Luyện viết</strong> trên từng chữ để mở cửa sổ phóng to. Bạn có thể dùng chuột hoặc bút cảm ứng vẽ đè lên nét mờ để rèn nét viết.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <BookOpen className="w-4 h-4 text-teal-600" />
                    Từ điển Hán-Việt, Onyomi &amp; Kunyomi
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cung cấp đầy đủ âm Hán-Việt in hoa, giải nghĩa tiếng Việt, cách đọc âm On/Kun và phát âm bản xứ bằng giọng đọc chuẩn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHIÊN ÂM ROMAJI */}
          {activeTab === 'romaji' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    Phiên âm Romaji xen dòng song song
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/romaji')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Tới trang Romaji <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-teal-900">
                    Bố cục đối chiếu từng câu song song
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Trang <strong>Phiên âm Romaji</strong> được thiết kế theo cấu trúc xen dòng sạch sẽ: Dòng trên là câu tiếng Nhật gốc, dòng dưới là phiên âm Romaji chuẩn Hepburn với khoảng cách từ ngữ rõ ràng.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-teal-900">
                    Nghe phát âm từng câu &amp; Sao chép
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mỗi dòng có sẵn nút <strong>Nghe giọng đọc</strong> tiếng Nhật tự nhiên và nút <strong>Sao chép câu</strong> giúp bạn dễ dàng luyện đọc và lưu vào tài liệu cá nhân.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DỊCH CÂU SONG NGỮ */}
          {activeTab === 'translate' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    Dịch câu song ngữ Nhật - Việt
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/translate')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Tới trang Dịch câu <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-teal-900">
                    Tách câu thông minh &amp; Dịch nghĩa chuẩn xác
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Văn bản được tách theo từng câu văn độc lập kèm bản dịch tiếng Việt tương ứng. Bạn có thể tra cứu nhanh nghĩa của toàn đoạn văn dài mà không cần thoát ứng dụng.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-teal-900">
                    Hỗ trợ công cụ dịch Google &amp; Gemini AI
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tự động kết nối cơ chế dịch câu mượt mà, phân tích văn phong tiếng Nhật chuẩn xác với ngữ cảnh tự nhiên.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CHUYỂN ĐỔI ROMAJI ⇄ KANA */}
          {activeTab === 'converter' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    Chuyển đổi Romaji sang Hiragana &amp; Katakana (Trang riêng)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/converter')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Tới trang Chuyển đổi <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                    Chuyển đổi 2 khung Input / Output tách bạch
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Khung nhập văn bản Romaji và khung kết quả Kana được bố trí song song trực quan, giúp bạn chuyển đổi toàn bộ đoạn văn nhanh chóng mà không làm ảnh hưởng đến văn bản gốc đang học.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Nút Hoàn tác (Undo) &amp; Làm lại (Redo)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nếu bạn chuyển nhầm giữa Hiragana và Katakana, hãy bấm nút <strong>Hoàn tác (Undo)</strong> để khôi phục lại trạng thái ký tự trước đó ngay lập tức mà không lo mất chữ.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: 214 BỘ THỦ KHANG HY */}
          {activeTab === 'radicals' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    6
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    214 Bộ thủ Khang Hy (Kangxi Radicals)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/radicals')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Tới trang Bộ thủ <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-amber-900">
                    Phân loại theo số nét (1 nét đến 17 nét)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bộ thủ được nhóm khoa học theo số nét viết, kèm theo tên gọi Hán-Việt, biến thể bộ thủ và ý nghĩa gốc giúp ghi nhớ căn bản chữ Hán vững chắc.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-teal-900">
                    Xem danh sách Kanji chứa bộ thủ
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bấm vào bất kỳ bộ thủ nào để mở danh sách toàn bộ các chữ Kanji được cấu tạo từ bộ thủ đó, hỗ trợ học chữ Hán theo họ từ vựng.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: LỊCH SỬ NGOẠI TUYẾN */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    7
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    Lịch sử tra cứu ngoại tuyến &amp; Tái sử dụng
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  Tới trang Lịch sử <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-teal-900">
                    Lưu trữ không giới hạn vào bộ nhớ trình duyệt
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mọi chữ Kanji bạn đã tra cứu đều được lưu tự động vào bộ nhớ cục bộ (localStorage). Bạn có thể mở lại ứng dụng bất kỳ lúc nào để ôn tập ngoại tuyến mà không cần kết nối Internet hay gọi lại API.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-xs sm:text-sm text-teal-900">
                    Chuyển đổi linh hoạt giữa dạng lưới nét vẽ và danh sách
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Trang Lịch sử tra cứu dùng chung thành phần trực quan như trang Nét viết: xem ảnh nét vẽ SVG, tra nghĩa nhanh, tìm kiếm từ vựng và mở luyện viết trực tiếp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: IN A4 & XUẤT GOOGLE DOCS */}
          {activeTab === 'export' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                    8
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    In phiếu tập viết A4 tùy chọn &amp; Xuất Google Docs
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Printer className="w-4 h-4 text-teal-600" />
                    In phiếu tập viết A4 có chọn lọc
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Trong cửa sổ <strong>In trang tập viết</strong>, bạn có thể tự do chọn hoặc bỏ chọn từng chữ Kanji cần in (kèm nút <em>Chọn tất cả</em> và <em>Bỏ chọn tất cả</em>). Chỉ những chữ bạn muốn ôn tập mới được in ra giấy A4 với định dạng ô mễ chữ điền chuẩn mực.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-teal-900">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Dán nhanh vào Google Docs &amp; Word
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bấm <strong>Dán Google Docs</strong> trên thanh điều hướng để tạo bảng danh sách Kanji. Bạn có thể bật/tắt các cột theo nhu cầu và nhấn nút <strong>Sao chép bảng</strong> để dán trực tiếp vào Google Docs hoặc Microsoft Word.
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
