/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  Grid,
  Camera,
  ArrowUp,
  Plus,
  X,
  Languages
} from 'lucide-react';
import { KanjiItem, CopyStatus, ToastInfo, KanjiDetail } from './types/kanji';
import { extractUniqueKanji, convertSvgToPngBlob, downloadBlob, isKanjiChar, getPrimaryHiragana, fetchKanjiSvg } from './utils/kanji';
import { getFullKanjiDetail } from './utils/kanjiApi';
import { getKanjiInfo } from './data/kanjiDictionary';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { RecentlyViewedKanji } from './components/RecentlyViewedKanji';
import { KanjiTable } from './components/KanjiTable';
import { KanjiGrid } from './components/KanjiGrid';
import { PracticeModal } from './components/PracticeModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { LicenseModal } from './components/LicenseModal';
import { KanjiScannerModal } from './components/KanjiScannerModal';
import { KanjiPrintSheet } from './components/KanjiPrintSheet';
import { UserGuideModal } from './components/UserGuideModal';
import { RadicalExplorer } from './components/RadicalExplorer';
import { SettingsModal } from './components/SettingsModal';
import { ExtensionExporter } from './components/ExtensionExporter';
import { ExtensionPlayground } from './components/ExtensionPlayground';

export default function App() {
  // Input text state
  const [inputText, setInputText] = useState<string>(
    '日本語能力試験（JLPT）で思い出す漢字の練習：日本人は漢字を毎日勉強する。一期一会、温故知新。'
  );

  // Search filter query
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Quick add input for sticky toolbar
  const [quickInput, setQuickInput] = useState<string>('');

  // View mode: 'table' | 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Include practice grid (+ Grid)
  const [includeGrid, setIncludeGrid] = useState<boolean>(false);

  // Status mapping for copy buttons
  const [copyStatus, setCopyStatus] = useState<Record<string, CopyStatus>>({});

  // Toast notification
  const [toast, setToast] = useState<ToastInfo | null>(null);

  // Modal inspection
  const [inspectedKanji, setInspectedKanji] = useState<KanjiItem | null>(null);

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // License Modal state
  const [isLicenseOpen, setIsLicenseOpen] = useState<boolean>(false);

  // User Guide / Tutorial Modal state
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // 214 Kangxi Radicals Explorer Modal state
  const [isRadicalsOpen, setIsRadicalsOpen] = useState<boolean>(false);

  // Global Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Setting: Show Hiragana above Kanji in lookup list (Default OFF as requested)
  const [showListFurigana, setShowListFurigana] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kanji_setting_list_furigana');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  // Storage listener to update settings immediately when changed in SettingsModal
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('kanji_setting_list_furigana');
        setShowListFurigana(saved !== null ? saved === 'true' : false);
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Read URL parameters and static path routes (e.g. https://luyenkanji.vercel.app/?text=... or /text/... or #text=...)
  useEffect(() => {
    const handleUrlUpdate = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let extracted = urlParams.get('text') || urlParams.get('kanji') || urlParams.get('q') || urlParams.get('query');

        if (!extracted && window.location.hash) {
          const hashStr = window.location.hash.replace(/^#\/?/, '');
          if (hashStr.includes('=')) {
            const hashParams = new URLSearchParams(hashStr);
            extracted = hashParams.get('text') || hashParams.get('kanji') || hashParams.get('q') || hashParams.get('query');
          } else {
            try {
              extracted = decodeURIComponent(hashStr);
            } catch {
              extracted = hashStr;
            }
          }
        }

        if (!extracted && window.location.pathname) {
          const match = window.location.pathname.match(/^\/(?:text|kanji|q|search)\/(.+)/i);
          if (match && match[1]) {
            try {
              extracted = decodeURIComponent(match[1]);
            } catch {
              extracted = match[1];
            }
          }
        }

        if (extracted && extracted.trim()) {
          setInputText(extracted.trim());
        }
      } catch (e) {
        console.warn('Lỗi đọc tham số URL:', e);
      }
    };

    handleUrlUpdate();

    window.addEventListener('popstate', handleUrlUpdate);
    window.addEventListener('hashchange', handleUrlUpdate);
    return () => {
      window.removeEventListener('popstate', handleUrlUpdate);
      window.removeEventListener('hashchange', handleUrlUpdate);
    };
  }, []);

  // Auto-show guide modal for first-time visitors
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('kanji_guide_dismissed_v1');
      if (!dismissed && !window.location.search.includes('text=')) {
        const timer = setTimeout(() => {
          setIsGuideOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Lỗi đọc trạng thái hướng dẫn:', e);
    }
  }, []);

  // Dynamic enrichment cache for On, Kun, JLPT and meanings
  const [enrichedDetails, setEnrichedDetails] = useState<Record<string, KanjiDetail>>({});

  // Recently viewed Kanji (Max 25 items, persistent in localStorage)
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kanji_recently_viewed_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => typeof c === 'string' && c.length === 1).slice(0, 25);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc lịch sử tra cứu từ localStorage:', e);
    }
    return [];
  });

  // Toast helper
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 2400);
  }, []);

  // Extract unique Kanji preserving initial order
  const extractedKanjiList = useMemo<KanjiItem[]>(() => {
    return extractUniqueKanji(inputText);
  }, [inputText]);

  // Background enrichment: automatically fetch full details (On, Kun, Meanings, JLPT, strokeCount)
  // for all extracted Kanji so they are never missing in cards or tables
  useEffect(() => {
    let isCancelled = false;
    const missing = extractedKanjiList.filter(
      (item) => !enrichedDetails[item.kanji]
    );

    if (missing.length === 0) return;

    // Fetch details in small concurrent pool
    missing.forEach(async (item) => {
      try {
        const detail = await getFullKanjiDetail(item.kanji);
        if (!isCancelled && detail) {
          setEnrichedDetails((prev) => ({
            ...prev,
            [item.kanji]: detail,
          }));
        }
      } catch (e) {
        // Fallback silently
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [extractedKanjiList, enrichedDetails]);

  // Merged kanji list with enriched details
  const mergedKanjiList = useMemo<KanjiItem[]>(() => {
    return extractedKanjiList.map((item) => {
      const enriched = enrichedDetails[item.kanji];
      return {
        ...item,
        detail: enriched || item.detail,
      };
    });
  }, [extractedKanjiList, enrichedDetails]);

  // Filter list by search query (Kanji, Hán-Việt, JLPT, On/Kun, nghĩa)
  const filteredKanjiList = useMemo(() => {
    if (!searchFilter.trim()) return mergedKanjiList;
    const q = searchFilter.trim().toLowerCase();
    return mergedKanjiList.filter(
      (item) =>
        item.kanji.includes(q) ||
        item.hex.includes(q) ||
        item.id.toString() === q ||
        item.detail?.hanViet.toLowerCase().includes(q) ||
        item.detail?.jlpt?.toLowerCase() === q ||
        item.detail?.meanings.some((m) => m.toLowerCase().includes(q)) ||
        item.detail?.on?.some((o) => o.toLowerCase().includes(q)) ||
        item.detail?.kun?.some((k) => k.toLowerCase().includes(q))
    );
  }, [mergedKanjiList, searchFilter]);

  // Kanji found inside current searchFilter or quickInput for live Ruby Furigana preview
  const activeSearchKanji = useMemo(() => {
    const text = `${searchFilter} ${quickInput}`;
    const chars = Array.from(text).filter((c) => isKanjiChar(c));
    const uniqueChars = Array.from(new Set(chars));
    return uniqueChars.map((char) => {
      const match = mergedKanjiList.find((k) => k.kanji === char);
      const detail = match?.detail || getKanjiInfo(char);
      return {
        kanji: char,
        hiragana: getPrimaryHiragana(detail),
        hanViet: detail?.hanViet || '',
        meaning: detail?.meanings?.[0] || '',
      };
    });
  }, [searchFilter, quickInput, mergedKanjiList]);

  // Copy image to clipboard as PNG with white background
  const handleCopyImage = async (item: KanjiItem) => {
    setCopyStatus((prev) => ({ ...prev, [item.hex]: 'copying' }));

    try {
      const pngBlob = await convertSvgToPngBlob(item.svgUrl, includeGrid);

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });
        await navigator.clipboard.write([clipboardItem]);

        setCopyStatus((prev) => ({ ...prev, [item.hex]: 'copied' }));
        showToast(`Đã sao chép ảnh nét vẽ chữ "${item.kanji}" vào Clipboard!`, 'success');

        setTimeout(() => {
          setCopyStatus((prev) => ({ ...prev, [item.hex]: 'idle' }));
        }, 1500);
      } else {
        // Fallback for browsers that restrict clipboard
        downloadBlob(pngBlob, `kanji_${item.kanji}_${item.hex}.png`);
        showToast(
          `Đã tự động tải ảnh PNG chữ "${item.kanji}" về máy (trình duyệt chưa hỗ trợ clipboard trực tiếp)!`,
          'info'
        );
        setCopyStatus((prev) => ({ ...prev, [item.hex]: 'idle' }));
      }
    } catch (error: any) {
      console.error('Lỗi khi sao chép ảnh:', error);
      setCopyStatus((prev) => ({ ...prev, [item.hex]: 'error' }));

      // Fallback download
      try {
        const pngBlob = await convertSvgToPngBlob(item.svgUrl, includeGrid);
        downloadBlob(pngBlob, `kanji_${item.kanji}_${item.hex}.png`);
        showToast(`Đã tự động tải ảnh "${item.kanji}" về máy tính thay vì chép clipboard`, 'info');
      } catch (e) {
        showToast(`Không thể tải ảnh nét vẽ: ${error?.message || 'Lỗi mạng'}`, 'error');
      }

      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [item.hex]: 'idle' }));
      }, 2000);
    }
  };

  // Download PNG file directly
  const handleDownloadPng = async (item: KanjiItem) => {
    try {
      showToast(`Đang kết xuất ảnh PNG chất lượng cao cho chữ "${item.kanji}"...`, 'info');
      const pngBlob = await convertSvgToPngBlob(item.svgUrl, includeGrid);
      downloadBlob(pngBlob, `kanji_${item.kanji}_${item.hex}.png`);
      showToast(`Tải ảnh "${item.kanji}" thành công!`, 'success');
    } catch (err: any) {
      showToast(`Không thể tải ảnh: ${err?.message || 'Lỗi kết nối'}`, 'error');
    }
  };

  // Copy all extracted Kanji text
  const handleCopyAllText = async () => {
    if (extractedKanjiList.length === 0) return;
    const text = extractedKanjiList.map((k) => k.kanji).join(' ');
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Đã copy ${extractedKanjiList.length} chữ Kanji vào Clipboard!`, 'success');
    } catch {
      showToast('Không thể copy văn bản', 'error');
    }
  };

  // Export CSV for Anki import with Han-Viet & meanings
  const handleExportCsv = () => {
    if (extractedKanjiList.length === 0) return;
    const header = 'STT,Kanji,Han_Viet,On,Kun,Nghia,JLPT,Unicode_Hex,SVG_Url\n';
    const rows = mergedKanjiList
      .map(
        (k) =>
          `${k.id},"${k.kanji}","${k.detail?.hanViet || ''}","${(k.detail?.on || []).join(' ')}","${(k.detail?.kun || []).join(' ')}","${(k.detail?.meanings || []).join('; ')}","${k.detail?.jlpt || ''}","${k.hex}","${k.svgUrl}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'kanji_stroke_order_list.csv');
    showToast('Đã xuất file CSV (kèm Hán-Việt & On/Kun) cho Anki thành công!', 'success');
  };

  // Save single Kanji to recently viewed history (Max 25, no duplicates, newest first)
  const saveToRecentHistory = useCallback((kanjiChar: string) => {
    if (!kanjiChar || kanjiChar.trim().length === 0) return;
    setRecentlyViewed((prev) => {
      const updated = [kanjiChar, ...prev.filter((c) => c !== kanjiChar)].slice(0, 25);
      try {
        localStorage.setItem('kanji_recently_viewed_history', JSON.stringify(updated));
      } catch (e) {
        console.warn('Lỗi lưu lịch sử tra cứu:', e);
      }
      return updated;
    });
  }, []);

  // Inspect Kanji and record to history
  const handleInspectKanji = useCallback(
    (item: KanjiItem) => {
      // Preload SVG immediately to ensure list view updates instantly
      fetchKanjiSvg(item.svgUrl, item.hex).catch(() => {});

      // Use enriched item if available
      const enriched = enrichedDetails[item.kanji];
      const targetItem = enriched ? { ...item, detail: enriched } : item;
      setInspectedKanji(targetItem);
      saveToRecentHistory(item.kanji);
    },
    [saveToRecentHistory, enrichedDetails]
  );

  // Select Kanji from recently viewed history chips
  const handleSelectRecentKanji = useCallback(
    (char: string) => {
      const found = mergedKanjiList.find((k) => k.kanji === char);
      if (found) {
        handleInspectKanji(found);
      } else {
        const created = extractUniqueKanji(char);
        if (created.length > 0) {
          handleInspectKanji(created[0]);
        }
      }
    },
    [mergedKanjiList, handleInspectKanji]
  );

  // Clear all recent history
  const handleClearRecentHistory = useCallback(() => {
    setRecentlyViewed([]);
    try {
      localStorage.removeItem('kanji_recently_viewed_history');
    } catch (e) {}
    showToast('Đã xóa toàn bộ lịch sử tra cứu Kanji', 'info');
  }, [showToast]);

  // Clear text
  const handleClear = () => {
    setInputText('');
    setSearchFilter('');
    setQuickInput('');
    showToast('Đã xóa trắng văn bản', 'info');
  };

  // Quick add to list from sticky toolbar
  const handleQuickAdd = () => {
    if (!quickInput.trim()) return;
    setInputText((prev) => (prev ? `${prev} ${quickInput.trim()}` : quickInput.trim()));
    showToast(`Đã thêm chữ vào danh sách tra cứu!`, 'success');
    setQuickInput('');
  };

  // Scroll to top handler
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 antialiased selection:bg-teal-700 selection:text-white pb-20">
      {/* Toast */}
      <Toast toast={toast} />

      {/* Header */}
      <Header
        onPrint={() => window.print()}
        kanjiCount={extractedKanjiList.length}
        historyCount={recentlyViewed.length}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenRadicals={() => setIsRadicalsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => {
          const el = document.getElementById('recently-viewed-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-teal-400');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-teal-400');
            }, 1800);
          }
        }}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 sm:space-y-7">
        {/* Input Section */}
        <InputSection
          inputText={inputText}
          setInputText={setInputText}
          kanjiList={mergedKanjiList}
          onClear={handleClear}
          onCopyAllText={handleCopyAllText}
          onExportCsv={handleExportCsv}
          onOpenScanner={() => setIsScannerOpen(true)}
          onSelectKanji={handleSelectRecentKanji}
        />

        {/* Recently Viewed Kanji History */}
        <RecentlyViewedKanji
          recentList={recentlyViewed}
          onSelectKanji={handleSelectRecentKanji}
          onClearHistory={handleClearRecentHistory}
        />

        {/* Kanji Stroke Order Section */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 lg:p-7 space-y-5">
          {/* STICKY TOOLBAR (Ghim ở đầu màn hình khi cuộn xem danh sách Kanji, không cần kéo lên xuống) */}
          <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md p-3 sm:p-4 space-y-2.5 transition-all">
            {/* Top row: Status info + Quick Scan + Scroll to top */}
            <div className="flex items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-bold text-slate-800 truncate">
                  <span className="sm:hidden">2. Tra cứu ({filteredKanjiList.length})</span>
                  <span className="hidden sm:inline">2. Tra cứu nét vẽ ({filteredKanjiList.length}/{extractedKanjiList.length})</span>
                </span>
                {extractedKanjiList.length > 0 && (
                  <span className="text-[10px] bg-teal-50 text-teal-800 font-semibold px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
                    {extractedKanjiList.length} chữ
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Button Scan Image */}
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[30px] sm:min-h-[32px]"
                  title="Quét chữ Kanji từ ảnh hoặc dán ảnh chụp màn hình (Ctrl+V)"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-700" />
                  <span className="hidden sm:inline">Quét ảnh (OCR)</span>
                  <span className="sm:hidden">Quét ảnh</span>
                </button>

                {/* Button Scroll to top */}
                <button
                  type="button"
                  onClick={handleScrollToTop}
                  className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
                  title="Cuộn lên đầu trang"
                >
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Live Ruby Furigana preview for Kanji typed in search or quick add */}
            {activeSearchKanji.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 px-2.5 bg-teal-50/70 border border-teal-200/80 rounded-xl text-xs transition-all">
                <span className="text-[10px] sm:text-[11px] font-semibold text-teal-900 shrink-0 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-teal-700" />
                  Phiên âm:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {activeSearchKanji.map((item) => (
                    <div
                      key={item.kanji}
                      onClick={() => handleSelectRecentKanji(item.kanji)}
                      className="inline-flex flex-col items-center gap-0.5 bg-white px-2 py-0.5 rounded-xl border border-teal-200 shadow-2xs cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors"
                      title="Nhấp để xem hoạt ảnh nét vẽ"
                    >
                      <ruby className="font-kanji font-bold text-sm sm:text-base text-slate-900 leading-none inline-flex flex-col items-center">
                        {item.hiragana && (
                          <rt className="text-[9px] font-semibold text-teal-700 font-sans pb-0.5 select-none">
                            {item.hiragana}
                          </rt>
                        )}
                        <span>{item.kanji}</span>
                      </ruby>
                      <span className="text-[8px] sm:text-[9px] font-bold text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-1 py-0.2 rounded leading-tight max-w-[85px] truncate">
                        {item.meaning ? `${item.hanViet ? `${item.hanViet}: ` : ''}${item.meaning}` : item.hanViet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom controls: Equal length Search Filter and Quick Add boxes, with unified buttons */}
            <div className="space-y-2.5">
              {/* Row 1: Search Filter & Quick Add with EQUAL LENGTH */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {/* Column 1: Lọc chữ Hán */}
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Lọc chữ Hán, Hán-Việt, On, Kun, nghĩa..."
                    className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-medium shadow-inner"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Column 2: Thêm Kanji nhanh (DÀI BẰNG PHẦN LỌC CHỮ) */}
                <div className="flex items-center gap-1.5 w-full">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={quickInput}
                      onChange={(e) => setQuickInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd();
                      }}
                      placeholder="+ Thêm chữ Kanji (ví dụ: 学, 桜, 愛)..."
                      className="w-full px-3.5 h-10 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-medium shadow-inner"
                    />
                    {quickInput && (
                      <button
                        type="button"
                        onClick={() => setQuickInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    disabled={!quickInput.trim()}
                    className="h-10 px-4 text-xs sm:text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 border border-teal-800 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs hover:shadow-xs active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                    title="Thêm ngay chữ này vào danh sách tra cứu"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Status & Controls row (Grid toggle, View switcher) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap sm:flex-nowrap">
                <div className="text-xs text-slate-500 font-medium">
                  {searchFilter ? (
                    <span>
                      Kết quả lọc: <strong className="text-teal-800 font-bold">{filteredKanjiList.length}</strong> / {extractedKanjiList.length} chữ
                    </span>
                  ) : (
                    <span>
                      Tổng cộng: <strong className="text-slate-800 font-bold">{extractedKanjiList.length}</strong> chữ Kanji
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {/* Grid toggle with delicate lines */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !includeGrid;
                      setIncludeGrid(nextVal);
                      showToast(
                        nextVal ? 'Đã BẬT lưới nét đứt thư pháp' : 'Đã TẮT lưới nét đứt',
                        'info'
                      );
                    }}
                    className={`h-9 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap shrink-0 ${
                      includeGrid
                        ? 'bg-teal-50 border-teal-600 text-teal-950 ring-1 ring-teal-500/20 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
                    }`}
                    title="Bật/Tắt đường lưới ô nét đứt mảnh"
                  >
                    <Grid className={`w-3.5 h-3.5 ${includeGrid ? 'text-teal-700' : 'text-slate-400'}`} />
                    <span>Kèm lưới</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tracking-tight ${
                        includeGrid ? 'bg-teal-700 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {includeGrid ? 'BẬT' : 'TẮT'}
                    </span>
                  </button>

                  {/* View Switcher: Table vs Cards */}
                  <div className="h-9 inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`h-full inline-flex items-center gap-1.5 px-3 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap font-semibold ${
                        viewMode === 'table'
                          ? 'bg-teal-800 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Bảng</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`h-full inline-flex items-center gap-1.5 px-3 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap font-semibold ${
                        viewMode === 'grid'
                          ? 'bg-teal-800 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Thẻ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Empty / Filtered Empty States */}
          {extractedKanjiList.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50/60 border border-teal-100 flex items-center justify-center text-teal-500">
                <span className="font-kanji text-4xl">空</span>
              </div>
              <h4 className="text-base font-bold text-slate-700">Chưa tìm thấy ký tự Kanji nào</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Hãy dán một đoạn văn bản tiếng Nhật hoặc bấm <strong>Quét ảnh (OCR)</strong> để trích xuất chữ Hán tự động.
              </p>
            </div>
          ) : filteredKanjiList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Không tìm thấy chữ Kanji nào khớp với từ khóa "{searchFilter}".
            </div>
          ) : viewMode === 'table' ? (
            <KanjiTable
              kanjiList={filteredKanjiList}
              copyStatus={copyStatus}
              showGrid={includeGrid}
              showFurigana={showListFurigana}
              onCopyImage={handleCopyImage}
              onDownloadPng={handleDownloadPng}
              onInspect={handleInspectKanji}
            />
          ) : (
            <KanjiGrid
              kanjiList={filteredKanjiList}
              copyStatus={copyStatus}
              showGrid={includeGrid}
              showFurigana={showListFurigana}
              onCopyImage={handleCopyImage}
              onDownloadPng={handleDownloadPng}
              onInspect={handleInspectKanji}
            />
          )}
        </section>

        {/* Chrome Extension Download Section & Live Playground */}
        <ExtensionExporter />
        <ExtensionPlayground />

        {/* Dedicated Printable Worksheet (Auto-shown on window.print(), styled for A4 paper) */}
        <KanjiPrintSheet kanjiList={mergedKanjiList} />
      </main>

      {/* Practice / Inspection Modal */}
      <PracticeModal
        item={inspectedKanji}
        showGrid={includeGrid}
        onToggleGrid={(val) => setIncludeGrid(val)}
        onClose={() => setInspectedKanji(null)}
        onCopyImage={handleCopyImage}
        onDownloadPng={handleDownloadPng}
        onSelectKanji={(char) => handleSelectRecentKanji(char)}
      />

      {/* 214 Radical Explorer Modal (overflow-y-auto allows smooth full-modal scrolling without clipping) */}
      {isRadicalsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
          <RadicalExplorer
            onSelectKanji={(char) => handleSelectRecentKanji(char)}
            onClose={() => setIsRadicalsOpen(false)}
          />
        </div>
      )}

      {/* OCR Scanner Modal */}
      <KanjiScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApplyToInput={(text) => {
          setInputText((prev) => (prev ? `${prev} ${text}` : text));
          showToast(`Đã thêm ${text.length} chữ Kanji từ ảnh vào ô nhập liệu!`, 'success');
        }}
        onApplyToSearch={(text) => {
          setSearchFilter(text);
          showToast(`Đã lọc danh sách theo Kanji phát hiện từ ảnh!`, 'info');
        }}
        onInspectKanji={(char) => {
          handleSelectRecentKanji(char);
        }}
      />

      {/* License Modal */}
      <LicenseModal isOpen={isLicenseOpen} onClose={() => setIsLicenseOpen(false)} />

      {/* User Guide / Tutorial Modal */}
      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        historyCount={recentlyViewed.length}
        onClearHistory={handleClearRecentHistory}
        showToast={showToast}
      />

      {/* Footer & License Attribution */}
      <Footer onOpenLicenseModal={() => setIsLicenseOpen(true)} />
    </div>
  );
}
