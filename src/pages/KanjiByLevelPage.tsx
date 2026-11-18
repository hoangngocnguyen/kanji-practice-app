import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  Grid,
  PlayCircle,
  RotateCcw,
  Repeat1,
  Repeat,
  Volume2,
  FolderPlus,
  CheckSquare,
  Square,
  Sparkles,
  BookOpen,
  ArrowUp,
  Languages,
  Loader2,
  X,
  Plus,
} from 'lucide-react';
import { KanjiDetail, KanjiItem } from '../types/kanji';
import { useKanji } from '../context/KanjiContext';
import { KanjiSvgView } from '../components/KanjiSvgView';
import { KanjiGridOverlay } from '../components/KanjiGridOverlay';
import { KanjiLevelQuiz } from '../components/KanjiLevelQuiz';
import { AddKanjiToDeckModal } from '../components/AddKanjiToDeckModal';
import {
  KanjiCatalogEntry,
  KanjiLevelTab,
  LEVEL_METADATA,
  catalogEntryToKanjiDetail,
  catalogEntryToKanjiItem,
  getStaticSentencesForKanji,
  loadKanjiJoyoCatalog,
  loadKanjiSentencesStatic,
} from '../services/kanjiLevelService';
import { speakJapanese } from '../utils/speech';
import { getPrimaryHiragana } from '../utils/kanji';

const LOAD_MORE_BATCH = 48;

