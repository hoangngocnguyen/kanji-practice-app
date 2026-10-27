import React from 'react';
import { History, Trash2, Sparkles, Clock } from 'lucide-react';

interface RecentlyViewedKanjiProps {
  recentList: string[];
  onSelectKanji: (kanjiChar: string) => void;
  onClearHistory: () => void;
}

const SAMPLE_SUGGESTIONS = ['日', '本', '語', '学', '心', '友'];

export const RecentlyViewedKanji: React.FC<RecentlyViewedKanjiProps> = ({
  recentList,
  onSelectKanji,
  onClearHistory,
}) => {
  const hasHistory = recentList && recentList.length > 0;

  return (
    <div
      id="recently-viewed-section"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs px-4 py-3 sm:px-5 sm:py-3.5 transition-all scroll-mt-24"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Title & Badge count */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
            <History className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-slate-800">Lịch sử tra cứu Kanji</span>
            <span className="text-[11px] font-semibold text-slate-400">
              ({recentList.length}/25 gần nhất)
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        {hasHistory ? (
          <button
            onClick={onClearHistory}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
            title="Xóa toàn bộ lịch sử tra cứu đã lưu"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-300" />
            Tự động lưu khi mở xem chữ
          </span>
        )}
      </div>

      {/* Content Area */}
      {hasHistory ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mt-2.5 pt-2 border-t border-slate-100">
          {recentList.map((char, index) => (
            <button
              key={`${char}-${index}`}
              onClick={() => onSelectKanji(char)}
              className="group relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-slate-50 hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-xl font-kanji font-bold text-base sm:text-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer min-w-[36px] min-h-[36px]"
              title={`Xem chi tiết & hoạt ảnh nét vẽ chữ "${char}"`}
            >
              <span>{char}</span>
              {index === 0 && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full ring-2 ring-white"
                  title="Mới nhất"
                />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Chưa có chữ nào trong lịch sử. Bấm vào bất kỳ chữ Kanji nào bên dưới hoặc thử ngay:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SAMPLE_SUGGESTIONS.map((char) => (
              <button
                key={char}
                onClick={() => onSelectKanji(char)}
                className="w-8 h-8 sm:w-8.5 sm:h-8.5 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-lg font-kanji font-bold text-sm transition-all shadow-2xs active:scale-95 cursor-pointer min-w-[32px] min-h-[32px]"
                title={`Mở xem nhanh chữ "${char}"`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
