import { KanjiDetail, KanjiExample } from '../types/kanji';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';
import { KanjiCatalogEntry, loadKanjiJoyoCatalog } from '../services/kanjiLevelService';

const cache = new Map<string, KanjiDetail>();
const inFlightDetailRequests = new Map<string, Promise<KanjiDetail>>();

const WORD_VI_CACHE_STORAGE_KEY = 'luyenkanji_word_vi_v1';
const wordViMemoryCache = new Map<string, string>();
let wordViStorageLoaded = false;

function ensureWordViCacheLoaded() {
  if (wordViStorageLoaded) return;
  wordViStorageLoaded = true;
  try {
    const raw = localStorage.getItem(WORD_VI_CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) {
          wordViMemoryCache.set(k, v.trim());
        }
      });
    }
  } catch {
    // Bỏ qua lỗi đọc localStorage
  }
}

function persistWordViCache() {
  try {
    const entries = Array.from(wordViMemoryCache.entries());
    const sliced = entries.length > 900 ? entries.slice(entries.length - 900) : entries;
    localStorage.setItem(WORD_VI_CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(sliced)));
  } catch {
    // Bỏ qua lỗi ghi localStorage
  }
}

function hasVietnameseDiacritics(text: string): boolean {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
    text
  );
}

function isLikelyEnglishGloss(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (hasVietnameseDiacritics(trimmed)) return false;
  // Chứa từ tiếng Anh thông thường (>= 2 chữ cái ASCII) và toàn ký tự ASCII cơ bản
  return /[a-zA-Z]{2,}/.test(trimmed) && /^[\x20-\x7E\u2013\u2014]+$/.test(trimmed);
}

function cleanEnglishGlossForTranslation(gloss: string): string {
  // Bỏ các ghi chú ngoặc đơn dài dòng kiểu "(Japanese)", "(e.g. ...)", "(item in ...)"
  let cleaned = gloss
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*[,;]\s*/g, '; ')
    .replace(/^[;\s]+|[;\s]+$/g, '')
    .trim();

  if (!cleaned) {
    cleaned = gloss.replace(/[()]/g, '').trim();
  }

  // Giới hạn tối đa 2 nghĩa đầu tiên để câu tiếng Việt ngắn gọn, tự nhiên
  const parts = cleaned
    .split(/[;,]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);

  return parts.join('; ');
}

