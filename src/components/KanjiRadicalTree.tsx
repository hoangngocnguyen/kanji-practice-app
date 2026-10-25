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
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'tsukuri':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'kanmuri':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ashi':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'kamae':
      case 'tare':
      case 'nyo':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl backdrop-blur-sm">
      {/* Header section */}
      <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Layers3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Sơ đồ bóc tách Bộ thủ
              <span className="text-xs font-normal text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                {compCount} thành phần
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Bộ thủ chính: <span className="text-cyan-400 font-medium">{decomposition.primaryRadical}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tree Visualization Layout */}
      <div className="flex flex-col items-center justify-center my-2">
        {/* Root Kanji Node */}
        <div className="relative group cursor-pointer">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-b from-cyan-500/20 via-blue-600/10 to-slate-900 border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/10 flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-400">
            <span className="text-3xl md:text-4xl font-bold text-white font-serif">
              {decomposition.kanji}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 mt-0.5">
              {decomposition.hanViet}
            </span>
          </div>
        </div>

        {/* Tree Branch Connectors SVG */}
        <div className="w-full max-w-xl h-10 my-1 relative flex justify-center items-center">
          <svg className="w-full h-full stroke-cyan-500/50 fill-none" preserveAspectRatio="none">
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
                className={`relative flex flex-col items-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-102'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                }`}
              >
                {/* Position Badge */}
                {comp.positionName && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border mb-1.5 ${getPositionBadgeColor(
                      comp.positionType
                    )}`}
                  >
                    {comp.positionName}
                  </span>
                )}

                {/* Radical Character */}
                <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mb-1.5 shadow-inner">
                  <span className="text-2xl font-serif font-bold text-white">
                    {comp.radical}
                  </span>
                </div>

                {/* Radical Meaning & Stroke */}
                <span className="text-xs font-semibold text-slate-200 text-center line-clamp-1">
                  {comp.hanViet}
                </span>
                <span className="text-[11px] text-slate-400 text-center line-clamp-1 mt-0.5">
                  {comp.meaning}
                </span>

                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                  <span>{comp.strokeCount} nét</span>
                  {relatedKanji.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-400 font-medium">{relatedKanji.length} Kanji</span>
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
        <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-serif font-bold text-2xl">
                {activeRadical.radical}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  Bộ thủ {activeRadical.hanViet} ({activeRadical.radical})
                  <span className="text-xs font-normal text-slate-400">
                    - {activeRadical.strokeCount} nét
                  </span>
                </h4>
                <p className="text-xs text-cyan-300/90 mt-0.5">{activeRadical.meaning}</p>
              </div>
            </div>

            {onSelectRadical && (
              <button
                onClick={() => onSelectRadical(activeRadical.radical)}
                className="px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors flex items-center gap-1.5"
              >
                Tra trong 214 Bộ thủ
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Related Kanji Chips */}
          {getRelatedKanjiForRadical(activeRadical.radical).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-2">
                Các Kanji thông dụng khác có chứa bộ thủ <span className="text-white font-semibold">{activeRadical.radical}</span>:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getRelatedKanjiForRadical(activeRadical.radical).map((k, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectKanji && onSelectKanji(k)}
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 font-serif font-bold text-base transition-colors flex items-center justify-center"
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
