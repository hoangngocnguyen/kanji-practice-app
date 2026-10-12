import { KanjiDetail, KanjiExample } from '../types/kanji';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';

const cache = new Map<string, KanjiDetail>();

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

/**
 * Tra cứu thông tin đầy đủ cho Kanji:
 * - Ưu tiên từ điển nội bộ KANJI_DICTIONARY (nếu có đủ ví dụ mẫu)
 * - Tự động tải nghĩa tiếng Việt chi tiết từ nguồn dữ liệu phân tách tĩnh (/data/kanji_meanings_vi.json)
 * - Kết hợp API kanjiapi.dev để lấy On/Kun, số nét, cấp độ JLPT, bộ thủ và ví dụ từ vựng ghép
 * - Tự động ánh xạ âm Hán-Việt từ siêu từ điển SINO_VIETNAMESE_MAP (hỗ trợ gần 10.000 chữ)
 */
export async function getFullKanjiDetail(kanji: string): Promise<KanjiDetail> {
  if (cache.has(kanji)) {
    return cache.get(kanji)!;
  }

  // 1. Nếu đã có trong từ điển tiếng Việt tích hợp sẵn với đầy đủ ví dụ
  const local = KANJI_DICTIONARY[kanji];
  if (local && local.examples && local.examples.length > 0) {
    cache.set(kanji, local);
    return local;
  }

  const hanViet = SINO_VIETNAMESE_MAP[kanji] || (local ? local.hanViet : 'Chưa rõ');

  // 2. Tải song song nghĩa tiếng Việt tách riêng (không làm phình KANJI_DICTIONARY) và API kanjiapi.dev
  let viMeanings: string[] = [];
  try {
    const meaningsMap = await loadVietnameseMeanings();
    if (meaningsMap && meaningsMap[kanji]) {
      viMeanings = meaningsMap[kanji];
    }
  } catch {
    // Bỏ qua lỗi nạp nghĩa phụ
  }

  try {
    const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
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
          const wordsRes = await fetch(`https://kanjiapi.dev/v1/words/${encodeURIComponent(kanji)}`);
          if (wordsRes.ok) {
            const wordsData = await wordsRes.json();
            if (Array.isArray(wordsData)) {
              examples = wordsData.slice(0, 5).map((w: any) => {
                const written = w.variants?.[0]?.written || kanji;
                const pronounced = w.variants?.[0]?.pronounced || '';
                const meaning = w.meanings?.[0]?.glosses?.join(', ') || '';
                // Tìm âm Hán Việt cho từng chữ nếu có
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

      // Kết hợp nghĩa tiếng Việt ưu tiên: nếu có trong file nghĩa tiếng Việt thì dùng, nếu không fallback nghĩa tiếng Anh
      const finalMeanings =
        local?.meanings && local.meanings.length > 0
          ? local.meanings
          : viMeanings.length > 0
          ? viMeanings
          : data.meanings || [];

      const merged: KanjiDetail = {
        kanji,
        hanViet,
        meanings: finalMeanings,
        on: data.on_readings || local?.on || [],
        kun: data.kun_readings || local?.kun || [],
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

  // Fallback nếu không có mạng
  const fallback: KanjiDetail = {
    kanji,
    hanViet,
    meanings:
      local?.meanings || (viMeanings.length > 0 ? viMeanings : ['Chữ Hán tiếng Nhật']),
    on: local?.on || [],
    kun: local?.kun || [],
    jlpt: local?.jlpt,
    radical: local?.radical,
    strokeCount: local?.strokeCount,
    examples: local?.examples || [],
  };

  cache.set(kanji, fallback);
  return fallback;
}

