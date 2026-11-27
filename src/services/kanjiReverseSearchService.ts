import { KanjiDetail, KanjiItem } from '../types/kanji';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';
import { katakanaToHiragana } from '../utils/kanji';
import { isNoisyClassicalGloss } from '../utils/kanjiApi';
import {
  JlptLevel,
  KanjiCatalogEntry,
  loadKanjiJoyoCatalog,
} from './kanjiLevelService';

export type SearchLevelScope = JlptLevel | 'EXT';

export interface KanjiSearchDocument {
  kanji: string;
  level: SearchLevelScope;
  isJoyo: boolean;
  strokeCount: number;
  frequencyRank: number;
  hanViet: string;
  hanVietTokens: string[];
  hanVietTokensNorm: string[];
  meanings: string[];
  meaningClauses: string[];
  meaningClausesNorm: string[];
  meaningsJoinedNorm: string;
  on: string[];
  kun: string[];
  kanaNormList: string[];
  radical?: string;
  examples: KanjiDetail['examples'];
  hasMeaning: boolean;
}

export interface KanjiSearchResult {
  doc: KanjiSearchDocument;
  score: number;
  matchType: 'kanji' | 'hanviet' | 'meaning' | 'reading';
  matchedTerms: string[];
}

export interface SearchFilterOptions {
  level?: 'all' | 'JOYO' | SearchLevelScope;
  strokeRange?: 'all' | '1-6' | '7-12' | '13+';
  limit?: number;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt: chữ thường, đ -> d, bỏ dấu thanh & dấu mũ, gom khoảng trắng
 */
export function normalizeVietnameseText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLowerWithDiacritics(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[.,;:/()[\]{}"'!?~–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitMeaningsToClauses(meanings: string[]): string[] {
  const seen = new Set<string>();
  const clauses: string[] = [];

  for (const m of meanings) {
    if (!m) continue;
    // Bỏ ghi chú trong ngoặc đơn khi tách cụm chính, vẫn giữ một bản sạch
    const parts = m
      .split(/[,;/]+/)
      .map((p) => p.replace(/\([^)]*\)/g, '').trim())
      .filter(Boolean);

    for (const part of parts) {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        clauses.push(part);
      }
    }
  }

