import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Sparkles,
  Copy,
  Download,
  FileText,
  Camera,
  Languages,
  BookOpen,
  Volume2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Columns,
  Minus,
  Plus
} from 'lucide-react';
import { SAMPLE_PRESETS, isKanjiChar, getPrimaryHiragana } from '../utils/kanji';
import { KanjiItem } from '../types/kanji';
import { getPresetBadgeClass } from '../utils/colorUtils';
import { translateJapaneseToVietnamese, translateWithDetails, TranslationEngine } from '../utils/translation';
import { speakJapanese } from '../utils/speech';

interface InputSectionProps {
  inputText: string;
  setInputText: (val: string) => void;
  kanjiList: KanjiItem[];
  onClear: () => void;
  onCopyAllText: () => void;
  onExportCsv: () => void;
  onOpenScanner?: () => void;
  onSelectKanji?: (char: string) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  inputText,
  setInputText,
  kanjiList,
  onClear,
  onCopyAllText,
  onExportCsv,
  onOpenScanner,
  onSelectKanji,
}) => {
  // Toggle states: Default OFF as requested by user
  const [showFurigana, setShowFurigana] = useState<boolean>(false);
  const [showMeaning, setShowMeaning] = useState<boolean>(false);

  // Column layout for Glossed Reader Box (Default 1 column, adjustable 1 to 3 columns on PC)
  const [readerColumns, setReaderColumns] = useState<number>(1);

  // Translation engine: 'google' (default, super fast & accurate) or 'gemini'
  const [engine, setEngine] = useState<TranslationEngine>('google');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [sentenceTranslation, setSentenceTranslation] = useState<string>('');
  const [translationSource, setTranslationSource] = useState<string>('Google Dịch');
  const [showTranslationCard, setShowTranslationCard] = useState<boolean>(false);
  const [copiedTranslation, setCopiedTranslation] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Fast lookup map for Kanji items in the list
  const kanjiMap = React.useMemo(() => {
    const map = new Map<string, KanjiItem>();
    kanjiList.forEach((k) => map.set(k.kanji, k));
    return map;
  }, [kanjiList]);

  // Handle translation of the whole Japanese sentence to Vietnamese
  const handleTranslateSentence = async (overrideEngine?: TranslationEngine) => {
    if (!inputText.trim()) return;
    const targetEngine = overrideEngine || engine;
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const res = await translateWithDetails(inputText, targetEngine);
      setSentenceTranslation(res.text);
      setTranslationSource(res.source);
      setShowTranslationCard(true);
    } catch (err: any) {
      setTranslationError(err.message || 'Không thể kết nối dịch thuật');
    } finally {
      setIsTranslating(false);
    }
  };

  // Copy translated text to clipboard
  const handleCopyTranslation = async () => {
    if (!sentenceTranslation) return;
    try {
      await navigator.clipboard.writeText(sentenceTranslation);
      setCopiedTranslation(true);
      setTimeout(() => setCopiedTranslation(false), 1800);
    } catch {}
  };

  // Reset translation text when input text is cleared
  useEffect(() => {
    if (!inputText.trim()) {
      setSentenceTranslation('');
      setShowTranslationCard(false);
    }
  }, [inputText]);

  return (
    <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4 transition-all">
      {/* Title & Clear Action */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/70 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
              1. Dán văn bản tiếng Nhật hoặc từ vựng
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
              Tự động lọc Kanji, phiên âm Hiragana, dịch nghĩa từng chữ & dịch nghĩa toàn câu tiếng Việt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs min-h-[34px] active:scale-95"
              title="Quét ảnh hoặc dán ảnh chụp màn hình để trích xuất chữ Kanji"
            >
              <Camera className="w-3.5 h-3.5 text-teal-700" />
              <span>Quét ảnh Kanji</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            disabled={!inputText}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all min-h-[34px] ${
              inputText
                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer shadow-2xs active:scale-95'
                : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-50'
            }`}
            title={inputText ? 'Xóa trắng văn bản' : 'Không có nội dung để xóa'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa trắng</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 touch-pan-x scroll-smooth">
        <span className="text-slate-400 font-semibold whitespace-nowrap flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          Mẫu có sẵn:
        </span>
        {SAMPLE_PRESETS.map((preset, idx) => {
          const style = getPresetBadgeClass(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(preset.text)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border font-semibold cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5 hover:shadow-xs ${style.btn}`}
              title={preset.desc}
            >
              <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
              <span>{preset.title}</span>
            </button>
          );
        })}
      </div>

      {/* Textarea Box & Quick Action Toolbar */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Dán đoạn văn tiếng Nhật bất kỳ vào đây... (Ví dụ: 日本語能力試験、漢字の書き順、練習、温故知新)"
            rows={3}
            className="w-full px-3.5 sm:px-4 py-3 text-slate-800 placeholder-slate-400 bg-slate-50/70 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-sans text-xs sm:text-sm resize-y leading-relaxed shadow-inner min-h-[90px] sm:min-h-[105px]"
          />
        </div>

        {/* Translation Trigger Bar & Engine Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Action Button: Dịch cả câu */}
            <button
              type="button"
              onClick={() => handleTranslateSentence()}
              disabled={!inputText.trim() || isTranslating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[34px] sm:min-h-[36px] ${
                inputText.trim() && !isTranslating
                  ? 'bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-800 hover:from-teal-800 hover:to-indigo-900 text-white shadow-sm shadow-teal-950/20 active:scale-95 cursor-pointer ring-1 ring-teal-500/30'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                inputText.trim()
                  ? `Dịch toàn bộ đoạn văn tiếng Nhật bằng ${engine === 'google' ? 'Google Dịch (Nhanh & Chuẩn)' : 'Gemini AI'}`
                  : 'Nhập văn bản trước khi dịch'
              }
            >
              {isTranslating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang dịch...</span>
                </>
              ) : (
                <>
                  <Languages className="w-3.5 h-3.5 text-amber-300" />
                  <span>Dịch câu ({engine === 'google' ? 'Google' : 'Gemini'})</span>
                </>
              )}
            </button>

            {/* Translation Engine Quick Toggle (Google Translate vs Gemini AI) */}
            <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-semibold items-center">
              <button
                type="button"
                onClick={() => {
                  setEngine('google');
                  if (inputText.trim()) handleTranslateSentence('google');
                }}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  engine === 'google'
                    ? 'bg-teal-700 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dịch siêu tốc 150ms bằng Google Dịch, dịch tự nhiên câu giao tiếp chuẩn nghĩa"
              >
                Google Dịch
              </button>
              <button
                type="button"
                onClick={() => {
                  setEngine('gemini');
                  if (inputText.trim()) handleTranslateSentence('gemini');
                }}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  engine === 'gemini'
                    ? 'bg-indigo-700 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dịch bằng Gemini AI hiểu sâu sắc ngữ cảnh văn hóa"
              >
                Gemini AI
              </button>
            </div>

            {inputText.trim() && (
              <button
                type="button"
                onClick={() => speakJapanese(inputText)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer min-h-[34px] sm:min-h-[36px]"
                title="Nghe đọc toàn bộ đoạn văn bằng giọng chuẩn Nhật Bản"
              >
                <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Phát âm</span>
              </button>
            )}
          </div>

          {/* Character and Kanji statistics pill */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 font-medium self-end sm:self-auto">
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
              {inputText.length} ký tự
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-bold">
              {kanjiList.length} Kanji
            </span>
          </div>
        </div>
      </div>

      {/* FULL SENTENCE TRANSLATION CARD (DỊCH CẢ CÂU) */}
      {sentenceTranslation && showTranslationCard && (
        <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50/60 via-teal-50/40 to-slate-50 rounded-2xl border-2 border-teal-200/90 shadow-2xs space-y-2 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs border-b border-teal-100 pb-2 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse shrink-0" />
              <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">Nghĩa toàn câu:</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
                  engine === 'google'
                    ? 'bg-teal-100/80 text-teal-900 border-teal-300'
                    : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                }`}>
                  {translationSource || (engine === 'google' ? 'Google Dịch' : 'Gemini AI')}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopyTranslation}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-teal-900 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Sao chép bản dịch tiếng Việt"
              >
                {copiedTranslation ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-teal-600" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTranslateSentence()}
                disabled={isTranslating}
                className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Dịch lại bản dịch"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowTranslationCard(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Tạm ẩn khung dịch câu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="text-xs sm:text-sm md:text-base font-semibold text-slate-800 leading-relaxed pl-1 font-sans">
            "{sentenceTranslation}"
          </div>
        </div>
      )}

      {/* Translation Error alert if any */}
      {translationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{translationError}</span>
        </div>
      )}

      {/* INTERACTIVE GLOSSED READER BOX (Hiragana trên đầu & Nghĩa tiếng Việt bên dưới) */}
      {(showFurigana || showMeaning) && inputText.trim() && kanjiList.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-teal-50/40 rounded-2xl border-2 border-teal-200/90 space-y-2.5 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-teal-100 pb-2 flex-wrap gap-2">
            <span className="font-bold text-teal-950 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Khung đọc chi tiết từng chữ (Nhấp vào chữ Kanji để xem thứ tự nét vẽ):</span>
            </span>

            <div className="flex items-center gap-2 shrink-0">
              {/* Column count selector (PC / large screen optimization) */}
              <div className="hidden sm:flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-xl border border-teal-200/90 shadow-2xs text-[11px] font-semibold text-slate-700">
                <Columns className="w-3.5 h-3.5 text-teal-700" />
                <span>Hiển thị:</span>
                <button
                  type="button"
                  onClick={() => setReaderColumns((c) => Math.max(1, c - 1))}
                  disabled={readerColumns <= 1}
                  className="p-1 rounded-md hover:bg-teal-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  title="Giảm số cột hiển thị"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bold text-teal-900 w-9 text-center px-1 py-0.2 rounded bg-teal-50 border border-teal-200">
                  {readerColumns} cột
                </span>
                <button
                  type="button"
                  onClick={() => setReaderColumns((c) => Math.min(3, c + 1))}
                  disabled={readerColumns >= 3}
                  className="p-1 rounded-md hover:bg-teal-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                  title="Tăng số cột hiển thị (tối đa 3 cột)"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <span className="text-[11px] text-teal-900 font-bold bg-teal-100/80 px-2.5 py-0.5 rounded-full border border-teal-300 shrink-0">
                {kanjiList.length} Kanji có chú thích
              </span>
            </div>
          </div>

          <div
            className={`p-1 overflow-x-auto select-text font-sans ${
              readerColumns === 2
                ? 'md:columns-2 gap-6 space-y-0'
                : readerColumns === 3
                ? 'md:columns-2 lg:columns-3 gap-6 space-y-0'
                : 'columns-1 space-y-2'
            }`}
          >
            {(() => {
              const lines = inputText.split('\n');

              return lines.map((lineText, lineIdx) => {
                // Render empty line gap if line is blank
                if (!lineText.trim()) {
                  return <div key={lineIdx} className="w-full h-3 sm:h-4 break-inside-avoid block" />;
                }

                // Group consecutive non-kanji characters into continuous text tokens per line
                const tokens: Array<{ type: 'kanji' | 'text'; content: string }> = [];
                let currentText = '';

                for (const char of lineText) {
                  if (isKanjiChar(char)) {
                    if (currentText) {
                      tokens.push({ type: 'text', content: currentText });
                      currentText = '';
                    }
                    tokens.push({ type: 'kanji', content: char });
                  } else {
                    currentText += char;
                  }
                }
                if (currentText) {
                  tokens.push({ type: 'text', content: currentText });
                }

                return (
                  <div
                    key={lineIdx}
                    className="flex flex-wrap items-end gap-1 leading-loose w-full break-inside-avoid mb-2.5 inline-block"
                  >
                    {tokens.map((token, tokenIdx) => {
                      if (token.type === 'kanji') {
                        const char = token.content;
                        const item = kanjiMap.get(char);
                        const hira = getPrimaryHiragana(item?.detail);
                        const hanViet = item?.detail?.hanViet;
                        const meaning = item?.detail?.meanings?.[0];
                        const meaningDisplay = meaning || hanViet || '';

                        return (
                          <div
                            key={tokenIdx}
                            onClick={() => onSelectKanji && onSelectKanji(char)}
                            className="inline-flex flex-col items-center mx-0.5 my-0.5 px-2 py-1 rounded-xl hover:bg-teal-100 cursor-pointer transition-all group align-bottom bg-white border border-teal-200/90 shadow-2xs hover:border-teal-500 hover:shadow-xs active:scale-95 shrink-0"
                            title={`Kanji: ${char}${hira ? ` | Hiragana: ${hira}` : ''}${hanViet ? ` | Hán-Việt: ${hanViet}` : ''}${item?.detail?.meanings?.length ? ` | Nghĩa: ${item.detail.meanings.join(', ')}` : ''} (Nhấp để tra cứu)`}
                          >
                            {/* 1. Hiragana trên đầu chữ Kanji (khi showFurigana BẬT) */}
                            {showFurigana && (
                              <span className="text-[10px] sm:text-[11px] font-semibold text-teal-800 leading-none group-hover:text-teal-950 pb-0.5 select-none font-sans tracking-tight">
                                {hira || hanViet || ' '}
                              </span>
                            )}

                            {/* 2. Chữ Kanji chính giữa */}
                            <span className="font-black text-slate-900 group-hover:text-teal-900 text-lg sm:text-xl leading-none px-0.5 font-kanji">
                              {char}
                            </span>

                            {/* 3. Dịch nghĩa tiếng Việt bên dưới chữ Kanji (khi showMeaning BẬT) */}
                            {showMeaning && meaningDisplay && (
                              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md leading-tight mt-1 max-w-[80px] sm:max-w-[100px] truncate select-none text-center font-sans group-hover:bg-emerald-100">
                                {meaningDisplay}
                              </span>
                            )}
                          </div>
                        );
                      }

                      // Non-kanji text run (Hiragana, Katakana, Latin words, punctuation, spaces)
                      return (
                        <span
                          key={tokenIdx}
                          className="text-xs sm:text-sm font-normal text-slate-700 self-center px-0.5 py-1 font-sans leading-normal"
                        >
                          {token.content}
                        </span>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TOOLBAR CONTROLS: Phân định rõ ràng nút BẬT/TẮT (Toggle) và Nút Hành Động (Action) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs pt-1 border-t border-slate-100">
        {/* NHÓM 1: CÁC NÚT BẬT / TẮT (TOGGLES) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Chế độ:
          </span>

          {/* Toggle 1: Hiragana trên đầu */}
          <button
            type="button"
            onClick={() => setShowFurigana(!showFurigana)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs active:scale-95 text-[11px] sm:text-xs min-h-[32px] sm:min-h-[36px] ${
              showFurigana
                ? 'bg-teal-50 text-teal-900 border-2 border-teal-600 ring-1 ring-teal-500/20 shadow-xs'
                : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
            }`}
            title="Nhấp để Bật/Tắt hiển thị Hiragana trên đầu chữ Kanji"
          >
            <Languages className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${showFurigana ? 'text-teal-700' : 'text-slate-400'}`} />
            <span>Hiragana</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black tracking-tight ${
                showFurigana
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {showFurigana ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          {/* Toggle 2: Nghĩa tiếng Việt bên dưới */}
          <button
            type="button"
            onClick={() => setShowMeaning(!showMeaning)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs active:scale-95 text-[11px] sm:text-xs min-h-[32px] sm:min-h-[36px] ${
              showMeaning
                ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-600 ring-1 ring-emerald-500/20 shadow-xs'
                : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
            }`}
            title="Nhấp để Bật/Tắt hiển thị nghĩa tiếng Việt bên dưới chân mỗi chữ Kanji"
          >
            <BookOpen className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${showMeaning ? 'text-emerald-700' : 'text-slate-400'}`} />
            <span>Nghĩa chữ</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black tracking-tight ${
                showMeaning
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {showMeaning ? 'BẬT' : 'TẮT'}
            </span>
          </button>
        </div>

        {/* NHÓM 2: CÁC NÚT HÀNH ĐỘNG XUẤT DỮ LIỆU (ACTION BUTTONS) */}
        {kanjiList.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={onCopyAllText}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-teal-800 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 rounded-xl transition-all font-medium cursor-pointer border border-teal-200 shadow-2xs min-h-[34px] sm:min-h-[36px] text-[13px] active:scale-95"
              title="Sao chép toàn bộ các chữ Kanji lọc được dưới dạng văn bản"
            >
              <Copy className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span style={{ fontSize: '13px' }}>Chép chuỗi Kanji</span>
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:border-slate-300 rounded-xl transition-all font-medium cursor-pointer border border-slate-200 shadow-2xs min-h-[34px] sm:min-h-[36px] text-[13px] active:scale-95"
              title="Xuất danh sách gồm URL ảnh, Hán-Việt & nghĩa sang định dạng CSV để nhập vào Anki"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span style={{ fontSize: '13px' }}>Xuất CSV (Anki)</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
