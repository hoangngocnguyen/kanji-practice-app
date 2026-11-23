import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  Copy,
  Check,
  Download,
  MoreVertical,
  FolderPlus,
  PenTool,
  Send,
  Columns3,
  Grid,
  Volume2,
  Loader2,
  CheckSquare,
  Square,
  RotateCcw,
  PlayCircle,
  Repeat1,
  ArrowRight,
  PenLine,
} from 'lucide-react';
import { KanjiDetail } from '../types/kanji';
import { useKanji } from '../context/KanjiContext';
import { usePageLoadingIndicator } from '../context/LoadingContext';
import { KanjiSearchResultsSkeleton } from '../components/PageSkeletons';
import { KanjiSvgView } from '../components/KanjiSvgView';
import { KanjiGridOverlay } from '../components/KanjiGridOverlay';
import { AddKanjiToDeckModal } from '../components/AddKanjiToDeckModal';
import { HandwritingSearchModal } from '../components/HandwritingSearchModal';
import {
  StaticSentencePair,
  loadKanjiSentencesStatic,
} from '../services/kanjiLevelService';
import {
  KanjiSearchDocument,
  KanjiSearchResult,
  SearchFilterOptions,
  loadUnifiedKanjiSearchIndex,
  normalizeVietnameseText,
  searchDocToKanjiDetail,
  searchDocToKanjiItem,
  searchKanjiReverse,
} from '../services/kanjiReverseSearchService';
import { speakJapanese } from '../utils/speech';

const BATCH_SIZE = 40;

const SUGGESTED_QUERIES = [
  { label: 'nam', hint: 'Nam giới / Phía nam' },
  { label: 'con trai, đàn ông', hint: 'Nhiều cụm nghĩa' },
  { label: 'nữ, con gái', hint: 'Phụ nữ' },
  { label: 'học tập', hint: 'Giáo dục' },
  { label: 'ánh sáng', hint: 'Tự nhiên' },
  { label: 'nước', hint: 'Thủy / Ẩm' },
  { label: 'bình yên', hint: 'An tĩnh' },
  { label: 'mặt trời', hint: 'Nhật / Dương' },
];

const LEVEL_FILTERS: Array<{ key: NonNullable<SearchFilterOptions['level']>; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'N5', label: 'N5' },
  { key: 'N4', label: 'N4' },
  { key: 'N3', label: 'N3' },
  { key: 'N2', label: 'N2' },
  { key: 'N1', label: 'N1' },
  { key: 'EXT', label: 'Ngoài Jōyō' },
];

/**
 * Tô sáng các cụm từ khớp (hỗ trợ cả có dấu và không dấu tiếng Việt)
 */
