import React, { useState, useCallback } from 'react';
import {
  ArrowRightLeft,
  Undo2,
  Redo2,
  Copy,
  Check,
  Trash2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Volume2
} from 'lucide-react';
import { romajiToKana, kanaToRomaji, hasRomaji } from '../utils/romajiConverter';
import { speakJapanese } from '../utils/speech';
import { useKanji } from '../context/KanjiContext';
import { useNavigate } from 'react-router-dom';

interface ConversionHistoryEntry {
  input: string;
  output: string;
  action: string;
}

export const RomajiConverterView: React.FC = () => {
  const { setInputText } = useKanji();
  const navigate = useNavigate();

  const [inputText, setLocalInputText] = useState<string>('konnichiwa, watashi wa gakusei desu. arigatou gozaimasu!');
  const [outputText, setOutputText] = useState<string>(() => romajiToKana('konnichiwa, watashi wa gakusei desu. arigatou gozaimasu!', 'hiragana'));
  const [copied, setCopied] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);

  // Undo / Redo stacks
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([
    {
      input: 'konnichiwa, watashi wa gakusei desu. arigatou gozaimasu!',
      output: romajiToKana('konnichiwa, watashi wa gakusei desu. arigatou gozaimasu!', 'hiragana'),
      action: 'Khởi tạo',
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushState = (newInput: string, newOutput: string, actionName: string) => {
    const trimmed = history.slice(0, historyIndex + 1);
    const newEntry = { input: newInput, output: newOutput, action: actionName };
    setHistory([...trimmed, newEntry]);
    setHistoryIndex(trimmed.length);
  };

  const handleConvertToHiragana = () => {
    if (!inputText.trim()) return;
    const res = romajiToKana(inputText, 'hiragana');
    setOutputText(res);
    pushState(inputText, res, 'Đổi sang Hiragana (あ)');
  };

  const handleConvertToKatakana = () => {
    if (!inputText.trim()) return;
    const res = romajiToKana(inputText, 'katakana');
    setOutputText(res);
    pushState(inputText, res, 'Đổi sang Katakana (ア)');
  };

  const handleConvertToRomaji = () => {
    if (!outputText.trim()) return;
    const res = kanaToRomaji(outputText);
    setLocalInputText(res);
    pushState(res, outputText, 'Đổi Kana sang Romaji');
  };

  const handleSwap = () => {
    const tempInput = inputText;
    const tempOutput = outputText;
    setLocalInputText(tempOutput);
    setOutputText(tempInput);
    pushState(tempOutput, tempInput, 'Hoán đổi 2 chiều');
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setLocalInputText(prev.input);
      setOutputText(prev.output);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setLocalInputText(next.input);
      setOutputText(next.output);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  const handleClear = () => {
    setLocalInputText('');
    setOutputText('');
    pushState('', '', 'Xóa trắng');
  };

  const handleCopyOutput = async () => {
    if (!outputText.trim()) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const handleApplyToMain = () => {
    if (!outputText.trim()) return;
    setInputText(outputText);
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      navigate('/input');
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-teal-600" />
              <span>Chuyển đổi Romaji sang Hiragana &amp; Katakana</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Chuyển đổi chữ Latinh/Romaji sang chữ Nhật mềm (Hiragana) hoặc cứng (Katakana) có hỗ trợ Hoàn tác (Undo/Redo).
            </p>
          </div>

          {/* Undo / Redo controls */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 hover:text-slate-900 hover:bg-white disabled:hover:bg-transparent"
              title="Hoàn tác thao tác trước (Undo)"
            >
              <Undo2 className="w-4 h-4 text-teal-700" />
              <span>Hoàn tác</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 hover:text-slate-900 hover:bg-white disabled:hover:bg-transparent"
              title="Làm lại thao tác vừa hoàn tác (Redo)"
            >
              <Redo2 className="w-4 h-4 text-teal-700" />
              <span>Làm lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* Converter Dual Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Pane: Input */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              <span>Văn bản Romaji / Latinh (Input):</span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={!inputText}
              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-1 rounded-lg"
              title="Xóa trắng"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => {
              setLocalInputText(e.target.value);
            }}
            placeholder="Gõ hoặc dán chữ Romaji vào đây... Ví dụ: watashi wa nihonjin desu..."
            rows={7}
            className="w-full p-3.5 bg-slate-50/70 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 text-sm font-mono text-slate-800 resize-y leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>{inputText.length} ký tự</span>
            {hasRomaji(inputText) && (
              <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Phát hiện Romaji
              </span>
            )}
          </div>
        </div>

        {/* Right Pane: Output */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Kết quả chuyển đổi Kana (Output):</span>
            </div>

            <div className="flex items-center gap-1.5">
              {outputText.trim() && (
                <button
                  type="button"
                  onClick={() => speakJapanese(outputText)}
                  className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!outputText.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer shadow-2xs disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={outputText}
            onChange={(e) => setOutputText(e.target.value)}
            placeholder="Kết quả Hiragana hoặc Katakana sẽ hiển thị ở đây..."
            rows={7}
            className="w-full p-3.5 bg-emerald-50/20 focus:bg-white rounded-2xl border border-emerald-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-kanji text-slate-900 resize-y leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>{outputText.length} ký tự</span>
            {outputText.trim() && (
              <button
                type="button"
                onClick={handleApplyToMain}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-200 cursor-pointer shadow-2xs"
                title="Dán đoạn văn này sang trang Nhập văn bản chính"
              >
                <span>{applied ? '✓ Đã đưa sang Nhập văn bản' : 'Đưa sang Nhập văn bản'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Conversion Action Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleConvertToHiragana}
          disabled={!inputText.trim()}
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl border border-teal-800 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>Đổi sang Hiragana (あ)</span>
        </button>

        <button
          type="button"
          onClick={handleConvertToKatakana}
          disabled={!inputText.trim()}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl border border-emerald-800 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>Đổi sang Katakana (ア)</span>
        </button>

        <button
          type="button"
          onClick={handleSwap}
          disabled={!inputText.trim() && !outputText.trim()}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          title="Hoán đổi nội dung giữa 2 ô"
        >
          <ArrowRightLeft className="w-4 h-4 text-slate-600" />
          <span>Hoán đổi 2 ô</span>
        </button>

        <button
          type="button"
          onClick={handleConvertToRomaji}
          disabled={!outputText.trim()}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          title="Đổi chữ Kana ngược lại thành Romaji"
        >
          <span>Đổi Kana sang Romaji</span>
        </button>
      </div>

      {/* Guide Note Box */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <BookOpen className="w-4 h-4 text-teal-700" />
          <span>Quy tắc gõ Romaji cơ bản:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-600">
          <div>• Âm ngắt sokuon (っ): Gõ gấp đôi phụ âm (ví dụ: <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-teal-900 font-mono">gakkou</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-teal-900 font-mono">matte</code>)</div>
          <div>• Âm ghép yoon: <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-teal-900 font-mono">kya, kyu, kyo, sha, chu, sho...</code></div>
          <div>• Chữ "ん" (n): Gõ <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-teal-900 font-mono">nn</code> hoặc <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-teal-900 font-mono">n'</code> khi đứng trước nguyên âm.</div>
        </div>
      </div>
    </div>
  );
};
