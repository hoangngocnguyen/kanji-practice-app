import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  FileText,
  Upload,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useKanji } from '../context/KanjiContext';
import { romajiToKana, KanaMode } from '../utils/romajiConverter';
import {
  ImeCandidate,
  resolveImeCandidates,
  resolveImeCandidatesSync,
  getActiveComposition,
} from '../utils/kanjiImeEngine';
import { ImeCandidatePopover } from './ImeCandidatePopover';
import { useNavigate } from 'react-router-dom';

export const InputSection: React.FC = () => {
  const {
    inputText,
    setInputText,
    extractedKanjiList,
    setIsScannerOpen
  } = useKanji();

  const navigate = useNavigate();

  // Font Size state
  const [inputFontSize, setInputFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    try {
      return (localStorage.getItem('kanji_setting_input_font_size') as any) || 'md';
    } catch {
      return 'md';
    }
  });

  const handleChangeFontSize = (newSize: 'sm' | 'md' | 'lg' | 'xl') => {
    setInputFontSize(newSize);
    try {
      localStorage.setItem('kanji_setting_input_font_size', newSize);
    } catch {}
  };

  // Image file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);

  const processImageFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsProcessingImage(true);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(['jpn', 'eng'], 1);
      const ret = await worker.recognize(file);
      await worker.terminate();
      const rawText = ret.data ? ret.data.text : '';
      const kanjiMatches = rawText.match(/[\u4e00-\u9faf]/g) || [];
      const uniqueKanji = Array.from(new Set(kanjiMatches)).join('');

      if (uniqueKanji) {
        setInputText((prev) => (prev ? `${prev} ${uniqueKanji}` : uniqueKanji));
      } else {
        setIsScannerOpen(true);
      }
    } catch (err) {
      setIsScannerOpen(true);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          processImageFile(blob);
          break;
        }
      }
    }
  };

  // Romaji / IME typing state
  const [kanaMode, setKanaMode] = useState<KanaMode>('off');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <section id="input-section" className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/70 shrink-0">
            <FileText className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              Nhập văn bản tiếng Nhật
            </h2>
            <p className="text-xs text-slate-500">
              Nhập từ vựng, dán đoạn văn hoặc dán ảnh chụp màn hình (Ctrl+V) để tra cứu
            </p>
          </div>
        </div>

        {/* Action buttons: Upload image & Clear */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processImageFile(file);
                e.target.value = '';
              }
            }}
          />

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            disabled={isProcessingImage}
            className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 border border-teal-800 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 shrink-0"
            title="Quét chữ Kanji từ ảnh hoặc dán ảnh chụp màn hình (OCR)"
          >
            {isProcessingImage ? (
              <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-white" />
            )}
            <span>{isProcessingImage ? 'Đang đọc...' : 'Quét ảnh / Dán ảnh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setInputText('')}
            disabled={!inputText}
            className={`inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-xl transition-all shrink-0 ${
              inputText
                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer shadow-2xs active:scale-95'
                : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-50'
            }`}
            title="Xóa trắng nội dung"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa trắng</span>
          </button>
        </div>
      </div>

      {/* Editor Controls Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            Nội dung văn bản:
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-100/90 rounded-xl border border-slate-200 shrink-0">
            <span className="text-slate-500 font-normal px-1 text-[11px] hidden sm:inline">
              Bộ gõ:
            </span>
            <button
              type="button"
              onClick={() => setKanaMode('off')}
              className={`px-2 py-0.5 rounded-lg transition-all text-xs cursor-pointer ${
                kanaMode === 'off' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tắt
            </button>
            <button
              type="button"
              onClick={() => setKanaMode('kanji')}
              className={`px-2 py-0.5 rounded-lg transition-all text-xs cursor-pointer ${
                kanaMode === 'kanji' ? 'bg-teal-700 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-teal-900'
              }`}
              title="Gõ Romaji -> bấm Space hoặc Tab để chọn Kanji"
            >
              漢 Kanji IME
            </button>
            <button
              type="button"
              onClick={() => setKanaMode('hiragana')}
              className={`px-2 py-0.5 rounded-lg transition-all text-xs cursor-pointer ${
                kanaMode === 'hiragana' ? 'bg-teal-700 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-teal-900'
              }`}
            >
              あ Hiragana
            </button>
            <button
              type="button"
              onClick={() => setKanaMode('katakana')}
              className={`px-2 py-0.5 rounded-lg transition-all text-xs cursor-pointer ${
                kanaMode === 'katakana' ? 'bg-teal-700 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-teal-900'
              }`}
            >
              ア Katakana
            </button>

            {/* Font size stepper */}
            <div className="flex items-center gap-0.5 bg-slate-200/80 px-1 py-0.5 rounded-lg border border-slate-300/80 text-[10px] font-bold text-slate-700 ml-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
                  const curIdx = sizes.indexOf(inputFontSize);
                  handleChangeFontSize(sizes[Math.max(0, curIdx - 1)]);
                }}
                disabled={inputFontSize === 'sm'}
                className="px-1 text-slate-700 disabled:opacity-30 cursor-pointer font-extrabold"
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <span className="px-0.5 text-[10px] text-teal-800 font-black">
                {inputFontSize === 'sm' ? '12px' : inputFontSize === 'lg' ? '16px' : inputFontSize === 'xl' ? '18px' : '14px'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
                  const curIdx = sizes.indexOf(inputFontSize);
                  handleChangeFontSize(sizes[Math.min(sizes.length - 1, curIdx + 1)]);
                }}
                disabled={inputFontSize === 'xl'}
                className="px-1 text-slate-700 disabled:opacity-30 cursor-pointer font-extrabold"
                title="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleTextareaKeyDown}
            onPaste={handlePasteImage}
            placeholder={
              kanaMode === 'kanji'
                ? "Gõ Romaji (nihon, gakusei, taberu...) rồi bấm [Space] hoặc [Tab] để chọn chữ Kanji!"
                : "Dán đoạn văn tiếng Nhật hoặc bấm Ctrl+V để dán ảnh chụp màn hình vào đây..."
            }
            rows={5}
            className={`w-full p-4 text-slate-800 placeholder-slate-400 bg-slate-50/70 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-sans resize-y leading-relaxed shadow-inner min-h-[120px] ${
              inputFontSize === 'sm'
                ? 'text-xs'
                : inputFontSize === 'lg'
                ? 'text-base'
                : inputFontSize === 'xl'
                ? 'text-lg'
                : 'text-sm'
            }`}
          />

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

        {/* Footer Statistics & Navigation to features */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{inputText.length} ký tự</span>
            <span>·</span>
            <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {extractedKanjiList.length} chữ Kanji
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/romaji')}
              disabled={!inputText.trim()}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Xem Romaji</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/translate')}
              disabled={!inputText.trim()}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Dịch nghĩa</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/kanji')}
              disabled={extractedKanjiList.length === 0}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1.5"
            >
              <span>Chi tiết nét vẽ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