function formatVietnameseGloss(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function selectCommonCompoundWords(
  wordsData: any[],
  targetKanji: string,
  limit = 6
): KanjiExample[] {
  const seenWords = new Set<string>();
  const scored: Array<{ score: number; example: KanjiExample }> = [];

  for (const entry of wordsData) {
    const variants = Array.isArray(entry?.variants) ? entry.variants : [];
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    if (variants.length === 0 || meanings.length === 0) continue;

    // Chọn variant phổ biến nhất có chứa chữ targetKanji
    let bestVariant: any = null;
    let bestVarScore = -Infinity;

    for (const v of variants) {
      const written = String(v?.written || '').trim();
      if (!written || !written.includes(targetKanji)) continue;
      const priorities = Array.isArray(v?.priorities) ? v.priorities : [];
      const len = Array.from(written).length;
      let vScore = priorities.length * 40;
      if (len >= 2 && len <= 4) vScore += 25;
      else if (len === 1) vScore += 5;
      else if (len >= 5) vScore -= (len - 4) * 20;

      if (vScore > bestVarScore) {
        bestVarScore = vScore;
        bestVariant = v;
      }
    }

    if (!bestVariant) continue;

    const written = String(bestVariant.written || '').trim();
    if (!written || seenWords.has(written)) continue;

    const pronounced = String(bestVariant.pronounced || '').trim();
    const glosses: string[] = Array.isArray(meanings[0]?.glosses)
      ? meanings[0].glosses.map((g: any) => String(g || '').trim()).filter(Boolean)
      : [];
    if (glosses.length === 0) continue;

    const rawGloss = glosses.slice(0, 2).join('; ');
    const chars = Array.from(written);
    const charLen = chars.length;
    const kanjiCount = chars.filter((c) => /\p{Script=Han}/u.test(c)).length;
    const priorities: string[] = Array.isArray(bestVariant.priorities)
      ? bestVariant.priorities
      : [];

    // Bỏ qua các cụm quá dài (>5 ký tự) nếu không có độ phổ biến cao
    if (charLen > 5 && priorities.length === 0) continue;

    let score = 0;
    if (priorities.length > 0) {
      score += 65 + Math.min(priorities.length, 3) * 20;
      if (priorities.includes('ichi1') || priorities.includes('news1')) {
        score += 30;
      }
    }

    // Ưu tiên từ ghép 2-4 chữ thực dụng
    if (charLen === 2) score += 45;
    else if (charLen === 3) score += 32;
    else if (charLen === 4) score += 18;
    else if (charLen === 1) score += 10;
    else if (charLen === 5) score -= 18;
    else score -= 70;

    if (kanjiCount >= 2 && kanjiCount <= 3) score += 12;

    // Ưu tiên từ có âm đọc kana sạch
    if (pronounced && /^[\u3040-\u30ffー]+$/.test(pronounced)) {
      score += 8;
    }

    // Hạ điểm thuật ngữ hành chính / quá chuyên ngành
    if (/electoral|defense program|defence program|ministry|cabinet/i.test(rawGloss)) {
      score -= 50;
    }

    seenWords.add(written);
    scored.push({
      score,
      example: {
        word: written,
        reading: pronounced,
        hanViet: '',
        meaning: rawGloss,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.example);
}

async function translateSingleCompoundExample(ex: KanjiExample): Promise<KanjiExample> {
  const word = (ex.word || '').trim();
  const rawMeaning = (ex.meaning || '').trim();
  if (!word) return ex;

  ensureWordViCacheLoaded();
  const cacheKey = `${word}::${rawMeaning}`;
  const cached = wordViMemoryCache.get(cacheKey);
  if (cached) {
    return { ...ex, hanViet: '', meaning: cached };
  }

  // Nếu đã là tiếng Việt (từ dữ liệu cục bộ), giữ nguyên và bỏ hanViet ghép
  if (rawMeaning && !isLikelyEnglishGloss(rawMeaning)) {
    return { ...ex, hanViet: '' };
  }

  const cleanedEn = cleanEnglishGlossForTranslation(rawMeaning);

  // 1. Dịch nghĩa tiếng Anh JMdict sang tiếng Việt qua Google Translate GTX (rất nhanh & chuẩn)
  if (cleanedEn) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(
        cleanedEn
      )}`;
      const res = await fetchWithTimeout(url, 4500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const vi = data[0]
            .map((chunk: any) => (chunk && chunk[0] ? chunk[0] : ''))
            .filter(Boolean)
            .join('')
            .trim();
          const formatted = formatVietnameseGloss(vi);
          if (formatted && !isLikelyEnglishGloss(formatted)) {
            wordViMemoryCache.set(cacheKey, formatted);
            persistWordViCache();
            return { ...ex, hanViet: '', meaning: formatted };
          }
        }
      }
    } catch {
      // Thử fallback tiếng Nhật bên dưới
    }
  }

  // 2. Fallback: Dịch trực tiếp từ tiếng Nhật sang tiếng Việt
  try {
    const jaUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(
      word
    )}`;
    const jaRes = await fetchWithTimeout(jaUrl, 4500);
    if (jaRes.ok) {
      const jaData = await jaRes.json();
      if (Array.isArray(jaData) && Array.isArray(jaData[0])) {
        const vi = jaData[0]
          .map((chunk: any) => (chunk && chunk[0] ? chunk[0] : ''))
          .filter(Boolean)
          .join('')
          .trim();
        const formatted = formatVietnameseGloss(vi);
        if (formatted) {
          wordViMemoryCache.set(cacheKey, formatted);
          persistWordViCache();
          return { ...ex, hanViet: '', meaning: formatted };
        }
      }
    }
  } catch {
    // Giữ nguyên nếu mất mạng
  }

  return { ...ex, hanViet: '' };
}

/**
 * Tự động dịch nghĩa tiếng Việt cho danh sách từ ghép và lưu cache vào localStorage
 */
export async function enrichCompoundExamplesVietnamese(
  examples: KanjiExample[]
): Promise<KanjiExample[]> {
  if (!Array.isArray(examples) || examples.length === 0) return [];
  return Promise.all(examples.map((ex) => translateSingleCompoundExample(ex)));
}

/**
 * Cập nhật lại cache từ ghép đã dịch tiếng Việt cho Kanji đang xem
 */
export function updateCachedKanjiExamples(kanji: string, examples: KanjiExample[]) {
  const existing = cache.get(kanji);
  if (existing) {
    cache.set(kanji, { ...existing, examples });
  }
}

export function isPlaceholderKanjiText(text?: string | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  return (
    trimmed.includes('Tra Mazii') ||
    trimmed.includes('Bấm "Xem nét') ||
    trimmed.includes('Bấm nút Mazii') ||
    trimmed.startsWith('Đang cập nhật') ||
    trimmed === 'Chữ Hán tiếng Nhật' ||
    trimmed === 'HÁN VIỆT' ||
    trimmed === 'Chưa rõ'
  );
}

export function isNoisyClassicalGloss(text?: string | null): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    /[\u4e00-\u9faf]/.test(trimmed) ||
    /\(xem:/i.test(trimmed) ||
    /tiếng xưng hô/i.test(trimmed) ||
    /từ xưng hô/i.test(trimmed) ||
    /Hán văn Nhật/i.test(trimmed) ||
    /xưa dùng như/i.test(trimmed) ||
    /giản thể của/i.test(trimmed) ||
    /phồn thể của/i.test(trimmed) ||
    /\bnhư chữ\b/i.test(trimmed) ||
    /Kinh Dịch/i.test(trimmed) ||
    /Nhị thập bát tú/i.test(trimmed)
  );
}

export function cleanReadingsList(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => String(s || '').trim())
    .filter((s) => Boolean(s) && !isPlaceholderKanjiText(s));
}

