import { KanjiDetail, KanjiItem } from '../types/kanji';
import { getKanjiInfo } from '../data/kanjiDictionary';

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type KanjiLevelTab = JlptLevel | 'JOYO';

export interface KanjiCatalogEntry {
  c: string;
  lv: JlptLevel;
  st: number;
  fr: number;
  on: string[];
  kun: string[];
  hv: string;
  vi: string[];
}

export interface KanjiExampleSentence {
  id: number;
  jp: string;
  furigana?: string;
  vi: string;
  source: string;
}

export interface LevelTabMeta {
  key: KanjiLevelTab;
  label: string;
  shortLabel: string;
  count: number;
  cumulativeLabel: string;
  desc: string;
}

export const LEVEL_METADATA: LevelTabMeta[] = [
  {
    key: 'N5',
    label: 'JLPT N5',
    shortLabel: 'N5',
    count: 111,
    cumulativeLabel: '111 chữ nền tảng',
    desc: 'Bộ chữ Hán sơ cấp chuẩn JLPT N5: số đếm, thời gian, gia đình, sinh hoạt.',
  },
  {
    key: 'N4',
    label: 'JLPT N4',
    shortLabel: 'N4',
    count: 216,
    cumulativeLabel: 'Tích lũy 327 chữ',
    desc: 'Chữ Hán sơ trung cấp thường gặp trong giao tiếp, công việc và đời sống.',
  },
  {
    key: 'N3',
    label: 'JLPT N3',
    shortLabel: 'N3',
    count: 376,
    cumulativeLabel: 'Tích lũy 703 chữ',
    desc: 'Cấp độ trung cấp để đọc báo chí, văn bản hành chính và tin tức phổ thông.',
  },
  {
    key: 'N2',
    label: 'JLPT N2',
    shortLabel: 'N2',
    count: 504,
    cumulativeLabel: 'Tích lũy 1.207 chữ',
    desc: 'Chữ Hán trung cao cấp dùng trong học thuật, xã hội và môi trường chuyên nghiệp.',
  },
  {
    key: 'N1',
    label: 'JLPT N1',
    shortLabel: 'N1',
    count: 929,
    cumulativeLabel: 'Hoàn thiện 2.136 chữ',
    desc: 'Phần nâng cao còn lại để hoàn thiện toàn bộ 2.136 chữ Jōyō Kanji chuẩn Bộ Giáo dục Nhật.',
  },
  {
    key: 'JOYO',
    label: 'Jōyō Kanji',
    shortLabel: '2.136',
    count: 2136,
    cumulativeLabel: 'Trọn bộ 2.136 chữ',
    desc: 'Toàn bộ 2.136 chữ Hán thường dùng chuẩn Jōyō sắp xếp từ cơ bản (N5) đến nâng cao (N1).',
  },
];

let catalogPromise: Promise<KanjiCatalogEntry[]> | null = null;
let cachedCatalog: KanjiCatalogEntry[] | null = null;

