import { getSupabaseAccessToken } from '../utils/supabaseClient';

export type MistakeSource = 'srs' | 'quiz' | 'writing' | 'confusable';

export interface KanjiMistakeRecord {
  kanji: string;
  mistakeCount: number;
  consecutiveCorrect: number;
  srsHardCount: number;
  quizWrongCount: number;
  writingFailCount: number;
  isMastered: boolean;
  lastMistakeSource: MistakeSource;
  lastMistakeAt: number;
  masteredAt: number | null;
  updatedAt: number;
}

const STORAGE_MISTAKES_KEY = 'luyenkanji_kanji_mistakes_v1';
export const MISTAKE_BANK_UPDATED_EVENT = 'luyenkanji:kanji-mistakes-updated';
const MAX_LOCAL_RECORDS = 300;
const MASTER_STREAK_THRESHOLD = 2;

function isValidSingleKanji(ch: string): boolean {
  return Boolean(ch && /^\p{Script=Han}$/u.test(ch.trim()));
}

function normalizeRecord(raw: any): KanjiMistakeRecord | null {
  const kanji = typeof raw?.kanji === 'string' ? raw.kanji.trim() : '';
  if (!isValidSingleKanji(kanji)) return null;

  const sourceRaw = String(raw?.lastMistakeSource || raw?.last_mistake_source || 'srs');
  const lastMistakeSource: MistakeSource =
    sourceRaw === 'quiz' || sourceRaw === 'writing' || sourceRaw === 'confusable'
      ? sourceRaw
      : 'srs';

  const lastMistakeAtRaw = raw?.lastMistakeAt ?? raw?.last_mistake_at;
  const lastMistakeAt =
    typeof lastMistakeAtRaw === 'number'
      ? lastMistakeAtRaw
      : lastMistakeAtRaw
      ? new Date(lastMistakeAtRaw).getTime() || Date.now()
      : Date.now();

  const masteredAtRaw = raw?.masteredAt ?? raw?.mastered_at;
  const masteredAt =
    masteredAtRaw == null
      ? null
      : typeof masteredAtRaw === 'number'
      ? masteredAtRaw
      : new Date(masteredAtRaw).getTime() || null;

  const updatedAtRaw = raw?.updatedAt ?? raw?.updated_at;
  const updatedAt =
    typeof updatedAtRaw === 'number'
      ? updatedAtRaw
      : updatedAtRaw
      ? new Date(updatedAtRaw).getTime() || Date.now()
      : Date.now();

  return {
    kanji,
    mistakeCount: Math.max(0, Math.floor(Number(raw?.mistakeCount ?? raw?.mistake_count ?? 1))),
    consecutiveCorrect: Math.max(
      0,
      Math.floor(Number(raw?.consecutiveCorrect ?? raw?.consecutive_correct ?? 0))
    ),
    srsHardCount: Math.max(0, Math.floor(Number(raw?.srsHardCount ?? raw?.srs_hard_count ?? 0))),
    quizWrongCount: Math.max(
      0,
      Math.floor(Number(raw?.quizWrongCount ?? raw?.quiz_wrong_count ?? 0))
    ),
    writingFailCount: Math.max(
      0,
      Math.floor(Number(raw?.writingFailCount ?? raw?.writing_fail_count ?? 0))
    ),
    isMastered: Boolean(raw?.isMastered ?? raw?.is_mastered ?? false),
    lastMistakeSource,
    lastMistakeAt,
    masteredAt,
    updatedAt,
  };
}

export function loadLocalMistakeBank(): KanjiMistakeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_MISTAKES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const map = new Map<string, KanjiMistakeRecord>();
    for (const item of parsed) {
      const rec = normalizeRecord(item);
      if (rec) map.set(rec.kanji, rec);
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function saveLocalMistakeBank(records: KanjiMistakeRecord[]): void {
  try {
    const sorted = [...records]
      .sort((a, b) => {
        if (a.isMastered !== b.isMastered) return a.isMastered ? 1 : -1;
        if (b.mistakeCount !== a.mistakeCount) return b.mistakeCount - a.mistakeCount;
        return b.lastMistakeAt - a.lastMistakeAt;
      })
      .slice(0, MAX_LOCAL_RECORDS);

    localStorage.setItem(STORAGE_MISTAKES_KEY, JSON.stringify(sorted));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MISTAKE_BANK_UPDATED_EVENT, { detail: sorted }));
    }
  } catch {}
}

export function getActiveMistakes(records?: KanjiMistakeRecord[]): KanjiMistakeRecord[] {
  const list = records ?? loadLocalMistakeBank();
  return list
    .filter((r) => !r.isMastered && r.mistakeCount > 0)
    .sort((a, b) => {
      if (b.mistakeCount !== a.mistakeCount) return b.mistakeCount - a.mistakeCount;
      return b.lastMistakeAt - a.lastMistakeAt;
    });
}

let cloudMistakesPushTimer: number | null = null;

export function scheduleMistakeBankCloudPush(): void {
  if (typeof window === 'undefined') return;
  if (cloudMistakesPushTimer) window.clearTimeout(cloudMistakesPushTimer);
  cloudMistakesPushTimer = window.setTimeout(() => {
    cloudMistakesPushTimer = null;
    void pushMistakeBankToCloud();
  }, 1500);
}

