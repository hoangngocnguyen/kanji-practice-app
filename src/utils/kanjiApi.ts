import { KanjiDetail, KanjiExample } from '../types/kanji';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';

const cache = new Map<string, KanjiDetail>();

/**
 * Tra cứu thông tin đầy đủ cho Kanji, kết hợp từ điển nội bộ và kanjiapi.dev
 */
export async function getFullKanjiDetail(kanji: string): Promise<KanjiDetail> {
  if (cache.has(kanji)) {
    return cache.get(kanji)!;
  }

  // 1. Nếu đã có trong từ điển tiếng Việt tích hợp sẵn
  const local = KANJI_DICTIONARY[kanji];
  if (local && local.examples.length > 0) {
    cache.set(kanji, local);
    return local;
  }

  const hanViet = SINO_VIETNAMESE_MAP[kanji] || (local ? local.hanViet : 'Chưa rõ');

  // 2. Thử truy vấn thêm từ API kanjiapi.dev để lấy đầy đủ âm On/Kun, số nét, JLPT, ví dụ từ vựng
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

      const merged: KanjiDetail = {
        kanji,
        hanViet,
        meanings: local?.meanings || data.meanings || [],
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
    meanings: local?.meanings || ['Chữ Hán tiếng Nhật'],
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
