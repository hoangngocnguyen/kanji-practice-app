import React from 'react';
import { Copy, CheckCheck, RefreshCw, Download, Eye, Maximize2 } from 'lucide-react';
import { KanjiItem, CopyStatus } from '../types/kanji';

interface KanjiGridProps {
  kanjiList: KanjiItem[];
  copyStatus: Record<string, CopyStatus>;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
  onInspect: (item: KanjiItem) => void;
}

export const KanjiGrid: React.FC<KanjiGridProps> = ({
  kanjiList,
  copyStatus,
  onCopyImage,
  onDownloadPng,
  onInspect,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {kanjiList.map((item) => {
        const status = copyStatus[item.hex] || 'idle';
        const isCopied = status === 'copied';
        const isCopying = status === 'copying';

        return (
          <div
            key={item.hex}
            className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-5 flex flex-col items-center justify-between gap-4 transition-all shadow-xs hover:shadow-lg group"
          >
            {/* Top row */}
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold text-blue-600">#{item.id}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                U+{item.hex.toUpperCase()}
              </span>
            </div>

            {/* Kanji Header */}
            <div className="text-center cursor-pointer" onClick={() => onInspect(item)}>
              <span className="font-kanji font-black text-5xl text-slate-800 group-hover:text-blue-600 transition-colors">
                {item.kanji}
              </span>
            </div>

            {/* Large Stroke Order Image Box */}
            <div
              onClick={() => onInspect(item)}
              className="relative w-full aspect-square max-w-[200px] bg-white rounded-2xl border-2 border-slate-100 p-2 shadow-inner flex items-center justify-center cursor-pointer hover:border-blue-300 transition-colors overflow-hidden group/box"
              title={`Click để phóng to chữ ${item.kanji}`}
            >
              <img
                src={item.svgUrl}
                alt={`Thứ tự nét ${item.kanji}`}
                className="w-full h-full object-contain filter contrast-125 transform group-hover/box:scale-105 transition-transform"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover/box:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                <span className="bg-white/95 text-blue-700 font-semibold text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="w-full flex items-center gap-2 pt-1">
              <button
                onClick={() => onCopyImage(item)}
                disabled={isCopying}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isCopied
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                    : isCopying
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                }`}
              >
                {isCopied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                    <span>✨ Đã copy!</span>
                  </>
                ) : isCopying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang copy...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy ảnh</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onDownloadPng(item)}
                className="p-2.5 text-slate-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200/80 hover:border-blue-200 cursor-pointer transition-colors"
                title="Tải ảnh PNG về máy"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full text-center text-[10px] text-slate-400">
              KanjiVG © Ulrich Apel • CC BY-SA 3.0
            </div>
          </div>
        );
      })}
    </div>
  );
};