function HighlightedVietnameseText({
  text,
  matchedTerms,
}: {
  text: string;
  matchedTerms: string[];
}) {
  if (!text || matchedTerms.length === 0) return <>{text}</>;

  // Lọc các từ khóa hợp lệ (>= 2 ký tự hoặc trùng khớp toàn văn)
  const normTerms = Array.from(
    new Set(
      matchedTerms
        .map((t) => normalizeVietnameseText(t))
        .filter((t) => t.length >= 2)
    )
  ).sort((a, b) => b.length - a.length);

  if (normTerms.length === 0) return <>{text}</>;

  // Ánh xạ vị trí chuỗi chuẩn hóa sang chỉ số ký tự gốc để tô sáng giữ nguyên dấu tiếng Việt
  const charPairs: Array<{ origIndex: number; normChar: string }> = [];
  for (let i = 0; i < text.length; i++) {
    const rawChar = text[i];
    const normChar = rawChar
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (/^[a-z0-9]$/.test(normChar)) {
      charPairs.push({ origIndex: i, normChar });
    } else if (/\s/.test(rawChar)) {
      if (charPairs.length > 0 && charPairs[charPairs.length - 1].normChar !== ' ') {
        charPairs.push({ origIndex: i, normChar: ' ' });
      }
    }
  }

  const normString = charPairs.map((p) => p.normChar).join('');
  const highlightMask = new Array<boolean>(text.length).fill(false);

  for (const term of normTerms) {
    let startIdx = 0;
    while (startIdx < normString.length) {
      const idx = normString.indexOf(term, startIdx);
      if (idx === -1) break;

      const beforeOk = idx === 0 || normString[idx - 1] === ' ';
      const afterOk =
        idx + term.length === normString.length || normString[idx + term.length] === ' ';

      if (beforeOk && afterOk) {
        const origStart = charPairs[idx]?.origIndex ?? 0;
        const origEnd = charPairs[idx + term.length - 1]?.origIndex ?? origStart;
        for (let k = origStart; k <= origEnd; k++) {
          highlightMask[k] = true;
        }
      }
      startIdx = idx + term.length;
    }
  }

  // Gom đoạn liên tiếp
  const segments: Array<{ text: string; active: boolean }> = [];
  let currentText = '';
  let currentActive = highlightMask[0] || false;

  for (let i = 0; i < text.length; i++) {
    const active = highlightMask[i];
    if (active !== currentActive && currentText) {
      segments.push({ text: currentText, active: currentActive });
      currentText = '';
    }
    currentActive = active;
    currentText += text[i];
  }
  if (currentText) {
    segments.push({ text: currentText, active: currentActive });
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.active ? (
          <mark
            key={i}
            className="bg-teal-100/90 text-teal-900 font-semibold rounded px-0.5"
          >
            {seg.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

export const KanjiSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const {
    inputText,
    setInputText,
    openKanjiPracticeModal,
    includeGrid,
    setIncludeGrid,
    handleDownloadPng,
    selectedCompareKanji,
    toggleCompareKanji,
  } = useKanji();

  const [queryInput, setQueryInput] = useState<string>(initialQuery);
  const [levelFilter, setLevelFilter] = useState<NonNullable<SearchFilterOptions['level']>>('all');
  const [strokeFilter, setStrokeFilter] = useState<NonNullable<SearchFilterOptions['strokeRange']>>('all');
  const [visibleLimit, setVisibleLimit] = useState<number>(BATCH_SIZE);

  // Corpus data
  const [searchDocs, setSearchDocs] = useState<KanjiSearchDocument[]>([]);
  const [staticSentences, setStaticSentences] = useState<Record<string, StaticSentencePair[]>>({});
  const [isLoadingIndex, setIsLoadingIndex] = useState<boolean>(true);
  const [indexError, setIndexError] = useState<string | null>(null);

  usePageLoadingIndicator('kanji-search', isLoadingIndex);

  // Per-row interactive states
  const [copiedChar, setCopiedChar] = useState<string | null>(null);
  const [downloadingChar, setDownloadingChar] = useState<string | null>(null);
  const [openMenuChar, setOpenMenuChar] = useState<string | null>(null);
  const [animStateMap, setAnimStateMap] = useState<
    Record<string, { animKey: number; mode: 'off' | 'once' | 'infinite' }>
  >({});

  // Multi-select & Add-to-deck modal state
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [deckModalEntries, setDeckModalEntries] = useState<KanjiDetail[]>([]);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState<boolean>(false);
  const [suggestedDeckName, setSuggestedDeckName] = useState<string>('Từ vựng Kanji tra cứu');
  const [isHandwritingOpen, setIsHandwritingOpen] = useState<boolean>(false);

  // Action feedback banner / toast
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const menuWrapperRef = useRef<HTMLDivElement | null>(null);

  // Sync local input when URL ?q= changes (from Header search bar or browser back/forward)
  useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    setQueryInput(urlQ);
    setVisibleLimit(BATCH_SIZE);
  }, [searchParams]);

  // Load 3,000+ Kanji unified index and static 0ms sentences once
  useEffect(() => {
    let mounted = true;
    setIsLoadingIndex(true);
    Promise.all([
      loadUnifiedKanjiSearchIndex(),
      loadKanjiSentencesStatic().catch(() => ({})),
    ])
      .then(([docs, sentences]) => {
        if (!mounted) return;
        setSearchDocs(docs);
        setStaticSentences(sentences);
        setIndexError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setIndexError(err?.message || 'Không thể tải kho dữ liệu tìm kiếm Kanji.');
      })
      .finally(() => {
        if (mounted) setIsLoadingIndex(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Close 3-dots dropdown on outside click or Escape
  useEffect(() => {
    if (!openMenuChar) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuWrapperRef.current && !menuWrapperRef.current.contains(e.target as Node)) {
        setOpenMenuChar(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuChar(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuChar]);

  const showTempNotice = useCallback((msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  const commitQueryToUrl = useCallback(
    (nextQuery: string) => {
      const cleaned = nextQuery;
      setQueryInput(cleaned);
      setVisibleLimit(BATCH_SIZE);
      if (cleaned.trim()) {
        setSearchParams({ q: cleaned.trim() }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setSearchParams]
  );

  // Instant 0ms search execution
  const results = useMemo<KanjiSearchResult[]>(() => {
    if (!queryInput.trim() || searchDocs.length === 0) return [];
    return searchKanjiReverse(searchDocs, queryInput, {
      level: levelFilter,
      strokeRange: strokeFilter,
      limit: 300,
    });
  }, [searchDocs, queryInput, levelFilter, strokeFilter]);

  const visibleResults = useMemo(
    () => results.slice(0, visibleLimit),
    [results, visibleLimit]
  );

  const handleOpenPractice = useCallback(
    (doc: KanjiSearchDocument) => {
      const contextList = visibleResults.slice(0, 60).map((r) => r.doc.kanji);
      const prefilledMap: Record<string, KanjiDetail> = {};
      visibleResults.slice(0, 60).forEach((r) => {
        prefilledMap[r.doc.kanji] = searchDocToKanjiDetail(r.doc);
      });
      if (!contextList.includes(doc.kanji)) {
        contextList.unshift(doc.kanji);
        prefilledMap[doc.kanji] = searchDocToKanjiDetail(doc);
      }
      openKanjiPracticeModal(doc.kanji, contextList, prefilledMap);
    },
    [visibleResults, openKanjiPracticeModal]
  );

  const handleCopyKanjiChar = useCallback(
    async (char: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(char);
        } else {
          const el = document.createElement('textarea');
          el.value = char;
          el.style.position = 'fixed';
          el.style.opacity = '0';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        }
        setCopiedChar(char);
        showTempNotice(`Đã sao chép chữ「${char}」vào clipboard.`);
        setTimeout(() => {
          setCopiedChar((curr) => (curr === char ? null : curr));
        }, 1800);
      } catch {
        showTempNotice('Trình duyệt không cho phép sao chép tự động.');
      }
    },
    [showTempNotice]
  );

  const handleDownloadRowPng = useCallback(
    async (doc: KanjiSearchDocument, idx: number) => {
      setDownloadingChar(doc.kanji);
      try {
        const item = searchDocToKanjiItem(doc, idx);
        await handleDownloadPng(item);
        showTempNotice(`Đã tải ảnh nét vẽ PNG cho chữ「${doc.kanji}」.`);
      } catch {
        showTempNotice(`Không thể tải ảnh PNG cho chữ「${doc.kanji}」.`);
      } finally {
        setDownloadingChar((curr) => (curr === doc.kanji ? null : curr));
      }
    },
    [handleDownloadPng, showTempNotice]
  );

  const handleSendToPracticePage = useCallback(
    (chars: string[]) => {
      const uniqueNew = chars.filter((c) => !inputText.includes(c));
      if (uniqueNew.length > 0) {
        setInputText((prev) =>
          prev ? `${prev.trim()} ${uniqueNew.join('')}` : uniqueNew.join('')
        );
      }
      setOpenMenuChar(null);
      navigate('/kanji');
    },
    [inputText, setInputText, navigate]
  );

  const handleOpenAddDeckSingle = useCallback(
    (doc: KanjiSearchDocument) => {
      setOpenMenuChar(null);
      setDeckModalEntries([searchDocToKanjiDetail(doc)]);
      const qTitle = queryInput.trim();
      setSuggestedDeckName(
        qTitle ? `Tra cứu: ${qTitle}` : `Kanji ${doc.kanji} (${doc.hanViet})`
      );
      setIsDeckModalOpen(true);
    },
    [queryInput]
  );

  const handleOpenAddDeckSelected = useCallback(() => {
    const selectedSet = new Set(selectedChars);
    const details = results
      .filter((r) => selectedSet.has(r.doc.kanji))
      .map((r) => searchDocToKanjiDetail(r.doc));
    if (details.length === 0) return;
    setDeckModalEntries(details);
    setSuggestedDeckName(
      queryInput.trim() ? `Tra cứu: ${queryInput.trim()}` : 'Bộ thẻ Kanji đã chọn'
    );
    setIsDeckModalOpen(true);
  }, [selectedChars, results, queryInput]);

  const toggleSelectChar = useCallback((char: string) => {
    setSelectedChars((prev) =>
      prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char]
    );
  }, []);

  const handleTriggerSvgAnim = useCallback(
    (char: string, mode: 'off' | 'once' | 'infinite') => {
      setAnimStateMap((prev) => ({
        ...prev,
        [char]: {
          animKey: (prev[char]?.animKey ?? 0) + 1,
          mode,
        },
      }));
    },
    []
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10 animate-in fade-in duration-200">
      {/* Top Search Header Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Tra cứu Kanji theo Nghĩa &amp; Hán-Việt
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tìm ngược từ nghĩa tiếng Việt, nhiều cụm từ cách nhau bằng dấu phẩy hoặc âm Hán-Việt không dấu trên kho{' '}
              <span className="font-semibold text-slate-700 tabular-nums">
                {searchDocs.length > 0 ? searchDocs.length.toLocaleString('vi-VN') : '3.000+'}
              </span>{' '}
              chữ Hán.
            </p>
          </div>
          {feedbackNotice && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl shrink-0"
            >
              <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
          )}
        </div>

        {/* Main Search Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commitQueryToUrl(queryInput);
          }}
          className="flex items-center gap-0"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => commitQueryToUrl(e.target.value)}
              placeholder="Nhập nghĩa hoặc Hán-Việt (vd: nam, con trai, đàn ông, ánh sáng...)"
              aria-label="Tìm kiếm Kanji theo nghĩa hoặc âm Hán-Việt"
              autoFocus
              className="w-full h-10 pl-10 pr-9 text-[14px]! bg-slate-50 focus:bg-white text-slate-900 rounded-l-xl rounded-r-none border border-r-0 border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 focus:relative focus:z-10 font-medium transition-all"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => commitQueryToUrl('')}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg absolute right-1.5 top-1/2 -translate-y-1/2 z-10 cursor-pointer transition-colors"
                title="Xóa từ khóa"
                aria-label="Xóa từ khóa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsHandwritingOpen(true)}
            className="h-10 px-3 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-l-0 border-slate-200 transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap"
            title="Vẽ tay để tìm chữ Kanji"
            aria-label="Vẽ tay tìm Kanji"
          >
            <PenLine className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="hidden sm:inline">Vẽ tay</span>
          </button>
          <button
            type="submit"
            className="h-10 w-10 sm:w-11 bg-teal-700 hover:bg-teal-800 text-white rounded-r-xl rounded-l-none border border-teal-700 transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-xs"
            title="Tìm Kanji"
            aria-label="Tìm Kanji"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        <HandwritingSearchModal
          isOpen={isHandwritingOpen}
          onClose={() => setIsHandwritingOpen(false)}
          onSelectKanji={(kanji) => commitQueryToUrl(kanji)}
        />

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Level segmented buttons */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            {LEVEL_FILTERS.map((lv) => (
              <button
                key={lv.key}
                type="button"
                onClick={() => {
                  setLevelFilter(lv.key);
                  setVisibleLimit(BATCH_SIZE);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  levelFilter === lv.key
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lv.label}
              </button>
            ))}
          </div>

          {/* Secondary options */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={strokeFilter}
              onChange={(e) => {
                setStrokeFilter(e.target.value as NonNullable<SearchFilterOptions['strokeRange']>);
                setVisibleLimit(BATCH_SIZE);
              }}
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
              onClick={() => setIncludeGrid((v) => !v)}
              className={`h-9 px-2.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                includeGrid
                  ? 'bg-teal-50 border-teal-600 text-teal-900'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
              title="Hiện lưới chữ Điền khi xem và tải ảnh PNG"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Kèm lưới</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSelectMode((v) => !v);
                if (isSelectMode) setSelectedChars([]);
              }}
              className={`h-9 px-3 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                isSelectMode
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white hover:bg-teal-50 text-teal-800 border-teal-300'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectMode ? 'Đang chọn nhiều' : 'Chọn tạo bộ thẻ'}</span>
              {selectedChars.length > 0 && (
                <span className="tabular-nums font-bold">({selectedChars.length})</span>
              )}
            </button>
          </div>
        </div>

        {/* Batch selection action bar when active */}
        {isSelectMode && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-3 text-amber-900 font-medium">
              <span className="tabular-nums">
                Đã chọn <strong>{selectedChars.length}</strong> chữ Kanji
              </span>
              {visibleResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const visibleChars = visibleResults.map((r) => r.doc.kanji);
                    const allSelected = visibleChars.every((c) => selectedChars.includes(c));
                    setSelectedChars(allSelected ? [] : visibleChars);
                  }}
                  className="underline font-semibold hover:text-amber-950 cursor-pointer"
                >
                  {visibleResults.every((r) => selectedChars.includes(r.doc.kanji))
                    ? 'Bỏ chọn trang hiện tại'
                    : `Chọn nhanh ${visibleResults.length} chữ đang hiển thị`}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedChars.length === 0}
                onClick={() => handleSendToPracticePage(selectedChars)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 border border-slate-300 rounded-lg font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Chuyển sang Luyện viết</span>
              </button>
              <button
                type="button"
                disabled={selectedChars.length === 0}
                onClick={handleOpenAddDeckSelected}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-lg font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Thêm vào bộ thẻ</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Main Content Area: Loading / Prompt / Empty / Results */}
      {isLoadingIndex ? (
        <KanjiSearchResultsSkeleton />
      ) : indexError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-rose-700">{indexError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl cursor-pointer"
          >
            Tải lại trang
          </button>
        </div>
      ) : !queryInput.trim() ? (
        /* Zero-State Suggestions */
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
          <div className="max-w-xl space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Bắt đầu tra cứu theo nghĩa hoặc âm Hán-Việt
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Bạn có thể gõ tiếng Việt có dấu hoặc không dấu, tra 1 âm Hán-Việt (như{' '}
              <span className="font-semibold text-slate-700">nam</span> để tìm cả{' '}
              <span className="font-kanji font-bold text-slate-800">男</span> lẫn{' '}
              <span className="font-kanji font-bold text-slate-800">南</span>), hoặc liệt kê nhiều
              từ đồng nghĩa cách nhau bằng dấu phẩy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SUGGESTED_QUERIES.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => commitQueryToUrl(item.label)}
                className="text-left p-3.5 rounded-xl bg-slate-50/80 hover:bg-teal-50/70 border border-slate-200/80 hover:border-teal-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800 group-hover:text-teal-800">
                    “{item.label}”
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 shrink-0" />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{item.hint}</div>
              </button>
            ))}
          </div>
        </section>
      ) : results.length === 0 ? (
        /* No Result State */
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-10 sm:p-14 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-kanji text-2xl text-slate-500">
            無
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            Không tìm thấy chữ Kanji phù hợp cho “{queryInput.trim()}”
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Hãy thử rút gọn từ khóa, bỏ bớt bộ lọc cấp độ / số nét, hoặc tách các từ đồng nghĩa bằng dấu phẩy.
          </p>
          {(levelFilter !== 'all' || strokeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setLevelFilter('all');
                setStrokeFilter('all');
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Đặt lại bộ lọc về Tất cả
            </button>
          )}
        </section>
      ) : (
        /* Results List */
        <section className="space-y-3">
          {/* Result Summary Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
            <div className="tabular-nums">
              Tìm thấy <strong className="text-teal-800 font-bold">{results.length}</strong> chữ Kanji phù hợp
              <span aria-hidden="true"> · </span>
              <span>Đang hiển thị {visibleResults.length}</span>
              <span className="hidden sm:inline text-slate-400">
                {' '}
                · Nhấp vào chữ hoặc hình SVG để luyện viết nét
              </span>
            </div>
            {selectedCompareKanji.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/compare')}
                className="text-teal-800 hover:text-teal-950 font-semibold underline cursor-pointer inline-flex items-center gap-1"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Xem so sánh ({selectedCompareKanji.length} chữ)</span>
              </button>
            )}
          </div>

          {/* 1 Card Per Row Full-Width List */}
          <div className="space-y-2.5" ref={menuWrapperRef}>
            {visibleResults.map((result, idx) => {
              const { doc, matchedTerms } = result;
              const isSelected = selectedChars.includes(doc.kanji);
              const isCopied = copiedChar === doc.kanji;
              const isDownloading = downloadingChar === doc.kanji;
              const isMenuOpen = openMenuChar === doc.kanji;
              const isInCompare = selectedCompareKanji.includes(doc.kanji);

              const animState = animStateMap[doc.kanji] || { animKey: 0, mode: 'off' };
              const staticEx = staticSentences[doc.kanji]?.[0];
              const dictEx = doc.examples?.[0];
              const hex = (doc.kanji.codePointAt(0) ?? doc.kanji.charCodeAt(0))
                .toString(16)
                .toLowerCase()
                .padStart(5, '0');
              const svgUrl = `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/${hex}.svg`;

              return (
                <article
                  key={doc.kanji}
                  className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 relative ${
                    isSelected
                      ? 'border-teal-600 ring-2 ring-teal-600/15'
                      : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Left: Checkbox (when selecting), Index/Level/Strokes, Big Kanji + Han-Viet, and SVG */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {isSelectMode && (
                      <button
                        type="button"
                        onClick={() => toggleSelectChar(doc.kanji)}
                        className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer shrink-0"
                        aria-label={`Chọn chữ ${doc.kanji}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-teal-700" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}

                    {/* Index, Level & Stroke count */}
                    <div className="w-12 sm:w-14 shrink-0 text-left tabular-nums space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-400">#{idx + 1}</div>
                      <div className="text-xs font-bold text-teal-800">
                        {doc.level === 'EXT' ? 'Mở rộng' : doc.level}
                      </div>
                      {doc.strokeCount > 0 && (
                        <div className="text-[11px] text-slate-500">{doc.strokeCount} nét</div>
                      )}
                    </div>

                    {/* Large Kanji + Hán-Việt directly underneath */}
                    <button
                      type="button"
                      onClick={() => handleOpenPractice(doc)}
                      className="w-20 sm:w-24 shrink-0 text-center group cursor-pointer rounded-xl py-1 hover:bg-slate-50 transition-colors"
                      title={`Nhấp để xem nét vẽ & luyện viết chữ ${doc.kanji}`}
                    >
                      <div className="font-kanji font-bold text-4xl sm:text-5xl text-slate-900 group-hover:text-teal-800 leading-none transition-colors">
                        {doc.kanji}
                      </div>
                      <div className="mt-1.5 text-xs font-extrabold tracking-wide text-teal-800 truncate px-1">
                        {doc.hanViet ? (
                          <HighlightedVietnameseText
                            text={doc.hanViet}
                            matchedTerms={matchedTerms}
                          />
                        ) : (
                          '—'
                        )}
                      </div>
                    </button>

                    {/* SVG Stroke Preview Box */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl border border-slate-200/90 bg-slate-50/70 flex items-center justify-center group">
                      <button
                        type="button"
                        onClick={() => handleOpenPractice(doc)}
                        className="w-full h-full p-2 flex items-center justify-center cursor-pointer relative"
                        title={`Xem chi tiết thứ tự nét vẽ chữ ${doc.kanji}`}
                        aria-label={`Xem nét vẽ chữ ${doc.kanji}`}
                      >
                        {includeGrid && <KanjiGridOverlay />}
                        <KanjiSvgView
                          svgUrl={svgUrl}
                          kanji={doc.kanji}
                          loopMode={animState.mode}
                          animKey={animState.animKey}
                          className="w-full h-full object-contain relative z-10"
                        />
                      </button>

                      {/* Small inline stroke replay button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerSvgAnim(
                            doc.kanji,
                            animState.mode === 'once' ? 'infinite' : 'once'
                          );
                        }}
                        className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-xs text-slate-500 hover:text-teal-700 hover:border-teal-300 flex items-center justify-center cursor-pointer z-20"
                        title={
                          animState.mode === 'infinite'
                            ? 'Đang lặp vô hạn · Bấm để phát 1 lần'
                            : 'Phát nét vẽ SVG'
                        }
                        aria-label={`Phát nét vẽ ${doc.kanji}`}
                      >
                        {animState.mode === 'infinite' ? (
                          <Repeat1 className="w-3.5 h-3.5 text-teal-700" />
                        ) : animState.mode === 'once' ? (
                          <RotateCcw className="w-3 h-3 text-teal-700" />
                        ) : (
                          <PlayCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Middle: Meanings (highlighted), Readings (unboxed), and Example snippet */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPractice(doc)}
                        className="text-left text-sm sm:text-base font-bold text-slate-900 hover:text-teal-800 transition-colors cursor-pointer leading-snug"
                      >
                        <HighlightedVietnameseText
                          text={doc.meanings.slice(0, 4).join(' · ') || doc.hanViet || doc.kanji}
                          matchedTerms={matchedTerms}
                        />
                      </button>
                    </div>

                    {/* Readings & Radical as clean unboxed metadata */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                      {doc.on.length > 0 && (
                        <span>
                          <span className="font-semibold text-slate-400">On:</span>{' '}
                          <span className="font-kanji text-slate-800">
                            {doc.on.slice(0, 4).join('、')}
                          </span>
                        </span>
                      )}
                      {doc.on.length > 0 && doc.kun.length > 0 && (
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                      )}
                      {doc.kun.length > 0 && (
                        <span>
                          <span className="font-semibold text-slate-400">Kun:</span>{' '}
                          <span className="font-kanji text-slate-800">
                            {doc.kun.slice(0, 4).join('、')}
                          </span>
                        </span>
                      )}
                      {doc.radical && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-500">Bộ {doc.radical}</span>
                        </>
                      )}
                    </div>

                    {/* Optional Compact Example Line (0ms static sentence or compound) */}
                    {(staticEx || dictEx) && (
                      <div className="pt-1 flex items-start gap-1.5 text-xs text-slate-600">
                        <button
                          type="button"
                          onClick={() => speakJapanese(staticEx ? staticEx.jp : dictEx!.word)}
                          className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors cursor-pointer shrink-0 -mt-0.5"
                          title="Nghe phát âm tiếng Nhật"
                          aria-label="Nghe phát âm tiếng Nhật"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        {staticEx ? (
                          <div className="min-w-0 leading-relaxed">
                            <span className="font-kanji font-medium text-slate-800">
                              {staticEx.jp}
                            </span>
                            {staticEx.kana && (
                              <span className="font-kanji text-teal-800/80 ml-1.5">
                                ({staticEx.kana})
                              </span>
                            )}
                            <span className="text-slate-400 mx-1.5">—</span>
                            <span className="text-slate-600">{staticEx.vi}</span>
                          </div>
                        ) : dictEx ? (
                          <div className="min-w-0 leading-relaxed">
                            <span className="font-kanji font-semibold text-slate-800">
                              {dictEx.word}
                            </span>
                            <span className="font-kanji text-teal-800/80 ml-1.5">
                              [{dictEx.reading}]
                            </span>
                            <span className="text-slate-400 mx-1.5">—</span>
                            <span className="text-slate-600">{dictEx.meaning}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Right: 2 Icon-Only Action Buttons + 3-Vertical-Dots Menu */}
                  <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* 1. Icon-only Copy Character to Clipboard */}
                    <button
                      type="button"
                      onClick={() => handleCopyKanjiChar(doc.kanji)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-600 hover:text-slate-900'
                      }`}
                      title={`Sao chép chữ「${doc.kanji}」vào clipboard`}
                      aria-label={`Sao chép chữ ${doc.kanji}`}
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* 2. Icon-only Download PNG Stroke Image */}
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownloadRowPng(doc, idx)}
                      className="w-9 h-9 rounded-xl border bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-600 hover:text-slate-900 disabled:opacity-50 flex items-center justify-center transition-colors cursor-pointer"
                      title={`Tải ảnh nét vẽ PNG chữ「${doc.kanji}」`}
                      aria-label={`Tải ảnh PNG chữ ${doc.kanji}`}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    {/* 3. Vertical 3-Dots Dropdown Menu for Add to Deck & Extensible Options */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuChar((curr) => (curr === doc.kanji ? null : doc.kanji))
                        }
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                          isMenuOpen
                            ? 'bg-teal-700 border-teal-800 text-white'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-600 hover:text-slate-900'
                        }`}
                        title="Tùy chọn thêm (Thêm bộ thẻ, Luyện viết...)"
                        aria-label={`Mở menu tùy chọn cho ${doc.kanji}`}
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleOpenAddDeckSingle(doc)}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                          >
                            <FolderPlus className="w-4 h-4 text-teal-700 shrink-0" />
                            <span>Thêm vào bộ thẻ</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuChar(null);
                              handleOpenPractice(doc);
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 cursor-pointer"
                          >
                            <PenTool className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>Xem nét &amp; Luyện viết</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleSendToPracticePage([doc.kanji])}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Send className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>Chuyển sang Luyện viết nét</span>
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              toggleCompareKanji(doc.kanji);
                              setOpenMenuChar(null);
                              showTempNotice(
                                isInCompare
                                  ? `Đã bỏ「${doc.kanji}」khỏi danh sách so sánh.`
                                  : `Đã thêm「${doc.kanji}」vào So sánh Kanji.`
                              );
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Columns3 className="w-4 h-4 text-slate-500 shrink-0" />
                              <span>
                                {isInCompare ? 'Bỏ khỏi So sánh' : 'Thêm vào So sánh'}
                              </span>
                            </span>
                            {isInCompare && <Check className="w-3.5 h-3.5 text-teal-700" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Load More Pagination */}
          {visibleResults.length < results.length && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + BATCH_SIZE)}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs sm:text-[13px] font-bold rounded-xl shadow-2xs transition-colors cursor-pointer tabular-nums"
              >
                Xem thêm {Math.min(BATCH_SIZE, results.length - visibleResults.length)} kết quả (còn{' '}
                {results.length - visibleResults.length})
              </button>
            </div>
          )}
        </section>
      )}

      {/* Add to Deck Modal (Shared with KanjiByLevelPage) */}
      <AddKanjiToDeckModal
        isOpen={isDeckModalOpen}
        entries={deckModalEntries}
        suggestedDeckName={suggestedDeckName}
        onClose={() => setIsDeckModalOpen(false)}
        onSuccess={({ addedCount, folderName }) => {
          showTempNotice(`Đã thêm ${addedCount} chữ vào bộ thẻ "${folderName}".`);
          setIsSelectMode(false);
          setSelectedChars([]);
        }}
      />
    </div>
  );
};