export async function loadKanjiJoyoCatalog(): Promise<KanjiCatalogEntry[]> {
  if (cachedCatalog) return cachedCatalog;
  if (!catalogPromise) {
    catalogPromise = fetch('/data/kanji_joyo_levels.json')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải dữ liệu Kanji theo cấp độ.');
        return res.json();
      })
      .then((data: KanjiCatalogEntry[]) => {
        cachedCatalog = Array.isArray(data) ? data : [];
        return cachedCatalog;
      })
      .catch((err) => {
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

export function catalogEntryToKanjiDetail(entry: KanjiCatalogEntry): KanjiDetail {
  const localDict = getKanjiInfo(entry.c);
  const hanViet = entry.hv || localDict?.hanViet || 'Chưa rõ';
  const meanings = entry.vi.length > 0 ? entry.vi : localDict?.meanings || [];
  const on = entry.on.length > 0 ? entry.on : localDict?.on || [];
  const kun = entry.kun.length > 0 ? entry.kun : localDict?.kun || [];

  return {
    kanji: entry.c,
    hanViet,
    meanings,
    on,
    kun,
    jlpt: entry.lv,
    radical: localDict?.radical,
    strokeCount: entry.st || localDict?.strokeCount,
    examples: localDict?.examples || [],
  };
}

export function catalogEntryToKanjiItem(entry: KanjiCatalogEntry, index: number): KanjiItem {
  const hex = entry.c.charCodeAt(0).toString(16).padStart(5, '0');
  return {
    id: index + 1,
    kanji: entry.c,
    hex,
    svgUrl: `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`,
    unicodeDecimal: entry.c.charCodeAt(0),
    detail: catalogEntryToKanjiDetail(entry),
  };
}

const EXAMPLE_STORAGE_KEY = 'kanji_example_sentences_v1';
const MAX_CACHED_KANJI_EXAMPLES = 260;

interface StoredExampleMap {
  [kanji: string]: {
    updatedAt: number;
    sentences: KanjiExampleSentence[];
  };
}

let memoryExampleMap: StoredExampleMap | null = null;
const inflightExampleRequests = new Map<string, Promise<KanjiExampleSentence[]>>();

function readStoredExamples(): StoredExampleMap {
  if (memoryExampleMap) return memoryExampleMap;
  try {
    const raw = localStorage.getItem(EXAMPLE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryExampleMap = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage read error
  }
  memoryExampleMap = {};
  return memoryExampleMap;
}

function writeStoredExamples(map: StoredExampleMap): void {
  const keys = Object.keys(map);
  if (keys.length > MAX_CACHED_KANJI_EXAMPLES) {
    // Keep most recently cached entries
    const sorted = keys.sort((a, b) => (map[b]?.updatedAt || 0) - (map[a]?.updatedAt || 0));
    const trimmed: StoredExampleMap = {};
    for (const k of sorted.slice(0, MAX_CACHED_KANJI_EXAMPLES)) {
      trimmed[k] = map[k];
    }
    memoryExampleMap = trimmed;
  } else {
    memoryExampleMap = map;
  }

  try {
    localStorage.setItem(EXAMPLE_STORAGE_KEY, JSON.stringify(memoryExampleMap));
  } catch {
    // Ignore quota exceeded
  }
}

export function getCachedKanjiExamples(kanji: string): KanjiExampleSentence[] | null {
  const store = readStoredExamples();
  const entry = store[kanji];
  if (!entry || !Array.isArray(entry.sentences)) return null;
  // Valid for 14 days if non-empty, 1 day if empty
  const ttl = entry.sentences.length > 0 ? 14 * 86400_000 : 86400_000;
  if (Date.now() - entry.updatedAt > ttl) return null;
  return entry.sentences;
}

export async function fetchKanjiExampleSentences(
  kanji: string,
  limit = 4,
  forceRefresh = false
): Promise<KanjiExampleSentence[]> {
  const cleanChar = Array.from(kanji.trim())[0] || '';
  if (!cleanChar) return [];

  if (!forceRefresh) {
    const cached = getCachedKanjiExamples(cleanChar);
    if (cached && cached.length > 0) return cached.slice(0, limit);
  }

  const inflightKey = `${cleanChar}:${limit}`;
  const existingPromise = inflightExampleRequests.get(inflightKey);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/translate?mode=examples&kanji=${encodeURIComponent(cleanChar)}&limit=${limit}`
      );
      if (!res.ok) throw new Error('Không thể tải câu ví dụ.');
      const data = await res.json();
      const sentences: KanjiExampleSentence[] = Array.isArray(data?.sentences)
        ? data.sentences
        : [];
      const store = readStoredExamples();
      writeStoredExamples({
        ...store,
        [cleanChar]: {
          updatedAt: Date.now(),
          sentences,
        },
      });
      return sentences;
    } catch {
      return getCachedKanjiExamples(cleanChar) || [];
    } finally {
      inflightExampleRequests.delete(inflightKey);
    }
  })();

  inflightExampleRequests.set(inflightKey, promise);
  return promise;
}

export async function prefetchExamplesForChars(
  chars: string[],
  limitPerChar = 2,
  concurrency = 3
): Promise<Record<string, KanjiExampleSentence[]>> {
  const unique = Array.from(new Set(chars.filter(Boolean)));
  const result: Record<string, KanjiExampleSentence[]> = {};
  let idx = 0;

  const worker = async () => {
    while (idx < unique.length) {
      const ch = unique[idx++];
      if (!ch) break;
      const sentences = await fetchKanjiExampleSentences(ch, limitPerChar);
      if (sentences.length > 0) {
        result[ch] = sentences;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, unique.length)) }, () => worker())
  );
  return result;
}

/**
 * Parses Tatoeba Hrkt transcription like "[今日|こん|にち]は。"
 * into plain Japanese/reading chunks for clean UI display.
 */
export function formatTatoebaFuriganaPlain(hrkt?: string): string {
  if (!hrkt) return '';
  return hrkt.replace(/\[([^|\]]+)\|([^\]]+)\]/g, (_m, kanjiPart: string, readings: string) => {
    const kana = readings.replace(/\|/g, '');
    return `${kanjiPart}(${kana})`;
  });
}
