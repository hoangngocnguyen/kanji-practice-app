import React, { useState, useEffect, useRef } from 'react';
import {
  MousePointerClick,
  Sparkles,
  Volume2,
  ExternalLink,
  PlayCircle,
  Camera,
  Search,
  Crop,
  X,
  FileText,
  Zap,
  CheckCircle2
} from 'lucide-react';
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
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  // Snipping state simulator
  const [isSnippingMode, setIsSnippingMode] = useState<boolean>(false);
  const [snipSelection, setSnipSelection] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const snipSelectionRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sample articles for testing
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
      title: "Biển hiệu Tokyo & Giao thông",
      text: "東京都新宿区 止まれ 進入禁止 温故知新：過去の事をよく調べて新しい見解を得る。"
    }
  ];

  // Handle text selection within playground
  useEffect(() => {
    const handleMouseUp = () => {
      if (isSnippingMode) return;
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
  }, [isSnippingMode]);

  // Synchronize ref
  useEffect(() => {
    snipSelectionRef.current = snipSelection;
  }, [snipSelection]);

  // Window-level mouse listeners for snipping to guarantee 100% responsiveness
  useEffect(() => {
    if (!isSnippingMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSnippingMode(false);
        setSnipSelection(null);
        isDraggingRef.current = false;
      }
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !snipSelectionRef.current) return;
      setSnipSelection(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const sel = snipSelectionRef.current;
      setIsSnippingMode(false);
      setSnipSelection(null);

      if (sel) {
        const width = Math.abs(sel.currentX - sel.startX);
        const height = Math.abs(sel.currentY - sel.startY);

        if (width >= 10 && height >= 10) {
          executeCroppedScan(width, height, '東京都新宿区 止まれ');
        } else {
          // If clicked without dragging, scan sample automatically so user is never stuck
          executeCroppedScan(240, 100, '東京都新宿区');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isSnippingMode]);

  // Helper: Execute scan and generate cropped thumbnail
  const executeCroppedScan = (w: number, h: number, defaultText: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(Math.max(w, 180), 400);
    canvas.height = Math.min(Math.max(h, 80), 200);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#2dd4bf';
      ctx.font = 'bold 22px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(defaultText, canvas.width / 2, canvas.height / 2);
    }
    const dataUrl = canvas.toDataURL('image/png');
    setCroppedPreviewUrl(dataUrl);

    // Extract unique Kanji characters
    const detectedKanjis = defaultText.match(/[\u4e00-\u9faf]/gu) || ['東', '京', '都', '新', '宿', '区', '止'];
    const detectedString = [...new Set(detectedKanjis)].join('');

    setActiveModalText(detectedString);
    setModalSearchQuery(detectedString);
  };

  const startSnipping = () => {
    setIsSnippingMode(true);
    setTooltipPos(null);
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    // If clicked on HUD buttons, do not start drag
    if ((e.target as HTMLElement).closest('.snip-hud-action')) return;

    isDraggingRef.current = true;
    const initial = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    };
    setSnipSelection(initial);
    snipSelectionRef.current = initial;
  };

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
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-teal-50 text-teal-800 rounded-xl border border-teal-200">
            <MousePointerClick className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Trải Nghiệm Tiện Ích Trình Duyệt (Web Simulator)</h3>
            <p className="text-xs text-slate-500">
              Bôi đen đoạn văn hoặc bấm Chụp khoanh vùng để kiểm tra toàn bộ tính năng của Extension v3.0!
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startSnipping}
            className="h-10 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            title="Kích hoạt công cụ khoanh vùng màn hình để quét chữ Hán bằng OCR"
          >
            <Camera className="w-4 h-4" />
            <span>📸 Khoanh vùng quét Kanji (Snipping)</span>
          </button>
        </div>
      </div>

      {/* Extension Popup Quick Search Simulator Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 flex flex-col sm:flex-row items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
          <Search className="w-3.5 h-3.5 text-teal-700" />
          <span>Tra cứu nhanh Extension:</span>
        </div>
        <div className="flex-1 flex items-center gap-2 w-full">
          <input
            type="text"
            placeholder="Gõ Kanji hoặc câu tiếng Nhật (Ví dụ: 日本語, 勉強, 駅)..."
            className="flex-1 h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-teal-600"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) {
                  setActiveModalText(val);
                  setCroppedPreviewUrl(null);
                }
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
              if (input && input.value.trim()) {
                setActiveModalText(input.value.trim());
                setCroppedPreviewUrl(null);
              }
            }}
            className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Tra cứu
          </button>
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

      {/* Screen Snipping Overlay Simulator - Highly Responsive */}
      {isSnippingMode && (
        <div
          className="fixed inset-0 z-50 cursor-crosshair select-none bg-slate-950/65 backdrop-blur-xs flex flex-col items-center justify-center animate-in fade-in duration-150"
          onMouseDown={handleOverlayMouseDown}
        >
          {/* Top Instruction Floating HUD */}
          <div className="fixed top-6 bg-slate-900/95 text-white text-xs font-bold px-6 py-3 rounded-full shadow-2xl border border-white/20 flex flex-wrap items-center justify-center gap-3.5 z-50">
            <div className="flex items-center gap-2 text-teal-300">
              <Crop className="w-4 h-4 animate-spin" />
              <span>Kéo thả chuột để khoanh vùng Kanji cần quét</span>
            </div>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSnippingMode(false);
                setSnipSelection(null);
                executeCroppedScan(260, 100, '東京都新宿区 止まれ 進入禁止');
              }}
              className="snip-hud-action px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Quét mẫu Tokyo ngay</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSnippingMode(false);
                setSnipSelection(null);
              }}
              className="snip-hud-action px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              ✕ Hủy (Esc)
            </button>
          </div>

          {/* Dynamic Selection Box with Clear Cutout Effect */}
          {snipSelection && (
            <div
              style={{
                position: 'fixed',
                left: `${Math.min(snipSelection.startX, snipSelection.currentX)}px`,
                top: `${Math.min(snipSelection.startY, snipSelection.currentY)}px`,
                width: `${Math.abs(snipSelection.currentX - snipSelection.startX)}px`,
                height: `${Math.abs(snipSelection.currentY - snipSelection.startY)}px`,
              }}
              className="border-2 border-teal-400 bg-white/10 pointer-events-none shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]"
            >
              <div className="absolute -top-7 left-0 bg-slate-900 text-teal-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                {Math.round(Math.abs(snipSelection.currentX - snipSelection.startX))} ×{' '}
                {Math.round(Math.abs(snipSelection.currentY - snipSelection.startY))} px
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Tooltip Simulation */}
      {tooltipPos && !isSnippingMode && (
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
            setCroppedPreviewUrl(null);
            setTooltipPos(null);
          }}
          className="bg-slate-900 text-white hover:bg-teal-600 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-1.5 transition-all animate-bounce border border-white/20 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Tra Kanji ({selectedText.match(/\p{Script=Han}/gu)?.length || 0})</span>
        </button>
      )}

      {/* Extension Modal Simulation (with Top Search Bar & Snipped Preview) */}
      {activeModalText && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⛩️</span>
                <h4 className="font-bold text-white text-sm sm:text-base">
                  Luyện Kanji - Tra Cứu & Quét Ảnh Chữ Hán
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalText(null);
                    startSnipping();
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="Khoanh vùng quét ảnh mới"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Chụp ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalText(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm font-bold cursor-pointer transition-colors"
                  title="Đóng cửa sổ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Top Search Row */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={modalSearchQuery || activeModalText}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActiveModalText(modalSearchQuery);
                    setCroppedPreviewUrl(null);
                  }
                }}
                placeholder="Nhập chữ Hán hoặc câu tiếng Nhật cần tra..."
                className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={() => {
                  setActiveModalText(modalSearchQuery);
                  setCroppedPreviewUrl(null);
                }}
                className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tra cứu
              </button>
            </div>

            {/* Modal Content - Kanji List Cards */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
              {/* Cropped Preview Banner if from Snipping */}
              {croppedPreviewUrl && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <img src={croppedPreviewUrl} alt="Vùng ảnh vừa chụp" className="max-h-12 rounded border border-emerald-300 bg-white object-contain" />
                  <div className="text-xs text-emerald-900 font-medium">
                    <strong className="flex items-center gap-1 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Đã khoanh vùng & quét ảnh thành công:
                    </strong>
                    Trích xuất được <strong>{extractedKanjiItems.length}</strong> chữ Hán từ khu vực vừa chụp.
                  </div>
                </div>
              )}

              {extractedKanjiItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Không tìm thấy chữ Kanji nào trong đoạn văn đã chọn hoặc tìm kiếm.
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
                      <div className="flex flex-col items-center justify-center min-w-[90px] shrink-0">
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
                        className="relative w-22 h-22 shrink-0 bg-slate-50 rounded-2xl border-2 border-slate-200 p-1 flex items-center justify-center cursor-pointer hover:border-teal-500 transition-all group overflow-hidden"
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

            {/* Modal Footer with Direct Link to Web App */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Tìm thấy <strong className="text-teal-700">{extractedKanjiItems.length}</strong> chữ Hán
              </span>
              <a
                href={`https://luyenkanji.vercel.app/?text=${encodeURIComponent(activeModalText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Mở trên Web App Luyện Kanji ↗</span>
              </a>
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
