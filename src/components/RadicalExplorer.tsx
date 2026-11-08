import React, { useState, useMemo } from 'react';
import { RADICALS_LIST } from '../data/radicalsData';
import { RadicalInfo } from '../types/radical';
import { KANJI_DICTIONARY } from '../data/kanjiDictionary';
import { Search, X, BookOpen, Layers3 } from 'lucide-react';

interface RadicalExplorerProps {
  onSelectKanji?: (kanji: string) => void;
  onClose?: () => void;
}

export const RadicalExplorer: React.FC<RadicalExplorerProps> = ({
  onSelectKanji,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStrokeFilter, setSelectedStrokeFilter] = useState<number | 'all'>('all');
  const [selectedRadicalModal, setSelectedRadicalModal] = useState<RadicalInfo | null>(null);

  // Group radicals by search query & stroke filter
  const filteredRadicals = useMemo(() => {
    return RADICALS_LIST.filter((rad) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rad.character.includes(q) ||
        (rad.variant && rad.variant.includes(q)) ||
        rad.hanViet.toLowerCase().includes(q) ||
        rad.meaning.toLowerCase().includes(q) ||
        rad.number.toString() === q;

      const matchesStroke =
        selectedStrokeFilter === 'all' || rad.strokeCount === selectedStrokeFilter;

      return matchesSearch && matchesStroke;
    });
  }, [searchQuery, selectedStrokeFilter]);

  // Group filtered radicals by stroke number for structured display
  const radicalsByStroke = useMemo(() => {
    const groups: Record<number, RadicalInfo[]> = {};
    filteredRadicals.forEach((rad) => {
      if (!groups[rad.strokeCount]) {
        groups[rad.strokeCount] = [];
      }
      groups[rad.strokeCount].push(rad);
    });
    return groups;
  }, [filteredRadicals]);

  // Find all Kanji in our dictionary that belong to a chosen radical
  const getKanjiInDictionaryForRadical = (rad: RadicalInfo) => {
    const directMatches = rad.examples;
    const dictMatches = Object.keys(KANJI_DICTIONARY).filter((k) => {
      const info = KANJI_DICTIONARY[k];
      return (
        info.radical?.includes(rad.character) ||
        info.radical?.includes(rad.hanViet) ||
        directMatches.includes(k)
      );
    });

    // Merge & deduplicate
    const combined = Array.from(new Set([...directMatches, ...dictMatches]));
    return combined;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Filter and Search Bar Card - Sticky beneath Header */}
      <div className="sticky top-16 sm:top-[68px] z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm p-3.5 sm:p-4 space-y-2.5 transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo chữ bộ (言, 氵), tên Hán-Việt (NGÔN), ý nghĩa (lời nói), hoặc số (#1)..."
              className="w-full pl-9 sm:pl-10 pr-12 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Result Count Badge */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Hiển thị:</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
              {filteredRadicals.length} / 214 bộ thủ
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stroke count quick filter bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedStrokeFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              selectedStrokeFilter === 'all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            Tất cả (1-17 nét)
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setSelectedStrokeFilter(num)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                selectedStrokeFilter === num
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              {num} nét
            </button>
          ))}
        </div>
      </div>

      {/* Radicals Grid grouped by stroke count - Natural page flow without height bounds */}
      <div className="space-y-6">
        {Object.keys(radicalsByStroke).length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-medium">
            Không tìm thấy bộ thủ phù hợp với từ khóa "{searchQuery}"
          </div>
        ) : (
          Object.keys(radicalsByStroke)
            .map(Number)
            .sort((a, b) => a - b)
            .map((strokeNum) => (
              <div key={strokeNum} className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                    {strokeNum} NÉT
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    ({radicalsByStroke[strokeNum].length} bộ thủ)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3">
                  {radicalsByStroke[strokeNum].map((rad) => (
                    <div
                      key={rad.number}
                      onClick={() => setSelectedRadicalModal(rad)}
                      className="bg-white hover:bg-teal-50/60 border border-slate-200 hover:border-teal-400 rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all cursor-pointer shadow-2xs hover:shadow-xs group min-h-[110px]"
                    >
                      {/* Top index number */}
                      <span className="text-[10px] font-mono text-slate-400 self-start font-medium leading-none">
                        #{rad.number}
                      </span>

                      {/* Radical character */}
                      <div className="text-2xl sm:text-3xl font-serif font-black text-slate-900 group-hover:text-teal-800 transition-colors my-1">
                        {rad.character}
                        {rad.variant && rad.variant !== rad.character && (
                          <span className="text-xs font-normal text-teal-600 ml-1">
                            ({rad.variant})
                          </span>
                        )}
                      </div>

                      {/* Name & meaning */}
                      <div className="w-full">
                        <span className="text-xs font-extrabold text-slate-900 block truncate uppercase">
                          {rad.hanViet}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 block truncate">
                          {rad.meaning}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Radical Detail Popup Modal */}
      {selectedRadicalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedRadicalModal(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer z-10"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-slate-100 shrink-0 pr-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 font-serif font-black text-2xl sm:text-4xl flex items-center justify-center shadow-xs shrink-0">
                {selectedRadicalModal.character}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-teal-700">
                  Bộ thủ Khang Hy #{selectedRadicalModal.number} ({selectedRadicalModal.strokeCount} nét)
                </span>
                <h3 className="text-base sm:text-xl font-extrabold text-slate-900 truncate">
                  Bộ {selectedRadicalModal.hanViet}{' '}
                  {selectedRadicalModal.variant ? `(${selectedRadicalModal.variant})` : ''}
                </h3>
                <p className="text-xs font-medium text-slate-600 mt-0.5">
                  {selectedRadicalModal.meaning}
                </p>
              </div>
            </div>

            {/* Matching Kanji List */}
            <div className="flex-1 min-h-0 flex flex-col">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 shrink-0">
                <BookOpen className="w-4 h-4 text-teal-600" />
                Các chữ Kanji thuộc bộ {selectedRadicalModal.hanViet}:
              </h4>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 overflow-y-auto p-1 scrollbar-thin flex-1 min-h-0">
                {getKanjiInDictionaryForRadical(selectedRadicalModal).map((k, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (onSelectKanji) onSelectKanji(k);
                      setSelectedRadicalModal(null);
                      if (onClose) onClose();
                    }}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all flex flex-col items-center justify-center group cursor-pointer shadow-2xs"
                  >
                    <span className="text-xl sm:text-2xl font-serif font-black text-slate-900 group-hover:text-teal-800">
                      {k}
                    </span>
                    {KANJI_DICTIONARY[k] && (
                      <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 mt-0.5 truncate w-full text-center">
                        {KANJI_DICTIONARY[k].hanViet}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
