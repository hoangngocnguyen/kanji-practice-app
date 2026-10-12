import React from 'react';
import { Trash2, Sparkles, Copy, Download, FileText, ArrowDownRight } from 'lucide-react';
import { SAMPLE_PRESETS } from '../utils/kanji';
import { KanjiItem } from '../types/kanji';

interface InputSectionProps {
  inputText: string;
  setInputText: (val: string) => void;
  kanjiList: KanjiItem[];
  onClear: () => void;
  onCopyAllText: () => void;
  onExportCsv: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  inputText,
  setInputText,
  kanjiList,
  onClear,
  onCopyAllText,
  onExportCsv,
}) => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 transition-all">
      {/* Title & Clear Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">1. Dán văn bản tiếng Nhật hoặc hỗn hợp</h3>
            <p className="text-xs text-slate-500">
              Hệ thống tự động lọc Kanji (U+4E00 - U+9FAF) và loại bỏ các chữ bị trùng lặp
            </p>
          </div>
        </div>

        <button
          onClick={onClear}
          disabled={!inputText}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa trắng</span>
        </button>
      </div>

      {/* Preset Quick Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 font-semibold whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Mẫu có sẵn:
        </span>
        {SAMPLE_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => setInputText(preset.text)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 whitespace-nowrap transition-all border border-slate-200/60 font-medium cursor-pointer shrink-0 shadow-2xs"
            title={preset.desc}
          >
            {preset.title}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Dán đoạn văn tiếng Nhật bất kỳ vào đây... (Ví dụ: 日本語能力試験、漢字の書き順、練習)"
          rows={4}
          className="w-full px-4 py-3.5 text-slate-800 placeholder-slate-400 bg-slate-50/60 rounded-xl border border-slate-200/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-sm resize-y leading-relaxed shadow-inner"
        />
      </div>

      {/* Statistics & Quick Operations Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium">
            Ký tự văn bản: <strong className="text-slate-800">{inputText.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100">
            Kanji duy nhất lọc được: <strong className="text-blue-700 font-bold text-sm">{kanjiList.length}</strong> chữ
          </span>
        </div>

        {kanjiList.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onCopyAllText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all font-semibold cursor-pointer border border-blue-200/60"
              title="Sao chép toàn bộ các chữ Kanji lọc được dưới dạng văn bản"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy chuỗi Kanji</span>
            </button>
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-semibold cursor-pointer"
              title="Xuất danh sách gồm URL ảnh sang định dạng CSV để nhập vào Anki"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV (Anki)</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
