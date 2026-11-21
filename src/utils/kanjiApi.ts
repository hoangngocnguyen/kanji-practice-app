import { KanjiDetail, KanjiExample } from '../types/kanji';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';
import { KanjiCatalogEntry, loadKanjiJoyoCatalog } from '../services/kanjiLevelService';

const cache = new Map<string, KanjiDetail>();
const inFlightDetailRequests = new Map<string, Promise<KanjiDetail>>();

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
    .filter((s) => Boolean(s) && !isPlaceholderKanjiText(s));
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
    rawMeanings.some((s) => isPlaceholderKanjiText(s));

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

        // Lấy thêm từ vựng ghép nếu có
        let examples: KanjiExample[] = local?.examples || [];
        if (examples.length === 0) {
          try {
            const wordsRes = await fetchWithTimeout(
              `https://kanjiapi.dev/v1/words/${encodeURIComponent(kanji)}`,
              6000
            );
            if (wordsRes.ok) {
              const wordsData = await wordsRes.json();
              if (Array.isArray(wordsData)) {
                examples = wordsData.slice(0, 5).map((w: any) => {
                  const written = w.variants?.[0]?.written || kanji;
                  const pronounced = w.variants?.[0]?.pronounced || '';
                  const meaning = w.meanings?.[0]?.glosses?.join(', ') || '';
                  const chars = Array.from(written);
                  const hvList = chars.map((c: any) => SINO_VIETNAMESE_MAP[c] || '').filter(Boolean);
                  const combinedHv = hvList.length > 0 ? hvList.join(' ') : '';

                  return {
                    word: written,
                    reading: pronounced,
                    hanViet: combinedHv,
                    meaning: meaning,
                  };
                });
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
