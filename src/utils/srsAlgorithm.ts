import { SrsConfig, SrsRating, SrsState } from '../types/deck';

export const DEFAULT_SRS_CONFIG: SrsConfig = {
  hardMinutes: 10,
  goodDays: 1,
  easyDays: 4,
};

export function createInitialSrsState(now = Date.now()): SrsState {
  return {
    dueAt: now,
    intervalMinutes: 0,
    easeFactor: 2.5,
    repetitions: 0,
  };
}

/**
 * Tính toán trạng thái SRS tiếp theo theo thuật toán Anki SM-2 tùy chỉnh 3 mức: Khó / Tốt / Dễ
 */
export function calculateNextSrsState(
  current: SrsState,
  rating: SrsRating,
  config: SrsConfig = DEFAULT_SRS_CONFIG,
  now = Date.now()
): SrsState {
  const MIN_EASE = 1.3;
  let { easeFactor, repetitions, intervalMinutes } = current;

  if (rating === 'hard') {
    // Khó: lặp lại nhanh (mặc định 10 phút), giảm nhẹ ease factor, reset chuỗi liên tiếp
    const nextMinutes = Math.max(1, config.hardMinutes);
    return {
      dueAt: now + nextMinutes * 60 * 1000,
      intervalMinutes: nextMinutes,
      easeFactor: Math.max(MIN_EASE, Number((easeFactor - 0.15).toFixed(2))),
      repetitions: 0,
      lastRating: 'hard',
      lastReviewedAt: now,
    };
  }

  if (rating === 'good') {
    let nextMinutes: number;
    if (repetitions === 0) {
      nextMinutes = Math.max(1, config.goodDays) * 24 * 60;
    } else if (repetitions === 1) {
      nextMinutes = Math.max(2, Math.round(config.goodDays * 2.5)) * 24 * 60;
    } else {
      nextMinutes = Math.round(intervalMinutes * easeFactor);
    }

    return {
      dueAt: now + nextMinutes * 60 * 1000,
      intervalMinutes: nextMinutes,
      easeFactor,
      repetitions: repetitions + 1,
      lastRating: 'good',
      lastReviewedAt: now,
    };
  }

  // rating === 'easy'
  let nextMinutes: number;
  const nextEase = Number((easeFactor + 0.15).toFixed(2));
  if (repetitions === 0) {
    nextMinutes = Math.max(1, config.easyDays) * 24 * 60;
  } else {
    nextMinutes = Math.round(
      Math.max(config.easyDays * 24 * 60, intervalMinutes * nextEase * 1.3)
    );
  }

  return {
    dueAt: now + nextMinutes * 60 * 1000,
    intervalMinutes: nextMinutes,
    easeFactor: nextEase,
    repetitions: repetitions + 1,
    lastRating: 'easy',
    lastReviewedAt: now,
  };
}

export function formatIntervalLabel(minutes: number): string {
  if (minutes < 60) {
    return `${Math.max(1, Math.round(minutes))} phút`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return `${Math.round(hours)} giờ`;
  }
  const days = minutes / (60 * 24);
  if (days < 30) {
    return `${Math.round(days)} ngày`;
  }
  const months = days / 30;
  if (months < 12) {
    return `${months.toFixed(1).replace(/\.0$/, '')} tháng`;
  }
  const years = days / 365;
  return `${years.toFixed(1).replace(/\.0$/, '')} năm`;
}

export function previewNextIntervals(
  current: SrsState,
  config: SrsConfig = DEFAULT_SRS_CONFIG
): Record<SrsRating, string> {
  const now = Date.now();
  return {
    hard: formatIntervalLabel(calculateNextSrsState(current, 'hard', config, now).intervalMinutes),
    good: formatIntervalLabel(calculateNextSrsState(current, 'good', config, now).intervalMinutes),
    easy: formatIntervalLabel(calculateNextSrsState(current, 'easy', config, now).intervalMinutes),
  };
}
