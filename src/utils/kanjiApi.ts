import { KanjiDetail, KanjiExample } from '../types/kanji';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';

const cache = new Map<string, KanjiDetail>();

export function isPlaceholderKanjiText(text?: string | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  return (
    trimmed.includes('Tra Mazii') ||
    trimmed.includes('Bấm "Xem nét') ||
    trimmed.includes('Bấm nút Mazii') ||
    trimmed === 'Chữ Hán tiếng Nhật' ||
    trimmed === 'HÁN VIỆT'
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
      viMeaningsCache = {};
      return {};
    });

  return viMeaningsPromise;
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
 * - Ưu tiên từ điển nội bộ KANJI_DICTIONARY (nếu có đủ ví dụ mẫu & âm đọc thật)
 * - Tự động tải nghĩa tiếng Việt chi tiết từ nguồn dữ liệu phân tách tĩnh (/data/kanji_meanings_vi.json)
 * - Kết hợp API kanjiapi.dev để lấy On/Kun, số nét, cấp độ JLPT, bộ thủ và ví dụ từ vựng ghép
 * - Tự động ánh xạ âm Hán-Việt từ siêu từ điển SINO_VIETNAMESE_MAP (hỗ trợ gần 10.000 chữ)
 */
export async function getFullKanjiDetail(kanji: string): Promise<KanjiDetail> {
  if (cache.has(kanji)) {
    return cache.get(kanji)!;
  }

  // 1. Nếu đã có trong từ điển tiếng Việt tích hợp sẵn với đầy đủ ví dụ & âm đọc thật
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

  const hanViet = SINO_VIETNAMESE_MAP[kanji] || (local ? local.hanViet : 'Chưa rõ');

  // 2. Tải song song nghĩa tiếng Việt tách riêng và API kanjiapi.dev
  let viMeanings: string[] = [];
  try {
    const meaningsMap = await loadVietnameseMeanings();
    if (meaningsMap && meaningsMap[kanji]) {
      viMeanings = cleanMeaningsList(meaningsMap[kanji]);
    }
  } catch {
    // Bỏ qua lỗi nạp nghĩa phụ
  }

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

      const finalMeanings =
        localCleanMeanings.length > 0
          ? localCleanMeanings
          : viMeanings.length > 0
          ? viMeanings
          : cleanMeaningsList(data.meanings);

      const merged: KanjiDetail = {
        kanji,
        hanViet,
        meanings: finalMeanings,
        on: Array.isArray(data.on_readings) && data.on_readings.length > 0 ? data.on_readings : localCleanOn,
        kun: Array.isArray(data.kun_readings) && data.kun_readings.length > 0 ? data.kun_readings : localCleanKun,
        jlpt: jlptStr || local?.jlpt,
        radical: data.radical || local?.radical,
        strokeCount: data.stroke_count || local?.strokeCount,
        examples,
      };

      cache.set(kanji, merged);
      return merged;
    }
  } catch (error) {
    console.warn('Lỗi kết nối kanjiapi.dev:', error);
  }

  // Fallback nếu mạng lỗi: không cache để có thể retry lại khi có mạng
  return {
    kanji,
    hanViet,
    meanings: localCleanMeanings.length > 0 ? localCleanMeanings : viMeanings,
    on: localCleanOn,
    kun: localCleanKun,
    jlpt: local?.jlpt,
    radical: local?.radical,
    strokeCount: local?.strokeCount,
    examples: local?.examples || [],
  };
}


