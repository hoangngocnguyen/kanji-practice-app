/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, LayoutGrid, Table as TableIcon, Grid } from 'lucide-react';
import { KanjiItem, CopyStatus, ToastInfo } from './types/kanji';
import { extractUniqueKanji, convertSvgToPngBlob, downloadBlob } from './utils/kanji';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { RecentlyViewedKanji } from './components/RecentlyViewedKanji';
import { KanjiTable } from './components/KanjiTable';
import { KanjiGrid } from './components/KanjiGrid';
import { PracticeModal } from './components/PracticeModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { LicenseModal } from './components/LicenseModal';

export default function App() {
  // Input text state
  const [inputText, setInputText] = useState<string>(
    '日本語能力試験（JLPT）で思い出す漢字の練習：日本人は漢字を毎日勉強する。一期一会、温故知新。'
  );

  // Search filter query
  const [searchFilter, setSearchFilter] = useState<string>('');

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

  // Recently viewed Kanji (Max 15 items, persistent in localStorage)
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kanji_recently_viewed_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c) => typeof c === 'string' && c.length === 1).slice(0, 15);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc lịch sử tra cứu từ localStorage:', e);
    }
    return [];
  });

  // License Modal state
  const [isLicenseOpen, setIsLicenseOpen] = useState<boolean>(false);

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

  // Filter list by search query (Kanji, Hán-Việt, JLPT, nghĩa)
  const filteredKanjiList = useMemo(() => {
    if (!searchFilter.trim()) return extractedKanjiList;
    const q = searchFilter.trim().toLowerCase();
    return extractedKanjiList.filter(
      (item) =>
        item.kanji.includes(q) ||
        item.hex.includes(q) ||
        item.id.toString() === q ||
        item.detail?.hanViet.toLowerCase().includes(q) ||
        item.detail?.jlpt?.toLowerCase() === q ||
        item.detail?.meanings.some((m) => m.toLowerCase().includes(q))
    );
  }, [extractedKanjiList, searchFilter]);

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
    const header = 'STT,Kanji,Han_Viet,Nghia,JLPT,Unicode_Hex,SVG_Url\n';
    const rows = extractedKanjiList
      .map(
        (k) =>
          `${k.id},"${k.kanji}","${k.detail?.hanViet || ''}","${(k.detail?.meanings || []).join('; ')}","${k.detail?.jlpt || ''}","${k.hex}","${k.svgUrl}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'kanji_stroke_order_list.csv');
    showToast('Đã xuất file CSV (kèm Hán-Việt & Nghĩa) cho Anki thành công!', 'success');
  };

  // Save single Kanji to recently viewed history (Max 15, no duplicates, newest first)
  const saveToRecentHistory = useCallback((kanjiChar: string) => {
    if (!kanjiChar || kanjiChar.trim().length === 0) return;
    setRecentlyViewed((prev) => {
      const updated = [kanjiChar, ...prev.filter((c) => c !== kanjiChar)].slice(0, 15);
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
      setInspectedKanji(item);
      saveToRecentHistory(item.kanji);
    },
    [saveToRecentHistory]
  );

  // Select Kanji from recently viewed history chips
  const handleSelectRecentKanji = useCallback(
    (char: string) => {
      // Find in current extracted list
      const found = extractedKanjiList.find((k) => k.kanji === char);
      if (found) {
        handleInspectKanji(found);
      } else {
        // Create single Kanji item from helper
        const created = extractUniqueKanji(char);
        if (created.length > 0) {
          handleInspectKanji(created[0]);
        }
      }
    },
    [extractedKanjiList, handleInspectKanji]
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
    showToast('Đã xóa trắng văn bản', 'info');
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-7">
        {/* Input Section */}
        <InputSection
          inputText={inputText}
          setInputText={setInputText}
          kanjiList={extractedKanjiList}
          onClear={handleClear}
          onCopyAllText={handleCopyAllText}
          onExportCsv={handleExportCsv}
        />

        {/* Recently Viewed Kanji History */}
        <RecentlyViewedKanji
          recentList={recentlyViewed}
          onSelectKanji={handleSelectRecentKanji}
          onClearHistory={handleClearRecentHistory}
        />

        {/* Kanji Stroke Order Section */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 lg:p-7 space-y-5 sm:space-y-6">
          {/* Section Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  2. Tra cứu nét vẽ & Nghĩa Kanji ({filteredKanjiList.length}/{extractedKanjiList.length})
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Ảnh nét vẽ lớn, hoạt ảnh vẽ nét động, âm Hán-Việt & nghĩa tiếng Việt, phát âm và sao chép 1-click
              </p>
            </div>

            {/* Filter & View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
              {/* Search input */}
              <div className="relative w-full sm:w-64 md:w-60 lg:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Lọc Kanji, Hán-Việt (vd: NHẬT), nghĩa..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:bg-white transition-all font-medium min-h-[38px]"
                />
              </div>

              <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-start">
                {/* Grid background toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !includeGrid;
                    setIncludeGrid(nextVal);
                    showToast(
                      nextVal
                        ? 'Đã BẬT lưới nét đứt chữ Mễ/Điền (hiển thị trên ảnh và khi sao chép/tải PNG)'
                        : 'Đã TẮT lưới nét đứt',
                      'info'
                    );
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none min-h-[38px] ${
                    includeGrid
                      ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  title="Bật/tắt đường lưới ô nét đứt chuẩn thư pháp trong toàn bộ ứng dụng và khi tải/sao chép ảnh"
                >
                  <Grid className={`w-4 h-4 ${includeGrid ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span>Kèm lưới</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      includeGrid ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {includeGrid ? 'BẬT' : 'TẮT'}
                  </span>
                </button>

                {/* View Switcher: Table vs Cards */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 min-h-[38px]">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Bảng</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
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

          {/* Empty / Filtered Empty States */}
          {extractedKanjiList.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50/60 border border-teal-100 flex items-center justify-center text-teal-500">
                <span className="font-kanji text-4xl">空</span>
              </div>
              <h4 className="text-base font-bold text-slate-700">Chưa tìm thấy ký tự Kanji nào</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Hãy dán một đoạn văn bản có chứa chữ Hán vào ô nhập liệu ở trên hoặc bấm vào các nút mẫu có sẵn để xem bảng nét vẽ.
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
              onCopyImage={handleCopyImage}
              onDownloadPng={handleDownloadPng}
              onInspect={handleInspectKanji}
            />
          ) : (
            <KanjiGrid
              kanjiList={filteredKanjiList}
              copyStatus={copyStatus}
              showGrid={includeGrid}
              onCopyImage={handleCopyImage}
              onDownloadPng={handleDownloadPng}
              onInspect={handleInspectKanji}
            />
          )}
        </section>
      </main>

      {/* Practice / Inspection Modal */}
      <PracticeModal
        item={inspectedKanji}
        showGrid={includeGrid}
        onToggleGrid={(val) => setIncludeGrid(val)}
        onClose={() => setInspectedKanji(null)}
        onCopyImage={handleCopyImage}
        onDownloadPng={handleDownloadPng}
      />

      {/* License Modal */}
      <LicenseModal isOpen={isLicenseOpen} onClose={() => setIsLicenseOpen(false)} />

      {/* Footer & License Attribution */}
      <Footer onOpenLicenseModal={() => setIsLicenseOpen(true)} />
    </div>
  );
}