export function recordKanjiMistake(
  kanjiChar: string,
  source: MistakeSource
): KanjiMistakeRecord[] {
  const clean = Array.from(kanjiChar || '').find((c) => isValidSingleKanji(c)) || '';
  if (!clean) return loadLocalMistakeBank();

  const now = Date.now();
  const list = loadLocalMistakeBank();
  const idx = list.findIndex((r) => r.kanji === clean);

  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      mistakeCount: prev.mistakeCount + 1,
      consecutiveCorrect: 0,
      srsHardCount: prev.srsHardCount + (source === 'srs' ? 1 : 0),
      quizWrongCount: prev.quizWrongCount + (source === 'quiz' || source === 'confusable' ? 1 : 0),
      writingFailCount: prev.writingFailCount + (source === 'writing' ? 1 : 0),
      isMastered: false,
      lastMistakeSource: source,
      lastMistakeAt: now,
      masteredAt: null,
      updatedAt: now,
    };
  } else {
    list.push({
      kanji: clean,
      mistakeCount: 1,
      consecutiveCorrect: 0,
      srsHardCount: source === 'srs' ? 1 : 0,
      quizWrongCount: source === 'quiz' || source === 'confusable' ? 1 : 0,
      writingFailCount: source === 'writing' ? 1 : 0,
      isMastered: false,
      lastMistakeSource: source,
      lastMistakeAt: now,
      masteredAt: null,
      updatedAt: now,
    });
  }

  saveLocalMistakeBank(list);
  scheduleMistakeBankCloudPush();
  return list;
}

export function recordKanjiSuccess(kanjiChar: string): KanjiMistakeRecord[] {
  const clean = Array.from(kanjiChar || '').find((c) => isValidSingleKanji(c)) || '';
  if (!clean) return loadLocalMistakeBank();

  const list = loadLocalMistakeBank();
  const idx = list.findIndex((r) => r.kanji === clean);
  if (idx < 0 || list[idx].isMastered) return list;

  const now = Date.now();
  const nextConsecutive = list[idx].consecutiveCorrect + 1;
  const mastered = nextConsecutive >= MASTER_STREAK_THRESHOLD;

  list[idx] = {
    ...list[idx],
    consecutiveCorrect: nextConsecutive,
    isMastered: mastered,
    masteredAt: mastered ? now : null,
    updatedAt: now,
  };

  saveLocalMistakeBank(list);
  scheduleMistakeBankCloudPush();
  return list;
}

export async function removeKanjiMistake(kanjiChar: string): Promise<KanjiMistakeRecord[]> {
  const list = loadLocalMistakeBank();
  const filtered = list.filter((r) => r.kanji !== kanjiChar);
  saveLocalMistakeBank(filtered);

  try {
    const token = await getSupabaseAccessToken();
    if (token) {
      await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'delete_kanji_mistake',
          kanji: kanjiChar,
        }),
      });
    }
  } catch {}

  return filtered;
}

export async function clearAllKanjiMistakes(): Promise<void> {
  saveLocalMistakeBank([]);
  try {
    const token = await getSupabaseAccessToken();
    if (token) {
      await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'clear_kanji_mistakes',
        }),
      });
    }
  } catch {}
}

export async function pushMistakeBankToCloud(): Promise<boolean> {
  try {
    const token = await getSupabaseAccessToken();
    if (!token) return false;
    const records = loadLocalMistakeBank();
    if (records.length === 0) return true;

    const res = await fetch('/api/community', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'upsert_kanji_mistakes',
        mistakes: records,
      }),
    });

    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data?.tableReady);
  } catch {
    return false;
  }
}

export async function syncMistakeBankFromCloud(): Promise<KanjiMistakeRecord[]> {
  const local = loadLocalMistakeBank();
  try {
    const token = await getSupabaseAccessToken();
    if (!token) return local;

    const res = await fetch('/api/community?action=my_kanji_mistakes', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return local;
    const data = await res.json().catch(() => null);
    if (!data?.tableReady || !Array.isArray(data?.mistakes)) return local;

    const mergedMap = new Map<string, KanjiMistakeRecord>();
    for (const l of local) {
      mergedMap.set(l.kanji, l);
    }

    for (const rawCloud of data.mistakes) {
      const c = normalizeRecord(rawCloud);
      if (!c) continue;
      const existing = mergedMap.get(c.kanji);
      if (!existing) {
        mergedMap.set(c.kanji, c);
      } else {
        const useCloudStatus = c.updatedAt >= existing.updatedAt;
        mergedMap.set(c.kanji, {
          kanji: c.kanji,
          mistakeCount: Math.max(existing.mistakeCount, c.mistakeCount),
          srsHardCount: Math.max(existing.srsHardCount, c.srsHardCount),
          quizWrongCount: Math.max(existing.quizWrongCount, c.quizWrongCount),
          writingFailCount: Math.max(existing.writingFailCount, c.writingFailCount),
          consecutiveCorrect: useCloudStatus ? c.consecutiveCorrect : existing.consecutiveCorrect,
          isMastered: useCloudStatus ? c.isMastered : existing.isMastered,
          lastMistakeSource:
            c.lastMistakeAt >= existing.lastMistakeAt
              ? c.lastMistakeSource
              : existing.lastMistakeSource,
          lastMistakeAt: Math.max(existing.lastMistakeAt, c.lastMistakeAt),
          masteredAt: useCloudStatus ? c.masteredAt : existing.masteredAt,
          updatedAt: Math.max(existing.updatedAt, c.updatedAt),
        });
      }
    }

    const merged = Array.from(mergedMap.values());
    saveLocalMistakeBank(merged);
    if (local.length > 0) {
      void pushMistakeBankToCloud();
    }
    return merged;
  } catch {
    return local;
  }
}