export function cleanMeaningsList(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => String(s || '').trim())
    .filter(
      (s) => Boolean(s) && !isPlaceholderKanjiText(s) && !isNoisyClassicalGloss(s)
    );
}

export function hasMissingKanjiData(item: {
  onReadings?: string[];
  kunReadings?: string[];
  meanings?: string[];
}): boolean {
  const rawOn = Array.isArray(item.onReadings) ? item.onReadings : [];
  const rawKun = Array.isArray(item.kunReadings) ? item.kunReadings : [];
  const rawMeanings = Array.isArray(item.meanings) ? item.meanings : [];

  const hasPlaceholderInRaw =
    rawOn.some((s) => isPlaceholderKanjiText(s)) ||
    rawKun.some((s) => isPlaceholderKanjiText(s)) ||
    rawMeanings.some((s) => isPlaceholderKanjiText(s) || isNoisyClassicalGloss(s));

  if (hasPlaceholderInRaw) return true;

  const cleanOn = cleanReadingsList(rawOn);
  const cleanKun = cleanReadingsList(rawKun);
  const cleanMeanings = cleanMeaningsList(rawMeanings);

  return (cleanOn.length === 0 && cleanKun.length === 0) || cleanMeanings.length === 0;
}

export function isKanjiDetailComplete(detail?: KanjiDetail | null): boolean {
  if (!detail) return false;
  if (
    hasMissingKanjiData({
      onReadings: detail.on,
      kunReadings: detail.kun,
      meanings: detail.meanings,
    })
  ) {
    return false;
  }
  return Boolean(detail.strokeCount && detail.strokeCount > 0);
}

export function sanitizeKanjiDetail(detail: KanjiDetail): KanjiDetail {
  const cleanOn = cleanReadingsList(detail.on);
  const cleanKun = cleanReadingsList(detail.kun);
  const cleanMeanings = cleanMeaningsList(detail.meanings);
  const cleanHanViet =
    detail.hanViet && !isPlaceholderKanjiText(detail.hanViet)
      ? detail.hanViet
      : SINO_VIETNAMESE_MAP[detail.kanji] || 'Chưa rõ';

  return {
    ...detail,
    hanViet: cleanHanViet,
    on: cleanOn,
    kun: cleanKun,
    meanings: cleanMeanings,
    radical:
      detail.radical && detail.radical !== 'Bộ thủ' ? detail.radical : undefined,
    examples: Array.isArray(detail.examples) ? detail.examples : [],
  };
}

export function mergeKanjiDetails(
  primary?: KanjiDetail | null,
  fallback?: KanjiDetail | null
): KanjiDetail | undefined {
  if (!primary && !fallback) return undefined;
  if (!primary) return fallback ? sanitizeKanjiDetail(fallback) : undefined;
  if (!fallback) return sanitizeKanjiDetail(primary);

  const p = sanitizeKanjiDetail(primary);
  const f = sanitizeKanjiDetail(fallback);

  const hanViet =
    p.hanViet && p.hanViet !== 'Chưa rõ'
      ? p.hanViet
      : f.hanViet && f.hanViet !== 'Chưa rõ'
      ? f.hanViet
      : SINO_VIETNAMESE_MAP[p.kanji] || 'Chưa rõ';

  return {
    kanji: p.kanji || f.kanji,
    hanViet,
    meanings: p.meanings.length > 0 ? p.meanings : f.meanings,
    on: p.on.length > 0 ? p.on : f.on,
    kun: p.kun.length > 0 ? p.kun : f.kun,
    jlpt: p.jlpt || f.jlpt,
    radical: p.radical || f.radical,
    strokeCount: p.strokeCount || f.strokeCount,
    examples: p.examples.length > 0 ? p.examples : f.examples,
  };
}

