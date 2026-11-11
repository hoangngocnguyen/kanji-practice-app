import { extractUniqueKanji } from './kanji';

export interface ParsedCompoundWordInput {
  word: string;
  reading: string;
  hanViet: string;
  meaning: string;
}

export interface ParsedLessonItemInput {
  kanji: string;
  hanViet?: string;
  meanings?: string[];
  compoundWords: ParsedCompoundWordInput[];
}

export interface ParseBatchResult {
  items: ParsedLessonItemInput[];
  errors: string[];
}

export const SAMPLE_MINIMAL_JSON = {
  items: [
    {
      kanji: '日',
      compoundWords: [
        {
          word: '日本',
          reading: 'にほん',
          hanViet: 'NHẬT BẢN',
          meaning: 'Nước Nhật Bản',
        },
        {
          word: '今日',
          reading: 'きょう',
          hanViet: 'KIM NHẬT',
          meaning: 'Hôm nay',
        },
      ],
    },
    {
      kanji: '学',
      compoundWords: [
        {
          word: '学生',
          reading: 'がくせい',
          hanViet: 'HỌC SINH',
          meaning: 'Học sinh, sinh viên',
        },
        {
          word: '大学',
          reading: 'だいがく',
          hanViet: 'ĐẠI HỌC',
          meaning: 'Trường đại học',
        },
      ],
    },
  ],
};

export const AI_JSON_PROMPT_TEMPLATE = `Hãy tạo danh sách từ ghép cho các chữ Kanji: [ĐIỀN DANH SÁCH KANJI HOẶC CHỦ ĐỀ VÀO ĐÂY].

Chỉ trả về JSON thuần (không giải thích thêm) theo đúng cấu trúc tối giản sau:
{
  "items": [
    {
      "kanji": "日",
      "compoundWords": [
        {
          "word": "日本",
          "reading": "にほん",
          "hanViet": "NHẬT BẢN",
          "meaning": "Nước Nhật Bản"
        }
      ]
    }
  ]
}

Lưu ý quan trọng:
- KHÔNG cần ghi nghĩa, Hán-Việt hay âm On/Kun của chữ Kanji đơn lẻ (hệ thống sẽ tự tra cứu).
- Mỗi chữ Kanji kèm 2-4 từ ghép thông dụng, mỗi từ ghép có: word, reading (hiragana), hanViet (IN HOA) và meaning (tiếng Việt).`;

export const SAMPLE_QUICK_TEXT = `日 | 日本:にほん:NHẬT BẢN:Nước Nhật Bản ; 今日:きょう:KIM NHẬT:Hôm nay
学 | 学生:がくせい:HỌC SINH:Học sinh ; 大学:だいがく:ĐẠI HỌC:Trường đại học`;

