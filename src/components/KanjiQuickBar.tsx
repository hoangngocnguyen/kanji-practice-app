import React from 'react';
import { KanjiItem } from '../types/kanji';
import { getKanjiInfo } from '../data/kanjiDictionary';
import { Zap, ChevronRight } from 'lucide-react';

interface KanjiQuickBarProps {
  kanjiList: KanjiItem[];
  onSelectKanji: (item: KanjiItem) => void;
  selectedKanjiChar?: string;
  title?: string;
}

export const KanjiQuickBar: React.FC<KanjiQuickBarProps> = ({
  kanjiList,
  onSelectKanji,
  selectedKanjiChar,
  title = 'Chọn nhanh từ Kanji (Click mở xem nét vẽ & luyện viết ngay):',
}) => {
  if (!kanjiList || kanjiList.length === 0) return null;

  return (
    <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 space-y-2 transition-all">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 min-w-0">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="truncate text-[11px] sm:text-xs">{title}</span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full shrink-0">
          {kanjiList.length} chữ
        </span>
      </div>

      {/* Horizontal scrollable quick chips bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar touch-pan-x scroll-smooth select-none">
        {kanjiList.map((item, index) => {
          const isSelected = selectedKanjiChar === item.kanji;
          const hanViet = item.detail?.hanViet || getKanjiInfo(item.kanji)?.hanViet;
          const primaryMeaning = item.detail?.meanings?.[0] || getKanjiInfo(item.kanji)?.meanings?.[0];

          return (
            <button
              key={`${item.kanji}-${index}`}
              type="button"
              onClick={() => onSelectKanji(item)}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                isSelected
                  ? 'bg-teal-700 text-white border-teal-800 shadow-md ring-2 ring-teal-500/30 scale-105 font-black min-w-[42px]'
                  : 'bg-white hover:bg-teal-50/70 text-slate-800 border-slate-200/90 hover:border-teal-300 min-w-[40px]'
              }`}
              title={`Click mở xem nhanh thứ tự nét vẽ chữ "${item.kanji}"${hanViet ? ` (Hán-Việt: ${hanViet})` : ''}`}
            >
              <span
                className={`font-kanji font-bold text-base sm:text-lg leading-none ${
                  isSelected ? 'text-white' : 'text-slate-900 group-hover:text-teal-900'
                }`}
              >
                {item.kanji}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-bold leading-tight mt-0.5 max-w-[70px] truncate px-1 rounded ${
                  isSelected
                    ? 'bg-white/20 text-teal-100 font-extrabold'
                    : 'bg-teal-50 text-teal-900 border border-teal-200/80 group-hover:bg-teal-100'
                }`}
              >
                {hanViet || primaryMeaning || `#${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
