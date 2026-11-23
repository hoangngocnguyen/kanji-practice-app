import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Play, PenTool, X } from 'lucide-react';
import {
  getActiveMistakes,
  KanjiMistakeRecord,
  loadLocalMistakeBank,
  MISTAKE_BANK_UPDATED_EVENT,
  removeKanjiMistake,
  syncMistakeBankFromCloud,
} from '../services/mistakeBankService';
import { getKanjiInfo } from '../data/kanjiDictionary';
import { useAuth } from '../context/AuthContext';
import { useKanji } from '../context/KanjiContext';

interface MistakeBankCardProps {
  onStartMistakeReview: () => void;
}

export const MistakeBankCard: React.FC<MistakeBankCardProps> = ({
  onStartMistakeReview,
}) => {
  const { user, supabaseEnabled } = useAuth();
  const { openKanjiPracticeModal } = useKanji();
  const [records, setRecords] = useState<KanjiMistakeRecord[]>(() => loadLocalMistakeBank());

  useEffect(() => {
    const onUpdated = () => setRecords(loadLocalMistakeBank());
    window.addEventListener(MISTAKE_BANK_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(MISTAKE_BANK_UPDATED_EVENT, onUpdated);
  }, []);

  useEffect(() => {
    if (user && supabaseEnabled) {
      void syncMistakeBankFromCloud().then((merged) => setRecords(merged));
    }
  }, [user, supabaseEnabled]);

  const activeMistakes = useMemo(() => getActiveMistakes(records), [records]);
  const visibleChars = useMemo(() => activeMistakes.slice(0, 12), [activeMistakes]);
  const activeCharList = useMemo(() => activeMistakes.map((m) => m.kanji), [activeMistakes]);

  if (activeMistakes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs text-slate-500 truncate">
            <strong className="text-slate-700 font-bold">Chữ hay sai (0)</strong>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>Tự động gom chữ khi bấm Quên SRS, sai Quiz hoặc viết trượt.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200/90 p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 tabular-nums">
              Chữ hay sai ({activeMistakes.length})
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              Đúng 2 lần liên tiếp để tự xóa khỏi nhóm chữ yếu
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onStartMistakeReview}
            className="px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Ôn ngay ({activeMistakes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => openKanjiPracticeModal(activeCharList[0], activeCharList)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <PenTool className="w-3.5 h-3.5 text-teal-700" />
            <span>Luyện viết</span>
          </button>
        </div>
      </div>

      {/* Compact Chips List */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {visibleChars.map((rec) => {
          const hv = getKanjiInfo(rec.kanji)?.hanViet || '';
          return (
            <div
              key={rec.kanji}
              className="group relative inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-amber-50/60 hover:border-amber-300 transition-colors"
            >
              <button
                type="button"
                onClick={() => openKanjiPracticeModal(rec.kanji, activeCharList)}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 cursor-pointer"
                title={`Sai ${rec.mistakeCount} lần · Bấm xem nét & luyện viết`}
              >
                <span className="font-kanji font-bold text-base text-slate-900 leading-none">
                  {rec.kanji}
                </span>
                {hv && (
                  <span className="text-[10px] font-bold text-slate-600">{hv}</span>
                )}
                <span className="text-[10px] font-bold text-amber-700 tabular-nums">
                  ×{rec.mistakeCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void removeKanjiMistake(rec.kanji)}
                className="p-1 mr-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                title={`Xóa dấu ${rec.kanji}`}
                aria-label={`Xóa dấu ${rec.kanji}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        {activeMistakes.length > visibleChars.length && (
          <span className="text-[11px] font-semibold text-slate-400 px-1.5 tabular-nums">
            +{activeMistakes.length - visibleChars.length} chữ khác
          </span>
        )}
      </div>
    </div>
  );
};