function mergeParsedItems(list: ParsedLessonItemInput[]): ParsedLessonItemInput[] {
  const map = new Map<string, ParsedLessonItemInput>();

  for (const item of list) {
    const existing = map.get(item.kanji);
    if (!existing) {
      map.set(item.kanji, {
        ...item,
        compoundWords: [...item.compoundWords],
      });
    } else {
      const seenWords = new Set(existing.compoundWords.map((cw) => cw.word));
      for (const cw of item.compoundWords) {
        if (!seenWords.has(cw.word)) {
          seenWords.add(cw.word);
          existing.compoundWords.push(cw);
        }
      }
      if (!existing.hanViet && item.hanViet) existing.hanViet = item.hanViet;
      if ((!existing.meanings || existing.meanings.length === 0) && item.meanings?.length) {
        existing.meanings = item.meanings;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Phân tích cú pháp Text nhanh:
 * Kanji | TừGhép1:CáchĐọc:HánViệt:Nghĩa ; TừGhép2:CáchĐọc:HánViệt:Nghĩa
 * Hỗ trợ cả dạng rút gọn: TừGhép:Nghĩa hoặc TừGhép:CáchĐọc:Nghĩa
 */
export function parseQuickTextLesson(rawText: string): ParseBatchResult {
  const lines = rawText.split(/\r?\n/);
  const parsed: ParsedLessonItemInput[] = [];
  const errors: string[] = [];

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const lineNum = index + 1;
    const pipeIndex = line.indexOf('|');

    if (pipeIndex === -1) {
      // Dòng không có '|', trích xuất toàn bộ chữ Kanji trên dòng
      const extracted = extractUniqueKanji(line);
      if (extracted.length === 0) {
        errors.push(`Dòng ${lineNum}: Không tìm thấy chữ Kanji hợp lệ.`);
        return;
      }
      extracted.forEach((k) => {
        parsed.push({ kanji: k.kanji, compoundWords: [] });
      });
      return;
    }

    const leftPart = line.slice(0, pipeIndex).trim();
    const rightPart = line.slice(pipeIndex + 1).trim();

    const extractedKanji = extractUniqueKanji(leftPart);
    if (extractedKanji.length === 0) {
      errors.push(`Dòng ${lineNum}: Phần bên trái dấu "|" phải chứa chữ Kanji.`);
      return;
    }

    const targetKanji = extractedKanji[0].kanji;
    const compoundWords: ParsedCompoundWordInput[] = [];

    if (rightPart) {
      const segments = rightPart
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const seg of segments) {
        const parts = seg.split(':').map((p) => p.trim());
        const word = parts[0] || '';
        if (!word) continue;

        if (parts.length === 1) {
          errors.push(`Dòng ${lineNum}: Từ ghép "${word}" thiếu nghĩa (cần dấu ":").`);
          continue;
        } else if (parts.length === 2) {
          compoundWords.push({
            word,
            reading: '',
            hanViet: '',
            meaning: parts[1],
          });
        } else if (parts.length === 3) {
          compoundWords.push({
            word,
            reading: parts[1],
            hanViet: '',
            meaning: parts[2],
          });
        } else {
          compoundWords.push({
            word,
            reading: parts[1],
            hanViet: parts[2].toUpperCase(),
            meaning: parts.slice(3).join(':').trim(),
          });
        }
      }
    }

    parsed.push({
      kanji: targetKanji,
      compoundWords,
    });
  });

  return {
    items: mergeParsedItems(parsed),
    errors,
  };
}

/**
 * Phân tích JSON tối gian (hoặc JSON xuất đầy đủ của ứng dụng)
 * Tự động bóc tách markdown code fence ```json ... ```
 */
export function parseMinimalJsonLesson(rawJson: string): ParseBatchResult {
  const trimmed = rawJson.trim();
  if (!trimmed) return { items: [], errors: [] };

  let cleaned = trimmed;
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return {
      items: [],
      errors: ['Nội dung JSON không hợp lệ. Vui lòng kiểm tra lại dấu ngoặc và dấu phẩy.'],
    };
  }

  let rawItems: unknown[] = [];
  if (Array.isArray(data)) {
    rawItems = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
    rawItems = (data as any).items;
  } else if (data && typeof data === 'object' && typeof (data as any).kanji === 'string') {
    rawItems = [data];
  } else {
    return {
      items: [],
      errors: ['JSON phải là đối tượng có "items": [...], một mảng [...], hoặc { "kanji": "...", "compoundWords": [...] }.'],
    };
  }

  const parsed: ParsedLessonItemInput[] = [];
  const errors: string[] = [];

  rawItems.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Mục #${idx + 1}: Không phải đối tượng JSON hợp lệ.`);
      return;
    }

    const obj = entry as Record<string, unknown>;
    const rawKanji = typeof obj.kanji === 'string' ? obj.kanji.trim() : '';
    const extracted = extractUniqueKanji(rawKanji);
    if (extracted.length === 0) {
      errors.push(`Mục #${idx + 1}: Thiếu trường "kanji" hợp lệ.`);
      return;
    }

    const compoundWords: ParsedCompoundWordInput[] = [];
    if (Array.isArray(obj.compoundWords)) {
      obj.compoundWords.forEach((cw) => {
        if (!cw || typeof cw !== 'object') return;
        const cwObj = cw as Record<string, unknown>;
        const word = typeof cwObj.word === 'string' ? cwObj.word.trim() : '';
        const meaning = typeof cwObj.meaning === 'string' ? cwObj.meaning.trim() : '';
        if (!word || !meaning) return;

        compoundWords.push({
          word,
          reading: typeof cwObj.reading === 'string' ? cwObj.reading.trim() : '',
          hanViet:
            typeof cwObj.hanViet === 'string'
              ? cwObj.hanViet.trim().toUpperCase()
              : '',
          meaning,
        });
      });
    }

    parsed.push({
      kanji: extracted[0].kanji,
      hanViet:
        typeof obj.hanViet === 'string' && obj.hanViet.trim()
          ? obj.hanViet.trim().toUpperCase()
          : undefined,
      meanings: Array.isArray(obj.meanings)
        ? obj.meanings.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
        : undefined,
      compoundWords,
    });
  });

  return {
    items: mergeParsedItems(parsed),
    errors,
  };
}

export interface ParseCompoundWordsResult {
  words: ParsedCompoundWordInput[];
  errors: string[];
}

export const SAMPLE_COMPOUND_WORDS_TEXT = `日本:にほん:NHẬT BẢN:Nước Nhật Bản
今日:きょう:KIM NHẬT:Hôm nay ; 毎日:まいにち:MỖI NHẬT:Mỗi ngày`;

