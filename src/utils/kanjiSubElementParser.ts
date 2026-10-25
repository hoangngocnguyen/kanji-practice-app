import { RadicalComponent, RadicalPositionType, KanjiDecomposition } from '../types/radical';
import { RADICALS_LIST, KANJI_DECOMPOSITIONS } from '../data/radicalsData';

const DECOMPOSITION_CACHE = new Map<string, KanjiDecomposition>();

/**
 * Trích xuất vị trí bộ thủ từ kvg:position
 */
function parsePositionType(positionStr?: string | null): { positionType: RadicalPositionType; positionName: string } {
  if (!positionStr) {
    return { positionType: 'center', positionName: 'Thành phần' };
  }

  const lower = positionStr.toLowerCase();
  if (lower.includes('left') || lower.includes('hen')) {
    return { positionType: 'hen', positionName: 'Bên trái (Hen)' };
  }
  if (lower.includes('right') || lower.includes('tsukuri')) {
    return { positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' };
  }
  if (lower.includes('top') || lower.includes('kanmuri')) {
    return { positionType: 'kanmuri', positionName: 'Phía trên (Kanmuri)' };
  }
  if (lower.includes('bottom') || lower.includes('ashi')) {
    return { positionType: 'ashi', positionName: 'Phía dưới (Ashi)' };
  }
  if (lower.includes('kamae') || lower.includes('enclosure')) {
    return { positionType: 'kamae', positionName: 'Bao quanh (Kamae)' };
  }
  if (lower.includes('tare')) {
    return { positionType: 'tare', positionName: 'Góc trên trái (Tare)' };
  }
  if (lower.includes('nyo')) {
    return { positionType: 'nyo', positionName: 'Góc dưới trái (Nyo)' };
  }

  return { positionType: 'center', positionName: 'Thành phần' };
}

/**
 * Tra cứu thông tin đầy đủ Hán Việt, Số nét, Nghĩa cho ký tự bộ thủ
 */
export function findRadicalInfo(char: string): { hanViet: string; meaning: string; strokeCount: number } {
  const match = RADICALS_LIST.find(
    (r) => r.character === char || (r.variant && r.variant.includes(char))
  );

  if (match) {
    return {
      hanViet: match.hanViet,
      meaning: match.meaning,
      strokeCount: match.strokeCount,
    };
  }

  // Common sub-component map fallback
  const COMPONENT_MAP: Record<string, { hanViet: string; meaning: string; strokeCount: number }> = {
    '厶': { hanViet: 'TƯ', meaning: 'Riêng tư, tự thân', strokeCount: 2 },
    '匕': { hanViet: 'CHỦY', meaning: 'Cái thìa, con dao nhỏ', strokeCount: 2 },
    '重': { hanViet: 'TRỌNG', meaning: 'Nặng nề, quan trọng', strokeCount: 9 },
    '式': { hanViet: 'THỨC', meaning: 'Công thức, quy tắc', strokeCount: 6 },
    '全': { hanViet: 'TOÀN', meaning: 'Hoàn toàn, đầy đủ', strokeCount: 6 },
    '良': { hanViet: 'LƯƠNG', meaning: 'Tốt lành, ngon lành', strokeCount: 7 },
    '交': { hanViet: 'GIAO', meaning: 'Giao lưu, kết bạn', strokeCount: 6 },
    '敬': { hanViet: 'KÍNH', meaning: 'Tôn kính, nghiêm túc', strokeCount: 12 },
    '曜': { hanViet: 'DIỆU', meaning: 'Rực rỡ, ngày trong tuần', strokeCount: 14 },
    '⺍': { hanViet: 'TRÚC', meaning: 'Ba chấm học tập', strokeCount: 3 },
    '売': { hanViet: 'MẠI', meaning: 'Bán hàng', strokeCount: 7 },
    '舌': { hanViet: 'THIỆT', meaning: 'Cái lưỡi', strokeCount: 6 },
    '五': { hanViet: 'NGŨ', meaning: 'Số 5', strokeCount: 4 },
  };

  if (COMPONENT_MAP[char]) {
    return COMPONENT_MAP[char];
  }

  return {
    hanViet: 'HÁN',
    meaning: 'Cấu phần chữ Hán',
    strokeCount: char.length > 0 ? char.length * 2 : 2,
  };
}

/**
 * Phân tích cây DOM XML KanjiVG SVG để bóc tách 100% tất cả các sub-elements
 */
export function parseKanjiVgSvgXml(xmlString: string, targetKanji: string): RadicalComponent[] {
  if (!xmlString) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'image/svg+xml');

    // Find all <g> elements with kvg:element attribute
    const gNodes = Array.from(doc.querySelectorAll('g'));
    const results: RadicalComponent[] = [];
    const seenMap = new Map<string, number>();

    gNodes.forEach((g) => {
      const elementVal = g.getAttribute('kvg:element') || g.getAttribute('element');
      if (!elementVal || elementVal === targetKanji) return;

      // Inherit position attribute from ancestor if missing on this node
      let posVal = g.getAttribute('kvg:position') || g.getAttribute('position');
      if (!posVal) {
        let parent = g.parentElement;
        while (parent && !posVal) {
          posVal = parent.getAttribute('kvg:position') || parent.getAttribute('position');
          parent = parent.parentElement;
        }
      }

      // Check if this g-node is nested inside another g-node with identical element character
      const isNestedDuplicate = Array.from(g.querySelectorAll('g')).some(
        (child) => (child.getAttribute('kvg:element') || child.getAttribute('element')) === elementVal
      );

      if (isNestedDuplicate) return;

      const { positionType, positionName } = parsePositionType(posVal);
      const info = findRadicalInfo(elementVal);

      // Track occurrences to handle repeated radicals (e.g., 2x 匕 in 能 or 2x 木 in 林)
      const count = (seenMap.get(elementVal) || 0) + 1;
      seenMap.set(elementVal, count);

      results.push({
        radical: elementCharWithIndex(elementVal, count),
        hanViet: info.hanViet,
        meaning: info.meaning,
        strokeCount: info.strokeCount,
        positionType,
        positionName,
      });
    });

    return results;
  } catch (err) {
    console.warn('Lỗi phân tích XML KanjiVG:', err);
    return [];
  }
}