  return clauses;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWordBoundaryMatch(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  const regex = new RegExp(`(^|\\s)${escapeRegExp(needle)}(\\s|$)`);
  return regex.test(haystack);
}

let cachedIndex: KanjiSearchDocument[] | null = null;
let indexBuildPromise: Promise<KanjiSearchDocument[]> | null = null;

async function fetchVietnameseMeaningsMap(): Promise<Record<string, string[]>> {
  try {
    const res = await fetch('/data/kanji_meanings_vi.json');
    if (!res.ok) return {};
    const data = await res.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

/**
 * Xây dựng và cache bộ chỉ mục tìm kiếm hợp nhất 3.000+ Kanji (0ms sau lần nạp đầu)
 */
export async function loadUnifiedKanjiSearchIndex(): Promise<KanjiSearchDocument[]> {
  if (cachedIndex) return cachedIndex;
  if (indexBuildPromise) return indexBuildPromise;

  indexBuildPromise = Promise.all([
    loadKanjiJoyoCatalog().catch(() => [] as KanjiCatalogEntry[]),
    fetchVietnameseMeaningsMap(),
  ])
    .then(([joyoList, viMap]) => {
      const joyoMap = new Map<string, KanjiCatalogEntry>();
      for (const entry of joyoList) {
        if (entry?.c) joyoMap.set(entry.c, entry);
      }

      const allChars = new Set<string>();
      for (const entry of joyoList) allChars.add(entry.c);
      for (const char of Object.keys(viMap)) allChars.add(char);
      for (const char of Object.keys(KANJI_DICTIONARY)) allChars.add(char);
      for (const char of Object.keys(SINO_VIETNAMESE_MAP)) allChars.add(char);

      const docs: KanjiSearchDocument[] = [];

      allChars.forEach((char) => {
        if (!/\p{Script=Han}/u.test(char)) return;

        const joyo = joyoMap.get(char);
        const dict = KANJI_DICTIONARY[char];
        const viList = Array.isArray(viMap[char]) ? viMap[char] : [];

        // Gộp nghĩa tiếng Việt theo thứ tự ưu tiên: từ điển biên soạn -> Jōyō -> kanji_meanings_vi
        const mergedMeaningsRaw: string[] = [];
        const meaningSeen = new Set<string>();

        const pushMeaning = (m?: string) => {
          const clean = String(m || '').trim();
          if (!clean) return;
          if (
            clean.includes('Bấm "Xem nét') ||
            clean.startsWith('Âm Hán Việt:') ||
            clean.startsWith('Đang cập nhật') ||
            clean.startsWith('Chữ Kanji ') ||
            isNoisyClassicalGloss(clean)
          ) {
            return;
          }
          const normKey = clean.toLowerCase();
          if (!meaningSeen.has(normKey)) {
            meaningSeen.add(normKey);
            mergedMeaningsRaw.push(clean);
          }
        };

        if (dict?.meanings) dict.meanings.forEach(pushMeaning);
        if (joyo?.vi) joyo.vi.forEach(pushMeaning);
        viList.forEach(pushMeaning);

        const hasMeaning = mergedMeaningsRaw.length > 0;
        const rawHanViet =
          (joyo?.hv && joyo.hv !== 'HÁN VIỆT' ? joyo.hv : '') ||
          (dict?.hanViet && dict.hanViet !== 'HÁN VIỆT' ? dict.hanViet : '') ||
          SINO_VIETNAMESE_MAP[char] ||
          '';

        // Nếu ký tự hiếm không có nghĩa tiếng Việt lẫn âm Hán-Việt thì bỏ qua để chỉ mục tinh gọn
        if (!hasMeaning && !rawHanViet && !joyo) return;

        const hanVietTokens = rawHanViet
          .split(/[/,;]+/)
          .map((t) => t.trim())
          .filter(Boolean);
        const hanVietTokensNorm = hanVietTokens.map((t) => normalizeVietnameseText(t)).filter(Boolean);

        const meaningClauses = splitMeaningsToClauses(mergedMeaningsRaw);
        const meaningClausesNorm = meaningClauses
          .map((c) => normalizeVietnameseText(c))
          .filter(Boolean);

        const on =
          joyo?.on && joyo.on.length > 0
            ? joyo.on
            : dict?.on && !dict.on[0]?.startsWith('Đang cập nhật')
              ? dict.on
              : [];
        const kun =
          joyo?.kun && joyo.kun.length > 0
            ? joyo.kun
            : dict?.kun && !dict.kun[0]?.startsWith('Đang cập nhật')
              ? dict.kun
              : [];

        const kanaNormList = [...on, ...kun]
          .map((r) => katakanaToHiragana(r).replace(/[.\-]/g, '').trim().toLowerCase())
          .filter(Boolean);

        const validJlpt = ((): SearchLevelScope => {
          if (joyo?.lv) return joyo.lv;
          const dJlpt = dict?.jlpt;
          if (dJlpt === 'N5' || dJlpt === 'N4' || dJlpt === 'N3' || dJlpt === 'N2' || dJlpt === 'N1') {
            return dJlpt;
          }
          return 'EXT';
        })();

        docs.push({
          kanji: char,
          level: validJlpt,
          isJoyo: Boolean(joyo),
          strokeCount: joyo?.st || dict?.strokeCount || 0,
          frequencyRank: joyo?.fr ?? 9999,
          hanViet: rawHanViet,
          hanVietTokens,
          hanVietTokensNorm,
          meanings: mergedMeaningsRaw,
          meaningClauses,
          meaningClausesNorm,
          meaningsJoinedNorm: normalizeVietnameseText(mergedMeaningsRaw.join(' ')),
          on,
          kun,
          kanaNormList,
          radical: dict?.radical,
          examples: dict?.examples || [],
          hasMeaning,
        });
      });

      cachedIndex = docs;
      return docs;
    })
    .catch((err) => {
      indexBuildPromise = null;
      throw err;
    });

  return indexBuildPromise;
}

const JLPT_PRIORITY_BONUS: Record<SearchLevelScope, number> = {
  N5: 340,
  N4: 280,
  N3: 220,
  N2: 160,
  N1: 100,
  EXT: 0,
};

/**
 * Tìm kiếm ngược Kanji theo nghĩa tiếng Việt, Hán-Việt (không dấu + tách cụm từ), âm On/Kun hoặc chữ Kanji
 */
export function searchKanjiReverse(
  docs: KanjiSearchDocument[],
  rawQuery: string,
  options: SearchFilterOptions = {}
): KanjiSearchResult[] {
  const { level = 'all', strokeRange = 'all', limit = 250 } = options;

  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  // Tách truy vấn thành các cụm (ngăn bởi dấu phẩy / chấm phẩy) và từng từ khóa riêng lẻ
  const rawClauses = trimmed
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const clausesWithNorm = rawClauses
    .map((c) => ({
      raw: normalizeLowerWithDiacritics(c),
      norm: normalizeVietnameseText(c),
      tokensNorm: normalizeVietnameseText(c)
        .split(/\s+/)
        .filter((t) => t.length >= 1),
    }))
    .filter((c) => c.norm.length > 0);

  const kanjiCharsInQuery = Array.from(new Set(trimmed.match(/\p{Script=Han}/gu) || []));
  const queryKanaNorm = katakanaToHiragana(trimmed).replace(/[.\-\s]/g, '').toLowerCase();

  const allTokensNorm = Array.from(
    new Set(clausesWithNorm.flatMap((c) => c.tokensNorm))
  ).filter(Boolean);

  const isMultiClause = clausesWithNorm.length > 1;

  const scoredResults: KanjiSearchResult[] = [];

  for (const doc of docs) {
    // 1. Áp dụng bộ lọc cấp độ & số nét trước
    if (level === 'JOYO' && !doc.isJoyo) continue;
    if (level !== 'all' && level !== 'JOYO' && doc.level !== level) continue;

    if (strokeRange !== 'all') {
      const st = doc.strokeCount;
      if (st <= 0) continue;
      if (strokeRange === '1-6' && st > 6) continue;
      if (strokeRange === '7-12' && (st < 7 || st > 12)) continue;
      if (strokeRange === '13+' && st < 13) continue;
    }

    let score = 0;
    let primaryMatchType: KanjiSearchResult['matchType'] | null = null;
    const matchedTerms = new Set<string>();

    // A. Khớp trực tiếp ký tự Kanji
    if (kanjiCharsInQuery.includes(doc.kanji)) {
      score += 12000;
      primaryMatchType = 'kanji';
      matchedTerms.add(doc.kanji);
    }

    // B. Khớp âm On / Kun (Kana)
    if (queryKanaNorm && /[\u3040-\u30ff]/.test(queryKanaNorm)) {
      const kanaHit = doc.kanaNormList.some(
        (k) => k === queryKanaNorm || k.startsWith(queryKanaNorm)
      );
      if (kanaHit) {
        score += 1400;
        if (!primaryMatchType) primaryMatchType = 'reading';
        matchedTerms.add(trimmed);
      }
    }

    // C. Khớp theo từng cụm truy vấn (hỗ trợ cả dấu và không dấu)
    let matchedClausesCount = 0;

    for (const clause of clausesWithNorm) {
      let clauseScore = 0;
      let clauseType: KanjiSearchResult['matchType'] | null = null;

      // C1. Kiểm tra Hán-Việt (ưu tiên rất cao nếu khớp đúng 1 từ Hán-Việt như "nam")
      for (let i = 0; i < doc.hanVietTokens.length; i++) {
        const hvOrig = doc.hanVietTokens[i].toLowerCase();
        const hvNorm = doc.hanVietTokensNorm[i];
        if (!hvNorm) continue;

        if (hvOrig === clause.raw) {
          clauseScore = Math.max(clauseScore, 3600);
          clauseType = 'hanviet';
          matchedTerms.add(doc.hanVietTokens[i]);
        } else if (hvNorm === clause.norm) {
          clauseScore = Math.max(clauseScore, 2600);
          clauseType = 'hanviet';
          matchedTerms.add(doc.hanVietTokens[i]);
        } else if (
          clause.norm.length >= 2 &&
          (hvNorm.startsWith(clause.norm) || hasWordBoundaryMatch(hvNorm, clause.norm))
        ) {
          clauseScore = Math.max(clauseScore, 700);
          clauseType = 'hanviet';
          matchedTerms.add(doc.hanVietTokens[i]);
        }
      }

      // C2. Kiểm tra Nghĩa tiếng Việt theo từng mệnh đề nghĩa
      for (let i = 0; i < doc.meaningClauses.length; i++) {
        const mOrig = normalizeLowerWithDiacritics(doc.meaningClauses[i]);
        const mNorm = doc.meaningClausesNorm[i];
        if (!mNorm) continue;

        if (mOrig === clause.raw) {
          clauseScore = Math.max(clauseScore, 2500);
          clauseType = clauseType || 'meaning';
          matchedTerms.add(clause.raw);
        } else if (mNorm === clause.norm) {
          clauseScore = Math.max(clauseScore, 1900);
          clauseType = clauseType || 'meaning';
          matchedTerms.add(clause.norm);
        } else if (hasWordBoundaryMatch(mOrig, clause.raw)) {
          clauseScore = Math.max(clauseScore, 1450);
          clauseType = clauseType || 'meaning';
          matchedTerms.add(clause.raw);
        } else if (hasWordBoundaryMatch(mNorm, clause.norm)) {
          clauseScore = Math.max(clauseScore, 1050);
          clauseType = clauseType || 'meaning';
          matchedTerms.add(clause.norm);
        } else if (clause.norm.length >= 2 && mNorm.includes(clause.norm)) {
          clauseScore = Math.max(clauseScore, 420);
          clauseType = clauseType || 'meaning';
          matchedTerms.add(clause.norm);
        }
      }

      // C3. Nếu cụm có nhiều từ (vd: "con trai đàn ông") nhưng chưa khớp nguyên cụm liền kề, kiểm tra phủ đủ các từ thành phần
      if (clauseScore === 0 && clause.tokensNorm.length > 1) {
        const combinedSearchable = `${doc.hanVietTokensNorm.join(' ')} ${doc.meaningsJoinedNorm}`;
        let tokenHits = 0;
        for (const tk of clause.tokensNorm) {
          if (hasWordBoundaryMatch(combinedSearchable, tk)) {
            tokenHits++;
            matchedTerms.add(tk);
          }
        }
        if (tokenHits === clause.tokensNorm.length) {
          clauseScore = 1350;
          clauseType = 'meaning';
        } else if (isMultiClause && tokenHits > 0) {
          clauseScore = tokenHits * 180;
          clauseType = 'meaning';
        }
      }

      if (clauseScore > 0) {
        matchedClausesCount++;
        score += clauseScore;
        if (!primaryMatchType && clauseType) primaryMatchType = clauseType;
      }
    }

    // Thưởng lớn khi khớp nhiều cụm từ khóa người dùng liệt kê ("con trai, đàn ông")
    if (clausesWithNorm.length > 1 && matchedClausesCount > 1) {
      score += Math.round((matchedClausesCount / clausesWithNorm.length) * 1800);
    }

    // Fallback nhẹ nếu truy vấn gồm nhiều từ không có dấu phẩy và chỉ khớp 1 phần từ khóa dài
    if (score === 0 && !isMultiClause && allTokensNorm.length > 1) {
      const combinedSearchable = `${doc.hanVietTokensNorm.join(' ')} ${doc.meaningsJoinedNorm}`;
      let partialHits = 0;
      for (const tk of allTokensNorm) {
        if (tk.length >= 2 && hasWordBoundaryMatch(combinedSearchable, tk)) {
          partialHits++;
          matchedTerms.add(tk);
        }
      }
      if (partialHits >= Math.ceil(allTokensNorm.length * 0.6)) {
        score += partialHits * 140;
        primaryMatchType = 'meaning';
      }
    }

    if (score <= 0 || !primaryMatchType) continue;

    // D. Điểm cộng mức độ phổ biến / giáo trình (Jōyō + JLPT + tần suất báo chí + có nghĩa Việt đầy đủ)
    if (doc.hasMeaning) score += 500;
    if (doc.isJoyo) score += 350;
    score += JLPT_PRIORITY_BONUS[doc.level];
    if (doc.frequencyRank < 5000) {
      score += Math.max(0, 140 - Math.floor(doc.frequencyRank / 22));
    }

    scoredResults.push({
      doc,
      score,
      matchType: primaryMatchType,
      matchedTerms: Array.from(matchedTerms),
    });
  }

  scoredResults.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.doc.frequencyRank !== b.doc.frequencyRank) {
      return a.doc.frequencyRank - b.doc.frequencyRank;
    }
    return a.doc.strokeCount - b.doc.strokeCount;
  });

