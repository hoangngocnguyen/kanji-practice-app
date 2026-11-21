import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { KanjiDecomposition, RadicalComponent } from '../types/radical';
import { RADICALS_LIST } from '../data/radicalsData';
import {
  ArrowRight,
  Layers3,
  ChevronRight,
  Maximize2,
  Minimize2,
  LocateFixed,
  Hand,
  Plus,
  Minus,
} from 'lucide-react';

interface KanjiRadicalTreeProps {
  decomposition: KanjiDecomposition;
  onSelectKanji?: (kanji: string) => void;
  onSelectRadical?: (radicalChar: string) => void;
}

interface TreeStats {
  maxDepth: number;
  totalNodes: number;
  leafCount: number;
  firstLevelBranchKeys: string[];
}

function collectTreeStats(
  components: RadicalComponent[],
  parentPath = '',
  currentDepth = 1
): TreeStats {
  let maxDepth = currentDepth;
  let totalNodes = 0;
  let leafCount = 0;
  const firstLevelBranchKeys: string[] = [];

  components.forEach((comp, idx) => {
    const pathKey = parentPath ? `${parentPath}-${idx}` : `${idx}`;
    totalNodes += 1;
    const hasSub = Boolean(comp.subComponents && comp.subComponents.length > 0);
    if (currentDepth === 1 && hasSub) {
      firstLevelBranchKeys.push(pathKey);
    }

    if (hasSub && comp.subComponents) {
      const childStats = collectTreeStats(comp.subComponents, pathKey, currentDepth + 1);
      if (childStats.maxDepth > maxDepth) maxDepth = childStats.maxDepth;
      totalNodes += childStats.totalNodes;
      leafCount += childStats.leafCount;
    } else {
      leafCount += 1;
    }
  });

  return { maxDepth, totalNodes, leafCount, firstLevelBranchKeys };
}

function getPositionTextClass(type?: string): string {
  switch (type) {
    case 'hen':
      return 'text-cyan-700';
    case 'tsukuri':
      return 'text-indigo-700';
    case 'kanmuri':
      return 'text-amber-700';
    case 'ashi':
      return 'text-emerald-700';
    case 'kamae':
    case 'tare':
    case 'nyo':
      return 'text-rose-700';
    default:
      return 'text-slate-500';
  }
}

interface MindmapNodeProps {
  comp: RadicalComponent;
  nodePath: string;
  siblingIndex: number;
  siblingCount: number;
  collapsedPaths: Record<string, boolean>;
  selectedPath: string | null;
  onSelectNode: (comp: RadicalComponent, pathKey: string) => void;
  onToggleCollapse: (pathKey: string) => void;
}

