import React, { useState, useEffect, useRef } from 'react';
import { MousePointerClick, Sparkles, Volume2, ExternalLink, PlayCircle } from 'lucide-react';
import { getKanjiInfo } from '../data/kanjiDictionary';
import { extractUniqueKanji, convertSvgToPngBlob, downloadBlob } from '../utils/kanji';
import { speakJapanese } from '../utils/speech';
import { getJlptBadgeClass } from '../utils/colorUtils';
import { PracticeModal } from './PracticeModal';
import { KanjiItem } from '../types/kanji';
import { KanjiSvgView } from './KanjiSvgView';

export const ExtensionPlayground: React.FC = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [activeModalText, setActiveModalText] = useState<string | null>(null);
  const [inspectedKanjiItem, setInspectedKanjiItem] = useState<KanjiItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sample texts for testing
  const sampleArticles = [
    {
      title: "Tin tức NHK Easy News",
      text: "日本人は漢字を毎日勉強する。一期一会、七転び八起き。日本での生活と日本語能力試験。"
    },
    {
      title: "Lời thoại Manga / Anime",
      text: "諦めたらそこで試合終了ですよ。我が生涯に一片の悔いなし！"
    },
    {
      title: "Thành ngữ & Triết lý",
      text: "温故知新：過去の事をよく調べて、新しい知識や見解を得ること。"
    }
  ];

  // Handle text selection within playground
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setTooltipPos(null);
        return;
      }

      const text = selection.toString().trim();
      const matches = text.match(/\p{Script=Han}/gu);

      if (matches && matches.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        setTooltipPos({
          x: rect.left + (rect.width / 2),
          y: rect.top - 42
        });
      } else {
        setTooltipPos(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Extract unique Kanji items with complete details & SVG Urls
  const extractedKanjiItems = React.useMemo<KanjiItem[]>(() => {
    if (!activeModalText) return [];
    return extractUniqueKanji(activeModalText);
  }, [activeModalText]);

  // Handle Copy Image
  const handleCopyImage = async (item: KanjiItem) => {
    try {
      const pngBlob = await convertSvgToPngBlob(item.svgUrl, false);
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        downloadBlob(pngBlob, `kanji_${item.kanji}_${item.hex}.png`);
      }
    } catch (e) {
      console.warn('Lỗi copy ảnh:', e);
    }
  };

  // Handle Download PNG
  const handleDownloadPng = async (item: KanjiItem) => {
    try {
      const pngBlob = await convertSvgToPngBlob(item.svgUrl, false);
      downloadBlob(pngBlob, `kanji_${item.kanji}_${item.hex}.png`);
    } catch (e) {
      console.warn('Lỗi download png:', e);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 my-6" ref={containerRef}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-teal-50 text-teal-800 rounded-xl border border-teal-200">
            <MousePointerClick className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Trải Nghiệm Trực Tiếp Web Simulator (Chrome Extension)</h3>
            <p className="text-xs text-slate-500">
              Thử bôi đen bất kỳ đoạn văn bản tiếng Nhật nào dưới đây để xem Floating Tooltip & Modal Shadow DOM xuất hiện!
            </p>
          </div>
        </div>
      </div>

      {/* Sample articles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {sampleArticles.map((article, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 hover:border-teal-300 transition-all">
            <div className="text-xs font-bold text-teal-800 mb-1.5 uppercase tracking-wide">{article.title}</div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed font-kanji select-all cursor-text bg-white p-3 rounded-lg border border-slate-200">
              {article.text}
            </p>
          </div>
        ))}
      </div>

      {/* Floating Tooltip Simulation */}
      {tooltipPos && (
        <button
          type="button"
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
          onClick={() => {
            setActiveModalText(selectedText);
            setTooltipPos(null);
          }}
          className="bg-slate-900 text-white hover:bg-teal-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-1.5 transition-all animate-bounce border border-white/20 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Tra Kanji ({selectedText.match(/\p{Script=Han}/gu)?.length || 0})</span>
        </button>
      )}

      {/* Extension Modal Simulation (Matching Image 2 Web App Style) */}
      {activeModalText && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⛩️</span>
                <h4 className="font-bold text-slate-900 text-base">
                  Luyện Kanji - Phân Tích Văn Bản ({extractedKanjiItems.length} chữ Hán)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalText(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 text-sm font-bold cursor-pointer transition-colors"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Modal Content - Kanji List Cards matching Image 2 */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {extractedKanjiItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Không tìm thấy chữ Kanji nào trong đoạn văn đã chọn.
                </div>
              ) : (
                extractedKanjiItems.map((item, index) => {
                  const info = getKanjiInfo(item.kanji);
                  const detail = item.detail || info;

                  return (
                    <div
                      key={item.kanji}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-teal-400 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4"
                    >
                      {/* Column 1: Index & Character & Mazii */}
                      <div className="flex flex-col items-center justify-center min-w-[100px] shrink-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-mono font-bold text-teal-800">#{index + 1}</span>
                          {detail?.jlpt && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${getJlptBadgeClass(detail.jlpt)}`}>
                              {detail.jlpt}
                            </span>
                          )}
                        </div>

                        {/* Large Kanji */}
                        <div className="font-kanji font-black text-4xl text-slate-900 my-0.5">
                          {item.kanji}
                        </div>

                        {/* Hán Việt badge */}
                        <div className="text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md text-center max-w-[110px] truncate my-1">
                          {detail?.hanViet || 'HÁN VIỆT'}
                        </div>

                        {/* Mazii Link */}
                        <a
                          href={`https://mazii.net/vi-VN/search/kanji/${encodeURIComponent(item.kanji)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-400 hover:text-teal-700 font-medium inline-flex items-center gap-0.5 hover:underline"
                        >
                          Mazii <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      {/* Column 2: Kanji SVG Thumbnail */}
                      <div
                        onClick={() => setInspectedKanjiItem(item)}
                        className="relative w-24 h-24 shrink-0 bg-slate-50 rounded-2xl border-2 border-slate-200 p-1 flex items-center justify-center cursor-pointer hover:border-teal-500 transition-all group overflow-hidden"
                        title="Click để xem hoạt ảnh nét vẽ"
                      >
                        <KanjiSvgView
                          svgUrl={item.svgUrl}
                          kanji={item.kanji}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                          <PlayCircle className="w-6 h-6 text-teal-700 bg-white rounded-full shadow-md" />
                        </div>
                      </div>

                      {/* Column 3: Kanji Info & Action Buttons */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Badges: Stroke count & Radical */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {detail?.strokeCount && (
                            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                              {detail.strokeCount} nét
                            </span>
                          )}
                          {detail?.radical && (
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                              Bộ: {detail.radical}
                            </span>
                          )}
                        </div>

                        {/* On / Kun readings */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                            <span className="font-bold text-[10px] text-blue-800">On:</span>
                            <span className="text-blue-900 font-mono font-medium">
                              {detail?.on && detail.on.length > 0 ? detail.on.join(', ') : '-'}
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <span className="font-bold text-[10px] text-emerald-800">Kun:</span>
                            <span className="text-emerald-900 font-mono font-medium">
                              {detail?.kun && detail.kun.length > 0 ? detail.kun.join(', ') : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Meanings */}
                        <div className="text-xs text-slate-700 font-medium leading-snug">
                          <strong>Nghĩa:</strong> <span className="font-bold text-slate-900">{detail?.meanings?.join(', ') || 'Đang cập nhật'}</span>
                        </div>

                        {/* Buttons: Audio & Full Practice Modal */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => speakJapanese(item.kanji)}
                            className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Phát âm</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectedKanjiItem(item)}
                            className="px-3.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <span>✍️ Luyện nét</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full 4-Tab Web Practice Modal triggered from Extension Playground */}
      {inspectedKanjiItem && (
        <PracticeModal
          item={inspectedKanjiItem}
          showGrid={true}
          onClose={() => setInspectedKanjiItem(null)}
          onCopyImage={handleCopyImage}
          onDownloadPng={handleDownloadPng}
        />
      )}
    </div>
  );
};
