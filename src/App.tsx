/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, LayoutGrid, Table as TableIcon, Sparkles } from 'lucide-react';
import { KanjiItem, CopyStatus, ToastInfo } from './types/kanji';
import { extractUniqueKanji, convertSvgToPngBlob, downloadBlob } from './utils/kanji';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
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

  // Filter list by search query
  const filteredKanjiList = useMemo(() => {
    if (!searchFilter.trim()) return extractedKanjiList;
    const q = searchFilter.trim().toLowerCase();
    return extractedKanjiList.filter(
      (item) => item.kanji.includes(q) || item.hex.includes(q) || item.id.toString() === q
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
        showToast(`✨ Đã copy ảnh nét vẽ chữ "${item.kanji}" vào Clipboard!`, 'success');

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

  // Export CSV for Anki import
  const handleExportCsv = () => {
    if (extractedKanjiList.length === 0) return;
    const header = 'STT,Kanji,Unicode_Hex,SVG_Url\n';
    const rows = extractedKanjiList
      .map((k) => `${k.id},"${k.kanji}","${k.hex}","${k.svgUrl}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'kanji_stroke_order_list.csv');
    showToast('Đã xuất file CSV cho Anki thành công!', 'success');
  };

  // Clear text
  const handleClear = () => {
    setInputText('');
    setSearchFilter('');
    showToast('Đã xóa trắng văn bản', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 antialiased selection:bg-blue-600 selection:text-white pb-20">
      {/* Toast */}
      <Toast toast={toast} />

      {/* Header */}
      <Header
        onPrint={() => window.print()}
        kanjiCount={extractedKanjiList.length}
        onOpenLicense={() => setIsLicenseOpen(true)}
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

        {/* Kanji Stroke Order Section */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
          {/* Section Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">
                  2. Thứ tự nét vẽ Kanji ({filteredKanjiList.length}/{extractedKanjiList.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Hình ảnh nét vẽ lớn, nền trắng chuẩn #FFFFFF, sao chép 1-click vào Clipboard
              </p>
            </div>

            {/* Filter & View Switcher */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Lọc chữ Kanji hoặc hex..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Grid background toggle */}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={includeGrid}
                  onChange={(e) => setIncludeGrid(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                />
                <span>Kèm lưới (+ Grid)</span>
              </label>

              {/* View Switcher: Table vs Cards */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Dạng Bảng</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dạng Thẻ</span>
                </button>
              </div>
            </div>
          </div>

          {/* Empty / Filtered Empty States */}
          {extractedKanjiList.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50/50 border border-blue-100 flex items-center justify-center text-blue-300">
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
              onCopyImage={handleCopyImage}
              onDownloadPng={handleDownloadPng}
              onInspect={(item) => setInspectedKanji(item)}
            />
          ) : (
            <KanjiGrid
              kanjiList={filteredKanjiList}
              copyStatus={copyStatus}
              onCopyImage={handleCopyImage}
              onDownloadPng={handleDownloadPng}
              onInspect={(item) => setInspectedKanji(item)}
            />
          )}
        </section>
      </main>

      {/* Practice / Inspection Modal */}
      <PracticeModal
        item={inspectedKanji}
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
