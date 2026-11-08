import React, { useState, useEffect } from 'react';
import {
  Languages,
  Sparkles,
  Copy,
  Check,
  Volume2,
  RefreshCw,
  Trash2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useKanji } from '../context/KanjiContext';
import { translateWithDetails, TranslationEngine } from '../utils/translation';
import { speakJapanese } from '../utils/speech';
import { useNavigate } from 'react-router-dom';

export const TranslationView: React.FC = () => {
  const { inputText, setInputText } = useKanji();
  const navigate = useNavigate();

  const [engine, setEngine] = useState<TranslationEngine>('google');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('Google Dịch');
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async (overrideEngine?: TranslationEngine) => {
    if (!inputText.trim()) return;
    const targetEngine = overrideEngine || engine;
    setIsTranslating(true);
    setError(null);
    try {
      const res = await translateWithDetails(inputText, targetEngine);
      setTranslatedText(res.text);
      setSourceName(res.source);
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối máy chủ dịch thuật');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (inputText.trim() && !translatedText && !isTranslating) {
      handleTranslate();
    }
  }, [inputText]);

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Languages className="w-5 h-5 text-teal-700" />
              <span>Dịch câu song ngữ Nhật - Việt</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Dịch thuật tự động nhanh chóng và chuẩn xác sử dụng Google Dịch &amp; Gemini AI.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Translation Engine Picker */}
            <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold items-center">
              <button
                type="button"
                onClick={() => {
                  setEngine('google');
                  if (inputText.trim()) handleTranslate('google');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  engine === 'google'
                    ? 'bg-teal-700 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Dịch
              </button>
              <button
                type="button"
                onClick={() => {
                  setEngine('gemini');
                  if (inputText.trim()) handleTranslate('gemini');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  engine === 'gemini'
                    ? 'bg-indigo-700 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gemini AI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input / Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Japanese Source */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              <span>Câu tiếng Nhật (Source):</span>
            </div>
            <div className="flex items-center gap-2">
              {inputText.trim() && (
                <button
                  type="button"
                  onClick={() => speakJapanese(inputText)}
                  className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Phát âm tiếng Nhật"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  setTranslatedText('');
                }}
                disabled={!inputText}
                className="text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer p-1 rounded-lg"
                title="Xóa trắng"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập hoặc dán câu tiếng Nhật vào đây để dịch nghĩa..."
            rows={6}
            className="w-full p-3.5 bg-slate-50/70 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 text-sm font-kanji text-slate-800 resize-y leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>{inputText.length} ký tự</span>
            <button
              type="button"
              onClick={() => handleTranslate()}
              disabled={!inputText.trim() || isTranslating}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 text-white font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              {isTranslating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Languages className="w-3.5 h-3.5" />
              )}
              <span>{isTranslating ? 'Đang dịch...' : 'Dịch ngay'}</span>
            </button>
          </div>
        </div>

        {/* Vietnamese Target */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Bản dịch Tiếng Việt:</span>
              {sourceName && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {sourceName}
                </span>
              )}
            </div>

            {translatedText && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            )}
          </div>

          {isTranslating ? (
            <div className="flex items-center justify-center py-16 text-xs text-teal-800 font-medium gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
              <span>Đang dịch câu song ngữ bằng {engine === 'google' ? 'Google Dịch' : 'Gemini AI'}...</span>
            </div>
          ) : translatedText ? (
            <div className="p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-100 text-sm sm:text-base font-semibold text-slate-800 leading-relaxed min-h-[140px] select-text">
              "{translatedText}"
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-xs text-slate-400">
              Chưa có bản dịch. Hãy bấm "Dịch ngay" để dịch nội dung.
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>{translatedText ? `${translatedText.length} ký tự` : ''}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
