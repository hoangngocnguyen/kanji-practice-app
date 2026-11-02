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
  Plus,
  HelpCircle
} from 'lucide-react';
import { SAMPLE_PRESETS, isKanjiChar, getPrimaryHiragana } from '../utils/kanji';
import { KanjiItem } from '../types/kanji';
import { getPresetBadgeClass } from '../utils/colorUtils';
import { translateJapaneseToVietnamese, translateWithDetails, TranslationEngine } from '../utils/translation';
import { speakJapanese } from '../utils/speech';
import { romajiToKana, kanaToRomaji, japaneseToFullRomaji, japaneseToRomajiPairs, hasRomaji, KanaMode } from '../utils/romajiConverter';
import {
  ImeCandidate,
  resolveImeCandidates,
  resolveImeCandidatesSync,
  getActiveComposition,
} from '../utils/kanjiImeEngine';
import { ImeCandidatePopover } from './ImeCandidatePopover';

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
  // Toggle states: Default OFF for Furigana/Meaning, Default TRUE for Romaji
  const [showFurigana, setShowFurigana] = useState<boolean>(false);
  const [showMeaning, setShowMeaning] = useState<boolean>(false);
  const [showRomaji, setShowRomaji] = useState<boolean>(false);
  // Full Romaji Transliteration Card state
  const [showFullRomajiCard, setShowFullRomajiCard] = useState<boolean>(true);
  const [copiedFullRomaji, setCopiedFullRomaji] = useState<boolean>(false);

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

  // Font Size state ('sm' | 'md' | 'lg' | 'xl')
  const [inputFontSize, setInputFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    try {
      return (localStorage.getItem('kanji_setting_input_font_size') as any) || 'md';
    } catch {
      return 'md';
    }
  });

  useEffect(() => {
    const syncSettings = () => {
      try {
        const saved = (localStorage.getItem('kanji_setting_input_font_size') as any) || 'md';
        setInputFontSize(saved);
      } catch {}
    };
    window.addEventListener('storage', syncSettings);
    return () => window.removeEventListener('storage', syncSettings);
  }, []);

  const handleChangeFontSize = (newSize: 'sm' | 'md' | 'lg' | 'xl') => {
    setInputFontSize(newSize);
    try {
      localStorage.setItem('kanji_setting_input_font_size', newSize);
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  // Auto convert entire input text to standard Hepburn Romaji with spaces & macrons
  const fullRomajiText = React.useMemo(() => {
    return japaneseToFullRomaji(inputText);
  }, [inputText]);

  // Interleaved line-by-line sentence pairs (Japanese input line -> Romaji line)
  const romajiPairs = React.useMemo(() => {
    return japaneseToRomajiPairs(inputText);
  }, [inputText]);

  // Romaji to Kana/Kanji live typing conversion mode & guide modal
  const [kanaMode, setKanaMode] = useState<KanaMode>('off');
  const [showImeGuideModal, setShowImeGuideModal] = useState<boolean>(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Japanese IME Candidate State
  const [imeState, setImeState] = useState<{
    isOpen: boolean;
    reading: string;
    start: number;
    end: number;
    candidates: ImeCandidate[];
    selectedIndex: number;
    position: { top: number; left: number } | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    reading: '',
    start: 0,
    end: 0,
    candidates: [],
    selectedIndex: 0,
    position: null,
    isLoading: false,
  });

  const commitCandidate = (candidate: ImeCandidate) => {
    const el = textareaRef.current;
    const start = imeState.start;
    const end = imeState.end;
    const newWord = candidate.word;

    const newText = inputText.slice(0, start) + newWord + inputText.slice(end);
    setInputText(newText);
    setImeState((prev) => ({ ...prev, isOpen: false }));

    setTimeout(() => {
      if (el) {
        el.focus();
        const newCaret = start + newWord.length;
        el.setSelectionRange(newCaret, newCaret);
      }
    }, 10);
  };

  const handleTextareaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    // Handle keys when IME popup is active
    if (imeState.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setImeState((prev) => ({ ...prev, isOpen: false }));
        return;
      }

      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Tab') {
        e.preventDefault();
        setImeState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.candidates.length,
        }));
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setImeState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.candidates.length,
        }));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setImeState((prev) => ({
          ...prev,
          selectedIndex:
            (prev.selectedIndex - 1 + prev.candidates.length) % prev.candidates.length,
        }));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = imeState.candidates[imeState.selectedIndex];
        if (selected) {
          commitCandidate(selected);
        }
        return;
      }

      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < imeState.candidates.length) {
          e.preventDefault();
          commitCandidate(imeState.candidates[idx]);
          return;
        }
      }
    }

    // Trigger IME menu when Space or Tab is pressed in 'kanji' or 'hiragana' mode
    if (
      (kanaMode === 'kanji' || kanaMode === 'hiragana') &&
      (e.key === ' ' || e.key === 'Tab') &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      const caretPos = el.selectionStart;
      const comp = getActiveComposition(inputText, caretPos);

      if (comp && comp.raw.trim().length > 0) {
        e.preventDefault();
        const reading = comp.reading;
        const syncCandidates = resolveImeCandidatesSync(reading);

        const pos = {
          top: el.offsetTop + el.offsetHeight + 6,
          left: Math.min(el.offsetLeft + 8, window.innerWidth - 350),
        };

        setImeState({
          isOpen: true,
          reading,
          start: comp.start,
          end: comp.end,
          candidates: syncCandidates,
          selectedIndex: 0,
          position: pos,
          isLoading: true,
        });

        // Background resolve context candidates (API + offline)
        resolveImeCandidates(reading, true).then((fullCandidates) => {
          setImeState((prev) => {
            if (!prev.isOpen || prev.reading !== reading) return prev;
            return {
              ...prev,
              candidates: fullCandidates.length > 0 ? fullCandidates : prev.candidates,
              isLoading: false,
            };
          });
        });
        return;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (kanaMode === 'kanji') {
      // In Kanji mode, keep raw Romaji while typing; convert upon pressing Tab or Space
      setInputText(val);
    } else if (kanaMode === 'hiragana') {
      const converted = romajiToKana(val, 'hiragana', false);
      setInputText(converted);
    } else if (kanaMode === 'katakana') {
      const converted = romajiToKana(val, 'katakana', false);
      setInputText(converted);
    } else {
      setInputText(val);
    }

    if (imeState.isOpen) {
      setImeState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleConvertCurrentText = (targetMode: 'hiragana' | 'katakana') => {
    if (!inputText) return;
    const converted = romajiToKana(inputText, targetMode);
    setInputText(converted);
  };

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
              className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 shrink-0"
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
            className={`inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-xl transition-all shrink-0 ${
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
        <span className="text-slate-400 font-semibold whitespace-nowrap shrink-0">
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
        {/* Romaji typing switcher header */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
            Nhập tiếng Nhật hoặc gõ phiên âm Romaji:
          </span>

          <div className="flex items-center gap-1 text-[11px] bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold px-1 text-[10px] sm:text-[11px]">
              ⌨️ Gõ Romaji:
            </span>
            <button
              type="button"
              onClick={() => setKanaMode('off')}
              className={`px-2 py-0.5 rounded-lg transition-all font-semibold cursor-pointer ${
                kanaMode === 'off'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tắt tự động chuyển Romaji"
            >
              Tắt
            </button>
            <button
              type="button"
              onClick={() => setKanaMode('kanji')}
              className={`px-2.5 py-0.5 rounded-lg transition-all font-semibold cursor-pointer ${
                kanaMode === 'kanji'
                  ? 'bg-teal-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-teal-900'
              }`}
              title="Gõ Romaji -> Hiragana -> bấm Tab/Space để gợi ý và chọn Kanji chuẩn IME Nhật (ví dụ: gõ 'taberu' rồi bấm Tab chọn 食べる)"
            >
              <span>漢 Kanji IME</span>
            </button>
            <button
              type="button"
              onClick={() => setKanaMode('hiragana')}
              className={`px-2 py-0.5 rounded-lg transition-all font-semibold cursor-pointer ${
                kanaMode === 'hiragana'
                  ? 'bg-teal-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-teal-900'
              }`}
              title="Tự động đổi Romaji thành Hiragana khi gõ (ví dụ: gõ 'nihon' ra 'にほん')"
            >
              あ Hiragana
            </button>
            <button
              type="button"
              onClick={() => setKanaMode('katakana')}
              className={`px-2 py-0.5 rounded-lg transition-all font-semibold cursor-pointer ${
                kanaMode === 'katakana'
                  ? 'bg-teal-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-teal-900'
              }`}
              title="Tự động đổi Romaji thành Katakana khi gõ (ví dụ: gõ 'kohi' ra 'コーヒ')"
            >
              ア Katakana
            </button>
            <button
              type="button"
              onClick={() => setShowImeGuideModal(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-200 transition-all cursor-pointer ml-0.5 shrink-0"
              title="Hướng dẫn sử dụng các chế độ gõ Romaji & Kanji IME"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* Direct Font Size Adjustment inside Input Frame */}
            <div className="flex items-center gap-0.5 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80 ml-1 text-[10px] font-bold text-slate-700">
              <span className="px-1 text-[10px] text-slate-500 font-semibold hidden sm:inline">
                Cỡ chữ:
              </span>
              <button
                type="button"
                onClick={() => {
                  const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
                  const curIdx = sizes.indexOf(inputFontSize);
                  const nextSize = sizes[Math.max(0, curIdx - 1)];
                  handleChangeFontSize(nextSize);
                }}
                disabled={inputFontSize === 'sm'}
                className="px-1.5 py-0.2 rounded hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-extrabold"
                title="Giảm cỡ chữ ô nhập liệu & phiên âm (A-)"
              >
                A-
              </button>
              <span className="px-1 text-[10px] text-teal-800 font-black">
                {inputFontSize === 'sm' ? '12px' : inputFontSize === 'lg' ? '16px' : inputFontSize === 'xl' ? '18px' : '14px'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
                  const curIdx = sizes.indexOf(inputFontSize);
                  const nextSize = sizes[Math.min(sizes.length - 1, curIdx + 1)];
                  handleChangeFontSize(nextSize);
                }}
                disabled={inputFontSize === 'xl'}
                className="px-1.5 py-0.2 rounded hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-extrabold"
                title="Tăng cỡ chữ ô nhập liệu & phiên âm (A+)"
              >
                A+
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={
              kanaMode === 'kanji'
                ? "Đang bật bộ gõ Kanji IME... Hãy gõ Romaji (ví dụ: nihon, taberu, gakusei) rồi bấm phím [Space] hoặc [Tab] để chọn Kanji!"
                : kanaMode !== 'off'
                ? `Đang bật chế độ gõ Romaji -> ${kanaMode === 'hiragana' ? 'Hiragana (あ)' : 'Katakana (ア)'}... Hãy gõ: konnichiwa, tokyo, nihon...`
                : "Dán đoạn văn tiếng Nhật bất kỳ vào đây... (Ví dụ: 日本語能力試験、漢字の書き順、練習、温故知新)"
            }
            rows={3}
            className={`w-full px-3.5 sm:px-4 py-3 text-slate-800 placeholder-slate-400 bg-slate-50/70 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-sans resize-y leading-relaxed shadow-inner min-h-[90px] sm:min-h-[105px] ${
              inputFontSize === 'sm'
                ? 'text-xs'
                : inputFontSize === 'lg'
                ? 'text-base'
                : inputFontSize === 'xl'
                ? 'text-lg'
                : 'text-sm'
            }`}
          />

          {/* Floating IME Candidate Popover */}
          {imeState.isOpen && (
            <ImeCandidatePopover
              candidates={imeState.candidates}
              selectedIndex={imeState.selectedIndex}
              onSelectCandidate={commitCandidate}
              onClose={() => setImeState((prev) => ({ ...prev, isOpen: false }))}
              reading={imeState.reading}
              position={imeState.position}
              isLoading={imeState.isLoading}
            />
          )}
        </div>

        {/* Romaji detected quick-convert banner */}
        {hasRomaji(inputText) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 animate-in fade-in duration-150">
            <span className="font-medium text-[11px] sm:text-xs">
              Phát hiện chữ Latinh/Romaji trong đoạn văn:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleConvertCurrentText('hiragana')}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 shadow-2xs cursor-pointer active:scale-95 text-[11px] transition-all"
                title="Chuyển toàn bộ các từ Romaji tiếng Nhật thành chữ mềm Hiragana"
              >
                Đổi sang Hiragana (あ)
              </button>
              <button
                type="button"
                onClick={() => handleConvertCurrentText('katakana')}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 shadow-2xs cursor-pointer active:scale-95 text-[11px] transition-all"
                title="Chuyển toàn bộ các từ Romaji tiếng Nhật thành chữ cứng Katakana"
              >
                Đổi sang Katakana (ア)
              </button>
            </div>
          </div>
        )}

        {/* Translation Trigger Bar & Engine Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Action Toggle Button: Romaji toàn văn BẬT/TẮT */}
            <button
              type="button"
              onClick={() => setShowFullRomajiCard(!showFullRomajiCard)}
              disabled={!inputText.trim()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 min-h-[34px] sm:min-h-[36px] ${
                showFullRomajiCard && fullRomajiText
                  ? 'bg-indigo-50 text-indigo-950 border-2 border-indigo-600 ring-1 ring-indigo-500/20 shadow-xs'
                  : inputText.trim()
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title="Bật/Tắt hiển thị khung phiên âm Romaji toàn bộ đoạn văn"
            >
              <Languages className={`w-3.5 h-3.5 ${showFullRomajiCard && fullRomajiText ? 'text-indigo-700' : 'text-slate-500'}`} />
              <span>Romaji toàn văn</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black tracking-tight ${
                  showFullRomajiCard && fullRomajiText
                    ? 'bg-indigo-700 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {showFullRomajiCard && fullRomajiText ? 'BẬT' : 'TẮT'}
              </span>
            </button>

            {/* Action Toggle Button: Dịch câu BẬT/TẮT */}
            <button
              type="button"
              onClick={() => {
                if (isTranslating) return;
                if (!sentenceTranslation) {
                  handleTranslateSentence();
                } else {
                  setShowTranslationCard(!showTranslationCard);
                }
              }}
              disabled={!inputText.trim() || isTranslating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 min-h-[34px] sm:min-h-[36px] ${
                showTranslationCard && sentenceTranslation
                  ? 'bg-teal-50 text-teal-950 border-2 border-teal-600 ring-1 ring-teal-500/20 shadow-xs'
                  : inputText.trim()
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                inputText.trim()
                  ? `Bật/Tắt hiển thị bản dịch toàn câu tiếng Việt (${engine === 'google' ? 'Google Dịch' : 'Gemini AI'})`
                  : 'Nhập văn bản trước khi dịch'
              }
            >
              <Languages className={`w-3.5 h-3.5 ${showTranslationCard && sentenceTranslation ? 'text-teal-700' : 'text-slate-500'}`} />
              <span>Dịch câu</span>
              {isTranslating ? (
                <span className="w-3 h-3 border-2 border-teal-700 border-t-transparent rounded-full animate-spin ml-0.5" />
              ) : (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black tracking-tight ${
                    showTranslationCard && sentenceTranslation
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {showTranslationCard && sentenceTranslation ? 'BẬT' : 'TẮT'}
                </span>
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

      {/* FULL ROMAJI TRANSLITERATION CARD (PHIÊN ÂM ROMAJI XEN KẼ TỪNG DÒNG) */}
      {inputText.trim() && showFullRomajiCard && romajiPairs.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-50/80 via-slate-50 to-teal-50/30 rounded-2xl border-2 border-indigo-200/90 shadow-2xs space-y-3 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs border-b border-indigo-100 pb-2 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
              <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                <Languages className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Phiên âm Romaji xen kẽ từng dòng (Chuẩn Hepburn):</span>
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const fullJoined = romajiPairs.map((p) => p.romaji).join(' ');
                    await navigator.clipboard.writeText(fullJoined);
                    setCopiedFullRomaji(true);
                    setTimeout(() => setCopiedFullRomaji(false), 1800);
                  } catch {}
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Sao chép toàn bộ phiên âm Romaji"
              >
                {copiedFullRomaji ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-indigo-600" />
                    <span>Sao chép Romaji</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowFullRomajiCard(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Tạm ẩn khung phiên âm Romaji"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interleaved sentence-by-sentence / line-by-line pairs */}
          <div className="space-y-2">
            {romajiPairs.map((pair, idx) => (
              <div
                key={idx}
                className="p-2.5 sm:p-3 bg-white/90 rounded-xl border border-indigo-200/80 shadow-2xs space-y-1 hover:border-indigo-400 transition-all"
              >
                {/* Line 1: Japanese input with Kanji */}
                <div
                  className={`font-bold text-slate-900 flex items-center gap-2 font-kanji ${
                    inputFontSize === 'sm'
                      ? 'text-xs'
                      : inputFontSize === 'lg'
                      ? 'text-base'
                      : inputFontSize === 'xl'
                      ? 'text-lg'
                      : 'text-sm'
                  }`}
                >
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-200 font-sans shrink-0">
                    JP
                  </span>
                  <span>{pair.japanese}</span>
                </div>

                {/* Line 2: Romaji transliteration - Moderate size, font-medium, crisp & clean */}
                <div
                  className={`font-mono font-medium text-indigo-900 flex items-center gap-2 pl-0.5 ${
                    inputFontSize === 'sm'
                      ? 'text-[11px]'
                      : inputFontSize === 'lg'
                      ? 'text-[15px]'
                      : inputFontSize === 'xl'
                      ? 'text-[17px]'
                      : 'text-[13px]'
                  }`}
                >
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100/90 text-indigo-900 border border-indigo-200 font-sans shrink-0">
                    ROMAJI
                  </span>
                  <span className="tracking-normal select-text leading-snug">{pair.romaji}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* INTERACTIVE GLOSSED READER BOX (Hiragana trên đầu & Nghĩa tiếng Việt / Romaji bên dưới) */}
      {(showFurigana || showMeaning || showRomaji) && inputText.trim() && kanjiList.length > 0 && (
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
            className={`grid gap-3 select-text font-sans transition-all ${
              readerColumns === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : readerColumns === 3
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
            }`}
          >
            {(() => {
              // Split text into readable sentence / line blocks for multi-column layout
              const getReaderBlocks = (text: string): string[] => {
                if (!text.trim()) return [];
                const rawLines = text.split('\n').filter((l) => l.trim().length > 0);
                const blocks: string[] = [];

                for (const line of rawLines) {
                  if (/[。！？]/.test(line)) {
                    const sentences = line.split(/(?<=[。！？])/g).filter((s) => s.trim().length > 0);
                    blocks.push(...sentences);
                  } else if (line.length > 30 && /[、,：:]/.test(line)) {
                    const clauses = line.split(/(?<=[、,：:])\s*/g).filter((c) => c.trim().length > 0);
                    blocks.push(...clauses);
                  } else {
                    blocks.push(line);
                  }
                }

                return blocks.length > 0 ? blocks : [text];
              };

              const blocks = getReaderBlocks(inputText);

              return blocks.map((blockText, blockIdx) => {
                // Group consecutive non-kanji characters into continuous text tokens per block
                const tokens: Array<{ type: 'kanji' | 'text'; content: string }> = [];
                let currentText = '';

                for (const char of blockText) {
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
                    key={blockIdx}
                    className="bg-white/80 rounded-xl border border-teal-200/80 p-3 shadow-2xs flex flex-wrap items-end gap-1 leading-loose w-full align-top"
                  >
                    {tokens.map((token, tokenIdx) => {
                      if (token.type === 'kanji') {
                        const char = token.content;
                        const item = kanjiMap.get(char);
                        const hira = getPrimaryHiragana(item?.detail);
                        const hanViet = item?.detail?.hanViet;
                        const meaning = item?.detail?.meanings?.[0];
                        const meaningDisplay = meaning || hanViet || '';
                        const romaji = hira ? kanaToRomaji(hira) : '';

                        return (
                          <div
                            key={tokenIdx}
                            onClick={() => onSelectKanji && onSelectKanji(char)}
                            className="inline-flex flex-col items-center mx-0.5 my-0.5 px-2 py-1 rounded-xl hover:bg-teal-100 cursor-pointer transition-all group align-bottom bg-white border border-teal-200/90 shadow-2xs hover:border-teal-500 hover:shadow-xs active:scale-95 shrink-0"
                            title={`Kanji: ${char}${hira ? ` | Hiragana: ${hira}` : ''}${romaji ? ` | Romaji: ${romaji}` : ''}${hanViet ? ` | Hán-Việt: ${hanViet}` : ''}${item?.detail?.meanings?.length ? ` | Nghĩa: ${item.detail.meanings.join(', ')}` : ''} (Nhấp để tra cứu)`}
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

                            {/* 3. Phiên âm Romaji Hepburn phân tách từ (khi showRomaji BẬT) */}
                            {showRomaji && romaji && (
                              <span className="text-[10px] font-mono font-bold text-indigo-900 bg-indigo-50/90 border border-indigo-200 px-1.5 py-0.2 rounded-md leading-tight mt-1 select-none text-center group-hover:bg-indigo-100 shrink-0">
                                {romaji}
                              </span>
                            )}

                            {/* 4. Dịch nghĩa tiếng Việt bên dưới chữ Kanji (khi showMeaning BẬT) */}
                            {showMeaning && meaningDisplay && (
                              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md leading-tight mt-1 max-w-[80px] sm:max-w-[100px] truncate select-none text-center font-sans group-hover:bg-emerald-100">
                                {meaningDisplay}
                              </span>
                            )}
                          </div>
                        );
                      }

                      // Non-kanji text run (Hiragana, Katakana, Latin words, punctuation, spaces)
                      if (showRomaji && /[\u3040-\u30ff]/.test(token.content)) {
                        const tokenRomaji = kanaToRomaji(token.content);
                        return (
                          <div
                            key={tokenIdx}
                            className="inline-flex flex-col items-center mx-0.5 my-0.5 px-1.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 align-bottom shrink-0 select-text"
                          >
                            <span className="text-xs sm:text-sm font-medium text-slate-800 leading-none px-0.5 font-sans">
                              {token.content}
                            </span>
                            {tokenRomaji && (
                              <span className="text-[10px] font-mono font-bold text-indigo-800 leading-none mt-1 select-none">
                                {tokenRomaji}
                              </span>
                            )}
                          </div>
                        );
                      }

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

          {/* Toggle 2: Phiên âm Romaji cách từ */}
          <button
            type="button"
            onClick={() => setShowRomaji(!showRomaji)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs active:scale-95 text-[11px] sm:text-xs min-h-[32px] sm:min-h-[36px] ${
              showRomaji
                ? 'bg-indigo-50 text-indigo-950 border-2 border-indigo-600 ring-1 ring-indigo-500/20 shadow-xs'
                : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
            }`}
            title="Nhấp để Bật/Tắt hiển thị phiên âm Romaji Hepburn phân tách từ bên dưới mỗi từ"
          >
            <Languages className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${showRomaji ? 'text-indigo-700' : 'text-slate-400'}`} />
            <span>Romaji</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black tracking-tight ${
                showRomaji
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {showRomaji ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          {/* Toggle 3: Nghĩa tiếng Việt bên dưới */}
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
              className="flex-1 md:flex-none h-9 inline-flex items-center justify-center gap-1.5 px-3 text-teal-800 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 rounded-xl transition-all font-semibold cursor-pointer border border-teal-200 shadow-2xs text-xs active:scale-95"
              title="Sao chép toàn bộ các chữ Kanji lọc được dưới dạng văn bản"
            >
              <Copy className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Chép chuỗi Kanji</span>
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="flex-1 md:flex-none h-9 inline-flex items-center justify-center gap-1.5 px-3 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:border-slate-300 rounded-xl transition-all font-semibold cursor-pointer border border-slate-200 shadow-2xs text-xs active:scale-95"
              title="Xuất danh sách gồm URL ảnh, Hán-Việt & nghĩa sang định dạng CSV để nhập vào Anki"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Xuất CSV (Anki)</span>
            </button>
          </div>
        )}
      </div>

      {/* IME Typing Guide Modal */}
      {showImeGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header with website signature theme gradient */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-700/60 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-inner">
                  <HelpCircle className="w-5 h-5 text-teal-200" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    Hướng Dẫn Bàn Phím & Bộ Gõ IME
                  </h3>
                  <p className="text-xs text-teal-100/80">
                    Tra cứu & gõ tiếng Nhật tiện lợi trực tiếp trên Web App
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImeGuideModal(false)}
                className="text-teal-200 hover:text-white p-1 rounded-xl hover:bg-teal-700/60 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs sm:text-sm text-slate-700">
              {/* Option 1: Off */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono font-bold">1</span>
                  <span>Tắt (Nhập văn bản thường)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs pl-7">
                  Dán hoặc nhập đoạn văn tiếng Nhật / Việt / Anh bình thường không qua bộ chuyển đổi.
                </p>
              </div>

              {/* Option 2: Kanji IME */}
              <div className="p-3.5 bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-white rounded-xl border border-teal-200/90 shadow-2xs space-y-2">
                <div className="font-bold text-teal-950 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-teal-700 text-white flex items-center justify-center text-[10px] font-mono font-bold">2</span>
                  <span>漢 Kanji IME (Gõ Romaji → Kanji)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 pl-7 list-disc">
                  <li>Gõ phiên âm Romaji tự nhiên (ví dụ: <code className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-teal-900 font-bold">hana</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-teal-900 font-bold">nihon</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-teal-900 font-bold">gakusei</code>).</li>
                  <li>Nhấn phím <strong>Tab</strong> (hoặc <strong>Space</strong>) để mở menu gợi ý Kanji chuẩn IME Nhật Bản.</li>
                  <li>Nhấn phím số <strong>1 - 9</strong> hoặc phím <strong>Enter</strong> để chèn Kanji vào văn bản. Bấm <strong>Esc</strong> để hủy.</li>
                </ul>
              </div>

              {/* Option 3: Hiragana & Katakana */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono font-bold">3</span>
                  <span>あ Hiragana & ア Katakana</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-xs pl-7">
                  Tự động chuyển trực tiếp ký tự Latinh thành chữ mềm (Hiragana) hoặc chữ cứng (Katakana) ngay khi gõ (ví dụ: <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono">kohi</code> → <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono">コーヒ</code>).
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowImeGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