  return scoredResults.slice(0, limit);
}

/**
 * Chuyển kết quả tìm kiếm sang KanjiDetail chuẩn dùng cho PracticeModal và AddKanjiToDeckModal
 */
export function searchDocToKanjiDetail(doc: KanjiSearchDocument): KanjiDetail {
  return {
    kanji: doc.kanji,
    hanViet: doc.hanViet || 'HÁN VIỆT',
    meanings: doc.meanings.length > 0 ? doc.meanings : [doc.hanViet || doc.kanji],
    on: doc.on,
    kun: doc.kun,
    jlpt: doc.level === 'EXT' ? 'N1+' : doc.level,
    radical: doc.radical,
    strokeCount: doc.strokeCount > 0 ? doc.strokeCount : undefined,
    examples: doc.examples,
  };
}

/**
 * Chuyển kết quả tìm kiếm sang KanjiItem chuẩn để tải PNG hoặc mở PracticeModal
 */
export function searchDocToKanjiItem(doc: KanjiSearchDocument, index = 0): KanjiItem {
  const codePoint = doc.kanji.codePointAt(0) ?? doc.kanji.charCodeAt(0);
  const hex = codePoint.toString(16).toLowerCase().padStart(5, '0');
  return {
    id: index + 1,
    kanji: doc.kanji,
    hex,
    svgUrl: `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/${hex}.svg`,
    unicodeDecimal: codePoint,
    detail: searchDocToKanjiDetail(doc),
  };
}
