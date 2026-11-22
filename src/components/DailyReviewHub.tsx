import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Layers3,
  BookOpen,
  GraduationCap,
  X,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import {
  KanjiCatalogEntry,
  LEVEL_METADATA,
  loadKanjiJoyoCatalog,
} from '../services/kanjiLevelService';
import { ReviewFilterMode } from '../types/deck';

interface DailyReviewHubProps {
  onStartUnifiedReview: (folderId: string, mode: ReviewFilterMode, onlyDue: boolean) => void;
  onStartInteractiveDrills: () => void;
}

const SEVEN_DAYS_MINUTES = 7 * 24 * 60;

export const DailyReviewHub: React.FC<DailyReviewHubProps> = ({
  onStartUnifiedReview,
  onStartInteractiveDrills,
}) => {
  const navigate = useNavigate();
  const {
    folders,
    items,
    getReviewCardsForFolder,
    getDueCountForFolderRecursive,
  } = useDecks();

  const [catalog, setCatalog] = useState<KanjiCatalogEntry[]>([]);
  const [isJlptModalOpen, setIsJlptModalOpen] = useState<boolean>(false);

  // Lazy load Joyo 2.136 catalog for N5 -> N1 mastery breakdown
  useEffect(() => {
    let mounted = true;
    loadKanjiJoyoCatalog()
      .then((list) => {
        if (mounted) setCatalog(list);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!isJlptModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsJlptModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isJlptModalOpen]);

  // Unified due queue metrics
  const allDueCards = useMemo(
    () => getReviewCardsForFolder('__ALL__', 'all', true),
    [getReviewCardsForFolder]
  );

  const dueBreakdown = useMemo(() => {
    let kanji = 0;
    let compound = 0;
    for (const c of allDueCards) {
      if (c.cardType === 'kanji') kanji += 1;
      else compound += 1;
    }
    return { kanji, compound, total: allDueCards.length };
  }, [allDueCards]);

  const totalAllCards = useMemo(() => {
    return items.reduce((sum, it) => sum + 1 + (it.compoundWords?.length || 0), 0);
  }, [items]);

  // Top folders that currently have due cards
  const foldersWithDue = useMemo(() => {
    return folders
      .map((f) => ({
        folder: f,
        dueCount: getDueCountForFolderRecursive(f.id),
      }))
      .filter((x) => x.dueCount > 0)
      .sort((a, b) => b.dueCount - a.dueCount)
      .slice(0, 4);
  }, [folders, getDueCountForFolderRecursive]);

  // JLPT N5 -> N1 + JOYO mastery calculation
  const jlptProgress = useMemo(() => {
    if (catalog.length === 0) return [];

    const bestCardStatusByChar = new Map<string, 'mastered' | 'learning'>();
    for (const item of items) {
      const isMastered =
        (item.srsState?.repetitions || 0) >= 2 &&
        (item.srsState?.intervalMinutes || 0) >= SEVEN_DAYS_MINUTES;
      const existing = bestCardStatusByChar.get(item.kanji);
      if (isMastered) {
        bestCardStatusByChar.set(item.kanji, 'mastered');
      } else if (!existing) {
        bestCardStatusByChar.set(item.kanji, 'learning');
      }
    }

    return LEVEL_METADATA.map((meta) => {
      const levelEntries =
        meta.key === 'JOYO' ? catalog : catalog.filter((e) => e.lv === meta.key);
      let mastered = 0;
      let learning = 0;
      for (const entry of levelEntries) {
        const status = bestCardStatusByChar.get(entry.c);
        if (status === 'mastered') mastered += 1;
        else if (status === 'learning') learning += 1;
      }
      const total = levelEntries.length || meta.count;
      const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
      const inDeckPct = total > 0 ? Math.round(((mastered + learning) / total) * 100) : 0;
      return {
        ...meta,
        total,
        mastered,
        learning,
        unlearned: Math.max(0, total - mastered - learning),
        masteredPct,
        inDeckPct,
      };
    });
  }, [catalog, items]);

  const totalMasteredAll = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      if (
        (item.srsState?.repetitions || 0) >= 2 &&
        (item.srsState?.intervalMinutes || 0) >= SEVEN_DAYS_MINUTES
      ) {
        seen.add(item.kanji);
      }
    }
    return seen.size;
  }, [items]);

  return (
    <div>
      {/* Main Full-Width Daily Review Command Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                Trung tâm ôn tập hằng ngày
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight tabular-nums">
              {dueBreakdown.total > 0
                ? `${dueBreakdown.total} thẻ đến hạn ôn hôm nay`
                : totalAllCards > 0
                ? 'Bạn đã hoàn thành hết thẻ đến hạn hôm nay!'
                : 'Chưa có thẻ Kanji trong thư mục'}
            </h2>
            <p className="text-xs text-slate-500 tabular-nums">
              {dueBreakdown.total > 0 ? (
                <>
                  {dueBreakdown.kanji} thẻ Kanji · {dueBreakdown.compound} từ ghép ·{' '}
                  {foldersWithDue.length} thư mục cần ôn
                </>
              ) : (
                <>
                  Tổng {items.length} chữ Kanji · {totalAllCards} thẻ SRS · {totalMasteredAll} chữ đã nhớ vững
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={totalAllCards === 0}
              onClick={() =>
                onStartUnifiedReview('__ALL__', 'all', dueBreakdown.total > 0)
              }
              className="flex-1 sm:flex-none justify-center px-4 py-2.5 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="tabular-nums">
                {dueBreakdown.total > 0
                  ? `Ôn gộp hôm nay (${dueBreakdown.total})`
                  : `Ôn lại tất cả (${totalAllCards})`}
              </span>
            </button>

            {items.length >= 2 && (
              <button
                type="button"
                onClick={onStartInteractiveDrills}
                className="px-3 py-2.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Luyện ghép bộ thủ thành chữ Kanji & nối từ ghép"
              >
                <Layers3 className="w-3.5 h-3.5 shrink-0" />
                <span>Ghép bộ thủ</span>
              </button>
            )}

            {jlptProgress.length > 0 && (
              <button
                type="button"
                onClick={() => setIsJlptModalOpen(true)}
                className="px-3 py-2.5 text-xs font-semibold text-slate-700 hover:text-teal-900 bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Xem tiến độ ghi nhớ Kanji theo cấp độ JLPT N5 → N1"
              >
                <GraduationCap className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Tiến độ JLPT</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Per-Folder Due Shortcuts */}
        {foldersWithDue.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              Ôn từng thư mục:
            </span>
            {foldersWithDue.map(({ folder, dueCount }) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onStartUnifiedReview(folder.id, 'all', true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-teal-900 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg transition-colors cursor-pointer max-w-[200px]"
                title={`Ôn riêng thư mục ${folder.name}`}
              >
                <span className="truncate">{folder.name}</span>
                <span className="text-[11px] font-bold text-teal-700 tabular-nums shrink-0">
                  ({dueCount})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* JLPT N5 -> N1 & Joyo Mastery Modal */}
      {isJlptModalOpen && (
        <div
          onClick={() => setIsJlptModalOpen(false)}
          className="fixed inset-0 z-50 max-h-[100dvh] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-2.5 sm:p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Tiến độ ghi nhớ JLPT"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92dvh] bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                    Tiến độ ghi nhớ JLPT (N5 → N1)
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate tabular-nums">
                    Đã nhớ vững {totalMasteredAll} chữ · Tổng {items.length} chữ trong bộ thẻ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsJlptModalOpen(false)}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  &ldquo;Đã nhớ vững&rdquo;: thẻ có <strong className="text-slate-700">≥ 2 lần nhớ đúng</strong> và chu kỳ ôn{' '}
                  <strong className="text-slate-700">≥ 7 ngày</strong>. Bấm từng cấp để học chữ còn thiếu.
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                    Đã nhớ vững
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-teal-300 inline-block" />
                    Đang ôn tập
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {jlptProgress.map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => {
                      setIsJlptModalOpen(false);
                      navigate(`/levels?level=${lvl.key}`);
                    }}
                    className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-teal-400 bg-slate-50/60 hover:bg-teal-50/35 text-left transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>{lvl.label}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                        <strong className="text-emerald-700">{lvl.mastered}</strong>
                        {lvl.learning > 0 && (
                          <span className="text-teal-700"> (+{lvl.learning})</span>
                        )}{' '}
                        / {lvl.total} · {lvl.masteredPct}%
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden flex">
                      {lvl.mastered > 0 && (
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${(lvl.mastered / lvl.total) * 100}%` }}
                        />
                      )}
                      {lvl.learning > 0 && (
                        <div
                          className="h-full bg-teal-400 transition-all duration-300"
                          style={{ width: `${(lvl.learning / lvl.total) * 100}%` }}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
