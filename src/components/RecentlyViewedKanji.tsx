import React from 'react';
import { History, Trash2, Sparkles, Clock } from 'lucide-react';
import { getKanjiInfo } from '../data/kanjiDictionary';

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
      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs px-4 py-3.5 sm:px-6 sm:py-4 transition-all scroll-mt-24 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Title & Badge count */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/60">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Lịch sử tra cứu Kanji</h3>
              <span className="text-[11px] font-semibold text-slate-400">
                ({recentList.length}/25 gần nhất)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Tự động ghi nhớ các từ Kanji bạn đã mở xem hoạt ảnh nét vẽ và luyện viết
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        {hasHistory ? (
          <button
            onClick={onClearHistory}
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors px-2.5 py-1 rounded-xl hover:bg-rose-50 border border-slate-200 hover:border-rose-200 cursor-pointer shadow-2xs"
            title="Xóa toàn bộ lịch sử tra cứu đã lưu"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-300" />
            Tự động lưu khi mở xem chữ
          </span>
        )}
      </div>

      {/* Content Area */}
      {hasHistory ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-2 border-t border-slate-100">
          {recentList.map((char, index) => {
            const detail = getKanjiInfo(char);
            const hanViet = detail?.hanViet;
            const meaning = detail?.meanings?.[0];

            return (
              <button
                key={`${char}-${index}`}
                onClick={() => onSelectKanji(char)}
                className="group relative flex flex-col items-center justify-center px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-teal-50/80 text-slate-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-xl font-kanji font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer min-w-[42px] min-h-[42px]"
                title={`Xem chi tiết & hoạt ảnh nét vẽ chữ "${char}"${hanViet ? ` (Hán-Việt: ${hanViet})` : ''}`}
              >
                <span className="text-base sm:text-lg leading-none font-bold text-slate-900 group-hover:text-teal-900">
                  {char}
                </span>
                <span className="text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-1 rounded leading-tight mt-0.5 max-w-[75px] truncate group-hover:bg-teal-100 font-sans">
                  {hanViet || meaning || `#${index + 1}`}
                </span>
                {index === 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full ring-2 ring-white"
                    title="Mới xem gần đây nhất"
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Chưa có chữ nào trong lịch sử. Bấm vào bất kỳ chữ Kanji nào để xem hoặc thử ngay:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SAMPLE_SUGGESTIONS.map((char) => {
              const detail = getKanjiInfo(char);
              return (
                <button
                  key={char}
                  onClick={() => onSelectKanji(char)}
                  className="flex flex-col items-center justify-center px-2 py-1 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer min-w-[36px]"
                  title={`Mở xem nhanh chữ "${char}"`}
                >
                  <span className="font-kanji font-bold text-sm leading-none">{char}</span>
                  {detail?.hanViet && (
                    <span className="text-[8px] font-bold text-teal-800 bg-teal-50 px-1 rounded mt-0.5 font-sans">
                      {detail.hanViet}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
