import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  Layers,
  Table as TableIcon,
  Grid as GridIcon,
  BookOpen,
  Sparkles,
  ExternalLink,
  Languages
} from 'lucide-react';
import { KANJI_DICTIONARY } from '../data/kanjiDictionary';
import { KanjiItem, KanjiDetail, CopyStatus } from '../types/kanji';
import { KanjiTable } from './KanjiTable';
import { KanjiGrid } from './KanjiGrid';
import { useJapaneseIme } from '../utils/useJapaneseIme';
import { ImeCandidatePopover } from './ImeCandidatePopover';
import { KanjiQuickBar } from './KanjiQuickBar';

interface KanjiSearchViewProps {
  onInspectKanji: (item: KanjiItem) => void;
  onCopyImage?: (item: KanjiItem) => void;
  onDownloadPng?: (item: KanjiItem) => void;
  copyStatus?: Record<string, CopyStatus>;
  includeGrid?: boolean;
}

const POPULAR_SUGGESTIONS = ['日', '本', '語', '学', '心', '愛', '風', '龍', '一', '生', '会', '道'];

export const KanjiSearchView: React.FC<KanjiSearchViewProps> = ({
  onInspectKanji,
  onCopyImage,
  onDownloadPng,
  copyStatus = {},
  includeGrid = false,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('all');
  const [selectedStrokeRange, setSelectedStrokeRange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [imeMode, setImeMode] = useState<boolean>(true);

  const ime = useJapaneseIme<HTMLInputElement>({
    value: searchTerm,
    onChange: setSearchTerm,
    mode: imeMode ? 'kanji' : 'off',
  });

  // Comprehensive filter across full KANJI_DICTIONARY entries
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const allKanjiKeys = Object.keys(KANJI_DICTIONARY);

    return allKanjiKeys
      .map((char) => {
        const detail = KANJI_DICTIONARY[char];
        return {
          kanji: char,
          svgUrl: `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${char.charCodeAt(0).toString(16).padStart(5, '0')}.svg`,
          detail,
        } as KanjiItem;
      })
      .filter((item) => {
        const detail = item.detail;
        if (!detail) return false;

        // JLPT Filter
        if (selectedJlpt !== 'all' && detail.jlpt !== selectedJlpt) {
          return false;
        }

        // Stroke Count Range Filter
        if (selectedStrokeRange !== 'all') {
          const strokes = detail.strokeCount || 0;
          if (selectedStrokeRange === '1-4' && (strokes < 1 || strokes > 4)) return false;
          if (selectedStrokeRange === '5-8' && (strokes < 5 || strokes > 8)) return false;
          if (selectedStrokeRange === '9-12' && (strokes < 9 || strokes > 12)) return false;
          if (selectedStrokeRange === '13+' && strokes < 13) return false;
        }

        // Search Term Filter
        if (!term) return true;

        const charMatch = item.kanji === term;
        const hanVietMatch = detail.hanViet?.toLowerCase().includes(term);
        const meaningsMatch = detail.meanings?.some((m) => m.toLowerCase().includes(term));
        const onMatch = detail.on?.some((o) => o.toLowerCase().includes(term));
        const kunMatch = detail.kun?.some((k) => k.toLowerCase().includes(term));
        const radicalMatch = detail.radical?.toLowerCase().includes(term);

        return charMatch || hanVietMatch || meaningsMatch || onMatch || kunMatch || radicalMatch;
      });
  }, [searchTerm, selectedJlpt, selectedStrokeRange]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Search className="w-6 h-6 text-teal-300" />
              <span>Tra cứu & Tìm kiếm Kanji Chuyên sâu</span>
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl">
              Tra cứu theo từ khóa Hán-Việt, Romaji, âm On/Kun, cấp độ thi JLPT N5–N1 và tổng số nét vẽ vector.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-semibold bg-teal-700/60 border border-teal-500/40 px-3 py-1.5 rounded-xl">
              Kho từ điển: {Object.keys(KANJI_DICTIONARY).length}+ chữ
            </span>
          </div>
        </div>

        {/* Input & IME Controls Bar */}
        <div className="relative w-full">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
            <input
              ref={ime.inputRef}
              type="text"
              value={searchTerm}
              onChange={ime.handleChange}
              onKeyDown={ime.handleKeyDown}
              placeholder="Nhập từ khóa (Ví dụ: NHẬT, ka, にほん, 愛, N5... Gõ Romaji + Space chọn Kanji)..."
              className="w-full pl-12 pr-28 py-3.5 text-sm bg-white text-slate-900 rounded-2xl border-2 border-teal-300/40 focus:outline-none focus:ring-4 focus:ring-teal-400/30 focus:border-teal-400 font-medium shadow-lg transition-all"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setImeMode(!imeMode)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  imeMode
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title={imeMode ? 'IME đang Bật (gõ romaji -> Space chọn Kanji)' : 'IME Tắt'}
              >
                IME
              </button>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {ime.imeState.isOpen && (
            <ImeCandidatePopover
              candidates={ime.imeState.candidates}
              selectedIndex={ime.imeState.selectedIndex}
              onSelectCandidate={ime.commitCandidate}
              onClose={ime.closeIme}
              reading={ime.imeState.reading}
              position={ime.imeState.position}
              isLoading={ime.imeState.isLoading}
            />
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 no-scrollbar text-xs">
          <span className="text-teal-200 font-semibold shrink-0">Từ phổ biến:</span>
          <div className="flex items-center gap-1.5">
            {POPULAR_SUGGESTIONS.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => setSearchTerm(char)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-kanji font-bold text-sm transition-colors cursor-pointer"
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and View Mode Controls Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold shrink-0">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>Bộ lọc:</span>
          </div>

          {/* JLPT Level Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedJlpt(level)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                  selectedJlpt === level
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {level === 'all' ? 'Tất cả JLPT' : level}
              </button>
            ))}
          </div>

          {/* Stroke Count Range Filter */}
          <select
            value={selectedStrokeRange}
            onChange={(e) => setSelectedStrokeRange(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">Số nét: Tất cả</option>
            <option value="1-4">1 - 4 nét</option>
            <option value="5-8">5 - 8 nét</option>
            <option value="9-12">9 - 12 nét</option>
            <option value="13+">13+ nét trở lên</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
          <span className="text-slate-500 font-semibold">
            Tìm thấy: <strong className="text-teal-800 font-bold">{searchResults.length}</strong> chữ Kanji
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-teal-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chế độ bảng chi tiết"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-teal-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chế độ thẻ lưới"
            >
              <GridIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick selection bar for search results */}
      {searchResults.length > 0 && (
        <KanjiQuickBar
          kanjiList={searchResults.slice(0, 50)}
          onSelectKanji={onInspectKanji}
          title="⚡ Chọn nhanh Kanji từ kết quả tìm kiếm (Click mở nét vẽ):"
        />
      )}

      {/* Results Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 min-h-[400px]">
        {searchResults.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-kanji text-3xl">
              無
            </div>
            <h4 className="text-base font-bold text-slate-800">Không tìm thấy từ Kanji phù hợp</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Hãy thử tìm theo âm Hán-Việt (ví dụ: NHẬT, CA, NĂNG), phiên âm Hiragana hoặc điều chỉnh lại bộ lọc JLPT/Số nét.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <KanjiTable
            kanjiList={searchResults}
            copyStatus={copyStatus}
            showGrid={includeGrid}
            showFurigana={true}
            onCopyImage={onCopyImage}
            onDownloadPng={onDownloadPng}
            onInspect={onInspectKanji}
          />
        ) : (
          <KanjiGrid
            kanjiList={searchResults}
            copyStatus={copyStatus}
            showGrid={includeGrid}
            showFurigana={true}
            onCopyImage={onCopyImage}
            onDownloadPng={onDownloadPng}
            onInspect={onInspectKanji}
          />
        )}
      </div>
    </div>
  );
};
