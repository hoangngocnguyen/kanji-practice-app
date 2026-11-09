import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  Grid,
  Camera,
  ArrowUp,
  Plus,
  X,
  Languages,
  FileText,
  Edit3,
  ChevronDown,
  ChevronUp,
  Check,
  Columns3,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKanji } from '../context/KanjiContext';
import { KanjiTable } from './KanjiTable';
import { KanjiGrid } from './KanjiGrid';
import { KanjiQuickBar } from './KanjiQuickBar';
import { useJapaneseIme } from '../utils/useJapaneseIme';
import { ImeCandidatePopover } from './ImeCandidatePopover';
import { isKanjiChar, getPrimaryHiragana } from '../utils/kanji';
import { getKanjiInfo } from '../data/kanjiDictionary';

export const KanjiStrokesView: React.FC = () => {
  const navigate = useNavigate();
  const {
    inputText,
    setInputText,
    extractedKanjiList,
    mergedKanjiList,
    handleInspectKanji,
    inspectedKanji,
    copyStatus,
    includeGrid,
    setIncludeGrid,
    showListFurigana,
    handleCopyImage,
    handleDownloadPng,
    setIsScannerOpen,
    setIsGoogleDocsExporterOpen,
    handleSelectRecentKanji,
    handleRemoveKanjiFromList,
    selectedCompareKanji,
    toggleCompareKanji,
    clearCompareKanji,
    isCompareSelectionMode,
    setIsCompareSelectionMode,
  } = useKanji();

  const [isTextContainerExpanded, setIsTextContainerExpanded] = useState<boolean>(true);
  const [isEditingSourceText, setIsEditingSourceText] = useState<boolean>(false);
  const [editableText, setEditableText] = useState<string>(inputText);

  useEffect(() => {
    setEditableText(inputText);
  }, [inputText]);

  const [searchFilter, setSearchFilter] = useState<string>('');
  const [searchImeMode, setSearchImeMode] = useState<boolean>(true);
  const searchIme = useJapaneseIme<HTMLInputElement>({
    value: searchFilter,
    onChange: setSearchFilter,
    mode: searchImeMode ? 'kanji' : 'off',
  });

  const [quickInput, setQuickInput] = useState<string>('');
  const [quickImeMode, setQuickImeMode] = useState<boolean>(true);
  const quickIme = useJapaneseIme<HTMLInputElement>({
    value: quickInput,
    onChange: setQuickInput,
    mode: quickImeMode ? 'kanji' : 'off',
  });

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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

  const handleQuickAdd = () => {
    if (!quickInput.trim()) return;
    setInputText((prev) => (prev ? `${prev} ${quickInput.trim()}` : quickInput.trim()));
    setQuickInput('');
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="kanji-stroke-section" className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 lg:p-7 space-y-5 animate-in fade-in duration-200">
      {/* Sticky Toolbar beneath Header */}
      <div className="sticky top-16 sm:top-[68px] z-30 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md p-3 sm:p-4 space-y-2.5 transition-all">
        {/* Top row: Status info + Quick Scan + Scroll to top */}
        <div className="flex items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-bold text-slate-800 truncate">
              <span className="sm:hidden">Tra cứu nét vẽ ({filteredKanjiList.length})</span>
              <span className="hidden sm:inline">Tra cứu nét vẽ ({filteredKanjiList.length}/{extractedKanjiList.length})</span>
            </span>
            {extractedKanjiList.length > 0 && (
              <span className="text-[10px] bg-teal-50 text-teal-800 font-semibold px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
                {extractedKanjiList.length} chữ
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[30px] sm:min-h-[32px]"
              title="Quét chữ Kanji từ ảnh hoặc dán ảnh chụp màn hình"
            >
              <Camera className="w-3.5 h-3.5 text-teal-700" />
              <span className="hidden sm:inline">Quét ảnh (OCR)</span>
              <span className="sm:hidden">Quét ảnh</span>
            </button>

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

        {/* Search Filter and Quick Add boxes */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Column 1: Lọc chữ Hán */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchIme.inputRef}
                type="text"
                value={searchFilter}
                onChange={searchIme.handleChange}
                onKeyDown={searchIme.handleKeyDown}
                placeholder="Lọc chữ Hán (gõ romaji + Space chọn Kanji), Hán-Việt, On, Kun..."
                className="w-full pl-9 pr-18 h-10 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-medium shadow-inner"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSearchImeMode(!searchImeMode)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    searchImeMode
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                  title={searchImeMode ? 'IME đang Bật (gõ romaji rồi bấm Space chọn Kanji)' : 'IME đang Tắt (tìm kiếm thường)'}
                >
                  IME
                </button>
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                    title="Xóa bộ lọc"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchIme.imeState.isOpen && (
                <ImeCandidatePopover
                  candidates={searchIme.imeState.candidates}
                  selectedIndex={searchIme.imeState.selectedIndex}
                  onSelectCandidate={searchIme.commitCandidate}
                  onClose={searchIme.closeIme}
                  reading={searchIme.imeState.reading}
                  position={searchIme.imeState.position}
                  isLoading={searchIme.imeState.isLoading}
                />
              )}
            </div>

            {/* Column 2: Thêm Kanji nhanh */}
            <div className="flex items-center gap-1.5 w-full">
              <div className="relative flex-1">
                <input
                  ref={quickIme.inputRef}
                  type="text"
                  value={quickInput}
                  onChange={quickIme.handleChange}
                  onKeyDown={(e) => {
                    if (!quickIme.imeState.isOpen && e.key === 'Enter') {
                      handleQuickAdd();
                    } else {
                      quickIme.handleKeyDown(e);
                    }
                  }}
                  placeholder="+ Thêm chữ Kanji (gõ romaji + Space)..."
                  className="w-full px-3.5 pr-18 h-10 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-medium shadow-inner"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickImeMode(!quickImeMode)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      quickImeMode
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                    title={quickImeMode ? 'IME đang Bật' : 'IME Tắt'}
                  >
                    IME
                  </button>
                  {quickInput && (
                    <button
                      type="button"
                      onClick={() => setQuickInput('')}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                      title="Xóa ô nhập"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {quickIme.imeState.isOpen && (
                  <ImeCandidatePopover
                    candidates={quickIme.imeState.candidates}
                    selectedIndex={quickIme.imeState.selectedIndex}
                    onSelectCandidate={quickIme.commitCandidate}
                    onClose={quickIme.closeIme}
                    reading={quickIme.imeState.reading}
                    position={quickIme.imeState.position}
                    isLoading={quickIme.imeState.isLoading}
                  />
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

          {/* Status & Controls row - Fully Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
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

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto justify-start sm:justify-end pb-0.5 sm:pb-0">
              {/* Nút bật/tắt chế độ chọn so sánh */}
              <button
                type="button"
                onClick={() => setIsCompareSelectionMode((prev) => !prev)}
                className={`h-8 sm:h-9 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap shrink-0 shadow-2xs ${
                  isCompareSelectionMode
                    ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-md'
                    : 'bg-white hover:bg-teal-50 text-teal-800 border-teal-300'
                }`}
                title={isCompareSelectionMode ? 'Tắt chế độ chọn so sánh' : 'Bật chế độ chọn các chữ Kanji để so sánh'}
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>{isCompareSelectionMode ? 'Đang chọn so sánh' : 'So sánh'}</span>
                {selectedCompareKanji.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-amber-700 shadow-2xs">
                    {selectedCompareKanji.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIncludeGrid((prev) => !prev)}
                className={`h-8 sm:h-9 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap shrink-0 ${
                  includeGrid
                    ? 'bg-teal-50 border-teal-600 text-teal-950 ring-1 ring-teal-500/20 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
                }`}
                title="Bật/Tắt đường lưới ô nét đứt mảnh"
              >
                <Grid className={`w-3.5 h-3.5 ${includeGrid ? 'text-teal-700' : 'text-slate-400'}`} />
                <span>Kèm lưới</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold tracking-tight ${
                    includeGrid ? 'bg-teal-700 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {includeGrid ? 'BẬT' : 'TẮT'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsGoogleDocsExporterOpen(true)}
                className="h-8 sm:h-9 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap shrink-0 shadow-2xs"
                title="Xuất bảng 1 cột chứa ảnh nét vẽ để dán sang Google Docs"
              >
                <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Dán Google Docs</span>
                <span className="sm:hidden">Docs</span>
              </button>

              <div className="h-8 sm:h-9 inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 items-center gap-0.5 shrink-0 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`h-full inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap font-semibold ${
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
                  className={`h-full inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap font-semibold ${
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

      {/* Container chứa đoạn văn bản nguồn (Có hỗ trợ thu gọn/mở rộng & sửa văn bản trực tiếp) */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-4 space-y-2.5 transition-all">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm">
            <FileText className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Nội dung văn bản nguồn ({inputText.length} ký tự, {extractedKanjiList.length} Kanji)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditingSourceText(!isEditingSourceText)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Chỉnh sửa đoạn văn bản nguồn trực tiếp"
            >
              <Edit3 className="w-3.5 h-3.5 text-teal-700" />
              <span>{isEditingSourceText ? 'Đóng sửa' : 'Sửa văn bản'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTextContainerExpanded(!isTextContainerExpanded)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title={isTextContainerExpanded ? 'Thu gọn ô văn bản' : 'Mở rộng ô văn bản'}
            >
              {isTextContainerExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isTextContainerExpanded && (
          <div className="pt-1">
            {isEditingSourceText ? (
              <div className="space-y-2">
                <textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  rows={3}
                  placeholder="Dán hoặc nhập đoạn văn bản tiếng Nhật tại đây..."
                  className="w-full p-3 text-xs sm:text-sm bg-white border border-teal-400 focus:border-teal-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-sans shadow-inner leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditableText(inputText);
                      setIsEditingSourceText(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputText(editableText);
                      setIsEditingSourceText(false);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu thay đổi</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                {inputText ? (
                  inputText
                ) : (
                  <span className="italic text-slate-400">Chưa có văn bản nào được nhập. Bấm "Sửa văn bản" để nhập dữ liệu.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Horizontal Quick-Selection Bar */}
      <KanjiQuickBar
        kanjiList={filteredKanjiList}
        onSelectKanji={handleInspectKanji}
        onRemoveKanji={handleRemoveKanjiFromList}
        selectedKanjiChar={inspectedKanji?.kanji}
      />

      {/* Empty / Filtered Empty States */}
      {extractedKanjiList.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50/60 border border-teal-100 flex items-center justify-center text-teal-500">
            <span className="font-kanji text-4xl">空</span>
          </div>
          <h4 className="text-base font-bold text-slate-700">Chưa tìm thấy ký tự Kanji nào</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Hãy bấm <strong>Nhập văn bản</strong> trên thanh bên để dán đoạn văn hoặc thêm chữ Kanji trực tiếp ở thanh trên.
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
          onRemoveKanji={handleRemoveKanjiFromList}
          isCompareSelectionMode={isCompareSelectionMode}
          selectedCompareKanji={selectedCompareKanji}
          onToggleCompareKanji={toggleCompareKanji}
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
          onRemoveKanji={handleRemoveKanjiFromList}
          isCompareSelectionMode={isCompareSelectionMode}
          selectedCompareKanji={selectedCompareKanji}
          onToggleCompareKanji={toggleCompareKanji}
        />
      )}

      {/* Floating Bottom Action Bar khi có Kanji được chọn để so sánh */}
      {selectedCompareKanji.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3.5 max-w-[92vw] sm:max-w-xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-300 shrink-0 hidden sm:inline">
              Đã chọn:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {selectedCompareKanji.map((char) => (
                <span
                  key={char}
                  className="font-kanji font-bold text-sm bg-teal-600/80 text-white px-2 py-0.5 rounded-lg border border-teal-400/40 shrink-0 inline-flex items-center gap-1"
                >
                  {char}
                  <button
                    type="button"
                    onClick={() => toggleCompareKanji(char)}
                    className="hover:text-rose-300 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-mono shrink-0">
              ({selectedCompareKanji.length}/6)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={clearCompareKanji}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={() => {
                navigate(`/compare?kanji=${encodeURIComponent(selectedCompareKanji.join(''))}`);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>So sánh ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
