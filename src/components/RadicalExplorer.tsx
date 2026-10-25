import React, { useState, useMemo } from 'react';
import { RADICALS_LIST } from '../data/radicalsData';
import { RadicalInfo } from '../types/radical';
import { KANJI_DICTIONARY } from '../data/kanjiDictionary';
import { Search, Grid, Layers, X, ArrowRight, Filter, BookOpen, Layers3 } from 'lucide-react';

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
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-8 shadow-2xl max-w-6xl w-full mx-auto my-4 text-white">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl">
            <Layers3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              Tra cứu 214 Bộ thủ Khang Hy
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                214 Kangxi Radicals
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Phân loại chữ Hán theo số nét và bộ thủ nguyên bản Hán Việt - Nhật Bản
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
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
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Stroke count quick filter */}
        <div className="md:col-span-5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedStrokeFilter('all')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
              selectedStrokeFilter === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Tất cả (1-17 nét)
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((num) => (
            <button
              key={num}
              onClick={() => setSelectedStrokeFilter(num)}
              className={`px-2.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                selectedStrokeFilter === num
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
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
          <div className="py-12 text-center text-slate-500">
            Không tìm thấy bộ thủ phù hợp với từ khóa "{searchQuery}"
          </div>
        ) : (
          Object.keys(radicalsByStroke)
            .map(Number)
            .sort((a, b) => a - b)
            .map((strokeNum) => (
              <div key={strokeNum} className="space-y-2.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                    {strokeNum} NÉT
                  </span>
                  <span className="text-xs text-slate-500">
                    ({radicalsByStroke[strokeNum].length} bộ thủ)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {radicalsByStroke[strokeNum].map((rad) => (
                    <div
                      key={rad.number}
                      onClick={() => setSelectedRadicalModal(rad)}
                      className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl transition-all duration-200 cursor-pointer group flex flex-col items-center justify-between"
                    >
                      {/* Top number */}
                      <span className="text-[10px] font-mono text-slate-500 self-start">
                        #{rad.number}
                      </span>

                      {/* Radical character */}
                      <div className="text-3xl font-serif font-bold text-white group-hover:text-cyan-300 transition-colors my-1">
                        {rad.character}
                        {rad.variant && rad.variant !== rad.character && (
                          <span className="text-xs font-normal text-cyan-400 ml-1">
                            ({rad.variant})
                          </span>
                        )}
                      </div>

                      {/* Name & meaning */}
                      <div className="text-center w-full">
                        <span className="text-xs font-bold text-slate-200 block truncate">
                          {rad.hanViet}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedRadicalModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-serif font-bold text-4xl flex items-center justify-center shadow-lg">
                {selectedRadicalModal.character}
              </div>
              <div>
                <span className="text-xs font-mono text-cyan-400">
                  Bộ thủ Khang Hy #{selectedRadicalModal.number} ({selectedRadicalModal.strokeCount} nét)
                </span>
                <h3 className="text-xl font-bold text-white">
                  Bộ {selectedRadicalModal.hanViet} {selectedRadicalModal.variant ? `(${selectedRadicalModal.variant})` : ''}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">{selectedRadicalModal.meaning}</p>
              </div>
            </div>

            {/* Matching Kanji List */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
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
                    className="p-3 rounded-2xl bg-slate-950 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col items-center justify-center group"
                  >
                    <span className="text-2xl font-serif font-bold text-white group-hover:text-cyan-300">
                      {k}
                    </span>
                    {KANJI_DICTIONARY[k] && (
                      <span className="text-[10px] text-slate-400 mt-1 truncate w-full text-center">
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
