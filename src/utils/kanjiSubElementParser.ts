import { RadicalComponent, RadicalPositionType, KanjiDecomposition } from '../types/radical';
import { RADICALS_LIST, KANJI_DECOMPOSITIONS } from '../data/radicalsData';
import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';

const DECOMPOSITION_CACHE = new Map<string, KanjiDecomposition>();

/**
 * Bảng ánh xạ CJK Radical Supplement & Radical Variants (U+2E80..U+2EFF)
 * Quy đổi tất cả các biến thể ký tự bộ thủ KanjiVG về chữ Khang Hy chuẩn 100%
 */
export const CJK_RADICAL_VARIANTS: Record<string, string> = {
  // 羊 variants (DƯƠNG)
  '⺷': '羊', '⺶': '羊', '⺱': '羊', '⺲': '羊', '⺳': '羊',
  // 水 variants (THỦY - 氵, ⺡, 氺)
  '氵': '水', '⺡': '水', '氺': '水',
  // 火 variants (HỎA - 灬, ⺣)
  '灬': '火', '⺣': '火',
  // 艸 / 草 variants (THẢO - 艹, ⺾, ⺿, , ⻀)
  '艹': '艸', '⺾': '艸', '⺿': '艸', '': '艸', '⻀': '艸',
  // 犬 variants (KHUYỂN - 犭, ⺨)
  '犭': '犬', '⺨': '犬',
  // 人 variants (NHÂN - 亻, ⺅)
  '亻': '人', '⺅': '人',
  // 手 variants (THỦ - 扌)
  '扌': '手',
  // 心 variants (TÂM - 忄, ⺗)
  '忄': '心', '⺗': '心',
  // 示 variants (THỊ - 礻, ⺬)
  '礻': '示', '⺬': '示',
  // 衣 variants (Y - 衤)
  '衤': '衣',
  // 辵 / 辶 variants (SÁCH - 辶, ⻌, ⻍, ⻎)
  '辶': '辵', '⻌': '辵', '⻍': '辵', '⻎': '辵',
  // 邑 variants (ẤP - ⻏ bên phải)
  '⻏': '邑',
  // 阜 variants (PHỤ - ⻖ bên trái)
  '⻖': '阜',
  // 爪 variants (TRẢO - 爫, ⺍)
  '爫': '爪', '⺍': '爪',
  // 竹 variants (TRÚC - ⺮)
  '⺮': '竹',
  // 网 / 罒 variants (VÕNG - 罒, ⺴)
  '罒': '网', '⺴': '网',
  // 玉 / 王 variants (NGỌC - ⺩, 王)
  '⺩': '玉',
  // 老 variants (LÃO - 耂, ⺹)
  '耂': '老', '⺹': '老',
  // 肉 variants (NHỤC - ⺼)
  '⺼': '肉',
  // 刀 variants (ĐAO - 刂, ⺈)
  '刂': '刀', '⺈': '刀',
  // 攴 / 夂 variants (PHẠC - 攵, ⺙)
  '攵': '攴', '⺙': '攴',
  // 西 variants (TÂY - 覀, ⻃, ⻄)
  '覀': '西', '⻃': '西', '⻄': '西',
  // 言 variants (NGÔN - 訁, 讠)
  '訁': '言', '讠': '言',
  // 金 variants (KIM - 釒, ⻐)
  '釒': '金', '⻐': '金',
  // 食 variants (THỰC - 飠, ⻝, ⻞, ⻟)
  '飠': '食', '⻝': '食', '⻞': '食', '⻟': '食',
  // 車 variants (XA - ⻋)
  '⻋': '車',
  // 貝 variants (BỐI - ⻉)
  '⻉': '貝',
  // 足 variants (TÚC - ⻊)
  '⻊': '足',
  // 長 variants (TRƯỜNG - ⻑, ⻒, ⻓)
  '⻑': '長', '⻒': '長', '⻓': '長',
  // 門 variants (MÔN - ⻔)
  '⻔': '門',
  // 青 variants (THANH - ⻘)
  '⻘': '青',
  // 魚 variants (NGƯ - ⻥)
  '⻥': '魚',
  // 鳥 variants (ĐIỂU - ⻦)
  '⻦': '鳥',
  // 鹵 variants (LỖ - ⻧)
  '⻧': '鹵',
  // 麥 variants (MẠCH - ⻨)
  '⻨': '麥',
  // 黃 variants (HOÀNG - ⻩)
  '⻩': '黃',
  // 黍 variants (THỬ - ⻪)
  '⻪': '黍',
  // 齊 variants (TỀ - ⻫)
  '⻫': '齊',
  // 齒 variants (XỈ - ⻬, ⻭)
  '⻬': '齒', '⻭': '齒',
  // 龍 variants (LONG - ⻯, ⻰)
  '⻯': '龍', '⻰': '龍',
  // 龜 variants (QUY - ⻱, ⻲, ⻳)
  '⻱': '龜', '⻲': '龜', '⻳': '龜',
};

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
  '⺍': 'Ba chấm học tập',
  '寸': 'Thước tấc, đơn vị đo',
  '土': 'Đất đai, thổ nhưỡng',
  '目': 'Con mắt, nhìn ngắm',
  '儿': 'Tượng hình người đứng, chân người',
  '彳': 'Bước chân trái, bước đi ngắn',
  '亻': 'Hình người đứng (bộ Nhân đứng)',
  '言': 'Lời nói, ngôn ngữ',
  '口': 'Miệng, cổng vào',
  '手': 'Bàn tay',
  '扌': 'Tay (bộ Thủ gảy)',
  '心': 'Trái tim, tâm trí',
  '忄': 'Tâm đứng, tình cảm',
  '水': 'Nước, sông suối',
  '氵': 'Ba chấm thủy (nước)',
  '火': 'Ngọn lửa',
  '灬': 'Bốn chấm hỏa (lửa cháy)',
  '木': 'Cây cối, gỗ',
  '日': 'Mặt trời, ban ngày',
  '月': 'Mặt trăng, tháng, thịt',
  '女': 'Phụ nữ, con gái',
  '子': 'Đứa trẻ, con cái',
  '糸': 'Sợi tơ, sợi chỉ',
  '金': 'Kim loại, vàng, tiền',
  '門': 'Cổng lớn, cửa',
  '食': 'Ăn uống, thức ăn',
  '飠': 'Bộ Thực (thức ăn)',
  '馬': 'Con ngựa',
  '鳥': 'Con chim',
  '魚': 'Con cá',
  '羊': 'Con cừu, con dê có hai sừng cong: Sự hiền lành, cát tường tốt lành',
  '大': 'To lớn, vĩ đại, người dang rộng hai tay hai chân',
};

