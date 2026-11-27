import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  getLocalDateKey,
  LocalStudyStats,
} from '../services/studyStatsService';

interface StudyHeatmap365Props {
  stats: LocalStudyStats;
  title?: string;
}

interface HeatmapCell {
  dateKey: string;
  label: string;
  reviewed: number;
  level: 0 | 1 | 2 | 3 | 4;
  isFrozen: boolean;
  isFuture: boolean;
  isToday: boolean;
}

const MONTH_LABELS = [
  'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6',
  'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12',
];

function getCellColorClass(
  level: 0 | 1 | 2 | 3 | 4,
  isFrozen: boolean,
  isFuture: boolean
): string {
  if (isFuture) return 'bg-transparent border-transparent pointer-events-none';
  if (isFrozen) return 'bg-sky-400 border-sky-500/40';
  switch (level) {
    case 4:
      return 'bg-teal-800 border-teal-900/30';
    case 3:
      return 'bg-teal-600 border-teal-700/25';
    case 2:
      return 'bg-teal-400 border-teal-500/20';
    case 1:
      return 'bg-teal-200 border-teal-300/30';
    default:
      return 'bg-slate-100 border-slate-200/70';
  }
}

export const StudyHeatmap365: React.FC<StudyHeatmap365Props> = ({
  stats,
  title = 'Nhịp độ học 365 ngày',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const { weeks, monthMarkers, activeDaysCount, totalReviewsYear } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateKey(today);
    const frozenSet = new Set(Array.isArray(stats.frozenDates) ? stats.frozenDates : []);

    // Day of week normalized so Monday = 0, Sunday = 6
    const jsDay = today.getDay();
    const todayOffsetMon = jsDay === 0 ? 6 : jsDay - 1;

    // 53 columns (weeks) ending on the week containing today
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - todayOffsetMon));

    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - 53 * 7 + 1);

    const goal = Math.max(1, stats.dailyGoal || 20);
    const weekColumns: HeatmapCell[][] = [];
    const markers: Array<{ weekIdx: number; label: string }> = [];

    let activeDays = 0;
    let totalYear = 0;
    let prevMonth = -1;

    const cursor = new Date(startDate);
    for (let w = 0; w < 53; w++) {
      const col: HeatmapCell[] = [];
      for (let d = 0; d < 7; d++) {
        const key = getLocalDateKey(cursor);
        const isFuture = cursor.getTime() > today.getTime();
        const reviewed = isFuture
          ? 0
          : Math.max(0, Number(stats.activityByDate[key]?.reviewed || 0));
        const isFrozen = !isFuture && reviewed === 0 && frozenSet.has(key);

        if (!isFuture && reviewed > 0) {
          activeDays += 1;
          totalYear += reviewed;
        }

        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (reviewed > 0) {
          const ratio = reviewed / goal;
          if (ratio >= 1.5) level = 4;
          else if (ratio >= 1.0) level = 3;
          else if (ratio >= 0.45) level = 2;
          else level = 1;
        }

        if (d === 0 && !isFuture) {
          const m = cursor.getMonth();
          if (m !== prevMonth) {
            markers.push({ weekIdx: w, label: MONTH_LABELS[m] });
            prevMonth = m;
          }
        }

        const dd = String(cursor.getDate()).padStart(2, '0');
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const yyyy = cursor.getFullYear();

        col.push({
          dateKey: key,
          label: `${dd}/${mm}/${yyyy}`,
          reviewed,
          level,
          isFrozen,
          isFuture,
          isToday: key === todayKey,
        });

        cursor.setDate(cursor.getDate() + 1);
      }
      weekColumns.push(col);
    }

    return {
      weeks: weekColumns,
      monthMarkers: markers,
      activeDaysCount: activeDays,
      totalReviewsYear: totalYear,
    };
  }, [stats]);

  // Anchor horizontal scroll to the latest week (right) on narrow viewports
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [weeks.length]);

  const monthByWeekIdx = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of monthMarkers) {
      map.set(m.weekIdx, m.label);
    }
    return map;
  }, [monthMarkers]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-teal-700 shrink-0" />
          <h2 className="text-sm font-extrabold text-slate-900 truncate">{title}</h2>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
          <span>
            <strong className="text-slate-900">{activeDaysCount}</strong> ngày học
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            <strong className="text-teal-800">{totalReviewsYear.toLocaleString('vi-VN')}</strong> lượt ôn
          </span>
        </div>
      </div>

      {/* Heatmap Matrix */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-1 no-scrollbar"
      >
        <div className="inline-flex gap-1.5 min-w-max">
          {/* Day-of-week column */}
          <div className="flex flex-col gap-[3px] pt-[18px] pr-1 text-[10px] font-medium text-slate-400 select-none shrink-0">
            <span className="h-[11px] leading-[11px]">T2</span>
            <span className="h-[11px] leading-[11px]" />
            <span className="h-[11px] leading-[11px]">T4</span>
            <span className="h-[11px] leading-[11px]" />
            <span className="h-[11px] leading-[11px]">T6</span>
            <span className="h-[11px] leading-[11px]" />
            <span className="h-[11px] leading-[11px]" />
          </div>

          {/* 53 Weeks */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wIdx) => {
              const monthLabel = monthByWeekIdx.get(wIdx);
              return (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  <div className="h-[15px] text-[10px] font-semibold text-slate-400 leading-[15px] whitespace-nowrap select-none">
                    {monthLabel || ''}
                  </div>
                  {week.map((cell) => (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onMouseEnter={() => !cell.isFuture && setHoveredCell(cell)}
                      onFocus={() => !cell.isFuture && setHoveredCell(cell)}
                      onClick={() => !cell.isFuture && setHoveredCell(cell)}
                      disabled={cell.isFuture}
                      aria-label={
                        cell.isFrozen
                          ? `${cell.label}: Đã dùng Băng Streak bảo vệ`
                          : `${cell.label}: ${cell.reviewed} lượt ôn`
                      }
                      title={
                        cell.isFrozen
                          ? `${cell.label}: Đã dùng Băng Streak bảo vệ`
                          : `${cell.label}: ${cell.reviewed} lượt ôn`
                      }
                      className={`w-[11px] h-[11px] rounded-[2px] border transition-transform ${
                        cell.isToday ? 'ring-1 ring-teal-700 ring-offset-1' : ''
                      } ${getCellColorClass(cell.level, cell.isFrozen, cell.isFuture)} ${
                        !cell.isFuture ? 'hover:scale-125 cursor-pointer' : ''
                      }`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Interactive Inspection & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="tabular-nums min-h-[16px]">
          {hoveredCell ? (
            hoveredCell.isFrozen ? (
              <span>
                <strong className="text-slate-800">{hoveredCell.label}</strong>:{' '}
                <strong className="text-sky-700">Đã dùng Băng Streak bảo vệ</strong>
              </span>
            ) : (
              <span>
                <strong className="text-slate-800">{hoveredCell.label}</strong>:{' '}
                <strong className="text-teal-800">{hoveredCell.reviewed}</strong> lượt ôn
              </span>
            )
          ) : (
            <span>Chạm hoặc di chuột vào ô ngày để xem chi tiết</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 select-none">
          <span className="inline-flex items-center gap-1 mr-1">
            <span className="w-[10px] h-[10px] rounded-[2px] bg-sky-400 border border-sky-500/40" />
            <span>Băng</span>
          </span>
          <span>Ít</span>
          <span className="w-[10px] h-[10px] rounded-[2px] bg-slate-100 border border-slate-200/70" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-teal-200 border border-teal-300/30" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-teal-400 border border-teal-500/20" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-teal-600 border border-teal-700/25" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-teal-800 border border-teal-900/30" />
          <span>Nhiều</span>
        </div>
      </div>
    </section>
  );
};
