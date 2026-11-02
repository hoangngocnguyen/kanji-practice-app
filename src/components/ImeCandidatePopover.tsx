import React, { useEffect, useRef } from 'react';
import { ImeCandidate } from '../utils/kanjiImeEngine';
import { Sparkles, CornerDownLeft, X, Loader2 } from 'lucide-react';

interface ImeCandidatePopoverProps {
  candidates: ImeCandidate[];
  selectedIndex: number;
  onSelectCandidate: (candidate: ImeCandidate) => void;
  onClose: () => void;
  reading: string;
  position?: { top: number; left: number } | null;
  isLoading?: boolean;
}

export const ImeCandidatePopover: React.FC<ImeCandidatePopoverProps> = ({
  candidates,
  selectedIndex,
  onSelectCandidate,
  onClose,
  reading,
  position,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Auto scroll active candidate into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!candidates || candidates.length === 0) return null;

  const style: React.CSSProperties = position
    ? {
        position: 'absolute',
        top: `${position.top}px`,
        left: `${Math.max(12, Math.min(position.left, window.innerWidth - 380))}px`,
        zIndex: 50,
      }
    : {
        position: 'relative',
        zIndex: 50,
      };

  return (
    <div
      ref={containerRef}
      style={style}
      className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-teal-700/40 overflow-hidden ring-4 ring-teal-900/10 animate-in fade-in zoom-in-95 duration-150 select-none text-slate-800"
    >
      {/* Header Bar with Website Signature Teal Gradient */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-3.5 py-2.5 flex items-center justify-between text-white shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-teal-700/80 border border-teal-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-3 h-3 text-amber-300" />
          </div>
          <span className="text-xs font-semibold text-teal-100">Gợi ý Kanji:</span>
          <span className="font-japanese font-bold text-xs sm:text-sm text-white bg-teal-700/90 border border-teal-400/40 px-2 py-0.5 rounded-md shadow-2xs tracking-wide truncate max-w-[140px]">
            {reading}
          </span>
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-teal-200 animate-spin shrink-0 ml-0.5" />
          )}
        </div>
        <button
          onClick={onClose}
          className="text-teal-200 hover:text-white hover:bg-teal-700/60 p-1 rounded-lg transition-colors cursor-pointer"
          title="Đóng bảng gợi ý (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Candidate List */}
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1.5 space-y-0.5">
        {candidates.map((cand, idx) => {
          const isSelected = idx === selectedIndex;
          const shortcutKey = idx < 9 ? idx + 1 : idx === 9 ? 0 : null;

          return (
            <button
              key={cand.id || `${cand.word}-${idx}`}
              ref={isSelected ? activeItemRef : null}
              type="button"
              onClick={() => onSelectCandidate(cand)}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-gradient-to-r from-teal-50 via-emerald-50/50 to-white border-l-4 border-l-teal-700 border-y border-teal-200 shadow-2xs'
                  : 'hover:bg-slate-50 border-l-4 border-l-transparent'
              }`}
            >
              {/* Left: Shortcut number & Word */}
              <div className="flex items-center gap-2.5 min-w-0">
                {shortcutKey !== null && (
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-md text-[11px] font-mono font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800'
                    }`}
                  >
                    {shortcutKey}
                  </span>
                )}

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-base font-bold font-kanji tracking-wide ${
                        isSelected
                          ? 'text-teal-950 font-extrabold'
                          : 'text-slate-900 group-hover:text-teal-900'
                      }`}
                    >
                      {cand.word}
                    </span>
                    {cand.hanViet && (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 rounded shadow-2xs shrink-0">
                        {cand.hanViet}
                      </span>
                    )}
                  </div>
                  {cand.meaning && (
                    <span className="text-[11px] text-slate-600 truncate max-w-[210px] leading-tight">
                      {cand.meaning}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Enter indicator for selected */}
              {isSelected && (
                <div className="shrink-0 flex items-center text-teal-700 text-[11px] font-bold gap-1 bg-teal-100/70 border border-teal-300 px-1.5 py-0.5 rounded shadow-2xs">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>Chọn</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer shortcut hints */}
      <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-1">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-teal-300 text-teal-800 rounded font-mono font-bold shadow-2xs text-[10px]">
              Tab
            </kbd>{' '}
            / <kbd className="px-1.5 py-0.5 bg-white border border-teal-300 text-teal-800 rounded font-mono font-bold shadow-2xs text-[10px]">Space</kbd> Tiếp
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-teal-300 text-teal-800 rounded font-mono font-bold shadow-2xs text-[10px]">
              1-9
            </kbd>{' '}
            Số
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-700 rounded font-mono text-[10px] shadow-2xs">
              Enter
            </kbd>{' '}
            Chọn
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-700 rounded font-mono text-[10px] shadow-2xs">
              Esc
            </kbd>{' '}
            Hủy
          </span>
        </div>
      </div>
    </div>
  );
};
