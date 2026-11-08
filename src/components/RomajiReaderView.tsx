import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Languages,
  Copy,
  Check,
  Volume2,
  Trash2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useKanji } from '../context/KanjiContext';
import { japaneseToFullRomaji, japaneseToRomajiPairs } from '../utils/romajiConverter';
import { speakJapanese } from '../utils/speech';
import { useNavigate } from 'react-router-dom';

export const RomajiReaderView: React.FC = () => {
  const { inputText, setInputText } = useKanji();
  const navigate = useNavigate();

  const [copied, setCopied] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  const romajiPairs = useMemo(() => {
    return japaneseToRomajiPairs(inputText);
  }, [inputText]);

  const fullRomajiText = useMemo(() => {
    return japaneseToFullRomaji(inputText);
  }, [inputText]);

  const handleCopyRomaji = async () => {
    if (!fullRomajiText) return;
    try {
      await navigator.clipboard.writeText(fullRomajiText);
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
              <Languages className="w-5 h-5 text-indigo-600" />
              <span>Phiên âm Romaji chuẩn Hepburn</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Đọc đoạn văn tiếng Nhật xen kẽ dòng phiên âm Latinh chuẩn Hepburn, phân tách từ ngữ trực quan.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Font size toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  fontSize === 'sm' ? 'bg-white text-indigo-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Nhỏ
              </button>
              <button
                type="button"
                onClick={() => setFontSize('md')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  fontSize === 'md' ? 'bg-white text-indigo-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Vừa
              </button>
              <button
                type="button"
                onClick={() => setFontSize('lg')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  fontSize === 'lg' ? 'bg-white text-indigo-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Lớn
              </button>
            </div>

            {fullRomajiText && (
              <button
                type="button"
                onClick={handleCopyRomaji}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép Romaji'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Input Text Box */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span>Đoạn văn tiếng Nhật cần đọc:</span>
          </div>
          <div className="flex items-center gap-2">
            {inputText.trim() && (
              <button
                type="button"
                onClick={() => speakJapanese(inputText)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Phát âm</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setInputText('')}
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
          placeholder="Dán hoặc nhập đoạn văn tiếng Nhật vào đây để hiển thị phiên âm Romaji..."
          rows={3}
          className="w-full p-3.5 bg-slate-50/70 focus:bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-kanji text-slate-800 resize-y leading-relaxed"
        />
      </div>

      {/* Interleaved Display Pairs */}
      {inputText.trim() ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs text-slate-500">
            <span className="font-bold text-slate-700">
              Kết quả đọc xen dòng ({romajiPairs.length} câu / dòng):
            </span>
            <span>Chuẩn phiên âm Hepburn</span>
          </div>

          <div className="space-y-3">
            {romajiPairs.map((pair, idx) => (
              <div
                key={idx}
                className="p-3.5 sm:p-4 bg-gradient-to-r from-indigo-50/40 via-white to-teal-50/30 rounded-2xl border border-indigo-100/90 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-all"
              >
                {/* Japanese Sentence */}
                <div
                  className={`font-kanji font-bold text-slate-900 flex items-start gap-2.5 ${
                    fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'
                  }`}
                >
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-200 font-sans shrink-0 mt-0.5">
                    JP
                  </span>
                  <span className="select-text leading-relaxed">{pair.japanese}</span>
                </div>

                {/* Romaji Hepburn Line */}
                <div
                  className={`font-mono font-medium text-indigo-900 flex items-start gap-2.5 pl-0.5 ${
                    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'
                  }`}
                >
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 font-sans shrink-0 mt-0.5">
                    ROMAJI
                  </span>
                  <span className="select-text leading-relaxed">{pair.romaji}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-xl">
            あA
          </div>
          <h3 className="font-bold text-slate-700 text-base">Chưa có văn bản tiếng Nhật</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hãy nhập câu văn vào ô trên hoặc bấm vào nút bên dưới để chuyển sang ô nhập chính.
          </p>
          <button
            type="button"
            onClick={() => navigate('/input')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            <span>Đến trang Nhập văn bản</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