/**
 * Đọc thuộc tính XML an toàn không phụ thuộc namespace resolver
 */
export function getKvgAttr(el: Element, name: string): string | null {
  // 1. getAttribute trực tiếp với tiền tố
  const val1 = el.getAttribute(`kvg:${name}`);
  if (val1) return val1;

  // 2. getAttribute không có tiền tố
  const val2 = el.getAttribute(name);
  if (val2) return val2;

  // 3. Namespace lookup chuẩn W3C
  try {
    const val3 = el.getAttributeNS('http://kanjivg.tagaini.net', name);
    if (val3) return val3;
  } catch {
    // Ignore namespace lookup failure
  }

  // 4. Quét mảng attributes để tìm khớp localName hoặc kết thúc bằng :name
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (
        attr.name === `kvg:${name}` ||
        attr.localName === name ||
        attr.name.endsWith(`:${name}`)
      ) {
        return attr.value;
      }
    }
  }

  return null;
}

/**
 * Trích xuất vị trí bộ thủ từ chuỗi kvg:position
 */
export function parsePositionType(positionStr?: string | null): {
  positionType: RadicalPositionType;
  positionName: string;
} {
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
 * Tra cứu thông tin đầy đủ Hán Việt, Số nét chuẩn Khang Hy, Nghĩa cho ký tự bộ thủ.
 * Hỗ trợ nhận diện thông minh qua kvg:original, CJK Radical Variants và 214 Bộ thủ Khang Hy.
 */
export function findRadicalInfo(
  char: string,
  origChar?: string | null,
  rawElem?: string | null
): {
  hanViet: string;
  meaning: string;
  strokeCount: number;
} {
  const candidates = [
    origChar,
    char,
    rawElem,
    origChar ? CJK_RADICAL_VARIANTS[origChar] : null,
    char ? CJK_RADICAL_VARIANTS[char] : null,
    rawElem ? CJK_RADICAL_VARIANTS[rawElem] : null,
  ].filter((c): c is string => !!c && c.trim().length > 0);

  // 1. Thử tra các ký tự ứng viên trong 214 Bộ thủ Khang Hy
  for (const c of candidates) {
    const match = RADICALS_LIST.find(
      (r) =>
        r.character === c ||
        r.variant === c ||
        (r.variant && r.variant.includes(c))
    );
    if (match) {
      return {
        hanViet: match.hanViet,
        meaning: match.meaning,
        strokeCount: match.strokeCount,
      };
    }
  }

  // 2. Thử tra trong KANJI_DICTIONARY
  for (const c of candidates) {
    if (KANJI_DICTIONARY[c]) {
      const kData = KANJI_DICTIONARY[c];
      const meanStr = Array.isArray(kData.meanings)
        ? kData.meanings.slice(0, 2).join(', ')
        : kData.meanings || COMPONENT_MEANINGS[c] || '';
      return {
        hanViet: kData.hanViet || SINO_VIETNAMESE_MAP[c] || '',
        meaning: meanStr,
        strokeCount: kData.strokeCount || 2,
      };
    }
  }

  // 3. Thử tra trong SINO_VIETNAMESE_MAP (11,000+ Kanji)
  for (const c of candidates) {
    const hv = SINO_VIETNAMESE_MAP[c];
    if (hv) {
      return {
        hanViet: hv,
        meaning: COMPONENT_MEANINGS[c] || '',
        strokeCount: c.length > 0 ? c.length * 2 : 2,
      };
    }
  }

  // 4. Thử tra trong danh mục ý nghĩa thành phần phụ trợ
  for (const c of candidates) {
    if (COMPONENT_MEANINGS[c]) {
      return {
        hanViet: '',
        meaning: COMPONENT_MEANINGS[c],
        strokeCount: 2,
      };
    }
  }

  // 5. Mặc định
  return {
    hanViet: '',
    meaning: '',
    strokeCount: 2,
  };
}

/**
 * Trích xuất danh sách số thứ tự nét và tổng số path từ thẻ Element
 */
function extractPathStats(el: Element): { count: number; indices: number[] } {
  const paths = Array.from(el.querySelectorAll('path'));
  const indices: number[] = [];

  paths.forEach((p) => {
    const id = p.getAttribute('id') || '';
    const match = id.match(/-s(\d+)$/);
    if (match) {
      indices.push(parseInt(match[1], 10));
    }
  });

  indices.sort((a, b) => a - b);
  return {
    count: paths.length,
    indices,
  };
}

/**
 * Phân tích cây DOM XML KanjiVG SVG với thuật toán phân tầng đa cấp (Cấp 1 trực tiếp, Cấp 2, Cấp 3)
 * và nhận diện chuẩn xác thuộc tính kvg:radical="general" & kvg:original
 */
export function parseKanjiVgSvgXml(
  xmlString: string,
  targetKanji: string
): {
  isSelfRadical: boolean;
  primaryRadicalName: string;
  directComponents: RadicalComponent[];
  allComponents: RadicalComponent[];
} {
  if (!xmlString) {
    return {
      isSelfRadical: false,
      primaryRadicalName: '',
      directComponents: [],
      allComponents: [],
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'image/svg+xml');

    // Tìm thẻ <g> gốc của chữ Kanji
    const hex = targetKanji.codePointAt(0)?.toString(16).toLowerCase().padStart(5, '0') || '';
    let rootGroup: Element | null =
      doc.querySelector(`g[id="kvg:${hex}"]`) ||
      doc.querySelector(`g[id="kvg:${hex}-g"]`) ||
      doc.querySelector(`g[element="${targetKanji}"]`);

    if (!rootGroup) {
      const allGs = Array.from(doc.querySelectorAll('g'));
      rootGroup = allGs.find((g) => getKvgAttr(g, 'element') === targetKanji) || null;
    }

    if (!rootGroup) {
      const strokeContainer = doc.querySelector('g[id^="kvg:StrokePaths_"]') || doc.querySelector('svg > g');
      if (strokeContainer && strokeContainer.children.length > 0) {
        rootGroup = strokeContainer.children[0] as Element;
      }
    }

    if (!rootGroup) {
      return {
        isSelfRadical: false,
        primaryRadicalName: '',
        directComponents: [],
        allComponents: [],
      };
    }

    // 1. Kiểm tra xem bản thân chữ gốc có phải là bộ thủ chính độc lập không
    const rootRadicalAttr = getKvgAttr(rootGroup, 'radical');
    const isSelfRadical = rootRadicalAttr === 'general';

    // 2. Hàm đệ quy duyệt bóc tách các nhóm <g> con theo tầng (Depth 1, 2, 3)
    function extractSubComponents(
      parentEl: Element,
      currentDepth: number,
      inheritedPos?: string | null
    ): RadicalComponent[] {
      if (currentDepth > 3) return [];

      const childNodes = Array.from(parentEl.children).filter(
        (c) => c.tagName.toLowerCase() === 'g'
      );
      const results: RadicalComponent[] = [];

      for (const g of childNodes) {
        const elemAttr = getKvgAttr(g, 'element');
        const origAttr = getKvgAttr(g, 'original');
        const varAttr = getKvgAttr(g, 'variant');
        const posAttr = getKvgAttr(g, 'position') || inheritedPos;
        const radAttr = getKvgAttr(g, 'radical');
        const isPrimary = radAttr === 'general';

        if (elemAttr || origAttr) {
          const rawElem = elemAttr || origAttr || '';
          // Ưu tiên kvg:original (ví dụ 羊 thay vì ⺷) hoặc quy đổi qua CJK_RADICAL_VARIANTS
          const canonicalChar = origAttr || CJK_RADICAL_VARIANTS[rawElem] || rawElem;

          // Bỏ qua trường hợp thẻ con lồng nhau trùng chính xác ký tự chữ đích ở cấp 1
          if (
            (rawElem === targetKanji || canonicalChar === targetKanji) &&
            currentDepth === 1
          ) {
            results.push(...extractSubComponents(g, currentDepth, posAttr));
            continue;
          }

          const { positionType, positionName } = parsePositionType(posAttr);
          const radicalInfo = findRadicalInfo(canonicalChar, origAttr, rawElem);
          const pathStats = extractPathStats(g);

          // Phân rã sâu hơn cấp 2 và cấp 3
          const subComponents = extractSubComponents(g, currentDepth + 1, posAttr);

          // Kiểm tra xem trong các con có nhánh nào mang kvg:radical="general" không
          const hasChildPrimary = subComponents.some(
            (c) => c.isPrimaryRadical || (c.subComponents && c.subComponents.some((sc) => sc.isPrimaryRadical))
          );

          results.push({
            radical: canonicalChar, // Ký tự chuẩn hóa (vd: 羊 thay vì ký tự biến thể ⺷)
            variant: rawElem !== canonicalChar ? rawElem : (varAttr || undefined),
            hanViet: radicalInfo.hanViet,
            meaning: radicalInfo.meaning,
            strokeCount: radicalInfo.strokeCount, // Số nét chuẩn 214 bộ thủ Khang Hy
            actualPathCount: pathStats.count,      // Số nét đồ họa thực tế từ thẻ <path>
            pathIndices: pathStats.indices,
            positionType,
            positionName,
            isPrimaryRadical: isPrimary || hasChildPrimary,
            depth: currentDepth,
            subComponents: subComponents.length > 0 ? subComponents : undefined,
          });
        } else {
          // Thẻ <g> chỉ dùng để gom nhóm bố cục/vị trí (không có kvg:element)
          // Kế thừa vị trí xuống các thẻ con
          results.push(...extractSubComponents(g, currentDepth, posAttr));
        }
      }

      return results;
    }

    // Trích xuất thành phần trực tiếp cấp 1
    const directComponents = extractSubComponents(rootGroup, 1);

    // Thu thập danh sách phẳng tất cả các thành phần lá và cấp 1 cho tương thích ngược
    const allComponents: RadicalComponent[] = [];
    function collectFlat(list: RadicalComponent[]) {
      for (const comp of list) {
        allComponents.push(comp);
        if (comp.subComponents) {
          collectFlat(comp.subComponents);
        }
      }
    }
    collectFlat(directComponents);

    // Xác định tên Bộ thủ chính
    let primaryRadicalName = '';
    if (isSelfRadical) {
      const rootInfo = findRadicalInfo(targetKanji);
      primaryRadicalName = `${targetKanji}${rootInfo.hanViet ? ' (' + rootInfo.hanViet + ' - Bản thân là bộ thủ độc lập)' : ' (Bản thân là bộ thủ độc lập)'}`;
    } else {
      const primaryComp =
        directComponents.find((c) => c.isPrimaryRadical) ||
        allComponents.find((c) => c.isPrimaryRadical);

      if (primaryComp) {
        primaryRadicalName = `${primaryComp.radical}${primaryComp.hanViet ? ' (' + primaryComp.hanViet + ')' : ''}`;
      } else {
        // Fallback tra cứu trong danh sách 214 bộ thủ
        const matched = RADICALS_LIST.find((r) =>
          directComponents.some((c) => c.radical === r.character || (r.variant && r.variant.includes(c.radical)))
        );
        if (matched) {
          primaryRadicalName = `${matched.character} (${matched.hanViet})`;
        } else if (directComponents.length > 0) {
          primaryRadicalName = `${directComponents[0].radical}${directComponents[0].hanViet ? ' (' + directComponents[0].hanViet + ')' : ''}`;
        }
      }
    }

    return {
      isSelfRadical,
      primaryRadicalName,
      directComponents,
      allComponents: directComponents.length > 0 ? directComponents : allComponents,
    };
  } catch (err) {
    console.warn('Lỗi phân tích XML KanjiVG:', err);
    return {
      isSelfRadical: false,
      primaryRadicalName: '',
      directComponents: [],
      allComponents: [],
    };
  }
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

  // 1. Kiểm tra cấu hình có sẵn trong KANJI_DECOMPOSITIONS
  if (KANJI_DECOMPOSITIONS[kanji]) {
    const dec = KANJI_DECOMPOSITIONS[kanji];
    DECOMPOSITION_CACHE.set(kanji, dec);
    return dec;
  }

  const resolvedHv = hanVietName || SINO_VIETNAMESE_MAP[kanji] || '';

  // 2. Fetch KanjiVG SVG online và phân tích cây XML chính xác
  const svgText = await fetchKanjiVgSvg(kanji);
  if (svgText) {
    const { isSelfRadical, primaryRadicalName, directComponents, allComponents } =
      parseKanjiVgSvgXml(svgText, kanji);

    if (directComponents.length > 0 || allComponents.length > 0) {
      const activeComponents = directComponents.length > 0 ? directComponents : allComponents;
      const storyParts = activeComponents
        .filter((c) => c.meaning || c.hanViet)
        .map(
          (c) =>
            `[${c.radical}${c.hanViet ? ' - ' + c.hanViet : ''}${c.meaning ? ': ' + c.meaning : ''}]`
        );

      const dec: KanjiDecomposition = {
        kanji,
        hanViet: resolvedHv,
        primaryRadical: primaryRadicalName || (activeComponents[0]?.radical || 'Cơ bản'),
        isSelfRadical,
        directComponents,
        components: activeComponents,
        mnemonicStory:
          storyParts.length > 0
            ? `Ghi nhớ chữ ${kanji}${resolvedHv ? ' (' + resolvedHv + ')' : ''} bằng cách kết hợp các bộ phận: ${storyParts.join(', ')}.`
            : `Chữ ${kanji}${resolvedHv ? ' (' + resolvedHv + ')' : ''} cấu tạo từ các bộ phận: ${activeComponents.map((c) => c.radical).join(', ')}.`,
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
          actualPathCount: r.strokeCount,
          positionType: r.positionType || (idx === 0 ? 'hen' : 'tsukuri'),
          positionName: r.positionName || (idx === 0 ? 'Bên trái' : 'Thành phần'),
          isPrimaryRadical: idx === 0,
          depth: 1,
        }))
      : [
          {
            radical: kanji,
            hanViet: resolvedHv,
            meaning: '',
            strokeCount: kanji.length,
            actualPathCount: kanji.length,
            positionType: 'center' as RadicalPositionType,
            positionName: 'Gốc',
            isPrimaryRadical: true,
            depth: 1,
          },
        ];

  const fallbackDec: KanjiDecomposition = {
    kanji,
    hanViet: resolvedHv,
    primaryRadical,
    isSelfRadical: matchingRadicals.some((r) => r.character === kanji),
    directComponents: components,
    components,
    mnemonicStory: `Mẹo nhớ cho chữ ${kanji}${resolvedHv ? ' (' + resolvedHv + ')' : ''}: Liên tưởng kết hợp hình ảnh các nét bộ thủ để ghi nhớ lâu hơn.`,
  };

  DECOMPOSITION_CACHE.set(kanji, fallbackDec);
  return fallbackDec;
}
