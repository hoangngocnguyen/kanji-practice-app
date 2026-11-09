import React, { useState } from 'react';
import { KanjiDecomposition, RadicalComponent } from '../types/radical';
import { RADICALS_LIST } from '../data/radicalsData';
import {
  ArrowRight,
  Layers3,
  Star,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Maximize2,
  Minimize2,
} from 'lucide-react';

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
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

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

  const activeList =
    decomposition.directComponents && decomposition.directComponents.length > 0
      ? decomposition.directComponents
      : decomposition.components;
  const compCount = activeList.length;

  // Kiểm tra xem có thành phần nào có subComponents không
  const hasSubComponents = activeList.some(
    (c) => c.subComponents && c.subComponents.length > 0
  );

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  };

  const toggleAllNodes = () => {
    const allCurrentlyOpen = activeList.every(
      (c, idx) =>
        !c.subComponents ||
        c.subComponents.length === 0 ||
        expandedNodes[`root-${idx}-${c.radical}`]
    );

    const nextState: Record<string, boolean> = {};
    if (!allCurrentlyOpen) {
      activeList.forEach((c, idx) => {
        if (c.subComponents && c.subComponents.length > 0) {
          const key = `root-${idx}-${c.radical}`;
          nextState[key] = true;
          c.subComponents.forEach((sc, scIdx) => {
            if (sc.subComponents && sc.subComponents.length > 0) {
              nextState[`${key}-sc-${scIdx}-${sc.radical}`] = true;
            }
          });
        }
      });
    }
    setExpandedNodes(nextState);
  };

  const isAllOpen =
    hasSubComponents &&
    activeList.some(
      (c, idx) =>
        c.subComponents &&
        c.subComponents.length > 0 &&
        expandedNodes[`root-${idx}-${c.radical}`]
    );

  return (
    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs space-y-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
            <Layers3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900">
                Sơ đồ bóc tách Bộ thủ đa cấp
              </h3>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                {compCount} thành phần trực tiếp
              </span>
              {hasSubComponents && (
                <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Hỗ trợ mở rộng cấp 2 & 3
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bộ thủ chính:{' '}
              <span className="text-teal-800 font-bold">{decomposition.primaryRadical}</span>
              {decomposition.isSelfRadical && (
                <span className="ml-2 text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded text-[11px]">
                  ★ Bộ thủ độc lập
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Nút bật/tắt mở rộng toàn bộ các cấp */}
        {hasSubComponents && (
          <button
            type="button"
            onClick={toggleAllNodes}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
            title="Mở rộng hoặc thu gọn toàn bộ các tầng bộ thủ con"
          >
            {isAllOpen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Thu gọn tất cả cấp</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Mở rộng tất cả cấp</span>
              </>
            )}
          </button>
        )}
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
        <div className="w-full max-w-xl h-8 my-1 relative flex justify-center items-center">
          <svg className="w-full h-full stroke-teal-500/60 fill-none" preserveAspectRatio="none">
            {/* Stem line down from root */}
            <line x1="50%" y1="0" x2="50%" y2="50%" strokeWidth="2" strokeDasharray="3 3" />

            {/* Horizontal line spreading to children */}
            {compCount > 1 && (
              <>
                <line x1="12%" y1="50%" x2="88%" y2="50%" strokeWidth="2" />
                {activeList.map((_, idx) => {
                  const xPercent = 12 + (idx * 76) / (compCount - 1);
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

        {/* Direct Components Children Grid (Level 1) */}
        <div
          className={`w-full grid gap-3 mt-1 items-start ${
            compCount === 1
              ? 'grid-cols-1 max-w-xs'
              : compCount === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-2xl'
              : compCount === 3
              ? 'grid-cols-1 md:grid-cols-3 max-w-3xl'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 max-w-4xl'
          }`}
        >
          {activeList.map((comp, idx) => {
            const nodeKey = `root-${idx}-${comp.radical}`;
            const isNodeExpanded = !!expandedNodes[nodeKey];
            const isSelected = activeRadical?.radical === comp.radical;
            const relatedKanji = getRelatedKanjiForRadical(comp.radical);
            const hasSub = comp.subComponents && comp.subComponents.length > 0;

            return (
              <div key={idx} className="flex flex-col items-stretch space-y-2">
                {/* Level 1 Node Card */}
                <div
                  onClick={() => setActiveRadical(isSelected ? null : comp)}
                  className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/90 border-teal-500 shadow-md ring-2 ring-teal-400 scale-[1.02]'
                      : comp.isPrimaryRadical
                      ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 shadow-2xs'
                  }`}
                >
                  {/* Primary Radical Badge or Position Badge */}
                  <div className="flex items-center gap-1 flex-wrap justify-center mb-1.5">
                    {comp.isPrimaryRadical && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5 shadow-2xs">
                        <Star className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                        BỘ CHÍNH
                      </span>
                    )}
                    {comp.positionName && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${getPositionBadgeColor(
                          comp.positionType
                        )}`}
                      >
                        {comp.positionName}
                      </span>
                    )}
                  </div>

                  {/* Radical Character */}
                  <div className="w-11 h-11 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-center mb-1.5 shadow-2xs">
                    <span className="text-2xl font-serif font-black text-slate-900">
                      {comp.radical}
                    </span>
                  </div>

                  {/* Radical Meaning & Stroke */}
                  {comp.hanViet && (
                    <span className="text-xs font-bold text-slate-800 text-center line-clamp-1">
                      {comp.hanViet}
                    </span>
                  )}
                  {comp.meaning && (
                    <span className="text-[11px] font-medium text-slate-500 text-center line-clamp-1 mt-0.5">
                      {comp.meaning}
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-600">
                      {comp.strokeCount} nét chuẩn
                      {comp.actualPathCount && comp.actualPathCount !== comp.strokeCount
                        ? ` • ${comp.actualPathCount} nét vẽ`
                        : ''}
                    </span>
                    {relatedKanji.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-teal-700 font-bold">{relatedKanji.length} Kanji</span>
                      </>
                    )}
                  </div>

                  {/* Nút Toggle mở rộng chi tiết Cấp 2 */}
                  {hasSub && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNode(nodeKey);
                      }}
                      className={`mt-2.5 w-full py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-between border transition-all cursor-pointer shadow-2xs ${
                        isNodeExpanded
                          ? 'bg-teal-700 text-white border-teal-800'
                          : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200'
                      }`}
                      title={
                        isNodeExpanded
                          ? 'Thu gọn cấu tạo con'
                          : `Xem chi tiết ${comp.subComponents!.length} thành phần bên trong`
                      }
                    >
                      <span className="flex items-center gap-1 truncate">
                        <GitBranch className="w-3 h-3" />
                        <span>
                          {isNodeExpanded
                            ? 'Thu gọn cấu tạo con'
                            : `Cấu tạo con (${comp.subComponents!.length})`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 font-kanji text-[10px]">
                        {!isNodeExpanded && (
                          <span className="text-teal-900 font-semibold max-w-[80px] truncate">
                            {comp.subComponents!.map((sc) => sc.radical).join('+')}
                          </span>
                        )}
                        {isNodeExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </span>
                    </button>
                  )}
                </div>

                {/* Sub-Branch: Hiển thị các bộ thủ con Cấp 2 (khi được toggle) */}
                {hasSub && isNodeExpanded && (
                  <div className="relative pl-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="w-0.5 h-3 bg-teal-400 mx-auto -mt-1 mb-1.5 rounded" />
                    <div className="bg-gradient-to-b from-teal-50/70 to-slate-50 p-2.5 rounded-xl border border-teal-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-teal-900 border-b border-teal-100 pb-1">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-teal-600" />
                          <span>Chi tiết bên trong [{comp.radical}]:</span>
                        </span>
                        <span className="text-teal-700 font-mono">
                          {comp.subComponents!.length} bộ phận
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        {comp.subComponents!.map((subComp, scIdx) => {
                          const subKey = `${nodeKey}-sc-${scIdx}-${subComp.radical}`;
                          const isSubSubExpanded = !!expandedNodes[subKey];
                          const hasSubSub =
                            subComp.subComponents && subComp.subComponents.length > 0;
                          const subPos = getPositionBadgeColor(subComp.positionType);
                          const isSubSelected = activeRadical?.radical === subComp.radical;

                          return (
                            <div key={scIdx} className="space-y-1">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRadical(isSubSelected ? null : subComp);
                                }}
                                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                  isSubSelected
                                    ? 'bg-teal-100/80 border-teal-500 shadow-xs'
                                    : 'bg-white hover:bg-teal-50/50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <span className="font-kanji font-black text-sm text-slate-900">
                                      {subComp.radical}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                      {subComp.hanViet && (
                                        <span className="font-bold text-slate-900 text-[11px] truncate">
                                          {subComp.hanViet}
                                        </span>
                                      )}
                                      <span
                                        className={`text-[8px] font-bold px-1 rounded border ${subPos}`}
                                      >
                                        {subComp.positionName || 'Phần con'}
                                      </span>
                                    </div>
                                    {subComp.meaning && (
                                      <p className="text-[10px] text-slate-500 truncate leading-tight">
                                        {subComp.meaning}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-[9px] text-slate-400 font-mono block">
                                    {subComp.strokeCount} nét
                                  </span>
                                </div>
                              </div>

                              {/* Toggle Cấp 3 nếu có */}
                              {hasSubSub && (
                                <div className="pl-3 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleNode(subKey);
                                    }}
                                    className="text-[9px] font-bold text-indigo-700 hover:text-indigo-950 flex items-center gap-1 py-0.5 px-1 rounded bg-indigo-50/70 border border-indigo-200/80 cursor-pointer"
                                  >
                                    <span>
                                      {isSubSubExpanded
                                        ? 'Thu gọn cấp 3'
                                        : `↳ Mở rộng cấp 3 (${subComp.subComponents!.length})`}
                                    </span>
                                    {isSubSubExpanded ? (
                                      <ChevronUp className="w-2.5 h-2.5" />
                                    ) : (
                                      <ChevronDown className="w-2.5 h-2.5" />
                                    )}
                                  </button>

                                  {isSubSubExpanded && (
                                    <div className="pl-2 border-l-2 border-indigo-300 mt-1 space-y-1 animate-in fade-in duration-100">
                                      {subComp.subComponents!.map((ssc, sscIdx) => (
                                        <div
                                          key={sscIdx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveRadical(ssc);
                                          }}
                                          className="flex items-center justify-between p-1 rounded bg-white border border-slate-200 text-[9px] cursor-pointer hover:bg-indigo-50/50"
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="font-kanji font-bold text-slate-900 bg-slate-100 px-1 rounded">
                                              {ssc.radical}
                                            </span>
                                            {ssc.hanViet && (
                                              <span className="font-bold text-slate-800">
                                                {ssc.hanViet}:
                                              </span>
                                            )}
                                            <span className="text-slate-500 truncate">
                                              {ssc.meaning}
                                            </span>
                                          </div>
                                          <span className="text-slate-400 font-mono">
                                            {ssc.strokeCount}n
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Radical Expansion Panel */}
      {activeRadical && (
        <div className="mt-4 p-4 rounded-2xl bg-white border border-teal-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-serif font-black text-2xl shadow-2xs">
                {activeRadical.radical}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  Bộ phận: {activeRadical.hanViet || activeRadical.radical} ({activeRadical.radical})
                  <span className="text-xs font-normal text-slate-500">
                    - {activeRadical.strokeCount} nét chuẩn
                    {activeRadical.actualPathCount &&
                    activeRadical.actualPathCount !== activeRadical.strokeCount
                      ? ` (${activeRadical.actualPathCount} nét vẽ)`
                      : ''}
                  </span>
                </h4>
                {activeRadical.meaning && (
                  <p className="text-xs text-teal-800 font-medium mt-0.5">
                    {activeRadical.meaning}
                  </p>
                )}
              </div>
            </div>

            {onSelectRadical && (
              <button
                type="button"
                onClick={() => onSelectRadical(activeRadical.radical)}
                className="px-3 py-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                Tra trong 214 Bộ thủ
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nếu bộ thủ được chọn có subComponents, hiển thị nhanh danh sách thành phần con */}
          {activeRadical.subComponents && activeRadical.subComponents.length > 0 && (
            <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-100 text-xs space-y-1.5">
              <span className="text-[11px] font-bold text-teal-900 block">
                Cấu tạo của bộ phận này gồm:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeRadical.subComponents.map((sc, scIdx) => (
                  <button
                    key={scIdx}
                    type="button"
                    onClick={() => setActiveRadical(sc)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-teal-200 text-xs font-medium hover:border-teal-400 cursor-pointer shadow-2xs"
                  >
                    <span className="font-kanji font-bold text-teal-900">{sc.radical}</span>
                    {sc.hanViet && <span className="text-slate-700 text-[10px]">{sc.hanViet}</span>}
                    {sc.meaning && <span className="text-slate-400 text-[10px]">({sc.meaning})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Kanji Chips */}
          {getRelatedKanjiForRadical(activeRadical.radical).length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block mb-2">
                Các Kanji thông dụng khác có chứa bộ thủ{' '}
                <span className="text-slate-900 font-bold">{activeRadical.radical}</span>:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getRelatedKanjiForRadical(activeRadical.radical).map((k, i) => (
                  <button
                    key={i}
                    type="button"
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
