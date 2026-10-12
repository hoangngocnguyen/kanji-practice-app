import React from 'react';
import { Trash2, Sparkles, Copy, Download, FileText } from 'lucide-react';
import { SAMPLE_PRESETS } from '../utils/kanji';
import { KanjiItem } from '../types/kanji';
import { getPresetBadgeClass } from '../utils/colorUtils';

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
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4 transition-all">
      {/* Title & Clear Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/70">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">1. Dán văn bản tiếng Nhật hoặc từ vựng</h3>
            <p className="text-xs text-slate-500">
              Hệ thống tự động lọc Kanji (U+4E00 - U+9FAF), tìm âm Hán-Việt, phân loại JLPT và loại bỏ trùng lặp
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

      {/* Preset Quick Chips with Harmonious Palette */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 font-semibold whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          Mẫu có sẵn:
        </span>
        {SAMPLE_PRESETS.map((preset, idx) => {
          const style = getPresetBadgeClass(idx);
          return (
            <button
              key={idx}
              onClick={() => setInputText(preset.text)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border font-semibold cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5 ${style.btn}`}
              title={preset.desc}
            >
              <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
              <span>{preset.title}</span>
            </button>
          );
        })}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Dán đoạn văn tiếng Nhật bất kỳ vào đây... (Ví dụ: 日本語能力試験、漢字の書き順、練習、温故知新)"
          rows={4}
          className="w-full px-4 py-3.5 text-slate-800 placeholder-slate-400 bg-slate-50/70 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-sans text-sm resize-y leading-relaxed shadow-inner"
        />
      </div>

      {/* Statistics & Quick Operations Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium">
            Ký tự văn bản: <strong className="text-slate-800">{inputText.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 font-medium border border-teal-200">
            Kanji duy nhất lọc được: <strong className="text-teal-700 font-bold text-sm">{kanjiList.length}</strong> chữ
          </span>
        </div>

        {kanjiList.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onCopyAllText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all font-semibold cursor-pointer border border-teal-200"
              title="Sao chép toàn bộ các chữ Kanji lọc được dưới dạng văn bản"
            >
              <Copy className="w-3.5 h-3.5 text-teal-700" />
              <span>Sao chép chuỗi Kanji</span>
            </button>
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-semibold cursor-pointer border border-slate-200"
              title="Xuất danh sách gồm URL ảnh, Hán-Việt & nghĩa sang định dạng CSV để nhập vào Anki"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất CSV (Anki)</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
