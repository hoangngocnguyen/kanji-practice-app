import React, { useState, useMemo } from 'react';
import { RADICALS_LIST } from '../data/radicalsData';
import { RadicalInfo } from '../types/radical';
import { KANJI_DICTIONARY } from '../data/kanjiDictionary';
import { Search, X, Layers3, BookOpen } from 'lucide-react';

interface RadicalExplorerProps {
  onSelectKanji?: (kanji: string) => void;
  onClose?: () => void;
}

export const RadicalExplorer: React.FC<RadicalExplorerProps> = ({ onSelectKanji, onClose }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStrokeFilter, setSelectedStrokeFilter] = useState<number | 'all'>('all');
  const [selectedRadicalModal, setSelectedRadicalModal] = useState<RadicalInfo | null>(null);

  // Group radicals by stroke count
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
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-8 shadow-2xl max-w-6xl w-full mx-auto my-4 text-slate-900">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-2xl shadow-2xs">
            <Layers3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              Tra cứu 214 Bộ thủ Khang Hy
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                214 Kangxi Radicals
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Phân loại chữ Hán theo số nét và bộ thủ nguyên bản Hán Việt - Nhật Bản
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="my-6 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search input */}
        <div className="relative md:col-span-7">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo bộ (言), Tên Hán Việt (NGÔN), Ý nghĩa (Lời nói)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition-colors font-medium shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Stroke count quick filter */}
        <div className="md:col-span-5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedStrokeFilter('all')}
            className={`px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
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
              onClick={() => setSelectedStrokeFilter(num)}
              className={`px-2.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
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

      {/* Radicals Grid grouped by strokes */}
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
        {Object.keys(radicalsByStroke).length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">
            Không tìm thấy bộ thủ phù hợp với từ khóa "{searchQuery}"
          </div>
        ) : (
          Object.keys(radicalsByStroke)
            .map(Number)
            .sort((a, b) => a - b)
            .map((strokeNum) => (
              <div key={strokeNum} className="space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                    {strokeNum} NÉT
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    ({radicalsByStroke[strokeNum].length} bộ thủ)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {radicalsByStroke[strokeNum].map((rad) => (
                    <div
                      key={rad.number}
                      onClick={() => setSelectedRadicalModal(rad)}
                      className="p-3 bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200/90 hover:border-teal-300 rounded-2xl transition-all duration-200 cursor-pointer group flex flex-col items-center justify-between shadow-2xs"
                    >
                      {/* Top number */}
                      <span className="text-[10px] font-mono text-slate-400 self-start font-medium">
                        #{rad.number}
                      </span>

                      {/* Radical character */}
                      <div className="text-3xl font-serif font-black text-slate-900 group-hover:text-teal-800 transition-colors my-1">
                        {rad.character}
                        {rad.variant && rad.variant !== rad.character && (
                          <span className="text-xs font-normal text-teal-600 ml-1">
                            ({rad.variant})
                          </span>
                        )}
                      </div>

                      {/* Name & meaning */}
                      <div className="text-center w-full">
                        <span className="text-xs font-extrabold text-slate-900 block truncate">
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

      {/* Radical Family Modal */}
      {selectedRadicalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedRadicalModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 font-serif font-black text-4xl flex items-center justify-center shadow-xs">
                {selectedRadicalModal.character}
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-teal-700">
                  Bộ thủ Khang Hy #{selectedRadicalModal.number} ({selectedRadicalModal.strokeCount} nét)
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Bộ {selectedRadicalModal.hanViet} {selectedRadicalModal.variant ? `(${selectedRadicalModal.variant})` : ''}
                </h3>
                <p className="text-xs font-medium text-slate-600 mt-0.5">{selectedRadicalModal.meaning}</p>
              </div>
            </div>

            {/* Matching Kanji List */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-teal-600" />
                Các chữ Kanji thuộc bộ {selectedRadicalModal.hanViet}:
              </h4>

              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                {getKanjiInDictionaryForRadical(selectedRadicalModal).map((k, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (onSelectKanji) onSelectKanji(k);
                      setSelectedRadicalModal(null);
                      if (onClose) onClose();
                    }}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all flex flex-col items-center justify-center group cursor-pointer shadow-2xs"
                  >
                    <span className="text-2xl font-serif font-black text-slate-900 group-hover:text-teal-800">
                      {k}
                    </span>
                    {KANJI_DICTIONARY[k] && (
                      <span className="text-[10px] font-semibold text-slate-500 mt-1 truncate w-full text-center">
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
