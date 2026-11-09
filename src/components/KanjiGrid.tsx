import React, { useState } from 'react';
import {
  Copy,
  CheckCheck,
  RefreshCw,
  Download,
  Volume2,
  RotateCcw,
  Repeat1,
  Repeat,
  Info,
  X
} from 'lucide-react';
import { KanjiItem, CopyStatus } from '../types/kanji';
import { speakJapanese } from '../utils/speech';
import { getJlptBadgeClass } from '../utils/colorUtils';
import { getPrimaryHiragana } from '../utils/kanji';
import { KanjiGridOverlay } from './KanjiGridOverlay';
import { KanjiSvgView } from './KanjiSvgView';

interface KanjiGridProps {
  kanjiList: KanjiItem[];
  copyStatus: Record<string, CopyStatus>;
  showGrid?: boolean;
  showFurigana?: boolean;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
  onInspect: (item: KanjiItem) => void;
  onRemoveKanji?: (kanjiChar: string) => void;
}

export const KanjiGrid: React.FC<KanjiGridProps> = ({
  kanjiList,
  copyStatus,
  showGrid = false,
  showFurigana = false,
  onCopyImage,
  onDownloadPng,
  onInspect,
  onRemoveKanji,
}) => {
  const [animStateMap, setAnimStateMap] = useState<
    Record<string, { animKey: number; mode: 'off' | 'once' | 'infinite' }>
  >({});

  const handleTogglePlayMode = (hex: string) => {
    setAnimStateMap((prev) => {
      const current = prev[hex] || { animKey: 0, mode: 'off' };
      let nextMode: 'off' | 'once' | 'infinite';
      if (current.mode === 'off') nextMode = 'once';
      else if (current.mode === 'once') nextMode = 'infinite';
      else nextMode = 'off';

      return {
        ...prev,
        [hex]: {
          animKey: current.animKey + 1,
          mode: nextMode,
        },
      };
    });
  };

  const renderReloadButton = (hex: string, mode: 'off' | 'once' | 'infinite') => {
    let icon = <RotateCcw className="w-3.5 h-3.5 text-teal-700" />;
    let btnStyle = "bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-800 border-slate-200 shadow-md hover:shadow-lg";
    let title = "Phát nét vẽ (1 lần)";

    if (mode === 'once') {
      icon = <Repeat1 className="w-3.5 h-3.5 text-white" />;
      btnStyle = "bg-teal-600 hover:bg-teal-700 text-white border-teal-700 shadow-md ring-2 ring-teal-300/60";
      title = "Lặp lại liên tục (Đang phát 1 lần)";
    } else if (mode === 'infinite') {
      icon = <Repeat className="w-3.5 h-3.5 text-white animate-pulse" />;
      btnStyle = "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300/60";
      title = "Tắt nét vẽ (Đang lặp liên tục)";
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleTogglePlayMode(hex);
        }}
        className={`absolute -top-2 -right-2 z-10 p-1.5 rounded-full border transition-all cursor-pointer active:scale-90 hover:scale-110 ${btnStyle}`}
        title={title}
      >
        {icon}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5 lg:gap-5">
      {kanjiList.map((item) => {
        const status = copyStatus[item.hex] || 'idle';
        const isCopied = status === 'copied';
        const isCopying = status === 'copying';
        const detail = item.detail;

        const hasOn = detail?.on && detail.on.length > 0;
        const hasKun = detail?.kun && detail.kun.length > 0;
        const hasMeanings = detail?.meanings && detail.meanings.length > 0;
        const animState = animStateMap[item.hex] || { animKey: 0, mode: 'off' };

        return (
          <div
            key={item.hex}
            className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-teal-400 p-4 sm:p-5 flex flex-col items-center justify-between gap-3 sm:gap-3.5 transition-all shadow-xs hover:shadow-md group"
          >
            {/* Top row: STT, JLPT & Stroke Count & Remove button */}
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold text-teal-700">#{item.id}</span>
              <div className="flex items-center gap-1.5">
                {detail?.jlpt && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${getJlptBadgeClass(detail.jlpt)}`}>
                    {detail.jlpt}
                  </span>
                )}
                {detail?.strokeCount && (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">
                    {detail.strokeCount} nét
                  </span>
                )}
                {onRemoveKanji && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveKanji(item.kanji);
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-0.5"
                    title={`Loại chữ "${item.kanji}" khỏi danh sách`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Kanji & Hán Việt Header */}
            <div className="text-center cursor-pointer space-y-1 w-full" onClick={() => onInspect(item)}>
              <div className="relative inline-flex items-center justify-center">
                <ruby className="font-kanji font-black text-4xl sm:text-5xl text-slate-800 group-hover:text-teal-700 transition-colors leading-none inline-flex flex-col items-center">
                  {showFurigana && detail && getPrimaryHiragana(detail) && (
                    <rt className="text-xs font-semibold text-teal-700 select-none pb-0.5 tracking-normal font-sans">
                      {getPrimaryHiragana(detail)}
                    </rt>
                  )}
                  <span>{item.kanji}</span>
                </ruby>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakJapanese(item.kanji);
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute -right-6 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-teal-700 transition-opacity"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {detail?.hanViet && (
                <div>
                  <span className="text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                    {detail.hanViet}
                  </span>
                </div>
              )}

              {/* On & Kun readings preview */}
              <div className="flex flex-wrap items-center justify-center gap-1 pt-1 text-[11px]">
                {hasOn && (
                  <span className="text-blue-800 bg-blue-50/80 border border-blue-200 px-1.5 py-0.2 rounded font-medium truncate max-w-full">
                    On: {detail.on.slice(0, 2).join(', ')}
                  </span>
                )}
                {hasKun && (
                  <span className="text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-1.5 py-0.2 rounded font-medium truncate max-w-full">
                    Kun: {detail.kun.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>

              {/* Meanings */}
              {hasMeanings && (
                <p className="text-[11px] text-slate-600 line-clamp-1 font-medium px-2 pt-0.5">
                  {detail.meanings.join(', ')}
                </p>
              )}
            </div>

            {/* Large Stroke Order Image Box Wrapper */}
            <div className="relative w-full aspect-square max-w-[170px] sm:max-w-[190px]">
              <div
                onClick={() => onInspect(item)}
                className="relative w-full h-full bg-white rounded-xl border-2 border-slate-100 p-2 shadow-inner flex items-center justify-center cursor-pointer hover:border-teal-300 transition-colors overflow-hidden group/box"
                title={`Click để xem chi tiết nét vẽ chữ ${item.kanji}`}
              >
                {/* Lưới ô nét đứt mảnh */}
                {showGrid && <KanjiGridOverlay dashed={true} type="mi" />}

                <KanjiSvgView
                  svgUrl={item.svgUrl}
                  kanji={item.kanji}
                  animKey={animState.animKey}
                  loopMode={animState.mode}
                  className="w-full h-full object-contain transform group-hover/box:scale-105 transition-transform relative z-0"
                />

                <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/box:opacity-100 flex items-center justify-center transition-opacity rounded-2xl backdrop-blur-2xs">
                  <span className="bg-white/95 text-slate-800 font-bold text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 border border-slate-200">
                    <Info className="w-3.5 h-3.5 text-teal-600" /> Chi tiết
                  </span>
                </div>
              </div>

              {/* Nút Reload phát lại nét vẽ (Nằm BÊN NGOÀI ô nét vẽ góc trên bên phải) */}
              {renderReloadButton(item.hex, animState.mode)}
            </div>

            {/* Bottom Actions */}
            <div className="w-full space-y-2 pt-1">
              <button
                type="button"
                onClick={() => onInspect(item)}
                className="w-full h-9 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 hover:border-teal-300 shadow-2xs hover:shadow-xs active:scale-95 whitespace-nowrap"
              >
                <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Chi tiết</span>
              </button>

              <div className="w-full flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onCopyImage(item)}
                  disabled={isCopying}
                  className={`flex-1 h-9 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap border ${
                    isCopied
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300/40 shadow-xs'
                      : isCopying
                      ? 'bg-teal-100 text-teal-900 border-teal-200'
                      : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800 hover:shadow-xs shadow-teal-900/15'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                      <span>Đã chép!</span>
                    </>
                  ) : isCopying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-200 shrink-0" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>Sao chép ảnh</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onDownloadPng(item)}
                  className="h-9 w-9 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-all flex items-center justify-center shadow-2xs hover:shadow-xs active:scale-95 shrink-0"
                  title="Tải ảnh PNG về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