export const SAMPLE_COMPOUND_WORDS_JSON = {
  compoundWords: [
    {
      word: '日本',
      reading: 'にほん',
      hanViet: 'NHẬT BẢN',
      meaning: 'Nước Nhật Bản',
    },
    {
      word: '今日',
      reading: 'きょう',
      hanViet: 'KIM NHẬT',
      meaning: 'Hôm nay',
    },
  ],
};

export function buildCompoundWordsAiPrompt(kanji: string): string {
  return `Hãy tạo danh sách 4-6 từ ghép thông dụng có chứa chữ Kanji "${kanji}".

Chỉ trả về JSON thuần (không giải thích thêm) theo đúng cấu trúc sau:
{
  "compoundWords": [
    {
      "word": "từ ghép tiếng Nhật",
      "reading": "cách đọc hiragana",
      "hanViet": "ÂM HÁN VIỆT IN HOA",
      "meaning": "nghĩa tiếng Việt"
    }
  ]
}`;
}

/**
 * Phân tích cú pháp Text nhanh cho danh sách từ ghép của 1 chữ Kanji:
 * Mỗi dòng hoặc phân cách bằng ";" có dạng:
 * TừGhép:CáchĐọc:HánViệt:Nghĩa (hoặc rút gọn TừGhép:Nghĩa, TừGhép:CáchĐọc:Nghĩa)
 */
export function parseCompoundWordsText(rawText: string): ParseCompoundWordsResult {
  const lines = rawText.split(/\r?\n/);
  const words: ParsedCompoundWordInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  lines.forEach((rawLine, index) => {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const lineNum = index + 1;
    const pipeIndex = line.indexOf('|');
    if (pipeIndex !== -1) {
      line = line.slice(pipeIndex + 1).trim();
    }
    if (!line) return;

    const segments = line
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const seg of segments) {
      const parts = seg.split(':').map((p) => p.trim());
      const word = parts[0] || '';
      if (!word) continue;

      if (parts.length === 1) {
        errors.push(`Dòng ${lineNum}: Từ ghép "${word}" thiếu nghĩa (cần dấu ":").`);
        continue;
      }

      if (seen.has(word)) continue;
      seen.add(word);

      if (parts.length === 2) {
        words.push({
          word,
          reading: '',
          hanViet: '',
          meaning: parts[1],
        });
      } else if (parts.length === 3) {
        words.push({
          word,
          reading: parts[1],
          hanViet: '',
          meaning: parts[2],
        });
      } else {
        words.push({
          word,
          reading: parts[1],
          hanViet: parts[2].toUpperCase(),
          meaning: parts.slice(3).join(':').trim(),
        });
      }
    }
  });

  return { words, errors };
}

/**
 * Phân tích JSON cho danh sách từ ghép của 1 chữ Kanji.
 * Hỗ trợ: { "compoundWords": [...] }, mảng [...], hoặc { "items": [{ "compoundWords": [...] }] }
 */
export function parseCompoundWordsJson(rawJson: string): ParseCompoundWordsResult {
  const trimmed = rawJson.trim();
  if (!trimmed) return { words: [], errors: [] };

  let cleaned = trimmed;
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return {
      words: [],
      errors: ['Nội dung JSON không hợp lệ. Vui lòng kiểm tra lại dấu ngoặc và dấu phẩy.'],
    };
  }

  let rawList: unknown[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as any).compoundWords)) {
    rawList = (data as any).compoundWords;
  } else if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
    rawList = (data as any).items.flatMap((it: any) =>
      Array.isArray(it?.compoundWords) ? it.compoundWords : []
    );
  } else {
    return {
      words: [],
      errors: ['JSON phải là mảng [...] hoặc đối tượng có trường "compoundWords": [...].'],
    };
  }

  const words: ParsedCompoundWordInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rawList.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Mục #${idx + 1}: Không phải đối tượng JSON hợp lệ.`);
      return;
    }
    const obj = entry as Record<string, unknown>;
    const word = typeof obj.word === 'string' ? obj.word.trim() : '';
    const meaning = typeof obj.meaning === 'string' ? obj.meaning.trim() : '';
    if (!word || !meaning) {
      errors.push(`Mục #${idx + 1}: Thiếu trường "word" hoặc "meaning".`);
      return;
    }
    if (seen.has(word)) return;
    seen.add(word);

    words.push({
      word,
      reading: typeof obj.reading === 'string' ? obj.reading.trim() : '',
      hanViet:
        typeof obj.hanViet === 'string' ? obj.hanViet.trim().toUpperCase() : '',
      meaning,
    });
  });

  return { words, errors };
}