// Cache cho tệp nghĩa tiếng Việt được nạp bất đồng bộ để không làm nặng bundle chính
let viMeaningsCache: Record<string, string[]> | null = null;
let viMeaningsPromise: Promise<Record<string, string[]>> | null = null;

async function loadVietnameseMeanings(): Promise<Record<string, string[]>> {
  if (viMeaningsCache) return viMeaningsCache;
  if (viMeaningsPromise) return viMeaningsPromise;

  viMeaningsPromise = fetch('/data/kanji_meanings_vi.json')
    .then((res) => {
      if (res.ok) return res.json();
      return {};
    })
    .then((data) => {
      viMeaningsCache = data;
      return data;
    })
    .catch((err) => {
      console.warn('Không thể nạp từ điển nghĩa tiếng Việt động:', err);
      viMeaningsPromise = null;
      return {};
    });

  return viMeaningsPromise;
}

let catalogMapCache: Map<string, KanjiCatalogEntry> | null = null;
let catalogMapPromise: Promise<Map<string, KanjiCatalogEntry>> | null = null;

async function loadKanjiCatalogMap(): Promise<Map<string, KanjiCatalogEntry>> {
  if (catalogMapCache) return catalogMapCache;
  if (!catalogMapPromise) {
    catalogMapPromise = loadKanjiJoyoCatalog()
      .then((entries) => {
        const map = new Map<string, KanjiCatalogEntry>();
        for (const entry of entries) {
          if (entry?.c) {
            map.set(entry.c, entry);
          }
        }
        catalogMapCache = map;
        return map;
      })
      .catch(() => {
        catalogMapPromise = null;
        return new Map<string, KanjiCatalogEntry>();
      });
  }
  return catalogMapPromise;
}

function buildLocalDetailForChar(
  kanji: string,
  catalogEntry?: KanjiCatalogEntry,
  viMap?: Record<string, string[]>
): KanjiDetail | null {
  const local = KANJI_DICTIONARY[kanji];
  const localCleanOn = cleanReadingsList(local?.on);
  const localCleanKun = cleanReadingsList(local?.kun);
  const localCleanMeanings = cleanMeaningsList(local?.meanings);

  const catalogOn = cleanReadingsList(catalogEntry?.on);
  const catalogKun = cleanReadingsList(catalogEntry?.kun);
  const catalogMeanings = cleanMeaningsList(catalogEntry?.vi);
  const viMeanings = viMap?.[kanji] ? cleanMeaningsList(viMap[kanji]) : [];

  const on = localCleanOn.length > 0 ? localCleanOn : catalogOn;
  const kun = localCleanKun.length > 0 ? localCleanKun : catalogKun;
  const meanings =
    localCleanMeanings.length > 0
      ? localCleanMeanings
      : catalogMeanings.length > 0
      ? catalogMeanings
      : viMeanings;

  const hanViet =
    SINO_VIETNAMESE_MAP[kanji] ||
    (catalogEntry?.hv && !isPlaceholderKanjiText(catalogEntry.hv) ? catalogEntry.hv : '') ||
    (local?.hanViet && !isPlaceholderKanjiText(local.hanViet) ? local.hanViet : '') ||
    'Chưa rõ';

  const strokeCount = local?.strokeCount || catalogEntry?.st;
  const jlpt = local?.jlpt || catalogEntry?.lv;

  if (
    on.length === 0 &&
    kun.length === 0 &&
    meanings.length === 0 &&
    !strokeCount &&
    !jlpt
  ) {
    return null;
  }

  return {
    kanji,
    hanViet,
    meanings,
    on,
    kun,
    jlpt,
    radical: local?.radical && local.radical !== 'Bộ thủ' ? local.radical : undefined,
    strokeCount,
    examples: local?.examples || [],
  };
}

/**
 * Tra cứu siêu tốc theo lô từ dữ liệu tĩnh cục bộ (KANJI_DICTIONARY + 2.136 Jōyō Catalog + Meanings VI)
 * Giúp hiển thị ngay lập tức Âm On, Kun, Nghĩa, Số nét, JLPT cho hàng loạt Kanji mà không phụ thuộc API ngoài.
 */
export async function getQuickLocalKanjiDetails(
  chars: string[]
): Promise<Record<string, KanjiDetail>> {
  if (!chars.length) return {};

  const [catalogMap, viMap] = await Promise.all([
    loadKanjiCatalogMap().catch(() => new Map<string, KanjiCatalogEntry>()),
    loadVietnameseMeanings().catch(() => ({} as Record<string, string[]>)),
  ]);

  const result: Record<string, KanjiDetail> = {};
  for (const char of chars) {
    const built = buildLocalDetailForChar(char, catalogMap.get(char), viMap);
    if (built) {
      result[char] = built;
    }
  }
  return result;
}

