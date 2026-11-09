import React, { useState, useMemo } from 'react';
import {
  History,
  Trash2,
  Search,
  Table as TableIcon,
  LayoutGrid,
  Clock,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useKanji } from '../context/KanjiContext';
import { KanjiTable } from './KanjiTable';
import { KanjiGrid } from './KanjiGrid';
import { KanjiQuickBar } from './KanjiQuickBar';
import { useNavigate } from 'react-router-dom';

export const RecentlyViewedKanji: React.FC = () => {
  const {
    recentlyViewed,
    clearRecentHistory,
    handleInspectKanji,
    inspectedKanji,
    copyStatus,
    includeGrid,
    showListFurigana,
    handleCopyImage,
    handleDownloadPng,
  } = useKanji();

  const navigate = useNavigate();
  const [filterText, setFilterText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const filteredHistory = useMemo(() => {
    if (!filterText.trim()) return recentlyViewed;
    const q = filterText.trim().toLowerCase();
    return recentlyViewed.filter(
      (item) =>
        item.kanji.includes(q) ||
        item.detail?.hanViet?.toLowerCase().includes(q) ||
        item.detail?.jlpt?.toLowerCase() === q ||
        item.detail?.meanings?.some((m) => m.toLowerCase().includes(q)) ||
        item.detail?.on?.some((o) => o.toLowerCase().includes(q)) ||
        item.detail?.kun?.some((k) => k.toLowerCase().includes(q))
    );
  }, [recentlyViewed, filterText]);

  return (
    <div id="recently-viewed-page" className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-800 rounded-2xl border border-teal-200/80">
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  Lịch sử tra cứu &amp; Luyện nét Kanji
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {recentlyViewed.length} chữ đã lưu
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Toàn bộ dữ liệu nét vẽ và âm Hán-Việt được lưu trữ ngoại tuyến trên thiết bị, xem lại không cần kết nối lại API.
              </p>
            </div>
          </div>

          {recentlyViewed.length > 0 && (
            <button
              type="button"
              onClick={clearRecentHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
              title="Xóa toàn bộ lịch sử đã lưu"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa lịch sử</span>
            </button>
          )}
        </div>

        {/* Search within history & View mode toggle */}
        {recentlyViewed.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Lọc trong lịch sử (Kanji, Hán-Việt, nghĩa...)..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="h-9 inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 items-center gap-0.5">
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
        )}
      </div>

      {/* Quick Selection Strip */}
      {recentlyViewed.length > 0 && (
        <KanjiQuickBar
          kanjiList={filteredHistory}
          onSelectKanji={handleInspectKanji}
          selectedKanjiChar={inspectedKanji?.kanji}
          title="Chữ Kanji đã tra cứu gần đây (Click mở xem hoạt ảnh nét vẽ ngay):"
        />
      )}

      {/* Full Table / Grid View of History Items */}
      {recentlyViewed.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-16 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Clock className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="font-bold text-slate-700 text-base">Chưa có lịch sử tra cứu</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Khi bạn mở xem chi tiết hoặc tập viết bất kỳ chữ Kanji nào, chữ đó sẽ tự động được lưu lại tại đây kèm toàn bộ thông tin nét vẽ.
          </p>
          <button
            type="button"
            onClick={() => navigate('/kanji')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            <span>Đến bảng nét Kanji</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center text-slate-400 text-sm">
          Không tìm thấy chữ nào trong lịch sử khớp với "{filterText}".
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6">
          <KanjiTable
            kanjiList={filteredHistory}
            copyStatus={copyStatus}
            showGrid={includeGrid}
            showFurigana={showListFurigana}
            onCopyImage={handleCopyImage}
            onDownloadPng={handleDownloadPng}
            onInspect={handleInspectKanji}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6">
          <KanjiGrid
            kanjiList={filteredHistory}
            copyStatus={copyStatus}
            showGrid={includeGrid}
            showFurigana={showListFurigana}
            onCopyImage={handleCopyImage}
            onDownloadPng={handleDownloadPng}
            onInspect={handleInspectKanji}
          />
        </div>
      )}
    </div>
  );
};