function elementCharWithIndex(char: string, count: number): string {
  // Keep clean character representation
  return char;
}

/**
 * Tải file SVG KanjiVG trực tiếp từ CDN jsDelivr cho bất kỳ chữ Kanji nào (6000+ Kanji)
 */
export async function fetchKanjiVgSvg(kanji: string): Promise<string | null> {
  try {
    const codePoint = kanji.codePointAt(0);
    if (!codePoint) return null;

    const hex = codePoint.toString(16).padStart(5, '0');
    const url = `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/${hex}.svg`;

    const res = await fetch(url);
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    console.warn(`Không thể tải KanjiVG SVG cho chữ ${kanji}:`, e);
  }
  return null;
}

/**
 * Hàm bất đồng bộ tra cứu và bóc tách đầy đủ bộ thủ cho BẤT KỲ chữ Kanji nào (sử dụng KanjiVG CDN + local fallback)
 */
export async function fetchAndDecomposeKanji(
  kanji: string,
  hanVietName?: string
): Promise<KanjiDecomposition> {
  if (DECOMPOSITION_CACHE.has(kanji)) {
    return DECOMPOSITION_CACHE.get(kanji)!;
  }

  // 1. Local curated map
  if (KANJI_DECOMPOSITIONS[kanji]) {
    const dec = KANJI_DECOMPOSITIONS[kanji];
    DECOMPOSITION_CACHE.set(kanji, dec);
    return dec;
  }

  // 2. Fetch KanjiVG SVG online for 100% comprehensive coverage
  const svgText = await fetchKanjiVgSvg(kanji);
  if (svgText) {
    const extracted = parseKanjiVgSvgXml(svgText, kanji);
    if (extracted.length > 0) {
      const primaryRad = extracted[0];
      const storyParts = extracted.map((c) => `[${c.radical} - ${c.hanViet}: ${c.meaning}]`);

      const dec: KanjiDecomposition = {
        kanji,
        hanViet: hanVietName || 'HÁN',
        primaryRadical: `${primaryRad.radical} (${primaryRad.hanViet})`,
        components: extracted,
        mnemonicStory: `Ghi nhớ chữ ${kanji} (${hanVietName || ''}) bằng cách kết hợp các bộ thủ: ${storyParts.join(', ')}.`,
      };

      DECOMPOSITION_CACHE.set(kanji, dec);
      return dec;
    }
  }

  // 3. Fallback to Kangxi 214 list matching
  const matchingRadicals = RADICALS_LIST.filter(
    (r) =>
      r.character === kanji ||
      (r.variant && kanji.includes(r.variant)) ||
      r.examples.includes(kanji)
  );

  const primaryRadical =
    matchingRadicals.length > 0
      ? `${matchingRadicals[0].character} (${matchingRadicals[0].hanViet})`
      : 'Cơ bản';

  const components: RadicalComponent[] =
    matchingRadicals.length > 0
      ? matchingRadicals.map((r, idx) => ({
          radical: r.character,
          hanViet: r.hanViet,
          meaning: r.meaning,
          strokeCount: r.strokeCount,
          positionType: r.positionType || (idx === 0 ? 'hen' : 'tsukuri'),
          positionName: r.positionName || (idx === 0 ? 'Bên trái' : 'Thành phần'),
        }))
      : [
          {
            radical: kanji,
            hanViet: hanVietName || 'HÁN',
            meaning: 'Ký tự độc lập',
            strokeCount: kanji.length,
            positionType: 'center' as RadicalPositionType,
            positionName: 'Gốc',
          },
        ];

  const fallbackDec: KanjiDecomposition = {
    kanji,
    hanViet: hanVietName || 'HÁN',
    primaryRadical,
    components,
    mnemonicStory: `Mẹo nhớ cho chữ ${kanji} (${hanVietName || ''}): Liên tưởng kết hợp hình ảnh các nét bộ thủ để ghi nhớ lâu hơn.`,
  };

  DECOMPOSITION_CACHE.set(kanji, fallbackDec);
  return fallbackDec;
}
