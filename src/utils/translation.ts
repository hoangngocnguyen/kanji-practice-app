/**
 * Dịch thuật câu tiếng Nhật sang tiếng Việt sử dụng MyMemory Translation API
 * Có bộ nhớ đệm (cache) trong memory và localStorage để tránh gọi lặp lại
 */

const translationCache = new Map<string, string>();

// Pre-seeded translations for sample presets
const PRESET_TRANSLATIONS: Record<string, string> = {
  '日本語能力試験（JLPT）で思い出す漢字の練習：日本人は漢字を毎日勉強する。一期一会、温故知新。':
    'Luyện tập chữ Hán thường gặp trong kỳ thi Năng lực tiếng Nhật (JLPT): Người Nhật học chữ Hán mỗi ngày. Đời người chỉ gặp một lần (Nhất kỳ nhất hội), ôn cũ biết mới (Ôn cố tri tân).',
  '七転び八起き。継続は力なり。初心忘るべからず。日進月歩で学問を修める。':
    'Bảy lần ngã, tám lần đứng dậy (Thất chuyển bát khởi). Kiên trì là sức mạnh. Đừng quên tâm nguyện ban đầu. Tiến bộ từng ngày trên con đường học vấn.',
  '一期一会、臥薪嘗胆、温故知新、弱肉強食、泰然自若、臨機応変、風林火山、十人十色。':
    'Đời người chỉ gặp một lần (Nhất kỳ nhất hội), nằm gai nếm mật, ôn cũ biết mới, cá lớn nuốt cá bé, điềm tĩnh tự tại, tùy cơ ứng biến, nhanh như gió tĩnh như rừng (Phong lâm hỏa sơn), mười người mười ý.',
  '日本語を勉強するとき、漢字の書き順や意味を理解することはとても大切です。日常の生活や仕事で使われる語彙を増やすために、毎日少しずつ練習しましょう。':
    'Khi học tiếng Nhật, việc hiểu rõ thứ tự nét viết và ý nghĩa của chữ Hán là vô cùng quan trọng. Để trau dồi vốn từ vựng dùng trong sinh hoạt và công việc hàng ngày, hãy chăm chỉ luyện tập mỗi ngày một chút.',
  '曖昧な返答を避け、躊躇することなく迅速かつ緻密に計画を推進する必要がある。脆弱、顕著、齟齬、洗練。':
    'Cần tránh những câu trả lời mơ hồ, thúc đẩy kế hoạch một cách nhanh chóng và tỉ mỉ mà không hề do dự. Mong manh, rõ rệt, bất đồng, tinh tế.',
};

/**
 * Dịch văn bản tiếng Nhật sang tiếng Việt
 */
export async function translateJapaneseToVietnamese(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. Kiểm tra cache có sẵn trong code
  if (PRESET_TRANSLATIONS[trimmed]) {
    return PRESET_TRANSLATIONS[trimmed];
  }

  // 2. Kiểm tra bộ nhớ đệm memory cache
  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed)!;
  }

  // 3. Kiểm tra localStorage cache
  try {
    const localKey = `kanji_trans_${trimmed.slice(0, 32)}_${trimmed.length}`;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      translationCache.set(trimmed, cached);
      return cached;
    }
  } catch {}

  // 4. Gọi API MyMemory
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=ja|vi`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data?.responseData?.translatedText) {
      let translated = data.responseData.translatedText;
      // Dọn dẹp ký tự HTML escape nếu có
      translated = translated
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      translationCache.set(trimmed, translated);
      try {
        const localKey = `kanji_trans_${trimmed.slice(0, 32)}_${trimmed.length}`;
        localStorage.setItem(localKey, translated);
      } catch {}

      return translated;
    }

    return 'Không nhận được dữ liệu dịch thuật phù hợp.';
  } catch (err: any) {
    console.warn('Lỗi khi dịch câu:', err);
    throw new Error('Không thể kết nối đến máy chủ dịch thuật. Vui lòng thử lại sau.');
  }
}
