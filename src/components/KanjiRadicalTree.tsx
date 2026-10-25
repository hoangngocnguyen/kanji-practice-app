import React, { useState } from 'react';
import { KanjiDecomposition, RadicalComponent } from '../types/radical';
import { RADICALS_LIST } from '../data/radicalsData';
import { ArrowRight, Layers3 } from 'lucide-react';

interface KanjiRadicalTreeProps {
  decomposition: KanjiDecomposition;
  onSelectKanji?: (kanji: string) => void;
  onSelectRadical?: (radicalChar: string) => void;
}

export const KanjiRadicalTree: React.FC<KanjiRadicalTreeProps> = ({
  decomposition,
  onSelectKanji,
  onSelectRadical,
}) => {
  const [activeRadical, setActiveRadical] = useState<RadicalComponent | null>(null);

  const getPositionBadgeColor = (type?: string) => {
    switch (type) {
      case 'hen':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200/80';
      case 'tsukuri':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
      case 'kanmuri':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case 'ashi':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      case 'kamae':
      case 'tare':
      case 'nyo':
        return 'bg-rose-50 text-rose-800 border-rose-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Find matching full radical info from RADICALS_LIST to get related Kanji
  const getRelatedKanjiForRadical = (radChar: string) => {
    const found = RADICALS_LIST.find(
      (r) => r.character === radChar || (r.variant && r.variant.includes(radChar))
    );
    return found ? found.examples : [];
  };

  const compCount = decomposition.components.length;

  return (
    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs">
      {/* Header section */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
            <Layers3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Sơ đồ bóc tách Bộ thủ
              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                {compCount} thành phần
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bộ thủ chính: <span className="text-teal-800 font-bold">{decomposition.primaryRadical}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tree Visualization Layout */}
      <div className="flex flex-col items-center justify-center my-2">
        {/* Root Kanji Node */}
        <div className="relative group cursor-pointer">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-teal-50 border-2 border-teal-600/60 shadow-md flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-teal-600">
            <span className="text-3xl md:text-4xl font-serif font-black text-teal-950">
              {decomposition.kanji}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 mt-0.5">
              {decomposition.hanViet}
            </span>
          </div>
        </div>

        {/* Tree Branch Connectors SVG */}
        <div className="w-full max-w-xl h-10 my-1 relative flex justify-center items-center">
          <svg className="w-full h-full stroke-teal-500/60 fill-none" preserveAspectRatio="none">
            {/* Stem line down from root */}
            <line x1="50%" y1="0" x2="50%" y2="50%" strokeWidth="2" strokeDasharray="3 3" />

            {/* Horizontal line spreading to children */}
            {compCount > 1 && (
              <>
                <line x1="10%" y1="50%" x2="90%" y2="50%" strokeWidth="2" />
                {decomposition.components.map((_, idx) => {
                  const xPercent = 10 + (idx * 80) / (compCount - 1);
                  return (
                    <line
                      key={idx}
                      x1={`${xPercent}%`}
                      y1="50%"
                      x2={`${xPercent}%`}
                      y2="100%"
                      strokeWidth="2"
                    />
                  );
                })}
              </>
            )}
            {compCount === 1 && (
              <line x1="50%" y1="50%" x2="50%" y2="100%" strokeWidth="2" />
            )}
          </svg>
        </div>

        {/* Sub-Radicals Children Grid */}
        <div
          className={`w-full grid gap-2.5 sm:gap-3 mt-1 ${
            compCount === 1
              ? 'grid-cols-1 max-w-xs'
              : compCount === 2
              ? 'grid-cols-2 max-w-md'
              : compCount === 3
              ? 'grid-cols-3 max-w-xl'
              : 'grid-cols-2 sm:grid-cols-4 max-w-2xl'
          }`}
        >
          {decomposition.components.map((comp, idx) => {
            const isSelected = activeRadical?.radical === comp.radical;
            const relatedKanji = getRelatedKanjiForRadical(comp.radical);

            return (
              <div
                key={idx}
                onClick={() => setActiveRadical(isSelected ? null : comp)}
                className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-50/90 border-teal-500 shadow-md ring-1 ring-teal-400 scale-102'
                    : 'bg-white border-slate-200/90 hover:border-teal-300 hover:bg-teal-50/30 shadow-2xs'
                }`}
              >
                {/* Position Badge */}
                {comp.positionName && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border mb-1.5 ${getPositionBadgeColor(
                      comp.positionType
                    )}`}
                  >
                    {comp.positionName}
                  </span>
                )}

                {/* Radical Character */}
                <div className="w-11 h-11 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-center mb-1.5 shadow-2xs">
                  <span className="text-2xl font-serif font-black text-slate-900">
                    {comp.radical}
                  </span>
                </div>

                {/* Radical Meaning & Stroke */}
                <span className="text-xs font-bold text-slate-800 text-center line-clamp-1">
                  {comp.hanViet}
                </span>
                <span className="text-[11px] font-medium text-slate-500 text-center line-clamp-1 mt-0.5">
                  {comp.meaning}
                </span>

                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-600">{comp.strokeCount} nét</span>
                  {relatedKanji.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-teal-700 font-bold">{relatedKanji.length} Kanji</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Radical Expansion Panel */}
      {activeRadical && (
        <div className="mt-4 p-4 rounded-2xl bg-white border border-teal-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-serif font-black text-2xl shadow-2xs">
                {activeRadical.radical}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Bộ thủ {activeRadical.hanViet} ({activeRadical.radical})
                  <span className="text-xs font-normal text-slate-500">
                    - {activeRadical.strokeCount} nét
                  </span>
                </h4>
                <p className="text-xs text-teal-800 font-medium mt-0.5">{activeRadical.meaning}</p>
              </div>
            </div>

            {onSelectRadical && (
              <button
                onClick={() => onSelectRadical(activeRadical.radical)}
                className="px-3 py-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Tra trong 214 Bộ thủ
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Related Kanji Chips */}
          {getRelatedKanjiForRadical(activeRadical.radical).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block mb-2">
                Các Kanji thông dụng khác có chứa bộ thủ <span className="text-slate-900 font-bold">{activeRadical.radical}</span>:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getRelatedKanjiForRadical(activeRadical.radical).map((k, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectKanji && onSelectKanji(k)}
                    className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-900 hover:text-teal-800 font-serif font-bold text-base transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                    title={`Xem chi tiết chữ ${k}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
