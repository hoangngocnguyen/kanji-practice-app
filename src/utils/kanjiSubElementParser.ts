import { RadicalComponent, RadicalPositionType, KanjiDecomposition } from '../types/radical';
import { RADICALS_LIST, KANJI_DECOMPOSITIONS } from '../data/radicalsData';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';

const DECOMPOSITION_CACHE = new Map<string, KanjiDecomposition>();

// Extensive Sub-component Meaning Database for phonetic & semantic components
const COMPONENT_MEANINGS: Record<string, string> = {
  '可': 'Khả năng, có thể',
  '哥': 'Ca hát / Khúc ca, anh trai',
  '丁': 'Thành phần đinh, con trai, họ Đinh',
  '古': 'Xưa cũ, cổ kính',
  '寺': 'Chùa chiền',
  '青': 'Màu xanh, thanh xuân',
  '巴': 'Hình cuộn, nước Ba',
  '甫': 'Mới bắt đầu, phủ',
  '莫': 'Chớ, đừng, mạc',
  '且': 'Thêm vào đó, thả',
  '分': 'Phân chia, phần',
  '半': 'Một nửa',
  '生': 'Sinh sống, tươi mới',
  '立': 'Đứng thẳng, thiết lập',
  '主': 'Chủ nhân, làm chủ',
  '化': 'Biến hóa',
  '各': 'Mỗi, các',
  '合': 'Hợp lại, phù hợp',
  '同': 'Cùng nhau, đồng dạng',
  '成': 'Thành công, thành tựu',
  '咸': 'Đều, tất cả',
  '吉': 'Tốt lành, cát tường',
  '召': 'Triệu tập, gọi',
  '反': 'Trái lại, phản đối',
  '平': 'Bằng phẳng, hòa bình',
  '皮': 'Da thịt, vỏ ngoài',
  '申': 'Thân, trình bày, bật mí',
  '央': 'Ở giữa, trung ương',
  '加': 'Thêm vào, gia tăng',
  '句': 'Câu văn, câu thơ',
  '包': 'Bao bọc, gói lại',
  '由': 'Do bởi, nguyên do',
  '曲': 'Khúc ca, uốn cong',
  '史': 'Lịch sử, sử sách',
  '令': 'Mệnh lệnh, xinh đẹp',
  '冊': 'Quyển sách, tập',
  '司': 'Cơ quan, quản lý',
  '巨': 'To lớn, khổng lồ',
  '占': 'Chiếm giữ, bói toán',
  '付': 'Giao cho, đính kèm',
  '台': 'Cái bệ, cái đài',
  '代': 'Thay thế, thời đại',
  '以': 'Lấy, dùng làm',
  '正': 'Ngay ngắn, chính xác',
  '甘': 'Ngọt ngào, ngon',
  '求': 'Yêu cầu, tìm kiếm',
  '失': 'Mất mát, thất lạc',
  '末': 'Gốc ngọn, phần cuối',
  '未': 'Chưa xong, chưa đến',
  '亦': 'Cũng là, lại nữa',
  '兆': 'Điềm báo, triệu lẻ',
  '舟': 'Con thuyền, xuồng',
  '虫': 'Côn trùng, sâu bọ',
  '色': 'Màu sắc, vẻ mặt',
  '声': 'Âm thanh, tiếng nói',
  '告': 'Báo cáo, thông báo',
  '只': 'Chỉ có, độc nhất',
  '吾': 'Tôi, bản thân',
  '周': 'Xung quanh, chu kỳ',
  '味': 'Hương vị, thú vị',
  '垂': 'Rủ xuống, rủ bóng',
  '余': 'Dư thừa, tôi',
  '谷': 'Thung lũng',
  '束': 'Bó buộc, trói',
  '来': 'Đến, tương lai',
  '事': 'Công việc, sự việc',
  '具': 'Dụng cụ, đầy đủ',
  '非': 'Phi, không phải',
  '典': 'Từ điển, điển lễ',
  '免': 'Miễn trừ, tránh',
  '冒': 'Mạo hiểm, bốc lên',
  '制': 'Chế độ, kiểm soát',
  '協': 'Hiệp lực, hợp tác',
  '南': 'Phương nam',
  '厚': 'Dày dặn, nồng hậu',
  '原': 'Nguồn gốc, nguyên bản',
  '叔': 'Chú, bác',
  '取': 'Lấy, tiếp nhận',
  '受': 'Nhận lấy, chịu đựng',
  '叙': 'Diễn tả, kể lại',
  '尚': 'Tôn sùng, còn',
  '居': 'Cư trú, ở',
  '刷': 'In ấn, chùi',
  '券': 'Tấm vé, phiếu',
  '刺': 'Đâm, gai, thích',
  '刻': 'Khắc ghi, thời gian',
  '剃': 'Cạo tóc, cạo râu',
  '剪': 'Cắt tỉa',
  '前': 'Phía trước',
  '剖': 'Mổ xẻ, phẫu thuật',
  '剛': 'Cứng cỏi, kiên cường',
  '副': 'Phụ, trợ giúp',
  '剰': 'Thừa rải',
  '功': 'Công lao, thành công',
  '劣': 'Kém cỏi, yếu',
  '助': 'Giúp đỡ, viện trợ',
  '努': 'Cố gắng, nỗ lực',
  '励': 'Khích lệ, động viên',
  '労': 'Lao động, vất vả',
  '勢': 'Thế lực, đà',
  '勤': 'Chăm chỉ, làm việc',
  '勧': 'Khuyên bảo, khuyến khích',
  '匕': 'Cái thìa, con dao nhỏ',
  '厶': 'Riêng tư, tự thân',
  '重': 'Nặng nề, quan trọng',
  '式': 'Công thức, quy tắc',
  '全': 'Hoàn toàn, đầy đủ',
  '良': 'Tốt lành, ngon lành',
  '交': 'Giao lưu, kết bạn',
  '敬': 'Tôn kính, nghiêm túc',
  '曜': 'Rực rỡ, ngày trong tuần',
  '売': 'Bán hàng',
  '舌': 'Cái lưỡi',
  '五': 'Số 5',
  '⺍': 'Ba chấm học tập'
};

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
  // 1. Check in 214 Primary Kangxi Radicals
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

  // 2. Check in KANJI_DICTIONARY
  if (KANJI_DICTIONARY[char]) {
    const kData = KANJI_DICTIONARY[char];
    return {
      hanViet: kData.hanViet || (SINO_VIETNAMESE_MAP[char] || ''),
      meaning: Array.isArray(kData.meanings) ? kData.meanings.slice(0, 2).join(', ') : (kData.meanings || COMPONENT_MEANINGS[char] || ''),
      strokeCount: kData.strokeCount || 2,
    };
  }

  // 3. Check in SINO_VIETNAMESE_MAP (11,000+ Kanji)
  const hv = SINO_VIETNAMESE_MAP[char];
  if (hv) {
    return {
      hanViet: hv,
      meaning: COMPONENT_MEANINGS[char] || '',
      strokeCount: char.length > 0 ? char.length * 2 : 2,
    };
  }

  // 4. Default Fallback if completely unknown: Leave empty string
  return {
    hanViet: '',
    meaning: '',
    strokeCount: 2,
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

  const resolvedHv = hanVietName || SINO_VIETNAMESE_MAP[kanji] || '';

  // 2. Fetch KanjiVG SVG online for 100% comprehensive coverage
  const svgText = await fetchKanjiVgSvg(kanji);
  if (svgText) {
    const extracted = parseKanjiVgSvgXml(svgText, kanji);
    if (extracted.length > 0) {
      const primaryRad = extracted[0];
      const storyParts = extracted
        .filter((c) => c.meaning || c.hanViet)
        .map((c) => `[${c.radical}${c.hanViet ? ' - ' + c.hanViet : ''}${c.meaning ? ': ' + c.meaning : ''}]`);

      const dec: KanjiDecomposition = {
        kanji,
        hanViet: resolvedHv,
        primaryRadical: `${primaryRad.radical}${primaryRad.hanViet ? ' (' + primaryRad.hanViet + ')' : ''}`,
        components: extracted,
        mnemonicStory: `Ghi nhớ chữ ${kanji}${resolvedHv ? ' (' + resolvedHv + ')' : ''} bằng cách kết hợp các bộ thủ: ${storyParts.join(', ')}.`,
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
            hanViet: resolvedHv,
            meaning: '',
            strokeCount: kanji.length,
            positionType: 'center' as RadicalPositionType,
            positionName: 'Gốc',
          },
        ];

  const fallbackDec: KanjiDecomposition = {
    kanji,
    hanViet: resolvedHv,
    primaryRadical,
    components,
    mnemonicStory: `Mẹo nhớ cho chữ ${kanji}${resolvedHv ? ' (' + resolvedHv + ')' : ''}: Liên tưởng kết hợp hình ảnh các nét bộ thủ để ghi nhớ lâu hơn.`,
  };

  DECOMPOSITION_CACHE.set(kanji, fallbackDec);
  return fallbackDec;
}