const MindmapBranchNode: React.FC<MindmapNodeProps> = ({
  comp,
  nodePath,
  siblingIndex,
  siblingCount,
  collapsedPaths,
  selectedPath,
  onSelectNode,
  onToggleCollapse,
}) => {
  const children = comp.subComponents || [];
  const hasChildren = children.length > 0;
  const isCollapsed = Boolean(collapsedPaths[nodePath]);
  const isSelected = selectedPath === nodePath;
  const isFirst = siblingIndex === 0;
  const isLast = siblingIndex === siblingCount - 1;

  return (
    <div className="relative flex items-center pl-5 sm:pl-6 py-1.5">
      {/* Spine connector along the left side across siblings */}
      {siblingCount > 1 && (
        <span
          aria-hidden="true"
          className={`absolute left-0 w-0.5 bg-slate-300 ${
            isFirst ? 'top-1/2 bottom-0' : isLast ? 'top-0 bottom-1/2' : 'top-0 bottom-0'
          }`}
        />
      )}

      {/* Horizontal branch tick into this node */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-0.5 ${
          comp.isPrimaryRadical ? 'bg-teal-500' : 'bg-slate-300'
        }`}
      />

      {/* Node + Recursive Rightward Children */}
      <div className="flex items-center">
        {/* Node Card */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode(comp, nodePath);
          }}
          className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all duration-150 cursor-pointer shrink-0 select-none ${
            isSelected
              ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-500/25 shadow-sm'
              : comp.isPrimaryRadical
              ? 'bg-white border-teal-400 hover:border-teal-600 shadow-2xs'
              : !hasChildren
              ? 'bg-white border-slate-200 hover:border-teal-300 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-teal-400 shadow-2xs'
          }`}
          title={`${comp.radical}${comp.hanViet ? ` (${comp.hanViet})` : ''}${
            comp.meaning ? ` — ${comp.meaning}` : ''
          }`}
        >
          {/* Radical glyph box */}
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              isSelected
                ? 'bg-teal-700 border-teal-800 text-white'
                : comp.isPrimaryRadical
                ? 'bg-teal-50 border-teal-200 text-teal-900'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <span className="font-kanji font-black text-xl leading-none">{comp.radical}</span>
          </div>

          {/* Node text info (no pill soup) */}
          <div className="min-w-0 max-w-[138px]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 truncate">
                {comp.hanViet || (comp.variant ? comp.variant : 'Thành phần')}
              </span>
              <span className="text-[10px] font-mono font-semibold text-slate-400 tabular-nums shrink-0">
                {comp.strokeCount}n
              </span>
            </div>

            {comp.meaning ? (
              <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                {comp.meaning}
              </p>
            ) : (
              <p
                className={`text-[10px] font-medium truncate leading-tight mt-0.5 ${getPositionTextClass(
                  comp.positionType
                )}`}
              >
                {comp.positionName || 'Bộ phận'}
              </p>
            )}

            {(comp.isPrimaryRadical || !hasChildren) && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] font-semibold">
                {comp.isPrimaryRadical && (
                  <span className="text-teal-700">Bộ chính</span>
                )}
                {comp.isPrimaryRadical && !hasChildren && (
                  <span className="text-slate-300">·</span>
                )}
                {!hasChildren && (
                  <span className="text-slate-400">Gốc</span>
                )}
              </div>
            )}
          </div>

          {/* Branch Collapse / Expand Button if children exist */}
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(nodePath);
              }}
              className={`ml-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isCollapsed
                  ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : 'bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-800 border-slate-200'
              }`}
              title={
                isCollapsed
                  ? `Mở rộng ${children.length} thành phần con`
                  : `Thu gọn nhánh [${comp.radical}]`
              }
              aria-label={isCollapsed ? 'Mở rộng nhánh' : 'Thu gọn nhánh'}
            >
              {isCollapsed ? (
                <span className="flex items-center text-[10px] font-bold tabular-nums leading-none">
                  <Plus className="w-2.5 h-2.5" />
                  {children.length}
                </span>
              ) : (
                <Minus className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {/* Outgoing Stem & Recursive Child Branches */}
        {hasChildren && !isCollapsed && (
          <div className="flex items-center">
            <span aria-hidden="true" className="w-5 sm:w-6 h-0.5 bg-slate-300 shrink-0" />
            <div className="flex flex-col justify-center">
              {children.map((child, cIdx) => {
                const childPath = `${nodePath}-${cIdx}`;
                return (
                  <MindmapBranchNode
                    key={`${childPath}-${child.radical}`}
                    comp={child}
                    nodePath={childPath}
                    siblingIndex={cIdx}
                    siblingCount={children.length}
                    collapsedPaths={collapsedPaths}
                    selectedPath={selectedPath}
                    onSelectNode={onSelectNode}
                    onToggleCollapse={onToggleCollapse}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const KanjiRadicalTree: React.FC<KanjiRadicalTreeProps> = ({
  decomposition,
  onSelectKanji,
  onSelectRadical,
}) => {
  const [activeRadical, setActiveRadical] = useState<RadicalComponent | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [collapsedPaths, setCollapsedPaths] = useState<Record<string, boolean>>({});
  const [isPanning, setIsPanning] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panOriginRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const activeList = useMemo(
    () =>
      decomposition.directComponents && decomposition.directComponents.length > 0
        ? decomposition.directComponents
        : decomposition.components,
    [decomposition]
  );

  // Reset trạng thái chọn và thu gọn khi đổi chữ Kanji
  useEffect(() => {
    setActiveRadical(null);
    setSelectedPath(null);
    setCollapsedPaths({});
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ left: 0, top: 0 });
    }
  }, [decomposition.kanji]);

  const treeStats = useMemo(() => collectTreeStats(activeList), [activeList]);
  const hasAnyBranch = treeStats.maxDepth > 1;
  const hasAnyCollapsed = Object.values(collapsedPaths).some(Boolean);

  const getRelatedKanjiForRadical = useCallback((radChar: string) => {
    const found = RADICALS_LIST.find(
      (r) => r.character === radChar || (r.variant && r.variant.includes(radChar))
    );
    return found ? found.examples : [];
  }, []);

  const handleToggleCollapse = useCallback((pathKey: string) => {
    setCollapsedPaths((prev) => ({
      ...prev,
      [pathKey]: !prev[pathKey],
    }));
  }, []);

  const handleSelectNode = useCallback(
    (comp: RadicalComponent, pathKey: string) => {
      if (selectedPath === pathKey) {
        setSelectedPath(null);
        setActiveRadical(null);
      } else {
        setSelectedPath(pathKey);
        setActiveRadical(comp);
      }
    },
    [selectedPath]
  );

  const handleExpandAll = () => {
    setCollapsedPaths({});
  };

  const handleCollapseToLevel1 = () => {
    const next: Record<string, boolean> = {};
    treeStats.firstLevelBranchKeys.forEach((k) => {
      next[k] = true;
    });
    setCollapsedPaths(next);
  };

  const handleResetView = () => {
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  // Kéo di chuyển bằng nút chuột phải (Right-click Grab & Pan)
  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 2 && e.button !== 1) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    e.preventDefault();
    panOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    setIsPanning(true);
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const origin = panOriginRef.current;
      const viewport = viewportRef.current;
      if (!origin || !viewport) return;

      const dx = e.clientX - origin.startX;
      const dy = e.clientY - origin.startY;
      viewport.scrollLeft = origin.scrollLeft - dx;
      viewport.scrollTop = origin.scrollTop - dy;
    };

    const stopPanning = () => {
      setIsPanning(false);
      panOriginRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopPanning);
    window.addEventListener('blur', stopPanning);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopPanning);
      window.removeEventListener('blur', stopPanning);
    };
  }, [isPanning]);

  return (
    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 shrink-0">
            <Layers3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Mindmap bóc tách bộ thủ
              </h3>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {treeStats.maxDepth} tầng · {treeStats.leafCount} bộ gốc
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Bộ chính:{' '}
              <span className="text-teal-800 font-bold">{decomposition.primaryRadical}</span>
              {decomposition.isSelfRadical && (
                <span className="text-teal-700 font-semibold"> · Tự thân làm bộ thủ</span>
              )}
            </p>
          </div>
        </div>

        {/* Mindmap Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {hasAnyBranch && (
            <>
              <button
                type="button"
                onClick={handleExpandAll}
                disabled={!hasAnyCollapsed}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-teal-50 disabled:opacity-45 text-teal-800 border border-slate-200 hover:border-teal-300 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default"
                title="Mở rộng toàn bộ các nhánh bộ thủ"
              >
                <Maximize2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Mở hết</span>
              </button>

              <button
                type="button"
                onClick={handleCollapseToLevel1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Thu gọn các nhánh sâu về cấp 1"
              >
                <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Thu gọn cấp 1</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleResetView}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Đưa góc nhìn về nút gốc"
          >
            <LocateFixed className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Về gốc</span>
          </button>
        </div>
      </div>

      {/* Horizontal Left-to-Right Mindmap Viewport with Right-Click Pan */}
      <div className="relative">
        <div
          ref={viewportRef}
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={handleViewportMouseDown}
          className={`w-full overflow-auto max-h-[420px] sm:max-h-[480px] rounded-xl border border-slate-200 bg-white bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:18px_18px] p-4 sm:p-6 select-none ${
            isPanning ? 'cursor-grabbing [&_*]:!cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div className="inline-flex items-center min-w-max py-2 pr-8">
            {/* Root Kanji Node (Left) */}
            <div className="flex items-center shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-teal-50/90 border-2 border-teal-600 shadow-sm flex flex-col items-center justify-center px-2 text-center select-none">
                <span className="font-kanji font-black text-3xl sm:text-4xl text-teal-950 leading-none">
                  {decomposition.kanji}
                </span>
                {decomposition.hanViet && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 mt-1 truncate max-w-full">
                    {decomposition.hanViet}
                  </span>
                )}
              </div>

              {activeList.length > 0 && (
                <span
                  aria-hidden="true"
                  className="w-5 sm:w-7 h-0.5 bg-teal-500/80 shrink-0"
                />
              )}
            </div>

            {/* Recursive Horizontal Tree Branches (Expanding Left -> Right) */}
            {activeList.length > 0 && (
              <div className="flex flex-col justify-center">
                {activeList.map((comp, idx) => (
                  <MindmapBranchNode
                    key={`root-${idx}-${comp.radical}`}
                    comp={comp}
                    nodePath={`${idx}`}
                    siblingIndex={idx}
                    siblingCount={activeList.length}
                    collapsedPaths={collapsedPaths}
                    selectedPath={selectedPath}
                    onSelectNode={handleSelectNode}
                    onToggleCollapse={handleToggleCollapse}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pan instruction strip */}
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
          <span className="inline-flex items-center gap-1.5">
            <Hand className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>
              Giữ <strong className="font-semibold text-slate-700">chuột phải</strong> và kéo để
              di chuyển sơ đồ · Bấm <strong className="font-semibold text-slate-700">+ / −</strong>{' '}
              để gấp gọn hoặc mở nhánh
            </span>
          </span>
          <span className="hidden sm:inline text-slate-400">Bấm thẻ để xem chi tiết</span>
        </div>
      </div>

      {/* Selected Component Inspector Panel */}
      {activeRadical && (
        <div className="p-4 rounded-xl bg-white border border-teal-200 shadow-xs animate-in fade-in slide-in-from-top-1 duration-150 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-kanji font-black text-2xl shrink-0">
                {activeRadical.radical}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>
                    Bộ phận: {activeRadical.hanViet || activeRadical.radical} (
                    {activeRadical.radical})
                  </span>
                  <span className="text-xs font-normal text-slate-500 tabular-nums">
                    · {activeRadical.strokeCount} nét chuẩn
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
                <span>Tra 214 Bộ thủ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Direct children inside selected component */}
          {activeRadical.subComponents && activeRadical.subComponents.length > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                Thành phần bên trong [{activeRadical.radical}]:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeRadical.subComponents.map((sc, scIdx) => (
                  <button
                    key={scIdx}
                    type="button"
                    onClick={() => {
                      const nextPath = selectedPath ? `${selectedPath}-${scIdx}` : null;
                      setActiveRadical(sc);
                      setSelectedPath(nextPath);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <span className="font-kanji font-bold text-base text-teal-900 leading-none">
                      {sc.radical}
                    </span>
                    {sc.hanViet && <span className="text-slate-700 text-xs">{sc.hanViet}</span>}
                    {sc.meaning && (
                      <span className="text-slate-400 text-[11px] max-w-[140px] truncate">
                        · {sc.meaning}
                      </span>
                    )}
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Kanji Chips */}
          {getRelatedKanjiForRadical(activeRadical.radical).length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block mb-2">
                Các chữ Kanji cùng chứa bộ{' '}
                <strong className="text-slate-900 font-kanji">{activeRadical.radical}</strong>:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getRelatedKanjiForRadical(activeRadical.radical).map((k, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectKanji && onSelectKanji(k)}
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-900 hover:text-teal-800 font-kanji font-bold text-base transition-colors flex items-center justify-center cursor-pointer"
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
