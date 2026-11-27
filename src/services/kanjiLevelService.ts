import { KanjiDetail, KanjiItem } from '../types/kanji';
import { getKanjiInfo, KANJI_DICTIONARY } from '../data/kanjiDictionary';

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
  kana?: string;
  furigana?: string;
  vi: string;
  source: 'static' | 'dictionary';
}

export interface StaticSentencePair {
  jp: string;
  kana?: string;
  vi: string;
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

// 100% Static Pre-Bundled Sentences (0ms runtime lookup, zero live API calls)
let staticSentencesPromise: Promise<Record<string, StaticSentencePair[]>> | null = null;
let cachedStaticSentences: Record<string, StaticSentencePair[]> | null = null;

export async function loadKanjiSentencesStatic(): Promise<Record<string, StaticSentencePair[]>> {
  if (cachedStaticSentences) return cachedStaticSentences;
  if (!staticSentencesPromise) {
    staticSentencesPromise = fetch('/data/kanji_sentences_static.json')
      .then((res) => {
        if (!res.ok) return {};
        return res.json();
      })
      .then((data: Record<string, StaticSentencePair[]>) => {
        cachedStaticSentences = data && typeof data === 'object' ? data : {};
        return cachedStaticSentences;
      })
      .catch(() => {
        staticSentencesPromise = null;
        return {};
      });
  }
  return staticSentencesPromise;
}

/**
 * Synchronous 0ms lookup of pre-bundled Japanese–Vietnamese example sentences.
 * Falls back cleanly to local compound phrases if an ultra-rare character lacks a sentence.
 */
export function getStaticSentencesForKanji(kanji: string, limit = 4): KanjiExampleSentence[] {
  const cleanChar = Array.from(kanji.trim())[0] || '';
  if (!cleanChar) return [];

  const rows = cachedStaticSentences?.[cleanChar];
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.slice(0, limit).map((pair, idx) => ({
      id: idx + 1,
      jp: pair.jp,
      kana: pair.kana,
      vi: pair.vi,
      source: 'static',
    }));
  }

  // Fallback to local KANJI_DICTIONARY compound examples if present
  const local = getKanjiInfo(cleanChar);
  if (local?.examples && local.examples.length > 0) {
    return local.examples.slice(0, limit).map((ex, idx) => ({
      id: 1000 + idx,
      jp: `${ex.word} (${ex.reading})`,
      vi: ex.meaning,
      source: 'dictionary',
    }));
  }

  return [];
}

export function catalogEntryToKanjiDetail(entry: KanjiCatalogEntry): KanjiDetail {
  const curatedDict = KANJI_DICTIONARY[entry.c];
  const localDict = curatedDict || getKanjiInfo(entry.c);
  const hanViet = entry.hv || localDict?.hanViet || 'Chưa rõ';
  const curatedMeanings =
    curatedDict?.meanings && curatedDict.meanings.length > 0 ? curatedDict.meanings : [];
  const meanings =
    curatedMeanings.length > 0
      ? curatedMeanings
      : entry.vi.length > 0
        ? entry.vi
        : localDict?.meanings || [];
  const on =
    curatedDict?.on && curatedDict.on.length > 0
      ? curatedDict.on
      : entry.on.length > 0
        ? entry.on
        : localDict?.on || [];
  const kun =
    curatedDict?.kun && curatedDict.kun.length > 0
      ? curatedDict.kun
      : entry.kun.length > 0
        ? entry.kun
        : localDict?.kun || [];

  return {
    kanji: entry.c,
    hanViet,
    meanings,
    on,
    kun,
    jlpt: entry.lv,
    radical: localDict?.radical && localDict.radical !== 'Bộ thủ' ? localDict.radical : undefined,
    strokeCount: entry.st || localDict?.strokeCount,
    examples: curatedDict?.examples || [],
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

/**
 * Parses Hrkt transcription like "[今日|こん|にち]は。"
 * into plain Japanese/reading chunks for clean UI display.
 */
export function formatTatoebaFuriganaPlain(hrkt?: string): string {
  if (!hrkt) return '';
  return hrkt.replace(/\[([^|\]]+)\|([^\]]+)\]/g, (_m, kanjiPart: string, readings: string) => {
    const kana = readings.replace(/\|/g, '');
    return `${kanjiPart}(${kana})`;
  });
}