export const KanjiByLevelPage: React.FC = () => {
  const { openKanjiPracticeModal, includeGrid, setIncludeGrid } = useKanji();

  const [catalog, setCatalog] = useState<KanjiCatalogEntry[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [staticSentencesLoaded, setStaticSentencesLoaded] = useState<boolean>(false);

  const [activeLevel, setActiveLevel] = useState<KanjiLevelTab>('N5');
  const [subMode, setSubMode] = useState<'list' | 'quiz'>('list');
  const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows');
  const [showFurigana, setShowFurigana] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [strokeFilter, setStrokeFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(LOAD_MORE_BATCH);

  // Per-character SVG stroke animation state
  const [animStateMap, setAnimStateMap] = useState<
    Record<string, { animKey: number; mode: 'off' | 'once' | 'infinite' }>
  >({});

  // Multi-select state for creating flashcards / custom quiz
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);

  // Add to deck modal state
  const [deckModalEntries, setDeckModalEntries] = useState<KanjiDetail[]>([]);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState<boolean>(false);
  const [suggestedDeckName, setSuggestedDeckName] = useState<string>('JLPT N5 · Ôn tập');

  useEffect(() => {
    let mounted = true;
    setIsLoadingCatalog(true);

    Promise.all([loadKanjiJoyoCatalog(), loadKanjiSentencesStatic()])
      .then(([catalogData]) => {
        if (mounted) {
          setCatalog(catalogData);
          setStaticSentencesLoaded(true);
          setCatalogError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setCatalogError(err?.message || 'Không thể tải danh mục chữ Kanji.');
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingCatalog(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentLevelMeta = useMemo(
    () => LEVEL_METADATA.find((m) => m.key === activeLevel) || LEVEL_METADATA[0],
    [activeLevel]
  );

  // All entries matching the active level tab
  const levelPool = useMemo(() => {
    if (activeLevel === 'JOYO') return catalog;
    return catalog.filter((entry) => entry.lv === activeLevel);
  }, [catalog, activeLevel]);

  // Filtered entries by search query and stroke count
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return levelPool.filter((entry) => {
      if (strokeFilter === '1-6' && entry.st > 6) return false;
      if (strokeFilter === '7-12' && (entry.st < 7 || entry.st > 12)) return false;
      if (strokeFilter === '13+' && entry.st < 13) return false;

      if (!q) return true;
      return (
        entry.c.includes(q) ||
        entry.hv.toLowerCase().includes(q) ||
        entry.vi.some((v) => v.toLowerCase().includes(q)) ||
        entry.on.some((o) => o.toLowerCase().includes(q)) ||
        entry.kun.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [levelPool, searchQuery, strokeFilter]);

  // Reset visibleCount cleanly whenever level or filter changes
  useEffect(() => {
    setVisibleCount(LOAD_MORE_BATCH);
  }, [activeLevel, searchQuery, strokeFilter]);

  // Visible slice for Load More pagination
  const visibleEntries = useMemo(
    () => filteredEntries.slice(0, visibleCount),
    [filteredEntries, visibleCount]
  );

  // Convert visible entries to KanjiItem objects for SVG rendering
  const visibleItems = useMemo<KanjiItem[]>(
    () => visibleEntries.map((entry, idx) => catalogEntryToKanjiItem(entry, idx)),
    [visibleEntries]
  );

  // Map char -> entry lookup
  const catalogByChar = useMemo(() => {
    const map = new Map<string, KanjiCatalogEntry>();
    for (const entry of catalog) {
      map.set(entry.c, entry);
    }
    return map;
  }, [catalog]);

  const selectedEntries = useMemo(
    () =>
      selectedChars
        .map((ch) => catalogByChar.get(ch))
        .filter((e): e is KanjiCatalogEntry => Boolean(e)),
    [selectedChars, catalogByChar]
  );

  const selectedCharSet = useMemo(() => new Set(selectedChars), [selectedChars]);

  const handleTogglePlayMode = (hex: string) => {
    setAnimStateMap((prev) => {
      const current = prev[hex] || { animKey: 0, mode: 'off' };
      const nextMode: 'off' | 'once' | 'infinite' =
        current.mode === 'off' ? 'once' : current.mode === 'once' ? 'infinite' : 'off';
      return {
        ...prev,
        [hex]: { animKey: current.animKey + 1, mode: nextMode },
      };
    });
  };

  const renderReloadButton = (hex: string, mode: 'off' | 'once' | 'infinite') => {
    let icon = <RotateCcw className="w-3.5 h-3.5 text-teal-700" />;
    let btnStyle =
      'bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-800 border-slate-200 shadow-sm';
    let title = 'Phát nét vẽ (1 lần)';

    if (mode === 'once') {
      icon = <Repeat1 className="w-3.5 h-3.5 text-white" />;
      btnStyle = 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700 shadow-sm';
      title = 'Lặp lại liên tục (Đang phát 1 lần)';
    } else if (mode === 'infinite') {
      icon = <Repeat className="w-3.5 h-3.5 text-white animate-pulse" />;
      btnStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm';
      title = 'Tắt nét vẽ (Đang lặp liên tục)';
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleTogglePlayMode(hex);
        }}
        className={`absolute -top-2 -right-2 z-10 p-1.5 rounded-full border transition-all cursor-pointer active:scale-90 hover:scale-105 ${btnStyle}`}
        title={title}
      >
        {icon}
      </button>
    );
  };

  // Open PracticeModal with filtered level context so Left/Right works seamlessly
  const handleInspectEntryChar = useCallback(
    (char: string) => {
      const contextList = filteredEntries.length > 0 ? filteredEntries : levelPool;
      const chars = contextList.map((e) => e.c);
      const prefilledMap: Record<string, KanjiDetail> = {};
      for (const e of contextList) {
        prefilledMap[e.c] = catalogEntryToKanjiDetail(e);
      }
      openKanjiPracticeModal(char, chars, prefilledMap);
    },
    [filteredEntries, levelPool, openKanjiPracticeModal]
  );

  const toggleSelectChar = (char: string) => {
    setSelectedChars((prev) =>
      prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleCharSet = visibleEntries.map((e) => e.c);
    setSelectedChars((prev) => Array.from(new Set([...prev, ...visibleCharSet])));
  };

  const openSaveToDeck = (entriesToSave: KanjiCatalogEntry[], deckTitle?: string) => {
    setDeckModalEntries(entriesToSave.map(catalogEntryToKanjiDetail));
    setSuggestedDeckName(
      deckTitle || `${currentLevelMeta.label} · ${entriesToSave.length} chữ đã chọn`
    );
    setIsDeckModalOpen(true);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remainingCount = Math.max(0, filteredEntries.length - visibleCount);

  return (
    <section className="w-full space-y-5 animate-in fade-in duration-200 pb-10">
      {/* Top Level Header & Mode Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Học Kanji theo cấp độ JLPT &amp; 2.136 Jōyō Kanji
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {currentLevelMeta.desc}
            </p>
          </div>

          {/* List vs Quiz Mode Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSubMode('list')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                subMode === 'list'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Danh sách học</span>
            </button>
            <button
              type="button"
              onClick={() => setSubMode('quiz')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                subMode === 'quiz'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quiz ôn tập</span>
            </button>
          </div>
        </div>

        {/* JLPT N5 -> N1 & Joyo 2.136 Level Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {LEVEL_METADATA.map((meta) => {
            const isActive = activeLevel === meta.key;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => setActiveLevel(meta.key)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-black">{meta.label}</span>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      isActive ? 'text-teal-100' : 'text-teal-700'
                    }`}
                  >
                    {meta.count.toLocaleString('vi-VN')}
                  </span>
                </div>
                <div
                  className={`text-[11px] mt-0.5 truncate ${
                    isActive ? 'text-teal-100/90' : 'text-slate-500'
                  }`}
                >
                  {meta.cumulativeLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingCatalog ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-14 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-700 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Đang nạp danh mục 2.136 chữ Kanji &amp; câu ví dụ tĩnh...
          </p>
        </div>
      ) : catalogError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center text-sm text-rose-700">
          {catalogError}
        </div>
      ) : subMode === 'quiz' ? (
        <KanjiLevelQuiz
          levelLabel={currentLevelMeta.label}
          levelPool={levelPool}
          displayedPool={visibleEntries}
          selectedPool={selectedEntries}
          onInspectChar={handleInspectEntryChar}
          onExportWrongKanji={(details) => {
            setDeckModalEntries(details);
            setSuggestedDeckName(`Chữ hay sai · ${currentLevelMeta.label}`);
            setIsDeckModalOpen(true);
          }}
          onExitQuiz={() => setSubMode('list')}
        />
      ) : (
        <>
          {/* Filter & Display Controls Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo chữ Kanji, âm Hán-Việt, On, Kun hoặc nghĩa tiếng Việt..."
                  className="w-full pl-9 pr-9 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Stroke Filter + View Toggles */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <select
                  value={strokeFilter}
                  onChange={(e) => setStrokeFilter(e.target.value)}
                  aria-label="Lọc theo số nét"
                  className="h-9 px-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-teal-700 cursor-pointer"
                >
                  <option value="all">Mọi số nét</option>
                  <option value="1-6">1 – 6 nét</option>
                  <option value="7-12">7 – 12 nét</option>
                  <option value="13+">13+ nét</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowFurigana((v) => !v)}
                  className={`h-9 px-2.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                    showFurigana
                      ? 'bg-teal-50 border-teal-600 text-teal-900'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>Phiên âm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeGrid((v) => !v)}
                  className={`h-9 px-2.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                    includeGrid
                      ? 'bg-teal-50 border-teal-600 text-teal-900'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Kèm lưới</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSelectMode((v) => !v)}
                  className={`h-9 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                    isSelectMode
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white hover:bg-teal-50 text-teal-800 border-teal-300'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isSelectMode ? 'Đang chọn nhiều' : 'Chọn tạo bộ thẻ'}</span>
                  {selectedChars.length > 0 && (
                    <span className="tabular-nums font-black">({selectedChars.length})</span>
                  )}
                </button>

                {/* Rows / Grid Switcher */}
                <div className="h-9 inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 items-center gap-0.5 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('rows')}
                    className={`h-full px-2.5 text-xs rounded-lg flex items-center gap-1 font-semibold cursor-pointer ${
                      viewMode === 'rows' ? 'bg-teal-800 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Danh sách (1 hàng)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`h-full px-2.5 text-xs rounded-lg flex items-center gap-1 font-semibold cursor-pointer ${
                      viewMode === 'grid' ? 'bg-teal-800 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Lưới thẻ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-bar: Status count & Select-all helper */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="tabular-nums">
                Đang hiển thị <strong className="text-slate-900">{visibleEntries.length}</strong> /{' '}
                <strong className="text-teal-800">{filteredEntries.length}</strong> chữ
                {searchQuery || strokeFilter !== 'all'
                  ? ` (lọc trong ${currentLevelMeta.label})`
                  : ` · ${currentLevelMeta.label}`}
                <span className="hidden sm:inline text-slate-400">
                  {' '}
                  · Nhấp vào chữ hoặc hình SVG để luyện viết nét
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isSelectMode && visibleEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
                  >
                    + Chọn {visibleEntries.length} chữ đang hiện
                  </button>
                )}
                {selectedChars.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedChars([])}
                    className="text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    Bỏ chọn hết ({selectedChars.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Kanji List Content */}
          {visibleEntries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                Không tìm thấy chữ Kanji nào khớp với từ khóa "{searchQuery}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStrokeFilter('all');
                }}
                className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* COMPACT GRID VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {visibleEntries.map((entry, idx) => {
                const item = visibleItems[idx];
                const isSelected = selectedCharSet.has(entry.c);
                const animState = animStateMap[item.hex] || { animKey: 0, mode: 'off' };
                const primaryKana = item.detail ? getPrimaryHiragana(item.detail) : '';

                return (
                  <div
                    key={entry.c}
                    className={`bg-white rounded-2xl border p-3 flex flex-col gap-2 transition-all relative group ${
                      isSelected
                        ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/20'
                        : 'border-slate-200/90 hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400 tabular-nums">
                        #{idx + 1}
                        {activeLevel === 'JOYO' ? ` · ${entry.lv}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSelectChar(entry.c)}
                        className={`p-0.5 rounded cursor-pointer ${
                          isSelected ? 'text-teal-700' : 'text-slate-300 hover:text-teal-700'
                        }`}
                        title={isSelected ? 'Bỏ chọn chữ này' : 'Chọn để thêm vào bộ thẻ'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Stroke SVG Box */}
                    <div className="relative mx-auto w-22 h-22">
                      <div
                        onClick={() => handleInspectEntryChar(entry.c)}
                        className="relative w-full h-full bg-white rounded-xl border border-slate-200 p-1.5 hover:border-teal-500 transition-all cursor-pointer flex items-center justify-center overflow-hidden"
                        title="Nhấp để luyện nét vẽ & xem chi tiết"
                      >
                        {includeGrid && <KanjiGridOverlay dashed={true} type="mi" />}
                        <KanjiSvgView
                          svgUrl={item.svgUrl}
                          kanji={entry.c}
                          animKey={animState.animKey}
                          loopMode={animState.mode}
                          className="w-full h-full object-contain relative z-0"
                        />
                        <div className="absolute bottom-1 right-1 bg-white/90 rounded p-0.5 border border-slate-200 text-teal-700">
                          <PlayCircle className="w-3 h-3" />
                        </div>
                      </div>
                      {renderReloadButton(item.hex, animState.mode)}
                    </div>

                    <div className="text-center space-y-0.5 min-w-0">
                      {showFurigana && primaryKana && (
                        <div className="text-[10px] font-semibold text-teal-700">
                          {primaryKana}
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleInspectEntryChar(entry.c)}
                          className="text-xs font-extrabold text-teal-900 truncate cursor-pointer hover:underline"
                        >
                          {entry.hv}
                        </button>
                        <button
                          type="button"
                          onClick={() => speakJapanese(entry.c)}
                          className="text-slate-400 hover:text-teal-700 cursor-pointer shrink-0"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {entry.vi.join(', ')}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {entry.st} nét
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openSaveToDeck([entry], `${entry.lv} · ${entry.c}`)}
                      className="mt-auto w-full py-1 px-2 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg cursor-pointer flex items-center justify-center gap-1"
                      title="Thêm vào bộ thẻ Flashcard"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Bộ thẻ</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 1 CARD PER ROW (Full-width horizontal card list view, 1 item per row) */
            <div className="space-y-3">
              {visibleEntries.map((entry, idx) => {
                const item = visibleItems[idx];
                const isSelected = selectedCharSet.has(entry.c);
                const animState = animStateMap[item.hex] || { animKey: 0, mode: 'off' };
                const primaryKana = item.detail ? getPrimaryHiragana(item.detail) : '';
                const staticExamples = staticSentencesLoaded
                  ? getStaticSentencesForKanji(entry.c, 1)
                  : [];
                const topExample = staticExamples[0];

                return (
                  <article
                    key={entry.c}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-all ${
                      isSelected
                        ? 'border-teal-600 ring-1 ring-teal-500/30 bg-teal-50/15'
                        : 'border-slate-200/90 hover:border-teal-400'
                    }`}
                  >
                    {/* Left Column: Checkbox, # & Level & Stroke count stacked */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSelectChar(entry.c)}
                        className={`p-1 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'text-teal-700 bg-teal-50' : 'text-slate-300 hover:text-teal-700'
                        }`}
                        title={isSelected ? 'Bỏ chọn' : 'Chọn vào Bộ thẻ'}
                      >
                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>

                      <div className="flex flex-col items-center justify-center font-mono text-xs font-bold text-slate-400 tabular-nums bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200/80 min-w-[48px]">
                        <span>#{idx + 1}</span>
                        <span className="text-teal-800 font-extrabold mt-0.5">{entry.lv}</span>
                        <span className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">{entry.st} nét</span>
                      </div>

                      {/* Kanji Character + Hán-Việt below + Audio */}
                      <div className="flex flex-col items-center text-center">
                        <div className="flex items-center gap-1.5">
                          <ruby
                            onClick={() => handleInspectEntryChar(entry.c)}
                            className="font-kanji font-black text-4xl sm:text-5xl text-slate-900 leading-none cursor-pointer hover:text-teal-700 transition-colors inline-flex flex-col items-center"
                            title="Nhấp để mở modal luyện viết nét"
                          >
                            {showFurigana && primaryKana && (
                              <rt className="text-[11px] font-semibold text-teal-700 pb-0.5">
                                {primaryKana}
                              </rt>
                            )}
                            <span>{entry.c}</span>
                          </ruby>
                          <button
                            type="button"
                            onClick={() => speakJapanese(entry.c)}
                            className="p-1 text-slate-400 hover:text-teal-700 rounded cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="text-xs sm:text-sm font-extrabold text-teal-900 mt-1">
                          {entry.hv}
                        </span>
                      </div>
                    </div>

                    {/* SVG Stroke Order Box (Larger size) */}
                    <div className="relative shrink-0 mx-auto lg:mx-0">
                      <div
                        onClick={() => handleInspectEntryChar(entry.c)}
                        className="relative w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-xl border border-slate-200 p-2 hover:border-teal-500 transition-all cursor-pointer flex items-center justify-center overflow-hidden shadow-2xs"
                        title="Nhấp để xem chi tiết & luyện viết"
                      >
                        {includeGrid && <KanjiGridOverlay dashed={true} type="mi" />}
                        <KanjiSvgView
                          svgUrl={item.svgUrl}
                          kanji={entry.c}
                          animKey={animState.animKey}
                          loopMode={animState.mode}
                          className="w-full h-full object-contain relative z-0"
                        />
                        <div className="absolute bottom-1 right-1 bg-white/90 rounded p-0.5 border border-slate-200 text-teal-700">
                          <PlayCircle className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      {renderReloadButton(item.hex, animState.mode)}
                    </div>

                    {/* Middle Section: Meanings & On / Kun Readings & Larger Example Sentence */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm sm:text-base font-bold text-slate-900">
                        {entry.vi.join(', ')}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-1 text-xs text-slate-700">
                        {entry.on.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded font-bold text-[10px] text-blue-800 bg-blue-50 border border-blue-200">
                              On
                            </span>
                            <span className="font-kanji font-medium text-slate-800">
                              {entry.on.join('、 ')}
                            </span>
                          </div>
                        )}
                        {entry.kun.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded font-bold text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200">
                              Kun
                            </span>
                            <span className="font-kanji font-medium text-slate-800">
                              {entry.kun.join('、 ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Inline Example Sentence with speaker on the left */}
                      {topExample && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => speakJapanese(topExample.jp)}
                            className="p-2 text-slate-400 hover:text-teal-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer shrink-0 mt-0.5 shadow-2xs"
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="font-kanji text-sm sm:text-base font-medium text-slate-900 leading-relaxed break-words">
                              {topExample.jp.split(entry.c).map((seg, sIdx, arr) => (
                                <React.Fragment key={sIdx}>
                                  {seg}
                                  {sIdx < arr.length - 1 && (
                                    <span className="text-teal-700 font-black underline decoration-teal-300 underline-offset-2">
                                      {entry.c}
                                    </span>
                                  )}
                                </React.Fragment>
                              ))}
                            </p>
                            {topExample.kana && (
                              <p className="text-xs font-kanji text-teal-800 font-semibold leading-none">
                                {topExample.kana}
                              </p>
                            )}
                            <p className="text-xs text-slate-600 leading-snug">
                              {topExample.vi}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Section: ONLY "+ Bộ thẻ" Button */}
                    <div className="shrink-0 flex items-center justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => openSaveToDeck([entry], `${entry.lv} · ${entry.c}`)}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        title="Thêm chữ này vào bộ thẻ Flashcard"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Bộ thẻ</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Load More & Back to Top Footer */}
          {filteredEntries.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-slate-600 tabular-nums">
                Đã hiển thị <strong className="text-slate-900">{visibleEntries.length}</strong> /{' '}
                <strong className="text-teal-800">{filteredEntries.length}</strong> chữ (
                {currentLevelMeta.label})
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + LOAD_MORE_BATCH)}
                    className="px-5 py-2.5 min-h-[40px] bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs cursor-pointer tabular-nums transition-all active:scale-95"
                  >
                    Tải thêm {Math.min(LOAD_MORE_BATCH, remainingCount)} chữ (Còn {remainingCount})
                  </button>
                )}

                {remainingCount > 0 && remainingCount <= 240 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(filteredEntries.length)}
                    className="px-4 py-2.5 min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Hiện tất cả
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleScrollToTop}
                  className="px-4 py-2.5 min-h-[40px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
                  title="Quay lại đầu trang"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-teal-700" />
                  <span>Lên đầu trang</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Bottom Selection Action Bar */}
      {selectedEntries.length > 0 && subMode === 'list' && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 max-w-[92vw] sm:max-w-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-300 shrink-0 tabular-nums">
              Đã chọn <strong className="text-white">{selectedEntries.length}</strong>:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-[260px]">
              {selectedEntries.slice(0, 8).map((e) => (
                <span
                  key={e.c}
                  className="font-kanji font-bold text-sm bg-teal-600/85 text-white px-2 py-0.5 rounded-lg shrink-0 inline-flex items-center gap-1"
                >
                  {e.c}
                  <button
                    type="button"
                    onClick={() => toggleSelectChar(e.c)}
                    className="hover:text-rose-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedEntries.length > 8 && (
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  +{selectedEntries.length - 8}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setSelectedChars([])}
              className="text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-lg cursor-pointer"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={() => setSubMode('quiz')}
              className="px-3 py-1.5 text-xs font-bold text-teal-950 bg-teal-100 hover:bg-white rounded-xl cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quiz ({selectedEntries.length})</span>
            </button>
            <button
              type="button"
              onClick={() => openSaveToDeck(selectedEntries)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Lưu vào Bộ thẻ</span>
            </button>
          </div>
        </div>
      )}

      {/* Save Selected / Wrong Kanji into New or Existing StudyFolder */}
      <AddKanjiToDeckModal
        isOpen={isDeckModalOpen}
        entries={deckModalEntries}
        suggestedDeckName={suggestedDeckName}
        onClose={() => setIsDeckModalOpen(false)}
      />
    </section>
  );
};