async function fetchWithTimeout(url: string, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tra cứu thông tin đầy đủ cho Kanji:
 * - Ưu tiên từ điển nội bộ KANJI_DICTIONARY & 2.136 Jōyō Catalog + nghĩa tiếng Việt tĩnh
 * - Kết hợp API kanjiapi.dev để bổ sung On/Kun (cho chữ ngoài Jōyō), số nét, JLPT, bộ thủ và ví dụ từ vựng ghép
 * - Tự động ánh xạ âm Hán-Việt từ siêu từ điển SINO_VIETNAMESE_MAP
 */
export async function getFullKanjiDetail(kanji: string): Promise<KanjiDetail> {
  if (cache.has(kanji)) {
    return cache.get(kanji)!;
  }

  const existingPromise = inFlightDetailRequests.get(kanji);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async (): Promise<KanjiDetail> => {
    const local = KANJI_DICTIONARY[kanji];
    const localCleanOn = cleanReadingsList(local?.on);
    const localCleanKun = cleanReadingsList(local?.kun);
    const localCleanMeanings = cleanMeaningsList(local?.meanings);

    if (
      local &&
      local.examples &&
      local.examples.length > 0 &&
      (localCleanOn.length > 0 || localCleanKun.length > 0) &&
      localCleanMeanings.length > 0
    ) {
      cache.set(kanji, local);
      return local;
    }

    const [catalogMap, viMap] = await Promise.all([
      loadKanjiCatalogMap().catch(() => new Map<string, KanjiCatalogEntry>()),
      loadVietnameseMeanings().catch(() => ({} as Record<string, string[]>)),
    ]);

    const catalogEntry = catalogMap.get(kanji);
    const localBase = buildLocalDetailForChar(kanji, catalogEntry, viMap);
    const hanViet =
      localBase?.hanViet || SINO_VIETNAMESE_MAP[kanji] || 'Chưa rõ';

    try {
      const res = await fetchWithTimeout(
        `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`,
        7500
      );
      if (res.ok) {
        const data = await res.json();

        let jlptStr: string | undefined = undefined;
        if (data.jlpt) {
          jlptStr = `N${data.jlpt}`;
        }

        // Lấy thêm từ vựng ghép thông dụng nếu chưa có sẵn
        let examples: KanjiExample[] = (local?.examples || []).map((ex) => ({
          ...ex,
          hanViet: '',
        }));
        if (examples.length === 0) {
          try {
            const wordsRes = await fetchWithTimeout(
              `https://kanjiapi.dev/v1/words/${encodeURIComponent(kanji)}`,
              6000
            );
            if (wordsRes.ok) {
              const wordsData = await wordsRes.json();
              if (Array.isArray(wordsData)) {
                examples = selectCommonCompoundWords(wordsData, kanji, 6);
              }
            }
          } catch {
            // Bỏ qua lỗi lấy từ vựng phụ
          }
        }

        const apiOn = cleanReadingsList(data.on_readings);
        const apiKun = cleanReadingsList(data.kun_readings);
        const apiMeanings = cleanMeaningsList(data.meanings);

        const finalOn =
          localBase && localBase.on.length > 0 ? localBase.on : apiOn;
        const finalKun =
          localBase && localBase.kun.length > 0 ? localBase.kun : apiKun;
        const finalMeanings =
          localBase && localBase.meanings.length > 0 ? localBase.meanings : apiMeanings;

        const merged: KanjiDetail = {
          kanji,
          hanViet,
          meanings: finalMeanings,
          on: finalOn,
          kun: finalKun,
          jlpt: localBase?.jlpt || jlptStr,
          radical: data.radical || localBase?.radical,
          strokeCount: localBase?.strokeCount || data.stroke_count,
          examples,
        };

        cache.set(kanji, merged);
        return merged;
      }
    } catch (error) {
      console.warn('Lỗi kết nối kanjiapi.dev:', error);
    }

    // Fallback: trả về dữ liệu cục bộ (catalog + từ điển Việt) nếu có, không cache vào map nếu chưa có examples/API
    if (localBase) {
      return localBase;
    }

    return {
      kanji,
      hanViet,
      meanings: [],
      on: [],
      kun: [],
      jlpt: undefined,
      radical: undefined,
      strokeCount: undefined,
      examples: [],
    };
  })().finally(() => {
    inFlightDetailRequests.delete(kanji);
  });

  inFlightDetailRequests.set(kanji, promise);
  return promise;
}
